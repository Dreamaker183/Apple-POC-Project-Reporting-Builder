/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import DOMPurify from 'dompurify';

/**
 * Whitelist of HTML tags permitted in rendered report previews.
 * Covers the card HTML structures produced by htmlExport.ts,
 * table-based inline email metric graphs, and inline SVG charts.
 */
const ALLOWED_TAGS = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i',
  'img', 'br', 'hr',
  'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'pre', 'code',
  'details', 'summary',
  // SVG elements for inline metric graphs
  'svg', 'path', 'rect', 'circle', 'line', 'text', 'g',
  'polyline', 'polygon', 'ellipse', 'defs', 'clipPath',
  'linearGradient', 'stop',
];

/**
 * Whitelist of HTML/SVG attributes permitted in rendered previews.
 * Intentionally excludes dangerous script event handlers.
 */
const ALLOWED_ATTRS = [
  'class', 'style', 'src', 'alt', 'width', 'height',
  'colspan', 'rowspan',
  // Table presentation attributes required for email and metric graphs
  'bgcolor', 'cellpadding', 'cellspacing', 'border', 'align', 'valign',
  // Accessibility & semantic attributes
  'role', 'aria-label', 'aria-hidden', 'data-metric-graph',
  // SVG presentation attributes
  'viewBox', 'xmlns', 'd', 'fill', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
  'cx', 'cy', 'r', 'rx', 'ry',
  'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'points', 'transform',
  'text-anchor', 'dominant-baseline', 'font-size', 'font-weight',
  'opacity', 'clip-path',
  'offset', 'stop-color', 'stop-opacity',
  'id', 'gradientUnits', 'gradientTransform',
];

function getPurifier() {
  if (typeof window !== 'undefined') {
    if (typeof (DOMPurify as any).sanitize === 'function') {
      return DOMPurify;
    }
    if (typeof DOMPurify === 'function') {
      try {
        return (DOMPurify as any)(window);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Strips script tags and event handlers when running in environments without DOM (e.g. Node tests, SSR).
 */
function fallbackSanitize(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');
}

/**
 * Sanitizes an HTML string for safe rendering via `dangerouslySetInnerHTML`.
 * Uses DOMPurify in browser environments with a strict tag/attribute whitelist to prevent XSS
 * while preserving metric graph rendering and table formatting.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  const purifier = getPurifier();
  if (purifier && typeof purifier.sanitize === 'function') {
    return purifier.sanitize(dirty, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: ALLOWED_ATTRS,
      ALLOW_DATA_ATTR: true,
      ADD_ATTR: [
        'data-metric-graph',
        'bgcolor',
        'role',
        'aria-label',
        'cellpadding',
        'cellspacing',
        'border',
      ],
    });
  }

  return fallbackSanitize(dirty);
}

/**
 * Validates and sanitizes an image source URL.
 * Only allows `data:image/*` data-URLs and `https:` URLs.
 * Rejects `javascript:`, `vbscript:`, and other dangerous schemes.
 */
export function sanitizeImageSrc(url: string): string {
  if (!url) return '';

  // Allow data URIs that are explicitly image types
  if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml|bmp);base64,/i.test(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return url;
  } catch {
    // invalid URL
  }

  return '';
}
