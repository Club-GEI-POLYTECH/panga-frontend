import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SectionHeader } from './section-header';
import { PhoneField } from './phone-field';
import { ProvinceField } from './province-field';
import { GpsField } from './gps-field';
import { CurrencySymbolField } from './currency-symbol-field';
import { DateField } from './date-field';
import { SCHOOL_EDITABLE_GROUPS, type SchoolFieldGroup } from '../../core/models/school-fields';

/**
 * Formulaire d'école piloté par métadonnées : rend les groupes de champs
 * (cartes + grille). Partagé par la fiche admin, le détail et la création
 * super_admin. Le FormGroup est fourni par le parent.
 *
 * `tabbed` : un groupe à la fois (page longue type « Mon établissement »).
 */
@Component({
  selector: 'panga-school-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    SectionHeader,
    PhoneField,
    ProvinceField,
    GpsField,
    CurrencySymbolField,
    DateField,
  ],
  template: `
    @if (tabbed()) {
      <div
        class="flex gap-2 overflow-x-auto pb-3 mb-1 -mx-1 px-1"
        role="tablist"
        aria-label="Sections de l'établissement"
      >
        @for (group of groups(); track group.title; let i = $index) {
          <button
            type="button"
            role="tab"
            class="shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors border"
            [attr.aria-selected]="activeTab() === i"
            [class.tab-active]="activeTab() === i"
            [class.tab-idle]="activeTab() !== i"
            (click)="activeTab.set(i)"
          >
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">{{ group.icon }}</span>
              {{ group.title }}
            </span>
          </button>
        }
      </div>
    }

    @for (group of visibleGroups(); track group.title) {
      <div class="panga-card p-5 mb-4" [formGroup]="form()">
        <panga-section-header [icon]="group.icon" [title]="group.title" />
        @if (group.hint) {
          <p class="text-xs text-(--text-muted) -mt-2 mb-4 leading-relaxed">{{ group.hint }}</p>
        }
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (f of group.fields; track f.key) {
            <!-- min-w-0 : autorise l'item de grille à rétrécir (évite le débordement mobile). -->
            <div [class]="f.wide ? 'min-w-0 sm:col-span-2 lg:col-span-3' : 'min-w-0'">
              @if (f.type === 'phone') {
                <panga-phone-field
                  class="block w-full"
                  [label]="f.label"
                  [formControlName]="f.key"
                />
              } @else if (f.type === 'province') {
                <panga-province-field
                  class="block w-full"
                  [label]="f.label"
                  [formControlName]="f.key"
                />
              } @else if (f.type === 'gps') {
                <panga-gps-field class="block w-full" [label]="f.label" [formControlName]="f.key" />
              } @else if (f.type === 'currency-symbol') {
                <panga-currency-symbol-field
                  class="block w-full"
                  [label]="f.label"
                  [formControlName]="f.key"
                />
              } @else if (f.type === 'date') {
                <panga-date-field
                  class="block w-full"
                  [label]="f.label"
                  [formControlName]="f.key"
                />
              } @else {
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>{{ f.label }}</mat-label>
                  @switch (f.type) {
                    @case ('textarea') {
                      <textarea matInput rows="2" [formControlName]="f.key"></textarea>
                    }
                    @case ('select') {
                      <mat-select [formControlName]="f.key">
                        <mat-option [value]="''">—</mat-option>
                        @for (o of f.options ?? []; track o.value) {
                          <mat-option [value]="o.value">{{ o.label }}</mat-option>
                        }
                      </mat-select>
                    }
                    @case ('multiselect') {
                      <mat-select [formControlName]="f.key" multiple>
                        @for (o of f.options ?? []; track o.value) {
                          <mat-option [value]="o.value">{{ o.label }}</mat-option>
                        }
                      </mat-select>
                    }
                    @default {
                      <input
                        matInput
                        [type]="f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'"
                        [formControlName]="f.key"
                      />
                    }
                  }
                  @if (f.hint) {
                    <mat-hint>{{ f.hint }}</mat-hint>
                  }
                </mat-form-field>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .tab-active {
        background: var(--brand-gradient);
        color: #fff;
        border-color: transparent;
      }
      .tab-idle {
        background: color-mix(in srgb, var(--text) 4%, transparent);
        color: var(--text);
        border-color: var(--border);
      }
      .tab-idle:hover {
        background: color-mix(in srgb, var(--brand-500) 10%, transparent);
        border-color: color-mix(in srgb, var(--brand-500) 35%, var(--border));
      }
    `,
  ],
})
export class SchoolFieldsForm {
  readonly form = input.required<FormGroup>();
  readonly groups = input<SchoolFieldGroup[]>(SCHOOL_EDITABLE_GROUPS);
  /** Un groupe visible à la fois, avec barre d'onglets. */
  readonly tabbed = input(false);

  protected readonly activeTab = signal(0);

  protected readonly visibleGroups = computed(() => {
    const all = this.groups();
    if (!this.tabbed()) {
      return all;
    }
    const i = Math.min(this.activeTab(), Math.max(0, all.length - 1));
    return all[i] ? [all[i]] : [];
  });
}
