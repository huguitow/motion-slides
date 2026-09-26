export type PlayerAction =
  | 'next'
  | 'prev'
  | 'first'
  | 'last'
  | 'fullscreen'
  | 'overview'
  | 'presenter'
  | 'pdf'
  | 'export'
  | 'retouch'
  | 'black'
  | 'white'
  | 'laser'
  | 'help'
  | 'autoplay'
  | 'exit';

/** PowerPoint's slide show keys, which presentation remotes also send (PageDown, B, F5…). */
export const KEY_ACTIONS: Readonly<Record<string, PlayerAction>> = {
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
  F5: 'fullscreen',
  o: 'overview',
  O: 'overview',
  p: 'presenter',
  P: 'presenter',
  e: 'retouch',
  E: 'retouch',
  b: 'black',
  B: 'black',
  '.': 'black',
  w: 'white',
  W: 'white',
  ',': 'white',
  l: 'laser',
  L: 'laser',
  '?': 'help',
  a: 'autoplay',
  A: 'autoplay',
  Escape: 'exit',
};

export function actionForKey(key: string): PlayerAction | null {
  return Object.hasOwn(KEY_ACTIONS, key) ? KEY_ACTIONS[key] : null;
}

export interface KeyPress {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

/**
 * Action for a key press, modifiers included. Combinations are left to the browser, except that
 * navigation still works while Ctrl is held down to show the laser pointer.
 */
export function actionForKeyEvent(press: KeyPress): PlayerAction | null {
  if (press.metaKey || press.altKey) return null;
  const action = actionForKey(press.key);
  if (!press.ctrlKey) return action;
  return action === 'next' || action === 'prev' ? action : null;
}

export interface Shortcut {
  readonly action: PlayerAction;
  /** Keys shown in the help, a subset of those bound in KEY_ACTIONS. */
  readonly keys: readonly string[];
  readonly label: string;
}

/** What the help panel lists, in order. Tests check it agrees with KEY_ACTIONS. */
export const SHORTCUTS: readonly Shortcut[] = [
  { action: 'next', keys: [' ', 'ArrowRight', 'PageDown'], label: 'Avancer' },
  { action: 'prev', keys: ['ArrowLeft', 'PageUp'], label: 'Revenir' },
  { action: 'first', keys: ['Home'], label: 'Première slide' },
  { action: 'last', keys: ['End'], label: 'Dernière slide' },
  { action: 'overview', keys: ['o'], label: 'Vue d’ensemble' },
  { action: 'presenter', keys: ['p'], label: 'Vue présentateur' },
  { action: 'fullscreen', keys: ['f', 'F5'], label: 'Plein écran' },
  { action: 'black', keys: ['b', '.'], label: 'Écran noir' },
  { action: 'white', keys: ['w', ','], label: 'Écran blanc' },
  { action: 'laser', keys: ['l'], label: 'Pointeur laser (ou maintenir Ctrl)' },
  { action: 'autoplay', keys: ['a'], label: 'Défilement automatique (en boucle)' },
  { action: 'retouch', keys: ['e'], label: 'Retoucher la slide avec Claude' },
  { action: 'help', keys: ['?'], label: 'Cette aide' },
  { action: 'exit', keys: ['Escape'], label: 'Quitter' },
];

const KEY_LABELS: Readonly<Record<string, string>> = {
  ' ': 'Espace',
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowDown: '↓',
  PageDown: 'Page ↓',
  PageUp: 'Page ↑',
  Home: 'Début',
  End: 'Fin',
  Escape: 'Échap',
};

export function keyLabel(key: string): string {
  return Object.hasOwn(KEY_LABELS, key) ? KEY_LABELS[key] : key.toUpperCase();
}
