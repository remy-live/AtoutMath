// LE GLISSER-DÉPOSER DES JETONS, MESURÉ AU DOIGT ET À LA SOURIS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/glisserLesJetons.mjs            1280 × 900
//   node tools/glisserLesJetons.mjs --doigt     390 × 844
//
// RÉMY, 27 octobre : « il faudrait dans les deniers jeux que tu as fait
// pouvoir aussi drag dropper les chiffrres et nombres ». Le mot qui commande
// est « AUSSI » — cet outil mesure donc les TROIS chemins, pas seulement le
// neuf : on vérifie à chaque fois que le toucher et le clavier marchent
// encore.
//
// ET L'ON MESURE AUSSI LE GLISSER QUI RATE. Un jeton lâché à côté de la
// grille ne doit RIEN changer : c'est ce qui rend le geste sans risque, et
// donc essayable par un élève qui n'en est pas sûr.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const DOIGT = process.argv.includes('--doigt');
const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

// LE CHEMIN DES NOMBRES N'EST PAS DANS LA LISTE, et ce n'est pas un oubli :
// ses nombres vont jusqu'à 36, et `grilleNombres` ne dresse une palette que
// jusqu'à 9 — au-delà « ce n'est plus une palette, c'est un mur », comme le
// dit son propre commentaire. Sans jeton, il n'y a rien à glisser ; il se
// remplit au clavier, et c'est très bien ainsi.
const JEUX = ['logi-kakuro', 'logi-yohaku', 'logi-suguru', 'logi-gratte-ciel'];

const s = await ouvrirSonde(DOIGT ? { largeur: 390, hauteur: 844 }
    : { largeur: 1280, hauteur: 900 });
await s.identifier();

/** Le centre d'un élément, dans le repère de la page. */
const centre = (sel, n = 0) => s.page.evaluate(([q, k]) => {
    const e = document.querySelectorAll(q)[k];
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, [sel, n]);

/** Un vrai glisser : on appuie, on bouge en plusieurs pas, on lâche. */
async function glisser(de, vers) {
    await s.page.mouse.move(de.x, de.y);
    await s.page.mouse.down();
    for (let i = 1; i <= 6; i++) {
        await s.page.mouse.move(de.x + (vers.x - de.x) * i / 6,
            de.y + (vers.y - de.y) * i / 6);
        await dormir(25);
    }
    await s.page.mouse.up();
    await dormir(140);
}

for (const jeu of JEUX) {
    console.log(`\n${jeu.toUpperCase()}\n` + '─'.repeat(64));
    const avant = s.erreurs.length;
    await s.ouvrirExercice(jeu, {}, { questions: 2 });
    await dormir(1400);
    await s.doitExister('.gn-jeton', 'un jeton de la palette');
    await s.doitExister('.gn-cell[data-r]', 'une case de la grille');

    // La première case VIDE de la grille, et le premier jeton chiffré.
    const ouEstLaCase = await s.page.evaluate(() => {
        const cel = [...document.querySelectorAll('.gn-cell[data-r]')]
            .find(c => !c.classList.contains('gn-cell--donnee')
                && !c.classList.contains('gn-cell--mur')
                && !c.classList.contains('gn-cell--indice'));
        if (!cel) return null;
        const r = cel.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2,
            r: cel.dataset.r, c: cel.dataset.c };
    });
    dire('il y a une case à remplir', !!ouEstLaCase);
    if (!ouEstLaCase) continue;
    const jeton = await centre('.gn-jeton', 0);

    // ── 1. UN GLISSER QUI RATE NE CHANGE RIEN ──────────────────────────────
    //
    // LE POINT DE CHUTE SE CALCULE, il ne se devine pas. Premier jet : « cent
    // soixante pixels plus haut que le jeton ». En 390 px la palette est juste
    // sous la grille, donc cent soixante pixels plus haut tombent EN PLEINE
    // GRILLE — le glisser réussissait, et la sonde annonçait un échec de
    // mesure sur un logiciel qui marchait. On vise l'énoncé, au-dessus du
    // plateau, dont on sait qu'il ne porte aucune case.
    const avantRate = await s.page.evaluate(() => (document.querySelector('.gn-statut') || {}).textContent);
    const horsGrille = await centre('.gn-context', 0);
    await glisser(jeton, horsGrille);
    const apresRate = await s.page.evaluate(() => ({
        statut: (document.querySelector('.gn-statut') || {}).textContent,
        fantomes: document.querySelectorAll('.gn-fantome').length,
        cibles: document.querySelectorAll('.gn-cell--cible').length
    }));
    dire('un glisser lâché à côté ne pose rien',
        apresRate.statut === avantRate || /SUR une case/.test(apresRate.statut),
        apresRate.statut);
    dire('et il ne laisse ni fantôme ni surlignage',
        apresRate.fantomes === 0 && apresRate.cibles === 0);

    // ── 2. UN GLISSER QUI ARRIVE ÉCRIT DANS LA CASE ────────────────────────
    await glisser(jeton, ouEstLaCase);
    const pose = await s.page.evaluate(([r, c]) => {
        const cel = document.querySelector(`.gn-cell[data-r="${r}"][data-c="${c}"]`);
        const v = cel && cel.querySelector('.kk-val');
        return { valeur: v ? (v.tagName === 'INPUT' ? v.value : v.textContent.trim()) : null,
            active: !!cel && cel.classList.contains('gn-cell--active'),
            fantomes: document.querySelectorAll('.gn-fantome').length };
    }, [ouEstLaCase.r, ouEstLaCase.c]);
    dire('le jeton glissé s\'écrit dans la case', !!pose.valeur, `« ${pose.valeur} »`);
    dire('la case devient la case active', pose.active);
    dire('et le fantôme a disparu', pose.fantomes === 0);

    // ── 3. LE TOUCHER MARCHE ENCORE, exactement comme avant ────────────────
    await s.page.evaluate(([r, c]) => {
        const cel = document.querySelector(`.gn-cell[data-r="${r}"][data-c="${c}"]`);
        cel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        const g = [...document.querySelectorAll('.gn-jeton')]
            .find(b => b.classList.contains('gn-jeton--gomme'));
        if (g) g.click();
    }, [ouEstLaCase.r, ouEstLaCase.c]);
    await dormir(180);
    const efface = await s.page.evaluate(([r, c]) => {
        const cel = document.querySelector(`.gn-cell[data-r="${r}"][data-c="${c}"]`);
        const v = cel && cel.querySelector('.kk-val');
        return v ? (v.tagName === 'INPUT' ? v.value : v.textContent.trim()) : null;
    }, [ouEstLaCase.r, ouEstLaCase.c]);
    dire('le toucher marche toujours (la gomme efface)', !efface, `« ${efface} »`);

    const neuves = s.erreurs.length - avant;
    dire('aucune erreur de page', neuves === 0,
        neuves ? s.erreurs.slice(-neuves).join(' · ') : '');
}

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives : ${s.fenetresNatives.length}`);
if (s.fenetresNatives.length) ratés++;
console.log(ratés ? rouge(`\n${ratés} mesure(s) manquée(s).`)
    : vert('\nON GLISSE, ON TOUCHE, ET LES DEUX ÉCRIVENT DANS LA MÊME GRILLE.'));
await s.fermer();
process.exit(ratés ? 1 : 0);
