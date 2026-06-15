import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { StudentsService } from '../services/students.service';
import { ClassesService } from '../services/classes.service';
import { ParentsService } from '../services/parents.service';
import type { ClassInstance, Parent, Student } from '../models/admin.models';
import type { PaginationMeta } from '../../../core/models/api.models';
import { GENDER_OPTIONS } from '../../../core/models/student.enums';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

const SCHOOL_YEAR = '2024-2025';

@Component({
  selector: 'panga-students-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
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
    SectionHeader,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <panga-page-header icon="school" title="Élèves" subtitle="Effectifs de l'établissement">
      <input #fileInput type="file" class="hidden" accept=".xlsx,.xls" (change)="onFile($event)" />
      <button
        mat-stroked-button
        class="!rounded-xl"
        (click)="fileInput.click()"
        [disabled]="importing()"
      >
        <mat-icon fontSet="material-symbols-outlined">upload_file</mat-icon>
        {{ importing() ? 'Import…' : 'Importer (Excel)' }}
      </button>
      <button mat-flat-button class="!rounded-xl" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{
          showForm() ? 'close' : 'person_add'
        }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouvel élève' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
      <panga-kpi-card label="Élèves" [value]="total()" icon="school" />
      <panga-kpi-card label="Affichés" [value]="students().length" icon="visibility" />
      <panga-kpi-card label="Garçons" [value]="boys()" icon="man" />
      <panga-kpi-card label="Filles" [value]="girls()" icon="woman" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="person_add" title="Nouvel élève" />
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
            <mat-label>Sexe</mat-label>
            <mat-select formControlName="gender">
              @for (g of genders; track g.value) {
                <mat-option [value]="g.value">{{ g.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Date de naissance</mat-label>
            <input matInput type="date" formControlName="dateOfBirth" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Classe</mat-label>
            <mat-select formControlName="classInstanceId">
              <mat-option [value]="''">—</mat-option>
              @for (c of classes(); track c.id) {
                <mat-option [value]="c.id">{{ c.name || c.id }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Parent</mat-label>
            <mat-select formControlName="parentId">
              <mat-option [value]="''">—</mat-option>
              @for (p of parents(); track p.id) {
                <mat-option [value]="p.id">{{ parentName(p) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <div class="flex justify-end">
          <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="submitting()">
            Inscrire l'élève
          </button>
        </div>
      </form>
    }

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (students().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="school"
          title="Aucun élève"
          description="Inscrivez votre premier élève."
          actionLabel="Nouvel élève"
          (action)="showForm.set(true)"
        />
      </div>
    } @else {
      <div class="panga-card divide-y divide-[var(--border)]">
        @for (s of students(); track s.id) {
          <a
            [routerLink]="['/', 'students', s.id]"
            class="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)] transition-colors"
          >
            <panga-avatar [name]="fullName(s)" [size]="44" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-[var(--text)] truncate">{{ fullName(s) || '—' }}</p>
              <div
                class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--text-muted)]"
              >
                @if (s.matricule || s.studentNumber) {
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">badge</span>
                    {{ s.matricule || s.studentNumber }}
                  </span>
                }
                @if (s.className) {
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">meeting_room</span>
                    {{ s.className }}
                  </span>
                }
                @if (s.dateOfBirth) {
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">cake</span>
                    {{ s.dateOfBirth | date: 'dd/MM/yyyy' }}
                  </span>
                }
              </div>
            </div>
            @if (s.gender) {
              <panga-status-badge
                [label]="s.gender === 'F' ? 'Fille' : 'Garçon'"
                [tone]="s.gender === 'F' ? 'brand' : 'info'"
                [dot]="false"
              />
            }
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
export class StudentsList {
  private readonly studentsApi = inject(StudentsService);
  private readonly classesApi = inject(ClassesService);
  private readonly parentsApi = inject(ParentsService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly genders = GENDER_OPTIONS;
  protected readonly students = signal<Student[]>([]);
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly parents = signal<Parent[]>([]);
  protected readonly total = signal(0);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly importing = signal(false);
  protected readonly showForm = signal(false);

  protected readonly boys = computed(() => this.students().filter((s) => s.gender === 'M').length);
  protected readonly girls = computed(() => this.students().filter((s) => s.gender === 'F').length);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    gender: ['M', Validators.required],
    dateOfBirth: ['', Validators.required],
    classInstanceId: [''],
    parentId: [''],
  });

  constructor() {
    this.load();
    this.classesApi.list(SCHOOL_YEAR).subscribe({ next: (r) => this.classes.set(r.items) });
    this.parentsApi.list().subscribe({ next: (r) => this.parents.set(r.items) });
  }

  protected fullName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim();
  }
  protected parentName(p: Parent): string {
    return `${p.firstName || ''} ${p.lastName || ''}`.trim() || (p.email ?? p.id);
  }

  private load(): void {
    this.loading.set(true);
    this.studentsApi.list({ page: this.page(), limit: 10, schoolYear: SCHOOL_YEAR }).subscribe({
      next: (res) => {
        this.students.set(res.items);
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

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.importing()) {
      return;
    }
    this.importing.set(true);
    this.studentsApi.importExcel(file, SCHOOL_YEAR).subscribe({
      next: (res) => {
        this.importing.set(false);
        const count = Number(res?.['imported'] ?? res?.['count'] ?? res?.['created']) || 0;
        this.notify.success(count ? `${count} élève(s) importé(s).` : 'Import terminé.');
        input.value = '';
        this.page.set(1);
        this.load();
      },
      error: () => {
        this.importing.set(false);
        input.value = '';
      },
    });
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const v = this.form.getRawValue();
    this.studentsApi
      .create({
        firstName: v.firstName,
        lastName: v.lastName,
        gender: v.gender,
        dateOfBirth: v.dateOfBirth,
        classInstanceId: v.classInstanceId || undefined,
        parentId: v.parentId || undefined,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.notify.success('Élève inscrit.');
          this.form.reset({ gender: 'M' });
          this.showForm.set(false);
          this.load();
        },
        error: () => this.submitting.set(false),
      });
  }
}
