/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeImageSrc } from '../lib/security/sanitize';
import { validateWebhookUrl } from '../lib/security/webhookValidation';

describe('Security: HTML & SVG Sanitization', () => {
  it('strips script tags and malicious event handlers from dirty HTML', () => {
    const dirty = '<p>Hello</p><script>alert("xss")</script><img src="x" onerror="alert(1)" />';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('<p>Hello</p>');
  });

  it('preserves valid inline SVG structures used by metric graphs', () => {
    const svgContent = '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="#0071E3" /><text x="50" y="50">85%</text></svg>';
    const clean = sanitizeHtml(svgContent);
    expect(clean).toContain('<svg');
    expect(clean).toContain('<rect');
    expect(clean).toContain('fill="#0071E3"');
    expect(clean).toContain('85%');
  });

  it('sanitizes image URLs to prevent script scheme injection', () => {
    expect(sanitizeImageSrc('javascript:alert(1)')).toBe('');
    expect(sanitizeImageSrc('vbscript:msgbox(1)')).toBe('');
    expect(sanitizeImageSrc('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('');

    const validHttps = 'https://images.unsplash.com/photo-mockup';
    expect(sanitizeImageSrc(validHttps)).toBe(validHttps);

    const validDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    expect(sanitizeImageSrc(validDataUrl)).toBe(validDataUrl);
  });
});

describe('Security: Webhook Validation & SSRF Prevention', () => {
  it('rejects URLs that do not use HTTPS protocol', () => {
    const res = validateWebhookUrl('http://hooks.slack.com/services/T123/B456/789', 'slack');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('HTTPS');
  });

  it('rejects localhost, private IPs, and internal domains to prevent SSRF', () => {
    const localTargets = [
      'https://localhost:8080/hook',
      'https://127.0.0.1/services',
      'https://10.0.0.1/admin',
      'https://192.168.1.1/webhook',
      'https://172.16.0.1/hook',
      'https://internal.local/webhook',
    ];

    for (const target of localTargets) {
      const res = validateWebhookUrl(target, 'slack');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('private/local');
    }
  });

  it('validates authentic platform webhook URLs against patterns', () => {
    const validSlack = 'https://hooks.slack.com/services/T12345/B67890/abcdef123456';
    expect(validateWebhookUrl(validSlack, 'slack').valid).toBe(true);

    const invalidSlack = 'https://hooks.slack.com/unexpected/path';
    expect(validateWebhookUrl(invalidSlack, 'slack').valid).toBe(false);

    const validTeams = 'https://acme.webhook.office.com/webhookb2/guid/IncomingWebhook/id';
    expect(validateWebhookUrl(validTeams, 'teams').valid).toBe(true);

    const validGoogleChat = 'https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY';
    expect(validateWebhookUrl(validGoogleChat, 'googleChat').valid).toBe(true);

    const validDiscord = 'https://discord.com/api/webhooks/123456789/abcdef-token';
    expect(validateWebhookUrl(validDiscord, 'discord').valid).toBe(true);
  });
});

describe('Security: Metric Graph Preservation', () => {
  it('preserves table-based metric graphs and their styling attributes during sanitization', () => {
    const rawGraphHtml = '<table role="img" aria-label="Progress: 85%" data-metric-graph="bar" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr><td width="85%" height="12" bgcolor="#0071E3" style="height:12px;font-size:0;line-height:0;background-color:#0071E3;">&nbsp;</td></tr></table>';
    const sanitized = sanitizeHtml(rawGraphHtml);

    expect(sanitized).toContain('data-metric-graph="bar"');
    expect(sanitized).toContain('bgcolor="#0071E3"');
    expect(sanitized).toContain('background-color:#0071E3');
    expect(sanitized).toContain('role="img"');
    expect(sanitized).toContain('aria-label="Progress: 85%"');
  });
});
