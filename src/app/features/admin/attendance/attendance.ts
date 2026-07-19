import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AttendanceService } from '../services/attendance.service';
import { ClassesService } from '../services/classes.service';
import { StudentsService } from '../services/students.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { DateField } from '../../../shared/ui/date-field';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { ClassInstance, ClassScheduleSlot, Student } from '../models/admin.models';
import type { Attendance as AttendanceLine, ClassReportRow } from '../models/attendance.models';
import {
  ABSENCE_STATUSES,
  ATTENDANCE_STATUS_OPTIONS,
  ATTENDANCE_TYPE_OPTIONS,
  statusColor,
  type AttendanceStatus,
} from '../../../core/models/attendance.enums';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

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
    MatMenuModule,
    MatSelectModule,
    MatSlideToggleModule,
    Avatar,
    EmptyState,
    PageHeader,
    DateField,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="fact_check"
      title="Présences"
      subtitle="Appel, justifications & rapports"
    />

    <!-- Contexte -->
    <div class="panga-card p-5 mb-6 flex flex-wrap items-end gap-3">
      <mat-form-field appearance="outline" class="flex-1 min-w-55">
        <mat-label>Classe</mat-label>
        <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <panga-date-field
        class="min-w-40"
        label="Date"
        [formControl]="dateCtrl"
        (changed)="reload()"
      />
      <mat-form-field appearance="outline" class="min-w-37.5">
        <mat-label>Mode</mat-label>
        <mat-select [value]="mode()" (selectionChange)="setMode($event.value)">
          @for (m of modes; track m.value) {
            <mat-option [value]="m.value">{{ m.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (mode() === 'period') {
        <mat-form-field appearance="outline" class="flex-1 min-w-55">
          <mat-label>Créneau</mat-label>
          <mat-select [value]="slotId()" (selectionChange)="slotId.set($event.value)">
            @for (s of slots(); track s.id) {
              <mat-option [value]="s.id">{{ slotLabel(s) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
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
    } @else {
      <!-- Onglets -->
      <div class="flex gap-1 mb-4 p-1 rounded-xl bg-(--background) w-fit border border-(--border)">
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

      @switch (tab()) {
        @case ('appel') {
          @if (roster().length === 0) {
            <div class="panga-card">
              <panga-empty-state
                icon="group"
                title="Aucun élève"
                description="Cette classe n'a pas d'élèves."
              />
            </div>
          } @else if (mode() === 'period' && slots().length === 0) {
            <div class="panga-card">
              <panga-empty-state
                icon="schedule"
                title="Aucun créneau ce jour"
                description="L'emploi du temps ne prévoit pas de cours pour cette date. Choisissez le mode « Journée » ou une autre date."
              />
            </div>
          } @else {
            <section class="panga-card p-5">
              <panga-section-header icon="fact_check" title="Appel" [count]="roster().length">
                <div class="flex flex-wrap gap-2">
                  <button
                    mat-stroked-button
                    class="rounded-xl!"
                    (click)="markAllPresent()"
                    [disabled]="saving()"
                  >
                    <mat-icon fontSet="material-symbols-outlined">done_all</mat-icon> Tous présents
                  </button>
                  <button
                    mat-flat-button
                    class="rounded-xl!"
                    (click)="saveAll()"
                    [disabled]="saving()"
                  >
                    <mat-icon fontSet="material-symbols-outlined">save</mat-icon>
                    {{ saving() ? 'Enregistrement…' : 'Enregistrer les présences' }}
                  </button>
                </div>
              </panga-section-header>

              <div class="divide-y divide-(--border) -mx-5">
                @for (s of roster(); track s.id) {
                  <div class="px-5 py-3">
                    <div class="flex items-center gap-4">
                      <panga-avatar [name]="studentName(s)" [size]="38" />
                      <p class="min-w-0 flex-1 text-sm font-medium text-(--text) truncate">
                        {{ studentName(s) }}
                      </p>
                      <span
                        class="h-2.5 w-2.5 rounded-full shrink-0"
                        [style.background]="
                          entryFor(s.id) ? color(statusOf(s.id)) : 'var(--border)'
                        "
                      ></span>
                      <mat-form-field appearance="outline" class="w-40!" subscriptSizing="dynamic">
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

                    <!-- Justification -->
                    @if (entryFor(s.id); as e) {
                      @if (needsJustify(e)) {
                        <div class="flex items-center gap-2 mt-2 pl-13.5">
                          @if (!e.isExcused) {
                            <button mat-button class="rounded-lg!" (click)="openJustify(e)">
                              <mat-icon fontSet="material-symbols-outlined" class="text-[18px]!"
                                >note_add</mat-icon
                              >
                              Justifier
                            </button>
                          } @else if (!e.excuseApproved) {
                            <panga-status-badge
                              label="Justif. en attente"
                              tone="warning"
                              [dot]="false"
                            />
                            @if (e.excuseReason) {
                              <span class="text-xs text-(--text-muted) truncate">{{
                                e.excuseReason
                              }}</span>
                            }
                            @if (isAdmin()) {
                              <button
                                mat-button
                                class="rounded-lg! text-(--success)!"
                                (click)="review(e, true)"
                              >
                                Approuver
                              </button>
                              <button
                                mat-button
                                class="rounded-lg! text-(--danger)!"
                                (click)="review(e, false)"
                              >
                                Rejeter
                              </button>
                            }
                          } @else {
                            <panga-status-badge
                              label="Absence justifiée"
                              tone="success"
                              [dot]="false"
                            />
                          }
                        </div>
                      }

                      <!-- Formulaire de justification -->
                      @if (justifyId() === e.id) {
                        <div
                          class="mt-3 ml-13.5 rounded-2xl border border-(--brand-300) bg-(--brand-50) p-4"
                        >
                          <mat-form-field appearance="outline" class="w-full">
                            <mat-label>Motif</mat-label>
                            <input
                              matInput
                              [formControl]="reasonCtrl"
                              placeholder="ex. Rendez-vous médical"
                            />
                          </mat-form-field>
                          <div class="flex flex-wrap items-center gap-4 mt-1">
                            <mat-slide-toggle [formControl]="medicalCtrl"
                              >Certificat médical</mat-slide-toggle
                            >
                            <button
                              type="button"
                              mat-stroked-button
                              class="rounded-xl!"
                              (click)="fileInput.click()"
                            >
                              <mat-icon fontSet="material-symbols-outlined">attach_file</mat-icon>
                              {{ fileName() || 'Joindre un document' }}
                            </button>
                            <input
                              #fileInput
                              type="file"
                              class="hidden"
                              accept=".pdf,image/jpeg,image/png,image/webp"
                              (change)="pickFile($event)"
                            />
                            <div class="flex-1"></div>
                            <button mat-button (click)="closeJustify()">Annuler</button>
                            <button
                              mat-flat-button
                              class="rounded-xl!"
                              [disabled]="!reasonCtrl.value || submittingJustify()"
                              (click)="submitJustify(e)"
                            >
                              Envoyer
                            </button>
                          </div>
                        </div>
                      }
                    }
                  </div>
                }
              </div>
            </section>
          }
        }

        @case ('report') {
          <section class="panga-card p-5">
            <panga-section-header
              icon="summarize"
              title="Rapport d'absences"
              [count]="report().length"
            >
              <panga-date-field
                class="w-37.5 -mb-5!"
                label="Du"
                subscriptSizing="dynamic"
                [formControl]="fromCtrl"
              />
              <panga-date-field
                class="w-37.5 -mb-5!"
                label="Au"
                subscriptSizing="dynamic"
                [formControl]="toCtrl"
              />
              <button
                mat-flat-button
                class="rounded-xl!"
                (click)="loadReport()"
                [disabled]="loadingReport()"
              >
                <mat-icon fontSet="material-symbols-outlined">refresh</mat-icon> Générer
              </button>
            </panga-section-header>

            @if (loadingReport()) {
              <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
            } @else if (report().length === 0) {
              <panga-empty-state
                icon="summarize"
                title="Aucune donnée"
                description="Générez le rapport pour la période choisie."
              />
            } @else {
              <div class="overflow-x-auto -mx-5">
                <table class="w-full text-sm">
                  <thead class="text-(--text-muted) text-left text-xs">
                    <tr class="border-b border-(--border)">
                      <th class="px-5 py-2 font-medium">Élève</th>
                      <th class="px-2 py-2 font-medium text-center">Absences</th>
                      <th class="px-2 py-2 font-medium text-center">Justifiées</th>
                      <th class="px-2 py-2 font-medium text-center">Non justif.</th>
                      <th class="px-2 py-2 font-medium text-center">Retards</th>
                      <th class="px-5 py-2 font-medium text-center">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of report(); track r.studentId || $index) {
                      <tr
                        class="border-b border-(--border) last:border-0"
                        [style.background]="
                          r.overLimit ? 'color-mix(in srgb, var(--danger) 6%, transparent)' : ''
                        "
                      >
                        <td class="px-5 py-2.5">
                          <div class="flex items-center gap-2">
                            <panga-avatar [name]="r.studentName || '?'" [size]="28" />
                            <span class="text-(--text) truncate">{{
                              r.studentName || r.studentId
                            }}</span>
                            @if (r.overLimit) {
                              <panga-status-badge
                                label="Seuil dépassé"
                                tone="danger"
                                [dot]="false"
                              />
                            }
                          </div>
                        </td>
                        <td class="px-2 py-2.5 text-center text-(--text)">
                          {{ r.absences ?? 0 }}
                        </td>
                        <td class="px-2 py-2.5 text-center text-(--success)">
                          {{ r.justifiedAbsences ?? 0 }}
                        </td>
                        <td class="px-2 py-2.5 text-center text-(--danger)">
                          {{ r.unjustifiedAbsences ?? 0 }}
                        </td>
                        <td class="px-2 py-2.5 text-center text-(--warning)">
                          {{ r.lates ?? 0 }}
                        </td>
                        <td class="px-5 py-2.5 text-center font-medium text-(--text)">
                          {{ rate(r) }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }
      }
    }
  `,
})
export class Attendance {
  private readonly attendanceApi = inject(AttendanceService);
  private readonly classesApi = inject(ClassesService);
  private readonly studentsApi = inject(StudentsService);
  private readonly store = inject(AuthStore);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly statuses = ATTENDANCE_STATUS_OPTIONS;
  protected readonly modes = ATTENDANCE_TYPE_OPTIONS;
  protected readonly tabs = [
    { key: 'appel' as const, label: 'Appel' },
    { key: 'report' as const, label: 'Rapport' },
  ];

  protected readonly isAdmin = computed(
    () => this.store.role() === 'admin' || this.store.role() === 'super_admin',
  );

  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classId = signal('');
  protected readonly dateCtrl = new FormControl(today(), { nonNullable: true });
  protected readonly mode = signal<'daily' | 'period'>('daily');
  protected readonly tab = signal<'appel' | 'report'>('appel');

  protected readonly slots = signal<ClassScheduleSlot[]>([]);
  protected readonly slotId = signal('');
  protected readonly entries = signal<AttendanceLine[]>([]);
  protected readonly saving = signal(false);

  /**
   * Roster de la classe, chargé côté serveur via le filtre `classId` de
   * `GET /students`. On ne peut pas filtrer côté client sur `classInstanceId` :
   * l'entité élève renvoie la classe sous `classId` (non normalisé), le filtre
   * client renvoyait donc systématiquement une liste vide.
   */
  protected readonly roster = signal<Student[]>([]);

  /* ----------------------------- Justification ----------------------------- */
  protected readonly justifyId = signal<string | null>(null);
  protected readonly reasonCtrl = new FormControl('', { nonNullable: true });
  protected readonly medicalCtrl = new FormControl(false, { nonNullable: true });
  protected readonly fileName = signal('');
  protected readonly submittingJustify = signal(false);
  private file: File | null = null;

  /* -------------------------------- Rapport -------------------------------- */
  protected readonly fromCtrl = new FormControl('', { nonNullable: true });
  protected readonly toCtrl = new FormControl('', { nonNullable: true });
  protected readonly report = signal<ClassReportRow[]>([]);
  protected readonly loadingReport = signal(false);

  constructor() {
    // Recharge les classes à chaque changement d'année (sélecteur global).
    // Le roster, lui, est chargé par classe (cf. selectClass).
    effect(() => {
      this.sy.selected();
      untracked(() => {
        this.classesApi
          .list(this.sy.filter())
          .subscribe({ next: (r) => this.classes.set(r.items) });
        this.roster.set([]);
        this.classId.set('');
      });
    });
  }

  /* ------------------------------- Sélection ------------------------------- */

  selectClass(id: string): void {
    this.classId.set(id);
    this.report.set([]);
    // Roster côté serveur : filtre `classId` = id de l'instance de classe.
    this.studentsApi
      .list({ page: 1, limit: 500, classId: id, schoolYear: this.sy.filter() })
      .subscribe({
        next: (r) => this.roster.set(r.items),
        error: () => this.roster.set([]),
      });
    this.reload();
  }

  setMode(mode: 'daily' | 'period'): void {
    this.mode.set(mode);
    this.closeJustify();
  }

  reload(): void {
    if (!this.classId()) {
      return;
    }
    this.closeJustify();
    this.attendanceApi.dailySheet(this.classId(), this.dateCtrl.value).subscribe({
      next: (sheet) => {
        this.slots.set(sheet.slots);
        this.entries.set(sheet.entries);
        if (this.mode() === 'period' && !this.slotId() && sheet.slots.length) {
          this.slotId.set(sheet.slots[0].id ?? '');
        }
      },
      error: () => {
        this.slots.set([]);
        this.entries.set([]);
      },
    });
  }

  /* --------------------------------- Appel --------------------------------- */

  protected entryFor(studentId: string): AttendanceLine | undefined {
    if (this.mode() === 'period') {
      const slot = this.slotId();
      return this.entries().find(
        (e) => e.studentId === studentId && e.classScheduleSlotId === slot,
      );
    }
    return this.entries().find(
      (e) => e.studentId === studentId && (e.attendanceType === 'daily' || !e.classScheduleSlotId),
    );
  }

  protected statusOf(studentId: string): string {
    return this.entryFor(studentId)?.status ?? 'present';
  }

  setStatus(studentId: string, status: AttendanceStatus): void {
    this.saving.set(true);
    this.persist(studentId, status).subscribe({
      next: () => {
        this.saving.set(false);
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  markAllPresent(): void {
    const targets = this.roster().filter(
      (s) => this.statusOf(s.id) !== 'present' || !this.entryFor(s.id),
    );
    if (!targets.length) {
      this.notify.info('Tous les élèves sont déjà présents.');
      return;
    }
    this.saving.set(true);
    forkJoin(targets.map((s) => this.persist(s.id, 'present'))).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Appel enregistré.');
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  /**
   * Enregistre l'appel complet : chaque élève avec le statut actuellement affiché
   * (les « présent » par défaut inclus, qui autrement ne seraient jamais persistés
   * puisque la sauvegarde ligne-par-ligne ne se déclenche qu'au changement).
   */
  saveAll(): void {
    const targets = this.roster();
    if (!targets.length || this.saving()) {
      return;
    }
    this.saving.set(true);
    forkJoin(
      targets.map((s) => this.persist(s.id, this.statusOf(s.id) as AttendanceStatus)),
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Présences enregistrées.');
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  private persist(studentId: string, status: AttendanceStatus) {
    return this.attendanceApi.upsert({
      studentId,
      classInstanceId: this.classId(),
      date: this.dateCtrl.value,
      attendanceType: this.mode(),
      status,
      ...(this.mode() === 'period' && this.slotId() ? { classScheduleSlotId: this.slotId() } : {}),
    });
  }

  /* ----------------------------- Justification ----------------------------- */

  protected needsJustify(e: AttendanceLine): boolean {
    return ABSENCE_STATUSES.has(e.status ?? '') && e.status !== 'excused';
  }

  openJustify(e: AttendanceLine): void {
    this.justifyId.set(e.id);
    this.reasonCtrl.setValue(e.excuseReason ?? '');
    this.medicalCtrl.setValue(false);
    this.file = null;
    this.fileName.set('');
  }

  closeJustify(): void {
    this.justifyId.set(null);
    this.file = null;
    this.fileName.set('');
  }

  pickFile(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.file = f;
    this.fileName.set(f?.name ?? '');
  }

  submitJustify(e: AttendanceLine): void {
    if (!this.reasonCtrl.value || this.submittingJustify()) {
      return;
    }
    this.submittingJustify.set(true);
    this.attendanceApi
      .submitJustification(
        e.id,
        { excuseReason: this.reasonCtrl.value, isMedical: this.medicalCtrl.value },
        this.file,
      )
      .subscribe({
        next: () => {
          this.submittingJustify.set(false);
          this.notify.success('Justification envoyée.');
          this.closeJustify();
          this.reload();
        },
        error: () => this.submittingJustify.set(false),
      });
  }

  review(e: AttendanceLine, approve: boolean): void {
    this.attendanceApi.reviewJustification(e.id, { approve }).subscribe({
      next: () => {
        this.notify.success(approve ? 'Justification approuvée.' : 'Justification rejetée.');
        this.reload();
      },
    });
  }

  /* -------------------------------- Rapport -------------------------------- */

  loadReport(): void {
    if (!this.classId()) {
      return;
    }
    this.loadingReport.set(true);
    this.attendanceApi
      .classReport(this.classId(), {
        from: this.fromCtrl.value || undefined,
        to: this.toCtrl.value || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.report.set(rows);
          this.loadingReport.set(false);
        },
        error: () => {
          this.report.set([]);
          this.loadingReport.set(false);
        },
      });
  }

  /* -------------------------------- Helpers -------------------------------- */

  protected studentName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id;
  }
  protected slotLabel(s: ClassScheduleSlot): string {
    const time = [s.startTime, s.endTime].filter(Boolean).join('–');
    return [time, s.label].filter(Boolean).join(' · ') || s.id || 'Créneau';
  }
  protected color(status: string): string {
    return statusColor(status);
  }
  protected rate(r: ClassReportRow): string {
    return r.attendanceRate === undefined ? '—' : `${Math.round(r.attendanceRate)}%`;
  }
}
