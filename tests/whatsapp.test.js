import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderMessage, buildOrderUrl, buildContactUrl } from '../js/lib/whatsapp.js';

const lines = [
  { title: 'Detergente Neutro 500ml', qty: 2, unit_cents: 349, promo: false },
  { title: 'Água Sanitária 2L', qty: 1, unit_cents: 790, promo: true },
];

test('mensagem de entrega com todos os dados', () => {
  const msg = buildOrderMessage(lines, {
    name: 'Maria', fulfillment: 'delivery', address: 'Rua das Flores, 123', payment: 'pix', notes: 'Tocar a campainha',
  });
  assert.equal(msg, [
    'Olá, JJ Casa Limpa! Gostaria de fazer um pedido:',
    '',
    '2x Detergente Neutro 500ml — R$ 3,49 = R$ 6,98',
    '1x Água Sanitária 2L (promoção) — R$ 7,90 = R$ 7,90',
    '',
    '*Total: R$ 14,88*',
    '',
    'Nome: Maria',
    'Recebimento: Entrega',
    'Endereço: Rua das Flores, 123',
    'Pagamento: Pix',
    'Observações: Tocar a campainha',
  ].join('\n'));
});

test('retirada omite endereço e observações vazias', () => {
  const msg = buildOrderMessage(lines, { name: 'João', fulfillment: 'pickup', address: 'ignorado', payment: 'cash', notes: ' ' });
  assert.ok(msg.includes('Recebimento: Retirada'));
  assert.ok(!msg.includes('Endereço'));
  assert.ok(!msg.includes('Observações'));
  assert.ok(msg.includes('Pagamento: Dinheiro'));
});

test('URL codifica acentos, quebras de linha, & e #', () => {
  const notes = 'Troco p/ 50 & sem sacola #2\nPortão azul';
  const url = buildOrderUrl('5511987654321', lines, { name: 'Zé', fulfillment: 'pickup', payment: 'card', notes });
  assert.ok(url.startsWith('https://wa.me/5511987654321?text='));
  const text = new URL(url).searchParams.get('text');
  assert.ok(text.endsWith(`Observações: ${notes}`));
  assert.ok(text.includes('Nome: Zé'));
  const query = url.split('?text=')[1];
  assert.ok(!/[ &#\n]/.test(query));
});

test('link de dúvida', () => {
  const url = buildContactUrl('5511987654321');
  assert.equal(new URL(url).searchParams.get('text'), 'Olá, JJ Casa Limpa! Tenho uma dúvida.');
});
