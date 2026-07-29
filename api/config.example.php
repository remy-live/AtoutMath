<?php
// Copiez ce fichier en api/config.php et adaptez les valeurs.
// api/config.php ne doit JAMAIS être versionné (voir .gitignore).

return [
    'db_host' => 'localhost',
    'db_port' => 3306,
    'db_name' => 'atoutmath',
    'db_user' => 'atoutmath',
    'db_pass' => 'a_changer',

    // Sert à signer les jetons professeur. Générez-le une fois :
    //   php -r "echo bin2hex(random_bytes(32));"
    'app_secret' => 'a_changer_par_une_valeur_aleatoire_longue',

    // Origines autorisées à appeler l'API depuis un navigateur.
    // Laissez vide si l'application est servie par le même domaine.
    'allowed_origins' => [
        'https://exemple.fr',
        'http://localhost:8080',
    ],

    // Durée de conservation des événements, en jours (obligation RGPD de
    // limiter la conservation). 0 = pas de purge automatique.
    'retention_days' => 730,
];
