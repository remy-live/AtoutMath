// « LE COLONNE LUNDI, MARDI, MERCREDI N'ONT PAS LA MÊME TAILLE. »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture d'écran à l'appui, sur « La grande énigme des parapluies ».
// Mesuré avant correction, en 1280 × 800 : Lundi 46 px, Mardi 96 px,
// Mercredi 150 px. Un tableau se lit en COLONNES, et trois colonnes de
// largeurs différentes se lisent comme trois choses d'importance différente ;
// ici elles disent seulement que « Mercredi » a trois lettres de plus.
//
// CE QUE CETTE SONDE MESURE, et qu'aucune lecture de code ne donne : la
// largeur PEINTE de chaque colonne, sur plusieurs tirages — les en-têtes
// viennent de l'énoncé, et le prochain tableau parlera de parfums de glace ou
// de demi-journées.
//
//   node tools/colonnesDuTableauCroise.mjs
//
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

const s = await ouvrirSonde({ largeur: 1280, hauteur: 800 });
await s.identifier();
await s.ouvrirExercice('don-tableau-croise');
await dormir(1200);
await s.doitExister('.tc-table th', 'les en-têtes du tableau croisé');

/** Les colonnes telles qu'elles se peignent, et les intitulés de lignes. */
const lire = () => s.page.evaluate(() => {
    const tetes = [...document.querySelectorAll('.tc-table thead th')];
    const lignes = [...document.querySelectorAll('.tc-table .tc-tete-ligne')];
    const px = (e) => Math.round(e.getBoundingClientRect().width);
    // UN TITRE QUI DÉBORDE DE SA CASE est le risque exact de la correction :
    // une largeur fixe trop courte coupe « Après-midi » ou le fait passer à la
    // ligne. `scrollWidth` est la seule façon de le voir.
    const deborde = (e) => e.scrollWidth > e.clientWidth + 1;
    return {
        titres: tetes.map((e) => (e.textContent || '').trim()),
        largeurs: tetes.map(px),
        debordent: tetes.filter(deborde).map((e) => (e.textContent || '').trim()),
        intitules: lignes.map((e) => (e.textContent || '').trim()),
        largeurTete: lignes.length ? px(lignes[0]) : 0,
        debordeTete: lignes.filter(deborde).map((e) => (e.textContent || '').trim()),
        // Deux lignes de haut veut dire que le mot est passé à la ligne.
        hauteurTete: tetes.length ? Math.round(tetes[1].getBoundingClientRect().height) : 0
    };
});

// PLUSIEURS TIRAGES : les en-têtes viennent de l'énoncé, et c'est justement
// leur longueur qui décidait de tout. Un seul tableau ne mesure qu'un énoncé.
for (let tour = 1; tour <= 4; tour++) {
    const v = await lire();
    // La première case est le coin vide, la dernière est « Total ».
    const jours = v.largeurs.slice(1);
    const ecart = Math.max(...jours) - Math.min(...jours);
    console.log(`\n\x1b[1mTIRAGE ${tour}\x1b[0m  ${v.titres.slice(1).join(' · ')}`);
    console.log('   largeurs : ' + jours.join(' / ') + ' px'
        + gris(`   (intitulés : ${v.intitules.join(' · ')} → ${v.largeurTete} px)`));
    dire(`les ${jours.length} colonnes ont la même largeur`, ecart <= 1, `écart de ${ecart} px`);
    dire('aucun en-tête ne déborde de sa case', !v.debordent.length, v.debordent.join(' | '));
    dire('aucun intitulé de ligne ne déborde', !v.debordeTete.length, v.debordeTete.join(' | '));
    dire('aucun en-tête ne passe à la ligne', v.hauteurTete <= 40, `${v.hauteurTete} px de haut`);
    if (tour === 1) await s.photo('.tc-table', 'tools/tmp/tableau-croise.png');
    if (tour < 4) {
        await s.page.click('[data-autre], .tc-btn--autre, button:has-text("Autre tableau")')
            .catch(() => s.page.evaluate(() => [...document.querySelectorAll('button')]
                .find((b) => /autre tableau/i.test(b.textContent || ''))?.click()));
        await dormir(900);
    }
}

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));
await s.fermer();
console.log(ratés || s.erreurs.length ? rouge(`\n${ratés} mesure(s) en échec.`)
    : vert('\nLes colonnes ont toutes la même largeur.'));
process.exit(ratés || s.erreurs.length ? 1 : 0);
