import { first, next, type Position } from '../deck/navigation';
import type { Deck } from '../deck/types';
import { Stage } from '../player/stage';

/** Time spent on a slide's entrance, then on each of its builds. */
const ENTER_DWELL_MS = 3400;
const BUILD_DWELL_MS = 1800;

export interface PreviewElements {
  readonly viewport: HTMLElement;
  readonly timeline: HTMLElement;
  readonly timecode: HTMLElement;
}

export interface PreviewHandle {
  /** Starts playing `deck` from its first slide, in a loop. */
  load(deck: Deck): void;
  destroy(): void;
}

/**
 * A self-running miniature of the player for the home screen: it walks through every build
 * of a deck like an unattended kiosk, with an editing-style timeline and a timecode.
 */
export function mountPreview(elements: PreviewElements): PreviewHandle {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let deck: Deck | null = null;
  let stage: Stage | null = null;
  let position: Position = first();
  let timer = 0;

  const dwell = () => (position.step === 0 ? ENTER_DWELL_MS : BUILD_DWELL_MS);

  const render = () => {
    if (!deck || !stage) return;
    stage.display(deck, position, 'fade', 'forward');
    elements.timecode.textContent = `${pad(position.slide + 1)} / ${pad(deck.slides.length)}`;
    renderTimeline(elements.timeline, deck, position, reducedMotion ? 0 : dwell());
  };

  const advance = () => {
    if (!deck) return;
    const steps = deck.slides.map((slide) => slide.steps);
    const following = next(position, steps);
    // `next` returns the same position at the very end: loop back to the start.
    position = following === position ? first() : following;
    render();
    schedule();
  };

  const schedule = () => {
    window.clearTimeout(timer);
    if (!reducedMotion && !document.hidden) timer = window.setTimeout(advance, dwell());
  };

  const onVisibility = () => (document.hidden ? window.clearTimeout(timer) : schedule());
  document.addEventListener('visibilitychange', onVisibility);

  return {
    load(nextDeck) {
      window.clearTimeout(timer);
      stage?.destroy();
      deck = nextDeck;
      position = reducedMotion ? { slide: 0, step: nextDeck.slides[0].steps } : first();
      stage = new Stage(elements.viewport, () => position.step);
      buildTimeline(elements.timeline, nextDeck);
      render();
      schedule();
    },
    destroy() {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      stage?.destroy();
    },
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** One segment per slide, as wide as its number of builds, like clips on an editing timeline. */
function buildTimeline(timeline: HTMLElement, deck: Deck): void {
  timeline.replaceChildren(
    ...deck.slides.map((slide) => {
      const segment = document.createElement('span');
      segment.className = 'timeline-segment';
      segment.style.flexGrow = String(slide.steps + 1);
      segment.append(document.createElement('i'));
      return segment;
    }),
  );
}

/** Fills past slides and sweeps the current build's share of its segment over `durationMs`. */
function renderTimeline(timeline: HTMLElement, deck: Deck, position: Position, durationMs: number): void {
  [...timeline.children].forEach((segment, index) => {
    const fill = segment.firstElementChild as HTMLElement;
    const parts = deck.slides[index].steps + 1;
    segment.classList.toggle('is-current', index === position.slide);
    if (index !== position.slide) {
      fill.style.transition = 'none';
      fill.style.width = index < position.slide ? '100%' : '0%';
      return;
    }
    fill.style.transition = 'none';
    fill.style.width = `${(position.step / parts) * 100}%`;
    void fill.offsetWidth;
    fill.style.transition = `width ${durationMs}ms linear`;
    fill.style.width = `${((position.step + 1) / parts) * 100}%`;
  });
}
