# AtoutMath — comment on travaille ici

Logiciel de mathématiques écrit pour et avec **Rémy**, professeur de mathématiques
au collège. Tout ce qui s'écrit ici — code, commentaires, messages de commit,
interface — est **en français**.

JavaScript à modules natifs, aucune étape de construction. PHP + SQLite au
serveur. On n'ajoute pas de dépendance sans une raison qu'on peut écrire.

## 0. La ligne rouge

> « Je ne veux pas de construction géométrique avec des outils virtuels. Rien ne
> remplace le geste. Ce sera ma ligne rouge pour ce logiciel. »

Un élève ne trace pas à la souris ce qu'il doit tracer à la règle et au compas.
Voir `docs/architecture.md` §0. Le reste du logiciel peut être discuté ; pas ça.

## 1. Ce qu'il ne faut jamais faire

- **Aucune fenêtre native.** Rémy : « tu utilises des alert et prompt, on
  évite ! ». `showModal`, `showAlert`, `showToast` — jamais `alert`, `confirm`,
  `prompt`.
- **Ne jamais committer** `api/config.php`, `api/*.sqlite*`, `api/data/`,
  `api/.derniere-purge` : ils portent un secret et les données d'élèves réels.
  Ils sont dans `.gitignore`, qu'on ne contourne pas.
- **Ne jamais envoyer ses identifiants d'hébergement nulle part.** Ils vont dans
  les secrets GitHub, que lui seul remplit.
- **Ne jamais pousser sur une autre branche** que celle indiquée pour la tâche,
  et **ne pas ouvrir de pull request** sans qu'il le demande.

## 2. Le rituel de version, à chaque commit

Sans lui, le navigateur des élèves garde l'ancienne version et la correction
n'existe pas.

1. `?v=NNN` → `NNN+1` dans `index.html` **et** `sw.js` (six occurrences chacun) ;
2. `const CACHE = 'atoutmath-vNNN'` dans `sw.js` (numérotation indépendante) ;
3. `node tools/csp.mjs --ecrire` dès qu'un script en ligne a bougé.

## 3. Mesurer, puis corriger

Deux phrases apprises à leurs dépens :

> **Une mesure qui n'emprunte pas le chemin de l'utilisateur ne mesure pas son
> problème.**
>
> **Une mesure qui ne regarde que ce qu'on a corrigé ne voit pas ce qu'on a
> cassé.**

Donc : on ouvre l'application dans un vrai navigateur, on se connecte comme le
professeur ou comme l'élève, et l'on clique. Playwright est là pour ça :

```js
chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
```

`php tools/siteEssai.php <PORT>` monte un site d'essai complet et imprime une
ligne JSON avec `port`, `email: 'remy@essai.test'`, `mdp: 'motdepassetreslong'`.
Une sonde doit **s'identifier puis recharger la page**.

Les scripts jetables vivent dans `tools/tmp/` (ignoré par git). On garde ceux qui
mesurent quelque chose qu'on voudra remesurer.

## 4. Les trois harnais, avant chaque commit

| Commande | Ce qu'elle dit |
| --- | --- |
| `npm test` | ~4 min. **Ne jamais la passer dans `tail`** : rediriger vers un fichier, puis `grep -E "^# (pass\|fail\|tests)"`. |
| `php tools/testApi.php` | L'API, de bout en bout, sur une base neuve. |
| `node tools/boutEnBout.mjs` | Le verdict doit finir par « fenêtres natives et erreurs de page : 0 » **et** « TOUT SE SYNCHRONISE ». |

**On lit le verdict AVANT de committer**, pas après.

## 5. Les commentaires sont la moitié du travail

Ce dépôt explique chaque décision non évidente, à la place où elle se prend. Un
bon commentaire dit **pourquoi**, cite Rémy mot pour mot quand c'est lui qui a
tranché, et annonce ce qui a été **mesuré** — pas ce qu'on suppose.

```js
// ON NE DIT PLUS « attendu : 17 » SOUS UNE QUESTION QUI DEMANDE UNE FORMULE :
// l'élève lirait qu'il faut écrire 17, ce que ce niveau existe précisément
// pour empêcher. Rémy : « la bonne réponse est =A1+B1 pas 17 ».
```

Les messages de commit suivent la même règle : ce qui a été demandé, ce qui a
été mesuré avant, ce qui l'a été après.

## 6. Deux pièges qui ont coûté des heures

- **Le piège de l'accent grave.** Un accent grave (`` ` ``) dans un commentaire
  CSS ou HTML **à l'intérieur d'un gabarit** ferme le gabarit. Le message
  d'erreur désigne alors une ligne sans rapport. `node --check <fichier>` le
  trouve en une seconde ; on l'exécute après toute retouche d'un gros gabarit.
- **L'outil `Edit` ne sait pas remplacer** un texte contenant `«` `»` ou une
  espace insécable. Passer par un script Python en `tools/tmp/`, avec
  `assert s.count(old) == 1` avant chaque remplacement — **et penser à exécuter
  le script**, ce qui a été oublié deux fois. Si un `assert` tombe au milieu,
  **aucun** des remplacements précédents n'est enregistré.

## 7. Le journal des frictions

> Idée soumise par Rémy : « dès que l'agent repère des points de friction entre
> tes demandes et les outils à sa disposition pour les réaliser, il doit les
> noter dans un journal dédié. »

Quand une tâche coûte nettement plus cher qu'elle ne devrait — un piège
retrouvé, un rituel refait à la main, une mesure impossible à obtenir autrement
qu'en réécrivant la même sonde, un aller-retour évitable — **on l'écrit dans
`docs/frictions.md`** avant de passer à la suite. Une ligne suffit ; le format
est décrit en tête du fichier.

On ne note pas ses propres étourderies isolées : on note ce qui se **répétera**.

Quand Rémy le décide, `/distill` lit ce journal et fabrique les outils qui
manquent. Le journal ne sert à rien s'il n'est pas nourri au moment où la
friction se produit — après, on ne s'en souvient plus.
