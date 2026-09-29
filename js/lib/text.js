/** Remove acentos, converte para minúsculas e junta espaços repetidos. */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Verdadeiro se todas as palavras da busca aparecem no título ou na descrição. */
export function matchesSearch(product, query) {
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const haystack = normalize(`${product.title} ${product.description ?? ''}`);
  return words.every((w) => haystack.includes(w));
}

/** Lista de categorias distintas (ignorando vazias), em ordem alfabética. */
export function categoriesOf(products) {
  const byKey = new Map();
  for (const p of products) {
    const name = String(p.category ?? '').trim();
    if (name && !byKey.has(normalize(name))) byKey.set(normalize(name), name);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function sameCategory(a, b) {
  return normalize(a) === normalize(b);
}
