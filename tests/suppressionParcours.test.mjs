// UN PARCOURS SUPPRIMÉ NE DOIT PAS REVENIR — par AUCUN des boutons.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture du tiroir à l'appui : « quand je supprime un exercice, il
// revient », puis « la j'avais supprimé conversion ».
//
// LE DÉFAUT ÉTAIT DÉJÀ CONNU, DÉJÀ MESURÉ, ET DÉJÀ CORRIGÉ — À UN SEUL DES DEUX
// ENDROITS. C'est ce qui rend cette épreuve nécessaire.
//
// `core/parcoursServeur.js` raconte l'histoire au-dessus de `jeterALaCorbeille` :
// « on supprimait un parcours, on rechargeait la page, IL REVENAIT.
// `removeTeacherPath` n'effaçait que la copie du navigateur ; le serveur gardait
// la sienne, et `ramenerLaBibliotheque()` la redescendait au démarrage suivant. »
// `tools/parcoursSupprime.mjs` le mesure dans un vrai navigateur.
//
// ET POURTANT RÉMY L'A REVU. Parce que la correction n'avait été posée que sur
// la suppression EN BLOC de la fenêtre « Gérer ». Le bouton corbeille de chaque
// ligne du tiroir — celui qu'on a sous la main quand on range sa bibliothèque,
// donc celui qu'on emploie — appelait encore `state.removeTeacherPath` tout
// seul.
//
// ET LA SONDE NE POUVAIT PAS LE VOIR : elle appelle `jeterALaCorbeille`
// directement, comme le dit son propre commentaire — « on passe par la porte que
// l'écran emprunte ». Elle mesurait donc que la PORTE fonctionne, jamais que les
// boutons la prennent. Une sonde qui appelle la fonction ne mesure pas le bouton.
//
// CE QU'ON GARDE ICI EST DONC UNE RÈGLE DE STRUCTURE, et elle se lit dans la
// source en quelques millisecondes : **aucun écran n'a le droit de supprimer un
// parcours tout seul.** Il y a un seul chemin, il jette au serveur d'abord, et
// c'est lui qu'on prend.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import './helpers.mjs';
import { sansCommentaires } from './helpers.mjs';

const racine = new URL('../', import.meta.url).pathname;

function fichiersDe(dossier) {
    const out = [];
    (function marcher(d) {
        for (const f of readdirSync(d)) {
            const p = join(d, f);
            if (statSync(p).isDirectory()) marcher(p);
            else if (f.endsWith('.js')) out.push(p);
        }
    })(join(racine, dossier));
    return out;
}

/** Le code d'un fichier, sans ses commentaires — qui CITENT le défaut. */
const codeDe = (p) => sansCommentaires(readFileSync(p, 'utf8'));

test('AUCUN ÉCRAN NE SUPPRIME UN PARCOURS TOUT SEUL', () => {
    // LE DÉFAUT EXACT QUE RÉMY A VU. `state.removeTeacherPath` n'efface que la
    // copie du navigateur ; appelé depuis un écran, il promet une suppression
    // qui ne tient pas la nuit.
    //
    // Les deux seuls endroits qui ont le droit de l'appeler sont dans le noyau :
    // `core/state.js` qui le définit, et `core/parcoursServeur.js` qui l'appelle
    // APRÈS que le serveur a accepté — c'est-à-dire au bon moment.
    const fautifs = [];
    for (const p of fichiersDe('js/ui')) {
        const code = codeDe(p);
        if (/\bremoveTeacherPath\s*\(/.test(code)) {
            fautifs.push(p.slice(racine.length));
        }
    }
    assert.deepEqual(fautifs, [],
        'ces écrans suppriment un parcours sans prévenir le serveur : il redescendra '
        + 'au prochain démarrage, et le bouton aura menti. Passer par '
        + '`jeterALaCorbeille` de core/parcoursServeur.js.');
});

test('TOUS LES BOUTONS DE SUPPRESSION PASSENT PAR LA CORBEILLE', () => {
    // L'autre moitié de la même règle, et celle qui aurait dit « il en manque
    // un » : on COMPTE les écrans qui savent jeter. S'il n'y en avait qu'un, on
    // saurait qu'un bouton quelque part fait autrement.
    const quiJettent = fichiersDe('js/ui')
        .filter(p => /\bjeterALaCorbeille\b/.test(codeDe(p)))
        .map(p => p.slice(racine.length))
        .sort();
    assert.ok(quiJettent.includes('js/ui/builder.js'),
        'le tiroir des parcours doit jeter à la corbeille : c\'est le bouton que '
        + 'Rémy emploie pour ranger sa bibliothèque');
    assert.ok(quiJettent.includes('js/ui/gererParcours.js'),
        'la fenêtre « Gérer » aussi : c\'est la suppression en bloc');
    assert.ok(quiJettent.length >= 2, `seulement ${quiJettent.length} écran(s) : ${quiJettent}`);
});

test('LA CORBEILLE JETTE AU SERVEUR AVANT D\'OUBLIER ICI', () => {
    // L'ORDRE EST LA CORRECTION, pas un détail d'écriture. Dans l'autre sens,
    // une panne de réseau laisserait un parcours effacé ici et vivant là-bas —
    // c'est-à-dire exactement le défaut qu'on corrige, mais en pire : il
    // reviendrait sans qu'on sache pourquoi.
    const code = codeDe(join(racine, 'js/core/parcoursServeur.js'));
    const fn = code.slice(code.indexOf('export async function jeterALaCorbeille'));
    const corps = fn.slice(0, fn.indexOf('\n}\n'));

    const iServeur = corps.indexOf('auServeur(');
    assert.ok(iServeur > 0, 'la corbeille doit parler au serveur');

    // ON NE REGARDE QUE CE QUI SUIT L'APPEL AU SERVEUR. Le premier
    // `removeTeacherPath` de la fonction est celui de la branche « pas de
    // serveur », qui précède légitimement — ma première version l'accusait, et
    // l'épreuve rougissait sur du code juste. Une épreuve qui se trompe de
    // ligne est plus coûteuse qu'une épreuve absente : on cherche le défaut
    // dans le code pendant qu'il est dans la mesure.
    const apresServeur = corps.slice(iServeur);
    assert.match(apresServeur, /removeTeacherPath/,
        'on oublie localement APRÈS que le serveur a accepté');

    // ET L'ON NE CONTINUE PAS SI LE SERVEUR REFUSE : sans ce garde-fou, une
    // erreur réseau effacerait quand même la copie locale.
    const avantOubli = apresServeur.slice(0, apresServeur.indexOf('removeTeacherPath'));
    assert.match(avantOubli, /if \(r\.erreur\) return r;/,
        'un refus du serveur doit arrêter la suppression locale');
});

test('SANS SERVEUR, LA SUPPRESSION LOCALE EST HONNÊTE', () => {
    // Un professeur qui n'est pas identifié travaille sur sa machine seule : sa
    // suppression EST définitive, et c'est juste. Ce qu'on garde, c'est que ce
    // cas soit TRAITÉ — et non qu'on parte quand même appeler un serveur qui
    // n'écoute pas, ce qui donnerait une erreur réseau pour une suppression
    // parfaitement normale.
    const code = codeDe(join(racine, 'js/core/parcoursServeur.js'));
    const fn = code.slice(code.indexOf('export async function jeterALaCorbeille'));
    const corps = fn.slice(0, fn.indexOf('\n}\n'));
    assert.match(corps, /if \(!enPosteDeProf\(\)\)/,
        'le cas « pas de serveur » doit être traité avant de poster');
});
