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
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { PromotionsService } from '../services/promotions.service';
import { ClassesService } from '../services/classes.service';
import { StudentsService } from '../services/students.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { NotificationService } from '../../../shared/ui/notification.service';
import { extractApiError } from '../../../core/http/api.util';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { PaginationMeta } from '../../../core/models/api.models';
import { ErrorCode } from '../../../core/models/api.models';
import type { ClassInstance, Student } from '../models/admin.models';
import type {
  FinalizeResult,
  PromotionDecision,
  PromotionEnrollmentResult,
} from '../models/promotion.models';
import {
  DECISION_STATUS_OPTIONS,
  ENROLLMENT_OUTCOME_OPTIONS,
  PROMOTION_DECISION_OPTIONS,
  decisionTone,
  enrollmentTone,
  promotionLabel,
} from '../../../core/models/promotion.enums';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

@Component({
  selector: 'panga-promotions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    Avatar,
    EmptyState,
    PageHeader,
    Paginator,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="workspace_premium"
      title="Promotions"
      subtitle="Décisions de fin d'année (passage / redoublement)"
    />

    <!-- Contexte -->
    <div class="panga-card p-5 mb-6">
      <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <mat-form-field
          appearance="outline"
          class="w-full sm:flex-1 sm:min-w-55"
          subscriptSizing="dynamic"
        >
          <mat-label>Classe</mat-label>
          <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
            @for (c of classes(); track c.id) {
              <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full sm:w-37.5" subscriptSizing="dynamic">
          <mat-label>Année scolaire</mat-label>
          <input
            matInput
            [formControl]="schoolYear"
            placeholder="Année en cours"
            (blur)="reload()"
          />
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full sm:w-37.5" subscriptSizing="dynamic">
          <mat-label>Seuil (%)</mat-label>
          <input
            matInput
            type="number"
            [formControl]="threshold"
            min="0"
            max="100"
            placeholder="50"
          />
        </mat-form-field>
        @if (isAdmin() && classId()) {
          <button
            mat-stroked-button
            class="rounded-xl! w-full sm:w-auto"
            (click)="compute()"
            [disabled]="busy()"
          >
            <mat-icon fontSet="material-symbols-outlined">calculate</mat-icon> Calculer
          </button>
          <button
            mat-flat-button
            class="rounded-xl! w-full sm:w-auto"
            (click)="finalize()"
            [disabled]="busy() || !hasDraft()"
          >
            <mat-icon fontSet="material-symbols-outlined">lock</mat-icon> Finaliser
          </button>
        }
      </div>

      @if (isAdmin() && classId()) {
        <div class="mt-3 flex flex-col items-start gap-2">
          <button
            type="button"
            class="appearance-none border-0 bg-transparent p-0 inline-flex items-center gap-1 text-xs text-(--text-muted) hover:text-(--text)"
            (click)="showAdvanced.set(!showAdvanced())"
          >
            <mat-icon fontSet="material-symbols-outlined" class="text-base!">{{
              showAdvanced() ? 'expand_less' : 'expand_more'
            }}</mat-icon>
            Options avancées
          </button>
          @if (showAdvanced()) {
            <mat-form-field
              appearance="outline"
              class="block w-full sm:w-50"
              subscriptSizing="dynamic"
            >
              <mat-label>Année de destination</mat-label>
              <input matInput [formControl]="toSchoolYear" placeholder="Déduite de l'année + 1" />
            </mat-form-field>
          }
        </div>
      }
    </div>

    @if (incompleteNotes(); as notes) {
      <div class="panga-card p-4 mb-6 border border-(--danger)!">
        <p class="text-sm font-medium text-(--danger) flex items-center gap-2">
          <mat-icon fontSet="material-symbols-outlined">error</mat-icon>
          Notes incomplètes — impossible de finaliser
        </p>
        <ul class="mt-2 ml-7 list-disc text-sm text-(--text-muted) space-y-1">
          @for (n of notes; track n) {
            <li>{{ n }}</li>
          }
        </ul>
      </div>
    }

    @if (finalizeResult(); as result) {
      <section class="panga-card p-5 mb-6">
        <panga-section-header icon="fact_check" title="Résultat de la finalisation" />
        <div class="grid gap-3 grid-cols-2 sm:grid-cols-5 my-4">
          @for (o of enrollmentOptions; track o.value) {
            <div class="panga-card p-4 text-center">
              <p class="text-2xl font-semibold" [style.color]="enrollmentColor(o.value)">
                {{ enrollmentCount(result, o.value) }}
              </p>
              <p class="text-xs text-(--text-muted)">{{ o.label }}</p>
            </div>
          }
        </div>
        @if (failedEnrollments(result).length) {
          <div class="border-t border-(--border) pt-3 mt-1">
            <p class="text-sm font-medium text-(--danger) mb-2">
              Réinscriptions à faire manuellement
            </p>
            <ul class="space-y-2">
              @for (e of failedEnrollments(result); track e.studentId) {
                <li class="text-sm">
                  <span class="font-medium text-(--text)">{{ enrollmentStudentName(e) }}</span>
                  <span class="text-(--text-muted)"> — {{ e.message }}</span>
                </li>
              }
            </ul>
            <a
              routerLink="/classes"
              class="inline-flex items-center gap-1 mt-3 text-sm text-(--brand) hover:underline"
            >
              <mat-icon fontSet="material-symbols-outlined" style="font-size: 18px"
                >arrow_forward</mat-icon
              >
              Créer la classe manquante puis réinscrire depuis sa fiche
            </a>
          </div>
        }
      </section>
    }

    @if (!classId()) {
      <div class="panga-card">
        <panga-empty-state
          icon="workspace_premium"
          title="Choisissez une classe"
          description="Sélectionnez une classe pour calculer et consulter les décisions de fin d'année."
        />
      </div>
    } @else {
      <!-- Synthèse -->
      @if (decisions().length) {
        <section class="grid gap-3 grid-cols-2 sm:grid-cols-5 mb-6">
          @for (o of decisionOptions; track o.value) {
            <div class="panga-card p-4 text-center">
              <p class="text-2xl font-semibold" [style.color]="countColor(o.value)">
                {{ countOf(o.value) }}
              </p>
              <p class="text-xs text-(--text-muted)">{{ o.label }}</p>
            </div>
          }
        </section>
      }

      <section class="panga-card p-5">
        <panga-section-header
          icon="how_to_reg"
          title="Décisions"
          [count]="meta()?.total ?? decisions().length"
        >
          <mat-form-field appearance="outline" class="w-45 -mb-5!" subscriptSizing="dynamic">
            <mat-label>Filtrer</mat-label>
            <mat-select [formControl]="filterDecision" (selectionChange)="reload()">
              <mat-option [value]="''">Toutes</mat-option>
              @for (o of decisionOptions; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </panga-section-header>

        @if (loading()) {
          <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
        } @else if (decisions().length === 0) {
          <panga-empty-state
            icon="how_to_reg"
            title="Aucune décision"
            description="Cliquez sur « Calculer » pour générer les décisions de la classe."
          />
        } @else {
          <div class="divide-y divide-(--border) -mx-5">
            @for (d of decisions(); track d.id || $index) {
              <div class="flex flex-col gap-1.5 px-5 py-3">
                <div class="flex items-center gap-4">
                  <panga-avatar [name]="studentName(d)" [size]="38" />
                  <p class="min-w-0 flex-1 text-sm font-medium text-(--text) truncate">
                    {{ studentName(d) }}
                  </p>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 pl-13.5">
                  <span class="text-xs text-(--text-muted) truncate">
                    Moyenne :
                    <span class="font-medium" [style.color]="avgColor(d)">{{ avg(d) }}</span>
                    @if (d.passThreshold !== null && d.passThreshold !== undefined) {
                      · seuil {{ num(d.passThreshold) }}%
                    }
                  </span>
                  <div class="flex shrink-0 items-center gap-1.5">
                    <panga-status-badge
                      [label]="decisionLabel(d.decision)"
                      [tone]="tone(d.decision)"
                      [dot]="false"
                    />
                    <panga-status-badge
                      [label]="statusLabel(d.status)"
                      [tone]="d.status === 'finalized' ? 'neutral' : 'brand'"
                      [dot]="false"
                    />
                    @if (isAdmin() && d.status !== 'finalized') {
                      <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Décision">
                        <mat-icon fontSet="material-symbols-outlined">more_vert</mat-icon>
                      </button>
                      <mat-menu #menu="matMenu" class="panga-menu">
                        @for (o of decisionOptions; track o.value) {
                          <button
                            mat-menu-item
                            (click)="override(d, o.value)"
                            [disabled]="d.decision === o.value"
                          >
                            <mat-icon fontSet="material-symbols-outlined">{{
                              iconFor(o.value)
                            }}</mat-icon>
                            <span>{{ o.label }}</span>
                          </button>
                        }
                      </mat-menu>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
          @if (meta(); as m) {
            <panga-paginator [meta]="m" (pageChange)="goPage($event)" />
          }
        }
      </section>

      <p class="text-xs text-(--text-muted) mt-3">
        La décision (admis / non admis) est calculée ici ; le passage effectif des élèves vers la
        classe de l'année suivante se fait depuis la fiche de la classe (promotion).
      </p>
    }
  `,
})
export class Promotions {
  private readonly promotionsApi = inject(PromotionsService);
  private readonly classesApi = inject(ClassesService);
  private readonly studentsApi = inject(StudentsService);
  private readonly store = inject(AuthStore);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly decisionOptions = PROMOTION_DECISION_OPTIONS;
  protected readonly isAdmin = computed(
    () => this.store.role() === 'admin' || this.store.role() === 'super_admin',
  );

  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classId = signal('');
  /** Initialisé sur le sélecteur global (vide = année en cours → GET sans année). */
  protected readonly schoolYear = new FormControl(this.sy.filter(), { nonNullable: true });
  /** Année pour les actions qui exigent une année (calcul, finalisation, transfert). */
  private yr(): string {
    return this.schoolYear.value || this.sy.current();
  }
  protected readonly threshold = new FormControl<number | null>(null);
  protected readonly filterDecision = new FormControl('', { nonNullable: true });
  /** Année de destination optionnelle pour la finalisation (options avancées). */
  protected readonly toSchoolYear = new FormControl('', { nonNullable: true });
  protected readonly showAdvanced = signal(false);

  protected readonly decisions = signal<PromotionDecision[]>([]);
  protected readonly meta = signal<PaginationMeta | null>(null);
  private readonly students = signal<Student[]>([]);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  private page = 1;

  protected readonly enrollmentOptions = ENROLLMENT_OUTCOME_OPTIONS;
  /** Checklist affichée sur le 422 « notes incomplètes » (BUSINESS_RULE_VIOLATION). */
  protected readonly incompleteNotes = signal<string[] | null>(null);
  protected readonly finalizeResult = signal<FinalizeResult | null>(null);

  protected readonly hasDraft = computed(() =>
    this.decisions().some((d) => d.status !== 'finalized'),
  );

  constructor() {
    // Synchronise le champ année sur le sélecteur global et recharge.
    effect(() => {
      this.sy.selected();
      untracked(() => {
        this.schoolYear.setValue(this.sy.filter());
        this.classesApi
          .list(this.sy.filter())
          .subscribe({ next: (r) => this.classes.set(r.items) });
        this.reload();
      });
    });
  }

  selectClass(id: string): void {
    this.classId.set(id);
    this.incompleteNotes.set(null);
    this.finalizeResult.set(null);
    this.studentsApi
      .list({ page: 1, limit: 300, schoolYear: this.schoolYear.value })
      .subscribe({ next: (r) => this.students.set(r.items) });
    this.reload();
  }

  reload(): void {
    if (!this.classId()) {
      return;
    }
    this.incompleteNotes.set(null);
    this.page = 1;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.promotionsApi
      .list({
        classInstanceId: this.classId(),
        schoolYear: this.schoolYear.value,
        decision: this.filterDecision.value || undefined,
        page: this.page,
        limit: 50,
      })
      .subscribe({
        next: (r) => {
          this.decisions.set(r.items);
          this.meta.set(r.pagination ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.decisions.set([]);
          this.meta.set(null);
          this.loading.set(false);
        },
      });
  }

  goPage(page: number): void {
    this.page = page;
    this.load();
  }

  compute(): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.incompleteNotes.set(null);
    this.finalizeResult.set(null);
    this.promotionsApi
      .compute({
        classInstanceId: this.classId(),
        schoolYear: this.yr(),
        ...(this.threshold.value !== null ? { passThreshold: Number(this.threshold.value) } : {}),
      })
      .subscribe({
        next: (rows) => {
          this.busy.set(false);
          this.decisions.set(rows);
          this.meta.set(null);
          this.notify.success(`${rows.length} décision(s) calculée(s) (brouillon).`);
        },
        error: () => this.busy.set(false),
      });
  }

  finalize(): void {
    if (this.busy()) {
      return;
    }
    const draftCount = this.decisions().filter((d) => d.status !== 'finalized').length;
    if (
      !confirm(
        `Cette action réinscrit réellement ${draftCount} élève(s) dans leur classe suivante et est irréversible. Continuer ?`,
      )
    ) {
      return;
    }
    this.busy.set(true);
    this.incompleteNotes.set(null);
    this.finalizeResult.set(null);
    const toYear = this.toSchoolYear.value.trim();
    this.promotionsApi
      .finalize({
        classInstanceId: this.classId(),
        schoolYear: this.yr(),
        ...(toYear ? { toSchoolYear: toYear } : {}),
      })
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.finalizeResult.set(result);
          this.notify.success(`${result.finalized} décision(s) finalisée(s).`);
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          const apiError = extractApiError(err);
          if (
            apiError?.code === ErrorCode.BUSINESS_RULE_VIOLATION &&
            typeof apiError.details === 'string' &&
            apiError.details.trim()
          ) {
            this.incompleteNotes.set(
              apiError.details
                .split(';')
                .map((s) => s.trim())
                .filter(Boolean),
            );
          } else {
            this.notify.error(apiError?.message ?? 'Impossible de finaliser les décisions.');
          }
        },
      });
  }

  override(d: PromotionDecision, decision: string): void {
    if (decision === 'transferred') {
      this.transfer(d);
      return;
    }
    this.promotionsApi.update(d.id, { decision }).subscribe({
      next: () => {
        this.notify.success('Décision mise à jour.');
        this.updateRow(d.id, { decision });
      },
    });
  }

  private transfer(d: PromotionDecision): void {
    if (!d.studentId) {
      return;
    }
    this.promotionsApi.recordTransfer({ studentId: d.studentId, schoolYear: this.yr() }).subscribe({
      next: () => {
        this.notify.success('Transfert enregistré.');
        this.updateRow(d.id, { decision: 'transferred' });
      },
    });
  }

  private updateRow(id: string, patch: Partial<PromotionDecision>): void {
    this.decisions.update((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  /* -------------------------------- Helpers -------------------------------- */

  protected countOf(decision: string): number {
    return this.decisions().filter((d) => d.decision === decision).length;
  }
  protected countColor(decision: string): string {
    return this.toneColor(decisionTone(decision));
  }
  protected enrollmentColor(outcome: string): string {
    return this.toneColor(enrollmentTone(outcome));
  }
  private toneColor(tone: string): string {
    return tone === 'success'
      ? 'var(--success)'
      : tone === 'danger'
        ? 'var(--danger)'
        : tone === 'warning'
          ? 'var(--warning)'
          : 'var(--text)';
  }
  protected num(v: unknown): number {
    const n = typeof v === 'string' ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  protected avg(d: PromotionDecision): string {
    return d.annualAverage === null || d.annualAverage === undefined
      ? '—'
      : `${Math.round(Number(d.annualAverage))}%`;
  }
  protected avgColor(d: PromotionDecision): string {
    if (d.annualAverage === null || d.annualAverage === undefined) {
      return 'var(--text-muted)';
    }
    const avg = Number(d.annualAverage);
    const threshold = d.passThreshold != null ? Number(d.passThreshold) : 50;
    return avg >= threshold ? 'var(--success)' : 'var(--danger)';
  }
  protected studentName(d: PromotionDecision): string {
    const s = (d.student ?? {}) as Record<string, unknown>;
    const fromRel = `${(s['firstName'] as string) ?? ''} ${(s['lastName'] as string) ?? ''}`.trim();
    if (fromRel) {
      return fromRel;
    }
    if (d.studentName) {
      return d.studentName;
    }
    const match = this.students().find((x) => x.id === d.studentId);
    return match
      ? `${match.firstName || ''} ${match.lastName || ''}`.trim() || d.studentId!
      : (d.studentId ?? '—');
  }
  protected decisionLabel(v: string | undefined): string {
    return promotionLabel(PROMOTION_DECISION_OPTIONS, v);
  }
  protected statusLabel(v: string | undefined): string {
    return promotionLabel(DECISION_STATUS_OPTIONS, v ?? 'draft');
  }
  protected tone(v: string | undefined) {
    return decisionTone(v);
  }
  protected iconFor(decision: string): string {
    switch (decision) {
      case 'passed':
        return 'check_circle';
      case 'failed':
        return 'cancel';
      case 'conditional':
        return 'help';
      case 'transferred':
        return 'swap_horiz';
      case 'graduated':
        return 'school';
      default:
        return 'edit';
    }
  }

  /* --------------------------- Résultat finalisation ------------------------ */

  protected enrollmentCount(result: FinalizeResult, outcome: string): number {
    return result.enrollments.filter((e) => e.outcome === outcome).length;
  }
  protected failedEnrollments(result: FinalizeResult): PromotionEnrollmentResult[] {
    return result.enrollments.filter((e) => e.outcome === 'failed');
  }
  protected enrollmentStudentName(e: PromotionEnrollmentResult): string {
    const decision = this.decisions().find((d) => d.studentId === e.studentId);
    if (decision) {
      return this.studentName(decision);
    }
    const match = this.students().find((x) => x.id === e.studentId);
    return match
      ? `${match.firstName || ''} ${match.lastName || ''}`.trim() || e.studentId
      : e.studentId;
  }
}
