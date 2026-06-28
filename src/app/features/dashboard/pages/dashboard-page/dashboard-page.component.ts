import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ArrowLeft,
  FileText,
  FolderSearch,
  Gauge,
  GitCompare,
  LucideAngularModule,
  Moon,
  Sun,
} from 'lucide-angular';
import { QuickStat, WorkspaceProject } from '../../../../core/models/studio.models';
import { StudioDataService } from '../../../../core/services/studio-data.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { FloatingCardComponent } from '../../../../shared/components/floating-card/floating-card.component';
import { MetricsPanelComponent } from '../../components/metrics-panel/metrics-panel.component';
import { ProjectSetupStepperComponent } from '../../../project-setup/components/project-setup-stepper/project-setup-stepper.component';
import { QualityInsightsComponent } from '../../../comparison/components/quality-insights/quality-insights.component';
import { DiffViewerComponent } from '../../../comparison/components/diff-viewer/diff-viewer.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    FloatingCardComponent,
    ProjectSetupStepperComponent,
    MetricsPanelComponent,
    QualityInsightsComponent,
    DiffViewerComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private paramMapSubscription?: Subscription;

  protected readonly backIcon = ArrowLeft;
  protected readonly moonIcon = Moon;
  protected readonly sunIcon = Sun;
  protected readonly setupIcon = FolderSearch;
  protected readonly metricsIcon = Gauge;
  protected readonly analysisIcon = FileText;
  protected readonly diffIcon = GitCompare;

  constructor(
    private readonly dataService: StudioDataService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    protected readonly themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.paramMapSubscription = this.route.paramMap.subscribe((paramMap) => {
      void this.initializePage(paramMap);
    });
  }

  ngOnDestroy(): void {
    this.paramMapSubscription?.unsubscribe();
  }

  private async initializePage(paramMap: ParamMap): Promise<void> {
    try {
      const projectId = paramMap.get('projectId');

      if (!projectId) {
        await this.router.navigate(['/']);
        return;
      }

      await this.dataService.refreshProjectsFromApi();

      const project = this.dataService.getProjectById(projectId);

      if (!project) {
        await this.router.navigate(['/']);
        return;
      }

      await this.dataService.selectProject(projectId);
    } catch {
      await this.router.navigate(['/']);
    }
  }

  protected get activeProject(): WorkspaceProject | undefined {
    return this.dataService.selectedProjectSignal();
  }

  protected get isApiConnected(): boolean {
    return this.dataService.apiConnected;
  }

  protected get quickStats(): QuickStat[] {
    return this.dataService.quickStats;
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}

