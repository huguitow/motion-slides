import { describe, expect, test } from 'vitest';
import { DeckParseError, parseDeck } from './parse';

const slide = (attrs: string, body: string) => `<template data-slide ${attrs}>${body}</template>`;

describe('parseDeck', () => {
  test('extracts every slide in document order', () => {
    const deck = parseDeck(slide('', '<h1>A</h1>') + slide('', '<h1>B</h1>'));

    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0].html).toContain('<h1>A</h1>');
    expect(deck.slides[1].html).toContain('<h1>B</h1>');
  });

  test('reads the title from meta deck-title, then <title>, then falls back', () => {
    expect(parseDeck(`<meta name="deck-title" content="Pitch">${slide('', 'x')}`).title).toBe('Pitch');
    expect(parseDeck(`<title>Doc</title>${slide('', 'x')}`).title).toBe('Doc');
    expect(parseDeck(slide('', 'x')).title).toBe('Sans titre');
  });

  test('reads data-steps as the number of on-click builds, defaulting to 0', () => {
    const deck = parseDeck(slide('data-steps="3"', 'x') + slide('', 'y'));

    expect(deck.slides[0].steps).toBe(3);
    expect(deck.slides[1].steps).toBe(0);
  });

  test('clamps invalid data-steps values to a safe range', () => {
    const deck = parseDeck(
      slide('data-steps="-2"', 'a') + slide('data-steps="abc"', 'b') + slide('data-steps="9999"', 'c'),
    );

    expect(deck.slides.map((s) => s.steps)).toEqual([0, 0, 99]);
  });

  test('reads the transition, defaulting to fade and rejecting unknown values', () => {
    const deck = parseDeck(
      slide('data-transition="slide"', 'a') + slide('data-transition="none"', 'b') +
        slide('data-transition="explode"', 'c') + slide('', 'd'),
    );

    expect(deck.slides.map((s) => s.transition)).toEqual(['slide', 'none', 'fade', 'fade']);
  });

  test('moves speaker notes out of the slide markup', () => {
    const deck = parseDeck(slide('', '<h1>Hi</h1><aside data-notes>Say hello</aside>'));

    expect(deck.slides[0].notes).toBe('Say hello');
    expect(deck.slides[0].html).not.toContain('Say hello');
  });

  test('keeps slide scripts as text so the player can run them later', () => {
    const deck = parseDeck(slide('', '<script>deck.onStep(() => {})</script>'));

    expect(deck.slides[0].html).toContain('<script>deck.onStep(() => {})</script>');
  });

  test('collects the shared deck head injected into every slide', () => {
    const deck = parseDeck(`<template data-deck-head><style>:root{--c:red}</style></template>${slide('', 'x')}`);

    expect(deck.sharedHead).toContain('--c:red');
  });

  test('throws a readable error when the file has no slides', () => {
    expect(() => parseDeck('<html><body>nothing</body></html>')).toThrow(DeckParseError);
    expect(() => parseDeck('')).toThrow(/aucune slide/i);
  });
});
