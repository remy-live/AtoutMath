// UN SEUL FICHIER POUR TOUS LES CARNETS — et leurs captures.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/tousLesCarnets.mjs
//
// RÉMY, après avoir relu douze exercices d'affilée :
//
//   « je ne peux toujours pas TOUT télécharger comme rapport d'erreur dans
//     l'atelier, je t'ai fait un par un »
//
// Douze fichiers reçus, un par exercice, pour une relecture d'une matinée.
//
// C'EST LA CONSÉQUENCE DIRECTE DE LA VEILLE. Le carnet est devenu propre à
// l'exercice — c'est ce qu'il demandait, et c'est juste —, mais le relevé ne
// portait que l'exercice COURANT. Un rangement sans porte de sortie est un
// rangement qui enferme.
//
// CE QU'ON MESURE, et pourquoi chaque ligne y est :
//
//   · ON ÉCRIT DANS TROIS CARNETS, et l'on vérifie que chacun reste chez lui —
//     sans quoi le fichier commun serait un fichier mélangé, ce qui est pire.
//   · LE RELEVÉ LES PORTE TOUS, celui qu'on regarde comme les autres.
//   · LES CAPTURES SUIVENT, avec le nom de LEUR exercice : douze images sans
//     titre sont douze images inutilisables.
//   · ET LE NOM DU FICHIER LE DIT, parce que c'est le nom qu'on relit six mois
//     plus tard dans un dossier de téléchargements.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR42mP8z8BQz0'
    + 'AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';

const TROIS = [
    { id: 'num-encadrement', note: 'note de l encadrement' },
    { id: 'num-divisibilite', note: 'note de la divisibilite' },
    { id: 'frac-lire', note: 'note de la fraction' }
];

const s = await ouvrirSonde({ largeur: 1600, hauteur: 1000 });
await s.identifier();
await s.page.evaluate(async () => {
    const m = await import('./js/ui/atelier.js');
    m.ouvrirAtelier('num-encadrement');
});
await dormir(3500);

const allerA = async (id) => {
    await s.page.evaluate((exo) => {
        const sel = document.getElementById('atl-exo');
        sel.value = exo;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }, id);
    await dormir(2600);
};
const ecrire = (t) => s.page.evaluate((texte) => {
    const n = document.getElementById('atl-notes');
    n.value = texte;
    n.dispatchEvent(new Event('input', { bubbles: true }));
}, t);
const glisser = (nom) => s.page.evaluate(([b64, n]) => {
    const bin = atob(b64);
    const oct = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([oct], n, { type: 'image/png' }));
    document.getElementById('atl-depot')
        .dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
}, [PNG, nom]);

console.log('\nTROIS CARNETS, ET CHACUN RESTE CHEZ LUI\n' + '─'.repeat(64));
for (const { id, note } of TROIS) {
    await allerA(id);
    await ecrire(note);
    await glisser(`capture-${id}.png`);
    await dormir(700);
}
// On repasse sur chacun pour vérifier qu'il a gardé le SIEN.
let melange = 0;
for (const { id, note } of TROIS) {
    await allerA(id);
    const vu = await s.page.evaluate(() => ({
        texte: (document.getElementById('atl-notes').value || '').trim(),
        photos: [...document.querySelectorAll('#atl-photos .atl-photo img')].map(i => i.alt)
    }));
    const bon = vu.texte === note && vu.photos.length === 1 && vu.photos[0].includes(id);
    if (!bon) melange++;
    if (!bon) console.log(gris(`      ${id} : « ${vu.texte} » · ${vu.photos.join(', ')}`));
}
dire('chaque exercice a gardé SON texte et SA capture', melange === 0,
    `${TROIS.length - melange} / ${TROIS.length}`);

console.log('\nLE RELEVÉ LES PORTE TOUS\n' + '─'.repeat(64));
const releve = await s.page.evaluate(async () => {
    let copie = '';
    const vrai = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (t) => { copie = t; return Promise.resolve(); };
    document.getElementById('atl-releve').click();
    await new Promise(r => setTimeout(r, 900));
    navigator.clipboard.writeText = vrai;
    return copie;
});
dire('il a une section pour les autres carnets',
    /## Les carnets des autres exercices \(2\)/.test(releve),
    (releve.match(/## [^\n]+/g) || []).slice(-3).join(' · '));
const manquants = TROIS.filter(({ note }) => !releve.includes(note));
dire('les trois notes y sont, celle qu\'on regarde comprise', manquants.length === 0,
    manquants.length ? manquants.map(m => m.id).join(', ') : 'les 3');
dire('et chacune est sous le titre de son exercice',
    /### [^\n]+ \(num-encadrement\)/.test(releve) || /# Atelier — [^\n]+\(num-encadrement\)/.test(releve),
    (releve.match(/### [^\n]+/g) || []).join(' · '));

console.log('\nLE FICHIER TÉLÉCHARGÉ, ET SON NOM\n' + '─'.repeat(64));
const attendu = s.page.waitForEvent('download', { timeout: 60000 });
await s.cliquer('#atl-telecharger', 'le bouton de téléchargement');
let nom = '';
try { nom = (await attendu).suggestedFilename(); } catch (e) { nom = ''; }
dire('il s\'appelle « atelier-tous-… »', /^atelier-tous-\d{4}/.test(nom),
    nom || '(aucun téléchargement)');
const toast = await s.page.evaluate(async () => {
    for (let i = 0; i < 60; i++) {
        const t = (document.getElementById('toast-container') || {}).textContent || '';
        if (/Relevé enregistré/.test(t)) return t;
        await new Promise(r => setTimeout(r, 250));
    }
    return '';
});
dire('et le toast dit combien de carnets sont dedans',
    /Les 3 carnets écrits sont dedans/.test(toast),
    (/Les \d+ carnets[^.]*\./.exec(toast) || ['(rien dans le toast)'])[0]);

console.log('\nET « TOUT EFFACER » LES EFFACE TOUS\n' + '─'.repeat(64));
await s.cliquer('#atl-tout-effacer', 'le bouton « Tout effacer »');
await dormir(900);
const fenetre = await s.page.evaluate(() => {
    const el = document.querySelector('.atl-tout-dit');
    return el ? [...el.querySelectorAll('li')].map(l => l.textContent.trim()) : null;
});
dire('la fenêtre annonce les carnets des autres exercices',
    !!fenetre && fenetre.some(l => /carnets de 2 autre/.test(l)),
    (fenetre || []).join(' · '));
await s.page.evaluate(() => document.querySelector('[data-effacer="oui"]').click());
await dormir(1200);
const reste = await s.page.evaluate(() => {
    let n = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            if ((localStorage.key(i) || '').startsWith('mathbox-atelier-notes-')) n++;
        }
    } catch (e) { return -1; }
    return n;
});
dire('plus aucun carnet ne reste dans le navigateur', reste === 0, `${reste} clef(s)`);

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + s.erreurs.length}`);
if (s.erreurs.length) console.log(gris(s.erreurs.slice(0, 2).join('\n')));
console.log(ratés === 0 ? vert('\nUN SEUL FICHIER PORTE TOUS LES CARNETS.')
    : rouge(`\n${ratés} mesure(s) manquée(s).`));
await s.fermer();
process.exit(ratés === 0 ? 0 : 1);
