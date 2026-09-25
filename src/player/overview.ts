import { moveSelection } from '../deck/grid';
import type { Deck } from '../deck/types';
import { Stage } from './stage';

export interface OverviewOptions {
  readonly onSelect: (slideIndex: number) => void;
  readonly onClose: () => void;
}

export interface OverviewHandle {
  /** Returns true when the overview consumed the key. */
  handleKey(event: KeyboardEvent): boolean;
  destroy(): void;
}

/** Grid of live slide thumbnails, each shown at its final build. */
export function openOverview(host: HTMLElement, deck: Deck, current: number, options: OverviewOptions): OverviewHandle {
  const element = document.createElement('div');
  element.className = 'overview';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', 'Vue d’ensemble des slides');
  const grid = document.createElement('div');
  grid.className = 'overview-grid';
  element.append(grid);
  host.append(element);

  let selected = current;
  const highlight = (index: number) => {
    thumbs[selected]?.classList.remove('is-selected');
    selected = index;
    thumbs[selected].classList.add('is-selected');
  };
  const select = (index: number) => {
    highlight(index);
    thumbs[selected].focus({ preventScroll: true });
    thumbs[selected].scrollIntoView({ block: 'nearest' });
  };

  const stages: Stage[] = [];
  const thumbs: HTMLButtonElement[] = deck.slides.map((slide, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'overview-thumb';
    thumb.setAttribute('aria-label', `Slide ${index + 1}`);
    const viewport = document.createElement('div');
    viewport.className = 'overview-viewport';
    const label = document.createElement('span');
    label.className = 'overview-label';
    label.textContent = String(index + 1);
    thumb.append(viewport, label);
    thumb.addEventListener('click', () => options.onSelect(index));
    // Keeps the highlight on the thumbnail reached with Tab.
    thumb.addEventListener('focus', () => highlight(index));
    grid.append(thumb);

    const stage = new Stage(viewport, () => slide.steps);
    stage.display(deck, { slide: index, step: slide.steps }, 'none', 'forward');
    stages.push(stage);
    return thumb;
  });

  select(current);

  const columnCount = () => getComputedStyle(grid).gridTemplateColumns.split(' ').length;

  return {
    handleKey(event) {
      if (event.key === 'f' || event.key === 'F' || event.key === 'Tab') return false;
      if (event.key === 'Escape' || event.key === 'o' || event.key === 'O') {
        options.onClose();
      } else if (event.key === 'Enter' || event.key === ' ') {
        options.onSelect(selected);
      } else {
        const target = moveSelection(selected, event.key, thumbs.length, columnCount());
        if (target !== null) select(target);
      }
      return true;
    },
    destroy() {
      stages.forEach((stage) => stage.destroy());
      element.remove();
    },
  };
}
