import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type {
  MinisterialSnapshot,
  PeriodicDomainSubTotal,
  PeriodicEntry,
  SnapshotLine,
} from '../models/admin.models';

/** Une colonne « terme » + ses entrées de synthèse (P impaire/paire, examen, trimestre). */
interface SynthCol {
  term: string;
  label: string;
  p1Label: string;
  p2Label: string;
  p1: PeriodicEntry | null;
  p2: PeriodicEntry | null;
  exam: PeriodicEntry | null;
  trim: PeriodicEntry | null;
}
/** Points + plafonds d'une matière pour un terme (lus tels quels). */
interface LineCell {
  p1: number | null;
  p2: number | null;
  exam: number | null;
  trim: number | null;
  maxExam: number | null;
  maxTrim: number | null;
}
interface LineRow {
  line: SnapshotLine;
  cells: (LineCell | null)[];
}
/** Sous-domaine (branche) : libellé + ses lignes de matières. */
interface BranchVM {
  label: string;
  rows: LineRow[];
}
/** Sous-total d'un domaine pour un terme (issu de `sousTotauxDomaines`). */
interface SubCell {
  p1: PeriodicDomainSubTotal | null;
  p2: PeriodicDomainSubTotal | null;
  exam: PeriodicDomainSubTotal | null;
  trim: PeriodicDomainSubTotal | null;
  maxExam: number | null;
  maxTrim: number | null;
}
interface DomainVM {
  code: string;
  label: string;
  branches: BranchVM[];
  maxPerPeriod: number | null;
  maxYear: number | null;
  sub: SubCell[];
  year: PeriodicDomainSubTotal | null;
}

const TERM_ORDER = ['TERM1', 'TERM2', 'TERM3', 'SEMESTER1', 'SEMESTER2'];
const TERM_LABEL: Record<string, string> = {
  TERM1: 'Premier trimestre',
  TERM2: 'Deuxième trimestre',
  TERM3: 'Troisième trimestre',
  SEMESTER1: 'Premier semestre',
  SEMESTER2: 'Deuxième semestre',
};

/** Notes obtenues : ≥ moitié du max → bleu, < moitié → rouge. */
const BLUE = '#3b82f6';

/**
 * Bulletin officiel RDC rendu **uniquement** à partir du `ministerialSnapshot` :
 * aucune valeur n'est recalculée côté front. Les points viennent des `lines`,
 * les sous-totaux de `domains[].subTotal` + `sousTotauxDomaines`, et les
 * pourcentages/place/effectif de `pourcentagesPeriodiques` (gatés par `disponible`).
 * `null` s'affiche « — » (jamais 0).
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
            <p class="text-2xl font-semibold text-(--text)">
              {{ fmtPct(av(scope(), 'pourcentage')) }}
            </p>
            <p class="text-xs text-(--text-muted)">
              Place {{ fmt(av(scope(), 'place')) }} / {{ fmt(av(scope(), 'nombreEleves')) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Tableau officiel : domaines → branches → lignes + sous-totaux -->
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse text-sm">
          <thead>
            <tr class="text-xs text-(--text-muted)">
              <th class="border border-(--border) px-2 py-1 text-left" rowspan="2">Branches</th>
              <th class="border border-(--border) px-2 py-1 text-right" rowspan="2">Max/pér.</th>
              @for (c of cols(); track c.term) {
                <th class="border border-(--border) px-2 py-1 text-center" colspan="6">
                  {{ c.label }}
                </th>
              }
              <th class="border border-(--border) px-2 py-1 text-center" colspan="2">Total</th>
            </tr>
            <tr class="text-[11px] text-(--text-muted)">
              @for (c of cols(); track c.term) {
                <th class="border border-(--border) px-2 py-1 text-right">{{ c.p1Label }}</th>
                <th class="border border-(--border) px-2 py-1 text-right">{{ c.p2Label }}</th>
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
            @for (d of domainsVM(); track d.code) {
              <tr class="bg-[color-mix(in_srgb,var(--text-muted)_8%,transparent)]">
                <td
                  class="border border-(--border) px-2 py-1 font-semibold text-(--text) uppercase text-[11px]"
                  [attr.colspan]="totalCols()"
                >
                  {{ d.label }}
                </td>
              </tr>
              @for (branch of d.branches; track branch.label || $index) {
                @if (branch.label) {
                  <tr>
                    <td
                      class="border border-(--border) px-2 py-0.5 pl-4 text-[11px] italic text-(--text-muted)"
                      [attr.colspan]="totalCols()"
                    >
                      {{ branch.label }}
                    </td>
                  </tr>
                }
                @for (row of branch.rows; track row.line.programCode) {
                  <tr>
                    <td
                      class="border border-(--border) px-2 py-1 pl-4 whitespace-nowrap text-(--text)"
                    >
                      {{ row.line.labelFr }}
                    </td>
                    <td class="border border-(--border) px-2 py-1 text-right text-(--text-muted)">
                      {{ fmt(row.line.maxPerPeriod) }}
                    </td>
                    @for (c of row.cells; track $index) {
                      <td
                        class="border border-(--border) px-2 py-1 text-right"
                        [style.color]="noteColor(c?.p1, row.line.maxPerPeriod)"
                      >
                        {{ fmt(c?.p1) }}
                      </td>
                      <td
                        class="border border-(--border) px-2 py-1 text-right"
                        [style.color]="noteColor(c?.p2, row.line.maxPerPeriod)"
                      >
                        {{ fmt(c?.p2) }}
                      </td>
                      <td class="border border-(--border) px-2 py-1 text-right text-(--text-muted)">
                        {{ fmt(c?.maxExam) }}
                      </td>
                      <td
                        class="border border-(--border) px-2 py-1 text-right"
                        [style.color]="noteColor(c?.exam, c?.maxExam)"
                      >
                        {{ fmt(c?.exam) }}
                      </td>
                      <td class="border border-(--border) px-2 py-1 text-right text-(--text-muted)">
                        {{ fmt(c?.maxTrim) }}
                      </td>
                      <td
                        class="border border-(--border) px-2 py-1 text-right font-semibold"
                        [style.color]="noteColor(c?.trim, c?.maxTrim)"
                      >
                        {{ fmt(c?.trim) }}
                      </td>
                    }
                    <td class="border border-(--border) px-2 py-1 text-right text-(--text-muted)">
                      —
                    </td>
                    <td class="border border-(--border) px-2 py-1 text-right text-(--text-muted)">
                      —
                    </td>
                  </tr>
                }
              }
              <!-- Sous-total du domaine (issu de sousTotauxDomaines) -->
              <tr
                class="text-xs font-medium bg-[color-mix(in_srgb,var(--text-muted)_8%,transparent)]"
              >
                <td class="border border-(--border) px-2 py-1">Sous-total</td>
                <td class="border border-(--border) px-2 py-1 text-right">
                  {{ fmt(d.maxPerPeriod) }}
                </td>
                @for (sc of d.sub; track $index) {
                  <td
                    class="border border-(--border) px-2 py-1 text-right"
                    [style.color]="noteColor(sc.p1?.pointsObtenus, sc.p1?.pointsMax)"
                  >
                    {{ fmt(sc.p1?.pointsObtenus) }}
                  </td>
                  <td
                    class="border border-(--border) px-2 py-1 text-right"
                    [style.color]="noteColor(sc.p2?.pointsObtenus, sc.p2?.pointsMax)"
                  >
                    {{ fmt(sc.p2?.pointsObtenus) }}
                  </td>
                  <td class="border border-(--border) px-2 py-1 text-right">
                    {{ fmt(sc.maxExam) }}
                  </td>
                  <td
                    class="border border-(--border) px-2 py-1 text-right"
                    [style.color]="noteColor(sc.exam?.pointsObtenus, sc.exam?.pointsMax)"
                  >
                    {{ fmt(sc.exam?.pointsObtenus) }}
                  </td>
                  <td class="border border-(--border) px-2 py-1 text-right">
                    {{ fmt(sc.maxTrim) }}
                  </td>
                  <td
                    class="border border-(--border) px-2 py-1 text-right"
                    [style.color]="noteColor(sc.trim?.pointsObtenus, sc.trim?.pointsMax)"
                  >
                    {{ fmt(sc.trim?.pointsObtenus) }}
                  </td>
                }
                <td class="border border-(--border) px-2 py-1 text-right">{{ fmt(d.maxYear) }}</td>
                <td
                  class="border border-(--border) px-2 py-1 text-right"
                  [style.color]="noteColor(d.year?.pointsObtenus, d.year?.pointsMax)"
                >
                  {{ fmt(d.year?.pointsObtenus) }}
                </td>
              </tr>
            }
          </tbody>
          <tfoot>
            <!-- Maxima généraux + points obtenus -->
            <tr class="text-xs font-semibold text-(--text)">
              <td class="border border-(--border) px-2 py-1">Maxima généraux</td>
              <td class="border border-(--border) px-2 py-1 text-right">
                {{ fmt(s.maximaGeneraux?.sumMaxPerPeriod) }}
              </td>
              @for (c of cols(); track c.term) {
                <td
                  class="border border-(--border) px-2 py-1 text-right"
                  [style.color]="noteColor(av(c.p1, 'pointsObtenus'), av(c.p1, 'pointsMax'))"
                >
                  {{ fmt(av(c.p1, 'pointsObtenus')) }}
                </td>
                <td
                  class="border border-(--border) px-2 py-1 text-right"
                  [style.color]="noteColor(av(c.p2, 'pointsObtenus'), av(c.p2, 'pointsMax'))"
                >
                  {{ fmt(av(c.p2, 'pointsObtenus')) }}
                </td>
                <td class="border border-(--border) px-2 py-1 text-right">
                  {{ fmt(s.maximaGeneraux?.sumMaxExam) }}
                </td>
                <td
                  class="border border-(--border) px-2 py-1 text-right"
                  [style.color]="noteColor(av(c.exam, 'pointsObtenus'), av(c.exam, 'pointsMax'))"
                >
                  {{ fmt(av(c.exam, 'pointsObtenus')) }}
                </td>
                <td class="border border-(--border) px-2 py-1 text-right">
                  {{ fmt(s.maximaGeneraux?.sumMaxTrimester) }}
                </td>
                <td
                  class="border border-(--border) px-2 py-1 text-right"
                  [style.color]="noteColor(av(c.trim, 'pointsObtenus'), av(c.trim, 'pointsMax'))"
                >
                  {{ fmt(av(c.trim, 'pointsObtenus')) }}
                </td>
              }
              <td class="border border-(--border) px-2 py-1 text-right">
                {{ fmt(s.maximaGeneraux?.sumMaxYear) }}
              </td>
              <td
                class="border border-(--border) px-2 py-1 text-right"
                [style.color]="noteColor(av(annuel(), 'pointsObtenus'), av(annuel(), 'pointsMax'))"
              >
                {{ fmt(av(annuel(), 'pointsObtenus')) }}
              </td>
            </tr>

            <!-- Synthèse par colonne : Pourcentage / Place / Nbre d'élèves / Application / Conduite -->
            @for (r of synthRows(); track r.key) {
              <tr class="text-xs" [class.font-semibold]="r.kind === 'pct'">
                <td class="border border-(--border) px-2 py-1 text-(--text-muted)">
                  {{ r.label }}
                </td>
                <td class="border border-(--border) px-2 py-1"></td>
                @for (c of cols(); track c.term) {
                  <td class="border border-(--border) px-2 py-1 text-right text-(--text)">
                    {{ cellText(c.p1, r.key, r.kind) }}
                  </td>
                  <td class="border border-(--border) px-2 py-1 text-right text-(--text)">
                    {{ cellText(c.p2, r.key, r.kind) }}
                  </td>
                  <td class="border border-(--border) px-2 py-1"></td>
                  <td class="border border-(--border) px-2 py-1 text-right text-(--text)">
                    {{ cellText(c.exam, r.key, r.kind) }}
                  </td>
                  <td class="border border-(--border) px-2 py-1"></td>
                  <td class="border border-(--border) px-2 py-1 text-right text-(--text)">
                    {{ cellText(c.trim, r.key, r.kind) }}
                  </td>
                }
                <td class="border border-(--border) px-2 py-1"></td>
                <td class="border border-(--border) px-2 py-1 text-right text-(--text)">
                  {{ cellText(annuel(), r.key, r.kind) }}
                </td>
              </tr>
            }
          </tfoot>
        </table>
      </div>

      <p class="mt-3 text-sm text-(--text)">
        <span class="text-(--text-muted)">Décision :</span> {{ decisionLabel() }}
      </p>
    </div>
  `,
})
export class BulletinOfficial {
  readonly snapshot = input.required<MinisterialSnapshot>();
  readonly studentName = input('');
  readonly className = input('');
  readonly schoolYear = input('');

  /** Toutes les lignes, tous domaines confondus (pour déduire les colonnes). */
  private readonly allLines = computed<SnapshotLine[]>(() => {
    const out: SnapshotLine[] = [];
    for (const d of this.snapshot().domains ?? []) {
      for (const b of d.branches ?? []) {
        for (const l of b.lines ?? []) {
          out.push(l);
        }
      }
    }
    return out;
  });

  protected readonly annuel = computed<PeriodicEntry | null>(
    () => this.snapshot().pourcentagesPeriodiques?.annuel ?? null,
  );

  /** Entrée de synthèse correspondant à la portée du bulletin (annuel ou trimestre). */
  protected readonly scope = computed<PeriodicEntry | null>(() => {
    const pp = this.snapshot().pourcentagesPeriodiques;
    const t = this.snapshot().term;
    if (!pp) {
      return null;
    }
    if (!t || t === 'ANNUAL') {
      return pp.annuel ?? null;
    }
    return pp.trimestres?.find((x) => x.term === t) ?? pp.annuel ?? null;
  });

  /** Colonnes de terme + leurs entrées de synthèse (périodes, examen, trimestre). */
  protected readonly cols = computed<SynthCol[]>(() => {
    const pp = this.snapshot().pourcentagesPeriodiques;
    const keys = new Set<string>();
    for (const l of this.allLines()) {
      Object.keys(l.terms ?? {}).forEach((k) => keys.add(k));
      Object.keys(l.semestres ?? {}).forEach((k) => keys.add(k));
    }
    const cur = this.snapshot().term;
    if (keys.size === 0 && cur && cur !== 'ANNUAL') {
      keys.add(cur);
    }
    return [...keys]
      .sort((a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b))
      .map((term) => {
        const per = (pp?.periodes ?? []).filter((p) => p.term === term);
        return {
          term,
          label: TERM_LABEL[term] ?? term,
          p1: per[0] ?? null,
          p2: per[1] ?? null,
          p1Label: this.periodLabel(per[0]?.code, 0),
          p2Label: this.periodLabel(per[1]?.code, 1),
          exam: (pp?.examens ?? []).find((e) => e.term === term) ?? null,
          trim: (pp?.trimestres ?? []).find((t) => t.term === term) ?? null,
        };
      });
  });

  protected readonly totalCols = computed(() => 4 + 6 * this.cols().length);

  /** Domaines → branches → lignes (triées par displayOrder) + sous-totaux. */
  protected readonly domainsVM = computed<DomainVM[]>(() => {
    const cols = this.cols();
    return (this.snapshot().domains ?? []).map((d) => {
      const branches: BranchVM[] = (d.branches ?? []).map((b) => ({
        label: b.labelFr ?? '',
        rows: (b.lines ?? [])
          .map((line) => ({ line, cells: cols.map((c) => this.cellOf(line, c.term)) }))
          .sort((a, b2) => (a.line.displayOrder ?? 0) - (b2.line.displayOrder ?? 0)),
      }));
      const code = d.code ?? '';
      const st = d.subTotal;
      return {
        code,
        label: d.labelFr ?? code,
        branches,
        maxPerPeriod: st?.maxPerPeriod ?? null,
        maxYear: st?.maxYear ?? null,
        sub: cols.map<SubCell>((c) => ({
          p1: this.sd(c.p1, code),
          p2: this.sd(c.p2, code),
          exam: this.sd(c.exam, code),
          trim: this.sd(c.trim, code),
          maxExam: st?.maxExam ?? null,
          maxTrim: st?.terms?.[c.term]?.maxTrimester ?? st?.maxTrimester ?? null,
        })),
        year: this.sd(this.annuel(), code),
      };
    });
  });

  /** Lignes de synthèse rendues sous chaque colonne (période/examen/trimestre/annuel). */
  protected readonly synthRows = computed(() => [
    { key: 'pourcentage', label: 'Pourcentage', kind: 'pct' },
    { key: 'place', label: 'Place', kind: 'num' },
    { key: 'nombreEleves', label: "Nbre d'élèves", kind: 'num' },
    { key: 'application', label: 'Application', kind: 'text' },
    { key: 'conduite', label: 'Conduite', kind: 'text' },
  ]);

  /**
   * Valeur affichée d'une cellule de synthèse. « — » si l'entrée n'est pas
   * disponible ou si la donnée est absente. Les appréciations retombent sur
   * `champsQualitatifs` quand l'entrée ne les porte pas.
   */
  protected cellText(entry: PeriodicEntry | null | undefined, key: string, kind: string): string {
    if (!entry || entry.disponible !== true) {
      return '—';
    }
    let v = entry[key];
    if (
      (v === null || v === undefined || v === '') &&
      (key === 'application' || key === 'conduite')
    ) {
      const q = this.snapshot().champsQualitatifs;
      v = key === 'application' ? q?.application : q?.conduite;
    }
    if (v === null || v === undefined || v === '') {
      return '—';
    }
    if (kind === 'pct') {
      return this.fmtPct(Number(v));
    }
    if (kind === 'num') {
      return this.fmt(Number(v));
    }
    return String(v);
  }

  protected readonly decisionLabel = computed(() => {
    const d = this.annuel()?.decision ?? this.snapshot().synthese?.decision;
    return d === 'PROMOTED'
      ? 'Passe dans la classe supérieure'
      : d === 'REPEAT'
        ? 'Double la classe'
        : '—';
  });

  /** Valeur d'une entrée de synthèse — `null` si l'entrée n'est pas disponible. */
  protected av(entry: PeriodicEntry | null | undefined, key: string): number | null {
    if (!entry || entry.disponible !== true) {
      return null;
    }
    const v = entry[key];
    return v === null || v === undefined ? null : Number(v);
  }

  /** Sous-total d'un domaine porté par une entrée de synthèse. */
  private sd(entry: PeriodicEntry | null, code: string): PeriodicDomainSubTotal | null {
    if (!entry || entry.disponible !== true) {
      return null;
    }
    return entry.sousTotauxDomaines?.find((x) => x.code === code) ?? null;
  }

  /** Points d'une matière pour un terme — lus tels quels, sans calcul. */
  private cellOf(line: SnapshotLine, term: string): LineCell | null {
    const raw = line.terms?.[term] ?? line.semestres?.[term];
    if (!raw) {
      return null;
    }
    const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
    return {
      p1: num(raw.period1Obtained),
      p2: num(raw.period2Obtained),
      exam: num(raw.examObtained),
      trim: num(raw.trimesterObtained),
      maxExam: num(raw.maxExam),
      maxTrim: num(raw.maxTrimester),
    };
  }

  /** « 1ʳᵉ P. » / « 3ᵉ P. »… d'après le code P1..P6 (repli sur la position). */
  private periodLabel(code: string | undefined, fallbackIndex: number): string {
    const n = code ? Number(code.replace(/\D/g, '')) : NaN;
    const num = Number.isFinite(n) && n > 0 ? n : fallbackIndex + 1;
    return `${num === 1 ? '1ʳᵉ' : `${num}ᵉ`} P.`;
  }

  protected fmt(v: number | null | undefined): string {
    if (v === null || v === undefined) {
      return '—';
    }
    const n = Number(v);
    return Number.isInteger(n) ? `${n}` : `${Math.round(n * 100) / 100}`;
  }
  protected fmtPct(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : `${this.fmt(v)}%`;
  }
  /** Note obtenue : ≥ moitié du max → bleu, < moitié → rouge, sinon noir. */
  protected noteColor(v: number | null | undefined, max: number | null | undefined): string {
    if (v === null || v === undefined || max === null || max === undefined || Number(max) <= 0) {
      return 'var(--text)';
    }
    return Number(v) >= Number(max) / 2 ? BLUE : 'var(--danger)';
  }
}
