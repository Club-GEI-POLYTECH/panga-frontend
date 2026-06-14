import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ParentsService } from '../services/parents.service';
import type { Parent } from '../models/admin.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { SkeletonTable } from '../../../shared/skeleton/skeleton-table';

@Component({
  selector: 'panga-parents-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    Avatar,
    EmptyState,
    KpiCard,
    PageHeader,
    SectionHeader,
    SkeletonTable,
  ],
  template: `
    <panga-page-header icon="family_restroom" title="Parents" subtitle="Responsables des élèves">
      <button mat-flat-button class="!rounded-xl" (click)="showForm.set(!showForm())">
        <mat-icon fontSet="material-symbols-outlined">{{
          showForm() ? 'close' : 'person_add'
        }}</mat-icon>
        {{ showForm() ? 'Annuler' : 'Nouveau parent' }}
      </button>
    </panga-page-header>

    <section class="grid gap-4 grid-cols-2 sm:grid-cols-3 mb-6">
      <panga-kpi-card label="Parents" [value]="parents().length" icon="family_restroom" />
    </section>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="create()" class="panga-card p-6 mb-6">
        <panga-section-header icon="person_add" title="Nouveau parent" />
        <div class="grid gap-4 sm:grid-cols-2">
          <mat-form-field appearance="outline">
            <mat-label>Prénom</mat-label>
            <input matInput formControlName="firstName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput formControlName="lastName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>E-mail</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Téléphone</mat-label>
            <input matInput formControlName="phone" />
          </mat-form-field>
        </div>
        <div class="flex justify-end">
          <button mat-flat-button class="!rounded-xl" type="submit" [disabled]="submitting()">
            Ajouter
          </button>
        </div>
      </form>
    }

    @if (loading()) {
      <panga-skeleton-table />
    } @else if (parents().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="family_restroom"
          title="Aucun parent"
          description="Ajoutez votre premier parent."
          actionLabel="Nouveau parent"
          (action)="showForm.set(true)"
        />
      </div>
    } @else {
      <div class="panga-card divide-y divide-[var(--border)]">
        @for (p of parents(); track p.id) {
          <div class="flex items-center gap-4 px-4 sm:px-5 py-3.5">
            <panga-avatar [name]="fullName(p)" [size]="44" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-[var(--text)] truncate">{{ fullName(p) || '—' }}</p>
              <div
                class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--text-muted)]"
              >
                @if (p.email) {
                  <span class="inline-flex items-center gap-1 truncate">
                    <span class="material-symbols-outlined text-[14px]">mail</span> {{ p.email }}
                  </span>
                }
                @if (p.phone) {
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">call</span> {{ p.phone }}
                  </span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ParentsList {
  private readonly parentsApi = inject(ParentsService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly parents = signal<Parent[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

  constructor() {
    this.load();
  }

  protected fullName(p: Parent): string {
    return `${p.firstName || ''} ${p.lastName || ''}`.trim();
  }

  private load(): void {
    this.loading.set(true);
    this.parentsApi.list().subscribe({
      next: (res) => {
        this.parents.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.parentsApi.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Parent ajouté.');
        this.form.reset();
        this.showForm.set(false);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}
