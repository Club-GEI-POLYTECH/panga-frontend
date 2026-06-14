import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { AXIS_LABEL, SPLIT_LINE, type ChartDatum } from './chart-theme';

/** Barres horizontales (classement, ex. top écoles). */
@Component({
  selector: 'panga-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective],
  template: `<div echarts [options]="options()" [style.height.px]="height()" class="w-full"></div>`,
})
export class BarChart {
  readonly data = input<ChartDatum[]>([]);
  readonly height = input(260);

  protected readonly options = computed<EChartsCoreOption>(() => {
    // ECharts empile l'axe catégorie de bas en haut : on inverse pour avoir
    // la plus grande valeur en haut.
    const data = [...this.data()].reverse();
    return {
      grid: { left: 6, right: 28, top: 8, bottom: 6, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'value',
        axisLabel: { color: AXIS_LABEL },
        splitLine: { lineStyle: { color: SPLIT_LINE } },
      },
      yAxis: {
        type: 'category',
        data: data.map((d) => d.name),
        axisLabel: { color: AXIS_LABEL },
        axisLine: { lineStyle: { color: SPLIT_LINE } },
      },
      series: [
        {
          type: 'bar',
          barWidth: '56%',
          data: data.map((d) => d.value),
          itemStyle: { color: '#14b8a6', borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: 'right', color: AXIS_LABEL, fontSize: 11 },
        },
      ],
    };
  });
}
