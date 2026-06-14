import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../core/auth/auth.service';
import { AuthStore } from '../core/auth/auth.store';
import { LoadingService } from '../core/http/loading.service';
import { ThemeService } from '../core/theme.service';
import { navForRole } from './nav.config';
import { SchoolSwitcher } from './school-switcher';

/** Shell applicatif commun à tous les rôles (la nav est filtrée par rôle). */
@Component({
  selector: 'panga-main-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    SchoolSwitcher,
  ],
  templateUrl: './main-shell.html',
})
export class MainShell {
  protected readonly store = inject(AuthStore);
  protected readonly loading = inject(LoadingService);
  protected readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);

  protected readonly opened = signal(true);
  protected readonly navItems = computed(() => navForRole(this.store.role()));

  toggleSidenav(): void {
    this.opened.update((v) => !v);
  }

  toggleLang(): void {
    const next = this.transloco.getActiveLang() === 'fr' ? 'en' : 'fr';
    this.transloco.setActiveLang(next);
  }

  logout(): void {
    this.auth.logout();
  }
}
