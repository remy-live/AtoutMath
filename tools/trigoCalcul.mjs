// LA TRIGONOMÉTRIE QUI CALCULE, SUR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « tu as d'autres idées ? » — et l'inventaire du programme
// répondait : « Trigonométrie (3ème) : on nomme, on ne calcule pas ».
//
// ── CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE ───────────────────────────────
//
// `tests/trigoCalcul.test.mjs` mesure des nombres et des boîtes : la réponse
// suit la figure, les étiquettes ne se touchent pas, le diagnostic ne se
// trompe pas de coupable. Trois choses lui échappent, et chacune rend
// l'exercice inutilisable sans lever la moindre erreur :
//
//   · LA CALCULATRICE. Sans elle, cos(35°) ne se calcule pas — l'exercice
//     entier demande alors l'impossible. Elle vit dans l'interface, pas dans
//     le générateur, et un `calculatrice: true` oublié ne casse rien du tout ;
//   · LA VIRGULE ET L'UNITÉ. « 6,9 » ne se tape pas sans virgule, et une
//     question d'angle qui afficherait « cm » sous le pavé demande autre chose
//     que ce qu'elle dit ;
//   · LA FIGURE À L'ÉCRAN D'UNE TABLETTE. Le triangle porte quatre étiquettes
//     de onze unités dans un carré de cent : réduit à la hauteur que le pavé
//     lui laisse, « 35° » peut tomber sous les dix pixels — et c'est ce
//     nombre-là qu'il faut lire pour répondre.
//
//     node tools/trigoCalcul.mjs
//     node tools/trigoCalcul.mjs --photos

import { ouvrirSonde } from './sonde.mjs';

const photos = process.argv.includes('--photos');
let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

/** Ce qu'on voit de la figure, en pixels d'écran. */
const regarder = (s) => s.page.evaluate(() => {
    const svg = document.querySelector('.tc-figure');
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const textes = [...svg.querySelectorAll('text')].map(t => {
        const b = t.getBoundingClientRect();
        return { t: t.textContent, h: Math.round(b.height) };
    });
    return {
        large: Math.round(r.width), haut: Math.round(r.height),
        bas: Math.round(r.bottom), fenetre: window.innerHeight,
        plusPetit: textes.length ? Math.min(...textes.map(x => x.h)) : 0,
        textes: textes.map(x => x.t).join(' ')
    };
});

async function surUnEcran(largeur, hauteur, nom) {
    console.log(`\n\x1b[1m${nom.toUpperCase()} — ${largeur} × ${hauteur}\x1b[0m`);
    const s = await ouvrirSonde({ largeur, hauteur });
    await s.identifier();
    const ennui = await s.ouvrirExercice('geo-trigo-calcul',
        { marches: ['longueur-produit'] }, { questions: 4 });
    if (ennui) { dire('l\'exercice s\'ouvre', false, String(ennui)); await s.fermer(); return; }
    await s.doitExister('.tc-question');
    await s.doitExister('.tc-figure');
    const vu = await regarder(s);
    dire('le triangle est dessiné', !!vu && /cm/.test(vu.textes),
        vu ? vu.textes : 'aucun .tc-figure');
    dire('il tient dans l\'écran, sans défiler', !!vu && vu.bas <= vu.fenetre,
        vu ? `bas à ${vu.bas} px, fenêtre ${vu.fenetre}` : '');
    // DIX PIXELS EST LE PLANCHER D'UN NOMBRE QU'ON LIT — la même borne que les
    // cotes des figures d'aires : en dessous, un « 6 » et un « 8 » se
    // confondent, et c'est la longueur donnée qu'on lit de travers.
    dire('et ses nombres se lisent', !!vu && vu.plusPetit >= 10,
        vu ? `le plus petit fait ${vu.plusPetit} px` : '');

    // ── LA CALCULATRICE, SANS LAQUELLE RIEN N'EST POSSIBLE ───────────────
    const outils = await s.page.evaluate(() => ({
        calculatrice: !!document.querySelector('#top-btn-calc, [data-outil="calculatrice"],'
            + ' .btn-calc, [aria-label*="alculatrice"]'),
        virgule: [...document.querySelectorAll('.numpad-device button')]
            .some(b => (b.textContent || '').trim() === ','),
        unite: (document.querySelector('.numpad-unit, .np-unite') || {}).textContent || ''
    }));
    dire('la calculatrice est à portée', outils.calculatrice,
        'cos(35°) ne se calcule pas de tête');
    dire('la virgule est au clavier', outils.virgule, '« 6,9 » est une réponse de cet exercice');
    if (photos) await s.photo('#game-layer', `tools/tmp/trigo-${largeur}.png`);
    dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
    dire('aucune fenêtre native', s.fenetresNatives.length === 0,
        s.fenetresNatives.slice(0, 2).join(' | '));
    await s.fermer();
}

await surUnEcran(768, 1024, 'la tablette de Rémy');
await surUnEcran(390, 844, 'un téléphone');

// ── LA MARCHE « CHOISIR » POSE TROIS RAPPORTS, PAS UN PAVÉ ────────────────
console.log('\n\x1b[1mLA MARCHE « QUEL RAPPORT ? »\x1b[0m');
{
    const s = await ouvrirSonde({ largeur: 1100, hauteur: 820 });
    await s.identifier();
    const ennui = await s.ouvrirExercice('geo-trigo-calcul',
        { marches: ['choisir'] }, { questions: 3 });
    if (ennui) { dire('l\'exercice s\'ouvre', false, String(ennui)); }
    else {
        await s.doitExister('.np-choix-btn');
        const vu = await s.page.evaluate(() => {
            const btns = [...document.querySelectorAll('.np-choix-btn')]
                .map(b => (b.textContent || '').trim());
            const pave = document.querySelector('.numpad-device');
            return { btns, chiffres: pave
                ? [...pave.querySelectorAll('button')]
                    .filter(b => /^[0-9]$/.test((b.textContent || '').trim())).length : 0 };
        });
        dire('les trois rapports sont proposés', vu.btns.length === 3, vu.btns.join('  ·  '));
        // ET ILS ONT LA MÊME FORME : « cos(A) = AB / AC ». Une proposition plus
        // détaillée que les autres se repère sans regarder la figure.
        dire('et ils s\'écrivent tous pareil',
            vu.btns.every(b => /^(cos|sin|tan)\([A-Z]\) = [A-Z]{2} \/ [A-Z]{2}$/.test(b)),
            vu.btns.join(' | '));
        dire('le pavé de chiffres s\'efface', vu.chiffres === 0,
            `${vu.chiffres} touches de chiffres`);
        if (photos) await s.photo('#game-layer', 'tools/tmp/trigo-choix.png');
        dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
    }
    await s.fermer();
}

// ── ET L'ANGLE S'ÉCRIT EN DEGRÉS, SANS VIRGULE ────────────────────────────
console.log('\n\x1b[1mLA MARCHE « CALCULER UN ANGLE »\x1b[0m');
{
    const s = await ouvrirSonde({ largeur: 1100, hauteur: 820 });
    await s.identifier();
    const ennui = await s.ouvrirExercice('geo-trigo-calcul',
        { marches: ['angle'] }, { questions: 3 });
    if (ennui) { dire('l\'exercice s\'ouvre', false, String(ennui)); }
    else {
        await s.doitExister('.tc-figure');
        const vu = await s.page.evaluate(() => ({
            question: (document.querySelector('.tc-question') || {}).textContent || '',
            virgule: [...document.querySelectorAll('.numpad-device button')]
                .some(b => (b.textContent || '').trim() === ','),
            figure: (document.querySelector('.tc-figure') || {}).textContent || ''
        }));
        dire('la question porte sur un angle', /angle/i.test(vu.question),
            vu.question.slice(0, 70));
        // DEUX LONGUEURS DONNÉES, ET LE « ? » EST SUR L'ANGLE.
        dire('deux longueurs sont données sur la figure',
            (vu.figure.match(/cm/g) || []).length === 2, vu.figure);
        // LA VIRGULE N'A RIEN À FAIRE ICI : un angle s'arrondit au degré, et
        // une touche inutilisable laisse croire qu'on attend une décimale.
        dire('et la virgule n\'est PAS au clavier', !vu.virgule,
            'un angle s’arrondit au degré');
        dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
    }
    await s.fermer();
}

console.log('\n' + '─'.repeat(64));
console.log(rates ? `\n${rates} POINT(S) À REVOIR.`
    : '\nLA FIGURE SE LIT, LA MACHINE EST LÀ, ET LE RAPPORT SE CLIQUE.');
process.exit(rates ? 1 : 0);
