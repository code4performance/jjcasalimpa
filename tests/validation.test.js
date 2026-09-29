import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone, formatPhone, validateProduct, validatePromo, validateCustomer, validateSettings,
} from '../js/lib/validation.js';

test('normalizePhone gera 55 + DDD + número', () => {
  assert.equal(normalizePhone('(11) 98765-4321'), '5511987654321');
  assert.equal(normalizePhone('+55 11 98765-4321'), '5511987654321');
  assert.equal(normalizePhone('11 3456-7890'), '551134567890');
  assert.equal(normalizePhone('55 99876-5432'), '5555998765432'); // DDD 55 (RS)
  assert.equal(normalizePhone('5511987654321'), '5511987654321');
});

test('normalizePhone rejeita números inválidos', () => {
  for (const bad of ['', '98765-4321', '123', '1198765432100', '4411987654321']) {
    assert.equal(normalizePhone(bad), null, bad);
  }
});

test('formatPhone exibe no padrão brasileiro', () => {
  assert.equal(formatPhone('5511987654321'), '(11) 98765-4321');
  assert.equal(formatPhone('551134567890'), '(11) 3456-7890');
});

test('produto válido vira valores do banco', () => {
  const { errors, value } = validateProduct({ title: ' Detergente Neutro 500ml ', price: '3,49', category: 'Cozinha' });
  assert.deepEqual(errors, {});
  assert.equal(value.title, 'Detergente Neutro 500ml');
  assert.equal(value.price_cents, 349);
  assert.equal(value.active, true);
  assert.equal(value.sort_order, 0);
  assert.equal(value.promo_price_cents, null);
});

test('produto sem título ou com preço inválido é bloqueado', () => {
  assert.ok(validateProduct({ title: '', price: '3,49' }).errors.title);
  assert.ok(validateProduct({ title: 'x'.repeat(81), price: '3,49' }).errors.title);
  for (const price of ['0', '0,00', '-1', 'abc', '']) {
    assert.ok(validateProduct({ title: 'X', price }).errors.price, price);
  }
  assert.ok(validateProduct({ title: 'X', price: '1', description: 'a'.repeat(1001) }).errors.description);
});

test('promoção deve ser menor que o preço normal', () => {
  const { errors } = validateProduct({ title: 'X', price: '12,90', promo_price: '12,90' });
  assert.equal(errors.promo_price, 'O preço promocional deve ser menor que o preço normal');
  assert.deepEqual(validateProduct({ title: 'X', price: '12,90', promo_price: '9,90' }).errors, {});
});

test('datas da promoção', () => {
  assert.ok(validatePromo({ promo_price: '5', promo_start: '2026-10-07', promo_end: '2026-10-01' }, 1000).errors.promo_end);
  assert.deepEqual(validatePromo({ promo_price: '5', promo_start: '2026-10-01', promo_end: '2026-10-01' }, 1000).errors, {});
  assert.ok(validatePromo({ promo_price: '', promo_start: '2026-10-01' }, 1000).errors.promo_price);
  assert.deepEqual(validatePromo({ promo_price: '' }, 1000).value, { promo_price_cents: null, promo_start: null, promo_end: null });
});

test('dados do cliente', () => {
  const ok = { name: 'Maria', fulfillment: 'pickup', payment: 'pix' };
  assert.deepEqual(validateCustomer(ok), {});
  assert.equal(validateCustomer({ ...ok, name: '  ' }).name, 'Informe seu nome');
  assert.ok(validateCustomer({ ...ok, fulfillment: 'delivery', address: '' }).address);
  assert.deepEqual(validateCustomer({ ...ok, fulfillment: 'delivery', address: 'Rua A, 1' }), {});
  assert.ok(validateCustomer({ ...ok, fulfillment: '' }).fulfillment);
  assert.ok(validateCustomer({ ...ok, payment: '' }).payment);
});

test('configurações normalizam o WhatsApp', () => {
  assert.equal(validateSettings({ whatsapp_number: '(11) 98765-4321' }).value.whatsapp_number, '5511987654321');
  assert.equal(validateSettings({ whatsapp_number: '9876' }).errors.whatsapp_number, 'Número de WhatsApp inválido');
  assert.equal(validateSettings({ whatsapp_number: '' }).value.whatsapp_number, null);
});
