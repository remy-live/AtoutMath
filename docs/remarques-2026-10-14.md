# Le plein écran d'une séance imposée — 14 octobre 2026

> « est ce que lorsque j'impose une séance, et que l'élève découvre la carte du
> monde je peux forcer le plein écran ? »

## La réponse : non, et ce n'est pas le logiciel qui refuse

`requestFullscreen()` n'est accordé qu'à la **suite d'un geste** de l'élève. Une
demande déclenchée par l'apparition de la carte, sans qu'il ait rien touché, est
rejetée et n'écrit qu'une erreur dans la console. C'est une règle du web, et
`js/ui/fullscreen.js` la portait déjà écrite à deux endroits :

> « un navigateur n'accorde le plein écran qu'à la suite d'un geste, et une
> tentative sans geste est une erreur dans la console »

Et sur **iPhone/iPad, il n'y en a pas du tout** : Safari ne le donne qu'aux
vidéos. Même avec un geste.

## Ce qui marche : le premier appui

Son premier appui EST un geste — celui par lequel il ouvre sa séance. On s'y
accroche, et il y reste tout le temps qu'elle dure.

Rémy : **« oui si la séance est imposée et laisse le bouton »**, puis, quelques
minutes plus tard : **« après peut être vaut il mieux le mettre en paramètre »**.

**Il avait raison, et ma première écriture était pire** : le plein écran partait
dès qu'une séance était imposée, sans qu'il puisse dire non. Or cela dépend de la
salle — une 6e sur les postes de la salle informatique, oui ; une 3e sur ses
propres téléphones, c'est à lui de voir.

## Ce qui a été fait

Une **case à cocher à côté de « mettre en cours »** : « Plein écran chez les
élèves ». Elle traverse trois couches, et chacune a sa garde :

| | |
| --- | --- |
| `classes.impose_plein_ecran` | une colonne, **à côté de la séance imposée** et non dans le parcours : un parcours donné par code se fait aussi le soir à la maison, et personne n'a demandé le plein écran chez l'élève. C'est une décision de **conduite de classe**, comme le verrou et le compte à rebours qui l'entourent. |
| l'action `imposer` | prend `pleinEcran`, le range, et **l'éteint quand on lève l'imposition** — un drapeau qui lui survivrait reviendrait tout seul la semaine suivante sur une séance qui ne l'a pas demandé. |
| `pleinEcranSiSeanceImposee` | une seule fonction décide, dans `ui/fullscreen.js`, et les deux appelants ne font que lui passer ce qu'ils ouvrent. |

**Cinq conditions, et chacune ferme un défaut** : la case cochée ; une séance
imposée ; **que ce soit ELLE qu'on ouvre** (l'élève peut avoir une séance imposée
et taper un code dicté pour autre chose) ; que le navigateur le donne pour de
vrai ; et qu'on ne le rappelle pas s'il en est sorti.

**Et le bouton reste** — Rémy : « laisse le bouton ». Un élève projeté en plein
écran sans l'avoir demandé ne devine pas Échap.

### Sur iPad, on se tait complètement

Quand le plein écran natif n'existe pas, `basculerPleinEcran` répond par un
conseil : « Partager → Sur l'écran d'accueil ». Le conseil est juste, mais il
serait adressé **à un élève de sixième**, qui n'installe rien sur la tablette de
la salle. On ne fait donc rien du tout. Le bouton, lui, continue de le donner à
Rémy quand c'est LUI qui appuie.

## Mesuré, de bout en bout

`node tools/pleinEcranImpose.mjs` monte un serveur, une base neuve, un professeur
qui impose sa séance avec la case cochée, et un élève **sur un autre poste** qui
appuie sur « Jouer » :

```
case cochée    → body.plein-ecran: true · document.fullscreenElement: ACCORDÉ
case décochée  → rien ne bouge
boutons de sortie présents : 2
fenêtres natives et erreurs de page : 0
```

**Pourquoi une sonde et pas seulement une épreuve de source** : le risque de
cette correction est un échec SILENCIEUX. La fonction compare l'identité du
parcours ouvert à celle du parcours imposé ; si les deux ne coïncident jamais,
elle rend `false`, rien ne rougit, et le plein écran ne part tout simplement
jamais. Une lecture de source aurait vu un appel bien placé qui ne fait rien.

### Trois choses trouvées en chemin

- **Mes sélecteurs de carte étaient inventés.** La sonde cherchait `.path-step`
  et `.path-pastille` : elle a répondu « rien à toucher », c'est-à-dire la même
  chose qu'un logiciel cassé. Le vrai crochet est `.world-map-play`, lu dans
  `ui/pathView.js`. C'est la leçon de `doitExister`, payée une fois de plus.

- **La garde des crochets ne regardait que les `<button>`.** Ma case à cocher
  n'était donc pas couverte — et une case à cocher échoue exactement de la même
  façon silencieuse. Élargie aux `<input>`, et `epreuveTombe` a refusé de croire
  ma première écriture : le motif exigeait une espace après le crochet, alors que
  la ligne du gabarit porte `data-ecran-seance${…}`. Le `$` n'est pas une espace.

- **Une épreuve verte depuis toujours ne gardait rien.** « L'écran du professeur
  le dit comme l'élève le vit » interrogeait `/teacher/class` avec une action
  `list` que cette route ne connaît pas : elle recevait 400, lisait
  `['classe']['impose_path_id'] ?? null`, obtenait `null` — et attendait `null`.
  Elle est verte en toutes circonstances depuis le jour où elle a été écrite.
  Trouvée en écrivant la même ligne pour le plein écran, qui attendait `true` et
  ne l'a jamais reçu : **c'est l'attente d'une valeur NON NULLE qui a révélé les
  deux.** Et `??` ne sait pas distinguer « clef absente » de « clef nulle », ce
  qui est précisément ce qui rendait l'épreuve creuse — mon premier détecteur y
  est tombé à son tour avant de passer à `array_key_exists`.

---

# « La même chose qu'à la question d'avant » — le premier des trois gestes

> RÉMY, hier : « donc je dois faire quoi une séance et attendre ? »

**Non, et c'était ma faute.** Deux choses à corriger dans ce que je lui avais
dit :

1. **Ses quatre séances sont déjà dans la base.** L'outil de comptage relit ce
   que le logiciel garde depuis le premier jour. Mais il y a une urgence que
   j'ignorais en lui répondant : `retention_days` vaut **30 jours** par défaut,
   et la purge tourne **toute seule à chaque ouverture de l'administration**.
   Ses séances du 8 au 13 octobre sont là ; dans un mois elles n'y seront plus.

2. **J'avais tort de tout suspendre à sa réponse.** Sur les trois gestes, un
   seul dépend d'un nombre qu'il doit choisir :

| geste | dépend d'un seuil ? |
| --- | --- |
| **nommer la répétition** | **non** — « deux fois » n'a pas de seuil |
| écrire le silence | le seuil honnête est *relatif* (la classe sur la même question), donc il se calcule |
| l'indice gratuit | **oui** — « deux échecs ou trois » est son arbitrage |

Le premier est donc fait.

## Le socle : une mémoire courte de la séance

`js/core/memoireCourte.js`. Le logiciel **n'avait aucune mémoire entre deux
questions** — lu dans le code, pas supposé. Un élève pouvait faire six fois la
même erreur et recevoir six fois la même phrase neutre, celle d'une machine qui
ne s'aperçoit de rien.

Trois choix qui ne se devinent pas :

- **elle se souvient des QUESTIONS, pas des tentatives.** Un élève qui se
  reprend au deuxième essai n'a buté qu'une fois ;
- **elle compte comme compte l'outil de mesure**, et ce n'est pas un détail de
  style : `api/lib/blocages.php` compte les suites d'échecs que Rémy va lire pour
  choisir le seuil. **Si les deux comptaient différemment, la mesure ne
  prédirait pas le comportement** et le seuil choisi dessus serait faux ;
- **elle est courte** : la queue, pas la séance. « Est-ce que ça vient de se
  produire », jamais « combien depuis septembre » — cela, c'est le carnet
  d'erreurs, qui existe déjà.

### L'accord entre deux langages, gardé par un seul jeu d'essais

Deux fichiers, deux langages, deux chemins, et **rien pour les tenir d'accord** :
ni compilateur, ni types, ni relecture. `tests/fixtures/suitesDEchecs.json` est
la seule vérité des deux ; `tests/memoireCourte.test.mjs` et
`php tools/testApi.php` le lisent tous les deux, et chacun vérifie ses neuf cas.
Le défaut qu'il ferme ne se manifesterait nulle part : deux pages vertes, deux
comptages honnêtes, et une décision prise sur le mauvais chiffre.

## Ce que l'élève entend

La carte de retour est celle de toujours, avec **une phrase de plus devant** :

> Ce n'est pas ça — **C'est la même chose qu'à la question d'avant.** Tu as
> soustrait au lieu d'additionner.

**On nomme, puis on redit la règle**, et l'ordre est le bon : la remarque situe,
la règle enseigne. Nommer sans réexpliquer ne serait qu'un reproche.

Rien d'autre ne change — pas de fenêtre, pas de son, pas de clignotement. Rémy :
« lancer une popup à chaque fois c'est l'enfer […] il faudra que ça apparaisse,
que ce soit discret, et que ça ne casse pas la mise en page. »

### Et elle se tait en interrogation

Le dépôt avait déjà tranché cela, et la phrase était dans `itemSession.js` à
quinze lignes de ma correction : en régime « reponse », « l'élève ne repart pas
avec son erreur, mais **on ne lui fait pas cours pendant qu'on le mesure** ».
Nommer la répétition EST faire cours. Le régime « robot » — le devoir formatif
qu'il décrit — la garde, lui : il enseigne exprès.

## Mesuré au navigateur, sur le chemin de l'élève

`node tools/laMemeBetise.mjs`, sur « Additions Mystères » (son distracteur
« Tu as soustrait au lieu d'additionner » porte une phrase **constante**, ce
qu'aucun énoncé chiffré ne permettrait de vérifier) :

```
question 1 : 3 + 1 = ?   il répond 2 → « Tu as soustrait au lieu d'additionner. »
                         il se corrige avec 4 → juste
question 2 : 5 + 5 = ?   il répond 0 → « C'est la même chose qu'à la question
                                        d'avant. Tu as soustrait… »
```

**L'étape du milieu est le cœur de la mesure, et c'est le cas qu'un câblage naïf
rate** : l'élève s'est CORRIGÉ. Au moment où la question se conclut, le verdict
du dernier essai est « juste » et ne porte aucun diagnostic — alors que la
question, elle, en a eu un. Inscrire `verdict.misconception` au lieu du
diagnostic de la question ne casserait rien de visible : la remarque se dirait
encore à l'élève qui n'a jamais trouvé, et **jamais à celui qui écoute**.

## Ce qui reste, et ce qui l'attend

| | |
| --- | --- |
| **l'indice gratuit après deux échecs** | attend ses comptes. « Deux » est le sens minimal de « il répète », et ce sera un réglage que ses chiffres déplaceront. |
| **écrire le silence** | un mot à côté du nom dans Le direct, et une ligne discrète offrant « Montre-moi ». Le seuil sera **relatif** — la médiane de la classe sur la même question —, donc aucun nombre à inventer. |

---

# « Je ne comprends pas les blocages en compte »

> Et il avait raison : le défaut était entièrement dans la page.

Elle affichait **mes** chiffres de travail — « neuvième décile »,
« franchissements », « p90/méd », un tableau de décimales — et lui demandait de
me les recopier pour que je décide. J'avais fait de lui un instrument de mesure,
pour une décision qui est la sienne.

## Ce qu'elle dit maintenant

Les phrases SONT la page ; les chiffres bruts sont repliés dessous, pour le jour
où une de ces phrases a l'air fausse. Ce qu'il lira, par exemple :

```
Vos élèves ont répondu à 60 questions. 5 ont été ratées au premier coup,
soit 8 %.

### Après combien d'échecs faut-il lui pousser un indice ?
Un élève a raté deux questions de suite sur la même compétence 2 fois,
soit une fois sur 30 questions. C'est à ce moment-là que le logiciel lui
tendrait son premier indice, sans qu'il le demande et sans que ça lui
coûte de points.
Si l'on attend trois échecs de suite, cela n'arriverait jamais sur ces
séances.

### Pourquoi le pousser plutôt que l'attendre
Le bouton « Un indice » existe déjà, et il est peu employé : 2 % des
questions seulement, et 2 élèves sur 3 n'en ont jamais demandé un seul.
Celui qui bloque est précisément celui qui ne le demande pas.

### Au bout de combien de silence vous dire qu'un élève est arrêté
Cela ne peut pas être une durée fixe : sur « Additions Mystères », la
moitié de vos élèves répondent en moins de 9 secondes, et un sur dix met
plus de 38 secondes — 4,2 fois plus longtemps. Un élève lent n'est pas un
élève arrêté. Le logiciel comparera donc chacun à sa propre classe, sur
la même question — il n'y a aucun nombre à choisir.

→ Je propose deux échecs de suite. L'indice arriverait sur 3 % des
  questions — assez rare pour qu'on le remarque, assez fréquent pour
  atteindre celui qui bute.
```

**Et la page donne son avis, avec la raison.** Une page qui pose une question
sans dire ce qu'elle en pense renvoie le travail à celui qui l'a demandée.
Rémy tranche, mais sur un avis argumenté — pas sur un tableau de décimales.

## Deux choses rendues possibles par ce déplacement

Les phrases vivent dans `api/lib/blocages.php` et non dans le gabarit :
`phrasesDesBlocages` est **pure** — ni base, ni session, ni HTML. D'où deux
gains qui ne sont pas de style :

- **le harnais lit les phrases**, et non plus seulement le bloc de chiffres
  (celui-là même qu'il ne comprenait pas) ;
- **je peux les lire de mes yeux** en une commande, ce qui a fait trouver deux
  maladresses : l'exercice s'affichait par son identifiant (`calc-add`) au lieu
  de son nom, et « cela n'arrive plus que 0 fois » se lisait mal là où il
  fallait dire « cela n'arriverait jamais ».

### Et le fatal que personne ne voyait

En déplaçant le bloc, j'ai laissé une fonction déclarée **dans** une autre :
PHP meurt au second appel, et la section s'est affichée **entièrement vide**.
Or « ET ELLE NE CRACHE AUCUNE ERREUR PHP » est resté **VERT** — `display_errors`
est éteint, le fatal part dans le journal du serveur et jamais dans la page.
La garde donnait son assurance à l'envers. Elle lit maintenant le journal, sur
tout l'essai, et elle a été vue tomber.

Ce sont les deux vérifications qui exigeaient un **contenu** qui ont attrapé le
défaut : une garde qui cherche l'absence d'un signe d'échec vaut toujours moins
qu'une garde qui exige la présence du résultat.

---

# Le cadeau des mille versions

> « nous avions faire plus de 1000 versions puisque nous sommes à plus de v1000
> alors ca méritait un cadeau », puis, devant les idées proposées : « C est pas
> mal sinon des crédits en plus ».

Deux cadeaux, donc. Aucun des deux ne touche au logiciel des élèves.

## 1. « Mille versions » — ses propres phrases, rendues

`node tools/milleVersions.mjs` lit 1218 fichiers du dépôt et en sort **1794
phrases de Rémy**, chacune avec la décision qu'elle a prise et l'endroit où
elle vit encore. Le document est imprimable.

**Ce cadeau n'existe que parce qu'une règle a tenu mille versions.** `CLAUDE.md`
la pose au premier jour : « Un bon commentaire dit POURQUOI, cite Rémy mot pour
mot quand c'est lui qui a tranché, et annonce ce qui a été MESURÉ. » L'outil
n'invente rien — il relit.

Il exploite deux conventions du dépôt, et c'est tout :

- les phrases de Rémy sont entre guillemets français, précédées de son prénom ;
- la décision qui suit est annoncée **en capitales**, parce que c'est ainsi
  qu'on écrit « voici ce qui a été tranché ».

D'où les trois colonnes : ce qu'il a dit, ce que cela a décidé, où cela vit.

### Quatre défauts trouvés en le fabriquant, tous par la mesure

| | |
| --- | --- |
| **six phrases dans « Ce qu'on voit »** | on ne lisait que les lignes commençant par `//` ou `*`. Dans un commentaire `/* … */`, les lignes du milieu ne commencent par rien — presque tout le CSS était perdu. Suivi d'état : 6 → **134**. |
| **des noms d'exercices pris pour des phrases** | « Quadrilatère », « Valeur absolue ». On exige trois mots et dix-huit lettres. |
| **502 exercices** | un `grep` sur `id: '…'` ramassait les étapes et les paramètres. Le vrai nombre est **225**, et l'outil le demande maintenant au catalogue lui-même. **Un document qu'on offre ne peut pas se tromper sur ses propres chiffres.** |
| **« le 26 July 2026 »** | git parle la langue de la machine. La date se compose en français. |

Et « 91 jeux » était le nombre de FICHIERS de `js/games/`, dont certains sont
des pièces partagées. Ce qu'on voulait dire est « combien de façons
différentes de poser une question » : **125**, demandées au registre des
activités.

## 2. Une page « À propos » — le logiciel dit qui l'a fait

**Il n'y en avait aucune.** Mille versions, 225 exercices, et nulle part le nom
de celui qui a décidé de chacun d'eux. Un logiciel scolaire dit qui l'a fait.

Elle est dans l'administration, derrière son mot de passe. Interrogé sur qui
devait la voir, il a répondu « je ne sais pas » : on prend donc le choix qu'on
peut défaire. **On peut toujours l'ouvrir aux élèves ensuite ; l'inverse serait
plus gênant, parce qu'un nom publié a déjà été lu.**

Elle dit trois choses : que le logiciel est écrit **pour et avec** lui, que
tout vient de ses classes — près de mille huit cents de ses phrases sont dans
le code —, et que le code a été écrit par Claude sous sa conduite. Elle
rappelle aussi la ligne rouge, mot pour mot.

### Son nom n'y est pas encore, et c'est volontaire

Il a choisi « mon nom complet — je vous le donne » et ne l'a pas encore donné.
**On ne le devine pas** : son adresse électronique le laisse peut-être
entrevoir, mais tirer un nom de famille d'une adresse pour le publier sur une
page n'est pas à moi de le faire. Le prénom tient la place, dans **une seule
constante** — `APROPOS_AUTEUR`, une ligne à changer.

### Et un chiffre qui ne se met pas à jour tout seul

La page annonce 225 exercices et 125 activités, avec la date de leur mesure.
Les faire compter côté serveur demanderait de tenir deux vérités d'accord — le
catalogue est en JavaScript, la page est en PHP — et c'est le genre d'accord
qui finit toujours par produire un chiffre faux. **Mieux vaut une date qu'une
illusion**, et la page le dit.

---

# Le second envoi du 14 octobre — huit demandes d'affilée

Elles sont arrivées pendant que je travaillais, l'une après l'autre, souvent
avec une capture d'écran. On les écrit ICI avant de les traiter : à ce
rythme-là, une demande non écrite est une demande perdue.

| # | Ce qu'il a dit | État |
| --- | --- | --- |
| 1 | « pourquoi j'ai des noms d'exercices avec un numéro devant du genre 8. Diviser et le ... » | **fait** — v1004 |
| 2 | « ce qui serait bien pour les codes liés aux identifiants, c'est d'afficher un tableau avec identifiant et code […] sur un seul écran que je peux projeter […] 2 colonnes avec des couleurs pour pas confondre » | **fait** — v1005 |
| 3 | « pour les pyramides quand c'est bon et que l'élève a cliqué vérifié il faut dire qu'il a eu bon et proposer une nouvelle pyramide, j'ai une élève qui n'a pas compris qu'il fallait faire cela » | **fait** — v1005 |
| 4 | « le colonne lundi, mardi, mercredi n'ont pas la même taille » (capture du tableau croisé) | **fait** — v1005 |
| 5 | « est ce possible si sur un parcours, j'ai autorisé à passer l'exercice, sur un autre parcours, cette même exercice peut se passer aussi, j'ai l'impression que c'est ce qui est arrivé d'une séance sur l'autre ? » | **fait** — v1008, attaché à la séance |
| 6 | « une élève a eu cela mais je n'ai pas su l'aider car je ne sais pas ce qu'il faut écrire » (capture : « Comment appelle-t-on la ligne en gras ? », un cercle rouge, un arc vert, un diamètre bleu) | en cours |
| 7 | « là ca bloque, on peut appuyer sur la croix mais il faudrait un bouton quitter ou recommencer » (capture : la carte de fin de Math Crush) | en cours |
| 8 | « j'aimerai aussi le fait de bloquer les élèves chez eux. C'est à dire que juste la séance imposée fonctionne mais par contre si il se connecte, on leur dit que pour l'instant ce n'est disponible qu'au collège (je peux mettre le message de mon choix) » | à faire |
| 9 | « je pensais aussi pouvoir faire un challenge, exemple, j'impose dans le direct, un exercice à chacun (avec un temps déterminé) et on fait le bilan et ca peut faire un petit classement. Ca peut être sympa pour couper la séance » | à faire — c'est une fonction, pas une correction |

## 5. Le saut autorisé traverse les séances — mesuré

**Sa question était juste, et la réponse est oui.** Mesuré sur un vrai serveur
(`tools/tmp/sautEntreParcours.mjs`) : on impose la séance A, on autorise le
saut de `calc-add` depuis le direct, puis on impose la séance B — un autre
parcours — et l'on redemande la session de l'élève :

```
SÉANCE A   skippable = ["calc-add"]  · imposé : Séance A  · retirés : ["calc-mult"]
SÉANCE B   skippable = ["calc-add"]  · imposé : Séance B  · retirés : ["calc-mult"]
AUCUNE     skippable = ["calc-add"]  · imposé : aucun     · retirés : ["calc-mult"]
```

**La permission n'est rattachée à rien d'autre qu'à l'exercice.** La table
`overrides` porte `(class_id | student_id, exercise_id, mode)` — aucune colonne
de parcours, aucune date de péremption —, et `GET /session` les rend toutes,
quel que soit le parcours que l'élève ouvre. Le seul moyen de les faire cesser
est de cliquer « retirer » dans le direct.

**Et cela vaut aussi pour « retirer un exercice », qui est plus lourd** : un
exercice retiré pendant la séance A disparaît du parcours B de la même classe,
silencieusement, puisque `filtrerEtapes` le retire de n'importe quel parcours.

Trois façons d'y mettre fin lui ont été proposées : **(a)** la permission meurt
quand on impose une autre séance, **(b)** elle expire toute seule à la fin de la
journée, **(c)** elle est attachée au parcours où on l'a accordée.

### Il a d'abord choisi (c), puis s'est repris — et c'est lui qui avait raison

> « Je me suis trompé pour le saut d'exercice attache le à la séance pour le
> parcours on a déjà des sauts optionnels désolé »

**Il a raison deux fois, et la seconde est la plus intéressante.** D'abord parce
qu'un parcours a DÉJÀ ses étapes « non obligatoires », réglées en le
construisant (`js/ui/builder.js`, bouton « Non obligatoires ») : rattacher la
permission au parcours aurait fait **deux mécanismes pour une seule idée**, et
c'est exactement le genre de doublon que ce dépôt paie cher. Ensuite parce que
ce qu'il fait au direct n'est pas une propriété du parcours : c'est « laisse
tomber celui-là, on avance », dit à un élève coincé, **pendant cette heure-là**.

**CE QUI A ÉTÉ POSÉ, DONC : (a) ET (b) ENSEMBLE**, parce qu'une séance finit de
deux façons — on en impose une autre, ou l'heure passe sans que personne ne
touche à rien. Deux colonnes sur `overrides` : `seance_id`, la séance imposée au
moment où on accorde, et `expire_le`, la fin de la journée scolaire — la même
règle que celle de la séance imposée elle-même.

**ET C'EST LE SERVEUR QUI ÉCRIT LES DEUX**, pas l'écran qui clique : la séance
imposée porte une échéance que le navigateur ne lit pas, et elle peut tomber
entre le clic et la question suivante. La première écriture faisait porter le
parcours par le bouton du direct ; elle est partie, et le code est plus court
qu'avant elle.

---

# Les élèves en difficulté devant un tableau à compléter

> « Des élèves en difficulté ont eu pas mal de soucis sur les tableaux à
> compléter. J'ai des idées est ce que quand l'élève fait beaucoup d'erreurs on
> fait clignoter le bouton indice ou montre moi et quand c'est la calculatrice
> le clignotement est discret il faudrait une couleur plus visible. Je prends
> toutes tes idées »

## Ce que le tableau croisé fait DÉJÀ, et ce qui manque

Lu dans `js/games/tableauCroise.js` avant de proposer quoi que ce soit :

- chaque case fausse est **expliquée**, et pas seulement refusée —
  `pourquoiFaux` nomme l'erreur (« Trop grand. Cette case est DANS le tableau,
  pas dans les totaux : on part du total de sa ligne et on RETIRE ce qu'on y a
  déjà ») ;
- « 💡 Aide-moi » donne la **prochaine case déductible** et l'**entoure** —
  c'est une bonne aide, elle est gratuite et illimitée ;
- rien ne compte les erreurs, donc rien ne monte d'un cran.

**Le défaut n'est pas l'absence d'aide : c'est que l'élève perdu ne la demande
pas.** Il retape un nombre, relit la même explication, retape un nombre. Celui
qui sait que « Aide-moi » va l'aider n'en a pas besoin ; celui qui en a besoin
ne le sait pas.

## Le signal, c'est la CASE, pas le tableau

Huit erreurs réparties sur huit cases, c'est un élève qui avance en tâtonnant.
**Deux erreurs sur la MÊME case**, c'est un élève bloqué. C'est ce compteur-là
qu'il faut tenir, et il n'existait pas.

---

# « Il faut du visuel : tu sélectionnes les cellules, tu montres bien »

> « Tes phrases sont tellement longues et compliquées, elles ne seront pas lues.
> Pour le remplissage du tableau il faut du visuel : tu sélectionnes les
> cellules, tu montres bien »

Dit après la première correction, et il tranche la réserve que je m'étais faite
à moi-même : l'explication **plus** le conseil, cela faisait quatre lignes de
texte devant un élève qui lit mal. Sa réponse est plus forte que « raccourcis » :
**ce n'est pas la longueur, c'est le média.** Un élève arrêté devant un tableau
ne lit pas une phrase sur la méthode — il regarde le tableau.

## Ce qu'un professeur fait au tableau, et que le logiciel n'imitait pas

Il montre. Il pose le doigt sur la ligne, dit « regarde, ici tu as 312 », puis
sur les cases déjà remplies, « 56, 63 », puis sur la case vide. Les nombres
viennent des cases qu'il touche ; aucune phrase n'est nécessaire.

## Ce qu'on fait donc

- **La piste est sélectionnée** : tout le tableau s'éteint sauf la ligne (ou la
  colonne) où il ne manque qu'une case.
- **Les cases sont teintées par leur rôle**, et elles s'allument l'une après
  l'autre : le total en ambre, les nombres connus en bleu, la case qui manque
  en vert, cerclée.
- **L'opération s'écrit en grand sous le tableau** — `312 − 56 − 63 = ?` —,
  chaque nombre dans la couleur de SA case. C'est le lien que le doigt du
  professeur fait, et qu'aucune phrase ne fait.
- **Les phrases tombent à trois mots** : « Trop grand », « Trop petit »,
  avec la flèche qui dit dans quel sens aller.

---

# « Une aide doit être visuelle et pas trop longue, comme c'est parfois le cas pour certains exercices »

> « Deux c'est bien et évidemment un élève qui galère c'est aussi un élève qui
> peut avoir du mal à lire, le but est qu'il comprenne. Mais surtout une aide
> doit être visuelle et pas trop longue en explication comme c'est parfois le
> cas pour certains exercices »

Trois choses, et la troisième est la plus grosse.

1. **Le seuil de deux est tranché.** Deux erreurs sur la même case.
2. **Un élève qui galère est souvent un élève qui lit mal.** Ce n'est pas une
   préférence de style : lui donner un paragraphe, c'est ajouter sa difficulté
   à celle de l'exercice. « Le but est qu'il comprenne. »
3. **Ce n'est pas le tableau croisé, c'est le logiciel.** « comme c'est parfois
   le cas pour certains exercices » — il ne parle plus de celui qu'on vient de
   corriger. Il faut donc aller voir TOUS les autres.

## Ce qu'on fait, dans l'ordre

**On mesure avant de corriger.** On ne sait pas lesquels sont longs : on le
croit. Un outil compte les mots de tout ce qu'un élève peut recevoir comme
aide, exercice par exercice, et les classe. Ensuite on corrige les pires, et
l'on garde l'outil pour que la question se repose toute seule.

C'est exactement la friction écrite hier : la sonde sait mesurer une couleur et
un crochet, pas une phrase.

## Mesuré, puis corrigé

`tools/cequilFautLire.mjs` tire de vraies questions de chaque générateur et
compte **le plus long bloc d'un trait** — pas le total.

|  | avant | après |
| --- | --- | --- |
| exercices à l'écran posant un pavé de plus de 25 mots | **47** sur 97 | **0** |
| aides répétant la même phrase | 2 | 0 |
| exercices sans AUCUN dessin sous leurs indices | 87 sur 97 | 87 |

**Compter les mots était le mauvais instrument**, et cela s'est vu à la
première mesure : « Temps, Distance, Vitesse » sortait en tête avec 44 mots —
lu, c'est une BONNE aide : une phrase, trois formules sur trois lignes, une
phrase. À côté, un pavé de trente mots d'un trait se lit deux fois plus mal.

**Quarante-trois des quarante-sept sont tombés sans qu'un mot soit réécrit**,
par trois règles d'affichage (`aerer`) : une phrase par ligne, les suites
d'étapes (`;` et `|`) en colonne, et le deux-points comme respiration. Les
quatre autres étaient de vrais défauts d'écriture, corrigés un par un.

## Ce qui reste, et c'est l'autre moitié de sa phrase

**87 exercices sur 97 n'ont aucun dessin sous leurs indices**, alors que le
logiciel sait en poser un (`item.schemas[i]`) et que dix s'en servent. C'est
« une aide doit être **visuelle** », et cela ne se corrige pas par une règle
d'affichage : il faut dessiner, exercice par exercice. À faire là où ça compte
le plus — c'est Rémy qui sait lesquels ses élèves ouvrent.

---

# Les relatifs en 4ᵉ : « quel type d'exercice pour bien les entraîner ? »

> « en ce moment avec mes 4ᵉ, je fais les additions, soustractions,
> simplification et multiplications de nombres relatifs, c'est pas simple pour
> eux. Quel type d'exercice pourrait-on faire pour bien les entraîner. »
>
> puis : « et puis après viser des automatismes, au début on applique, comment
> après rendre cela un peu ludique et vraiment ancrer les réflexes »

## Ce qui existait déjà, et qu'on ne refait pas

Neuf exercices touchent les relatifs : l'ascenseur et le thermomètre,
« Additionner des Relatifs, pas à pas », « Multiplier des Relatifs, pas à
pas », le Ninja, Prio-Bot, et les trois marches du moins devant la parenthèse.
**Le calcul était couvert.**

## Le trou : chacun ANNONCE son opération

On entre dans « Multiplier », donc on multiplie. Or l'erreur reine de la 4ᵉ
n'est pas d'ignorer une règle, c'est d'appliquer **celle du produit à une
somme** : « moins et moins font plus », donc −3 − 5 = 8. Un élève qui ne
rencontre jamais les deux opérations dans la même minute ne s'entraîne pas à
les distinguer — il s'entraîne à appliquer celle qu'on lui a annoncée.

## Ce qui est fait

**« Somme ou Produit ? »** — onze marches. Les trois premières montrent les
deux écritures côte à côte, sur les mêmes nombres, et ne demandent que le
signe. Puis le signe d'une expression seule, en vrac. Puis le résultat, avec
toujours le résultat de l'AUTRE opération en premier piège.

**Et les automatismes sont presque gratuits**, parce qu'un exercice ici est un
GÉNÉRATEUR plus une ACTIVITÉ. Le même générateur rejoué ailleurs donne
**« Réflexe des Signes »** (contre-la-montre, les marches du signe seules) et
**« Attrape le Bon Signe »** (arcade, les marches mêlées). Trois portes, un
seul contenu à maintenir.

## Arbitrage à poser

Le chrono ne porte que sur le SIGNE : chronométrer un calcul mental demande
deux choses à la fois, et n'ancre ni l'une ni l'autre. À revoir si Rémy
constate le contraire en classe.

---

# Calcul mental : « on retire un et on ajoute 10 »

> « j'aimerai bien des exercices de calcul mentaux du genre 76 + 9 ou 76 + 99
> ou 156 − 9 ou 156 − 99, il faut que l'élève comprenne qu'on retire un et
> qu'on ajoute 10 (en tout cas pour le 9), etc, et qu'on en fasse des ludiques,
> voire des challenges vitesse mais facultatif »
>
> puis : « avec high score de la classe »

## Ce qu'il demande vraiment

Pas « calcule 76 + 9 » : **la STRATÉGIE**. Le résultat n'est que la preuve
qu'on l'a employée. Et la difficulté est au point précis où la compensation
s'inverse :

| | on remplace | puis |
| --- | --- | --- |
| 76 **+** 9 | + 10 | **− 1** |
| 156 **−** 9 | − 10 | **+ 1** |

C'est ce renversement qu'un élève rate, et il le rate toujours au même endroit.

Le « etc » de sa phrase compte aussi : la méthode vaut pour 8 (10 − 2), 11
(10 + 1), 98, 101 — on ne s'arrête donc pas à 9 et 99.

## Ce qui existe déjà

Rien sur la compensation. Le catalogue a « Amis de 100 et 1000 », « Le Canon
des Compléments », « À Peu Près », « Attrape le Résultat » — des compléments
et de l'ordre de grandeur, jamais le passage par le nombre rond.

## Le high score de la classe

**Il n'existe nulle part**, vérifié : aucun classement, aucun meilleur score,
ni côté élève ni côté professeur. En revanche la matière est déjà sur le
serveur — chaque `attempt` et chaque `run_finished` y sont synchronisés, et un
élève appartient à une classe. C'est donc une LECTURE neuve, pas une base
neuve. À faire après l'exercice, avec un arbitrage à poser : **qu'est-ce que le
score** (la plus longue série ? le nombre de questions en 60 secondes ?), et
**qui se voit** (le prénom en clair, ou le seul chiffre à battre ?).

---

# Deux demandes de plus, le 15 au soir

## 1. Compter l'argent

> « j'aimerai bien aussi un exercice où il faut compter l'argent et par exemple
> si j'ai 7 centimes, il faut marquer 0,07 »

**Ce n'est pas un exercice sur l'argent, c'est un exercice sur les DÉCIMAUX.**
« 7 centimes → 0,07 » est exactement le piège du rang : l'élève écrit 0,7
parce qu'il entend « sept ». L'euro est le meilleur support qui existe pour
cela — il est concret, il a exactement deux décimales, et la pièce de 1 centime
EST le centième.

Trois gestes à distinguer, et le logiciel doit les séparer :

| ce qu'on voit | ce qu'on écrit | la faute |
| --- | --- | --- |
| 7 centimes | 0,07 € | 0,7 € |
| 70 centimes | 0,70 € | 0,07 € |
| 2 € et 5 c | 2,05 € | 2,5 € |

À vérifier dans le catalogue avant d'écrire quoi que ce soit : « Virgule ou
Fraction ? » et « Dizaines, Centaines, Milliers » touchent déjà les rangs.

**Fait, le 15 au soir — « Compter l'Argent », code dicté AC.** Neuf marches en
trois temps : les centimes seuls, puis les euros ET les centimes, puis un TAS
de vraies pièces à compter. L'élève TAPE la réponse, parce que « il faut
marquer 0,07 » demande d'écrire le zéro qui tient le rang — choisir entre 0,07
et 0,7 serait une question voisine, pas celle-là. Le second indice est le
tableau des rangs, avec le chiffre à sa colonne et la colonne vide qui reçoit
son zéro.

Et sa demande du lendemain : « il faut que les billets et les pièces soit super
réalistes stp ». Les diamètres sont les vrais, au millimètre — la pièce de 5
centimes est donc plus GRANDE que celle de 10, et celle de 1 euro plus petite
que celle de 2 —, les trois métaux y sont, les douze étoiles aussi, et les
billets portent leur couleur, leur drapeau, leur arche et leur bande
holographique. Deux échelles, et c'est un choix mesuré : à l'échelle vraie, un
billet de 50 € fait 140 mm contre 16 pour une pièce de 1 centime, et sur un
téléphone la pièce devient un point de huit pixels.

## 2. Le défi chronométré de la classe

> « en fait tu vois je peux lancer un challenge chronométré, le plus de calcul
> et toute la classe participe et au bout du challenge, un tableau de High
> score, on pourrait faire cela avec les générateurs. Exemple : je lance le
> défi. Et là tous les élèves reçoivent des calculs, il faut taper la réponse
> ou QCM, aux choix, et au bout d'une minute, tableau de score pour tout le
> monde, et on reprend la suite des exercices normalement »

C'est la forme complète de l'idée du QCM lancé depuis le Direct, et elle est
meilleure : **ce n'est pas une question, c'est une minute.**

Ce qui est déjà là : le canal du Direct pousse déjà vers l'ardoise (verrou,
mot, indice, voile), les élèves appartiennent à une classe, et chaque `attempt`
remonte au serveur. Ce qui manque : le défi lui-même, le score, et le tableau.

**Trois arbitrages à poser avant d'écrire** — le troisième est le seul qui ne
soit pas technique :

1. **D'où viennent les calculs ?** Du catalogue : Rémy choisit un exercice au
   lancement, et le générateur fournit la série. Rien à écrire à la volée.
2. **Qu'est-ce que le score ?** Le nombre de bonnes réponses dans la minute,
   et la rapidité ne départage qu'en cas d'égalité. Compter des points de
   vitesse récompenserait la frappe, pas le calcul.
3. **Qui voit quoi dans le tableau ?** Afficher les trente prénoms classés
   devant toute la classe, c'est désigner le dernier chaque fois. À trancher
   par Rémy : classement complet, ou podium plus « ta place et ton score ».

## 3. « Des exercices ludiques sur l'addition et le produit de relatifs »

> « et aussi pour des exercices ludiques sur l'addition et le produit de
> nombres relatifs »

**La moitié est faite depuis v1013** : « Attrape le Bon Signe » est l'arcade du
même générateur sur les marches de calcul mêlées, et « Réflexe des Signes » en
est la version chrono. À vérifier avec lui que c'est bien ce qu'il cherchait.

**Ce qui manquerait, et qui est bon marché** : le Ninja des Relatifs ne coupe
que des SOMMES (`num.relatifs.somme`, « le nombre le plus éloigné de zéro »).
Lui ajouter un mode « produits », ou mieux un mode « mêlés », en ferait le jeu
d'arcade de la règle des signes — et c'est trois lignes dans `MODES`
(`js/core/tri.js`), pas un jeu neuf.

---

## Et sa réponse, le 15 au soir : « pas que le signe »

> « pour les sommes et produits il faut aussi faire faire des calculs pas que
> le signe et aussi des jeux en rapport avec cela »

**IL RENVERSE UN DE MES ARBITRAGES, ET IL A LA MAIN.** J'avais écrit, en
montant « Réflexe des Signes » : « un chronomètre sur un calcul mental demande
deux choses à la fois, et n'ancre ni l'une ni l'autre », avec la note « à
revoir si Rémy constate le contraire en classe ». Il l'a constaté.

**Trois choses faites, et une quatrième trouvée en chemin :**

1. **« Calcul Express des Relatifs »** (code **ER**) — le chrono sur les quatre
   marches de CALCUL. Les deux portes chrono restent et ne font pas doublon :
   l'une ancre le CHOIX de la règle, l'autre son APPLICATION.
2. **Le Ninja des deux règles** (code **NM**) — deux modes neufs dans
   `js/core/tri.js` : « produits » et « mêlés ». Une vague mêlée porte toujours
   au moins une somme ET un produit ; tirée à pile ou face par bulle, elle
   n'aurait mêlé rien du tout une fois sur trente-deux.
3. **Le facteur 1 écarté des produits** — vu sur la photo : deux bulles sur
   cinq portaient « 9 × (−1) ». Le signe y est juste, mais le produit n'en est
   pas un.
4. **UN TITRE QUI MENTAIT.** « Attrape le Bon Signe » DEMANDE le résultat
   depuis le premier jour — ses marches sont `calcul-melange` et
   `calcul-simple`. Un professeur qui la prenait pour travailler le signe
   recevait du calcul mental. Renommée **« Attrape le Résultat Relatif »**,
   et une garde refuse désormais tout titre qui annonce le signe sur des
   marches qui calculent.

## Le défi est fait — ce qui a été tranché en l'écrivant

- **Ça coupe, et ça ne démonte rien.** L'exercice reste monté dessous ; le
  voile se retire, l'élève retrouve sa question où il l'avait laissée.
- **La graine vient du serveur** : la même série de questions pour toute la
  classe. Sans elle, on classerait trente épreuves différentes.
- **Deux instants, jamais une durée** — et l'ardoise corrige en plus l'écart
  entre son horloge et celle du serveur, parce qu'ici le chiffre décide d'un
  classement.
- **Trois secondes avant de commencer** : sans elles, l'élève qui écrivait voit
  une question apparaître sous ses doigts et répond au hasard.
- **Le voile passe sous la pause du professeur** : « tout le monde s'arrête »
  veut dire tout le monde, défi compris.

---

# Sa demande du 15 au soir, après « Compter l'Argent »

> « et après tu peux faire des petits problèmes avec calcul »

**Ce qui existe déjà, vérifié avant d'écrire quoi que ce soit** : « Histoires
en Pagaille » (code HP), onze familles rangées selon la typologie de Vergnaud,
trois niveaux CM2 / 6ème / 5ème, un schéma gratuit sous chaque énoncé, et une
version papier à deux lignes de réponse. L'exercice existe, il est complet, et
il est bon.

**Ce qu'il n'a pas, et c'est précisément le chapitre que Rémy enseigne en ce
moment** : AUCUNE famille sur les nombres relatifs. Ses 4ème font « les
additions, soustractions, simplification et multiplications de nombres
relatifs » — et les quatre mondes où un relatif est une histoire vraie
(température, altitude, compte en banque, ascenseur, chronologie avant/après
J.-C.) n'existent nulle part dans le logiciel.

Les onze familles s'arrêtent aussi aux entiers et aux prix simples : rien sur
les décimaux, rien sur le calcul mental du « Détour par le Nombre Rond ».

**Tranché par lui, dans la minute** : « Dans la même catégorie que les
billets, l'argent et les prix. »

Donc : payer, rendre la monnaie, le prix de plusieurs articles, ce qu'il me
reste — avec les pièces et les billets DESSINÉS, comme dans « Compter
l'Argent », puisque c'est « la même catégorie » qu'il demande. Les dessins
existent déjà et s'exportent : `pieceSvg`, `billetSvg`, `tasSvg`.

Ce que « Histoires en Pagaille » ne fait pas et qu'il faut donc faire ici :
**les décimaux**. Ses onze familles travaillent des prix ENTIERS ; or la
monnaie rendue sur un billet de 10 € pour un article à 7,40 € est exactement
l'endroit où un élève de sixième écrit 3,60 au lieu de 2,60 — ou 2,6 au lieu
de 2,60.

Les familles à écrire, et chacune a son geste :

| la question | l'opération |
| --- | --- |
| le total de deux (puis trois) articles | + |
| la monnaie rendue sur un billet | − |
| ce qu'il me reste après la dépense | − |
| le prix de plusieurs articles identiques | × |
| le prix d'UN article quand on connaît celui de plusieurs | ÷ |
| combien puis-je en acheter avec ce que j'ai | ÷ avec reste |
| deux étapes : j'achète deux choses ET je paie avec un billet | + puis − |
| combien me manque-t-il | comparaison |

---

# « Comment régler la durée sur chaque question ? » — et la réponse était NON

> « pour détour express, c'est sympa mais comment régler la durée sur chaque
> question ? (est ce le cas pour d'autres exercices) »

**Mesuré avant de répondre, et sa question en valait deux :**

| activité | ce qui réglait la durée |
| --- | --- |
| `sprint` — Contre-la-montre | **rien.** 9 000 ms au départ, plancher 2 600, ×0,88 par bonne réponse, ×1,22 après une erreur — tout écrit en dur |
| `moles` — Attraper le bon nombre | **rien.** 2 600 ms de sortie, 850 ms de cadence |
| `ninja` — Ninja des Relatifs | « Allure », quatre crans, depuis août |

Donc oui, c'était le cas ailleurs, et ce n'était pas un oubli isolé : **deux
jeux chronométrés sur trois n'avaient aucune vis.** Le troisième en avait une,
et c'est la sienne qu'on a déménagée dans `js/core/allure.js` pour que les
trois lisent la même table — recopiée trois fois, « posée » aurait fini par
vouloir dire trois choses.

**Deux précisions qui ne se devinent pas :**

- **Le plancher suit l'allure**, pas seulement le départ. Multiplier le seul
  départ ferait redescendre tout le monde aux mêmes 2,6 secondes au bout de six
  bonnes réponses — c'est-à-dire exactement là où l'élève lent décroche.
- **Chez les taupes, la cadence suit la sortie.** Ralentir la sortie sans la
  cadence ferait sortir trois disques de plus pendant qu'on lit le premier :
  « plus lent » donnerait un écran plus chargé.

Mesuré au navigateur, sur « Détour Express » : jauge à **9 s** en normale,
**14,4 s** en tranquille, **6,75 s** en rapide.

---

# La soustraction posée : deux méthodes de retenue, et ses élèves font l'autre

> « pour la soustraction posée, il faut que si il y a une retenue en haut, la
> mettre et actualisé le +1 en bas dans le rang après. mais j'ai des élèves qui
> font une autre méthode où pour 53 − 17, il mette le 1 à 3 et au lieu du 5, il
> barre et mette 4, est ce clair ? »
>
> « du coup peut être un bouton changer de méthode avec un popup qui montre un
> exemple »

**C'est parfaitement clair, et ce sont les deux méthodes que l'école française
enseigne — selon l'année, le manuel et le professeur :**

| | 53 − 17 |
| --- | --- |
| **Par compensation** (« le +1 en bas ») | on écrit un petit 1 devant le 3 (13 − 7 = 6), **et l'on ajoute 1 au 1 de 17**, qui devient 2 : 5 − 2 = 3. On ajoute dix en haut ET dix en bas, la différence ne change pas. |
| **Par emprunt** (« on casse une dizaine ») | on écrit le 1 devant le 3 (13 − 7 = 6), **on barre le 5 et l'on écrit 4 au-dessus** : 4 − 1 = 3. On casse une dizaine du 53 pour la donner aux unités. |

**Les deux donnent 36.** La première est plus rapide à poser, la seconde dit ce
qui se passe vraiment — et c'est elle que beaucoup d'élèves apprennent au
primaire aujourd'hui.

**Ce qu'il demande** : un bouton « changer de méthode », avec une fenêtre qui
montre un exemple de chacune. Donc **deux gestes à écrire dans la soustraction
posée**, et un réglage qui dit lequel l'exercice attend — plus la fenêtre
d'exemple, qui est un `showModal` et jamais une fenêtre native.

**À vérifier avant d'écrire** : ce que `js/games/poserOperation.js` fait
aujourd'hui de la retenue, et si le barré d'un chiffre y est seulement
dessinable.

---

# « On n'a même pas fait d'exercice de fraction où il faut ÉCRIRE la fraction »

> « on a même pas fait d'exercice de fraction où il faut écrire la fraction en
> fonction d'un camembert, pavage et avec la difficulté que parfois les parts
> ne sont pas identiques et que du coup, on sépare mentalement et en indice on
> peut voir la découpe »

**IL A RAISON, ET C'EST LE TROU LE PLUS SURPRENANT DU CHAPITRE.** Audité : le
catalogue porte vingt-huit exercices de fractions — comparer, additionner,
multiplier, simplifier, poser, douze cartes de calcul — et **pas un seul ne
demande de LIRE une figure pour en écrire la fraction.** « La Pizzeria des
Fractions » fait l'inverse : on lui donne 3/4 et l'élève colorie.

Or c'est le tout premier geste du chapitre en sixième, et celui qui fonde tout
le reste : le dénominateur dit **en combien de parts ÉGALES** le tout est
coupé, le numérateur **combien on en prend**.

**ET SA DIFFICULTÉ EST LA BONNE** — c'est même la seule qui fasse travailler la
définition plutôt que le comptage :

> « parfois les parts ne sont pas identiques et du coup on sépare mentalement »

Une figure dont les morceaux sont inégaux ne se compte pas : il faut
reconnaître que le grand morceau en vaut deux petits, donc **ramener au plus
petit**. Un élève qui compte « 3 morceaux sur 5 » sans regarder leur taille
écrit une fraction fausse — et c'est exactement l'erreur que cet exercice
existe pour attraper.

> « en indice on peut voir la découpe »

L'indice ne DIT pas la réponse, il **redécoupe la figure** : les traits qui
manquaient apparaissent, et l'élève compte alors des parts vraiment égales.
C'est `item.schemas[i]`, le dessin sous l'indice — exactement ce dont les
87 exercices qui n'en ont pas auraient besoin.

**Les deux supports qu'il nomme**, et ils ne travaillent pas la même chose :

| | ce que ça fait voir |
| --- | --- |
| **le camembert** | le tout est UN disque ; les parts sont des secteurs, et l'inégalité se voit à l'angle |
| **le pavage** | le tout est un rectangle quadrillé ; l'inégalité se voit à l'aire, et la figure se prête aux fractions supérieures à 1 (deux rectangles côte à côte) |
