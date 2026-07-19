import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoadingService } from './loading.service';

/** Passez `context: new HttpContext().set(SKIP_LOADING, true)` pour ignorer. */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

/** Pilote l'indicateur de chargement global (barre de progression top). */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // On ne suit que les appels API. Les assets statiques (ex. traductions transloco
  // `/i18n/*.json`) peuvent être chargés en pleine change detection ; démarrer le
  // compteur `inFlight` (write signal) pendant le render lèverait NG0600.
  if (req.context.get(SKIP_LOADING) || !req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};
