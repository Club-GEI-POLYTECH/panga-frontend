import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FilterSheetContent } from '../../../shared/ui/filter-sheet';
import { GradesService } from '../services/grades.service';
import { ClassesService } from '../services/classes.service';
import { StudentsService } from '../services/students.service';
import { SubjectsService } from '../services/subjects.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { DateField } from '../../../shared/ui/date-field';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
import type { PaginationMeta } from '../../../core/models/api.models';
import type { ClassInstance, Student } from '../models/admin.models';
import type { ClassSubject } from '../models/course.models';
import type {
  BulkCreateGradesDto,
  Grade,
  Period,
  ProclamationRankRow,
  ScopedProclamation,
} from '../models/grade.models';
import {
  EXAM_TYPE_OPTIONS,
  GRADE_STATUS_OPTIONS,
  TERM_OPTIONS,
  labelOf,
  periodLabel,
} from '../../../core/models/grade.enums';
import type { EnumOption } from '../../../core/models/school.enums';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';
import { AuthStore } from '../../../core/auth/auth.store';

interface CourseRef {
  slotId: string;
  label: string;
  /** Barème du slot : note maximale d'une note de période. */
  maxPerPeriod?: number;
  /** Barème du slot : note maximale d'une note d'examen. */
  maxExam?: number;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning',
  disputed: 'danger',
};

/** Notes (admin / enseignant) : saisie en lot, périodes, moyennes, proclamation. */
@Component({
  selector: 'panga-grades-list',
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
    MatTooltipModule,
    NgTemplateOutlet,
    Avatar,
    EmptyState,
    PageHeader,
    Paginator,
    DateField,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header icon="grade" title="Notes" subtitle="Saisie, périodes & moyennes">
      <button mat-stroked-button class="rounded-xl!" [matMenuTriggerFor]="excelMenu">
        <mat-icon fontSet="material-symbols-outlined">table_view</mat-icon> Excel
      </button>
      <mat-menu #excelMenu="matMenu" class="panga-menu">
        <button mat-menu-item (click)="downloadTemplate()">
          <mat-icon fontSet="material-symbols-outlined">download</mat-icon>
          <span>Modèle d'import</span>
        </button>
        <button mat-menu-item (click)="fileInput.click()">
          <mat-icon fontSet="material-symbols-outlined">upload_file</mat-icon>
          <span>Importer des notes</span>
        </button>
        <button mat-menu-item [disabled]="!classId()" (click)="exportExcel()">
          <mat-icon fontSet="material-symbols-outlined">file_download</mat-icon>
          <span>Exporter (filtre courant)</span>
        </button>
      </mat-menu>
      <input
        #fileInput
        type="file"
        class="hidden"
        accept=".xlsx,.xls"
        (change)="importExcel($event)"
      />
    </panga-page-header>

    <!-- Contexte -->
    <div class="panga-card p-5 mb-6 flex items-center gap-3">
      <mat-form-field appearance="outline" class="flex-1 min-w-0" subscriptSizing="dynamic">
        <mat-label>Classe</mat-label>
        <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <button
        mat-icon-button
        class="sm:hidden shrink-0"
        (click)="openFilters(schoolYearTpl)"
        matTooltip="Année scolaire"
        aria-label="Année scolaire"
      >
        <mat-icon fontSet="material-symbols-outlined">tune</mat-icon>
      </button>
      <div class="hidden sm:block w-37.5 shrink-0">
        <ng-container [ngTemplateOutlet]="schoolYearTpl" />
      </div>
    </div>

    <ng-template #schoolYearTpl>
      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Année scolaire</mat-label>
        <input
          matInput
          [formControl]="schoolYear"
          placeholder="Année en cours"
          (blur)="reloadAll()"
        />
      </mat-form-field>
    </ng-template>

    @if (!classId()) {
      <div class="panga-card">
        <panga-empty-state
          icon="grade"
          title="Choisissez une classe"
          description="Sélectionnez une classe pour gérer les notes et les périodes."
        />
      </div>
    } @else {
      <!-- Périodes -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header icon="event" title="Périodes" [count]="periods().length">
          @if (isClassTutor()) {
            <button mat-stroked-button class="rounded-xl!" (click)="seedPeriods()">
              <mat-icon fontSet="material-symbols-outlined">event_repeat</mat-icon> Générer
            </button>
          }
        </panga-section-header>
        @if (periods().length === 0) {
          <p class="text-sm text-(--text-muted)">
            Aucune période. Cliquez sur « Générer » pour créer les périodes de l'année.
          </p>
        } @else {
          <div
            class="flex flex-nowrap overflow-x-auto -mx-5 px-5 gap-2 sm:flex-wrap sm:overflow-visible sm:mx-0 sm:px-0"
          >
            @for (p of periods(); track p.id) {
              <div
                class="flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2"
                [class.opacity-60]="p.isLocked"
                [style.border-color]="p.isLocked ? 'var(--warning)' : 'var(--border)'"
              >
                <span class="material-symbols-outlined text-[18px] text-(--brand-500)">
                  {{ p.periodType === 'exam' ? 'quiz' : 'menu_book' }}
                </span>
                <div class="leading-tight">
                  <p class="text-sm font-medium text-(--text)">{{ periodLabel(p) }}</p>
                  <p class="text-[11px] text-(--text-muted)">
                    {{ p.term }} · n°{{ p.periodNumber }}
                  </p>
                </div>
                @if (isClassTutor()) {
                  <button
                    mat-icon-button
                    class="h-8! w-8!"
                    [matTooltip]="p.isLocked ? 'Déverrouiller' : 'Verrouiller'"
                    (click)="toggleLock(p)"
                  >
                    <mat-icon fontSet="material-symbols-outlined" class="text-[18px]!">
                      {{ p.isLocked ? 'lock' : 'lock_open' }}
                    </mat-icon>
                  </button>
                }
              </div>
            }
          </div>
        }
      </section>

      <!-- Onglets -->
      <div class="flex gap-1 mb-4 p-1 rounded-xl bg-(--background) w-fit border border-(--border)">
        @for (t of tabs; track t.key) {
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            [class.bg-surface]="tab() === t.key"
            [style.background]="tab() === t.key ? 'var(--surface)' : 'transparent'"
            [style.color]="tab() === t.key ? 'var(--text)' : 'var(--text-muted)'"
            (click)="tab.set(t.key)"
          >
            {{ t.label }}
          </button>
        }
      </div>

      @switch (tab()) {
        @case ('entry') {
          <!-- Saisie en lot -->
          <section class="panga-card p-5">
            <panga-section-header icon="playlist_add" title="Saisie des notes par cours" />
            <div class="flex flex-col gap-4 mb-4">
              <mat-form-field appearance="outline">
                <mat-label>Cours</mat-label>
                <mat-select [formControl]="bulkSlot">
                  @for (c of courses(); track c.slotId) {
                    <mat-option [value]="c.slotId">{{ c.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Période</mat-label>
                <mat-select [formControl]="bulkPeriod">
                  @for (p of periods(); track p.id) {
                    <mat-option [value]="p.id">{{ periodLabel(p) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (selectedBulkPeriod()?.periodType === 'exam') {
                <mat-form-field appearance="outline">
                  <mat-label>Type d'examen</mat-label>
                  <mat-select [formControl]="bulkExamType">
                    @for (o of examTypes; track o.value) {
                      <mat-option [value]="o.value">{{ o.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
              <panga-date-field
                class="w-full"
                label="Date de l'évaluation"
                [formControl]="bulkExamDate"
              />
            </div>

            @if (selectedBulkPeriod()?.isLocked) {
              <p class="text-sm text-(--warning) mb-3 flex items-center gap-1">
                <mat-icon fontSet="material-symbols-outlined" class="text-[18px]!">lock</mat-icon>
                Période verrouillée : saisie impossible.
              </p>
            }

            @if (classStudents().length === 0) {
              <panga-empty-state
                icon="group"
                title="Aucun élève"
                description="Cette classe n'a pas d'élèves inscrits."
              />
            } @else {
              <div class="divide-y divide-(--border) -mx-5 mb-4">
                @for (s of classStudents(); track s.id) {
                  <div class="flex items-center gap-3 px-5 py-2.5">
                    <panga-avatar [name]="studentName(s)" [size]="34" />
                    <span class="flex-1 min-w-0 text-sm text-(--text) truncate">{{
                      studentName(s)
                    }}</span>
                    <input
                      type="number"
                      class="w-24 rounded-lg border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-right text-(--text) focus:outline-none focus:ring-2 focus:ring-(--brand-400) disabled:opacity-50"
                      [value]="scores()[s.id] || ''"
                      (input)="setScore(s.id, $event)"
                      [disabled]="!!selectedBulkPeriod()?.isLocked"
                      min="0"
                      [max]="bulkMaxScore.value || 20"
                      placeholder="—"
                    />
                  </div>
                }
              </div>
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-(--text-muted)">
                  {{ filledCount() }} / {{ classStudents().length }} note(s) saisie(s)
                </p>
                <button
                  mat-flat-button
                  class="rounded-xl!"
                  [disabled]="!canSubmitBulk() || savingBulk()"
                  (click)="submitBulk()"
                >
                  <mat-icon fontSet="material-symbols-outlined">save</mat-icon>
                  Enregistrer {{ filledCount() }} note(s)
                </button>
              </div>
            }
          </section>
        }

        @case ('list') {
          <!-- Filtres + liste -->
          <section class="panga-card p-5">
            <panga-section-header
              icon="grade"
              title="Notes saisies"
              [count]="
                clientPeriod()
                  ? displayedGrades().length
                  : (gradesMeta()?.total ?? displayedGrades().length)
              "
            >
              <button
                mat-stroked-button
                class="rounded-xl! sm:hidden"
                (click)="openFilters(gradeFiltersTpl)"
              >
                <mat-icon fontSet="material-symbols-outlined">filter_list</mat-icon>
                Filtrer
              </button>
              <div class="hidden sm:flex sm:flex-wrap items-center gap-2">
                <ng-container [ngTemplateOutlet]="gradeFiltersTpl" />
              </div>
            </panga-section-header>

            <ng-template #gradeFiltersTpl>
              <mat-form-field
                appearance="outline"
                class="w-full sm:w-45 sm:-mb-5!"
                subscriptSizing="dynamic"
              >
                <mat-label>Cours</mat-label>
                <mat-select [formControl]="filterSlot" (selectionChange)="reloadGrades()">
                  <mat-option [value]="''">Tous</mat-option>
                  @for (c of courses(); track c.slotId) {
                    <mat-option [value]="c.slotId">{{ c.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field
                appearance="outline"
                class="w-full sm:w-37.5 sm:-mb-5!"
                subscriptSizing="dynamic"
              >
                <mat-label>Trimestre</mat-label>
                <mat-select [value]="filterTerm()" (selectionChange)="setTerm($event.value)">
                  <mat-option [value]="''">Tous</mat-option>
                  @for (o of termOptions(); track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field
                appearance="outline"
                class="w-full sm:w-45 sm:-mb-5!"
                subscriptSizing="dynamic"
              >
                <mat-label>Période</mat-label>
                <mat-select
                  [value]="clientPeriod()"
                  (selectionChange)="clientPeriod.set($event.value)"
                  [disabled]="periodOptions().length === 0"
                >
                  <mat-option [value]="''">Toutes</mat-option>
                  @for (p of periodOptions(); track p.id) {
                    <mat-option [value]="p.id">{{ periodLabel(p) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </ng-template>

            @if (editing(); as g) {
              <div class="rounded-2xl border border-(--brand-300) bg-(--brand-50) p-4 mb-4">
                <p class="text-sm font-medium text-(--text) mb-3">
                  Modifier la note — {{ gradeStudent(g) }} · {{ courseLabel(g) }}
                </p>
                <div class="grid gap-3 sm:grid-cols-3">
                  <mat-form-field appearance="outline">
                    <mat-label>Note</mat-label>
                    <input matInput type="number" [formControl]="editScore" min="0" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="sm:col-span-2">
                    <mat-label>Commentaire enseignant</mat-label>
                    <input matInput [formControl]="editComment" />
                  </mat-form-field>
                </div>
                <div class="flex justify-end gap-2">
                  <button mat-button (click)="editing.set(null)">Annuler</button>
                  <button
                    mat-flat-button
                    class="rounded-xl!"
                    [disabled]="savingEdit()"
                    (click)="saveEdit()"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            }

            @if (loadingGrades()) {
              <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
            } @else if (displayedGrades().length === 0) {
              <panga-empty-state
                icon="grade"
                title="Aucune note"
                description="Aucune note pour ce filtre."
              />
            } @else {
              <div class="divide-y divide-(--border) -mx-5">
                @for (g of displayedGrades(); track g.id) {
                  <div
                    class="flex items-center gap-3 px-5 py-3 cursor-pointer active:bg-(--background)"
                    role="button"
                    tabindex="0"
                    (click)="openGradeDetails(g, gradeDetailsTpl)"
                    (keydown.enter)="openGradeDetails(g, gradeDetailsTpl)"
                  >
                    <panga-avatar [name]="gradeStudent(g)" [size]="36" />
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-(--text) truncate">
                        {{ gradeStudent(g) }}
                      </p>
                      <p class="text-xs text-(--text-muted) truncate hidden sm:block">
                        {{ courseLabel(g) }}
                        @if (gradePeriodLabel(g); as pl) {
                          · {{ pl }}
                        }
                      </p>
                    </div>
                    <panga-status-badge
                      [label]="statusLabel(g.status)"
                      [tone]="statusTone(g.status)"
                      [dot]="false"
                      class="hidden sm:inline-flex shrink-0"
                    />
                    <div class="text-right shrink-0">
                      <span class="text-base font-semibold text-(--text)">{{ num(g.score) }}</span>
                      <span class="text-xs text-(--text-muted)">/{{ num(g.maxScore) || 20 }}</span>
                    </div>
                    <button
                      mat-icon-button
                      [matMenuTriggerFor]="rowMenu"
                      (click)="$event.stopPropagation()"
                      aria-label="Actions"
                    >
                      <mat-icon fontSet="material-symbols-outlined">more_vert</mat-icon>
                    </button>
                    <mat-menu #rowMenu="matMenu" class="panga-menu">
                      <button mat-menu-item (click)="startEdit(g)">
                        <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
                        <span>Modifier</span>
                      </button>
                      <button mat-menu-item (click)="deleteGrade(g)">
                        <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
                        <span>Supprimer</span>
                      </button>
                    </mat-menu>
                  </div>
                }
              </div>

              <ng-template #gradeDetailsTpl>
                @if (detailsGrade(); as g) {
                  <div class="flex flex-col gap-4">
                    <div class="flex items-center gap-3">
                      <panga-avatar [name]="gradeStudent(g)" [size]="44" />
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-(--text) truncate">
                          {{ gradeStudent(g) }}
                        </p>
                        <p class="text-xs text-(--text-muted) truncate">
                          {{ selectedClassLabel() }} · {{ g.schoolYear || schoolYear.value }}
                        </p>
                      </div>
                    </div>
                    <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                      <span class="text-(--text-muted)">Cours</span>
                      <span class="text-(--text) text-right">{{ courseLabel(g) }}</span>
                      <span class="text-(--text-muted)">Période</span>
                      <span class="text-(--text) text-right">{{ gradePeriodLabel(g) || '—' }}</span>
                      @if (g.examName) {
                        <span class="text-(--text-muted)">Évaluation</span>
                        <span class="text-(--text) text-right">{{ g.examName }}</span>
                      }
                      <span class="text-(--text-muted)">Note</span>
                      <span class="text-(--text) text-right font-semibold">
                        {{ num(g.score) }} / {{ num(g.maxScore) || 20 }}
                      </span>
                      <span class="text-(--text-muted)">Statut</span>
                      <span class="text-right">
                        <panga-status-badge
                          [label]="statusLabel(g.status)"
                          [tone]="statusTone(g.status)"
                          [dot]="false"
                        />
                      </span>
                      <span class="text-(--text-muted)">Saisie par</span>
                      <span class="text-(--text) text-right">{{ gradeTeacherName(g) }}</span>
                      @if (g.teacherComment) {
                        <span class="text-(--text-muted)">Commentaire</span>
                        <span class="text-(--text) text-right">{{ g.teacherComment }}</span>
                      }
                    </div>
                  </div>
                }
              </ng-template>
              @if (gradesMeta(); as m) {
                <panga-paginator [meta]="m" (pageChange)="goPage($event)" />
              }
            }
          </section>
        }

        @case ('averages') {
          <section class="panga-card p-5">
            <panga-section-header icon="leaderboard" title="Moyennes & proclamation">
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <mat-form-field
                  appearance="outline"
                  class="w-full sm:w-52 sm:-mb-5!"
                  subscriptSizing="dynamic"
                >
                  <mat-label>Portée</mat-label>
                  <mat-select [value]="avgScope()" (selectionChange)="setAvgScope($event.value)">
                    @for (o of avgScopeOptions(); track o.value) {
                      <mat-option [value]="o.value">{{ o.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <button
                  mat-flat-button
                  class="rounded-xl! w-full sm:w-auto"
                  [disabled]="loadingAverages() || !avgScope()"
                  (click)="loadAverages(true)"
                >
                  <mat-icon fontSet="material-symbols-outlined">calculate</mat-icon> Calculer
                </button>
              </div>
            </panga-section-header>

            @if (loadingAverages()) {
              <p class="text-sm text-(--text-muted) py-6 text-center">Calcul en cours…</p>
            } @else if (!proclamation()) {
              <panga-empty-state
                icon="leaderboard"
                title="Pas encore de moyennes"
                [description]="
                  avgScope()
                    ? 'Cliquez sur « Calculer » pour obtenir le classement.'
                    : 'Aucune période configurée pour cette classe.'
                "
              />
            } @else {
              <div class="grid gap-4 sm:grid-cols-2 mb-5">
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">Moyenne générale</p>
                  <p class="text-2xl font-semibold" [style.color]="avgColor(classAveragePercent())">
                    {{ over20(classAveragePercent()) }}
                    <span class="text-sm text-(--text-muted)">/20</span>
                    <span class="text-sm text-(--text-muted)">
                      · {{ pctOr(classAveragePercent()) }}</span
                    >
                  </p>
                </div>
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">Effectif</p>
                  <p class="text-2xl font-semibold text-(--text)">
                    {{ proclamation()?.studentCount ?? ranking().length }}
                  </p>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-3 mb-5">
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">Réussite &gt; 75 %</p>
                  <p class="text-2xl font-semibold text-(--success)">{{ tranche75().length }}</p>
                </div>
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">Entre 50 % et 75 %</p>
                  <p class="text-2xl font-semibold text-(--brand-700)">{{ tranche50().length }}</p>
                </div>
                <div class="rounded-2xl border border-(--border) p-4">
                  <p class="text-xs text-(--text-muted)">En échec &lt; 50 %</p>
                  <p class="text-2xl font-semibold text-(--danger)">{{ trancheLow().length }}</p>
                </div>
              </div>

              @if (ranking().length === 0) {
                <panga-empty-state
                  icon="leaderboard"
                  title="Aucun classement"
                  description="Aucune note pour cette portée."
                />
              } @else {
                <div class="divide-y divide-(--border) -mx-5">
                  @for (r of ranking(); track r.studentId || $index; let i = $index) {
                    <div class="flex items-start gap-3 px-5 py-3">
                      <span
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                        [style.background]="rankBg(i)"
                        [style.color]="rankFg(i)"
                      >
                        {{ r.rank || i + 1 }}
                      </span>
                      <panga-avatar [name]="rankName(r)" [size]="32" />
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-(--text) truncate">
                          {{ rankName(r) }}
                        </p>
                        <p class="text-sm font-semibold" [style.color]="avgColor(r.averagePercent)">
                          {{ over20(r.averagePercent) }}/20
                          <span class="mx-1 text-(--text-muted) font-normal">·</span>
                          {{ pct(r.averagePercent) }}%
                        </p>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </section>
        }
      }
    }
  `,
})
export class GradesList {
  private readonly gradesApi = inject(GradesService);
  private readonly classesApi = inject(ClassesService);
  private readonly studentsApi = inject(StudentsService);
  private readonly subjectsApi = inject(SubjectsService);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);
  private readonly auth = inject(AuthStore);
  private readonly bottomSheet = inject(MatBottomSheet);

  /**
   * Gestion du calendrier des périodes (générer / verrouiller) réservée au
   * **titulaire** de la classe. Admin : toujours ; enseignant : seulement titulaire.
   * La saisie des notes reste ouverte (scopée à ses matières par le back).
   */
  protected readonly isClassTutor = computed(() => {
    if (this.auth.role() !== 'teacher') {
      return true;
    }
    const uid = this.auth.user()?.id;
    const cls = this.classes().find((c) => c.id === this.classId());
    return !!uid && !!cls?.classTeacherId && cls.classTeacherId === uid;
  });

  protected readonly examTypes = EXAM_TYPE_OPTIONS;
  protected readonly tabs = [
    { key: 'entry' as const, label: 'Saisie' },
    { key: 'list' as const, label: 'Notes' },
    { key: 'averages' as const, label: 'Moyennes' },
  ];

  /** Initialisé sur le sélecteur global (vide = année en cours → GET sans année). */
  protected readonly schoolYear = new FormControl(this.sy.filter(), { nonNullable: true });
  /** Année pour les actions qui exigent une année (calcul, seed, création). */
  private yr(): string {
    return this.schoolYear.value || this.sy.current();
  }
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classId = signal('');
  protected readonly tab = signal<'entry' | 'list' | 'averages'>('entry');

  private readonly allStudents = signal<Student[]>([]);
  protected readonly courses = signal<CourseRef[]>([]);
  protected readonly periods = signal<Period[]>([]);

  // `allStudents` est déjà le roster de la classe sélectionnée (filtre serveur
  // `classId`), donc on l'expose tel quel — pas de re-filtrage client.
  protected readonly classStudents = computed(() => this.allStudents());

  /** Index `studentId → élève` pour résoudre les noms quand la note ne les embarque pas. */
  private readonly studentsById = computed(() => {
    const m = new Map<string, Student>();
    for (const s of this.allStudents()) {
      m.set(s.id, s);
    }
    return m;
  });

  /* -------------------------------- Saisie --------------------------------- */
  protected readonly bulkSlot = new FormControl('', { nonNullable: true });
  protected readonly bulkPeriod = new FormControl('', { nonNullable: true });
  protected readonly bulkMaxScore = new FormControl<number | null>(null);
  protected readonly bulkExamType = new FormControl('final', { nonNullable: true });
  protected readonly bulkExamDate = new FormControl('', { nonNullable: true });
  protected readonly scores = signal<Record<string, string>>({});
  protected readonly savingBulk = signal(false);
  private readonly bulkPeriodId = signal('');
  // Miroir signal de `bulkSlot.value` : un FormControl n'est pas suivi par un
  // `computed`, donc `canSubmitBulk` ne réagissait pas au choix du cours.
  private readonly bulkSlotId = signal('');

  protected readonly selectedBulkPeriod = computed(() =>
    this.periods().find((p) => p.id === this.bulkPeriodId()),
  );
  protected readonly filledCount = computed(
    () =>
      Object.values(this.scores()).filter((v) => v !== '' && Number.isFinite(parseFloat(v))).length,
  );
  protected readonly canSubmitBulk = computed(
    () =>
      !!this.bulkSlotId() &&
      !!this.bulkPeriodId() &&
      !this.selectedBulkPeriod()?.isLocked &&
      this.filledCount() > 0,
  );

  /* --------------------------------- Liste --------------------------------- */
  protected readonly filterSlot = new FormControl('', { nonNullable: true });
  /** Filtre trimestre/semestre — envoyé au serveur (`term`, seul filtre supporté). */
  protected readonly filterTerm = signal('');
  /** Affinage période P1/P2/Examen — appliqué **côté client** sur la page chargée. */
  protected readonly clientPeriod = signal('');
  protected readonly grades = signal<Grade[]>([]);
  /** Note affichée dans le popup de détails (ouvert au tap sur une ligne). */
  protected readonly detailsGrade = signal<Grade | null>(null);
  /** Libellé de la classe sélectionnée (contexte affiché dans le popup de détails). */
  protected readonly selectedClassLabel = computed(() => {
    const c = this.classes().find((x) => x.id === this.classId());
    return c?.template?.name || c?.id || '—';
  });

  /** Termes réellement présents dans la classe (primaire → trimestres, etc.). */
  protected readonly termOptions = computed<EnumOption[]>(() => {
    const seen = new Set<string>();
    for (const p of this.periods()) {
      if (p.term) {
        seen.add(p.term);
      }
    }
    return TERM_OPTIONS.filter((o) => seen.has(o.value));
  });
  /** Périodes proposées à l'affinage, restreintes au trimestre sélectionné. */
  protected readonly periodOptions = computed<Period[]>(() => {
    const t = this.filterTerm();
    const all = this.periods();
    return t ? all.filter((p) => p.term === t) : all;
  });
  /** Notes affichées = page serveur (filtrée par trimestre) affinée par période. */
  protected readonly displayedGrades = computed<Grade[]>(() => {
    const pid = this.clientPeriod();
    const list = this.grades();
    return pid ? list.filter((g) => g.periodId === pid) : list;
  });
  protected readonly gradesMeta = signal<PaginationMeta | null>(null);
  protected readonly loadingGrades = signal(false);
  private page = 1;

  protected readonly editing = signal<Grade | null>(null);
  protected readonly editScore = new FormControl<number | null>(null);
  protected readonly editComment = new FormControl('', { nonNullable: true });
  protected readonly savingEdit = signal(false);

  /* ------------------------------- Moyennes -------------------------------- */
  /**
   * Portée ciblée pour la proclamation (§B) : `TERM1`/`SEMESTER1`/… (terme complet),
   * `TERM1:P1` (1ère période du terme — check-point intermédiaire) ou `ANNUAL`.
   */
  protected readonly avgScope = signal('');
  protected readonly proclamation = signal<ScopedProclamation | null>(null);
  protected readonly loadingAverages = signal(false);

  /**
   * Options de portée : chaque terme réel (P1 intermédiaire + terme complet) +
   * « Annuel ». Couvre trimestres (P1/P3/P5 = 1ère période de chaque trimestre)
   * et semestres (P1/P3 = 1ère période de chaque semestre) sans distinction —
   * `termOptions` reflète déjà le système de la classe (périodes réellement générées).
   */
  protected readonly avgScopeOptions = computed<EnumOption[]>(() => {
    const opts: EnumOption[] = [];
    for (const t of this.termOptions()) {
      opts.push({ value: `${t.value}:P1`, label: `${t.label} — 1ère période` });
      opts.push({ value: t.value, label: t.label });
    }
    if (opts.length) {
      opts.push({ value: 'ANNUAL', label: 'Annuel' });
    }
    return opts;
  });
  /** Classement de la proclamation (tous, triés). */
  protected readonly ranking = computed<ProclamationRankRow[]>(() =>
    [...(this.proclamation()?.rankedAll ?? [])].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
  );
  protected readonly tranche75 = computed(() => this.proclamation()?.above75Percent ?? []);
  protected readonly tranche50 = computed(() => this.proclamation()?.between50And75Percent ?? []);
  protected readonly trancheLow = computed(() => this.proclamation()?.below50Percent ?? []);
  /** Moyenne générale de la classe (%) — moyenne arithmétique du classement affiché. */
  protected readonly classAveragePercent = computed<number | null>(() => {
    const rows = this.ranking();
    if (!rows.length) {
      return null;
    }
    return rows.reduce((sum, r) => sum + (r.averagePercent ?? 0), 0) / rows.length;
  });

  constructor() {
    // Sélection cours/période → synchronise les signaux + auto-remplit la note max.
    this.bulkSlot.valueChanges.subscribe((v) => {
      this.bulkSlotId.set(v ?? '');
      this.applyAutoMax();
    });
    this.bulkPeriod.valueChanges.subscribe((v) => {
      this.bulkPeriodId.set(v ?? '');
      this.applyAutoMax();
    });
    // Synchronise le champ année sur le sélecteur global et recharge.
    effect(() => {
      this.sy.selected();
      untracked(() => {
        this.schoolYear.setValue(this.sy.filter());
        this.reloadAll();
      });
    });
  }

  openFilters(template: TemplateRef<unknown>): void {
    this.bottomSheet.open(FilterSheetContent, { data: { title: 'Filtrer', template } });
  }

  openGradeDetails(g: Grade, template: TemplateRef<unknown>): void {
    this.detailsGrade.set(g);
    this.bottomSheet.open(FilterSheetContent, { data: { title: 'Détails de la note', template } });
  }

  /* ------------------------------- Sélection ------------------------------- */

  selectClass(id: string): void {
    this.classId.set(id);
    this.resetEntry();
    this.proclamation.set(null);
    // Les cours/périodes changent avec la classe → on repart de « Tous / Toutes »
    // pour ne pas envoyer un filtre appartenant à l'ancienne classe.
    this.filterSlot.setValue('', { emitEvent: false });
    this.filterTerm.set('');
    this.clientPeriod.set('');
    forkJoin({
      // Roster côté serveur : le filtre `classId` cible l'instance de classe.
      // L'entité élève renvoie sa classe sous `classId` (non normalisé), un
      // filtre client sur `classInstanceId` renverrait une liste vide.
      students: this.studentsApi
        .list({ page: 1, limit: 500, classId: id, schoolYear: this.schoolYear.value })
        .pipe(catchError(() => of({ items: [] }))),
      courses: this.subjectsApi
        .classSubjects({ classId: id, schoolYear: this.schoolYear.value })
        .pipe(catchError(() => of({ items: [] }))),
      periods: this.gradesApi.periods(id, this.schoolYear.value).pipe(catchError(() => of([]))),
    }).subscribe((r) => {
      this.allStudents.set(r.students.items);
      this.courses.set(toCourses(r.courses.items));
      this.periods.set(r.periods);
      // Réinitialise l'onglet Moyennes et cible la 1ère portée disponible.
      this.proclamation.set(null);
      this.avgScope.set(this.avgScopeOptions()[0]?.value ?? '');
      this.reloadGrades();
    });
  }

  reloadAll(): void {
    if (this.classId()) {
      this.selectClass(this.classId());
    } else {
      this.classesApi
        .list(this.schoolYear.value)
        .subscribe({ next: (r) => this.classes.set(r.items) });
    }
  }

  /* ------------------------------- Périodes -------------------------------- */

  seedPeriods(): void {
    this.gradesApi.seedPeriods(this.yr()).subscribe({
      next: () => {
        this.notify.success('Périodes générées.');
        this.gradesApi
          .periods(this.classId(), this.schoolYear.value)
          .subscribe({ next: (p) => this.periods.set(p) });
      },
    });
  }

  toggleLock(p: Period): void {
    this.gradesApi.updatePeriod(p.id, { isLocked: !p.isLocked }).subscribe({
      next: () => {
        this.notify.success(p.isLocked ? 'Période déverrouillée.' : 'Période verrouillée.');
        this.periods.update((list) =>
          list.map((x) => (x.id === p.id ? { ...x, isLocked: !p.isLocked } : x)),
        );
      },
    });
  }

  /* -------------------------------- Saisie --------------------------------- */

  setScore(studentId: string, ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    this.scores.update((m) => ({ ...m, [studentId]: value }));
  }

  /**
   * Auto-remplit la note maximale depuis le barème du cours sélectionné :
   * `maxPerPeriod` pour une note de période, `maxExam` pour une note d'examen.
   * Ne fait rien si le barème est inconnu (l'utilisateur peut saisir à la main).
   */
  private applyAutoMax(): void {
    const course = this.courses().find((c) => c.slotId === this.bulkSlotId());
    if (!course) {
      return;
    }
    const isExam = this.selectedBulkPeriod()?.periodType === 'exam';
    const max = isExam ? course.maxExam : course.maxPerPeriod;
    if (max != null) {
      this.bulkMaxScore.setValue(max);
    }
  }

  submitBulk(): void {
    const slotId = this.bulkSlot.value;
    const period = this.selectedBulkPeriod();
    if (!slotId || !period || this.savingBulk()) {
      return;
    }
    if (period.isLocked) {
      this.notify.error('Période verrouillée : saisie impossible.');
      return;
    }
    const map = this.scores();
    const rows = this.classStudents()
      .map((s) => ({ studentId: s.id, score: parseFloat(map[s.id]) }))
      .filter((r) => Number.isFinite(r.score));
    if (!rows.length) {
      this.notify.warning('Aucune note saisie.');
      return;
    }
    const isExam = period.periodType === 'exam';
    const dto: BulkCreateGradesDto = {
      classId: this.classId(),
      nationalProgramSlotId: slotId,
      schoolYear: this.yr(),
      term: period.term ?? 'TERM1',
      rows,
      periodId: period.id,
      isPeriodGrade: !isExam,
      isExamGrade: isExam,
    };
    if (period.periodNumber) dto.periodNumber = period.periodNumber;
    if (this.bulkMaxScore.value) dto.maxScore = Number(this.bulkMaxScore.value);
    if (isExam) dto.examType = this.bulkExamType.value || 'final';
    if (this.bulkExamDate.value) dto.examDate = this.bulkExamDate.value;

    this.savingBulk.set(true);
    this.gradesApi.createBulk(dto).subscribe({
      next: () => {
        this.savingBulk.set(false);
        this.notify.success(`${rows.length} note(s) enregistrée(s).`);
        this.scores.set({});
        this.reloadGrades();
        this.tab.set('list');
      },
      error: () => this.savingBulk.set(false),
    });
  }

  private resetEntry(): void {
    this.bulkSlot.reset('');
    this.bulkPeriod.reset('');
    this.bulkMaxScore.reset(null);
    this.bulkExamDate.reset('');
    this.scores.set({});
  }

  /* --------------------------------- Liste --------------------------------- */

  reloadGrades(): void {
    this.page = 1;
    this.loadGrades();
  }

  /** Change de trimestre : filtre serveur + réinitialise l'affinage période. */
  setTerm(term: string): void {
    this.filterTerm.set(term);
    this.clientPeriod.set('');
    this.reloadGrades();
  }

  private loadGrades(): void {
    this.loadingGrades.set(true);
    this.gradesApi
      .list({
        classId: this.classId(),
        schoolYear: this.schoolYear.value,
        nationalProgramSlotId: this.filterSlot.value || undefined,
        term: this.filterTerm() || undefined,
        page: this.page,
        limit: 20,
      })
      .subscribe({
        next: (r) => {
          this.grades.set(r.items);
          this.gradesMeta.set(r.pagination ?? null);
          this.loadingGrades.set(false);
        },
        error: () => {
          this.grades.set([]);
          this.gradesMeta.set(null);
          this.loadingGrades.set(false);
        },
      });
  }

  goPage(page: number): void {
    this.page = page;
    this.loadGrades();
  }

  startEdit(g: Grade): void {
    this.editing.set(g);
    this.editScore.setValue(this.num(g.score));
    this.editComment.setValue(g.teacherComment ?? '');
  }

  saveEdit(): void {
    const g = this.editing();
    if (!g || this.savingEdit()) {
      return;
    }
    const payload: Record<string, unknown> = {};
    if (this.editScore.value !== null) payload['score'] = Number(this.editScore.value);
    if (this.editComment.value) payload['teacherComment'] = this.editComment.value;
    this.savingEdit.set(true);
    this.gradesApi.update(g.id, payload).subscribe({
      next: () => {
        this.savingEdit.set(false);
        this.editing.set(null);
        this.notify.success('Note mise à jour.');
        this.loadGrades();
      },
      error: () => this.savingEdit.set(false),
    });
  }

  deleteGrade(g: Grade): void {
    this.gradesApi.remove(g.id).subscribe({
      next: () => {
        this.notify.success('Note supprimée.');
        this.loadGrades();
      },
    });
  }

  /* ------------------------------- Moyennes -------------------------------- */

  setAvgScope(scope: string): void {
    this.avgScope.set(scope);
    this.loadAverages();
  }

  /** Décode une valeur d'`avgScopeOptions` en paramètres de l'API proclamation. */
  private parseAvgScope(value: string): {
    term?: string;
    scope?: string;
    periodNumber?: number;
  } {
    if (!value || value === 'ANNUAL') {
      return { scope: 'annual' };
    }
    const [term, marker] = value.split(':');
    return marker === 'P1' ? { term, scope: 'period', periodNumber: 1 } : { term, scope: 'term' };
  }

  /**
   * Charge la proclamation (§B) pour la portée sélectionnée (terme complet, 1ère
   * période d'un terme, ou annuel). `recompute` force d'abord un recalcul côté back.
   */
  loadAverages(recompute = false): void {
    const scopeValue = this.avgScope();
    if (!this.classId() || !scopeValue) {
      return;
    }
    const { term, scope, periodNumber } = this.parseAvgScope(scopeValue);
    this.loadingAverages.set(true);
    const run = () => {
      this.gradesApi
        .proclamation(this.classId(), this.yr(), term, scope, periodNumber)
        .pipe(catchError(() => of(null)))
        .subscribe((r) => {
          this.proclamation.set(r);
          this.loadingAverages.set(false);
        });
    };
    if (recompute) {
      this.gradesApi.computeClassAverages(this.classId(), this.yr()).subscribe({
        next: () => run(),
        error: () => run(),
      });
    } else {
      run();
    }
  }

  /** Nom lisible d'une ligne de classement. */
  protected rankName(r: ProclamationRankRow): string {
    return (
      `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || r.studentNumber || r.studentId || '—'
    );
  }

  /* -------------------------------- Helpers -------------------------------- */

  protected num(v: unknown): number {
    const n = typeof v === 'string' ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  protected pct(v: unknown): number {
    return Math.round(this.num(v));
  }
  /** Pourcentage affiché, ou « — » si absent (null/undefined). */
  protected pctOr(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : `${this.pct(v)}%`;
  }
  /** Pourcentage (0–100) converti en note sur 20, à 1 décimale (« — » si absent). */
  protected over20(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : (v / 5).toFixed(1);
  }
  protected studentName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id;
  }
  protected gradeStudent(g: Grade): string {
    const s = (g.student ?? {}) as Record<string, unknown>;
    const embedded =
      `${(s['firstName'] as string) ?? ''} ${(s['lastName'] as string) ?? ''}`.trim() ||
      (s['fullName'] as string);
    if (embedded) {
      return embedded;
    }
    // La note ne porte pas d'objet `student` peuplé → on résout depuis la liste
    // d'élèves déjà chargée pour éviter d'afficher l'UUID brut.
    const known = g.studentId ? this.studentsById().get(g.studentId) : undefined;
    return known ? this.studentName(known) : g.studentId || '—';
  }
  protected courseLabel(g: Grade): string {
    return g.nationalProgramSlot?.labelFr ?? g.nationalProgramSlot?.programCode ?? 'Cours';
  }
  /** Enseignant ayant saisi la note (relation embarquée, sinon id brut). */
  protected gradeTeacherName(g: Grade): string {
    const t = (g.teacher ?? {}) as Record<string, unknown>;
    const embedded =
      `${(t['firstName'] as string) ?? ''} ${(t['lastName'] as string) ?? ''}`.trim() ||
      (t['fullName'] as string);
    return embedded || g.teacherId || '—';
  }
  /** Libellé de période partagé (« 1er trimestre — Examen » / « … — P1 »). */
  protected readonly periodLabel = periodLabel;
  protected termLabel(t: string | undefined): string {
    return labelOf(TERM_OPTIONS, t);
  }
  /** Libellé de période d'une note : période réelle si connue, sinon trimestre. */
  protected gradePeriodLabel(g: Grade): string {
    const p = g.periodId ? this.periods().find((x) => x.id === g.periodId) : undefined;
    return p ? this.periodLabel(p) : g.term ? this.termLabel(g.term) : '';
  }
  protected statusLabel(s: string | undefined): string {
    return labelOf(GRADE_STATUS_OPTIONS, s ?? 'draft');
  }
  protected statusTone(s: string | undefined): BadgeTone {
    return STATUS_TONE[s ?? 'draft'] ?? 'neutral';
  }
  protected avgColor(v: unknown): string {
    const p = this.pct(v);
    return p >= 75 ? 'var(--success)' : p >= 50 ? 'var(--brand-700)' : 'var(--danger)';
  }
  protected rankBg(i: number): string {
    return i < 3
      ? 'var(--brand-gradient)'
      : 'color-mix(in srgb, var(--text-muted) 12%, transparent)';
  }
  protected rankFg(i: number): string {
    return i < 3 ? '#fff' : 'var(--text-muted)';
  }

  /* --------------------------------- Excel --------------------------------- */

  downloadTemplate(): void {
    this.gradesApi.downloadTemplate().subscribe({
      next: (b) => downloadBlob(b, 'modele_notes.xlsx'),
    });
  }

  exportExcel(): void {
    this.gradesApi
      .exportExcel({
        classId: this.classId(),
        schoolYear: this.schoolYear.value,
        nationalProgramSlotId: this.filterSlot.value || undefined,
        term: this.filterTerm() || undefined,
      })
      .subscribe({ next: (b) => downloadBlob(b, 'notes.xlsx') });
  }

  importExcel(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.gradesApi.importExcel(file, this.yr()).subscribe({
      next: (res) => {
        const ok = (res['success'] as number) ?? 0;
        this.notify.success(`Import terminé (${ok} note(s)).`);
        this.reloadGrades();
      },
      complete: () => (input.value = ''),
    });
  }
}

/* -------------------------------------------------------------------------- */

function toCourses(subjects: ClassSubject[]): CourseRef[] {
  return subjects
    .map((cs) => {
      const slot = (cs.nationalProgramSlot ?? {}) as Record<string, unknown>;
      return {
        slotId: cs.nationalProgramSlotId ?? '',
        label: (slot['labelFr'] as string) ?? (slot['programCode'] as string) ?? 'Cours',
        maxPerPeriod: numOrUndef(slot['maxPerPeriod']),
        maxExam: numOrUndef(slot['maxExam']),
      };
    })
    .filter((c) => c.slotId);
}

/** Nombre strictement positif, ou `undefined` (barème inconnu). */
function numOrUndef(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
