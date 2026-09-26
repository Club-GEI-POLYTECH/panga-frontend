import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentService, extractContext, type StudentContext } from '../services/student.service';
import type { CourseOverviewRow, LessonLogEntry } from '../../admin/models/course.models';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { ScheduleGrid } from '../../../shared/ui/schedule-grid';
import { normalizeSchedule, type ScheduleSlot } from '../../../shared/schedule';
import { personLabel } from '../../admin/shared/labels';

/**
 * Vue élève : horaire de la classe + avancement des programmes (cahier de texte
 * en lecture seule) + dernières séances. Pas de saisie — le back refuse déjà.
 */
@Component({
  selector: 'panga-student-cours',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatProgressSpinnerModule,
    EmptyState,
    PageHeader,
    SectionHeader,
    StatusBadge,
    ScheduleGrid,
  ],
  template: `
    <panga-page-header
      icon="auto_stories"
      title="Mes cours"
      subtitle="Horaire de la semaine & avancement des programmes"
    />

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <!-- Horaire -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header
          icon="calendar_month"
          title="Emploi du temps"
          [count]="slots().length"
        />
        @if (slots().length === 0) {
          <panga-empty-state
            icon="calendar_month"
            title="Emploi du temps indisponible"
            description="Aucun créneau n'est configuré pour votre classe."
          />
        } @else {
          <panga-schedule-grid [slots]="slots()" />
        }
      </section>

      <!-- Avancement -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header
          icon="trending_up"
          title="Avancement des cours"
          [count]="overview().length"
        >
          @if (totalPlanned() > 0) {
            <panga-status-badge
              [label]="globalPct() + '% réalisé'"
              [tone]="globalPct() >= 80 ? 'success' : globalPct() >= 40 ? 'brand' : 'warning'"
              [dot]="false"
            />
          }
        </panga-section-header>

        @if (overview().length === 0) {
          <panga-empty-state
            icon="trending_up"
            title="Aucun avancement"
            description="Les heures prévues et les séances enregistrées apparaîtront ici."
          />
        } @else {
          <div class="grid gap-4 sm:grid-cols-3 mb-5">
            <div class="rounded-2xl border border-(--border) p-4">
              <p class="text-xs text-(--text-muted)">Heures prévues</p>
              <p class="text-2xl font-semibold text-(--text)">{{ totalPlanned() }}</p>
            </div>
            <div class="rounded-2xl border border-(--border) p-4">
              <p class="text-xs text-(--text-muted)">Heures réalisées</p>
              <p class="text-2xl font-semibold text-(--brand-700)">{{ totalDelivered() }}</p>
            </div>
            <div class="rounded-2xl border border-(--border) p-4">
              <p class="text-xs text-(--text-muted)">Heures restantes</p>
              <p class="text-2xl font-semibold text-(--text)">{{ totalRemaining() }}</p>
            </div>
          </div>

          <div class="space-y-4">
            @for (row of overview(); track row.classSubjectId) {
              <div class="progress-card rounded-2xl border border-(--border) p-4">
                <div class="flex items-center justify-between gap-3 mb-2">
                  <div class="min-w-0">
                    <p class="font-medium text-(--text) truncate">{{ row.subjectLabel }}</p>
                    @if (row.teacherName) {
                      <p class="text-xs text-(--text-muted) truncate">{{ row.teacherName }}</p>
                    }
                  </div>
                  <span class="text-sm font-semibold text-(--text) shrink-0">
                    {{ pct(row.completionRatio) }}%
                  </span>
                </div>
                <div class="h-2.5 w-full rounded-full bg-(--border) overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    [style.width.%]="pct(row.completionRatio)"
                    [style.background]="
                      pct(row.completionRatio) >= 80
                        ? 'var(--success)'
                        : pct(row.completionRatio) >= 40
                          ? 'var(--brand-gradient)'
                          : 'var(--warning)'
                    "
                  ></div>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-(--text-muted)">
                  <span
                    >Prévu : <b class="text-(--text)">{{ row.plannedHours }}h</b></span
                  >
                  <span
                    >Réalisé : <b class="text-(--text)">{{ row.deliveredHours }}h</b></span
                  >
                  <span
                    >Restant : <b class="text-(--text)">{{ row.remainingHours }}h</b></span
                  >
                  @if (row.entriesCount !== undefined) {
                    <span>{{ row.entriesCount }} séance(s)</span>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- Dernières séances -->
      <section class="panga-card p-5">
        <panga-section-header
          icon="event_note"
          title="Dernières séances"
          [count]="entries().length"
        />
        @if (entries().length === 0) {
          <panga-empty-state
            icon="event_note"
            title="Aucune séance"
            description="Les séances enregistrées par vos enseignants apparaîtront ici."
          />
        } @else {
          <div class="divide-y divide-(--border) -mx-5">
            @for (e of entries(); track e.id) {
              <div class="px-5 py-3 flex items-start gap-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style="background: var(--brand-gradient)"
                >
                  <span class="material-symbols-outlined text-[20px]">event_note</span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-sm font-medium text-(--text) truncate">
                      {{ e.title || 'Séance' }}
                    </p>
                    <panga-status-badge
                      [label]="(e.durationHours || 0) + 'h'"
                      tone="brand"
                      [dot]="false"
                    />
                  </div>
                  <p class="text-xs text-(--text-muted) mt-0.5">
                    {{ e.lessonDate | date: 'EEEE dd MMMM yyyy' }}
                    @if (e.subjectLabel) {
                      · {{ e.subjectLabel }}
                    }
                  </p>
                  @if (e.summary) {
                    <p class="text-sm text-(--text) mt-1 line-clamp-2">{{ e.summary }}</p>
                  }
                  @if (e.homework) {
                    <p class="text-xs text-(--text-muted) mt-1">
                      <b>Devoirs :</b> {{ e.homework }}
                    </p>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>
    }
  `,
  styles: [
    `
      .progress-card {
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease,
          background 0.15s ease;
      }
      .progress-card:hover {
        border-color: color-mix(in srgb, var(--brand-500) 40%, var(--border));
        background: color-mix(in srgb, var(--brand-500) 4%, var(--surface));
        box-shadow: 0 12px 28px -18px color-mix(in srgb, var(--brand-700) 55%, transparent);
      }
    `,
  ],
})
export class StudentCours {
  private readonly api = inject(StudentService);

  protected readonly loading = signal(true);
  protected readonly slots = signal<ScheduleSlot[]>([]);
  protected readonly overview = signal<CourseOverviewRow[]>([]);
  protected readonly entries = signal<LessonLogEntry[]>([]);

  protected readonly totalPlanned = computed(() =>
    round(this.overview().reduce((s, r) => s + r.plannedHours, 0)),
  );
  protected readonly totalDelivered = computed(() =>
    round(this.overview().reduce((s, r) => s + r.deliveredHours, 0)),
  );
  protected readonly totalRemaining = computed(() =>
    round(this.overview().reduce((s, r) => s + r.remainingHours, 0)),
  );
  protected readonly globalPct = computed(() => {
    const p = this.totalPlanned();
    return p > 0 ? Math.round((this.totalDelivered() / p) * 100) : 0;
  });

  constructor() {
    this.api.me().subscribe({
      next: (me) => this.load(extractContext(me)),
      error: () => this.loading.set(false),
    });
  }

  private load(ctx: StudentContext): void {
    if (!ctx.studentId && !ctx.classId) {
      this.loading.set(false);
      return;
    }
    forkJoin({
      schedule: ctx.classId
        ? this.api.schedule(ctx.classId, ctx.schoolYear).pipe(catchError(() => of({})))
        : of({}),
      overview: ctx.studentId
        ? this.api
            .courseOverview({ studentId: ctx.studentId, schoolYear: ctx.schoolYear })
            .pipe(catchError(() => of([] as CourseOverviewRow[])))
        : of([] as CourseOverviewRow[]),
      entries: ctx.studentId
        ? this.api
            .courseEntries({ studentId: ctx.studentId, schoolYear: ctx.schoolYear, limit: 20 })
            .pipe(catchError(() => of([] as LessonLogEntry[])))
        : of([] as LessonLogEntry[]),
    }).subscribe((r) => {
      this.slots.set(normalizeSchedule(r.schedule));
      this.overview.set(r.overview.map((row) => enrichTeacher(row)));
      this.entries.set(r.entries);
      this.loading.set(false);
    });
  }

  protected pct(ratio: number): number {
    return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Évite d'afficher un UUID à la place du nom d'enseignant. */
function enrichTeacher(row: CourseOverviewRow): CourseOverviewRow {
  const name = row.teacherName?.trim();
  if (name && !/^[0-9a-f-]{36}$/i.test(name)) {
    return row;
  }
  const teacher = row['teacher'] as Record<string, unknown> | undefined;
  if (!teacher) {
    return { ...row, teacherName: name && !/^[0-9a-f-]{36}$/i.test(name) ? name : undefined };
  }
  const label = personLabel(teacher);
  return {
    ...row,
    teacherName: label && label !== 'Parent' ? label : undefined,
  };
}
