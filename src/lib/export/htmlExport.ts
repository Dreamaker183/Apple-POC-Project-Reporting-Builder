/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportProject, SnippetCard } from '../../types/report';

/**
 * Escapes HTML characters to prevent XSS.
 */
export function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatCardToHtml(card: SnippetCard): string {
  switch (card.type) {
    case 'executive_summary':
      return `
        <div class="snippet-card">
          <div class="card-kicker">EXECUTIVE SUMMARY</div>
          <h2 class="card-title">${escapeHtml(card.title)}</h2>
          <p class="card-body-text">${escapeHtml(card.summary)}</p>
          <div class="card-section-label">Key Accomplishments</div>
          <ul class="accomplishment-list">
            ${card.keyAccomplishments.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
          </ul>
          ${card.statusNote ? `<div class="status-note"><strong>Note:</strong> ${escapeHtml(card.statusNote)}</div>` : ''}
        </div>
      `;

    case 'kpi_metric': {
      const isDeclining = card.trend === 'declining';
      const trendColor = isDeclining ? '#DC2626' : '#059669';
      return `
        <div class="snippet-card metric-card">
          <div class="card-kicker">KEY PERFORMANCE INDICATOR</div>
          <h3 class="card-title">${escapeHtml(card.title)}</h3>
          <div class="metric-display">
            <span class="metric-number">${escapeHtml(String(card.value))}</span>
            <span class="metric-unit">${escapeHtml(card.unit)}</span>
          </div>
          <div class="metric-details">
            ${card.target !== undefined ? `<span>Target: <strong>${escapeHtml(String(card.target))}${escapeHtml(card.unit)}</strong></span>` : ''}
            ${card.previousValue !== undefined ? `<span> · Previous: ${escapeHtml(String(card.previousValue))}${escapeHtml(card.unit)}</span>` : ''}
          </div>
          ${card.explanation ? `<p class="metric-explanation">${escapeHtml(card.explanation)}</p>` : ''}
        </div>
      `;
    }

    case 'risk_blocker': {
      const isBlocker = card.isBlocker;
      const severityColor = card.severity === 'critical' ? '#EF4444' : card.severity === 'high' ? '#F59E0B' : '#6B7280';
      return `
        <div class="snippet-card ${isBlocker ? 'blocker-border' : ''}">
          <div class="flex-between">
            <div class="card-kicker" style="color: ${severityColor};">${isBlocker ? 'CRITICAL BLOCKER' : 'PROJECT RISK'}</div>
            <span class="severity-tag" style="background-color: ${severityColor}15; color: ${severityColor}; border-color: ${severityColor}30;">
              ${escapeHtml(card.severity.toUpperCase())}
            </span>
          </div>
          <h3 class="card-title">${escapeHtml(card.title)}</h3>
          <p class="card-body-text">${escapeHtml(card.description)}</p>
          ${card.impact ? `<div class="info-row"><strong>Impact:</strong> ${escapeHtml(card.impact)}</div>` : ''}
          ${card.mitigation ? `<div class="info-row"><strong>Mitigation:</strong> ${escapeHtml(card.mitigation)}</div>` : ''}
        </div>
      `;
    }

    case 'next_steps':
      return `
        <div class="snippet-card">
          <div class="card-kicker">ACTION PLAN</div>
          <h3 class="card-title">${escapeHtml(card.title)}</h3>
          <div class="action-items-list">
            ${card.items.map((item, idx) => `
              <div class="action-item-row">
                <span class="step-num">${idx + 1}</span>
                <div class="step-content">
                  <div class="step-action">${escapeHtml(item.action)}</div>
                  <div class="step-meta">
                    ${item.owner ? `<span>Lead: ${escapeHtml(item.owner)}</span>` : '<span class="text-muted">Unassigned</span>'}
                    ${item.dueDate ? `<span> · Due: ${escapeHtml(item.dueDate)}</span>` : ''}
                    <span> · Status: ${escapeHtml(item.status.replace('_', ' '))}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

    case 'milestone':
      return `
        <div class="snippet-card">
          <div class="card-kicker">MILESTONE TRACKER</div>
          <h3 class="card-title">${escapeHtml(card.title)}</h3>
          <p class="card-body-text">${escapeHtml(card.description)}</p>
          <div class="step-meta">
            <span>Status: <strong>${escapeHtml(card.status.replace('_', ' ').toUpperCase())}</strong></span>
            ${card.dueDate ? `<span> · Target: ${escapeHtml(card.dueDate)}</span>` : ''}
            ${card.owner ? `<span> · Owner: ${escapeHtml(card.owner)}</span>` : ''}
          </div>
        </div>
      `;

    case 'visual_update':
      return `
        <div class="snippet-card">
          <div class="card-kicker">VISUAL UPDATE</div>
          <h3 class="card-title">${escapeHtml(card.title)}</h3>
          <div class="image-wrapper">
            <img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.altText)}" style="max-width: 100%; border-radius: 6px;" />
          </div>
          <p class="image-caption"><em>${escapeHtml(card.caption)}</em></p>
          ${card.context ? `<p class="image-context">${escapeHtml(card.context)}</p>` : ''}
        </div>
      `;

    default:
      return '';
  }
}

export function exportReportToHtml(project: ReportProject, selectedCards?: SnippetCard[]): string {
  const cardsToExport = selectedCards && selectedCards.length > 0 ? selectedCards : project.cards;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title)} — Executive Report</title>
  <style>
    :root {
      --bg: #F5F5F7;
      --surface: #FFFFFF;
      --text: #1F1F1F;
      --text-muted: #727272;
      --accent: #0071E3;
      --border: rgba(0, 0, 0, 0.08);
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-family);
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 40px 20px;
    }
    .report-container {
      max-width: 760px;
      margin: 0 auto;
    }
    .report-header {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
    }
    .report-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .report-meta {
      font-size: 13px;
      color: var(--text-muted);
    }
    .snippet-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      break-inside: avoid;
    }
    .blocker-border {
      border-left: 4px solid #EF4444;
    }
    .card-kicker {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .card-body-text {
      font-size: 14px;
      color: #333333;
      margin-bottom: 14px;
    }
    .card-section-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 14px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .accomplishment-list {
      padding-left: 20px;
      font-size: 14px;
    }
    .accomplishment-list li {
      margin-bottom: 6px;
    }
    .status-note {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 12px;
      margin-top: 14px;
      color: #475569;
    }
    .metric-display {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin: 10px 0;
    }
    .metric-number {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--text);
    }
    .metric-unit {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .metric-details {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .metric-explanation {
      font-size: 13px;
      color: #4B5563;
    }
    .flex-between {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .severity-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid;
    }
    .info-row {
      font-size: 13px;
      margin-top: 8px;
      color: #374151;
    }
    .action-item-row {
      display: flex;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(0,0,0,0.04);
    }
    .action-item-row:last-child {
      border-bottom: none;
    }
    .step-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #E5E7EB;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .step-action {
      font-size: 14px;
      font-weight: 500;
    }
    .step-meta {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 3px;
    }
    .image-caption {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 8px;
    }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .snippet-card { box-shadow: none; border-color: #D1D5DB; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1 class="report-title">${escapeHtml(project.title)}</h1>
      <div class="report-meta">
        ${project.reportingPeriod ? `<span>Reporting Window: <strong>${escapeHtml(project.reportingPeriod)}</strong></span> · ` : ''}
        <span>Published ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>
    </div>
    <div class="cards-stack">
      ${cardsToExport.map(formatCardToHtml).join('')}
    </div>
  </div>
</body>
</html>`;
}
