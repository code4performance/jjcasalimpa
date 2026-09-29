// Valores monetários são sempre inteiros em centavos; conversão só na borda.

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234 -> "R$ 12,34" (com espaço comum, não o NBSP do Intl). */
export function formatBRL(cents) {
  return brl.format((Number(cents) || 0) / 100).replace(/\s/g, ' ');
}

/** 1234 -> "12,34" (para preencher campos de formulário). */
export function centsToInput(cents) {
  if (cents == null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Converte o texto digitado em centavos. Aceita "3,49", "3.49", "R$ 3,49",
 * "1.234,56", "1234" e "1,5". Retorna null se o texto não for um valor válido.
 */
export function parseBRL(input) {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? Math.round(input * 100) : null;
  }
  let s = String(input ?? '').replace(/R\$/i, '').replace(/\s/g, '');
  if (!s) return null;

  const hasComma = s.includes(',');
  const dots = (s.match(/\./g) || []).length;
  if (hasComma) {
    // Vírgula é o separador decimal; pontos (antes dela) são de milhar.
    if (/,.*[.,]/.test(s)) return null;
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (dots > 1) {
    s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;

  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}
