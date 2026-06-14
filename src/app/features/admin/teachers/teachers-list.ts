import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TeachersService } from '../services/teachers.service';
import type { Teacher } from '../models/admin.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

@Component({
  selector: 'panga-teachers-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    Avatar,
    EmptyState,
    KpiCard,
    PageHeader,
    SectionHeader,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <panga-page-header
      icon="badge"
      title="Enseignants"
      subtitle="Corps enseignant de l'établissement"
    >
      <button mat-flat-button class="!rounded-xl" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{
          showForm() ? 'close' : 'person_add'
        }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouvel enseignant' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-2 sm:grid-cols-3 mb-6">
      <panga-kpi-card label="Enseignants" [value]="teachers().length" icon="badge" />
      <panga-kpi-card label="Spécialités" [value]="specialties()" icon="menu_book" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="person_add" title="Nouvel enseignant" />
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
            <mat-label>Spécialité</mat-label>
            <input matInput formControlName="specialization" />
          </mat-form-field>
        </div>
        <div class="flex justify-end">
          <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="submitting()">
            Ajouter
          </button>
        </div>
      </form>
    }

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (teachers().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="badge"
          title="Aucun enseignant"
          description="Ajoutez votre premier enseignant."
          actionLabel="Nouvel enseignant"
          (action)="showForm.set(true)"
        />
      </div>
    } @else {
      <div class="panga-card divide-y divide-[var(--border)]">
        @for (t of teachers(); track t.id) {
          <div class="flex items-center gap-4 px-4 sm:px-5 py-3.5">
            <panga-avatar [name]="fullName(t)" [size]="44" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-[var(--text)] truncate">{{ fullName(t) || '—' }}</p>
              <p class="text-xs text-[var(--text-muted)] truncate">{{ t.email || '—' }}</p>
            </div>
            @if (t.specialization) {
              <panga-status-badge [label]="t.specialization" tone="brand" [dot]="false" />
            }
          </div>
        }
      </div>
    }
  `,
})
export class TeachersList {
  private readonly teachersApi = inject(TeachersService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly teachers = signal<Teacher[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    specialization: [''],
  });

  constructor() {
    this.load();
  }

  protected fullName(t: Teacher): string {
    return `${t.firstName || ''} ${t.lastName || ''}`.trim();
  }
  protected specialties(): number {
    return new Set(
      this.teachers()
        .map((t) => t.specialization)
        .filter(Boolean),
    ).size;
  }

  private load(): void {
    this.loading.set(true);
    this.teachersApi.list().subscribe({
      next: (res) => {
        this.teachers.set(res.items);
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
    this.teachersApi.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Enseignant ajouté.');
        this.form.reset();
        this.showForm.set(false);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}
