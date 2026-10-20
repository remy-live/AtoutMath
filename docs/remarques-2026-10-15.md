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

> « fais un vrai pavé numérique plutôt que prendre les chiffre de l'énoncé (qui
> peut s'activer ou se désactiver avec un bouton) et, de replier les opérations
> (tu peux rajouter un option vérifier ausi mais qui ne donne jamais la réponse
> et indique l'erreur) »

**Un vrai pavé, et un seul.** Les nombres de l'énoncé s'en vont : c'était
commode et devinatoire — sur un exercice à propositions, un nombre offert
pouvait être une réponse. À la place, un pavé de seize touches — dix chiffres,
la virgule, l'effacement et les quatre signes, que le clavier d'un téléphone ne
porte pas sur sa première planche. Il écrit dans la case choisie s'il y en a
une, dans la ligne de calcul sinon, **et une phrase dit laquelle** : un pavé qui
écrit ailleurs qu'on ne croit est pire que pas de pavé. Un bouton le masque.

**Les signes n'ont pas de touche morte.** Mesuré : éteints tant qu'une case
était choisie, on appuyait et rien ne se passait, sans que rien ne dise qu'il
fallait d'abord toucher la ligne. Un signe rend donc toujours le pavé à la ligne
— c'est ce que « j'écris une opération » veut dire.

**Replier une opération** retire sa grille et garde sa ligne : avec trois
calculs sur la feuille, celui qu'on a fini n'a plus besoin de ses colonnes, mais
on doit savoir qu'il est là.

**Vérifier, sans jamais donner la réponse.** La règle change de forme, pas de
sens : on disait « le brouillon ne calcule pas », la règle exacte était qu'il ne
calcule pas À LA PLACE DE L'ÉLÈVE. Vérifier demande évidemment de calculer ; ce
qui reste interdit est d'en DIRE le résultat. Ce qui sort de la vérification est
donc une phrase sans aucun chiffre — « Reprends la colonne des unités. » — et
des CLÉS DE CASES, jamais des valeurs. Une épreuve garde cette sortie, et la
sonde vérifie qu'après avoir appuyé, la grille contient exactement ce qu'elle
contenait avant.

**On ne montre que la première colonne fautive**, en partant de la droite.
Trois raisons : c'est ce qu'un professeur dit ; une erreur de retenue FABRIQUE
les erreurs des colonnes suivantes, et toutes les signaler ferait croire à cinq
fautes là où il y en a une ; et cela limite ce qu'on peut tirer du bouton —
marquer d'un coup toutes les cases fausses inviterait à essayer les dix chiffres
jusqu'au vert. Ce n'est pas une serrure, c'est le choix du tableau : on montre
OÙ, on ne dit pas QUOI.

**Et il ne gronde pas un travail en cours** : une case vide — ou vidée — n'est
pas une faute. « Tout ce que tu as écrit est juste. Il reste des cases à
remplir. »

**Deux fausses assurances attrapées en chemin.** Mon épreuve du glissé passait
au vert sur `if (false) rendreGlissable(…)`, le texte cherché s'y retrouvant
tel quel. Et la sonde cherchait les marques de la compensation avec un
`.br-case` de trop : m0 et b1 n'étaient jamais écrites, et le verdict « Tout ce
que tu as écrit est juste » contenait le mot « juste » — l'épreuve passait donc
sur un travail inachevé.

## 9. Une rafale de huit — 19 octobre

> « j'aimerai bien ce genre d'exercices (tu peux mettre des couleurs) »
> *(capture : « Dénombrer des cubes par tranche », un empilement de cubes en
> perspective, « Quel est le nombre de cubes ? », avec un bouton 90° pour
> tourner)*
>
> « problème »
> *(capture d'une fiche imprimée : « Exercice 1 — Virgule ou Fraction ? », où
> l'on lit `= \ldots` et `441/\ldots` en toutes lettres)*
>
> « dans l'atelier, il faut que l'on voit l'apercu pour l'impression à chaque
> fois c'est replié »
>
> « Pour Lis la fraction, n'hésite pas à changer de couleur. Et pour l'indice,
> dessine les traits de séparation »
>
> « pour les calculs sur les impressions, n'hésite à proposer une option tableau
> ou c'est présenté sous forme de tableau (dans les options d'impression) avec
> alternances des couleurs ou non. »
>
> « pour le strimko, quand on choisit les coulerus pour l'impression, ca ne met
> pas les couleurs. Vérifie aussi les autres pour les couleurs »
>
> « pour les trèfles, tu peux rendre le parterre plus dense »
>
> « pour le mode apprentissage pour les exercices, c'est tellement long, même
> pour moi, je n'ai pas envie de lire cela. Il faut faire plus court, plus
> simple, un exemple, pas si sérré, proposer un exemple facultatif animé (avec
> le robot par exemple) »
> *(capture du mode apprentissage du « Détour par le Nombre Rond » : un pavé de
> douze lignes justifiées, puis un encadré de huit lignes de plus)*

Puis : « Go ».

**L'ordre choisi** : ce qui est CASSÉ d'abord — le `\ldots` qui fuit dans les
PDF, les couleurs du Strimko qui ne sortent pas, l'aperçu replié —, puis les
réglages, puis les deux gros chantiers (le ton du mode apprentissage, et
l'exercice des cubes).

## 10. Trois fiches qui n'existent pas — 19 octobre, en cours de rafale

Arrivé pendant le travail sur le Strimko :

> « Faire le pdf pour
>
> Lis la fraction
> Virgule ou fractions
> Ding Bats
>
> Pour Lis la fraction, n'hésite pas à changer de couleur. Et pour l'indice,
> dessine les traits de séparation »

La seconde phrase est le point n° 4 de la rafale, répété — donc il y tient, et
il le place là où il doit l'être : SUR LA FICHE. Le premier point est neuf : ces
trois exercices n'ont pas de version imprimée du tout.

**Vérifié avant de commencer** : `logi-dingbats`, et les deux exercices de
fractions, n'ont pas de champ `printable` ; ils ne figurent donc dans aucune
liste de l'atelier d'impression.

**Ce qui a été fait** — les trois fiches existent, et la seconde phrase a reçu
les deux réponses qu'elle pouvait appeler :

- **Lis la Fraction** : fiche neuf figures par page, camemberts et pavages
  redessinés en jsPDF. La part coloriée prend une des SIX teintes tirée avec la
  question (elle était `var(--primary)` partout) ; la page des solutions trace
  toujours les coupes manquantes en pointillés, et une option « Montrer les
  traits de séparation » les met sur la feuille d'exercice quand le professeur
  le veut — sur le papier, l'élève ne peut pas demander d'indice.
- **À L'ÉCRAN AUSSI**, le second indice dessine maintenant toujours : les
  coupes quand il y a à redécouper, les parts NUMÉROTÉES sinon. Mesuré avant :
  sur les trois premières marches — celles qu'on voit en ouvrant l'exercice —
  il ne montrait rien du tout.
- **Virgule ou Fraction ?** : fiche douze égalités, avec un VRAI trait de
  fraction et la case à remplir à la place exacte du nombre qui manque.
  L'exercice s'imprimait déjà, mais en ligne de texte — « 441/100 = … » écrit à
  plat demande précisément ce que l'exercice existe pour empêcher.
- **Dingbats** : fiche six énigmes par page. La mise en page vit dans
  `js/core/dingbatPlan.js` et sert aux DEUX rendus, aperçu et PDF.

## 11. Les classes oubliées, et les thèmes de présentation — 20 octobre

> « dans mes parcours, quand j'ai donné un parcours à des classes, et que je
> recharge le parcours, je ne vois plus les classes à qui j'ai donné les
> parcours. »
> *(capture : le volet « À qui ce parcours est donné », six classes, AUCUNE
> cochée, et la phrase « Pas encore donné. Cochez une classe, ou dépliez-la
> pour choisir des élèves. » sur un parcours « Avant les vacances - 4ème » qui
> porte pourtant « Enregistré 08:08 »)*
>
> « Pour la présentation du parcours, serait-il possible d'avoir d'autres
> thèmes ? et on pourrait avoir l'apercu, ce serait cool »
> *(capture : la fenêtre « Mode et barème », réglage « Présentation : Chemin
> d'étapes (une étape après l'autre) »)*

Le premier est un DÉFAUT : ce qui a été donné doit se relire. Le second est une
demande. On commence par le défaut.

**Ce qui a été fait** :

- **Les classes retrouvées.** MESURÉ avant : l'identité d'une séance est celle
  du CONTENU du parcours, donc toute retouche la perd — cinq gestes sur six, et
  le sélecteur de mode qui la perd est DANS le panneau qui affiche les classes.
  La séance retient désormais aussi l'identité de son ATELIER, qui ne bouge
  pas ; et la case suit ce que le SERVEUR sert, qui n'avait jamais rien perdu —
  ce qui rattrape aussi les séances données d'un autre poste. Une classe que
  seul le serveur connaissait pouvait d'ailleurs se cocher sans jamais pouvoir
  se décocher : c'est réparé par la même occasion.
- **Deux habillages de plus, et leur aperçu.** Le DAMIER — tout le parcours sur
  un écran : mesuré sur huit étapes au téléphone, 394 px de haut contre 1013 au
  chemin serpentin. Et le RUBAN — une seule ligne qui défile de côté, pour un
  tableau numérique, qui se ramène tout seul sur l'étape en cours. L'aperçu est
  dessiné par le VRAI rendu, réduit : une vignette peinte à part aurait vieilli
  à la première retouche d'un habillage.

## 12. « fais tout le reste » — et quatre décors de saison — 20 octobre

> « ah mais oui fais tout le reste et mets aussi des thèmes (Noël, Halloween,
> Paques, Robot) »

« Tout le reste », ce sont les quatre points de la rafale du 19 qui attendaient
encore :

- **#5** — « pour les calculs sur les impressions, n'hésite à proposer une
  option tableau ou c'est présenté sous forme de tableau (dans les options
  d'impression) avec alternances des couleurs ou non. »
- **#7** — « pour les trèfles, tu peux rendre le parterre plus dense »
- **#8** — « pour le mode apprentissage pour les exercices, c'est tellement
  long, même pour moi, je n'ai pas envie de lire cela. Il faut faire plus
  court, plus simple, un exemple, pas si serré, proposer un exemple facultatif
  animé (avec le robot par exemple) »
- **#1** — « j'aimerai bien ce genre d'exercices (tu peux mettre des
  couleurs) » *(capture : un empilement de cubes à dénombrer)*

Et la demande neuve : quatre thèmes nommés.

**UN DÉCOR N'EST PAS UN HABILLAGE, et ce n'est pas un détail de rangement.**
Mis dans la même liste que « Chemin d'étapes » et « Damier », « Noël »
remplacerait la mise en page : l'élève qui a besoin du damier — le parcours de
quatorze étapes qui ne tient pas sur un écran — perdrait Noël, et le professeur
qui veut Noël perdrait le damier. Les deux choix ne répondent pas à la même
question : l'habillage dit COMMENT on lit le parcours, le décor dit de quoi il
a l'air. On en fait donc deux axes, et les vingt combinaisons existent.

**ET LE DÉCOR NE TOUCHE PAS AU PICTOGRAMME.** Remplacer 🍕 par un flocon ferait
joli et coûterait l'information : le picto dit la notion travaillée, et c'est à
ça qu'il sert — « on reconnaît les angles ou l'heure d'un coup d'œil ». Un
décor change les couleurs, le sol, le sentier et les ornements qui ne portent
rien.

**Ce qui a été fait** :

- **Quatre décors, sur un AXE À PART.** `damier` et `ruban` sont des mises en
  page ; Noël, Halloween, Pâques et Robot sont des DÉCORS, et les vingt
  combinaisons existent. Un décor ne touche pas au pictogramme de l'étape — il
  dit la notion travaillée —, ni à l'or d'une étape réussie : un élève qui
  change de décor ne doit pas réapprendre à lire sa propre carte. Les quatre
  teintes sont MESURÉES sur les pixels rendus (le blanc du numéro d'étape
  dessus) : 6,66 · 6,91 · 4,91 · 5,66 pour un seuil de 4,5. La liste classique
  garde les couleurs et refuse les ornements : six emoji derrière un
  paragraphe se paient en lisibilité. Imposable par la séance comme
  l'habillage, « Sans décor » compris pour une interrogation, et visible dans
  l'aperçu du professeur.
- **#7, le parterre de trèfles.** La cause était dans un nom : `densite`
  comptait les DISQUES, pas la page — et les trèfles se chevauchent. Mesuré en
  comptant des points sur le champ rendu : le « pré » annoncé à 62 % n'en
  couvrait que 52. Et le champ était de rapport 4/3 dans un cadre de 1,84,
  donc 530 px de blanc de chaque côté sur 1900 : il flotte au lieu d'occuper
  ses bords. Après : 51 / 70 / 84 / 88 % de vert, et le champ prend la forme
  de sa place.
- **#5, les calculs en tableau.** Un filet autour de ce qui était déjà posé —
  les questions se rangeaient déjà en rangées et en colonnes, le tableau
  existait sans être dessiné. Les cases se TOUCHENT (une gouttière de 9 mm en
  aurait fait un damier), l'alternance compte les RANGÉES et non les questions
  (sinon c'est un damier, par l'autre bout), et le réglage est aux DEUX
  panneaux d'impression — celui d'un exercice et celui d'un parcours.
- **#1, les cubes.** L'exercice existait (« Combien de cubes ? ») ; ce qui
  manquait, c'est ce que Rémy a mis entre parenthèses. Les étages sont
  maintenant colorés DÈS L'ÉNONCÉ — cela défait son choix d'août (« couleurs
  par étage via l'indice »), et c'est sa demande la plus récente qui compte.
  Et le bouton 90° de sa capture existe : un outil montre le solide vu des
  quatre coins, **décoché par défaut** — qui peut tourner voit les cubes
  cachés et n'a plus rien à déduire, c'est un exercice plus facile, et c'est
  au professeur de décider lequel il donne.
- **#8, le mode apprentissage.** MESURÉ sur l'exercice qu'il a photographié,
  par le chemin de l'élève : **239 mots à l'écran, contre 76 après**. On ne
  montre plus que la première phrase de la consigne ; le reste et les leçons
  passent sous « Tout ce qu'il faut savoir », replié. Un EXEMPLE est engendré
  comme l'exercice l'engendrerait, et se dévoile étape par étape — un exemple
  entièrement affiché est une correction, on la lit, on ne la cherche pas. Le
  bouton du robot existait déjà mais SOUS le mur : il est maintenant dans la
  boîte de l'exemple, là où l'on se pose justement la question. Et « pas si
  serré » tient en trois nombres : colonne de 34 em, interligne 1,75, et
  surtout plus de justification — c'est elle qui creusait des rivières de
  blanc au milieu des lignes.

**Puis, l'écran refait sous ses yeux** :

> « tu vois tu écris dix marches, etc, on s'en fiche en tant qu'élève »
>
> « il faut vraiment vraiment être court voire même mettre des schémas qui
> bougent »

Il avait raison deux fois, et la première est une erreur de DESTINATAIRE. Le
champ `instruction` du catalogue est écrit POUR LUI : il dit comment
l'exercice est bâti, par où il monte, ce qu'il travaille — exactement ce qu'il
faut pour CHOISIR un exercice, et exactement ce dont un enfant de onze ans n'a
rien à faire au moment de commencer. MESURÉ sur les 236 exercices : 21
consignes ouvrent sur une phrase de cinq mots ou moins, et huit d'entre elles
ne font qu'annoncer la structure.

- **La phrase vient maintenant de la CONSIGNE DE PAPIER** quand elle existe —
  celle qui s'imprime déjà en tête de la feuille d'un élève, donc déjà écrite
  pour lui. 134 exercices en ont une, 8 mots en médiane. Sans elle, la
  première phrase de la consigne du professeur, le rangement écarté. MESURÉ
  après : **10 mots en médiane pour les 236 exercices**, aucun muet.
  « Dix marches. » est devenu « Passe par le nombre rond, puis fais le petit
  pas qui reste. »
- **Et l'exemple se joue tout seul** : la question, puis chaque étape, puis la
  réponse, une ligne toutes les 1,6 seconde — le temps de LIRE celle qui vient
  d'arriver, pas seulement de la voir arriver. Un clic rend la main,
  `prefers-reduced-motion` l'arrête, et le robot reste à côté pour qui veut
  voir faire en vrai.

MESURÉ par le chemin de l'élève, sur l'exercice qu'il avait photographié :
**239 mots à l'écran avant, 12 au repos après** — plus un exemple qui s'écrit.

## 13. Les dossiers de parcours qui ne restent pas — 20 octobre

> « j'ai créé des dossiers pour y mettre des parcours à ma session précédente,
> il ne sont pas restés »

Un DÉFAUT, et de la même famille que celui des classes oubliées : ce qu'on a
rangé doit se retrouver. Un rangement qui disparaît est pire qu'une absence de
rangement — on refait le travail, et la deuxième fois on n'y croit plus.

« À ma session précédente » est le mot important : les dossiers ont survécu
assez longtemps pour qu'il les remplisse, et ils n'ont pas survécu à la
fermeture. C'est donc l'ENREGISTREMENT qu'on va regarder, pas l'affichage.

## 14. Deux demandes pendant le travail sur les dossiers — 20 octobre

> « j'aimerai bien que ce soit moi qui choissisent le thème »

Réponse à la question posée : **« Les deux : un réglage global, et l'élève peut
encore jouer. »** Donc un décor du moment, rangé dans son compte, qui s'applique
à toutes ses séances sans qu'il ait à ouvrir chacune — et l'élève garde ses
boutons, sauf là où une séance impose vraiment.

> « J'aimerai bien des exercices pour décomposer un nombre et pgcd et ppcm
> niveau 3ème. Des exercices d'application direct et des petits problèmes »

Trois notions, deux formes chacune. « Application directe » et « petits
problèmes » ne sont pas deux difficultés du même exercice : ce sont deux
compétences. Décomposer 360 est une technique ; savoir que « des paquets
identiques, le plus gros possible » appelle le PGCD et que « deux cars qui
repartent ensemble » appelle le PPCM est le vrai travail de troisième — et
c'est celui qui manque au contrôle.

**Ce qui a été fait** :

- **MESURÉ AVANT** (`tools/dossiersDeParcours.mjs`, le chemin complet : créer,
  ranger, vider le navigateur, recharger) : le serveur ne rendait que
  `["id","name","data","updated_at","donne"]`. Ni le dossier d'un parcours, ni
  la liste des dossiers. Après vidage : `dossiers: []`, et TOUS les parcours
  revenus à la racine. Le rangement n'avait jamais quitté le navigateur.
- **Et c'était écrit noir sur blanc dans le code** : « le `folderId` et le
  `timestamp` ne partent pas — ce sont des choix de rangement propres à chaque
  machine ». Une décision prise, assumée, et fausse. Rémy l'avait déjà
  tranchée pour les classes : « la référence est ce qui est sur la base de
  données prioritairement ».
- **La colonne `paths.folder_id`** porte le dossier d'un parcours, à CÔTÉ du
  parcours et non dedans : `data` est ce que l'élève reçoit, un rangement n'y
  a rien à faire. **La liste des dossiers** voyage dans `reglages`, sous
  l'identifiant du professeur — pas de table à elle : un dossier porte un nom,
  un rang et un pli, rien qu'on interroge, rien qu'on joigne.
- **Deux pièges fermés en route.** L'empreinte d'un parcours ne comptait pas
  son dossier : déplacer un parcours ne changeait donc rien, `monterUnParcours`
  répondait « déjà monté », et le déplacement ne partait jamais. Et la descente
  AJOUTE les dossiers au lieu de les remplacer : la montée est différée de deux
  secondes, donc un dossier qu'on vient de créer disparaîtrait au premier
  rafraîchissement — c'est-à-dire pendant qu'on le remplit.
- **MESURÉ APRÈS**, même trajet : le serveur rend `folder_id` et la liste ;
  après vidage, `dossiers: ["Sixièmes"]` et « Révisions » est dans son dossier.

**Et le décor du moment** — sa réponse : « Les deux : un réglage global, et
l'élève peut encore jouer. » C'est un réglage de SITE, posé dans sa zone
professeur, donc il s'applique aux séances **déjà données** sans en rouvrir
aucune. L'ordre est : ce qu'une séance IMPOSE, puis ce que l'élève a choisi sur
son écran, puis le décor du moment. La différence qui porte tout : « je n'ai
rien choisi » n'est plus « j'ai choisi sans décor » — sinon le réglage du
professeur restait invisible pour tout élève n'ayant jamais touché aux boutons,
c'est-à-dire presque tous. MESURÉ de bout en bout : le professeur pose
« Noël », et la carte d'un élève qui n'a rien imposé ni rien choisi sort en
`decor--noel` avec ses six ornements.

**Ce qui a été fait pour les exercices de troisième** :

- **Un module d'arithmétique nommé** (`js/core/arithmetique.js`). `pgcd` était
  écrit SEPT fois dans le dépôt — ce qui ne coûtait rien tant qu'il n'était
  qu'un outil pour simplifier une fraction au passage. Il devient le SUJET :
  il a donc un endroit, pur, éprouvé pour lui-même, et `core/pizza.js`
  réexporte d'ici plutôt que d'en garder une copie.
- **Dix marches, trois temps.** A : reconnaître un premier, décomposer, relire
  une décomposition. B : PGCD, PPCM, « premiers entre eux ? », fraction
  irréductible. C : les trois petits problèmes.
- **Et le temps C MÉLANGE les deux notions, exprès.** C'est la décision qui
  commande tout le fichier : calculer PGCD(84 ; 120) est une technique qui
  s'automatise ; savoir que « le plus grand nombre de bouquets identiques »
  appelle le PGCD et que « dans combien de minutes repartiront-ils ensemble »
  appelle le PPCM est une AUTRE compétence, et c'est celle qui manque au
  contrôle. Ranger les problèmes de PGCD ensemble puis ceux de PPCM ensemble
  apprendrait à lire le titre du paragraphe, pas l'énoncé.
- **Deux compétences au bilan**, et non une. Un élève qui calcule très bien les
  deux et se trompe de notion a zéro : son bilan doit le DIRE, sinon le
  professeur relit « n'a pas acquis le PGCD » pour quelqu'un qui le calcule
  parfaitement.
- **Les couples sont écrits, pas tirés.** Deux nombres au hasard sont premiers
  entre eux six fois sur dix : PGCD égal à 1, PPCM égal au produit, et le
  problème des bouquets devient « un bouquet par fleur ».

**Cinq défauts trouvés en REGARDANT — la feuille imprimée et l'écran** :

1. « en utilisant **toutes ses** stylos », « des trousses **TOUS**
   IDENTIQUES », « des carreaux **toutes posées** […] sans en couper
   **aucune** ». Chaque nom porte son genre maintenant.
2. « 110 = 2 × 5 × 11 **·** 132 = 2² × 3 × 11 » — sur une feuille de
   mathématiques, le point médian est un signe de MULTIPLICATION.
3. « … = 2⁴ × 3 **Quel est le PGCD** » — l'énoncé collait à la question, faute
   d'un point final. Invisible à l'écran, où ils sont dans deux blocs.
4. Des briques de **91 cm sur 143 cm**, et un car qui part **toutes les 132
   minutes**. Le calcul est juste, l'objet n'existe pas, et l'élève décroche.
5. **Le plus grave, et le plus silencieux** : une réponse à deux nombres ne
   fabrique PAS deux cases. Le pavé compte les trous que l'ÉNONCÉ déclare —
   sans eux, l'élève n'avait qu'un champ et aurait dû y taper « 3|4 ». Rien ne
   plantait, rien ne prévenait : la question était simplement impossible. Les
   exposants et la fraction se remplissent maintenant EN PLACE.

Et deux gardes du dépôt ont rattrapé deux autres fautes avant moi : un exercice
daté du lendemain, et une fraction écrite « 96/144 » sur le papier — où elle
doit s'empiler, numérateur sur dénominateur.

## 15. « bien trop difficile », et la progression de sixième — 20 octobre

**Deux messages, dans cet ordre.** Le premier donne sa progression de sixième
— dix-huit blocs, dans l'ordre de l'année — et demande explicitement :
« Ne fais rien mais que devrait-on faire ? ». Le second, pendant que je
regardais le catalogue :

> « le décomposer pgcd et ppcm est bien trop difficile ! »

### Ce que la mesure dit — les dix marches, relues une par une

Les questions ont été ENGENDRÉES et LUES, pas devinées. Verdict :
**l'exercice n'a pas de petit bain.** Chaque marche est au niveau d'un exercice
de fin de chapitre, et la première est la plus dure de toutes.

| Marche | Ce qu'elle demande vraiment |
| --- | --- |
| `premier` | « **91** est-il premier ? » — LE piège du chapitre (7 × 13), en première question. Puis 101, qui demande d'essayer 2, 3, 5, 7 et de savoir qu'on s'arrête à 10. |
| `decomposer` | « Complète la décomposition de **198** » — et les premiers 2, 3, 11 sont DÉJÀ dans l'écriture à remplir. Il ne reste que les exposants, c'est-à-dire la moitié facile ; le vrai travail, trouver QUELS premiers interviennent, n'est demandé nulle part. (J'avais d'abord écrit ici que l'énoncé portait un squelette `2ᵃ × 3ᵇ × 11ᶜ` : c'était mon brouillon, pas le fichier livré — les lettres en avaient déjà été retirées.) |
| `recomposer` | 2 × 3 × 5 × 7 = 210, de tête, sans brouillon. |
| `pgcd` · `ppcm` | PPCM(91 ; 143) = **1001** : trois facteurs premiers à multiplier de tête. PPCM(63 ; 84) = 252. Les décompositions sont données — c'est bien —, mais le produit final reste lourd. |
| `entre-eux` | 132 et 198. |
| `irreductible` | 63/84. |
| `paquets` · `ensemble` · `carre` | 78 et 117 (PGCD 39 : il faut voir 39 = 3 × 13). Et trois difficultés empilées : lire, CHOISIR la notion, calculer. |

**Il manque tout ce qui est en dessous de la méthode.** Pas une marche ne
demande « 12 est-il divisible par 3 ? », « cite un diviseur de 20 », « 2 × 2 × 3
= ? ». Une progression qui commence par la fin n'est pas une progression —
et c'est exactement ce que Rémy a vu en une phrase.

### Ce qu'il faudrait faire (à arbitrer avec lui)

1. **Un temps 0, de quatre marches**, où la réponse s'atteint SANS méthode :
   divisibilité par 2, 5, 10 ; « cite un diviseur de 20 » ; les diviseurs d'un
   petit nombre ; « 7 est-il premier ? » sous 30.
2. **Décomposer en DEUX gestes**, pas un : « par quel premier peut-on commencer
   à diviser 84 ? », puis « 84 ÷ 2 = ? ». L'escalier, marche par marche. La
   décomposition entière seulement sur 12, 18, 20, 24, 36.
3. **Enlever les lettres `ᵃ ᵇ ᶜ`** : « Complète : 198 = 2^□ × 3^□ × 11^□ »,
   les trous déjà en place, sans « donne a, b, c ».
4. **PGCD et PPCM d'abord sur de petits couples** — (8 ; 12), (6 ; 9),
   (10 ; 15) — qu'on trouve en LISTANT, avant toute décomposition. Le sens
   avant la technique.
5. **Lire la règle avant de l'appliquer** : « Dans 2²×3 et 2×3², quels facteurs
   sont communs ? » avant de demander le produit.
6. **Les problèmes du temps C sur de petits nombres** : la notion EST la
   difficulté, l'arithmétique n'a pas à s'y ajouter.

Et une question qui reste la sienne : faut-il garder les marches dures **après**
les faciles dans le même exercice, ou les sortir dans un second exercice
« pour aller plus loin » ?

### La progression de sixième — gardée telle quelle

Dix-huit blocs, dans son ordre. Elle n'est PAS une demande d'exercices : il
demande ce qu'on devrait faire. Elle est relue bloc par bloc contre le
catalogue (158 exercices tagués sixième) dans la réponse qui suit ce message ;
ce qui en sortira de décidé reviendra ici.

### Ses deux réponses — 20 octobre, dans la minute

> « oui pour le 1 »

Le petit bain du PGCD/PPCM est validé : les six gestes du §15 sont à faire.
La question qui restait — garder les marches dures après les faciles, ou les
sortir ailleurs — est tranchée par le silence et par la mécanique du dépôt :
**un seul exercice, dix-sept marches en trois temps**. `decoupeMarches` partage
les questions DANS L'ORDRE de la progression, et `partageEgal` donne une
question chacune aux premières quand il y en a moins que de marches : un
parcours de dix questions sur dix-sept marches joue donc les dix premières,
c'est-à-dire le petit bain. Le professeur qui veut le haut de l'escalier coche
le temps C, d'un geste. Deux exercices auraient demandé deux entrées au
catalogue pour la même progression, coupée en deux au milieu.

> « fais le bloc 1,11,18,10,5,3,8, »

Sept blocs de sa progression de sixième, et **dans son ordre** — qui n'est pas
celui de l'année : c'est un ordre de priorité, et on le suit.

| Bloc | Ce qu'il faut faire |
| --- | --- |
| **1** | Les milliards. « Dictée de Grands Nombres » plafonne à 9 999 999 ; son premier chapitre va aux centaines de milliards. Deux paliers, et vérifier le même plafond sur « Chasse au Chiffre » et « Décomposer, Recomposer ». |
| **11** | Les angles. « La Valeur Manquante » (somme des angles d'un triangle) et « Le Nom des Angles » (adjacents, supplémentaires) existent et sont tagués 5ème/4ème : **un tag à ouvrir**, pas un exercice à écrire. Manquent la bissectrice et les angles opposés par le sommet. |
| **18** | Multiplier une fraction par un nombre : « Multiplier des Fractions » multiplie DEUX fractions. Le cas de sixième est un réglage. |
| **10** | Placer une fraction sur une droite graduée : « La Loupe sur la Droite » ne place que des décimaux. Un réglage. |
| **5** | Les conversions d'aires et de volumes. Il l'avait repéré lui-même : « ← À voir 1 m = 100 cm, 1 m² = 100 dm² ». Le tableau ne connaît que l'échelon DIX. |
| **3** | Inégalité large ou stricte : ⩽ ou <, et encadrer. Rien n'existe. |
| **8** | Critères de divisibilité (2-5-10), division euclidienne (quotient ET reste), calcul de durées. Rien n'existe. |

**Et le bloc 8 recoupe le petit bain du PGCD.** Les quatre marches d'entrée
écrites pour la troisième — divisibilité par 2, 5, 10 ; « lequel divise 24 ? » ;
la liste des diviseurs ; « 13 est-il premier ? » — sont EXACTEMENT du programme
de sixième. Elles seront donc écrites une fois et servies deux fois.

### Ce qui a été fait pour le petit bain

**Dix-sept marches au lieu de sept, en quatre temps.**

| Temps | Marches | Ce qu'on y répond |
| --- | --- | --- |
| **A — pour commencer** | divisible · lequel divise · la liste des diviseurs · premier sous trente | par les TABLES, sans aucune méthode |
| **B — décomposer** | par quel premier · la première division · décomposer un petit nombre · premier (91, 101…) · décomposer · lire une décomposition | l'escalier, marche par marche avant d'être demandé en entier |
| **C — PGCD et PPCM** | le PGCD en listant · le PPCM en listant · quel exposant · PGCD · PPCM · premiers entre eux · fraction irréductible | le SENS d'abord (les deux listes sont écrites), la règle ensuite |
| **D — les problèmes** | lequel des deux ? · paquets · rythmes · carré | la notion, sur de petits nombres |

**Et c'est la mécanique du dépôt qui fait le reste.** `decoupeMarches` partage
les questions DANS L'ORDRE de la progression, et `partageEgal` en donne une
chacune aux PREMIÈRES quand il y en a moins que de marches. MESURÉ : un
parcours de dix questions joue les dix premières marches, dans l'ordre, et ne
sort pas des temps A et B. Rien à régler ; et le professeur qui veut le haut de
l'escalier coche le temps C d'un geste.

**Trois défauts trouvés en REGARDANT, et aucun ne se lisait dans le code :**

1. **« Lequel de ces nombres divise 50 ? » — et aucun nombre sur la feuille.**
   Les quatre propositions sont des BOUTONS, et une feuille imprimée n'a pas de
   boutons. La question n'était pas difficile, elle était sans réponse possible.
   Vu sur le PDF, invisible à l'écran.
2. **Une feuille de vingt questions ne visitait que les DIX PREMIÈRES marches.**
   `tirerQuestions` n'annonçait pas sa longueur au générateur : celui-ci
   retombait sur son compte d'avant les réglages — deux par marche — et la
   feuille était pleine avant d'arriver au PGCD. **Le titre promettait ce que la
   feuille ne contenait pas**, et cela valait pour les treize exercices à
   progression, pas seulement celui-ci.
3. **Les problèmes n'étaient pas mélangés** — six « paquets » à la file, puis
   sept « rythmes », puis sept « carrés ». L'instruction du catalogue promettait
   pourtant « ils sont MÉLANGÉS exprès ». Après deux énoncés de paquets, le
   troisième se reconnaît sans être lu : c'est exactement ce que l'exercice
   existe pour empêcher. Une marche « lequel des deux ? » tire désormais au sort
   parmi les trois, et c'est elle que l'exercice coche par défaut ; les trois
   restent cochables à part pour qui veut en faire travailler une seule.

Et un quatrième, de ma main, attrapé par une épreuve : écrit
`ETAPES.find(e => e.id === choisir([…], rng))`, **le tirage se refait à chaque
élément parcouru**. La comparaison portait sur un nom différent à chaque tour et
ne tombait presque jamais juste.

### « les fractions en colonne » et le texte trop petit — 20 octobre

> « ecris toujours les fractions en colonne, attention aux textex pour le pgdc
> qui est petit au vue de l'espace »

**Deux remarques, et la première est une règle générale** — « TOUJOURS », pas
« dans cet exercice ». Sur le papier elle était déjà tenue : le drapeau
`fractions: true` dit au rendu d'empiler, et la feuille écrit bien 24 sur 36,
trait au milieu. **À l'écran, non** : l'énoncé de la marche « fraction
irréductible » affiche « Rends la fraction 91/143 irréductible. » — barre
oblique —, pendant que la réponse juste en dessous, elle, s'empile. Le même
écran enseigne donc les deux écritures à la fois, et celle qu'on lit en premier
est la mauvaise.

**La seconde est une mesure à faire, pas une supposition.** Sur la photo de
l'écran prise pendant le travail, la question occupe une bande mince au milieu
d'un grand vide, et l'énoncé — « 96 = 2⁵ × 3 et 144 = 2⁴ × 3². » — est
nettement plus petit que la question qui le suit. Il reste de la place partout
autour. À vérifier sur les pixels, et à corriger là où le texte peut grandir
sans que la plus longue question déborde.

**Ce qui a été fait pour les deux remarques.**

**Les fractions en colonne, partout.** Mesuré sur les 238 exercices du
catalogue, **marche par marche** — et c'est ce détail qui fait la différence
entre une mesure et une illusion : douze questions tirées d'un exercice à
dix-sept marches ne montrent que les douze premières, et la fraction était à la
dix-septième. La première mesure rendait « un seul exercice coupable », et elle
avait tort. **Deux** l'étaient : « Poser un Produit de Fractions », dont
l'énoncé n'avait aucun `html` et retombait donc sur le texte nu — « 2/3 × 6/5 =
? » —, et la marche « fraction irréductible ». Les deux sont corrigés, et une
épreuve du catalogue garde désormais la règle pour tout le monde, à côté de
celle qui garde déjà la feuille imprimée. Zéro sur 238.

**Le texte trop petit — et le défaut n'était pas dans le PGCD.** Mesuré sur les
pixels : un problème était réduit **deux fois**. Une première par sa classe de
longueur (`ui/enonce.js` compte les caractères ; un problème dépasse toujours
le palier, donc `game-question--tres-long`, plafonnée à 1,4 rem). Une seconde
par les rapports de `.ap-situation` et `.ap-question`, qui reprenaient la
moitié par-dessus. Sur un écran de 1280 × 900 : **énoncé 15 px, question
19 px**, dans une colonne de 560 px dont 800 px de haut restaient vides.

La classe de longueur a déjà fait le travail ; reprendre encore la moitié,
c'est punir deux fois la même phrase. Les rapports passent à `.72em` et
`.95em` : **énoncé 22 px, question 28 px**. Et `.pp-reponse`, qui était à
`1.5rem` en dur, suit maintenant la question — l'écriture à trous était devenue
plus petite que l'énoncé juste au-dessus.

Vérifié au téléphone (390 × 844), sur le plus long problème de chaque famille :
bloc de 378 px de large dans 390, 520 px au-dessus de la ligne de flottaison,
aucun défilement latéral. « Histoires d'Argent » en profite autant que le PGCD :
les deux familles d'exercices à problème étaient logées à la même enseigne.

## 16. La progression de quatrième — 20 octobre

> « et voici mon programme de 4ème : […] »

Dix-sept blocs, relus un par un contre les **81 exercices tagués quatrième**
(sur 238). Comme pour la sixième, rien n'est codé : c'est une lecture.

**Ce qui est déjà servi, et bien.** Les priorités et les relatifs (sept
exercices de priorités, neuf de relatifs) ; les puissances, écriture
scientifique et préfixes compris, cinq exercices ; le développement simple et
double avec sa version pas à pas ; Thalès et sa rédaction ; les fonctions
(image, antécédent, programme, tableau) ; les quatre transformations —
**la rotation y est vraiment**, en quart de tour, dans « Tracer l'Image d'une
Figure » et « La Mosaïque des Transformations ».

**Et un bloc qui n'est pas un trou, contrairement à ce que la liste suggère.**
Le bloc 6, « additions et soustractions de fractions » : « Poser une Addition
de Fractions » porte déjà un réglage « L'opération » — additions, soustractions
ou les deux — et il monte des dénominateurs multiples jusqu'au PPCM. C'est lui
qui dit « d'abord des dénominateurs multiples puis après trouver le PPCM », mot
pour mot ce que Rémy avait demandé. Il n'y a qu'à le régler.

**Les trous réels :**

| Bloc | Ce qui manque |
| --- | --- |
| **5** | Le **cercle circonscrit au triangle rectangle**. Rien. |
| **7** | La **réciproque de Pythagore**. Les six niveaux de l'exercice vont de « montrer l'hypoténuse » à « rédiger en entier », et **tous sont du calcul** : « ce triangle est-il rectangle ? » n'y est pas. C'est un chapitre entier. |
| **9** | **Longitude et latitude** : rien. Les patrons et le dénombrement sur un solide existent mais s'arrêtent à la cinquième — un tag à ouvrir pour le rappel. |
| **10** | **Diviser par une fraction** : n'existe qu'en seconde. |
| **11** | La proportionnalité **autrement que par un tableau** : ni graphique, ni « est-ce proportionnel ? ». |
| **12** | Le **tracé** d'une fonction dans un repère. Et « Placer un Point » / « Lire des Coordonnées » s'arrêtent à la cinquième. |
| **13** | **Cône et pyramide** : ni la nature, ni les patrons, ni les volumes. Rien sur les volumes tout court. |
| **15** | **Tester** si un nombre est solution, et les **programmes de calcul type brevet**. « La Balance des Équations » résout, elle ne teste pas. |
| **17** | **Statistiques** — moyenne, médiane, étendue, fréquence. Rien du tout. |
| **18** | **Probabilités**. Rien du tout. |

**Et quatre trous se recoupent avec ceux de la sixième** — c'est l'information
la plus utile de cette lecture, parce qu'elle dit quoi écrire UNE fois pour
servir DEUX niveaux :

- le **cercle circonscrit** (sixième bloc 16, quatrième bloc 5) ;
- les **volumes et les solides** (le pavé en sixième, le cône et la pyramide en
  quatrième) ;
- la **proportionnalité sans tableau** — la flèche, le passage par l'unité, le
  graphique (sixième bloc 15, quatrième bloc 11) ;
- le **repérage**, qui s'arrête à la cinquième et dont la quatrième a besoin
  pour tracer une fonction.

Les deux plus gros morceaux sont les **statistiques** et les **probabilités** :
deux chapitres sans une seule ligne dans le catalogue.

### Son ordre de travail — 20 octobre

> « bloc 17-18-10-12-7-15 »

**Ce sont les blocs de QUATRIÈME**, et non de sixième : les six numéros sont un
sous-ensemble exact de la table des trous que je venais de lui donner, et ils
s'ouvrent sur 17 et 18 — les deux que j'avais nommés « les plus gros ». La
sixième attendra donc son tour ; son ordre à elle (1, 11, 18, 10, 5, 3, 8)
reste noté au §15.

| Dans l'ordre | Ce qu'il faut écrire |
| --- | --- |
| **17** | **Statistiques** — moyenne, médiane, étendue, fréquence, sur des listes. Rien n'existe. |
| **18** | **Probabilités**. Rien n'existe. |
| **10** | **Diviser par une fraction** : n'existe qu'en seconde. |
| **12** | Le **tracé** d'une fonction dans un repère — l'image et l'antécédent sont déjà là. |
| **7** | La **réciproque de Pythagore** : « ce triangle est-il rectangle ? ». |
| **15** | **Tester** si un nombre est solution, et les **programmes de calcul** type brevet. |

Livré par lots : 17 et 18 ensemble (même domaine, et ce sont les deux
chapitres entiers), puis 10 et 12, puis 7 et 15.

### Ce qui a été fait pour les blocs 17 et 18

**Deux chapitres entiers, et un module de noyau pour les porter.**
`js/core/statistiques.js` — moyenne, médiane, étendue, effectif, fréquence,
tableau d'effectifs — pur, éprouvé sous Node, et réutilisable : le tableur sait
déjà écrire `=MOYENNE(A1:A4)`, et la fiche voudra les mêmes nombres.

**Les statistiques : neuf marches, dont TROIS médianes.** Ce n'est pas un
excès. Les trois autres notions se CALCULENT ; la médiane se CHERCHE, et on la
cherche mal de deux façons — en oubliant de ranger la série (la médiane de
7 ; 2 ; 9 vaut 7, pas 2), et quand la série est paire (deux valeurs au milieu,
médiane entre les deux, absente de la série). Une marche par piège, pour que le
bilan nomme celui qui coince.

**Les probabilités : sept marches, et une décision qui commande tout le
fichier.** La probabilité d'obtenir un nombre pair avec un dé vaut 3/6, et vaut
aussi 1/2. Les deux sont justes, un professeur accepte les deux, et un logiciel
doit en choisir UN — quel que soit son choix, la moitié des élèves qui ont
raison seraient comptés faux. **On fabrique donc les situations pour que la
fraction soit DÉJÀ irréductible.** Le prix est assumé et écrit : l'élève ne
rencontre pas ici le moment où l'on simplifie une probabilité ; ce moment
appartient au chapitre des fractions, et il y a ses exercices.

**Quatre séries de défauts, tous trouvés en LISANT la sortie ou en REGARDANT
le PDF :**

1. **Les accords et les élisions.** « Combien de élèves », « 10 zones TOUS DE
   MÊME TAILLE », « c'est tirer l'boule jaune », « Élèves : ils sont 5 » devant
   des joueuses.
2. **Une note de 26 sur 20.** La série se construit à partir de sa moyenne — on
   part de la réponse pour qu'elle tombe juste — et le DERNIER écart rattrapait
   toute la somme : six écarts dans [−4 ; 4] peuvent faire −14. Tous les
   calculs étaient justes, et la série était impossible. La somme courante est
   maintenant bornée à chaque tirage, ce qui tient toutes les valeurs dans
   l'écart demandé, la dernière comprise. **Attrapé par une épreuve écrite pour
   autre chose.**
3. **« Laquelle de ces valeurs ne peut PAS être une probabilité ? » — et aucune
   valeur sur la feuille**, trois fois sur la même page. Exactement le défaut
   de « Lequel de ces nombres divise 50 ? », deux heures plus tôt.
4. **« … 171 ; 159 ; 165 Quelle est l'étendue ? »** — la série collée à la
   question. Exactement le défaut de « … = 2⁴ × 3 Quel est le PGCD », le matin.

Les deux derniers se répétaient : ils ont donc **deux gardes du catalogue**, qui
valent pour les 240 exercices. Et comme aucune garde ne fermera le prochain
défaut de papier qu'on n'a pas encore rencontré, `tools/nouvelExercice.mjs`
rappelle désormais, à l'endroit et au moment où l'on ajoute un exercice, le
seul geste qui le fermerait : imprimer la fiche et la regarder.

### Les quatre critères — 20 octobre

> « Oui fais tout il faut que ce soit simple beau progressif et qu on puisse
> imprimer »

Quatre mots, et ce sont des conditions de recette, pas des souhaits. Ils valent
pour les quatre blocs qui restent — 10, 12, 7, 15 — et pour ce qui viendra
après.

- **SIMPLE** : une question pose UNE chose. Si deux difficultés arrivent
  ensemble, elles font deux marches.
- **BEAU** : l'énoncé respire, la fraction s'empile, les accords tiennent. Le
  texte est à la taille de la place disponible — c'est la remarque de ce matin,
  et elle reste vraie pour tout ce qu'on ajoute.
- **PROGRESSIF** : un petit bain, et il est EN TÊTE. C'est la leçon du PGCD :
  « bien trop difficile » venait d'une progression qui commençait par la fin.
  Un parcours court doit jouer les marches faciles sans qu'on règle rien.
- **QU'ON PUISSE IMPRIMER** : il le dit juste après que je lui ai signalé
  quatre défauts de papier dans la même journée. **Ce n'est donc pas une
  option : une question qui ne se répond pas sur la feuille est une question
  cassée.** Les deux gardes du catalogue le tiennent pour les cas connus ; pour
  les autres, on imprime et on REGARDE, à chaque exercice neuf.

### Ce qui a été fait pour les blocs 10 et 7

**Diviser par une fraction** (`frac-division`, code dicté `FD`) — sept marches,
et **les trois premières ne divisent pas une seule fois**. Diviser demande deux
gestes, retourner puis multiplier, et l'élève qui se trompe rate presque
toujours le premier : il retourne la mauvaise fraction, ou les deux. Le temps A
ne fait donc que retourner. « L'inverse d'un entier » y a sa marche : on sait
retourner 3/5 et l'on bloque devant 4, faute de voir la fraction — il faut
d'abord lire 4 comme 4/1, et c'est une idée, pas une technique.

**La réciproque de Pythagore** (`geo-pythagore-reciproque`, code dicté `VS`) —
six marches, et **la première ne calcule rien**. Les six niveaux de l'exercice
voisin sont tous du calcul : « ce triangle est-il rectangle ? » n'y était nulle
part. La marche d'ouverture repère le PLUS LONG côté, sans rien calculer, parce
que c'est là que tout se joue — celui qui prend les côtés dans l'ordre de
l'énoncé compare n'importe quoi et conclut faux sans qu'aucun de ses calculs
soit faux.

**Six défauts trouvés en lisant la sortie ou en regardant le PDF :**

1. « vérifier que **une** dalle », « Une jardinière […] **Il** mesure »,
   « Cette dalle est-**il** bien rectangulaire ? » — deux genres dans la même
   phrase, celui de la personne et celui de l'objet, et je les avais confondus.
2. « la longueur : **80** cm, la largeur : **150** cm » — les triplets sont
   écrits dans l'ordre croissant, et rien ne disait que le premier fût la
   longueur.
3. Un **point médian** entre deux carrés, qui sur un écran de mathématiques se
   lit comme une multiplication. Troisième fois dans la journée.
4. « 6 ÷ 3/4 = 8 **parts** » sous un énoncé qui parlait de **sachets**.
5. **L'énoncé écrit DEUX FOIS sur la feuille.** La feuille compose son texte
   comme « énoncé + question » ; un générateur qui écrit un champ `papier`
   contenant déjà l'énoncé se le voit ajouter une seconde fois. Invisible à
   l'écran, qui lit les deux champs séparément.
6. « des bouteilles de **2/3** de litre » — une fraction à la barre oblique
   dans un énoncé, donc contre la règle de Rémy. **Attrapée par la garde du
   catalogue écrite ce matin**, et non par moi.

Le cinquième se reproduira, parce qu'il est dans la forme même des générateurs.
Il a donc sa garde : « un énoncé de papier ne se répète pas ». Trois gardes du
catalogue en tout, maintenant, pour les trois façons dont une feuille peut
mentir.

### « les deux » — l'écran place, et la feuille trace — 20 octobre

> « oui fais le reste, les deux pour ta question »

La question portait sur le bloc 12 et sur la LIGNE ROUGE : l'écran a-t-il le
droit de faire PLACER un point dans un repère, ou le tracé doit-il rester sur
la feuille ? Sa réponse est **les deux**, et elle se tient :

- **à l'écran**, l'élève lit une courbe et place un point. Ce n'est pas de la
  construction géométrique — il n'y a ni règle ni compas, et « Placer un
  Point » fait déjà ce geste depuis la sixième ;
- **sur la feuille**, le repère est imprimé avec son quadrillage, et l'élève
  trace à la main. **C'est là que le geste reste entier**, et c'est pour cela
  que la feuille n'est pas une consolation : elle est l'autre moitié.

« Le reste » veut dire : les blocs 15 et 12 de quatrième, PUIS la progression
de sixième — 1, 11, 18, 10, 5, 3, 8 — qui attend depuis ce matin.

### Ce que « les deux » a donné — 20 octobre

Deux exercices là où j'en attendais un, et ils ne se recouvrent pas :

- **à l'écran**, « Tracer une Fonction » pose SIX marches et un seul geste —
  cliquer un nœud du repère. Ce qui monte est le chemin : on calcule une image,
  puis on LIT ce que l'écriture montre sur le dessin (le nombre tout seul est
  l'endroit où la droite coupe l'axe vertical ; le nombre devant le x est un
  PAS), puis on REMONTE de l'ordonnée vers l'abscisse ;
- **sur la feuille**, le repère est imprimé avec son quadrillage, le tableau de
  valeurs est vide, et l'élève TIRE LA DROITE À LA RÈGLE. Le logiciel n'en
  trace aucune.

### Ce que la sixième a montré, en l'ouvrant — 20 octobre

La table des trous du §15 annonçait, pour les blocs 11, 18 et 10, « un tag à
ouvrir » et « un réglage ». **Deux de ces trois estimations étaient fausses**,
et il a fallu lire le code pour s'en apercevoir :

- **bloc 11, les angles — l'estimation tenait**, mais pas pour la raison
  écrite. Les deux exercices tirent SIX relations, mesuré sur quarante
  tirages, et deux d'entre elles — correspondants, alternes-internes —
  demandent deux parallèles et une sécante, qui arrivent en cinquième. Le tag
  seul aurait servi de la cinquième à des sixièmes. Ce qui sauve, c'est que le
  réglage « Les relations travaillées » existe depuis le premier jour : on
  ouvre le tag ET l'instruction dit lesquelles décocher. Et « les angles
  opposés par le sommet » ne manquaient pas — ils sont là depuis le début ;
  c'est ma lecture d'hier qui était fausse.
- **bloc 18, la fraction par un entier — ce n'était PAS un réglage.** Les
  leurres, les indices et le corrigé supposent tous deux fractions :
  « multiplier en croix » n'a aucun sens face à un entier, tandis que
  « multiplier aussi le dénominateur » est L'erreur du chapitre et n'existe
  pas entre deux fractions. Le cas de sixième a donc son chemin à lui.
- **bloc 10, la fraction sur une droite graduée — ce n'est pas un réglage non
  plus.** L'axe écrit ses graduations en décimaux ; les écrire en fractions
  demande de les EMPILER, à l'écran comme sur la feuille imprimée. C'est un lot
  à lui seul, et il reste à faire.

Et **le repérage va désormais jusqu'à la quatrième** — « Placer un Point »,
« Lire des Coordonnées » et « Coordonnées Négatives » s'arrêtaient à la
cinquième. Ce n'est pas un rappel : on ne trace pas une fonction dans un repère
qu'on ne sait pas lire.

**Un défaut trouvé par ricochet, et il touchait trois exercices déjà en ligne.**
À l'écran : « On donne f(x) = 2x − 2. On part du point (0 ; -2)… » Deux signes
moins différents dans la même phrase — le vrai, et le trait d'union. En
mesurant le dépôt entier : QUATRE exercices sur 244, dont « Réduire une
expression » et les deux « Calculer avec des puissances ». Les trois anciens
avaient la même cause : le fichier possédait DÉJÀ sa fonction d'écriture,
employée pour la démonstration et oubliée dans l'explication juste à côté. La
règle vit maintenant dans `js/core/signeMoins.js`, et une garde du catalogue
la tient pour tout le dépôt.
