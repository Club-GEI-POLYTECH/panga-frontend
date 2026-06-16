import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AttendanceService } from '../services/attendance.service';
import { ClassesService } from '../services/classes.service';
import { StudentsService } from '../services/students.service';
import type { ClassInstance, Student } from '../models/admin.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';

const SCHOOL_YEAR = '2024-2025';
const STATUSES = [
  { value: 'present', label: 'Présent', color: 'var(--success)' },
  { value: 'absent', label: 'Absent', color: 'var(--danger)' },
  { value: 'late', label: 'En retard', color: 'var(--warning)' },
  { value: 'excused', label: 'Excusé', color: 'var(--brand-500)' },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'panga-attendance',
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
  ],
  template: `
    <panga-page-header icon="fact_check" title="Présences" subtitle="Appel quotidien" />

    <div class="panga-card p-5 mb-6 flex flex-wrap items-end gap-3">
      <mat-form-field appearance="outline" class="flex-1 min-w-[220px]">
        <mat-label>Classe</mat-label>
        <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="min-w-[160px]">
        <mat-label>Date</mat-label>
        <input matInput type="date" [formControl]="dateCtrl" (change)="reload()" />
      </mat-form-field>
      @if (classId() && roster().length) {
        <button mat-stroked-button class="!rounded-xl" (click)="markAllPresent()">
          <mat-icon fontSet="material-symbols-outlined">done_all</mat-icon> Tous présents
        </button>
      }
    </div>

    @if (!classId()) {
      <div class="panga-card">
        <panga-empty-state
          icon="fact_check"
          title="Choisissez une classe"
          description="Sélectionnez une classe pour faire l'appel."
        />
      </div>
    } @else if (roster().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="group"
          title="Aucun élève"
          description="Cette classe n'a pas d'élèves."
        />
      </div>
    } @else {
      <section class="panga-card p-5">
        <panga-section-header icon="fact_check" title="Appel" [count]="roster().length" />
        <div class="divide-y divide-[var(--border)] -mx-5">
          @for (s of roster(); track s.id) {
            <div class="flex items-center gap-4 px-5 py-3">
              <panga-avatar [name]="studentName(s)" [size]="38" />
              <p class="min-w-0 flex-1 text-sm font-medium text-[var(--text)] truncate">
                {{ studentName(s) }}
              </p>
              <span
                class="h-2.5 w-2.5 rounded-full shrink-0"
                [style.background]="colorFor(statusOf(s.id))"
              ></span>
              <mat-form-field appearance="outline" class="!w-40" subscriptSizing="dynamic">
                <mat-select
                  [value]="statusOf(s.id)"
                  (selectionChange)="setStatus(s.id, $event.value)"
                >
                  @for (st of statuses; track st.value) {
                    <mat-option [value]="st.value">{{ st.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          }
        </div>
      </section>
    }
  `,
})
export class Attendance {
  private readonly attendanceApi = inject(AttendanceService);
  private readonly classesApi = inject(ClassesService);
  private readonly studentsApi = inject(StudentsService);
  private readonly notify = inject(NotificationService);

  protected readonly statuses = STATUSES;
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classId = signal('');
  protected readonly dateCtrl = new FormControl(today(), { nonNullable: true });
  private readonly allStudents = signal<Student[]>([]);
  private readonly statuses$ = signal<Record<string, string>>({});

  protected readonly roster = computed(() => {
    const id = this.classId();
    return this.allStudents().filter((s) => s.classInstanceId === id);
  });

  constructor() {
    this.classesApi.list(SCHOOL_YEAR).subscribe({ next: (r) => this.classes.set(r.items) });
    this.studentsApi
      .list({ page: 1, limit: 300, schoolYear: SCHOOL_YEAR })
      .subscribe({ next: (r) => this.allStudents.set(r.items) });
  }

  protected studentName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id;
  }
  protected statusOf(id: string): string {
    return this.statuses$()[id] ?? 'present';
  }
  protected colorFor(status: string): string {
    return STATUSES.find((s) => s.value === status)?.color ?? 'var(--text-muted)';
  }

  selectClass(id: string): void {
    this.classId.set(id);
    this.reload();
  }

  reload(): void {
    if (!this.classId()) {
      return;
    }
    this.attendanceApi.dailySheet(this.classId(), this.dateCtrl.value).subscribe({
      next: (entries) => {
        const map: Record<string, string> = {};
        for (const e of entries) {
          if (e.studentId && e.status) {
            map[e.studentId] = e.status;
          }
        }
        this.statuses$.set(map);
      },
      error: () => this.statuses$.set({}),
    });
  }

  setStatus(studentId: string, status: string): void {
    this.statuses$.update((m) => ({ ...m, [studentId]: status }));
    this.attendanceApi
      .mark({
        studentId,
        classInstanceId: this.classId(),
        date: this.dateCtrl.value,
        attendanceType: 'daily',
        status,
      })
      .subscribe({
        next: () => this.notify.success('Présence enregistrée.'),
        error: () => undefined,
      });
  }

  markAllPresent(): void {
    for (const s of this.roster()) {
      this.setStatus(s.id, 'present');
    }
  }
}
