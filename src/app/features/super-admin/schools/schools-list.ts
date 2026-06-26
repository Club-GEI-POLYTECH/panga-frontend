import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SchoolsService } from '../services/schools.service';
import type { PlatformSchool } from '../models/platform.models';
import type { PaginationMeta } from '../../../core/models/api.models';
import {
  SCHOOL_EDITABLE_GROUPS,
  buildSchoolFormGroup,
  schoolCreatePayload,
  type SchoolFieldGroup,
} from '../../../core/models/school-fields';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SchoolFieldsForm } from '../../../shared/ui/school-fields-form';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

/** Création : champ « code » (accès) en tête, puis toutes les sections éditables. */
const CREATE_GROUPS: SchoolFieldGroup[] = [
  { title: 'Accès', icon: 'key', fields: [{ key: 'code', label: 'Code établissement' }] },
  ...SCHOOL_EDITABLE_GROUPS,
];

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
    MatSelectModule,
    Avatar,
    EmptyState,
    KpiCard,
    PageHeader,
    Paginator,
    SchoolFieldsForm,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <panga-page-header
      icon="apartment"
      title="Écoles"
      subtitle="Gérez les établissements de la plateforme"
    >
      <button mat-flat-button class="rounded-xl!" (click)="showForm.set(!showForm())">
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
      <div class="mb-6 animate-[fadeIn_0.2s_ease]">
        <panga-school-fields [form]="form" [groups]="createGroups" />
        <div class="sticky bottom-4 z-10 flex justify-end">
          <button
            mat-flat-button
            class="rounded-xl! shadow-lg"
            (click)="create()"
            [disabled]="submitting()"
          >
            <mat-icon fontSet="material-symbols-outlined">add_business</mat-icon>
            {{ submitting() ? 'Création…' : "Créer l'école" }}
          </button>
        </div>
      </div>
    }

    <div class="panga-card p-4 mb-4 flex flex-wrap items-center gap-3">
      <mat-form-field appearance="outline" class="flex-1 min-w-50" subscriptSizing="dynamic">
        <mat-label>Rechercher</mat-label>
        <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
        <input matInput [formControl]="searchCtrl" placeholder="Nom, code, ville…" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-44" subscriptSizing="dynamic">
        <mat-label>Statut</mat-label>
        <mat-select [value]="activeStatus()" (selectionChange)="filterByStatus($event.value)">
          <mat-option value="">Tous</mat-option>
          <mat-option value="active">Actif</mat-option>
          <mat-option value="inactive">Inactif</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-32" subscriptSizing="dynamic">
        <mat-label>Par page</mat-label>
        <mat-select [value]="limit()" (selectionChange)="changeLimit($event.value)">
          @for (n of pageSizes; track n) {
            <mat-option [value]="n">{{ n }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

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
      <div class="panga-card divide-y divide-(--border)">
        @for (s of schools(); track s.id) {
          <a
            [routerLink]="['/', 'platform', 'schools', s.id]"
            class="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)] transition-colors"
          >
            <panga-avatar [name]="s.name || s.code || '?'" [size]="44" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-(--text) truncate">
                {{ s.displayName || s.name || '—' }}
              </p>
              <p class="text-xs text-(--text-muted) truncate">
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
              class="text-(--text-muted) hidden sm:block"
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
  private readonly notify = inject(NotificationService);

  protected readonly createGroups = CREATE_GROUPS;

  protected readonly schools = signal<PlatformSchool[]>([]);
  protected readonly total = signal(0);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly limit = signal(20);
  protected readonly pageSizes = [20, 50, 100];
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });
  protected readonly search = signal('');
  protected readonly activeStatus = signal('');
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

  /** Toutes les sections + code obligatoire (création). */
  protected readonly form = buildSchoolFormGroup(true);

  constructor() {
    this.form.patchValue({ country: 'CD' });
    this.load();
    this.searchCtrl.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((v) => {
      this.search.set(v.trim());
      this.page.set(1);
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    this.schoolsApi
      .list({
        page: this.page(),
        limit: this.limit(),
        search: this.search() || undefined,
        status: this.activeStatus() || undefined,
      })
      .subscribe({
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

  filterByStatus(status: string): void {
    this.activeStatus.set(status);
    this.page.set(1);
    this.load();
  }

  changeLimit(limit: number): void {
    this.limit.set(limit);
    this.page.set(1);
    this.load();
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.schoolsApi.create(schoolCreatePayload(this.form)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('École créée.');
        this.form.reset();
        this.form.patchValue({ country: 'CD' });
        this.showForm.set(false);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}
