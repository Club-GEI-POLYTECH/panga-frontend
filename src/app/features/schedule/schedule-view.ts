import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { SchoolYearStore } from '../../core/school-year/school-year.store';
import { ParentsService } from '../admin/services/parents.service';
import { TeachersService } from '../admin/services/teachers.service';
import { SubjectsService } from '../admin/services/subjects.service';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionHeader } from '../../shared/ui/section-header';
import { EmptyState } from '../../shared/ui/empty-state';
import { ScheduleGrid } from '../../shared/ui/schedule-grid';
import { normalizeSchedule, type ScheduleSlot } from '../../shared/schedule';
import { personLabel } from '../admin/shared/labels';

interface ChildRef {
  id: string;
  label: string;
  classId: string;
}

/**
 * Emploi du temps en lecture seule — vue enseignant (ses cours) ou parent
 * (emploi du temps de la classe de chaque enfant). Les élèves ont leur propre
 * onglet dans « Ma scolarité ».
 */
@Component({
  selector: 'panga-schedule-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    PageHeader,
    SectionHeader,
    EmptyState,
    ScheduleGrid,
  ],
  template: `
    <panga-page-header
      icon="calendar_month"
      title="Emploi du temps"
      [subtitle]="isTeacher() ? 'Vos cours de la semaine' : 'Emploi du temps de vos enfants'"
    />

    @if (isParent()) {
      <div class="panga-card p-5 mb-6 flex flex-wrap items-end gap-3">
        <mat-form-field appearance="outline" class="flex-1 min-w-55">
          <mat-label>Enfant</mat-label>
          <mat-select [value]="selectedChildId()" (selectionChange)="selectChild($event.value)">
            @for (c of children(); track c.id) {
              <mat-option [value]="c.id">{{ c.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    }

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <section class="panga-card p-5">
        <panga-section-header icon="calendar_month" title="Semaine" [count]="slots().length" />
        @if (slots().length === 0) {
          <panga-empty-state
            icon="calendar_month"
            title="Emploi du temps indisponible"
            [description]="
              isParent() && !selectedChildId()
                ? 'Sélectionnez un enfant.'
                : 'Aucun créneau configuré pour le moment.'
            "
          />
        } @else {
          <panga-schedule-grid [slots]="slots()" />
        }
      </section>
    }
  `,
})
export class ScheduleView {
  private readonly store = inject(AuthStore);
  private readonly sy = inject(SchoolYearStore);
  private readonly parentsApi = inject(ParentsService);
  private readonly teachersApi = inject(TeachersService);
  private readonly subjectsApi = inject(SubjectsService);

  protected readonly isParent = computed(() => this.store.role() === 'parent');
  protected readonly isTeacher = computed(() => this.store.role() === 'teacher');

  protected readonly loading = signal(true);
  protected readonly slots = signal<ScheduleSlot[]>([]);
  protected readonly children = signal<ChildRef[]>([]);
  protected readonly selectedChildId = signal('');

  private year(): string {
    return this.sy.filter() || this.sy.current();
  }

  constructor() {
    if (this.isParent()) {
      this.loadParent();
    } else {
      this.loadTeacher();
    }
  }

  private loadParent(): void {
    this.parentsApi.me().subscribe({
      next: (me) => {
        const raw = (me['students'] ?? me['children'] ?? []) as Record<string, unknown>[];
        const kids = raw.map((s) => this.toChild(s)).filter((c) => c.classId);
        this.children.set(kids);
        if (kids.length) {
          this.selectChild(kids[0].id);
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private toChild(s: Record<string, unknown>): ChildRef {
    const student = (s['student'] ?? s) as Record<string, unknown>;
    return {
      id: String(student['id'] ?? s['id'] ?? s['studentId'] ?? ''),
      label: personLabel(student),
      classId: String(
        student['classInstanceId'] ?? student['classId'] ?? student['currentClassInstanceId'] ?? '',
      ),
    };
  }

  selectChild(id: string): void {
    this.selectedChildId.set(id);
    const child = this.children().find((c) => c.id === id);
    if (!child?.classId) {
      this.slots.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.subjectsApi
      .classSchedule(child.classId, this.year())
      .pipe(catchError(() => of({})))
      .subscribe((data) => {
        this.slots.set(normalizeSchedule(data));
        this.loading.set(false);
      });
  }

  private loadTeacher(): void {
    this.teachersApi.me().subscribe({
      next: (t) => {
        if (!t?.id) {
          this.loading.set(false);
          return;
        }
        this.subjectsApi
          .teacherSchedule(t.id, this.year())
          .pipe(catchError(() => of({})))
          .subscribe((data) => {
            this.slots.set(normalizeSchedule(data));
            this.loading.set(false);
          });
      },
      error: () => this.loading.set(false),
    });
  }
}
