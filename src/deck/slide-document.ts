import { slideRuntime, type RuntimeMeta } from './runtime';
import { STAGE_HEIGHT, STAGE_WIDTH, type Deck } from './types';

const BASE_STYLE = `
  html, body {
    margin: 0;
    width: ${STAGE_WIDTH}px;
    height: ${STAGE_HEIGHT}px;
    overflow: hidden;
    background: #000;
    color: #fff;
    font-family: system-ui, sans-serif;
  }
`;

/**
 * Builds the standalone HTML document of one slide, rendered in a sandboxed iframe.
 * The entry step is baked into `<html data-step>` so step-based CSS applies before the first paint.
 */
export function buildSlideDocument(deck: Deck, slideIndex: number, step: number): string {
  const slide = deck.slides[slideIndex];
  const meta: RuntimeMeta = { slideIndex, slideCount: deck.slides.length, steps: slide.steps };

  return `<!doctype html>
<html lang="fr" data-step="${step}">
<head>
<meta charset="utf-8">
<style>${BASE_STYLE}</style>
<script>(${slideRuntime.toString()})(${JSON.stringify(meta)});</script>
${deck.sharedHead}
</head>
<body>
${slide.html}
</body>
</html>`;
}
