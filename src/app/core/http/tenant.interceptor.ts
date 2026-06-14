import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TenantService } from '../tenant/tenant.service';

/**
 * Injecte le contexte école active (x-school-id / x-tenant-id).
 * Essentiel pour le cloisonnement multi-tenant (parents multi-écoles).
 */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const tenant = inject(TenantService);
  const schoolId = tenant.activeSchoolId();
  if (!schoolId) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: {
        [environment.schoolHeader]: schoolId,
        [environment.tenantHeader]: schoolId,
      },
    }),
  );
};
