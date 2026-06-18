import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentService, extractContext } from '../services/student.service';
import { StudentExtrasService } from '../services/student-extras.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyState } from '../../../shared/ui/empty-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { SectionHeader } from '../../../shared/ui/section-header';
import { StatusBadge } from '../../../shared/ui/status-badge';

type Row = Record<string, unknown>;
type Tab = 'annonces' | 'calendrier' | 'bibliotheque' | 'transport' | 'cantine';

@Component({
  selector: 'panga-student-services',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    EmptyState,
    PageHeader,
    SectionHeader,
    StatusBadge,
  ],
  template: `
    <panga-page-header
      icon="apps"
      title="Mes services"
      subtitle="Annonces, calendrier & services scolaires"
    />

    <div
      class="flex gap-1 mb-4 p-1 rounded-xl bg-(--background) w-fit border border-(--border) overflow-x-auto"
    >
      @for (t of tabs; track t.key) {
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          [style.background]="tab() === t.key ? 'var(--surface)' : 'transparent'"
          [style.color]="tab() === t.key ? 'var(--text)' : 'var(--text-muted)'"
          (click)="select(t.key)"
        >
          {{ t.label }}
        </button>
      }
    </div>

    @if (loadingTab()) {
      <div class="flex justify-center py-20"><mat-spinner diameter="40" /></div>
    } @else {
      @switch (tab()) {
        @case ('annonces') {
          <section class="panga-card p-5">
            <panga-section-header
              icon="campaign"
              title="Annonces"
              [count]="announcements().length"
            />
            @if (announcements().length === 0) {
              <panga-empty-state
                icon="campaign"
                title="Aucune annonce"
                description="Aucune annonce pour le moment."
              />
            } @else {
              <div class="space-y-3">
                @for (a of announcements(); track a['id'] || $index) {
                  <div class="rounded-2xl border border-(--border) p-4">
                    <div class="flex items-start justify-between gap-3">
                      <p class="font-medium text-(--text)">{{ a['title'] || 'Annonce' }}</p>
                      @if (a['priority']) {
                        <panga-status-badge
                          [label]="str(a['priority'])"
                          tone="warning"
                          [dot]="false"
                        />
                      }
                    </div>
                    @if (a['content']) {
                      <p class="text-sm text-(--text-muted) mt-1">{{ a['content'] }}</p>
                    }
                    <div class="flex items-center justify-between gap-2 mt-2">
                      <span class="text-xs text-(--text-muted)">
                        @if (a['createdAt']) {
                          {{ asDate(a['createdAt']) | date: 'dd/MM/yyyy' }}
                        }
                      </span>
                      <button mat-button class="rounded-lg!" (click)="acknowledge(a)">
                        <mat-icon fontSet="material-symbols-outlined">done</mat-icon> Accuser
                        réception
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </section>
        }

        @case ('calendrier') {
          <section class="panga-card p-5 mb-6">
            <panga-section-header icon="event" title="Événements" [count]="events().length" />
            @if (events().length === 0) {
              <p class="text-sm text-(--text-muted) py-2">Aucun événement.</p>
            } @else {
              <div class="divide-y divide-(--border) -mx-5">
                @for (e of events(); track e['id'] || $index) {
                  <div class="flex items-center gap-3 px-5 py-2.5">
                    <span class="material-symbols-outlined text-(--brand-500)">event</span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-(--text) truncate">
                        {{ e['title'] || e['name'] }}
                      </p>
                      <p class="text-xs text-(--text-muted)">{{ eventDate(e) }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          </section>
          <section class="panga-card p-5">
            <panga-section-header
              icon="beach_access"
              title="Jours fériés"
              [count]="holidays().length"
            />
            @if (holidays().length === 0) {
              <p class="text-sm text-(--text-muted) py-2">Aucun jour férié.</p>
            } @else {
              <div class="flex flex-wrap gap-2">
                @for (h of holidays(); track h['id'] || $index) {
                  <span
                    class="rounded-xl border border-(--border) px-3 py-1.5 text-sm text-(--text)"
                  >
                    {{ h['name'] || h['title'] }}
                    <span class="text-xs text-(--text-muted)">· {{ eventDate(h) }}</span>
                  </span>
                }
              </div>
            }
          </section>
        }

        @case ('bibliotheque') {
          <section class="panga-card p-5 mb-6">
            <panga-section-header icon="menu_book" title="Catalogue" [count]="books().length">
              <mat-form-field appearance="outline" class="w-55 -mb-5!" subscriptSizing="dynamic">
                <mat-label>Rechercher</mat-label>
                <input matInput [formControl]="bookSearch" (keyup.enter)="searchBooks()" />
              </mat-form-field>
            </panga-section-header>
            @if (books().length === 0) {
              <p class="text-sm text-(--text-muted) py-2">Aucun livre.</p>
            } @else {
              <div class="divide-y divide-(--border) -mx-5">
                @for (b of books(); track b['id'] || $index) {
                  <div class="flex items-center gap-3 px-5 py-2.5">
                    <span class="material-symbols-outlined text-(--brand-500)">book</span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-(--text) truncate">
                        {{ b['title'] }}
                      </p>
                      <p class="text-xs text-(--text-muted) truncate">{{ b['author'] }}</p>
                    </div>
                    <button mat-stroked-button class="rounded-xl!" (click)="reserveBook(b)">
                      Réserver
                    </button>
                  </div>
                }
              </div>
            }
          </section>
          <div class="grid gap-6 lg:grid-cols-2">
            <section class="panga-card p-5">
              <panga-section-header
                icon="auto_stories"
                title="Mes emprunts"
                [count]="borrowed().length"
              />
              @if (borrowed().length === 0) {
                <p class="text-sm text-(--text-muted)">Aucun emprunt en cours.</p>
              } @else {
                @for (b of borrowed(); track $index) {
                  <div
                    class="flex items-center justify-between gap-2 py-2 border-b border-(--border) last:border-0"
                  >
                    <span class="text-sm text-(--text) truncate">{{ bookTitle(b) }}</span>
                    @if (b['dueDate']) {
                      <span class="text-xs text-(--text-muted)"
                        >à rendre le {{ asDate(b['dueDate']) | date: 'dd/MM' }}</span
                      >
                    }
                  </div>
                }
              }
            </section>
            <section class="panga-card p-5">
              <panga-section-header icon="gavel" title="Amendes" [count]="fines().length" />
              @if (fines().length === 0) {
                <p class="text-sm text-(--text-muted)">Aucune amende.</p>
              } @else {
                @for (f of fines(); track $index) {
                  <div
                    class="flex items-center justify-between gap-2 py-2 border-b border-(--border) last:border-0"
                  >
                    <span class="text-sm text-(--text) truncate">{{
                      f['reason'] || 'Amende'
                    }}</span>
                    <span class="text-sm font-semibold text-(--danger)">{{ f['amount'] }}</span>
                  </div>
                }
              }
            </section>
          </div>
        }

        @case ('transport') {
          @if (myTransport()) {
            <section class="panga-card p-5 mb-6">
              <panga-section-header icon="directions_bus" title="Mon transport" />
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <p class="text-xs text-(--text-muted)">Itinéraire</p>
                  <p class="text-sm text-(--text)">
                    {{ str(myTransport()!['routeName'] ?? myTransport()!['route']) || '—' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-(--text-muted)">Arrêt</p>
                  <p class="text-sm text-(--text)">
                    {{ str(myTransport()!['stopName'] ?? myTransport()!['stop']) || '—' }}
                  </p>
                </div>
              </div>
            </section>
          }
          <section class="panga-card p-5">
            <panga-section-header icon="route" title="Itinéraires" [count]="routes().length" />
            @if (routes().length === 0) {
              <panga-empty-state
                icon="directions_bus"
                title="Aucun itinéraire"
                description="Aucun itinéraire de transport."
              />
            } @else {
              <div class="divide-y divide-(--border) -mx-5">
                @for (r of routes(); track r['id'] || $index) {
                  <div class="flex items-center gap-3 px-5 py-2.5">
                    <span class="material-symbols-outlined text-(--brand-500)">route</span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-(--text) truncate">
                        {{ r['name'] || r['routeName'] }}
                      </p>
                      <p class="text-xs text-(--text-muted) truncate">
                        {{ r['description'] || '' }}
                      </p>
                    </div>
                  </div>
                }
              </div>
            }
          </section>
        }

        @case ('cantine') {
          <section class="panga-card p-5 mb-6">
            <panga-section-header icon="restaurant_menu" title="Menus" [count]="menus().length" />
            @if (menus().length === 0) {
              <p class="text-sm text-(--text-muted) py-2">Aucun menu disponible.</p>
            } @else {
              <div class="grid gap-3 sm:grid-cols-2">
                @for (m of menus(); track m['id'] || $index) {
                  <div
                    class="rounded-2xl border border-(--border) p-4 flex items-center justify-between gap-3"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-(--text) truncate">
                        {{ m['name'] || m['title'] }}
                      </p>
                      @if (m['price']) {
                        <p class="text-xs text-(--text-muted)">{{ m['price'] }}</p>
                      }
                    </div>
                    <button mat-stroked-button class="rounded-xl!" (click)="order(m)">
                      Commander
                    </button>
                  </div>
                }
              </div>
            }
          </section>
          <div class="grid gap-6 lg:grid-cols-2">
            <section class="panga-card p-5">
              <panga-section-header
                icon="receipt"
                title="Mes commandes"
                [count]="orders().length"
              />
              @if (orders().length === 0) {
                <p class="text-sm text-(--text-muted)">Aucune commande.</p>
              } @else {
                @for (o of orders(); track $index) {
                  <div
                    class="flex items-center justify-between gap-2 py-2 border-b border-(--border) last:border-0"
                  >
                    <span class="text-sm text-(--text) truncate">{{
                      o['itemName'] || o['name'] || 'Repas'
                    }}</span>
                    <span class="text-xs text-(--text-muted)">{{ o['status'] }}</span>
                  </div>
                }
              }
            </section>
            <section class="panga-card p-5">
              <panga-section-header
                icon="warning"
                title="Mes allergies"
                [count]="allergies().length"
              />
              @if (allergies().length === 0) {
                <p class="text-sm text-(--text-muted)">Aucune allergie déclarée.</p>
              } @else {
                <div class="flex flex-wrap gap-2">
                  @for (al of allergies(); track $index) {
                    <span
                      class="rounded-full bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-(--danger) px-3 py-1 text-xs"
                    >
                      {{ al['name'] || al['allergen'] || al }}
                    </span>
                  }
                </div>
              }
            </section>
          </div>
        }
      }
    }
  `,
})
export class StudentServices {
  private readonly api = inject(StudentService);
  private readonly extras = inject(StudentExtrasService);
  private readonly notify = inject(NotificationService);

  protected readonly tabs = [
    { key: 'annonces' as const, label: 'Annonces' },
    { key: 'calendrier' as const, label: 'Calendrier' },
    { key: 'bibliotheque' as const, label: 'Bibliothèque' },
    { key: 'transport' as const, label: 'Transport' },
    { key: 'cantine' as const, label: 'Cantine' },
  ];
  protected readonly tab = signal<Tab>('annonces');
  protected readonly loadingTab = signal(false);
  private readonly loaded = new Set<Tab>();
  private studentId = '';

  protected readonly announcements = signal<Row[]>([]);
  protected readonly events = signal<Row[]>([]);
  protected readonly holidays = signal<Row[]>([]);
  protected readonly books = signal<Row[]>([]);
  protected readonly borrowed = signal<Row[]>([]);
  protected readonly fines = signal<Row[]>([]);
  protected readonly routes = signal<Row[]>([]);
  protected readonly myTransport = signal<Row | null>(null);
  protected readonly menus = signal<Row[]>([]);
  protected readonly orders = signal<Row[]>([]);
  protected readonly allergies = signal<Row[]>([]);

  protected readonly bookSearch = new FormControl('', { nonNullable: true });

  constructor() {
    this.api.me().subscribe({
      next: (me) => {
        this.studentId = extractContext(me).studentId;
        this.load('annonces');
      },
      error: () => this.load('annonces'),
    });
  }

  select(tab: Tab): void {
    this.tab.set(tab);
    this.load(tab);
  }

  private load(tab: Tab): void {
    if (this.loaded.has(tab)) {
      return;
    }
    this.loaded.add(tab);
    this.loadingTab.set(true);
    const done = () => this.loadingTab.set(false);
    const safe = <T>(o: import('rxjs').Observable<T>, fallback: T) =>
      o.pipe(catchError(() => of(fallback)));

    switch (tab) {
      case 'annonces':
        safe(this.extras.announcements(), []).subscribe((r) => {
          this.announcements.set(r);
          done();
        });
        break;
      case 'calendrier':
        forkJoin({
          events: safe(this.extras.events(), []),
          holidays: safe(this.extras.holidays(), []),
        }).subscribe((r) => {
          this.events.set(r.events);
          this.holidays.set(r.holidays);
          done();
        });
        break;
      case 'bibliotheque':
        forkJoin({
          books: safe(this.extras.books(), []),
          borrowed: this.studentId ? safe(this.extras.borrowedBooks(this.studentId), []) : of([]),
          fines: this.studentId ? safe(this.extras.libraryFines(this.studentId), []) : of([]),
        }).subscribe((r) => {
          this.books.set(r.books);
          this.borrowed.set(r.borrowed);
          this.fines.set(r.fines);
          done();
        });
        break;
      case 'transport':
        forkJoin({
          routes: safe(this.extras.transportRoutes(), []),
          mine: this.studentId ? safe(this.extras.myTransport(this.studentId), null) : of(null),
        }).subscribe((r) => {
          this.routes.set(r.routes);
          this.myTransport.set(r.mine);
          done();
        });
        break;
      case 'cantine':
        forkJoin({
          menus: safe(this.extras.menus(), []),
          orders: this.studentId ? safe(this.extras.myOrders(this.studentId), []) : of([]),
          allergies: this.studentId ? safe(this.extras.myAllergies(this.studentId), []) : of([]),
        }).subscribe((r) => {
          this.menus.set(r.menus);
          this.orders.set(r.orders);
          this.allergies.set(r.allergies);
          done();
        });
        break;
    }
  }

  /* -------------------------------- Actions --------------------------------- */

  acknowledge(a: Row): void {
    if (!a['id']) {
      return;
    }
    this.extras.acknowledgeAnnouncement(String(a['id'])).subscribe({
      next: () => this.notify.success('Réception accusée.'),
    });
  }

  searchBooks(): void {
    this.extras.books(this.bookSearch.value || undefined).subscribe({
      next: (r) => this.books.set(r),
    });
  }

  reserveBook(b: Row): void {
    this.extras.reserve({ bookId: b['id'], resourceId: b['id'] }).subscribe({
      next: () => this.notify.success('Livre réservé.'),
    });
  }

  order(m: Row): void {
    this.extras.orderMeal({ menuId: m['id'], menuItemId: m['id'] }).subscribe({
      next: () => {
        this.notify.success('Commande enregistrée.');
        if (this.studentId) {
          this.extras.myOrders(this.studentId).subscribe({ next: (r) => this.orders.set(r) });
        }
      },
    });
  }

  /* -------------------------------- Helpers --------------------------------- */

  protected str(v: unknown): string {
    return v === null || v === undefined ? '' : String(v);
  }
  protected asDate(v: unknown): string | null {
    return v ? String(v) : null;
  }
  protected eventDate(e: Row): string {
    const d = e['startDate'] ?? e['date'] ?? e['eventDate'] ?? e['start'];
    return d ? String(d).slice(0, 10) : '';
  }
  protected bookTitle(b: Row): string {
    const book = (b['book'] ?? {}) as Record<string, unknown>;
    return String(b['title'] ?? book['title'] ?? 'Livre');
  }
}
