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

/** Cherche un bloc de pagination (`pagination` ou `meta`) dans plusieurs objets. */
function findPagination(...objs: unknown[]): PaginationMeta | undefined {
  for (const o of objs) {
    if (o && typeof o === 'object') {
      const p =
        (o as Record<string, unknown>)['pagination'] ?? (o as Record<string, unknown>)['meta'];
      if (p && typeof p === 'object') {
        return p as PaginationMeta;
      }
    }
  }
  return undefined;
}

/**
 * Normalise une réponse de liste, qu'elle soit brute (`[]`), paginée
 * (`{ data, pagination }`) ou enveloppée (`{ success, data: { data, ... } }`).
 * La pagination est lue qu'elle soit imbriquée dans `data` ou frère de `data`
 * au niveau de l'enveloppe.
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
