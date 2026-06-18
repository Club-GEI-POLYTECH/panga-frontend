import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import { computeSchoolYear } from '../../../core/school-year/school-year.store';
import type { Bulletin, Grade } from '../../admin/models/admin.models';
import type { AnnualAverageResult } from '../../admin/models/grade.models';

/** Contexte élève dérivé de `/students/me` (ownership). */
export interface StudentContext {
  studentId: string;
  classId: string;
  schoolYear: string;
  raw: Record<string, unknown>;
}

interface StudentAverages {
  subjectAverages: AnnualAverageResult[];
  overallAverage: number;
  overallAveragePercent: number;
}

/** Routes accessibles à l'élève connecté (données propres, ownership). */
@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Profil de l'élève connecté. */
  me(): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.base}/students/me`)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  /** Tableau de bord élève (vue serveur). Scopé année (omis = courante, `'all'` = historique). */
  dashboard(schoolYear?: string): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.base}/dashboard/student`, { params: toHttpParams({ schoolYear }) })
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  /** Notes de l'élève (paginé / filtrable). */
  grades(studentId: string, schoolYear: string): Observable<Grade[]> {
    return this.http
      .get<unknown>(`${this.base}/grades`, {
        params: toHttpParams({ studentId, schoolYear, limit: 200 }),
      })
      .pipe(map((r) => unwrapList<Grade>(r).items));
  }

  /** Toutes les moyennes annuelles (par matière + générale). */
  averages(studentId: string, classId: string, schoolYear: string): Observable<StudentAverages> {
    return this.http
      .get<unknown>(`${this.base}/grades/students/${studentId}/averages`, {
        params: toHttpParams({ classId, schoolYear }),
      })
      .pipe(map((r) => unwrapEnvelope<StudentAverages>(r)));
  }

  /** Relevés (bulletins) de l'élève. */
  bulletins(studentId: string): Observable<Bulletin[]> {
    return this.http
      .get<unknown>(`${this.base}/bulletins/students/${studentId}`)
      .pipe(map((r) => unwrapList<Bulletin>(r).items));
  }

  bulletinPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/bulletins/${id}/pdf`, { responseType: 'blob' });
  }

  markBulletinViewed(id: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/bulletins/${id}/viewed`, {});
  }

  /** Présences de l'élève. */
  attendance(studentId: string): Observable<Record<string, unknown>[]> {
    return this.http
      .get<unknown>(`${this.base}/students/${studentId}/attendance`)
      .pipe(map((r) => unwrapList<Record<string, unknown>>(r).items));
  }

  /** Emploi du temps de la classe. */
  schedule(classId: string, schoolYear: string): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.base}/subjects/classes/${classId}/schedule`, {
        params: toHttpParams({ schoolYear }),
      })
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  /** Examens visibles par l'élève (filtrables). */
  exams(classId: string, schoolYear: string): Observable<Record<string, unknown>[]> {
    return this.http
      .get<unknown>(`${this.base}/exams`, { params: toHttpParams({ classId, schoolYear }) })
      .pipe(
        map((r) => {
          const data = unwrapEnvelope<unknown>(r);
          if (data && typeof data === 'object' && 'exams' in (data as object)) {
            return (data as { exams: Record<string, unknown>[] }).exams ?? [];
          }
          return unwrapList<Record<string, unknown>>(r).items;
        }),
      );
  }

  /** Mes paiements. */
  myPayments(): Observable<Record<string, unknown>[]> {
    return this.http
      .get<unknown>(`${this.base}/payments/my-payments`)
      .pipe(map((r) => unwrapList<Record<string, unknown>>(r).items));
  }

  /** Mes reçus. */
  myReceipts(): Observable<Record<string, unknown>[]> {
    return this.http
      .get<unknown>(`${this.base}/payments/my-receipts`)
      .pipe(map((r) => unwrapList<Record<string, unknown>>(r).items));
  }

  /** Structures de frais de l'école. */
  feeStructures(): Observable<Record<string, unknown>[]> {
    return this.http
      .get<unknown>(`${this.base}/payments/fee-structures`)
      .pipe(map((r) => unwrapList<Record<string, unknown>>(r).items));
  }

  /** Tranches de paiement de l'élève. */
  installments(studentId: string): Observable<Record<string, unknown>[]> {
    return this.http
      .get<unknown>(`${this.base}/payments/students/${studentId}/installments`)
      .pipe(map((r) => unwrapList<Record<string, unknown>>(r).items));
  }

  /** Reçu PDF d'un paiement. */
  receiptPdf(paymentId: string): Observable<Blob> {
    return this.http.get(`${this.base}/payments/${paymentId}/receipt/pdf`, {
      responseType: 'blob',
    });
  }

  /** Initier un paiement Mobile Money (passerelle). */
  initiateGatewayPayment(payload: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http
      .post<unknown>(`${this.base}/payments/gateway/initiate`, payload)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  /** Statut d'une transaction passerelle. */
  gatewayStatus(transactionId: string): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.base}/payments/gateway/${transactionId}/status`)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  /** Mes notifications. */
  notifications(): Observable<Record<string, unknown>[]> {
    return this.http
      .get<unknown>(`${this.base}/notifications/me`)
      .pipe(map((r) => unwrapList<Record<string, unknown>>(r).items));
  }

  markNotificationRead(id: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/notifications/read-all`, {});
  }
}

/** Dérive (studentId, classId, schoolYear) du profil `/students/me`, formes variables. */
export function extractContext(me: Record<string, unknown>): StudentContext {
  const studentId = String(me['id'] ?? me['studentId'] ?? '');
  const promo = (me['currentPromotion'] ?? {}) as Record<string, unknown>;
  const enrollments = (me['enrollments'] ?? me['studentEnrollments']) as
    | Record<string, unknown>[]
    | undefined;
  const firstEnrollment = Array.isArray(enrollments) ? enrollments[0] : undefined;
  const classId = String(
    me['classInstanceId'] ??
      me['classId'] ??
      me['currentClassInstanceId'] ??
      promo['classInstanceId'] ??
      promo['toClassInstanceId'] ??
      firstEnrollment?.['classInstanceId'] ??
      '',
  );
  const schoolYear = String(
    me['schoolYear'] ??
      firstEnrollment?.['schoolYear'] ??
      promo['schoolYear'] ??
      computeSchoolYear(new Date()),
  );
  return { studentId, classId, schoolYear, raw: me };
}
