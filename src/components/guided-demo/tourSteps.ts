/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TourStep } from './GuidedTour';
import type { ReportProject, SnippetCard } from '../../types/report';
import type { MessageToolId } from '../export/ExportModal';

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

/**
 * Builds the sequence of 6 guided tour steps for exploring the workspace.
 */
export function buildTourSteps(actions: TourStepActions): TourStep[] {
  return [
    {
      title: 'Start with your everyday updates',
      badge: 'Notes & assets',
      summary: 'Paste your notes into the composer at the bottom of the report. Add numbers or images too. Try the sample to see how it all fits together.',
      tip: 'The sample loads into the active project. You can use Undo to return to your previous draft.',
      actionLabel: 'Try the sample notes',
      onExecute: () => {
        actions.onLoadSample(true);
        actions.setMobileArea('canvas');
        actions.setTourStepIndex(1);
      },
    },
    {
      title: 'Turn your notes into report cards',
      badge: 'Build your report',
      summary: 'Generate a report to organize your updates into summaries, metrics, risks, and next steps. Select a card to explore where its information came from.',
      tip: 'Start with some notes, metrics, or an image. You can edit the resulting cards to make the report your own.',
      actionLabel: 'Generate report cards',
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
      title: 'Give your report a little polish',
      badge: 'Readiness check',
      summary: 'The readiness check looks for useful details such as dates, metric targets, and image descriptions. Apply the available quick fixes to tidy up your report.',
      tip: 'Review suggested details before sharing. You know your project best, and Undo is there if you need it.',
      actionLabel: 'Apply quick fixes',
      onExecute: () => {
        actions.setMobileArea('canvas');
        actions.onApplyAllFixes();
        actions.setTourStepIndex(3);
      },
    },
    {
      title: 'See what changed since last time',
      badge: 'Compare updates',
      summary: 'Open the comparison view to spot changes between your baseline and current report, including metric updates, new milestones, and resolved blockers.',
      tip: 'Close the comparison window when you’re ready to continue. Saved snapshots also let you revisit earlier updates.',
      actionLabel: 'Compare report versions',
      onExecute: () => {
        actions.setIsSnapshotModalOpen(true);
        actions.setTourStepIndex(4);
      },
    },
    {
      title: 'Choose the right look for your audience',
      badge: 'Preview & export',
      summary: 'Preview your report as an executive email, Slack message, Teams update, or weekly memo. Copy the formatted content, download a file, or print to PDF.',
      tip: 'Switch destinations to see each format. Close the preview window to come back to me.',
      actionLabel: 'Explore export formats',
      onExecute: () => {
        actions.setIsSnapshotModalOpen(false);
        actions.setExportInitialMode('formats');
        actions.setIsExportOpen(true);
        actions.setTourStepIndex(5);
      },
    },
    {
      title: 'Share your update with the team',
      badge: 'Message tools',
      summary: 'Open message tools to compose an email or configure a team channel webhook. The delivery history helps you keep track of your dispatch attempts.',
      tip: 'Try a simulated delivery to explore the flow. For email, copy the formatted content into your message body to include graphs.',
      actionLabel: 'Open message tools',
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
