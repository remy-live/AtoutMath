<?php
declare(strict_types=1);

/**
 * CETTE PAGE EST DEVENUE UNE SECTION — et ce fichier reste pour les liens.
 *
 * Rémy : « la zone admin n'a plus besoin de classe et est vieillotte, va à
 * l'essentiel avec des choses déroulantes », puis « j'aimerai en une seule
 * page ». la santé de l'installation vit maintenant dans `index.php`, à l'ancre
 * `#sante`.
 *
 * POURQUOI ON NE SUPPRIME PAS LE FICHIER. Son adresse est écrite ailleurs
 * qu'ici : dans `deposer.php`, dans `api/README.md`, dans les instructions
 * imprimées par `tools/paquet.mjs`, et dans les messages déjà envoyés à Rémy.
 * Un lien qui tombe dans le vide le jour d'une installation ratée est le pire
 * moment pour découvrir qu'on a déplacé la page.
 */

header('Location: index.php#sante', true, 301);
exit;
