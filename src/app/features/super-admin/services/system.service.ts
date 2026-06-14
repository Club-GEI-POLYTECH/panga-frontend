import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { HealthStatus } from '../models/platform.models';

/**
 * Santé système. Les endpoints `/health` et `/metrics` sont exposés à la racine
 * (hors `/v1`) ; le proxy de dev les redirige vers le backend.
 */
@Injectable({ providedIn: 'root' })
export class SystemService {
  private readonly http = inject(HttpClient);

  health(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>('/health');
  }

  ready(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>('/health/ready');
  }
}
