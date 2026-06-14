import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type { CreateTeacherDto, Teacher } from '../models/admin.models';

/** Enseignants (dossier « 6 »). */
@Injectable({ providedIn: 'root' })
export class TeachersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/teachers`;

  list(): Observable<ListResult<Teacher>> {
    return this.http.get<unknown>(this.base).pipe(map((r) => unwrapList<Teacher>(r)));
  }

  create(dto: CreateTeacherDto): Observable<Teacher> {
    return this.http.post<unknown>(this.base, dto).pipe(map((r) => unwrapEnvelope<Teacher>(r)));
  }

  classes(id: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.base}/${id}/classes`).pipe(map((r) => unwrapEnvelope(r)));
  }
}
