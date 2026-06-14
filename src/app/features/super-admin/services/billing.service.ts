import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PageQuery } from '../../../core/models/api.models';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type { CreateSaasInvoiceDto, SaasInvoice, StatBlock } from '../models/platform.models';

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
}
