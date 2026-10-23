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

## Une épreuve qui garde une LIGNE défend le défaut qu'elle contient — 2026-10-05

- *Ce que je voulais faire* : corriger le signalement de Rémy — « le parcours
  que j'ai modifié sur mon ordi perso n'est pas à jour sur mon ordi de
  boulot ». La cause tenait en une ligne : `ramenerLaBibliotheque` sautait tout
  identifiant déjà connu, donc un parcours descendait UNE fois et plus jamais.
- *Ce qui a coûté* : la correction faite et mesurée (la sonde `deuxPostes.mjs`
  passait de « 2 étapes » à « 3 »), `npm test` est tombé sur une épreuve qui
  exigeait `assert.match(corps, /connus\.has\(brut\.id\)/)` — c'est-à-dire la
  PRÉSENCE LITTÉRALE de la ligne fautive. Son message disait « un parcours
  local serait écrasé par la version du serveur », une crainte juste ; mais la
  ligne qu'elle gardait faisait DEUX choses, dont une mauvaise, et l'épreuve
  les gardait toutes les deux. **Une épreuve écrite pour protéger une garantie
  en était venue à défendre un défaut.**
- *Combien de fois* : || (déjà vu avec les tranches bornées par un nombre de
  caractères : l'épreuve mesurait le texte source au lieu du comportement.)
- *Ce qui manque* : rien à fabriquer. La garantie — « une retouche d'ici
  survit, une retouche d'ailleurs descend » — vit maintenant dans un module
  qu'on peut interroger sans navigateur (`arbitrageParcours.js`), et chacun de
  ses trois verdicts a été vu tomber. L'épreuve de câblage, elle, se contente
  de vérifier que l'arbitrage est BRANCHÉ.
- *La règle* : **une épreuve qui cite du code source garde une mise en œuvre,
  pas une promesse — et le jour où la mise en œuvre est fautive, elle se range
  du côté du défaut.** Quand il faut vraiment lire la source (parce que le
  module ne s'importe pas sans navigateur), on y cherche le NOM de la garantie,
  jamais la ligne qui la réalise. Et le vrai remède est de sortir la règle dans
  un module qui s'éprouve : c'est ce qu'on avait déjà fait pour `empreinte`,
  pour la même raison, dans le même fichier.

## Une épreuve qui refuse de tomber accuse parfois le JEU, pas l'épreuve — 2026-10-05

- *Ce que je voulais faire* : garder la contrainte de ruisseau dans le solveur
  du Strimko. J'ai donc retiré cette contrainte avec `epreuveTombe.mjs`, en
  attendant de voir mes épreuves rougir.
- *Ce qui a coûté* : rien ne tombait. Première réaction, la mauvaise :
  « l'épreuve est mal écrite ». En cherchant POURQUOI elle ne tombait pas, j'ai
  compris que sans la contrainte, le générateur produit des grilles **plus
  aidées** — donc toujours uniques, toujours valides, et **résolubles sans
  jamais regarder les ruisseaux**. Mesuré aussitôt : 23 grilles sur 25 au
  palier découverte, 9 ou 10 sur 25 ailleurs. J'allais livrer des sudokus à
  décor coloré sous le nom d'un jeu que Rémy avait demandé par son nom.
- *Combien de fois* : ||| (troisième fois que l'outil refuse une chute ; les
  deux premières accusaient un commentaire faux et une vérification écrite deux
  fois. C'est la première fois qu'il met en cause le PRODUIT.)
- *Ce qui manque* : rien à fabriquer. Il manquait une épreuve — « sans les
  ruisseaux, la grille doit être AMBIGUË » — et le générateur a dû apprendre à
  rejouer la main entière quand la sienne ne demandait pas les ruisseaux.
  Résultat mesuré : 30 grilles sur 30, sur les cinq paliers.
- *La règle* : **quand une épreuve refuse de tomber, la question n'est pas
  « comment la faire tomber » mais « qu'est-ce que cette ligne fait vraiment ».**
  La réponse est parfois « rien » (on supprime la ligne), parfois « autre chose
  que ce que je croyais » (on corrige le commentaire) — et parfois **« elle
  tient debout une qualité que personne ne mesure »**. Ce troisième cas est le
  plus cher : le défaut n'est pas dans le code, il est dans ce qu'on livre, et
  aucune épreuve verte ne l'aurait jamais dit.

## Une clef inventée dans un objet ou une classe inventée dans un sélecteur est un SILENCE — 2026-10-05

- *Ce que je voulais faire* : livrer le Strimko. Seize épreuves vertes sur le
  générateur, 4 436 épreuves vertes dans le dépôt, les trois harnais au vert.
- *Ce qui a coûté* : j'ai failli le livrer avec **quatre** défauts que personne
  n'aurait vus avant Rémy — tous de la même famille, un nom écrit de travers
  dans un contrat qu'aucun outil ne vérifie :
  - `prompt: { hint: … }` — le conseil le plus utile du jeu, écrit sous une clef
    que **rien** dans le dépôt ne lit (zéro occurrence) ; il n'arrivait jamais
    sur l'écran de l'élève ;
  - `bloque: (el) => verrous[el.dataset.r]…` — `brancherChamps` appelle `bloque()`
    **sans argument** ; douze `TypeError` par grille, dans une console où aucun
    élève ne regarde ;
  - `cleDe: (el) => el.dataset.r` — il reçoit le CHAMP, pas la case ; `poser`
    recevait des coordonnées `NaN` et écrivait à côté ;
  - `el.querySelector('.cg-valeur')` — classe qui n'existe **nulle part** (une
    seule occurrence : celle-là). Au doigt, la valeur était bien retenue mais
    **jamais affichée** : on tapait, rien n'apparaissait, et le jeu annonçait
    ensuite « ta grille est complète ». Toute la saisie tablette était morte.
  Deux heures, dont une et demie à écrire la sonde qui les a tous trouvés.
- *Combien de fois* : |||| (c'est la même friction que `doitExister` ferme pour
  les ÉPREUVES — « un sélecteur inventé rend `false`, la même réponse qu'un
  logiciel cassé ». Elle est ici dans le CODE DE L'APPLICATION, où rien ne la
  ferme.)
- *Ce qui manque* : un outil qui lise les activités et jette sur deux choses.
  **Un.** Toute classe citée dans un `querySelector('.x')` d'une activité doit
  apparaître soit dans le gabarit de cette activité, soit dans un module d'UI
  qu'elle importe, soit dans le CSS. **Deux.** Toute clef passée à un module
  partagé (`brancherChamps`, `brancherGlisserPalette`, `makeItem`) doit figurer
  dans ce que ce module lit. Les deux sont de la lecture de source, pas du
  navigateur : deux cents millisecondes, comme `nouvelExercice.mjs`.
- *La règle, en attendant* : **un jeu neuf se joue en entier à la sonde avant
  d'être livré, et sur LES DEUX saisies** — clavier et doigt ne partagent aucun
  code, et le pire des quatre défauts n'existait que du côté du doigt. Une sonde
  qui ne fait qu'ouvrir l'écran et compter les cases aurait tout laissé passer :
  elle doit TAPER, VÉRIFIER et VALIDER. C'est `tools/strimko.mjs`.

## `epreuveTombe.mjs` dit « elle tombe » quand une AUTRE épreuve du fichier tombe — 2026-10-05

- *Ce que je voulais faire* : prouver qu'une épreuve réécrite sur le classement
  par chapitre gardait bien ce qu'elle prétendait garder.
- *Ce qui a coûté* : l'outil a répondu « L'ÉPREUVE GARDE CE QU'ELLE PRÉTEND
  GARDER » — en vert, sans réserve. Le défaut que j'avais remis faisait en
  réalité tomber l'épreuve **n° 3** du fichier, pas la **n° 17** que je venais
  d'écrire ; la mienne restait verte. Vingt minutes à l'établir à la main
  (`node --test` puis `grep "^not ok"`), et à chercher un autre défaut qui ne
  fasse tomber QUE la mienne — un `some` passé en `every` dans `proposePar`.
- *Combien de fois* : | (première, mais structurelle : elle se reproduira à
  chaque garde ajoutée dans un fichier qui en contient déjà vingt.)
- *Ce qui manque — fait dans la foulée* : `--epreuve "<nom>"`, le nom de
  l'épreuve qui doit tomber. L'outil exige alors trois choses au lieu d'une :
  que cette épreuve EXISTE (un nom inventé ne tombe jamais — la même friction
  que `doitExister` ferme pour les sélecteurs, et il propose le nom voisin),
  qu'elle soit verte avant, et que ce soit ELLE qui tombe après. Il dit en plus
  ce qui est tombé AVEC elle : « et elle est SEULE à le voir » est la mesure
  qu'on voulait, et six épreuves tombées d'un coup disent qu'on n'a pas remis le
  défaut qu'on croyait. Les trois comportements ont été vus à l'œuvre sur le cas
  qui a servi à l'écrire.

## Aucune sonde ne voit un RECTANGLE FANTÔME — il faut regarder l'image — 2026-10-05

- *Ce que je voulais faire* : livrer l'Approxdoku. La sonde disait tout vert :
  grille résoluble telle qu'elle est montrée, capsules et opérateurs sur les
  bonnes pistes, deux saisies, vérificateur juste, 0 erreur de page.
- *Ce qui a coûté* : j'ai pris une capture par acquit de conscience, et le jeu
  était **illisible**. Les capsules, longues et seulement cernées, offraient à
  l'œil quatre côtés droits parallèles qu'il refermait en rectangles vides : on
  lisait des boîtes, pas des chaînes de ronds. La GÉOMÉTRIE était pourtant
  juste au pixel — mesuré : 53 px de large pour un rond de 49. Le défaut était
  entièrement dans la LECTURE, et aucune des quatorze mesures de la sonde ne
  pouvait le voir, parce qu'aucune ne regarde l'image. Trois allers-retours
  capture → CSS → capture (piste d'opérateur 0,45 → 0,34, capsule remplie,
  fonds d'opérateurs retirés). Une demi-heure.
- *Combien de fois* : || (déjà vu sur le tableau de conversion, où « on ne voit
  pas tout » était un débordement que les épreuves ne pouvaient pas exprimer.)
- *Ce qui manque* : rien à fabriquer, et c'est le point. `s.photo()` dit déjà si
  une image est UNIE, ce qui attrape l'écran blanc ; il n'existe pas et il
  n'existera pas de mesure automatique pour « ce dessin raconte autre chose que
  ce qu'il montre ». **La règle est donc de procédure** : un jeu dont le DESSIN
  porte une partie de la règle — capsules, cages, ruisseaux, graduations — se
  regarde en capture avant d'être livré, en plus d'être joué à la sonde. La
  sonde répond « est-ce que ça marche » ; seule l'image répond « est-ce que ça
  se comprend ».
- *À verser au même dossier* : le contraste du « ≈ » est passé, lui, par une
  épreuve (`--primary` employé comme encre), puis par `s.contrasteRendu`, qui
  lit les PIXELS et voit donc la teinte de la capsule derrière le signe — 5,67,
  au-dessus du seuil AA. Ce qui se mesure se mesure ; c'est la composition
  d'ensemble qui ne se mesure pas.

## Une mesure dont le sélecteur ne peut pas rendre FAUX — 2026-10-05

- *Ce que je voulais faire* : clore la sonde du Jardin sur « “Valider” accepte un
  jardin juste ».
- *Ce qui a coûté* : j'avais écrit
  `document.querySelector('.ja-champ--ok, .ja-case[data-cle]')` — « la classe du
  succès OU n'importe quelle case ». La seconde moitié est toujours vraie, donc
  la mesure l'était aussi. Elle est restée verte pendant que « Valider » jugeait
  FAUX un jardin rempli juste — le pire défaut possible pour un exercice — et
  c'est une ÉPREUVE écrite ensuite qui a dû le dire. Vingt minutes de retard, et
  surtout une sonde qui aurait pu me mentir longtemps.
- *Combien de fois* : || (c'est le miroir exact de la friction que `doitExister`
  ferme : là, un sélecteur INVENTÉ rend `false` comme un logiciel cassé ; ici,
  un sélecteur TROP LARGE rend `true` comme un logiciel sain.)
- *Ce qui manque* : `doitExister` garde l'entrée d'une sonde ; rien ne garde sa
  SORTIE. Il faudrait l'équivalent pour les mesures de fin — une aide qui refuse
  un sélecteur dont une partie est satisfaite avant même que le geste ait eu
  lieu. À défaut d'outil : **une mesure de fin se vérifie en la faisant échouer
  une fois**, exactement comme une épreuve. On remplit le jardin FAUX et l'on
  regarde la sonde rougir ; si elle reste verte, c'est elle qu'il faut corriger.
- *La règle, en une phrase* : **un sélecteur à virgule dans une mesure de succès
  est presque toujours une faute** — « A ou B » veut dire qu'on ne sait pas ce
  qu'on mesure.

## Un outil écrit pour cent données ne dit pas qu'il a renoncé sur mille — 2026-10-05

- *Ce que je voulais faire* : relancer `jardinPossible.mjs` après avoir porté le
  lexique de 237 à 786 mots — c'est exactement ce pour quoi je l'avais gardé.
- *Ce qui a coûté* : il ne rendait plus la main. Sa recherche exhaustive, écrite
  quand il y avait quarante mots de six lettres, en avait cent quarante-sept :
  neuf cents poses par fleur au lieu de deux cent quarante, et l'arbre explose.
  Dix minutes à comprendre que le silence n'était pas une panne mais une
  explosion combinatoire. Pire : sa réponse « AUCUN remplissage n'existe » ne
  distinguait pas « j'ai tout exploré » de « j'ai abandonné » — deux verdicts de
  force très différente sous la même phrase.
- *Combien de fois* : | (mais la famille est connue : c'est le même défaut que
  les budgets de `compterSolutions` au Strimko et à l'Approxdoku, où l'on avait
  pris soin de faire pencher le plafond du côté prudent.)
- *Ce qui manque — fait dans la foulée* : l'outil s'arrête au PREMIER
  remplissage trouvé (la question est « en existe-t-il », pas « combien »),
  borne sa recherche, et dit maintenant « arbre épuisé » ou « aucun trouvé dans
  le budget ».
- *La règle* : **un outil de mesure doit dire la FORCE de son verdict, pas
  seulement le verdict.** « Aucun n'existe » et « je n'en ai pas trouvé » se
  ressemblent dans une sortie de terminal et ne valent pas du tout la même
  chose — surtout quand c'est sur cette phrase qu'on décide de livrer ou non.

## J'ai simplifié une règle sans m'apercevoir que je la simplifiais — 2026-10-06

- *Ce que je voulais faire* : livrer le Rows Garden que Rémy avait demandé par
  son nom, d'après une description qu'il m'en avait faite en une phrase.
- *Ce qui a coûté* : j'ai pavé le champ de fleurs DISJOINTES — chaque case dans
  une seule fleur —, livré, montré une capture, et c'est Rémy qui a corrigé :
  « pour les fleurs, tu as plutôt faux car ce sont les pétales communes qui
  créent des mots, c'est en rond en fait ». Une journée de travail sur la
  mauvaise structure : générateur, fabricant, activité, épreuves, sonde, données.
  Et la correction en entraîne une seconde, purement mécanique, que je n'avais
  pas vue non plus : si un pétale appartient à deux fleurs, il ne peut pas
  porter LA couleur de sa fleur — c'est le CŒUR qui est coloré. J'avais colorié
  à l'envers.
- *Combien de fois* : | (mais la famille est connue : c'est celle de
  l'Approxdoku, où j'ai su m'arrêter pour demander les règles plutôt que de les
  inventer — et où la page de Friedman a servi de témoin.)
- *Ce qui manque* : rien à fabriquer, et c'est bien le problème — **aucune
  épreuve, aucune sonde, aucun harnais ne peut dire qu'on a implémenté le
  mauvais jeu.** Tout était vert : les rangées se lisaient, les fleurs portaient
  leur mot, les hexagones tombaient sur leurs voisins. Un logiciel juste, pour
  un jeu faux.
- *La règle* : **quand un jeu vient du dehors, il faut un TÉMOIN qui vienne du
  dehors.** Pour l'Approxdoku, c'était la grille résolue publiée par Erich
  Friedman : ses cinq équations devaient être justes sous mes règles, et sa
  grille unique — deux mesures que je ne pouvais pas truquer. Pour le Jardin,
  je n'avais qu'une phrase, et j'ai construit sur ma lecture de cette phrase
  sans jamais chercher à la contredire. **Demander une grille résolue coûte un
  aller-retour ; se tromper de jeu coûte une journée.**
- *Le signe qui aurait dû m'alerter* : ma géométrie donnait 42 cases pour
  6 fleurs, quand un Rows Garden de magazine en a 24. Ce chiffre était SOUS MES
  YEUX — j'avais même mesuré qu'un champ de douze rangées donne 130 cases — et
  je ne l'ai pas rapproché du jeu réel. **Un chiffre qui ne ressemble pas à
  celui du modèle est une question, pas un détail.**

---

## ~~`epreuveTombe` reste pendu, sans rien dire, quand l'épreuve fuit un minuteur~~ — 2026-10-06

- **Ce que je voulais faire** : voir tomber l'épreuve neuve de `core/timers.js`,
  en retirant `activeIntervals.forEach(clearInterval)` du code.
- **Ce qui a coûté** : deux lancements à vide (120 s de délai de harnais chacun),
  puis un `pkill -f epreuveTombe` qui a tué **le shell qui le lançait** — et donc
  laissé `js/core/timers.js` ABÎMÉ sur le disque, puisque l'outil n'a jamais
  atteint sa ligne de restauration. Quatre minutes, et un fichier de production
  mutilé qu'il fallait penser à relire. L'outil ne disait rien du tout : ni
  « ça tourne », ni « ça ne rend pas la main ».
- **Combien de fois** : | (mais la famille est connue : le `pkill -f` qui se
  tue lui-même est la deuxième fois, après `fabriquerJardins`.)
- **Ce qui manque** : rien à fabriquer, c'était un défaut de l'outil — il lance
  désormais `node --test` avec un délai de deux minutes et **dit** que l'épreuve
  n'a pas rendu la main, en nommant la cause probable.
- **La règle, et elle vaut pour toute épreuve neuve** : *une épreuve qui gèle le
  harnais en échouant ne peut pas être vue échouer.* Quand l'épreuve CRÉE ce que
  le code sous épreuve est censé arrêter — un minuteur, une répétition, une
  promesse en vol —, elle ferme ce qu'elle a ouvert dans un `after()`, avec la
  fonction du système et non celle qu'on mesure.

---

## ~~`node -e '…'` perd les apostrophes, et le script agit à moitié en silence~~ — 2026-10-06

- **Ce que je voulais faire** : corriger cinq occurrences de `{ largeur: 12,
  hauteur: 5 }` dans une épreuve, avec un script jetable de six lignes.
- **Ce qui a coûté** : deux allers-retours. Dans `node -e '…'` lancé depuis une
  chaîne entre apostrophes simples du shell, on ne peut pas écrire d'apostrophe ;
  je l'ai écrite `'`, **et elle est arrivée vide**. Le script a donc cherché
  `construireFigure(rectangle, …)` — sans les apostrophes —, n'a rien trouvé, et
  **n'a rien dit** : il a écrit le fichier à moitié corrigé, et l'épreuve est
  tombée sur une tout autre ligne. Même piège le même jour pour un fichier de
  paires de `epreuveTombe` : le JSON écrit contenait `readLegacy(atoutmath_attempts)`
  au lieu de `readLegacy('atoutmath_attempts')`, et l'outil a répondu
  « apparaît 0 fois » — lui, au moins, le disait.
- **Combien de fois** : ||
- **Ce qui manque** : rien à fabriquer. `tools/remplacer.mjs` existe pour cela et
  il COMPTE avant d'écrire — c'est exactement la garde qui manquait. **La règle :
  un script jetable qui contient une apostrophe s'écrit dans un fichier de
  `tools/tmp/` et se lance par son nom ; jamais par `node -e`.**

---

## ~~Un `robot` hors de sa portée : 35 minutes de navigateur pour une ligne qui se lit~~ — 2026-10-06

- **Ce que je voulais faire** : migrer les 674 gardes de démonstration vers
  `core/meneurDemo.js` et savoir si j'avais cassé quelque chose.
- **Ce qui a coûté** : la migration déclarait UN meneur par fichier et réécrivait
  les gardes de TOUT le fichier. Cinq fichiers ont deux ou trois fonctions de
  démonstration : leurs gardes lisaient un `robot` hors de leur portée.
  `node --check` passe — `robot.tour()` est une expression valide même quand
  `robot` n'existe nulle part. `npm test` passe — 4 641 épreuves, aucune n'ouvre
  une démonstration. **Seul `tools/robotsMuets.mjs` l'a vu : 19 erreurs de page
  contre 0 avant, au bout de 35 minutes de navigateur.** Et il a fallu les
  mesurer DEUX fois, avant et après, soit soixante-dix minutes au total.
- **Combien de fois** : |
- **Ce qui manque** : c'est fabriqué — `tools/gardesDemo.mjs` calcule la portée
  de chaque `const robot = meneurDemo(…)` par comptage d'accolades et nomme
  toute garde qui en sort, en deux cents millisecondes.
  `tests/gardesDemo.test.mjs` l'appelle à chaque `npm test`, et elle a été vue
  tomber en remettant le défaut exact.
- **La règle** : *une erreur qui n'existe qu'à l'exécution ne se cherche pas au
  navigateur si elle se lit dans la source.* Le navigateur dit si une
  démonstration EXPLIQUE quelque chose ; il ne doit pas servir à découvrir
  qu'une variable n'est pas déclarée. Chaque fois qu'une mesure de trente-cinq
  minutes répond à une question statique, c'est qu'il manque un outil.

---

## ~~Une sonde qui appelle la fonction ne mesure pas le bouton~~ — 2026-10-06

- **Ce que je voulais faire** : comprendre pourquoi un parcours supprimé revient
  chez Rémy, alors que le dépôt porte une sonde écrite exprès pour ce défaut.
- **Ce qui a coûté** : le défaut avait été trouvé, mesuré et corrigé — mais à UN
  seul des deux endroits. `tools/parcoursSupprime.mjs` importait
  `jeterALaCorbeille` et l'appelait, avec un commentaire qui affirmait « on
  passe par la porte que l'écran emprunte ». Elle mesurait donc que LA PORTE
  marche, jamais que les boutons la prennent. Le bouton du tiroir, lui,
  appelait encore `state.removeTeacherPath` tout seul. Rémy l'a signalé des mois
  plus tard, sur ses vrais parcours.
- **Combien de fois** : | (mais la famille est celle du crochet inventé : une
  mesure qui ne passe pas par le chemin de l'utilisateur ne mesure pas son
  problème — c'est écrit en tête de CLAUDE.md, et c'est la deuxième fois.)
- **Ce qui manque** : rien à fabriquer, deux choses à faire.
  1. La sonde **clique le bouton** : elle rend la ligne du tiroir, clique la
     corbeille, puis la confirmation, puis recharge.
  2. `tests/suppressionParcours.test.mjs` garde la règle de STRUCTURE en
     quelques millisecondes : **aucun fichier de `js/ui/` n'a le droit
     d'appeler `removeTeacherPath`**. Elle aurait vu le défaut le jour où il a
     été écrit.
- **Et un détail qui a coûté deux lancements** : le logiciel a DEUX
  confirmations — `showConfirm` (`.confirm-ok-btn`) et `window.appConfirm`
  (`#btn-uc-confirm`, la fenêtre de `index.html`). Chercher la mauvaise rend
  `null`, c'est-à-dire la même réponse qu'un logiciel cassé. **Deux fenêtres qui
  font la même chose sont une dette en soi** : à fondre en une.

---

## Deux juges pour un même exercice, et un seul corrigé — 2026-10-06

- **Ce que je voulais faire** : comprendre pourquoi une élève de Rémy, qui avait
  écrit `−(−2) + (+7)` là où le logiciel attendait `−(−2) + (7)`, s'était vu
  compter faux.
- **Ce qui a coûté** : rien à chercher dans les mathématiques — la règle qui lui
  donnait raison était **déjà écrite, et deux fois**. « Le + de tête est une
  trace utile au tableau, pas une condition de justesse », dit
  `opposeParentheses.js` depuis des mois. Le coût est ailleurs : il a fallu
  **remonter deux chaînes d'appel distinctes** pour découvrir que la LIGNE
  FINALE passe par `reponseJuste` et les LIGNES INTERMÉDIAIRES par
  `jugerEtape → memeReponse → normaliser` (`reductionPuissances.js`), chacun
  avec SA copie de la règle, chacune limitée au premier caractère de la chaîne.
  Corriger celle que j'avais sous les yeux aurait laissé l'autre refuser la même
  réponse — une ligne sur deux.
- **Combien de fois** : ||| — c'est la **troisième en deux jours**, et toujours
  la même forme : la corbeille des parcours (`removeTeacherPath` dans un seul
  des deux boutons), la carte du monde (`sansCarteDOuverture` chez un seul des
  deux appelants), et maintenant le « + » facultatif (deux juges, deux copies).
- **Ce qui manque** : un outil qui, **partant d'un exercice**, dise par quels
  juges une réponse d'élève peut passer. On a `tools/nouvelExercice.mjs` pour le
  catalogue, `tools/gardesDemo.mjs` pour les démonstrations ; il manque
  l'équivalent pour la correction : « `geo-pavage` juge avec X et Y » se lit
  dans les imports, mais personne ne le lit avant d'avoir payé.
- **La règle, et elle est maintenant écrite trois fois dans le dépôt** : *une
  correction posée sur un seul des chemins qui mènent au même endroit ne ferme
  rien.* Le réflexe à prendre : avant de corriger un juge, **chercher les autres
  appelants du même geste** — et si la règle est recopiée, la poser dans un seul
  fichier et garder par une épreuve le fait que personne n'en refait une copie
  (`tests/plusFacultatif.test.mjs` le fait).

---

## Une aide derrière un bouton n'est pas une aide — 2026-10-06

- **Ce que je voulais faire** : rendre l'aide au survol disponible sur la marche
  « écrire » de « Symétrique par rapport à quoi », comme Rémy venait de le
  demander pour la deuxième fois.
- **Ce qui a coûté** : trois versions pour une seule question, et les deux
  premières sont de moi. (1) J'avais ÉTEINT la bulle sur cette marche, en
  raisonnant seul : « l'élève doit écrire x = 6 lui-même, la bulle lui donnerait
  la réponse ». (2) Rémy demande un « ? » ; je le pose, avec un réglage par
  appareil, une feuille de style et **quatre épreuves** qui le gardent. (3) Il
  l'essaie en classe : « c'est le point ? qui n'est pas instinctif, et qui
  disparaît d'ailleurs quand on clique dessus ». Les quatre épreuves partent
  avec le bouton. Et mon objection de départ était fausse depuis le début —
  toutes les droites disent la leur, pas seulement la bonne, donc la bulle ne
  donne rien. Je l'avais même ÉCRIT, deux fois, sans en tirer la conséquence.
- **Combien de fois** : || (la première était le pavé numérique du Prio-Bot,
  arrivé par le même chemin : « si on ne demande rien, ne change pas le
  design » — là c'était justifié, puisqu'il change la mise en page. Une bulle au
  survol ne change rien tant qu'on ne survole pas.)
- **Ce qui manque** : pas un outil, une question à se poser. **Avant de mettre
  une aide derrière un geste, se demander ce qu'elle révélerait si elle était
  toujours là.** Si la réponse est « rien que l'élève ne doive chercher ailleurs »
  — et c'est le cas dès que TOUS les éléments parlent, pas seulement le bon —
  alors le geste n'est qu'un obstacle, et un obstacle qu'il faut deviner.
- **Et un piège de dépendance mesuré au passage** : un bouton qui s'efface après
  usage (« un bouton qui n'allume plus rien est un bouton cassé », ce qui est
  vrai) rend l'aide **inexplicable** : celui qui l'a pressé ne sait plus d'où
  viennent les bulles, celui qui ne l'a pas vu ne sait pas qu'il existe. Les deux
  règles sont justes séparément et incompatibles ensemble — l'issue est de ne pas
  avoir de bouton.

---

## « Parfois » est une donnée, pas un flou — 2026-10-06

- **Ce que je voulais faire** : trouver pourquoi, « parfois », le bouton Valider
  d'« Enlever les parenthèses » est inactif.
- **Ce qui a coûté** : rien, une fois la bonne mesure faite — et c'est le point.
  La cause n'était PAS lisible dans le code : `btnValider.disabled =
  saisie.trim() === ''` est juste, et le relire cent fois ne dit pas que
  **le navigateur retire le foyer à un élément qu'on désactive**. Il a fallu
  relever `document.activeElement` tous les dixièmes de seconde autour du clic
  pour voir la ligne qui explique tout : « focusout de ls-valider vers
  (aucun) ». Trois minutes de sonde contre un temps indéfini de relecture.
- **Combien de fois** : | (mais la famille est grande : tout défaut dont la
  cause est un comportement du NAVIGATEUR et non une ligne du dépôt — le foyer,
  le défilement, la mise en page, le clavier virtuel.)
- **Ce qui manque** : un réflexe, et il est maintenant outillé.
  `tools/boutonValiderInactif.mjs` reste : il joue l'exercice **au clavier
  physique** et compare, à chaque geste, CE QUE LE CHAMP MONTRE et CE QUE LE
  BOUTON DIT. Mesurer le seul `disabled` aurait crié au défaut sur un champ
  vide ; mesurer le seul texte n'aurait rien vu. **Un symptôme se mesure par
  l'écart entre deux choses, jamais par une seule.**
- **Et le mot de Rémy était une donnée** : « parfois » décrivait exactement la
  forme du défaut — deuxième ligne seulement, clavier physique seulement, et
  réparé par n'importe quelle touche du pavé. Trois conditions dont une qui se
  répare toute seule : c'est pour cela qu'il ne se reproduisait pas quand on le
  cherchait. **Prendre au sérieux l'adverbe plutôt que de le traiter comme une
  imprécision aurait fait gagner le premier quart d'heure.**

---

## Une consigne qui commande un geste impossible — 2026-10-06

- **Ce que je voulais faire** : comprendre « dans cet exercice, on ne peut
  mettre le nombre », sur le tableau de numération de la Chasse au Chiffre.
- **Ce qui a coûté** : peu à corriger, mais l'écart était écrit depuis le
  premier jour **dans le logiciel lui-même** : sous un tableau non modifiable,
  la phrase « Pose ton nombre : un chiffre par colonne ». Et dans le code, un
  commentaire en majuscules affirmait « IL EST VIDE, ET C'EST TOUT L'INTÉRÊT » —
  j'avais lu la demande de Rémy (« un tableau de numération **pour placer son
  nombre** ») comme « un tableau vide », puis j'avais écrit une justification
  solide de ce contresens. Un bon commentaire sur une mauvaise décision la rend
  plus difficile à voir, pas moins.
- **Combien de fois** : || (c'est le même motif que le bouton « ? » de la
  symétrie, le même jour : une décision que je prends seul, que Rémy n'a pas
  demandée, et que j'argumente si bien qu'elle survit jusqu'à ce qu'il l'essaie
  en classe.)
- **Ce qui manque** : une relecture mécanique des CONSIGNES contre ce que
  l'écran permet. « Pose », « clique », « déplace », « écris » sont des verbes
  d'action : chacun promet un geste, et un outil pourrait vérifier que l'écran
  qui porte la phrase porte aussi de quoi le faire. À fabriquer quand le motif
  se présentera une troisième fois.

---

## Un clic au centre n'est pas un clic sur l'objet — 2026-10-06

- **Ce que je voulais faire** : mesurer, dans un navigateur, qu'un compte à
  rebours arrivé à zéro rend bien son champ au professeur.
- **Ce qui a coûté** : quatre lancements de sonde pour ATTEINDRE l'écran, avant
  d'avoir mesuré quoi que ce soit. Trois crochets inventés — `#ec-racine` au
  lieu de passer par la porte, `#btn-classes` qui existe mais reste `hidden`
  (c'est la commande, pas la porte : `#top-btn-classe`), `[data-classe]` qui
  n'existe nulle part — puis, le plus coûteux, un clic sur `[data-ouvrir]` qui
  **tombait au centre de la carte, c'est-à-dire sur le code de classe et son
  bouton de copie**. Le gestionnaire les traite AVANT et rend la main : la carte
  ne s'ouvrait pas, sans la moindre erreur de page. `doitExister` a rendu les
  trois premiers tout de suite ; le quatrième, personne ne pouvait le dire.
- **Combien de fois** : || (même famille que le crochet inventé, mais une
  marche plus loin : le sélecteur est JUSTE et le geste est faux.)
- **Ce qui manque** : une habitude, à défaut d'un outil. **Sur une carte
  cliquable qui contient d'autres commandes, on vise un enfant inerte** — ici
  `.ec-carte-nom`, le nom de la classe. Et une idée d'outil, si le motif
  revient : `s.cliquerPourDeVrai(sel)` qui dirait, en cas d'échec, QUEL élément
  a réellement reçu le clic — c'est l'information qui manquait pendant les dix
  minutes de recherche.
- **Et la mesure elle-même coûte une minute**, parce que le plus petit chrono
  que le serveur accepte dure une minute. C'est pour cela que le défaut a
  survécu : personne ne reste une minute devant un écran pour voir si un bouton
  revient. Rémy, lui, y passe son heure de cours. `tools/chronoQuiFinit.mjs`
  reste, et `tests/chronoQuiFinit.test.mjs` garde la règle en millisecondes.

---

## Une sonde qui jette laisse son serveur derrière elle — 2026-10-06

- **Ce que je voulais faire** : écrire une sonde, et me tromper trois fois de
  crochet avant qu'elle n'atteigne l'écran — ce qui est normal et sain,
  puisque `doitExister` est fait pour ça.
- **Ce qui a coûté** : **quatre serveurs d'essai restés en vie**, un par
  lancement raté, trouvés par hasard une demi-heure plus tard. `s.fermer()`
  « ne tue que SON serveur », ce qui est juste — mais il n'est jamais appelé
  quand la sonde jette, et c'est précisément ce qui arrive pendant qu'on
  l'écrit. Quatre PHP et quatre bases SQLite pour rien, sur un conteneur dont
  le disque est compté. Et le jour où l'un d'eux reprend un port, on cherche
  pourquoi la mesure suivante voit les données de la précédente.
- **Combien de fois** : | (mais elle se reproduira à chaque sonde neuve, et
  c'est le critère de ce journal.)
- **Ce qui manque** : `ouvrirSonde` devrait **poser son propre ménage** —
  `process.on('exit')` et `process.on('uncaughtException')` qui tuent le
  serveur et ferment le navigateur. Deux lignes dans `tools/sonde.mjs`, et plus
  jamais un serveur orphelin. (Et `kill <PID>` nommément, jamais `pkill -f` :
  ce piège-là a déjà tué le shell de l'agent deux fois.)

---

## Une taille qu'on croit avoir donnée — 2026-10-06

- **Ce que je voulais faire** : agrandir la mosaïque, Rémy la trouvant trop
  petite pour qu'on y compte les carreaux.
- **Ce qui a coûté** : j'ai changé `COTE` de 34 à 46, relu le code, trouvé cela
  juste — et **rien n'avait bougé à l'écran**. La sonde l'a dit en une ligne :
  « viewBox 550×458, rendu 320 px ». Un `<svg>` sans `width` ni `height` n'a pas
  de taille naturelle ; `max-width: 100%` n'a donc rien à limiter, et c'est le
  `min-width: 320px` de la feuille de style qui décidait de tout. La figure
  faisait 320 px sur un écran de 1400, quelle que soit la valeur de la constante.
- **Combien de fois** : | (mais la famille est celle des défauts dont la cause
  est une règle du NAVIGATEUR et non une ligne du dépôt — comme le foyer que
  perd un bouton désactivé, trouvé le même jour.)
- **Ce qui manque** : rien à fabriquer, une habitude à prendre. **Toute sonde
  qui mesure une apparence doit relever la taille RENDUE, pas la taille
  demandée.** Deux appels — `getBoundingClientRect()` sur le dessin et sur une
  de ses cases — et l'écart saute aux yeux. Sans eux, j'aurais livré « c'est
  plus grand » à quelqu'un qui aurait vu exactement la même image qu'avant.

---

## Un bouton d'auteur qui ne sait répondre que pour une poignée d'exercices — 2026-10-06

- **Ce que je voulais faire** : donner à Rémy « une option réponse (de manière
  générale) pour voir si », dans la barre de débogage.
- **Ce qui a coûté** : peu — mais le constat mérite d'être noté. Le bouton
  existait depuis longtemps (`#db-solution`) et demandait `montrerSolution()` à
  l'exercice. **Presque aucun exercice ne l'implémente** : c'est un luxe que
  seuls quelques jeux à plateau peuvent offrir. Le bouton répondait donc « cet
  exercice ne sait pas montrer sa solution » dans la quasi-totalité des cas,
  c'est-à-dire qu'il était décoratif. Rémy l'a redemandé sans savoir qu'il
  existait, ce qui est le signe le plus clair qu'un outil ne sert à rien.
- **Combien de fois** : || (même forme que le bouton « ? » de la symétrie, le
  même jour : une commande posée là où elle ne pouvait pas répondre.)
- **Ce qui manque** : la question à se poser en posant un outil d'auteur —
  **« sur combien d'exercices cela répondra-t-il ? »** Si la réponse est « ceux
  qui ont écrit la méthode », il faut un REPLI qui marche partout. Ici il était
  à portée : tout item porte sa réponse, c'est elle que la séance compare.

---

## Un chiffre qui sonne gros n'est pas une mesure — 2026-10-06

- **Ce que je voulais faire** : répondre à Rémy, qui demandait « pourquoi
  découper index.html ? » — une dette que j'avais moi-même inscrite dans
  `docs/architecture.md` et répétée trois fois dans la journée.
- **Ce qui a coûté** : rien à corriger, tout à désapprendre. **Je n'avais pas
  de réponse.** La mesure, faite en dix minutes le jour où il a posé la
  question : sur 301 commits — un mois — le CONTENU d'`index.html` n'a pas
  bougé une seule fois. Les 115 commits qui « le touchent » y écrivent le
  `?v=NNN` du rituel de version, six fois, et rien d'autre. Un fichier que
  personne n'édite ne coûte rien à personne. J'avais pris « 1 960 lignes » pour
  un diagnostic alors que c'est un nombre.
- **Combien de fois** : || (même forme que le « ? » de la symétrie et que le
  tableau de numération : une décision que je prends seul, que je justifie
  bien, et qui ne survit pas à la première question.)
- **Ce qui manque** : une règle d'écriture pour `docs/architecture.md` §12, et
  elle était déjà à moitié là — chacune des autres entrées porte sa mesure
  (« il n'est plus importé que par deux fichiers », « environ cinq cents
  lignes », « touchent aux DONNÉES d'un professeur »). Celle-ci était la seule
  sans. **Une dette sans mesure à côté n'est pas une dette, c'est une
  impression.** Au prochain `/distill`, refuser toute entrée de cette liste qui
  ne dit pas ce qu'elle COÛTE, et à qui.

## Le champ que la frise lit s'appelle « marche », et rien ne le dit — 2026-10-06

- **Ce que je voulais faire** : brancher les quatre niveaux des Dingbats sur les
  cases à cocher de la maison, comme les trente-huit autres générateurs à
  progression.
- **Ce qui coûte** : quatre minutes de `npm test` pour apprendre une faute de
  nommage. J'avais posé `meta.niveau = 1` là où la frise cherche
  `meta.marche = 'n1'` — le NOMBRE au lieu de l'IDENTIFIANT. L'exercice se
  jouait, les quatre niveaux sortaient bien, et l'épreuve `progression`
  annonçait tout de même « marches jamais jouées en 16 questions : n1, n2, n3,
  n4 ». `tools/nouvelExercice.mjs`, qui dit en deux cents millisecondes ce que
  `npm test` met quatre minutes à dire, ne regarde pas ce champ-là.
- **Combien de fois** : | (mais le coût est structurel : `paramMarches` rend un
  réglage complet et n'exige RIEN du `meta` en retour. Le prochain générateur à
  progression paiera la même minute, ou la même heure s'il ne lit pas le
  verdict.)
- **Ce qui manque** : que `nouvelExercice.mjs` joue la longueur conseillée d'un
  générateur à progression et dise, tout de suite, quelles marches cochées ne
  sont jamais sorties. C'est le même calcul que `tests/progression.test.mjs`,
  mais au moment où l'on écrit le générateur, pas quatre minutes plus tard.

## Un écran qui se mesure pendant qu'il est caché se mesure à zéro — 2026-10-06

- **Ce que je voulais faire** : ouvrir l'atelier des dingbats sur une toile où
  chaque élément s'attrape, y compris entre deux lettres.
- **Ce qui coûte** : rien cette fois, parce que la sonde l'a vu — mais elle a
  failli ne pas le voir, et c'est ça qui est cher. Les zones de prise se posent
  en mesurant chaque élément (`getBBox`), et un élément dans un conteneur en
  `display: none` n'a AUCUNE géométrie : la mesure rend zéro et la pose est
  sautée **sans un mot**. L'atelier s'ouvrait donc sur une toile où l'on ne
  pouvait attraper un mot que sur le tracé exact de ses lettres. **En l'essayant
  moi-même je n'aurais rien vu : on vise le milieu du mot, qui tombe sur une
  lettre.** La sonde comptait « 0 zone de prise » pendant que son glissé
  réussissait — les deux mesures étaient justes, et c'est leur désaccord qui a
  parlé.
- **Combien de fois** : | (mais la forme est générale : toute modale du dépôt
  qui MESURE à l'ouverture — une échelle, une boîte englobante, une hauteur de
  colonne — a ce piège, et l'ordre « peindre puis montrer » est le réflexe.)
- **Ce qui manque** : une ligne dans `tools/sonde.mjs` — `s.mesurable(selecteur)`
  qui jette si l'élément visé a une boîte de largeur nulle. Le symptôme est
  toujours le même (une mesure géométrique qui rend 0 au lieu de jeter), et il
  se confond toujours avec « l'élément n'existe pas », exactement comme un
  sélecteur inventé rendait `false` avant `doitExister`.

## Le même repli de presse-papiers, écrit neuf fois — 2026-10-06

- **Ce que je voulais faire** : donner à Rémy un bouton « copier le JSON » dans
  chacun des deux ateliers.
- **Ce qui coûte** : six lignes, deux fois de plus. `navigator.clipboard` est
  REFUSÉ hors HTTPS et sur certains navigateurs ; quand il refuse, il faut
  montrer le texte dans une zone sélectionnable, sinon le bouton ne fait **rien**
  et l'on croit le logiciel cassé. Le dépôt écrivait déjà ce repli à neuf
  endroits, chacun à sa façon — et deux d'entre eux ne le font pas du tout.
- **Combien de fois** : ||||| ||||| | (neuf avant moi, deux de plus ce jour-là)
- **Ce qui manque** : plus rien, `js/ui/exporter.js` est écrit et les deux
  ateliers y passent. Ce qui reste à faire, et qui n'est pas pour aujourd'hui :
  y ramener les neuf autres **quand on passera dessus pour une autre raison**.
  Toucher neuf fichiers pour une refonte cosmétique fait un diff qu'on ne relit
  pas, et un diff qu'on ne relit pas est là où se cachent les défauts.

## Redessiner depuis le gestionnaire du nœud qu'on redessine — 2026-10-06

- **Ce que je voulais faire** : le glisser-déposer « hyper facile » que Rémy a
  demandé — prendre un mot sur la toile et le traîner.
- **Ce qui coûte** : trois mesures et deux faux diagnostics. Le gestionnaire de
  `pointerdown` et celui de `pointermove` appelaient `peindreToile()`, qui
  **remplace le `<svg>`** — c'est-à-dire le nœud même depuis lequel ils écoutent.
  Deux dégâts, et ils ne ressemblent pas à leur cause :
  · `setPointerCapture` sur un nœud détaché jette `InvalidStateError` ;
  · surtout, l'élément n'avançait que **d'un pas de souris sur huit** — le
    second `pointermove` arrivait sur un nœud mort. On croit avoir mal visé, on
    recommence, et le « hyper facile » demande deux essais sur deux.
- **Combien de fois** : || (la forme se reproduira : tout écran de ce dépôt qui
  se redessine en entier à chaque changement — et ils le font TOUS, c'est la
  convention de la maison — a ce piège dès qu'il écoute un geste CONTINU. Le
  glissé est le premier ; une poignée de redimensionnement serait le deuxième.)
- **Ce qui manque** : une règle écrite, et elle tient en une phrase — **un geste
  continu ne redessine que ce qui bouge, jamais son conteneur**. Et de quoi la
  garder : `tools/sonde.mjs` pourrait offrir `s.glisser(selecteur, dx, dy)` qui
  vérifie lui-même que l'objet a parcouru la distance DEMANDÉE.

## Une mesure qui ne vérifie que le SIGNE ne mesure rien — 2026-10-06

- **Ce que je voulais faire** : prouver que le glissé marche.
- **Ce qui coûte** : une journée de fausse assurance. Ma sonde disait
  `motApres.x > motAvant.x` — « la coordonnée a augmenté ». Elle passait au vert
  pendant que l'élément n'avançait que d'un huitième du geste. **Le défaut était
  sous la mesure, et la mesure disait oui.** Corrigée, elle calcule la distance
  attendue en unités de toile et tolère six unités ; le défaut est alors sauté
  aux yeux en une exécution.
- **Combien de fois** : || (même famille que l'épreuve verte qui ne gardait rien,
  qui a valu `epreuveTombe.mjs`. Ici l'épreuve n'est pas fausse : elle est
  FAIBLE, ce qui ne se voit pas du tout.)
- **Ce qui manque** : une habitude à écrire dans CLAUDE.md § 3 — **une sonde qui
  mesure un déplacement, une durée ou un compte dit la VALEUR attendue, jamais
  seulement son sens**. `epreuveTombe.mjs` attrape l'épreuve qui ne garde rien ;
  rien n'attrape encore l'épreuve qui garde à moitié.

## Troisième fois : redessiner depuis le gestionnaire du nœud qu'on redessine — 2026-10-07

- **Ce que je voulais faire** : le tracé « appuie, tire, relâche » de l'atelier
  d'essai.
- **Ce qui coûte** : une mesure de plus, et surtout l'humilité. **J'avais écrit
  cette friction la veille, et j'y suis retombé le lendemain, dans un fichier
  neuf, à la première ligne de `pointerdown`.** Le rectangle restait à 0×0 : le
  `peindreToile()` du `pointerdown` remplaçait le `<svg>` sur lequel le geste
  venait de commencer. Écrire la leçon dans un journal ne la fait pas respecter.
- **Combien de fois** : ||| (atelier intégré : le glissé ; puis le `pointerdown`
  de la sélection ; puis le tracé de l'essai.)
- **Ce qui manque** : non plus une note mais un GARDE-FOU. La forme est toujours
  la même et elle est détectable : une fonction qui fait `conteneur.innerHTML =`
  appelée depuis un gestionnaire d'événement posé SUR ce conteneur. Un `hook` à
  l'écriture pourrait refuser `peindreX()` dans un `addEventListener` du même X —
  comme `verifierSyntaxe.sh` refuse un accent grave dans un gabarit. Trois
  occurrences, c'est le seuil que le dépôt s'est donné pour fabriquer l'outil.

## Une barre qui flotte sur une surface de dessin en bloque le geste — 2026-10-07

- **Ce que je voulais faire** : une barre contextuelle collée à la sélection,
  « ce qu'on règle est à côté de ce qu'on regarde ».
- **Ce qui coûte** : trois mesures et deux faux diagnostics. La barre est un
  calque AU-DESSUS de la toile : partout où elle se pose, le geste ne peut plus
  COMMENCER. Elle a successivement avalé le clic de sélection d'un mot, la
  poignée de rotation, la poignée de coin après rotation, puis le tracé d'une
  flèche. Chaque fois le symptôme était « l'outil ne marche pas » et jamais
  « quelque chose est devant » ; c'est `elementFromPoint` au point visé qui a
  tranché, en rendant « ae-barre » là où j'attendais une poignée.
- **Combien de fois** : |||| (quatre fois le même défaut sous quatre symptômes
  différents, dans la même heure.)
- **Ce qui manque** : deux choses. Une règle : **sur une surface de dessin, un
  calque flottant se pose à côté, jamais dessus** — c'est ce qu'on a fini par
  faire, et la barre est maintenant AU-DESSUS de la toile, dans le flux. Et un
  outil : `s.quiEstDevant(selecteur)` dans la sonde, qui dit ce que
  `elementFromPoint` trouve au centre d'une cible. Les quatre diagnostics
  auraient tenu en une ligne chacun.

## Accrocher à la grille une valeur déjà déduite d'autres valeurs accrochées — 2026-10-07

- **Ce que je voulais faire** : tracer un rectangle au doigt, avec magnétisme.
- **Ce qui coûte** : Rémy l'a vu avant moi — « c'est bizarre au début, quand on
  trace les figures, ça tremble ». J'accrochais TROIS choses : le coin de départ,
  le coin courant, et le CENTRE calculé comme leur moyenne. La moyenne de deux
  multiples de 5 tombe une fois sur deux sur un multiple de 2,5, que le troisième
  accrochage renvoyait tantôt en haut tantôt en bas : la figure avançait puis
  reculait d'un demi-pas pendant qu'on la tirait. **Aucune de mes épreuves ne
  pouvait le voir** — elles vérifiaient la taille FINALE, qui était juste.
- **Combien de fois** : | (mais la forme reviendra partout où une grandeur se
  déduit d'autres grandeurs accrochées : une rotation par crans, un partage en
  parts égales, un redimensionnement proportionnel.)
- **Ce qui manque** : une règle — **on accroche les ENTRÉES du geste, jamais ce
  qu'on en déduit** — et une mesure qui sache la garder. Elle existe maintenant
  et elle est générale : tirer en vingt petits pas tous dans le même sens, et
  exiger que la grandeur ne RECULE jamais. Trembler, c'est reculer quand la main
  avance ; une épreuve qui ne regarde que la valeur finale ne le voit pas.

## Un lot de remplacements annulé laisse croire que les bonnes paires sont passées — 2026-10-07

- **Ce que je voulais faire** : poser l'import de SVG dans l'atelier — cinq
  remplacements d'un coup dans `js/essai/atelierEssai.js`.
- **Ce qui coûte** : deux allers-retours et un faux diagnostic. La cinquième
  paire n'a pas trouvé son compte, et `remplacer.mjs` a fait ce qu'il doit :
  **RIEN n'est écrit**. Mais son compte rendu affiche d'abord `ok` pour les
  quatre premières, et l'on retient `ok, ok, ok, ok, RATÉ`. J'ai reposé la
  cinquième seule, en croyant les quatre autres en place : le bouton d'import
  existait dans le HTML, mais `innerHTML =` l'effaçait au démarrage et le
  gestionnaire n'était jamais branché. Deux symptômes, une seule cause —
  l'écriture n'avait pas eu lieu.
- **Combien de fois** : | (mais la forme reviendra : plus le lot est gros, plus
  la ligne finale est loin des `ok`, et c'est précisément quand le lot est gros
  qu'on ne relit pas.)
- **Ce qui manque** : que `remplacer.mjs` dise, quand il renonce, **ce qui n'a
  PAS été écrit** — « les 4 autres paires n'ont pas été appliquées non plus » —
  plutôt que de laisser le lecteur déduire une règle qu'il connaît pourtant.
  Ce qui a sauvé la mise : `doitExister` sur `#ae-import`, qui a refusé de rendre
  `false` là où un crochet manquant ressemble à un logiciel cassé.

## Une page à part hérite d'un `body` fait pour une application d'un seul écran — 2026-10-07

- **Ce que je voulais faire** : une page d'essai autonome, qui charge
  `css/base.css` pour avoir les jetons de couleur des cinq thèmes.
- **Ce qui coûte** : un défaut que la photo CACHAIT. `base.css` pose
  `body { display: flex; height: 100dvh; overflow: hidden }` — juste pour
  l'application, qui est un écran unique dont chaque volet défile tout seul.
  Ma page, elle, est plus haute que l'écran : **elle ne défilait pas du tout**,
  la fiche et l'export étaient inatteignables, et la bande des compositions
  s'écrasait à 17 pixels pour un contenu de 83. La capture d'écran ne montrait
  rien, parce qu'elle photographie la BOÎTE ENTIÈRE d'un élément, défilement ou
  non.
- **Combien de fois** : | (mais la prochaine page autonome héritera du même
  `body`, et `postes.html` est peut-être déjà concernée — à vérifier.)
- **Ce qui manque** : une ligne dans la sonde, et elle est générale :
  `s.laPageDefile()` — vrai si le document est plus haut que la fenêtre ET que
  le bas du dernier élément est atteignable. **Une photo ne dit jamais si une
  page défile** ; il faut le demander, et on ne pense à le demander qu'une fois
  qu'on a payé.

## Deux couches du même panneau portent le même nom de crochet — 2026-10-07

- **Ce que je voulais faire** : mesurer, à 390 px, la consigne que le tri au
  pouce prépare — `page.inputValue('[data-consigne]')`.
- **Ce qui coûte** : Playwright répond *« Node is not an `<input>`,
  `<textarea>` or `<select>` element »*, ce qui ressemble à un défaut de ma
  zone de texte. Elle n'avait rien. La TÊTE de la revue, qui reste à l'écran
  au-dessus des cartes, porte depuis toujours un bouton `data-consigne` — et
  `querySelector` rend le PREMIER du document. Le sélecteur désignait un bouton,
  pas le champ ; la même chose attendait sur `data-copier`. Dix minutes à
  chercher le défaut dans la bonne couche du mauvais élément.
- **Combien de fois** : ||| — c'est la famille de `:last-of-type` qui désignait
  le calque des poignées, et de `querySelector('.auj-go')` qui mesurait le
  premier bouton de la page. **Un sélecteur qui trouve quelque chose n'a pas
  trouvé la bonne chose.** `doitExister` ne peut rien ici : l'élément existe.
- **Ce qui manque** : `s.doitEtreUnique(selecteur)` — qui JETTE si le sélecteur
  désigne plus d'un nœud, en les décrivant. Trois lignes dans `sonde.mjs`, et
  l'erreur dirait « deux `[data-consigne]` : BUTTON.rv-btn et TEXTAREA.tt-consigne »
  au lieu de parler du type d'un nœud qu'on n'a jamais visé.

## Une sonde qui déplace le foyer mesure un écran que personne n'a — 2026-10-07

- **Ce que je voulais faire** : vérifier qu'après « 🧹 Vider », un Ctrl+Z remet
  la récolte — c'est ce qui permet de ne pas poser de fenêtre de confirmation.
- **Ce qui coûte** : vingt minutes, et DEUX fausses pistes successives, toutes
  les deux contre le même bouton qui n'avait rien. D'abord
  `page.click('#ae-toile')` pour « donner le foyer » : un appui sur la toile est
  lui-même un geste, il empile un état, et le Ctrl+Z annulait l'appui de la
  sonde. Ensuite `evaluate(() => toile.focus())` pour ne pas cliquer : le
  raccourci ne partait plus du tout. Les deux fois la mesure rendait
  « 0 élément retrouvé » et accusait « Vider ». Le foyer là où le CLIC DE
  L'UTILISATEUR le laisse — sur le bouton — marchait depuis le début.
- **Combien de fois** : || (déjà payé sur le champ de remarque du tri au pouce,
  où j'allais « aider » en cliquant avant de taper.)
- **Ce qui manque** : une ligne dans la sonde — `s.raccourci('Control+z')` —
  qui REFUSE de partir si le foyer n'est pas déjà dans la zone mesurée, en
  disant où il est. Et la règle, plus générale que l'outil : **on ne prépare pas
  un écran pour la mesure ; si la mesure a besoin d'une préparation que
  l'utilisateur ne fait pas, c'est la mesure qui est fausse.**

## Une mesure qui ne casse rien ne mesure que le beau temps — 2026-10-07

- **Ce que je voulais faire** : être sûr que le bouton « Copier les verdicts »
  rend bien le tri du quotidien. Il y avait une mesure, et elle était verte.
- **Ce qui coûte** : Rémy a trié DEUX CENTS entrées une par une, a cliqué, et
  n'a rien eu. La mesure était verte parce qu'elle mesurait Chromium, en
  contexte sûr, la fenêtre au premier plan — les trois conditions dans
  lesquelles `navigator.clipboard` ne refuse jamais. Elle ne pouvait donc PAS
  voir le défaut : le repli existait dans le code, mais rien ne l'avait jamais
  emprunté. Et le seul bouton voisin était « Tout remettre à zéro », qui
  effaçait tout en un appui, sans un mot.
- **Combien de fois** : | — mais le dépôt copie dans le presse-papiers à onze
  endroits, et neuf gardent l'ancien repli jamais emprunté.
- **Ce qui manque** : de quoi CASSER une capacité du navigateur pendant la
  mesure. Trois lignes dans la sonde — `s.sansPressePapiers()`,
  `s.sansStockage()`, `s.horsLigne()` — et la règle qui va avec : **le chemin
  de repli qu'aucune mesure n'emprunte n'existe pas.** C'est le pendant de
  « une mesure qui n'emprunte pas le chemin de l'utilisateur ne mesure pas son
  problème » : ici le chemin de l'utilisateur est celui où ça REFUSE.

## Une épreuve qui fige un stock de départ interdit le tri qu'elle préparait — 2026-10-07

- **Ce que je voulais faire** : retirer du code les soixante-quatorze blagues
  que Rémy venait d'écarter.
- **Ce qui coûte** : `npm test` est devenu rouge sur « DEUX CENTS ENTRÉES PAR
  LISTE, comme demandé ». Or les deux cents avaient été demandées POUR qu'on
  puisse en jeter la moitié — Rémy : « mets-en alors deux cents et un clic oui
  ou non et je te l'envoie ». L'épreuve défendait donc exactement le contraire
  de ce pour quoi elle avait été écrite : elle interdisait le tri qu'elle
  devait rendre possible. Vingt minutes à trouver la vraie règle (le temps
  qu'une entrée met à revenir, qui dépend aussi du roulement des genres — et où
  RACCOURCIR une liste peut ALLONGER le cycle, parce qu'un multiple de cinq
  retombe sur le même jour du roulement).
- **Combien de fois** : | — mais ça se reproduira au prochain tri : le dépôt
  compte au moins trois épreuves de la même famille (109 dingbats, 224
  exercices, 201 par liste), et chacune fige un stock de DÉPART au lieu de la
  propriété qui compte.
- **Ce qui manque** : pas un outil — une relecture. **Une épreuve qui compte
  des contenus doit énoncer ce que le nombre sert à garantir, jamais le nombre
  qu'on avait le jour où on l'a écrite.** À passer en revue quand on touchera
  aux deux autres.

## Une cible de 24 px entre « je garde » et « je supprime » — 2026-10-07

- **Ce que je voulais faire** : vérifier le doute de Rémy — « je ne suis pas
  sûr d'avoir retiré autant de blagues » — après avoir reporté 74 suppressions.
- **Ce qui coûte** : une heure à chercher un défaut d'enregistrement qui
  n'existait pas. La sonde a montré que l'écran note exactement ce qu'on
  touche : la liste ne saute pas au redessin, la 60ᵉ reste sous le doigt, seule
  la 60ᵉ est marquée. Le défaut était ailleurs, et une mesure de GÉOMÉTRIE l'a
  dit en trois lignes : les boutons ✓ et ✕ faisaient **24 × 24 px, séparés de
  3 px**, sur deux cents lignes — 55 % du minimum tenable au pouce, et les deux
  réponses OPPOSÉES collées l'une à l'autre.
- **Combien de fois** : || — le tri au pouce avait déjà demandé cette mesure,
  et je l'avais écrite pour LUI seul (`tools/triAuPouce.mjs`) au lieu d'en
  faire une règle. Les boutons du tri du quotidien étaient là depuis le début.
- **Ce qui manque** : `s.ciblesAuDoigt(selecteur)` dans la sonde — qui rend
  toutes les cibles sous 44 px ET toutes les paires séparées de moins de 8 px,
  d'un coup, sur n'importe quel écran. **On ne mesure pas la taille des cibles
  de l'écran qu'on vient d'écrire ; on la mesure sur tous ceux qu'on a.**

## Le serveur d'essai n'applique pas `.htaccess` : aucune sonde ne voyait les vrais en-têtes — 2026-10-07

- **Ce que je voulais faire** : comprendre la capture de Rémy — les trois volets
  de l'Atelier affichaient « atout-math.fr refused to connect ».
- **Ce qui coûte** : le défaut tenait en un mot (`frame-ancestors 'none'`
  interdit l'encadrement **y compris par le site lui-même**), mais il vivait
  là depuis le jour où la politique a été écrite, et **quatre** fonctions
  étaient muettes en ligne — l'Atelier, le Contrôle, l'atelier de géométrie.
  Rien dans ce dépôt ne pouvait le dire : `.htaccess` est appliqué par Apache,
  le serveur d'essai est `php -S`, **qui l'ignore**. Sept cents mesures
  tournaient sur une configuration qui n'existe nulle part. Et le navigateur
  ne prévient pas la page : seul un humain devant l'écran s'en aperçoit.
  Deux heures, dont deux fausses pistes instructives :
  **(1)** poser l'en-tête depuis la sonde (`route.fulfill`) ne marche pas —
  Chromium n'applique pas `frame-ancestors` à une réponse fabriquée par
  l'interception, et la sonde restait verte avec `'none'` ;
  **(2)** un routeur PHP qui rend `false` fait **jeter** ses en-têtes par le
  serveur intégré. Il faut qu'il serve lui-même le document.
- **Combien de fois** : | — mais la famille est large : tout ce qui est
  configuré HORS du code (`.htaccess`, en-têtes, redirections, PHP de
  l'hébergeur) échappait de la même façon à toutes les mesures.
- **Ce qui manque** : c'est fait — `tools/routeurEssai.php` sert les documents
  HTML avec la politique lue dans `.htaccess`, et **toutes** les sondes en
  profitent d'un coup. La règle, plus large que l'outil : **ce qu'on mesure
  doit être servi comme ce qui sera livré ; un réglage qui ne vit que chez
  l'hébergeur n'est pas mesuré, il est espéré.** Reste à faire entrer de la
  même façon les redirections et les en-têtes de cache.

## L'aperçu d'une fiche et son PDF sont deux dessins, et c'est le second qu'on imprime — 2026-10-07

- **Ce que je voulais faire** : corriger la barre du radical, que Rémy signale
  QUATRE fois dans la même revue — « la racine carré ne recouvre pas bien le
  nombre sur la version imprimé ».
- **Ce qui coûte** : deux pièges enchaînés. **(1)** L'aperçu est du HTML, où la
  barre est un `text-decoration: overline` que le navigateur pose seul ; le PDF
  est tiré par jsPDF, qui ne connaît ni `overline` ni le caractère de barre —
  il faut y DESSINER un trait. Une correction faite sur l'aperçu seul aurait
  paru bonne à l'écran et n'aurait rien changé sur la feuille. **(2)** Ma
  première mesure du PDF cherchait des traits horizontaux « entre 2 et 25
  points » et n'en trouvait aucun : la barre en fait 32. Dix minutes à croire
  le code cassé alors que le FILTRE était faux — une mesure qui cherche une
  valeur devinée ne mesure que ma devinette.
- **Combien de fois** : || — c'est la famille de « une correction posée sur un
  seul des chemins qui mènent au même endroit ne ferme rien », ici avec deux
  chemins qui ne se ressemblent même pas. Et `ficheRendu.js` le dit déjà de
  lui-même : `morceauxLigne` a CINQ sortes de morceaux et TROIS lecteurs.
- **Ce qui manque** : `tools/ficheRacines.mjs` existe maintenant et lit le PDF
  produit, pas l'aperçu. La règle : **quand une chose se rend deux fois, la
  mesure va sur celle qu'on livre** — et elle compare à la géométrie voisine,
  jamais à un nombre choisi d'avance.

## J'ai réécrit un rendu qui existait déjà, et la jonction s'est vue — 2026-10-07

- **Ce que je voulais faire** : poser la barre du radical sur la fiche papier.
- **Ce qui coûte** : un aller-retour entier avec Rémy. J'ai écrit un SECOND
  radical — le caractère « √ » de la police suivi d'un `text-decoration:
  overline` — alors que `core/maths/formule.js` existe DEPUIS DES MOIS pour
  cette seule raison, et porte en commentaire la question de Rémy qui l'a fait
  naître : « sur ton banc les radicaux ont-ils une ligne de la même
  épaisseur ». Son crochet se termine par un bout horizontal qui PROLONGE la
  barre ; les deux sont des tracés SVG aux mêmes réglages. Le mien juxtaposait
  un glyphe et un soulignement : ni la même épaisseur, ni la même hauteur.
  Rémy l'a vu en une seconde — « il faut bien que la racine carrée soit
  continue, là il y a une rupture ».
- **Combien de fois** : || — même famille que l'atelier qu'on a failli
  recopier dans la modale. **Avant d'écrire le rendu d'un objet mathématique,
  on cherche s'il est déjà dessiné quelque part** ; dans ce dépôt, la réponse
  est presque toujours oui, et c'est `core/maths/`.
- **Ce qui manque** : une ligne dans `tools/nouvelExercice.mjs` — ou une
  épreuve — qui refuse qu'un radical, une fraction ou une puissance soit
  composé à la main ailleurs que par `core/maths/formule.js`. Le motif est
  simple à chercher : un `√` ou un `overline` écrit hors de ce module.

## Un cercle d'imports qui ne casse que si l'on n'entre pas par la bonne porte — 2026-10-08

- **Ce que je voulais faire** : mesurer, barreau par barreau, ce que la fiche
  `sec-valeur-absolue` imprime. La sonde importait `js/ui/fiches/axes.js`.
- **Ce qui coûte** : vingt minutes et trois corrections qui désignaient chacune
  un fichier différent et jamais le bon. `Cannot access 'POINTE' before
  initialization` dans `mots.js` ; puis `'ENCRE'` dans `elementsGeo.js` ; puis
  `'RENDUS_AXES'` dans `printSheet.js`. Aucun des trois n'avait tort : les
  modules de l'impression forment un cercle — `socle.js` → `ficheRendu.js` →
  `printSheet.js` → un rendu → `socle.js` — et **un cercle ne se voit que
  depuis la porte par laquelle on n'entre jamais**. L'application charge
  `printSheet.js` en premier, tout se referme dans le bon ordre, et le défaut
  dort. Une sonde importe le rendu qu'elle mesure, et tout tombe.
- **Combien de fois** : | — mais le piège était armé depuis longtemps et aurait
  sauté au prochain module de `fiches/` écrit avec le réflexe normal
  `const TRAIT = ENCRE.trait` en tête de fichier.
- **Ce qui manque** : rien, maintenant. `tests/cercleDesFiches.test.mjs` charge
  chaque rendu **en premier**, dans un processus neuf, et exige qu'aucun ne
  jette sur une zone morte. L'arête à l'envers est partie (`ficheRendu` ne
  construit plus sa table, il la reçoit) et l'encre vit dans un module feuille
  qui n'importe rien. La leçon générale : **une mesure qui n'emprunte pas le
  chemin de l'utilisateur ne mesure pas son problème — mais une mesure qui
  n'emprunte QUE ce chemin ne voit pas les pièges qu'il contourne.**

## Une photo coupée ressemble à une photo réussie — 2026-10-08

- **Ce que je voulais faire** : regarder la fiche entière, sept lignes, pour
  voir si l'énoncé tombait bien à la hauteur de son axe.
- **Ce qui coûte** : une passe perdue. `s.photo` découpe sur la FENÊTRE, pas
  sur l'élément : une feuille plus haute que la sonde revient tronquée, sans
  erreur, sans rien dans le verdict. J'ai regardé le haut d'une fiche, conclu
  que l'aperçu s'était replié, et cherché le défaut du mauvais côté.
- **Combien de fois** : || — c'était déjà arrivé la veille, et j'avais mis la
  faute sur le cadre de l'aperçu.
- **Ce qui manque** : rien, maintenant. `photo` rend `entiere` et `coupe`, et
  **crie en jaune** quand elle a dû découper, en disant de combien et ce qu'il
  faut faire. Une sonde peut donc en faire une mesure, comme `ficheAxes.mjs`.

## Une garde qui lit la source trouve son propre commentaire — 2026-10-08

- **Ce que je voulais faire** : interdire un import précis dans `ficheRendu.js`.
- **Ce qui coûte** : un aller-retour. Ce dépôt explique chaque décision à
  l'endroit où elle se prend : le commentaire qui interdit la ligne **la cite
  mot pour mot**. La garde l'a trouvée et a rougi sur un fichier juste — et une
  garde qui rougit à tort finit par être désactivée.
- **Combien de fois** : | — mais toute garde future qui cherche un motif dans
  du code tombera dessus, puisque la règle du dépôt est d'écrire le pourquoi à
  côté du quoi.
- **Ce qui manque** : un `sansCommentaires()` partagé. Il est pour l'instant
  recopié dans `tests/cercleDesFiches.test.mjs` ; au deuxième usage, il
  descendra dans un module d'épreuves.

## Une épreuve qui devine la FORME de ce qu'elle interdit — 2026-10-08

- **Ce que je voulais faire** : garder que l'énoncé papier du barreau 8
  n'écrive pas la réponse. J'ai cherché `/[[\]]\s*-?\d/`.
- **Ce qui coûte** : rien cette fois, et c'est tout l'intérêt —
  `tools/epreuveTombe.mjs` l'a vue rester VERTE avec le défaut remis. Un
  ensemble de points s'écrit « {−6 ; 4} » entre ACCOLADES, et son moins est le
  « − » typographique, que `-?\d` ne reconnaît pas. La garde n'interdisait que
  la forme que j'avais devinée.
- **Combien de fois** : ||| — même famille que « une mesure qui ne cherche
  qu'une valeur devinée ne mesure que ma devinette ». **On compare à la
  fonction qui produit la chose** — ici `solutionTexte` —, jamais à un motif
  qu'on a écrit de mémoire.
- **Ce qui manque** : rien. `epreuveTombe` fait exactement son travail ; la
  note est là pour que la règle se retienne.

## La même couture, revue une troisième fois — 2026-10-08

- **Ce que je voulais faire** : poser une barre de radical qui prolonge le
  crochet. Rémy, sur la fiche : « il y a un léger décalage entre la ligne
  horizontale et la fin du V ».
- **Ce qui coûte** : une demi-journée, et c'est la TROISIÈME fois qu'il voit
  cette couture — « les racines carrées sont très moches », puis « il faut
  bien que la racine carrée soit continue », puis celle-ci. À chaque fois le
  défaut était ailleurs, et à chaque fois pour la même raison de fond : **le
  radical est fait de deux objets qui se rejoignent, et deux objets qui se
  rejoignent laissent une couture quelque part.** D'abord l'épaisseur (bordure
  CSS contre tracé SVG), puis la hauteur (glyphe contre soulignement), puis la
  rastérisation (rectangle rempli contre tracé tracé). Les trois corrections
  sont justes ; aucune ne s'attaquait à la cause.
- **Combien de fois** : ||| — et chaque fois j'ai mesuré la GÉOMÉTRIE, qui
  était juste à 0,012 px près, avant de comprendre qu'il fallait mesurer
  l'ENCRE. `getBoundingClientRect` ne pouvait rien dire : la BOÎTE d'un SVG
  n'est pas son TRAIT, et c'est justement l'écart cherché.
- **Ce qui manque** : deux choses, maintenant là.
  `tools/jonctionRacine.mjs` lit le haut de l'encre colonne par colonne, à onze
  corps et quatre radicandes — **un défaut d'arrondi ne se voit pas à la taille
  où l'on mesure, il se voit à celle où l'on regarde** : à 13 px la jonction
  était nette, à 32 px elle avait une marche et une encoche.
  Et `decoderPng` sort de `sonde.mjs` avec `hautDeLEncre` / `basDeLEncre` : le
  décodeur existait, enfermé dans un compteur de couleurs qui dit QUELLES
  couleurs sont là et jamais OÙ. Trois questions de Rémy sur un alignement de
  deux traits, trois fois la même mesure à réécrire.

## Un commentaire qui dit le contraire de ce qui est vrai — 2026-10-08

- **Ce que je voulais faire** : faire de la barre du radical un tracé plutôt
  qu'un rectangle.
- **Ce qui coûte** : j'ai failli ne pas essayer. Le commentaire CSS l'interdisait
  en citant une mesure : « un trait déclaré non-scaling-stroke ne survit pas à
  un étirement ANISOTROPE, il tombait à 0,67 px au lieu de 2,40 ». Or c'était le
  piège documenté quelques règles PLUS HAUT dans le même fichier, à l'envers :
  `vector-effect` ne s'hérite pas, et posé sur le `<svg>` il ne touche pas la
  forme. Remesuré avec la règle sur la forme : 2,40 px demandés, 2,40 peints.
- **Combien de fois** : | — mais c'est le risque propre à un dépôt qui explique
  tout : **un commentaire qui cite une mesure fait autorité**, et plus personne
  ne la refait. Celui-ci a tenu des mois.
- **Ce qui manque** : rien d'outillable. La règle est de conduite : quand un
  commentaire interdit une voie en citant un chiffre, on refait la mesure avant
  de renoncer — surtout si le même fichier documente ailleurs un piège qui
  expliquerait ce chiffre.

## Une épreuve qui garde deux champs sans garder leur accord — 2026-10-08

- **Ce que je voulais faire** : garder la fiche de l'Enquête. J'avais six
  épreuves : les zones couvrent le plan, leur contour est fermé, les prénoms
  sont sur des rangées distinctes, le coupable est seul dans son lieu.
- **Ce qui coûte** : rien cette fois, et c'est encore `epreuveTombe` qui l'a
  dit — j'ai échangé `r` et `c` dans la solution et **les six épreuves sont
  restées vertes**. Chacune regardait UN champ : les rangées restaient
  distinctes, les colonnes aussi, le coupable restait seul. Le `meta` porte
  pourtant deux choses que le rendu lit séparément — la CASE où poser le
  prénom, et le LIEU qui désigne le coupable — et rien ne les reliait. Une
  transposition laissait les deux moitiés cohérentes chacune de son côté ;
  seule la feuille imprimée aurait montré les prénoms au mauvais endroit.
- **Combien de fois** : || — même famille que « une épreuve qui devine la forme
  de ce qu'elle interdit ». **Quand un objet porte deux descriptions de la même
  chose, la garde qui compte est celle qui les CONFRONTE**, pas celles qui les
  vérifient séparément.
- **Ce qui manque** : rien d'outillable, `epreuveTombe` fait son travail. La
  règle est de conduite : pour chaque champ d'un `meta`, se demander quel AUTRE
  champ dit la même chose autrement, et écrire l'épreuve qui les met d'accord.

## Deux gardes neuves sur trois ne gardaient rien — 2026-10-08

- **Ce que je voulais faire** : garder la fiche du champ de trèfles. Trois
  épreuves écrites avec soin : l'écran et le papier tracent la même feuille,
  les trèfles sortent dans l'ordre de dessin, le champ tient dans sa boîte.
- **Ce qui coûte** : rien, parce que `epreuveTombe` les a passées une par une —
  et **deux sur trois sont restées vertes avec le défaut remis**.
  · « les trèfles sortent dans l'ordre de dessin » vérifiait que les ordonnées
    ne montaient pas régulièrement. Le semis les fait déjà sauter d'un demi-pas :
    l'épreuve était verte dans les deux cas. Il a fallu porter le RANG DE SEMIS
    dans le `meta`, uniquement pour que la garde ait de quoi comparer.
  · « l'écran et le papier tracent la même feuille » ne tombe pas si l'on
    retouche un point de contrôle — les deux côtés bougent ensemble, ce qui est
    précisément ce qu'elle garantit. Elle tombe quand on remet une SECONDE
    description du chemin, et c'est ainsi qu'il fallait la voir tomber.
- **Combien de fois** : |||| — c'est la quatrième fois en deux jours qu'une
  épreuve écrite de bonne foi ne garde rien. Le fil commun : **une garde qui
  observe une CONSÉQUENCE indirecte du défaut (des ordonnées qui montent, une
  forme devinée par motif) ne le voit pas ; il faut comparer à la chose même.**
  Et parfois cela oblige à ajouter au code un champ qui ne sert qu'à la garde :
  c'est un coût honnête, bien moindre qu'une assurance qui n'existe pas.
- **Ce qui manque** : rien d'outillable. `epreuveTombe` fait tout le travail, et
  la règle à retenir est qu'il faut le lui donner à faire **sur chaque épreuve,
  une par une** — pas sur le fichier entier, où une épreuve qui tombe en cache
  deux qui ne tombent pas.

## Du code qu'aucune épreuve ne peut atteindre — 2026-10-08

- **Ce que je voulais faire** : garder le plafond de barreaux de la fiche du
  « moins devant la parenthèse ». J'avais écrit `Math.min(2, …)` par prudence.
- **Ce qui coûte** : trois passes de `epreuveTombe` pour comprendre que ce
  plafond **ne sert jamais**. `marchesCochees` ne rend que des barreaux DE LA
  TABLE, donc deux pour cette échelle : le `Math.min` ne peut mordre que si la
  table est fausse ET le plafond retiré — deux défauts à la fois, qu'aucune
  épreuve d'une seule ligne ne produit. J'ai d'abord écrit une épreuve pour
  lui ; elle est restée verte sur trois défauts différents.
- **Combien de fois** : | — mais la leçon est générale et je ne l'avais pas
  formulée : **du code qu'aucune épreuve ne peut atteindre finit par être cru
  sur parole**. Une garde qui ne peut pas tomber et une ligne qui ne peut pas
  servir sont le même problème vu des deux bouts.
- **Ce qui manque** : rien d'outillable. La règle : quand `epreuveTombe` refuse
  de faire tomber une épreuve neuve, se demander d'abord si c'est l'ÉPREUVE qui
  est faible — ou si c'est le CODE qui est mort. Ici c'était le code, et la
  bonne correction était de le retirer.

## La revue de Rémy n'était plus sur le disque — 2026-10-08

- **Ce que je voulais faire** : traiter le dernier point de sa revue du
  catalogue, « un imprimé avec plusieurs questions pour un même tableau de
  mosaïque ».
- **Ce qui coûte** : une incertitude évitable. Le fichier `revue-2026-10-07.md`
  avait été envoyé dans la conversation, lu, et jamais écrit sur le disque. Mes
  propres notes l'avaient rattaché au mauvais exercice (`calc-add`, où
  « mosaïque » n'a aucun sens). Il a fallu remonter la piste dans le catalogue
  — `geo-mosaique` portait bien une `consignePapier` et aucune figure — pour
  retrouver de quoi il parlait.
- **Combien de fois** : || — c'est la deuxième revue qu'il envoie, et la
  deuxième fois qu'elle ne survit pas à la session.
- **Ce qui manque** : une habitude, pas un outil. **Toute liste de remarques
  que Rémy envoie s'écrit dans `docs/` avant qu'on commence à la traiter**, et
  les points faits s'y cochent au fur et à mesure. Une revue de vingt-deux
  points ne tient pas dans une session, et ce qui n'est pas sur le disque
  n'existe pas à la suivante.

## Reculer une valeur dans le plan ne recule pas celle qu'un rendu écrit en dur — 2026-10-08

- **Ce que je voulais faire** : écarter la pointe d'un intervalle infini de la
  pointe de l'axe, qui se superposaient. Rémy : « attention à la présentation ».
- **Ce qui a coûté** : une correction qui marchait sur le papier et CASSAIT
  l'écran, sans que rien ne le dise. `planDAxe` rend `x1`/`x2` ; le rendu papier
  y pose sa pointe, mais `axeHtml` écrivait la sienne en dur, en `L − 3`.
  Reculer le plan a donc laissé, à l'écran, une pointe flottant à neuf unités
  de sa barre. Trouvé parce que j'ai ouvert le SVG pour regarder, pas parce que
  quelque chose a rougi — la sonde `ficheAxes.mjs` ne mesure que le papier.
- **Combien de fois** : ||| — c'est la troisième forme du même défaut. La
  racine carrée (deux fois) et les figures de géométrie ont toutes payé « on ne
  redessine pas de l'autre côté ». La leçon était écrite ; elle disait
  « extraire le plan », et le plan EXISTAIT. Ce qui manquait, c'est que l'un des
  deux lecteurs ne s'en servait pas.
- **Ce qui manque** : la règle, que je formule enfin dans les deux sens : **avant
  de déplacer une valeur DANS un plan, chercher qui l'écrit en dur en DEHORS.**
  `grep` sur la constante littérale (`L - 3`, `0.72`) coûte dix secondes et
  répond. Et la garde qui tient : confronter les deux dessins l'un à l'autre
  (`tests/axeSurLaFiche.test.mjs`, « ET L'ÉCRAN POSE SA POINTE OÙ LE PLAN LA
  MET »), jamais chacun à un nombre.

## Un chiffre supposé dans un commentaire fait autorité pendant une semaine — 2026-10-08

- **Ce que je voulais faire** : répondre à « Les trèfles prennent toutes une
  page sur le pdf ».
- **Ce qui a coûté** : le commentaire qui défendait « un champ par page »
  annonçait, pour écarter l'autre choix, que deux par page ramèneraient les
  trèfles « à quatre millimètres ». Je l'avais écrit sans le mesurer. C'est
  **10,2 mm** sur le palier par défaut — deux fois et demie le chiffre annoncé,
  et exactement la taille d'un trèfle de revue. Rémy a vécu une semaine avec des
  feuilles deux fois trop grandes parce que ma propre phrase disait de ne pas
  essayer.
- **Combien de fois** : || — la deuxième entrée sur ce thème. La première disait
  « un commentaire qui cite une mesure fait autorité, et plus personne ne la
  refait » ; celle-ci ajoute le cas plus dangereux : **un commentaire qui cite
  une mesure QU'ON N'A PAS FAITE**.
- **Ce qui manque** : une convention d'écriture, et je la prends. **Un chiffre
  dans un commentaire s'écrit avec la commande qui le refait**, ou il s'écrit
  « supposé ». `node tools/tailleTrefle.mjs` existe maintenant pour celui-ci :
  deux cents millisecondes, et le tableau entier.

## Le fichier de paires de `remplacer.mjs` jetait sa propre pile d'appels — 2026-10-08

- **Ce que je voulais faire** : écrire trois remplacements multilignes dans
  `intervalles.js`.
- **Ce qui a coûté** : un aller-retour. J'avais écrit les paires sous la forme
  `[{ "ancien": …, "nouveau": … }]`, qui vient tout aussi naturellement sous la
  main que `[["ancien", "nouveau"]]`. L'outil rendait un `TypeError: object is
  not iterable` DEPUIS SES ENTRAILLES, sur une pile d'appels qui ne nommait même
  pas le fichier de paires — l'erreur se lit comme un outil cassé, pas comme une
  entrée mal formée.
- **Combien de fois** : | — mais le fichier de paires s'écrit à la main ou par
  un script jetable à chaque usage multiligne, c'est-à-dire plusieurs fois par
  séance.
- **Ce qui manque** : rien de plus, c'est fait. `remplacer.mjs` **et**
  `epreuveTombe.mjs` acceptent désormais les deux formes et refusent tout le
  reste EN NOMMANT la paire fautive. Deux outils voisins qui n'acceptaient pas
  le même format étaient eux-mêmes la moitié de la friction.

## Une garde qui lit la source tombe sur une réécriture qui ne change rien — 2026-10-08

- **Ce que je voulais faire** : rapprocher les noms de points de leurs points,
  ce qui demandait d'essayer les trois tours de places DANS L'ORDRE.
- **Ce qui a coûté** : quatre minutes de `npm test` pour apprendre que
  `tests/nomsDeFigure.test.mjs` cherchait, à la lettre,
  `for (const rayon of [...])` et `for (let i = 0; i < 12; i++)` dans la source
  de `pointsDroitesSvg.js`. La boucle est devenue un `map` et un `Array.from`,
  le comportement n'a pas bougé d'un pixel, et l'épreuve est tombée. Une
  épreuve rouge sur un code juste coûte deux fois : on cherche d'abord le
  défaut qui n'existe pas.
- **Combien de fois** : ||| — la troisième. Les deux premières disaient déjà
  « une garde qui lit la source trouve son propre commentaire ». Celle-ci ajoute
  l'autre moitié : **elle tombe aussi quand on réécrit sans rien changer**, ce
  qui décourage exactement les réécritures qu'on voudrait encourager.
- **Ce qui manque** : rien d'outillable, et la règle est simple à tenir. Une
  garde lit la source quand elle n'a pas le choix — un `paint-order` en CSS, un
  import interdit. Dès qu'une PROPRIÉTÉ se mesure sur le résultat, c'est le
  résultat qu'on mesure. L'épreuve réécrite ici compte les noms qu'un trait
  traverse (zéro sur 369) au lieu de compter les tours dans le code.

## Le harnais qui garde tous les commits rougissait au hasard — 2026-10-08

- **Ce que je voulais faire** : lire le verdict de `node tools/boutEnBout.mjs`
  avant de committer, comme le veut `CLAUDE.md`.
- **Ce qui a coûté** : dix minutes et un `git worktree` monté exprès. Le verdict
  annonçait « 1 POINT À REPRENDRE » sur la mesure « le billet ouvre la porte
  tout seul ». Mes modifications ne touchaient que du dessin ; il a fallu
  relancer la sonde sur un arbre propre pour écarter ma faute, puis la relancer
  sur le mien — où elle est passée. C'était un `waitForTimeout(3500)` sur un
  aller-retour réseau.
- **Combien de fois** : | pour celle-ci, mais le mal est générique : **une sonde
  qui attend une DURÉE au lieu d'attendre la CHOSE mesurée finit par rougir sur
  un logiciel intact**, et le coût ne se paie pas une fois — il se paie à chaque
  fois qu'on se demande si c'est sérieux.
- **Ce qui manque** : rien d'outillable ; la ligne est devenue un
  `waitForFunction` sur la disparition de la porte, avec `.catch` pour que la
  mesure CONSTATE l'échec au lieu d'arrêter la sonde. **La règle : dans une
  sonde, `waitForTimeout` ne doit jamais être ce qui décide qu'une mesure est
  prête.** Le dépôt en porte d'autres ; on les corrigera au fur et à mesure
  qu'elles se signaleront.

## Deux unités pour un même dessin, et la mesure qui ne les sépare pas — 2026-10-08

- **Ce que je voulais faire** : rapprocher le nom d'un point de son point, sur
  « lire un codage ». Rémy l'avait demandé une fois ; il a dû le redemander :
  « c'est encore bien éloigné le libellé du point dans le codage ».
- **Ce qui a coûté** : un aller-retour entier avec lui — le plus cher de tous.
  Ma correction rapprochait l'étiquette de 15 unités de figure à 11, et elle
  était juste À L'ÉCRAN, où la figure est dessinée à son échelle propre. Sur la
  FEUILLE, la figure se réduit pour entrer dans son bloc et la lettre, écrite
  en millimètres de page, ne se réduit pas : les deux grandeurs n'ont rien à
  voir. Sur la même page on lisait alors des lettres mordant sur leur croix
  (−0,7 px de blanc) et d'autres flottant à 5,6 px.
- **Combien de fois** : || — et la première, c'était l'inverse : le PDF
  dessinait un disque en dur là où l'écran suivait un réglage. Le motif commun
  est **deux systèmes d'unités dans un même dessin** ; chaque fois, la mesure
  faite dans l'un a dit que l'autre allait bien.
- **Ce qui manque** : une habitude de mesure, et je l'écris. **Quand un dessin
  vit dans deux systèmes d'unités, aucune mesure prise dans un seul des deux ne
  compte.** Concrètement : une grandeur que l'ŒIL doit lire — un blanc, un
  écart, une épaisseur — se compte dans les unités de ce qui est lu (la
  lettre), jamais dans celles de ce qui la porte (la figure). Et l'épreuve qui
  le garde doit confronter DEUX tailles de bloc : une seule est verte sur le
  défaut entier, je l'ai vérifié avec `epreuveTombe`.

## Un seul nombre non converti suffit à refaire le défaut — 2026-10-08

- **Ce que je voulais faire** : finir la correction ci-dessus, c'est-à-dire
  passer toutes les longueurs de `placerNoms` en unités de lettre.
- **Ce qui a coûté** : une épreuve rouge et dix minutes à comprendre pourquoi.
  J'avais converti l'écart, le demi-encombrement et le bord ; j'avais laissé
  `DEGAGE = 2`. Sur une feuille à UNE figure par page, ce 2 renvoyait la moitié
  des noms au tour suivant — 0,43 hauteur de lettre de blanc, contre 0,09 à
  quatre figures par page. Le défaut entier était revenu par la seule constante
  oubliée.
- **Combien de fois** : | — mais la forme est générale et elle reviendra à
  chaque conversion d'unités.
- **Ce qui manque** : rien d'outillable. La règle : **quand on change les
  unités d'une fonction, on les change pour TOUS ses nombres, et l'on relit la
  fonction entière à la recherche de ceux qu'on a laissés.** Ici, ce qui l'a
  trouvé n'est pas une relecture : c'est l'épreuve qui compare deux tailles de
  bloc. Une épreuve qui ne regarde qu'un cas ne voit pas un facteur d'échelle.

## On comptait les octets d'un PDF faute de pouvoir le regarder — 2026-10-08

- **Ce que je voulais faire** : vérifier, sur l'IMPRESSION, que le nom d'un
  point est bien contre son point. Rémy : « et pour l'impression aussi ! ».
- **Ce qui a coûté** : une demi-heure, et surtout un défaut qui a survécu à une
  correction. Toutes les sondes de fiches de ce dépôt téléchargent le PDF puis
  en comptent les octets et les segments — « 146 segment(s) · 30 Ko ». Utile,
  mais muet sur ce que Rémy voit. Je regardais donc l'APERÇU en croyant
  regarder la feuille. `pdftoppm` n'est pas installable ici ; j'ai commencé par
  lire le flux du PDF à la main, décompresser les `stream`, reconnaître les
  `m`/`l`/`Td`/`Tj` — vingt minutes pour des chiffres que je n'arrivais pas à
  rattacher aux bons objets.
- **Combien de fois** : |||| — chacune des quatre sondes de fiches écrites
  depuis une semaine a buté là-dessus, et chacune s'est rabattue sur « combien
  de segments ».
- **Ce qui manque** : c'est fait. `node tools/pdfEnImage.mjs <pdf> <png>
  [échelle] [page]` rend une page dans une toile avec `pdfjs-dist`, déjà
  présent pour l'aperçu, et la photographie. Deux secondes, et l'on REGARDE la
  feuille. La règle qui va avec : **compter les segments d'un PDF dit qu'il
  n'est pas vide, jamais qu'il est juste.**

## Deux portes vers le papier, et une seule portait la pancarte — 2026-10-09

- **Ce que je voulais faire** : comprendre pourquoi le poly de Rémy posait
  « |x − 3| se lit : ………… », alors qu'une garde existe depuis des semaines pour
  l'empêcher (`if (marche === 'lire' && ctx.papier)`).
- **Ce qui a coûté** : une demi-heure, et surtout trois défauts livrés à un
  professeur. `printParcours.js` a DEUX chemins vers le papier — `questionsDe`
  pour les exercices écrits, `grillesDe` pour ceux qui s'impriment en dessin —
  et seul le premier passait `papier: true`. Tout exercice déclarant un
  `printable` recevait donc sa question d'écran. La correction fait une ligne ;
  la trouver a demandé de REFAIRE son poly au navigateur, parce qu'aucune sonde
  du dépôt ne passe par là.
- **Combien de fois** : || — la seconde forme du même motif en deux jours. Hier,
  l'écran écrivait sa pointe de flèche en dur pendant que le papier la lisait
  dans le plan.
- **Ce qui manque** : une habitude, et une garde qui la tient. **Quand deux
  chemins mènent au même dehors, la garde ne vérifie pas l'un ni l'autre : elle
  les COMPTE.** `tests/polyDuParcours.test.mjs` ne nomme aucune fonction — elle
  compte les appels à `.generate(` dans le fichier et exige que chacun passe
  `papier: true`. Un troisième chemin la fera tomber le jour où on l'écrira.

## Un PDF ne se regardait pas : on en comptait les octets — 2026-10-09

- **Ce que je voulais faire** : vérifier les neuf points de la revue du poly.
- **Ce qui a coûté** : un défaut livré pendant des mois, et le pire de tous.
  `⩽` et `⩾` — ceux du programme français, que ce dépôt écrit partout —
  s'imprimaient « ? » : « x ⩾ 3 » sortait « x ? 3 ». En cherchant les autres :
  treize caractères perdus, dont ℕ ℤ ℚ ℝ (« ? — les rationnels ») et ∪ ∩ ∅ ∉
  (« I ∩ J » devenait « I ? J »). Rémy ne les a pas signalés ; il a signalé neuf
  autres choses, toutes moins graves.
- **Combien de fois** : |||| — les quatre sondes de fiches écrites cette semaine
  se sont toutes arrêtées à « 146 segment(s) · 30 Ko ». Un « ? » au milieu d'une
  inégalité ne casse rien : la feuille sort, elle a le bon nombre de lignes,
  toutes les épreuves sont vertes.
- **Ce qui manque** : c'est fait, et en deux morceaux.
  `node tools/pdfEnImage.mjs <pdf> <png> [échelle] [page]` rend une page en
  image (`pdfjs-dist` était déjà là pour l'aperçu, Chromium aussi) ;
  `node tools/caracteresPerdus.mjs` balaie le catalogue en mode papier et dit
  ce qui devient « ? ». La règle : **compter les segments d'un PDF dit qu'il
  n'est pas vide, jamais qu'il est juste.**

## L'accent grave, quinzième fois — et dans un `node -e` cette fois — 2026-10-09

- **Ce que je voulais faire** : écrire un commentaire citant `largeurFraction`
  entre accents graves, dans un fichier CSS, via `node tools/remplacer.mjs`.
- **Ce qui a coûté** : quatre mots avalés et un second passage pour les
  remettre. Le piège est connu — il a son hook, `tools/hooks/verifierSyntaxe.sh`
  — mais celui-ci ne voit que le JavaScript invalide. Ici le fichier restait
  valide : seuls les mots entre accents graves avaient disparu, parce que je
  construisais le fichier de paires dans un `node -e "…"` dont le corps est
  entre GUILLEMETS DOUBLES, où l'interpréteur exécute ce qui est entre accents
  graves. La même chose m'est arrivée dans un `cat <<'XEOF'` avec des `\uXXXX`,
  transformés en vrais caractères.
- **Combien de fois** : ||| dans la seule journée.
- **Ce qui manque** : la règle, que j'écris pour ne plus la chercher. **Un texte
  qui contient un accent grave ou une séquence `\u` ne passe par AUCUNE forme de
  ligne de commande** — ni `node -e "…"`, ni un heredoc. On l'écrit dans un
  fichier avec l'outil d'écriture, et l'on construit le fichier de paires à
  partir de ce fichier-là. `remplacer.mjs` ferme déjà le chemin du multiligne ;
  celui-ci reste ouvert parce qu'un texte d'une ligne a le droit de passer.

## Un `node -e "…"` est une ligne de commande comme une autre — 2026-10-10

- **Ce que je voulais faire** : poser un commentaire citant `enginePoserOperation`
  entre accents graves, et une chaîne contenant `${…}`, dans un fichier de
  paires pour `remplacer.mjs`.
- **Ce qui a coûté** : trois allers-retours dans la même journée. L'interpréteur
  exécute ce qui est entre accents graves ET substitue `${…}` à l'intérieur
  d'une chaîne entre GUILLEMETS DOUBLES — ce que `node -e "…"` est toujours. Le
  premier passage a avalé quatre mots d'un commentaire CSS sans rien casser
  (`node --check` se tait, le hook aussi) ; le troisième a rendu « bad
  substitution » et n'a rien écrit du tout.
- **Combien de fois** : |||| — et le dépôt a déjà un garde-fou pour la MÊME
  famille : `remplacer.mjs` refuse un texte multiligne sur la ligne de
  commande, précisément à cause des accents graves.
- **Ce qui manque** : l'élargissement de ce garde-fou, et je le note plutôt que
  de le faire au milieu d'une tâche. **La règle en attendant : dès qu'un texte
  contient un accent grave, un `$` ou une séquence `\u`, on l'écrit dans un
  fichier avec l'outil d'écriture, et le fichier de paires se construit à partir
  de CE fichier.** Jamais dans le corps d'un `node -e`, jamais dans un heredoc
  non plus — un `cat <<'EOF'` conserve les accents graves mais l'outil
  d'écriture, lui, transforme les `\uXXXX` en vrais caractères.

## Une garde qui emploie la fonction mesurée ne voit pas une mesure fausse — 2026-10-10

- **Ce que je voulais faire** : garder la règle « deux lettres d'une figure ne
  se posent jamais l'une sur l'autre ». La garde appelait `ecartDesLettres`,
  c'est-à-dire la fonction même dont le générateur se sert pour décider.
- **Ce qui a coûté** : un aller-retour complet. `epreuveTombe` a remis le vrai
  défaut d'origine — ne mesurer que les points DU CERCLE — et l'épreuve est
  restée VERTE : la règle et sa garde partageaient la même mesure, donc la
  garde ne pouvait pas voir que la mesure était fausse. Elle est repartie de
  `tracesDe`, c'est-à-dire de ce que l'écran dessine.
- **Combien de fois** : || — même famille que « une garde qui lit la source
  trouve son propre commentaire », notée hier. Les deux disent la même chose
  d'une autre manière : **une garde ne doit rien partager avec ce qu'elle
  garde.**
- **Ce qui manque** : rien d'outillable de plus — `epreuveTombe` a fait
  exactement son travail, et c'est la deuxième fois en deux jours qu'il
  rattrape une épreuve verte qui ne gardait rien. La règle est à écrire dans
  `CLAUDE.md` le jour où l'on y touche : **une épreuve qui importe la fonction
  qu'elle juge ne juge rien.**

## `epreuveTombe` disait « ta garde ne garde rien » quand le défaut ne compilait pas — 2026-10-10

- **Ce que je voulais faire** : remettre un défaut contenant `&&` depuis la
  ligne de commande.
- **Ce qui a coûté** : vingt minutes. Entre apostrophes, mon `\&\&` est arrivé
  tel quel dans le fichier : le module ne se chargeait plus, AUCUNE épreuve ne
  tournait, et l'outil annonçait « l'épreuve reste verte », c'est-à-dire « ta
  garde ne garde rien » — exactement le contraire de ce qui se passait. Le seul
  indice était le NOM DU FICHIER listé parmi les épreuves tombées, ce qui ne
  saute pas aux yeux.
- **Combien de fois** : | — mais c'est la même famille que les quatre marques
  de « un `node -e` est une ligne de commande comme une autre » : un texte qui
  part au shell revient abîmé, et le silence qui suit ressemble à une mesure.
- **Ce qui manque** : rien, c'est fait. `epreuveTombe` compte maintenant les
  épreuves VUES avant et après ; s'il en voit moins, il dit « le défaut remis
  empêche le fichier de tourner » et renvoie vers `--depuis`.

## Une règle de lisibilité qui ne connaît qu'une famille de points — 2026-10-10

- **Ce que je voulais faire** : rien. J'ai vu « B » posé sur « D » sur une
  capture prise pour mesurer autre chose.
- **Ce qui a coûté** : rien cette fois, et c'est tout l'intérêt de la noter. La
  règle existante mesurait un écart d'ANGLE entre points du cercle ; le second
  point d'une tangente n'est pas sur le cercle, donc il n'existait pas pour
  elle. Le même piège attend toute famille de tracé à venir.
- **Combien de fois** : || — « le label du point est loin du point » (2 octobre)
  était déjà une mesure prise dans le mauvais système de coordonnées.
- **Ce qui manque** : une habitude plus qu'un outil. **Quand une règle porte
  sur ce que l'œil voit, elle se mesure sur CE QUI EST DESSINÉ** — ici
  `tracesDe` —, jamais sur les paramètres qui ont servi à le dessiner. Les
  paramètres ne connaissent qu'une partie de la figure ; le dessin les connaît
  toutes, y compris celles qu'on ajoutera.

## Chaque sonde laissait vingt serveurs PHP derrière elle — 2026-10-10

- **Ce que je voulais faire** : lancer trois sondes de navigateur dans la même
  séance, puis comprendre pourquoi la machine ramait et pourquoi `npm test`
  mettait deux fois son temps.
- **Ce qui a coûté** : une demi-heure de lenteur inexpliquée. `fermer()` tuait
  le processus qu'elle avait lancé — `php tools/siteEssai.php` — mais celui-ci
  démarre un `php -S` qui a vingt ouvriers, et les ouvriers survivent à leur
  père. Compté : **60 `routeurEssai.php` vivants**, dont les plus vieux avaient
  quarante-deux minutes. Et la règle « jamais de `pkill -f` » rend le ménage
  pénible : il faut lister les PID et les tuer un par un.
- **Combien de fois** : | la première fois qu'on la NOMME, mais elle durait
  depuis que `sonde.mjs` existe — c'est-à-dire sous toutes les sondes du dépôt.
- **Ce qui manque** : rien, c'est fait. `sonde.mjs` lance le site en
  `detached` — il devient chef de son propre groupe de processus — et
  `fermer()` tue le GROUPE (`kill(-pid)`). C'est exact là où un motif est
  approximatif : son groupe, jamais celui d'une autre sonde. Vérifié : zéro
  processus laissé derrière après une sonde complète.

## Un défaut que j'ai cru trouver, et qui n'existait pas — 2026-10-10

- **Ce que je voulais faire** : corriger « ne parle pas de tangente pour le
  cercle ! ». J'ai listé trois endroits où la tangente entrait, et j'en ai
  **supposé un quatrième** : les propositions du mode « nommer », qui puisaient
  dans les neuf mots quelle que soit la série.
- **Ce qui a coûté** : un aller-retour, et il aurait coûté bien plus si
  `epreuveTombe` ne m'avait pas arrêté — l'épreuve que je venais d'écrire pour
  ce défaut restait VERTE avec l'ancien code remis. J'ai alors mesuré : sur 286
  questions d'une série de sixième, « une tangente » n'est proposée AUCUNE
  fois. `finalizeChoices` garde les quatre PREMIERS leurres, et la tangente est
  l'avant-dernière du vocabulaire.
- **Combien de fois** : || — même famille que « un commentaire qui cite une
  mesure QU'ON N'A PAS FAITE », notée hier. Hier j'inventais un chiffre,
  aujourd'hui un symptôme.
- **Ce qui manque** : rien de nouveau, et c'est le plus intéressant :
  `epreuveTombe` fait déjà ce travail. **Une épreuve qu'on écrit pour un défaut
  qu'on n'a pas vu de ses yeux doit être passée à `epreuveTombe` AVANT d'écrire
  la correction** — elle dit « ce défaut n'existe pas » aussi bien qu'elle dit
  « ta garde ne garde rien ». Je l'ai lancé après, par habitude ; le lancer
  avant aurait économisé la correction inutile.

## Une sonde de jeu qui perd parce que le jeu continue — 2026-10-10

- **Ce que je voulais faire** : mesurer un geste qui demande de garder le
  pointeur appuyé plusieurs secondes, dans un jeu où les ennemis continuent
  d'arriver.
- **Ce qui a coûté** : trois passages pour comprendre une sonde qui échouait
  une fois sur quatre. La partie se TERMINAIT pendant la mesure — cinq vies
  perdues pendant que le pointeur attendait —, et le jeu refusait alors tous
  les tirs. La sonde annonçait « la correction ne marche pas », ce qui était
  faux ; elle aurait dû annoncer « la mesure n'a pas eu lieu ».
- **Combien de fois** : || — même famille que « dans une sonde,
  `waitForTimeout` ne doit jamais décider qu'une mesure est prête ». Les deux
  disent : **une sonde doit savoir distinguer « c'est faux » de « je n'ai pas
  pu regarder »**.
- **Ce qui manque** : la forme à reprendre, et elle est maintenant écrite dans
  `tools/clicQuiBouge.mjs` — on REJOUE la mesure jusqu'à trois fois, on dit à
  quel essai elle a réussi, et l'on ne confond jamais un essai perdu avec un
  verdict. Baisser le seuil aurait été l'erreur : la mesure serait devenue
  facile et n'aurait plus rien mesuré.

## `epreuveTombe` dit aussi « ton ASSERTION est à l'envers » — 2026-10-11

- **Ce que je voulais faire** : garder une règle booléenne un peu subtile — un
  réglage mémorisé qui vaut dans un sens et pas dans l'autre.
- **Ce qui a coûté** : presque rien, et c'est pour cela que je la note. J'avais
  écrit deux assertions À L'ENVERS (`presentationMobile('desktop', true)`
  devait rendre `true`, j'avais écrit `false`). L'outil a répondu « L'ÉPREUVE
  EST DÉJÀ ROUGE avant qu'on touche à quoi que ce soit », ce qui est un
  troisième message, distinct des deux autres : ni « ta garde ne garde rien »,
  ni « ton défaut ne compile pas », mais **« ce que tu crois attendre n'est pas
  ce que tu as écrit »**.
- **Combien de fois** : ||| — troisième entrée de la famille en deux jours, et
  les trois disent la même chose sous un angle différent : on ne croit pas une
  épreuve qu'on n'a pas vue tomber.
- **Ce qui manque** : rien. Mais la règle mérite d'être dite une fois pour
  toutes : **quand l'épreuve porte sur une règle asymétrique, on l'écrit
  d'abord en COMPARANT les deux cas** (`assert.notEqual(a, b)` sur le grand
  écran, `assert.equal(a, b)` sur le téléphone) plutôt qu'en fixant deux
  valeurs. Une comparaison ne peut pas s'inverser en silence ; deux constantes,
  si.

## Quinze tirages sans graine, et l'un d'eux tombe un jour sur vingt — 2026-10-11

- **Ce que je voulais faire** : committer une correction du menu sur téléphone.
  `npm test` est revenu avec UNE épreuve rouge, dans un fichier que je n'avais
  pas touché : « LA CASCADE DESCEND JUSQU'AU NOMBRE SEUL ».
- **Ce qui a coûté** : un quart d'heure, et surtout un doute — *est-ce moi ?*
  La cause : `makeRng()` SANS graine, donc un tirage neuf à chaque exécution.
  Ce jour-là il a sorti « −(−8 + 2 × 4) », dont le résultat est **moins zéro**,
  et `assert.equal` distingue `0` de `-0` là où plus rien d'autre ne le fait
  (`String(-0)` écrit « 0 »). L'épreuve avait tort, pas le logiciel.
- **Combien de fois** : | pour celle-ci, mais **quinze tirages sans graine dans
  sept fichiers** (`axeSurLaFiche`, `enqueteSurLaFiche`, `mosaiqueSurLaFiche`,
  `opposeSurLaFiche`, `poserFiche`, `serpentsSurLaFiche`, `treflesSurLaFiche`).
  Chacun est une loterie du même genre.
- **Ce qui manque** : surtout PAS des graines fixes — c'est le tirage libre qui
  a trouvé ce cas, et un tamis vaut mieux qu'un exemple. Ce qui manque, c'est
  que **l'échec dise SUR QUOI il est tombé**. `makeRng()` porte déjà sa graine
  (`rng.seed`) : il suffit que le message la cite, et l'échec devient
  rejouable au lieu d'être une rumeur. Fait pour `opposeSurLaFiche` ; les six
  autres fichiers attendent, et c'est un bon lot pour `/distill`.

## Un réglage dans un repli fermé se mesure « visible » — 2026-10-12

- **Ce que je voulais faire** : cocher « Champs remplissables » dans le panneau
  d'impression d'un poly, avec Playwright, pour compter les champs du PDF.
- **Ce qui a coûté** : une heure. Playwright a refusé la case trente secondes
  (« element is not visible »), puis l'étiquette trente secondes de plus ; en
  forçant, il a répondu « Clicking the checkbox did not change its state ».
  J'ai cru l'outil fautif, **parce que ma propre mesure disait le contraire** :
  la case rend `display: block`, `visibility: visible`, `opacity: 1` et un
  rectangle de 13 × 13 à une position plausible — **alors qu'elle est dans un
  `<details>` FERMÉ**. Le rectangle non vide plus le style calculé, c'est-à-dire
  la façon dont tout le dépôt répond à « est-ce visible ? », donne un FAUX
  POSITIF sous un repli fermé. Ce qui a tranché en une ligne :
  `document.elementFromPoint` au centre, qui a désigné l'aperçu derrière le
  panneau.
- **Combien de fois** : || — deux fois dans la même heure, sur deux replis
  différents (`#pp-plus` pour le poly, « Sur quel papier » pour la fiche).
- **Ce qui manque** : *fait* — `sonde.deplier(selecteur)` clique le `<summary>`
  du repli qui contient le réglage, et jette si le repli ne s'ouvre pas. Reste
  la leçon générale : **une mesure de visibilité doit regarder
  `closest('details:not([open])')`**, sinon elle ment.

## « Zéro champ » peut vouloir dire « pas de QCM sur cette feuille » — 2026-10-12

- **Ce que je voulais faire** : vérifier que les QCM imprimés portent de vraies
  cases à cocher dans le PDF, comme Rémy l'a demandé.
- **Ce qui a coûté** : trois quarts d'heure et deux fausses pistes. La sonde
  lisait « 0 case à cocher » et j'ai cherché le défaut dans `champCoche` —
  deux fois. Il n'y en avait pas. (1) Le poly n'imprime les propositions que si
  « Proposer les réponses » est coché : sans elles, un QCM s'imprime en
  question ouverte. (2) L'exercice choisi, `mes-perimetre-qcm`, s'imprime par
  la porte des GRILLES et ne pose jamais de propositions — **un QCM à l'écran
  n'est pas un QCM sur le papier**.
- **Combien de fois** : ||| — c'est la troisième fois ce mois-ci qu'une mesure
  répond « c'est cassé » là où il fallait lire « je ne regarde pas la bonne
  feuille » (déjà : `#fq-champs` sur la fiche d'un exercice seul, qui n'en a
  pas).
- **Ce qui manque** : une sonde qui, quand elle compte ZÉRO, dise d'abord
  **ce qu'elle a trouvé à la place** — ici « 0 proposition imprimée », qui
  aurait désigné la cause en une seconde. Un zéro sans contexte est
  indiscernable d'un logiciel cassé, exactement comme un sélecteur inventé
  avant `doitExister`.

## Une correction posée sur un cas « auto » ne mord sur rien — 2026-10-12

- **Ce que je voulais faire** : arrondir le nombre de grilles d'un poly au
  multiple du nombre de colonnes, pour supprimer les derniers rangs à moitié
  vides que Rémy signale (« 6 calculs pour 4 colonnes, c'est idiot »).
- **Ce qui a coûté** : la correction a été écrite, relue, commentée — et elle
  ne faisait RIEN pour le cas cité. Elle lisait `Number(colonnes[stepId])`, or
  ce réglage vaut la chaîne `'auto'` pour presque tous les exercices, et
  l'exercice de Rémy en fait partie. `Number('auto')` est `NaN`, la condition
  tombait, la boucle passait son chemin. Vu seulement en REGARDANT la feuille.
- **Combien de fois** : | (mais la famille est connue : une correction qui ne
  s'exécute jamais ressemble en tout point à une correction qui marche).
- **Ce qui manque** : la règle, déjà écrite dans `CLAUDE.md` à propos de
  `epreuveTombe`, vaut aussi pour les corrections de mise en page — **remettre
  le défaut et voir la feuille changer**. Ici, deux images suffisaient.

## Un tableau de bord qui ne lit que le PREMIER de chaque groupe — 2026-10-12

- **Ce que je voulais faire** : savoir quels exercices posent des champs
  remplissables, pour équiper ceux qui le peuvent (demande de Rémy).
- **Ce qui a coûté** : vingt minutes de recherche d'un défaut qui n'existait
  pas. `tools/champsRemplissables.mjs` affichait « repere — AUCUN CHAMP » alors
  que « Lire des Coordonnées » en posait vingt-quatre : il imprimait
  `l[0].poses`, le compte du PREMIER exercice du rendu, pour le rendu entier.
  Son voisin « Placer un Point » — qui n'en pose aucun, et ne le DOIT pas —
  passait en premier dans le catalogue.
- **Combien de fois** : | (mais la famille est connue : un agrégat qui prend un
  représentant au lieu du maximum, et qui ne dit pas qu'il l'a fait).
- **Ce qui manque** : *fait* — l'outil affiche maintenant le compte de chacun
  et ajoute « mais pas pour tous » quand ils diffèrent. La règle générale :
  **un tableau de bord qui groupe doit dire ce qu'il a fait des membres du
  groupe.** Déclarer mort un exercice vivant fait chercher un défaut ailleurs.

## Trois copies du même faux jsPDF, et l'une d'elles était fausse — 2026-10-12

- **Ce que je voulais faire** : mesurer, sans navigateur, ce que les rendus de
  fiche font de leurs arguments.
- **Ce qui a coûté** : deux rendus sur quatre-vingts sortaient « pas
  mesurables » — `Cannot read properties of undefined (reading 'fontName')` —
  c'est-à-dire que l'outil déclarait inconnu un rendu parfaitement sain,
  faute d'une méthode (`getFont`) dans SA copie du faux jsPDF. Il y en avait
  trois : deux outils et une épreuve, écrites à trois moments différents.
- **Combien de fois** : ||| — trois copies, donc trois occasions de diverger,
  et la divergence s'est produite dès la troisième.
- **Ce qui manque** : *fait* — `tools/fauxPdf.mjs`, importé par les deux outils
  et l'épreuve. La leçon vaut au-delà : **un double de l'environnement
  (navigateur, PDF, horloge) ne se recopie pas, il se partage** — sinon chaque
  copie ment à son tour, et toujours en silence.

## Un réglage absent ne ressemble pas à un défaut — 2026-10-12

- **Ce que je voulais faire** : équiper tous les exercices qui peuvent porter
  un champ remplissable, comme Rémy l'a demandé.
- **Ce qui a coûté** : rien de plus ce jour-là, mais cinquante-neuf rendus
  posaient depuis des heures des champs que l'une des TROIS portes vers le
  papier ne demandait jamais — la fiche d'un exercice seul n'avait pas de case
  « Champs remplissables ». Le code était juste, le réglage n'existait pas.
  **Aucune épreuve ne pouvait le voir** : le rendu pose bien ses champs quand
  on les lui demande, et l'outil de balayage appelle le rendu directement.
- **Combien de fois** : || — même forme que « on mesurait une porte que Rémy
  n'emprunte pas » (le 12 octobre au matin, `#fq-champs` cherché sur la fiche
  d'une grille). Les trois portes vers le papier sont un piège régulier.
- **Ce qui manque** : une mesure qui parte des TROIS portes plutôt que du
  rendu. `tools/grilleSeuleRemplissable.mjs` couvre la troisième ; les deux
  autres sont couvertes par `champsSurLeVraiPdf.mjs` et `polyDu12Octobre.mjs`.
  La règle à retenir : **quand un réglage commande une fonctionnalité, la
  mesurer en appelant la fonctionnalité ne dit rien du réglage.**

## Un balayage qui ne regarde qu'une des deux portes — 2026-10-12 (soir)

- **Ce que je voulais faire** : vérifier trois corrections de feuille en les
  REGARDANT. Sur l'image, « |x − 2| = 1 » s'imprimait « |x " 2| = 1 » : le
  moins typographique sortait en guillemet, et les graduations « −1 » aussi.
- **Ce qui a coûté** : rien à trouver — l'image l'a montré. Ce qui coûte, c'est
  que `tools/caracteresPerdus.mjs` existe POUR ÇA et répondait « AUCUN
  CARACTÈRE PERDU ». Il tire les QUESTIONS en mode papier ; ces textes-là sont
  fabriqués par le RENDU de grille, après le générateur. Un outil qui dit
  « tout va bien » sur la moitié du sujet est pire qu'un outil absent : on ne
  le relance pas.
- **Combien de fois** : ||| — c'est la troisième fois ce mois-ci qu'une mesure
  ne couvre qu'une des deux ou trois portes vers le papier (la case
  « remplissable » absente de la fiche d'un exercice seul, `#fq-champs` cherché
  sur une grille, et maintenant les caractères).
- **Ce qui manque** : *fait* — une épreuve qui lit ce que CHAQUE rendu de
  grille écrit (`tests/feuillesDu12OctobreSoir.test.mjs`) et refuse un
  caractère hors Latin-1 que `pourPdf` aurait remplacé. Elle a trouvé un second
  fautif que personne n'avait signalé : l'opérateur de l'Approxdoku.
  **La règle : un balayage doit nommer les portes qu'il n'emprunte pas.**

## Deux fois de suite, une épreuve neuve trop large — 2026-10-12 (soir)

- **Ce que je voulais faire** : garder la règle « aucun rendu n'écrit un
  caractère que le PDF ne sait pas ».
- **Ce qui a coûté** : deux écritures fausses avant la bonne, et les deux
  accusaient du code sain. (1) « ce texte diffère-t-il de `pourPdf(texte)` ? »
  attrapait l'espace fine devant un « ? » — de la typographie, pas une police.
  (2) « ce caractère sort-il du Latin-1 ? » accusait le tiret cadratin et les
  points de suspension, que l'encodage WinAnsi d'un PDF porte très bien.
  Le critère juste tient les deux bouts : **hors Latin-1 ET remplacé par
  `pourPdf`**.
- **Combien de fois** : || — même famille que « l'épreuve ne garde rien », mais
  à l'envers : celle-ci gardait TROP, et une épreuve qui crie sur du code sain
  finit par être désactivée.
- **Ce qui manque** : le réflexe, pas un outil. `epreuveTombe` répond à « cette
  épreuve garde-t-elle quelque chose ? » ; il ne répond pas à « accuse-t-elle
  autre chose que ce qu'elle vise ? ». **Quand une épreuve neuve ROUGIT sur du
  code qu'on n'a pas touché, lire ce qu'elle accuse avant de corriger le code.**

## Le même défaut, le même mois, l'autre exercice — 2026-10-13

- **Ce que je voulais faire** : corriger « les retenues font des ovales », que
  Rémy signale pour la DEUXIÈME fois.
- **Ce qui a coûté** : rien à chercher — la cause était écrite noir sur blanc
  dans le commentaire de la correction précédente, et `poserLongue.js`
  déclarait déjà `btn-carre` sur ses ronds depuis le 8 octobre. C'est
  `poserOperation.js` qui ne l'avait pas reçue. **Une correction posée sur un
  seul des chemins qui mènent au même endroit ne ferme rien** : sixième fois.
- **Combien de fois** : |||||| — et celle-ci est la plus nette, puisque les
  deux fichiers portent le même objet sous deux noms (`pl-rond`, `po-rond`).
- **Ce qui manque** : *fait* — `tools/boutonsEtires.mjs` ouvre les
  quatre-vingts activités sur un téléphone de 390 × 844 et mesure CHAQUE
  bouton de la couche de jeu : 1 902 mesurés, et il a trouvé tout seul un
  second fautif que personne n'avait vu (les facteurs cliquables d'un produit
  posé, 18 × 44 px). La règle générale : **quand une correction porte sur une
  CLASSE d'objets, ne pas corriger l'objet — balayer la classe.**

## Une règle de mesure écrite trois fois avant d'être juste — 2026-10-13

- **Ce que je voulais faire** : que `boutonsEtires` dise « ceci est un ovale ».
- **Ce qui a coûté** : deux balayages complets pour rien (vingt minutes
  chacun). (1) « rayon ≥ la moitié du PETIT côté » : 117 fautifs, dont tous les
  boutons en GÉLULE du dépôt — « Un indice », « Montre-moi », « Vérifier » —
  qui sont ronds par le rayon et trois fois plus LARGES que hauts. (2) rayon
  sur le petit côté encore : le chiffre « 3 » d'une ligne de calcul,
  18 × 25 px avec 10 px de rayon, déclaré ovale alors qu'il a la forme d'un
  chiffre. La bonne règle tient deux bouts : **rayon mesuré sur le GRAND côté**
  (seuls un cercle et une gélule passent) **et plus haut que large d'un quart
  au moins** (le plancher étire la hauteur, jamais la largeur).
- **Combien de fois** : ||| — troisième outil de mesure ce mois-ci dont la
  première écriture accusait du code sain (les caractères perdus, deux fois).
- **Ce qui manque** : le réflexe, et il commence à se dessiner. **Un critère
  neuf se teste d'abord sur ce qu'on SAIT bon**, pas seulement sur le défaut
  qu'on vient de voir : si la règle crie sur dix objets sains, elle sera
  désactivée avant d'avoir servi.

---

**Une mesure de mise en page répond toujours, même quand elle regarde le mauvais bord**
— 13 octobre 2026

- *Ce que je voulais faire* : vérifier que mon correctif rendait les sept
  colonnes du tableau de numération égales **sans** faire déborder le tableau.
- *Ce qui a coûté* : trois tours de sonde et deux correctifs écrits pour rien.
  La sonde comparait le bord droit du tableau à celui de son cadre et répondait
  « 0 px » à chaque essai — donc « tout va bien » — alors que le tableau
  dépassait de l'écran de 16,6 px. Le cadre fait `width: 100 %` : il ne grandit
  pas avec son contenu, et un enfant plus large que lui a donc **le même bord
  droit** dès qu'il le remplit à ras. La mesure disait « ils se touchent », et
  je lisais « il y a la place ». C'est `s.photo` — qui, lui, découpe la page et
  dit ce qui MANQUE — qui a fini par le signaler.
- *Combien de fois* : || — deuxième fois ce mois-ci qu'une mesure de mise en
  page renvoie un chiffre plausible sur le mauvais référentiel (la première :
  un réglage dans un `<details>` fermé, mesuré « visible », 13 × 13 px).
- *Ce qui manque* : une sonde qui, pour « est-ce que ça déborde ? », remonte
  d'elle-même la lignée jusqu'au premier ancêtre qui DÉFILE (`scrollWidth >
  clientWidth`) et le nomme, au lieu de croire le parent immédiat.
  `tools/tmp/cadreDuTableau.mjs` le fait en quinze lignes et a trouvé le
  coupable — `.np-outil`, 401,6 px dans un plateau de 390 — en une exécution.
  Il mériterait d'entrer dans `tools/sonde.mjs` sous le nom `s.deborde(sel)`.

---

**Un motif d'épreuve qui cherche `width` trouve `max-width`** — 13 octobre 2026

- *Ce que je voulais faire* : garder, par une épreuve sur la feuille de style,
  que le panneau du tableau déclare bien `width` et non `max-width` — les deux
  ne donnent pas le même résultat, et la différence est invisible à l'œil.
- *Ce qui a coûté* : deux passages de `epreuveTombe.mjs`. `/\bwidth\s*:/`
  trouve `width` **dans** `max-width` : le tiret compte comme une frontière de
  mot. L'épreuve restait donc verte sur le défaut même qu'elle devait attraper,
  et `epreuveTombe` a dit « CETTE ÉPREUVE NE GARDE RIEN ». Dans le même
  fichier, `/\bcqi\b/` ne trouvait **pas** `2.7cqi` — pas de frontière entre un
  chiffre et une lettre — et l'épreuve tombait cette fois sur du code sain.
  Le même `\b` s'est trompé deux fois dans les deux sens en dix minutes.
- *Combien de fois* : || — déjà rencontré sur les jetons de couleur.
- *Ce qui manque* : un petit `declare(corps, propriété, valeur)` partagé plutôt
  qu'un motif réécrit à la main dans chaque épreuve de feuille de style. Il est
  écrit dans `tests/colonnesDuTableau.test.mjs` ; il devrait vivre dans un
  module commun aux épreuves de CSS, avec `corpsDeLaRegle(sélecteur)` — qui
  ferme l'autre moitié du piège : chercher une déclaration **n'importe où**
  dans un fichier de 2 000 lignes ne garde rien, `width: 100%` s'y trouve
  quarante fois.

---

**Trois mesures justes et un défaut intact : la dimension qu'on n'a pas fait varier**
— 13 octobre 2026

- *Ce que je voulais faire* : reproduire ce que montrait la capture de Rémy —
  la jauge du contre-la-montre passant entre les deux lignes de la question.
- *Ce qui a coûté* : trois sondes successives, toutes correctes, toutes
  muettes. J'ai fait varier la LARGEUR (320, 390, 768, 1280), puis le mode
  d'aperçu (aucun, mobile, tablette), et conclu chaque fois « la question ne
  chevauche pas le compteur ». Les trois avaient 844 px de hauteur de fenêtre,
  parce que c'est ce qu'écrit `ouvrirSonde` quand on lui donne un téléphone.
  Or Rémy regardait un parcours en aperçu : les barres du professeur lui
  mangeaient près de 300 px, et le défaut n'apparaît qu'à 440 px de haut. La
  quatrième sonde, la seule à faire varier la hauteur, l'a eu du premier coup.
- *Combien de fois* : || — la page qui déborde et la question tranchée ont la
  même forme : un correctif jugé bon parce que la mesure n'a pas visité le
  régime où il casse.
- *Ce qui manque* : un réflexe, et il s'écrit en une phrase. **Quand une
  capture d'écran montre un défaut qu'on ne reproduit pas, la première chose à
  faire varier est ce que la capture a de PLUS DIFFÉRENT de la sonde** — ici,
  Rémy avait trois barres au-dessus du jeu et je n'en avais aucune. Un
  `ouvrirSonde({ hauteurUtile })` qui simule les barres du professeur, ou
  simplement une sonde qui balaie deux ou trois hauteurs quand la première ne
  reproduit rien, aurait fait l'économie de trois tours.

---

**« Une épreuve neuve se voit échouer » ne valait pas pour le harnais PHP** — 13 octobre 2026

- *Ce que je voulais faire* : vérifier que les onze vérifications neuves de
  `tools/testApi.php` gardaient bien quelque chose.
- *Ce qui a coûté* : `tools/epreuveTombe.mjs` ne savait lancer que
  `node --test`. Les gardes de l'API — un tiers des épreuves du dépôt —
  étaient donc crues sur parole, ou vérifiées à la main avec un script jeté
  après usage. C'est la troisième fois que j'écris ce script. Cette fois il a
  servi tout de suite : sur trois défauts remis, **un ne faisait pas tomber
  l'épreuve**, et le commentaire que j'avais écrit à côté affirmait un
  mécanisme FAUX (« un code en minuscules n'aurait laissé entrer personne » —
  `/login` compare après `strtoupper`, donc si).
- *Combien de fois* : ||| — et l'outil manquait depuis le début.
- *Ce qui manque* : plus rien. `epreuveTombe.mjs` reconnaît maintenant un
  fichier `.php` à son extension, le lance avec `php`, et lit « ✓ nom » et
  « · nom » là où il lisait du TAP. Le reste de l'outil — exiger une seule
  occurrence, exiger la chute, remettre le fichier quoi qu'il arrive — n'a pas
  bougé.

---

**Un crochet neuf non inscrit chez le répartiteur échoue en silence** — 13 octobre 2026

- *Ce que je voulais faire* : ajouter un bouton « renommer » dans l'espace
  classes.
- *Ce qui a coûté* : une sonde complète, écrite puis relancée trois fois. Le
  bouton s'affichait parfaitement — 79 × 25 px, la bonne infobulle, les bons
  attributs, que la sonde LISAIT — et le clic ne faisait rien. L'espace
  classes n'écoute pas les boutons un par un : un gestionnaire remonte au
  `closest()` d'une liste de cinquante crochets écrite à la main. Le mien n'y
  était pas, et `if (!el) return;` sort sans erreur, sans message, sans trace.
  Le symptôme — « tout a l'air juste et rien ne se passe » — est le plus cher
  à diagnostiquer du dépôt.
- *Combien de fois* : | — mais il se reproduira à chaque bouton ajouté là-bas.
- *Ce qui manque* : plus rien. `tests/crochetsDeLEspaceClasses.test.mjs`
  compare les crochets posés sur un bouton à ceux que les répartiteurs
  écoutent. Il a fallu deux essais pour l'écrire — « le premier `closest()` »
  n'en lisait qu'un, « celui qui en porte le plus » accusait deux crochets
  sains écoutés par un second gestionnaire : c'est leur UNION qu'il faut lire.

---

**Une sonde qui ne distingue pas « caché » de « qui défile » accuse une décision déjà prise**
— 13 octobre 2026

- *Ce que je voulais faire* : vérifier que le tableau à double entrée ne
  débordait plus, après avoir réparé sa troncature verticale.
- *Ce qui a coûté* : un correctif écrit, appliqué, mesuré — et inutile. La
  sonde comparait le bord droit du tableau à celui de son cadre et criait
  « SORT À DROITE » sur 26 px. Or le jeu pose `[data-table] { overflow-x:
  auto }` : le tableau DÉFILE dans sa boîte, et c'est une décision écrite,
  commentée et mesurée au-dessus (« la colonne coupée est celle des TOTAUX »).
  J'ai ajouté un bloc `@container` qui la doublait — et qui ne faisait même
  rien, placé plus haut dans la feuille donc écrasé par l'existant. Trois
  mesures pour m'en apercevoir, dont une qui montrait `min-width: 2.4em` ET
  `min-width: 2.9em` dans la même feuille.
- *Combien de fois* : || — même forme que le « hors cadre : 0 px » du tableau
  de numération ce matin : la mesure répond, le chiffre est juste, et il ne
  parle pas du problème.
- *Ce qui manque* : deux réflexes, et le second est le plus cher.
  **(1)** Pour « est-ce que ça déborde ? », distinguer toujours *caché sans
  recours* de *atteignable par un défilement* — ce ne sont pas le même défaut,
  et le second est souvent une décision.
  **(2)** **Avant d'écrire une règle dans la feuille d'un jeu, lire la feuille
  en ENTIER.** Celle-ci fait deux cents lignes et portait déjà un bloc pour
  écran étroit, trente lignes plus bas. Un `grep` de la propriété qu'on
  s'apprête à poser (`min-width`, ici) l'aurait montré en une seconde.

---

**La feuille d'un jeu bat celle du dépôt, et mes essais injectés ne mesurent rien**
— 13 octobre 2026

- *Ce que je voulais faire* : essayer trois correctifs dans le navigateur avant
  d'en écrire un, comme d'habitude — un `<style>` posé dans `<head>`, et l'on
  compare.
- *Ce qui a coûté* : trois tours pour rien, sur deux jeux différents le même
  jour. Les jeux injectent leur feuille DANS leur conteneur
  (`this.container.innerHTML = '<style>…'`), donc plus bas dans le document que
  tout ce qu'on ajoute à `<head>` : à spécificité égale, c'est la leur qui
  gagne, et l'essai mesure l'état d'avant en croyant mesurer l'état d'après.
  Les verdicts étaient « aucun changement », ce qu'on lit volontiers comme
  « ce correctif ne sert à rien ».
- *Combien de fois* : ||| — deux fois sur le tableau à double entrée, une sur
  Relie les points.
- *Ce qui manque* : que `ouvrirSonde` sache poser une feuille d'essai QUI
  GAGNE — un `s.essayerCss(regles)` qui insère le style à la fin du conteneur
  du jeu, après la sienne, plutôt qu'en tête de document. En attendant,
  `!important` sur chaque déclaration d'essai fait l'affaire, et il faut y
  penser à chaque fois.

---

**Un essai qui refuse de s'appliquer peut avoir raison** — 13 octobre 2026

- *Ce que je voulais faire* : resserrer cinq boutons qui prennent 144 px de
  haut dans un jeu, pour rendre de la place à la grille.
- *Ce qui a coûté* : rien, et c'est tout l'intérêt de la note. L'essai n'a pas
  marché : `min-height: 40px` sur `.rp-btn` était battu par
  `#game-layer button:not(…)`, qui porte un ID. J'ai d'abord cherché pourquoi
  « mon correctif ne prend pas » — réflexe normal — avant de voir que cette
  règle-là est le PLANCHER TACTILE de 44 px, et que son contournement est
  exactement ce qui a produit les ovales que Rémy a signalés deux fois ce
  mois-ci. La feuille de style défendait une décision prise.
- *Combien de fois* : | — mais le réflexe vaut d'être écrit.
- *Ce qui manque* : rien d'outillable. Une phrase, plutôt : **quand une règle
  refuse de s'appliquer, lire CELLE QUI GAGNE avant de forcer.** Elle dit
  souvent pourquoi.

---

**Un attribut `data-` qui sert de PORTEUR DE VALEUR n'est pas un crochet d'action**
— 13 octobre 2026

- *Ce que je voulais faire* : brancher un double-clic sur les trois cellules
  modifiables d'une ligne d'élève, en cliquant le bouton correspondant plutôt
  qu'en réécrivant les fenêtres.
- *Ce qui a coûté* : une sonde complète. `querySelector('[data-' + champ + ']')`
  est élégant et faux : `data-prenom` existait déjà sur DEUX boutons de la
  ligne, où il PORTE le prénom pour le titre de la fenêtre. Un double-clic sur
  le prénom trouvait donc « renommer » et ouvrait la fenêtre de l'identifiant.
  Le symptôme est trompeur — une fenêtre S'OUVRE, tout a l'air de marcher, et
  c'est la mauvaise.
- *Combien de fois* : || — ce fichier mélange les deux usages de `data-` un peu
  partout (`data-prenom`, `data-etat`, `data-poste-code` portent des valeurs ;
  `data-code`, `data-retirer` déclenchent des actions).
- *Ce qui manque* : une convention, et elle coûterait une heure à poser : les
  porteurs de valeur prennent un préfixe (`data-v-prenom`), les crochets
  d'action gardent le nom nu. En attendant, **ne jamais composer un sélecteur
  de crochet par concaténation** — l'écrire en toutes lettres, où un humain le
  relit.

---

**Une sonde qui recopie le code qu'elle mesure ne mesure que la recopie** — 13 octobre 2026

- *Ce que je voulais faire* : vérifier qu'une opération posée ne comptait plus
  que pour une question, après avoir marqué l'alignement `partiel`.
- *Ce qui a coûté* : trois tours. Pour simuler l'alignement, j'avais RECOPIÉ
  dans la sonde la charge que le jeu envoie — `onCorrectAnswer(null, …, {…})`,
  les mêmes lignes, sans le `partiel` que je venais d'ajouter. Le correctif
  était en place et la sonde continuait d'annoncer le défaut, fidèlement : elle
  mesurait MA charge. Puis, en passant par la vraie méthode, j'ai cassé l'état
  du jeu (`jeu.pose = {}`) et `finir()` est mort en redessinant.
- *Combien de fois* : || — même forme que la « duplication de l'environnement »
  déjà notée : on recopie un bout du système pour l'observer, et l'on observe
  la copie.
- *Ce qui manque* : la discipline tient en une phrase. **Une sonde appelle les
  méthodes du code, jamais son contenu recopié, et ne touche JAMAIS à son
  état.** Quand on ne sait pas quels arguments passer — ici le couple
  `rang` / `chiffrePris`, dont la convention n'est écrite nulle part — on les
  CALCULE depuis les données du jeu, ou on essaie chaque possibilité : trois
  millisecondes, et aucune supposition.

---

**J'écris des dangers que je n'ai pas mesurés, et je les commente avec aplomb**
— 13 octobre 2026

- *Ce que je voulais faire* : écrire un générateur qui compose un décimal à
  partir de ses chiffres plutôt que par une division.
- *Ce qui a coûté* : rien en temps — et c'est pour cela qu'il faut le noter.
  Le commentaire affirmait « 305 / 100 vaut 3.0500000000000003 sur une
  machine », un nombre que je n'ai JAMAIS calculé. C'est faux : 305/100 est
  exact, et l'essai exhaustif sur les 300 000 numérateurs du domaine donne
  zéro divergence. J'avais aussi écrit une épreuve pour garder ce danger : elle
  ne gardait rien, et `epreuveTombe` l'a dit.
- *Combien de fois* : ||| — troisième fois ce mois-ci qu'un commentaire
  affirme un mécanisme déduit : « les neuf mots servent de leurres », « un code
  en minuscules n'aurait laissé entrer personne », et celui-ci. Les trois
  étaient faux, et les trois étaient écrits du ton de quelqu'un qui a mesuré.
- *Ce qui manque* : pas un outil — une règle d'écriture. **Un commentaire qui
  cite un nombre doit citer un nombre OBTENU.** Quand on veut écrire « sinon il
  se passerait X », on ouvre un terminal : `node -e` coûte dix secondes, et
  c'est le prix de la différence entre une mesure et une légende. Si l'on n'a
  pas mesuré, on écrit « par précaution » et on le dit.

---

**Une garde qui regarde la FORME laisse passer le fichier à moitié corrigé**
— 13 octobre 2026

- *Ce que je voulais faire* : garder d'un seul coup les huit jeux qui
  comptaient une question de trop par manche.
- *Ce qui a coûté* : une épreuve écrite, verte, et qui ne gardait qu'un peu
  plus de la moitié de ce qu'elle annonçait. Son critère était « un fichier qui
  déclare plusieurs réussites sans marquer AUCUNE étape » — élégant, et aveugle
  au cas de « Rédiger un raisonnement », dont trois déclarations se comptaient
  comme trois rédactions et dont une seule a été marquée. `epreuveTombe` l'a
  dit en refusant de tomber : le fichier avait désormais une étape marquée,
  donc il sortait du critère.
- *Combien de fois* : || — même forme que le critère « au moins 2 champs et un
  nombre pair », qui restait vert avec un champ par point.
- *Ce qui manque* : un réflexe, et il se formule en une question. **Quand une
  garde se fonde sur « au moins un », demander ce qu'elle dit du cas « un sur
  trois ».** Ici il a fallu lui adjoindre une liste nommée — pour chaque jeu
  corrigé, COMBIEN de déclarations doivent rester pleines. Moins élégant,
  mais c'est la liste qui attrape les huit, pas le critère.

---

**Une règle écrite deux fois ne se corrige qu'une** — 13 octobre 2026

- *Ce que je voulais faire* : masquer les trois boutons d'aperçu sur un écran
  étroit, comme Rémy l'a tranché.
- *Ce qui a coûté* : une sonde pour découvrir que **la moitié visible du travail
  était faite depuis longtemps** — les boutons portent `desktop-only` et
  `body.mobile-view` les efface : zéro bouton visible, mesuré. Mais le cadre
  s'appliquait toujours : `cadreDe()` rendait `'mobile'`, et `#game-layer`
  faisait 400 px dans un écran de 390. La cause : `ui/builder.js` et
  `games/engine.js` écrivaient LA MÊME RÈGLE, à un garde-fou près — et seule la
  copie que j'avais sous les yeux, des semaines plus tôt, l'avait reçu. L'autre
  sert le chemin que Rémy emprunte le plus souvent.
- *Combien de fois* : ||| — le même motif que « la correction d'alors était
  juste ; elle avait été posée sur UN des deux chemins » (les ovales de
  retenue, signalés deux fois), et que `data-prenom` porté par deux boutons.
- *Ce qui manque* : une épreuve qui garde l'UNICITÉ et non la valeur. Celle du
  cadre lit maintenant les 400 fichiers de `js/` et refuse qu'un module décide
  du cadre à partir de `previewDeviceMode` hors du noyau. **Quand on corrige une
  règle, chercher d'abord si elle est écrite ailleurs** — avant d'écrire la
  correction, pas après.

---

**Une sonde qui ne mesure rien répond « tout va bien »** — 13 octobre 2026

- *Ce que je voulais faire* : vérifier qu'aucun exercice du catalogue ne coche
  une valeur de réglage que son générateur ignore.
- *Ce qui a coûté* : deux minutes et une fausse certitude. En corrigeant un
  import, j'ai retiré celui qui ENREGISTRE les générateurs. La sonde a imprimé
  « **0 valeur de réglage lue dans 225 exercices — aucune valeur inventée** » :
  les deux moitiés de la phrase se contredisaient, et seule la seconde était
  lue. Avec l'import remis : 205 valeurs, et toujours aucune inventée — mais
  cette fois la réponse voulait dire quelque chose.
- *Combien de fois* : |||| — c'est la quatrième forme du même piège (`hors
  cadre: 0` partout, `\bcqi` qui ne correspondait à rien, l'épreuve verte qui
  ne gardait rien, celle-ci).
- *Ce qui manque* : rien à construire, une ligne à écrire. **Toute sonde et
  toute épreuve qui balaie une collection doit AFFIRMER combien d'éléments elle
  a lus**, et échouer si le compte s'écroule. Les trois épreuves écrites
  aujourd'hui portent ce seuil (`lues > 150`, `fichiers > 60`,
  `fichiers.length > 100`).

---

**« Étiré » ne dit pas QUI a étiré** — 13 octobre 2026

- *Ce que je voulais faire* : corriger les 53 boutons plus hauts que larges que
  `tools/boutonsEtires.mjs` signale.
- *Ce qui a coûté* : j'ai commencé à élargir une cible du jeu des Diviseurs
  (43 × 67) avant de voir que le plancher tactile n'y était pour **rien** : sa
  hauteur vient de ses deux lignes de texte empilées. Le critère de l'outil,
  `plancher !== 'auto'`, dit seulement que le plancher S'APPLIQUE à ce bouton,
  pas qu'il l'a étiré. Même piège sur le Duel : 74 px de haut, décidés par sa
  propre feuille.
- *Combien de fois* : || — déjà payé sur « hors cadre : 0 », où la mesure
  répondait contre la mauvaise référence.
- *Ce qui manque* : fait. L'outil sépare désormais **« étirés par le plancher »**
  (hauteur ≈ 44 px : on élargit, ou le jeu déclare `btn-carre`) de **« hauts
  parce que leur jeu le veut »** (hauteur > plancher : on relit sa feuille
  AVANT d'y toucher — elle dit souvent pourquoi). 32 d'un côté, 21 de l'autre.

---

**Lire une règle CSS dans une épreuve était écrit trois fois** — 13 octobre 2026

- *Ce que je voulais faire* : garder quatre valeurs de mise en page que Rémy
  vient d'arbitrer.
- *Ce qui a coûté* : en cherchant comment le dépôt lit une règle CSS, j'ai
  trouvé `corpsDeLaRegle` et `declare` recopiées dans trois épreuves —
  `colonnesDuTableau`, `sceneDuSprint`, `cadreDuTableauCroise` — et, avec elles,
  **trois fois le même commentaire** expliquant que `/\bheight/` trouve
  `min-height`. Une leçon écrite trois fois est une leçon qu'on réapprendra une
  quatrième.
- *Combien de fois* : ||| (trois copies, et la mienne aurait fait quatre)
- *Ce qui manque* : fait — `tests/aidesCss.mjs`, et les trois épreuves
  migrées. Il porte en plus ce que les copies ne savaient pas faire :
  `{ apres: '@container …' }`, parce qu'un même sélecteur revient dans
  plusieurs blocs et que **c'est le dernier qui gagne** — le Duel fixe la
  hauteur de son pavé à trois endroits.

---

**Deux retouches liées, en deux appels, laissent un fichier qui ne compile pas**
— 13 octobre 2026

- *Ce que je voulais faire* : remplacer une aide locale par un import, dans une
  épreuve — donc changer l'en-tête ET supprimer la fonction, ensemble.
- *Ce qui a coûté* : un aller-retour. Fait en deux appels à
  `tools/remplacer.mjs`, le premier a introduit l'import et le second a été
  REFUSÉ par `node --check` (« Identifier 'declare' has already been
  declared ») — l'outil a bien remis le fichier, mais le premier changement
  était déjà écrit, et le fichier est resté cassé entre les deux.
- *Combien de fois* : |
- *Ce qui manque* : rien, l'outil fait déjà ce qu'il faut : `--depuis` accepte
  PLUSIEURS paires et n'écrit qu'une fois tout vérifié. **Des retouches qui
  dépendent l'une de l'autre vont dans le MÊME fichier de paires**, jamais en
  deux appels.

---

**Un code de quatre caractères cherché dans un fichier binaire tombe au hasard**
— 13 octobre 2026

- *Ce que je voulais faire* : lire le verdict de `php tools/testApi.php` avant de
  committer.
- *Ce qui a coûté* : dix minutes de doute sur une correction qui n'avait rien à
  voir. Le harnais a annoncé **« un code de billet n'est pas lisible dans le
  fichier — « 4KP2 » trouvé en clair »**, c'est-à-dire la pire nouvelle
  possible : le chiffrement décoratif. Relancé sans rien changer : vert. C'était
  une COLLISION FORTUITE — la vérification cherche la chaîne littérale `4KP2`
  dans les quelques centaines de kilo-octets du fichier SQLite et de son
  journal, et quatre caractères ASCII se rencontrent par hasard de temps en
  temps.
- *Combien de fois* : | (une fois sur les cinq lancements de la journée, donc
  cela recommencera)
- *Ce qui manque* : une **sentinelle assez longue pour ne pas se rencontrer par
  hasard**. Le code `4KP2` est écrit à la main par le harnais (douze endroits) et
  le format du produit accepte jusqu'à douze caractères : un code de neuf
  signes rendrait la collision impossible sans rien changer à ce que la
  vérification prouve. Non fait aujourd'hui — le harnais était vert, Rémy n'a
  pas demandé cela, et toucher à douze appels de connexion pour un faux positif
  rare se décide à froid. **Écrit ici pour que la prochaine session relance
  avant de chercher le défaut.**

---

**Une épreuve verte depuis toujours, qui interrogeait une route inexistante**
— 14 octobre 2026

- *Ce que je voulais faire* : vérifier que l'écran du professeur montre la case
  « Plein écran chez les élèves » qu'il vient de cocher.
- *Ce qui a coûté* : vingt minutes, et deux fois le même piège. J'ai copié la
  ligne de la vérification voisine — `json('/teacher/class', ['action' =>
  'list'])['json']['classe']['impose_path_id'] ?? null` — et je n'ai jamais rien
  reçu. **Cette route ne connaît pas d'action `list`** : elle répond 400, et le
  `?? null` transformait l'erreur en la valeur attendue. La vérification voisine
  attendait précisément `null` : elle était donc **verte en toutes
  circonstances depuis le jour de son écriture**. Puis mon détecteur de ce
  défaut (`?? 'absent'`) est tombé dans le même trou : **`??` ne distingue pas
  une clef absente d'une clef nulle.**
- *Combien de fois* : || — même famille que « une sonde qui ne mesure rien
  répond tout va bien », et c'est la deuxième en deux jours.
- *Ce qui manque* : une règle, et elle se formule en une ligne. **Une
  vérification qui attend une valeur FAUSSE ou NULLE doit aussi exiger que la
  réponse soit arrivée** — `$r['code'] === 200`, et `array_key_exists` plutôt
  que `??` quand c'est la présence qui compte. Seule l'attente d'une valeur NON
  nulle révèle ces épreuves creuses, et il ne faut pas compter sur la chance
  d'en écrire une à côté.

---

**La garde des crochets ne regardait que les boutons** — 14 octobre 2026

- *Ce que je voulais faire* : ajouter une case à cocher dans l'espace classes.
- *Ce qui a coûté* : rien cette fois, et c'est le seul mérite — mais le trou
  était là. `tests/crochetsDeLEspaceClasses.test.mjs` existe pour garder un
  défaut précis : « un crochet neuf qu'on oublie d'inscrire au répartiteur
  échoue EN SILENCE ». Elle ne lisait que les lignes portant `<button`. Une
  **case à cocher se clique aussi**, et son crochet échoue de la même façon
  muette : l'épreuve écrite pour ce défaut-là ne l'aurait pas vu.
- *Combien de fois* : | (mais la famille — « une garde qui regarde la FORME
  laisse passer » — en est à quatre)
- *Ce qui manque* : fait, elle lit `<input` aussi. Et `epreuveTombe` a refusé de
  croire ma première écriture : le motif exigeait une espace après le crochet,
  alors que le gabarit porte `data-ecran-seance${…}` — **le `$` n'est pas une
  espace**. Même famille que le `\b` des feuilles de style, payé trois fois.
  **Quand on élargit une garde, on la refait tomber** : elle ne garde pas le
  nouveau cas du seul fait qu'on a touché son motif.

---

**J'avais fait de Rémy mon instrument de mesure** — 14 octobre 2026

- *Ce que je voulais faire* : choisir le seuil de l'indice poussé sur ses
  séances réelles, plutôt que sur mon intuition.
- *Ce qui a coûté* : un aller-retour entier, et sa phrase : **« je ne comprends
  pas les blocages en compte »**. J'avais bâti une page qui affiche « neuvième
  décile », « franchissements », « p90/méd » et un tableau de décimales, puis je
  lui avais demandé de **me la recopier** pour que je décide. La page était
  juste, le comptage était juste, les épreuves étaient vertes — et elle ne
  servait à rien, parce qu'elle posait une question à quelqu'un dans une langue
  qui n'est pas la sienne.
- *Combien de fois* : || — déjà payé avec « le message disait le bouton Code en
  haut de l'écran » alors qu'il est en bas sur téléphone : on envoie quelqu'un
  chercher dans un vocabulaire qui est le nôtre.
- *Ce qui manque* : un réflexe, et il est simple. **Une page qui pose une
  question doit la poser en entier** : ce qu'on a compté, ce que cela veut dire,
  et ce que je propose — avec la raison. Les chiffres bruts restent, repliés,
  pour le jour où une de mes phrases a l'air fausse. Et le test à se poser avant
  d'écrire une page pour lui : **est-ce que je lui demande de faire mon travail
  de lecture ?**

---

**Une sonde qui CLIQUE un crochet inventé ne crie pas, elle mesure l'autre écran**
— 14 octobre 2026

- *Ce que je voulais faire* : mesurer la liste du catalogue au doigt, dans le
  tiroir qu'on ouvre à 390 px.
- *Ce qui a coûté* : j'ai écrit `const b = document.getElementById(...) ||
  document.querySelector('[data-tiroir-catalogue], #mobile-catalogue-btn');
  if (b) b.click();` avec trois crochets **devinés**, dont aucun n'existe (le
  vrai est `btn-toggle-sidebar`). `doitExister` ferme exactement ce piège —
  mais seulement pour ce qu'on INTERROGE. Un clic, lui, est gardé par un
  `if` : il ne jette pas, il ne fait rien, et la sonde mesure alors le panneau
  resté fermé en annonçant des largeurs parfaitement crédibles. Rattrapé avant
  de mesurer, par relecture — pas par l'outil.
- *Combien de fois* : | (et c'est la famille « un crochet inventé rend la même
  réponse qu'un logiciel cassé », qui en est à seize)
- *Ce qui manque* : fait. `s.cliquer(selecteur, pourquoi)` est dans
  `tools/sonde.mjs` : il passe par `doitExister`, donc il JETTE en nommant le
  crochet au lieu de ne rien faire. Le `if (b)` ne se réécrit plus.

---

**Une garde qui cherche les erreurs PHP dans la PAGE ne les trouve jamais**
— 14 octobre 2026

- *Ce que je voulais faire* : déplacer les phrases de la section vers le noyau,
  pour qu'elles soient éprouvables sans serveur ni session.
- *Ce qui a coûté* : dix minutes de recherche à l'aveugle. Le bloc déplacé
  portait sa propre fonction d'aide, qui s'est retrouvée déclarée **à
  l'intérieur** de la nouvelle fonction : PHP meurt d'un « Cannot redeclare
  function » au second appel, et la section s'est affichée **entièrement
  vide**. Or « ET ELLE NE CRACHE AUCUNE ERREUR PHP » est resté **VERT** :
  `display_errors` est éteint, donc le fatal part dans le journal du serveur et
  jamais dans la page. La garde donnait exactement l'assurance qu'elle
  prétendait donner, à l'envers.
- *Combien de fois* : | (et c'est la famille « une mesure qui ne mesure rien
  répond tout va bien », qui en est à cinq)
- *Ce qui manque* : fait. Elle lit maintenant `$BAC/serveur.log`, là où PHP
  parle vraiment, et sur TOUT l'essai — pas seulement sur la dernière page
  demandée. Elle est vue tomber en remettant le fatal. **Ce sont les deux
  vérifications qui exigeaient un CONTENU qui ont attrapé le défaut** : une
  garde qui cherche l'absence d'un signe d'échec vaut toujours moins qu'une
  garde qui exige la présence du résultat.

---

**Une garde de crochets qui ne lit que la PREMIÈRE ligne de chaque bouton**
— 14 octobre 2026

- *Ce que je voulais faire* : ajouter `data-parcours` sur deux boutons du
  direct, pour rattacher le saut autorisé à la séance où on l'accorde.
- *Ce qui a coûté* : dix minutes de doute. `tests/crochetsDeLEspaceClasses`
  garde que tout crochet de bouton est écouté par le répartiteur — un crochet
  oublié donne un bouton qui ne fait RIEN, sans erreur. Elle est restée verte
  sur mon ajout, et j'ai cru un instant que `data-parcours` était déjà écouté.
  Non : elle ne regarde que les lignes qui contiennent `<button` ou `<input`,
  et dans ce fichier la plupart des boutons tiennent sur quatre lignes. Tout
  crochet écrit sous la première ligne lui est **invisible**. Elle garde donc
  une partie de ce qu'elle prétend garder, et c'est la plus petite.
- *Combien de fois* : | (famille « une mesure qui ne mesure rien répond tout
  va bien », qui en est à six)
- *Ce qui manque* : lire l'ÉLÉMENT et non la ligne — accumuler jusqu'au `>`
  qui ferme la balise. Attention : élargir fera apparaître les porteurs de
  valeur (`data-exo`, `data-prenom`, `data-graine`…), qu'il faudra nommer
  explicitement, sans quoi l'épreuve criera sur du code sain — et une épreuve
  qui crie sur du code sain finit éteinte.

---

**Remettre un défaut qui est « cette ligne en moins » se recopie à la main**
— 14 octobre 2026

- *Ce que je voulais faire* : voir tomber huit gardes neuves sur les tableaux à
  compléter, avec `tools/epreuveTombe.mjs`.
- *Ce qui a coûté* : onze fichiers de paires JSON, et un script Python jetable
  pour les écrire — exactement celui que `tools/remplacer.mjs` existe pour ne
  plus écrire. La raison est toujours la même : neuf des onze défauts étaient
  « cette ligne-là en moins » (un `this.rates = {};` oublié dans `poser`, le
  `void b.offsetWidth` du reflow, l'anneau du mode calme). Comme la ligne seule
  n'est pas unique dans le fichier — `this.rates = {};` y figure trois fois —,
  il faut recopier le bloc qui l'entoure DEUX fois, avec son indentation exacte,
  une fois avec et une fois sans. Quinze minutes, dont zéro de réflexion.
- *Combien de fois* : || (déjà le 13 octobre, pour les gardes du service
  worker)
- *Ce qui manque* : `node tools/epreuveTombe.mjs <essai> <source> --retirer
  "<ligne>" [--dans "<méthode>"]`, qui construit la paire lui-même en prenant
  les deux lignes voisines comme ancre. Le défaut le plus fréquent du dépôt est
  un retrait, et c'est le seul que l'outil ne sache pas écrire tout seul.

---

**Rien ne mesure ce que l'élève a À LIRE, et c'est Rémy qui l'a vu**
— 14 octobre 2026

- *Ce que je voulais faire* : aider un élève arrêté devant un tableau à
  compléter.
- *Ce qui a coûté* : un commit entier, jeté. J'avais posé sous la case fausse
  une explication de trente-deux mots PLUS un conseil de vingt-six — quatre
  lignes de texte devant un élève en difficulté. J'avais même écrit la réserve
  dans mon message (« c'est à voir en classe, si tu me dis que c'est trop on
  raccourcit ») et livré quand même. Rémy a répondu : « tes phrases son
  tellement longues et compliquées elles ne seront pas lues pour le remplissage
  du tableau il faut du visuel tu sélectionnes les cellules tu montres bien ».
  La photo que j'avais prise montrait ces quatre lignes ; je les ai regardées
  sans les COMPTER.
- *Combien de fois* : | (première fois nommée — mais tous les jeux écrivent des
  phrases à l'élève, et aucune n'est mesurée)
- *Ce qui manque* : que `tools/sonde.mjs` sache compter. Un `s.lisible('.tc-note')`
  qui rende les mots, la longueur et la taille de police, et une sonde pourrait
  dire « 58 mots sous la case fausse » là où l'œil lit « une phrase ». La
  mesure existe pour les couleurs (`contrasteRendu`) et pour les crochets
  (`doitExister`) ; elle n'existe pas pour le TEXTE, qui est pourtant ce que
  l'élève doit traverser avant d'atteindre l'exercice.
- **FERMÉE** — 15 octobre 2026, le lendemain, par la remarque suivante de Rémy
  (« une aide doit être visuelle et pas trop longue en explication comme c'est
  parfois le cas pour certains exercices »). `tools/cequilFautLire.mjs` tire de
  vraies questions de chaque générateur et compte **le plus long bloc d'un
  trait** — pas le total, qui condamnait les bonnes aides : « Temps, Distance,
  Vitesse » faisait 44 mots sur quatre lignes et se lit très bien. Mesuré : 47
  des 97 exercices à l'écran posaient un pavé de plus de 25 mots. Après, zéro.
  Les fonctions de mesure vivent à part (`tools/mesureDuTexte.mjs`) pour qu'une
  épreuve compte EXACTEMENT comme l'outil : `tests/aidesLisibles.test.mjs`
  garde le zéro sur tout le catalogue.

---

**Un filtre ajouté pour taire un faux positif a emporté le vrai défaut**
— 15 octobre 2026

- *Ce que je voulais faire* : détecter les aides qui répètent la même phrase.
- *Ce qui a coûté* : trois écritures du même détecteur. La première criait sur
  « 5/8 = 45/72 (× 9 en haut et en bas). 5/9 = 40/72 (× 8 en haut et en bas). »
  — deux étapes différentes dont la part française est identique. J'ai ajouté
  « les mots doivent faire 60 % de la phrase ». **Cette règle écartait aussi le
  seul vrai défaut du catalogue, à deux dixièmes de mot près** : la phrase
  d'Euler fait 16 mots français sur 27 jetons, et 16 < 16,2. L'épreuve passait
  au vert, le détecteur ne détectait plus rien, et rien ne le disait.
- *Combien de fois* : | (famille « une mesure qui ne mesure rien répond tout va
  bien », qui en est à sept)
- *Ce qui manque* : rien de neuf — `tools/epreuveTombe.mjs` l'a attrapé en une
  commande, et c'est la troisième fois de la journée. La leçon est d'usage :
  **quand on resserre un filtre pour taire un faux positif, on relance la chute
  sur le VRAI cas**, parce qu'un filtre ne sait pas lequel des deux il coupe.

---

**`epreuveTombe` ne reconnaissait pas la chute d'une vérification PHP qui a un détail**
— 15 octobre 2026

- *Ce que je voulais faire* : voir tomber cinq gardes neuves du défi chronométré,
  écrites dans `tools/testApi.php`.
- *Ce qui a coûté* : quatre fausses alertes de suite, et dix minutes à croire
  que mes gardes ne gardaient rien. `verifier()` écrit « ✓ nom » quand ça passe
  et « · nom — détail » quand ça tombe ; l'outil lisait donc le nom NU d'un
  côté et le nom SUIVI DU DÉTAIL de l'autre. `--epreuve "<nom>"` ne reconnaissait
  jamais la chute et annonçait « CETTE ÉPREUVE NE GARDE RIEN » — le message le
  plus alarmant du dépôt — sur des gardes parfaitement bonnes.
- *Combien de fois* : |||| (quatre dans la même minute, et le `--epreuve` sur
  du PHP n'avait encore jamais servi avec un détail)
- *Ce qui manque* : fait. Le lecteur PHP range maintenant les DEUX formes du
  nom, entière et coupée au premier « — ». Il ne peut pas choisir : dans la
  course où elle tombe, l'épreuve n'imprime jamais son nom nu.

---

**La sonde ne sait pas RÉPONDRE : chaque exercice mesuré redemande la même
trentaine de lignes** — 15 octobre 2026

- *Ce que je voulais faire* : voir « Compter l'Argent » par le chemin de
  l'élève, c'est-à-dire traverser ses neuf marches — un énoncé en toutes
  lettres, un tas de pièces, un tableau de rangs sous l'indice. Donc répondre
  JUSTE à chaque question, huit fois de suite.
- *Ce qui a coûté* : trois essais ratés avant que la sonde avance d'une seule
  question. Il a fallu retrouver que la réponse attendue se lit dans
  `window.__sondeRunner.session.item.answer`, que les touches du pavé portent
  `[data-key]` et le bouton `[data-validate]`, que la carte de correction
  bloque le clic suivant tant qu'on n'a pas cliqué `.fb-close` — ce qui
  ressemble à « element is not visible » et fait chercher ailleurs —, et que
  `page.click` échoue là où un `.click()` dans `evaluate` passe.
- *Combien de fois* : ||| (la même boucle réécrite pour le tableau croisé, pour
  le détour par le nombre rond, et pour celui-ci)
- *Ce qui manque* : `s.repondreJuste()` dans `tools/sonde.mjs` — elle lit la
  réponse dans le meneur, la tape sur le pavé OU clique le bon choix selon
  l'activité, ferme la carte de correction et rend la question suivante. Trois
  exercices sur trois en ont eu besoin ; le quatrième l'écrira aussi.

---

**Une recherche qui ne trouve rien rend la MÊME réponse qu'une recherche dont
le résultat n'existe pas** — 15 octobre 2026

- *Ce que je voulais faire* : rien. C'est Rémy qui l'a trouvé — « si je tape 99
  dans la barre de recherche, j'aurai pu espérer tomber dessus ».
- *Ce qui a coûté* : l'exercice du détour existe depuis la veille POUR 76 + 99,
  et « 99 » rendait zéro résultat. « 101 » et « 19 » aussi. Mesuré ensuite sur
  quarante requêtes usuelles : deux autres trous. Le coût n'est pas en minutes,
  il est en silence — **une liste vide est exactement ce qu'affiche une
  recherche dont le résultat n'existe pas**, et aucune erreur n'est levée. Seul
  quelqu'un qui CHERCHE la chose et sait qu'elle existe peut le dire ; ce
  quelqu'un, c'est Rémy, une fois sur dix.
- *Combien de fois* : | (première, mais la famille « une mesure qui rend bon
  pour une mauvaise raison » en est à huit)
- *Ce qui manque* : fait. `tools/cequOnTape.mjs` tape ce qu'un professeur tape
  — les nombres du programme d'abord, parce que ce sont eux qui vivent dans le
  générateur et jamais sur la page — et n'imprime que ce qui ne trouve RIEN.
  Une garde tient en plus les mots-clefs du détour à la table `VOISINS` : on ne
  peut plus ajouter un voisin sans le rendre cherchable.

**Une sonde ne peut pas atteindre le jeu qu'elle regarde** — 15 octobre 2026

- *Ce que je voulais faire* : mesurer le cassage de `1000 − 3`, c'est-à-dire une
  soustraction qui emprunte sur TOUTES ses colonnes. Tirée au hasard, elle ne
  sort presque jamais : il faut retirer jusqu'à la trouver, donc appeler
  `poser()` sur l'instance du jeu.
- *Ce qui a coûté* : deux lancements de sonde perdus, environ six minutes.
  `window.__sondeRunner.handle` n'est PAS le jeu : c'est un relais
  (`{ jeu, showNext, showPrevious… }`) construit dans `runner.js`, et
  `handle.poser is not a function` ne le dit pas. Il a fallu lire le meneur pour
  trouver `handle.jeu`.
- *Combien de fois* : || (déjà payé pour forcer une grille du Mastermind)
- *Ce qui manque* : `s.jeu()` dans la sonde — le jeu autonome quand il y en a
  un, une erreur nommée sinon. Et, tant qu'à faire, `s.rejouerJusqua(predicat)`
  qui retire une question jusqu'à ce qu'elle remplisse une condition : c'est la
  même boucle de quinze lignes dans trois sondes.

**La décision est écrite d'un côté, le défaut est de l'autre** — 16 octobre 2026

- *Ce que je voulais faire* : corriger « temps écoulé » qui traversait une séance
  neuve. Le défaut est au serveur (`api/lib/seance.php` envoie `chrono` sans
  condition) ; la raison pour laquelle on ne l'effaçait pas était écrite — très
  bien écrite, quinze lignes — dans `js/core/seanceDistante.js`, l'autre moitié
  de la même règle.
- *Ce qui a coûté* : j'avais déjà rédigé le fichier de paires qui ajoutait un
  **délai de grâce**, c'est-à-dire exactement ce que ce commentaire explique être
  faux (« ce n'est pas une question de DURÉE, c'est une question de QUI »). Deux
  vérifications écrites pour rien, et il a fallu les retirer. Je ne l'ai lu que
  parce que je cherchais la forme de `tempsRestant()`, par chance.
- *Combien de fois* : || (déjà payé sur `avancement.js` ↔ `projections.php` :
  « calculé avec les mêmes règles que chez l'élève » n'est écrit que d'un côté)
- *Ce qui manque* : un outil qui, pour un fichier qu'on s'apprête à toucher, dit
  **qui parle de lui ailleurs** — les fichiers qui le nomment dans un commentaire
  ou un `↔`. Trois paires au moins vivent ainsi en miroir (`avancement.js` ↔
  `projections.php`, `seanceDistante.js` ↔ `seance.php`, `bilan.js` ↔ le direct),
  et rien n'oblige à lire les deux. À défaut d'outil : un `↔ api/lib/seance.php`
  dans l'en-tête de chaque moitié, que `node tools/miroirs.mjs` saurait vérifier.

**Trois élèves à la fois, c'est trois navigateurs** — 16 octobre 2026

- *Ce que je voulais faire* : mesurer un défi de classe, où le classement n'a de
  sens qu'à plusieurs. J'ai ouvert trois onglets du même contexte Playwright,
  chacun avec le billet d'un élève et `?poste=1`.
- *Ce qui a coûté* : une sonde complète perdue, environ sept minutes — le défi
  dure une minute, et il faut l'attendre. Le serveur ne gardait qu'un score et
  les trois écrans affichaient la même ligne, « Toi : 1er sur 1 ». J'ai
  d'abord cru tenir le défaut de Rémy. `?poste=1` range bien le poste à part
  (`boutEnBout` le garde : « les deux tiroirs existent côte à côte »), mais il
  n'y a qu'UN tiroir de poste par navigateur : le troisième billet avait écrasé
  les deux premiers.
- *Combien de fois* : |
- *Ce qui manque* : `s.eleves(n)` dans la sonde — n contextes, n billets pris
  dans la classe d'essai, et la page de chacun déjà ouverte et prête. Toute
  mesure de classe en a besoin : le défi, le direct, le mur, le compte à
  rebours. Et, à défaut, une ligne dans l'en-tête de `sonde.mjs` : un élève,
  un contexte.

**`.path-ouvrir-seance` n'est pas le bouton « Jouer »** — 16 octobre 2026

- *Ce que je voulais faire* : faire jouer un élève depuis sa séance imposée, dans
  deux sondes différentes (la largeur du parcours, puis la pause de classe).
- *Ce qui a coûté* : deux sondes rendues inutilisables, environ dix minutes. Le
  crochet EXISTE dans `js/ui/pathView.js` — je l'y avais lu — mais sur une autre
  branche que celle qu'un élève emprunte. Le bouton du bas de la carte est
  `.world-map-play`. Un sélecteur qui existe dans la source et rend 0 à l'écran
  est pire qu'un sélecteur inventé : `doitExister` l'aurait attrapé, mais j'avais
  la preuve textuelle sous les yeux et je ne l'ai pas employé.
- *Combien de fois* : ||
- *Ce qui manque* : `s.jouerLaSeance()` dans la sonde — elle ouvre la séance
  imposée par le chemin de l'élève et jette si elle n'y arrive pas. Quatre sondes
  réécrivent déjà ces huit lignes. Et, plus généralement : `doitExister` doit
  s'employer même — surtout — quand on a LU le crochet dans la source, parce que
  lire ne dit pas sur quelle branche il est rendu.

**Une règle recopiée diverge avant même d'être relue** — 16 octobre 2026

- *Ce que je voulais faire* : appliquer à la séance IMPOSÉE la règle de
  complément qui existait déjà pour la séance DONNÉE (`majDeSeance`,
  `memeEtape`, dans `core/seances.js`).
- *Ce qui a coûté* : `memeEtape` n'était pas exportée. Plutôt que de l'exporter,
  j'en ai écrit une copie de six lignes dans `ui/leMoment.js` — sans trier les
  clés, alors que l'originale le fait et explique pourquoi en trois lignes de
  commentaire juste au-dessus. Résultat : deux étapes identiques écrites dans un
  ordre différent passaient pour différentes, donc l'ajout n'arrivait JAMAIS.
  Trois épreuves rouges, dix minutes, et le commentaire que je n'avais pas lu
  disait exactement la cause.
- *Combien de fois* : ||| (déjà payé sur `cadreDApercu`, où la même règle vivait
  dans `builder.js` et `engine.js`, et sur `previewMode` ; c'est la troisième
  fois que la copie est le défaut)
- *Ce qui manque* : une épreuve qui repère les fonctions JUMELLES — même nom,
  deux fichiers, corps proches — et demande laquelle est l'originale.
  `tests/cadreDApercu.test.mjs` le fait déjà pour UNE règle, à la main ; ce
  qu'il faut est le même balayage pour tout le dépôt. À défaut, un réflexe :
  avant d'écrire une fonction, `grep -rn "function <nom>" js/` — deux secondes
  contre dix minutes.

**Répondre à une question, dans une sonde, n'a pas UN geste mais deux** — 16 octobre 2026

- *Ce que je voulais faire* : traverser un parcours comme un élève, en répondant
  juste à chaque question, pour relire les deux compteurs du haut.
- *Ce qui a coûté* : j'ai envoyé un `pointerdown` sur `.bubble` — la correction
  apprise la veille sur les bulles QUI MONTENT (`surAppui`,
  `core/cibleQuiBouge.js`). Les propositions d'un QCM n'écoutent pas cet
  événement : `activities/choice.js` pose un `el.onclick`. La sonde a tourné
  vingt-huit tours sur « 0 / 2 » sans rien signaler — une réponse qui n'arrive
  pas ressemble exactement à un logiciel qui ne compte pas, et j'ai d'abord
  cherché le défaut dans le compteur. Puis, le clic réparé, elle s'est arrêtée
  au bout de deux questions : entre deux étapes il y a DEUX écrans à pousser
  (`#btn-run-next`, puis `.world-map-play` sur la carte), et aucun des deux ne
  porte un libellé devinable.
- *Combien de fois* : || (déjà payé sur le clic d'une cible qui bouge)
- *Ce qui manque* : dans `tools/sonde.mjs`, un `repondre()` et un
  `avancerDansLaSeance()` qui portent ces trois gestes une fois pour toutes —
  `el.click()` (qui vaut AUSSI pour `surAppui`, lequel écoute le clic au clavier,
  `detail === 0`), l'attente de la correction qui tient les clics, et les deux
  écrans d'entre-deux-étapes. Trois sondes au moins auront à les refaire.

**Une sonde qui traverse tout droit ne voit pas ce qui se casse en revenant** — 16 octobre 2026

- *Ce que je voulais faire* : mesurer la barre d'étape que Rémy voyait pleine à
  mi-chemin.
- *Ce qui a coûté* : la première version du relevé traversait le parcours tout
  droit, et les deux compteurs s'accordaient à chaque question — 4 %, 8 %,
  13 %… Verdict tout vert sur un défaut que Rémy avait sous les yeux. Il fallait
  une SECONDE scène, celle où l'élève **refait** une étape, pour que l'écart
  paraisse. Sans ce doute, j'aurais conclu « rien à corriger ».
- *Combien de fois* : |
- *Ce qui manque* : une habitude écrite plutôt qu'un outil — tout relevé de
  parcours se fait en DEUX scènes, droit puis en revenant sur ses pas (refaire,
  réessayer, choisir hors de l'ordre). La seconde phrase du journal — « une
  mesure qui ne regarde que ce qu'on a corrigé ne voit pas ce qu'on a cassé » —
  a une jumelle : *une mesure qui ne suit que le chemin prévu ne voit pas celui
  que l'élève prend.*

**Un identifiant inventé dans une épreuve la rend verte pour la mauvaise raison** — 16 octobre 2026

- *Ce que je voulais faire* : garder la règle « le parcours de révision ne sort
  pas des exercices de la séance ».
- *Ce qui a coûté* : l'épreuve nommait la compétence « num.relatifs.oppose »,
  qui n'existe pas. `exercisesForSkill` rendait une liste vide, le repli
  catalogue ne rendait donc RIEN, et deux épreuves passaient sans rien garder —
  dont celle qui prétendait distinguer l'exercice de la séance de celui du
  catalogue, alors qu'elle ne distinguait rien. `epreuveTombe.mjs` l'a dit en
  une ligne (« CETTE ÉPREUVE NE GARDE RIEN ») ; sans lui, la garantie était
  fausse et je l'aurais crue.
- *Combien de fois* : || (même famille que le sélecteur inventé : un
  identifiant qui ne désigne rien rend la même réponse qu'un logiciel cassé)
- *Ce qui manque* : `tools/nouvelExercice.mjs` vérifie déjà qu'une compétence
  CITÉE PAR UN EXERCICE existe. Rien ne le vérifie pour une compétence ou un
  identifiant d'exercice cité dans une ÉPREUVE. Un balayage de `tests/` qui
  relève les chaînes en forme d'identifiant (`num.…`, `calc-…`) et dit
  lesquelles ne sont dans aucun catalogue coûterait quelques secondes et
  fermerait la famille entière.

**Une règle CSS juste, placée trop tôt, ne fait rien et ne le dit pas** — 16 octobre 2026

- *Ce que je voulais faire* : donner à la phrase de présentation de l'écran de
  classe la même marge que le reste, sur ordinateur ET sur téléphone.
- *Ce qui a coûté* : j'ai ajouté `.ec-onglet-dit` à la liste des sélecteurs que
  la requête `max-width: 560px` rentre à 15 px. Cette liste vit ligne 951 ;
  la règle de base, `padding: 0 26px`, ligne 5043. Même spécificité, donc c'est
  la DERNIÈRE écrite qui gagne — la correction n'a RIEN changé, et rien ne l'a
  signalé. Mesuré : 26 px contre 15 pour les onglets, exactement comme avant.
- *Combien de fois* : |
- *Ce qui manque* : une sonde d'ALIGNEMENT plutôt qu'une relecture de règles —
  `tools/alignementDeLaClasse.mjs` compare désormais les bords gauches RENDUS
  des quatre blocs, aux deux largeurs. C'est elle qui a dit que ma première
  correction ne corrigeait rien. Le réflexe à garder : une marge se vérifie sur
  `getBoundingClientRect`, jamais sur la feuille de style.

**Une sonde gardée rouille en silence quand l'écran qu'elle pilote est refait** — 16 octobre 2026

- *Ce que je voulais faire* : relancer `tools/fermeHorsSeance.mjs` pour vérifier
  qu'un réglage déjà construit marchait toujours.
- *Ce qui a coûté* : elle cliquait `[data-maison]` directement. Depuis, la barre
  de pilotage a été désencombrée en ONGLETS repliés (`vue.outil: null`) : la
  case n'est plus dans la page tant qu'on n'a pas ouvert son onglet. `doitExister`
  a jeté avec le bon message — sans lui, la sonde aurait annoncé un réglage
  cassé, et j'aurais cherché le défaut dans le serveur.
- *Combien de fois* : |
- *Ce qui manque* : les sondes gardées ne tournent jamais ensemble. Trois des
  harnais tournent avant chaque commit ; les trente sondes de `tools/`, non.
  Un `node tools/toutesLesSondes.mjs` qui les lance à la suite et ne rapporte
  que celles qui JETTENT (crochet disparu, pas assertion rouge) dirait en une
  fois lesquelles ont rouillé.

**Un réglage nommé d'après son drapeau en base ne se retrouve pas** — 16 octobre 2026

- *Ce que je voulais faire* : répondre à « je ne sais pas comment on fait pour
  que les élèves ne se connectent pas à la maison ».
- *Ce qui a coûté* : rien à construire — le réglage existait, et c'est LUI qui
  l'avait demandé quelques jours plus tôt. Il s'appelait « Hors séance »,
  c'est-à-dire du nom de la colonne `hors_seance`. Il cherchait « la maison ».
  Une demi-heure à relire du code pour conclure qu'il n'y avait rien à écrire.
- *Combien de fois* : || (déjà payé sur « Mettre en pause », qui fermait le
  catalogue)
- *Ce qui manque* : une règle, pas un outil — **un réglage porte le nom de la
  question qu'on se pose en le cherchant**, jamais celui de la donnée qu'il
  écrit. Et son état se lit dans les DEUX sens quand le défaut est celui qui
  gêne : « · ouverte » autant que « · fermée ».

**« Exister » et « se voir » sont deux questions, et une seule était la sienne** — 16 octobre 2026

- *Ce que je voulais faire* : répondre à « dans la partie élève il n'y a pas
  d'endroit pour se déconnecter ».
- *Ce qui a coûté* : rien de cassé — le bouton existait, `hidden` valait `false`,
  et `quiEstLa()` répondait bien « élève ». Il était simplement dans un menu
  replié, derrière une icône sans libellé. Une première lecture du code aurait
  conclu « c'est déjà fait ». Ce qui a tranché, c'est une mesure qui demandait
  `getBoundingClientRect` plutôt que `.hidden` : **visible: false**.
- *Combien de fois* : || (même famille que « le réglage nommé d'après son
  drapeau » : la fonction est là, la porte ne l'est pas)
- *Ce qui manque* : un réflexe écrit — pour toute demande de la forme « il n'y a
  pas de X », on mesure la VISIBILITÉ de X (boîte rendue, et pas `hidden`), et
  l'on liste ce qui est cliquable à l'écran. Le dire en une ligne vaut mieux que
  relire trois modules.

**Un tableau rendu tel quel se lit comme un objet, et personne ne le dit** — 16 octobre 2026

- *Ce que je voulais faire* : rafraîchir la carte d'une classe après avoir fermé
  sa porte.
- *Ce qui a coûté* : `mesClasses()` rend le TABLEAU des classes. J'ai écrit
  `(vue.classes && vue.classes.classes)` — par analogie avec les autres routes,
  qui enveloppent — et la recherche tombait sur une liste vide, en silence. Le
  serveur enregistrait, la carte ne bougeait pas, et j'ai d'abord cherché le
  défaut dans le clic, puis dans le serveur : trois sondes pour une faute de
  forme. Rien n'avertit, parce qu'un `|| []` rend la ligne parfaitement valide.
- *Combien de fois* : |
- *Ce qui manque* : le réflexe de DUMPER la réponse brute avant de la lire
  (`JSON.stringify(r).slice(0, 400)`) — deux secondes, et la forme est sous les
  yeux. À défaut, un commentaire de type sur les helpers d'`espaceProf.js` qui
  ne suivent pas la forme enveloppée.

**Un bouton de sortie a trois chemins, et deux ne préviennent personne** — 16 octobre 2026

- *Ce que je voulais faire* : remettre le voile de la porte fermée quand l'élève
  termine l'exercice qu'on lui avait laissé.
- *Ce qui a coûté* : j'ai branché `onExit` du meneur, qui est la porte
  documentée. La croix rouge (`#btn-close-game`, js/app.js) NE L'APPELLE PAS :
  elle abandonne le meneur et cache la couche de jeu elle-même. L'élève sortait
  donc dans l'application entière, porte fermée — exactement ce que la demande
  interdisait. `ui/boiteUI.js` raconte ce même piège en quinze lignes, trente
  commits plus tôt : je ne l'ai lu qu'après.
- *Combien de fois* : || (la boîte à jeux d'abord, le voile ensuite)
- *Ce qui manque* : `exit()` n'est pas LA sortie du meneur, c'en est une sur
  trois. Tant que `#btn-close-game` ne passe pas par elle, tout ce qui doit
  arriver « à la fin » doit écouter le FAIT — la couche de jeu est cachée — et
  non le chemin. Un `MutationObserver` de six lignes le fait ; une épreuve qui
  interdirait à `app.js` de cacher `#game-layer` lui-même le ferait mieux.

**Une identité qui en cache une autre** — 16 octobre 2026

- *Ce que je voulais faire* : donner à Rémy une porte de sortie du compte élève
  qu'il venait d'essayer.
- *Ce qui a coûté* : j'avais posé la veille un bouton « Se déconnecter » dans
  son profil, mesuré visible et cliquable — et il ne lui servait à rien, parce
  qu'il nommait le PROFESSEUR. `quiEstLa()` rend une identité là où il peut y en
  avoir deux, et ma sonde de la veille n'avait mesuré que le cas simple : un
  élève sur un poste partagé, qui n'a jamais deux jetons. J'avais donc vérifié
  le bouton sur la seule situation où il n'y avait pas de défaut.
- *Combien de fois* : || (même famille que « une sonde qui traverse tout droit
  ne voit pas ce qui se casse en revenant »)
- *Ce qui manque* : une règle pour les sondes d'identité — **mesurer les
  combinaisons, pas les rôles**. Dès qu'un écran dépend de « qui est là »,
  l'éprouver au moins sur : personne, élève seul, professeur seul, et LES DEUX.
  Le quatrième cas est celui du professeur qui essaie son logiciel, c'est-à-dire
  de l'utilisateur qu'on a sous la main tous les jours.

**Un bouton visible, lisible, et mort : `showModal` repose son étage en ligne**
— 17 octobre 2026

- *Ce que je voulais faire* : poser « Se déconnecter » sur le voile de la porte
  close, parce que Rémy s'y était enfermé lui-même.
- *Ce qui a coûté* : vingt minutes et une fausse conclusion. J'avais VÉRIFIÉ
  avant d'écrire : `.modal-overlay` est à `z-index: 100000` dans
  css/components.css, le voile à 10100 dans css/ui.css, donc la fenêtre de
  confirmation passe devant — c'était écrit noir sur blanc dans la feuille de
  style, et c'était faux. `showModal` repose son étage **en ligne**
  (`z-index: 9999` par défaut), et un style en ligne l'emporte sur la classe. La
  fenêtre s'ouvrait DERRIÈRE le voile : on lisait son texte à travers, et son
  bouton n'était pas celui qu'on touchait. Sans
  `document.elementFromPoint`, la sonde aurait dit « la fenêtre s'ouvre », et
  j'aurais livré un bouton mort à quelqu'un qui est déjà bloqué.
- *Combien de fois* : || (même famille que « 9999 suffisait tant qu'on restait
  dans la page », déjà payée sur la couche de jeu à 10000 — c'est le même
  défaut, et le commentaire qui le raconte est DANS `ui/modal.js`)
- *Ce qui manque* : une règle, et elle vaut pour tout ce dépôt — **une feuille
  de style ne dit pas qui est devant ; seul le navigateur le dit.** Dès qu'un
  écran se superpose à un autre, on ne compare pas deux `z-index` lus dans deux
  fichiers : on demande `document.elementFromPoint` au centre du bouton, et il
  nomme QUI est là. Les deux défauts de ce chantier ont été trouvés comme ça.

**Un `<rect>` SVG n'a pas de méthode `click()`** — 17 octobre 2026

- *Ce que je voulais faire* : colorier cinq cases d'un quadrillage depuis une
  sonde, pour rejouer l'erreur d'un élève.
- *Ce qui a coûté* : un essai perdu, et un message qui n'aide pas —
  « h.click is not a function » sur un élément parfaitement trouvé. `click()`
  appartient à `HTMLElement`, pas à `SVGElement` : le bouton d'indice, qui est
  un `<button>`, marchait très bien trois lignes plus haut, ce qui rend le
  piège discret.
- *Combien de fois* : |
- *Ce qui manque* : rien à construire — la règle est **sur un dessin, on clique
  avec la souris de Playwright** (`page.locator(sel).click()`), jamais avec
  `element.click()` dans la page. C'est aussi le vrai chemin de l'élève, qui
  n'appelle pas de méthode.

**Une mesure de fiche qui saute `teindreHtml` accuse soixante innocents** — 19 octobre 2026

- *Ce que je voulais faire* : répondre à « Vérifie aussi les autres pour les
  couleurs », c'est-à-dire trouver les fiches que le mode couleur laisse
  indifférentes.
- *Ce qui a coûté* : un outil écrit, lancé, et un verdict faux —
  **61 fiches sourdes sur 79**, dont le Mastermind, qui écrit pourtant onze
  couleurs. Je comparais ce que le RENDU rend ; l'aperçu de Rémy, lui, passe par
  `teindreHtml` (`printSheet.js:810`), et le PDF par `teindreDoc`. Un rendu n'a
  pas à consulter le mode pour être coloré. Une fois la mesure posée au bon
  endroit : 19 fiches, dont 2 à corriger. Vingt minutes à soupçonner le code de
  six familles de rendus.
- *Combien de fois* : |
- *Ce qui manque* : rien de neuf à construire — `tools/couleursDesFiches.mjs`
  existe maintenant et passe par le bon chemin. La règle est la vieille :
  **une mesure qui n'emprunte pas le chemin de l'utilisateur ne mesure pas son
  problème**, et le chemin d'une fiche ne s'arrête pas au rendu.

**`locator.screenshot({ clip })` accepte le découpage et l'ignore** — 19 octobre 2026

- *Ce que je voulais faire* : regarder la jonction de deux dominos imprimés,
  donc découper un morceau de la page rendue à grande échelle.
- *Ce qui a coûté* : deux allers-retours, et surtout un outil qui MENTAIT — il
  imprimait « découpé à 1684 × 417 » en écrivant la page entière de
  4209 × 2976. Seul `page.screenshot()` lit `clip` ; sur un `locator`, l'option
  est avalée sans un mot. Et monter l'échelle ne remplace pas le découpage :
  qui regarde une image de 4209 px la voit réduite à la largeur de sa fenêtre,
  c'est-à-dire exactement à la résolution qu'on venait de quitter.
- *Combien de fois* : |
- *Ce qui manque* : c'est fait — `tools/pdfEnImage.mjs` accepte
  `--zone=x,y,w,h` en fractions de page et découpe dans une seconde toile. La
  règle derrière : **un outil annonce ce qu'il a FAIT, jamais ce qu'on lui a
  demandé** — la ligne de sortie se lit sur l'objet qu'on photographie.

**Mesurer large ne reproduit pas ce que l'autre voit** — 19 octobre 2026

- *Ce que je voulais faire* : reproduire « dans l'atelier, il faut que l'on voit
  l'apercu pour l'impression à chaque fois c'est replié ».
- *Ce qui a coûté* : une première sonde entièrement verte. En 1500 × 1000 — la
  taille que toutes les sondes de ce dépôt ouvrent par défaut — le cadre de la
  feuille fait 573 px et le repli ne se déclenche pas (le seuil est 560). En
  1280 × 820, un portable ordinaire, il fait 463 px et l'aperçu tombe à ZÉRO
  pixel de haut. Le défaut était « à chaque fois » chez lui et « jamais » chez
  moi.
- *Combien de fois* : |
- *Ce qui manque* : une habitude plus qu'un outil — **quand un défaut dépend de
  la place, on le cherche à 1280 d'abord**, qui est l'écran d'un professeur,
  et non à 1500 qui est celui de personne. Et dans un CADRE, `window.innerWidth`
  n'est pas la largeur de l'écran : c'est celle du cadre, et toute règle de
  média s'y trompe de contexte.

**Obtenir le PDF d'une fiche se réécrivait à chaque sonde** — 19 octobre 2026

- *Ce que je voulais faire* : regarder la feuille imprimée du Strimko en
  couleur, puis celle de la Tour de Brahma, puis celle des dominos.
- *Ce qui a coûté* : les mêmes soixante lignes pour la troisième fois dans ce
  dépôt (après `polyDu12Octobre.mjs` et `feuillesDu12OctobreSoir`), avec les
  mêmes pièges repayés : le réglage de couleur qui dort dans un `<details>`
  fermé, le défaut du logiciel qui est NOIR ET BLANC — donc une sonde qui ne
  touche à rien mesure toujours une feuille en noir et blanc, alors qu'on
  venait justement regarder la couleur —, et le bouton qui ne s'appelle pas
  pareil selon qu'on imprime une grille (`#fp-telecharger`) ou des questions
  (`#fq-telecharger`).
- *Combien de fois* : |||
- *Ce qui manque* : c'est fait — `tools/ficheEnPdf.mjs <id> --couleur=couleur`
  rend le PDF, l'image, les VRAIES teintes du fichier et le compte des champs
  remplissables. Il choisit tout seul entre la fiche et la liste de questions
  selon que l'exercice a un `printable`.

**Un réglage `type: 'checkbox'` n'est pas une case à cocher dans la page** — 19 octobre 2026

- *Ce que je voulais faire* : vérifier, depuis une sonde, que l'option
  « Montrer les traits de séparation » de la fiche « Lis la Fraction » dessine
  vraiment les pointillés.
- *Ce qui a coûté* : quatre allers-retours. Le schéma de réglage déclare
  `type: 'checkbox'`, et la page en fait une PAIRE DE BOUTONS Oui / Non
  (`.cfg-oui-non`, `[data-bool]`). `querySelector('input[type=checkbox]')` rend
  donc `null` — c'est-à-dire la même réponse qu'un réglage absent, et l'on
  cherche le défaut dans la déclaration du paramètre.
- *Combien de fois* : |
- *Ce qui manque* : la règle tient en une ligne — **un réglage booléen se
  bascule par `[data-param="x"] [data-bool="true"]`**, jamais par une case. Et
  le constat général est celui de `doitExister` : un sélecteur qui ne désigne
  rien rend la même chose qu'un logiciel cassé.

**jsPDF applique `align` et `baseline` AVANT de tourner le texte** — 19 octobre 2026

- *Ce que je voulais faire* : centrer un mot vertical sur un point, pour les
  dingbats « deux mots qui se croisent » et « un mot autour d'une forme ».
- *Ce qui a coûté* : une feuille entière où « DROITE » vertical grimpait
  par-dessus le titre de son bloc, et vingt minutes à soupçonner le calcul du
  corps. Avec `angle`, jsPDF décale d'abord le texte de la moitié de sa
  largeur — dans la direction de la PAGE —, puis tourne le tout : le mot part
  donc d'une demi-longueur sur le côté. `baseline: 'middle'` souffre du même
  mal, perpendiculairement.
- *Combien de fois* : |
- *Ce qui manque* : rien à construire, une règle — **sous rotation, on ne
  demande pas l'alignement à jsPDF, on calcule le point de départ** : reculer
  d'une demi-largeur le long de (cos A, −sin A), descendre d'une demi-capitale
  le long de (sin A, cos A). Et la façon de le mesurer vaut d'être redite :
  une CROIX dessinée à l'endroit demandé, le mot écrit par-dessus, et l'on
  regarde. Trois minutes, contre vingt à raisonner.

**Le défaut DÉDUIT qui n'existait pas : l'identité d'un parcours sauvegardé** — 20 octobre 2026

- *Ce que je voulais faire* : trouver pourquoi « quand je recharge le parcours,
  je ne vois plus les classes à qui je l'ai donné ».
- *Ce qui a coûté* : peu, et c'est le propos. En lisant le code j'ai DÉDUIT que
  l'aller-retour par la bibliothèque devait changer l'identité du parcours
  (`normalizePath` matérialise des défauts). Six lignes de mesure avant d'écrire
  la moindre correction : l'identité est la MÊME avant, après, et après deux
  tours. La vraie cause était ailleurs — toute RETOUCHE la change, et le
  sélecteur de mode qui la change est dans le panneau qui affiche les classes.
- *Combien de fois* : ||
- *Ce qui manque* : rien — c'est la règle de `epreuveTombe.mjs` appliquée à la
  main, et elle a encore payé. **Un défaut déduit en lisant le code se mesure
  AVANT qu'on écrive la correction.** Trois minutes de mesure contre une demi-
  journée à corriger ce qui marchait.

**Une boîte qui se mesure d'après ce qu'elle contient se mord la queue** — 20 octobre 2026

- *Ce que je voulais faire* : l'aperçu d'un habillage de parcours — la vraie
  carte, réduite pour tenir dans le panneau de réglages.
- *Ce qui a coûté* : quatre allers-retours, parce que deux boucles se cachaient
  l'une derrière l'autre. (1) La carte prenait `100 % / zoom` de large et le
  zoom se calculait sur sa hauteur : on mesurait, on changeait la largeur, la
  hauteur changeait. (2) Puis le conteneur est passé en `display: flex` : avec
  l'étirement par défaut, la carte prenait la hauteur de la BOÎTE — celle qu'on
  venait de calculer d'après la carte —, et le chemin tombait de 769 px à 58.
- *Combien de fois* : |
- *Ce qui manque* : une règle, et elle vaut pour tout aperçu réduit —
  **on fige une dimension (ici la largeur, à celle d'une colonne d'élève), on
  mesure l'autre, et le conteneur ne doit JAMAIS étirer ce qu'il mesure**
  (`align-items: flex-start`). Et l'on remesure à la frame suivante : les
  écarts en `clamp(…vw…)` et les sentiers SVG ne sont pas posés à l'instant du
  `appendChild`.

**Un argument manquant qui sort en « délai dépassé », trente secondes plus tard** — 20 octobre 2026

- *Ce que je voulais faire* : regarder le PDF d'une fiche de QUESTIONS, pour
  juger l'option tableau que Rémy venait de demander.
- *Ce qui a coûté* : vingt minutes et deux fausses pistes. `tools/ficheEnPdf.mjs`
  appelait `ouvrirFicheQuestions(e, params, null, …)` — le troisième argument
  est le CHARGEUR de jsPDF, pas une option. La modale s'ouvrait, l'aperçu se
  dessinait, le bouton existait, et le clic levait `chargerJsPDF is not a
  function` DANS LA PAGE. L'outil, lui, attendait l'événement `download` et
  mourait trente secondes plus tard sur « Timeout exceeded » — un message qui
  ne nomme ni la fonction, ni le fichier, ni l'argument. J'ai d'abord soupçonné
  ma propre correction, puis remisé mes modifications pour mesurer sans elles.
- *Combien de fois* : |
- *Ce qui manque* : **toute sonde qui attend un `download` doit d'abord lire
  `s.erreurs`.** Une erreur de page explique le silence en une ligne, là où le
  délai dépassé ne dit rien. À mettre dans `sonde.mjs` : si l'attente échoue et
  que `s.erreurs` n'est pas vide, les imprimer AVANT de lever.

**Un `!important` dans la feuille bat un style en ligne — et la mesure rend 0** — 20 octobre 2026

- *Ce que je voulais faire* : mesurer les boutons d'habillage et de décor sur
  un téléphone, c'est-à-dire montrer la vue de l'élève depuis un compte
  professeur.
- *Ce qui a coûté* : deux allers-retours. `vue.style.display = 'block'` ne
  faisait rien — `.student-only { display: none !important }` gagne. Les dix
  boutons se construisaient correctement et mesuraient tous **0 px de large**,
  c'est-à-dire la réponse « tout tient » quoi qu'il arrive : une mesure qui ne
  peut pas échouer.
- *Combien de fois* : |
- *Ce qui manque* : deux réflexes. **Pour forcer un affichage depuis une sonde,
  `el.style.setProperty('display', 'block', 'important')`** ; et **toute mesure
  de largeur refuse 0** — une boîte à zéro n'est pas une boîte qui tient, c'est
  une boîte qu'on ne mesure pas.

**Un getter calculé qu'on affecte en silence** — 20 octobre 2026

- *Ce que je voulais faire* : poser une séance d'essai sur le compte élève
  d'une sonde, avec `state.studentPath = { … }`.
- *Ce qui a coûté* : un aller-retour entier à chercher pourquoi l'écran
  affichait « Pas de séance pour l'instant » avec une séance posée. C'est un
  **getter** : il se recalcule à partir du journal, et l'affectation disparaît
  sans un mot. Le chemin du logiciel est `state.setStudentPath(steps, meta)`.
- *Combien de fois* : |
- *Ce qui manque* : rien à fabriquer — une règle. **Dans `state.js`, on écrit
  par les méthodes, jamais par affectation** ; une sonde qui pose un état doit
  emprunter la porte du logiciel, ce qui est de toute façon la doctrine de
  mesure du dépôt.

**Une photo d'un élément sous la ligne de flottaison rend « hauteur 0 »** — 20 octobre 2026

- *Ce que je voulais faire* : photographier la barre de boutons d'un parcours,
  posée à 958 px dans une fenêtre haute de 844.
- *Ce qui a coûté* : deux essais et une fausse piste de mise en page.
  `s.photo` découpe sur ce que la FENÊTRE montre : un élément entièrement sous
  le bord rend un rectangle vide, et Playwright répond « Expected
  options.clip.height to be greater than 0 » — ce qui ressemble à un élément
  effondré, pas à un élément hors champ.
- *Combien de fois* : |
- *Ce qui manque* : **`sonde.photo` devrait faire `scrollIntoView` tout seul**
  avant de découper, ou dire « il est à 958 px, la fenêtre fait 844 » plutôt
  que « hauteur 0 ». En attendant, on ramène l'élément à l'écran avant.

**`\b` ne voit pas les accents, et se tait** — 20 octobre 2026

- *Ce que je voulais faire* : écarter les phrases de rangement qui ouvrent une
  consigne — « Dix marches. », « Six étapes qui se cochent. »
- *Ce qui a coûté* : un aller-retour et une fausse piste dans le découpage des
  phrases. `/\b(marches?|étapes?|…)\b/i` attrapait « marches » et laissait
  passer « étapes » : en JavaScript, `\b` se calcule sur `[A-Za-z0-9_]`, donc
  « é » est un caractère NON-mot — il n'y a aucune frontière entre l'espace et
  le « é », et `\bétapes` ne trouve JAMAIS rien. L'expression ne lève pas, elle
  ne prévient pas : elle rend simplement moins que ce qu'on croit.
- *Combien de fois* : |
- *Ce qui manque* : une règle à écrire une fois pour toutes. **Dans ce dépôt,
  tout mot français cherché dans une expression régulière s'écrit avec des
  bornes à la main** — `(?:^|[^a-zà-öø-ÿ])…(?![a-zà-öø-ÿ])` — et jamais `\b`.
  La moitié du vocabulaire porte un accent ; `\b` en perd silencieusement une
  partie. Une garde dans `npm test` sur les `\b` suivis d'une lettre accentuée
  fermerait la friction pour de bon.

**Une épreuve qui garde le moteur, pas le démarreur** — 20 octobre 2026

- *Ce que je voulais faire* : garder l'exemple qui se joue tout seul sur
  l'écran d'apprentissage.
- *Ce qui a coûté* : rien, parce que `epreuveTombe.mjs` l'a dit tout de suite —
  mais la faute mérite d'être notée parce qu'elle est SYSTÉMATIQUE. L'épreuve
  vérifiait le corps de `_jouerLExemple` (le minuteur, la borne, le repli
  `prefers-reduced-motion`) et pas la ligne qui l'APPELLE. Retirer l'appel
  laissait tout au vert et l'écran immobile.
- *Combien de fois* : ||
- *Ce qui manque* : rien à fabriquer. **Une épreuve sur une fonction neuve
  garde DEUX choses : ce qu'elle fait, et que quelqu'un l'appelle.** C'est le
  même oubli que l'outil déclaré hors de `meta.outils` — un objet parfait que
  personne ne va chercher.

**`??` ne distingue pas « nul » de « absent », et l'épreuve accuse le bon code** — 21 octobre 2026

- *Ce que je voulais faire* : vérifier qu'un parcours rangé à la racine porte
  `folder_id = NULL` au serveur, et non la chaîne « root ».
- *Ce qui a coûté* : un aller-retour complet du harnais PHP. `$ligne['folder_id']
  ?? 'pas nul'` rend `'pas nul'` quand la colonne vaut **NULL** — c'est-à-dire
  exactement quand le logiciel a raison. L'épreuve échouait sur la bonne
  valeur, et le message disait « reçu : 'absent' » pour une ligne parfaitement
  présente. J'ai cherché dans la route avant de regarder l'épreuve.
- *Combien de fois* : |
- *Ce qui manque* : une règle, de la même famille que le `+` au lieu
  d'`array_merge` déjà payé dans ce fichier. **Quand on mesure une colonne qui
  peut valoir NULL, on écrit `array_key_exists(…) && … === null`, jamais `??`.**
  Les deux opérateurs ont l'air de dire ce qu'on pense et disent autre chose.

**Une réponse à plusieurs nombres n'ouvre pas de cases toute seule** — 20 octobre 2026

- *Ce que je voulais faire* : demander une fraction irréductible et les
  exposants d'une décomposition — deux, puis trois nombres à donner.
- *Ce qui a coûté* : la question était IMPOSSIBLE à répondre, et rien ne le
  disait. Une réponse `'3|4'` est bien comprise par le pavé numérique côté
  CORRECTION, mais le nombre de CASES vient d'ailleurs : des `[data-trou]`
  que l'ÉNONCÉ déclare (`aTrous`, dans `core/activities/numeric.js`). Sans
  eux, un seul écran, où il faudrait taper « 3|4 » — ce que le pavé ne permet
  pas. Vu en ouvrant l'exercice, pas en relisant le code ; une relecture
  attentive du générateur ne pouvait pas le montrer, puisque le défaut est
  dans ce qu'il N'ÉCRIT PAS.
- *Combien de fois* : |
- *Ce qui manque* : une garde qui vaut pour tous les générateurs, pas une
  épreuve par exercice. **Dès qu'une réponse contient une barre, l'énoncé doit
  déclarer autant de `[data-trou]` qu'il y a de morceaux** — c'est vrai partout
  et ça se vérifie en trois lignes sur `allGenerators()`. À écrire dans
  `tests/catalog.test.mjs`, à côté de « un générateur qui écrit des fractions
  le déclare », qui garde exactement la même famille de promesse non tenue.

**Un `\n` écrit sur la ligne de commande devient un commentaire, et la syntaxe tient** — 20 octobre 2026

- *Ce que je voulais faire* : insérer trois lignes de commentaire et une ligne
  de code (`if (…) continue;`) dans une épreuve, avec
  `node tools/remplacer.mjs <fichier> <ancien> <nouveau>`.
- *Ce qui a coûté* : l'épreuve est tombée, et j'ai cherché le défaut dans le
  GÉNÉRATEUR pendant deux tours. `remplacer.mjs` n'interprète pas `\n` dans un
  argument de ligne de commande : les quatre lignes sont arrivées sur UNE, donc
  entièrement derrière le `//` du premier commentaire — y compris le
  `continue`. **Et `node --check` a dit « la syntaxe tient »**, parce qu'un
  commentaire très long est du JavaScript parfaitement valide. L'outil a
  annoncé « 1 remplacement écrit » et il avait raison.
- *Combien de fois* : |
- *Ce qui manque* : `remplacer.mjs` refuse déjà le texte multiligne sur la
  ligne de commande — mais `\n` n'EST pas du texte multiligne, c'est deux
  caractères. **Il devrait refuser tout argument contenant la séquence
  littérale `\n` (ou `\t`) et renvoyer vers `--depuis`** : personne n'a jamais
  voulu écrire ces deux caractères dans du code français. Un mot d'une ligne
  dans l'outil, contre un défaut que la vérification de syntaxe ne peut pas
  voir.

**La sonde jouait huit questions, en dur** — 20 octobre 2026

- *Ce que je voulais faire* : regarder les dix-sept marches d'un exercice à
  progression, à l'écran, dans l'ordre où l'élève les reçoit.
- *Ce qui a coûté* : `ouvrirExercice` montait l'étape avec `nbItems: 8`, écrit
  en dur et sans réglage. Les neuf marches suivantes rendaient un écran vide —
  `textContent` nul, zéro touche —, c'est-à-dire **exactement ce que rendrait
  un exercice cassé**. J'ai relu le générateur avant de relire la sonde.
- *Combien de fois* : |
- *Ce qui manque* : rien — c'est fait. `ouvrirExercice(id, params, { questions: 17 })`.
  Le troisième argument manquait, et il manquera pour autre chose : si une
  mesure a besoin d'un réglage d'étape (le seuil, le mélange), il a désormais
  une place où aller.

**Un exercice neuf est juste à l'écran et faux sur le papier, trois fois dans la journée** — 20 octobre 2026

- *Ce que je voulais faire* : livrer quatre exercices neufs (PGCD, problèmes,
  statistiques, probabilités).
- *Ce qui a coûté* : **trois défauts que l'écran ne pouvait pas montrer**, et
  qui rendaient des questions SANS RÉPONSE POSSIBLE sur la feuille.
  1. « Lequel de ces nombres divise 50 ? » — les quatre propositions sont des
     boutons, et une feuille n'a pas de boutons.
  2. « Laquelle de ces valeurs ne peut PAS être une probabilité ? » — le même,
     trois fois sur la même page.
  3. « … 171 ; 159 ; 165 Quelle est l'étendue ? » — l'énoncé et la question
     sont deux blocs séparés à l'écran, collés bout à bout sur la feuille.
  Chacun n'a été vu qu'en REGARDANT le PDF, après coup. `npm test` était vert,
  la sonde ne voyait rien, et l'exercice marchait parfaitement sur l'écran.
- *Combien de fois* : |||
- *Ce qui manque* : **deux gardes du catalogue, écrites aujourd'hui** — « une
  question qui dit « de ces » écrit ce qu'elle montre » et « un nombre ne se
  colle pas à la question ». Elles ferment ces trois-là pour tout le dépôt.
  **Mais la vraie friction est en amont** : rien n'oblige à regarder la feuille
  d'un exercice neuf. `tools/nouvelExercice.mjs` dit en deux cents
  millisecondes ce que `npm test` met quatre minutes à dire ; il pourrait,
  pour un identifiant donné, **imprimer la fiche et rendre l'image** — c'est le
  dernier geste qu'on oublie, et le seul que la machine ne fait pas à notre
  place.

## `remplacer.mjs` refuse la paire qu'il trouve trois fois, et n'offre rien

- *Ce qui s'est passé* : une phrase d'en-tête écrite à l'identique dans trois
  branches voisines d'un générateur — « Voici un programme de calcul : » — se
  raccourcit d'un mot. L'outil compte trois occurrences, refuse la paire, et
  n'écrit RIEN du tout : les cinq autres paires du même fichier, justes,
  tombent avec elle. Il a fallu réécrire le fichier de paires en donnant à
  chacune des trois un contexte qui la distingue — trois paires là où une
  suffisait, et quarante lignes de JSON recopiées.
- *Combien de fois* : |
- *Ce qui manque* : le refus est le bon réflexe — « j'en vois trois, lequel ? »
  est exactement la question qui sauve. Ce qui manque est la réponse : un
  `"toutes": true` sur la paire, ou mieux, un `"combien": 3` qui EXIGE le
  nombre annoncé. Dire combien on en attend est une vérification, pas un
  contournement : la paire qui en trouve quatre doit encore refuser.

## Une garde du catalogue ne voit que les marches que le CATALOGUE déclare

- *Ce qui s'est passé* : les gardes qui parcourent tout le dépôt tirent marche
  par marche en lisant `exo.params.marches` — pas la liste du générateur. Un
  exercice neuf à six marches dont l'entrée de catalogue ne déclarait aucun
  `params` a donc été mesuré sur quinze tirages tout-venant au lieu de six fois
  trois par marche. La garde des deux signes moins, écrite le jour même, a
  déclaré vert un énoncé qui portait le défaut : « l'abscisse est -2 », dans la
  PREMIÈRE marche. C'est une épreuve de fichier, écrite plus tard, qui l'a vu.
- *Combien de fois* : |
- *Ce qui manque* : `tools/nouvelExercice.mjs` sait déjà lire le générateur et
  l'entrée de catalogue côte à côte. Il lui suffirait de dire : « ce générateur
  a un réglage `marches` de six valeurs, l'entrée de catalogue n'en déclare
  aucune — les gardes du dépôt ne verront qu'un échantillon ». Deux cents
  millisecondes, là où il faut aujourd'hui se souvenir tout seul d'une
  convention que rien n'écrit.

## Un plafond de saisie écrit en dur ne se voit qu'en tapant

- *Ce qui s'est passé* : deux plafonds de frappe, écrits à la main et à des
  années d'intervalle — huit chiffres dans la dictée, SEPT dans le pavé
  numérique —, ne regardaient pas la question posée. En montant les nombres
  aux milliards, les deux sont devenus des culs-de-sac muets : l'élève entend,
  calcule juste, et le clavier cesse de répondre. Aucun des trois harnais ne
  pouvait le dire, parce qu'aucun ne TAPE : `npm test` lit des générateurs
  purs, le bout-en-bout suit un parcours sans jamais remplir un grand nombre.
  Et le pavé n'avait AUCUN plafond au clavier physique : deux élèves, deux
  logiciels, pendant des mois.
- *Combien de fois* : ||
- *Ce qui manque* : ce qu'une garde du catalogue sait faire — « aucune réponse
  n'a plus de chiffres que le pavé n'en accepte » — est maintenant écrit, et
  elle balaie chaque OPTION déclarée, pas seulement les réglages par défaut
  (sa première version était verte sur le défaut même qui l'a motivée). Reste
  la famille entière : largeur d'un champ, longueur d'une étiquette, nombre de
  colonnes d'un tableau. Un outil qui, pour un exercice, confronterait ce que
  le générateur PRODUIT à ce que l'activité ACCEPTE fermerait les trois d'un
  coup.

## Une recherche qui ne regarde que `js/` conclut qu'un champ est mort

- *Ce qui s'est passé* : en écrivant une marche neuve, j'ai cherché qui lisait
  `meta.cases` — un nombre de cases que le générateur ANNONCE —, trouvé
  personne, et retiré le champ en écrivant dans le code « rien ne lit un tel
  champ dans le dépôt, vérifié ». La recherche portait sur `js/`. Il est lu
  dans `tests/`, par une garde qui confronte TROIS sources : les morceaux de
  la réponse, les `[data-trou]` du HTML, et ce champ. Le retirer n'enlevait
  pas une redite — cela enlevait la vérification. `npm test` l'a dit tout de
  suite, mais le commentaire faux aurait survécu si l'épreuve n'avait pas
  existé.
- *Combien de fois* : |
- *Ce qui manque* : rien d'outillage — la leçon est de chercher dans `tests/`
  AUSSI avant de déclarer un champ mort, et surtout de ne pas écrire « vérifié »
  dans un commentaire sur la foi d'une seule recherche. Un commentaire qui
  affirme une mesure qu'on n'a pas faite est pire qu'un commentaire absent : le
  suivant le croira.

## Un réglage absent se tait, et rend la même image qu'un logiciel qui va bien

- *Ce que je voulais faire* : reproduire « pour l'impression du milieu d'un
  segment, les lettres se superposent ». Sa capture montre une fiche en A4
  PORTRAIT ; `tools/ficheEnPdf.mjs` sort du paysage.
- *Ce qui a coûté* : vingt minutes à regarder un PDF correct en croyant
  mesurer son défaut. J'ai ajouté `--orientation`, posé le réglage sur
  `#fq-orientation` — le sélecteur du modal des QUESTIONS —, et la fiche est
  sortie en paysage sans un mot : le modal des FICHES s'appelle
  `#fp-orientation`. Un `querySelector` qui ne trouve rien rend `null`, on
  passe le réglage, et l'image obtenue est exactement celle d'un logiciel sans
  défaut. Le défaut, lui, n'était qu'en portrait.
- *Combien de fois* : || (déjà payé sur `#pp-champs`, où le réglage était dans
  un `<details>` fermé — même symptôme, cause opposée)
- *Ce qui manque* : la règle est écrite dans `ficheEnPdf.mjs` maintenant (il
  JETTE si le sélecteur manque, et relit la valeur après l'avoir posée), mais
  elle vaut pour toute sonde : `s.doitExister` ferme ce trou pour un crochet
  qu'on LIT, et rien ne le ferme pour un réglage qu'on POSE. Un
  `s.regler(selecteur, valeur)` qui exige le sélecteur, pose la valeur et la
  relise fermerait la famille entière.

## Une épreuve qui cherche l'ABSENCE d'un mot le trouve dans le commentaire

- *Ce que je voulais faire* : garder qu'une légende d'aide ne relit plus aucune
  sauvegarde, maintenant qu'elle ne s'ouvre plus d'elle-même.
- *Ce qui a coûté* : l'épreuve est tombée tout de suite, et sur rien — le mot
  `localStorage` était dans la PHRASE qui explique qu'il n'y en a plus. Le
  fichier d'épreuves portait déjà la leçon, écrite trois mois plus tôt sur un
  autre mot : « un test qui lit les commentaires mesure la prose, pas le
  produit ». Je l'ai relue après être tombé dedans.
- *Combien de fois* : ||
- *Ce qui manque* : `sansCommentaires` existe dans `tests/helpers.mjs`, et rien
  ne pousse à s'en servir — on ne le découvre qu'après. Toute épreuve qui
  cherche l'ABSENCE d'un motif dans une source devrait le faire sur le code
  seul ; une aide `codeSeul('js/…')` à côté de `lire(…)`, et la bonne porte
  serait la plus courte.

## La structure d'un PDF ne se mesure ni à l'image, ni dans une épreuve

- *Ce que je voulais faire* : comprendre « quand je clique sur un champ
  checkbox, les autres se remplissent de caractères spéciaux ».
- *Ce qui a coûté* : la cause n'était NULLE PART ailleurs que dans les octets
  du PDF — quatre widgets du même nom de champ et du même état « on ». Ni
  l'aperçu, ni l'image du PDF, ni aucune épreuve ne pouvaient le dire, et jsPDF
  ne se charge pas hors navigateur (son paquet UMD rend un objet vide), donc on
  ne peut pas non plus fabriquer la structure dans un essai. Trois `node -e`
  écrits à la main dans la même heure pour lire la même chose.
- *Combien de fois* : |
- *Ce qui manque* : rien désormais — `node tools/champsDuPdf.mjs <fiche.pdf>`
  imprime les champs, leurs états, leurs glyphes, et nomme les trois pièges
  (noms en double, états partagés, champ déjà coché). Vérifié sur l'ANCIEN PDF
  avant de le garder : il dit les trois défauts, et se tait sur le nouveau.

## `clip` d'une capture Playwright se compte en pixels d'APPAREIL

- *Ce que je voulais faire* : découper les quatre cases d'une question dans la
  capture du visionneur PDF, pour montrer la correction à Rémy.
- *Ce qui a coûté* : trois découpes — une noire, deux blanches — avant de
  comprendre. Les coordonnées venaient d'une capture PLEINE PAGE, lue en
  pixels CSS ; avec `deviceScaleFactor: 2`, `clip` les interprète en pixels
  d'appareil et la fenêtre tombe deux fois trop loin. Rien ne le signale :
  on obtient une image, simplement pas la bonne — le même symptôme qu'un
  réglage absent qui se tait.
- *Combien de fois* : |
- *Ce qui manque* : une aide `s.photoZone(x, y, w, h)` qui divise par le
  `deviceScaleFactor` de la sonde, et qui JETTE si la zone sort de la page ou
  si l'image obtenue est unie — `s.photo` sait déjà dire « UNIE », et c'est
  exactement ce signal qui manquait ici.

## Une fenêtre qui s'ouvre DERRIÈRE celle qui l'a ouverte

- *Ce que je voulais faire* : ouvrir le scanner de QR code depuis la fenêtre
  « J'ai un code ».
- *Ce qui a coûté* : vingt minutes, et c'est le symptôme qui les a coûtées. La
  sonde disait TOUT JUSTE : la caméra tournait, la vidéo faisait 640 × 480, le
  viseur était posé, le décodeur lisait un QR et le refusait avec la bonne
  phrase. Seule la PHOTO a montré le défaut — on voyait la fenêtre du code.
  `showModal` pose `z-index: 9999` EN LIGNE, et `.modal-overlay` vaut 100 000
  dans la feuille : l'inline l'emporte sur la classe, donc la fenêtre
  fabriquée se range sous les fenêtres déclarées. Le commentaire de
  `showModal` prévient déjà pour la couche de jeu (10 000) ; il ne pouvait pas
  prévenir pour celle-ci.
- *Combien de fois* : ||
- *Ce qui manque* : une sonde demande `elementFromPoint` au centre de ce
  qu'elle croit regarder. C'est la ligne que `deplier` avait déjà apprise
  (« avant de douter de l'outil, on demande QUI est là »), et elle vaut pour
  toute fenêtre : `s.estDevant(selecteur)` qui JETTE quand autre chose est au
  premier plan fermerait la famille. Une mesure qui interroge le DOM ne voit
  pas l'empilement.

## Une sonde qui a besoin d'un drapeau de navigateur devait tout réécrire

- *Ce que je voulais faire* : mesurer le scanner, donc remplacer la caméra par
  un fichier (`--use-file-for-fake-video-capture`).
- *Ce qui a coûté* : `ouvrirSonde` lançait Chromium sans aucun argument et
  n'en acceptait pas. Pour un drapeau, il fallait refaire `monterLeSite`, le
  contexte, les écouteurs d'erreurs et de fenêtres natives — c'est-à-dire tout
  ce que `sonde.mjs` existe pour ne plus réécrire.
- *Combien de fois* : |
- *Ce qui manque* : rien désormais — `ouvrirSonde({ args: [...] })`. Et la
  caméra de papier est dans `tools/tmp/faireY4m.mjs` : quarante lignes, aucune
  dépendance, qui écrivent un Y4M montrant un QR fabriqué par le dépôt
  lui-même. À garder si l'on remesure le scanner.

## Une sonde ne voit pas une violation de CSP — elle voit un bouton absent

- *Ce que je voulais faire* : mesurer le bouton « Installer », dont l'offre est
  attrapée par un script écrit dans la page.
- *Ce qui a coûté* : vingt minutes. Le script ne s'exécutait pas — son
  empreinte n'était pas dans `.htaccess`, puisque j'avais ajouté le script
  APRÈS le dernier `csp.mjs --ecrire`. Le serveur d'essai applique la vraie CSP
  (c'est une correction d'il y a trois semaines, et une bonne), donc le
  navigateur refusait le script, l'écrivait dans la CONSOLE, et la sonde
  annonçait « erreurs : 0 » devant un bouton absent. `pageerror` ne voit pas
  une violation de CSP. `npm test` l'aurait dit — `tests/csp.test.mjs` garde
  que chaque script de la page est signé —, mais quatre minutes après, et
  seulement si j'y étais allé.
- *Combien de fois* : |
- *Ce qui manque* : rien désormais — `sonde.mjs` écoute la console et range
  les violations de CSP AVEC les erreurs de page. Toutes les sondes impriment
  déjà `s.erreurs`, et le verdict de `boutEnBout` les compte : une liste de
  plus serait une liste que personne ne regarde.

## Deux sondes, deux réponses contraires, et c'est l'une d'elles qui mentait

- *Ce que je voulais faire* : savoir si une tablette qui a seulement ouvert la
  page peut jouer HORS LIGNE.
- *Ce qui a coûté* : une demi-heure, et c'est le désaccord qui l'a coûtée. Une
  sonde disait oui, une autre disait que le module du jeu ne se chargeait même
  pas. La différence tenait à TROIS LIGNES de la sonde elle-même : la première
  calculait le code du parcours en faisant `import()` DANS la page, ce qui
  tirait des modules dans le cache du navigateur AVANT la coupure. Une
  maîtresse n'importe pas de modules. La sonde mesurait son propre échauffement.
- *Combien de fois* : |
- *Ce qui manque* : la règle, qu'on écrira sans doute encore : **tout ce qu'une
  sonde fait faire à la page AVANT la mesure fait partie de la mesure.** Quand
  on prépare un essai hors ligne, on calcule ce qu'on peut HORS de la page —
  `sonde-prepa4.mjs` encode le code côté node, et c'est ce qui a tranché. Un
  `s.couper()` qui jetterait si la page a importé quoi que ce soit depuis
  l'ouverture serait l'outil ; en attendant, la note.

## Une capture peut être vide alors que l'écran ne l'est pas

- *Ce que je voulais faire* : montrer la page de préparation à Rémy.
- *Ce qui a coûté* : trois quarts d'heure. La capture rendait UNE SEULE
  teinte ; le DOM, lui, disait tout juste — titre 508 × 40, couleur
  rgb(15, 23, 42), `visibility: visible`, et `elementFromPoint` au centre
  nommait bien la page. J'ai cherché un voile par-dessus, une police qui ne
  charge pas, un module qui repeint la page. Il n'y avait rien : le fil
  principal était occupé, et Playwright rendait la DERNIÈRE image composée.
  Ce qui a tranché : photographier l'ÉLÉMENT (240 teintes) pendant que la
  page entière en rendait 1. Deux captures du même instant, deux réponses.
- *Combien de fois* : |
- *Ce qui manque* : une sonde qui dit « UNIE » — et `s.photo` le dit déjà —
  devrait REFAIRE la capture une fois après une image d'attente avant de le
  déclarer. Un `s.photo` qui insiste coûte 16 ms et ferme une piste qui m'a
  coûté quarante-cinq minutes.

## `pdftotext` n'existe pas ici, et l'outil l'apprend après avoir écrit le PDF

- *Ce que je voulais faire* : relire la notice des tablettes dans le PDF que je
  venais d'écrire, pour ne pas livrer une feuille dont je n'aurais vu que le
  gabarit.
- *Ce qui a coûté* : dix minutes et un `ENOENT` au milieu d'une pile
  d'exceptions, APRÈS avoir produit un PDF parfaitement correct. Poppler n'est
  pas installé et ne peut pas l'être — `tools/pdfEnImage.mjs` l'écrit noir sur
  blanc en tête de fichier, et je ne l'avais pas relu. `pdfjs-dist` est dans
  `node_modules` et sait extraire le texte (`getTextContent`), à condition
  d'injecter son ouvrier dans la page, ce que `pdfEnImage` fait aussi.
- *Combien de fois* : |
- *Ce qui manque* : une aide `tools/lirePdf.mjs` — texte et nombre de pages
  d'un PDF, par `pdfjs`, sans binaire externe. Elle est aujourd'hui recopiée
  dans `tutoTablettes.mjs` ; à la deuxième copie, on la sort.

## Un cache mesuré trop tôt dit le contraire d'un cache mesuré trop tard

- *Ce que je voulais faire* : savoir ce qu'une tablette préparée garde en
  mémoire après une mise à jour, pour répondre à « Si je mets à jour atout math
  et que je réinstalle ça se met bien à jour ».
- *Ce qui a coûté* : une sonde complète lancée DEUX fois, soit dix minutes, et
  la première a failli me faire répondre le contraire de la vérité. Mesuré à
  trois secondes du rechargement : 19 fichiers, l'application ne démarre même
  pas hors ligne. Mesurée à quarante : 257 fichiers, et le jeu tourne. Entre
  les deux, le rattrapage de huit secondes d'`index.html`. Aucune des deux
  mesures n'est fausse ; une seule des deux répond à la question.
- *Combien de fois* : ||
- *Ce qui manque* : une aide `s.cacheAuCalme()` dans la sonde — elle
  échantillonne le cache du service worker jusqu'à ce que le compte cesse de
  bouger (deux relevés égaux à cinq secondes), et rend la courbe ET le palier.
  `preparerTablette.js` a déjà écrit `attendreLeRangement` pour la page ; la
  sonde la réécrit à la main à chaque fois.

## Un numéro de version cité dans un commentaire bloque le rituel

- *Ce que je voulais faire* : expliquer dans `sw.js`, à la place où la décision
  se prend, pourquoi on ne reprend pas les adresses portant un `?v=` périmé —
  avec l'exemple chiffré, comme tout le reste du dépôt.
- *Ce qui a coûté* : une sonde de dix minutes morte au milieu, sur
  « ON NE MONTE RIEN : sw.js porte 2 numéros différents (1069, 1070) ». Le
  rituel compte les `?v=NNN` du FICHIER ENTIER, commentaires inclus ; mes deux
  exemples étaient donc deux versions contradictoires. Le message accuse
  `sw.js` et ne dit pas que la contradiction est une phrase — on relit six
  occurrences de balises avant de penser à sa propre prose.
- *Combien de fois* : |
- *Ce qui manque* : que `tools/version.mjs` dise OÙ sont les numéros qu'il
  trouve (ligne et texte autour) quand il refuse. Trois lignes de plus dans le
  message, et la piste est immédiate au lieu d'être une relecture.

## Compter les requêtes réseau : trois outils, trois réponses fausses

- *Ce que je voulais faire* : savoir combien de requêtes une tablette envoie
  pour se préparer, avant et après le paquet hors ligne. C'est le chiffre qui
  justifiait toute la tâche.
- *Ce qui a coûté* : quatre mesures et près d'une heure, et chacune avait l'air
  juste. `page.on('request')` : 578 — il compte ce que la page DEMANDE, y
  compris ce que le service worker sert depuis son cache. `performance` +
  `transferSize` : 1 — une réponse rendue PAR un service worker porte toujours
  `transferSize: 0`, et les requêtes du worker ne sont pas dans le
  `performance` de la page. Le tampon de `performance` : 250 entrées, plein, il
  cesse d'enregistrer sans rien dire. Et enfin le journal du serveur, pris trop
  tôt : 271, parce que la page précédente rangeait encore en arrière-plan. La
  vraie réponse était 38.
- *Combien de fois* : ||||
- *Ce qui manque* : c'est fait — `s.requetesServies()` et `s.attendreLeCalme()`
  sont dans `tools/sonde.mjs`, avec les trois pièges écrits à côté. Toute sonde
  qui voudra compter des requêtes les retrouvera tendus.

## Un garde qui cherche un nom de fichier trouve son propre commentaire

- *Ce que je voulais faire* : garder l'ordre de chargement dans `index.html` —
  le paquet hors ligne AVANT `js/app.js`, sans quoi il coûte au lieu de gagner.
- *Ce qui a coûté* : un aller-retour d'`epreuveTombe`, qui a dit « CETTE
  ÉPREUVE NE GARDE RIEN ». L'épreuve cherchait `amorcePreparation.js` dans
  `index.html` et trouvait le COMMENTAIRE que je venais d'écrire au-dessus des
  lignes à garder. Deuxième fois dans la journée qu'un garde mesure ma prose :
  l'autre cherchait `.keys()` et trouvait `caches.keys()`.
- *Combien de fois* : ||
- *Ce qui manque* : rien de neuf — `sansCommentaires` existe pour les sources
  JavaScript, mais pas pour HTML. La vraie règle est plus simple et vaudrait
  d'être écrite dans `epreuveTombe` quand il annonce une épreuve creuse :
  **chercher la FORME exécutable** (`import('./x.js')`), jamais le nom seul.

## `nouvelExercice.mjs` ne dit pas qu'il ne connaît pas l'identifiant

- *Ce que je voulais faire* : vérifier le nouvel exercice `frac-graduation`
  avec l'outil prévu pour ça, juste après l'avoir ajouté au catalogue.
- *Ce qui a coûté* : dix minutes et une fausse assurance. L'ajout avait ÉCHOUÉ
  — `remplacer.mjs` n'avait pas trouvé son point d'ancrage —, et l'outil a
  répondu « Les quatre pièges sont évités. 244 exercices » sans un mot sur
  l'identifiant qu'il venait de recevoir et qui n'existe nulle part. J'ai cru
  l'exercice en place ; c'est l'impression de la fiche, plus loin, qui a fini
  par tomber.
- *Combien de fois* : |
- *Ce qui manque* : que `tools/nouvelExercice.mjs` dise « cet identifiant
  n'est pas au catalogue » quand on lui en passe un qu'il ne trouve pas. Un
  outil de vérification qui félicite sur une question qu'il n'a pas comprise
  est pire qu'un outil absent.

## `remplacer.mjs` ne dit pas combien de lignes il efface — 2026-10-21

- *Ce que je voulais faire* : remplacer un bloc d'une quinzaine de lignes dans
  `js/ui/portailUI.js`, bloc que j'avais découpé entre deux ancres avec un
  petit script Python.
- *Ce qui a coûté* : vingt minutes, et il s'en est fallu d'un `git diff`. Mon
  ancre de fin était plus bas que je ne le croyais : le bloc faisait 6 609
  caractères et emportait 77 lignes — `ressembleAUneSeance`, `ressembleAUnBillet`
  et toute la fonction `connecter`. `remplacer.mjs` a répondu « ok paire 1 :
  1 occurrence(s) » en imprimant les cinquante premiers caractères du motif, et
  `node --check` a confirmé que « la syntaxe tient » : une fonction supprimée
  dont l'appel reste ne casse rien à la compilation, elle jette à l'exécution,
  c'est-à-dire en classe.
- *Combien de fois* : |
- *Ce qui manque* : que `remplacer.mjs` annonce le VOLUME quand il dépasse
  quelques lignes — « −77 lignes, +12 » — et, au-delà d'un seuil, demande
  confirmation ou exige un drapeau. Un outil qui imprime cinquante caractères
  d'un motif de six mille ne montre pas ce qu'il fait.

## Une sonde qui regarde l'écran d'AVANT arrive toujours trop tard — 2026-10-21

- *Ce que je voulais faire* : mesurer la porte d'entrée d'une tablette hors
  ligne — le bouton du scanner, la phrase sous la case, la caméra qui s'ouvre
  seule — avec une caméra de papier (`--use-file-for-fake-video-capture`).
- *Ce qui a coûté* : deux reprises de la sonde, une quinzaine de minutes. La
  caméra montrait le bon QR : il est décodé en moins de 300 ms, donc le
  parcours était DÉJÀ ouvert quand la sonde regardait la porte, et la mesure
  annonçait « bouton ABSENT » devant un logiciel qui marchait. Deuxième essai
  avec un QR étranger : il referme le scanner lui aussi, et écrase la phrase
  qu'on voulait lire.
- *Combien de fois* : ||
- *Ce qui manque* : c'est fait — `tools/qrEnCamera.mjs --blanc` fabrique un mur
  blanc, qui laisse la fenêtre ouverte aussi longtemps qu'on veut. La règle
  générale est plus large et vaut d'être retenue : **pour mesurer un écran, il
  faut une entrée qui ne le fasse pas changer.**

## `[hidden]` ne cache rien quand une classe pose `display` — 2026-10-21

- *Ce que je voulais faire* : montrer un bouton de la barre du bas seulement
  hors ligne, en posant et retirant l'attribut `hidden`.
- *Ce qui a coûté* : une reprise de la sonde, dix minutes. `.bottom-nav-btn`
  impose `display: flex`, et la règle du navigateur — `[hidden] { display:
  none }` — pèse moins qu'une classe : l'attribut était mis, et le bouton
  occupait toujours ses 98 px. Le dépôt porte DÉJÀ ce piège, écrit noir sur
  blanc au-dessus de `.game-icon-btn[hidden]` dans `css/games.css` — la
  calculatrice restée sur soixante-cinq exercices.
- *Combien de fois* : ||
- *Ce qui manque* : une épreuve de la maison qui parcourt les feuilles, relève
  toute classe posant `display:` sur un sélecteur employé avec `hidden` dans
  `index.html`, et exige la règle `[hidden]` correspondante. Ce piège ne se
  voit jamais en relisant : le code fait ce qu'il annonce, c'est l'écran qui
  ment.

## Pour mesurer un écran, il faut une entrée qui ne le fasse pas changer — 2026-10-21

- *Ce que je voulais faire* : regarder l'écran d'accueil qui revient quand
  l'élève touche « Accueil », sur une tablette hors ligne.
- *Ce qui a coûté* : une reprise de sonde, dix minutes — et la sonde
  ANNONÇAIT UN LOGICIEL CASSÉ. La caméra de papier montrait le QR du tableau ;
  l'écran d'accueil revient, sa caméra s'ouvre toute seule, relit le QR qui est
  toujours devant l'objectif, et rouvre le parcours. En 1,3 s il ne restait
  qu'une couche de jeu, et la mesure disait « l'écran d'accueil ne revient
  pas ».
- *Combien de fois* : ||| (la même famille : caméra trop rapide, QR étranger
  qui referme le scanner, et maintenant QR qui rouvre ce qu'on venait de
  quitter)
- *Ce qui manque* : rien à fabriquer — `tools/qrEnCamera.mjs --blanc` existe
  depuis la deuxième fois. C'est la RÈGLE qui manquait, et elle vaut au-delà
  des caméras : **pour mesurer un écran, il faut une entrée qui ne le fasse pas
  changer.** Elle est maintenant écrite dans CLAUDE.md, à côté de l'outil.

## Une carte du catalogue existe sans se voir — 2026-10-22

- *Ce que je voulais faire* : glisser un exercice de la bibliothèque jusqu'au
  parcours, dans une sonde, pour mesurer où le dépôt est accepté.
- *Ce qui a coûté* : trente secondes de sonde, puis dix minutes à chercher le
  défaut dans le logiciel. `doitExister('.exo-list-item')` passait au VERT —
  les 252 cartes sont bien dans la page —, et Playwright répétait ensuite
  cinquante-huit fois « element is not visible » sur la première d'entre elles.
  Leur accordéon `#view-accordion` est en `display: none` tant qu'on n'a pas
  cherché. Un `elementFromPoint` a nommé le coupable en une ligne.
- *Combien de fois* : ||| (la famille de `doitExister` et de `deplier` : un
  crochet qui existe, qui se mesure « présent », et qui ne se voit pas)
- *Ce qui manque* : fait — `s.chercherDansLeCatalogue(mot)` dans
  `tools/sonde.mjs` tape dans le champ comme le professeur, exige qu'au moins
  une carte paraisse, et rend les titres. Une sonde ne retombera plus dedans.

## Une commande refusée au milieu d'une chaîne laisse mesurer le code d'avant — 2026-10-22

- *Ce que je voulais faire* : vérifier qu'une sonde neuve devient ROUGE sur
  l'ancien code — remettre le défaut, lancer la sonde, remettre le fichier.
- *Ce qui a coûté* : un faux verdict, et il était rassurant. `remplacer.mjs` a
  refusé le texte multiligne passé en ligne de commande (il a raison, c'est sa
  garantie), mais les commandes suivantes de la même chaîne se sont exécutées
  quand même : la sonde a mesuré le code INTACT et annoncé « ON PEUT DÉPOSER
  JUSQU'EN BAS ». J'allais croire avoir vu la sonde tomber.
- *Combien de fois* : |
- *Ce qui manque* : `epreuveTombe.mjs` fait déjà tout cela correctement pour
  une ÉPREUVE — il abîme, relance, exige la chute, et remet le fichier quoi
  qu'il arrive. Il ne sait pas lancer une SONDE (qui veut un serveur et un
  navigateur). Si le cas revient, ce sera l'outil à fabriquer : `sondeTombe`,
  même garantie, pour ce qui se mesure dans la vitre.

## `atelier.js` est un seul gabarit : tout commentaire qu'on y écrit est dedans — 2026-10-23

- *Ce que je voulais faire* : ajouter une zone de dépôt et un bouton au carnet
  de l'Atelier, avec les commentaires que la maison demande.
- *Ce qui a coûté* : **deux fois** le piège de l'accent grave, dans la même
  heure. `atelier.js` construit son panneau ET ses styles dans un seul gabarit
  de six cents lignes : un commentaire HTML, un commentaire CSS, tout ce qu'on
  y écrit est À L'INTÉRIEUR. Citer un fichier ou une fonction entre accents
  graves — ce qu'on fait partout ailleurs — ferme le gabarit. La première fois
  `remplacer.mjs` a refusé et remis le fichier ; la seconde, `node --check` a
  désigné « Unexpected identifier 'tests' » vingt lignes plus loin.
- *Combien de fois* : || (dans ce fichier ; sept autres avant lui, ailleurs)
- *Ce qui manque* : rien de neuf à fabriquer — le hook et `remplacer.mjs`
  attrapent déjà. Ce qui manquait est la RÈGLE, et elle est locale : **dans
  `atelier.js`, on cite sans accents graves.** Écrite ici pour qu'on la
  retrouve, parce que c'est le seul fichier du dépôt où elle s'applique à
  CHAQUE commentaire.
