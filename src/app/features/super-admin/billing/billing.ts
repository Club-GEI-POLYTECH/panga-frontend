import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { BillingService } from '../services/billing.service';
import type { SaasInvoice, StatBlock } from '../models/platform.models';
import type { PaginationMeta } from '../../../core/models/api.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KeyValue } from '../../../shared/ui/key-value';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

function isPaid(inv: SaasInvoice): boolean {
  return inv.status === 'paid' || inv.status === 'payée' || !!inv.paidAt;
}

/** Facturation SaaS : abonnement, factures, création, encaissement. */
@Component({
  selector: 'panga-billing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    Avatar,
    EmptyState,
    KeyValue,
    KpiCard,
    PageHeader,
    Paginator,
    SectionHeader,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <panga-page-header
      icon="receipt_long"
      title="Facturation SaaS"
      subtitle="Abonnements et factures plateforme"
    />

    <section class="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
      <panga-kpi-card label="Factures" [value]="invoices().length" icon="receipt_long" />
      <panga-kpi-card label="Payées" [value]="paidCount()" icon="task_alt" />
      <panga-kpi-card label="En attente" [value]="pendingCount()" icon="hourglass_top" />
      <panga-kpi-card label="Encaissé (USD)" [value]="paidRevenue()" icon="payments" />
    </section>

    <div class="grid gap-4 lg:grid-cols-2 mb-6">
      <section class="panga-card p-5">
        <panga-section-header icon="workspace_premium" title="Abonnement d'une école" />
        <form [formGroup]="subForm" (ngSubmit)="loadSubscription()" class="flex items-start gap-3">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>School ID</mat-label>
            <input matInput formControlName="schoolId" />
          </mat-form-field>
          <button mat-flat-button class="rounded-xl! mt-1!" type="submit">Consulter</button>
        </form>
        @if (subscription()) {
          <div class="mt-2"><panga-key-value [data]="subscription()" /></div>
        }
      </section>

      <section class="panga-card p-5">
        <panga-section-header icon="add_card" title="Nouvelle facture" />
        <form [formGroup]="form" (ngSubmit)="create()" class="grid gap-3 sm:grid-cols-2">
          <mat-form-field appearance="outline">
            <mat-label>School ID</mat-label>
            <input matInput formControlName="schoolId" />
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
            <mat-label>Plan</mat-label>
            <input matInput formControlName="subscriptionPlanOffered" placeholder="premium" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="sm:col-span-2">
            <mat-label>Notes</mat-label>
            <input matInput formControlName="notes" />
          </mat-form-field>
          <div class="sm:col-span-2 flex justify-end">
            <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="submitting()">
              Créer la facture
            </button>
          </div>
        </form>
      </section>
    </div>

    <panga-section-header icon="receipt_long" title="Factures SaaS" [count]="invoices().length" />
    @if (loading()) {
      <panga-skeleton-table />
    } @else if (invoices().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="receipt_long"
          title="Aucune facture"
          description="Créez une première facture SaaS."
        />
      </div>
    } @else {
      <div class="panga-card divide-y divide-(--border)">
        @for (inv of invoices(); track inv.id) {
          <div class="flex items-center gap-4 px-4 sm:px-5 py-3.5">
            <panga-avatar [name]="inv.schoolId || 'SA'" [size]="40" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-(--text)">
                {{ inv.amount ?? '—' }}
                <span class="text-sm text-(--text-muted)">{{ inv.currency }}</span>
              </p>
              <p class="text-xs text-(--text-muted) truncate">
                {{ inv.subscriptionPlanOffered || '—' }}
                @if (inv.schoolId) {
                  · {{ inv.schoolId }}
                }
              </p>
            </div>
            <panga-status-badge
              [label]="paid(inv) ? 'Payée' : inv.status || 'En attente'"
              [tone]="statusTone(inv)"
            />
            @if (!paid(inv)) {
              <button mat-stroked-button class="rounded-xl!" (click)="markPaid(inv)">
                Marquer payée
              </button>
            }
          </div>
        }
        @if (pagination()) {
          <panga-paginator [meta]="pagination()" (pageChange)="onPage($event)" />
        }
      </div>
    }
  `,
})
export class Billing {
  private readonly billing = inject(BillingService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly invoices = signal<SaasInvoice[]>([]);
  protected readonly subscription = signal<StatBlock | null>(null);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);

  protected readonly paid = isPaid;
  protected readonly paidCount = computed(() => this.invoices().filter(isPaid).length);
  protected readonly pendingCount = computed(
    () => this.invoices().filter((i) => !isPaid(i)).length,
  );
  protected readonly paidRevenue = computed(() =>
    this.invoices()
      .filter(isPaid)
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
      .toFixed(2),
  );

  protected readonly subForm = this.fb.nonNullable.group({ schoolId: ['', Validators.required] });

  protected readonly form = this.fb.nonNullable.group({
    schoolId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    currency: ['USD', Validators.required],
    subscriptionPlanOffered: ['premium', Validators.required],
    notes: [''],
  });

  constructor() {
    this.load();
  }

  protected statusTone(inv: SaasInvoice): BadgeTone {
    return isPaid(inv) ? 'success' : 'warning';
  }

  private load(): void {
    this.loading.set(true);
    this.billing.listInvoices({ page: this.page(), limit: 10 }).subscribe({
      next: (res) => {
        this.invoices.set(res.items);
        this.pagination.set(res.pagination ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  loadSubscription(): void {
    if (this.subForm.invalid) {
      this.subForm.markAllAsTouched();
      return;
    }
    this.billing.schoolSubscription(this.subForm.getRawValue().schoolId).subscribe({
      next: (s) => this.subscription.set(s),
    });
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.billing.createInvoice(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Facture créée.');
        this.form.reset({ currency: 'USD', subscriptionPlanOffered: 'premium', amount: 0 });
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }

  markPaid(invoice: SaasInvoice): void {
    this.billing.markPaid(invoice.id, `manual-${invoice.id}`).subscribe({
      next: () => {
        this.notify.success('Facture marquée payée.');
        this.load();
      },
    });
  }
}
