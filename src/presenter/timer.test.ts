import { describe, expect, test } from 'vitest';
import { createTimer, formatDuration } from './timer';

function fakeClock() {
  let time = 0;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe('createTimer', () => {
  test('does not count before it is started', () => {
    const clock = fakeClock();
    const timer = createTimer(clock.now);

    clock.advance(5000);

    expect(timer.elapsedMs()).toBe(0);
    expect(timer.isRunning()).toBe(false);
  });

  test('counts once started, and start is idempotent', () => {
    const clock = fakeClock();
    const timer = createTimer(clock.now);
    timer.start();
    clock.advance(3000);
    timer.start();
    clock.advance(2000);

    expect(timer.elapsedMs()).toBe(5000);
  });

  test('pausing freezes the time and resuming continues from it', () => {
    const clock = fakeClock();
    const timer = createTimer(clock.now);
    timer.start();
    clock.advance(4000);

    timer.toggle();
    clock.advance(10_000);
    expect(timer.elapsedMs()).toBe(4000);
    expect(timer.isRunning()).toBe(false);

    timer.toggle();
    clock.advance(1000);
    expect(timer.elapsedMs()).toBe(5000);
  });

  test('reset goes back to zero without changing whether it runs', () => {
    const clock = fakeClock();
    const timer = createTimer(clock.now);
    timer.start();
    clock.advance(7000);

    timer.reset();
    clock.advance(1000);

    expect(timer.elapsedMs()).toBe(1000);
    expect(timer.isRunning()).toBe(true);
  });
});

describe('formatDuration', () => {
  test('formats minutes and seconds, adding hours only when needed', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_900)).toBe('1:05');
    expect(formatDuration(3_600_000 + 2 * 60_000 + 3000)).toBe('1:02:03');
  });
});
