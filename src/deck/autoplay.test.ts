import { describe, expect, test } from 'vitest';
import {
  AUTOPLAY_SECONDS,
  autoplayNext,
  nextAutoplaySeconds,
  stopDurationMs,
  withAutoplayMeta,
} from './autoplay';
import { parseDeck } from './parse';
import type { Slide } from './types';

const slide = (duration?: number): Slide => ({ html: '', steps: 0, transition: 'fade', notes: '', duration });

describe('stopDurationMs', () => {
  test('uses the slide’s own duration when it has one, otherwise the player’s', () => {
    expect(stopDurationMs(slide(12), 8)).toBe(12_000);
    expect(stopDurationMs(slide(), 8)).toBe(8_000);
  });
});

describe('autoplayNext', () => {
  // Slide 0 has 1 build, slide 1 none.
  const steps = [1, 0];

  test('plays every build, like pressing Space at regular intervals', () => {
    expect(autoplayNext({ slide: 0, step: 0 }, steps)).toEqual({ slide: 0, step: 1 });
    expect(autoplayNext({ slide: 0, step: 1 }, steps)).toEqual({ slide: 1, step: 0 });
  });

  test('loops back to the very beginning after the last build', () => {
    expect(autoplayNext({ slide: 1, step: 0 }, steps)).toEqual({ slide: 0, step: 0 });
  });
});

describe('nextAutoplaySeconds', () => {
  test('cycles through the offered durations', () => {
    expect(AUTOPLAY_SECONDS).toEqual([5, 8, 15, 30]);
    expect(nextAutoplaySeconds(5)).toBe(8);
    expect(nextAutoplaySeconds(30)).toBe(5);
  });

  test('goes back to the first duration from any other value', () => {
    expect(nextAutoplaySeconds(12)).toBe(5);
  });
});

describe('withAutoplayMeta', () => {
  const deck = '<meta name="deck-title" content="T"><template data-slide>x</template>';

  test('turns a deck into a kiosk deck', () => {
    expect(parseDeck(withAutoplayMeta(deck)).autoplay).toBe('loop');
    expect(parseDeck(withAutoplayMeta(deck)).title).toBe('T');
  });

  test('leaves a deck that already loops untouched', () => {
    const looping = withAutoplayMeta(deck);
    expect(withAutoplayMeta(looping)).toBe(looping);
  });

  test('is not fooled by the meta shown as text inside a slide', () => {
    const tutorial = `<meta name="deck-title" content="T"><template data-slide><script>const code = '<meta name="deck-autoplay" content="loop">';</script></template>`;

    expect(parseDeck(withAutoplayMeta(tutorial)).autoplay).toBe('loop');
    expect(withAutoplayMeta(tutorial)).toContain(`const code = '<meta name="deck-autoplay" content="loop">'`);
  });

  test('keeps the doctype first and puts the meta inside <head>', () => {
    const page = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n</head>\n<body><template data-slide>x</template></body></html>';
    const result = withAutoplayMeta(page);

    expect(result.startsWith('<!doctype html>')).toBe(true);
    expect(result).toMatch(/<head>\s*<meta name="deck-autoplay" content="loop">/);
    expect(new DOMParser().parseFromString(result, 'text/html').compatMode).toBe('CSS1Compat');
  });

  test('replaces another deck-autoplay value instead of adding a second meta', () => {
    const other = `<meta name="deck-autoplay" content="no">${deck}`;
    expect(withAutoplayMeta(other).match(/deck-autoplay/g)).toHaveLength(1);
    expect(parseDeck(withAutoplayMeta(other)).autoplay).toBe('loop');
  });
});
