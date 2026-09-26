import type { PlayerMessage } from '../deck/runtime';
import { buildSlideDocument } from '../deck/slide-document';
import type { Deck } from '../deck/types';
import '../styles/print.css';

/** Lets entrance animations (usually under ~2 s) finish before the page is captured. */
const SETTLE_MS = 2500;
const LOAD_TIMEOUT_MS = 8000;
/** Where window.print() does not block (e.g. Safari), cleanup waits for `afterprint`, at most this long. */
const AFTER_PRINT_FALLBACK_MS = 60_000;
const PRINTING_CLASS = 'is-printing-deck';

/**
 * Exports the deck through the browser's print dialog ("Save as PDF"): one 16:9 page per slide,
 * each at its final build. Pages stay on screen (tiny, under an overlay) while they settle,
 * because browsers throttle animations in off-screen iframes. Aborting `signal` (player closed)
 * removes everything at once and skips the print dialog.
 */
export async function printDeck(deck: Deck, signal: AbortSignal): Promise<void> {
  const container = document.createElement('div');
  container.className = 'print-deck';
  const overlay = document.createElement('div');
  overlay.className = 'print-overlay';
  overlay.textContent = 'Préparation du PDF…';
  document.body.append(container, overlay);

  const cleanup = () => {
    document.documentElement.classList.remove(PRINTING_CLASS);
    container.remove();
    overlay.remove();
  };
  signal.addEventListener('abort', cleanup, { once: true });

  try {
    await Promise.all(deck.slides.map((slide, index) => loadPage(container, deck, index, slide.steps)));
    await delay(SETTLE_MS);
    if (signal.aborted) return;

    overlay.textContent = 'Choisis « Enregistrer au format PDF » dans la fenêtre d’impression.';
    document.documentElement.classList.add(PRINTING_CLASS);
    const printed = afterPrint(signal);
    window.print();
    await printed;
  } finally {
    signal.removeEventListener('abort', cleanup);
    cleanup();
  }
}

/** Resolves once printing is over: on `afterprint`, on abort, or after a fallback delay. */
function afterPrint(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(fallback);
      window.removeEventListener('afterprint', finish);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const fallback = window.setTimeout(finish, AFTER_PRINT_FALLBACK_MS);
    window.addEventListener('afterprint', finish);
    signal.addEventListener('abort', finish);
  });
}

function loadPage(container: HTMLElement, deck: Deck, index: number, step: number): Promise<void> {
  const page = document.createElement('div');
  page.className = 'print-page';
  const frame = document.createElement('iframe');
  frame.sandbox.add('allow-scripts');
  frame.tabIndex = -1;
  frame.title = `Slide ${index + 1}`;
  page.append(frame);
  container.append(page);

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      const enter: PlayerMessage = { type: 'deck:enter', step };
      frame.contentWindow?.postMessage(enter, '*');
      resolve();
    };
    // A slide whose resources never finish loading must not block the export forever.
    const timeout = window.setTimeout(done, LOAD_TIMEOUT_MS);
    frame.addEventListener('load', done, { once: true });
    frame.srcdoc = buildSlideDocument(deck, index, step);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
