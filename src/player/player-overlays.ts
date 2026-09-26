import type { Blank } from '../deck/blank';
import { keyLabel, SHORTCUTS } from '../deck/keymap';

/** Shortcuts that are not a single key of the keymap, shown after it in the help. */
const EXTRA_SHORTCUTS: readonly { readonly keys: readonly string[]; readonly label: string }[] = [
  { keys: ['1', '2', '3', 'Entrée'], label: 'Aller à la slide tapée' },
  { keys: ['Ctrl+P'], label: 'Exporter en PDF' },
  { keys: ['Clic', 'Clic droit'], label: 'Avancer, revenir' },
  { keys: ['Glisser ←', 'Glisser →'], label: 'Avancer, revenir (écran tactile)' },
];

export interface Overlays {
  setBlank(blank: Blank): void;
  toggleHelp(): void;
  isHelpOpen(): boolean;
  closeHelp(): void;
}

/** Black/white screen and the keyboard help, laid over the slides. */
export function createOverlays(host: HTMLElement, onDismissBlank: () => void): Overlays {
  const blank = document.createElement('div');
  blank.className = 'player-blank';
  blank.hidden = true;
  blank.addEventListener('click', onDismissBlank);
  blank.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    onDismissBlank();
  });

  const help = createHelp();
  host.append(blank, help);

  // The dialog takes focus so assistive tech announces it, and gives it back when it closes.
  let focusBeforeHelp: HTMLElement | null = null;
  const openHelp = () => {
    focusBeforeHelp = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    help.hidden = false;
    help.focus();
  };
  const closeHelp = () => {
    if (help.hidden) return;
    help.hidden = true;
    focusBeforeHelp?.focus();
    focusBeforeHelp = null;
  };

  return {
    setBlank(value) {
      blank.hidden = value === 'none';
      blank.dataset.blank = value;
    },
    toggleHelp: () => (help.hidden ? openHelp() : closeHelp()),
    isHelpOpen: () => !help.hidden,
    closeHelp,
  };
}

function createHelp(): HTMLElement {
  const element = document.createElement('section');
  element.className = 'player-help';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', 'Raccourcis clavier');
  element.setAttribute('aria-modal', 'true');
  element.tabIndex = -1;
  element.hidden = true;

  const title = document.createElement('h2');
  title.textContent = 'Raccourcis';
  const hint = document.createElement('p');
  hint.textContent = 'Échap ou ? pour fermer';
  const list = document.createElement('dl');
  const rows = [
    ...SHORTCUTS.map((shortcut) => ({ keys: shortcut.keys.map(keyLabel), label: shortcut.label })),
    ...EXTRA_SHORTCUTS,
  ];
  for (const row of rows) {
    const keys = document.createElement('dt');
    for (const key of row.keys) {
      const kbd = document.createElement('kbd');
      kbd.textContent = key;
      keys.append(kbd);
    }
    const label = document.createElement('dd');
    label.textContent = row.label;
    list.append(keys, label);
  }
  element.append(title, hint, list);
  return element;
}
