import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { AXIS_LABEL, CHART_COLORS, type ChartDatum } from './chart-theme';

/** Donut (répartition) avec total au centre. */
@Component({
  selector: 'panga-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective],
  template: `<div echarts [options]="options()" [style.height.px]="height()" class="w-full"></div>`,
})
export class DonutChart {
  readonly data = input<ChartDatum[]>([]);
  readonly centerLabel = input('Total');
  readonly height = input(260);

  protected readonly options = computed<EChartsCoreOption>(() => {
    const data = this.data();
    const total = data.reduce((s, d) => s + d.value, 0);
    return {
      color: CHART_COLORS,
      tooltip: { trigger: 'item' },
      legend: {
        type: 'scroll',
        bottom: 0,
        icon: 'circle',
        textStyle: { color: AXIS_LABEL },
      },
      title: {
        text: total.toLocaleString('fr-FR'),
        subtext: this.centerLabel(),
        left: 'center',
        top: '38%',
        textStyle: { color: AXIS_LABEL, fontSize: 22, fontWeight: 700 },
        subtextStyle: { color: AXIS_LABEL, fontSize: 11 },
      },
      series: [
        {
          type: 'pie',
          radius: ['55%', '78%'],
          center: ['50%', '46%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          data: data.map((d) => ({ name: d.name, value: d.value })),
        },
      ],
    };
  });
}
