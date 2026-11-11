# Le plateau des nombres — notice de fonctionnement

*Écrit pour quelqu'un qui a trente élèves devant lui et quarante secondes pour
décider. Tout ce qui est long à lire est en bas.*

---

## 1. En une minute

1. **Mes classes** → votre classe → onglet **Le direct**.
2. Dans la barre, l'onglet **🎲 Le plateau**.
3. Choisissez **sur quoi on joue** (une table, plusieurs, les grands nombres),
   laissez le reste tel quel, et **🎲 Lancer à la classe**.

Les élèves voient un compte à rebours de **douze secondes**, puis le terrain
s'ouvre tout seul sur les trente tablettes, **le même pour tous**. Au bout du
temps, chacun voit le score des deux équipes.

> **Essayez d'abord en démo.** Le bouton **▶ Essayer en démo**, juste à côté,
> ouvre la même partie sur votre seul écran, contre des pions tenus par
> l'ordinateur. C'est exactement le jeu que la classe va jouer — mêmes règles,
> mêmes réglages, même terrain. Deux minutes bien placées.

---

## 2. La règle, en trois phrases

- **Chaque joueur porte un nombre**, écrit dans son rond.
- **Des nombres sont posés sur le terrain.** Deux joueurs qui se retrouvent sur
  le même carré le prennent **si leurs nombres le donnent** : *7 et 8 prennent
  le 56*.
- **À trois, ça vaut le double.** *2, 4 et 7 prennent le 56* — et ça rapporte
  deux fois plus. C'est le geste difficile du jeu, donc celui qui paie.

Et la règle qui fait tout tenir, celle de Rémy mot pour mot : *« si c'est un
rouge et un bleu qui se rejoignent les points sont partagés »*. On n'est donc
**jamais bloqué faute de coéquipier** — et il y a un vrai choix à faire :
attendre son équipe pour tout gagner, ou prendre l'adversaire qui est déjà là
pour la moitié, tout de suite.

Quand un nombre est pris, **un autre apparaît ailleurs** : le terrain ne
s'épuise pas.

---

## 3. Les réglages, et ce qu'ils changent vraiment

| Réglage | Ce que ça change |
| --- | --- |
| **× ou +** | Les carrés se prennent par multiplication ou par addition. En addition, la sixième joue aussi. |
| **Sur quoi on joue** | Une table, les tables dures (6, 7, 8), les petites, ou les grands nombres. **C'est le réglage qui accorde le jeu à votre séance** : sans lui, le plateau tire dans les huit tables mélangées. |
| **Comment on change de nombre** | *En répondant* : pour devenir 7, il faut répondre à une question. *En ramassant* : on passe sur une borne posée sur le terrain. *Librement* : on choisit, sans rien justifier. |
| **Les prénoms** | Écrits au-dessus des ronds. Ça répond à la vraie difficulté du jeu — **trouver qui porte le 8 parmi trente ronds** — au prix de prénoms affichés. À vous. |
| **Ce que coûte une erreur** | Seulement avec *en répondant* : c'est le seul endroit du jeu où l'on peut avoir tort. *Figé 4 s* se voit du fond de la classe et ne désigne personne au score. *−20 points* coûte **à l'équipe**, ce qui est plus dur. |
| **Combien de joueurs** | **Donnez le nombre d'élèves de la classe**, pas celui des connectés : c'est lui qui taille le terrain, et il doit être le même pour les trente. |
| **Combien de temps** | Deux, trois ou cinq minutes. Trois est le bon chiffre pour une première fois. |

---

## 4. Ce que les élèves font avec leurs doigts

Trois conduites, et les trois marchent en même temps :

- **Le doigt posé sur le terrain** — le rond va vers le doigt. C'est le geste le
  plus naturel sur tablette, et celui qui demande le moins d'explications à un
  sixième.
- **La manette**, en bas de l'écran, tenue au pouce.
- **Les flèches du clavier**, tenues enfoncées — la salle informatique.

Sous chaque rond, l'écran dit ce qu'il manque : **« 56 — il manque un 8 »**.
C'est le moment d'enseignement du jeu : une décomposition lue à voix haute par
l'écran, au moment où l'élève en a besoin.

---

## 5. Ce que vous voyez pendant que ça joue

Dans l'onglet **🎲 Le plateau**, une ligne qui se rafraîchit toute seule :

> *En jeu — **54** à **18**, 27 élève(s) sur le terrain, 3 nombre(s) pris,
> 112 s restantes.*

C'est ce qu'on annonce à voix haute en passant dans les rangs. Le bouton
**■ Arrêter** apparaît à côté : il referme le terrain sur les trente tablettes
et affiche le score final.

---

## 6. Ce qui est tenu par le serveur, et pourquoi ça compte

- **Qui est arrivé le premier.** Deux élèves ramassent le même nombre dans la
  même demi-seconde — c'est la situation **normale** à trente, pas un cas
  limite. Le serveur tranche, et le nombre n'est compté qu'**une** fois.
- **L'horloge.** Une tablette passée en arrière-plan fige ses minuteurs ; le
  temps restant vient du serveur à chaque seconde, donc les trente finissent
  **ensemble**.
- **La punition.** Un élève figé qui recharge sa page reste figé. Une punition
  qu'on efface en tirant la page vers le bas n'est pas une punition.
- **Les équipes.** Le serveur prend une ligne sur deux dans l'ordre de votre
  liste. Rien à régler : deux minutes de négociation en classe, ce sont deux
  minutes de jeu en moins.

Et ce qu'il ne tient **pas** : les règles du jeu. Il ne sait pas que 7 × 8 font
56. Ces règles-là vivent au même endroit pour la démo et pour la classe — c'est
ce qui garantit que ce que vous essayez est ce que vous lancez.

---

## 7. Mesuré, pour que vous n'ayez pas à y croire

- **Trente ardoises, un battement par seconde** : 600 requêtes servies sur 600,
  médiane 28 ms, aucun blocage de base. À quatre battements par seconde aussi.
- **Quatre-vingt-une prises réclamées en même temps** : 81 accordées, 81
  distinctes. Aucun nombre compté deux fois.
- **Trois vrais navigateurs qui jouent** (`tools/plateauEnClasse.mjs`) :
  terrains identiques carré par carré, avant et après une prise ; une prise
  faite à deux comptée **une** fois ; zéro erreur de page.

---

## 7 bis. Les quatre jeux sont aussi dans le catalogue

Rémy : « j'aimerai bien avoir les jeux plateaux dispo/demo dans les derniers
jeux ». C'est fait : **Le Plateau des Nombres**, **Le Chat Perché**, **La Ruée**
et **La Pluie de Nombres** sont quatre exercices comme les autres.

- On les trouve dans **« Les derniers exercices »**, dans la **recherche**, et
  par leur **code dicté** : `LT`, `HC`, `RU`, `LU`.
- On peut les poser dans un **parcours** ou dans le **bac à sable** : un élève
  qui a fini son travail joue seul, contre des pions tenus par l'ordinateur —
  qui lisent le terrain avec les mêmes règles que lui et se trompent aussi.
- Ils gardent **tous leurs réglages** : la table travaillée, l'opération, la
  façon de changer de nombre, la pénalité, le nombre de joueurs, la durée.

> **Ce n'est pas la même chose que « Lancer à la classe ».** Depuis le
> catalogue, chacun joue **sa** partie, seul contre l'ordinateur. Pour que les
> trente jouent **ensemble, sur le même terrain**, c'est le bouton de l'onglet
> 🎲 Le plateau, et lui seul.

---

## 8. Ce que ça ne fait pas

- **Pas de note.** Aucun point du plateau n'entre dans le bilan d'un élève.
  C'est un jeu de classe, et il doit le rester — et c'est vrai aussi quand il
  est ouvert depuis le catalogue.
- **Pas encore les trois jeux vifs.** *Le chat perché*, *la ruée* et *la pluie*
  se jouent en démonstration ; ils ne se lancent pas encore à la classe, parce
  que leur terrain se remet en place au hasard sur chaque tablette. C'est la
  suite du travail.
- **Pas de reprise.** Une partie arrêtée est arrêtée ; on en relance une.
- **Pas de choix d'équipe**, ni de choix du terrain : la graine est tirée par le
  serveur, donc personne ne peut retomber sur un terrain qu'il connaît déjà.

---

*Une remarque, un réglage qui manque, un mot mal tourné : dites-le, c'est
comme ça que le reste s'est écrit.*
