// REPRENDRE, OU RECOMMENCER À ZÉRO — et le QR code en un seul geste.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après l'essai sur tablette, trois phrases :
//
//   « si c'est hors ligne, il faut que la caméra se lance directement »
//   « il faut sur l'écran d'ailleurs un bouton pour scanner directement le qr
//     code, car là il faut passer par le code puis le qr code c'est trop long »
//   « Quand on rescanne à nouveau, si le parcours est identique au précédente,
//     l'élève choisit ou non de redémarrer à zéro »
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Quatre règles, et aucune ne se voit en relisant le code :
//
//   · une remise à zéro est une BORNE DE TEMPS, pas un effacement — le
//     professeur doit continuer de voir le premier passage ;
//   · elle ne touche QUE le parcours qu'elle nomme ;
//   · le décompte annoncé à l'élève est celui que l'en-tête affichera trois
//     secondes plus tard — pas un autre ;
//   · un QR code étranger ne referme pas le scanner.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { lireFeuille, corpsDeLaRegle, declare } from './aidesCss.mjs';
import { computeAssignedPath } from '../js/core/projections.js';
import { etapesDeTravail } from '../js/core/recompenses.js';
import { Shortcodes } from '../js/core/shortcodes.js';
import { makePath, makeStep } from '../js/core/path.js';
import { phraseDeLaReprise } from '../js/ui/repriseDuParcours.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const ev = (type, payload, ts) => ({ id: `e${ts}`, type, ts, payload });
const PAS = [{ stepId: 's0' }, { stepId: 's1' }, { stepId: 's2' }];
const assigne = (ts = 1000) => ev('path_assigned',
    { pathId: 'P', name: 'Relatifs', steps: PAS }, ts);
const fait = (stepId, ts, extra = {}) => ev('step_completed',
    { pathId: 'P', stepId, solved: 7, questions: 8, passed: true, ...extra }, ts);

test('SANS REMISE À ZÉRO, RESCANNER REPREND — c\'est le défaut, et il est bon', () => {
    // MESURÉ AVANT D'ÉCRIRE LA CORRECTION : rescanner le même QR garde les
    // étapes validées. Perdre le travail de l'élève parce qu'il a visé deux
    // fois le tableau serait indéfendable ; ce qui manquait, c'était le CHOIX.
    const p = computeAssignedPath([assigne(1000), fait('s0', 2000), fait('s1', 3000),
        assigne(4000)]);
    assert.deepEqual(p.completed.sort(), ['s0', 's1']);
    assert.equal(Object.keys(p.resultats).length, 2);
});

test('UNE REMISE À ZÉRO EST UNE BORNE DE TEMPS, PAS UN EFFACEMENT', () => {
    const evenements = [assigne(1000), fait('s0', 2000), fait('s1', 3000),
        ev('path_reset', { pathId: 'P' }, 4000), assigne(4100)];
    const p = computeAssignedPath(evenements);
    assert.deepEqual(p.completed, [], 'les étapes d\'avant comptent encore');
    // ET LES RÉSULTATS AUSSI : les laisser rouvrirait les jeux de récompense
    // que le premier passage avait gagnés, et l'élève repartirait d'un
    // parcours déjà à moitié fêté.
    assert.deepEqual(Object.keys(p.resultats), []);
    // LE JOURNAL, LUI, N'A RIEN PERDU. C'est toute la différence avec la remise
    // à zéro du professeur (`core/oublis.js`), qui retire des événements : le
    // premier passage reste dans son bilan, et il voit que l'élève a REFAIT.
    assert.equal(evenements.filter(e => e.type === 'step_completed').length, 2);
});

test('CE QUI SUIT LA BORNE COMPTE, ET TOUT DE SUITE', () => {
    const p = computeAssignedPath([assigne(1000), fait('s0', 2000),
        ev('path_reset', { pathId: 'P' }, 3000), fait('s0', 4000), fait('s1', 5000)]);
    assert.deepEqual(p.completed.sort(), ['s0', 's1']);
});

test('UNE REMISE À ZÉRO NE TOUCHE QUE LE PARCOURS QU\'ELLE NOMME', () => {
    // L'ÉLÈVE QUI RECOMMENCE SA SÉANCE DE LUNDI ne doit pas perdre celle de
    // mardi. `pathId` est l'empreinte du CONTENU : deux séances différentes ne
    // partagent jamais le même, et la borne doit s'arrêter à la sienne.
    const p = computeAssignedPath([assigne(1000), fait('s0', 2000),
        ev('path_reset', { pathId: 'AUTRE' }, 3000)]);
    assert.deepEqual(p.completed, ['s0']);
});

test('DEUX REMISES À ZÉRO NE SE CONTREDISENT PAS : LA DERNIÈRE ENGLOBE', () => {
    const p = computeAssignedPath([assigne(1000),
        ev('path_reset', { pathId: 'P' }, 2000), fait('s0', 3000),
        ev('path_reset', { pathId: 'P' }, 4000), fait('s1', 5000)]);
    assert.deepEqual(p.completed, ['s1']);
});

test('LE DÉCOMPTE ANNONCÉ EST CELUI QUE L\'EN-TÊTE AFFICHERA', () => {
    // LA MÊME RÈGLE QUE LA BARRE DE PROGRESSION (`etapesDeTravail`) : un jeu de
    // récompense n'est pas du travail, une facultative non faite non plus.
    // Annoncer « 1 sur 4 » puis afficher « 1 / 2 étapes » ferait douter de
    // l'un des deux, et c'est le logiciel qu'on croirait cassé.
    const steps = [
        { stepId: 's0' },
        { stepId: 's1', bonus: true },
        { stepId: 's2', facultatif: true },
        { stepId: 's3' }
    ];
    assert.equal(etapesDeTravail(steps, ['s0']).length, 2);
    // Faite, la facultative COMPTE : c'est du travail que l'élève a fourni, et
    // l'effacer du total lui volerait son travail.
    assert.equal(etapesDeTravail(steps, ['s0', 's2']).length, 3);
    const dit = phraseDeLaReprise({ nom: 'Relatifs', steps, faites: ['s0'] });
    assert.equal(dit.total, 2);
    assert.match(dit.phrase, /1 étape sur 2/);
});

test('LA PHRASE SE LIT À ONZE ANS, AU SINGULIER COMME AU PLURIEL', () => {
    const un = phraseDeLaReprise({ nom: 'Relatifs', steps: PAS, faites: ['s0'] });
    assert.match(un.phrase, /déjà fait 1 étape sur 3/);
    assert.ok(!/1 étapes/.test(un.phrase), 'le singulier n\'est pas accordé');
    const deux = phraseDeLaReprise({ nom: 'Relatifs', steps: PAS, faites: ['s0', 's1'] });
    assert.match(deux.phrase, /déjà fait 2 étapes sur 3/);
    // TOUT EST FAIT : « 3 étapes sur 3 » se lit comme un reste à faire.
    const fini = phraseDeLaReprise({ nom: 'Relatifs', steps: PAS, faites: ['s0', 's1', 's2'] });
    assert.match(fini.phrase, /déjà terminé/);
    // SANS NOM DE SÉANCE, on ne laisse pas de guillemets vides au milieu.
    const sansNom = phraseDeLaReprise({ steps: PAS, faites: ['s0'] });
    assert.match(sansNom.phrase, /ce parcours/);
    assert.ok(!/«\s*»/.test(sansNom.phrase));
});

test('UN QR CODE ÉTRANGER NE REFERME PAS LE SCANNER', () => {
    // MESURÉ, sonde hors ligne devant un QR qui n'est pas le nôtre : on
    // refermait la fenêtre en annonçant « Ce code ne correspond à aucun
    // parcours. Vérifie-le avec ton professeur. » — c'est-à-dire qu'on envoyait
    // l'élève douter d'un code qu'il n'a jamais tapé. Un élève qui balaie le
    // tableau attrape parfois l'affiche d'à côté ; il faut CONTINUER de
    // chercher.
    assert.equal(Shortcodes.codeDeSeanceLu('https://exemple.fr/une-affiche'), '');
    assert.equal(Shortcodes.codeDeSeanceLu('Rentrée 2026 — réunion lundi'), '');
    assert.equal(Shortcodes.codeDeSeanceLu(''), '');
    // ET LE NÔTRE PASSE, dans ses deux formes : le code nu qu'on dicte, et
    // l'adresse que le professeur projette.
    const code = Shortcodes.encodePath(makePath('Essai',
        [makeStep('calc-add'), makeStep('calc-sub')]));
    assert.equal(Shortcodes.codeDeSeanceLu(code), code);
    assert.equal(Shortcodes.codeDeSeanceLu(`https://atout-math.fr/?code=${code}`), code);
});

test('LE BOUTON DU SCANNER NE PARAÎT QUE S\'IL PEUT SERVIR', () => {
    // Hors contexte sécurisé ou sans caméra, `getUserMedia` n'existe pas : un
    // bouton qui ouvre une fenêtre pour y annoncer « impossible » est un bouton
    // qu'il ne fallait pas montrer. Les deux écrans tiennent la même règle.
    const P = sansCommentaires(lire('js/ui/portailUI.js'));
    assert.match(P, /id="portail-scanner"[^>]*hidden/,
        'le bouton de la porte doit être caché tant qu\'on ne sait pas scanner');
    assert.match(P, /btnScan && laCameraEstPossible\(\)/);
    const V = sansCommentaires(lire('js/ui/pathView.js'));
    assert.match(V, /if \(!laCameraEstPossible\(\)\) return null;/,
        'le bouton sous le parcours doit disparaître, pas s\'excuser');
});

test('HORS LIGNE, LA CAMÉRA S\'OUVRE SEULE — ET UNE SEULE FOIS', () => {
    // L'ÉLÈVE QUI REFERME LA FENÊTRE A DIT NON. La rouvrir serait la seule
    // chose qu'on ne doit jamais faire à un refus — et la porte se REDESSINE
    // quand les réglages du serveur arrivent (`porteASuivre`), ce qui la
    // rouvrirait sans ce drapeau.
    const P = sansCommentaires(lire('js/ui/portailUI.js'));
    assert.match(P, /if \(!cameraDejaOuverte && scannerEstLeSeulChemin\(\)\) \{/,
        'la caméra ne doit s\'ouvrir seule que hors ligne');
    assert.match(P, /cameraDejaOuverte = true;\s*\n/);
    // AU NIVEAU DU MODULE, et non dans `dessiner()` : un drapeau local
    // repartirait à zéro à chaque redessin.
    assert.match(P, /^let cameraDejaOuverte = false;/m);
});

test('LA CONDITION « HORS LIGNE » N\'EST ÉCRITE QU\'UNE FOIS', () => {
    // DEUX ÉCRANS LA POSENT — la porte d'entrée, qui ouvre la caméra d'
    // elle-même, et la barre du bas, qui montre son icône. Écrite deux fois,
    // c'est une des deux qu'on oublierait de corriger.
    const S = sansCommentaires(lire('js/ui/scannerQr.js'));
    assert.match(S, /export function scannerEstLeSeulChemin\(\) \{/);
    assert.match(S, /return laCameraEstPossible\(\) && navigator\.onLine === false;/);
    // ET PERSONNE NE LA RÉÉCRIT À CÔTÉ.
    for (const f of ['js/ui/portailUI.js', 'js/app.js', 'js/ui/pathView.js']) {
        assert.ok(!/navigator\.onLine === false/.test(sansCommentaires(lire(f))),
            `${f} réécrit la condition au lieu d'appeler scannerEstLeSeulChemin`);
    }
});

test('L\'ICÔNE DU QR CODE EST DANS LA BARRE DU BAS, ET SEULEMENT HORS LIGNE', () => {
    // RÉMY : « en hors ligne, ce serait cool de rajouter l'icone qr code à côté
    // de code, parcours, profil ». La barre du bas est la seule qui suive
    // l'élève sur tous les écrans — le bouton posé sous le parcours, lui,
    // demande d'être SUR le parcours.
    const H = lire('index.html');
    assert.match(H, /<button class="bottom-nav-btn" id="mob-btn-scan" hidden>/,
        'le bouton doit être caché tant qu\'on ne sait pas si l\'on est hors ligne');
    // JUSTE APRÈS « CODE » : c'est le même geste par l'autre bout, et les deux
    // destinations — Parcours, Profil — gardent la place que la main a apprise.
    assert.ok(H.indexOf('id="mob-btn-code"') < H.indexOf('id="mob-btn-scan"'));
    assert.ok(H.indexOf('id="mob-btn-scan"') < H.indexOf('id="mob-btn-path"'));
    const A = sansCommentaires(lire('js/app.js'));
    assert.match(A, /btnScan\.hidden = !scannerEstLeSeulChemin\(\);/);
    // ET LA BARRE SE REMESURE QUAND LE RÉSEAU CHANGE : une tablette qui perd le
    // Wi-Fi au milieu de l'heure ne recharge pas la page.
    assert.match(A, /window\.addEventListener\('online', revoirLeScan\);/);
    assert.match(A, /window\.addEventListener\('offline', revoirLeScan\);/);
});

test('UN BOUTON « hidden » DE LA BARRE DU BAS DISPARAÎT VRAIMENT', () => {
    // LE PIÈGE DÉJÀ PAYÉ SUR `.game-icon-btn` : la règle du navigateur —
    // [hidden] { display: none } — pèse moins qu'une classe, et
    // `.bottom-nav-btn` impose `display: flex`.
    //
    // MESURÉ ICI : réseau revenu, `hidden` posé, le bouton occupait encore ses
    // 98 px dans la barre. Le code faisait ce qu'il annonçait, et l'écran
    // disait le contraire.
    const regle = corpsDeLaRegle(lireFeuille('css/ui.css'), '.bottom-nav-btn[hidden]');
    assert.ok(regle, 'aucune règle ne cache un .bottom-nav-btn[hidden]');
    assert.ok(declare(regle, 'display', 'none'),
        'la règle existe mais ne pose pas display: none');
});
