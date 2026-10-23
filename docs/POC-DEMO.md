# POC demo: Project Reporting Builder

**Last updated:** 2026-10-21  
**Scope:** Current local workspace UI and source, not a production certification.

## Brief audit: blockers first

| Priority | Finding / presenter action | Current implementation |
| --- | --- | --- |
| P0 — trust | Do not equate readiness, inferred content, or a source quotation with factual verification or release approval. | Readiness explicitly checks report completeness; source disclosures distinguish edited, explicit, inferred, and manually entered content. Review actions do not invent missing facts. |
| P1 — live-demo obstruction | On a fresh browser, the automatic guided tour can cover the composer. Dismiss it explicitly before the manual runbook. | The local browser rehearsal hit this obstruction; clicking **Dismiss guided tour** allowed the core journey to complete. |
| P1 — refresh expectations | Editing source notes alone does not rebuild narrative in an existing report. Use **Review update** for new notes. | `refreshReport.ts` refreshes structured KPI/media inputs while preserving existing narrative; the empty-report path performs initial generation. |
| P1 — presentation alignment | `/poc` is supporting material; the live workspace is `/`. | Slides and screenshots now reflect the optimised flow: context-only notes, reviewed 220 ms KPI, honest readiness, and current-value export. |
| P2 — persistence / delivery | Browser storage is not a shared service or durable enterprise archive. External delivery is outside this rehearsal. | Local save/error feedback exists. Downloads are demonstrable; webhook and scheduling code is not proof of recipient delivery. |

### Implemented fixes already present in the audited source

These are existing working-tree changes, not changes made by this documentation task:

- **Non-destructive demo:** `useProjectLibrary.ts` appends a new fictional project and a project-scoped Week 40 baseline instead of replacing the old project.
- **Reviewed metric updates:** `prepareReviewedUpdate.ts` resolves reviewed measurements against existing metrics; the composer rejects blank/nonfinite reviewed values. Matching the existing KPI name avoids adding a separate metric.
- **Edit-preserving refresh:** `useCardOperations.ts` synchronizes edited KPI fields to structured metrics; `refreshReport.ts` preserves narrative rather than reinterpreting old/rejected prose.
- **Honest provenance and analysis:** `CardRenderer.tsx` labels edits with retained source; readiness is structural, and snapshot differences call missing risks “removed from report,” not resolved.
- **Current full-report export:** header Share explicitly starts with all cards; `jsonExport.ts` derives its metric summary from current KPI cards rather than stale input values.

## Fictional scenario and expected starting report

Elena, a fictional engineering program manager, prepares the **Customer Portal Modernization — Fictional demo** brief. Marcus owns profile work, Sarah owns payment validation, and David owns API/infrastructure follow-up. All people, measurements, dates, and delivery claims are synthetic.

- The report's date field is **2026-10-09**. Raw notes separately state the reporting window **2026-10-03..2026-10-09**, as of **2026-10-09**. Do not present the single date as the full reporting window.
- Initial KPIs: **85% sprint completion** (34/40 story points), **3 open critical defects**, and **240 ms average API response time** against a **200 ms target**.
- Profile review handoff was achieved on October 8. Payment callback validation remains blocked; the release date is **not confirmed**. The migration timeout is described as resolved in the notes, but disappearance of its baseline risk card is not independent resolution evidence.
- Starting output: **8 cards across 6 types**: one executive summary, three KPI metrics, one risk/blocker, one next-steps card, one milestone, and one visual update.
- The attached SVG is an illustrative mockup, not live telemetry. Its pictured latency remains **240 ms**, even after the report KPI becomes 220 ms; do not imply image pixels refresh with metric edits.

## Practical 15-minute agenda

| Meeting time | Duration | Content |
| --- | --- | --- |
| 00:00–03:00 | 3 min — vision | Explain the reporting problem: scattered notes, repeated formatting, and lost context. Pitch a local, review-first brief builder, not an autonomous fact checker. Introduce the fictional scenario. |
| 03:00–08:00 | 5 min — live | Follow the timed runbook below: open → inspect → review → edit/refresh → compare → save/share. |
| 08:00–12:00 | 4 min — architecture | Walk through browser inputs, rule-based classification, reviewed merge, card state, local persistence, and export. Explain why existing narrative is not silently regenerated. |
| 12:00–15:00 | 3 min — limitations and Q&A | Disclose rule/English limits, storage and snapshot constraints, static slide drift, unverified delivery, and lack of factual validation. Ask which workflow should be piloted next. |

## Presenter preparation

1. Use the current local checkout and installed dependencies. Start `npm run dev`; open `http://localhost:3000/` in a desktop browser, preferably around 1440 × 1000. Use `/`, not `/poc`, for the live segment.
2. Select **English** if a previous locale is stored. Dismiss the automatic tour using **Dismiss guided tour**; do not rely on an early Escape key before the tour mounts.
3. Keep existing projects: **Open demo** creates another project each time. Avoid repeated clicks unless deliberately restarting. Never clear browser storage to reset someone else's work.
4. Make sure downloads are allowed. Do not configure webhooks, enable scheduled sends, or use real customer material during this rehearsal.
5. Leave the composer draft empty before starting. With text it says **Review update**; without text it says **Refresh report** for an existing report.

## Five-minute live runbook

Times below are relative to the five-minute live segment. If time slips, shorten narration rather than skipping review or trust disclosures.

### 00:00–00:35 — Open and inspect

- Click header **Open demo**. Point out the new fictional project and the preserved old project in the sidebar. Do not claim it overwrites/reset the prior project.
- Show the eight-card report and its six card types; initial latency is **240 ms**.
- Open **Project source notes** (accessible name **Toggle project source notes**). Show the date/window, measurements, named actions, and unconfirmed release wording. Close with **Close source notes**.

Say: “This is synthetic source material. The report date is October 9; the notes define October 3–9 as the measurement period.”

### 00:35–01:30 — Review a fictional 220 ms update

- Click **Use fictional KPI update**, which fills **Add a project update** with:

  ```text
  Average API response time is 220 ms against target 200 ms.
  ```

- Click **Review update**. Inspect the evidence and **Metric value** of `220`; keep unit `ms` and target `200`.
- Edit **Metric name** to exactly **Average API response time** so it matches the existing KPI. If auto-extraction already produces that name, say: “It is already correct; I am intentionally editing/re-entering the name to demonstrate the review control.” Do not pretend the parser made an error.
- Keep the single finding selected and click **Add 1 findings** (the current UI's literal wording).
- Confirm one latency KPI now reads **220 ms**, with eight total cards rather than a duplicate ninth card. The composer clears after applying the update.

### 01:30–02:25 — Edit, refresh, and disclose provenance

- On the latency card, click its explanation (**Edit metric explanation**). Enter:

  ```text
  Reviewed staging latency: 220 ms; target remains 200 ms. Release date is unconfirmed.
  ```

- Tab out to commit. With the composer empty, click **Refresh report**. Confirm the **220 ms value and manual explanation remain**, with no extra cards.
- Expand **Show source reference** on that card. Show the original 220 ms passage and **Edited · source retained**. Contrast this with **Inferred from source** on inferred content: an edited statement and a rule-inferred statement have different provenance, but neither is independently verified.
- Read the disclosure: “Source references provide provenance; factual accuracy has not been independently verified.” Historical notes can retain 240 ms alongside the later update; provenance is not automatic reconciliation of every old sentence or image.

### 02:25–03:00 — Readiness, not approval

- Open **Readiness** (accessible name begins **Executive readiness**).
- Point to: **Report completeness only—not factual accuracy or project delivery health. Missing facts require your input.**
- Keep the unconfirmed release warning visible and unresolved. Do not use a review/quick-fix action to manufacture a date, owner, or approval. Close the readiness panel.

Say: “A complete-looking report can still describe a blocked project. Latency remains above its 200 ms target.”

### 03:00–03:45 — Compare with Week 40

- In Time Flow/history, find **Week 40 baseline · Fictional** and click its **Compare** action, rather than relying on an unspecified current baseline.
- Read the comparison against the working draft:

  | KPI | Week 40 baseline | Current draft | Absolute change |
  | --- | --- | --- | --- |
  | Average API response time | 260 ms | 220 ms | −40 ms |
  | Sprint completion | 70% | 85% | +15 percentage points |
  | Open critical defects | 5 | 3 | −2 defects |

- Week 40 notes cover **2026-09-26..2026-10-02**, as of October 2. The UI's `+15%` completion delta is a 15-percentage-point change, not a 15% relative increase.
- Show **Removed from report** / **Verify resolution** for the old migration risk: absence is not proof of resolution. Close the diff dialog.

### 03:45–04:15 — Save a named checkpoint

- Click **Save** in Time Flow/history, enter **POC reviewed 220 checkpoint** in **Snapshot name**, then confirm **Save** in the naming control.
- Point out the named snapshot. Wait for **Saved on this device** before claiming the draft has persisted locally.
- Do not restore the Week 40 baseline during the live segment: it is cards-only, not a complete historical project restore.

### 04:15–05:00 — Share the current whole report

- Click header **Share**. It defaults to **All (8)**, even if a card was previously selected; card-level sharing has a different selected-card scope.
- Choose **Structured JSON**, preview, then **Download**. Choose **Markdown (.md)** and **Download** again.
- Show that exports contain the current report, including the **220 ms** KPI and edited explanation, plus the other cards. JSON's metric summary should agree with the current KPI card.
- End with: “These are local file downloads. This demo has not sent a message or verified external delivery.”

## Four-minute architecture explanation

```text
Browser workspace (main.tsx → App.tsx)
  ├─ notes / typed metrics / images → ChatComposer
  │    └─ classifier → editable findings → prepareReviewedUpdate
  │         └─ mergeReviewedCards → project cards + structured metrics
  ├─ inline card edits → useCardOperations → synchronized KPI input
  ├─ Refresh report → refreshReport → structured refresh; narrative retained
  ├─ executiveScore / snapshotDiff → completeness and reported differences
  └─ useProjectLibrary → localStorage / snapshots → ExportModal → downloads
```

- **Minute 1 — UI/state:** React/TypeScript with Vite; `App.tsx` coordinates the canvas, project library, card operations, and dialogs. `/poc` is a separate presentation entry selected in `main.tsx`.
- **Minute 2 — extraction/review:** `deterministicParser.ts` handles initial card generation; `classifier.ts` proposes findings using local rules, not an LLM service. The human reviews a delta before it merges into the report.
- **Minute 3 — preservation/trust:** Existing-report refresh updates structured KPI/media inputs and retains narrative. Source references retain passages, not factual authority. Readiness checks fields/wording; diff compares report content, not independently observed project state.
- **Minute 4 — persistence/export:** `useProjectLibrary.ts` debounces saves to browser `localStorage`; named snapshots can capture full project state. `ExportModal.tsx` generates local formats; current JSON summaries follow card edits. Integration modules exist, but are not exercised by the download runbook.

## Current constraints and Q&A boundaries

- **Rules, browser-local, English-first:** Extraction uses finite local heuristics and English-oriented patterns. UI language options do not establish equivalent multilingual extraction accuracy. Ambiguous names/categories need review; this is not semantic understanding or independent fact checking.
- **Refresh is intentionally limited:** On an existing report it refreshes structured KPI/media cards while preserving narrative. To introduce new narrative, put new notes in the composer and use **Review update**. Editing **Project source notes** does not by itself regenerate that narrative. **Keep as context** appends notes without applying cards.
- **Storage is local:** The project library lives in `localStorage` for the browser/origin, with quota/availability risks; composer drafts also use session storage. No shared team database, cross-device sync, or guaranteed backup is established. Wait for save feedback and export important work.
- **Snapshots vary:** New named snapshots include project state; legacy/cards-only snapshots, including the seeded Week 40 baseline, restore cards only. They cannot fully roll back notes, structured inputs, or all project context. Snapshot restore is not an external audit trail.
- **Source and numbers can diverge:** Retained original text and static mockup images do not automatically change when a KPI is edited. Human review is responsible for interpretation and consistency. Lower latency/defect counts do not establish release readiness.
- **Delivery is unverified:** JSON/Markdown download is not email, Slack, Teams, or webhook delivery. No external delivery was attempted in this audit. Browser-open scheduling is not a demonstrated server-side delivery guarantee; any real recipient workflow needs separate consent, credentials, and end-to-end verification.
- **Slides are supporting material:** `/poc` contains refreshed screenshots of the optimised workflow and a live-demo entry. Images remain static; use the actual workspace to demonstrate interaction and persistence.

## Verification and evidence discipline

Audit sources include the linked-by-path modules above, `src/lib/sampleData.ts`, and `e2e/demoJourney.spec.ts`. Test assertions describe intended coverage; their presence alone is not a passing result.

To repeat repository checks from the project root:

```bash
npm run lint
npm test
npm run build
# Install the matching Chromium first if it is unavailable:
npx playwright install chromium
# Dedicated test server uses port 3100; keep that port free:
npm run test:e2e -- e2e/demoJourney.spec.ts
```

The local browser audit used isolated headless Chromium against the running app on port 3000. Its core rehearsal covered reviewed 220 ms replacement, explanation preservation across refresh, the baseline diff, a named save, and full JSON/Markdown downloads with a card selected. Initial attempts were obstructed by the guided tour; explicit dismissal was required. This is not a claim that the entire test suite, reload/persistence flow, every readiness/source interaction, all browsers, or external integrations passed.

### Executed verification for the POC optimisation

- `npm test`: **217 tests passed across 23 files**.
- `npm run lint`: **passed**. This repository's lint command is TypeScript `tsc --noEmit`; no separate ESLint check is configured.
- `npm run build`: **passed**; Vite retains its existing large-chunk advisory.
- `npm audit`: **0 vulnerabilities** reported.
- Original-app browser rehearsal: **8 tests passed**, including invalid data, context-only updates, independent risks, edit/refresh/reload persistence, bidirectional KPI corrections/status, snapshot save/compare, full JSON/Markdown downloads, and demo Undo isolation. The core scripted flow took **10.345 seconds**, excluding human narration; this is not a measured presenter completion time.
- Presentation regression suite: **26 tests passed** in the preceding complete browser run. Later changes were confined to original-app risk identity and KPI status, followed by the eight-test original-app rerun.
- A focused repeat of the final browser regressions passed **6/6 executions**.

Browser checks used isolated Chromium against the current checkout. The owned port 3100 was already running during final rehearsal, so the run used a temporary Playwright configuration reusing that server. Standard repository configuration deliberately refuses an occupied test port. Safari, Firefox, real email/webhook delivery, and a timed human presentation were not verified. No coverage percentage is claimed.
