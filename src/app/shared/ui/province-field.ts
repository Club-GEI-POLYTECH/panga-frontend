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
  FormControl,
  type FormGroup,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  type ControlValueAccessor,
} from '@angular/forms';
import { MatFormFieldModule, type SubscriptSizing } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { provincesFor } from '../../core/models/geo.reference';

/**
 * Champ province dépendant du pays : lit le contrôle `country` du formulaire
 * parent et propose un `mat-select` des provinces connues (RDC) ou, à défaut,
 * une saisie libre. ControlValueAccessor sur une simple chaîne (nom de province).
 */
@Component({
  selector: 'panga-province-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ProvinceField), multi: true },
  ],
  template: `
    <mat-form-field appearance="outline" class="w-full" [subscriptSizing]="subscriptSizing()">
      <mat-label>{{ label() }}</mat-label>
      @if (provinces().length) {
        <mat-select [formControl]="inner" (blur)="onTouched()">
          <mat-option [value]="''">—</mat-option>
          @for (p of provinces(); track p) {
            <mat-option [value]="p">{{ p }}</mat-option>
          }
        </mat-select>
      } @else {
        <input matInput [formControl]="inner" (blur)="onTouched()" />
      }
    </mat-form-field>
  `,
})
export class ProvinceField implements ControlValueAccessor, OnInit {
  readonly label = input('Province');
  /** Nom du contrôle pays dans le formulaire parent. */
  readonly countryControlName = input('country');
  readonly subscriptSizing = input<SubscriptSizing>('fixed');

  protected readonly provinces = signal<string[]>([]);
  protected readonly inner = new FormControl('', { nonNullable: true });
  protected onTouched: () => void = () => undefined;
  private onChange: (value: string) => void = () => undefined;

  private readonly container = inject(ControlContainer, { optional: true, skipSelf: true });
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.inner.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => this.onChange(v));
  }

  ngOnInit(): void {
    // Suit le contrôle pays du formulaire parent pour adapter la liste.
    const group = this.container?.control as FormGroup | undefined;
    const country = group?.get(this.countryControlName());
    if (!country) return;
    this.provinces.set(provincesFor(country.value));
    country.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((code: string) => this.provinces.set(provincesFor(code)));
  }

  writeValue(value: string | null): void {
    this.inner.setValue(value ?? '', { emitEvent: false });
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
