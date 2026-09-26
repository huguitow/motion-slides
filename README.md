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
| Numéro puis Entrée | Aller à cette slide |
| O | Vue d'ensemble (flèches + Entrée pour choisir) |
| P | Vue présentateur (autre fenêtre) |
| F | Plein écran |
| Ctrl+P ou ⎙ | Exporter en PDF (une page par slide, à sa dernière étape) |
| Échap | Quitter (hors plein écran) |

**Vérification** : au chargement, Motion Deck repère les erreurs fréquentes d'un deck généré (titre manquant, `data-steps` invalide ou jamais utilisé, étape ciblée inexistante, transition inconnue, éléments cliquables, médias externes). La présentation reste jouable ; un bouton ⚠ liste les points et « Copier pour Claude » prépare la demande de correction à coller dans Claude.

**Export PDF** : choisis « Enregistrer au format PDF » dans la fenêtre d'impression. Chaque page fait 1920×1080 ; les animations d'entrée ont 2,5 s pour se terminer avant la capture. Les effets de flou (`filter: blur`) peuvent être rendus avec des bords nets à l'impression.

**Vue présentateur** : une seconde fenêtre affiche la slide en cours, la prochaine étape, les notes (`<aside data-notes>`), un chronomètre et l'heure. Elle pilote la présentation : mets la fenêtre principale en plein écran sur le projecteur et garde la vue présentateur sur ton écran. Les deux fenêtres communiquent localement via `BroadcastChannel` (même navigateur, même origine) ; autorise les pop-ups si le navigateur bloque l'ouverture.

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
npm run coverage   # couverture de la logique pure (src/deck, chronomètre)
npm run build      # vérification des types + build dans dist/
```

- `src/deck/` : logique pure et testée (lecture du fichier, navigation, mise à l'échelle, runtime injecté dans les slides).
- `src/player/` : la scène (iframes isolées, transitions), le lecteur (clavier, clic, interface), la vue d'ensemble et le lien vers le présentateur.
- `src/presenter/` : la fenêtre présentateur et son chronomètre.
- `src/home.ts` : l'écran d'accueil.

## Sécurité

Un fichier `.deck.html` contient du JavaScript arbitraire. Chaque slide tourne dans une iframe `sandbox="allow-scripts"` sans `allow-same-origin` : elle n'a accès ni à la page du lecteur, ni à ses cookies ou à son stockage, et ne communique qu'à travers des messages `postMessage` validés.
