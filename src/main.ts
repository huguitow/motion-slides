import { extractEmbeddedDeck, readEmbeddedDeck } from './deck/embed';
import type { Position } from './deck/navigation';
import { DeckParseError, parseDeck } from './deck/parse';
import type { RecentDeck } from './deck/recents';
import type { Deck } from './deck/types';
import { mountHome, type DeckOrigin, type HomeHandle } from './home/home';
import { rememberDeck, saveRecentPosition } from './home/recents-store';
import { rememberStandaloneShell } from './player/export';
import { mountPlayer, type PlayerHandle } from './player/player';
import { mountPresenter } from './presenter/presenter';
import { ICONS } from './ui/icons';
import './styles/tokens.css';
import './styles/app.css';
import './styles/home.css';

const APP_TITLE = 'Motion Slides';
/** Saving the position on every key press would be wasteful: the last one within this delay wins. */
const POSITION_SAVE_DELAY_MS = 500;

const app = document.querySelector<HTMLElement>('#app')!;

let home: HomeHandle | null = null;
let player: PlayerHandle | null = null;
/** The last write to the recent decks: the home screen lists them once it is done. */
let recentsSaved: Promise<void> = Promise.resolve();

function showHome(errorMessage?: string): void {
  player?.destroy();
  player = null;
  document.title = APP_TITLE;
  home ??= mountHome(app, {
    onDeckSource: (source, fileName, origin) => present(source, fileName, origin),
    onResume: (recent) => void resume(recent),
    recentsSaved,
    examplesUrl: `${import.meta.env.BASE_URL}examples/`,
  });
  if (errorMessage) home.showError(errorMessage);
}

/**
 * Presents a deck. `onExit` defaults to the home screen; an exported presentation has none.
 * Decks opened from a file are remembered among the recent decks, with their position.
 */
function present(
  fileSource: string,
  fileName: string,
  origin: DeckOrigin,
  startAt?: Position,
  onExit: () => void = () => showHome(),
): void {
  // An exported presentation dropped back in: present the deck it carries.
  const source = extractEmbeddedDeck(fileSource) ?? fileSource;
  try {
    const deck = parseDeck(source);
    home?.destroy();
    home = null;
    const setTitle = (shown: Deck) => (document.title = `${shown.title} · ${APP_TITLE}`);
    setTitle(deck);
    const isFile = origin.kind === 'file';
    const handle = isFile ? origin.handle : undefined;
    // Position saves wait for the deck to be recorded: saving a position updates an existing entry.
    const remembered = isFile
      ? (recentsSaved = rememberDeck({
          name: fileName,
          title: deck.title,
          source,
          slideCount: deck.slides.length,
          openedAt: Date.now(),
          position: startAt ?? { slide: 0, step: 0 },
          handle,
        }))
      : null;
    const positions = remembered ? positionSaver(fileName, remembered) : null;
    player = mountPlayer(app, deck, {
      file: { source, name: fileName, handle },
      startAt,
      onExit: () => {
        positions?.flush();
        onExit();
      },
      onDeckChange: setTitle,
      onPositionChange: positions?.save,
    });
  } catch (error) {
    if (!(error instanceof DeckParseError)) console.error(error);
    const reason = error instanceof DeckParseError ? error.message : 'Fichier illisible.';
    showHome(`« ${fileName} » : ${reason}`);
  }
}

/** Remembers where a recent deck is, at most once per POSITION_SAVE_DELAY_MS. */
function positionSaver(fileName: string, remembered: Promise<void>) {
  let timer = 0;
  let pending: Position | null = null;
  const flush = () => {
    window.clearTimeout(timer);
    const position = pending;
    pending = null;
    if (position) recentsSaved = remembered.then(() => saveRecentPosition(fileName, position));
  };
  window.addEventListener('pagehide', flush);
  return {
    save(position: Position) {
      pending = position;
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, POSITION_SAVE_DELAY_MS);
    },
    flush() {
      flush();
      window.removeEventListener('pagehide', flush);
    },
  };
}

type ReadableHandle = FileSystemFileHandle & {
  requestPermission?: (descriptor: { mode: 'read' }) => Promise<PermissionState>;
};

/**
 * Resumes a recent deck from the latest version of its file when the browser still grants access
 * (asked again on this click), otherwise from the copy saved when it was last opened.
 */
async function resume(recent: RecentDeck): Promise<void> {
  const handle = recent.handle as ReadableHandle | undefined;
  let source = recent.source;
  let watched: FileSystemFileHandle | undefined;
  try {
    if (handle && (await handle.requestPermission?.({ mode: 'read' })) === 'granted') {
      source = await (await handle.getFile()).text();
      watched = handle;
    }
  } catch (error) {
    console.warn('Fichier récent inaccessible, version enregistrée utilisée :', error);
  }
  present(source, recent.name, { kind: 'file', handle: watched }, recent.position);
}

/**
 * An exported presentation: the deck plays at once, and leaving it offers to play it again.
 * Its origin counts as an example so that it is not added to this browser's recent decks.
 */
function presentEmbedded(source: string): void {
  const replay = () => {
    player?.destroy();
    player = null;
    showReplay(parseDeck(source).title, () => presentEmbedded(source));
  };
  // Named after this very file, so exporting it again keeps its name.
  const fileName = decodeURIComponent(window.location.pathname.split('/').pop() ?? '') || 'presentation.html';
  present(source, fileName, { kind: 'example' }, undefined, replay);
}

function showReplay(deckTitle: string, onReplay: () => void): void {
  const screen = document.createElement('div');
  screen.className = 'replay';
  const title = document.createElement('h1');
  title.textContent = deckTitle;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button-primary';
  button.innerHTML = `${ICONS.play}<span>Rejouer la présentation</span>`;
  button.addEventListener('click', () => {
    screen.remove();
    onReplay();
  });
  const credit = document.createElement('p');
  credit.textContent = 'Présentation créée avec Motion Slides';
  screen.append(title, button, credit);
  app.append(screen);
  button.focus();
}

const presenterId = new URLSearchParams(window.location.search).get('presenter');
const embedded = presenterId ? null : readEmbeddedDeck(document);
if (presenterId) {
  mountPresenter(app, presenterId);
} else if (embedded !== null) {
  // Captured before anything changes the page: exporting from here reuses this very file.
  rememberStandaloneShell(`<!doctype html>\n${document.documentElement.outerHTML}`);
  presentEmbedded(embedded);
} else {
  showHome();
}
