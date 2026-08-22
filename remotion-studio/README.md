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
│   │   ├── kinetic/        Pop · Impact · Burst · TrimPath · Cursor · Gauge
│   │   │                   Counter · idle (micro-vie permanente)
│   │   └── presentations/  zoomThrough · slideWhip · matchCut · diagonalSlash
│   │                          glassCut · whipPan · wipeUp (piste paysage)
│   │
│   ├── components/         Briques visuelles réutilisables
│   │   ├── Stage.tsx       Plateau : fond animé + grain + vignettage + safe area
│   │   ├── GlassPanel.tsx  Surface « liquid glass » (3 couches) + Pill
│   │   ├── DeviceFrame.tsx Mockup d'appareil
│   │   ├── LightSweep.tsx  Balayage spéculaire
│   │   ├── Text.tsx        Texte typé sur l'échelle
│   │   ├── background/     MeshGradient, Grain, Vignette
│   │   ├── blink/          BlinkStage · ProfileCard · LensCard · ScoreRing · Portal
│   │   └── kinetic/        ⚑ Univers hors interface : Medallion · CameraChrome
│   │                          PhotoGrid · LaserSweep · DullProfile · FeltCross
│   │                          SplitDiagonal · PhoneFrame · Sparks · Cadence
│   │                          Orb · CursorSwarm · NodeField · Radar · TypeBreath
│   │
│   ├── audio/              ⚑ Design sonore : SFX, piste par scène, voix off
│   └── compositions/       Les scènes
│       ├── manifest.ts     Durées centralisées
│       ├── HeroReveal.tsx  ┐
│       ├── FeatureShowcase.tsx  ├ paysage, langage calme
│       ├── DeviceShowcase.tsx   │
│       ├── Reel.tsx        ┘
│       └── blink/          Piste Blink — vertical, langage kinetic (§7)
│           ├── manifest.ts     Partition : durées, transitions, score, positions
│           ├── narration.ts    ⚑ Contrat voix off ↔ image
│           ├── BlinkReel.tsx   Montage des onze séquences
│           └── scenes/         11 séquences, un fichier par séquence
│
├── public/
│   ├── fonts/              Inter variable, auto-hébergée
│   ├── sfx/                Huit SFX générés par `npm run sfx`
│   └── vo/                 Voix off à déposer — voir son README
├── playground/             App React interactive (Framer Motion + <Player />)
├── reference/              Dépôt des vidéos de référence à analyser (non versionné)
└── scripts/
    ├── render-all.mjs      Rendu par lot via l'API programmatique
    ├── sfx/                ⚑ Synthèse déterministe des huit effets sonores
    ├── vo/                 ⚑ Plan de voix off : script, timecodes, contrôle
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

## 7. La piste Blink — régime « haute rétention »

Film produit vertical (1080 × 1920, 60 fps, **37,8 s**) pour **Blink**, l'app qui
montre la première impression que fait un profil.

Cette piste a été **refondue** après une version de 43 s qui, malgré des
animations correctes, se regardait comme un diaporama. Le diagnostic était
structurel et pas cosmétique : treize plans longs séparés par des raccords doux
laissent à chaque plan le temps de s'installer, donc de se lire comme une
diapositive. Accélérer les animations n'y change rien — c'est l'unité de montage
qu'il faut changer.

### Les quatre décisions de la refonte

**1 · La séquence n'est plus l'unité de montage.** Chacune des 11 séquences est
subdivisée en *battements* de 42 à 90 frames séparés par des coupes internes
franches (`<Sequence>` imbriquées, donc chaque battement redémarre à sa propre
frame 0). Le spectateur voit une trentaine de compositions distinctes en 38
secondes, contre 13 en 43 secondes.

**2 · L'univers visuel change à chaque séquence.** Cinq registres alternent, et
deux séquences voisines ne partagent jamais ni leur fond ni leur registre :

| Registre | Où | Ce qu'il apporte |
| --- | --- | --- |
| objet gravé | `Hook` | une matière, un reflet qui tourne, un relief |
| viseur de capture | `Rhythm`, `ScanUi` | le cadre devient un lieu ; cadence gratuite |
| typographie fluo | `Breathing` | rupture chromatique totale |
| rupture au feutre | `Contrast` | le contre-exemple, tracé à la main |
| interface de téléphone | `ActionPlan` | le propos redevient une chose faisable |

**3 · Quatre raccords, et seulement quatre.** Le fondu enchaîné est banni : deux
images superposées à 50 % ne sont ni l'une ni l'autre, et cette demi-seconde
d'indécision est exactement là où l'on décroche.

**4 · Des ressorts extrêmes.** Trois configurations remplacent la famille
précédente sur toute la piste — plus raides, moins amorties, avec une masse qui
dit explicitement ce que l'objet pèse.

### Le vocabulaire de ressorts

| Ressort | Raideur | Amortissement | Masse | ζ | Emploi |
| --- | --- | --- | --- | --- | --- |
| **`kick`** | 450 | 16 | **0,8** | 0,42 | textes, badges, pop-ups — pic à 0,073 s, ~25 % de dépassement |
| **`whip`** | 300 | 22 | 1 | 0,635 | caméra et plans entiers — ~4 % seulement |
| **`heavyDrop`** | 200 | 12 | **1,5** | 0,346 | objets qui tombent — ~31 %, chute lente |
| **`stamp`** | 500 | 15 | 1 | 0,335 | **le tampon du premier plan, et rien d'autre** — ~34 % |
| **`read`** | 450 | 20 | **0,8** | 0,527 | les mots qui doivent être **lus** — ~14 %, posé en 12 frames |

Deux principes derrière ces valeurs :

- **la masse est le levier de vitesse**, pas la raideur. `kick` à 0,8 arrive
  avant que l'œil ait fini de chercher l'élément ; `heavyDrop` à 1,5 donne
  l'inertie qui distingue un objet d'une interface ;
- **le rebond appartient aux éléments, la puissance appartient au cadre.** Un
  plan entier qui oscille devient illisible, d'où `whip` très amorti pour la
  caméra et les raccords.

`stamp` n'apparaît qu'une fois dans tout le film. Employé ailleurs, un
dépassement de 34 % donnerait l'impression que l'animation est mal réglée —
c'est précisément pour cela qu'il est réservé au premier évènement que voit le
spectateur, qui doit paraître incontrôlé.

### Les onze séquences

Les durées ci-dessous sont les durées **utiles** (`BLINK_SPANS`). La durée réelle
de chaque séquence dans la `TransitionSeries` y ajoute le raccord qui la suit,
ce qui garantit que les timecodes de départ tombent juste — 0, 168, 288, 468,
648, 888, 1068, 1308, 1548, 1788, 2028.

| Timecode | Séquence | Durée | Registre | Battements |
| --- | --- | --- | --- | --- |
| 00:00 | `Hook` | **168 f** | objet gravé | médaillon → phrase → chute |
| 00:02.8 | `Rhythm` | 120 f | viseur | verrouillage + frappe → compte à rebours |
| 00:04.8 | `Metaphor` | 180 f | objet | arrivée → rafale de clics → verdict |
| 00:07.8 | `Breathing` | 180 f | **typo fluo** | jaune → **noir inversé** → orange |
| 00:10.8 | `ScanUi` | 240 f | viseur | grille+laser → signaux → radar → relevé |
| 00:14.8 | `Contrast` | 180 f | **rupture** | profil terne → croix → « NON » + chute |
| 00:17.8 | `Perception` | 240 f | objet | distribution → éventail → formule |
| 00:21.8 | `Gap` | 240 f | **split diagonal** | fente → deux camps → l'écart |
| 00:25.8 | `ScoreHero` | 240 f | objet lumineux | compteur → palier → échelle |
| 00:29.8 | `ActionPlan` | 240 f | **téléphone** | notification → plan → gain |
| 00:33.8 | `Outro` | 240 f | marque | mot-marque → convergence → verrouillage |

Montage : `Blink-Reel`, **2268 frames = 37,80 s**, son compris.

### La cadence, tenue par construction

Trois mécanismes garantissent qu'aucune frame n'est immobile, sans qu'aucun
timing n'ait à être écrit à la main :

- **`<Cadence>`** (`src/components/kinetic/Cadence.tsx`) émet un évènement de
  fond toutes les 15 frames, en **alternant quatre natures** — balayage
  horizontal, marqueurs d'angle, anneau concentrique, bande verticale. Quatre et
  non une seule : un même évènement répété huit fois devient un décor, l'œil
  l'apprend et cesse de le voir ;
- **`<CameraChrome>`** fournit la cadence gratuitement sur les plans viseur — le
  timecode change à chaque frame, le voyant clignote toutes les 30 ;
- **`<Typewriter>`** produit un caractère toutes les 1 à 2 frames, soit un
  évènement toutes les 16 à 33 ms pendant qu'un texte s'installe. Le texte
  complet reste dans le DOM en transparent, sinon une ligne centrée tremblerait
  latéralement à chaque caractère.

### Les quatre raccords

| Raccord | Emploi | Nombre |
| --- | --- | --- |
| `zoomThrough` | scale-to-mask — on entre **dans** le sujet, aux changements d'échelle du récit | 3 |
| `slideWhip` | balayage vertical, le geste du pouce sur un fil | 3 |
| `matchCut` | la **trajectoire survit** au raccord | **1** |
| `diagonalSlash` | un trait **ouvre** l'image, aux ruptures de registre | 3 |

**Le match cut est le seul procédé du film utilisé une seule fois.** Employé
deux fois, il deviendrait un effet. Son mécanisme est en deux moitiés, et les
deux sont obligatoires :

- *côté contenu* — la carte barrée de `Contrast` tombe en **chute libre
  quadratique** (`y = ½·g·t²`, g = 2,15 px/frame²) et passe la frame 180 à
  ~52 px/frame ; `Perception` démarre avec une carte qui entre par le haut au
  ressort `heavyDrop`, dont le pic de vitesse est du même ordre ;
- *côté caméra* — les deux plans partagent une **dérive verticale à vitesse
  identique**. Leurs dérivées sont égales, donc au moment de l'échange la vitesse
  apparente de l'image ne change pas d'un poil. C'est cette égalité qui fait le
  raccord ; sans elle on ne voit qu'une coupe sèche.

La chute est une parabole et non un ressort : un objet qui tombe accélère, il ne
décélère jamais avant d'avoir touché quelque chose. Un ressort en sortie aurait
ralenti la carte juste avant la coupe — exactement le détail qui fait qu'un
match cut marche ou ne marche pas.

Le raccord `matchCut` est aussi le seul cadencé en `linearTiming` ; tous les
autres ont pour horloge le ressort `whip`, avec `curve: 'linear'` passé à la
présentation.

### La règle de lisibilité, et ce qu'elle a coûté

> **Un mot d'impact reste totalement immobile pendant au moins 18 frames.**

Le premier hook était illisible, et pour une raison mesurable : les mots
arrivaient au ressort `kick` depuis `slamIn` — échelle 1,75, rotation −12°, flou
de vitesse — donc pendant leurs vingt premières frames ils étaient
géométriquement déformés. On voyait qu'il y avait du texte ; on ne pouvait pas
le lire.

Trois corrections, par ordre d'effet :

1. **`readPop` + ressort `read`** — l'entrée est une simple échelle
   0,7 → 1,05 → 1. Aucune rotation, aucune translation, **aucun flou**. Partir
   de 0,7 et non de 0 est ce qui garde le mot déchiffrable pendant toute son
   entrée : à zéro, il faudrait traverser toutes les tailles intermédiaires ;
2. **stabilisation en 12 frames** — ζ = 0,527 pose le mot deux fois plus vite
   que `kick` (ζ = 0,42, ~20 frames). Ces huit frames gagnées sont du temps de
   lecture pur ;
3. **une seule caméra en mouvement à la fois** — recul, filé et punch ne se
   recouvrent jamais. Pendant qu'un mot se lit, le cadre est fixe.

Le hook est passé de 120 à **168 frames**. C'est le seul endroit du film où de
la durée a été *ajoutée*, et c'est assumé : un hook illisible ne retient
personne, quelle que soit son énergie. Tout le reste du montage garde son
resserrement, et le film dure 37,8 s au lieu de 37,0 s.

### Les punch zooms

Un mot qui grossit *lui-même* grossit dans un cadre immobile : l'œil lit un
changement de taille. Une **caméra** qui avance de 22 % en cinq frames déplace
tout le cadre en même temps — fond, lueur, éléments voisins — et l'œil lit alors
un rapprochement. C'est la différence entre un objet qui change et une caméra
qui réagit.

`<Impact punches={…}>` porte ces mouvements d'axe Z au niveau de la scène, à
côté des secousses, parce que ce sont deux expressions du même appareil :

```tsx
<Impact
  hits={HITS_B}
  punches={[
    {at: 24, to: 1.22, rise: 5},               // le coup, puis retour au ressort
    {at: 60, to: 0.9, rise: 10, hold: true},   // le recul, tenu jusqu'au raccord
  ]}
>
```

Cinq frames à l'aller, retour au ressort `stamp` : la poussée est plus rapide
que le retour, donc le coup se sent à l'aller et se pose au retour. L'inverse
donnerait une respiration, pas un impact.

Les punchs tombent sur **sept moments** seulement, tous des mots ou des chiffres
porteurs : « PARLE », « AVANT TOI. », « 2 », « DÉCIDÉ. », « NON », « UN SEUL
PROFIL », « L'ÉCART », « 742 », « +48 », « BLINK ».

Le **recul de fin de plan** (`to: 0.9, hold: true`) n'est appliqué qu'aux six
séquences suivies d'un balayage ou d'une lame. Devant un scale-to-mask il est
proscrit : ce raccord fonctionne parce que le plan sortant *grandit* jusqu'à
faire masque, et un pré-recul irait exactement à contresens.

### Le design sonore

Huit sons, et aucun de plus. La contrainte est délibérée : un film de
trente-huit secondes qui emploierait quinze sons différents n'aurait pas de
design sonore, il aurait une bande-son. Ce sont les **répétitions** qui rendent
un son signifiant — le spectateur apprend en deux occurrences que le clic
mécanique veut dire « validé », et trente secondes plus tard trois clics
suffisent à dire que trois choses viennent d'être réglées sans qu'aucun texte
n'ait à l'écrire.

| Son | Volume | Déclencheurs |
| --- | --- | --- |
| `camera_shutter.mp3` | 0,40 | ouverture d'un cadre de capture (`Rhythm`, `ScanUi`) |
| `beep.mp3` | 0,40 | verrouillage de viseur, confirmation d'interface |
| `click_mechanic.mp3` | 0,50 | tampon, bascule d'interrupteur, clic sur le bouton |
| `soft_air_swipe.mp3` | **0,14** | raccords whip et slash, balayage laser, lame diagonale |
| `impact_thud.mp3` | 0,50 | punchlines, chiffre qui se verrouille, mot plein cadre |
| `marker_scratch.mp3` | 0,45 | **la croix au feutre — une seule occurrence** |
| `card_pop.mp3` | 0,40 | atterrissage des quatre cartes de regard |
| `count_up_tick.mp3` | 0,30 | montée du score de 0 à 742 |

Le souffle est le seul son du film assez fréquent — onze occurrences — pour
devenir un tic. C'est pour ça qu'il est de loin le plus bas du catalogue : sur
un raccord, ce qu'on cherche n'est pas d'entendre un son, c'est de ne pas
entendre une coupe.

Trois décisions structurent la piste :

- **les volumes sont hiérarchisés, pas égaux.** Un raccord doit se *sentir* sans
  couvrir ce qu'il relie : le souffle est 11 dB sous l'impact. La première
  version le plaçait à 0,35 avec un balayage résonant jusqu'à 4,6 kHz, et à la
  onzième occurrence il devenait la seule chose qu'on entendait. Il a été
  entièrement refait — Q ramené de 1,7 à 0,5, spectre plafonné à 1,1 kHz,
  attaque en `sin³` — pour devenir un mouvement d'air plutôt qu'un effet ;
- **deux frames d'avance systématiques.** Le transitoire d'attaque d'un son met
  quelques millisecondes à atteindre son pic alors que l'image est instantanée ;
  `cue()` applique donc 33 ms d'anticipation partout. C'est le pendant sonore de
  `leadInFrames` dans la partition de voix off ;
- **le match cut n'a pas de son de raccord.** Son principe est de ne pas se
  voir ; le souligner d'un whoosh reviendrait à l'annoncer.

Les repères sont déclarés en tête de chaque scène, à côté de ses secousses :

```tsx
const SFX_B = [cue(0, 'countUpTick', 0.32), cue(24, 'impactThud')];
…
<SfxTrack cues={SFX_B} />
```

`<SfxTrack>` place un `<Audio>` par repère dans une `<Sequence from={at}>`. Les
repères sont **relatifs à la séquence**, donc déplacer une séquence dans le
montage emmène son son avec elle. Les whooshs de raccord, eux, n'appartiennent à
aucune scène : ils sont calculés en absolu dans `BlinkReel` depuis
`sceneStarts()`.

#### La voix off

`src/audio/voice.ts` est le contrat entre la narration et l'image : le texte
exact de chaque réplique et sa frame **absolue**, dérivée du manifeste. Allonger
un plan déplace donc automatiquement toutes les répliques suivantes.

```bash
npm run vo            # script complet, timecodes, contrôle de tenue
npm run vo -- --srt   # export .srt pour caler à l'oreille
```

`voiceBudget()` vérifie que chaque réplique tient avant la suivante et sort en
erreur sinon. Ce n'est pas décoratif : la première version du script avait six
répliques qui mordaient sur la suivante, ce qui aurait forcé à rallonger le
montage au moment de poser l'audio — c'est-à-dire à défaire le travail de
rythme. Les six ont été réécrites avant enregistrement, pas après.

Deux règles de rédaction gouvernent le texte :

- **le texte à l'écran n'est jamais relu.** Trois répliques disaient exactement
  ce que l'image écrivait déjà (« neuf images, une bio », « le cadrage, les
  couleurs, les mots », « quatre regards, un seul profil »). Elles ont été
  remplacées par ce que l'image *ne dit pas* : « Voilà tout ce qu'ils ont de
  toi », « Tout est un signal », « Chacun y voit autre chose » ;
- **les répliques débordent des plans**, et c'est voulu. Sur un montage découpé
  en battements d'une seconde, une voix qui s'arrêterait à chaque coupe
  soulignerait le découpage au lieu de le porter.

**Trois modes de calage**, et c'est le troisième qui est en service :

- `single` — le fichier entier à la frame 0. La synchronisation dépend alors
  entièrement des silences enregistrés, et le moindre écart de débit dérive. La
  dérive **s'accumule** : sur la prise livrée, la dernière phrase arrivait
  21,6 s trop tôt et les 22 dernières secondes du film étaient muettes ;
- `segments` — **le mode en service.** Le même fichier unique, lu par tranches :
  `trimBefore` / `trimAfter` délimitent l'intervalle, `<Sequence from>` décide
  où il tombe. Chaque tranche repart de sa propre marque, donc la dérive ne peut
  plus s'accumuler — et il n'y a aucun fichier intermédiaire à produire ni à
  ré-encoder. Les six bornes tombent dans les silences réels de la prise,
  relevés sur son enveloppe d'énergie à 10 ms de résolution : couper ailleurs
  amputerait un mot ;
- `lines` — un fichier par réplique. Le plus robuste quand l'enregistrement est
  commandé phrase par phrase.

`npm run vo` imprime le calage en vigueur et **refuse un chevauchement** : une
tranche qui déborde sur la suivante ne se voit pas au montage, elle ne s'entend
qu'une fois le rendu terminé. `public/vo/README.md` donne le profil de voix, les
réglages et la table des six tranches.

Tant que `VOICE_ENABLED` est à `false`, le projet se rend sans voix : un
`<Audio>` pointant sur un fichier absent ferait échouer le rendu entier. Le
passer à `true` active aussi l'atténuation de 4 dB sur tous les effets, qui
libère la bande 200 Hz – 4 kHz pour la parole.

#### Les fichiers sont synthétisés, pas sourcés

`npm run sfx` régénère les huit fichiers dans `public/sfx/` — sans dépendance,
sans téléchargement, en moins d'une seconde. Chaque son est construit à partir
de sa description physique (transitoire, corps, décroissance) par
`scripts/sfx/build-sfx.mjs` : bruit filtré par un passe-bande à variable d'état
pour le whoosh, sinusoïde descendant de 120 à 38 Hz pour l'impact, vingt-quatre
micro-clics à hauteur croissante pour le rouleau du compteur.

Trois raisons de faire ça plutôt que de sourcer des fichiers :

- **licence** — un son fabriqué ici n'a pas d'ayant droit, et une vidéo produit
  ne peut pas s'appuyer sur un fichier dont la licence n'est pas vérifiée ;
- **reproductibilité** — le générateur est déterministe (PRNG à graine fixe),
  donc le même rendu est rejouable des mois plus tard sans dépendre d'un CDN ;
- **taille** — les huit fichiers pèsent ensemble moins de 45 ko, donc ils sont
  versionnés avec le code.

Ce sont de vrais sons, pas des silences : ils jouent réellement au rendu. Et ils
restent **remplaçables un pour un** — déposer un fichier du même nom dans
`public/sfx/` suffit, aucun code ne change.

### L'univers visuel, hors interface

L'app Blink n'apparaît directement que dans deux séquences sur onze. Tout le
reste est un vocabulaire d'objets créé pour le film, dans
`src/components/kinetic/` :

| Objet | Rôle narratif |
| --- | --- |
| `Medallion` | un regard gravé dans du métal — la matière, pas le pictogramme |
| `CameraChrome` `FocusBox` | le cadre devient un viseur ; générique, sans marque |
| `PhotoGrid` `LaserSweep` | une grille de vignettes qu'un instrument traverse |
| `DullProfile` `FeltCross` | le contre-exemple, et la croix tracée à la main |
| `SplitDiagonal` | deux propositions contradictoires dans le même cadre |
| `PhoneFrame` `ToggleRow` `NotifBanner` | l'interface qui s'utilise sans doigt |
| `Sparks` | éclat déterministe : angle, rayon et taille tirés d'un bruit indexé |
| `Cadence` | le métronome visuel du fond |
| `Orb` `CursorSwarm` `Shockwave` | l'identité, les regards, ce qui se propage |
| `NodeField` `Radar` `TierLadder` | l'analyse comme topologie et comme mesure |
| `TypeBreath` | l'écran texte seul |

Trois précautions tenues à la lettre dans ces composants :

- **personne n'est représenté.** L'avatar du profil terne est un disque et un
  arc ; les vignettes sont des dégradés indexés, jamais des photographies ;
- **aucune interface n'est imitée.** Pas de logo, pas de pseudo, pas d'icône
  empruntée — la grammaire d'un téléphone ou d'un appareil photo appartient à
  tout le monde, l'interface d'un système en particulier non ;
- **la croix n'apparaît qu'une fois**, et elle est tracée : courbes plutôt que
  segments, dépassement aux extrémités, double passe d'encre.

### Trois techniques qui portent la qualité

**Un seul signal pour trois effets.** `src/motion/physics/velocity.ts` calcule la
dérivée de la progression : `p(n) − p(n−1)`. De cette unique valeur découlent le
**squash & stretch** (à volume conservé : `scaleY = 1 + kv`,
`scaleX = 1/(1 + kv)`), le **flou directionnel** et l'**ombre portée**. Ils ne
peuvent pas se désynchroniser.

L'ombre portée de `<Pop>` est un `box-shadow`, donc **rectangulaire** : elle ne
s'emploie que sur des surfaces qui ont réellement un fond (cartes, badges,
pastilles). Sur du texte nu ou sur une sphère, elle dessine un carré derrière
l'élément — c'est `textShadow` qui prend le relais.

**La micro-vie permanente.** `useIdle` fait respirer chaque objet posé —
quelques pixels de flottement, un ou deux pour cent d'échelle, sous le seuil de
perception consciente. C'est l'équivalent frame-par-frame du `repeat: Infinity`
de Framer Motion, qui ne progresserait pas sous un rendu headless.

**Le camera shake déterministe.** `Math.random()` est proscrit : chaque frame
étant peinte isolément, la secousse changerait à chaque rendu et le scrub serait
incohérent. `noise2D` de `@remotion/noise` est une fonction pure de la frame —
imprévisible à l'œil, identique à chaque exécution.

### Cinq pièges rencontrés, et leur correction

- **Une seule mise en forme, jamais deux.** Empiler un `springTiming` sur la
  courbe d'une présentation lisse deux fois le même mouvement : la transition se
  termine dans son premier tiers puis se fige. D'où le prop `curve` sur chaque
  présentation, et `curve: 'linear'` partout où l'horloge est un ressort.
- **Un `clip-path` de balayage doit couvrir le cadre à l'arrivée.** La première
  version de `diagonalSlash` en sens montant laissait un coin non révélé sur
  toute la durée du plan suivant — le fond de la série apparaissait en triangle.
  La droite est hors cadre par le haut quand `edgeLeft ≤ 0` et par le bas quand
  `edgeLeft ≥ 100 + steepness` : le balayage doit aller d'une borne à l'autre.
- **Un enfant absolu se cale sur la *padding box* de son ancêtre.** Le
  `paddingTop` du châssis de téléphone ne pousse donc pas un `<AbsoluteFill>`
  enfant : la marge sous la barre d'état doit être reprise dans l'enfant.
- **Un enfant absolu dans un parent de taille nulle part du coin, pas du
  centre.** Le paquet de cartes de `Perception` a besoin d'un parent
  explicitement dimensionné, sinon les cartes se rangent vers la droite.
- **Le portail d'un zoom traversant doit être plus lumineux que son entourage.**
  Un disque plus sombre se lit comme un trou : l'œil comprend « il manque
  quelque chose » au lieu de « quelque chose avance vers moi ».

### La partition, pensée pour la voix off

`src/compositions/blink/narration.ts` est le contrat entre la voix et l'image.
Chaque réplique y est rattachée à une séquence, à une position dans sa timeline,
et à ce que l'image met en scène pendant qu'elle est prononcée.

```ts
{
  scene: 'Metaphor',
  line: 'Et ils ont déjà décidé.',
  at: 100,          // frame, relative à la séquence
  staging: 'La rafale de clics vient de s’achever…',
}
```

`sceneStarts()` donne la position absolue de chaque séquence : une réplique se
situe à `sceneStarts()[scene] + cue.at`. Recalculé depuis les durées, jamais
écrit à la main.

Le découpage en battements change une chose pour la voix : une réplique est
presque toujours à cheval sur deux ou trois coupes internes, et c'est
souhaitable — une voix qui s'arrêterait à chaque coupe soulignerait le découpage
au lieu de le porter.

`narrationBudget()` vérifie, séquence par séquence, que le temps de parole estimé
(~2,5 mots/seconde en français) reste sous 80 % du temps disponible. Ce n'est pas
décoratif : sur la version précédente, quatre répliques dépassaient leur plan, ce
qui aurait forcé à rallonger le montage au moment de poser l'audio — donc à
défaire le travail de rythme.

### Rendu

```bash
npx remotion render Blink-Reel out/blink-38s.mp4
npx remotion render Blink-Hook out/hook.mp4
```

Compter environ 20 minutes pour les 2268 frames en 1080 × 1920. Chaque séquence
est aussi une composition autonome, ce qui permet de scruber un battement isolé
sans rejouer les trente-sept secondes.

### Origine et originalité

Le langage de mouvement — rythme, chorégraphie, physique, transitions,
composition typographique — est dérivé de deux analyses de vidéo de référence.
**Aucun asset, texte, composition ni élément graphique de cette référence n'est
repris.** Le contenu, la charte et les objets à l'écran viennent de Blink ou ont
été créés pour ce film.

Les chiffres montrés sont cohérents avec le produit : 742 place bien le profil
dans le palier « Sharp » (seuil 680) et il manque bien 48 points pour
« Magnetic » (790).

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
