import type { Position } from '../deck/navigation';
import { buildRetouchRequest } from '../deck/retouch';
import { slideSource } from '../deck/slide-source';
import type { Deck } from '../deck/types';
import type { PlayerDom, Toast } from './player-ui';

/** What the panel needs to know about the presentation, read when it is used. */
export interface RetouchContext {
  readonly fileName: string;
  readonly source: string;
  readonly deck: Deck;
  readonly position: Position;
  /** True when the file is watched, so Claude's edit will show up on its own. */
  readonly isLive: boolean;
}

export interface RetouchPanel {
  toggle(): void;
  isOpen(): boolean;
  close(): void;
  /** Updates the title after moving to another slide. */
  refresh(): void;
}

/** Panel where the author describes a change to the current slide and copies a request for Claude. */
export function createRetouchPanel(dom: PlayerDom, toast: Toast, context: () => RetouchContext): RetouchPanel {
  const refresh = () => {
    dom.retouchTitle.textContent = `Retoucher la slide ${context().position.slide + 1}`;
  };

  const open = () => {
    refresh();
    dom.retouchPanel.hidden = false;
    dom.retouchInput.focus();
  };

  // Blurring hands the keyboard back to the player, so Space advances again.
  const close = () => {
    dom.retouchPanel.hidden = true;
    dom.retouchInput.blur();
  };

  const copy = async () => {
    const instruction = dom.retouchInput.value.trim();
    if (!instruction) {
      toast.show('Écris d’abord ce que Claude doit changer.');
      return dom.retouchInput.focus();
    }
    const { fileName, source, deck, position, isLive } = context();
    const slide = deck.slides[position.slide];
    const request = buildRetouchRequest({
      fileName,
      slideIndex: position.slide,
      slideCount: deck.slides.length,
      step: position.step,
      steps: slide.steps,
      instruction,
      slideSource: slideSource(source, position.slide) ?? slide.html,
    });
    try {
      await navigator.clipboard.writeText(request);
      dom.retouchInput.value = '';
      close();
      toast.show(
        isLive
          ? 'Copié : colle-le dans Claude. Dès que le fichier change, la slide se met à jour ici.'
          : 'Copié : colle-le dans Claude avec ton fichier, puis rouvre la version corrigée.',
      );
    } catch {
      toast.show('Copie impossible : autorise l’accès au presse-papiers.');
    }
  };

  dom.copyRetouch.addEventListener('click', () => void copy());
  // On the whole panel, so Escape also works from the copy button reached with Tab.
  dom.retouchPanel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void copy();
    }
  });

  return {
    toggle: () => (dom.retouchPanel.hidden ? open() : close()),
    isOpen: () => !dom.retouchPanel.hidden,
    close,
    refresh,
  };
}
