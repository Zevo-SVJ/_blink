# Remotion Studio

Base de projet pour des **animations vidéo premium** — dans l'esprit du motion
design Apple / iOS 26 : fonds sombres profonds, matières translucides « liquid
glass », typographie serrée, ressorts physiques et transitions par la
profondeur plutôt que par le volet.

Deux moteurs, deux rôles nettement séparés :

| | Rôle | Horloge |
| --- | --- | --- |
| **Remotion** | rend la vidéo, image par image | la frame (`useCurrentFrame()`) |
| **Framer Motion** | primitives d'animation, vocabulaire de ressorts, interactions | le temps réel (`requestAnimationFrame`) |

---

## 1. Le principe à comprendre avant tout le reste

Remotion ne « filme » pas une page qui s'anime : il **rend chaque frame
séparément**, hors du temps réel. Au rendu, l'horloge du navigateur n'avance pas
toute seule — Remotion positionne la frame *n*, laisse peindre, capture, puis
passe à *n+1*.

Conséquence directe : **une animation pilotée par `requestAnimationFrame` ne
fonctionne pas dans une composition rendue.** Un `<motion.div animate={{…}}>`
classique produirait une vidéo figée ou non déterministe.

La règle du projet, appliquée partout dans `src/` :

- **Dans une composition rendue** → la progression vient *toujours* de la frame,
  via les hooks de `src/motion/frame.ts` (`useProgress`, `useSceneProgress`,
  `useLoop`). Les composants `motion.*` de Framer Motion sont bien utilisés,
  mais **sans `animate` ni `transition`** : leur `style` est intégralement
  calculé à partir de la frame. Le rendu est donc reproductible à l'identique.
- **Dans l'interface** (playground, app web, overlays) → Framer Motion prend la
  main complètement : `animate`, `AnimatePresence`, `layoutId`, gestes.

Ce qui relie les deux mondes : **les ressorts sont définis une seule fois**
(`src/motion/dynamics.ts`). Remotion et Framer Motion simulent le même
oscillateur amorti avec les mêmes paramètres (`stiffness`, `damping`, `mass`) —
`spring({config: springs.snappy})` d'un côté, `toSpringTransition('snappy')` de
l'autre. Un mouvement d'interface et son équivalent vidéo ont donc rigoureusement
la même signature.

---

## 2. Démarrage

```bash
cd remotion-studio
npm install
```

Node 20+ requis.

### Prévisualiser les animations — Remotion Studio

```bash
npm run dev
```

Ouvre **http://localhost:3000**. C'est l'outil principal :

- la **timeline** en bas se scrube image par image (`←` / `→`, `espace` pour
  lire, `J` `K` `L` pour la vitesse) ;
- le sélecteur en haut à gauche liste les compositions, rangées par dossier
  (`Scenes`, `Edits`, `Social`) ;
- le panneau de droite génère un **éditeur de props typé** à partir du schéma
  Zod de chaque scène : changer un texte, une couleur ou un dégradé se fait
  sans toucher au code, et la preview se met à jour instantanément ;
- le bouton *Render* lance un rendu directement depuis l'interface.

C'est ici que se règle le motion design : comme tout dérive de la frame, une
image scrubée dans le studio est **exactement** celle qui sortira au rendu.

### Prévisualiser les interactions — Playground

```bash
npm run playground
```

Ouvre **http://localhost:5273**. Une petite app React qui embarque les mêmes
compositions dans `<Player />` de Remotion, avec toute l'interface autour animée
en temps réel par Framer Motion (onglet actif qui glisse via `layoutId`,
`AnimatePresence`, gestes `whileHover` / `whileTap`).

Le panneau « Ressorts partagés » compare les cinq presets côte à côte — c'est le
moyen le plus rapide de choisir un ressort avant de l'utiliser dans une scène.

Les deux serveurs peuvent tourner en parallèle.

---

## 3. Rendre une vidéo

```bash
# Une composition
npx remotion render HeroReveal out/hero.mp4

# Avec des props personnalisées
npx remotion render HeroReveal out/hero-en.mp4 --props='{"title":"Motion,\nas a material"}'

# Une image fixe (utile pour un poster ou une vignette)
npx remotion still DeviceShowcase out/poster.png --frame=120

# Tout, en un seul bundle
npm run render:all
npm run render:all -- HeroReveal Reel   # ou une sélection
```

Les réglages de qualité (codec, CRF, format d'image intermédiaire, espace
colorimétrique) sont dans `remotion.config.ts`. Le PNG est utilisé pour les
frames intermédiaires : les dégradés et le verre dépoli n'y prennent pas
d'artefacts JPEG.

> **Premier rendu** — Remotion télécharge un Chrome Headless Shell. Si le réseau
> est filtré, pointez sur un Chromium déjà présent :
> `npx remotion render HeroReveal out/hero.mp4 --browser-executable=/chemin/vers/chrome`

---

## 4. Architecture

```
remotion-studio/
├── remotion.config.ts      Config du studio et du rendu (qualité, alias @/)
├── vite.config.ts          Config du playground interactif
├── index.html              Point d'entrée du playground
├── public/fonts/           Inter auto-hébergée (rendus hors-ligne, déterministes)
│
├── src/
│   ├── index.ts            registerRoot() — entrée du bundle Remotion
│   ├── Root.tsx            Catalogue des compositions (id, durée, format, schéma)
│   │
│   ├── design/             Ce à quoi ça ressemble
│   │   ├── tokens.ts       Palette, matières, rayons, ombres, formats de canvas
│   │   └── typography.ts   Chargement de la police + échelle typographique
│   │
│   ├── motion/             Comment ça bouge
│   │   ├── dynamics.ts     ⚑ Ressorts et courbes — partagés Remotion ⇄ Framer
│   │   ├── frame.ts        ⚑ Hooks frame → progression (le cœur du système)
│   │   ├── presets.ts      États de mouvement, interpolation, sérialisation CSS
│   │   ├── FrameMotion.tsx <FrameMotion> et <Stagger>
│   │   ├── SplitText.tsx   Titres animés mot à mot / lettre à lettre
│   │   ├── presentations.tsx  Transition maison « glassCut »
│   │   └── adapters.ts     Conversion des ressorts vers Framer Motion
│   │
│   ├── components/         Briques visuelles réutilisables
│   │   ├── Stage.tsx       Plateau : fond animé + grain + vignettage + safe area
│   │   ├── GlassPanel.tsx  Surface « liquid glass » (3 couches) + Pill
│   │   ├── DeviceFrame.tsx Mockup d'appareil
│   │   ├── LightSweep.tsx  Balayage spéculaire
│   │   ├── Text.tsx        Texte typé sur l'échelle
│   │   └── background/     MeshGradient, Grain, Vignette
│   │
│   └── compositions/       Les scènes
│       ├── manifest.ts     Durées centralisées
│       ├── HeroReveal.tsx
│       ├── FeatureShowcase.tsx
│       ├── DeviceShowcase.tsx
│       └── Reel.tsx        Montage des trois plans
│
├── playground/             App React interactive (Framer Motion + <Player />)
└── scripts/render-all.mjs  Rendu par lot via l'API programmatique
```

L'alias `@/…` pointe sur `src/` et est déclaré **trois fois** — dans
`tsconfig.json`, `remotion.config.ts` (webpack) et `vite.config.ts`. Les trois
doivent rester synchronisés.

---

## 5. Créer une nouvelle scène

```tsx
// src/compositions/MaScene.tsx
import {z} from 'zod';
import {zColor} from '@remotion/zod-types';
import {Stage, Text, GlassPanel} from '@/components';
import {FrameMotion, SplitText} from '@/motion';
import {palette} from '@/design/tokens';

export const maSceneSchema = z.object({
	title: z.string(),
	accent: zColor(),
});

export type MaSceneProps = z.infer<typeof maSceneSchema>;

export const maSceneDefaults: MaSceneProps = {
	title: 'Bonjour',
	accent: palette.teal,
};

export const MaScene: React.FC<MaSceneProps> = ({title, accent}) => (
	<Stage aurora="violet">
		<Text variant="hero" align="center">
			<SplitText text={title} by="word" timing={{delay: 6, spring: 'glide'}} />
		</Text>

		<FrameMotion preset="riseIn" timing={{delay: 28, spring: 'gentle'}}>
			<GlassPanel glow={accent}>…</GlassPanel>
		</FrameMotion>
	</Stage>
);
```

Puis déclarer la durée dans `src/compositions/manifest.ts` et enregistrer la
composition dans `src/Root.tsx`. Elle apparaît immédiatement dans le studio,
avec son éditeur de props.

### Le vocabulaire disponible

**Presets** (`src/motion/presets.ts`) — état de départ, la cible est le repos :
`fade`, `riseIn`, `driftIn`, `scaleIn`, `glassPop`, `tiltIn`, `slideLeft`,
`slideRight`, `revealUp`, `settle`, `tighten`. Un preset accepte aussi un objet
libre : `preset={{opacity: 0, y: 80, blur: 12}}`.

**Ressorts** (`src/motion/dynamics.ts`) : `glide` (défaut, posé, sans rebond),
`snappy` (immédiat), `gentle` (gros éléments), `bouncy` (accent, dépassement
franc), `precise` (jamais de dépassement).

**Courbes** : `standard`, `sheet` (feuilles modales iOS), `expo`, `entrance`,
`emphasized`, `exit`. À utiliser via `timing={{duration: 40, easing: 'sheet'}}`.

**Timing** : `{delay}` en frames, puis soit `{spring: '…'}`, soit
`{duration, easing}`. Les deux modes sont exclusifs.

---

## 6. Conventions

- **Jamais de `animate` / `transition` Framer Motion dans une composition
  rendue.** Si un mouvement doit apparaître dans la vidéo, il passe par la
  frame. C'est la seule règle non négociable du projet.
- **Les délais s'expriment en frames**, pas en millisecondes. `seconds(0.4, fps)`
  convertit si besoin.
- **Toute couleur, taille et matière vient de `src/design/`.** Une valeur en dur
  dans une scène est une dette : elle ne suivra pas les déclinaisons.
- **Une scène = un fichier + un schéma Zod + des defaults exportés.** C'est ce
  qui permet de la réutiliser dans le montage, dans le playground et en rendu
  paramétré sans duplication.
- **Les glyphes décoratifs se dessinent en SVG** (`src/components/Icons.tsx`),
  jamais en caractères Unicode : un glyphe absent de la police auto-hébergée
  produirait un « tofu » au rendu.

## 7. Qualité

```bash
npm run typecheck   # tsc --noEmit, mode strict
npm run lint        # eslint + typescript-eslint + react-hooks
```

Les règles `react-hooks` s'appliquent aussi aux hooks Remotion : `useCurrentFrame()`
appelé conditionnellement casse le rendu de façon difficile à diagnostiquer.

## 8. Notes

- **Police** — Inter est auto-hébergée dans `public/fonts/` (SIL OFL 1.1, voir
  `public/fonts/OFL.txt`) plutôt que chargée depuis Google Fonts : les rendus
  fonctionnent hors-ligne et en CI, et restent reproductibles dans le temps.
  `loadFont` enregistre un `delayRender()`, donc aucune frame n'est capturée
  avant que la police soit prête.
- **Licence Remotion** — Remotion est gratuit pour les particuliers et les
  entreprises de moins de 4 personnes ; au-delà, une licence d'entreprise est
  requise. Voir <https://remotion.dev/license>. C'est pour cette raison que
  `<Player />` reçoit `acknowledgeRemotionLicense` dans le playground.
