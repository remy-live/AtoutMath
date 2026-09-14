# API et administration AtoutMath

Serveur optionnel. **L'application fonctionne intégralement sans lui** : il sert
à retrouver sa progression sur plusieurs appareils, à suivre sa classe, et à
**conduire une séance** — verrouiller, envoyer un mot, débloquer un exercice.

PHP 8.0+. Aucune dépendance, aucun Composer, aucune ligne de commande.

## Ce qu'il faut demander à l'hébergement

Trois choses, et n'importe quelle offre mutualisée à quelques euros par mois
les a :

- **PHP 8.0 ou plus récent** (8.1+ de préférence) ;
- **HTTPS** — un certificat Let's Encrypt gratuit suffit. Sans lui, les jetons
  et le mot de passe professeur passent en clair ;
- **un hébergeur dans l'Union européenne**, puisqu'il s'agit de données
  d'élèves.

Pas besoin de base MySQL, pas besoin d'accès SSH, pas besoin de `cron`. Déposez
l'application entière (le dossier du dépôt) à la racine : le site élève et
`api/` sont alors sur le même domaine, et il n'y a même pas d'origine à
autoriser.

## Installation — trois champs

1. Déposez le dossier `api/` sur votre hébergement (FTP suffit).
2. Ouvrez `https://votre-site.fr/api/install.php` dans un navigateur.
3. Remplissez : votre nom, votre adresse, un mot de passe. Cliquez sur
   **Installer**, puis sur **Effacer install.php**.

C'est tout. Vous arrivez sur `api/admin/`.

La page d'installation commence par un **diagnostic** de ce que votre
hébergement offre (version de PHP, extensions, droits d'écriture) : s'il manque
quelque chose, elle le dit avant de rien promettre. Et elle **refuse de tourner
une seconde fois** tant que `config.php` existe — même si vous oubliez de
l'effacer, personne d'autre ne peut créer un compte chez vous.

### Un fichier, ou MySQL

Par défaut, les données vont dans **un fichier SQLite** : rien à créer, rien à
configurer, et tout effacer revient à supprimer un fichier. Pour une ou deux
classes, c'est le bon choix.

MySQL reste proposé dans le formulaire si vous préférez — même schéma, mêmes
requêtes, il n'y a aucune fonctionnalité en moins d'un côté ou de l'autre.

### Où vit la base, et pourquoi elle n'est pas téléchargeable

Un fichier SQLite posé dans un dossier servi par le web **se télécharge** : il
suffit d'en connaître l'adresse pour repartir avec les prénoms de la classe et
tout son travail. Trois protections se superposent, parce qu'aucune ne suffit
seule :

| | |
|---|---|
| `api/data/.htaccess` | refuse tout. Marche sous Apache, pas sous Nginx. |
| un nom tiré au hasard | `atoutmath-<16 signes>.sqlite`. Ne dépend d'aucune configuration : sans l'adresse exacte, le fichier est introuvable. |
| `api/.htaccess` | refuse `config.php`, `*.sql`, `*.sqlite*` et tout `data/`. |
| le **chiffrement** du contenu | ce qui reste quand les trois précédentes ont échoué — voir ci-dessous. |

**Sous Nginx**, ajoutez en plus :

```nginx
location ~ /api/data/  { deny all; }
location ~ /config\.php$ { deny all; }
location /api/ { try_files $uri /api/index.php$is_args$args; }
```

Vous pouvez aussi ranger la configuration **hors de la racine web** et
l'indiquer par `SetEnv ATOUTMATH_CONFIG /home/vous/config.php`.

### Le contenu est chiffré

Prénoms, réponses des élèves et messages du professeur sont écrits en
**AES-256-GCM** (`lib/coffre.php`). Un fichier de base récupéré ne rend rien de
lisible.

**Soyons précis sur ce que cela protège**, parce qu'un chiffrement mal compris
rassure plus qu'il ne défend.

- **Protégé** : le fichier qui part seul — un `.htaccess` que l'hébergeur
  ignore, une sauvegarde automatique récupérée par quelqu'un, un dossier
  indexé, un disque de serveur revendu.
- **Non protégé** : quelqu'un qui lit `config.php` **en plus** du fichier de
  base. La clé y est, et il déchiffre tout. C'est inévitable : le serveur doit
  pouvoir lire ses propres données pour afficher une console de séance, donc la
  clé doit être à sa portée. Aucun chiffrement au repos ne résout cela.

C'est donc la **quatrième couche du même mur**, celle qui reste debout quand
les autres sont tombées — et c'est exactement ce qu'on attend d'une dernière
couche.

**Pour que la clé ne voyage plus avec la base**, retirez `data_key` de
`config.php` et posez-la dans l'environnement :

```apache
SetEnv ATOUTMATH_CLE une_valeur_aleatoire_longue
```

Attention : **perdre la clé, c'est perdre les données.** Elles ne se
déchiffrent qu'avec elle.

Le chiffrement rend illisible ce qui identifie et ce qui est personnel. Restent
en clair les choses qui ne le sont pas et dont la base a besoin pour chercher :
le nom de la classe, son code, les identifiants d'exercices, les horodatages.

**Et comment cherche-t-on un prénom qu'on ne peut pas lire ?** À côté du prénom
chiffré, une empreinte HMAC du prénom normalisé — un *index aveugle* : stable,
donc cherchable ; à sens unique, donc muette. En passant, cela corrige un
défaut : « LÉA », « léa » et « Léa » créaient trois comptes distincts, et
l'élève qui tapait son prénom en minuscules à la maison ne retrouvait pas son
travail de l'école. C'est désormais la même élève — mais « Léa B. » reste bien
distincte de « Léa », puisque c'est ainsi qu'on sépare deux homonymes.

## L'administration — `api/admin/`

Des pages HTML ordinaires, sans JavaScript obligatoire : elles marchent depuis
le poste de l'établissement, quel que soit son navigateur.

**`index.php`** — vos classes, leur code à dicter, combien d'élèves y sont et
combien sont en ligne en ce moment. Et le formulaire qui crée une classe.

**`classe.php`** — la console de séance. Tout tient sur une page, qui se
rafraîchit toute seule toutes les vingt secondes (jamais pendant que vous
écrivez dans un champ) :

- **Le verrou.** Verrouillée, la classe ne voit plus le catalogue : seulement
  le parcours que vous lui donnez. L'onglet « Code » reste ouvert — c'est par
  lui que le travail arrive.
- **La consigne**, affichée en bandeau chez tous les élèves.
- **Les élèves** : qui est en ligne, sur quel exercice, combien de réussites.
  L'identifiant de l'exercice est **cliquable** : il se recopie dans le champ
  de déblocage, pour ne pas avoir à le retaper au milieu d'une classe.
- **Envoyer un mot**, à un élève ou à toute la classe, avec l'accusé de
  lecture (« ✓ lu », ou « 12 / 24 » pour un mot collectif).
- **Un exercice bloque** : *autoriser le saut* fait apparaître un bouton
  « Passer » chez l'élève ; *retirer* le fait disparaître du parcours.
  Portée au choix : la classe entière ou un élève.
- **Mettre un élève de côté** (il ne se rattache plus, son travail reste) ou
  l'effacer.
- **Effacer** : les élèves, ou la classe entière. Il faut écrire `EFFACER`.

**`eleves.php`** — la liste de la classe : coller ou déposer, **voir**,
confirmer, imprimer.

*Faire entrer la liste.* On colle depuis le presse-papier, ou on dépose un
fichier `.csv` tel qu'il sort de Pronote ou d'un tableur. Point-virgule, virgule
ou tabulation ; ligne d'en-tête ou non ; cellules entre guillemets ; accents
d'Excel (Windows-1252) et BOM : tout est lu sans rien préparer. Le nom seul
suffit — l'identifiant se fabrique (`Léa Durand` → `lea.durand`). La forme
`DURAND;Léa` est reconnue comme un nom en deux colonnes, pas comme un
identifiant.

*L'aperçu.* Lire une liste de professeur demande des devinettes, et aucune n'est
sûre. **Rien n'est écrit avant confirmation** : la page montre d'abord, ligne par
ligne, ce qui va se passer — « nouvel élève », « déjà dans la liste, code
inchangé », « entré par le code de la classe, il garde son travail », « vient de
la 5e B, sera déplacé ici ». La même fonction décide à l'aperçu et à l'import,
pour qu'ils ne puissent pas diverger.

*Les codes.* Un code différent par élève (conseillé), ou **le même code pour
toute la classe** si vous le demandez — la page dit alors en une ligne ce que
cela coûte : les identifiants étant prévisibles, un élève peut entrer à la place
d'un autre. On refait le code **d'un élève** ou **de toute la classe** en un
geste ; les anciens billets cessent aussitôt de valoir.

*Le reste.* Recoller la liste ne change aucun code déjà donné. Un élève se
**retire** (son travail part avec lui, en cascade). Un élève inscrit dans une
autre de vos classes se **déplace** au lieu d'être refusé.

> **Le doublon d'autrefois.** L'ancienne page conseillait d'ajouter à la liste
> les élèves entrés par le code de la classe. Ce conseil créait un second élève :
> le travail sur l'un, le billet sur l'autre. Ils sont maintenant reconnus par
> leur nom — dans l'ordre écrit ou dans l'autre, `NGUYÊN;Maëlle` valant
> `Maëlle Nguyên` — et rattachés à ce qu'ils ont déjà fait.

**`sante.php`** — le contrôle de l'installation, **sur votre hébergement**.
Le serveur va chercher ses propres fichiers par le web, comme le ferait un
inconnu, et vous dit ce qui revient : la base est-elle téléchargeable ? la
configuration est-elle lisible ? HTTPS est-il actif ? la purge passe-t-elle ?

C'est la seule vérification qui vaille, parce que c'est la seule qui ait lieu
*là où les élèves travailleront*. Le `.htaccess` a bien été essayé sous un vrai
Apache — les chemins sensibles répondent 403 — mais sur une autre machine que
la vôtre ; un hébergeur en `AllowOverride None`, un serveur Nginx, ou un
transfert FTP qui a sauté les fichiers commençant par un point rendraient la
base téléchargeable sans que rien ne s'en aperçoive.

**Et quand elle ne sait pas, elle le dit.** Certains hébergements interdisent
au serveur de s'appeler lui-même : la réponse est alors « je n'ai pas pu
vérifier », jamais « c'est protégé ». Un contrôle qui verdit par défaut ne vaut
rien — c'est pourquoi le raisonnement vit dans `lib/sante.php`, séparé de la
page, et qu'on le met à l'épreuve devant de vraies fuites fabriquées dans
`tools/testApi.php`.

## Mettre le site à jour

**Oui, les mises à jour se font comme sur GitHub — parce qu'elles partent de
GitHub.** On pousse le code sur la branche principale, et une minute plus tard
le site en ligne est à jour. Rien à transférer à la main.

C'est `.github/workflows/deploiement.yml`, en deux temps :

1. **Les tests tournent d'abord** — `npm test` (le logiciel) puis
   `php tools/testApi.php` (le serveur). Ils tournent aussi sur chaque demande
   de fusion, hébergement configuré ou non.
2. **La publication ne part que si les tests passent**, et seulement depuis la
   branche principale.

À configurer une seule fois, dans *Settings → Secrets and variables → Actions* :

| | |
|---|---|
| `HEBERGEUR_HOTE` | l'adresse SFTP donnée par l'hébergeur |
| `HEBERGEUR_UTILISATEUR` | l'identifiant SFTP |
| `HEBERGEUR_MOTDEPASSE` | son mot de passe |
| `HEBERGEUR_DOSSIER` *(variable)* | le chemin sur le serveur, `/` par défaut — chez OVH : `/www` |
| `SITE_ADRESSE` *(variable)* | l'adresse publique du site, pour le contrôle automatique |

Tant que `HEBERGEUR_HOTE` n'existe pas, la publication s'arrête d'elle-même
avec un message : un dépôt sans hébergement configuré n'affiche pas d'échec
rouge à chaque poussée.

### Ce qu'une mise à jour ne touche jamais

**`api/config.php` et `api/data/` ne sont pas dans le dépôt** — ils sont créés
sur le serveur par l'installation. Une republication ne peut donc ni les
remplacer ni les effacer : c'est ce qui rend la mise à jour sans danger pour
la clé de chiffrement et pour le travail des classes.

> ⚠ C'est aussi pourquoi `delete_remote_files` **doit rester à `false`** dans
> le workflow. Un transfert qui « fait le ménage » prendrait ces deux-là pour
> des intrus et les effacerait : on perdrait la clé **et** la base en une
> publication de routine.

Une mise à jour qui ajoute une table s'applique d'elle-même : `migrer()` remet
le schéma à niveau chaque fois que vous ouvrez l'administration. Aucune
manœuvre, aucune migration à lancer.

Ce qui n'est pas transféré est listé dans `.deployignore` : tests, outils de
mesure, notes, dépendances de développement. Le serveur ne reçoit que ce qu'un
navigateur télécharge.

### Si l'hébergeur déploie depuis git

Rémy : « j'ai connecté mon ovh avec git. Qu'est-ce que cela va changer ? »

Cela change **ce qui arrive dans `www/`**. Le transfert SFTP filtre par
`.deployignore` et monte 543 fichiers. Un déploiement git ne connaît pas ce
fichier : il pose **le dépôt**, soit 794 fichiers — et, selon la façon dont
l'hébergeur s'y prend, `.git/` avec.

Trois conséquences, et la première est sérieuse :

1. **`.git/` téléchargeable = tout le code source, et tous ses états passés.**
   Sur un dépôt privé, c'est la fuite intégrale. Des robots demandent
   `/.git/config` en permanence, précisément pour trouver ça.
2. Les tests, les outils, les notes et les imports se retrouvent en ligne :
   du poids, et de la surface exposée.
3. **`api/config.php` et `api/data/` ne sont pas dans le dépôt.** Un
   déploiement qui « fait le ménage » (`git clean`, ou une réécriture complète
   du dossier) les prendrait pour des intrus — on perdrait la clé de
   chiffrement **et** la base.

Le **`.htaccess` de la racine** ferme les deux premiers points, quelle que soit
la façon de publier. Le troisième ne se ferme pas par un fichier : il faut
vérifier, avant le premier déploiement, que l'hébergeur n'efface pas ce qu'il
ne connaît pas — et **sauvegarder `api/config.php` et `api/data/` d'abord**.

> **Une surprise mesurée au passage.** La configuration par défaut d'Apache sur
> Debian et Ubuntu contient `Alias /icons/ "/usr/share/apache2/icons/"`. Tout
> `/icons/…` est donc détourné vers les icônes du serveur, et **aucun
> `.htaccess` ne peut le rattraper** — l'alias agit avant que le nôtre ne soit
> lu. Nos icônes répondaient 404 : pas d'installation sur l'écran d'accueil,
> pas de vignette. Le dossier s'appelle **`icones/`** depuis, et le contrôle en
> ligne vérifie que l'icône se charge.

### Poser le site sans client FTP : `deposer.php`

L'explorateur de fichiers d'un hébergeur sait très bien transférer *un* fichier ;
il sait mal en transférer **537**, répartis en quarante dossiers, sans en perdre
un — et un fichier perdu au milieu de `js/ui/fiches/` ne se voit pas, il se
découvre en cours.

On renverse donc : **deux fichiers** passent par l'interface web
(`deposer.php` et l'archive), et le serveur fait le reste. Une archive est
complète ou ne s'ouvre pas ; il n'y a pas d'oubli possible.

1. transférer `deposer.php` et le `.zip` dans `www/` ;
2. ouvrir `https://votre-site/deposer.php`, vérifier l'aperçu, poser ;
3. ouvrir `api/install.php` **tout de suite** ;
4. ouvrir `api/admin/sante.php`.

L'archive peut aussi être **envoyée depuis le navigateur**, si elle tient sous le
plafond de transfert de l'hébergement — la page l'affiche et dit quoi faire
sinon. Pour les mises à jour suivantes, seule l'archive change.

**Qui a le droit de s'en servir**, puisqu'un script qui écrit des fichiers PHP
sur un site public est ce qu'un intrus rêve de trouver :

- *site déjà installé* → il faut être **connecté comme professeur** ; sinon la
  page ne fait rien d'autre que renvoyer vers la connexion, y compris contre une
  requête envoyée à la main ;
- *site encore vide* → elle fonctionne sans connexion, parce qu'il n'y a personne
  à qui demander de se connecter. La fenêtre est exactement celle d'`install.php`,
  ouverte au même moment et pour la même raison — d'où le « tout de suite ».

**Ce qu'il refuse d'écrire, quelle que soit l'archive** : tout chemin qui remonte
(`../`), absolu ou porteur d'une lettre de lecteur — la faille dite *zip slip* —
ainsi que `api/config.php` et `api/data/`. Éprouvé avec une archive piégée : trois
entrées sur quatre refusées et nommées dans l'aperçu, aucune évasion, clé et base
intactes, le fichier légitime écrit.

### Poser le site à la main : le paquet

Pour le premier jour, ou pour un hébergement sans SFTP automatisé :

```
node tools/paquet.mjs
```

Un `.zip` daté de la version, à décompresser et à déposer **tel quel dans
`www/`** — les fichiers sont à la racine de l'archive, sans dossier qui les
enveloppe, pour qu'un glisser-déposer suffise.

La liste des fichiers vient de `git ls-files`, et c'est ce qui rend le paquet
sûr : `api/config.php` et `api/data/` sont dans `.gitignore`, ils ne *peuvent*
donc pas s'y trouver. Un balayage du disque, lui, emporterait la clé de
chiffrement et la base le jour où l'on prépare un paquet depuis une machine où
le site tourne. Le même `.deployignore` que la publication automatique retire
ensuite les tests, les outils et les notes.

L'outil **refuse de fabriquer** un paquet quand un fichier écrit n'est pas
encore suivi par git : sans cela, on corrige, on transfère, et le correctif
n'est pas dedans.

### Deux portes, deux mots de passe ? Non : un seul

- **`api/admin/index.php`** — la console : classes, listes d'élèves, billets,
  conduite de séance, santé. Adresse électronique + mot de passe choisis à
  l'installation.
- **Le bouton « Je suis le professeur » de l'application** — il ouvre le
  catalogue, le constructeur de parcours et les corrigés. **Il demande les mêmes
  identifiants**, vérifiés par `/teacher/login`, et garde un jeton dans le
  navigateur pour ne pas les redemander à chaque fois.

> **C'était un vrai trou.** Cette bascule retournait un booléen dans le
> navigateur sans rien demander à personne — et « Je suis le professeur » est
> écrit en toutes lettres au bas de la porte d'entrée. Tant que le logiciel
> tournait sur l'ordinateur de Rémy, c'était sans conséquence ; le jour où il est
> en ligne et où trente élèves ont l'adresse, n'importe lequel d'entre eux
> obtenait le catalogue entier.

Le mot de passe n'est **jamais** comparé dans la page : un secret vérifié en
JavaScript est un secret publié. Et la décision « faut-il un verrou ? » se prend
sur le protocole de la page, pas sur la joignabilité du serveur — sans quoi une
API momentanément tombée ouvrirait tout grand, exactement au mauvais moment.
Sur un fichier ouvert en local (`file://`), il n'y a ni classe ni adresse à
donner : la bascule y reste libre.

### Le contrôle après publication, fait tout seul

Il n'y a plus de geste à faire après une publication : `tools/controleEnLigne.mjs`
va voir le site **de dehors** et échoue bruyamment si quelque chose cloche.

```
node tools/controleEnLigne.mjs https://mon-site.fr
```

Il vérifie dix choses : le site répond et c'est bien AtoutMath ; la version
servie est celle qu'on vient de publier ; HTTPS ; l'API vit (donc PHP s'exécute,
la réécriture d'URL marche et la base est configurée) ; l'administration
s'affiche ; `config.php`, `api/lib/`, `_socle.php` sont refusés ; le dossier des
données est verrouillé ; le mode hors ligne est en place.

> **La vérification qui compte** demande un fichier de base **qui n'existe pas**
> sous `api/data/`. Si l'hébergeur applique nos `.htaccess`, il répond `403`
> avant même de chercher le fichier ; s'il ne les applique pas, il cherche, ne
> trouve pas, et répond `404`. Ce `404` ressemble à une bonne nouvelle et n'en
> est pas une : il prouve que la serrure ne fonctionne pas, et donc que la vraie
> base — dont le nom est tiré au hasard, mais qui existe — serait servie à qui
> demanderait son nom. C'est le seul moyen d'essayer la serrure sans publier la
> clé. Mesuré dans les deux sens : voir l'en-tête du fichier.

**Pourquoi de dehors plutôt que par `sante.php`.** La page de santé tourne *sur*
l'hébergement et lui demande d'aller chercher ses propres fichiers — ce que
beaucoup d'hébergements interdisent. Elle répond alors « je n'ai pas pu
vérifier », honnêtement, mais sans rien prouver. Depuis GitHub, on est vraiment
le visiteur inconnu, celui contre qui on se protège.

`sante.php` reste utile pour ce qu'elle seule voit de l'intérieur — notamment
que `install.php` est revenu avec le transfert, ce qui est normal, et qu'un
bouton efface.

### La ronde du matin

Du lundi au vendredi, avant la première heure de cours, le même contrôle tourne
tout seul et n'envoie un courriel que s'il trouve quelque chose.

Ce n'est pas une redondance : ce qu'il guette ne vient pas d'une poussée. Un
certificat qui expire, une version de PHP retirée par l'hébergeur, une mise à
jour du serveur qui n'applique plus les `.htaccess` — aucun de ces accidents ne
serait vu par un contrôle déclenché par une publication. On l'apprendrait devant
la classe.

> GitHub n'exécute les tâches programmées que sur la **branche par défaut** du
> dépôt. Le fichier `deploiement.yml` doit donc y vivre pour que la ronde ait
> lieu.

## Points d'entrée de l'API

Tout est en `POST` JSON (les proxys d'établissement mettent volontiers les
`GET` en cache).

| Route | Authentification | Rôle |
|---|---|---|
| `/join` | — | rattacher un appareil à une classe (code de classe + prénom) |
| `/login` | — | identifiant + code élève (la liste du professeur) |
| `/sync` | jeton élève | pousser / tirer des événements, + l'état de séance |
| `/session` | jeton élève | l'état de séance seul (verrou, consigne, mots, déblocages) |
| `/messages/read` | jeton élève | « j'ai lu ce mot » |
| `/teacher/login` | — | connexion professeur |
| `/teacher/classes` | jeton prof | créer / lister des classes |
| `/teacher/paths` | jeton prof | enregistrer / lister des parcours |
| `/teacher/assign` | jeton prof | assigner un parcours à une classe |
| `/teacher/report` | jeton prof | bilan de classe (notes recalculées) |
| `/teacher/student` | jeton prof | détail d'un élève |
| `/health` | — | test de disponibilité |

## Vérifier que tout marche

```
php tools/testApi.php
```

Lance un vrai serveur PHP sur une base jetable et le pilote par HTTP, comme le
feraient le navigateur du professeur et celui de l'élève — cookies de session
et jeton anti-rejeu compris. Quatre-vingt-dix vérifications, dont celles
qui comptent : *verrouiller la classe arrive-t-il jusqu'à l'élève*, *le mot
individuel n'est-il lisible que par lui*, *l'effacement emporte-t-il vraiment
tout* — et la preuve du coffre : **on ouvre le fichier de base avec un éditeur
de texte, comme le ferait celui qui l'a récupéré, et l'on y cherche les
prénoms** (journal WAL compris, puisqu'il part avec le dossier). S'ils y
étaient, tout le reste du chiffrement serait décoratif.

Le contrôle de santé y est mis à l'épreuve devant de vraies fuites
fabriquées : une base servie en 200, une configuration dont le code source
part en clair, une vérification qui échoue — et l'on vérifie qu'il crie, qu'il
nuance, et qu'il ne verdit jamais par défaut.

Rien n'est touché de l'installation réelle.

## Pourquoi ce modèle de données

Le serveur stocke **un journal d'événements**, pas des agrégats. Le score, la
maîtrise et les notes ne sont écrits nulle part : ils sont recalculés à la
lecture (`lib/projections.php`, `lib/grading.php`), avec les mêmes règles que
le client.

Trois propriétés en découlent :

- **La synchronisation ne peut pas produire de conflit.** Chaque événement a un
  UUID généré par le client ; l'insertion ignore les doublons. Renvoyer deux
  fois le même lot, ou synchroniser l'école avant la maison (ou l'inverse),
  donne le même résultat.
- **Les notes ne sont pas falsifiables.** Le navigateur envoie des réponses,
  jamais une note. Le serveur applique le barème lui-même.
- **Changer un barème régénère les bilans passés**, sans migration.

Le schéma vit dans `lib/schema.php` et non dans un `.sql` : il doit s'écrire
dans deux dialectes, et `migrer()` s'applique tout seul à chaque entrée dans
l'administration. Une mise à jour qui ajoute une table ne demande donc aucune
manœuvre.

## Identification des élèves

**Deux portes, et elles ne protègent pas la même chose.**

**Identifiant + code** — la liste que vous fournissez (`admin/eleves.php`). Seul
celui qui est sur la liste entre, et sous le nom que vous lui avez donné. C'est
la bonne porte quand le travail compte. Deux champs pour l'élève : ni adresse de
serveur, ni code de classe — l'identifiant suffit à le retrouver.

**Code de classe + prénom** — sans préparation. Un élève qui
saisit le même prénom dans la même classe retrouve son compte, ce qui permet de
passer de l'école à la maison sans procédure. Chaque rattachement **ajoute** un
jeton sans détruire les précédents (jusqu'à cinq) : l'ordinateur de l'école
continue de remonter son travail après que l'élève a ouvert l'application chez
lui.

Le compromis est assumé : n'importe qui connaissant le code de classe peut se
faire passer pour un élève de cette classe. C'est acceptable pour un outil
d'entraînement ; **ce n'est pas un dispositif d'examen surveillé**. Si des notes
doivent compter officiellement, faites passer l'évaluation en classe, sous
surveillance — comme pour une copie papier.

De même, le **verrou** tient la classe sur le travail donné, comme une consigne
au tableau ; il ne résiste pas à un élève qui ouvre les outils de son
navigateur. Ce qui est vraiment protégé, c'est le serveur : un élève écarté ne
se rattache plus, et personne ne lit le travail d'un autre.

## Données personnelles (RGPD)

- **Minimisation** : prénom et classe. Ni nom de famille, ni e-mail, ni date de
  naissance, ni identifiant national élève.
- **Conservation** : `retention_days` (30 jours par défaut, choisi à
  l'installation). La purge s'applique **toute seule**, une fois par jour au
  plus, à l'entrée dans l'administration — il n'y a pas de `cron` à installer,
  et beaucoup d'hébergements mutualisés n'en offrent pas.
- **Effacement** : deux boutons dans la console de séance, avec confirmation
  écrite. Supprimer un élève emporte en cascade son travail, ses messages et
  ses jetons. En SQLite, tout effacer c'est aussi supprimer un fichier.
- **Portabilité** : `/teacher/student` exporte les données d'un élève ;
  `php tools/admin.php export-class CODE` sort un CSV des notes.
- **Chiffrement au repos** : prénoms, réponses et messages sont chiffrés dans
  la base (AES-256-GCM). Voir plus haut ce que cela protège, et ce que cela ne
  protège pas.
- **Hébergement** : choisissez un hébergeur dans l'Union européenne.
- **Registre des traitements** : un traitement de données d'élèves relève du
  registre de l'établissement. Prévenez le chef d'établissement et le DPO avant
  toute mise en production, même à petite échelle.

## Sécurité

- Requêtes préparées partout, aucune concaténation SQL.
- Données d'élèves chiffrées dans la base (AES-256-GCM), recherche par index
  aveugle HMAC.
- Jetons élèves stockés hachés (SHA-256) ; jetons professeurs signés en HMAC ;
  mot de passe professeur en `password_hash`, douze caractères minimum.
- Session PHP pour l'administration, cookie `HttpOnly` + `SameSite=Lax`,
  `Secure` dès que la page est en HTTPS, identifiant régénéré à la connexion.
- **Jeton anti-rejeu sur chaque formulaire** qui change quelque chose : une
  page piégée ne peut pas faire effacer une classe à un professeur connecté.
- Message identique pour « adresse inconnue » et « mot de passe faux », et une
  seconde d'attente : l'essai en boucle n'apprend rien et n'avance pas.
- CORS restreint aux origines listées dans la configuration.
- Limitation de débit par élève et par IP, **cloisonnée par installation**.
- Servez l'API en HTTPS : les jetons transitent en clair sinon.
