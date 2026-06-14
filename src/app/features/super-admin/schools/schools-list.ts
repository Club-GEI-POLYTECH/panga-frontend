import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SchoolsService } from '../services/schools.service';
import type { PlatformSchool } from '../models/platform.models';
import type { PaginationMeta } from '../../../core/models/api.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

function isActive(s: PlatformSchool): boolean {
  return s.isActive !== false && s.status !== 'inactive' && s.status !== 'disabled';
}

/** Liste des écoles + création (super_admin). */
@Component({
  selector: 'panga-schools-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
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
    <panga-page-header
      icon="apartment"
      title="Écoles"
      subtitle="Gérez les établissements de la plateforme"
    >
      <button mat-flat-button class="!rounded-xl" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{ showForm() ? 'close' : 'add' }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouvelle école' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
      <panga-kpi-card label="Établissements" [value]="total()" icon="apartment" />
      <panga-kpi-card label="Actifs" [value]="activeCount()" icon="check_circle" />
      <panga-kpi-card label="Pays couverts" [value]="countriesCount()" icon="public" />
    </section>

    @if (showForm()) {
      <form
        [formGroup]="form"
        (ngSubmit)="create()"
        class="panga-card p-6 mb-6 animate-[fadeIn_0.2s_ease]"
      >
        <panga-section-header icon="add_business" title="Nouvel établissement" />
        <div class="grid gap-4 sm:grid-cols-2">
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Code</mat-label>
            <input matInput formControlName="code" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>E-mail</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Téléphone</mat-label>
            <input matInput formControlName="phone" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ville</mat-label>
            <input matInput formControlName="city" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Pays</mat-label>
            <input matInput formControlName="country" />
          </mat-form-field>
        </div>
        <div class="flex justify-end">
          <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="submitting()">
            Créer l'école
          </button>
        </div>
      </form>
    }

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (schools().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="apartment"
          title="Aucune école"
          description="Créez votre premier établissement pour démarrer."
          actionLabel="Nouvelle école"
          (action)="showForm.set(true)"
        />
      </div>
    } @else {
      <div class="panga-card divide-y divide-[var(--border)]">
        @for (s of schools(); track s.id) {
          <a
            [routerLink]="['/', 'platform', 'schools', s.id]"
            class="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)] transition-colors"
          >
            <panga-avatar [name]="s.name || s.code || '?'" [size]="44" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-[var(--text)] truncate">
                {{ s.displayName || s.name || '—' }}
              </p>
              <p class="text-xs text-[var(--text-muted)] truncate">
                {{ s.code || '—' }}
                @if (s.city) {
                  · {{ s.city }}
                }
                @if (s.email) {
                  · {{ s.email }}
                }
              </p>
            </div>
            <panga-status-badge
              [label]="active(s) ? 'Actif' : 'Inactif'"
              [tone]="active(s) ? 'success' : 'neutral'"
            />
            <mat-icon
              fontSet="material-symbols-outlined"
              class="text-[var(--text-muted)] hidden sm:block"
            >
              chevron_right
            </mat-icon>
          </a>
        }
        @if (pagination()) {
          <panga-paginator [meta]="pagination()" (pageChange)="onPage($event)" />
        }
      </div>
    }
  `,
})
export class SchoolsList {
  private readonly schoolsApi = inject(SchoolsService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly schools = signal<PlatformSchool[]>([]);
  protected readonly total = signal(0);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);

  protected readonly activeCount = computed(() => this.schools().filter(isActive).length);
  protected readonly countriesCount = computed(
    () =>
      new Set(
        this.schools()
          .map((s) => s.country)
          .filter(Boolean),
      ).size,
  );

  protected readonly active = isActive;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    city: [''],
    country: ['CD'],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.schoolsApi.list({ page: this.page(), limit: 10 }).subscribe({
      next: (res) => {
        this.schools.set(res.items);
        this.pagination.set(res.pagination ?? null);
        this.total.set(res.pagination?.total ?? res.items.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.schoolsApi.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('École créée.');
        this.form.reset({ country: 'CD' });
        this.showForm.set(false);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}
