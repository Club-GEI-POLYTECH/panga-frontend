import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { permissionGuard } from './core/guards/permission.guard';
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
  'attendance',
  'course-journal',
  'promotions',
  'exams',
  'discipline',
  'reports',
  'settings',
  'ma-scolarite',
  'mes-paiements',
  'mes-notifications',
  'mes-services',
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
  // Gating par permission RBAC si l'entrée en a une, sinon repli sur le rôle.
  canActivate: [i.permission ? permissionGuard(i.permission) : roleGuard(...i.roles)],
  data: { title: MODULE_TITLES[i.path] ?? i.path },
}));

/** Vraies pages admin (chargées à la demande). */
const adminRoutes: Routes = [
  {
    // `/schools/my-school` est ouverte à tout authentifié ; l'enseignant y accède
    // en lecture seule (l'édition est gatée dans le composant via `schools.update`).
    path: 'my-school',
    canActivate: [roleGuard('admin', 'teacher')],
    loadComponent: () => import('./features/admin/school/my-school').then((m) => m.MySchool),
  },
  {
    path: 'students',
    canActivate: [permissionGuard('students.read')],
    loadComponent: () =>
      import('./features/admin/students/students-list').then((m) => m.StudentsList),
  },
  {
    path: 'students/:id',
    canActivate: [permissionGuard('students.read')],
    loadComponent: () =>
      import('./features/admin/students/student-detail').then((m) => m.StudentDetail),
  },
  {
    path: 'teachers',
    canActivate: [permissionGuard('teachers.read')],
    loadComponent: () =>
      import('./features/admin/teachers/teachers-list').then((m) => m.TeachersList),
  },
  {
    path: 'teachers/:id',
    canActivate: [permissionGuard('teachers.read')],
    loadComponent: () =>
      import('./features/admin/teachers/teacher-detail').then((m) => m.TeacherDetail),
  },
  {
    path: 'parents',
    canActivate: [permissionGuard('parents.read')],
    loadComponent: () => import('./features/admin/parents/parents-list').then((m) => m.ParentsList),
  },
  {
    path: 'parents/:id',
    canActivate: [permissionGuard('parents.read')],
    loadComponent: () =>
      import('./features/admin/parents/parent-detail').then((m) => m.ParentDetail),
  },
  {
    path: 'classes',
    canActivate: [permissionGuard('classes.read')],
    loadComponent: () => import('./features/admin/classes/classes-list').then((m) => m.ClassesList),
  },
  {
    path: 'class-options',
    canActivate: [permissionGuard('classes.read')],
    loadComponent: () =>
      import('./features/admin/classes/class-options').then((m) => m.ClassOptions),
  },
  {
    path: 'classes/:id',
    canActivate: [permissionGuard('classes.read')],
    loadComponent: () => import('./features/admin/classes/class-detail').then((m) => m.ClassDetail),
  },
  {
    path: 'payments',
    canActivate: [permissionGuard('payments.read')],
    loadComponent: () =>
      import('./features/admin/payments/payments-list').then((m) => m.PaymentsList),
  },
  {
    path: 'grades',
    canActivate: [permissionGuard('grades.read')],
    loadComponent: () => import('./features/admin/grades/grades-list').then((m) => m.GradesList),
  },
  {
    path: 'bulletins',
    canActivate: [permissionGuard('bulletins.read')],
    loadComponent: () =>
      import('./features/admin/bulletins/bulletins-list').then((m) => m.BulletinsList),
  },
  {
    path: 'attendance',
    canActivate: [permissionGuard('attendance.read')],
    loadComponent: () => import('./features/admin/attendance/attendance').then((m) => m.Attendance),
  },
  {
    path: 'exams',
    canActivate: [permissionGuard('exams.read')],
    loadComponent: () => import('./features/admin/exams/exams-list').then((m) => m.ExamsList),
  },
  {
    path: 'exams/:id',
    canActivate: [permissionGuard('exams.read')],
    loadComponent: () => import('./features/admin/exams/exam-detail').then((m) => m.ExamDetail),
  },
  {
    path: 'course-journal',
    canActivate: [permissionGuard('course-journal.read')],
    loadComponent: () =>
      import('./features/admin/course-journal/course-journal').then((m) => m.CourseJournal),
  },
  {
    path: 'promotions',
    canActivate: [permissionGuard('promotions.read')],
    loadComponent: () => import('./features/admin/promotions/promotions').then((m) => m.Promotions),
  },
  {
    path: 'discipline',
    canActivate: [permissionGuard('discipline.read')],
    loadComponent: () => import('./features/admin/discipline/discipline').then((m) => m.Discipline),
  },
  {
    path: 'reports',
    canActivate: [permissionGuard('reports.read')],
    loadComponent: () => import('./features/admin/reports/reports').then((m) => m.Reports),
  },
  {
    path: 'settings',
    canActivate: [permissionGuard('settings.read')],
    loadComponent: () =>
      import('./features/admin/settings/school-year-settings').then((m) => m.SchoolYearSettings),
  },
  {
    path: 'ma-scolarite',
    canActivate: [roleGuard('student')],
    loadComponent: () =>
      import('./features/student/scolarite/student-scolarite').then((m) => m.StudentScolarite),
  },
  {
    path: 'mes-paiements',
    canActivate: [roleGuard('student')],
    loadComponent: () =>
      import('./features/student/paiements/student-paiements').then((m) => m.StudentPaiements),
  },
  {
    path: 'mes-notifications',
    canActivate: [roleGuard('student')],
    loadComponent: () =>
      import('./features/student/notifications/student-notifications').then(
        (m) => m.StudentNotifications,
      ),
  },
  {
    path: 'mes-services',
    canActivate: [roleGuard('student')],
    loadComponent: () =>
      import('./features/student/services-hub/student-services').then((m) => m.StudentServices),
  },
  {
    // Emploi du temps en lecture seule (enseignant : ses cours ; parent : par enfant).
    path: 'emploi-du-temps',
    canActivate: [roleGuard('teacher', 'parent')],
    loadComponent: () => import('./features/schedule/schedule-view').then((m) => m.ScheduleView),
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
