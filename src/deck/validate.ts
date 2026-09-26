import { isDuration, MAX_DURATION_SECONDS, MAX_STEPS, TRANSITIONS } from './types';

export interface DeckIssue {
  /** Zero-based slide index, or null for a deck-level issue. */
  readonly slide: number | null;
  readonly message: string;
}

const REACTS_TO_STEPS = /\[data-step|deck\.(?:onStep|step)\b|dataset\.step/;
const STEP_SELECTOR = /data-step\s*=\s*["']?(\d+)/g;
const EXTERNAL_URL = /url\(\s*["']?((?:https?:)?\/\/[^"')\s]+)/g;
const FONT_FILE = /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i;
const MEDIA_WITH_SRC = 'img[src], video[src], audio[src], source[src], iframe[src], embed[src]';
const INTERACTIVE = 'a[href], button, input, select, textarea';

/**
 * Finds the mistakes a generated deck commonly has. They never block the presentation:
 * the player shows them so the author can ask Claude to fix the file.
 */
export function validateDeck(source: string): DeckIssue[] {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const templates = [...doc.querySelectorAll<HTMLTemplateElement>('template[data-slide]')];
  if (templates.length === 0) return [];

  const issues: DeckIssue[] = [];
  const hasTitle = doc.querySelector('meta[name="deck-title"]')?.getAttribute('content')?.trim() || doc.title.trim();
  if (!hasTitle) {
    issues.push({ slide: null, message: 'Pas de titre : ajoute <meta name="deck-title" content="…">.' });
  }
  templates.forEach((template, index) => {
    for (const message of slideIssues(template)) issues.push({ slide: index, message });
  });
  return issues;
}

function slideIssues(template: HTMLTemplateElement): string[] {
  const html = template.innerHTML;
  const content = template.content;
  const issues = [...stepIssues(template.dataset.steps, html)];

  const duration = template.dataset.duration;
  if (duration !== undefined && !isDuration(duration.trim() === '' ? Number.NaN : Number(duration))) {
    issues.push(
      `data-duration="${duration}" invalide : un nombre de secondes entre 0 et ${MAX_DURATION_SECONDS} est attendu, le rythme du lecteur est utilisé.`,
    );
  }

  const transition = template.dataset.transition;
  if (transition !== undefined && !TRANSITIONS.some((t) => t === transition)) {
    issues.push(`data-transition="${transition}" inconnue : « fade » est utilisée.`);
  }
  if (content.querySelector(INTERACTIVE)) {
    issues.push('Contient des éléments cliquables (bouton, lien, champ) : les clics servent à avancer, ils ne réagiront pas.');
  }
  const hosts = externalMediaHosts(content, html);
  if (hosts.length > 0) {
    issues.push(`Charge des médias externes (${hosts.join(', ')}) : ils peuvent manquer sans connexion.`);
  }
  return issues;
}

function stepIssues(raw: string | undefined, html: string): string[] {
  if (raw === undefined) return [];
  if (!/^\d+$/.test(raw.trim())) return [`data-steps="${raw}" invalide : la slide n'aura aucune animation au clic.`];
  const steps = Number(raw);
  if (steps > MAX_STEPS) return [`data-steps="${raw}" trop grand : limité à ${MAX_STEPS}.`];
  if (steps === 0) return [];

  if (!REACTS_TO_STEPS.test(html)) {
    return [`data-steps="${steps}" mais la slide ne réagit pas aux étapes (ni html[data-step], ni deck.onStep) : les clics sembleront ne rien faire.`];
  }
  const targeted = [...html.matchAll(STEP_SELECTOR)].map((match) => Number(match[1]));
  const beyond = [...new Set(targeted.filter((step) => step > steps))];
  return beyond.map((step) => `Le CSS cible l'étape ${step} alors que data-steps="${steps}" : elle ne sera jamais atteinte.`);
}

function externalMediaHosts(content: DocumentFragment, html: string): string[] {
  const urls = [
    ...[...content.querySelectorAll(MEDIA_WITH_SRC)].map((el) => el.getAttribute('src') ?? ''),
    ...[...html.matchAll(EXTERNAL_URL)].map((match) => match[1]),
  ];
  const hosts = urls
    .filter((url) => /^(?:https?:)?\/\//.test(url) && !FONT_FILE.test(url))
    .map(hostOf)
    .filter((host) => host !== '');
  return [...new Set(hosts)];
}

/** Warnings must never block a deck: a malformed URL just yields no host. */
function hostOf(url: string): string {
  try {
    return new URL(url, 'https://placeholder.invalid').host;
  } catch {
    return '';
  }
}
