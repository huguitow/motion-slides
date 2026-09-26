import { jumpInput } from '../deck/jump';
import { actionForKey, type PlayerAction } from '../deck/keymap';
import { first, goTo, last, next, prev, type Position } from '../deck/navigation';
import type { Deck } from '../deck/types';
import { openOverview, type OverviewHandle } from './overview';
import type { DeckIssue } from '../deck/validate';
import { bindIssues, createPlayerDom, createToast, renderHud, watchIdle } from './player-ui';
import { createPresenterLink } from './presenter-link';
import { printDeck } from './print';
import { Stage } from './stage';

export interface PlayerOptions {
  readonly onExit: () => void;
  /** Validation warnings shown behind a ⚠ button. */
  readonly issues?: readonly DeckIssue[];
}

export interface PlayerHandle {
  destroy(): void;
}

/** Mounts a full-window presentation of `deck` inside `host`. */
export function mountPlayer(host: HTMLElement, deck: Deck, options: PlayerOptions): PlayerHandle {
  const steps = deck.slides.map((slide) => slide.steps);
  let position: Position = first();
  let jumpBuffer = '';
  let overview: OverviewHandle | null = null;

  const dom = createPlayerDom(deck.title);
  host.append(dom.element);
  const stage = new Stage(dom.viewport, () => position.step);
  const toast = createToast(dom.toast);
  const presenter = createPresenterLink({ deck, position: () => position, onAction: (action) => perform(action) });

  const moveTo = (target: Position) => {
    if (target === position) return;
    const direction = target.slide >= position.slide ? 'forward' : 'backward';
    position = target;
    stage.display(deck, position, deck.slides[position.slide].transition, direction);
    presenter.publish(position);
    renderHud(dom, deck, position);
  };

  const closeOverview = () => {
    overview?.destroy();
    overview = null;
    dom.element.classList.remove('has-overview');
  };

  // Only reachable while the overview is closed: when open, it receives every key itself.
  const showOverview = () => {
    dom.element.classList.add('has-overview');
    overview = openOverview(dom.element, deck, position.slide, {
      onSelect: (index) => {
        closeOverview();
        moveTo(goTo(index, steps));
      },
      onClose: closeOverview,
    });
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
        return toggleFullscreen(dom.element);
      case 'overview':
        return showOverview();
      case 'presenter':
        if (!presenter.open()) toast.show('Fenêtre bloquée : autorise les pop-ups pour ce site.');
        return;
      case 'pdf':
        return exportPdf();
      case 'exit':
        if (!document.fullscreenElement) options.onExit();
        return;
    }
  };

  /** Digits then Enter jump to a slide. Returns true when the key was part of that. */
  const handleJumpKey = (key: string) => {
    const jump = jumpInput(jumpBuffer, key);
    jumpBuffer = jump.buffer;
    toast.show(jumpBuffer ? `Aller à la slide ${jumpBuffer} — Entrée pour valider` : '', true);
    if (jump.target !== undefined) moveTo(goTo(jump.target, steps));
    return jump.handled;
  };

  // Aborted by destroy(): leaving the player mid-export must not leave the overlay or open a print dialog.
  let printing: AbortController | null = null;
  const exportPdf = () => {
    if (printing) return;
    const controller = new AbortController();
    printing = controller;
    printDeck(deck, controller.signal)
      .catch((error: unknown) => {
        console.error(error);
        toast.show('Export PDF impossible.');
      })
      .finally(() => {
        if (printing === controller) printing = null;
      });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    // Ctrl+P prints the whole deck rather than a screenshot of the current slide.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      return exportPdf();
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (overview) {
      if (overview.handleKey(event)) event.preventDefault();
      else routeAction(event);
      return;
    }
    // A HUD button reached with Tab keeps its native Enter/Space activation.
    if (event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' ')) return;
    if (handleJumpKey(event.key)) return event.preventDefault();
    routeAction(event);
  };

  const routeAction = (event: KeyboardEvent) => {
    const action = actionForKey(event.key);
    if (!action) return;
    event.preventDefault();
    perform(action);
  };

  dom.shield.addEventListener('click', () => perform('next'));
  dom.shield.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    perform('prev');
  });
  for (const button of dom.buttons) {
    const action = button.dataset.action as PlayerAction;
    // The close button always leaves; only the Escape key defers to the browser in fullscreen.
    button.addEventListener('click', () => (action === 'exit' ? options.onExit() : perform(action)));
  }
  // Mouse clicks must not leave focus on a button, or Space would press it again instead of advancing.
  dom.hud.addEventListener('pointerdown', (event) => event.preventDefault());
  document.addEventListener('keydown', onKeyDown);
  const stopIdleWatch = watchIdle(dom.element);

  stage.display(deck, position, deck.slides[0].transition, 'forward');
  renderHud(dom, deck, position);
  bindIssues(dom, options.issues ?? [], toast);

  return {
    destroy() {
      document.removeEventListener('keydown', onKeyDown);
      printing?.abort();
      stopIdleWatch();
      toast.destroy();
      if (document.fullscreenElement) void document.exitFullscreen();
      closeOverview();
      presenter.destroy();
      stage.destroy();
      dom.element.remove();
    },
  };
}

function toggleFullscreen(element: HTMLElement): void {
  const request = document.fullscreenElement ? document.exitFullscreen() : element.requestFullscreen();
  request.catch((error: unknown) => console.warn('Plein écran indisponible :', error));
}
