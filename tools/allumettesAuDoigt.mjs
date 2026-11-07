// LES ALLUMETTES, MESURÉES AU DOIGT ET À LA SOURIS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre : « fais des vraies allumettre et les horizontals en haut
// et en bas sont un peu decales. Il fuadrait pourvoir les prendre et les
// glisser ».
//
// CE QUE CETTE SONDE MESURE, ET QU'AUCUNE ÉPREUVE NE SAURAIT DIRE :
//
//   · LES SEPT BÂTONS RENDUS ONT LA MÊME LONGUEUR, relevée sur les rectangles
//     du SVG tels que le navigateur les place. C'est le « un peu décalés » de
//     Rémy, et il ne se mesure que sur des pixels rendus.
//   · LES ZONES DE TOUCHER NE SE RECOUVRENT PAS. Vingt-quatre paires se
//     chevauchaient en octobre ; un doigt qui visait le milieu enlevait le
//     haut.
//   · ON PEUT GLISSER UNE ALLUMETTE d'un emplacement plein vers un vide — et
//     le clic qui suit le glisser ne doit PAS la faire repartir.
//   · LE DOUBLE TOUCHER MARCHE TOUJOURS : on n'a rien retiré, on a ajouté.
//
//   node tools/allumettesAuDoigt.mjs

import { ouvrirSonde } from './sonde.mjs';

const TAILLES = [
    { nom: 'doigt', largeur: 390, hauteur: 844 },
    { nom: 'ordi', largeur: 1280, hauteur: 900 }
];

/** Ce que l'écran dessine : les bâtons rendus, et les zones de toucher. */
const lirePlateau = (s) => s.page.evaluate(() => {
    const cases = [...document.querySelectorAll('.ae-case--chiffre')];
    const bats = [];
    const zones = [];
    cases.forEach((c, iCase) => {
        c.querySelectorAll('[data-bat]').forEach(g => {
            const corps = g.querySelector('.ae-bois').getBoundingClientRect();
            bats.push({
                iCase, seg: Number(g.dataset.bat),
                pleine: g.classList.contains('ae-bat--pleine'),
                trou: g.classList.contains('ae-bat--trou'),
                posee: g.classList.contains('ae-bat--posee'),
                long: Math.round(Math.max(corps.width, corps.height) * 10) / 10,
                epais: Math.round(Math.min(corps.width, corps.height) * 10) / 10,
                x: Math.round(corps.left), y: Math.round(corps.top)
            });
        });
        c.querySelectorAll('[data-seg]').forEach(b => {
            const r = b.getBoundingClientRect();
            zones.push({
                iCase, seg: Number(b.dataset.seg), cel: Number(b.dataset.cel),
                x: r.left, y: r.top, w: r.width, h: r.height
            });
        });
    });
    return { bats, zones, cases: cases.length };
});

/** Le centre d'une zone, à l'écran. */
const centre = (z) => ({ x: z.x + z.w / 2, y: z.y + z.h / 2 });

async function unePasse(taille) {
    const s = await ouvrirSonde({ largeur: taille.largeur, hauteur: taille.hauteur });
    const dits = [];
    const ratés = [];
    try {
        await s.identifier();
        const raté = await s.ouvrirExercice('logi-allumettes-egalite',
            { format: 'court', signe: 'plus' }, { questions: 3 });
        if (raté) throw new Error(`ouverture : ${raté}`);
        await s.doitExister('.ae-plateau .ae-case', 'les cases du plateau');
        await s.doitExister('.ae-bat', 'les allumettes dessinées');
        await s.photo('.ae-plateau', `tools/tmp/allu-${taille.nom}-depart.png`);
        await s.page.screenshot({ path: `tools/tmp/allu-${taille.nom}-ecran.png` });

        const vu = await lirePlateau(s);

        // ── LES SEPT BÂTONS ONT LA MÊME LONGUEUR ────────────────────────────
        // ON NE MESURE QUE LES ALLUMETTES VISIBLES : un emplacement vide est
        // en `display: none`, donc son rectangle rendu fait zéro par zéro — et
        // la sonde annonçait « de 0 à 74 px » sur un dessin parfaitement juste.
        const longs = vu.bats.filter(b => b.pleine).map(b => b.long);
        const min = Math.min(...longs), max = Math.max(...longs);
        dits.push(max - min <= 1.5
            ? `les ${longs.length} allumettes font ${min} px (écart ${(max - min).toFixed(1)})`
            : `LES ALLUMETTES N'ONT PAS LA MÊME LONGUEUR : de ${min} à ${max} px`);
        if (max - min > 1.5) ratés.push('longueur');

        // ── LES ZONES NE SE RECOUVRENT PAS ──────────────────────────────────
        let paires = 0;
        for (let i = 0; i < vu.zones.length; i++) {
            for (let j = i + 1; j < vu.zones.length; j++) {
                const a = vu.zones[i], b = vu.zones[j];
                if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5
                    && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) paires++;
            }
        }
        const hMin = Math.round(Math.min(...vu.zones.map(z => z.h)));
        dits.push(paires === 0
            ? `${vu.zones.length} zones, aucune ne se recouvre (la plus courte : ${hMin} px)`
            : `${paires} PAIRE(S) DE ZONES SE RECOUVRENT`);
        if (paires) ratés.push('zones');

        // ── ON GLISSE UNE ALLUMETTE PLEINE VERS UN EMPLACEMENT VIDE ─────────
        const pleine = vu.bats.find(b => b.pleine);
        const vide = vu.bats.find(b => !b.pleine && b.iCase === pleine.iCase);
        const zoneDe = (b) => vu.zones.find(z => z.iCase === b.iCase && z.seg === b.seg);
        const d = centre(zoneDe(pleine)), a = centre(zoneDe(vide));
        await s.page.mouse.move(d.x, d.y);
        await s.page.mouse.down();
        await s.page.mouse.move((d.x + a.x) / 2, (d.y + a.y) / 2, { steps: 5 });
        await s.page.mouse.move(a.x, a.y, { steps: 5 });
        await s.page.mouse.up();
        await s.page.waitForTimeout(150);
        const apres = await lirePlateau(s);
        const trou = apres.bats.filter(b => b.trou).length;
        const posee = apres.bats.filter(b => b.posee).length;
        dits.push((trou === 1 && posee === 1)
            ? 'glisser une allumette la déplace, et le clic qui suit ne la reprend pas'
            : `LE GLISSER N'A PAS DÉPLACÉ L'ALLUMETTE (${trou} trou, ${posee} posée)`);
        if (!(trou === 1 && posee === 1)) ratés.push('glisser');
        await s.photo('.ae-plateau', `tools/tmp/allu-${taille.nom}-glisse.png`);

        // ── ET LE DOUBLE TOUCHER MARCHE TOUJOURS ────────────────────────────
        await s.cliquer('[data-recommencer]', 'le bouton Recommencer');
        await s.page.waitForTimeout(120);
        await s.page.mouse.move(d.x, d.y);
        await s.page.mouse.down(); await s.page.mouse.up();
        await s.page.waitForTimeout(100);
        await s.page.mouse.move(a.x, a.y);
        await s.page.mouse.down(); await s.page.mouse.up();
        await s.page.waitForTimeout(150);
        const apres2 = await lirePlateau(s);
        const ok2 = apres2.bats.filter(b => b.trou).length === 1
            && apres2.bats.filter(b => b.posee).length === 1;
        dits.push(ok2 ? 'deux touchers déplacent toujours une allumette'
            : 'LE DOUBLE TOUCHER NE MARCHE PLUS');
        if (!ok2) ratés.push('toucher');

        return { dits, ratés, erreurs: s.erreurs.slice(), fenetres: s.fenetresNatives.slice() };
    } finally {
        await s.fermer();
    }
}

const sorties = [];
for (const t of TAILLES) sorties.push({ t, r: await unePasse(t) });

console.log('');
let fautes = 0;
for (const { t, r } of sorties) {
    console.log(`── ${t.nom} (${t.largeur} × ${t.hauteur}) ──`);
    r.dits.forEach(x => console.log(`   ${x}`));
    console.log(`   erreurs de page : ${r.erreurs.length}, fenêtres natives : ${r.fenetres.length}`);
    r.erreurs.forEach(e => console.log(`     ! ${e}`));
    fautes += r.erreurs.length + r.fenetres.length + r.ratés.length;
}
console.log(fautes ? `\n${fautes} chose(s) à regarder.` : '\nTOUT PASSE.');
process.exit(fautes ? 1 : 0);
