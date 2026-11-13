# Faire connaître atout-math.fr à Google

> Rémy, 13 novembre : « comment soumettre http://atout-math.fr à google ? »

**Il n'y a plus de formulaire de soumission.** L'ancien « Submit URL » de Google
a disparu. Aujourd'hui on fait trois choses : on prouve qu'on est le
propriétaire, on dépose un plan du site, et on demande l'indexation de la page
d'accueil. Le tout prend un quart d'heure, et c'est gratuit.

Le dépôt porte déjà la moitié qui s'écrit dans des fichiers — `robots.txt`,
`sitemap.xml`, et la description que Google affichera sous le titre. **Ce
fichier-ci décrit l'autre moitié, celle que seul Rémy peut faire**, parce
qu'elle demande d'être connecté à son compte Google et de prouver qu'il possède
le domaine.

---

## 1. Ouvrir la Search Console et prouver qu'on possède le domaine

<https://search.google.com/search-console>

Google propose deux sortes de « propriété ». **Prendre « Préfixe de l'URL »**,
avec exactement `https://atout-math.fr/` — c'est le plus simple, et c'est celui
qui correspond aux fichiers déjà en place.

Pour la preuve, Google offre plusieurs méthodes. **La plus sûre ici est le
fichier HTML** :

1. Google propose un fichier nommé `googleXXXXXXXXXXXX.html`. Le télécharger.
2. Le déposer **à la racine du dépôt**, à côté de `index.html`, et pousser.
   Le déploiement l'enverra sur le serveur comme le reste — il n'est pas dans
   `.deployignore`.
3. Vérifier qu'il répond : `https://atout-math.fr/googleXXXXXXXXXXXX.html`.
4. Cliquer sur « Valider » dans la Search Console.

**Ne pas supprimer ce fichier ensuite** : Google le revérifie de temps en
temps, et la propriété se perd s'il disparaît.

> *Il existe aussi la méthode « balise meta », qui demande de coller un jeton
> dans `index.html`. Elle marche tout aussi bien ; le fichier a l'avantage de
> ne toucher à rien d'autre.*

---

## 2. Déposer le plan du site

Dans la Search Console : **Sitemaps** → saisir `sitemap.xml` → Envoyer.

L'état passe à « Réussite » en quelques minutes. S'il dit « Impossible de
récupérer », c'est presque toujours que le fichier n'est pas en ligne : ouvrir
`https://atout-math.fr/sitemap.xml` dans un navigateur avant de chercher plus
loin.

---

## 3. Demander l'indexation de la page d'accueil

Dans la Search Console : **Inspection de l'URL** (la barre en haut) → coller
`https://atout-math.fr/` → attendre l'analyse → **« Demander une
indexation »**.

Cela met la page dans une file prioritaire. Compter de quelques heures à
quelques jours — c'est Google qui décide, et personne ne peut l'accélérer.

**Pour vérifier plus tard** : taper `site:atout-math.fr` dans Google. S'il
répond, le site est indexé. Avant la première indexation, cette recherche ne
rend rien, et c'est normal : ce n'est pas un signe que quelque chose est cassé.

---

## 4. Ce à quoi il faut s'attendre, et ce qui n'est pas de notre ressort

**UNE APPLICATION D'UNE SEULE PAGE NE SE RÉFÉRENCE PAS COMME UN SITE DE
CONTENU.** Tout ce qu'AtoutMath montre — le catalogue, les exercices, les
séances — se construit en JavaScript derrière la même adresse. Google sait lire
le JavaScript, mais il n'y a qu'**une** page à indexer, et c'est le portail de
connexion. Il n'y aura donc jamais de résultat « AtoutMath — fractions sixième »
sans écrire de vraies pages pour cela.

**Ce qui amènera du monde, c'est le lien collé dans un message.** Les lignes
`og:` posées dans `index.html` sont faites pour ça : quand Rémy colle
`https://atout-math.fr` dans un courriel, un message ou l'ENT, le destinataire
voit une carte avec le titre, la phrase et l'image, au lieu d'une adresse nue.
Entre collègues, c'est ce chemin-là qui compte, et de loin.

**Deux choses à vérifier auprès de l'hébergeur**, parce qu'elles pèsent plus
que tout le reste :

- **HTTPS**, et une redirection de `http://` vers `https://`. Google classe
  moins bien un site en clair, et sans redirection il peut indexer les deux
  adresses comme deux sites qui se partagent leur réputation. Le canonique
  posé dans `index.html` dit déjà laquelle compte ; la redirection est la
  ceinture.
- **Que `robots.txt` réponde vraiment** : `https://atout-math.fr/robots.txt`.

---

## Ce qu'on a mis dans le dépôt, et pourquoi

| Fichier | Ce qu'il fait |
| --- | --- |
| `robots.txt` | Dit aux robots ce qu'ils peuvent lire, et **tient `?code=` à l'écart** : le lien qui sert à rejoindre une classe n'a rien à faire dans un moteur de recherche. |
| `sitemap.xml` | La liste des adresses à indexer : la page d'accueil, et la visite guidée `?visite=1`. |
| `index.html` | `description` (ce que Google affiche sous le titre), `canonical` (quelle adresse compte), et les `og:` (la carte quand on colle le lien). |

**La description est celle du manifeste, mot pour mot.** Deux endroits qui
décrivent la même chose doivent la décrire pareil, sinon l'un des deux dérive
et personne ne s'en aperçoit.

---

## Et Bing, pendant qu'on y est

Bing a le même outil : <https://www.bing.com/webmasters>. Il sait **importer la
propriété depuis la Search Console** en deux clics une fois l'étape 1 faite —
il n'y a donc rien à reprouver, et c'est cinq minutes. Bing alimente aussi
DuckDuckGo et Ecosia, que certains collèges installent par défaut.
