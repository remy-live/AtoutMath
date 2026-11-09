// LE PLATEAU DES NOMBRES, JOUÉ PAR PLUSIEURS VRAIS NAVIGATEURS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//     node tools/plateauEnClasse.mjs [combien d'élèves]
//
// RÉMY : « Fais tout ». Le plateau se jouait dans un seul navigateur, contre
// des pions de l'ordinateur. Cette sonde est la seule qui puisse dire s'il se
// joue À PLUSIEURS, parce qu'elle est la seule à emprunter le chemin de
// l'élève : un navigateur par ardoise, le doigt posé sur le terrain, et le
// serveur entre les deux.
//
// ── CE QU'AUCUNE AUTRE MESURE DU DÉPÔT NE POUVAIT DIRE ────────────────────
//
// `tools/plateauEnTempsReel.mjs` tape sur la route `/jeu` à trente ardoises :
// il dit que le SERVEUR tient, et il l'a dit (30 requêtes/s, médiane 28 ms,
// 81 prises pour 81 distinctes). Il ne dit RIEN de l'écran — il n'en ouvre
// aucun. `tools/plateauQuiJoue.mjs` ouvre l'écran, mais seul, en démonstration.
//
// ENTRE LES DEUX IL Y A LA SEULE QUESTION QUI COMPTE : les trente voient-elles
// LE MÊME TERRAIN ? Un nombre qui réapparaît ailleurs chez l'un et pas chez
// l'autre ne se voit sur aucune des deux autres mesures, et c'est pourtant le
// défaut qui tue le jeu : un élève court vers un nombre que personne ne voit.
//
// ── CE QU'ELLE GARDE ──────────────────────────────────────────────────────
//
//   1. L'annonce arrive sur toutes les ardoises, et le terrain s'ouvre seul.
//   2. Chacune voit TOUS les autres ronds, et les deux équipes.
//   3. LES TERRAINS SONT IDENTIQUES, carré par carré, valeur par valeur.
//   4. Une prise faite par deux élèves s'éteint sur TOUTES les ardoises, et le
//      serveur ne la compte QU'UNE FOIS.
//   5. Aucune fenêtre native, aucune erreur de page.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';

const COMBIEN = Math.max(2, Math.min(8, Number(process.argv[2]) || 3));

let ratés = 0;
const ok = (q, bon, d = '') => {
    if (!bon) ratés++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};
const dit = (q, d) => console.log(`  \x1b[2m·\x1b[0m ${q} \x1b[2m— ${d}\x1b[0m`);

// ── LE SITE D'ESSAI ───────────────────────────────────────────────────────
const PORT = String(8600 + Math.floor(Math.random() * 300));
const serveur = spawn('php', ['tools/siteEssai.php', PORT],
    { stdio: ['ignore', 'pipe', 'pipe'] });
let info = null;
await new Promise((pret, rate) => {
    const minuteur = setTimeout(() => rate(new Error('le site d\'essai n\'a pas démarré')), 30000);
    serveur.stdout.on('data', (d) => {
        const t = String(d);
        if (!t.includes('"port"')) return;
        clearTimeout(minuteur);
        try { info = JSON.parse(t.trim().split('\n').pop()); } catch (e) { /* plus bas */ }
        pret();
    });
    serveur.on('error', rate);
});
const BASE = `http://127.0.0.1:${PORT}`;

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const erreurs = [];
const fenetres = [];

/** Une page prête, qui note ses erreurs et refuse les fenêtres natives. */
async function ouvrirUnePage(qui) {
    const page = await nav.newPage({ viewport: { width: 1100, height: 820 } });
    page.on('pageerror', e => erreurs.push(`${qui}: ${String(e).slice(0, 170)}`));
    page.on('dialog', async (d) => {
        fenetres.push(`${qui}: ${d.type()} ${d.message().slice(0, 60)}`);
        await d.dismiss();
    });
    await page.goto(`${BASE}/index.html`);
    await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    return page;
}

try {
    console.log(`\nLE PLATEAU À ${COMBIEN} VRAIS NAVIGATEURS`);
    console.log('─'.repeat(70));

    // ── LE PROFESSEUR MONTE SA CLASSE ─────────────────────────────────────
    const prof = await ouvrirUnePage('prof');
    await prof.evaluate(async ([e, m]) => {
        const { identifierProf } = await import('./js/core/verrouProf.js');
        await identifierProf(e, m);
    }, [info.email, info.mdp]);
    await prof.reload();
    await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

    const noms = Array.from({ length: COMBIEN }, (_, i) => `Eleve${i + 1} Plateau`);
    const classe = await prof.evaluate(async (liste) => {
        const { creerClasse, apercuDeListe, importerListe, listeDeClasse } =
            await import('./js/core/espaceProf.js');
        const c = await creerClasse('6B', '6e');
        const ap = await apercuDeListe(c.id, liste.join('\n') + '\n', '');
        await importerListe(c.id, ap.apercu.texte);
        const l = await listeDeClasse(c.id);
        return { id: c.id, eleves: (l.eleves || [])
            .map(e => ({ login: e.login, code: e.code, prenom: e.prenom })) };
    }, noms);
    ok(`LA CLASSE EST MONTÉE AVEC SES ${COMBIEN} ÉLÈVES`,
        classe.eleves.length === COMBIEN, `${classe.eleves.length} élève(s)`);

    // ── LES ARDOISES ENTRENT ──────────────────────────────────────────────
    const ardoises = [];
    for (const e of classe.eleves) {
        const page = await ouvrirUnePage(e.login);
        await page.evaluate(async ({ e, base }) => {
            const { loginEleve } = await import('./js/core/sync.js');
            await loginEleve({ apiUrl: base + '/api', login: e.login, code: e.code });
        }, { e, base: BASE });
        await page.reload();
        await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
        ardoises.push({ page, nom: e.prenom, login: e.login });
    }
    ok('TOUTES LES ARDOISES SONT ENTRÉES', ardoises.length === COMBIEN);

    // ── LE PROFESSEUR LANCE LE PLATEAU À LA CLASSE ────────────────────────
    //
    // ON PASSE PAR `lancerUnJeuDeClasse`, la fonction que le bouton appelle, et
    // non par la route : c'est le chemin du professeur, et il porte les
    // réglages dans la forme où l'ardoise les attend.
    //
    // STYLE « LIBREMENT » : c'est le seul où la sonde peut CHOISIR le nombre
    // qu'elle porte, donc le seul où elle peut fabriquer une vraie prise. En
    // « répondant », il faudrait résoudre la question posée à l'écran — ce
    // serait mesurer la question, pas le réseau.
    const lance = await prof.evaluate(async ([cid]) => {
        const { lancerUnJeuDeClasse } = await import('./js/core/espaceProf.js');
        return lancerUnJeuDeClasse(cid, 'plateau', 180, {
            operation: '×', style: 'libre', quoi: {}, noms: true,
            penalite: 'fige', joueurs: 8
        });
    }, [classe.id]);
    ok('LE SERVEUR A ANNONCÉ LA PARTIE', !!(lance && lance.ok),
        JSON.stringify(lance && (lance.dit || lance.erreur || '')).slice(0, 70));

    // ── L'ANNONCE ARRIVE SUR LES ARDOISES ─────────────────────────────────
    //
    // ON ATTEND JUSQU'À VINGT-CINQ SECONDES, et ce n'est pas de la patience :
    // l'ardoise n'apprend la partie qu'à SON battement de séance, qui passe
    // toutes les dix secondes, et le serveur annonce le départ douze secondes
    // plus tard. Vingt-cinq est le pire cas, plus une marge.
    let annonces = 0;
    for (const a of ardoises) {
        try {
            await a.page.waitForSelector('.jdc-voile', { timeout: 25000 });
            annonces++;
        } catch (e) { /* compté plus bas */ }
    }
    ok('L\'ANNONCE S\'EST AFFICHÉE SUR CHAQUE ARDOISE', annonces === COMBIEN,
        `${annonces}/${COMBIEN}`);

    let ouverts = 0;
    for (const a of ardoises) {
        try {
            await a.page.waitForSelector('.pdn-voile', { timeout: 25000 });
            ouverts++;
        } catch (e) { /* compté plus bas */ }
    }
    ok('LE TERRAIN S\'EST OUVERT TOUT SEUL SUR CHAQUE ARDOISE', ouverts === COMBIEN,
        `${ouverts}/${COMBIEN}`);
    if (ouverts !== COMBIEN) throw new Error('le terrain ne s\'ouvre pas : rien à mesurer après');

    // DEUX BATTEMENTS, le temps que chacun ait vu les autres.
    await dormir(2600);

    /** Ce qu'une ardoise voit : les ronds, les carrés vivants, les scores. */
    const ceQuElleVoit = (page) => page.evaluate(() => {
        const pions = [...document.querySelectorAll('.pdn-pion')].map(d => ({
            equipe: d.className.includes('pdn-pion--1') ? 1 : 0,
            moi: d.className.includes('pdn-pion--moi'),
            nombre: (d.querySelector('[data-nb]') || {}).textContent || ''
        }));
        const cibles = [...document.querySelectorAll('.pdn-case--cible')].map(c =>
            `${c.dataset.x}:${c.dataset.y}:${(c.querySelector('.pdn-valeur') || {}).textContent}`);
        const lu = (s) => ((document.querySelector(s) || {}).textContent || '').trim();
        return { pions, cibles: cibles.sort(),
                 score0: lu('[data-score0]'), score1: lu('[data-score1]'),
                 reste: lu('[data-reste]') };
    });

    const vues = [];
    for (const a of ardoises) vues.push(await ceQuElleVoit(a.page));

    ok('CHAQUE ARDOISE VOIT TOUS LES RONDS',
        vues.every(v => v.pions.length === COMBIEN),
        vues.map(v => v.pions.length).join(' / '));
    ok('CHAQUE ARDOISE SE RECONNAÎT, UNE FOIS ET UNE SEULE',
        vues.every(v => v.pions.filter(p => p.moi).length === 1));
    // LES DEUX ÉQUIPES : le serveur prend une ligne sur deux dans l'ordre des
    // identifiants. À deux élèves ou plus, il y a donc forcément les deux.
    ok('LE SERVEUR A BIEN PARTAGÉ LA CLASSE EN DEUX ÉQUIPES',
        vues.every(v => new Set(v.pions.map(p => p.equipe)).size === 2),
        vues.map(v => `${v.pions.filter(p => p.equipe === 0).length}·${
            v.pions.filter(p => p.equipe === 1).length}`).join(' / '));

    // ── LA MESURE QUI N'EXISTAIT PAS : LE MÊME TERRAIN POUR TOUS ──────────
    const premier = vues[0].cibles.join('|');
    const pareils = vues.every(v => v.cibles.join('|') === premier);
    ok('LES TERRAINS SONT IDENTIQUES, CARRÉ PAR CARRÉ', pareils,
        `${vues[0].cibles.length} carré(s)`);
    if (!pareils) {
        for (let i = 0; i < vues.length; i++) {
            dit(`ardoise ${i + 1}`, vues[i].cibles.slice(0, 8).join(' '));
        }
    }

    // ── UNE VRAIE PRISE, FAITE PAR DEUX ÉLÈVES ────────────────────────────
    //
    // ON CHOISIT UN CARRÉ QUE DEUX NOMBRES DE 2 À 9 PEUVENT PRENDRE, on fait
    // porter l'un à la première ardoise et l'autre à la deuxième, et on pose le
    // doigt sur le carré. Le doigt s'arrête tout seul en arrivant dessus
    // (`voulu()` ne pousse plus sous un cinquième de case) : c'est la seule
    // conduite assez précise pour viser une case depuis une sonde, et c'est
    // aussi celle de l'élève sur sa tablette.
    const cible = await ardoises[0].page.evaluate(() => {
        for (const c of document.querySelectorAll('.pdn-case--cible')) {
            const v = Number((c.querySelector('.pdn-valeur') || {}).textContent);
            for (let a = 2; a <= 9; a++) {
                if (v % a || v / a < 2 || v / a > 9) continue;
                const r = c.getBoundingClientRect();
                return { v, a, b: v / a,
                         x: Math.round(r.left + r.width / 2),
                         y: Math.round(r.top + r.height / 2),
                         cx: c.dataset.x, cy: c.dataset.y };
            }
        }
        return null;
    });
    ok('UN CARRÉ PRENABLE À DEUX A ÉTÉ TROUVÉ', !!cible,
        cible ? `${cible.v} = ${cible.a} × ${cible.b} en (${cible.cx}, ${cible.cy})` : '');

    if (cible) {
        // LES DEUX ARDOISES PORTENT LES BONS NOMBRES. Le clavier des nombres
        // est le vrai : c'est le bouton que l'élève touche.
        for (const [i, n] of [[0, cible.a], [1, cible.b]]) {
            await ardoises[i].page.click(`[data-devenir-nb="${n}"]`);
        }
        const portes = [];
        for (const [i, n] of [[0, cible.a], [1, cible.b]]) {
            portes.push(await ardoises[i].page.evaluate(() =>
                ((document.querySelector('[data-monnombre]') || {}).textContent || '').trim()));
        }
        ok('LES DEUX ARDOISES PORTENT LES NOMBRES VOULUS',
            portes[0] === String(cible.a) && portes[1] === String(cible.b),
            `${portes[0]} et ${portes[1]} pour ${cible.a} et ${cible.b}`);
        // ET LA MÊME CASE, VISÉE PAR LES DEUX. Les deux doigts se posent dans
        // la même seconde : c'est la situation que le serveur doit arbitrer.
        const viser = async (a) => {
            const p = a.page;
            await p.mouse.move(cible.x, cible.y);
            await p.mouse.down();
            // CINQ SECONDES, ET LE CHIFFRE EST MESURÉ : le rond va au doigt à
            // 3,4 cases par seconde, et il peut démarrer à l'autre bout d'un
            // terrain de dix-huit cases. À deux secondes, la sonde relâchait
            // le doigt avant l'arrivée — et c'est MOI qu'elle mesurait, pas le
            // logiciel. On garde le doigt posé une seconde de plus que le pire
            // trajet, pour que les deux ronds soient immobiles ENSEMBLE.
            await dormir(5000);
            await p.mouse.up();
        };
        await Promise.all([viser(ardoises[0]), viser(ardoises[1])]);
        // DEUX BATTEMENTS POUR QUE LA RÉPONSE DU SERVEUR REVIENNE PARTOUT.
        await dormir(2600);

        const apres = [];
        for (const a of ardoises) apres.push(await ceQuElleVoit(a.page));
        const marque = `${cible.cx}:${cible.cy}:${cible.v}`;
        // OÙ LES DEUX RONDS SONT ARRIVÉS, dit par celui qui conduit. Sans ce
        // relevé, « la prise n'a pas eu lieu » ne dit pas si c'est le réseau,
        // la règle, ou la sonde qui a mal visé — et l'on cherche trois fois.
        for (const [i, a] of ardoises.slice(0, 2).entries()) {
            dit(`ardoise ${i + 1}`, await a.page.evaluate(() => {
                const d = document.querySelector('.pdn-pion--moi');
                const t = document.querySelector('[data-terrain]');
                return d && t ? `rond en ${d.style.left} / ${d.style.top}, porte `
                    + `${(d.querySelector('[data-nb]') || {}).textContent}, `
                    + `l'écran dit « ${((document.querySelector('[data-dit]') || {})
                        .textContent || '').trim().slice(0, 48)} »` : 'rond introuvable';
            }));
        }
        ok('LE CARRÉ PRIS S\'EST ÉTEINT SUR TOUTES LES ARDOISES',
            apres.every(v => !v.cibles.includes(marque)),
            apres.map(v => v.cibles.includes(marque) ? 'encore là' : 'éteint').join(' / '));
        ok('ET LES TERRAINS SONT TOUJOURS IDENTIQUES APRÈS LA PRISE',
            apres.every(v => v.cibles.join('|') === apres[0].cibles.join('|')),
            `${apres[0].cibles.length} carré(s)`);
        const total = (v) => Number(v.score0) + Number(v.score1);
        ok('LES SCORES SONT LES MÊMES PARTOUT',
            apres.every(v => v.score0 === apres[0].score0 && v.score1 === apres[0].score1),
            apres.map(v => `${v.score0}-${v.score1}`).join(' / '));
        ok('LA PRISE A RAPPORTÉ DES POINTS', total(apres[0]) > 0,
            `${apres[0].score0} à ${apres[0].score1}`);

        // ── ET LE SERVEUR NE L'A COMPTÉE QU'UNE FOIS ──────────────────────
        //
        // C'EST LE CŒUR DE L'AFFAIRE. Les deux ardoises réclament le même
        // nombre dans la même seconde — chacune voit l'autre sur le carré — et
        // c'est l'index d'unicité de `jeu_prises` qui doit trancher. Deux
        // lignes au serveur, et la classe verrait les points comptés deux fois.
        const vuDuProf = await prof.evaluate(async ([cid]) => {
            const { leDirect } = await import('./js/core/espaceProf.js');
            const d = await leDirect(cid);
            return (d && d.jeu) || null;
        }, [classe.id]);
        ok('LE SERVEUR N\'A COMPTÉ QU\'UNE SEULE PRISE',
            !!vuDuProf && vuDuProf.prises === 1,
            vuDuProf ? `${vuDuProf.prises} prise(s), ${vuDuProf.joueurs} joueur(s), `
                + `${(vuDuProf.scores || []).join(' à ')}` : 'le direct ne dit rien du jeu');
    }

    // ── CE QUE LE PROFESSEUR VOIT, ET LE BOUTON QUI ARRÊTE ────────────────
    const arret = await prof.evaluate(async ([cid]) => {
        const { lancerUnJeuDeClasse, leDirect } = await import('./js/core/espaceProf.js');
        const r = await lancerUnJeuDeClasse(cid, 'plateau', 0);
        const d = await leDirect(cid);
        return { r, jeu: (d && d.jeu) || null };
    }, [classe.id]);
    ok('LE PROFESSEUR PEUT ARRÊTER LA PARTIE',
        !!(arret.r && arret.r.ok) && !arret.jeu,
        arret.jeu ? 'le jeu tourne encore' : (arret.r.dit || ''));

    // ET LES ARDOISES SE REFERMENT SUR SON ORDRE : la partie finit chez l'élève
    // parce que le serveur ne rend plus de jeu, et non parce que son minuteur
    // est tombé. C'est ce qui permet au professeur de reprendre la main.
    await dormir(2600);
    let finis = 0;
    for (const a of ardoises) {
        const fin = await a.page.evaluate(() =>
            !!document.querySelector('.pdn-dit--fin'));
        if (fin) finis++;
    }
    ok('LES ARDOISES ONT FINI SUR L\'ORDRE DU SERVEUR', finis === COMBIEN,
        `${finis}/${COMBIEN}`);

    ok('FENÊTRES NATIVES ET ERREURS DE PAGE : 0',
        !fenetres.length && !erreurs.length,
        `${fenetres.length} fenêtre(s), ${erreurs.length} erreur(s)`);
    for (const e of erreurs.slice(0, 6)) dit('erreur', e);
    for (const f of fenetres.slice(0, 6)) dit('fenêtre', f);
} catch (e) {
    ratés++;
    console.log(`\n\x1b[31m✗ la sonde s'est arrêtée\x1b[0m — ${e.message}`);
} finally {
    try { await nav.close(); } catch (e) { /* déjà parti */ }
    try { serveur.kill(); } catch (e) { /* déjà parti */ }
}

console.log('─'.repeat(70));
console.log(ratés ? `\x1b[31m${ratés} point(s) à reprendre\x1b[0m`
                  : '\x1b[32mLE PLATEAU SE JOUE À PLUSIEURS\x1b[0m');
process.exit(ratés ? 1 : 0);
