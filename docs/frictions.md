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
- **Combien de fois** : |||||||||  (neuf sondes dans la journée)
- **Ce qui manque** : un module `tools/sonde.mjs` qui rende une page déjà
  identifiée — professeur **ou** élève, billet compris — et qui collecte seul
  les erreurs de page et les fenêtres natives.
