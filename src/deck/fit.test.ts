import { describe, expect, test } from 'vitest';
import { fitStage } from './fit';

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
