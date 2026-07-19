import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '../../../core/auth/auth.store';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { DateField } from '../../../shared/ui/date-field';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { PaginationMeta } from '../../../core/models/api.models';
import { AcademicsService } from '../services/academics.service';
import { ClassesService } from '../services/classes.service';
import { CourseJournalService } from '../services/course-journal.service';
import { ParentsService } from '../services/parents.service';
import { SubjectsService } from '../services/subjects.service';
import type { OpenFromProgramResult } from '../services/subjects.service';
import { TeachersService } from '../services/teachers.service';
import { CurriculumService } from '../../super-admin/services/curriculum.service';
import type { ClassInstance, Period, Teacher } from '../models/admin.models';
import type { NationalProgram } from '../../super-admin/models/platform.models';
import type { ClassSubject, CourseOverviewRow, LessonLogEntry } from '../models/course.models';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';
import { periodLabel } from '../../../core/models/grade.enums';

interface ChildRef {
  studentId: string;
  name: string;
}

/** Ligne cochable de l'ouverture des cours (un slot de programme). */
interface SlotRow {
  id: string;
  code: string;
  label: string;
}

/** Journal de cours (cahier de texte) : progression, séances, heures prévues. */
@Component({
  selector: 'panga-course-journal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatTooltipModule,
    EmptyState,
    PageHeader,
    Paginator,
    DateField,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="auto_stories"
      title="Journal de cours"
      subtitle="Cahier de texte & avancement des programmes"
    />

    <!-- Filtres -->
    <div class="panga-card p-5 mb-6 flex flex-wrap items-end gap-3">
      <mat-form-field appearance="outline" class="w-37.5">
        <mat-label>Année scolaire</mat-label>
        <input matInput [formControl]="schoolYear" placeholder="Année en cours" (blur)="reload()" />
      </mat-form-field>

      @if (isParent()) {
        <mat-form-field appearance="outline" class="flex-1 min-w-55">
          <mat-label>Enfant</mat-label>
          <mat-select [value]="studentId()" (selectionChange)="selectStudent($event.value)">
            @for (c of children(); track c.studentId) {
              <mat-option [value]="c.studentId">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      } @else {
        <mat-form-field appearance="outline" class="flex-1 min-w-55">
          <mat-label>Classe</mat-label>
          <mat-select [value]="classInstanceId()" (selectionChange)="selectClass($event.value)">
            @for (c of classes(); track c.id) {
              <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      @if (periods().length) {
        <mat-form-field appearance="outline" class="min-w-45">
          <mat-label>Période</mat-label>
          <mat-select [value]="periodId()" (selectionChange)="selectPeriod($event.value)">
            <mat-option [value]="''">Toutes les périodes</mat-option>
            @for (p of periods(); track p.id) {
              <mat-option [value]="p.id">{{ periodLabel(p) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      @if (subjects().length) {
        <mat-form-field appearance="outline" class="min-w-45">
          <mat-label>Cours</mat-label>
          <mat-select
            [value]="courseFilterId()"
            (selectionChange)="selectCourseFilter($event.value)"
          >
            <mat-option [value]="''">Tous les cours</mat-option>
            @for (cs of subjects(); track cs.id) {
              <mat-option [value]="cs.id">{{ subjectLabel(cs) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
    </div>

    @if (!hasContext()) {
      <div class="panga-card">
        <panga-empty-state
          icon="auto_stories"
          [title]="isParent() ? 'Choisissez un enfant' : 'Choisissez une classe'"
          description="Sélectionnez un contexte pour afficher l'avancement et les séances."
        />
      </div>
    } @else {
      <!-- Programme de la classe (admin) -->
      @if (isAdmin() && classInstanceId()) {
        <section class="panga-card p-5 mb-6">
          <panga-section-header icon="menu_book" title="Programme national de la classe" />
          <div class="flex flex-wrap items-end gap-3">
            <mat-form-field appearance="outline" class="flex-1 min-w-65">
              <mat-label>Programme publié</mat-label>
              <mat-select [formControl]="programCtrl">
                @for (p of programs(); track p.id) {
                  <mat-option [value]="p.id">
                    {{ p.title || p.code }}
                    @if (p['activeForSchool']) {
                      — actif
                    }
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button
              mat-stroked-button
              class="rounded-xl!"
              [disabled]="!programCtrl.value || busyProgram()"
              (click)="activateProgram()"
              matTooltip="Activer ce programme pour l'école"
            >
              <mat-icon fontSet="material-symbols-outlined">check_circle</mat-icon> Activer (école)
            </button>
            <button
              mat-flat-button
              class="rounded-xl!"
              [disabled]="!programCtrl.value || busyProgram()"
              (click)="assignProgram()"
              matTooltip="Lier le programme à cette classe (instance)"
            >
              <mat-icon fontSet="material-symbols-outlined">link</mat-icon> Assigner à la classe
            </button>
            <button
              mat-stroked-button
              class="rounded-xl!"
              [disabled]="!programCtrl.value || busyProgram()"
              (click)="prepareOpenCourses()"
              matTooltip="Ouvrir les cours à partir du programme assigné"
            >
              <mat-icon fontSet="material-symbols-outlined">playlist_add</mat-icon> Ouvrir les cours
            </button>
          </div>
          <p class="text-xs text-(--text-muted) mt-2">
            Le programme doit être <b>publié</b> puis <b>activé pour l'école</b> avant d'être
            assigné à la classe. L'assignation sur l'instance est prioritaire sur le modèle.
            <b>Lier ≠ peupler</b> : il reste à ouvrir les cours ci-dessous.
          </p>

          <div class="flex flex-wrap items-center gap-2 mt-3">
            <button
              mat-stroked-button
              class="rounded-xl!"
              [disabled]="seedingPeriods()"
              (click)="seedPeriods()"
              matTooltip="Crée les périodes manquantes pour toutes les classes de l'école"
            >
              <mat-icon fontSet="material-symbols-outlined">event_repeat</mat-icon>
              Générer les périodes
            </button>
            <span class="text-xs text-(--text-muted)">
              Périodes manquantes pour {{ yr() }} — toutes les classes de l'école.
            </span>
          </div>

          <!-- Ouverture des cours depuis le programme -->
          @if (showOpenPanel()) {
            <div class="mt-4 rounded-2xl border border-(--border) p-4">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p class="text-sm font-medium text-(--text)">
                  Matières du programme — décochez celles non dispensées
                </p>
                <span class="text-xs text-(--text-muted)">
                  {{ includedCount() }}/{{ programSlots().length }} à ouvrir
                </span>
              </div>

              @if (programSlots().length) {
                <div class="grid gap-1.5 sm:grid-cols-2">
                  @for (s of programSlots(); track s.code) {
                    <mat-checkbox
                      [checked]="!excluded().has(s.code)"
                      (change)="toggleExclude(s.code)"
                    >
                      <span class="text-sm text-(--text)">{{ s.label }}</span>
                    </mat-checkbox>
                  }
                </div>

                <div class="flex flex-wrap items-center gap-2 mt-4">
                  <button
                    mat-flat-button
                    class="rounded-xl!"
                    [disabled]="openingCourses() || !includedCount()"
                    (click)="openCourses()"
                  >
                    <mat-icon fontSet="material-symbols-outlined">playlist_add_check</mat-icon>
                    Ouvrir {{ includedCount() }} cours
                  </button>
                  <button mat-button class="rounded-xl!" (click)="showOpenPanel.set(false)">
                    Fermer
                  </button>
                </div>

                @if (openResult(); as r) {
                  <div class="flex flex-wrap gap-1.5 mt-3">
                    <panga-status-badge
                      [label]="r.opened + ' ouverts'"
                      tone="success"
                      [dot]="false"
                    />
                    @if (r.skippedExisting) {
                      <panga-status-badge
                        [label]="r.skippedExisting + ' déjà ouverts'"
                        tone="neutral"
                        [dot]="false"
                      />
                    }
                    @if (r.skippedExcluded) {
                      <panga-status-badge
                        [label]="r.skippedExcluded + ' exclus'"
                        tone="warning"
                        [dot]="false"
                      />
                    }
                  </div>
                }
              } @else {
                <p class="text-sm text-(--text-muted)">Ce programme n'a aucune matière.</p>
              }
            </div>
          }
        </section>
      }

      <!-- Avancement -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header
          icon="trending_up"
          title="Avancement par cours"
          [count]="overview().length"
        >
          @if (totalPlanned() > 0) {
            <panga-status-badge
              [label]="globalRatioPct() + '% réalisé'"
              [tone]="
                globalRatioPct() >= 80 ? 'success' : globalRatioPct() >= 40 ? 'brand' : 'warning'
              "
              [dot]="false"
            />
          }
        </panga-section-header>

        @if (loadingOverview()) {
          <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
        } @else if (overview().length === 0) {
          <panga-empty-state
            icon="trending_up"
            title="Aucun avancement"
            description="Définissez des heures prévues et enregistrez des séances pour voir la progression."
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
              <div class="rounded-2xl border border-(--border) p-4">
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

      <!-- Cours ouverts (admin) : enseignant / volume / suppression -->
      @if (isAdmin() && classInstanceId() && subjects().length) {
        <section class="panga-card p-5 mb-6">
          <panga-section-header
            icon="menu_book"
            title="Cours ouverts"
            [count]="subjects().length"
          />
          <form
            [formGroup]="courseForm"
            (ngSubmit)="saveCourse()"
            class="flex flex-wrap items-end gap-3 mb-4"
          >
            <mat-form-field appearance="outline" class="flex-1 min-w-55">
              <mat-label>Cours</mat-label>
              <mat-select
                formControlName="classSubjectId"
                (selectionChange)="onCoursePick($event.value)"
              >
                @for (cs of subjects(); track cs.id) {
                  <mat-option [value]="cs.id">{{ subjectLabel(cs) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1 min-w-45">
              <mat-label>Enseignant</mat-label>
              <mat-select formControlName="teacherId">
                <mat-option [value]="''">—</mat-option>
                @for (t of teachers(); track t.id) {
                  <mat-option [value]="t.id">{{ teacherLabel(t) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-32">
              <mat-label>H / semaine</mat-label>
              <input matInput type="number" formControlName="hoursPerWeek" min="0" />
            </mat-form-field>
            <button
              mat-flat-button
              class="rounded-xl!"
              type="submit"
              [disabled]="courseForm.invalid || savingCourse()"
            >
              {{ savingCourse() ? '…' : 'Enregistrer' }}
            </button>
          </form>

          <div class="rounded-xl border border-(--border) divide-y divide-(--border)">
            @for (cs of subjects(); track cs.id) {
              <div class="flex items-center justify-between gap-3 px-3 py-2">
                <div class="min-w-0">
                  <p class="text-sm text-(--text) truncate">{{ subjectLabel(cs) }}</p>
                  <p class="text-xs text-(--text-muted) truncate">
                    {{ courseTeacherName(cs) || 'Sans enseignant' }} ·
                    {{ cs.hoursPerWeek ?? '—' }} h/sem
                  </p>
                </div>
                <button
                  mat-icon-button
                  type="button"
                  matTooltip="Fermer ce cours"
                  [disabled]="deletingCourseId() === cs.id"
                  (click)="deleteCourse(cs)"
                >
                  <mat-icon fontSet="material-symbols-outlined" style="color: var(--danger)"
                    >delete</mat-icon
                  >
                </button>
              </div>
            }
          </div>
        </section>
      }

      <!-- Heures prévues (admin) -->
      @if (isAdmin() && classInstanceId()) {
        <section class="panga-card p-5 mb-6">
          <panga-section-header icon="schedule" title="Définir les heures prévues" />
          <form
            [formGroup]="targetForm"
            (ngSubmit)="saveTarget()"
            class="flex flex-wrap items-end gap-3"
          >
            <mat-form-field appearance="outline" class="flex-1 min-w-55">
              <mat-label>Cours</mat-label>
              <mat-select formControlName="classSubjectId">
                @for (cs of subjects(); track cs.id) {
                  <mat-option [value]="cs.id">{{ subjectLabel(cs) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="min-w-45">
              <mat-label>Période</mat-label>
              <mat-select formControlName="periodId">
                @for (p of periods(); track p.id) {
                  <mat-option [value]="p.id">{{ periodLabel(p) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-35">
              <mat-label>Heures prévues</mat-label>
              <input
                matInput
                type="number"
                formControlName="plannedHours"
                min="0"
                max="99999.99"
                step="any"
              />
            </mat-form-field>
            <button
              mat-flat-button
              class="rounded-xl!"
              type="submit"
              [disabled]="targetForm.invalid || savingTarget()"
            >
              Enregistrer
            </button>
          </form>
          @if (subjects().length === 0) {
            <p class="text-sm text-(--warning) mt-3">
              Aucun cours ouvert sur cette classe. Assignez un programme puis ouvrez les cours
              (matières).
            </p>
          }
        </section>
      }

      <!-- Séances -->
      <section class="panga-card p-5">
        <panga-section-header
          icon="event_note"
          title="Séances enregistrées"
          [count]="entriesMeta()?.total ?? entries().length"
        >
          @if (canEdit() && classInstanceId()) {
            <button mat-flat-button class="rounded-xl!" (click)="toggleForm()">
              <mat-icon fontSet="material-symbols-outlined">{{
                showForm() ? 'close' : 'add'
              }}</mat-icon>
              {{ showForm() ? 'Annuler' : 'Nouvelle séance' }}
            </button>
          }
        </panga-section-header>

        @if (showForm() && canEdit()) {
          <form [formGroup]="entryForm" (ngSubmit)="submitEntry()" class="mb-6">
            <div class="grid gap-4 sm:grid-cols-2">
              <mat-form-field appearance="outline">
                <mat-label>Cours</mat-label>
                <mat-select formControlName="classSubjectId">
                  @for (cs of subjects(); track cs.id) {
                    <mat-option [value]="cs.id">{{ subjectLabel(cs) }}</mat-option>
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
              <panga-date-field
                class="w-full"
                label="Date de la séance"
                formControlName="lessonDate"
              />
              <mat-form-field appearance="outline">
                <mat-label>Durée (heures)</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="durationHours"
                  min="0.01"
                  max="24"
                  step="any"
                />
              </mat-form-field>
              <mat-form-field appearance="outline" class="sm:col-span-2">
                <mat-label>Titre / objet de la séance</mat-label>
                <input matInput formControlName="title" maxlength="255" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="sm:col-span-2">
                <mat-label>Contenu / résumé</mat-label>
                <textarea matInput rows="2" formControlName="summary" maxlength="5000"></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Devoirs</mat-label>
                <textarea matInput rows="2" formControlName="homework" maxlength="5000"></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Compétences travaillées</mat-label>
                <textarea
                  matInput
                  rows="2"
                  formControlName="skillsCovered"
                  maxlength="5000"
                ></textarea>
              </mat-form-field>
            </div>
            <div class="flex justify-end gap-2">
              <button
                mat-flat-button
                class="rounded-xl!"
                type="submit"
                [disabled]="entryForm.invalid || savingEntry()"
              >
                {{ editingId() ? 'Mettre à jour' : 'Enregistrer la séance' }}
              </button>
            </div>
          </form>
        }

        @if (loadingEntries()) {
          <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
        } @else if (entries().length === 0) {
          <panga-empty-state
            icon="event_note"
            title="Aucune séance"
            description="Aucune séance enregistrée pour ce contexte."
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
                      {{ e.title || '—' }}
                    </p>
                    <panga-status-badge
                      [label]="(e.durationHours || 0) + 'h'"
                      tone="brand"
                      [dot]="false"
                    />
                  </div>
                  <p class="text-xs text-(--text-muted) mt-0.5">
                    {{ e.lessonDate || '—' }}
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
                @if (canEdit()) {
                  <button mat-icon-button [matMenuTriggerFor]="entryMenu" aria-label="Actions">
                    <mat-icon fontSet="material-symbols-outlined">more_vert</mat-icon>
                  </button>
                  <mat-menu #entryMenu="matMenu" class="panga-menu">
                    <button mat-menu-item (click)="editEntry(e)">
                      <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
                      <span>Modifier</span>
                    </button>
                    <button mat-menu-item (click)="deleteEntry(e)">
                      <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
                      <span>Supprimer</span>
                    </button>
                  </mat-menu>
                }
              </div>
            }
          </div>
          @if (entriesMeta(); as m) {
            <panga-paginator [meta]="m" (pageChange)="goPage($event)" />
          }
        }
      </section>
    }
  `,
})
export class CourseJournal {
  private readonly store = inject(AuthStore);
  private readonly classesApi = inject(ClassesService);
  private readonly academics = inject(AcademicsService);
  private readonly subjectsApi = inject(SubjectsService);
  private readonly journal = inject(CourseJournalService);
  private readonly curriculum = inject(CurriculumService);
  private readonly teachersApi = inject(TeachersService);
  private readonly parents = inject(ParentsService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly role = this.store.role;
  protected readonly isAdmin = computed(
    () => this.role() === 'admin' || this.role() === 'super_admin',
  );
  protected readonly isTeacher = computed(() => this.role() === 'teacher');
  protected readonly isParent = computed(() => this.role() === 'parent');
  /**
   * Création/édition de séances : réservée aux enseignants (et super_admin).
   * Le backend impose que seul l'enseignant **assigné à la matière** puisse saisir
   * (403 sinon) — l'admin en est donc volontairement exclu côté UI.
   */
  protected readonly canEdit = computed(
    () => this.role() === 'teacher' || this.role() === 'super_admin',
  );

  /** Initialisé sur le sélecteur global (vide = année en cours → GET sans année). */
  protected readonly schoolYear = new FormControl(this.sy.filter(), { nonNullable: true });

  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classInstanceId = signal('');
  protected readonly children = signal<ChildRef[]>([]);
  protected readonly studentId = signal('');
  protected readonly periods = signal<Period[]>([]);
  protected readonly periodId = signal('');
  /** Filtre « par cours » appliqué à l'aperçu et aux séances (vide = tous). */
  protected readonly courseFilterId = signal('');
  protected readonly subjects = signal<ClassSubject[]>([]);
  protected readonly programs = signal<NationalProgram[]>([]);

  /* --- Gestion des cours ouverts (admin) : enseignant / volume / suppression --- */
  protected readonly teachers = signal<Teacher[]>([]);
  protected readonly savingCourse = signal(false);
  protected readonly deletingCourseId = signal<string | null>(null);

  /* --- Ouverture des cours depuis le programme lié --- */
  protected readonly showOpenPanel = signal(false);
  protected readonly programSlots = signal<SlotRow[]>([]);
  /** Codes de matières décochées (= non dispensées → exclues de l'ouverture). */
  protected readonly excluded = signal<Set<string>>(new Set());
  protected readonly openingCourses = signal(false);
  protected readonly openResult = signal<OpenFromProgramResult | null>(null);
  protected readonly includedCount = computed(
    () => this.programSlots().length - this.excluded().size,
  );
  protected readonly seedingPeriods = signal(false);

  protected readonly overview = signal<CourseOverviewRow[]>([]);
  protected readonly entries = signal<LessonLogEntry[]>([]);
  protected readonly entriesMeta = signal<PaginationMeta | null>(null);

  protected readonly loadingOverview = signal(false);
  protected readonly loadingEntries = signal(false);
  protected readonly busyProgram = signal(false);
  protected readonly savingTarget = signal(false);
  protected readonly savingEntry = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  private page = 1;

  /** Libellés de cours dérivés des slots du programme actif. */
  private readonly slotLabels = signal<Record<string, string>>({});

  protected readonly programCtrl = new FormControl<string>('', { nonNullable: true });

  protected readonly targetForm = new FormGroup({
    classSubjectId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    periodId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    plannedHours: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(99999.99)],
    }),
  });

  /** Édition d'un cours ouvert : enseignant + volume hebdomadaire. */
  protected readonly courseForm = new FormGroup({
    classSubjectId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    teacherId: new FormControl('', { nonNullable: true }),
    hoursPerWeek: new FormControl<number | null>(null),
  });

  protected readonly entryForm = new FormGroup({
    classSubjectId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    periodId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lessonDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    durationHours: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01), Validators.max(24)],
    }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    summary: new FormControl('', { nonNullable: true }),
    homework: new FormControl('', { nonNullable: true }),
    skillsCovered: new FormControl('', { nonNullable: true }),
  });

  protected readonly hasContext = computed(() =>
    this.isParent() ? !!this.studentId() : !!this.classInstanceId(),
  );

  protected readonly totalPlanned = computed(() =>
    round(this.overview().reduce((s, r) => s + r.plannedHours, 0)),
  );
  protected readonly totalDelivered = computed(() =>
    round(this.overview().reduce((s, r) => s + r.deliveredHours, 0)),
  );
  protected readonly totalRemaining = computed(() =>
    round(this.overview().reduce((s, r) => s + r.remainingHours, 0)),
  );
  protected readonly globalRatioPct = computed(() => {
    const p = this.totalPlanned();
    return p > 0 ? Math.round((this.totalDelivered() / p) * 100) : 0;
  });

  constructor() {
    if (this.isParent()) {
      this.loadChildren();
    } else {
      this.loadPrograms();
      if (this.isAdmin()) {
        this.teachersApi
          .list({ page: 1, limit: 200 })
          .subscribe({ next: (r) => this.teachers.set(r.items) });
      }
      // Synchronise le champ année sur le sélecteur global et recharge.
      effect(() => {
        this.sy.selected();
        untracked(() => {
          this.schoolYear.setValue(this.sy.filter());
          this.classesApi.list(this.schoolYear.value).subscribe({
            next: (r) => this.classes.set(r.items),
          });
          this.reload();
        });
      });
    }
  }

  /* ------------------------------- Sélection ------------------------------- */

  selectClass(id: string): void {
    this.classInstanceId.set(id);
    this.studentId.set('');
    this.periodId.set('');
    this.courseFilterId.set('');
    forkJoin({
      periods: this.academics
        .periods(id, this.schoolYear.value)
        .pipe(catchError(() => of({ items: [] }))),
      subjects: this.subjectsApi
        .classSubjects({ classId: id, schoolYear: this.schoolYear.value })
        .pipe(catchError(() => of({ items: [] }))),
    }).subscribe((r) => {
      this.periods.set(r.periods.items);
      this.subjects.set(r.subjects.items);
      // Recharge une fois les cours connus pour résoudre les libellés de l'overview.
      this.reload();
    });
  }

  selectStudent(id: string): void {
    this.studentId.set(id);
    this.classInstanceId.set('');
    this.courseFilterId.set('');
    this.reload();
  }

  selectPeriod(id: string): void {
    this.periodId.set(id);
    this.reload();
  }

  selectCourseFilter(id: string): void {
    this.courseFilterId.set(id);
    this.reload();
  }

  reload(): void {
    if (!this.hasContext()) {
      return;
    }
    this.page = 1;
    this.loadOverview();
    this.loadEntries();
  }

  private baseQuery(): {
    classInstanceId?: string;
    studentId?: string;
    schoolYear: string;
    periodId?: string;
    classSubjectId?: string;
  } {
    return {
      classInstanceId: this.isParent() ? undefined : this.classInstanceId() || undefined,
      studentId: this.isParent() ? this.studentId() || undefined : undefined,
      schoolYear: this.schoolYear.value,
      periodId: this.periodId() || undefined,
      classSubjectId: this.courseFilterId() || undefined,
    };
  }

  private loadOverview(): void {
    this.loadingOverview.set(true);
    this.journal.overview(this.baseQuery()).subscribe({
      next: (rows) => {
        this.overview.set(rows.map((r) => this.enrichRow(r)));
        this.loadingOverview.set(false);
      },
      error: () => {
        this.overview.set([]);
        this.loadingOverview.set(false);
      },
    });
  }

  private loadEntries(): void {
    this.loadingEntries.set(true);
    this.journal.entries({ ...this.baseQuery(), page: this.page, limit: 20 }).subscribe({
      next: (r) => {
        this.entries.set(r.items.map((e) => this.enrichEntry(e)));
        this.entriesMeta.set(r.pagination ?? null);
        this.loadingEntries.set(false);
      },
      error: () => {
        this.entries.set([]);
        this.entriesMeta.set(null);
        this.loadingEntries.set(false);
      },
    });
  }

  goPage(page: number): void {
    this.page = page;
    this.loadEntries();
  }

  /* ------------------------------- Programmes ------------------------------ */

  private loadPrograms(): void {
    this.curriculum.publishedPrograms().subscribe({
      next: (r) => {
        this.programs.set(r.items);
        const active =
          r.items.find((p) => (p as Record<string, unknown>)['activeForSchool'] === true) ??
          r.items[0];
        if (active) {
          this.programCtrl.setValue(active.id);
          this.buildSlotLabels(active);
        }
      },
    });
  }

  private buildSlotLabels(program: NationalProgram): void {
    const map: Record<string, string> = {};
    for (const raw of (program.slots ?? []) as Record<string, unknown>[]) {
      const id = String(raw['id'] ?? '');
      if (id) {
        map[id] = String(raw['labelFr'] ?? raw['programCode'] ?? id);
      }
    }
    this.slotLabels.set(map);
  }

  activateProgram(): void {
    const id = this.programCtrl.value;
    if (!id || this.busyProgram()) {
      return;
    }
    this.busyProgram.set(true);
    this.curriculum.setActivation(id, true).subscribe({
      next: () => {
        this.busyProgram.set(false);
        this.notify.success("Programme activé pour l'école.");
        this.loadPrograms();
      },
      error: () => this.busyProgram.set(false),
    });
  }

  assignProgram(): void {
    const id = this.programCtrl.value;
    const instance = this.classInstanceId();
    if (!id || !instance || this.busyProgram()) {
      return;
    }
    this.busyProgram.set(true);
    this.curriculum.assignToClassInstance(instance, id).subscribe({
      next: () => {
        this.busyProgram.set(false);
        this.notify.success('Programme assigné à la classe.');
        this.selectClass(instance);
        // Lier ≠ peupler : on enchaîne sur l'ouverture des cours.
        this.prepareOpenCourses();
      },
      error: () => this.busyProgram.set(false),
    });
  }

  /* --------------------- Ouverture des cours du programme ------------------- */

  /** Charge les matières du programme sélectionné dans la liste cochable. */
  prepareOpenCourses(): void {
    const id = this.programCtrl.value;
    if (!id) {
      return;
    }
    const inline = (this.programs().find((p) => p.id === id)?.slots ?? []) as Record<
      string,
      unknown
    >[];
    if (inline.length) {
      this.setProgramSlots(inline);
      this.showOpenPanel.set(true);
      return;
    }
    this.curriculum.programDetail(id).subscribe({
      next: (full) => {
        this.setProgramSlots((full.slots ?? []) as Record<string, unknown>[]);
        this.showOpenPanel.set(true);
      },
    });
  }

  private setProgramSlots(raw: Record<string, unknown>[]): void {
    this.programSlots.set(
      raw.map((s) => ({
        id: String(s['id'] ?? ''),
        code: String(s['programCode'] ?? ''),
        label: String(s['labelFr'] ?? s['programCode'] ?? ''),
      })),
    );
    this.excluded.set(new Set());
    this.openResult.set(null);
  }

  /** Coche / décoche une matière (décoché = exclu de l'ouverture). */
  toggleExclude(code: string): void {
    this.excluded.update((set) => {
      const next = new Set(set);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  /** Année cible pour les appels de calcul (seed) : champ rempli, sinon année en cours. */
  protected yr(): string {
    return this.schoolYear.value || this.sy.current();
  }

  /** Génère les périodes manquantes de l'année (toutes les classes de l'école). */
  seedPeriods(): void {
    if (this.seedingPeriods()) {
      return;
    }
    const year = this.yr();
    this.seedingPeriods.set(true);
    this.academics.seedPeriods(year).subscribe({
      next: () => {
        this.seedingPeriods.set(false);
        this.notify.success(`Périodes générées pour ${year}.`);
        if (this.classInstanceId()) {
          this.selectClass(this.classInstanceId());
        }
      },
      error: () => this.seedingPeriods.set(false),
    });
  }

  /** Ouvre les cours des matières cochées (idempotent côté backend). */
  openCourses(): void {
    const classId = this.classInstanceId();
    if (!classId || this.openingCourses() || !this.includedCount()) {
      return;
    }
    const excludeProgramCodes = [...this.excluded()];
    this.openingCourses.set(true);
    this.subjectsApi
      .openFromProgram(classId, excludeProgramCodes.length ? { excludeProgramCodes } : {})
      .subscribe({
        next: (res) => {
          this.openingCourses.set(false);
          this.openResult.set(res);
          this.notify.success(`${res.opened} cours ouvert${res.opened > 1 ? 's' : ''}.`);
          this.selectClass(classId);
        },
        error: () => this.openingCourses.set(false),
      });
  }

  /* ----------------------------- Heures prévues ---------------------------- */

  saveTarget(): void {
    if (this.targetForm.invalid || this.savingTarget()) {
      this.targetForm.markAllAsTouched();
      return;
    }
    const v = this.targetForm.getRawValue();
    this.savingTarget.set(true);
    this.journal
      .upsertPeriodTarget({
        classSubjectId: v.classSubjectId,
        periodId: v.periodId,
        plannedHours: Number(v.plannedHours),
      })
      .subscribe({
        next: () => {
          this.savingTarget.set(false);
          this.notify.success('Heures prévues enregistrées.');
          this.loadOverview();
        },
        error: () => this.savingTarget.set(false),
      });
  }

  /* --------------------------- Cours ouverts (admin) ----------------------- */

  /** Libellé lisible d'un enseignant (le backend imbrique l'identité sous `user`). */
  protected teacherLabel(t: Teacher): string {
    const user = (t.user ?? (t as Record<string, unknown>)) as Record<string, unknown>;
    const full =
      `${(user['firstName'] as string) ?? ''} ${(user['lastName'] as string) ?? ''}`.trim();
    return full || (user['name'] as string) || (t.employeeNumber ?? '—');
  }

  /** Nom de l'enseignant affecté à un cours, pour la ligne récapitulative. */
  protected courseTeacherName(cs: ClassSubject): string {
    const t = this.teachers().find((x) => x.id === cs.teacherId);
    return t ? this.teacherLabel(t) : '';
  }

  /** Pré-remplit le formulaire d'édition avec l'enseignant/volume du cours choisi. */
  onCoursePick(id: string): void {
    const cs = this.subjects().find((s) => s.id === id);
    this.courseForm.patchValue(
      { teacherId: cs?.teacherId ?? '', hoursPerWeek: cs?.hoursPerWeek ?? null },
      { emitEvent: false },
    );
  }

  saveCourse(): void {
    if (this.courseForm.invalid || this.savingCourse()) {
      this.courseForm.markAllAsTouched();
      return;
    }
    const v = this.courseForm.getRawValue();
    this.savingCourse.set(true);
    this.subjectsApi
      .updateClassSubject(v.classSubjectId, {
        teacherId: v.teacherId || undefined,
        hoursPerWeek: v.hoursPerWeek === null ? undefined : Number(v.hoursPerWeek),
      })
      .subscribe({
        next: () => {
          this.savingCourse.set(false);
          this.notify.success('Cours mis à jour.');
          this.refreshSubjects();
        },
        error: () => this.savingCourse.set(false),
      });
  }

  deleteCourse(cs: ClassSubject): void {
    if (this.deletingCourseId()) {
      return;
    }
    if (!confirm(`Fermer le cours « ${this.subjectLabel(cs)} » ? Cette action est irréversible.`)) {
      return;
    }
    this.deletingCourseId.set(cs.id);
    this.subjectsApi.deleteClassSubject(cs.id).subscribe({
      next: () => {
        this.deletingCourseId.set(null);
        this.notify.success('Cours fermé.');
        if (this.courseForm.getRawValue().classSubjectId === cs.id) {
          this.courseForm.reset({ teacherId: '', hoursPerWeek: null });
        }
        this.refreshSubjects();
      },
      error: () => this.deletingCourseId.set(null),
    });
  }

  /** Recharge la liste des cours de la classe active (après édition/suppression). */
  private refreshSubjects(): void {
    const id = this.classInstanceId();
    if (!id) {
      return;
    }
    this.subjectsApi
      .classSubjects({ classId: id, schoolYear: this.schoolYear.value })
      .pipe(catchError(() => of({ items: [] as ClassSubject[] })))
      .subscribe((r) => {
        this.subjects.set(r.items);
        this.loadOverview();
      });
  }

  /* -------------------------------- Séances -------------------------------- */

  toggleForm(): void {
    this.editingId.set(null);
    this.entryForm.reset({ durationHours: 1 });
    this.showForm.update((v) => !v);
  }

  editEntry(e: LessonLogEntry): void {
    this.editingId.set(e.id);
    this.entryForm.reset({
      classSubjectId: e.classSubjectId ?? '',
      periodId: e.periodId ?? '',
      lessonDate: (e.lessonDate ?? '').slice(0, 10),
      durationHours: Number(e.durationHours ?? 1),
      title: e.title ?? '',
      summary: e.summary ?? '',
      homework: e.homework ?? '',
      skillsCovered: e.skillsCovered ?? '',
    });
    this.showForm.set(true);
  }

  submitEntry(): void {
    if (this.entryForm.invalid || this.savingEntry()) {
      this.entryForm.markAllAsTouched();
      return;
    }
    const v = this.entryForm.getRawValue();
    this.savingEntry.set(true);
    const id = this.editingId();
    if (id) {
      // PATCH : champs modifiables uniquement (pas classSubjectId/periodId).
      this.journal
        .updateEntry(id, {
          lessonDate: v.lessonDate,
          durationHours: Number(v.durationHours),
          title: v.title,
          summary: v.summary || undefined,
          homework: v.homework || undefined,
          skillsCovered: v.skillsCovered || undefined,
        })
        .subscribe({
          next: () => this.afterEntrySaved('Séance mise à jour.'),
          error: () => this.savingEntry.set(false),
        });
    } else {
      this.journal
        .createEntry({
          classSubjectId: v.classSubjectId,
          periodId: v.periodId,
          lessonDate: v.lessonDate,
          durationHours: Number(v.durationHours),
          title: v.title,
          summary: v.summary || undefined,
          homework: v.homework || undefined,
          skillsCovered: v.skillsCovered || undefined,
        })
        .subscribe({
          next: () => this.afterEntrySaved('Séance enregistrée.'),
          error: () => this.savingEntry.set(false),
        });
    }
  }

  private afterEntrySaved(msg: string): void {
    this.savingEntry.set(false);
    this.editingId.set(null);
    this.showForm.set(false);
    this.entryForm.reset({ durationHours: 1 });
    this.notify.success(msg);
    this.loadOverview();
    this.loadEntries();
  }

  deleteEntry(e: LessonLogEntry): void {
    this.journal.removeEntry(e.id).subscribe({
      next: () => {
        this.notify.success('Séance supprimée.');
        this.loadOverview();
        this.loadEntries();
      },
    });
  }

  /* -------------------------------- Helpers -------------------------------- */

  private loadChildren(): void {
    this.parents.me().subscribe({
      next: (profile) => {
        const list = extractChildren(profile);
        this.children.set(list);
        if (list.length === 1) {
          this.selectStudent(list[0].studentId);
        }
      },
    });
  }

  private enrichRow(r: CourseOverviewRow): CourseOverviewRow {
    if (r.subjectLabel && r.subjectLabel !== '—') {
      return r;
    }
    const cs = this.subjects().find(
      (s) => s.id === r.classSubjectId || s.nationalProgramSlotId === r.classSubjectId,
    );
    return { ...r, subjectLabel: cs ? this.subjectLabel(cs) : r.subjectLabel };
  }

  private enrichEntry(e: LessonLogEntry): LessonLogEntry {
    if (e.subjectLabel) {
      return e;
    }
    const cs = this.subjects().find((s) => s.id === e.classSubjectId);
    return cs ? { ...e, subjectLabel: this.subjectLabel(cs) } : e;
  }

  protected subjectLabel(cs: ClassSubject): string {
    const slotId = cs.nationalProgramSlotId ?? '';
    return (
      cs.nationalProgramSlot?.labelFr ??
      cs.nationalProgramSlot?.programCode ??
      this.slotLabels()[slotId] ??
      'Cours'
    );
  }

  /** Libellé de période partagé (« 1er trimestre — Examen » / « … — P1 »). */
  protected readonly periodLabel = periodLabel;

  protected pct(ratio: number): number {
    return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  }
}

/* ---------------------------------------------------------------------------- */

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Extrait les enfants liés du profil parent, quelle que soit la clé utilisée. */
function extractChildren(profile: Record<string, unknown>): ChildRef[] {
  const candidates = (profile['children'] ??
    profile['students'] ??
    profile['wards'] ??
    profile['studentParents']) as unknown[] | undefined;
  if (!Array.isArray(candidates)) {
    return [];
  }
  return candidates
    .map((raw) => {
      const o = (raw ?? {}) as Record<string, unknown>;
      // Cas join : { student: {...} }.
      const s = (o['student'] ?? o) as Record<string, unknown>;
      const id = String(s['id'] ?? s['studentId'] ?? '');
      const name =
        `${s['firstName'] ?? ''} ${s['lastName'] ?? ''}`.trim() ||
        (s['fullName'] as string) ||
        (s['name'] as string) ||
        id;
      return { studentId: id, name };
    })
    .filter((c) => c.studentId);
}
