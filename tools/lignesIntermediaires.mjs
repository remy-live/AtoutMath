// UNE LIGNE INTERMÉDIAIRE JUSTE DOIT ÊTRE ACCEPTÉE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui, sur « Enlever les parenthèses » :
//
//     −(+3) − (−7)
//     « Réécris la ligne SANS parenthèses. Ne la calcule pas encore. »
//     il tape −3+7, bordure ROUGE : « il me compte faux »
//
// IL AVAIT RAISON, ET LE JUGE NE JUGEAIT RIEN. `validerEtape` lisait
// `e.verifie` — un champ que PERSONNE ne fournit dans tout le dépôt. Le verdict
// valait donc `false` à tous les coups : toute ligne intermédiaire était
// refusée, y compris celle que l'activité finit par écrire elle-même.
//
// ── TROIS MESURES FAUSSES AVANT LA BONNE, ET ELLES SE RESSEMBLENT ───────────
//
// 1. LE CHAMP N'EST PAS UN `<input>`. Le vider par `textContent = ''` efface
//    les trois `<span>` qui le composent ; tout ce qui suit mesure un champ
//    démoli. On efface par la touche ⌫, comme l'élève.
// 2. LE CLAVIER PHYSIQUE N'ACCEPTE PAS LES PARENTHÈSES — son écoute ne connaît
//    que les chiffres, les lettres, `+`, `^` et le trait d'union. On tape donc
//    sur le PAVÉ DE L'ÉCRAN, qui porte exactement les touches autorisées.
// 3. ROUVRIR L'EXERCICE TIRE UNE NOUVELLE QUESTION. Ma sonde faisait écrire la
//    réponse par le logiciel, rouvrait, puis la retapait : elle retapait la
//    réponse de la question PRÉCÉDENTE et accusait le logiciel de refuser une
//    ligne juste qui ne l'était pas.
//
// D'OÙ LA RÈGLE DE CELLE-CI : elle lit l'énoncé À L'ÉCRAN et refait le calcul
// de son côté. Elle ne doit sa réponse à personne.
//
//   node tools/lignesIntermediaires.mjs
//
import { ouvrirSonde } from '../tools/sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

/**
 * LA LIGNE SANS PARENTHÈSES DE « −(a) op (b) », calculée ici.
 *
 * On ne traite QUE cette forme — celle de la capture. Les barreaux qui
 * calculent d'abord l'intérieur d'une parenthèse demandent une autre ligne, et
 * une sonde qui prétendrait la deviner mesurerait sa propre arithmétique.
 */
function attendueDe(enonce) {
    const t = String(enonce).replace(/\s+/g, ' ');
    const m = t.match(/−\(([−+])(\d+)\) ([−+]) \(([−+])(\d+)\)/);
    if (!m) return null;
    const a = (m[1] === '−' ? -1 : 1) * Number(m[2]);
    const b = (m[4] === '−' ? -1 : 1) * Number(m[5]);
    const t1 = -a;
    const c2 = m[3] === '+' ? b : -b;
    return (t1 < 0 ? '−' : '') + Math.abs(t1) + (c2 < 0 ? '−' : '+') + Math.abs(c2);
}

const s = await ouvrirSonde({ largeur: 900, hauteur: 950 });
await s.identifier();

/** Tape un texte SUR LE PAVÉ DE L'ÉCRAN, puis valide. */
const taper = async (texte) => {
    for (let k = 0; k < 24; k++) {
        const reste = await s.page.evaluate(() =>
            ((document.querySelector('[data-texte]') || {}).textContent || '').length);
        if (!reste) break;
        const eff = await s.page.$('[data-eff]');
        if (!eff) break;
        await eff.click();
    }
    for (const c of texte) {
        if (c === ' ') continue;                     // le pavé n'a pas d'espace
        const t = await s.page.$(`.ls-t[data-t="${c}"]`);
        if (!t) return { ok: false, ko: false, tape: '', note: `pas de touche « ${c} »` };
        await t.click();
        await dormir(40);
    }
    await dormir(180);
    const bouton = await s.page.$('[data-valider]');
    if (bouton) await bouton.click();
    // ON ATTEND QUE L'ÉTAPE SUIVANTE SOIT MONTÉE : l'activité laisse 700 ms
    // avant de passer à la ligne d'après.
    await dormir(1100);
    return s.page.evaluate(() => {
        const c = document.querySelector('[data-champ]');
        const l0 = document.querySelector('.ls-chaine [data-val="0"]');
        return {
            // LA CLASSE SUR LE CHAMP NE DIT PLUS RIEN UNE FOIS L'ÉTAPE PASSÉE :
            // le champ est vidé et repeint pour la ligne suivante. Ce qui
            // reste, et qui est la vraie trace, c'est la LIGNE ÉCRITE dans la
            // chaîne — et le fait qu'elle porte ou non « donnee », la marque
            // des lignes que le logiciel a posées à la place de l'élève.
            ko: !!(c && c.classList.contains('ls-champ--ko')),
            posee: l0 ? (l0.textContent || '').replace(/\s+/g, '') : '',
            donnee: !!(l0 && l0.classList.contains('ls-membre--donnee')),
            tape: (document.querySelector('[data-texte]') || {}).textContent || '',
            note: (document.querySelector('[data-note]') || {}).textContent || ''
        };
    });
};

// TROIS TIRAGES, PAS UN. Le signe de a, celui de b et l'opérateur changent la
// ligne attendue ; une seule mesure passerait à côté de trois cas sur quatre.
let mesures = 0;
for (let essai = 0; essai < 5 && mesures < 3; essai++) {
    const raté = await s.ouvrirExercice('calc-oppose-enlever', { marches: ['deuxNombres'] });
    await dormir(1400);
    if (raté) { dire('l\'exercice s\'ouvre', false, raté); break; }

    const depart = await s.page.evaluate(() => ({
        enonce: (document.querySelector('.game-question') || {}).textContent || '',
        etapes: document.querySelectorAll('.ls-chaine .ls-quoi').length,
        titre: (document.querySelector('.ls-chaine .ls-quoi') || {}).textContent || ''
    }));
    const ligne = attendueDe(depart.enonce);
    if (!ligne) continue;                            // un autre tirage, on repasse
    mesures += 1;

    console.log(`\n\x1b[1m${depart.enonce.replace(/\s+/g, ' ').trim()}\x1b[0m`);
    console.log(gris(`     « ${depart.titre.trim()} » → la ligne vaut « ${ligne} »`));
    dire('l\'exercice s\'écrit bien ligne à ligne', depart.etapes >= 2, `${depart.etapes}`);

    const verdict = await taper(ligne);
    dire(`la ligne « ${ligne} » est acceptée`,
        verdict.posee === ligne.replace(/\s/g, '') && !verdict.donnee && !verdict.ko,
        `posée « ${verdict.posee} » · donnée par le logiciel ${verdict.donnee} · `
        + verdict.note.trim().slice(0, 40));

    // ET CE QUI EST FAUX RESTE FAUX : un juge qui dit oui à tout ne vaudrait
    // pas mieux que celui qui disait non à tout.
    const faux = await taper('987');
    dire('et une ligne fausse est bien refusée', faux.ko,
        `ko ${faux.ko} · « ${faux.note.trim().slice(0, 40)} »`);
}

dire('trois tirages mesurés', mesures === 3, `${mesures}`);
dire('aucune erreur de page, aucune fenêtre native',
    s.erreurs.length === 0 && s.fenetresNatives.length === 0,
    `${s.erreurs.length} / ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach((e) => console.log(gris('      ' + e)));
await s.fermer();
console.log(ratés ? rouge(`\n${ratés} raté(s).`) : vert('\nUNE LIGNE JUSTE EST ACCEPTÉE.'));
process.exit(ratés ? 1 : 0);
