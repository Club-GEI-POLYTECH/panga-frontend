import { ChangeDetectionStrategy, Component, TemplateRef, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface FilterSheetData {
  title: string;
  template: TemplateRef<unknown>;
}

/** Contenu générique d'une feuille de filtres mobile (ouverte via MatBottomSheet). */
@Component({
  selector: 'panga-filter-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, MatButtonModule, MatIconModule],
  template: `
    <div class="flex items-center justify-between px-4 pt-4 pb-2">
      <h3 class="text-base font-semibold text-(--text)">{{ data.title }}</h3>
      <button mat-icon-button (click)="ref.dismiss()" aria-label="Fermer">
        <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
      </button>
    </div>
    <div class="flex flex-col gap-3 p-4 pt-0">
      <ng-container [ngTemplateOutlet]="data.template" />
    </div>
  `,
})
export class FilterSheetContent {
  protected readonly ref = inject(MatBottomSheetRef);
  protected readonly data = inject<FilterSheetData>(MAT_BOTTOM_SHEET_DATA);
}
