import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

@Component({
  selector: 'app-floating-card',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './floating-card.component.html',
  styleUrl: './floating-card.component.scss',
})
export class FloatingCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon?: LucideIconData;
}
