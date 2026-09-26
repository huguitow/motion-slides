import { describe, expect, test } from 'vitest';
import { isInDeck, parsePresenterMessage } from './presenter-protocol';
import type { Deck } from './types';

const deck: Deck = {
  title: 'T',
  sharedHead: '',
  slides: [{ html: '<p>x</p>', steps: 1, transition: 'fade', notes: 'n' }],
};

describe('parsePresenterMessage', () => {
  test('accepts every well-formed message', () => {
    const messages = [
      { type: 'hello' },
      { type: 'end' },
      { type: 'position', position: { slide: 0, step: 1 } },
      { type: 'state', deck, position: { slide: 0, step: 0 } },
      { type: 'action', action: 'next' },
      { type: 'action', action: 'last' },
      { type: 'action', action: 'black' },
      { type: 'action', action: 'white' },
      { type: 'laser', point: { x: 0.25, y: 1 } },
      { type: 'laser', point: null },
      { type: 'blank', blank: 'black' },
      { type: 'blank', blank: 'none' },
      { type: 'autoplay', seconds: 8 },
      { type: 'autoplay', seconds: null },
      { type: 'state', deck: { ...deck, autoplay: 'loop', slides: [{ ...deck.slides[0], duration: 12 }] }, position: { slide: 0, step: 0 } },
    ];
    for (const message of messages) {
      expect(parsePresenterMessage(message)).toEqual(message);
    }
  });

  test('rejects anything that is not a known message', () => {
    expect(parsePresenterMessage(null)).toBeNull();
    expect(parsePresenterMessage('hello')).toBeNull();
    expect(parsePresenterMessage({ type: 'nope' })).toBeNull();
  });

  test('rejects actions the presenter window may not trigger', () => {
    expect(parsePresenterMessage({ type: 'action', action: 'exit' })).toBeNull();
    expect(parsePresenterMessage({ type: 'action', action: 'fullscreen' })).toBeNull();
  });

  test('rejects laser points outside the stage or not made of numbers', () => {
    expect(parsePresenterMessage({ type: 'laser', point: { x: 1.2, y: 0.5 } })).toBeNull();
    expect(parsePresenterMessage({ type: 'laser', point: { x: -0.1, y: 0.5 } })).toBeNull();
    expect(parsePresenterMessage({ type: 'laser', point: { x: '0.5', y: 0.5 } })).toBeNull();
    expect(parsePresenterMessage({ type: 'laser', point: { x: Number.NaN, y: 0.5 } })).toBeNull();
    expect(parsePresenterMessage({ type: 'laser' })).toBeNull();
  });

  test('rejects malformed auto-advance durations', () => {
    expect(parsePresenterMessage({ type: 'autoplay', seconds: -1 })).toBeNull();
    expect(parsePresenterMessage({ type: 'autoplay', seconds: '8' })).toBeNull();
    expect(parsePresenterMessage({ type: 'autoplay' })).toBeNull();
    const badDuration = { ...deck, slides: [{ ...deck.slides[0], duration: 'long' }] };
    expect(parsePresenterMessage({ type: 'state', deck: badDuration, position: { slide: 0, step: 0 } })).toBeNull();
  });

  test('rejects unknown blank screens', () => {
    expect(parsePresenterMessage({ type: 'blank', blank: 'red' })).toBeNull();
    expect(parsePresenterMessage({ type: 'blank' })).toBeNull();
  });

  test('rejects malformed positions', () => {
    expect(parsePresenterMessage({ type: 'position', position: { slide: -1, step: 0 } })).toBeNull();
    expect(parsePresenterMessage({ type: 'position', position: { slide: 1.5, step: 0 } })).toBeNull();
    expect(parsePresenterMessage({ type: 'position' })).toBeNull();
  });

  test('rejects a state whose position is outside its deck', () => {
    expect(parsePresenterMessage({ type: 'state', deck, position: { slide: 1, step: 0 } })).toBeNull();
    expect(parsePresenterMessage({ type: 'state', deck, position: { slide: 0, step: 2 } })).toBeNull();
  });

  test('isInDeck checks both the slide and its builds', () => {
    expect(isInDeck({ slide: 0, step: 1 }, deck)).toBe(true);
    expect(isInDeck({ slide: 0, step: 2 }, deck)).toBe(false);
    expect(isInDeck({ slide: 3, step: 0 }, deck)).toBe(false);
  });

  test('rejects a state whose deck is malformed', () => {
    const bad = { ...deck, slides: [{ html: 1, steps: 0, transition: 'fade', notes: '' }] };
    const badTransition = { ...deck, slides: [{ html: '', steps: 0, transition: 'explode', notes: '' }] };
    expect(parsePresenterMessage({ type: 'state', deck: bad, position: { slide: 0, step: 0 } })).toBeNull();
    expect(parsePresenterMessage({ type: 'state', deck: badTransition, position: { slide: 0, step: 0 } })).toBeNull();
    expect(parsePresenterMessage({ type: 'state', deck: { ...deck, slides: [] }, position: { slide: 0, step: 0 } })).toBeNull();
  });
});
