import { describe, expect, test } from 'vitest';
import { first, goTo, last, next, prev, type Position } from './navigation';

// Slide 0 has 2 builds, slide 1 has none, slide 2 has 1.
const steps = [2, 0, 1];
const at = (slide: number, step: number): Position => ({ slide, step });

describe('next', () => {
  test('plays the next build inside the current slide first', () => {
    expect(next(at(0, 0), steps)).toEqual(at(0, 1));
    expect(next(at(0, 1), steps)).toEqual(at(0, 2));
  });

  test('moves to the next slide once all builds are played', () => {
    expect(next(at(0, 2), steps)).toEqual(at(1, 0));
    expect(next(at(1, 0), steps)).toEqual(at(2, 0));
  });

  test('stays put at the very end of the deck', () => {
    const end = at(2, 1);
    expect(next(end, steps)).toBe(end);
  });

  test('does not mutate the given position', () => {
    const position = at(0, 0);
    next(position, steps);
    expect(position).toEqual(at(0, 0));
  });
});

describe('prev', () => {
  test('rewinds builds inside the current slide first', () => {
    expect(prev(at(0, 2), steps)).toEqual(at(0, 1));
  });

  test('lands on the last build of the previous slide, like PowerPoint', () => {
    expect(prev(at(1, 0), steps)).toEqual(at(0, 2));
    expect(prev(at(2, 0), steps)).toEqual(at(1, 0));
  });

  test('stays put at the very beginning', () => {
    const start = at(0, 0);
    expect(prev(start, steps)).toBe(start);
  });
});

describe('jumps', () => {
  test('first and last go to the deck boundaries', () => {
    expect(first()).toEqual(at(0, 0));
    expect(last(steps)).toEqual(at(2, 1));
  });

  test('goTo lands on the first build of a slide and clamps out-of-range indexes', () => {
    expect(goTo(1, steps)).toEqual(at(1, 0));
    expect(goTo(-5, steps)).toEqual(at(0, 0));
    expect(goTo(42, steps)).toEqual(at(2, 0));
  });
});
