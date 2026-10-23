import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { ProjectLibrary } from '../src/types/report';

// Only preferences are seeded. Projects, notes, cards and snapshots are created via UI.
test.use({ actionTimeout: 10_000, storageState: { cookies: [], origins: [{
  origin: 'http://127.0.0.1:3100', localStorage: [
    { name: 'prb.tourSeen', value: 'true' }, { name: 'prb.locale', value: 'en' },
  ],
}] } });

const latency = 'Average API response time';
const passage = 'Average API response time is 220 ms against target 200 ms.';

class DemoJourney {
  constructor(readonly page: Page) {}
  get cards() { return this.page.getByRole('article'); }
  get draft() { return this.page.getByRole('textbox', { name: 'Add a project update', exact: true }); }
  card(name: string) { return this.page.getByRole('article', { name: `${name} card`, exact: true }); }
  button(name: string) { return this.page.getByRole('button', { name, exact: true }); }

  async openDemo() {
    await this.button('Open demo').click();
    await expect(this.cards).toHaveCount(8);
    await expect(this.page.getByRole('listitem').filter({ hasText: 'Week 40 baseline' })).toHaveCount(1);
  }

  async review(text: string, name: string, value: string) {
    await this.draft.fill(text);
    await this.button('Review update').click();
    await expect(this.page.getByRole('heading', { name: 'Review findings', exact: true })).toBeVisible();
    await this.page.getByRole('textbox', { name: 'Metric name', exact: true }).fill(name);
    await this.page.getByRole('spinbutton', { name: 'Metric value', exact: true }).fill(value);
    await this.button('Add 1 findings').click();
    await expect(this.draft).toHaveValue('');
  }

  async metric(name: string, value: string) {
    await expect(this.card(name)).toHaveCount(1);
    await expect(this.card(name).getByRole('button', { name: 'Edit metric value', exact: true })).toHaveText(value);
  }

  async edit(name: string, field: string, value: string) {
    const card = this.card(name);
    await card.getByRole('button', { name: `Edit ${field}`, exact: true }).click();
    const input = card.getByRole('textbox', { name: field, exact: true });
    await input.fill(value);
    await input.press('Tab');
  }

  async screenshot(info: TestInfo, name: string) {
    await info.attach(name, { body: await this.page.screenshot({
      path: info.outputPath(`${name}.png`), fullPage: true,
    }), contentType: 'image/png' });
  }

  async compare(snapshot: string) {
    await this.page.getByRole('listitem').filter({ hasText: snapshot })
      .getByRole('button', { name: 'Compare', exact: true }).click();
    return this.page.getByRole('dialog', { name: "What's Changed? (Snapshot Diff)", exact: true });
  }

  async download(format: string, info: TestInfo, filename: string) {
    await this.button(format).click();
    const pending = this.page.waitForEvent('download');
    await this.page.getByRole('dialog').getByRole('button', { name: 'Download', exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    const path = info.outputPath(filename);
    await download.saveAs(path);
    await info.attach(filename, { path, contentType: filename.endsWith('.json') ? 'application/json' : 'text/markdown' });
    return readFile(path, 'utf8');
  }
}

test.beforeEach(async ({ page }) => { await page.goto('/'); });

// Assertion-only reads: all project and metric changes go through the UI.
async function persistedLibrary(page: Page): Promise<ProjectLibrary> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('project_reporting_builder_library_v1') ?? 'null'));
}

test('under-five-minute demo: isolated project, reviewed correction, persistence, snapshots and full exports', async ({ page }, info) => {
  test.setTimeout(180_000);
  const started = Date.now();
  const demo = new DemoJourney(page);
  await test.step('Preserve a real user-created project when opening a new fictional demo', async () => {
    await demo.button('Project').click();
    await page.getByRole('textbox', { name: 'Project title', exact: true }).fill('E2E existing user project');
    await demo.button('Toggle project source notes').click();
    await page.getByRole('textbox', { name: 'Edit project source notes', exact: true }).fill('Private user context — preserve exactly.');
    await demo.button('Close source notes').click();
    await demo.openDemo();
    await page.getByRole('button', { name: /^E2E existing user project \d/ }).click();
    await expect(demo.cards).toHaveCount(0);
    await demo.button('Toggle project source notes').click();
    await expect(page.getByRole('textbox', { name: 'Edit project source notes', exact: true })).toHaveValue('Private user context — preserve exactly.');
    await demo.openDemo();
  });

  await test.step('Inspect all six card types and original notes, then review a 220 ms correction', async () => {
    for (const name of ['Executive Summary', 'Sprint completion', 'Open critical defects', latency,
      'Open Defects & Validation Blocker', 'Next Steps & Immediate Action Items', 'Milestone',
      'Media: customer-portal-profile-mockup']) await expect(demo.card(name)).toBeVisible();
    await demo.metric('Sprint completion', '85');
    await demo.metric('Open critical defects', '3');
    await demo.metric(latency, '240');
    await demo.button('Toggle project source notes').click();
    const notes = page.getByRole('textbox', { name: 'Edit project source notes', exact: true });
    await expect(notes).toBeEditable();
    await expect(notes).toHaveValue(/240/);
    await demo.button('Close source notes').click();
    await demo.button('Use fictional KPI update').click();
    await expect(demo.draft).toHaveValue(passage);
    await demo.button('Review update').click();
    await expect(page.getByRole('spinbutton', { name: 'Metric value', exact: true })).toHaveValue('220');
    await page.getByRole('textbox', { name: 'Metric name', exact: true }).fill(latency);
    await demo.button('Add 1 findings').click();
    await demo.metric(latency, '220');
    await expect(demo.cards).toHaveCount(8);
    await demo.screenshot(info, '01-reviewed-220');
  });

  const explanation = 'Reviewed staging latency: 220 ms; target remains 200 ms. Release date is unconfirmed.';
  await test.step('Edit a card, refresh without duplication, inspect honest readiness and original evidence', async () => {
    await demo.edit(latency, 'metric explanation', explanation);
    await demo.button('Refresh report').click();
    await demo.metric(latency, '220');
    await expect(demo.cards).toHaveCount(8);
    await expect(demo.card(latency).getByRole('button', { name: 'Edit metric explanation', exact: true })).toHaveText(explanation);
    await demo.card(latency).getByRole('button', { name: 'Show source reference', exact: true }).click();
    await expect(demo.card(latency)).toContainText(passage);
    await expect(demo.card(latency)).toContainText('factual accuracy has not been independently verified');
    await page.getByRole('button', { name: /^Executive readiness/ }).click();
    await expect(page.getByText('Report completeness only—not factual accuracy or project delivery health. Missing facts require your input.', { exact: true })).toBeVisible();
    await expect(page.getByText('Report notes release date is unconfirmed. Senior leaders will ask about timeline dependencies.', { exact: true })).toBeVisible();
    await demo.screenshot(info, '02-readiness-and-source');
    await page.getByRole('button', { name: /^Executive readiness/ }).click();
    await expect(demo.card('Executive Summary')).toContainText('release date has not yet been confirmed');
  });

  await test.step('Compare baseline 260 → 220, save a named snapshot, edit and compare a new delta', async () => {
    const diff = await demo.compare('Week 40 baseline');
    await expect(diff).toContainText(/Average API response time\s*Baseline: 260ms → Current: 220ms/);
    await expect(diff).toContainText('-40ms');
    await expect(diff).toContainText('absence from this report does not confirm the risk is resolved');
    await demo.screenshot(info, '03-baseline-delta');
    await demo.button('Close diff dialog').click();
    await demo.button('Save').click();
    await page.getByRole('textbox', { name: 'Snapshot name', exact: true }).fill('E2E reviewed 220 checkpoint');
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();
    await expect(page.getByRole('listitem').filter({ hasText: 'E2E reviewed 220 checkpoint' })).toHaveCount(1);
    await demo.edit(latency, 'metric value', '210');
    await demo.button('Refresh report').click();
    const changed = await demo.compare('E2E reviewed 220 checkpoint');
    await expect(changed).toContainText(/Average API response time\s*Baseline: 220ms → Current: 210ms/);
    await expect(changed).toContainText('-10ms');
    await demo.screenshot(info, '04-checkpoint-delta');
    await demo.button('Close diff dialog').click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
    await page.reload();
    await demo.metric(latency, '210');
    await expect(demo.cards).toHaveCount(8);
    await expect(demo.card(latency)).toContainText(explanation);
    const persisted = await demo.compare('E2E reviewed 220 checkpoint');
    await expect(persisted).toContainText('Baseline: 220ms → Current: 210ms');
    await demo.button('Close diff dialog').click();
  });

  await test.step('Header Share downloads the entire current report as JSON and Markdown', async () => {
    // A selected card must not silently turn a header Share into a partial report.
    await demo.card(latency).getByRole('checkbox').check();
    await demo.button('Share').click();
    const defaultJson = JSON.parse(await demo.download('Structured JSON', info, 'header-default-report.json'));
    expect.soft(defaultJson.cards, 'Header Share should default to the full report, even with a card selected').toHaveLength(8);
    const defaultMarkdown = await demo.download('Markdown (.md)', info, 'header-default-report.md');
    expect.soft(defaultMarkdown, 'Header Share Markdown should include unselected cards').toContain('Sprint completion');
    await demo.button('All (8)').click();
    const json = JSON.parse(await demo.download('Structured JSON', info, 'current-report.json'));
    expect(json.cards).toHaveLength(8);
    expect(new Set(json.cards.map((card: { type: string }) => card.type)).size).toBe(6);
    const metrics = json.cards.filter((card: { type: string }) => card.type === 'kpi_metric');
    expect(metrics).toHaveLength(3);
    expect(metrics.find((card: { content: { label: string } }) => card.content.label === latency))
      .toMatchObject({ content: { value: 210, explanation } });
    expect.soft(json.metricsSummary.find((metric: { name: string }) => metric.name === latency),
      'Structured JSON summary must agree with the currently edited card')
      .toMatchObject({ value: 210, explanation });
    const markdown = await demo.download('Markdown (.md)', info, 'current-report.md');
    for (const card of json.cards) expect(markdown).toContain(card.title);
    expect(markdown).toMatch(/210\s*ms/);
    expect(markdown).toContain(explanation);
    await demo.screenshot(info, '05-full-report-share');
  });
  const durationMs = Date.now() - started;
  await info.attach('journey-timing', { body: JSON.stringify({ durationMs, budgetMs: 300_000 }), contentType: 'application/json' });
  expect(durationMs, 'Scripted demo duration must stay below five minutes').toBeLessThan(300_000);
});

test('two sequential reviewed KPIs survive context-only notes, refresh and reload without overwriting', async ({ page }, info) => {
  const demo = new DemoJourney(page);
  await demo.openDemo();
  await demo.review(passage, latency, '220');
  await demo.review('Sprint completion is 90% against target 100%.', 'Sprint completion', '90');
  await demo.metric(latency, '220');
  await demo.metric('Sprint completion', '90');
  await demo.metric('Open critical defects', '3');
  await expect(demo.cards).toHaveCount(8);
  const before = await demo.cards.allTextContents();
  const context = 'Stakeholders discussed the workshop agenda; this is background context only.';
  await demo.draft.fill(context);
  await demo.button('Review update').click();
  await demo.button('Keep as context').click();
  expect(await demo.cards.allTextContents()).toEqual(before);
  await demo.button('Toggle project source notes').click();
  await expect(page.getByRole('textbox', { name: 'Edit project source notes', exact: true })).toHaveValue(new RegExp(context));
  await demo.button('Close source notes').click();
  await demo.button('Refresh report').click();
  await expect(demo.cards).toHaveCount(8);
  await demo.metric(latency, '220');
  await demo.metric('Sprint completion', '90');
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.reload();
  await demo.metric(latency, '220');
  await demo.metric('Sprint completion', '90');
  await demo.screenshot(info, 'sequential-kpis-context-persisted');
});

test('empty project and metric quick-add reject blank and nonfinite values', async ({ page }, info) => {
  const demo = new DemoJourney(page);
  await demo.button('Project').click();
  await expect(demo.cards).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Your next report starts here', exact: true })).toBeVisible();
  await expect(demo.button('Build report')).toBeDisabled();
  await expect(page.getByText('No snapshots yet.', { exact: false })).toBeVisible();
  await demo.button('Attach').click();
  await page.getByRole('button', { name: /^Add metric/ }).hover();
  await page.getByRole('menuitem', { name: 'Number Big value', exact: true }).click();
  await expect(page.getByText('No metrics yet — add your first one below.', { exact: true })).toBeVisible();
  const name = page.getByPlaceholder('Metric name *', { exact: true });
  const value = page.getByPlaceholder('Value *', { exact: true });
  await demo.button('Add ⏎').click();
  await expect(page.getByText('Metric name is required', { exact: true })).toBeVisible();
  await name.fill('Invalid metric');
  for (const invalid of ['', '1e309']) {
    await value.fill(invalid);
    await demo.button('Add ⏎').click();
    await expect(page.getByRole('textbox', { name: 'Metric name', exact: true })).toHaveCount(0);
    await expect(demo.cards).toHaveCount(0);
  }
  await demo.screenshot(info, 'invalid-quick-add');
});

for (const invalid of ['', '1e309']) {
  test(`reviewed metric rejects ${invalid ? 'nonfinite' : 'blank'} value without fabricating zero`, async ({ page }, info) => {
    const demo = new DemoJourney(page);
    await demo.openDemo();
    await demo.button('Use fictional KPI update').click();
    await demo.button('Review update').click();
    await page.getByRole('spinbutton', { name: 'Metric value', exact: true }).fill(invalid);
    await demo.screenshot(info, `${invalid ? 'nonfinite' : 'blank'}-reviewed-value`);
    await demo.button('Add 1 findings').click();
    await expect(demo.card(latency).getByRole('button', { name: 'Edit metric value', exact: true }),
      'Invalid reviewed input must not replace the existing 240 ms metric with zero').toHaveText('240');
    await expect(page.getByRole('heading', { name: 'Review findings', exact: true })).toBeVisible();
  });
}

test('opening demo clears previous-project undo history and preserves unique valid library projects', async ({ page }, info) => {
  const demo = new DemoJourney(page);
  const title = 'E2E undo isolation project';
  const notes = 'Private previous-project context must remain intact.';
  await demo.button('Project').click();
  await page.getByRole('textbox', { name: 'Project title', exact: true }).fill(title);
  await demo.button('Toggle project source notes').click();
  await page.getByRole('textbox', { name: 'Edit project source notes', exact: true }).fill(notes);
  await demo.button('Close source notes').click();
  await demo.review('Previous project delivery is 75% against target 100%.', 'Previous project delivery', '75');
  await demo.metric('Previous project delivery', '75');
  const undo = page.getByRole('banner').getByRole('button', { name: 'Undo', exact: true });
  await expect(undo, 'Setup must create undoable history before crossing projects').toBeEnabled();
  await expect.poll(async () => (await persistedLibrary(page))?.projects.find(project => project.title === title))
    .toMatchObject({ title, rawNotes: expect.stringContaining(notes), cards: [expect.objectContaining({ value: 75 })] });
  const before = await persistedLibrary(page);
  const original = before.projects.find(project => project.id === before.activeProjectId)!;

  await demo.openDemo();
  await expect(undo).toBeDisabled();
  // The keyboard path must not resurrect history even though the header is disabled.
  await page.keyboard.press('ControlOrMeta+z');
  await demo.metric(latency, '240');
  await expect(page.getByRole('textbox', { name: 'Project title', exact: true })).not.toHaveValue(title);
  await expect.poll(async () => (await persistedLibrary(page))?.projects.length).toBe(before.projects.length + 1);
  const after = await persistedLibrary(page);
  const ids = after.projects.map(project => project.id);
  expect(new Set(ids).size, 'Project IDs must remain unique after attempted cross-project undo').toBe(ids.length);
  expect(ids).toContain(after.activeProjectId);
  expect(after.activeProjectId).not.toBe(original.id);
  expect(after.projects.find(project => project.id === original.id)).toEqual(original);

  await page.reload();
  await demo.metric(latency, '240');
  await page.getByRole('button', { name: new RegExp(`^${title} \\d`) }).click();
  await demo.metric('Previous project delivery', '75');
  await expect(demo.cards).toHaveCount(1);
  await demo.button('Toggle project source notes').click();
  await expect(page.getByRole('textbox', { name: 'Edit project source notes', exact: true }))
    .toHaveValue(original.rawNotes);
  await demo.screenshot(info, 'previous-project-intact-after-demo-undo');
});

test('structured KPI correction after review survives refresh with manual source and earlier evidence', async ({ page }, info) => {
  const demo = new DemoJourney(page);
  await demo.openDemo();
  await demo.review(passage, latency, '220');
  await demo.metric(latency, '220');
  await demo.button('Attach').click();
  await page.getByRole('button', { name: /^Add metric/ }).hover();
  await page.getByRole('menuitem', { name: 'Number Big value', exact: true }).click();
  // The existing sheet labels each field; select the row by its named checkbox,
  // not an index that could silently edit another KPI when metric order changes.
  const row = page.getByRole('checkbox', { name: `Select metric ${latency}`, exact: true }).locator('..');
  await expect(row.getByRole('textbox', { name: 'Metric name', exact: true })).toHaveValue(latency);
  const value = row.getByRole('spinbutton', { name: 'Metric value', exact: true });
  await expect(value).toHaveValue('220');
  await value.fill('190');
  await demo.button('Close metrics').click();
  await demo.metric(latency, '190');
  await expect(demo.card(latency).getByText('On Track', { exact: true })).toBeVisible();
  await demo.button('Refresh report').click();
  await demo.metric(latency, '190');
  await expect(demo.card(latency).getByText('On Track', { exact: true })).toBeVisible();
  await expect(demo.cards).toHaveCount(8);
  await expect.poll(async () => {
    const library = await persistedLibrary(page);
    return library?.projects.find(project => project.id === library.activeProjectId)?.metrics.find(metric => metric.name === latency)?.value;
  }).toBe(190);
  await page.reload();
  await demo.metric(latency, '190');
  await expect(demo.card(latency).getByText('On Track', { exact: true })).toBeVisible();
  await expect(demo.cards).toHaveCount(8);
  await demo.card(latency).getByRole('button', { name: 'Show source reference', exact: true }).click();
  await expect(demo.card(latency)).toContainText(`${latency}: 190ms`);
  await expect(demo.card(latency)).toContainText(passage);
  await demo.screenshot(info, 'structured-190-manual-source');

  // Direct card edits must recompute status in both directions without a refresh.
  await demo.edit(latency, 'metric value', '220');
  await expect(demo.card(latency).getByText('Attention', { exact: true })).toBeVisible();
  await expect(demo.card(latency).getByText('On Track', { exact: true })).toHaveCount(0);
  await demo.edit(latency, 'metric value', '190');
  await expect(demo.card(latency).getByText('On Track', { exact: true })).toBeVisible();
  await expect(demo.card(latency).getByText('Attention', { exact: true })).toHaveCount(0);
  await demo.button('Refresh report').click();
  await demo.metric(latency, '190');
  await expect(demo.card(latency).getByText('On Track', { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const library = await persistedLibrary(page);
    return library?.projects.find(project => project.id === library.activeProjectId)?.cards
      .find(card => card.type === 'kpi_metric' && card.label === latency);
  }).toMatchObject({ value: 190, trend: 'improving' });
  await page.reload();
  await demo.metric(latency, '190');
  await expect(demo.card(latency).getByText('On Track', { exact: true })).toBeVisible();

  await demo.button('Share').click();
  const json = JSON.parse(await demo.download('Structured JSON', info, 'structured-correction-report.json'));
  expect(json.cards).toHaveLength(8);
  const metrics = json.cards.filter((card: { type: string }) => card.type === 'kpi_metric');
  const corrected = metrics.filter((card: { content: { label: string } }) => card.content.label === latency);
  expect(corrected).toHaveLength(1);
  expect(corrected[0]).toMatchObject({ content: { value: 190 }, sourceRef: {
    confidence: 'manual', passageText: `${latency}: 190ms`, notes: expect.stringContaining(passage),
  } });
  expect(json.metricsSummary.find((metric: { name: string }) => metric.name === latency)).toMatchObject({ value: 190 });
});

test('sequential same-offset risks remain independently editable and deletable after refresh and reload', async ({ page }, info) => {
  const demo = new DemoJourney(page);
  await demo.openDemo();
  // Each separate update starts at offset zero and produces exactly one risk.
  for (const text of ['Procurement blocked.', 'Deployment blocked.']) {
    await demo.draft.fill(text);
    await demo.button('Review update').click();
    await expect(page.getByRole('heading', { name: 'Review findings', exact: true })).toBeVisible();
    await demo.button('Add 1 findings').click();
    await expect(demo.draft).toHaveValue('');
  }
  const procurement = demo.cards.filter({ hasText: 'Procurement blocked.' });
  const deployment = demo.cards.filter({ hasText: 'Deployment blocked.' });
  await expect(procurement).toHaveCount(1);
  await expect(deployment).toHaveCount(1);
  await expect(demo.cards).toHaveCount(10);
  await expect.poll(async () => {
    const library = await persistedLibrary(page);
    const risks = library?.projects.find(project => project.id === library.activeProjectId)?.cards
      .filter(card => card.type === 'risk_blocker' && ['Procurement blocked.', 'Deployment blocked.'].includes(card.description));
    return { count: risks?.length, uniqueIds: new Set(risks?.map(card => card.id)).size,
      offsets: risks?.map(card => card.sourceRef?.startIndex) };
  }).toEqual({ count: 2, uniqueIds: 2, offsets: [0, 0] });

  await procurement.getByRole('button', { name: 'Edit risk title', exact: true }).click();
  const title = procurement.getByRole('textbox', { name: 'risk title', exact: true });
  await title.fill('Procurement escalation');
  await title.press('Tab');
  await expect(demo.card('Procurement escalation')).toHaveCount(1);
  await expect(deployment.getByRole('button', { name: 'Edit risk title', exact: true })).toHaveText('Potential blocker');
  await demo.card('Procurement escalation').getByRole('button', { name: 'Card options', exact: true }).click();
  await demo.card('Procurement escalation').getByRole('button', { name: 'Delete', exact: true }).click();

  const assertRemainingRisk = async () => {
    await expect(procurement).toHaveCount(0);
    await expect(demo.card('Procurement escalation')).toHaveCount(0);
    await expect(deployment).toHaveCount(1);
    await expect(deployment.getByRole('button', { name: 'Edit risk title', exact: true })).toHaveText('Potential blocker');
    await expect(demo.cards).toHaveCount(9);
  };
  await assertRemainingRisk();
  await demo.button('Refresh report').click();
  await assertRemainingRisk();
  await expect.poll(async () => {
    const library = await persistedLibrary(page);
    return library?.projects.find(project => project.id === library.activeProjectId)?.cards.length;
  }).toBe(9);
  await page.reload();
  await assertRemainingRisk();
  await demo.screenshot(info, 'same-offset-risk-survives-independent-delete');
});
