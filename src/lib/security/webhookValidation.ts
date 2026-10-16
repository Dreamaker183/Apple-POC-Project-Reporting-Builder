/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Platform-specific webhook URL patterns.
 * Each pattern enforces HTTPS and validates the expected host/path structure.
 */
const WEBHOOK_PATTERNS: Record<string, RegExp> = {
  slack: /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/.+$/i,
  teams: /^https:\/\/[a-z0-9-]+\.webhook\.office\.com\//i,
  googleChat: /^https:\/\/chat\.googleapis\.com\/v1\/spaces\/.+$/i,
  discord: /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/.+$/i,
};

export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a webhook URL against platform-specific patterns.
 *
 * @param url - The webhook URL to validate.
 * @param platform - The target platform key (slack, teams, googleChat, discord).
 * @returns Validation result with an error message if invalid.
 */
export function validateWebhookUrl(url: string, platform: string): WebhookValidationResult {
  const trimmed = url.trim();

  if (!trimmed) {
    return { valid: false, error: 'Webhook URL is required' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Webhook URLs must use HTTPS' };
  }

  // Reject localhost and private-range hosts to prevent SSRF
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^192\.168\./.test(hostname)
  ) {
    return { valid: false, error: 'Webhook URLs must not target private/local addresses' };
  }

  const pattern = WEBHOOK_PATTERNS[platform];
  if (pattern && !pattern.test(trimmed)) {
    return {
      valid: false,
      error: `URL does not match the expected ${formatPlatformName(platform)} webhook format`,
    };
  }

  return { valid: true };
}

function formatPlatformName(platform: string): string {
  const names: Record<string, string> = {
    slack: 'Slack',
    teams: 'Microsoft Teams',
    googleChat: 'Google Chat',
    discord: 'Discord',
  };
  return names[platform] ?? platform;
}
