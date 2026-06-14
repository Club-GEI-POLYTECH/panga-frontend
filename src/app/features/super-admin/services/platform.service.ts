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

  myDashboard(): Observable<StatBlock> {
    return this.get$('/dashboard/me');
  }
  overview(): Observable<StatBlock> {
    return this.get$('/dashboard/overview');
  }

  /** Séries mensuelles pour les courbes (1 à 36 mois). */
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
  academicStats(): Observable<StatBlock> {
    return this.get$('/dashboard/stats/academic');
  }
  financialStats(): Observable<StatBlock> {
    return this.get$('/dashboard/stats/financial');
  }
}
