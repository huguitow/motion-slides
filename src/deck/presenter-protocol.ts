import type { Position } from './navigation';
import { TRANSITIONS, type Deck, type Slide } from './types';

/** Navigation the presenter window may trigger on the audience window. */
export type RemoteAction = 'next' | 'prev' | 'first' | 'last';

/**
 * Messages exchanged over a BroadcastChannel between the audience window and the presenter window.
 * - presenter → audience: `hello` (asks for the state), `action`
 * - audience → presenter: `state` (full deck), `position`, `end`
 */
export type PresenterMessage =
  | { readonly type: 'hello' }
  | { readonly type: 'end' }
  | { readonly type: 'position'; readonly position: Position }
  | { readonly type: 'state'; readonly deck: Deck; readonly position: Position }
  | { readonly type: 'action'; readonly action: RemoteAction };

const REMOTE_ACTIONS: readonly RemoteAction[] = ['next', 'prev', 'first', 'last'];

export function presenterChannelName(id: string): string {
  return `motion-deck:${id}`;
}

/** Validates data received from the channel. Returns null for anything unexpected. */
export function parsePresenterMessage(data: unknown): PresenterMessage | null {
  if (!isRecord(data)) return null;
  switch (data.type) {
    case 'hello':
    case 'end':
      return { type: data.type };
    case 'position':
      return isPosition(data.position) ? { type: 'position', position: data.position } : null;
    case 'state':
      return isDeck(data.deck) && isPosition(data.position) && isInDeck(data.position, data.deck)
        ? { type: 'state', deck: data.deck, position: data.position }
        : null;
    case 'action':
      return REMOTE_ACTIONS.find((action) => action === data.action)
        ? { type: 'action', action: data.action as RemoteAction }
        : null;
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIndex(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isPosition(value: unknown): value is Position {
  return isRecord(value) && isIndex(value.slide) && isIndex(value.step);
}

export function isInDeck(position: Position, deck: Deck): boolean {
  const slide = deck.slides[position.slide];
  return slide !== undefined && position.step <= slide.steps;
}

function isSlide(value: unknown): value is Slide {
  return (
    isRecord(value) &&
    typeof value.html === 'string' &&
    isIndex(value.steps) &&
    TRANSITIONS.some((transition) => transition === value.transition) &&
    typeof value.notes === 'string'
  );
}

function isDeck(value: unknown): value is Deck {
  return (
    isRecord(value) &&
    typeof value.title === 'string' &&
    typeof value.sharedHead === 'string' &&
    Array.isArray(value.slides) &&
    value.slides.length > 0 &&
    value.slides.every(isSlide)
  );
}
