<?php
declare(strict_types=1);

/**
 * SECTION « DÉPOSER UNE MISE À JOUR » — et elle est en TÊTE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « j'aimerai en une seule page même pour le déposer », puis, devant
 * l'aperçu : « mets le déposer en haut et la santé en dessous ».
 *
 * C'EST CE QU'ON VIENT FAIRE. On ouvre l'administration pour poser une
 * archive ; la santé, on la regarde après, ou quand elle réclame. Une section
 * qui dit « tout va bien » n'a pas à occuper le premier écran de celle qui
 * demande un geste.
 *
 * ── CE QUI EST ICI, ET CE QUI RESTE AILLEURS ────────────────────────────────
 *
 * LA LOGIQUE N'EST PAS RECOPIÉE. Le refus des chemins qui remontent, celui de
 * `api/config.php` et de `api/data/`, l'écriture par flux entrée par entrée —
 * tout cela vit dans `deposer.php`, a été éprouvé avec une archive piégée, et
 * cette section l'APPELLE (`lireArchive`, `poserArchive`). Un refus de `../`
 * écrit à deux endroits finit par n'être écrit correctement qu'à un seul, et
 * l'on ne sait plus lequel.
 *
 * ET `deposer.php` RESTE DEBOUT TOUT SEUL, à la racine du site. C'est lui
 * qu'on transfère le tout premier jour, quand `api/` n'existe pas encore et
 * qu'il n'y a donc personne à qui demander de se connecter. L'inclusion va
 * dans ce sens-là — l'administration appelle le déposeur — jamais dans l'autre.
 *
 * ── LE GUICHET, ET POURQUOI IL EXISTE ───────────────────────────────────────
 *
 * Rémy : « deposer.php n'est pas sécurisé ? » Il l'était, et c'était
 * insuffisant : poser une archive écrit des fichiers PHP, donc QUI L'OBTIENT
 * OBTIENT LE SERVEUR — et toute la protection reposait sur UN mot de passe.
 * Volé, on ne perdait plus seulement les données des élèves : on perdait le
 * site. Le guichet ferme cette porte par défaut, et il se referme tout seul au
 * bout d'une demi-heure.
 *
 * Variables fournies par index.php, qui a traité le POST :
 * @var array   $prof
 * @var ?array  $apercu   ce que contient l'archive examinée, ou null
 * @var ?array  $pose     le résultat d'une pose qui vient d'avoir lieu, ou null
 * @var string  $erreurDepot
 */

$guichetMinutes = guichetMinutes();
$guichetOuvert = $guichetMinutes > 0;
$archives = archivesPresentes();
$depots = derniersDepots();

sectionDebut(
    'depot',
    'Déposer une mise à jour',
    'l\'archive se dépose ici — plus besoin d\'ouvrir une autre page',
    $guichetOuvert ? 'guichet ouvert' : 'guichet fermé',
    $guichetOuvert ? 'attention' : 'neutre',
    // OUVERTE AU CHARGEMENT : c'est la section qu'on vient voir.
    true
);

if ($erreurDepot !== '') {
    echo '<div class="mot" style="background:#fff5f5;border-color:#fecaca;color:#7f1d1d">'
        . h($erreurDepot) . '</div>';
}
?>

<?php if (!$guichetOuvert): ?>
    <p class="gris-clair" style="margin-top:0">Déposer écrit des fichiers sur le
    site : <b>qui l'obtient obtient le serveur</b>. Le guichet reste donc fermé, et
    votre mot de passe seul ne suffit pas à l'ouvrir — il faut aussi ce bouton. Il
    se referme de lui-même au bout de trente minutes.</p>
    <form method="post">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="guichet" value="ouvrir">
        <button>Ouvrir le guichet pour trente minutes</button>
    </form>
<?php else: ?>
    <p style="margin-top:0"><b>Guichet ouvert</b> — il se referme dans
    <?= (int) $guichetMinutes ?> minute<?= $guichetMinutes > 1 ? 's' : '' ?>.</p>

    <?php if ($pose !== null): ?>
        <?php // CE QUI VIENT D'ÊTRE ÉCRIT, et ce qui reste à faire. ?>
        <div class="mot"><?= (int) ($pose['ecrits'] ?? 0) ?> fichier<?=
            ($pose['ecrits'] ?? 0) > 1 ? 's' : '' ?> écrit<?=
            ($pose['ecrits'] ?? 0) > 1 ? 's' : '' ?>.</div>
        <?php if (!empty($pose['erreurs'])): ?>
            <p class="gris-clair"><b>Refusés ou impossibles à écrire :</b></p>
            <ul class="gris-clair">
                <?php foreach (array_slice($pose['erreurs'], 0, 12) as $e): ?>
                    <li><?= h((string) $e) ?></li>
                <?php endforeach; ?>
            </ul>
        <?php else: ?>
            <p class="gris-clair">Ouvrez maintenant
            <a href="../install.php">api/install.php</a> — tout de suite, c'est lui
            qui met la base au niveau de la nouvelle version. Puis revenez ici et
            regardez la santé.</p>
        <?php endif; ?>

    <?php elseif ($apercu !== null): ?>
        <?php // L'APERÇU AVANT D'ÉCRIRE. Un dépôt ne se défait pas : on montre
              // fichier par fichier ce qui sera écrit et ce qui sera refusé,
              // AVANT de toucher au disque. ?>
        <h3 style="font-size:.95rem; margin:4px 0 7px">
            <?= h((string) $apercu['nom']) ?>
            <span class="gris-clair"><?= h(poids((int) $apercu['poids'])) ?><?=
                $apercu['version'] !== '' ? ' · version ' . h((string) $apercu['version']) : '' ?></span>
        </h3>
        <p><b><?= count($apercu['fichiers']) ?></b> fichiers seront écrits.
        <?php if ($apercu['refuses']): ?>
            <b class="gris-clair" style="color:#b45309"><?= count($apercu['refuses']) ?>
            refusé<?= count($apercu['refuses']) > 1 ? 's' : '' ?></b> :
            <?= h(implode(', ', array_slice($apercu['refuses'], 0, 4))) ?>.
        <?php endif; ?></p>
        <p class="gris-clair"><code>api/config.php</code> et <code>api/data/</code>
        ne sont jamais touchés, quelle que soit l'archive.</p>
        <form method="post">
            <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
            <input type="hidden" name="action" value="poser">
            <input type="hidden" name="archive" value="<?= h((string) $apercu['nom']) ?>">
            <label style="font-weight:400; font-size:.9rem">
                <input type="checkbox" name="effacer" value="oui" checked
                       style="width:auto"> effacer l'archive après la pose
            </label>
            <p style="margin-bottom:0"><button>Poser ces <?= count($apercu['fichiers']) ?> fichiers</button></p>
        </form>

    <?php else: ?>
        <?php // LE CHOIX DE L'ARCHIVE : envoyée depuis le navigateur si elle
              // tient sous le plafond, sinon posée à côté par l'explorateur de
              // l'hébergeur. On dit le plafond, parce que c'est l'erreur qu'on
              // rencontrera vraiment sur un mutualisé. ?>
        <form method="post" enctype="multipart/form-data">
            <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
            <input type="hidden" name="action" value="televerser">
            <label>L'archive <code>.zip</code>
                <span class="gris-clair">(plafond de cet hébergement :
                <?= h(poids(plafondTransfert())) ?>)</span></label>
            <input type="file" name="archive" accept=".zip">
            <p style="margin-bottom:0"><button>Envoyer et regarder ce qu'elle contient</button></p>
        </form>

        <?php if ($archives): ?>
            <h3 style="font-size:.95rem; margin:18px 0 7px">Archives déjà présentes</h3>
            <p class="gris-clair" style="margin-top:0">Posées à la racine du site par
            l'explorateur de votre hébergeur.</p>
            <?php // `archivesPresentes()` REND DES CHEMINS COMPLETS, pas des
                  // tableaux. J'en avais supposé la forme au lieu de la lire :
                  // `$a['nom']` sur une chaîne lève en PHP 8, et le rendu de
                  // toute la section s'arrêtait là — sans un mot à l'écran,
                  // puisque les erreurs ne s'affichent pas en production. Vu au
                  // navigateur : la page s'interrompait juste après ce titre. ?>
            <table>
                <?php foreach ($archives as $chemin): ?>
                <?php $nom = basename((string) $chemin); ?>
                <tr>
                    <td><?= h($nom) ?>
                        <span class="gris-clair"><?= h(poids((int) @filesize($chemin))) ?></span></td>
                    <td style="text-align:right">
                        <form method="post" style="display:inline">
                            <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
                            <input type="hidden" name="action" value="apercu">
                            <input type="hidden" name="archive" value="<?= h($nom) ?>">
                            <button class="gris petit">Voir ce qu'elle contient</button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </table>
        <?php endif; ?>
    <?php endif; ?>

    <form method="post" style="margin-top:16px">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="guichet" value="fermer">
        <button class="gris petit">Refermer le guichet tout de suite</button>
    </form>
<?php endif; ?>

<?php if ($depots): ?>
    <h3 style="font-size:.95rem; margin:18px 0 7px">Derniers dépôts</h3>
    <p class="gris-clair" style="margin-top:0">Si l'un d'eux n'est pas de vous,
    changez votre mot de passe.</p>
    <table>
        <tr><th>Quand (UTC)</th><th>Archive</th><th>Fichiers</th><th>Depuis</th></tr>
        <?php foreach (array_slice($depots, 0, 6) as $d): ?>
        <tr><td class="gris-clair"><?= h((string) ($d['quand'] ?? '')) ?></td>
            <td><?= h((string) ($d['quoi'] ?? '')) ?></td>
            <td><?= (int) ($d['n'] ?? 0) ?></td>
            <td class="gris-clair"><?= h((string) ($d['ou'] ?? '')) ?></td></tr>
        <?php endforeach; ?>
    </table>
<?php endif; ?>

<p class="gris-clair" style="margin-bottom:0">Les mises à jour peuvent aussi
partir du dépôt : on pousse le code, et le site se republie tout seul par SFTP
— voir <code>.github/workflows/deploiement.yml</code>. Rien à transférer à la
main. <b>Ni <code>config.php</code> ni <code>data/</code> ne sont touchés</b>
par une republication : ils ne sont pas dans le dépôt.</p>
<?php
sectionFin();
