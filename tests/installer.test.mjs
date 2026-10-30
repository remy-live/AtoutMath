// METTRE ATOUTMATH SUR L'ÉCRAN D'ACCUEIL.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, pour les tablettes hors ligne de sa sœur institutrice : « Et on peut
// pas faire qqch qui s installe tout seul sur la tablette ». Puis, la question
// posée : « Oui ».
//
// Rien ne s'installe tout seul — le système l'interdit. Mais TOUT ÉTAIT DÉJÀ
// EN PLACE sauf le bouton : manifeste complet, icônes sur le disque, service
// worker qui garde 257 fichiers. On ne le PROPOSAIT nulle part.
//
// MESURÉ (`tools/tmp/sonde-installer.mjs`), l'offre du navigateur fabriquée
// avec la forme exacte qu'il lui donne :
//
//   au chargement        la capture est en place, rien à proposer, pas de bouton
//   l'offre arrive       le bouton paraît, « Installer sur cet appareil »
//   au clic              `prompt()` appelé une fois, l'offre jetée, bouton parti
//   au doigt (390 px)    44 px de haut, 209 de large, ne déborde pas
//   la notice d'Apple    ses deux pas, à l'étage 999 999, au premier plan
//   erreurs de page 0    fenêtres natives 0
//
// ── LES QUATRE DÉFAUTS POSSIBLES SONT TOUS SILENCIEUX ──────────────────────
//
// Aucun ne jette. Chacun donne une application qui a l'air d'aller bien et un
// bouton qui ne paraît jamais — c'est-à-dire la conclusion « cet appareil ne
// sait pas installer », qui serait fausse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { poserUnDocumentDeSecours } from '../tools/fauxPdf.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

poserUnDocumentDeSecours();
const { estAppleTactile, estDejaInstallee } = await import('../js/ui/installer.js');

test('UN iPAD SE DÉCLARE « MACINTOSH », ET C\'EST LE PIÈGE', () => {
    // Depuis iPadOS 13, la chaîne d'identification d'un iPad ne dit plus
    // « iPad ». Ce qui le trahit est le nombre de points de contact : un Mac
    // en annonce 0, un iPad 5. Sans cette ligne, TOUS les iPad du monde
    // reçoivent la notice d'un ordinateur de bureau — c'est-à-dire aucune
    // notice, sur les seules tablettes dont il est question.
    const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
    assert.equal(estAppleTactile(MAC, 5), true, 'un iPad d\'aujourd\'hui est pris pour un Mac');
    assert.equal(estAppleTactile(MAC, 0), false, 'un vrai Mac reçoit la notice d\'un iPad');

    // Les formes anciennes, qui se disent encore ce qu'elles sont.
    assert.equal(estAppleTactile('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5), true);
    assert.equal(estAppleTactile('Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X)', 5), true);
    // Et ce qui n'est pas d'Apple ne l'est pas.
    assert.equal(estAppleTactile('Mozilla/5.0 (Linux; Android 13; Pixel 7)', 5), false);
    assert.equal(estAppleTactile('', 0), false);
    assert.equal(estAppleTactile(undefined, undefined), false);
});

test('DÉJÀ INSTALLÉE SE RECONNAÎT DE DEUX FAÇONS, ET IL FAUT LES DEUX', () => {
    // `display-mode: standalone` est la réponse de tout le monde ;
    // `navigator.standalone` est celle d'Apple, qui n'a jamais implémenté la
    // première pour les applications posées sur l'écran d'accueil. N'en
    // garder qu'une, c'est remontrer le bouton « Installer » tous les jours à
    // la moitié des tablettes — celles qui l'ont justement écouté.
    const avecMedia = (correspond) => ({
        matchMedia: (q) => ({ matches: q.includes('standalone') && correspond }),
        navigator: {}
    });
    assert.equal(estDejaInstallee(avecMedia(true)), true);
    assert.equal(estDejaInstallee(avecMedia(false)), false);
    // La forme d'Apple, SANS `display-mode` qui réponde.
    assert.equal(estDejaInstallee({
        matchMedia: () => ({ matches: false }), navigator: { standalone: true }
    }), true, 'une application posée sur un écran d\'accueil d\'Apple n\'est pas reconnue');
    // Et rien ne jette là où `matchMedia` n'existe pas.
    assert.equal(estDejaInstallee({ navigator: {} }), false);
    assert.equal(estDejaInstallee(null), false);
});

test('L\'OFFRE S\'ATTRAPE DANS LA PAGE, PAS DANS UN MODULE', () => {
    // `beforeinstallprompt` NE SE REDEMANDE PAS : il passe une fois, tôt, et
    // qui ne l'écoutait pas ce jour-là ne l'aura plus. Les modules de
    // l'application se chargent en différé — poser l'écouteur là-dedans,
    // c'est l'avoir posé trop tard un jour sur deux, sans que rien ne le dise.
    const HTML = lire('index.html');
    assert.match(HTML, /addEventListener\('beforeinstallprompt'/,
        'la page n\'attrape plus l\'offre : le bouton manquera sans qu\'on sache pourquoi');
    assert.match(HTML, /window\.__installAtoutMath = e;/);
    // Et la bannière du navigateur est retirée : depuis qu'on a un bouton à
    // nous, deux offres pour la même chose se contredisent.
    assert.match(HTML, /beforeinstallprompt'[\s\S]{0,120}?e\.preventDefault\(\)/);
    // Le module, lui, ne fait que RELIRE ce que la page a rangé.
    const M = lire('js/ui/installer.js');
    assert.ok(!/addEventListener\('beforeinstallprompt'[\s\S]{0,200}?__installAtoutMath = /.test(M),
        'le module attrape l\'offre lui-même : il arrivera après elle');
});

test('LE BOUTON SE REPOSE QUAND L\'OFFRE ARRIVE — sinon il ne paraît jamais', () => {
    // LE DÉFAUT LE PLUS FACILE À NE PAS VOIR. Le navigateur n'offre pas
    // l'installation au chargement : il attend d'avoir vu l'élève se servir
    // de l'application, quelques secondes, parfois une seconde visite. La
    // fenêtre du code, elle, est montée UNE FOIS au démarrage — un bouton
    // posé seulement là demanderait toujours trop tôt.
    //
    // On essaie, il n'y a pas de bouton, et l'on conclut que l'appareil ne
    // sait pas installer. C'est faux, et rien ne le dit.
    const M = lire('js/ui/installer.js');
    assert.match(M, /export function poserDesQuePossible/);
    assert.match(M, /window\.addEventListener\('beforeinstallprompt', \(\) => setTimeout\(poser, 0\)\)/,
        'le bouton ne se repose plus quand l\'offre arrive');
    const U = lire('js/ui/studentCodeUI.js');
    assert.match(U, /m\.poserDesQuePossible\(btnInstall\)/,
        'la fenêtre du code pose son bouton UNE fois, donc trop tôt, donc jamais');
    // L'état vide du parcours, lui, est redessiné à chaque passage : il pose
    // simplement, et n'a aucun écouteur à accumuler.
    const P = lire('js/ui/pathView.js');
    assert.match(P, /m\.poserLeBoutonDInstallation\(box\)/);
});
