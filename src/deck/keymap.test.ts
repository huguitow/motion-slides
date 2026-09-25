import { describe, expect, test } from 'vitest';
import { actionForKey } from './keymap';

describe('actionForKey', () => {
  test.each([' ', 'ArrowRight', 'ArrowDown', 'PageDown', 'Enter'])('%j advances', (key) => {
    expect(actionForKey(key)).toBe('next');
  });

  test.each(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'])('%j goes back', (key) => {
    expect(actionForKey(key)).toBe('prev');
  });

  test('maps jumps, fullscreen and exit', () => {
    expect(actionForKey('Home')).toBe('first');
    expect(actionForKey('End')).toBe('last');
    expect(actionForKey('f')).toBe('fullscreen');
    expect(actionForKey('F')).toBe('fullscreen');
    expect(actionForKey('Escape')).toBe('exit');
  });

  test('ignores unrelated keys', () => {
    expect(actionForKey('a')).toBeNull();
    expect(actionForKey('Shift')).toBeNull();
  });
});
