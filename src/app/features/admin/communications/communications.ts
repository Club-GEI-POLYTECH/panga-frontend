import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthStore } from '../../../core/auth/auth.store';
import { CommunicationsService } from '../services/communications.service';
import type { Announcement, UserNotification } from '../models/admin.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';

const PRIORITY_TONE: Record<string, BadgeTone> = {
  high: 'danger',
  urgent: 'danger',
  normal: 'info',
  low: 'neutral',
};

@Component({
  selector: 'panga-communications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    EmptyState,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header icon="forum" title="Communications" subtitle="Annonces et notifications">
      @if (isAdmin()) {
        <button mat-flat-button class="rounded-xl!" (click)="showForm.set(!showForm())">
          <mat-icon fontSet="material-symbols-outlined">{{
            showForm() ? 'close' : 'campaign'
          }}</mat-icon>
          {{ showForm() ? 'Annuler' : 'Nouvelle annonce' }}
        </button>
      }
    </panga-page-header>

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="publish()" class="panga-card p-6 mb-6">
        <panga-section-header icon="campaign" title="Nouvelle annonce" />
        <div class="grid gap-4">
          <mat-form-field appearance="outline">
            <mat-label>Titre</mat-label>
            <input matInput formControlName="title" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Contenu</mat-label>
            <textarea matInput rows="3" formControlName="content"></textarea>
          </mat-form-field>
          <div class="grid gap-4 sm:grid-cols-2">
            <mat-form-field appearance="outline">
              <mat-label>Audience</mat-label>
              <mat-select formControlName="targetAudience">
                <mat-option value="all">Tous</mat-option>
                <mat-option value="teachers">Enseignants</mat-option>
                <mat-option value="parents">Parents</mat-option>
                <mat-option value="students">Élèves</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Priorité</mat-label>
              <mat-select formControlName="priority">
                <mat-option value="low">Basse</mat-option>
                <mat-option value="normal">Normale</mat-option>
                <mat-option value="high">Haute</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
        <div class="flex justify-end mt-2">
          <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="submitting()">
            Publier
          </button>
        </div>
      </form>
    }

    <div class="grid gap-6 lg:grid-cols-3">
      <section class="lg:col-span-2">
        <panga-section-header icon="campaign" title="Annonces" [count]="announcements().length" />
        @if (announcements().length) {
          <div class="flex flex-col gap-3">
            @for (a of announcements(); track a.id) {
              <div class="panga-card p-5">
                <div class="flex items-start justify-between gap-3">
                  <p class="font-semibold text-(--text)">{{ a.title || 'Annonce' }}</p>
                  @if (a.priority) {
                    <panga-status-badge
                      [label]="a.priority"
                      [tone]="priorityTone(a.priority)"
                      [dot]="false"
                    />
                  }
                </div>
                @if (a.content) {
                  <p class="text-sm text-(--text-muted) mt-1.5 whitespace-pre-line">
                    {{ a.content }}
                  </p>
                }
                <div
                  class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--text-muted)"
                >
                  @if (a.targetAudience) {
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">group</span>
                      {{ a.targetAudience }}
                    </span>
                  }
                  @if (a.createdAt) {
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">schedule</span>
                      {{ a.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="panga-card">
            <panga-empty-state
              icon="campaign"
              title="Aucune annonce"
              description="Aucune annonce publiée."
            />
          </div>
        }
      </section>

      <section>
        <panga-section-header icon="notifications" title="Mes notifications" />
        <div class="panga-card divide-y divide-(--border)">
          @for (n of notifications(); track n.id) {
            <div class="px-4 py-3">
              <div class="flex items-center gap-2">
                @if (!n.read) {
                  <span
                    class="h-2 w-2 rounded-full shrink-0"
                    style="background: var(--brand-500)"
                  ></span>
                }
                <p class="text-sm font-medium text-(--text) truncate">
                  {{ n.title || n.type || 'Notification' }}
                </p>
              </div>
              @if (n.message) {
                <p class="text-xs text-(--text-muted) mt-0.5">{{ n.message }}</p>
              }
              @if (n.createdAt) {
                <p class="text-[11px] text-(--text-muted) mt-1">
                  {{ n.createdAt | date: 'dd/MM HH:mm' }}
                </p>
              }
            </div>
          } @empty {
            <div class="px-4 py-8 text-center text-sm text-(--text-muted)">
              Aucune notification.
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class Communications {
  private readonly comms = inject(CommunicationsService);
  private readonly store = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly announcements = signal<Announcement[]>([]);
  protected readonly notifications = signal<UserNotification[]>([]);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);
  protected readonly isAdmin = computed(() => this.store.role() === 'admin');

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    content: ['', Validators.required],
    targetAudience: ['all', Validators.required],
    priority: ['normal', Validators.required],
  });

  constructor() {
    this.loadAnnouncements();
    this.comms.myNotifications().subscribe({ next: (r) => this.notifications.set(r.items) });
  }

  protected priorityTone(p: string): BadgeTone {
    return PRIORITY_TONE[p] ?? 'neutral';
  }

  private loadAnnouncements(): void {
    this.comms.announcements().subscribe({ next: (r) => this.announcements.set(r.items) });
  }

  publish(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.comms.createAnnouncement(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success('Annonce publiée.');
        this.form.reset({ targetAudience: 'all', priority: 'normal' });
        this.showForm.set(false);
        this.loadAnnouncements();
      },
      error: () => this.submitting.set(false),
    });
  }
}
