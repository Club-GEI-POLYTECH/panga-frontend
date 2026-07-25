import { ChangeDetectionStrategy, Component, forwardRef, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  type ControlValueAccessor,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule, type SubscriptSizing } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** `YYYY-MM-DD` → Date locale (minuit local, sans décalage de fuseau). */
function isoToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** Date locale → `YYYY-MM-DD` (composantes locales, pas d'UTC). */
function dateToIso(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return '';
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mo}-${da}`;
}

/**
 * Champ de date réutilisable : ouvre un calendrier Material (bouton toggle) tout
 * en exposant une valeur `YYYY-MM-DD` via ControlValueAccessor. Remplace les
 * `<input type="date">` natifs pour un calendrier cohérent sur tous les
 * navigateurs, sans changer le modèle de données (chaînes ISO).
 */
@Component({
  selector: 'panga-date-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateField), multi: true },
  ],
  template: `
    <mat-form-field appearance="outline" class="w-full" [subscriptSizing]="subscriptSizing()">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [matDatepicker]="picker"
        [formControl]="inner"
        [min]="min()"
        [max]="max()"
        (blur)="onTouched()"
      />
      <mat-datepicker-toggle matSuffix [for]="picker" />
      <mat-datepicker #picker />
    </mat-form-field>
  `,
})
export class DateField implements ControlValueAccessor {
  readonly label = input('');
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly subscriptSizing = input<SubscriptSizing>('fixed');
  /** Émis à chaque changement issu de l'utilisateur (équivalent d'un `(change)`). */
  readonly changed = output<string>();

  protected readonly inner = new FormControl<Date | null>(null);
  protected onTouched: () => void = () => undefined;
  private onChange: (value: string) => void = () => undefined;

  constructor() {
    this.inner.valueChanges.pipe(takeUntilDestroyed()).subscribe((d) => {
      const iso = dateToIso(d);
      this.onChange(iso);
      this.changed.emit(iso);
    });
  }

  writeValue(value: string | null): void {
    this.inner.setValue(isoToDate(value), { emitEvent: false });
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) this.inner.disable({ emitEvent: false });
    else this.inner.enable({ emitEvent: false });
  }
}
