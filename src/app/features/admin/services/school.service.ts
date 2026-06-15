import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  CreateAuthorityDto,
  PlatformSchool,
  SchoolAuthority,
  UpdateSchoolDto,
} from '../../super-admin/models/platform.models';

/** Mon établissement (dossier « 2 »). Le périmètre vient du JWT (schoolId). */
@Injectable({ providedIn: 'root' })
export class SchoolService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/schools`;

  mySchool(): Observable<PlatformSchool> {
    return this.http
      .get<unknown>(`${this.base}/my-school`)
      .pipe(map((r) => unwrapEnvelope<PlatformSchool>(r)));
  }

  update(id: string, dto: UpdateSchoolDto): Observable<PlatformSchool> {
    return this.http
      .put<unknown>(`${this.base}/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<PlatformSchool>(r)));
  }

  subscription(): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${environment.apiBaseUrl}/billing/school/subscription`)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  authorities(id: string): Observable<ListResult<SchoolAuthority>> {
    return this.http
      .get<unknown>(`${this.base}/${id}/authorities`)
      .pipe(map((r) => unwrapList<SchoolAuthority>(r)));
  }

  createAuthority(id: string, dto: CreateAuthorityDto): Observable<SchoolAuthority> {
    return this.http
      .post<unknown>(`${this.base}/${id}/authorities`, dto)
      .pipe(map((r) => unwrapEnvelope<SchoolAuthority>(r)));
  }
}
