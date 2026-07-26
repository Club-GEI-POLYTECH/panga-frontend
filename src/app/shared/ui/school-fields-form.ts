import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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
    @for (group of groups(); track group.title) {
      <div class="panga-card p-5 mb-4" [formGroup]="form()">
        <panga-section-header [icon]="group.icon" [title]="group.title" />
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (f of group.fields; track f.key) {
            <div [class]="f.wide ? 'sm:col-span-2 lg:col-span-3' : ''">
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
})
export class SchoolFieldsForm {
  readonly form = input.required<FormGroup>();
  readonly groups = input<SchoolFieldGroup[]>(SCHOOL_EDITABLE_GROUPS);
}
