import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AcademicsService } from '../services/academics.service';
import { ClassesService } from '../services/classes.service';
import { StudentsService } from '../services/students.service';
import type {
  Bulletin,
  BulletinPreview,
  BulletinSubjectGrade,
  ClassInstance,
  GenerateClassResult,
  Student,
} from '../models/admin.models';
import { classLabel, personLabel } from '../shared/labels';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { clientMeta, pageSlice } from '../../../shared/ui/client-pagination';
import { SectionHeader } from '../../../shared/ui/section-header';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { BulletinOfficial } from './bulletin-official';

/** `ANNUAL` = toute l'année : le back reçoit alors **aucun** `term`. */
const TERMS = [
  { value: 'ANNUAL', label: "Annuel (toute l'année)" },
  { value: 'TERM1', label: '1er trimestre' },
  { value: 'TERM2', label: '2e trimestre' },
  { value: 'TERM3', label: '3e trimestre' },
];

function isPublished(b: Bulletin): boolean {
  return b.published === true || b.status === 'published';
}

@Component({
  selector: 'panga-bulletins-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    Avatar,
    EmptyState,
    PageHeader,
    Paginator,
    SectionHeader,
    SkeletonTable,
    BulletinOfficial,
  ],
  template: `
    <panga-page-header icon="description" title="Bulletins" [subtitle]="headerSubtitle()">
      @if (classId() && isClassTutor()) {
        <button mat-flat-button class="rounded-xl! bulletins-cta" (click)="toggleForm()">
          <mat-icon fontSet="material-symbols-outlined">{{
            showForm() ? 'close' : 'note_add'
          }}</mat-icon>
          {{ showForm() ? 'Annuler' : 'Générer un bulletin' }}
        </button>
      }
    </panga-page-header>

    <div class="panga-card p-4 mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
      <mat-form-field
        appearance="outline"
        class="w-full sm:flex-1 sm:min-w-50"
        subscriptSizing="dynamic"
      >
        <mat-label>Classe</mat-label>
        <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ classLabel(c) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field
        appearance="outline"
        class="w-full sm:w-auto sm:min-w-45"
        subscriptSizing="dynamic"
      >
        <mat-label>Période</mat-label>
        <mat-select [value]="term()" (selectionChange)="selectTerm($event.value)">
          @for (t of terms; track t.value) {
            <mat-option [value]="t.value">{{ t.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (classId()) {
        @if (isClassTutor()) {
          <button
            mat-stroked-button
            class="rounded-xl!"
            [disabled]="generatingClass()"
            (click)="generateAll()"
          >
            <mat-icon fontSet="material-symbols-outlined">groups</mat-icon>
            {{ generatingClass() ? 'Génération…' : 'Générer la classe' }}
          </button>
        }
        <button mat-stroked-button class="rounded-xl!" (click)="printClass()">
          <mat-icon fontSet="material-symbols-outlined">print</mat-icon>
          Imprimer la classe
        </button>
      }
    </div>

    @if (!classId()) {
      <div class="panga-card">
        <panga-empty-state
          icon="description"
          title="Choisissez une classe"
          description="Sélectionnez une classe et une période pour gérer les bulletins."
        />
      </div>
    } @else {
      <div
        class="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1"
        role="tablist"
        aria-label="Sections bulletins"
      >
        @for (t of pageTabs; track t.id) {
          <button
            type="button"
            role="tab"
            class="shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors border"
            [attr.aria-selected]="pageTab() === t.id"
            [class.tab-active]="pageTab() === t.id"
            [class.tab-idle]="pageTab() !== t.id"
            (click)="pageTab.set(t.id)"
          >
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">{{ t.icon }}</span>
              {{ t.label }}
              @if (t.id === 'list' && filtered().length) {
                <span class="tab-count">{{ filtered().length }}</span>
              }
            </span>
          </button>
        }
      </div>

      @if (pageTab() === 'list') {
        @if (showForm()) {
          <form [formGroup]="form" (ngSubmit)="generate()" class="panga-card p-6 mb-6">
            <panga-section-header icon="note_add" title="Générer un bulletin" />
            <div class="grid gap-4 sm:grid-cols-2">
              <mat-form-field appearance="outline">
                <mat-label>Élève</mat-label>
                <mat-select formControlName="studentId">
                  @for (s of classStudents(); track s.id) {
                    <mat-option [value]="s.id">{{ studentName(s) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <div class="flex justify-end mt-2">
              <button
                mat-flat-button
                class="rounded-xl! bulletins-cta"
                type="submit"
                [disabled]="generating()"
              >
                {{ generating() ? 'Génération…' : 'Générer pour ' + termLabel() }}
              </button>
            </div>
          </form>
        }

        <section class="panga-card p-5">
          <panga-section-header icon="description" title="Bulletins" [count]="filtered().length" />
          @if (bulletins().length) {
            <mat-form-field appearance="outline" class="w-full mb-3" subscriptSizing="dynamic">
              <mat-label>Rechercher un élève</mat-label>
              <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
              <input matInput [formControl]="searchCtrl" placeholder="Nom de l'élève…" />
            </mat-form-field>
          }
          @if (loading()) {
            <panga-skeleton-table />
          } @else if (loadError()) {
            <panga-empty-state
              icon="error"
              title="Impossible de charger les bulletins"
              description="Vérifiez votre connexion puis réessayez."
              actionLabel="Réessayer"
              (action)="reload()"
            />
          } @else if (filtered().length === 0) {
            <panga-empty-state
              icon="description"
              title="Aucun bulletin"
              [description]="
                bulletins().length
                  ? 'Aucun élève ne correspond à la recherche.'
                  : isClassTutor()
                    ? 'Générez les bulletins de la classe pour cette période.'
                    : 'Aucun bulletin pour cette classe et période.'
              "
              [actionLabel]="isClassTutor() && !bulletins().length ? 'Générer la classe' : ''"
              (action)="generateAll()"
            />
          } @else {
            <div class="grid gap-2 mb-2">
              @for (b of visibleBulletins(); track b.id) {
                <article class="bulletin-card rounded-2xl border border-(--border) p-3.5">
                  <div class="flex items-start gap-3">
                    <panga-avatar [name]="bulletinName(b)" [size]="44" class="shrink-0" />
                    <div class="min-w-0 flex-1">
                      <h3
                        class="text-sm font-semibold text-(--text) truncate"
                        style="font-family: Urbanist, sans-serif"
                      >
                        {{ bulletinName(b) }}
                      </h3>
                      <div
                        class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-(--text-muted)"
                      >
                        <span class="inline-flex items-center gap-1">
                          <span class="material-symbols-outlined text-[14px]">event</span>
                          {{ termLabelOf(b.term) || termLabel() }}
                        </span>
                        @if (b.average !== undefined && b.average !== null) {
                          <span class="inline-flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">grade</span>
                            Moy. {{ b.average }}
                          </span>
                        }
                        @if (b.rank) {
                          <span class="inline-flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">leaderboard</span>
                            Rang {{ b.rank }}
                          </span>
                        }
                      </div>
                      <div class="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          class="chip"
                          [class.chip--success]="published(b)"
                          [class.chip--neutral]="!published(b)"
                        >
                          @if (published(b)) {
                            <span class="chip__dot"></span>
                          }
                          {{ published(b) ? 'Publié' : 'Brouillon' }}
                        </span>
                      </div>
                    </div>
                    <div class="flex shrink-0 items-center gap-0.5">
                      <button
                        mat-icon-button
                        aria-label="Télécharger le PDF"
                        matTooltip="Télécharger le PDF"
                        (click)="printOne(b)"
                      >
                        <mat-icon fontSet="material-symbols-outlined">picture_as_pdf</mat-icon>
                      </button>
                      @if (!published(b) && isClassTutor()) {
                        <button
                          mat-icon-button
                          aria-label="Publier"
                          matTooltip="Publier"
                          (click)="publish(b)"
                        >
                          <mat-icon
                            fontSet="material-symbols-outlined"
                            style="color: var(--success)"
                          >
                            send
                          </mat-icon>
                        </button>
                      }
                    </div>
                  </div>
                </article>
              }
            </div>
            <div class="mt-3">
              <panga-paginator [meta]="pageMeta()" (pageChange)="page.set($event)" />
            </div>
          }
        </section>
      }

      @if (pageTab() === 'preview') {
        <section class="panga-card p-5">
          <panga-section-header icon="preview" title="Aperçu avant impression" />
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <mat-form-field
              appearance="outline"
              class="w-full sm:flex-1 sm:min-w-55"
              subscriptSizing="dynamic"
            >
              <mat-label>Élève à prévisualiser</mat-label>
              <mat-select
                [formControl]="previewStudent"
                (selectionChange)="loadPreview($event.value)"
              >
                @for (s of classStudents(); track s.id) {
                  <mat-option [value]="s.id">{{ studentName(s) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (preview()) {
              <button
                mat-stroked-button
                class="rounded-xl! w-full sm:w-auto"
                (click)="closePreview()"
              >
                <mat-icon fontSet="material-symbols-outlined">close</mat-icon> Fermer
              </button>
            }
          </div>

          @if (loadingPreview()) {
            <panga-skeleton-table />
          } @else if (!previewStudent.value) {
            <panga-empty-state
              [compact]="true"
              icon="preview"
              title="Choisir un élève"
              description="Sélectionnez un élève pour afficher l'aperçu du bulletin."
            />
          } @else if (preview(); as p) {
            @if (p.ministerialSnapshot) {
              <div class="mt-4">
                <panga-bulletin-official
                  [snapshot]="p.ministerialSnapshot"
                  [studentName]="previewName()"
                  [className]="className()"
                  [schoolYear]="p.schoolYear || schoolYear"
                />
              </div>
            } @else {
              <div class="mt-4 rounded-2xl border border-(--border) bg-(--surface) p-5">
                <div class="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p
                      class="text-lg font-semibold text-(--text)"
                      style="font-family: Urbanist, sans-serif"
                    >
                      {{ previewName() }}
                    </p>
                    <p class="text-xs text-(--text-muted)">
                      {{ termLabelOf(p.term) || p.term }} · Année {{ p.schoolYear }}
                      <span
                        class="ml-1 rounded border px-1.5 py-0.5 text-[10px]"
                        style="
                          border-color: var(--warning);
                          color: var(--warning);
                        "
                        >Aperçu — non enregistré</span
                      >
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-2xl font-semibold" [style.color]="avgColor(p.totalAverage)">
                      {{ pctText(p.totalAverage) }}
                    </p>
                    <p class="text-xs text-(--text-muted)">
                      Rang {{ p.rank ?? '—' }} / {{ p.rankOutOf ?? '—' }}
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-center">
                  <div class="rounded-xl border border-(--border) p-2">
                    <p class="text-[11px] text-(--text-muted)">Moy. pondérée</p>
                    <p class="text-sm font-semibold text-(--text)">
                      {{ pctText(p.weightedAverage) }}
                    </p>
                  </div>
                  <div class="rounded-xl border border-(--border) p-2">
                    <p class="text-[11px] text-(--text-muted)">Réussies</p>
                    <p class="text-sm font-semibold text-(--text)">
                      {{ p.passedSubjects ?? '—' }} / {{ p.totalSubjects ?? '—' }}
                    </p>
                  </div>
                  <div class="rounded-xl border border-(--border) p-2">
                    <p class="text-[11px] text-(--text-muted)">Assiduité</p>
                    <p class="text-sm font-semibold text-(--text)">
                      {{ pctText(p.attendancePercentage) }}
                    </p>
                  </div>
                  <div class="rounded-xl border border-(--border) p-2">
                    <p class="text-[11px] text-(--text-muted)">Percentile</p>
                    <p class="text-sm font-semibold text-(--text)">{{ p.percentile ?? '—' }}</p>
                  </div>
                </div>

                <div class="overflow-x-auto -mx-5 px-5">
                  <table class="min-w-full text-sm border-collapse">
                    <thead>
                      <tr class="text-left text-xs text-(--text-muted)">
                        <th class="px-2 py-2 font-medium">Matière</th>
                        <th class="px-2 py-2 text-right font-medium">P1</th>
                        <th class="px-2 py-2 text-right font-medium">P2</th>
                        <th class="px-2 py-2 text-right font-medium">Examen</th>
                        <th class="px-2 py-2 text-right font-medium">Moyenne</th>
                        <th class="px-2 py-2 text-center font-medium">Cote</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of p.subjectGrades ?? []; track s.nationalProgramSlotId || $index) {
                        <tr
                          class="border-t border-(--border)"
                          [class.opacity-50]="s.isSlotNotOffered"
                        >
                          <td class="px-2 py-2 whitespace-nowrap text-(--text)">
                            {{ s.subjectName || s.subjectCode || '—' }}
                          </td>
                          <td class="px-2 py-2 text-right">{{ n(s.period1Average) }}</td>
                          <td class="px-2 py-2 text-right">{{ n(s.period2Average) }}</td>
                          <td class="px-2 py-2 text-right">{{ n(s.examScore) }}</td>
                          <td class="px-2 py-2 text-right font-semibold text-(--text)">
                            {{ subjectFinal(s) }}
                          </td>
                          <td class="px-2 py-2 text-center">{{ s.letterGrade || '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                @if (p.classTeacherComment || p.overallComment) {
                  <p class="mt-3 text-xs text-(--text-muted)">
                    {{ p.classTeacherComment || p.overallComment }}
                  </p>
                }
              </div>
            }
          }
        </section>
      }
    }
  `,
  styles: [
    `
      button.bulletins-cta {
        background: var(--brand-gradient) !important;
        color: #ffffff !important;
      }
      button.bulletins-cta .mat-icon,
      button.bulletins-cta .material-symbols-outlined {
        color: #ffffff !important;
      }
      button.bulletins-cta:disabled {
        opacity: 0.55;
      }
      .tab-active {
        background: var(--brand-gradient);
        color: #fff;
        border-color: transparent;
      }
      .tab-idle {
        background: color-mix(in srgb, var(--text) 4%, transparent);
        color: var(--text);
        border-color: var(--border);
      }
      .tab-idle:hover {
        background: color-mix(in srgb, var(--brand-500) 10%, transparent);
        border-color: color-mix(in srgb, var(--brand-500) 35%, var(--border));
      }
      .tab-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 0.35rem;
        border-radius: 999px;
        font-size: 0.6875rem;
        font-weight: 700;
        background: color-mix(in srgb, currentColor 18%, transparent);
      }
      .bulletin-card {
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }
      .bulletin-card:hover {
        border-color: color-mix(in srgb, var(--brand-500) 40%, var(--border));
        box-shadow: 0 12px 28px -18px color-mix(in srgb, var(--brand-700) 55%, transparent);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.6875rem;
        font-weight: 600;
        line-height: 1.2;
        border: 1px solid transparent;
      }
      .chip__dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: currentColor;
      }
      .chip--success {
        color: var(--success);
        background: color-mix(in srgb, var(--success) 14%, transparent);
        border-color: color-mix(in srgb, var(--success) 28%, transparent);
      }
      .chip--neutral {
        color: var(--text-muted);
        background: color-mix(in srgb, var(--text-muted) 12%, transparent);
        border-color: color-mix(in srgb, var(--text-muted) 22%, transparent);
      }
    `,
  ],
})
export class BulletinsList {
  private readonly academics = inject(AcademicsService);
  private readonly classesApi = inject(ClassesService);
  private readonly studentsApi = inject(StudentsService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);
  private readonly auth = inject(AuthStore);

  /**
   * Gestion des bulletins (générer / publier) réservée au **titulaire** de la
   * classe côté back. Admin : toujours autorisé ; enseignant : seulement s'il est
   * titulaire. L'aperçu, la lecture et les PDF restent ouverts (cf. RBAC).
   */
  protected readonly isClassTutor = computed(() => {
    if (this.auth.role() !== 'teacher') {
      return true;
    }
    const uid = this.auth.user()?.id;
    const cls = this.classes().find((c) => c.id === this.classId());
    return !!uid && !!cls?.classTeacherId && cls.classTeacherId === uid;
  });

  protected readonly classLabel = classLabel;
  protected readonly schoolYear = this.sy.selected();
  protected readonly terms = TERMS;
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classId = signal('');
  protected readonly term = signal('ANNUAL');
  protected readonly pageTab = signal<'list' | 'preview'>('list');
  protected readonly pageTabs = [
    { id: 'list' as const, icon: 'description', label: 'Bulletins' },
    { id: 'preview' as const, icon: 'preview', label: 'Aperçu' },
  ];

  /** Paramètre `term` envoyé au back : omis quand « Annuel » (= toute l'année). */
  private termParam(): string | undefined {
    return this.term() === 'ANNUAL' ? undefined : this.term();
  }
  protected readonly bulletins = signal<Bulletin[]>([]);
  protected readonly page = signal(1);
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });
  protected readonly search = signal('');
  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) {
      return this.bulletins();
    }
    return this.bulletins().filter((b) => this.bulletinName(b).toLowerCase().includes(q));
  });
  protected readonly pageMeta = computed(() => clientMeta(this.filtered().length, this.page()));
  protected readonly visibleBulletins = computed(() => pageSlice(this.filtered(), this.page()));
  protected readonly roster = signal<Student[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal(false);
  protected readonly generating = signal(false);
  protected readonly generatingClass = signal(false);
  protected readonly showForm = signal(false);

  protected readonly previewStudent = new FormControl('', { nonNullable: true });
  protected readonly preview = signal<BulletinPreview | null>(null);
  protected readonly loadingPreview = signal(false);

  protected readonly published = isPublished;
  protected readonly classStudents = computed(() => this.roster());
  /** Index `studentId → élève` pour résoudre les noms quand le bulletin ne les embarque pas. */
  private readonly studentsById = computed(() => {
    const m = new Map<string, Student>();
    for (const s of this.roster()) {
      m.set(s.id, s);
    }
    return m;
  });
  protected readonly className = computed(() => {
    const c = this.classes().find((x) => x.id === this.classId());
    return c ? classLabel(c as unknown as Record<string, unknown>) : this.classId();
  });

  protected readonly headerSubtitle = computed(() => {
    const year = this.sy.selected();
    return year ? `Bulletins scolaires · Année ${year}` : 'Bulletins scolaires';
  });

  protected readonly form = this.fb.nonNullable.group({
    studentId: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      this.sy.selected();
      untracked(() => {
        this.classesApi
          .list(this.sy.filter())
          .subscribe({ next: (r) => this.classes.set(r.items) });
        this.roster.set([]);
        this.classId.set('');
        this.preview.set(null);
        this.showForm.set(false);
      });
    });
    this.searchCtrl.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe((v) => {
      this.search.set(v.trim());
      this.page.set(1);
    });
  }

  protected toggleForm(): void {
    this.showForm.set(!this.showForm());
    if (this.showForm()) {
      this.pageTab.set('list');
    }
  }

  protected reload(): void {
    this.load();
  }

  protected termLabel(): string {
    return TERMS.find((t) => t.value === this.term())?.label ?? this.term();
  }
  protected termLabelOf(term: string | undefined): string {
    if (!term) {
      return '';
    }
    return TERMS.find((t) => t.value === term)?.label ?? term;
  }

  protected studentName(s: Student): string {
    const label = personLabel(s as Record<string, unknown>);
    if (label && label !== 'Parent') {
      return label;
    }
    return s.studentNumber || s.matricule || 'Élève';
  }
  /**
   * Nom lisible d'un bulletin : le back expose souvent `student.user` plutôt que
   * `studentName` plat — on croise aussi avec le roster de la classe.
   */
  protected bulletinName(b: Bulletin): string {
    if (typeof b.studentName === 'string' && b.studentName.trim()) {
      return b.studentName.trim();
    }
    const embedded = (b['student'] ?? {}) as Record<string, unknown>;
    const fromEmbedded = personLabel(embedded);
    if (fromEmbedded && fromEmbedded !== 'Parent') {
      return fromEmbedded;
    }
    const id = b.studentId || String(embedded['id'] ?? '');
    const known = id ? this.studentsById().get(id) : undefined;
    if (known) {
      return this.studentName(known);
    }
    return 'Élève';
  }

  selectClass(id: string): void {
    this.classId.set(id);
    this.preview.set(null);
    this.previewStudent.setValue('', { emitEvent: false });
    this.showForm.set(false);
    this.studentsApi
      .list({ page: 1, limit: 500, classId: id, schoolYear: this.sy.filter() })
      .subscribe({
        next: (r) => this.roster.set(r.items),
        error: () => this.roster.set([]),
      });
    this.load();
  }
  selectTerm(t: string): void {
    this.term.set(t);
    this.preview.set(null);
    if (this.classId()) {
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.academics.classBulletins(this.classId(), this.sy.filter(), this.termParam()).subscribe({
      next: (r) => {
        this.bulletins.set(r.items);
        this.page.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  loadPreview(studentId: string): void {
    if (!studentId) {
      this.preview.set(null);
      return;
    }
    this.loadingPreview.set(true);
    this.academics
      .previewBulletin({
        studentId,
        classId: this.classId(),
        schoolYear: this.sy.filter(),
        term: this.termParam(),
      })
      .subscribe({
        next: (p) => {
          this.preview.set(p);
          this.loadingPreview.set(false);
        },
        error: () => {
          this.preview.set(null);
          this.loadingPreview.set(false);
          this.notify.error('Aperçu indisponible pour cet élève.');
        },
      });
  }
  closePreview(): void {
    this.preview.set(null);
    this.previewStudent.setValue('', { emitEvent: false });
  }
  protected previewName(): string {
    const p = this.preview();
    if (!p) {
      return '';
    }
    if (typeof p.studentName === 'string' && p.studentName.trim()) {
      return p.studentName.trim();
    }
    const embedded = (p['student'] ?? {}) as Record<string, unknown>;
    const fromEmbedded = personLabel(embedded);
    if (fromEmbedded && fromEmbedded !== 'Parent') {
      return fromEmbedded;
    }
    const id = p.studentId || String(embedded['id'] ?? '');
    const known = id ? this.studentsById().get(id) : undefined;
    return known ? this.studentName(known) : 'Élève';
  }

  generateAll(): void {
    if (!this.classId() || this.generatingClass()) {
      return;
    }
    this.generatingClass.set(true);
    this.academics
      .generateClass({
        classId: this.classId(),
        schoolYear: this.sy.filter(),
        term: this.term(),
        generatePdf: false,
        publishImmediately: false,
      })
      .subscribe({
        next: (r: GenerateClassResult) => {
          this.generatingClass.set(false);
          const gen = r.generated ?? 0;
          const skip = r.skipped ?? 0;
          this.notify.success(
            `${gen} bulletin(s) généré(s)${skip ? `, ${skip} déjà à jour` : ''}.`,
          );
          this.load();
        },
        error: () => this.generatingClass.set(false),
      });
  }

  printClass(): void {
    if (!this.classId()) {
      return;
    }
    this.academics.classPdf(this.classId(), this.sy.filter(), this.term()).subscribe({
      next: (b) => downloadBlob(b, `bulletins_${this.term()}.pdf`),
      error: () =>
        this.notify.error('PDF indisponible. Générez d’abord les bulletins de la classe.'),
    });
  }

  printOne(b: Bulletin): void {
    this.academics.bulletinPdf(b.id).subscribe({
      next: (blob) => downloadBlob(blob, `bulletin_${this.bulletinName(b)}.pdf`),
      error: () => this.notify.error('PDF indisponible.'),
    });
  }

  protected n(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : `${Math.round(Number(v) * 100) / 100}`;
  }
  protected pctText(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : `${Math.round(Number(v))}%`;
  }
  protected avgColor(v: number | null | undefined): string {
    if (v === null || v === undefined) {
      return 'var(--text)';
    }
    const p = Math.round(Number(v));
    return p >= 75 ? 'var(--success)' : p >= 50 ? 'var(--brand-deep)' : 'var(--danger)';
  }
  protected subjectFinal(s: BulletinSubjectGrade): string {
    return this.n(s.finalAverage);
  }

  generate(): void {
    if (this.form.invalid || this.generating()) {
      this.form.markAllAsTouched();
      return;
    }
    this.generating.set(true);
    this.academics
      .generateBulletin({
        studentId: this.form.getRawValue().studentId,
        classId: this.classId(),
        schoolYear: this.sy.selected(),
        term: this.term(),
        generatePdf: false,
        publishImmediately: false,
      })
      .subscribe({
        next: () => {
          this.generating.set(false);
          this.notify.success('Bulletin généré.');
          this.form.reset();
          this.showForm.set(false);
          this.load();
        },
        error: () => this.generating.set(false),
      });
  }

  publish(b: Bulletin): void {
    this.academics.publishBulletin(b.id).subscribe({
      next: () => {
        this.notify.success('Bulletin publié.');
        this.load();
      },
    });
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
