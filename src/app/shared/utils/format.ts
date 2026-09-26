/** Formate un nombre pour l'affichage FR (`—` si absent). */
export function fmtNumber(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : n.toLocaleString('fr-FR');
}

/**
 * Montant monétaire FR (`—` si absent).
 * `currency` = code ISO 4217 (ex. USD, EUR, CDF).
 */
export function fmtMoney(n: number | null | undefined, currency = 'USD'): string {
  if (n === null || n === undefined) {
    return '—';
  }
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString('fr-FR')} ${currency}`;
  }
}
