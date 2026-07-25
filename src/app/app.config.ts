import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco } from '@jsverse/transloco';
import { provideEchartsCore } from 'ngx-echarts';
import { catchError, firstValueFrom, of } from 'rxjs';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { AuthService } from './core/auth/auth.service';
import { loadingInterceptor } from './core/http/loading.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { langInterceptor } from './core/http/lang.interceptor';
import { tenantInterceptor } from './core/http/tenant.interceptor';
import { authInterceptor } from './core/http/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),

    // Ordre : requête haut→bas, réponse bas→haut.
    // auth (401 → refresh) au plus près du backend ; error/loading englobants.
    provideHttpClient(
      withInterceptors([
        loadingInterceptor,
        errorInterceptor,
        langInterceptor,
        tenantInterceptor,
        authInterceptor,
      ]),
    ),

    provideAnimationsAsync(),

    // Calendrier Material (panga-date-field) — affichage/saisie au format FR.
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },

    // Graphiques ECharts (chargés à la demande).
    provideEchartsCore({ echarts: () => import('echarts') }),

    provideTransloco({
      config: {
        availableLangs: [...environment.availableLangs],
        defaultLang: environment.defaultLang,
        fallbackLang: environment.defaultLang,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),

    // Restauration de session au démarrage (refresh silencieux si possible).
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return firstValueFrom(auth.bootstrapSession().pipe(catchError(() => of(false))));
    }),

    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
