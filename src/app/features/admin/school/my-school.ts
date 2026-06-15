import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { SchoolService } from '../services/school.service';
import type { PlatformSchool, SchoolAuthority } from '../../super-admin/models/platform.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'multiselect';
interface Field {
  key: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  wide?: boolean;
}
interface Group {
  title: string;
  icon: string;
  fields: Field[];
}

const EDU = [
  { value: 'preschool', label: 'Maternelle' },
  { value: 'primary', label: 'Primaire' },
  { value: 'secondary', label: 'Secondaire' },
  { value: 'vocational', label: 'Professionnel' },
  { value: 'university', label: 'Supérieur' },
];

const EDITABLE: Group[] = [
  {
    title: 'Identité',
    icon: 'badge',
    fields: [
      { key: 'displayName', label: 'Nom affiché' },
      { key: 'name', label: 'Nom complet' },
      { key: 'legalName', label: 'Raison sociale' },
      {
        key: 'schoolType',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'private', label: 'Privé' },
          { value: 'public', label: 'Public' },
          { value: 'confessional', label: 'Conventionné' },
          { value: 'other', label: 'Autre' },
        ],
      },
      {
        key: 'educationLevels',
        label: "Niveaux d'enseignement",
        type: 'multiselect',
        options: EDU,
        wide: true,
      },
      { key: 'motto', label: 'Devise' },
      { key: 'vision', label: 'Vision', type: 'textarea', wide: true },
      { key: 'mission', label: 'Mission', type: 'textarea', wide: true },
      { key: 'coreValues', label: 'Valeurs', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Coordonnées & localisation',
    icon: 'location_on',
    fields: [
      { key: 'address', label: 'Adresse', wide: true },
      { key: 'city', label: 'Ville' },
      { key: 'province', label: 'Province' },
      { key: 'postalCode', label: 'Code postal' },
      { key: 'country', label: 'Pays' },
      { key: 'gpsCoordinates', label: 'Coordonnées GPS' },
      { key: 'phone', label: 'Téléphone', type: 'tel' },
      { key: 'secondaryPhone', label: 'Téléphone secondaire', type: 'tel' },
      { key: 'fax', label: 'Fax', type: 'tel' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'secondaryEmail', label: 'E-mail secondaire', type: 'email' },
      { key: 'website', label: 'Site web' },
    ],
  },
  {
    title: 'Direction & contacts',
    icon: 'groups',
    fields: [
      { key: 'principalName', label: 'Directeur — nom' },
      { key: 'principalEmail', label: 'Directeur — e-mail', type: 'email' },
      { key: 'principalPhone', label: 'Directeur — téléphone', type: 'tel' },
      { key: 'vicePrincipalName', label: 'Adjoint — nom' },
      { key: 'vicePrincipalEmail', label: 'Adjoint — e-mail', type: 'email' },
      { key: 'primaryDirectorName', label: 'Directeur primaire — nom' },
      { key: 'primaryDirectorEmail', label: 'Directeur primaire — e-mail', type: 'email' },
      { key: 'primaryDirectorPhone', label: 'Directeur primaire — téléphone', type: 'tel' },
      { key: 'secondaryPrefectName', label: 'Préfet secondaire — nom' },
      { key: 'secondaryPrefectEmail', label: 'Préfet secondaire — e-mail', type: 'email' },
      { key: 'secondaryPrefectPhone', label: 'Préfet secondaire — téléphone', type: 'tel' },
      { key: 'adminContactName', label: 'Contact admin — nom' },
      { key: 'adminContactEmail', label: 'Contact admin — e-mail', type: 'email' },
      { key: 'adminContactPhone', label: 'Contact admin — téléphone', type: 'tel' },
      { key: 'financeContactName', label: 'Contact finances — nom' },
      { key: 'financeContactEmail', label: 'Contact finances — e-mail', type: 'email' },
      { key: 'financeContactPhone', label: 'Contact finances — téléphone', type: 'tel' },
    ],
  },
  {
    title: 'Académique',
    icon: 'menu_book',
    fields: [
      { key: 'curriculum', label: 'Curriculum' },
      { key: 'curriculumVersion', label: 'Version curriculum' },
      { key: 'languageOfInstruction', label: "Langue d'enseignement" },
    ],
  },
  {
    title: 'Accréditation & licence',
    icon: 'verified',
    fields: [
      {
        key: 'accreditationStatus',
        label: 'Statut accréditation',
        type: 'select',
        options: [
          { value: 'accredited', label: 'Accréditée' },
          { value: 'pending', label: 'En cours' },
          { value: 'none', label: 'Non accréditée' },
        ],
      },
      { key: 'accreditationBody', label: "Organe d'accréditation" },
      { key: 'accreditationNumber', label: "N° d'accréditation" },
      { key: 'licenseNumber', label: 'N° de licence' },
      { key: 'registrationNumber', label: "N° d'enregistrement" },
      { key: 'taxId', label: 'Identifiant fiscal' },
    ],
  },
  {
    title: 'Formats & localisation',
    icon: 'schedule',
    fields: [
      { key: 'timezone', label: 'Fuseau horaire' },
      {
        key: 'dateFormat',
        label: 'Format de date',
        type: 'select',
        options: [
          { value: 'DD/MM/YYYY', label: 'JJ/MM/AAAA' },
          { value: 'MM/DD/YYYY', label: 'MM/JJ/AAAA' },
          { value: 'YYYY-MM-DD', label: 'AAAA-MM-JJ' },
        ],
      },
      {
        key: 'timeFormat',
        label: 'Format heure',
        type: 'select',
        options: [
          { value: '24h', label: '24h' },
          { value: '12h', label: '12h' },
        ],
      },
      { key: 'currency', label: 'Devise' },
      { key: 'currencySymbol', label: 'Symbole devise' },
    ],
  },
  {
    title: 'Coordonnées bancaires',
    icon: 'account_balance',
    fields: [
      { key: 'bankName', label: 'Banque' },
      { key: 'bankAccountName', label: 'Titulaire du compte' },
      { key: 'bankAccountNumber', label: 'N° de compte' },
      { key: 'iban', label: 'IBAN' },
      { key: 'swiftCode', label: 'Code SWIFT' },
    ],
  },
];

const ALL_KEYS = EDITABLE.flatMap((g) => g.fields.map((f) => f.key));

const READONLY: Group[] = [
  {
    title: 'Abonnement & limites',
    icon: 'workspace_premium',
    fields: [
      { key: 'subscriptionPlan', label: 'Plan' },
      { key: 'saasBillingStatus', label: 'Facturation' },
      { key: 'status', label: 'Statut' },
      { key: 'maxStudents', label: 'Élèves max' },
      { key: 'currentStudents', label: 'Élèves actuels' },
      { key: 'maxTeachers', label: 'Enseignants max' },
      { key: 'currentTeachers', label: 'Enseignants actuels' },
      { key: 'maxClasses', label: 'Classes max' },
      { key: 'currentClasses', label: 'Classes actuelles' },
      { key: 'storageUsedGb', label: 'Stockage (Go)' },
    ],
  },
  {
    title: 'Identifiants système',
    icon: 'dns',
    fields: [
      { key: 'code', label: 'Code' },
      { key: 'subdomain', label: 'Sous-domaine' },
      { key: 'id', label: 'Identifiant' },
      { key: 'createdAt', label: 'Créé le' },
      { key: 'updatedAt', label: 'Modifié le' },
    ],
  },
];

@Component({
  selector: 'panga-my-school',
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
    Avatar,
    SectionHeader,
    StatusBadge,
  ],
  providers: [DatePipe],
  template: `
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
          <panga-avatar [name]="school()?.name || '?'" [size]="64" />
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-semibold truncate" style="font-family: Poppins, sans-serif">
              {{ school()?.displayName || school()?.name || 'Mon établissement' }}
            </h1>
            <p class="text-sm opacity-90">
              {{ school()?.code }}
              @if (school()?.city) {
                · {{ school()?.city }}
              }
            </p>
          </div>
          @if (asString(roVal('status'))) {
            <panga-status-badge
              [label]="asString(roVal('status'))"
              [tone]="school()?.isActive ? 'success' : 'neutral'"
            />
          }
        </div>
      </div>

      <!-- Formulaire éditable -->
      <form [formGroup]="form" (ngSubmit)="save()">
        @for (group of editable; track group.title) {
          <div class="panga-card p-5 mb-4">
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

        <div class="sticky bottom-4 z-10 flex justify-end mb-6">
          <button
            mat-flat-button
            class="!rounded-xl shadow-lg"
            type="submit"
            [disabled]="saving() || form.pristine"
          >
            <mat-icon fontSet="material-symbols-outlined">save</mat-icon>
            {{ saving() ? 'Enregistrement…' : 'Enregistrer les modifications' }}
          </button>
        </div>
      </form>

      <!-- Lecture seule -->
      <section class="grid gap-4 lg:grid-cols-2 mb-4">
        @for (group of readonly; track group.title) {
          <div class="panga-card p-5">
            <panga-section-header [icon]="group.icon" [title]="group.title" />
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              @for (f of group.fields; track f.key) {
                <div class="flex justify-between gap-3 py-1.5 border-b border-[var(--border)]">
                  <dt class="text-sm text-[var(--text-muted)]">{{ f.label }}</dt>
                  <dd class="text-sm font-medium text-[var(--text)] text-right break-all">
                    {{ displayRo(f.key) }}
                  </dd>
                </div>
              }
            </dl>
          </div>
        }
      </section>

      <!-- Autorités -->
      <section class="panga-card p-5">
        <panga-section-header
          icon="shield_person"
          title="Autorités"
          [count]="authorities().length"
        />
        @if (authorities().length) {
          <div class="grid gap-3 sm:grid-cols-2 mb-6">
            @for (a of authorities(); track a.id) {
              <div class="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3">
                <panga-avatar [name]="a.displayName || a.roleCode || '?'" [size]="40" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-[var(--text)] truncate">
                    {{ a.displayName || a.roleCode }}
                  </p>
                  <p class="text-xs text-[var(--text-muted)] truncate">{{ a.email }}</p>
                  <div class="mt-1 flex flex-wrap gap-1.5">
                    @if (a.roleCode) {
                      <panga-status-badge [label]="a.roleCode" tone="brand" [dot]="false" />
                    }
                    @if (a.educationLevel) {
                      <panga-status-badge [label]="a.educationLevel" tone="info" [dot]="false" />
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="text-sm text-[var(--text-muted)] mb-6">Aucune autorité enregistrée.</p>
        }

        <div class="rounded-2xl bg-[color-mix(in_srgb,var(--brand-500)_5%,transparent)] p-4">
          <p class="text-sm font-medium text-[var(--text)] mb-3">Ajouter une autorité</p>
          <form
            [formGroup]="authForm"
            (ngSubmit)="addAuthority()"
            class="grid gap-3 sm:grid-cols-2"
          >
            <mat-form-field appearance="outline">
              <mat-label>Nom affiché</mat-label>
              <input matInput formControlName="displayName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>E-mail</mat-label>
              <input matInput type="email" formControlName="email" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Code rôle</mat-label>
              <input matInput formControlName="roleCode" placeholder="secondary_prefect" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Niveau</mat-label>
              <input matInput formControlName="educationLevel" placeholder="secondary" />
            </mat-form-field>
            <div class="sm:col-span-2 flex justify-end">
              <button
                mat-flat-button
                class="!rounded-xl"
                type="submit"
                [disabled]="addingAuthority()"
              >
                Ajouter
              </button>
            </div>
          </form>
        </div>
      </section>
    }
  `,
})
export class MySchool {
  private readonly schoolApi = inject(SchoolService);
  private readonly notify = inject(NotificationService);
  private readonly datePipe = inject(DatePipe);

  protected readonly editable = EDITABLE;
  protected readonly readonly = READONLY;

  protected readonly school = signal<PlatformSchool | null>(null);
  protected readonly authorities = signal<SchoolAuthority[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly addingAuthority = signal(false);

  protected readonly form = new FormGroup(
    Object.fromEntries(
      ALL_KEYS.map((k) => [
        k,
        new FormControl<string | string[]>(k === 'educationLevels' ? [] : '', {
          nonNullable: true,
        }),
      ]),
    ),
  );

  protected readonly authForm = new FormGroup({
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    roleCode: new FormControl('secondary_prefect', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    educationLevel: new FormControl('secondary', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    this.schoolApi.mySchool().subscribe({
      next: (s) => {
        this.school.set(s);
        this.patch(s);
        this.loading.set(false);
        this.loadAuthorities();
      },
      error: () => this.loading.set(false),
    });
  }

  private patch(s: PlatformSchool): void {
    const value: Record<string, string | string[]> = {};
    for (const key of ALL_KEYS) {
      const raw = (s as Record<string, unknown>)[key];
      if (key === 'educationLevels') {
        value[key] = Array.isArray(raw) ? (raw as string[]) : [];
      } else {
        value[key] = raw === null || raw === undefined ? '' : String(raw);
      }
    }
    this.form.patchValue(value);
    this.form.markAsPristine();
  }

  private schoolId(): string {
    return this.school()?.id ?? '';
  }

  /* -------------------------------- Lecture seule -------------------------------- */

  protected roVal(key: string): unknown {
    return (this.school() as Record<string, unknown> | null)?.[key];
  }
  protected asString(v: unknown): string {
    return v === null || v === undefined ? '' : String(v);
  }
  protected displayRo(key: string): string {
    const v = this.roVal(key);
    if (v === null || v === undefined || v === '') {
      return '—';
    }
    if (key === 'createdAt' || key === 'updatedAt') {
      return this.datePipe.transform(v as string, 'dd/MM/yyyy HH:mm') ?? String(v);
    }
    if (typeof v === 'number') {
      return v.toLocaleString('fr-FR');
    }
    return String(v);
  }

  /* ----------------------------------- Actions ---------------------------------- */

  save(): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k === 'educationLevels') {
        payload[k] = v;
      } else {
        payload[k] = v === '' ? null : v;
      }
    }
    this.schoolApi.update(this.schoolId(), payload).subscribe({
      next: (s) => {
        this.saving.set(false);
        this.school.set(s);
        this.patch(s);
        this.notify.success('Établissement mis à jour.');
      },
      error: () => this.saving.set(false),
    });
  }

  private loadAuthorities(): void {
    this.schoolApi.authorities(this.schoolId()).subscribe({
      next: (r) => this.authorities.set(r.items),
    });
  }

  addAuthority(): void {
    if (this.authForm.invalid || this.addingAuthority()) {
      this.authForm.markAllAsTouched();
      return;
    }
    this.addingAuthority.set(true);
    this.schoolApi.createAuthority(this.schoolId(), this.authForm.getRawValue()).subscribe({
      next: () => {
        this.addingAuthority.set(false);
        this.notify.success('Autorité ajoutée.');
        this.authForm.reset({ roleCode: 'secondary_prefect', educationLevel: 'secondary' });
        this.loadAuthorities();
      },
      error: () => this.addingAuthority.set(false),
    });
  }
}
