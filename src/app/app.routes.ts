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

/** Modules admin déjà implémentés (vraies pages, hors générateur de placeholders). */
const IMPLEMENTED = new Set([
  'my-school',
  'students',
  'teachers',
  'parents',
  'classes',
  'payments',
  'communications',
  'grades',
  'bulletins',
]);

/**
 * Génère une route placeholder par module non implémenté, protégée par rôle.
 * Les chemins `platform/*` et les modules implémentés ont de vraies pages.
 */
const moduleRoutes: Routes = NAV_ITEMS.filter(
  (i) => i.path !== 'dashboard' && !i.path.startsWith('platform/') && !IMPLEMENTED.has(i.path),
).map((i) => ({
  path: i.path,
  component: PlaceholderPage,
  canActivate: [roleGuard(...i.roles)],
  data: { title: MODULE_TITLES[i.path] ?? i.path },
}));

/** Vraies pages admin (chargées à la demande). */
const adminRoutes: Routes = [
  {
    path: 'my-school',
    canActivate: [roleGuard('admin')],
    loadComponent: () => import('./features/admin/school/my-school').then((m) => m.MySchool),
  },
  {
    path: 'students',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./features/admin/students/students-list').then((m) => m.StudentsList),
  },
  {
    path: 'teachers',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./features/admin/teachers/teachers-list').then((m) => m.TeachersList),
  },
  {
    path: 'parents',
    canActivate: [roleGuard('admin')],
    loadComponent: () => import('./features/admin/parents/parents-list').then((m) => m.ParentsList),
  },
  {
    path: 'classes',
    canActivate: [roleGuard('admin', 'teacher')],
    loadComponent: () => import('./features/admin/classes/classes-list').then((m) => m.ClassesList),
  },
  {
    path: 'payments',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./features/admin/payments/payments-list').then((m) => m.PaymentsList),
  },
  {
    path: 'grades',
    canActivate: [roleGuard('admin', 'teacher')],
    loadComponent: () => import('./features/admin/grades/grades-list').then((m) => m.GradesList),
  },
  {
    path: 'bulletins',
    canActivate: [roleGuard('admin', 'teacher')],
    loadComponent: () =>
      import('./features/admin/bulletins/bulletins-list').then((m) => m.BulletinsList),
  },
  {
    // Accessible à tous les rôles authentifiés (la création est filtrée côté UI/back).
    path: 'communications',
    loadComponent: () =>
      import('./features/admin/communications/communications').then((m) => m.Communications),
  },
];

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
      ...adminRoutes,
      ...moduleRoutes,
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
