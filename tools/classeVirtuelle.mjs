// TRENTE ÉLÈVES VIRTUELS — la classe de Rémy, avant la classe de Rémy.
//
// Rémy : « Fais moi des essais avec des élèves virtuels. »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI TRENTE, ET PAS TROIS.
//
// Tout le reste du harnais travaille à trois élèves, et c'est suffisant pour
// vérifier qu'une donnée traverse. Ce n'est PAS suffisant pour vérifier qu'un
// écran tient : une alarme qui nomme les élèves est lisible à deux et
// illisible à quinze ; un mur de tuiles tient sur un écran à trente et déborde
// à quarante ; un bilan qui range par ordre alphabétique cache le seul élève
// qui n'a rien fait, et l'on ne s'en aperçoit qu'avec assez de lignes pour
// qu'il ne soit plus sous les yeux.
//
// RIEN N'EST TRUQUÉ ICI. Chaque élève se connecte vraiment par `/login`, écrit
// de vrais événements dans son journal, et les pousse par le vrai `/sync` —
// chiffrés, relus, reprojetés par le serveur. Ce que les captures montrent est
// ce que Rémy verra, pas une maquette.
//
// Usage :  node tools/classeVirtuelle.mjs [combien]
// Écrit ses captures dans tools/tmp/ et dit ce qu'il a mesuré.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

const COMBIEN = Math.max(1, Math.min(40, Number(process.argv[2]) || 30));

// Des prénoms d'une vraie classe de quatrième : accents, traits d'union,
// prénoms composés. C'est là que se cassent les tris et les gabarits.
const NOMS = [
    'ALMEIDA;Alicia', 'ANGARD;Lily', 'BA;Maryam', 'BENOÎT;Noé', 'CHEN;Wei',
    'DA SILVA;Enzo', 'DIALLO;Fatoumata', 'DUPONT;Emma', 'EL AMRANI;Yasmine',
    'FERREIRA;Lucas', 'GARCIA;Léa', 'GRANDJEAN;Marie-Ange', 'HOARAU;Océane',
    'IBRAHIM;Adam', 'JEAN-BAPTISTE;Kylian', 'KOWALSKI;Zoé', 'LAMBERT;Jules',
    'M\'BAYE;Aïssatou', 'MARTIN;Gabriel', 'NGUYÊN;Maëlle', 'O\'CONNOR;Liam',
    'PEREIRA;Inès', 'QUEFFÉLEC;Ewen', 'ROUX;Léo', 'SÉGUIN;Chloé',
    'TRAORÉ;Moussa', 'VAN DEN BERG;Sacha', 'WEBER;Anaïs', 'XU;Ming',
    'ZIEGLER;Théo', 'ANDRÉ;Jean-Paul', 'BOUCHARD;Salomé', 'CASTELLI;Rafael',
    'DEMBÉLÉ;Awa', 'ÉTIENNE;Baptiste', 'FONTAINE;Manon', 'GUEYE;Cheikh',
    'HERNANDEZ;Diego', 'ITO;Yuki', 'JOLY;Camille'
];

/**
 * LES HISTOIRES, ET POURQUOI CELLES-LÀ.
 *
 * Une classe où tout le monde travaille pareil ne met aucun écran à l'épreuve.
 * Celle-ci contient exprès les cas qui cassent : celui qui n'est jamais venu,
 * celui qui a fini en deux minutes, celui qui s'est arrêté au milieu il y a un
 * quart d'heure, celui qui a tout raté.
 */
function histoireDe(i) {
    const m = i % 10;
    if (m === 0) return { etapes: 3, faites: 3, enCours: 0, fini: true, reussite: 0.9, silence: 60 };
    if (m === 1) return { etapes: 3, faites: 3, enCours: 0, fini: true, reussite: 0.55, silence: 200 };
    if (m === 2) return { etapes: 3, faites: 2, enCours: 6, fini: false, reussite: 0.75, silence: 25 };
    if (m === 3) return { etapes: 3, faites: 1, enCours: 4, fini: false, reussite: 0.6, silence: 40 };
    // Celui qui s'est arrêté : c'est lui que l'alarme doit trouver.
    if (m === 4) return { etapes: 3, faites: 1, enCours: 2, fini: false, reussite: 0.3, silence: 14 * 60 };
    if (m === 5) return { etapes: 3, faites: 0, enCours: 5, fini: false, reussite: 0.8, silence: 15 };
    // Celui qui ralentit.
    if (m === 6) return { etapes: 3, faites: 2, enCours: 3, fini: false, reussite: 0.5, silence: 7 * 60 };
    // Celui qui a tout raté : ses notions doivent ressortir dans « À reprendre ».
    if (m === 7) return { etapes: 3, faites: 2, enCours: 4, fini: false, reussite: 0.15, silence: 90 };
    // Celui qui n'est jamais venu : aucune connexion du tout.
    if (m === 8) return null;
    return { etapes: 3, faites: 1, enCours: 7, fini: false, reussite: 0.65, silence: 50 };
}

const ETAPES = ['Additions posées', 'Soustractions posées', 'Divisions posées'];
const EXOS = ['calc-poser', 'calc-poser-division', 'calc-prio'];
const NOTIONS = ['num.add.entiers', 'num.div.quotient', 'num.prio'];

// ─────────────────────────────────────────────────────── LE SERVEUR ─────────

const PORT = String(8800 + Math.floor(Math.random() * 150));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('le site d\'essai n\'a pas démarré')), 30000);
    srv.stdout.on('data', d => { if (String(d).includes('"port"')) { clearTimeout(t); ok(); } });
    srv.on('error', ko);
});
await attendre(400);
const BASE = `http://127.0.0.1:${PORT}`;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const err = [];
const ok = (q, v, d = '') => {
    console.log((v ? '  ok   ' : '  NON  ') + q + (d ? '  — ' + d : ''));
    if (!v) process.exitCode = 1;
};

console.log(`\nUNE CLASSE DE ${COMBIEN} ÉLÈVES, SUR UN VRAI SERVEUR`);
console.log('─'.repeat(64));

// ─────────────────────────────────────── LE PROFESSEUR ET SA CLASSE ─────────

const prof = await nav.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
prof.on('pageerror', e => err.push('prof: ' + String(e).slice(0, 180)));
await prof.goto(`${BASE}/index.html`);
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await prof.evaluate(async () => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    await identifierProf('remy@essai.test', 'motdepassetreslong');
});
await prof.reload();
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });

const classe = await prof.evaluate(async (noms) => {
    const { creerClasse, apercuDeListe, importerListe, listeDeClasse } =
        await import('./js/core/espaceProf.js');
    const c = await creerClasse('4A', '4e');
    const ap = await apercuDeListe(c.id, noms.join('\n') + '\n', '');
    await importerListe(c.id, ap.apercu.texte);
    const l = await listeDeClasse(c.id);
    return { id: c.id, eleves: (l.eleves || []).map(e => ({ login: e.login, code: e.code, prenom: e.prenom })) };
}, NOMS.slice(0, COMBIEN));

ok('la classe est montée avec toute sa liste', classe.eleves.length === COMBIEN,
    classe.eleves.length + ' élève(s)');

// ──────────────────────────────────────── CHACUN TRAVAILLE, POUR DE VRAI ────

let connectes = 0;
for (let i = 0; i < classe.eleves.length; i++) {
    const h = histoireDe(i);
    if (!h) continue;                      // celui qui n'est jamais venu
    const e = classe.eleves[i];
    const page = await nav.newPage();
    page.on('pageerror', x => err.push('élève: ' + String(x).slice(0, 180)));
    await page.goto(`${BASE}/index.html`);
    await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
    const fait = await page.evaluate(async ({ e, h, base, ETAPES, EXOS, NOTIONS }) => {
        const { loginEleve, syncNow } = await import('./js/core/sync.js');
        await loginEleve({ apiUrl: base + '/api', login: e.login, code: e.code });
        const { journal, EventTypes } = await import('./js/core/journal.js');
        const runId = 'run_' + e.login;
        const plan = ETAPES.map((titre, k) => ({
            rang: k, stepId: 'sc_' + k, titre, exerciseId: EXOS[k], questions: 8, requis: 6
        }));
        journal.emit(EventTypes.RUN_STARTED, {
            runId, pathId: 'p_devoir', pathName: 'Devoir du mardi',
            mode: 'entrainement', stepCount: plan.length, plan
        });

        // Les étapes closes : on écrit AUSSI leurs tentatives, sans quoi le
        // bilan ne verrait aucune notion travaillée — et « À reprendre »
        // resterait vide, ce qui est justement ce qu'on veut éprouver.
        for (let k = 0; k < h.faites; k++) {
            let justes = 0;
            for (let q = 0; q < 8; q++) {
                const bon = Math.random() < h.reussite;
                if (bon) justes++;
                journal.emit(EventTypes.ATTEMPT, {
                    runId, stepId: 'sc_' + k, exerciseId: EXOS[k], skillId: NOTIONS[k],
                    itemSeed: `${k}:${q}`, correct: bon, attemptIndex: 0, msElapsed: 25000
                });
            }
            journal.emit(EventTypes.STEP_COMPLETED, {
                runId, pathId: 'p_devoir', stepId: 'sc_' + k, title: ETAPES[k],
                exerciseId: EXOS[k], questions: 8, solved: justes, required: 6,
                passed: justes >= 6
            });
            // Le temps passé est un événement à part — c'est le meneur qui
            // l'écrit en fermant une étape. Sans lui, le bilan de classe
            // afficherait « — » de travail pour quatre cents questions.
            journal.emit(EventTypes.TIME_SPENT, { exerciseId: EXOS[k], seconds: 180 + k * 40 });
        }
        // L'étape en cours.
        const k = h.faites;
        for (let q = 0; q < h.enCours; q++) {
            journal.emit(EventTypes.ATTEMPT, {
                runId, stepId: 'sc_' + k, exerciseId: EXOS[k] || EXOS[0],
                skillId: NOTIONS[k] || NOTIONS[0],
                itemSeed: `${k}:${q}`, correct: Math.random() < h.reussite,
                attemptIndex: 0, msElapsed: 25000
            });
        }
        if (h.fini) journal.emit(EventTypes.RUN_FINISHED, { runId, pathId: 'p_devoir', aborted: false });

        // ON DATE LE DERNIER ÉVÉNEMENT DANS LE PASSÉ. C'est le silence qui
        // décide de l'alarme, et il se mesure sur la dernière réponse.
        const tous = journal.all();
        const dernier = tous[tous.length - 1];
        if (dernier) dernier.ts = Date.now() - h.silence * 1000;

        // `syncNow` rend null si une synchro est DÉJÀ en vol — et c'est le cas,
        // `loginEleve` vient de lancer la sienne. On réessaie jusqu'à ce que la
        // file soit vide.
        for (let n = 0; n < 25 && journal.pending().length; n++) {
            await syncNow();
            if (journal.pending().length) await new Promise(r => setTimeout(r, 300));
        }
        return { reste: journal.pending().length, ecrits: journal.all().length };
    }, { e, h, base: BASE, ETAPES, EXOS, NOTIONS });
    if (!fait.reste) connectes++;
    await page.close();
}
ok('chacun a poussé son journal par le vrai /sync',
    connectes === classe.eleves.filter((_, i) => histoireDe(i)).length,
    connectes + ' journaux arrivés');

// ───────────────────────────────────────── CE QUE LE PROFESSEUR VOIT ────────

async function ouvrirOnglet(nom) {
    await prof.evaluate((n) => {
        const b = [...document.querySelectorAll('.ec-onglet')]
            .find(x => new RegExp(n, 'i').test(x.textContent || ''));
        if (b) b.click();
    }, nom);
    await prof.waitForTimeout(2600);
}

await prof.click('#top-btn-classe');
await prof.waitForSelector('.ec-carte[data-ouvrir]', { timeout: 15000 });
for (let essai = 0; essai < 6; essai++) {
    await prof.evaluate(() => {
        const c = [...document.querySelectorAll('.ec-carte[data-ouvrir]')]
            .find(x => /4A/.test(x.textContent || '')) || document.querySelector('.ec-carte[data-ouvrir]');
        if (c) c.click();
    });
    await prof.waitForTimeout(1100);
    if (await prof.evaluate(() => document.querySelectorAll('.ec-onglet').length > 0)) break;
}
await prof.waitForTimeout(2600);

// --- Le direct ---
const direct = await prof.evaluate(() => ({
    alarme: (document.querySelector('.ec-alarme-mot') || {}).textContent,
    entete: (document.querySelector('.ec-classe-ligne') || {}).textContent?.replace(/\s+/g, ' ').trim(),
    rangs: document.querySelectorAll('.ec-rang').length,
    bloques: document.querySelectorAll('.ec-rang--bloque').length,
    large: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth)
}));
console.log('\n  LE DIRECT');
console.log('   ', direct.entete);
console.log('    alarme :', direct.alarme || '(aucune)');
ok('les ' + COMBIEN + ' élèves sont dans Le direct', direct.rangs === COMBIEN, direct.rangs + ' lignes');
ok('L\'ALARME NOMME DES ÉLÈVES, ELLE NE COMPTE PAS', !!direct.alarme && /[A-ZÉÈ]/.test(direct.alarme));
ok('rien ne déborde en largeur', direct.large === 0, direct.large + ' px de débordement');
await prof.screenshot({ path: 'tools/tmp/classe-direct.png', fullPage: true });

// --- Le mur ---
await ouvrirOnglet('mur');
const mur = await prof.evaluate(() => {
    const t = [...document.querySelectorAll('.ec-tuile')];
    const par = {};
    for (const x of t) {
        const e = (x.className.match(/ec-tuile--([a-z-]+)/) || [])[1] || '?';
        par[e] = (par[e] || 0) + 1;
    }
    return {
        tuiles: t.length, par,
        premier: (t[0] && t[0].querySelector('.ec-tuile-qui') || {}).textContent,
        etatPremier: t[0] ? (t[0].className.match(/ec-tuile--([a-z-]+)/) || [])[1] : null,
        large: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth)
    };
});
console.log('\n  LE MUR :', JSON.stringify(mur.par));
ok('le mur montre TOUT LE MONDE', mur.tuiles === COMBIEN, mur.tuiles + ' tuiles');
ok('ET IL COMMENCE PAR CE QUI NE VA PAS', mur.etatPremier === 'bloque',
    `${mur.premier} · ${mur.etatPremier}`);
ok('rien ne déborde en largeur', mur.large === 0, mur.large + ' px');
await prof.screenshot({ path: 'tools/tmp/classe-mur.png', fullPage: true });

// --- Les bilans ---
await ouvrirOnglet('bilans');
await prof.waitForTimeout(2500);
const bilan = await prof.evaluate(() => {
    const notions = [...document.querySelectorAll('.ec-reprendre')].map(n => ({
        quoi: (n.querySelector('b') || {}).textContent,
        combien: (n.querySelector('.ec-reprendre-combien') || {}).textContent
    }));
    const lignes = [...document.querySelectorAll('.ec-table--bilan tbody tr')];
    return {
        chiffres: [...document.querySelectorAll('.ec-chiffre')]
            .map(c => c.textContent.replace(/\s+/g, ' ').trim()),
        notions,
        lignes: lignes.length,
        premier: (lignes[0] && lignes[0].querySelector('b') || {}).textContent,
        premierRien: !!(lignes[0] && lignes[0].classList.contains('ec-tr-rien')),
        large: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth)
    };
});
console.log('\n  LES BILANS');
for (const c of bilan.chiffres) console.log('   ', c);
console.log('    à reprendre :', bilan.notions.map(n => `${n.quoi} (${n.combien})`).join(' · ') || '(rien)');
ok('le bilan liste toute la classe', bilan.lignes === COMBIEN, bilan.lignes + ' lignes');
ok('IL DIT CE QU\'IL FAUT REPRENDRE, ET POUR COMBIEN', bilan.notions.length > 0,
    bilan.notions.length + ' notion(s)');
ok('CELUI QUI N\'A RIEN FAIT EST EN HAUT, PAS À LA LETTRE Z', bilan.premierRien,
    bilan.premier || '(vide)');
ok('rien ne déborde en largeur', bilan.large === 0, bilan.large + ' px');
await prof.screenshot({ path: 'tools/tmp/classe-bilans.png', fullPage: true });

// --- Et sur un téléphone ---
const tel = await nav.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
tel.on('pageerror', e => err.push('tél: ' + String(e).slice(0, 180)));
await tel.goto(`${BASE}/index.html`);
await tel.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await tel.evaluate(async () => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    await identifierProf('remy@essai.test', 'motdepassetreslong');
});
await tel.reload();
await tel.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await tel.click('#top-btn-classe');
await tel.waitForTimeout(1500);
for (let essai = 0; essai < 6; essai++) {
    await tel.evaluate(() => {
        const c = document.querySelector('.ec-carte[data-ouvrir]');
        if (c) c.click();
    });
    await tel.waitForTimeout(1100);
    if (await tel.evaluate(() => document.querySelectorAll('.ec-onglet').length > 0)) break;
}
await tel.waitForTimeout(2600);
const surTel = await tel.evaluate(() =>
    Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth));
ok('SUR TÉLÉPHONE NON PLUS, RIEN NE DÉBORDE', surTel === 0, surTel + ' px');
await tel.screenshot({ path: 'tools/tmp/classe-telephone.png', fullPage: true });

console.log('\n' + '─'.repeat(64));
console.log('erreurs de page :', err.length, err.slice(0, 4));
if (err.length) process.exitCode = 1;
console.log(process.exitCode ? 'IL RESTE QUELQUE CHOSE À VOIR.' : 'LA CLASSE TIENT DEBOUT.');

await nav.close();
srv.kill();
