// LE DÉFI SUR UNE SEULE MARCHE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour le défi, quand ce sont des exercices à pas, je ne peux choisir
// le pas ».
//
// Le défi prenait l'exercice avec ses réglages PAR DÉFAUT : sur un exercice à
// marches, il tirait dans toutes, alors que le professeur qui lance un défi
// vient de travailler UNE règle au tableau.
//
// ── CE QUE CETTE SONDE MESURE, ET CE QU'AUCUNE ÉPREUVE NE DIRAIT ─────────
//
// La marche traverse CINQ maisons : le déroulant du professeur, la route, la
// colonne de la base, le battement de séance, et le générateur sur l'ardoise.
// Une épreuve de source dirait que chacune porte le mot « params » ; elle ne
// dirait pas que la marche arrive jusqu'aux questions de l'élève. C'est
// exactement le défaut qui a coûté le plus cher ici — cinq colonnes absentes
// d'un SELECT, et tout le reste au vert.
//
// ON REGARDE DONC LES QUESTIONS QUE L'ÉLÈVE REÇOIT : sur la marche « produit »
// des Règles des puissances, elles doivent toutes porter un « × » et aucune un
// « ÷ ».
//
//     node tools/defiSurUnPas.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';

const ok = (q, bon, d = '') => {
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}`
        + (d ? ` \x1b[2m— ${d}\x1b[0m` : ''));
    return bon;
};

const PORT = String(9700 + Math.floor(Math.random() * 200));
const serveur = spawn('php', ['tools/siteEssai.php', PORT],
    { stdio: ['ignore', 'pipe', 'inherit'] });
let info = null;
for await (const bout of serveur.stdout) {
    const l = String(bout).split('\n').find(x => x.trim().startsWith('{'));
    if (l) { info = JSON.parse(l); break; }
}
const BASE = `http://127.0.0.1:${PORT}`;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const erreurs = [];
let tout = true;

const page = async (qui) => {
    const p = await nav.newPage({ viewport: { width: 1100, height: 820 } });
    p.on('pageerror', e => erreurs.push(`${qui}: ${String(e).slice(0, 150)}`));
    await p.goto(`${BASE}/index.html`);
    await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    return p;
};

try {
    console.log('\nLE DÉFI SUR UNE SEULE MARCHE');
    console.log('─'.repeat(70));

    const prof = await page('prof');
    await prof.evaluate(async ([e, m]) => {
        const { identifierProf } = await import('./js/core/verrouProf.js');
        await identifierProf(e, m);
    }, [info.email, info.mdp]);
    await prof.reload();
    await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

    const classe = await prof.evaluate(async () => {
        const { creerClasse, apercuDeListe, importerListe, listeDeClasse } =
            await import('./js/core/espaceProf.js');
        const c = await creerClasse('4D', '4e');
        const ap = await apercuDeListe(c.id, 'Pas Choisi\n', '');
        await importerListe(c.id, ap.apercu.texte);
        const l = await listeDeClasse(c.id);
        return { id: c.id, eleve: (l.eleves || [])[0] };
    });

    // ── LE DÉROULANT DU PROFESSEUR PROPOSE BIEN LES MARCHES ──────────────
    //
    // On passe par la fonction que la barre emploie : si elle rend du vide, le
    // professeur n'a rien à choisir, et le reste de la mesure ne dirait rien.
    const options = await prof.evaluate(async () => {
        const { getExerciseById } = await import('./js/data/catalog.js');
        const exo = getExerciseById('num-puissances-regles');
        const { getGenerator } = await import('./js/core/registry.js');
        const gen = getGenerator(exo.generatorId);
        const r = ((gen && gen.params) || []).find(p => p && p.id === 'marches' && p.marches);
        return r ? r.marches.map(m => m.id) : [];
    });
    tout = ok('l\'exercice déclare ses marches', options.length > 1,
        options.join(', ')) && tout;

    const eleve = await page('eleve');
    await eleve.evaluate(async ({ e, base }) => {
        const { loginEleve } = await import('./js/core/sync.js');
        await loginEleve({ apiUrl: base + '/api', login: e.login, code: e.code });
    }, { e: classe.eleve, base: BASE });
    await eleve.reload();
    await eleve.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

    // ── LE PROFESSEUR LANCE SUR « produit » SEULEMENT ────────────────────
    const lance = await prof.evaluate(async (cid) => {
        const { lancerLeDefi } = await import('./js/core/espaceProf.js');
        return lancerLeDefi(cid, 'num-puissances-regles', 45, 'qcm',
            { params: { marches: ['produit'] } });
    }, classe.id);
    tout = ok('le défi part avec une marche choisie', !!(lance && lance.ok)) && tout;

    // ── CE QUE L'ÉLÈVE REÇOIT ────────────────────────────────────────────
    try {
        await eleve.waitForSelector('.defi-reponses button, .defi-reponses .defi-rep',
            { timeout: 40000 });
    } catch (e) {
        tout = ok('le défi s\'ouvre sur l\'ardoise', false, 'aucune proposition');
        throw new Error('rien à mesurer après');
    }
    const vus = [];
    for (let i = 0; i < 8; i++) {
        const enonce = await eleve.evaluate(() =>
            (document.querySelector('[data-question]')?.textContent || '').replace(/\s+/g, ' ').trim());
        if (enonce) vus.push(enonce);
        await eleve.evaluate(() => {
            const b = document.querySelector('.defi-reponses button, .defi-reponses .defi-rep');
            if (b) b.click();
        });
        await dormir(500);
    }
    for (const q of vus.slice(0, 5)) console.log(`    « ${q} »`);
    tout = ok('l\'élève a bien reçu des questions', vus.length >= 4,
        `${vus.length} question(s)`) && tout;
    // LA MARCHE « produit » MULTIPLIE, ET ELLE SEULE. Les autres marches de cet
    // exercice divisent (÷), élèvent une puissance à une puissance, ou posent
    // un inverse : aucune ne porte un « × » entre deux puissances.
    const avecFois = vus.filter(q => /×/.test(q)).length;
    const avecDivise = vus.filter(q => /÷|\//.test(q)).length;
    tout = ok('toutes les questions sont des PRODUITS', avecFois === vus.length,
        `${avecFois}/${vus.length} portent un ×`) && tout;
    tout = ok('et aucune n\'est un quotient', avecDivise === 0,
        `${avecDivise} quotient(s)`) && tout;
    tout = ok('erreurs de page', erreurs.length === 0, String(erreurs.length)) && tout;
    for (const e of erreurs) console.log(`      ${e}`);
} catch (e) {
    console.log(`  (${e.message})`);
    tout = false;
} finally {
    await nav.close();
    serveur.kill();
}
console.log('─'.repeat(70));
console.log(tout ? '\x1b[32mLE DÉFI SE JOUE SUR LA MARCHE CHOISIE\x1b[0m'
    : '\x1b[31mLA MARCHE N\'ARRIVE PAS JUSQU\'À L\'ÉLÈVE\x1b[0m');
process.exit(tout ? 0 : 1);
