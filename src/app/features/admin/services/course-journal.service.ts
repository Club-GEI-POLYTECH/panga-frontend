import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  CourseOverviewRow,
  CreateLessonLogEntryDto,
  LessonLogEntry,
  PeriodTarget,
  UpdateLessonLogEntryDto,
  UpsertPeriodTargetDto,
} from '../models/course.models';

interface JournalQuery {
  classInstanceId?: string;
  studentId?: string;
  schoolYear: string;
  periodId?: string;
  classSubjectId?: string;
  [key: string]: unknown;
}

/** Journal de cours (cahier de texte) : heures prévues, séances, progression. */
@Injectable({ providedIn: 'root' })
export class CourseJournalService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/course-journal`;

  /** Synthèse progression (heures prévues vs réalisées) par cours. */
  overview(query: JournalQuery): Observable<CourseOverviewRow[]> {
    return this.http
      .get<unknown>(`${this.base}/overview`, { params: toHttpParams(query) })
      .pipe(map((r) => mapOverviewRows(unwrapEnvelope(r))));
  }

  /** Liste paginée des séances enregistrées. */
  entries(
    query: JournalQuery & { page?: number; limit?: number },
  ): Observable<ListResult<LessonLogEntry>> {
    return this.http
      .get<unknown>(`${this.base}/entries`, { params: toHttpParams(query) })
      .pipe(map((r) => unwrapList<LessonLogEntry>(r)));
  }

  createEntry(dto: CreateLessonLogEntryDto): Observable<LessonLogEntry> {
    return this.http
      .post<unknown>(`${this.base}/entries`, dto)
      .pipe(map((r) => unwrapEnvelope<LessonLogEntry>(r)));
  }

  updateEntry(id: string, dto: UpdateLessonLogEntryDto): Observable<LessonLogEntry> {
    return this.http
      .patch<unknown>(`${this.base}/entries/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<LessonLogEntry>(r)));
  }

  removeEntry(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/entries/${id}`);
  }

  /** Définir les heures prévues d'un cours sur une période (admin / super_admin). */
  upsertPeriodTarget(dto: UpsertPeriodTargetDto): Observable<PeriodTarget> {
    return this.http
      .put<unknown>(`${this.base}/period-targets`, dto)
      .pipe(map((r) => unwrapEnvelope<PeriodTarget>(r)));
  }
}

/* -------------------------------------------------------------------------- */

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalise la réponse `overview` quelle que soit sa forme exacte (array brut,
 * `{ data }`, `{ rows }`, `{ subjects }`, `{ overview }`), et dérive les champs
 * manquants (remaining, completionRatio) à partir de planned/delivered.
 */
function mapOverviewRows(data: unknown): CourseOverviewRow[] {
  const arr = pickArray(data);
  return arr.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const planned = num(o['plannedHours'] ?? o['planned'] ?? o['targetHours']);
    const delivered = num(
      o['deliveredHours'] ?? o['delivered'] ?? o['doneHours'] ?? o['realizedHours'],
    );
    const remaining =
      o['remainingHours'] !== undefined
        ? num(o['remainingHours'])
        : Math.max(0, planned - delivered);
    const ratio =
      o['completionRatio'] !== undefined
        ? num(o['completionRatio'])
        : planned > 0
          ? Math.min(1, delivered / planned)
          : 0;
    return {
      classSubjectId: String(o['classSubjectId'] ?? o['id'] ?? ''),
      subjectLabel: String(
        o['subjectLabel'] ?? o['labelFr'] ?? o['subject'] ?? o['programCode'] ?? '—',
      ),
      programCode: o['programCode'] as string | undefined,
      teacherName: (o['teacherName'] ?? o['teacher']) as string | undefined,
      plannedHours: planned,
      deliveredHours: delivered,
      remainingHours: remaining,
      completionRatio: ratio,
      entriesCount: o['entriesCount'] !== undefined ? num(o['entriesCount']) : undefined,
      ...o,
    } as CourseOverviewRow;
  });
}

function pickArray(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const key of ['rows', 'subjects', 'data', 'items', 'overview', 'results']) {
      if (Array.isArray(o[key])) {
        return o[key] as unknown[];
      }
    }
  }
  return [];
}
