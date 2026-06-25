import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PageQuery } from '../../../core/models/api.models';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  BillingEstimate,
  CreateSaasInvoiceDto,
  PlanCatalog,
  PlanPricing,
  SaasInvoice,
  StatBlock,
} from '../models/platform.models';

/** Facturation SaaS (dossier « 4 — Facturation SaaS »). */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/billing`;

  /** Métriques business SaaS : MRR/ARR, abonnements, encours… */
  metrics(): Observable<StatBlock> {
    return this.http
      .get<unknown>(`${this.base}/metrics`)
      .pipe(map((r) => unwrapEnvelope<StatBlock>(r)));
  }

  /** Abonnement d'une école (schoolId requis). */
  schoolSubscription(schoolId: string): Observable<StatBlock> {
    return this.http
      .get<unknown>(`${this.base}/school/subscription`, { params: toHttpParams({ schoolId }) })
      .pipe(map((r) => unwrapEnvelope<StatBlock>(r)));
  }

  listInvoices(query: PageQuery = { page: 1, limit: 20 }): Observable<ListResult<SaasInvoice>> {
    return this.http
      .get<unknown>(`${this.base}/saas-invoices`, { params: toHttpParams(query) })
      .pipe(map((r) => unwrapList<SaasInvoice>(r)));
  }

  getInvoice(id: string): Observable<SaasInvoice> {
    return this.http
      .get<unknown>(`${this.base}/saas-invoices/${id}`)
      .pipe(map((r) => unwrapEnvelope<SaasInvoice>(r)));
  }

  createInvoice(dto: CreateSaasInvoiceDto): Observable<SaasInvoice> {
    return this.http
      .post<unknown>(`${this.base}/saas-invoices`, dto)
      .pipe(map((r) => unwrapEnvelope<SaasInvoice>(r)));
  }

  markPaid(id: string, externalRef: string): Observable<SaasInvoice> {
    return this.http
      .patch<unknown>(`${this.base}/saas-invoices/${id}/mark-paid`, { externalRef })
      .pipe(map((r) => unwrapEnvelope<SaasInvoice>(r)));
  }

  /* ------------------------------ Plans & tarifs ---------------------------- */

  /** Catalogue des plans (prix + fonctionnalités). */
  plans(): Observable<PlanCatalog> {
    return this.http
      .get<unknown>(`${this.base}/plans`)
      .pipe(map((r) => unwrapEnvelope<PlanCatalog>(r)));
  }

  /** Estimation tarifaire pour un plan et un effectif. */
  estimate(plan: string, students: number): Observable<BillingEstimate> {
    return this.http
      .get<unknown>(`${this.base}/estimate`, { params: toHttpParams({ plan, students }) })
      .pipe(map((r) => unwrapEnvelope<BillingEstimate>(r)));
  }

  /** Grille de tarification éditable (super_admin). */
  pricing(): Observable<PlanPricing[]> {
    return this.http
      .get<unknown>(`${this.base}/pricing`)
      .pipe(map((r) => unwrapList<PlanPricing>(r).items));
  }

  /** Met à jour les prix d'un plan (super_admin). */
  updatePricing(plan: string, dto: Record<string, unknown>): Observable<PlanPricing> {
    return this.http
      .put<unknown>(`${this.base}/pricing/${plan}`, dto)
      .pipe(map((r) => unwrapEnvelope<PlanPricing>(r)));
  }

  /** Lance la relance des impayés (dunning). */
  runDunning(): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.base}/run-dunning`, {})
      .pipe(map((r) => unwrapEnvelope(r)));
  }
}
