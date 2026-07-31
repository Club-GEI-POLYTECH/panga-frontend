import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ParentsService } from '../services/parents.service';
import type { Parent } from '../models/admin.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { CredentialReveal } from '../../../shared/ui/credential-reveal';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { clientMeta, pageSlice } from '../../../shared/ui/client-pagination';
import { DateField } from '../../../shared/ui/date-field';
import { PhoneField } from '../../../shared/ui/phone-field';
import { ProvinceField } from '../../../shared/ui/province-field';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';
import type { EnumOption } from '../../../core/models/school.enums';
import { COUNTRY_OPTIONS } from '../../../core/models/geo.reference';
import { GENDER_OPTIONS } from '../../../core/models/student.enums';
import {
  PARENT_STATUS_OPTIONS,
  RELATIONSHIP_OPTIONS,
  parentLabel,
  parentStatusTone,
} from '../../../core/models/parent.enums';

type FieldType = 'text' | 'email' | 'tel' | 'date' | 'select' | 'phone' | 'province';
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
      { key: 'status', label: 'Statut', type: 'select', options: PARENT_STATUS_OPTIONS },
    ],
  },
  {
    title: 'Contact',
    icon: 'contacts',
    fields: [
      { key: 'phone', label: 'Téléphone', type: 'phone' },
      { key: 'secondaryPhone', label: 'Téléphone secondaire', type: 'phone' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'address', label: 'Adresse', wide: true },
      { key: 'city', label: 'Ville' },
      { key: 'country', label: 'Pays', type: 'select', options: COUNTRY_OPTIONS },
      { key: 'province', label: 'Province', type: 'province' },
    ],
  },
  {
    title: 'Profession',
    icon: 'work',
    fields: [
      { key: 'occupation', label: 'Profession' },
      { key: 'jobTitle', label: 'Poste' },
      { key: 'employerName', label: 'Employeur' },
      { key: 'employerPhone', label: 'Téléphone employeur', type: 'phone' },
      { key: 'educationLevel', label: "Niveau d'études" },
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
  selector: 'panga-parents-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    Avatar,
    CredentialReveal,
    EmptyState,
    KpiCard,
    PageHeader,
    Paginator,
    DateField,
    PhoneField,
    ProvinceField,
    SectionHeader,
    StatusBadge,
    SkeletonTable,
  ],
  template: `
    <panga-page-header
      icon="family_restroom"
      title="Parents"
      subtitle="Responsables & contacts des élèves"
    >
      <button mat-stroked-button class="rounded-xl!" (click)="downloadTemplate()">
        <mat-icon fontSet="material-symbols-outlined">download</mat-icon> Modèle
      </button>
      <input #fileInput type="file" class="hidden" accept=".xlsx,.xls" (change)="onFile($event)" />
      <button
        mat-stroked-button
        class="rounded-xl!"
        (click)="fileInput.click()"
        [disabled]="importing()"
      >
        <mat-icon fontSet="material-symbols-outlined">upload_file</mat-icon>
        {{ importing() ? 'Import…' : 'Importer (Excel)' }}
      </button>
      <button mat-flat-button class="rounded-xl!" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{
          showForm() ? 'close' : 'person_add'
        }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouveau parent' }}
      </button>
    </panga-page-header>

    @if (credential(); as c) {
      <panga-credential-reveal
        title="Compte parent créé"
        [identifier]="c.identifier"
        [password]="c.password"
        (dismiss)="credential.set(null)"
      />
    }

    <section class="grid gap-4 grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 mb-6">
      <panga-kpi-card label="Parents" [value]="parents().length" icon="family_restroom" />
      <panga-kpi-card label="Principaux" [value]="primaryCount()" icon="star" />
      <panga-kpi-card label="Contacts d'urgence" [value]="emergencyCount()" icon="emergency" />
      <panga-kpi-card label="Enfants liés" [value]="childrenTotal()" icon="school" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="person_add" title="Nouveau parent" />
        @for (group of groups; track group.title) {
          <p class="text-sm font-semibold text-(--text) mt-3 mb-2 flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-(--brand-500)">{{
              group.icon
            }}</span>
            {{ group.title }}
          </p>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (f of group.fields; track f.key) {
              <div [class]="f.wide ? 'min-w-0 sm:col-span-2 lg:col-span-3' : 'min-w-0'">
                @if (f.type === 'date') {
                  <panga-date-field
                    class="block w-full"
                    [label]="f.label"
                    [formControlName]="f.key"
                  />
                } @else if (f.type === 'phone') {
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
                } @else {
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ f.label }}</mat-label>
                    @switch (f.type) {
                      @case ('select') {
                        <mat-select [formControlName]="f.key">
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
                }
              </div>
            }
          </div>
        }

        <p class="text-sm font-semibold text-(--text) mt-3 mb-2 flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px] text-(--brand-500)"
            >verified_user</span
          >
          Autorisations
        </p>
        <div class="flex flex-wrap gap-x-6 gap-y-3">
          @for (t of toggles; track t.key) {
            <mat-slide-toggle [formControlName]="t.key">{{ t.label }}</mat-slide-toggle>
          }
        </div>

        <div class="flex justify-end mt-4">
          <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="submitting()">
            Ajouter le parent
          </button>
        </div>
      </form>
    }

    <div class="panga-card p-4 mb-4">
      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Rechercher</mat-label>
        <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
        <input matInput [formControl]="searchCtrl" placeholder="Nom, e-mail, téléphone…" />
      </mat-form-field>
    </div>

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (parents().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="family_restroom"
          title="Aucun parent"
          description="Ajoutez votre premier parent."
          actionLabel="Nouveau parent"
          (action)="showForm.set(true)"
        />
      </div>
    } @else {
      <div class="panga-card divide-y divide-(--border)">
        @for (p of visibleParents(); track p.id) {
          <div
            class="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)] transition-colors"
          >
            <a [routerLink]="['/', 'parents', p.id]" class="flex items-center gap-4 min-w-0 flex-1">
              <panga-avatar [name]="fullName(p)" [size]="44" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-medium text-(--text) truncate">{{ fullName(p) || '—' }}</p>
                  @if (p.relationship) {
                    <panga-status-badge
                      [label]="relationshipLabel(p.relationship)"
                      tone="brand"
                      [dot]="false"
                    />
                  }
                  @if (p.isPrimary) {
                    <panga-status-badge label="Principal" tone="info" [dot]="false" />
                  }
                  @if (p.isEmergencyContact) {
                    <panga-status-badge label="Urgence" tone="warning" [dot]="false" />
                  }
                </div>
                <div
                  class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-(--text-muted)"
                >
                  @if (p.email) {
                    <span class="inline-flex items-center gap-1 truncate">
                      <span class="material-symbols-outlined text-[14px]">mail</span> {{ p.email }}
                    </span>
                  }
                  @if (p.phone) {
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">call</span> {{ p.phone }}
                    </span>
                  }
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">school</span>
                    {{ p.childrenCount ?? 0 }} enfant(s)
                  </span>
                </div>
              </div>
            </a>
            @if (p.status) {
              <panga-status-badge
                [label]="statusLabel(p.status)"
                [tone]="statusTone(p.status)"
                class="hidden sm:inline-flex"
              />
            }
            <button
              mat-icon-button
              [matMenuTriggerFor]="menu"
              matTooltip="Changer le statut"
              aria-label="Changer le statut"
              class="shrink-0"
            >
              <mat-icon fontSet="material-symbols-outlined" class="text-(--text-muted)"
                >more_vert</mat-icon
              >
            </button>
            <mat-menu #menu="matMenu" class="panga-menu">
              <p class="px-4 pt-2 pb-1 text-xs text-(--text-muted)">Changer le statut</p>
              @for (st of statusOptions; track st.value) {
                <button
                  mat-menu-item
                  (click)="changeStatus(p, st.value)"
                  [disabled]="p.status === st.value"
                >
                  <mat-icon fontSet="material-symbols-outlined">
                    {{ p.status === st.value ? 'check' : 'radio_button_unchecked' }}
                  </mat-icon>
                  <span>{{ st.label }}</span>
                </button>
              }
            </mat-menu>
          </div>
        }
        <panga-paginator [meta]="pageMeta()" (pageChange)="page.set($event)" />
      </div>
    }
  `,
})
export class ParentsList {
  private readonly parentsApi = inject(ParentsService);
  private readonly notify = inject(NotificationService);

  protected readonly groups = GROUPS;
  protected readonly toggles = TOGGLES;
  protected readonly statusOptions = PARENT_STATUS_OPTIONS;

  protected readonly parents = signal<Parent[]>([]);
  /** Pagination + recherche côté client (l'endpoint /parents renvoie tout le lot). */
  protected readonly page = signal(1);
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });
  protected readonly search = signal('');
  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) {
      return this.parents();
    }
    return this.parents().filter((p) =>
      `${this.fullName(p)} ${p.email ?? ''} ${p.phone ?? ''}`.toLowerCase().includes(q),
    );
  });
  protected readonly pageMeta = computed(() => clientMeta(this.filtered().length, this.page()));
  protected readonly visibleParents = computed(() => pageSlice(this.filtered(), this.page()));
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly importing = signal(false);
  protected readonly showForm = signal(false);
  /** Mot de passe temporaire renvoyé une seule fois à la création d'un compte. */
  protected readonly credential = signal<{ identifier: string; password: string } | null>(null);

  protected readonly primaryCount = computed(
    () => this.parents().filter((p) => p.isPrimary).length,
  );
  protected readonly emergencyCount = computed(
    () => this.parents().filter((p) => p.isEmergencyContact).length,
  );
  protected readonly childrenTotal = computed(() =>
    this.parents().reduce((s, p) => s + (p.childrenCount ?? 0), 0),
  );

  protected readonly form = new FormGroup({
    ...Object.fromEntries(
      TEXT_KEYS.map((k) => {
        const required = k === 'firstName' || k === 'lastName';
        const initial = k === 'relationship' ? 'guardian' : k === 'status' ? 'active' : '';
        return [
          k,
          new FormControl(initial, {
            nonNullable: true,
            validators: required ? [Validators.required] : [],
          }),
        ];
      }),
    ),
    ...Object.fromEntries(
      TOGGLES.map((t) => [
        t.key,
        new FormControl(t.key === 'canPickupStudent', { nonNullable: true }),
      ]),
    ),
  });

  constructor() {
    this.load();
    this.searchCtrl.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe((v) => {
      this.search.set(v.trim());
      this.page.set(1);
    });
  }

  protected fullName(p: Parent): string {
    return `${p.firstName || ''} ${p.lastName || ''}`.trim();
  }
  protected relationshipLabel(v: string | undefined): string {
    return parentLabel(RELATIONSHIP_OPTIONS, v);
  }
  protected statusLabel(v: string | undefined): string {
    return parentLabel(PARENT_STATUS_OPTIONS, v);
  }
  protected statusTone(v: string | undefined) {
    return parentStatusTone(v);
  }

  private load(): void {
    this.loading.set(true);
    this.parentsApi.list().subscribe({
      next: (res) => {
        this.parents.set(res.items);
        this.page.set(1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changeStatus(parent: Parent, status: string): void {
    if (parent.status === status) {
      return;
    }
    this.parentsApi.updateStatus(parent.id, status).subscribe({
      next: () => {
        this.notify.success('Statut mis à jour.');
        this.load();
      },
    });
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue() as Record<string, unknown>;
    // Whitelist stricte : champs texte non vides + booléens.
    const payload: Record<string, unknown> = {};
    for (const key of TEXT_KEYS) {
      if (raw[key] !== '' && raw[key] != null) {
        payload[key] = raw[key];
      }
    }
    for (const t of TOGGLES) {
      payload[t.key] = raw[t.key];
    }
    this.submitting.set(true);
    this.parentsApi.create(payload).subscribe({
      next: (parent) => {
        this.revealCredential(parent as Record<string, unknown>);
        this.submitting.set(false);
        this.notify.success('Parent ajouté.');
        this.form.reset({ relationship: 'guardian', status: 'active', canPickupStudent: true });
        this.showForm.set(false);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }

  /** Affiche le mot de passe temporaire si le backend en a généré un. */
  private revealCredential(parent: Record<string, unknown>): void {
    const user = (parent?.['user'] ?? {}) as Record<string, unknown>;
    const password = (parent?.['temporaryPassword'] ?? user['temporaryPassword']) as
      | string
      | undefined;
    if (!password) {
      return;
    }
    const identifier = String(
      user['username'] ?? user['email'] ?? parent['email'] ?? this.fullName(parent as Parent),
    );
    this.credential.set({ identifier, password });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.importing()) {
      return;
    }
    this.importing.set(true);
    this.parentsApi.importExcel(file).subscribe({
      next: (res) => {
        this.importing.set(false);
        const count = Number(res?.['success'] ?? res?.['imported'] ?? res?.['count']) || 0;
        this.notify.success(count ? `${count} parent(s) importé(s).` : 'Import terminé.');
        input.value = '';
        this.load();
      },
      error: () => {
        this.importing.set(false);
        input.value = '';
      },
    });
  }

  downloadTemplate(): void {
    this.parentsApi.downloadTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_parents.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }
}
