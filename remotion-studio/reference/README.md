# Vidéos de référence

**Déposez ici la vidéo à analyser.** C'est l'emplacement que la chaîne
d'analyse regarde en premier.

```
remotion-studio/reference/ma-video.mov
```

Formats acceptés : `.mov`, `.mp4`, `.m4v`, `.mkv`, `.webm`, `.avi` — donc tout
ce qui sort d'un iPhone (H.264 comme HEVC, y compris HDR et ralenti).

## Puis

```bash
cd remotion-studio

npm run analyze:find            # que voit l'outil ?
npm run analyze:probe           # format, durée, cadence, rotation, HDR
npm run analyze                 # analyse complète
```

Les résultats atterrissent dans `.analysis/<nom-de-la-video>/`.

## Ce dossier n'est pas versionné

Le `.gitignore` exclut tout sauf ce fichier. Une vidéo de référence appartient
à quelqu'un d'autre : elle sert à comprendre un langage de mouvement, elle n'a
pas à être redistribuée dans le dépôt. Les fichiers y sont aussi trop lourds
pour Git.

Conséquence pratique : sur une machine éphémère, la vidéo disparaît avec le
conteneur. Ce qui mérite d'être conservé, c'est le rapport d'analyse et les
conclusions de motion design — pas la source.
