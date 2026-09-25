export const TRANSITIONS = ['fade', 'slide', 'none'] as const;
export type Transition = (typeof TRANSITIONS)[number];

export interface Slide {
  /** Slide markup (styles, content and scripts), without speaker notes. */
  readonly html: string;
  /** Number of on-click builds before moving to the next slide. */
  readonly steps: number;
  /** How this slide appears when it is entered. */
  readonly transition: Transition;
  readonly notes: string;
}

export interface Deck {
  readonly title: string;
  /** Markup injected into the <head> of every slide (fonts, shared CSS variables…). */
  readonly sharedHead: string;
  readonly slides: readonly Slide[];
}

/** Reference canvas every slide is authored against, scaled to fit the screen. */
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;
