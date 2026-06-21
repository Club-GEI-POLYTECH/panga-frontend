import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { StudentService, extractContext } from '../services/student.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';

type Row = Record<string, unknown>;

const STATUS_TONE: Record<string, BadgeTone> = {
  paid: 'success',
  completed: 'success',
  success: 'success',
  pending: 'warning',
  partial: 'warning',
  overdue: 'danger',
  failed: 'danger',
  cancelled: 'neutral',
};

@Component({
  selector: 'panga-student-paiements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    EmptyState,
    KpiCard,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header icon="payments" title="Mes paiements" subtitle="Frais, échéances & reçus">
      <button mat-flat-button class="rounded-xl!" (click)="showPay.set(!showPay())">
        <mat-icon fontSet="material-symbols-outlined">{{
          showPay() ? 'close' : 'smartphone'
        }}</mat-icon>
        {{ showPay() ? 'Annuler' : 'Payer (Mobile Money)' }}
      </button>
    </panga-page-header>

    @if (showPay()) {
      <section class="panga-card p-5 mb-6">
        <panga-section-header icon="smartphone" title="Paiement Mobile Money" />
        <form
          [formGroup]="payForm"
          (ngSubmit)="pay()"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <mat-form-field appearance="outline">
            <mat-label>Opérateur</mat-label>
            <mat-select formControlName="provider">
              @for (p of providers; track p.value) {
                <mat-option [value]="p.value">{{ p.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Numéro de téléphone</mat-label>
            <input matInput formControlName="phoneNumber" placeholder="09xxxxxxxx" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Montant</mat-label>
            <input matInput type="number" formControlName="amount" min="1" />
          </mat-form-field>
          <div class="flex items-end">
            <button
              mat-flat-button
              class="rounded-xl!"
              type="submit"
              [disabled]="payForm.invalid || paying()"
            >
              <mat-icon fontSet="material-symbols-outlined">send</mat-icon> Payer
            </button>
          </div>
        </form>

        @if (tx(); as t) {
          <div class="mt-4 rounded-2xl border border-(--border) p-4 flex items-center gap-3">
            <mat-icon fontSet="material-symbols-outlined" [style.color]="txColor()">{{
              txIcon()
            }}</mat-icon>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-(--text)">Transaction {{ txStatusLabel() }}</p>
              <p class="text-xs text-(--text-muted) truncate">
                Réf : {{ t['transactionId'] || t['id'] || '—' }}
              </p>
            </div>
            <button
              mat-stroked-button
              class="rounded-xl!"
              [disabled]="polling()"
              (click)="refreshStatus()"
            >
              <mat-icon fontSet="material-symbols-outlined">refresh</mat-icon> Actualiser
            </button>
          </div>
        }
      </section>
    }

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <section class="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-6">
        <panga-kpi-card label="Total payé" [value]="totalPaid()" icon="payments" />
        <panga-kpi-card label="Reçus" [value]="receipts().length" icon="receipt_long" />
        <panga-kpi-card label="Échéances dues" [value]="dueCount()" icon="event_upcoming" />
      </section>

      <!-- Échéances -->
      @if (installments().length) {
        <section class="panga-card p-5 mb-6">
          <panga-section-header
            icon="event_upcoming"
            title="Échéances"
            [count]="installments().length"
          />
          <div class="divide-y divide-(--border) -mx-5">
            @for (it of installments(); track $index) {
              <div class="flex items-center gap-4 px-5 py-3">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-(--text) truncate">
                    {{ label(it) }}
                  </p>
                  <p class="text-xs text-(--text-muted)">
                    @if (it['dueDate']) {
                      Échéance : {{ asDate(it['dueDate']) | date: 'dd/MM/yyyy' }}
                    }
                  </p>
                </div>
                <span class="text-sm font-semibold text-(--text)">{{ money(amount(it), it) }}</span>
                <panga-status-badge [label]="statusLabel(it)" [tone]="tone(it)" [dot]="false" />
              </div>
            }
          </div>
        </section>
      }

      <!-- Paiements -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header
          icon="receipt_long"
          title="Historique des paiements"
          [count]="payments().length"
        />
        @if (payments().length === 0) {
          <panga-empty-state
            icon="payments"
            title="Aucun paiement"
            description="Aucun paiement enregistré."
          />
        } @else {
          <div class="divide-y divide-(--border) -mx-5">
            @for (p of payments(); track $index) {
              <div class="flex items-center gap-4 px-5 py-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style="background: var(--brand-gradient)"
                >
                  <span class="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-(--text) truncate">{{ label(p) }}</p>
                  <p class="text-xs text-(--text-muted)">
                    @if (p['paymentDate']) {
                      {{ asDate(p['paymentDate']) | date: 'dd/MM/yyyy' }}
                    }
                    @if (p['paymentMethod']) {
                      · {{ p['paymentMethod'] }}
                    }
                  </p>
                </div>
                <span class="text-sm font-semibold text-(--text)">{{ money(amount(p), p) }}</span>
                <panga-status-badge [label]="statusLabel(p)" [tone]="tone(p)" [dot]="false" />
                @if (p['id']) {
                  <button mat-icon-button (click)="receipt(p)" aria-label="Reçu PDF">
                    <mat-icon fontSet="material-symbols-outlined">picture_as_pdf</mat-icon>
                  </button>
                }
              </div>
            }
          </div>
        }
      </section>

      <!-- Structures de frais -->
      @if (fees().length) {
        <section class="panga-card p-5">
          <panga-section-header
            icon="request_quote"
            title="Frais de scolarité"
            [count]="fees().length"
          />
          <div class="grid gap-3 sm:grid-cols-2">
            @for (f of fees(); track $index) {
              <div
                class="rounded-2xl border border-(--border) p-4 flex items-center justify-between gap-3"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium text-(--text) truncate">{{ label(f) }}</p>
                  @if (f['feeType']) {
                    <p class="text-xs text-(--text-muted)">{{ f['feeType'] }}</p>
                  }
                </div>
                <span class="text-sm font-semibold text-(--text) shrink-0">{{
                  money(amount(f), f)
                }}</span>
              </div>
            }
          </div>
        </section>
      }
    }
  `,
})
export class StudentPaiements {
  private readonly api = inject(StudentService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly payments = signal<Row[]>([]);
  protected readonly receipts = signal<Row[]>([]);
  protected readonly installments = signal<Row[]>([]);
  protected readonly fees = signal<Row[]>([]);
  private studentId = '';

  /* ----------------------------- Mobile Money ------------------------------ */
  protected readonly providers = [
    { value: 'orange', label: 'Orange Money' },
    { value: 'airtel', label: 'Airtel Money' },
    { value: 'mpesa', label: 'M-Pesa (Vodacom)' },
    { value: 'africell', label: 'Afrimoney' },
  ];
  protected readonly showPay = signal(false);
  protected readonly paying = signal(false);
  protected readonly polling = signal(false);
  protected readonly tx = signal<Row | null>(null);
  protected readonly payForm = new FormGroup({
    provider: new FormControl('orange', { nonNullable: true, validators: [Validators.required] }),
    phoneNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
  });

  protected readonly totalPaid = computed(() => {
    const sum = this.payments().reduce((s, p) => s + this.amount(p), 0);
    return sum ? sum.toLocaleString('fr-FR') : '0';
  });
  protected readonly dueCount = computed(
    () => this.installments().filter((i) => this.statusOf(i) !== 'paid').length,
  );

  constructor() {
    this.api.me().subscribe({
      next: (me) => {
        const ctx = extractContext(me);
        this.studentId = ctx.studentId;
        forkJoin({
          payments: this.api.myPayments().pipe(catchError(() => of([]))),
          receipts: this.api.myReceipts().pipe(catchError(() => of([]))),
          installments: ctx.studentId
            ? this.api.installments(ctx.studentId).pipe(catchError(() => of([])))
            : of([]),
          fees: this.api.feeStructures().pipe(catchError(() => of([]))),
        }).subscribe((r) => {
          this.payments.set(r.payments);
          this.receipts.set(r.receipts);
          this.installments.set(r.installments);
          this.fees.set(r.fees);
          this.loading.set(false);
        });
      },
      error: () => this.loading.set(false),
    });
  }

  /* ----------------------------- Mobile Money ------------------------------ */

  pay(): void {
    if (this.payForm.invalid || this.paying()) {
      return;
    }
    const v = this.payForm.getRawValue();
    this.paying.set(true);
    this.api
      .initiateGatewayPayment({
        provider: v.provider,
        phoneNumber: v.phoneNumber,
        amount: Number(v.amount),
        ...(this.studentId ? { studentId: this.studentId } : {}),
      })
      .subscribe({
        next: (t) => {
          this.paying.set(false);
          this.tx.set(t);
          this.notify.success('Paiement initié. Validez sur votre téléphone.');
        },
        error: () => this.paying.set(false),
      });
  }

  refreshStatus(): void {
    const t = this.tx();
    const id = String(t?.['transactionId'] ?? t?.['id'] ?? '');
    if (!id || this.polling()) {
      return;
    }
    this.polling.set(true);
    this.api.gatewayStatus(id).subscribe({
      next: (s) => {
        this.polling.set(false);
        this.tx.set({ ...t, ...s });
        if (this.statusOf(s) === 'success' || this.statusOf(s) === 'completed') {
          this.notify.success('Paiement confirmé.');
        }
      },
      error: () => this.polling.set(false),
    });
  }

  protected txStatusLabel(): string {
    return this.statusLabel(this.tx() ?? {});
  }
  protected txColor(): string {
    const tone = this.tone(this.tx() ?? {});
    return tone === 'success'
      ? 'var(--success)'
      : tone === 'danger'
        ? 'var(--danger)'
        : 'var(--warning)';
  }
  protected txIcon(): string {
    const s = this.statusOf(this.tx() ?? {});
    if (s === 'success' || s === 'completed') return 'check_circle';
    if (s === 'failed' || s === 'cancelled') return 'error';
    return 'hourglass_top';
  }

  receipt(p: Row): void {
    this.api.receiptPdf(String(p['id'])).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: () => this.notify.error('Reçu indisponible.'),
    });
  }

  /* -------------------------------- Helpers --------------------------------- */

  protected amount(r: Row): number {
    const v = r['amountPaid'] ?? r['amount'] ?? r['amountDue'] ?? r['totalAmount'];
    const n = typeof v === 'string' ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? n : 0;
  }
  protected money(value: number, r: Row): string {
    const currency = (r['currency'] as string) || 'FCFA';
    return `${value.toLocaleString('fr-FR')} ${currency}`;
  }
  protected label(r: Row): string {
    const fee = (r['feeStructure'] ?? {}) as Record<string, unknown>;
    const v =
      r['displayName'] ??
      r['name'] ??
      fee['displayName'] ??
      fee['name'] ??
      r['label'] ??
      r['description'];
    if (v) {
      return String(v);
    }
    if (r['installmentNumber']) {
      return `Tranche ${r['installmentNumber']}`;
    }
    return 'Paiement';
  }
  protected statusOf(r: Row): string {
    return String(r['status'] ?? '').toLowerCase();
  }
  protected statusLabel(r: Row): string {
    const s = this.statusOf(r);
    const map: Record<string, string> = {
      paid: 'Payé',
      completed: 'Payé',
      success: 'Payé',
      pending: 'En attente',
      partial: 'Partiel',
      overdue: 'En retard',
      failed: 'Échoué',
      cancelled: 'Annulé',
    };
    return map[s] ?? (s ? s : '—');
  }
  protected tone(r: Row): BadgeTone {
    return STATUS_TONE[this.statusOf(r)] ?? 'neutral';
  }
  protected asDate(v: unknown): string | null {
    return v ? String(v) : null;
  }
}
