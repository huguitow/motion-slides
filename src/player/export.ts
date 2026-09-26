import { embedDeck, exportFileName } from '../deck/embed';

/** The standalone player only exists in a production build (`npm run build`). */
export class ExportUnavailableError extends Error {
  constructor() {
    super('Export indisponible en développement : lance `npm run build` puis sers le dossier dist/.');
    this.name = 'ExportUnavailableError';
  }
}

// An exported presentation exports itself: its own page, captured before the app changed the DOM.
let ownShell: string | null = null;

export function rememberStandaloneShell(html: string): void {
  ownShell = html;
}

export interface ExportInput {
  readonly source: string;
  readonly title: string;
  readonly fileName: string;
}

/** Downloads `source` as a presentation that opens on its own, offline, in any browser. */
export async function exportPresentation(input: ExportInput): Promise<void> {
  const shell = await loadShell();
  const html = embedDeck(shell, input.source, input.title);
  download(new Blob([html], { type: 'text/html' }), exportFileName(input.fileName));
}

async function loadShell(): Promise<string> {
  if (ownShell) return ownShell;
  if (import.meta.env.DEV) throw new ExportUnavailableError();
  const response = await fetch(new URL('standalone.html', document.baseURI));
  if (!response.ok) throw new Error(`standalone.html : HTTP ${response.status}`);
  return response.text();
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoked later: some browsers start reading the blob only after click() returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
