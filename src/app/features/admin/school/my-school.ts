import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SchoolService } from '../services/school.service';
import type { PlatformSchool, SchoolAuthority } from '../../super-admin/models/platform.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { KeyValue } from '../../../shared/ui/key-value';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

@Component({
  selector: 'panga-my-school',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    Avatar,
    KeyValue,
    SectionHeader,
    StatusBadge,
  ],
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

      @if (subscription()) {
        <div class="panga-card p-5 mt-4">
          <panga-section-header icon="workspace_premium" title="Abonnement SaaS" />
          <panga-key-value [data]="subscription()" />
        </div>
      }

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
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly school = signal<PlatformSchool | null>(null);
  protected readonly authorities = signal<SchoolAuthority[]>([]);
  protected readonly subscription = signal<Record<string, unknown> | null>(null);
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
    roleCode: ['secondary_prefect', Validators.required],
    educationLevel: ['secondary', Validators.required],
  });

  constructor() {
    this.schoolApi.mySchool().subscribe({
      next: (s) => {
        this.school.set(s);
        this.editForm.patchValue({
          displayName: (s.displayName as string) || s.name || '',
          phone: s.phone || '',
        });
        this.loading.set(false);
        this.loadAuthorities();
      },
      error: () => this.loading.set(false),
    });
    this.schoolApi.subscription().subscribe({ next: (s) => this.subscription.set(s) });
  }

  private schoolId(): string {
    return this.school()?.id ?? '';
  }

  private loadAuthorities(): void {
    this.schoolApi.authorities(this.schoolId()).subscribe({
      next: (r) => this.authorities.set(r.items),
    });
  }

  update(): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.schoolApi.update(this.schoolId(), this.editForm.getRawValue()).subscribe({
      next: (s) => {
        this.saving.set(false);
        this.school.set(s);
        this.notify.success('Établissement mis à jour.');
      },
      error: () => this.saving.set(false),
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
