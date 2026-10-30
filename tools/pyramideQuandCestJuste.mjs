// « QUAND C'EST BON, IL FAUT DIRE QU'IL A EU BON ET PROPOSER UNE NOUVELLE. »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour les pyramides quand c'est bon et que l'élève a cliqué vérifié
// il faut dire qu'il a eu bon et proposer une nouvelle pyramide, j'ai une élève
// qui n'a pas compris qu'il fallait faire cela ».
//
// CE QU'IL FAUT MESURER N'EST PAS « EST-CE QUE ÇA MARCHE » : la pyramide se
// terminait très bien, la tentative était enregistrée, le point était compté.
// Ce qu'il faut mesurer, c'est CE QUE L'ÉLÈVE VOIT à la seconde où elle a fini
// — et une élève a répondu à cette question mieux que nous : elle n'a pas
// compris qu'il fallait toucher « Nouvelle pyramide ».
//
// ET LA MESURE A CORRIGÉ L'HISTOIRE QU'ON SE RACONTAIT. La victoire ne vient
// PAS de « Vérifier » : `taper()` termine la pyramide dès le dernier chiffre
// juste. Quand l'élève touche « Vérifier » — ce que son professeur lui a appris
// à faire —, la partie est déjà gagnée, et `verifier()` sort sur son
// `if (this.fini) return`. Elle a donc touché un bouton MORT, sous un message
// qui décrivait la grille (« Pyramide complète — sommet 79 ») au lieu de lui
// dire qu'ELLE avait eu bon. Rien n'était cassé, et rien ne lui parlait.
//
// ON RÉSOUT DONC LA PYRAMIDE POUR DE VRAI, à travers l'écran, comme elle.
// La solution ne s'invente pas : on lit la grille telle qu'elle est affichée et
// l'on appelle `propager`, le solveur du noyau — celui-là même qui sert à
// fabriquer la pyramide. Réécrire la règle ici en ferait une seconde copie, qui
// se tromperait un jour toute seule.
//
//   node tools/pyramideQuandCestJuste.mjs
//
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
import { propager } from '../js/core/pyramideNombres.js';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

const s = await ouvrirSonde({ largeur: 1280, hauteur: 860 });
await s.identifier();
await s.ouvrirExercice('calc-pyramide-nombres');
await dormir(1200);
await s.doitExister('.pn-case', 'les cases de la pyramide');

/** La grille telle qu'elle est AFFICHÉE : un nombre, ou null. */
const lireLaGrille = () => s.page.evaluate(() => {
    const rangs = [...document.querySelectorAll('.pn-rang')];
    return rangs.map((r) => [...r.querySelectorAll('.pn-case')].map((c) => {
        const t = (c.textContent || '').trim();
        return t === '' ? null : Number(t);
    }));
});

const connu = await lireLaGrille();
console.log('\x1b[1mLA PYRAMIDE\x1b[0m  ' + connu.map((l) =>
    l.map((v) => (v === null ? '·' : v)).join(' ')).join('  |  '));

// `propager` ne lit de son premier argument que la FORME : la grille des
// valeurs connues a exactement celle-là.
const plein = connu.map((l) => l.slice());
const sort = propager(plein, plein);
if (sort !== 'fini') { console.log(rouge('le solveur n\'a pas fini : ' + sort)); }

// On remplit comme l'élève : on vise la case, on tape les chiffres au pavé.
let aEcrire = 0;
for (let k = 0; k < plein.length; k++) {
    for (let i = 0; i < plein[k].length; i++) {
        if (connu[k][i] !== null) continue;
        aEcrire++;
        await s.page.click(`.pn-case[data-k="${k}"][data-i="${i}"]`);
        for (const chiffre of String(plein[k][i])) {
            await s.page.click(`.pn-touche[data-chiffre="${chiffre}"]`);
        }
    }
}
console.log(`${aEcrire} case(s) remplies au pavé, comme au doigt.`);

// ── CE QUE VOIT L'ÉLÈVE QUAND LA DERNIÈRE CASE TOMBE ───────────────────────
//
// On ne clique PAS « Vérifier » : la pyramide est déjà gagnée, et le bouton est
// éteint. C'est justement ce qu'on vient mesurer — qu'il soit ÉTEINT et non
// muet.
await dormir(700);

const vu = await s.page.evaluate(() => {
    const b = (id) => document.getElementById(id);
    const vivant = (e) => !!e && !e.disabled;
    // CE QUI SE VOIT VRAIMENT : la taille, la couleur et le relief du bouton
    // qu'il faudrait toucher, comparés à ceux qu'il ne faut plus toucher.
    const style = (e) => {
        if (!e) return null;
        const c = getComputedStyle(e);
        return { fond: c.backgroundColor, encre: c.color, poids: c.fontWeight,
                 opacite: Number(c.opacity).toFixed(2) };
    };
    const note = document.getElementById('pn-note');
    return {
        note: (note.textContent || '').trim(),
        tonNote: note.className,
        diraitBravo: /bravo|juste|gagn|réussi|bien jou/i.test(note.textContent || ''),
        montreLaSuite: /nouvelle pyramide/i.test(note.textContent || ''),
        verifVivant: vivant(b('pn-verif')),
        aideVivant: vivant(b('pn-aide')),
        neufVivant: vivant(b('pn-neuf')),
        focusSurNeuf: document.activeElement === b('pn-neuf'),
        neuf: style(b('pn-neuf')),
        verif: style(b('pn-verif'))
    };
});

console.log('\n\x1b[1mCE QU\'ELLE VOIT\x1b[0m');
console.log('   la phrase  : ' + (vu.note || gris('(rien)')));
console.log('   « Nouvelle pyramide » : fond ' + vu.neuf.fond + ', encre ' + vu.neuf.encre
    + ', graisse ' + vu.neuf.poids + (vu.focusSurNeuf ? ', AU FOYER' : ''));
console.log('   « Vérifier »          : fond ' + vu.verif.fond + ', encre ' + vu.verif.encre
    + ', graisse ' + vu.verif.poids + (vu.verifVivant ? '' : ', éteint'));

dire('la phrase dit qu\'elle a eu BON', vu.diraitBravo, vu.note);
dire('la phrase dit QUOI FAIRE ensuite', vu.montreLaSuite,
    'sans cela, « Nouvelle pyramide » reste un bouton parmi trois');
dire('« Nouvelle pyramide » ne ressemble plus aux autres',
    vu.neuf.fond !== vu.verif.fond,
    `les deux fonds sont ${vu.neuf.fond}`);
dire('les boutons qui ne font plus rien sont éteints',
    !vu.verifVivant && !vu.aideVivant,
    'c\'est sur « Vérifier » qu\'on retouche quand on ne sait pas quoi faire, '
    + 'et il ne répondait pas');
dire('le foyer est sur « Nouvelle pyramide »', vu.focusSurNeuf,
    'elle vient de taper des chiffres : Entrée doit la mener plus loin');

await s.photo('.pn-wrap', 'tools/tmp/pyramide-gagnee.png');

// ── ET ENTRÉE EN PROPOSE UNE AUTRE ──────────────────────────────────────────
const avant = (await lireLaGrille()).flat().join(',');
await s.page.keyboard.press('Enter');
await dormir(800);
const apres = await lireLaGrille();
dire('Entrée propose une nouvelle pyramide', apres.flat().join(',') !== avant,
    'la grille n\'a pas changé');
dire('et la nouvelle est à trous', apres.flat().some((v) => v === null),
    'une pyramide déjà pleine n\'est pas une nouvelle pyramide');

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));
await s.fermer();
console.log(ratés || s.erreurs.length ? rouge(`\n${ratés} mesure(s) en échec.`)
    : vert('\nL\'élève sait qu\'elle a eu bon, et où aller ensuite.'));
process.exit(ratés || s.erreurs.length ? 1 : 0);
