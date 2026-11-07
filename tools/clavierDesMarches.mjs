// OÙ L'ÉLÈVE NE PEUT RIEN TAPER — on le MESURE marche par marche.
//
// Rémy, dans le carnet de son relevé du 23 octobre : « Et pour la
// décompoisiton, il n'y a pas de clavier ». Deux captures à l'appui, sur son
// Mac, dans un volet de 1120 px, en v1087.
//
// ON NE DÉDUIT RIEN. On monte CHAQUE marche de `num.pgcd-ppcm` sur les deux
// exercices qui l'emploient — l'un en `numpad`, l'autre en `bubbles` — et l'on
// demande à la page ce qu'elle offre pour répondre.

import { ouvrirSonde } from './sonde.mjs';

const MARCHES = ['divisible', 'qui-divise', 'liste-diviseurs', 'premier-petit', 'par-quoi',
    'le-quotient', 'decomposer-petit', 'premier', 'potence', 'decomposer', 'recomposer',
    'pgcd-liste', 'ppcm-liste', 'exposant', 'pgcd', 'ppcm', 'entre-eux', 'irreductible',
    'melange', 'paquets', 'ensemble', 'carre'];

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

const s = await ouvrirSonde({ largeur: 1120, hauteur: 900 });
await s.identifier();

for (const exo of ['num-pgcd-ppcm', 'num-divisibilite']) {
    console.log(`\n${exo}\n${'─'.repeat(72)}`);
    for (const marche of MARCHES) {
        const raté = await s.ouvrirExercice(exo, { marches: [marche], aide: 'clavier' },
            { questions: 1 });
        if (raté) { console.log(`  ${rouge('???')} ${marche} — ${raté}`); continue; }
        const vu = await s.page.evaluate(() => {
            const vis = (el) => {
                if (!el) return false;
                const r = el.getBoundingClientRect();
                return r.width > 2 && r.height > 2;
            };
            const q = document.querySelector('.game-question, .numpad-context, #game-board');
            return {
                question: ((q && q.innerText) || '').trim().replace(/\s+/g, ' ').slice(0, 70),
                pave: vis(document.querySelector('.numpad-device')),
                choix: document.querySelectorAll('.np-choix-btn, .bubble, .choice-btn').length,
                trous: document.querySelectorAll('[data-trou]').length,
                champs: document.querySelectorAll('#game-layer input, #game-layer textarea').length
            };
        });
        const peutRepondre = vu.pave || vu.choix > 0 || vu.champs > 0;
        console.log(`  ${peutRepondre ? vert('ok  ') : rouge('RIEN')} ${marche.padEnd(16)}`
            + ` pavé:${vu.pave ? 'oui' : 'non'} choix:${String(vu.choix).padEnd(2)}`
            + ` trous:${String(vu.trous).padEnd(2)} champs:${vu.champs}`
            + gris(`  « ${vu.question} »`));
    }
}

console.log(`\n${'─'.repeat(72)}\nfenêtres natives et erreurs de page : `
    + `${s.fenetresNatives.length + s.erreurs.length}`);
if (s.erreurs.length) console.log(gris(s.erreurs.slice(0, 4).join('\n')));
await s.fermer();
