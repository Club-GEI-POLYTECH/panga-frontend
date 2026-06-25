import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { BillingService } from '../services/billing.service';
import type { PlanCatalog, PlanPricing } from '../models/platform.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

interface PriceRow {
  plan: FormControl<string>;
  basePriceUsd: FormControl<number>;
  pricePerStudentUsd: FormControl<number>;
  includedStudents: FormControl<number>;
}

/** Tarification SaaS (super_admin) : grille éditable + simulateur + catalogue. */
@Component({
  selector: 'panga-pricing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="sell"
      title="Tarification"
      subtitle="Prix des plans (base fixe + part par élève)"
    />

    <!-- Grille éditable -->
    <section class="panga-card p-5 mb-6">
      <panga-section-header icon="price_change" title="Grille des prix" [count]="rows().length" />
      @if (loading()) {
        <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
      } @else {
        <form [formGroup]="form">
          <div class="overflow-x-auto">
            <table class="w-full text-sm min-w-160">
              <thead class="text-(--text-muted) text-left">
                <tr class="border-b border-(--border)">
                  <th class="py-2 pr-3 font-medium">Plan</th>
                  <th class="py-2 px-3 font-medium">Base / mois ({{ currency() }})</th>
                  <th class="py-2 px-3 font-medium">Prix / élève ({{ currency() }})</th>
                  <th class="py-2 px-3 font-medium">Élèves inclus</th>
                  <th class="py-2 pl-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody formArrayName="plans">
                @for (ctrl of plans.controls; track ctrl.value.plan; let i = $index) {
                  <tr [formGroupName]="i" class="border-b border-(--border) last:border-0">
                    <td class="py-2 pr-3">
                      <span class="font-medium text-(--text) capitalize">{{
                        ctrl.value.plan
                      }}</span>
                    </td>
                    <td class="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        formControlName="basePriceUsd"
                        class="panga-price-input"
                      />
                    </td>
                    <td class="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        formControlName="pricePerStudentUsd"
                        class="panga-price-input"
                      />
                    </td>
                    <td class="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        formControlName="includedStudents"
                        class="panga-price-input"
                      />
                    </td>
                    <td class="py-2 pl-3 text-right">
                      <button
                        mat-flat-button
                        class="rounded-xl!"
                        [disabled]="ctrl.pristine || savingPlan() === ctrl.value.plan"
                        (click)="save(i)"
                      >
                        <mat-icon fontSet="material-symbols-outlined">save</mat-icon>
                        Enregistrer
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </form>
      }
    </section>

    <!-- Simulateur -->
    <section class="panga-card p-5 mb-6">
      <panga-section-header icon="calculate" title="Simulateur de prix" />
      <div class="grid gap-5 md:grid-cols-2">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <span class="text-sm text-(--text-muted)">Plan</span>
            <mat-select
              [value]="simPlan()"
              (selectionChange)="simPlan.set($event.value)"
              class="panga-price-input"
            >
              @for (r of rows(); track r.plan) {
                <mat-option [value]="r.plan"
                  ><span class="capitalize">{{ r.plan }}</span></mat-option
                >
              }
            </mat-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="text-sm text-(--text-muted)"
              >Nombre d'élèves : <b class="text-(--text)">{{ simStudents() }}</b></span
            >
            <input
              type="range"
              min="0"
              max="2000"
              step="10"
              [value]="simStudents()"
              (input)="onSlider($event)"
              class="w-full accent-(--brand-600)"
              aria-label="Nombre d'élèves"
            />
            <input
              type="number"
              min="0"
              [value]="simStudents()"
              (input)="onSlider($event)"
              class="panga-price-input w-32"
              aria-label="Nombre d'élèves"
            />
          </div>
        </div>

        @if (sim(); as s) {
          <div
            class="rounded-2xl p-5 text-white flex flex-col justify-center"
            style="background: var(--brand-gradient)"
          >
            <p class="text-sm opacity-90">Prix mensuel estimé</p>
            <p class="text-4xl font-bold tabular-nums mt-1">
              {{ s.monthly | number: '1.0-2' }}
              <span class="text-lg font-medium">{{ currency() }}</span>
            </p>
            <div class="mt-3 text-sm opacity-90 space-y-0.5">
              <p>Base : {{ s.base | number: '1.0-2' }} {{ currency() }}</p>
              <p>
                Part élèves : {{ s.billable }} × {{ s.per | number: '1.0-4' }} =
                {{ s.per * s.billable | number: '1.0-2' }} {{ currency() }}
              </p>
              <p class="opacity-75">({{ s.incl }} élèves inclus dans la base)</p>
            </div>
          </div>
        }
      </div>
    </section>

    <!-- Catalogue / fonctionnalités -->
    @if (catalog(); as c) {
      <section class="panga-card p-5">
        <panga-section-header
          icon="featured_play_list"
          title="Plans & fonctionnalités"
          [count]="c.plans.length"
        />
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (p of c.plans; track p.plan) {
            <div class="rounded-2xl border border-(--border) p-4">
              <div class="flex items-baseline justify-between">
                <p class="font-semibold text-(--text) capitalize">{{ p.plan }}</p>
                <p class="text-sm text-(--text-muted)">
                  dès {{ p.basePriceUsd | number: '1.0-0' }} {{ c.currency }}/mois
                </p>
              </div>
              <div class="mt-3 flex flex-wrap gap-1.5">
                @for (f of p.features; track f) {
                  <panga-status-badge [label]="f" tone="brand" [dot]="false" />
                }
              </div>
              @if (p.example) {
                <p class="text-xs text-(--text-muted) mt-3">
                  Ex. {{ p.example.students }} élèves →
                  {{ p.example.monthlyPriceUsd | number: '1.0-0' }} {{ c.currency }}/mois
                </p>
              }
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      .panga-price-input {
        width: 100%;
        max-width: 9rem;
        padding: 0.45rem 0.65rem;
        border-radius: 0.6rem;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        font-size: 0.875rem;
      }
      .panga-price-input:focus {
        outline: none;
        border-color: color-mix(in srgb, var(--brand-500) 50%, var(--border));
      }
    `,
  ],
})
export class Pricing {
  private readonly billing = inject(BillingService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly savingPlan = signal<string | null>(null);
  protected readonly rows = signal<PlanPricing[]>([]);
  protected readonly catalog = signal<PlanCatalog | null>(null);
  protected readonly currency = computed(() => this.catalog()?.currency ?? 'USD');

  protected readonly form = new FormGroup({ plans: new FormArray<FormGroup<PriceRow>>([]) });
  protected get plans(): FormArray<FormGroup<PriceRow>> {
    return this.form.controls.plans;
  }

  /* --------------------------------- Simulateur --------------------------------- */
  protected readonly simPlan = signal('premium');
  protected readonly simStudents = signal(300);
  protected readonly sim = computed(() => {
    const r = this.rows().find((x) => x.plan === this.simPlan());
    if (!r) {
      return null;
    }
    const base = Number(r.basePriceUsd) || 0;
    const per = Number(r.pricePerStudentUsd) || 0;
    const incl = Number(r.includedStudents) || 0;
    const billable = Math.max(0, this.simStudents() - incl);
    return { base, per, incl, billable, monthly: base + per * billable };
  });

  constructor() {
    forkJoin({
      pricing: this.billing.pricing(),
      catalog: this.billing.plans(),
    }).subscribe({
      next: (r) => {
        this.setRows(r.pricing);
        this.catalog.set(r.catalog);
        if (r.pricing.length && !r.pricing.some((p) => p.plan === this.simPlan())) {
          this.simPlan.set(r.pricing[0].plan);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private setRows(rows: PlanPricing[]): void {
    this.rows.set(rows);
    this.plans.clear();
    for (const r of rows) {
      this.plans.push(
        new FormGroup<PriceRow>({
          plan: new FormControl(r.plan, { nonNullable: true }),
          basePriceUsd: new FormControl(Number(r.basePriceUsd) || 0, { nonNullable: true }),
          pricePerStudentUsd: new FormControl(Number(r.pricePerStudentUsd) || 0, {
            nonNullable: true,
          }),
          includedStudents: new FormControl(Number(r.includedStudents) || 0, { nonNullable: true }),
        }),
      );
    }
  }

  protected onSlider(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.simStudents.set(Math.max(0, value));
    }
  }

  save(index: number): void {
    const group = this.plans.at(index);
    if (!group || this.savingPlan()) {
      return;
    }
    const v = group.getRawValue();
    this.savingPlan.set(v.plan);
    this.billing
      .updatePricing(v.plan, {
        basePriceUsd: v.basePriceUsd,
        pricePerStudentUsd: v.pricePerStudentUsd,
        includedStudents: v.includedStudents,
      })
      .subscribe({
        next: () => {
          this.savingPlan.set(null);
          group.markAsPristine();
          this.notify.success(`Tarifs du plan « ${v.plan} » enregistrés.`);
          // Met à jour la source du simulateur.
          this.rows.update((list) =>
            list.map((r) =>
              r.plan === v.plan
                ? {
                    ...r,
                    basePriceUsd: v.basePriceUsd,
                    pricePerStudentUsd: v.pricePerStudentUsd,
                    includedStudents: v.includedStudents,
                  }
                : r,
            ),
          );
        },
        error: () => this.savingPlan.set(null),
      });
  }
}
