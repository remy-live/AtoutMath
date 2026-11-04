// LE BOUTON « Pages pour les parents », PRESSÉ PAR LE CHEMIN DE RÉMY.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/boutonDesParents.mjs
//
// `tools/pagesParentsEnPdf.mjs` mesure le DOCUMENT : il appelle la fabrication
// depuis la page et regarde les feuilles. Il ne presse aucun bouton — et entre
// la fonction et le bouton il y a l'écran des classes, le repli des classes
// locales, la fenêtre et le téléchargement. Un document juste derrière un
// bouton qui n'existe pas est un document que personne n'aura jamais.
//
// CE QU'ON VÉRIFIE ICI, ET QUI NE SE VOIT QUE D'ICI :
//
//   · le bouton est sur l'écran des classes, à côté des fiches de reprise ;
//   · la fenêtre dit COMBIEN de pages et QUI n'en a pas — c'est ce qui permet
//     de presser « Télécharger » sans crainte ;
//   · le PDF arrive pour de bon, avec une page par élève et pas une de plus ;
//   · et aucune fenêtre native ne s'ouvre en chemin. « tu utilises des alert
//     et prompt, on évite ! »

import { mkdir } from 'node:fs/promises';
import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const SORTIE = 'tools/tmp/bouton-parents';
await mkdir(SORTIE, { recursive: true });

const s = await ouvrirSonde({ largeur: 1280, hauteur: 950 });
const dits = [], ratés = [];
const dire = (ok, quoi, detail = '') => {
    dits.push(`${ok ? ' ' : '✗'} ${quoi}${detail ? ' — ' + detail : ''}`);
    if (!ok) ratés.push(quoi);
};

try {
    await s.identifier();
    await dormir(700);

    await s.page.evaluate(async () => {
        const { classesDeDemo } = await import('./js/core/demoClasses.js');
        const { globalStore } = await import('./js/core/store.js');
        await globalStore.set('classes', classesDeDemo({}));
    });

    await s.page.evaluate(async () => {
        const m = await import('./js/ui/classesUI.js');
        await m.ouvrirClasses();
    });
    await dormir(1500);
    await s.doitExister('#cl-racine', 'l\'écran des classes');
    await s.doitExister('[data-parents]', 'le bouton « Pages pour les parents »');
    // LE REPLI DES CLASSES LOCALES — la même friction que pour les reprises,
    // et c'est pour cela qu'elle est écrite dans `docs/frictions.md` : tout
    // clic sur un écran qu'on n'a pas composé soi-même passe par `deplier`.
    const replie = await s.deplier('[data-parents]');
    dire(true, 'le bouton est sur l\'écran des classes',
        replie ? 'dans le repli des classes locales' : '');

    const telechargements = [];
    s.page.on('download', async (d) => {
        const chemin = `${SORTIE}/${d.suggestedFilename()}`;
        await d.saveAs(chemin);
        telechargements.push(chemin);
    });

    await s.page.click('[data-parents]');
    await dormir(2000);
    const vue = await s.page.evaluate(() => {
        const t = document.body.textContent.replace(/\s+/g, ' ');
        return {
            faire: !!document.querySelector('[data-faire]'),
            combien: (t.match(/(\d+) pages? pour/) || [])[1] || null,
            ditLesAbsents: /n'ont rien déposé/.test(t),
            ditQuElleNeNotePas: /Ni note, ni moyenne, ni rang/.test(t)
        };
    });
    dire(!!vue.faire, 'la fenêtre s\'ouvre avec son bouton de téléchargement');
    dire(!!vue.combien, 'elle dit combien de pages', vue.combien ? vue.combien : 'aucun nombre');
    dire(vue.ditLesAbsents, 'elle dit qui n\'a pas de page, et pourquoi');
    // CE N'EST PAS UN DÉTAIL DE FORMULATION : une page qui arrive chez des
    // parents est lue comme un bulletin si on ne l'en empêche pas, et c'est
    // dans cette fenêtre que le professeur apprend qu'elle ne l'est pas.
    dire(vue.ditQuElleNeNotePas, 'elle dit que la page ne note pas');

    await s.page.screenshot({ path: `${SORTIE}/fenetre.png` });

    await s.page.click('[data-faire]');
    for (let i = 0; i < 60 && !telechargements.length; i++) await dormir(500);
    dire(telechargements.length > 0, 'le PDF arrive',
        telechargements.length ? telechargements[0] : 'aucun fichier en 30 s');

    await dormir(1200);
    const fin = await s.page.evaluate(() => {
        const t = document.body.textContent.replace(/\s+/g, ' ');
        const m = t.match(/(\d+) pages? — une par élève/);
        return { mot: m ? m[0] : null, pages: m ? +m[1] : 0,
            fenetreFermee: !document.querySelector('[data-faire]') };
    });
    dire(!!fin.mot, 'le logiciel dit ce qu\'il a fabriqué', fin.mot || '(rien)');
    dire(fin.pages > 0 && String(fin.pages) === String(vue.combien),
        'autant de pages que de pages annoncées',
        `annoncé ${vue.combien}, fabriqué ${fin.pages}`);
    dire(fin.fenetreFermee, 'la fenêtre se referme toute seule');
} finally {
    dire(s.erreurs.length === 0, 'erreurs de page : 0',
        s.erreurs.slice(0, 2).map(e => String(e).slice(0, 120)).join(' | '));
    dire(s.fenetresNatives.length === 0, 'fenêtres natives : 0',
        s.fenetresNatives.join(' | '));
    await s.fermer();
}

dits.forEach(d => console.log('  ' + d));
console.log(ratés.length ? `\n${ratés.length} chose(s) à regarder.` : '\nTOUT PASSE.');
process.exit(ratés.length ? 1 : 0);
