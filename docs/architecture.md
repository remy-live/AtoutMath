# Architecture d'AtoutMath

Ce document explique **pourquoi** le code est organisé ainsi. Pour la liste des
fichiers, lisez le code ; pour comprendre où ajouter quelque chose, lisez ceci.

---

## 0. La ligne rouge

> « Je ne veux pas de construction géométrique avec des outils virtuels. Rien
> ne remplace le geste. Ce sera ma ligne rouge pour ce logiciel. » — Rémy

**Aucun exercice ne doit demander de CONSTRUIRE une figure en manipulant des
instruments à l'écran.** Pas de compas qu'on fait tourner à la souris, pas
d'équerre qu'on pose, pas de règle qu'on glisse le long d'un trait.

### Pourquoi c'est une ligne et pas une préférence

Tracer un cercle au compas est un geste du corps : on plante la pointe, on
règle l'écartement, on tourne le poignet d'un seul mouvement en gardant
l'inclinaison. Ce geste s'apprend en le faisant rater — la pointe qui glisse,
l'écartement qui bouge, le trait qui ne se referme pas. Un compas à la souris
n'a aucune de ces difficultés : il donne le résultat sans le geste, et fait
croire qu'on a appris. L'élève qui « sait » construire une médiatrice à l'écran
se retrouve devant sa feuille sans rien dans les mains.

C'est le seul domaine où l'écran ne peut pas mieux faire que le papier. Partout
ailleurs il apporte quelque chose que la feuille n'a pas : la correction
immédiate, la figure qui bouge, le pliage qu'on voit, la balance qui penche.
Ici il retire l'essentiel et ne rend rien.

### Ce qui reste permis, et pourquoi ce n'est pas la même chose

  * **ÉCRIRE un programme de construction** (`geo-programme-construction`). On
    ne trace pas : on rédige, et la figure est la CONSÉQUENCE de ce qu'on a
    écrit. C'est l'inverse du geste escamoté — c'est le raisonnement isolé du
    geste, pour être travaillé à part. La construction, elle, se fera sur la
    feuille imprimable.
  * **RECONNAÎTRE, CODER, TRIER des figures** (l'organigramme des
    quadrilatères, le codage). On lit une figure, on ne la fabrique pas.
  * **PLIER, DÉPLACER, PROGRAMMER** (le patron du cube, le tangram, le chat
    géomètre, l'automate). Aucun instrument de tracé n'y intervient.
  * **LIRE une mesure** sur un rapporteur dessiné (`geo-galactic`). Lire n'est
    pas construire — mais voir plus bas, la frontière est mince.

### Ce qui la franchit aujourd'hui, et qui reste

Deux exercices sont ANTÉRIEURS à la règle. Rémy, consulté, les garde pour
l'instant : **la ligne vaut pour ce qu'on écrira désormais, pas contre
l'existant.** Ils sont listés ici pour qu'on sache que ce sont des exceptions
datées, et non des exemples à suivre.

| exercice | ce qu'il fait | ce que son retrait coûterait |
|---|---|---|
| `geo-atelier-instruments` | « On les prend, on les pose, on les tourne — à la souris comme au doigt — et on trace le long » | vide `geo.construire.instruments`, seule compétence qu'il porte |
| `geo-angles` (Angle Master) | « déplace le rapporteur sur le sommet, tourne-le par ses poignées » | vide `geo.angles.construire`, et laisse `geo.angles.mesure` au seul `geo-galactic` |

Le premier est en plein dedans. Le second est plus discutable : il fait MESURER
et non construire, mais il fait manipuler un rapporteur virtuel, ce qui est
exactement le geste dont Rémy dit qu'il ne se remplace pas.

### Aucun test ne garde cette règle, et c'est volontaire

On aurait pu déclarer une liste d'activités interdites et la vérifier. Ce
serait un garde-fou en trompe-l'œil : rien dans le code ne distingue « faire
tourner un compas » de « faire tourner une pièce de tangram », et un test qui
ne sait pas reconnaître la faute qu'il prétend interdire donne une fausse
sécurité — pire que pas de test du tout. La règle est ici, en tête du document
qu'on lit avant d'ajouter un exercice. C'est une décision de conception, elle
se tient par la lecture.

---

## 1. Les quatre couches

```
        données                        présentation
  ┌───────────────────┐          ┌──────────────────────┐
  │ data/skills.js    │          │ ui/*  (vues)         │
  │ data/catalog.js   │          │ core/activities/*    │
  └─────────┬─────────┘          └──────────┬───────────┘
            │                               │
            │        ┌──────────────────────┴───────────┐
            └───────►│  core/registry.js   core/items.js│
                     │  core/itemSession.js  core/runner│
                     │  core/policy.js  core/grading.js │
                     └──────────────────┬───────────────┘
                                        │
                     ┌──────────────────┴───────────────┐
                     │ core/journal.js (événements)     │
                     │ core/projections.js  core/mastery│
                     │ core/store.js  core/sync.js      │
                     └──────────────────────────────────┘
```

Règle de dépendance : **les flèches ne remontent jamais.** Un générateur ne
connaît pas le DOM, une activité ne connaît pas les notions, le journal ne
connaît personne.

---

## 2. La progression est un journal, pas un état

`state.score`, `state.errorHistory`, la maîtrise, les notes : **rien de tout
cela n'est stocké**. Seuls des événements le sont.

```js
journal.emit('attempt', {
  runId, stepId, exerciseId, skillId, itemSeed,
  questionText, given, expected, correct,
  attemptIndex, msElapsed, hintsUsed, misconception, points
});
```

Tout le reste est une **projection** recalculée à la lecture
([projections.js](../js/core/projections.js), [mastery.js](../js/core/mastery.js),
[grading.js](../js/core/grading.js)).

### Pourquoi

1. **La synchronisation multi-appareils devient triviale.** Deux valeurs de
   `score: 42` ne se fusionnent pas : il faut arbitrer, et quelqu'un perd. Deux
   listes d'événements identifiés par UUID se fusionnent par union — opération
   commutative et idempotente. École puis maison, maison puis école, ou les
   deux hors ligne pendant une semaine : même résultat.
2. **Les notes ne sont pas falsifiables.** Le serveur reçoit des réponses,
   jamais une note, et applique le barème lui-même
   ([api/lib/grading.php](../api/lib/grading.php) reproduit
   [grading.js](../js/core/grading.js)).
3. **Changer un barème régénère les bilans passés**, sans migration.

### Ce que ça coûte

Le journal grossit. Il est plafonné par `journal.compact()`, qui replie les
événements de plus de 120 jours **déjà synchronisés** en un `snapshot`
conservant les totaux. Le détail reste sur le serveur.

### Conséquence pratique

`state.score = 10` n'a aucun effet : `score` est un *getter*. Pour modifier la
progression, il faut émettre un événement — c'est volontaire.

---

## 3. Générateur × Activité : le contrat `Item`

L'ancienne organisation soudait le contenu et sa présentation : `mental.js`
savait générer des additions *et* les afficher en bulles. Ajouter les fractions
imposait d'écrire un nouveau jeu ; ajouter un jeu imposait de réécrire la
génération des questions. Coût en N × M.

Maintenant, deux briques indépendantes reliées par un objet :

```js
// Un générateur : (params, ctx) -> Item. Pas de DOM, pas d'état global.
{ id, label, skills: ['num.mult.table.*'], answerKinds: ['choice','numeric'],
  params: [...], generate(params, ctx) { return makeItem({...}); } }

// Une activité : sait afficher certains genres de réponse.
{ id: 'bubbles', accepts: ['choice','numeric'], load: () => import('./choice.js') }
```

La compatibilité se lit sur un seul champ, `answerKind` ; elle est vérifiée au
démarrage par `validateCatalog()` plutôt que découverte en jeu.

**Un exercice du catalogue n'est plus du code**, c'est un assemblage :

```js
{ id: 'frac-compare', title: 'Duel de Fractions',
  generatorId: 'frac.compare', activityId: 'signs',
  params: { maxDen: 12 }, tags: {...}, instruction: '...' }
```

### Ce que ça a donné concrètement

Huit fichiers de jeu supprimés (`mental`, `mult_flash`, `mult_missing`,
`priority`, `pythagore`, `grid`, `arcade_sprint`, `arcade_moles`), remplacés par
trois activités génériques. Trois notions entièrement nouvelles (fractions,
décimaux, périmètre/aire) ajoutées **sans écrire un seul moteur de jeu**.

### Ajouter quelque chose

| Objectif | À faire |
|---|---|
| Une notion | un générateur dans `core/generators/`, inscrit dans `core/activities/index.js`, une compétence dans `data/skills.js`, une ligne de catalogue |
| Un jeu | un `mount(container, session, opts)` dans `core/activities/`, inscrit dans `index.js` |
| Un genre de réponse | l'ajouter à `answerKinds` d'un générateur et à `accepts` d'une activité |


### Le mode apprentissage n'est pas un moteur de plus

Certains exercices ne s'improvisent pas. Un Binairo ou un Mathdoku jeté sans un
mot demande à l'élève de deviner la règle **en même temps que** la réponse.
D'autres n'en ont aucun besoin : une addition se comprend en la lisant.

Un mode apprentissage est donc **une leçon, puis un parcours à paliers** — et
le moteur de parcours savait déjà tout faire. L'exercice le déclare au
catalogue, rien d'autre :

```js
apprentissage: {
  intro: 'à quoi on joue',
  regles: [{ titre, texte, exemple?, figure? }],
  paliers: [{ titre, overrides, nbItems, exerciseId? }]
}
```

Trois points à connaître avant d'en écrire un :

- `exerciseId` permet à un palier de passer par **un autre exercice**. La
  difficulté n'est pas que dans les réglages : on apprend les notations au
  calme, on ne les révise contre la montre qu'au dernier palier.
- La politique est imposée par [apprentissage.js](../js/core/apprentissage.js) :
  entraînement, trois essais, aides, **aucune note**. Être jugé sur ce qu'on
  découvre n'a pas de sens.
- Le seuil laisse **toujours passer une erreur** dès qu'il y a plus d'une
  question. Renvoyer un élève au début d'un palier pour une inattention est la
  meilleure façon de le faire abandonner.

Les règles sont rendues par [leconUI.js](../js/ui/leconUI.js), et non par le
catalogue : une règle se montre, et `figure: { type: 'notation', … }` va y
chercher un vrai dessin. Les données ne connaissent pas le SVG.

`tests/apprentissage.test.mjs` vérifie ce qui dérive en silence : une surcharge
sur un réglage inexistant (le générateur reprendrait sa valeur par défaut, et le
palier « facile » se jouerait en difficile sans que rien ne le signale), une
valeur hors des options, un palier vers un exercice disparu.

### Le robot explique, et il l'explique gratuitement

La démonstration ne montre pas seulement **où** cliquer, elle dit **pourquoi**.
Or ce qu'il faut dire est déjà dans l'item, et il y est pour tout générateur —
présent ou à venir — parce que le contrat l'exige et qu'un test le vérifie :

| Champ | Ce que le robot en fait |
|---|---|
| `hints` | la méthode, énoncée avant tout geste |
| `choice.why` | l'erreur qu'il écarte, en la désignant du doigt |
| `explanation` | la conclusion, une fois la réponse posée |

Conséquence : **un nouveau générateur est commenté sans écrire une ligne** de
plus. Une nouvelle activité n'a qu'à appeler `demoChoix()`
([demoScript.js](../js/core/demoScript.js)) en lui passant ses cases, ou
`direLaMethode()` / `direLaConclusion()` si son geste lui est propre.

Les jeux à grille (Mathdoku, Binairo, Garam) ne peuvent pas s'en contenter :
leur raisonnement n'est pas dans l'item, il est dans l'état de la grille. Chacun
porte donc un `prochainCoup()` qui cherche la case qu'une règle impose et rend
**la phrase qui la justifie**. Règle d'or : cette phrase est vérifiée contre la
solution avant d'être prononcée — une justification fausse est pire que pas de
justification. Quand aucune règle ne tranche, le robot le dit plutôt que
d'inventer une déduction.

La parole passe par [demoNarration.js](../js/core/demoNarration.js) : une bulle
ancrée sur ce dont elle parle, dont la durée est calculée sur la longueur du
texte, et dont l'attente passe par le minuteur de la démonstration — donc la
pause l'arrête et le ralenti la double.

### Les jeux autonomes

Tetris, Course, Memory, Météorites, Labyrinthe, Math Crush portent leur propre
logique de plateau : ils ne consomment pas d'`ItemSession`. Ils restent
intégrés en déclarant leurs réponses via `BaseGame.onCorrectAnswer` /
`onWrongAnswer`, donc ils alimentent identiquement statistiques, carnet
d'erreurs et notes.

### Les marches d'une progression

Certains générateurs ne posent pas des questions interchangeables : ils montent
un escalier — douze marches pour additionner des relatifs, dix pour réduire
avec des puissances. Trois questions se posent alors, et elles étaient toutes
les trois dans un seul menu déroulant. Rémy :

> « il faudrait pouvoir choisir les niveaux par checkbox, avoir un nombre de
> questions que ça change le nombre de questions, et avoir la même chose avec
> un peu le diagramme en barres. »

Elles sont maintenant séparées, et `core/progression.js` porte le calcul, sans
écran donc testable :

1. **Quelles marches** on travaille — une liste à cocher (`type: 'marches'`,
   posée par `paramMarches`), tout coché à l'ouverture. Au-delà de huit
   marches, elle se plie sur les groupes que le générateur déclare (les temps
   A / B / C), sinon elle reste à plat.
2. **Combien de questions** dure l'exercice — le réglage de longueur, et rien
   d'autre. Il ne bouge plus tout seul ; `conseil()` sert une fois, à
   l'ouverture, pour ne pas proposer dix questions à treize marches.
3. **Comment elles se partagent** — `decoupeMarches()` répartit le total sur
   les marches cochées, et le panneau le dessine en barre, avec la bulle au
   clic et les bornes qu'on tire, exactement comme la frise du QCM 2/4/libre.
   Le partage tiré à la main s'écrit dans `params.repartitionMarches` — pas
   `repartition`, qui appartient déjà à l'escalier de l'aide.

Côté générateur, une seule ligne dans `generate` : `marcheAuRang(ctx.index,
marchesCochees(params, LISTE_MARCHES, ANCIEN), totalDe(ctx, params), params)`.
`itemSession` passe `total` dans le `ctx` — sans lui, on retombe sur le compte
que le générateur posait avant qu'il y ait un réglage.

---

## 4. Les questions sont reproductibles

Un item est décrit par une **graine** (`item.seed`) : le tirage passe par un
générateur pseudo-aléatoire ensemencé ([ids.js](../js/core/ids.js)). Rejouer la
graine régénère exactement la même question, sur n'importe quel appareil.

Trois usages :
- rejouer à l'identique les questions ratées (remédiation) ;
- ne stocker qu'une chaîne de 8 caractères au lieu du contenu de la question ;
- permettre au serveur de vérifier une évaluation.

---

## 5. Entraînement ou évaluation : une politique, pas deux moteurs

```js
{ mode: 'evaluation', hints: false, maxAttemptsPerItem: 1,
  showCorrection: false, adaptive: false,
  grading: { scale: 20, rule: 'firstTry', penalties: {...}, arrondi: 0.5 } }
```

| | Entraînement | Évaluation |
|---|---|---|
| Essais par question | plusieurs | un seul |
| Aides graduées | oui | non |
| Correction | immédiate | à la fin |
| Tirage | ciblé sur les notions fragiles | neutre |
| Résultat | progression | note + bilan par compétence |

Même moteur, mêmes activités : la différence est une donnée, portée par le
parcours et éditable par le professeur.

### La note

`gradeRun(run, policy)` est une **fonction pure**. Trois règles :

- `firstTry` — seules les réussites du premier coup, sans aide, comptent ;
- `ratio` — une question finalement résolue vaut plein point ;
- `ponderee` — chaque essai supplémentaire et chaque aide amputent le crédit.

Les étapes portent un poids. La note sort avec un **bilan par compétence**
(non acquis / en cours / acquis / expert) : dans un outil didactique, « 12/20 »
dit moins que « tables de 7 et 8 non acquises, priorités acquises ».

---

## 6. Le modèle de maîtrise

L'ancien calcul était un taux de réussite brut sur tout l'historique : une
notion travaillée il y a trois mois pesait comme celle d'hier.

- **Pondération temporelle** : chaque tentative pèse `exp(-Δt / 21 jours)`.
- **Confiance** : une notion n'est pas qualifiée tant que le poids cumulé des
  tentatives récentes est inférieur à 5.
- **Boîtes de Leitner** : la compétence monte d'une boîte par réussite du
  premier coup, redescend d'une en cas d'échec. La boîte fixe l'intervalle
  avant la prochaine révision (0, 1, 3, 7, 16, 35 jours).
- **Graphe de prérequis** : quand une notion échoue, la recommandation remonte
  au prérequis le plus fragile plutôt que de faire refaire la même chose.

C'est ce qui alimente la « séance du jour » de la vue Parcours.

---

## 7. Le diagnostic d'erreur

Chaque distracteur porte la raison pour laquelle un élève le choisit :

```js
{ value: t * (m + 1), why: `Tu as compté une fois de trop : c'est ${m} fois ${t}.` }
{ value: t + m,       why: 'Tu as additionné au lieu de multiplier.' }
```

Ce n'est pas cosmétique : c'est ce qui distingue une correction d'une sanction.
Le `why` remonte dans le retour immédiat, dans le carnet d'erreurs et dans le
bilan lu par le professeur.

Corollaire : `finalizeChoices()` dédoublonne les propositions. Les distracteurs
étant calculés à partir de la réponse, ils peuvent coïncider entre eux ou avec
elle — cas rare mais fatal (deux cases justes, dont une comptée fausse). Un
test le vérifie sur 40 tirages de chaque générateur.

---

## 8. Les parcours sont des références

Avant, une étape était une copie profonde de l'exercice, figée au
glisser-déposer : parcours lourds, insensibles aux corrections du catalogue,
impossibles à mettre en base.

```js
{ stepId, exerciseId: 'calc-mult-flash',
  overrides: { tables: [7, 8] }, nbItems: 10, threshold: 8, weight: 2 }
```

`hydratePath()` fusionne avec le catalogue au lancement et signale les
exercices disparus. `normalizePath()` convertit les anciens parcours.

Les codes de partage encodent le parcours entier — politique et barème compris
— en base64url. Les anciens codes à deux lettres restent décodables.

### L'identité d'un parcours est son CONTENU

Un parcours voyage par trois chemins, et il faut qu'ils se reconnaissent : le
professeur **donne** une séance à une classe, l'élève rattaché **ouvre** sa
séance depuis l'accueil, l'élève sur un poste inconnu **tape** le code dicté.
Les trois écrivent au journal sous un `pathId`.

Or **un code ne transporte aucun identifiant** : il ne porte que le travail.
Chacun s'en fabriquait donc un dans son coin — au hasard côté élève, l'`id`
d'atelier côté professeur. Résultat mesuré : la progression de l'élève
disparaissait dès qu'il ressaisissait le même code, et le bilan d'une séance ne
retenait aucun des travaux de la classe (« runs retenus : `[]` »).

`identiteDeParcours(path)` — une empreinte FNV-1a de la forme compacte, nom
exclu — est **la** définition, partout :

| Qui | Écrit | Où |
|---|---|---|
| `donnerSeance` | `pathId: identiteDeParcours(path)` | `core/seances.js` |
| `decodePath` | `path.id = identiteDeParcours(path)` | `core/shortcodes.js` |
| `ouvrirSeance` | le meneur reçoit `{...seance.path, id: seance.pathId}` | `ui/maSeance.js` |
| `parcoursClasses` | compare `s.pathId === identiteDeParcours(parcours)` | `ui/parcoursClasses.js` |

Le **nom** est hors de l'empreinte : renommer une séance ne doit pas couper
trente élèves de leur progression. Une **graine de reprise** (`reprise`, champ
`r` de la forme compacte) est le seul champ qui ne décrit pas le travail : elle
décrit l'ACTE de le redonner, et c'est ce qui fait d'un rattrapage un autre
parcours — jusque dans son code, qui passe alors obligatoirement en format
long.

---

## 9. Le serveur PHP est optionnel

L'application est **local-first** : elle fonctionne intégralement hors ligne, le
serveur n'est jamais une dépendance de rendu. Il ne fait que deux choses :
recevoir des événements, et en renvoyer.

```
POST /sync  { deviceId, cursor, events[] }
         →  { accepted[], events[], cursor, assignments[] }
```

### L'espace professeur ne passe plus par une autre porte

Rémy : « j'aimerai ne pas passer par admin et dans atout math sans passer par
la zone admin ». Il ne le pouvait pas : les pages `api/admin/` s'ouvrent avec
un cookie de session PHP que le jeton de l'application n'obtient pas, et
surtout **tous** les gestes qui écrivent n'existaient que là-bas.

Les routes JSON couvrent maintenant la conduite d'une classe, toutes derrière
`requireTeacher()` :

```
POST /teacher/class    rename | lock | notice | empty | delete
POST /teacher/roster   list | apercu | importer | code | codes | retirer | bloquer
POST /teacher/live     qui travaille, sur quoi, avec quelle réussite
POST /teacher/message  un mot à la classe ou à un élève, avec les accusés
POST /teacher/signup   list | create | remove — les comptes de professeurs
POST /teacher/override saut autorisé, exercice retiré, annulation
```

**Le modèle d'équipe tient en une phrase** : tous les professeurs sont égaux
**devant leurs classes** — chacun ne voit que les siennes, personne ne touche à
celles d'un autre —, et **un seul est responsable de l'installation**. Deux
gestes ne concernent pas une classe mais le serveur entier : créer ou retirer
un compte, et ouvrir le guichet des mises à jour (qui écrit des fichiers PHP,
donc donne le site). Ils reviennent au **fondateur**, qui se *déduit* — le
compte le plus ancien, celui qu'`install.php` a créé — plutôt que de s'écrire
dans une colonne qui pourrait se désaccorder avec la réalité. Rien à migrer, et
le fondateur ne peut pas se perdre : on refuse de retirer le dernier
professeur, et lui seul retire quelqu'un.

Retirer un collègue **ne détruit rien par défaut** : ses classes, ses élèves et
leur travail passent au fondateur. Les effacer demande le mot écrit.

**Une seule mise en œuvre, deux écrans.** Tout ce qui décide et tout ce qui
écrit vit dans `api/lib/eleves.php` — le sort d'une ligne de liste, l'aperçu,
l'import, les codes, le retrait, le direct — et les pages d'administration s'en
servent désormais elles aussi. Elles ne font plus que présenter. Écrire deux
fois cette logique, c'est se garantir qu'elles divergeront, et le jour venu on
ne saura pas laquelle des deux a abîmé des données d'élèves.

**Les cloisons entre professeurs sont vérifiées, route par route** (section
« Deux professeurs sur le même serveur » de `tools/testApi.php`). Cinq étaient
percées et sont fermées : `/teacher/assign` ne vérifiait ni la classe ni
l'élève visés, `/teacher/paths` laissait écraser le parcours d'un collègue par
son seul identifiant, `/teacher/student` rendait 500 au lieu de 404.

Identification des élèves : **code de classe + prénom**, sans mot de passe —
c'est ce qui permet de passer de l'école à la maison sans procédure. Le
compromis est assumé : ce n'est pas un dispositif d'examen surveillé. Voir
[api/README.md](../api/README.md) pour l'installation et le volet RGPD.

---

## 10. Tests

Les fonctions pures sont testées sous Node, sans navigateur ni build :

```
npm test     # node --test "tests/*.test.mjs"
```

Ce qui est couvert, et pourquoi c'est précisément ça :

| Fichier | Ce qui casserait sans lui |
|---|---|
| `projections.test.mjs` | score, carnet d'erreurs, reconstitution des sessions |
| `grading.test.mjs` | les trois règles de barème, les poids, le bilan par compétence |
| `mastery.test.mjs` | oubli, confiance, Leitner, remontée aux prérequis |
| `generators.test.mjs` | validité et reproductibilité de chaque question |
| `sync.test.mjs` | union des journaux, migration des parcours, codes de partage |

Le test des générateurs a immédiatement trouvé un vrai défaut (propositions en
double, et un distracteur parfois égal à la bonne réponse).

### Trois couches, et l'essai qui les fait se parler

`npm test` vérifie la page, `php tools/testApi.php` vérifie l'API et la base.
Chacune de son côté — et personne ne vérifiait qu'elles se PARLENT.

```
node tools/boutEnBout.mjs      # monte le site lui-même, puis le traverse
```

Un serveur PHP, une base SQLite neuve, un vrai navigateur, deux contextes
séparés — le poste du professeur et celui de l'élève. Le professeur
s'identifie, crée sa classe, colle sa liste, obtient les billets, donne un
parcours ; l'élève entre avec son identifiant et son code, fait le travail, se
synchronise ; le professeur regarde son bilan et son direct. On compte aussi
les fenêtres natives du navigateur : il doit y en avoir zéro.

Il a servi dès le premier jour. Il a trouvé que la pastille « en ligne » ne
s'allumait jamais : `last_seen_at` est une chaîne de date que l'API rendait
telle quelle, et la caster en entier donnait l'année. Le direct montrait
l'élève sur son exercice avec 2 sur 2, et le disait absent — un défaut
qu'aucun essai d'une seule couche ne pouvait voir.

### Ce qu'un test sous Node ne peut pas voir

Deux gardes relisent le SOURCE plutôt que d'exécuter du code, parce que les
défauts qu'ils cherchent ne lèvent aucune erreur — ils laissent seulement un
écran faux (`interfaceIds.test.mjs`) :

- un identifiant interrogé (`querySelector('#fq-consigne')`) qui n'est posé
  nulle part rend `null`, et le défaut n'apparaît que trois lignes plus loin ;
- une variable de couleur mal orthographiée (`var(--bg-main)` au lieu de
  `var(--bg-app)`) rend le panneau TRANSPARENT, sans rien casser.

### Le banc d'essai, et le balayage

Le reste — est-ce que l'indice AIDE, est-ce que le robot montre la bonne façon
de faire, est-ce que la fiche est imprimable telle quelle — ne se teste qu'en
regardant. Deux outils s'en chargent, et ils rendent le MÊME format de rapport,
si bien qu'ils se lisent et se fusionnent ensemble (`core/bancEssai.js`) :

| | Qui juge | Ce qu'il regarde |
|---|---|---|
| **Banc d'essai** (palette d'auteur → ✓) | un humain, sur son appareil | ça marche, les indices, le robot, la fiche, la mise en page, le classement |
| **Balayage** (`npm run balayage`) | la machine, sans surveillance | se lance sans erreur, dessine quelque chose, ne défile pas en largeur |

LA FICHE PART TOUTE VERTE, et l'on ne signale que les exceptions. Demander six
verdicts sur cent exercices, c'est six cents gestes : la passe s'arrête au
dixième. Or dans l'immense majorité des cas il n'y a rien à dire — et « rien à
dire » est une information, pas un vide à remplir. Le cas courant coûte donc UN
geste, « Tout bon → suivant », qui note et lance l'exercice d'après ; le
panneau de réglages est sauté, et le seul verdict que la machine pose seule est
« sans objet » sur la fiche papier, qu'elle sait détecter.

Le banc enchaîne jouer → fermer → noter tout seul, garde le carnet dans le
navigateur de l'appareil qui teste, et en sort un rapport par « Copier ». Il
enregistre l'APPAREIL et la VERSION chargée : sans eux, un défaut de mise en
page n'est pas reproductible, et un défaut déjà corrigé se signale sans fin
tant qu'un téléphone garde l'ancienne version en cache.

Le balayage demande `playwright-core` (outil d'auteur, pas dépendance de
l'application) :

```
npm install --no-save playwright-core
npm run balayage                # téléphone, tous les exercices → balayage.md
npm run balayage -- --large     # ajoute tablette et poste fixe
```

Il ferme chaque exercice PAR LA CROIX, comme un utilisateur : vider la zone de
jeu à la main laissait les moteurs animés écrire dans des nœuds disparus, et
l'outil inventait cinq pannes qui n'existaient pas.

---

## 11. Corrections apportées au passage

- `SequenceRunner.finishSequence` lisait `this.stats.startTime`, qui n'existait
  pas : `totalTime` valait `NaN` et le badge « Éclair » ne pouvait jamais
  tomber.
- `openGameLayer` écrivait `currentParams` et `isSingleExercise` **sur l'objet
  du catalogue partagé**, qui restait pollué pour toute la session.
- Un bloc de `builder.js` s'exécutait à l'import, hors de toute fonction.
- `math_crush` remontait la même réponse trois fois (`addScore`, `logAttempt`,
  `onGameAction`) : chaque réussite comptait triple dans les statistiques.
- Le carnet d'erreurs ne se rouvrait jamais après correction, même si l'élève
  refaisait la même faute.

---

## 12. Ce qui reste à faire

- Porter Memory et Météorites sur le contrat `Item` ; `core/generators.js`
  (couche de compatibilité) disparaîtra avec eux.
- Découper `index.html` (une vue par fragment) — utile à partir de la
  quatrième vue.
- Interface professeur pour le tableau de bord de classe : l'API existe
  (`/teacher/report`), le front reste à écrire.
- Héberger localement `localforage` et `canvas-confetti` : chargés depuis un
  CDN, ils manquent en salle sans réseau. `store.js` dégrade déjà proprement
  vers `localStorage`, mais mieux vaut ne pas en dépendre.
