# Le journal des frictions

Idée de Rémy : « dès que l'agent repère des points de friction entre tes
demandes et les outils à sa disposition pour les réaliser, il doit les noter
dans un journal dédié. »

**Ce qu'on note ici** : ce qui a coûté nettement plus cher que la tâche ne le
méritait, et qui **se reproduira** — un piège qu'on retrouve, un rituel refait à
la main, une mesure qu'on ne peut obtenir qu'en réécrivant la même sonde, un
aller-retour évitable avec Rémy.

**Ce qu'on ne note pas** : une étourderie isolée, un bogue du logiciel (il va
dans le code et dans un test), une idée d'amélioration du produit (elle se
discute avec Rémy).

**Quand** : au moment où ça arrive. Après, on ne s'en souvient plus — et une
friction qu'on ne peut plus décrire ne se corrige pas.

**Format** : un titre en gras, la date, puis quatre lignes.

- *Ce que je voulais faire* — la tâche, pas l'outil.
- *Ce qui a coûté* — en minutes, en allers-retours, en essais ratés. Chiffré.
- *Combien de fois* — une marque par récidive, pour qu'on voie les habitués.
- *Ce qui manque* — l'outil qu'on aurait voulu avoir. Une phrase, pas un devis.

`/distill` lit ce fichier, regroupe ce qui se ressemble et fabrique ce qui
manque.

---

## **Le rituel de version se refait à la main à chaque commit** — 2026-09-26

- **Ce que je voulais faire** : livrer une correction.
- **Ce qui a coûté** : trois `sed`, un `grep -c` de vérification et un appel à
  `tools/csp.mjs`, à chaque commit. Environ une minute, mais surtout une
  occasion d'oublier — et un `?v=` oublié, c'est une correction que les élèves
  ne reçoivent jamais.
- **Combien de fois** : ||||  (quatre commits dans la seule journée du 26)
- **Ce qui manque** : une commande qui monte les deux numéros, relance
  `csp.mjs`, et vérifie que les six occurrences de chaque fichier ont bougé.

## **L'outil `Edit` ne sait pas éditer le français du dépôt** — 2026-09-26

- **Ce que je voulais faire** : remplacer un texte contenant des guillemets
  français ou une espace insécable.
- **Ce qui a coûté** : l'outil échoue sans expliquer, on écrit alors un script
  Python jetable dans `tools/tmp/` avec ses `assert`. Deux fois, le script a été
  écrit et **pas exécuté** : le fichier n'avait pas bougé, et l'erreur suivante
  était incompréhensible.
- **Combien de fois** : |||||||  (sept scripts de ce genre dans la journée)
- **Ce qui manque** : un script unique qui prend un fichier, une paire
  ancien/nouveau, vérifie l'unicité, écrit, **et** passe `node --check` — pour
  qu'écrire et exécuter ne soient plus deux gestes.

## **Le piège de l'accent grave revient** — 2026-09-26

- **Ce que je voulais faire** : ajouter un commentaire HTML dans un gabarit.
- **Ce qui a coûté** : `SyntaxError` désignant une ligne sans rapport, puis la
  recherche. Environ dix minutes la première fois ; deux minutes depuis qu'on
  sait.
- **Combien de fois** : ||  (spreadsheet.js, puis espaceClasses.js)
- **Ce qui manque** : un `node --check` automatique sur tout fichier modifié,
  avant même d'essayer de lancer quoi que ce soit.

## **Chaque sonde de navigateur repart de zéro** — 2026-09-26

- **Ce que je voulais faire** : mesurer un comportement dans le vrai navigateur.
- **Ce qui a coûté** : quarante lignes recopiées à chaque fois — démarrer
  `siteEssai.php`, lire sa ligne JSON, lancer Chromium, s'identifier, recharger,
  écouter `pageerror` et `dialog`. Les erreurs se répètent aussi : mauvais nom de
  fonction d'identification, sélecteur de bouton absent, classe fermée à
  l'inscription libre.
- **Combien de fois** : |||||||||||  (onze sondes ; les deux dernières ont
  retrouvé exactement les mêmes pièges)
- **Ce qui manque** : un module `tools/sonde.mjs` qui rende une page déjà
  identifiée — professeur **ou** élève, billet compris — et qui collecte seul
  les erreurs de page et les fenêtres natives.
- **DEUX PIÈGES DE PLUS, retrouvés le 26 au soir** en écrivant
  `tools/memeQuestion.mjs`, et qui appartiennent au même module manquant :
  `#top-btn-classe` ramène à la LISTE des classes, pas dans la classe — il faut
  rouvrir la carte ensuite, sans quoi `.ec-rang` n'existe pas et la sonde accuse
  le logiciel de son propre égarement ; et `runner.finish()` seul laisse
  `#game-layer` affiché (il porte le bilan), couche qui **intercepte tous les
  clics** — il faut `exit()`. Trois quarts d'heure pour ces deux-là, dont une
  fausse accusation portée contre du code juste.

## ~~Ajouter un exercice au catalogue casse quatre choses invisibles~~ — 2026-09-26

- **Ce que je voulais faire** : ajouter Le Patchwork au catalogue.
- **Ce qui a coûté** : QUATRE passages de `npm test` de quatre minutes chacun,
  soit seize minutes d'attente, pour découvrir une à une des règles qu'aucun
  message ne dit à l'avance : la compétence citée doit exister dans
  `js/data/skills.js` ; le code dicté doit tenir dans l'alphabet à 23 lettres
  (ni I, ni O, ni **Q** — ce qui faisait silencieusement retomber l'exercice sur
  le format long, et cassait deux tests sans rapport apparent) ; un fichier de
  `js/data/` ne doit jamais importer un module de `js/games/` (sinon dix-neuf
  fichiers de tests tombent sur « document is not defined ») ; et les jetons de
  couleur employés doivent exister dans `css/base.css`.
- **Combien de fois** : |
- **Ce qui manque** : une commande `node tools/nouvelExercice.mjs <id>` qui
  vérifie ces quatre points en deux secondes, avant de lancer les quatre
  minutes. Les quatre règles sont déjà testées : il s'agit de les rendre
  interrogeables une par une.
- **TRAITÉE** le 2026-09-26 : `tools/nouvelExercice.mjs` existe. MESURÉ en
  réintroduisant chaque faute une par une — code hors alphabet 199 ms, code
  déjà pris 207 ms, compétence inexistante 206 ms, fichier de données qui
  importe un jeu 54 ms, jeton de couleur inconnu 225 ms. Chacune est nommée
  avec ce qu'il faut faire. À comparer aux quatre minutes du harnais complet,
  qui disait la même chose sans dire comment la corriger.
- **CE QUE L'OUTIL A APPRIS DE LUI-MÊME** : sa première version lisait les
  fichiers à l'expression régulière et rendait **1214 problèmes, tous faux** —
  elle prenait les identifiants de réglages pour des exercices et ne voyait
  aucune compétence. Un outil qui fait gagner du temps en rendant mille fausses
  pistes en fait perdre. Il IMPORTE donc les modules au lieu de les deviner, et
  il ramasse les jetons de couleur dans tout `css/`, pas seulement dans
  `base.css`.

## **L'outil d'écriture réécrit mes séquences d'échappement** — 2026-09-26

- **Ce que je voulais faire** : écrire un fichier JavaScript contenant `\u2019`
  en toutes lettres, puis le retoucher par script.
- **Ce qui a coûté** : l'outil a transformé `\u2019` en apostrophe typographique
  à l'écriture. Le script de retouche, qui cherchait la séquence littérale, n'a
  rien trouvé — et l'`assert` a tout annulé. Deux allers-retours pour comprendre
  que le fichier sur le disque ne contenait pas ce que je croyais y avoir mis.
- **Combien de fois** : ||
- **Ce qui manque** : une règle simple, à écrire dans le `CLAUDE.md` une fois
  qu'on l'aura vérifiée — on écrit les caractères français DIRECTEMENT, jamais
  en séquences d'échappement, et l'on relit le fichier avant de le retoucher.

## **Retoucher un fichier pendant que le harnais tourne invalide la mesure** — 2026-09-26

- **Ce que je voulais faire** : occuper les quatre minutes de `npm test` en
  relisant le code que je venais d'écrire.
- **Ce qui a coûté** : j'y ai trouvé deux petites choses (une variable annulée
  par `void`, une étiquette de palier qui annonçait « quatre relations » pour
  trois) et je les ai corrigées — pendant le passage. Le verdict « 3900 tests,
  0 échec » ne portait donc plus sur l'arbre qu'on allait committer : quatre
  minutes de plus pour remesurer. Le harnais ne dit rien de cet écart, et rien
  n'empêche de committer le verdict d'un autre arbre.
- **Combien de fois** : |
- **Ce qui manque** : que le harnais enregistre l'empreinte de l'arbre qu'il a
  mesuré, et qu'une commande de fin de course refuse de committer si l'arbre a
  bougé depuis — au lieu de compter sur ma mémoire.

## **Un essai unitaire ne voit pas deux unités de temps qui se croisent** — 2026-09-26

- **Ce que je voulais faire** : faire voyager un horodatage du navigateur de
  l'élève jusqu'à la fiche du professeur.
- **Ce qui a coûté** : rien du tout côté essais — les onze essais de
  `tests/ecran.test.mjs` passaient, et l'API passait ses 341 vérifications. Le
  relevé partait en MILLISECONDES (`Date.now()`), l'API le rendait en SECONDES
  (sa convention, « voir `instantDe` »), et la fiche jugeait donc tout relevé
  vieux de cinquante ans : elle restait muette devant une donnée parfaitement
  valide. Seule la sonde de navigateur l'a vu, parce qu'elle est la seule à
  regarder les DEUX côtés à la fois.
- **Combien de fois** : |
- **Ce qui manque** : que les deux côtés ne puissent pas se contredire — un nom
  de champ qui porte son unité (`tsMs` / `tsS`), ou une vérification de harnais
  qui compare ce que le client écrit et ce que le serveur rend, champ par champ,
  pour tout ce qui traverse.

## **J'ai cru un outil sur parole, et j'ai accusé du code juste** — 2026-09-26

- **Ce que je voulais faire** : dire à Rémy ce qui restait à réparer.
- **Ce qui a coûté** : `apercusVides.mjs` signalait huit aperçus « vides ». Je
  lui ai rapporté trois d'entre eux comme des défauts à corriger. **Aucun ne
  l'était** : `frac-samurai` montre sa fraction et son bouton, `geo-patrons`
  montre le cube plié en trois dimensions, et `geo-atelier-instruments` charge
  son plan dans une IFRAME que l'heuristique ne peut pas voir — 1409 nœuds et
  159 dessins dedans. Il a fallu ouvrir les images pour s'en apercevoir. Coût :
  une fausse alerte transmise à Rémy, et trois réparations qui n'avaient pas
  lieu d'être.
- **Combien de fois** : ||  (déjà payée par `nouvelExercice.mjs` et ses 1214
  faux problèmes, dont le commentaire dit exactement cela)
- **Ce qui manque** : une règle pour les outils de ce dépôt, et pas seulement
  pour celui-ci — **un outil qui accuse imprime la pièce**. `apercusVides.mjs`
  disait « vide » sans jamais montrer ce qu'il avait trouvé ; il imprime
  maintenant le texte de l'aperçu, et l'on voit tout de suite qu'il se trompe.
  Et le corollaire, qui est pour moi : on ne rapporte pas le verdict d'un outil
  à Rémy sans avoir regardé la chose elle-même.
