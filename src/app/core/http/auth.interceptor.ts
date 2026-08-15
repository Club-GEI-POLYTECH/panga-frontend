import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';
import { ErrorCode } from '../models/api.models';
import { extractApiError } from './api.util';

function withToken<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Un token invalide/expiré : status 401 classique, mais certains guards le
 * renvoient encapsulé dans un 403 avec `code: UNAUTHORIZED` (à distinguer du
 * 403 RBAC `FORBIDDEN` — session valide mais permission manquante, géré par
 * `errorInterceptor` sans déconnexion).
 */
function isInvalidToken(err: HttpErrorResponse): boolean {
  if (err.status === 401) {
    return true;
  }
  return err.status === 403 && extractApiError(err)?.code === ErrorCode.UNAUTHORIZED;
}

/**
 * Ajoute le Bearer token aux appels API. Sur token invalide, tente un refresh
 * (rotation) puis rejoue la requête ; en cas d'échec, déconnexion + retour au
 * login — `replaceUrl` efface l'entrée d'historique de la page protégée pour
 * qu'un retour arrière n'y ramène pas (le guard la bloquerait de toute façon,
 * mais on évite l'aller-retour visuel).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApi = req.url.startsWith(environment.apiBaseUrl);
  const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  const token = tokens.accessToken();
  const authReq = isApi && token ? withToken(req, token) : req;

  const forceLogout = (): void => {
    auth.logout().subscribe();
    void router.navigateByUrl('/auth/login', { replaceUrl: true });
  };

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (isInvalidToken(err) && isApi && !isAuthCall) {
        // Sans refresh token, la session est morte : déconnexion directe sans
        // appeler /refresh (qui échouerait en 400 sur un body vide).
        if (!tokens.getRefreshToken()) {
          forceLogout();
          return throwError(() => err);
        }
        return auth.refreshAccessToken().pipe(
          switchMap((newToken) => next(withToken(req, newToken))),
          catchError((refreshErr) => {
            forceLogout();
            return throwError(() => refreshErr);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
