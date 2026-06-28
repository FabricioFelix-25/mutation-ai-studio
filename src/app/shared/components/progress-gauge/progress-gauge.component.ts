import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BadgeTone } from '../../../core/models/studio.models';

@Component({
  selector: 'app-progress-gauge',
  imports: [CommonModule],
  templateUrl: './progress-gauge.component.html',
  styleUrl: './progress-gauge.component.scss',
})
export class ProgressGaugeComponent implements OnChanges {
  @Input() value = 0;
  @Input() label = '';
  @Input() caption = '';
  @Input() tone: Exclude<BadgeTone, 'muted'> = 'soft-blue';

  protected readonly radius = 54;
  protected readonly circumference = 2 * Math.PI * this.radius;
  protected displayValue = 0;

  protected get strokeOffset(): number {
    return this.circumference - (this.displayValue / 100) * this.circumference;
  }

  protected get roundedValue(): number {
    return Math.round(this.displayValue);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.displayValue = this.clampValue(this.value);
    }
  }

  private clampValue(rawValue: number): number {
    if (rawValue < 0) {
      return 0;
    }

    if (rawValue > 100) {
      return 100;
    }

    return rawValue;
  }
}
