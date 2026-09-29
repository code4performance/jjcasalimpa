import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, matchesSearch, categoriesOf } from '../js/lib/text.js';

test('normalize remove acentos e caixa', () => {
  assert.equal(normalize('  Água   Sanitária '), 'agua sanitaria');
});

test('busca ignora acentos e maiúsculas', () => {
  const p = { title: 'Água Sanitária 2L', description: 'Alvejante para limpeza pesada' };
  assert.ok(matchesSearch(p, 'agua sanitaria'));
  assert.ok(matchesSearch(p, 'SANITÁRIA'));
  assert.ok(matchesSearch(p, 'alvejante 2l'));
  assert.ok(matchesSearch(p, ''));
  assert.ok(!matchesSearch(p, 'detergente'));
});

test('busca funciona sem descrição', () => {
  assert.ok(matchesSearch({ title: 'Detergente', description: null }, 'deter'));
});

test('categorias distintas, sem vazias, em ordem', () => {
  const cats = categoriesOf([
    { category: 'Cozinha' }, { category: 'banheiro' }, { category: 'cozinha ' }, { category: '' }, { category: null },
  ]);
  assert.deepEqual(cats, ['banheiro', 'Cozinha']);
});
