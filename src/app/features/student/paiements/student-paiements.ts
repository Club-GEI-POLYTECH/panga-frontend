import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyState,
    KpiCard,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header icon="payments" title="Mes paiements" subtitle="Frais, échéances & reçus" />

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
          <div class="divide-y divide-[var(--border)] -mx-5">
            @for (it of installments(); track $index) {
              <div class="flex items-center gap-4 px-5 py-3">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-[var(--text)] truncate">
                    {{ label(it) }}
                  </p>
                  <p class="text-xs text-[var(--text-muted)]">
                    @if (it['dueDate']) {
                      Échéance : {{ asDate(it['dueDate']) | date: 'dd/MM/yyyy' }}
                    }
                  </p>
                </div>
                <span class="text-sm font-semibold text-[var(--text)]">{{
                  money(amount(it), it)
                }}</span>
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
          <div class="divide-y divide-[var(--border)] -mx-5">
            @for (p of payments(); track $index) {
              <div class="flex items-center gap-4 px-5 py-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style="background: var(--brand-gradient)"
                >
                  <span class="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-[var(--text)] truncate">{{ label(p) }}</p>
                  <p class="text-xs text-[var(--text-muted)]">
                    @if (p['paymentDate']) {
                      {{ asDate(p['paymentDate']) | date: 'dd/MM/yyyy' }}
                    }
                    @if (p['paymentMethod']) {
                      · {{ p['paymentMethod'] }}
                    }
                  </p>
                </div>
                <span class="text-sm font-semibold text-[var(--text)]">{{
                  money(amount(p), p)
                }}</span>
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
                class="rounded-2xl border border-[var(--border)] p-4 flex items-center justify-between gap-3"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium text-[var(--text)] truncate">{{ label(f) }}</p>
                  @if (f['feeType']) {
                    <p class="text-xs text-[var(--text-muted)]">{{ f['feeType'] }}</p>
                  }
                </div>
                <span class="text-sm font-semibold text-[var(--text)] shrink-0">{{
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
