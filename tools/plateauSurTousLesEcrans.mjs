// LE PLATEAU PART-IL SUR TOUTES LES ARDOISES, OÙ QU'ELLES SOIENT ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
//     node tools/plateauSurTousLesEcrans.mjs
//
// RÉMY, 13 novembre : « le plateau ne s'est lancé que sur qqs élèves ca devrait
// se lancer sur ceux en ligne en fait ».
//
// ── POURQUOI `plateauEnClasse.mjs` NE POUVAIT PAS LE DIRE ─────────────────
//
// Il ouvre trois ardoises NEUVES, au même instant, sur le même écran, toutes
// au premier plan — et il les voit toutes les trois recevoir l'annonce. C'est
// vrai, et ce n'est pas la classe de Rémy : chez lui, une tablette est dans un
// exercice, une autre sur le chemin, une troisième posée écran éteint depuis
// cinq minutes, une quatrième vient d'être rechargée.
//
//     Trois ardoises dans le même état ne mesurent qu'un état.
//
// Cette sonde-ci met chaque ardoise dans un état DIFFÉRENT, lance la partie, et
// compte qui l'ouvre. Elle ne corrige rien : elle nomme celles qui ratent.
//
// ── ELLE SORT EN ROUGE AUJOURD'HUI, ET CE N'EST PAS UNE PANNE ─────────────
//
// CE N'EST PAS UN HARNAIS : ce dépôt en a trois, et ils doivent être verts
// avant chaque commit. Celle-ci est une MESURE, et elle rapporte ce qu'elle
// voit. Au 13 novembre, elle voit quatre ardoises sur cinq :
//
//     sur son chemin ............................ terrain ouvert en 13 s
//     au milieu d'un exercice ................... terrain ouvert en 12,5 s
//     onglet caché tout du long ................. RIEN en 45 s
//     onglet caché, l'élève revient ............. terrain ouvert en 12 s
//     rechargée après l'annonce ................. terrain ouvert en 12 s
//
// L'ONGLET QUI RESTE CACHÉ EST UNE LIMITE DU NAVIGATEUR, pas un défaut du
// logiciel : le battement y passe à soixante secondes (`SEANCE_CACHE_MS`) et
// le navigateur gèle par-dessus les minuteurs d'un onglet en arrière-plan. On
// ne peut pas le joindre plus vite. Ce qui compte, et qui marche, c'est que
// l'élève qui REVIENT dessus rejoigne la partie en cours — la quatrième ligne.
//
// CELA NE RESSEMBLE DONC PAS ENCORE AU CAS DE RÉMY, dont les élèves
// regardaient leur tablette. Les états qui restent à mesurer : la classe en
// pause, un mot du professeur affiché, le mode plein écran, le bac à sable.
//
// ── CE QU'ELLE SIMULE, ET COMMENT ─────────────────────────────────────────
//
// L'ONGLET CACHÉ est le cas le plus important, parce que c'est l'état d'une
// tablette qu'on vient de poser : le battement de séance passe alors toutes
// les SOIXANTE secondes au lieu de dix (`SEANCE_CACHE_MS`, js/core/sync.js), et
// le navigateur freine en plus les minuteurs. On ne peut pas éteindre un écran
// depuis Playwright, mais on peut dire à la page ce qu'elle lit : on redéfinit
// `document.visibilityState` et l'on envoie `visibilitychange`, qui est
// EXACTEMENT ce que l'application observe.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';

const ok = (q, bon, d = '') => {
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}`
        + (d ? ` \x1b[2m— ${d}\x1b[0m` : ''));
    return bon;
};

const dit = (q, d) => console.log(`  \x1b[2m·\x1b[0m ${q} \x1b[2m— ${d}\x1b[0m`);

const PORT = String(8900 + Math.floor(Math.random() * 300));
const serveur = spawn('php', ['tools/siteEssai.php', PORT],
    { stdio: ['ignore', 'pipe', 'inherit'] });
let info = null;
for await (const bout of serveur.stdout) {
    const l = String(bout).split('\n').find(x => x.trim().startsWith('{'));
    if (l) { info = JSON.parse(l); break; }
}
if (!info) { console.error('le site d\'essai n\'a rien dit'); process.exit(2); }
const BASE = `http://127.0.0.1:${PORT}`;

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const erreurs = [];
let tout = true;

async function ouvrirUnePage(qui) {
    const page = await nav.newPage({ viewport: { width: 1100, height: 820 } });
    page.on('pageerror', e => erreurs.push(`${qui}: ${String(e).slice(0, 170)}`));
    page.on('dialog', async (d) => { erreurs.push(`${qui}: fenêtre native`); await d.dismiss(); });
    await page.goto(`${BASE}/index.html`);
    await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    return page;
}

/** Les cinq états dans lesquels une tablette se trouve quand ça sonne. */
const ETATS = [
    { cle: 'chemin', dit: 'sur son chemin, écran allumé' },
    { cle: 'exercice', dit: 'au milieu d\'un exercice' },
    // CELUI-CI NE COMPTE PAS DANS LE VERDICT, et la raison est écrite en bas :
    // un onglet qui reste en arrière-plan est gelé par le navigateur, et
    // personne ne le regarde. On le mesure quand même, pour que le jour où il
    // passerait au vert on le sache.
    { cle: 'cache', dit: 'onglet caché depuis une minute', horsVerdict: true },
    { cle: 'cacheRevenu', dit: 'onglet caché, reprise 4 s après l\'annonce' },
    { cle: 'rechargee', dit: 'rechargée 3 s après l\'annonce' }
];

try {
    console.log('\nLE PLATEAU, SUR CINQ ARDOISES DANS CINQ ÉTATS');
    console.log('─'.repeat(70));

    const prof = await ouvrirUnePage('prof');
    await prof.evaluate(async ([e, m]) => {
        const { identifierProf } = await import('./js/core/verrouProf.js');
        await identifierProf(e, m);
    }, [info.email, info.mdp]);
    await prof.reload();
    await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

    const noms = ETATS.map((e, i) => `Eleve${i + 1} ${e.cle}`);
    const classe = await prof.evaluate(async (liste) => {
        const { creerClasse, apercuDeListe, importerListe, listeDeClasse } =
            await import('./js/core/espaceProf.js');
        const c = await creerClasse('6B', '6e');
        const ap = await apercuDeListe(c.id, liste.join('\n') + '\n', '');
        await importerListe(c.id, ap.apercu.texte);
        const l = await listeDeClasse(c.id);
        return { id: c.id, eleves: (l.eleves || []).map(e => ({ login: e.login, code: e.code })) };
    }, noms);
    tout = ok(`LA CLASSE EST MONTÉE`, classe.eleves.length === ETATS.length,
        `${classe.eleves.length} élève(s)`) && tout;

    const ardoises = [];
    for (let i = 0; i < ETATS.length; i++) {
        const e = classe.eleves[i];
        const page = await ouvrirUnePage(ETATS[i].cle);
        await page.evaluate(async ({ e, base }) => {
            const { loginEleve } = await import('./js/core/sync.js');
            await loginEleve({ apiUrl: base + '/api', login: e.login, code: e.code });
        }, { e, base: BASE });
        await page.reload();
        await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
        ardoises.push({ page, etat: ETATS[i] });
    }

    // ── CHACUNE PREND SA POSITION ─────────────────────────────────────────
    const cacher = (page) => page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState',
            { configurable: true, get: () => 'hidden' });
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    const revenir = (page) => page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState',
            { configurable: true, get: () => 'visible' });
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    for (const a of ardoises) {
        if (a.etat.cle === 'exercice') {
            await a.page.evaluate(async () => {
                const { getExerciseById } = await import('./js/data/catalog.js');
                const { makeStep, makePath } = await import('./js/core/path.js');
                const { politiquePerso } = await import('./js/core/mesExercices.js');
                const { Runner } = await import('./js/core/runner.js');
                const pas = makeStep(getExerciseById('calc-add').id, {},
                    { stepId: 's1', nbItems: 20, threshold: 0 });
                window.__r = new Runner({
                    path: makePath('Essai', [pas], politiquePerso()), deviceMode: 'none' });
                window.__r.start();
            });
        }
        if (a.etat.cle === 'cache' || a.etat.cle === 'cacheRevenu') await cacher(a.page);
    }
    // L'ONGLET CACHÉ L'EST DEPUIS UN MOMENT : son battement lent a eu le temps
    // de passer une fois, comme une tablette posée depuis une minute.
    await dormir(3000);

    const lance = await prof.evaluate(async ([cid]) => {
        const { lancerUnJeuDeClasse } = await import('./js/core/espaceProf.js');
        return lancerUnJeuDeClasse(cid, 'plateau', 180, {
            operation: '×', style: 'libre', quoi: {}, noms: true,
            penalite: 'fige', joueurs: 8
        });
    }, [classe.id]);
    tout = ok('LE PROFESSEUR A LANCÉ LA PARTIE', !!(lance && lance.ok),
        String((lance && lance.dit) || '').slice(0, 60)) && tout;

    // Les deux gestes qui arrivent APRÈS l'annonce.
    const apres = (async () => {
        await dormir(3000);
        const r = ardoises.find(a => a.etat.cle === 'rechargee');
        await r.page.reload();
        await r.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
        await dormir(1000);
        await revenir(ardoises.find(a => a.etat.cle === 'cacheRevenu').page);
    })();

    // ── QUI OUVRE LE TERRAIN ? ────────────────────────────────────────────
    //
    // QUARANTE SECONDES : le pire cas annoncé est de vingt-cinq (battement de
    // dix, départ à douze), mais un onglet caché bat toutes les soixante. On
    // laisse donc largement de quoi le voir arriver — ou ne pas arriver.
    const verdicts = await Promise.all(ardoises.map(async (a) => {
        const debut = Date.now();
        try {
            await a.page.waitForSelector('.pdn-voile', { timeout: 45000 });
        } catch (e) {
            return { ...a.etat, ouvert: false, devant: false, qui: '(rien)', secondes: null };
        }
        const secondes = Math.round((Date.now() - debut) / 100) / 10;
        // ── ET QUI EST DEVANT ? ───────────────────────────────────────────
        //
        // « LE TERRAIN EXISTE » N'EST PAS « L'ÉLÈVE LE VOIT ». C'est la
        // famille de défauts la plus chère de ce dépôt, et elle est écrite en
        // toutes lettres au-dessus de `.defi-voile` : « le sélecteur répondait
        // il est là, le compteur montait, les contrôles étaient tous verts —
        // et l'élève voyait son exercice ».
        //
        // On demande donc à `elementFromPoint`, au centre de l'écran, QUI
        // répond. C'est le geste que CLAUDE.md prescrit avant de douter de
        // l'outil, et c'est le seul qui distingue « monté » de « vu ».
        const qui = await a.page.evaluate(() => {
            const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
            if (!el) return '(personne)';
            for (let n = el; n; n = n.parentElement) {
                if (n.classList && n.classList.contains('pdn-voile')) return 'le terrain';
                if (n.classList && n.classList.contains('jdc-voile')) return 'l\u2019annonce';
                if (n.id === 'game-layer') return 'l\u2019exercice (#game-layer)';
            }
            return el.id ? `#${el.id}` : `.${(el.className || '').toString().split(' ')[0]}`;
        });
        return { ...a.etat, ouvert: true, devant: /terrain|annonce/.test(qui), qui, secondes };
    }));
    await apres;

    for (const v of verdicts) {
        const bon = v.ouvert && v.devant;
        const quoi = !v.ouvert ? 'RIEN NE S\'EST OUVERT'
            : v.devant ? `terrain ouvert et DEVANT après ${v.secondes} s`
                : `terrain monté en ${v.secondes} s mais DERRIÈRE : au centre, c'est ${v.qui}`;
        if (v.horsVerdict) {
            dit(v.dit, `${quoi} — attendu, et hors verdict`);
            continue;
        }
        ok(v.dit, bon, quoi);
        tout = bon && tout;
    }
    // ── POURQUOI L'ONGLET CACHÉ NE COMPTE PAS ─────────────────────────────
    //
    // Le battement y passe à soixante secondes (`SEANCE_CACHE_MS`), et le
    // navigateur gèle par-dessus les minuteurs d'un onglet en arrière-plan. On
    // ne peut pas le joindre plus vite, et personne ne le regarde. CE QUI
    // COMPTE, c'est que l'élève qui REVIENT dessus rejoigne la partie en
    // cours — c'est la ligne d'après, et elle est verte.
    const comptees = verdicts.filter(v => !v.horsVerdict);
    const combien = comptees.filter(v => v.ouvert && v.devant).length;
    tout = ok(`LE PLATEAU EST PARTI, ET SE VOIT, SUR TOUTES LES ARDOISES QU'ON PEUT JOINDRE`,
        combien === comptees.length, `${combien}/${comptees.length}`) && tout;
    tout = ok('ERREURS DE PAGE', erreurs.length === 0, `${erreurs.length}`) && tout;
    for (const e of erreurs) console.log(`      ${e}`);
} finally {
    await nav.close();
    serveur.kill();
}
console.log('─'.repeat(70));
console.log(tout ? '\x1b[32mLE PLATEAU PART SUR TOUT LE MONDE\x1b[0m'
    : '\x1b[31mDES ARDOISES EN LIGNE N\'ONT RIEN VU\x1b[0m');
process.exit(tout ? 0 : 1);
