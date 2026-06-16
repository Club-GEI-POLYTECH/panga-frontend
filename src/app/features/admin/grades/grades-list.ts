import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AcademicsService } from '../services/academics.service';
import { ClassesService } from '../services/classes.service';
import { StudentsService } from '../services/students.service';
import { CurriculumService } from '../../super-admin/services/curriculum.service';
import type { ClassInstance, Grade, Period, ProgramSlot, Student } from '../models/admin.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

const SCHOOL_YEAR = '2024-2025';

@Component({
  selector: 'panga-grades-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    Avatar,
    EmptyState,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header icon="grade" title="Notes" [subtitle]="'Année ' + schoolYear" />

    <div class="panga-card p-5 mb-6 flex flex-wrap items-end gap-3">
      <mat-form-field appearance="outline" class="flex-1 min-w-[220px]">
        <mat-label>Classe</mat-label>
        <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (classId()) {
        <button mat-stroked-button class="!rounded-xl" (click)="seedPeriods()">
          <mat-icon fontSet="material-symbols-outlined">event_repeat</mat-icon> Initialiser les
          périodes
        </button>
        <button mat-stroked-button class="!rounded-xl" (click)="computeAverages()">
          <mat-icon fontSet="material-symbols-outlined">calculate</mat-icon> Calculer les moyennes
        </button>
        <button mat-flat-button class="!rounded-xl" (click)="showForm.set(!showForm())">
          <mat-icon fontSet="material-symbols-outlined">{{
            showForm() ? 'close' : 'add'
          }}</mat-icon>
          {{ showForm() ? 'Annuler' : 'Saisir une note' }}
        </button>
      }
    </div>

    @if (!classId()) {
      <div class="panga-card">
        <panga-empty-state
          icon="grade"
          title="Choisissez une classe"
          description="Sélectionnez une classe pour gérer les notes."
        />
      </div>
    } @else {
      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="addGrade()" class="panga-card p-6 mb-6">
          <panga-section-header icon="add" title="Nouvelle note" />
          @if (slots().length === 0) {
            <p class="text-sm text-[var(--warning)] mb-3">
              Aucun cours (slot programme) disponible pour cette classe.
            </p>
          }
          <div class="grid gap-4 sm:grid-cols-2">
            <mat-form-field appearance="outline">
              <mat-label>Élève</mat-label>
              <mat-select formControlName="studentId">
                @for (s of classStudents(); track s.id) {
                  <mat-option [value]="s.id">{{ studentName(s) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Cours</mat-label>
              <mat-select formControlName="nationalProgramSlotId">
                @for (sl of slots(); track sl.id) {
                  <mat-option [value]="sl.id">{{ sl.labelFr || sl.programCode }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Période</mat-label>
              <mat-select formControlName="periodId">
                @for (p of periods(); track p.id) {
                  <mat-option [value]="p.id">{{ periodLabel(p) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Note (/20)</mat-label>
              <input matInput type="number" formControlName="score" />
            </mat-form-field>
          </div>
          <div class="flex justify-end">
            <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="submitting()">
              Enregistrer la note
            </button>
          </div>
        </form>
      }

      <section class="panga-card p-5">
        <panga-section-header icon="grade" title="Notes saisies" [count]="grades().length" />
        @if (loading()) {
          <p class="text-sm text-[var(--text-muted)] py-6 text-center">Chargement…</p>
        } @else if (grades().length === 0) {
          <panga-empty-state
            icon="grade"
            title="Aucune note"
            description="Saisissez la première note."
          />
        } @else {
          <div class="divide-y divide-[var(--border)] -mx-5">
            @for (g of grades(); track g.id) {
              <div class="flex items-center gap-4 px-5 py-3">
                <panga-avatar [name]="g.studentName || g.studentId || '?'" [size]="36" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-[var(--text)] truncate">
                    {{ g.studentName || g.studentId || '—' }}
                  </p>
                  <p class="text-xs text-[var(--text-muted)] truncate">
                    {{ g.subjectLabel || '—' }}
                    @if (g.term) {
                      · {{ g.term }}
                    }
                    @if (g.periodNumber) {
                      · P{{ g.periodNumber }}
                    }
                  </p>
                </div>
                <span class="text-base font-semibold text-[var(--text)]">{{ g.score ?? '—' }}</span>
                @if (g.isExamGrade) {
                  <panga-status-badge label="Examen" tone="warning" [dot]="false" />
                }
              </div>
            }
          </div>
        }
      </section>
    }
  `,
})
export class GradesList {
  private readonly academics = inject(AcademicsService);
  private readonly classesApi = inject(ClassesService);
  private readonly studentsApi = inject(StudentsService);
  private readonly curriculum = inject(CurriculumService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly schoolYear = SCHOOL_YEAR;
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classId = signal('');
  protected readonly grades = signal<Grade[]>([]);
  protected readonly periods = signal<Period[]>([]);
  protected readonly slots = signal<ProgramSlot[]>([]);
  private readonly allStudents = signal<Student[]>([]);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);

  protected readonly classStudents = computed(() => {
    const id = this.classId();
    const filtered = this.allStudents().filter((s) => s.classInstanceId === id);
    return filtered.length ? filtered : this.allStudents();
  });

  protected readonly form = this.fb.nonNullable.group({
    studentId: ['', Validators.required],
    nationalProgramSlotId: ['', Validators.required],
    periodId: ['', Validators.required],
    score: [10, [Validators.required, Validators.min(0), Validators.max(20)]],
  });

  constructor() {
    this.classesApi.list(SCHOOL_YEAR).subscribe({ next: (r) => this.classes.set(r.items) });
    this.studentsApi
      .list({ page: 1, limit: 200, schoolYear: SCHOOL_YEAR })
      .subscribe({ next: (r) => this.allStudents.set(r.items) });
    this.loadSlots();
  }

  protected studentName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id;
  }
  protected periodLabel(p: Period): string {
    return `${p.term ?? ''}${p.periodNumber ? ' — P' + p.periodNumber : ''}`.trim() || p.id;
  }

  selectClass(id: string): void {
    this.classId.set(id);
    this.loadGrades();
    this.academics.periods(id, SCHOOL_YEAR).subscribe({ next: (r) => this.periods.set(r.items) });
  }

  private loadSlots(): void {
    this.curriculum.publishedPrograms().subscribe({
      next: (r) => {
        const active =
          r.items.find((p) => (p as Record<string, unknown>)['activeForSchool'] === true) ??
          r.items[0];
        const raw = (active?.slots ?? []) as ProgramSlot[];
        this.slots.set(raw);
      },
    });
  }

  private loadGrades(): void {
    this.loading.set(true);
    this.academics.grades(this.classId(), SCHOOL_YEAR).subscribe({
      next: (r) => {
        this.grades.set(r.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  seedPeriods(): void {
    this.academics.seedPeriods(SCHOOL_YEAR).subscribe({
      next: () => {
        this.notify.success('Périodes initialisées.');
        this.academics
          .periods(this.classId(), SCHOOL_YEAR)
          .subscribe({ next: (r) => this.periods.set(r.items) });
      },
    });
  }

  computeAverages(): void {
    this.academics.computeClassAverages(this.classId(), SCHOOL_YEAR).subscribe({
      next: () => {
        this.notify.success('Moyennes calculées.');
        this.loadGrades();
      },
    });
  }

  addGrade(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const period = this.periods().find((p) => p.id === this.form.controls.periodId.value);
    this.submitting.set(true);
    const v = this.form.getRawValue();
    this.academics
      .createGrade({
        studentId: v.studentId,
        classId: this.classId(),
        nationalProgramSlotId: v.nationalProgramSlotId,
        schoolYear: SCHOOL_YEAR,
        term: period?.term ?? 'TERM1',
        score: v.score,
        isPeriodGrade: true,
        isExamGrade: false,
        periodNumber: period?.periodNumber ?? 1,
        periodId: v.periodId,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.notify.success('Note enregistrée.');
          this.form.reset({ score: 10 });
          this.showForm.set(false);
          this.loadGrades();
        },
        error: () => this.submitting.set(false),
      });
  }
}
