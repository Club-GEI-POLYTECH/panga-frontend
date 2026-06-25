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

function shortSchool(id: unknown, index: number): string {
  return typeof id === 'string' && id.length >= 6
    ? `École ${id.slice(0, 6)}`
    : `École ${index + 1}`;
}

/**
 * Le backend renvoie `{ ui: { kpis[], sections }, raw: {...} }`. On lit en
 * priorité les KPIs structurés, avec repli sur le bloc `raw`.
 */
export function normalizeOverview(raw: unknown): OverviewData {
  const ui = prop(raw, 'ui');
  const rawBlock = prop(raw, 'raw');
  const kpis = Array.isArray(prop(ui, 'kpis')) ? (prop(ui, 'kpis') as unknown[]) : [];
  const kpi = (id: string): unknown => kpis.find((k) => prop(k, 'id') === id);
  const kpiVal = (id: string): number | null => num(kpi(id), 'value');

  const sections = prop(ui, 'sections');
  const topSchools = firstArray(prop(sections, 'tenant'), 'topSchoolsByStudents');
  const classDist = firstArray(prop(sections, 'academics'), 'classesDistribution');
  const byClass = (prefix: string): number | null =>
    num(
      classDist.find((c) => (str(c, 'label') ?? '').toLowerCase().startsWith(prefix)),
      'value',
    );

  return {
    activeSchools: kpiVal('schools_total') ?? num(prop(rawBlock, 'schools'), 'total'),
    totalStudents: kpiVal('students_total') ?? num(prop(rawBlock, 'students'), 'total'),
    totalTeachers: kpiVal('teachers_total') ?? num(prop(rawBlock, 'teachers'), 'total'),
    monthlyRevenue: kpiVal('revenue_month') ?? num(prop(rawBlock, 'revenue'), 'thisMonth'),
    revenueDelta: num(prop(kpi('revenue_month'), 'trend'), 'value'),
    topSchools: topSchools.slice(0, 5).map((s, i) => ({
      // Le backend fournit désormais le vrai nom ; repli sur un libellé dérivé de l'id.
      name:
        str(s, 'name', 'schoolName', 'displayName', 'code') ?? shortSchool(prop(s, 'schoolId'), i),
      value: num(s, 'students', 'value', 'count') ?? 0,
    })),
    primary: byClass('primaire') ?? num(prop(rawBlock, 'classes'), 'primary'),
    secondary: byClass('secondaire') ?? num(prop(rawBlock, 'classes'), 'secondary'),
  };
}

/** `2025-07` → `07/25` pour des axes lisibles. */
function shortMonth(m: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  return match ? `${match[2]}/${match[1].slice(2)}` : m;
}

export function normalizeTrends(raw: unknown): TrendPoint[] {
  const list = Array.isArray(raw)
    ? raw
    : firstArray(raw, 'series', 'data', 'trends', 'points', 'months');
  return list.map((p) => ({
    month: shortMonth(str(p, 'month', 'label', 'period', 'date', 'name') ?? ''),
    newStudents: num(p, 'newStudents', 'students', 'studentsCount') ?? 0,
    revenue: num(p, 'revenue', 'amount', 'total') ?? 0,
    newSchools: num(p, 'newSchools', 'schools', 'schoolsCount') ?? 0,
  }));
}

export function normalizeBillingMetrics(raw: unknown): BillingMetrics {
  return {
    mrr: num(raw, 'mrr', 'MRR', 'monthlyRecurringRevenue'),
    arr: num(raw, 'arr', 'ARR', 'annualRecurringRevenue'),
    mrrStandard: num(raw, 'mrrStandard', 'mrr_standard'),
    arrStandard: num(raw, 'arrStandard', 'arr_standard'),
    mrrStandardByPlan: toNamedValues(
      prop(raw, 'mrrStandardByPlan') ?? prop(raw, 'mrr_standard_by_plan'),
    ),
    activeSubscriptions: num(raw, 'activeSubscriptions', 'active', 'subscriptionsActive'),
    pastDue: num(raw, 'pastDue', 'past_due', 'overdue'),
    trial: num(raw, 'trial', 'trials', 'trialing'),
    mrrByPlan: toNamedValues(prop(raw, 'mrrByPlan') ?? prop(raw, 'mrr_by_plan')),
    schoolsByPlan: toNamedValues(prop(raw, 'schoolsByPlan') ?? prop(raw, 'schools_by_plan')),
    // `outstanding` peut être un objet { amount, invoices } ou un nombre brut.
    outstanding:
      num(prop(raw, 'outstanding'), 'amount') ??
      num(raw, 'outstanding', 'outstandingAmount', 'unpaidAmount', 'pendingAmount'),
    invoicesByStatus: toNamedValues(
      prop(raw, 'invoicesByStatus') ?? prop(raw, 'byStatus') ?? prop(raw, 'invoices_by_status'),
    ),
  };
}
