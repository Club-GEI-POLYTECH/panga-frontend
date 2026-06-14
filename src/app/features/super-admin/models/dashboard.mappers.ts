import type { BillingMetrics, NamedValue, OverviewData, TrendPoint } from './platform.models';

/* Lecteurs tolérants : le backend peut varier les noms de champs / la casse. */

function prop(o: unknown, key: string): unknown {
  return o && typeof o === 'object' ? (o as Record<string, unknown>)[key] : undefined;
}

function num(o: unknown, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = prop(o, k);
    const n = typeof v === 'number' ? v : Number(v);
    if (v !== null && v !== undefined && v !== '' && Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

function str(o: unknown, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = prop(o, k);
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
    if (typeof v === 'number') {
      return String(v);
    }
  }
  return undefined;
}

function firstArray(o: unknown, ...keys: string[]): unknown[] {
  for (const k of keys) {
    const v = prop(o, k);
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

/** Convertit un tableau d'objets OU une map clé→nombre en `NamedValue[]`. */
export function toNamedValues(value: unknown): NamedValue[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        name: str(item, 'name', 'label', 'plan', 'status', 'school', 'schoolName', 'key') ?? '—',
        value: num(item, 'value', 'count', 'amount', 'total', 'students', 'enrollment', 'mrr') ?? 0,
      }))
      .filter((v) => v.name !== '—' || v.value !== 0);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([name, v]) => ({ name, value: Number(v) || 0 }))
      .filter((v) => Number.isFinite(v.value));
  }
  return [];
}

export function normalizeOverview(raw: unknown): OverviewData {
  return {
    activeSchools: num(raw, 'activeSchools', 'schoolsActive', 'activeSchoolsCount', 'schools'),
    totalStudents: num(raw, 'totalStudents', 'students', 'studentsGlobal', 'globalStudents'),
    totalTeachers: num(raw, 'totalTeachers', 'teachers', 'teachersGlobal', 'globalTeachers'),
    monthlyRevenue: num(raw, 'monthlyRevenue', 'revenueThisMonth', 'monthRevenue', 'revenue'),
    revenueDelta: num(raw, 'revenueDelta', 'revenueDeltaPercent', 'revenueDeltaPct', 'delta'),
    topSchools: toNamedValues(
      prop(raw, 'topSchools') ?? prop(raw, 'schoolsByEnrollment') ?? prop(raw, 'top5Schools'),
    ).slice(0, 5),
    primary: num(raw, 'primary', 'primaryStudents', 'primaryCount'),
    secondary: num(raw, 'secondary', 'secondaryStudents', 'secondaryCount'),
  };
}

export function normalizeTrends(raw: unknown): TrendPoint[] {
  const list = Array.isArray(raw)
    ? raw
    : firstArray(raw, 'data', 'trends', 'series', 'points', 'months');
  return list.map((p) => ({
    month: str(p, 'month', 'label', 'period', 'date', 'name') ?? '',
    newStudents: num(p, 'newStudents', 'students', 'studentsCount') ?? 0,
    revenue: num(p, 'revenue', 'amount', 'total') ?? 0,
    newSchools: num(p, 'newSchools', 'schools', 'schoolsCount') ?? 0,
  }));
}

export function normalizeBillingMetrics(raw: unknown): BillingMetrics {
  return {
    mrr: num(raw, 'mrr', 'MRR', 'monthlyRecurringRevenue'),
    arr: num(raw, 'arr', 'ARR', 'annualRecurringRevenue'),
    activeSubscriptions: num(raw, 'activeSubscriptions', 'active', 'subscriptionsActive'),
    pastDue: num(raw, 'pastDue', 'past_due', 'overdue'),
    trial: num(raw, 'trial', 'trials', 'trialing'),
    mrrByPlan: toNamedValues(prop(raw, 'mrrByPlan') ?? prop(raw, 'mrr_by_plan')),
    schoolsByPlan: toNamedValues(prop(raw, 'schoolsByPlan') ?? prop(raw, 'schools_by_plan')),
    outstanding: num(raw, 'outstanding', 'outstandingAmount', 'unpaidAmount', 'pendingAmount'),
    invoicesByStatus: toNamedValues(
      prop(raw, 'invoicesByStatus') ?? prop(raw, 'byStatus') ?? prop(raw, 'invoices_by_status'),
    ),
  };
}
