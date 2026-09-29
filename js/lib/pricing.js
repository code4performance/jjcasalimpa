// Fonte única da regra de promoção: catálogo, carrinho, mensagem e painel usam estas funções.

const spDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Data de hoje no fuso de São Paulo, no formato "AAAA-MM-DD". */
export function todayInSaoPaulo(now = new Date()) {
  return spDate.format(now);
}

function hasValidPromoPrice(p) {
  return p.promo_price_cents != null && p.promo_price_cents > 0 && p.promo_price_cents < p.price_cents;
}

/**
 * Situação da promoção: 'none' (sem promoção), 'scheduled' (agendada),
 * 'active' (vigente) ou 'expired' (expirada). Datas são inclusivas.
 */
export function promoStatus(p, today = todayInSaoPaulo()) {
  if (!hasValidPromoPrice(p)) return 'none';
  if (p.promo_start && today < p.promo_start) return 'scheduled';
  if (p.promo_end && today > p.promo_end) return 'expired';
  return 'active';
}

export const PROMO_STATUS_LABELS = {
  none: 'Sem promoção',
  scheduled: 'Agendada',
  active: 'Em promoção',
  expired: 'Expirada',
};

export function isPromoActive(p, today = todayInSaoPaulo()) {
  return promoStatus(p, today) === 'active';
}

/** Preço vigente em centavos (promocional quando a promoção está valendo). */
export function currentPrice(p, today = todayInSaoPaulo()) {
  return isPromoActive(p, today) ? p.promo_price_cents : p.price_cents;
}

/** Percentual de desconto arredondado (ex.: 25), ou 0 sem promoção vigente. */
export function discountPercent(p, today = todayInSaoPaulo()) {
  if (!isPromoActive(p, today)) return 0;
  return Math.round((1 - p.promo_price_cents / p.price_cents) * 100);
}
