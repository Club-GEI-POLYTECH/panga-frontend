/**
 * Modèles « plateforme » (vue super_admin). Les formes exactes renvoyées par le
 * backend variant, on garde des champs optionnels + index signature tolérante.
 */

export type StatBlock = Record<string, unknown>;

export interface PlatformSchool {
  id: string;
  name?: string;
  displayName?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: string;
  isActive?: boolean;
  studentsCount?: number;
  createdAt?: string;
  [key: string]: unknown;
}

export interface SchoolAuthority {
  id: string;
  educationLevel?: string;
  roleCode?: string;
  displayName?: string;
  email?: string;
  [key: string]: unknown;
}

export interface PlatformUser {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  schoolId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface SaasInvoice {
  id: string;
  schoolId?: string;
  amount?: number;
  currency?: string;
  subscriptionPlanOffered?: string;
  status?: string;
  notes?: string;
  externalRef?: string;
  paidAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface NationalProgram {
  id: string;
  code?: string;
  title?: string;
  educationLevel?: string;
  schoolCycle?: string;
  optionLabel?: string;
  levelYear?: number;
  referenceYear?: string;
  published?: boolean;
  isOfficial?: boolean;
  slots?: unknown[];
  [key: string]: unknown;
}

export interface BulletinProgram {
  id?: string;
  code?: string;
  title?: string;
  educationLevel?: string;
  schoolId?: string | null;
  slots?: unknown[];
  [key: string]: unknown;
}

/* --------------------------- Dashboard normalisé -------------------------- */

export interface NamedValue {
  name: string;
  value: number;
}

/** Vue d'ensemble plateforme normalisée (GET /dashboard/overview). */
export interface OverviewData {
  activeSchools: number | null;
  totalStudents: number | null;
  totalTeachers: number | null;
  monthlyRevenue: number | null;
  revenueDelta: number | null;
  topSchools: NamedValue[];
  primary: number | null;
  secondary: number | null;
}

/** Point de série mensuelle (GET /dashboard/stats/trends). */
export interface TrendPoint {
  month: string;
  newStudents: number;
  revenue: number;
  newSchools: number;
}

/** Métriques business SaaS (GET /billing/metrics). */
export interface BillingMetrics {
  mrr: number | null;
  arr: number | null;
  activeSubscriptions: number | null;
  pastDue: number | null;
  trial: number | null;
  mrrByPlan: NamedValue[];
  schoolsByPlan: NamedValue[];
  outstanding: number | null;
  invoicesByStatus: NamedValue[];
}

/** Entrée du journal d'audit (GET /audit-logs). */
export interface AuditLog {
  id?: string;
  action?: string;
  actor?: string;
  actorEmail?: string;
  entity?: string;
  entityType?: string;
  ip?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/** Statut de santé système (GET /health). */
export interface HealthStatus {
  status?: string;
  uptime?: number;
  info?: Record<string, unknown>;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

/* ----------------------------- DTOs d'écriture ---------------------------- */

export interface CreateSchoolDto {
  name: string;
  code: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface UpdateSchoolDto {
  displayName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
}

export interface CreateAuthorityDto {
  educationLevel: string;
  roleCode: string;
  displayName: string;
  email: string;
}

export interface RegisterUserDto {
  email: string;
  password: string;
  role: string;
  schoolId?: string | null;
  firstName: string;
  lastName: string;
}

export interface CreateSaasInvoiceDto {
  schoolId: string;
  amount: number;
  currency: string;
  subscriptionPlanOffered: string;
  notes?: string;
}
