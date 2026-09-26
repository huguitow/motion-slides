import { describe, expect, test } from 'vitest';
import { actionForKey, actionForKeyEvent, KEY_ACTIONS, keyLabel, SHORTCUTS } from './keymap';

describe('actionForKey', () => {
  test.each([' ', 'ArrowRight', 'ArrowDown', 'PageDown', 'Enter'])('%j advances', (key) => {
    expect(actionForKey(key)).toBe('next');
  });

  test.each(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'])('%j goes back', (key) => {
    expect(actionForKey(key)).toBe('prev');
  });

  test.each(['e', 'E'])('%j opens the slide retouch panel', (key) => {
    expect(actionForKey(key)).toBe('retouch');
  });

  test('maps jumps, fullscreen and exit', () => {
    expect(actionForKey('Home')).toBe('first');
    expect(actionForKey('End')).toBe('last');
    expect(actionForKey('f')).toBe('fullscreen');
    expect(actionForKey('F')).toBe('fullscreen');
    expect(actionForKey('Escape')).toBe('exit');
  });

  test('maps the overview and presenter view', () => {
    expect(actionForKey('o')).toBe('overview');
    expect(actionForKey('O')).toBe('overview');
    expect(actionForKey('p')).toBe('presenter');
    expect(actionForKey('P')).toBe('presenter');
  });

  test('maps PowerPoint blank screens, the laser and the help', () => {
    for (const key of ['b', 'B', '.']) expect(actionForKey(key)).toBe('black');
    for (const key of ['w', 'W', ',']) expect(actionForKey(key)).toBe('white');
    expect(actionForKey('l')).toBe('laser');
    expect(actionForKey('L')).toBe('laser');
    expect(actionForKey('?')).toBe('help');
  });

  test('maps F5, sent by presentation remotes, to fullscreen', () => {
    expect(actionForKey('F5')).toBe('fullscreen');
  });

  test('ignores unrelated keys', () => {
    expect(actionForKey('a')).toBeNull();
    expect(actionForKey('Shift')).toBeNull();
  });
});

describe('actionForKeyEvent', () => {
  const press = (key: string, modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {}) =>
    actionForKeyEvent({ key, ctrlKey: false, metaKey: false, altKey: false, ...modifiers });

  test('maps plain keys like actionForKey', () => {
    expect(press('b')).toBe('black');
  });

  test('still navigates while Ctrl is held for the laser pointer', () => {
    expect(press('ArrowRight', { ctrlKey: true })).toBe('next');
    expect(press('PageUp', { ctrlKey: true })).toBe('prev');
  });

  test('leaves other Ctrl, Alt and Cmd combinations to the browser', () => {
    expect(press('b', { ctrlKey: true })).toBeNull();
    expect(press('ArrowRight', { altKey: true })).toBeNull();
    expect(press('ArrowRight', { metaKey: true })).toBeNull();
    expect(press('Control', { ctrlKey: true })).toBeNull();
  });
});

describe('SHORTCUTS', () => {
  test('every listed key really triggers the listed action', () => {
    for (const shortcut of SHORTCUTS) {
      for (const key of shortcut.keys) expect(actionForKey(key), key).toBe(shortcut.action);
    }
  });

  test('documents every action the keyboard can trigger', () => {
    const documented = new Set(SHORTCUTS.map((shortcut) => shortcut.action));
    for (const action of Object.values(KEY_ACTIONS)) expect(documented, action).toContain(action);
  });

  test('gives readable names to special keys', () => {
    expect(keyLabel(' ')).toBe('Espace');
    expect(keyLabel('ArrowRight')).toBe('→');
    expect(keyLabel('Escape')).toBe('Échap');
    expect(keyLabel('b')).toBe('B');
  });
});
