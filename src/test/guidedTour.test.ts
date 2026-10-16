import { describe, expect, it } from 'vitest';
import { buildTourSteps } from '../components/guided-demo/tourSteps';
import { dictionaries, en, LOCALES } from '../lib/i18n/dictionaries';

describe('Guided Tour i18n localization', () => {
  const mockActions = {
    onLoadSample: () => {},
    setMobileArea: () => {},
    setTourStepIndex: () => {},
    onGenerateReport: () => {},
    getProject: () => ({ id: '1', title: 'Test', cards: [], rawNotes: '', metrics: [], images: [], folders: [], createdAt: '', lastSavedAt: '' } as any),
    setInspectedCardId: () => {},
    setHighlightPassage: () => {},
    onApplyAllFixes: () => {},
    setIsSnapshotModalOpen: () => {},
    setExportInitialMode: () => {},
    setExportInitialTool: () => {},
    setIsExportOpen: () => {},
    setIsGuidedTourOpen: () => {},
  };

  it('provides all tour translation keys across all supported locales', () => {
    const tourKeys = Object.keys(en).filter((k) => k.startsWith('tour.'));
    expect(tourKeys.length).toBeGreaterThanOrEqual(30);

    for (const localeObj of LOCALES) {
      const dict = dictionaries[localeObj.id];
      for (const key of tourKeys) {
        expect(dict[key as keyof typeof en], `Missing key ${key} in ${localeObj.id}`).toBeDefined();
        expect(dict[key as keyof typeof en].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('translates tour steps when t function is provided for Traditional Chinese', () => {
    const zhHantT = (key: keyof typeof en, vars?: Record<string, string | number>) => {
      let text: string = dictionaries['zh-Hant'][key] ?? en[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    };

    const steps = buildTourSteps(mockActions, zhHantT);
    expect(steps).toHaveLength(6);
    expect(steps[0].title).toBe('從日常進度記錄開始');
    expect(steps[0].badge).toBe('筆記與素材');
    expect(steps[0].actionLabel).toBe('試用範例筆記');
    expect(steps[5].title).toBe('與團隊分享進度更新');
    expect(steps[5].badge).toBe('通訊工具');
  });

  it('translates tour steps when t function is provided for Simplified Chinese', () => {
    const zhHansT = (key: keyof typeof en, vars?: Record<string, string | number>) => {
      let text: string = dictionaries['zh-Hans'][key] ?? en[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    };

    const steps = buildTourSteps(mockActions, zhHansT);
    expect(steps).toHaveLength(6);
    expect(steps[0].title).toBe('从日常进度记录开始');
    expect(steps[0].badge).toBe('笔记与素材');
    expect(steps[0].actionLabel).toBe('体验示例笔记');
    expect(steps[5].title).toBe('与团队分享进度更新');
    expect(steps[5].badge).toBe('通讯工具');
  });

  it('falls back to English when t function is omitted', () => {
    const steps = buildTourSteps(mockActions);
    expect(steps).toHaveLength(6);
    expect(steps[0].title).toBe('Start with your everyday updates');
    expect(steps[0].badge).toBe('Notes & assets');
  });
});
