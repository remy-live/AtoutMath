// ON MARTÈLE « VALIDER », ET L'EXERCICE DOIT SURVIVRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre : « L'exercice Règle sur les puissances a bloqué pour une
// élève, elle ne pouvait plus appuyer sur Valider ».
//
// ── LE DÉFAUT, RELEVÉ AU CLAVIER DANS UN VRAI NAVIGATEUR ─────────────────
//
//     valider rang=0 → TROIS RATAGES → minuteur 2200        (A)
//     valider rang=0 → TROIS RATAGES → minuteur 2200        (B)
//     etapeSuivante depuis rang=0     (A) → rang 1
//     valider rang=1 (la ligne finale) → la réponse part
//     etapeSuivante depuis rang=1     (B) → rang 2
//     valider rang=2 → etapes[2] est `undefined` → TypeError
//
// AU TROISIÈME RATAGE ON POSE LA LIGNE ET L'ON ATTEND 2,2 SECONDES. Le bouton
// restait allumé et `ratages` restait à trois : l'élève qui réappuie — ce que
// tout le monde fait quand l'écran dit « on la pose ensemble, et on continue »
// — posait un SECOND minuteur. Les deux avançaient l'étape, la ligne finale
// était sautée, `rang` sortait du tableau, et chaque clic suivant jetait. Le
// bouton ne faisait plus rien, et la question était morte.
//
// ── CE QUE CETTE SONDE FAIT, ET POURQUOI AUCUNE ÉPREUVE NE LE FERAIT ─────
//
// Les activités ne s'éprouvent pas sous Node : elles touchent le document dès
// qu'on les importe. Et le défaut est une COURSE ENTRE DEUX MINUTEURS — il ne
// se lit pas dans la source, il se joue. On tape donc une réponse fausse, on
// martèle le bouton pendant que la ligne s'efface, et l'on regarde deux
// choses : aucune erreur de page, et l'exercice AVANCE encore.
//
// `tests/foyerDeLaSaisie.test.mjs` garde l'autre moitié — qu'un seul endroit
// appelle `etapeSuivante`, et que `rang` reste dans le tableau.
//
//     node tools/validerNeBloquePlus.mjs

import { ouvrirSonde } from './sonde.mjs';

// LES TROIS EXERCICES « PAS À PAS » DE TROIS CHAPITRES : le défaut est dans
// `litteralSaisie`, donc dans tous, et une sonde qui n'en regarde qu'un dirait
// « corrigé » le jour où un quatrième chemin le rouvrira.
const EXOS = [
    ['num-puissances-regles', { etapes: 'oui' }],
    ['num-puissances-calcul-pas', {}],
    ['cf-pas', {}],
    ['fac-pas', {}]
];

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
let tout = true;
const ok = (b, q, d = '') => {
    console.log(`${b ? '  ok  ' : '  NON '} ${q}${d ? ` — ${d}` : ''}`);
    return b;
};

try {
    for (const [id, params] of EXOS) {
        const raté = await s.ouvrirExercice(id, params, { questions: 10 });
        if (raté) { console.log(`  (${id} : ${raté})`); continue; }
        if (!await s.page.$('[data-valider]')) {
            console.log(`  (${id} : pas de bouton Valider, forme différente)`);
            continue;
        }
        const avant = s.erreurs.length;
        const enonces = new Set();
        for (let tour = 0; tour < 14; tour++) {
            const banniere = await s.page.$('.fb-close');
            if (banniere) { await banniere.click(); await attendre(700); continue; }
            // CE QU'ON SUIT N'EST PAS L'ÉNONCÉ SEUL, MAIS L'ÉNONCÉ ET LA LIGNE
            // EN COURS. Une chaîne de quatre lignes ne change pas d'énoncé en
            // quatorze tours quand on répond faux à chaque fois — et elle
            // avance pourtant. Ce qui dit « bloqué », c'est que RIEN ne bouge.
            enonces.add(await s.page.evaluate(() =>
                (document.querySelector('.game-question')?.textContent || '').trim()
                + ' | ' + (document.querySelector('.ls-ligne--active .ls-quoi')?.textContent
                    || '(aucune ligne)').trim()));
            // UNE RÉPONSE FAUSSE, PUIS LE MARTEAU. « 12 » est faux presque
            // partout, et c'est ce qu'on veut : on cherche le troisième ratage.
            await s.page.keyboard.type('12', { delay: 30 });
            await attendre(200);
            // TROIS CLICS EN RAFALE, sans attendre : c'est exactement le geste
            // de l'élève devant un écran qui ne répond pas tout de suite.
            for (let c = 0; c < 3; c++) {
                const actif = await s.page.evaluate(() => {
                    const b = document.querySelector('[data-valider]');
                    return !!b && !b.disabled;
                });
                // UN CLIC QUI N'ABOUTIT PAS N'EST PAS UNE PANNE : le voile de
                // correction intercepte, et c'est ce qu'il doit faire. L'élève
                // non plus ne passe pas au travers. On tape, on continue.
                if (actif) {
                    try { await s.page.click('[data-valider]', { timeout: 1200 }); }
                    catch (e) { /* recouvert : c'est la règle, pas un défaut */ }
                }
                await attendre(120);
            }
            await attendre(900);
        }
        const neuves = s.erreurs.length - avant;
        tout = ok(neuves === 0, `${id} : aucune erreur de page sous le marteau`,
            neuves ? s.erreurs[avant].slice(0, 110) : '') && tout;
        // ET L'EXERCICE AVANCE ENCORE : un écran bloqué garde le même énoncé.
        tout = ok(enonces.size > 1, `${id} : l'exercice avance encore`,
            `${enonces.size} état(s) traversé(s)`) && tout;
    }
} finally {
    console.log(`\nfenêtres natives et erreurs de page : `
        + `${s.fenetresNatives.length + s.erreurs.length}`);
    for (const e of s.erreurs) console.log(`    ${e.slice(0, 140)}`);
    await s.fermer();
}

function attendre(ms) { return new Promise(ok2 => setTimeout(ok2, ms)); }

console.log(tout ? '\nLE BOUTON RÉPOND TOUJOURS.' : '\nUN EXERCICE S\'EST BLOQUÉ.');
process.exit(tout ? 0 : 1);
