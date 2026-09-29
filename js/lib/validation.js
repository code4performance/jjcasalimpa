import { parseBRL } from './money.js';

export const LIMITS = { title: 80, description: 1000, category: 40, images: 5 };

/**
 * Normaliza um WhatsApp brasileiro para "55" + DDD + número (12 ou 13 dígitos).
 * Aceita "(11) 98765-4321", "11987654321", "+55 11 98765-4321".
 * Retorna null se inválido.
 */
export function normalizePhone(input) {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
  return /^55\d{10,11}$/.test(digits) ? digits : null;
}

/** "5511987654321" -> "(11) 98765-4321" para exibição. */
export function formatPhone(number) {
  const d = String(number ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida os dados do formulário de produto (valores como digitados).
 * Retorna { errors, value } — value já no formato do banco quando não há erros.
 */
export function validateProduct(input) {
  const errors = {};
  const title = String(input.title ?? '').trim();
  const description = String(input.description ?? '').trim();
  const category = String(input.category ?? '').trim();

  if (!title) errors.title = 'Informe o título do produto';
  else if (title.length > LIMITS.title) errors.title = `Use no máximo ${LIMITS.title} caracteres`;

  if (description.length > LIMITS.description) {
    errors.description = `Use no máximo ${LIMITS.description} caracteres`;
  }
  if (category.length > LIMITS.category) errors.category = `Use no máximo ${LIMITS.category} caracteres`;

  const price = parseBRL(input.price);
  if (price == null || price <= 0) errors.price = 'Informe um preço válido maior que zero (ex.: 12,90)';

  const sortOrder = String(input.sort_order ?? '').trim() === '' ? 0 : Number(input.sort_order);
  if (!Number.isInteger(sortOrder)) errors.sort_order = 'Use um número inteiro';

  const promo = validatePromo(input, price);
  Object.assign(errors, promo.errors);

  const value = {
    title,
    description,
    category,
    price_cents: price,
    sort_order: sortOrder,
    active: input.active !== false,
    ...promo.value,
  };
  return { errors, value };
}

/** Valida os campos de promoção. Promoção vazia (sem preço e sem datas) é válida. */
export function validatePromo(input, priceCents) {
  const errors = {};
  const rawPromo = String(input.promo_price ?? '').trim();
  const start = String(input.promo_start ?? '').trim() || null;
  const end = String(input.promo_end ?? '').trim() || null;

  if (!rawPromo) {
    if (start || end) errors.promo_price = 'Informe o preço promocional ou apague as datas';
    return { errors, value: { promo_price_cents: null, promo_start: null, promo_end: null } };
  }

  const promo = parseBRL(rawPromo);
  if (promo == null || promo <= 0) {
    errors.promo_price = 'Informe um preço promocional válido maior que zero';
  } else if (priceCents != null && promo >= priceCents) {
    errors.promo_price = 'O preço promocional deve ser menor que o preço normal';
  }
  if (start && !DATE_RE.test(start)) errors.promo_start = 'Data inválida';
  if (end && !DATE_RE.test(end)) errors.promo_end = 'Data inválida';
  if (start && end && !errors.promo_start && !errors.promo_end && end < start) {
    errors.promo_end = 'A data de término não pode ser anterior à de início';
  }
  return { errors, value: { promo_price_cents: promo, promo_start: start, promo_end: end } };
}

export const FULFILLMENT = { delivery: 'Entrega', pickup: 'Retirada' };
export const PAYMENT = { pix: 'Pix', cash: 'Dinheiro', card: 'Cartão' };

/** Valida os dados do cliente no checkout. */
export function validateCustomer(c) {
  const errors = {};
  if (!String(c.name ?? '').trim()) errors.name = 'Informe seu nome';
  if (!FULFILLMENT[c.fulfillment]) errors.fulfillment = 'Escolha entrega ou retirada';
  if (c.fulfillment === 'delivery' && !String(c.address ?? '').trim()) {
    errors.address = 'Informe o endereço de entrega';
  }
  if (!PAYMENT[c.payment]) errors.payment = 'Escolha a forma de pagamento';
  return errors;
}

/** Valida as configurações da loja. */
export function validateSettings(input) {
  const errors = {};
  const raw = String(input.whatsapp_number ?? '').trim();
  let whatsapp = null;
  if (raw) {
    whatsapp = normalizePhone(raw);
    if (!whatsapp) errors.whatsapp_number = 'Número de WhatsApp inválido';
  }
  return {
    errors,
    value: {
      whatsapp_number: whatsapp,
      welcome_message: String(input.welcome_message ?? '').trim(),
      contact_info: String(input.contact_info ?? '').trim(),
      business_hours: String(input.business_hours ?? '').trim(),
    },
  };
}
