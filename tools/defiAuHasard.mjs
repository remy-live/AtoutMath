// CLIQUER N'IMPORTE QUOI NE DOIT PLUS PAYER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'ai un élève qui a cliqué n'importe quoi en qcm et aue plein de
// point, il faudrait faire qqch ». Puis, en proposant lui-même les leviers :
// « on peut mettre une option enelevr des points ou bloquer si trop de mauvais
// réponses ou mettre plus de case dans le qcm ». Il a choisi le premier.
//
// ── L'ARITHMÉTIQUE DU MARTELEUR ───────────────────────────────────────────
//
// Quatre propositions, une chance sur quatre, et la seule limite au nombre de
// questions était la VITESSE DU DOIGT. Un élève qui réfléchit fait dix
// questions en une minute et en réussit neuf ; un élève qui martèle en fait
// soixante et en réussit quinze. Il gagnait, et il avait RAISON de
// recommencer — c'est le logiciel qui lui avait appris que c'était payant.
//
// À une faute = une bonne réponse, le hasard rapporte en moyenne
// (1/4 × 1) − (3/4 × 1) = −0,5 point par clic.
//
// ── CE QUE CETTE SONDE MESURE, ET CE QU'AUCUNE ÉPREUVE NE DIRAIT ─────────
//
// Le barème traverse QUATRE maisons : l'écran du professeur, la route du
// serveur, la colonne de la base, et le compteur de l'élève. Une épreuve de
// source dirait que chacune porte le mot « malus » ; elle ne dirait pas que le
// nombre arrive jusqu'au bout. C'est exactement le défaut qui a coûté le plus
// cher à ce dépôt — cinq colonnes `jeu_*` absentes d'un SELECT, et aucune
// ardoise n'apprenait la partie pendant que tout le reste était vert.
//
// On joue donc une vraie classe : le professeur lance un défi avec la
// pénalité, l'élève clique la PREMIÈRE proposition à chaque fois — ce que fait
// le marteleur —, et l'on regarde son score.
//
//     node tools/defiAuHasard.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';

const ok = (q, bon, d = '') => {
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}`
        + (d ? ` \x1b[2m— ${d}\x1b[0m` : ''));
    return bon;
};

const PORT = String(9500 + Math.floor(Math.random() * 200));
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
    p.on('dialog', async d => { erreurs.push(`${qui}: fenêtre native`); await d.dismiss(); });
    await p.goto(`${BASE}/index.html`);
    await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    return p;
};

/**
 * UNE MINUTE DE MARTEAU : on clique la PREMIÈRE proposition, toujours.
 *
 * C'est le geste exact du marteleur, et il a l'avantage d'être reproductible —
 * une sonde qui tirerait au hasard rendrait un score différent à chaque essai,
 * et l'on ne saurait jamais si c'est le barème ou la chance qui a changé.
 */
async function marteler(eleve, combien) {
    let clics = 0;
    for (let i = 0; i < combien; i++) {
        const prise = await eleve.evaluate(() => {
            const b = document.querySelector('.defi-reponses button, .defi-reponses .defi-rep');
            if (!b) return false;
            b.click();
            return true;
        });
        if (prise) clics += 1;
        await dormir(330);
    }
    return clics;
}

try {
    console.log('\nLE DÉFI, MARTELÉ AU HASARD');
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
        const c = await creerClasse('4C', '4e');
        const ap = await apercuDeListe(c.id, 'Marteau Hasard\n', '');
        await importerListe(c.id, ap.apercu.texte);
        const l = await listeDeClasse(c.id);
        return { id: c.id, eleve: (l.eleves || [])[0] };
    });

    const eleve = await page('eleve');
    await eleve.evaluate(async ({ e, base }) => {
        const { loginEleve } = await import('./js/core/sync.js');
        await loginEleve({ apiUrl: base + '/api', login: e.login, code: e.code });
    }, { e: classe.eleve, base: BASE });
    await eleve.reload();
    await eleve.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

    // ── DEUX DÉFIS, LE MÊME GESTE, DEUX BARÈMES ──────────────────────────
    const scores = {};
    for (const malus of [0, 1]) {
        const lance = await prof.evaluate(async ([cid, m]) => {
            const { lancerLeDefi } = await import('./js/core/espaceProf.js');
            return lancerLeDefi(cid, 'calc-add', 45, 'qcm', { malus: m });
        }, [classe.id, malus]);
        tout = ok(`le professeur lance un défi, faute = −${malus}`, !!(lance && lance.ok),
            String((lance && lance.dit) || (lance && lance.erreur) || '').slice(0, 54)) && tout;

        // L'ANNONCE PASSE PAR LE BATTEMENT : douze secondes, plus la marge.
        try {
            await eleve.waitForSelector('.defi-reponses button, .defi-reponses .defi-rep',
                { timeout: 40000 });
        } catch (e) {
            tout = ok(`le défi s'ouvre sur l'ardoise (−${malus})`, false, 'aucune proposition');
            break;
        }
        const clics = await marteler(eleve, 26);
        const vu = await eleve.evaluate(() => ({
            affiche: (document.querySelector('[data-bonnes]')?.textContent || '').trim(),
            unite: (document.querySelector('.defi-score')?.textContent || '').trim()
        }));
        scores[malus] = { clics, ...vu };
        console.log(`    −${malus} : ${clics} clic(s) au hasard → l'écran dit « ${vu.unite} »`);
        // On arrête le défi et l'on attend que l'ardoise range son écran.
        await prof.evaluate(async (cid) => {
            const { lancerLeDefi } = await import('./js/core/espaceProf.js');
            return lancerLeDefi(cid, '', 0);
        }, classe.id);
        await dormir(2500);
    }

    // ── CE QU'ON JUGE ────────────────────────────────────────────────────
    const sans = Number(scores[0]?.affiche);
    const avec = Number(scores[1]?.affiche);
    tout = ok('sans pénalité, marteler rapporte encore', sans > 0,
        `${sans} point(s) pour ${scores[0]?.clics} clic(s)`) && tout;
    tout = ok('AVEC la pénalité, marteler ne rapporte plus', avec < sans,
        `${avec} contre ${sans} — le même geste, le même nombre de clics`) && tout;
    // ET LE COMPTEUR DIT « pts », parce que c'est le score qui CLASSE. Sans
    // cela, l'élève perdrait des places sans qu'aucun chiffre ne bouge sous
    // ses yeux : une règle qu'on ne voit pas s'appliquer ne s'apprend pas.
    tout = ok('et le compteur montre le score qui classe', /pts/.test(scores[1]?.unite || ''),
        `« ${scores[1]?.unite} »`) && tout;
    tout = ok('erreurs de page', erreurs.length === 0, String(erreurs.length)) && tout;
    for (const e of erreurs) console.log(`      ${e}`);
} finally {
    await nav.close();
    serveur.kill();
}
console.log('─'.repeat(70));
console.log(tout ? '\x1b[32mLE HASARD NE PAYE PLUS\x1b[0m'
    : '\x1b[31mLE BARÈME N\'ARRIVE PAS JUSQU\'À L\'ÉLÈVE\x1b[0m');
process.exit(tout ? 0 : 1);
