import { describe, expect, test } from 'vitest';
import { DeckEmbedError, embedDeck, exportFileName, extractEmbeddedDeck } from './embed';

const shell = [
  '<!doctype html><html><head><title>Motion Slides</title>',
  '<script type="application/json" id="motion-slides-deck"></script>',
  '</head><body><div id="app"></div><script type="module">/* player */</script></body></html>',
].join('\n');

const deck = '<meta name="deck-title" content="Talk"><template data-slide><h1>Hi</h1><script>x = "</script>";</script></template>';

describe('exportFileName', () => {
  test.each([
    ['tour-eiffel.deck.html', 'tour-eiffel.presentation.html'],
    ['talk.html', 'talk.presentation.html'],
    ['talk.presentation.html', 'talk.presentation.html'],
    ['presentation.html', 'presentation.html'],
    ['presentation.deck.html', 'presentation.html'],
    ['Notes.HTM', 'Notes.presentation.html'],
    ['', 'presentation.html'],
  ])('%j → %j', (name, expected) => {
    expect(exportFileName(name)).toBe(expected);
  });
});

describe('embedDeck / extractEmbeddedDeck', () => {
  test('round-trips the exact deck source', () => {
    const page = embedDeck(shell, deck, 'Talk');

    expect(extractEmbeddedDeck(page)).toBe(deck);
  });

  test('never lets the deck close the script tag or open a comment early', () => {
    const page = embedDeck(shell, deck, 'Talk');
    const data = page.slice(page.indexOf('id="motion-slides-deck">'), page.indexOf('</head>'));

    expect(data.match(/<\/script>/g)).toHaveLength(1);
    expect(data).not.toContain('<!--');
  });

  test('titles the page after the deck, escaping HTML', () => {
    expect(embedDeck(shell, deck, 'R&D <2026>')).toContain('<title>R&amp;D &lt;2026&gt; · Motion Slides</title>');
  });

  test('refuses a shell without the placeholder', () => {
    expect(() => embedDeck('<html></html>', deck, 'Talk')).toThrow(DeckEmbedError);
  });

  test('returns null for a page without an embedded deck or with malformed data', () => {
    expect(extractEmbeddedDeck(deck)).toBeNull();
    expect(extractEmbeddedDeck(shell)).toBeNull();
    expect(extractEmbeddedDeck('<script type="application/json" id="motion-slides-deck">{"source": 42}</script>')).toBeNull();
    expect(extractEmbeddedDeck('<script type="application/json" id="motion-slides-deck">not json</script>')).toBeNull();
  });
});
