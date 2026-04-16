/**
 * Canvas Gesture Helpers -- Playwright
 *
 * Reusable gesture primitives for testing canvas/editor UIs with Playwright.
 * Works with ReactFlow, Moveable.js, or any drag/resize/rotate surface that
 * uses `[data-frame-id]` attributes for element identification.
 *
 * Coverage:
 *  - Selection (click / tap / box-select)
 *  - Drag (mouse + touch)
 *  - Resize (drag corner handles)
 *  - Rotate (drag rotation handle in an arc)
 *  - Duplicate / Delete (keyboard shortcuts)
 *  - Pinch-zoom (multi-touch dispatchEvent)
 *  - Swipe (single-finger touch path)
 *  - Long press (touchstart -> pause -> touchend)
 *
 * HOW TO CUSTOMIZE:
 * 1. Update selectors to match your canvas implementation
 * 2. Adjust MOVEABLE_* selectors if using a different drag library
 * 3. Update keyboard shortcuts in duplicate/delete for your app
 *
 * Copied from vercel-ai-dev-kit. Customize for your project.
 */

import type { Page, Locator } from '@playwright/test';

// ---------------------------------------------------------------------------
// Selectors (TODO: update for your canvas implementation)
// ---------------------------------------------------------------------------

export const frameSelector = (frameId: string): string =>
  `[data-frame-id="${frameId}"]`;

export const MOVEABLE_CONTROL_BOX = '.moveable-control-box';
export const MOVEABLE_CONTROL = '.moveable-control';
export const MOVEABLE_ROTATION_CONTROL = '.moveable-rotation-control';

export type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br';

const CORNER_TO_DIRECTION: Record<ResizeCorner, string> = {
  tl: 'nw', tr: 'ne', bl: 'sw', br: 'se',
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export async function getCenter(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('getCenter: locator has no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width, height: box.height };
}

export function getFrameLocator(page: Page, frameId: string): Locator {
  return page.locator(frameSelector(frameId)).first();
}

export async function waitForFrame(page: Page, frameId: string, timeout = 10000): Promise<Locator> {
  const loc = getFrameLocator(page, frameId);
  await loc.waitFor({ state: 'visible', timeout });
  return loc;
}

export async function countFrames(page: Page): Promise<number> {
  return page.locator('[data-frame-id]').count();
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export async function selectCanvasFrame(
  page: Page, frameId: string,
  opts: { modifiers?: Array<'Shift' | 'Meta' | 'Control' | 'Alt'> } = {},
): Promise<void> {
  const frame = await waitForFrame(page, frameId);
  const { x, y } = await getCenter(frame);
  if (opts.modifiers && opts.modifiers.length > 0) {
    for (const m of opts.modifiers) await page.keyboard.down(m);
    await page.mouse.click(x, y);
    for (const m of opts.modifiers) await page.keyboard.up(m);
  } else {
    await page.mouse.click(x, y);
  }
  await page.locator(MOVEABLE_CONTROL_BOX).first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Drag
// ---------------------------------------------------------------------------

export async function dragFrame(page: Page, frameId: string, dx: number, dy: number): Promise<void> {
  await selectCanvasFrame(page, frameId);
  const frame = getFrameLocator(page, frameId);
  const { x, y } = await getCenter(frame);
  await page.mouse.move(x, y);
  await page.mouse.down();
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (dx * i) / steps, y + (dy * i) / steps);
  }
  await page.mouse.up();
}

export async function dragElement(page: Page, locator: Locator, dx: number, dy: number): Promise<void> {
  const { x, y } = await getCenter(locator);
  await page.mouse.move(x, y);
  await page.mouse.down();
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (dx * i) / steps, y + (dy * i) / steps);
  }
  await page.mouse.up();
}

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

export async function resizeFrame(
  page: Page, frameId: string, corner: ResizeCorner, dx: number, dy: number,
): Promise<void> {
  await selectCanvasFrame(page, frameId);
  const direction = CORNER_TO_DIRECTION[corner];
  const handle = page.locator(`${MOVEABLE_CONTROL}[data-direction="${direction}"]`).first();

  let start: { x: number; y: number };
  if (await handle.isVisible().catch(() => false)) {
    start = await getCenter(handle);
  } else {
    const frame = getFrameLocator(page, frameId);
    const box = await frame.boundingBox();
    if (!box) throw new Error(`resizeFrame: frame ${frameId} has no box`);
    start = corner === 'tl' ? { x: box.x, y: box.y }
      : corner === 'tr' ? { x: box.x + box.width, y: box.y }
      : corner === 'bl' ? { x: box.x, y: box.y + box.height }
      : { x: box.x + box.width, y: box.y + box.height };
  }

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(start.x + (dx * i) / steps, start.y + (dy * i) / steps);
  }
  await page.mouse.up();
}

// ---------------------------------------------------------------------------
// Rotate
// ---------------------------------------------------------------------------

export async function rotateFrame(page: Page, frameId: string, degrees: number): Promise<void> {
  await selectCanvasFrame(page, frameId);
  const frame = getFrameLocator(page, frameId);
  const center = await getCenter(frame);
  const handle = page.locator(MOVEABLE_ROTATION_CONTROL).first();
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error(`rotateFrame: no rotation handle visible for frame ${frameId}`);
  const hx = handleBox.x + handleBox.width / 2;
  const hy = handleBox.y + handleBox.height / 2;
  const startAngle = Math.atan2(hy - center.y, hx - center.x);
  const radius = Math.hypot(hx - center.x, hy - center.y);
  const targetAngle = startAngle + (degrees * Math.PI) / 180;

  await page.mouse.move(hx, hy);
  await page.mouse.down();
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    const t = startAngle + ((targetAngle - startAngle) * i) / steps;
    await page.mouse.move(center.x + radius * Math.cos(t), center.y + radius * Math.sin(t));
  }
  await page.mouse.up();
}

// ---------------------------------------------------------------------------
// Duplicate / Delete
// ---------------------------------------------------------------------------

export async function duplicateFrame(page: Page, frameId: string): Promise<void> {
  await selectCanvasFrame(page, frameId);
  const isMac = process.platform === 'darwin';
  await page.keyboard.press(`${isMac ? 'Meta' : 'Control'}+KeyD`);
}

export async function deleteFrame(page: Page, frameId: string): Promise<void> {
  await selectCanvasFrame(page, frameId);
  await page.keyboard.press('Delete');
}

// ---------------------------------------------------------------------------
// Multi-touch / mobile gestures
// ---------------------------------------------------------------------------

export async function pinchZoom(
  page: Page, centerX: number, centerY: number, scale: number,
  opts: { steps?: number; startRadius?: number } = {},
): Promise<void> {
  const steps = opts.steps ?? 10;
  const startRadius = opts.startRadius ?? 50;
  await page.evaluate(
    ({ cx, cy, scale, steps, startRadius }) => {
      const target = document.elementFromPoint(cx, cy) ?? document.documentElement;
      const makeTouch = (id: number, x: number, y: number): Touch =>
        new Touch({ identifier: id, target, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y, radiusX: 10, radiusY: 10, rotationAngle: 0, force: 0.5 });
      const fire = (type: 'touchstart' | 'touchmove' | 'touchend', touches: Touch[]) => {
        target.dispatchEvent(new TouchEvent(type, { cancelable: true, bubbles: true, touches: type === 'touchend' ? [] : touches, targetTouches: type === 'touchend' ? [] : touches, changedTouches: touches }));
      };
      const pos = (r: number): [Touch, Touch] => [makeTouch(1, cx - r, cy), makeTouch(2, cx + r, cy)];
      fire('touchstart', pos(startRadius));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        fire('touchmove', pos(startRadius * (1 + (scale - 1) * t)));
      }
      fire('touchend', pos(startRadius * scale));
    },
    { cx: centerX, cy: centerY, scale, steps, startRadius },
  );
}

export async function swipeCanvas(
  page: Page, fromX: number, fromY: number, toX: number, toY: number, steps = 10,
): Promise<void> {
  await page.evaluate(
    ({ fromX, fromY, toX, toY, steps }) => {
      const target = document.elementFromPoint(fromX, fromY) ?? document.documentElement;
      const makeTouch = (x: number, y: number): Touch =>
        new Touch({ identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y, radiusX: 10, radiusY: 10, rotationAngle: 0, force: 0.5 });
      const fire = (type: 'touchstart' | 'touchmove' | 'touchend', touches: Touch[]) => {
        target.dispatchEvent(new TouchEvent(type, { cancelable: true, bubbles: true, touches: type === 'touchend' ? [] : touches, targetTouches: type === 'touchend' ? [] : touches, changedTouches: touches }));
      };
      fire('touchstart', [makeTouch(fromX, fromY)]);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        fire('touchmove', [makeTouch(fromX + (toX - fromX) * t, fromY + (toY - fromY) * t)]);
      }
      fire('touchend', [makeTouch(toX, toY)]);
    },
    { fromX, fromY, toX, toY, steps },
  );
}

export async function longPress(page: Page, x: number, y: number, duration = 1000): Promise<void> {
  await page.evaluate(
    ({ x, y }) => {
      const target = document.elementFromPoint(x, y) ?? document.documentElement;
      (window as unknown as { __lpTarget?: Element }).__lpTarget = target;
      const touch = new Touch({ identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y, radiusX: 10, radiusY: 10, rotationAngle: 0, force: 0.5 });
      target.dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] }));
    },
    { x, y },
  );
  await page.waitForTimeout(duration);
  await page.evaluate(
    ({ x, y }) => {
      const target = (window as unknown as { __lpTarget?: Element }).__lpTarget ?? document.elementFromPoint(x, y) ?? document.documentElement;
      const touch = new Touch({ identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y, radiusX: 10, radiusY: 10, rotationAngle: 0, force: 0.5 });
      target.dispatchEvent(new TouchEvent('touchend', { cancelable: true, bubbles: true, touches: [], targetTouches: [], changedTouches: [touch] }));
      delete (window as unknown as { __lpTarget?: Element }).__lpTarget;
    },
    { x, y },
  );
}

// ---------------------------------------------------------------------------
// Read frame geometry
// ---------------------------------------------------------------------------

export async function getFrameBox(
  page: Page, frameId: string,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return getFrameLocator(page, frameId).boundingBox();
}
