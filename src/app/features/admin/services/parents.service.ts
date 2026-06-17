import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type { CreateParentDto, Parent } from '../models/admin.models';

/** Parents (dossier « 6 »). */
@Injectable({ providedIn: 'root' })
export class ParentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/parents`;

  list(): Observable<ListResult<Parent>> {
    return this.http.get<unknown>(this.base).pipe(map((r) => unwrapList<Parent>(r)));
  }

  /** Profil du parent connecté (inclut généralement les enfants liés). */
  me(): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.base}/me`)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  create(dto: CreateParentDto): Observable<Parent> {
    return this.http.post<unknown>(this.base, dto).pipe(map((r) => unwrapEnvelope<Parent>(r)));
  }
}
