// « J'AI EU TOUT BON ET IL DIT QUE J'AI EU FAUX ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo d'écran à l'appui : « Tu as 1 bonne réponse, il en faut 4 »,
// après avoir rangé UNE frise entière sans une erreur — et l'exercice en
// demandait cinq.
//
// LA CAUSE : `terminerPartie` ne se compte qu'une fois (`_partieClose`) et
// surtout elle CLÔT L'ÉTAPE. Un jeu dont l'unité se répète ne doit pas
// l'appeler : il compte une QUESTION PLEINE et enchaîne.
//
// CE QUE CETTE SONDE MESURE, et qu'aucune épreuve de bureau ne peut voir : que
// le compteur de la séance avance de frise en frise, et qu'une deuxième frise
// arrive toute seule.
//
//     node tools/deuxFrisesDeSuite.mjs
import { ouvrirSonde } from './sonde.mjs';

let ko = 0;
const dire = (bon, quoi) => { if (!bon) ko++; console.log(`  ${bon ? 'ok  ' : 'NON '} ${quoi}`); };

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();

/** Ce que le bandeau de la séance affiche : « 2 / 5 frises ». */
const compteur = () => s.page.evaluate(() => {
    const t = (document.querySelector('#game-layer') || document.body).innerText;
    const m = /(\d+)\s*\/\s*(\d+)\s*(frise|tableau)/i.exec(t);
    return m ? { fait: Number(m[1]), total: Number(m[2]), mot: m[3] } : null;
});

/** Range la frise en entier, en touchant chaque carte puis sa case. */
const rangerToute = async () => {
    for (let i = 0; i < 9; i++) {
        const reste = await s.page.evaluate(() => {
            const c = [...document.querySelectorAll('.fr-carte')].find(x => !x.disabled);
            return c ? { id: c.dataset.id, expo: Number(c.dataset.expo) } : null;
        });
        if (!reste) return i;
        const ou = (sel) => s.page.evaluate((q) => {
            const el = document.querySelector(q);
            if (!el) return null;
            const b = el.getBoundingClientRect();
            return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        }, sel);
        const a = await ou(`.fr-carte[data-id="${reste.id}"]`);
        const b = await ou(`.fr-trou[data-expo="${reste.expo}"]`);
        if (!a || !b) return i;
        await s.page.mouse.click(a.x, a.y);
        await s.page.mouse.click(b.x, b.y);
    }
    return 9;
};

await s.ouvrirExercice('num-echelle-tailles',
    { monde: 'nous', objets: 5, carte: 'decimale' }, { questions: 5 });
await s.doitExister('.fr-carte');

console.log('\n── LA PREMIÈRE FRISE ──');
const avant = await compteur();
console.log('  le bandeau dit :', JSON.stringify(avant));
const poses1 = await rangerToute();
dire(poses1 === 5, `les cinq objets sont rangés (${poses1})`);

// LA SECONDE FRISE ARRIVE TOUTE SEULE, après le délai qui laisse relire.
await s.page.waitForTimeout(3200);
const apres = await compteur();
console.log('  le bandeau dit maintenant :', JSON.stringify(apres));
dire(!!apres && apres.fait >= 1,
    `la frise finie est COMPTÉE (${apres ? apres.fait : '?'} / ${apres ? apres.total : '?'})`);

const neuves = await s.page.evaluate(() =>
    [...document.querySelectorAll('.fr-carte')].filter(x => !x.disabled).length);
dire(neuves === 5, `une seconde frise est posée, avec cinq cartes neuves (${neuves})`);

const bilan = await s.page.evaluate(() =>
    /bonne réponse|Presque|Réessayer/i.test(
        (document.querySelector('#game-layer') || document.body).innerText));
dire(!bilan, 'et AUCUN écran de bilan ne s’est ouvert après une seule frise');

console.log('\n── LA SECONDE FRISE ──');
const poses2 = await rangerToute();
dire(poses2 === 5, `elle se range aussi (${poses2})`);
await s.page.waitForTimeout(3200);
const fin = await compteur();
console.log('  le bandeau dit maintenant :', JSON.stringify(fin));
dire(!!fin && fin.fait >= 2, `DEUX frises sont comptées (${fin ? fin.fait : '?'})`);

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
ko += s.erreurs.length + s.fenetresNatives.length;
for (const e of s.erreurs.slice(0, 4)) console.log('  !', e);
await s.fermer();
console.log(ko === 0 ? '\nLES FRISES S’ENCHAÎNENT ET SE COMPTENT.' : `\n${ko} POINT(S) ROUGE(S).`);
process.exit(ko === 0 ? 0 : 1);
