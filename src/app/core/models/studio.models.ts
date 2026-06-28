export type BadgeTone = 'soft-blue' | 'emerald' | 'amber' | 'muted';

export interface WorkspaceProject {
  id: string;
  name: string;
  repositoryPath: string;
  mavenPath: string;
  lastMutationScore: number;
  updatedAt: string;
}

export interface NewWorkspaceProjectInput {
  name: string;
  repositoryPath: string;
  mavenPath: string;
}

export interface QuickStat {
  label: string;
  value: string;
  trend: string;
  tone: Exclude<BadgeTone, 'muted'>;
}

export interface ProjectClassOption {
  id: string;
  packageName: string;
  statusLabel: string;
  statusTone: BadgeTone;
  estimatedMutants: number;
  preselected: boolean;
  mutantsAreReal: boolean;
}

export interface ProjectSetupData {
  projectName: string;
  mavenPath: string;
  classOptions: ProjectClassOption[];
}

export interface GaugeMetric {
  id: string;
  label: string;
  helper: string;
  before: number;
  after: number;
  tone: Exclude<BadgeTone, 'muted'>;
}

export interface InsightFeedback {
  title: string;
  detail: string;
  recommendation: string;
  tone: Exclude<BadgeTone, 'muted'>;
}

export interface DiffLine {
  line: number;
  code: string;
  kind: 'context' | 'added' | 'removed';
}

export interface DiffSnapshot {
  beforeLabel: string;
  afterLabel: string;
  beforeLines: DiffLine[];
  afterLines: DiffLine[];
}

