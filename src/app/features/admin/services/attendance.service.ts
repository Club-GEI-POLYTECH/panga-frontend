import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { toHttpParams, unwrapEnvelope } from '../../../core/http/api.util';
import type { ClassScheduleSlot } from '../models/admin.models';
import type {
  Attendance,
  ClassReportRow,
  DailySheet,
  ReviewJustificationDto,
  StudentAttendanceStats,
  SubmitJustificationDto,
  UpsertAttendanceDto,
} from '../models/attendance.models';

/** Présences : pointage journalier / par créneau, justifications, rapports. */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/attendance`;

  /** Feuille du jour : créneaux du jour ISO + lignes déjà saisies. */
  dailySheet(classInstanceId: string, date: string): Observable<DailySheet> {
    return this.http
      .get<unknown>(`${this.base}/daily-sheet`, {
        params: toHttpParams({ classInstanceId, date }),
      })
      .pipe(map((r) => mapDailySheet(unwrapEnvelope(r))));
  }

  /** Crée ou met à jour une ligne de présence (upsert). */
  upsert(dto: UpsertAttendanceDto): Observable<Attendance> {
    return this.http.post<unknown>(this.base, dto).pipe(map((r) => unwrapEnvelope<Attendance>(r)));
  }

  /** Soumettre une justification (multipart : motif + fichier PDF/image optionnel). */
  submitJustification(
    id: string,
    dto: SubmitJustificationDto,
    file?: File | null,
  ): Observable<Attendance> {
    const form = new FormData();
    form.append('excuseReason', dto.excuseReason);
    if (dto.isMedical) {
      form.append('isMedical', 'true');
    }
    if (file) {
      form.append('file', file);
    }
    return this.http
      .post<unknown>(`${this.base}/${id}/justification`, form)
      .pipe(map((r) => unwrapEnvelope<Attendance>(r)));
  }

  /** Approuver / rejeter une justification (admin). */
  reviewJustification(id: string, dto: ReviewJustificationDto): Observable<Attendance> {
    return this.http
      .patch<unknown>(`${this.base}/${id}/justification/review`, dto)
      .pipe(map((r) => unwrapEnvelope<Attendance>(r)));
  }

  /** Statistiques d'assiduité d'un élève (bornable from/to). */
  studentStats(
    studentId: string,
    range: { from?: string; to?: string } = {},
  ): Observable<StudentAttendanceStats> {
    return this.http
      .get<unknown>(`${this.base}/students/${studentId}/stats`, { params: toHttpParams(range) })
      .pipe(map((r) => unwrapEnvelope<StudentAttendanceStats>(r)));
  }

  /** Rapport d'absences par classe (une ligne par élève). */
  classReport(
    classInstanceId: string,
    range: { from?: string; to?: string } = {},
  ): Observable<ClassReportRow[]> {
    return this.http
      .get<unknown>(`${this.base}/classes/${classInstanceId}/report`, {
        params: toHttpParams(range),
      })
      .pipe(map((r) => pickArray<ClassReportRow>(unwrapEnvelope(r))));
  }
}

/* -------------------------------------------------------------------------- */

function pickArray<T>(
  data: unknown,
  keys: string[] = ['rows', 'students', 'data', 'items', 'results'],
): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const k of keys) {
      if (Array.isArray(o[k])) {
        return o[k] as T[];
      }
    }
  }
  return [];
}

/** Normalise la feuille du jour quelle que soit la forme exacte. */
function mapDailySheet(data: unknown): DailySheet {
  if (Array.isArray(data)) {
    return { slots: [], entries: data as Attendance[] };
  }
  const o = (data ?? {}) as Record<string, unknown>;
  return {
    slots: pickArray<ClassScheduleSlot>(o['slots'] ?? o['scheduleSlots'] ?? o, [
      'slots',
      'scheduleSlots',
    ]),
    entries: pickArray<Attendance>(o['entries'] ?? o['attendances'] ?? o['records'] ?? o, [
      'entries',
      'attendances',
      'records',
      'rows',
    ]),
  };
}
