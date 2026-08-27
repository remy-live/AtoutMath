// VÉRIFIER TOUT LE PROGRAMME, POUR DE VRAI.
//
// Rémy : « je voudrais que tu vérifies tout le programme ».
//
// `npm test` vérifie les NOYAUX — ce qui se calcule sans navigateur, et c'est
// l'essentiel de la justesse. Mais il ne peut rien dire de ce qui ne se voit
// qu'à l'écran : un exercice qui s'ouvre sur un plateau vide, une fiche qui
// lève une exception au moment de se dessiner, un panneau dont le bouton ne
// répond plus, un plateau qui sort de l'écran d'un téléphone. Ces pannes-là ne
// cassent aucun test ; elles cassent la séance.
//
// CET OUTIL OUVRE L'APPLICATION POUR DE BON et fait le tour :
//
//   · chaque exercice du catalogue est lancé, et l'on regarde s'il se dessine,
//     en combien de temps, et sans une erreur de console ;
//   · chaque fiche imprimable est ouverte et son aperçu doit se garnir ;
//   · chaque panneau, chaque onglet, chaque bouton du mode professeur est
//     cliqué ;
//   · et tout cela une seconde fois en TÉLÉPHONE, où l'on mesure en plus ce
//     qui dépasse de la vitre.
//
// CE QU'IL A FALLU APPRENDRE POUR QU'IL DISE VRAI. Un vérificateur qui ne
// trouve jamais rien ne prouve rien — trois de ses mesures étaient fausses
// avant de devenir utiles :
//
//   · le plateau vivait dans `#game-board`, pas dans le `#game-layer` qu'on
//     interrogeait : la sonde lisait le texte de l'en-tête et concluait
//     « plein » quoi qu'il arrive ;
//   · un délai fixe faisait passer les exercices lents pour des pannes ; on
//     SONDE jusqu'à ce que le plateau se garnisse, et l'on note le temps ;
//   · une fenêtre étroite ne fait pas un téléphone. `telephonePortrait()`
//     exige `(pointer: coarse)` : sans pointeur tactile, on mesurait un écran
//     de bureau rétréci que personne n'a jamais eu sous les yeux.
//
// ET DEUX RÈGLES POUR NE PAS CRIER AU LOUP. Un élément qui sort de l'écran
// n'est un défaut que si rien ne le DÉCOUPE : les météorites du jeu de tir
// entrent en scène par le bord, c'est leur métier. Et l'intérieur d'un SVG se
// place dans le repère du dessin, pas dans celui de la page — le mesurer
// remontait cinquante faux positifs par écran.
//
// Usage :  node tools/audit.mjs [--tel] [--rapide] [--port 8123]
//          (le petit serveur doit tourner : python3 tools/serve.py 8123)

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const OPT = {
    tel: args.includes('--tel'),
    rapide: args.includes('--rapide'),
    port: (() => { const i = args.indexOf('--port'); return i >= 0 ? args[i + 1] : '8123'; })()
};
const BASE = `http://localhost:${OPT.port}/index.html`;

/** Le délai au-delà duquel une première image se remarque. */
const LENT = 1500;
/** Au-delà, on considère que le plateau ne viendra plus. */
const ABANDON = 4000;

const CHROMIUM = '/opt/pw-browsers/chromium';

function vue() {
    return OPT.tel
        ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
        : { viewport: { width: 1280, height: 820 } };
}

async function ouvrirApp(nav) {
    const p = await nav.newPage(vue());
    const seau = [];
    p.on('pageerror', e => seau.push('ERREUR: ' + String(e).split('\n')[0].slice(0, 170)));
    p.on('console', m => { if (m.type() === 'error') seau.push('CONSOLE: ' + m.text().slice(0, 170)); });
    await p.goto(BASE);
    await p.waitForTimeout(2600);
    // La modale d'arrivée n'est pas l'objet du contrôle.
    await p.evaluate(() => document.querySelectorAll('.modal-overlay')
        .forEach(m => { m.style.display = 'none'; }));
    return { p, seau };
}

/** Le plateau s'est-il garni, et en combien de temps ? */
async function attendrePlateau(p) {
    const t0 = Date.now();
    while (Date.now() - t0 < ABANDON) {
        const plein = await p.evaluate(() => {
            const z = document.getElementById('game-board');
            if (!z) return false;
            const t = (z.textContent || '').trim().length;
            const n = z.querySelectorAll(
                'canvas,svg,button,input,select,textarea,.game-question,img').length;
            return t >= 3 || n > 0;
        });
        if (plein) return Date.now() - t0;
        await p.waitForTimeout(100);
    }
    return null;
}

/** Ce qui sort de l'écran SANS être découpé par un cadre. */
async function debordements(p) {
    return p.evaluate(() => {
        const z = document.getElementById('game-board');
        if (!z) return 0;
        const large = document.documentElement.clientWidth;
        const decoupe = (el) => {
            for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
                const o = getComputedStyle(n).overflow;
                if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') return true;
            }
            return false;
        };
        let pire = 0;
        z.querySelectorAll('*').forEach(el => {
            if (el.ownerSVGElement) return;          // le repère du dessin, pas celui de la page
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) return;
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.display === 'none') return;
            const d = Math.round(Math.max(r.right - large, -r.left));
            if (d > 4 && !decoupe(el)) pire = Math.max(pire, d);
        });
        return pire;
    });
}

/**
 * LE PANNEAU DE RÉGLAGES D'AVANT-PARTIE, TRAVERSÉ COMME LE FAIT UN PROFESSEUR.
 *
 * Un exercice réglable ne démarre plus tout seul : il demande d'abord ses
 * réglages. L'audit ne les change pas — il veut les valeurs du catalogue — mais
 * il doit appuyer sur « Jouer ! », sinon tout exercice réglable se signale
 * comme un plateau vide.
 */
async function traverserLesReglages(p) {
    const ouvert = await p.evaluate(() => {
        const m = document.getElementById('student-config-modal');
        return !!(m && getComputedStyle(m).display !== 'none');
    });
    if (!ouvert) return;
    await p.click('#btn-student-config-start').catch(() => { });
    await p.waitForTimeout(150);
}

async function tourDuCatalogue(p, seau) {
    const ids = await p.evaluate(async () => {
        const s = await import('/js/core/state.js');
        // En professeur, tout est déverrouillé : on veut vérifier les
        // exercices, pas le verrou. Le panneau de réglages, lui, S'INTERPOSE
        // MAINTENANT POUR LES DEUX RÔLES — c'était le trou signalé par Rémy
        // (« les paramètres ne fonctionnent pas ») —, et l'audit le traverse
        // comme un professeur : il appuie sur « Jouer ! ».
        s.state.isTeacherMode = true;
        s.state.previewDeviceMode = 'desktop';
        const { exercices } = await import('/js/data/catalog.js');
        return exercices.map(e => e.id);
    });
    const liste = OPT.rapide ? ids.filter((_, i) => i % 5 === 0) : ids;
    const soucis = [];
    for (let i = 0; i < liste.length; i++) {
        seau.length = 0;
        try {
            await p.evaluate(async (id) => {
                const { openGameLayer } = await import('/js/games/engine.js');
                const { getExerciseById } = await import('/js/data/catalog.js');
                openGameLayer(getExerciseById(id), false);
            }, liste[i]);
            await traverserLesReglages(p);
            const mis = await attendrePlateau(p);
            if (mis === null) seau.push('VIDE: le plateau reste vide');
            else if (mis > LENT) seau.push(`LENT: ${mis} ms avant la première image`);
            const trop = await debordements(p);
            if (trop) seau.push(`DÉBORDE: ${trop} px hors de l'écran`);
        } catch (e) {
            seau.push('LANCEMENT: ' + String(e.message || e).split('\n')[0].slice(0, 170));
        }
        await p.evaluate(() => {
            const l = document.getElementById('game-layer');
            if (l) l.style.display = 'none';
        }).catch(() => { });
        await p.waitForTimeout(120);
        if (seau.length) soucis.push({ id: liste[i], quoi: [...new Set(seau)] });
        if ((i + 1) % 25 === 0) process.stderr.write(`  … ${i + 1}/${liste.length}\n`);
    }
    return { combien: liste.length, soucis };
}

async function tourDesFiches(p, seau) {
    const ids = await p.evaluate(async () => {
        const { exercices } = await import('/js/data/catalog.js');
        return exercices.filter(e => e.printGeneratorId || e.printable).map(e => e.id);
    });
    const liste = OPT.rapide ? ids.filter((_, i) => i % 5 === 0) : ids;
    const soucis = [];
    for (const id of liste) {
        seau.length = 0;
        const r = await p.evaluate(async (id) => {
            try {
                const { getExerciseById } = await import('/js/data/catalog.js');
                const exo = getExerciseById(id);
                const m = await import('/js/ui/printSheet.js');
                m.ouvrirFicheModal(exo, { ...(exo.printParams || exo.params || {}) });
                return '';
            } catch (e) { return 'LANCEMENT: ' + String(e.message || e).slice(0, 160); }
        }, id);
        if (r) seau.push(r);
        await p.waitForTimeout(650);
        const vide = await p.evaluate(() => {
            const a = document.querySelector('.fp-apercu, #fq-apercu, [id$="-apercu"]');
            if (!a) return 'pas d\'aperçu';
            return a.children.length === 0 ? 'aperçu vide' : '';
        });
        if (vide) seau.push('VIDE: ' + vide);
        await p.evaluate(() => document.querySelectorAll('.modal-overlay')
            .forEach(m => { m.style.display = 'none'; }));
        await p.waitForTimeout(80);
        if (seau.length) soucis.push({ id, quoi: [...new Set(seau)] });
    }
    return { combien: liste.length, soucis };
}

async function tourDesPanneaux(p, seau) {
    const soucis = [];
    const essai = async (nom, fn) => {
        seau.length = 0;
        try { await fn(); } catch (e) {
            seau.push('LANCEMENT: ' + String(e.message || e).split('\n')[0].slice(0, 170));
        }
        await p.waitForTimeout(600);
        if (seau.length) soucis.push({ id: nom, quoi: [...new Set(seau)] });
        await p.evaluate(() => document.querySelectorAll('.modal-overlay')
            .forEach(m => { m.style.display = 'none'; }));
        await p.waitForTimeout(100);
    };
    const clic = (sel) => p.evaluate((s) => {
        const b = document.querySelector(s);
        if (b) b.click();
    }, sel);

    // On repasse élève : les onglets du haut n'existent que pour lui.
    await p.evaluate(async () => {
        const s = await import('/js/core/state.js');
        s.state.isTeacherMode = false;
        document.body.classList.remove('teacher-mode');
    });
    for (const [nom, sel] of [
        ['onglet Parcours', '#top-btn-path'], ['onglet Code', '#top-btn-code'],
        ['onglet Profil', '#top-btn-profile'], ['onglet Exercices', '#top-btn-grid'],
        ['carnet d\'erreurs', '#btn-open-errors'], ['thème', '#btn-toggle-theme'],
        ['ma classe', '#btn-open-sync'], ['sauvegarde', '#btn-open-import-export-student'],
        ['arbre des domaines', '#desk-btn-acc'], ['retour au clic', '#desk-btn-drill'],
        ['par chapitres', '[data-rangement="chapitre"]'], ['par domaines', '[data-rangement="domaine"]']
    ]) await essai(nom, () => clic(sel));

    await essai('bascule en professeur', async () => {
        await clic('#btn-role');
        await p.waitForTimeout(800);
    });
    const boutons = await p.evaluate(() =>
        [...document.querySelectorAll('#builder-view button[id], header button[id], .toolbar-icon-btn')]
            .filter(b => b.offsetParent !== null).map(b => b.id).filter(Boolean));
    for (const id of boutons) await essai('professeur · #' + id, () => clic('#' + id));
    return { combien: 13 + boutons.length, soucis };
}

// --- Le tour complet -----------------------------------------------------------

const nav = await chromium.launch({ executablePath: CHROMIUM });
const { p, seau } = await ouvrirApp(nav);
const cadre = OPT.tel ? 'TÉLÉPHONE' : 'ORDINATEUR';
process.stderr.write(`# audit ${cadre}${OPT.rapide ? ' (rapide)' : ''}\n`);

const tours = [
    ['exercices', await tourDuCatalogue(p, seau)],
    ['fiches papier', await tourDesFiches(p, seau)],
    ['panneaux', await tourDesPanneaux(p, seau)]
];
await nav.close();

let total = 0;
console.log(`\n=== AUDIT ${cadre} ===`);
tours.forEach(([nom, r]) => {
    total += r.soucis.length;
    console.log(`\n${nom} : ${r.combien} vérifiés, ${r.soucis.length} à signaler`);
    r.soucis.forEach(s => console.log(`  · ${s.id}\n      ${s.quoi.join('\n      ')}`));
});
console.log(total ? `\n${total} point${total > 1 ? 's' : ''} à regarder.` : '\nRien à signaler.');
process.exit(total ? 1 : 0);
