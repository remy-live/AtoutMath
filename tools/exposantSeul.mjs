// L'ÉLÈVE N'ÉCRIT QUE L'EXPOSANT — mesuré dans un vrai navigateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre : « pour l'exercice sur les puissance dans la réponse ne
// demande que l'exposant, j'aime pas l'écriture 10^3 pour les élèves ».
//
// CE QUE `npm test` NE PEUT PAS DIRE. Les épreuves de `puissancesCalcul` lisent
// le générateur : elles savent que `meta.base` vaut « 10 » et que `meta.exposant`
// est tombé à faux. Elles ne savent pas si le 10 s'AFFICHE, si le pavé a
// vraiment perdu sa touche, ni si l'exposant est écrit en haut ou à côté. La
// chaîne est une grille à trois colonnes et le champ une boîte flexible : poser
// deux enfants là où l'on en attendait un casse la mise en page SANS casser une
// seule épreuve.
//
// CETTE SONDE OUVRE DONC L'EXERCICE ET REGARDE :
//
//   1. le pavé n'a ni « ^ » ni parenthèses sur la marche « produit » ;
//   2. le champ montre un 10, et la saisie est PLUS HAUTE et plus petite que
//      lui — c'est ce qui fait un exposant plutôt qu'une juxtaposition ;
//   3. la chaîne montre « 10 » suivi d'un exposant, sur UNE seule ligne ;
//   4. taper l'exposant seul est accepté ;
//   5. et la photo, parce qu'une mesure qui ne regarde que des nombres ne voit
//      pas que la ligne s'est cassée en escalier.
//
//     node tools/exposantSeul.mjs

import { ouvrirSonde } from './sonde.mjs';

const dire = (ok, quoi) => {
    console.log(`${ok ? '  ok  ' : '  NON '} ${quoi}`);
    return ok;
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
let tout = true;
try {
    await s.ouvrirExercice('num-puissances-regles',
        { etapes: 'oui', marches: ['produit'] }, { questions: 4 });
    await s.doitExister('.ls-champ', 'le champ de saisie de la chaîne');

    // ── 1. LE PAVÉ ──────────────────────────────────────────────────────────
    const touches = await s.page.evaluate(() => [...document.querySelectorAll('.ls-clavier button')]
        .map(b => (b.textContent || '').trim()));
    console.log(`  pavé : ${touches.join(' ')}`);
    tout = dire(!touches.includes('^'),
        'pas de touche « ^ » — « j\'aime pas l\'écriture 10^3 pour les élèves »') && tout;
    tout = dire(!touches.includes('(') && !touches.includes(')'),
        'pas de parenthèses : « 3 + 2 » n\'en demande aucune') && tout;

    // ── 2. LE CHAMP : UN 10, ET LA SAISIE EN HAUT ───────────────────────────
    await s.doitExister('.ls-champ--base .ls-champ-base', 'le 10 écrit devant le champ');
    await s.doitExister('.ls-champ--base .ls-haut', 'la saisie relevée en exposant');
    const champ = await s.page.evaluate(() => {
        const b = document.querySelector('.ls-champ-base');
        const h = document.querySelector('.ls-champ .ls-haut');
        const rb = b.getBoundingClientRect(), rh = h.getBoundingClientRect();
        return {
            base: (b.textContent || '').trim(),
            tailleBase: parseFloat(getComputedStyle(b).fontSize),
            tailleHaut: parseFloat(getComputedStyle(h).fontSize),
            // Le centre de l'exposant doit être AU-DESSUS du centre du 10.
            releve: (rb.top + rb.bottom) / 2 - (rh.top + rh.bottom) / 2,
            modele: (document.querySelector('.ls-modele')?.textContent || '').trim()
        };
    });
    console.log(`  champ : « ${champ.base} » ${champ.tailleBase}px · exposant `
        + `${champ.tailleHaut}px relevé de ${champ.releve.toFixed(1)}px · moule « ${champ.modele} »`);
    tout = dire(champ.base === '10', 'le champ porte le 10') && tout;
    tout = dire(champ.tailleHaut < champ.tailleBase * .8,
        'l\'exposant est plus PETIT que la base') && tout;
    tout = dire(champ.releve > 4, 'et plus HAUT qu\'elle') && tout;
    tout = dire(champ.tailleHaut >= 15,
        `l'exposant fait ${champ.tailleHaut}px — en dessous de 15, on ne le relit pas`) && tout;
    tout = dire(!/\^/.test(champ.modele),
        `le moule « ${champ.modele} » ne montre pas d'accent circonflexe`) && tout;

    // ── 3. LA CHAÎNE : UNE SEULE LIGNE PAR ÉTAPE ────────────────────────────
    await s.doitExister('.ls-chaine .ls-puiss', 'la puissance dessinée dans la chaîne');
    const chaine = await s.page.evaluate(() => [...document.querySelectorAll('.ls-ligne')]
        .map(li => {
            const p = li.querySelector('.ls-puiss');
            const eg = li.querySelector('.ls-egal');
            return {
                texte: (li.textContent || '').replace(/\s+/g, ' ').trim(),
                hauteur: Math.round(li.getBoundingClientRect().height),
                // MÊME LIGNE QUE LE « = » : c'est le test de l'escalier. Un
                // enfant de trop dans la grille renvoie l'exposant à la rangée
                // suivante, et la ligne double de hauteur sans rien dire.
                memeRangee: !!(p && eg)
                    && Math.abs(p.getBoundingClientRect().top - eg.getBoundingClientRect().top) < 14
            };
        }));
    for (const l of chaine) console.log(`  ligne : « ${l.texte} » ${l.hauteur}px`);
    const avecPuiss = chaine.filter(l => l.memeRangee !== false);
    tout = dire(avecPuiss.length > 0, 'au moins une ligne porte une puissance') && tout;
    tout = dire(chaine.every(l => l.memeRangee !== false),
        'l\'exposant est sur la MÊME rangée que le « = » — pas d\'escalier') && tout;
    tout = dire(chaine.every(l => l.hauteur < 95),
        `aucune ligne ne dépasse 95px (max vu : ${Math.max(...chaine.map(l => l.hauteur))})`) && tout;

    await s.photo('.ls-layout', 'tools/tmp/exposant-seul.png');

    // ── 4. TAPER L'EXPOSANT SEUL EST ACCEPTÉ ────────────────────────────────
    //
    // ON PASSE PAR LE PAVÉ, pas par le juge : un appel direct à `verifieTexte`
    // mesure le générateur, que `npm test` mesure déjà. Ici on veut savoir ce
    // qui arrive au DOIGT de l'élève.
    const q = await s.questionCourante();
    const enonce = (q && (q.prompt || q.texte)) || '';
    const expo = String(enonce).match(/10(\D*)/) ? null : null;
    // L'énoncé est « 10³ × 10² = ? » : on relit les deux exposants écrits en
    // petit, et la ligne attendue est leur somme.
    const HAUT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const nombres = [...String(enonce)].reduce((acc, c) => {
        if (HAUT.includes(c)) acc.courant += String(HAUT.indexOf(c));
        else if (acc.courant) { acc.liste.push(Number(acc.courant)); acc.courant = ''; }
        return acc;
    }, { liste: [], courant: '' });
    if (nombres.courant) nombres.liste.push(Number(nombres.courant));
    console.log(`  énoncé : « ${enonce} » → exposants ${nombres.liste.join(', ')}`);
    if (nombres.liste.length === 2) {
        const [a, b] = nombres.liste;
        for (const c of `${a} + ${b}`.replace(/\s/g, '')) {
            await s.page.evaluate((t) => {
                const btn = [...document.querySelectorAll('.ls-clavier button')]
                    .find(x => (x.textContent || '').trim() === t);
                if (btn) btn.click();
            }, c);
        }
        await s.page.evaluate(() => document.querySelector('[data-valider]')?.click());
        await new Promise(ok => setTimeout(ok, 700));
        const etat = await s.page.evaluate(() => {
            const c = document.querySelector('.ls-champ');
            return { ok: c.classList.contains('ls-champ--ok'),
                ko: c.classList.contains('ls-champ--ko'),
                note: (document.querySelector('[data-note]')?.textContent || '').trim() };
        });
        tout = dire(etat.ok && !etat.ko,
            `« ${a} + ${b} » tapé au pavé est accepté${etat.note ? ` (« ${etat.note} »)` : ''}`)
            && tout;
        await s.photo('.ls-layout', 'tools/tmp/exposant-seul-apres.png');
    } else {
        tout = dire(false, `l'énoncé « ${enonce} » ne donne pas deux exposants`);
    }
    void expo;
} finally {
    console.log(`\nfenêtres natives et erreurs de page : `
        + `${s.fenetresNatives.length + s.erreurs.length}`);
    for (const e of s.erreurs) console.log(`    ${e}`);
    await s.fermer();
}
console.log(tout ? '\nL\'EXPOSANT SEUL, ET RIEN QUE LUI.' : '\nIL RESTE QUELQUE CHOSE.');
process.exit(tout ? 0 : 1);
