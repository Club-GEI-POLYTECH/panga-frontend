import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapList } from '../../../core/http/api.util';
import type { ClassSubject } from '../models/course.models';

/** Relations classe ↔ matière (« cours » ouverts sur une classe). */
@Injectable({ providedIn: 'root' })
export class SubjectsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/subjects`;

  /** Liste des cours ouverts (filtrable par classe / année / slot programme). */
  classSubjects(filter: {
    classId?: string;
    schoolYear?: string;
    nationalProgramSlotId?: string;
  }): Observable<ListResult<ClassSubject>> {
    return this.http
      .get<unknown>(`${this.base}/class-subjects`, { params: toHttpParams(filter) })
      .pipe(map((r) => unwrapList<ClassSubject>(r)));
  }
}
