# Après quatre séances en classe — 11 octobre 2026

Écrit ici **avant** d'être traité, comme toujours. Ce n'est pas un défaut
signalé : c'est une observation de terrain, et une question.

> « J'ai fait quatre séances. Ça s'est super bien passé mais les élèves en
> difficulté font parfois la même bêtise plusieurs fois d'affilée et aussi ne
> clique pas sur indice ou aide. Ton avis. Je leur dis évidemment mais l'idée
> est l'autonomie. »

---

## Ce que le logiciel fait aujourd'hui — lu dans le code, pas supposé

### 1. Il n'a aucune mémoire ENTRE deux questions

`itemSession._finirItem()` remet à zéro, à chaque nouvelle question :

```js
this.attemptIndex = 0;
this.hintIndex = 0;
this.eliminated = new Set();
```

Le logiciel se souvient de tout **à l'intérieur** d'une question — les essais,
les aides prises, les réponses déjà éliminées — et de tout **après** la séance
(le carnet d'erreurs, `state.recordAttempt`). Entre les deux, rien.

**Conséquence directe de ce que Rémy observe** : un élève qui vient de faire
trois fois la même erreur est accueilli par la quatrième question exactement
comme celui qui a tout juste. La répétition est invisible au logiciel au seul
moment où il pourrait agir.

### 2. Le diagnostic existe, et il est jeté

`evaluate()` rend un `misconception` : la phrase du distracteur choisi, « tu as
raison, un diamètre EST une corde, mais… ». Il est **affiché une fois**, puis
**enregistré** pour le carnet. Rien ne compare celui d'aujourd'hui à celui d'il
y a trente secondes. La deuxième fois, l'élève lit mot pour mot ce qu'il vient
de lire — et une phrase qu'on relit à l'identique, on ne la relit pas.

### 3. En entraînement, l'indice COÛTE des points

| | `hintPenalty` |
| --- | --- |
| apprentissage | **0** — « les aides ne coûtent rien : on apprend » |
| entraînement (le défaut) | **0,25** par aide, jusqu'à −70 % |

L'intention est déjà écrite dans le dépôt pour l'apprentissage ; elle ne
traverse pas jusqu'à l'entraînement, qui est le mode d'une séance ordinaire.
On demande donc à l'élève le plus fragile de PAYER la chose dont il a le plus
besoin.

### 4. Ce que j'allais dire et qui est FAUX

J'allais accuser le tirage adaptatif de reservir la notion qu'on vient de
rater — ce qui aurait expliqué la répétition. **Vérifié : non.** `adaptive`
ne transmet au générateur que `weakTables`, les tables de multiplication
fragiles, et sur l'historique long. Il ne repose pas la question ratée. La
répétition vient des élèves, pas d'un biais du logiciel.

### 5. Un détail qui compte, et qui va dans le bon sens

À la PREMIÈRE erreur, le logiciel pousse déjà quelque chose sans qu'on le lui
demande : `verdict.misconception || prochainIndice || 'Ce n'est pas ça.'`
Donc l'élève qui ne clique jamais sur « Un indice » n'est pas totalement sans
aide. Mais remarquer l'ordre : **quand il y a un diagnostic, l'indice n'est pas
poussé** — et au deuxième essai, c'est fini, on révèle.

---

## Mon avis

**Le bouton n'est pas le problème ; le MOMENT l'est.** Pour appuyer sur « Un
indice », il faut savoir qu'on en a besoin. Un élève qui refait la même erreur
ne doute pas : il se croit juste. Il ne lui manque pas la bonne volonté, il lui
manque le SIGNAL. Et l'autonomie que Rémy vise ne s'obtient pas en demandant
plus souvent, elle s'obtient quand l'élève **remarque lui-même** qu'il
recommence.

Donc : ne pas rendre l'aide plus insistante — rendre la RÉPÉTITION visible.

### Ce que je propose, dans l'ordre

1. **Une mémoire courte de la séance** (`js/core/`, éprouvable sans
   navigateur) : les derniers diagnostics, et les échecs par compétence sur les
   dernières questions. Invisible en soi ; c'est le socle des deux suivants.

2. **La même bêtise deux fois doit S'ENTENDRE autrement.** Quand le même
   diagnostic revient, la phrase change de registre : « C'est la même chose
   qu'à la question d'avant » PUIS la règle. Nommer la répétition est tout
   l'enseignement — c'est exactement ce que Rémy fait de vive voix, et c'est la
   seule partie de son geste que le logiciel peut reprendre.

3. **L'aide vient AVANT l'erreur, pas après.** Après deux échecs de suite sur
   la même compétence, la question suivante s'ouvre avec son premier indice
   **déjà posé** à côté de l'énoncé. Pas une fenêtre, pas un clignotement : le
   professeur qui passe derrière un élève n'attend pas d'être appelé. Et un
   indice qu'on n'a pas demandé ne doit rien coûter.

4. **À discuter avec lui** : `hintPenalty` à 0,25 en entraînement. Je mettrais
   l'indice OFFERT à 0 et garderais un coût à l'indice DEMANDÉ — mais c'est son
   affaire, puisque c'est le sens de la note qui est en jeu.

### Ce que je ne ferais pas

- Faire clignoter le bouton, ou relancer l'élève : on lui apprend à attendre.
- Donner la réponse plus tôt. Le dépôt a déjà payé cette leçon une fois
  (« ON NE DONNE PAS LA RÉPONSE TANT QU'IL LUI RESTE UN ESSAI »).

### Et d'abord, mesurer

Le carnet enregistre déjà `misconception` à chaque essai. Avant de décider des
seuils (deux échecs ? trois ?), le plus honnête est de compter sur SES quatre
séances : combien de fois le même diagnostic revient d'affilée, et combien
d'indices sont demandés par élève. Un outil qui lit ce que l'application garde
déjà et n'imprime que des comptes — aucun nom, aucune donnée d'élève ne sort de
chez lui.
