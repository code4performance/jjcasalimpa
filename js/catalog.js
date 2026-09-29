import { supabase, imageUrl, isConfigured } from './supabase.js';
import { formatBRL } from './lib/money.js';
import { currentPrice, isPromoActive, discountPercent } from './lib/pricing.js';
import { matchesSearch, categoriesOf, sameCategory } from './lib/text.js';
import { buildContactUrl } from './lib/whatsapp.js';
import { $, esc, toast, openDialog, closeOnBackdrop } from './ui.js';
import { initCart, addToCart } from './cart.js';

const PLACEHOLDER = 'assets/placeholder.svg';

const state = {
  products: [],
  query: '',
  category: '',
};

const els = {
  grid: $('#product-grid'),
  promoSection: $('#promo-section'),
  promoGrid: $('#promo-grid'),
  state: $('#state'),
  search: $('#search'),
  categories: $('#categories'),
  productDialog: $('#product-dialog'),
  productBody: $('#product-dialog-body'),
};

// ---------- Carregamento ----------

async function load() {
  els.grid.setAttribute('aria-busy', 'true');
  els.grid.innerHTML = '<div class="skeleton"></div>'.repeat(4);
  els.state.hidden = true;

  try {
    if (!isConfigured) throw new Error('Supabase não configurado: preencha js/config.js');
    const [productsRes, settingsRes] = await Promise.all([
      supabase
        .from('products')
        .select('id,title,description,category,price_cents,promo_price_cents,promo_start,promo_end,images,sort_order')
        .eq('active', true) // explícito: um admin logado neste navegador também enxerga os inativos
        .order('sort_order', { ascending: true })
        .order('title', { ascending: true }),
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    ]);
    if (productsRes.error) throw productsRes.error;
    if (settingsRes.error) throw settingsRes.error;

    state.products = productsRes.data ?? [];
    applySettings(settingsRes.data ?? {});
    initCart({ products: state.products, settings: settingsRes.data ?? {} });
    renderCategories();
    render();
  } catch (err) {
    console.error('[catálogo] falha ao carregar', err);
    initCart({ products: null, settings: {} });
    els.grid.innerHTML = '';
    els.promoSection.hidden = true;
    showState({
      title: 'Não foi possível carregar os produtos',
      text: 'Verifique sua conexão e tente novamente.',
      action: 'Tentar novamente',
      onAction: load,
    });
  } finally {
    els.grid.setAttribute('aria-busy', 'false');
  }
}

function applySettings(settings) {
  if (settings.welcome_message) $('#welcome').textContent = settings.welcome_message;

  $('#contact-info').textContent = settings.contact_info || '';
  $('#footer-contact').hidden = !settings.contact_info;
  $('#business-hours').textContent = settings.business_hours || '';
  $('#footer-hours').hidden = !settings.business_hours;

  const fab = $('#fab-whatsapp');
  if (settings.whatsapp_number) {
    fab.href = buildContactUrl(settings.whatsapp_number);
    fab.hidden = false;
  } else {
    fab.hidden = true;
  }
}

// ---------- Renderização ----------

function mainImage(product) {
  return product.images?.length ? imageUrl(product.images[0]) : PLACEHOLDER;
}

function priceHtml(p) {
  if (isPromoActive(p)) {
    return `<div class="price">
      <span class="price-old">de ${formatBRL(p.price_cents)}</span>
      <span class="price-now is-promo"><span class="price-label">por </span>${formatBRL(p.promo_price_cents)}</span>
    </div>`;
  }
  return `<div class="price"><span class="price-now">${formatBRL(p.price_cents)}</span></div>`;
}

function cardHtml(p) {
  const discount = discountPercent(p);
  return `<article class="card">
    <button class="card-open" type="button" data-open="${esc(p.id)}" aria-label="Ver detalhes de ${esc(p.title)}">
      <span class="card-media">
        <img src="${esc(mainImage(p))}" alt="" loading="lazy" decoding="async" width="400" height="400">
        ${discount ? `<span class="badge-discount">-${discount}%</span>` : ''}
      </span>
      <span class="card-body">
        ${p.category ? `<span class="card-category">${esc(p.category)}</span>` : ''}
        <span class="card-title">${esc(p.title)}</span>
        ${p.description ? `<span class="card-desc">${esc(p.description)}</span>` : ''}
        ${priceHtml(p)}
      </span>
    </button>
    <div class="card-actions">
      <button class="btn btn-accent btn-block" type="button" data-add="${esc(p.id)}">Adicionar</button>
    </div>
  </article>`;
}

function filteredProducts() {
  return state.products.filter(
    (p) => (!state.category || sameCategory(p.category, state.category)) && matchesSearch(p, state.query),
  );
}

function render() {
  const filtering = Boolean(state.query.trim() || state.category);

  const promos = state.products.filter((p) => isPromoActive(p));
  els.promoSection.hidden = filtering || promos.length === 0;
  els.promoGrid.innerHTML = filtering ? '' : promos.map(cardHtml).join('');

  const list = filteredProducts();
  els.grid.innerHTML = list.map(cardHtml).join('');

  if (state.products.length === 0) {
    showState({ title: 'Nenhum produto disponível', text: 'Volte em breve para conferir as novidades.' });
  } else if (list.length === 0) {
    showState({
      title: 'Nenhum produto encontrado',
      text: 'Tente outra palavra ou categoria.',
      action: 'Limpar filtros',
      onAction: clearFilters,
    });
  } else {
    els.state.hidden = true;
  }
}

function showState({ title, text = '', action, onAction }) {
  els.state.innerHTML = `
    <img src="assets/logo-mark.svg" alt="">
    <strong>${esc(title)}</strong>
    ${text ? `<span>${esc(text)}</span>` : ''}
    ${action ? `<button class="btn btn-primary" type="button">${esc(action)}</button>` : ''}`;
  els.state.hidden = false;
  if (action) els.state.querySelector('button').addEventListener('click', onAction);
}

function renderCategories() {
  const cats = categoriesOf(state.products);
  els.categories.hidden = cats.length === 0;
  els.categories.innerHTML = ['', ...cats]
    .map(
      (c) => `<button class="chip" type="button" data-category="${esc(c)}" aria-pressed="${sameCategory(c, state.category)}">${
        c ? esc(c) : 'Todos'
      }</button>`,
    )
    .join('');
}

function setCategory(category) {
  state.category = category;
  for (const chip of els.categories.querySelectorAll('.chip')) {
    chip.setAttribute('aria-pressed', String(sameCategory(chip.dataset.category, category)));
  }
  render();
}

function clearFilters() {
  state.query = '';
  els.search.value = '';
  setCategory('');
}

// ---------- Detalhes do produto ----------

function openProduct(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const images = p.images?.length ? p.images.map(imageUrl) : [PLACEHOLDER];
  const discount = discountPercent(p);

  $('#product-dialog-title').textContent = p.category || 'Detalhes do produto';
  els.productBody.innerHTML = `
    <div class="detail">
      <div class="gallery">
        <div class="gallery-main card-media" tabindex="0" aria-label="Fotos do produto (deslize para ver mais)">
          ${images.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.title)}${images.length > 1 ? ` — foto ${i + 1}` : ''}" decoding="async">`).join('')}
        </div>
        ${
          images.length > 1
            ? `<div class="gallery-thumbs">${images
                .map(
                  (src, i) => `<button type="button" data-thumb="${i}" aria-label="Ver foto ${i + 1}" aria-current="${i === 0}">
                    <img src="${esc(src)}" alt="" loading="lazy"></button>`,
                )
                .join('')}</div>`
            : ''
        }
      </div>
      <div class="detail-info">
        <h3>${esc(p.title)}</h3>
        ${discount ? `<span><span class="badge-discount" style="position:static">-${discount}%</span></span>` : ''}
        ${priceHtml(p)}
        ${p.description ? `<p class="detail-desc">${esc(p.description)}</p>` : ''}
        <div class="detail-buy">
          <div class="qty">
            <button type="button" data-step="-1" aria-label="Diminuir quantidade">−</button>
            <input type="number" inputmode="numeric" min="1" max="99" value="1" aria-label="Quantidade" id="detail-qty">
            <button type="button" data-step="1" aria-label="Aumentar quantidade">+</button>
          </div>
          <button class="btn btn-accent btn-lg" type="button" id="detail-add">Adicionar · ${formatBRL(currentPrice(p))}</button>
        </div>
      </div>
    </div>`;

  const main = els.productBody.querySelector('.gallery-main');
  const thumbs = [...els.productBody.querySelectorAll('[data-thumb]')];
  const qtyInput = $('#detail-qty');
  const addBtn = $('#detail-add');

  const qty = () => Math.min(99, Math.max(1, parseInt(qtyInput.value, 10) || 1));
  const updateAddLabel = () => { addBtn.textContent = `Adicionar · ${formatBRL(currentPrice(p) * qty())}`; };

  thumbs.forEach((t) =>
    t.addEventListener('click', () => {
      main.scrollTo({ left: main.clientWidth * Number(t.dataset.thumb), behavior: 'smooth' });
    }),
  );
  main.addEventListener('scroll', () => {
    const i = Math.round(main.scrollLeft / main.clientWidth);
    thumbs.forEach((t, j) => t.setAttribute('aria-current', String(i === j)));
  }, { passive: true });

  els.productBody.querySelectorAll('[data-step]').forEach((b) =>
    b.addEventListener('click', () => {
      qtyInput.value = Math.min(99, Math.max(1, qty() + Number(b.dataset.step)));
      updateAddLabel();
    }),
  );
  qtyInput.addEventListener('input', updateAddLabel);
  qtyInput.addEventListener('change', () => { qtyInput.value = qty(); updateAddLabel(); });

  addBtn.addEventListener('click', () => {
    addToCart(p.id, qty());
    els.productDialog.close();
    toast(`${p.title} adicionado ao carrinho`, 'success');
  });

  els.productBody.scrollTop = 0;
  openDialog(els.productDialog);
}

// ---------- Eventos ----------

function onGridClick(e) {
  const add = e.target.closest('[data-add]');
  if (add) {
    const p = state.products.find((x) => x.id === add.dataset.add);
    addToCart(add.dataset.add, 1);
    if (p) toast(`${p.title} adicionado ao carrinho`, 'success');
    return;
  }
  const open = e.target.closest('[data-open]');
  if (open) openProduct(open.dataset.open);
}

els.grid.addEventListener('click', onGridClick);
els.promoGrid.addEventListener('click', onGridClick);

let searchTimer;
els.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = els.search.value;
    render();
  }, 150);
});

els.categories.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-category]');
  if (chip) setCategory(chip.dataset.category);
});

$('#brand-link').addEventListener('click', (e) => {
  e.preventDefault();
  clearFilters();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

closeOnBackdrop(els.productDialog);
els.productDialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => els.productDialog.close()));

load();
