import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { toHttpParams, unwrapEnvelope } from '../../../core/http/api.util';
import type { StatBlock } from '../models/platform.models';

/** Dashboard plateforme (dossier « 1 — Dashboard plateforme »). */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private get$(path: string): Observable<StatBlock> {
    return this.http
      .get<unknown>(`${this.base}${path}`)
      .pipe(map((r) => unwrapEnvelope<StatBlock>(r)));
  }

  /** Dashboard du rôle connecté. Scopé année (omis = courante, `'all'` = historique). */
  myDashboard(schoolYear?: string): Observable<StatBlock> {
    return this.http
      .get<unknown>(`${this.base}/dashboard/me`, { params: toHttpParams({ schoolYear }) })
      .pipe(map((r) => unwrapEnvelope<StatBlock>(r)));
  }

  /**
   * Vue d'ensemble. Partiellement scopée à l'année (comptes de classes) :
   * `schoolYear` omis → année courante ; `'all'` → historique complet.
   */
  overview(schoolYear?: string): Observable<StatBlock> {
    return this.http
      .get<unknown>(`${this.base}/dashboard/overview`, { params: toHttpParams({ schoolYear }) })
      .pipe(map((r) => unwrapEnvelope<StatBlock>(r)));
  }

  /** Séries mensuelles pour les courbes (1 à 36 mois). Temporel, pas annuel. */
  trends(months = 12): Observable<StatBlock> {
    return this.http
      .get<unknown>(`${this.base}/dashboard/stats/trends`, { params: toHttpParams({ months }) })
      .pipe(map((r) => unwrapEnvelope<StatBlock>(r)));
  }
  schoolsMetrics(): Observable<StatBlock> {
    return this.get$('/schools/metrics');
  }
  studentsStats(): Observable<StatBlock> {
    return this.get$('/dashboard/stats/students');
  }
  teachersStats(): Observable<StatBlock> {
    return this.get$('/dashboard/stats/teachers');
  }

  /** Statistiques de notes — scopées à l'année (`grade.school_year`). */
  academicStats(schoolYear?: string): Observable<StatBlock> {
    return this.http
      .get<unknown>(`${this.base}/dashboard/stats/academic`, {
        params: toHttpParams({ schoolYear }),
      })
      .pipe(map((r) => unwrapEnvelope<StatBlock>(r)));
  }
  financialStats(): Observable<StatBlock> {
    return this.get$('/dashboard/stats/financial');
  }
}
