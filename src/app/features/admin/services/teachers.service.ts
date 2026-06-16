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

  list(query: PageQuery = { page: 1, limit: 10 }): Observable<ListResult<Teacher>> {
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

  update(id: string, dto: Record<string, unknown>): Observable<Teacher> {
    return this.http
      .patch<unknown>(`${this.base}/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<Teacher>(r)));
  }

  classes(id: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.base}/${id}/classes`).pipe(map((r) => unwrapEnvelope(r)));
  }
}
