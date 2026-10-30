// L'ESSAI DE RÉMY, REFAIT AU NAVIGATEUR : hors ligne, sur une tablette.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/sondeTablette.mjs
//
// Quatre choses à voir, dans l'ordre où un élève les rencontre :
//
//   A. la porte d'entrée hors ligne ouvre-t-elle la caméra d'elle-même, et le
//      bouton « Scanner le QR code » est-il là ?
//   B. le QR du tableau ouvre-t-il le parcours, et en combien de temps ?
//   C. une fois le parcours chargé, par où entre-t-on la séance suivante ?
//   D. rescanner le MÊME parcours pose-t-il la question « reprendre ou
//      recommencer », et « à zéro » remet-il vraiment à zéro ?
//
// ── DEUX CAMÉRAS, ET C'EST UNE CORRECTION PAYÉE DEUX FOIS ──────────────────
//
// Premier jet : une seule caméra, celle qui montre le bon QR. Elle est lue en
// moins de trois cents millisecondes — donc le parcours était DÉJÀ ouvert
// quand la sonde regardait la porte, et la mesure annonçait « bouton ABSENT »
// devant un logiciel qui marchait. Second jet : un QR ÉTRANGER, qui referme le
// scanner lui aussi et écrase la phrase qu'on voulait lire. Il faut donc une
// caméra qui ne montre AUCUN QR — voir `tools/qrEnCamera.mjs`.
//
// RIEN D'AUTRE N'EST SIMULÉ. Le vrai bouton, la vraie demande de caméra, le
// vrai décodeur, le vrai `applyCode`, le vrai journal. Seules la caméra (un
// fichier) et l'étape terminée (le marqueur du meneur, pour ne pas jouer huit
// questions au doigt) sont posées de l'extérieur, et la sonde le dit.

import { ouvrirSonde } from './sonde.mjs';
import { cameraBlanche, cameraQr } from './qrEnCamera.mjs';
import { Shortcodes } from '../js/core/shortcodes.js';
import { makePath, makeStep } from '../js/core/path.js';
import { resolve } from 'node:path';

const DRAPEAUX = (f) => ['--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${resolve(f)}`];

// LE PARCOURS DU TABLEAU, fabriqué ici : la sonde doit pouvoir dire ce qu'elle
// attend. Trois exercices qui existent — un identifiant disparu du catalogue
// donnerait un parcours de deux étapes annoncé pour trois, et l'on chercherait
// le défaut dans le décompte.
const CODE = Shortcodes.encodePath(makePath('Le calcul du jour',
    [makeStep('calc-add'), makeStep('calc-sub'), makeStep('calc-mult-flash')]));
const BLANCHE = cameraBlanche('tools/tmp/camera-blanche.y4m');
const AVEC_QR = cameraQr(`https://atout-math.fr/?code=${CODE}`,
    'tools/tmp/camera-seance.y4m').sortie;
console.log('le QR du tableau :', CODE.slice(0, 40), '…');

// ── A. LA PORTE D'ENTRÉE, HORS LIGNE, DEVANT UN QR QUI N'EST PAS LE NÔTRE ───
{
    const s = await ouvrirSonde({ largeur: 390, hauteur: 844, horsLigne: true,
        args: DRAPEAUX(BLANCHE) });
    await s.doitExister('#portail', 'la porte d\'entrée');
    await s.doitExister('#portail-scanner', 'le bouton du scanner de la porte');
    await s.page.waitForTimeout(1200);
    const porte = await s.page.evaluate(() => {
        const b = document.getElementById('portail-scanner');
        const v = document.querySelector('#scan-video');
        return {
            enLigne: navigator.onLine,
            bouton: { cache: b.hidden, visible: b.offsetParent !== null,
                haut: Math.round(b.getBoundingClientRect().height),
                texte: b.textContent.trim() },
            cameraOuverteSeule: !!v,
            video: v ? `${v.videoWidth}x${v.videoHeight}` : null,
            mot: ((document.getElementById('portail-etat-code') || {}).textContent || '').trim(),
            ditDuScanner: ((document.getElementById('scan-mot') || {}).textContent || '').trim(),
            auMilieu: (() => {
                const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
                return e ? (e.id || e.className || e.tagName) : null;
            })()
        };
    });
    console.log('A la porte    :', JSON.stringify(porte, null, 1));
    await s.photo('.scan-wrap', 'tools/tmp/tablette-camera.png', 0);

    // ON REFERME LA FENÊTRE : la caméra doit s'éteindre, et elle ne doit pas se
    // rouvrir toute seule derrière.
    await s.page.evaluate(() => {
        const v = [...document.querySelectorAll('.modal-overlay')]
            .filter(m => m.querySelector('#scan-video')).pop();
        const b = v && v.querySelector('.modal-close-btn');
        if (b) b.click();
    });
    await s.page.waitForTimeout(900);
    const apres = await s.page.evaluate(() => ({
        cameraEncore: !!document.querySelector('#scan-video'),
        boutonEncoreLa: !!document.getElementById('portail-scanner'),
        mot: ((document.getElementById('portail-etat-code') || {}).textContent || '').trim()
    }));
    console.log('A refermée    :', JSON.stringify(apres));
    await s.photo('#portail', 'tools/tmp/tablette-porte.png', 0);
    console.log(`A erreurs : ${s.erreurs.length} | fenêtres natives : ${s.fenetresNatives.length}`);
    s.erreurs.slice(0, 4).forEach(e => console.log('  ⚠', e));
    await s.fermer();
}

// ── B, C, D. LE BON QR ──────────────────────────────────────────────────────
{
    const s = await ouvrirSonde({ largeur: 390, hauteur: 844, horsLigne: true,
        args: DRAPEAUX(AVEC_QR) });
    const depart = Date.now();
    let vu = null;
    for (let i = 0; i < 60; i++) {
        vu = await s.page.evaluate(() => ({
            porteEncore: !!document.getElementById('portail'),
            scannerEncore: !!document.querySelector('#scan-video'),
            couche: (() => { const g = document.getElementById('game-layer');
                return g ? getComputedStyle(g).display : 'pas de couche'; })(),
            titre: ((document.getElementById('game-title') || {}).textContent || '').trim()
        }));
        if (!vu.porteEncore && vu.couche === 'flex') break;
        await s.page.waitForTimeout(100);
    }
    console.log('B le parcours :', JSON.stringify(vu), '—', Date.now() - depart, 'ms');

    // UNE ÉTAPE FAITE, ET ON LE DIT : jouer huit questions au doigt coûterait
    // cinq minutes de sonde pour mesurer autre chose que ce qu'on veut voir. Le
    // marqueur employé est celui que le meneur emploie lui-même.
    const avant = await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const { journal } = await import('./js/core/journal.js');
        const p = state.studentPath;
        state.markStudentPathStepCompleted(p.steps[0].stepId,
            { solved: 7, questions: 8, passed: true });
        if (journal) await journal.flush();
        return { pathId: p.pathId, nom: p.name, etapes: p.steps.length,
            faites: (state.studentPath.completed || []).length };
    });
    console.log('C avant       :', JSON.stringify(avant));

    // LE JOURNAL S'ÉCRIT À RETARDEMENT (400 ms) : recharger tout de suite
    // perdrait l'étape qu'on vient de marquer, et la question n'aurait alors
    // aucune raison de se poser. Premier jet : c'est exactement ce qui est
    // arrivé.
    await s.page.waitForTimeout(1200);
    await s.page.reload();
    await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    await s.page.waitForTimeout(1000);

    const portes = await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const visible = (e) => !!e && e.offsetParent !== null;
        return {
            parcoursGarde: !!state.studentPath,
            faitesApresRechargement: (state.studentPath
                && (state.studentPath.completed || []).length) || 0,
            porteEncore: !!document.getElementById('portail'),
            // PAR OÙ L'ÉLÈVE ENTRE-T-IL LE CODE DE LA SÉANCE SUIVANTE ?
            // ON COMPTE TOUS LES CHEMINS, et non ceux qu'on a écrits : la
            // barre du bas porte « Code » depuis longtemps, et un sélecteur
            // trop étroit m'a fait croire qu'il n'y en avait aucun.
            versLaFenetreDuCode: [...document.querySelectorAll(
                '[data-ouvrir-code], #mob-btn-code, #top-btn-code')]
                .filter(visible).map(e => e.id || e.className),
            scannerEnUnGeste: [...document.querySelectorAll('.path-scanner-code')]
                .filter(visible).length,
            ecran: document.body.innerText.replace(/\s+/g, ' ').slice(0, 140)
        };
    });
    console.log('C les portes  :', JSON.stringify(portes, null, 1));

    await s.photo('.path-autre-code', 'tools/tmp/tablette-porte-parcours.png', 12);

    // E. UN SEUL GESTE, DEPUIS L'ÉCRAN OÙ L'ÉLÈVE ARRIVE.
    await s.doitExister('.path-scanner-code', 'le bouton du scanner sous le parcours');
    const t0 = Date.now();
    await s.page.click('.path-scanner-code');
    await s.page.waitForSelector('#scan-video', { timeout: 8000 });
    console.log('E un geste    : la caméra s\'ouvre en', Date.now() - t0, 'ms');
    await s.page.evaluate(() => {
        const v = [...document.querySelectorAll('.modal-overlay')]
            .filter(m => m.querySelector('#scan-video')).pop();
        const b = v && v.querySelector('.modal-close-btn');
        if (b) b.click();
    });
    await s.page.waitForTimeout(600);

    // ── F. LA BARRE DU BAS, HORS LIGNE ────────────────────────────────────
    //
    // RÉMY : « en hors ligne, ce serait cool de rajouter l'icone qr code à côté
    // de code, parcours, profil ». On regarde donc la barre DANS LES DEUX ÉTATS
    // du mode libre : celui de la copie d'essai (il est ouvert, six boutons —
    // le pire cas) et celui des élèves de Rémy (il est fermé, et la barre ne
    // porte que les trois qu'il nomme).
    const lireLaBarre = () => s.page.evaluate(() => {
        const vus = [...document.querySelectorAll('#bottom-nav .bottom-nav-btn')]
            .filter(b => b.offsetParent !== null);
        return {
            boutons: vus.map(b => (b.querySelector('span') || {}).textContent),
            largeurs: vus.map(b => Math.round(b.getBoundingClientRect().width)),
            hauteur: vus.length ? Math.round(vus[0].getBoundingClientRect().height) : 0,
            // UN MOT TRONQUÉ NE SE VOIT PAS DANS LE DOM : il faut comparer ce
            // que le texte MESURE à la place qu'on lui laisse.
            tronques: vus.map(b => b.querySelector('span')).filter(sp => sp
                && sp.scrollWidth > sp.clientWidth + 1)
                .map(sp => sp.textContent),
            scanLa: !!document.querySelector('#mob-btn-scan:not([hidden])')
        };
    });
    console.log('F barre (mode libre ouvert) :', JSON.stringify(await lireLaBarre()));
    await s.photo('#bottom-nav', 'tools/tmp/tablette-barre-6.png', 0);

    // LE MODE LIBRE FERMÉ, c'est-à-dire l'état de ses élèves : « Explorer » et
    // « Exercices » disparaissent (body.sans-mode-libre), et il reste Code,
    // Parcours, Profil — exactement ce que Rémy nomme.
    await s.page.evaluate(() => localStorage.setItem('atoutmath-mode-libre', '0'));
    await s.page.reload();
    await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    await s.page.waitForTimeout(800);
    console.log('F barre (mode libre fermé)  :', JSON.stringify(await lireLaBarre()));
    await s.photo('#bottom-nav', 'tools/tmp/tablette-barre-4.png', 0);

    // ET LE BOUTON SCANNE VRAIMENT, depuis la barre.
    const t1 = Date.now();
    await s.page.click('#mob-btn-scan');
    await s.page.waitForSelector('#scan-video', { timeout: 8000 });
    console.log('F la barre scanne : caméra en', Date.now() - t1, 'ms');
    await s.page.evaluate(() => {
        const v = [...document.querySelectorAll('.modal-overlay')]
            .filter(m => m.querySelector('#scan-video')).pop();
        const b = v && v.querySelector('.modal-close-btn');
        if (b) b.click();
    });
    await s.page.waitForTimeout(600);

    // EN LIGNE, LA BARRE NE BOUGE PAS. Le même écran, le réseau revenu : le
    // bouton doit repartir sans rechargement — c'est l'écouteur `online`.
    await s.page.evaluate(() => {
        Object.defineProperty(Navigator.prototype, 'onLine',
            { get: () => true, configurable: true });
        window.dispatchEvent(new Event('online'));
    });
    await s.page.waitForTimeout(400);
    console.log('F de retour en ligne        :', JSON.stringify(await lireLaBarre()));
    await s.page.evaluate(() => {
        Object.defineProperty(Navigator.prototype, 'onLine',
            { get: () => false, configurable: true });
        window.dispatchEvent(new Event('offline'));
    });
    await s.page.waitForTimeout(400);

    // ON RESCANNE LE MÊME QR, par le seul chemin qui existe aujourd'hui.
    await s.page.evaluate(() => {
        const m = document.getElementById('code-modal');
        if (m) m.style.display = 'flex';
    });
    await s.page.waitForTimeout(300);
    await s.doitExister('#btn-scanner-code', 'le scanner de la fenêtre du code');
    await s.page.click('#btn-scanner-code');
    let question = null;
    for (let i = 0; i < 60; i++) {
        question = await s.page.evaluate(() => {
            const g = document.querySelector('.reprise-garder');
            const z = document.querySelector('.reprise-zero');
            const v = g ? g.closest('.modal-overlay') : null;
            return { posee: !!(g && z),
                phrase: v ? v.innerText.replace(/\s+/g, ' ').slice(0, 200) : '' };
        });
        if (question.posee) break;
        await s.page.waitForTimeout(100);
    }
    console.log('D la question :', JSON.stringify(question, null, 1));
    if (question.posee) await s.photo('body', 'tools/tmp/tablette-question.png', 0);

    if (question && question.posee) {
        await s.page.click('.reprise-zero');
        await s.page.waitForTimeout(1200);
        const zero = await s.page.evaluate(async () => {
            const { state } = await import('./js/core/state.js');
            const p = state.studentPath;
            return { faites: (p.completed || []).length,
                resultats: Object.keys(p.resultats || {}).length,
                enTete: ((document.getElementById('game-progress-text') || {}).textContent || '').trim() };
        });
        console.log('D après zéro  :', JSON.stringify(zero));
    }
    console.log(`BCD erreurs : ${s.erreurs.length} | fenêtres natives : ${s.fenetresNatives.length}`);
    s.erreurs.slice(0, 6).forEach(e => console.log('  ⚠', e));
    await s.fermer();
}


// ── G. REVENIR À L'ÉCRAN D'ACCUEIL ──────────────────────────────────────────
//
// RÉMY : « mais on ne peut revenir à l'écran d'accueil. et sur l'écran
// d'accueil, il faudrait qu'il y ait lecture de qr code ». Il parle du PREMIER
// écran, celui au gros titre — il l'appelle déjà ainsi ailleurs.
//
// LA CAMÉRA EST UN MUR BLANC ICI, et c'est la troisième fois que ce piège se
// présente : avec le QR devant l'objectif, on touche « Accueil », l'écran
// revient, sa caméra s'ouvre toute seule, relit le QR et rouvre le parcours —
// en 1,3 s, la sonde ne voyait qu'une couche de jeu et concluait que rien
// n'avait marché. Pour mesurer un écran, il faut une entrée qui ne le fasse
// pas changer. On entre donc par le CODE : `applyCode` est le même chemin, au
// décodeur près, et le décodeur est mesuré au bloc B.
{
    const s = await ouvrirSonde({ largeur: 390, hauteur: 844, horsLigne: true,
        args: DRAPEAUX(BLANCHE) });
    const fermerLeScanner = () => s.page.evaluate(() => {
        const v = [...document.querySelectorAll('.modal-overlay')]
            .filter(m => m.querySelector('#scan-video')).pop();
        const b = v && v.querySelector('.modal-close-btn');
        if (b) { b.click(); return true; }
        return false;
    });
    await s.page.waitForTimeout(900);
    console.log('G la caméra s\'ouvre seule :', await fermerLeScanner());
    await s.page.waitForTimeout(400);

    await s.page.evaluate(async (code) => {
        const { applyCode } = await import('./js/ui/studentCodeUI.js');
        applyCode(code);
    }, CODE);
    await s.page.waitForFunction(() => {
        const g = document.getElementById('game-layer');
        return g && getComputedStyle(g).display !== 'none';
    }, { timeout: 20000 });
    await s.page.waitForTimeout(500);
    await s.page.evaluate(() => document.getElementById('btn-close-game').click());
    await s.page.waitForTimeout(800);

    const barre = await s.page.evaluate(() => {
        const vus = [...document.querySelectorAll('#bottom-nav .bottom-nav-btn')]
            .filter(b => b.offsetParent !== null);
        return { boutons: vus.map(b => (b.querySelector('span') || {}).textContent),
            largeurs: vus.map(b => Math.round(b.getBoundingClientRect().width)),
            tronques: vus.map(b => b.querySelector('span'))
                .filter(sp => sp && sp.scrollWidth > sp.clientWidth + 1)
                .map(sp => sp.textContent) };
    });
    console.log('G la barre    :', JSON.stringify(barre));

    await s.doitExister('#mob-btn-accueil', 'le bouton Accueil de la barre du bas');
    const t0 = Date.now();
    await s.page.click('#mob-btn-accueil');
    await s.page.waitForTimeout(1200);
    const accueil = await s.page.evaluate(() => {
        const p = document.getElementById('portail');
        const r = document.getElementById('portail-reprendre');
        return {
            ecranDAccueil: !!p,
            titre: p ? (p.querySelector('.portail-titre') || {}).textContent : null,
            revenirAMaSeance: r ? { visible: r.offsetParent !== null,
                y: Math.round(r.getBoundingClientRect().top) } : 'ABSENT',
            cameraRouverte: !!document.querySelector('#scan-video'),
            clavierAuFoyer: document.activeElement
                ? (document.activeElement.id || document.activeElement.tagName) : null,
            coucheDeJeu: (() => { const g = document.getElementById('game-layer');
                return g ? getComputedStyle(g).display : 'absente'; })()
        };
    });
    console.log('G l\'accueil  :', JSON.stringify(accueil), '—', Date.now() - t0, 'ms');
    await s.photo('#portail', 'tools/tmp/tablette-accueil.png', 0);

    await fermerLeScanner();
    await s.page.waitForTimeout(400);
    // L'ÉCRAN TEL QU'IL EST QUAND LA CAMÉRA SE REFERME : c'est celui que
    // l'élève regarde s'il ne veut pas scanner tout de suite.
    await s.photo('#portail', 'tools/tmp/tablette-accueil-nu.png', 0);
    await s.doitExister('#portail-reprendre', 'le retour vers la séance');
    await s.page.click('#portail-reprendre');
    await s.page.waitForTimeout(900);
    const retour = await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        return { ecranDAccueil: !!document.getElementById('portail'),
            parcoursGarde: !!state.studentPath,
            ecran: document.body.innerText.replace(/\s+/g, ' ').slice(0, 80) };
    });
    console.log('G le retour   :', JSON.stringify(retour));
    console.log(`G erreurs : ${s.erreurs.length} | fenêtres natives : ${s.fenetresNatives.length}`);
    s.erreurs.slice(0, 4).forEach(e => console.log('  ⚠', e));
    await s.fermer();
}
