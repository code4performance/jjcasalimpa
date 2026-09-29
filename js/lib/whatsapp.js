import { formatBRL } from './money.js';
import { FULFILLMENT, PAYMENT } from './validation.js';

export const STORE_NAME = 'JJ Casa Limpa';

/**
 * Monta o texto do pedido.
 * lines: [{ title, qty, unit_cents, promo }]
 * customer: { name, fulfillment, address, payment, notes }
 */
export function buildOrderMessage(lines, customer, storeName = STORE_NAME) {
  const out = [`Olá, ${storeName}! Gostaria de fazer um pedido:`, ''];
  let total = 0;
  for (const l of lines) {
    const subtotal = l.unit_cents * l.qty;
    total += subtotal;
    const promo = l.promo ? ' (promoção)' : '';
    out.push(`${l.qty}x ${l.title}${promo} — ${formatBRL(l.unit_cents)} = ${formatBRL(subtotal)}`);
  }
  out.push('', `*Total: ${formatBRL(total)}*`, '');
  out.push(`Nome: ${customer.name.trim()}`);
  out.push(`Recebimento: ${FULFILLMENT[customer.fulfillment]}`);
  if (customer.fulfillment === 'delivery') out.push(`Endereço: ${customer.address.trim()}`);
  out.push(`Pagamento: ${PAYMENT[customer.payment]}`);
  const notes = String(customer.notes ?? '').trim();
  if (notes) out.push(`Observações: ${notes}`);
  return out.join('\n');
}

export function buildWhatsAppUrl(number, text) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function buildOrderUrl(number, lines, customer, storeName = STORE_NAME) {
  return buildWhatsAppUrl(number, buildOrderMessage(lines, customer, storeName));
}

export function buildContactUrl(number, storeName = STORE_NAME) {
  return buildWhatsAppUrl(number, `Olá, ${storeName}! Tenho uma dúvida.`);
}
