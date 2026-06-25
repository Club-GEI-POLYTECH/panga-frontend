import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
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
import { AvatarService } from '../core/auth/avatar.service';
import { LoadingService } from '../core/http/loading.service';
import { SchoolYearStore } from '../core/school-year/school-year.store';
import { ThemeService } from '../core/theme.service';
import { Avatar } from '../shared/ui/avatar';
import {
  NotificationsStore,
  isNotifRead,
  isSecurityNotif,
  type AppNotification,
} from '../core/notifications/notifications.store';
import { navSectionsForRole } from './nav.config';
import { SchoolSwitcher } from './school-switcher';

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
  protected readonly avatars = inject(AvatarService);
  protected readonly loading = inject(LoadingService);
  protected readonly theme = inject(ThemeService);
  protected readonly notifs = inject(NotificationsStore);
  protected readonly sy = inject(SchoolYearStore);
  private readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BreakpointObserver);

  /** Super_admin = contexte cross-tenant : pas d'année scolaire forcée. */
  protected readonly isSuperAdmin = computed(() => this.store.role() === 'super_admin');

  /** Sidebar réduite en rail (icônes seules). */
  protected readonly collapsed = signal(false);
  /** < 768px : la barre devient un tiroir en superposition. */
  protected readonly isMobile = signal(false);
  /** État d'ouverture du tiroir mobile (overlay). */
  protected readonly mobileOpen = signal(false);

  /** Rail (icônes seules) : uniquement hors mobile (le tiroir mobile est complet). */
  protected readonly rail = computed(() => this.collapsed() && !this.isMobile());
  protected readonly sidenavMode = computed<'over' | 'side'>(() =>
    this.isMobile() ? 'over' : 'side',
  );
  protected readonly sidenavOpened = computed(() => (this.isMobile() ? this.mobileOpen() : true));
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
    // (avatars.myUrl est calculé depuis le store → pas d'action explicite.)
    this.auth.loadMe().subscribe({ error: () => undefined });
    // Notifications in-app (cloche) : alertes sécurité, etc.
    this.notifs.load();
    // Année scolaire courante de l'école (hors super_admin cross-tenant).
    if (this.store.role() !== 'super_admin') {
      this.sy.load();
    }

    // Responsive : mobile = tiroir overlay ; tablette = rail ; desktop = étendu.
    this.breakpoints
      .observe('(max-width: 767.98px)')
      .pipe(takeUntilDestroyed())
      .subscribe((r) => {
        this.isMobile.set(r.matches);
        if (r.matches) {
          this.mobileOpen.set(false);
        }
      });
    this.breakpoints
      .observe('(max-width: 1023.98px)')
      .pipe(takeUntilDestroyed())
      .subscribe((r) => this.collapsed.set(r.matches));
  }

  protected isUnread(n: AppNotification): boolean {
    return !isNotifRead(n);
  }
  protected notifIcon(n: AppNotification): string {
    return isSecurityNotif(n) ? 'gpp_maybe' : 'notifications';
  }
  protected notifColor(n: AppNotification): string {
    return isSecurityNotif(n) ? 'var(--danger)' : 'var(--brand-500)';
  }
  protected onNotif(n: AppNotification): void {
    this.notifs.markRead(n.id);
  }

  toggleSidenav(): void {
    if (this.isMobile()) {
      this.mobileOpen.update((v) => !v);
    } else {
      this.collapsed.update((v) => !v);
    }
  }

  /** Ferme le tiroir après navigation sur mobile. */
  closeOnMobile(): void {
    if (this.isMobile()) {
      this.mobileOpen.set(false);
    }
  }

  setLang(lang: string): void {
    this.transloco.setActiveLang(lang);
    this.lang.set(lang);
  }

  /**
   * Change l'année scolaire active. Les écrans réagissent via un `effect` sur
   * `SchoolYearStore.selected` et rejouent leurs appels (sans rechargement de
   * route). Les GET de liste n'envoient l'année que si elle diffère de l'année
   * courante de l'école.
   */
  setYear(year: string): void {
    this.sy.setSelected(year);
  }

  /** Année courante pour le pied de page (évalué une fois). */
  protected readonly year = new Date().getFullYear();

  logout(): void {
    this.auth.logout().subscribe({
      complete: () => void this.router.navigateByUrl('/auth/login'),
    });
  }
}
