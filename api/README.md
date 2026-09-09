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

**Sous Nginx**, ajoutez en plus :

```nginx
location ~ /api/data/  { deny all; }
location ~ /config\.php$ { deny all; }
location /api/ { try_files $uri /api/index.php$is_args$args; }
```

Vous pouvez aussi ranger la configuration **hors de la racine web** et
l'indiquer par `SetEnv ATOUTMATH_CONFIG /home/vous/config.php`.

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

## Points d'entrée de l'API

Tout est en `POST` JSON (les proxys d'établissement mettent volontiers les
`GET` en cache).

| Route | Authentification | Rôle |
|---|---|---|
| `/join` | — | rattacher un appareil à une classe |
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
et jeton anti-rejeu compris. Soixante-quatre vérifications, dont celles qui
comptent : *verrouiller la classe arrive-t-il jusqu'à l'élève*, *le mot
individuel n'est-il lisible que par lui*, *l'effacement emporte-t-il vraiment
tout*. Rien n'est touché de l'installation réelle.

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

Volontairement sans mot de passe : **code de classe + prénom**. Un élève qui
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
- **Hébergement** : choisissez un hébergeur dans l'Union européenne.
- **Registre des traitements** : un traitement de données d'élèves relève du
  registre de l'établissement. Prévenez le chef d'établissement et le DPO avant
  toute mise en production, même à petite échelle.

## Sécurité

- Requêtes préparées partout, aucune concaténation SQL.
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
