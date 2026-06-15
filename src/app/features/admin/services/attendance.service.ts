import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { toHttpParams, unwrapEnvelope } from '../../../core/http/api.util';
import type { AttendanceEntry, MarkAttendanceDto } from '../models/admin.models';

/** Présences (dossier « 8 »). */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Feuille du jour : la forme exacte varie, on remonte la liste d'entrées. */
  dailySheet(classInstanceId: string, date: string): Observable<AttendanceEntry[]> {
    return this.http
      .get<unknown>(`${this.base}/attendance/daily-sheet`, {
        params: toHttpParams({ classInstanceId, date }),
      })
      .pipe(map((r) => extractEntries(unwrapEnvelope(r))));
  }

  mark(dto: MarkAttendanceDto): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/attendance`, dto);
  }
}

function extractEntries(data: unknown): AttendanceEntry[] {
  if (Array.isArray(data)) {
    return data as AttendanceEntry[];
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const arr = obj['entries'] ?? obj['students'] ?? obj['rows'] ?? obj['data'] ?? obj['sheet'];
    if (Array.isArray(arr)) {
      return arr as AttendanceEntry[];
    }
  }
  return [];
}
