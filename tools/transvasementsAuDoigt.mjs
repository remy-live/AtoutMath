// LES TRANSVASEMENTS, PAR LE CHEMIN DE L'ÉLÈVE — on penche un bidon sur l'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/transvasementsAuDoigt.mjs
//
// RÉMY, 29 octobre : « j'aime bien les transvasements […] il faudra faire du
// drag drop plutôt ». Le geste est donc UN SEUL, et c'est lui qu'on mesure.
//
// CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE :
//
//   · LE GLISSER VERSE VRAIMENT. Le noyau sait résoudre une énigme ; il ne sait
//     rien du doigt. Ce dépôt a payé QUATRE fois le même glisser, et chaque
//     fois le défaut était muet : pas d'erreur de page, rien qui bouge.
//   · LES TROIS CIBLES RÉPONDENT — un autre bidon, le robinet, l'évier. Un
//     robinet dessiné sur lequel on ne peut rien poser est pire qu'un bouton.
//   · LA HAUTEUR D'EAU SUIT LA QUANTITÉ. C'est la seule chose que l'élève lit
//     sans compter, et elle se vérifie en pixels : quatre litres dans un bidon
//     de sept doivent occuper quatre septièmes de sa hauteur utile.
//   · ET LE NIVEAU 3 N'A NI ROBINET NI ÉVIER. Rien n'entre, rien ne sort : si
//     l'un des deux apparaissait, l'énigme deviendrait triviale.

import { ouvrirSonde } from './sonde.mjs';

const TAILLES = [
    { nom: 'doigt', largeur: 390, hauteur: 844 },
    { nom: 'ordi', largeur: 1280, hauteur: 900 }
];

const etat = (s) => s.page.evaluate(() => {
    const lire = (e) => {
        const t = (e.querySelector('.ts-litres') || {}).textContent || '';
        return Number(t.replace(/[^0-9]/g, ''));
    };
    const bidons = [...document.querySelectorAll('.ts-bidon')];
    return {
        combien: bidons.length,
        litres: bidons.map(lire),
        robinet: document.querySelectorAll('[data-zone="robinet"]').length,
        evier: document.querySelectorAll('[data-zone="evier"]').length,
        fantomes: document.querySelectorAll('.ts-fantome').length,
        statut: ((document.querySelector('.ts-statut') || {}).textContent || '').trim(),
        dehors: document.documentElement.scrollWidth - window.innerWidth
    };
});

const centre = (s, sel, i = 0) => s.page.evaluate(([x, k]) => {
    const el = document.querySelectorAll(x)[k];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, [sel, i]);

async function glisser(s, de, vers) {
    if (!de || !vers) return;
    await s.page.mouse.move(de.x, de.y);
    await s.page.mouse.down();
    await s.page.mouse.move((de.x + vers.x) / 2, (de.y + vers.y) / 2, { steps: 6 });
    await s.page.mouse.move(vers.x, vers.y, { steps: 6 });
    await s.page.mouse.up();
    await s.page.waitForTimeout(260);
}

/** La hauteur d'eau d'un bidon, en fraction de sa hauteur utile. */
const partDEau = (s, i) => s.page.evaluate((k) => {
    const b = document.querySelectorAll('.ts-bidon')[k];
    if (!b) return null;
    const eau = b.querySelector('.ts-eau');
    const rb = b.getBoundingClientRect(), re = eau.getBoundingClientRect();
    return re.height / rb.height;
}, i);

async function unePasse(taille) {
    const s = await ouvrirSonde({ largeur: taille.largeur, hauteur: taille.hauteur });
    const dits = [], ratés = [];
    try {
        await s.identifier();
        const raté = await s.ouvrirExercice('logi-transvasements',
            { niveau: '1' }, { questions: 3 });
        if (raté) throw new Error(`ouverture : ${raté}`);
        await s.doitExister('.ts-bidon', 'les bidons');
        await s.doitExister('[data-zone="robinet"]', 'le robinet');
        await s.page.waitForTimeout(300);

        const a = await etat(s);
        dits.push(`${a.combien} bidons à ${a.litres.join(' et ')} L, `
            + `${a.robinet} robinet, ${a.evier} évier`);
        if (a.combien !== 2) { ratés.push('bidons'); dits.push('PAS DEUX BIDONS'); }
        if (!a.robinet || !a.evier) { ratés.push('décor'); dits.push('ROBINET OU ÉVIER MANQUANT'); }

        const img = await s.photo('.ts-scene', `tools/tmp/ts-scene-${taille.nom}.png`, 0);
        dits.push(img && !img.unie ? `la scène est dessinée (${img.teintes} teintes)`
            : 'LA SCÈNE EST UNE IMAGE UNIE');
        if (!img || img.unie) ratés.push('scène unie');

        // ── ON PENCHE LE GRAND BIDON SUR LE ROBINET : il se remplit ─────────
        const grand = await centre(s, '.ts-bidon', 0);
        const petit = await centre(s, '.ts-bidon', 1);
        await glisser(s, grand, await centre(s, '[data-zone="robinet"]'));
        const rempli = await etat(s);
        dits.push(rempli.litres[0] > 0
            ? `le pencher sur le robinet le remplit (${rempli.litres[0]} L)`
            : 'LE ROBINET NE REMPLIT RIEN');
        if (!rempli.litres[0]) ratés.push('remplir');

        // ── ET LA HAUTEUR D'EAU SUIT LA QUANTITÉ ───────────────────────────
        const part = await partDEau(s, 0);
        dits.push((part !== null && part > 0.75)
            ? `plein, l'eau occupe ${Math.round(part * 100)} % du bidon`
            : `L'EAU NE SUIT PAS LA QUANTITÉ (${part})`);
        if (part === null || part <= 0.75) ratés.push('hauteur d\'eau');

        // ── ON LE VERSE DANS L'AUTRE ───────────────────────────────────────
        await glisser(s, grand, petit);
        const verse = await etat(s);
        const bouge = verse.litres[1] > 0 && verse.litres[0] < rempli.litres[0];
        dits.push(bouge
            ? `verser passe l'eau d'un bidon à l'autre (${verse.litres.join(' / ')} L)`
            : `LE VERSEMENT NE PASSE RIEN (${verse.litres.join(' / ')})`);
        if (!bouge) ratés.push('verser');
        dits.push(verse.fantomes === 0 ? 'et le fantôme est bien rangé'
            : `${verse.fantomes} FANTÔME(S) OUBLIÉ(S)`);
        if (verse.fantomes) ratés.push('fantôme');

        // ── ET L'ÉVIER LE VIDE ─────────────────────────────────────────────
        await glisser(s, petit, await centre(s, '[data-zone="evier"]'));
        const vide = await etat(s);
        dits.push(vide.litres[1] === 0 ? 'le pencher sur l\'évier le vide'
            : `L'ÉVIER NE VIDE RIEN (${vide.litres[1]} L)`);
        if (vide.litres[1] !== 0) ratés.push('vider');

        // ── « UN GESTE » DIT QUOI FAIRE ────────────────────────────────────
        await s.page.evaluate(() => document.querySelector('[data-aide]').click());
        await s.page.waitForTimeout(180);
        const aide = await etat(s);
        const parle = /Remplis|Vide|Verse/.test(aide.statut);
        dits.push(parle ? `« Un geste » dit quoi faire — ${aide.statut}`
            : `« UN GESTE » NE DIT RIEN (« ${aide.statut} »)`);
        if (!parle) ratés.push('aide');

        dits.push(`rien ne déborde en largeur : ${aide.dehors} px`);
        if (aide.dehors > 0) ratés.push('débordement');
        await s.page.screenshot({ path: `tools/tmp/ts-ecran-${taille.nom}.png`, fullPage: true });

        // ── LE NIVEAU 3 N'A NI ROBINET NI ÉVIER ────────────────────────────
        await s.ouvrirExercice('logi-transvasements', { niveau: '3' }, { questions: 2 });
        await s.page.waitForTimeout(400);
        const p3 = await etat(s);
        const sansRien = p3.robinet === 0 && p3.evier === 0 && p3.combien === 3;
        dits.push(sansRien
            ? `au niveau 3 : trois bidons, ni robinet ni évier (${p3.litres.join(' / ')} L)`
            : `NIVEAU 3 MAL POSÉ (${p3.combien} bidons, ${p3.robinet} robinet, `
                + `${p3.evier} évier)`);
        if (!sansRien) ratés.push('niveau 3');
        await s.photo('.ts-scene', `tools/tmp/ts-partage-${taille.nom}.png`, 0);

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
