import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError, ApiErrorBody, ErrorCode } from '../models/api.models';
import { NotificationService } from '../../shared/ui/notification.service';

/** Codes dont l'UX est gérée localement (pas de toast global). */
const SILENT_CODES = new Set<string>([ErrorCode.VALIDATION_ERROR]);

function extractError(err: HttpErrorResponse): ApiError | null {
  const body = err.error as ApiErrorBody | undefined;
  if (body && body.success === false && body.error) {
    return body.error;
  }
  return null;
}

/**
 * Mappe l'enveloppe d'erreur backend `{ success:false, error:{code,message} }`
 * vers des toasts. Les erreurs de validation sont laissées aux formulaires.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const apiError = extractError(err);
      const code = apiError?.code;

      // Erreurs réseau (status 0) — backend injoignable / hors-ligne.
      if (err.status === 0) {
        notify.error('Connexion au serveur impossible. Vérifiez votre réseau.');
        return throwError(() => err);
      }

      if (code && SILENT_CODES.has(code)) {
        return throwError(() => err);
      }

      // Les messages backend sont déjà traduits (FR/EN) — on les affiche.
      if (apiError) {
        notify.error(apiError.message);
      } else if (err.status >= 500) {
        notify.error('Une erreur serveur est survenue. Réessayez plus tard.');
      } else if (err.status !== 401) {
        notify.error('Une erreur est survenue.');
      }

      return throwError(() => err);
    }),
  );
};
