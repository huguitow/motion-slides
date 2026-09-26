import { defineConfig, type Plugin } from 'vite';

/**
 * Builds dist/standalone.html: the whole player (scripts, styles and fonts) in one HTML file.
 * The player's "Exporter" button fills it with a deck, giving a presentation that opens anywhere.
 * Runs after the main build, into the same folder.
 */
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    // Fonts become data: URLs inside the CSS, which is then inlined into the page.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { input: 'standalone.html' },
  },
  plugins: [inlineIntoHtml()],
});

/** Replaces the page's script and stylesheet links by their content, then drops those files. */
function inlineIntoHtml(): Plugin {
  return {
    name: 'motion-slides:inline-into-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const take = (url: string): string => {
        const fileName = url.replace(/^\.\//, '');
        const output = bundle[fileName];
        if (!output) throw new Error(`Standalone build: ${fileName} is not in the bundle.`);
        delete bundle[fileName];
        return output.type === 'chunk' ? output.code : String(output.source);
      };
      // One pass over the page as Vite wrote it: the inlined code itself contains tag-like strings
      // (the prompt, example decks) that a second pass would wrongly rewrite.
      const LOCAL_TAG = /<script\b[^>]*\ssrc="(\.\/[^"]+)"[^>]*><\/script>|<link\b[^>]*\srel="stylesheet"[^>]*\shref="(\.\/[^"]+)"[^>]*>/g;
      for (const output of Object.values(bundle)) {
        if (output.type !== 'asset' || !output.fileName.endsWith('.html')) continue;
        output.source = String(output.source).replace(LOCAL_TAG, (_tag, script?: string, style?: string) =>
          script
            ? // `</script` inside the code would end the inline script: `<\/script` means the same in JS.
              `<script type="module">${take(script).replace(/<\/script/gi, '<\\/script')}</script>`
            : `<style>${take(style!).replace(/<\/style/gi, '<\\/style')}</style>`,
        );
      }
      // A dynamic import, a worker or a non-inlined asset would ship next to the page and break the
      // single-file export: fail the build instead.
      const leftovers = Object.keys(bundle).filter((fileName) => !fileName.endsWith('.html'));
      if (leftovers.length > 0) {
        throw new Error(`Standalone build: not inlined into the page: ${leftovers.join(', ')}.`);
      }
    },
  };
}
