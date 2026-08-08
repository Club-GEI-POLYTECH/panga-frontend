import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SchoolService } from '../services/school.service';
import type { PlatformSchool } from '../../super-admin/models/platform.models';
import {
  SCHOOL_READONLY_GROUPS,
  buildSchoolFormGroup,
  patchSchoolForm,
  schoolUpdatePayload,
} from '../../../core/models/school-fields';
import { AuthStore } from '../../../core/auth/auth.store';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { SchoolFieldsForm } from '../../../shared/ui/school-fields-form';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { AuthoritiesManager } from './authorities-manager';

@Component({
  selector: 'panga-my-school',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    Avatar,
    SchoolFieldsForm,
    SectionHeader,
    StatusBadge,
    AuthoritiesManager,
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
        <div class="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <panga-avatar [name]="school()?.name || '?'" [size]="64" class="shrink-0" />
            <div class="min-w-0 flex-1">
              <h1 class="text-2xl font-semibold truncate" style="font-family: Urbanist, sans-serif">
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
          @if (asString(roVal('status'))) {
            <panga-status-badge
              [label]="asString(roVal('status'))"
              [tone]="school()?.isActive ? 'success' : 'neutral'"
              class="self-start sm:self-center sm:ml-auto"
            />
          }
        </div>
      </div>

      <!-- Formulaire (éditable pour l'admin, désactivé/lecture seule sinon) -->
      <panga-school-fields [form]="form" />

      @if (canEdit()) {
        <div class="sticky bottom-4 z-10 flex justify-end mb-6">
          <button
            mat-flat-button
            class="rounded-xl! shadow-lg"
            (click)="save()"
            [disabled]="saving() || form.pristine"
          >
            <mat-icon fontSet="material-symbols-outlined">save</mat-icon>
            {{ saving() ? 'Enregistrement…' : 'Enregistrer les modifications' }}
          </button>
        </div>
      } @else {
        <p class="mb-6 text-xs text-(--text-muted)">
          Consultation seule — modification réservée à l'administration.
        </p>
      }

      <!-- Lecture seule -->
      <section class="grid gap-4 grid-cols-1 lg:grid-cols-2 mb-4">
        @for (group of readonly; track group.title) {
          <div class="panga-card p-5">
            <panga-section-header [icon]="group.icon" [title]="group.title" />
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              @for (f of group.fields; track f.key) {
                <div class="flex justify-between gap-3 py-1.5 border-b border-(--border)">
                  <dt class="text-sm text-(--text-muted)">{{ f.label }}</dt>
                  <dd class="text-sm font-medium text-(--text) text-right break-all">
                    {{ displayRo(f.key) }}
                  </dd>
                </div>
              }
            </dl>
          </div>
        }
      </section>

      <!-- Autorités (préfet, directeur…) — édition réservée à l'administration. -->
      @if (canEdit()) {
        <panga-authorities-manager [schoolId]="schoolId()" />
      }
    }
  `,
})
export class MySchool {
  private readonly schoolApi = inject(SchoolService);
  private readonly notify = inject(NotificationService);
  private readonly datePipe = inject(DatePipe);
  private readonly auth = inject(AuthStore);

  /** Édition réservée à qui possède `schools.update` (admin) ; sinon lecture seule. */
  protected readonly canEdit = computed(() => this.auth.can('schools.update'));

  protected readonly readonly = SCHOOL_READONLY_GROUPS;

  protected readonly school = signal<PlatformSchool | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly form = buildSchoolFormGroup();

  constructor() {
    this.schoolApi.mySchool().subscribe({
      next: (s) => {
        this.school.set(s);
        patchSchoolForm(this.form, s as Record<string, unknown>);
        // Lecture seule pour les rôles sans `schools.update` (ex. enseignant).
        if (!this.canEdit()) {
          this.form.disable({ emitEvent: false });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected schoolId(): string {
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
    this.schoolApi.update(this.schoolId(), schoolUpdatePayload(this.form)).subscribe({
      next: (s) => {
        this.saving.set(false);
        this.school.set(s);
        patchSchoolForm(this.form, s as Record<string, unknown>);
        this.notify.success('Établissement mis à jour.');
      },
      error: () => this.saving.set(false),
    });
  }
}
