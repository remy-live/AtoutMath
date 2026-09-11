<?php
declare(strict_types=1);

/**
 * CONNEXION ET LISTE DES CLASSES.
 *
 * La première page que Rémy voit : ses classes, leur code à dicter, combien
 * d'élèves y sont, et combien sont en ligne en ce moment. Le reste — la
 * conduite de la séance — vit dans `classe.php`.
 */

require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../lib/seance.php';
demarrerSession();

if (isset($_GET['deconnexion'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: index.php');
    exit;
}

// La base peut avoir été installée avant une mise à jour qui ajoute une table :
// on remet le schéma à niveau à chaque entrée. C'est idempotent et instantané.
try {
    migrer();
} catch (Throwable $t) {
    http_response_code(500);
    exit('Base de données injoignable. Avez-vous lancé api/install.php ?');
}

$erreur = '';

// --- Connexion -------------------------------------------------------------
if (empty($_SESSION['prof']) && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $email = trim((string) ($_POST['email'] ?? ''));
    $mdp   = (string) ($_POST['mdp'] ?? '');
    // L'ADRESSE SE COMPARE SANS TENIR COMPTE DES MAJUSCULES.
    //
    // Rémy, enfermé dehors : « mon mail et code ne fonctionnent pas ». Une
    // adresse électronique ne distingue pas la casse — personne au monde ne
    // considère « Prof@College.fr » et « prof@college.fr » comme deux boîtes
    // différentes. Mais `WHERE email = ?` le faisait, et le message de refus
    // est le même dans les deux cas, exprès : impossible de comprendre qu'on
    // s'est simplement trompé de majuscule.
    //
    // `LOWER()` des deux côtés : la comparaison suit enfin ce que tout le
    // monde croit qu'elle fait.
    $stmt = db()->prepare('SELECT * FROM teachers WHERE LOWER(email) = LOWER(?) LIMIT 1');
    $stmt->execute([$email]);
    $prof = $stmt->fetch();
    // LA MÊME PHRASE DANS LES DEUX CAS. Dire « cette adresse n'existe pas »
    // apprend à un inconnu quelles adresses existent.
    if ($prof && password_verify($mdp, $prof['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['prof'] = $prof['id'];
        redirige('index.php');
    }
    // Une seconde d'attente : de quoi rendre l'essai en boucle inintéressant.
    sleep(1);
    $erreur = 'Adresse ou mot de passe incorrect.';
}

if (empty($_SESSION['prof'])) {
    ?><!doctype html><html lang="fr"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AtoutMath — connexion</title><style>
    body { font: 16px/1.5 system-ui, sans-serif; background: #f6f7fb; color: #1a202c;
           display: grid; place-items: center; min-height: 100vh; margin: 0; }
    form { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
           padding: 26px; width: min(400px, 92vw); }
    h1 { font-size: 1.3rem; margin: 0 0 18px; }
    label { display: block; font-weight: 600; font-size: .9rem; margin: 14px 0 4px; }
    input { width: 100%; padding: 9px 11px; border: 1px solid #cbd5e1;
            border-radius: 9px; font: inherit; box-sizing: border-box; }
    button { width: 100%; margin-top: 20px; font: inherit; font-weight: 700;
             padding: 11px; border: none; border-radius: 10px; background: #4f46e5; color: #fff; }
    .err { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
           border-radius: 9px; padding: 10px 12px; margin-top: 14px; font-size: .92rem; }
    </style></head><body>
    <form method="post">
        <h1>AtoutMath — professeur</h1>
        <label>Adresse électronique<input type="email" name="email" required autofocus></label>
        <label>Mot de passe<input type="password" name="mdp" required></label>
        <?php if ($erreur): ?><div class="err"><?= h($erreur) ?></div><?php endif; ?>
        <button>Entrer</button>
    </form></body></html><?php
    exit;
}

$prof = profConnecte();

// LA PURGE PASSE ICI, une fois par jour au plus. Il n'y a pas de `cron` sur un
// hébergement mutualisé, et une conservation limitée qui dépend d'une tâche
// planifiée qu'on ne peut pas installer n'est pas une conservation limitée.
purgerSiNecessaire();

// --- Créer une classe ------------------------------------------------------
if (($_POST['action'] ?? '') === 'creer') {
    exigerJeton();
    $nom = trim((string) ($_POST['nom'] ?? ''));
    if ($nom !== '') {
        // Un code qui n'existe pas déjà : on retire, au pire quelques fois.
        do {
            $code = joinCode();
            $s = db()->prepare('SELECT 1 FROM classes WHERE join_code = ?');
            $s->execute([$code]);
        } while ($s->fetch());
        db()->prepare('INSERT INTO classes (id, teacher_id, name, join_code, level) VALUES (?, ?, ?, ?, ?)')
            ->execute([uuidv4(), $prof['id'], $nom, $code, trim((string) ($_POST['niveau'] ?? '')) ?: null]);
        redirige('index.php', "Classe « $nom » créée. Le code à dicter est $code.");
    }
    redirige('index.php');
}

// --- La liste --------------------------------------------------------------
$stmt = db()->prepare(
    'SELECT c.*,
            (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS combien,
            (SELECT MAX(s.last_seen_at) FROM students s WHERE s.class_id = c.id) AS vu
     FROM classes c WHERE c.teacher_id = ? ORDER BY c.archived ASC, c.created_at DESC'
);
$stmt->execute([$prof['id']]);
$classes = $stmt->fetchAll();

// Combien d'élèves en ligne, par classe — la question de la séance en cours.
$enLigne = [];
foreach ($classes as $c) {
    $s = db()->prepare('SELECT last_seen_at FROM students WHERE class_id = ?');
    $s->execute([$c['id']]);
    $enLigne[$c['id']] = count(array_filter($s->fetchAll(), fn ($x) => estEnLigne($x['last_seen_at'])));
}

enTete('Mes classes', $prof, 'classes');
?>
<h1>Mes classes</h1>

<?php if (!$classes): ?>
<div class="carte">
    <h2>Aucune classe pour l'instant</h2>
    <p class="gris-clair">Créez-en une ci-dessous. Vous obtiendrez un code à six
    signes : c'est tout ce que vos élèves auront à saisir, avec leur prénom.</p>
</div>
<?php else: ?>
<div class="carte">
<table>
    <tr><th>Classe</th><th>Code à dicter</th><th>Élèves</th><th>En ligne</th><th>État</th><th></th></tr>
    <?php foreach ($classes as $c): ?>
    <tr>
        <td><b><?= h($c['name']) ?></b><?= $c['level'] ? ' <span class="gris-clair">' . h($c['level']) . '</span>' : '' ?></td>
        <td><span class="code"><?= h($c['join_code']) ?></span></td>
        <td><?= (int) $c['combien'] ?></td>
        <td><span class="pastille <?= $enLigne[$c['id']] ? 'on' : '' ?>"></span><?= $enLigne[$c['id']] ?></td>
        <td><?= $c['archived'] ? 'archivée' : ($c['locked'] ? '🔒 verrouillée' : 'ouverte') ?></td>
        <td style="text-align:right"><a class="bouton" href="classe.php?id=<?= h($c['id']) ?>">Conduire la séance</a></td>
    </tr>
    <?php endforeach; ?>
</table>
</div>
<?php endif; ?>

<div class="carte">
    <h2>Nouvelle classe</h2>
    <form method="post" class="rangee">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="action" value="creer">
        <div><label>Nom</label><input type="text" name="nom" placeholder="6e B" required></div>
        <div><label>Niveau <span class="gris-clair">(facultatif)</span></label>
             <input type="text" name="niveau" placeholder="6e"></div>
        <button>Créer</button>
    </form>
</div>
<?php piedDePage();
