<?php
// CE FICHIER N'EST PLUS NÉCESSAIRE : ouvrez `api/install.php` dans un
// navigateur, et la configuration s'écrit toute seule, avec un secret tiré au
// hasard et la base rangée hors de portée du web.
//
// Il reste ici pour dire ce que `config.php` contient, si vous préférez
// l'écrire à la main — ou pour le poser hors de la racine web et l'indiquer
// par `SetEnv ATOUTMATH_CONFIG /home/vous/config.php`.

return [
    // 'sqlite' (par défaut, rien à installer) ou 'mysql'.
    'db_driver' => 'sqlite',
    // En SQLite : le chemin du fichier. Rangez-le dans un dossier refusé par
    // le serveur — install.php crée `api/data/` avec son propre .htaccess et
    // donne au fichier un nom imprévisible.
    'db_file'   => __DIR__ . '/data/atoutmath.sqlite',

    // En MySQL seulement :
    'db_host' => 'localhost',
    'db_port' => 3306,
    'db_name' => 'atoutmath',
    'db_user' => 'atoutmath',
    'db_pass' => 'a_changer',

    // Signe les jetons professeur. Générez-le une fois :
    //   php -r "echo bin2hex(random_bytes(32));"
    'app_secret' => 'a_changer_par_une_valeur_aleatoire_longue',

    // Origines autorisées à appeler l'API depuis un navigateur.
    // Laissez vide si l'application est servie par le même domaine.
    'allowed_origins' => [
        'https://exemple.fr',
        'http://localhost:8080',
    ],

    // Conservation des événements, en jours. La purge s'applique toute seule
    // à l'entrée dans l'administration, une fois par jour au plus.
    // 0 = pas de purge automatique.
    'retention_days' => 30,
];
