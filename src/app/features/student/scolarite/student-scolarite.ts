import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentService, extractContext, type StudentContext } from '../services/student.service';
import type { Bulletin } from '../../admin/models/admin.models';
import type { AnnualAverageResult, Grade } from '../../admin/models/grade.models';
import { statusColor, statusLabel } from '../../../core/models/attendance.enums';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

interface ScheduleSlot {
  day: number;
  start: string;
  end: string;
  label: string;
  room?: string;
}

const DAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

@Component({
  selector: 'panga-student-scolarite',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyState,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="menu_book"
      title="Ma scolarité"
      subtitle="Notes, bulletins & emploi du temps"
    />

    <div
      class="flex gap-1 mb-4 p-1 rounded-xl bg-[var(--background)] w-fit border border-[var(--border)]"
    >
      @for (t of tabs; track t.key) {
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium"
          [style.background]="tab() === t.key ? 'var(--surface)' : 'transparent'"
          [style.color]="tab() === t.key ? 'var(--text)' : 'var(--text-muted)'"
          (click)="tab.set(t.key)"
        >
          {{ t.label }}
        </button>
      }
    </div>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      @switch (tab()) {
        @case ('grades') {
          <section class="panga-card p-5 mb-6">
            <panga-section-header
              icon="leaderboard"
              title="Mes moyennes"
              [count]="subjects().length"
            >
              @if (overallPercent() !== null) {
                <panga-status-badge
                  [label]="overallPercent() + '% — moy. générale'"
                  [tone]="overallPercent()! >= 50 ? 'success' : 'danger'"
                  [dot]="false"
                />
              }
            </panga-section-header>
            @if (subjects().length === 0) {
              <p class="text-sm text-[var(--text-muted)] py-4 text-center">
                Aucune moyenne disponible.
              </p>
            } @else {
              <div class="space-y-3">
                @for (a of subjects(); track $index) {
                  <div>
                    <div class="flex items-center justify-between gap-3 mb-1">
                      <span class="text-sm text-[var(--text)] truncate">{{ subjLabel(a) }}</span>
                      <span
                        class="text-sm font-semibold shrink-0"
                        [style.color]="avgColor(subjPct(a))"
                      >
                        {{ subjPct(a) }}%
                      </span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-[var(--border)] overflow-hidden">
                      <div
                        class="h-full rounded-full"
                        [style.width.%]="subjPct(a)"
                        [style.background]="avgColor(subjPct(a))"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            }
          </section>

          <section class="panga-card p-5">
            <panga-section-header icon="grade" title="Mes notes" [count]="grades().length" />
            @if (grades().length === 0) {
              <panga-empty-state
                icon="grade"
                title="Aucune note"
                description="Aucune note enregistrée."
              />
            } @else {
              <div class="divide-y divide-[var(--border)] -mx-5">
                @for (g of grades(); track g.id) {
                  <div class="flex items-center gap-4 px-5 py-3">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-[var(--text)] truncate">
                        {{ courseLabel(g) }}
                      </p>
                      <p class="text-xs text-[var(--text-muted)] truncate">
                        {{ g.term || '' }}
                        @if (g.examName) {
                          · {{ g.examName }}
                        }
                      </p>
                    </div>
                    <span class="text-base font-semibold text-[var(--text)]">{{
                      num(g.score)
                    }}</span>
                    <span class="text-xs text-[var(--text-muted)]"
                      >/{{ num(g.maxScore) || 20 }}</span
                    >
                  </div>
                }
              </div>
            }
          </section>
        }

        @case ('bulletins') {
          <section class="panga-card p-5">
            <panga-section-header
              icon="description"
              title="Mes bulletins"
              [count]="bulletins().length"
            />
            @if (bulletins().length === 0) {
              <panga-empty-state
                icon="description"
                title="Aucun bulletin"
                description="Aucun bulletin publié."
              />
            } @else {
              <div class="divide-y divide-[var(--border)] -mx-5">
                @for (b of bulletins(); track b.id) {
                  <div class="flex items-center gap-4 px-5 py-3">
                    <span class="material-symbols-outlined text-[var(--brand-500)]"
                      >description</span
                    >
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-[var(--text)] truncate">
                        {{ b.term || 'Bulletin' }} · {{ b.schoolYear || '' }}
                      </p>
                      <p class="text-xs text-[var(--text-muted)]">
                        @if (b.average !== undefined) {
                          Moyenne : {{ b.average }}
                        }
                        @if (b.rank) {
                          · Rang {{ b.rank }}
                        }
                      </p>
                    </div>
                    <panga-status-badge
                      [label]="b.published ? 'Publié' : 'Brouillon'"
                      [tone]="b.published ? 'success' : 'neutral'"
                      [dot]="false"
                    />
                    <button mat-stroked-button class="!rounded-xl" (click)="openPdf(b)">
                      <mat-icon fontSet="material-symbols-outlined">picture_as_pdf</mat-icon> PDF
                    </button>
                  </div>
                }
              </div>
            }
          </section>
        }

        @case ('schedule') {
          <section class="panga-card p-5">
            <panga-section-header icon="calendar_month" title="Emploi du temps" />
            @if (scheduleSlots().length === 0) {
              <panga-empty-state
                icon="calendar_month"
                title="Emploi du temps indisponible"
                description="Aucun créneau n'est configuré pour votre classe."
              />
            } @else {
              <div class="space-y-5">
                @for (d of scheduleDays(); track d) {
                  <div>
                    <p class="text-sm font-semibold text-[var(--text)] mb-2">{{ dayName(d) }}</p>
                    <div class="space-y-2">
                      @for (s of slotsOfDay(d); track $index) {
                        <div
                          class="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
                        >
                          <span
                            class="text-xs font-medium tabular-nums text-[var(--brand-700)] w-24 shrink-0"
                          >
                            {{ s.start }}–{{ s.end }}
                          </span>
                          <span class="text-sm text-[var(--text)] truncate flex-1">{{
                            s.label
                          }}</span>
                          @if (s.room) {
                            <span class="text-xs text-[var(--text-muted)]">{{ s.room }}</span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </section>
        }

        @case ('attendance') {
          <section class="grid gap-3 grid-cols-3 mb-6">
            <div class="panga-card p-4 text-center">
              <p class="text-2xl font-semibold text-[var(--success)]">
                {{ countStatus('present') }}
              </p>
              <p class="text-xs text-[var(--text-muted)]">Présences</p>
            </div>
            <div class="panga-card p-4 text-center">
              <p class="text-2xl font-semibold text-[var(--warning)]">{{ countStatus('late') }}</p>
              <p class="text-xs text-[var(--text-muted)]">Retards</p>
            </div>
            <div class="panga-card p-4 text-center">
              <p class="text-2xl font-semibold text-[var(--danger)]">{{ countStatus('absent') }}</p>
              <p class="text-xs text-[var(--text-muted)]">Absences</p>
            </div>
          </section>

          <section class="panga-card p-5">
            <panga-section-header
              icon="fact_check"
              title="Mes présences"
              [count]="attendance().length"
            />
            @if (attendance().length === 0) {
              <panga-empty-state
                icon="fact_check"
                title="Aucun relevé"
                description="Aucune présence enregistrée."
              />
            } @else {
              <div class="divide-y divide-[var(--border)] -mx-5">
                @for (a of attendance(); track $index) {
                  <div class="flex items-center gap-3 px-5 py-2.5">
                    <span
                      class="h-2.5 w-2.5 rounded-full shrink-0"
                      [style.background]="color(a)"
                    ></span>
                    <span class="text-sm text-[var(--text)] flex-1">
                      {{ asDate(a['date']) | date: 'EEEE dd MMMM yyyy' }}
                    </span>
                    <panga-status-badge [label]="statusFr(a)" [tone]="'neutral'" [dot]="false" />
                  </div>
                }
              </div>
            }
          </section>
        }
      }
    }
  `,
})
export class StudentScolarite {
  private readonly api = inject(StudentService);
  private readonly notify = inject(NotificationService);

  protected readonly tabs = [
    { key: 'grades' as const, label: 'Notes' },
    { key: 'bulletins' as const, label: 'Bulletins' },
    { key: 'schedule' as const, label: 'Emploi du temps' },
    { key: 'attendance' as const, label: 'Présences' },
  ];
  protected readonly tab = signal<'grades' | 'bulletins' | 'schedule' | 'attendance'>('grades');

  protected readonly loading = signal(true);
  protected readonly subjects = signal<AnnualAverageResult[]>([]);
  protected readonly overallPercent = signal<number | null>(null);
  protected readonly grades = signal<Grade[]>([]);
  protected readonly bulletins = signal<Bulletin[]>([]);
  protected readonly attendance = signal<Record<string, unknown>[]>([]);
  protected readonly scheduleSlots = signal<ScheduleSlot[]>([]);

  protected readonly scheduleDays = computed(() =>
    [...new Set(this.scheduleSlots().map((s) => s.day))].sort((a, b) => a - b),
  );

  constructor() {
    this.api.me().subscribe({
      next: (me) => this.loadAll(extractContext(me)),
      error: () => this.loading.set(false),
    });
  }

  private loadAll(ctx: StudentContext): void {
    forkJoin({
      averages: ctx.classId
        ? this.api
            .averages(ctx.studentId, ctx.classId, ctx.schoolYear)
            .pipe(catchError(() => of(null)))
        : of(null),
      grades: this.api.grades(ctx.studentId, ctx.schoolYear).pipe(catchError(() => of([]))),
      bulletins: this.api.bulletins(ctx.studentId).pipe(catchError(() => of([]))),
      attendance: this.api.attendance(ctx.studentId).pipe(catchError(() => of([]))),
      schedule: ctx.classId
        ? this.api.schedule(ctx.classId, ctx.schoolYear).pipe(catchError(() => of({})))
        : of({}),
    }).subscribe((r) => {
      if (r.averages) {
        this.subjects.set(r.averages.subjectAverages ?? []);
        const o = r.averages.overallAveragePercent ?? r.averages.overallAverage;
        this.overallPercent.set(o === undefined ? null : Math.round(o));
      }
      this.grades.set(r.grades);
      this.bulletins.set(r.bulletins);
      this.attendance.set(r.attendance);
      this.scheduleSlots.set(normalizeSchedule(r.schedule));
      this.loading.set(false);
    });
  }

  /* -------------------------------- Bulletins ------------------------------- */

  openPdf(b: Bulletin): void {
    this.api.bulletinPdf(b.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.api.markBulletinViewed(b.id).subscribe({ error: () => undefined });
      },
      error: () => this.notify.error('PDF indisponible.'),
    });
  }

  /* -------------------------------- Helpers --------------------------------- */

  protected num(v: unknown): number {
    const n = typeof v === 'string' ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  protected subjLabel(a: AnnualAverageResult): string {
    const o = a as Record<string, unknown>;
    return (
      (o['subjectLabel'] as string) ||
      (o['labelFr'] as string) ||
      (o['subject'] as string) ||
      (o['programCode'] as string) ||
      'Matière'
    );
  }
  protected subjPct(a: AnnualAverageResult): number {
    const v = a.annualAveragePercent ?? a.annualAverage ?? 0;
    return Math.round(Math.max(0, Math.min(100, v)));
  }
  protected avgColor(p: number): string {
    return p >= 75 ? 'var(--success)' : p >= 50 ? 'var(--brand-700)' : 'var(--danger)';
  }
  protected courseLabel(g: Grade): string {
    const o = g as Record<string, unknown>;
    const slot = o['nationalProgramSlot'] as Record<string, unknown> | undefined;
    return (
      (slot?.['labelFr'] as string) ||
      (slot?.['programCode'] as string) ||
      (o['subjectLabel'] as string) ||
      'Cours'
    );
  }
  protected dayName(d: number): string {
    return DAYS[d] ?? `Jour ${d}`;
  }
  protected slotsOfDay(d: number): ScheduleSlot[] {
    return this.scheduleSlots()
      .filter((s) => s.day === d)
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  protected countStatus(status: string): number {
    return this.attendance().filter((a) => a['status'] === status).length;
  }
  protected color(a: Record<string, unknown>): string {
    return statusColor(a['status'] as string | undefined);
  }
  protected statusFr(a: Record<string, unknown>): string {
    return statusLabel(a['status'] as string | undefined);
  }
  protected asDate(v: unknown): string | null {
    return v ? String(v) : null;
  }
}

/* -------------------------------------------------------------------------- */

const DAY_KEYS: Record<string, number> = {
  monday: 1,
  lundi: 1,
  tuesday: 2,
  mardi: 2,
  wednesday: 3,
  mercredi: 3,
  thursday: 4,
  jeudi: 4,
  friday: 5,
  vendredi: 5,
  saturday: 6,
  samedi: 6,
  sunday: 7,
  dimanche: 7,
};

/** Normalise l'emploi du temps quelle que soit sa forme (objet par jour ou liste). */
function normalizeSchedule(data: unknown): ScheduleSlot[] {
  const out: ScheduleSlot[] = [];
  const push = (raw: unknown, dayHint?: number) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const day = dayHint ?? toDay(o['weekdayIso'] ?? o['weekday'] ?? o['day']);
    if (!day) {
      return;
    }
    out.push({
      day,
      start: String(o['startTime'] ?? o['start'] ?? '').slice(0, 5),
      end: String(o['endTime'] ?? o['end'] ?? '').slice(0, 5),
      label: String(
        o['label'] ??
          o['subject'] ??
          o['courseName'] ??
          o['subjectLabel'] ??
          o['nationalProgramSlot'] ??
          'Cours',
      ),
      room: (o['room'] ?? o['roomNumber']) as string | undefined,
    });
  };

  if (Array.isArray(data)) {
    data.forEach((s) => push(s));
    return out;
  }
  const obj = (data ?? {}) as Record<string, unknown>;
  const slots = obj['slots'] ?? obj['scheduleSlots'] ?? obj['schedule'];
  if (Array.isArray(slots)) {
    slots.forEach((s) => push(s));
    return out;
  }
  // Forme objet par jour : { monday: [...], ... }.
  for (const [key, value] of Object.entries(obj)) {
    const day = DAY_KEYS[key.toLowerCase()];
    if (day && Array.isArray(value)) {
      value.forEach((s) => push(s, day));
    }
  }
  return out;
}

function toDay(v: unknown): number {
  if (typeof v === 'number') {
    return v;
  }
  const s = String(v ?? '').toLowerCase();
  if (DAY_KEYS[s]) {
    return DAY_KEYS[s];
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
