import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from './loading.service';

/** Passez `context: new HttpContext().set(SKIP_LOADING, true)` pour ignorer. */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

/** Pilote l'indicateur de chargement global (barre de progression top). */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADING)) {
    return next(req);
  }
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};
