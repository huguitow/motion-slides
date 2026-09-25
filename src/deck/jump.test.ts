import { describe, expect, test } from 'vitest';
import { jumpInput } from './jump';

describe('jumpInput', () => {
  test('collects typed digits', () => {
    expect(jumpInput('', '1')).toEqual({ buffer: '1', handled: true });
    expect(jumpInput('1', '2')).toEqual({ buffer: '12', handled: true });
  });

  test('caps the buffer at three digits', () => {
    expect(jumpInput('123', '4')).toEqual({ buffer: '123', handled: true });
  });

  test('Enter with digits jumps to that slide number (zero-based) and clears', () => {
    expect(jumpInput('12', 'Enter')).toEqual({ buffer: '', handled: true, target: 11 });
  });

  test('Enter without digits is left to the normal key handling', () => {
    expect(jumpInput('', 'Enter')).toEqual({ buffer: '', handled: false });
  });

  test('Escape and Backspace cancel a pending number', () => {
    expect(jumpInput('4', 'Escape')).toEqual({ buffer: '', handled: true });
    expect(jumpInput('4', 'Backspace')).toEqual({ buffer: '', handled: true });
  });

  test('any other key drops the pending number and is handled normally', () => {
    expect(jumpInput('4', 'ArrowRight')).toEqual({ buffer: '', handled: false });
    expect(jumpInput('', 'Escape')).toEqual({ buffer: '', handled: false });
  });

  test('slide number 0 is clamped to the first slide', () => {
    expect(jumpInput('0', 'Enter')).toEqual({ buffer: '', handled: true, target: 0 });
  });
});
