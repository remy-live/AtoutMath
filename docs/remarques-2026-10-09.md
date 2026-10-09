# La revue du poly de Rémy — 9 octobre 2026

Écrites ici **avant** d'être traitées. Trois messages, neuf points.

---

## 1. ✅ L'astuce du mot se répétait dans chaque mot

> « pour l'aide pour le parcours de prof, dès que je glisse le texte, l'aide
> réapparait, ne la fait apparaitre qu'une fois. »

**Ce que c'est** : l'invite du bloc « mot », « Ce que l'élève lira ici. Une
ligne vide fait un paragraphe, *un mot entre étoiles* s'affiche en gras. »
Elle s'écrivait à l'identique dans chaque bloc vide : trois mots glissés, trois
fois la même phrase de cent six caractères l'une sous l'autre.

**Ce que ce n'est pas, et c'est mesuré** : le bandeau « Ce que font les icônes
de la barre ». Celui-là porte « J'ai compris » et ne revient pas — congé donné,
page rechargée, mot glissé à la souris puis ajouté au clic : absent les quatre
fois (`tools/tmp/aideApresRechargement.mjs`).

**Fait** : l'astuce ne s'écrit que dans le PREMIER mot du parcours ; les
suivants portent « Ce que l'élève lira ici. » La règle est dans
`core/messageEtape.js` — la vue pose du balisage, le noyau décide, et c'est ce
qui la rend mesurable sous Node.

**Gardé par** : `tests/motDuProfesseur.test.mjs`, quatre épreuves.

---

## 2. ✅ Exercice 147 — « on ne comprend pas le 851 »

> « on ne comprend pas le 851. »

Sur sa feuille :

```
851.   |x − 3| se lit :
       ...........................
852.   |x − 6| se lit :
       ...........................
853.   |x − 4| = 3        (avec sa droite graduée)
```

Le barreau « lire » est un CHOIX entre quatre phrases à l'écran. Sur le papier,
les quatre phrases ont disparu : il reste une question sans réponse possible.
Une épreuve existe déjà (`LE BARREAU 1 NE S'IMPRIME PAS SUR UNE FICHE D'AXES`)
— elle n'a donc pas tenu, ou elle ne garde pas ce qu'elle prétend.

## 3. ✅ Exercice 146 — « Idem pour le 845, il manque qqch ? »

```
Entoure la bonne réponse.
845.  x est un réel strictement supérieur à 0.  ..........
846.  Voir la droite graduée ci-dessus.         ..........
847.  ]−∞ ; 3[                                  ..........
```

Deux défauts dans le même bloc :

- la consigne dit « Entoure la bonne réponse » et il n'y a rien à entourer ;
- le 846 renvoie à une droite graduée **qui n'est pas sur la feuille**.

## 4. ✅ Exercice 145 — « il ne manque pas le graphique ? »

```
839.  Voir la droite graduée ci-dessus.  ..........
```

Même défaut que le 846 : l'énoncé renvoie à un dessin absent. Ce sont les
questions dont l'ÉNONCÉ est une figure, et la fiche n'imprime que le texte de
repli.

## 5. ✅ Les trèfles ne sortent pas en couleur

> « Pour les trèfles, j'ai mis la couleur pour le poly mais je n'ai pas de
> couleur quand je mets en couleur. »

Le réglage « couleur » de la fiche est suivi ailleurs ; le champ de trèfles
sort en noir et blanc quoi qu'on coche.

## 6. ✅ Les pavages non plus

> « Pour les pavages quand c'est couleur pour le poly, mets de la couleur. »

Même famille que le point 5 — exercices 108 et 109.

## 7. ✅ Thalès — « les pointillés vont sur l'énoncé »

Exercice 710 : l'égalité à compléter porte trois fractions à pointillés, et les
pointillés du haut passent **sur le texte de l'énoncé** au-dessus.

## 8. ✅ Exercice 92 — « Écris la question à la ligne »

```
541.  Malo a parcouru 5/7 du trajet. Quelle part lui reste-t-il à faire ? (1 − 5/7 = ....)
```

L'énoncé et le calcul à poser tiennent sur la même ligne, et le calcul
déborde en bout de ligne (voir le 544, dont la parenthèse fermante tombe
seule à la ligne suivante). La question doit passer à la ligne.

## 9. ✅ Exercice 87 — « le trait de fraction est parfois très grand »

```
511.  3/4 = 6/..........        512.  5/6 = ....../18
514.  4/3 = 24/..........       516.  1/5 = ....../45
```

Quand le terme manquant est au DÉNOMINATEUR, le pointillé est long et la barre
de fraction s'étire à sa largeur : la fraction n'a plus la taille des autres.

---

# Ce qui a été fait, et comment

## La cause commune des points 2, 3 et 4 : une porte qui ne disait pas son nom

Rémy n'a pas imprimé une FICHE, il a imprimé un POLY DE PARCOURS. Deux chemins
y mènent au papier, dans `js/ui/printParcours.js` :

| | passait `papier: true` ? |
| --- | --- |
| `questionsDe` — les exercices écrits | oui |
| `grillesDe` — les exercices à dessin | **non** |

Tout exercice qui déclare un `printable` passe par la seconde. Le générateur de
la valeur absolue savait déjà éviter sa question de vocabulaire sur papier —
`if (marche === 'lire' && ctx.papier) return itemRepresenter(…)` — mais on ne
lui disait pas qu'il écrivait pour une feuille. **Une ligne.**

Gardé par `tests/polyDuParcours.test.mjs` : l'épreuve ne nomme aucune fonction,
elle compte les appels à `.generate(` et exige que CHACUN passe `papier: true`.
Elle verra donc arriver un troisième chemin.

## Et le défaut que Rémy n'a pas signalé, qui était le pire

`⩽` et `⩾` — ceux du programme français, que ce dépôt écrit partout —
s'imprimaient **« ? »**. « x ⩾ 3 » sortait « x ? 3 ».

En cherchant les autres, treize caractères perdus :

| | où |
| --- | --- |
| ℕ ℤ ℚ ℝ | « ? — les rationnels », seize exercices |
| ∪ ∩ ∅ ∉ | « I ∩ J » devenait « I ? J » |
| ⩽ ⩾ | toutes les inégalités larges |
| ① ② | les angles à relais |
| ⁺ ⁿ ˟ | « 10⁷⁺⁷ » sortait « 10^7?7 » |

Personne ne les avait vus parce qu'**un PDF ne se regardait pas dans ce
dépôt** : on en comptait les octets et les segments. D'où les deux outils
écrits ce jour-là :

- `node tools/pdfEnImage.mjs <pdf> <png> [échelle] [page]` — rend une page en
  image, avec `pdfjs-dist` déjà présent et Chromium. Deux secondes.
- `node tools/caracteresPerdus.mjs` — balaie tout le catalogue en mode papier
  et dit ce qui devient « ? ». Gardé par `tests/caracteresDuPapier.test.mjs`,
  qui n'est pas une liste mais un FILET : un exercice neuf qui emploiera un
  caractère de plus la fera tomber le jour où il arrive.

## Vu au passage, et laissé

- **Le champ de trèfles tout seul sur sa page.** Quand un parcours ne demande
  qu'un champ, le titre et la consigne tiennent sur la première page et le
  champ part sur la seconde — une page presque blanche. C'est la pose des blocs
  du poly, pas le rendu des trèfles. À regarder à part.
- **La ligne de réponse en trop sur « L'Égalité à Compléter ».** La réponse est
  le terme manquant DANS la fraction ; le pointillé ajouté à droite propose un
  second endroit pour la même réponse. Même famille que « des lignes en
  pointillé qui ne servent à rien », déjà corrigé ailleurs.
