import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FilterSheetContent } from '../../../shared/ui/filter-sheet';
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
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';
import type { EnumOption } from '../../../core/models/school.enums';
import { COUNTRY_OPTIONS } from '../../../core/models/geo.reference';
import { GENDER_OPTIONS } from '../../../core/models/student.enums';
import {
  PARENT_STATUS_OPTIONS,
  RELATIONSHIP_OPTIONS,
  parentLabel,
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
/** Dernier onglet = Autorisations (index = groups.length). */
const AUTH_TAB = GROUPS.length;

@Component({
  selector: 'panga-parents-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
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
      <button mat-flat-button class="rounded-xl! parents-cta" (click)="toggleForm()">
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
        <div
          class="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-1 px-1"
          role="tablist"
          aria-label="Sections du formulaire parent"
        >
          @for (group of groups; track group.title; let i = $index) {
            <button
              type="button"
              role="tab"
              class="shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors border"
              [attr.aria-selected]="formTab() === i"
              [class.tab-active]="formTab() === i"
              [class.tab-idle]="formTab() !== i"
              (click)="formTab.set(i)"
            >
              <span class="inline-flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">{{ group.icon }}</span>
                {{ group.title }}
              </span>
            </button>
          }
          <button
            type="button"
            role="tab"
            class="shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors border"
            [attr.aria-selected]="formTab() === authTab"
            [class.tab-active]="formTab() === authTab"
            [class.tab-idle]="formTab() !== authTab"
            (click)="formTab.set(authTab)"
          >
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">verified_user</span>
              Autorisations
            </span>
          </button>
        </div>

        @for (group of groups; track group.title; let i = $index) {
          @if (formTab() === i) {
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
                            [type]="
                              f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'
                            "
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
        }

        @if (formTab() === authTab) {
          <div class="flex flex-wrap gap-x-6 gap-y-3">
            @for (t of toggles; track t.key) {
              <mat-slide-toggle [formControlName]="t.key">{{ t.label }}</mat-slide-toggle>
            }
          </div>
        }

        <div class="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div class="flex gap-2">
            <button
              mat-stroked-button
              type="button"
              class="rounded-xl!"
              [disabled]="formTab() === 0"
              (click)="formTab.set(formTab() - 1)"
            >
              Précédent
            </button>
            @if (formTab() < authTab) {
              <button
                mat-stroked-button
                type="button"
                class="rounded-xl!"
                (click)="formTab.set(formTab() + 1)"
              >
                Suivant
              </button>
            }
          </div>
          <button
            mat-flat-button
            class="rounded-xl! parents-cta"
            type="submit"
            [disabled]="submitting()"
          >
            {{ submitting() ? 'Ajout…' : 'Ajouter le parent' }}
          </button>
        </div>
      </form>
    }

    <div class="panga-card p-4 mb-4 flex flex-wrap items-center gap-3">
      <mat-form-field
        appearance="outline"
        class="w-full sm:flex-1 sm:min-w-45"
        subscriptSizing="dynamic"
      >
        <mat-label>Rechercher</mat-label>
        <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
        <input matInput [formControl]="searchCtrl" placeholder="Nom, e-mail, téléphone…" />
      </mat-form-field>

      <div class="sm:hidden shrink-0">
        <button mat-stroked-button class="rounded-xl!" (click)="openFilters(filtersTpl)">
          <mat-icon fontSet="material-symbols-outlined">filter_list</mat-icon>
          Filtrer
        </button>
      </div>

      <div class="hidden sm:flex sm:flex-1 sm:flex-wrap items-center gap-3">
        <ng-container [ngTemplateOutlet]="filtersTpl" />
      </div>
    </div>

    <ng-template #filtersTpl>
      <mat-form-field
        appearance="outline"
        class="w-full sm:flex-1 sm:min-w-36"
        subscriptSizing="dynamic"
      >
        <mat-label>Statut</mat-label>
        <mat-select [value]="activeStatus()" (selectionChange)="filterByStatus($event.value)">
          <mat-option value="">Tous</mat-option>
          @for (o of statusOptions; track o.value) {
            <mat-option [value]="o.value">{{ o.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field
        appearance="outline"
        class="w-full sm:flex-1 sm:min-w-36"
        subscriptSizing="dynamic"
      >
        <mat-label>Lien</mat-label>
        <mat-select
          [value]="activeRelationship()"
          (selectionChange)="filterByRelationship($event.value)"
        >
          <mat-option value="">Tous</mat-option>
          @for (o of relationshipOptions; track o.value) {
            <mat-option [value]="o.value">{{ o.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </ng-template>

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (loadError()) {
      <div class="panga-card p-6">
        <panga-empty-state
          icon="error"
          title="Impossible de charger les parents"
          description="Vérifiez votre connexion puis réessayez."
          actionLabel="Réessayer"
          (action)="reload()"
        />
      </div>
    } @else if (filtered().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="family_restroom"
          title="Aucun parent"
          description="Ajoutez votre premier parent ou élargissez les filtres."
          actionLabel="Nouveau parent"
          (action)="openCreateForm()"
        />
      </div>
    } @else {
      <div class="grid gap-3 mb-2">
        @for (p of visibleParents(); track p.id) {
          <article class="parent-card panga-card p-4">
            <div class="flex gap-3 items-start">
              <a
                [routerLink]="['/', 'parents', p.id]"
                class="flex items-start gap-3 min-w-0 flex-1 no-underline"
              >
                <panga-avatar [name]="fullName(p)" [size]="48" class="shrink-0" />
                <div class="min-w-0 flex-1">
                  @if (p.relationship) {
                    <p
                      class="text-[11px] font-semibold uppercase tracking-wide truncate"
                      style="color: var(--brand-deep)"
                    >
                      {{ relationshipLabel(p.relationship) }}
                    </p>
                  }
                  <h3
                    class="text-sm font-semibold text-(--text) truncate"
                    [class.mt-0.5]="!!p.relationship"
                    style="font-family: Urbanist, sans-serif"
                  >
                    {{ fullName(p) || '—' }}
                  </h3>
                  <div
                    class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-(--text-muted)"
                  >
                    @if (p.email) {
                      <span class="inline-flex items-center gap-1 min-w-0">
                        <span class="material-symbols-outlined text-[14px] shrink-0">mail</span>
                        <span class="truncate">{{ p.email }}</span>
                      </span>
                    }
                    @if (p.phone) {
                      <span class="inline-flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">call</span>
                        {{ p.phone }}
                      </span>
                    }
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">school</span>
                      {{ p.childrenCount ?? 0 }} enfant(s)
                    </span>
                  </div>
                  <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
                    @if (p.isPrimary) {
                      <span class="chip chip--info">Principal</span>
                    }
                    @if (p.isEmergencyContact) {
                      <span class="chip chip--warning">Urgence</span>
                    }
                    @if (p.status) {
                      <span
                        class="chip"
                        [class.chip--success]="p.status === 'active'"
                        [class.chip--neutral]="p.status === 'inactive'"
                        [class.chip--danger]="p.status === 'deceased'"
                      >
                        @if (p.status === 'active') {
                          <span class="chip__dot"></span>
                        }
                        {{ statusLabel(p.status) }}
                      </span>
                    }
                  </div>
                </div>
              </a>
              <button
                mat-icon-button
                [matMenuTriggerFor]="menu"
                matTooltip="Changer le statut"
                aria-label="Changer le statut"
                class="parent-card__menu shrink-0"
              >
                <mat-icon fontSet="material-symbols-outlined">more_vert</mat-icon>
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
          </article>
        }
      </div>
      <div class="panga-card mt-3">
        <panga-paginator [meta]="pageMeta()" (pageChange)="page.set($event)" />
      </div>
    }
  `,
  styles: [
    `
      button.parents-cta {
        background: var(--brand-gradient) !important;
        color: #ffffff !important;
      }
      button.parents-cta .mat-icon,
      button.parents-cta .material-symbols-outlined {
        color: #ffffff !important;
      }
      button.parents-cta:disabled {
        opacity: 0.55;
      }
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
      .parent-card {
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }
      .parent-card:hover {
        border-color: color-mix(in srgb, var(--brand-500) 40%, var(--border));
        box-shadow: 0 12px 28px -18px color-mix(in srgb, var(--brand-700) 55%, transparent);
      }
      .parent-card__menu {
        color: var(--text-muted) !important;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.6875rem;
        font-weight: 600;
        line-height: 1.2;
        border: 1px solid transparent;
      }
      .chip__dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: currentColor;
      }
      .chip--info {
        color: #5ba3d4;
        background: color-mix(in srgb, #5ba3d4 14%, transparent);
        border-color: color-mix(in srgb, #5ba3d4 28%, transparent);
      }
      .chip--warning {
        color: var(--warning);
        background: color-mix(in srgb, var(--warning) 14%, transparent);
        border-color: color-mix(in srgb, var(--warning) 28%, transparent);
      }
      .chip--success {
        color: var(--success);
        background: color-mix(in srgb, var(--success) 14%, transparent);
        border-color: color-mix(in srgb, var(--success) 28%, transparent);
      }
      .chip--neutral {
        color: var(--text-muted);
        background: color-mix(in srgb, var(--text-muted) 12%, transparent);
        border-color: color-mix(in srgb, var(--text-muted) 22%, transparent);
      }
      .chip--danger {
        color: var(--danger);
        background: color-mix(in srgb, var(--danger) 14%, transparent);
        border-color: color-mix(in srgb, var(--danger) 28%, transparent);
      }
    `,
  ],
})
export class ParentsList {
  private readonly parentsApi = inject(ParentsService);
  private readonly notify = inject(NotificationService);
  private readonly bottomSheet = inject(MatBottomSheet);

  protected readonly groups = GROUPS;
  protected readonly toggles = TOGGLES;
  protected readonly authTab = AUTH_TAB;
  protected readonly statusOptions = PARENT_STATUS_OPTIONS;
  protected readonly relationshipOptions = RELATIONSHIP_OPTIONS;

  protected readonly parents = signal<Parent[]>([]);
  protected readonly page = signal(1);
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });
  protected readonly search = signal('');
  protected readonly activeStatus = signal('');
  protected readonly activeRelationship = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly submitting = signal(false);
  protected readonly importing = signal(false);
  protected readonly showForm = signal(false);
  protected readonly formTab = signal(0);
  /** Mot de passe temporaire renvoyé une seule fois à la création d'un compte. */
  protected readonly credential = signal<{ identifier: string; password: string } | null>(null);

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const status = this.activeStatus();
    const relationship = this.activeRelationship();
    return this.parents().filter((p) => {
      if (status && p.status !== status) {
        return false;
      }
      if (relationship && p.relationship !== relationship) {
        return false;
      }
      if (!q) {
        return true;
      }
      return `${this.fullName(p)} ${p.email ?? ''} ${p.phone ?? ''}`.toLowerCase().includes(q);
    });
  });
  protected readonly pageMeta = computed(() => clientMeta(this.filtered().length, this.page()));
  protected readonly visibleParents = computed(() => pageSlice(this.filtered(), this.page()));

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

  openFilters(template: TemplateRef<unknown>): void {
    this.bottomSheet.open(FilterSheetContent, { data: { title: 'Filtrer', template } });
  }

  filterByStatus(status: string): void {
    this.activeStatus.set(status);
    this.page.set(1);
  }

  filterByRelationship(relationship: string): void {
    this.activeRelationship.set(relationship);
    this.page.set(1);
  }

  protected toggleForm(): void {
    const next = !this.showForm();
    this.showForm.set(next);
    if (next) {
      this.formTab.set(0);
    }
  }

  protected openCreateForm(): void {
    this.showForm.set(true);
    this.formTab.set(0);
  }

  protected reload(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.parentsApi.list().subscribe({
      next: (res) => {
        this.parents.set(res.items);
        this.page.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
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
      // Remonte vers le premier onglet avec erreur.
      for (let i = 0; i < GROUPS.length; i++) {
        const keys = GROUPS[i].fields.map((f) => f.key);
        if (keys.some((k) => this.form.get(k)?.invalid)) {
          this.formTab.set(i);
          break;
        }
      }
      return;
    }
    const raw = this.form.getRawValue() as Record<string, unknown>;
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
        this.formTab.set(0);
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
