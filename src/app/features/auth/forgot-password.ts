import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { AuthLayout } from './auth-layout';

@Component({
  selector: 'panga-forgot-password',
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

        @if (!sent()) {
          <h2 class="panga-auth-title">{{ t('auth.forgot.title') }}</h2>
          <p class="panga-auth-subtitle">{{ t('auth.forgot.subtitle') }}</p>
          <div class="panga-auth-rule" aria-hidden="true"></div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="panga-auth-form">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ t('auth.forgot.email') }}</mat-label>
              <mat-icon matPrefix fontSet="material-symbols-outlined">mail</mat-icon>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <mat-error>{{ t('auth.errors.email') }}</mat-error>
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
              <span>{{ t('auth.forgot.submit') }}</span>
            </button>
          </form>
        } @else {
          <div class="panga-auth-status">
            <div class="ico ok">
              <mat-icon fontSet="material-symbols-outlined">mark_email_read</mat-icon>
            </div>
            <h2 class="panga-auth-title" style="font-size: 1.25rem">
              {{ t('auth.forgot.sentTitle') }}
            </h2>
            <p class="panga-auth-subtitle">{{ t('auth.forgot.sentBody') }}</p>
          </div>
        }

        <a routerLink="/auth/login" class="panga-auth-back">
          <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
          {{ t('auth.backToLogin') }}
        </a>
      </ng-container>
    </panga-auth-layout>
  `,
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: () => this.submitting.set(false),
    });
  }
}
