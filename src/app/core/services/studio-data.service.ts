import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DiffSnapshot,
  GaugeMetric,
  InsightFeedback,
  NewWorkspaceProjectInput,
  ProjectClassOption,
  ProjectSetupData,
  QuickStat,
  WorkspaceProject,
} from '../models/studio.models';

interface ApiItemsResponse<T> {
  items: T[];
}

interface ApiDashboardData {
  gaugeMetrics: GaugeMetric[];
  insights: InsightFeedback[];
  diffSnapshot: DiffSnapshot;
  durationMs: number | null;
}

export interface MavenDetectionResult {
  found: boolean;
  path: string;
  version: string;
  message: string;
}

export interface MutationRunResult {
  runId: string;
  status: string;
  message: string;
  simulated: boolean;
}

export interface MutationRunStatus {
  runId: string;
  projectId: string;
  status: string;
  message: string;
  simulated: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  exitCode: number | null;
  command: string[];
  output: string[];
}

export interface AiTestRunResult {
  runId: string;
  status: string;
  message: string;
}

export interface AiTestClassResult {
  className: string;
  fqn: string;
  passed: boolean;
  testPath: string;
  errors: string[];
}

export interface AiTestRunStatus {
  runId: string;
  projectId: string;
  status: string;
  message: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  totalClasses: number;
  passed: number;
  failed: number;
  results: AiTestClassResult[];
}

@Injectable({
  providedIn: 'root',
})
export class StudioDataService {
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly windowsMavenPath = 'C:\\tools\\apache-maven-3.9.9\\bin\\mvn.cmd';
  private readonly unixMavenPath = '/usr/bin/mvn';

  private projects: WorkspaceProject[] = [];
  private selectedProjectId: string | null = null;

  private classOptions: ProjectClassOption[] = [];
  private lastExecutionDurationMs: number | null = null;
  private activeExecutionStartedAt: number | null = null;
  private activeExecutionLabel: string | null = null;

  private elapsedTimer?: ReturnType<typeof setInterval>;
  elapsedMsSignal = signal<number | null>(null);

  gaugeMetricsSignal = signal<GaugeMetric[]>([]);
  qualityInsightsSignal = signal<InsightFeedback[]>([]);
  diffSnapshotSignal = signal<DiffSnapshot>(this.emptyDiffSnapshot());
  projectSetupDataSignal = signal<ProjectSetupData>({ projectName: 'Projeto', mavenPath: '', classOptions: [] });
  selectedProjectSignal = signal<WorkspaceProject | undefined>(undefined);

  gaugeMetrics: GaugeMetric[] = [];
  qualityInsights: InsightFeedback[] = [];
  diffSnapshot: DiffSnapshot = this.emptyDiffSnapshot();
  apiConnected = true;

  constructor(private readonly http: HttpClient) {}

  async bootstrap(): Promise<void> {
    await this.refreshProjectsFromApi();
  }

  async refreshProjectsFromApi(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiItemsResponse<WorkspaceProject>>(`${this.apiBaseUrl}/projects`),
      );

      this.apiConnected = true;

      if (!response?.items?.length) {
        return;
      }

      this.projects = [...response.items];

      if (!this.selectedProjectId || !this.getProjectById(this.selectedProjectId)) {
        this.selectedProjectId = this.projects[0].id;
      }

      this.selectedProjectSignal.set(this.getProjectById(this.selectedProjectId));
    } catch {
      this.apiConnected = false;
    }
  }

  get quickStats(): QuickStat[] {
    const selected = this.getSelectedProject();
    const score = selected?.lastMutationScore ?? 0;
    const hasRunData = this.gaugeMetrics.length > 0;
    const coverageRate = this.gaugeMetrics.find((metric) => metric.id === 'coverage-rate')?.after ?? 0;

    return [
      {
        label: 'Mutation score atual',
        value: hasRunData ? `${score}%` : '--',
        trend: hasRunData
          ? 'Acompanhamento da ultima rodada concluida'
          : 'Aguardando primeira execucao',
        tone: 'emerald',
      },
      {
        label: 'Cobertura de mutacao',
        value: hasRunData ? `${coverageRate}%` : '--',
        trend: hasRunData ? 'Mutantes cobertos por testes' : 'Sem dados ainda',
        tone: 'amber',
      },
      {
        label: 'Tempo de execucao',
        value: this.activeExecutionStartedAt !== null
          ? this.formatDuration(this.elapsedMsSignal() ?? (Date.now() - this.activeExecutionStartedAt))
          : this.lastExecutionDurationMs !== null
          ? this.formatDuration(this.lastExecutionDurationMs)
          : '--',
        trend: this.activeExecutionLabel
          ? this.activeExecutionLabel
          : this.lastExecutionDurationMs !== null
          ? 'Duracao da ultima geracao concluida'
          : (hasRunData ? 'Sem geracao concluida nesta sessao' : 'Sem execucao registrada'),
        tone: 'soft-blue',
      },
    ];
  }

  listProjects(): WorkspaceProject[] {
    return [...this.projects];
  }

  getProjectById(projectId: string): WorkspaceProject | undefined {
    return this.projects.find((project) => project.id === projectId);
  }

  getSelectedProject(): WorkspaceProject | undefined {
    if (!this.selectedProjectId) {
      return this.projects[0];
    }

    return this.getProjectById(this.selectedProjectId);
  }

  async selectProject(projectId: string): Promise<void> {
    const project = this.getProjectById(projectId);
    if (!project) {
      return;
    }

    if (this.selectedProjectId !== projectId) {
      this.selectedProjectId = projectId;
      this.resetSelectedProjectData();
    }

    this.selectedProjectSignal.set(project);
    await this.loadSelectedProjectData();
  }

  private resetSelectedProjectData(): void {
    this.classOptions = [];
    this.gaugeMetrics = [];
    this.qualityInsights = [];
    this.diffSnapshot = this.emptyDiffSnapshot();
    this.lastExecutionDurationMs = null;
    this.activeExecutionStartedAt = null;
    this.activeExecutionLabel = null;
    this.stopElapsedTimer();

    this.gaugeMetricsSignal.set([]);
    this.qualityInsightsSignal.set([]);
    this.diffSnapshotSignal.set(this.emptyDiffSnapshot());
    this.projectSetupDataSignal.set(this.getProjectSetupData());
  }

  async addProject(input: NewWorkspaceProjectInput): Promise<WorkspaceProject> {
    const payload: NewWorkspaceProjectInput = {
      name: input.name.trim(),
      repositoryPath: input.repositoryPath.trim(),
      mavenPath: input.mavenPath.trim(),
    };

    try {
      const createdProject = await firstValueFrom(
        this.http.post<WorkspaceProject>(`${this.apiBaseUrl}/projects`, payload),
      );

      this.projects = [createdProject, ...this.projects];

      if (!this.selectedProjectId) {
        this.selectedProjectId = createdProject.id;
      }

      return createdProject;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 0) {
        const localProject: WorkspaceProject = {
          id: this.buildProjectId(payload.name),
          name: payload.name,
          repositoryPath: payload.repositoryPath,
          mavenPath: payload.mavenPath,
          lastMutationScore: 0,
          updatedAt: 'Projeto novo',
        };

        this.projects = [localProject, ...this.projects];
        return localProject;
      }

      const message =
        error instanceof HttpErrorResponse
          ? error.error?.message || error.message
          : 'Nao foi possivel adicionar o projeto.';

      throw new Error(message);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<void>(`${this.apiBaseUrl}/projects/${projectId}`));
    } catch {
    }

    this.projects = this.projects.filter((project) => project.id !== projectId);

    if (this.selectedProjectId === projectId) {
      this.selectedProjectId = this.projects[0]?.id ?? null;
      this.resetSelectedProjectData();
      this.selectedProjectSignal.set(this.getProjectById(this.selectedProjectId ?? ''));
      await this.loadSelectedProjectData();
    }
  }

  getProjectSetupData(projectId?: string): ProjectSetupData {
    const project = projectId ? this.getProjectById(projectId) : this.getSelectedProject();

    return {
      projectName: project?.name ?? 'Projeto',
      mavenPath: this.resolveMavenPathForCurrentPlatform(project?.mavenPath),
      classOptions: [...this.classOptions],
    };
  }

  detectMaven(projectId?: string): Observable<MavenDetectionResult> {
    const selectedId = projectId ?? this.selectedProjectId;
    const selected = selectedId ? this.getProjectById(selectedId) : this.getSelectedProject();
    const fallbackPath = this.resolveMavenPathForCurrentPlatform(selected?.mavenPath);
    const fallback: MavenDetectionResult = {
      found: true,
      path: fallbackPath,
      version: 'desconhecida',
      message: this.buildLocalDetectionMessage(fallbackPath),
    };

    if (!selectedId) {
      return of(fallback).pipe(delay(700));
    }

    return this.http
      .post<MavenDetectionResult>(`${this.apiBaseUrl}/projects/${selectedId}/detect-maven`, {})
      .pipe(catchError(() => of(fallback).pipe(delay(700))));
  }

  browseFolder(): Observable<{ path: string; error?: string }> {
    return this.http.post<{ path: string; error?: string }>(`${this.apiBaseUrl}/utils/browse-folder`, {});
  }

  browseFile(): Observable<{ path: string; error?: string }> {
    return this.http.post<{ path: string; error?: string }>(`${this.apiBaseUrl}/utils/browse-file`, {});
  }

  getAiModel(): Observable<{ model: string }> {
    return this.http.get<{ model: string }>(`${this.apiBaseUrl}/config/ai-model`);
  }

  setAiModel(model: string): Observable<{ model: string }> {
    return this.http.put<{ model: string }>(`${this.apiBaseUrl}/config/ai-model`, { model });
  }

  async startMutationRun(classes: string[], mavenPath: string): Promise<MutationRunResult> {
    const projectId = this.selectedProjectId;
    if (!projectId) {
      throw new Error('Nenhum projeto selecionado.');
    }

    return firstValueFrom(
      this.http.post<MutationRunResult>(`${this.apiBaseUrl}/mutation-runs`, {
        projectId,
        mavenPath: mavenPath.trim(),
        classes,
      }),
    );
  }

  async getMutationRunStatus(runId: string): Promise<MutationRunStatus> {
    return firstValueFrom(this.http.get<MutationRunStatus>(`${this.apiBaseUrl}/mutation-runs/${runId}`));
  }

  async startAiTestRun(classes: string[]): Promise<AiTestRunResult> {
    const projectId = this.selectedProjectId;
    if (!projectId) throw new Error('Nenhum projeto selecionado.');
    return firstValueFrom(
      this.http.post<AiTestRunResult>(`${this.apiBaseUrl}/projects/${projectId}/generate-tests`, { classes }),
    );
  }

  async getAiTestRunStatus(runId: string): Promise<AiTestRunStatus> {
    return firstValueFrom(this.http.get<AiTestRunStatus>(`${this.apiBaseUrl}/ai-test-runs/${runId}`));
  }

  async reloadSelectedProjectData(): Promise<void> {
    await this.loadSelectedProjectData();
  }

  setLastExecutionDuration(durationMs: number | null): void {
    this.lastExecutionDurationMs = durationMs;
  }

  setExecutionInProgress(label: string): void {
    this.activeExecutionStartedAt = Date.now();
    this.activeExecutionLabel = label;
    this.startElapsedTimer();
  }

  updateExecutionInProgress(label: string): void {
    if (this.activeExecutionStartedAt === null) {
      this.activeExecutionStartedAt = Date.now();
    }
    this.activeExecutionLabel = label;
    this.startElapsedTimer();
  }

  clearExecutionInProgress(): void {
    this.activeExecutionStartedAt = null;
    this.activeExecutionLabel = null;
    this.stopElapsedTimer();
  }

  private startElapsedTimer(): void {
    this.tickElapsed();
    if (this.elapsedTimer) {
      return;
    }
    this.elapsedTimer = setInterval(() => this.tickElapsed(), 1000);
  }

  private tickElapsed(): void {
    if (this.activeExecutionStartedAt === null) {
      return;
    }
    this.elapsedMsSignal.set(Date.now() - this.activeExecutionStartedAt);
  }

  private stopElapsedTimer(): void {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = undefined;
    }
    this.elapsedMsSignal.set(null);
  }

  private async loadSelectedProjectData(): Promise<void> {
    const selectedId = this.selectedProjectId;
    if (!selectedId) {
      return;
    }

    try {
      const [classesResponse, dashboardResponse] = await Promise.all([
        firstValueFrom(
          this.http.get<ApiItemsResponse<ProjectClassOption>>(
            `${this.apiBaseUrl}/projects/${selectedId}/classes`,
          ),
        ),
        firstValueFrom(
          this.http.get<ApiDashboardData>(`${this.apiBaseUrl}/projects/${selectedId}/dashboard`),
        ),
      ]);

      this.apiConnected = true;

      this.classOptions = classesResponse.items?.length
        ? [...classesResponse.items]
        : [];

      this.gaugeMetrics = dashboardResponse.gaugeMetrics?.length
        ? [...dashboardResponse.gaugeMetrics]
        : [];

      this.qualityInsights = dashboardResponse.insights?.length
        ? [...dashboardResponse.insights]
        : [];

      this.diffSnapshot = dashboardResponse.diffSnapshot ?? this.emptyDiffSnapshot();
      this.lastExecutionDurationMs = dashboardResponse.durationMs ?? null;

      this.gaugeMetricsSignal.set([...this.gaugeMetrics]);
      this.qualityInsightsSignal.set([...this.qualityInsights]);
      this.diffSnapshotSignal.set({...this.diffSnapshot});

      const selectedProject = this.getProjectById(selectedId);
      const mutationMetric = this.gaugeMetrics.find((metric) => metric.id === 'mutation-score');
      if (selectedProject && mutationMetric) {
        selectedProject.lastMutationScore = mutationMetric.after;
      }

      this.projectSetupDataSignal.set(this.getProjectSetupData(selectedId));
    } catch {
      this.apiConnected = false;
      this.classOptions = [
        {
          id: 'UserServiceTest',
          packageName: 'com.company.user',
          statusLabel: 'Alta prioridade',
          statusTone: 'amber',
          estimatedMutants: 14,
          preselected: true,
          mutantsAreReal: false,
        },
        {
          id: 'PaymentValidatorTest',
          packageName: 'com.company.payment',
          statusLabel: 'Recém modificado',
          statusTone: 'emerald',
          estimatedMutants: 8,
          preselected: false,
          mutantsAreReal: false,
        },
        {
          id: 'NotificationServiceTest',
          packageName: 'com.company.notification',
          statusLabel: 'Baixa cobertura',
          statusTone: 'soft-blue',
          estimatedMutants: 19,
          preselected: false,
          mutantsAreReal: false,
        },
      ];

      this.gaugeMetrics = [
        {
          id: 'mutation-score',
          label: 'Mutation Score',
          before: 0,
          after: 0,
          helper: 'Percentual de mutantes eliminados pelo total gerado',
          tone: 'emerald',
        },
        {
          id: 'coverage-rate',
          label: 'Cobertura de mutacao',
          before: 0,
          after: 0,
          helper: 'Mutantes cobertos por pelo menos um teste',
          tone: 'soft-blue',
        },
        {
          id: 'survivor-of-covered',
          label: 'Sobreviventes cobertos',
          before: 0,
          after: 0,
          helper: 'Dos cobertos, percentual que os testes nao detectaram',
          tone: 'amber',
        },
      ];

      this.qualityInsights = [
        {
          tone: 'amber',
          title: 'Gere testes para obter resultados',
          detail: 'Nenhum resultado de mutação disponível ainda. Execute a detecção de Maven e gere testes para visualizar as métricas.',
          recommendation: 'Clique em "Detectar Maven" e depois execute a rodada de testes.',
        },
      ];

      this.diffSnapshot = {
        beforeLabel: 'Antes - sem dados',
        afterLabel: 'Depois - execute para gerar testes',
        beforeLines: [
          { line: 1, code: 'Aguardando geração de testes...', kind: 'context' },
        ],
        afterLines: [
          { line: 1, code: 'Clique em "Detectar Maven" para começar', kind: 'context' },
        ],
      };
      this.lastExecutionDurationMs = null;

      this.gaugeMetricsSignal.set([...this.gaugeMetrics]);
      this.qualityInsightsSignal.set([...this.qualityInsights]);
      this.diffSnapshotSignal.set({...this.diffSnapshot});
      this.projectSetupDataSignal.set(this.getProjectSetupData(selectedId));
    }
  }

  private emptyDiffSnapshot(): DiffSnapshot {
    return {
      beforeLabel: 'Antes - sem execucao',
      afterLabel: 'Depois - sem execucao',
      beforeLines: [],
      afterLines: [],
    };
  }

  private buildProjectId(projectName: string): string {
    const slug = projectName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${slug || 'project'}-${Date.now().toString(36).slice(-4)}`;
  }

  private resolveMavenPathForCurrentPlatform(rawPath?: string): string {
    const trimmedPath = rawPath?.trim() ?? '';

    if (!trimmedPath) {
      return this.getDefaultMavenPath();
    }

    if (!this.isWindowsPlatform() && this.looksLikeWindowsMavenPath(trimmedPath)) {
      return this.getDefaultMavenPath();
    }

    return trimmedPath;
  }

  private buildLocalDetectionMessage(path: string): string {
    if (this.isWindowsPlatform()) {
      return 'Maven detectado automaticamente no ambiente local.';
    }

    if (path === this.unixMavenPath) {
      return 'Maven detectado automaticamente para Linux/Unix.';
    }

    return 'Maven detectado automaticamente no ambiente local.';
  }

  private getDefaultMavenPath(): string {
    return this.isWindowsPlatform() ? this.windowsMavenPath : this.unixMavenPath;
  }

  private isWindowsPlatform(): boolean {
    const navigatorWithPlatform = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { userAgentData?: { platform?: string } })
      : undefined;
    const platform = navigatorWithPlatform?.userAgentData?.platform ?? navigatorWithPlatform?.platform ?? '';

    return /win/i.test(platform);
  }

  private looksLikeWindowsMavenPath(path: string): boolean {
    return /^[a-zA-Z]:\\/.test(path) || /[\\\/]bin[\\\/]mvn\.cmd$/i.test(path);
  }

  private formatDuration(durationMs: number): string {
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
}
