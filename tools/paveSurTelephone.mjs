// LE PAVÉ TIENT-IL DANS UN TÉLÉPHONE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il faut que le pavé numérique apparaissent pour ceux sur portable ».
//
// CE QU'ON MESURE, ET C'EST LA SEULE QUESTION QUI COMPTE : de combien le pavé
// dépasse le bas de l'écran. Un pavé qui EXISTE mais qu'il faut aller chercher
// n'apparaît pas — et rien, sur ces écrans, ne dit qu'il y a quelque chose
// dessous. Vu sur « La Fraction sur la Droite » : 73 px dehors, la rangée du
// zéro et le bouton « Valider » coupés.
//
// POURQUOI UNE SONDE ET PAS UNE ÉPREUVE. La hauteur du contexte dépend de la
// FIGURE tirée, de la longueur de l'énoncé, du bandeau « à toi d'écrire » qui
// ne paraît qu'une fois, et des trois paliers de resserrement de la feuille de
// style. Aucune de ces quatre choses ne se lit dans le code.
//
//     node tools/paveSurTelephone.mjs [largeur] [hauteur]
//
// LES EXERCICES REGARDÉS SONT CEUX QUI PORTENT UNE FIGURE OU DEUX CASES : ce
// sont eux qui remplissent le haut. Un « 7 + 2 = ? » tient toujours.

import { ouvrirSonde } from './sonde.mjs';

const L = Number(process.argv[2]) || 390;
const H = Number(process.argv[3]) || 844;

// LE CAS À MESURER, c'est la PREMIÈRE question au clavier : c'est elle qui
// porte le bandeau d'annonce, donc la plus haute des deux.
const CAS = [
    ['frac-graduation', { aide: 'clavier' }],
    ['mes-duree', { marches: ['difference'], aide: 'clavier' }],
    ['mes-duree', { marches: ['vers-heures'], aide: 'clavier' }],
    ['calc-add', { aide: 'clavier' }],
    ['num-graduations', { aide: 'clavier' }],
    ['num-egypte', { aide: 'clavier' }],
    ['don-statistiques', { aide: 'clavier' }]
];

const s = await ouvrirSonde({ largeur: L, hauteur: H });
await s.identifier();
console.log(`\nécran ${L} × ${H}\n${'─'.repeat(70)}`);
let dehors = 0, vus = 0;
for (const [id, params] of CAS) {
    const raté = await s.ouvrirExercice(id, params, { questions: 4 });
    const nom = id + (params.marches ? ` (${params.marches[0]})` : '');
    if (raté) { console.log(`  ?   ${nom.padEnd(30)} ${raté}`); continue; }
    const vu = await s.page.evaluate(() => {
        const pave = document.querySelector('.numpad-device');
        if (!pave) return { pave: false };
        const r = pave.getBoundingClientRect();
        return {
            pave: true,
            dehors: Math.max(0, Math.round(r.bottom - window.innerHeight)),
            haut: Math.round(r.top)
        };
    });
    if (!vu.pave) { console.log(`  ${'\x1b[90m—\x1b[0m'}   ${nom.padEnd(30)} pas de pavé ici`); continue; }
    vus++;
    if (vu.dehors > 0) dehors++;
    console.log(`  ${vu.dehors ? '\x1b[31m!\x1b[0m' : '\x1b[32mok\x1b[0m'}  ${nom.padEnd(30)}`
        + ` pavé à ${String(vu.haut).padStart(3)} px`
        + (vu.dehors ? `  ·  \x1b[31m${vu.dehors} px dehors\x1b[0m` : '  ·  entier'));
}
console.log(dehors
    ? `\n\x1b[31m${dehors} pavé(s) sur ${vus} dépassent du bas.\x1b[0m`
    : `\n\x1b[32mLes ${vus} pavés tiennent en entier.\x1b[0m`);
console.log('erreurs de page :', s.erreurs.length,
    '· fenêtres natives :', s.fenetresNatives.length);
await s.fermer();
