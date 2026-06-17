import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SchoolYearStore, isValidSchoolYear } from '../../../core/school-year/school-year.store';
import { NotificationService } from '../../../shared/ui/notification.service';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

/** Validateur format AAAA-AAAA (années consécutives). */
function schoolYearValidator(c: { value: string }) {
  return !c.value || isValidSchoolYear(c.value) ? null : { schoolYear: true };
}

@Component({
  selector: 'panga-school-year-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="settings"
      title="Année scolaire"
      subtitle="Réglage de l'établissement"
    />

    @if (sy.needsSetup()) {
      <div
        class="rounded-2xl border p-4 mb-6 flex items-start gap-3"
        style="border-color: var(--warning); background: color-mix(in srgb, var(--warning) 10%, transparent)"
      >
        <mat-icon fontSet="material-symbols-outlined" style="color: var(--warning)">info</mat-icon>
        <div>
          <p class="text-sm font-medium text-[var(--text)]">Année scolaire non configurée</p>
          <p class="text-xs text-[var(--text-muted)]">
            L'année <b>{{ sy.current() }}</b> est actuellement <b>déduite</b> de la date.
            Définissez-la ci-dessous pour figer le comportement de l'application.
          </p>
        </div>
      </div>
    }

    <section class="panga-card p-5 mb-6">
      <panga-section-header icon="event" title="Année courante">
        <panga-status-badge
          [label]="sy.source() === 'settings' ? 'Configurée' : 'Déduite'"
          [tone]="sy.source() === 'settings' ? 'success' : 'warning'"
          [dot]="false"
        />
      </panga-section-header>
      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <p class="text-xs text-[var(--text-muted)]">Année en cours</p>
          <p class="text-lg font-semibold text-[var(--text)]">{{ sy.current() }}</p>
        </div>
        <div>
          <p class="text-xs text-[var(--text-muted)]">Année suivante</p>
          <p class="text-lg font-semibold text-[var(--text)]">{{ sy.next() || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-[var(--text-muted)]">Période</p>
          <p class="text-sm text-[var(--text)]">
            {{ sy.startDate() || '—' }} → {{ sy.endDate() || '—' }}
          </p>
        </div>
      </div>
    </section>

    <form [formGroup]="form" (ngSubmit)="save()" class="panga-card p-6">
      <panga-section-header icon="edit_calendar" title="Modifier l'année scolaire" />
      <div class="grid gap-4 sm:grid-cols-2">
        <mat-form-field appearance="outline">
          <mat-label>Année courante</mat-label>
          <input matInput formControlName="currentSchoolYear" placeholder="2025-2026" />
          @if (form.controls.currentSchoolYear.hasError('schoolYear')) {
            <mat-error>Format attendu : AAAA-AAAA (années consécutives)</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Année suivante (optionnel)</mat-label>
          <input matInput formControlName="nextSchoolYear" placeholder="2026-2027" />
          @if (form.controls.nextSchoolYear.hasError('schoolYear')) {
            <mat-error>Format attendu : AAAA-AAAA</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date de début (optionnel)</mat-label>
          <input matInput type="date" formControlName="schoolYearStartDate" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date de fin (optionnel)</mat-label>
          <input matInput type="date" formControlName="schoolYearEndDate" />
        </mat-form-field>
      </div>
      <div class="flex justify-end mt-2">
        <button
          mat-flat-button
          class="!rounded-xl"
          type="submit"
          [disabled]="form.invalid || saving()"
        >
          <mat-icon fontSet="material-symbols-outlined">save</mat-icon> Enregistrer
        </button>
      </div>
      <p class="text-xs text-[var(--text-muted)] mt-3">
        Renseigner l'<b>année suivante</b> prépare la fin d'année (cohérent avec le module
        Promotions).
      </p>
    </form>
  `,
})
export class SchoolYearSettings {
  protected readonly sy = inject(SchoolYearStore);
  private readonly notify = inject(NotificationService);

  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    currentSchoolYear: new FormControl(this.sy.current(), {
      nonNullable: true,
      validators: [Validators.required, schoolYearValidator],
    }),
    nextSchoolYear: new FormControl(this.sy.next(), {
      nonNullable: true,
      validators: [schoolYearValidator],
    }),
    schoolYearStartDate: new FormControl(this.sy.startDate(), { nonNullable: true }),
    schoolYearEndDate: new FormControl(this.sy.endDate(), { nonNullable: true }),
  });

  constructor() {
    this.sy.load();
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.sy
      .update({
        currentSchoolYear: v.currentSchoolYear,
        ...(v.nextSchoolYear ? { nextSchoolYear: v.nextSchoolYear } : {}),
        ...(v.schoolYearStartDate ? { schoolYearStartDate: v.schoolYearStartDate } : {}),
        ...(v.schoolYearEndDate ? { schoolYearEndDate: v.schoolYearEndDate } : {}),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notify.success('Année scolaire enregistrée.');
        },
        error: () => this.saving.set(false),
      });
  }
}
