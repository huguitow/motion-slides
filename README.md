<div align="center">

# Motion Slides

**Slides as motion design. Written by Claude, played like PowerPoint.**

Ask Claude for a presentation, get a single `.deck.html` file,<br>
drop it into Motion Slides and press <kbd>Space</kbd>.

[![CI](https://github.com/huguitow/motion-slides/actions/workflows/ci.yml/badge.svg)](https://github.com/huguitow/motion-slides/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-8b7bff.svg)](LICENSE)
![No API key](https://img.shields.io/badge/no%20API%20key-runs%20locally-3de0c5.svg)

[**Get started →**](#getting-started)

<img src="docs/media/demo.gif" alt="Motion Slides playing its demo deck: a fan of animated slides, a static slide turning into an animated chart, and an illustrated pipeline from Claude to the projector" width="100%">

</div>

## Why

PowerPoint slides are static. Claude, on the other hand, is remarkably good at hand-coding motion design in HTML, CSS, SVG and Canvas: kinetic type, charts that grow, illustrations that draw themselves.

Motion Slides is the missing piece: a **player** that turns those hand-coded pages into a real presentation tool. Full screen, click to advance, builds within a slide, overview, presenter view, PDF export. The slides themselves are just web pages, so anything a browser can render, your slides can do.

<div align="center">
<img src="docs/media/eiffel-scale.gif" alt="A slide about the Eiffel Tower: the tower is drawn to scale next to a ruler, its three levels appear, then the Montparnasse tower, Big Ben and the Statue of Liberty rise next to it at the same scale" width="100%">
<br><sub>From the bundled <em>Eiffel Tower</em> example: numbers are shown to scale, not just written.</sub>
</div>

## How it works

1. **Type your topic and copy the prompt.** On the home screen, type what your talk is about (*"The Eiffel Tower, for 14-year-olds, 10 minutes"*) and press *Copier le prompt* or <kbd>Enter</kbd>. You get the whole format specification and art-direction rules, with your topic appended.
2. **Ask any Claude.** Paste it into claude.ai, the desktop app or Claude Code. Claude returns one self-contained `.deck.html` file.
3. **Drop it into Motion Slides** and present. No account, no API key: everything runs locally in your browser.

## Getting started

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/huguitow/motion-slides.git
cd motion-slides
npm install
npm run dev
```

Then open <http://localhost:5173>. To serve a production build instead, run `npm run build` and serve the `dist/` folder with any static file server.

The prompt pushes Claude towards real visual storytelling: an identity derived from the topic (palette, fonts, a recurring motif), an SVG illustration on every slide, and every figure shown **to scale** next to familiar references.

<img src="docs/media/home.png" alt="The Motion Slides home screen: a headline, a button to copy the prompt for Claude, and a projection screen playing an example deck live with an editing-style timeline" width="100%">
<div align="center"><sub>The home screen plays a deck live, like a projection room. Drop a <code>.deck.html</code> anywhere to present it.</sub></div>

## Features

| | |
|---|---|
| **PowerPoint-style navigation** | <kbd>Space</kbd>, <kbd>→</kbd> or click to advance; <kbd>←</kbd> or right-click to go back. On-click *builds* inside a slide, and going back lands on the previous slide's last build, just like PowerPoint. |
| **Overview** | <kbd>O</kbd> opens a grid of live thumbnails; arrows + <kbd>Enter</kbd> to jump. Or type a slide number and press <kbd>Enter</kbd>. |
| **Presenter view** | <kbd>P</kbd> opens a second window with the current slide, the next build, your speaker notes, a timer and the clock. It remote-controls the audience window. |
| **PDF export** | <kbd>Ctrl</kbd>+<kbd>P</kbd> exports one 16:9 page per slide, each at its final build. |
| **Deck checker** | Generated decks are checked on load (unused builds, unknown transitions, clickable elements, external media…). The deck still plays; a ⚠ button lists the issues and copies a ready-to-paste fix request for Claude. |
| **Scales everywhere** | Slides are authored on a fixed 1920×1080 canvas and scaled to any screen, from a phone to a projector. |

<table>
  <tr>
    <td width="50%"><img src="docs/media/overview.png" alt="Overview grid showing the seven slides of the Eiffel Tower deck as live thumbnails"></td>
    <td width="50%"><img src="docs/media/presenter.png" alt="Presenter view with the current slide, the next build, speaker notes, a timer and the clock"></td>
  </tr>
  <tr>
    <td align="center"><sub>Overview (<kbd>O</kbd>)</sub></td>
    <td align="center"><sub>Presenter view (<kbd>P</kbd>)</sub></td>
  </tr>
</table>

## The `.deck.html` format

One file, one `<template>` per slide. Everything else is plain HTML, CSS and JavaScript.

```html
<meta name="deck-title" content="My talk">

<!-- Injected into every slide: fonts, shared colours, helpers -->
<template data-deck-head>
  <style>:root { --accent: #8b7bff; }</style>
</template>

<!-- A slide with 2 on-click builds and a slide-in transition -->
<template data-slide data-steps="2" data-transition="slide">
  <style>
    .point { opacity: 0; transition: opacity .6s; }
    html[data-step="1"] .p1, html[data-step="2"] .point { opacity: 1; }
  </style>
  <h1>Hello</h1>
  <p class="point p1">First build</p>
  <p class="point p2">Second build</p>
  <script>
    deck.onStep((step, direction) => { /* or drive builds from JavaScript */ });
  </script>
  <aside data-notes>Speaker notes, shown in the presenter view.</aside>
</template>
```

| Hook | What it gives you |
|---|---|
| `data-steps="N"` | Number of on-click builds before moving on |
| `data-transition` | `fade` (default), `slide` or `none` |
| `html[data-step="N"]` | Current build, for CSS-only animations |
| `.deck-entered` on `<html>` | Added when the slide becomes visible: start entrance animations |
| `deck.onStep`, `deck.onEnter`, `deck.onLeave` | JavaScript hooks, with `deck.step`, `deck.steps`, `deck.slideIndex`, `deck.slideCount` |

The full specification is the prompt itself: [`prompt/PROMPT_CLAUDE.md`](prompt/PROMPT_CLAUDE.md). Two complete examples live in [`public/examples/`](public/examples/): the [demo](public/examples/demo.deck.html) and the [Eiffel Tower](public/examples/tour-eiffel.deck.html) talk.

## Security model

A `.deck.html` file is arbitrary JavaScript, so Motion Slides treats every slide as untrusted:

- each slide runs in its own `<iframe sandbox="allow-scripts">` **without** `allow-same-origin`: it cannot read the player page, its storage or its cookies;
- a transparent shield sits above the slides, so keyboard focus and clicks always stay with the player;
- the player and slides talk only through a tiny, validated `postMessage` protocol; the presenter window uses a validated `BroadcastChannel` protocol limited to navigation.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest + jsdom)
npm run coverage   # coverage of the pure logic
npm run build      # type-check + production build in dist/
```

Built with TypeScript and Vite, no framework; the only runtime dependencies are the three bundled font families. The pure logic (parsing, navigation, validation, the slide runtime, the presenter protocol) lives in [`src/deck/`](src/deck/) and is unit-tested; the UI lives in [`src/home/`](src/home/), [`src/player/`](src/player/) and [`src/presenter/`](src/presenter/).

> **Language note:** the interface, the prompt and the example decks are in French for now. Claude answers in the language you write your topic in, and translations of the UI and prompt are very welcome.

## Roadmap ideas

- Video export (MP4/WebM) of a deck
- English and multilingual UI and prompt
- More example decks, and a gallery of community decks
- Optional "Generate" button for people who bring their own API key

## Contributing

Issues and pull requests are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Example decks and prompt improvements are especially valuable.

## License

[MIT](LICENSE) © Hugo Desjardins
