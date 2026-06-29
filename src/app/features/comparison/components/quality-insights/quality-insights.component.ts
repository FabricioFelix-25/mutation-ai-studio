import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { InsightFeedback, BadgeTone } from '../../../../core/models/studio.models';
import { StudioDataService } from '../../../../core/services/studio-data.service';

@Component({
  selector: 'app-quality-insights',
  imports: [CommonModule],
  templateUrl: './quality-insights.component.html',
  styleUrl: './quality-insights.component.scss',
})
export class QualityInsightsComponent {
  constructor(private readonly dataService: StudioDataService) {}

  protected get feedbackList(): InsightFeedback[] {
    return this.dataService.qualityInsightsSignal();
  }

  protected labelForTone(tone: BadgeTone): string {
    switch (tone) {
      case 'emerald':
        return 'Sinal verde';
      case 'amber':
        return 'Atencao';
      case 'soft-blue':
        return 'Observacao';
      default:
        return 'Info';
    }
  }
}
