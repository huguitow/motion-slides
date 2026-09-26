import { isDuration, MAX_STEPS, TRANSITIONS, type Deck, type Slide, type Transition } from './types';

const DEFAULT_TITLE = 'Sans titre';

export class DeckParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckParseError';
  }
}

/** Turns the text of a .deck.html file into a Deck. Never executes any of its scripts. */
export function parseDeck(source: string): Deck {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const templates = [...doc.querySelectorAll<HTMLTemplateElement>('template[data-slide]')];

  if (templates.length === 0) {
    throw new DeckParseError(
      'Aucune slide trouvée : le fichier doit contenir au moins un <template data-slide>.',
    );
  }

  return {
    title: readTitle(doc),
    sharedHead: doc.querySelector<HTMLTemplateElement>('template[data-deck-head]')?.innerHTML ?? '',
    slides: templates.map(readSlide),
    autoplay: readAutoplay(doc),
  };
}

function readAutoplay(doc: Document): 'loop' | undefined {
  const value = doc.querySelector('meta[name="deck-autoplay"]')?.getAttribute('content')?.trim();
  return value === 'loop' ? 'loop' : undefined;
}

function readTitle(doc: Document): string {
  const meta = doc.querySelector('meta[name="deck-title"]')?.getAttribute('content')?.trim();
  return meta || doc.title.trim() || DEFAULT_TITLE;
}

function readSlide(template: HTMLTemplateElement): Slide {
  const content = template.content.cloneNode(true) as DocumentFragment;
  const noteElements = [...content.querySelectorAll('aside[data-notes]')];
  const notes = noteElements.map((el) => el.textContent?.trim() ?? '').filter(Boolean).join('\n\n');
  noteElements.forEach((el) => el.remove());

  const container = template.ownerDocument.createElement('div');
  container.append(content);

  return {
    html: container.innerHTML,
    steps: readSteps(template.dataset.steps),
    transition: readTransition(template.dataset.transition),
    notes,
    duration: readDuration(template.dataset.duration),
  };
}

/** An invalid value falls back to the player's pace; the deck checker points it out. */
function readDuration(raw: string | undefined): number | undefined {
  const value = raw === undefined || raw.trim() === '' ? Number.NaN : Number(raw);
  return isDuration(value) ? value : undefined;
}

function readSteps(raw: string | undefined): number {
  const value = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, MAX_STEPS);
}

function readTransition(raw: string | undefined): Transition {
  return TRANSITIONS.find((t) => t === raw) ?? 'fade';
}
