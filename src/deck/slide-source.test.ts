import { describe, expect, test } from 'vitest';
import { slideSource } from './slide-source';

const deck = [
  '<meta name="deck-title" content="Talk">',
  '<template data-deck-head><style>:root { --a: red; }</style></template>',
  '<template data-slide data-steps="2"><h1>First</h1><aside data-notes>Say hi</aside></template>',
  '<template data-slide data-transition="slide"><h1>Second</h1></template>',
].join('\n');

describe('slideSource', () => {
  test('returns the whole template of the requested slide, attributes and notes included', () => {
    const source = slideSource(deck, 0);

    expect(source).toMatch(/^<template data-slide="" data-steps="2">/);
    expect(source).toContain('<h1>First</h1>');
    expect(source).toContain('<aside data-notes="">Say hi</aside>');
    expect(source).toMatch(/<\/template>$/);
  });

  test('skips the shared head template when counting slides', () => {
    expect(slideSource(deck, 1)).toContain('<h1>Second</h1>');
  });

  test('returns null for an index outside the deck', () => {
    expect(slideSource(deck, 2)).toBeNull();
    expect(slideSource(deck, -1)).toBeNull();
  });
});
