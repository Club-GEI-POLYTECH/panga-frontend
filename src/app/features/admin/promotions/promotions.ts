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
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { PaginationMeta } from '../../../core/models/api.models';
import type { ClassInstance, Student } from '../models/admin.models';
import type { PromotionDecision } from '../models/promotion.models';
import {
  DECISION_STATUS_OPTIONS,
  PROMOTION_DECISION_OPTIONS,
  decisionTone,
  promotionLabel,
} from '../../../core/models/promotion.enums';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';

@Component({
  selector: 'panga-promotions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
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
    <div class="panga-card p-5 mb-6 flex flex-wrap items-end gap-3">
      <mat-form-field appearance="outline" class="flex-1 min-w-55">
        <mat-label>Classe</mat-label>
        <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-37.5">
        <mat-label>Année scolaire</mat-label>
        <input matInput [formControl]="schoolYear" placeholder="Année en cours" (blur)="reload()" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-37.5">
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
        <button mat-stroked-button class="rounded-xl!" (click)="compute()" [disabled]="busy()">
          <mat-icon fontSet="material-symbols-outlined">calculate</mat-icon> Calculer
        </button>
        <button
          mat-flat-button
          class="rounded-xl!"
          (click)="finalize()"
          [disabled]="busy() || !hasDraft()"
        >
          <mat-icon fontSet="material-symbols-outlined">lock</mat-icon> Finaliser
        </button>
      }
    </div>

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
              <div class="flex items-center gap-4 px-5 py-3">
                <panga-avatar [name]="studentName(d)" [size]="38" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-(--text) truncate">
                    {{ studentName(d) }}
                  </p>
                  <p class="text-xs text-(--text-muted)">
                    Moyenne :
                    <span class="font-medium" [style.color]="avgColor(d)">{{ avg(d) }}</span>
                    @if (d.passThreshold !== null && d.passThreshold !== undefined) {
                      · seuil {{ num(d.passThreshold) }}%
                    }
                  </p>
                </div>
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

  protected readonly decisions = signal<PromotionDecision[]>([]);
  protected readonly meta = signal<PaginationMeta | null>(null);
  private readonly students = signal<Student[]>([]);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  private page = 1;

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
    this.studentsApi
      .list({ page: 1, limit: 300, schoolYear: this.schoolYear.value })
      .subscribe({ next: (r) => this.students.set(r.items) });
    this.reload();
  }

  reload(): void {
    if (!this.classId()) {
      return;
    }
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
    this.busy.set(true);
    this.promotionsApi
      .finalize({ classInstanceId: this.classId(), schoolYear: this.yr() })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.notify.success('Décisions finalisées.');
          this.reload();
        },
        error: () => this.busy.set(false),
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
    const tone = decisionTone(decision);
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
}
