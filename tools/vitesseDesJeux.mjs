// CE QUE COÛTE UNE GRILLE, RÉGLAGE PAR RÉGLAGE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/vitesseDesJeux.mjs                 tous les jeux de logique
//   node tools/vitesseDesJeux.mjs logi-kakuro     un seul
//   node tools/vitesseDesJeux.mjs --graines 60    plus de graines
//
// POURQUOI CET OUTIL EXISTE. `npm test` est passé de quatre minutes à plus de
// vingt-cinq, et le verdict ne disait pas pourquoi : il annonçait seulement
// que la garde « AUCUN RÉGLAGE MORT » — qui essaie CHAQUE valeur de CHAQUE
// réglage de CHAQUE exercice — n'en finissait plus. Une suite qui met une
// heure ne nomme pas le générateur qui la retient.
//
// ET LA MOYENNE NE SUFFIT PAS. Le Kakuro affichait 1 068 ms de moyenne, ce qui
// est mauvais mais supportable ; sa PIRE graine sur quarante demandait
// 141 268 ms — deux minutes et demie pour une seule grille. C'est la queue de
// la distribution qui fait exploser une suite d'épreuves, jamais la médiane.
// Cet outil imprime donc la médiane, le neuvième décile ET le pire cas.
//
// LE FILET EST DANS LE TABLEAU parce qu'il est le PRIX de la vitesse : un
// générateur qui renonce vite est rapide et sert une grille au rabais. Lire
// l'un sans l'autre, c'est se féliciter d'un chronomètre en servant des
// grilles que personne n'a vérifiées.

import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';

const ARGS = process.argv.slice(2);
const iGraines = ARGS.indexOf('--graines');
const GRAINES = iGraines >= 0 ? Number(ARGS[iGraines + 1]) : 24;
const voulus = ARGS.filter(a => !a.startsWith('--') && a !== String(GRAINES));

/** Au-delà, une grille se sent attendre sur la tablette d'un élève. */
const SEUIL_PIRE = 1000;

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const jaune = (t) => `\x1b[33m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

/**
 * TOUTES LES COMBINAISONS DE RÉGLAGES d'un exercice, comme la garde
 * « AUCUN RÉGLAGE MORT » les parcourt. C'est le chemin qui a explosé ; c'est
 * donc celui qu'on mesure.
 */
function combinaisons(gen) {
    let out = [{}];
    for (const p of gen.params || []) {
        if (p.type !== 'select' || !p.options) continue;
        const suivant = [];
        for (const base of out) {
            for (const o of p.options) suivant.push({ ...base, [p.id]: o.value });
        }
        out = suivant;
    }
    return out;
}

const LOGIQUE = exercices.filter(e => {
    const g = getGenerator(e.generatorId);
    return g && /^logique\./.test(g.id || '');
});
const choisis = voulus.length
    ? LOGIQUE.filter(e => voulus.includes(e.id))
    : LOGIQUE;

if (!choisis.length) {
    console.log(rouge('Aucun exercice de logique sous ce nom.'));
    console.log(gris('Connus : ' + LOGIQUE.map(e => e.id).join(', ')));
    process.exit(1);
}

let pires = 0;
for (const exo of choisis) {
    const gen = getGenerator(exo.generatorId);
    console.log(`\n${exo.title || exo.id}  ${gris(exo.id)}`);
    for (const combo of combinaisons(gen)) {
        const params = { ...(exo.params || {}), ...combo };
        const nom = Object.values(combo).join(' / ') || '(sans réglage)';
        // ON ÉCRIT LE RÉGLAGE AVANT DE LE MESURER, et c'est la friction que cet
        // outil a lui-même payée : lancé sur les six jeux, il s'est fait tuer
        // au bout de sept minutes sans avoir rien imprimé. Un chronomètre muet
        // pendant qu'il mesure la chose lente est exactement le défaut qu'on
        // est venu corriger dans `npm test`.
        process.stdout.write(`  ${gris('…   ')}  ${nom.padEnd(24)}\r`);
        const temps = [];
        let filet = 0;
        for (let i = 0; i < GRAINES; i++) {
            const t = performance.now();
            const it = gen.generate(params, { rng: makeRng(4000 + i) });
            temps.push(performance.now() - t);
            if (it && it.meta && it.meta.filet) filet++;
        }
        temps.sort((a, b) => a - b);
        const q = (p) => Math.round(temps[Math.min(temps.length - 1, Math.floor(temps.length * p))]);
        const pire = Math.round(temps[temps.length - 1]);
        const marque = pire > SEUIL_PIRE ? rouge('PIRE') : filet ? jaune('filet') : vert('ok  ');
        if (pire > SEUIL_PIRE) pires++;
        console.log(`  ${marque}  ${nom.padEnd(24)} médiane ${String(q(0.5)).padStart(5)} ms`
            + `   9e décile ${String(q(0.9)).padStart(5)} ms   pire ${String(pire).padStart(6)} ms`
            + (filet ? `   ${jaune(`filet ${filet}/${GRAINES}`)}` : ''));
    }
}

console.log('\n' + '─'.repeat(72));
console.log(pires
    ? rouge(`${pires} réglage(s) au-dessus de ${SEUIL_PIRE} ms dans le pire cas.`)
    : vert(`AUCUN RÉGLAGE NE DÉPASSE ${SEUIL_PIRE} ms, pire cas compris.`));
process.exit(pires ? 1 : 0);
