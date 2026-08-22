# Voix off — mode d'emploi

Le projet est **entièrement câblé** pour la narration. Il ne manque que les
fichiers audio, qui doivent être produits en dehors de cet environnement : la
politique réseau de la machine de rendu bloque `api.elevenlabs.io` et les CDN de
génération, donc un fichier généré ici ne peut pas redescendre dans le dépôt.

Compter cinq minutes.

---

## 1 · Le profil de voix

| Réglage | Valeur |
| --- | --- |
| Langue | français natif |
| Voix | homme, 25–30 ans |
| Ton | direct, conversationnel, sûr de lui — **pas** publicitaire, pas de sourire forcé |
| Débit | rapide, mais chaque syllabe articulée |
| Stability | **0.45** |
| Clarity / Similarity | **0.80** |
| Style Exaggeration | **0.10** |
| Modèle | `eleven_multilingual_v2` (ou plus récent équivalent FR) |

Sur le débit : le film est découpé en battements de moins d'une seconde et
demie. Une voix posée y sonnerait en retard sur l'image. Viser ~2,5 mots par
seconde, ce qui est rapide à l'oral mais reste parfaitement clair.

## 2 · Le script

`npm run vo` imprime le script complet avec, pour chaque réplique, son timecode
exact, sa durée parlée estimée et le temps disponible avant la suivante. Les
positions sont **dérivées du manifeste de montage** : si un plan change de
durée, les timecodes imprimés changent avec lui.

`npm run vo -- --srt` écrit `public/vo/script.srt`, pratique pour vérifier le
calage à l'oreille dans n'importe quel lecteur.

Le script vérifie aussi qu'aucune réplique ne mord sur la suivante, et sort en
erreur si c'est le cas. Il est vert en l'état.

## 3 · Deux façons de livrer les fichiers

### Mode `single` — un seul fichier *(défaut)*

Déposer **`public/vo/voiceover.mp3`** : une seule prise continue, avec les
silences respectés entre les répliques, calée sur le timecode 00:00.

C'est le plus simple à produire. Son défaut est structurel : la synchronisation
repose entièrement sur les silences enregistrés, donc le jour où un plan gagne
dix frames, il faut réenregistrer.

### Mode `lines` — un fichier par réplique *(recommandé)*

Déposer les treize fichiers `01-hook.mp3` … `13-outro.mp3` (noms exacts donnés
par `npm run vo`), chacun contenant **une seule réplique, sans silence de tête**.

Remotion place alors chaque fichier à sa frame. La voix reste collée aux marques
quoi qu'il arrive au montage, et corriger une réplique ne demande de
réenregistrer qu'elle. Passer `VOICE_MODE` à `'lines'` dans
`src/audio/voice.ts`.

## 4 · Activer la piste

Une fois les fichiers en place, dans `src/audio/voice.ts` :

```ts
export const VOICE_ENABLED = true;
```

Ce drapeau existe parce qu'un `<Audio>` pointant sur un fichier absent fait
échouer le rendu entier : tant qu'il est à `false`, le projet se rend sans voix,
et rien d'autre ne change.

Le passer à `true` déclenche aussi l'**atténuation des effets** : tous les SFX
descendent de 4 dB (`SFX_DUCK`) pour laisser la bande 200 Hz – 4 kHz à la voix.
C'est une atténuation constante et non un ducking dynamique — sur ce film la
voix parle 80 % du temps, et un ducking qui monte et descend vingt-six fois
s'entendrait pomper.

Puis :

```bash
npm run vo                                    # doit afficher « fichier présent » partout
npx remotion render Blink-Reel out/blink.mp4
```

---

## 5 · Le calage en service : le mode `segments`

C'est ce qui tourne actuellement. La prise livrée est un bloc continu de
15,46 s — 14,84 s de parole pour 0,62 s de silence — qui, posé à la frame 0,
s'arrêtait à 15,5 s alors qu'il restait 22 s d'image.

La correction ne découpe pas le fichier sur le disque : elle en **lit des
tranches**. `<Audio trimBefore trimAfter>` délimite l'intervalle à jouer,
`<Sequence from>` décide où il tombe. Un seul fichier, six placements, aucun
ré-encodage.

Les six bornes tombent dans les **silences réels** de la prise, relevés sur son
enveloppe d'énergie à 10 ms de résolution — c'est la seule façon de garantir
qu'aucun mot n'est amputé.

| # | dans le fichier | dans le film | contenu |
| --- | --- | --- | --- |
| 1 | 0,00 → 2,81 | **0,00** | Ton profil parle avant toi… Ils te jugent en deux secondes. |
| 2 | 2,81 → 7,03 | **8,00** | Voilà tout ce qu'ils ont de toi… Blink analyse ton profil exactement comme eux. |
| 3 | 7,03 → 8,95 | **16,00** | Et non… ce n'est pas une question de filtre. |
| 4 | 8,95 → 11,50 | **19,00** | Tes amis, un recruteur, ton crush… chacun y voit autre chose. |
| 5 | 11,50 → 13,48 | **30,00** | Blink te dit exactement quoi modifier… |
| 6 | 13,48 → 15,46 | **35,00** | Blink. Vois-toi comme les autres te voient. |

`npm run vo` imprime cette table et **refuse un chevauchement** : une tranche
qui déborde sur la suivante ne se voit pas au montage, elle ne s'entend qu'une
fois le rendu terminé.

Pour déplacer une réplique, il n'y a qu'une valeur à changer — son `at` dans
`voiceSegments`, exprimé en secondes.

---

## 6 · Si une prochaine prise dérive à son tour

C'est le cas le plus courant, et il n'a rien d'anormal : le mode `single`
suppose que les silences enregistrés reproduisent exactement les temps morts du
montage. Dès que le débit réel diffère de l'estimation, la piste dérive — et la
dérive **s'accumule**, donc la dernière réplique est toujours la plus fausse.

Deux corrections, selon ce que contient le fichier.

**Le fichier contient bien les treize répliques, dans l'ordre.**

```bash
npm run vo:split -- --dry   # vérifier la découpe proposée
npm run vo:split            # écrire 01-hook.mp3 … 13-outro.mp3
```

Le script coupe la prise en treize morceaux : frontières estimées au prorata du
nombre de mots, puis accrochées au creux d'énergie le plus profond dans une
fenêtre de ±0,4 s. Passer ensuite `VOICE_MODE` à `'lines'`. Chaque réplique est
alors posée à sa propre marque, donc la dérive ne peut plus s'accumuler.

Contrôler la colonne `durée` face à `attendu` dans la sortie du script : un
morceau très en dessous de son attendu signale une coupe tombée au mauvais
endroit, et il vaut mieux réenregistrer que rafistoler.

**Le fichier ne contient pas exactement ce script.** Réenregistrer, de
préférence réplique par réplique (mode `lines`) : c'est le seul moyen d'avoir
une synchronisation qui survive à une prochaine version du montage.
