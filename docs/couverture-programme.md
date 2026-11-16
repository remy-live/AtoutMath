# Ce que le programme de collège demande, et ce qu'AtoutMath en couvre

> Rémy, le 16 novembre 2026 : « ai je oublié des choses dans le programme de
> collège ? »

Ce document est une réponse datée, pas une vérité permanente. Il se refait avec
les commandes qui sont au bout.

## 0. La méthode, et ce qu'elle ne voit pas

Trois mesures croisées :

1. **Les compétences déclarées** — `js/data/skills.js`, 204 entrées, chacune
   avec son chemin (domaine > sous-domaine) et ses niveaux.
2. **Les compétences réellement travaillées** — on lit les 151 générateurs de
   `js/core/generators/` et l'on relève leurs `skills:`. C'est de là que vient
   le `skillId` porté par chaque question, donc c'est CE lien-là qui nourrit le
   bilan par compétence. **Le catalogue n'est pas la bonne source** : 156 des
   281 exercices ne déclarent aucun `skills:`, et ce n'est pas un défaut — ils
   le tiennent de leur générateur. Une première mesure prise du côté du
   catalogue a annoncé « 101 compétences orphelines » ; il y en a neuf.
3. **Les notions du programme sans compétence du tout** — c'est là que sont les
   vrais trous, et aucune des deux premières mesures ne les voit : une notion
   qu'on n'a jamais écrite n'apparaît nulle part comme manquante.

**Ce que cette méthode ne voit pas** : un exercice peut travailler une notion
sans que son titre ni ses mots-clefs la nomment. Les trous listés ici ont été
cherchés par mot ET par compétence, mais la liste reste à relire par quelqu'un
qui connaît le contenu de chaque exercice — c'est-à-dire par Rémy.

```sh
node -e "import('./js/data/skills.js').then(m=>console.log(Object.keys(m.SKILLS).length))"
```

## 1. L'état au 16 novembre 2026

281 exercices · 204 compétences · 190 compétences travaillées par un
générateur.

**Neuf compétences déclarées qu'aucun générateur ne cite** — toutes du
vocabulaire, et probablement couvertes en pratique par « Le Mot Juste », « Le
Pendu Mathématique » et « Mots Croisés Mathématiques », qui citent d'autres
identifiants :

    num.calc.decomposition      num.vocabulaire.division
    num.vocabulaire.multiples   num.vocabulaire.nombres
    num.vocabulaire.resultat    num.vocabulaire.traduire
    geo.notation.dire           geo.notation.ecrire      geo.notation.lire

Ce n'est pas un trou du programme : c'est un rattachement à vérifier.

## 2. Les trous francs, par ordre d'importance

### 2.1 Les volumes — rien, à aucun niveau

C'est le plus gros manque. Il n'existe ni compétence `mes.volume.*` ni
exercice. Le seul voisin est « Combien de Cubes ? », qui DÉNOMBRE un empilement
et ne calcule aucun volume.

| Niveau | Ce que le programme demande |
| --- | --- |
| 6ème | volume du pavé droit et du cube ; contenances (L, dL, cL) |
| 5ème | volume du prisme droit et du cylindre |
| 4ème | volume de la pyramide et du cône |
| 3ème | volume de la boule |

Et avec eux les conversions qui coincent tous les ans : 1 L = 1 dm³,
1 m³ = 1 000 L, et le passage m³ ↔ cm³ qui n'est pas celui des longueurs.

### 2.2 Algorithmique et programmation — rien

Thème à part entière du programme, du cycle 3 au cycle 4, et le logiciel n'en
a aucune compétence. Ce qui manque : instruction, séquence, **boucle**,
**variable**, **test (si… alors)**, et la lecture d'un script type Scratch.

Les voisins existants ne le couvrent pas : `geo.espace.programme` fait exécuter
un déplacement, `geo.construction.programme` fait écrire un programme de
construction. Ce sont des cousins utiles, pas le thème.

### 2.3 Trigonométrie (3ème) — on nomme, on ne calcule pas

« Hypoténuse, Opposé, Adjacent » apprend à repérer les côtés (`geo.trigo.cotes`).
Il manque ensuite tout : choisir entre cosinus, sinus et tangente, calculer une
longueur, calculer un angle.

### 2.4 Agrandissement–réduction et homothétie (4ème–3ème) — rien

Aucune compétence, aucun exercice. Attention au faux ami : « Carrés, Cubes et
Réduction » est du calcul littéral sur les exposants, pas de l'agrandissement.
Manquent en particulier **l'effet d'un rapport k sur les aires (k²) et sur les
volumes (k³)**, qui est une faute de brevet chaque année.

### 2.5 Les diagrammes statistiques — rien

« Moyenne, Médiane, Étendue » couvre les indicateurs. Il n'y a rien pour LIRE
ni pour choisir un diagramme en bâtons, un diagramme circulaire, un
histogramme — alors que c'est la moitié du chapitre.

### 2.6 Deux propriétés de 5ème qui manquent

- **La somme des angles d'un triangle** vaut 180° : aucune compétence.
- **L'inégalité triangulaire** : aucune compétence.

Elles se raisonnent et se calculent ; elles ne demandent aucune construction,
donc rien dans la ligne rouge ne les empêche.

### 2.7 L'aire du triangle et du parallélogramme (5ème)

`mes.aire.rectangle` et `mes.aire.disque` existent. Le triangle n'a que son
PÉRIMÈTRE (`mes.perimetre.triangle`), et le parallélogramme n'a rien.

### 2.8 La fonction linéaire (3ème)

`alg.fonction.image`, `.antecedent`, `.graphique` existent, et « Tracer une
Fonction » traite l'affine. Manquent le cas linéaire comme tel et **son lien
avec la proportionnalité**, qui est précisément ce que le programme demande
d'établir.

### 2.9 Les échelles (plans, cartes, maquettes)

Autre faux ami : « L'Échelle des Tailles » porte sur les puissances de 10. Il
n'y a rien sur une échelle 1/25 000.

### 2.10 Plus marginal

- **Sections de solides** (3ème) : section d'un pavé, d'un cylindre.
- **Repérage sur la sphère** : latitude, longitude.
- **La réciproque de Thalès** — `geo.thales` est seul, alors que Pythagore a
  bien sa réciproque (`geo.pythagore.reciproque`).
- **Le quotient de deux relatifs** — `num.relatifs.somme` et `.produit`
  existent ; la division n'a pas sa compétence, même si « Le Ninja des Deux
  Règles » la frôle.

## 3. Ce qui est mince, mais présent

Un seul exercice chacun, pour deux niveaux : **les probabilités** (7 marches
tout de même), **les statistiques**, **le tableur**. Ce n'est pas un oubli,
c'est une épaisseur à décider.

## 4. Ce qui est absent EXPRÈS, et qu'il ne faut pas compter comme un trou

> « Je ne veux pas de construction géométrique avec des outils virtuels. Rien ne
> remplace le geste. Ce sera ma ligne rouge pour ce logiciel. »

Donc : pas de tracé à la règle et au compas, pas de médiatrice ni de
bissectrice construites à l'écran, pas de report d'angle au rapporteur, pas de
construction de triangle. Le logiciel prend ces chapitres par l'autre bout —
« Écris le programme de construction », « Rédiger une Justification », « Lire un
codage » — et l'élève trace sur son cahier. C'est une décision, pas un manque.

Même chose pour la 2nde (intervalles, valeur absolue, racines) : c'est au-delà
du collège, et c'est assumé.

## 5. Le calendrier des programmes, à novembre 2026

Trois textes différents s'appliquent en même temps dans son collège :

| Classe | Programme en vigueur |
| --- | --- |
| 6ème | cycle 3, BO n° 16 du 17 avril 2025 (appliqué depuis la rentrée 2025) |
| 5ème | cycle 4 NOUVEAU, BO n° 10 du 5 mars 2026 (arrêté du 18 février 2026) |
| 4ème | cycle 4 de 2020 — le nouveau arrive à la rentrée 2027 |
| 3ème | cycle 4 de 2020 — le nouveau arrive à la rentrée 2028 |

Les trous listés plus haut sont des notions présentes dans les deux versions du
cycle 4 ; aucun ne dépend de la bascule. Mais **le détail du nouveau programme
de 5ème n'a pas été relu ligne à ligne ici** — c'est le travail suivant, et il
demande le texte officiel, pas une mémoire.

## 6. Comment refaire cet inventaire

```sh
# combien de compétences, et lesquelles aucun générateur ne cite
node -e "…"   # voir §0, mesure n° 2 : lire les 151 générateurs, pas le catalogue

# un exercice existe-t-il sur une notion ?
node -e "import('./js/data/catalog.js').then(c=>console.log(
  c.exercices.filter(e=>((e.title||'')+' '+(e.motsClefs||[]).join(' '))
    .toLowerCase().includes('volume')).map(e=>e.title)))"
```
