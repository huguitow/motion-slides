import { first, next, type Position } from './navigation';
import type { Slide } from './types';

/** Paces offered by the player, in seconds per build; clicking its button cycles through them. */
export const AUTOPLAY_SECONDS = [5, 8, 15, 30] as const;
export const DEFAULT_AUTOPLAY_SECONDS = 8;

/** How long a build of `slide` stays on screen: its own data-duration, otherwise the player's pace. */
export function stopDurationMs(slide: Slide, seconds: number): number {
  return (slide.duration ?? seconds) * 1000;
}

/** Like pressing Space, except that the very end loops back to the beginning. */
export function autoplayNext(position: Position, steps: readonly number[]): Position {
  const target = next(position, steps);
  return target === position ? first() : target;
}

export function nextAutoplaySeconds(current: number): number {
  const index = AUTOPLAY_SECONDS.findIndex((seconds) => seconds === current);
  return AUTOPLAY_SECONDS[(index + 1) % AUTOPLAY_SECONDS.length];
}

const AUTOPLAY_META = /<meta\b[^>]*\bname\s*=\s*["']deck-autoplay["'][^>]*>/i;
const LOOP_META = '<meta name="deck-autoplay" content="loop">';
const HEAD_OPEN = /<head\b[^>]*>/i;
const DOCTYPE = /^\s*<!doctype[^>]*>/i;

/** The same deck, marked to start on its own and loop (kiosk mode). */
export function withAutoplayMeta(source: string): string {
  // Decided on the parsed page: a slide may show the tag as text, which is not a real meta.
  if (parseDeckAutoplay(source) === 'loop') return source;
  // Only the part before the first slide is edited, for the same reason.
  const slidesStart = source.search(/<template\b/i);
  const before = slidesStart === -1 ? source : source.slice(0, slidesStart);
  const after = source.slice(before.length);
  if (AUTOPLAY_META.test(before)) return before.replace(AUTOPLAY_META, () => LOOP_META) + after;
  return insertMeta(before) + after;
}

function parseDeckAutoplay(source: string): string | undefined {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  return doc.querySelector('meta[name="deck-autoplay"]')?.getAttribute('content')?.trim();
}

/** Right after `<head>`, else after the doctype (which must stay first), else at the very top. */
function insertMeta(html: string): string {
  const anchor = html.match(HEAD_OPEN) ?? html.match(DOCTYPE);
  if (!anchor || anchor.index === undefined) return `${LOOP_META}\n${html}`;
  const end = anchor.index + anchor[0].length;
  return `${html.slice(0, end)}\n${LOOP_META}${html.slice(end)}`;
}
