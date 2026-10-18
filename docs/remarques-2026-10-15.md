# Les deux méthodes de soustraction, vues par Rémy — 15 octobre 2026

Deux remarques, arrivées coup sur coup pendant qu'il essayait la fenêtre
« ⇄ Méthode » posée la veille.

## 1. « présente le en colonne, pas en ligne »

> « pour les méthodes, présente le en colonne, pas en ligne, c'est
> incompréhensible »

Les deux cartes de la fenêtre étaient DÉJÀ l'une sous l'autre : ce n'est pas des
cartes qu'il parle, c'est de **l'exemple** écrit dedans. Il était en prose :

> `13 − 7 = 6, puis le 1 de 17 devient 2 : 5 − 2 = 3`

C'est-à-dire la seule forme sous laquelle on n'écrit JAMAIS une soustraction
posée. Un élève qui ouvre cette fenêtre y cherche son cahier ; il y trouvait une
phrase à déchiffrer, où le `1` de `13` et le `1` de `17` sont deux choses
différentes sans que rien ne le dise.

**Ce qui a été fait.** Chaque carte porte maintenant 53 − 17 **posée**, avec ses
marques à leur place. La figure n'est pas dessinée à la main : `figureMethode()`
appelle `poser('-', [53, 17], { methode })`, lit les colonnes que le noyau rend
et les habille des classes de la **vraie** grille (`po-case`, `po-marque--devant`,
`po-case--barree`). La fenêtre ne peut donc pas montrer autre chose que ce que
l'élève va construire — une figure écrite à part aurait menti dès le premier
réglage changé, et personne ne l'aurait su.

### Et, en la photographiant, un défaut de la grille elle-même

Sur la photo, le petit 1 de la dizaine empruntée se lisait comme un indice du
chiffre de **gauche**. Mesuré sur une opération à quatre colonnes, 7106 − 4709 :

> `9 ₁2 ₁0 ₁3` se lisait `9₁ 2₁ 0₁ 3`

À `left: -9px`, la marque était à cheval sur la frontière, et son fond opaque
creusait une encoche blanche dans la case d'à côté — ce qui achevait de l'y
rattacher. Elle est rentrée dans sa propre colonne (`left: -2px`, l'écart entre
deux cases étant de 2 px) et légèrement relevée, comme au crayon. Une épreuve
garde la valeur.

## 2. « le cassage casse tous les nombres du haut »

> « et si on fait 1000 - 3 par exemple, le cassage, casse tous les nombres du
> haut »

**C'est juste, et le logiciel a raison.** Mesuré, noyau en main : `1000 − 3` par
cassage écrit quatre marques, une par colonne — `1` devant le 0 des unités, `9`
sur le 0 des dizaines, `9` sur le 0 des centaines, `0` sur le 1 des mille. C'est
exactement ce que la méthode fait au crayon ; le zéro qui devient neuf est même
le cas que tout élève rencontre un jour.

Mais la remarque a mis au jour **deux vrais défauts**.

### a) 1000 − 3 ne pouvait pas sortir

Mesuré par le chemin du jeu, sur 400 tirages d'entiers à quatre chiffres :
**0 opération** dont les deux nombres n'avaient pas la même longueur. Les deux
étaient tirés dans le même intervalle.

Or l'en-tête du fichier annonce l'erreur que l'exercice existe pour corriger :
« il cale 12,4 sous 324,5 en collant à droite ». **Entre deux nombres de même
forme, aligner revient à coller à droite** : le geste faux donnait la bonne
réponse, et l'exercice ne mesurait plus rien. (Les décimaux y échappaient par
accident — 3,70 s'écrit 3,7 et 16,0 s'écrit 16 : 84 tirages sur 400.)

Le second nombre est maintenant plus court une fois sur deux, de un à trois
chiffres. Remesuré : **206 sur 400**, dont **63** avec un nombre à un seul
chiffre — `9600 − 6`, `2530 − 8`. Poser le 8 redevient une décision.

### b) Le zéro de tête du résultat se réclamait

`1004 − 626 = 378`, posé sur quatre colonnes : le logiciel demandait encore le
chiffre des milliers, c'est-à-dire **0**, et l'élève devait écrire `0378`. Aucun
cahier n'écrit cela. On s'arrête désormais à la dernière colonne que le résultat
occupe vraiment (`dernierRangDemande`, dans le noyau) — mesuré après : la
dernière case reste vide, l'opération se compte comme finie.

Jamais sous les unités, en revanche : `7,2 − 6,7 = 0,5` s'écrit **avec** son
zéro.

### c) Et l'aide disait l'autre méthode

En passant : le bouton « 💡 Aide » servait la compensation à tout le monde. Un
élève qui casse lisait « on ajoute un au chiffre du BAS » — l'autre méthode, sur
une grille qui ne lui offrait même pas l'endroit où l'écrire. L'aide et le robot
de démonstration suivent maintenant la méthode choisie.

---

# Deuxième passe, le même jour

> « le changement de méthode fait recommencer l'exercice, au départ par cassage
> quand on clique sur le 1, ca casse automatiquement le suivant au début »

## 3. Changer de méthode ne doit pas changer d'opération

C'était vrai, et c'était ma faute : le clic sur une carte appelait `poser()`,
qui **tire une opération neuve**. Un élève qui ouvre la fenêtre *pour
comprendre* perdait donc le calcul en cours — et ne voyait jamais SA
soustraction dans l'autre méthode, ce qui est tout l'intérêt du bouton.

`changerMethode()` recalcule les colonnes avec les **mêmes nombres**.
L'alignement déjà fait et les chiffres déjà écrits sous le trait restent en
place ; seules les marques partent, parce qu'un « +1 » en bas ne veut rien dire
dans le cassage. Mesuré : `152 − 53`, un 9 déjà écrit — après le changement,
même opération, même 9.

## 4. « ça casse automatiquement le suivant au début »

Mesuré avant de corriger, sur `224 − 157` par cassage, **avant le moindre
clic** : les deux colonnes qui seront réécrites portaient déjà leur marque en
pointillé, à la place du chiffre barré.

> L'écran annonçait donc QUELLES colonnes empruntent — c'est-à-dire la question
> même que la méthode pose à l'élève.

Une marque ne se montre plus que sur la colonne où il travaille ; celles qu'il a
déjà écrites restent. (L'addition garde ses ronds partout : ils sont sur
*chaque* colonne, retenue ou pas, et n'apprennent donc rien à personne.)

Et le geste est devenu **un seul clic dans les deux méthodes**, comme il
l'avait décrit dès le premier jour — « la retenue indique 1 en haut et le
chiffre d'après est décrémenté de 1 ». La compensation écrivait déjà le `+1` du
bas ; le cassage barre maintenant le chiffre suivant et écrit celui qui reste.

**Mais seulement le premier pas.** Sur `815 − 269`, le 1 des dizaines *finit* à
10 — il a prêté une dizaine et emprunté une centaine. L'écrire au moment où l'on
casse les unités, ce serait faire d'avance un emprunt que l'élève n'a pas
décidé. On pose donc `h − 1` (le 2 de 821 devient 1), et c'est un second clic,
arrivé sur la colonne, qui le fera passer à `h + 9`.

---

# Deux bogues du tiroir des parcours — même jour

> « un petit bug, quand je suis sur un parcours, je mets envoyé pour l'adresser
> à mes classes si je charge un nouveau parcours et bien les classes à qui
> j'envoie le nouveau parcours ne sont pas actualisées »

> « le double clic pour renommer un dossier ne fonctionne pas »

(à mesurer avant de corriger — le journal de ce qui a été trouvé suit)

> « quand je mets une nonvelle séance en cours, pour le direct, ce sont les
> progressions de la séance d'avant qui apparaissent, toutes les élèves
> devraient être à 0. »

> « Pour le défi de la classe, on ne voit pas le temps (il est tronqué), ce
> serait cool d'avoir un apercu du jeu pour ne pas se tromper. »

## 5. Le panneau des classes restait accroché au parcours précédent

**Mesuré par le chemin du professeur** : parcours B donné à la 6e B, puis
parcours A chargé dans le tiroir, panneau resté ouvert — il affichait encore
« Donné à 1 classe — 6 élèves », case cochée, **pour un parcours que personne
n'avait reçu**. Cocher là-dedans aurait donné B, pas A.

C'est le prix du panneau, et il fallait le payer : une boîte de dialogue se
referme quand on fait autre chose, un panneau reste — c'est tout son intérêt.
Il se rouvre maintenant sur le parcours qu'on vient de charger (et se ferme si
celui-ci est vide). Remesuré : « Pas encore donné », zéro case cochée.

## 6. Le double-clic pour renommer un dossier

**Mesuré** : après un double-clic, `contentEditable` valait `inherit`, le nom
n'avait pas le foyer, et le dossier s'était replié **puis** déplié.

La cause tient en une ligne : un double-clic commence par deux clics simples.
Chacun repliait le dossier et appelait `renderPathBrowser()`, qui refait la
liste entière — le `dblclick` arrivait donc sur un nœud détruit entre-temps. Le
geste ne pouvait pas marcher, jamais.

On ne diffère le pli **que sur le nom** (un quart de seconde, le temps de voir
si un second clic arrive) ; partout ailleurs sur la tête du dossier il reste
immédiat. Remesuré : `contentEditable: true`, le foyer, « Sixièmes » conservé
après un redessin complet, et le clic simple replie toujours.

## 7. Le direct montrait la séance d'hier

Voir le commit : `derniereActivite` prenait le run **le plus récent** sans
regarder à quel travail il appartient. L'élève qui n'avait pas encore ouvert la
séance du jour montrait son devoir d'hier, barre pleine. On compare désormais
l'identité de contenu du parcours — la même que le bilan de séance — portée par
`assignments.path_identity`.

## 8. La barre de pilotage, repliée

**Mesuré à la sonde** : six rangées de cadres, une vingtaine de contrôles
dépliés en permanence au-dessus de la liste des élèves. Après : **134 px**, deux
lignes — la pause et le mot à la classe restent sous la main, les six autres
outils sont des pastilles qu'on déplie une par une. Une pastille repliée **dit
ce qu'elle fait** : le compte à rebours montre son temps dessus, le bac ouvert,
la calculatrice accordée, la classe fermée hors séance.

Et le temps du défi se lit en entier (« 1 min » et non « 1 mi » : la largeur
fixe du champ des minutes du chrono avait été posée sur un déroulant), avec un
bouton **👁 Aperçu** qui pose trois vraies questions du défi, dans le mode
choisi, en marquant la bonne réponse — et qui prévient quand l'exercice ne peut
pas se jouer en QCM.

## 9. « tjs un bug pour la séance en cours il me montre l'ancienne »

Deuxième passe, capture à l'appui. Le filtre posé le matin marchait — les barres
disaient bien « Pas commencé » — mais **la colonne d'à côté montrait encore
l'exercice et le score d'hier** : « Nova · 2 / 6 » pour un élève vu « hier ».

J'avais laissé cette moitié **exprès**, en me disant que l'exercice en cours est
ce que l'élève fait vraiment, séance ou pas. C'était une erreur de lecture :
devant trente lignes, l'œil lit la ligne entière comme un seul état, et deux
séances mêlées sur une ligne mentent. L'exercice, le score et l'heure de la
dernière réponse sont maintenant ceux de la séance en cours, eux aussi.

### Et un second défaut trouvé en le corrigeant

**« + un exercice » change l'empreinte du parcours.** L'identité est calculée
sur le CONTENU ; celle rangée dans `assignments` est figée exprès (le bilan doit
continuer de compter le même travail). L'élève qui ouvre la séance **après**
l'ajout en calcule donc une autre, et serait passé pour n'ayant rien commencé —
alors qu'il travaille sous les yeux du professeur.

Le **nom** de la séance sert donc de seconde clef : il ne bouge pas quand on
complète. Deux séances homonymes se confondraient ; c'est le seul faux positif,
et il rend alors le comportement d'avant.

---

# Troisième passe — l'écran de la classe (15 octobre, soir)

> « pour une séance nouvelle, il faut réinitialister les exercices que j'ai
> autorisé à passer et aussi mieux aligner verticalmeent les input et puis mets
> des onglets c'est pas terrible et un onglet aussi avec la liste de classe.
> J'ai du mal à voir la différence avec les murs et le direct.
> Et aussi la séance en cours, mets le fond d'une autre couleur.
> Et pour les bilans, propose des onglets, fais le au parcours, de manière
> globale, une conseil pour chaque élève. »

Six demandes :

1. une séance neuve **réinitialise** les sauts autorisés et les dispenses ;
2. **aligner verticalement** les champs des outils de l'heure ;
3. des **onglets** plutôt que les pastilles dépliantes, plus un onglet **liste
   de classe** ;
4. la différence entre **Le mur** et **Le direct** ne se voit pas ;
5. la séance **en cours** doit avoir un fond d'une autre couleur ;
6. **Les bilans** : des onglets — au parcours, global, et un conseil par élève.

## Ce qui a été fait

**1. Une séance neuve réinitialise les permissions.** Mesuré sur sa capture :
trois vignettes se suivaient — deux calculatrices « pour toute la séance »
accordées un autre jour, et un saut déjà mort. La règle « cela s'éteint avec la
séance » n'était posée **que sur le saut**, et la liste du professeur montrait
**tout**, vivant ou mort. Les trois gestes passent maintenant par la même porte
(`reglageEnVigueur`), et l'écran du professeur y passe aussi. « Retirer » reste
hors de la règle, et c'est voulu : c'est le geste de celui qui a constaté que
l'exercice plante.

**2. Les champs alignés, un seul outil à la fois.** Les titres étaient écrits
deux fois (sur la pastille et dans le cadre) ; le cadre intérieur a perdu son
second bord et sa marge, et les champs de tous les outils commencent désormais
au même pixel — mesuré : 52 px pour le défi comme pour le chrono. Et ouvrir un
outil referme les autres, sur tous les navigateurs (l'attribut `name` des
`details` ne vaut que depuis Chrome 120).

**3. La liste de classe sous la main.** Une septième pastille, « 👥 La liste » :
le code de la classe, puis chaque élève avec son identifiant, son code et un
point vert s'il est en ligne. Ce qu'on y cherche en plein cours n'est pas la
liste pour elle-même — elle a son écran — mais **le code d'un élève qui n'arrive
pas à entrer**, sans perdre les vingt-neuf autres de vue.

**4. La différence entre Le mur et Le direct, écrite sous l'onglet.** Ce sont
deux **postures** : « Assis : une ligne par élève, et les commandes de l'heure
sous la main » contre « Debout : les mêmes élèves en tuiles de couleur, lisibles
du fond de la salle. On regarde, on ne règle rien. » Les cinq onglets ont leur
phrase.

**5. La séance en cours sur fond coloré.** Mesuré sur les pixels : elle peint
vraiment (un `color-mix` dont un jeton n'existe pas ne peint rien, en silence —
ce dépôt a payé cette leçon trois fois).

**6. Les bilans en trois onglets.** « D'ensemble » (ce qu'il y avait), « Par
séance » — le tableau croisé élèves × exercices, qui existait mais vivait
replié en bas d'une page de deux écrans — et **« Conseils »** : une phrase par
élève, rangée par urgence, qui nomme la notion et jamais l'élève. La phrase et
son rang viennent du noyau (`conseilDuRapport`), parce que deux échelles
divergent : la première fois, « 4 questions seulement » s'affichait en vert.

---

# Quatrième passe — le conseil, les onglets, et le mur

> « voilà le conseil... il faut plutôt préciser en quoi ca doit être
> retravaillé. Et dans le direct, je voulais des onglets aussi et la liste fait
> parti d'un onglet, là ce sont des boutons qui ouvrent ou ferment pas terrible
> ca fait un peu désorganié. Et j'ai l'impression le direct et le mur font la
> même chose mais présenté différement »

## 1. Le conseil nommait un nombre, pas une notion

Sa capture : sept élèves d'affilée portaient « 67 erreurs jamais reprises : les
revoir avec lui ou elle ». Sept fois la même phrase, qui ne nomme rien et ne se
recopie nulle part.

**La cause est dans l'ordre des cas.** Le compte d'erreurs ouvertes passait
AVANT les notions fragiles : dès qu'un élève avait une erreur en souffrance —
c'est-à-dire tout le monde —, on n'allait jamais jusqu'à la notion. Le compte
est maintenant un **détail entre parenthèses**, derrière le nom de la notion :

> Doit réviser : Additionner des entiers (67 erreurs à reprendre).

Et quand aucune compétence n'est fragile, **on nomme les notions des erreurs
elles-mêmes** — le serveur les envoie désormais avec le compte :

> À reprendre : Soustraire des entiers et Sens de la multiplication (52 erreurs).

## 2. De vrais onglets, et non des boutons qui ouvrent

Les pastilles dépliantes avaient un défaut que je n'avais pas vu : **celle qu'on
ouvrait prenait toute la largeur et poussait les six autres sur la ligne
suivante**. La rangée changeait de forme à chaque clic, et l'on cherchait des
yeux l'outil qu'on venait d'ouvrir.

Mesuré après : la rangée d'onglets reste au **même pixel** (437, hauteur 53)
qu'on ouvre le défi, le chrono ou rien du tout ; les champs de chaque panneau
commencent au même endroit (52 px) ; la barre fait 123 px au repos.

## 3. Le mur n'est plus un écran

> « j'ai l'impression le direct et le mur font la même chose mais présenté
> différement »

Il a raison, et ma réponse précédente — une phrase sous chaque onglet — revenait
à **expliquer** une distinction plutôt qu'à la supprimer. C'est la même classe,
la même seconde, les mêmes données : seule la forme change.

« Le mur » a donc quitté la rangée d'onglets. Le direct porte un interrupteur
**≡ en lignes · ▦ en tuiles**, au bout de la rangée « Ranger ». Les tuiles
gardent leur tri par urgence — c'est le seul affichage qu'on lit debout, de
loin, et l'ordre y est l'information.

---

# Cinquième passe — « la partie classe est fouillis »

> « Je trouve que la partie classe avec direct séance et autre est fouillis
> qu en penses tu » — puis, après mon diagnostic : « oui fais les 3 ».

**Ce que la mesure a dit**, les quatre onglets ouverts et comptés :

| écran | hauteur | boutons visibles | champs |
| --- | --- | --- | --- |
| Le direct | 725 px | 27 (pour **6** élèves) | 7 |
| Les séances | 217 px | 0 (site d'essai vide) | 0 |
| Les élèves | 596 px | **40** (pour 6 élèves) | 0 |
| Les bilans | 686 px | 6 | 0 |

Rapporté à sa classe de trente : **190 boutons** sur « Les élèves », 75 sur « Le
direct ». Et avant le premier élève du direct, **quatre bandeaux empilés** qui
disent la même chose sous trois formes.

Trois corrections, qu'il a validées d'un mot :

**A.** L'en-tête du direct : quatre étages → **une ligne**. La jauge et les
trois pastilles n'apparaissent que s'il y a une séance en cours.

**B.** « Les élèves » : six boutons par ligne → **un seul**, qui déplie la fiche
de l'élève sous sa ligne — le geste que le direct emploie déjà. Et les sept
boutons du haut rangés en trois familles nommées : la liste, les codes, la salle.

**C.** Les onglets rangés par **moment** — pendant l'heure, avant, après — et
« Les élèves » détaché à droite, puisqu'on y va trois fois par an.

## Ce qui a été fait, et ce que la mesure dit

| | avant | après |
| --- | --- | --- |
| bandeaux dans l'en-tête du direct | 3 | **1** |
| pixels avant le premier élève | 333 | **225** |
| jauge de classe quand personne ne travaille | affichée, vide | **cachée** |
| boutons dans « Les élèves » (6 élèves) | 40 | **15** |
| boutons par ligne d'élève | 6 | **1** |
| familles nommées en haut | 0 | **3** (la liste, les codes, la salle) |

Les onglets disent maintenant leur moment — **PENDANT L'HEURE**, **AVANT
L'HEURE**, **APRÈS** — et « Les élèves », qu'on ouvre trois fois par an, part à
droite en plus petit.

Une épreuve ancienne a dû être rebraquée (« L'ONGLET QUI CONTIENT DES ÉLÈVES
S'APPELLE LES ÉLÈVES ») : elle épinglait l'appel à `onglet('liste', …)` à deux
arguments. Le nom qu'elle garde n'a pas changé ; sa forme, si.

# Sixième passe — « temps écoulé » en travers d'une séance neuve

> « petit bug. Les élèves on tfait une nouvelle séance. Certains étaient déjà
> connecté et mlagré la nouvelle séance c'était donné temps écoulé »

**« Temps écoulé · On s'arrête là » ne vient pas de la séance, il vient du
compte à rebours** (`js/ui/leMoment.js`). Et le compte à rebours est une donnée
de **classe** : `classes.chrono_fin`. Rien ne l'effaçait quand il tombait à
zéro — et c'était **délibéré**, pour une raison déjà écrite dans
`tempsRestant` (`js/core/seanceDistante.js`) :

> « Trente élèves interrogent la classe toutes les dix secondes : le premier à
> constater zéro effacerait le chrono des vingt-neuf autres, qui le
> regardaient. »

La règle posée à l'époque — **« on ne l'annonce qu'à ceux qui l'ont vu
courir »** — répondait à la plainte précédente de Rémy (le second groupe qui se
connecte et trouve « temps écoulé »). Mais cette mémoire-là vit dans l'onglet :
elle protège celui qui **arrive après**, et pas du tout celui qui **ne s'est
jamais déconnecté**. C'est exactement le cas que Rémy décrit : « certains
étaient déjà connectés ». Pour eux, la séance neuve s'ouvrait sous un bandeau
rouge qui disait de s'arrêter — et `terminerLeTravail()` clôturait le parcours
qu'ils venaient d'ouvrir.

## Pourquoi pas un délai de grâce

La tentation était d'effacer le chrono passé un quart d'heure. Le commentaire
d'origine dit déjà pourquoi c'est faux : « ce n'est pas une question de DURÉE,
c'est une question de QUI ». Entre deux groupes il y a cinq minutes
d'interclasse, moins que n'importe quel délai qu'on oserait écrire.

**C'est devenu une question de QUELLE SÉANCE** — la même règle que pour les
permissions (`reglageEnVigueur`, cinquième passe) : ce qui a été réglé pour
l'heure d'avant ne vaut plus pour celle-ci. Changer la séance imposée éteint le
compte à rebours de la précédente, **une seule fois, pour toute la classe à la
fois**, à l'endroit où le professeur agit — et non trente fois, depuis trente
ardoises qui se marcheraient dessus.

## Ce que la correction a failli casser

La case **« plein écran »** repasse par la même action `imposer`, **avec la même
séance** (`js/ui/espaceClasses.js`, branche `d.ecranSeance`). Effacer le chrono
à chaque appel l'aurait fait disparaître parce qu'on a coché une case au milieu
de l'heure. On n'éteint donc que si la séance **change vraiment**, et une
vérification garde ce point (« COCHER LE PLEIN ÉCRAN NE L'EFFACE PAS »).

## Vu échouer avant d'être cru

`php tools/testApi.php`, avant la correction :

```
✗ MAIS UNE SÉANCE NEUVE L'EFFACE — {"finAt":1792131666,"aZero":"terminer"}
✗ ET RETIRER LA SÉANCE L'EFFACE AUSSI — {"finAt":1792132566,"aZero":"terminer"}
```

Les deux autres vérifications du même bloc — celle qui exige qu'un chrono
écoulé **continue** d'être envoyé tant que c'est la même heure, et celle du
plein écran — étaient vertes avant comme après : ce sont elles qui empêchent la
correction d'être trop large. Après : **506 vérifications, tout passe.**

# Septième passe — « à l'ordi le parcours ne prend pas tout l'écran »

> « et aussi pourquoi à 'lordi le parcours ne prend pas tout l'écran et juste
> une fenêtre, tu pourrais améliorer un peu le design du parcours ? »

Deux demandes : **pourquoi** (une question), et **le design du parcours** (un
travail). La première se mesure avant de répondre quoi que ce soit.

# Huitième passe — « l'explication pour les pizzas des fractions est une horreur »

> « l'explication pour les pizzas des fractions est une horreur »

À mesurer avant de toucher : quelle explication, à quel moment de l'exercice,
et qu'est-ce qu'un élève de sixième en lit.

# Neuvième passe — la question « combien d'égalités donne le codage »

> « retire aussi dans l'exercice que donne le codage, la question, comment
> d'égalités donne le codage, car ce n'est pas clair et je pense que c'est
> faux »

Deux reproches dans la même phrase, et le second est le plus grave : **une
question qui compte faux apprend du faux**. On vérifie donc le compte avant de
retirer quoi que ce soit — si elle est fausse, elle l'est peut-être ailleurs.

# Dixième passe — « le carnet d'erreur code la figure ne veut rien dire »

> « le carnet d'erreur code la figure ne veut rien dire »

L'exercice « Code la figure » rend une GRILLE de marques, pas un nombre ni un
mot. Ce que le carnet d'erreurs en écrit est donc à regarder avant tout
raisonnement.

## Ce qui a été fait, pour les cinq remarques de la journée

**6. Le compte à rebours.** `imposer` éteint le compte à rebours quand la
séance CHANGE — et seulement alors, parce que la case « plein écran » repasse
par la même action avec la même séance. Deux vérifications d'API vues rouges
avant la correction ; une sonde qui suit l'élève de bout en bout, et qui a
trouvé en chemin que mes deux séances d'essai, de contenu identique, étaient
pour le logiciel la MÊME séance.

**7. « À l'ordi, juste une fenêtre ».** Le réglage d'aperçu valait « mobile »
au démarrage : le parcours s'ouvrait dans un cadre de **400 px** au milieu d'un
écran de 1440. Le cadre reste — il sert à voir la présentation du téléphone —
mais il se demande maintenant. Le bouton allumé et le réglage sont tenus
ensemble par une épreuve : deux vérités qui se contredisent seraient pires
qu'une seule fausse.

**8. L'explication des pizzas.** Mesurée : 90 mots d'un bloc, ouverts sur une
négation à propos de l'addition — que cet exercice ne demande pas —, « PPCM »
crié en pastille (hors programme de sixième), « 2/3 = (2×4)/(3×4) = 8/12 » sur
une ligne, et la pizza citée en DERNIER. Réécrite en trois temps nommés — le
découpage, le compte, la règle —, 406 px dans une zone de 406 : elle ne défile
plus. La bulle de correction du jeu disait « 2 × 4 = 8 » sans dire d'où venait
le 4 ; elle écrit maintenant la division d'abord, comme le robot avait déjà
appris à le faire.

**9. « Combien d'égalités ».** Retirée. Le compte était celui des PAIRES —
trois segments de même marque en donnaient trois —, alors que le codage
n'apporte que DEUX informations : la troisième se déduit. L'élève qui répondait
2 avait la meilleure des deux idées et était compté faux.

**10. Le carnet d'erreurs du codage.** Il écrivait la forme CANONIQUE :
« ta réponse : 11223300/ABD, attendu : 11223344/ABCD ». Elle reste pour juger ;
une seconde forme, lisible, part au journal — « [AB] = [CD] ; [BC] = [DA] ;
sans marque : [BO], [OD] — angles droits en A, B ». Dans l'organigramme des
quadrilatères, « attendu » répondait en plus à une autre question : il citait
les PROPRIÉTÉS de la figure, pas son codage.

# Onzième passe — « tu n'as pas participé à ce défi », dit à ceux qui ont joué

> « pour le défi, on l'a fait avec les élèves une fois fini, on a eu le
> classement des 3 premiers mais les autres c'était noté, tu n'a pas participé
> à ce défi »

En classe, en vrai, avec ses élèves. Le podium s'affichait ; tous ceux qui
n'étaient pas dessus lisaient qu'ils n'avaient pas joué — alors qu'ils
venaient de jouer.

# Douzième passe — modifier un parcours EN SÉANCE remet les élèves à zéro

> « j'ai modifié un parcours pendant une séance avec mes élèves et ils
> travaillaient sur le parcours en modifiant le parcours (juste une option),
> ça a remis à zéro tous les élèves »

**C'est la plus grave de la journée** : du travail d'élève perdu, en classe,
pendant l'heure. Et c'est la même mécanique que celle qui m'a piégé ce matin
en écrivant la sonde du compte à rebours — `identiteDeParcours` est une
empreinte du CONTENU. Changer une option change le contenu, donc l'empreinte,
donc — pour le logiciel — la séance.

# Treizième passe — un cran plus lent pour les exercices chronométrés

> « il faudrait aussi pour les exercices a chrono rajouter encore un option qui
> est plus lente que le plus bas »

Le réglage le plus lent n'est pas assez lent pour une partie de ses élèves. On
regarde d'abord où vit ce réglage, et combien d'exercices le portent.

# Quatorzième passe — « je n'ai pas réussi à mettre toute la classe en pause »

> « je n'ai pas réussi à mettre toute la classe en pause »

Le geste existe — `mettreEnPause` / `action: 'lock'` — et `boutEnBout` le garde.
Ce n'est donc probablement pas qu'il ne marche pas : c'est qu'il ne se trouve
pas. On le cherche comme lui, depuis l'écran de la classe.

## Ce qui a été fait, pour les quatre dernières

**11. Le défi.** Le tableau est une PHOTO prise par le serveur à l'instant où
l'ardoise interroge, et il ne s'affichait qu'une fois. Le score, lui, part dans
une requête séparée à la seconde où le défi tombe : qui recevait sa photo
avant que son score ne soit rangé lisait, définitivement, qu'il n'avait pas
joué. MESURÉ, trois élèves dans trois navigateurs : les trois scores en base,
et l'un des trois démenti dix-huit secondes après la fin. Trois corrections :
on redemande l'état dès que le score est parti ; on n'affiche pas une photo qui
nous oublie quand on sait avoir joué ; et le tableau ouvert suit les scores qui
arrivent, au lieu de figer un podium d'un prénom.

**12. Le parcours modifié en séance.** L'identité d'un parcours est une
empreinte de son CONTENU : une option changée la change. `fautIlOuvrir` ne
reconnaissait donc plus le parcours chargé, rouvrait la séance, émettait un
nouveau `PATH_ASSIGNED` — et les étapes faites, qui se recomptent en filtrant le
journal sur cette identité, disparaissaient toutes. On compare désormais
l'identifiant STABLE de la séance (`paths.id`), qui ne bouge pas quand on
retouche le contenu. L'élève qui a déjà ouvert garde sa version ; celui qui
ouvre après reçoit la nouvelle.

**13. Un cran plus lent.** « Au ralenti », ×2,5 — l'écart avec « Tranquille »
est du même ordre que celui entre « Tranquille » et « Normale ». Posé dans la
table commune ET dans les trois listes écrites à part, qui sont le vrai piège :
une option absente de leur menu est inatteignable là où il la demande. Pour le
duel, les trois nombres bougent ensemble — départ, plancher et pente —, parce
qu'« un départ lent suivi d'une accélération brutale redonne exactement le même
sentiment ».

**14. La pause de classe.** Elle n'existait pas : le voile ne pouvait être
déclenché que par un compte à rebours arrivé à zéro, et le bouton qui disait
« Mettre en pause » fermait le CATALOGUE — ce qui ne se voit pas chez l'élève
qui travaille. Chacun reprend son nom, et la pause est un geste à part entière.
MESURÉ de bout en bout : l'élève travaillait sur « 3 + 6 = ? », son écran s'est
couvert du mot du professeur, sa question est restée dessous, et il l'a
retrouvée à l'identique quand Rémy a rendu la main.

# Quinzième passe — dispenser d'un exercice qui bugge

> « il faut que des exercices dispensé sur un parcours soient dispensé dans un
> autre parcours. Parfois un exercice bugge et je ne peux pas le retrire dans
> dispenser toute la classe d'un exercice car il n'apparait pas dans la liste
> déroulante »

**Deux choses, et la seconde corrige un arbitrage que j'avais pris sans lui.**

La liste déroulante ne propose que les exercices de la séance EN COURS : un
exercice qui bugge ailleurs est donc hors d'atteinte. Et le retrait, lui,
expire avec la séance — c'est moi qui l'avais étendu aux trois réglages le
15 octobre, en lisant « pour une séance nouvelle, il faut réinitialiser les
exercices que j'ai autorisé à passer ». Il parlait du SAUT. Un exercice retiré
parce qu'il bugge n'est pas un geste de l'heure : il bugge aussi la semaine
prochaine.

# Seizième passe — « placer un point » bloque après une erreur

> « pour l'exercice placer un point. Si l'élève se trompe, on ne peut plus
> cliquer, en fait l'exercice bloque »

**Un blocage en classe, donc prioritaire.** C'est la deuxième fois que ce genre
de panne apparaît — « dans ce genre d'exercice on peut se retrouver bloqué »,
sur le codage. Là-bas, la cause était un retour anticipé qui n'appelait pas
`submit`, et tous les filets pendent à `submit`.

# Dix-septième passe — la mosaïque : centre de rotation, et sens direct

> « sur la mosaique des transformations quand tu fais une rotation fais le sur
> un point qui colle la figure sinon c'est hyper dur et aussi je pense que tu
> fais une erreur sur le sens direct et indirect »

**Deux choses, et la seconde est une faute de mathématiques** si elle est
avérée : le sens DIRECT est le sens inverse des aiguilles d'une montre. On la
vérifie par le calcul avant de toucher à quoi que ce soit — et on la vérifie
dans le sens qui compte : ce que l'élève VOIT à l'écran.

# Dix-huitième passe — « pas commencé » pour celui qui a FINI

> « j'ai l'impression que quand un élève a fini et qu'il joue à autre chose cela
> marque pas commencé sur le direct »

**C'est le revers de la correction du 15 octobre** — « tjs un bug pour la séance
en cours il me montre l'ancienne ». On a scopé le direct sur la séance en
cours ; l'élève qui a FINI et qui joue à autre chose a son dernier travail
ailleurs, et la barre retombe donc à « Pas commencé ». Un élève qui a tout fait
est le dernier qu'on doit afficher comme n'ayant rien fait.

## Ce qui a été fait, pour les quatre dernières

**15. Dispenser d'un exercice qui bugge.** La règle qu'il demandait existait
déjà — « retirer » n'a ni séance ni échéance, contrairement au saut et à la
calculatrice. Ce qui manquait était le MOYEN DE L'ATTEINDRE : la liste
déroulante ne proposait que les exercices de la séance en cours. Elle va
maintenant jusqu'au catalogue entier, en trois groupes — sous la main, dans
vos autres parcours, tout le catalogue —, le geste court reste en tête, et
cinq vérifications d'API gardent la règle (vues rouges avec le défaut remis).

**16. « Placer un point » bloquait.** MESURÉ : après un clic faux, 36 cibles,
ZÉRO cliquable, et cela ne changeait plus. La grille se fige à la réponse —
c'est voulu — et trois chemins sortaient de là : juste, plus d'essai… et le
troisième, « faux mais il reste un essai », n'était écrit nulle part. C'est le
plus fréquent des trois en entraînement. L'épreuve regarde les TROIS activités
qui figent leur plateau, pas seulement celle qu'on vient de corriger.

**17. La mosaïque.** Le sens annoncé était l'inverse de celui qu'on voit :
**douze questions sur douze**. La cause n'est pas une erreur de signe, c'est
une convention partagée à tort — le quadrillage dessine avec l'ordonnée qui
DESCEND, la mosaïque la retourne, et les deux lisaient la même table. La
question « de quel côté est-ce que je regarde ? » se pose maintenant à un seul
endroit. Et le centre de rotation : sur 126 rotations, 14 seulement touchaient
la pièce ; l'élève reçoit désormais un centre à 0,5 ou 1,5 carreau, jamais
plus.

**18. « Pas commencé » pour celui qui a fini.** MESURÉ, et c'était bien le
revers de la correction de la veille : le direct cherche le travail de la
séance dans les deux cents derniers événements, et celui qui a terminé puis
joue en produit davantage. On n'élargit pas la fenêtre — trente élèves toutes
les cinq secondes —, on ajoute les ÉVÉNEMENTS QUI DÉLIMITENT un travail, qui
sont deux par parcours plus un par étape.

# Dix-neuvième passe — « M'améliorer » au bout du parcours

> « on va rester ainsi, à la fin d'un parcours, lors du bilan envoyé à l'élève,
> il faut qu'il ait sur son écran un bouton M'améliorer où tu crées un parcours
> de révision »

L'écran de parcours ne bouge pas : il a regardé les quatre maquettes et garde
ce qu'il a. Ce qu'il veut, c'est **la suite** — le bilan de fin de parcours ne
dit que ce qui s'est passé, et il doit proposer quoi faire ensuite.

La machinerie existe déjà pour l'écran « Mon profil » (`core/remediation.js` :
`startErrorReview`, `startSkillSession`, `startRecommendedSession`). Ce qui
manque est le bouton **là où l'élève est**, au moment où il vient de voir ses
erreurs.

# Vingtième passe — la liste de « Dispenser », et l'ajout en pleine séance

> « pour le mot au tableau - dispenses, dans la liste déroulante, il faut
> simplement les exercices du parcours en cours (même ceux que les élèves n'ont
> pas fait) »
>
> « et si je rajoute un exercice dans le parcours qui est en cours (donc hors
> classe dans la rubrique préparer) ca le rajoute au parcours en cours sans tout
> écraser ? »

**J'avais élargi la liste à tout le catalogue, et c'était la mauvaise
correction.** Il ne voulait pas le catalogue : il voulait les exercices DU
PARCOURS EN COURS, y compris ceux que personne n'a encore ouverts. Ce qui veut
dire que ceux-là n'y étaient pas — et il faut comprendre pourquoi avant de
remettre le bon périmètre.

La seconde est une question, et elle touche exactement ce qu'on a corrigé ce
matin (« ça a remis à zéro tous les élèves »).

## Ce qui a été fait — la liste de « Dispenser », et l'ajout en pleine séance

**20a. La liste.** Ma première correction était à côté : j'avais élargi au
catalogue entier (236 entrées) en croyant que le périmètre était le problème.
Il ne l'était pas — la SOURCE l'était. On cherchait la séance imposée dans
`state.teacherPaths`, c'est-à-dire dans le tiroir LOCAL du navigateur : un
parcours préparé sur un autre poste ne s'y trouve pas, `imposee` valait `null`,
et il ne restait dans le menu que les exercices qu'un élève avait ouverts à cet
instant. D'où sa phrase exacte : « même ceux que les élèves n'ont pas fait ».
On lit désormais `vue.seances`, que le serveur remplit (`exercices` par séance,
ajouté exprès pour cet écran), avec le tiroir local en secours seulement.

**20b. L'ajout en pleine séance.** Mesuré avec `tools/seanceQuiChange.mjs` :
pour une séance **donnée**, le complément arrive déjà (Tom 2 étapes → 3, Emma
3, et la MÊME identité de travail). Pour une séance **imposée**, non : hier
elle écrasait tout, ce matin elle ne bougeait plus du tout. Elle suit
maintenant la même règle que `majDeSeance` — ce qui est protégé n'est pas le
début du parcours, c'est **ce que l'élève a déjà fait**.

Et j'avais recopié `memeEtape` au lieu de l'importer. Ma copie ne triait pas
les clés : deux étapes identiques écrites dans un ordre différent — ce qui
arrive à chaque aller-retour JSON, donc à chaque synchronisation — passaient
pour différentes, et l'ajout n'arrivait jamais. Trois épreuves l'ont dit d'un
coup. Une règle écrite deux fois finit toujours par diverger ; celle-ci a
divergé avant d'être relue.

# Vingt-et-unième passe — la barre d'étape pleine à mi-chemin

> « dans l'épreuve multiplier des relatifs pas à pas, quand on a fait 12/24 et
> bien la barre de progression qui est dans les barres en haut est pleine alors
> qu'elle devrait être à la moitié »

Capture à l'appui : le fil du haut montre treize segments, « Étape 1 sur 13 »,
et le PREMIER segment est déjà plein alors que la ligne du dessous dit
« 0 / 10 questions ». Le segment de l'étape EN COURS ne suit donc pas les
questions : il est plein dès qu'on y entre.

**Ce que la mesure a dit, et ce n'était pas ma première idée.**
`tools/barreDeLEtape.mjs` relit les deux compteurs du haut à CHAQUE réponse —
celui du meneur (`itemsResolved / nbItems`) et celui du fil, qui recompte le
journal. Traversé **tout droit**, le parcours les donne d'accord, question par
question : 4 %, 8 %, 13 %… C'est pour cela que le défaut a vécu des mois, et
c'est aussi pourquoi aucune épreuve ne le voyait.

Il suffit de **refaire une étape** pour qu'ils divergent. « Refaire pour
m'améliorer » est proposé à qui a validé sans être parfait, c'est-à-dire à la
moitié d'une classe ; l'étape écrit alors une **seconde clôture**. `faites`
passait à deux pour une seule étape faite, et tout ce qui se repérait au
COMPTE — `plan[faites]` — désignait l'étape d'après. Relevé : l'élève travaille
la deuxième étape, le fil éclaire la troisième case et compte ses vingt-quatre
questions sur les six de celle-là. **Pleine au quart.**

La correction tient en une phrase : **l'étape en cours se nomme, elle ne se
compte pas.** La dernière tentative porte son `stepId` ; on la cherche dans le
plan, et l'on ne compte que ses questions à elle, depuis sa dernière clôture.
Les clôtures, elles, se dédoublonnent par étape. Quatre épreuves vues tomber
d'un côté, trois de l'autre — le serveur fait le même calcul, et il fallait
corriger les deux sous peine que le professeur et l'élève lisent deux choses du
même travail.

# Vingt-deuxième passe — le bouton « M'améliorer »

> « on va rester ainsi, à la fin d'un parcours, lors du bilan envoyé à l'élève,
> il faut qu'il ait sur son écran un bouton M'améliorer où tu crées un parcours
> de révision, est ce clair ? »

Oui. Il y avait déjà un bouton, et il ne répondait pas : « Rejouer ces
questions » vivait au BAS de la liste « À retravailler » — donc après huit
encadrés rouges, donc sous la ligne de flottaison d'un téléphone — et il ne
paraissait que s'il restait des questions **définitivement** ratées. Un élève
qui a tout rattrapé au second essai et qui sort avec une compétence à 50 %
n'avait aucun bouton du tout, alors que c'est exactement celui qui vient
demander.

Le nouveau se range **avec « Terminer »**, dit combien d'exercices il propose
(« M'améliorer — 3 exercices »), et se tait sous un bilan parfait : « M'améliorer »
là où il n'y a rien à améliorer ne dit pas « bravo », il dit « ce n'était pas
encore assez ».

Le parcours qu'il ouvre vient de **deux sources** : les questions ratées,
rejouées à l'identique grâce à leur graine puis en variante ; puis les
compétences qui n'ont pas tenu, qu'aucune question ratée ne signalait. Et il ne
sort pas des exercices de la séance — la sonde avait trouvé une révision de
« la règle du signe » qui ouvrait « Priorités et relatifs », un exercice que
Rémy n'avait pas choisi. Mesuré sur trois scènes (il s'est trompé, il a tout
réussi, et le même bilan sur un téléphone de 390 px).

**L'arbitrage sur l'interrogation.** Je lui avais signalé que « M'améliorer »
paraît aussi à la fin d'une évaluation, alors qu'il avait demandé le contraire
pour le bouton du bilan d'ÉTAPE. Sa réponse :

> « oui mais en interrogation ça ne changera pas la note »

Donc on garde. Les deux règles ne portent pas sur le même bouton : « Refaire
pour m'améliorer » rejoue l'étape NOTÉE, « M'améliorer » ouvre un parcours
d'entraînement à part, après la note. C'est écrit dans `startAmelioration`, et
une épreuve garde l'absence de condition — c'est exactement le genre de ligne
qu'une main pressée « corrigerait » en croyant appliquer l'autre règle.

# Vingt-troisième passe — les bilans vides, le « APRÈS » collé, le code, et la maison

Quatre remarques, dans l'ordre où il les a écrites, avec deux captures : l'onglet
« Les bilans » → « Par séance » de sa 4C, et un gros plan sur la ligne de
présentation.

> « aucun retour sur cette page. »

Le tableau « Par séance » est **entièrement vide** : trente élèves en lignes,
huit exercices en colonnes, pas une seule case remplie, et l'avertissement
« 12 exercices n'ont été atteints par personne » — alors que sa classe a
travaillé « Avant les vacances - 4ème » toute l'heure.

> « Le après est collé à gauche, ce n'est pas beau. »

La ligne « APRÈS — ce que la classe a travaillé, et ce qu'il faudrait
reprendre. » commence au bord gauche de la fenêtre, hors de l'alignement des
onglets juste au-dessus. Sur sa capture, le A est même rogné.

> « Pour les classes, le code ne me sert pas, ne le rend pas cliquables »

Le code de classe (QVSWPZ) sous le titre « 4C » a l'air d'un lien — couleur
d'accent, et il réagit au clic. Il ne lui sert pas.

> « je ne sais pas comment on fait pour que les élèves ne se connectent pas à la
> maison avec leur compte car pour l'instant on est en debug, et je veux des
> retours de ce que l'on fait en classe »

Il veut pouvoir **fermer l'accès hors de la classe**. Deux raisons, et la
seconde est celle qui presse : le logiciel est encore en rodage, et les
remontées qu'il regarde doivent être celles de l'heure de cours, pas d'un
travail du soir.

**Ce que la mesure a dit.** `tools/bilanParSeance.mjs` monte une classe, donne
une séance, l'IMPOSE, fait travailler un élève, puis compare les deux noms :

```
   les séances que l'écran propose : path_1792150030223_UWJ9  « La séance imposée »
   les clés que le serveur a rangées : path_cCLAVVV
```

L'écran cherchait l'identifiant du parcours du professeur
(`assignments.path_id`), le serveur avait rangé le travail sous l'empreinte du
CONTENU que l'élève calcule en ouvrant une séance imposée. **Les deux ne
pouvaient pas se rencontrer** — et imposer est exactement la façon dont il
travaille en classe. Pour une séance *donnée*, les deux coïncidaient : c'est
pourquoi la fonction paraissait marcher quand on l'a construite.

Deux corrections, et il fallait les deux. L'identité **voyage maintenant avec la
séance imposée** au lieu d'être recalculée par chaque élève — le même défaut que
celui déjà corrigé sur les séances données (« Tom path_cDPF7NX, Emma
path_cK8LZGE, même séance, même contenu »). Et le serveur **traduit à
l'écriture**, par `assignments.path_identity`, qui était déjà le pont. On n'a
touché à aucune des deux identités : changer celle de l'élève aurait remis la
classe à zéro, le défaut d'avant-hier.

**La ligne « APRÈS ».** L'en-tête, les onglets et le corps portent tous 26 px de
marge ; cette phrase-là n'en avait aucune. Mesuré après correction : 26 px
contre 26 sur l'ordinateur, 15 contre 15 sur un téléphone
(`tools/alignementDeLaClasse.mjs`).

**Le code de classe** n'est plus un bouton. C'était un bouton de COPIE posé au
milieu d'une carte qui s'ouvre au clic : viser la classe et tomber sur le code
ne faisait rien d'utile. Il reste affiché — on le dicte encore, et il porte
l'état de la porte d'inscription.

**La maison : elle existait, et il ne l'a pas trouvée.** C'est le réglage qu'il
avait lui-même demandé il y a quelques jours (« Je peux choisir qu'il ne puisse
avoir accès à rien à la maison pour la simple raison que pour le moment je veux
suivre ce qu'ils font et voir le debug »), et il s'appelait « Hors séance » —
le nom du drapeau en base, pas celui du geste. Il cherchait « la maison ».

L'onglet s'appelle maintenant **« 🏠 À la maison »** et dit son état DANS LES
DEUX SENS (« · ouverte » / « · fermée ») : ici, « ouvert » est la réponse qui le
gêne, et c'était le défaut. La case se lit « Rien à la maison : ils ne
travaillent que pendant la séance », et « maison fermée » paraît sous le nom de
la classe. Le mécanisme, lui, marche : mesuré de bout en bout
(`tools/fermeHorsSeance.mjs`) — l'élève qui se connecte hors séance ne lit que
son message, et la porte s'ouvre toute seule dès qu'il met une séance en cours,
sans que l'élève recharge quoi que ce soit.

# Vingt-quatrième passe — la porte de la maison au bon endroit, et la sortie de l'élève

> « mais pour l'instant je me connecte avec un compte élève, il a accès à son
> compte chez lui mais pour le moment j'aimerai bloquer son accès chez lui, on
> peut le mettre dans l'onglet mes classes, là où tu affiches la liste de
> classe. »

Le réglage existe et il marche — c'est celui qu'on vient de renommer « 🏠 À la
maison ». Il est dans **Le direct**, c'est-à-dire DANS une classe, derrière un
onglet replié. Or le geste qu'il décrit se fait **avant** l'heure, et sur
plusieurs classes à la fois : il le veut donc sur l'écran qui les montre
toutes.

> « Dans la partie élève il n'y a pas d'endroit pour se déconnecter »

Il essaie le logiciel avec un vrai compte d'élève, et il ne peut pas en
ressortir.

**La porte, sur la carte de chaque classe.** Un bouton `🏠 Maison ouverte` /
`🏠 Maison fermée` au bout de la ligne du bas, qui porte l'ÉTAT et non l'action :
sur six cartes, on lit d'un coup d'œil lesquelles sont fermées. C'est le MÊME
réglage que celui du direct — les deux écrivent `hors_seance` — et non un
second, parce que deux gestes portant le même nom et faisant deux choses
différentes, ce dépôt l'a déjà payé. Il part à droite pour ne pas voler le clic
qui ouvre la classe : mesuré, il couvre 7 % de la carte et s'arrête avant elle.

**Et il a fallu deux mesures pour qu'il marche.** Ma première version écrivait
`c.hors_seance` dans la liste qu'on a en mémoire puis redessinait. Le serveur
enregistrait — vérifié — et la carte disait toujours « Maison ouverte » :
`mesClasses()` rend le TABLEAU des classes, pas un objet qui le contient, et
l'écriture tombait à côté sans un mot. On relit donc la liste au serveur après
avoir fermé. Un écran qui ment sur un réglage qu'on vient de poser est pire que
pas de réglage : on reclique, et l'on rouvre ce qu'on venait de fermer.

**La sortie de l'élève.** Elle existait, dans le menu « ⋯ » de la barre du
haut — c'est-à-dire derrière le bouton dont le commentaire d'`index.html` dit
qu'il existe POUR CACHER les outils aux élèves (« quand l'élève arrive là, ça
fait peur »). Mesuré avant d'y toucher : sur l'écran de l'élève, le bouton
existe, n'est pas caché, et reste invisible — son menu l'est.

Elle se pose maintenant dans **« Qui travaille ? »**, la ligne de l'identité de
« Mon profil », avec le même libellé qu'ailleurs : « Se déconnecter de 6e B ».
Le geste est écrit une seule fois pour les deux boutons. Mesuré : visible,
cliquable, et la demande de confirmation s'ouvre — « Tu vas te déconnecter de la
classe « 6e B ». Tout ton travail est enregistré. »

# Vingt-cinquième passe — la porte entrouverte, et le journal des connexions

> « mais par contre si il est bloqué chez lui car j'empêche l'accès, je peux
> laisser libre qqs exercices que j'aurais défini mais attention c'est la seule
> chose qu'il peut faire, il ne peut pas aller sur son profil ou autre. »
>
> « donc si j'empêche l'accès pour une classe, je peux autoriser des exercices
> spécifiquement pour cette classe »

Oui, et les deux phrases disent la même chose : la liste est **par classe**, et
elle est **exclusive**. Porte fermée ne devient pas porte entrouverte sur tout
le logiciel : le voile reste, et il ne laisse passer que ce qu'il a nommé. Pas
de profil, pas de catalogue, pas de bac à sable.

> « J'aimerai aussi que tu enregistres les connexions que je puisse suivre ce
> qu'ils font »

Il veut un journal des connexions — qui s'est connecté, quand — et il le veut
maintenant pour la même raison que la porte : « pour le moment je veux suivre
ce qu'ils font et voir le debug ». Ce qui l'intéresse n'est donc pas seulement
l'heure : c'est **où** — pendant la séance, ou chez eux.

**Ce qui a été construit.** Une colonne `hors_seance_exos` par classe, des
identifiants séparés par des virgules comme `bac_jeux`. Le professeur les
choisit dans l'onglet « 🏠 À la maison », un par un dans un menu natif — deux
cent trente-six entrées dans une liste à cocher se perdent au premier clic
maladruit —, et ce qui est choisi reste sous les yeux en pastilles qu'on retire
d'une croix.

**Les boutons sont SUR le voile, et c'est la décision qui porte tout.** Rouvrir
l'application en n'autorisant que quelques exercices demanderait de fermer une à
une toutes les autres portes — le profil, le catalogue, la carte, le bac à
sable, le menu — et il suffirait d'en oublier une. Le voile, lui, est déjà la
fermeture de TOUT : on y perce exactement les trous nommés. Mesuré en demandant
au navigateur qui est sous le doigt : profil, parcours et catalogue restent
inatteignables pendant que l'exercice, lui, s'ouvre.

**Et il revient quand l'exercice se termine, par n'importe quelle porte.** Ma
première version s'appuyait sur `onExit` du meneur. Mesuré : la croix rouge
n'appelle pas `exit()` — elle abandonne le meneur et cache la couche elle-même —
et l'élève se retrouvait dans l'application entière, porte fermée. La boîte à
jeux avait déjà payé ce piège. On écoute donc le FAIT (la couche de jeu a
disparu) et non le chemin.

**Le journal des connexions** écrit une ligne à chaque identification — jamais
au battement, qui frappe toutes les dix secondes — avec le CONTEXTE décidé par
le serveur : « en classe » (séance imposée), « à la maison » (porte fermée, et
il est quand même venu), « hors séance ». Aucune adresse réseau : elle ne dirait
pas « chez lui » — un téléphone dans la cour sort par la 4G, le collège entier
par une seule adresse — et serait une donnée personnelle de plus sur des
mineurs. Il se lit dans **Les bilans → Connexions**, rangé par jour.

# Vingt-sixième passe — le professeur enfermé dans le compte de son élève

> « je suis désolé, je me suis mis sur un compte élève mais je ne trouve pas où
> me déconnecter »

Il n'y avait pas à être désolé : **la porte n'existait pas**. Reproduit
(`tools/deuxIdentites.mjs`) : sur SA machine, les deux rattachements coexistent
— il est professeur, et il vient d'entrer avec le billet d'un élève pour
essayer. `quiEstLa()` rendait UNE identité et rendait celle du professeur dès
qu'un jeton de professeur existait ; les deux boutons de sortie proposaient donc
« Quitter le mode professeur », qui ne défait pas le rattachement de l'élève.
Deux jetons, zéro geste.

Il s'en est sorti en changeant de navigateur — c'était la bonne réaction.

**La correction** lit les DEUX rattachements. La sortie de « Mon profil » nomme
l'élève quand il y en a un — « Qui travaille ? » est sa ligne d'identité, y
proposer de quitter le mode professeur, c'est répondre à côté — et une seconde
entrée paraît dans le menu « ⋯ », **uniquement dans le cas double** : une classe
entière d'élèves n'a qu'une identité et ne verra jamais deux boutons. Mesuré
jusqu'au bout : l'élève est détaché, le professeur reste connecté, et la fenêtre
nomme la classe qu'on quitte.

**Le chemin de secours sur la version déjà déployée**, vérifié aussi : quitter
d'abord le mode professeur fait réapparaître « Se déconnecter de 6e B » dans le
même menu.

# Vingt-septième passe — après la déconnexion, on reste l'élève

> « par contre, sur le même navigateur, je quitte le mode professeur. Je mets
> sur un compte d'élève. Quand je déconnecte du compte d'élèves, je garde car ça
> doit être sur le navigateur le profil de l'élève alors que j'aimerai revenir
> à l'écran d'identification »

Se déconnecter détache bien le compte du serveur, mais le PROFIL LOCAL reste —
il porte le prénom de l'élève, son travail, son score — et l'application
continue donc de s'ouvrir sous son nom. Ce qu'il attend : retomber sur l'écran
d'identification, celui où l'on entre son billet.

**Ce que la mesure a dit.** `tools/retourAuPortail.mjs` monte son chemin mot
pour mot : il quitte son mode, entre comme élève, se déconnecte. Résultat avant
correction, **avec une séance en cours** :

```
   {"profil":"Bernard Tom","rattache":false,"aUneSeance":true,
    "porteNecessaire":false,"porteVisible":false}
```

Le jeton est bien parti — la déconnexion « marchait ». Mais le profil local
reste, son journal avec, et `portailNecessaire()` refuse d'ouvrir la porte
quand `aUneSeance()` répond oui. L'application se rouvrait donc sous le nom de
l'élève, avec sa séance, comme s'il n'était jamais parti. **Et la première
version de la sonde, sans séance, donnait tout vert** : c'est le journal local
qui tient la porte fermée, et il faut une séance pour qu'il y ait quelque chose
dedans.

**La correction** bascule sur un profil neuf en partant : espace de rangement
neuf, donc journal vide, donc plus de séance, donc la porte s'ouvre — et le nom
affiché n'est plus celui de l'élève. Son profil reste dans la liste : se
déconnecter n'est pas s'effacer, et c'est la case « Effacer aussi mon travail »
qui tranche. Cochée, le profil part **en entier**, et non en coquille vide
portant son prénom.

**Deux défauts trouvés en vérifiant ce que je n'avais pas le droit de
supposer.** L'élève qui se reconnecte retrouve-t-il son travail ? Oui — mais il
se créait un SECOND profil à son nom à chaque aller-retour. On le reconnaît
maintenant à son identifiant de connexion, que la déconnexion laisse exprès sur
le profil. Et les profils vierges s'empilaient de la même façon : on réutilise
celui qui existe.

## 4. « deux explications compliqués et fausses » — le carnet d'erreurs

> « deux explications compliqués et fausses. C'est dans le "Mes erreurs" »

Deux captures d'écran, prises sur le carnet d'un élève. Transcrites ici : une
capture ne se retrouve pas dans un historique, et c'est le texte qui est en
cause.

**« Reconnaître la transformation »** — avec la mosaïque, ses pièces A, B, C, D
et ses droites candidates (d₁), (d₂), (d₄) et le point O₃ :

> Par rapport à quoi la pièce B est-elle le symétrique de la pièce C ? —
> ta réponse : **axe:v:8.5**, attendu : **axe:v:5.5**
>
> La bonne espèce, mais pas la bonne droite. Prends un point et son image : la
> droite cherchée passe exactement au milieu des deux.

**« Tracer l'image par une translation »** — avec le quadrillage, la figure
bleue et la flèche rouge :

> Colorie l'image de la figure bleue par la translation que montre la flèche
> rouge. — ta réponse : **7|3/8|3/7|4/8|4/8|5**,
> attendu : **8|2/9|2/8|3/9|3/9|4**
>
> 1 case juste, 4 oubliées, 4 en trop. Reprends case par case.

**Les deux griefs sont justes, et le second ne se voyait pas.** Ces chaînes sont
les formes CANONIQUES, celles qui jugent. Illisibles, d'accord — mais surtout,
**leurs nombres ne sont pas ceux de l'élève**. Mesuré sur six tirages
(`tools/carnetDesTransformations.mjs`) :

| la carte écrivait | la figure portait |
| --- | --- |
| `axe:v:7.5` | `(d₁) x = 8` |
| `point:5.5:3.5` | `O₁ (6 ; 6)` |

La droite est décalée d'un demi-carreau ; pour le point, l'ordonnée n'est même
pas décalée, elle est **retournée** — le repère de l'élève monte, les lignes du
quadrillage se comptent de haut en bas. `core/elementSymetrie.js` prévient en
tête de fichier qu'une droite « écrite x = 4 par la question et lue x = 4,5 par
la correction serait un exercice qui donne tort à qui a raison ». Le carnet le
faisait.

**Et le compte de cases décrit une erreur qui n'a pas eu lieu.** Son élève avait
colorié LA BONNE FIGURE, un carreau trop à gauche et un carreau trop bas : les
deux listes de la carte sont exactement dans ce rapport, vérifié case par case.
La phrase « 1 case juste, 4 oubliées, 4 en trop » est vraie, et elle décrit un
élève qui colorie au hasard. Sur d'autres tirages du même décalage, elle dit
même « 5 oubliées, 5 en trop » — c'est-à-dire « rien de juste » — à quelqu'un
qui avait tout compris sauf la place.

**Ce qui a été fait.** La forme qui juge ne change pas d'un caractère : on en
fabrique une seconde, destinée à être LUE, et c'est elle qui part au journal
(`opts.dire`, le même chemin que le codage des figures en septembre). La carte
dit maintenant :

> ta réponse : **O₁ (2 ; 4)**, attendu : **O₄ (5 ; 4)**
>
> ta réponse : **(5 ; 6), (4 ; 7), (5 ; 7), (4 ; 8), (5 ; 8)**,
> attendu : **(6 ; 5), (5 ; 6), (6 ; 6), (5 ; 7), (6 ; 7)**
>
> Ta figure a la bonne forme : elle est seulement posée 1 carreau trop à gauche
> et 1 trop bas. Reprends UNE case, place-la juste, et reporte les autres autour
> d'elle.

Les cases sont comptées en colonne et ligne À PARTIR DE 1, comme la correction
les donnait déjà et comme le quadrillage les annonce aux lecteurs d'écran
(« Colonne 8, ligne 4 ») : une seule vérité, et une épreuve garde que les deux
ne divergent pas. Le diagnostic, lui, regarde la FORME avant de compter : la
bonne figure mal posée se dit comme telle, et la figure glissée au lieu d'être
retournée — l'erreur de fond de la symétrie — a sa propre phrase.

**Une réserve, et elle se voit à l'écran.** Les cartes déjà enregistrées gardent
leurs codes : le journal stocke le texte, pas la recette. Celles de ses captures
ne changeront donc qu'à la prochaine réponse sur la même question — ou en les
retirant du carnet par la petite corbeille.

## 5. « il faut toujours pouvoir se déconnecter »

> « Quand c'est noté sur l'écran, c'est fermé pour le moment. Je ne peux
> déconnecter. En fait, il faut toujours pouvoir se déconnecter, j'ai besoin de
> tester avec un élève puis revenir à mon compte prof. Par contre si l'élève ne
> se déconnecte pas chez lui, il peut travailler. La référence est ce qui est
> sur la base de données prioritairement (on garde de côté le local storage pour
> une future application hors ligne) est ce clair »

Trois choses dans ce message, et la première est un blocage immédiat.

**La porte close n'a pas de sortie.** Le voile « C'est fermé pour le moment »
couvre tout l'écran — c'était la demande, mot pour mot : « ATTENTION C'EST LA
SEULE CHOSE QU'IL PEUT FAIRE, il ne peut pas aller sur son profil ou autre ».
Or la sortie de l'élève vit justement dans « Mon profil », c'est-à-dire derrière
le voile. En fermant la maison de sa classe, il s'est enfermé lui-même dans le
compte de son élève. Le voile doit donc porter sa propre sortie.

**Et se déconnecter n'est pas une obligation.** « si l'élève ne se déconnecte pas
chez lui, il peut travailler » : le bouton s'ajoute, il n'impose rien. L'élève
qui reste connecté garde ce que la porte lui laisse.

**La référence, c'est la base de données.** Le stockage local est mis de côté
« pour une future application hors ligne » : quand les deux se contredisent,
c'est le serveur qui a raison. Écrit en §9 de `docs/architecture.md`, avec ce
qui en découle — une conclusion ne se recalcule pas sur l'ardoise, un état local
ne tient pas une porte fermée tout seul, et le travail de l'élève, lui, n'est
pas un cache : on l'envoie avant de partir.

**Et le logout de la porte close n'est pas le logout ordinaire** — « oui mais
attention c'est le mode porte fermé donc ça doit être différent pour le logout ».
La sortie ordinaire négocie : finis d'abord ta question, voilà ce qui n'est pas
parti, veux-tu effacer ton travail. Toutes ces questions supposent qu'on puisse
RESTER et continuer ; derrière un voile, il n'y a rien à continuer, et le retenir
pour lui demander de finir une question qui n'existe pas EST l'enfermement dont
il se plaint. Celle-ci ne se refuse donc jamais, n'efface rien, et dit où l'on
atterrit.

**Ce que la mesure a trouvé** (`tools/sortieDuVoile.mjs`), et qui ne se lisait
pas dans le code : la fenêtre de confirmation s'ouvrait **derrière le voile**.
`.modal-overlay` est à `z-index: 100000` dans la feuille de style — mais
`showModal` repose son étage EN LIGNE, à 9999, et un style en ligne l'emporte
sur la classe. On lisait le texte à travers le voile, et le bouton n'était pas
celui qu'on touchait : un bouton visible et mort, livré à quelqu'un qui est déjà
bloqué. C'est `document.elementFromPoint` au centre du bouton qui a nommé le
coupable, et non la lecture des deux feuilles de style.

Et l'on vérifie aussi l'autre bout : se déconnecter n'ouvre **rien de plus** que
le voile. Le portail n'a que deux portes — rejoindre sa classe, saisir un code —
et le mode libre est éteint. La sortie ne peut donc pas devenir la porte que le
professeur venait de fermer.

## 6. « sur portable la zone direct est moche »

> « Sur portable la zone direct est moche quand même que faudrait il faire ? »

Capture d'écran à l'appui, sur son iPhone, en v1041 : le pilote de la classe,
ouvert sur « La classe », en 5G, à 15 h 01.

**Rien ne déborde, et c'est bien le problème** : on cherche un défaut d'espace
là où il y a un défaut de FORME. Les sept commandes de l'heure sont des
ONGLETS, et un onglet suppose une RANGÉE, posée au bord de son panneau.
Mesuré à 390 px (`tools/piloteAuDoigt.mjs`) :

```
7 commandes sur 5 lignes · 4 bords gauches différents
6 des 7 sans cadre ni fond
l'onglet ouvert finit à 689 px, son panneau commence à 802 px
```

Trois conséquences, et aucune n'est une affaire de goût :

- **plus rien ne s'aligne.** Quatre bords gauches, c'est-à-dire aucune colonne à
  suivre des yeux. C'est ce qui se lit « en vrac » ;
- **six commandes sur sept ne ressemblent pas à des boutons.** Un onglet inactif
  n'a ni fond ni bordure : sur un ordinateur le survol le révèle, sur un
  téléphone il n'y a pas de survol, donc rien ;
- **l'onglet ouvert n'est plus attaché à rien.** Son débordement d'un pixel sur
  le filet du panneau ne mord que s'il est sur la DERNIÈRE ligne. Au milieu du
  tas, c'est une boîte posée au hasard, 113 px au-dessus de son contenu et
  159 px à côté.

**Ce qui a été fait.** Sous 560 px, ce ne sont plus des onglets : une COLONNE,
un cadre pour les sept, le nom à gauche et l'état à droite — les sept états
tombent ainsi l'un sous l'autre, ce qui est exactement ce qu'un professeur vient
lire d'un coup d'oeil (maison fermée ? bac ouvert ? chrono ?). La ligne ouverte
se marque d'un trait bleu à gauche au lieu de prétendre toucher un panneau qui
est six lignes plus bas, et l'on fait défiler jusqu'au panneau qu'on vient
d'ouvrir. La rangée du haut suit la même colonne : les deux boutons prennent
toute la largeur. Mesuré après : **1 bord gauche, 0 commande sans cadre, une
ligne par commande.**

Et l'ordre ne bouge jamais, ce qui était son arbitrage contre les pastilles
dépliantes — « la rangée changeait de forme à chaque clic ». Une colonne ne se
replie pas.

**Ce qui reste, et qu'il doit trancher.** La rangée d'onglets est bancale à
TOUTES les largeurs, pas seulement au téléphone : mesurée à 1024 px, elle fait
encore trois lignes, et l'onglet ouvert reste à 63 px de son panneau. Deux
sorties possibles — étendre la colonne jusqu'aux tablettes, ou garder des
pastilles encadrées de même hauteur sur ordinateur, où la forme « onglet »
serait abandonnée partout. Non fait : il n'a rien demandé pour l'ordinateur.

**Et la pastille `v1041` qui recouvre « Préparer » sur sa capture** n'est pas un
défaut du logiciel : c'est sa palette d'auteur repliée (`#debug-toolbar`), qui
se déplace par sa poignée.

## 7. Un mode brouillon, à côté du robot

> « NE CODE RIEN, je veux un avis et une maquette :
> Dans le menu à côté du robot, avoir un mode brouillon pour poser son calcul.
> On peut poser une opération (tu as déjà des modules, il faut t'en servir),
> mettre des notes
> Dessiner en suivant les carreaux au crayon libre (et une grille aimanté) »

Rien n'a été codé : un avis, et une maquette à regarder (canevas de quatre
plans, publié à part).

**Oui, et c'est la pièce qui manque.** Devant une soustraction posée, l'élève
n'a aujourd'hui aucune surface pour chercher : il calcule de tête — et l'on
mesure alors un calcul mental qu'on n'avait pas l'intention d'évaluer — ou il
prend une feuille à côté du clavier, ce qui va en classe et ne va pas chez lui,
sur un téléphone.

**La ligne rouge tient, à une condition, et elle n'est pas technique.** Une
grille aimantée est à un pas de l'outil de construction virtuel qu'on s'est
interdit. Ce qui nous garde du bon côté est une règle sur la SURFACE : rien de
ce qui est tracé dans le brouillon n'est envoyé, corrigé ni noté. C'est une
surface pour PENSER, jamais pour RÉPONDRE. Conséquence directe : **pas de bouton
« Valider » sur le brouillon**, jamais, et aucun exercice n'accepte un tracé du
brouillon comme réponse.

**Un réglage par exercice, comme la calculatrice.** Le précédent est déjà dans
`index.html`, avec son raisonnement : « sur un exercice de tables de
multiplication, elle rendrait l'exercice inutile. C'est donc un réglage de
l'exercice (`calculatrice: true`), cochable dans la revue du catalogue ». Dans
« Calcul mental », poser l'opération est précisément ce qu'on demande de ne pas
faire : c'est donc l'outil « Poser » qui s'éteint par exercice. La note et le
crayon, eux, ne trichent jamais — ils restent toujours là.

**Où il vit.** Au téléphone, une feuille qui monte du bas et laisse l'énoncé
lisible ; sur ordinateur, un volet à droite. **Jamais un plein écran** : un
brouillon qui cache la question oblige à le fermer pour relire, et l'on perd ce
qu'on était en train d'y écrire.

**Ce qu'il garde.** Par question, avec un bouton « garder pour la suivante ».
Rien ne part au serveur : le brouillon n'a pas de référence, il est éphémère —
c'est la réponse la plus simple à « la base de données est la référence ».

**Ce que je n'y mettrais pas** : ni couleurs, ni palette de formes, ni règle, ni
compas (ligne rouge), ni historique d'annulation. Et **le professeur ne le voit
pas** : le jour où un brouillon est regardé, il cesse d'être un brouillon. C'est
le seul point où je vais contre son habitude de vouloir suivre ce qu'ils font,
et il doit trancher.

**Les modules sont tous là** — il a raison. `core/poser.js` (`poser()` et ses
quatre `colonnes*`, les deux méthodes de retenue, la grille `po-case` avec ses
marques), `core/quadrillageSvg.js` (les carreaux), `activities/glisser.js`
(`peindreAuGlisse`, le balayage du doigt, déjà employé dans « Tracer l'image »),
`core/calculatrice.js`. Le brouillon n'ajoute aucun moteur : il les pose côte à
côte sur une feuille. Reste à écrire la feuille, la bascule des trois outils, et
le trait du crayon libre.

**Quatre questions pour lui** : la persistance (par question ? par exercice ?) ;
le brouillon est-il visible du professeur (je dis non) ; « Poser » éteint par
exercice (je dis oui) ; et le crayon libre reste-t-il, ou s'en tient-on à
l'aimanté, qui est plus loin de la ligne rouge ?

### Son arbitrage, dans l'ordre

> « magnifique. 1/ pas de persistance. 2/ Non, 3/ ok, 4 oui »

1. **Pas de persistance.** La page blanche revient à chaque question. Ce qui
   est fermé puis rouvert SUR LA MÊME question se retrouve — fermer n'est pas
   effacer —, mais passer à la question suivante efface.
2. **Le professeur ne le voit pas.** Il va contre son habitude de vouloir
   suivre ce qu'ils font, et c'est ce qui fait du brouillon un brouillon.
3. **« Poser » s'éteint par exercice**, comme la calculatrice et pour la raison
   déjà écrite dans `index.html`.
4. **Le crayon libre reste.**

**Les trois décisions se renforcent, et elles simplifient tout** : rien n'est
gardé, rien n'est regardé, rien n'est envoyé. Le brouillon ne touche donc NI le
journal, NI le serveur, NI le stockage local — il vit en mémoire, le temps
d'une question. C'est la seule pièce du logiciel dont on puisse dire cela, et
c'est ce qui la met hors de portée de la ligne rouge.

**Une garde en découlera**, parce que c'est précisément ce qui se défait en
silence : aucune activité ne doit pouvoir LIRE le contenu du brouillon. Le jour
où une seule le fait, un tracé devient une réponse.

### Ce qui a été construit, et les trois défauts que la sonde a trouvés

**La maquette montrait la soustraction posée ET FAITE** — résultat et retenues
compris. C'était un défaut de la maquette, pas une option : une grille qui
calcule n'est pas un brouillon, c'est une calculatrice, et celle-ci existe déjà
derrière son propre réglage. Rémy a écrit « poser SON calcul ». Le logiciel
donne donc le cadre aux bonnes colonnes — les rangs viennent de `etendue()`,
qui range des colonnes et ne calcule rien — et laisse TOUTES les cases vides.
Une épreuve garde que `poser()` et ses quatre `colonnes*` ne sont même pas
importés : les avoir sous la main, c'est un jour les afficher.

**Trois défauts trouvés par `tools/leBrouillon.mjs`**, et aucun ne se lisait
dans le code :

1. **la feuille restait ouverte par-dessus l'exercice suivant**, lui couvrant
   les deux tiers de l'écran — l'élève arrivait sur une page blanche avant
   d'avoir lu la question. On ouvre son brouillon quand on en a besoin ; ce
   n'est pas un état dans lequel on entre ;
2. **« Reprendre les nombres » ne reprenait rien** sur « Le Tour du
   Rectangle » : la question dit « quel est le périmètre ? » et les deux
   longueurs sont ÉCRITES SUR LA FIGURE. On lit donc aussi les textes du
   dessin — mais pas tout le plateau, car les propositions d'un exercice à
   bulles sont des nombres elles aussi, et en reprendre une serait souffler ;
3. **le trait du résultat faisait 344 px de large et ZÉRO de haut.** Une
   colonne flexible rétrécit ses éléments quand le contenu déborde, et un
   trait de 2 px est le premier à disparaître — sans un mot.

**Mesuré, par le chemin de l'élève** : le bouton est dans la barre et se touche
au doigt ; l'énoncé reste lisible au-dessus de la feuille ; le cadre se pose aux
bonnes colonnes et aucune case libre n'est remplie ; le crayon aimanté tombe sur
les nœuds (tous multiples du carreau) et le crayon libre, lui, n'y tombe pas ;
**zéro événement parti au journal, zéro clef posée dans le stockage** avant et
après avoir rempli les trois outils ; la page blanche revient ; et sur
« Additions Mystères », l'outil « Poser » n'est pas là tandis que les deux
autres restent.

**Ce qui n'est pas fait, faute de demande** : la case à cocher dans la revue du
catalogue, qui laisserait Rémy éteindre « Poser » exercice par exercice de sa
propre main. Le tag « Calcul mental » couvre les trente exercices concernés, et
`poserAuBrouillon` tranche le reste.

## 8. Le brouillon, deuxième passe : taper, les retenues, le glissé

> « pour les chiffres des opérations du brouillon, il faudrait pouvoir les
> taper, tu oublies les retenues et il y a deux méthodes pour les soustractions
> et les chiffres je préfère du drag drop en supplément du clic pour le nombres.
> Pour le calcul, l'élève tape son calcul (une addition peut avoir plusieurs
> membres) et on peut avoir plusieurs calculs dans le brouillon »

Cinq demandes dans trois phrases, et la dernière renverse la table de « Poser ».

> « et pour le dessiner autorise le undo redo, et lisse le trait libre »

**« Poser » change de forme.** On n'écrit plus dans deux champs avec un menu
d'opérations : on écrit une LIGNE — « 12 + 34 + 5 » — et le cadre se pose
dessous. Plusieurs calculs tiennent sur la feuille, chacun avec ses retenues et
sa croix pour l'ôter. La lecture est large sur la forme (`x` et `*`, `:` et `/`,
la virgule comme le point) et stricte sur le fond : on ne mélange pas les signes
— « 3 + 4 × 5 » est un calcul à priorités, le poser inventerait un ordre que
l'élève n'a pas écrit —, et seule l'addition accepte plus de deux membres.

**Les retenues étaient là, mais invisibles** : bordure transparente tant qu'on
n'avait rien écrit dedans. Une case qu'on ne voit pas est une case qui n'existe
pas. Elles sont maintenant en pointillé ambre, sur toutes les colonnes qui
PEUVENT en porter — jamais celle des unités, qui n'a rien à sa droite, la règle
étant celle du noyau et celle que Rémy avait signalée sur 554 + 448.

**Les deux méthodes de soustraction**, celles qu'il décrivait en septembre : par
compensation, deux petites marques DEVANT les chiffres, l'une en haut l'autre en
bas ; par emprunt, une case au-dessus du chiffre du haut — et y écrire BARRE le
chiffre, ce qui est le geste même. Changer de méthode retire les marques déjà
posées : elles ne sont pas aux mêmes endroits et ne diraient plus rien.

**Trois gestes pour le même chiffre** : on touche une case puis un chiffre, on
TAPE au clavier (la case a le foyer — l'écouteur est sur la feuille et non sur
le document, sans quoi il volerait les touches à l'exercice), ou l'on GLISSE une
touche du pavé dans une case, par `rendreGlissable`, le même geste que partout
ailleurs dans le logiciel.

**Le dessin se défait.** On garde des ÉTATS et non des gestes : une pile de
traits saurait défaire un trait, mais pas un « Gommer » — et c'est précisément
l'effacement qu'on regrette. Défaire, refaire, et l'effacement se défait aussi.

**Le trait libre est lissé**, par une quadratique dont les extrémités sont les
milieux des segments ; il part et arrive aux mêmes points, on lisse le
tremblement sans déplacer le trait. **L'aimanté, lui, ne l'est pas** : une
courbe le ferait passer À CÔTÉ des nœuds, c'est-à-dire défaire exactement ce que
l'aimantation vient de faire. Chaque trait retient donc le crayon qui l'a tracé,
et changer de crayon ne redessine pas ce qui est déjà sur la feuille.

**Mesuré** (`tools/leBrouillon.mjs`, 26 vérifications) : les trois membres
alignés, les retenues visibles (bord « dashed »), les trois gestes du chiffre,
deux calculs qui coexistent, les deux méthodes et le chiffre barré, le trait
aimanté sur les nœuds et sans courbe, le trait libre courbé et hors des nœuds,
défaire/refaire/gommer — et toujours **zéro événement au journal, zéro clef dans
le stockage**.
