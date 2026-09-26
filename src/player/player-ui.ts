import type { Position } from '../deck/navigation';
import type { Deck } from '../deck/types';
import type { DeckIssue } from '../deck/validate';
import { ICONS } from '../ui/icons';

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
    <section class="player-issues" aria-label="Points à corriger" hidden>
      <header>
        <strong>Points à corriger dans ce fichier</strong>
        <button type="button" data-panel="copy-issues">Copier pour Claude</button>
      </header>
      <ul></ul>
    </section>
    <div class="player-hud" role="toolbar" aria-label="Contrôles de la présentation">
      <span class="player-title"></span>
      <span class="player-steps"></span>
      <span class="hud-group">
        <button type="button" data-action="prev" aria-label="Précédent" title="Précédent (←)">${ICONS.prev}</button>
        <span class="player-counter"></span>
        <button type="button" data-action="next" aria-label="Suivant" title="Suivant (espace)">${ICONS.next}</button>
      </span>
      <span class="hud-group">
        <button type="button" data-action="overview" aria-label="Vue d’ensemble" title="Vue d’ensemble (O)">${ICONS.overview}</button>
        <button type="button" data-action="presenter" aria-label="Vue présentateur" title="Vue présentateur (P)">${ICONS.presenter}</button>
        <button type="button" data-action="pdf" aria-label="Exporter en PDF" title="Exporter en PDF (Ctrl+P)">${ICONS.pdf}</button>
        <button type="button" data-action="fullscreen" aria-label="Plein écran" title="Plein écran (F)">${ICONS.fullscreen}</button>
        <button type="button" data-panel="issues" class="player-issues-button" hidden></button>
        <button type="button" data-action="exit" aria-label="Fermer" title="Fermer (Échap)">${ICONS.close}</button>
      </span>
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
    buttons: [...element.querySelectorAll<HTMLButtonElement>('.player-hud button[data-action]')],
    issuesButton: find<HTMLButtonElement>('[data-panel="issues"]'),
    issuesPanel: find<HTMLElement>('.player-issues'),
    issuesList: find<HTMLUListElement>('.player-issues ul'),
    copyIssues: find<HTMLButtonElement>('[data-panel="copy-issues"]'),
  };
}

/** Lists validation issues behind a ⚠ button, with a ready-to-paste request for Claude. */
export function bindIssues(dom: PlayerDom, issues: readonly DeckIssue[], toast: Toast): void {
  if (issues.length === 0) return;
  const label = (issue: DeckIssue) => (issue.slide === null ? issue.message : `Slide ${issue.slide + 1} : ${issue.message}`);
  const count = `${issues.length} point${issues.length > 1 ? 's' : ''} à corriger`;

  dom.issuesButton.hidden = false;
  dom.issuesButton.innerHTML = `${ICONS.warning}<span>${issues.length}</span>`;
  dom.issuesButton.title = count;
  dom.issuesButton.setAttribute('aria-label', count);
  for (const issue of issues) {
    const item = document.createElement('li');
    item.textContent = label(issue);
    dom.issuesList.append(item);
  }

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
  toast.show(`${count} dans ce fichier : clique sur ⚠ pour les voir.`);
}

/** Slide counter, build counter and a progress bar that counts every build. */
export function renderHud(dom: PlayerDom, deck: Deck, position: Position): void {
  const steps = deck.slides.map((slide) => slide.steps);
  const slide = deck.slides[position.slide];
  const pad = (value: number) => String(value).padStart(2, '0');
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
