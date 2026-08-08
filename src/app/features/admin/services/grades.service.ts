import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  AnnualAverageResult,
  BulkCreateGradesDto,
  CalculateAverageDto,
  ClassTermAverages,
  CreateGradeDto,
  CreatePeriodDto,
  Grade,
  Period,
  ScopedProclamation,
} from '../models/grade.models';

interface GradeFilter {
  classId?: string;
  schoolYear?: string;
  studentId?: string;
  nationalProgramSlotId?: string;
  term?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

/** Notes & périodes (module grades). */
@Injectable({ providedIn: 'root' })
export class GradesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/grades`;

  /* -------------------------------- Périodes -------------------------------- */

  periods(classId: string, schoolYear: string): Observable<Period[]> {
    return this.http
      .get<unknown>(`${this.base}/periods`, { params: toHttpParams({ classId, schoolYear }) })
      .pipe(map((r) => unwrapList<Period>(r).items));
  }

  createPeriod(dto: CreatePeriodDto): Observable<Period> {
    return this.http
      .post<unknown>(`${this.base}/periods`, dto)
      .pipe(map((r) => unwrapEnvelope<Period>(r)));
  }

  updatePeriod(id: string, dto: Record<string, unknown>): Observable<Period> {
    return this.http
      .patch<unknown>(`${this.base}/periods/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<Period>(r)));
  }

  removePeriod(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/periods/${id}`);
  }

  seedPeriods(schoolYear: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/periods/seed`, {
      schoolYear,
      createMissingOnly: true,
    });
  }

  /* --------------------------------- Notes ---------------------------------- */

  list(filter: GradeFilter): Observable<ListResult<Grade>> {
    return this.http
      .get<unknown>(this.base, { params: toHttpParams(filter) })
      .pipe(map((r) => unwrapList<Grade>(r)));
  }

  create(dto: CreateGradeDto): Observable<Grade> {
    return this.http.post<unknown>(this.base, dto).pipe(map((r) => unwrapEnvelope<Grade>(r)));
  }

  createBulk(dto: BulkCreateGradesDto): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.base}/bulk/class-subject`, dto)
      .pipe(map((r) => unwrapEnvelope(r)));
  }

  update(id: string, dto: Record<string, unknown>): Observable<Grade> {
    return this.http
      .patch<unknown>(`${this.base}/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<Grade>(r)));
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/${id}`);
  }

  restore(id: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/${id}/restore`, {});
  }

  /* ------------------------------- Moyennes --------------------------------- */

  /** Calcul des moyennes de toute la classe (sans persistance). */
  computeClassAverages(classId: string, schoolYear: string): Observable<Record<string, unknown>> {
    return this.http
      .post<unknown>(
        `${this.base}/classes/${classId}/compute-averages`,
        {},
        { params: toHttpParams({ schoolYear }) },
      )
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  /**
   * Grille des moyennes d'une classe pour un trimestre (§A) : par élève et par
   * matière (P1/P2/Examen → moyenne de trimestre) + moyennes de classe.
   */
  classAverages(classId: string, schoolYear: string, term: string): Observable<ClassTermAverages> {
    return this.http
      .get<unknown>(`${this.base}/classes/${classId}/averages`, {
        params: toHttpParams({ schoolYear, term }),
      })
      .pipe(map((r) => unwrapEnvelope<ClassTermAverages>(r)));
  }

  /**
   * Proclamation scopée (§B) : classement + tranches. `term` optionnel — omis =
   * classement annuel. `scope` = 'term' (défaut si term fourni) | 'period' (+
   * `periodNumber` 1|2, période au sein du terme) | 'exam' | 'annual'.
   */
  proclamation(
    classId: string,
    schoolYear: string,
    term?: string,
    scope?: string,
    periodNumber?: number,
  ): Observable<ScopedProclamation> {
    return this.http
      .get<unknown>(`${this.base}/classes/${classId}/proclamation`, {
        params: toHttpParams({ schoolYear, term, scope, periodNumber }),
      })
      .pipe(map((r) => unwrapEnvelope<ScopedProclamation>(r)));
  }

  /** Toutes les moyennes d'un élève (par matière + générale). */
  studentAverages(
    studentId: string,
    classId: string,
    schoolYear: string,
  ): Observable<{
    subjectAverages: AnnualAverageResult[];
    overallAverage: number;
    overallAveragePercent: number;
  }> {
    return this.http
      .get<unknown>(`${this.base}/students/${studentId}/averages`, {
        params: toHttpParams({ classId, schoolYear }),
      })
      .pipe(
        map((r) =>
          unwrapEnvelope<{
            subjectAverages: AnnualAverageResult[];
            overallAverage: number;
            overallAveragePercent: number;
          }>(r),
        ),
      );
  }

  calculateAnnualAverage(dto: CalculateAverageDto): Observable<AnnualAverageResult> {
    return this.http
      .post<unknown>(`${this.base}/calculate/annual-average`, dto)
      .pipe(map((r) => unwrapEnvelope<AnnualAverageResult>(r)));
  }

  /* ------------------------------- Excel ------------------------------------ */

  exportExcel(filter: GradeFilter): Observable<Blob> {
    return this.http.get(`${this.base}/export`, {
      params: toHttpParams(filter),
      responseType: 'blob',
    });
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/import/template`, { responseType: 'blob' });
  }

  importExcel(file: File, schoolYear: string): Observable<Record<string, unknown>> {
    const form = new FormData();
    form.append('file', file);
    form.append('schoolYear', schoolYear);
    return this.http
      .post<unknown>(`${this.base}/import/excel`, form)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }
}
