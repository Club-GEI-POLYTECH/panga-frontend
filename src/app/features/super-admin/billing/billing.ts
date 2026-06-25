import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BillingService } from '../services/billing.service';
import { SchoolsService } from '../services/schools.service';
import type {
  PlanPricing,
  PlatformSchool,
  SaasInvoice,
  StatBlock,
} from '../models/platform.models';
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
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
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
            <mat-label>École</mat-label>
            <mat-select formControlName="schoolId">
              @for (s of schools(); track s.id) {
                <mat-option [value]="s.id">{{ schoolLabel(s) }}</mat-option>
              }
            </mat-select>
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
          <mat-form-field appearance="outline" class="sm:col-span-2">
            <mat-label>École</mat-label>
            <mat-select formControlName="schoolId" (selectionChange)="onSchoolChange($event.value)">
              @for (s of schools(); track s.id) {
                <mat-option [value]="s.id">{{ schoolLabel(s) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Plan</mat-label>
            <mat-select formControlName="subscriptionPlanOffered">
              @for (p of pricingRows(); track p.plan) {
                <mat-option [value]="p.plan"
                  ><span class="capitalize">{{ p.plan }}</span></mat-option
                >
              }
            </mat-select>
          </mat-form-field>
          <div class="flex flex-col justify-center rounded-xl border border-(--border) px-3">
            <span class="text-xs text-(--text-muted)">Effectif (élèves)</span>
            <span class="text-lg font-semibold text-(--text) tabular-nums">
              {{ form.controls.schoolId.value ? studentsSig() : '—' }}
            </span>
          </div>
          <mat-form-field appearance="outline" class="sm:col-span-2">
            <mat-label>Notes</mat-label>
            <input matInput formControlName="notes" />
          </mat-form-field>

          <!-- Montant calculé (base + part/élève) -->
          <div
            class="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
            style="background: color-mix(in srgb, var(--brand-500) 8%, transparent)"
          >
            <div>
              <p class="text-xs text-(--text-muted)">
                Montant calculé pour {{ studentsSig() }} élèves
              </p>
              <p class="text-2xl font-bold text-(--text) tabular-nums">
                {{ computedAmount() | number: '1.0-2' }} {{ currency()
                }}<span class="text-sm font-normal text-(--text-muted)">/mois</span>
              </p>
              @if (planRow(); as p) {
                <p class="text-[11px] text-(--text-muted) mt-0.5">
                  base {{ p.basePriceUsd }} + {{ p.pricePerStudentUsd }}/élève au-delà de
                  {{ p.includedStudents }}
                </p>
              }
            </div>
            <button
              mat-flat-button
              class="rounded-xl!"
              type="submit"
              [disabled]="submitting() || form.invalid"
            >
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
            <panga-avatar [name]="schoolName(inv.schoolId) || 'SA'" [size]="40" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-(--text)">
                {{ inv.amount ?? '—' }}
                <span class="text-sm text-(--text-muted)">{{ inv.currency }}</span>
              </p>
              <p class="text-xs text-(--text-muted) truncate">
                {{ inv.subscriptionPlanOffered || '—' }}
                @if (inv.schoolId) {
                  · {{ schoolName(inv.schoolId) }}
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
  private readonly schoolsApi = inject(SchoolsService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly invoices = signal<SaasInvoice[]>([]);
  protected readonly schools = signal<PlatformSchool[]>([]);
  protected readonly pricingRows = signal<PlanPricing[]>([]);
  protected readonly subscription = signal<StatBlock | null>(null);
  protected readonly pagination = signal<PaginationMeta | null>(null);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);

  /* --- Calcul du montant : plan + nombre d'élèves --- */
  private readonly planSig = signal('');
  /** Effectif de l'école sélectionnée (lecture seule, vient de /schools). */
  protected readonly studentsSig = signal(0);
  protected readonly currency = computed(() => String(this.pricingRows()[0]?.currency ?? 'USD'));
  protected readonly planRow = computed(() =>
    this.pricingRows().find((r) => r.plan === this.planSig()),
  );
  /** Montant = base + prix/élève × max(0, élèves − inclus). */
  protected readonly computedAmount = computed(() => {
    const p = this.planRow();
    if (!p) {
      return 0;
    }
    const base = Number(p.basePriceUsd) || 0;
    const per = Number(p.pricePerStudentUsd) || 0;
    const incl = Number(p.includedStudents) || 0;
    const billable = Math.max(0, this.studentsSig() - incl);
    return Math.round((base + per * billable) * 100) / 100;
  });

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
    subscriptionPlanOffered: ['', Validators.required],
    notes: [''],
  });

  constructor() {
    this.load();
    this.schoolsApi.list({ page: 1, limit: 200 }).subscribe({
      next: (res) => this.schools.set(res.items),
    });
    this.billing.pricing().subscribe({
      next: (rows) => {
        this.pricingRows.set(rows);
        const plan = rows.some((r) => r.plan === 'premium') ? 'premium' : (rows[0]?.plan ?? '');
        this.form.controls.subscriptionPlanOffered.setValue(plan);
        this.planSig.set(plan);
      },
      error: () => undefined,
    });
    // Recalcule le montant quand le plan change.
    this.form.controls.subscriptionPlanOffered.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.planSig.set(v));
  }

  /** Effectif = donnée de l'école (non saisissable). */
  onSchoolChange(id: string): void {
    const s = this.schools().find((x) => x.id === id);
    this.studentsSig.set(Number(s?.['studentsCount'] ?? s?.['currentStudents'] ?? 0) || 0);
  }

  protected statusTone(inv: SaasInvoice): BadgeTone {
    return isPaid(inv) ? 'success' : 'warning';
  }

  /** Libellé d'une école pour le sélecteur. */
  protected schoolLabel(s: PlatformSchool): string {
    const name = s.displayName || s.name || s.code || s.id;
    return s.code && s.code !== name ? `${name} (${s.code})` : name;
  }

  /** Nom d'une école à partir de son id (repli sur l'id court). */
  protected schoolName(id: string | undefined): string {
    if (!id) {
      return '';
    }
    const s = this.schools().find((x) => x.id === id);
    return s ? s.displayName || s.name || s.code || id : `École ${id.slice(0, 6)}`;
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
    const v = this.form.getRawValue();
    this.billing
      .createInvoice({
        schoolId: v.schoolId,
        amount: this.computedAmount(),
        currency: this.currency(),
        subscriptionPlanOffered: v.subscriptionPlanOffered,
        ...(v.notes ? { notes: v.notes } : {}),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.notify.success('Facture créée.');
          this.form.reset({ subscriptionPlanOffered: this.planSig() });
          this.studentsSig.set(0);
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
