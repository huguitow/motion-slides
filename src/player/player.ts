import { actionForKey, type PlayerAction } from '../deck/keymap';
import { first, last, next, prev, type Position } from '../deck/navigation';
import { buildSlideDocument } from '../deck/slide-document';
import type { Deck } from '../deck/types';
import { Stage } from './stage';

const IDLE_HIDE_MS = 2500;

export interface PlayerOptions {
  readonly onExit: () => void;
}

export interface PlayerHandle {
  destroy(): void;
}

/** Mounts a full-window presentation of `deck` inside `host`. */
export function mountPlayer(host: HTMLElement, deck: Deck, options: PlayerOptions): PlayerHandle {
  const steps = deck.slides.map((slide) => slide.steps);
  let position: Position = first();

  const root = createPlayerDom(deck.title);
  host.append(root.element);
  const stage = new Stage(root.viewport, () => position.step);

  const moveTo = (target: Position) => {
    if (target === position) return;
    const from = position;
    position = target;
    if (target.slide === from.slide) {
      stage.setStep(target.slide, target.step);
    } else {
      showSlide(target.slide > from.slide ? 'forward' : 'backward');
    }
    updateHud();
  };

  const showSlide = (direction: 'forward' | 'backward', transition = deck.slides[position.slide].transition) => {
    const html = buildSlideDocument(deck, position.slide, position.step);
    stage.show(html, position.slide, transition, direction);
  };

  const updateHud = () => {
    const slide = deck.slides[position.slide];
    root.counter.textContent = `${position.slide + 1} / ${deck.slides.length}`;
    root.steps.textContent = slide.steps > 0 ? `étape ${position.step} / ${slide.steps}` : '';
    const total = steps.reduce((sum, n) => sum + n + 1, 0);
    const done = steps.slice(0, position.slide).reduce((sum, n) => sum + n + 1, 0) + position.step + 1;
    root.progress.style.transform = `scaleX(${done / total})`;
  };

  const perform = (action: PlayerAction) => {
    switch (action) {
      case 'next':
        return moveTo(next(position, steps));
      case 'prev':
        return moveTo(prev(position, steps));
      case 'first':
        return moveTo(first());
      case 'last':
        return moveTo(last(steps));
      case 'fullscreen':
        return toggleFullscreen(root.element);
      case 'exit':
        if (!document.fullscreenElement) options.onExit();
        return;
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // A HUD button reached with Tab keeps its native Enter/Space activation.
    if (event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' ')) return;
    const action = actionForKey(event.key);
    if (!action) return;
    event.preventDefault();
    perform(action);
  };

  let idleTimer = 0;
  const wake = () => {
    root.element.classList.remove('is-idle');
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => root.element.classList.add('is-idle'), IDLE_HIDE_MS);
  };

  root.shield.addEventListener('click', () => perform('next'));
  root.shield.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    perform('prev');
  });
  root.buttons.prev.addEventListener('click', () => perform('prev'));
  root.buttons.next.addEventListener('click', () => perform('next'));
  root.buttons.fullscreen.addEventListener('click', () => perform('fullscreen'));
  root.buttons.close.addEventListener('click', () => options.onExit());
  // Mouse clicks must not leave focus on a button, or Space would press it again instead of advancing.
  root.hud.addEventListener('pointerdown', (event) => event.preventDefault());
  root.element.addEventListener('pointermove', wake);
  document.addEventListener('keydown', onKeyDown);

  showSlide('forward');
  updateHud();
  wake();

  return {
    destroy() {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(idleTimer);
      if (document.fullscreenElement) void document.exitFullscreen();
      stage.destroy();
      root.element.remove();
    },
  };
}

function toggleFullscreen(element: HTMLElement): void {
  const request = document.fullscreenElement ? document.exitFullscreen() : element.requestFullscreen();
  request.catch((error: unknown) => console.warn('Plein écran indisponible :', error));
}

function createPlayerDom(title: string) {
  const element = document.createElement('div');
  element.className = 'player';
  element.innerHTML = `
    <div class="player-viewport"></div>
    <div class="player-shield" aria-hidden="true"></div>
    <div class="player-progress"><div class="player-progress-bar"></div></div>
    <div class="player-hud" role="toolbar" aria-label="Contrôles de la présentation">
      <span class="player-title"></span>
      <span class="player-steps"></span>
      <button type="button" data-action="prev" aria-label="Précédent" title="Précédent (←)">←</button>
      <span class="player-counter"></span>
      <button type="button" data-action="next" aria-label="Suivant" title="Suivant (espace)">→</button>
      <button type="button" data-action="fullscreen" aria-label="Plein écran" title="Plein écran (F)">⛶</button>
      <button type="button" data-action="close" aria-label="Fermer" title="Fermer (Échap)">✕</button>
    </div>`;

  const find = <T extends Element>(selector: string) => element.querySelector<T>(selector)!;
  find<HTMLSpanElement>('.player-title').textContent = title;

  return {
    element,
    viewport: find<HTMLDivElement>('.player-viewport'),
    shield: find<HTMLDivElement>('.player-shield'),
    hud: find<HTMLDivElement>('.player-hud'),
    progress: find<HTMLDivElement>('.player-progress-bar'),
    counter: find<HTMLSpanElement>('.player-counter'),
    steps: find<HTMLSpanElement>('.player-steps'),
    buttons: {
      prev: find<HTMLButtonElement>('[data-action="prev"]'),
      next: find<HTMLButtonElement>('[data-action="next"]'),
      fullscreen: find<HTMLButtonElement>('[data-action="fullscreen"]'),
      close: find<HTMLButtonElement>('[data-action="close"]'),
    },
  };
}
