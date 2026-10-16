/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportProject } from '../../types/report';
import { ReportProjectSchema } from '../../schemas/reportSchema';
import { logger } from '../logger';

const STORAGE_KEY = 'project_reporting_builder_draft_v1';

export function saveLocalDraft(project: ReportProject): boolean {
  try {
    const dataToSave = {
      ...project,
      lastSavedAt: new Date().toISOString(),
      isDirty: false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    return true;
  } catch (err) {
    logger.error('Failed to save draft to localStorage:', err);
    return false;
  }
}

export function loadLocalDraft(): ReportProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const validated = ReportProjectSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data as ReportProject;
    } else {
      logger.warn('Local draft failed schema validation, resetting corrupted draft:', validated.error);
      return null;
    }
  } catch (err) {
    logger.error('Failed to parse local draft:', err);
    return null;
  }
}

export function clearLocalDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    logger.error('Failed to clear draft:', err);
  }
}
