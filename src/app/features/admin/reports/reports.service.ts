import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { toHttpParams, unwrapEnvelope } from '../../../core/http/api.util';

/** Statistiques agrégées d'une classe (moyennes déjà calculées par Grades). */
export interface ClassStats {
  classInstanceId?: string;
  schoolYear?: string;
  term?: string | null;
  studentCount?: number;
  average?: number | null;
  median?: number | null;
  min?: number | null;
  max?: number | null;
  stdDev?: number | null;
  passRate?: number | null;
  [key: string]: unknown;
}

/** Répartition par tranches de 10 % (forme tolérante : objet ou tableau). */
export type ClassDistribution = unknown;

/** Un point de l'évolution année/année. */
export interface ClassTrendPoint {
  schoolYear?: string;
  average?: number | null;
  passRate?: number | null;
  [key: string]: unknown;
}

/**
 * Rapports statistiques par classe (module `/reports`). Réservé admin/enseignant
 * (l'enseignant est scopé à ses classes côté backend).
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/reports`;

  /** Répartition des moyennes par tranches de 10 %. */
  distribution(classId: string, schoolYear: string, term?: string): Observable<ClassDistribution> {
    return this.http
      .get<unknown>(`${this.base}/classes/${classId}/distribution`, {
        params: toHttpParams({ schoolYear, term }),
      })
      .pipe(map((r) => unwrapEnvelope<ClassDistribution>(r)));
  }

  /** Statistiques : moyenne, médiane, min/max, écart-type, taux de réussite. */
  stats(classId: string, schoolYear: string, term?: string): Observable<ClassStats> {
    return this.http
      .get<unknown>(`${this.base}/classes/${classId}/stats`, {
        params: toHttpParams({ schoolYear, term }),
      })
      .pipe(map((r) => unwrapEnvelope<ClassStats>(r)));
  }

  /** Évolution année/année (moyenne + taux de réussite). */
  trend(classId: string, schoolYears: string, term?: string): Observable<ClassTrendPoint[]> {
    return this.http
      .get<unknown>(`${this.base}/classes/${classId}/trend`, {
        params: toHttpParams({ schoolYears, term }),
      })
      .pipe(map((r) => unwrapEnvelope<ClassTrendPoint[]>(r)));
  }

  /** Export Excel (1 ligne/élève : moyenne + statut). */
  exportExcel(classId: string, schoolYear: string, term?: string): Observable<Blob> {
    return this.http.get(`${this.base}/classes/${classId}/export`, {
      params: toHttpParams({ schoolYear, term }),
      responseType: 'blob',
    });
  }
}
