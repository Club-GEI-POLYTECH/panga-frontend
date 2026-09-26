import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthStore } from '../../../core/auth/auth.store';
import { CommunicationsService } from '../services/communications.service';
import { SchoolsService } from '../../super-admin/services/schools.service';
import type { PlatformSchool } from '../../super-admin/models/platform.models';
import type { Announcement, UserNotification } from '../models/admin.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Paginator } from '../../../shared/ui/paginator';
import { clientMeta, pageSlice } from '../../../shared/ui/client-pagination';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
import { Skeleton } from '../../../shared/skeleton/skeleton';

const PRIORITY_TONE: Record<string, BadgeTone> = {
  high: 'danger',
  urgent: 'danger',
  normal: 'info',
  low: 'neutral',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
};

const AUDIENCE_LABEL: Record<string, string> = {
  all: 'Tous',
  teachers: 'Enseignants',
  parents: 'Parents',
  students: 'Élèves',
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
    Paginator,
    SectionHeader,
    StatusBadge,
    Skeleton,
  ],
  template: `
    <panga-page-header icon="forum" title="Communications" [subtitle]="headerSubtitle()">
      @if (isAdmin() || (isSuperAdmin() && schoolId())) {
        <button mat-flat-button class="rounded-xl! comms-cta" (click)="showForm.set(!showForm())">
          <mat-icon fontSet="material-symbols-outlined">{{
            showForm() ? 'close' : 'campaign'
          }}</mat-icon>
          {{ showForm() ? 'Annuler' : 'Nouvelle annonce' }}
        </button>
      }
    </panga-page-header>

    @if (isSuperAdmin()) {
      <div class="panga-card p-4 mb-6 flex flex-wrap items-center gap-3">
        <mat-form-field appearance="outline" class="flex-1 min-w-60" subscriptSizing="dynamic">
          <mat-label>École (agir au nom de)</mat-label>
          <mat-select [value]="schoolId()" (selectionChange)="onSchoolChange($event.value)">
            @for (s of schools(); track s.id) {
              <mat-option [value]="s.id">{{ schoolLabel(s) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <p class="text-xs text-(--text-muted)">
          Le super_admin publie/lit les annonces au nom de l'école choisie.
        </p>
      </div>
    }

    @if (showForm()) {
      <form [formGroup]="form" (ngSubmit)="publish()" class="panga-card p-6 mb-6">
        <panga-section-header icon="campaign" title="Nouvelle annonce" />
        <div class="grid gap-4">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Titre</mat-label>
            <input matInput formControlName="title" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Contenu</mat-label>
            <textarea matInput rows="3" formControlName="content"></textarea>
          </mat-form-field>
          <div class="grid gap-4 sm:grid-cols-2">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Audience</mat-label>
              <mat-select formControlName="targetAudience">
                <mat-option value="all">Tous</mat-option>
                <mat-option value="teachers">Enseignants</mat-option>
                <mat-option value="parents">Parents</mat-option>
                <mat-option value="students">Élèves</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
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
          <button
            mat-flat-button
            class="rounded-xl! comms-cta"
            type="submit"
            [disabled]="submitting()"
          >
            {{ submitting() ? 'Publication…' : 'Publier' }}
          </button>
        </div>
      </form>
    }

    <div class="grid gap-6 lg:grid-cols-3">
      <section class="lg:col-span-2">
        <panga-section-header icon="campaign" title="Annonces" [count]="announcements().length" />
        @if (loadingAnnouncements()) {
          <div class="flex flex-col gap-3">
            @for (_ of [1, 2, 3]; track $index) {
              <div class="panga-card p-5 space-y-3">
                <panga-skeleton width="55%" height="1.1rem" />
                <panga-skeleton width="90%" height="0.85rem" />
                <panga-skeleton width="40%" height="0.75rem" />
              </div>
            }
          </div>
        } @else if (announcements().length) {
          <mat-form-field appearance="outline" class="w-full mb-3" subscriptSizing="dynamic">
            <mat-label>Rechercher</mat-label>
            <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
            <input matInput [formControl]="searchCtrl" placeholder="Titre, contenu…" />
          </mat-form-field>
          <div class="flex flex-col gap-3">
            @for (a of visibleAnnouncements(); track a.id) {
              <div class="announce-card panga-card p-5">
                <div class="flex items-start justify-between gap-3">
                  <p class="font-semibold text-(--text)">{{ a.title || 'Annonce' }}</p>
                  @if (a.priority) {
                    <panga-status-badge
                      [label]="priorityLabel(a.priority)"
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
                      {{ audienceLabel(a.targetAudience) }}
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
          <div class="panga-card mt-3">
            <panga-paginator [meta]="pageMeta()" (pageChange)="page.set($event)" />
          </div>
        } @else if (isSuperAdmin() && !schoolId()) {
          <div class="panga-card">
            <panga-empty-state
              icon="apartment"
              title="Choisissez une école"
              description="Sélectionnez une école ci-dessus pour voir et publier ses annonces."
            />
          </div>
        } @else {
          <div class="panga-card">
            <panga-empty-state
              icon="campaign"
              title="Aucune annonce"
              description="Aucune annonce publiée."
              [actionLabel]="isAdmin() || (isSuperAdmin() && schoolId()) ? 'Nouvelle annonce' : ''"
              (action)="showForm.set(true)"
            />
          </div>
        }
      </section>

      <section>
        <panga-section-header icon="notifications" title="Mes notifications" />
        <div class="panga-card divide-y divide-(--border)">
          @for (n of notifications(); track n.id) {
            <div class="notif-row px-4 py-3">
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
  styles: [
    `
      button.comms-cta {
        background: var(--brand-gradient) !important;
        color: #ffffff !important;
      }
      button.comms-cta .mat-icon,
      button.comms-cta .material-symbols-outlined {
        color: #ffffff !important;
      }
      button.comms-cta:disabled {
        opacity: 0.55;
      }
      .announce-card,
      .notif-row {
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease,
          background 0.15s ease;
      }
      .announce-card:hover {
        border-color: color-mix(in srgb, var(--brand-500) 40%, var(--border));
        box-shadow: 0 12px 28px -18px color-mix(in srgb, var(--brand-700) 55%, transparent);
      }
      .notif-row:hover {
        background: color-mix(in srgb, var(--brand-500) 4%, transparent);
      }
    `,
  ],
})
export class Communications {
  private readonly comms = inject(CommunicationsService);
  private readonly schoolsApi = inject(SchoolsService);
  private readonly store = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  /** Super_admin : agit « au nom » d'une école → sélecteur + ?schoolId=. */
  protected readonly isSuperAdmin = computed(() => this.store.role() === 'super_admin');
  protected readonly schools = signal<PlatformSchool[]>([]);
  protected readonly schoolId = signal('');

  protected readonly announcements = signal<Announcement[]>([]);
  protected readonly loadingAnnouncements = signal(false);
  /** Pagination + recherche client de la liste des annonces. */
  protected readonly page = signal(1);
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });
  protected readonly search = signal('');
  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) {
      return this.announcements();
    }
    return this.announcements().filter((a) =>
      `${a.title ?? ''} ${a.content ?? ''}`.toLowerCase().includes(q),
    );
  });
  protected readonly pageMeta = computed(() => clientMeta(this.filtered().length, this.page()));
  protected readonly visibleAnnouncements = computed(() => pageSlice(this.filtered(), this.page()));
  protected readonly notifications = signal<UserNotification[]>([]);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);
  protected readonly isAdmin = computed(() => this.store.role() === 'admin');

  protected readonly headerSubtitle = computed(() => {
    const n = this.announcements().length;
    if (this.isSuperAdmin()) {
      const school = this.schools().find((s) => s.id === this.schoolId());
      if (school) {
        return `Annonces · ${this.schoolLabel(school)}${n ? ` · ${n}` : ''}`;
      }
      return 'Annonces et notifications · Choisissez une école';
    }
    return n ? `Annonces et notifications · ${n}` : 'Annonces et notifications';
  });

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    content: ['', Validators.required],
    targetAudience: ['all', Validators.required],
    priority: ['normal', Validators.required],
  });

  constructor() {
    this.comms.myNotifications().subscribe({ next: (r) => this.notifications.set(r.items) });
    if (this.isSuperAdmin()) {
      // Charge les écoles ; les annonces attendent qu'une école soit choisie.
      this.schoolsApi
        .list({ page: 1, limit: 200 })
        .subscribe({ next: (r) => this.schools.set(r.items) });
    } else {
      this.loadAnnouncements();
    }
    this.searchCtrl.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe((v) => {
      this.search.set(v.trim());
      this.page.set(1);
    });
  }

  protected priorityTone(p: string): BadgeTone {
    return PRIORITY_TONE[p] ?? 'neutral';
  }
  protected priorityLabel(p: string): string {
    return PRIORITY_LABEL[p] ?? p;
  }
  protected audienceLabel(a: string): string {
    return AUDIENCE_LABEL[a] ?? a;
  }

  /** École cible passée aux endpoints (super_admin uniquement). */
  private targetSchoolId(): string | undefined {
    return this.isSuperAdmin() ? this.schoolId() || undefined : undefined;
  }

  protected schoolLabel(s: PlatformSchool): string {
    const name = s.displayName || s.name || s.code;
    if (!name) {
      return 'École';
    }
    return s.code && s.code !== name ? `${name} (${s.code})` : name;
  }

  onSchoolChange(id: string): void {
    this.schoolId.set(id);
    this.showForm.set(false);
    this.loadAnnouncements();
  }

  private loadAnnouncements(): void {
    // Super_admin sans école sélectionnée : ne pas appeler (400 garanti).
    if (this.isSuperAdmin() && !this.schoolId()) {
      this.announcements.set([]);
      this.loadingAnnouncements.set(false);
      return;
    }
    this.loadingAnnouncements.set(true);
    this.comms.announcements(this.targetSchoolId()).subscribe({
      next: (r) => {
        this.announcements.set(r.items);
        this.page.set(1);
        this.loadingAnnouncements.set(false);
      },
      error: () => {
        this.announcements.set([]);
        this.loadingAnnouncements.set(false);
      },
    });
  }

  publish(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.comms.createAnnouncement(this.form.getRawValue(), this.targetSchoolId()).subscribe({
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
