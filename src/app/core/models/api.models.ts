/**
 * Enveloppes de réponse standardisées du backend Panga.
 * Le backend renvoie toujours `{ success, data }` ou `{ success:false, error }`.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: ApiError;
}

export interface ApiError {
  code: ErrorCode | string;
  message: string;
  /**
   * Détails d'erreur : { champ: [messages] } ou tableau (VALIDATION_ERROR), ou
   * texte libre actionnable (BUSINESS_RULE_VIOLATION — voir errorInterceptor).
   */
  details?: Record<string, unknown> | FieldError[] | string | null;
}

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Métadonnées de pagination renvoyées par toutes les listes.
 * Breaking change backend : les listes renvoient `{ data, pagination }`.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** Paramètres de requête communs aux listes paginées. */
export interface PageQuery {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
  [key: string]: unknown;
}

/** Codes d'erreur normalisés côté backend (mapping UX centralisé). */
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TENANT_FORBIDDEN = 'TENANT_FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  ABSENCE_LIMIT_EXCEEDED = 'ABSENCE_LIMIT_EXCEEDED',
  OVERPAYMENT = 'OVERPAYMENT',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  /** `error.message` est un texte générique fixe : afficher `error.details` à la place. */
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
}
