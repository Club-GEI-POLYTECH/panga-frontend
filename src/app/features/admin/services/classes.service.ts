import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  ClassInstance,
  ClassScheduleSlot,
  ClassTemplate,
  CreateClassDto,
  CreateClassInstanceDto,
  CreateClassTemplateDto,
  CreateSchoolOptionDto,
  CreateSchoolSubOptionDto,
  PromoteStudentsDto,
  SchoolOption,
  SchoolSubOption,
} from '../models/admin.models';

interface ClassFilter {
  schoolYear?: string;
  educationLevel?: string;
  classSchedule?: string;
}

/** Classes : modèles, instances, emploi du temps, options, promotions. */
@Injectable({ providedIn: 'root' })
export class ClassesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/classes`;

  /* ------------------------------- Instances -------------------------------- */

  list(
    schoolYear: string,
    filter: Omit<ClassFilter, 'schoolYear'> = {},
  ): Observable<ListResult<ClassInstance>> {
    return this.http
      .get<unknown>(this.base, { params: toHttpParams({ schoolYear, ...filter }) })
      .pipe(map((r) => unwrapList<ClassInstance>(r)));
  }

  get(id: string): Observable<ClassInstance> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map((r) => unwrapEnvelope<ClassInstance>(r)));
  }

  statistics(id: string): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.base}/${id}/statistics`)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  /** Création combinée (modèle + instance). */
  createCombined(dto: CreateClassDto): Observable<ClassInstance> {
    return this.http
      .post<unknown>(this.base, dto)
      .pipe(map((r) => unwrapEnvelope<ClassInstance>(r)));
  }

  update(id: string, dto: Record<string, unknown>): Observable<ClassInstance> {
    return this.http
      .put<unknown>(`${this.base}/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<ClassInstance>(r)));
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/${id}`);
  }

  updatePhysicalEquipment(id: string, payload: Record<string, unknown>): Observable<ClassInstance> {
    return this.http
      .put<unknown>(`${this.base}/${id}/physical-equipment`, payload)
      .pipe(map((r) => unwrapEnvelope<ClassInstance>(r)));
  }

  /* ------------------------------- Templates -------------------------------- */

  listTemplates(): Observable<ListResult<ClassTemplate>> {
    return this.http
      .get<unknown>(`${this.base}/templates`)
      .pipe(map((r) => unwrapList<ClassTemplate>(r)));
  }

  createTemplate(dto: CreateClassTemplateDto): Observable<ClassTemplate> {
    return this.http
      .post<unknown>(`${this.base}/templates`, dto)
      .pipe(map((r) => unwrapEnvelope<ClassTemplate>(r)));
  }

  createInstance(dto: CreateClassInstanceDto): Observable<ClassInstance> {
    return this.http
      .post<unknown>(`${this.base}/instances`, dto)
      .pipe(map((r) => unwrapEnvelope<ClassInstance>(r)));
  }

  /* ---------------------------- Emploi du temps ----------------------------- */

  scheduleSlots(instanceId: string): Observable<ClassScheduleSlot[]> {
    return this.http
      .get<unknown>(`${this.base}/instances/${instanceId}/schedule-slots`)
      .pipe(map((r) => extractArray<ClassScheduleSlot>(unwrapEnvelope(r))));
  }

  replaceScheduleSlots(
    instanceId: string,
    slots: ClassScheduleSlot[],
  ): Observable<ClassScheduleSlot[]> {
    return this.http
      .put<unknown>(`${this.base}/instances/${instanceId}/schedule-slots`, { slots })
      .pipe(map((r) => extractArray<ClassScheduleSlot>(unwrapEnvelope(r))));
  }

  /* ------------------------------- Options ---------------------------------- */

  options(): Observable<ListResult<SchoolOption>> {
    return this.http
      .get<unknown>(`${this.base}/options`)
      .pipe(map((r) => unwrapList<SchoolOption>(r)));
  }

  createOption(dto: CreateSchoolOptionDto): Observable<SchoolOption> {
    return this.http
      .post<unknown>(`${this.base}/options`, dto)
      .pipe(map((r) => unwrapEnvelope<SchoolOption>(r)));
  }

  updateOption(id: string, dto: Partial<CreateSchoolOptionDto>): Observable<SchoolOption> {
    return this.http
      .put<unknown>(`${this.base}/options/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<SchoolOption>(r)));
  }

  removeOption(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/options/${id}`);
  }

  subOptions(optionId?: string): Observable<ListResult<SchoolSubOption>> {
    return this.http
      .get<unknown>(`${this.base}/sub-options`, { params: toHttpParams({ optionId }) })
      .pipe(map((r) => unwrapList<SchoolSubOption>(r)));
  }

  createSubOption(dto: CreateSchoolSubOptionDto): Observable<SchoolSubOption> {
    return this.http
      .post<unknown>(`${this.base}/sub-options`, dto)
      .pipe(map((r) => unwrapEnvelope<SchoolSubOption>(r)));
  }

  removeSubOption(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/sub-options/${id}`);
  }

  /* ------------------------------ Promotions -------------------------------- */

  promote(instanceId: string, dto: PromoteStudentsDto): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/${instanceId}/promote`, dto);
  }

  promotionHistory(instanceId: string): Observable<unknown> {
    return this.http
      .get<unknown>(`${this.base}/${instanceId}/promotion-history`)
      .pipe(map((r) => unwrapEnvelope(r)));
  }
}

function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === 'object') {
    const arr =
      (data as Record<string, unknown>)['slots'] ?? (data as Record<string, unknown>)['data'];
    if (Array.isArray(arr)) {
      return arr as T[];
    }
  }
  return [];
}
