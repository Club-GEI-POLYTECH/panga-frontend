/** Donnée nommée pour donut / barres. */
export interface ChartDatum {
  name: string;
  value: number;
}

/** Palette et helpers communs aux graphiques ECharts (theme-neutres). */
export const CHART_COLORS = [
  '#14b8a6',
  '#0e7490',
  '#2dd4bf',
  '#0ea5e9',
  '#a855f7',
  '#f59e0b',
  '#f472b6',
  '#34d399',
];

/** Gris lisible sur fond clair comme sombre (labels / axes). */
export const AXIS_LABEL = '#94a3b8';
export const SPLIT_LINE = 'rgba(148, 163, 184, 0.18)';
