/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  SnippetCardSchema,
  ExecutiveSummaryCardSchema,
  KpiMetricCardSchema,
  MilestoneCardSchema,
  NextStepsCardSchema,
  RiskBlockerCardSchema,
  VisualUpdateCardSchema,
} from '../schemas/reportSchema';

/**
 * Pure helper mirroring EditableText commit logic:
 * - If cancelRef is true, no commit
 * - If trimmed === value, no commit
 * - If trimmed is truthy, commits trimmed string
 * - If trimmed is falsy and allowEmpty is true, commits ''
 * - If trimmed is falsy and allowEmpty is false, no commit (cannot be null)
 */
function simulateEditableTextCommit(
  initialValue: string,
  draft: string,
  allowEmpty: boolean = false,
  cancelled: boolean = false
): string | null {
  if (cancelled) return null;
  const trimmed = draft.trim();
  if (trimmed === initialValue) return null;
  if (trimmed) return trimmed;
  if (allowEmpty) return '';
  return null;
}

describe('Field classification and nullability rules', () => {
  describe('EditableText commit logic', () => {
    it('blocks clearing to empty when allowEmpty is false (Required field)', () => {
      const result = simulateEditableTextCommit('Original Title', '', false);
      expect(result).toBeNull();
    });

    it('blocks clearing whitespace-only when allowEmpty is false (Required field)', () => {
      const result = simulateEditableTextCommit('Original Title', '   \t  \n  ', false);
      expect(result).toBeNull();
    });

    it('allows clearing to empty string when allowEmpty is true (Optional field)', () => {
      const result = simulateEditableTextCommit('2026-10-24', '', true);
      expect(result).toBe('');
    });

    it('allows clearing whitespace-only to empty string when allowEmpty is true', () => {
      const result = simulateEditableTextCommit('Alex', '   ', true);
      expect(result).toBe('');
    });

    it('commits trimmed new string for both required and optional fields when non-empty', () => {
      expect(simulateEditableTextCommit('Old', '  New  ', false)).toBe('New');
      expect(simulateEditableTextCommit('Old', '  New  ', true)).toBe('New');
    });

    it('returns null if edit was cancelled via Escape key', () => {
      expect(simulateEditableTextCommit('Old', '', true, true)).toBeNull();
      expect(simulateEditableTextCommit('Old', 'New', false, true)).toBeNull();
    });
  });

  describe('Category A: Cannot be Null (Required Fields Schema Validation)', () => {
    it('requires KPI metric label and value', () => {
      const valid = {
        id: 'kpi-1',
        type: 'kpi_metric' as const,
        title: 'Throughput',
        label: 'Throughput',
        value: 42,
        unit: 'req/s',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(KpiMetricCardSchema.safeParse(valid).success).toBe(true);

      // Value cannot be undefined or non-number
      expect(KpiMetricCardSchema.safeParse({ ...valid, value: undefined }).success).toBe(false);
      expect(KpiMetricCardSchema.safeParse({ ...valid, value: 'nan' as any }).success).toBe(false);

      // Label/Title cannot be empty
      expect(KpiMetricCardSchema.safeParse({ ...valid, label: '', title: '' }).success).toBe(false);
    });

    it('requires Milestone title', () => {
      const valid = {
        id: 'ms-1',
        type: 'milestone' as const,
        title: 'Beta Launch',
        description: 'Complete user testing',
        status: 'on_track' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(MilestoneCardSchema.safeParse(valid).success).toBe(true);
      expect(MilestoneCardSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
    });

    it('requires Risk/Blocker title', () => {
      const valid = {
        id: 'rk-1',
        type: 'risk_blocker' as const,
        title: 'Vendor API Delay',
        description: 'Awaiting webhook credentials',
        severity: 'high' as const,
        isBlocker: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(RiskBlockerCardSchema.safeParse(valid).success).toBe(true);
      expect(RiskBlockerCardSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
    });

    it('requires NextSteps action items to have non-empty action text', () => {
      const valid = {
        id: 'ns-1',
        type: 'next_steps' as const,
        title: 'Next Steps',
        items: [
          {
            id: 'it-1',
            action: 'Configure production DNS',
            status: 'planned' as const,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(NextStepsCardSchema.safeParse(valid).success).toBe(true);
      expect(
        NextStepsCardSchema.safeParse({
          ...valid,
          items: [{ id: 'it-1', action: '', status: 'planned' as const }],
        }).success
      ).toBe(false);
    });
  });

  describe('Category B: Can be Null / Empty (Optional Fields Schema Validation)', () => {
    it('allows KPI metric unit to be empty and explanation to be undefined', () => {
      const card = {
        id: 'kpi-2',
        type: 'kpi_metric' as const,
        title: 'Headcount',
        label: 'Headcount',
        value: 15,
        unit: '', // cleared unit
        explanation: undefined, // cleared explanation
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = KpiMetricCardSchema.safeParse(card);
      expect(result.success).toBe(true);
    });

    it('requires Milestone description to be non-empty but allows dueDate and owner to be null/undefined', () => {
      const card = {
        id: 'ms-2',
        type: 'milestone' as const,
        title: 'Milestone with no due date or owner',
        description: 'Completed integration tests',
        status: 'on_track' as const,
        dueDate: undefined, // cleared dueDate
        owner: undefined, // cleared owner
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(MilestoneCardSchema.safeParse(card).success).toBe(true);

      // Clearing description to empty fails schema validation (it is required)
      expect(MilestoneCardSchema.safeParse({ ...card, description: '' }).success).toBe(false);
    });

    it('allows Executive Summary statusNote to be null/undefined', () => {
      const card = {
        id: 'es-1',
        type: 'executive_summary' as const,
        title: 'Executive Summary',
        summary: 'Solid progress across all squads.',
        keyAccomplishments: ['Deployed auth gateway'],
        statusNote: undefined, // cleared statusNote
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(ExecutiveSummaryCardSchema.safeParse(card).success).toBe(true);
    });

    it('removing an accomplishment item when cleared leaves a valid list of accomplishments', () => {
      const initial = ['Goal 1', 'Goal 2', 'Goal 3'];
      const indexToRemove = 1; // user cleared Goal 2
      const updated = initial.filter((_, i) => i !== indexToRemove);
      expect(updated).toEqual(['Goal 1', 'Goal 3']);

      const card = {
        id: 'es-2',
        type: 'executive_summary' as const,
        title: 'Executive Summary',
        summary: 'Summary text.',
        keyAccomplishments: updated,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(ExecutiveSummaryCardSchema.safeParse(card).success).toBe(true);
    });

    it('allows NextSteps item owner and dueDate to be null/undefined', () => {
      const card = {
        id: 'ns-2',
        type: 'next_steps' as const,
        title: 'Next Steps',
        items: [
          {
            id: 'it-2',
            action: 'Self-serve documentation writeup',
            owner: undefined, // cleared owner
            dueDate: undefined, // cleared dueDate
            status: 'in_progress' as const,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(NextStepsCardSchema.safeParse(card).success).toBe(true);
    });

    it('requires Risk/Blocker description to be non-empty but allows impact and mitigation to be null/undefined', () => {
      const card = {
        id: 'rk-2',
        type: 'risk_blocker' as const,
        title: 'Database connection spike',
        description: 'Pool limit reached during batch migration',
        severity: 'medium' as const,
        isBlocker: false,
        impact: undefined, // cleared impact
        mitigation: undefined, // cleared mitigation
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(RiskBlockerCardSchema.safeParse(card).success).toBe(true);

      // Clearing description to empty fails schema validation (it is required)
      expect(RiskBlockerCardSchema.safeParse({ ...card, description: '' }).success).toBe(false);
    });

    it('allows VisualUpdate caption to be empty and context to be null/undefined', () => {
      const card = {
        id: 'vu-1',
        type: 'visual_update' as const,
        title: 'Dashboard Screen',
        imageUrl: 'data:image/png;base64,sample',
        altText: 'Overview dashboard chart showing activity metrics',
        caption: '', // cleared caption
        context: undefined, // cleared context
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(VisualUpdateCardSchema.safeParse(card).success).toBe(true);
    });
  });
});
