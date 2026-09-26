import type { Position } from '../deck/navigation';
import type { Deck } from '../deck/types';
import type { DeckIssue } from '../deck/validate';
import { ICONS } from '../ui/icons';

const IDLE_HIDE_MS = 2500;
const TOAST_MS = 4000;

export type PlayerDom = ReturnType<typeof createPlayerDom>;

export function createPlayerDom() {
  const element = document.createElement('div');
  element.className = 'player';
  element.innerHTML = `
    <div class="player-viewport"></div>
    <div class="player-shield" aria-hidden="true"></div>
    <div class="player-progress"><div class="player-progress-bar"></div></div>
    <p class="player-toast" role="status" hidden></p>
    <section class="player-issues" aria-label="Points à corriger" hidden>
      <header>
        <strong>Points à corriger dans ce fichier</strong>
        <button type="button" data-panel="copy-issues">Copier pour Claude</button>
      </header>
      <ul></ul>
    </section>
    <section class="player-retouch" aria-label="Retoucher la slide" hidden>
      <header>
        <strong class="player-retouch-title"></strong>
        <span>Ctrl+Entrée pour copier</span>
      </header>
      <textarea rows="3" aria-label="Ce que Claude doit changer" placeholder="Ex. : agrandis le graphique, ajoute une étape pour la conclusion…"></textarea>
      <footer>
        <p>Claude recevra ta consigne et le code de cette slide.</p>
        <button type="button" data-panel="copy-retouch">${ICONS.copy}<span>Copier pour Claude</span></button>
      </footer>
    </section>
    <div class="player-hud" role="toolbar" aria-label="Contrôles de la présentation">
      <span class="player-title"></span>
      <span class="player-live" title="Chaque modification du fichier s’affiche ici" hidden>En direct</span>
      <span class="player-steps"></span>
      <span class="hud-group">
        <button type="button" data-action="prev" aria-label="Précédent" title="Précédent (←)">${ICONS.prev}</button>
        <span class="player-counter"></span>
        <button type="button" data-action="next" aria-label="Suivant" title="Suivant (espace)">${ICONS.next}</button>
      </span>
      <span class="hud-group">
        <button type="button" data-action="retouch" aria-label="Retoucher cette slide" title="Retoucher cette slide avec Claude (E)">${ICONS.retouch}</button>
        <button type="button" data-action="overview" aria-label="Vue d’ensemble" title="Vue d’ensemble (O)">${ICONS.overview}</button>
        <button type="button" data-action="presenter" aria-label="Vue présentateur" title="Vue présentateur (P)">${ICONS.presenter}</button>
        <button type="button" data-action="pdf" aria-label="Exporter en PDF" title="Exporter en PDF (Ctrl+P)">${ICONS.pdf}</button>
        <button type="button" data-action="fullscreen" aria-label="Plein écran" title="Plein écran (F)">${ICONS.fullscreen}</button>
        <button type="button" data-panel="issues" class="player-issues-button" hidden></button>
        <button type="button" data-action="exit" aria-label="Fermer" title="Fermer (Échap)">${ICONS.close}</button>
      </span>
    </div>`;

  const find = <T extends Element>(selector: string) => element.querySelector<T>(selector)!;

  return {
    element,
    title: find<HTMLSpanElement>('.player-title'),
    live: find<HTMLSpanElement>('.player-live'),
    retouchPanel: find<HTMLElement>('.player-retouch'),
    retouchTitle: find<HTMLElement>('.player-retouch-title'),
    retouchInput: find<HTMLTextAreaElement>('.player-retouch textarea'),
    copyRetouch: find<HTMLButtonElement>('[data-panel="copy-retouch"]'),
    viewport: find<HTMLDivElement>('.player-viewport'),
    shield: find<HTMLDivElement>('.player-shield'),
    hud: find<HTMLDivElement>('.player-hud'),
    progress: find<HTMLDivElement>('.player-progress-bar'),
    toast: find<HTMLParagraphElement>('.player-toast'),
    counter: find<HTMLSpanElement>('.player-counter'),
    steps: find<HTMLSpanElement>('.player-steps'),
    buttons: [...element.querySelectorAll<HTMLButtonElement>('.player-hud button[data-action]')],
    issuesButton: find<HTMLButtonElement>('[data-panel="issues"]'),
    issuesPanel: find<HTMLElement>('.player-issues'),
    issuesList: find<HTMLUListElement>('.player-issues ul'),
    copyIssues: find<HTMLButtonElement>('[data-panel="copy-issues"]'),
  };
}

export interface IssuesPanel {
  /** Replaces the listed issues; the ⚠ button hides when there are none. */
  update(issues: readonly DeckIssue[]): void;
}

export function issuesCount(count: number): string {
  return `${count} point${count > 1 ? 's' : ''} à corriger`;
}

/** Lists validation issues behind a ⚠ button, with a ready-to-paste request for Claude. */
export function createIssuesPanel(dom: PlayerDom, toast: Toast): IssuesPanel {
  let issues: readonly DeckIssue[] = [];
  const label = (issue: DeckIssue) => (issue.slide === null ? issue.message : `Slide ${issue.slide + 1} : ${issue.message}`);

  dom.issuesButton.addEventListener('click', () => (dom.issuesPanel.hidden = !dom.issuesPanel.hidden));
  dom.copyIssues.addEventListener('click', async () => {
    const request = `Corrige ces points dans le fichier .deck.html et renvoie le fichier complet :\n${issues.map((issue) => `- ${label(issue)}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(request);
      toast.show('Copié : colle-le dans Claude avec ton fichier.');
    } catch {
      toast.show('Copie impossible : sélectionne la liste à la main.');
    }
  });

  return {
    update(next) {
      issues = next;
      const count = issuesCount(next.length);
      dom.issuesButton.hidden = next.length === 0;
      if (next.length === 0) dom.issuesPanel.hidden = true;
      dom.issuesButton.innerHTML = `${ICONS.warning}<span>${next.length}</span>`;
      dom.issuesButton.title = count;
      dom.issuesButton.setAttribute('aria-label', count);
      dom.issuesList.replaceChildren(
        ...next.map((issue) => {
          const item = document.createElement('li');
          item.textContent = label(issue);
          return item;
        }),
      );
    },
  };
}

/** Slide counter, build counter and a progress bar that counts every build. */
export function renderHud(dom: PlayerDom, deck: Deck, position: Position): void {
  const steps = deck.slides.map((slide) => slide.steps);
  const slide = deck.slides[position.slide];
  const pad = (value: number) => String(value).padStart(2, '0');
  dom.title.textContent = deck.title;
  dom.counter.textContent = `${pad(position.slide + 1)} / ${pad(deck.slides.length)}`;
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
