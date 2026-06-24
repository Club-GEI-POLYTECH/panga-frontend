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
 * Normalise une réponse de liste, qu'elle soit brute (`[]`), paginée
 * (`{ data, pagination }`) ou enveloppée (`{ success, data: { data, ... } }`).
 */
export function unwrapList<T = unknown>(res: unknown): ListResult<T> {
  const data = unwrapEnvelope(res);
  if (Array.isArray(data)) {
    return { items: data as T[] };
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const items = (obj['data'] ?? obj['items'] ?? obj['results'] ?? obj['schools']) as
      | T[]
      | undefined;
    if (Array.isArray(items)) {
      return { items, pagination: obj['pagination'] as PaginationMeta | undefined };
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
