# La notation du cercle — 10 octobre 2026

Écrites ici **avant** d'être traitées. Un message, trois points.

> « pour le vocabulaire du cerclke, tu acceptes comme rayon og comme réponse
> alors qu'il faudrait taper [OG], par contre c'est galère au clavier, permet
> d'avoir des touches de crochet ou parenthèses et en majuscule. Précise leur
> erreur si ils se trompent, est ce clair »

C'est clair, et les trois points se tiennent : on ne peut exiger la notation
qu'à condition de la rendre tapable, et de dire ce qui manque quand elle ne
l'est pas.

---

## 1. « og » valait « [OG] », et ne devrait pas

`memeNotation` ne comparait que **les lettres** — crochets, parenthèses et
espaces retirés avant comparaison. Un commentaire assumait ce choix :

> « les crochets, les parenthèses, le mot "arc" et les espaces ne disent rien de
> plus que ce que la figure montre déjà, et refuser "OA" tapé sans crochets sur
> un clavier de téléphone n'enseignerait rien sur le cercle. »

**Rémy tranche l'inverse, et il a raison** : la notation EST au programme, et
elle porte du sens que les lettres seules ne portent pas.

| | ce que ça désigne |
| --- | --- |
| `[OG]` | le **segment** d'extrémités O et G |
| `(OG)` | la **droite** qui passe par O et par G, infinie des deux côtés |
| `OG` | la **longueur**, un nombre |

Un rayon est un segment. Répondre « OG » à « lequel est un rayon ? », c'est
répondre par une longueur à une question qui demande un tracé. Le logiciel
l'acceptait.

## 2. « c'est galère au clavier »

Et c'est pour cela que le premier choix avait été fait. Sur un téléphone,
`[OG]` demande : passer au clavier des symboles, trouver `[` (souvent en
deuxième page), revenir aux lettres, bloquer les majuscules, taper, repasser aux
symboles, trouver `]`. Sept gestes pour quatre signes.

**Donc on ne peut pas exiger la notation sans donner les touches.** Les deux
points sont un seul travail.

## 3. « Précise leur erreur si ils se trompent »

Un élève qui écrit `OG` devant un rayon **a trouvé le bon tracé**. Lui répondre
« faux » lui apprend qu'il s'est trompé de trait, ce qui est faux. Ce qui lui
manque, c'est une paire de crochets — et c'est cela qu'il faut lui dire.

---

# Ce qui a été fait, et comment

## La règle : les lettres ET la ponctuation

`jugerNotation(donne, attendu)` remplace `memeNotation` dans l'activité et rend
un verdict en trois états, là où un booléen ne pouvait pas distinguer « mauvais
tracé » de « bon tracé mal écrit » :

| verdict | ce que c'est | ce que fait l'écran |
| --- | --- | --- |
| `juste` | les bonnes lettres, la bonne ponctuation | la réponse est validée |
| `notation` | les bonnes lettres, la mauvaise ponctuation | on dit ce qui manque, **sans compter d'essai** |
| `faux` | d'autres lettres, ou pas de lettres | réponse fausse, comme avant |

**Pourquoi `notation` ne coûte pas d'essai** : l'élève a lu la figure, c'est
l'écriture qui lui manque. Un professeur au bureau de l'élève dit « il manque
les crochets » et le laisse corriger ; il ne compte pas une faute. Et c'est la
seule façon dont la phrase enseigne quelque chose : « faux » après trois essais
donne la réponse sans jamais nommer la règle.

Les phrases rendues sont celles du cours, et chacune dit la différence. Ce sont
celles que la sonde a relevées à l'écran, mot pour mot :

- `oc` pour un rayon → « Il manque les crochets : OC tout seul désigne une
  LONGUEUR, un nombre. Le tracé, lui, s'écrit [OC]. »
- `(OC)` pour un rayon → « Les parenthèses désignent la DROITE (OC), qui
  continue au-delà de O et de C. Ce tracé-ci s'arrête : c'est un segment, et
  cela s'écrit [OC]. »
- `[AB]` pour une tangente → « Les crochets désignent le SEGMENT [AB], qui
  s'arrête en A et en B. Ce tracé-ci continue de part et d'autre : il s'écrit
  (AB). »
- `AB` pour un arc → « Les deux lettres toutes seules désignent une LONGUEUR.
  L'arc se nomme avec le mot : écris "arc AB". »
- `[OG` → « Une notation s'ouvre ET se ferme, avec les deux signes de la même
  paire : c'est [OG]. »
- un mot → « On ne demande pas le NOM du tracé mais sa NOTATION : les lettres de
  ses extrémités, avec ce qui les entoure. »

Et une bonne réponse ne dit **rien** : un commentaire sous une réponse juste se
lit comme un reproche.

## Les touches

**Deux touches, et elles ENTOURENT** — `[ ]` et `( )`, sous le champ, 94 × 52
pixels chacune sur un téléphone de 390. Une touche qui écrirait son signe à la
suite donnerait « OG[ » : le crochet ouvrant va devant. Chacune pose donc sa
paire autour de ce qui est écrit, et retire d'abord la paire extérieure quelle
qu'elle soit — tapé `(OG)` par erreur, un appui sur `[ ]` donne `[OG]` et non
`[(OG)]`. Champ vide, le curseur se met **entre** les deux signes : on peut
ouvrir d'abord et taper ensuite.

**Les deux paires sont là en même temps**, quelle que soit la réponse attendue :
n'afficher que `[ ]` devant un rayon dirait que la réponse est un segment,
c'est-à-dire la moitié de la question quand la figure porte aussi une tangente.

Et le champ **passe en majuscules à la frappe** — « og » s'affiche « OG ».
L'attribut `autocapitalize` ne suffisait pas : c'est un conseil au clavier
logiciel, que les claviers de poste fixe ignorent. Seulement ce champ-là : celui
où l'on écrit un MOT garde ses minuscules, parce que « UN RAYON » n'est pas la
façon dont on écrit un mot français.

La consigne de l'exercice dit désormais la règle avant de l'exiger : « [AB] est
le SEGMENT qui joint A et B, (AB) est la DROITE qui passe par A et par B et ne
s'arrête jamais, et AB tout seul est une LONGUEUR ».

**Gardé par** : `tests/cercleVocabulaire.test.mjs` (la règle et les phrases),
`tools/notationDuCercle.mjs` (les touches et les majuscules, dans un vrai
navigateur).

---

## 4. Et ce que la mesure a montré au passage : deux lettres l'une sur l'autre

Rémy n'a pas signalé celui-là. Il est sur la capture que la sonde a prise pour
vérifier les touches : **« B » posé sur « D »**, dans une figure de tangente et
de sécante.

La règle de lisibilité existait — vingt degrés d'écart entre deux points —,
mais elle ne regardait que les points **du cercle**. Or le second point d'une
tangente n'est pas sur le cercle : il est posé sur la droite, hors du disque,
pour qu'on puisse écrire `(AB)`. Il n'existait pas pour la règle.

**Et ce défaut vient de devenir plus cher.** Tant que la réponse était « og »,
deux lettres superposées rendaient la figure moins jolie. Maintenant que la
notation est exigée, elles rendent la réponse **impossible à écrire**. Les deux
points sont le même travail.

La règle mesure désormais **là où les lettres sont réellement posées**, en
demandant la figure à `tracesDe` — le seul endroit qui sache où chacune
atterrit, et qui comprendra d'office la prochaine famille de tracé.

Et le tirage **garde le meilleur essai, plus le dernier** : quarante tirages ne
suffisent pas toujours quand neuf lettres se partagent un cercle de rayon 32, et
l'on rendait alors le quarantième, choisi pour rien.

Mesuré sur 2 400 figures, avant et après :

| | figures sous 11 unités | écart le plus faible rencontré |
| --- | --- | --- |
| avant | 290 | **1,3** — deux lettres l'une sur l'autre |
| après | 8 | 9,9 — lisibles, un peu serrées |

Une lettre fait 6,5 unités de haut.

**Gardé par** : `tests/cercleVocabulaire.test.mjs`, épreuve « DEUX LETTRES NE SE
POSENT JAMAIS L'UNE SUR L'AUTRE » — qui a dû être réécrite : sa première
version appelait la fonction même que le générateur emploie pour décider, et
`epreuveTombe` l'a vue rester verte avec le défaut d'origine remis.
