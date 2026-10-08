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
n'existe pas. **Une commande le fait en entier :**

```sh
node tools/version.mjs        # et `--dire` pour savoir où l'on en est
```

Elle monte `?v=NNN` dans `index.html` **et** `sw.js` (six occurrences chacun),
monte `const CACHE = 'atoutmath-vNNN'` dans `sw.js` (numérotation indépendante),
lance `node tools/csp.mjs --ecrire`, relit les fichiers sur le disque, et imprime
la ligne à recopier dans le message de commit. Elle **refuse de monter quoi que
ce soit** si elle ne trouve pas six occurrences par fichier ou si les deux
fichiers divergent : un rituel à moitié fait est pire que pas de rituel.

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

**On n'écrit plus une sonde à la main :** `tools/sonde.mjs` porte tout ce qu'on
réécrivait à chaque fois, et chacune de ses lignes ferme une friction payée.

```js
import { ouvrirSonde } from './tools/sonde.mjs';
const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });  // < 768 px → au doigt
await s.identifier();                       // s'identifie PUIS recharge
await s.ouvrirExercice('calc-add');         // monte le meneur, clique « JOUER »
await s.photo('.title', 'tools/tmp/t.png'); // découpe la page, dit si l'image est UNIE
await s.contrasteRendu('.title');           // sur les PIXELS, donc lit les color-mix
await s.doitExister('.game-question');      // JETTE si le crochet ne désigne rien
await s.fermer();                           // ne tue que SON serveur
```

`doitExister` ferme la friction la plus chère du dépôt : **un sélecteur inventé
rend `false`, c'est-à-dire la même réponse qu'un logiciel cassé** — on cherche
alors le défaut dans le code pendant vingt minutes. Quinze occurrences avant
lui. On l'emploie sur tout crochet qu'on n'a pas LU dans la source.

`s.page` reste la page Playwright pour tout le reste ; `s.erreurs` et
`s.fenetresNatives` se remplissent tout seuls.

Et pour **regarder** une feuille imprimée — compter les segments d'un PDF dit
qu'il n'est pas vide, jamais qu'il est juste :

```sh
node tools/pdfEnImage.mjs <fiche.pdf> <image.png> [échelle] [page]
```

À la main, `php tools/siteEssai.php <PORT>` monte un site d'essai complet et
imprime une ligne JSON avec `port`, `email: 'remy@essai.test'`,
`mdp: 'motdepassetreslong'` — et une sonde doit alors **s'identifier puis
recharger la page**, sans quoi elle mesure le portail.

Les scripts jetables vivent dans `tools/tmp/` (ignoré par git). On garde ceux qui
mesurent quelque chose qu'on voudra remesurer.

## 4. Les trois harnais, avant chaque commit

| Commande | Ce qu'elle dit |
| --- | --- |
| `npm test` | ~4 min. **Ne jamais la passer dans `tail`** : rediriger vers un fichier, puis `grep -E "^# (pass\|fail\|tests)"`. |
| `php tools/testApi.php` | L'API, de bout en bout, sur une base neuve. |
| `node tools/boutEnBout.mjs` | Le verdict doit finir par « fenêtres natives et erreurs de page : 0 » **et** « TOUT SE SYNCHRONISE ». |

**On lit le verdict AVANT de committer**, pas après.

### Une épreuve neuve se voit échouer avant qu'on la croie

Deux fois dans la même journée, une épreuve écrite pour garder une règle ne
gardait rien et passait au vert. Une épreuve verte qui ne garde rien donne une
assurance qui n'existe pas — c'est pire que pas d'épreuve.

```sh
node tools/epreuveTombe.mjs <essai> <source> <ancien> <nouveau>
node tools/epreuveTombe.mjs <essai> <source> --depuis <paires.json>   # multiligne
```

Il remet le défaut dans le code, relance l'épreuve, **exige qu'elle tombe**, et
remet le fichier comme il était quoi qu'il arrive.

## 3 bis. Quand Rémy envoie une de ses séances

> « je peux te donner ma séance et tu vérifies si tout est ok. »

```sh
node tools/relireUneSeance.mjs <fichier.json>
```

Il accepte ce que le logiciel accepte (`lireLeFichier`) : enveloppe de
bibliothèque, parcours nu, fichier exporté par « Gérer ». Il dit les étapes
déclarées **et** celles réellement traversées — la différence est toujours
intéressante —, le total, le barème, la durée estimée, puis il avertit sur ce
qui se voit mal : un mot vide, un mot resté en dernière position, un seuil
au-dessus du nombre de questions, un exercice disparu du catalogue, une séance
qui déborde de l'heure. Il ne juge pas le CHOIX des exercices : c'est le métier
de Rémy.

C'est ainsi qu'on a trouvé, dans sa séance « Relatifs », un mot aux titre et
texte vides — invisible dans une liste de seize lignes.

## 4 bis. Avant d'ajouter un exercice au catalogue

```sh
node tools/nouvelExercice.mjs [identifiant]
```

Deux cents millisecondes, et il dit ce que `npm test` mettrait quatre minutes à
dire sans expliquer comment le corriger : la compétence citée existe-t-elle, le
code dicté tient-il dans l'alphabet à 23 lettres (**ni I, ni O, ni Q**), un
fichier de `js/data/` importe-t-il un module de `js/games/` (ce qui fait tomber
TOUS les tests sur « document is not defined »), et les jetons de couleur
employés sont-ils déclarés quelque part.

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
  d'erreur désigne alors une ligne sans rapport. **Un `hook` s'en charge
  maintenant** : `tools/hooks/verifierSyntaxe.sh` passe `node --check` sur tout
  fichier JavaScript écrit, se tait quand tout va bien, et rend la piste quand
  l'erreur désigne une ligne qui n'a rien à voir. Sept occurrences avant lui.
- **On écrit les caractères français DIRECTEMENT**, jamais en séquences
  d'échappement : l'outil d'écriture transforme `\u2019` en apostrophe au moment
  d'écrire, et le script de retouche qui cherche la séquence littérale ne trouve
  alors plus rien. Dans le doute, relire le fichier avant de le retoucher.
- **L'outil `Edit` ne sait pas remplacer** un texte contenant `«` `»` ou une
  espace insécable. On ne réécrit plus le script Python de cinq lignes :

  ```sh
  node tools/remplacer.mjs <fichier> <ancien> <nouveau> [...]
  node tools/remplacer.mjs <fichier> --depuis <paires.json>   # pour du multiligne
  ```

  Il compte **avant** d'écrire, n'écrit qu'une fois tout vérifié (donc jamais à
  moitié), refuse zéro occurrence, et repasse `node --check` en remettant le
  fichier si la syntaxe ne tient plus.

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
