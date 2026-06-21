import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { HealthStatus } from '../models/platform.models';

/**
 * Santé système. `/health` et `/metrics` sont exposés à la racine de l'API (hors
 * `/v1`). On dérive l'origine depuis `apiBaseUrl` pour viser le bon hôte :
 *  - dev  : '/v1' → '' → '/health' (proxifié vers le backend) ;
 *  - prod : 'https://api.panga-rdc.com/v1' → 'https://api.panga-rdc.com/health'.
 */
@Injectable({ providedIn: 'root' })
export class SystemService {
  private readonly http = inject(HttpClient);
  private readonly origin = environment.apiBaseUrl.replace(/\/v1\/?$/, '');

  health(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.origin}/health`);
  }

  ready(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.origin}/health/ready`);
  }
}
