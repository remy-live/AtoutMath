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
//   · ET ELLE EMPORTE SES PASSAGERS. Rémy, 27 octobre : « qu'on voit le
//     transport ». La coque traversait VIDE — l'activité vidait la barque
//     avant l'animation. L'état final était juste, donc aucune épreuve ne
//     pouvait le voir : il faut regarder EN PLEIN VOYAGE, et c'est ce que
//     cette sonde fait, à 420 ms d'un trajet qui en dure 980.
//   · LES DEUX QU'ON A LAISSÉS ENSEMBLE CLIGNOTENT. « que ceux qui sont restés
//     ensemble et qui sont incompatibles soit clignotant en rouge ».
//   · ET LE MESSAGE D'ÉCHEC TIENT ASSEZ LONGTEMPS POUR ÊTRE LU : on le relit
//     quatre secondes après, il doit être encore là.
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
    vagues: document.querySelectorAll('.tv-vagues path').length,
    clignotent: document.querySelectorAll('.tv-pion--alerte').length,
    texte: ((document.querySelector('.tv-statut') || {}).textContent || '').trim()
}));

/** Touche une pastille par son rang, comme le ferait un doigt. */
const toucherPion = (s, k) => s.page.evaluate((x) => {
    const b = document.querySelector(`.tv-pion[data-pion="${x}"]`);
    if (b && !b.disabled) b.click();
}, k);

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

        // ── ET LA BARQUE CHANGE DE CÔTÉ, EN EMPORTANT SES PASSAGERS ─────────
        //
        // ON REGARDE EN PLEIN VOYAGE, à 420 ms d'un trajet de 980. C'est la
        // seule façon de voir le défaut que Rémy a vu : l'état d'arrivée est
        // juste dans les deux cas, c'est le MILIEU qui ment.
        const xAvant = (await centre(s, '.tv-barque')).x;
        await s.cliquer('[data-traverser]', 'le bouton Traverser');
        await s.page.waitForTimeout(420);
        const route = await etat(s);
        const parcouru = Math.round(Math.abs((await centre(s, '.tv-barque')).x - xAvant));
        await s.photo('.tv-scene', `tools/tmp/trav-${taille.nom}-route.png`);
        dits.push((route.barque === 1 && parcouru > 10)
            ? `en plein voyage, la barque porte son passager — ${parcouru} px parcourus`
            : `LA BARQUE TRAVERSE VIDE (${route.barque} passager(s), ${parcouru} px)`);
        if (route.barque !== 1 || parcouru <= 10) ratés.push('transport');

        await s.page.waitForTimeout(900);
        const apres = await etat(s);
        dits.push(apres.aDroite !== avant.aDroite
            ? 'la barque a changé de rive'
            : 'LA BARQUE N\'A PAS BOUGÉ');
        if (apres.aDroite === avant.aDroite) ratés.push('traverser');
        dits.push(apres.barque === 0
            ? 'et elle est vide à l\'arrivée'
            : `ELLE N'A PAS DÉBARQUÉ (${apres.barque} à bord)`);
        if (apres.barque !== 0) ratés.push('débarquer après');
        await s.photo('.tv-scene', `tools/tmp/trav-${taille.nom}-passe.png`);

        // ── ON LAISSE EXPRÈS LES DEUX QUI NE S'ENTENDENT PAS ────────────────
        //
        // En « classique », le passeur est le rang 0 et les deux ennemis sont
        // les rangs 1 et 2 ; emmener le rang 3 les laisse donc seuls à coup
        // sûr. C'est le réglage du catalogue, pas un hasard du tirage.
        await s.cliquer('[data-recommencer]', 'le bouton Recommencer');
        await s.page.waitForTimeout(160);
        await toucherPion(s, 0);
        await toucherPion(s, 3);
        await s.page.evaluate(() => document.querySelector('[data-traverser]').click());
        await s.page.waitForTimeout(1300);
        const rate = await etat(s);
        await s.photo('.tv-layout', `tools/tmp/trav-${taille.nom}-alerte.png`);
        dits.push(rate.clignotent === 2
            ? 'les deux qui sont restés ensemble clignotent en rouge'
            : `${rate.clignotent} pastille(s) clignotent au lieu de 2`);
        if (rate.clignotent !== 2) ratés.push('clignotement');

        // ── ET LE MESSAGE TIENT ASSEZ LONGTEMPS POUR ÊTRE LU ────────────────
        //
        // Quatre secondes après la catastrophe : la phrase doit être encore là.
        // Avant, elle partait à 2,2 s — moins que le temps de la finir.
        await s.page.waitForTimeout(2800);
        const tard = await etat(s);
        const tenu = tard.texte.includes('restés seuls');
        dits.push(tenu
            ? 'et le message est encore lisible quatre secondes après'
            : `LE MESSAGE A DISPARU TROP TÔT (« ${tard.texte.slice(0, 40)} »)`);
        if (!tenu) ratés.push('message');

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
