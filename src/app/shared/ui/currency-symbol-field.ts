import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  forwardRef,
  inject,
  input,
  type OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlContainer,
  type FormGroup,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  type ControlValueAccessor,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { currencySymbolFor } from '../../core/models/geo.reference';

/**
 * Symbole de devise dérivé : lit le contrôle `currency` du formulaire parent et
 * affiche/synchronise automatiquement le symbole correspondant (lecture seule).
 * Évite toute saisie libre → symbole toujours cohérent avec la devise.
 */
@Component({
  selector: 'panga-currency-symbol-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CurrencySymbolField), multi: true },
  ],
  template: `
    <mat-form-field appearance="outline" class="w-full">
      <mat-label>{{ label() }}</mat-label>
      <input matInput readonly [value]="symbol()" placeholder="—" />
      <mat-hint>Défini automatiquement par la devise.</mat-hint>
    </mat-form-field>
  `,
})
export class CurrencySymbolField implements ControlValueAccessor, OnInit {
  readonly label = input('Symbole devise');
  /** Nom du contrôle devise dans le formulaire parent. */
  readonly currencyControlName = input('currency');

  protected readonly symbol = signal('');
  private onChange: (value: string) => void = () => undefined;

  private readonly container = inject(ControlContainer, { optional: true, skipSelf: true });
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const group = this.container?.control as FormGroup | undefined;
    const currency = group?.get(this.currencyControlName());
    if (!currency) return;
    this.apply(currency.value);
    currency.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((code: string) => this.apply(code));
  }

  private apply(code: string | null | undefined): void {
    const sym = currencySymbolFor(code);
    this.symbol.set(sym);
    this.onChange(sym);
  }

  writeValue(value: string | null): void {
    // Valeur externe ignorée si la devise impose déjà un symbole ; sinon reflet.
    if (!this.symbol()) this.symbol.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(): void {
    // Champ en lecture seule : rien à suivre.
  }

  setDisabledState(): void {
    // Toujours en lecture seule.
  }
}
