import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PageQuery } from '../../../core/models/api.models';
import { ListResult, toHttpParams, unwrapList } from '../../../core/http/api.util';
import type { AuditLog } from '../models/platform.models';

/** Journal d'audit plateforme (GET /audit-logs). */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/audit-logs`;

  list(query: PageQuery = { page: 1, limit: 10 }): Observable<ListResult<AuditLog>> {
    return this.http
      .get<unknown>(this.base, { params: toHttpParams(query) })
      .pipe(map((r) => unwrapList<AuditLog>(r)));
  }
}
