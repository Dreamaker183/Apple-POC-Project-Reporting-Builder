/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { createSampleProject } from '../lib/sampleData';
import { exportReportToMarkdown } from '../lib/export/markdownExport';
import { exportReportToJson, importReportFromJson } from '../lib/export/jsonExport';
import { exportReportToHtml, escapeHtml } from '../lib/export/htmlExport';
import { 
  formatForExecutiveEmail, 
  formatForSlack, 
  formatForTeams, 
  formatForWeeklyStatusMemo 
} from '../lib/export/destinationFormatters';

describe('Export & Serialization Reliability', () => {
  const project = createSampleProject();

  it('escapes untrusted user input in HTML exports to prevent XSS injection', () => {
    const malicious = '<script>alert("xss")</script>&"\'';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
    expect(escaped).toContain('&quot;');
    expect(escaped).toContain('&#39;');
    expect(escaped).toContain('&amp;');
  });

  it('exports valid, comprehensive Markdown representation', () => {
    const md = exportReportToMarkdown(project);
    expect(md).toContain(`# ${project.title}`);
    expect(md).toContain('**Sprint completion:** 85%');
    expect(md).toContain('BLOCKER');
    expect(md).toContain('payment callback issue');
  });

  it('exports structured JSON and successfully re-imports without loss of data', () => {
    const jsonStr = exportReportToJson(project);
    expect(jsonStr).toContain('Customer Portal Modernization');

    const imported = importReportFromJson(jsonStr);
    expect(imported.success).toBe(true);
    expect(imported.data?.title).toBe(project.title);
    expect(imported.data?.cards.length).toBe(project.cards.length);
  });

  it('generates standalone, valid HTML with embedded Apple styling', () => {
    const html = exportReportToHtml(project);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Customer Portal Modernization — Executive Report</title>');
    expect(html).toContain('snippet-card');
  });

  it('formats correctly across all 4 destinations using exact same underlying facts', () => {
    // 1. Email
    const emailHtml = formatForExecutiveEmail(project);
    expect(emailHtml).toContain('Sprint completion');
    expect(emailHtml).toContain('85%');

    // 2. Slack
    const slackText = formatForSlack(project);
    expect(slackText).toContain(':bar_chart: *Customer Portal Modernization*');
    expect(slackText).toContain('`85%`');

    // 3. Teams
    const teamsText = formatForTeams(project);
    expect(teamsText).toContain('### 📢 Customer Portal Modernization');
    expect(teamsText).toContain('Sprint completion');

    // 4. Weekly Memo
    const memoText = formatForWeeklyStatusMemo(project);
    expect(memoText).toContain('WEEKLY STATUS REPORT: CUSTOMER PORTAL MODERNIZATION');
    expect(memoText).toContain('[1] EXECUTIVE OVERVIEW');
    expect(memoText).toContain('[2] QUANTITATIVE METRICS');
  });
});
