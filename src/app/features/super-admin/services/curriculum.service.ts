import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type { BulletinProgram, NationalProgram } from '../models/platform.models';

/** Curriculum national & référentiels (dossiers « 5 » et « 6 »). */
@Injectable({ providedIn: 'root' })
export class CurriculumService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/curriculum`;

  /** Programmes nationaux publiés. */
  publishedPrograms(): Observable<ListResult<NationalProgram>> {
    return this.http
      .get<unknown>(`${this.base}/national-programs/published`)
      .pipe(map((r) => unwrapList<NationalProgram>(r)));
  }

  /** Programmes bulletin RDC embarqués. */
  rdcBulletinPrograms(): Observable<ListResult<BulletinProgram>> {
    return this.http
      .get<unknown>(`${this.base}/rdc/bulletin-programs`)
      .pipe(map((r) => unwrapList<BulletinProgram>(r)));
  }

  /** Référentiels bulletin (fusion base + embarqué). */
  bulletinPrograms(): Observable<ListResult<BulletinProgram>> {
    return this.http
      .get<unknown>(`${this.base}/bulletin-programs`)
      .pipe(map((r) => unwrapList<BulletinProgram>(r)));
  }

  importProgram(dto: Record<string, unknown>): Observable<NationalProgram> {
    return this.http
      .post<unknown>(`${this.base}/national-programs/import`, dto)
      .pipe(map((r) => unwrapEnvelope<NationalProgram>(r)));
  }

  publishProgram(id: string, published: boolean): Observable<NationalProgram> {
    return this.http
      .patch<unknown>(`${this.base}/national-programs/${id}/publish`, { published })
      .pipe(map((r) => unwrapEnvelope<NationalProgram>(r)));
  }

  createBulletinProgram(dto: Record<string, unknown>): Observable<BulletinProgram> {
    return this.http
      .post<unknown>(`${this.base}/bulletin-programs`, dto)
      .pipe(map((r) => unwrapEnvelope<BulletinProgram>(r)));
  }
}
