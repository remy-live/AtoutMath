# Les champs remplissables, exercice par exercice

> « Je voudrais que tous les exercices qui peuvent prétendre à un champ
> remplissable puissent y avoir le droit. » — Rémy, 12 octobre 2026

Suite de sa revue du 12 octobre, point 11 : « as-tu prévu des champs
remplissables pour tous les exercices […] il faut que tu vérifies les
exercices ». La première passe en avait ajouté quatre (29 rendus sur 89) ;
celle-ci traite **tout ce qui peut en porter**.

---

## La question à laquelle il faut répondre sans deviner

« Cet exercice peut-il porter un champ remplissable ? » n'est pas une question
d'opinion, et la lire dans le code rendu par rendu, c'est soixante lectures et
soixante occasions de se tromper.

**Il y a une mesure.** Un rendu de fiche se dessine deux fois : une fois pour
l'élève (`solution = false`) et une fois pour le corrigé (`solution = true`).
Ce que le corrigé écrit **et que la feuille de l'élève n'écrit pas**, c'est
exactement ce que l'élève a à écrire — donc exactement l'endroit où un champ
remplissable doit être posé.

    node tools/ouEcritLEleve.mjs            # les rendus sans champ, triés
    node tools/ouEcritLEleve.mjs <rendu>    # le détail d'un rendu

Un rendu dont le corrigé n'écrit RIEN de plus ne peut pas porter de champ :
la réponse y est un tracé, un coloriage, un découpage ou un déplacement de
pièces. Ce n'est pas un oubli, c'est la nature de l'exercice — et la ligne
rouge de ce logiciel dit d'ailleurs qu'on ne trace pas à la souris ce qui se
trace à la règle.

---

## Le tri, et ce qu'il a donné

**Avant : 25 exercices sur 93 posaient des champs. Après : 59.**
Les 34 restants ne peuvent pas en porter, et c'est mesuré, pas supposé.

### Ce qui a été équipé (34 exercices de plus)

Groupés par la FAÇON dont le champ se pose — c'est elle qui se recopie d'un
rendu à l'autre, et deux helpers partagés en portent la moitié.

| Façon | Rendus |
| --- | --- |
| **Une ligne tracée sous une figure** (`ligneReponsePdf`, un seul endroit) | La Valeur Manquante · Le Nom des Angles · Combien de Cubes ? · Le Vocabulaire du Cercle |
| **Un trou au milieu d'une phrase** (`champSurLePointille`, qui MESURE où il tombe) | Angle Master · Quelle heure est-il ? · La Pizzeria des Fractions · Symétrique par Rapport à Quoi ? · Lire des Coordonnées |
| **Les cases d'un tableau ou d'une grille** | Le Tableau de Conversion · La Pyramide des Nombres · La Pyramide des Mots · Le Tableau à Double Entrée · L'Hexagrille · L'Enquête · Compter sur un solide · Mastermind |
| **Des lignes de rédaction** | Priorités ligne par ligne (× 3 exercices) · Le Théorème de Pythagore · Le Théorème de Thalès · Thalès : la Rédaction · Hypoténuse, Opposé, Adjacent · Le Compte est Bon · Écris le programme de construction · Segment, Droite ou Demi-droite ? |
| **Une case à COCHER** (`champ.coche`, nouveau) | Le point est-il dessus ? (∈ et ∉) · … avec les demi-droites · Lire un codage · Le milieu d'un segment |
| **Divers** | L'Organigramme des Quadrilatères · La Mosaïque des Transformations · Les Nombres des Pharaons · La Loupe sur la Droite |

Deux décisions valent d'être dites :

- **Un QCM se coche, il ne s'écrit pas.** Rémy l'avait demandé pour les QCM de
  la porte des QUESTIONS ; quatre exercices sont des QCM dessinés par la porte
  des GRILLES (« Le point est-il dessus ? » pose sa figure puis ses quatre
  affirmations) et passaient à côté de la règle. Le crayon des grilles sait
  maintenant cocher : `champ.coche(x, y, côté, valeur)`, avec un nom de groupe
  par question — donc des propositions **exclusives** entre elles.
- **Un même rendu peut légitimement différer selon le mode.** « Lire des
  Coordonnées » reçoit deux champs par point ; « Placer un Point », qui partage
  le même rendu, n'en reçoit aucun — on y trace une croix à la règle. Même
  chose pour la pendule (lire l'heure / placer les aiguilles) et les
  hiéroglyphes (lire / écrire).

### Ce qui ne peut pas en porter (34 exercices, 30 rendus)

`bons-chemins`, `chemin`, `codage`, `colorier`, `dedale`, `dominos`,
`echiquier`, `grenouilles`, `hashi`, `laby-nombres`, `mat`, `memory`,
`motscaches`, `paires`, `parking`, `pipopipette`, `pointapoint`, `puissance4`,
`quadrillage`, `relier`, `sans-croiser`, `serpents`, `sim`, `slitherlink`,
`tangram`, `tasuko`, `tourBrahma`, `trefles`, `unionInterAxe`,
`valeurAbsolueAxe`.

Ce sont tous des exercices dont **la réponse n'est pas du texte** : on relie,
on colorie, on découpe, on déplace des pièces, on trace un chemin, on marque un
point sur un axe. La mesure le dit sans qu'on ait à juger : leur corrigé
n'écrit rien de plus que la feuille de l'élève, il DESSINE — un labyrinthe
ajoute 127 traits et pas un mot.

Et cela rejoint la ligne rouge du logiciel : « je ne veux pas de construction
géométrique avec des outils virtuels ». Un champ de PDF sur « Place le point
A » serait exactement cela.

### La troisième porte, qui n'avait pas de case

Il y a **trois chemins vers le papier** : la fiche des QUESTIONS
(`#fq-champs`), le poly d'un PARCOURS (`#pp-champs`), et la fiche d'**un seul
exercice** — qui n'avait aucune case. Cinquante-neuf rendus posaient donc des
champs que cette porte-là ne demandait jamais : le code était juste, le
réglage n'existait pas.

Ce trou ne se voit dans **aucune épreuve de code** — le rendu pose bien ses
champs quand on les lui demande — ni dans `champsRemplissables.mjs`, qui
appelle le rendu directement. Il ne se voit qu'en empruntant le chemin du
professeur. `tools/grilleSeuleRemplissable.mjs` l'emprunte, et mesure :

| Exercice imprimé SEUL | saisies | cases à cocher |
| --- | --- | --- |
| Sudoku | 192 | 0 |
| Le Tableau de Conversion | 128 | 0 |
| Le point est-il dessus ? | 0 | 16 |

Au passage, le crayon des champs se fabrique maintenant en **un seul endroit**
(`crayonDeChamps`, dans `ficheRendu.js`) au lieu d'être recopié par porte :
c'est exactement le genre d'endroit où une correction se pose sur une seule des
trois.

### Comment on le remesure

```sh
node tools/champsRemplissables.mjs          # qui en pose, et combien
node tools/champsRemplissables.mjs --muets  # seulement ceux qui n'en posent pas
node tools/ouEcritLEleve.mjs                # qui le PEUT, et ne le fait pas
node tools/champsSurLeVraiPdf.mjs           # comptés dans un PDF téléchargé
```

Les trois premiers mesurent les appels au crayon avec un faux jsPDF
(`tools/fauxPdf.mjs`) : deux secondes pour quatre-vingts rendus. Le dernier
emprunte le chemin de Rémy — un poly, la case « Champs remplissables », le
téléchargement — et compte les annotations AcroForm dans le fichier. **386
saisies et 16 cases à cocher** sur un poly de six exercices, le 12 octobre.
