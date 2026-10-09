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
/* LE NOM EST UN LIEN, et il doit en avoir l'air sans crier : la même graisse
   qu'avant, le même blanc, et un soulignement au survol — assez pour qu'on
   essaie, pas assez pour qu'on croie avoir cliqué par erreur. */
header .marque { font-size: 1.05rem; font-weight: 700; color: #fff;
                 text-decoration: none; }
header .marque:hover { text-decoration: underline; }
header .marque:focus-visible { outline: 2px solid #fff; outline-offset: 3px;
                               border-radius: 4px; }
/* PLUS DE BARRE DE NAVIGATION : il n'y a qu'une page. Elle proposait
   « Mes classes », « Santé », « Rapport » ; les classes ont quitté
   l'administration (elles se conduisent dans le logiciel) et les deux autres
   sont devenues des sections d'ici. */
header .sous { color: #94a3b8; font-size: .86rem; }
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

/* ─────────────── LES SECTIONS QUI SE DÉPLIENT ───────────────
   Rémy : « la zone admin n'a plus besoin de classe et est vieillotte, va à
   l'essentiel avec des choses déroulantes ».

   `details` EST NATIF, ET C'EST LA RAISON DU CHOIX. Cette administration est
   faite de pages HTML ordinaires parce que Rémy s'en sert depuis le fond de la
   classe, sur le poste de l'établissement, parfois sans savoir quel navigateur
   c'est. Un repli écrit en JavaScript aurait été la seule chose de la page
   capable de tomber en panne. */
.bloc {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 13px;
    margin-bottom: 11px; overflow: hidden;
    box-shadow: 0 1px 2px rgba(15, 23, 42, .06);
}
.bloc > summary {
    display: flex; align-items: center; gap: 11px; padding: 14px 17px;
    cursor: pointer; list-style: none; font-weight: 700; user-select: none;
}
.bloc > summary::-webkit-details-marker { display: none; }
.bloc > summary:hover { background: #f8f9fe; }
.bloc > summary:focus-visible { outline: 2px solid #4f46e5; outline-offset: -2px; }
/* LA FLÈCHE TOURNE, ELLE NE CHANGE PAS DE DESSIN : deux glyphes différents
   pour un même bouton se lisent comme deux boutons. */
.fleche { flex: 0 0 auto; color: #64748b; transition: transform .16s ease; }
.bloc[open] > summary .fleche { transform: rotate(90deg); }
@media (prefers-reduced-motion: reduce) { .fleche { transition: none; } }
.titre-bloc { flex: 1; min-width: 0; }
.titre-bloc small { display: block; font-weight: 400; color: #64748b; font-size: .84rem; }
/* L'ÉTAT SE LIT SANS DÉPLIER. C'est tout l'intérêt d'avoir replié : sans cette
   pastille, il faudrait ouvrir les cinq sections pour savoir laquelle réclame
   quelque chose. */
.etiquette {
    flex: 0 0 auto; font-size: .74rem; font-weight: 800; letter-spacing: .04em;
    text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
    background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;
}
.etiquette--attention { background: #fffbeb; color: #b45309; border-color: #fde68a; }
.etiquette--grave { background: #fff5f5; color: #dc2626; border-color: #fecaca; }
.etiquette--neutre { background: #eef2ff; color: #4338ca; border-color: #e0e7ff; }
.dedans { padding: 2px 17px 17px; border-top: 1px solid #e2e8f0; }
.dedans > *:first-child { margin-top: 14px; }
/* Une section n'a plus de carte à l'intérieur : elle EST la carte. */
.dedans .carte { border: none; padding: 0; margin: 0 0 4px; }

/* LE VERDICT NE PARAÎT QUE S'IL A QUELQUE CHOSE À DIRE. Tout en vert, il ne
   servirait qu'à repousser d'un cran le dépôt — or c'est le dépôt qu'on vient
   faire. Un point grave, lui, doit se voir sans rien déplier. */
.avis {
    display: flex; gap: 11px; align-items: center;
    border-radius: 12px; padding: 10px 15px; margin-bottom: 10px;
    background: #fffbeb; border: 1px solid #fde68a;
}
.avis--grave { background: #fff5f5; border-color: #fecaca; }
.avis .marque { font-size: 1.05rem; font-weight: 800; color: #b45309; }
.avis--grave .marque { color: #dc2626; }
.avis p { margin: 0; font-size: .89rem; }
.rappel { color: #64748b; font-size: .86rem; margin: 0 0 18px; padding: 0 3px; }
@media (max-width: 560px) { .etiquette { display: none; } }
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
  <!-- LE NOM RAMÈNE AU SITE, parce que c'est là qu'on clique.

       Rémy : « dans la partie admin, j'aimerai pouvoir cliquer sur le
       atoutmath en haut à gauche pour aller sur le site ».

       C'est le geste du web entier : le nom en haut à gauche ramène chez soi.
       Ici il ne ramenait nulle part — on repartait par le bouton « retour »
       du navigateur, ou en retapant l'adresse. L'administration vit dans
       `api/admin/` : deux dossiers plus haut, et l'on y est.

       `../../` ET NON UNE ADRESSE ABSOLUE : le site de Rémy est à la racine,
       mais rien ne garantit qu'il le soit toujours — un sous-dossier, un
       essai, un second site sur le même hébergement. Un chemin relatif suit
       l'installation sans qu'on ait à lui dire où elle est. -->
  <a class="marque" href="../../" title="Retourner au site">AtoutMath</a>
  <span class="sous">administration</span>
  <span class="qui"><?= h($prof['display_name']) ?> ·
    <a href="index.php?deconnexion=1">se déconnecter</a></span>
</header>
<main>
<?php if ($mot): ?><div class="mot"><?= h($mot) ?></div><?php endif; ?>
<?php
}

/**
 * OUVRIR UNE SECTION DÉPLIABLE.
 *
 * @param string $id         l'ancre, pour qu'un lien puisse ouvrir CETTE section
 * @param string $titre      ce qu'on lit replié
 * @param string $sous       une ligne de contexte sous le titre
 * @param string $etiquette  l'état, lisible sans déplier ('' pour aucune)
 * @param string $ton        '' (vert) · 'attention' · 'grave' · 'neutre'
 * @param bool   $ouvert     dépliée au chargement
 */
function sectionDebut(
    string $id,
    string $titre,
    string $sous = '',
    string $etiquette = '',
    string $ton = '',
    bool $ouvert = false
): void {
    // L'ANCRE OUVRE LA SECTION. `deposer.php`, le `README` et les instructions
    // du paquet renvoient vers des pages qui n'existent plus : elles renvoient
    // maintenant ici, sur une ancre, et il faut que la section visée s'ouvre.
    // Un `<details>` fermé dont on vise l'intérieur ne s'ouvre pas tout seul
    // dans tous les navigateurs — d'où le fragment de script en pied de page.
    ?>
    <details class="bloc" id="<?= h($id) ?>"<?= $ouvert ? ' open' : '' ?>>
        <summary>
            <svg class="fleche" width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="3" stroke-linecap="round"
                 stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>
            <span class="titre-bloc"><?= h($titre) ?>
                <?= $sous !== '' ? '<small>' . h($sous) . '</small>' : '' ?></span>
            <?php if ($etiquette !== ''): ?>
                <span class="etiquette<?= $ton !== '' ? ' etiquette--' . h($ton) : '' ?>"><?= h($etiquette) ?></span>
            <?php endif; ?>
        </summary>
        <div class="dedans">
    <?php
}

function sectionFin(): void
{
    echo "        </div>\n    </details>\n";
}

/**
 * L'ÉTAT DE LA SANTÉ, EN DEUX MOTS SUR UNE PASTILLE.
 *
 * C'est tout l'intérêt d'avoir replié : sans elle, il faudrait ouvrir la
 * section pour savoir s'il y a quelque chose à y voir.
 *
 * LES « NON VÉRIFIABLES » NE SONT PAS DES FAUTES. Certains hébergements
 * interdisent à PHP d'aller chercher ses propres pages : le contrôle ne peut
 * alors pas conclure, et écrire « 1 problème » serait mentir dans l'autre sens.
 */
function etiquetteSante(int $graves, int $tiedes, int $flous): string
{
    if ($graves > 0) {
        return $graves . ($graves > 1 ? ' graves' : ' grave');
    }
    if ($tiedes > 0) {
        return $tiedes . ' à regarder';
    }
    return $flous > 0 ? $flous . ' non vérifiable' . ($flous > 1 ? 's' : '') : 'tout va bien';
}

function tonSante(int $graves, int $tiedes): string
{
    return $graves > 0 ? 'grave' : ($tiedes > 0 ? 'attention' : '');
}

function piedDePage(): void
{
    // UNE ANCRE DOIT OUVRIR SA SECTION. Sans cela, `…/index.php#sante` défile
    // jusqu'à un `<details>` fermé : l'utilisateur atterrit sur un titre replié
    // et croit que le lien s'est trompé de page. Trois lignes, et la page
    // marche toujours sans elles — elle demande juste un clic de plus.
    echo <<<'HTML'
    <script>
    (function () {
        var ouvrirLAncre = function () {
            var id = location.hash.slice(1);
            if (!id) return;
            var bloc = document.getElementById(id);
            if (bloc && bloc.tagName === 'DETAILS') { bloc.open = true; bloc.scrollIntoView(); }
        };
        ouvrirLAncre();
        window.addEventListener('hashchange', ouvrirLAncre);
    })();
    </script>

    HTML;
    echo "</main></body></html>\n";
}
