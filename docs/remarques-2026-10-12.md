# La revue du poly — 12 octobre 2026

Écrites ici **avant** d'être traitées. Un message, douze points, **tous sur la
version imprimée** : « depuis tout à l'heure je te parle pour la version
imprimée ».

---

## 1. La police des priorités ligne par ligne

> « la police de caractère pour le priorité ligne par ligne est bizarre,
> pourquoi en gras comme cela. »

Sur sa capture (exercices 235 à 240) : « 8 × 7 × 3 », « 3 + 8 × 6 »… tout
l'énoncé est en **gras**, alors que les autres exercices de la même feuille
sont en romain.

## 2. Idem pour « prio bot relatifs »

> « idem pour prio bot relatifs »

## 3. Idem pour le moins devant la parenthèse

> « idem pour le - devant la parenthèses »

Exercice 41 sur sa capture : « −(−4 + 7 × 2) », en gras lui aussi.

**Les trois sont probablement la même cause, au même endroit.**

## 4. Six calculs pour quatre colonnes

> « pour les poser une multiplication ou addition, tu as souvent 6 calculs pour
> 4 colonnes […] Du coup ça fait une ligne à 4 calculs et une ligne à deux
> calculs. C'est idiot car déséquilibré. Pour les endroits où tu mets 4 calculs
> par ligne, mets juste 4 questions plutôt que 6. »

La règle qu'il donne est générale : **le nombre de questions par défaut doit
être un multiple du nombre de colonnes.**

## 5. Poser une division : le numéro collé au dividende

> « le numéro de la question est collé au dividende »

Sur sa capture : « 277**8 2** » — on lit « 2778 » au lieu de « 277. » puis le
dividende « 8 2 ».

## 6. Le Memory des Tables

> « pour le mémory, débrouille-toi pour avoir le même nombre par ligne et
> enlève la page 2 qui porte le dos, car ce n'est pas le cas. »

Deux choses : les cartes sont 4 + 2 sur sa capture, et la consigne annonce
« La page 2 porte les DOS » — **page qui n'existe pas**. Une consigne qui
renvoie à une page absente est pire qu'une consigne manquante.

## 7. Le Slitherlink, même défaut que le 4

> « pour le slitherlink aussi, il y a 6 et 4 colonnes par défaut »

## 8. L'enquête : deux colonnes par défaut

> « pour l'enquête mets deux colonnes par défaut »

## 9. Les dominos : un seul exercice par défaut

> « pour les dominos ne mets qu'un exercice par défaut »

## 10. La mosaïque des transformations

> « pour mosaïque des transformations, les points ne sont toujours pas des
> croix, je ne vois pas la couleur quand je mets le poly en couleur »

**« toujours pas »** : c'est un retour sur une correction précédente. Les deux
règles existent pourtant ailleurs — « un point est représenté par une croix »
et « le filtre DÉSATURE ce que le rendu a posé, il n'invente pas une couleur ».

## 11. Les champs remplissables — et il faut TOUT vérifier

> « as-tu prévu des champs remplissables pour tous les exercices (par exemple
> pour les additions posées, ça manque) »
> « et pour les QCM, il faut que le champ remplissable soit une checkbox »
> « pour le vocabulaire du cercle, par exemple, tu n'as pas mis de champs
> remplissables, du coup il faut que tu vérifies les exercices »

Trois demandes en une, et la troisième est la plus importante : **ce n'est pas
une correction ponctuelle, c'est un BALAYAGE**. Il faut une mesure qui dise,
pour chaque exercice du catalogue, s'il porte des champs remplissables et de
quelle sorte — sinon on corrigera trois exercices et il en restera trente.

## 12. « Symétrique par rapport à quoi » : la taille de la police

> « Comme symétrique par rapport à quoi . Essaie de garder une cohérence de
> taille de police »

---

# Ce qui a été fait, et comment

Tout ce qui suit a été **regardé sur le PDF**, pas déduit du code :
`node tools/polyDu12Octobre.mjs` tire les feuilles par le chemin de Rémy — un
poly de parcours —, les rend en images dans `tools/tmp/poly-12/`, et compte
dans le fichier ce qui ne se voit pas à l'œil (les champs remplissables).

## 1, 2, 3 — la police des priorités : une seule ligne pour les trois

Les trois exercices passent par le rendu `priorites`. L'énoncé s'écrivait en
**gras**, ce qui lui donnait l'allure d'un titre au milieu d'une feuille en
romain — et volait le seul signe qui, partout ailleurs sur la feuille, veut
dire « voici la réponse » (« LE GRAS SUFFIT », dit `ficheRendu`). L'expression
passe en romain, le gras reste aux lignes du corrigé.

→ `tools/tmp/poly-12/calc-prio-cascade.png`

## 4 et 7 — le dernier rang à moitié vide

Le **six n'était pas son choix, c'était notre plafond** : `Math.min(6, n)` dans
`printParcours`. On ramène ce plafond au multiple du nombre par ligne, sans
jamais descendre sous une rangée pleine, et sans toucher à ce qui tient déjà
en moins d'une rangée.

Mesuré en remettant le défaut : la première écriture de cette correction
**ne faisait rien** pour l'exercice qu'il cite. Elle lisait
`Number(colonnes[stepId])`, qui vaut `'auto'` — donc `NaN` — pour presque tous
les exercices. C'est `parLigneDefaut`, posé par le rendu, qui dit combien il
en met par rangée.

Après : quatre multiplications sur une rangée, quatre slitherlinks sur une
rangée. → `tools/tmp/poly-12/poly-rangees.png`

## 5 — le numéro collé au dividende

La gouttière du numéro se calcule maintenant sur la LARGEUR du numéro
(`gouttiereDuNumero`), pas sur une valeur fixe : « 277. » est plus large que
« 7. », et c'est à trois chiffres que les deux se touchaient.

## 6 — le memory

Huit paires, deux rangées pleines de quatre (`parDefaut: 8`). Et la consigne ne
promet plus une page 2 : les dos sont la page de SOLUTIONS du rendu, qui ne
s'imprime que si on la demande. → `tools/tmp/poly-12/poly-jeux-p1.png`

## 8 et 9 — l'enquête et les dominos

Deux colonnes pour l'enquête (`colonnesPapier: 2`), un seul jeu de dominos par
feuille (`unique: true`). → `poly-jeux-p2.png` et `poly-jeux-p3.png`

## 10 — la mosaïque

**Les croix.** Le défaut n'était pas dans le tracé : les croix étaient bien
dessinées. La pastille blanche posée sous la lettre, pour qu'elle ne soit pas
barrée par le quadrillage, arrivait APRÈS et en effaçait la moitié haute — ce
qui s'imprimait était un accent circonflexe. Donc : la pastille d'abord, la
lettre ensuite, la croix en dernier, et la lettre remonte d'une demi-branche.
La croix prend aussi la moitié d'un carreau au lieu de 1,6 mm fixes.

**La couleur.** Mesurée, elle marche — et ce point-là mérite une réponse
franche plutôt qu'une correction. Un poly réglé sur « Couleur — l'imprimante »
sort la mosaïque en couleur : 21 aplats vraiment colorés dans le PDF, 3 456
teintes dans l'aperçu à l'écran. Si tu ne la voyais pas, c'est la version
chargée par ton navigateur : la couleur des pavages et des mosaïques est
arrivée le 9 octobre. → `tools/tmp/poly-12/poly-mosaique-couleur.png`

## 11 — les champs remplissables : le balayage, pas trois corrections

`node tools/champsRemplissables.mjs` donne la liste, rendu par rendu. Au
départ : **25 exercices sur 89** posaient des champs. Maintenant **29**, et les
trois que tu cites en font partie :

- les opérations posées (16 champs) ;
- le vocabulaire du cercle (3) ;
- **les QCM portent de vraies cases à cocher** (`AcroFormCheckBox`), nommées
  par le rang de la question — donc exclusives entre elles, comme un QCM doit
  l'être. Et la ligne de saisie qui les suivait a disparu : l'élève avait deux
  endroits où répondre, et deux réponses qui pouvaient se contredire.
- plus la mosaïque et les priorités, ajoutées au passage.

Mesuré sur un vrai poly : **106 champs de saisie et 16 cases à cocher**.

**Les 60 qui n'en posent toujours pas** ne sont pas tous des oublis : on ne
remplit pas un memory qu'on découpe, un labyrinthe, un échiquier, une figure à
tracer. La liste complète sort en deux secondes avec
`node tools/champsRemplissables.mjs --muets` — **dis-moi lesquels comptent** et
ils partiront au prochain lot. Ceux qui me semblent les plus évidents : la
pyramide des nombres, le tableau de conversion, « Lire des coordonnées »,
« Segment, droite ou demi-droite ? », et « Symétrique par rapport à quoi ? ».

## 12 — la cohérence de taille de police

La lettre d'une pièce de pavage suivait le pas du quadrillage (`pas × 0,6`) :
mesurée sur quatre blocs d'un poly à trois colonnes, elle allait de 1,71 à
3,40 mm quand le texte des questions fait 1,94 mm **partout**. Elle est
maintenant bornée entre la taille du texte et une fois et demie celle-ci.

## Ce que la mesure a trouvé et que personne n'avait signalé

Une feuille de **multiplications** posées expliquait à l'élève, en tête de
l'exercice, qu'« une division se fait par étapes : on abaisse un chiffre, on
cherche combien de fois le diviseur tient dedans ». Trois lignes hors sujet, à
l'endroit exact qu'il lit avant de commencer. La phrase ne sort plus que s'il y
a une division sur la feuille.

## Ce qui reste ouvert

- **Une grille imprimée toute seule ne peut pas être remplissable** : la case
  « Champs remplissables » existe dans le panneau des questions (`#fq-champs`)
  et dans celui du poly (`#pp-champs`), jamais dans celui d'une grille isolée.
  Tu imprimes des polys, donc ce n'est pas urgent — mais c'est un trou.
- **Le pavage** (« Symétrique par rapport à quoi ? ») écrit ses pointillés en
  TEXTE, pas en trait : y poser un champ demande de mesurer la largeur de la
  question. Pas fait aujourd'hui.
