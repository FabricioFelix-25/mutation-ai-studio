import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { GaugeMetric } from '../../../../core/models/studio.models';
import { StudioDataService } from '../../../../core/services/studio-data.service';

@Component({
  selector: 'app-metrics-panel',
  imports: [CommonModule],
  templateUrl: './metrics-panel.component.html',
  styleUrl: './metrics-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsPanelComponent {
  constructor(private readonly dataService: StudioDataService) {}

  protected get metrics(): GaugeMetric[] {
    return this.dataService.gaugeMetricsSignal();
  }

  protected get mutationScoreMetric(): GaugeMetric | undefined {
    return this.metrics.find((metric) => metric.id === 'mutation-score');
  }

  protected get coverageMetric(): GaugeMetric | undefined {
    return this.metrics.find((metric) => metric.id === 'coverage-rate');
  }

  protected get survivorOfCoveredMetric(): GaugeMetric | undefined {
    return this.metrics.find((metric) => metric.id === 'survivor-of-covered');
  }

  protected get hasMetrics(): boolean {
    return this.metrics.length > 0;
  }
}
