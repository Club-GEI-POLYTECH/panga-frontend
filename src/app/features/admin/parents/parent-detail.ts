import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ParentsService } from '../services/parents.service';
import type { Parent } from '../models/admin.models';
import type { EnumOption } from '../../../core/models/school.enums';
import { GENDER_OPTIONS } from '../../../core/models/student.enums';
import {
  PARENT_STATUS_OPTIONS,
  RELATIONSHIP_OPTIONS,
  parentLabel,
  parentStatusTone,
} from '../../../core/models/parent.enums';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

type FieldType = 'text' | 'email' | 'tel' | 'date' | 'select';
interface Field {
  key: string;
  label: string;
  type?: FieldType;
  options?: EnumOption[];
  wide?: boolean;
}
interface Group {
  title: string;
  icon: string;
  fields: Field[];
}

const GROUPS: Group[] = [
  {
    title: 'Identité',
    icon: 'badge',
    fields: [
      { key: 'firstName', label: 'Prénom' },
      { key: 'lastName', label: 'Nom' },
      { key: 'postnom', label: 'Postnom' },
      { key: 'gender', label: 'Sexe', type: 'select', options: GENDER_OPTIONS },
      { key: 'nationality', label: 'Nationalité' },
      { key: 'nationalIdNumber', label: "N° pièce d'identité" },
    ],
  },
  {
    title: 'Relation',
    icon: 'diversity_3',
    fields: [
      {
        key: 'relationship',
        label: 'Lien de parenté',
        type: 'select',
        options: RELATIONSHIP_OPTIONS,
      },
    ],
  },
  {
    title: 'Contact',
    icon: 'contacts',
    fields: [
      { key: 'phone', label: 'Téléphone', type: 'tel' },
      { key: 'secondaryPhone', label: 'Téléphone secondaire', type: 'tel' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'address', label: 'Adresse', wide: true },
      { key: 'city', label: 'Ville' },
      { key: 'province', label: 'Province' },
      { key: 'country', label: 'Pays' },
    ],
  },
  {
    title: 'Profession',
    icon: 'work',
    fields: [
      { key: 'occupation', label: 'Profession' },
      { key: 'jobTitle', label: 'Poste' },
      { key: 'employerName', label: 'Employeur' },
      { key: 'employerPhone', label: 'Téléphone employeur', type: 'tel' },
      { key: 'educationLevel', label: "Niveau d'études" },
    ],
  },
  {
    title: 'Conjoint',
    icon: 'favorite',
    fields: [
      { key: 'spouseName', label: 'Nom du conjoint' },
      { key: 'spousePhone', label: 'Téléphone du conjoint', type: 'tel' },
      { key: 'spouseEmail', label: 'E-mail du conjoint', type: 'email' },
      { key: 'spouseOccupation', label: 'Profession du conjoint' },
    ],
  },
];

const TOGGLES: { key: string; label: string }[] = [
  { key: 'isPrimary', label: 'Parent principal' },
  { key: 'isEmergencyContact', label: "Contact d'urgence" },
  { key: 'canPickupStudent', label: "Peut récupérer l'élève" },
  { key: 'canAuthorizeMedical', label: 'Peut autoriser les soins' },
  { key: 'canAuthorizeTrips', label: 'Peut autoriser les sorties' },
];

const TEXT_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.key));

@Component({
  selector: 'panga-parent-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    Avatar,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <a
      [routerLink]="['/', 'parents']"
      class="inline-flex items-center gap-1 text-sm text-(--text-muted) hover:text-(--brand-700) mb-4"
    >
      <mat-icon fontSet="material-symbols-outlined" class="text-base! w-4! h-4!"
        >arrow_back</mat-icon
      >
      Parents
    </a>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <div
        class="relative overflow-hidden rounded-3xl p-6 mb-5 text-white"
        style="background: var(--brand-gradient)"
      >
        <div
          class="absolute -right-8 -bottom-10 h-40 w-40 rounded-full opacity-15"
          style="background:#fff"
        ></div>
        <div class="relative flex flex-wrap items-center gap-4">
          <panga-avatar [name]="fullName()" [size]="64" />
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-semibold truncate" style="font-family: Urbanist, sans-serif">
              {{ fullName() || 'Parent' }}
            </h1>
            <p class="text-sm opacity-90">
              {{ relationshipLabel() }}
              @if (ro('email')) {
                · {{ ro('email') }}
              }
            </p>
          </div>
          @if (ro('status'); as st) {
            <panga-status-badge [label]="statusLabel(st)" [tone]="statusTone(st)" />
          }
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        @for (group of groups; track group.title) {
          <div class="panga-card p-5 mb-4">
            <panga-section-header [icon]="group.icon" [title]="group.title" />
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (f of group.fields; track f.key) {
                <div [class]="f.wide ? 'sm:col-span-2 lg:col-span-3' : ''">
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ f.label }}</mat-label>
                    @switch (f.type) {
                      @case ('select') {
                        <mat-select [formControlName]="f.key">
                          <mat-option [value]="''">—</mat-option>
                          @for (o of f.options ?? []; track o.value) {
                            <mat-option [value]="o.value">{{ o.label }}</mat-option>
                          }
                        </mat-select>
                      }
                      @default {
                        <input
                          matInput
                          [type]="
                            f.type === 'date'
                              ? 'date'
                              : f.type === 'email'
                                ? 'email'
                                : f.type === 'tel'
                                  ? 'tel'
                                  : 'text'
                          "
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

        <div class="panga-card p-5 mb-4">
          <panga-section-header icon="verified_user" title="Autorisations" />
          <div class="flex flex-wrap gap-x-6 gap-y-3">
            @for (t of toggles; track t.key) {
              <mat-slide-toggle [formControlName]="t.key">{{ t.label }}</mat-slide-toggle>
            }
          </div>
        </div>

        <div class="sticky bottom-4 z-10 flex justify-end mb-6">
          <button
            mat-flat-button
            class="rounded-xl! shadow-lg"
            type="submit"
            [disabled]="saving() || form.pristine"
          >
            <mat-icon fontSet="material-symbols-outlined">save</mat-icon>
            {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>

      <!-- Enfants liés -->
      <section class="panga-card p-5">
        <panga-section-header icon="school" title="Enfants liés" [count]="children().length" />
        @if (children().length === 0) {
          <p class="text-sm text-(--text-muted)">Aucun enfant lié.</p>
        } @else {
          <div class="divide-y divide-(--border) -mx-5">
            @for (c of children(); track $index) {
              <a
                [routerLink]="['/', 'students', childId(c)]"
                class="flex items-center gap-3 px-5 py-3 hover:bg-(--background) transition-colors"
              >
                <panga-avatar [name]="childLabel(c)" [size]="34" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-(--text) truncate">{{ childLabel(c) }}</p>
                  <p class="text-xs text-(--text-muted)">{{ childMeta(c) }}</p>
                </div>
                <mat-icon fontSet="material-symbols-outlined" class="text-(--text-muted)"
                  >chevron_right</mat-icon
                >
              </a>
            }
          </div>
        }
      </section>
    }
  `,
})
export class ParentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly parentsApi = inject(ParentsService);
  private readonly notify = inject(NotificationService);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly groups = GROUPS;
  protected readonly toggles = TOGGLES;
  protected readonly parent = signal<Parent | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly children = computed(
    () => (this.parent()?.students ?? []) as Record<string, unknown>[],
  );

  protected readonly form = new FormGroup({
    ...Object.fromEntries(TEXT_KEYS.map((k) => [k, new FormControl('', { nonNullable: true })])),
    ...Object.fromEntries(
      TOGGLES.map((t) => [t.key, new FormControl(false, { nonNullable: true })]),
    ),
  });

  constructor() {
    this.parentsApi.get(this.id).subscribe({
      next: (p) => {
        this.parent.set(p);
        this.patch(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private patch(p: Parent): void {
    const raw = p as Record<string, unknown>;
    const value: Record<string, string | boolean> = {};
    for (const key of TEXT_KEYS) {
      const v = raw[key];
      value[key] = v === null || v === undefined ? '' : String(v);
    }
    for (const t of TOGGLES) {
      value[t.key] = !!raw[t.key];
    }
    this.form.patchValue(value);
    this.form.markAsPristine();
  }

  save(): void {
    if (this.saving()) {
      return;
    }
    const raw = this.form.getRawValue() as Record<string, unknown>;
    const payload: Record<string, unknown> = {};
    for (const key of TEXT_KEYS) {
      const ctrl = this.form.get(key);
      if (ctrl?.dirty) {
        const v = raw[key];
        // PUT partiel : on omet les chaînes vides (échoueraient sur IsEmail…).
        if (v !== '') {
          payload[key] = v;
        }
      }
    }
    for (const t of TOGGLES) {
      if (this.form.get(t.key)?.dirty) {
        payload[t.key] = raw[t.key];
      }
    }
    if (Object.keys(payload).length === 0) {
      return;
    }
    this.saving.set(true);
    this.parentsApi.update(this.id, payload).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.parent.set(p);
        this.patch(p);
        this.notify.success('Parent mis à jour.');
      },
      error: () => this.saving.set(false),
    });
  }

  protected fullName(): string {
    const p = this.parent();
    return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '';
  }
  protected relationshipLabel(): string {
    return parentLabel(RELATIONSHIP_OPTIONS, this.parent()?.relationship);
  }
  protected statusLabel(v: string | undefined): string {
    return parentLabel(PARENT_STATUS_OPTIONS, v);
  }
  protected statusTone(v: string | undefined) {
    return parentStatusTone(v);
  }
  protected ro(key: string): string {
    const v = (this.parent() as Record<string, unknown> | null)?.[key];
    return v === null || v === undefined ? '' : String(v);
  }
  protected childId(c: Record<string, unknown>): string {
    return String(c['id'] ?? '');
  }
  protected childLabel(c: Record<string, unknown>): string {
    const name = `${(c['firstName'] as string) ?? ''} ${(c['lastName'] as string) ?? ''}`.trim();
    return name || (c['studentNumber'] as string) || 'Élève';
  }
  protected childMeta(c: Record<string, unknown>): string {
    return [c['studentNumber'], c['status']].filter(Boolean).join(' · ') || '—';
  }
}
