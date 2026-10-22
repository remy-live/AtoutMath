// « POURQUOI CETTE FENÊTRE EST SI ÉTROITE » — la largeur d'une fenêtre, mesurée.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/largeurDUneFenetre.mjs
//
// RÉMY, capture à l'appui : « pourquoi cette fenetre sur l'écran prof sur ordi
// est si étroite ». La réponse ne se lit pas dans la feuille de style : une
// largeur est le résultat d'une cascade — une classe, un media query, un
// `!important` ailleurs — et seule la vitre dit qui a gagné.
//
// CE QU'IL MESURE, sur trois écrans à la fois :
//
//   · la largeur du panneau, et le VIDE qu'il laisse sur les côtés ;
//   · la largeur de chaque carte, parce que c'est elle qu'on lit ;
//   · le nombre de LIGNES que prend chaque description — un mot coupé au tiret
//     ne se voit pas autrement ;
//   · ce que le panneau cache sous la ligne de flottaison ;
//   · et s'il déborde de l'écran.
//
// POUR UNE AUTRE FENÊTRE, trois lignes : son identifiant, et comment on
// l'ouvre. C'est la partie qui coûte — chaque fenêtre s'ouvre par son propre
// chemin, et c'est ce chemin qu'il faut emprunter plutôt que de poser
// `display: flex` à la main : une fenêtre qu'on force à paraître ne se mesure
// pas comme une fenêtre que le logiciel ouvre.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const TAILLES = [[1440, 900], [1024, 768], [390, 844]];
for (const [largeur, hauteur] of TAILLES) {
    const s = await ouvrirSonde({ largeur, hauteur });
    await s.identifier();
    await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const { makePath, makeStep } = await import('./js/core/path.js');
        const { politiquePerso } = await import('./js/core/mesExercices.js');
        state.currentPath = makePath('Essai', [makeStep('calc-add', {}, { stepId: 's1' })],
            politiquePerso());
    });
    await s.page.evaluate(() => document.getElementById('btn-path-policy').click());
    await dormir(1200);
    await s.doitExister('#path-policy-modal .glass-panel', 'le panneau de la fenêtre');

    const m = await s.page.evaluate(() => {
        const panneau = document.querySelector('#path-policy-modal .glass-panel');
        const r = panneau.getBoundingClientRect();
        const cartes = [...document.querySelectorAll('#path-policy-modal .cfg-mode')];
        const desc = cartes.map(c => c.querySelector('.cfg-mode-desc'));
        return {
            vitre: `${innerWidth}×${innerHeight}`,
            panneau: { l: Math.round(r.width), h: Math.round(r.height),
                x: Math.round(r.left) },
            // LA PLACE PERDUE À DROITE ET À GAUCHE : c'est la question de Rémy.
            margesLaterales: Math.round(innerWidth - r.width),
            cartes: cartes.map(c => Math.round(c.getBoundingClientRect().width)),
            hauteursDesCartes: cartes.map(c => Math.round(c.getBoundingClientRect().height)),
            // UN MOT COUPÉ EN DEUX se voit au nombre de LIGNES que prend sa
            // description : à 138 px, « Montre-moi » passe à la ligne au tiret.
            lignesDesDescriptions: desc.map(d => {
                if (!d) return 0;
                const lh = parseFloat(getComputedStyle(d).lineHeight) || 16;
                return Math.round(d.getBoundingClientRect().height / lh);
            }),
            // CE QUE LE PANNEAU CACHE : il défile, donc une partie des réglages
            // est hors de vue au moment où il s'ouvre.
            defilement: { hauteurUtile: Math.round(panneau.clientHeight),
                contenu: Math.round(panneau.scrollHeight),
                cacheEnBas: Math.round(panneau.scrollHeight - panneau.clientHeight) },
            debordeAGauche: r.left < 0 || r.right > innerWidth
        };
    });
    console.log(`\n${largeur}×${hauteur} :`, JSON.stringify(m, null, 1));
    await s.photo('#path-policy-modal .glass-panel', `tools/tmp/fenetre-${largeur}.png`, 0);
    console.log(`erreurs : ${s.erreurs.length} | fenêtres natives : ${s.fenetresNatives.length}`);
    await s.fermer();
}
