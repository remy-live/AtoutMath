# API AtoutMath

Backend optionnel. **L'application fonctionne intégralement sans lui** : il ne
sert qu'à retrouver sa progression sur plusieurs appareils et à permettre au
professeur de suivre sa classe.

PHP 8.0+ et MySQL 8 / MariaDB 10.4+. Aucune dépendance, aucun Composer.

## Installation

```bash
mysql -u root -p -e "CREATE DATABASE atoutmath CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p atoutmath < api/schema.sql

cp api/config.example.php api/config.php
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"   # à coller dans app_secret
$EDITOR api/config.php

php api/tools/admin.php create-teacher "Nom Prénom" prof@exemple.fr motdepasselong
```

Servez le dossier `api/` derrière Apache (le `.htaccess` fourni route tout vers
`index.php`) ou Nginx :

```nginx
location /atoutmath/api/ {
    try_files $uri /atoutmath/api/index.php$is_args$args;
}
```

Côté élève : bouton ☁️ dans la barre du haut → adresse du serveur, code de
classe, prénom.

## Pourquoi ce modèle de données

Le serveur stocke **un journal d'événements**, pas des agrégats. Le score, la
maîtrise et les notes ne sont écrits nulle part : ils sont recalculés à la
lecture (`lib/projections.php`, `lib/grading.php`), avec les mêmes règles que
le client.

Trois propriétés en découlent :

- **La synchronisation ne peut pas produire de conflit.** Chaque événement a un
  UUID généré par le client ; l'insertion est un `INSERT IGNORE`. Renvoyer deux
  fois le même lot, ou synchroniser l'école avant la maison (ou l'inverse),
  donne le même résultat.
- **Les notes ne sont pas falsifiables.** Le navigateur envoie des réponses,
  jamais une note. Le serveur applique le barème lui-même.
- **Changer un barème régénère les bilans passés**, sans migration : les
  réponses sont conservées, l'interprétation est recalculée.

## Points d'entrée

Tout est en `POST` JSON (les proxys d'établissement mettent volontiers les
`GET` en cache).

| Route | Authentification | Rôle |
|---|---|---|
| `/join` | — | rattacher un appareil à une classe |
| `/sync` | jeton élève | pousser / tirer des événements |
| `/teacher/login` | — | connexion professeur |
| `/teacher/classes` | jeton prof | créer / lister des classes |
| `/teacher/paths` | jeton prof | enregistrer / lister des parcours |
| `/teacher/assign` | jeton prof | assigner un parcours à une classe |
| `/teacher/report` | jeton prof | bilan de classe (notes recalculées) |
| `/teacher/student` | jeton prof | détail d'un élève |
| `/health` | — | test de disponibilité |

## Identification des élèves

Volontairement sans mot de passe : **code de classe + prénom**. Un élève qui
saisit le même prénom dans la même classe retrouve son compte, ce qui permet de
passer de l'école à la maison sans procédure.

Le compromis est assumé : n'importe qui connaissant le code de classe peut se
faire passer pour un élève de cette classe. C'est acceptable pour un outil
d'entraînement ; **ce n'est pas un dispositif d'examen surveillé**. Si des notes
doivent compter officiellement, faites passer l'évaluation en classe, sous
surveillance — comme pour une copie papier.

## Données personnelles (RGPD)

- **Minimisation** : prénom et classe. Ni nom de famille, ni e-mail, ni date de
  naissance, ni identifiant national élève.
- **Conservation** : `retention_days` dans la configuration (730 jours par
  défaut). Programmez la purge :
  ```
  0 3 * * 0 php /chemin/api/tools/admin.php purge
  ```
- **Portabilité et effacement** : `/teacher/student` exporte les données d'un
  élève ; supprimer la ligne `students` efface tous ses événements en cascade.
- **Hébergement** : choisissez un hébergeur dans l'Union européenne.
- **Registre des traitements** : un traitement de données d'élèves relève du
  registre de l'établissement. Prévenez le chef d'établissement et le DPO avant
  toute mise en production, même à petite échelle.

## Sécurité

- Requêtes préparées partout, aucune concaténation SQL.
- Jetons élèves stockés hachés (SHA-256) ; jetons professeurs signés en HMAC.
- CORS restreint aux origines listées dans la configuration.
- Limitation de débit par élève et par IP (`rateLimit()`).
- Servez l'API en HTTPS : les jetons transitent en clair sinon.
