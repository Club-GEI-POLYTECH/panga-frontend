import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { PublicSchoolsService } from '../../core/schools/public-schools.service';
import type { School } from '../../core/models/auth.models';
import { AuthLayout } from './auth-layout';

@Component({
  selector: 'panga-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoModule,
    AuthLayout,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly publicSchools = inject(PublicSchoolsService);

  protected readonly submitting = signal(false);
  protected readonly hidePassword = signal(true);

  protected readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  /** École optionnelle (utile aux parents/enseignants multi-écoles). */
  protected readonly schoolCtrl = new FormControl<string | School>('', { nonNullable: true });
  protected readonly schools = signal<School[]>([]);

  private readonly schoolQuery = toSignal(this.schoolCtrl.valueChanges, { initialValue: '' });
  protected readonly filteredSchools = computed(() => {
    const v = this.schoolQuery();
    const q = (typeof v === 'string' ? v : (v?.name ?? '')).toLowerCase().trim();
    const list = this.schools();
    if (!q) {
      return list;
    }
    return list.filter((s) => `${s.name} ${s.subtitle ?? ''}`.toLowerCase().includes(q));
  });

  constructor() {
    this.publicSchools.list().subscribe({
      next: (list) => this.schools.set(list),
      error: () => undefined,
    });
  }

  protected displaySchool(value: School | string | null): string {
    return value && typeof value === 'object' ? value.name : (value ?? '');
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { identifier, password } = this.form.getRawValue();
    const selected = this.schoolCtrl.value;
    const schoolId = selected && typeof selected === 'object' ? selected.id : null;

    this.auth.login({ identifier, password, schoolId }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.redirectAfterLogin();
      },
      error: () => this.submitting.set(false),
    });
  }

  private redirectAfterLogin(): void {
    if (this.store.needsSchoolSelection()) {
      void this.router.navigate(['/select-school']);
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
    void this.router.navigateByUrl(returnUrl);
  }
}
