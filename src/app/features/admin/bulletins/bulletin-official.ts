import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { MinisterialSnapshot, SnapshotLine } from '../models/admin.models';

interface TermCol {
  term: string;
  label: string;
}
interface Cell {
  p1: number | null;
  p2: number | null;
  exam: number | null;
  trim: number | null;
  percent: number | null;
}
interface GridRow {
  line: SnapshotLine;
  cells: (Cell | null)[];
}

const TERM_ORDER = ['TERM1', 'TERM2', 'TERM3', 'SEMESTER1', 'SEMESTER2'];
const TERM_LABEL: Record<string, string> = {
  TERM1: 'Premier trimestre',
  TERM2: 'Deuxième trimestre',
  TERM3: 'Troisième trimestre',
  SEMESTER1: 'Premier semestre',
  SEMESTER2: 'Deuxième semestre',
};

/**
 * Rendu du bulletin officiel RDC à partir du `ministerialSnapshot`.
 * Points bruts par période/examen/trimestre (primaire), maxima et synthèse
 * (pourcentage, place, effectif, décision). La structure back est **plate**
 * (un seul domaine `PROGRAMME_NATIONAL`) : pas de regroupement par domaine.
 */
@Component({
  selector: 'panga-bulletin-official',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = snapshot();
    <div class="rounded-2xl border border-(--border) bg-(--surface) p-5">
      <!-- En-tête identité -->
      <div class="mb-4 border-b border-(--border) pb-3">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-(--text-muted)">
              Bulletin — {{ s.presetTitleFr || 'Programme national' }}
            </p>
            <p class="text-lg font-semibold text-(--text)">{{ studentName() || '—' }}</p>
            <p class="text-xs text-(--text-muted)">
              {{ className() }} · Année {{ schoolYear() }}
              <span
                class="ml-1 rounded border border-(--warning) px-1.5 py-0.5 text-[10px] text-(--warning)"
                >Aperçu — non enregistré</span
              >
            </p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-semibold" [style.color]="pctColor(generalPercent())">
              {{ pctText(generalPercent()) }}
            </p>
            <p class="text-xs text-(--text-muted)">
              Place {{ s.synthese?.place ?? '—' }} / {{ s.synthese?.nombreEleves ?? '—' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Tableau des branches (structure officielle : 6 colonnes/trimestre) -->
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse text-sm">
          <thead>
            <tr class="text-xs text-(--text-muted)">
              <th class="border border-(--border) px-2 py-1 text-left" rowspan="2">Branches</th>
              <th class="border border-(--border) px-2 py-1 text-right" rowspan="2">Max/pér.</th>
              @for (tc of termCols(); track tc.term) {
                <th class="border border-(--border) px-2 py-1 text-center" colspan="6">
                  {{ tc.label }}
                </th>
              }
              <th class="border border-(--border) px-2 py-1 text-center" colspan="2">Total</th>
            </tr>
            <tr class="text-[11px] text-(--text-muted)">
              @for (tc of termCols(); track tc.term; let i = $index) {
                <th class="border border-(--border) px-2 py-1 text-right">{{ p1Label(i) }}</th>
                <th class="border border-(--border) px-2 py-1 text-right">{{ p2Label(i) }}</th>
                <th class="border border-(--border) px-2 py-1 text-right">Max ex.</th>
                <th class="border border-(--border) px-2 py-1 text-right">Pts obt.</th>
                <th class="border border-(--border) px-2 py-1 text-right">Max trim.</th>
                <th class="border border-(--border) px-2 py-1 text-right">Pts obt.</th>
              }
              <th class="border border-(--border) px-2 py-1 text-right">Max.</th>
              <th class="border border-(--border) px-2 py-1 text-right">Pts obt.</th>
            </tr>
          </thead>
          <tbody>
            @for (row of grid(); track row.line.programCode || $index) {
              <tr>
                <td class="border border-(--border) px-2 py-1 whitespace-nowrap text-(--text)">
                  {{ row.line.labelFr }}
                </td>
                <td class="border border-(--border) px-2 py-1 text-right text-(--text-muted)">
                  {{ n(row.line.maxPerPeriod) }}
                </td>
                @for (c of row.cells; track $index) {
                  <td class="border border-(--border) px-2 py-1 text-right">{{ n(c?.p1) }}</td>
                  <td class="border border-(--border) px-2 py-1 text-right">{{ n(c?.p2) }}</td>
                  <td class="border border-(--border) px-2 py-1 text-right text-(--text-muted)">
                    {{ n(lineMaxExam(row.line)) }}
                  </td>
                  <td class="border border-(--border) px-2 py-1 text-right">{{ n(c?.exam) }}</td>
                  <td class="border border-(--border) px-2 py-1 text-right text-(--text-muted)">
                    {{ n(lineMaxTrim(row.line)) }}
                  </td>
                  <td
                    class="border border-(--border) px-2 py-1 text-right font-semibold text-(--text)"
                  >
                    {{ n(c?.trim) }}
                  </td>
                }
                <td class="border border-(--border) px-2 py-1 text-right text-(--text-muted)">
                  {{ n(lineMaxYear(row.line)) }}
                </td>
                <td
                  class="border border-(--border) px-2 py-1 text-right font-semibold text-(--text)"
                >
                  {{ n(rowYearTotal(row)) }}
                </td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="text-xs font-medium text-(--text-muted)">
              <td class="border border-(--border) px-2 py-1" colspan="2">Maxima généraux</td>
              @for (tc of termCols(); track tc.term) {
                <td class="border border-(--border) px-2 py-1"></td>
                <td class="border border-(--border) px-2 py-1"></td>
                <td class="border border-(--border) px-2 py-1 text-right">
                  {{ n(s.maximaGeneraux?.sumMaxExam ?? s.maximaGeneraux?.sumMaxExamPerSemester) }}
                </td>
                <td class="border border-(--border) px-2 py-1"></td>
                <td class="border border-(--border) px-2 py-1 text-right">
                  {{ n(s.maximaGeneraux?.sumMaxTrimester ?? s.maximaGeneraux?.sumMaxSemester) }}
                </td>
                <td class="border border-(--border) px-2 py-1"></td>
              }
              <td class="border border-(--border) px-2 py-1 text-right">
                {{ n(s.maximaGeneraux?.sumMaxYear) }}
              </td>
              <td class="border border-(--border) px-2 py-1"></td>
            </tr>

            <!-- POURCENTAGE par période / examen / trimestre -->
            <tr class="text-xs font-semibold text-(--text)">
              <td class="border border-(--border) px-2 py-1" colspan="2">Pourcentage</td>
              @for (tc of termCols(); track tc.term; let i = $index) {
                <td class="border border-(--border) px-2 py-1 text-right">
                  {{ pctText(footerPct()[i]?.p1) }}
                </td>
                <td class="border border-(--border) px-2 py-1 text-right">
                  {{ pctText(footerPct()[i]?.p2) }}
                </td>
                <td class="border border-(--border) px-2 py-1"></td>
                <td class="border border-(--border) px-2 py-1 text-right">
                  {{ pctText(footerPct()[i]?.exam) }}
                </td>
                <td class="border border-(--border) px-2 py-1"></td>
                <td
                  class="border border-(--border) px-2 py-1 text-right"
                  [style.color]="pctColor(footerPct()[i]?.trim)"
                >
                  {{ pctText(footerPct()[i]?.trim) }}
                </td>
              }
              <td class="border border-(--border) px-2 py-1"></td>
              <td
                class="border border-(--border) px-2 py-1 text-right"
                [style.color]="pctColor(generalPercent())"
              >
                {{ pctText(generalPercent()) }}
              </td>
            </tr>

            @for (r of syntheseRows(); track r.label) {
              <tr class="text-xs text-(--text-muted)">
                <td class="border border-(--border) px-2 py-1" colspan="2">{{ r.label }}</td>
                @for (tc of termCols(); track tc.term) {
                  @let v = isCurrentTerm(tc.term) ? r.value : '';
                  <td class="border border-(--border) px-2 py-1 text-right text-(--text)">
                    {{ v }}
                  </td>
                  <td class="border border-(--border) px-2 py-1 text-right text-(--text)">
                    {{ v }}
                  </td>
                  <td class="border border-(--border) px-2 py-1"></td>
                  <td class="border border-(--border) px-2 py-1 text-right text-(--text)">
                    {{ v }}
                  </td>
                  <td class="border border-(--border) px-2 py-1"></td>
                  <td class="border border-(--border) px-2 py-1 text-right text-(--text)">
                    {{ v }}
                  </td>
                }
                <td class="border border-(--border) px-2 py-1"></td>
                <td class="border border-(--border) px-2 py-1"></td>
              </tr>
            }
          </tfoot>
        </table>
      </div>

      <p class="mt-3 text-sm text-(--text)">
        <span class="text-(--text-muted)">Décision :</span> {{ decisionLabel() }}
      </p>

      @if (isSecondaryBareOnly()) {
        <p class="mt-3 text-xs text-(--warning)">
          Niveau secondaire : les points par branche ne sont pas encore fournis par le back (seul le
          pourcentage général est disponible).
        </p>
      }
    </div>
  `,
})
export class BulletinOfficial {
  readonly snapshot = input.required<MinisterialSnapshot>();
  readonly studentName = input('');
  readonly className = input('');
  readonly schoolYear = input('');

  private readonly lines = computed<SnapshotLine[]>(() => {
    const out: SnapshotLine[] = [];
    for (const d of this.snapshot().domains ?? []) {
      for (const b of d.branches ?? []) {
        for (const l of b.lines ?? []) {
          out.push(l);
        }
      }
    }
    return out.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  });

  protected readonly termCols = computed<TermCol[]>(() => {
    const keys = new Set<string>();
    for (const l of this.lines()) {
      Object.keys(l.terms ?? {}).forEach((k) => keys.add(k));
      Object.keys(l.semestres ?? {}).forEach((k) => keys.add(k));
    }
    const cur = this.snapshot().term;
    if (keys.size === 0 && cur) {
      keys.add(cur);
    }
    return [...keys]
      .sort((a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b))
      .map((t) => ({ term: t, label: TERM_LABEL[t] ?? t }));
  });

  protected readonly grid = computed<GridRow[]>(() => {
    const cols = this.termCols();
    return this.lines().map((line) => ({
      line,
      cells: cols.map((c) => this.cellOf(line, c.term)),
    }));
  });

  protected readonly generalPercent = computed<number | null>(() => {
    const sy = this.snapshot().synthese;
    return sy?.pourcentageTrimestreCourant ?? sy?.pourcentageSemestreCourant ?? null;
  });

  /** Pourcentage agrégé par colonne (P1/P2/Examen/Trimestre) pour chaque trimestre. */
  protected readonly footerPct = computed(() => {
    const rows = this.grid();
    return this.termCols().map((_, i) => {
      let p1o = 0,
        p1m = 0,
        p2o = 0,
        p2m = 0,
        exo = 0,
        exm = 0,
        tro = 0,
        trm = 0;
      for (const r of rows) {
        const c = r.cells[i];
        const mp = r.line.maxPerPeriod ?? null;
        if (c?.p1 != null && mp != null) {
          p1o += c.p1;
          p1m += mp;
        }
        if (c?.p2 != null && mp != null) {
          p2o += c.p2;
          p2m += mp;
        }
        const me = this.lineMaxExam(r.line);
        if (c?.exam != null && me != null) {
          exo += c.exam;
          exm += me;
        }
        const mt = this.lineMaxTrim(r.line);
        if (c?.trim != null && mt != null) {
          tro += c.trim;
          trm += mt;
        }
      }
      const pct = (o: number, m: number) => (m > 0 ? (o / m) * 100 : null);
      return { p1: pct(p1o, p1m), p2: pct(p2o, p2m), exam: pct(exo, exm), trim: pct(tro, trm) };
    });
  });

  /** Lignes de synthèse (une valeur, placée sous le trimestre courant). */
  protected readonly syntheseRows = computed(() => {
    const sy = this.snapshot().synthese;
    const q = this.snapshot().champsQualitatifs;
    return [
      { label: 'Place', value: sy?.place != null ? `${sy.place}` : '—' },
      { label: "Nbre d'élèves", value: sy?.nombreEleves != null ? `${sy.nombreEleves}` : '—' },
      { label: 'Application', value: q?.application || '—' },
      { label: 'Conduite', value: q?.conduite || '—' },
    ];
  });

  protected isCurrentTerm(term: string): boolean {
    return term === this.snapshot().term;
  }

  protected readonly decisionLabel = computed(() => {
    const d = this.snapshot().synthese?.decision;
    return d === 'PROMOTED'
      ? 'Passe dans la classe supérieure'
      : d === 'REPEAT'
        ? 'Double la classe'
        : '—';
  });

  /** Secondaire sans aucun point de ligne (barème seul). */
  protected readonly isSecondaryBareOnly = computed(() => {
    if (!this.snapshot().payloadKind) {
      return false;
    }
    return this.grid().every((r) => r.cells.every((c) => c === null));
  });

  private cellOf(line: SnapshotLine, term: string): Cell | null {
    const raw = (line.terms?.[term] ?? line.semestres?.[term]) as Record<string, unknown> | null;
    if (raw) {
      const pick = (a: string, b: string) => {
        const v = raw[a] ?? raw[b];
        return v == null ? null : Number(v);
      };
      return {
        p1: pick('period1', 'period1Obtained'),
        p2: pick('period2', 'period2Obtained'),
        exam: pick('exam', 'examObtained'),
        trim: pick('trimester', 'trimesterObtained') ?? pick('semester', 'semesterObtained'),
        percent:
          raw['trimesterPercent'] != null
            ? Number(raw['trimesterPercent'])
            : raw['semesterPercent'] != null
              ? Number(raw['semesterPercent'])
              : null,
      };
    }
    // Repli sur le « terme courant » bien spécifié du primaire.
    if (term === this.snapshot().term && line.trimestreCourant) {
      const c = line.trimestreCourant;
      return {
        p1: c.period1Obtained ?? null,
        p2: c.period2Obtained ?? null,
        exam: c.examObtained ?? null,
        trim: c.trimesterObtained ?? null,
        percent: c.trimesterPercent ?? null,
      };
    }
    return null;
  }

  /** Libellé de période gauche du bloc trimestre `i` (1ʳᵉ, 3ᵉ, 5ᵉ P.). */
  protected p1Label(i: number): string {
    return `${this.ordinal(2 * i + 1)} P.`;
  }
  /** Libellé de période droite du bloc trimestre `i` (2ᵉ, 4ᵉ, 6ᵉ P.). */
  protected p2Label(i: number): string {
    return `${this.ordinal(2 * i + 2)} P.`;
  }
  private ordinal(n: number): string {
    return n === 1 ? '1ʳᵉ' : `${n}ᵉ`;
  }

  /** Max annuel d'une branche (3 × max trimestre, sinon 12 × max/période). */
  protected lineMaxYear(line: SnapshotLine): number | null {
    const trim = this.lineMaxTrim(line);
    return trim != null ? trim * 3 : line.maxPerPeriod != null ? line.maxPerPeriod * 12 : null;
  }

  /** Max examen d'une branche (snapshot, sinon 2×max/période). */
  protected lineMaxExam(line: SnapshotLine): number | null {
    return (
      line.trimestreCourant?.maxExam ?? (line.maxPerPeriod != null ? line.maxPerPeriod * 2 : null)
    );
  }
  /** Max trimestre d'une branche (snapshot, sinon 4×max/période). */
  protected lineMaxTrim(line: SnapshotLine): number | null {
    return (
      line.trimestreCourant?.maxTrimester ??
      (line.maxPerPeriod != null ? line.maxPerPeriod * 4 : null)
    );
  }

  /** Total année = somme des points de trimestre disponibles pour la ligne. */
  protected rowYearTotal(row: GridRow): number | null {
    const vals = row.cells.map((c) => c?.trim).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  }

  protected n(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : `${Math.round(Number(v) * 100) / 100}`;
  }
  protected pctText(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : `${Math.round(Number(v))}%`;
  }
  protected pctColor(v: number | null | undefined): string {
    if (v === null || v === undefined) {
      return 'var(--text)';
    }
    const p = Math.round(Number(v));
    return p >= 75 ? 'var(--success)' : p >= 50 ? 'var(--brand-700)' : 'var(--danger)';
  }
}
