import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { unwrapList } from '../http/api.util';
import type { School } from '../models/auth.models';

/** Liste publique des écoles (GET /schools/public) — sans authentification. */
@Injectable({ providedIn: 'root' })
export class PublicSchoolsService {
  private readonly http = inject(HttpClient);

  list(): Observable<School[]> {
    return this.http
      .get<unknown>(`${environment.apiBaseUrl}/schools/public`)
      .pipe(map((r) => unwrapList<School>(r).items));
  }
}
