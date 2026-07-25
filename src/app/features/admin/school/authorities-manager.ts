import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
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
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

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
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <section class="panga-card p-5">
      <panga-section-header icon="shield_person" title="Autorités" [count]="authorities().length" />

      @if (authorities().length) {
        <div class="grid gap-3 sm:grid-cols-2 mb-6">
          @for (a of authorities(); track a.id) {
            <div class="flex items-center gap-3 rounded-2xl border border-(--border) p-3">
              <panga-avatar [name]="a.displayName || roleLabel(a.roleCode) || '?'" [size]="40" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-(--text) truncate">
                  {{ a.displayName || roleLabel(a.roleCode) }}
                </p>
                <p class="text-xs text-(--text-muted) truncate">{{ a.email }}</p>
                <div class="mt-1 flex flex-wrap gap-1.5">
                  @if (a.roleCode) {
                    <panga-status-badge
                      [label]="roleLabel(a.roleCode)"
                      tone="brand"
                      [dot]="false"
                    />
                  }
                  @if (a.educationLevel) {
                    <panga-status-badge
                      [label]="levelLabel(a.educationLevel)"
                      tone="info"
                      [dot]="false"
                    />
                  }
                  @if (a.teacherId) {
                    <panga-status-badge label="Accès administrateur" tone="warning" [dot]="false" />
                  }
                  @if (a.isActive === false) {
                    <panga-status-badge label="Inactive" tone="neutral" [dot]="false" />
                  }
                </div>
              </div>
              <button
                mat-icon-button
                type="button"
                matTooltip="Retirer cette autorité"
                [disabled]="deletingId() === a.id"
                (click)="removeAuthority(a)"
              >
                <mat-icon fontSet="material-symbols-outlined" style="color: var(--danger)"
                  >delete</mat-icon
                >
              </button>
            </div>
          }
        </div>
      } @else {
        <p class="text-sm text-(--text-muted) mb-6">Aucune autorité enregistrée.</p>
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
              class="rounded-xl!"
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
