import type { Position } from '../deck/navigation';
import type { Deck } from '../deck/types';

const IDLE_HIDE_MS = 2500;
const TOAST_MS = 4000;

export type PlayerDom = ReturnType<typeof createPlayerDom>;

export function createPlayerDom(title: string) {
  const element = document.createElement('div');
  element.className = 'player';
  element.innerHTML = `
    <div class="player-viewport"></div>
    <div class="player-shield" aria-hidden="true"></div>
    <div class="player-progress"><div class="player-progress-bar"></div></div>
    <p class="player-toast" role="status" hidden></p>
    <div class="player-hud" role="toolbar" aria-label="Contrôles de la présentation">
      <span class="player-title"></span>
      <span class="player-steps"></span>
      <button type="button" data-action="prev" aria-label="Précédent" title="Précédent (←)">←</button>
      <span class="player-counter"></span>
      <button type="button" data-action="next" aria-label="Suivant" title="Suivant (espace)">→</button>
      <button type="button" data-action="overview" aria-label="Vue d’ensemble" title="Vue d’ensemble (O)">▦</button>
      <button type="button" data-action="presenter" aria-label="Vue présentateur" title="Vue présentateur (P)">◧</button>
      <button type="button" data-action="fullscreen" aria-label="Plein écran" title="Plein écran (F)">⛶</button>
      <button type="button" data-action="exit" aria-label="Fermer" title="Fermer (Échap)">✕</button>
    </div>`;

  const find = <T extends Element>(selector: string) => element.querySelector<T>(selector)!;
  find<HTMLSpanElement>('.player-title').textContent = title;

  return {
    element,
    viewport: find<HTMLDivElement>('.player-viewport'),
    shield: find<HTMLDivElement>('.player-shield'),
    hud: find<HTMLDivElement>('.player-hud'),
    progress: find<HTMLDivElement>('.player-progress-bar'),
    toast: find<HTMLParagraphElement>('.player-toast'),
    counter: find<HTMLSpanElement>('.player-counter'),
    steps: find<HTMLSpanElement>('.player-steps'),
    buttons: [...element.querySelectorAll<HTMLButtonElement>('.player-hud button')],
  };
}

/** Slide counter, build counter and a progress bar that counts every build. */
export function renderHud(dom: PlayerDom, deck: Deck, position: Position): void {
  const steps = deck.slides.map((slide) => slide.steps);
  const slide = deck.slides[position.slide];
  dom.counter.textContent = `${position.slide + 1} / ${deck.slides.length}`;
  dom.steps.textContent = slide.steps > 0 ? `étape ${position.step} / ${slide.steps}` : '';
  const total = steps.reduce((sum, n) => sum + n + 1, 0);
  const done = steps.slice(0, position.slide).reduce((sum, n) => sum + n + 1, 0) + position.step + 1;
  dom.progress.style.transform = `scaleX(${done / total})`;
}

export interface Toast {
  /** Empty text hides it; sticky toasts stay until replaced. */
  show(text: string, sticky?: boolean): void;
  destroy(): void;
}

export function createToast(element: HTMLElement): Toast {
  let timer = 0;
  return {
    show(text, sticky = false) {
      window.clearTimeout(timer);
      element.textContent = text;
      element.hidden = text === '';
      if (text && !sticky) timer = window.setTimeout(() => (element.hidden = true), TOAST_MS);
    },
    destroy: () => window.clearTimeout(timer),
  };
}

/** Adds `is-idle` to `element` (hiding HUD and cursor) after the pointer rests. */
export function watchIdle(element: HTMLElement): () => void {
  let timer = 0;
  const wake = () => {
    element.classList.remove('is-idle');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => element.classList.add('is-idle'), IDLE_HIDE_MS);
  };
  element.addEventListener('pointermove', wake);
  wake();
  return () => {
    element.removeEventListener('pointermove', wake);
    window.clearTimeout(timer);
  };
}
