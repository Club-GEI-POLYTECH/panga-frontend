import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';

function withToken<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Ajoute le Bearer token aux appels API. Sur 401, tente un refresh (rotation)
 * puis rejoue la requête ; en cas d'échec, déconnexion + retour au login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApi = req.url.startsWith(environment.apiBaseUrl);
  const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  const token = tokens.accessToken();
  const authReq = isApi && token ? withToken(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isApi && !isAuthCall) {
        // Sans refresh token, la session est morte : déconnexion directe sans
        // appeler /refresh (qui échouerait en 400 sur un body vide).
        if (!tokens.getRefreshToken()) {
          auth.logout();
          void router.navigate(['/auth/login']);
          return throwError(() => err);
        }
        return auth.refreshAccessToken().pipe(
          switchMap((newToken) => next(withToken(req, newToken))),
          catchError((refreshErr) => {
            auth.logout();
            void router.navigate(['/auth/login']);
            return throwError(() => refreshErr);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
