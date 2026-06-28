import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DiffSnapshot } from '../../../../core/models/studio.models';
import { StudioDataService } from '../../../../core/services/studio-data.service';

@Component({
  selector: 'app-diff-viewer',
  imports: [CommonModule],
  templateUrl: './diff-viewer.component.html',
  styleUrl: './diff-viewer.component.scss',
})
export class DiffViewerComponent {
  constructor(private readonly dataService: StudioDataService) {}

  protected get snapshot(): DiffSnapshot {
    return this.dataService.diffSnapshotSignal();
  }
}
