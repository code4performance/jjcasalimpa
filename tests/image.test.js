import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedImage, fitWithin } from '../js/lib/image.js';

test('aceita apenas JPG, PNG e WebP', () => {
  assert.ok(isAllowedImage({ type: 'image/jpeg' }));
  assert.ok(isAllowedImage({ type: 'image/png' }));
  assert.ok(isAllowedImage({ type: 'image/webp' }));
  assert.ok(!isAllowedImage({ type: 'application/pdf' }));
  assert.ok(!isAllowedImage({ type: 'image/gif' }));
  assert.ok(!isAllowedImage(null));
});

test('reduz o maior lado para 1200px mantendo a proporção', () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 1200, height: 900 });
  assert.deepEqual(fitWithin(3000, 4000), { width: 900, height: 1200 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
});
