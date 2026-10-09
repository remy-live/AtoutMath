<?php
declare(strict_types=1);

/**
 * SECTION « MOT DE PASSE ET DÉCONNEXION ».
 *
 * LE MÊME MOT DE PASSE OUVRE TOUT : le logiciel, cette page, et le dépôt de
 * fichiers — c'est-à-dire l'écriture sur le serveur. C'est la clé du site, et
 * c'est la raison pour laquelle elle a droit à sa section plutôt qu'à un lien
 * perdu dans un coin.
 *
 * ON NE CHANGE PAS LE MOT DE PASSE ICI. `api/motdepasse.php` le fait déjà,
 * avec l'envoi du courriel et le lien à durée limitée ; refaire ce chemin dans
 * l'administration donnerait deux façons de changer une même chose, dont une
 * moins éprouvée que l'autre. On renvoie donc là-bas.
 *
 * @var array $prof  le professeur connecté
 */

sectionDebut('compte', 'Mot de passe et déconnexion',
    'la clé qui ouvre le logiciel, cette page et le dépôt');
?>
<p class="gris-clair" style="margin-top:0">Connecté comme
<b><?= h((string) $prof['display_name']) ?></b>
(<?= h((string) $prof['email']) ?>)<?= estLeFondateur($prof)
    ? ' — c\'est vous qui avez installé ce site, donc vous seul ouvrez le guichet des mises à jour.'
    : '.' ?></p>
<p class="gris-clair">Le même mot de passe ouvre le logiciel, cette page et le
dépôt de fichiers. <b>S'il a pu être vu, changez-le</b> : c'est la clé de tout.</p>
<p>
    <a class="bouton" href="../motdepasse.php">Changer le mot de passe</a>
    <a class="bouton" href="index.php?deconnexion=1"
       style="background:#e2e8f0; color:#1a202c">Se déconnecter</a>
</p>
<?php
sectionFin();
