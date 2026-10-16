/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TourStep } from './GuidedTour';
import type { ReportProject, SnippetCard } from '../../types/report';
import type { MessageToolId } from '../export/ExportModal';
import { en, type DictKey } from '../../lib/i18n/dictionaries';

export interface TourStepActions {
  onLoadSample: (messy: boolean) => void;
  setMobileArea: (area: 'projects' | 'canvas') => void;
  setTourStepIndex: (idx: number) => void;
  onGenerateReport: () => void;
  getProject: () => ReportProject;
  setInspectedCardId: (id: string | null) => void;
  setHighlightPassage: (passage: { start?: number; end?: number; text?: string } | null) => void;
  onApplyAllFixes: () => void;
  setIsSnapshotModalOpen: (open: boolean) => void;
  setExportInitialMode: (mode: 'formats' | 'tools') => void;
  setExportInitialTool: (tool: MessageToolId) => void;
  setIsExportOpen: (open: boolean) => void;
  setIsGuidedTourOpen: (open: boolean) => void;
}

export type TranslateFn = (key: DictKey, vars?: Record<string, string | number>) => string;

/**
 * Builds the sequence of 6 guided tour steps for exploring the workspace.
 */
export function buildTourSteps(actions: TourStepActions, t?: TranslateFn): TourStep[] {
  const lookup = t ?? ((key: DictKey) => en[key] ?? key);

  return [
    {
      title: lookup('tour.step1.title'),
      badge: lookup('tour.step1.badge'),
      summary: lookup('tour.step1.summary'),
      tip: lookup('tour.step1.tip'),
      actionLabel: lookup('tour.step1.action'),
      onExecute: () => {
        actions.onLoadSample(true);
        actions.setMobileArea('canvas');
        actions.setTourStepIndex(1);
      },
    },
    {
      title: lookup('tour.step2.title'),
      badge: lookup('tour.step2.badge'),
      summary: lookup('tour.step2.summary'),
      tip: lookup('tour.step2.tip'),
      actionLabel: lookup('tour.step2.action'),
      onExecute: () => {
        actions.onGenerateReport();
        const project = actions.getProject();
        const blocker = project.cards.find((c: SnippetCard) => c.type === 'risk_blocker');
        if (blocker) {
          actions.setInspectedCardId(blocker.id);
          if (blocker.sourceRef) {
            actions.setHighlightPassage({ text: blocker.sourceRef.passageText });
          }
        }
        actions.setMobileArea('canvas');
        actions.setTourStepIndex(2);
      },
    },
    {
      title: lookup('tour.step3.title'),
      badge: lookup('tour.step3.badge'),
      summary: lookup('tour.step3.summary'),
      tip: lookup('tour.step3.tip'),
      actionLabel: lookup('tour.step3.action'),
      onExecute: () => {
        actions.setMobileArea('canvas');
        actions.onApplyAllFixes();
        actions.setTourStepIndex(3);
      },
    },
    {
      title: lookup('tour.step4.title'),
      badge: lookup('tour.step4.badge'),
      summary: lookup('tour.step4.summary'),
      tip: lookup('tour.step4.tip'),
      actionLabel: lookup('tour.step4.action'),
      onExecute: () => {
        actions.setIsSnapshotModalOpen(true);
        actions.setTourStepIndex(4);
      },
    },
    {
      title: lookup('tour.step5.title'),
      badge: lookup('tour.step5.badge'),
      summary: lookup('tour.step5.summary'),
      tip: lookup('tour.step5.tip'),
      actionLabel: lookup('tour.step5.action'),
      onExecute: () => {
        actions.setIsSnapshotModalOpen(false);
        actions.setExportInitialMode('formats');
        actions.setIsExportOpen(true);
        actions.setTourStepIndex(5);
      },
    },
    {
      title: lookup('tour.step6.title'),
      badge: lookup('tour.step6.badge'),
      summary: lookup('tour.step6.summary'),
      tip: lookup('tour.step6.tip'),
      actionLabel: lookup('tour.step6.action'),
      onExecute: () => {
        actions.setIsSnapshotModalOpen(false);
        actions.setExportInitialMode('tools');
        actions.setExportInitialTool('slack');
        actions.setIsExportOpen(true);
        actions.setIsGuidedTourOpen(false);
      },
    },
  ];
}
