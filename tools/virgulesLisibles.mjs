// LES VIRGULES DE « POSER » SE VOIENT-ELLES ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant une addition à virgule : « les virgules ne sont pas très
// visibles. »
//
// CE QU'ON MESURE, ET POURQUOI CE CHIFFRE-LÀ. Une taille de police ne dit rien
// de ce qui se voit : une virgule de 26 px n'occupe qu'un fond de glyphe là où
// un chiffre de 26 px en occupe toute la hauteur. On compte donc la SURFACE
// D'ENCRE — les pixels qui s'écartent franchement du fond — et on la rapporte à
// celle des chiffres que la virgule sépare. C'est le rapport que l'œil fait.
//
// MESURÉ AVANT LA CORRECTION : 136 pixels d'encre contre 866 pour le chiffre
// voisin, soit 16 %. Et dans la GRILLE ce n'était même pas une virgule, mais un
// rond rouge de 8 px que la photo fait lire comme une puce de liste.
//
// ON REGARDE AUSSI CE QU'ON N'A PAS CORRIGÉ : la virgule déborde sur une case
// qui se clique (la fente où l'on POSE la virgule, dans la division), donc elle
// doit rester transparente au doigt. Un signe plus gros qui vole le clic
// n'aurait rien réglé du tout.
//
//   node tools/virgulesLisibles.mjs
//
import { ouvrirSonde } from '../tools/sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const ECRANS = [
    { nom: 'ordinateur', largeur: 1100, hauteur: 860 },
    { nom: 'téléphone', largeur: 390, hauteur: 844 }
];
/** En deçà, la virgule redevient le point discret que Rémy ne voyait pas. */
const PART_MINIMALE = 0.35;

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

for (const ecran of ECRANS) {
    const s = await ouvrirSonde({ largeur: ecran.largeur, hauteur: ecran.hauteur });
    await s.identifier();

    // `s.encre` PORTE LA MESURE, cette fois : elle était écrite à la main dans
    // deux sondes jetables avant d'entrer dans la boîte à outils.
    const encre = async (sel) => ((await s.encre(sel)) || { pixels: 0 }).pixels;

    console.log(`\n\x1b[1m${ecran.nom.toUpperCase()} — ${ecran.largeur} px\x1b[0m`);

    // ── LA PLAQUE À FAIRE GLISSER ───────────────────────────────────────────
    await s.ouvrirExercice('calc-poser', { operation: '+', decimales: true, chiffres: 3, termes: 2 });
    await dormir(1200);
    const plaque = await s.page.evaluate(() => {
        const j = document.querySelector('.po-nombre');
        if (!j) return null;
        const v = j.querySelector('.po-virgule');
        return {
            texte: j.textContent,
            virgule: !!v,
            chiffres: j.querySelectorAll('b').length,
            clic: v ? getComputedStyle(v).pointerEvents : ''
        };
    });
    if (!plaque || !plaque.virgule) {
        dire('la plaque porte une virgule', false, plaque ? plaque.texte : 'aucune plaque');
    } else {
        const eV = await encre('.po-nombre .po-virgule');
        const eC = [];
        for (let k = 0; k < plaque.chiffres; k++) {
            eC.push(await encre(`.po-nombre:first-of-type b:nth-of-type(${k + 1})`));
        }
        // LA MOYENNE, ET NON LE PREMIER CHIFFRE : un « 1 » porte deux fois moins
        // d'encre qu'un « 8 », et le tirage change à chaque ouverture. Comparer
        // à un seul chiffre rendait un rapport qui sautait de 40 % d'une mesure
        // à l'autre sans que rien n'ait bougé.
        const moyen = eC.reduce((a, b) => a + b, 0) / Math.max(1, eC.length);
        const part = eV / moyen;
        console.log(gris(`     plaque « ${plaque.texte} » : virgule ${eV} px, chiffre moyen `
            + `${Math.round(moyen)} px`));
        dire(`la virgule de la plaque pèse au moins ${Math.round(PART_MINIMALE * 100)} % d'un chiffre`,
            part >= PART_MINIMALE, `${Math.round(part * 100)} %`);
        dire('et elle ne se saisit pas : on attrape le nombre par un chiffre',
            plaque.clic === 'none', plaque.clic);
    }

    // ── LA GRILLE : UNE VIRGULE, PAS UNE PUCE ───────────────────────────────
    const grille = await s.page.evaluate(() => {
        const c = document.querySelector('.po-case--virgule');
        if (!c) return null;
        const a = getComputedStyle(c, '::after');
        return { contenu: a.content, clic: a.pointerEvents, couleur: a.color };
    });
    if (!grille) dire('une case de la grille porte la virgule', false);
    else {
        dire('la grille dessine une VIRGULE et non un rond', /,/.test(grille.contenu),
            grille.contenu);
        dire('et elle laisse passer le clic de la case qu\'elle déborde',
            grille.clic === 'none', grille.clic);
    }

    // ── LA DIVISION : MÊME SIGNE, ET LA FENTE RESTE CLIQUABLE ───────────────
    await s.ouvrirExercice('calc-poser-division',
        { chiffres: 3, diviseurMax: 9, decimalesQuotient: 2 });
    await dormir(1300);
    const div = await s.page.evaluate(() => {
        const c = document.querySelector('.pl-case--virgule');
        if (!c) return null;
        const a = getComputedStyle(c, '::after');
        const b = c.getBoundingClientRect();
        // CE QUE L'ÉLÈVE TOUCHE À CET ENDROIT-LÀ : on interroge le point où la
        // virgule se peint, sur la frontière droite de la case. Si c'est elle
        // qui répond, la fente de la division est devenue incliquable.
        const sous = document.elementFromPoint(b.right, b.top + b.height / 2);
        return { contenu: a.content, clic: a.pointerEvents,
            dessous: sous ? sous.className : 'rien' };
    });
    if (!div) dire('la division montre la virgule du quotient', false);
    else {
        dire('la division dessine la MÊME virgule que l\'addition', /,/.test(div.contenu),
            div.contenu);
        dire('et le signe ne vole pas le clic de la fente', div.clic === 'none', div.dessous);
    }

    dire('aucune erreur de page, aucune fenêtre native',
        s.erreurs.length === 0 && s.fenetresNatives.length === 0,
        `${s.erreurs.length} / ${s.fenetresNatives.length}`);
    s.erreurs.slice(0, 3).forEach((e) => console.log(gris('      ' + e)));
    await s.fermer();
}

console.log(ratés ? rouge(`\n${ratés} raté(s).`) : vert('\nLES VIRGULES SE VOIENT.'));
process.exit(ratés ? 1 : 0);
