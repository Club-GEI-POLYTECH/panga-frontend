import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type { ClassSubject } from '../models/course.models';

/** Bilan d'une ouverture en masse des cours d'un programme national. */
export interface OpenFromProgramResult {
  programId: string;
  schoolYear: string;
  total: number;
  opened: number;
  skippedExcluded: number;
  skippedExisting: number;
  openedSubjects?: {
    id: string;
    nationalProgramSlotId: string;
    programCode: string;
    labelFr: string;
  }[];
}

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

  /**
   * Ouvre un cours pour chaque slot du programme lié à la classe (idempotent),
   * en excluant les matières non dispensées. Prérequis : programme lié à l'instance.
   */
  openFromProgram(
    classId: string,
    body: { excludeProgramCodes?: string[]; excludeSlotIds?: string[] },
  ): Observable<OpenFromProgramResult> {
    return this.http
      .post<unknown>(`${this.base}/class-instances/${classId}/open-from-program`, body)
      .pipe(map((r) => unwrapEnvelope<OpenFromProgramResult>(r)));
  }
}
