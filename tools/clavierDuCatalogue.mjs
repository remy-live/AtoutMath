// OÙ LE CLAVIER NE VIENT JAMAIS — le catalogue entier, recensé.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour les fractions sur la droite, l'option clavier ne fonctionne
// jamais, est ce le cas pour beaucoup d'exercices. »
//
// LA SECONDE PHRASE EST LA DEMANDE. Il ne demande pas de réparer un exercice,
// il demande COMBIEN sont dans ce cas — et c'est la troisième fois en deux
// jours qu'il pose une question sous cette forme. Un recensement qu'on refait
// à la main à chaque fois est un recensement qu'on ne refait pas.
//
// ── CE QU'ON INTERROGE, ET POURQUOI C'EST LA BONNE SOURCE ──────────────────
//
// `formesPossibles` est la fonction que le PANNEAU DE RÉGLAGES consulte pour
// décider s'il montre « Autoriser le clavier ». On lui pose donc exactement la
// question que le logiciel se pose, sur de vraies questions tirées du
// générateur — pas sur une lecture du code.
//
// CE QUI FERME LE CLAVIER, EN UNE LIGNE : le pavé n'écrit que des chiffres.
// Une réponse qui n'est ni un nombre (`Number.isFinite`) ni une suite de cases
// (« 5|30 ») ne peut pas y être tapée. « 1/3 », « pair », « [AB) », une grille
// de sudoku : l'escalier s'arrête aux propositions, et c'est juste.
//
//     node tools/clavierDuCatalogue.mjs           # le compte, et la liste
//     node tools/clavierDuCatalogue.mjs --tout    # avec ceux qui l'ont
//
// CE QUE LE NOMBRE NE DIT PAS : qu'un exercice DEVRAIT se taper. Une grille de
// Sudoku se remplit case par case, « pair ou impair » se choisit — ces deux-là
// sont dans la liste et c'est très bien. La liste sert à REGARDER, pas à
// corriger en masse.

import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator, getActivity } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { formesPossibles, itemPeutAllerAuClavier } from '../js/core/aide.js';

const TOUT = process.argv.includes('--tout');
const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
const jaune = (t) => `\x1b[33m${t}\x1b[0m`;

const jamais = [], parfois = [], toujours = [];
let sansGenerateur = 0;

for (const exo of exercices) {
    const gen = getGenerator(exo.generatorId);
    if (!gen || typeof gen.generate !== 'function') { sansGenerateur++; continue; }
    const act = getActivity(exo.activityId);
    const formes = formesPossibles(exo, gen, (g) => makeRng(exo.id + g), 18);
    // UN EXEMPLE DE RÉPONSE DIT POURQUOI mieux qu'une explication : « 1/3 »,
    // « pair », « g001011/… » se passent de commentaire.
    let exemple = '—';
    try {
        const it = gen.generate({ ...(exo.params || {}) },
            { rng: makeRng(exo.id + 'ex'), index: 0 });
        exemple = JSON.stringify(it && it.answer);
    } catch (e) { exemple = '(ne se tire pas)'; }
    const ligne = {
        id: exo.id, titre: String(exo.title || '').slice(0, 30),
        activite: exo.activityId || '?',
        accepte: act ? (act.accepts || []).join('+') : '?',
        exemple: String(exemple).slice(0, 34)
    };
    if (!formes.clavier) { jamais.push(ligne); continue; }
    // TOUJOURS, OU SEULEMENT PARFOIS ? Un générateur à marches peut n'offrir le
    // pavé que sur certaines d'entre elles — et c'est ce mélange-là qui donne
    // l'impression que « ça marche une fois sur deux ».
    let n = 0;
    const tirages = 12;
    for (let i = 0; i < tirages; i++) {
        try {
            const it = gen.generate({ ...(exo.params || {}) },
                { rng: makeRng(exo.id + 'c' + i), index: i });
            if (itemPeutAllerAuClavier(it)) n++;
        } catch (e) { /* une question qui jette ne compte pas */ }
    }
    (n === tirages ? toujours : parfois).push({ ...ligne, part: `${n}/${tirages}` });
}

const avecGenerateur = exercices.length - sansGenerateur;
console.log(`\n${exercices.length} exercices · ${sansGenerateur} sans générateur`
    + ` · ${avecGenerateur} recensés`);
console.log(`  ${vert('clavier TOUJOURS possible')} : ${toujours.length}`);
console.log(`  ${jaune('clavier PARFOIS possible ')} : ${parfois.length}`);
console.log(`  ${gris('clavier JAMAIS possible  ')} : ${jamais.length}`);

const dire = (titre, liste, part) => {
    if (!liste.length) return;
    console.log(`\n── ${titre}\n${'─'.repeat(74)}`);
    for (const l of liste) {
        console.log(`  ${l.id.padEnd(26)} ${l.titre.padEnd(31)}`
            + `${(part ? l.part : l.activite).padEnd(14)} ${l.exemple}`);
    }
};
dire('le clavier n\'y vient JAMAIS — la réponse ne se tape pas sur des chiffres',
    jamais, false);
dire('il n\'y vient que SUR CERTAINES QUESTIONS', parfois, true);
if (TOUT) dire('et ceux où il vient toujours', toujours, true);
else console.log(`\n${gris('(--tout pour voir aussi les ' + toujours.length
    + ' où il vient toujours)')}`);
