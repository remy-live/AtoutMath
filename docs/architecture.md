# Architecture d'AtoutMath

Ce document explique **pourquoi** le code est organisé ainsi. Pour la liste des
fichiers, lisez le code ; pour comprendre où ajouter quelque chose, lisez ceci.

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

### Les jeux autonomes

Tetris, Course, Memory, Météorites, Labyrinthe, Math Crush portent leur propre
logique de plateau : ils ne consomment pas d'`ItemSession`. Ils restent
intégrés en déclarant leurs réponses via `BaseGame.onCorrectAnswer` /
`onWrongAnswer`, donc ils alimentent identiquement statistiques, carnet
d'erreurs et notes.

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

---

## 9. Le serveur PHP est optionnel

L'application est **local-first** : elle fonctionne intégralement hors ligne, le
serveur n'est jamais une dépendance de rendu. Il ne fait que deux choses :
recevoir des événements, et en renvoyer.

```
POST /sync  { deviceId, cursor, events[] }
         →  { accepted[], events[], cursor, assignments[] }
```

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
