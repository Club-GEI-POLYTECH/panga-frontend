import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  ClassSubject,
  CopyVersionDto,
  CreateClassSubjectDto,
  UpdateClassSubjectDto,
} from '../models/course.models';

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
   * L'année scolaire est déduite de l'instance côté backend — ne pas l'envoyer
   * (ValidationPipe whitelist : un champ inconnu → 400).
   */
  openFromProgram(
    classId: string,
    body: { excludeProgramCodes?: string[]; excludeSlotIds?: string[] },
  ): Observable<OpenFromProgramResult> {
    return this.http
      .post<unknown>(`${this.base}/class-instances/${classId}/open-from-program`, body)
      .pipe(map((r) => unwrapEnvelope<OpenFromProgramResult>(r)));
  }

  /* ------------------------------ Emploi du temps -------------------------- */

  /** Emploi du temps d'une classe (grille des créneaux + cours). */
  classSchedule(classId: string, schoolYear: string): Observable<unknown> {
    return this.http
      .get<unknown>(`${this.base}/classes/${classId}/schedule`, {
        params: toHttpParams({ schoolYear }),
      })
      .pipe(map((r) => unwrapEnvelope<unknown>(r)));
  }

  /** Emploi du temps d'un enseignant (ses créneaux/cours). */
  teacherSchedule(teacherId: string, schoolYear: string): Observable<unknown> {
    return this.http
      .get<unknown>(`${this.base}/teachers/${teacherId}/schedule`, {
        params: toHttpParams({ schoolYear }),
      })
      .pipe(map((r) => unwrapEnvelope<unknown>(r)));
  }

  /* --------------------- Cycle de vie d'un cours unitaire ------------------- */

  getClassSubject(id: string): Observable<ClassSubject> {
    return this.http
      .get<unknown>(`${this.base}/class-subjects/${id}`)
      .pipe(map((r) => unwrapEnvelope<ClassSubject>(r)));
  }

  /** Ouvre un cours unitaire (hors ouverture en masse depuis le programme). */
  createClassSubject(dto: CreateClassSubjectDto): Observable<ClassSubject> {
    return this.http
      .post<unknown>(`${this.base}/class-subjects`, dto)
      .pipe(map((r) => unwrapEnvelope<ClassSubject>(r)));
  }

  /** Met à jour un cours (enseignant, volume horaire, salle…). */
  updateClassSubject(id: string, dto: UpdateClassSubjectDto): Observable<ClassSubject> {
    return this.http
      .put<unknown>(`${this.base}/class-subjects/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<ClassSubject>(r)));
  }

  /** Ferme / supprime un cours ouvert. */
  deleteClassSubject(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/class-subjects/${id}`);
  }

  /**
   * Copie matières + horaires d'une année scolaire vers une autre (rentrée).
   * ⚠️ Forme du DTO à confirmer côté backend avant usage en production.
   */
  copyVersion(dto: CopyVersionDto): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/copy-version`, dto);
  }
}
