import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  type ControlValueAccessor,
} from '@angular/forms';
import { MatFormFieldModule, type SubscriptSizing } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { COUNTRIES, assemblePhone, splitPhone } from '../../core/models/geo.reference';

/**
 * Champ téléphone réutilisable : un sélecteur d'indicatif (drapeau + `+243`)
 * accolé à un champ numéro. Expose une valeur unique au format E.164
 * (`+243812345678`) via ControlValueAccessor — le modèle de données reste une
 * simple chaîne. Remplace les `<input type="tel">` pour uniformiser les numéros.
 */
@Component({
  selector: 'panga-phone-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PhoneField), multi: true },
  ],
  template: `
    <div class="flex items-start gap-2 w-full">
      <mat-form-field
        appearance="outline"
        class="w-28 shrink-0"
        [subscriptSizing]="subscriptSizing()"
      >
        <mat-label>Indicatif</mat-label>
        <mat-select [formControl]="countryCtrl" [panelWidth]="null">
          @for (c of countries; track c.code) {
            <mat-option [value]="c.code">{{ c.flag }} {{ c.dialCode }} · {{ c.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field
        appearance="outline"
        class="flex-1 min-w-0"
        [subscriptSizing]="subscriptSizing()"
      >
        <mat-label>{{ label() }}</mat-label>
        <input
          matInput
          inputmode="tel"
          [formControl]="numberCtrl"
          (blur)="onTouched()"
          placeholder="812 345 678"
        />
      </mat-form-field>
    </div>
  `,
})
export class PhoneField implements ControlValueAccessor {
  readonly label = input('Téléphone');
  readonly subscriptSizing = input<SubscriptSizing>('fixed');

  protected readonly countries = COUNTRIES;
  protected readonly countryCtrl = new FormControl('CD', { nonNullable: true });
  protected readonly numberCtrl = new FormControl('', { nonNullable: true });

  protected onTouched: () => void = () => undefined;
  private onChange: (value: string) => void = () => undefined;

  constructor() {
    this.countryCtrl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.emit());
    this.numberCtrl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.emit());
  }

  private emit(): void {
    this.onChange(assemblePhone(this.countryCtrl.value, this.numberCtrl.value));
  }

  writeValue(value: string | null): void {
    const { countryCode, national } = splitPhone(value);
    this.countryCtrl.setValue(countryCode, { emitEvent: false });
    this.numberCtrl.setValue(national, { emitEvent: false });
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    const opts = { emitEvent: false };
    if (isDisabled) {
      this.countryCtrl.disable(opts);
      this.numberCtrl.disable(opts);
    } else {
      this.countryCtrl.enable(opts);
      this.numberCtrl.enable(opts);
    }
  }
}
