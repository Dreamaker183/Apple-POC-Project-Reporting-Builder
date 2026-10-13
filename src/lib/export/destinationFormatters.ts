/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportProject, SnippetCard } from '../../types/report';
import { escapeHtml } from './htmlExport';

/**
 * Executive Email representation (Table-based clean inline CSS, optimized for Outlook/Gmail).
 */
export function formatForExecutiveEmail(project: ReportProject, cards?: SnippetCard[]): string {
  const cardsToUse = cards && cards.length > 0 ? cards : project.cards;
  const execCard = cardsToUse.find(c => c.type === 'executive_summary');
  const metricCards = cardsToUse.filter(c => c.type === 'kpi_metric');
  const riskCards = cardsToUse.filter(c => c.type === 'risk_blocker');
  const nextStepsCards = cardsToUse.filter(c => c.type === 'next_steps');

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1F1F1F; line-height: 1.5;">
  <div style="border-bottom: 2px solid #0071E3; padding-bottom: 12px; margin-bottom: 20px;">
    <h1 style="font-size: 22px; margin: 0 0 6px 0; color: #1F1F1F;">${escapeHtml(project.title)}</h1>
    <div style="font-size: 13px; color: #727272;">
      ${project.reportingPeriod ? `Period: <strong>${escapeHtml(project.reportingPeriod)}</strong> &middot; ` : ''}
      Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </div>
  </div>

  ${execCard && execCard.type === 'executive_summary' ? `
  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
    <div style="font-size: 11px; font-weight: 700; color: #0071E3; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Executive Summary</div>
    <p style="font-size: 14px; margin: 0 0 10px 0; color: #1E293B;">${escapeHtml(execCard.summary)}</p>
    <div style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Key Accomplishments:</div>
    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
      ${execCard.keyAccomplishments.map(a => `<li style="margin-bottom: 4px;">${escapeHtml(a)}</li>`).join('')}
    </ul>
    ${execCard.statusNote ? `<div style="margin-top: 8px; font-size: 12px; color: #64748B;"><em>Note: ${escapeHtml(execCard.statusNote)}</em></div>` : ''}
  </div>` : ''}

  ${metricCards.length > 0 ? `
  <div style="margin-bottom: 20px;">
    <div style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Key Performance Indicators</div>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background: #F1F5F9; text-align: left; color: #475569;">
          <th style="padding: 8px 12px; border: 1px solid #E2E8F0;">Metric</th>
          <th style="padding: 8px 12px; border: 1px solid #E2E8F0;">Current</th>
          <th style="padding: 8px 12px; border: 1px solid #E2E8F0;">Target</th>
          <th style="padding: 8px 12px; border: 1px solid #E2E8F0;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${metricCards.map(m => {
          if (m.type !== 'kpi_metric') return '';
          return `
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-weight: 600;">${escapeHtml(m.label)}</td>
            <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">${escapeHtml(String(m.value))}${escapeHtml(m.unit)}</td>
            <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">${m.target !== undefined ? `${escapeHtml(String(m.target))}${escapeHtml(m.unit)}` : '—'}</td>
            <td style="padding: 8px 12px; border: 1px solid #E2E8F0; color: ${m.trend === 'declining' ? '#DC2626' : '#16A34A'}; font-weight: 600;">
              ${m.trend === 'declining' ? 'Attention' : 'On Track'}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${riskCards.length > 0 ? `
  <div style="margin-bottom: 20px;">
    <div style="font-size: 13px; font-weight: 700; color: #DC2626; text-transform: uppercase; margin-bottom: 8px;">Risks & Blockers</div>
    ${riskCards.map(r => {
      if (r.type !== 'risk_blocker') return '';
      return `
      <div style="border-left: 3px solid ${r.isBlocker ? '#DC2626' : '#F59E0B'}; background: #FEF2F2; padding: 10px 14px; margin-bottom: 8px; border-radius: 4px;">
        <div style="font-size: 13px; font-weight: 700; color: #991B1B;">${escapeHtml(r.title)} (${escapeHtml(r.severity.toUpperCase())})</div>
        <div style="font-size: 12px; color: #7F1D1D; margin-top: 2px;">${escapeHtml(r.description)}</div>
        ${r.mitigation ? `<div style="font-size: 12px; color: #991B1B; margin-top: 4px;"><strong>Mitigation:</strong> ${escapeHtml(r.mitigation)}</div>` : ''}
      </div>`;
    }).join('')}
  </div>` : ''}

  ${nextStepsCards.length > 0 ? `
  <div style="margin-bottom: 20px;">
    <div style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Next Steps</div>
    <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
      ${nextStepsCards.flatMap(c => c.type === 'next_steps' ? c.items : []).map(step => `
        <li style="margin-bottom: 6px;">
          <strong>${escapeHtml(step.action)}</strong>
          ${step.owner ? ` &middot; Lead: @${escapeHtml(step.owner)}` : ''}
          ${step.dueDate ? ` &middot; Due: ${escapeHtml(step.dueDate)}` : ''}
        </li>
      `).join('')}
    </ol>
  </div>` : ''}
</div>`;
}

/**
 * Slack-flavored mrkdwn formatter with emoji highlights and clean block structure.
 */
export function formatForSlack(project: ReportProject, cards?: SnippetCard[]): string {
  const cardsToUse = cards && cards.length > 0 ? cards : project.cards;
  const lines: string[] = [];

  lines.push(`:bar_chart: *${project.title}*`);
  if (project.reportingPeriod) {
    lines.push(`:calendar: *Period:* ${project.reportingPeriod}`);
  }
  lines.push(`───────────────────────────────`);

  cardsToUse.forEach(card => {
    switch (card.type) {
      case 'executive_summary':
        lines.push(`*Executive Summary*`);
        lines.push(`>${card.summary}`);
        lines.push(`*Key Accomplishments:*`);
        card.keyAccomplishments.forEach(acc => {
          lines.push(`• ${acc}`);
        });
        if (card.statusNote) {
          lines.push(`:information_source: _Note: ${card.statusNote}_`);
        }
        lines.push(``);
        break;

      case 'kpi_metric': {
        const trendEmoji = card.trend === 'declining' ? ':warning:' : ':white_check_mark:';
        lines.push(`${trendEmoji} *${card.label}:* \`${card.value}${card.unit}\`${card.target !== undefined ? ` (Target: \`${card.target}${card.unit}\`)` : ''}`);
        if (card.explanation) {
          lines.push(`  ↳ _${card.explanation}_`);
        }
        break;
      }

      case 'risk_blocker': {
        const icon = card.isBlocker ? ':rotating_light: *BLOCKER:*' : ':warning: *RISK:*';
        lines.push(`${icon} *${card.title}* [${card.severity.toUpperCase()}]`);
        lines.push(`>${card.description}`);
        if (card.mitigation) {
          lines.push(`> *Mitigation:* ${card.mitigation}`);
        }
        lines.push(``);
        break;
      }

      case 'next_steps':
        lines.push(`*Next Steps & Commitments:*`);
        card.items.forEach((item, idx) => {
          const ownerPart = item.owner ? ` (@${item.owner})` : '';
          const duePart = item.dueDate ? ` _[${item.dueDate}]_` : '';
          lines.push(`${idx + 1}. ${item.action}${ownerPart}${duePart}`);
        });
        lines.push(``);
        break;

      case 'milestone':
        lines.push(`:dart: *Milestone: ${card.title}* [${card.status.toUpperCase()}]`);
        lines.push(`> ${card.description}`);
        lines.push(``);
        break;

      case 'visual_update':
        lines.push(`:frame_with_picture: *Visual Update:* ${card.title}`);
        lines.push(`_${card.caption}_`);
        lines.push(``);
        break;
    }
  });

  return lines.join('\n');
}

/**
 * Microsoft Teams-flavored formatted markdown.
 */
export function formatForTeams(project: ReportProject, cards?: SnippetCard[]): string {
  const cardsToUse = cards && cards.length > 0 ? cards : project.cards;
  const lines: string[] = [];

  lines.push(`### 📢 ${project.title}`);
  if (project.reportingPeriod) {
    lines.push(`**Reporting Window:** ${project.reportingPeriod}`);
  }
  lines.push(`***`);

  cardsToUse.forEach(card => {
    switch (card.type) {
      case 'executive_summary':
        lines.push(`#### 📌 Executive Summary`);
        lines.push(`${card.summary}\n`);
        lines.push(`**Key Accomplishments:**`);
        card.keyAccomplishments.forEach(a => lines.push(`- ${a}`));
        if (card.statusNote) {
          lines.push(`\n*Note: ${card.statusNote}*`);
        }
        lines.push(``);
        break;

      case 'kpi_metric':
        lines.push(`- **${card.label}**: **${card.value}${card.unit}** ${card.target !== undefined ? `*(Target: ${card.target}${card.unit})*` : ''}`);
        break;

      case 'risk_blocker':
        lines.push(`#### 🛑 ${card.isBlocker ? 'BLOCKER' : 'RISK'}: ${card.title} [${card.severity.toUpperCase()}]`);
        lines.push(`> ${card.description}`);
        if (card.mitigation) {
          lines.push(`> **Mitigation:** ${card.mitigation}`);
        }
        lines.push(``);
        break;

      case 'next_steps':
        lines.push(`#### 📋 Next Steps`);
        card.items.forEach((item, i) => {
          lines.push(`${i + 1}. **${item.action}** ${item.owner ? `(Lead: @${item.owner})` : ''} ${item.dueDate ? `[Due: ${item.dueDate}]` : ''}`);
        });
        lines.push(``);
        break;

      default:
        break;
    }
  });

  return lines.join('\n');
}

/**
 * Weekly Status Report formal executive memo format.
 */
export function formatForWeeklyStatusMemo(project: ReportProject, cards?: SnippetCard[]): string {
  const cardsToUse = cards && cards.length > 0 ? cards : project.cards;
  const lines: string[] = [];

  lines.push(`================================================================`);
  lines.push(`WEEKLY STATUS REPORT: ${project.title.toUpperCase()}`);
  if (project.reportingPeriod) {
    lines.push(`PERIOD: ${project.reportingPeriod}`);
  }
  lines.push(`DATE: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`================================================================\n`);

  const exec = cardsToUse.find(c => c.type === 'executive_summary');
  if (exec && exec.type === 'executive_summary') {
    lines.push(`[1] EXECUTIVE OVERVIEW`);
    lines.push(`----------------------------------------`);
    lines.push(exec.summary);
    lines.push(`\nHighlights:`);
    exec.keyAccomplishments.forEach(a => lines.push(`  * ${a}`));
    if (exec.statusNote) {
      lines.push(`  ! Outstanding: ${exec.statusNote}`);
    }
    lines.push(``);
  }

  const metrics = cardsToUse.filter(c => c.type === 'kpi_metric');
  if (metrics.length > 0) {
    lines.push(`[2] QUANTITATIVE METRICS`);
    lines.push(`----------------------------------------`);
    metrics.forEach(m => {
      if (m.type !== 'kpi_metric') return;
      const targetStr = m.target !== undefined ? ` [Target: ${m.target}${m.unit}]` : '';
      lines.push(`  * ${m.label.padEnd(28)} : ${m.value}${m.unit}${targetStr}`);
    });
    lines.push(``);
  }

  const risks = cardsToUse.filter(c => c.type === 'risk_blocker');
  if (risks.length > 0) {
    lines.push(`[3] RISKS & BLOCKERS`);
    lines.push(`----------------------------------------`);
    risks.forEach(r => {
      if (r.type !== 'risk_blocker') return;
      lines.push(`  [${r.severity.toUpperCase()}] ${r.title}`);
      lines.push(`  Details    : ${r.description}`);
      if (r.impact) lines.push(`  Impact     : ${r.impact}`);
      if (r.mitigation) lines.push(`  Mitigation : ${r.mitigation}`);
      lines.push(``);
    });
  }

  const nextSteps = cardsToUse.filter(c => c.type === 'next_steps');
  if (nextSteps.length > 0) {
    lines.push(`[4] ACTION ITEMS & NEXT STEPS`);
    lines.push(`----------------------------------------`);
    nextSteps.flatMap(c => c.type === 'next_steps' ? c.items : []).forEach((step, idx) => {
      const ownerStr = step.owner ? ` (Owner: ${step.owner})` : ' (Unassigned)';
      const dueStr = step.dueDate ? ` [Due: ${step.dueDate}]` : '';
      lines.push(`  ${idx + 1}. ${step.action}${ownerStr}${dueStr}`);
    });
    lines.push(``);
  }

  return lines.join('\n');
}

/**
 * Structured Slack Block Kit webhook payload.
 */
export function formatSlackWebhookPayload(project: ReportProject, cards?: SnippetCard[]): { text: string; blocks: any[] } {
  const cardsToUse = cards && cards.length > 0 ? cards : project.cards;
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 ${project.title}`,
        emoji: true,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: project.reportingPeriod 
            ? `*Period:* ${project.reportingPeriod} · *Generated:* ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : `*Generated:* ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        },
      ],
    },
    { type: 'divider' },
  ];

  // Executive summary
  const exec = cardsToUse.find(c => c.type === 'executive_summary');
  if (exec && exec.type === 'executive_summary') {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Executive Summary:*\n>${exec.summary}\n\n*Key Accomplishments:*\n${exec.keyAccomplishments.map(a => `• ${a}`).join('\n')}`,
      },
    });
  }

  // Metrics
  const metrics = cardsToUse.filter(c => c.type === 'kpi_metric');
  if (metrics.length > 0) {
    const fields = metrics.map(m => {
      if (m.type !== 'kpi_metric') return { type: 'mrkdwn', text: '' };
      const icon = m.trend === 'declining' ? '⚠️' : '✅';
      const targetStr = m.target !== undefined ? ` (Target: ${m.target}${m.unit})` : '';
      return {
        type: 'mrkdwn',
        text: `${icon} *${m.label}:* \`${m.value}${m.unit}\`${targetStr}`,
      };
    });

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Key Performance Indicators:*' },
      fields: fields.slice(0, 10),
    });
  }

  // Blockers
  const blockers = cardsToUse.filter(c => c.type === 'risk_blocker');
  if (blockers.length > 0) {
    const riskTexts = blockers.map(r => {
      if (r.type !== 'risk_blocker') return '';
      const icon = r.isBlocker ? '🚨 *BLOCKER:*' : '⚠️ *RISK:*';
      return `${icon} *${r.title}* [${r.severity.toUpperCase()}]\n>${r.description}`;
    }).join('\n\n');

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Risks & Blockers:*\n${riskTexts}` },
    });
  }

  return {
    text: `Status Report: ${project.title}`,
    blocks,
  };
}

/**
 * Structured Microsoft Teams Adaptive Card webhook payload.
 */
export function formatTeamsWebhookPayload(project: ReportProject, cards?: SnippetCard[]): any {
  const cardsToUse = cards && cards.length > 0 ? cards : project.cards;

  const facts: Array<{ title: string; value: string }> = [];
  if (project.reportingPeriod) {
    facts.push({ title: 'Reporting Period', value: project.reportingPeriod });
  }
  facts.push({ title: 'Date', value: new Date().toLocaleDateString('en-US') });

  const metrics = cardsToUse.filter(c => c.type === 'kpi_metric');
  metrics.forEach(m => {
    if (m.type === 'kpi_metric') {
      facts.push({ title: m.label, value: `${m.value}${m.unit}${m.target !== undefined ? ` (Target: ${m.target}${m.unit})` : ''}` });
    }
  });

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              size: 'Medium',
              weight: 'Bolder',
              text: `📢 ${project.title}`,
            },
            {
              type: 'FactSet',
              facts,
            },
            {
              type: 'TextBlock',
              text: formatForTeams(project, cardsToUse),
              wrap: true,
            },
          ],
        },
      },
    ],
  };
}

/**
 * Structured Google Chat / Spaces Card v2 Webhook payload.
 */
export function formatGoogleChatWebhookPayload(project: ReportProject, cards?: SnippetCard[]): any {
  const cardsToUse = cards && cards.length > 0 ? cards : project.cards;
  const widgets: any[] = [];

  const exec = cardsToUse.find(c => c.type === 'executive_summary');
  if (exec && exec.type === 'executive_summary') {
    widgets.push({
      textParagraph: {
        text: `<b>Executive Summary:</b><br>${escapeHtml(exec.summary)}`,
      },
    });
    if (exec.keyAccomplishments.length > 0) {
      widgets.push({
        textParagraph: {
          text: `<b>Key Accomplishments:</b><br>${exec.keyAccomplishments.map(a => `• ${escapeHtml(a)}`).join('<br>')}`,
        },
      });
    }
  }

  const metrics = cardsToUse.filter(c => c.type === 'kpi_metric');
  if (metrics.length > 0) {
    metrics.forEach(m => {
      if (m.type === 'kpi_metric') {
        widgets.push({
          decoratedText: {
            topLabel: 'KPI Metric',
            text: `<b>${escapeHtml(m.label)}:</b> ${m.value}${m.unit}${m.target !== undefined ? ` (Target: ${m.target}${m.unit})` : ''}`,
            bottomLabel: m.trend === 'declining' ? 'Status: Attention Required' : 'Status: On Track',
          },
        });
      }
    });
  }

  const blockers = cardsToUse.filter(c => c.type === 'risk_blocker');
  if (blockers.length > 0) {
    blockers.forEach(r => {
      if (r.type === 'risk_blocker') {
        widgets.push({
          decoratedText: {
            topLabel: r.isBlocker ? 'BLOCKER' : 'RISK',
            text: `<b>${escapeHtml(r.title)}</b> [${r.severity.toUpperCase()}]<br>${escapeHtml(r.description)}`,
            bottomLabel: r.mitigation ? `Mitigation: ${escapeHtml(r.mitigation)}` : undefined,
          },
        });
      }
    });
  }

  return {
    cardsV2: [
      {
        cardId: `report-${Date.now()}`,
        card: {
          header: {
            title: `📊 ${project.title}`,
            subtitle: project.reportingPeriod ? `Period: ${project.reportingPeriod}` : 'Executive Status Update',
            imageType: 'CIRCLE',
          },
          sections: [
            {
              header: 'Project Highlights',
              widgets,
            },
          ],
        },
      },
    ],
  };
}

/**
 * Structured Discord Webhook payload with rich embed.
 */
export function formatDiscordWebhookPayload(project: ReportProject, cards?: SnippetCard[]): any {
  const cardsToUse = cards && cards.length > 0 ? cards : project.cards;
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  const metrics = cardsToUse.filter(c => c.type === 'kpi_metric');
  metrics.forEach(m => {
    if (m.type === 'kpi_metric') {
      const icon = m.trend === 'declining' ? '⚠️' : '📈';
      fields.push({
        name: `${icon} ${m.label}`,
        value: `**${m.value}${m.unit}**${m.target !== undefined ? ` (Target: ${m.target}${m.unit})` : ''}`,
        inline: true,
      });
    }
  });

  const blockers = cardsToUse.filter(c => c.type === 'risk_blocker');
  if (blockers.length > 0) {
    fields.push({
      name: '🚨 Risks & Blockers',
      value: blockers.map(b => b.type === 'risk_blocker' ? `• **${b.title}** [${b.severity.toUpperCase()}]: ${b.description}` : '').join('\n').slice(0, 1024),
      inline: false,
    });
  }

  const exec = cardsToUse.find(c => c.type === 'executive_summary');
  return {
    username: 'Project Reporting Builder',
    embeds: [
      {
        title: `📊 ${project.title}`,
        description: exec && exec.type === 'executive_summary' ? exec.summary : (project.reportingPeriod || 'Project Status Update'),
        color: 0x0071E3,
        fields: fields.slice(0, 25),
        footer: {
          text: project.reportingPeriod ? `Period: ${project.reportingPeriod} · Apple Enterprise Workspace` : 'Apple Enterprise Workspace',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Formats a single card for instant Slack posting.
 */
export function formatSingleCardForSlack(card: SnippetCard): string {
  switch (card.type) {
    case 'executive_summary':
      return `*Executive Summary*\n>${card.summary}\n${card.keyAccomplishments.map(a => `• ${a}`).join('\n')}`;
    case 'kpi_metric': {
      const icon = card.trend === 'declining' ? '⚠️' : '✅';
      return `${icon} *${card.label}:* \`${card.value}${card.unit}\`${card.target !== undefined ? ` (Target: \`${card.target}${card.unit}\`)` : ''}\n↳ _${card.explanation || 'Verified metric'}_`;
    }
    case 'risk_blocker': {
      const icon = card.isBlocker ? '🚨 *BLOCKER:*' : '⚠️ *RISK:*';
      return `${icon} *${card.title}* [${card.severity.toUpperCase()}]\n>${card.description}${card.mitigation ? `\n> *Mitigation:* ${card.mitigation}` : ''}`;
    }
    case 'next_steps':
      return `*Next Steps:*\n${card.items.map(s => `• [${s.status.toUpperCase()}] ${s.action}${s.owner ? ` (@${s.owner})` : ''}`).join('\n')}`;
    case 'milestone':
      return `🎯 *Milestone:* ${card.title} (${card.dueDate || 'TBD'}) - Status: *${card.status}*`;
    case 'visual_update':
      return `🖼️ *Visual Update:* ${card.caption || card.title}\n_Alt text: ${card.altText}_`;
    default:
      return (card as any)?.title || 'Report Card';
  }
}


