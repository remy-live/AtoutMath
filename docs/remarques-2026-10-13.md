# Les retenues font encore des ovales — 13 octobre 2026

> « Y a pas un souci sur les retenues, elle devrait pas être ronde »
> — capture d'iPhone, « Poser une opération », 129 + 180, étape 2.

**C'est la DEUXIÈME fois.** Le 8 octobre : « sur iPhone, les retenues font des
ovales ». La correction d'alors est bonne et elle tient toujours — mais elle
n'a pas atteint cet exercice-ci.

## Ce qui se passe, mesuré

`tools/tmp/rondDeRetenue.mjs`, un vrai `.po-rond` posé dans `#game-layer` avec
le style du jeu :

| pointeur | mesure | |
| --- | --- | --- |
| au doigt (390 × 844) | **17,9 × 44 px** | ovale, 2,46 fois plus haut que large |
| à la souris (1280 × 900) | 24 × 24 px | rond |

La cause est le plancher tactile de 44 px (`css/modules.css`), qui épargne les
boutons DÉCLARANT que leur taille leur appartient :

```css
#game-layer button:not(.game-icon-btn):not(.btn-carre):not(.fil-pas):not(…) {
    min-height: 44px;
}
```

## Et la division posée, elle, le déclarait déjà

`js/games/poserLongue.js` écrit `btn-carre pl-rond` sur ses deux ronds de
retenue — depuis la correction du 8 octobre. `js/games/poserOperation.js`
écrivait `po-rond` tout court.

**Une correction posée sur un seul des chemins qui mènent au même endroit ne
ferme rien.** Le dépôt a écrit cette phrase cinq fois ; la voici une sixième.

## Ce qu'on fait

1. `po-rond` déclare `btn-carre`, comme `pl-rond`.
2. **Et l'on cesse de corriger au cas par cas** : un outil ouvre tous les jeux
   au format téléphone et liste les boutons que le plancher a étirés. C'est la
   seule façon que la troisième fois n'arrive pas.

*(Le nom `btn-carre` dit « carré » et sert aussi à des pastilles RONDES — les
jetons du Mastermind, les ronds de la division. Son sens réel est « ma taille
est la mienne ». On suit l'usage établi plutôt que d'inventer un second nom
pour la même chose.)*

---

# Ce qui a été fait

## 1. Le rond de retenue déclare sa taille

`po-rond` porte désormais `btn-carre`, comme `pl-rond` le faisait déjà.
Mesuré, cause et correction côte à côte sur le même écran :

| classe écrite par le jeu | au doigt (390 × 844) | |
| --- | --- | --- |
| `po-rond` (avant) | 17,9 × 44 px | ovale, 2,46× |
| `btn-carre po-rond` (après) | 17,9 × 17,9 px | **rond** |

À la souris, les deux font 24 × 24 : le défaut n'existait que sur téléphone,
ce qui explique qu'il n'ait été vu que sur ses captures d'iPhone.

## 2. Et l'on a cessé de corriger au cas par cas

`node tools/boutonsEtires.mjs` ouvre **les quatre-vingts activités** du
catalogue sur un téléphone de 390 × 844 et mesure chaque bouton de la couche de
jeu. **1 902 boutons mesurés, 0 activité en échec.**

Il a trouvé seul un second fautif que personne n'avait signalé : **les facteurs
cliquables d'un produit posé** (`pp-jeton`, exercice « Poser un produit »), à
18 × 44 px — deux fois et demie plus hauts que larges. Un « 3 × 11 × 45 » dont
chaque facteur fait deux centimètres de haut n'est plus un produit, c'est une
colonne. Corrigé de la même façon.

Après les deux corrections : **zéro ovale**.

## 3. Ce qu'il reste, et que je ne touche pas sans lui

L'outil signale 43 boutons « nettement plus hauts que larges ». Ce ne sont pas
des ovales, et aucun n'a été signalé — je les laisse à son arbitrage :

| exercice | boutons | mesure |
| --- | --- | --- |
| **Duel de calcul** | 20 | `du-touche` 27 × 74 px, `du-table` 36 × 74 px |
| **Le Mot Codé** | 16 | `mk-clef` 24 × 44 px |
| **Quelle heure est-il ?** | 4 | `hg-pas-btn` 26 × 44 px |
| **Les Diviseurs** | 1 | `dv-cible` 43 × 67 px |

Les touches du Duel ne viennent **pas** du plancher tactile (74 px ≠ 44) :
c'est la mise en page du jeu qui les étire à dix touches sur 390 px de large.
Les trois autres, si. À voir s'il les trouve gênantes sur son téléphone.

---

# « Colonne qui ne sont pas de même largeur »

Capture d'iPhone, exercice « Chasse au Chiffre », outil **Tableau de
numération**. Sept colonnes qui devaient être identiques — un chiffre par
case — et qui ne l'étaient pas.

## 1. Ce qui était mesuré

| | « unités » | « centièmes » | écart |
| --- | --- | --- | --- |
| au doigt (390 × 844) | 35,2 px | 54,4 px | **19,2 px** |
| à la souris (1280 × 900) | — | — | 4,8 px |

L'écart suit exactement la longueur des étiquettes. La feuille de style
déclarait pourtant `table-layout: fixed` **et** une largeur par cellule, et son
commentaire annonçait déjà « toutes de la même largeur ». Les trois choses
étaient fausses ensemble, et c'est ce qui a rendu le défaut difficile.

## 2. Pourquoi la déclaration ne suffisait pas

- `table-layout: fixed` **répartit à égalité tout seul** — mais seulement quand
  personne ne déclare de largeur. Le `width: 3.1em` posé sur chaque cellule le
  faisait taire.
- `3.1em` **se résout sur la police de la cellule** : `.66rem` dans un en-tête,
  `1rem` dans une case. La même déclaration demandait 33 px à l'une et 50 px à
  l'autre.

## 3. Le premier correctif était faux, et la mesure l'a dit

Donner une largeur définie à la table égalise bien les sept colonnes — 52,8 px
partout. Mais le panneau qui porte le tableau se dimensionne sur son contenu :
le tableau finissait **à x = 406,6 dans une fenêtre de 390 px**, soit 16,6 px
dehors, et 86,6 px dehors sur un téléphone de 320 px.

Des colonnes égales qu'il faut faire défiler ne valent pas mieux que des
colonnes inégales. C'est la photo qui l'a dit, pas le calcul : les nombres,
eux, annonçaient « 0 px d'écart, aucun mot coupé ».

## 4. Le correctif retenu

**Quatorze variantes essayées dans le navigateur**, sur quatre largeurs d'écran
dont le plus petit téléphone encore en service (320 px). Trois lignes :

- plus aucune largeur par cellule — `fixed` répartit, c'est son métier ;
- la table **remplit** la place (`width: 100%`) au lieu de l'imposer ;
- l'en-tête se mesure sur la place disponible (`clamp(.4rem, 2.7cqi, .66rem)`),
  sans quoi « centièmes » déborde de sa colonne dès 390 px.

| écran | colonnes | tableau | en-tête | mots coupés |
| --- | --- | --- | --- | --- |
| 320 × 700 | 35,4 px — **égales** | dans l'écran | 6,75 px | aucun |
| 390 × 844 | 45,4 px — **égales** | dans l'écran | 8,64 px | aucun |
| 768 × 1024 | 55,4 px — **égales** | dans l'écran | 10,53 px | aucun |
| 1280 × 900 | 55,4 px — **égales** | dans l'écran | 10,53 px | aucun |

Le `2,7` n'est pas arrondi au confort : « centièmes » mesure 4,96 fois la
taille de sa police, et l'essai à `3cqi` le coupe sur les deux téléphones.

## 5. Et l'on a balayé la classe plutôt que l'objet

La cause de fond était partagée : `.np-outil` n'était borné que par un
`max-width: 420px` — plus large qu'un iPhone. `node tools/tmp/panneauxDOutils.mjs`
ouvre **les sept panneaux d'outils** du catalogue sur un téléphone :

| exercice | outil | largeur |
| --- | --- | --- |
| Chasse au Chiffre | Tableau de numération | 350 px |
| Arrondir | Les trois mots | 377,9 px |
| Le Disque | La valeur de π | 329 px |
| Grandeurs composées | Voir le schéma · La méthode | 360 · 377,9 px |
| Vitesse | Voir le schéma · Les formules | 360 · 377,9 px |

**Aucun ne sort de l'écran.** Le tableau était le seul au contenu rigide : la
largeur définie ne lui est donc donnée qu'à lui (`:has(.tn-cadre)`), et les
autres panneaux gardent leur taille — un dessin de 200 px n'a rien à gagner à
occuper 420 px.

---

# « Le compteur de vitesse est là, est-ce dû à l'aperçu ? »

Capture d'iPhone, **Sprint des Notations**, étape 3 d'un parcours, vu depuis
l'**aperçu** du professeur. Rémy voit « Vitesse 1 », « Série 0 » et une barre
dorée qui se vide, et demande si c'est l'aperçu qui les ajoute.

> « Je parle sur téléphone depuis tout à l'heure. »

— donc tout ce qui suit se mesure au doigt (390 × 844), pas à la souris.

## 1. La réponse : non, ce n'est pas l'aperçu

« Sprint des Notations » **est** un contre-la-montre. Le catalogue le dit en une
ligne — `activityId: 'sprint'` (`js/data/geometrie.js`) — et la consigne de
l'exercice, écrite pour l'élève, l'annonce déjà :

> « Réponds avant que la jauge ne se vide : elle se remplit de moins en moins
> longtemps à mesure que tu enchaînes. »

Mesuré par le chemin de l'élève, sur un téléphone de 390 × 844 et sans aucun
aperçu : « Vitesse 1 » et « Série 0 » sont là, à y = 106, et la jauge à y = 134.
Le compteur appartient donc à l'exercice. C'est même tout son ressort : le temps
accordé part de neuf secondes et se resserre de 12 % à chaque bonne réponse,
sans descendre sous 2,6 s ; une erreur le desserre de 22 %, pour qu'un élève en
difficulté ne s'enferme pas contre un mur.

L'exercice frère **« Les Notations »** (`geo-notations`) pose exactement les
mêmes questions **sans** chronomètre. Si vous voulez la notion sans la course,
c'est celui-là qu'il faut mettre dans le parcours.

## 2. Ce que sa capture montrait d'autre, et qu'il n'a pas signalé

Sur l'image, la jauge dorée passe **entre les deux lignes de la question** —
« Quelle est la » au-dessus, « bonne écriture ? » en dessous.

Ce n'était pas une illusion. Reproduit à 390 × 440 — la hauteur qui lui reste
une fois les barres du professeur déduites de son iPhone — et c'est pire qu'une
gêne : **la barre tranche les lettres de « Comment note-t-on » par le milieu.**

La cause n'est pas un chevauchement : `.sprint-scene` est une colonne flex, qui
l'interdit. C'est qu'**un contenu centré qui ne tient pas déborde des deux
côtés** — moitié en haut, moitié en bas —, et que le haut passe sous la jauge,
dont le fond est opaque. La question sortait par le haut de 32,6 px.

| 390 × … | avant | après |
| --- | --- | --- |
| 844 (l'élève) | question dégagée | **identique au pixel près** |
| 620 | question dégagée | identique |
| 520 | question dégagée | identique |
| **440 (son aperçu)** | **la jauge tranche l'énoncé** | **question dégagée** |

Le correctif tient en deux mots, `safe center`, et ce n'était pas une invention :
cette feuille les emploie déjà **neuf fois** — `.run-screen`, `.rep-layout`,
`.angles-layout`, `.hg-layout`… La scène du contre-la-montre était restée en
arrière, et son voisin opaque le lui a fait payer.

`overflow-y: auto` va avec : `safe` ne crée pas de place, il déplace les 32,6 px
vers le bas, où sont les réponses. À 440 px le contenu dépasse de 160 px — les
quatre réponses passent en une seule colonne sous 420 px — et aucun réglage de
police ne fabrique 160 px.

## 3. Ce que je n'ai pas touché, et qui mérite son avis

L'aperçu « mobile » pose au jeu un cadre de **400 px de large** dans son écran
de 390, et l'aperçu « tablette » un cadre de **768 px** — 189 px dehors. Ces
deux lignes ont été écrites pour un ordinateur, où simuler un téléphone demande
un cadre étroit dans un grand écran. Sur un vrai téléphone, elles n'ont plus de
sens : il **est** le téléphone.

Faut-il, sur un écran étroit, que les trois boutons d'aperçu se taisent et
montrent simplement la page ? C'est un choix d'usage, pas un défaut : je le lui
laisse.
