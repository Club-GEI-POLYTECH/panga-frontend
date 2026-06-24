import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SectionHeader } from './section-header';
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
  ],
  template: `
    @for (group of groups(); track group.title) {
      <div class="panga-card p-5 mb-4" [formGroup]="form()">
        <panga-section-header [icon]="group.icon" [title]="group.title" />
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (f of group.fields; track f.key) {
            <div [class]="f.wide ? 'sm:col-span-2 lg:col-span-3' : ''">
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
              </mat-form-field>
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
