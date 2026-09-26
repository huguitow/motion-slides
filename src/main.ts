import { DeckParseError, parseDeck } from './deck/parse';
import type { Deck } from './deck/types';
import { mountHome, type HomeHandle } from './home/home';
import { mountPlayer, type PlayerHandle } from './player/player';
import { mountPresenter } from './presenter/presenter';
import './styles/tokens.css';
import './styles/app.css';
import './styles/home.css';

const APP_TITLE = 'Motion Slides';
const app = document.querySelector<HTMLElement>('#app')!;

let home: HomeHandle | null = null;
let player: PlayerHandle | null = null;

function showHome(errorMessage?: string): void {
  player?.destroy();
  player = null;
  document.title = APP_TITLE;
  home ??= mountHome(app, { onDeckSource: present, examplesUrl: `${import.meta.env.BASE_URL}examples/` });
  if (errorMessage) home.showError(errorMessage);
}

function present(source: string, fileName: string, handle?: FileSystemFileHandle): void {
  try {
    const deck = parseDeck(source);
    home?.destroy();
    home = null;
    const setTitle = (shown: Deck) => (document.title = `${shown.title} · ${APP_TITLE}`);
    setTitle(deck);
    player = mountPlayer(app, deck, {
      file: { source, name: fileName, handle },
      onExit: () => showHome(),
      onDeckChange: setTitle,
    });
  } catch (error) {
    if (!(error instanceof DeckParseError)) console.error(error);
    const reason = error instanceof DeckParseError ? error.message : 'Fichier illisible.';
    showHome(`« ${fileName} » : ${reason}`);
  }
}

const presenterId = new URLSearchParams(window.location.search).get('presenter');
if (presenterId) {
  mountPresenter(app, presenterId);
} else {
  showHome();
}
