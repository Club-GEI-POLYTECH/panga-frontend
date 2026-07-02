import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ReactiveFormsModule, type ControlValueAccessor } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Parse une chaîne « lat,lng » en composantes numériques (ou null). */
function parse(value: string | null | undefined): { lat: string; lng: string } {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value ?? '');
  return m ? { lat: m[1], lng: m[2] } : { lat: '', lng: '' };
}

/**
 * Champ « coordonnées GPS » dédié : deux saisies latitude / longitude bornées,
 * un bouton de géolocalisation et un aperçu carte. Valeur stockée au format
 * `lat,lng` (chaîne) via ControlValueAccessor — vide si incomplet/invalide.
 */
@Component({
  selector: 'panga-gps-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => GpsField), multi: true }],
  template: `
    <div class="w-full">
      <div class="flex items-start gap-2">
        <mat-form-field appearance="outline" class="flex-1 min-w-0">
          <mat-label>{{ label() }} — latitude</mat-label>
          <input
            matInput
            type="number"
            inputmode="decimal"
            min="-90"
            max="90"
            step="any"
            placeholder="-4.325"
            [disabled]="disabled()"
            [value]="lat()"
            (input)="setLat($any($event.target).value)"
            (blur)="onTouched()"
          />
        </mat-form-field>
        <mat-form-field appearance="outline" class="flex-1 min-w-0">
          <mat-label>Longitude</mat-label>
          <input
            matInput
            type="number"
            inputmode="decimal"
            min="-180"
            max="180"
            step="any"
            placeholder="15.322"
            [disabled]="disabled()"
            [value]="lng()"
            (input)="setLng($any($event.target).value)"
            (blur)="onTouched()"
          />
        </mat-form-field>
        <button
          type="button"
          mat-icon-button
          class="mt-1.5 shrink-0"
          matTooltip="Utiliser ma position"
          aria-label="Utiliser ma position"
          [disabled]="disabled() || locating()"
          (click)="useMyLocation()"
        >
          <mat-icon fontSet="material-symbols-outlined">
            {{ locating() ? 'hourglass_empty' : 'my_location' }}
          </mat-icon>
        </button>
      </div>
      @if (mapUrl(); as url) {
        <a
          [href]="url"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1 -mt-3 text-xs text-(--brand-700) hover:underline"
        >
          <mat-icon fontSet="material-symbols-outlined" class="text-[16px]! w-4! h-4!"
            >map</mat-icon
          >
          Voir sur la carte
        </a>
      }
    </div>
  `,
})
export class GpsField implements ControlValueAccessor {
  readonly label = input('Coordonnées GPS');

  protected readonly lat = signal('');
  protected readonly lng = signal('');
  protected readonly disabled = signal(false);
  protected readonly locating = signal(false);

  protected readonly mapUrl = computed(() => {
    const lat = this.lat();
    const lng = this.lng();
    return lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : '';
  });

  protected onTouched: () => void = () => undefined;
  private onChange: (value: string) => void = () => undefined;

  protected setLat(v: string): void {
    this.lat.set(v);
    this.emit();
  }

  protected setLng(v: string): void {
    this.lng.set(v);
    this.emit();
  }

  private emit(): void {
    const lat = this.lat().trim();
    const lng = this.lng().trim();
    this.onChange(lat !== '' && lng !== '' ? `${lat},${lng}` : '');
  }

  protected useMyLocation(): void {
    if (!navigator.geolocation) return;
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.lat.set(pos.coords.latitude.toFixed(6));
        this.lng.set(pos.coords.longitude.toFixed(6));
        this.emit();
        this.locating.set(false);
      },
      () => this.locating.set(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  writeValue(value: string | null): void {
    const { lat, lng } = parse(value);
    this.lat.set(lat);
    this.lng.set(lng);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
