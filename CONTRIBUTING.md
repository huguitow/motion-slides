# Contributing to Motion Deck

Thanks for your interest! Motion Deck is a small project and contributions of every size are welcome: bug reports, example decks, prompt improvements, translations and code.

## Getting started

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit tests (Vitest)
npm run build   # type-check + production build
```

## Where things live

| Path | What it is |
|---|---|
| `src/deck/` | Pure, tested logic: parsing `.deck.html`, navigation, validation, the runtime injected into slides |
| `src/player/` | The player: sandboxed slide iframes, transitions, overview, PDF export, presenter link |
| `src/presenter/` | The presenter window and its timer |
| `prompt/PROMPT_CLAUDE.md` | The prompt users paste into Claude. It is the format specification |
| `public/examples/` | Example decks, also used as test fixtures |

## Guidelines

- **Tests first** for anything in `src/deck/`: add or update the `*.test.ts` next to the module.
- **Keep the format stable.** Decks generated today must keep working. If you change the format, update `prompt/PROMPT_CLAUDE.md`, the validator (`src/deck/validate.ts`) and the example decks together.
- **Slides are untrusted code.** They always run in a `sandbox="allow-scripts"` iframe without `allow-same-origin`; never relax that, and validate every message crossing a window boundary.
- **Example decks** must pass the validator (`npm test` checks every file in `public/examples/`).

## Submitting changes

1. Fork the repository and create a branch.
2. Make your change with tests; run `npm test` and `npm run build`.
3. Open a pull request describing what changed and why. Screenshots or a GIF help a lot for visual changes.

Commit messages follow the `type: description` convention (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`).
