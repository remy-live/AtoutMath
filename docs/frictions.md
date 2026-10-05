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

## ~~Le rituel de version se refait à la main à chaque commit~~ — 2026-09-26

- **Ce que je voulais faire** : livrer une correction.
- **Ce qui a coûté** : trois `sed`, un `grep -c` de vérification et un appel à
  `tools/csp.mjs`, à chaque commit. Environ une minute, mais surtout une
  occasion d'oublier — et un `?v=` oublié, c'est une correction que les élèves
  ne reçoivent jamais.
- **Combien de fois** : ||||  (quatre commits dans la seule journée du 26)
- **Ce qui manque** : une commande qui monte les deux numéros, relance
  `csp.mjs`, et vérifie que les six occurrences de chaque fichier ont bougé.

- **REMPLACÉE PAR `node tools/version.mjs`** — 2026-09-28. Une commande fait les trois gestes : `?v=` +1 dans les deux fichiers, `CACHE` +1 dans `sw.js`, et `node tools/csp.mjs --ecrire`. Elle COMPTE les occurrences (six par fichier) et refuse de monter quoi que ce soit si elle en trouve un autre nombre, si les deux fichiers divergent, ou si la relecture sur disque ne retrouve pas les nouveaux numéros — un rituel à moitié fait est pire que pas de rituel. MESURÉ : le commit v851 → v852 l'a employée, elle a rendu la ligne à recopier dans le message de commit.

## ~~L'outil `Edit` ne sait pas éditer le français du dépôt~~ — 2026-09-26

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

- **REMPLACÉE PAR `node tools/remplacer.mjs`** — 2026-09-28. Elle prend un fichier et des paires, compte AVANT d'écrire, n'écrit qu'une fois tout vérifié (donc jamais à moitié), refuse zéro occurrence, et passe `node --check` sur les fichiers JavaScript en remettant le fichier si la syntaxe ne tient pas. MESURÉ sur un texte portant `«  »` et une espace insécable : remplacé du premier coup ; sur un motif absent : refusé, rien d'écrit.

## ~~Le piège de l'accent grave revient~~ — 2026-09-26

- **Ce que je voulais faire** : ajouter un commentaire HTML dans un gabarit.
- **Ce qui a coûté** : `SyntaxError` désignant une ligne sans rapport, puis la
  recherche. Environ dix minutes la première fois ; deux minutes depuis qu'on
  sait.
- **Combien de fois** : ||  (spreadsheet.js, puis espaceClasses.js)
- **Ce qui manque** : un `node --check` automatique sur tout fichier modifié,
  avant même d'essayer de lancer quoi que ce soit.

- **FERMÉE PAR UN HOOK** — 2026-09-28. `tools/hooks/verifierSyntaxe.sh` passe `node --check` sur tout fichier JavaScript écrit, en `PostToolUse` sur `Edit` et `Write`. Il se tait quand la syntaxe tient, et quand elle ne tient pas il rend le message de node SUIVI de la piste — parce que ce message désigne souvent une ligne sans rapport. MESURÉ dans les deux sens sur un gabarit contenant un accent grave dans un commentaire : refusé avec la piste, et silence sur un fichier sain. Sept occurrences dans ce dépôt avant lui.

## ~~Chaque sonde de navigateur repart de zéro~~ — 2026-09-26

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

- **REMPLACÉE PAR `tools/sonde.mjs`** — 2026-09-28. `ouvrirSonde()` monte le site d'essai, ouvre Chromium au bon chemin, met `hasTouch`/`isMobile` PAR DÉFAUT sous 768 px, écoute les erreurs de page et les fenêtres natives, et ne tue à la fin que le serveur qu'elle a lancé. `identifier()` s'identifie PUIS RECHARGE. `photo()` découpe la page (jamais l'élément) et COMPTE LES TEINTES pour refuser une image unie. `contrasteRendu()` mesure sur les PIXELS, donc lit les fonds en `color-mix` que `getComputedStyle` ne rend pas en `rgb()`. MESURÉ : la mesure du titre dans cinq thèmes, qui avait coûté trois allers-retours le matin, tient en douze lignes et rend 7,42 · 8,12 · 6,95 · 6,46 · 6,65 avec des photos non vides.

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

## **Une grille se défait en silence quand on lui ajoute un enfant** — 2026-09-26

- **Ce que je voulais faire** : ajouter une case à cocher dans la ligne d'élève
  du direct, pour donner la calculatrice à des élèves choisis.
- **Ce qui a coûté** : la ligne est une grille de CINQ colonnes ; la case en a
  fait un sixième enfant, et tout ce qui suivait est passé à la rangée
  implicite. Résultat mesuré par un agent : des lignes de 129 px et de 64 px
  l'une sous l'autre, et les deux boutons à cinq cents pixels de leur nom. Rien
  ne l'a dit — ni les 3 900 essais, ni les trois harnais. **Et le commentaire
  juste au-dessus de la règle CSS décrivait exactement cette panne et la disait
  réparée** : elle l'était, pour cinq enfants. Je l'ai relue sans la voir.
- **Combien de fois** : ||  (la même grille, deux fois : le score, puis la case)
- **Ce qui manque** : une mesure de RENDU dans les harnais. Les trois qu'on a
  regardent le code, l'API et la synchronisation ; aucun ne regarde l'écran. Un
  balayage « toutes les largeurs × tous les écrans » qui compte les débordements
  et les cibles trop petites — ce que l'agent a écrit en une soirée dans
  `tools/tmp/auditProf-mesure.mjs` — devrait tourner avant chaque commit qui
  touche à une mise en page. En attendant, une règle qui coûte peu : **quand on
  ajoute un enfant à une grille, on place les cases explicitement** plutôt que
  de compter sur l'ordre — c'est ce qui a été fait ici.

## **`fullPage: true` ment partout où le défilement n'est pas sur le document** — 2026-09-26

- **Ce que je voulais faire** : capturer un écran entier du professeur.
- **Ce qui a coûté** : dans l'espace du professeur, c'est `#zone-classe` qui
  porte le défilement, pas le document. `page.screenshot({ fullPage: true })` ne
  rend donc que la fenêtre, sans le dire. Un premier passage d'audit complet a
  été perdu là-dessus.
- **Combien de fois** : |
- **Ce qui manque** : que la sonde partagée (celle du point « chaque sonde de
  navigateur repart de zéro ») capture par ÉLÉMENT après l'avoir amené sous les
  yeux, jamais par `fullPage`.

## **Un jeton de couleur fait pour le texte ne va pas sous du blanc** — 2026-09-26

- **Ce que je voulais faire** : colorer un bouton et deux cartes.
- **Ce qui a coûté** : trois contrastes sous le seuil, trouvés par un agent et
  pas par nous — « Commencer » à **1,99** en thème sombre (lavande pâle sur
  pastille blanche), les cartes « découverte » et « révision » à **2,54** et
  **2,15**, la barre de progression à **2,6**. Chaque fois la même erreur :
  prendre `--primary-texte` ou `--success` pour un fond. Et `css/base.css`
  décrit DÉJÀ ce piège en toutes lettres — « le remède évident était un
  piège » — et a posé `--success-fond`, `--danger-fond`, `--warning-fond` pour
  exactement cela. Ils existaient ; personne ne les a employés.
- **Combien de fois** : ||||
- **Ce qui manque** : une vérification de contraste dans le harnais, qui lise
  la couleur RENDUE et non `backgroundColor` — l'agent a écarté quatre faux
  positifs sur six parce que ce dépôt emploie beaucoup de dégradés et de
  `color-mix`, invisibles à une lecture de propriété.

## **Le centrage en flex mange le haut, et on le repaie écran par écran** — 2026-09-26

- **Ce que je voulais faire** : centrer un contenu dans une zone qui défile.
- **Ce qui a coûté** : quatre écrans distincts avec la même panne, trouvés en un
  soir — la porte d'entrée (titre à **y = −92** sur un téléphone, jusqu'à 288 px
  perdus avec le repli ouvert), l'écran de leçon (**494 px** au-dessus du
  premier pixel lisible), la zone de jeu et les fenêtres. Un contenu centré qui
  dépasse déborde des DEUX côtés, et la moitié du haut passe au-dessus de
  `scrollTop = 0` : ce n'est pas du contenu à faire défiler, c'est du contenu
  PERDU. Deux de ces quatre écrans portaient déjà le commentaire qui explique le
  piège, et le remède — `safe center` — appliqué à côté.
- **Combien de fois** : ||||
- **Ce qui manque** : que `align-items: center` et `justify-content: center` ne
  s'écrivent plus jamais seuls sur un conteneur qui défile. Une vérification qui
  lit les feuilles de style et signale la paire `overflow: auto` + `center` sans
  `safe` coûterait dix lignes et fermerait la famille entière.

## **Le navigateur décide où l'on regarde, et personne ne le lui a retiré** — 2026-09-27

- **Ce que je voulais faire** : ouvrir une fenêtre de bilan en haut.
- **Ce qui a coûté** : deux tentatives. Poser `scrollTop = 0` à la pose ne suffit
  pas — le panneau grandit après (la porte du bac, les tuiles, les barres de
  maîtrise) et l'ancrage de défilement de Chromium SUIT le contenu. Remesuré :
  `scrollTop` revenait à 286 sur 286 de réserve. Il a fallu `overflow-anchor:
  none` EN PLUS de trois remises en haut.
- **Combien de fois** : |
- **Ce qui manque** : que `overflow-anchor: none` accompagne toute fenêtre qu'on
  ouvre et dont le contenu se complète après la pose. C'est la même famille que
  le centrage en flex : une valeur par défaut du navigateur, raisonnable
  ailleurs, fausse ici.

## **Une cible tactile ne se mesure pas avec une souris** — 2026-09-27

- **Ce que je voulais faire** : vérifier que les boutons font 44 px.
- **Ce qui a coûté** : deux agents sur quatre ont d'abord rendu des listes
  entières de faux défauts — trente-deux boutons d'un côté, quatorze de
  l'autre — parce que le plancher de 44 px de ce dépôt vit sous
  `@media (pointer: coarse)`, et qu'un Chromium de bureau rétréci à 360 px
  annonce un pointeur FIN. Ils mesuraient une fenêtre étroite, pas un téléphone.
  Deux heures perdues d'un côté, quarante mesures à refaire de l'autre. Et
  `js/app.js` a la même condition pour la présentation téléphone : sans
  `hasTouch`, on ne mesure même pas la bonne mise en page.
- **Combien de fois** : ||
- **Ce qui manque** : que `hasTouch: true, isMobile: true` soit le DÉFAUT de
  toute sonde de mise en page sous 768 px — c'est fait dans
  `tools/ouvrirExercice.mjs`, à généraliser au module de sonde partagé quand il
  existera. Et qu'une sonde qui compte des cibles ignore les cases de grille et
  de tableau : neuf colonnes dans 360 px ne feront jamais 44 px chacune, et les
  signaler rend cinquante-huit fausses pistes par exercice.

## **Un `pkill` par motif tue aussi ce qu'on vient de lancer** — 2026-09-27

- **Ce que je voulais faire** : faire le ménage des serveurs d'essai avant de
  relancer un balayage.
- **Ce qui a coûté** : `pkill -f "siteEssai.php 94"` a emporté le serveur du
  balayage que je lançais dans la même commande — ses ports sont tirés au sort
  dans 9400-9579. Le balayage est mort à la première page (« Target page,
  context or browser has been closed »), et il a fallu vingt minutes pour le
  recommencer.
- **Combien de fois** : |
- **Ce qui manque** : que `tools/siteEssai.php` écrive son identifiant de
  processus quelque part, et qu'une commande `node tools/menage.mjs` tue les
  serveurs QU'ON A LAISSÉS, nommément — jamais par motif de ligne de commande.
  En attendant : on ne fait pas le ménage dans la commande qui lance.

## **Une règle de tableau nommait la classe, pas le tableau** — 2026-09-27

- **Ce que je voulais faire** : cacher la colonne « Vu » sur téléphone.
- **Ce qui a coûté** : la règle s'écrivait `.ec-table th:nth-child(4)`, c'est-à-
  dire TOUS les tableaux de l'espace. Or la quatrième colonne n'est pas la même
  partout : « Vu » dans la liste des élèves, **« Ce qui se passera »** dans
  l'aperçu d'import, et **le bouton « retirer »** dans Les professeurs. Un agent
  l'a mesuré : cellule rendue 0 × 0, et le professeur confirmait un import SANS
  RETOUR après avoir lu trois colonnes sur quatre. Le commentaire de ce tableau
  disait pourtant : « C'est la pièce la plus importante de tout l'écran. »
- **Combien de fois** : |
- **Ce qui manque** : une habitude, à écrire quelque part — **un sélecteur de
  colonne se nomme par ce qu'il y a DEDANS**, pas par son rang. `nth-child(4)`
  dans une classe partagée est une bombe à retardement : elle explose le jour où
  quelqu'un réutilise la classe pour un autre tableau, et rien ne le dit.

## ~~Le piège de l'accent grave, une troisième fois le même jour~~ — 2026-09-27

- **Ce que je voulais faire** : écrire un commentaire CSS citant `body`.
- **Ce qui a coûté** : deux minutes, parce qu'on sait. Mais c'est la TROISIÈME
  fois en deux jours — `espaceClasses.js` deux fois, `quadrilateres.js` une —,
  et le `CLAUDE.md` le décrit déjà en tête de sa section « pièges ». Le savoir
  ne suffit visiblement pas : la main écrit l'accent grave toute seule.
- **Combien de fois** : ||||| |  (six au total dans ce dépôt ; la sixième le
  2026-09-28, dans un commentaire CSS d'une maquette jetable — et cette fois-là
  le message d'erreur désignait la ligne 76, à quarante lignes de la faute)
- **Ce qui manque** : que `node --check` passe TOUT SEUL sur chaque fichier
  qu'on vient d'écrire, avant même d'essayer de s'en servir. Une entrée du
  journal le demandait déjà le 26 ; elle est toujours ouverte, et elle vient de
  se payer trois fois de plus.

- **FERMÉE PAR UN HOOK** — 2026-09-28. `tools/hooks/verifierSyntaxe.sh` passe `node --check` sur tout fichier JavaScript écrit, en `PostToolUse` sur `Edit` et `Write`. Il se tait quand la syntaxe tient, et quand elle ne tient pas il rend le message de node SUIVI de la piste — parce que ce message désigne souvent une ligne sans rapport. MESURÉ dans les deux sens sur un gabarit contenant un accent grave dans un commentaire : refusé avec la piste, et silence sur un fichier sain. Sept occurrences dans ce dépôt avant lui.

## **Une sonde qui mesure une position au lieu de refaire le geste : 95 fausses pistes sur 95** — 2026-09-27

- **Ce que je voulais faire** : balayer les 216 exercices du catalogue sur trois
  tailles d'écran et corriger ce qui ne tient pas.
- **Ce qui a coûté** : le balayage a rendu **36 défauts**, dont 17 « SOUS LA
  FENÊTRE » et 78 cibles trop petites. Vérification faite un par un dans le
  navigateur, en refaisant le geste : **dix-sept sur dix-sept étaient
  atteignables en défilant**, et les cibles étaient des cases de grille ou des
  touches. Quatre défauts réels sur quatre-vingt-quinze signalements, et une
  heure passée à ne pas y croire. La règle fautive tenait en une ligne — « le
  bas du bouton dépasse la fenêtre » — alors que chaque jeu porte un cadre
  défilant et que `.canvas-area` est en `overflow-y: auto`.
- **Combien de fois** : |||  (`apercusVides.mjs` deux fois, `ouvrirExercice.mjs`
  une, et c'est la même faute chaque fois)
- **Ce qui manque** : une règle écrite en tête de toute sonde de rendu — **on ne
  signale que ce qui résiste au geste**. Mesurer une position, c'est deviner ;
  `scrollIntoView` puis `elementFromPoint`, c'est savoir. Et un corollaire aussi
  cher : **une sonde plus sévère que la règle du dépôt ne mesure pas le
  logiciel, elle mesure son propre désaccord** — le plancher de 44 px n'impose
  qu'un `min-height` et exclut les cases ; une sonde qui refuse aussi les
  largeurs rend cinquante lignes par exercice.

## **`getComputedStyle().backgroundColor` ne rend pas du `rgb()` pour un `color-mix`** — 2026-09-27

- **Ce que je voulais faire** : mesurer les contrastes des trois nouveaux thèmes.
- **Ce qui a coûté** : une passe complète refaite, environ trente minutes.
  Chromium rend `color(srgb 0.897 0.927 0.993)` ; une sonde qui n'accepte que
  `rgb()` ne reconnaît pas ce fond, **remonte silencieusement jusqu'au fond de
  l'application** et mesure le mauvais couple. Ce dépôt a **136 fonds en
  `color-mix`** : le piège est structurel, pas accidentel.
- **Combien de fois** : |
- **Ce qui manque** : une fonction partagée « contraste réellement rendu » —
  capture de l'élément, couleur la plus fréquente pour le fond, encre la plus
  éloignée — que toute sonde de couleur importe au lieu de la réécrire. Elle
  existe déjà deux fois, dans `tools/tmp/auditTheme-silencePixels.py` et dans
  `tools/tmp/ambre.mjs`.

## **Un site d'essai neuf n'a pas les états qu'on veut mesurer** — 2026-09-27

- **Ce que je voulais faire** : vérifier ma correction du mot « rien depuis
  N min » du direct, que l'audit avait mesuré à 4,24 en thème océan.
- **Ce qui a coûté** : trente captures vides — « pas de rang de ce genre ».
  L'étiquette n'apparaît que si un élève est **silencieux depuis des minutes** ;
  le site de l'audit avait tourné une heure, le mien venait de naître. Il a fallu
  écrire une deuxième sonde qui mesure l'autre moitié de la paire (le fond du
  rang, toujours présent) pour pouvoir dire un chiffre.
- **Combien de fois** : |
- **Ce qui manque** : que `tools/siteEssai.php` sache **semer le temps** — un
  élève silencieux depuis huit minutes, un devoir rendu hier, une note de la
  semaine dernière. Sans ça, tout écran qui dépend de l'âge d'une donnée est
  hors de portée d'une sonde, et c'est la moitié du direct.

## **Deux sondes sur le même site d'essai se marchent dessus** — 2026-09-27

- **Ce que je voulais faire** : enchaîner deux passes de mesure sur un site déjà
  monté, pour ne pas repayer le démarrage de PHP.
- **Ce qui a coûté** : la deuxième passe héritait de la progression de la
  première — les identifiants d'élèves sont uniques par collage, pas par serveur
  — et « Commencer ma séance » avait disparu de l'écran qu'elle venait mesurer.
  Diagnostic long, parce que la sonde ne mentait pas : l'écran était vraiment
  différent.
- **Combien de fois** : |
- **Ce qui manque** : une phrase dans le `CLAUDE.md` — **une sonde d'écrans part
  d'un `siteEssai` neuf**, ou bien elle dit dans son titre qu'elle mesure un site
  déjà joué.

## **Un balayage tire une question au hasard, donc il ne voit qu'un exercice sur six** — 2026-09-27

- **Ce que je voulais faire** : vérifier un défaut que le balayage venait de
  signaler dans « Les Fonctions » — deux cibles de 38 x 26.
- **Ce qui a coûté** : quatorze ouvertures de l'exercice avant de retomber sur la
  question fautive. `alg-fonctions` tire sa question parmi sept formes (`lire`,
  `phrase`, `image`, `programme`, `tableau`…) et une seule porte des trous à
  toucher. Le balayage ouvre chaque exercice UNE fois, avec une graine tirée au
  hasard : il a vu cette forme-là par chance, et la passe suivante ne la reverra
  peut-être pas. Deux conséquences, aussi mauvaises l'une que l'autre — un défaut
  signalé qu'on ne sait pas reproduire, et cinq formes sur six jamais regardées.
- **Combien de fois** : |
- **Ce qui manque** : que la sonde puisse **fixer la graine** (elle voyage déjà
  jusqu'au professeur depuis le direct, `forceSeed` existe) et surtout
  **parcourir les valeurs de `params.quoi`** au lieu d'en tirer une. Un exercice
  à sept formes demande sept écrans, pas un.

## **`onExit` du meneur n'est pas appelé quand on ferme par la croix** — 2026-09-27

- **Ce que je voulais faire** : ramener au menu de la boîte à jeux quand le
  joueur referme un jeu.
- **Ce qui a coûté** : une sonde complète écrite, lancée, et trois vérifications
  en défaut sans que rien ne soit cassé côté boîte. `#btn-close-game`
  (`js/app.js`) n'appelle pas `runner.exit()` : il abandonne le meneur et cache
  la couche lui-même. C'est parfaitement légitime — ce bouton existait avant le
  rappel —, mais `onExit` est le seul nom qui laisse croire le contraire, et il
  est le premier endroit où l'on va. Diagnostic long, parce que la sonde disait
  vrai : le menu ne revenait vraiment pas.
- **Combien de fois** : |
- **Ce qui manque** : que la sortie du meneur passe par UN SEUL chemin. Tant que
  ce n'est pas le cas, une ligne dans `runner.js` à côté de `onExit` devrait
  dire « attention : `#btn-close-game` ne passe pas par ici ». Tout écran qui
  rend la main après une partie retombera dans ce trou.

## **Un outil qui compare tout rend dix-neuf faux positifs ; celui qui pose la bonne question en trouve douze vrais** — 2026-09-27

- **Ce que je voulais faire** : savoir si les trois nouveaux thèmes cassaient des
  contrastes dans les exercices, sans ouvrir 648 écrans.
- **Ce qui a coûté** : une première sonde comparait le blanc à CHAQUE jeton, dans
  chaque thème, et annonçait « 19 couples en défaut ». C'était arithmétiquement
  vrai et humainement faux : `--accent`, `--danger`, `--success` et `--warning`
  ne sont pas faits pour porter du blanc — la famille `--*-fond` existe
  exactement pour ça, et son commentaire le dit depuis des mois. La bonne
  question n'était pas « ce jeton porte-t-il du blanc ? » mais « une RÈGLE
  pose-t-elle du blanc sur un jeton qui n'en porte pas ? ». Réécrite ainsi, la
  même sonde a trouvé **douze défauts réels que mon `grep` avait manqués** —
  dont trois boutons dont le dégradé finit sur le bleu ciel, lisibles à gauche
  et illisibles à droite.
- **Combien de fois** : ||  (même faute de forme que le balayage du matin)
- **Ce qui manque** : une habitude à écrire quelque part — **une sonde se
  calibre sur une intention du dépôt, pas sur une règle générale**. Ici
  l'intention était écrite dans `css/base.css`, à dix lignes des jetons
  concernés. La lire d'abord aurait fait gagner la première passe entière.

## **Une famille de couleur oubliée dans la feuille de style, et rien ne le dit** — 2026-09-27

- **Ce que je voulais faire** : colorer les tuiles de la boîte à jeux par famille
  d'exercice.
- **Ce qui a coûté** : `familleDe` rendait NEUF familles, la feuille de style en
  déclarait HUIT. Les trente-six exercices de logique — le sixième du catalogue —
  retombaient sur la couleur par défaut, celle du calcul. Aucune erreur, aucune
  ligne rouge : une grille simplement plus terne qu'elle ne devrait, et
  impossible à diagnostiquer à l'œil puisque l'indigo est une couleur légitime.
  Trouvé par hasard, en comptant la répartition des 216 exercices pour vérifier
  autre chose.
- **Combien de fois** : |
- **Ce qui manque** : une habitude — **une énumération en JavaScript et son
  pendant en CSS doivent se vérifier l'un l'autre par un test**. Ce dépôt en a
  plusieurs paires (les thèmes, les jetons de tag, les familles). Le test écrit
  ici (`tests/boite.test.mjs`) ne coûte rien : il lit `css/modules.css` et exige
  que chaque famille déclarée y ait sa règle, et que chaque famille rendue soit
  déclarée. Il aurait attrapé celle-ci en une seconde.

## **Un réglage offert par l'activité à soixante-dix exercices, muet dans vingt et un** — 2026-09-28

- **Ce que je voulais faire** : répondre à Rémy — « dans le mot juste, dans les
  réglages, le clavier est proposé mais le jeu ne propose jamais le clavier
  non ? »
- **Ce qui a coûté** : rien à trouver, tout à MESURER. La réponse d'instinct — et
  celle que j'ai commencé à lui donner — était « le générateur pose toujours
  `answerKind: 'choice'`, donc jamais de clavier ». C'était vrai sur
  `answerKind` et **faux sur la conclusion** : le pavé ne regarde pas
  `answerKind`, il regarde si `Number(item.answer)` est fini. Dans « Le Mot
  Juste », un volet sur six répond par un nombre. Il a fallu tirer de vraies
  questions pour le savoir — et la même mesure a trouvé **vingt et un autres
  exercices** où le réglage ne peut, lui, rien faire du tout.
- **Combien de fois** : ||  (même faute que le matin : conclure d'après le nom
  d'un champ au lieu de faire tourner le code)
- **Ce qui manque** : une habitude, et elle vaut pour tout ce dépôt — **un
  réglage proposé par une ACTIVITÉ s'applique à tous ses exercices, mais n'agit
  que sur certains ; personne ne le vérifie**. Il faudrait, pour chaque réglage
  partagé, un outil qui tire de vraies questions et dit où la commande est
  muette. **Écrit le lendemain** : `tools/reglagesMuets.mjs`. Il fait
  l'inventaire des réglages servis par une activité, applique les règles qu'on
  sait écrire, et NOMME ceux qu'on n'a pas encore comprises plutôt que de les
  passer sous silence. Premier verdict : six réglages partagés, deux règles
  écrites, trente et un exercices assainis.

## **Deux réglages de même nom, deux réglages différents** — 2026-09-28

- **Ce que je voulais faire** : écrire une règle pour chacun des six réglages
  servis par une activité, et dire lesquels sont muets.
- **Ce qui a coûté** : quatre fausses pistes rendues d'un coup. `reponse` est
  posé par les activités du cercle et de la symétrie — « Choisir · Cliquer ·
  Écrire » — ET, sous le même nom, par six générateurs qui n'ont rien à voir :
  arrondi, relatifs, pourcentages, périmètre du triangle. Ma règle, indexée sur
  le seul NOM du réglage, appliquait la sémantique de l'un à l'autre. Trouvé
  parce que les quatre noms signalés n'avaient visiblement rien à faire là —
  soit exactement le réflexe que ce dépôt a payé trois fois cette semaine :
  regarder la chose avant de la rapporter.
- **Combien de fois** : |
- **Ce qui manque** : que l'identité d'un réglage soit **(nom, source)** et non
  le nom seul. Tant que ce n'est pas le cas, tout outil qui raisonne sur les
  réglages doit vérifier d'où vient celui qu'il tient — c'est ce que fait
  maintenant `tools/reglagesMuets.mjs` (`duBonBord`). Et accessoirement : un
  `includes(id)` cherche une sous-chaîne, pas un mot — « consigne » se trouvait
  dans « consignePapier », et l'outil annonçait 147 lecteurs pour un réglage
  qu'un seul fichier lit.

## ~~Une capture d'élément perd un texte peint par son fond, et personne ne le voit~~ — 2026-09-28

- **Ce que je voulais faire** : montrer à Rémy que le titre « AtoutMath » suit
  bien le thème, en photographiant l'entête dans les cinq thèmes.
- **Ce qui a coûté** : trois allers-retours. Quinze images sont sorties de la
  BONNE TAILLE, avec la BONNE couleur de fond, et SANS UNE LETTRE. Deux causes
  empilées, chacune silencieuse :
  1. `locator.screenshot()` recompose l'élément seul, et le dégradé découpé
     dans le texte (`background-clip: text` + `-webkit-text-fill-color`) ne
     survit pas à cette recomposition ;
  2. la sonde ne s'était pas identifiée, donc la page était restée le PORTAIL :
     l'entête existait dans le document, derrière le voile. Les contrastes
     calculés restaient justes — le style calculé s'applique à un élément
     caché — ce qui rend l'oubli dangereux : RIEN ne le signalait.
- **Combien de fois** : | (la première pour la capture ; la connexion oubliée
  est déjà décrite par la règle du `CLAUDE.md`, ce qui prouve qu'une règle
  écrite ne remplace pas un outil)
- **Ce qui manque** : une fonction de sonde partagée qui (a) s'identifie et
  recharge, (b) photographie PAR DÉCOUPE DE LA PAGE et non par élément, et
  (c) **refuse de rendre une image unie** — compter les teintes distinctes
  coûte dix lignes et aurait arrêté les trois allers-retours au premier. Toutes
  les sondes du dépôt réécrivent aujourd'hui ces trois choses, ou les oublient.

- **REMPLACÉE PAR `tools/sonde.mjs`** — 2026-09-28. Les trois demandes de cette entrée sont dans `photo()` et `identifier()` : découpe de page, connexion suivie d'un rechargement, et refus d'une image unie.

## ~~Chercher une valeur littérale trouve les copies, pas la classe de défaut~~ — 2026-09-28

- **Ce que je voulais faire** : corriger partout un dégradé qui part du thème et
  finit sur une couleur écrite en dur.
- **Ce qui a coûté** : j'ai cherché `#8b5cf6`, le violet que j'avais sous les
  yeux, et j'ai trouvé NEUF endroits. En écrivant ensuite l'épreuve qui tient la
  RÈGLE — « si un bout du dégradé vient du thème, l'autre aussi » — elle en a
  trouvé **treize**, dont un `#a855f7` dans le Compte est Bon que le `grep`
  n'aurait jamais vu. Puis trois faux positifs ont appris que le critère juste
  n'était pas « c'est un jeton » mais « ce jeton change-t-il de TEINTE selon le
  thème » — mesuré : `--primary` traverse 230°, `--warning` 5°.
- **Et l'épreuve, écrite trop vite, ne gardait rien.** Son expression s'arrêtait
  au premier `)`, celui de `var(--primary)` : remise devant le défaut, elle
  passait au vert. Trouvé en essayant EXPRÈS de la faire tomber.
- **Combien de fois** : ||
- **Ce qui manque** : deux réflexes qui devraient être des outils.
  1. **Chercher la forme, pas la valeur.** Un `grep` de couleur littérale est un
     échantillon, jamais un inventaire ; c'est l'écriture de la règle qui fait
     l'inventaire. Le corollaire coûte cher : on croit avoir fini.
  2. **Une épreuve neuve doit être VUE échouer avant d'être crue.** Deux fois
     aujourd'hui une épreuve verte ne gardait rien. Un `--verifie-que-ca-tombe`
     qui réintroduit le défaut et exige l'échec ferait ça tout seul.

- **À MOITIÉ FERMÉE PAR `node tools/epreuveTombe.mjs`** — 2026-09-28. Le second réflexe demandé est devenu un outil : il applique au code le remplacement qui REMET le défaut, relance l'épreuve, exige qu'elle tombe, et remet le fichier dans un `finally`. MESURÉ dans les deux sens : sur le garde des ombres indigo il annonce « elle TOMBE » ; sur une épreuve sans rapport il annonce « CETTE ÉPREUVE NE GARDE RIEN ». Le premier réflexe — chercher la FORME et non la valeur — reste une habitude, pas un outil.

## **Un cadre dans un cadre a son propre état, et le réglage du parent n'y va pas** — 2026-09-28

- **Ce que je voulais faire** : comprendre pourquoi l'aperçu de l'Atelier
  repassait en téléphone quand Rémy cliquait sur le robot.
- **Ce qui a coûté** : quatre sondes avant une mesure à laquelle on puisse se
  fier, et chacune se trompait autrement.
  1. j'ai lu `state.previewDeviceMode` DANS le cadre — c'est le réglage de la
     page, pas ce que le meneur emploie ; il valait « mobile » avant ET après
     la correction, et j'ai failli conclure que rien n'avait changé ;
  2. j'ai attendu la PRÉSENCE de `#game-layer` : il est dans le document dès le
     départ, à zéro pixel, donc l'attente rendait la main tout de suite et je
     mesurais zéro à tous les coups ;
  3. un délai fixe de 4,5 s donnait une lecture juste sur trois — et l'on ne
     conclut pas « ça suit » sur un chiffre qui change d'un essai à l'autre ;
  4. la première sonde ne testait qu'UN choix (« ordinateur ») : un volet
     toujours en plein écran l'aurait passée sans rien suivre.
- **Le défaut lui-même était plus large que le signalement** : les DEUX volets
  ignoraient le choix, pas seulement le robot, et le contrôle mesurait un
  téléphone DANS une fenêtre d'ordinateur — deux cadres empilés.
- **Combien de fois** : ||  (déjà payé le 27 avec `fullPage` et le défilement
  qui n'est pas sur le document : même famille, un cadre n'est pas la page)
- **Ce qui manque** : une règle à écrire une fois — **ce qu'on mesure dans un
  cadre doit être ce que l'OEIL voit, pas l'état d'un module.** Une largeur, une
  couleur, un texte : ces trois-là traversent la frontière des documents. Un
  `import()` depuis le parent rend TOUJOURS la copie du parent, et l'Atelier a
  déjà trois rustines pour cela (`window.__journalAtelier`, `__sessionAtelier`,
  `__runnerAtelier`). La quatrième aurait été une de trop.
  L'outil existe désormais : `tools/apercuDeLAtelier.mjs`, qui encode les trois
  erreurs ci-dessus pour ne pas les repayer.

## **Une sonde qui choisit ses éléments par leur TAILLE mesure la décoration** — 2026-09-28

- **Ce que je voulais faire** : trouver dans quelle condition la grille du
  mathdoku s'écrase, après « pas lisible » et une capture.
- **Ce qui a coûté** : une sonde entière écrite, lancée sur sept conditions, et
  **sept verdicts « RATÉ » dont deux que j'avais vérifiés à l'oeil comme
  corrects**. Elle prenait `plateau.querySelectorAll('*')` filtré par la
  taille : sur seize cases, cela ramassait trente-huit éléments — étiquettes de
  cage, bordures, marques d'état. Les « 8 à 11 rangées » et les « rapports de
  1,27 à 3,23 » décrivaient des décorations, pas des cases. Il a fallu que je
  compare le verdict à une capture que je venais de regarder pour m'en rendre
  compte ; sans cette capture, je corrigeais un défaut qui n'existait pas.
- **Combien de fois** : |
- **Ce qui manque** : rien d'outillable, une règle. **Une sonde nomme ce qu'elle
  mesure.** Choisir par la géométrie (« ce qui fait plus de 8 px ») paraît
  robuste — « je ne suppose rien sur les noms de classe » — et c'est l'inverse :
  la géométrie ne distingue pas une case d'une étiquette, et le filtre invente
  un peuplement. Le jeu écrit `class="kk-cell"` sur chaque case ; c'est ce
  sélecteur-là qu'il fallait, et il donnait seize cases carrées.
- **Et le défaut, lui, n'était pas où je le cherchais** : la grille est carrée
  dans les onze conditions balayées. Ce qui manquait était le CONTRASTE du
  quadrillage — 1,23 à 1,56 selon le thème. « Pas lisible » disait littéralement
  ce qu'il fallait mesurer, et j'ai cherché une déformation pendant deux sondes.

## **`1fr` n'est pas `minmax(0, 1fr)`, et la différence se mange en silence** — 2026-09-28

- **Ce que je voulais faire** : comprendre la capture de Rémy — un binairo à six
  colonnes, cases trois fois plus hautes que larges, grille tronquée.
- **Ce qui a coûté** : rien en temps, et c'est ce qui rend l'entrée utile. Le
  défaut était mesurable en trente secondes une fois la bonne question posée —
  mais la bonne question n'était pas « la grille est-elle carrée », c'était
  « toutes les cases sont-elles DANS le plateau ». `repeat(n, 1fr)` vaut
  `repeat(n, minmax(auto, 1fr))` : une piste refuse de descendre sous son
  contenu, la grille déborde de son `aspect-ratio`, et `overflow: hidden` coupe
  le bas **sans rien signaler**. Six cases sur trente-six disparaissaient, et
  aucune mesure du plateau ne le disait : il faisait bien 259 × 259.
- **Et le dépôt savait déjà** : `.ga-cell` porte `min-height: 0` depuis un
  défaut identique, avec la phrase exacte. Trois grilles sur quatre ne l'avaient
  pas. La connaissance était écrite au bon endroit — dans le bloc du garam — et
  personne ne va lire le bloc du garam en corrigeant le binairo.
- **Combien de fois** : ||
- **Ce qui manque** : une mesure qui compte ce qui SORT, pas seulement ce qui
  est. `tools/grilleLisible.mjs` le fait maintenant (`coupees`), et il balaie
  six tailles de fenêtre. La règle générale vaut au-delà des grilles : **quand
  un conteneur est en `overflow: hidden`, mesurer ce qu'il contient ne suffit
  pas — il faut compter ce qu'il a jeté.**
- **Au passage, et c'est le même geste** : le même balayage a montré que
  « Valider » tombait sous l'écran dans onze conditions sur trente. Une sonde
  qui change de taille de fenêtre voit des choses qu'aucune relecture ne voit.

## **`getBoundingClientRect` rend la boîte, pas ce qui est peint** — 2026-09-28

- **Ce que je voulais faire** : vérifier qu'une grille de mots croisés ne se
  pose plus par-dessus le clavier, après avoir mis le conteneur en
  `overflow: auto`.
- **Ce qui a coûté** : un faux « CASSÉ » que j'ai failli corriger. La sonde
  calculait l'aire commune entre le rectangle de la grille et celui du pavé de
  lettres — et continuait d'annoncer un pixel de recouvrement sur un clavier
  parfaitement dégagé. `getBoundingClientRect` rend la BOÎTE DE MISE EN PAGE ;
  dès qu'un ancêtre découpe, elle ne dit plus rien de ce que l'oeil voit. La
  mesure d'avant la correction était juste par accident : rien ne découpait.
- **Combien de fois** : |  (même famille que « une capture d'élément perd un
  texte peint par son fond » : la géométrie calculée et le rendu divergent)
- **Ce qui manque** : une règle. **Quand on mesure un recouvrement, découper
  d'abord chaque boîte par ses conteneurs qui défilent.** Trois lignes, et sans
  elles la sonde condamne exactement la correction qu'on vient d'écrire — le
  pire moment pour une fausse alerte.

## **`overflow-y: auto` ne contraint rien sans plafond** — 2026-09-28

- **Ce que je voulais faire** : comprendre pourquoi l'énoncé d'un exercice se
  peignait sous le clavier, alors que le code disait explicitement le contraire.
- **Ce qui a coûté** : trois sondes avant de regarder la bonne propriété. La
  règle était `min-height: 0; overflow-y: auto; align-self: start` — et en
  lisant, on coche « ça défile, donc c'est contenu ». Faux : `align-self: start`
  donne à la boîte la hauteur de son CONTENU, pas celle de sa rangée. Rien
  n'est contraint, donc rien ne défile, et le surplus se déverse. Il manquait
  `max-height: 100%`, six caractères.
- **Combien de fois** : ||  (déjà vu avec `minmax(auto, 1fr)` le même jour : une
  piste, une boîte — même illusion, « j'ai écrit la limite » alors qu'on a écrit
  le comportement EN CAS de limite)
- **Ce qui manque** : une habitude de lecture. **Trois propriétés forment un
  contenant : la limite, le débordement, et l'alignement qui ne l'annule pas.**
  Les voir séparément fait manquer le trou à chaque fois. Et une règle de
  mesure : chercher un `scrollHeight > clientHeight` là où l'on CROIT avoir posé
  un défilement — si la boîte ne défile jamais, elle ne contient rien.
- **Et un corollaire écrit ailleurs** : `overflow: hidden` sur une grille
  découpe au bord de la GRILLE, pas au bord de la rangée. Le débordement d'une
  rangée se déverse donc sur la suivante, et pas dehors — ce qui explique qu'on
  voie le défaut à l'écran sans qu'aucune boîte ne sorte du cadre.

## **Découper n'est pas recouvrir : une sonde d'occlusion se teste sur le défaut** — 2026-09-28

- **Ce que je voulais faire** : chercher moi-même les écrans où du contenu
  disparaît, au lieu d'attendre la cinquième capture de Rémy.
- **Ce qui a coûté** : une sonde entière, écrite et lancée, qui rendait
  « 0 souci » SUR LE DÉPÔT D'AVANT LA CORRECTION — c'est-à-dire sur le défaut
  qu'elle existait pour trouver. Elle découpait chaque boîte par ses ancêtres
  qui découpent, ce qui attrape un élément COUPÉ ; le défaut, lui, était un
  frère posé DEVANT. Un recouvrement ne rogne aucune boîte.
- **Combien de fois** : |
- **Ce qui l'a sauvée** : la règle du dépôt, appliquée à une sonde et non à une
  épreuve — **la faire tourner sur le défaut avant de la croire**. Trente
  secondes (`git show <commit>:fichier > fichier`, lancer, remettre) contre un
  outil qui aurait menti à chaque passage.
- **La leçon technique** : pour savoir si un élément se voit, il n'y a qu'une
  question juste — **qu'y a-t-il AU POINT ?** `elementFromPoint` répond pour le
  découpage ET pour le recouvrement, parce que c'est la question que le
  navigateur se pose pour peindre. Toute géométrie calculée à côté est une
  reconstitution, et les reconstitutions ratent un cas sur deux.
- **L'outil** : `tools/quiDeborde.mjs`, cinq points par élément, et il dit si un
  conteneur peut rattraper en défilant — ce qui est un geste de plus, pas une
  perte.

## **`remplacer.mjs` est tout-ou-rien, et je l'ai oublié dans un lot mixte** — 2026-09-28

- **Ce que je voulais faire** : poser un halo sur les noms de points (CSS) et
  élargir le choix des places (JS), dans un même appel `--depuis`.
- **Ce qui a coûté** : le halo n'a JAMAIS été écrit. Une des deux paires visait
  le fichier JS et ne se trouvait pas dans le CSS ; l'outil a donc — comme il
  doit — refusé d'écrire quoi que ce soit. J'ai lu « paire 1 ok » et poursuivi.
  Vingt minutes plus tard je mesurais un halo qui n'existait pas.
- **Combien de fois** : |
- **Ce qui l'a rattrapé** : l'épreuve, qui exigeait `paint-order: stroke fill`
  dans `.pd-nom` et l'a trouvé absent. Sans elle, je livrais une correction
  imaginaire avec des chiffres mesurés sur autre chose.
- **Ce qui manque** : une habitude. **Un lot de remplacements vise UN fichier ;
  deux fichiers, deux appels.** Et relire la dernière ligne de l'outil, pas la
  première : « RIEN n'est écrit » y est écrit en toutes lettres.

## **Une règle CSS ordinaire a maintenant un `cssRules`, et ma sonde a compté zéro** — 2026-09-28

- **Ce que je voulais faire** : compter, dans le navigateur, combien de règles
  `:hover` s'appliquent encore sur un téléphone.
- **Ce qui a coûté** : une sonde qui rendait « 0 vivantes, 0 éteintes » sur des
  feuilles de 2 724 règles. Elle triait ainsi : si la règle a un `media`, c'est
  une requête ; SINON si elle a un `cssRules`, c'est un conteneur ; sinon c'est
  une règle. Or depuis l'imbrication CSS, **toute** `CSSStyleRule` porte un
  `cssRules` (vide). La deuxième branche avalait donc toutes les règles
  ordinaires et descendait dans une liste vide.
- **Combien de fois** : |
- **Ce qui l'a rattrapé** : un zéro trop rond. « 0 et 0 » sur sept feuilles
  chargées n'est pas un résultat, c'est une panne — et la sonde a été rouverte
  au lieu d'être crue. Le premier réflexe utile a été de faire dire à la sonde
  COMBIEN de règles elle voyait par feuille : 17, 96, 1085… donc elle lisait
  bien, et le tri était en cause.
- **Ce qui manque** : une règle de tri. **On teste ce qu'un objet EST avant de
  tester ce qu'il CONTIENT** — `selectorText` avant `cssRules`. Un test par
  présence de propriété vieillit mal : la plateforme ajoute des propriétés, et
  la branche qu'on croyait étroite devient la branche générale.

## **Un proxy de défaut doit se comporter comme le défaut** — 2026-09-28

- **Ce que je voulais faire** : prouver qu'un ajusteur de taille de texte mord
  vraiment, alors que le défaut vient d'un iPhone que je n'ai pas.
- **Ce qui a coûté** : un premier proxy inutile. Pour élargir les étiquettes
  j'ai injecté un `letter-spacing` FIXE — l'étiquette débordait bien, mais
  aucune réduction de police ne pouvait la rattraper, puisque l'écartement ne
  dépend pas de la taille. L'ajusteur a donc semblé inefficace alors qu'il
  faisait exactement son travail, et j'ai failli le réécrire.
- **Combien de fois** : |
- **Ce qui marche** : doubler la taille CHOISIE dans la source (`.34` → `.72`),
  ce qui est proportionnel comme l'est le gonflage d'iOS. Verdict net : sans
  l'ajusteur, la pire étiquette occupe 1,07 du jeton et deux débordent ; avec,
  0,78 et zéro, la taille retenue s'adaptant à la police (0,52 avec Outfit,
  0,58 avec un serif).
- **La règle** : **un proxy doit partager la MÉCANIQUE du défaut, pas seulement
  son symptôme.** Reproduire « c'est trop large » ne suffit pas si la correction
  agit sur « c'est trop grand » : on teste alors sa propre impuissance.

## **Le repli d'un `var()` n'est pas un filet, c'est le prix d'une faute de nom** — 2026-09-28

- **Ce que je voulais faire** : comprendre deux boutons blancs portant un texte
  blanc, en thème sombre.
- **Ce qui a coûté** : rien à trouver, et c'est ce qui rend l'entrée utile. Le
  code disait `background: var(--card-bg, #fff); color: var(--text-main)`. Or
  `--card-bg` n'existe nulle part dans ce dépôt : ses jetons s'appellent
  `--bg-panel` et `--border`. Le repli s'appliquait donc TOUJOURS, et personne
  ne pouvait le voir en lisant — un repli ressemble à une précaution.
- **Compté sur tout le dépôt** : 225 jetons employés, **82 jamais déclarés**.
  La plupart sont posés depuis JavaScript et vont très bien ; une quinzaine
  portent un nom de surface ou de texte (`--card-bg`, `--border-color`,
  `--border-soft`, `--surface`, `--text-soft`…) et retombent sur une couleur
  claire écrite en dur, donc illisible dès que le thème s'assombrit.
- **Combien de fois** : |
- **Ce qui manque, et qui existe maintenant** : `tools/quiEstIllisible.mjs`. Le
  NOM du jeton n'est pas le critère — un blanc écrit en dur sous un texte sombre
  se lit très bien. C'est le COUPLE qui décide, et il se mesure. L'outil ouvre
  chaque exercice en thème sombre et rend le contraste de chaque texte sur le
  fond réellement peint. Sur le jeu signalé : **1,05**.
- **Et il peint plutôt que de lire des chaînes** : `getComputedStyle` rend un
  `color-mix` sous la forme `oklab(...)`, que rien ne sait lire à la main. On
  demande au navigateur de peindre la couleur dans un canevas d'un pixel et l'on
  relit le pixel. Exact, et valable pour toutes les syntaxes à venir.

## **Deux pièges déjà écrits, repayés le même jour** — 2026-09-28

- **L'accent grave dans un gabarit, NEUVIÈME fois.** Mon commentaire de
  correction citait les noms de jetons entre accents graves, à l'intérieur d'un
  gabarit JavaScript. `tools/remplacer.mjs` a refusé le fichier et l'a remis :
  le garde-fou a fait exactement son travail, ce qui est la bonne nouvelle. La
  règle à retenir est plus étroite que celle du guide : **on ne cite pas un nom
  de code entre accents graves dans un commentaire qui part dans un gabarit.**
- **Le `pkill` par motif, qui tue la commande qui le contient.** Le guide le dit
  déjà — « un pkill par motif tue aussi ce qu'on vient de lancer » — mais la
  ligne de commande du shell CONTIENT le motif : `pkill -f quiEstIllisible`
  suivi de trois autres commandes a tué les trois. Ce qui marche :
  `ps -eo pid,comm,args | awk '$2=="node" && /motif/ {print $1}' | xargs -r kill`,
  qui ne vise que les processus `node`.

## **Un dégradé n'est pas une couleur, et une opacité fait partie de l'encre** — 2026-09-28

- **Ce que je voulais faire** : faire confiance à la liste de 49 exercices que
  `tools/quiEstIllisible.mjs` venait de rendre.
- **Ce qui a coûté** : la moitié de la liste était fausse, et je l'ai su en
  ouvrant les cinq pires. Deux angles morts, tous deux dans la façon dont un
  navigateur compose une couleur :
  1. **`background-color` vaut `transparent` sous un `background-image`.** La
     sonde remontait donc jusqu'au fond de la page et comparait l'encre d'une
     plaque jaune au bleu nuit du plateau : 1,19 annoncé sur un jeton
     parfaitement lisible, au Compte est bon.
  2. **L'opacité ne changeait rien à son calcul.** Un texte à 55 % n'est pas de
     la couleur qu'il déclare : il se compose avec ce qu'il y a dessous. Un
     `mm-num` annoncé à 1,07 vaut en réalité 4,25.
- **Combien de fois** : |  (même famille que « `getComputedStyle` ne rend pas du
  `rgb()` pour un `color-mix` » : trois fois maintenant qu'une couleur CALCULÉE
  diverge de la couleur PEINTE)
- **Ce qu'on en garde** : **on ne devine pas la couleur moyenne d'un dégradé,
  on dit qu'on ne sait pas.** L'outil les compte à part et laisse l'oeil
  trancher — une sonde qui s'abstient est plus utile qu'une sonde qui invente.
  Et l'opacité de l'élément ET DE SES ANCÊTRES entre dans l'encre, parce que
  c'est ce que le navigateur fait.
- **La règle générale, qui vaut au-delà des couleurs** : **avant de corriger sur
  la foi d'une liste, en ouvrir les cinq pires.** Trente secondes, et elles
  disent si la liste mérite qu'on la suive.

## **Le nom du fichier n'est pas le nom du jeu** — 2026-09-28

- **Ce que je voulais faire** : élargir la prise tactile de « Relier sans
  Croiser ».
- **Ce qui a coûté** : une correction entière écrite dans `js/games/relier.js`,
  commentaires compris — et ce n'est pas ce jeu-là. `relier.js` dessine des
  chemins sur une grille (`rp-case`), `sansCroiser.js` fait tracer à main levée
  (`sx-carre`). Deux jeux qui « relient », deux fichiers, et le titre ne dit ni
  l'un ni l'autre. C'est la SONDE qui l'a dit, en ne trouvant aucun `[data-x]`
  dans le plateau : le code que je venais d'écrire ne s'exécutait pas.
- **Combien de fois** : |
- **Ce qui manque** : un réflexe de trente secondes. **On remonte du catalogue
  au fichier, jamais du nom au fichier** : `activityId` dans `js/data/*.js`,
  puis `js/core/activities/index.js`. Ici, `geo-sans-croiser` → `sans-croiser`
  → `sansCroiser.js`, et le doute était levé avant d'écrire une ligne.
- **Ce qui a sauvé la mise** : la règle du dépôt, une fois de plus — mesurer le
  GESTE et non le code. Une correction qu'on ne voit pas agir n'est pas une
  correction, et celle-ci n'agissait sur rien.

## **Une mesure qui ne regarde qu'un thème ne voit pas le défaut d'un thème** — 2026-09-28

> Rémy : « en fait il faut faire attention aux contrastes selon les modes si on
> a pris mode nuit ou non ».

- **Ce qu'il montrait** : le cercle et les lettres du Vocabulaire du Cercle,
  invisibles en thème sombre. Mesuré dans les cinq thèmes :
  `clair 16,32 · SOMBRE 1,14 · océan 16,32 · forêt 16,32 · couchant 16,32`.
  **Un seul thème sur cinq** — quatre lignes sur cinq disaient que tout allait
  bien, et c'est exactement ce qui rend ces défauts-là si durables.
- **Ce qui l'a laissé passer** : `tools/quiEstIllisible.mjs` SAUTAIT les
  dessins. Il avait de bonnes raisons — l'encre d'un SVG est un `fill`, et ce
  qu'il y a dessous est une forme, pas un fond de boîte — mais s'abstenir sur
  toute une famille revient à ne pas la garder du tout.
- **Combien de fois** : |
- **Ce qu'on en garde** : la sonde mesure désormais les dessins, contre le
  plateau, et ne s'abstient QUE sur les glyphes posés sur une forme peinte.
  Elle a retrouvé le défaut d'origine à 1,09. Et elle prend `--theme` : une
  campagne de contraste se lance maintenant thème par thème, pas une fois.
- **La règle** : **un défaut de couleur se cherche dans le thème qui le
  révèle.** Le thème clair est celui où l'on développe, donc le seul où ces
  défauts ne se voient jamais.

---

## **La sonde s'identifie en PROFESSEUR, et l'écran de l'élève n'existe pas là** — 2026-09-28

- **Ce que je voulais faire** : mesurer le bouton « Signaler un problème »,
  qui ne paraît que chez un élève RATTACHÉ à une classe.
- **Ce qui a coûté** : ~25 min. `s.identifier()` appelle `identifierProf` :
  l'onglet qui en sort est celui de Rémy, et `isActive()` — le rattachement
  d'un élève — y vaut faux. Le bouton restait caché quoi qu'on allume, et
  Playwright disait seulement « element is not visible ». J'ai d'abord cherché
  du côté du réglage, qui arrivait parfaitement.
- **Combien de fois** : |
- **Ce qui manque** : un `s.entrerCommeEleve()` dans `tools/sonde.mjs`, qui
  fasse ce que `boutEnBout.mjs` fait à la main — créer une classe, importer un
  billet, appeler `loginEleve`. Vingt lignes à recopier à chaque fois qu'on
  mesure quelque chose que seul un élève voit, c'est-à-dire souvent.
- **Le piège dans le piège** : `loginEleve` change le profil local, donc
  l'onglet CESSE d'être celui du professeur. Mesurer les deux côtés demande
  deux onglets — ou, pour poser une donnée, une requête directe au lieu d'une
  connexion.

---

## **Un rechargement emporte le thème, et cinq thèmes rendent le même chiffre** — 2026-09-28

- **Ce que je voulais faire** : lire les contrastes de deux écrans neufs dans
  les cinq thèmes, comme la règle du 28 septembre l'exige.
- **Ce qui a coûté** : ~20 min et six campagnes pour rien. `ouvrirSonde({ theme })`
  posait `data-theme` UNE FOIS ; `identifier()` recharge, et la sonde rechargeait
  encore deux fois. L'attribut partait à chaque fois **sans un mot**, et tout ce
  qui suivait mesurait le thème clair sous le nom d'un autre.
- **Ce qui l'a révélé** : `17,85 · 5,74 · 4,88 · 17,06` — les mêmes quatre
  nombres, à la deuxième décimale, dans les cinq thèmes. Cinq thèmes qui
  s'accordent à ce point ne s'accordent pas : ils sont le même. L'indice ne
  tenait qu'au fait d'avoir lancé les cinq d'affilée ; une campagne sur un seul
  thème n'aurait rien eu à comparer.
- **Combien de fois** : |
- **Ce qu'on en garde** : `tools/sonde.mjs` écrit désormais le thème dans
  `localStorage` sous `mathbox-theme` — **le chemin de l'élève**, qui appuie sur
  le bouton des thèmes — et le repose après CHAQUE chargement (`page.on('load')`),
  y compris ceux que la sonde appelante déclenche. Les cinq thèmes rendent
  maintenant cinq chiffres différents.
- **La règle** : **ce qu'une sonde pose sur la page, un rechargement le reprend.
  Ce qu'elle range où l'utilisateur le range, non.**

---

## **Un robot muet ne casse rien : aucun essai ne peut le voir** — 2026-09-29

> Rémy, capture d'iPhone : « bug avec le robot ».

- **Ce qu'il montrait** : « Le Canon des Compléments » en démonstration — terrain
  noir et vide, « Niveau **undefined** », aucun cœur, « prépare… » immobile,
  pendant que le robot expliquait « un boulet approche, je cherche son
  complément à 100 ». MESURÉ avant : **0 astéroïde, 0 tir**, relevés à 2, 6 et
  12 secondes.
- **La cause, en une ligne de `BaseGame`** : `if (this.isDemo)
  runDemoSequence(); else startGameLoop();` — **exclusif**. Un robot qui
  n'appelle pas `startGameLoop` lui-même parle devant un décor mort, avec les
  champs que cette méthode aurait posés restés vides.
- **Pourquoi personne ne l'avait vu** : rien n'échoue. Pas d'erreur de page, pas
  de page blanche, pas d'essai rouge — `npm test` ne lance aucun robot, et un
  élève qui voit un robot muet croit que c'est normal.
- **Combien de fois** : |
- **Ce qu'on en garde** : `tools/robotsMuets.mjs` ouvre le robot de chaque
  exercice et cherche un `undefined`/`NaN` à l'écran. Il a confirmé que le
  défaut était **unique au canon** — c'est ce qu'on voulait savoir avant de
  corriger huit fichiers au jugé.
- **La règle** : **ce qui ne lève pas d'erreur n'est pas gardé par les essais.
  Un robot se regarde.**

---

## **Trois fausses alertes d'affilée, et chacune a sa raison** — 2026-09-29

- **Ce que je voulais faire** : chercher si d'autres robots étaient muets.
- **Ce qui a coûté** : ~30 min, à poursuivre trois défauts qui n'existaient pas.
  Le critère « le plateau ne mute pas » se trompe de trois façons :
    - **un `<canvas>` ne mute rien.** « L'Escadrille » annonçait 1 mutation en
      neuf secondes et son robot marche très bien : tout se peint dans un
      contexte 2D, invisible au DOM ;
    - **une démonstration de clics** sur une grille immobile ne bouge pas non
      plus — le curseur du robot vit sur `<body>`, hors du plateau observé ;
    - **deux notes identiques se dédupliquent.** « 💥 30 + 70 = 100 ! » deux
      fois de suite : mon observateur comparait au précédent et n'en gardait
      qu'une. J'ai conclu « le second tir ne touche pas » d'une leçon qui
      touchait deux fois.
- **Combien de fois** : ||
- **Ce qu'on en garde** : dans `robotsMuets.mjs`, le texte est le **verdict**
  (un `undefined` est une certitude) et le mouvement n'est qu'une **invitation à
  regarder**, avec les jeux à canevas exclus d'office.
- **La règle** : **une sonde doit savoir ce qu'elle ne sait pas mesurer.** Un
  critère qui ne s'applique pas à tout le monde ne doit pas rendre de verdict.

---

## **Une erreur qui n'apparaît qu'en série n'est pas forcément celle de la sonde** — 2026-09-29

- **Ce qui s'est passé** : en enchaînant plusieurs robots, la page rendait
  « Cannot set properties of null (setting 'textContent') ». Seule, chaque
  démonstration était propre. J'ai d'abord classé l'erreur comme un défaut de
  ma sonde — l'enchaînement — et ajouté `clearEngines()` entre deux robots.
  **Elle est restée.**
- **La vraie cause** : `canon.js` posait un `setTimeout` NU à la fin de partie,
  que `clearEngines()` ne peut pas annuler. Perdre puis quitter dans la seconde
  et demie qui suit — c'est-à-dire au moment exact où l'on quitte — exécutait le
  rappel sur une couche de jeu déjà remplacée.
- **Combien de fois** : |
- **Ce qu'on en garde** : `regTimeout` au lieu de `setTimeout`, et `majTete()`
  rendue incapable de lever quand son plateau a disparu. Une épreuve garde les
  deux, vue tomber.
- **La règle** : **« ça ne le fait qu'en série » décrit QUAND on le voit, pas
  D'OÙ ça vient.** Le seul moyen de trancher était de retirer l'enchaînement et
  de constater que l'erreur restait.

---

## **Le bon reproche existait, c'est le mauvais qui sortait** — 2026-09-29

> Rémy, capture d'iPhone sur « Fractions pas à pas » : « je sais que je n'ai pas
> simplifié mais il me dit faux ».

- **Ce qu'il montrait** : 1/4 + 5/4, la ligne « On ajoute les numérateurs, le
  dénominateur ne bouge pas », `6/4` en rouge. Le message affiché disait « à
  cette ligne on REGROUPE, on ne calcule pas encore » — alors que le logiciel
  SAVAIT déjà dire, mot pour mot, ce que Rémy venait de dire : « c'est bien
  égal, mais ce n'est pas fini : la fraction se simplifie encore ».
- **La friction** : ce défaut est **invisible à la lecture du code**. Les deux
  branches sont justes séparément — `sautDirect` exige une réponse juste,
  le juge de ligne exige la forme regroupée. C'est leur RENCONTRE qui ment, et
  seule une réponse *égale mais non réduite* la déclenche.
- **Ce qui l'a rendu visible** : comparer deux cas que rien ne distingue pour
  l'élève. `8/5 + 9/5 → 17/5` passe (« Parfait ! »), `4/3 + 2/3 → 6/3` échoue.
  Même geste, deux verdicts, parce que le premier résultat est déjà réduit.
- **Combien de fois** : |
- **La règle** : **quand deux règles justes se rencontrent, c'est la rencontre
  qu'il faut mesurer.** On ne la trouve qu'en fabriquant deux cas que l'élève
  croit identiques et en regardant s'ils reçoivent la même réponse.

---

## **Quatre fois de suite, c'est ma sonde qui avait tort** — 2026-09-29

- **Ce qui a coûté** : ~35 min sur une correction qui en valait dix. À chaque
  fois, un résultat alarmant venait de la sonde, pas du logiciel :
    - `[data-t="eff"]` pour la touche d'effacement, qui s'appelle `[data-eff]` :
      le champ gardait `8/4`, je tapais `2` derrière, et je concluais que la
      réponse réduite était refusée ;
    - un trait d'union `-` tapé là où la touche porte un vrai signe moins `−` :
      `(19-1)/12` n'était jamais saisi, et « la forme regroupée est refusée » ;
    - trois chemins essayés sur LA MÊME question : dès que le premier est
      accepté, la ligne change et les deux autres mesurent autre chose ;
    - un `text=Valider` cliqué alors que le bouton est désactivé quand le champ
      est vide — la sonde mourait au lieu de le dire.
- **Combien de fois** : ||
- **Ce qui manque** : de quoi **taper une expression** dans `tools/sonde.mjs` —
  `s.taperFormule('(3+5)/4')` qui trouve les vraies touches (y compris `−`,
  `⌫`, la barre de fraction), vide le champ avant, et refuse de valider si le
  bouton est éteint. Quatre sondes de suite l'ont réécrit de travers.
- **La règle** : **un résultat qui accuse le logiciel se revérifie en regardant
  ce que la sonde a réellement fait.** Trois des quatre fausses pistes se
  voyaient en imprimant le contenu du champ avant de valider.

---

**Une sonde peut passer au vert faute de sujet** — 29 septembre 2026

- **Ce que je voulais faire** : vérifier dans un vrai navigateur que les trois
  notations du signe fois (`×`, `·`, `*`) s'affichent bien jusqu'à l'écran.
- **Ce qui a coûté** : deux exécutions pour rien. La sonde demandait « l'écran
  n'affiche pas une AUTRE notation » — une assertion qui passe quand l'écran
  n'affiche AUCUNE multiplication, et c'était exactement le cas : l'extrait lu
  valait « Priorités : ligne par ligne 0 / 8 0 calcul mené au bout 💡 Pourq ».
  Trois coches vertes, zéro mesure. Le même piège a ensuite coûté un troisième
  tour sur la touche du pavé : `touches.every(...)` sur un tableau vide est
  vrai, et l'exercice choisi n'avait pas de pavé de saisie.
- **Combien de fois** : ||
- **Ce qui manque** : `tools/epreuveTombe.mjs` remet le défaut dans le code et
  exige qu'une **épreuve** tombe ; rien n'en fait autant pour une **sonde**, qui
  mesure pourtant le chemin de l'élève. Il faudrait pouvoir lancer une sonde
  contre une version du code où le réglage est débranché, et exiger qu'elle
  crie.
- **La règle** : **une assertion négative exige d'abord un sujet.** On ne juge
  pas « ce qui est écrit est bien écrit » avant d'avoir prouvé qu'il y a quelque
  chose d'écrit — un `dire('un produit finit par s'afficher', …)` avant le reste,
  et un `touches.length > 0` avant le `every`.

---

**L'accent grave, douzième fois — et cette fois c'est bash qui l'avale** — 30 septembre 2026

- **Ce que je voulais faire** : ajouter un commentaire CSS citant une propriété
  entre accents graves, via `node tools/remplacer.mjs` lancé depuis `bash`.
- **Ce qui a coûté** : une retouche de plus. Dans une chaîne à guillemets
  doubles, `bash` EXÉCUTE ce qui est entre accents graves : la propriété citée
  a disparu du fichier écrit, remplacée par le vide, et le terminal a répondu
  « space-between: command not found ». Écrit sans erreur de syntaxe, donc le
  `hook` `verifierSyntaxe.sh` n'avait rien à dire — le fichier était valide, il
  était seulement faux.
- **Combien de fois** : |||| |||| ||
- **Ce qui manque** : `tools/remplacer.mjs` devrait pouvoir lire ses arguments
  autrement que par la ligne de commande pour tout ce qui porte un accent
  grave. L'option `--depuis <paires.json>` existe déjà : ce qui manque, c'est
  que je m'en serve SANS ATTENDRE de m'être fait avoir — ou un refus net de
  l'outil quand un argument contient un accent grave venu de `bash`.
- **La règle** : **dès qu'un texte à écrire contient un accent grave, il passe
  par `--depuis <paires.json>`, jamais par la ligne de commande.**

---

**Le moteur savait, l'écran ne savait pas — et aucune épreuve ne reliait les deux** — 30 septembre 2026

- **Ce que je voulais faire** : ajouter un jeton au moteur de priorités (le
  moins unaire) et le voir jouable à l'écran.
- **Ce qui a coûté** : un exercice injouable livré à Rémy, et ses élèves
  arrêtés dessus. Le jeton avait été ajouté au moteur ET éprouvé — sept
  épreuves vertes sur `etapes()`, `reduire()`, `tirerExpression()`. Il manquait
  UN mot dans `jetonHtml`, et l'écran n'offrait rien à cliquer sous une consigne
  qui réclamait un clic. Toutes les épreuves regardaient le moteur ; aucune ne
  regardait la main qui le montre.
- **Combien de fois** : ||
- **Ce qui manque** : de quoi éprouver qu'un moteur et son écran parlent de la
  même chose, sans monter un navigateur. Ici la forme trouvée tient en trois
  lignes — on lit dans la source la liste des types cliquables et l'on exige
  qu'elle couvre tout ce que le moteur sait réduire — mais je l'ai écrite APRÈS
  coup, et rien ne me la rappellera la prochaine fois.
- **La règle** : **quand on ajoute au moteur, on ouvre l'écran.** Une sonde de
  trente secondes sur l'exercice concerné aurait tout dit ; sept épreuves
  vertes ne l'ont pas remplacée.

---

**Une sonde qui vise un sélecteur qui n'existe pas accuse le logiciel** — 30 septembre 2026

- **Ce que je voulais faire** : vérifier au navigateur qu'une opération est
  cliquable dans le jeu des priorités.
- **Ce qui a coûté** : deux fausses pistes dans la même heure. La sonde
  cherchait `[data-op]`, qui n'existe nulle part — l'opérateur porte la classe
  `.pr-jeton--op`. Elle répondait donc « aucune opération cliquable » sur TOUTES
  les expressions, y compris celles où le clic marchait. Puis, corrigée, elle
  cliquait le PREMIER opérateur, qui sur trois barreaux sur quatre est
  justement le mauvais choix : elle a rapporté « rien ne se passe » là où le jeu
  refusait correctement, avec une phrase d'explication à l'écran.
- **Combien de fois** : |||
- **Ce qui manque** : que `tools/sonde.mjs` sache lire un jeu plutôt que le
  DOM — `s.operationsCliquables()`, `s.cliquerOperation(n)` — au lieu que
  chaque sonde redevine les classes. Et, à défaut, qu'une sonde qui ne trouve
  AUCUNE cible le dise comme un défaut de mesure, pas comme un défaut du
  logiciel.
- **La règle** : **avant d'accuser, imprimer le HTML rendu.** Les deux fois, un
  `innerHTML` de la zone a donné la réponse en une seconde.

---

**Supposer la forme d'un retour au lieu de la lire** — 30 septembre 2026

- **Ce que je voulais faire** : afficher la liste des archives présentes sur le
  site, dans la nouvelle page d'administration.
- **Ce qui a coûté** : une section entière qui s'arrêtait de s'afficher au
  milieu, **sans un mot à l'écran**. `archivesPresentes()` rend des CHEMINS ;
  j'avais écrit `$a['nom']` en supposant des tableaux. En PHP 8 cela lève, les
  erreurs ne s'affichent pas en production, et le rendu s'interrompt net : le
  journal des dépôts et le dernier paragraphe manquaient. Ma sonde a signalé
  « le dépôt n'est pas inscrit au journal » — ce qui était faux, la base le
  contenait bien.
- **Combien de fois** : ||
- **Ce qui manque** : que le site d'essai de `tools/siteEssai.php` tourne avec
  `display_errors` et un gestionnaire d'erreurs qui écrit dans la page, pour
  qu'une erreur fatale de rendu se VOIE au lieu de se déduire d'un manque. Une
  page qui s'arrête à moitié ressemble à une page qui n'a rien à dire.
- **La règle** : **on lit la signature avant d'écrire l'appel.** Trente
  secondes de lecture contre vingt minutes de recherche à l'envers.

---

**Une épreuve qui interdit d'écrire pourquoi** — 30 septembre 2026

- **Ce que je voulais faire** : garder, par une épreuve, que les pages des
  classes ne reviennent pas dans l'administration.
- **Ce qui a coûté** : l'épreuve refusait toute MENTION de `classe.php` — et
  elle est tombée sur le commentaire d'en-tête qui explique précisément ce qui
  a été retiré et pourquoi. Dans un dépôt où l'on demande d'expliquer chaque
  décision à l'endroit où elle se prend, une épreuve qui interdit de nommer ce
  qu'on a supprimé se retourne contre la règle de la maison. Même piège la
  minute d'après : `lib/eleves.php` existe toujours et fait le travail.
- **Combien de fois** : ||
- **Ce qui manque** : rien à fabriquer — une habitude à tenir. Une épreuve de
  structure vise un APPEL (`require`, `href`, un identifiant de route), jamais
  une chaîne de caractères qui peut apparaître dans une phrase.
- **La règle** : **on n'interdit pas un mot, on interdit un lien.**

---

**Un signe assez contrasté, et pourtant invisible** — 30 septembre 2026

- **Ce que je voulais faire** : savoir POURQUOI les virgules de « Poser une
  opération » ne se voient pas, avant de les changer.
- **Ce qui a coûté** : vingt minutes, et surtout une fausse piste évitée de
  justesse. Les deux outils de la maison répondaient « tout va bien » :
  `contrasteRendu` donne un rouge franc sur fond clair, et la police de la
  virgule est celle des chiffres, 26 px. Le défaut n'était ni dans le contraste
  ni dans la taille mais dans la MATIÈRE — 136 pixels d'encre contre 866 pour
  le chiffre d'à côté, parce qu'une virgule n'occupe qu'un fond de glyphe. J'ai
  écrit ce comptage à la main dans deux sondes jetables avant de comprendre que
  c'était la mesure, et non l'une des deux autres.
- **Combien de fois** : |
- **Ce qui manque** : plus rien — `s.encre(selecteur)` est entrée dans
  `tools/sonde.mjs`, à côté de `contrasteRendu`, et rend les pixels d'encre
  d'un élément.
- **La règle** : **le contraste dit si un signe se LIT, l'encre dit s'il se
  VOIT.** Pour un petit signe — virgule, accent, exposant, point décimal — on
  mesure sa surface rapportée à celle de ses voisins.

---

**Photographier une grille que personne n'a remplie** — 30 septembre 2026

- **Ce que je voulais faire** : juger la taille d'une virgule dans la grille de
  l'addition posée — donc la voir ENTRE DES CHIFFRES, ce qui suppose d'avoir
  d'abord fait glisser les nombres.
- **Ce qui a coûté** : trois photos pour rien (une grille vide, où un signe
  seul paraît toujours assez gros), puis vingt lignes de sonde pour rejouer le
  glisser à la souris — retrouver quel chiffre on attrape, calculer la colonne
  qu'il vise, synthétiser `mouse.down/move/up`. Et c'est la photo de la grille
  REMPLIE qui a montré les deux vrais défauts : la virgule tombait sous la
  ligne, et en thème sombre la case suivante lui mangeait la moitié droite.
- **Combien de fois** : |
- **Ce qui manque** : un `s.glisser(source, cible)` dans `tools/sonde.mjs`.
  Une dizaine de jeux se jouent au glisser-déposer par `rendreGlissable`, et
  aucun ne se mesure tant qu'on ne sait pas y poser une pièce.
- **La règle** : **un écran vide ne se juge pas.** On joue l'exercice avant de
  le photographier.

---

**Une épreuve qui cherche son motif trop loin** — 30 septembre 2026

- **Ce que je voulais faire** : garder qu'Entrée, dans le champ de recherche,
  descend dans les résultats au lieu d'ajouter le premier au parcours.
- **Ce qui a coûté** : l'épreuve était verte avec ET sans le défaut ;
  `tools/epreuveTombe.mjs` l'a dit tout de suite, sans quoi elle partait au
  dépôt. Deux trous d'un coup, et tous deux viennent de la même paresse : elle
  lisait le gestionnaire de clavier ENTIER au lieu de la branche « Entrée ».
  Elle exigeait « viser(0) » quelque part — la branche ↓ le contient aussi — et
  n'interdisait que `addStep`, que le défaut atteignait par `activer`.
- **Combien de fois** : ||
- **Ce qui manque** : rien à fabriquer. `epreuveTombe.mjs` fait déjà le travail,
  et c'est la deuxième fois qu'il rattrape une épreuve creuse : il n'est pas
  facultatif.
- **La règle** : **une épreuve de structure découpe l'endroit où la décision se
  prend**, pas le bloc qui l'entoure. Interdire des noms ne garde que les
  défauts qu'on a imaginés.

---

**`elementFromPoint` rend aussi les ancêtres** — 30 septembre 2026

- **Ce que je voulais faire** : compter les lignes de résultat qu'une boîte
  flottante recouvre.
- **Ce qui a coûté** : dix minutes et une fausse alerte. `document.elementFromPoint`
  au centre d'une ligne à cheval sur le bas d'une zone qui défile rend LA ZONE,
  qui est son ancêtre — et la sonde criait au recouvrement là où la ligne était
  simplement en bas de sa fenêtre. La même mesure sert déjà ailleurs dans le
  dépôt ; elle ressortira.
- **Combien de fois** : |
- **Ce qui manque** : un `s.recouvertPar(selecteur)` dans `tools/sonde.mjs` le
  jour où la mesure revient une troisième fois.
- **La règle** : **un ancêtre qui répond n'est pas un recouvrement.** On écarte
  ce qui contient l'élément, on ne garde que ce qui se peint par-dessus.

---

**Le piège de l'accent grave, quatorzième fois** — 30 septembre 2026

- **Ce que je voulais faire** : écrire un commentaire citant un nom de classe
  (`choice--ok`) et un nom de fichier, par `tools/remplacer.mjs`, depuis la
  ligne de commande.
- **Ce qui a coûté** : dans une chaîne entre guillemets doubles, l'interpréteur
  EXÉCUTE ce qui est entre accents graves. Le commentaire est arrivé amputé de
  ses deux noms, le fichier restait syntaxiquement valide, `node --check` s'est
  tu, aucune épreuve n'a bronché. Seule une relecture à l'œil l'a trouvé — et
  l'on ne relit pas ce qu'on vient d'écrire. **La règle était déjà écrite dans
  CLAUDE.md, et je l'ai enfreinte deux fois dans la même journée.**
- **Combien de fois** : ||||||||||||||
- **Ce qui manque** : plus rien. `tools/remplacer.mjs` REFUSE désormais tout
  texte de plusieurs lignes passé en argument : le multiligne passe par
  `--depuis <paires.json>`, où aucun interpréteur ne se mêle du contenu. Le
  critère n'est pas « contient un accent grave » — quand l'interpréteur a fait
  son œuvre, les accents graves ont DISPARU du texte reçu, et l'outil ne peut
  pas voir le dégât : il ne peut que fermer le chemin par lequel il arrive.
- **La règle** : **une règle qu'on doit se rappeler n'est pas une règle, c'est
  un vœu.** Quand un piège revient trois fois, on ne réécrit pas la consigne :
  on ferme le chemin.

---

**Une sonde qui ne joue que les réglages qu'elle pose** — 30 septembre 2026

- **Ce que je voulais faire** : éprouver un exercice neuf, barreau par barreau.
- **Ce qui a coûté** : la sonde ouvrait l'exercice avec `{ marches: [...] }` à
  chaque fois — huit barreaux, huit passages verts. Or le professeur, lui,
  l'ouvre SANS réglage. Et là, `marchesCochees(p, M, null)` levait « Cannot
  read properties of null » : `null` n'est pas `undefined`, une valeur par
  défaut de paramètre ne s'applique qu'au second. L'écran restait à « 0 / 8
  questions », sans une proposition. Trouvé par hasard, en comparant la taille
  des cartes avec l'exercice voisin.
- **Combien de fois** : |
- **Ce qui manque** : `tools/nouvelExercice.mjs` pourrait ouvrir le générateur
  avec `params: {}` et signaler une exception — deux cents millisecondes contre
  un exercice injouable livré.
- **La règle** : **le réglage par défaut est un cas de figure, et c'est celui
  que l'utilisateur reçoit.** Une sonde qui pose toujours ses réglages ne le
  joue jamais.

---

**Une règle hors d'atteinte des épreuves** — 30 septembre 2026

- **Ce que je voulais faire** : comprendre pourquoi « Enlever les parenthèses »
  refusait une ligne juste. Rémy : « il me compte faux ».
- **Ce qui a coûté** : le juge des lignes intermédiaires lisait un champ
  `verifie` qu'AUCUN générateur du dépôt ne fournit. Il refusait donc tout,
  depuis toujours, y compris la ligne que l'activité finit par écrire
  elle-même. Quatre mille épreuves au vert, et l'exercice injouable. La cause
  n'est pas la faute elle-même — elle est banale — mais son ABRI : le juge
  vivait dans `activities/litteralSaisie.js`, qui touche le document dès qu'on
  l'importe. `node --test` y tombe sur « document is not defined ». Aucune
  épreuve ne POUVAIT l'atteindre.
- **Combien de fois** : |
- **Ce qui manque** : un outil qui liste les fonctions de décision — celles qui
  rendent juste/faux — vivant dans un module inimportable sans navigateur.
  Elles sont, par construction, celles qu'aucune épreuve ne garde.
- **La règle** : **une règle qu'aucune épreuve ne peut atteindre se casse en
  silence.** Ce qui décide du juste et du faux sort de l'écran et va dans un
  module que `node --test` peut importer.

---

**Trois mesures fausses de suite sur le même écran** — 30 septembre 2026

- **Ce que je voulais faire** : taper une ligne dans le champ de
  `litteralSaisie` et lire le verdict.
- **Ce qui a coûté** : quarante minutes, et la correction était déjà écrite —
  c'est la sonde qui mentait. Trois fois, pour trois raisons différentes :
  (1) le champ n'est pas un `<input>`, le vider par `textContent = ''` efface
  les trois `<span>` qui le composent ; (2) le clavier physique n'accepte pas
  les parenthèses, si bien qu'une ligne comme « −(−9) » ne pouvait pas être
  tapée du tout ; (3) rouvrir l'exercice TIRE UNE NOUVELLE QUESTION, et la
  sonde retapait la réponse de la précédente. À chaque fois, elle accusait le
  logiciel de refuser une ligne juste qui ne l'était pas.
- **Combien de fois** : ||
- **Ce qui manque** : un `s.taperAuPave(texte)` dans `tools/sonde.mjs` — vider
  par ⌫, cliquer les touches `.ls-t`, valider — et un `s.mêmeQuestion()` qui
  dise si le tirage a changé entre deux mesures.
- **La règle** : **quand la sonde accuse le logiciel, on soupçonne la sonde
  d'abord.** Et l'on tape sur le pavé de l'écran, jamais dans le DOM.

---

**Une règle écrite dans un fichier, appliquée dans trois sur cent six** — 1er octobre 2026

- **Ce que je voulais faire** : rendre au robot de démonstration un rythme et
  des phrases courtes, sur tout le logiciel.
- **Ce qui a coûté** : cinq agents d'audit, et le constat est le même partout.
  La règle `COURT = 110` existe depuis longtemps, elle est JUSTE, elle est bien
  commentée — et elle est recopiée À LA MAIN dans trois fichiers sur cent six.
  Résultat : 91 bulles écrites en toutes lettres au-dessus de la limite, dont
  une de 243 caractères, et une vingtaine d'autres construites à l'exécution
  qui montaient à 275. Personne n'avait rien cassé : la règle n'avait simplement
  jamais eu de bras.
- **Combien de fois** : |||
- **Ce qui manque** : plus rien ici — `tools/robotCourt.mjs` compte les bulles
  littérales et les clés de `DEMO_SPEED` qui n'existent pas,
  `tests/robotCourt.test.mjs` le fait tourner à chaque commit, et
  `enUneBulle()` garde celles qu'on ne connaît qu'à l'exécution. Mais la
  QUESTION reste ouverte pour les autres règles du dépôt : combien d'entre
  elles sont, elles aussi, écrites une fois et appliquées trois ?
- **La règle** : **une convention sans harnais est une convention qui s'use.**
  Le jour où l'on écrit « on fait toujours X », on écrit aussi ce qui le
  compte.

---

**Un harnais qui accuse le commentaire expliquant le défaut** — 1er octobre 2026

- **Ce que je voulais faire** : compter les emplois fautifs de `DEMO_SPEED`.
- **Ce qui a coûté** : cinq minutes, et une ligne de rapport fausse — mon outil
  comptait comme faute le COMMENTAIRE de `demoPointer.js` qui raconte
  précisément ce piège (« cinq jeux écrivaient gate.wait(2500 * DEMO_SPEED) »).
  **C'est la deuxième fois en deux jours** : une épreuve avait déjà trébuché
  sur le commentaire expliquant ce qu'on venait de retirer. Dans un dépôt dont
  la règle est d'expliquer chaque décision à l'endroit où elle se prend, tout
  outil qui lit le code EN CROISERA.
- **Combien de fois** : ||
- **Ce qui manque** : rien à fabriquer — `sansCommentaires()` est dans
  `tools/robotCourt.mjs` et s'exporte. Le prochain outil qui lit du code la
  réutilise.
- **La règle** : **un outil qui lit le code lit d'abord le code, pas les
  commentaires.** On les retire avant de chercher, en gardant les positions.

---

**Un réglage qui voyage mais qui n'arrive nulle part** — 1er octobre 2026

- **Ce que je voulais faire** : comprendre pourquoi l'aperçu du professeur,
  réglé sur « ordinateur », passait en téléphone dès qu'on cliquait le robot.
- **Ce qui a coûté** : deux sondes pour rien avant la bonne. J'ai d'abord
  mesuré le chemin du bac à sable — tout y était juste, 1400 px avant comme
  après — et j'en ai conclu que je ne reproduisais pas le défaut, alors que
  je mesurais simplement UN AUTRE CHEMIN. Il a fallu que Rémy redise la suite
  exacte — zone prof, aperçu en ordinateur, je commence l'exercice, je clique
  le robot — pour que je vise le volet de l'Atelier.
- **Combien de fois** : ||
- **Ce qui manque** : rien à fabriquer. `tools/robotGardeLAppareil.mjs` garde
  ce chemin-là, et il le garde parce qu'il est le seul à le parcourir.
- **La règle** : **quand une mesure ne reproduit pas le défaut, c'est le
  CHEMIN qu'on vérifie d'abord, pas la conclusion.** « Je n'arrive pas à le
  reproduire » veut presque toujours dire « je ne fais pas la même chose ».

- **Et le défaut lui-même mérite sa ligne** : le commentaire d'`appareilDuProf`
  décrivait DÉJÀ ce piège — « chaque volet est un CADRE, avec son propre
  core/state.js […] le choix ne pouvait pas voyager », d'où l'envoi par
  l'adresse. On l'avait fait PARTIR ; personne n'avait écrit la ligne qui le
  fait ARRIVER. **Un réglage qu'on transmet et qu'on ne rassied pas n'est pas
  transmis.**

---

**Le serveur d'essai ne pose pas la CSP, donc on ne mesure pas la vraie page** — 1er octobre 2026

- **Ce que je voulais faire** : ajouter un tableau et un export CSV à la page
  des billets, comme Rémy l'a demandé.
- **Ce que j'ai trouvé en chemin** : la page portait un
  `onclick="window.print()"`. Une fenêtre ouverte par `window.open('')` HÉRITE
  de la CSP de son ouvreur, et notre `script-src` n'a pas 'unsafe-inline' — le
  bouton était donc MORT chez Rémy et VIVANT chez nous depuis le jour où il a
  été écrit, parce que `tools/siteEssai.php` ne pose pas l'en-tête. Deux
  occurrences, et aucun des trois harnais ne pouvait les voir.
- **Combien de fois** : |
- **Ce qui manque, et qui existe maintenant** : `tools/fenetresFilles.mjs`. Il
  remesure que la CSP voyage (avec un TÉMOIN sans en-tête, sans quoi un « non »
  pourrait n'être qu'un clic qui n'a pas atteint le bouton) et relit tout `js/`
  pour y refuser le moindre gestionnaire d'attribut.
- **Ce qui manque encore** : une sonde qui parcourt l'application avec la CSP
  de production posée par interception. Tant qu'elle n'existe pas, TOUT ce que
  la CSP refuse est invisible en local. Je n'ai pas fabriqué celle-là
  aujourd'hui : elle mérite d'être pensée, pas bâclée.
- **La règle** : **un serveur d'essai plus permissif que le vrai ne mesure pas
  le vrai.** Chaque écart entre les deux est un défaut qu'on livrera sans
  jamais le voir.

---

**Mon propre détecteur a crié au loup sur quatre mots français** — 1er octobre 2026

- **Ce qui a coûté** : le détecteur de gestionnaires d'attribut cherchait `on`
  suivi de lettres. Il a désigné `{ only = 'tout' }` et `let onglet =
  'consigne'`. Quatre fausses pistes sur six.
- **Combien de fois** : || (déjà payé avec `tools/robotCourt.mjs`, qui comptait
  un commentaire comme une faute)
- **La règle** : **un détecteur qui crie au loup se fait désactiver au
  troisième cri.** Nommer les cas un par un est plus long à écrire et ne se
  trompe pas ; une épreuve du détecteur LUI-MÊME, nourrie de faux positifs
  connus, coûte dix lignes (`tests/fenetresFilles.test.mjs`).

---

**La sonde accuse, et c'est la sonde qui a tort** — 1er octobre 2026

- **Ce qui a coûté** : Rémy demandait si l'on pouvait retirer un élève. Ma
  sonde cliquait « retirer » sur une ligne, écrivait RETIRER, cliquait
  `^retirer$` — et tombait sur le « retirer » de la PREMIÈRE LIGNE du tableau,
  puisque la casse ne comptait pas. Elle rouvrait donc la fenêtre au lieu de la
  valider, et concluait « LA LISTE N'A PAS CHANGÉ ». Le logiciel, lui, marchait.
- **Combien de fois** : |||| (quatre fois dans la même journée : sélecteurs
  inventés, champ détruit, question redessinée, et celle-ci)
- **Ce qui manque** : `tools/sonde.mjs` pourrait porter un `s.fenetre()` qui
  vise `#demander-champ` / `#demander-ok` / `#demander-non`, et un
  `s.repondre('RETIRER')` qui fait les trois gestes. Toutes mes sondes qui
  confirment quelque chose réécrivent ces six lignes, et trois s'y sont
  trompées.
- **La règle** : **quand la sonde accuse le logiciel, on suspecte la sonde
  d'abord — et on regarde la PHOTO.** Une commande se vise par son identifiant,
  jamais par son texte : un écran en porte souvent dix du même nom.

---

**J'invente les sélecteurs de mes sondes, et je recommence** — 1er octobre 2026

- **Combien de fois** : ||||| (cinq, dans la même journée : `[data-classe]`,
  le « retirer » de la première ligne, `.toast`, et deux autres)
- **Ce qui a coûté, cette fois** : la sonde lisait les avis par
  `[class*=toast]`. Les avis n'ont AUCUNE classe — ils vivent dans
  `#toast-container`. Elle a donc conclu « rien ne se passe » sur un bouton qui
  affichait « ajouté à la séance », et j'ai cherché le défaut dans le code
  pendant trois tours.
- **Ce qui manque** : `tools/sonde.mjs` devrait porter `s.avis()` (le texte des
  avis affichés), `s.fenetre()` et `s.repondre()` (la fenêtre de confirmation).
  Toutes mes sondes réécrivent ces lignes, et une sur deux se trompe.
- **La règle** : **avant d'écrire un sélecteur, on le LIT dans la source.**
  « Ça devrait s'appeler comme ça » n'est pas une mesure.

---

**Une empreinte qui ne regarde que trois champs choisis** — 1er octobre 2026

- **Ce que je mesurais** : si le bouton « + un exercice » atteignait le
  serveur. Ce que j'ai trouvé : **un parcours retouché dans Préparer ne
  remontait jamais**, depuis toujours, et rien ne le disait.
- **La cause** : `empreinte()` lisait `name`, `steps` et `policy` AU PREMIER
  NIVEAU. Les entrées de bibliothèque rangent le parcours dans `.data` :
  l'empreinte valait `{"n":"Séance du lundi"}` et ne bougeait plus. Le cache
  répondait « déjà monté » en mentant.
- **Combien de fois** : |
- **Ce qui manque** : rien à fabriquer — la fonction est sortie dans
  `js/core/empreinteParcours.js`, où `npm test` peut l'atteindre. Elle vivait
  dans un fichier qui importe `state.js`, lequel veut un `document` : aucune
  épreuve ne pouvait la toucher, et c'est exactement là que le défaut s'est
  logé pendant des mois.
- **La règle** : **trois champs choisis à la main sont un pari sur la forme de
  l'objet ; l'objet entier n'en est pas un.** Et : **ce qu'aucune épreuve ne
  peut atteindre finit par être faux.**

---

**« Convertir dix échelles » en était quatre, cinq erreurs et quatre bornes** — 1er octobre 2026

- **Ce que je croyais faire** : convertir dix menus déroulants en colonnes de
  cases, parce qu'un outil de cohérence les signalait tous les dix.
- **Ce que c'était vraiment, après les avoir regardés un par un** : quatre
  vraies échelles (converties), CINQ drapeaux `echelle: true` posés à tort sur
  des réglages qui ne sont pas des progressions — l'opération de Math Crush,
  la taille d'une grille, la fréquence d'un codage —, et quatre BORNES sur une
  suite qui s'enchaîne (« Leçon de départ », « Jusqu'à quel niveau »), qu'on ne
  compose pas.
- **Combien de fois** : |
- **Ce qui manque** : rien à fabriquer, mais une règle à écrire dans l'outil —
  c'est fait : il porte maintenant une table d'exceptions AVEC LEUR RAISON, et
  ne les compte plus comme des écarts.
- **La règle** : **un signalement n'est pas un diagnostic.** Un outil dit « ces
  dix-là ne suivent pas la convention » ; il ne dit pas lesquels DEVRAIENT la
  suivre. Les dix méritaient d'être ouverts un par un, et six d'entre eux
  n'avaient aucun travail à faire — seulement une erreur de déclaration à
  corriger, ou une raison à écrire.
- **Et le corollaire** : **un drapeau employé pour autre chose que son sens
  fabrique du faux travail.** `echelle: true` veut dire « progression
  composable » ; il avait été posé cinq fois comme s'il voulait dire « réglage
  qui change la difficulté ».

---

**`epreuveTombe.mjs` ne savait pas remettre un défaut qui tient sur plusieurs
lignes** — 2026-10-01

- *Ce que je voulais faire* : voir tomber sept épreuves neuves (le bac à sable
  que le professeur remplit, le lien du nom dans l'administration). Six défauts
  tenaient sur une ligne ; le septième — le ternaire à trois lignes de
  `api/lib/seance.php` qui distingue `null` de `[]` — n'en tenait pas.
- *Ce qui a coûté* : deux essais ratés. J'ai d'abord écrit les paires dans un
  fichier JSON et passé `--depuis`, par analogie avec `remplacer.mjs` ; l'outil
  a lu `--depuis` comme le texte à remplacer et m'a répondu « apparaît 0 fois ».
  Puis il a fallu chercher une ancre d'UNE ligne qui soit à la fois unique dans
  le fichier et assez signifiante pour que l'épreuve tombe pour la bonne raison.
- *Combien de fois* : |
- *Ce qui manque — fait dans la foulée* : `epreuveTombe.mjs` accepte maintenant
  `--depuis <paires.json>` comme `remplacer.mjs`, dont il se servait déjà pour
  écrire. Le défaut à trois lignes de `api/lib/seance.php` se remet désormais
  d'une commande, et l'on peut abîmer deux endroits d'un coup quand un seul
  défaut se répare en deux.
- *La règle* : **deux outils qui prennent les mêmes arguments doivent les
  prendre de la même façon.** Une différence invisible entre deux signatures
  jumelles se paie en essais, pas en lecture de code.

---

**Aucun harnais ne regardait un SECOND ordinateur** — 2026-10-01

- *Ce que je voulais faire* : comprendre pourquoi un parcours créé au collège
  n'était pas sur le Mac de Rémy chez lui. Trois défauts sur la même chaîne,
  dont un depuis le premier jour du raccordement au serveur.
- *Ce qui a coûté* : non pas la correction — une ligne, un appel, un déballage —
  mais le fait que **rien ne pouvait le voir**. `npm test` ne sort pas du
  processus, `testApi.php` ne regarde que le serveur, et `boutEnBout.mjs` ouvre
  deux ONGLETS, qui partagent IndexedDB : le parcours y est déjà, et la
  synchronisation n'a rien à faire pour qu'on le voie. Quatre mille épreuves
  vertes sur un logiciel où la bibliothèque ne descendait jamais.
- *Combien de fois* : |
- *Ce qui manque — fait dans la foulée* : `tools/deuxPostes.mjs`, qui ouvre un
  **contexte neuf** (`nav.newContext()`, donc un navigateur qui n'a jamais rien
  vu de ce compte) et refait le geste : créer au collège, retrouver à la
  maison. À réutiliser pour tout ce qui doit suivre le professeur ou l'élève
  d'un appareil à l'autre.
- *La règle* : **deux onglets ne sont pas deux ordinateurs.** Tout ce qui
  s'enregistre dans le navigateur se mesure dans un contexte neuf, ou ne se
  mesure pas.

---

**Une épreuve qui lit le commentaire au lieu du code** — 2026-10-01

- *Ce que je voulais faire* : garder par une épreuve l'ORDRE de deux appels
  (`ramenerLaBibliotheque()` avant `monterLaBibliotheque()`), et le fait que la
  route PHP n'emploie plus `+` pour remplacer une clef.
- *Ce qui a coûté* : deux fois la même chute. Les deux épreuves lisaient le
  fichier source et comparaient des `indexOf` — mais **le correctif cite le
  défaut dans son commentaire**, parce que c'est la règle de ce dépôt
  (« annoncer ce qui a été mesuré »). La première épreuve accusait donc le
  commentaire qui raconte la correction ; la seconde restait VERTE en inversant
  l'ordre des appels, parce que le commentaire au-dessus les nomme dans le bon
  ordre. Trouvée par `epreuveTombe.mjs`, pas par la relecture.
- *Combien de fois* : ||
- *Ce qui manque* : une fonction partagée pour les épreuves qui lisent du code
  source — `sansCommentaires(texte)` — plutôt que le filtre recopié deux fois.
  Deux lignes, mais la troisième fois sera la bonne pour l'écrire quelque part.
- *La règle* : **une épreuve qui lit du source doit retirer les commentaires
  avant de chercher.** Sinon, expliquer un défaut suffit à faire mentir
  l'épreuve qui le garde — et ce dépôt explique TOUT.

---

**Une épreuve qui lit du source accuse le commentaire qui explique la correction** — 2026-10-01

- *Ce que je voulais faire* : garder par des épreuves quatre décisions qui ne
  vivent que dans le source — l'opérateur PHP, l'ordre de deux appels, la
  police d'une règle CSS, le fait que rouvrir un message ne touche pas au
  canevas du meneur.
- *Ce qui a coûté* : quatre chutes, dont **deux épreuves VERTES qui ne
  gardaient rien** — trouvées par `epreuveTombe.mjs`, pas par la relecture. La
  cause est structurelle, pas distraite : ce dépôt exige qu'un bon commentaire
  **cite le défaut qu'il ferme**, si bien qu'une épreuve qui lit la prose comme
  du code punit exactement ce qu'on veut encourager. L'une s'accusait
  elle-même ; l'autre restait verte en inversant les deux appels, parce que le
  commentaire au-dessus les nomme dans le bon ordre.
- *Combien de fois* : ||||
- *Ce qui manque — fait dans la foulée* : `sansCommentaires(texte)` dans
  `tests/helpers.mjs`, avec les quatre mesures qui l'ont payée. Les trois
  copies écrites à la main ont été remplacées par elle.
- *La règle* : **une épreuve qui lit du source retire les commentaires avant de
  chercher.** Et son corollaire, trouvé le même soir : **une épreuve qui garde
  une POSITION ne garde rien quand c'est une CONDITION qui décide** — comparer
  `indexOf('path-step--mot')` et `indexOf('path-step--broken')` reste vrai
  quand on remplace le test par `if (false)`.

---

**La sonde mesurait son propre réglage, puis son propre à-peu-près** — 2026-10-01

- *Ce que je voulais faire* : mesurer le mot du professeur de bout en bout dans
  un navigateur — l'atelier, l'écran de l'élève, le fil.
- *Ce qui a coûté* : trois faux signalements d'affilée, tous de la sonde et non
  du logiciel. (1) Elle attendait « 20 questions » en dur, alors que chaque
  exercice apporte SON compte naturel : 25. (2) Elle lançait le meneur avec
  `sansTrace: true`, donc sans journal, donc sans fil — et annonçait « 0 case »
  sur un fil qui marche. (3) Elle cherchait le panneau des parcours sans avoir
  cliqué « Préparer », et lisait `document.body.innerText`, qui ne rend que le
  texte VISIBLE : le témoin « Parcours découverte » était absent lui aussi, ce
  qui est la seule raison pour laquelle je ne l'ai pas crue.
- *Combien de fois* : ||
- *Ce qui manque* : rien à fabriquer ; une habitude à tenir. **Toute mesure
  porte un TÉMOIN** — une valeur dont on sait d'avance qu'elle doit être vraie.
  Sans lui, on ne distingue pas « le logiciel est cassé » de « la sonde regarde
  ailleurs », et c'est la sonde trois fois sur trois.
- *La règle* : **on mesure une DIFFÉRENCE, pas une valeur en dur** (le total
  avant et après l'ajout, plutôt que 20), et **on ne coupe pas le journal dans
  une sonde qui va regarder quelque chose qui se dessine à partir du journal.**

---

**Un sélecteur inventé, encore — et le témoin qui l'a dit** — 2026-10-01

- *Ce que je voulais faire* : vérifier dans une sonde qu'aucune fenêtre modale
  ne s'ouvre quand on écrit un mot dans la ligne du parcours.
- *Ce qui a coûté* : deux faux signalements de plus dans la même sonde.
  `.path-step:nth-of-type(2)` ne vise pas la deuxième ligne `.path-step` mais le
  deuxième DIV frère — la liste en porte d'autres. Et `.modal-title` existe en
  PERMANENCE dans la page, caché (la confirmation universelle, entre autres) :
  la sonde annonçait « la fenêtre modale est revenue » alors qu'aucune n'était
  visible. Neuvième et dixième sélecteurs inventés depuis que la règle est
  écrite.
- *Combien de fois* : ||||||||||
- *Ce qui manque* : la règle existe déjà — « avant d'écrire un sélecteur, on le
  LIT dans la source ». Ce qui manque, c'est son corollaire : **ce qui est dans
  le document n'est pas ce qui est à l'écran.** Toute question de la forme « y
  a-t-il un X » se mesure sur les éléments VISIBLES (`getBoundingClientRect()
  .width > 0`), jamais sur `querySelector` seul.
- *La règle* : **compter ce qu'on voit, pas ce qui existe.** Et, pour les
  listes : viser par index sur `querySelectorAll('.classe')`, jamais par
  `:nth-of-type`, qui compte les frères et non la classe.

---

**Un re-rendu au départ d'un champ vole le clic suivant** — 2026-10-01

- *Ce que je voulais faire* : écrire un mot du professeur directement dans la
  ligne du parcours, avec deux champs — le titre, puis le texte.
- *Ce qui a coûté* : une heure à soupçonner Playwright. La sonde perdait le
  titre, et un essai direct dans la page, à la main, marchait parfaitement :
  j'ai donc cru à un artefact d'outil. C'en était un à moitié — et l'autre
  moitié était un VRAI défaut : `onblur` rappelait `renderTeacherPath()`, qui
  refabrique la ligne, donc **le champ que le doigt visait était détaché avant
  que le clic n'y arrive**. Un professeur passant du titre au texte d'un clic
  aurait dû cliquer deux fois, sans comprendre pourquoi.
- *Combien de fois* : |
- *Ce qui manque* : rien à fabriquer — une mesure à ajouter, et elle l'est :
  la sonde vérifie maintenant que `document.activeElement` est bien le champ
  visé après le clic.
- *La règle* : **un écran qui se redessine au départ d'un champ perd le geste
  qui l'a fait partir.** Avant d'appeler un rendu dans un `blur`, se demander ce
  qu'il rafraîchit vraiment — ici, rien du tout.

---

**Un panneau qui ne se dessine qu'au CLIC sur son onglet** — 2026-10-01

- *Ce que je voulais faire* : mesurer le gestionnaire de parcours dans le
  navigateur — cocher, ranger, jeter.
- *Ce qui a coûté* : sept allers-retours de sonde, tous sur le même
  malentendu. `montrerPanneau('parcours')` DÉPLIE le panneau, et ne dessine
  rien : la liste n'existe que par le rappel `auRendu` que `initTiroirOnglets`
  déclenche **sur le clic**. La sonde voyait donc un panneau ouvert, un
  `<select>` visible, zéro ligne — et accusait tour à tour le tri, la case à
  cocher, puis la barre d'actions. Ce qui m'a sauvé, c'est le témoin : même
  « Parcours découverte », présent depuis le premier démarrage, manquait.
- *Combien de fois* : |
- *Ce qui manque* : rien à fabriquer, une ligne à retenir — et elle rejoint la
  règle des sélecteurs : **on emprunte la porte, on n'appelle pas la fonction
  qui est derrière.** Ici, `click('[data-tiroir="parcours"]')`.
- *La règle* : **appeler la fonction qu'un bouton appelle n'est pas cliquer le
  bouton.** Un écran monte souvent en deux temps — montrer, puis remplir — et
  seul le geste fait les deux.

---

**Une sonde qui cherche une faute en trouve une autre** — 2026-10-01

- *Ce que je voulais faire* : vérifier que les quatre rangements rangent.
- *Ce qui a coûté* : rien — et c'est pour cela que je le note. La sonde a
  affiché « Mimosa · Mimosa · Zèbre » pour trois parcours aux noms distincts.
  Cause : `saveTeacherPath` fabriquait `'path_' + Date.now()`, et trois
  enregistrements dans la même milliseconde partagent leur identifiant. Ce
  n'est pas un cas de laboratoire — `generateSampleData` enregistre deux
  parcours coup sur coup — et au serveur ce serait pire : `ON CONFLICT(id) DO
  UPDATE`, donc le second ÉCRASE le premier sans un mot.
- *Combien de fois* : |
- *Ce qui manque* : rien. C'est un succès de méthode, pas une friction.
- *La règle* : **une sonde qui mesure trois cas distincts attrape ce qu'une
  épreuve d'un seul cas ne peut pas voir.** Un identifiant qui se répète est
  invisible tant qu'on ne crée qu'un objet à la fois — c'est-à-dire dans
  toutes les épreuves qu'on écrit naturellement.

---

**Une colonne ajoutée sans monter le numéro de schéma casse le site de Rémy** — 2026-10-01

- *Ce que je voulais faire* : ajouter deux colonnes (`classes.bac_jeux`,
  `paths.supprime_le`).
- *Ce qui a coûté* : **deux pannes en production, dont une pendant son cours.**
  `migrerSiNecessaire()` ne migre QUE si le numéro stocké diffère de
  `VERSION_SCHEMA` — une constante à monter À LA MAIN. Oubliée deux fois. Sa
  base, à jour de numéro et en retard de colonnes, répondait 500 sur
  `/teacher/paths` (« Le serveur a refusé ») **et sur `/login`** : ses élèves
  lisaient « Connexion impossible pour l'instant. Préviens ton professeur. »
  La consigne était pourtant écrite en toutes lettres au-dessus de la
  constante : « le seul geste qu'une modification de schéma demande ».
- *Combien de fois* : ||
- *Ce qui manque — fait dans la foulée* : **on ne demande plus de s'en
  souvenir.** La version est l'empreinte des définitions de tables
  (`versionDuSchema()`), et la migration des bases existantes est DÉRIVÉE de
  ces mêmes définitions au lieu d'une seconde liste tenue à la main — laquelle
  avait d'ailleurs oublié `assignments.path_identity` depuis des mois. Le
  harnais vérifie en plus que CHAQUE colonne déclarée existe vraiment en base.
- *La règle* : **un geste manuel que le logiciel pourrait faire finit par être
  oublié, et la consigne écrite au-dessus n'y change rien.** Quand un oubli se
  paie en panne chez l'utilisateur, ce n'est pas une consigne qu'il faut
  renforcer : c'est le geste qu'il faut supprimer.

---

**Deux connexions SQLite ne voient pas le même schéma au même instant** — 2026-10-01

- *Ce que je voulais faire* : vérifier dans `testApi.php` qu'une base à qui l'on
  arrache une colonne la retrouve au premier appel de l'API.
- *Ce qui a coûté* : six allers-retours. L'épreuve arrachait la colonne depuis
  une connexion PDO à part, puis interrogeait l'API, qui a la sienne : les deux
  ne voyaient pas le même schéma, et l'épreuve mesurait surtout ce décalage.
  Elle a dit « la migration ne part pas » alors qu'un essai en processus
  unique montrait qu'elle part parfaitement.
- *Combien de fois* : |
- *Ce qui manque* : rien à fabriquer. **Ce qui touche au SCHÉMA se mesure dans
  un seul processus, sur une base à part** — pas à travers le serveur d'essai.
  Ce qui touche aux DONNÉES, lui, se mesure très bien par HTTP.
- *La règle* : **une épreuve qui compare deux vues d'une même base mesure leur
  décalage avant de mesurer le logiciel.**

---

**Deux écrivains, une seule ligne, deux formes différentes** — 2026-10-01

- *Ce que je voulais faire* : comprendre pourquoi une séance donnée arrivait
  chez l'élève avec « 0 exercice à faire ».
- *Ce qui a coûté* : une panne en classe, et un contournement que Rémy a
  trouvé seul — « il fallait que je remette la séance ». Deux fonctions
  écrivaient la MÊME ligne `paths` avec deux FORMES : `donnerAuServeur` envoyait
  le parcours, `monterLaBibliotheque` envoyait l'enveloppe de « Préparer », où
  le parcours est un étage plus bas. Le dernier qui écrit gagne — et comme la
  veille remonte toute la bibliothèque deux secondes après chaque retouche,
  c'était presque toujours l'enveloppe. `normalizePath` sur une enveloppe rend
  ZÉRO étape : l'élève recevait le bon nom, la bonne classe, et rien dedans.
- *Combien de fois* : ||  (déjà vu en v906 sur le rapatriement de la
  bibliothèque — même forme, même silence, autre chemin.)
- *Ce qui manque* : rien à fabriquer. **Une seule forme en base**, imposée à
  l'écriture (`monterUnParcours` déballe avant d'envoyer), et le déballage
  gardé À LA RÉCEPTION pour les lignes déjà écrites de travers.
- *La règle* : **deux écrivains sur une même ligne doivent écrire la même
  forme, et c'est à l'écriture qu'on l'impose, pas à la lecture.** Quand on
  s'aperçoit qu'un lecteur doit deviner la forme, c'est qu'il y en a déjà deux —
  et le prochain lecteur, lui, ne devinera pas.

**Une sonde qui écrit les noms attendus à la main mesure son arithmétique** — 2026-10-01

- *Ce que je voulais faire* : mesurer la fenêtre « Gérer mes parcours » — clic,
  Maj, Ctrl, Ctrl+A, le cadre qu'on tire, exporter, importer.
- *Ce qui a coûté* : **sept rouges sur trois passages, pour UN seul vrai
  défaut.** La bibliothèque porte deux parcours semés depuis le premier
  démarrage (« Parcours découverte », « Tout sur papier »), et par ordre
  alphabétique ils tombent après les cinq que la sonde avait posés. Mes
  `=== 'Cc troisième|Dd quatrième|Ee cinquième'` étaient donc faux ; le cadre
  prenait exactement ce qu'il devait prendre. Même histoire avec le parcours
  « ressorti de la corbeille » (la corbeille range par date de jet, pas par
  ordre d'arrivée) et avec le parcours exporté (« Aa premier » était à la
  corbeille à ce point du scénario).
- *Combien de fois* : |||| (v905 : « 25 au lieu de 20 » ; v908 : le total du
  tiroir ; v911 : la ligne du mot ; ici, trois fois dans le même fichier.)
- *Ce qui manque* : rien à fabriquer, une règle à tenir. **Une sonde LIT
  l'écran, puis compare l'écran à lui-même.** `const alEcran = await noms()`
  puis `alEcran.slice(2)` dit la même chose que trois noms recopiés, et reste
  vraie quand le catalogue change. Les noms écrits à la main ne valent que pour
  ce que la sonde vient elle-même de poser, jamais pour ce qu'elle a trouvé.

**Un crochet inventé rend la même réponse qu'un logiciel cassé** — 2026-10-01

- *Ce que je voulais faire* : un témoin disant « l'exercice est bien monté
  derrière la bulle », pour que la mesure de la bulle ne passe pas au vert sur
  un plateau vide.
- *Ce qui a coûté* : quatre sélecteurs inventés d'affilée
  (`#game-board .question-text`, `.exo-wrap`, `canvas`, `input`), un témoin
  rouge sur un exercice parfaitement monté, et la tentation d'aller chercher le
  défaut dans la bulle. Le plateau écrit `.game-question`. Dix secondes pour le
  lire, vingt minutes pour le deviner.
- *Combien de fois* : ||||||||||||||| (quinzième de ce chantier : `.modal-title`
  qui existe mais vide, `.icon-btn` au lieu de `.btn-icon`, `:nth-of-type(2)`
  qui compte les frères…)
- *Ce qui manque* : **fabriqué** — `s.doitExister(selecteur, pourquoi)` dans
  `tools/sonde.mjs`. Il rend le nombre d'éléments trouvés et **jette** à zéro,
  avec le crochet dans le message. Une sonde qui s'arrête sur « ce crochet ne
  désigne rien » coûte dix secondes ; une sonde qui répond `false` en coûte
  vingt minutes, parce qu'on cherche alors au mauvais endroit.

**Insérer un bloc de code par script double les barres obliques** — 2026-10-01

- *Ce que je voulais faire* : ajouter soixante lignes de mesure au milieu d'une
  sonde, par un script Python (`remplacer.mjs --depuis` pour le reste).
- *Ce qui a coûté* : un passage entier de sonde (quatre minutes) pour un
  `/(\d+)/` arrivé sur le disque en `/(\\d+)/` — un motif qui cherche une barre
  oblique suivie de chiffres, donc qui ne trouve jamais rien. La sonde annonçait
  « 0 activité » sur une ligne juste, et j'ai failli accuser la colonne.
- *Combien de fois* : || (déjà vu sur les caractères français écrits en
  séquences d'échappement, § 6 de CLAUDE.md.)
- *Ce qui manque* : une relecture, pas un outil. **Après toute insertion par
  script, `grep` le motif sur le disque** — `remplacer.mjs` repasse déjà
  `node --check`, mais `/(\\d+)/` est du JavaScript parfaitement valide. La
  syntaxe ne protège que de la syntaxe.

**Un énoncé qui parle d'un dessin doit porter le dessin, partout** — 2026-10-02

- *Ce que je voulais faire* : rien. C'est Rémy qui a trouvé, capture à
  l'appui : « dans l'aide j'ai cela, mais il manque le schéma ». L'onglet
  « Un exemple » affichait « Comment note-t-on cette figure ? » sans la figure.
- *Ce qui a coûté* : la correction elle-même est de trois lignes — `figuresDe`
  existait déjà. Ce qui a coûté, c'est que **le défaut avait déjà été corrigé
  une fois**, ailleurs : Rémy, en v8xx, sur le carnet d'erreurs — « quand il y
  a quelque chose de visuel, il faut afficher ce visuel ». On avait réparé
  l'endroit, pas la classe de défaut. Trois écrans réaffichent un énoncé
  (le carnet, l'aide, la fiche papier) et chacun a sa propre façon d'en
  extraire le texte.
- *Combien de fois* : || (carnet d'erreurs, puis aide. La fiche papier prend
  `prompt.papier || prompt.text` — elle a sa raison, mais c'est un troisième
  chemin.)
- *Ce qui manque* : **une seule porte pour « donner à voir un énoncé »**. Tant
  qu'il y en a trois, le quatrième écran qui réaffichera une question oubliera
  la figure à son tour, et personne ne le verra avant Rémy. À défaut de la
  fabriquer tout de suite : **quand on écrit un écran qui réaffiche un énoncé,
  on se demande d'abord ce que `prompt` contient d'AUTRE que `text`.**
- *La règle* : **une correction qui répare un endroit sans nommer la classe de
  défaut reviendra sous un autre nom.** La première fois, on avait fabriqué
  `figuresDe` — le bon outil — et on ne l'avait branché qu'à un seul écran.

**Deux élèves de la même classe, deux versions de la même séance** — 2026-10-02

- *Ce que je voulais faire* : répondre à Rémy — « si je modifie une séance dans
  les parcours, le parcours se modifie aussi sur la séance en cours ? »
- *Ce qui a coûté* : j'ai failli répondre OUI sur la foi d'une ligne de SQL
  (`assignments a JOIN paths p ON p.id = a.path_id` : l'élève reçoit le
  contenu ACTUEL). La mesure dit autre chose, et en trois morceaux : ajouter
  à la fin descend chez l'élève qui a déjà la séance ; rerégler une étape déjà
  donnée ne l'atteint pas (`complementDeSeance` le refuse, à raison) ; **mais
  un camarade qui se connecte APRÈS reçoit la version modifiée.** Mesuré :
  4 questions chez l'un, 20 chez l'autre, même classe, même séance, et rien
  ne le dit.
- *Combien de fois* : || (la même divergence avait été trouvée et corrigée
  pour le cas de l'AJOUT — `tools/seanceQuiChange.mjs`, commentaire dans
  `parcoursServeur.js`. On avait réparé la moitié du cas.)
- *Ce qui manque* : **la règle est en JavaScript, chez l'élève ; elle devrait
  être au serveur.** `complementDeSeance` protège celui qui a commencé ; elle
  ne peut rien pour celui qui n'a encore rien, parce qu'il n'a pas de « avant »
  à comparer. Tant que l'assignation ne porte pas une copie FIGÉE du contenu au
  moment du don, et que le serveur n'arbitre pas les compléments contre elle,
  la convergence est hors de portée du navigateur. À faire après la rentrée ;
  d'ici là, l'atelier le DIT sur le badge « Donné à… ».
- *La règle* : **quand une règle doit valoir pour plusieurs machines, elle ne
  peut pas vivre sur l'une d'elles.** Celle-ci est écrite une fois, bien, et au
  mauvais étage — chaque navigateur l'applique contre ce qu'il a, et ils n'ont
  pas tous la même chose.

**La règle protégeait l'erreur du professeur autant que le travail de l'élève** — 2026-10-02

- *Ce que je voulais faire* : répondre à Rémy — « et un élève qui a fait 5
  exercices et je change le 6ème, il reçoit les modifs ? », puis « si je
  supprime un exercice vers la fin et que personne n'est arrivé, il ne
  l'auront pas ? »
- *Ce qui a coûté* : la réponse était NON dans les deux cas, et le NON venait
  d'une seule ligne — `if (apres.length <= avant.length) return null;`.
  Changer une étape sans en ajouter laisse la longueur identique : refus AVANT
  même de regarder LAQUELLE avait bougé. L'élève gardait l'ancienne version
  d'une étape qu'il n'avait **jamais vue**, pendant que son camarade connecté
  après recevait la nouvelle.
- *Combien de fois* : | (mais c'est la troisième fois en deux jours que ce
  module rend une mauvaise réponse sur une question de Rémy.)
- *Ce qui manque* : rien à fabriquer. **La règle était juste, et appliquée trop
  largement.** Sa raison d'être était écrite, mot pour mot, dans son propre
  commentaire : « un bilan qui désigne d'autres exercices que ceux qui ont été
  faits ne veut plus rien dire ». Elle ne concerne donc QUE les étapes
  réellement faites — et personne n'avait relu le commentaire en écrivant la
  garde.
- *La règle* : **quand une garde refuse plus large que sa raison, elle protège
  aussi l'erreur qu'on voulait pouvoir corriger.** Relire la raison écrite
  au-dessus d'une garde avant de la croire : elle dit souvent, déjà, où elle
  s'arrête.

**On a failli écrire une fonctionnalité qui existait déjà** — 2026-10-02

- *Ce que je voulais faire* : répondre à Rémy — « je peux réinitialiser un
  élève sur une séance, ça m'aiderait à tester mon élève test ».
- *Ce qui a coûté* : presque une route serveur, une colonne et un canal de
  synchronisation. J'avais déjà esquissé le schéma quand j'ai cherché
  `effacerLeTravail` — `deconnecterEleve({ effacerLeTravail: true })` existe,
  est offerte derrière une case de la fenêtre de déconnexion, et fait
  exactement cela. Trente secondes de sonde ont remplacé une heure de code.
- *Combien de fois* : || (déjà : `figuresDe` réécrite au lieu d'être
  réemployée.)
- *Ce qui manque* : **un inventaire de ce que le logiciel sait déjà faire.**
  241 modules, et la seule façon de savoir si un geste existe est de deviner
  son nom et de le chercher. Avant d'écrire une fonctionnalité demandée,
  chercher d'abord le VERBE dans le dépôt (`effacer`, `remettre`, `rejouer`,
  `dispenser`) — pas le nom qu'on lui donnerait soi-même.
- *La règle* : **une demande de fonctionnalité est d'abord une question sur ce
  qui existe.** Et la réponse se mesure : savoir que le geste existe ne suffit
  pas, il fallait vérifier que le serveur ne renvoie pas aussitôt ce que
  l'appareil vient d'effacer.

**« Réinitialiser » : j'ai répondu à la question d'à côté** — 2026-10-02

- *Ce que je voulais faire* : répondre à « je peux réinitialiser un élève sur
  une séance, ça m'aiderait à tester mon élève test ».
- *Ce qui a coûté* : un aller-retour entier. J'ai compris « l'élève peut-il se
  remettre à zéro ? », mesuré que oui (déconnexion en effaçant le travail),
  écrit une sonde, un commit et une réponse de vingt lignes — pour m'entendre
  dire « attend je pense que l'on ne s'est pas compris ». Il voulait le faire
  DEPUIS SON POSTE, sur un élève virtuel, sans toucher à l'appareil.
- *Combien de fois* : || (déjà : « deux clics » comptés depuis un billet alors
  qu'il demandait depuis la connexion — même jour.)
- *Ce qui manque* : rien à fabriquer. **Relire la demande en cherchant QUI fait
  le geste.** « Je réinitialise » — c'est lui, professeur, à son poste. Les
  deux fois, le mot qui tranchait était dans la phrase et je ne l'avais pas
  lu : « depuis mon poste », « quand on se connecte ».
- *La règle* : **avant de mesurer, écrire en une phrase qui fait le geste, sur
  quelle machine, et ce qu'il voit après.** Si cette phrase ne se laisse pas
  écrire, la demande n'est pas comprise — et c'est le moment de demander, pas
  après avoir livré.

**Un bouton gardé par une information que l'écran ne possède pas** — 2026-10-02

- *Ce que je voulais faire* : poser « remettre à zéro » à côté du bilan d'un
  élève, dans le panneau « Donner à une classe ».
- *Ce qui a coûté* : Rémy — « je ne trouve pas ta flèche qui tourne ». Il avait
  raison deux fois. D'abord je l'avais mise au mauvais endroit (l'écran où l'on
  DISTRIBUE, pas celui où l'on LIT). Ensuite, et surtout, je l'avais rendue
  conditionnelle à `aTravaille(seance, eleve.evenements)` — qui répond TOUJOURS
  non sur cet écran : `elevesDeLaClasse` appelle la route « roster », qui rend
  des noms et des codes, jamais les événements. **Toute la classe s'y affiche
  « n'a pas commencé »**, même un élève qui vient de travailler.
- *Combien de fois* : | (mais c'est la deuxième fois en une soirée qu'une
  sonde dit « absent » sur du code juste — la première, elle regardait trop
  tôt.)
- *Ce qui manque* : rien à fabriquer. **Un bouton ne se garde qu'avec une
  information que son écran DÉTIENT.** Celui-ci se gardait sur une donnée que
  la route ne rend pas — il ne pouvait donc jamais apparaître, et aucune
  épreuve de source ne l'aurait dit : `data-reinit-eleve` était bien dans le
  fichier.
- *La règle* : **quand on ajoute une condition d'affichage, se demander d'où
  vient la donnée qui la décide, et si cet écran l'a vraiment.** Sinon on écrit
  un bouton qui existe dans le code et nulle part ailleurs.

---

## Une épreuve de hasard est verte ou rouge selon le jour — 2026-10-02

- *Ce que je voulais faire* : garder le dédoublonnage des questions (« sur la
  table de pythagore, essaie d'eviter les mêmes questions ») par une épreuve
  simple : quatre valeurs possibles, quatre questions posées, quatre
  distinctes.
- *Ce qui a coûté* : deux `epreuveTombe.mjs` pour comprendre, et une minute à
  chercher le défaut dans le code. Le correctif retire **douze fois au plus** ;
  au quatrième tirage, douze retirages ont encore (3/4)¹² ≈ 3 % de chances de
  retomber sur du déjà vu. L'épreuve tombait donc toute seule une fois sur
  trente, et `epreuveTombe.mjs` a rendu le verdict exact — « L'ÉPREUVE EST DÉJÀ
  ROUGE avant qu'on touche à quoi que ce soit » — sur un dépôt intact. Sans lui,
  j'aurais cherché un bogue qui n'existait pas.
- *Combien de fois* : | (première occurrence nommée, mais tous les générateurs
  tirent au sort : il y en aura d'autres.)
- *Ce qui manque* : rien à fabriquer, `epreuveTombe.mjs` a fait exactement son
  travail et c'est lui qui a tranché.
- *La règle* : **une épreuve qui tire au sort mesure une moyenne, pas une
  série.** Un correctif probabiliste ne promet pas « jamais » : il promet
  « rare ». L'épreuve doit promettre la même chose — trois cents séries et une
  moyenne —, sinon elle est plus fausse que le code qu'elle garde.

## La mesure d'une répétition se réécrivait à chaque fois — 2026-10-02

- *Ce que je voulais faire* : savoir combien de fois la même question revient
  dans une série de vingt, avant et après correction.
- *Ce qui a coûté* : une sonde jetable, puis trois erreurs de chemin
  (`js/core/rng.js` au lieu de `ids.js`, `CATALOG` au lieu de `exercices`,
  `getGenerator` qui vit dans `registry.js` et non dans `activities/index.js`),
  et surtout un **registre vide** : `getGenerator` rend `null` pour tout le
  catalogue tant qu'on n'a pas importé `js/core/activities/index.js` pour ses
  effets de bord. Quatre allers-retours pour une mesure de dix lignes.
- *Combien de fois* : || (la même question se posera pour tout exercice dont
  Rémy dira « ça se répète ».)
- *Ce qui manque* : fait — `tools/repetitionsDUneSerie.mjs <identifiant>
  [--clef enonce|reponse]`. Il monte une VRAIE `ItemSession`, donc il voit le
  dédoublonnage, ce qu'une boucle sur le générateur ne verrait jamais.

---

## Deux accents graves gardent la syntaxe, et l'écran affiche NaN — 2026-10-02

- *Ce que je voulais faire* : poser deux boutons sur la fiche d'un élève
  (« lui donner la calculatrice », « tout lui débloquer »).
- *Ce qui a coûté* : **neuvième occurrence du piège de l'accent grave, et la
  première que le hook ne voit pas.** J'avais écrit, dans un commentaire HTML à
  l'intérieur d'un gabarit : `` l'exercice `*` ``. Deux accents graves dans le
  même commentaire : le premier ferme le gabarit, le second en rouvre un, et
  **le `*` entre les deux devient une multiplication**. Deux chaînes vides
  multipliées font `NaN`, et c'est `NaN` qui s'affichait à la place de la fiche.
  `node --check` se tait — la syntaxe tient —, le hook se tait, les 4 290
  épreuves passent (elles lisent la SOURCE), et le défaut part jusqu'au
  navigateur. Une sonde, six mesures, un vidage d'`innerHTML` : vingt-cinq
  minutes pour voir trois lettres.
- *Combien de fois* : |||| |||| (neuf, dont celle-ci — la seule silencieuse.)
- *Ce qui manque* : fait — `tools/accentGrave.mjs`, branché dans
  `tools/hooks/verifierSyntaxe.sh` **avant** `node --check`.
- *Ce qui a été jeté en chemin, et pourquoi c'est la moitié du travail* : la
  première version signalait tout accent grave dans un commentaire HTML ou CSS.
  **Mille vingt-quatre alertes** sur le dépôt — chaque `/** … */` de
  documentation en porte, et aucun n'est dangereux. Une alarme qui sonne mille
  fois n'est pas lue : `apercusVides.mjs` avait déjà payé cette leçon-là.
- *La règle, et elle est contre-intuitive* : **on ne peut pas demander « ce
  commentaire est-il dans un gabarit ? »**, puisque l'accent grave est
  justement ce qui décide où le gabarit finit — la question se mord la queue.
  On la retourne : on lit chaque GABARIT, et l'on regarde s'il ouvre un
  commentaire HTML sans le refermer. Zéro fausse alerte sur le dépôt entier, et
  il attrape celui-là. **Quand un détecteur crie mille fois, ce n'est pas le
  seuil qu'il faut monter, c'est la question qu'il faut retourner.**

---

## `false` veut dire « non » ET « je ne sais pas » — 2026-10-02

- *Ce que je voulais faire* : afficher le bilan par élève dans « Donner à une
  classe », qui ne s'y affichait jamais.
- *Ce qui a coûté* : rien à chercher — un commentaire du dépôt décrivait déjà
  la cause, écrite après la friction du bouton de remise à zéro : cette liste
  vient de la route « roster », qui rend des noms et des codes, PAS les
  événements, donc `aTravaille` y répond toujours non. **Mais en relisant qui
  d'autre s'appuyait sur ce `false`, j'ai trouvé pire que l'affichage** :
  `info.travaille` gardait aussi la branche de SUPPRESSION. Retirer une séance
  depuis ce panneau prenait toujours le chemin « personne n'a encore
  commencé », qui efface la séance de la bibliothèque — **et le bilan de cette
  séance avec elle**. Un professeur qui retirait une séance travaillée perdait
  son bilan.
- *Combien de fois* : ||| (le bouton gardé par une donnée absente, trois fois
  maintenant : la flèche de remise à zéro, le bilan par élève, et celui-ci.)
- *Ce qui manque* : rien à fabriquer. La correction est un prédicat —
  `onSaitQuiATravaille(classe)` — et une condition qui le consulte avant
  d'effacer.
- *La règle, et c'est la troisième formulation de la même leçon* : la première
  disait **un bouton ne se garde qu'avec une information que son écran
  détient**. Voici la version qui mord : **`false` veut dire « non » ET « je ne
  sais pas », et aucune des deux ne se voit. Une condition qui décide
  d'EFFACER ne se contente donc pas d'un `false` : elle demande d'abord si l'on
  sait.** Un défaut d'affichage se signale tout seul — Rémy l'a vu en une
  journée ; celui-ci serait resté muet jusqu'au jour où un bilan aurait
  disparu, et personne n'aurait fait le lien.

## Une tranche d'épreuve bornée par un NOMBRE finit toujours par tomber — 2026-10-02

- *Ce que je voulais faire* : ajouter un commentaire de vingt lignes dans
  `basculer()`, pour expliquer pourquoi on retire au lieu de supprimer.
- *Ce qui a coûté* : `npm test` est passé de 4343/4343 à une épreuve rouge —
  « APRÈS CHAQUE GESTE, ON RELIT LE SERVEUR » —, dans un harnais de quatre
  minutes lu juste avant de committer. Le code était INTACT : l'épreuve
  découpait `PC.slice(début, début + 4200)` et la ligne cherchée venait de
  passer au-delà de la fenêtre, poussée par le commentaire. Cinq minutes à
  relire un correctif qui n'avait rien.
- *Combien de fois* : ||| (déjà deux fois sur `seanceEnCours.test.mjs` et
  `oublis.test.mjs`, où j'avais simplement ÉLARGI la tranche — c'est-à-dire
  repoussé le problème.)
- *Ce qui manque* : rien à fabriquer, une règle à tenir.
- *La règle* : **une tranche se borne sur la FIN de ce qu'elle mesure, jamais
  sur un nombre de caractères.** Une borne qui dépend de la longueur des
  COMMENTAIRES est une borne qui retombera — et ce dépôt ajoute des
  commentaires à chaque correctif, par construction. `indexOf(fin, début)`
  coûte la même ligne et ne bouge plus. Élargir la fenêtre ne corrige rien :
  cela achète quelques commentaires de sursis.

## Un commentaire qui explique une option peut être FAUX, et l'outil le dit — 2026-10-03

- *Ce que je voulais faire* : ajouter le tri par nom dans « Les bilans », en
  reprenant la comparaison du mur — `localeCompare(…, 'fr', { numeric: true,
  sensitivity: 'base' })`. J'ai recopié le commentaire qui l'accompagnait :
  « `sensitivity` pour que « Émile » se range avec les E et non à la fin ».
- *Ce qui a coûté* : rien du tout, et c'est le point. `epreuveTombe.mjs` a
  refusé l'épreuve : en retirant `sensitivity: 'base'`, elle restait VERTE.
  Mesuré alors, en trois lignes de `node -e` : c'est `localeCompare` qui range
  les accents, avec ou sans l'option. Le défaut qu'on évite est la comparaison
  par CODES de caractères, qui donne « Dylan, Fatou, Émile ». L'option, elle,
  fait tout autre chose : elle rend « Leo », « leo » et « Léo » ÉGAUX, de sorte
  que c'est l'identifiant qui départage et non une majuscule invisible.
- *Combien de fois* : || (deux fois le même jour. La seconde, dans le tableau
  de conversion : j'avais écrit DEUX vérifications dans `tientDansLeTableau` —
  les chiffres de départ, puis l'étendue écrite (virgule et zéros) — en me
  disant que la seconde attrapait ce que la première laissait passer.
  `epreuveTombe.mjs` a refusé l'épreuve de la seconde, et cherchant pourquoi
  j'ai trouvé que les deux étaient **la même vérification écrite deux fois** :
  la colonne de la virgule est celle de l'unité demandée, donc toujours une
  colonne du tableau. J'en ai supprimé une.)
- *Ce qui manque* : rien à fabriquer. L'outil existait et il a parlé ; il
  fallait l'écouter au lieu de chercher pourquoi « l'épreuve ne marche pas ».
- *La règle* : **une épreuve qui refuse de tomber accuse le commentaire autant
  que le code.** La question n'est pas « comment faire tomber cette épreuve »
  mais « qu'est-ce que cette ligne fait VRAIMENT ». Et quand on trouve, on
  corrige les deux endroits — ici le bilan ET le mur, d'où le commentaire
  venait. Un commentaire faux se recopie ; c'est sa façon de se répandre.

## Une phrase d'alerte doit être vraie AVEC les autres, pas seulement seule — 2026-10-03

- *Ce que je voulais faire* : la phrase du tableau à double entrée, qui dit ce
  qu'on ne voit pas en balayant les cases — la colonne rouge pour tout le
  monde, et celle que presque personne n'a atteinte.
- *Ce qui a coûté* : une sonde dans un vrai navigateur, sur six élèves. Les
  deux phrases sont sorties ensemble : « Un exercice a résisté à la classe
  entière. 2 exercices n'ont été atteints que par une partie de la classe. » —
  **les deux parlaient de la même colonne, et se contredisaient**. Deux élèves
  sur six l'avaient atteinte ; chacune des deux phrases était défendable seule,
  et le couple était faux. Les vingt épreuves sans navigateur étaient vertes :
  aucune ne regardait les deux phrases ENSEMBLE.
- *Combien de fois* : | (mais c'est la même famille que « rien n'est pas
  zéro » : un seuil qui ne distingue pas deux situations qu'il faut séparer.)
- *Ce qui manque* : rien à fabriquer — un seuil à poser au bon endroit. Pour
  parler de LA CLASSE, il faut que plus de la moitié de la classe soit arrivée
  sur l'exercice ; les deux alertes deviennent alors exclusives **par
  construction**, et non par chance.
- *La règle* : **deux alertes qui peuvent sortir dans la même ligne se
  mesurent ensemble.** Une épreuve par phrase les garde chacune vraie et laisse
  passer la contradiction. Et l'écran reste le seul endroit où l'on voit les
  deux côte à côte : c'est pour cela qu'une sonde navigateur reste nécessaire
  même quand tout le calcul est éprouvé sans navigateur.

## Deux gestes sur la même cible, et l'ordre des clics décide du sens — 2026-10-03

- *Ce que je voulais faire* : rien. Rémy a signalé « une fois que l'on a posé
  la virgule, on ne peut plus l'enlever » dans le tableau de conversion.
- *Ce qui a coûté* : la cause tenait en quatre lignes, et elle en cachait une
  plus grave. La virgule ET les zéros de comblement se posaient du MÊME clic,
  sur la MÊME case : `if (this.virgule === null) { poser la virgule; return; }`
  puis `basculer un zéro`. Donc le premier clic posait la virgule et **tous les
  suivants basculaient un zéro** — la virgule ne bougeait plus jamais, pendant
  que la consigne affichait « clique une case pour la déplacer ». Et comme le
  clic était refusé sur une case portant un chiffre, la virgule ne pouvait même
  pas SE POSER quand elle tombait sur une colonne occupée : **27 à 31 % des
  tirages, mesuré sur 400 par famille** — un exercice sur trois était
  infaisable, et personne ne l'avait signalé.
- *Combien de fois* : | (mais la famille est connue : c'est le même défaut que
  « un sélecteur inventé rend `false`, comme un logiciel cassé » — un état qui
  ne se distingue pas d'un autre.)
- *Ce qui manque* : rien à fabriquer. Deux gestes ont maintenant deux cibles :
  la virgule a sa rangée de poignées, les cases ne font plus que les zéros.
- *La règle* : **deux gestes différents sur la même cible, départagés par
  l'ORDRE des clics, forment un mode caché — et un mode caché qu'aucun écran
  n'affiche est un piège.** Le signe qui aurait dû alerter était la consigne :
  elle décrivait un geste (« clique une case pour la déplacer ») que le code ne
  savait pas faire. **Quand une consigne et un gestionnaire d'événement se
  contredisent, c'est un défaut, pas une approximation de rédaction.**

## « Le clavier cache la réponse » veut dire « et rien ne peut la ramener » — 2026-10-03

- *Ce que je voulais faire* : corriger le signalement de Rémy, « quand on veut
  écrire sur la tablette, le clavier cache la réponse ».
- *Ce qui a coûté* : j'ai failli ne corriger que la moitié visible. Mesuré sur
  une tablette couchée de 1024 × 690, le bas du champ est à 57 % de la hauteur
  et un clavier en prend 35 à 45 % : il passe dessous, c'est entendu. Mais la
  mesure qui compte est l'autre, et elle ne se devine pas — `scrollHeight ===
  clientHeight` sur le cadre : **il n'y avait rien à faire défiler**. Déplacer
  le champ plus haut n'aurait rien réglé pour la tablette suivante ; ce qu'il
  fallait, c'est que le cadre prenne la hauteur VISIBLE (`visualViewport`), ce
  qui le rend défilable, puis ramener le champ au centre.
- *Combien de fois* : || (le duel avait déjà payé exactement cela, et son
  commentaire le dit : « `visualViewport` est le seul objet qui dise ce que
  l'élève voit VRAIMENT ».)
- *Ce qui manque* : les deux jeux font maintenant le même geste avec le même
  commentaire ; au troisième, il faudra un module — « la hauteur vraiment
  visible » — plutôt qu'une troisième copie.
- *La règle* : **un élément caché n'est un défaut d'emplacement que s'il peut
  être ramené ; sinon c'est un défaut de hauteur.** On mesure donc toujours
  deux choses devant un « c'est caché » : où est l'élément, ET si quelque
  chose peut le déplacer. La seconde décide de la correction.

## Une borne corrigée d'un seul côté se refait signaler — 2026-10-03

- *Ce que je voulais faire* : rien. Rémy a redemandé, sur le MÊME exercice et
  presque dans les mêmes mots qu'il y a quelques semaines, « il faudrait que
  dans les premiers niveaux, les calculs soient plus simples ».
- *Ce qui a coûté* : la première fois, j'avais ajouté un `plafond` par palier,
  mesuré l'avant/après, écrit l'épreuve, et clos l'affaire. Le PLANCHER, lui,
  venait toujours du contexte : `bas = min(E.mini, haut - 5)`. Au palier
  « moyen » — plafond 25, contexte « 55 élèves » dont `mini` vaut 20 — toutes
  les cases tombaient **entre 20 et 25**. Une bande de cinq nombres de large,
  tous à deux chiffres : plus simple que 70, et pas plus simple à additionner.
  L'épreuve que j'avais écrite ne regardait que le MAXIMUM, donc elle était
  verte.
- *Combien de fois* : || (déjà le même oubli sur l'échelle des priorités, où
  j'avais borné le haut sans toucher au bas.)
- *Ce qui manque* : rien à fabriquer. Une épreuve qui mesure la PART de cases
  à deux chiffres, et non le seul maximum — c'est la charge, pas la borne, qui
  était en cause.
- *La règle* : **quand on corrige une borne, on vérifie l'autre dans la même
  minute.** Et surtout : **une épreuve qui garde un maximum ne garde pas une
  difficulté.** Ce que Rémy appelle « des calculs plus simples » n'est pas « un
  plus petit nombre » mais « moins de retenues » — il fallait mesurer la
  répartition, pas la borne. Un signalement qui revient deux fois sur le même
  écran dit presque toujours qu'on a mesuré à côté la première fois.

## Un sélecteur trop GÉNÉRAL attrape autre chose, et ment aussi bien — 2026-10-05

- *Ce que je voulais faire* : vérifier, dans le navigateur, que le compteur du
  nouveau champ de trèfles affiche « 0 / 3 trouvé ».
- *Ce qui a coûté* : la sonde a rendu `compte: ""`. J'ai cru à un défaut du
  jeu — le compteur ne se remplit pas — et j'ai relu `majCompte`, le moment où
  il est appelé, l'ordre de `poser()` et de `dessiner()`. Tout était juste. Le
  jeu écrivait bien son compteur : c'est la SONDE qui lisait
  `document.querySelector('[data-compte]')`, attrapait le `<b data-compte>` de
  la barre de passage — vide, et plus haut dans le document — et le rapportait
  comme s'il était le mien. Le jeu, lui, interroge `this.container`, et ne
  s'est jamais trompé.
- *Combien de fois* : || (c'est le frère du défaut déjà journalisé : « un
  sélecteur inventé rend `false`, c'est-à-dire la même réponse qu'un logiciel
  cassé ». Celui-ci est pire : il ne rend pas `false`, il rend la valeur de
  QUELQU'UN D'AUTRE, qui a l'air d'une vraie réponse.)
- *Ce qui manque* : rien à fabriquer — `doitExister` ne peut pas attraper ça,
  puisque l'élément existe. Une règle d'écriture suffit : les crochets d'un jeu
  portent son préfixe (`data-tr-compte`), comme ses classes CSS portent déjà
  `tr-`. Le jeu est corrigé ainsi, et le piège est fermé pour de bon — personne
  ne peut plus confondre.
- *La règle* : **un `data-` sans préfixe est un nom de variable globale.**
  Dans une application d'une seule page, tous les écrans partagent le même
  document : `data-compte`, `data-note`, `data-etape` appartiennent à tout le
  monde, donc à personne. Et la sonde qui les lit depuis `document` ne peut
  pas savoir qu'elle s'est trompée de propriétaire. **Quand une mesure dit
  « vide », la première question n'est pas « pourquoi est-ce vide » mais
  « est-ce que je lis bien ce que je crois lire ».**
