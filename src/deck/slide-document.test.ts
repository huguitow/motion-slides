import { describe, expect, test } from 'vitest';
import { buildSlideDocument } from './slide-document';
import type { Deck } from './types';

const deck: Deck = {
  title: 'Test',
  sharedHead: '<style>:root{--brand:#f0f}</style>',
  slides: [
    { html: '<h1>One</h1>', steps: 2, transition: 'fade', notes: '' },
    { html: '<h1>Two</h1>', steps: 0, transition: 'none', notes: '' },
  ],
};

describe('buildSlideDocument', () => {
  test('bakes the entry step into the root element to avoid a flash', () => {
    const doc = buildSlideDocument(deck, 0, 2);
    expect(doc).toMatch(/<html[^>]*data-step="2"/);
  });

  test('loads the runtime before the shared head and the slide body', () => {
    const doc = buildSlideDocument(deck, 0, 0);
    const runtime = doc.indexOf('deck:enter');
    expect(runtime).toBeGreaterThan(-1);
    expect(runtime).toBeLessThan(doc.indexOf('--brand'));
    expect(doc.indexOf('--brand')).toBeLessThan(doc.indexOf('<h1>One</h1>'));
  });

  test('exposes slide metadata to the runtime', () => {
    const doc = buildSlideDocument(deck, 1, 0);
    expect(doc).toContain('"slideIndex":1');
    expect(doc).toContain('"slideCount":2');
    expect(doc).toContain('"steps":0');
  });

  test('uses the fixed 1920x1080 reference canvas', () => {
    const doc = buildSlideDocument(deck, 0, 0);
    expect(doc).toContain('width: 1920px');
    expect(doc).toContain('height: 1080px');
  });
});
