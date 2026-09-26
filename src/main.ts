import { DeckParseError, parseDeck } from './deck/parse';
import { validateDeck } from './deck/validate';
import { mountHome, type HomeHandle } from './home';
import { mountPlayer, type PlayerHandle } from './player/player';
import { mountPresenter } from './presenter/presenter';
import './styles/app.css';

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

function present(source: string, fileName: string): void {
  try {
    const deck = parseDeck(source);
    home?.destroy();
    home = null;
    document.title = `${deck.title} · ${APP_TITLE}`;
    player = mountPlayer(app, deck, { onExit: () => showHome(), issues: validateDeck(source) });
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
