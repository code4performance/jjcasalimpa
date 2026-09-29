import test from 'node:test';
import assert from 'node:assert/strict';
import { todayInSaoPaulo, promoStatus, isPromoActive, currentPrice, discountPercent } from '../js/lib/pricing.js';

const base = { price_cents: 2000, promo_price_cents: 1500, promo_start: null, promo_end: null };

test('todayInSaoPaulo usa o fuso de São Paulo', () => {
  // 02:00 UTC do dia 2 ainda é dia 1 em São Paulo (UTC-3).
  assert.equal(todayInSaoPaulo(new Date('2026-10-02T02:00:00Z')), '2026-10-01');
  assert.equal(todayInSaoPaulo(new Date('2026-10-02T03:00:00Z')), '2026-10-02');
});

test('promoção sem datas vale imediatamente com -25%', () => {
  assert.equal(promoStatus(base, '2026-10-01'), 'active');
  assert.equal(currentPrice(base, '2026-10-01'), 1500);
  assert.equal(discountPercent(base, '2026-10-01'), 25);
});

test('sem preço promocional não há promoção', () => {
  const p = { ...base, promo_price_cents: null };
  assert.equal(promoStatus(p, '2026-10-01'), 'none');
  assert.equal(currentPrice(p, '2026-10-01'), 2000);
  assert.equal(discountPercent(p, '2026-10-01'), 0);
});

test('preço promocional maior ou igual ao normal é ignorado', () => {
  assert.equal(promoStatus({ ...base, promo_price_cents: 2000 }, '2026-10-01'), 'none');
  assert.equal(promoStatus({ ...base, promo_price_cents: 2500 }, '2026-10-01'), 'none');
});

test('período é inclusivo nas duas pontas', () => {
  const p = { ...base, promo_start: '2026-10-01', promo_end: '2026-10-07' };
  assert.equal(promoStatus(p, '2026-09-30'), 'scheduled');
  assert.equal(promoStatus(p, '2026-10-01'), 'active');
  assert.equal(promoStatus(p, '2026-10-07'), 'active');
  assert.equal(promoStatus(p, '2026-10-08'), 'expired');
  assert.equal(isPromoActive(p, '2026-10-08'), false);
  assert.equal(currentPrice(p, '2026-10-08'), 2000);
});

test('só início ou só término', () => {
  assert.equal(promoStatus({ ...base, promo_start: '2026-10-05' }, '2026-10-04'), 'scheduled');
  assert.equal(promoStatus({ ...base, promo_start: '2026-10-05' }, '2027-01-01'), 'active');
  assert.equal(promoStatus({ ...base, promo_end: '2026-10-05' }, '2026-10-06'), 'expired');
});

test('desconto é arredondado', () => {
  assert.equal(discountPercent({ ...base, price_cents: 1290, promo_price_cents: 990 }, '2026-10-01'), 23);
});
