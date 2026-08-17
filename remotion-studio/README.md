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
├── reference/              Dépôt des vidéos de référence à analyser (non versionné)
└── scripts/
    ├── render-all.mjs      Rendu par lot via l'API programmatique
    └── analysis/           Chaîne d'analyse de vidéo de référence (§6)
        ├── index.mjs       Orchestrateur CLI
        └── lib/            ffmpeg · probe · motion · extract · sheet · png
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

## 6. Analyser une vidéo de référence

Chaîne outillée pour décoder le langage de motion design d'une vidéo existante
avant d'en reproduire quoi que ce soit. Elle ne fait que **lire** — aucune
composition du projet n'est touchée.

### Déposer la vidéo

```
remotion-studio/reference/ma-video.mov
```

Tout ce qui sort d'un iPhone convient : `.mov` ou `.mp4`, H.264 comme HEVC, y
compris HDR, ralenti et vidéo tournée à la verticale (la rotation stockée dans
les métadonnées est appliquée automatiquement).

### Lancer

```bash
npm run analyze:find     # quelles vidéos l'outil voit-il ?
npm run analyze:probe    # format, codec, définition, cadence, durée, HDR
npm run analyze          # analyse complète
```

Sans argument, la vidéo la plus récemment modifiée est retenue. Pour cibler un
fichier précis :

```bash
node scripts/analysis/index.mjs reference/ma-video.mov
```

### Ce que ça produit

```
.analysis/<nom-de-la-video>/
├── 00-RAPPORT.md        Synthèse : format, évènements, segments, chemins
├── metadata.json        Toutes les mesures, exploitables par script
├── motion.csv           Le signal image par image (frame, temps, mouvement, luma)
├── planches/            ⚑ Planches contact — le point d'entrée de la lecture
│   ├── 00-structure.png
│   ├── 01-signal-mouvement.png
│   ├── evt-01.png …
│   └── pic-01.png …
├── 01-structure/        Niveau 1 — frames réparties sur toute la durée
├── 02-transitions/      Niveau 2 — rafales autour de chaque évènement
└── 03-mouvement/        Niveau 3 — rafales sur les pics d'animation
```

Les **trois niveaux** répondent à trois questions différentes :

| Niveau | Question | Échantillonnage |
| --- | --- | --- |
| 1 · structure | Combien de plans, quel rythme d'ensemble ? | 16 frames réparties uniformément |
| 2 · transitions | Comment passe-t-on d'un plan à l'autre ? | toutes les frames natives autour de chaque évènement |
| 3 · mouvement | À quoi ressemble l'animation à son plus fort ? | toutes les frames natives sur les fenêtres les plus énergiques |

Chaque vignette porte son index et son horodatage incrustés dans l'image :
impossible de confondre une frame et sa position dans le film.

### Comment les évènements sont détectés

Le signal est la **différence moyenne absolue entre images consécutives**,
calculée sur des frames décimées en niveaux de gris — assez basse définition
pour que le grain et le bruit de compression ne soient pas comptés comme du
mouvement.

Une frame devient un évènement quand elle dépasse d'au moins `--sensitivity`
fois (6 par défaut) l'agitation **médiane de son propre voisinage**, et non un
seuil global. C'est ce qui permet de capter les transitions *animées* d'un
motion design soigné : elles étalent le changement sur plusieurs frames et
passeraient sous n'importe quel seuil fixe calibré pour des coupes franches.

Le **ratio** rapporté classe les candidats par force. Il ne les tranche pas :
au niveau des pixels, un changement de plan et une animation intra-plan très
énergique se ressemblent. La planche contact de chaque évènement permet de
conclure à l'œil — c'est le rôle du niveau 2.

### Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `--probe` | — | S'arrête après la vérification du format |
| `--find` | — | Liste les vidéos candidates et s'arrête |
| `--structure=N` | 16 | Nombre de frames du niveau 1 |
| `--width=N` | 1280 | Largeur des frames extraites |
| `--sensitivity=N` | 6 | Seuil de détection ; baisser pour capter des transitions plus douces |
| `--max-motion=N` | 6 | Nombre de pics de mouvement retenus |
| `--pre-roll=N` / `--post-roll=N` | 5 / 10 | Frames avant/après chaque évènement |
| `--tonemap` | — | Tone mapping HDR → SDR (indispensable sur une vidéo HDR) |
| `--out=DIR` | `.analysis/<slug>` | Dossier de sortie |

### FFmpeg

Aucune dépendance FFmpeg n'est déclarée : Remotion en embarque déjà un (n7.1,
avec les décodeurs h264 / hevc / prores). Un FFmpeg système est préféré quand
il existe — `FFMPEG_PATH` / `FFPROBE_PATH` permettent d'en imposer un.

Toute la chaîne est écrite pour ne dépendre que du plus petit dénominateur
commun : démux mov/mp4, décodage, filtre `scale`, sorties `image2` et
`image2pipe`. Ni `select`, ni `scdet`, ni `tile` — la détection d'évènements et
les planches contact sont calculées côté Node, ce qui les rend indépendantes du
build de FFmpeg installé.

### Rien n'est versionné

`reference/` et `.analysis/` sont exclus de Git. Une vidéo de référence
appartient à quelqu'un d'autre et n'a pas à être redistribuée dans le dépôt ;
les frames extraites se régénèrent en quelques secondes. Ce qui mérite d'être
conservé, ce sont les conclusions de motion design — pas la matière première.

## 7. Conventions

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

## 8. Qualité

```bash
npm run typecheck   # tsc --noEmit, mode strict
npm run lint        # eslint + typescript-eslint + react-hooks
```

Les règles `react-hooks` s'appliquent aussi aux hooks Remotion : `useCurrentFrame()`
appelé conditionnellement casse le rendu de façon difficile à diagnostiquer.

## 9. Notes

- **Police** — Inter est auto-hébergée dans `public/fonts/` (SIL OFL 1.1, voir
  `public/fonts/OFL.txt`) plutôt que chargée depuis Google Fonts : les rendus
  fonctionnent hors-ligne et en CI, et restent reproductibles dans le temps.
  `loadFont` enregistre un `delayRender()`, donc aucune frame n'est capturée
  avant que la police soit prête.
- **Licence Remotion** — Remotion est gratuit pour les particuliers et les
  entreprises de moins de 4 personnes ; au-delà, une licence d'entreprise est
  requise. Voir <https://remotion.dev/license>. C'est pour cette raison que
  `<Player />` reçoit `acknowledgeRemotionLicense` dans le playground.
