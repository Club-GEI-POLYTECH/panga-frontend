import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PageQuery } from '../../../core/models/api.models';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  CreateAuthorityDto,
  CreateSchoolDto,
  PlatformSchool,
  SchoolAuthority,
  UpdateSchoolDto,
} from '../models/platform.models';

/** Écoles multi-tenant et autorités (dossier « 2 — Écoles »). */
@Injectable({ providedIn: 'root' })
export class SchoolsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/schools`;

  list(query: PageQuery = { page: 1, limit: 20 }): Observable<ListResult<PlatformSchool>> {
    return this.http
      .get<unknown>(this.base, { params: toHttpParams(query) })
      .pipe(map((r) => unwrapList<PlatformSchool>(r)));
  }

  /** Liste publique (sans JWT). */
  publicList(): Observable<ListResult<PlatformSchool>> {
    return this.http
      .get<unknown>(`${this.base}/public`)
      .pipe(map((r) => unwrapList<PlatformSchool>(r)));
  }

  get(id: string): Observable<PlatformSchool> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map((r) => unwrapEnvelope<PlatformSchool>(r)));
  }

  create(dto: CreateSchoolDto): Observable<PlatformSchool> {
    return this.http
      .post<unknown>(this.base, dto)
      .pipe(map((r) => unwrapEnvelope<PlatformSchool>(r)));
  }

  update(id: string, dto: UpdateSchoolDto): Observable<PlatformSchool> {
    return this.http
      .put<unknown>(`${this.base}/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<PlatformSchool>(r)));
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/${id}`);
  }

  authorities(schoolId: string): Observable<ListResult<SchoolAuthority>> {
    return this.http
      .get<unknown>(`${this.base}/${schoolId}/authorities`)
      .pipe(map((r) => unwrapList<SchoolAuthority>(r)));
  }

  createAuthority(schoolId: string, dto: CreateAuthorityDto): Observable<SchoolAuthority> {
    return this.http
      .post<unknown>(`${this.base}/${schoolId}/authorities`, dto)
      .pipe(map((r) => unwrapEnvelope<SchoolAuthority>(r)));
  }

  updateAuthority(
    schoolId: string,
    authorityId: string,
    dto: Partial<CreateAuthorityDto>,
  ): Observable<SchoolAuthority> {
    return this.http
      .put<unknown>(`${this.base}/${schoolId}/authorities/${authorityId}`, dto)
      .pipe(map((r) => unwrapEnvelope<SchoolAuthority>(r)));
  }

  removeAuthority(schoolId: string, authorityId: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/${schoolId}/authorities/${authorityId}`);
  }
}
