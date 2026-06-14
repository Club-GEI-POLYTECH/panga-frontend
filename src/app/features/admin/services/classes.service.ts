import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  ClassInstance,
  ClassTemplate,
  CreateClassInstanceDto,
  CreateClassTemplateDto,
} from '../models/admin.models';

/** Classes (dossier « 5 »). */
@Injectable({ providedIn: 'root' })
export class ClassesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(schoolYear: string): Observable<ListResult<ClassInstance>> {
    return this.http
      .get<unknown>(`${this.base}/classes`, { params: toHttpParams({ schoolYear }) })
      .pipe(map((r) => unwrapList<ClassInstance>(r)));
  }

  get(id: string): Observable<ClassInstance> {
    return this.http
      .get<unknown>(`${this.base}/classes/${id}`)
      .pipe(map((r) => unwrapEnvelope<ClassInstance>(r)));
  }

  statistics(id: string): Observable<unknown> {
    return this.http
      .get<unknown>(`${this.base}/classes/${id}/statistics`)
      .pipe(map((r) => unwrapEnvelope(r)));
  }

  createTemplate(dto: CreateClassTemplateDto): Observable<ClassTemplate> {
    return this.http
      .post<unknown>(`${this.base}/classes/templates`, dto)
      .pipe(map((r) => unwrapEnvelope<ClassTemplate>(r)));
  }

  createInstance(dto: CreateClassInstanceDto): Observable<ClassInstance> {
    return this.http
      .post<unknown>(`${this.base}/classes/instances`, dto)
      .pipe(map((r) => unwrapEnvelope<ClassInstance>(r)));
  }
}
