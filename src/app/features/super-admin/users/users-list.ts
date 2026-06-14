import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PlatformUsersService } from '../services/platform-users.service';
import type { PlatformUser, StatBlock } from '../models/platform.models';
import { ROLES } from '../../../core/models/auth.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KeyValue } from '../../../shared/ui/key-value';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

const ROLE_TONE: Record<string, BadgeTone> = {
  super_admin: 'danger',
  admin: 'brand',
  teacher: 'info',
  parent: 'warning',
  student: 'success',
};

/** Comptes plateforme : liste, stats, filtre par rôle, création. */
@Component({
  selector: 'panga-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    Avatar,
    EmptyState,
    KeyValue,
    KpiCard,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1
          class="text-2xl font-semibold text-[var(--text)]"
          style="font-family: Poppins, sans-serif"
        >
          Utilisateurs
        </h1>
        <p class="text-sm text-[var(--text-muted)] mt-0.5">Comptes de toute la plateforme</p>
      </div>
      <button mat-flat-button class="!rounded-xl" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{
          showForm() ? 'close' : 'person_add'
        }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Créer un compte' }}
      </button>
    </header>

    <section class="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
      <panga-kpi-card label="Comptes" [value]="total()" icon="group" />
      <panga-kpi-card label="Affichés" [value]="users().length" icon="visibility" />
      <panga-kpi-card label="Administrateurs" [value]="adminCount()" icon="admin_panel_settings" />
      <panga-kpi-card label="Rôles" [value]="rolesShown()" icon="badge" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="register()" class="panga-card p-6 mb-6">
        <h2 class="text-base font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined text-[var(--brand-500)]">person_add</span>
          Nouveau compte
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <mat-form-field appearance="outline">
            <mat-label>Prénom</mat-label>
            <input matInput formControlName="firstName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput formControlName="lastName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>E-mail</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Mot de passe</mat-label>
            <input matInput type="password" formControlName="password" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Rôle</mat-label>
            <mat-select formControlName="role">
              @for (r of roles; track r) {
                <mat-option [value]="r">{{ r }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>School ID (si admin école)</mat-label>
            <input matInput formControlName="schoolId" />
          </mat-form-field>
        </div>
        <div class="flex justify-end">
          <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="submitting()">
            Créer le compte
          </button>
        </div>
      </form>
    }

    @if (stats()) {
      <div class="panga-card p-5 mb-6">
        <h2 class="text-base font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined text-[var(--brand-500)]">bar_chart</span>
          Statistiques
        </h2>
        <panga-key-value [data]="stats()" />
      </div>
    }

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <span class="text-sm text-[var(--text-muted)]">Filtrer par rôle :</span>
      <mat-button-toggle-group
        [value]="activeRole()"
        (change)="filterByRole($event.value)"
        class="!rounded-xl"
      >
        <mat-button-toggle value="">Tous</mat-button-toggle>
        @for (r of roles; track r) {
          <mat-button-toggle [value]="r">{{ r }}</mat-button-toggle>
        }
      </mat-button-toggle-group>
    </div>

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (users().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="group"
          title="Aucun utilisateur"
          description="Aucun compte pour ce filtre."
        />
      </div>
    } @else {
      <div class="panga-card divide-y divide-[var(--border)]">
        @for (u of users(); track u.id) {
          <div class="flex items-center gap-4 px-4 sm:px-5 py-3.5">
            <panga-avatar [name]="fullName(u)" [size]="44" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-[var(--text)] truncate">{{ fullName(u) || '—' }}</p>
              <p class="text-xs text-[var(--text-muted)] truncate">{{ u.email || '—' }}</p>
            </div>
            @if (u.schoolId) {
              <span
                class="hidden md:inline text-xs text-[var(--text-muted)] truncate max-w-[160px]"
              >
                {{ u.schoolId }}
              </span>
            }
            @if (u.role) {
              <panga-status-badge [label]="u.role" [tone]="roleTone(u.role)" />
            }
          </div>
        }
      </div>
    }
  `,
})
export class UsersList {
  private readonly usersApi = inject(PlatformUsersService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly roles = ROLES;
  protected readonly users = signal<PlatformUser[]>([]);
  protected readonly stats = signal<StatBlock | null>(null);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);
  protected readonly activeRole = signal('');

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['admin', Validators.required],
    schoolId: [''],
  });

  constructor() {
    this.loadAll();
    this.usersApi.stats().subscribe({ next: (s) => this.stats.set(s), error: () => undefined });
  }

  protected fullName(u: PlatformUser): string {
    return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  }

  protected roleTone(role: string): BadgeTone {
    return ROLE_TONE[role] ?? 'neutral';
  }

  protected adminCount(): number {
    return this.users().filter((u) => u.role === 'admin' || u.role === 'super_admin').length;
  }

  protected rolesShown(): number {
    return new Set(
      this.users()
        .map((u) => u.role)
        .filter(Boolean),
    ).size;
  }

  private loadAll(): void {
    this.loading.set(true);
    this.usersApi.list({ page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.users.set(res.items);
        this.total.set(res.pagination?.total ?? res.items.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filterByRole(role: string): void {
    this.activeRole.set(role);
    if (!role) {
      this.loadAll();
      return;
    }
    this.loading.set(true);
    this.usersApi.byRole(role).subscribe({
      next: (res) => {
        this.users.set(res.items);
        this.total.set(res.items.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  register(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.usersApi.register({ ...value, schoolId: value.schoolId || null }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Compte créé.');
        this.form.reset({ role: 'admin' });
        this.showForm.set(false);
        this.loadAll();
      },
      error: () => this.submitting.set(false),
    });
  }
}
