import claudePrompt from '../prompt/PROMPT_CLAUDE.md?raw';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const COPIED_LABEL_MS = 2000;

export interface HomeOptions {
  /** Called with the raw text of a deck the user picked or dropped. */
  readonly onDeckSource: (source: string, fileName: string) => void;
  readonly demoUrl: string;
}

export interface HomeHandle {
  showError(message: string): void;
  destroy(): void;
}

export function mountHome(host: HTMLElement, options: HomeOptions): HomeHandle {
  const element = document.createElement('main');
  element.className = 'home';
  element.innerHTML = `
    <header class="home-header">
      <p class="home-kicker">Motion Deck</p>
      <h1>Tes slides en <em>motion design</em>, présentées comme dans PowerPoint.</h1>
      <p class="home-lead">Claude écrit la présentation. Motion Deck la joue : espace ou clic pour avancer.</p>
    </header>

    <label class="drop-zone" tabindex="0">
      <input type="file" accept=".html,.htm,text/html" hidden>
      <span class="drop-zone-icon" aria-hidden="true">▶</span>
      <strong>Glisse ton fichier <code>.deck.html</code> ici</strong>
      <span>ou clique pour le choisir</span>
    </label>
    <p class="home-error" role="alert" hidden></p>

    <div class="home-actions">
      <button type="button" class="button button-primary" data-action="copy">Copier le prompt pour Claude</button>
      <button type="button" class="button" data-action="demo">Voir la démo</button>
    </div>

    <ol class="home-steps">
      <li><strong>Copie le prompt</strong> et colle-le dans Claude (claude.ai, l'app, Claude Code…), suivi de ton sujet.</li>
      <li><strong>Récupère le fichier</strong> <code>.deck.html</code> que Claude génère.</li>
      <li><strong>Glisse-le ici</strong>, appuie sur <kbd>F</kbd> pour le plein écran et sur <kbd>Espace</kbd> pour avancer.</li>
    </ol>

    <details class="home-prompt">
      <summary>Voir le prompt</summary>
      <textarea readonly rows="14"></textarea>
    </details>`;
  host.append(element);

  const find = <T extends Element>(selector: string) => element.querySelector<T>(selector)!;
  const input = find<HTMLInputElement>('input[type="file"]');
  const dropZone = find<HTMLLabelElement>('.drop-zone');
  const errorBox = find<HTMLParagraphElement>('.home-error');
  const copyButton = find<HTMLButtonElement>('[data-action="copy"]');
  const promptBox = find<HTMLTextAreaElement>('.home-prompt textarea');
  promptBox.value = claudePrompt;

  const showError = (message: string) => {
    errorBox.textContent = message;
    errorBox.hidden = false;
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showError(`Fichier trop lourd (${Math.round(file.size / 1024 / 1024)} Mo, maximum 20 Mo).`);
      return;
    }
    try {
      options.onDeckSource(await file.text(), file.name);
    } catch (error) {
      console.error(error);
      showError(`Impossible de lire « ${file.name} ».`);
    }
  };

  input.addEventListener('change', () => {
    void readFile(input.files?.[0]);
    input.value = '';
  });
  dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  };
  const onDragLeave = (event: DragEvent) => {
    if (event.relatedTarget === null) dropZone.classList.remove('is-dragging');
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    void readFile(event.dataTransfer?.files[0]);
  };
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);

  let copiedTimer = 0;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(claudePrompt);
      copyButton.textContent = 'Prompt copié ✓';
      window.clearTimeout(copiedTimer);
      copiedTimer = window.setTimeout(() => (copyButton.textContent = 'Copier le prompt pour Claude'), COPIED_LABEL_MS);
    } catch {
      // Clipboard can be blocked (permissions, insecure context): let the user copy it by hand.
      find<HTMLDetailsElement>('.home-prompt').open = true;
      promptBox.select();
    }
  });

  find<HTMLButtonElement>('[data-action="demo"]').addEventListener('click', async () => {
    try {
      const response = await fetch(options.demoUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      options.onDeckSource(await response.text(), 'demo.deck.html');
    } catch (error) {
      console.error(error);
      showError('Impossible de charger la démo.');
    }
  });

  return {
    showError,
    destroy() {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.clearTimeout(copiedTimer);
      element.remove();
    },
  };
}
