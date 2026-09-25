# Motion Deck

Un lecteur de présentations en motion design. Claude écrit les slides en HTML/CSS/JS dans un seul fichier `.deck.html`, Motion Deck les joue comme PowerPoint : plein écran, espace ou clic pour avancer, animations au clic, transitions.

## Utilisation

1. Ouvre l'application et clique sur **Copier le prompt pour Claude**.
2. Colle-le dans n'importe quel Claude (claude.ai, l'app, Claude Code…) suivi de ton sujet.
3. Récupère le fichier `.deck.html` généré et glisse-le dans Motion Deck.

| Touche | Action |
|---|---|
| Espace, →, ↓, Page suivante, Entrée, clic | Étape / slide suivante |
| ←, ↑, Page précédente, Retour arrière, clic droit | Étape / slide précédente |
| Début / Fin | Première / dernière slide |
| F | Plein écran |
| Échap | Quitter (hors plein écran) |

## Format `.deck.html`

La spécification complète est le prompt lui-même : [`prompt/PROMPT_CLAUDE.md`](prompt/PROMPT_CLAUDE.md). En résumé :

- une slide = un `<template data-slide>` ; `data-steps="N"` = nombre d'animations au clic ; `data-transition` = `fade` | `slide` | `none` ;
- `<template data-deck-head>` est injecté dans le `<head>` de chaque slide ;
- l'étape courante est exposée sur `<html data-step="N">` et via `deck.onStep((step, direction) => …)`.

Exemple complet : [`public/examples/demo.deck.html`](public/examples/demo.deck.html).

## Développement

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitaires (Vitest)
npm run coverage   # couverture de src/deck
npm run build      # vérification des types + build dans dist/
```

- `src/deck/` : logique pure et testée (lecture du fichier, navigation, mise à l'échelle, runtime injecté dans les slides).
- `src/player/` : la scène (iframes isolées, transitions) et le lecteur (clavier, clic, interface).
- `src/home.ts` : l'écran d'accueil.

## Sécurité

Un fichier `.deck.html` contient du JavaScript arbitraire. Chaque slide tourne dans une iframe `sandbox="allow-scripts"` sans `allow-same-origin` : elle n'a accès ni à la page du lecteur, ni à ses cookies ou à son stockage, et ne communique qu'à travers des messages `postMessage` validés.
