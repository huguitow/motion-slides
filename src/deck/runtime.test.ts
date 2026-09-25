import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { slideRuntime, type PlayerMessage } from './runtime';

interface DeckApi {
  readonly step: number;
  onEnter(fn: () => void): void;
  onStep(fn: (step: number, direction: string) => void): void;
  onLeave(fn: () => void): void;
}

// In jsdom the test window is its own parent, which stands in for the player.
const send = (message: PlayerMessage | unknown, source: Window | null = window.parent) =>
  window.dispatchEvent(new MessageEvent('message', { data: message, source }));

let deck: DeckApi;

beforeEach(() => {
  document.documentElement.dataset.step = '0';
  slideRuntime({ slideIndex: 0, slideCount: 3, steps: 2 });
  deck = (window as unknown as { deck: DeckApi }).deck;
});

afterEach(() => {
  delete (window as unknown as { deck?: unknown }).deck;
  document.documentElement.className = '';
});

describe('slideRuntime', () => {
  test('calls enter and step handlers when the player enters the slide', () => {
    const onEnter = vi.fn();
    const onStep = vi.fn();
    deck.onEnter(onEnter);
    deck.onStep(onStep);

    send({ type: 'deck:enter', step: 1 });

    expect(onEnter).toHaveBeenCalledOnce();
    expect(onStep).toHaveBeenCalledWith(1, 'enter');
    expect(document.documentElement.classList.contains('deck-entered')).toBe(true);
  });

  test('reports the direction and mirrors the step on <html data-step>', () => {
    const onStep = vi.fn();
    deck.onStep(onStep);
    send({ type: 'deck:enter', step: 0 });

    send({ type: 'deck:step', step: 2 });
    expect(onStep).toHaveBeenLastCalledWith(2, 'forward');
    expect(document.documentElement.dataset.step).toBe('2');

    send({ type: 'deck:step', step: 1 });
    expect(onStep).toHaveBeenLastCalledWith(1, 'backward');
    expect(deck.step).toBe(1);
  });

  test('runs handlers registered after the slide was entered right away', () => {
    send({ type: 'deck:enter', step: 2 });
    const onStep = vi.fn();

    deck.onStep(onStep);

    expect(onStep).toHaveBeenCalledWith(2, 'enter');
  });

  test('ignores messages that are not from the player or are malformed', () => {
    const onStep = vi.fn();
    deck.onStep(onStep);

    send({ type: 'deck:enter', step: 0 }, null);
    send({ type: 'deck:enter', step: 7 });
    send('deck:enter');
    send({ type: 'deck:step', step: 1 }); // before enter

    expect(onStep).not.toHaveBeenCalled();
  });

  test('keeps running other handlers when one slide script throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onStep = vi.fn();
    deck.onStep(() => {
      throw new Error('boom');
    });
    deck.onStep(onStep);

    send({ type: 'deck:enter', step: 0 });

    expect(onStep).toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  test('calls leave handlers', () => {
    const onLeave = vi.fn();
    deck.onLeave(onLeave);

    send({ type: 'deck:leave' });

    expect(onLeave).toHaveBeenCalledOnce();
  });
});
