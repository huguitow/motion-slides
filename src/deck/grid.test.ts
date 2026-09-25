import { describe, expect, test } from 'vitest';
import { moveSelection } from './grid';

// 10 thumbnails laid out in 4 columns:
//  0  1  2  3
//  4  5  6  7
//  8  9
const move = (index: number, key: string) => moveSelection(index, key, 10, 4);

describe('moveSelection', () => {
  test('moves horizontally and wraps across rows', () => {
    expect(move(1, 'ArrowRight')).toBe(2);
    expect(move(3, 'ArrowRight')).toBe(4);
    expect(move(4, 'ArrowLeft')).toBe(3);
  });

  test('moves vertically by one row', () => {
    expect(move(1, 'ArrowDown')).toBe(5);
    expect(move(5, 'ArrowUp')).toBe(1);
  });

  test('clamps to the first and last thumbnails', () => {
    expect(move(0, 'ArrowLeft')).toBe(0);
    expect(move(1, 'ArrowUp')).toBe(1);
    expect(move(9, 'ArrowRight')).toBe(9);
    expect(move(7, 'ArrowDown')).toBe(9);
  });

  test('Home and End jump to the ends', () => {
    expect(move(5, 'Home')).toBe(0);
    expect(move(5, 'End')).toBe(9);
  });

  test('returns null for keys that do not move the selection', () => {
    expect(move(5, 'Enter')).toBeNull();
    expect(move(5, 'a')).toBeNull();
  });
});
