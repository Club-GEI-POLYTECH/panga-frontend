import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  Bulletin,
  BulletinPreview,
  CreateGradeDto,
  GenerateBulletinDto,
  GenerateClassDto,
  GenerateClassResult,
  Grade,
  Period,
} from '../models/admin.models';

/** Notes, périodes & bulletins (dossiers « 9 » et « 10 »). */
@Injectable({ providedIn: 'root' })
export class AcademicsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /* -------------------------------- Périodes -------------------------------- */

  seedPeriods(schoolYear: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/grades/periods/seed`, {
      schoolYear,
      createMissingOnly: true,
    });
  }

  periods(classId: string, schoolYear: string): Observable<ListResult<Period>> {
    return this.http
      .get<unknown>(`${this.base}/grades/periods`, {
        params: toHttpParams({ classId, schoolYear }),
      })
      .pipe(map((r) => unwrapList<Period>(r)));
  }

  /* --------------------------------- Notes ---------------------------------- */

  grades(classId: string, schoolYear: string, studentId?: string): Observable<ListResult<Grade>> {
    return this.http
      .get<unknown>(`${this.base}/grades`, {
        params: toHttpParams({ classId, schoolYear, studentId }),
      })
      .pipe(map((r) => unwrapList<Grade>(r)));
  }

  createGrade(dto: CreateGradeDto): Observable<Grade> {
    return this.http
      .post<unknown>(`${this.base}/grades`, dto)
      .pipe(map((r) => unwrapEnvelope<Grade>(r)));
  }

  computeClassAverages(classId: string, schoolYear: string): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.base}/grades/classes/${classId}/compute-averages`,
      {},
      { params: toHttpParams({ schoolYear }) },
    );
  }

  /* ------------------------------- Bulletins -------------------------------- */

  generateBulletin(dto: GenerateBulletinDto): Observable<Bulletin> {
    return this.http
      .post<unknown>(`${this.base}/bulletins/generate`, dto)
      .pipe(map((r) => unwrapEnvelope<Bulletin>(r)));
  }

  classBulletins(
    classId: string,
    schoolYear: string,
    term?: string,
  ): Observable<ListResult<Bulletin>> {
    return this.http
      .get<unknown>(`${this.base}/bulletins/classes/${classId}`, {
        params: toHttpParams({ schoolYear, term }),
      })
      .pipe(map((r) => unwrapList<Bulletin>(r)));
  }

  publishBulletin(id: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/bulletins/${id}/publish`, {});
  }

  /**
   * Aperçu (dry-run) d'un bulletin — rien n'est persisté (§C).
   * `term` est **optionnel** : omis, le back renvoie l'année complète (ANNUAL).
   */
  previewBulletin(params: {
    studentId: string;
    classId: string;
    schoolYear: string;
    term?: string;
    application?: string;
    conduite?: string;
  }): Observable<BulletinPreview> {
    return this.http
      .get<unknown>(`${this.base}/bulletins/preview`, { params: toHttpParams(params) })
      .pipe(map((r) => unwrapEnvelope<BulletinPreview>(r)));
  }

  /** Génère (ou rafraîchit) tous les bulletins d'une classe (§D). */
  generateClass(dto: GenerateClassDto): Observable<GenerateClassResult> {
    return this.http
      .post<unknown>(`${this.base}/bulletins/generate-class`, dto)
      .pipe(map((r) => unwrapEnvelope<GenerateClassResult>(r)));
  }

  /** PDF de toute la classe (1 bulletin/page) — nécessite generate-class d'abord. */
  classPdf(classId: string, schoolYear: string, term: string): Observable<Blob> {
    return this.http.get(`${this.base}/bulletins/classes/${classId}/pdf`, {
      params: toHttpParams({ schoolYear, term }),
      responseType: 'blob',
    });
  }

  /** PDF d'un bulletin. */
  bulletinPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/bulletins/${id}/pdf`, { responseType: 'blob' });
  }
}
