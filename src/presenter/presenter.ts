import { stagePoint, type StagePoint } from '../deck/fit';
import { actionForKeyEvent, type PlayerAction } from '../deck/keymap';
import { next, type Position } from '../deck/navigation';
import {
  isInDeck,
  parsePresenterMessage,
  presenterChannelName,
  REMOTE_ACTIONS,
  type PresenterMessage,
  type RemoteAction,
} from '../deck/presenter-protocol';
import type { Deck } from '../deck/types';
import { Stage } from '../player/stage';
import { createLaserPointer, type LaserPointer } from '../ui/laser';
import { createTimer, type Timer } from './timer';
import '../styles/presenter.css';

const HELLO_RETRY_MS = 1000;
const CLOCK_TICK_MS = 500;
const isRemoteAction = (action: PlayerAction): action is RemoteAction =>
  REMOTE_ACTIONS.some((remote) => remote === action);

type PresenterDom = ReturnType<typeof createPresenterDom>;

/** Presenter window: current slide, next build, notes and timer, remote-controlling the audience window. */
export function mountPresenter(host: HTMLElement, channelId: string): void {
  const dom = createPresenterDom();
  host.append(dom.element);
  document.title = 'Vue présentateur · Motion Slides';

  const channel = new BroadcastChannel(presenterChannelName(channelId));
  const send = (message: PresenterMessage) => channel.postMessage(message);
  const timer = createTimer();

  let deck: Deck | null = null;
  let position: Position = { slide: 0, step: 0 };
  let upcoming: Position = position;
  const current = new Stage(dom.current, () => position.step);
  const preview = new Stage(dom.next, () => upcoming.step);

  const render = (shown: Deck) => {
    upcoming = next(position, shown.slides.map((slide) => slide.steps));
    const isEnd = upcoming === position;
    current.display(shown, position, 'none', 'forward');
    if (!isEnd) preview.display(shown, upcoming, 'none', 'forward');
    dom.next.style.visibility = isEnd ? 'hidden' : '';
    dom.nextEnd.hidden = !isEnd;
    renderInfo(dom, shown, position);
  };

  channel.addEventListener('message', (event) => {
    const message = parsePresenterMessage(event.data);
    if (message?.type === 'state') {
      // A different deck means the file was reloaded and the slides on stage are stale. A repeated
      // answer to a retried hello carries the same deck and must not restart the slides.
      if (deck && JSON.stringify(deck) !== JSON.stringify(message.deck)) {
        current.invalidate();
        preview.invalidate();
      }
      deck = message.deck;
      position = message.position;
      dom.element.classList.remove('is-waiting');
      window.clearInterval(helloTimer);
      timer.start();
      render(deck);
    } else if (message?.type === 'position' && deck && isInDeck(message.position, deck)) {
      position = message.position;
      render(deck);
    } else if (message?.type === 'blank') {
      dom.blank.hidden = message.blank === 'none';
      dom.blank.textContent = message.blank === 'white' ? 'Écran blanc' : 'Écran noir';
    } else if (message?.type === 'autoplay') {
      dom.autoplay.hidden = message.seconds === null;
      dom.autoplay.textContent = `Défilement auto · ${message.seconds} s`;
    } else if (message?.type === 'end') {
      dom.element.classList.add('is-ended');
    }
  });

  // The audience window may still be loading: keep asking until it answers.
  send({ type: 'hello' });
  const helloTimer = window.setInterval(() => send({ type: 'hello' }), HELLO_RETRY_MS);

  const laser = bindLaser(dom, send);
  bindControls(dom, (action) => send({ type: 'action', action }), timer, laser);
  startClock(dom, timer);
}

/** Pointing at the current slide here shows the laser dot on the projected slide too. */
function bindLaser(dom: PresenterDom, send: (message: PresenterMessage) => void): LaserPointer {
  let frame = 0;
  let latest: StagePoint | null = null;
  // At most one message per frame: pointermove can fire far more often than the screen refreshes.
  const flush = () => {
    frame = 0;
    send({ type: 'laser', point: latest });
  };
  return createLaserPointer({
    surface: dom.currentShield,
    layer: dom.currentSection,
    onPoint: (point) => {
      const rect = dom.currentShield.getBoundingClientRect();
      latest = point && stagePoint(point.clientX - rect.left, point.clientY - rect.top, rect.width, rect.height);
      frame ||= window.requestAnimationFrame(flush);
    },
  });
}

function renderInfo(dom: PresenterDom, deck: Deck, position: Position): void {
  const slide = deck.slides[position.slide];
  dom.title.textContent = deck.title;
  dom.counter.textContent = `Slide ${position.slide + 1} / ${deck.slides.length}`;
  dom.steps.textContent = slide.steps > 0 ? `étape ${position.step} / ${slide.steps}` : '';
  dom.notes.textContent = slide.notes || 'Pas de notes pour cette slide.';
  dom.notes.classList.toggle('is-empty', !slide.notes);
}

function bindControls(dom: PresenterDom, remote: (action: RemoteAction) => void, timer: Timer, laser: LaserPointer): void {
  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' ')) return;
    // Ctrl+arrows still navigate while Ctrl is held to point with the laser.
    const action = actionForKeyEvent(event);
    if (action === 'laser') {
      event.preventDefault();
      laser.toggle();
    } else if (action && isRemoteAction(action)) {
      event.preventDefault();
      remote(action);
    }
  });
  dom.currentShield.addEventListener('click', () => remote('next'));
  dom.prev.addEventListener('click', () => remote('prev'));
  dom.nextButton.addEventListener('click', () => remote('next'));
  // Mouse clicks must not leave focus on a button, or Space would press it instead of advancing.
  dom.toolbar.addEventListener('pointerdown', (event) => event.preventDefault());
  dom.pause.addEventListener('click', () => {
    timer.toggle();
    dom.pause.textContent = timer.isRunning() ? 'Pause' : 'Reprendre';
  });
  dom.reset.addEventListener('click', () => timer.reset());
}

function startClock(dom: PresenterDom, timer: Timer): void {
  const tick = () => {
    dom.elapsed.textContent = timer.format();
    dom.clock.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  tick();
  window.setInterval(tick, CLOCK_TICK_MS);
}

function createPresenterDom() {
  const element = document.createElement('div');
  element.className = 'presenter is-waiting';
  element.innerHTML = `
    <header class="presenter-bar">
      <strong class="presenter-title">Motion Slides</strong>
      <span class="presenter-counter"></span>
      <span class="presenter-steps"></span>
      <span class="presenter-blank" hidden></span>
      <span class="presenter-autoplay" hidden></span>
      <span class="presenter-spacer"></span>
      <span class="presenter-elapsed" aria-label="Temps écoulé"></span>
      <div class="presenter-toolbar">
        <button type="button" data-action="pause">Pause</button>
        <button type="button" data-action="reset">Remettre à zéro</button>
        <button type="button" data-action="prev" aria-label="Précédent">←</button>
        <button type="button" data-action="next" aria-label="Suivant">→</button>
      </div>
      <span class="presenter-clock" aria-label="Heure"></span>
    </header>
    <section class="presenter-current">
      <div class="presenter-viewport" data-role="current"></div>
      <div class="presenter-shield" title="Cliquer pour avancer"></div>
    </section>
    <aside class="presenter-side">
      <h2>Ensuite</h2>
      <div class="presenter-next">
        <div class="presenter-viewport" data-role="next"></div>
        <p class="presenter-next-end" hidden>Fin de la présentation</p>
      </div>
      <h2>Notes</h2>
      <div class="presenter-notes"></div>
    </aside>
    <div class="presenter-overlay presenter-overlay-waiting">Connexion à la présentation…</div>
    <div class="presenter-overlay presenter-overlay-ended">La présentation est fermée.</div>`;

  const find = <T extends Element>(selector: string) => element.querySelector<T>(selector)!;
  return {
    element,
    title: find<HTMLElement>('.presenter-title'),
    counter: find<HTMLElement>('.presenter-counter'),
    steps: find<HTMLElement>('.presenter-steps'),
    elapsed: find<HTMLElement>('.presenter-elapsed'),
    clock: find<HTMLElement>('.presenter-clock'),
    toolbar: find<HTMLElement>('.presenter-toolbar'),
    pause: find<HTMLButtonElement>('[data-action="pause"]'),
    reset: find<HTMLButtonElement>('[data-action="reset"]'),
    prev: find<HTMLButtonElement>('[data-action="prev"]'),
    nextButton: find<HTMLButtonElement>('[data-action="next"]'),
    blank: find<HTMLElement>('.presenter-blank'),
    autoplay: find<HTMLElement>('.presenter-autoplay'),
    currentSection: find<HTMLElement>('.presenter-current'),
    current: find<HTMLElement>('[data-role="current"]'),
    currentShield: find<HTMLElement>('.presenter-shield'),
    next: find<HTMLElement>('[data-role="next"]'),
    nextEnd: find<HTMLElement>('.presenter-next-end'),
    notes: find<HTMLElement>('.presenter-notes'),
  };
}
