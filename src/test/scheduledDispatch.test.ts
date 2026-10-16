import { describe, expect, it, vi, afterEach } from 'vitest';
import { createSampleProject } from '../lib/sampleData';
import { isScheduleDue, sendScheduledReport } from '../lib/integrations/scheduledDispatch';
import { ReportProject, SendSchedule } from '../types/report';

const schedule: SendSchedule = { enabled: true, scheduledAt: '2026-12-10T09:30:00.000Z', destination: 'slack', status: 'scheduled' };
const project: ReportProject = { ...createSampleProject(), sendSchedule: schedule };

describe('Scheduled dispatch', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('runs once when due, including on reopen, but not early or after completion', () => {
    expect(isScheduleDue(project, Date.parse('2026-12-10T09:29:00Z'))).toBe(false);
    expect(isScheduleDue(project, Date.parse(schedule.scheduledAt))).toBe(true);
    expect(isScheduleDue(project, Date.parse('2026-12-11T09:30:00Z'))).toBe(true);
    for (const status of ['sending', 'sent', 'error'] as const) {
      expect(isScheduleDue({ ...project, sendSchedule: { ...schedule, status } }, Date.parse('2026-12-11T09:30:00Z'))).toBe(false);
    }
    expect(isScheduleDue({ ...project, sendSchedule: { ...schedule, enabled: false } }, Date.parse('2026-12-11T09:30:00Z'))).toBe(false);
  });
  it('does not send without a configured destination', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await sendScheduledReport(project);
    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
