// LA JONCTION DU RADICAL — le crochet et la barre font-ils UN SEUL trait ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sur une fiche de parcours : « il y a un léger décalage entre la ligne
// horizontale et la fin du V ».
//
// C'est la troisième fois qu'il voit cette couture, et les deux premières
// l'avaient été sur le PDF. Elle revient parce que le radical est fait de DEUX
// objets qui se rejoignent, et que deux objets qui se rejoignent laissent
// toujours une couture quelque part.
//
// ── POURQUOI UNE SONDE, ET POURQUOI SUR L'ENCRE ───────────────────────────
//
// Le défaut ne se calcule pas. Mesurée à la géométrie, la jonction était juste
// à 0,012 px près — et elle se voyait quand même, parce qu'un rectangle REMPLI
// et un tracé TRACÉ ne sont pas anticrénelés de la même façon au même bord.
// Un demi-pixel CSS, soit 42 % de l'épaisseur du trait.
//
// `getBoundingClientRect` ne pouvait pas le dire non plus : la BOÎTE d'un SVG
// n'est pas son TRAIT, et c'est justement l'écart qu'on cherche. On
// photographie donc, et l'on lit le HAUT DE L'ENCRE colonne par colonne.
//
// ── ET POURQUOI À PLUSIEURS TAILLES ───────────────────────────────────────
//
// Mesuré à 13 px : aucune marche. Mesuré à 32 px : une marche d'un pixel et
// une encoche. Un défaut d'arrondi ne se voit pas à la taille où l'on mesure,
// il se voit à celle où l'on regarde — et les fiches, l'écran et le tableau
// n'emploient pas le même corps.
//
//   node tools/jonctionRacine.mjs

import { ouvrirSonde, decoderPng } from './sonde.mjs';

const TAILLES = [11, 13, 15, 16, 18, 20, 24, 28, 32, 40, 56];
const DEDANS = ['81 + 144', '9', '16 + 9', '(9/16)'];

const s = await ouvrirSonde({ largeur: 1400, hauteur: 1000 });
let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`
        + (detail ? `  — ${detail}` : ''));
};

console.log('\nLA JONCTION DU RADICAL, SUR L\'ENCRE');
console.log('─'.repeat(78));

await s.identifier();
await s.page.goto(`http://127.0.0.1:${s.port}/index.html`);
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

/**
 * UN SEUL RADICAL À LA FOIS SUR LE BANC.
 *
 * Premier essai : les onze tailles empilées d'un coup. La page devenait plus
 * haute que la fenêtre, et Playwright refusait la photo des dernières —
 * « Clipped area is either empty or outside the resulting image ». La mesure
 * s'arrêtait donc à 24 px, c'est-à-dire avant les tailles du tableau, sans
 * rien dire d'autre qu'une exception.
 */
async function poser(t, dedans) {
    await s.page.evaluate(async ({ t, dedans }) => {
        const { formule } = await import('./js/core/maths/formule.js');
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        document.getElementById('banc')?.remove();
        const d = document.createElement('div');
        d.id = 'banc';
        d.style.cssText = 'position:fixed; left:0; top:0; z-index:99999; background:#fff;'
            + `padding:24px; color:#000; font-size:${t}px`;
        d.innerHTML = formule(`√(${dedans})`);
        document.body.appendChild(d);
    }, { t, dedans });
}

console.log(' corps   radicande        hauteurs du haut de l\'encre     verdict');

for (const t of TAILLES) {
    for (let j = 0; j < DEDANS.length; j++) {
        await poser(t, DEDANS[j]);
        const b = await s.page.evaluate(() => {
            const el = document.querySelector('#banc .fx-rac');
            const r = el.getBoundingClientRect();
            const ba = el.querySelector('.fx-barre').getBoundingClientRect();
            const cr = el.querySelector('.fx-crochet').getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height,
                barreFin: ba.right - r.x,
                // LE DÉBUT DU PLAT DU CROCHET : son segment horizontal occupe
                // les 18 % de droite de sa largeur (`M… L8.2 0 L10 0` dans une
                // vue de 10). C'est là que commence la partie qui doit être
                // d'une seule hauteur.
                platDebut: (cr.right - r.x) - cr.width * 0.18 };
        });
        const E = 4;
        const chemin = `tools/tmp/jonction-${t}-${j}.png`;
        await s.page.screenshot({ path: chemin,
            clip: { x: b.x - E, y: b.y - E, width: b.w + E * 2, height: b.h + E * 2 } });
        const png = decoderPng(chemin);
        // L'image est en PIXELS D'APPAREIL ; les boîtes sont en pixels CSS.
        // Le rapport se lit sur l'image elle-même, et non sur une valeur
        // supposée : un écran à deux pixels par point double tout.
        const ech = png.largeur / (b.w + E * 2);

        // LE SOMMET DU TRAIT, D'UN BOUT À L'AUTRE DE LA PARTIE HORIZONTALE.
        //
        // On part du PLAT DU CROCHET — pas du début de la barre. Celle-ci
        // déborde maintenant à gauche pour recouvrir ce plat, donc sa première
        // colonne tombe sur la branche MONTANTE du V, qui est bien plus bas :
        // la mesure annonçait alors « 3 pixels de marche » sur une jonction
        // parfaite. Une fenêtre qui déborde de l'objet mesure autre chose.
        const x1 = Math.ceil((E + b.platDebut + 0.2) * ech);
        const x2 = Math.floor((E + b.barreFin - 0.6) * ech);
        const hauteurs = [];
        for (let x = x1; x <= x2; x++) {
            const h = png.hautDeLEncre(x);
            if (h != null) hauteurs.push(h);
        }
        const min = Math.min(...hauteurs), max = Math.max(...hauteurs);
        const ecart = max - min;
        const vus = [...new Set(hauteurs)].sort((a, b2) => a - b2);
        dire(ecart === 0,
            `${String(t).padStart(3)} px · √(${DEDANS[j]})`.padEnd(24)
                + `hauteurs vues : ${vus.join(', ')}`,
            ecart === 0 ? `${hauteurs.length} colonnes à la même hauteur`
                : `${ecart} pixel(s) de marche`);
    }
}

console.log('─'.repeat(78));
dire(s.erreurs.length === 0, 'aucune erreur de page', s.erreurs.slice(0, 2).join(' | '));
console.log(manques
    ? `\x1b[31m${manques} mesure(s) manquent.\x1b[0m`
    : '\x1b[32mLE CROCHET ET LA BARRE NE FONT QU\'UN TRAIT, À TOUTES LES TAILLES.\x1b[0m');

await s.fermer();
process.exit(manques ? 1 : 0);
