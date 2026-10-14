/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CardType = 
  | 'executive_summary'
  | 'kpi_metric'
  | 'risk_blocker'
  | 'next_steps'
  | 'milestone'
  | 'visual_update';

export type MetricChartStyle = 'number' | 'bar' | 'donut' | 'trend';

export interface SourceReference {
  passageText: string;
  startIndex?: number;
  endIndex?: number;
  confidence: 'explicit' | 'inferred' | 'manual';
  notes?: string;
}

export interface BaseCard {
  id: string;
  type: CardType;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceRef?: SourceReference;
  sourceKey?: string;
  manuallyEdited?: boolean;
}

export interface ExecutiveSummaryCardData extends BaseCard {
  type: 'executive_summary';
  summary: string;
  keyAccomplishments: string[];
  statusNote?: string; // e.g. "Release date unconfirmed"
}

export interface KpiMetricCardData extends BaseCard {
  type: 'kpi_metric';
  label: string;
  value: number;
  unit: string;
  target?: number;
  previousValue?: number;
  trend?: 'improving' | 'neutral' | 'declining';
  explanation?: string;
  chartStyle?: MetricChartStyle;
  direction?: 'higher' | 'lower' | 'neutral';
}

export interface RiskBlockerCardData extends BaseCard {
  type: 'risk_blocker';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  isBlocker: boolean;
  impact?: string;
  mitigation?: string;
  owner?: string;
}

export interface NextStepsCardData extends BaseCard {
  type: 'next_steps';
  items: Array<{
    id: string;
    action: string;
    owner?: string;
    dueDate?: string;
    status: 'planned' | 'in_progress' | 'completed';
    sourceRef?: SourceReference;
  }>;
}

export interface MilestoneCardData extends BaseCard {
  type: 'milestone';
  description: string;
  status: 'achieved' | 'on_track' | 'at_risk' | 'delayed';
  dueDate?: string;
  owner?: string;
}

export interface VisualUpdateCardData extends BaseCard {
  type: 'visual_update';
  imageUrl: string;
  altText: string;
  caption: string;
  context?: string;
}

export type SnippetCard =
  | ExecutiveSummaryCardData
  | KpiMetricCardData
  | RiskBlockerCardData
  | NextStepsCardData
  | MilestoneCardData
  | VisualUpdateCardData;

export interface MetricInput {
  id: string;
  name: string;
  value: number;
  unit: string;
  target?: number;
  previousValue?: number;
  explanation?: string;
  chartStyle?: MetricChartStyle;
  direction?: 'higher' | 'lower' | 'neutral';
}

export interface ImageAssetInput {
  id: string;
  name: string;
  dataUrl: string;
  altText: string;
  fileSize: number;
  fileType: string;
}

export interface SendSchedule {
  enabled: boolean;
  scheduledAt: string;
  destination: 'slack' | 'teams' | 'googleChat' | 'discord';
  status: 'scheduled' | 'sending' | 'sent' | 'error';
  message?: string;
}

export interface ReportProject {
  id: string;
  title: string;
  reportingPeriod: string;
  sendSchedule?: SendSchedule;
  folderId?: string;
  rawNotes: string;
  metrics: MetricInput[];
  images: ImageAssetInput[];
  cards: SnippetCard[];
  lastSavedAt: string;
  isDirty: boolean;
}

export interface ProjectFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface PeriodSnapshot {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  cards: SnippetCard[];
  origin: 'auto' | 'manual';
  project?: ReportProject;
}

export interface ProjectLibrary {
  version: 1;
  folders: ProjectFolder[];
  projects: ReportProject[];
  snapshots: PeriodSnapshot[];
  activeProjectId: string;
}

export interface ReadinessItem {
  id: string;
  category: 'completeness' | 'metrics' | 'ownership' | 'accessibility';
  label: string;
  status: 'pass' | 'warning' | 'fail';
  description: string;
  actionableFix: string;
  cardId?: string;
}

export interface ReadinessScore {
  score: number; // 0 to 100
  totalChecks: number;
  passedChecks: number;
  items: ReadinessItem[];
}

export type ExportDestination = 
  | 'executive_email'
  | 'slack'
  | 'teams'
  | 'weekly_status'
  | 'markdown'
  | 'json'
  | 'html';
