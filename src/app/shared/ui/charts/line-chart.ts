import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { AXIS_LABEL, CHART_COLORS, SPLIT_LINE } from './chart-theme';

export interface LineSeries {
  name: string;
  data: number[];
  color?: string;
  /** 0 = axe gauche (par défaut), 1 = axe droit (échelle distincte, ex. revenus). */
  axis?: 0 | 1;
  area?: boolean;
}

/** Courbe multi-séries (tendances) avec double axe Y optionnel. */
@Component({
  selector: 'panga-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective],
  template: `<div echarts [options]="options()" [style.height.px]="height()" class="w-full"></div>`,
})
export class LineChart {
  readonly categories = input<string[]>([]);
  readonly series = input<LineSeries[]>([]);
  readonly height = input(280);

  protected readonly options = computed<EChartsCoreOption>(() => {
    const series = this.series();
    const useRightAxis = series.some((s) => s.axis === 1);

    const yAxis: Record<string, unknown>[] = [
      {
        type: 'value',
        axisLabel: { color: AXIS_LABEL },
        splitLine: { lineStyle: { color: SPLIT_LINE } },
      },
    ];
    if (useRightAxis) {
      yAxis.push({
        type: 'value',
        axisLabel: { color: AXIS_LABEL },
        splitLine: { show: false },
      });
    }

    return {
      color: CHART_COLORS,
      grid: { left: 6, right: useRightAxis ? 6 : 12, top: 36, bottom: 6, containLabel: true },
      tooltip: { trigger: 'axis' },
      legend: { top: 0, icon: 'roundRect', textStyle: { color: AXIS_LABEL } },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: this.categories(),
        axisLabel: { color: AXIS_LABEL },
        axisLine: { lineStyle: { color: SPLIT_LINE } },
      },
      yAxis,
      series: series.map((s, i) => ({
        name: s.name,
        type: 'line',
        smooth: true,
        showSymbol: false,
        yAxisIndex: s.axis === 1 ? 1 : 0,
        data: s.data,
        lineStyle: { width: 3, color: s.color ?? CHART_COLORS[i % CHART_COLORS.length] },
        itemStyle: { color: s.color ?? CHART_COLORS[i % CHART_COLORS.length] },
        areaStyle: s.area
          ? { opacity: 0.12, color: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }
          : undefined,
      })),
    };
  });
}
