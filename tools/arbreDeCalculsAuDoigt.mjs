// L'ARBRE DE CALCULS, MESURÉ EN LISANT L'ÉCRAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LA SONDE NE DEMANDE PAS SA RÉPONSE AU MOTEUR : elle RECONSTRUIT l'arbre à
// partir de ce qui est dessiné. Les cases lui donnent leur place et leur
// nombre ; les ronds leur signe ; et les FLÈCHES disent qui entre dans quoi —
// une flèche qui part du bas d'une case et arrive sur un rond, une autre qui
// descend du rond vers la case du résultat.
//
// C'EST CE QUI REND LA MESURE UTILE. Si une flèche est tirée vers le mauvais
// rond, l'arbre reconstruit n'est pas celui du générateur, les nombres tapés
// sont faux, et la validation le dit. Une sonde qui lirait `item.answer`
// donnerait un vert imperturbable au-dessus d'un dessin qui ment — c'est très
// exactement ce qui est arrivé au trait du Kakuro, tiré dans le mauvais sens
// pendant que toutes les mesures chiffrées étaient vertes.
//
//   node tools/arbreDeCalculsAuDoigt.mjs
//
// Elle passe deux fois : « compléter l'arbre » au doigt (390 × 844) et à la
// souris (1280 × 900), puis « écrire l'expression en ligne ». Dans ce
// second cas elle tape une expression ENTIÈREMENT PARENTHÉSÉE — qui n'est pas
// l'écriture canonique du moteur — pour vérifier que toute écriture juste est
// acceptée, et non la seule que le générateur a produite.

import { ouvrirSonde } from './sonde.mjs';

/** Ce que l'écran dessine : les cases, les ronds, et les flèches entre eux. */
const lireArbre = (s) => s.page.evaluate(() => {
    const boite = document.querySelector('.ac-arbre');
    if (!boite) return null;
    const r0 = boite.getBoundingClientRect();
    const cases = [...boite.querySelectorAll('.ac-case')].map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
            i, texte: el.textContent.trim(),
            trou: el.tagName === 'BUTTON',
            id: el.dataset.case || null,
            final: el.classList.contains('ac-case--final'),
            x: r.left - r0.left + r.width / 2,
            haut: r.top - r0.top,
            bas: r.bottom - r0.top
        };
    });
    const svg = boite.querySelector('svg');
    const ronds = [...svg.querySelectorAll('.ac-rond')].map((g, i) => {
        const c = g.querySelector('circle');
        return {
            i, op: g.querySelector('text').textContent.trim(),
            x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy'))
        };
    });
    const traits = [...svg.querySelectorAll('.ac-fleche')].map(l => ({
        bout: l.classList.contains('ac-fleche--bout'),
        x1: Number(l.getAttribute('x1')), y1: Number(l.getAttribute('y1')),
        x2: Number(l.getAttribute('x2')), y2: Number(l.getAttribute('y2'))
    }));
    return { cases, ronds, traits };
});

const proche = (a, b, marge = 3) => Math.abs(a - b) <= marge;
const nombre = (t) => Number(String(t).replace('−', '-').replace(',', '.'));

const CALCULS = {
    '+': (a, b) => a + b, '−': (a, b) => a - b,
    '×': (a, b) => a * b, '÷': (a, b) => a / b
};

/**
 * DE CE QUI EST DESSINÉ À UN ARBRE QUI SE CALCULE.
 *
 * Chaque rond cherche sa case de résultat sous lui (la flèche à pointe), puis
 * ses deux cases d'entrée (les flèches qui montent vers lui). On calcule
 * ensuite de haut en bas : une case ne se calcule que lorsque ses deux
 * entrées sont connues, et l'on recommence tant qu'on avance.
 */
function reconstruire({ cases, ronds, traits }) {
    const liens = ronds.map(rond => {
        const bout = traits.find(t => t.bout && proche(t.x1, rond.x) && t.y1 > rond.y);
        const resultat = bout && cases.find(c => proche(c.x, bout.x2) && proche(c.haut, bout.y2, 4));
        const entrants = traits.filter(t => !t.bout && proche(t.x2, rond.x)
            && proche(t.y2, rond.y - 13, 4));
        const enfants = entrants
            .map(t => cases.find(c => proche(c.x, t.x1) && proche(c.bas, t.y1, 4)))
            .filter(Boolean);
        return { rond, resultat, enfants };
    });
    const valeurs = new Map();
    cases.filter(c => !c.trou).forEach(c => valeurs.set(c.i, nombre(c.texte)));
    for (let tour = 0; tour < 10; tour++) {
        for (const { rond, resultat, enfants } of liens) {
            if (!resultat || enfants.length !== 2) continue;
            if (valeurs.has(resultat.i)) continue;
            const [a, b] = enfants.map(e => valeurs.get(e.i));
            if (a === undefined || b === undefined) continue;
            valeurs.set(resultat.i, Math.round(CALCULS[rond.op](a, b) * 1e6) / 1e6);
        }
    }
    return { liens, valeurs };
}

/** L'expression ENTIÈREMENT parenthésée de ce sous-arbre, telle qu'on la tape. */
function ecrireTout(c, liens, valeurs) {
    const lien = liens.find(l => l.resultat && l.resultat.i === c.i);
    if (!lien) {
        const v = valeurs.get(c.i);
        const t = String(Math.round(v * 1e6) / 1e6).replace('.', ',').replace('-', '−');
        return v < 0 ? `(${t})` : t;
    }
    const [g, d] = lien.enfants;
    return `(${ecrireTout(g, liens, valeurs)}${lien.rond.op}${ecrireTout(d, liens, valeurs)})`;
}

/** Tape une suite de signes sur le pavé de l'exercice. */
async function taper(s, signes) {
    for (const c of signes) {
        const ok = await s.page.evaluate((t) => {
            const b = document.querySelector(`.ac-pave [data-t="${CSS.escape(t)}"]`);
            if (!b) return false;
            b.click();
            return true;
        }, c);
        if (!ok) throw new Error(`le pavé n'a pas de touche « ${c} »`);
    }
}

const valider = (s) => s.page.evaluate(() => {
    const b = document.querySelector('.ac-pave [data-t="ok"]');
    if (b) b.click();
});

async function unePasse(taille, question) {
    const s = await ouvrirSonde({ largeur: taille.largeur, hauteur: taille.hauteur });
    const dits = [];
    const fautesVues = [];
    try {
        await s.identifier();
        const raté = await s.ouvrirExercice('calc-arbre', {
            taille: 'grand', nombres: 'relatifs', operations: 'sans-division', question
        }, { questions: 2 });
        if (raté) throw new Error(`ouverture : ${raté}`);

        await s.doitExister('.ac-arbre .ac-case', 'les cases de l\'arbre');
        await s.doitExister('.ac-pave .ac-touche', 'le pavé');
        await s.photo('.ac-layout', `tools/tmp/arbre-${taille.nom}-${question}-depart.png`);
        await s.page.screenshot({ path: `tools/tmp/arbre-${taille.nom}-${question}-ecran.png` });

        const vu = await lireArbre(s);
        if (!vu) throw new Error('aucun arbre dessiné');
        const { liens, valeurs } = reconstruire(vu);
        const trous = vu.cases.filter(c => c.trou);
        const inconnues = (question === 'completer' ? trous : vu.cases)
            .filter(c => !valeurs.has(c.i) || !Number.isFinite(valeurs.get(c.i)));
        if (inconnues.length) {
            throw new Error(`${inconnues.length} case(s) que les flèches ne relient à rien`);
        }
        dits.push(`${vu.cases.length} cases, ${vu.ronds.length} opérations, `
            + `${vu.traits.length} flèches — l'arbre se recalcule depuis l'écran`);

        if (question === 'completer') {
            for (const c of trous) {
                await s.page.evaluate((i) => {
                    document.querySelectorAll('.ac-arbre .ac-case')[i].click();
                }, c.i);
                const v = valeurs.get(c.i);
                const texte = String(v).replace('.', ',').replace('-', '−');
                await taper(s, texte);
            }
            dits.push(`${trous.length} cases remplies en lisant les flèches`);
        } else {
            const finale = vu.cases.find(c => c.final);
            const ligne = ecrireTout(finale, liens, valeurs);
            await taper(s, ligne);
            dits.push(`ligne tapée (${ligne.length} signes, toute parenthésée) : ${ligne}`);
        }

        await valider(s);
        await s.page.waitForTimeout(450);
        await s.photo('.ac-layout', `tools/tmp/arbre-${taille.nom}-${question}-fin.png`);
        const fin = await s.page.evaluate(() => ({
            statut: (document.querySelector('.ac-statut') || {}).textContent || '',
            faux: document.querySelectorAll('.ac-case--faux').length
        }));
        dits.push(`${fin.faux} case(s) en rouge · statut : ${fin.statut.trim()}`);
        if (fin.faux) dits.push('UNE RÉPONSE JUSTE A ÉTÉ REFUSÉE');

        // ── ET UNE FAUTE DOIT SE VOIR ──────────────────────────────────────
        //
        // Sans cette seconde question, le rouge des cases fausses n'est JAMAIS
        // rendu par la sonde : on ne mesurerait que le chemin où tout va bien,
        // c'est-à-dire celui qui ne révèle rien.
        if (question === 'completer') {
            await s.page.waitForTimeout(1400);
            const vu2 = await lireArbre(s);
            const r2 = reconstruire(vu2);
            const trous2 = vu2.cases.filter(c => c.trou);
            if (!trous2.length) throw new Error('la question suivante n\'a pas de case à remplir');
            for (const c of trous2) {
                await s.page.evaluate((i) => {
                    document.querySelectorAll('.ac-arbre .ac-case')[i].click();
                }, c.i);
                const v = r2.valeurs.get(c.i) + (c === trous2[0] ? 1 : 0);
                await taper(s, String(v).replace('.', ',').replace('-', '−'));
            }
            await valider(s);
            await s.page.waitForTimeout(450);
            const rate = await s.page.evaluate(
                () => document.querySelectorAll('.ac-case--faux').length);
            await s.photo('.ac-layout', `tools/tmp/arbre-${taille.nom}-faute.png`);
            dits.push(rate === 1
                ? 'une case fausse sur quatre se montre en rouge, et elle seule'
                : `LA FAUTE NE SE VOIT PAS : ${rate} case(s) en rouge au lieu d'une`);
            if (rate !== 1) fautesVues.push('rouge');
        }

        return { dits, fautesVues, erreurs: s.erreurs.slice(), fenetres: s.fenetresNatives.slice() };
    } finally {
        await s.fermer();
    }
}

const PASSES = [
    [{ nom: 'doigt', largeur: 390, hauteur: 844 }, 'completer'],
    [{ nom: 'ordi', largeur: 1280, hauteur: 900 }, 'completer'],
    [{ nom: 'doigt', largeur: 390, hauteur: 844 }, 'ligne']
];

const sorties = [];
for (const [t, q] of PASSES) sorties.push({ t, q, r: await unePasse(t, q) });

console.log('');
let fautes = 0;
for (const { t, q, r } of sorties) {
    console.log(`── ${t.nom} (${t.largeur} × ${t.hauteur}) · ${q} ──`);
    r.dits.forEach(d => console.log(`   ${d}`));
    console.log(`   erreurs de page : ${r.erreurs.length}, fenêtres natives : ${r.fenetres.length}`);
    r.erreurs.forEach(e => console.log(`     ! ${e}`));
    fautes += r.erreurs.length + r.fenetres.length + (r.fautesVues || []).length;
    if (r.dits.some(d => d.includes('REFUSÉE'))) fautes++;
}
console.log(fautes ? `\n${fautes} chose(s) à regarder.` : '\nTOUT PASSE.');
process.exit(fautes ? 1 : 0);
