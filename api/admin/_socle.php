<?php
declare(strict_types=1);

/**
 * LE SOCLE DE L'ADMINISTRATION : session, gabarit, et les gestes du professeur.
 *
 * L'API parle JSON à l'application ; l'administration, elle, est faite de pages
 * HTML ordinaires. C'est délibéré : Rémy s'en sert depuis le fond de la classe,
 * sur le poste de l'établissement, parfois sans savoir quel navigateur c'est.
 * Des formulaires qui marchent sans JavaScript ne peuvent pas tomber en panne
 * au mauvais moment.
 *
 * L'AUTHENTIFICATION EST UNE SESSION PHP, pas le jeton HMAC de l'API. Un jeton
 * dans un en-tête convient à une application ; un cookie de session convient à
 * un navigateur qu'on referme, et il expire tout seul.
 */

require_once __DIR__ . '/../lib/schema.php';

function demarrerSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_set_cookie_params([
        'lifetime' => 0,          // le temps du navigateur : on ferme, on est déconnecté
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        // En clair, un cookie de session se vole. On exige HTTPS dès que la
        // page y est servie ; en local (installation, essais) on ne le peut pas.
        'secure'   => (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off'),
    ]);
    session_name('atoutmath_prof');
    session_start();
}

/** Le professeur connecté, ou une redirection vers la page de connexion. */
function profConnecte(): array
{
    demarrerSession();
    $id = $_SESSION['prof'] ?? null;
    if ($id) {
        $stmt = db()->prepare('SELECT * FROM teachers WHERE id = ?');
        $stmt->execute([$id]);
        $prof = $stmt->fetch();
        if ($prof) {
            return $prof;
        }
    }
    header('Location: index.php');
    exit;
}

/**
 * LE JETON ANTI-REJEU. Toute action qui CHANGE quelque chose passe par un
 * formulaire POST portant ce jeton : sans lui, une page piégée pourrait faire
 * effacer une classe à un professeur simplement connecté.
 */
function jeton(): string
{
    demarrerSession();
    if (empty($_SESSION['jeton'])) {
        $_SESSION['jeton'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['jeton'];
}

function exigerJeton(): void
{
    demarrerSession();
    $donne = (string) ($_POST['jeton'] ?? '');
    if ($donne === '' || !hash_equals((string) ($_SESSION['jeton'] ?? ''), $donne)) {
        http_response_code(400);
        exit('Formulaire expiré. Revenez en arrière et recommencez.');
    }
}

function h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

/** Le message d'une action réussie, affiché une fois puis oublié. */
function direUneFois(?string $mot = null): ?string
{
    demarrerSession();
    if ($mot !== null) {
        $_SESSION['mot'] = $mot;
        return null;
    }
    $m = $_SESSION['mot'] ?? null;
    unset($_SESSION['mot']);
    return $m;
}

function redirige(string $url, string $mot = ''): void
{
    if ($mot !== '') {
        direUneFois($mot);
    }
    header('Location: ' . $url);
    exit;
}

/**
 * « Vu il y a trois minutes » — l'information que le professeur cherche
 * vraiment quand il regarde sa classe pendant la séance.
 */
function depuis(?string $quand): string
{
    if (!$quand) {
        return 'jamais venu';
    }
    $secondes = time() - strtotime($quand . ' UTC');
    if ($secondes < 0) {
        $secondes = 0;
    }
    if ($secondes < 90)    return 'en ligne';
    if ($secondes < 3600)  return 'il y a ' . (int) ($secondes / 60) . ' min';
    if ($secondes < 86400) return 'il y a ' . (int) ($secondes / 3600) . ' h';
    return 'il y a ' . (int) ($secondes / 86400) . ' j';
}

function estEnLigne(?string $quand): bool
{
    return $quand !== null && (time() - strtotime($quand . ' UTC')) < 90;
}

function enTete(string $titre, array $prof, string $ici = ''): void
{
    $mot = direUneFois();
    ?><!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($titre) ?> — AtoutMath</title>
<style>
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0;
       background: #f6f7fb; color: #1a202c; }
header { background: #1e293b; color: #fff; padding: 12px 20px; display: flex;
         align-items: center; gap: 18px; flex-wrap: wrap; }
header b { font-size: 1.05rem; }
header nav { display: flex; gap: 16px; }
header nav a { color: #cbd5e1; text-decoration: none; font-weight: 600; }
header nav a.ici, header nav a:hover { color: #fff; }
header .qui { margin-left: auto; color: #94a3b8; font-size: .88rem; }
header .qui a { color: #cbd5e1; }
main { max-width: 1040px; margin: 0 auto; padding: 22px 18px 70px; }
h1 { font-size: 1.45rem; margin: 0 0 18px; }
h2 { font-size: 1.05rem; margin: 0 0 12px; }
.carte { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
         padding: 18px; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid #eef1f6; }
th { font-size: .82rem; text-transform: uppercase; letter-spacing: .03em; color: #64748b; }
tr:last-child td { border-bottom: none; }
input[type=text], input[type=email], input[type=password], input[type=number], select, textarea {
    padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 9px; font: inherit; width: 100%; }
textarea { min-height: 74px; resize: vertical; }
label { display: block; font-weight: 600; font-size: .88rem; margin: 12px 0 4px; }
button, .bouton { font: inherit; font-weight: 700; padding: 9px 16px; border-radius: 9px;
         border: none; background: #4f46e5; color: #fff; cursor: pointer; text-decoration: none;
         display: inline-block; }
button.gris { background: #e2e8f0; color: #1a202c; }
button.rouge { background: #dc2626; }
button.petit { padding: 5px 10px; font-size: .85rem; }
.mot { background: #f0fdf4; border: 1px solid #bbf7d0; color: #14532d;
       border-radius: 10px; padding: 11px 14px; margin-bottom: 16px; font-weight: 600; }
.pastille { display: inline-block; width: 9px; height: 9px; border-radius: 50%;
            background: #cbd5e1; margin-right: 6px; }
.pastille.on { background: #16a34a; }
.code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 1.25rem;
        font-weight: 800; letter-spacing: .12em; background: #eef2ff; color: #3730a3;
        padding: 5px 12px; border-radius: 9px; display: inline-block; }
.rangee { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.rangee > * { flex: 1; min-width: 150px; }
.rangee button { flex: 0 0 auto; }
.gris-clair { color: #64748b; font-size: .88rem; }
.danger { border-color: #fecaca; background: #fff5f5; }
/* L'identifiant d'exercice affiché dans le rang d'un élève : c'est un bouton,
   parce qu'on clique dessus pour le recopier dans le champ de déblocage. Il
   garde l'apparence d'un texte cliquable et non celle d'un bouton plein, qui
   ferait croire à une action immédiate. */
.lien-exo { font: inherit; font-family: ui-monospace, Menlo, Consolas, monospace;
            font-size: .9rem; background: #eef2ff; color: #3730a3; border: none;
            padding: 2px 7px; border-radius: 6px; cursor: pointer; }
.lien-exo:hover { background: #c7d2fe; }
</style></head><body>
<header>
  <b>AtoutMath</b>
  <nav>
    <a href="index.php" class="<?= $ici === 'classes' ? 'ici' : '' ?>">Mes classes</a>
    <a href="sante.php" class="<?= $ici === 'sante' ? 'ici' : '' ?>">Santé</a>
    <a href="rapport.php" class="<?= $ici === 'rapport' ? 'ici' : '' ?>">Rapport</a>
  </nav>
  <span class="qui"><?= h($prof['display_name']) ?> ·
    <a href="index.php?deconnexion=1">se déconnecter</a></span>
</header>
<main>
<?php if ($mot): ?><div class="mot"><?= h($mot) ?></div><?php endif; ?>
<?php
}

function piedDePage(): void
{
    echo "</main></body></html>\n";
}
