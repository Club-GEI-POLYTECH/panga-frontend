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
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { clientMeta, pageSlice } from '../../../shared/ui/client-pagination';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
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
    StatusBadge,
    BulletinOfficial,
  ],
  template: `
    <panga-page-header icon="description" title="Bulletins" [subtitle]="'Année ' + schoolYear" />

    <div class="panga-card p-5 mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
      <mat-form-field
        appearance="outline"
        class="w-full sm:flex-1 sm:min-w-50"
        subscriptSizing="dynamic"
      >
        <mat-label>Classe</mat-label>
        <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
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
          <button mat-flat-button class="rounded-xl!" (click)="showForm.set(!showForm())">
            <mat-icon fontSet="material-symbols-outlined">{{
              showForm() ? 'close' : 'note_add'
            }}</mat-icon>
            {{ showForm() ? 'Annuler' : 'Générer un bulletin' }}
          </button>
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
          description="Sélectionnez une classe et un trimestre."
        />
      </div>
    } @else {
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
          <div class="flex justify-end">
            <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="generating()">
              Générer pour {{ term() }}
            </button>
          </div>
        </form>
      }

      <!-- Émulateur : aperçu d'un bulletin avant impression (dry-run, non persisté). -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header icon="preview" title="Aperçu de bulletin (avant impression)" />
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
          <p class="text-sm text-(--text-muted) py-6 text-center">Génération de l'aperçu…</p>
        } @else if (preview(); as p) {
          @if (p.ministerialSnapshot) {
            <!-- Bulletin officiel RDC (rendu depuis le snapshot ministériel). -->
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
                  <p class="text-lg font-semibold text-(--text)">{{ previewName() }}</p>
                  <p class="text-xs text-(--text-muted)">
                    {{ p.term }} · Année {{ p.schoolYear }}
                    <span
                      class="ml-1 rounded border border-(--warning) px-1.5 py-0.5 text-[10px] text-(--warning)"
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

      <section class="panga-card p-5">
        <panga-section-header icon="description" title="Bulletins" [count]="bulletins().length" />
        @if (bulletins().length) {
          <mat-form-field appearance="outline" class="w-full mb-2" subscriptSizing="dynamic">
            <mat-label>Rechercher un élève</mat-label>
            <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
            <input matInput [formControl]="searchCtrl" placeholder="Nom de l'élève…" />
          </mat-form-field>
        }
        @if (loading()) {
          <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
        } @else if (bulletins().length === 0) {
          <panga-empty-state
            icon="description"
            title="Aucun bulletin"
            description="Générez les bulletins de la classe."
          />
        } @else {
          <div class="divide-y divide-(--border) -mx-5">
            @for (b of visibleBulletins(); track b.id) {
              <div class="flex flex-col gap-1.5 px-5 py-3">
                <div class="flex items-center gap-3">
                  <panga-avatar [name]="bulletinName(b)" [size]="38" />
                  <p class="min-w-0 flex-1 text-sm font-medium text-(--text) truncate">
                    {{ bulletinName(b) }}
                  </p>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <div class="flex min-w-0 items-center gap-1.5 pl-12.5">
                    <panga-status-badge
                      [label]="published(b) ? 'Publié' : 'Brouillon'"
                      [tone]="statusTone(b)"
                      [dot]="false"
                      class="shrink-0"
                    />
                    <span class="text-xs text-(--text-muted) truncate">
                      {{ b.term || term() }}
                      @if (b.average !== undefined && b.average !== null) {
                        · Moyenne {{ b.average }}
                      }
                      @if (b.rank) {
                        · Rang {{ b.rank }}
                      }
                    </span>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
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
                        <mat-icon fontSet="material-symbols-outlined" style="color: var(--success)">
                          send
                        </mat-icon>
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
          <panga-paginator [meta]="pageMeta()" (pageChange)="page.set($event)" />
        }
      </section>
    }
  `,
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

  protected readonly schoolYear = this.sy.selected();
  protected readonly terms = TERMS;
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classId = signal('');
  protected readonly term = signal('ANNUAL');
  /** Paramètre `term` envoyé au back : omis quand « Annuel » (= toute l'année). */
  private termParam(): string | undefined {
    return this.term() === 'ANNUAL' ? undefined : this.term();
  }
  protected readonly bulletins = signal<Bulletin[]>([]);
  /** Pagination + recherche client de la liste des bulletins de la classe. */
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
  /** Roster de la classe (filtre serveur `classId`) — pour les sélecteurs d'élève. */
  protected readonly roster = signal<Student[]>([]);
  protected readonly loading = signal(false);
  protected readonly generating = signal(false);
  protected readonly generatingClass = signal(false);
  protected readonly showForm = signal(false);

  /* --------------------------------- Aperçu -------------------------------- */
  protected readonly previewStudent = new FormControl('', { nonNullable: true });
  protected readonly preview = signal<BulletinPreview | null>(null);
  protected readonly loadingPreview = signal(false);

  protected readonly published = isPublished;
  protected readonly classStudents = computed(() => this.roster());
  /** Libellé de la classe sélectionnée (pour l'en-tête du bulletin). */
  protected readonly className = computed(
    () => this.classes().find((c) => c.id === this.classId())?.template?.name || this.classId(),
  );

  protected readonly form = this.fb.nonNullable.group({
    studentId: ['', Validators.required],
  });

  constructor() {
    // Recharge les classes à chaque changement d'année (sélecteur global).
    // Le roster est chargé par classe (cf. selectClass).
    effect(() => {
      this.sy.selected();
      untracked(() => {
        this.classesApi
          .list(this.sy.filter())
          .subscribe({ next: (r) => this.classes.set(r.items) });
        this.roster.set([]);
        this.classId.set('');
        this.preview.set(null);
      });
    });
    this.searchCtrl.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe((v) => {
      this.search.set(v.trim());
      this.page.set(1);
    });
  }

  protected studentName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id;
  }
  /** Nom lisible d'un bulletin : le back ne renvoie pas toujours `studentName`. */
  protected bulletinName(b: Bulletin): string {
    if (b.studentName) {
      return b.studentName;
    }
    const s = this.roster().find((x) => x.id === b.studentId);
    return s ? this.studentName(s) : (b.studentId ?? '—');
  }
  protected statusTone(b: Bulletin): BadgeTone {
    return isPublished(b) ? 'success' : 'neutral';
  }

  selectClass(id: string): void {
    this.classId.set(id);
    this.preview.set(null);
    this.previewStudent.setValue('', { emitEvent: false });
    // Roster côté serveur (filtre `classId`) pour les sélecteurs d'élève.
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
    this.academics.classBulletins(this.classId(), this.sy.filter(), this.termParam()).subscribe({
      next: (r) => {
        this.bulletins.set(r.items);
        this.page.set(1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /* --------------------------- Aperçu (émulateur) -------------------------- */

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
        // Omis quand « Annuel » → le back renvoie toute l'année.
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
  /** Nom lisible de l'élève en aperçu (repli sur le roster). */
  protected previewName(): string {
    const p = this.preview();
    if (!p) {
      return '';
    }
    if (p.studentName) {
      return p.studentName;
    }
    const s = this.roster().find((x) => x.id === p.studentId);
    return s ? this.studentName(s) : (p.studentId ?? '—');
  }

  /* ----------------------------- Impression bloc --------------------------- */

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

  /* -------------------------------- Helpers -------------------------------- */

  protected n(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : `${Math.round(Number(v) * 100) / 100}`;
  }
  protected pctText(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : `${Math.round(Number(v))}%`;
  }
  /** Couleur d'une moyenne (% 0–100) : vert ≥ 75, marque ≥ 50, rouge sinon. */
  protected avgColor(v: number | null | undefined): string {
    if (v === null || v === undefined) {
      return 'var(--text)';
    }
    const p = Math.round(Number(v));
    return p >= 75 ? 'var(--success)' : p >= 50 ? 'var(--brand-700)' : 'var(--danger)';
  }
  /** Moyenne finale d'une matière (barème %, réaffichée telle quelle). */
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
