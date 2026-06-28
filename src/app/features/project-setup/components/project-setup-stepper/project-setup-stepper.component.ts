import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, effect, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule, FileCode } from 'lucide-angular';
import { take } from 'rxjs/operators';
import { ProjectClassOption } from '../../../../core/models/studio.models';
import {
  AiTestClassResult,
  AiTestRunStatus,
  MavenDetectionResult,
  StudioDataService,
} from '../../../../core/services/studio-data.service';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

type DetectionTone = 'neutral' | 'success' | 'error';
type RunTone = 'neutral' | 'success' | 'error';

@Component({
  selector: 'app-project-setup-stepper',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
    StatusBadgeComponent,
    LucideAngularModule,
  ],
  templateUrl: './project-setup-stepper.component.html',
  styleUrl: './project-setup-stepper.component.scss',
})
export class ProjectSetupStepperComponent {
  private readonly maxPollAttempts = 36;
  private readonly maxDetectionRefreshAttempts = 45;
  private activePollToken = 0;
  private detectionPollToken = 0;
  private detectionFeedbackTimer?: ReturnType<typeof setInterval>;
  private detectionStartedAt = 0;

  protected readonly mavenPathControl: FormControl<string>;
  protected selectedClassIds: string[] = [];

  protected readonly fileIcon = FileCode;

  protected openMavenFileBrowser(): void {
    if (!this.isApiConnected) {
      this.detectionTone = 'error';
      this.detectionMessage = 'Backend offline. Inicie o backend com "npm run start:backend" para abrir o explorador de arquivos real.';
      return;
    }

    this.dataService.browseFile().subscribe({
      next: (res) => {
        if (res && res.path) {
          this.mavenPathControl.setValue(res.path);
          this.detectionTone = 'success';
          this.detectionMessage = `Arquivo selecionado: ${res.path}`;
        }
      },
      error: () => {
        this.detectionTone = 'error';
        this.detectionMessage = 'Erro ao abrir o explorador de arquivos no backend.';
      }
    });
  }

  private isWindows(): boolean {
    if (typeof navigator === 'undefined') return false;
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
    return /win/i.test(platform);
  }

  protected get isApiConnected(): boolean {
    return this.dataService.apiConnected;
  }

  protected isDetectingMaven = false;
  protected detectionMessage =
    'Clique em Detectar Maven para preencher automaticamente ou informe manualmente.';
  protected detectionTone: DetectionTone = 'neutral';
  protected detectedVersion = '';
  protected isStartingRun = false;
  protected runMessage = '';
  protected runTone: RunTone = 'neutral';
  protected lastRunId = '';
  protected aiResults: AiTestClassResult[] = [];

  private lastSetupProjectName: string;

  constructor(
    private readonly dataService: StudioDataService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    const initialSetupData = this.dataService.projectSetupDataSignal();
    this.lastSetupProjectName = initialSetupData.projectName;
    this.mavenPathControl = new FormControl(
      initialSetupData.mavenPath,
      { nonNullable: true, validators: [Validators.required] },
    );

    effect(() => {
      const setupData = this.dataService.projectSetupDataSignal();
      if (setupData.projectName !== this.lastSetupProjectName) {
        this.lastSetupProjectName = setupData.projectName;
        this.mavenPathControl.setValue(setupData.mavenPath);
        this.selectedClassIds = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.detectionPollToken += 1;
    this.stopDetectionFeedbackLoop();
  }

  protected get classOptions(): ProjectClassOption[] {
    return this.dataService.getProjectSetupData().classOptions;
  }

  protected detectMavenPath(): void {
    const previousDashboardSignature = this.buildDashboardSignature();
    this.detectionPollToken += 1;
    const pollToken = this.detectionPollToken;
    this.isDetectingMaven = true;
    this.detectionTone = 'neutral';
    this.detectedVersion = '';
    this.startDetectionFeedbackLoop();

    this.dataService
      .detectMaven()
      .pipe(take(1))
      .subscribe({
        next: (result: MavenDetectionResult) => {
          if (!result.found) {
            this.isDetectingMaven = false;
            this.stopDetectionFeedbackLoop();
            this.detectionTone = 'error';
            this.detectionMessage =
              'Maven nao encontrado automaticamente. Informe o caminho manualmente.';
            return;
          }

          void this.finishMavenDetection(result, previousDashboardSignature, pollToken);
        },
        error: () => {
          this.isDetectingMaven = false;
          this.stopDetectionFeedbackLoop();
          this.detectionTone = 'error';
          this.detectionMessage =
            'Falha ao detectar Maven automaticamente. Tente novamente ou preencha manualmente.';
        },
      });
  }

  private async finishMavenDetection(
    result: MavenDetectionResult,
    previousDashboardSignature: string,
    pollToken: number,
  ): Promise<void> {
    this.mavenPathControl.setValue(result.path);
    this.detectedVersion = result.version;
    this.dataService.setExecutionInProgress('Aguardando baseline PIT apos deteccao do Maven...');

    await this.waitForDashboardRefreshAfterDetection(previousDashboardSignature, pollToken);

    if (pollToken !== this.detectionPollToken) {
      return;
    }

    this.dataService.clearExecutionInProgress();
    this.isDetectingMaven = false;
    this.stopDetectionFeedbackLoop();
    this.detectionTone = 'success';
    this.detectionMessage =
      `${result.message} Selecione as classes e execute uma rodada para visualizar as metricas.`;
    this.cdr.markForCheck();
  }

  protected isSelectedClass(classId: string): boolean {
    return this.selectedClassIds.includes(classId);
  }

  protected toggleClassSelection(classId: string, event: MatCheckboxChange): void {
    if (event.checked) {
      this.selectedClassIds = [...this.selectedClassIds, classId];
      return;
    }

    this.selectedClassIds = this.selectedClassIds.filter((selectedId) => selectedId !== classId);
  }

  protected get selectedClasses(): ProjectClassOption[] {
    return this.classOptions.filter((classOption) => this.selectedClassIds.includes(classOption.id));
  }

  protected async executeMutationTests(): Promise<void> {
    if (!this.selectedClassIds.length) {
      this.runTone = 'error';
      this.runMessage = 'Selecione ao menos uma classe para iniciar.';
      return;
    }

    this.isStartingRun = true;
    this.activePollToken += 1;
    this.runTone = 'neutral';
    this.runMessage = 'Enviando classes para geracao com IA...';
    this.lastRunId = '';
    this.aiResults = [];
    this.dataService.setLastExecutionDuration(null);
    this.dataService.setExecutionInProgress('Gerando testes com IA...');

    try {
      const result = await this.dataService.startAiTestRun(this.selectedClassIds);
      this.lastRunId = result.runId;
      this.runMessage = result.message;

      if (result.status === 'queued' || result.status === 'running') {
        await this.trackAiRunProgress(result.runId, this.activePollToken);
      }
    } catch (error) {
      this.runTone = 'error';
      this.dataService.clearExecutionInProgress();
      const backendMessage =
        typeof error === 'object' &&
        error !== null &&
        'error' in error &&
        typeof (error as { error?: { message?: unknown } }).error?.message === 'string'
          ? (error as { error: { message: string } }).error.message
          : null;

      this.runMessage = backendMessage
        ?? (error instanceof Error ? `Falha: ${error.message}` : 'Falha ao iniciar geracao com IA.');
    } finally {
      this.isStartingRun = false;
      this.cdr.markForCheck();
    }
  }

  private async trackAiRunProgress(runId: string, pollToken: number): Promise<void> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      if (pollToken !== this.activePollToken) return;

      await this.wait(this.resolvePollIntervalMs(attempt));

      let status: AiTestRunStatus;
      try {
        status = await this.dataService.getAiTestRunStatus(runId);
      } catch {
        continue;
      }

      if (pollToken !== this.activePollToken) return;

      this.runMessage = status.message;
      this.dataService.updateExecutionInProgress(status.message);

      if (status.status === 'completed') {
        this.runTone = status.failed === 0 ? 'success' : 'neutral';
        this.aiResults = status.results;
        this.dataService.clearExecutionInProgress();
        this.dataService.setLastExecutionDuration(status.durationMs);
        await this.dataService.reloadSelectedProjectData();
        this.cdr.markForCheck();
        return;
      }

      if (status.status === 'failed') {
        this.runTone = 'error';
        this.dataService.clearExecutionInProgress();
        this.dataService.setLastExecutionDuration(status.durationMs);
        await this.dataService.reloadSelectedProjectData();
        this.cdr.markForCheck();
        return;
      }

      this.cdr.markForCheck();
    }

    this.runTone = 'error';
    this.runMessage = 'Tempo limite excedido aguardando conclusao da geracao.';
    this.dataService.clearExecutionInProgress();
    this.cdr.markForCheck();
  }

  private resolvePollIntervalMs(attempt: number): number {
    if (attempt < 6) {
      return 2000;
    }

    if (attempt < 18) {
      return 5000;
    }

    return 10000;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async waitForDashboardRefreshAfterDetection(
    previousDashboardSignature: string,
    pollToken: number,
  ): Promise<void> {
    for (let attempt = 0; attempt < this.maxDetectionRefreshAttempts; attempt++) {
      if (pollToken !== this.detectionPollToken) {
        return;
      }

      await this.wait(2000);

      if (pollToken !== this.detectionPollToken) {
        return;
      }

      await this.dataService.reloadSelectedProjectData();

      const currentSignature = this.buildDashboardSignature();
      if (currentSignature !== previousDashboardSignature) {
        return;
      }

      this.cdr.markForCheck();
    }
  }

  private buildDashboardSignature(): string {
    const gaugesSignature = this.dataService.gaugeMetrics
      .map((metric) => `${metric.id}:${metric.before}:${metric.after}`)
      .join('|');

    const insightsSignature = this.dataService.qualityInsights
      .map((insight) => `${insight.title}:${insight.detail}`)
      .join('|');

    return `${gaugesSignature}__${insightsSignature}`;
  }

  private startDetectionFeedbackLoop(): void {
    this.stopDetectionFeedbackLoop();
    this.detectionStartedAt = Date.now();
    this.detectionMessage = 'Detectando Maven e aguardando a conclusao do baseline PIT... 0s';
    this.detectionFeedbackTimer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - this.detectionStartedAt) / 1000);
      this.detectionMessage =
        `Detectando Maven e aguardando a conclusao do baseline PIT... ${elapsedSeconds}s`;
      this.cdr.markForCheck();
    }, 1000);
  }

  private stopDetectionFeedbackLoop(): void {
    if (this.detectionFeedbackTimer) {
      clearInterval(this.detectionFeedbackTimer);
      this.detectionFeedbackTimer = undefined;
    }
  }

}
