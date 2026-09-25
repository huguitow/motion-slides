Tu vas créer une présentation en motion design au format **Motion Deck** : un seul fichier `.deck.html` que l'utilisateur ouvrira dans le lecteur Motion Deck (qui gère plein écran, navigation au clavier/clic et transitions). Suis ce format à la lettre.

## Format du fichier

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="deck-title" content="Titre de la présentation">
  <title>Titre de la présentation</title>
</head>
<body>
  <p>Ouvre ce fichier dans Motion Deck pour le présenter.</p>

  <!-- Optionnel : injecté dans le <head> de CHAQUE slide (polices, variables CSS communes) -->
  <template data-deck-head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap">
    <style>:root { --accent: #8b7bff; } body { font-family: Inter, sans-serif; }</style>
  </template>

  <!-- Une slide = un <template data-slide> -->
  <template data-slide data-steps="2" data-transition="fade">
    <style>/* CSS de cette slide uniquement */</style>
    <div class="scene">…</div>
    <script>/* JS de cette slide uniquement */</script>
    <aside data-notes>Notes du présentateur (non affichées).</aside>
  </template>

  <template data-slide>…</template>
</body>
</html>
```

## Règles du lecteur

- **Toile fixe de 1920×1080 px.** Chaque slide est rendue dans sa propre iframe isolée de exactement 1920×1080, mise à l'échelle automatiquement. Positionne tout en pixels ou en % de cette toile. Pas de scroll : rien ne doit dépasser.
- **Isolation.** Le CSS et le JS d'une slide ne voient pas les autres slides. Chaque slide est **rechargée à neuf** à chaque fois qu'on y entre : ses animations repartent de zéro.
- **Fond par défaut** noir, texte blanc. Définis ton propre fond sur `body` ou sur un conteneur plein cadre.
- **Pas d'interaction dans la slide.** Le lecteur capte tous les clics et touches (clic/espace = avancer). N'ajoute ni bouton, ni lien, ni formulaire.
- **Autonome de préférence.** CSS, SVG, Canvas et JavaScript natifs. Google Fonts et les bibliothèques de `cdnjs.cloudflare.com` (ex. GSAP) sont autorisées si vraiment utiles. Pas d'images externes : utilise SVG, dégradés ou Canvas.

## Attributs d'une slide

| Attribut | Valeurs | Effet |
|---|---|---|
| `data-steps` | entier ≥ 0 (défaut `0`) | Nombre d'**animations au clic** dans la slide avant de passer à la suivante, comme les animations de PowerPoint. |
| `data-transition` | `fade` (défaut), `slide`, `none` | Transition quand on **arrive** sur cette slide. Mets `none` si la slide fait sa propre entrée animée. |

## Animations au clic (étapes)

L'étape courante vaut `0` à l'arrivée sur la slide, puis `1`, `2`… jusqu'à `data-steps`. En revenant en arrière depuis la slide suivante, on arrive directement sur la **dernière** étape. Deux façons de réagir, combinables :

**1. En CSS pur (recommandé pour les apparitions simples)** : le lecteur met l'étape sur `<html data-step="N">`.

```css
.point { opacity: 0; transform: translateY(40px); transition: all .8s cubic-bezier(.22,1,.36,1); }
html[data-step="1"] .p1, html[data-step="2"] .p1, html[data-step="2"] .p2 { opacity: 1; transform: none; }
```

**2. En JavaScript** avec l'objet global `deck` :

```js
deck.onStep((step, direction) => {
  // step : étape courante ; direction : 'enter' (arrivée sur la slide), 'forward' ou 'backward'
});
deck.onEnter(() => { /* la slide devient visible : lance les animations d'entrée */ });
deck.onLeave(() => { /* la slide va disparaître */ });
// Aussi disponibles : deck.step, deck.steps, deck.slideIndex, deck.slideCount
```

Chaque état d'étape doit être **atteignable dans les deux sens** : écris des animations qui dépendent de l'étape courante, pas du nombre de clics passés.

**Animations d'entrée** : la classe `deck-entered` est ajoutée sur `<html>` quand la slide devient visible. Déclenche les animations d'entrée avec `.deck-entered .titre { animation: … }` ou dans `deck.onEnter`.

## Direction artistique

- Du vrai **motion design** : typographie cinétique, entrées décalées (stagger), tracés SVG qui se dessinent, compteurs animés, formes et dégradés en mouvement, parallaxe, particules en Canvas. Chaque slide doit bouger avec intention.
- Easing soigné (`cubic-bezier(.22,1,.36,1)`, `cubic-bezier(.65,0,.35,1)`), durées de 400 à 1200 ms, pas d'animation linéaire sur du texte.
- Lisible de loin : titres de 80 à 160 px, texte courant d'au moins 36 px, peu de texte par slide, un message par slide.
- Une identité visuelle cohérente sur tout le deck (palette, polices, marges) via `data-deck-head`.
- Animer `transform` et `opacity` en priorité pour rester fluide. Boucles d'ambiance discrètes (`requestAnimationFrame`, `@keyframes infinite`) bienvenues.
- Respecter `prefers-reduced-motion` est un plus.

## Ce que tu dois livrer

1. Un **seul fichier HTML complet**, de `<!doctype html>` à `</html>`, sans explication au milieu du code. Nomme-le `nom-du-sujet.deck.html`. Si tu peux créer un fichier ou un artifact téléchargeable, fais-le.
2. Entre 6 et 12 slides sauf demande contraire, avec des notes de présentateur (`<aside data-notes>`).
3. Vérifie : chaque slide est dans un `<template data-slide>`, chaque `data-steps` correspond au nombre réel d'animations au clic, aucun élément ne dépasse 1920×1080.

Réponds dans la langue de l'utilisateur. Voici le sujet de la présentation :

