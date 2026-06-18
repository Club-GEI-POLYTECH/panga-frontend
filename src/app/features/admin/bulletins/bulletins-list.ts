import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { AcademicsService } from '../services/academics.service';
import { ClassesService } from '../services/classes.service';
import { StudentsService } from '../services/students.service';
import type { Bulletin, ClassInstance, Student } from '../models/admin.models';
import { NotificationService } from '../../../shared/ui/notification.service';
import { Avatar } from '../../../shared/ui/avatar';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge, type BadgeTone } from '../../../shared/ui/status-badge';
import { SchoolYearStore } from '../../../core/school-year/school-year.store';
const TERMS = ['TERM1', 'TERM2', 'TERM3'];

function isPublished(b: Bulletin): boolean {
  return b.published === true || b.status === 'published';
}

@Component({
  selector: 'panga-bulletins-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    Avatar,
    EmptyState,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header icon="description" title="Bulletins" [subtitle]="'Année ' + schoolYear" />

    <div class="panga-card p-5 mb-6 flex flex-wrap items-end gap-3">
      <mat-form-field appearance="outline" class="flex-1 min-w-50">
        <mat-label>Classe</mat-label>
        <mat-select [value]="classId()" (selectionChange)="selectClass($event.value)">
          @for (c of classes(); track c.id) {
            <mat-option [value]="c.id">{{ c.template?.name || c.id }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="min-w-35">
        <mat-label>Trimestre</mat-label>
        <mat-select [value]="term()" (selectionChange)="selectTerm($event.value)">
          @for (t of terms; track t) {
            <mat-option [value]="t">{{ t }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (classId()) {
        <button mat-flat-button class="rounded-xl!" (click)="showForm.set(!showForm())">
          <mat-icon fontSet="material-symbols-outlined">{{
            showForm() ? 'close' : 'note_add'
          }}</mat-icon>
          {{ showForm() ? 'Annuler' : 'Générer un bulletin' }}
        </button>
      }
    </div>

    @if (!classId()) {
      <div class="panga-card">
        <panga-empty-state
          icon="description"
          title="Choisissez une classe"
          description="Sélectionnez une classe et un trimestre."
        />
      </div>
    } @else {
      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="generate()" class="panga-card p-6 mb-6">
          <panga-section-header icon="note_add" title="Générer un bulletin" />
          <div class="grid gap-4 sm:grid-cols-2">
            <mat-form-field appearance="outline">
              <mat-label>Élève</mat-label>
              <mat-select formControlName="studentId">
                @for (s of classStudents(); track s.id) {
                  <mat-option [value]="s.id">{{ studentName(s) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <div class="flex justify-end">
            <button mat-flat-button class="rounded-xl!" type="submit" [disabled]="generating()">
              Générer pour {{ term() }}
            </button>
          </div>
        </form>
      }

      <section class="panga-card p-5">
        <panga-section-header icon="description" title="Bulletins" [count]="bulletins().length" />
        @if (loading()) {
          <p class="text-sm text-(--text-muted) py-6 text-center">Chargement…</p>
        } @else if (bulletins().length === 0) {
          <panga-empty-state
            icon="description"
            title="Aucun bulletin"
            description="Générez les bulletins de la classe."
          />
        } @else {
          <div class="divide-y divide-(--border) -mx-5">
            @for (b of bulletins(); track b.id) {
              <div class="flex items-center gap-4 px-5 py-3">
                <panga-avatar [name]="b.studentName || b.studentId || '?'" [size]="38" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-(--text) truncate">
                    {{ b.studentName || b.studentId || '—' }}
                  </p>
                  <p class="text-xs text-(--text-muted)">
                    {{ b.term || term() }}
                    @if (b.average !== undefined && b.average !== null) {
                      · Moyenne {{ b.average }}
                    }
                    @if (b.rank) {
                      · Rang {{ b.rank }}
                    }
                  </p>
                </div>
                <panga-status-badge
                  [label]="published(b) ? 'Publié' : 'Brouillon'"
                  [tone]="statusTone(b)"
                />
                @if (!published(b)) {
                  <button mat-stroked-button class="rounded-xl!" (click)="publish(b)">
                    Publier
                  </button>
                }
              </div>
            }
          </div>
        }
      </section>
    }
  `,
})
export class BulletinsList {
  private readonly academics = inject(AcademicsService);
  private readonly classesApi = inject(ClassesService);
  private readonly studentsApi = inject(StudentsService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly sy = inject(SchoolYearStore);

  protected readonly schoolYear = this.sy.selected();
  protected readonly terms = TERMS;
  protected readonly classes = signal<ClassInstance[]>([]);
  protected readonly classId = signal('');
  protected readonly term = signal('TERM1');
  protected readonly bulletins = signal<Bulletin[]>([]);
  private readonly allStudents = signal<Student[]>([]);
  protected readonly loading = signal(false);
  protected readonly generating = signal(false);
  protected readonly showForm = signal(false);

  protected readonly published = isPublished;
  protected readonly classStudents = computed(() => {
    const id = this.classId();
    const filtered = this.allStudents().filter((s) => s.classInstanceId === id);
    return filtered.length ? filtered : this.allStudents();
  });

  protected readonly form = this.fb.nonNullable.group({
    studentId: ['', Validators.required],
  });

  constructor() {
    // Recharge classes & élèves à chaque changement d'année (sélecteur global).
    effect(() => {
      this.sy.selected();
      untracked(() => {
        this.classesApi
          .list(this.sy.filter())
          .subscribe({ next: (r) => this.classes.set(r.items) });
        this.studentsApi
          .list({ page: 1, limit: 200, schoolYear: this.sy.filter() })
          .subscribe({ next: (r) => this.allStudents.set(r.items) });
      });
    });
  }

  protected studentName(s: Student): string {
    return `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id;
  }
  protected statusTone(b: Bulletin): BadgeTone {
    return isPublished(b) ? 'success' : 'neutral';
  }

  selectClass(id: string): void {
    this.classId.set(id);
    this.load();
  }
  selectTerm(t: string): void {
    this.term.set(t);
    if (this.classId()) {
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.academics.classBulletins(this.classId(), this.sy.filter(), this.term()).subscribe({
      next: (r) => {
        this.bulletins.set(r.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  generate(): void {
    if (this.form.invalid || this.generating()) {
      this.form.markAllAsTouched();
      return;
    }
    this.generating.set(true);
    this.academics
      .generateBulletin({
        studentId: this.form.getRawValue().studentId,
        classId: this.classId(),
        schoolYear: this.sy.selected(),
        term: this.term(),
        generatePdf: false,
        publishImmediately: false,
      })
      .subscribe({
        next: () => {
          this.generating.set(false);
          this.notify.success('Bulletin généré.');
          this.form.reset();
          this.showForm.set(false);
          this.load();
        },
        error: () => this.generating.set(false),
      });
  }

  publish(b: Bulletin): void {
    this.academics.publishBulletin(b.id).subscribe({
      next: () => {
        this.notify.success('Bulletin publié.');
        this.load();
      },
    });
  }
}
