import type { WebsiteFigure } from './AnnotatedWebsite';

interface WebsiteSlide {
  title: string;
  subtitle: string;
  takeaway: string;
  component: string;
  figure: WebsiteFigure;
}

export const WEBSITE_SLIDES: Record<string, WebsiteSlide> = {
  workspace: {
    title: 'One website. A complete reporting workflow.',
    subtitle: 'The original workspace brings projects, report cards, and incoming updates together.',
    takeaway: 'The project lead moves from input to review to sharing without rebuilding the report in another tool.',
    component: 'Header · ProjectSidebar · ReportCanvas · ChatComposer',
    figure: {
      image: 'workspace.png', alt: 'Original Reporting Builder website with project library, report canvas, update composer, and Share button.',
      crop: { x: 0, y: 0, w: 1440, h: 900 }, frame: { x: 355, y: 235, w: 890, h: 556.25 },
      callouts: [
        { title: 'Project library', text: 'Choose a project and keep its reporting history together.', target: { x: 0, y: 65, w: 272, h: 585 }, label: { x: 60, y: 275, w: 250, h: 105 }, detail: 'Folders, search, and project actions belong to ProjectSidebar. Data is saved in this browser.' },
        { title: 'Review source notes', text: 'Open original passages, then review a fictional KPI update.', target: { x: 486, y: 715, w: 740, h: 152 }, label: { x: 60, y: 630, w: 250, h: 115 }, detail: 'Review update classifies new text. Refresh report retains reviewed narrative and corrections.' },
        { title: 'Report canvas', text: 'Review an executive brief built from editable, reorderable cards.', target: { x: 486, y: 301, w: 740, h: 339 }, label: { x: 1290, y: 415, w: 250, h: 115 }, detail: 'The canvas also provides type filters, search, selection, and manual card creation.' },
        { title: 'Open demo safely', text: 'Create a prepared fictional project without replacing existing work.', target: { x: 1006, y: 15, w: 91, h: 33 }, label: { x: 1290, y: 245, w: 250, h: 105 }, detail: 'Each demo gets its own baseline and Undo history. Header Share exports the whole report by default.' },
      ],
    },
  },
  library: {
    title: 'Keep every reporting context organized.',
    subtitle: 'Project library · Find the right project, manage its lifecycle, and revisit saved checkpoints.',
    takeaway: 'Local browser storage supports an individual reporting workflow; it is not a shared team repository.',
    component: 'ProjectSidebar · TimeFlow · useProjectLibrary',
    figure: {
      image: 'library.png', alt: 'Original project sidebar showing folders, search, project actions menu, and Time Flow snapshot history.',
      crop: { x: 0, y: 64, w: 285, h: 836 }, frame: { x: 570, y: 205, w: 205, h: 601.33 },
      callouts: [
        { title: 'Find a project', text: 'Search your library and group reports into folders.', target: { x: 12, y: 78, w: 247, h: 112 }, label: { x: 100, y: 240, w: 345, h: 105 }, detail: 'The project count and active report help you identify the current reporting context.' },
        { title: 'Manage the report', text: 'Rename, duplicate, move, or delete a project using its action menu.', target: { x: 80, y: 286, w: 176, h: 167 }, label: { x: 940, y: 370, w: 410, h: 110 }, detail: 'The expanded menu shown here is part of the actual application, captured before any destructive action.' },
        { title: 'Save a checkpoint', text: 'Time Flow keeps the working draft alongside named snapshots.', target: { x: 0, y: 660, w: 271, h: 238 }, label: { x: 100, y: 650, w: 345, h: 110 }, detail: 'Use Save to create a checkpoint, Review to inspect it, and Compare to see changes against the current draft.' },
      ],
    },
  },
  capture: {
    title: 'Paste the update. Review what it becomes.',
    subtitle: 'Input workflow · The composer turns new notes into findings that the project lead can inspect.',
    takeaway: 'Add findings applies reviewed corrections. Keep as context stores notes only. Blank or invalid metric values cannot become zero.',
    component: 'ChatComposer → classifyPassages → prepareReviewedUpdate',
    figure: {
      image: 'composer.png', alt: 'Current Review findings panel with one fictional 220 ms KPI update, original source passage, editable metric fields and Add findings button.',
      crop: { x: 480, y: 568, w: 755, h: 305 }, frame: { x: 395, y: 220, w: 800, h: 323.18 },
      callouts: [
        { title: 'Classify the finding', text: 'Local rules propose a category. The presenter reviews it.', target: { x: 520, y: 655, w: 450, h: 30 }, label: { x: 60, y: 265, w: 280, h: 115 }, detail: 'This is rule-based processing, not an AI API. Review candidates are not independently verified facts.' },
        { title: 'Correct metric fields', text: 'Confirm 220 ms and match the existing KPI name before applying.', target: { x: 544, y: 739, w: 647, h: 30 }, label: { x: 1250, y: 365, w: 285, h: 120 }, detail: 'Stable metric identity preserves the target, previous value, chart settings, and existing card instead of creating a duplicate.' },
        { title: 'Read the evidence', text: 'The original 220 ms source passage stays beside the finding.', target: { x: 544, y: 713, w: 647, h: 18 }, label: { x: 60, y: 605, w: 280, h: 110 }, detail: 'A manual correction can differ from the passage; the passage remains original and the report identifies edits.' },
        { title: 'Confirm the selection', text: 'Apply the reviewed finding. Context-only notes leave cards unchanged.', target: { x: 1090, y: 812, w: 114, h: 32 }, label: { x: 1250, y: 650, w: 285, h: 115 }, detail: 'The new value replaces the same KPI card. Refresh and reload preserve the accepted correction.' },
      ],
    },
  },
  source: {
    title: 'Correct the report. Keep the source.',
    subtitle: 'Source traceability · A report card links back to the input that informed its content.',
    takeaway: 'Source-linked means traceable to an input passage. It does not mean independently fact-verified.',
    component: 'CardRenderer · SourceReference · EditableText',
    figure: {
      image: 'source.png', alt: 'Edited 220 ms KPI card with original source passage, provenance disclaimer and retained manual explanation.',
      crop: { x: 475, y: 140, w: 760, h: 470 }, frame: { x: 375, y: 290, w: 850, h: 525.66 },
      callouts: [
        { title: 'Inspect provenance', text: 'The disclosure distinguishes edited content from the retained source.', target: { x: 511, y: 229, w: 690, h: 162 }, label: { x: 1270, y: 235, w: 270, h: 110 }, detail: 'Source-backed, inferred, manual, and edited content are labelled separately. No label certifies factual accuracy.' },
        { title: 'Review the correction', text: 'The current KPI is 220 ms; the original passage remains available.', target: { x: 511, y: 430, w: 54, h: 37 }, label: { x: 60, y: 375, w: 265, h: 120 }, detail: 'Inline card edits synchronize the structured KPI. Later structured-input edits synchronize back to the card.' },
        { title: 'Preserve manual edits', text: 'Refresh keeps the explanation and does not re-parse rejected narrative.', target: { x: 511, y: 552, w: 690, h: 21 }, label: { x: 1270, y: 625, w: 270, h: 120 }, detail: 'Refresh preserves accepted narrative and corrections. Introduce new text through Review update.' },
      ],
    },
  },
  readiness: {
    title: 'Surface reporting gaps before sharing.',
    subtitle: 'Readiness checklist · Make incomplete context visible while the report is still editable.',
    takeaway: 'A readiness score measures report structure and completeness—not delivery health or factual accuracy.',
    component: 'ReportCanvas · calculateExecutiveScore',
    figure: {
      image: 'readiness.png', alt: 'Current readiness checklist showing 93 percent, five of six checks passed, structural-completeness disclaimer and unresolved release warning.',
      crop: { x: 475, y: 185, w: 340, h: 405 }, frame: { x: 565, y: 218, w: 490, h: 583.68 },
      callouts: [
        { title: 'Explain the score', text: '93% reflects structural completeness—not approval to release.', target: { x: 500, y: 247, w: 291, h: 55 }, label: { x: 70, y: 240, w: 340, h: 110 }, detail: 'Five of six structural checks pass in the fictional sample. The release-date warning remains unresolved.' },
        { title: 'Highlight missing clarity', text: 'The release warning remains until a real commitment is supplied.', target: { x: 532, y: 407, w: 185, h: 46 }, label: { x: 1190, y: 400, w: 340, h: 115 }, detail: 'Review actions point out missing context. They do not invent release dates, owners, KPI targets, or accomplishments.' },
        { title: 'Check the essentials', text: 'Review the summary, reporting date, KPI targets, action owners, and alt text.', target: { x: 500, y: 470, w: 287, h: 80 }, label: { x: 70, y: 610, w: 340, h: 120 }, detail: 'Missing facts need human input. A complete-looking report can still describe a blocked project.' },
      ],
    },
  },
  snapshots: {
    title: 'Show what changed since the last update.',
    subtitle: 'Time Flow & comparison · Connect the current draft to an explicit saved baseline.',
    takeaway: 'Example: completion rose 15 percentage points; API latency improved but still exceeds the 200 ms target.',
    component: 'TimeFlow · SnapshotComparisonModal · snapshotDiff',
    figure: {
      image: 'snapshots.png', alt: 'Snapshot comparison with sprint completion 70 to 85 percent, critical defects 5 to 3 and reviewed average API response time 260 to 220 milliseconds.',
      crop: { x: 330, y: 54, w: 780, h: 794 }, frame: { x: 480, y: 200, w: 570, h: 580.23 },
      callouts: [
        { title: 'Choose the baseline', text: 'Compare the working draft with the saved Week 40 report.', target: { x: 353, y: 125, w: 729, h: 67 }, label: { x: 75, y: 245, w: 320, h: 110 }, detail: 'Snapshots are saved reporting checkpoints. The project timeline also offers review and restore actions.' },
        { title: 'Compare the metrics', text: 'The reviewed report shows 260 → 220 ms, still above target.', target: { x: 357, y: 211, w: 726, h: 202 }, label: { x: 1180, y: 350, w: 345, h: 110 }, detail: 'The fictional example is 70% → 85% completion, 5 → 3 defects, and 260 → 220 ms average latency. Missing risks are removed from the report, not automatically resolved.' },
        { title: 'Review narrative changes', text: 'Inspect accomplishments, risks, and actions alongside the numerical changes.', target: { x: 357, y: 433, w: 726, h: 114 }, label: { x: 75, y: 585, w: 320, h: 120 }, detail: 'Matching and inferred resolutions are comparison hints. Validate whether a missing risk was actually resolved.' },
      ],
    },
  },
  export: {
    title: 'Review once. Format for the destination.',
    subtitle: 'Export & sharing · Use the existing report as the source for each communication format.',
    takeaway: 'A formatted preview or compose handoff is not delivery confirmation. Verify external sharing separately.',
    component: 'ExportModal · destination formatters · messageDispatch',
    figure: {
      image: 'export.png', alt: 'Original Export and Message Tool Integration dialog with destination navigation, email compose controls, copy/download actions and report preview.',
      crop: { x: 205, y: 32, w: 1030, h: 836 }, frame: { x: 390, y: 205, w: 770, h: 624.97 },
      callouts: [
        { title: 'Pick a destination', text: 'Email, Slack, Teams, chat channels, Markdown, JSON, or browser PDF.', target: { x: 218, y: 151, w: 238, h: 603 }, label: { x: 60, y: 335, w: 280, h: 125 }, detail: 'The dialog formats the current report or a selected subset of cards. The screenshot shows the entire fictional report.' },
        { title: 'Choose a handoff', text: 'Copy, download, or open an email compose flow.', target: { x: 919, y: 140, w: 292, h: 28 }, label: { x: 1230, y: 235, w: 305, h: 110 }, detail: 'Configured webhooks attempt outbound delivery; browser restrictions mean destination acceptance is not always observable.' },
        { title: 'Inspect before sharing', text: 'Check the current 220 ms KPI and retained explanation in the export preview.', target: { x: 558, y: 590, w: 580, h: 40 }, label: { x: 1230, y: 595, w: 305, h: 125 }, detail: 'Header Share defaults to all eight cards. JSON summaries and Markdown use current report values, not stale inputs.' },
      ],
    },
  },
};
