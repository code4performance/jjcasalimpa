import { imageUrl } from './supabase.js';
import { formatBRL } from './lib/money.js';
import { currentPrice, isPromoActive } from './lib/pricing.js';
import { validateCustomer } from './lib/validation.js';
import { buildOrderUrl } from './lib/whatsapp.js';
import { $, esc, toast, openDialog, closeOnBackdrop, confirmDialog, showErrors, setFieldError } from './ui.js';

const CART_KEY = 'jjcl_cart';
const CUSTOMER_KEY = 'jjcl_customer';
const MAX_QTY = 99;

// ---------- Armazenamento (localStorage com reserva em memória) ----------

const memory = {};
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return memory[key] ?? fallback;
  }
}
function write(key, value) {
  memory[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* navegação anônima ou armazenamento bloqueado: fica só em memória */
  }
}

function sanitize(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((i) => i && typeof i.id === 'string')
    .map((i) => ({ id: i.id, qty: Math.min(MAX_QTY, Math.max(1, parseInt(i.qty, 10) || 1)) }));
}

let items = sanitize(read(CART_KEY, []));
let productsById = null; // null = catálogo ainda não carregado (ou falhou)
let whatsappNumber = null;

const els = {
  dialog: $('#cart-dialog'),
  count: $('#cart-count'),
  bar: $('#cartbar'),
  barItems: $('#cartbar-items'),
  barTotal: $('#cartbar-total'),
  list: $('#cart-items'),
  total: $('#cart-total'),
  empty: $('#cart-empty'),
  content: $('#cart-content'),
  footer: $('#cart-footer'),
  form: $('#checkout'),
  send: $('#send-order'),
  unavailable: $('#orders-unavailable'),
  addressField: $('#address-field'),
};

function save() {
  write(CART_KEY, items);
}

/** Itens com os dados atuais do produto (preço sempre recalculado). */
function lines() {
  if (!productsById) return [];
  return items
    .map((i) => {
      const p = productsById.get(i.id);
      if (!p) return null;
      return { product: p, qty: i.qty, unit_cents: currentPrice(p), promo: isPromoActive(p) };
    })
    .filter(Boolean);
}

function totals() {
  const ls = lines();
  return {
    count: items.reduce((n, i) => n + i.qty, 0),
    total: ls.reduce((sum, l) => sum + l.unit_cents * l.qty, 0),
  };
}

// ---------- API usada pelo catálogo ----------

export function initCart({ products, settings }) {
  whatsappNumber = settings?.whatsapp_number || null;
  if (products) {
    productsById = new Map(products.map((p) => [p.id, p]));
    const unavailable = items.filter((i) => !productsById.has(i.id));
    if (unavailable.length) {
      items = items.filter((i) => productsById.has(i.id));
      save();
      const n = unavailable.length;
      toast(
        n === 1
          ? 'Um item do seu carrinho não está mais disponível e foi removido.'
          : `${n} itens do seu carrinho não estão mais disponíveis e foram removidos.`,
        'info',
        6000,
      );
    }
  }
  render();
}

export function addToCart(id, qty = 1) {
  const existing = items.find((i) => i.id === id);
  if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
  else items.push({ id, qty: Math.min(MAX_QTY, qty) });
  save();
  render();
}

function setQty(id, qty) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.qty = Math.min(MAX_QTY, Math.max(1, qty));
  save();
  render();
}

function removeItem(id) {
  items = items.filter((i) => i.id !== id);
  save();
  render();
}

function clearCart() {
  items = [];
  save();
  render();
}

// ---------- Renderização ----------

function render() {
  const { count, total } = totals();

  els.count.textContent = String(count);
  els.count.hidden = count === 0;
  $('#cart-open').setAttribute('aria-label', count ? `Abrir carrinho (${count} ${count === 1 ? 'item' : 'itens'})` : 'Abrir carrinho');

  els.bar.hidden = count === 0 || !productsById;
  document.body.classList.toggle('has-cartbar', !els.bar.hidden);
  els.barItems.textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
  els.barTotal.textContent = formatBRL(total);

  const ls = lines();
  const isEmpty = ls.length === 0;
  els.empty.hidden = !isEmpty;
  els.content.hidden = isEmpty;
  els.footer.hidden = isEmpty;
  if (!productsById && items.length) {
    els.empty.querySelector('strong').textContent = 'Não foi possível carregar o carrinho';
    els.empty.querySelector('span').textContent = 'Os produtos não carregaram. Recarregue a página para tentar novamente.';
  } else {
    els.empty.querySelector('strong').textContent = 'Seu carrinho está vazio';
    els.empty.querySelector('span').textContent = 'Adicione produtos para montar seu pedido.';
  }

  els.list.innerHTML = ls
    .map((l) => {
      const p = l.product;
      const img = p.images?.length ? imageUrl(p.images[0]) : 'assets/placeholder.svg';
      const unit = l.promo
        ? `<span class="is-promo">${formatBRL(l.unit_cents)} (promoção)</span>`
        : formatBRL(l.unit_cents);
      return `<li class="cart-item">
        <img src="${esc(img)}" alt="" loading="lazy">
        <div>
          <div class="cart-item-title">${esc(p.title)}</div>
          <div class="cart-item-unit">${unit} cada</div>
          <div class="cart-item-row">
            <div class="qty">
              <button type="button" data-qty="${esc(p.id)}" data-step="-1" aria-label="Diminuir quantidade de ${esc(p.title)}" ${l.qty <= 1 ? 'disabled' : ''}>−</button>
              <input type="number" inputmode="numeric" min="1" max="${MAX_QTY}" value="${l.qty}" data-qty-input="${esc(p.id)}" aria-label="Quantidade de ${esc(p.title)}">
              <button type="button" data-qty="${esc(p.id)}" data-step="1" aria-label="Aumentar quantidade de ${esc(p.title)}">+</button>
            </div>
            <span class="cart-item-subtotal">${formatBRL(l.unit_cents * l.qty)}</span>
            <button class="btn btn-ghost btn-sm" type="button" data-remove="${esc(p.id)}">Remover</button>
          </div>
        </div>
      </li>`;
    })
    .join('');
  els.total.textContent = formatBRL(total);

  els.unavailable.hidden = Boolean(whatsappNumber);
  els.send.disabled = !whatsappNumber;
}

// ---------- Dados do cliente ----------

const CUSTOMER_FIELDS = ['name', 'fulfillment', 'address', 'payment', 'notes'];

function readCustomer() {
  const f = els.form.elements;
  return Object.fromEntries(CUSTOMER_FIELDS.map((k) => [k, f[k].value]));
}

function restoreCustomer() {
  const saved = read(CUSTOMER_KEY, {}) || {};
  const f = els.form.elements;
  for (const k of CUSTOMER_FIELDS) {
    if (typeof saved[k] === 'string') f[k].value = saved[k];
  }
  toggleAddress();
}

function toggleAddress() {
  const delivery = els.form.elements.fulfillment.value === 'delivery';
  els.addressField.hidden = !delivery;
  if (!delivery) setFieldError(els.form, 'address', '');
}

els.form.addEventListener('input', (e) => {
  write(CUSTOMER_KEY, readCustomer());
  if (e.target.name) setFieldError(els.form, e.target.name, '');
});
els.form.addEventListener('change', (e) => {
  if (e.target.name === 'fulfillment') toggleAddress();
});

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!whatsappNumber) return;
  const ls = lines();
  if (!ls.length) return;

  const customer = readCustomer();
  const errors = validateCustomer(customer);
  if (!showErrors(els.form, ['name', 'fulfillment', 'address', 'payment'], errors)) return;

  const url = buildOrderUrl(
    whatsappNumber,
    ls.map((l) => ({ title: l.product.title, qty: l.qty, unit_cents: l.unit_cents, promo: l.promo })),
    customer,
  );
  const win = window.open(url, '_blank');
  if (win) win.opener = null;
  else window.location.href = url;

  const clear = await confirmDialog({
    title: 'Pedido aberto no WhatsApp',
    message: 'Confira a mensagem e toque em enviar no WhatsApp. Deseja esvaziar o carrinho?',
    confirmText: 'Sim, esvaziar',
    cancelText: 'Não, manter itens',
  });
  if (clear) {
    clearCart();
    els.dialog.close();
    toast('Obrigado pelo pedido!', 'success');
  }
});

// ---------- Eventos do carrinho ----------

els.list.addEventListener('click', (e) => {
  const step = e.target.closest('[data-qty]');
  if (step) {
    const item = items.find((i) => i.id === step.dataset.qty);
    if (item) setQty(item.id, item.qty + Number(step.dataset.step));
    // Mantém o foco no botão após re-renderizar.
    els.list.querySelector(`[data-qty="${CSS.escape(step.dataset.qty)}"][data-step="${step.dataset.step}"]`)?.focus();
    return;
  }
  const remove = e.target.closest('[data-remove]');
  if (remove) {
    const title = productsById?.get(remove.dataset.remove)?.title;
    removeItem(remove.dataset.remove);
    if (title) toast(`${title} removido`);
    (els.list.querySelector('[data-remove]') || els.dialog.querySelector('[data-close]'))?.focus();
  }
});

els.list.addEventListener('change', (e) => {
  const input = e.target.closest('[data-qty-input]');
  if (input) setQty(input.dataset.qtyInput, parseInt(input.value, 10) || 1);
});

function openCart() {
  render();
  openDialog(els.dialog);
}

$('#cart-open').addEventListener('click', openCart);
$('#cartbar-open').addEventListener('click', openCart);
closeOnBackdrop(els.dialog);
els.dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => els.dialog.close()));

restoreCustomer();
render();
