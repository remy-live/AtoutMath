# Les remarques de Rémy — 8 octobre 2026

Écrites ici **avant** d'être traitées : c'est l'habitude prise après la revue du
7 octobre, qui n'avait pas survécu à la session (voir `docs/frictions.md`, « La
revue de Rémy n'était plus sur le disque »).

Son message, mot pour mot :

> en détail, il faut se fier au paramètre, sur le pdf un point est représenté
> par un point alors que dans mes options j'avais mis une croix,. Pour lire un
> codage, pour la version imprimée, le label du point est loin du point. Vérifie
> aussi cela pour la version interactive. Idem pour les milieux. Les trègles
> prennent toutes une page sur le pdf. Attention à la présentation et au mauvais
> retour à la ligne pour union et intersection d'intervalle

Cinq points. Tous faits.

---

## 1. ✅ La marque du point ne suivait pas le réglage — sur le papier

> « il faut se fier au paramètre, sur le pdf un point est représenté par un
> point alors que dans mes options j'avais mis une croix »

**Où** : `geo-codage-lire`, `geo-milieu`, `geo-appartenance*` — tout ce qui
passe par `js/ui/fiches/elementsGeo.js`.

**Ce qui se passait** : la fiche dessinait un disque EN DUR, avec un
commentaire qui le justifiait — « une croix se confondrait avec une marque de
codage ». L'argument n'était pas faux ; il n'était pas le sien. À l'écran, le
SVG porte les trois marques et le CSS en cache deux (`html[data-point]`) ; le
papier n'a pas de feuille de style et ne lisait donc rien.

**Fait** : `traitsDuPoint()` dans `js/core/figures.js` rend la géométrie d'une
marque EN DONNÉES ; l'aperçu de la fiche et le PDF la tracent, en lisant
`data-point` — la même source que le CSS. Et `marqueurPoint()`, l'écran, sort
maintenant de la même fonction : les deux dessins ne peuvent plus diverger.

**Gardé par** : `tests/pointEtSonNom.test.mjs`, quatre épreuves.

---

## 2. ✅ Le nom du point était loin de son point

> « Pour lire un codage, pour la version imprimée, le label du point est loin du
> point. Vérifie aussi cela pour la version interactive. Idem pour les
> milieux. »

**Ce qui se passait** : `placerNoms` essaie vingt-quatre places — trois tours de
douze directions — et garde la mieux dégagée. Mais le score CROÎT avec la
distance : le tour le plus large gagnait presque à chaque fois, même quand le
plus étroit était déjà parfaitement libre.

**Mesuré**, sur 670 étiquettes de « codage » et de « milieu », le rapport
*distance à son point / distance au point voisin le plus proche* :

| | rapport médian | pire cas |
| --- | --- | --- |
| avant | 0,35 | **0,99** — la lettre touchait l'autre point |
| après | 0,15 | 0,38 |

**Fait** : les trois tours sont essayés du plus proche au plus loin, et l'on
s'arrête au premier qui dégage assez ; le rayon passe de 15 à 11.

**La version interactive aussi**, comme il l'a demandé : les deux dessins
partent du même plan. Vérifié au navigateur sur `geo-codage-lire` et
`geo-milieu` — 11,8 à 14,8 px, contre 31,5 avant.

**Gardé par** : `tests/pointEtSonNom.test.mjs`, deux épreuves.

---

## 3. ✅ « Les trèfles prennent toutes une page sur le pdf »

**Ce qui se passait** : `defi-trefles` était déclaré à un champ par page, et le
commentaire qui défendait ce choix annonçait, pour écarter l'autre, que deux
champs par page ramèneraient les trèfles « à quatre millimètres ». **Ce chiffre
n'avait jamais été mesuré.**

**Mesuré** (`node tools/tailleTrefle.mjs`), diamètre d'un trèfle en mm :

| palier | 1 par page | 2 côte à côte | 2 empilés |
| --- | --- | --- | --- |
| la promenade (40) | 19,4 | 12,4 | 9,2 |
| le pré (90) | 16,1 | **10,2** | 7,6 |
| le champ (160) | 13,5 | 8,6 | 6,4 |
| le grand pré (240) | 11,8 | 7,5 | 5,6 |

Un trèfle de la revue qu'il a apportée fait six à huit millimètres.

**Fait** : deux champs côte à côte, et chacun dans un cadre — deux champs voisins
se touchaient par le milieu et se lisaient comme un seul. Au passage, le calcul
de l'échelle tenait compte des seuls CENTRES : les trèfles des bords sortaient
du cadre et ceux du haut recouvraient le titre « Champ 1 ».

**Gardé par** : `tests/treflesSurLaFiche.test.mjs`, deux épreuves neuves.

---

## 4. ✅ Le mauvais retour à la ligne de l'union d'intervalles

> « Attention à la présentation et au mauvais retour à la ligne pour union et
> intersection d'intervalle »

**Ce qui se passait** : l'énoncé papier était UNE phrase — « I = ]−4 ; −1[ et
J = ]−2 ; 2[ » — posée dans une colonne large d'un quart de page. Le navigateur
la coupait où il pouvait, c'est-à-dire au milieu d'un intervalle.

**Fait** : le générateur prépare DEUX lignes, une par intervalle ; la fiche les
pose telles quelles, en haut du bloc (centrées, elles se retrouvaient en face du
deuxième axe et semblaient ne nommer que lui) et marquées insécables — les
séparateurs de « ]−4 ; −1[ » sont des espaces ordinaires, et une colonne plus
étroite rendrait le défaut tel quel.

**Gardé par** : `tests/axeSurLaFiche.test.mjs`, « L'ÉNONCÉ DE L'UNION TIENT EN
DEUX LIGNES, ET AUCUNE NE SE COUPE ».

---

## 5. ✅ « Attention à la présentation » — la double pointe de flèche

Trouvé en relisant la feuille pour le point 4. Sur « I = ]1 ; +∞[ », la pointe
de l'intervalle tombait à une unité de celle de l'axe : deux pointes l'une sur
l'autre ne se lisent pas comme deux flèches, elles se lisent comme une seule, un
peu plus grasse.

**Fait** : l'intervalle non borné recule d'un demi-écart de graduation. Et
l'écran, qui écrivait sa pointe EN DUR, la lit maintenant dans le plan — sans
quoi reculer le plan corrigeait le papier et cassait l'écran.

**Gardé par** : `tests/axeSurLaFiche.test.mjs`, deux épreuves.

---

## Ce qui a été vu au passage, et laissé

- Sur `sec-valeur-absolue`, une réponse en DEUX morceaux — « |x − 1| > 1 »
  donne ]−∞ ; 0[ ∪ ]2 ; +∞[ — se dessine à deux hauteurs différentes sur la même
  droite. C'est le mécanisme qui sert à distinguer I de J quand on les empile ;
  ici les deux morceaux sont le MÊME ensemble, et les étager laisse croire le
  contraire. À demander à Rémy avant de toucher : il corrige ces feuilles, pas
  moi.
