import type { PlayerAction } from './keymap';

/** A screen blanked in black or white hides the slide, like B and W in PowerPoint's slide show. */
export type Blank = 'none' | 'black' | 'white';

export interface BlankOutcome {
  readonly blank: Blank;
  /** The action to perform afterwards, or null when the key only changed the blank screen. */
  readonly action: PlayerAction | null;
}

export function applyBlank(blank: Blank, action: PlayerAction): BlankOutcome {
  if (action === 'black' || action === 'white') {
    return { blank: blank === action ? 'none' : action, action: null };
  }
  // While blanked, any key brings the slide back without also moving on.
  if (blank !== 'none') return { blank: 'none', action: null };
  return { blank, action };
}
