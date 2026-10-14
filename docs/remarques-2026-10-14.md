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
