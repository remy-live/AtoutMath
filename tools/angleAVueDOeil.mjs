// « À VUE D'ŒIL » — l'exercice joué au doigt, sur un vrai écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/angleAVueDOeil.mjs
//
// ── CE QUE LES ÉPREUVES DE NOYAU NE PEUVENT PAS DIRE ───────────────────────
//
// `tests/estimerAngle.test.mjs` garde le barème, le tirage et le tracé du
// secteur. Il ne dit rien de ce qui fait l'exercice :
//
//   · QU'AUCUNE GRADUATION N'APPARAÎT. C'est la règle du jeu : un fond
//     quadrillé donnerait des directions à 45°, et l'on mesurerait la
//     géométrie au lieu de l'œil.
//   · QUE RIEN NE BOUGE AVANT LE PARI. Si le dessin suivait le nombre, on
//     ajusterait jusqu'à ce que ça colle — et l'exercice d'estimation
//     deviendrait un jeu d'adresse. ON LE MESURE EN COMPTANT LES PIXELS
//     AVANT ET APRÈS avoir changé le pari : la toile doit être IDENTIQUE.
//   · QUE L'ÉCART SE VOIT APRÈS, en orange, par-dessus l'angle vrai.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1100, hauteur: 1000 });
await s.identifier();
const raté = await s.ouvrirExercice('geo-estimer-angle', {}, { questions: 5 });
if (raté) throw new Error(`ouverture : ${raté}`);
await dormir(900);

await s.doitExister('.ea-dessin', 'le dessin de l\'angle');
await s.doitExister('[data-ea-valeur]', 'le nombre parié');
await s.doitExister('[data-ea-go]', 'le bouton « Je parie ! »');
await s.doitExister('[data-ea-pas="10"]', 'le bouton « +10 »');

/** Ce que porte le dessin : les traits, les textes, et leur contenu. */
const dessin = () => s.page.evaluate(() => {
    const svg = document.querySelector('.ea-dessin');
    if (!svg) return null;
    return {
        html: svg.innerHTML,
        traits: svg.querySelectorAll('line').length,
        textes: [...svg.querySelectorAll('text')].map(t => t.textContent),
        pointille: svg.querySelectorAll('.ea-pariCote').length,
        ecart: svg.querySelectorAll('.ea-ecart').length,
        grains: svg.querySelectorAll('.ea-grain').length
    };
});
const valeur = () => s.page.textContent('[data-ea-valeur]');

const avant = await dessin();
dire('le dessin porte les deux côtés de l\'angle, et le point d\'interrogation',
    avant.traits === 2 && avant.textes.includes('?'),
    `${avant.traits} traits · textes ${JSON.stringify(avant.textes)}`);

// ── AUCUNE GRADUATION ──────────────────────────────────────────────────────
//
// On compte les textes : avant le pari il n'y en a qu'UN, le « ? ». Des
// graduations se verraient immédiatement — il y en aurait des dizaines.
dire('AUCUNE GRADUATION NI AUCUN NOMBRE AVANT LE PARI',
    avant.textes.length === 1 && avant.pointille === 0,
    `${avant.textes.length} texte(s) sur le dessin`);
// ET LE FOND N'EST QU'UNE TRAME DE POINTS : un quadrillage donnerait des
// directions à 45°, et l'on mesurerait la géométrie au lieu de l'œil.
dire('et le fond est une trame de points, jamais un quadrillage',
    avant.grains > 100 && !/<line[^>]*ea-grain/.test(avant.html),
    `${avant.grains} points`);

// ── RIEN NE BOUGE AVANT LE PARI ────────────────────────────────────────────
const depart = await valeur();
for (let i = 0; i < 3; i++) { await s.page.click('[data-ea-pas="10"]'); await dormir(90); }
await s.page.click('[data-ea-pas="1"]');
await dormir(200);
const change = await valeur();
const pendant = await dessin();
dire('LES BOUTONS CHANGENT LE PARI', change !== depart, `${depart} → ${change}`);
dire('MAIS LE DESSIN NE BOUGE PAS D\'UN PIXEL — sinon on viserait au lieu d\'estimer',
    pendant.html === avant.html, pendant.html === avant.html ? 'toile identique'
        : 'la toile a changé pendant qu\'on réglait le pari');

// ── LE CLAVIER AUSSI, ET AVANT DE PARIER ──────────────────────────────────
//
// Au tableau, Rémy n'a pas toujours la souris en main. ON LE MESURE AVANT LE
// PARI : après, le réglage est verrouillé — c'est voulu, on ne change pas son
// pari une fois posé — et la sonde concluait « les flèches ne font rien ».
const avantClavier = await valeur();
await s.page.keyboard.press('ArrowUp');
await s.page.keyboard.press('ArrowUp');
await dormir(250);
const apresClavier = await valeur();
dire('LES FLÈCHES DU CLAVIER RÈGLENT LE PARI',
    apresClavier !== avantClavier, `${avantClavier} → ${apresClavier}`);

// ── APRÈS LE PARI, L'ÉCART SE VOIT ─────────────────────────────────────────
await s.page.click('[data-ea-go]');
await dormir(700);
const apres = await dessin();
dire('APRÈS LE PARI, LE TRAIT POINTILLÉ ET L\'ÉCART APPARAISSENT',
    apres.pointille === 1 && apres.ecart === 1,
    `${apres.pointille} trait(s) pointillé(s), ${apres.ecart} secteur(s) d'écart`);
dire('et la vraie mesure s\'écrit sur le dessin',
    apres.textes.length >= 2 && apres.textes.some(t => /°$/.test(t)),
    JSON.stringify(apres.textes));

const verdict = await s.page.textContent('[data-ea-verdict]');
const propre = verdict.replace(/\s+/g, ' ').trim();
dire('LE VERDICT DONNE DES POINTS, ET NE DIT JAMAIS « FAUX »',
    /points/i.test(propre) && !/faux|raté/i.test(propre), propre.slice(0, 90));

const total = await s.page.textContent('[data-ea-total]');
dire('et le total de la partie s\'affiche', /\d+ pts/.test(total), total);

// ET LE PARI EST VERROUILLÉ : on ne se ravise pas après avoir vu la réponse.
const fige = await valeur();
await s.page.keyboard.press('ArrowUp');
await dormir(200);
dire('ET LE PARI SE VERROUILLE — on ne se ravise pas après avoir vu l\'angle',
    (await valeur()) === fige, `resté à ${fige}`);

await s.photo('.ea-layout', 'tools/tmp/angle-apres.png', 0);

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.fermer();
console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
