// LE DESSIN GRADUÉ, MESURÉ COMME UN ÉLÈVE LE FAIT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LA SONDE NE REGARDE PAS LA RÉPONSE. Elle lit l'ordre de marche à l'écran
// — « Place le point A — droite 3, abscisse 0,7 » —, lit les DEUX BORNES de
// cette droite-là sur le dessin, et calcule la colonne comme l'élève la
// compte : (0,7 − 0) ÷ ((1 − 0) ÷ 10). Si l'écran ment sur une borne, la
// sonde se trompe de case, et c'est exactement ce qu'on veut savoir.
//
// Une sonde qui lirait `item.answer` dans le moteur donnerait un vert
// imperturbable au-dessus d'un écran illisible. Trois fois payé ce mois-ci.
//
//   node tools/dessinGradueAuDoigt.mjs
//
// Elle passe à deux tailles — 390 × 844 au doigt et 1280 × 900 à la souris —
// et, à la petite, elle vérifie en plus qu'un DÉFILEMENT ne pose pas de point :
// le plan fait quatre cents pixels de haut, on le traverse pour atteindre les
// boutons, et au premier jet chaque glissement posait un point au passage.

import { ouvrirSonde } from './sonde.mjs';

const TAILLES = [
    { nom: 'doigt', largeur: 390, hauteur: 844 },
    { nom: 'ordi', largeur: 1280, hauteur: 900 }
];

/** Ce que l'écran dit du point en cours, et où sont les graduations. */
const lirePlan = (s) => s.page.evaluate(() => {
    const ordre = document.querySelector('.dg-ordre');
    const gras = ordre ? [...ordre.querySelectorAll('b')].map(b => b.textContent.trim()) : [];
    const svg = document.querySelector('.dg-plan svg');
    if (!svg) return { gras, droites: [] };
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const versEcran = (x, y) => ({
        x: r.left + x / vb.width * r.width,
        y: r.top + y / vb.height * r.height
    });
    // LES AXES ET LEURS ÉTIQUETTES SONT DANS DES GROUPES SÉPARÉS, et dans cet
    // ordre : tous les axes, les formes, puis toutes les étiquettes. La sonde
    // les rapproche par leur RANG — le i-ᵉ axe va avec le i-ᵉ groupe d'
    // étiquettes. Une sonde qui cherchait la borne DANS le groupe de l'axe a
    // lu NaN le jour où les nombres sont passés par-dessus les formes.
    const axes = [...svg.querySelectorAll('.dg-axe')];
    const groupesBornes = [...svg.querySelectorAll('g')]
        .filter(g => g.querySelector('.dg-borne'));
    const droites = axes.map((axe, i) => {
        const y = Number(axe.getAttribute('y1'));
        const crans = [...axe.parentNode.querySelectorAll('.dg-cran')]
            .map(c => Number(c.getAttribute('x1')));
        // LES BORNES SE LISENT DE GAUCHE À DROITE, pas dans l'ordre du DOM :
        // la borne du milieu y est écrite après les deux bouts, et une sonde
        // qui prenait « la première » lisait 50 pour le minimum d'une droite
        // qui part de 0. Elle se trompait alors de case sans rien dire.
        const bornes = groupesBornes[i]
            ? [...groupesBornes[i].querySelectorAll('.dg-borne')]
                .map(t => ({ x: Number(t.getAttribute('x')), v: t.textContent.trim() }))
                .sort((a, b) => a.x - b.x).map(t => t.v)
            : [];
        return { bornes, crans: crans.map(x => versEcran(x, y)) };
    });
    return { gras, droites, statut: (document.querySelector('.dg-statut') || {}).textContent || '' };
});

const nombre = (t) => Number(String(t).replace(',', '.'));

async function unePasse(taille) {
    const s = await ouvrirSonde({ largeur: taille.largeur, hauteur: taille.hauteur });
    const dits = [];
    try {
        await s.identifier();
        const raté = await s.ouvrirExercice('num-dessin-gradue',
            { echelles: 'decimaux', ecriture: 'nombre' }, { questions: 2 });
        if (raté) throw new Error(`ouverture : ${raté}`);

        await s.doitExister('.dg-plan svg', 'le plan des droites');
        await s.doitExister('.dg-ordre', 'l\'ordre de marche');
        await s.doitExister('.dg-chip', 'les pastilles des points');
        await s.photo('.dg-plan', `tools/tmp/dg-${taille.nom}-depart.png`);
        // ET L'ÉCRAN ENTIER, tel que l'élève le voit : le plan tout seul ne dit
        // pas si l'ordre de marche, les pastilles et les deux boutons tiennent
        // ensemble dans la fenêtre d'un téléphone.
        await s.page.screenshot({ path: `tools/tmp/dg-${taille.nom}-ecran.png` });

        // ── UN DÉFILEMENT NE POSE PAS DE POINT ──────────────────────────────
        if (taille.nom === 'doigt') {
            const avant = await lirePlan(s);
            const c = avant.droites[1].crans[5];
            await s.page.mouse.move(c.x, c.y);
            await s.page.mouse.down();
            await s.page.mouse.move(c.x, c.y - 60, { steps: 6 });
            await s.page.mouse.up();
            const poses = await s.page.evaluate(
                () => document.querySelectorAll('.dg-chip--pose').length);
            dits.push(poses === 0
                ? 'un glissement de 60 px ne pose aucun point : bien'
                : `UN GLISSEMENT A POSÉ ${poses} POINT(S) — le plan ne se défile plus`);
        }

        // ── ON PLACE LES POINTS, COMME UN ÉLÈVE ─────────────────────────────
        //
        // ON S'ARRÊTE SUR LE NOMBRE DE PASTILLES POSÉES, jamais sur l'ordre de
        // marche : le dernier point posé reste « en cours » pour qu'on puisse
        // le relire, donc l'ordre ne se vide pas et une boucle qui l'attend
        // tourne sans fin. Payé une fois.
        const combien = await s.page.evaluate(
            () => document.querySelectorAll('.dg-chip').length);
        let tours = 0;
        for (let k = 0; k < combien; k++) {
            const vu = await lirePlan(s);
            if (vu.gras.length < 3) throw new Error('l\'ordre de marche ne dit plus rien');
            const [nom, ligneT, abscisseT] = vu.gras;
            const ligne = Number(ligneT);
            const d = vu.droites[ligne - 1];
            if (!d) throw new Error(`la droite ${ligne} n'est pas dessinée`);
            const min = nombre(d.bornes[0]);
            const max = nombre(d.bornes[d.bornes.length - 1]);
            const colonne = Math.round((nombre(abscisseT) - min) / ((max - min) / 10));
            if (!(colonne >= 0 && colonne <= 10)) {
                throw new Error(`${nom} : abscisse ${abscisseT} hors de [${min} ; ${max}]`);
            }
            const c = d.crans[colonne];
            await s.page.mouse.move(c.x, c.y);
            await s.page.mouse.down();
            await s.page.mouse.up();
            const poses = await s.page.evaluate(
                () => document.querySelectorAll('.dg-chip--pose').length);
            if (poses !== k + 1) {
                throw new Error(`${nom} : ${poses} point(s) posé(s) après ${k + 1} touchers `
                    + '— le toucher ne pose rien');
            }
            tours++;
        }
        dits.push(`${tours} points posés en lisant l'écran`);
        await s.photo('.dg-plan', `tools/tmp/dg-${taille.nom}-pose.png`);

        // ── ON VALIDE, ET LE DESSIN DOIT APPARAÎTRE ─────────────────────────
        await s.cliquer('[data-valider]', 'le bouton Valider');
        await s.page.waitForTimeout(500);
        // ON PHOTOGRAPHIE AVANT DE COMPTER. Le verdict rendu, le meneur enchaîne
        // sur la question suivante dès que l'élève a vu le résultat : la photo,
        // qui coûte une seconde, arrivait après et rendait un plan VIDE — un
        // écran parfaitement normal, pris une question trop tard.
        await s.photo('.dg-plan', `tools/tmp/dg-${taille.nom}-fin.png`);
        const fin = await s.page.evaluate(() => ({
            statut: (document.querySelector('.dg-statut') || {}).textContent || '',
            formes: document.querySelectorAll('.dg-plan .dg-forme').length,
            ok: !!document.querySelector('.dg-plan--ok')
        }));
        dits.push(`${fin.formes} forme(s) peinte(s), plan juste : ${fin.ok ? 'oui' : 'NON'}`);
        dits.push(`statut : ${fin.statut.trim()}`);

        return { dits, erreurs: s.erreurs.slice(), fenetres: s.fenetresNatives.slice() };
    } finally {
        await s.fermer();
    }
}

const sorties = [];
for (const t of TAILLES) {
    const r = await unePasse(t);
    sorties.push({ t, r });
}

console.log('');
let fautes = 0;
for (const { t, r } of sorties) {
    console.log(`── ${t.nom} (${t.largeur} × ${t.hauteur}) ──`);
    r.dits.forEach(d => console.log(`   ${d}`));
    console.log(`   erreurs de page : ${r.erreurs.length}, fenêtres natives : ${r.fenetres.length}`);
    r.erreurs.forEach(e => console.log(`     ! ${e}`));
    fautes += r.erreurs.length + r.fenetres.length;
    if (r.dits.some(d => d.includes('NON') || d.startsWith('UN GLISSEMENT'))) fautes++;
}
console.log(fautes ? `\n${fautes} chose(s) à regarder.` : '\nTOUT PASSE.');
process.exit(fautes ? 1 : 0);
