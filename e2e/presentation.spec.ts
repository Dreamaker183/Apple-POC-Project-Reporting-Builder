import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { SLIDES } from '../src/components/presentation/navigation';

const websiteSlides = ['workspace', 'library', 'capture', 'source', 'readiness', 'snapshots', 'export'];
const storageSeed = [
  { name: 'prb.locale', value: 'zh-Hant' },
  { name: 'e2e.workspace.sentinel', value: '{"preserve":"existing workspace data"}' },
];
const observations = new WeakMap<Page, { errors: string[]; mutations: unknown[] }>();

type StorageProbe = Window & typeof globalThis & {
  __pocStorage: { before: Record<string, string>; mutations: unknown[]; pending: Promise<unknown>[] };
  __recordPocStorageMutation: (mutation: unknown) => Promise<unknown>;
};

test.use({ storageState: {
  cookies: [],
  origins: [{ origin: 'http://127.0.0.1:3100', localStorage: storageSeed }],
} });

class Presentation {
  constructor(readonly page: Page) {}

  get stage() { return this.page.locator('.keynote-slide'); }
  get picker() { return this.page.getByRole('button', { name: 'Choose a slide', exact: true }); }
  get dialog() { return this.page.getByRole('dialog', { name: 'Choose a slide', exact: true }); }
  get annotations() { return this.page.getByRole('button', { name: 'Show website annotations', exact: true }); }

  async open(index = 0) {
    await this.page.goto(`/poc#${SLIDES[index].id}`);
    await this.assertSlide(index);
  }

  async assertSlide(index: number, hash = true) {
    const { id, label } = SLIDES[index];
    if (hash) await expect(this.page).toHaveURL(new RegExp(`/poc#${id}$`));
    await expect(this.page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(this.page.getByRole('heading', { level: 1, name: label, exact: true })).toBeAttached();
    await expect(this.page.getByRole('region', { name: `Slide ${index + 1}: ${label}`, exact: true })).toBeVisible();
    await expect(this.stage).toHaveCSS('opacity', '1');
    await expect(this.picker).toHaveText(`${String(index + 1).padStart(2, '0')} / 12`);
    await expect(this.page.getByRole('button', { name: 'Previous slide', exact: true })).toBeEnabled({ enabled: index > 0 });
    await expect(this.page.getByRole('button', { name: 'Next slide', exact: true })).toBeEnabled({ enabled: index < SLIDES.length - 1 });
  }

  async choose(index: number) {
    await this.picker.click();
    await expect(this.picker).toHaveAttribute('aria-expanded', 'true');
    await expect(this.dialog).toBeVisible();
    // A native dialog's intrinsic height can exceed its inset constraints.
    // Fail on the inaccessible container instead of timing out on a later click.
    await expect.poll(() => this.dialog.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    }), { message: 'Slide chooser must fit the viewport so overflow can scroll internally' }).toBe(true);
    const { label, chapter } = SLIDES[index];
    await this.dialog.getByRole('button', {
      name: `${String(index + 1).padStart(2, '0')} ${label} ${chapter}`, exact: true,
    }).click();
    await expect(this.dialog).toHaveCount(0);
    await expect(this.picker).toHaveAttribute('aria-expanded', 'false');
    await this.assertSlide(index);
  }

  async loadedImages() {
    await this.page.evaluate(() => document.fonts.ready);
    const urls = await this.stage.locator('img, svg image').evaluateAll(elements => elements.map(element =>
      element instanceof HTMLImageElement ? element.getAttribute('src') : element.getAttribute('href')));
    for (const url of urls) {
      expect(url, 'Screenshot must be an original public/poc PNG').toMatch(/^\/poc\/[\w-]+\.png$/);
      // SVG <image> has no HTMLImageElement.complete/naturalWidth. Decode its actual
      // href in-browser as well as asserting HTTP status and PNG content type.
      const response = await this.page.request.get(url!);
      expect(response.ok(), `Screenshot response: ${url}`).toBe(true);
      expect(response.headers()['content-type']).toContain('image/png');
      const image = await this.page.evaluate(async source => {
        const img = new Image();
        img.src = source;
        await img.decode();
        return { width: img.naturalWidth, height: img.naturalHeight };
      }, url!);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
    }
    await expect.poll(() => this.stage.locator('img').evaluateAll(images =>
      images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
    return urls;
  }

  async screenshot(info: TestInfo, name: string) {
    await this.loadedImages();
    await info.attach(name, {
      body: await this.page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true }),
      contentType: 'image/png',
    });
  }

  async assertFit() {
    // Wait for ResizeObserver to fit the *content box*, not just for visibility.
    await expect.poll(() => this.page.evaluate(() => {
      const viewport = document.querySelector<HTMLElement>('.deck-viewport')!;
      const stage = document.querySelector<HTMLElement>('.keynote-slide')!;
      const css = getComputedStyle(viewport);
      const expected = Math.min(
        (viewport.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight)) / 1600,
        (viewport.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom)) / 900,
      );
      return Math.abs(stage.getBoundingClientRect().width / 1600 - expected);
    })).toBeLessThan(0.001);
    const geometry = await this.page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>('.keynote-slide')!;
      const fit = document.querySelector<HTMLElement>('.deck-fit')!.getBoundingClientRect();
      const rect = stage.getBoundingClientRect();
      const matrix = new DOMMatrix(getComputedStyle(stage).transform);
      const controls = document.querySelector('.deck-controls')!.getBoundingClientRect();
      return {
        logical: [stage.offsetWidth, stage.offsetHeight], ratio: rect.width / rect.height,
        scale: [matrix.a, matrix.d], skew: [matrix.b, matrix.c],
        fitDelta: [Math.abs(fit.width - rect.width), Math.abs(fit.height - rect.height)],
        bounds: [rect.left, rect.top, innerWidth - rect.right, controls.top - rect.bottom],
        overflow: [document.documentElement.scrollWidth - innerWidth,
          document.documentElement.scrollHeight - innerHeight, document.body.scrollWidth - innerWidth],
      };
    });
    expect(geometry.logical).toEqual([1600, 900]);
    expect(geometry.ratio).toBeCloseTo(16 / 9, 5);
    expect(geometry.scale[0]).toBeGreaterThan(0);
    expect(geometry.scale[0]).toBeCloseTo(geometry.scale[1], 6);
    expect(geometry.skew).toEqual([0, 0]);
    for (const delta of geometry.fitDelta) expect(delta).toBeLessThan(1);
    for (const margin of geometry.bounds) expect(margin).toBeGreaterThanOrEqual(-1);
    for (const overflow of geometry.overflow) expect(overflow).toBeLessThanOrEqual(1);
    await expect(this.page.getByRole('complementary')).toHaveCount(0);
  }
}

// Report in unscaled stage coordinates. SVG screenshot viewBoxes and card-crop
// images intentionally crop source pixels; do not exempt their captions or text.
async function layoutAudit(page: Page) {
  return page.locator('.keynote-slide').evaluate(stage => {
    const root = stage.getBoundingClientRect();
    const scale = root.width / 1600;
    const bounds = (rect: DOMRect) => ({
      x: (rect.left - root.left) / scale, y: (rect.top - root.top) / scale,
      right: (rect.right - root.left) / scale, bottom: (rect.bottom - root.top) / scale,
    });
    const clipped: unknown[] = [];
    for (const element of stage.querySelectorAll<HTMLElement>('*')) {
      if (element.namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
          element.closest('.sr-only') || element.matches('.card-crop img')) continue;
      const rect = bounds(element.getBoundingClientRect());
      if (rect.right <= rect.x || rect.bottom <= rect.y) continue;
      if (rect.x < -1 || rect.y < -1 || rect.right > 1601 || rect.bottom > 901) {
        clipped.push({ element: element.className || element.tagName, text: element.textContent?.slice(0, 100), ...rect });
      }
      if (!element.matches('.card-crop') && (element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1) && getComputedStyle(element).overflow === 'hidden') {
        clipped.push({ element: element.className, reason: 'hidden content overflow', ...rect });
      }
    }
    // Use rendered text ranges as well as box bounds, so overflowing line boxes
    // cannot silently escape a fixed-height container.
    const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.trim() || node.parentElement?.closest('svg, .sr-only')) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const line of range.getClientRects()) {
        const rect = bounds(line);
        if (rect.x < -1 || rect.y < -1 || rect.right > 1601 || rect.bottom > 901) {
          clipped.push({ text: node.textContent, reason: 'text outside stage', ...rect });
        }
      }
    }
    const selector = '.slide-heading, .slide-title > span, .slide-title h2, .slide-title > p, .vision-title, .vision-screenshot, .vision-persona, ' +
      '.vision-story, .vision-values, .website-capture, .website-callout, .component-caption, ' +
      '.component-gallery, .slide-takeaway, .slide-footer, .architecture-browser, .architecture-details, ' +
      '.metrics-table, .pilot-plan, .roadmap-columns, .roadmap-constraints, .roadmap-decision';
    const panels = [...stage.querySelectorAll<HTMLElement>(selector)];
    const label = (element: Element) => element.getAttribute('class') || `${element.parentElement?.className} > ${element.tagName}`;
    const panelBounds = (element: Element) => {
      // Titles occupy full-width layout boxes, but only their text can obscure
      // another panel. Avoid flagging whitespace alongside a short subtitle.
      if (element.parentElement?.matches('.slide-title')) {
        const range = document.createRange();
        range.selectNodeContents(element);
        return bounds(range.getBoundingClientRect());
      }
      return bounds(element.getBoundingClientRect());
    };
    const overlaps: unknown[] = [];
    for (const [index, first] of panels.entries()) {
      for (const second of panels.slice(index + 1)) {
        const a = panelBounds(first);
        const b = panelBounds(second);
        const width = Math.min(a.right, b.right) - Math.max(a.x, b.x);
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
        if (width > 1 && height > 1) overlaps.push({
          first: label(first), second: label(second), width, height,
          text: [first.textContent?.slice(0, 80), second.textContent?.slice(0, 80)],
        });
      }
    }
    const crops = [...stage.querySelectorAll<HTMLImageElement>('.card-crop img')].map(img => {
      const image = bounds(img.getBoundingClientRect());
      const frame = bounds(img.parentElement!.getBoundingClientRect());
      return { source: img.getAttribute('src'), croppedBottom: Math.max(0, image.bottom - frame.bottom) };
    });
    return { clipped, overlaps, intentionalImageCrops: crops };
  });
}

test.beforeEach(async ({ page }) => {
  const state = { errors: [] as string[], mutations: [] as unknown[] };
  observations.set(page, state);
  page.on('pageerror', error => state.errors.push(error.message));
  // Keep a cross-document log, including writes immediately before a reload or
  // workspace navigation. Workspace itself is allowed to persist its own state.
  await page.exposeBinding('__recordPocStorageMutation', (_, mutation: unknown) => { state.mutations.push(mutation); });
  await page.addInitScript(() => {
    if (location.pathname.replace(/\/$/, '') !== '/poc') return;
    const probe = window as StorageProbe;
    const snapshot = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)!]));
    probe.__pocStorage = { before: snapshot(), mutations: [], pending: [] };
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function (...args: string[]) {
        if (this === localStorage) {
          const mutation = { method, key: args[0], url: location.href };
          probe.__pocStorage.mutations.push(mutation);
          probe.__pocStorage.pending.push(probe.__recordPocStorageMutation(mutation));
        }
        return Reflect.apply(original, this, args);
      } });
    }
  });
});

test.afterEach(async ({ page }, info) => {
  if (new URL(page.url()).pathname === '/poc') {
    const storage = await page.evaluate(async () => {
      const probe = (window as StorageProbe).__pocStorage;
      await Promise.all(probe.pending);
      return { before: probe.before, after: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)!])) };
    });
    expect.soft(storage.after, 'Presentation preserves every localStorage value').toEqual(storage.before);
  }
  const state = observations.get(page)!;
  await info.attach('browser-observations', { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
  expect.soft(state.mutations, 'Presentation never calls localStorage setItem/removeItem/clear').toEqual([]);
  expect.soft(state.errors, 'Unhandled browser exceptions').toEqual([]);
});

test('12-slide chooser, next/previous, original screenshots and desktop captures', async ({ page }, info) => {
  const deck = new Presentation(page);
  await deck.open();
  expect(SLIDES).toHaveLength(12);
  await expect(page).toHaveTitle('Project Reporting Builder — POC Presentation');
  for (const [index, slide] of SLIDES.entries()) {
    await deck.picker.click();
    await expect(deck.dialog.locator('.deck-index-grid').getByRole('button')).toHaveCount(12);
    for (const [choice, entry] of SLIDES.entries()) {
      const button = deck.dialog.getByRole('button', {
        name: `${String(choice + 1).padStart(2, '0')} ${entry.label} ${entry.chapter}`, exact: true,
      });
      await expect(button).toHaveCount(1);
      if (choice === Math.max(0, index - 1)) await expect(button).toHaveAttribute('aria-current', 'step');
    }
    await deck.dialog.getByRole('button', {
      name: `${String(index + 1).padStart(2, '0')} ${slide.label} ${slide.chapter}`, exact: true,
    }).click();
    await expect(deck.dialog).toHaveCount(0);
    await deck.assertSlide(index);
    await deck.assertFit();
    await expect(deck.stage.locator('input, textarea, [contenteditable="true"]')).toHaveCount(0);
    if (websiteSlides.includes(slide.id)) await expect(deck.stage.locator('svg.website-capture image')).toHaveCount(1);
    if (slide.id === 'cards') {
      await expect(deck.stage.locator('img')).toHaveCount(6);
      await expect(deck.stage.locator('figcaption h3')).toHaveText([
        'Executive summary', 'KPI metric', 'Risk & blocker', 'Next steps', 'Milestone', 'Visual update',
      ]);
    }
    await deck.screenshot(info, `desktop-${String(index + 1).padStart(2, '0')}-${slide.id}`);
  }
  for (let index = 10; index >= 0; index--) {
    await page.getByRole('button', { name: 'Previous slide', exact: true }).click();
    await deck.assertSlide(index);
  }
  for (let index = 1; index < SLIDES.length; index++) {
    await page.getByRole('button', { name: 'Next slide', exact: true }).click();
    await deck.assertSlide(index);
  }
});

test('Download PowerPoint saves a complete 12-slide ZIP without navigating away', async ({ page }, info) => {
  const deck = new Presentation(page);
  await deck.open(4); // Preserve a non-default slide, not just the /poc route.
  const url = page.url();
  const anchor = page.getByRole('link', { name: 'Download PowerPoint', exact: true });
  const filename = 'project-reporting-builder-poc.pptx';
  await expect(anchor).toHaveAttribute('download', filename);

  const pendingDownload = page.waitForEvent('download');
  await anchor.click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe(filename);
  const path = info.outputPath(filename);
  await download.saveAs(path);
  expect(await download.failure()).toBeNull();

  // Inspect the browser's actual download, not a separate request or public file.
  const bytes = await readFile(path);
  expect(bytes.length, 'Downloaded PowerPoint must exceed 100 KiB').toBeGreaterThan(100 * 1024);
  expect(bytes.subarray(0, 4).toString('hex'), 'ZIP local-file header').toBe('504b0304');
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  const slides = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  expect(slides.sort()).toEqual(Array.from({ length: 12 }, (_, index) =>
    `ppt/slides/slide${index + 1}.xml`).sort());
  for (const name of slides) {
    expect(await zip.file(name)!.async('string'), name).toMatch(/<p:sld\b/);
  }
  await expect(page).toHaveURL(url);
  await deck.assertSlide(4);
});

test('keyboard traverses all 12 slides and respects boundaries and interactive controls', async ({ page }) => {
  const deck = new Presentation(page);
  await deck.open();
  for (let index = 1; index < SLIDES.length; index++) {
    await page.keyboard.press('ArrowRight');
    await deck.assertSlide(index);
  }
  for (let index = 10; index >= 0; index--) {
    await page.keyboard.press('ArrowLeft');
    await deck.assertSlide(index);
  }
  for (const [key, index] of [
    ['ArrowUp', 0], ['PageUp', 0], ['End', 11], ['ArrowDown', 11],
    ['PageDown', 11], ['Home', 0], ['ArrowDown', 1], ['ArrowUp', 0],
    ['PageDown', 1], ['PageUp', 0], ['Space', 1],
  ] as const) {
    await page.keyboard.press(key);
    await deck.assertSlide(index);
  }
  await deck.picker.focus();
  await page.keyboard.press('ArrowRight');
  await deck.assertSlide(1);
  await page.keyboard.press('Enter');
  await expect(deck.dialog).toBeVisible();
  await page.keyboard.press('End');
  await deck.assertSlide(1);
  await page.keyboard.press('Escape');
  await expect(deck.dialog).toHaveCount(0);
  await deck.picker.click();
  await deck.dialog.getByRole('button', { name: 'Close slide chooser', exact: true }).click();
  await expect(deck.picker).toHaveAttribute('aria-expanded', 'false');
});

for (const viewport of [
  { width: 1440, height: 1000 }, { width: 320, height: 844 },
  { width: 390, height: 844 }, { width: 844, height: 390 },
]) {
  test(`chooser focus containment/restoration and toolbar separation at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const deck = new Presentation(page);
    await deck.open();
    const toolbar = page.getByRole('navigation', { name: 'Presentation controls' });
    await expect(toolbar.getByRole('link', { name: 'Download PowerPoint', exact: true })).toBeVisible();
    // The workspace link is intentionally hidden below 380px; audit rendered controls.
    const geometry = await toolbar.locator('a:visible, button:visible').evaluateAll(elements => elements.map(element => ({
      name: element.getAttribute('aria-label') || element.textContent,
      ...element.getBoundingClientRect().toJSON(),
    })));
    await info.attach('toolbar-geometry', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
    for (const [index, first] of geometry.entries()) {
      expect(first.left, `${first.name}: left edge`).toBeGreaterThanOrEqual(0);
      expect(first.right, `${first.name}: right edge`).toBeLessThanOrEqual(viewport.width);
      expect(first.top, `${first.name}: top edge`).toBeGreaterThanOrEqual(0);
      expect(first.bottom, `${first.name}: bottom edge`).toBeLessThanOrEqual(viewport.height);
      expect(first.width, `${first.name}: width`).toBeGreaterThan(0);
      expect(first.height, `${first.name}: height`).toBeGreaterThan(0);
      for (const second of geometry.slice(index + 1)) {
        const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
        const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
        expect(width > 0 && height > 0, `${first.name} overlaps ${second.name}`).toBe(false);
      }
    }
    await deck.picker.click();
    const close = deck.dialog.getByRole('button', { name: 'Close slide chooser', exact: true });
    await expect(close).toBeFocused();
    // Include a full cycle in both directions, not just one Tab from autofocus.
    const count = await deck.dialog.getByRole('button').count();
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let step = 0; step <= count; step++) {
        await page.keyboard.press(key);
        await expect.poll(() => deck.dialog.evaluate(element => {
          // Native dialogs may yield to browser chrome at the tab boundary.
          // That is not focus escaping to an inert control in the document.
          return element.contains(document.activeElement) ||
            (document.activeElement === document.body && !document.hasFocus());
        }), { message: `${key}: focus cannot reach background page controls` }).toBe(true);
      }
    }
    // Programmatic attempts must also be rejected while showModal is active.
    await deck.picker.evaluate(element => element.focus());
    await expect(deck.picker).not.toBeFocused();
    await page.keyboard.press('Escape');
    await expect(deck.dialog).toHaveCount(0);
    await expect(deck.picker).toBeFocused();
    await deck.picker.click();
    await close.click();
    await expect(deck.dialog).toHaveCount(0);
    await expect(deck.picker).toBeFocused();
    // Choosing the current slide restores the invoker; changing slides moves
    // focus to the newly rendered slide heading for announcement.
    await deck.picker.click();
    await deck.dialog.getByRole('button', { name: /^01 Vision & user story / }).click();
    await expect(deck.dialog).toHaveCount(0);
    await expect(deck.picker).toBeFocused();
    await deck.picker.click();
    await deck.dialog.getByRole('button', { name: /^02 Website overview / }).click();
    await expect(deck.dialog).toHaveCount(0);
    await deck.assertSlide(1);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await deck.screenshot(info, `toolbar-${viewport.width}x${viewport.height}`);
  });
}

test('all slide hashes reload and browser back/forward restores selection', async ({ page }) => {
  const deck = new Presentation(page);
  for (const [index] of SLIDES.entries()) {
    await deck.open(index);
    await page.reload();
    await deck.assertSlide(index);
  }
  await deck.open();
  await deck.choose(4);
  await deck.choose(8);
  await page.goBack();
  await deck.assertSlide(4);
  await page.goBack();
  await deck.assertSlide(0);
  await page.goForward();
  await deck.assertSlide(4);
  await page.goto('/poc#unknown-slide');
  await deck.assertSlide(0, false);
});

test('English presentation preserves preexisting zh-Hant and workspace data across interactions', async ({ page, context }) => {
  const deck = new Presentation(page);
  await deck.open();
  const before = (await context.storageState()).origins;
  expect(before[0].localStorage).toEqual(expect.arrayContaining(storageSeed));
  for (const [index] of SLIDES.entries()) {
    await deck.choose(index);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    if (websiteSlides.includes(SLIDES[index].id)) {
      await deck.stage.locator('.website-callout').first().click();
      await deck.annotations.click();
      await deck.annotations.click();
    }
  }
  await page.reload();
  await deck.assertSlide(11);
  expect((await context.storageState()).origins).toEqual(before);
});

for (const id of websiteSlides) {
  test(`${id}: every callout expands/collapses and annotations toggle without changing screenshots`, async ({ page }, info) => {
    const deck = new Presentation(page);
    const index = SLIDES.findIndex(slide => slide.id === id);
    await deck.open(index);
    const sources = await deck.loadedImages();
    const callouts = deck.stage.locator('.website-callout');
    const count = await callouts.count();
    expect(count).toBeGreaterThan(0);
    await expect(deck.annotations).toHaveAttribute('aria-pressed', 'true');
    for (let choice = 0; choice < count; choice++) {
      const callout = callouts.nth(choice);
      await expect(callout).toHaveAttribute('aria-expanded', 'false');
      await expect(callout.locator('.callout-detail')).toHaveCount(0);
      const detail = await callout.getAttribute('title');
      await callout.click();
      await expect(callout).toHaveAttribute('aria-expanded', 'true');
      await expect(callout.locator('.callout-detail')).toHaveText(detail!);
      await expect(callout.locator('.callout-detail')).toBeVisible();
      await page.keyboard.press('ArrowRight'); // Focused callout must not advance the deck.
      await deck.assertSlide(index);
      await deck.screenshot(info, `${id}-callout-${choice + 1}-expanded`);
      await callout.click();
      await expect(callout).toHaveAttribute('aria-expanded', 'false');
      await expect(callout.locator('.callout-detail')).toHaveCount(0);
    }
    await callouts.first().click();
    await callouts.nth(1).click();
    await expect(callouts.first()).toHaveAttribute('aria-expanded', 'false');
    await expect(callouts.nth(1)).toHaveAttribute('aria-expanded', 'true');
    await deck.annotations.click();
    await expect(deck.annotations).toHaveAttribute('aria-pressed', 'false');
    await expect(callouts).toHaveCount(0);
    await expect(deck.stage.locator('.website-markings')).toHaveCount(0);
    expect(await deck.loadedImages()).toEqual(sources);
    await deck.annotations.click();
    await expect(deck.annotations).toHaveAttribute('aria-pressed', 'true');
    await expect(callouts).toHaveCount(count);
    await expect(deck.stage.locator('.website-markings')).toBeVisible();
    await expect(callouts.nth(1)).toHaveAttribute('aria-expanded', 'true');
  });
}

for (const viewport of [
  { width: 1440, height: 1000 }, { width: 1280, height: 720 },
  { width: 320, height: 844 }, { width: 390, height: 844 }, { width: 844, height: 390 },
]) {
  test.describe(`viewport ${viewport.width}x${viewport.height}`, () => {
    test.use({ isMobile: viewport.width < 1000, hasTouch: viewport.width < 1000 });
    test(`fixed 16:9 stage fits and resizes without reflow`, async ({ page }, info) => {
      const deck = new Presentation(page);
      await deck.open();
      // Resize the already-mounted viewport to exercise ResizeObserver itself.
      await page.setViewportSize(viewport);
      for (const [index, slide] of SLIDES.entries()) {
        if (index) await deck.choose(index);
        await deck.assertFit();
        await deck.loadedImages();
        const audit = await layoutAudit(page);
        await info.attach(`${slide.id}-layout`, { body: JSON.stringify(audit, null, 2), contentType: 'application/json' });
        expect.soft(audit.clipped, `${slide.id}: non-cropped content must remain inside stage`).toEqual([]);
      }
      await deck.screenshot(info, `viewport-${viewport.width}x${viewport.height}`);
    });
  });
}

test('desktop layout audit: text, callouts, footnotes and card captions do not overlap', async ({ page }, info) => {
  const deck = new Presentation(page);
  for (const [index, slide] of SLIDES.entries()) {
    await deck.open(index);
    await deck.loadedImages();
    const collapsed = await layoutAudit(page);
    await info.attach(`${slide.id}-collapsed-layout`, { body: JSON.stringify(collapsed, null, 2), contentType: 'application/json' });
    expect.soft(collapsed.overlaps, `${slide.id}: collapsed panel overlap`).toEqual([]);
    const callouts = deck.stage.locator('.website-callout');
    for (let choice = 0; choice < await callouts.count(); choice++) {
      await callouts.nth(choice).click();
      const expanded = await layoutAudit(page);
      await info.attach(`${slide.id}-expanded-${choice + 1}-layout`, { body: JSON.stringify(expanded, null, 2), contentType: 'application/json' });
      expect.soft(expanded.clipped, `${slide.id} callout ${choice + 1}: clipping`).toEqual([]);
      expect.soft(expanded.overlaps, `${slide.id} callout ${choice + 1}: expanded panel overlap`).toEqual([]);
      await callouts.nth(choice).click();
    }
  }
});

test('skip link focuses the current heading without replacing its slide hash', async ({ page }) => {
  const deck = new Presentation(page);
  for (const [index] of SLIDES.entries()) {
    await deck.open(index);
    await page.reload();
    await deck.assertSlide(index);
    // The shell intentionally focuses h1 on mount. Start from the skip link
    // rather than assuming a fresh document starts with body focus.
    const skip = page.getByRole('link', { name: 'Skip to slide', exact: true });
    await skip.focus();
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await deck.assertSlide(index);
  }
});

test('workspace entry and both return links use the original workspace', async ({ page }) => {
  await page.goto('/');
  const entry = page.getByRole('link', { name: 'View POC presentation', exact: true });
  await expect(entry).toHaveAttribute('href', '/poc');
  await entry.click();
  const deck = new Presentation(page);
  await deck.assertSlide(0, false);
  const workspace = page.getByRole('link', { name: 'Open workspace', exact: false });
  await expect(workspace).toHaveAttribute('href', '/');
  await workspace.click();
  await expect(page).toHaveURL('http://127.0.0.1:3100/');
  await expect(entry).toBeVisible();
  await deck.open(11);
  const cta = page.getByRole('link', { name: 'Try the original workspace', exact: true });
  await expect(cta).toHaveAttribute('href', '/');
  await cta.click();
  await expect(page).toHaveURL('http://127.0.0.1:3100/');
  await expect(entry).toBeVisible();
});

test('reduced motion disables animation but preserves the uniform stage scale', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const deck = new Presentation(page);
  await deck.open();
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  for (const [index] of SLIDES.entries()) {
    if (index) await deck.choose(index);
    await deck.assertFit();
    await expect(deck.stage).toHaveCSS('animation-name', 'none');
    expect(await deck.stage.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    const callout = deck.stage.locator('.website-callout').first();
    if (await callout.count()) await expect(callout).toHaveCSS('transition-duration', '0s');
  }
});

test('fullscreen enters/exits with controls and refits the stage when supported', async ({ page }, info) => {
  const deck = new Presentation(page);
  await deck.open();
  test.skip(!await page.evaluate(() => document.fullscreenEnabled), 'Fullscreen API unavailable in this browser');
  await page.getByRole('button', { name: 'Enter full screen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await expect(page.getByRole('button', { name: 'Exit full screen', exact: true })).toBeVisible();
  await deck.assertFit();
  await deck.screenshot(info, 'desktop-fullscreen');
  await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await deck.assertFit();
  await deck.assertSlide(0);
});
