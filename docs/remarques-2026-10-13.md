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

---

# « Sur téléphone le texte est gros, le schéma minuscule »

Capture d'iPhone, **Lire un codage**, étape 3 d'un parcours en aperçu. La
question « Combien d'égalités de longueurs ce codage donne-t-il ? » occupe
**trois lignes** en très gros caractères ; la figure codée, qui est ce qu'il
faut LIRE pour répondre, tient dans un timbre au milieu de l'écran.

C'est un rapport, pas une taille : il ne demande pas que le texte rapetisse,
il demande que ce soit la figure qu'on voie.

---

# « J'aimerais aussi pouvoir modifier le pseudo d'un élève et son mot de passe »

Demandé le 13 octobre, dans la foulée des remarques d'affichage. Deux gestes
distincts, qui ne se valent pas :

- **changer le pseudo** : un élève s'est inscrit avec une faute, ou deux élèves
  portent le même nom, ou un prénom change. C'est une correction d'état civil ;
- **changer le mot de passe** : un élève l'a oublié. Le professeur ne doit pas
  pouvoir LIRE l'ancien — il n'est pas stocké en clair, et c'est une bonne
  chose —, mais il doit pouvoir en poser un nouveau.

Ce qui suit est à vérifier dans le code avant toute écriture : ce que l'API
sait déjà faire, qui a le droit de le faire, et ce que l'unicité du pseudo
impose.

> « il faut que ce soit simple de le renommer »

Donc : **un bouton sur la ligne de l'élève, une fenêtre pré-remplie avec son
pseudo actuel, Entrée pour valider.** Pas d'enchaînement de confirmations —
renommer n'efface rien et se refait en trois secondes si l'on s'est trompé.
On réserve la confirmation à ce qui ne se répare pas (« retirer »).

Ce que l'état des lieux a montré :

| | où | ce qui existe |
| --- | --- | --- |
| pseudo | colonne « Identifiant », `students.login` (+ `login_key`) | **rien** — aucune action de l'API ne le change |
| mot de passe | colonne « Code », `students.access_code` | bouton « code », qui en **tire un au hasard** — on ne peut pas le CHOISIR |

Le pseudo est unique dans toute la base (`login_key`), pas seulement dans la
classe : un renommage doit donc refuser un pseudo déjà pris, et le dire.

## Ce qui a été fait

**Le bouton « renommer »**, sur la ligne de l'élève, juste à côté de
l'identifiant qu'il change. Un clic ouvre une fenêtre dont le champ est
**déjà rempli** avec son identifiant actuel, et sélectionné : on corrige une
faute de frappe sans retaper le reste. Entrée valide. Pas de confirmation —
renommer n'efface rien, et on garde « écrivez RETIRER » pour ce qui ne se
répare pas.

**Le bouton « code » choisit maintenant.** Il ouvre une fenêtre pré-remplie
avec un code tiré au hasard : valider, c'est l'ancien geste à une touche près ;
écrire par-dessus, c'est choisir le sien. Les deux demandes de Rémy tiennent
ainsi dans une seule fenêtre.

Mesuré par le chemin du professeur, dans un vrai navigateur :

```
bouton « renommer » 79×25 px · élève « Bernard Tom » · identifiant « tom.b »
fenêtre « L'identifiant de Bernard Tom » · bouton « Renommer »
champ : « tom.b » PRÉ-REMPLI · 5 signes sélectionnés
après le renommage, la ligne porte « essai.renomme »  ÉCRIT
fenêtres natives : 0 · erreurs de page : 0
```

**Ce que le serveur refuse, et le dit en français** : un identifiant déjà pris
(« Ajoutez une initiale, par exemple "emma.d.2" »), un identifiant vide, un
code avec un espace ou un accent. Onze vérifications neuves dans
`tools/testApi.php`, **vues tomber une par une**.

**Le code de l'élève ne change pas quand on le renomme.** Un billet distribué
ne se périme pas parce qu'on corrige une faute de frappe. L'épreuve le prouve
en reconnectant l'élève avec son ancien code sous son nouveau nom.

### Un défaut rencontré en chemin, et gardé

Le bouton s'est d'abord affiché **sans rien faire**. L'espace classes n'écoute
pas les boutons un par un : un seul gestionnaire remonte au `closest()` d'une
liste de crochets. Un crochet neuf qu'on oublie d'y inscrire échoue **en
silence** — le bouton a la bonne taille, la bonne infobulle, les bons
attributs, et le clic ne déclenche rien.

`tests/crochetsDeLEspaceClasses.test.mjs` compare désormais les crochets posés
sur des boutons à ceux que les répartiteurs écoutent, et nomme ceux qui
manquent.

---

# « Là c'est tronqué sur téléphone »

Capture d'iPhone, **Le Tableau à Double Entrée**, « Le tournoi d'échecs »,
étape 4 d'un parcours en aperçu. Le tableau s'arrête **au milieu de sa
troisième ligne** — on voit l'en-tête, « Gagnées », « Nulles », puis une ligne
coupée en deux —, et sous la coupure il reste **la moitié de l'écran en
blanc**. Une barre de défilement fine apparaît à droite du tableau.

Donc ce n'est pas la place qui manque : c'est une hauteur imposée au cadre du
tableau pendant que la page en dessous ne sert à rien.

## Ce qui coupait, et ce qui ne coupait pas

**Deux déclarations faisaient le défaut, et aucune ne se devine.**

`.tc-wrap` portait `height: 100%` — il prenait donc la hauteur du plateau quel
que soit son contenu — **et** `min-height: 0`, qui autorisait le surplus à
rétrécir jusqu'à zéro. C'est exactement le piège de la scène du
contre-la-montre, corrigé le matin même : un élément flex dans une colonne.

`overflow-y: auto` ne rattrapait rien. Il rend le contenu **atteignable**, pas
**visible** — et une ligne de tableau coupée en deux ne se lit pas « il y a la
suite plus bas », elle se lit « c'est cassé ».

| 390 px de large | avant | après |
| --- | --- | --- |
| 844 px | 0 px caché | **identique** |
| 560 px | **204 px cachés** | 0 px caché, la page glisse de 204 |
| 440 px (son aperçu) | **324 px cachés** | 0 px caché, la page glisse de 324 |

Mesuré sur **huit tirages** à chaque hauteur : la largeur du tableau dépend du
nombre de colonnes, et une mesure sur un seul tirage ne dit rien de
l'exercice. `.canvas-area` sait déjà défiler : une page qui glisse est un geste
que tout le monde connaît, une barre de quatre pixels au bord d'un tableau n'en
est pas un.

### Ce que je n'ai pas touché, et j'ai failli

Ma première sonde criait « le tableau sort de 26 px à droite ». C'était un faux
positif : le jeu pose **déjà** `[data-table] { overflow-x: auto }`, et la
décision est écrite et mesurée là-bas — « la colonne coupée est celle des
**totaux**, celle que l'exercice demande de compléter ». Le tableau ne sort pas :
il défile dans sa boîte. J'avais écrit un bloc qui doublait celui-là, et qui
était d'ailleurs mort — placé plus haut dans la feuille, il était écrasé par
l'existant. Retiré.

---

# « Idem c'est petit — est-ce manière générale, ou parce que c'est le mode aperçu pour prof ? »

Capture d'iPhone, **Relie les points**, étape 5 d'un parcours. La grille 6 × 6
occupe moins du quart de l'écran, et plus de la moitié de la page est vide en
dessous.

La question est la bonne, et c'est elle qu'il faut trancher AVANT de corriger
quoi que ce soit : ce qu'il voit depuis son aperçu, ses élèves le voient-ils ?

## La réponse : non, l'aperçu ne ment pas

`node tools/apercuContreEleve.mjs` ouvre le **même exercice** par les deux
chemins, dans la **même fenêtre de 390 × 844**, et compare la part de l'écran
que prend le dessin.

| exercice | l'élève | son aperçu « mobile » | écart |
| --- | --- | --- | --- |
| **Relie les points** | 47 % | 43 % | −4 points |
| Le Tableau à Double Entrée | 20 % | 23 % | +3 |
| Lire un codage | 32 % | 44 % | +12 |

**Donc ce qu'il voit, ses élèves le voient.** Ses remarques de ce matin valent
pour trente téléphones, pas pour un mode d'affichage. (L'aperçu « tablette »,
lui, pose un cadre de 768 px dans un écran de 390 : 189 px hors écran. Celui-là
n'a aucun sens sur un téléphone.)

## Mais « c'est petit » a une cause, et elle n'est pas l'aperçu

**C'est la HAUTEUR qui lui manque, pas l'exercice.** Les barres du professeur
— étape du parcours, titre, boutons de pilotage — lui prennent près de 300 px
de ses 844. Il regarde donc chaque jeu dans l'équivalent d'un écran de 440 px,
que ses élèves n'ont jamais.

Dans « Relie les points », à cette hauteur, le **mobilier** prend 252 px :

| | hauteur |
| --- | --- |
| titre du jeu | 77 px |
| **barre des cinq boutons** | **144 px** |
| note | 31 px |
| **ce qui reste à la grille** | **170 px** |

Chez l'élève, à 844 px, la grille fait **330 px — 85 % de la largeur de
l'écran**, et c'est le maximum qu'une grille carrée puisse y prendre : les
60 px restants sont les marges du plateau (40) et du cadre (20).

### Ce que j'ai corrigé, et ce que je n'ai pas voulu corriger

**Le titre était écrit deux fois** — « Relie les points » s'affiche dans la
barre du haut *et* dans le jeu. Sur un plateau de moins de 520 px, le second se
tait : 20 px rendus, sans contrepartie.

**Je n'ai pas touché aux boutons.** Les resserrer demandait de passer sous le
plancher tactile de 44 px — celui dont le contournement a produit les ovales
qu'il a signalés deux fois. Mon essai a d'ailleurs refusé de s'appliquer tout
seul, `#game-layer button` pesant plus lourd que `.rp-btn` : l'outil avait
raison avant moi.

**Et je n'ai pas rendu son plancher à la grille**, bien que ce soit la façon
évidente de l'agrandir : ce plancher a été retiré **exprès**, le mois dernier,
parce qu'il poussait les boutons sous le bord de l'écran — et c'est ce que Rémy
appelait déjà « tronqué ». Le remettre échangerait sa plainte d'aujourd'hui
contre celle d'hier.

À 440 px de haut, ce jeu ne tient pas : le cadre défile, donc rien n'est perdu,
mais il faut glisser pour atteindre les boutons. **C'est la hauteur de son
aperçu qui est en cause**, et c'est le vrai sujet — voir plus haut : les trois
boutons mobile/tablette/ordinateur ont été écrits pour un ordinateur.

---

# « Changer le nom et le mdp avec un double clic, ce serait bien mieux »

Demandé le 13 octobre, juste après les deux boutons posés le matin. Il dit
« le **nom** », et non plus « le pseudo » : la ligne d'un élève porte TROIS
champs, et il les veut tous les trois sous la main.

| colonne | ce que c'est | changeable avant |
| --- | --- | --- |
| **Élève** | son prénom (`first_name`) | **non** — seul un import le corrigeait |
| **Identifiant** | ce qu'il tape pour entrer (`login`) | oui, bouton « renommer » |
| **Code** | son mot de passe (`access_code`) | oui, bouton « code » |

Donc : double-clic sur la cellule, la fenêtre s'ouvre pré-remplie, Entrée
valide. On clique **sur ce qu'on lit**, ce qui est plus court que de viser un
petit bouton à l'autre bout de la ligne.

**Les boutons restent.** Un double-clic n'existe pas vraiment au doigt — un
double-tap déclenche souvent le zoom du navigateur —, et la liste se consulte
aussi sur téléphone. Le double-clic est un raccourci pour la souris, pas un
remplacement. À lui de dire s'il veut qu'on retire les boutons ensuite.

## Ce qui a été fait

**Les trois cellules se double-cliquent** — prénom, identifiant, code. La
fenêtre s'ouvre pré-remplie, Entrée valide. Un pointillé sous la valeur et un
curseur de texte le disent : un double-clic ne laisse aucune trace à l'écran,
et personne ne le découvre par hasard.

Mesuré par le chemin du professeur, dans un vrai navigateur :

| double-clic sur | fenêtre | champ pré-rempli | après |
| --- | --- | --- | --- |
| **prénom** | « Le prénom de cet élève » | « Bernard Tom » | **écrit** |
| **identifiant** | « L'identifiant de DUPONT Emma » | « dupont.emma » | **écrit** |
| **code** | « Le code de DUPONT Emma » | un tirage | **écrit** |

Un **simple** clic sur le prénom ne fait rien — sinon on renommerait un élève
en voulant seulement poser le curseur quelque part. Zéro fenêtre native, zéro
erreur de page.

**Le prénom était le seul des trois que rien ne changeait** : il fallait
recoller toute la liste de la classe pour corriger une faute de frappe. Six
vérifications neuves dans `tools/testApi.php`, dont celle qui compte le plus :
**l'empreinte du prénom doit suivre**. C'est par elle que l'import reconnaît un
élève déjà là ; la laisser derrière, c'est préparer un doublon au prochain
collage de liste — un second compte qui n'aurait fait aucun exercice. Vue
tomber.

### Deux pièges rencontrés en chemin

`data-prenom` **existait déjà** sur les boutons « renommer » et « code », où il
porte le prénom pour le titre de la fenêtre. Mon écouteur dérivait le sélecteur
du nom du champ : un double-clic sur le prénom trouvait le bouton « renommer »
et ouvrait la fenêtre de l'**identifiant**. La correspondance est maintenant
écrite, pas déduite.

Et ma sonde a d'abord lu « rien n'a changé » sur un prénom qui venait de
changer : **la liste se retrie par prénom**, donc la première cellule désigne
quelqu'un d'autre. On suit l'élève par son identifiant.

---

# « Changer sans popup, et que ça accepte aussi le point »

> « là je ne peux pas taper le point »

Deux demandes, et la seconde est un **défaut** : un identifiant d'élève s'écrit
`emma.d`. Si le point ne s'écrit pas, la fenêtre de renommage ne sert à rien
pour le cas le plus courant. À reproduire en tapant VRAIMENT au clavier — poser
la valeur par script ne traverse aucun écouteur et ne prouve rien.

Et sur la forme : il veut **modifier dans la cellule**, pas dans une fenêtre.
C'est la même ligne rouge que « tu utilises des alert et prompt, on évite ! »,
poussée d'un cran : même une fenêtre maison est un détour quand on a la valeur
sous les yeux.

## Ce qui a été fait

**Plus aucune fenêtre.** Le prénom, l'identifiant et le code se modifient
**dans la cellule**, comme dans un tableur : double-clic (ou les deux boutons
de la ligne, qui ouvrent la même cellule au doigt), le champ arrive pré-rempli
et sélectionné, **Entrée** valide, **Échap** annule, **cliquer ailleurs**
valide aussi.

Mesuré en **tapant vraiment au clavier**, dans un vrai navigateur :

| cellule | tapé | le champ porte | en base |
| --- | --- | --- | --- |
| prénom | `Jean-Luc A.` | `Jean-Luc A.` | **écrit** |
| identifiant | `jean.luc.a` | `jean.luc.a` | **écrit** |
| code | `6e.2` | `6e.2` | **`6E.2`** |

**Aucune fenêtre** dans les trois cas. Échap annule sans fermer la classe — la
pièce écoute Échap pour se refermer, et il a fallu arrêter la touche dans la
cellule, sans quoi un élève à moitié renommé faisait perdre tout l'écran.

### Le point

**Dans l'identifiant, le point passait déjà** : mesuré en tapant au clavier, à
la souris comme au doigt, `a.b-_2é` arrive entier. Ce n'était donc pas un
filtre de saisie.

**C'est le CODE qui le refusait.** Sa règle était `[A-Za-z0-9]{3,12}` : un
professeur qui donne `6e.2` à sa classe recevait un refus sans savoir quel
signe gênait. Le point, le tiret et le souligné sont maintenant acceptés — ces
trois-là et pas d'autres, parce qu'un code se **dicte** et se **recopie** depuis
un billet photocopié. L'apostrophe reste refusée, et l'espace aussi : elle
casserait en plus le collage d'une liste, où elle sépare les colonnes.

Même alphabet pour le code commun de toute la classe : deux règles pour le même
objet finissent toujours par diverger, et c'est le professeur qui paie la
différence.

> **Si le point résiste encore sur son iPhone**, ce n'est pas le logiciel : il
> faudra regarder son clavier. Je n'ai pas pu le reproduire, ni à 1280 px ni à
> 390 px, ni dans la fenêtre d'hier ni dans la cellule d'aujourd'hui.

---

# « Sur Poser une opération, les élèves ont fait 2 opérations (ou 3) et ont eu 5/5 »

Signalé le 13 octobre, après une séance en classe. C'est un défaut de
**notation**, et c'est le plus grave de la journée : tout le reste touche à ce
qu'on voit, celui-ci touche à ce que le professeur croit savoir du travail de
ses élèves. Une étape se referme en 5/5 après deux ou trois opérations.

À reproduire en JOUANT l'exercice, pas en lisant le code : il faut savoir
combien de fois le jeu annonce une réponse juste, et ce que le meneur en
compte.

## La cause, mesurée

Le jeu déclarait **deux réussites par opération** : une à l'alignement sur la
virgule, une au résultat. Mesuré en espionnant `state.recordAttempt` pendant
une vraie partie :

```
2 tentative(s) déclarée(s) :
  ✓ COMPTE COMME UNE QUESTION   « Aligner 47 + 128 »
  ✓ COMPTE COMME UNE QUESTION   « 47 + 128 »
  le meneur en a retenu : 2
```

D'où l'arithmétique exacte de ce que Rémy a vu :

| ce que l'élève a fait | ce que le compteur a vu |
| --- | --- |
| 3 opérations | 6 → l'étape de 5 se referme à la troisième |
| 2 opérations + l'alignement d'une 3ᵉ | 5 → **5/5** |

« 2 opérations (ou 3) » : les deux cas, exactement.

**Le remède existait déjà.** `core/BaseGame.js` écrit la règle — « UNE ÉTAPE
N'EST PAS UNE QUESTION […] c'est l'OPÉRATION qui compte, une fois finie » — et
`core/runner.js` l'applique en une ligne (`if (payload.partiel) return;`). Ce
jeu n'avait jamais posé le drapeau.

Après, sur la même partie :

```
  ✓ partiel                     « Aligner 820 + 728 »
  ✓ COMPTE COMME UNE QUESTION   « 820 + 728 »
  le meneur en a retenu : 1
```

L'alignement **reste enregistré** : il nourrit les statistiques et le carnet
d'erreurs — aligner sur la virgule est une vraie réussite, et même la moitié
difficile de l'exercice. Il ne fait simplement plus avancer le compteur.

## Et ce n'est peut-être pas le seul

`node tools/comptesDesJeux.mjs` (neuf) cherche la même forme dans tout le
catalogue : **124 déclarations de réussite dans 82 fichiers**, dont **13
fichiers** déclarent plusieurs réussites sans jamais marquer la moindre étape.

Six ont très exactement la forme de celui-ci — une réussite par élément, **plus
une pour la manche entière** :

| jeu | par élément | par manche |
| --- | --- | --- |
| Le Chantier | `6 × 7` | « Chantier terminé » |
| Les Mots Cachés | un mot trouvé | « Grille terminée » |
| 2000 | une addition | « Atteindre la tuile » |
| Le Plateau | un coup | « mat en N » |
| Point à point | un calcul | « Relier N points » |
| Le Peintre | une case | « niveau N » |

Dans Les Mots Cachés, la manche se déclare **dans la même respiration** que le
dernier mot : ce dernier mot compte donc deux fois.

**Je ne les ai pas corrigés.** Deux fois aujourd'hui, une règle qui paraissait
fausse s'est révélée délibérée et mesurée — le plancher tactile, la règle de
Thalès. Ces six-là demandent d'ouvrir chaque jeu et de compter, comme on vient
de le faire pour celui de Rémy. À lui de dire si l'on s'y met.

Les sept autres (`patrons`, `conversion`, `redaction`, `nova`, `course`,
`tetris`, `ninja`) semblent déclarer des questions **distinctes** plutôt qu'une
étape et sa somme — sauf peut-être `redaction`, dont les trois déclarations
ressemblent aux trois étapes d'UNE démonstration.

---

# « On a fait des exercices où il faut convertir 3,5 en 35/10 et inversement »

Séance en classe, 13 octobre. Les **fractions décimales** : passer de l'écriture
à virgule à la fraction de dénominateur 10, 100, 1000 — et l'inverse.

C'est le pivot du chapitre : un nombre décimal EST une fraction décimale, et
l'élève qui ne fait pas ce va-et-vient apprend deux objets au lieu d'un.

Premier geste : regarder ce que le catalogue sait déjà faire.

## Ce qui a été fait

**« Virgule ou Fraction ? »** (`num-fraction-decimale`, code dicté **VF**), dans
le chapitre Numération, juste avant les décimaux.

**Le va-et-vient EST l'exercice**, et non l'un des deux sens : un élève qui
n'apprend que « virgule → fraction » apprend une recette. Les deux sens et les
deux trous sortent donc par défaut :

| ce qui est posé | ce qu'on demande |
| --- | --- |
| `749/100 = ?` | **7,49** — la touche virgule apparaît |
| `7,6 = ?/10` | **76** — le numérateur, virgule retirée |
| `3,294 = 3294/?` | **1000** — le dénominateur, décimales comptées |

Demander le **dénominateur** est l'autre moitié de la règle, et la plus
oubliée : donner `/10` et demander le numérateur, c'est seulement demander de
retirer la virgule.

**Le zéro qui tient le rang est posé exprès** — 7/100 fait 0,07, pas 0,7 ; 3,05
fait 305/100, pas 35/100. Il ne sort presque jamais d'un tirage uniforme : une
question sur trois le pose quand le rang le permet. Mesuré : 6 fois sur 30.

Mesuré en jouant, dans un vrai navigateur :

```
749/100 = ?      touche virgule : oui   tapé « 7,49 » → ACCEPTÉE
3,09 = ?/100     touche virgule : non   tapé « 309 »  → ACCEPTÉE
fenêtres natives : 0 · erreurs de page : 0
```

### Deux choses que les épreuves ont trouvées, et pas moi

**J'avais écrit un danger qui n'existe pas.** Le commentaire du générateur
affirmait que `305 / 100` vaut `3.0500000000000003` et qu'il fallait éviter les
flottants. `epreuveTombe` a posé sa seconde question — *ce défaut existe-t-il ?*
— et l'essai a tranché : sur **les 300 000 numérateurs** que cet exercice peut
tirer, la division et la composition chiffre à chiffre donnent exactement le
même nombre. **Zéro divergence.** Le commentaire est corrigé, et l'épreuve qui
gardait ce faux danger a été remplacée.

**Et mon générateur avait un vrai défaut, que je n'avais pas vu.** L'épreuve qui
l'a remplacée garde la règle du cours : *autant de décimales que le dénominateur
a de zéros*. Elle est tombée **sur mon propre code** : à trois décimales, le
tirage du piège pouvait rendre 3050, qui s'écrit 3,05 — deux décimales pour un
dénominateur 1000. L'élève qui compte les chiffres après la virgule, comme on
le lui apprend, aurait répondu 100 et aurait été marqué faux. Corrigé avant que
l'exercice ne serve.

---

# « Fais tout » — les jeux qui comptaient une question de trop

Suite de « 2 opérations et 5/5 ». J'ai ouvert les **treize** fichiers que
`tools/comptesDesJeux.mjs` signalait. Huit avaient le défaut, cinq étaient
sains.

## La règle, et elle n'est pas de moi

**Le manifeste de chaque activité déclare son unité de compte** — `unite:
'chantier'`, `unite: 'mot'`, `unite: 'partie'`, `unite: 'dessin'`. Ce qui
correspond à cette unité est la question ; tout le reste est une étape.

**Deux fois sur huit, cette règle m'a contredit.** Dans ma réponse d'hier je
disais que Le Chantier et Le Plateau comptaient « un par élément plus un par
manche » et qu'il fallait marquer la manche. C'est l'inverse : leur manifeste
dit `chantier` et `partie`, donc **c'est l'élément qui est l'étape**. Une
relecture au jugé aurait inversé les deux.

## Les huit corrigés

| jeu | l'unité dit | ce qui devient une étape |
| --- | --- | --- |
| **Le Chantier** | `chantier` | le bloc posé |
| **Le Plateau** (échecs, dames, othello) | `partie` | le coup joué |
| **Point à point** | `dessin` | le calcul relié |
| **Rédiger un raisonnement** | `rédaction` | la propriété **et** les données |
| **Les Mots Cachés** | `mot` | la grille terminée |
| **2000** | — | la tuile visée (déjà comptée comme palier) |
| **Le Peintre** | — | le niveau terminé |
| **Le tableau de conversion** | — | garnir le tableau (la mise en place) |

**Rédiger un raisonnement était le pire** : ses trois marches — reconstituer la
propriété, lire les données, conclure — comptaient pour **trois rédactions**.
Une étape de quatre se refermait après la deuxième.

## Et deux jeux créditaient une réussite pour avoir QUITTÉ la partie

`Course` et `Math Tetris` appelaient `onCorrectAnswer(null)` depuis
`quitGame()` — sans énoncé, sans attendu, sans donné. `core/BaseGame.js`
signalait déjà ces appels comme « trompeurs » et leur avait retiré la carte
« Bonne réponse ! » : **c'est l'affichage qui avait été corrigé, pas le
compte.** Course créditait aussi une prime de fin de course.

Je n'ai **pas supprimé** ces tentatives : la maison a écrit qu'elle les gardait
(« c'est l'affichage qu'on supprime, pas la donnée »). Je leur ai seulement
retiré le droit de compter pour une question.

> **Une question pour Rémy** : faut-il qu'abandonner une partie enregistre
> encore une *bonne réponse* dans les statistiques ? Je ne l'ai pas tranché
> tout seul, parce que la décision de garder la donnée est écrite.

## Les cinq sains, et pourquoi

| jeu | pourquoi ce n'est pas un défaut |
| --- | --- |
| **Ninja des Nombres** | les deux déclarations s'excluent par le mode ; une seule part |
| **Nova** | six façons distinctes de répondre à une multiplication |
| **Le patron du cube** | chaque question porte sa `famille` ; une seule des deux part |

Ils sont nommés dans l'épreuve, avec leur raison, plutôt que d'affaiblir le
critère : une liste qu'on lit vaut mieux qu'un seuil qu'on baisse.

## Ce que garde l'épreuve

Deux choses, et la seconde a été trouvée par `epreuveTombe` : la **forme**
(aucune étape marquée dans un fichier qui déclare plusieurs réussites) et, pour
les dix jeux corrigés, le **nombre** de déclarations pleines. La première seule
laissait passer « Rédiger un raisonnement », dont un des trois sites était déjà
marqué. Les neuf défauts remis un par un la font tomber.

---

# Les six arbitrages de Rémy — 13 octobre, fin de journée

> « Ok pose moi les questions et quand je dis je ne sais pas tu ne fais rien »

Cinq questions étaient en attente de son avis, et un chantier n'attendait qu'un
feu vert. Il a répondu aux six. **La consigne vaut autant que les réponses :
sur ce qu'il ne sait pas, on ne fait rien** — ni correctif, ni enquête, ni
« au cas où ». Elles sont écrites ici avant d'être travaillées, pour qu'on
puisse relire ce qu'il a dit plutôt que ce dont je me souviens.

| ce qui était en attente | sa réponse |
| --- | --- |
| Les 43 boutons étirés | **« Oui, à corriger »** |
| Les trois boutons d'aperçu sur téléphone | **« Les masquer sur écran étroit »** |
| Quitter une partie, dans les statistiques | **« Garder la donnée »** |
| Les millièmes de « Virgule ou Fraction ? » | **« Cocher par défaut »** |
| Le point sur son iPhone | **« Je ne sais pas »** → on ne fait rien |
| L'élève qui répète et l'élève arrêté | **« Vas-y »** |

## 1. Les 43 boutons étirés — à corriger

Les mesures sont celles du haut de ce document (§ 3 des retenues) : `du-touche`
27 × 74 px et `du-table` 36 × 74 px au Duel de calcul, `mk-clef` 24 × 44 px au
Mot Codé, `hg-pas-btn` 26 × 44 px à « Quelle heure est-il ? », `dv-cible`
43 × 67 px aux Diviseurs.

**La contrainte à ne pas perdre de vue** : trois des quatre sont à 44 px de haut
*parce que* le plancher tactile les y met, et ce plancher est exactement la règle
qui, contournée, a produit les ovales qu'il a signalés **deux fois**. On ne
corrige donc pas en descendant sous 44 px. On corrige la **largeur**, c'est-à-dire
la mise en page qui serre dix touches sur 390 px.

## 2. Les trois boutons d'aperçu — qu'ils se taisent sur écran étroit

Ce sont eux qui rendaient ses captures d'écran minuscules, et ce document le
mesure deux fois (« Le compteur de vitesse » et « Idem c'est petit »). Sur un
écran de 390 px, le bouton « téléphone » dessine un cadre de 400 px — plus large
que l'écran qui le contient — et « tablette » un cadre de 768 px dont 189
sortent du champ. **Simuler un téléphone dans un téléphone ne montre rien.**

Sur son ordinateur, les trois gardent tout leur sens : on les masque donc sur
écran étroit, et non partout.

## 3. Quitter une partie — garder la donnée

**C'est l'état actuel, et il n'y a donc rien à écrire.** La tentative reste
enregistrée (statistiques, carnet d'erreurs, points) ; elle ne fait plus avancer
le compteur de questions depuis les dix correctifs de « fais tout ». La décision
de la garder était déjà écrite dans `core/BaseGame.js` — « c'est l'affichage
qu'on supprime, pas la donnée » — et il la confirme. La question posée en marge
du § « Et deux jeux créditaient une réussite pour avoir QUITTÉ la partie » est
donc close : *on garde la trace de la partie commencée.*

## 4. Les millièmes — cochés par défaut

Dans « Virgule ou Fraction ? », les trois rangs existent mais seuls les dixièmes
et les centièmes partaient cochés : un élève ne voyait **aucun** millième si
Rémy ne le demandait pas. Il veut les trois dès l'ouverture.

## 5. Le point sur son iPhone — « je ne sais pas »

Je lui demandais dans quel champ exactement, parce que je ne l'ai **jamais
reproduit** : ni dans la cellule du code, ni au pavé numérique d'un exercice. Le
filtre du serveur accepte le point depuis le correctif de « changer sans popup »
(`/^[A-Za-z0-9._-]{3,12}$/`).

**Il ne sait pas, donc on ne fait rien** : pas de sonde de plus, pas de
contournement préventif, pas de clavier réécrit « au cas où ». Si cela lui
arrive encore, ce sera le moment de dire où — et la mesure partira de là.

## 6. L'élève qui répète et l'élève arrêté — « vas-y »

Le seul chantier qui n'attendait qu'un feu vert. Sa forme est arrêtée depuis le
11 octobre (`docs/remarques-2026-10-11.md`) et elle ne change pas : **aucune
fenêtre, rien qui pousse.** Trois gestes :

1. **Nommer la répétition** dans la phrase de diagnostic — l'élève qui refait la
   même erreur ne lit pas trois fois la même phrase neutre.
2. **Pousser le premier indice, gratuit**, après deux échecs de suite sur la même
   compétence.
3. **Écrire le silence** — un mot à côté du nom dans Le direct, et une ligne
   discrète qui propose « Montre-moi » à l'élève.

Et un ordre, qui n'est pas négociable : **on mesure les seuils sur ses quatre
séances AVANT d'écrire une ligne.** « Deux échecs de suite » est un chiffre que
je n'ai pas obtenu ; tant qu'il n'est pas mesuré sur ses séances réelles, c'est
une supposition qui s'apprête à parler à un élève de sixième.

## Ce qui a été fait, et ce que chaque mesure a dit

### 1. Les millièmes — cochés

Deux endroits, et il fallait les deux : `js/data/numeration.js` (le réglage de
l'exercice) et `js/core/generators/fractionDecimale.js` (le défaut du
générateur, que voit un professeur qui part du générateur). **Mesuré ensuite sur
soixante tirages** : millièmes 23, dixièmes 23, centièmes 14 — ils sortent
vraiment. Et l'énoncé le plus long de la fiche fait 19 caractères (`2,066 =
…/1000`), donc les trois colonnes du papier tiennent.

En chemin, une question à laquelle il fallait répondre avant : **un générateur
JETTE SILENCIEUSEMENT une valeur de réglage qu'il ne connaît pas**
(`.filter(r => RANGS[r])`). Écrire `millièmes` avec son accent aurait donné un
exercice réglé qui ne l'est pas. Les 205 valeurs de réglage du catalogue ont été
lues : aucune n'était inventée. `tests/valeursDesReglages.test.mjs` tient la
porte pour le 226ᵉ exercice.

### 2. Les boutons d'aperçu — la moitié du travail était faite

**Les boutons étaient DÉJÀ masqués**, et depuis longtemps : ils portent
`desktop-only`, que `body.mobile-view` efface. Mesuré sur 390 × 844, professeur
identifié : **zéro bouton visible**. Et pourtant, dans le même état :

```
cadreDe(exercice)   → 'mobile'
#game-layer         → device-simulator, 400 px
écran               → 390 px, donc 5 px hors champ
```

**Un réglage qu'on ne pouvait ni voir, ni changer, ni annuler** — le bouton qui
l'aurait fait étant caché. La cause : `ui/builder.js` et `games/engine.js`
écrivaient LA MÊME RÈGLE, et seule la première avait reçu le garde-fou du
téléphone. L'autre sert le chemin que Rémy emprunte le plus souvent.

La règle vit maintenant dans `js/core/presentation.js`, où elle s'éprouve sans
navigateur. Remesuré : `cadreRendu: 'none'`, `#game-layer` 390 px, 0 px dehors.
**Et sur un écran de 1280, le cadre de 400 px s'applique toujours** — on n'a pas
retiré à Rémy le seul moyen de voir la présentation du téléphone depuis son
ordinateur.

### 3. Les boutons étirés — et l'outil se trompait de cause

`tools/boutonsEtires.mjs` disait « 53 étirés » sans dire **par quoi**, et la
distinction décide de la correction :

| hauteur | cause | ce qu'on fait |
| --- | --- | --- |
| **≈ 44 px** | le plancher tactile | on élargit, ou le jeu déclare `btn-carre` |
| **> 44 px** | le jeu lui-même | on relit sa feuille AVANT d'y toucher |

32 d'un côté, 21 de l'autre. J'ai commencé à élargir une cible du jeu des
Diviseurs (43 × 67) avant de voir que le plancher n'y était pour **rien** : sa
hauteur vient de ses deux lignes empilées. Elle n'a pas été touchée.

| jeu | avant | après | ce qui a été fait |
| --- | --- | --- | --- |
| **Duel de calcul** | 27,3 × 74 | **31,1 × 58** | l'espace entre touches mangeait 59 px des 370 |
| **Les Anagrammes** | jeton 29 × 44, case 29 × 33 | **les deux à 29 × 33,4** | `btn-carre` : le jeton coïncide avec sa case |
| **Quelle heure est-il ?** | 26 × 44 | **44 × 44** | la feuille demandait un carré de 26, le plancher en donnait 44 |
| **Le Mot Codé** | 24 × 44 | **36 × 49** | la cible double de surface |
| Les Diviseurs | 43 × 67 | inchangé | sa hauteur est son dessin, pas le plancher |

**Aucune correction ne descend sous 44 px** : c'est la règle qui, contournée,
avait produit les ovales signalés deux fois.

Trois choses que les mesures ont dites et que je n'avais pas vues :

- le commentaire du Duel annonçait une cible de **33 × 58** et la mesure en
  donnait 27 × 74 : **la forme avait dérivé de sa propre décision**, et la
  corriger a REJOINT ce qui était écrit plutôt que de le contredire. Le couloir
  de la balle passe de 394,8 à **426,8 px** — ce que Rémy demandait deux fois ;
- aux Anagrammes, le jeton et sa case se dessinent sur la même variable, et le
  plancher n'en cassait **qu'une des deux moitiés** : un jeton plus haut de onze
  pixels que la case où il doit tomber ;
- au Mot Codé, **le rapport de forme ne se corrige pas** : 1,37 à 34 px comme à
  36 px, parce que le numéro sous la lettre est proportionnel à elle. Aucune
  largeur ne rendra cette clef carrée. Le gain réel est la cible, pas le
  rapport — et mon premier commentaire citait un 1,29 que je n'avais pas obtenu.

### 4. L'élève arrêté — la mesure d'abord, et elle est livrée

Rien n'est encore écrit du côté de l'élève, **et c'est l'ordre convenu** : « on
mesure les seuils sur ses quatre séances AVANT d'écrire une ligne ».

L'outil existe, et il est là où Rémy peut l'ouvrir : **Administration → « Les
blocages, en comptes »**. Il clique « Copier », il colle. Il compte, sur SES
séances :

1. le même diagnostic sur des questions qui se suivent (faut-il nommer la
   répétition ?) ;
2. les échecs qui se suivent sur la même compétence — **le seuil de l'indice
   poussé**, deux ou trois ;
3. les indices aujourd'hui demandés, par élève ;
4. **le temps par question, exercice par exercice** : médiane, neuvième décile,
   et leur rapport. On ne cherche pas une durée mais un ÉCART — si le neuvième
   décile vaut déjà quatre fois la médiane, « quatre fois la médiane » ne
   désigne pas un élève arrêté, il désigne un élève sur dix ;
5. les diagnostics les plus vus.

**Aucun nom n'en sort** — ni prénom, ni identifiant d'élève, ni réponse donnée,
ni énoncé. Les élèves sont comptés, jamais nommés, et c'est la vérification la
plus importante du lot : `php tools/testApi.php` met de faux identifiants
reconnaissables dans la fonction de comptage et exige qu'ils ne ressortent pas.
Les seuls noms lisibles sont ceux des exercices et des compétences, qui sont
dans le logiciel de tout le monde.

Treize vérifications nouvelles gardent le comptage, dont trois qui n'étaient pas
évidentes : trois tentatives sur la même question font **une** question ; une
étape (`partiel`) n'en est pas une — recompter ici le défaut du 13 octobre
fausserait la décision elle-même ; et **deux élèves ne forment pas une suite**,
sans quoi deux élèves faisant chacun l'erreur une fois seraient comptés comme un
élève la faisant deux fois de suite, c'est-à-dire exactement le cas qu'on
cherche.

### 5. Le point sur son iPhone

Rien. Il a répondu « je ne sais pas », et c'était la consigne.
