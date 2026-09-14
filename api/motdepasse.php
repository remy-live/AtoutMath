<?php
declare(strict_types=1);

/**
 * REFAIRE SON MOT DE PASSE QUAND ON EST ENFERMÉ DEHORS.
 *
 * Rémy : « oui mais mon mail et code ne fonctionnent pas ».
 *
 * LA MAUVAISE SOLUTION, CELLE QU'ON TROUVE PARTOUT : « effacez config.php et
 * relancez install.php ». Elle marche, et elle DÉTRUIT TOUT. `install.php`
 * fabrique une clé de chiffrement neuve ; l'ancienne base, chiffrée avec
 * l'ancienne, devient définitivement illisible — prénoms, identifiants, codes
 * de billets, travail des élèves. On récupère l'accès à une base vide.
 *
 * Ici on ne touche ni à la clé, ni à la base : on remplace une empreinte de
 * mot de passe, et rien d'autre.
 *
 * ── QUI A LE DROIT DE S'EN SERVIR, et la réponse ne peut pas être « celui qui
 * connaît le mot de passe », puisque c'est précisément ce qu'il a perdu.
 *
 * ON DEMANDE UNE PREUVE D'ACCÈS AU SERVEUR. Cette page ne fait rien tant qu'un
 * fichier nommé `MOTDEPASSE-OUI` n'est pas posé à côté d'elle — et pour le
 * poser, il faut le FTP, c'est-à-dire les identifiants de l'hébergement. Celui
 * qui les a peut de toute façon lire et écrire ce qu'il veut : on n'ouvre donc
 * aucune porte qui ne soit déjà ouverte pour lui, et on la referme derrière
 * (le témoin est effacé dès que le mot de passe est changé).
 *
 * C'est la méthode des installations sur hébergement mutualisé, et c'est la
 * seule qui tienne : pas de courriel à envoyer — un site scolaire n'a pas de
 * serveur d'envoi fiable —, pas de question secrète, pas de porte dérobée dans
 * le code.
 */

const RACINE_API = __DIR__;
const TEMOIN = RACINE_API . '/MOTDEPASSE-OUI';

require_once RACINE_API . '/lib/db.php';
require_once RACINE_API . '/lib/schema.php';

$autorise = is_file(TEMOIN);
$erreur = '';
$fait = false;
$comptes = [];

if ($autorise) {
    try {
        migrer();
        // On ne montre que les adresses, jamais les empreintes. Et l'on ne
        // permet de changer que ce qui existe déjà : cette page ne CRÉE pas de
        // professeur, elle en dépanne un.
        $comptes = db()->query('SELECT id, display_name, email FROM teachers ORDER BY email')
            ->fetchAll();
    } catch (Throwable $t) {
        $erreur = "La base est injoignable : " . $t->getMessage();
    }
}

if ($autorise && $erreur === '' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $id = (string) ($_POST['prof'] ?? '');
    $mdp = (string) ($_POST['mdp'] ?? '');
    $mdp2 = (string) ($_POST['mdp2'] ?? '');

    $connu = in_array($id, array_column($comptes, 'id'), true);

    if (!$connu) {
        $erreur = 'Choisissez un compte.';
    } elseif (mb_strlen($mdp) < 12) {
        $erreur = 'Le mot de passe doit faire au moins douze caractères.';
    } elseif ($mdp !== $mdp2) {
        $erreur = 'Les deux mots de passe ne sont pas identiques.';
    } else {
        db()->prepare('UPDATE teachers SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($mdp, PASSWORD_DEFAULT), $id]);
        // LE TÉMOIN PART AVEC LE MOT DE PASSE. Laisser cette page ouverte
        // après usage, c'est laisser la porte entrebâillée — et l'on n'y
        // penserait plus.
        @unlink(TEMOIN);
        $autorise = false;
        $fait = true;
    }
}
?><!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Refaire le mot de passe — AtoutMath</title>
<style>
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0;
       background: #f6f7fb; color: #1a202c; }
main { max-width: 640px; margin: 0 auto; padding: 34px 18px 80px; }
h1 { font-size: 1.45rem; margin: 0 0 6px; }
h2 { font-size: 1.02rem; margin: 0 0 10px; }
.sous { color: #64748b; margin: 0 0 22px; }
.carte { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
         padding: 18px; margin-bottom: 16px; }
.mot { background: #f0fdf4; border: 1px solid #bbf7d0; color: #14532d;
       border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-weight: 600; }
.erreur { background: #fff5f5; border: 1px solid #fecaca; color: #7f1d1d;
          border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-weight: 600; }
label { display: block; font-weight: 700; font-size: .88rem; margin: 14px 0 4px; }
input, select { width: 100%; padding: 10px 12px; font: inherit;
        border: 1px solid #cbd5e1; border-radius: 10px; background: #f6f7fb; }
button, .bouton { font: inherit; font-weight: 700; padding: 11px 18px; border: none;
        border-radius: 10px; background: #4f46e5; color: #fff; cursor: pointer;
        text-decoration: none; display: inline-block; }
code { background: #eef2ff; color: #3730a3; padding: 2px 7px; border-radius: 6px;
       font-family: ui-monospace, Menlo, Consolas, monospace; }
.gris { color: #64748b; font-size: .9rem; }
ol { padding-left: 20px; } li { margin: 6px 0; }
</style></head><body><main>

<h1>Refaire le mot de passe</h1>
<p class="sous">Sans toucher à la clé de chiffrement, ni à la base, ni aux élèves.</p>

<?php if ($erreur): ?><div class="erreur"><?= htmlspecialchars($erreur, ENT_QUOTES) ?></div><?php endif; ?>

<?php if ($fait): ?>

    <div class="mot">C'est fait. Le mot de passe est changé.</div>
    <div class="carte">
        <p>Le fichier <code>MOTDEPASSE-OUI</code> a été effacé : cette page est
           refermée. Il faudra le reposer pour vous en servir à nouveau.</p>
        <p><a class="bouton" href="admin/index.php">Aller à l'administration</a></p>
    </div>

<?php elseif (!$autorise): ?>

    <div class="carte">
        <h2>Prouvez d'abord que le serveur est à vous</h2>
        <p>Cette page ne peut pas demander votre mot de passe : c'est justement
           celui que vous avez perdu. Elle demande donc autre chose — <b>la preuve
           que vous avez accès aux fichiers</b>.</p>
        <ol>
            <li>Par FTP (ou l'explorateur de votre hébergeur), placez dans le
                dossier <code>api/</code> un fichier vide nommé exactement
                <code>MOTDEPASSE-OUI</code> — sans extension.</li>
            <li>Rechargez cette page.</li>
        </ol>
        <p class="gris">Celui qui a vos identifiants FTP peut déjà tout lire et tout
           écrire sur ce site : on n'ouvre aucune porte qui ne le soit déjà pour lui.
           Et elle se referme toute seule dès que le mot de passe est changé.</p>
    </div>

    <div class="carte">
        <h2>⚠ Ce qu'il ne faut surtout pas faire</h2>
        <p>On lit souvent : « effacez <code>config.php</code> et relancez
           l'installation ». <b>Cela détruirait tout.</b> L'installation fabrique une
           clé de chiffrement neuve, et l'ancienne base — chiffrée avec l'ancienne —
           devient définitivement illisible : prénoms, identifiants, codes des
           billets, travail des élèves.</p>
        <p style="margin-bottom:0">Vous récupéreriez l'accès à une base vide.</p>
    </div>

<?php else: ?>

    <div class="carte">
        <h2>Le compte à dépanner</h2>
        <form method="post">
            <label for="prof">Compte</label>
            <select id="prof" name="prof" required>
                <?php foreach ($comptes as $c): ?>
                <option value="<?= htmlspecialchars($c['id'], ENT_QUOTES) ?>">
                    <?= htmlspecialchars($c['email'], ENT_QUOTES) ?>
                    — <?= htmlspecialchars($c['display_name'], ENT_QUOTES) ?>
                </option>
                <?php endforeach; ?>
            </select>
            <p class="gris">L'adresse exacte est écrite ci-dessus : si vous ne la
               reconnaissez pas, c'est peut-être là qu'était l'erreur.</p>

            <label for="mdp">Nouveau mot de passe</label>
            <input type="password" id="mdp" name="mdp" required minlength="12"
                   autocomplete="new-password">
            <label for="mdp2">Le même, pour vérifier</label>
            <input type="password" id="mdp2" name="mdp2" required minlength="12"
                   autocomplete="new-password">
            <p class="gris">Douze caractères au minimum. Il ouvre l'administration
               <b>et</b> l'espace professeur de l'application : c'est le même.</p>
            <p><button>Changer le mot de passe</button></p>
        </form>
    </div>

<?php endif; ?>

</main></body></html>
