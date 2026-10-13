/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSampleProject } from '../lib/sampleData';
import {
  createMailtoLink,
  createGmailComposeLink,
  createOutlookComposeLink,
  createWhatsAppShareLink,
  createTelegramShareLink,
  simulateWebhookDispatch,
  loadSavedWebhooks,
  saveWebhooks,
  loadDispatchAuditLog,
  recordDispatchAudit,
  clearDispatchAuditLog,
} from '../lib/integrations/messageDispatch';
import {
  formatSlackWebhookPayload,
  formatTeamsWebhookPayload,
  formatGoogleChatWebhookPayload,
  formatDiscordWebhookPayload,
  formatSingleCardForSlack,
} from '../lib/export/destinationFormatters';

describe('Message Tool Integrations', () => {
  const project = createSampleProject();

  beforeEach(() => {
    clearDispatchAuditLog();
  });

  it('builds valid mailto, Gmail, and Outlook compose links with parameters', () => {
    const to = 'exec@acme.corp';
    const cc = 'pm@acme.corp';
    const subject = 'Sprint Report';
    const body = 'Weekly update content';

    const mailto = createMailtoLink(to, subject, body, cc);
    expect(mailto).toContain('mailto:exec%40acme.corp');
    expect(mailto).toContain('subject=Sprint%20Report');
    expect(mailto).toContain('cc=pm%40acme.corp');

    const gmail = createGmailComposeLink(to, subject, body, cc);
    expect(gmail).toContain('https://mail.google.com/mail/');
    expect(gmail).toContain('to=exec%40acme.corp');
    expect(gmail).toContain('su=Sprint%20Report');

    const outlook = createOutlookComposeLink(to, subject, body);
    expect(outlook).toContain('https://outlook.live.com/mail/');
    expect(outlook).toContain('subject=Sprint%20Report');
  });

  it('builds valid WhatsApp and Telegram mobile sharing links', () => {
    const text = 'Quick project summary for mobile';
    const wa = createWhatsAppShareLink(text);
    expect(wa).toContain('https://api.whatsapp.com/send?text=');
    expect(wa).toContain(encodeURIComponent(text));

    const tg = createTelegramShareLink(text);
    expect(tg).toContain('https://t.me/share/url?text=');
  });

  it('generates valid Slack Block Kit payload structure', () => {
    const payload = formatSlackWebhookPayload(project);
    expect(payload.text).toContain(project.title);
    expect(Array.isArray(payload.blocks)).toBe(true);
    expect(payload.blocks.length).toBeGreaterThan(0);

    const headerBlock = payload.blocks.find((b: any) => b.type === 'header');
    expect(headerBlock).toBeDefined();
    expect(headerBlock.text.text).toContain(project.title);
  });

  it('generates valid Microsoft Teams Adaptive Card 1.4 payload', () => {
    const payload = formatTeamsWebhookPayload(project);
    expect(payload.type).toBe('message');
    expect(payload.attachments).toBeDefined();
    expect(payload.attachments[0].contentType).toBe('application/vnd.microsoft.card.adaptive');
    expect(payload.attachments[0].content.type).toBe('AdaptiveCard');
  });

  it('generates valid Google Chat Card v2 payload', () => {
    const payload = formatGoogleChatWebhookPayload(project);
    expect(payload.cardsV2).toBeDefined();
    expect(Array.isArray(payload.cardsV2)).toBe(true);
    const card = payload.cardsV2[0].card;
    expect(card.header.title).toContain(project.title);
    expect(card.sections.length).toBeGreaterThan(0);
  });

  it('generates valid Discord Rich Embed payload', () => {
    const payload = formatDiscordWebhookPayload(project);
    expect(payload.username).toBe('Project Reporting Builder');
    expect(Array.isArray(payload.embeds)).toBe(true);
    const embed = payload.embeds[0];
    expect(embed.title).toContain(project.title);
    expect(Array.isArray(embed.fields)).toBe(true);
  });

  it('formats single cards accurately for Slack snippets', () => {
    const metricCard = project.cards.find(c => c.type === 'kpi_metric');
    if (metricCard) {
      const formatted = formatSingleCardForSlack(metricCard);
      expect(formatted).toContain(metricCard.title);
    }

    const blockerCard = project.cards.find(c => c.type === 'risk_blocker');
    if (blockerCard) {
      const formatted = formatSingleCardForSlack(blockerCard);
      expect(formatted).toContain(blockerCard.title);
    }
  });

  it('simulates verified dispatch and records delivery in audit log', async () => {
    const res = await simulateWebhookDispatch('Slack', '#executive-updates', 'Sprint report delivered');
    expect(res.success).toBe(true);
    expect(res.statusText).toContain('HTTP 200 OK');

    const log = loadDispatchAuditLog();
    expect(log.length).toBe(1);
    expect(log[0].tool).toBe('Slack');
    expect(log[0].target).toBe('#executive-updates');
    expect(log[0].status).toBe('simulated');
  });

  it('persists and retrieves webhook settings to and from storage', () => {
    const dummy = {
      slack: 'https://hooks.slack.com/services/test/123/456',
      teams: 'https://outlook.office.com/webhook/test',
      googleChat: 'https://chat.googleapis.com/v1/spaces/test',
      discord: 'https://discord.com/api/webhooks/test',
      emailTo: 'director@acme.corp',
      emailCc: 'team-leads@acme.corp',
    };
    saveWebhooks(dummy);
    const loaded = loadSavedWebhooks();
    expect(loaded.slack).toBe(dummy.slack);
    expect(loaded.teams).toBe(dummy.teams);
    expect(loaded.emailTo).toBe(dummy.emailTo);
  });
});
