import { describe, expect, test } from 'vitest';
import { applyBlank } from './blank';

describe('applyBlank', () => {
  test('B and W blank the screen without any other effect', () => {
    expect(applyBlank('none', 'black')).toEqual({ blank: 'black', action: null });
    expect(applyBlank('none', 'white')).toEqual({ blank: 'white', action: null });
  });

  test('pressing the same key again brings the slide back', () => {
    expect(applyBlank('black', 'black')).toEqual({ blank: 'none', action: null });
    expect(applyBlank('white', 'white')).toEqual({ blank: 'none', action: null });
  });

  test('switches directly between black and white', () => {
    expect(applyBlank('black', 'white')).toEqual({ blank: 'white', action: null });
  });

  test('any other action only brings the slide back, like PowerPoint', () => {
    expect(applyBlank('black', 'next')).toEqual({ blank: 'none', action: null });
    expect(applyBlank('white', 'prev')).toEqual({ blank: 'none', action: null });
  });

  test('lets actions through when nothing is blanked', () => {
    expect(applyBlank('none', 'next')).toEqual({ blank: 'none', action: 'next' });
  });
});
