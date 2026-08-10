import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ExamsService } from '../../admin/services/exams.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { ExamRoom } from '../../admin/models/exam.models';
import { ROOM_TYPE_OPTIONS, examLabel } from '../../../core/models/exam.enums';

/**
 * Salles où l'enseignant est affecté comme surveillant (`GET /exams/rooms`,
 * scopé automatiquement côté serveur) — pour savoir où se rendre sans
 * chercher dans le roster complet d'une session.
 */
@Component({
  selector: 'panga-teacher-supervisions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState, PageHeader, SectionHeader, StatusBadge],
  template: `
    <panga-page-header
      icon="meeting_room"
      title="Mes surveillances"
      subtitle="Salles où vous êtes affecté comme surveillant"
    />

    <section class="panga-card p-5">
      <panga-section-header icon="meeting_room" title="Salles" [count]="rooms().length" />
      @if (loading()) {
        <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
      } @else if (rooms().length === 0) {
        <panga-empty-state
          icon="meeting_room"
          title="Aucune surveillance"
          description="Les salles où vous êtes affecté comme surveillant apparaîtront ici."
        />
      } @else {
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (r of rooms(); track r.id) {
            <div class="rounded-2xl border border-(--border) p-4">
              <div class="flex items-center justify-between gap-2">
                <p class="font-medium text-(--text) truncate">{{ r.roomName || r.roomNumber }}</p>
                <panga-status-badge
                  [label]="roomTypeLabel(r.roomType)"
                  tone="neutral"
                  [dot]="false"
                />
              </div>
              <p class="text-xs text-(--text-muted) mt-1">
                N° {{ r.roomNumber }} · {{ r.capacity }} places
                @if (r.building) {
                  · {{ r.building }}
                }
              </p>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class TeacherSupervisions {
  private readonly examsApi = inject(ExamsService);

  protected readonly rooms = signal<ExamRoom[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.examsApi.rooms().subscribe({
      next: (r) => {
        this.rooms.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected roomTypeLabel(t: string | undefined): string {
    return examLabel(ROOM_TYPE_OPTIONS, t);
  }
}
