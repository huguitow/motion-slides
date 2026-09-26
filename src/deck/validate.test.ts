import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { validateDeck } from './validate';

const TITLE = '<meta name="deck-title" content="T">';
const slide = (attrs: string, body = '<h1>x</h1>') => `<template data-slide ${attrs}>${body}</template>`;
const messages = (source: string) => validateDeck(source).map((issue) => issue.message);

describe('validateDeck', () => {
  test('a well-formed deck has no issues', () => {
    const source = TITLE + slide('data-steps="1"', '<style>html[data-step="1"] h1{opacity:1}</style><h1>x</h1>');
    expect(validateDeck(source)).toEqual([]);
  });

  test.each(['demo.deck.html', 'tour-eiffel.deck.html'])('the bundled example %s has no issues', (file) => {
    const source = readFileSync(resolve('public/examples', file), 'utf8');
    expect(validateDeck(source)).toEqual([]);
  });

  test('flags a missing title', () => {
    expect(messages(slide(''))).toEqual([expect.stringMatching(/titre/i)]);
  });

  test('flags an invalid data-duration', () => {
    expect(messages(TITLE + slide('data-duration="vite"'))).toEqual([expect.stringMatching(/data-duration/)]);
    expect(messages(TITLE + slide('data-duration="0"'))).toEqual([expect.stringMatching(/data-duration/)]);
    expect(messages(TITLE + slide('data-duration="20"'))).toEqual([]);
  });

  test('flags invalid data-steps values with the slide they belong to', () => {
    const issues = validateDeck(TITLE + slide('') + slide('data-steps="abc"') + slide('data-steps="500"'));

    expect(issues.map((issue) => issue.slide)).toEqual([1, 2]);
    expect(issues[0].message).toMatch(/data-steps="abc"/);
    expect(issues[1].message).toMatch(/99/);
  });

  test('flags unknown transitions', () => {
    expect(messages(TITLE + slide('data-transition="explode"'))).toEqual([expect.stringMatching(/explode/)]);
  });

  test('flags builds the slide never reacts to', () => {
    expect(messages(TITLE + slide('data-steps="2"'))).toEqual([expect.stringMatching(/ne réagit pas/)]);
  });

  test('accepts builds driven by deck.onStep or deck.step', () => {
    expect(validateDeck(TITLE + slide('data-steps="2"', '<script>deck.onStep(() => {})</script>'))).toEqual([]);
    expect(validateDeck(TITLE + slide('data-steps="2"', '<script>if (deck.step > 1) {}</script>'))).toEqual([]);
  });

  test('flags CSS targeting a build that does not exist', () => {
    const body = '<style>html[data-step="1"] a, html[data-step="4"] b {}</style>';
    expect(messages(TITLE + slide('data-steps="2"', body))).toEqual([expect.stringMatching(/étape 4/)]);
  });

  test('flags interactive elements', () => {
    expect(messages(TITLE + slide('', '<button>Go</button>'))).toEqual([expect.stringMatching(/cliquables/)]);
  });

  test('flags external media but not web fonts', () => {
    const media = '<img src="https://example.com/a.png"><div style="background:url(http://cdn.test/b.jpg)"></div>';
    const fonts = '<style>@font-face{src:url(https://fonts.gstatic.com/x.woff2)}</style>';

    expect(messages(TITLE + slide('', media))).toEqual([expect.stringMatching(/example\.com, cdn\.test/)]);
    expect(validateDeck(TITLE + slide('', fonts))).toEqual([]);
  });

  test('never throws on malformed URLs', () => {
    const body = '<img src="http://[bad"><div style="background:url(http://[oops)"></div>';
    expect(() => validateDeck(TITLE + slide('', body))).not.toThrow();
    expect(validateDeck(TITLE + slide('', body))).toEqual([]);
  });

  test('returns nothing for a file without slides (parseDeck reports that)', () => {
    expect(validateDeck('<p>rien</p>')).toEqual([]);
  });
});
