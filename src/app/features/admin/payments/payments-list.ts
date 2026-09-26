import { DatePipe, NgTemplateOutlet } from '@angular/common';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FilterSheetContent } from '../../../shared/ui/filter-sheet';
import { PaymentsService } from '../services/payments.service';
import { StudentsService } from '../services/students.service';
import { ClassesService } from '../services/classes.service';
import type { ClassInstance, FeeStructure, Payment, Student } from '../models/admin.models';
import type { PaginationMeta } from '../../../core/models/api.models';
import { classLabel } from '../shared/labels';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { DateField } from '../../../shared/ui/date-field';
import { SectionHeader } from '../../../shared/ui/section-header';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';
import { fmtMoney, fmtNumber } from '../../../shared/utils/format';

const SCHOOL_CURRENCY = 'CDF';

const FEE_TYPE_LABELS: Record<string, string> = {
  tuition: 'Scolarité',
  registration: 'Inscription',
  exam: 'Examen',
  other: 'Autre',
};

const FEE_FREQ_LABELS: Record<string, string> = {
  annual: 'Annuelle',
  quarterly: 'Trimestrielle',
  monthly: 'Mensuelle',
  one_time: 'Unique',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces',
  mobile_money: 'Mobile money',
  bank_transfer: 'Virement',
  card: 'Carte',
};

const METHOD_OPTIONS = Object.entries(METHOD_LABELS).map(([value, label]) => ({ value, label }));

const STAT_LABELS: Record<string, string> = {
  totalCollected: 'Encaissé',
  totalPaid: 'Encaissé',
  totalAmount: 'Montant total',
  totalRevenue: 'Recettes',
  amountCollected: 'Encaissé',
  collectedAmount: 'Encaissé',
  pendingAmount: 'En attente',
  unpaidAmount: 'Impayés',
  paymentCount: 'Paiements',
  totalPayments: 'Paiements',
  paidCount: 'Payés',
  unpaidCount: 'Impayés',
  pendingCount: 'En attente',
  feeStructuresCount: 'Structures',
  studentsCount: 'Élèves',
};

function isPaid(p: Payment): boolean {
  return p.status === 'paid' || p.status === 'completed' || p.status === 'success';
}

function looksLikeMoney(key: string): boolean {
  return /amount|revenue|collected|paid(?!Count)|total(?!Pages|Count|Payments)/i.test(key);
}

function humanize(key: string): string {
  return key
    .replace(/[_.]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

interface StatTile {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'panga-payments-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    NgTemplateOutlet,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    Avatar,
    EmptyState,
    KpiCard,
    PageHeader,
    Paginator,
    DateField,
    SectionHeader,
    SkeletonTable,
  ],
  template: `
    <panga-page-header icon="payments" title="Paiements & frais" [subtitle]="headerSubtitle()">
      <button mat-flat-button class="rounded-xl! payments-cta" (click)="togglePayForm()">
        <mat-icon fontSet="material-symbols-outlined">{{
          showPayForm() ? 'close' : 'add_card'
        }}</mat-icon>
        {{ showPayForm() ? 'Annuler' : 'Enregistrer un paiement' }}
      </button>
    </panga-page-header>

    @if (statTiles().length) {
      <section class="grid gap-4 grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 mb-6">
        @for (t of statTiles(); track t.label) {
          <panga-kpi-card [label]="t.label" [value]="t.value" [icon]="t.icon" />
        }
      </section>
    }

    <!-- Structures de frais -->
    <section class="panga-card p-5 mb-6">
      <panga-section-header
        icon="request_quote"
        title="Structures de frais"
        [count]="fees().length"
      >
        <button mat-stroked-button class="rounded-xl!" (click)="toggleFeeForm()">
          <mat-icon fontSet="material-symbols-outlined">{{
            showFeeForm() ? 'close' : 'add'
          }}</mat-icon>
          {{ showFeeForm() ? 'Annuler' : 'Nouvelle structure' }}
        </button>
      </panga-section-header>

      @if (showFeeForm()) {
        <form
          [formGroup]="feeForm"
          (ngSubmit)="createFee()"
          class="grid gap-4 sm:grid-cols-2 mb-5 pt-1"
        >
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Type</mat-label>
            <mat-select formControlName="feeType">
              <mat-option value="tuition">Scolarité</mat-option>
              <mat-option value="registration">Inscription</mat-option>
              <mat-option value="exam">Examen</mat-option>
              <mat-option value="other">Autre</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Montant</mat-label>
            <input matInput type="number" formControlName="amount" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Devise</mat-label>
            <input matInput formControlName="currency" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fréquence</mat-label>
            <mat-select formControlName="feeFrequency">
              <mat-option value="annual">Annuelle</mat-option>
              <mat-option value="quarterly">Trimestrielle</mat-option>
              <mat-option value="monthly">Mensuelle</mat-option>
              <mat-option value="one_time">Unique</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Classe (optionnel)</mat-label>
            <mat-select formControlName="classId">
              <mat-option [value]="''">Toutes</mat-option>
              @for (c of classes(); track c.id) {
                <mat-option [value]="c.id">{{ classLabel(c) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="sm:col-span-2 flex justify-end">
            <button
              mat-flat-button
              class="rounded-xl! payments-cta"
              type="submit"
              [disabled]="savingFee()"
            >
              {{ savingFee() ? 'Création…' : 'Créer la structure' }}
            </button>
          </div>
        </form>
      }

      @if (fees().length) {
        <div class="grid gap-3 sm:grid-cols-2">
          @for (f of fees(); track f.id) {
            <article class="fee-card rounded-2xl border border-(--border) p-4">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p
                    class="font-semibold text-(--text) truncate"
                    style="font-family: Urbanist, sans-serif"
                  >
                    {{ f.displayName || f.name }}
                  </p>
                  <p class="text-xs text-(--text-muted) mt-0.5">
                    {{ feeTypeLabel(f.feeType) }}
                    @if (f.feeFrequency) {
                      · {{ feeFreqLabel(f.feeFrequency) }}
                    }
                  </p>
                </div>
                <p class="font-semibold text-(--text) whitespace-nowrap tabular-nums">
                  {{ money(f.amount, f.currency) }}
                </p>
              </div>
              <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
                @if (f.feeType) {
                  <span class="chip chip--brand">{{ feeTypeLabel(f.feeType) }}</span>
                }
                @if (f.feeFrequency) {
                  <span class="chip chip--info">{{ feeFreqLabel(f.feeFrequency) }}</span>
                }
                @if (f.isMandatory) {
                  <span class="chip chip--warning">Obligatoire</span>
                }
              </div>
            </article>
          }
        </div>
      } @else {
        <panga-empty-state
          [compact]="true"
          icon="request_quote"
          title="Aucune structure de frais"
          description="Créez une structure (scolarité, inscription…) pour cette année."
          actionLabel="Nouvelle structure"
          (action)="openFeeForm()"
        />
      }
    </section>

    <!-- Paiements -->
    <section>
      @if (showPayForm()) {
        <form [formGroup]="payForm" (ngSubmit)="createPayment()" class="panga-card p-5 mb-4">
          <panga-section-header icon="add_card" title="Enregistrer un paiement" />
          <div class="grid gap-4 sm:grid-cols-2">
            <mat-form-field appearance="outline">
              <mat-label>Élève</mat-label>
              <mat-select formControlName="studentId">
                @for (s of students(); track s.id) {
                  <mat-option [value]="s.id">{{ studentName(s) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Frais</mat-label>
              <mat-select formControlName="feeStructureId">
                @for (f of fees(); track f.id) {
                  <mat-option [value]="f.id">{{ f.displayName || f.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Montant payé</mat-label>
              <input matInput type="number" formControlName="amountPaid" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Devise</mat-label>
              <input matInput formControlName="currency" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Méthode</mat-label>
              <mat-select formControlName="paymentMethod">
                @for (o of methodOptions; track o.value) {
                  <mat-option [value]="o.value">{{ o.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <panga-date-field class="w-full" label="Date" formControlName="paymentDate" />
            <mat-form-field appearance="outline" class="sm:col-span-2">
              <mat-label>Notes (optionnel)</mat-label>
              <input matInput formControlName="notes" />
            </mat-form-field>
          </div>
          <div class="flex justify-end mt-4">
            <button
              mat-flat-button
              class="rounded-xl! payments-cta"
              type="submit"
              [disabled]="savingPay()"
            >
              {{ savingPay() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      }

      <div class="panga-card p-4 mb-4 flex flex-wrap items-center gap-3">
        <mat-form-field
          appearance="outline"
          class="w-full sm:flex-1 sm:min-w-45"
          subscriptSizing="dynamic"
        >
          <mat-label>Rechercher</mat-label>
          <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
          <input matInput [formControl]="searchCtrl" placeholder="Élève, référence…" />
        </mat-form-field>

        <div class="sm:hidden shrink-0">
          <button mat-stroked-button class="rounded-xl!" (click)="openFilters(filtersTpl)">
            <mat-icon fontSet="material-symbols-outlined">filter_list</mat-icon>
            Filtrer
          </button>
        </div>

        <div class="hidden sm:flex sm:flex-1 sm:flex-wrap items-center gap-3">
          <ng-container [ngTemplateOutlet]="filtersTpl" />
        </div>
      </div>

      <ng-template #filtersTpl>
        <mat-form-field
          appearance="outline"
          class="w-full sm:flex-1 sm:min-w-36"
          subscriptSizing="dynamic"
        >
          <mat-label>Méthode</mat-label>
          <mat-select [value]="activeMethod()" (selectionChange)="filterByMethod($event.value)">
            <mat-option value="">Toutes</mat-option>
            @for (o of methodOptions; track o.value) {
              <mat-option [value]="o.value">{{ o.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field
          appearance="outline"
          class="w-full sm:flex-1 sm:min-w-36"
          subscriptSizing="dynamic"
        >
          <mat-label>Statut</mat-label>
          <mat-select [value]="activeStatus()" (selectionChange)="filterByStatus($event.value)">
            <mat-option value="">Tous</mat-option>
            <mat-option value="paid">Payé</mat-option>
            <mat-option value="pending">En attente</mat-option>
            <mat-option value="failed">Échoué</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field
          appearance="outline"
          class="w-full sm:flex-1 sm:min-w-28"
          subscriptSizing="dynamic"
        >
          <mat-label>Par page</mat-label>
          <mat-select [value]="limit()" (selectionChange)="changeLimit($event.value)">
            @for (n of pageSizes; track n) {
              <mat-option [value]="n">{{ n }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </ng-template>

      @if (loading()) {
        <panga-skeleton-table />
      } @else if (loadError()) {
        <div class="panga-card p-6">
          <panga-empty-state
            icon="error"
            title="Impossible de charger les paiements"
            description="Vérifiez votre connexion puis réessayez."
            actionLabel="Réessayer"
            (action)="reload()"
          />
        </div>
      } @else if (payments().length === 0) {
        <div class="panga-card">
          <panga-empty-state
            icon="receipt_long"
            title="Aucun paiement"
            description="Enregistrez un premier paiement ou élargissez les filtres."
            actionLabel="Enregistrer un paiement"
            (action)="openPayForm()"
          />
        </div>
      } @else {
        <div class="grid gap-3 mb-2">
          @for (p of payments(); track p.id) {
            <article class="pay-card panga-card p-4">
              <div class="flex gap-3 items-start">
                <panga-avatar
                  [name]="p.studentName || p.studentId || '?'"
                  [size]="48"
                  class="shrink-0"
                />
                <div class="min-w-0 flex-1">
                  @if (feeName(p)) {
                    <p
                      class="text-[11px] font-semibold uppercase tracking-wide truncate"
                      style="color: var(--brand-deep)"
                    >
                      {{ feeName(p) }}
                    </p>
                  }
                  <h3
                    class="text-sm font-semibold text-(--text) truncate"
                    [class.mt-0.5]="!!feeName(p)"
                    style="font-family: Urbanist, sans-serif"
                  >
                    {{ money(p.amountPaid, p.currency) }}
                  </h3>
                  <div
                    class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-(--text-muted)"
                  >
                    <span class="inline-flex items-center gap-1 min-w-0">
                      <span class="material-symbols-outlined text-[14px] shrink-0">person</span>
                      <span class="truncate">{{ p.studentName || p.studentId || '—' }}</span>
                    </span>
                    @if (p.paymentMethod) {
                      <span class="inline-flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">payments</span>
                        {{ methodLabel(p.paymentMethod) }}
                      </span>
                    }
                    @if (p.paymentDate) {
                      <span class="inline-flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">event</span>
                        {{ p.paymentDate | date: 'dd/MM/yyyy' }}
                      </span>
                    }
                  </div>
                  <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span
                      class="chip"
                      [class.chip--success]="paid(p)"
                      [class.chip--warning]="p.status === 'pending'"
                      [class.chip--danger]="p.status === 'failed'"
                      [class.chip--neutral]="
                        !paid(p) && p.status !== 'pending' && p.status !== 'failed'
                      "
                    >
                      @if (paid(p)) {
                        <span class="chip__dot"></span>
                      }
                      {{ statusLabel(p) }}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          }
        </div>
        @if (pagination()) {
          <div class="panga-card mt-3">
            <panga-paginator [meta]="pagination()" (pageChange)="onPage($event)" />
          </div>
        }
      }
    </section>
  `,
  styles: [
    `
      button.payments-cta {
        background: var(--brand-gradient) !important;
        color: #ffffff !important;
      }
      button.payments-cta .mat-icon,
      button.payments-cta .material-symbols-outlined {
        color: #ffffff !important;
      }
      button.payments-cta:disabled {
        opacity: 0.55;
      }
      .fee-card,
      .pay-card {
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }
      .fee-card:hover,
      .pay-card:hover {
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
      .chip--info {
        color: #5ba3d4;
        background: color-mix(in srgb, #5ba3d4 14%, transparent);
        border-color: color-mix(in srgb, #5ba3d4 28%, transparent);
      }
      .chip--brand {
        color: var(--brand-deep);
        background: color-mix(in srgb, var(--brand-500) 16%, transparent);
        border-color: color-mix(in srgb, var(--brand-500) 30%, transparent);
      }
      .chip--success {
        color: var(--success);
        background: color-mix(in srgb, var(--success) 14%, transparent);
        border-color: color-mix(in srgb, var(--success) 28%, transparent);
      }
      .chip--warning {
        color: var(--warning);
        background: color-mix(in srgb, var(--warning) 14%, transparent);
        border-color: color-mix(in srgb, var(--warning) 28%, transparent);
      }
      .chip--danger {
        color: var(--danger);
        background: color-mix(in srgb, var(--danger) 14%, transparent);
        border-color: color-mix(in srgb, var(--danger) 28%, transparent);
      }
      .chip--neutral {
        color: var(--text-muted);
        background: color-mix(in srgb, var(--text-muted) 12%, transparent);
        border-color: color-mix(in srgb, var(--text-muted) 22%, transparent);
      }
    `,
  ],
})
export class PaymentsList {
  private readonly paymentsApi = inject(PaymentsService);
  private readonly studentsApi = inject(StudentsService);
  private readonly classesApi = inject(ClassesService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);
  private readonly bottomSheet = inject(MatBottomSheet);

  protected readonly classLabel = classLabel;
  protected readonly methodOptions = METHOD_OPTIONS;
  protected readonly paid = isPaid;

  protected readonly fees = signal<FeeStructure[]>([]);
  protected readonly payments = signal<Payment[]>([]);
  protected readonly students = signal<Student[]>([]);
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly stats = signal<Record<string, unknown> | null>(null);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly limit = signal(20);
  protected readonly pageSizes = [10, 20, 50];
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });
  protected readonly search = signal('');
  protected readonly activeMethod = signal('');
  protected readonly activeStatus = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly savingFee = signal(false);
  protected readonly savingPay = signal(false);
  protected readonly showFeeForm = signal(false);
  protected readonly showPayForm = signal(false);

  protected readonly headerSubtitle = computed(() => {
    const year = this.sy.selected();
    return year ? `Scolarité et encaissements · Année ${year}` : 'Scolarité et encaissements';
  });

  protected readonly statTiles = computed<StatTile[]>(() => {
    const data = this.stats();
    if (!data || typeof data !== 'object') {
      return [];
    }
    const tiles: StatTile[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined || typeof value === 'object') {
        continue;
      }
      const num = Number(value);
      const moneyKey = looksLikeMoney(key);
      tiles.push({
        label: STAT_LABELS[key] ?? humanize(key),
        value:
          Number.isFinite(num) && typeof value !== 'boolean'
            ? moneyKey
              ? fmtMoney(num, SCHOOL_CURRENCY)
              : fmtNumber(num)
            : String(value),
        icon: moneyKey
          ? 'payments'
          : /count|totalPayments|paidCount|unpaid/i.test(key)
            ? 'receipt_long'
            : 'query_stats',
      });
      if (tiles.length >= 4) {
        break;
      }
    }
    return tiles;
  });

  protected readonly feeForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    feeType: ['tuition', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    currency: [SCHOOL_CURRENCY, Validators.required],
    feeFrequency: ['quarterly'],
    classId: [''],
  });

  protected readonly payForm = this.fb.nonNullable.group({
    studentId: ['', Validators.required],
    feeStructureId: ['', Validators.required],
    amountPaid: [0, [Validators.required, Validators.min(0)]],
    currency: [SCHOOL_CURRENCY, Validators.required],
    paymentMethod: ['cash', Validators.required],
    paymentDate: ['', Validators.required],
    notes: [''],
  });

  constructor() {
    this.searchCtrl.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe((v) => {
      this.search.set(v.trim());
      this.page.set(1);
      this.loadPayments();
    });

    effect(() => {
      this.sy.selected();
      untracked(() => {
        this.page.set(1);
        this.loadPayments();
        this.loadFees();
        this.loadStats();
        this.studentsApi.list({ page: 1, limit: 200, schoolYear: this.sy.filter() }).subscribe({
          next: (r) => this.students.set(r.items),
        });
        this.classesApi
          .list(this.sy.filter())
          .subscribe({ next: (r) => this.classes.set(r.items) });
      });
    });
  }

  protected money(amount: number | null | undefined, currency?: string): string {
    return fmtMoney(amount, currency || SCHOOL_CURRENCY);
  }
  protected studentName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id;
  }
  protected feeTypeLabel(v: string | undefined): string {
    return (v && FEE_TYPE_LABELS[v]) || v || '—';
  }
  protected feeFreqLabel(v: string | undefined): string {
    return (v && FEE_FREQ_LABELS[v]) || v || '—';
  }
  protected methodLabel(v: string | undefined): string {
    return (v && METHOD_LABELS[v]) || v || '—';
  }
  protected statusLabel(p: Payment): string {
    if (isPaid(p)) {
      return 'Payé';
    }
    if (p.status === 'pending') {
      return 'En attente';
    }
    if (p.status === 'failed') {
      return 'Échoué';
    }
    return p.status ? humanize(p.status) : 'Enregistré';
  }
  protected feeName(p: Payment): string {
    const id = p.feeStructureId;
    if (!id) {
      return '';
    }
    const fee = this.fees().find((f) => f.id === id);
    return fee?.displayName || fee?.name || '';
  }

  openFilters(template: TemplateRef<unknown>): void {
    this.bottomSheet.open(FilterSheetContent, { data: { title: 'Filtrer', template } });
  }

  filterByMethod(method: string): void {
    this.activeMethod.set(method);
    this.page.set(1);
    this.loadPayments();
  }

  filterByStatus(status: string): void {
    this.activeStatus.set(status);
    this.page.set(1);
    this.loadPayments();
  }

  changeLimit(limit: number): void {
    this.limit.set(Number(limit) || 20);
    this.page.set(1);
    this.loadPayments();
  }

  protected togglePayForm(): void {
    this.showPayForm.set(!this.showPayForm());
  }
  protected openPayForm(): void {
    this.showPayForm.set(true);
  }
  protected toggleFeeForm(): void {
    this.showFeeForm.set(!this.showFeeForm());
  }
  protected openFeeForm(): void {
    this.showFeeForm.set(true);
  }

  protected reload(): void {
    this.loadPayments();
    this.loadFees();
    this.loadStats();
  }

  private loadStats(): void {
    this.paymentsApi.statsOverview(this.sy.filter()).subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.stats.set(null),
    });
  }

  private loadFees(): void {
    this.paymentsApi.feeStructures(this.sy.filter()).subscribe({
      next: (r) => this.fees.set(r.items),
      error: () => this.fees.set([]),
    });
  }

  private loadPayments(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.paymentsApi
      .payments({
        page: this.page(),
        limit: this.limit(),
        search: this.search() || undefined,
        paymentMethod: this.activeMethod() || undefined,
        status: this.activeStatus() || undefined,
        schoolYear: this.sy.filter(),
      })
      .subscribe({
        next: (res) => {
          this.payments.set(res.items);
          this.pagination.set(res.pagination ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  onPage(page: number): void {
    this.page.set(page);
    this.loadPayments();
  }

  createFee(): void {
    if (this.feeForm.invalid || this.savingFee()) {
      this.feeForm.markAllAsTouched();
      return;
    }
    this.savingFee.set(true);
    const v = this.feeForm.getRawValue();
    this.paymentsApi
      .createFeeStructure({
        name: v.name,
        displayName: v.name,
        feeType: v.feeType,
        amount: v.amount,
        currency: v.currency,
        schoolYear: this.sy.selected(),
        classId: v.classId || undefined,
        feeFrequency: v.feeFrequency,
        isMandatory: true,
        status: 'active',
      })
      .subscribe({
        next: () => {
          this.savingFee.set(false);
          this.notify.success('Structure de frais créée.');
          this.feeForm.reset({
            feeType: 'tuition',
            currency: SCHOOL_CURRENCY,
            feeFrequency: 'quarterly',
            amount: 0,
            classId: '',
          });
          this.showFeeForm.set(false);
          this.loadFees();
          this.loadStats();
        },
        error: () => this.savingFee.set(false),
      });
  }

  createPayment(): void {
    if (this.payForm.invalid || this.savingPay()) {
      this.payForm.markAllAsTouched();
      return;
    }
    this.savingPay.set(true);
    const raw = this.payForm.getRawValue();
    const payload = {
      studentId: raw.studentId,
      feeStructureId: raw.feeStructureId,
      amountPaid: raw.amountPaid,
      currency: raw.currency,
      paymentDate: raw.paymentDate,
      paymentMethod: raw.paymentMethod,
      ...(raw.notes.trim() ? { notes: raw.notes.trim() } : {}),
    };
    this.paymentsApi.createPayment(payload).subscribe({
      next: () => {
        this.savingPay.set(false);
        this.notify.success('Paiement enregistré.');
        this.payForm.reset({
          currency: SCHOOL_CURRENCY,
          paymentMethod: 'cash',
          amountPaid: 0,
          notes: '',
        });
        this.showPayForm.set(false);
        this.loadPayments();
        this.loadStats();
      },
      error: () => this.savingPay.set(false),
    });
  }
}
