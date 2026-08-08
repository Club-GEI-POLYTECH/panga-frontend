import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';

/* --------------------------------- Modèles -------------------------------- */

export interface BehaviorIncident {
  id: string;
  studentId?: string;
  studentName?: string;
  incidentType?: string;
  severity?: string;
  incidentStatus?: string;
  description?: string;
  incidentDate?: string;
  [key: string]: unknown;
}

export interface DisciplinaryAction {
  id: string;
  studentId?: string;
  studentName?: string;
  actionType?: string;
  status?: string;
  reason?: string;
  description?: string;
  isAutomatic?: boolean;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface Reward {
  id: string;
  studentId?: string;
  studentName?: string;
  rewardType?: string;
  level?: string;
  title?: string;
  description?: string;
  pointsAwarded?: number;
  awardDate?: string;
  [key: string]: unknown;
}

export interface MeetingParticipant {
  userId: string;
  name: string;
  role: string;
}

export interface DisciplinaryMeeting {
  id: string;
  studentId?: string;
  studentName?: string;
  meetingType?: string;
  status?: string;
  meetingDate?: string;
  meetingTime?: string;
  subject?: string;
  agenda?: string;
  participants?: MeetingParticipant[];
  [key: string]: unknown;
}

/** Catalogue de sanctions de l'école (paramétrage, pas une donnée élève). */
export interface Sanction {
  id: string;
  name?: string;
  level?: string;
  category?: string;
  actionType?: string;
  description?: string;
  [key: string]: unknown;
}

/** Rapport de comportement agrégé d'un élève (§1.4). */
export interface BehaviorReport {
  studentId?: string;
  schoolYear?: string;
  summary?: {
    totalIncidents?: number;
    totalActions?: number;
    totalRewards?: number;
    positivePoints?: number;
    negativePoints?: number;
    netPoints?: number;
    [key: string]: unknown;
  };
  incidentsBySeverity?: Record<string, number>;
  actionsByType?: Record<string, number>;
  rewards?: Reward[];
  [key: string]: unknown;
}

interface Filter {
  studentId?: string;
  classId?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

/**
 * Module Discipline (`/discipline`). Le cloisonnement par rôle (enseignant → ses
 * classes, parent → ses enfants, élève → lui-même) est appliqué **côté backend** ;
 * le front consomme les mêmes routes et masque simplement les actions d'écriture.
 */
@Injectable({ providedIn: 'root' })
export class DisciplineService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/discipline`;

  /* ------------------------------- Incidents ------------------------------ */
  incidents(filter: Filter = {}): Observable<ListResult<BehaviorIncident>> {
    return this.http
      .get<unknown>(`${this.base}/incidents`, { params: toHttpParams(filter) })
      .pipe(map((r) => unwrapList<BehaviorIncident>(r)));
  }
  createIncident(dto: Record<string, unknown>): Observable<BehaviorIncident> {
    return this.http
      .post<unknown>(`${this.base}/incidents`, dto)
      .pipe(map((r) => unwrapEnvelope<BehaviorIncident>(r)));
  }
  updateIncident(id: string, dto: Record<string, unknown>): Observable<BehaviorIncident> {
    return this.http
      .patch<unknown>(`${this.base}/incidents/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<BehaviorIncident>(r)));
  }
  deleteIncident(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/incidents/${id}`);
  }

  /* -------------------------------- Actions ------------------------------- */
  actions(filter: Filter = {}): Observable<ListResult<DisciplinaryAction>> {
    return this.http
      .get<unknown>(`${this.base}/actions`, { params: toHttpParams(filter) })
      .pipe(map((r) => unwrapList<DisciplinaryAction>(r)));
  }
  createAction(dto: Record<string, unknown>): Observable<DisciplinaryAction> {
    return this.http
      .post<unknown>(`${this.base}/actions`, dto)
      .pipe(map((r) => unwrapEnvelope<DisciplinaryAction>(r)));
  }
  completeAction(id: string): Observable<DisciplinaryAction> {
    return this.http
      .post<unknown>(`${this.base}/actions/${id}/complete`, {})
      .pipe(map((r) => unwrapEnvelope<DisciplinaryAction>(r)));
  }
  updateAction(id: string, dto: Record<string, unknown>): Observable<DisciplinaryAction> {
    return this.http
      .patch<unknown>(`${this.base}/actions/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<DisciplinaryAction>(r)));
  }
  deleteAction(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/actions/${id}`);
  }

  /* ------------------------------ Récompenses ----------------------------- */
  rewards(filter: Filter = {}): Observable<ListResult<Reward>> {
    return this.http
      .get<unknown>(`${this.base}/rewards`, { params: toHttpParams(filter) })
      .pipe(map((r) => unwrapList<Reward>(r)));
  }
  createReward(dto: Record<string, unknown>): Observable<Reward> {
    return this.http
      .post<unknown>(`${this.base}/rewards`, dto)
      .pipe(map((r) => unwrapEnvelope<Reward>(r)));
  }
  deleteReward(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/rewards/${id}`);
  }

  /* ------------------------------- Réunions ------------------------------- */
  meetings(filter: Filter = {}): Observable<ListResult<DisciplinaryMeeting>> {
    return this.http
      .get<unknown>(`${this.base}/meetings`, { params: toHttpParams(filter) })
      .pipe(map((r) => unwrapList<DisciplinaryMeeting>(r)));
  }
  createMeeting(dto: Record<string, unknown>): Observable<DisciplinaryMeeting> {
    return this.http
      .post<unknown>(`${this.base}/meetings`, dto)
      .pipe(map((r) => unwrapEnvelope<DisciplinaryMeeting>(r)));
  }
  updateMeeting(id: string, dto: Record<string, unknown>): Observable<DisciplinaryMeeting> {
    return this.http
      .patch<unknown>(`${this.base}/meetings/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<DisciplinaryMeeting>(r)));
  }

  /* ---------------------------- Sanctions (catalogue) --------------------- */
  sanctions(): Observable<ListResult<Sanction>> {
    return this.http
      .get<unknown>(`${this.base}/sanctions`)
      .pipe(map((r) => unwrapList<Sanction>(r)));
  }
  createSanction(dto: Record<string, unknown>): Observable<Sanction> {
    return this.http
      .post<unknown>(`${this.base}/sanctions`, dto)
      .pipe(map((r) => unwrapEnvelope<Sanction>(r)));
  }
  deleteSanction(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/sanctions/${id}`);
  }

  /* ---------------------------- Rapport élève ----------------------------- */
  studentReport(studentId: string, schoolYear?: string): Observable<BehaviorReport> {
    return this.http
      .get<unknown>(`${this.base}/students/${studentId}/report`, {
        params: toHttpParams({ schoolYear }),
      })
      .pipe(map((r) => unwrapEnvelope<BehaviorReport>(r)));
  }
}
