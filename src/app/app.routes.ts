import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { schoolContextGuard } from './core/guards/school-context.guard';
import { MainShell } from './layout/main-shell';
import { Dashboard } from './dashboards/dashboard';
import { PlaceholderPage } from './shared/ui/placeholder-page';
import { NAV_ITEMS } from './layout/nav.config';

/** Titres FR des modules en attente d'implémentation (P1+). */
const MODULE_TITLES: Record<string, string> = {
  students: 'Élèves',
  teachers: 'Enseignants',
  parents: 'Parents',
  classes: 'Classes',
  grades: 'Notes',
  bulletins: 'Bulletins',
  attendance: 'Présences',
  payments: 'Paiements',
  discipline: 'Discipline',
  reports: 'Rapports',
  communications: 'Communications',
};

/**
 * Génère une route placeholder par module non implémenté, protégée par rôle.
 * Les chemins `platform/*` (super_admin) ont de vraies pages : on les exclut.
 */
const moduleRoutes: Routes = NAV_ITEMS.filter(
  (i) => i.path !== 'dashboard' && !i.path.startsWith('platform/'),
).map((i) => ({
  path: i.path,
  component: PlaceholderPage,
  canActivate: [roleGuard(...i.roles)],
  data: { title: MODULE_TITLES[i.path] ?? i.path },
}));

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'select-school',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/select-school').then((m) => m.SelectSchool),
  },
  {
    path: '',
    component: MainShell,
    canActivate: [authGuard, schoolContextGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'platform',
        canActivate: [roleGuard('super_admin')],
        loadChildren: () =>
          import('./features/super-admin/super-admin.routes').then((m) => m.SUPER_ADMIN_ROUTES),
      },
      ...moduleRoutes,
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
