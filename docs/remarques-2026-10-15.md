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
