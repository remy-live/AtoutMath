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
