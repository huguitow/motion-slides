import { fitStage } from '../deck/fit';
import type { PlayerMessage } from '../deck/runtime';
import type { Transition } from '../deck/types';

export type Direction = 'forward' | 'backward';

const TRANSITION_MS = 550;
const REMOVAL_MARGIN_MS = 100;
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Renders slides into sandboxed iframes on a fixed 1920×1080 canvas scaled to the viewport.
 * A new iframe is created each time a slide is entered, so its animations always start fresh.
 */
export class Stage {
  private readonly canvas: HTMLDivElement;
  private readonly resizeObserver: ResizeObserver;
  private current: HTMLIFrameElement | null = null;
  private pending: HTMLIFrameElement | null = null;

  /** `currentStep` is read when a slide finishes loading, so fast key presses are never lost. */
  constructor(
    private readonly viewport: HTMLElement,
    private readonly currentStep: () => number,
  ) {
    this.canvas = document.createElement('div');
    this.canvas.className = 'stage-canvas';
    viewport.append(this.canvas);
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(viewport);
    this.fit();
  }

  show(documentHtml: string, slideIndex: number, transition: Transition, direction: Direction): void {
    this.pending?.remove();

    const frame = document.createElement('iframe');
    frame.className = 'stage-frame';
    frame.sandbox.add('allow-scripts');
    frame.tabIndex = -1;
    frame.title = `Slide ${slideIndex + 1}`;
    frame.dataset.slide = String(slideIndex);
    frame.style.opacity = '0';
    frame.addEventListener('load', () => this.promote(frame, transition, direction), { once: true });
    frame.srcdoc = documentHtml;

    this.pending = frame;
    this.canvas.append(frame);
  }

  /** Plays a build inside the slide that is on screen. Ignored while that slide is still loading. */
  setStep(slideIndex: number, step: number): void {
    if (this.current?.dataset.slide === String(slideIndex)) {
      post(this.current, { type: 'deck:step', step });
    }
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.canvas.remove();
    this.current = null;
    this.pending = null;
  }

  private promote(frame: HTMLIFrameElement, transition: Transition, direction: Direction): void {
    if (this.pending !== frame) return;
    this.pending = null;

    // Fast navigation: frames still animating out would stack up as ghosts, drop them now.
    this.canvas.querySelectorAll('.stage-frame.is-leaving').forEach((stale) => stale.remove());

    const previous = this.current;
    this.current = frame;
    post(frame, { type: 'deck:enter', step: this.currentStep() });

    const effective = prefersReducedMotion() ? 'none' : transition;
    frame.style.opacity = '';
    frame.animate(enterKeyframes(effective, direction), { duration: TRANSITION_MS, easing: EASE_OUT });

    if (!previous) return;
    post(previous, { type: 'deck:leave' });
    previous.classList.add('is-leaving');
    previous.animate(exitKeyframes(effective, direction), {
      duration: TRANSITION_MS,
      easing: EASE_OUT,
      fill: 'forwards',
    });
    // A timer rather than `animation.finished`: that promise only settles when the page renders,
    // so it can hang in a hidden tab and leave the old slide behind.
    window.setTimeout(() => previous.remove(), TRANSITION_MS + REMOVAL_MARGIN_MS);
  }

  private fit(): void {
    const { scale, offsetX, offsetY } = fitStage(this.viewport.clientWidth, this.viewport.clientHeight);
    this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  }
}

function post(frame: HTMLIFrameElement, message: PlayerMessage): void {
  // Sandboxed frames have an opaque origin, so '*' is the only target that reaches them.
  frame.contentWindow?.postMessage(message, '*');
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function enterKeyframes(transition: Transition, direction: Direction): Keyframe[] {
  const sign = direction === 'forward' ? 1 : -1;
  switch (transition) {
    case 'fade':
      return [{ opacity: 0 }, { opacity: 1 }];
    case 'slide':
      return [{ transform: `translateX(${sign * 100}%)` }, { transform: 'translateX(0)' }];
    case 'none':
      return [];
  }
}

function exitKeyframes(transition: Transition, direction: Direction): Keyframe[] {
  const sign = direction === 'forward' ? 1 : -1;
  switch (transition) {
    case 'fade':
      return [{ opacity: 1 }, { opacity: 0 }];
    case 'slide':
      return [{ transform: 'translateX(0)' }, { transform: `translateX(${sign * -30}%)`, opacity: 0.4 }];
    case 'none':
      return [{ opacity: 0 }, { opacity: 0 }];
  }
}
