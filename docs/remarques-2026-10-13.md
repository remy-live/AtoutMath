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
