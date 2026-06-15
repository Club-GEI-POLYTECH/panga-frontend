import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { SchoolsService } from '../services/schools.service';
import type { PlatformSchool, SchoolAuthority } from '../models/platform.models';
import {
  AUTHORITY_EDU_LEVEL_OPTIONS,
  AUTHORITY_ROLE_OPTIONS,
} from '../../../core/models/school.enums';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { KeyValue } from '../../../shared/ui/key-value';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

/** Détail d'une école : infos, mise à jour, autorités (super_admin). */
@Component({
  selector: 'panga-school-detail',
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
    Avatar,
    KeyValue,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <a
      [routerLink]="['/', 'platform', 'schools']"
      class="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--brand-700)] mb-4"
    >
      <mat-icon fontSet="material-symbols-outlined" class="!text-base !w-4 !h-4"
        >arrow_back</mat-icon
      >
      Écoles
    </a>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <!-- En-tête établissement -->
      <div
        class="relative overflow-hidden rounded-3xl p-6 mb-5 text-white"
        style="background: var(--brand-gradient)"
      >
        <div
          class="absolute -right-8 -bottom-10 h-40 w-40 rounded-full opacity-15"
          style="background:#fff"
        ></div>
        <div class="relative flex flex-wrap items-center gap-4">
          <panga-avatar [name]="school()?.name || school()?.code || '?'" [size]="64" />
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-semibold truncate" style="font-family: Poppins, sans-serif">
              {{ school()?.displayName || school()?.name || 'École' }}
            </h1>
            <p class="text-sm opacity-90">
              {{ school()?.code }}
              @if (school()?.city) {
                · {{ school()?.city }}
              }
            </p>
          </div>
          <button mat-flat-button class="!rounded-xl !bg-white/15 !text-white" (click)="remove()">
            <mat-icon fontSet="material-symbols-outlined">delete</mat-icon> Supprimer
          </button>
        </div>
      </div>

      <section class="grid gap-4 lg:grid-cols-2">
        <div class="panga-card p-5">
          <panga-section-header icon="info" title="Informations" />
          <panga-key-value [data]="school()" />
        </div>

        <div class="panga-card p-5">
          <panga-section-header icon="edit" title="Mettre à jour" />
          <form [formGroup]="editForm" (ngSubmit)="update()" class="grid gap-3">
            <mat-form-field appearance="outline">
              <mat-label>Nom affiché</mat-label>
              <input matInput formControlName="displayName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Téléphone</mat-label>
              <input matInput formControlName="phone" />
            </mat-form-field>
            <div class="flex justify-end">
              <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="saving()">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </section>

      <section class="panga-card p-5 mt-4">
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
                <button mat-icon-button (click)="removeAuthority(a.id)" aria-label="Supprimer">
                  <mat-icon fontSet="material-symbols-outlined" class="text-[var(--danger)]">
                    delete
                  </mat-icon>
                </button>
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
              <mat-label>Rôle</mat-label>
              <mat-select formControlName="roleCode">
                @for (o of authorityRoles; track o.value) {
                  <mat-option [value]="o.value">{{ o.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Niveau</mat-label>
              <mat-select formControlName="educationLevel">
                @for (o of authorityLevels; track o.value) {
                  <mat-option [value]="o.value">{{ o.label }}</mat-option>
                }
              </mat-select>
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
export class SchoolDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly schoolsApi = inject(SchoolsService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly authorityRoles = AUTHORITY_ROLE_OPTIONS;
  protected readonly authorityLevels = AUTHORITY_EDU_LEVEL_OPTIONS;

  protected readonly school = signal<PlatformSchool | null>(null);
  protected readonly authorities = signal<SchoolAuthority[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly addingAuthority = signal(false);

  protected readonly editForm = this.fb.nonNullable.group({
    displayName: [''],
    phone: [''],
  });

  protected readonly authForm = this.fb.nonNullable.group({
    displayName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    roleCode: ['principal', Validators.required],
    educationLevel: ['all', Validators.required],
  });

  constructor() {
    this.load();
    this.loadAuthorities();
  }

  private load(): void {
    this.schoolsApi.get(this.id).subscribe({
      next: (s) => {
        this.school.set(s);
        this.editForm.patchValue({
          displayName: (s.displayName as string) || s.name || '',
          phone: s.phone || '',
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadAuthorities(): void {
    this.schoolsApi.authorities(this.id).subscribe({
      next: (res) => this.authorities.set(res.items),
    });
  }

  update(): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.schoolsApi.update(this.id, this.editForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('École mise à jour.');
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(): void {
    this.schoolsApi.remove(this.id).subscribe({
      next: () => {
        this.notify.success('École supprimée.');
        void this.router.navigate(['/', 'platform', 'schools']);
      },
    });
  }

  addAuthority(): void {
    if (this.authForm.invalid || this.addingAuthority()) {
      this.authForm.markAllAsTouched();
      return;
    }
    this.addingAuthority.set(true);
    this.schoolsApi.createAuthority(this.id, this.authForm.getRawValue()).subscribe({
      next: () => {
        this.addingAuthority.set(false);
        this.notify.success('Autorité ajoutée.');
        this.authForm.reset({ roleCode: 'principal', educationLevel: 'all' });
        this.loadAuthorities();
      },
      error: () => this.addingAuthority.set(false),
    });
  }

  removeAuthority(authorityId: string): void {
    this.schoolsApi.removeAuthority(this.id, authorityId).subscribe({
      next: () => {
        this.notify.success('Autorité supprimée.');
        this.loadAuthorities();
      },
    });
  }
}
