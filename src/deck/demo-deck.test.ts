import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { parseDeck } from './parse';

// Vitest runs from the project root; import.meta.url is not a file URL under jsdom.
const demoPath = resolve('public/examples/demo.deck.html');

describe('demo deck', () => {
  const deck = parseDeck(readFileSync(demoPath, 'utf8'));

  test('follows the documented format', () => {
    expect(deck.title).toBe('Motion Deck — la démo');
    expect(deck.sharedHead).toContain('--violet');
    expect(deck.slides.map((s) => s.steps)).toEqual([0, 3, 3, 2, 0, 0]);
  });

  test('has speaker notes on every slide, kept out of the rendered markup', () => {
    for (const slide of deck.slides) {
      expect(slide.notes).not.toBe('');
      expect(slide.html).not.toContain('data-notes');
    }
  });
});
