import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { AXIS_LABEL } from './chart-theme';

/** Jauge demi-cercle (ex. abonnements actifs sur total). */
@Component({
  selector: 'panga-gauge-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective],
  template: `<div echarts [options]="options()" [style.height.px]="height()" class="w-full"></div>`,
})
export class GaugeChart {
  readonly value = input(0);
  readonly max = input(100);
  readonly label = input('');
  readonly height = input(220);

  protected readonly options = computed<EChartsCoreOption>(() => ({
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: Math.max(this.max(), this.value(), 1),
        progress: { show: true, width: 16, roundCap: true, itemStyle: { color: '#14b8a6' } },
        axisLine: { lineStyle: { width: 16, color: [[1, 'rgba(148, 163, 184, 0.20)']] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: true, offsetCenter: [0, '34%'], color: AXIS_LABEL, fontSize: 12 },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-2%'],
          fontSize: 30,
          fontWeight: 700,
          color: AXIS_LABEL,
          formatter: '{value}',
        },
        data: [{ value: this.value(), name: this.label() }],
      },
    ],
  }));
}
