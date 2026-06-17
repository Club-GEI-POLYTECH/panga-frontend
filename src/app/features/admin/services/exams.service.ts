import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  CreateExamDto,
  CreateExamResultDto,
  CreateExamRoomDto,
  CreateExamSessionDto,
  CreateExamSupervisorDto,
  Exam,
  ExamFilter,
  ExamResult,
  ExamRoom,
  ExamSession,
} from '../models/exam.models';

/** Examens : sessions, salles, examens, surveillants, résultats, statistiques. */
@Injectable({ providedIn: 'root' })
export class ExamsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/exams`;

  /* ------------------------------- Sessions --------------------------------- */

  sessions(filter: { schoolYear?: string; term?: string } = {}): Observable<ExamSession[]> {
    return this.http
      .get<unknown>(`${this.base}/sessions`, { params: toHttpParams(filter) })
      .pipe(map((r) => unwrapList<ExamSession>(r).items));
  }

  createSession(dto: CreateExamSessionDto): Observable<ExamSession> {
    return this.http
      .post<unknown>(`${this.base}/sessions`, dto)
      .pipe(map((r) => unwrapEnvelope<ExamSession>(r)));
  }

  /* -------------------------------- Salles ---------------------------------- */

  rooms(isActive?: boolean): Observable<ExamRoom[]> {
    return this.http
      .get<unknown>(`${this.base}/rooms`, { params: toHttpParams({ isActive }) })
      .pipe(map((r) => unwrapList<ExamRoom>(r).items));
  }

  createRoom(dto: CreateExamRoomDto): Observable<ExamRoom> {
    return this.http
      .post<unknown>(`${this.base}/rooms`, dto)
      .pipe(map((r) => unwrapEnvelope<ExamRoom>(r)));
  }

  /* -------------------------------- Examens --------------------------------- */

  list(filter: ExamFilter): Observable<ListResult<Exam>> {
    return this.http.get<unknown>(this.base, { params: toHttpParams(filter) }).pipe(
      map((r) => {
        const data = unwrapEnvelope<unknown>(r);
        // L'endpoint renvoie { exams, total }.
        if (data && typeof data === 'object' && 'exams' in (data as object)) {
          const o = data as { exams: Exam[]; total?: number };
          return {
            items: o.exams ?? [],
            pagination: o.total !== undefined ? mkPagination(o.total, filter) : undefined,
          };
        }
        return unwrapList<Exam>(r);
      }),
    );
  }

  get(id: string): Observable<Exam> {
    return this.http.get<unknown>(`${this.base}/${id}`).pipe(map((r) => unwrapEnvelope<Exam>(r)));
  }

  create(dto: CreateExamDto): Observable<Exam> {
    return this.http.post<unknown>(this.base, dto).pipe(map((r) => unwrapEnvelope<Exam>(r)));
  }

  update(id: string, dto: Record<string, unknown>): Observable<Exam> {
    return this.http
      .put<unknown>(`${this.base}/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<Exam>(r)));
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/${id}`);
  }

  /* ------------------------------ Surveillants ------------------------------ */

  addSupervisor(examId: string, dto: CreateExamSupervisorDto): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.base}/${examId}/supervisors`, dto)
      .pipe(map((r) => unwrapEnvelope(r)));
  }

  removeSupervisor(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/supervisors/${id}`);
  }

  /* -------------------------------- Résultats ------------------------------- */

  results(examId: string): Observable<ExamResult[]> {
    return this.http
      .get<unknown>(`${this.base}/${examId}/results`)
      .pipe(map((r) => unwrapList<ExamResult>(r).items));
  }

  upsertResult(dto: CreateExamResultDto): Observable<ExamResult> {
    return this.http
      .post<unknown>(`${this.base}/results`, dto)
      .pipe(map((r) => unwrapEnvelope<ExamResult>(r)));
  }

  publishResults(examId: string): Observable<Exam> {
    return this.http
      .post<unknown>(`${this.base}/${examId}/publish-results`, {})
      .pipe(map((r) => unwrapEnvelope<Exam>(r)));
  }

  statistics(examId: string): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.base}/${examId}/statistics`)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }
}

function mkPagination(total: number, filter: ExamFilter) {
  const limit = filter.limit ?? 10;
  const page = filter.page ?? 1;
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
