<?php
declare(strict_types=1);

/**
 * CONDUIRE UNE SÉANCE.
 *
 * Rémy : « avoir un vrai contrôle sur ce qu'ils font », « la possibilité
 * d'envoyer un message individuellement », « pouvoir supprimer ou autoriser le
 * saut d'un exercice au cas où un exercice plante et empêche la progression »,
 * « verrouiller la partie élève pour qu'il n'ait accès qu'à ce que je leur
 * donne ».
 *
 * Tout tient sur une page, parce que pendant une séance on ne navigue pas : on
 * regarde, et on agit. De haut en bas : l'état de la classe et son verrou, la
 * liste des élèves avec ce qu'ils font en ce moment, le mot à envoyer, les
 * exercices débloqués, et enfin ce qui efface.
 *
 * LA PAGE SE RAFRAÎCHIT TOUTE SEULE. Une séance dure une heure et le professeur
 * a les mains prises ; recharger à la main pour savoir qui a fini n'arrive
 * jamais. Vingt secondes, et jamais pendant qu'un formulaire est ouvert — voir
 * le script en bas de page.
 */

require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../lib/projections.php';
require_once __DIR__ . '/../lib/seance.php';
require_once __DIR__ . '/../lib/coffre.php';
// `derniereActivite()` a quitté cette page pour `lib/eleves.php` : le
// direct de l'application s'en sert exactement de la même façon, et une
// seconde version aurait fini par répondre autre chose.
require_once __DIR__ . '/../lib/eleves.php';

$prof = profConnecte();
$id = (string) ($_GET['id'] ?? '');

$stmt = db()->prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?');
$stmt->execute([$id, $prof['id']]);
$classe = $stmt->fetch();
if (!$classe) {
    redirige('index.php', "Cette classe n'existe pas.");
}
$retour = 'classe.php?id=' . urlencode($id);

// ------------------------------------------------------------------ Actions
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigerJeton();
    $action = (string) ($_POST['action'] ?? '');

    if ($action === 'verrou') {
        $on = ($_POST['verrou'] ?? '') === 'on' ? 1 : 0;
        db()->prepare('UPDATE classes SET locked = ? WHERE id = ?')->execute([$on, $id]);
        redirige($retour, $on
            ? "Classe verrouillée : les élèves ne voient plus que ce que vous leur donnez."
            : 'Classe déverrouillée : les élèves retrouvent tout le catalogue.');
    }

    if ($action === 'consigne') {
        $mot = trim((string) ($_POST['notice'] ?? ''));
        db()->prepare('UPDATE classes SET notice = ? WHERE id = ?')->execute([$mot ?: null, $id]);
        redirige($retour, $mot === '' ? 'Consigne retirée.' : 'Consigne affichée à toute la classe.');
    }

    if ($action === 'message') {
        $corps = trim((string) ($_POST['corps'] ?? ''));
        $pour  = (string) ($_POST['pour'] ?? '');
        if ($corps !== '') {
            if ($pour === 'classe') {
                db()->prepare('INSERT INTO messages (id, class_id, body) VALUES (?, ?, ?)')
                    ->execute([uuidv4(), $id, chiffrer(mb_substr($corps, 0, 500))]);
                redirige($retour, 'Message envoyé à toute la classe.');
            }
            // On vérifie que l'élève est bien DE CETTE CLASSE : l'identifiant
            // vient du formulaire, donc du navigateur, donc on ne le croit pas.
            $s = db()->prepare('SELECT first_name FROM students WHERE id = ? AND class_id = ?');
            $s->execute([$pour, $id]);
            $eleve = eleveLisible($s->fetch());
            if ($eleve) {
                db()->prepare('INSERT INTO messages (id, student_id, body) VALUES (?, ?, ?)')
                    ->execute([uuidv4(), $pour, chiffrer(mb_substr($corps, 0, 500))]);
                redirige($retour, 'Message envoyé à ' . $eleve['first_name'] . '.');
            }
        }
        redirige($retour);
    }

    if ($action === 'exercice') {
        $exo  = trim((string) ($_POST['exercice'] ?? ''));
        $mode = ($_POST['mode'] ?? 'saut') === 'retire' ? 'retire' : 'saut';
        $pour = (string) ($_POST['pour'] ?? 'classe');
        if ($exo !== '') {
            $eleveId = null;
            if ($pour !== 'classe') {
                $s = db()->prepare('SELECT id FROM students WHERE id = ? AND class_id = ?');
                $s->execute([$pour, $id]);
                $eleveId = ($s->fetch()['id'] ?? null);
            }
            db()->prepare('INSERT INTO overrides (id, class_id, student_id, exercise_id, mode) VALUES (?, ?, ?, ?, ?)')
                ->execute([uuidv4(), $eleveId ? null : $id, $eleveId, mb_substr($exo, 0, 80), $mode]);
            redirige($retour, $mode === 'retire'
                ? "L'exercice « $exo » est retiré du parcours."
                : "Le saut de « $exo » est autorisé : un bouton « passer » apparaîtra.");
        }
        redirige($retour);
    }

    if ($action === 'exercice-annuler') {
        db()->prepare('DELETE FROM overrides WHERE id = ? AND (class_id = ? OR student_id IN
                       (SELECT id FROM students WHERE class_id = ?))')
            ->execute([(string) ($_POST['over'] ?? ''), $id, $id]);
        redirige($retour, 'Réglage retiré : l’exercice redevient obligatoire.');
    }

    if ($action === 'eleve-bloquer') {
        $on = ($_POST['bloque'] ?? '') === 'on' ? 1 : 0;
        db()->prepare('UPDATE students SET blocked = ? WHERE id = ? AND class_id = ?')
            ->execute([$on, (string) ($_POST['eleve'] ?? ''), $id]);
        redirige($retour, $on ? 'Élève mis de côté : il ne peut plus se rattacher.' : 'Élève réactivé.');
    }

    if ($action === 'eleve-effacer') {
        // La cascade emporte ses événements et ses messages. C'est le droit à
        // l'effacement, et il doit être immédiat et total.
        $s = db()->prepare('SELECT first_name FROM students WHERE id = ? AND class_id = ?');
        $s->execute([(string) ($_POST['eleve'] ?? ''), $id]);
        $nom = dechiffrer($s->fetch()['first_name'] ?? null);
        db()->prepare('DELETE FROM students WHERE id = ? AND class_id = ?')
            ->execute([(string) ($_POST['eleve'] ?? ''), $id]);
        redirige($retour, $nom ? "$nom et tout son travail ont été effacés." : 'Élève effacé.');
    }

    if ($action === 'vider') {
        // « je ferai une séance unique et après je détruirai la liste des
        // élèves ». Un bouton, une confirmation écrite, et il ne reste rien.
        if (trim((string) ($_POST['confirmation'] ?? '')) !== 'EFFACER') {
            redirige($retour, "Rien n'a été effacé : il fallait écrire EFFACER.");
        }
        db()->prepare('DELETE FROM students WHERE class_id = ?')->execute([$id]);
        redirige($retour, 'Tous les élèves de cette classe, et tout leur travail, ont été effacés.');
    }

    if ($action === 'supprimer-classe') {
        if (trim((string) ($_POST['confirmation'] ?? '')) !== 'EFFACER') {
            redirige($retour, "Rien n'a été effacé : il fallait écrire EFFACER.");
        }
        db()->prepare('DELETE FROM classes WHERE id = ? AND teacher_id = ?')->execute([$id, $prof['id']]);
        redirige('index.php', 'Classe supprimée, avec ses élèves et leur travail.');
    }

    redirige($retour);
}

// ------------------------------------------------------------------ Lecture
$s = db()->prepare('SELECT * FROM students WHERE class_id = ?');
$s->execute([$id]);
// Déchiffrer d'abord, trier ensuite : `ORDER BY` sur du texte chiffré trierait
// des vecteurs d'initialisation tirés au hasard. Voir `lib/coffre.php`.
$eleves = trierParPrenom(array_map('eleveLisible', $s->fetchAll()));

$activites = [];
$exercicesVus = [];
foreach ($eleves as $e) {
    $a = $activites[$e['id']] = derniereActivite($e['id']);
    if ($a['exo']) {
        $exercicesVus[$a['exo']] = true;
    }
}
ksort($exercicesVus);

$s = db()->prepare(
    'SELECT o.*, st.first_name FROM overrides o
     LEFT JOIN students st ON st.id = o.student_id
     WHERE o.class_id = ? OR o.student_id IN (SELECT id FROM students WHERE class_id = ?)
     ORDER BY o.created_at DESC'
);
$s->execute([$id, $id]);
$reglages = array_map('eleveLisible', $s->fetchAll());

$s = db()->prepare(
    'SELECT m.*, st.first_name,
            (SELECT COUNT(*) FROM message_reads r WHERE r.message_id = m.id) AS lus
     FROM messages m
     LEFT JOIN students st ON st.id = m.student_id
     WHERE m.class_id = ? OR m.student_id IN (SELECT id FROM students WHERE class_id = ?)
     ORDER BY m.created_at DESC LIMIT 12'
);
$s->execute([$id, $id]);
$messages = array_map(function ($m) {
    $m['first_name'] = dechiffrer($m['first_name']);
    $m['body'] = dechiffrer($m['body']);
    return $m;
}, $s->fetchAll());

enTete($classe['name'], $prof, 'classes');
?>
<h1><?= h($classe['name']) ?> <span class="code" style="margin-left:10px"><?= h($classe['join_code']) ?></span></h1>
<p class="gris-clair">Les élèves ouvrent le site et entrent par l'une des deux
portes : leur <b>identifiant et code</b> — c'est la liste que vous fournissez —
ou bien ce <b>code de classe</b> et leur prénom.
<a href="eleves.php?id=<?= h($id) ?>">Gérer la liste et imprimer les billets →</a></p>

<div class="carte">
    <h2>Le verrou</h2>
    <p class="gris-clair" style="margin-top:0">Verrouillée, la classe ne voit plus le
    catalogue ni le mode libre : seulement les parcours que vous lui donnez.</p>
    <form method="post" style="display:inline">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="action" value="verrou">
        <input type="hidden" name="verrou" value="<?= $classe['locked'] ? 'off' : 'on' ?>">
        <button class="<?= $classe['locked'] ? 'gris' : '' ?>">
            <?= $classe['locked'] ? '🔓 Déverrouiller la classe' : '🔒 Verrouiller la classe' ?></button>
    </form>
    <form method="post" style="margin-top:14px">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="action" value="consigne">
        <label>Consigne affichée en haut de l'écran de tous les élèves</label>
        <div class="rangee">
            <input type="text" name="notice" value="<?= h($classe['notice'] ?? '') ?>"
                   placeholder="Aujourd'hui : les fractions. Commencez par l'exercice 1.">
            <button class="gris">Afficher</button>
        </div>
    </form>
</div>

<div class="carte">
    <h2>Les élèves <span class="gris-clair">(<?= count($eleves) ?>)</span></h2>
    <?php if (!$eleves): ?>
        <p class="gris-clair">Personne ne s'est encore rattaché. Dictez le code
        <b><?= h($classe['join_code']) ?></b>.</p>
    <?php else: ?>
    <table>
        <tr><th>Prénom</th><th>Vu</th><th>En ce moment</th><th>Réussite</th><th></th></tr>
        <?php foreach ($eleves as $e): $a = $activites[$e['id']]; ?>
        <tr<?= $e['blocked'] ? ' style="opacity:.5"' : '' ?>>
            <td><span class="pastille <?= estEnLigne($e['last_seen_at']) ? 'on' : '' ?>"></span>
                <b><?= h($e['first_name']) ?></b><?= $e['blocked'] ? ' <span class="gris-clair">(mis de côté)</span>' : '' ?></td>
            <td class="gris-clair"><?= h(depuis($e['last_seen_at'])) ?></td>
            <td><?php if ($a['exo']): ?>
                    <button type="button" class="lien-exo" data-exo="<?= h($a['exo']) ?>"
                            title="Cliquez pour le recopier dans « Un exercice bloque »"><?= h($a['exo']) ?></button>
                    <?php if ($a['parcours']): ?>
                        <div class="gris-clair"><?= h($a['parcours']) ?></div>
                    <?php endif; ?>
                <?php else: ?><span class="gris-clair">—</span><?php endif; ?></td>
            <td><?= $a['total'] ? "{$a['justes']} / {$a['total']}" : '<span class="gris-clair">—</span>' ?></td>
            <td style="text-align:right; white-space:nowrap">
                <form method="post" style="display:inline">
                    <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
                    <input type="hidden" name="action" value="eleve-bloquer">
                    <input type="hidden" name="eleve" value="<?= h($e['id']) ?>">
                    <input type="hidden" name="bloque" value="<?= $e['blocked'] ? 'off' : 'on' ?>">
                    <button class="gris petit"><?= $e['blocked'] ? 'Réactiver' : 'Mettre de côté' ?></button>
                </form>
                <form method="post" style="display:inline"
                      onsubmit="return confirm('Effacer <?= h($e['first_name']) ?> et tout son travail ?')">
                    <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
                    <input type="hidden" name="action" value="eleve-effacer">
                    <input type="hidden" name="eleve" value="<?= h($e['id']) ?>">
                    <button class="rouge petit">Effacer</button>
                </form>
            </td>
        </tr>
        <?php endforeach; ?>
    </table>
    <?php endif; ?>
</div>

<div class="carte">
    <h2>Envoyer un mot</h2>
    <form method="post">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="action" value="message">
        <div class="rangee">
            <div><label>À qui</label>
                <select name="pour">
                    <option value="classe">Toute la classe</option>
                    <?php foreach ($eleves as $e): ?>
                        <option value="<?= h($e['id']) ?>"><?= h($e['first_name']) ?></option>
                    <?php endforeach; ?>
                </select></div>
            <div style="flex:3"><label>Message</label>
                <input type="text" name="corps" maxlength="500"
                       placeholder="Reprends l'exercice 3, tu confonds dizaines et dixièmes."></div>
            <button>Envoyer</button>
        </div>
    </form>
    <?php if ($messages): ?>
    <table style="margin-top:14px">
        <tr><th>À</th><th>Message</th><th>Lu</th></tr>
        <?php foreach ($messages as $m): ?>
        <tr><td><?= $m['first_name'] ? h($m['first_name']) : '<i>toute la classe</i>' ?></td>
            <td><?= h($m['body']) ?></td>
            <td class="gris-clair"><?php
                // « ✓ » pour un mot adressé à quelqu'un, « 12 / 24 » pour un mot
                // à la classe : le professeur veut savoir s'il peut passer à la
                // suite ou s'il doit le redire à voix haute.
                if ($m['first_name']) {
                    echo $m['lus'] ? '✓ lu' : 'pas encore lu';
                } else {
                    echo (int) $m['lus'] . ' / ' . count($eleves);
                }
            ?></td></tr>
        <?php endforeach; ?>
    </table>
    <?php endif; ?>
</div>

<div class="carte">
    <h2>Un exercice bloque</h2>
    <p class="gris-clair" style="margin-top:0">Deux gestes.
    <b>Autoriser le saut</b> fait apparaître un bouton « passer cet exercice » chez
    l'élève : il continue son parcours. <b>Retirer</b> le fait disparaître, comme
    s'il n'avait jamais été dans le parcours.</p>
    <form method="post">
        <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
        <input type="hidden" name="action" value="exercice">
        <div class="rangee">
            <div><label>Identifiant de l'exercice</label>
                <input type="text" name="exercice" id="champ-exo" list="exos-vus"
                       placeholder="num-rang" required autocomplete="off">
                <datalist id="exos-vus">
                    <?php foreach (array_keys($exercicesVus) as $x): ?>
                        <option value="<?= h($x) ?>"></option>
                    <?php endforeach; ?>
                </datalist></div>
            <div><label>Pour qui</label>
                <select name="pour">
                    <option value="classe">Toute la classe</option>
                    <?php foreach ($eleves as $e): ?>
                        <option value="<?= h($e['id']) ?>"><?= h($e['first_name']) ?></option>
                    <?php endforeach; ?>
                </select></div>
            <div><label>Quoi</label>
                <select name="mode">
                    <option value="saut">Autoriser le saut</option>
                    <option value="retire">Retirer du parcours</option>
                </select></div>
            <button>Appliquer</button>
        </div>
    </form>
    <?php if ($reglages): ?>
    <table style="margin-top:14px">
        <tr><th>Exercice</th><th>Pour</th><th>Quoi</th><th></th></tr>
        <?php foreach ($reglages as $o): ?>
        <tr><td><code><?= h($o['exercise_id']) ?></code></td>
            <td><?= $o['first_name'] ? h($o['first_name']) : '<i>toute la classe</i>' ?></td>
            <td><?= $o['mode'] === 'retire' ? 'retiré du parcours' : 'saut autorisé' ?></td>
            <td style="text-align:right">
                <form method="post" style="display:inline">
                    <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
                    <input type="hidden" name="action" value="exercice-annuler">
                    <input type="hidden" name="over" value="<?= h($o['id']) ?>">
                    <button class="gris petit">Annuler</button></form></td></tr>
        <?php endforeach; ?>
    </table>
    <?php endif; ?>
</div>

<div class="carte danger">
    <h2>Effacer</h2>
    <p class="gris-clair" style="margin-top:0">Écrivez <b>EFFACER</b> dans la case pour
    confirmer. Ces deux gestes sont immédiats et définitifs.</p>
    <div class="rangee">
        <form method="post" class="rangee" style="flex:1"
              onsubmit="return confirm('Effacer TOUS les élèves de cette classe ?')">
            <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
            <input type="hidden" name="action" value="vider">
            <input type="text" name="confirmation" placeholder="EFFACER">
            <button class="rouge">Effacer les élèves, garder la classe</button>
        </form>
    </div>
    <div class="rangee" style="margin-top:10px">
        <form method="post" class="rangee" style="flex:1"
              onsubmit="return confirm('Supprimer la classe entière ?')">
            <input type="hidden" name="jeton" value="<?= h(jeton()) ?>">
            <input type="hidden" name="action" value="supprimer-classe">
            <input type="text" name="confirmation" placeholder="EFFACER">
            <button class="rouge">Supprimer la classe et tout son contenu</button>
        </form>
    </div>
</div>

<script>
// UN CLIC SUR L'EXERCICE QU'UN ÉLÈVE EST EN TRAIN DE FAIRE le recopie dans le
// champ de déblocage. C'est le geste exact de la séance : « Léa est bloquée sur
// celui-là » → on clique sur ce qu'on lit dans son rang, on choisit, on
// applique. Sans cela il fallait relire un identifiant à l'écran et le retaper
// sans faute, au milieu d'une classe.
document.querySelectorAll('.lien-exo').forEach(b => {
    b.onclick = () => {
        const champ = document.getElementById('champ-exo');
        if (!champ) return;
        champ.value = b.dataset.exo;
        champ.focus();
        champ.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
});

// LA PAGE SE RAFRAÎCHIT, MAIS JAMAIS SOUS LES DOIGTS. Vingt secondes, et l'on
// s'abstient dès qu'un champ est en cours de saisie : recharger pendant qu'on
// écrit un message effacerait le message.
setInterval(() => {
    const a = document.activeElement;
    if (a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName)) return;
    if (document.hidden) return;
    location.reload();
}, 20000);
</script>
<?php piedDePage();
