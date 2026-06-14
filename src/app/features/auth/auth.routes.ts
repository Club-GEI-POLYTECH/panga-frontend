import { Routes } from '@angular/router';
import { Login } from './login';
import { ForgotPassword } from './forgot-password';
import { ResetPassword } from './reset-password';

/** Routes publiques du domaine auth (chargées en lazy). */
export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
];
