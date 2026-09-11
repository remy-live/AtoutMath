# GéoMaster, embarqué

`index.html` est une copie du projet **GéoMaster** — la règle, l'équerre, le
compas et le rapporteur qu'on manipule à la souris comme au doigt. Il est
servi tel quel dans un cadre (`<iframe>`) par l'atelier de géométrie
d'AtoutMath (`js/games/geometrie.js`).

## Pourquoi une copie, et pas un portage

Le moteur de GéoMaster tient à sa page : il adresse une soixantaine
d'éléments par leur identifiant (le tiroir de la frise, la calculatrice, le
panneau de scénario, les boutons de rejeu…). L'extraire pour le remonter dans
AtoutMath reviendrait à le réécrire, donc à casser ce qui marche. On l'intègre
tel quel.

## La seule modification : un pont

Un `<script>` a été greffé **juste avant le dernier `</body>`** de la page.
Attention en cas de mise à jour : `</body>` apparaît quatre fois dans le
fichier — trois sont à l'intérieur de bibliothèques embarquées. C'est le
DERNIER qui compte.

Le pont ne fait rien tant que la page est ouverte seule (`window.parent ===
window`). Dans un cadre, il :

- annonce `pret` quand le moteur est monté **et** la feuille en page ;
- répond à `etat` par la sérialisation de la construction, le compte d'objets
  par type, et le rectangle **visible** de la feuille ;
- accepte `charger` pour poser une figure de départ, qui devient le fond de
  l'historique (« annuler » ne peut donc pas effacer l'énoncé) ;
- referme une fois la palette d'apparence, qui s'ouvre d'elle-même et couvre
  le tiers droit de la feuille.

Il n'ajoute aucun style, ne touche à aucun outil, et n'appelle que des
méthodes publiques déjà présentes (`serialize`, `deserialize`, `render`,
`toggleStylePalette`, `updateButtons`).

Un piège à connaître : `#geoCanvas` est une feuille **fixe de 3000 × 2000**,
rognée par son conteneur et déplacée par la transformation de vue. La taille
rendue par le pont est donc celle du rectangle vu, ramenée à l'échelle et à
l'origine de la vue — sans quoi les figures de départ se posent hors écran.

## Poids

3,2 Mo, dont environ 1,8 Mo de bibliothèques PDF embarquées (jsPDF, pdf.js et
son worker), chargées seulement à l'usage. La page n'est demandée que lorsque
l'atelier s'ouvre : elle ne pèse sur aucun autre écran.

## Licence

Creative Commons **Attribution – Pas d'Utilisation Commerciale – Partage dans
les Mêmes Conditions 4.0 International** (CC BY-NC-SA 4.0). Le texte complet
est dans `LICENSE`.
