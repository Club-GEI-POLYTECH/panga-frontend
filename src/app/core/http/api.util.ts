import { HttpParams } from '@angular/common/http';
import type { PaginationMeta } from '../models/api.models';

/**
 * Déballe l'enveloppe `{ success, data }` du backend si présente, sinon renvoie
 * la valeur telle quelle (certaines routes auth ne l'enveloppent pas).
 */
export function unwrapEnvelope<T = unknown>(res: unknown): T {
  if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export interface ListResult<T> {
  items: T[];
  pagination?: PaginationMeta;
}

/**
 * Lit la pagination d'un objet : bloc imbriqué (`pagination` / `meta`) ou
 * champs à plat (`page` / `limit` / `total` / `totalPages`).
 */
function readPagination(o: unknown): PaginationMeta | undefined {
  if (!o || typeof o !== 'object') {
    return undefined;
  }
  const obj = o as Record<string, unknown>;
  const nested = obj['pagination'] ?? obj['meta'];
  if (nested && typeof nested === 'object') {
    return nested as PaginationMeta;
  }
  if (
    typeof obj['total'] === 'number' &&
    (typeof obj['page'] === 'number' || typeof obj['totalPages'] === 'number')
  ) {
    const total = Number(obj['total']);
    const limit = Number(obj['limit']) || 0;
    return {
      page: Number(obj['page']) || 1,
      limit: limit || total,
      total,
      totalPages: Number(obj['totalPages']) || (limit ? Math.ceil(total / limit) : 1),
    };
  }
  return undefined;
}

/** Cherche la pagination dans plusieurs objets (data interne puis enveloppe). */
function findPagination(...objs: unknown[]): PaginationMeta | undefined {
  for (const o of objs) {
    const p = readPagination(o);
    if (p) {
      return p;
    }
  }
  return undefined;
}

/**
 * Normalise une réponse de liste. La pagination est lue où qu'elle soit :
 * - imbriquée : `{ success, data: { data:[…], pagination | page/total… } }`
 * - frère de data : `{ success, data:[…], pagination | page/total… }`
 */
export function unwrapList<T = unknown>(res: unknown): ListResult<T> {
  const data = unwrapEnvelope(res);
  if (Array.isArray(data)) {
    return { items: data as T[], pagination: findPagination(res) };
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const items = (obj['data'] ?? obj['items'] ?? obj['results'] ?? obj['schools']) as
      | T[]
      | undefined;
    if (Array.isArray(items)) {
      return { items, pagination: findPagination(obj, res) };
    }
  }
  return { items: [] };
}

/** Construit des `HttpParams` en ignorant les valeurs vides. */
export function toHttpParams(query?: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
  }
  return params;
}
