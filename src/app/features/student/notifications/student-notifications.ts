import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentService } from '../services/student.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';

type Row = Record<string, unknown>;

@Component({
  selector: 'panga-student-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyState,
    PageHeader,
  ],
  template: `
    <panga-page-header icon="notifications" title="Notifications" subtitle="Vos alertes & messages">
      @if (unreadCount() > 0) {
        <button mat-stroked-button class="rounded-xl!" (click)="markAll()">
          <mat-icon fontSet="material-symbols-outlined">done_all</mat-icon> Tout marquer comme lu
        </button>
      }
    </panga-page-header>

    @if (loading()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else if (items().length === 0) {
      <div class="panga-card">
        <panga-empty-state
          icon="notifications_off"
          title="Aucune notification"
          description="Vous êtes à jour."
        />
      </div>
    } @else {
      <div class="panga-card divide-y divide-(--border)">
        @for (n of items(); track n['id'] || $index) {
          <button
            type="button"
            class="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-(--background) transition-colors"
            (click)="open(n)"
          >
            <span
              class="mt-1 h-2 w-2 rounded-full shrink-0"
              [style.background]="isRead(n) ? 'transparent' : 'var(--brand-500)'"
            ></span>
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style="background: color-mix(in srgb, var(--brand-500) 12%, transparent)"
            >
              <span class="material-symbols-outlined text-[18px] text-(--brand-700)">{{
                icon(n)
              }}</span>
            </span>
            <div class="min-w-0 flex-1">
              <p
                class="text-sm truncate"
                [class.font-semibold]="!isRead(n)"
                [class.font-medium]="isRead(n)"
                [style.color]="'var(--text)'"
              >
                {{ title(n) }}
              </p>
              @if (message(n)) {
                <p class="text-xs text-(--text-muted) line-clamp-2">{{ message(n) }}</p>
              }
            </div>
            @if (n['createdAt']) {
              <span class="text-xs text-(--text-muted) shrink-0">
                {{ asDate(n['createdAt']) | date: 'dd/MM HH:mm' }}
              </span>
            }
          </button>
        }
      </div>
    }
  `,
})
export class StudentNotifications {
  private readonly api = inject(StudentService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly items = signal<Row[]>([]);
  protected readonly unreadCount = computed(
    () => this.items().filter((n) => !this.isRead(n)).length,
  );

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.notifications().subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(n: Row): void {
    if (this.isRead(n) || !n['id']) {
      return;
    }
    this.api.markNotificationRead(String(n['id'])).subscribe({
      next: () =>
        this.items.update((list) => list.map((x) => (x === n ? { ...x, read: true } : x))),
    });
  }

  markAll(): void {
    this.api.markAllNotificationsRead().subscribe({
      next: () => {
        this.notify.success('Toutes les notifications sont lues.');
        this.load();
      },
    });
  }

  /* -------------------------------- Helpers --------------------------------- */

  protected isRead(n: Row): boolean {
    return n['read'] === true || n['isRead'] === true || !!n['readAt'];
  }
  protected title(n: Row): string {
    return String(n['title'] ?? n['subject'] ?? 'Notification');
  }
  protected message(n: Row): string {
    return String(n['message'] ?? n['body'] ?? n['content'] ?? '');
  }
  protected icon(n: Row): string {
    const type = String(n['type'] ?? '').toLowerCase();
    if (type.includes('payment')) return 'payments';
    if (type.includes('grade') || type.includes('note')) return 'grade';
    if (type.includes('attendance') || type.includes('absence')) return 'fact_check';
    if (type.includes('bulletin') || type.includes('report')) return 'description';
    if (type.includes('exam')) return 'quiz';
    return 'notifications';
  }
  protected asDate(v: unknown): string | null {
    return v ? String(v) : null;
  }
}
