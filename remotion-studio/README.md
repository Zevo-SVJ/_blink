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
│   │   ├── blink.ts        Charte Blink : couleurs, lentilles, paliers, safe area
│   │   └── typography.ts   Chargement de la police + échelle typographique
│   │
│   ├── motion/             Comment ça bouge
│   │   ├── dynamics.ts     ⚑ Ressorts et courbes — partagés Remotion ⇄ Framer
│   │   ├── frame.ts        ⚑ Hooks frame → progression (le cœur du système)
│   │   ├── beats.ts        Grille rythmique 120 BPM et valeurs de stagger
│   │   ├── presets.ts      États de mouvement, interpolation, sérialisation CSS
│   │   ├── FrameMotion.tsx <FrameMotion> et <Stagger>
│   │   ├── SplitText.tsx   Titres animés mot à mot / lettre à lettre
│   │   ├── adapters.ts     Conversion des ressorts vers Framer Motion
│   │   ├── physics/        ⚑ velocity (squash · flou · ombre) · shake (noise2D)
│   │   ├── kinetic/        Pop · Impact · Burst · TrimPath · Cursor · Gauge · Counter
│   │   └── presentations/  glassCut · zoomThrough · whipPan · wipeUp
│   │
│   ├── components/         Briques visuelles réutilisables
│   │   ├── Stage.tsx       Plateau : fond animé + grain + vignettage + safe area
│   │   ├── GlassPanel.tsx  Surface « liquid glass » (3 couches) + Pill
│   │   ├── DeviceFrame.tsx Mockup d'appareil
│   │   ├── LightSweep.tsx  Balayage spéculaire
│   │   ├── Text.tsx        Texte typé sur l'échelle
│   │   ├── background/     MeshGradient, Grain, Vignette
│   │   └── blink/          BlinkStage · ProfileCard · LensCard · ScoreRing · Portal
│   │
│   └── compositions/       Les scènes
│       ├── manifest.ts     Durées centralisées
│       ├── HeroReveal.tsx  ┐
│       ├── FeatureShowcase.tsx  ├ paysage, langage calme
│       ├── DeviceShowcase.tsx   │
│       ├── Reel.tsx        ┘
│       └── blink/          Piste Blink — vertical, langage kinetic (§7)
│           ├── manifest.ts     Partition : durées, transitions, score
│           ├── BlinkReel.tsx   Montage des quatre plans
│           └── scenes/         Perception · Capture · Lenses · Verdict
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

## 7. La piste Blink — langage « kinetic »

Vidéo produit verticale (1080 × 1920, 60 fps) pour **Blink**, l'app qui montre
la première impression que fait un profil. Vocabulaire de mouvement
**délibérément opposé** aux scènes paysage : là où celles-ci se posent sans
rebondir, celui-ci rebondit systématiquement.

Les deux langages cohabitent sans se mélanger — mêmes primitives, familles de
ressorts distinctes.

### La règle qui définit la signature

> **On entre au ressort. On sort à la courbe. Jamais l'inverse.**

L'entrée dépasse et oscille (`pop` : stiffness 400, damping 15, ζ ≈ 0,375, soit
~28 % de dépassement, premier pic à 0,17 s). La sortie utilise `back`
— `cubic-bezier(0.36, 0, 0.66, -0.56)` — qui recule légèrement avant
d'accélérer : l'anticipation. `<Pop>` encode cette asymétrie et n'expose aucun
moyen de l'inverser.

Trois graduations pour le même geste, à raideur constante :

| Ressort | Amortissement | Dépassement | Usage |
| --- | --- | --- | --- |
| `pop` | 15 | ~28 % | entrée par défaut |
| `popTight` | 18 | ~20 % | blocs de texte longs |
| `popSoft` | 24 | ~10 % | éléments secondaires nombreux |
| `slam` | 30 | ~0 % | impact violent, aucune oscillation |

### La grille rythmique remplace l'audio

Sans piste sonore, le rythme est **écrit** : 120 BPM, soit exactement 30 frames
par temps à 60 fps. Chaque temps fort tombe sur la grille, et l'œil perçoit la
pulsation même en silence.

| Subdivision | Frames | Usage |
| --- | --- | --- |
| 1 temps | 30 | respiration entre deux blocs |
| ½ | 15 | transition rapide |
| ⅓ | 10 | arrivée d'un ressort |
| ⅙ | 5 | stagger large |
| 1/10 | 3 | stagger serré — la valeur par défaut |

La bande 0,04–0,08 s de stagger de la référence se traduit exactement en 2 à 5
frames (`STAGGER.tight/base/wide/loose`).

### Un seul signal pour trois effets

`src/motion/physics/velocity.ts` calcule la dérivée de la progression :
`p(n) − p(n−1)`. De cette unique valeur découlent le **squash & stretch** (à
volume conservé : `scaleY = 1 + kv`, `scaleX = 1/(1 + kv)`), le **flou
directionnel** et l'**ombre portée**. Ils ne peuvent pas se désynchroniser,
puisqu'ils lisent la même chose.

Un objet qui entre au ressort s'étire donc à l'aller et s'écrase au rebond —
sans qu'aucun timing ne soit écrit à la main.

### Le camera shake doit être déterministe

`Math.random()` est proscrit : chaque frame étant peinte isolément, la secousse
changerait à chaque rendu et le scrub serait incohérent. `noise2D` de
`@remotion/noise` est une fonction pure de la frame — imprévisible à l'œil,
identique à chaque exécution.

### Les quatre scènes

| # | Scène | Durée | Ce qu'elle démontre |
| --- | --- | --- | --- |
| 1 | `Blink-Perception` | 8 temps · 240 f | typographie qui s'abat, secousses, convergence, portail |
| 2 | `Blink-Capture` | 10 temps · 300 f | chute + squash, curseur en arc, clic, éclats, scan, jauge |
| 3 | `Blink-Lenses` | 12 temps · 360 f | cascade alternée, tracé vectoriel, flottement déphasé |
| 4 | `Blink-Verdict` | 10 temps · 300 f | anneau tracé, compteur, tampon, pulsation finale |

Montage : `Blink-Reel`, 1149 frames ≈ **19,2 s**.

### Les trois transitions

Chacune a une intention distincte — c'est le point de l'exercice.

| Transition | Durée | Intention | Courbe |
| --- | --- | --- | --- |
| `zoomThrough` | 18 f | on entre **dans** le sujet | `expoIn` |
| `whipPan` | 15 f | on se déplace **à côté** | `quint` + anticipation + dépassement |
| `wipeUp` | 18 f | la conclusion **recouvre** | `expo` + recul du plan sortant |

Deux règles apprises en corrigeant le rendu, et qui valent d'être retenues :

- **Le `timing` est linéaire, l'easing vit dans la présentation.** Empiler un
  `springTiming` sur la courbe d'une présentation lisse deux fois le même
  mouvement : la transition se termine dans son premier tiers puis se fige.
- **Le plan entrant doit déjà être en mouvement quand on le découvre.** Une
  scène dont le contenu démarre à la frame 0 de sa propre timeline apparaît
  vide pendant toute la transition. C'est ce qui produit le report de momentum
  décrit dans la référence.

### Rendu

```bash
npx remotion render Blink-Reel out/blink-reel.mp4
npx remotion render Blink-Perception out/perception.mp4
```

Compter environ 9 minutes pour les 1149 frames en 1080 × 1920.

### Origine et originalité

Le langage de mouvement — rythme, chorégraphie, physique, transitions — est
dérivé d'une analyse de vidéo de référence (§6). **Aucun asset, texte,
composition ni élément graphique de cette référence n'est repris.** Le contenu,
la charte et les objets à l'écran viennent de Blink.

La carte de profil de la scène 2 est volontairement générique : pas de logo de
réseau social, pas de photographie, pas de pseudonyme réel — un avatar en
dégradé et le pronom `@toi`. Les chiffres montrés sont cohérents avec le
produit : 742 place bien le profil dans le palier « Sharp » (seuil 680) et il
manque bien 48 points pour « Magnetic » (790).

## 8. Conventions

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

## 9. Qualité

```bash
npm run typecheck   # tsc --noEmit, mode strict
npm run lint        # eslint + typescript-eslint + react-hooks
```

Les règles `react-hooks` s'appliquent aussi aux hooks Remotion : `useCurrentFrame()`
appelé conditionnellement casse le rendu de façon difficile à diagnostiquer.

## 10. Notes

- **Police** — Inter est auto-hébergée dans `public/fonts/` (SIL OFL 1.1, voir
  `public/fonts/OFL.txt`) plutôt que chargée depuis Google Fonts : les rendus
  fonctionnent hors-ligne et en CI, et restent reproductibles dans le temps.
  `loadFont` enregistre un `delayRender()`, donc aucune frame n'est capturée
  avant que la police soit prête.
- **Licence Remotion** — Remotion est gratuit pour les particuliers et les
  entreprises de moins de 4 personnes ; au-delà, une licence d'entreprise est
  requise. Voir <https://remotion.dev/license>. C'est pour cette raison que
  `<Player />` reçoit `acknowledgeRemotionLicense` dans le playground.
