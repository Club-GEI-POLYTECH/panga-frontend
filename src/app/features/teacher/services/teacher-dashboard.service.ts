import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { unwrapEnvelope } from '../../../core/http/api.util';

/** KPI prêt à afficher renvoyé par `/dashboard/me`. */
export interface DashboardKpi {
  id: string;
  title: string;
  value: number | string;
  icon?: string;
  color?: string;
}

/** Une note récente (forme tolérante — best-effort). */
export interface RecentGrade {
  studentName?: string;
  subjectName?: string;
  score?: number | string;
  maxScore?: number | string;
  term?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/** Réponse de `GET /dashboard/me` (vue enseignant). */
export interface TeacherDashboard {
  ui?: {
    header?: { title?: string; subtitle?: string; refreshedAt?: string };
    kpis?: DashboardKpi[];
    sections?: { recentGrades?: RecentGrade[] };
  };
  raw?: {
    classes?: number;
    students?: number;
    pendingGrades?: number;
    recentGrades?: RecentGrade[];
  };
}

/** `GET /dashboard/stats/academic`. */
export interface AcademicStats {
  totalGrades?: number;
  publishedGrades?: number;
  averagePercentage?: number;
}

@Injectable({ providedIn: 'root' })
export class TeacherDashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Tableau de bord enseignant (render-ready + `raw`). */
  me(): Observable<TeacherDashboard> {
    return this.http
      .get<unknown>(`${this.base}/dashboard/me`)
      .pipe(map((r) => unwrapEnvelope<TeacherDashboard>(r)));
  }

  /** Statistiques académiques (notes saisies / publiées / moyenne). */
  academicStats(): Observable<AcademicStats> {
    return this.http
      .get<unknown>(`${this.base}/dashboard/stats/academic`)
      .pipe(map((r) => unwrapEnvelope<AcademicStats>(r)));
  }
}
