import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlatformUsersService } from '../services/platform-users.service';
import type { PlatformUser, StatBlock } from '../models/platform.models';
import type { PaginationMeta } from '../../../core/models/api.models';
import { ROLES } from '../../../core/models/auth.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

const ROLE_TONE: Record<string, BadgeTone> = {
  super_admin: 'danger',
  admin: 'brand',
  teacher: 'info',
  parent: 'warning',
  student: 'success',
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super administrateur',
  admin: 'Administrateur',
  teacher: 'Enseignant',
  parent: 'Parent',
  student: 'Élève',
};

interface StatTile {
  label: string;
  value: string;
}

function humanize(key: string): string {
  return key
    .replace(/[_.]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function isActive(u: PlatformUser): boolean {
  return u.isActive !== false;
}

/** Comptes plateforme : liste, stats, filtre par rôle, création. */
@Component({
  selector: 'panga-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    Avatar,
    EmptyState,
    KpiCard,
    PageHeader,
    Paginator,
    SectionHeader,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <panga-page-header icon="group" title="Utilisateurs" subtitle="Comptes de toute la plateforme">
      <button mat-flat-button class="!rounded-xl" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{
          showForm() ? 'close' : 'person_add'
        }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Créer un compte' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
      <panga-kpi-card label="Comptes" [value]="total()" icon="group" />
      <panga-kpi-card label="Affichés" [value]="users().length" icon="visibility" />
      <panga-kpi-card label="Administrateurs" [value]="adminCount()" icon="admin_panel_settings" />
      <panga-kpi-card label="Rôles" [value]="rolesShown()" icon="badge" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="register()" class="panga-card p-6 mb-6">
        <panga-section-header icon="person_add" title="Nouveau compte" />
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

    @if (statTiles().length) {
      <div class="panga-card p-5 mb-6">
        <panga-section-header icon="bar_chart" title="Statistiques" />
        <div class="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
          @for (tile of statTiles(); track tile.label) {
            <div class="rounded-2xl border border-[var(--border)] p-3.5">
              <p class="text-xs text-[var(--text-muted)] truncate" [title]="tile.label">
                {{ tile.label }}
              </p>
              <p class="text-xl font-semibold text-[var(--text)] mt-0.5">{{ tile.value }}</p>
            </div>
          }
        </div>
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
          <mat-button-toggle [value]="r">{{ roleLabel(r) }}</mat-button-toggle>
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
            <panga-avatar [name]="fullName(u)" [size]="46" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="font-medium text-[var(--text)] truncate">{{ fullName(u) || '—' }}</p>
                @if (u.username) {
                  <span class="text-xs text-[var(--text-muted)] truncate">{{
                    '@' + u.username
                  }}</span>
                }
              </div>
              <div
                class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--text-muted)]"
              >
                <span class="inline-flex items-center gap-1 truncate">
                  <span class="material-symbols-outlined text-[14px]">mail</span>
                  {{ u.email || '—' }}
                </span>
                @if (u.schoolId) {
                  <span class="inline-flex items-center gap-1 truncate max-w-[200px]">
                    <span class="material-symbols-outlined text-[14px]">apartment</span>
                    {{ u.schoolId }}
                  </span>
                }
                @if (u.createdAt) {
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">schedule</span>
                    {{ u.createdAt | date: 'dd/MM/yyyy' }}
                  </span>
                }
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span
                class="hidden sm:inline-flex h-2 w-2 rounded-full"
                [style.background]="active(u) ? 'var(--success)' : 'var(--text-muted)'"
                [matTooltip]="active(u) ? 'Actif' : 'Inactif'"
              ></span>
              @if (u.role) {
                <panga-status-badge [label]="roleLabel(u.role)" [tone]="roleTone(u.role)" />
              }
            </div>
          </div>
        }
        @if (pagination()) {
          <panga-paginator [meta]="pagination()" (pageChange)="onPage($event)" />
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
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
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
    this.load();
    this.usersApi.stats().subscribe({ next: (s) => this.stats.set(s), error: () => undefined });
  }

  protected readonly active = isActive;

  /** Stats backend → tuiles lisibles (libellés humanisés, valeurs primitives). */
  protected readonly statTiles = computed<StatTile[]>(() => {
    const data = this.stats();
    if (!data || typeof data !== 'object') {
      return [];
    }
    const tiles: StatTile[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined || typeof value === 'object') {
        continue;
      }
      const num = Number(value);
      tiles.push({
        label: humanize(key),
        value:
          Number.isFinite(num) && typeof value !== 'boolean'
            ? num.toLocaleString('fr-FR')
            : String(value),
      });
    }
    return tiles;
  });

  protected fullName(u: PlatformUser): string {
    return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  }

  protected roleLabel(role: string): string {
    return ROLE_LABEL[role] ?? humanize(role);
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

  private load(): void {
    this.loading.set(true);
    const role = this.activeRole();
    const query = { page: this.page(), limit: 10 };
    const req$ = role ? this.usersApi.byRole(role, query) : this.usersApi.list(query);
    req$.subscribe({
      next: (res) => {
        this.users.set(res.items);
        this.pagination.set(res.pagination ?? null);
        this.total.set(res.pagination?.total ?? res.items.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filterByRole(role: string): void {
    this.activeRole.set(role);
    this.page.set(1);
    this.load();
  }

  onPage(page: number): void {
    this.page.set(page);
    this.load();
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
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}
