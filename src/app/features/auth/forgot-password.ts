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
          <h1 class="text-lg font-semibold" style="font-family: Urbanist, sans-serif">
            {{ t('app.name') }}
          </h1>
        </div>

        @if (!sent()) {
          <h2 class="text-2xl font-semibold text-[var(--text)]">{{ t('auth.forgot.title') }}</h2>
          <p class="text-sm text-[var(--text-muted)] mt-1 mb-6">{{ t('auth.forgot.subtitle') }}</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col">
            <mat-form-field appearance="outline" class="w-full">
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
              class="panga-btn-primary mt-2"
              [disabled]="submitting()"
            >
              @if (submitting()) {
                <mat-spinner diameter="20" class="inline-block align-middle mr-2"></mat-spinner>
              }
              <span>{{ t('auth.forgot.submit') }}</span>
            </button>
          </form>
        } @else {
          <div class="text-center py-4">
            <div
              class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl"
              style="background: color-mix(in srgb, var(--success) 14%, transparent)"
            >
              <mat-icon fontSet="material-symbols-outlined" style="color: var(--success)">
                mark_email_read
              </mat-icon>
            </div>
            <h2 class="text-xl font-semibold text-[var(--text)]">
              {{ t('auth.forgot.sentTitle') }}
            </h2>
            <p class="text-sm text-[var(--text-muted)] mt-2">{{ t('auth.forgot.sentBody') }}</p>
          </div>
        }

        <a
          routerLink="/auth/login"
          class="mt-6 flex items-center justify-center gap-1 text-sm"
          style="color: var(--brand-500)"
        >
          <mat-icon fontSet="material-symbols-outlined" class="!text-base !h-4 !w-4"
            >arrow_back</mat-icon
          >
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
