import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PageQuery } from '../../../core/models/api.models';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type { CreateTeacherDto, Teacher } from '../models/admin.models';

/** Enseignants (dossier « 6 »). */
@Injectable({ providedIn: 'root' })
export class TeachersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/teachers`;

  list(
    query: PageQuery & { search?: string } = { page: 1, limit: 10 },
  ): Observable<ListResult<Teacher>> {
    return this.http
      .get<unknown>(this.base, { params: toHttpParams(query) })
      .pipe(map((r) => unwrapList<Teacher>(r)));
  }

  get(id: string): Observable<Teacher> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map((r) => unwrapEnvelope<Teacher>(r)));
  }

  create(dto: CreateTeacherDto | Record<string, unknown>): Observable<Teacher> {
    return this.http.post<unknown>(this.base, dto).pipe(map((r) => unwrapEnvelope<Teacher>(r)));
  }

  /** Mise à jour : le backend expose un PUT (UpdateTeacherDto). */
  update(id: string, dto: Record<string, unknown>): Observable<Teacher> {
    return this.http
      .put<unknown>(`${this.base}/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<Teacher>(r)));
  }

  updateStatus(id: string, status: string): Observable<Teacher> {
    return this.http
      .put<unknown>(`${this.base}/${id}/status`, { status })
      .pipe(map((r) => unwrapEnvelope<Teacher>(r)));
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/${id}`);
  }

  /** Import d'enseignants via Excel (.xlsx/.xls) — fichier seul. */
  importExcel(file: File): Observable<Record<string, unknown>> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<unknown>(`${this.base}/import/excel`, form)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  /** Modèle Excel d'import (binaire). */
  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/import/template`, { responseType: 'blob' });
  }

  classes(id: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.base}/${id}/classes`).pipe(map((r) => unwrapEnvelope(r)));
  }
}
