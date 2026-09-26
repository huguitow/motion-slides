export const TRANSITIONS = ['fade', 'slide', 'none'] as const;
/** Upper bound for `data-steps`. */
export const MAX_STEPS = 99;
export type Transition = (typeof TRANSITIONS)[number];
/** Upper bound for `data-duration`, in seconds. */
export const MAX_DURATION_SECONDS = 3600;

export interface Slide {
  /** Slide markup (styles, content and scripts), without speaker notes. */
  readonly html: string;
  /** Number of on-click builds before moving to the next slide. */
  readonly steps: number;
  /** How this slide appears when it is entered. */
  readonly transition: Transition;
  readonly notes: string;
  /** Seconds each build of this slide stays on screen when auto-advancing; the player's pace when absent. */
  readonly duration?: number;
}

export interface Deck {
  readonly title: string;
  /** Markup injected into the <head> of every slide (fonts, shared CSS variables…). */
  readonly sharedHead: string;
  readonly slides: readonly Slide[];
  /** 'loop': a kiosk deck, which starts auto-advancing on its own and loops. */
  readonly autoplay?: 'loop';
}

/** A valid `data-duration`: more than 0 seconds, at most MAX_DURATION_SECONDS. */
export function isDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_DURATION_SECONDS;
}

/** Reference canvas every slide is authored against, scaled to fit the screen. */
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;
