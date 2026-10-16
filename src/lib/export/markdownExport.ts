/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportProject, SnippetCard } from '../../types/report';
import { metricGraphText } from './metricGraphs';

export function formatCardToMarkdown(card: SnippetCard): string {
  switch (card.type) {
    case 'executive_summary':
      return [
        `### ${card.title}`,
        ``,
        card.summary,
        ``,
        `**Key Accomplishments:**`,
        ...card.keyAccomplishments.map(a => `- ${a}`),
        card.statusNote ? `\n> **Note:** ${card.statusNote}` : '',
      ].filter(Boolean).join('\n');

    case 'kpi_metric': {
      const parts = [`### ${card.title}`];
      parts.push(`**${card.label}:** ${card.value}${card.unit}`);
      if (card.target !== undefined) {
        parts.push(`- Target: ${card.target}${card.unit}`);
      }
      if (card.previousValue !== undefined) {
        parts.push(`- Previous: ${card.previousValue}${card.unit}`);
      }
      const graph = metricGraphText(card);
      if (graph) {
        parts.push('');
        parts.push('```');
        parts.push(graph);
        parts.push('```');
      }
      if (card.explanation) {
        parts.push(`- Context: ${card.explanation}`);
      }
      return parts.join('\n');
    }

    case 'risk_blocker': {
      const parts = [`### ${card.isBlocker ? '🚨 BLOCKER' : '⚠️ RISK'}: ${card.title}`];
      parts.push(`**Severity:** ${card.severity.toUpperCase()}`);
      parts.push(`**Description:** ${card.description}`);
      if (card.impact) parts.push(`**Impact:** ${card.impact}`);
      if (card.mitigation) parts.push(`**Mitigation:** ${card.mitigation}`);
      return parts.join('\n');
    }

    case 'next_steps': {
      const parts = [`### ${card.title}`];
      card.items.forEach((item, idx) => {
        const ownerStr = item.owner ? ` (@${item.owner})` : '';
        const dueStr = item.dueDate ? ` [Due: ${item.dueDate}]` : '';
        const statusBox = item.status === 'completed' ? '[x]' : '[ ]';
        parts.push(`${idx + 1}. ${statusBox} ${item.action}${ownerStr}${dueStr}`);
      });
      return parts.join('\n');
    }

    case 'milestone': {
      const parts = [`### 🏁 Milestone: ${card.title}`];
      parts.push(`- **Status:** ${card.status.replace('_', ' ').toUpperCase()}`);
      parts.push(`- **Details:** ${card.description}`);
      if (card.dueDate) parts.push(`- **Target Date:** ${card.dueDate}`);
      if (card.owner) parts.push(`- **Lead:** ${card.owner}`);
      return parts.join('\n');
    }

    case 'visual_update': {
      return [
        `### 🖼️ ${card.title}`,
        `![${card.altText}](${card.imageUrl.startsWith('data:') ? '[Embedded Image Asset]' : card.imageUrl})`,
        `*${card.caption}*`,
        card.context ? `> ${card.context}` : '',
      ].filter(Boolean).join('\n');
    }

    default:
      return '';
  }
}

export function exportReportToMarkdown(project: ReportProject, selectedCards?: SnippetCard[]): string {
  const cardsToExport = selectedCards && selectedCards.length > 0 ? selectedCards : project.cards;

  const header = [
    `# ${project.title}`,
    project.reportingPeriod ? `**Reporting Period:** ${project.reportingPeriod}` : '',
    `*Generated on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*`,
    `---`,
    ``,
  ].filter(Boolean).join('\n');

  const cardSections = cardsToExport.map(formatCardToMarkdown).join('\n\n---\n\n');

  return `${header}\n\n${cardSections}\n`;
}
