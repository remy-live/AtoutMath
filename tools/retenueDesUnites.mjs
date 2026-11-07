// LE PETIT ROND AU-DESSUS DES UNITÉS — celui que Rémy a vu.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui sur 554 + 448 : « normalement, il ne devrait pas pour
// l'addition avoir une retenue sur la première colonne non ? »
//
// Non. La retenue d'une colonne VIENT de la colonne à sa droite, et la colonne
// des unités n'a rien à sa droite. Le rond qu'on y dessinait était une case
// qu'on ne remplit jamais — et un élève qui cherche quoi y écrire cherche
// quelque chose qui n'existe pas.
//
// LA RÈGLE EST DANS LE NOYAU (`porteUneRetenue`, `core/poser.js`) et gardée par
// `tests/poser.test.mjs`. Ce que cette sonde ajoute, et qu'aucune épreuve ne
// peut dire : que le ROND, celui que l'élève voit, a bien disparu de la grille.
// Le jeu ne s'importe pas sous Node — il lui faut un `document`.
//
//     node tools/retenueDesUnites.mjs
//
// ON MONTE LE JEU DIRECTEMENT, hors du meneur : son moteur s'exporte
// (`enginePoserOperation`), et l'étape du calcul se rejoint en posant les
// nombres — l'alignement n'est pas le sujet ici.

import { ouvrirSonde } from './sonde.mjs';

const s = await ouvrirSonde({ largeur: 1200, hauteur: 900 });
await s.identifier();

let manques = 0;
for (const operation of ['+', '-']) {
    const vu = await s.page.evaluate(async (op) => {
        const { enginePoserOperation } = await import('./js/games/poserOperation.js');
        const hote = document.createElement('div');
        hote.id = 'essai-poser';
        document.body.appendChild(hote);
        const jeu = enginePoserOperation(hote, false, {});
        jeu.start({ prompt: { text: '' }, meta: { operation: op } },
            { onCorrectAnswer() {}, onWrongAnswer() {} });
        // On pose les deux nombres d'un coup : l'alignement n'est pas le sujet.
        jeu.pose = jeu.operandes.map(v => [...String(v)].reverse()
            .map((c, r) => ({ rang: r, chiffre: Number(c) })));
        jeu.etape = 2;
        jeu.dessiner();
        return {
            ronds: [...hote.querySelectorAll('.po-rond')]
                .map(r => Number(r.dataset.rang)).sort((a, b) => a - b),
            colonnes: jeu.tableau.colonnes.map(c => c.rang),
            // LES OPÉRANDES SONT CELLES DU JEU, et on les DIT : il tire les
            // siennes, et une sonde qui annoncerait « 554 + 448 » sans les
            // relire annoncerait sa propre supposition.
            nombres: jeu.operandes.slice()
        };
    }, operation);

    const ok = !vu.ronds.includes(0) && vu.ronds.length > 0;
    if (!ok) manques++;
    const vert = '\x1b[32mok  \x1b[0m', rouge = '\x1b[31mnon \x1b[0m';
    console.log(`  ${ok ? vert : rouge}« ${operation} » : ronds aux rangs `
        + `${JSON.stringify(vu.ronds)} pour ${vu.nombres.join(` ${operation} `)} `
        + `(colonnes ${JSON.stringify(vu.colonnes)})`);

    // UNE PHOTO DE LA GRILLE : un compte de ronds dit qu'il y en a deux, il ne
    // dit pas de quoi la grille a l'air.
    const nom = operation === '+' ? 'plus' : 'moins';
    await s.photo('.po-grille', `tools/tmp/retenue-${nom}.png`, 12);
    await s.page.evaluate(() => document.getElementById('essai-poser').remove());
}

console.log('\n  erreurs de page :', s.erreurs.length);
s.erreurs.forEach(e => console.log('   ', e));
console.log(manques
    ? `\x1b[31m${manques} opération(s) portent encore un rond sur les unités.\x1b[0m`
    : '\x1b[32mAUCUN ROND SUR LA COLONNE DES UNITÉS.\x1b[0m');
await s.fermer();
process.exitCode = manques ? 1 : 0;
