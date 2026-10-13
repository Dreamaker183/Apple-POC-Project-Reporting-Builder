/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const SourceReferenceSchema = z.object({
  passageText: z.string(),
  startIndex: z.number().optional(),
  endIndex: z.number().optional(),
  confidence: z.enum(['explicit', 'inferred', 'manual']),
  notes: z.string().optional(),
});

export const BaseCardSchema = z.object({
  id: z.string().min(1, 'Card ID is required'),
  title: z.string().min(1, 'Title is required'),
  createdAt: z.string(),
  updatedAt: z.string(),
  sourceRef: SourceReferenceSchema.optional(),
});

export const ExecutiveSummaryCardSchema = BaseCardSchema.extend({
  type: z.literal('executive_summary'),
  summary: z.string().min(1, 'Executive summary content is required'),
  keyAccomplishments: z.array(z.string()),
  statusNote: z.string().optional(),
});

export const MetricChartStyleSchema = z.enum(['number', 'bar', 'donut', 'trend']);

export const KpiMetricCardSchema = BaseCardSchema.extend({
  type: z.literal('kpi_metric'),
  label: z.string().min(1, 'Metric label is required'),
  value: z.number(),
  unit: z.string(),
  target: z.number().optional(),
  previousValue: z.number().optional(),
  trend: z.enum(['improving', 'neutral', 'declining']).optional(),
  explanation: z.string().optional(),
  chartStyle: MetricChartStyleSchema.optional(),
});

export const RiskBlockerCardSchema = BaseCardSchema.extend({
  type: z.literal('risk_blocker'),
  description: z.string().min(1, 'Risk/blocker description is required'),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  isBlocker: z.boolean(),
  impact: z.string().optional(),
  mitigation: z.string().optional(),
  owner: z.string().optional(),
});

export const NextStepItemSchema = z.object({
  id: z.string(),
  action: z.string().min(1, 'Action description is required'),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'completed']),
  sourceRef: SourceReferenceSchema.optional(),
});

export const NextStepsCardSchema = BaseCardSchema.extend({
  type: z.literal('next_steps'),
  items: z.array(NextStepItemSchema),
});

export const MilestoneCardSchema = BaseCardSchema.extend({
  type: z.literal('milestone'),
  description: z.string().min(1, 'Milestone description is required'),
  status: z.enum(['achieved', 'on_track', 'at_risk', 'delayed']),
  dueDate: z.string().optional(),
  owner: z.string().optional(),
});

export const VisualUpdateCardSchema = BaseCardSchema.extend({
  type: z.literal('visual_update'),
  imageUrl: z.string().min(1, 'Image URL or data is required'),
  altText: z.string().min(1, 'Alternative text is required for accessibility'),
  caption: z.string(),
  context: z.string().optional(),
});

export const SnippetCardSchema = z.discriminatedUnion('type', [
  ExecutiveSummaryCardSchema,
  KpiMetricCardSchema,
  RiskBlockerCardSchema,
  NextStepsCardSchema,
  MilestoneCardSchema,
  VisualUpdateCardSchema,
]);

export const MetricInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Metric name is required'),
  value: z.number(),
  unit: z.string(),
  target: z.number().optional(),
  previousValue: z.number().optional(),
  explanation: z.string().optional(),
  chartStyle: MetricChartStyleSchema.optional(),
});

export const ImageAssetInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dataUrl: z.string().min(1, 'Image data is required'),
  altText: z.string().min(1, 'Alt text is required'),
  fileSize: z.number().max(5 * 1024 * 1024, 'Image size must be 5MB or less'),
  fileType: z.string().refine((val) => ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(val), {
    message: 'Only PNG, JPEG, WebP, and SVG formats are supported',
  }),
});

export const ReportProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Report title is required'),
  reportingPeriod: z.string(),
  rawNotes: z.string(),
  metrics: z.array(MetricInputSchema),
  images: z.array(ImageAssetInputSchema),
  cards: z.array(SnippetCardSchema),
  lastSavedAt: z.string(),
  isDirty: z.boolean().optional(),
});
