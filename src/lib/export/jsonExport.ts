/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportProject, SnippetCard } from '../../types/report';
import { MetricInputSchema, ReportProjectSchema, SnippetCardSchema } from '../../schemas/reportSchema';
import { z } from 'zod';

const MetricsSummarySchema = z.array(MetricInputSchema.extend({
  id: z.string().min(1).optional(),
}));

export function exportReportToJson(project: ReportProject, selectedCards?: SnippetCard[]): string {
  const cardsToExport = selectedCards && selectedCards.length > 0 ? selectedCards : project.cards;

  const exportPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      title: project.title,
      reportingPeriod: project.reportingPeriod,
    },
    metricsSummary: cardsToExport.filter(card => card.type === 'kpi_metric').map(m => ({
      id: m.sourceKey?.startsWith('metric:') ? m.sourceKey.slice('metric:'.length) || m.id : m.id,
      name: m.label,
      value: m.value,
      unit: m.unit,
      target: m.target,
      previousValue: m.previousValue,
      explanation: m.explanation,
      chartStyle: m.chartStyle,
      direction: m.direction,
    })),
    cards: cardsToExport.map(card => {
      // Clean unnecessary UI transients if any
      const { id, type, title, createdAt, updatedAt, sourceRef, ...content } = card;
      return {
        id,
        type,
        title,
        createdAt,
        updatedAt,
        sourceRef,
        content,
      };
    }),
  };

  return JSON.stringify(exportPayload, null, 2);
}

export function importReportFromJson(jsonString: string): { success: boolean; data?: ReportProject; error?: string } {
  try {
    const raw = JSON.parse(jsonString);

    // If it's a direct project draft export
    if (raw.title && raw.cards) {
      const validated = ReportProjectSchema.safeParse(raw);
      if (validated.success) {
        return { success: true, data: validated.data as ReportProject };
      }
    }

    // If it's the structured export format
    if (raw.project && Array.isArray(raw.cards)) {
      const reconstructedCards: SnippetCard[] = [];
      for (const item of raw.cards) {
        const flatCard = {
          id: item.id || `card-${Date.now()}-${Math.random()}`,
          type: item.type,
          title: item.title,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          sourceRef: item.sourceRef,
          ...(item.content || {}),
        };
        const cardVal = SnippetCardSchema.safeParse(flatCard);
        if (!cardVal.success) {
          return { success: false, error: 'Invalid report card in JSON export.' };
        }
        reconstructedCards.push(cardVal.data as SnippetCard);
      }

      const project: ReportProject = {
        id: raw.project.id || `proj-${Date.now()}`,
        title: raw.project.title || 'Imported Project',
        reportingPeriod: raw.project.reportingPeriod || '',
        rawNotes: '',
        metrics: MetricsSummarySchema.parse(raw.metricsSummary ?? []).map((metric, idx) => ({
          ...metric,
          id: metric.id ?? `metric-imported-${idx}`,
        })),
        images: [],
        cards: reconstructedCards,
        lastSavedAt: new Date().toISOString(),
        isDirty: false,
      };

      const validated = ReportProjectSchema.safeParse(project);
      if (!validated.success) {
        return { success: false, error: 'Invalid project in JSON export.' };
      }
      return { success: true, data: validated.data as ReportProject };
    }

    return { success: false, error: 'JSON does not match Project Reporting Builder format.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid JSON syntax' };
  }
}
