// LA TRAVERSÉE, MESURÉE AU DOIGT ET À LA SOURIS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre : « ca fait vieillot de fou ! et il faudrait pouvoir
// dragdropper ». Les deux demandes n'en font qu'une — un écran qui ne se prend
// pas en main EST un formulaire, et un formulaire fait vieux.
//
// CE QUE CETTE SONDE MESURE :
//
//   · ON GLISSE UN PASSAGER DE LA RIVE VERS LA BARQUE, et il y monte.
//   · ON LE GLISSE DE LA BARQUE VERS LA RIVE, et il en redescend.
//   · LE DOUBLE TOUCHER MARCHE TOUJOURS : on n'a rien retiré, on a ajouté.
//   · LA BARQUE CHANGE DE CÔTÉ quand on traverse — sans quoi rien ne dit que
//     le bouton a fait quelque chose.
//   · ET LA SCÈNE EST DESSINÉE : de l'herbe, de l'eau, une coque. Une photo
//     unie voudrait dire qu'on a perdu le décor sans qu'aucun compteur ne le
//     signale.
//
//   node tools/traverseeAuDoigt.mjs

import { ouvrirSonde } from './sonde.mjs';

const TAILLES = [
    { nom: 'doigt', largeur: 390, hauteur: 844 },
    { nom: 'ordi', largeur: 1280, hauteur: 900 }
];

const etat = (s) => s.page.evaluate(() => ({
    gauche: document.querySelectorAll('.tv-rive--g .tv-pion').length,
    droite: document.querySelectorAll('.tv-rive--d .tv-pion').length,
    barque: document.querySelectorAll('.tv-charge .tv-pion').length,
    aDroite: document.querySelector('.tv-riviere').classList.contains('tv-riviere--droite'),
    coque: document.querySelectorAll('.tv-coque path').length,
    vagues: document.querySelectorAll('.tv-vagues path').length
}));

/** Le centre d'un élément, à l'écran. */
const centre = (s, sel) => s.page.evaluate((x) => {
    const el = document.querySelector(x);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, sel);

async function glisser(s, de, vers) {
    await s.page.mouse.move(de.x, de.y);
    await s.page.mouse.down();
    await s.page.mouse.move((de.x + vers.x) / 2, (de.y + vers.y) / 2, { steps: 5 });
    await s.page.mouse.move(vers.x, vers.y, { steps: 5 });
    await s.page.mouse.up();
    await s.page.waitForTimeout(140);
}

async function unePasse(taille) {
    const s = await ouvrirSonde({ largeur: taille.largeur, hauteur: taille.hauteur });
    const dits = [];
    const ratés = [];
    try {
        await s.identifier();
        const raté = await s.ouvrirExercice('logi-traversee', {}, { questions: 2 });
        if (raté) throw new Error(`ouverture : ${raté}`);
        await s.doitExister('.tv-scene', 'la scène');
        await s.doitExister('.tv-rive--g .tv-pion', 'les passagers de la rive de départ');
        await s.doitExister('.tv-coque', 'la coque de la barque');
        const photo = await s.photo('.tv-scene', `tools/tmp/trav-${taille.nom}-depart.png`);
        await s.page.screenshot({ path: `tools/tmp/trav-${taille.nom}-ecran.png` });
        dits.push(photo && !photo.unie
            ? `la scène est dessinée (${photo.teintes} teintes)`
            : 'LA SCÈNE EST UNIE : le décor a disparu');
        if (!photo || photo.unie) ratés.push('décor');

        const avant = await etat(s);
        dits.push(`${avant.gauche} sur la rive, ${avant.coque} trait(s) de coque, `
            + `${avant.vagues} vagues`);

        // ── ON GLISSE UN PASSAGER VERS LA BARQUE ────────────────────────────
        const pion = await centre(s, '.tv-rive--g .tv-pion');
        const riviere = await centre(s, '.tv-riviere');
        await glisser(s, pion, riviere);
        const embarque = await etat(s);
        dits.push((embarque.barque === 1 && embarque.gauche === avant.gauche - 1)
            ? 'glisser un passager vers la rivière le fait monter dans la barque'
            : `LE GLISSER N'EMBARQUE PAS (barque ${embarque.barque}, `
                + `rive ${embarque.gauche})`);
        if (!(embarque.barque === 1)) ratés.push('embarquer');

        // ── ET ON LE GLISSE VERS LA RIVE POUR LE FAIRE DESCENDRE ────────────
        const dansBarque = await centre(s, '.tv-charge .tv-pion');
        const rive = await centre(s, '.tv-rive--g');
        if (dansBarque) await glisser(s, dansBarque, rive);
        const debarque = await etat(s);
        dits.push((debarque.barque === 0 && debarque.gauche === avant.gauche)
            ? 'glisser un passager vers la rive le fait redescendre'
            : `LE GLISSER NE DÉBARQUE PAS (barque ${debarque.barque}, `
                + `rive ${debarque.gauche})`);
        if (debarque.barque !== 0) ratés.push('débarquer');

        // ── LE DOUBLE TOUCHER MARCHE TOUJOURS ───────────────────────────────
        await s.page.mouse.move(pion.x, pion.y);
        await s.page.mouse.down(); await s.page.mouse.up();
        await s.page.waitForTimeout(120);
        const touche = await etat(s);
        dits.push(touche.barque === 1
            ? 'toucher un passager le fait monter, comme avant'
            : `LE TOUCHER NE MARCHE PLUS (barque ${touche.barque})`);
        if (touche.barque !== 1) ratés.push('toucher');

        // ── ET LA BARQUE CHANGE DE CÔTÉ ─────────────────────────────────────
        await s.cliquer('[data-traverser]', 'le bouton Traverser');
        await s.page.waitForTimeout(500);
        const apres = await etat(s);
        dits.push(apres.aDroite !== avant.aDroite
            ? 'la barque a changé de rive'
            : 'LA BARQUE N\'A PAS BOUGÉ');
        if (apres.aDroite === avant.aDroite) ratés.push('traverser');
        await s.photo('.tv-scene', `tools/tmp/trav-${taille.nom}-passe.png`);

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
