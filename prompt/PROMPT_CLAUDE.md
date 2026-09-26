Tu vas créer une présentation en motion design au format **Motion Slides** : un seul fichier `.deck.html` que l'utilisateur ouvrira dans le lecteur Motion Slides (qui gère plein écran, navigation au clavier/clic et transitions). Suis ce format à la lettre.

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
  <p>Ouvre ce fichier dans Motion Slides pour le présenter.</p>

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
    <aside data-notes>Notes du présentateur (visibles seulement dans la vue présentateur).</aside>
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
| `data-duration` | nombre de secondes, optionnel | En **défilement automatique** (touche A du lecteur), temps pendant lequel chaque étape de cette slide reste à l'écran. Sans l'attribut, le lecteur applique son propre rythme (8 s par défaut). À mettre seulement sur les slides qui demandent plus (ou moins) de temps de lecture. |

**Présentation qui tourne toute seule** (salon, écran d'accueil, vitrine) : seulement si l'utilisateur le demande, ajoute `<meta name="deck-autoplay" content="loop">` dans le `<head>`. Le lecteur démarre alors le défilement automatique dès l'ouverture et boucle à la fin. Donne dans ce cas un `data-duration` adapté à chaque slide dense, et évite les notes indispensables à la compréhension : personne ne présente.

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

## Direction artistique : le sujet se voit

Le but est une présentation qu'on **regarde**, pas qu'on lit. Avant d'écrire le code, décide en silence :

1. **Une identité tirée du sujet.** Palette inspirée du sujet (la tour Eiffel : brun « tour Eiffel », bleu nuit parisien, or des illuminations ; le corps humain : rouges et roses organiques ; l'espace : noir profond et lueurs), deux polices qui lui vont (Google Fonts), et un **motif graphique récurrent** (treillis métallique, circuit imprimé, cellules, vagues…) réutilisé en fond ou en transition. Tout va dans `data-deck-head`.
2. **Un visuel par slide, dessiné pour le sujet.** Chaque slide a un élément visuel principal qui montre ce dont elle parle, dessiné en SVG (ou Canvas) : le monument, l'organe, la machine, la carte, le produit. Construis les illustrations avec des formes simples (chemins, polygones, dégradés, motifs `<pattern>`), stylisées mais reconnaissables, et **anime-les** : le tracé se dessine (`stroke-dasharray`), les pièces s'assemblent, l'objet se construit étape par étape. Aucune slide composée uniquement de texte ou de cartes de texte.
3. **Les chiffres se montrent, à l'échelle.** Dès qu'une slide cite une mesure, montre-la visuellement et **aux bonnes proportions** : une hauteur → l'objet dessiné à l'échelle avec une règle graduée et des repères familiers à côté (un humain, un immeuble, un autre monument connu) ; une quantité → des pictogrammes qui se remplissent ; une durée ou une date → une frise qui avance ; une proportion → une jauge ou un anneau ; une distance → une carte ou un trajet qui se trace. Le nombre lui-même apparaît en grand avec un compteur animé.
4. **Un type de visuel pour chaque type d'idée** :

| Ce que dit la slide | Ce qu'on voit |
|---|---|
| Un objet, un lieu, un personnage | Son illustration SVG, qui se dessine ou se construit |
| Une mesure (taille, poids, vitesse) | Comparaison à l'échelle avec des repères connus |
| Une date, une histoire | Frise chronologique ; l'illustration évolue avec elle au clic |
| Un processus, un fonctionnement | Schéma animé : flux, flèches qui se tracent, éléments qui circulent |
| Une quantité | Grille de pictogrammes, barres qui poussent, compteur |
| Une comparaison | Côte à côte à l'échelle, ou avant / après au clic |
| Une idée forte, une citation | Typographie cinétique plein cadre sur un fond illustré |

5. **Utilise les étapes au clic pour raconter** : l'illustration se construit morceau par morceau, un repère de comparaison apparaît à chaque clic, la frise avance. Varie les mises en page d'une slide à l'autre (plein cadre, visuel + texte côte à côte, grand chiffre, schéma).

Règles de réalisation :

- Du vrai **motion design** : entrées décalées (stagger), tracés qui se dessinent, compteurs, parallaxe, particules, boucles d'ambiance discrètes (`requestAnimationFrame`, `@keyframes infinite`).
- Easing soigné (`cubic-bezier(.22,1,.36,1)`, `cubic-bezier(.65,0,.35,1)`), durées de 400 à 1200 ms, pas d'animation linéaire sur du texte.
- Lisible de loin : titres de 80 à 160 px, texte courant d'au moins 36 px, peu de texte par slide, un message par slide. Le texte accompagne le visuel, il ne le remplace pas.
- Chiffres et faits exacts : n'invente rien. Si une valeur est approximative, écris « environ ».
- Animer `transform` et `opacity` en priorité pour rester fluide. Respecter `prefers-reduced-motion` est un plus.

## Ce que tu dois livrer

1. Un **seul fichier HTML complet**, de `<!doctype html>` à `</html>`, sans explication au milieu du code. Nomme-le `nom-du-sujet.deck.html`. Si tu peux créer un fichier ou un artifact téléchargeable, fais-le.
2. Entre 6 et 12 slides sauf demande contraire, avec des notes de présentateur (`<aside data-notes>`).
3. Vérifie : chaque slide est dans un `<template data-slide>`, chaque slide a son visuel dessiné pour le sujet, chaque `data-steps` correspond au nombre réel d'animations au clic, aucun élément ne dépasse 1920×1080.

Réponds dans la langue de l'utilisateur. Voici le sujet de la présentation :

