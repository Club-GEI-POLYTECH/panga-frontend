import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ClassesService } from '../services/classes.service';
import type { ClassInstance } from '../models/admin.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

const SCHOOL_YEAR = '2024-2025';

@Component({
  selector: 'panga-classes-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    EmptyState,
    KpiCard,
    PageHeader,
    SectionHeader,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <panga-page-header icon="meeting_room" title="Classes" [subtitle]="'Année ' + schoolYear">
      <button mat-flat-button class="!rounded-xl" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{ showForm() ? 'close' : 'add' }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouvelle classe' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-2 sm:grid-cols-3 mb-6">
      <panga-kpi-card label="Classes" [value]="classes().length" icon="meeting_room" />
      <panga-kpi-card label="Élèves" [value]="totalStudents()" icon="school" />
      <panga-kpi-card label="Capacité" [value]="totalCapacity()" icon="groups" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="add" title="Nouvelle classe" />
        <div class="grid gap-4 sm:grid-cols-2">
          <mat-form-field appearance="outline">
            <mat-label>Nom (ex. 3ème AG)</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Niveau</mat-label>
            <input matInput type="number" formControlName="level" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Section</mat-label>
            <input matInput formControlName="section" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Capacité</mat-label>
            <input matInput type="number" formControlName="capacity" />
          </mat-form-field>
        </div>
        <div class="flex justify-end">
          <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="submitting()">
            Créer la classe
          </button>
        </div>
      </form>
    }

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (classes().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="meeting_room"
          title="Aucune classe"
          description="Créez votre première classe pour l'année."
          actionLabel="Nouvelle classe"
          (action)="showForm.set(true)"
        />
      </div>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (c of classes(); track c.id) {
          <div class="panga-card p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-[var(--text)] truncate">{{ c.name || 'Classe' }}</p>
                <p class="text-xs text-[var(--text-muted)] mt-0.5">
                  {{ c.schoolYear || schoolYear }}
                </p>
              </div>
              @if (c.section) {
                <panga-status-badge [label]="c.section" tone="brand" [dot]="false" />
              }
            </div>
            <div class="mt-4 flex items-center gap-4 text-sm">
              <span class="inline-flex items-center gap-1.5 text-[var(--text)]">
                <span class="material-symbols-outlined text-[18px] text-[var(--brand-500)]"
                  >school</span
                >
                {{ c.studentCount ?? 0
                }}<span class="text-[var(--text-muted)]">/{{ c.capacity ?? '—' }}</span>
              </span>
              @if (c.level !== undefined && c.level !== null) {
                <span class="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                  <span class="material-symbols-outlined text-[18px]">stairs</span> Niveau
                  {{ c.level }}
                </span>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ClassesList {
  private readonly classesApi = inject(ClassesService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly schoolYear = SCHOOL_YEAR;
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);

  protected readonly totalStudents = computed(() =>
    this.classes().reduce((s, c) => s + (Number(c.studentCount) || 0), 0),
  );
  protected readonly totalCapacity = computed(() =>
    this.classes().reduce((s, c) => s + (Number(c.capacity) || 0), 0),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    level: [1, [Validators.required, Validators.min(1)]],
    section: [''],
    capacity: [40, [Validators.min(1)]],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.classesApi.list(SCHOOL_YEAR).subscribe({
      next: (res) => {
        this.classes.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const v = this.form.getRawValue();
    // Workflow : créer le modèle, puis l'instance pour l'année en cours.
    this.classesApi
      .createTemplate({
        name: v.name,
        level: v.level,
        section: v.section || undefined,
        capacity: v.capacity,
      })
      .pipe(
        switchMap((tpl) =>
          this.classesApi.createInstance({ templateId: tpl.id, schoolYear: SCHOOL_YEAR }),
        ),
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.notify.success('Classe créée.');
          this.form.reset({ level: 1, capacity: 40 });
          this.showForm.set(false);
          this.load();
        },
        error: () => this.submitting.set(false),
      });
  }
}
