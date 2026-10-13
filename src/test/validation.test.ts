/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { 
  SnippetCardSchema, 
  MetricInputSchema, 
  ImageAssetInputSchema, 
  ReportProjectSchema 
} from '../schemas/reportSchema';

describe('Zod Schema & Data Validation', () => {
  it('validates valid KPI metric input', () => {
    const validMetric = {
      id: 'm1',
      name: 'Sprint completion',
      value: 85,
      unit: '%',
      target: 100,
    };
    const result = MetricInputSchema.safeParse(validMetric);
    expect(result.success).toBe(true);
  });

  it('rejects invalid non-numeric metric values', () => {
    const invalidMetric = {
      id: 'm1',
      name: 'Sprint completion',
      value: 'not-a-number' as any,
      unit: '%',
    };
    const result = MetricInputSchema.safeParse(invalidMetric);
    expect(result.success).toBe(false);
  });

  it('validates image asset formats and rejects unsupported file types', () => {
    const validPng = {
      id: 'img1',
      name: 'mockup.png',
      dataUrl: 'data:image/png;base64,xxxx',
      altText: 'UI screen mockup',
      fileSize: 1024 * 100,
      fileType: 'image/png',
    };
    expect(ImageAssetInputSchema.safeParse(validPng).success).toBe(true);

    const invalidPdf = {
      id: 'img2',
      name: 'doc.pdf',
      dataUrl: 'data:application/pdf;base64,xxxx',
      altText: 'Document PDF',
      fileSize: 1024 * 100,
      fileType: 'application/pdf',
    };
    const result = ImageAssetInputSchema.safeParse(invalidPdf);
    expect(result.success).toBe(false);
  });

  it('rejects image files exceeding 5MB limit', () => {
    const oversizedImage = {
      id: 'img-huge',
      name: 'huge.jpg',
      dataUrl: 'data:image/jpeg;base64,xxxx',
      altText: 'Huge banner',
      fileSize: 6 * 1024 * 1024, // 6MB
      fileType: 'image/jpeg',
    };
    const result = ImageAssetInputSchema.safeParse(oversizedImage);
    expect(result.success).toBe(false);
  });

  it('validates full report project structure', () => {
    const project = {
      id: 'proj-1',
      title: 'Customer Portal Modernization',
      reportingPeriod: '5–9 October 2026',
      rawNotes: 'Sprint completed.',
      metrics: [],
      images: [],
      cards: [
        {
          id: 'card-1',
          type: 'executive_summary' as const,
          title: 'Executive Summary',
          summary: 'All goals met.',
          keyAccomplishments: ['Built profile page'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      lastSavedAt: new Date().toISOString(),
    };

    const res = ReportProjectSchema.safeParse(project);
    expect(res.success).toBe(true);
  });
});
