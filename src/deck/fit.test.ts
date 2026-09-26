import { describe, expect, test } from 'vitest';
import { fitStage, stagePoint, viewportPoint } from './fit';

describe('fitStage', () => {
  test('fills a 16:9 viewport exactly', () => {
    expect(fitStage(960, 540)).toEqual({ scale: 0.5, offsetX: 0, offsetY: 0 });
  });

  test('letterboxes a viewport that is too tall', () => {
    expect(fitStage(960, 740)).toEqual({ scale: 0.5, offsetX: 0, offsetY: 100 });
  });

  test('pillarboxes a viewport that is too wide', () => {
    expect(fitStage(1160, 540)).toEqual({ scale: 0.5, offsetX: 100, offsetY: 0 });
  });

  test('returns a zero scale for an empty viewport instead of NaN', () => {
    expect(fitStage(0, 0).scale).toBe(0);
  });
});

describe('stagePoint / viewportPoint', () => {
  test('converts a viewport point to a 0–1 position on the stage, ignoring the black bars', () => {
    // 1160×540: the stage is 960 wide with 100 px bars on each side.
    expect(stagePoint(100, 0, 1160, 540)).toEqual({ x: 0, y: 0 });
    expect(stagePoint(580, 270, 1160, 540)).toEqual({ x: 0.5, y: 0.5 });
    expect(stagePoint(1060, 540, 1160, 540)).toEqual({ x: 1, y: 1 });
  });

  test('returns null outside the stage or for an empty viewport', () => {
    expect(stagePoint(50, 270, 1160, 540)).toBeNull();
    expect(stagePoint(0, 0, 0, 0)).toBeNull();
  });

  test('maps a stage position back onto another viewport', () => {
    // 960×740: 100 px bars above and below.
    expect(viewportPoint({ x: 0.5, y: 0.5 }, 960, 740)).toEqual({ x: 480, y: 370 });
    expect(viewportPoint({ x: 0, y: 1 }, 960, 740)).toEqual({ x: 0, y: 640 });
  });
});
