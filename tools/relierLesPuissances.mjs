// RELIER 10² À 100 — on le JOUE, on ne le regarde pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//     node tools/relierLesPuissances.mjs
//
// RÉMY : « J'aimerai bien un jeu où on relie 10² à 100, 10⁻³ à 0,001, etc ».
//
// ── CE QUE LES ÉPREUVES DE `npm test` NE PEUVENT PAS DIRE ─────────────────
//
// Que les paires sont justes, `tests/pairesPuissances.test.mjs` le dit en
// trois millisecondes, et c'est le bon endroit pour le dire. Ce qu'il ne peut
// pas dire, c'est si LE TRAIT ARRIVE SUR LA CARTE : le dessin se fait aux
// coordonnées réelles, dans le repère du cadre, et une erreur de repère donne
// un trait qui part à côté sans qu'aucune règle de mathématiques soit fausse.
//
// On joue donc une partie entière : on touche les cartes deux par deux, on
// vérifie qu'un trait apparaît ENTRE ELLES, et qu'un trait faux s'efface.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ratés = 0;
const ok = (q, bon, d = '') => {
    if (!bon) ratés++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};
const dit = (q, d) => console.log(`  \x1b[2m·\x1b[0m ${q} \x1b[2m— ${d}\x1b[0m`);

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
try {
    console.log('\nRELIER LES PUISSANCES DE 10');
    console.log('─'.repeat(70));
    await s.identifier();
    const raté = await s.ouvrirExercice('num-puissances-relier');
    if (raté) throw new Error(raté);
    await dormir(1400);

    await s.doitExister('.pa-carte', 'les cartes à relier');
    await s.doitExister('.pa-traits', 'la surcouche des traits');

    const depart = await s.page.evaluate(() => ({
        gauche: [...document.querySelectorAll('.pa-carte[data-cote="g"]')].map(e => e.textContent),
        droite: [...document.querySelectorAll('.pa-carte[data-cote="d"]')].map(e => e.textContent),
        compte: (document.querySelector('[data-faits]') || {}).textContent
    }));
    ok('SIX PAIRES SONT POSÉES, EN DEUX COLONNES',
        depart.gauche.length === 6 && depart.droite.length === 6,
        `${depart.gauche.length} à gauche, ${depart.droite.length} à droite`);
    dit('à gauche', depart.gauche.join(' · '));
    dit('à droite', depart.droite.join(' · '));
    // LES DEUX COLONNES SONT MÉLANGÉES SÉPARÉMENT : sans cela, la première
    // carte de gauche répondrait à la première de droite, et le jeu se ferait
    // en diagonale sans rien lire.
    const enFace = await s.page.evaluate(() => {
        const g = [...document.querySelectorAll('.pa-carte[data-cote="g"]')].map(e => e.dataset.rang);
        const d = [...document.querySelectorAll('.pa-carte[data-cote="d"]')].map(e => e.dataset.rang);
        return g.filter((r, i) => r === d[i]).length;
    });
    ok('LES DEUX COLONNES NE SE RÉPONDENT PAS LIGNE À LIGNE', enFace < 6,
        `${enFace} carte(s) sur 6 en face de leur paire`);

    // ── UNE PAIRE FAUSSE : le trait se voit, puis s'efface ────────────────
    const faux = await s.page.evaluate(() => {
        const g = document.querySelector('.pa-carte[data-cote="g"]');
        const d = [...document.querySelectorAll('.pa-carte[data-cote="d"]')]
            .find(e => e.dataset.rang !== g.dataset.rang);
        g.click(); d.click();
        return {
            traits: document.querySelectorAll('.pa-trait--faux').length,
            dit: (document.querySelector('[data-dit]') || {}).className
        };
    });
    ok('UN TRAIT FAUX SE TRACE, EN ROUGE', faux.traits === 1,
        `${faux.traits} trait(s) · ${faux.dit}`);
    ok('ET L\'ÉCRAN DIT POURQUOI', /pa-dit--ko/.test(faux.dit || ''), faux.dit);
    await dormir(1200);
    const apresFaux = await s.page.evaluate(() => ({
        traits: document.querySelectorAll('.pa-trait--faux').length,
        reliees: document.querySelectorAll('.pa-carte--relie').length
    }));
    ok('PUIS IL S\'EFFACE, SANS RIEN RELIER',
        apresFaux.traits === 0 && apresFaux.reliees === 0,
        `${apresFaux.traits} trait(s), ${apresFaux.reliees} carte(s) reliée(s)`);

    // ── LA PARTIE ENTIÈRE, PAIRE PAR PAIRE ───────────────────────────────
    for (let rang = 0; rang < 6; rang++) {
        await s.page.evaluate((r) => {
            document.querySelector(`.pa-carte[data-cote="g"][data-rang="${r}"]`).click();
            document.querySelector(`.pa-carte[data-cote="d"][data-rang="${r}"]`).click();
        }, rang);
        await dormir(140);
    }
    const fin = await s.page.evaluate(() => {
        const cadre = document.querySelector('.pa-jeu').getBoundingClientRect();
        // CHAQUE TRAIT DOIT TOUCHER SES DEUX CARTES. C'est la seule mesure que
        // seul un navigateur peut faire : un repère faux donne un trait qui
        // part à côté, sans qu'aucune mathématique soit fausse.
        let bons = 0;
        for (const l of document.querySelectorAll('.pa-trait--juste')) {
            const r = l.dataset.rang;
            const a = document.querySelector(`.pa-carte[data-cote="g"][data-rang="${r}"]`)
                .getBoundingClientRect();
            const b = document.querySelector(`.pa-carte[data-cote="d"][data-rang="${r}"]`)
                .getBoundingClientRect();
            const x1 = Number(l.getAttribute('x1')) + cadre.left;
            const y1 = Number(l.getAttribute('y1')) + cadre.top;
            const x2 = Number(l.getAttribute('x2')) + cadre.left;
            const y2 = Number(l.getAttribute('y2')) + cadre.top;
            const dedans = (x, y, q) => x >= q.left - 2 && x <= q.right + 2
                && y >= q.top - 2 && y <= q.bottom + 2;
            if (dedans(x1, y1, a) && dedans(x2, y2, b)) bons++;
        }
        return {
            traits: document.querySelectorAll('.pa-trait--juste').length,
            bons,
            reliees: document.querySelectorAll('.pa-carte--relie').length,
            compte: (document.querySelector('[data-faits]') || {}).textContent,
            pret: !!document.querySelector('.pa-neuf--pret')
        };
    });
    ok('LES SIX PAIRES SE RELIENT', fin.reliees === 12 && fin.compte === '6',
        `${fin.reliees} carte(s) reliée(s), compteur à ${fin.compte}`);
    ok('ET CHAQUE TRAIT TOUCHE SES DEUX CARTES', fin.bons === 6 && fin.traits === 6,
        `${fin.bons} trait(s) juste(s) sur ${fin.traits}`);
    ok('LE TABLEAU FINI PROPOSE D\'EN REFAIRE UN', fin.pret);

    await s.photo('.pa-cadre', 'tools/tmp/relier-puissances.png');

    // ── ET LES TRAITS SUIVENT LES CARTES QUAND L'ÉCRAN CHANGE ────────────
    //
    // Une tablette qu'on tourne d'un quart de tour garde ses traits là où les
    // cartes ÉTAIENT. On vérifie donc après un vrai redimensionnement.
    await s.page.setViewportSize({ width: 900, height: 820 });
    await dormir(600);
    const apres = await s.page.evaluate(() => {
        const cadre = document.querySelector('.pa-jeu').getBoundingClientRect();
        let bons = 0;
        for (const l of document.querySelectorAll('.pa-trait--juste')) {
            const r = l.dataset.rang;
            const a = document.querySelector(`.pa-carte[data-cote="g"][data-rang="${r}"]`)
                .getBoundingClientRect();
            const x1 = Number(l.getAttribute('x1')) + cadre.left;
            const y1 = Number(l.getAttribute('y1')) + cadre.top;
            if (x1 >= a.left - 2 && x1 <= a.right + 2 && y1 >= a.top - 2 && y1 <= a.bottom + 2) bons++;
        }
        return { traits: document.querySelectorAll('.pa-trait--juste').length, bons };
    });
    ok('APRÈS UN REDIMENSIONNEMENT, LES TRAITS SUIVENT',
        apres.bons === apres.traits && apres.traits === 6,
        `${apres.bons} trait(s) encore accroché(s) sur ${apres.traits}`);

    ok('FENÊTRES NATIVES ET ERREURS DE PAGE : 0',
        !s.fenetresNatives.length && !s.erreurs.length,
        `${s.fenetresNatives.length} fenêtre(s), ${s.erreurs.length} erreur(s)`);
    for (const e of s.erreurs.slice(0, 5)) dit('erreur', String(e).slice(0, 150));
} catch (e) {
    ratés++;
    console.log(`\n\x1b[31m✗ la sonde s'est arrêtée\x1b[0m — ${e.message}`);
} finally {
    await s.fermer();
}

console.log('─'.repeat(70));
console.log(ratés ? `\x1b[31m${ratés} point(s) à reprendre\x1b[0m`
                  : '\x1b[32mON RELIE 10² À 100\x1b[0m');
process.exit(ratés ? 1 : 0);
