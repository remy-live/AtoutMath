// LE GESTE DE RÉMY, REFAIT À LA SOURIS.
//
// « on clique souvent sur le titre pour changer le nom et on ne comprend pas
// pourquoi cela ne charge pas » — donc on CLIQUE SUR LE TITRE et l'on regarde
// si le parcours se charge. Puis on double-clique dessus et l'on regarde si
// l'on peut écrire. Puis on replie un dossier.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const largeur = Number(process.argv[2] || 1280);
const s = await ouvrirSonde({ largeur, hauteur: 900 });
await s.identifier();
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`); };

// ON SE FABRIQUE DE QUOI MESURER : deux parcours et un dossier qui en contient
// un. Sans cela la sonde dépend de ce qui traîne dans le profil d'essai.
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const d = state.addTeacherFolder('Sixième');
    const faire = (nom, folderId) => {
        state.teacherPaths.push({
            id: 'p_' + nom, name: nom, folderId,
            timestamp: Date.now(),
            data: { name: nom, steps: [{ exerciseId: 'calc-add', nbItems: 5 }] }
        });
    };
    faire('Alpha', d.id);
    faire('Beta', 'root');
    faire('Gamma', 'root');
    state.saveTeacherPaths();
});
await dormir(500);

const ouvrirTiroir = async () => {
    const b = await s.page.$('#btn-tiroir-parcours, [data-tiroir="parcours"]');
    if (b) { await b.click(); await dormir(500); }
};
await ouvrirTiroir();

const cible = '.path-browser-item[data-parcours="p_Gamma"]';
const dispo = await s.page.$(cible);
if (!dispo) {
    console.log('\x1b[31mLa liste des parcours ne s\'affiche pas — rien à mesurer.\x1b[0m');
    const ou = await s.page.evaluate(() => [...document.querySelectorAll('.path-browser-item')]
        .map(e => e.dataset.parcours).join(', ') || '(aucune fiche)');
    console.log('   fiches vues : ' + ou);
    await s.fermer();
    process.exit(1);
}

console.log('\n\x1b[1mUN SIMPLE CLIC SUR LE TITRE\x1b[0m');
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    state.currentPathId = null;
});
await s.page.click(`${cible} .path-browser-name`);
await dormir(450);
const apres = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return { ouvert: state.currentPathId, nomEdite: document.activeElement
        && document.activeElement.getAttribute('contenteditable') };
});
dire('le parcours se charge', apres.ouvert === 'p_Gamma', String(apres.ouvert));
dire('et l\'on n\'est PAS en train de renommer', apres.nomEdite !== 'true',
    'contenteditable = ' + String(apres.nomEdite));

console.log('\n\x1b[1mUN DOUBLE-CLIC SUR LE TITRE\x1b[0m');
await s.page.dblclick(`${cible} .path-browser-name`);
await dormir(350);
const edition = await s.page.evaluate(() => {
    const el = document.querySelector('.path-browser-item[data-parcours="p_Gamma"] .path-browser-name');
    const sel = window.getSelection();
    return { editable: el.getAttribute('contenteditable'), actif: document.activeElement === el,
        toutSelectionne: sel && sel.toString().trim() === el.textContent.trim() };
});
dire('le nom devient modifiable', edition.editable === 'true', String(edition.editable));
dire('le curseur y est', edition.actif);
dire('et tout le nom est sélectionné, pour le remplacer', edition.toutSelectionne);

await s.page.keyboard.type('Gamma renommé');
await s.page.keyboard.press('Enter');
await dormir(450);
const renomme = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return (state.teacherPaths.find(p => p.id === 'p_Gamma') || {}).name;
});
dire('le nouveau nom est enregistré', renomme === 'Gamma renommé', String(renomme));

// QUI REMET L'ANCIEN NOM, ET QUAND. On regarde les quatre valeurs qui portent
// un nom, au fil du temps : l'entrée de la liste, le parcours en cours, le
// champ de l'éditeur. Celle qui change la dernière est la coupable.
for (const t of [300, 1500, 4000]) {
    await dormir(t === 300 ? 300 : 1200);
    const v = await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const champ = document.getElementById('path-name-input');
        return { entree: (state.teacherPaths.find(p => p.id === 'p_Gamma') || {}).name,
            courant: state.currentPath && state.currentPath.name,
            id: state.currentPathId, champ: champ ? champ.value : '(aucun)' };
    });
    console.log(`     à ${String(t).padStart(4)} ms · ${JSON.stringify(v)}`);
}

console.log('\n\x1b[1mÉCHAP REMET LE NOM D\'AVANT\x1b[0m');
const etat = async (quand) => {
    const v = await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const el = document.querySelector('.path-browser-item[data-parcours="p_Gamma"] .path-browser-name');
        return { entree: (state.teacherPaths.find(p => p.id === 'p_Gamma') || {}).name,
            courant: state.currentPath && state.currentPath.name,
            ecran: el ? el.textContent.trim() : '(fiche disparue)' };
    });
    console.log(`     ${quand.padEnd(18)} ${JSON.stringify(v)}`);
};
await etat('avant le double-clic');
await s.page.dblclick(`${cible} .path-browser-name`);
await dormir(250);
await etat('après le double-clic');
await s.page.keyboard.type('Jeté');
await dormir(150);
await etat('après la frappe');
await s.page.keyboard.press('Escape');
await dormir(400);
await etat('après Échap');
const annule = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return { garde: (state.teacherPaths.find(p => p.id === 'p_Gamma') || {}).name,
        ecran: document.querySelector('.path-browser-item[data-parcours="p_Gamma"] .path-browser-name').textContent.trim() };
});
dire('rien n\'est enregistré', annule.garde === 'Gamma renommé', String(annule.garde));
dire('et l\'écran remet le nom d\'avant', annule.ecran === 'Gamma renommé', annule.ecran);

console.log('\n\x1b[1mLE DOSSIER SE REPLIE\x1b[0m');
// LES DOSSIERS N'EXISTENT QUE SOUS LE TRI « dossiers » : le tri par défaut
// range par date et les aplatit. Sans ce clic, la sonde cherchait un
// `.path-folder` qui n'avait aucune raison d'être là.
const bTri = await s.page.$('[data-tri="dossiers"]');
if (bTri) { await bTri.click(); await dormir(500); }
if (!await s.page.$('.path-folder')) {
    dire('un dossier s\'affiche sous le tri « dossiers »', false, 'aucun .path-folder');
    console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '');
    await s.fermer();
    process.exit(1);
}
const avant = await s.page.evaluate(() => {
    const b = document.querySelector('.path-folder .path-folder-body');
    return { visible: b ? !b.hidden : null, hauteur: Math.round(
        document.querySelector('.path-folder').getBoundingClientRect().height) };
});
await s.page.click('.path-folder .path-folder-head');
await dormir(400);
const plie = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const bloc = document.querySelector('.path-folder');
    const b = bloc.querySelector('.path-folder-body');
    return {
        cache: b ? b.hidden : null,
        hauteur: Math.round(bloc.getBoundingClientRect().height),
        compte: (bloc.querySelector('.path-folder-compte') || {}).textContent,
        aria: bloc.querySelector('.path-folder-head').getAttribute('aria-expanded'),
        garde: state.teacherFolders.some(f => f.replie)
    };
});
// ON NE CROIT PAS `hidden` SUR PAROLE : `display: flex` l'emporte sur lui, et
// le corps restait à l'écran avec `hidden = true`. C'est la HAUTEUR du bloc
// qui dit si quelque chose a été replié.
dire('le corps disparaît VRAIMENT', plie.cache === true && plie.hauteur < avant.hauteur - 25,
    `avant ${avant.hauteur} px → ${plie.hauteur} px`);
dire('la tête dit ce qu\'elle cache', /parcours|vide/.test(plie.compte || ''), plie.compte);
dire('aria-expanded suit', plie.aria === 'false', String(plie.aria));
dire('et le pli est retenu', plie.garde === true);

// ET IL SE DÉPLIE : un pli qui ne se défait pas est une suppression.
await s.page.click('.path-folder .path-folder-head');
await dormir(400);
const deplie = await s.page.evaluate(() => {
    const b = document.querySelector('.path-folder .path-folder-body');
    return b ? b.hidden : null;
});
dire('un second clic le rouvre', deplie === false, String(deplie));

console.log(`\nerreurs de page : ${s.erreurs.length} · natives : ${s.fenetresNatives.length}`);
if (s.erreurs.length) s.erreurs.slice(0, 4).forEach(e => console.log('   ' + e));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;
await s.photo('.path-folder', 'tools/tmp/dossier.png');
console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '\n\x1b[32mLES DEUX GESTES SE DISTINGUENT\x1b[0m');
await s.fermer();
