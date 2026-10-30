// QUELS CARACTÈRES DEVIENNENT « ? » SUR LA FEUILLE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY NE L'A PAS SIGNALÉ, et c'était le plus grave de sa revue du poly :
// « |x − 5| ⩽ 1 » s'imprimait « |x - 5| ? 1 ». Le dépôt écrit partout le ⩽
// français — « celui du programme français, pas le ≤ anglo-saxon », dit le
// commentaire de `generators/intervalles.js` — et la table des symboles du PDF
// ne connaissait que le ≤ anglo-saxon. Le filet de sécurité de `pourPdf`
// remplaçait donc le signe par un point d'interrogation, dans toutes les
// inégalités larges de la seconde.
//
// EN CHERCHANT LES AUTRES, on en a trouvé treize : ℕ ℤ ℚ ℝ (l'exercice sur les
// ensembles imprimait « ? — les rationnels »), ∪ ∩ ∅ ∉ (« I ∩ J » devenait
// « I ? J », c'est-à-dire la question posée à l'envers), ① ②, et les exposants
// ⁺ ⁿ ˟ (« 10⁷⁺⁷ » sortait « 10^7?7 », le pas intermédiaire d'un exercice sur
// les puissances).
//
// POURQUOI PERSONNE NE LES AVAIT VUS. Un PDF ne se regardait pas dans ce
// dépôt : on en comptait les octets et les segments (voir
// `tools/pdfEnImage.mjs`, écrit le même jour). Et un « ? » au milieu d'une
// inégalité ne casse rien — la feuille sort, elle a le bon nombre de lignes,
// toutes les épreuves sont vertes. Seul un œil sur la bonne ligne le voit.
//
// CE QUE CE SCRIPT FAIT. Il tire des questions de CHAQUE générateur du
// catalogue, en mode papier, passe tout ce qui s'imprimera par `pourPdf`, et
// dit quels caractères y ont été perdus — combien de fois, dans quels
// exercices, avec un exemple. Deux secondes.
//
//     node tools/caracteresPerdus.mjs [combien-par-exercice]
//
// CE QU'IL NE DIT PAS : les caractères REMPLACÉS par un équivalent lisible (le
// vrai signe moins devient un trait d'union, ℚ devient Q). Ceux-là sont des
// choix écrits dans `HORS_TABLE`, pas des pertes.
//
// LA MESURE EST EXPORTÉE : `tests/caracteresDuPapier.test.mjs` appelle la même
// fonction. Une garde qui referait le balayage de son côté mesurerait sa
// propre copie, et les deux finiraient par ne plus chercher la même chose.

import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';

// `pourPdf` vit dans un module d'interface, qui touche `document` au chargement
// pour mesurer du texte. On lui en donne un qui ne sert à rien : ce balayage ne
// mesure pas des largeurs, il lit des caractères.
globalThis.document = globalThis.document || {
    createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 0 }) }) })
};
const { pourPdf } = await import('../js/ui/ficheRendu.js');

/** Tout ce qu'un item mettra sur la feuille — énoncé, réponse, propositions. */
function textesDe(item) {
    const p = item.prompt || {};
    const out = [p.papier, p.text, item.explicationPapier, item.explanation];
    if (Array.isArray(item.choices)) {
        item.choices.forEach(c => out.push(typeof c === 'string' ? c : (c.label ?? c.texte)));
    }
    if (item.answer !== undefined) out.push(String(item.answer));
    if (p.tableau) out.push(JSON.stringify(p.tableau));
    return out.filter(t => typeof t === 'string' && t);
}

/**
 * Balaie le catalogue en mode papier.
 *
 * @returns {{perdus: Map<string, {n:number, exemples:Set, exos:Set}>,
 *            tires:number, jetes:number}}
 */
export function caracteresPerdus(combien = 8) {
    const perdus = new Map();
    let tires = 0, jetes = 0;
    for (const exo of exercices) {
        const gen = getGenerator(exo.generatorId || '');
        if (!gen || typeof gen.generate !== 'function') continue;
        const params = { ...(exo.params || {}), ...(exo.printParams || {}) };
        for (let i = 0; i < combien; i++) {
            let item;
            try {
                item = gen.generate(params, {
                    index: i, total: combien, rng: makeRng(`${exo.id}-${i}`),
                    papier: true, themesExclus: [], weakTables: []
                });
            } catch (e) { jetes++; continue; }
            if (!item) continue;
            tires++;
            for (const texte of textesDe(item)) {
                // ON REGARDE CARACTÈRE PAR CARACTÈRE. Comparer les longueurs
                // ne dirait rien : `HORS_TABLE` change aussi un caractère en
                // plusieurs (⅓ devient « 1/3 »).
                if (!pourPdf(texte).includes('?')) continue;
                [...texte].forEach(c => {
                    if (c.codePointAt(0) < 128) return;
                    if (pourPdf(c) !== '?') return;
                    const f = perdus.get(c)
                        || { n: 0, exemples: new Set(), exos: new Set() };
                    f.n++;
                    if (f.exemples.size < 2) f.exemples.add(texte.trim().slice(0, 64));
                    f.exos.add(exo.id);
                    perdus.set(c, f);
                });
            }
        }
    }
    return { perdus, tires, jetes };
}

// ── LE RAPPORT, quand on lance le script à la main ──────────────────────────
//
// Importé par une épreuve, ce module ne doit rien imprimer et surtout pas
// sortir du processus. ESM n'a pas de `require.main` : on compare donc l'URL
// du module à celle du fichier lancé.
const lanceALaMain = process.argv[1]
    && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop());

if (lanceALaMain) {
    const { perdus, tires, jetes } = caracteresPerdus(Number(process.argv[2]) || 8);
    const nom = (c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
    console.log(`\n  ${tires} questions tirées en mode papier`
        + `${jetes ? `, ${jetes} tirage(s) ont jeté` : ''}.\n`);
    if (!perdus.size) {
        console.log('  \x1b[32mAUCUN CARACTÈRE PERDU.\x1b[0m'
            + ' Tout ce qui s\'imprime traverse `pourPdf` intact.\n');
    } else {
        console.log(`  \x1b[31m${perdus.size} caractère(s) deviennent « ? »`
            + ' à l\'impression :\x1b[0m\n');
        [...perdus.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([c, f]) => {
            console.log(`  « ${c} »  ${nom(c)}  ${f.n} fois, ${f.exos.size} exercice(s)`);
            console.log(`        ${[...f.exos].slice(0, 4).join(', ')}`);
            [...f.exemples].forEach(e => console.log(`        « ${e} »`));
        });
        console.log('\n  Les ajouter à `SYMBOLE` (si la police Symbol sait les dessiner)'
            + '\n  ou à `HORS_TABLE` (pour un équivalent lisible), dans'
            + ' `js/ui/ficheRendu.js`.\n');
        process.exitCode = 1;
    }
}
