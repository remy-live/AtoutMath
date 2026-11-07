<?php
declare(strict_types=1);

/**
 * SECTION « À PROPOS » — qui a fait ce logiciel.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, le 14 octobre, à propos des mille versions : « nous avions faire plus de
 * 1000 versions puisque nous sommes à plus de v1000 alors ca méritait un
 * cadeau », puis, devant les deux idées proposées : « C est pas mal sinon des
 * crédits en plus ».
 *
 * IL N'Y AVAIT AUCUNE PAGE DE CRÉDITS, et c'était un vrai manque : mille
 * versions, deux cent vingt-cinq exercices, et nulle part le nom de celui qui a
 * décidé de chacun d'eux. Un logiciel scolaire dit qui l'a fait — c'est vrai
 * pour un manuel, ça l'est pour celui-ci.
 *
 * ── DANS L'ADMINISTRATION, ET PAS DANS L'APPLICATION ───────────────────────
 *
 * Interrogé sur qui devait la voir, Rémy a répondu « je ne sais pas ». On prend
 * donc le choix prudent, celui qu'on peut défaire : cette page est derrière le
 * mot de passe du professeur. **On peut toujours l'ouvrir aux élèves ensuite ;
 * l'inverse serait plus gênant**, parce qu'un nom publié a déjà été lu.
 */

$prof = profConnecte();

/**
 * LE NOM DE RÉMY, À UN SEUL ENDROIT.
 *
 * Il a choisi « mon nom complet — je vous le donne » et ne me l'a pas encore
 * donné. ON NE LE DEVINE PAS : son adresse électronique le laisse peut-être
 * entrevoir, mais tirer un nom de famille d'une adresse pour le publier sur une
 * page n'est pas à moi de le faire. Le prénom tient la place jusqu'à ce qu'il
 * dise lequel il veut — et il n'y a qu'une ligne à changer, celle-ci.
 */
const APROPOS_AUTEUR = 'Rémy';

/** La version réellement installée, lue là où elle est écrite. */
function versionInstallee(): string
{
    $index = dirname(dirname(__DIR__)) . '/index.html';
    if (!is_file($index)) return '';
    $debut = (string) file_get_contents($index, false, null, 0, 8192);
    return preg_match('/\?v=(\d+)/', $debut, $m) ? $m[1] : '';
}

$v = versionInstallee();

sectionDebut('apropos', 'À propos d\'AtoutMath',
    'qui l\'a fait, et avec quoi', $v !== '' ? 'version ' . h($v) : '', 'neutre');
?>
<div class="carte">
    <p style="margin:0 0 10px"><b>AtoutMath</b> est un logiciel de mathématiques
       écrit <b>pour et avec <?= h(APROPOS_AUTEUR) ?></b>, professeur de
       mathématiques au collège.</p>

    <!-- CE N'EST PAS UNE FORMULE DE POLITESSE, et c'est pour cela qu'elle est
         ici : chaque exercice de ce catalogue existe parce qu'il l'a demandé,
         et chaque décision non évidente porte sa phrase dans le code, à
         l'endroit où elle se prenait. Le dépôt en compte près de mille huit
         cents. `node tools/milleVersions.mjs` les rassemble. -->
    <p style="margin:0 0 10px">Les exercices, les jeux, la façon de conduire une
       séance, jusqu'à la taille des boutons : <b>tout vient de ses classes</b>.
       Près de <b>mille huit cents</b> de ses phrases sont recopiées dans le
       code, à l'endroit exact de ce qu'elles ont changé — c'est la règle qu'on
       s'est donnée au premier jour, et elle n'a pas bougé.</p>

    <p style="margin:0 0 10px">Le code a été écrit par <b>Claude</b>, l'assistant
       d'Anthropic, sous sa conduite.</p>

    <p class="gris-clair" style="margin:14px 0 0">
        <b>Une ligne rouge, posée par lui et jamais franchie :</b><br>
        « Je ne veux pas de construction géométrique avec des outils virtuels.
        Rien ne remplace le geste. »<br>
        Un élève ne trace pas à la souris ce qu'il doit tracer à la règle et au
        compas.
    </p>
</div>

<div class="carte">
    <p style="margin:0 0 8px"><b>Ce que ce logiciel est devenu</b></p>
    <ul style="margin:0; padding-left:1.2em; line-height:1.9">
        <li><b><?= $v !== '' ? h($v) : '—' ?></b> versions publiées</li>
        <li><b>225</b> exercices au catalogue, et <b>125</b> façons différentes
            de poser une question</li>
        <li><b>420</b> fichiers d'épreuves automatiques, qui se relancent avant
            chaque livraison</li>
    </ul>
    <p class="gris-clair" style="margin:12px 0 0">
        Les deux derniers chiffres sont ceux du jour où cette page a été écrite
        (la v1002). Ils ne se mettent pas à jour tout seuls : le catalogue est en
        JavaScript, et cette page est servie par PHP — les faire compter ici
        demanderait de tenir deux vérités d'accord, ce qui finit toujours par
        produire un chiffre faux. Mieux vaut une date qu'une illusion.
    </p>
</div>

<div class="carte">
    <p style="margin:0 0 8px"><b>Ce sur quoi il repose</b></p>
    <p class="gris-clair" style="margin:0">
        Aucune dépendance extérieure côté élève : du JavaScript à modules natifs,
        sans étape de construction. Côté serveur, PHP et SQLite. C'est délibéré —
        un logiciel de classe doit pouvoir tourner sur l'hébergement le plus
        simple, et survivre à l'abandon de n'importe quelle bibliothèque à la
        mode.
    </p>
</div>
<?php
sectionFin();
