import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBRL, parseBRL, centsToInput } from '../js/lib/money.js';

test('formatBRL formata centavos em reais', () => {
  assert.equal(formatBRL(1290), 'R$ 12,90');
  assert.equal(formatBRL(349), 'R$ 3,49');
  assert.equal(formatBRL(123456), 'R$ 1.234,56');
  assert.equal(formatBRL(0), 'R$ 0,00');
});

test('parseBRL aceita formatos comuns', () => {
  assert.equal(parseBRL('3,49'), 349);
  assert.equal(parseBRL('3.49'), 349);
  assert.equal(parseBRL('R$ 3,49'), 349);
  assert.equal(parseBRL('1.234,56'), 123456);
  assert.equal(parseBRL('1.234.567'), 123456700);
  assert.equal(parseBRL('12'), 1200);
  assert.equal(parseBRL('1,5'), 150);
  assert.equal(parseBRL(' 9,90 '), 990);
  assert.equal(parseBRL(0.1 + 0.2), 30);
});

test('parseBRL rejeita valores inválidos', () => {
  for (const bad of ['', 'abc', '-3,00', '3,499', '3,4,5', '1.2.3,4.5', null, undefined, NaN]) {
    assert.equal(parseBRL(bad), null, `esperava null para ${bad}`);
  }
});

test('centsToInput prepara o valor para o formulário', () => {
  assert.equal(centsToInput(349), '3,49');
  assert.equal(centsToInput(1200), '12,00');
  assert.equal(centsToInput(null), '');
});
