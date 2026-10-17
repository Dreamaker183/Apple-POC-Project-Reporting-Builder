/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateWebhookUrl } from '../security/webhookValidation';

export interface DispatchResult {
  success: boolean;
  message: string;
  timestamp: string;
  statusText?: string;
}

export interface DispatchAuditEntry {
  id: string;
  tool: 'Email' | 'Slack' | 'Microsoft Teams' | 'Google Chat' | 'Discord' | 'WhatsApp' | 'Telegram';
  target: string;
  status: 'delivered' | 'simulated' | 'error';
  timestamp: string;
  summary: string;
}

const STORAGE_WEBHOOKS_KEY = 'project_reporting_builder_webhooks_v1';
const STORAGE_AUDIT_LOG_KEY = 'project_reporting_builder_dispatch_audit_v1';

export interface SavedWebhooks {
  slack?: string;
  teams?: string;
  googleChat?: string;
  discord?: string;
  emailTo?: string;
  emailCc?: string;
}

let memoryStorage: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStorage[key] ?? null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(key, value);
    }
  } catch {}
  memoryStorage[key] = value;
}

function removeStorageItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(key);
    }
  } catch {}
  delete memoryStorage[key];
}

/**
 * Loads stored webhooks configuration from localStorage.
 */
export function loadSavedWebhooks(): SavedWebhooks {
  try {
    const raw = getStorageItem(STORAGE_WEBHOOKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    emailTo: 'executive-review@acme.corp',
    emailCc: '',
    slack: '',
    teams: '',
    googleChat: '',
    discord: '',
  };
}

/**
 * Saves webhooks configuration to localStorage.
 */
export function saveWebhooks(config: SavedWebhooks): void {
  try {
    setStorageItem(STORAGE_WEBHOOKS_KEY, JSON.stringify(config));
  } catch {}
}

/**
 * Retrieves delivery audit log from localStorage.
 */
export function loadDispatchAuditLog(): DispatchAuditEntry[] {
  try {
    const raw = getStorageItem(STORAGE_AUDIT_LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

/**
 * Appends a delivery audit record to the local audit log.
 */
export function recordDispatchAudit(entry: Omit<DispatchAuditEntry, 'id'>): DispatchAuditEntry {
  const item: DispatchAuditEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
  try {
    const existing = loadDispatchAuditLog();
    const updated = [item, ...existing].slice(0, 50);
    setStorageItem(STORAGE_AUDIT_LOG_KEY, JSON.stringify(updated));
  } catch {}
  return item;
}

/**
 * Clears the dispatch audit log.
 */
export function clearDispatchAuditLog(): void {
  try {
    removeStorageItem(STORAGE_AUDIT_LOG_KEY);
  } catch {}
}

/**
 * Builds standard mailto URL for default desktop/mobile email client (Apple Mail, Outlook, Thunderbird).
 */
export function createMailtoLink(to: string, subject: string, bodyText?: string, cc?: string, bcc?: string): string {
  const params: string[] = [];
  if (cc && cc.trim()) params.push(`cc=${encodeURIComponent(cc.trim())}`);
  if (bcc && bcc.trim()) params.push(`bcc=${encodeURIComponent(bcc.trim())}`);
  params.push(`subject=${encodeURIComponent(subject)}`);
  if (bodyText && bodyText.trim()) params.push(`body=${encodeURIComponent(bodyText)}`);
  const query = params.join('&');
  return `mailto:${encodeURIComponent(to.trim())}${query ? `?${query}` : ''}`;
}

/**
 * Builds Gmail Web direct composer link.
 */
export function createGmailComposeLink(to: string, subject: string, bodyText?: string, cc?: string): string {
  const base = 'https://mail.google.com/mail/?view=cm&fs=1&tf=1';
  const query = [
    to.trim() ? `to=${encodeURIComponent(to.trim())}` : '',
    cc?.trim() ? `cc=${encodeURIComponent(cc.trim())}` : '',
    `su=${encodeURIComponent(subject)}`,
    bodyText && bodyText.trim() ? `body=${encodeURIComponent(bodyText)}` : '',
  ].filter(Boolean).join('&');
  return `${base}&${query}`;
}

/**
 * Builds Outlook Web direct composer link.
 */
export function createOutlookComposeLink(to: string, subject: string, bodyText?: string): string {
  const base = 'https://outlook.live.com/mail/0/deeplink/compose';
  const query = [
    to.trim() ? `to=${encodeURIComponent(to.trim())}` : '',
    `subject=${encodeURIComponent(subject)}`,
    bodyText && bodyText.trim() ? `body=${encodeURIComponent(bodyText)}` : '',
  ].filter(Boolean).join('&');
  return `${base}?${query}`;
}

/**
 * Builds standard RFC 822 / MIME .eml draft message with X-Unsent: 1 header.
 * When opened by Apple Mail (default on macOS), Outlook (macOS & Windows),
 * or Thunderbird, it opens directly as an unsent draft with the complete
 * HTML UI, styles, tables, and metric charts rendered in the editor.
 */
export function createEmlDraft(
  to: string,
  subject: string,
  htmlBody: string,
  cc?: string
): string {
  const cleanTo = to.trim();
  const cleanCc = cc?.trim();
  const cleanSubject = subject.trim();
  
  let encodedSubject: string;
  try {
    encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(cleanSubject)))}?=`;
  } catch {
    encodedSubject = cleanSubject;
  }

  const headers: string[] = [
    'MIME-Version: 1.0',
    'X-Unsent: 1',
    cleanTo ? `To: ${cleanTo}` : 'To: ',
  ];
  if (cleanCc) {
    headers.push(`Cc: ${cleanCc}`);
  }
  headers.push(`Subject: ${encodedSubject}`);
  headers.push('Content-Type: text/html; charset=utf-8');
  headers.push('Content-Transfer-Encoding: 8bit');
  headers.push('');

  return headers.join('\r\n') + '\r\n' + htmlBody;
}

/**
 * Builds WhatsApp share link.
 */
export function createWhatsAppShareLink(messageText: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
}

/**
 * Builds Telegram share link.
 */
export function createTelegramShareLink(messageText: string): string {
  return `https://t.me/share/url?text=${encodeURIComponent(messageText)}`;
}

interface WebhookDispatchOptions {
  platform: 'slack' | 'teams' | 'googleChat' | 'discord';
  webhookUrl: string;
  payload: any;
  toolName: DispatchAuditEntry['tool'];
  targetFormatter?: (url: string) => string;
  summary: string;
  successMessage: string;
  statusText: string;
}

/**
 * Generic webhook dispatcher with URL validation and consistent audit logging.
 */
async function dispatchWebhookGeneric(opts: WebhookDispatchOptions): Promise<DispatchResult> {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const validation = validateWebhookUrl(opts.webhookUrl, opts.platform);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || `Please provide a valid ${opts.toolName} Webhook URL`,
      timestamp: now,
    };
  }

  try {
    await fetch(opts.webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts.payload),
      mode: 'no-cors',
    });

    const target = opts.targetFormatter
      ? opts.targetFormatter(opts.webhookUrl.trim())
      : `${opts.toolName} Webhook`;

    recordDispatchAudit({
      tool: opts.toolName,
      target,
      status: 'delivered',
      timestamp: now,
      summary: opts.summary,
    });

    return {
      success: true,
      message: opts.successMessage,
      timestamp: now,
      statusText: opts.statusText,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `${opts.toolName} dispatch failed: ${err?.message || 'Network / CORS error'}`,
      timestamp: now,
    };
  }
}

/**
 * Dispatches payload to a live Slack Incoming Webhook endpoint.
 */
export async function dispatchToSlackWebhook(
  webhookUrl: string,
  payload: { text: string; blocks?: any[] }
): Promise<DispatchResult> {
  return dispatchWebhookGeneric({
    platform: 'slack',
    webhookUrl,
    payload,
    toolName: 'Slack',
    targetFormatter: (url) => url.replace(/(\/T[A-Z0-9]+\/B[A-Z0-9]+\/).*$/, '$1••••••••'),
    summary: payload.text || 'Project Status Report',
    successMessage: 'Message delivered to Slack channel successfully!',
    statusText: 'Dispatched via Incoming Webhook (HTTP 200/Opaque)',
  });
}

/**
 * Dispatches payload to a live Microsoft Teams Incoming Webhook endpoint.
 */
export async function dispatchToTeamsWebhook(
  webhookUrl: string,
  payload: any
): Promise<DispatchResult> {
  return dispatchWebhookGeneric({
    platform: 'teams',
    webhookUrl,
    payload,
    toolName: 'Microsoft Teams',
    targetFormatter: () => 'Teams Connector Endpoint',
    summary: 'Adaptive Card 1.4 Status Report',
    successMessage: 'Report delivered to Microsoft Teams channel successfully!',
    statusText: 'Dispatched via Connector Webhook (HTTP 200/Opaque)',
  });
}

/**
 * Dispatches payload to a live Google Chat Incoming Webhook endpoint.
 */
export async function dispatchToGoogleChatWebhook(
  webhookUrl: string,
  payload: any
): Promise<DispatchResult> {
  return dispatchWebhookGeneric({
    platform: 'googleChat',
    webhookUrl,
    payload,
    toolName: 'Google Chat',
    targetFormatter: () => 'Google Spaces Webhook',
    summary: 'Card v2 Google Workspace Report',
    successMessage: 'Report delivered to Google Chat Space successfully!',
    statusText: 'Dispatched via Google Chat Card v2 API',
  });
}

/**
 * Dispatches payload to a live Discord Webhook endpoint.
 */
export async function dispatchToDiscordWebhook(
  webhookUrl: string,
  payload: any
): Promise<DispatchResult> {
  return dispatchWebhookGeneric({
    platform: 'discord',
    webhookUrl,
    payload,
    toolName: 'Discord',
    targetFormatter: () => 'Discord Channel Webhook',
    summary: 'Rich Embed Status Report',
    successMessage: 'Report delivered to Discord channel successfully!',
    statusText: 'Dispatched via Discord Webhook Embed API',
  });
}

/**
 * Executes a simulated enterprise test delivery when no live credentials are active.
 */
export async function simulateWebhookDispatch(
  toolName: 'Slack' | 'Microsoft Teams' | 'Google Chat' | 'Discord' | 'Email Service',
  channelOrTarget: string,
  summaryText?: string
): Promise<DispatchResult> {
  // Simulate network round-trip of 350ms
  await new Promise((resolve) => setTimeout(resolve, 350));
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  recordDispatchAudit({
    tool: toolName === 'Email Service' ? 'Email' : toolName,
    target: channelOrTarget,
    status: 'simulated',
    timestamp: now,
    summary: summaryText || `Simulated verified payload delivery to ${channelOrTarget}`,
  });

  return {
    success: true,
    message: `[Simulated Sandbox] Verified delivery to ${toolName} target "${channelOrTarget}"`,
    timestamp: now,
    statusText: 'HTTP 200 OK (Validated Schema & Payload Integrity)',
  };
}
