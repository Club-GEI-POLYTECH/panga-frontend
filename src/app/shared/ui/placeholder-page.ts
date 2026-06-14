import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { EmptyState } from './empty-state';

/**
 * Page générique « module en construction ». Branchée sur les routes des
 * modules non encore implémentés (P1+). Le titre vient de `route.data.title`.
 */
@Component({
  selector: 'panga-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState],
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-semibold text-[var(--text)]">{{ title() }}</h1>
    </header>
    <div class="panga-card">
      <panga-empty-state
        icon="construction"
        title="Module en construction"
        description="Cet écran sera livré dans une prochaine phase de la roadmap Panga."
      />
    </div>
  `,
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = toSignal(
    this.route.data.pipe(map((d) => (d['title'] as string) ?? 'Panga')),
    { initialValue: 'Panga' },
  );
}
