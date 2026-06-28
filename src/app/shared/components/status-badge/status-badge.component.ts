import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BadgeTone } from '../../../core/models/studio.models';

@Component({
  selector: 'app-status-badge',
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() tone: BadgeTone = 'muted';
}
