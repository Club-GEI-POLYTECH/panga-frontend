import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PageQuery } from '../../../core/models/api.models';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type { CreateStudentDto, Student } from '../models/admin.models';

/** Élèves (dossier « 7 — Élèves »). */
@Injectable({ providedIn: 'root' })
export class StudentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/students`;

  list(query: PageQuery = { page: 1, limit: 10 }): Observable<ListResult<Student>> {
    return this.http
      .get<unknown>(this.base, { params: toHttpParams(query) })
      .pipe(map((r) => unwrapList<Student>(r)));
  }

  get(id: string): Observable<Student> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map((r) => unwrapEnvelope<Student>(r)));
  }

  create(dto: CreateStudentDto | Record<string, unknown>): Observable<Student> {
    return this.http.post<unknown>(this.base, dto).pipe(map((r) => unwrapEnvelope<Student>(r)));
  }

  update(id: string, dto: Record<string, unknown>): Observable<Student> {
    return this.http
      .patch<unknown>(`${this.base}/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<Student>(r)));
  }

  /** Import d'une liste d'élèves via fichier Excel (.xlsx/.xls). */
  importExcel(file: File, schoolYear: string): Observable<Record<string, unknown>> {
    const form = new FormData();
    form.append('file', file);
    form.append('schoolYear', schoolYear);
    return this.http
      .post<unknown>(`${this.base}/import/excel`, form)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  grades(id: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.base}/${id}/grades`).pipe(map((r) => unwrapEnvelope(r)));
  }

  payments(id: string): Observable<unknown> {
    return this.http
      .get<unknown>(`${this.base}/${id}/payments`)
      .pipe(map((r) => unwrapEnvelope(r)));
  }

  attendance(id: string): Observable<unknown> {
    return this.http
      .get<unknown>(`${this.base}/${id}/attendance`)
      .pipe(map((r) => unwrapEnvelope(r)));
  }
}
