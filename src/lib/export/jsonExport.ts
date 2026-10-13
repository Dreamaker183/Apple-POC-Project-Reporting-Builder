/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportProject, SnippetCard } from '../../types/report';
import { ReportProjectSchema, SnippetCardSchema } from '../../schemas/reportSchema';
import { z } from 'zod';

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
    metricsSummary: project.metrics.map(m => ({
      name: m.name,
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
        if (cardVal.success) {
          reconstructedCards.push(cardVal.data as SnippetCard);
        }
      }

      const project: ReportProject = {
        id: raw.project.id || `proj-${Date.now()}`,
        title: raw.project.title || 'Imported Project',
        reportingPeriod: raw.project.reportingPeriod || '',
        rawNotes: '',
        metrics: Array.isArray(raw.metricsSummary) ? raw.metricsSummary.map((m: any, idx: number) => ({
          id: `metric-imported-${idx}`,
          name: m.name || '',
          value: Number(m.value) || 0,
          unit: m.unit || '',
          target: m.target !== undefined ? Number(m.target) : undefined,
          previousValue: m.previousValue !== undefined ? Number(m.previousValue) : undefined,
          explanation: m.explanation,
          chartStyle: ['number', 'bar', 'donut', 'trend'].includes(m.chartStyle) ? m.chartStyle : undefined,
          direction: ['higher', 'lower', 'neutral'].includes(m.direction) ? m.direction : undefined,
        })) : [],
        images: [],
        cards: reconstructedCards,
        lastSavedAt: new Date().toISOString(),
        isDirty: false,
      };

      return { success: true, data: project };
    }

    return { success: false, error: 'JSON does not match Project Reporting Builder format.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid JSON syntax' };
  }
}
