import { describe, expect, test } from 'vitest';
import { MAX_RECENTS, relativeTime, resumePosition, upsertRecent, type RecentDeck } from './recents';

const recent = (name: string, openedAt: number): RecentDeck => ({
  name,
  title: name.toUpperCase(),
  source: `<template data-slide>${name}</template>`,
  slideCount: 3,
  openedAt,
  position: { slide: 0, step: 0 },
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('upsertRecent', () => {
  test('puts the deck just opened first', () => {
    const list = [recent('a', 2), recent('b', 1)];

    expect(upsertRecent(list, recent('c', 3)).map((deck) => deck.name)).toEqual(['c', 'a', 'b']);
  });

  test('keeps one entry per file name, the newest one', () => {
    const list = [recent('a', 2), recent('b', 1)];
    const updated = upsertRecent(list, { ...recent('b', 3), title: 'New' });

    expect(updated.map((deck) => deck.name)).toEqual(['b', 'a']);
    expect(updated[0].title).toBe('New');
  });

  test(`keeps at most ${MAX_RECENTS} decks`, () => {
    let list: RecentDeck[] = [];
    for (let i = 0; i < MAX_RECENTS + 3; i++) list = upsertRecent(list, recent(`d${i}`, i));

    expect(list).toHaveLength(MAX_RECENTS);
    expect(list[0].name).toBe(`d${MAX_RECENTS + 2}`);
  });

  test('does not mutate the given list', () => {
    const list = [recent('a', 1)];
    upsertRecent(list, recent('b', 2));

    expect(list.map((deck) => deck.name)).toEqual(['a']);
  });
});

describe('relativeTime', () => {
  test.each([
    [20_000, 'à l’instant'],
    [5 * MINUTE, 'il y a 5 min'],
    [2 * HOUR + 10 * MINUTE, 'il y a 2 h'],
    [DAY + HOUR, 'hier'],
    [4 * DAY, 'il y a 4 jours'],
  ])('%i ms → %s', (elapsed, label) => {
    expect(relativeTime(elapsed)).toBe(label);
  });
});

describe('resumePosition', () => {
  test('starts at the beginning when nothing was saved', () => {
    expect(resumePosition(undefined, [1, 0])).toEqual({ slide: 0, step: 0 });
  });

  test('resumes where the deck was left, clamped to the current deck', () => {
    expect(resumePosition({ slide: 1, step: 2 }, [0, 3])).toEqual({ slide: 1, step: 2 });
    expect(resumePosition({ slide: 5, step: 0 }, [0, 3])).toEqual({ slide: 1, step: 3 });
  });
});
