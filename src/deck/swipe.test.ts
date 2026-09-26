import { describe, expect, test } from 'vitest';
import { detectSwipe, type PointerSample } from './swipe';

const at = (x: number, y: number, time: number): PointerSample => ({ x, y, time });

describe('detectSwipe', () => {
  test('a quick swipe to the left advances, to the right goes back', () => {
    expect(detectSwipe(at(300, 200, 0), at(200, 210, 200))).toBe('next');
    expect(detectSwipe(at(200, 200, 0), at(300, 190, 200))).toBe('prev');
  });

  test('ignores short moves, so a tap stays a tap', () => {
    expect(detectSwipe(at(300, 200, 0), at(270, 200, 100))).toBeNull();
  });

  test('ignores mostly vertical moves', () => {
    expect(detectSwipe(at(300, 200, 0), at(220, 330, 200))).toBeNull();
  });

  test('ignores slow drags', () => {
    expect(detectSwipe(at(300, 200, 0), at(100, 200, 1500))).toBeNull();
  });
});
