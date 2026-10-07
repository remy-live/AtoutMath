// LA POLITIQUE DE SÉCURITÉ NE DOIT PAS ÉTEINDRE LE LOGICIEL.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui : « pourquoi j'ai cela ». Les trois volets de
// l'Atelier — le jeu, l'aperçu papier, le robot — affichaient
// « atout-math.fr refused to connect ».
//
// C'ÉTAIT `frame-ancestors 'none'`. Il interdit TOUT encadrement, y compris par
// le site lui-même, et quatre fonctions s'encadrent elles-mêmes. Elles étaient
// donc muettes EN LIGNE depuis le premier jour de cette politique — alors que
// tout marchait en essai, parce que le serveur intégré de PHP n'applique pas
// `.htaccess`.
//
// ── CE QUE CETTE ÉPREUVE TIENT, ET CE QU'ELLE NE PEUT PAS TENIR ────────────
//
// Elle tient la RÈGLE en deux cents millisecondes : la politique écrite doit
// laisser le site s'encadrer lui-même, et le fichier livré doit dire la même
// chose que l'outil qui le fabrique. C'est ce qui attrape une régression au
// prochain `npm test`.
//
// Elle ne peut pas tenir le RÉSULTAT : qu'un navigateur charge vraiment les
// trois cadres sous cette politique ne se mesure qu'au navigateur, et c'est
// `tools/sousLaVraiePolitique.mjs` qui le fait — elle reproduit le message de
// Rémy quand on remet 'none', et passe au vert avec 'self'.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const RACINE = new URL('..', import.meta.url);
const HT = fs.readFileSync(new URL('.htaccess', RACINE), 'utf8');

/** La politique telle qu'elle partira chez Rémy. */
function politiqueLivree() {
    const m = HT.match(/Header always set Content-Security-Policy "([^"]+)"/);
    assert.ok(m, '.htaccess doit porter une politique de sécurité');
    return m[1];
}

const directive = (csp, nom) => {
    const m = csp.match(new RegExp(`(?:^|;)\\s*${nom} ([^;]+)`));
    return m ? m[1].trim() : null;
};

test('LE SITE A LE DROIT DE S\'ENCADRER LUI-MÊME', () => {
    // QUATRE FONCTIONS EN DÉPENDENT, et toutes sont des outils de professeur :
    // l'Atelier et ses trois cadres, le Contrôle qui mesure les débordements
    // sur trois écrans, l'atelier de géométrie. Avec 'none' elles n'affichent
    // RIEN, et le navigateur n'en dit rien à la page : seul un humain devant
    // l'écran peut s'en apercevoir. C'est ce qui s'est passé.
    const v = directive(politiqueLivree(), 'frame-ancestors');
    assert.equal(v, "'self'",
        `frame-ancestors vaut ${v} ;\n`
        + "  'none' interdit l'encadrement MÊME PAR LE SITE LUI-MÊME, et l'Atelier,\n"
        + "  le Contrôle et l'atelier de géométrie s'encadrent eux-mêmes.\n"
        + "  'self' refuse toujours les AUTRES origines — la protection contre la\n"
        + '  fausse page qui habille l\'espace professeur est intacte.');
});

test('les quatre fonctions qui s\'encadrent existent toujours', () => {
    // SI ELLES DISPARAISSENT, L'ÉPREUVE CI-DESSUS DÉFEND UNE RÈGLE SANS OBJET
    // et l'on pourrait resserrer la politique. On nomme donc ce qui la motive,
    // pour que la question se pose au bon moment plutôt que jamais.
    const encadre = [
        ['js/ui/atelier.js', /<iframe[^>]*id="atl-/],
        ['js/ui/controle.js', /createElement\('iframe'\)/],
        ['js/games/geometrie.js', /<iframe/]
    ];
    encadre.forEach(([f, motif]) => {
        const t = fs.readFileSync(new URL(f, RACINE), 'utf8');
        assert.match(t, motif, `${f} n'encadre plus rien : la politique peut être rediscutée`);
    });
});

test('LE FICHIER LIVRÉ DIT LA MÊME CHOSE QUE L\'OUTIL QUI LE FABRIQUE', () => {
    // `.htaccess` est écrit par `tools/csp.mjs`, et c'est `.htaccess` qui part
    // chez l'hébergeur. Les deux peuvent diverger d'une seule façon : corriger
    // le fichier à la main et oublier l'outil — la correction serait alors
    // emportée au prochain rituel de version, qui relance `csp.mjs --ecrire`.
    const attendu = execFileSync(process.execPath,
        [new URL('tools/csp.mjs', RACINE).pathname], { encoding: 'utf8' });
    const v = directive(politiqueLivree(), 'frame-ancestors');
    assert.ok(attendu.includes(`frame-ancestors ${v}`),
        'tools/csp.mjs et .htaccess ne disent pas la même chose sur frame-ancestors :\n'
        + '  relancer `node tools/csp.mjs --ecrire`');
});

test('les directives qui font vivre le logiciel sont toujours là', () => {
    // Trois valeurs apprises à leurs dépens, chacune pour un écran qui restait
    // blanc sans un mot. On les nomme ici pour qu'un resserrage les voie.
    const csp = politiqueLivree();
    assert.match(directive(csp, 'frame-src') || '', /'self'/,
        'frame-src : sans lui, les cadres de l\'Atelier n\'ont pas de source permise');
    assert.match(directive(csp, 'worker-src') || '', /blob:/,
        'worker-src blob: : le meneur de jeu tourne dans un worker fabriqué à la volée');
    assert.match(directive(csp, 'manifest-src') || '', /blob:/,
        'manifest-src blob: : une boîte à jeux porte un manifeste fabriqué au moment où elle s\'ouvre');
});
