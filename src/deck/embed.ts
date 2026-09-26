/** Id of the `<script type="application/json">` holding the deck in an exported presentation. */
export const EMBED_ID = 'motion-slides-deck';

const PLACEHOLDER = new RegExp(`<script type="application/json" id="${EMBED_ID}">[^<]*</script>`);
const TITLE = /<title>[^<]*<\/title>/;

export class DeckEmbedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckEmbedError';
  }
}

/**
 * Turns the standalone player page into a self-contained presentation of `source`.
 * The deck is stored as JSON whose `<` are escaped, so nothing in it can end the script early.
 */
export function embedDeck(shellHtml: string, source: string, title: string): string {
  if (!PLACEHOLDER.test(shellHtml)) {
    throw new DeckEmbedError('Page du lecteur autonome invalide : emplacement du deck introuvable.');
  }
  const data = JSON.stringify({ source }).replace(/</g, '\\u003c');
  // Functions as replacements: a `$` in the deck must not be read as a replacement pattern.
  return shellHtml
    .replace(PLACEHOLDER, () => `<script type="application/json" id="${EMBED_ID}">${data}</script>`)
    .replace(TITLE, () => `<title>${escapeHtml(title)} · Motion Slides</title>`);
}

/** The deck source stored in an exported presentation, or null for any other page. */
export function extractEmbeddedDeck(html: string): string | null {
  return readEmbeddedDeck(new DOMParser().parseFromString(html, 'text/html'));
}

/** Same as extractEmbeddedDeck, for an already parsed document (the page itself at startup). */
export function readEmbeddedDeck(doc: Document): string | null {
  const text = doc.getElementById(EMBED_ID)?.textContent?.trim();
  if (!text) return null;
  try {
    const data: unknown = JSON.parse(text);
    const source = typeof data === 'object' && data !== null ? (data as { source?: unknown }).source : undefined;
    return typeof source === 'string' ? source : null;
  } catch {
    return null;
  }
}

/** `talk.deck.html` → `talk.presentation.html`, so the export never overwrites the source deck. */
export function exportFileName(name: string): string {
  const base = name.replace(/\.html?$/i, '').replace(/(?:(?:^|\.)(?:presentation|deck))+$/i, '');
  return base ? `${base}.presentation.html` : 'presentation.html';
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
