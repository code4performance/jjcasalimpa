import { supabase, imageUrl, IMAGE_BUCKET, isConfigured } from './supabase.js';
import { formatBRL, centsToInput } from './lib/money.js';
import { promoStatus, PROMO_STATUS_LABELS, isPromoActive } from './lib/pricing.js';
import { normalize, categoriesOf } from './lib/text.js';
import { validateProduct, validatePromo, validateSettings, formatPhone, normalizePhone, LIMITS } from './lib/validation.js';
import { isAllowedImage, resizeImage } from './lib/image.js';
import { parseBRL } from './lib/money.js';
import { $, $$, esc, icons, toast, openDialog, confirmDialog, showErrors, setFieldError } from './ui.js';

const PLACEHOLDER = 'assets/placeholder.svg';
const VIEWS = ['loading', 'login', 'forgot', 'reset', 'denied', 'panel'];

let products = [];
let recovering = false;
let panelLoaded = false;

// ---------- Navegação entre telas ----------

function showView(name) {
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== name;
  $('#logout').hidden = !['panel', 'denied'].includes(name);
  const focusTarget = $(`#view-${name} input, #view-${name} h1`);
  if (name !== 'panel' && name !== 'loading') focusTarget?.focus();
}

async function handleSession(session) {
  if (recovering) return showView('reset');
  if (!session) {
    panelLoaded = false;
    return showView('login');
  }
  showView('loading');
  const { data: admin, error } = await supabase.rpc('is_admin');
  if (error) {
    console.error('[admin] is_admin', error);
    toast('Não foi possível verificar sua permissão. Tente novamente.', 'error');
    return showView('login');
  }
  if (!admin) return showView('denied');
  showView('panel');
  if (!panelLoaded) {
    panelLoaded = true;
    loadProducts();
    loadSettings();
  }
}

if (!isConfigured) {
  showView('login');
  $('#login-error').textContent = 'Site ainda não configurado: preencha o arquivo js/config.js (veja o README).';
} else {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') recovering = true;
    // Não chamar o Supabase dentro do callback (recomendação da biblioteca).
    setTimeout(() => handleSession(session), 0);
  });
}

// ---------- Login, recuperação e saída ----------

$('#login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const email = form.email.value.trim();
  const password = form.password.value;
  const errorEl = $('#login-error');
  if (!email || !password) {
    errorEl.textContent = 'Informe e-mail e senha.';
    return;
  }
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  errorEl.textContent = '';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  if (error) {
    errorEl.textContent = error.status === 400 || /invalid/i.test(error.message)
      ? 'E-mail ou senha inválidos'
      : 'Não foi possível entrar. Verifique sua conexão e tente novamente.';
    form.password.value = '';
    form.password.focus();
  } else {
    form.reset();
  }
});

$('#go-forgot').addEventListener('click', () => {
  $('#forgot-email').value = $('#login-email').value;
  $('#forgot-sent').hidden = true;
  showView('forgot');
});
$$('[data-go-login]').forEach((b) => b.addEventListener('click', () => showView('login')));

$('#forgot').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.currentTarget.email.value.trim();
  const errorEl = $('#forgot-error');
  if (!email) {
    errorEl.textContent = 'Informe seu e-mail.';
    return;
  }
  errorEl.textContent = '';
  const btn = e.currentTarget.querySelector('[type=submit]');
  btn.disabled = true;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  btn.disabled = false;
  if (error && error.status !== 400) {
    errorEl.textContent = 'Não foi possível enviar agora. Tente novamente em alguns minutos.';
    return;
  }
  $('#forgot-sent').hidden = false;
});

$('#reset').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const errorEl = $('#reset-error');
  if (form.password.value.length < 8) {
    errorEl.textContent = 'A senha precisa ter pelo menos 8 caracteres.';
    return;
  }
  if (form.password.value !== form.confirm.value) {
    errorEl.textContent = 'As senhas não conferem.';
    return;
  }
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  const { error } = await supabase.auth.updateUser({ password: form.password.value });
  btn.disabled = false;
  if (error) {
    errorEl.textContent = 'Não foi possível salvar a nova senha. Abra o link do e-mail novamente.';
    return;
  }
  form.reset();
  errorEl.textContent = '';
  recovering = false;
  history.replaceState(null, '', window.location.pathname);
  toast('Senha alterada com sucesso!', 'success');
  const { data } = await supabase.auth.getSession();
  handleSession(data.session);
});

async function logout() {
  await supabase.auth.signOut();
  recovering = false;
  products = [];
  showView('login');
}
$('#logout').addEventListener('click', logout);
$$('[data-logout]').forEach((b) => b.addEventListener('click', logout));

// ---------- Abas ----------

const tabs = $$('[role=tab]');
function selectTab(tab) {
  for (const t of tabs) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    $(`#${t.getAttribute('aria-controls')}`).hidden = !selected;
  }
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

// ---------- Lista de produtos ----------

async function loadProducts() {
  const state = $('#admin-state');
  state.hidden = false;
  state.innerHTML = '<div class="spinner"></div><span>Carregando produtos…</span>';
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });
  if (error) {
    console.error('[admin] produtos', error);
    state.innerHTML = '<strong>Não foi possível carregar os produtos</strong><button class="btn btn-primary" type="button">Tentar novamente</button>';
    state.querySelector('button').addEventListener('click', loadProducts);
    return;
  }
  products = data ?? [];
  renderProducts();
}

function priceCell(p) {
  if (isPromoActive(p)) {
    return `<div class="price"><span class="price-old">${formatBRL(p.price_cents)}</span><span class="price-now is-promo">${formatBRL(p.promo_price_cents)}</span></div>`;
  }
  return `<div class="price"><span class="price-now">${formatBRL(p.price_cents)}</span></div>`;
}

function statusBadge(status) {
  return `<span class="status status-${status}">${PROMO_STATUS_LABELS[status]}</span>`;
}

function renderProducts() {
  const q = normalize($('#admin-search').value);
  const list = products.filter((p) => !q || normalize(p.title).includes(q));
  const state = $('#admin-state');
  const active = products.filter((p) => p.active).length;

  $('#admin-count').textContent = products.length
    ? `${products.length} ${products.length === 1 ? 'produto' : 'produtos'} (${active} ${active === 1 ? 'ativo' : 'ativos'})`
    : '';

  $('#product-rows').innerHTML = list
    .map((p) => {
      const img = p.images?.length ? imageUrl(p.images[0]) : PLACEHOLDER;
      return `<tr class="${p.active ? '' : 'is-inactive'}" data-id="${esc(p.id)}">
        <td class="col-img"><img src="${esc(img)}" alt="" loading="lazy"></td>
        <td class="col-title">${esc(p.title)}${p.category ? `<small>${esc(p.category)}</small>` : ''}</td>
        <td class="col-category">${esc(p.category || '—')}</td>
        <td class="col-price">${priceCell(p)}</td>
        <td class="col-status">${statusBadge(promoStatus(p))}</td>
        <td class="col-active">
          <label class="switch"><input type="checkbox" data-toggle="${esc(p.id)}" ${p.active ? 'checked' : ''}
            aria-label="Produto ${esc(p.title)} visível no site"> <span>${p.active ? 'Ativo' : 'Inativo'}</span></label>
        </td>
        <td class="col-actions">
          <button class="btn btn-icon" type="button" data-edit="${esc(p.id)}" aria-label="Editar ${esc(p.title)}">${icons.edit}</button>
          <button class="btn btn-icon" type="button" data-delete="${esc(p.id)}" aria-label="Excluir ${esc(p.title)}" style="color: var(--c-danger)">${icons.trash}</button>
        </td>
      </tr>`;
    })
    .join('');

  if (!products.length) {
    state.hidden = false;
    state.innerHTML = '<img src="assets/logo-mark.svg" alt=""><strong>Nenhum produto cadastrado</strong><span>Clique em "Novo produto" para começar.</span>';
  } else if (!list.length) {
    state.hidden = false;
    state.innerHTML = '<strong>Nenhum produto encontrado</strong>';
  } else {
    state.hidden = true;
  }
}

$('#admin-search').addEventListener('input', renderProducts);

$('#product-rows').addEventListener('click', (e) => {
  const edit = e.target.closest('[data-edit]');
  if (edit) return openEditor(products.find((p) => p.id === edit.dataset.edit));
  const del = e.target.closest('[data-delete]');
  if (del) deleteProduct(products.find((p) => p.id === del.dataset.delete));
});

$('#product-rows').addEventListener('change', async (e) => {
  const toggle = e.target.closest('[data-toggle]');
  if (!toggle) return;
  const p = products.find((x) => x.id === toggle.dataset.toggle);
  const active = toggle.checked;
  toggle.disabled = true;
  const { data, error } = await supabase.from('products').update({ active }).eq('id', p.id).select();
  toggle.disabled = false;
  if (error || !data?.length) {
    console.error('[admin] ativar/desativar', error);
    toggle.checked = !active;
    toast('Não foi possível alterar. Tente novamente.', 'error');
    return;
  }
  Object.assign(p, data[0]);
  renderProducts();
  toast(active ? `${p.title} está visível no site` : `${p.title} foi ocultado do site`, 'success');
});

async function removeFiles(paths) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
  if (error) console.error('[admin] remover fotos', error);
}

async function deleteProduct(p) {
  if (!p) return false;
  const ok = await confirmDialog({
    title: 'Excluir produto?',
    message: `"${p.title}" e as fotos dele serão apagados definitivamente.`,
    confirmText: 'Excluir',
    danger: true,
  });
  if (!ok) return false;
  const { data, error } = await supabase.from('products').delete().eq('id', p.id).select('id');
  if (error || !data?.length) {
    console.error('[admin] excluir', error);
    toast('Não foi possível excluir. Tente novamente.', 'error');
    return false;
  }
  await removeFiles(p.images ?? []);
  products = products.filter((x) => x.id !== p.id);
  renderProducts();
  toast('Produto excluído', 'success');
  return true;
}

// ---------- Formulário de produto ----------

const dialog = $('#product-dialog');
const form = $('#product');
const FIELDS = ['title', 'description', 'category', 'price', 'sort_order', 'promo_price', 'promo_start', 'promo_end'];

/** Estado do produto sendo editado. */
let editor = null;

function openEditor(product = null) {
  editor = {
    id: product?.id ?? crypto.randomUUID(),
    product,
    photos: (product?.images ?? []).map((path) => ({ key: path, path, url: imageUrl(path), status: 'done' })),
    uploadedNow: new Set(), // enviadas nesta edição (apagar se cancelar)
    removed: new Set(), // já salvas e removidas (apagar ao salvar)
    saved: false,
  };

  form.reset();
  for (const name of FIELDS) setFieldError(form, name, '');
  $('#product-dialog-title').textContent = product ? 'Editar produto' : 'Novo produto';
  $('#delete-product').hidden = !product;

  const f = form.elements;
  f.title.value = product?.title ?? '';
  f.description.value = product?.description ?? '';
  f.category.value = product?.category ?? '';
  f.price.value = product ? centsToInput(product.price_cents) : '';
  f.sort_order.value = product?.sort_order ?? 0;
  f.active.checked = product ? product.active : true;
  f.promo_price.value = product?.promo_price_cents ? centsToInput(product.promo_price_cents) : '';
  f.promo_start.value = product?.promo_start ?? '';
  f.promo_end.value = product?.promo_end ?? '';

  $('#category-options').innerHTML = categoriesOf(products).map((c) => `<option value="${esc(c)}">`).join('');

  renderPhotos();
  updatePromoStatus();
  openDialog(dialog);
  dialog.querySelector('.sheet-body').scrollTop = 0;
  f.title.focus();
}

$('#new-product').addEventListener('click', () => openEditor());

dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));

dialog.addEventListener('close', () => {
  // Cancelou: apaga as fotos enviadas nesta edição que não foram salvas.
  if (editor && !editor.saved) {
    for (const ph of editor.photos) if (ph.url?.startsWith('blob:')) URL.revokeObjectURL(ph.url);
    removeFiles([...editor.uploadedNow]);
  }
  editor = null;
});

function updatePromoStatus() {
  const f = form.elements;
  const price = parseBRL(f.price.value);
  const { value } = validatePromo(
    { promo_price: f.promo_price.value, promo_start: f.promo_start.value, promo_end: f.promo_end.value },
    price,
  );
  const status = price ? promoStatus({ price_cents: price, ...value }) : 'none';
  const badge = $('#promo-status');
  badge.className = `status status-${status}`;
  badge.textContent = PROMO_STATUS_LABELS[status];
}

form.addEventListener('input', (e) => {
  if (e.target.name) setFieldError(form, e.target.name, '');
  if (['price', 'promo_price', 'promo_start', 'promo_end'].includes(e.target.name)) updatePromoStatus();
});

$('#remove-promo').addEventListener('click', () => {
  const f = form.elements;
  f.promo_price.value = '';
  f.promo_start.value = '';
  f.promo_end.value = '';
  for (const n of ['promo_price', 'promo_start', 'promo_end']) setFieldError(form, n, '');
  updatePromoStatus();
  toast('Promoção removida. Clique em Salvar para confirmar.');
});

$('#delete-product').addEventListener('click', async () => {
  if (!editor?.product) return;
  const deleted = await deleteProduct(editor.product);
  if (deleted) {
    editor.saved = true; // nada a limpar além do que deleteProduct já apagou
    removeFiles([...editor.uploadedNow]);
    dialog.close();
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editor) return;
  const f = form.elements;
  const input = Object.fromEntries(FIELDS.map((k) => [k, f[k].value]));
  input.active = f.active.checked;
  const { errors, value } = validateProduct(input);
  if (!showErrors(form, FIELDS, errors)) return;

  if (editor.photos.some((p) => p.status === 'uploading')) {
    toast('Aguarde o envio das fotos terminar.', 'error');
    return;
  }
  if (editor.photos.some((p) => p.status === 'error')) {
    toast('Há fotos com erro de envio. Tente novamente ou remova-as.', 'error');
    return;
  }

  const row = { ...value, images: editor.photos.map((p) => p.path) };
  const btn = $('#save-product');
  btn.disabled = true;
  const query = editor.product
    ? supabase.from('products').update(row).eq('id', editor.id).select()
    : supabase.from('products').insert({ id: editor.id, ...row }).select();
  const { data, error } = await query;
  btn.disabled = false;

  if (error || !data?.length) {
    console.error('[admin] salvar produto', error);
    toast('Não foi possível salvar. Verifique sua conexão e tente novamente.', 'error');
    return;
  }

  editor.saved = true;
  await removeFiles([...editor.removed]);
  const saved = data[0];
  const i = products.findIndex((p) => p.id === saved.id);
  if (i >= 0) products[i] = saved;
  else products.push(saved);
  products.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'pt-BR'));
  renderProducts();
  dialog.close();
  toast('Produto salvo', 'success');
});

// ---------- Fotos ----------

function renderPhotos() {
  const photos = editor.photos;
  const full = photos.length >= LIMITS.images;
  $('#photo-count').textContent = `(${photos.length} de ${LIMITS.images})`;

  const tiles = photos.map((ph, i) => {
    const status =
      ph.status === 'uploading'
        ? '<div class="photo-status"><div class="spinner"></div>Enviando…</div>'
        : ph.status === 'error'
          ? `<div class="photo-status is-error">Falha no envio
               <button class="btn btn-sm btn-primary" type="button" data-retry="${i}">Tentar novamente</button>
               <button class="btn btn-sm btn-outline" type="button" data-remove-photo="${i}">Remover</button></div>`
          : '';
    const actions =
      ph.status === 'done'
        ? `<div class="photo-actions">
             <button type="button" data-move="${i}" data-dir="-1" aria-label="Mover foto ${i + 1} para a esquerda" ${i === 0 ? 'disabled style="visibility:hidden"' : ''}>${icons.left}</button>
             ${i === 0 ? '' : `<button type="button" data-main="${i}" aria-label="Tornar foto ${i + 1} a principal">${icons.star}</button>`}
             <button type="button" data-remove-photo="${i}" aria-label="Remover foto ${i + 1}">${icons.trash}</button>
             <button type="button" data-move="${i}" data-dir="1" aria-label="Mover foto ${i + 1} para a direita" ${i === photos.length - 1 ? 'disabled style="visibility:hidden"' : ''}>${icons.right}</button>
           </div>`
        : '';
    return `<div class="photo${i === 0 ? ' is-main' : ''}">
      <img src="${esc(ph.url)}" alt="Foto ${i + 1}">
      ${i === 0 && ph.status === 'done' ? '<span class="photo-tag">★ Principal</span>' : ''}
      ${actions}${status}
    </div>`;
  });

  tiles.push(`<label class="photo-add${full ? ' is-disabled' : ''}" title="${full ? 'Limite de 5 fotos atingido' : 'Adicionar fotos'}">
      ${icons.camera}
      <span>${full ? 'Limite de 5 fotos' : 'Adicionar foto'}</span>
      <input type="file" id="photo-input" accept="image/jpeg,image/png,image/webp" multiple ${full ? 'disabled' : ''}>
    </label>`);

  $('#photos').innerHTML = tiles.join('');
}

$('#photos').addEventListener('change', (e) => {
  if (e.target.id !== 'photo-input' || !editor) return;
  const files = [...e.target.files];
  e.target.value = '';
  const room = LIMITS.images - editor.photos.length;
  if (files.length > room) toast(`Só é possível ter ${LIMITS.images} fotos. ${files.length - room} não foram adicionadas.`, 'error');
  for (const file of files.slice(0, Math.max(0, room))) {
    if (!isAllowedImage(file)) {
      toast('Envie apenas imagens (JPG, PNG ou WebP)', 'error');
      continue;
    }
    const photo = { key: crypto.randomUUID(), file, url: URL.createObjectURL(file), status: 'uploading' };
    editor.photos.push(photo);
    upload(photo);
  }
  renderPhotos();
});

async function upload(photo) {
  const current = editor;
  photo.status = 'uploading';
  renderPhotos();
  try {
    if (!photo.resized) photo.resized = await resizeImage(photo.file);
    const { blob, ext, contentType } = photo.resized;
    const path = `${current.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType, cacheControl: '31536000' });
    if (error) throw error;
    if (editor !== current) {
      // O formulário foi fechado durante o envio: descarta.
      removeFiles([path]);
      return;
    }
    current.uploadedNow.add(path);
    photo.path = path;
    photo.status = 'done';
    // Troca a prévia local pela foto já reduzida e publicada.
    URL.revokeObjectURL(photo.url);
    photo.url = imageUrl(path);
  } catch (err) {
    console.error('[admin] envio de foto', err);
    if (editor !== current) return;
    photo.status = 'error';
    toast('Não foi possível enviar a foto. Tente novamente.', 'error');
  }
  renderPhotos();
}

$('#photos').addEventListener('click', (e) => {
  if (!editor) return;
  const photos = editor.photos;
  const btn = e.target.closest('button');
  if (!btn) return;

  if (btn.dataset.retry != null) {
    upload(photos[Number(btn.dataset.retry)]);
  } else if (btn.dataset.removePhoto != null) {
    const [ph] = photos.splice(Number(btn.dataset.removePhoto), 1);
    if (ph.path) {
      if (editor.uploadedNow.has(ph.path)) {
        editor.uploadedNow.delete(ph.path);
        removeFiles([ph.path]);
      } else {
        editor.removed.add(ph.path);
      }
    }
    if (ph.url?.startsWith('blob:')) URL.revokeObjectURL(ph.url);
    renderPhotos();
  } else if (btn.dataset.main != null) {
    const [ph] = photos.splice(Number(btn.dataset.main), 1);
    photos.unshift(ph);
    renderPhotos();
    $('#photos [data-remove-photo="0"]')?.focus();
  } else if (btn.dataset.move != null) {
    const i = Number(btn.dataset.move);
    const j = i + Number(btn.dataset.dir);
    if (j < 0 || j >= photos.length) return;
    [photos[i], photos[j]] = [photos[j], photos[i]];
    renderPhotos();
    $(`#photos [data-move="${j}"][data-dir="${btn.dataset.dir}"]`)?.focus();
  }
});

// ---------- Configurações ----------

const settingsForm = $('#settings');

async function loadSettings() {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  if (error) {
    console.error('[admin] configurações', error);
    toast('Não foi possível carregar as configurações.', 'error');
    return;
  }
  const f = settingsForm.elements;
  f.whatsapp_number.value = data?.whatsapp_number ? formatPhone(data.whatsapp_number) : '';
  f.welcome_message.value = data?.welcome_message ?? '';
  f.contact_info.value = data?.contact_info ?? '';
  f.business_hours.value = data?.business_hours ?? '';
}

settingsForm.elements.whatsapp_number.addEventListener('blur', (e) => {
  const n = normalizePhone(e.target.value);
  if (n) e.target.value = formatPhone(n);
});
settingsForm.addEventListener('input', (e) => {
  if (e.target.name) setFieldError(settingsForm, e.target.name, '');
});

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = settingsForm.elements;
  const { errors, value } = validateSettings({
    whatsapp_number: f.whatsapp_number.value,
    welcome_message: f.welcome_message.value,
    contact_info: f.contact_info.value,
    business_hours: f.business_hours.value,
  });
  if (!showErrors(settingsForm, ['whatsapp_number'], errors)) return;

  const btn = settingsForm.querySelector('[type=submit]');
  btn.disabled = true;
  const { data, error } = await supabase.from('settings').update(value).eq('id', 1).select();
  btn.disabled = false;
  if (error || !data?.length) {
    console.error('[admin] salvar configurações', error);
    toast('Não foi possível salvar as configurações.', 'error');
    return;
  }
  if (value.whatsapp_number) f.whatsapp_number.value = formatPhone(value.whatsapp_number);
  toast('Configurações salvas', 'success');
});
