import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PageQuery } from '../../../core/models/api.models';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  CreateFeeStructureDto,
  CreatePaymentDto,
  FeeStructure,
  Payment,
} from '../models/admin.models';

/** Paiements & frais scolaires (dossier « 11 »). */
@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/payments`;

  feeStructures(schoolYear: string): Observable<ListResult<FeeStructure>> {
    return this.http
      .get<unknown>(`${this.base}/fee-structures`, { params: toHttpParams({ schoolYear }) })
      .pipe(map((r) => unwrapList<FeeStructure>(r)));
  }

  createFeeStructure(dto: CreateFeeStructureDto): Observable<FeeStructure> {
    return this.http
      .post<unknown>(`${this.base}/fee-structures`, dto)
      .pipe(map((r) => unwrapEnvelope<FeeStructure>(r)));
  }

  payments(query: PageQuery = { page: 1, limit: 10 }): Observable<ListResult<Payment>> {
    return this.http
      .get<unknown>(this.base, { params: toHttpParams(query) })
      .pipe(map((r) => unwrapList<Payment>(r)));
  }

  createPayment(dto: CreatePaymentDto): Observable<Payment> {
    return this.http.post<unknown>(this.base, dto).pipe(map((r) => unwrapEnvelope<Payment>(r)));
  }

  statsOverview(schoolYear: string): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.base}/stats/overview`, { params: toHttpParams({ schoolYear }) })
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  resultsAccess(studentId: string, schoolYear: string): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.base}/students/${studentId}/results-access`, {
        params: toHttpParams({ schoolYear }),
      })
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }
}
