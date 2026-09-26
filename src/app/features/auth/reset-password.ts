import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../shared/ui/notification.service';
import { AuthLayout } from './auth-layout';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pwd = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'panga-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoModule,
    AuthLayout,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <panga-auth-layout>
      <ng-container *transloco="let t">
        <div class="panga-brand">
          <div class="badge">P</div>
          <div>
            <h1 class="panga-auth-title" style="font-size: 1.25rem">{{ t('app.name') }}</h1>
            <p class="panga-auth-subtitle" style="margin: 0.1rem 0 0; font-size: 0.8rem">
              {{ t('app.tagline') }}
            </p>
          </div>
        </div>

        <h2 class="panga-auth-title">{{ t('auth.reset.title') }}</h2>
        <p class="panga-auth-subtitle">{{ t('auth.reset.subtitle') }}</p>
        <div class="panga-auth-rule" aria-hidden="true"></div>

        @if (!token()) {
          <div class="panga-auth-status">
            <div class="ico err">
              <mat-icon fontSet="material-symbols-outlined">link_off</mat-icon>
            </div>
            <p class="panga-auth-subtitle" style="margin: 0">{{ t('auth.reset.invalidToken') }}</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="panga-auth-form">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ t('auth.reset.password') }}</mat-label>
              <mat-icon matPrefix fontSet="material-symbols-outlined">lock</mat-icon>
              <input
                matInput
                [type]="hidePwd() ? 'password' : 'text'"
                formControlName="password"
                autocomplete="new-password"
              />
              <button
                type="button"
                mat-icon-button
                matSuffix
                (click)="hidePwd.set(!hidePwd())"
                [attr.aria-label]="hidePwd() ? 'Afficher' : 'Masquer'"
              >
                <mat-icon fontSet="material-symbols-outlined">
                  {{ hidePwd() ? 'visibility' : 'visibility_off' }}
                </mat-icon>
              </button>
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <mat-error>{{ t('auth.reset.minLength') }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ t('auth.reset.confirm') }}</mat-label>
              <mat-icon matPrefix fontSet="material-symbols-outlined">lock_reset</mat-icon>
              <input
                matInput
                [type]="hideConfirm() ? 'password' : 'text'"
                formControlName="confirm"
                autocomplete="new-password"
              />
              <button
                type="button"
                mat-icon-button
                matSuffix
                (click)="hideConfirm.set(!hideConfirm())"
                [attr.aria-label]="hideConfirm() ? 'Afficher' : 'Masquer'"
              >
                <mat-icon fontSet="material-symbols-outlined">
                  {{ hideConfirm() ? 'visibility' : 'visibility_off' }}
                </mat-icon>
              </button>
              @if (form.errors?.['mismatch'] && form.controls.confirm.touched) {
                <mat-error>{{ t('auth.reset.mismatch') }}</mat-error>
              }
            </mat-form-field>

            <button
              type="submit"
              mat-flat-button
              class="panga-auth-submit mt-1"
              [disabled]="submitting()"
            >
              @if (submitting()) {
                <mat-spinner diameter="20" class="inline-block align-middle mr-2"></mat-spinner>
              }
              <span>{{ t('auth.reset.submit') }}</span>
            </button>
          </form>
        }

        <a routerLink="/auth/login" class="panga-auth-back">
          <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
          {{ t('auth.backToLogin') }}
        </a>
      </ng-container>
    </panga-auth-layout>
  `,
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly submitting = signal(false);
  protected readonly hidePwd = signal(true);
  protected readonly hideConfirm = signal(true);
  protected readonly token = signal(this.route.snapshot.queryParamMap.get('token') ?? '');

  protected readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  submit(): void {
    if (this.form.invalid || this.submitting() || !this.token()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.resetPassword(this.token(), this.form.getRawValue().password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Mot de passe réinitialisé. Vous pouvez vous connecter.');
        void this.router.navigate(['/auth/login']);
      },
      error: () => this.submitting.set(false),
    });
  }
}
