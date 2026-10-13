# Project Reporting Builder — Manual Test & Verification Checklist

This checklist verifies the end-to-end functionality of the **Project Reporting Builder** in the live browser environment.

---

## 1. Happy Path Workflow: Complete User Journey

- [ ] **Step 1: Open Application**
  - Verify header displays **Project Reporting Builder** with Apple-inspired minimalist design tokens (`#F5F5F7` background, Figtree typography).
  - Verify three-area workspace layout on desktop (Left: Source Inputs, Center: Report Canvas, Right: Card Inspector).
- [ ] **Step 2: Load Sample Project**
  - Click **Try sample project** in header.
  - Verify sample text loaded: "Customer Portal Modernization", sprint progress 85%, 3 critical defects, 240 ms latency, and unconfirmed release date note.
  - Verify sample metrics (Sprint completion 85%, Open critical defects 3, Average latency 240 ms).
  - Verify sample SVG mockup asset loaded with alt text: "Customer portal modern account settings and profile page mockup ready for review".
- [ ] **Step 3: Generate Snippet Cards**
  - Click **Generate Report Cards** in the left panel.
  - Verify the 6 modular card types are generated:
    - Executive Summary (with accomplishments and explicit unconfirmed release note).
    - KPI Metrics (Sprint completion, open defects, latency with targets).
    - Critical Blocker & Risk (payment callback blocker identified).
    - Next Steps & Commitments (action items).
    - Visual Update (mockup preview with WCAG alt text).
  - Verify toast notification confirms generation.
- [ ] **Step 4: Source Traceability Inspection**
  - Click on any card on the canvas (e.g. Critical Blocker).
  - Inspect the right panel under **Card Details**.
  - Verify the **Source Traceability** box displays the exact matching sentence from raw notes with `EXPLICIT FACT` confidence.
  - Click **Highlight in raw source notes** and verify the passage is highlighted in the left panel.
- [ ] **Step 5: Edit Card Properties & Check Undo**
  - In the canvas or inspector, change a title or value.
  - Delete a card.
  - Press `Cmd+Z` / `Ctrl+Z` or click the header **Undo** button.
  - Verify the deleted card is cleanly restored.
- [ ] **Step 6: Reorder Cards**
  - Use the **Move Up** and **Move Down** chevron buttons on any card.
  - Verify cards swap positions smoothly with stable IDs preserved.
- [ ] **Step 7: Destination-Aware Export & Clipboard**
  - Click **Export & Share** in the header.
  - Switch between destinations:
    - **Executive Email**: Verify HTML tables with key performance indicators.
    - **Slack Message**: Verify `mrkdwn` formatting with emoji status indicators.
    - **Microsoft Teams**: Verify Teams markdown format.
    - **Weekly Status Memo**: Verify formal text memo sections.
    - **Markdown / JSON / Standalone HTML**.
  - Click **Copy to Clipboard** and verify toast confirms rich copy.
  - Click **Download** and verify file downloads with appropriate extension.
- [ ] **Step 8: Browser Print-to-PDF**
  - Click **Browser Print / PDF** in the Export modal or header **Print** button.
  - Verify print preview layout hides UI chrome (inputs and inspector) and renders clean report cards.
- [ ] **Step 9: Draft Persistence & Reload**
  - Refresh the browser (`Cmd+R` / `F5`).
  - Verify the saved report, cards, title, and edits are restored exactly from local storage without loss of state.

---

## 2. Failure & Boundary Paths

- [ ] **Empty Input Handling**:
  - Clear all notes and metrics, then click **Generate Report Cards**.
  - Verify application does not crash and renders empty state placeholder.
- [ ] **Invalid Metric Input**:
  - In the Metrics tab, attempt to submit a non-numeric string (e.g. "abc") for metric value.
  - Verify inline validation error blocks invalid entry.
- [ ] **Image Upload Validation**:
  - Attempt to upload an invalid file (e.g. `.pdf` or `.exe`).
  - Verify rejection error displays with allowed formats listed.
  - Attempt to upload an image exceeding 5MB.
  - Verify 5MB boundary guard triggers.
- [ ] **XSS Sanitization in HTML Export**:
  - Enter raw HTML or scripts `<script>alert(1)</script>` into card title or note.
  - Export as Standalone HTML.
  - Inspect downloaded or previewed source: verify tags are escaped (`&lt;script&gt;`) and cannot execute.
- [ ] **Corrupted Local Draft Recovery**:
  - If localStorage contains malformed JSON, verify application catches the error, logs warning, and restores a fresh default project rather than throwing a white screen.
