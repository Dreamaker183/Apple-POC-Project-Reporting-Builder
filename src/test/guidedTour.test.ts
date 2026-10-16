import { describe, expect, it } from 'vitest';
import { buildTourSteps } from '../components/guided-demo/tourSteps';
import { dictionaries, en, LOCALES } from '../lib/i18n/dictionaries';

import type { TourStepActions } from '../components/guided-demo/tourSteps';

describe('Guided Tour i18n localization', () => {
  const mockActions: TourStepActions = {
    onLoadSample: () => {},
    setMobileArea: () => {},
    setTourStepIndex: () => {},
    onGenerateReport: () => [],
    getProject: () => ({ id: '1', title: 'Test', cards: [], rawNotes: '', metrics: [], images: [], folders: [], createdAt: '', lastSavedAt: '' } as any),
    setInspectedCardId: () => {},
    setHighlightPassage: () => {},
    onApplyAllFixes: () => {},
    setBaselineCards: () => {},
    setIsSnapshotModalOpen: () => {},
    setExportInitialMode: () => {},
    setExportInitialTool: () => {},
    setIsExportOpen: () => {},
    setIsGuidedTourOpen: () => {},
    isSnapshotModalOpen: false,
    isExportOpen: false,
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

  it('provides all snapshot diff and timeflow translation keys across all supported locales', () => {
    const diffKeys = Object.keys(en).filter((k) => k.startsWith('diff.') || k.startsWith('timeflow.'));
    expect(diffKeys.length).toBeGreaterThanOrEqual(40);

    for (const localeObj of LOCALES) {
      const dict = dictionaries[localeObj.id];
      for (const key of diffKeys) {
        expect(dict[key as keyof typeof en], `Missing key ${key} in ${localeObj.id}`).toBeDefined();
        expect(dict[key as keyof typeof en].trim().length).toBeGreaterThan(0);
      }
    }

    expect(dictionaries['zh-Hant']['diff.title']).toBe('變更內容（快照比對）');
    expect(dictionaries['zh-Hans']['diff.title']).toBe('变更内容（快照对比）');
    expect(dictionaries['zh-Hant']['timeflow.history']).toBe('歷史紀錄（{count}）');
    expect(dictionaries['zh-Hans']['timeflow.history']).toBe('历史记录（{count}）');
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

  it('executes step 1 action to load sample with empty cards and advance', () => {
    let loadedWith: [boolean, boolean | undefined] = [false, false];
    let mobileArea = '';
    let stepIndex = -1;

    const actions = {
      ...mockActions,
      onLoadSample: (messy: boolean, emptyCards?: boolean) => {
        loadedWith = [messy, emptyCards];
      },
      setMobileArea: (area: 'projects' | 'canvas') => {
        mobileArea = area;
      },
      setTourStepIndex: (idx: number) => {
        stepIndex = idx;
      },
    };

    const steps = buildTourSteps(actions);
    steps[0].onExecute();

    expect(loadedWith).toEqual([true, true]);
    expect(mobileArea).toBe('canvas');
    expect(stepIndex).toBe(1);
  });

  it('executes step 2 action to generate report cards and inspect blocker card', () => {
    let inspectedId: string | null = null;
    let highlightText: string | undefined = undefined;
    let stepIndex = -1;

    const dummyBlocker = {
      id: 'blocker-1',
      type: 'risk_blocker' as const,
      title: 'Payment blocker',
      summary: 'Payment callback issue',
      description: 'Payment callback issue',
      severity: 'critical' as const,
      isBlocker: true,
      sourceRef: { passageText: 'Payment callback issue blocking validation', confidence: 'explicit' as const },
      createdAt: '',
      updatedAt: '',
    };

    const actions = {
      ...mockActions,
      onGenerateReport: () => [dummyBlocker],
      setInspectedCardId: (id: string | null) => {
        inspectedId = id;
      },
      setHighlightPassage: (passage: { start?: number; end?: number; text?: string } | null) => {
        highlightText = passage?.text;
      },
      setTourStepIndex: (idx: number) => {
        stepIndex = idx;
      },
    };

    const steps = buildTourSteps(actions);
    steps[1].onExecute();

    expect(inspectedId).toBe('blocker-1');
    expect(highlightText).toBe('Payment callback issue blocking validation');
    expect(stepIndex).toBe(2);
  });

  it('executes step 3 action to apply fixes and advance to comparison', () => {
    let fixesApplied = false;
    let stepIndex = -1;

    const actions = {
      ...mockActions,
      onApplyAllFixes: () => {
        fixesApplied = true;
      },
      setTourStepIndex: (idx: number) => {
        stepIndex = idx;
      },
    };

    const steps = buildTourSteps(actions);
    steps[2].onExecute();

    expect(fixesApplied).toBe(true);
    expect(stepIndex).toBe(3);
  });

  it('executes step 4 action to open snapshot comparison with baseline, and advance when open', () => {
    let snapshotOpen = false;
    let baselineSet = false;
    let exportOpen = false;
    let stepIndex = -1;

    // First when modal is closed
    const actionsClosed = {
      ...mockActions,
      isSnapshotModalOpen: false,
      setBaselineCards: (cards: any[]) => {
        baselineSet = cards.length > 0;
      },
      setIsSnapshotModalOpen: (open: boolean) => {
        snapshotOpen = open;
      },
      setTourStepIndex: (idx: number) => {
        stepIndex = idx;
      },
    };

    const stepsClosed = buildTourSteps(actionsClosed);
    expect(stepsClosed[3].actionLabel).toBe('Compare report versions');
    stepsClosed[3].onExecute();
    expect(baselineSet).toBe(true);
    expect(snapshotOpen).toBe(true);

    // Next when modal is already open
    const actionsOpen = {
      ...mockActions,
      isSnapshotModalOpen: true,
      setIsSnapshotModalOpen: (open: boolean) => {
        snapshotOpen = open;
      },
      setIsExportOpen: (open: boolean) => {
        exportOpen = open;
      },
      setTourStepIndex: (idx: number) => {
        stepIndex = idx;
      },
    };

    const stepsOpen = buildTourSteps(actionsOpen);
    expect(stepsOpen[3].actionLabel).toBe('Explore export formats');
    stepsOpen[3].onExecute();
    expect(snapshotOpen).toBe(false);
    expect(exportOpen).toBe(true);
    expect(stepIndex).toBe(4);
  });

  it('executes step 6 action to switch to slack preview and finish tour', () => {
    let mode = '';
    let tool = '';
    let exportOpen = false;
    let tourOpen = true;

    const actions = {
      ...mockActions,
      setExportInitialMode: (m: 'formats' | 'tools') => {
        mode = m;
      },
      setExportInitialTool: (t: any) => {
        tool = t;
      },
      setIsExportOpen: (open: boolean) => {
        exportOpen = open;
      },
      setIsGuidedTourOpen: (open: boolean) => {
        tourOpen = open;
      },
    };

    const steps = buildTourSteps(actions);
    expect(steps[5].actionLabel).toBe('Finish tour');
    steps[5].onExecute();
    expect(mode).toBe('tools');
    expect(tool).toBe('slack');
    expect(exportOpen).toBe(true);
    expect(tourOpen).toBe(false);
  });
});
