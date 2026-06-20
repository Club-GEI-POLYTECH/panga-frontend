import type { PaginationMeta } from '../../core/models/api.models';

/**
 * Pagination côté client pour les listes entièrement chargées (endpoints sans
 * pagination serveur). À combiner avec `<panga-paginator>` : on tranche le
 * tableau visible et on fabrique un `PaginationMeta` synthétique.
 */
export const CLIENT_PAGE_SIZE = 12;

/** Métadonnées de pagination synthétiques pour un tableau complet en mémoire. */
export function clientMeta(total: number, page: number, limit = CLIENT_PAGE_SIZE): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page: Math.min(Math.max(1, page), totalPages), limit, total, totalPages };
}

/** Sous-ensemble visible du tableau pour la page courante. */
export function pageSlice<T>(items: T[], page: number, limit = CLIENT_PAGE_SIZE): T[] {
  const safePage = Math.min(Math.max(1, page), Math.max(1, Math.ceil(items.length / limit)));
  const start = (safePage - 1) * limit;
  return items.slice(start, start + limit);
}
