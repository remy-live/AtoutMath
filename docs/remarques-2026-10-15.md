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
