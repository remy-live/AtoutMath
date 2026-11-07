// LE BOUTON « Fiches de reprise », PRESSÉ PAR LE CHEMIN DE RÉMY.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/boutonDesReprises.mjs
//
// `tools/reprisesEnPdf.mjs` mesure le DOCUMENT : il appelle la fabrication
// depuis la page, et regarde les feuilles. Il ne presse aucun bouton — et
// entre la fonction et le bouton il y a l'écran des classes, la fenêtre, la
// case à cocher et le téléchargement. Un rendu juste derrière un bouton qui
// n'existe pas est un rendu que personne n'aura jamais.
//
// CE QU'ON VÉRIFIE ICI, ET QUI NE SE VOIT QUE D'ICI :
//
//   · le bouton est sur l'écran des classes, sans rien régler ;
//   · la fenêtre dit COMBIEN de feuilles et QUI n'en a pas — c'est ce qui
//     permet de presser « Télécharger » sans crainte ;
//   · le PDF arrive pour de bon, et il a plus de pages que d'élèves (les
//     corrigés sont dedans) ;
//   · et aucune fenêtre native ne s'ouvre en chemin. « tu utilises des alert
//     et prompt, on évite ! »

import { mkdir } from 'node:fs/promises';
import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const SORTIE = 'tools/tmp/bouton-reprises';
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

    // LES CINQ CLASSES DE DÉMONSTRATION, posées comme le professeur le ferait
    // par le bouton « Charger des classes de démonstration ».
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
    await s.doitExister('[data-reprises]', 'le bouton « Fiches de reprise »');
    // LE BOUTON DORT DANS UN `<details>` FERMÉ — « Classes locales, importées
    // de fichiers (5) ». Il MESURE 156 × 40 et il n'est pas cliquable :
    // Playwright répète « element is not visible » pendant trente secondes,
    // et il a raison. C'est la friction que `deplier` ferme, et elle s'est
    // reproduite ici comme ailleurs.
    const replie = await s.deplier('[data-reprises]');
    dire(true, 'le bouton est sur l\'écran des classes',
        replie ? 'dans le repli des classes locales' : '');

    const telechargements = [];
    s.page.on('download', async (d) => {
        const chemin = `${SORTIE}/${d.suggestedFilename()}`;
        await d.saveAs(chemin);
        telechargements.push(chemin);
    });

    await s.page.click('[data-reprises]');
    await dormir(2500);
    const vue = await s.page.evaluate(() => {
        const t = document.body.textContent.replace(/\s+/g, ' ');
        return {
            detachable: !!document.querySelector('#rp-detachable'),
            faire: !!document.querySelector('[data-faire]'),
            combien: (t.match(/(\d+) feuilles? pour/) || [])[1] || null,
            ditLesAbsents: /n'ont rien déposé/.test(t),
            ditLesAcquis: /tout est acquis/.test(t)
        };
    });
    dire(!!vue.faire, 'la fenêtre s\'ouvre avec son bouton de téléchargement');
    dire(!!vue.combien, 'elle dit combien de feuilles', vue.combien ? vue.combien : 'aucun nombre');
    dire(vue.ditLesAbsents || vue.ditLesAcquis,
        'elle dit qui n\'a pas de feuille, et pourquoi');
    dire(vue.detachable, 'la case du corrigé détachable est là');

    await s.page.screenshot({ path: `${SORTIE}/fenetre.png` });

    await s.page.click('[data-faire]');
    // LA FABRICATION PREND DU TEMPS : cent questions tirées, autant de figures
    // dessinées. On attend le FICHIER, pas une durée.
    for (let i = 0; i < 60 && !telechargements.length; i++) await dormir(500);
    dire(telechargements.length > 0, 'le PDF arrive',
        telechargements.length ? telechargements[0] : 'aucun fichier en 30 s');

    // ET LE MOT DE FIN DIT CE QU'ON A OBTENU.
    await dormir(1200);
    const fin = await s.page.evaluate(() => {
        const t = document.body.textContent.replace(/\s+/g, ' ');
        const m = t.match(/(\d+) feuilles? · (\d+) pages?/);
        return { mot: m ? m[0] : null, feuilles: m ? +m[1] : 0, pages: m ? +m[2] : 0,
            fenetreFermee: !document.querySelector('[data-faire]') };
    });
    dire(!!fin.mot, 'le logiciel dit ce qu\'il a fabriqué', fin.mot || '(rien)');
    // PLUS DE PAGES QUE DE FEUILLES : les corrigés sont dans le même document.
    dire(fin.pages > fin.feuilles, 'les corrigés sont dans le document',
        `${fin.feuilles} feuilles, ${fin.pages} pages`);
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
