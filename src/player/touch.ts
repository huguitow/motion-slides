import { detectSwipe, type PointerSample } from '../deck/swipe';

/** The click a browser may still fire after a swipe arrives right after it. */
const CLICK_AFTER_SWIPE_MS = 400;

export interface SwipeHandle {
  /** True (once) when a click is the tail of a swipe and must not also advance. */
  consumeClick(): boolean;
  destroy(): void;
}

/** Horizontal swipes on a touch screen: to the left advances, to the right goes back. */
export function bindSwipe(surface: HTMLElement, onSwipe: (action: 'next' | 'prev') => void): SwipeHandle {
  let start: PointerSample | null = null;
  let swipedAt = -Infinity;

  const sample = (event: PointerEvent): PointerSample => ({ x: event.clientX, y: event.clientY, time: event.timeStamp });
  const onDown = (event: PointerEvent) => {
    start = event.pointerType === 'touch' && event.isPrimary ? sample(event) : null;
  };
  const onUp = (event: PointerEvent) => {
    if (!start || event.pointerType !== 'touch') return;
    const action = detectSwipe(start, sample(event));
    start = null;
    if (!action) return;
    swipedAt = event.timeStamp;
    onSwipe(action);
  };
  const onCancel = () => (start = null);

  surface.addEventListener('pointerdown', onDown);
  surface.addEventListener('pointerup', onUp);
  surface.addEventListener('pointercancel', onCancel);

  return {
    consumeClick() {
      const isTail = performance.now() - swipedAt < CLICK_AFTER_SWIPE_MS;
      swipedAt = -Infinity;
      return isTail;
    },
    destroy() {
      surface.removeEventListener('pointerdown', onDown);
      surface.removeEventListener('pointerup', onUp);
      surface.removeEventListener('pointercancel', onCancel);
    },
  };
}
