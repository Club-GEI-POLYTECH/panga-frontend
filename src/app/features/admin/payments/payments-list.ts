import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PaymentsService } from '../services/payments.service';
import { StudentsService } from '../services/students.service';
import { ClassesService } from '../services/classes.service';
import type { ClassInstance, FeeStructure, Payment, Student } from '../models/admin.models';
import type { PaginationMeta } from '../../../core/models/api.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

const SCHOOL_YEAR = '2024-2025';

interface StatTile {
  label: string;
  value: string;
}

function humanize(key: string): string {
  return key
    .replace(/[_.]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function isPaid(p: Payment): boolean {
  return p.status === 'paid' || p.status === 'completed' || p.status === 'success';
}

@Component({
  selector: 'panga-payments-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    Avatar,
    EmptyState,
    PageHeader,
    Paginator,
    SectionHeader,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <panga-page-header
      icon="payments"
      title="Paiements & frais"
      subtitle="Scolarité et encaissements"
    />

    @if (statTiles().length) {
      <div class="panga-card p-5 mb-6">
        <panga-section-header icon="query_stats" title="Vue d'ensemble" />
        <div class="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
          @for (t of statTiles(); track t.label) {
            <div class="rounded-2xl border border-[var(--border)] p-3.5">
              <p class="text-xs text-[var(--text-muted)] truncate" [title]="t.label">
                {{ t.label }}
              </p>
              <p class="text-xl font-semibold text-[var(--text)] mt-0.5">{{ t.value }}</p>
            </div>
          }
        </div>
      </div>
    }

    <!-- Structures de frais -->
    <section class="panga-card p-5 mb-6">
      <panga-section-header
        icon="request_quote"
        title="Structures de frais"
        [count]="fees().length"
      >
        <button mat-stroked-button class="!rounded-xl" (click)="showFeeForm.set(!showFeeForm())">
          {{ showFeeForm() ? 'Annuler' : 'Nouvelle structure' }}
        </button>
      </panga-section-header>

      @if (showFeeForm()) {
        <form [formGroup]="feeForm" (ngSubmit)="createFee()" class="grid gap-4 sm:grid-cols-2 mb-5">
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
                <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="sm:col-span-2 flex justify-end">
            <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="savingFee()">
              Créer la structure
            </button>
          </div>
        </form>
      }

      @if (fees().length) {
        <div class="grid gap-3 sm:grid-cols-2">
          @for (f of fees(); track f.id) {
            <div class="rounded-2xl border border-[var(--border)] p-4">
              <div class="flex items-start justify-between gap-2">
                <p class="font-medium text-[var(--text)] truncate">{{ f.displayName || f.name }}</p>
                <p class="font-semibold text-[var(--text)] whitespace-nowrap">
                  {{ (f.amount ?? 0).toLocaleString('fr-FR') }} {{ f.currency }}
                </p>
              </div>
              <div class="mt-2 flex flex-wrap gap-1.5">
                @if (f.feeType) {
                  <panga-status-badge [label]="f.feeType" tone="brand" [dot]="false" />
                }
                @if (f.feeFrequency) {
                  <panga-status-badge [label]="f.feeFrequency" tone="info" [dot]="false" />
                }
                @if (f.isMandatory) {
                  <panga-status-badge label="Obligatoire" tone="warning" [dot]="false" />
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <p class="text-sm text-[var(--text-muted)]">Aucune structure de frais.</p>
      }
    </section>

    <!-- Paiements -->
    <section class="panga-card p-5">
      <panga-section-header icon="receipt_long" title="Paiements">
        <button mat-stroked-button class="!rounded-xl" (click)="showPayForm.set(!showPayForm())">
          {{ showPayForm() ? 'Annuler' : 'Enregistrer un paiement' }}
        </button>
      </panga-section-header>

      @if (showPayForm()) {
        <form
          [formGroup]="payForm"
          (ngSubmit)="createPayment()"
          class="grid gap-4 sm:grid-cols-2 mb-5"
        >
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
              <mat-option value="cash">Espèces</mat-option>
              <mat-option value="mobile_money">Mobile money</mat-option>
              <mat-option value="bank_transfer">Virement</mat-option>
              <mat-option value="card">Carte</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Date</mat-label>
            <input matInput type="date" formControlName="paymentDate" />
          </mat-form-field>
          <div class="sm:col-span-2 flex justify-end">
            <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="savingPay()">
              Enregistrer
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <panga-skeleton-table />
      } @else if (payments().length === 0) {
        <panga-empty-state
          icon="receipt_long"
          title="Aucun paiement"
          description="Enregistrez un premier paiement."
        />
      } @else {
        <div class="divide-y divide-[var(--border)] -mx-5">
          @for (p of payments(); track p.id) {
            <div class="flex items-center gap-4 px-5 py-3">
              <panga-avatar [name]="p.studentName || p.studentId || '?'" [size]="38" />
              <div class="min-w-0 flex-1">
                <p class="font-medium text-[var(--text)]">
                  {{ (p.amountPaid ?? 0).toLocaleString('fr-FR') }}
                  <span class="text-sm text-[var(--text-muted)]">{{ p.currency }}</span>
                </p>
                <p class="text-xs text-[var(--text-muted)] truncate">
                  {{ p.studentName || p.studentId || '—' }}
                  @if (p.paymentMethod) {
                    · {{ p.paymentMethod }}
                  }
                  @if (p.paymentDate) {
                    · {{ p.paymentDate | date: 'dd/MM/yyyy' }}
                  }
                </p>
              </div>
              <panga-status-badge
                [label]="paid(p) ? 'Payé' : p.status || 'Enregistré'"
                [tone]="statusTone(p)"
              />
            </div>
          }
          @if (pagination()) {
            <panga-paginator [meta]="pagination()" (pageChange)="onPage($event)" />
          }
        </div>
      }
    </section>
  `,
})
export class PaymentsList {
  private readonly paymentsApi = inject(PaymentsService);
  private readonly studentsApi = inject(StudentsService);
  private readonly classesApi = inject(ClassesService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly fees = signal<FeeStructure[]>([]);
  protected readonly payments = signal<Payment[]>([]);
  protected readonly students = signal<Student[]>([]);
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly stats = signal<Record<string, unknown> | null>(null);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly savingFee = signal(false);
  protected readonly savingPay = signal(false);
  protected readonly showFeeForm = signal(false);
  protected readonly showPayForm = signal(false);

  protected readonly paid = isPaid;
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
      tiles.push({
        label: humanize(key),
        value:
          Number.isFinite(num) && typeof value !== 'boolean'
            ? num.toLocaleString('fr-FR')
            : String(value),
      });
    }
    return tiles;
  });

  protected readonly feeForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    feeType: ['tuition', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    currency: ['CDF', Validators.required],
    feeFrequency: ['quarterly'],
    classId: [''],
  });

  protected readonly payForm = this.fb.nonNullable.group({
    studentId: ['', Validators.required],
    feeStructureId: ['', Validators.required],
    amountPaid: [0, [Validators.required, Validators.min(0)]],
    currency: ['CDF', Validators.required],
    paymentMethod: ['cash', Validators.required],
    paymentDate: ['', Validators.required],
  });

  constructor() {
    this.loadPayments();
    this.loadFees();
    this.paymentsApi.statsOverview(SCHOOL_YEAR).subscribe({ next: (s) => this.stats.set(s) });
    this.studentsApi.list({ page: 1, limit: 100, schoolYear: SCHOOL_YEAR }).subscribe({
      next: (r) => this.students.set(r.items),
    });
    this.classesApi.list(SCHOOL_YEAR).subscribe({ next: (r) => this.classes.set(r.items) });
  }

  protected studentName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id;
  }
  protected statusTone(p: Payment): BadgeTone {
    return isPaid(p) ? 'success' : 'info';
  }

  private loadFees(): void {
    this.paymentsApi.feeStructures(SCHOOL_YEAR).subscribe({ next: (r) => this.fees.set(r.items) });
  }

  private loadPayments(): void {
    this.loading.set(true);
    this.paymentsApi.payments({ page: this.page(), limit: 10 }).subscribe({
      next: (res) => {
        this.payments.set(res.items);
        this.pagination.set(res.pagination ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
        schoolYear: SCHOOL_YEAR,
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
            currency: 'CDF',
            feeFrequency: 'quarterly',
            amount: 0,
          });
          this.showFeeForm.set(false);
          this.loadFees();
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
    this.paymentsApi.createPayment(this.payForm.getRawValue()).subscribe({
      next: () => {
        this.savingPay.set(false);
        this.notify.success('Paiement enregistré.');
        this.payForm.reset({ currency: 'CDF', paymentMethod: 'cash', amountPaid: 0 });
        this.showPayForm.set(false);
        this.loadPayments();
        this.paymentsApi.statsOverview(SCHOOL_YEAR).subscribe({ next: (s) => this.stats.set(s) });
      },
      error: () => this.savingPay.set(false),
    });
  }
}
