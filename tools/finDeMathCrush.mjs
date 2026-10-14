// « LÀ ÇA BLOQUE » — LA CARTE DE FIN N'AVAIT AUCUNE SORTIE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui : « là ca bloque, on peut appuyer sur la croix mais
// il faudrait un bouton quitter ou recommencer ».
//
// La carte de fin de Math Crush est PEINTE DANS LE CANEVAS : le sablier, les
// points, le meilleur enchaînement, le tableau des scores. Tout y est, et rien
// n'y répond. La seule sortie est la croix rouge de l'entête, en haut à droite
// de l'écran — hors du regard de celui qui vient de finir, et qui ressemble à
// « annuler ».
//
// CETTE SONDE ATTEND LA FIN DE LA PARTIE POUR DE VRAI. Soixante secondes : le
// chronomètre tourne à l'horloge du système et rien ne permet de l'avancer de
// l'extérieur — c'est le prix de la seule mesure qui dise ce que voit l'élève à
// la seconde où il ne peut plus jouer. On ne la lance pas à chaque commit.
//
//   node tools/finDeMathCrush.mjs
//
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

const s = await ouvrirSonde({ largeur: 1200, hauteur: 900 });
await s.identifier();
await s.ouvrirExercice('calc-math-crush');
await dormir(1500);
await s.doitExister('#game-layer canvas', 'le plateau de Math Crush');

const etat = () => s.page.evaluate(() => {
    const b = [...document.querySelectorAll('.mc-fin-btn')];
    const vu = (e) => {
        const r = e.getBoundingClientRect();
        // CE QUI SE VOIT VRAIMENT : un bouton peut exister, avoir une taille, et
        // se trouver sous le canevas ou hors de l'écran. On demande donc QUI est
        // au centre du bouton.
        const dessus = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { texte: (e.textContent || '').trim(), h: Math.round(r.height),
                 bas: Math.round(r.bottom), devant: !!(dessus && (dessus === e || e.contains(dessus))) };
    };
    const c = document.querySelector('#game-layer canvas');
    return {
        boutons: b.filter((e) => e.offsetParent).map(vu),
        hauteurCanevas: c ? Math.round(c.getBoundingClientRect().bottom) : 0
    };
});

console.log('Au début de la partie : ' + (await etat()).boutons.length + ' bouton(s) de fin.');
dire('rien ne s\'affiche tant qu\'on joue', (await etat()).boutons.length === 0);

console.log(gris('on attend la fin du chronomètre (60 s)…'));
await dormir(63000);
await s.photo('#game-layer', 'tools/tmp/crush-fin.png');

const fin = await etat();
console.log('\n\x1b[1mLA CARTE DE FIN\x1b[0m  ' + (fin.boutons.map((b) => b.texte).join(' · ') || gris('(aucun bouton)')));
dire('il y a deux boutons', fin.boutons.length === 2,
    'Rémy : « il faudrait un bouton quitter ou recommencer »');
dire('on peut REJOUER', fin.boutons.some((b) => /rejouer/i.test(b.texte)));
dire('on peut QUITTER', fin.boutons.some((b) => /quitter/i.test(b.texte)));
dire('ils sont au doigt (44 px au moins)', fin.boutons.every((b) => b.h >= 44),
    fin.boutons.map((b) => b.h + ' px').join(' · '));
dire('ils sont vraiment devant, pas sous le canevas',
    fin.boutons.length > 0 && fin.boutons.every((b) => b.devant));
dire('ils tiennent dans le plateau', fin.boutons.every((b) => b.bas <= fin.hauteurCanevas),
    `bas ${fin.boutons.map((b) => b.bas).join('/')} pour un plateau de ${fin.hauteurCanevas}`);

// ── ET « REJOUER » REJOUE VRAIMENT ──────────────────────────────────────────
await s.page.click('.mc-fin-btn[data-rejouer]');
await dormir(1200);
const apres = await etat();
dire('« Rejouer » referme la carte et relance une partie', apres.boutons.length === 0,
    'les boutons sont restés : la partie n\'a pas repris');
await s.photo('#game-layer', 'tools/tmp/crush-rejoue.png');

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));
await s.fermer();
console.log(ratés || s.erreurs.length ? rouge(`\n${ratés} mesure(s) en échec.`)
    : vert('\nLa fin de partie a une sortie.'));
process.exit(ratés || s.erreurs.length ? 1 : 0);
