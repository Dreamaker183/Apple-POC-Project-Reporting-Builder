# Project Reporting Builder — Architecture & Engineering Specification

## 1. System Overview

**Project Reporting Builder** is a client-side web application designed to help enterprise engineering and product leaders synthesize raw project notes, numerical KPIs, and visual assets into modular, executive-ready Snippet Cards.

### Design Principles
- **Apple-Inspired Visual Restraint:** Focused, high-contrast, uncluttered workspace using design tokens: `#F5F5F7` (Background), `#FFFFFF` (Surface), `#1F1F1F` (Primary text), `#727272` (Secondary text), `#0071E3` (Primary accent). Zero-pill metadata discipline with unboxed text and clean typographic separators.
- **Truth-Preserving Deterministic Synthesis:** Operates via explicit, rule-based TypeScript parsers with sentence offset tracking. Never hallucinates delivery dates, unconfirmed statuses, or fictional owners.
- **Destination-Aware Output:** One source of truth formatted into multiple presentation styles (Executive Email, Slack mrkdwn, Microsoft Teams, Formal Weekly Status Memo, GitHub Markdown, and standalone HTML).

---

## 2. Architecture & File Layout

```text
src/
├── types/
│   └── report.ts                   # Discriminated union SnippetCard models, inputs, scores
├── schemas/
│   └── reportSchema.ts             # Strict Zod runtime validation schemas
├── lib/
│   ├── parsing/
│   │   └── deterministicParser.ts  # Linguistic pattern matching & sentence offset tracking
│   ├── export/
│   │   ├── markdownExport.ts       # GitHub-flavored Markdown serialization
│   │   ├── jsonExport.ts           # Schema-validated JSON export and import roundtrip
│   │   ├── htmlExport.ts           # Standalone HTML with XSS escaping
│   │   ├── destinationFormatters.ts# Email, Slack, Teams, Weekly Memo formatters
│   │   └── clipboard.ts            # Rich HTML + plain text clipboard write
│   ├── persistence/
│   │   └── localDraft.ts           # LocalStorage draft persistence & validation recovery
│   ├── analysis/
│   │   ├── executiveScore.ts       # Explainable 6-point readiness diagnostic auditor
│   │   └── snapshotDiff.ts         # Baseline snapshot comparator ("What's Changed?")
│   └── sampleData.ts               # Fictional enterprise dataset & SVG UI candidate mockup
├── components/
│   ├── layout/
│   │   └── Header.tsx              # Save indicator, undo, sample trigger, export, print
│   ├── input/
│   │   ├── InputPanel.tsx          # Raw notes multiline editor, tabbed input manager
│   │   ├── MetricsEditor.tsx       # Quantitative KPI metric manager with number guards
│   │   └── ImageUploader.tsx       # Drag-and-drop uploader with 5MB limit & alt text
│   ├── composition/
│   │   ├── ReportCanvas.tsx        # Card list, drag/move controls, bulk selection
│   │   └── CardInspector.tsx       # Contextual editor, source trace inspector, score fix
│   ├── cards/
│   │   ├── CardRenderer.tsx        # Universal card container with actions
│   │   ├── ExecutiveSummaryCard.tsx
│   │   ├── KpiMetricCard.tsx
│   │   ├── RiskBlockerCard.tsx
│   │   ├── NextStepsCard.tsx
│   │   ├── MilestoneCard.tsx
│   │   └── VisualUpdateCard.tsx
│   ├── export/
│   │   └── ExportModal.tsx         # Destination preview, copy, download, and print
│   └── common/
│       └── Toast.tsx               # Accessible feedback notification toasts
└── test/
    ├── parsing.test.ts             # Parsing and fact extraction tests
    ├── validation.test.ts          # Zod schema and numeric validation tests
    ├── export.test.ts              # Escaping, JSON roundtrip, destination tests
    └── reordering_and_persistence.test.ts # Reordering, persistence, score tests
```

---

## 3. Data Flow & Core Lifecycle

```text
[ Raw Text / Metrics / Images ]
              │
              ▼
   deterministicParser.ts ───► Extract Sentences & Offsets
              │               Identify Accomplishments, Blockers, Action Items
              ▼
    [ Snippet Cards Stack ] ◄── LocalStorage Persistence (Zod validated)
              │
    ┌─────────┴─────────┐
    ▼                   ▼
ReportCanvas      CardInspector
(Inline edit,     (Source Traceability,
 Reorder,          Executive-Ready Score,
 Multi-select)     What's Changed? Diff)
    │
    ▼
[ Destination-Aware Export / Print-to-PDF / Clipboard ]
```

---

## 4. Privacy & Security Architecture

1. **Zero External Transmission:** All operations (parsing, validation, storage, export) execute strictly client-side. No user data or uploaded assets are sent to third-party endpoints.
2. **HTML Sanitization:** `escapeHtml` escapes untrusted character sequences (`&`, `<`, `>`, `"`, `'`) before generating standalone HTML or Executive Email outputs.
3. **Asset Constraints:** Uploaded images are checked against an explicit MIME whitelist (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`) and enforced with a strict 5MB upper bound.
4. **Resilient Local Persistence:** Draft state loaded from `localStorage` undergoes strict `ReportProjectSchema.safeParse` validation to prevent deserialization corruption.
