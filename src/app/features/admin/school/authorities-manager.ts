import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime } from 'rxjs';
import { SchoolService } from '../services/school.service';
import { TeachersService } from '../services/teachers.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthStore } from '../../../core/auth/auth.store';
import type { Teacher } from '../models/admin.models';
import type { CreateAuthorityDto, SchoolAuthority } from '../../super-admin/models/platform.models';
import {
  AUTHORITY_EDU_LEVEL_OPTIONS,
  AUTHORITY_ROLE_OPTIONS,
  authorityRolesForLevel,
} from '../../../core/models/school.enums';
import { personLabel } from '../shared/labels';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { DateField } from '../../../shared/ui/date-field';
import { EmptyState } from '../../../shared/ui/empty-state';
import { SectionHeader } from '../../../shared/ui/section-header';

/**
 * Gestion des autorités d'une école (préfet, directeur…) — liste + formulaire de
 * nomination avec sélecteur d'enseignant et effet « double rôle ». Réutilisé par
 * « Mon établissement » (admin) et le détail d'école (super_admin) ; le `schoolId`
 * du contexte est passé en entrée.
 */
@Component({
  selector: 'panga-authorities-manager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    Avatar,
    DateField,
    EmptyState,
    SectionHeader,
  ],
  template: `
    <section class="panga-card p-5">
      <panga-section-header icon="shield_person" title="Autorités" [count]="authorities().length" />
      <p class="text-xs text-(--text-muted) -mt-2 mb-4 leading-relaxed">
        Nominations officielles (préfet, directeur…) et droits d'administration. Les simples
        coordonnées de contact se renseignent dans « Direction & contacts ».
      </p>

      @if (authorities().length) {
        <div class="grid gap-3 sm:grid-cols-2 mb-6">
          @for (a of authorities(); track a.id) {
            <article
              class="authority-card relative overflow-hidden rounded-2xl p-4"
              [class.authority-card--inactive]="a.isActive === false"
            >
              <div class="relative flex gap-3">
                <panga-avatar
                  [name]="a.displayName || roleLabel(a.roleCode) || '?'"
                  [size]="48"
                  class="shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p
                        class="text-[11px] font-semibold uppercase tracking-wide truncate"
                        style="color: var(--brand-deep)"
                      >
                        {{ roleLabel(a.roleCode) || 'Autorité' }}
                      </p>
                      <h3
                        class="text-sm font-semibold text-(--text) truncate mt-0.5"
                        style="font-family: Urbanist, sans-serif"
                      >
                        {{ a.displayName || '—' }}
                      </h3>
                    </div>
                    <button
                      mat-icon-button
                      type="button"
                      class="authority-card__delete shrink-0!"
                      matTooltip="Retirer cette autorité"
                      [disabled]="deletingId() === a.id"
                      (click)="removeAuthority(a)"
                    >
                      <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
                    </button>
                  </div>

                  @if (a.email) {
                    <p class="mt-1.5 flex items-center gap-1.5 text-xs text-(--text-muted) min-w-0">
                      <span class="material-symbols-outlined text-[14px] shrink-0 opacity-70"
                        >mail</span
                      >
                      <span class="truncate">{{ a.email }}</span>
                    </p>
                  }

                  <div class="mt-3 flex flex-wrap items-center gap-1.5">
                    @if (a.educationLevel) {
                      <span class="chip chip--info">
                        <span class="material-symbols-outlined text-[13px]">school</span>
                        {{ levelLabel(a.educationLevel) }}
                      </span>
                    }
                    @if (a.teacherId) {
                      <span class="chip chip--warning">
                        <span class="material-symbols-outlined text-[13px]"
                          >admin_panel_settings</span
                        >
                        Accès admin
                      </span>
                    }
                    @if (a.isActive === false) {
                      <span class="chip chip--neutral">Inactive</span>
                    } @else {
                      <span class="chip chip--success">
                        <span class="chip__dot"></span>
                        Active
                      </span>
                    }
                  </div>

                  @if (a.activeFrom || a.activeTo) {
                    <p class="mt-2.5 flex items-center gap-1.5 text-[11px] text-(--text-muted)">
                      <span class="material-symbols-outlined text-[13px] shrink-0">event</span>
                      <span>
                        @if (a.activeFrom) {
                          {{ a.activeFrom | date: 'dd/MM/yyyy' }}
                        } @else {
                          …
                        }
                        →
                        @if (a.activeTo) {
                          {{ a.activeTo | date: 'dd/MM/yyyy' }}
                        } @else {
                          en cours
                        }
                      </span>
                    </p>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      } @else {
        <panga-empty-state
          [compact]="true"
          icon="shield_person"
          title="Aucune autorité"
          description="Nommez un préfet ou un directeur ci-dessous pour lui attribuer un mandat officiel."
        />
      }

      <div class="rounded-2xl bg-[color-mix(in_srgb,var(--brand-500)_5%,transparent)] p-4">
        <p class="text-sm font-medium text-(--text) mb-3">Nommer une autorité</p>
        <form [formGroup]="authForm" (ngSubmit)="addAuthority()" class="grid gap-3 sm:grid-cols-2">
          <mat-form-field appearance="outline">
            <mat-label>Niveau</mat-label>
            <mat-select formControlName="educationLevel">
              @for (o of authorityLevels; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fonction</mat-label>
            <mat-select formControlName="roleCode">
              @for (o of filteredRoles(); track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="sm:col-span-2">
            <mat-label>Enseignant</mat-label>
            <mat-select formControlName="teacherId">
              <mat-option [value]="''">— (autorité non-enseignante)</mat-option>
              @for (t of teachers(); track t.id) {
                <mat-option [value]="t.id">{{ teacherLabel(t) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="sm:col-span-2">
            <mat-label>Rechercher un enseignant</mat-label>
            <input matInput [formControl]="teacherSearch" placeholder="Nom, matricule…" />
          </mat-form-field>

          @if (authForm.controls.teacherId.value) {
            <p class="sm:col-span-2 -mt-1 text-xs text-(--text-muted)">
              Identité auto-remplie depuis l'enseignant. Renseignez les champs ci-dessous uniquement
              pour la surcharger.
            </p>
          }
          <mat-form-field appearance="outline">
            <mat-label>Nom affiché (optionnel)</mat-label>
            <input matInput formControlName="displayName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>E-mail (optionnel)</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>

          <panga-date-field label="Début de mandat" formControlName="activeFrom" />
          <panga-date-field label="Fin de mandat" formControlName="activeTo" />

          <div class="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap">
            <mat-slide-toggle formControlName="isActive">Autorité active</mat-slide-toggle>
            <button
              mat-flat-button
              class="rounded-xl! authority-cta"
              type="submit"
              [disabled]="addingAuthority()"
            >
              {{ addingAuthority() ? '…' : 'Nommer' }}
            </button>
          </div>

          @if (authForm.controls.isActive.value && authForm.controls.teacherId.value) {
            <div
              class="sm:col-span-2 flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
              style="
                background: color-mix(in srgb, var(--warning) 12%, transparent);
                color: var(--text);
              "
            >
              <mat-icon
                fontSet="material-symbols-outlined"
                class="text-base! shrink-0"
                style="color: var(--warning)"
                >info</mat-icon
              >
              <span>
                Cet enseignant obtiendra les <strong>droits d'administration</strong> de
                l'établissement (en plus de son rôle enseignant), tant que cette autorité reste
                active.
              </span>
            </div>
          }
        </form>
      </div>
    </section>
  `,
  styles: [
    `
      .authority-card {
        border: 1px solid var(--border);
        background: color-mix(in srgb, var(--brand-500) 6%, var(--surface));
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease,
          transform 0.15s ease;
      }
      .authority-card:hover {
        border-color: color-mix(in srgb, var(--brand-500) 40%, var(--border));
        box-shadow: 0 12px 28px -18px color-mix(in srgb, var(--brand-700) 55%, transparent);
      }
      .authority-card--inactive {
        opacity: 0.72;
        background: color-mix(in srgb, var(--text-muted) 6%, var(--surface));
      }
      .authority-card__delete {
        width: 36px !important;
        height: 36px !important;
        color: var(--text-muted) !important;
      }
      .authority-card__delete:hover:not(:disabled) {
        color: var(--danger) !important;
        background: color-mix(in srgb, var(--danger) 12%, transparent) !important;
      }
      .authority-card__delete .mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
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

      button.authority-cta {
        background: var(--brand-gradient) !important;
        color: #ffffff !important;
      }
      button.authority-cta .mat-icon,
      button.authority-cta .material-symbols-outlined {
        color: #ffffff !important;
      }
      button.authority-cta:disabled {
        opacity: 0.55;
      }
    `,
  ],
})
export class AuthoritiesManager implements OnInit {
  /** École ciblée (école de l'admin, ou n'importe laquelle pour le super_admin). */
  readonly schoolId = input.required<string>();

  private readonly schoolApi = inject(SchoolService);
  private readonly teachersApi = inject(TeachersService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(AuthStore);
  private readonly notify = inject(NotificationService);

  protected readonly authorityLevels = AUTHORITY_EDU_LEVEL_OPTIONS;
  protected readonly authorities = signal<SchoolAuthority[]>([]);
  protected readonly teachers = signal<Teacher[]>([]);
  protected readonly addingAuthority = signal(false);
  protected readonly deletingId = signal<string | null>(null);
  private readonly eduLevel = signal('secondary');

  protected readonly teacherSearch = new FormControl('', { nonNullable: true });

  protected readonly authForm = new FormGroup({
    educationLevel: new FormControl('secondary', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    roleCode: new FormControl('secondary_prefect', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    teacherId: new FormControl('', { nonNullable: true }),
    displayName: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    activeFrom: new FormControl('', { nonNullable: true }),
    activeTo: new FormControl('', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  protected readonly filteredRoles = computed(() => authorityRolesForLevel(this.eduLevel()));

  ngOnInit(): void {
    this.loadAuthorities();
    this.loadTeachers('');
    this.teacherSearch.valueChanges.pipe(debounceTime(300)).subscribe((q) => this.loadTeachers(q));
    this.authForm.controls.educationLevel.valueChanges.subscribe((lvl) => {
      this.eduLevel.set(lvl);
      const roles = this.filteredRoles();
      if (!roles.some((r) => r.value === this.authForm.controls.roleCode.value)) {
        this.authForm.controls.roleCode.setValue(roles[0]?.value ?? '');
      }
    });
  }

  private loadAuthorities(): void {
    this.schoolApi.authorities(this.schoolId()).subscribe({
      next: (r) => this.authorities.set(r.items),
    });
  }

  private loadTeachers(search: string): void {
    this.teachersApi
      .list({ page: 1, limit: 100, search: search || undefined })
      .subscribe({ next: (r) => this.teachers.set(r.items) });
  }

  protected teacherLabel(t: Teacher): string {
    const base = personLabel((t.user ?? t) as Record<string, unknown>);
    return t.employeeNumber ? `${base} · ${t.employeeNumber}` : base;
  }
  protected roleLabel(code: string | undefined): string {
    return AUTHORITY_ROLE_OPTIONS.find((o) => o.value === code)?.label ?? code ?? '';
  }
  protected levelLabel(code: string | undefined): string {
    return AUTHORITY_EDU_LEVEL_OPTIONS.find((o) => o.value === code)?.label ?? code ?? '';
  }

  addAuthority(): void {
    const v = this.authForm.getRawValue();
    if (this.authForm.invalid || this.addingAuthority()) {
      this.authForm.markAllAsTouched();
      return;
    }
    if (!v.teacherId && !v.displayName.trim()) {
      this.notify.warning('Sélectionnez un enseignant ou saisissez un nom affiché.');
      return;
    }
    const dto: CreateAuthorityDto = {
      educationLevel: v.educationLevel,
      roleCode: v.roleCode,
      isActive: v.isActive,
    };
    if (v.teacherId) dto.teacherId = v.teacherId;
    if (v.displayName.trim()) dto.displayName = v.displayName.trim();
    if (v.email.trim()) dto.email = v.email.trim();
    if (v.activeFrom) dto.activeFrom = v.activeFrom;
    if (v.activeTo) dto.activeTo = v.activeTo;

    // Si l'enseignant nommé est l'utilisateur connecté, rafraîchir ses permissions.
    const namedTeacher = this.teachers().find((t) => t.id === v.teacherId);
    const namedUserId = (namedTeacher?.user as Record<string, unknown> | undefined)?.['id'];
    const isSelf = v.isActive && !!namedUserId && namedUserId === this.store.user()?.id;

    this.addingAuthority.set(true);
    this.schoolApi.createAuthority(this.schoolId(), dto).subscribe({
      next: () => {
        this.addingAuthority.set(false);
        this.notify.success('Autorité nommée.');
        this.authForm.reset({
          educationLevel: 'secondary',
          roleCode: 'secondary_prefect',
          isActive: true,
        });
        this.teacherSearch.reset('');
        if (isSelf) {
          this.auth.loadPermissions().subscribe({ error: () => undefined });
        }
        this.loadAuthorities();
      },
      error: () => this.addingAuthority.set(false),
    });
  }

  removeAuthority(a: SchoolAuthority): void {
    if (this.deletingId()) {
      return;
    }
    const name = a.displayName || this.roleLabel(a.roleCode);
    if (
      !confirm(
        `Retirer « ${name} » ? Ses droits admin seront retirés s'il ne lui reste aucune autre autorité active.`,
      )
    ) {
      return;
    }
    this.deletingId.set(a.id);
    this.schoolApi.deleteAuthority(this.schoolId(), a.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.notify.success('Autorité retirée.');
        this.loadAuthorities();
      },
      error: () => this.deletingId.set(null),
    });
  }
}
