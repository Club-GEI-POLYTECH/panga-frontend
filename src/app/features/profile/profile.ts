import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import type { LoginHistoryEntry } from '../../core/models/auth.models';
import { NotificationService } from '../../shared/ui/notification.service';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { StatusBadge } from '../../shared/ui/status-badge';
import { SkeletonTable } from '../../shared/skeleton/skeleton-table';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pwd = group.get('newPassword')?.value;
  const confirm = group.get('confirm')?.value;
  return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'panga-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TranslocoModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    Avatar,
    EmptyState,
    StatusBadge,
    SkeletonTable,
  ],
  providers: [DatePipe],
  templateUrl: './profile.html',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly transloco = inject(TranslocoService);
  private readonly datePipe = inject(DatePipe);
  protected readonly store = inject(AuthStore);

  protected readonly submitting = signal(false);
  protected readonly history = signal<LoginHistoryEntry[]>([]);
  protected readonly loadingHistory = signal(true);

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    // Rafraîchit le profil complet (auth/profile) → champs riches dans le store.
    this.auth.loadMe().subscribe({ error: () => undefined });
    this.auth.loginHistory().subscribe({
      next: (entries) => {
        this.history.set(entries);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false),
    });
  }

  /** Lignes d'informations personnelles (uniquement les champs renseignés). */
  protected infoRows(): { label: string; value: string }[] {
    const u = this.store.user();
    if (!u) {
      return [];
    }
    const t = (k: string) => this.transloco.translate(`profile.${k}`);
    const date = (v?: string | null) =>
      v ? (this.datePipe.transform(v, 'dd/MM/yyyy HH:mm') ?? v) : '';
    const loc = [u.address, u.city, u.country].filter(Boolean).join(', ');

    return [
      { label: t('email'), value: u.email ?? '' },
      { label: t('phone'), value: u.phone ?? '' },
      { label: t('address'), value: loc },
      { label: t('nationality'), value: u.nationality ?? '' },
      { label: t('memberSince'), value: date(u.createdAt) },
      { label: t('lastLogin'), value: date(u.lastLoginAt) },
    ].filter((r) => r.value !== '');
  }

  changePassword(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Mot de passe mis à jour.');
        this.form.reset();
      },
      error: () => this.submitting.set(false),
    });
  }
}
