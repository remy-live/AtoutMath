# Changer le jeu de pièces d'échecs

Les pièces affichées à l'écran et imprimées sur les fiches sont **dessinées**,
pas écrites avec une police. C'est un choix imposé par deux contraintes :

- **La police ment sur la taille.** Les caractères Unicode (`♛ ♚`) portent leur
  propre vide autour d'eux, et ce vide varie selon l'appareil. Sur un iPhone les
  pièces se retrouvaient petites et décalées dans leur case, et aucun réglage de
  `font-size` n'y pouvait rien.
- **Le PDF ne connaît pas ces caractères.** La police du document est en
  WinAnsi : `♛` n'y existe pas et sort en `?`.

Les dessins livrés avec l'application sont faits maison (`js/ui/piecesEchecs.js`),
en formes simples. Ils sont lisibles à petite taille, mais on peut faire mieux.

## Installer un jeu de pièces

1. Récupérer douze fichiers SVG, un par pièce et par couleur. Sur
   [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces),
   les fichiers du jeu standard s'appellent :

   | | Blanc | Noir |
   |---|---|---|
   | Roi | `Chess_klt45.svg` | `Chess_kdt45.svg` |
   | Dame | `Chess_qlt45.svg` | `Chess_qdt45.svg` |
   | Tour | `Chess_rlt45.svg` | `Chess_rdt45.svg` |
   | Fou | `Chess_blt45.svg` | `Chess_bdt45.svg` |
   | Cavalier | `Chess_nlt45.svg` | `Chess_ndt45.svg` |
   | Pion | `Chess_plt45.svg` | `Chess_pdt45.svg` |

2. Les mettre dans un dossier, par exemple `icons/pieces/`.

3. Lancer :

   ```
   node outils/importerPieces.mjs icons/pieces "Pièces : Cburnett, Wikimedia Commons, CC BY-SA 3.0"
   ```

C'est tout. L'outil écrit `js/ui/piecesImportees.js`, et l'application s'en sert
aussitôt — l'écran comme la fiche imprimée. Pour revenir aux dessins maison, il
suffit de remettre dans ce fichier les trois lignes `export … = null`.

## Ce que l'outil sait faire, et ce qu'il ne sait pas

Il lit les `<path>` et leurs couleurs (`fill`, `stroke`, `stroke-width`), garde
la distinction entre une forme pleine et un simple trait — remplir la crinière
d'un cavalier la transformerait en tache — et calcule **un cadre commun aux
douze pièces**, de sorte que les tailles relatives soient conservées : un pion
reste plus petit qu'un roi.

Il **ne lit que les `<path>`**. Un fichier contenant des `<circle>`, `<rect>` ou
des groupes transformés est accepté mais l'outil **prévient** que ces formes ne
seront pas dessinées : mieux vaut un avertissement qu'un dessin amputé qu'on
découvre à l'impression.

Le PDF est le point délicat : jsPDF ne sait pas lire un `path`. Le lecteur
`js/ui/cheminSvg.js` traduit la syntaxe SVG (`M L H V C S Q T Z`, absolues et
relatives) en déplacements de Bézier que jsPDF accepte. Les arcs (`A`) sont
approchés par un segment — aucun jeu de pièces courant n'en contient, et un arc
silencieusement faux serait pire qu'un arc grossier signalé.

## La licence

**Elle n'est pas un détail.** Le jeu le plus répandu sur Commons (celui de
Cburnett) est sous **CC BY-SA 3.0** et GFDL : il faut citer l'auteur partout où
les pièces sont distribuées. C'est pourquoi l'outil demande une mention, et
pourquoi cette mention est imprimée **en bas des fiches** qui montrent des
pièces — pas seulement rangée dans le code.

Si tu préfères éviter la contrainte de partage à l'identique, Commons héberge
aussi des jeux dans le domaine public ; l'outil les installe de la même façon.
