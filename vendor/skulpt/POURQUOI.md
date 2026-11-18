# Skulpt — pourquoi il est là, et ce qu'il reste à faire

**Skulpt 1.2.0**, licence MIT (voir `LICENSE`). Un interpréteur Python écrit en
JavaScript, qui tourne entièrement dans la page.

## La raison, écrite comme le veut CLAUDE.md

> Rémy, 18 novembre : « J'aimerai bien des exercices pour apprendre python.
> **Tu peux utiliser des bibliothèques.** »

Le dépôt n'ajoute pas de dépendance sans une raison qu'on peut écrire. Celle-ci
s'écrit : **apprendre Python sans jamais EXÉCUTER de Python, c'est apprendre une
langue morte.** Un élève qui tape un programme doit pouvoir appuyer sur
« Lancer » et voir ce qu'il affiche — sinon il apprend à recopier, pas à
programmer.

## Ce qui a été mesuré avant de le choisir

`tools/tmp/mesurePython.mjs`, seize programmes dans Chromium :

- **105 ms** pour charger 944 Ko (232 Ko compressés) ;
- **2 à 6 ms** par programme de collège — `print`, variables, `if`, `for`,
  `def`, listes et `input()` compris ;
- **le stdlib n'est pas optionnel** : `print` lui-même importe `sys`, et sans
  les 400 Ko du stdlib le tout premier programme d'un élève rend
  « ImportError: No module named sys ».

Pyodide, l'autre candidat, fait plus de 10 Mo et demande du WebAssembly : hors
de question pour une tablette de collège, hors ligne, derrière le filtre d'un
établissement.

**Et ses messages d'erreur sont inutilisables pour un débutant** — quatre fautes
entièrement différentes rendent « bad input on line 2 ». C'est pourquoi
`js/core/python/diagnostic.js` juge AVANT lui, en français. Voir le long
commentaire en tête de ce fichier.

## Ce qu'il reste à faire

Ces deux fichiers **ne sont pas encore chargés par l'application** : seule la
sonde `tools/pythonDiagnostic.mjs` les lit, pour confronter notre vérificateur
au vrai interpréteur. Les treize marches livrées sont des QCM, et un QCM n'a
rien à exécuter.

**Quand l'éditeur arrivera** (la phase « et après que l'élève tape »), il faudra :

1. ajouter `./vendor/skulpt/skulpt.min.js` et `./vendor/skulpt/skulpt-stdlib.js`
   à la liste de `sw.js` — sans quoi rien ne marche hors ligne, et c'est le
   premier endroit où Rémy s'en servira ;
2. les charger **à la demande**, à l'ouverture de l'éditeur et pas au démarrage
   de l'application : 944 Ko imposés à tous les élèves pour un exercice que la
   plupart n'ouvriront pas, c'est une seconde de perdue sur chaque connexion ;
3. relancer `node tools/csp.mjs --ecrire`.
