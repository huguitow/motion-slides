export interface PointerSample {
  readonly x: number;
  readonly y: number;
  /** Milliseconds, from any monotonic clock. */
  readonly time: number;
}

const MIN_DISTANCE_PX = 50;
const MAX_DURATION_MS = 600;
/** The horizontal move must be this many times larger than the vertical one. */
const MIN_HORIZONTAL_RATIO = 1.5;

/** A quick horizontal swipe: to the left advances, to the right goes back. */
export function detectSwipe(start: PointerSample, end: PointerSample): 'next' | 'prev' | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < MIN_DISTANCE_PX) return null;
  if (Math.abs(dx) < Math.abs(dy) * MIN_HORIZONTAL_RATIO) return null;
  if (end.time - start.time > MAX_DURATION_MS) return null;
  return dx < 0 ? 'next' : 'prev';
}
