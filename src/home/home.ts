import claudePrompt from '../../prompt/PROMPT_CLAUDE.md?raw';
import { parseDeck } from '../deck/parse';
import { ICONS } from '../ui/icons';
import { canPickFileHandles, droppedFileHandle, pickFileHandle } from './open-file';
import { mountPreview, type PreviewHandle } from './preview';
import { buildPrompt } from './prompt';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const COPIED_LABEL_MS = 2200;
const REPOSITORY_URL = 'https://github.com/huguitow/motion-slides';

const EXAMPLES = [
  { file: 'demo.deck.html', label: 'La démo' },
  { file: 'tour-eiffel.deck.html', label: 'La tour Eiffel' },
] as const;

export interface HomeOptions {
  /**
   * Called with the raw text of a deck the user picked, dropped or chose among the examples.
   * `handle` is given when the browser lets the player follow later edits of the file.
   */
  readonly onDeckSource: (source: string, fileName: string, handle?: FileSystemFileHandle) => void;
  /** Base URL of the bundled example decks. */
  readonly examplesUrl: string;
}

export interface HomeHandle {
  showError(message: string): void;
  destroy(): void;
}

export function mountHome(host: HTMLElement, options: HomeOptions): HomeHandle {
  const dom = createHomeDom();
  host.append(dom.element);

  const showError = (message: string) => {
    dom.error.textContent = message;
    dom.error.hidden = false;
  };

  const stopFiles = bindFiles(dom, options, showError);
  const stopCopy = bindCopy(dom);
  const preview = mountPreview({ viewport: dom.viewport, timeline: dom.timeline, timecode: dom.timecode });
  bindExamples(dom, options, preview, showError);

  return {
    showError,
    destroy() {
      stopFiles();
      stopCopy();
      preview.destroy();
      dom.element.remove();
    },
  };
}

/** File picker plus a whole-window drop target with a full-screen overlay. */
function bindFiles(dom: HomeDom, options: HomeOptions, showError: (message: string) => void): () => void {
  const readFile = async (file: File | undefined, handle?: FileSystemFileHandle | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      return showError(`Fichier trop lourd (${Math.round(file.size / 1024 / 1024)} Mo, maximum 20 Mo).`);
    }
    try {
      options.onDeckSource(await file.text(), file.name, handle ?? undefined);
    } catch (error) {
      console.error(error);
      showError(`Impossible de lire « ${file.name} ».`);
    }
  };

  // The system picker returns a handle the player can watch; the <input> is the fallback elsewhere.
  const pickFile = async () => {
    try {
      const handle = await pickFileHandle();
      if (handle) await readFile(await handle.getFile(), handle);
    } catch (error) {
      console.error(error);
      showError('Impossible d’ouvrir ce fichier.');
    }
  };

  dom.open.addEventListener('click', () => (canPickFileHandles() ? void pickFile() : dom.input.click()));
  dom.input.addEventListener('change', () => {
    void readFile(dom.input.files?.[0]);
    dom.input.value = '';
  });

  let depth = 0;
  const setDragging = (dragging: boolean) => dom.element.classList.toggle('is-dragging', dragging);
  const onDragEnter = (event: DragEvent) => {
    event.preventDefault();
    depth++;
    setDragging(true);
  };
  const onDragOver = (event: DragEvent) => event.preventDefault();
  const onDragLeave = () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) setDragging(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    depth = 0;
    setDragging(false);
    const file = event.dataTransfer?.files[0];
    const handle = droppedFileHandle(event);
    void handle.then((resolved) => readFile(file, resolved));
  };
  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);
  return () => {
    window.removeEventListener('dragenter', onDragEnter);
    window.removeEventListener('dragover', onDragOver);
    window.removeEventListener('dragleave', onDragLeave);
    window.removeEventListener('drop', onDrop);
  };
}

/** Copies the prompt followed by the typed topic; the "Lire le prompt" panel always shows that exact text. */
function bindCopy(dom: HomeDom): () => void {
  let timer = 0;
  const label = dom.copy.innerHTML;
  const fullPrompt = () => buildPrompt(claudePrompt, dom.topic.value);

  const refreshScript = () => {
    const text = fullPrompt();
    dom.scriptText.textContent = text;
    dom.scriptMeta.textContent = `${text.split('\n').length} lignes · Markdown`;
  };
  const fitTopic = () => {
    dom.topic.style.height = 'auto';
    // scrollHeight excludes the borders, which box-sizing: border-box counts in the height.
    const borders = dom.topic.offsetHeight - dom.topic.clientHeight;
    dom.topic.style.height = `${dom.topic.scrollHeight + borders}px`;
  };

  const copy = async (button: HTMLButtonElement) => {
    const hasTopic = dom.topic.value.trim() !== '';
    try {
      await navigator.clipboard.writeText(fullPrompt());
      button.classList.add('is-done');
      if (button === dom.copy) {
        const done = hasTopic ? 'Copié avec ton sujet' : 'Copié, sans sujet';
        button.innerHTML = `${ICONS.check}<span>${done}</span>`;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        button.classList.remove('is-done');
        if (button === dom.copy) button.innerHTML = label;
      }, COPIED_LABEL_MS);
    } catch {
      // Clipboard can be blocked (permissions, insecure context): show the prompt to copy by hand.
      dom.script.open = true;
      dom.script.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  dom.copy.addEventListener('click', () => void copy(dom.copy));
  dom.scriptCopy.addEventListener('click', () => void copy(dom.scriptCopy));
  dom.topic.addEventListener('input', () => {
    fitTopic();
    refreshScript();
  });
  // Enter copies; Shift+Enter adds a line for details (audience, duration…).
  dom.topic.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    void copy(dom.copy);
  });
  refreshScript();
  return () => window.clearTimeout(timer);
}

/** The projection screen plays an example; the reel buttons switch it, "Présenter" opens it for real. */
function bindExamples(dom: HomeDom, options: HomeOptions, preview: PreviewHandle, showError: (message: string) => void) {
  const sources = new Map<string, string>();
  let current: string = EXAMPLES[0].file;

  const fetchSource = async (file: string) => {
    const cached = sources.get(file);
    if (cached) return cached;
    const response = await fetch(`${options.examplesUrl}${file}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source = await response.text();
    sources.set(file, source);
    return source;
  };

  const play = async (file: string) => {
    current = file;
    dom.reels.forEach((reel) => reel.classList.toggle('is-active', reel.dataset.example === file));
    try {
      const deck = parseDeck(await fetchSource(file));
      // A faster click on another reel may have happened while this one was loading.
      if (current !== file) return;
      dom.deckName.textContent = deck.title;
      preview.load(deck);
    } catch (error) {
      console.error(error);
      showError(`Impossible de charger l'exemple « ${file} ».`);
    }
  };

  const present = async () => {
    try {
      options.onDeckSource(await fetchSource(current), current);
    } catch (error) {
      console.error(error);
      showError(`Impossible d'ouvrir l'exemple « ${current} ».`);
    }
  };

  dom.reels.forEach((reel) => reel.addEventListener('click', () => void play(reel.dataset.example!)));
  dom.present.addEventListener('click', () => void present());
  dom.screen.addEventListener('click', () => void present());
  dom.screen.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    void present();
  });
  void play(current);
}

type HomeDom = ReturnType<typeof createHomeDom>;

function createHomeDom() {
  const element = document.createElement('div');
  element.className = 'home';
  element.innerHTML = `
    <header class="topbar">
      <span class="wordmark"><span class="wordmark-motion">Motion</span> Slides</span>
      <a class="topbar-link" href="${REPOSITORY_URL}" target="_blank" rel="noopener">${ICONS.github}<span>Code source</span></a>
    </header>

    <main class="hero">
      <section class="hero-copy">
        <p class="eyebrow"><span class="tally" aria-hidden="true"></span>Lecteur de présentations</p>
        <h1>Des slides<br>qui <em>bougent</em>.</h1>
        <p class="lead">Claude écrit ta présentation en motion design, dans un seul fichier. Motion Slides la projette comme PowerPoint&nbsp;: une touche, et ça avance.</p>
        <label class="topic">
          <span class="topic-label">Sujet de ta présentation</span>
          <textarea rows="1" placeholder="La tour Eiffel, pour une classe de 3e, 10 minutes" data-topic></textarea>
          <span class="topic-hint"><kbd>Entrée</kbd> pour copier · <kbd>Maj</kbd>+<kbd>Entrée</kbd> pour aller à la ligne</span>
        </label>
        <div class="actions">
          <button type="button" class="button button-primary" data-action="copy">${ICONS.copy}<span>Copier le prompt</span></button>
          <button type="button" class="button" data-action="open">${ICONS.open}<span>Ouvrir un fichier</span></button>
        </div>
        <p class="hint">ou glisse ton <code>.deck.html</code> n'importe où sur la page</p>
        <p class="home-error" role="alert" hidden></p>
      </section>

      <figure class="projector">
        <div class="projector-screen" role="button" tabindex="0" aria-label="Présenter l'exemple en plein écran">
          <div class="projector-viewport"></div>
          <span class="crop crop-tl"></span><span class="crop crop-tr"></span><span class="crop crop-bl"></span><span class="crop crop-br"></span>
        </div>
        <figcaption class="projector-bar">
          <span class="on-air"><span class="tally" aria-hidden="true"></span>En lecture</span>
          <span class="deck-name"></span>
          <span class="timecode">00 / 00</span>
        </figcaption>
        <div class="timeline" aria-hidden="true"></div>
        <div class="reels">
          ${EXAMPLES.map((example) => `<button type="button" class="reel" data-example="${example.file}">${example.label}</button>`).join('')}
          <button type="button" class="reel reel-present" data-action="present">Présenter ${ICONS.external}</button>
        </div>
      </figure>
    </main>

    <section class="cues" aria-label="Comment ça marche">
      <ol>
        <li><span class="cue-number">01</span><h2>Copie le prompt</h2><p>Tape ton sujet, copie : tu obtiens tout le format et la direction artistique, avec ton sujet à la fin. Colle-le dans Claude (claude.ai, l'app, Claude Code).</p></li>
        <li><span class="cue-number">02</span><h2>Récupère le fichier</h2><p>Claude renvoie un seul fichier <code>.deck.html</code> : chaque slide est une petite page web animée.</p></li>
        <li><span class="cue-number">03</span><h2>Projette</h2><p><kbd>F</kbd> pour le plein écran, <kbd>Espace</kbd> pour avancer, <kbd>P</kbd> pour la vue présentateur.</p></li>
      </ol>
    </section>

    <details class="script">
      <summary><span>Lire le prompt</span><span class="script-meta"></span></summary>
      <div class="script-body">
        <button type="button" class="button script-copy">${ICONS.copy}<span>Copier</span></button>
        <pre></pre>
      </div>
    </details>

    <footer class="footer">
      <span>Open source · licence MIT</span>
      <span>Aucune installation, aucune clé d'API : tout reste dans ton navigateur.</span>
    </footer>

    <div class="drop-overlay" aria-hidden="true"><div><strong>Lâche ton fichier</strong><span>.deck.html</span></div></div>
    <input type="file" accept=".html,.htm,text/html" hidden>`;

  const find = <T extends Element>(selector: string) => element.querySelector<T>(selector)!;

  return {
    element,
    topic: find<HTMLTextAreaElement>('[data-topic]'),
    scriptText: find<HTMLPreElement>('.script pre'),
    scriptMeta: find<HTMLElement>('.script-meta'),
    copy: find<HTMLButtonElement>('[data-action="copy"]'),
    open: find<HTMLButtonElement>('[data-action="open"]'),
    present: find<HTMLButtonElement>('[data-action="present"]'),
    input: find<HTMLInputElement>('input[type="file"]'),
    error: find<HTMLParagraphElement>('.home-error'),
    screen: find<HTMLElement>('.projector-screen'),
    viewport: find<HTMLElement>('.projector-viewport'),
    timeline: find<HTMLElement>('.timeline'),
    timecode: find<HTMLElement>('.timecode'),
    deckName: find<HTMLElement>('.deck-name'),
    reels: [...element.querySelectorAll<HTMLButtonElement>('.reel[data-example]')],
    script: find<HTMLDetailsElement>('.script'),
    scriptCopy: find<HTMLButtonElement>('.script-copy'),
  };
}
