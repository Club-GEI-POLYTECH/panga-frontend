import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CurriculumService } from '../services/curriculum.service';
import type { BulletinProgram, NationalProgram } from '../models/platform.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

const IMPORT_TEMPLATE = `{
  "code": "cd_rdc_hum_ag_3_v1",
  "title": "RDC Humanites 3e - Agriculture generale (workflow SA)",
  "educationLevel": "secondary",
  "schoolCycle": "humanities",
  "optionLabel": "Agriculture generale",
  "subOptionLabel": "AG",
  "levelYear": 3,
  "referenceYear": "2024-2025",
  "isOfficial": true,
  "slots": [
    {
      "programCode": "CD_HUM3_AG_BIO",
      "labelFr": "Biologie",
      "mandatory": true,
      "defaultCoefficient": 1,
      "scoringMode": "semester_exam_double",
      "maxPerPeriod": 30,
      "maxExamPerSemester": 60,
      "maxSemester": 120,
      "maxYear": 240,
      "displayOrder": 1
    }
  ]
}`;

const BULLETIN_TEMPLATE = `{
  "code": "wf_bulletin_ref_001",
  "title": "Grille bulletin workflow SA",
  "educationLevel": "secondary",
  "schoolId": null,
  "slots": [
    {
      "programCode": "MATH",
      "labelFr": "Mathématiques",
      "mandatory": true,
      "defaultCoefficient": 1,
      "displayOrder": 1
    }
  ]
}`;

/** Curriculum national & référentiels bulletin (super_admin). */
@Component({
  selector: 'panga-curriculum',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    KpiCard,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="menu_book"
      title="Curriculum national"
      subtitle="Programmes nationaux et référentiels bulletin"
    />

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      <section class="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
        <panga-kpi-card label="Programmes publiés" [value]="published().length" icon="menu_book" />
        <panga-kpi-card
          label="Référentiels bulletin"
          [value]="bulletins().length"
          icon="grid_view"
        />
        <panga-kpi-card label="Référentiels RDC" [value]="rdc().length" icon="flag" />
      </section>

      <!-- Programmes nationaux publiés -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header
          icon="verified"
          title="Programmes nationaux publiés"
          [count]="published().length"
        />
        @if (published().length) {
          <div class="grid gap-3 sm:grid-cols-2">
            @for (p of published(); track p.id) {
              <div class="rounded-2xl border border-[var(--border)] p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-medium text-[var(--text)] truncate">{{ p.title || p.code }}</p>
                    <p class="text-xs text-[var(--text-muted)] mt-0.5">{{ p.code }}</p>
                  </div>
                  <mat-slide-toggle
                    [checked]="p.published ?? true"
                    (change)="togglePublish(p, $event.checked)"
                  />
                </div>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  @if (p.educationLevel) {
                    <panga-status-badge [label]="p.educationLevel" tone="info" [dot]="false" />
                  }
                  @if (p.optionLabel) {
                    <panga-status-badge [label]="p.optionLabel" tone="brand" [dot]="false" />
                  }
                  @if (p.referenceYear) {
                    <panga-status-badge [label]="p.referenceYear" tone="neutral" [dot]="false" />
                  }
                  @if (p.isOfficial) {
                    <panga-status-badge label="Officiel" tone="success" [dot]="false" />
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="text-sm text-[var(--text-muted)]">Aucun programme publié.</p>
        }
      </section>

      <!-- Référentiels -->
      <div class="grid gap-6 lg:grid-cols-2 mb-6">
        <section class="panga-card p-5">
          <panga-section-header
            icon="grid_view"
            title="Référentiels bulletin"
            [count]="bulletins().length"
          />
          @for (b of bulletins(); track b.code) {
            <div class="flex items-center gap-2 py-2 border-b border-[var(--border)] last:border-0">
              <span class="material-symbols-outlined text-[18px] text-[var(--brand-500)]"
                >description</span
              >
              <span class="text-sm text-[var(--text)] truncate">{{ b.title || b.code }}</span>
            </div>
          } @empty {
            <p class="text-sm text-[var(--text-muted)]">Aucun référentiel.</p>
          }
        </section>

        <section class="panga-card p-5">
          <panga-section-header
            icon="flag"
            title="Référentiels RDC embarqués"
            [count]="rdc().length"
          />
          @for (b of rdc(); track b.code) {
            <div class="flex items-center gap-2 py-2 border-b border-[var(--border)] last:border-0">
              <span class="material-symbols-outlined text-[18px] text-[var(--brand-500)]"
                >description</span
              >
              <span class="text-sm text-[var(--text)] truncate">{{ b.title || b.code }}</span>
            </div>
          } @empty {
            <p class="text-sm text-[var(--text-muted)]">Aucun référentiel embarqué.</p>
          }
        </section>
      </div>

      <!-- Imports (JSON) -->
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="panga-card p-5">
          <panga-section-header icon="upload_file" title="Importer un programme national" />
          <textarea
            [formControl]="importJson"
            rows="12"
            spellcheck="false"
            class="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs font-mono text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-400)]"
          ></textarea>
          <div class="flex justify-end mt-3">
            <button
              mat-flat-button
              class="!rounded-xl"
              (click)="importProgram()"
              [disabled]="importing()"
            >
              Importer
            </button>
          </div>
        </section>

        <section class="panga-card p-5">
          <panga-section-header icon="add_chart" title="Créer un référentiel bulletin" />
          <textarea
            [formControl]="bulletinJson"
            rows="12"
            spellcheck="false"
            class="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs font-mono text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-400)]"
          ></textarea>
          <div class="flex justify-end mt-3">
            <button
              mat-flat-button
              class="!rounded-xl"
              (click)="createBulletin()"
              [disabled]="creatingBulletin()"
            >
              Créer
            </button>
          </div>
        </section>
      </div>
    }
  `,
})
export class Curriculum {
  private readonly curriculum = inject(CurriculumService);
  private readonly notify = inject(NotificationService);

  protected readonly published = signal<NationalProgram[]>([]);
  protected readonly bulletins = signal<BulletinProgram[]>([]);
  protected readonly rdc = signal<BulletinProgram[]>([]);
  protected readonly loading = signal(true);
  protected readonly importing = signal(false);
  protected readonly creatingBulletin = signal(false);

  protected readonly importJson = new FormControl(IMPORT_TEMPLATE, { nonNullable: true });
  protected readonly bulletinJson = new FormControl(BULLETIN_TEMPLATE, { nonNullable: true });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      published: this.curriculum.publishedPrograms().pipe(catchError(() => of({ items: [] }))),
      bulletins: this.curriculum.bulletinPrograms().pipe(catchError(() => of({ items: [] }))),
      rdc: this.curriculum.rdcBulletinPrograms().pipe(catchError(() => of({ items: [] }))),
    }).subscribe((r) => {
      this.published.set(r.published.items);
      this.bulletins.set(r.bulletins.items);
      this.rdc.set(r.rdc.items);
      this.loading.set(false);
    });
  }

  private parse(raw: string): Record<string, unknown> | null {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      this.notify.error('JSON invalide.');
      return null;
    }
  }

  importProgram(): void {
    const dto = this.parse(this.importJson.value);
    if (!dto || this.importing()) {
      return;
    }
    this.importing.set(true);
    this.curriculum.importProgram(dto).subscribe({
      next: () => {
        this.importing.set(false);
        this.notify.success('Programme importé.');
        this.load();
      },
      error: () => this.importing.set(false),
    });
  }

  createBulletin(): void {
    const dto = this.parse(this.bulletinJson.value);
    if (!dto || this.creatingBulletin()) {
      return;
    }
    this.creatingBulletin.set(true);
    this.curriculum.createBulletinProgram(dto).subscribe({
      next: () => {
        this.creatingBulletin.set(false);
        this.notify.success('Référentiel créé.');
        this.load();
      },
      error: () => this.creatingBulletin.set(false),
    });
  }

  togglePublish(program: NationalProgram, published: boolean): void {
    this.curriculum.publishProgram(program.id, published).subscribe({
      next: () => {
        this.notify.success(published ? 'Programme publié.' : 'Programme dépublié.');
        this.load();
      },
    });
  }
}
