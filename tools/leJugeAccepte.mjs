// LE JUGE ACCEPTE-T-IL LA BONNE RÉPONSE ? Vérification la moins chère du dépôt.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// UN GÉNÉRATEUR PEUT ÊTRE JUSTE ET SON EXERCICE INJOUABLE : il suffit que la
// forme de `answer` ne soit pas celle que `evaluate` attend. Le dessin est bon,
// l'énoncé est bon, l'élève répond juste — et le logiciel dit non. Rien ne
// plante, aucune épreuve ne le voit, et c'est la classe entière qui le trouve.
//
// Le geste tient en trois lignes — tirer une question, donner `item.answer` à
// `evaluate`, compter — et je l'ai réécrit À LA MAIN TROIS FOIS DE SUITE, pour
// « Graduer un Axe », « La Cascade de Loupes » et « Ranger, et le Mot
// Apparaît ». La quatrième fois sera celle-ci.
//
//     node tools/leJugeAccepte.mjs                      # tout le catalogue
//     node tools/leJugeAccepte.mjs num-ranger-le-mot    # un exercice
//     node tools/leJugeAccepte.mjs num.ranger-le-mot    # ou son générateur
//     node tools/leJugeAccepte.mjs num-ranger-le-mot 60 # et combien de tirages
//
// IL NE REMPLACE PAS LA SONDE DU NAVIGATEUR, et c'est important : il mesure le
// JUGE, pas l'écran. Un pavé qui ne s'affiche pas, une case qu'aucun doigt
// n'atteint, une figure écrasée à quatre pixels — il ne les voit pas. Il ferme
// une seule porte, celle du « bonne réponse refusée », et il la ferme en deux
// cents millisecondes au lieu de trente secondes de navigateur.

import { makeRng } from '../js/core/ids.js';
import { evaluate } from '../js/core/items.js';
// `registry.js` POUR `getGenerator`, ET `activities/index.js` POUR LES INSCRIRE.
// L'un tient le registre, l'autre le remplit : importer le second sans appeler
// le premier donne un registre vide, et le script dirait « aucun exercice » au
// lieu de « le juge refuse ».
import '../js/core/activities/index.js';
import { getGenerator } from '../js/core/registry.js';
import { exercices } from '../js/data/catalog.js';

const args = process.argv.slice(2).filter(a => !a.startsWith('-'));
const cible = args[0] || '';
const TIRAGES = Number(args[1]) || 40;

/** Les exercices visés : tous, ou celui qu'on nomme — par son id ou par son générateur. */
const vises = exercices.filter(e => !cible
    || e.id === cible || e.generatorId === cible);

if (!vises.length) {
    console.error(`Aucun exercice ne répond à « ${cible} ».`);
    console.error('Donner un id du catalogue (num-ranger-le-mot) ou un generatorId '
        + '(num.ranger-le-mot), ou rien du tout pour tout mesurer.');
    process.exit(2);
}

let fautifs = 0;
let mesures = 0;

for (const exo of vises) {
    const gen = getGenerator(exo.generatorId);
    if (!gen || typeof gen.generate !== 'function') continue;

    // LES MARCHES SE MESURENT UNE PAR UNE. Un exercice à trois marches dont la
    // troisième seule est refusée passerait inaperçu dans un tirage mélangé :
    // `marcheAuRang` n'en sert qu'une sur trois, et quarante tirages donneraient
    // treize questions de la marche cassée — assez pour la voir, pas assez pour
    // savoir laquelle. On boucle donc sur les marches déclarées.
    const param = (gen.params || []).find(p => p.type === 'marches');
    const marches = param && Array.isArray(param.marches) && param.marches.length
        ? param.marches.map(m => m.id)
        : [null];

    for (const marche of marches) {
        const params = { ...(exo.params || {}) };
        if (marche) params[param.id] = [marche];
        let acceptees = 0, refusees = 0;
        const exemples = [];

        for (let i = 0; i < TIRAGES; i++) {
            let item;
            try {
                item = gen.generate(params, {
                    rng: makeRng(`juge-${exo.id}-${marche || 'tout'}-${i}`),
                    index: i, total: TIRAGES
                });
            } catch (e) {
                refusees++;
                if (exemples.length < 3) exemples.push(`la question n’a pas pu être tirée : ${e.message}`);
                continue;
            }
            if (!item || item.answer === undefined || item.answer === null) continue;
            // ON DONNE AU JUGE EXACTEMENT CE QUE LE GÉNÉRATEUR ANNONCE comme
            // bonne réponse. S'il le refuse, l'un des deux ment — et c'est
            // l'élève qui paie.
            const verdict = evaluate(item, item.answer);
            if (verdict && verdict.correct) acceptees++;
            else {
                refusees++;
                if (exemples.length < 3) {
                    exemples.push(`« ${String(item.answer).slice(0, 48)} » refusé`);
                }
            }
            mesures++;
        }

        if (!acceptees && !refusees) continue;
        const nom = marche ? `${exo.id} · ${marche}` : exo.id;
        const mauvais = refusees > 0;
        if (mauvais) fautifs++;
        if (mauvais || cible) {
            console.log(`  ${nom.padEnd(38)} acceptées : ${String(acceptees).padStart(3)}`
                + ` · refusées : ${String(refusees).padStart(3)}`
                + (mauvais ? `   ← ${exemples.join(' / ')}` : ''));
        }
    }
}

console.log(fautifs === 0
    ? `\nLE JUGE ACCEPTE TOUTES LES BONNES RÉPONSES — ${mesures} mesurées.`
    : `\n${fautifs} marche(s) refusent leur propre bonne réponse.`);
process.exit(fautifs === 0 ? 0 : 1);
