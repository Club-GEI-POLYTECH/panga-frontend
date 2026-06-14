import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';

/** Propage la langue active (x-lang) pour des messages serveur traduits. */
export const langInterceptor: HttpInterceptorFn = (req, next) => {
  const transloco = inject(TranslocoService);
  const lang = transloco.getActiveLang() || environment.defaultLang;
  return next(req.clone({ setHeaders: { [environment.langHeader]: lang } }));
};
