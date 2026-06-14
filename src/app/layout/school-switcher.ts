import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthStore } from '../core/auth/auth.store';
import { AuthService } from '../core/auth/auth.service';
import type { School } from '../core/models/auth.models';

/** Sélecteur d'école active (parents multi-écoles). Masqué si ≤ 1 école. */
@Component({
  selector: 'panga-school-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    @if (store.schools().length > 1) {
      <button mat-stroked-button [matMenuTriggerFor]="menu" class="!rounded-xl">
        <mat-icon fontSet="material-symbols-outlined">apartment</mat-icon>
        <span class="max-w-[12rem] truncate">
          {{ store.activeSchool()?.name ?? 'Choisir une école' }}
        </span>
        <mat-icon fontSet="material-symbols-outlined">expand_more</mat-icon>
      </button>
      <mat-menu #menu="matMenu">
        @for (school of store.schools(); track school.id) {
          <button mat-menu-item (click)="select(school)">
            @if (school.id === store.activeSchool()?.id) {
              <mat-icon fontSet="material-symbols-outlined">check</mat-icon>
            }
            <span>{{ school.name }}</span>
          </button>
        }
      </mat-menu>
    }
  `,
})
export class SchoolSwitcher {
  protected readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);

  select(school: School): void {
    this.auth.selectSchool(school);
  }
}
