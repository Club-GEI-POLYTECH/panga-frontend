import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ClassesService } from '../services/classes.service';
import type { SchoolOption, SchoolSubOption } from '../models/admin.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';

@Component({
  selector: 'panga-class-options',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeader,
    SectionHeader,
  ],
  template: `
    <a
      [routerLink]="['/', 'classes']"
      class="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--brand-700)] mb-4"
    >
      <mat-icon fontSet="material-symbols-outlined" class="!text-base !w-4 !h-4"
        >arrow_back</mat-icon
      >
      Classes
    </a>

    <panga-page-header
      icon="account_tree"
      title="Options & filières"
      subtitle="Sections et spécialités de l'école"
    />

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Options -->
      <section class="panga-card p-5">
        <panga-section-header icon="category" title="Options" [count]="options().length" />
        @if (options().length) {
          <ul class="divide-y divide-[var(--border)] mb-4">
            @for (o of options(); track o.id) {
              <li
                class="flex items-center gap-3 py-2.5 px-2 rounded-lg cursor-pointer transition-colors"
                role="button"
                tabindex="0"
                [style.background]="
                  o.id === selectedId()
                    ? 'color-mix(in srgb, var(--brand-500) 8%, transparent)'
                    : ''
                "
                (click)="select(o.id)"
                (keydown.enter)="select(o.id)"
              >
                <span class="material-symbols-outlined text-[var(--brand-500)]">folder</span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-[var(--text)] truncate">{{ o.name }}</p>
                  @if (o.description) {
                    <p class="text-xs text-[var(--text-muted)] truncate">{{ o.description }}</p>
                  }
                </div>
                <button mat-icon-button (click)="removeOption(o, $event)" aria-label="Supprimer">
                  <mat-icon fontSet="material-symbols-outlined" class="text-[var(--danger)]"
                    >delete</mat-icon
                  >
                </button>
              </li>
            }
          </ul>
        } @else {
          <p class="text-sm text-[var(--text-muted)] mb-4">Aucune option.</p>
        }
        <form
          [formGroup]="optionForm"
          (ngSubmit)="addOption()"
          class="flex flex-wrap items-start gap-2"
        >
          <mat-form-field
            appearance="outline"
            subscriptSizing="dynamic"
            class="flex-1 min-w-[160px]"
          >
            <mat-label>Nouvelle option</mat-label>
            <input matInput formControlName="name" placeholder="Scientifique" />
          </mat-form-field>
          <button
            mat-flat-button
            class="!rounded-xl !mt-1"
            type="submit"
            [disabled]="optionForm.invalid"
          >
            Ajouter
          </button>
        </form>
      </section>

      <!-- Sous-options -->
      <section class="panga-card p-5">
        <panga-section-header
          icon="subdirectory_arrow_right"
          [title]="selectedName() ? 'Sous-options · ' + selectedName() : 'Sous-options'"
          [count]="subOptions().length"
        />
        @if (!selectedId()) {
          <p class="text-sm text-[var(--text-muted)]">Sélectionnez une option à gauche.</p>
        } @else {
          @if (subOptions().length) {
            <ul class="divide-y divide-[var(--border)] mb-4">
              @for (s of subOptions(); track s.id) {
                <li class="flex items-center gap-3 py-2.5">
                  <span class="material-symbols-outlined text-[var(--brand-500)]">label</span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-[var(--text)] truncate">{{ s.name }}</p>
                    @if (s.description) {
                      <p class="text-xs text-[var(--text-muted)] truncate">{{ s.description }}</p>
                    }
                  </div>
                  <button mat-icon-button (click)="removeSub(s)" aria-label="Supprimer">
                    <mat-icon fontSet="material-symbols-outlined" class="text-[var(--danger)]"
                      >delete</mat-icon
                    >
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="text-sm text-[var(--text-muted)] mb-4">Aucune sous-option.</p>
          }
          <form
            [formGroup]="subForm"
            (ngSubmit)="addSub()"
            class="flex flex-wrap items-start gap-2"
          >
            <mat-form-field
              appearance="outline"
              subscriptSizing="dynamic"
              class="flex-1 min-w-[160px]"
            >
              <mat-label>Nouvelle sous-option</mat-label>
              <input matInput formControlName="name" placeholder="Bio-chimie" />
            </mat-form-field>
            <button
              mat-flat-button
              class="!rounded-xl !mt-1"
              type="submit"
              [disabled]="subForm.invalid"
            >
              Ajouter
            </button>
          </form>
        }
      </section>
    </div>
  `,
})
export class ClassOptions {
  private readonly classesApi = inject(ClassesService);
  private readonly notify = inject(NotificationService);

  protected readonly options = signal<SchoolOption[]>([]);
  protected readonly subOptions = signal<SchoolSubOption[]>([]);
  protected readonly selectedId = signal('');

  protected readonly selectedName = computed(
    () => this.options().find((o) => o.id === this.selectedId())?.name ?? '',
  );

  protected readonly optionForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly subForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    this.loadOptions();
  }

  private loadOptions(): void {
    this.classesApi.options().subscribe({
      next: (r) => {
        this.options.set(r.items);
        if (!this.selectedId() && r.items.length) {
          this.select(r.items[0].id);
        }
      },
    });
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.classesApi.subOptions(id).subscribe({ next: (r) => this.subOptions.set(r.items) });
  }

  addOption(): void {
    if (this.optionForm.invalid) {
      return;
    }
    this.classesApi.createOption({ name: this.optionForm.getRawValue().name }).subscribe({
      next: () => {
        this.notify.success('Option créée.');
        this.optionForm.reset();
        this.loadOptions();
      },
    });
  }

  removeOption(option: SchoolOption, event: Event): void {
    event.stopPropagation();
    this.classesApi.removeOption(option.id).subscribe({
      next: () => {
        this.notify.success('Option supprimée.');
        if (this.selectedId() === option.id) {
          this.selectedId.set('');
          this.subOptions.set([]);
        }
        this.loadOptions();
      },
    });
  }

  addSub(): void {
    if (this.subForm.invalid || !this.selectedId()) {
      return;
    }
    this.classesApi
      .createSubOption({ optionId: this.selectedId(), name: this.subForm.getRawValue().name })
      .subscribe({
        next: () => {
          this.notify.success('Sous-option créée.');
          this.subForm.reset();
          this.select(this.selectedId());
        },
      });
  }

  removeSub(sub: SchoolSubOption): void {
    this.classesApi.removeSubOption(sub.id).subscribe({
      next: () => {
        this.notify.success('Sous-option supprimée.');
        this.select(this.selectedId());
      },
    });
  }
}
