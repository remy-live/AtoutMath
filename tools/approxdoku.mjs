// L'APPROXDOKU, JOUÉ EN ENTIER, PAR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « et un approxdoku ».
//
// POURQUOI CETTE SONDE EXISTE, ET POURQUOI ELLE A ÉTÉ ÉCRITE AVANT LE PREMIER
// COMMIT. Les dix-sept épreuves de `tests/approxdoku.test.mjs` mesurent le
// GÉNÉRATEUR — l'unicité, la déductibilité, la règle du « à un près », jusqu'à
// la grille publiée d'Erich Friedman prise comme témoin. Aucune ne touche à
// l'écran. Le Strimko, la veille, est passé par là avec 4 436 épreuves vertes
// et quatre défauts qui attendaient l'élève, dont un qui rendait toute la
// saisie tablette muette.
//
// CE QU'ELLE MESURE QUE RIEN D'AUTRE NE MESURE :
//
//   · que la grille MONTRÉE soit résoluble telle qu'elle est montrée. La sonde
//     ne lit pas la solution — elle n'est pas dans le DOM, exprès —, elle la
//     RECALCULE depuis les seuls ronds et les seules chaînes affichés ;
//   · que les capsules et les opérateurs tombent bien sur les cases qu'ils
//     désignent. Une capsule décalée d'une piste est un jeu faux et muet ;
//   · que les deux saisies marchent. Clavier et doigt ne partagent aucun code,
//     et c'est du côté du doigt que le Strimko était mort.
//
//   node tools/approxdoku.mjs [palier]

import { ouvrirSonde } from './sonde.mjs';

const palier = process.argv[2] || 'facile';

const dit = (ok, quoi, detail = '') =>
    console.log(`  ${ok ? '\x1b[32mok\x1b[0m  ' : '\x1b[31mNON\x1b[0m '} ${quoi}${detail ? '  — ' + detail : ''}`);
let fautes = 0;
const exige = (ok, quoi, detail) => { if (!ok) fautes++; dit(ok, quoi, detail); };

/**
 * LES RÈGLES DU JEU, RÉÉCRITES ICI — ET C'EST VOLONTAIRE.
 *
 * La sonde n'importe RIEN du module qu'elle mesure. Si elle appelait
 * `equationJuste` du générateur, une règle fausse serait fausse des deux côtés
 * et la mesure répondrait « tout va bien » sur un jeu faux. C'est le même
 * principe que la grille publiée de Friedman dans les épreuves : un témoin ne
 * sert que s'il vient d'ailleurs.
 */
const cote = (vals, ops) => {
    const morceaux = [vals[0]], signes = [];
    for (let i = 0; i < ops.length; i++) {
        const op = ops[i], suivant = vals[i + 1];
        if (op === '×' || op === '÷') {
            const g = morceaux[morceaux.length - 1];
            const r = op === '×' ? g * suivant : g / suivant;
            if (!Number.isInteger(r) || r < 1) return null;
            morceaux[morceaux.length - 1] = r;
        } else { signes.push(op); morceaux.push(suivant); }
    }
    let total = morceaux[0];
    for (let i = 0; i < signes.length; i++) {
        total = signes[i] === '+' ? total + morceaux[i + 1] : total - morceaux[i + 1];
        if (!Number.isInteger(total) || total < 1) return null;
    }
    return Number.isInteger(total) && total >= 1 ? total : null;
};
const juste = (ops, vals) => {
    const k = ops.indexOf('≈');
    const g = cote(vals.slice(0, k + 1), ops.slice(0, k));
    const d = cote(vals.slice(k + 1), ops.slice(k + 1));
    return g !== null && d !== null && Math.abs(g - d) === 1;
};

/**
 * CE QUE L'ÉCRAN DIT — rien de plus.
 *
 * On relit les chaînes à partir des CAPSULES et des OPÉRATEURS posés sur la
 * grille, donc à partir du DESSIN et non des données. Une capsule qui
 * couvrirait les mauvaises cases produirait ici une chaîne fausse, et la
 * grille cesserait d'être résoluble : le décalage d'une piste se voit alors
 * tout seul, sans qu'on ait à le chercher.
 */
const lireLaGrille = (page) => page.evaluate(() => {
    const ronds = [...document.querySelectorAll('.ax-rond[data-r]')];
    if (!ronds.length) return { erreur: 'aucun rond affiché' };
    const n = Math.round(Math.sqrt(ronds.length));
    const place = new Map();
    ronds.forEach(el => place.set(`${el.style.gridRow},${el.style.gridColumn}`,
        { r: Number(el.dataset.r), c: Number(el.dataset.c) }));

    const equations = [];
    for (const cap of document.querySelectorAll('.ax-capsule')) {
        const i = cap.dataset.eq;
        const ligne = cap.style.gridRow, colonne = cap.style.gridColumn;
        const sens = colonne.includes('/') ? 'h' : 'v';
        const [a, b] = (sens === 'h' ? colonne : ligne).split('/').map(x => Number(x.trim()));
        const fixe = Number((sens === 'h' ? ligne : colonne).trim());
        const cases = [];
        for (let piste = a; piste < b; piste += 2) {
            const clef = sens === 'h' ? `${fixe},${piste}` : `${piste},${fixe}`;
            const p = place.get(clef);
            if (!p) return { erreur: `la capsule ${i} désigne une piste sans rond (${clef})` };
            cases.push(p);
        }
        const ops = [...document.querySelectorAll(`.ax-op[data-eq="${i}"]`)]
            .sort((x, y) => Number(x.dataset.op) - Number(y.dataset.op))
            .map(el => el.textContent.trim());
        if (ops.length !== cases.length - 1) {
            return { erreur: `la chaîne ${i} a ${cases.length} cases et ${ops.length} opérateurs` };
        }
        if (ops.filter(o => o === '≈').length !== 1) {
            return { erreur: `la chaîne ${i} ne porte pas exactement un « ≈ » : ${ops.join(' ')}` };
        }
        equations.push({ sens, cases, ops, indice: Number(i) });
    }
    if (!equations.length) return { erreur: 'aucune chaîne affichée' };
    return { n, equations };
});

/** La solution, recalculée depuis le seul écran. */
function resoudre({ n, equations }) {
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    const finies = Array.from({ length: n * n }, () => []);
    equations.forEach(eq => {
        finies[Math.max(...eq.cases.map(({ r, c }) => r * n + c))].push(eq);
    });
    const poser = (i) => {
        if (i === n * n) return true;
        const r = Math.floor(i / n), c = i % n;
        for (let v = 1; v <= n; v++) {
            let ok = true;
            for (let k = 0; k < n && ok; k++) if (g[r][k] === v || g[k][c] === v) ok = false;
            if (!ok) continue;
            g[r][c] = v;
            for (const eq of finies[i]) {
                if (!juste(eq.ops, eq.cases.map(({ r: rr, c: cc }) => g[rr][cc]))) { ok = false; break; }
            }
            if (ok && poser(i + 1)) return true;
            g[r][c] = 0;
        }
        return false;
    };
    return poser(0) ? g : null;
}

/** Lire l'écran, puis le résoudre : ce que toutes les mesures d'ici demandent. */
async function lireEtResoudre(page) {
    const lu = await lireLaGrille(page);
    if (lu.erreur) return lu;
    const g = resoudre(lu);
    if (!g) return { erreur: 'LA GRILLE MONTRÉE N\'EST PAS RÉSOLUBLE' };
    const aRemplir = [];
    for (let r = 0; r < lu.n; r++) for (let c = 0; c < lu.n; c++) aRemplir.push({ r, c, v: g[r][c] });
    return { n: lu.n, chaines: lu.equations.length, equations: lu.equations, aRemplir, grille: g };
}

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });

const statut = () => s.page.evaluate(() =>
    ((document.querySelector('.ax-status') || {}).textContent || '').trim());
const essais = () => s.page.evaluate(() =>
    ((document.querySelector('.ax-verif-count') || {}).textContent || '?').trim());

async function uneGrille(auDoigt) {
    console.log(`\n${auDoigt ? 'AU DOIGT' : 'AU CLAVIER'} — palier « ${palier} »`);
    console.log('────────────────────────────────────────────────────────────');
    await s.ouvrirExercice('logi-approxdoku', { palier, saisieClavier: !auDoigt });

    for (const [sel, pourquoi] of [
        ['.ax-grille', 'la grille'],
        ['.ax-rond[data-r]', 'les ronds, repérés par ligne et colonne'],
        ['.ax-capsule', 'les capsules qui enferment les chaînes'],
        ['.ax-op', 'les opérateurs entre les ronds'],
        ['.ax-op--tilde', 'le « ≈ », qui est toute la règle'],
        ['[data-verifier]', 'le bouton « Vérifier »'],
        ['[data-valider]', 'le bouton « Valider »']
    ]) await s.doitExister(sel, pourquoi);

    const plan = await lireEtResoudre(s.page);
    exige(!plan.erreur, 'LA GRILLE MONTRÉE EST RÉSOLUBLE TELLE QU\'ELLE EST MONTRÉE',
        plan.erreur || '');
    if (plan.erreur) return;
    dit(true, `grille ${plan.n}×${plan.n}`, `${plan.chaines} chaîne(s), aucun indice donné`);

    // AUCUN INDICE : toutes les cases sont vides au départ, c'est la règle du jeu.
    const remplies = await s.page.evaluate(() => [...document.querySelectorAll('.ax-rond[data-r]')]
        .filter(el => {
            const champ = el.querySelector('input.kk-champ');
            return champ ? !!champ.value : !!el.textContent.trim();
        }).length);
    exige(remplies === 0, 'la grille s\'ouvre entièrement vide', `${remplies} case(s) déjà remplies`);

    const depart = await essais();
    await s.page.click('[data-verifier]');
    exige(depart === await essais(), 'une grille vide ne coûte pas une vérification',
        `${depart} → ${await essais()}`);

    const poserUne = async ({ r, c, v }) => {
        const rond = `.ax-rond[data-r="${r}"][data-c="${c}"]`;
        if (!auDoigt) {
            await s.page.click(`${rond} input.kk-champ`);
            await s.page.keyboard.type(String(v));
            return;
        }
        for (let k = 0; k < v; k++) await s.page.click(rond);
    };

    await poserUne(plan.aRemplir[0]);
    await s.page.click('[data-verifier]');
    exige(await essais() !== depart, 'une grille entamée, elle, coûte une vérification',
        `${depart} → ${await essais()}`);

    for (const place of plan.aRemplir.slice(1)) await poserUne(place);
    const lues = await s.page.evaluate(() => [...document.querySelectorAll('.ax-rond[data-r]')]
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
    const marques = await s.page.evaluate(() =>
        document.querySelectorAll('.ax-faute, .ax-capsule--faute').length);
    exige(marques === 0, 'et rien n\'est marqué en faute sur une grille juste', `${marques}`);

    await s.page.click('[data-valider]');
    await s.page.waitForTimeout(1500);
    exige(await s.page.evaluate(() => !!document.querySelector('.ax-rond[data-r]')),
        '« Valider » accepte la grille et passe à la suivante');
}

/** Le vérificateur accuse-t-il ce qu'il faut, et RIEN d'autre ? */
async function leVerificateurAccuse() {
    console.log('\nCE QUE « VÉRIFIER » MONTRE — et ce qu\'il ne montre pas');
    console.log('────────────────────────────────────────────────────────────');
    await s.ouvrirExercice('logi-approxdoku', { palier, saisieClavier: true });
    const plan = await lireEtResoudre(s.page);
    if (plan.erreur) { exige(false, 'grille lisible', plan.erreur); return; }

    // ON REMPLIT UNE CHAÎNE ENTIÈRE AVEC DES VALEURS QUI LA RENDENT FAUSSE,
    // sans rien casser ailleurs : on échange deux cases de la chaîne. La
    // capsule doit rougir, et c'est tout ce qui doit rougir.
    // ON CHERCHE UNE VALEUR QUI REND LA CHAÎNE FAUSSE, on ne permute pas deux
    // cases au hasard : permuter « 2 ≈ 3 » donne « 3 ≈ 2 », toujours juste. La
    // sonde doit fabriquer un défaut CERTAIN, sinon elle mesure sa propre
    // chance et accuse le jeu quand elle n'en a pas eu.
    const eq = plan.equations.find(e => {
        const vals = e.cases.map(({ r, c }) => plan.grille[r][c]);
        return [...Array(plan.n).keys()].some(k => {
            const essai = [...vals];
            essai[0] = k + 1;
            return essai[0] !== vals[0] && !juste(e.ops, essai);
        });
    });
    if (!eq) { exige(false, 'une chaîne falsifiable', 'aucune des chaînes affichées'); return; }
    const vals = eq.cases.map(({ r, c }) => plan.grille[r][c]);
    const fausse = [...Array(plan.n).keys()].map(k => k + 1)
        .find(v => v !== vals[0] && !juste(eq.ops, [v, ...vals.slice(1)]));

    for (const p of plan.aRemplir) {
        await s.page.click(`.ax-rond[data-r="${p.r}"][data-c="${p.c}"] input.kk-champ`);
        await s.page.keyboard.type(String(p.v));
    }
    const premiere = eq.cases[0];
    await s.page.click(`.ax-rond[data-r="${premiere.r}"][data-c="${premiere.c}"] input.kk-champ`);
    await s.page.keyboard.press('Backspace');
    await s.page.keyboard.type(String(fausse));
    await s.page.click('[data-verifier]');

    const rouge = await s.page.evaluate((i) =>
        !!document.querySelector(`.ax-capsule[data-eq="${i}"].ax-capsule--faute`), eq.indice);
    const texte = await statut();
    exige(rouge, 'une chaîne rendue fausse est montrée en rouge',
        `${vals[0]} → ${fausse} · « ${texte} »`);
    exige(/chaîne/i.test(texte), 'et le verdict le DIT, au lieu de ne parler que des doublons',
        texte);

    // ET UNE CHAÎNE À TROUS N'EST JAMAIS ACCUSÉE : elle n'est ni vraie ni
    // fausse, et la marquer reprocherait à l'élève une faute qu'il n'a pas eu
    // l'occasion de commettre.
    await s.ouvrirExercice('logi-approxdoku', { palier, saisieClavier: true });
    const p2 = await lireEtResoudre(s.page);
    if (p2.erreur) { exige(false, 'grille lisible', p2.erreur); return; }
    const une = p2.aRemplir[0];
    await s.page.click(`.ax-rond[data-r="${une.r}"][data-c="${une.c}"] input.kk-champ`);
    await s.page.keyboard.type(String(une.v % p2.n + 1 === une.v ? une.v : une.v % p2.n + 1));
    await s.page.click('[data-verifier]');
    const accusees = await s.page.evaluate(() =>
        document.querySelectorAll('.ax-capsule--faute').length);
    exige(accusees === 0, 'une chaîne encore à trous n\'est jamais accusée',
        `${accusees} capsule(s) en rouge`);
}

await s.identifier();
await uneGrille(false);
await uneGrille(true);
await leVerificateurAccuse();

console.log('\n────────────────────────────────────────────────────────────');
exige(s.erreurs.length === 0, 'erreurs de page : 0',
    s.erreurs.slice(0, 3).join(' | ') || '(aucune)');
exige(s.fenetresNatives.length === 0, 'fenêtres natives : 0',
    s.fenetresNatives.slice(0, 3).join(' | ') || '(aucune)');
await s.fermer();

console.log(fautes
    ? `\n\x1b[31m${fautes} MESURE(S) AU ROUGE.\x1b[0m`
    : '\n\x1b[32mL\'APPROXDOKU SE JOUE ET SE TERMINE, AU CLAVIER COMME AU DOIGT.\x1b[0m');
process.exit(fautes ? 1 : 0);
