export type PlayerAction = 'next' | 'prev' | 'first' | 'last' | 'fullscreen' | 'exit';

const KEY_ACTIONS: Readonly<Record<string, PlayerAction>> = {
  ' ': 'next',
  ArrowRight: 'next',
  ArrowDown: 'next',
  PageDown: 'next',
  Enter: 'next',
  ArrowLeft: 'prev',
  ArrowUp: 'prev',
  PageUp: 'prev',
  Backspace: 'prev',
  Home: 'first',
  End: 'last',
  f: 'fullscreen',
  F: 'fullscreen',
  Escape: 'exit',
};

export function actionForKey(key: string): PlayerAction | null {
  return Object.hasOwn(KEY_ACTIONS, key) ? KEY_ACTIONS[key] : null;
}
