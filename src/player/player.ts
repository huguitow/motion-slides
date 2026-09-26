import { autoplayNext, stopDurationMs, withAutoplayMeta } from '../deck/autoplay';
import { applyBlank, type Blank } from '../deck/blank';
import { exportFileName } from '../deck/embed';
import { viewportPoint, type StagePoint } from '../deck/fit';
import { jumpInput } from '../deck/jump';
import { actionForKeyEvent, type PlayerAction } from '../deck/keymap';
import { carryPosition, first, goTo, last, next, prev, type Position } from '../deck/navigation';
import { DeckParseError, parseDeck } from '../deck/parse';
import type { Deck } from '../deck/types';
import { validateDeck } from '../deck/validate';
import { ICONS } from '../ui/icons';
import { createAutoplay } from './autoplay';
import { exportPresentation, ExportUnavailableError } from './export';
import { watchFile } from './file-watch';
import { openOverview, type OverviewHandle } from './overview';
import { createOverlays } from './player-overlays';
import { createIssuesPanel, createPlayerDom, createToast, issuesCount, renderHud, watchIdle } from './player-ui';
import { createPresenterLink } from './presenter-link';
import { printDeck } from './print';
import { createRetouchPanel } from './retouch-panel';
import { Stage } from './stage';
import { bindSwipe } from './touch';
import { createLaserPointer, createRemoteDot } from '../ui/laser';

/** The file a deck was read from. */
export interface DeckFile {
  readonly source: string;
  readonly name: string;
  /** When given, the file is watched and the deck reloads each time it changes on disk. */
  readonly handle?: FileSystemFileHandle;
}

export interface PlayerOptions {
  readonly file: DeckFile;
  readonly onExit: () => void;
  /** Called after the deck was reloaded from its file. */
  readonly onDeckChange?: (deck: Deck) => void;
  /** Where to start, e.g. where a recent deck was left; clamped to the deck. */
  readonly startAt?: Position;
  /** Called after every move, to remember where the presentation is. */
  readonly onPositionChange?: (position: Position) => void;
}

export interface PlayerHandle {
  destroy(): void;
}

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

const stepsOf = (deck: Deck) => deck.slides.map((slide) => slide.steps);

/** Mounts a full-window presentation of `initialDeck` (parsed from `options.file`) inside `host`. */
export function mountPlayer(host: HTMLElement, initialDeck: Deck, options: PlayerOptions): PlayerHandle {
  // Replaced as a whole when the file is reloaded.
  let deck = initialDeck;
  let source = options.file.source;
  let steps = stepsOf(deck);
  let position: Position = options.startAt ? carryPosition(options.startAt, steps) : first();
  let jumpBuffer = '';
  let overview: OverviewHandle | null = null;
  let stopWatching: (() => void) | null = null;
  let blank: Blank = 'none';

  const dom = createPlayerDom();
  host.append(dom.element);
  const stage = new Stage(dom.viewport, () => position.step);
  const toast = createToast(dom.toast);
  const overlays = createOverlays(dom.element, () => perform(blank === 'black' ? 'black' : 'white'));
  const laser = createLaserPointer({ surface: dom.shield, layer: dom.element });
  const remoteDot = createRemoteDot(dom.element);
  const swipe = bindSwipe(dom.shield, (action) => perform(action));
  const presenter = createPresenterLink({
    deck: () => deck,
    position: () => position,
    blank: () => blank,
    autoplay: () => (autoplay.isRunning() ? autoplay.seconds() : null),
    onAction: (action) => perform(action),
    onLaser: (point) => remoteDot.show(point && toPlayerPixels(point)),
  });

  /** A stage position from the presenter window, in pixels of the player where the dot is drawn. */
  const toPlayerPixels = (point: StagePoint) => {
    const viewport = dom.viewport.getBoundingClientRect();
    const player = dom.element.getBoundingClientRect();
    const inViewport = viewportPoint(point, viewport.width, viewport.height);
    return { x: viewport.left - player.left + inViewport.x, y: viewport.top - player.top + inViewport.y };
  };
  const issues = createIssuesPanel(dom, toast);
  const retouch = createRetouchPanel(dom, toast, () => ({
    fileName: options.file.name,
    source,
    deck,
    position,
    isLive: stopWatching !== null,
  }));

  const autoplay = createAutoplay({
    bar: dom.autoplayBar,
    durationMs: () => stopDurationMs(deck.slides[position.slide], autoplay.seconds()),
    onAdvance: () => moveTo(autoplayNext(position, steps)),
    onChange: () => {
      renderAutoplayControls();
      presenter.publishAutoplay();
    },
  });

  const renderAutoplayControls = () => {
    const running = autoplay.isRunning();
    dom.autoplayToggle.innerHTML = running ? ICONS.pause : ICONS.play;
    dom.autoplayToggle.setAttribute('aria-pressed', String(running));
    dom.autoplaySeconds.textContent = `${autoplay.seconds()} s`;
  };

  /**
   * A kiosk deck auto-advances on its own. Only a change of its meta (first load, or a live edit
   * adding or removing it) starts or stops it, so a kiosk deck paused by hand stays paused on reload.
   */
  function applyKiosk(previous: Deck['autoplay']): void {
    const kiosk = deck.autoplay === 'loop';
    dom.element.classList.toggle('is-kiosk', kiosk);
    if (kiosk === (previous === 'loop')) return;
    if (kiosk && !autoplay.isRunning()) autoplay.start();
    if (!kiosk && autoplay.isRunning()) autoplay.toggle();
  }

  const moveTo = (target: Position) => {
    if (target === position) return;
    const direction = target.slide >= position.slide ? 'forward' : 'backward';
    position = target;
    stage.display(deck, position, deck.slides[position.slide].transition, direction);
    presenter.publish(position);
    renderHud(dom, deck, position);
    retouch.refresh();
    // Moving by hand restarts the countdown rather than stopping auto-advance.
    autoplay.restart();
    options.onPositionChange?.(position);
  };

  /** Swaps in a new version of the file, staying on the same slide and build when they still exist. */
  const reload = (text: string) => {
    let reloaded: Deck;
    try {
      reloaded = parseDeck(text);
    } catch (error) {
      if (!(error instanceof DeckParseError)) console.error(error);
      toast.show('Fichier modifié mais illisible : la version précédente reste affichée.');
      return;
    }
    const previousAutoplay = deck.autoplay;
    deck = reloaded;
    source = text;
    steps = stepsOf(deck);
    position = carryPosition(position, steps);
    options.onPositionChange?.(position);
    closeOverview();
    stage.invalidate();
    stage.display(deck, position, 'none', 'forward');
    autoplay.restart();
    applyKiosk(previousAutoplay);
    presenter.republish();
    renderHud(dom, deck, position);
    retouch.refresh();
    const found = validateDeck(text);
    issues.update(found);
    options.onDeckChange?.(deck);
    toast.show(found.length > 0 ? `Deck mis à jour · ${issuesCount(found.length)}` : 'Deck mis à jour.');
  };

  const follow = (handle: FileSystemFileHandle) => {
    dom.live.hidden = false;
    stopWatching = watchFile(handle, {
      onChange: reload,
      onLost: () => {
        stopWatching = null;
        dom.live.hidden = true;
        toast.show('Fichier introuvable : la mise à jour en direct est coupée.');
      },
    });
  };

  const closeOverview = () => {
    overview?.destroy();
    overview = null;
    dom.element.classList.remove('has-overview');
  };

  // Only reachable while the overview is closed: when open, it receives every key itself.
  const showOverview = () => {
    retouch.close();
    dom.element.classList.add('has-overview');
    overview = openOverview(dom.element, deck, position.slide, {
      onSelect: (index) => {
        closeOverview();
        moveTo(goTo(index, steps));
      },
      onClose: closeOverview,
    });
  };

  /** Every key, click and remote action goes through here, so a blank screen can swallow it. */
  const perform = (action: PlayerAction) => {
    const outcome = applyBlank(blank, action);
    if (outcome.blank !== blank) {
      blank = outcome.blank;
      // Nothing may stay open under a blank screen and capture the key meant to bring the slide back.
      if (blank !== 'none') {
        closeOverview();
        retouch.close();
        overlays.closeHelp();
      }
      overlays.setBlank(blank);
      presenter.publishBlank();
    }
    if (outcome.action) run(outcome.action);
  };

  const run = (action: PlayerAction) => {
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
      case 'export':
        return exportStandalone();
      case 'retouch':
        return retouch.toggle();
      case 'laser':
        return toast.show(laser.toggle() ? 'Pointeur laser activé (L pour l’éteindre)' : 'Pointeur laser désactivé');
      case 'autoplay':
        autoplay.toggle();
        return toast.show(
          autoplay.isRunning()
            ? `Défilement automatique : ${autoplay.seconds()} s par étape, en boucle (A pour arrêter)`
            : 'Défilement automatique arrêté',
        );
      case 'help':
        return overlays.toggleHelp();
      case 'black':
      case 'white':
        return; // Handled by applyBlank in perform().
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

  /** A single .html file with the player and the deck as it is now (reloaded version included). */
  const exportStandalone = () => {
    // Exported while auto-advancing: the file becomes a kiosk presentation that loops on its own.
    const kiosk = autoplay.isRunning();
    const exported = kiosk ? withAutoplayMeta(source) : source;
    exportPresentation({ source: exported, title: deck.title, fileName: options.file.name })
      .then(() => {
        const name = exportFileName(options.file.name);
        toast.show(kiosk ? `Exportée en mode kiosque (défilement en boucle) : ${name}` : `Présentation exportée : ${name}`);
      })
      .catch((error: unknown) => {
        if (error instanceof ExportUnavailableError) return toast.show(error.message);
        console.error(error);
        toast.show('Export impossible.');
      });
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
    // Already handled on its way up, e.g. Escape closing the retouch panel: it must not also exit.
    if (event.defaultPrevented) return;
    // While the retouch panel is open, keys inside it are its own, and Escape closes it rather than the player.
    if (retouch.isOpen()) {
      if (event.target instanceof Node && dom.retouchPanel.contains(event.target)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        return retouch.close();
      }
    }
    if (overlays.isHelpOpen() && event.key === 'Escape') {
      event.preventDefault();
      return overlays.closeHelp();
    }
    // Ctrl+P prints the whole deck rather than a screenshot of the current slide.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      return exportPdf();
    }
    // On a blank screen any key brings the slide back, except a lone modifier (Ctrl shows the laser).
    if (blank !== 'none' && !MODIFIER_KEYS.has(event.key)) {
      event.preventDefault();
      return perform(actionForKeyEvent(event) ?? 'next');
    }
    // Combinations belong to the browser, but Ctrl+arrows still navigate while pointing with Ctrl held.
    if (event.ctrlKey || event.metaKey || event.altKey) return routeAction(event);
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
    const action = actionForKeyEvent(event);
    if (!action) return;
    event.preventDefault();
    perform(action);
  };

  dom.shield.addEventListener('click', () => {
    if (!swipe.consumeClick()) perform('next');
  });
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

  dom.autoplaySeconds.addEventListener('click', () => {
    const seconds = autoplay.cycleSeconds();
    renderAutoplayControls();
    toast.show(`${seconds} s par étape (sauf les slides qui fixent leur durée)`);
  });
  // Anything covering the slide holds the countdown: blank screen, overview, retouch panel, help.
  // They open and close in several places, so their visibility is watched rather than each call site.
  const syncAutoplayPause = () =>
    autoplay.setPaused(blank !== 'none' || overview !== null || retouch.isOpen() || overlays.isHelpOpen());
  const pauseWatch = new MutationObserver(syncAutoplayPause);
  pauseWatch.observe(dom.element, { attributes: true, attributeFilter: ['hidden', 'class'], subtree: true });

  stage.display(deck, position, deck.slides[position.slide].transition, 'forward');
  renderHud(dom, deck, position);
  const found = validateDeck(source);
  issues.update(found);
  if (found.length > 0) toast.show(`${issuesCount(found.length)} dans ce fichier : clique sur ⚠ pour les voir.`);
  else if (position.slide > 0 || position.step > 0) {
    toast.show(`Repris à la slide ${position.slide + 1} · Début pour revenir au début`);
  }
  if (options.file.handle) follow(options.file.handle);
  renderAutoplayControls();
  applyKiosk(undefined);

  return {
    destroy() {
      stopWatching?.();
      stopWatching = null;
      autoplay.destroy();
      pauseWatch.disconnect();
      laser.destroy();
      remoteDot.destroy();
      swipe.destroy();
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
