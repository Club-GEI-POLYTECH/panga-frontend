import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
  "referenceYear": "202-2025",
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
    MatButtonToggleModule,
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
        <panga-kpi-card label="dont embarqués (RDC)" [value]="bundledCount()" icon="flag" />
      </section>

      <!-- Programmes importés à publier (brouillons) -->
      @if (drafts().length) {
        <section class="panga-card p-5 mb-6" style="border: 1px solid var(--warning)">
          <panga-section-header
            icon="upload_file"
            title="Programmes importés (à publier)"
            [count]="drafts().length"
          />
          <div class="grid gap-3 sm:grid-cols-2">
            @for (p of drafts(); track p.id) {
              <div class="rounded-2xl border border-(--border) p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-medium text-(--text) truncate">{{ p.title || p.code }}</p>
                    <p class="text-xs text-(--text-muted) mt-0.5">{{ p.code }}</p>
                  </div>
                  <panga-status-badge label="Brouillon" tone="warning" [dot]="false" />
                </div>
                <div class="mt-3 flex justify-end">
                  <button
                    mat-flat-button
                    class="rounded-xl!"
                    [disabled]="publishingId() === p.id"
                    (click)="publishDraft(p)"
                  >
                    <mat-icon fontSet="material-symbols-outlined">publish</mat-icon> Publier
                  </button>
                </div>
              </div>
            }
          </div>
        </section>
      }

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
              <div class="rounded-2xl border border-(--border) p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-medium text-(--text) truncate">{{ p.title || p.code }}</p>
                    <p class="text-xs text-(--text-muted) mt-0.5">{{ p.code }}</p>
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
                <div class="mt-3 flex justify-end">
                  <button mat-stroked-button class="rounded-xl!" (click)="openProgram(p)">
                    <mat-icon fontSet="material-symbols-outlined">visibility</mat-icon> Détail &
                    barème
                  </button>
                </div>

                @if (selectedId() === p.id) {
                  @if (loadingDetail()) {
                    <p class="text-xs text-(--text-muted) mt-3">Chargement du barème…</p>
                  } @else if (slots().length) {
                    <div class="mt-3 flex justify-end gap-2">
                      @if (editingSlots()) {
                        <button
                          mat-stroked-button
                          class="rounded-lg!"
                          type="button"
                          (click)="editingSlots.set(false)"
                        >
                          Annuler
                        </button>
                        <button
                          mat-flat-button
                          class="rounded-lg!"
                          type="button"
                          [disabled]="savingSlots()"
                          (click)="saveSlots()"
                        >
                          {{ savingSlots() ? '…' : 'Enregistrer' }}
                        </button>
                      } @else {
                        <button
                          mat-stroked-button
                          class="rounded-lg!"
                          type="button"
                          (click)="editingSlots.set(true)"
                        >
                          <mat-icon fontSet="material-symbols-outlined">edit</mat-icon> Éditer le
                          barème
                        </button>
                      }
                    </div>
                    <div class="mt-2 overflow-x-auto">
                      <table class="w-full text-xs">
                        <thead class="text-(--text-muted) text-left">
                          <tr>
                            <th class="py-1 pr-2 font-medium">Cours</th>
                            <th class="py-1 px-2 font-medium">Code</th>
                            <th class="py-1 px-2 font-medium">Max/pér.</th>
                            <th class="py-1 px-2 font-medium">Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (s of slots(); track $index) {
                            <tr class="border-t border-(--border)">
                              <td class="py-1 pr-2 text-(--text)">
                                @if (editingSlots()) {
                                  <input
                                    class="w-full rounded border border-(--border) bg-(--surface) px-2 py-1"
                                    [value]="$any(s['labelFr']) || ''"
                                    (input)="
                                      patchSlot($index, 'labelFr', $any($event.target).value)
                                    "
                                  />
                                } @else {
                                  {{ s['labelFr'] || s['programCode'] }}
                                }
                              </td>
                              <td class="py-1 px-2 text-(--text-muted)">
                                {{ s['programCode'] }}
                              </td>
                              <td class="py-1 px-2 text-(--text)">
                                @if (editingSlots()) {
                                  <input
                                    type="number"
                                    min="0"
                                    class="w-20 rounded border border-(--border) bg-(--surface) px-2 py-1 text-right"
                                    [value]="$any(s['maxPerPeriod'])"
                                    (input)="
                                      patchSlot($index, 'maxPerPeriod', $any($event.target).value)
                                    "
                                  />
                                } @else {
                                  {{ s['maxPerPeriod'] }}
                                }
                              </td>
                              <td class="py-1 px-2 text-(--text-muted)">
                                {{ scoringLabel(s['scoringMode']) }}
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  } @else {
                    <p class="text-xs text-(--text-muted) mt-3">Aucun cours dans ce programme.</p>
                  }
                }
              </div>
            }
          </div>
        } @else {
          <p class="text-sm text-(--text-muted)">Aucun programme publié.</p>
        }
      </section>

      <!-- Référentiels de bulletin (liste unique : database + bundled) -->
      <section class="panga-card p-5 mb-6">
        <panga-section-header
          icon="grid_view"
          title="Référentiels de bulletin"
          [count]="bulletins().length"
        />
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <mat-button-toggle-group
            [value]="bulletinFilter()"
            (change)="bulletinFilter.set($event.value)"
            class="rounded-xl!"
          >
            <mat-button-toggle value="all">Tous ({{ bulletins().length }})</mat-button-toggle>
            <mat-button-toggle value="database"
              >Personnalisés ({{ databaseCount() }})</mat-button-toggle
            >
            <mat-button-toggle value="bundled"
              >Embarqués RDC ({{ bundledCount() }})</mat-button-toggle
            >
          </mat-button-toggle-group>
        </div>
        <div class="divide-y divide-(--border)">
          @for (b of visibleBulletins(); track b.id || b.code) {
            <div class="flex items-center gap-2 py-2">
              <span class="material-symbols-outlined text-[18px] text-(--brand-500)"
                >description</span
              >
              <span class="text-sm text-(--text) truncate flex-1">{{ b.title || b.code }}</span>
              @if (isDatabase(b)) {
                <panga-status-badge label="Personnalisé" tone="brand" [dot]="false" />
                <button
                  mat-icon-button
                  class="h-8! w-8!"
                  (click)="deleteBulletin(b)"
                  aria-label="Supprimer"
                >
                  <mat-icon fontSet="material-symbols-outlined" class="text-[18px]!"
                    >delete</mat-icon
                  >
                </button>
              } @else {
                <panga-status-badge label="Embarqué (RDC)" tone="neutral" [dot]="false" />
              }
            </div>
          } @empty {
            <p class="text-sm text-(--text-muted) py-2">Aucun référentiel.</p>
          }
        </div>
      </section>

      <!-- Imports (JSON) -->
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="panga-card p-5">
          <panga-section-header icon="upload_file" title="Importer un programme national" />
          <textarea
            [formControl]="importJson"
            rows="12"
            spellcheck="false"
            class="w-full rounded-xl border border-(--border) bg-(--background) p-3 text-xs font-mono text-(--text) focus:outline-none focus:ring-2 focus:ring-(--brand-400)"
          ></textarea>
          <div class="flex justify-end mt-3">
            <button
              mat-flat-button
              class="rounded-xl!"
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
            class="w-full rounded-xl border border-(--border) bg-(--background) p-3 text-xs font-mono text-(--text) focus:outline-none focus:ring-2 focus:ring-(--brand-400)"
          ></textarea>
          <div class="flex justify-end mt-3">
            <button
              mat-flat-button
              class="rounded-xl!"
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
  /** Programmes importés non encore publiés (absents de l'endpoint /published). */
  protected readonly drafts = signal<NationalProgram[]>([]);
  /** Liste fusionnée des référentiels de bulletin (database + bundled). */
  protected readonly bulletins = signal<BulletinProgram[]>([]);
  /** Filtre par origine : tous / personnalisés (database) / embarqués (bundled). */
  protected readonly bulletinFilter = signal<'all' | 'database' | 'bundled'>('all');
  protected readonly databaseCount = computed(
    () => this.bulletins().filter((b) => this.isDatabase(b)).length,
  );
  protected readonly bundledCount = computed(
    () => this.bulletins().filter((b) => !this.isDatabase(b)).length,
  );
  protected readonly visibleBulletins = computed(() => {
    const f = this.bulletinFilter();
    if (f === 'all') {
      return this.bulletins();
    }
    return this.bulletins().filter((b) => (f === 'database') === this.isDatabase(b));
  });
  protected readonly loading = signal(true);
  protected readonly importing = signal(false);
  protected readonly publishingId = signal<string | null>(null);
  protected readonly creatingBulletin = signal(false);

  protected readonly importJson = new FormControl(IMPORT_TEMPLATE, { nonNullable: true });
  protected readonly bulletinJson = new FormControl(BULLETIN_TEMPLATE, { nonNullable: true });

  /** Programme déplié (détail du barème) + ses slots. */
  protected readonly selectedId = signal<string | null>(null);
  protected readonly slots = signal<Record<string, unknown>[]>([]);
  protected readonly loadingDetail = signal(false);
  /** Édition inline du barème (slots) du programme déplié. */
  protected readonly editingSlots = signal(false);
  protected readonly savingSlots = signal(false);

  constructor() {
    this.load();
  }

  /** Charge le barème (slots) d'un programme national, ou replie s'il est déjà ouvert. */
  openProgram(p: NationalProgram): void {
    this.editingSlots.set(false);
    if (this.selectedId() === p.id) {
      this.selectedId.set(null);
      return;
    }
    this.selectedId.set(p.id);
    // Slots déjà présents sur la liste ? sinon on charge le détail.
    const inline = (p.slots ?? []) as Record<string, unknown>[];
    if (inline.length) {
      this.slots.set(inline);
      return;
    }
    this.loadingDetail.set(true);
    this.slots.set([]);
    this.curriculum.programDetail(p.id).subscribe({
      next: (full) => {
        this.slots.set((full.slots ?? []) as Record<string, unknown>[]);
        this.loadingDetail.set(false);
      },
      error: () => this.loadingDetail.set(false),
    });
  }

  /** Met à jour un champ d'un slot en cours d'édition. */
  patchSlot(index: number, key: string, value: unknown): void {
    const v = key === 'maxPerPeriod' || key === 'displayOrder' ? Number(value) : value;
    this.slots.update((list) => list.map((s, i) => (i === index ? { ...s, [key]: v } : s)));
  }

  /** Enregistre le barème édité — `PATCH /national-programs/:id`. */
  saveSlots(): void {
    const id = this.selectedId();
    if (!id || this.savingSlots()) {
      return;
    }
    this.savingSlots.set(true);
    this.curriculum.updateProgram(id, { slots: this.slots() }).subscribe({
      next: (full) => {
        this.savingSlots.set(false);
        this.editingSlots.set(false);
        this.slots.set((full.slots ?? []) as Record<string, unknown>[]);
        this.notify.success('Programme mis à jour.');
      },
      error: () => this.savingSlots.set(false),
    });
  }

  protected scoringLabel(mode: unknown): string {
    switch (mode) {
      case 'semester_exam_double':
        return 'Périodes + examen (×2)';
      case 'two_periods_no_exam':
        return '2 périodes, sans examen';
      default:
        return mode ? String(mode) : '—';
    }
  }

  /** Un référentiel persisté (table) a un id UUID ; un embarqué a un code. */
  protected isPersisted(b: BulletinProgram): boolean {
    return (
      !!b.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.id)
    );
  }

  /**
   * Référentiel modifiable (créé en base) vs embarqué (lecture seule). On lit
   * `source` (database/bundled) ; repli sur l'heuristique UUID si absent.
   */
  protected isDatabase(b: BulletinProgram): boolean {
    const src = b['source'];
    if (src === 'database') {
      return true;
    }
    if (src === 'bundled') {
      return false;
    }
    return this.isPersisted(b);
  }

  deleteBulletin(b: BulletinProgram): void {
    if (!b.id) {
      return;
    }
    this.curriculum.removeBulletinProgram(b.id).subscribe({
      next: () => {
        this.notify.success('Référentiel supprimé.');
        this.load();
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    // Une seule source pour les référentiels : /bulletin-programs (database +
    // bundled fusionnés). Plus d'appel séparé à /rdc (mêmes items en double).
    forkJoin({
      published: this.curriculum.publishedPrograms().pipe(catchError(() => of({ items: [] }))),
      drafts: this.curriculum.listPrograms('draft').pipe(catchError(() => of({ items: [] }))),
      bulletins: this.curriculum.bulletinPrograms().pipe(catchError(() => of({ items: [] }))),
    }).subscribe((r) => {
      this.published.set(r.published.items);
      this.drafts.set(r.drafts.items);
      this.bulletins.set(r.bulletins.items);
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
      next: (p) => {
        this.importing.set(false);
        // Un programme importé est en brouillon (persisté). Il apparaît dans la
        // section « à publier » via le rechargement (GET ?status=draft).
        this.notify.success(
          p?.published === true
            ? 'Programme importé et publié.'
            : 'Programme importé (brouillon). Cliquez sur « Publier » pour l’activer.',
        );
        this.load();
      },
      error: () => this.importing.set(false),
    });
  }

  /** Publie un programme importé (brouillon) ; il bascule alors dans la liste publiée. */
  publishDraft(p: NationalProgram): void {
    if (!p.id || this.publishingId()) {
      return;
    }
    this.publishingId.set(p.id);
    this.curriculum.publishProgram(p.id, true).subscribe({
      next: () => {
        this.publishingId.set(null);
        this.notify.success('Programme publié.');
        this.load();
      },
      error: () => this.publishingId.set(null),
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
