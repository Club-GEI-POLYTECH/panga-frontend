import { Routes } from '@angular/router';

/** Routes super_admin (chargées sous le préfixe `platform`, voir app.routes). */
export const SUPER_ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  {
    path: 'overview',
    loadComponent: () =>
      import('./platform-overview/platform-overview').then((m) => m.PlatformOverview),
  },
  {
    path: 'schools',
    loadComponent: () => import('./schools/schools-list').then((m) => m.SchoolsList),
  },
  {
    path: 'schools/:id',
    loadComponent: () => import('./schools/school-detail').then((m) => m.SchoolDetail),
  },
  {
    path: 'users',
    loadComponent: () => import('./users/users-list').then((m) => m.UsersList),
  },
  {
    path: 'billing',
    loadComponent: () => import('./billing/billing').then((m) => m.Billing),
  },
  {
    path: 'curriculum',
    loadComponent: () => import('./curriculum/curriculum').then((m) => m.Curriculum),
  },
];
