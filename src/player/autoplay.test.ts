import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createAutoplay } from './autoplay';

function setup(durationMs = 1000) {
  const track = document.createElement('div');
  const bar = document.createElement('div');
  track.append(bar);
  const onAdvance = vi.fn();
  const onChange = vi.fn();
  const autoplay = createAutoplay({ bar, durationMs: () => durationMs, onAdvance, onChange });
  return { autoplay, onAdvance, onChange, track };
}

describe('createAutoplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // A fresh in-memory storage per test: the pace is remembered across players, not across tests.
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('advances after each build’s duration once started, and reports its pace', () => {
    const { autoplay, onAdvance, onChange, track } = setup();

    autoplay.start();
    expect(onChange).toHaveBeenLastCalledWith(8);
    expect(track.classList.contains('is-running')).toBe(true);
    vi.advanceTimersByTime(999);
    expect(onAdvance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  test('does nothing until started', () => {
    const { onAdvance } = setup();

    vi.advanceTimersByTime(10_000);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  test('stops when toggled off', () => {
    const { autoplay, onAdvance, onChange } = setup();

    autoplay.start();
    autoplay.toggle();
    vi.advanceTimersByTime(5000);
    expect(onAdvance).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  test('a pause keeps the time left, and resuming only waits for it', () => {
    const { autoplay, onAdvance } = setup();

    autoplay.start();
    vi.advanceTimersByTime(400);
    autoplay.setPaused(true);
    vi.advanceTimersByTime(5000);
    expect(onAdvance).not.toHaveBeenCalled();
    autoplay.setPaused(false);
    vi.advanceTimersByTime(599);
    expect(onAdvance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  test('restart starts the countdown over, even while paused', () => {
    const { autoplay, onAdvance } = setup();

    autoplay.start();
    vi.advanceTimersByTime(900);
    autoplay.restart();
    vi.advanceTimersByTime(900);
    expect(onAdvance).not.toHaveBeenCalled();
    autoplay.setPaused(true);
    autoplay.restart();
    autoplay.setPaused(false);
    vi.advanceTimersByTime(1000);
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  test('a pause before starting holds the first countdown until resumed', () => {
    const { autoplay, onAdvance } = setup();

    autoplay.setPaused(true);
    autoplay.start();
    vi.advanceTimersByTime(5000);
    expect(onAdvance).not.toHaveBeenCalled();
    autoplay.setPaused(false);
    vi.advanceTimersByTime(1000);
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  test('cycles its pace, remembers it, and reports it while running', () => {
    const first = setup();
    first.autoplay.start();

    expect(first.autoplay.cycleSeconds()).toBe(15);
    expect(first.onChange).toHaveBeenLastCalledWith(15);
    expect(setup().autoplay.seconds()).toBe(15);
  });

  test('never advances after being destroyed', () => {
    const { autoplay, onAdvance } = setup();

    autoplay.start();
    autoplay.destroy();
    vi.advanceTimersByTime(5000);
    expect(onAdvance).not.toHaveBeenCalled();
  });
});
