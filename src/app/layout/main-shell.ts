import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../core/auth/auth.service';
import { AuthStore } from '../core/auth/auth.store';
import { LoadingService } from '../core/http/loading.service';
import { ThemeService } from '../core/theme.service';
import { Avatar } from '../shared/ui/avatar';
import { NotificationService, type Tone } from '../shared/ui/notification.service';
import { navSectionsForRole } from './nav.config';
import { SchoolSwitcher } from './school-switcher';

const TONE_COLOR: Record<Tone, string> = {
  success: 'var(--success)',
  error: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--brand-500)',
};

/** Shell applicatif commun à tous les rôles (la nav est filtrée par rôle). */
@Component({
  selector: 'panga-main-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    Avatar,
    SchoolSwitcher,
  ],
  templateUrl: './main-shell.html',
})
export class MainShell {
  protected readonly store = inject(AuthStore);
  protected readonly loading = inject(LoadingService);
  protected readonly theme = inject(ThemeService);
  protected readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  /** Sidebar réduite en rail (icônes seules) plutôt que masquée. */
  protected readonly collapsed = signal(false);
  protected readonly lang = signal(this.transloco.getActiveLang());
  protected readonly navSections = computed(() => navSectionsForRole(this.store.role()));
  protected readonly roleKey = computed(() => `roles.${this.store.role()}`);
  protected readonly email = computed(() => this.store.user()?.email ?? '');
  protected readonly location = computed(() => {
    const u = this.store.user();
    return [u?.city, u?.country].filter(Boolean).join(', ');
  });
  protected readonly isActive = computed(() => this.store.user()?.status === 'active');

  constructor() {
    // Profil complet (auth/profile) pour enrichir l'en-tête / la barre latérale.
    this.auth.loadMe().subscribe({ error: () => undefined });
  }

  protected toneColor(tone: Tone): string {
    return TONE_COLOR[tone];
  }

  toggleSidenav(): void {
    this.collapsed.update((v) => !v);
  }

  setLang(lang: string): void {
    this.transloco.setActiveLang(lang);
    this.lang.set(lang);
  }

  /** Année courante pour le pied de page (évalué une fois). */
  protected readonly year = new Date().getFullYear();

  logout(): void {
    this.auth.logout().subscribe({
      complete: () => void this.router.navigateByUrl('/auth/login'),
    });
  }
}
