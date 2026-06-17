import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../core/auth/auth.store';
import { AdminDashboard } from '../features/admin/admin-dashboard/admin-dashboard';
import { StudentDashboard } from '../features/student/student-dashboard/student-dashboard';
import { KpiCard } from '../shared/ui/kpi-card';
import type { Role } from '../core/models/auth.models';

interface Kpi {
  label: string;
  value: string;
  icon: string;
  trend?: number;
  trendLabel?: string;
}

/** KPIs de démonstration par rôle (à brancher sur l'API reports en P5). */
const KPIS: Record<Role, Kpi[]> = {
  super_admin: [
    { label: 'Écoles actives', value: '—', icon: 'apartment' },
    { label: 'Abonnements', value: '—', icon: 'workspace_premium' },
    { label: 'Santé système', value: 'OK', icon: 'monitor_heart' },
    { label: 'Utilisateurs', value: '—', icon: 'group' },
  ],
  admin: [
    { label: 'Effectif élèves', value: '—', icon: 'school' },
    { label: 'Taux de présence', value: '—', icon: 'fact_check' },
    { label: 'Impayés', value: '—', icon: 'payments' },
    { label: 'Incidents (30j)', value: '—', icon: 'gavel' },
  ],
  teacher: [
    { label: 'Mes classes', value: '—', icon: 'meeting_room' },
    { label: 'Notes à saisir', value: '—', icon: 'grade' },
    { label: 'Présence du jour', value: '—', icon: 'fact_check' },
    { label: 'Bulletins', value: '—', icon: 'description' },
  ],
  parent: [
    { label: 'Enfants', value: '—', icon: 'family_restroom' },
    { label: 'Moyenne', value: '—', icon: 'grade' },
    { label: 'Absences', value: '—', icon: 'event_busy' },
    { label: 'Échéances', value: '—', icon: 'payments' },
  ],
  student: [
    { label: 'Moyenne générale', value: '—', icon: 'grade' },
    { label: 'Présence', value: '—', icon: 'fact_check' },
    { label: 'Bulletins', value: '—', icon: 'description' },
    { label: 'Cours du jour', value: '—', icon: 'calendar_today' },
  ],
};

@Component({
  selector: 'panga-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, AdminDashboard, StudentDashboard, KpiCard],
  template: `
    @if (store.role() === 'admin') {
      @defer {
        <panga-admin-dashboard />
      } @placeholder {
        <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
      }
    } @else if (store.role() === 'student') {
      @defer {
        <panga-student-dashboard />
      } @placeholder {
        <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
      }
    } @else if (store.role() !== 'super_admin') {
      <header class="rounded-3xl p-6 mb-6 text-white" style="background: var(--brand-gradient)">
        <p class="text-sm opacity-90">Bonjour,</p>
        <h1 class="text-2xl font-semibold">{{ store.fullName() }}</h1>
        <p class="text-sm opacity-90 mt-1">{{ roleLabel() }}</p>
      </header>

      <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        @for (kpi of kpis(); track kpi.label) {
          <panga-kpi-card
            [label]="kpi.label"
            [value]="kpi.value"
            [icon]="kpi.icon"
            [trend]="kpi.trend ?? null"
            [trendLabel]="kpi.trendLabel ?? ''"
          />
        }
      </section>
    }
  `,
})
export class Dashboard {
  protected readonly store = inject(AuthStore);

  constructor() {
    // Le super_admin dispose d'un vrai tableau de bord plateforme (KPIs, courbes,
    // business SaaS) : on l'y redirige plutôt que d'afficher les KPIs de démo.
    if (this.store.role() === 'super_admin') {
      inject(Router).navigateByUrl('/platform/overview', { replaceUrl: true });
    }
  }

  protected readonly kpis = computed<Kpi[]>(() => {
    const role = this.store.role();
    return role ? KPIS[role] : [];
  });

  private readonly labels: Record<Role, string> = {
    super_admin: 'Super administrateur',
    admin: 'Administrateur école',
    teacher: 'Enseignant',
    parent: 'Parent',
    student: 'Élève',
  };

  protected readonly roleLabel = computed(() => {
    const role = this.store.role();
    return role ? this.labels[role] : '';
  });
}
