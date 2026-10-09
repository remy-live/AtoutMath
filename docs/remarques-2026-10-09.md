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

## 2. ⬜ Exercice 147 — « on ne comprend pas le 851 »

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

## 3. ⬜ Exercice 146 — « Idem pour le 845, il manque qqch ? »

```
Entoure la bonne réponse.
845.  x est un réel strictement supérieur à 0.  ..........
846.  Voir la droite graduée ci-dessus.         ..........
847.  ]−∞ ; 3[                                  ..........
```

Deux défauts dans le même bloc :

- la consigne dit « Entoure la bonne réponse » et il n'y a rien à entourer ;
- le 846 renvoie à une droite graduée **qui n'est pas sur la feuille**.

## 4. ⬜ Exercice 145 — « il ne manque pas le graphique ? »

```
839.  Voir la droite graduée ci-dessus.  ..........
```

Même défaut que le 846 : l'énoncé renvoie à un dessin absent. Ce sont les
questions dont l'ÉNONCÉ est une figure, et la fiche n'imprime que le texte de
repli.

## 5. ⬜ Les trèfles ne sortent pas en couleur

> « Pour les trèfles, j'ai mis la couleur pour le poly mais je n'ai pas de
> couleur quand je mets en couleur. »

Le réglage « couleur » de la fiche est suivi ailleurs ; le champ de trèfles
sort en noir et blanc quoi qu'on coche.

## 6. ⬜ Les pavages non plus

> « Pour les pavages quand c'est couleur pour le poly, mets de la couleur. »

Même famille que le point 5 — exercices 108 et 109.

## 7. ⬜ Thalès — « les pointillés vont sur l'énoncé »

Exercice 710 : l'égalité à compléter porte trois fractions à pointillés, et les
pointillés du haut passent **sur le texte de l'énoncé** au-dessus.

## 8. ⬜ Exercice 92 — « Écris la question à la ligne »

```
541.  Malo a parcouru 5/7 du trajet. Quelle part lui reste-t-il à faire ? (1 − 5/7 = ....)
```

L'énoncé et le calcul à poser tiennent sur la même ligne, et le calcul
déborde en bout de ligne (voir le 544, dont la parenthèse fermante tombe
seule à la ligne suivante). La question doit passer à la ligne.

## 9. ⬜ Exercice 87 — « le trait de fraction est parfois très grand »

```
511.  3/4 = 6/..........        512.  5/6 = ....../18
514.  4/3 = 24/..........       516.  1/5 = ....../45
```

Quand le terme manquant est au DÉNOMINATEUR, le pointillé est long et la barre
de fraction s'étire à sa largeur : la fraction n'a plus la taille des autres.
