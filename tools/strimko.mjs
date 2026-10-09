// LE STRIMKO, JOUÉ EN ENTIER, PAR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu me fais le jeu strimko ».
//
// POURQUOI CETTE SONDE EXISTE. Les seize épreuves de `tests/strimko.test.mjs`
// mesurent le GÉNÉRATEUR : qu'une grille soit un carré latin, que les ruisseaux
// soient des chemins, qu'elle ait une seule solution, et surtout qu'elle ne se
// résolve PAS sans les ruisseaux. Elles ne touchent pas à l'écran. Les quatre
// mille épreuves du dépôt étaient vertes, et trois défauts attendaient l'élève :
//
//   · DOUZE ERREURS DE PAGE, une par case tapée. `cleDe` reçoit le CHAMP et non
//     la case, `bloque` ne reçoit RIEN — on y lisait un `dataset`. Rien ne se
//     voyait : la grille se remplissait, elle se validait, et l'erreur partait
//     dans une console où aucun élève ne regarde ;
//   · « VÉRIFIER » SUR UNE GRILLE VIDE répondait « Rien ne se répète pour
//     l'instant » et retirait un des TROIS essais. Vrai, inutile, et payé ;
//   · « VÉRIFIER » SUR UNE GRILLE PLEINE ET JUSTE répondait mot pour mot la
//     même chose, « Continue » comprise. Continuer quoi ?
//
// C'est la phrase de `CLAUDE.md` §3, prise sur le fait : « une mesure qui
// n'emprunte pas le chemin de l'utilisateur ne mesure pas son problème ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QU'ELLE MESURE, ET COMMENT.
//
// LA SOLUTION N'EST PAS DANS LE DOM — et c'est voulu : un élève pourrait la
// lire. La sonde la RECALCULE donc depuis le seul écran : les indices affichés
// et les `data-ruisseau` des cases. Ce détour mesure gratuitement la chose la
// plus importante, que rien d'autre ne mesure : que la grille MONTRÉE soit
// résoluble telle qu'elle est montrée.
//
// LES DEUX SAISIES SONT PARCOURUES, parce qu'elles ne partagent aucun code :
// au clavier chaque case est un `<input>` ; au doigt un appui fait défiler les
// valeurs. Le premier défaut ci-dessus n'existait que dans la première.
//
//   node tools/strimko.mjs [palier]

import { ouvrirSonde } from './sonde.mjs';

const palier = process.argv[2] || 'facile';

/**
 * Le plan de la grille affichée : ce qu'il y a dedans, et la solution
 * recalculée depuis l'écran. `null` renvoyé par le navigateur si la grille
 * montrée n'est pas résoluble — ce qui serait le pire des défauts possibles.
 */
const lirePuisResoudre = (page) => page.evaluate(() => {
    const cases = [...document.querySelectorAll('.st-cell[data-r]')];
    const n = Math.round(Math.sqrt(cases.length));
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    const carte = Array.from({ length: n }, () => Array(n).fill(-1));
    cases.forEach(el => {
        const r = Number(el.dataset.r), c = Number(el.dataset.c);
        carte[r][c] = Number(el.dataset.ruisseau);
        // Une case DONNÉE est un `<span>`, une case à remplir un `<input>` (ou
        // un `<span>` vide au doigt) : on ne lit que ce qui porte un nombre.
        const sp = el.querySelector('span.kk-val');
        if (sp && sp.textContent.trim()) g[r][c] = Number(sp.textContent.trim());
    });
    const fixes = g.map(ligne => ligne.map(v => v !== 0));
    const libre = (r, c, v) => {
        for (let k = 0; k < n; k++) if (g[r][k] === v || g[k][c] === v) return false;
        if (carte[r][c] >= 0) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (carte[i][j] === carte[r][c] && g[i][j] === v) return false;
                }
            }
        }
        return true;
    };
    const resoudre = (i) => {
        if (i === n * n) return true;
        const r = Math.floor(i / n), c = i % n;
        if (fixes[r][c]) return resoudre(i + 1);
        for (let v = 1; v <= n; v++) {
            if (!libre(r, c, v)) continue;
            g[r][c] = v;
            if (resoudre(i + 1)) return true;
            g[r][c] = 0;
        }
        return false;
    };
    if (!resoudre(0)) return null;
    const aRemplir = [];
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) if (!fixes[r][c]) aRemplir.push({ r, c, v: g[r][c] });
    }
    return { n, donnees: fixes.flat().filter(Boolean).length, aRemplir };
});

const dit = (ok, quoi, detail = '') =>
    console.log(`  ${ok ? '\x1b[32mok\x1b[0m  ' : '\x1b[31mNON\x1b[0m '} ${quoi}${detail ? '  — ' + detail : ''}`);

let fautes = 0;
const exige = (ok, quoi, detail) => { if (!ok) fautes++; dit(ok, quoi, detail); };

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });

const statut = () => s.page.evaluate(() =>
    ((document.querySelector('.st-status') || {}).textContent || '').trim());
const essais = () => s.page.evaluate(() =>
    ((document.querySelector('.st-verif-count') || {}).textContent || '?').trim());

/** Une grille entière, par l'une ou l'autre saisie. */
async function uneGrille(auDoigt) {
    const quoi = auDoigt ? 'AU DOIGT' : 'AU CLAVIER';
    console.log(`\n${quoi} — palier « ${palier} »`);
    console.log('────────────────────────────────────────────────────────────');
    await s.ouvrirExercice('logi-strimko', { palier, saisieClavier: !auDoigt });

    for (const [sel, pourquoi] of [
        ['.st-cadre', 'le cadre de la grille'],
        ['.st-cell[data-r]', 'les cases, repérées par ligne et colonne'],
        ['.st-fil', 'les traits qui dessinent les ruisseaux'],
        ['.st-perle', 'les perles posées sur les traits'],
        ['[data-verifier]', 'le bouton « Vérifier »'],
        ['[data-valider]', 'le bouton « Valider »']
    ]) await s.doitExister(sel, pourquoi);

    const plan = await lirePuisResoudre(s.page);
    exige(!!plan, 'LA GRILLE MONTRÉE EST RÉSOLUBLE TELLE QU\'ELLE EST MONTRÉE');
    if (!plan) return;
    dit(true, `grille ${plan.n}×${plan.n}`,
        `${plan.donnees} indice(s), ${plan.aRemplir.length} case(s) à remplir`);

    // UNE GRILLE VIDE NE DOIT PAS COÛTER UNE VÉRIFICATION. Trois essais pour
    // toute la grille : en dépenser un pour s'entendre dire que rien ne se
    // répète dans une grille vide, c'est en perdre un tiers.
    const depart = await essais();
    await s.page.click('[data-verifier]');
    const apresVide = await essais();
    exige(depart === apresVide, 'une grille vide ne coûte pas une vérification',
        `${depart} → ${apresVide}`);
    exige(!/rien ne se répète/i.test(await statut()),
        'et le verdict ne dit pas « rien ne se répète » sur une grille vide',
        await statut());

    const poserUne = async ({ r, c, v }) => {
        const cell = `.st-cell[data-r="${r}"][data-c="${c}"]`;
        if (!auDoigt) {
            await s.page.click(`${cell} input.kk-champ`);
            await s.page.keyboard.type(String(v));
            return;
        }
        // AU DOIGT, UN APPUI FAIT DÉFILER : on appuie v fois depuis le vide.
        for (let k = 0; k < v; k++) await s.page.click(cell);
    };

    await poserUne(plan.aRemplir[0]);
    await s.page.click('[data-verifier]');
    const apresUne = await essais();
    exige(apresUne !== depart, 'une grille entamée, elle, coûte une vérification',
        `${depart} → ${apresUne}`);
    exige(/rien ne se répète/i.test(await statut()),
        'et le verdict est celui d\'une grille en cours', await statut());

    for (const place of plan.aRemplir.slice(1)) await poserUne(place);
    const lues = await s.page.evaluate(() => [...document.querySelectorAll('.st-cell[data-r]')]
        .filter(el => {
            const champ = el.querySelector('input.kk-champ');
            return champ ? !!champ.value : !!el.textContent.trim();
        }).length);
    exige(lues === plan.n * plan.n, 'TOUTES LES CASES SE REMPLISSENT ET SE RELISENT',
        `${lues}/${plan.n * plan.n}`);

    await s.page.click('[data-verifier]');
    const verdict = await statut();
    exige(/complète/i.test(verdict) && !/continue/i.test(verdict),
        'une grille pleine et juste ne s\'entend pas dire « continue »', verdict);
    exige((await s.page.evaluate(() => document.querySelectorAll('.st-faute').length)) === 0,
        'et aucune case n\'est marquée en faute sur une grille juste');

    await s.page.click('[data-valider]');
    await s.page.waitForTimeout(1500);
    exige(await s.page.evaluate(() => !!document.querySelector('.st-cell[data-r]')),
        '« Valider » accepte la grille et passe à la suivante');
}

await s.identifier();
await uneGrille(false);
await uneGrille(true);

console.log('\n────────────────────────────────────────────────────────────');
exige(s.erreurs.length === 0, 'erreurs de page : 0',
    s.erreurs.slice(0, 3).join(' | ') || '(aucune)');
exige(s.fenetresNatives.length === 0, 'fenêtres natives : 0',
    s.fenetresNatives.slice(0, 3).join(' | ') || '(aucune)');
await s.fermer();

console.log(fautes
    ? `\n\x1b[31m${fautes} MESURE(S) AU ROUGE.\x1b[0m`
    : '\n\x1b[32mLE STRIMKO SE JOUE ET SE TERMINE, AU CLAVIER COMME AU DOIGT.\x1b[0m');
process.exit(fautes ? 1 : 0);
