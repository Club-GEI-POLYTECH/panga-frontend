import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { AvatarService } from '../../core/auth/avatar.service';
import type { LoginHistoryEntry } from '../../core/models/auth.models';
import type { SchoolFieldGroup } from '../../core/models/school-fields';
import { NotificationService } from '../../shared/ui/notification.service';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { SchoolFieldsForm } from '../../shared/ui/school-fields-form';
import { StatusBadge } from '../../shared/ui/status-badge';
import { SkeletonTable } from '../../shared/skeleton/skeleton-table';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pwd = group.get('newPassword')?.value;
  const confirm = group.get('confirm')?.value;
  return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
}

/** Sections éditables du profil (mêmes champs que PUT /users/me). */
const PROFILE_GROUPS: SchoolFieldGroup[] = [
  {
    title: 'Identité',
    icon: 'badge',
    fields: [
      { key: 'firstName', label: 'Prénom' },
      { key: 'lastName', label: 'Nom' },
      { key: 'postnom', label: 'Post-nom' },
      {
        key: 'gender',
        label: 'Genre',
        type: 'select',
        options: [
          { value: 'M', label: 'Masculin' },
          { value: 'F', label: 'Féminin' },
        ],
      },
      { key: 'dateOfBirth', label: 'Date de naissance (AAAA-MM-JJ)' },
      { key: 'placeOfBirth', label: 'Lieu de naissance' },
      { key: 'nationality', label: 'Nationalité' },
      { key: 'maritalStatus', label: 'État civil' },
    ],
  },
  {
    title: 'Coordonnées',
    icon: 'contact_mail',
    fields: [
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'phone', label: 'Téléphone', type: 'tel' },
      { key: 'secondaryPhone', label: 'Téléphone secondaire', type: 'tel' },
      { key: 'address', label: 'Adresse', wide: true },
      { key: 'city', label: 'Ville' },
      { key: 'province', label: 'Province' },
      { key: 'postalCode', label: 'Code postal' },
      { key: 'country', label: 'Pays' },
    ],
  },
  {
    title: 'Préférences',
    icon: 'tune',
    fields: [
      {
        key: 'preferredLanguage',
        label: 'Langue',
        type: 'select',
        options: [
          { value: 'fr', label: 'Français' },
          { value: 'en', label: 'English' },
        ],
      },
      { key: 'timezone', label: 'Fuseau horaire' },
    ],
  },
  {
    title: "Contact d'urgence",
    icon: 'emergency',
    fields: [
      { key: 'emergencyContactName', label: 'Nom' },
      { key: 'emergencyContactPhone', label: 'Téléphone', type: 'tel' },
      { key: 'emergencyContactRelation', label: 'Lien' },
    ],
  },
];

const PROFILE_KEYS = PROFILE_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

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
    MatTooltipModule,
    Avatar,
    EmptyState,
    SchoolFieldsForm,
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
  protected readonly store = inject(AuthStore);
  protected readonly avatars = inject(AvatarService);

  protected readonly groups = PROFILE_GROUPS;
  protected readonly submitting = signal(false);
  protected readonly savingInfo = signal(false);
  protected readonly history = signal<LoginHistoryEntry[]>([]);
  protected readonly loadingHistory = signal(true);

  protected readonly uploadingAvatar = signal(false);

  /** Formulaire d'infos perso (PUT /users/me). */
  protected readonly infoForm = new FormGroup(
    Object.fromEntries(
      PROFILE_KEYS.map((k) => [k, new FormControl<string>('', { nonNullable: true })]),
    ),
  );

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    const current = this.store.user();
    if (current) {
      this.patchInfo(current);
    }
    // Rafraîchit le profil complet (auth/profile) → préremplit le formulaire.
    this.auth.loadMe().subscribe({
      next: (u) => this.patchInfo(u),
      error: () => undefined,
    });
    this.auth.loginHistory().subscribe({
      next: (entries) => {
        this.history.set(entries);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false),
    });
  }

  /* ---------------------------- Photo de profil ---------------------------- */

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // autorise la re-sélection du même fichier
    if (!file || this.uploadingAvatar()) {
      return;
    }
    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) {
      this.notify.error('Format non supporté (jpg, png, webp, gif).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notify.error('Image trop lourde (max 5 Mo).');
      return;
    }
    this.uploadingAvatar.set(true);
    this.auth.uploadAvatar(file).subscribe({
      next: () => {
        this.uploadingAvatar.set(false);
        this.notify.success('Photo de profil mise à jour.');
        // Rafraîchit le profil (user.avatarUrl) puis casse le cache de l'image.
        this.auth.loadMe().subscribe({ next: () => this.avatars.bump(), error: () => undefined });
      },
      error: () => this.uploadingAvatar.set(false),
    });
  }

  removeAvatar(): void {
    if (this.uploadingAvatar()) {
      return;
    }
    this.uploadingAvatar.set(true);
    this.auth.deleteAvatar().subscribe({
      next: () => {
        this.uploadingAvatar.set(false);
        this.notify.success('Photo supprimée.');
        // loadMe met user.avatarUrl à null → l'avatar repasse aux initiales.
        this.auth.loadMe().subscribe({ error: () => undefined });
      },
      error: () => this.uploadingAvatar.set(false),
    });
  }

  private patchInfo(src: unknown): void {
    const obj = (src && typeof src === 'object' ? src : {}) as Record<string, unknown>;
    const value: Record<string, string> = {};
    for (const key of PROFILE_KEYS) {
      const raw = obj[key];
      // Date ISO → garde la partie AAAA-MM-JJ pour l'édition.
      value[key] =
        key === 'dateOfBirth' && typeof raw === 'string'
          ? raw.slice(0, 10)
          : raw === null || raw === undefined
            ? ''
            : String(raw);
    }
    this.infoForm.patchValue(value);
    this.infoForm.markAsPristine();
  }

  saveInfo(): void {
    if (this.savingInfo()) {
      return;
    }
    this.savingInfo.set(true);
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(this.infoForm.getRawValue())) {
      payload[k] = v === '' ? null : v;
    }
    this.auth.updateProfile(payload).subscribe({
      next: (u) => {
        this.savingInfo.set(false);
        this.patchInfo(u);
        this.notify.success('Profil mis à jour.');
      },
      error: () => this.savingInfo.set(false),
    });
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
