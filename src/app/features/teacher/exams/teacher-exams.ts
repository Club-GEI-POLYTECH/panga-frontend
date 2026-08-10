import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ExamsService } from '../../admin/services/exams.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { Exam } from '../../admin/models/exam.models';
import {
  EXAM_STATUS_OPTIONS,
  EXAM_TYPE_OPTIONS,
  examLabel,
  examStatusTone,
} from '../../../core/models/exam.enums';
import { TERM_OPTIONS } from '../../../core/models/grade.enums';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

/**
 * Écran resserré (backend refuse tout le reste en 403) : liste des examens de
 * l'enseignant (les siens + ceux des classes dont il est titulaire, déjà
 * scopés côté serveur) — chaque ligne mène à la saisie des résultats.
 */
@Component({
  selector: 'panga-teacher-exams',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    EmptyState,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="quiz"
      title="Mes examens"
      subtitle="Vos épreuves — saisie des résultats"
    />

    <div class="panga-card p-5 mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
      <mat-form-field
        appearance="outline"
        class="w-full sm:w-auto sm:min-w-37.5"
        subscriptSizing="dynamic"
      >
        <mat-label>Période</mat-label>
        <mat-select [formControl]="filterTerm" (selectionChange)="reload()">
          <mat-option [value]="''">Toutes</mat-option>
          @for (o of terms; track o.value) {
            <mat-option [value]="o.value">{{ o.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    <section class="panga-card p-5">
      <panga-section-header icon="quiz" title="Épreuves" [count]="exams().length" />
      @if (loading()) {
        <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
      } @else if (exams().length === 0) {
        <panga-empty-state
          icon="quiz"
          title="Aucun examen"
          description="Vos examens et ceux de vos classes titulaire apparaîtront ici."
        />
      } @else {
        <div class="divide-y divide-(--border) -mx-5">
          @for (e of exams(); track e.id) {
            <a
              [routerLink]="['/', 'exams', e.id]"
              class="flex items-center gap-4 px-5 py-3 hover:bg-(--background) transition-colors"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                style="background: var(--brand-gradient)"
              >
                <span class="material-symbols-outlined text-[20px]">quiz</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-(--text) truncate">{{ e.name || '—' }}</p>
                <p class="text-xs text-(--text-muted) truncate">
                  {{ courseLabel(e) }}
                  @if (e.examDate) {
                    · {{ e.examDate }}
                  }
                  @if (e.startTime) {
                    · {{ e.startTime }}–{{ e.endTime }}
                  }
                </p>
              </div>
              <panga-status-badge [label]="typeLabel(e.examType)" tone="brand" [dot]="false" />
              <panga-status-badge
                [label]="statusLabel(e.status)"
                [tone]="statusTone(e.status)"
                [dot]="false"
              />
              @if (e.isResultsPublished) {
                <panga-status-badge label="Résultats publiés" tone="success" [dot]="false" />
              }
              <mat-icon fontSet="material-symbols-outlined" class="text-(--text-muted)"
                >chevron_right</mat-icon
              >
            </a>
          }
        </div>
      }
    </section>
  `,
})
export class TeacherExams {
  private readonly examsApi = inject(ExamsService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly terms = TERM_OPTIONS;
  protected readonly filterTerm = new FormControl('', { nonNullable: true });

  protected readonly exams = signal<Exam[]>([]);
  protected readonly loading = signal(false);

  constructor() {
    effect(() => {
      this.sy.selected();
      untracked(() => this.reload());
    });
  }

  reload(): void {
    this.loading.set(true);
    this.examsApi
      .list({
        term: this.filterTerm.value || undefined,
        schoolYear: this.sy.filter(),
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (r) => {
          this.exams.set(r.items);
          this.loading.set(false);
        },
        error: () => {
          this.exams.set([]);
          this.loading.set(false);
        },
      });
  }

  protected courseLabel(e: Exam): string {
    return e.nationalProgramSlot?.labelFr ?? e.nationalProgramSlot?.programCode ?? 'Cours';
  }
  protected typeLabel(t: string | undefined): string {
    return examLabel(EXAM_TYPE_OPTIONS, t);
  }
  protected statusLabel(s: string | undefined): string {
    return examLabel(EXAM_STATUS_OPTIONS, s);
  }
  protected statusTone(s: string | undefined) {
    return examStatusTone(s);
  }
}
