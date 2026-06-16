/** Donnée nommée pour donut / barres. */
export interface ChartDatum {
  name: string;
  value: number;
}

/** Palette EstateHub : vert + bleu + sombre. */
export const CHART_COLORS = [
  '#a7e46a',
  '#8fd34a',
  '#a8dff8',
  '#5fb0d8',
  '#6fbb31',
  '#222026',
  '#bde97f',
  '#7fc6e8',
];

/** Vert et bleu de marque, réutilisables. */
export const BRAND_GREEN = '#8fd34a';
export const BRAND_BLUE = '#5fb0d8';

/** Gris lisible sur fond clair comme sombre (labels / axes). */
export const AXIS_LABEL = '#94a3b8';
export const SPLIT_LINE = 'rgba(148, 163, 184, 0.18)';
