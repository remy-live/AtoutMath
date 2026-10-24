// EFFACER TOUT LE COMPTE RENDU — et ne perdre que lui.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/effacerLeCompteRendu.mjs
//
// RÉMY : « et aussi dans l'atelier, comment effacer tout le compte rendu »
//
// Il n'y avait aucun moyen, sauf recharger la page — ce qui coûtait aussi
// l'exercice choisi et les volets ouverts. Un relevé est une PREUVE : une
// preuve qui traîne des mesures faites il y a une heure sur un autre réglage
// ne prouve rien, et c'est moi qui la lirais sans savoir que la moitié est
// périmée.
//
// CE QU'ON MESURE, et pourquoi chaque ligne y est :
//
//   · ON REMPLIT D'ABORD. Mesurer un effacement sur un compte rendu déjà vide
//     ne mesure rien : on glisse une capture, on écrit dans le carnet, on
//     lance un contrôle, et SEULEMENT ensuite on efface.
//   · LA FENÊTRE DIT CE QU'ELLE VA RETIRER. C'est la réponse à sa question
//     autant que la sécurité : une tournée de catalogue coûte quarante-neuf
//     minutes, et on ne l'efface pas d'un clic distrait.
//   · ET L'EXERCICE RESTE. C'est toute la différence avec un F5 : on efface le
//     compte rendu, pas la préparation.

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

const PNG_ROUGE = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR42mP8z8BQz0'
    + 'AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';

const s = await ouvrirSonde({ largeur: 1600, hauteur: 1000 });
await s.identifier();
await s.page.evaluate(async () => {
    const m = await import('./js/ui/atelier.js');
    m.ouvrirAtelier('calc-add');
});
await dormir(2500);

console.log('\nON REMPLIT LE COMPTE RENDU\n' + '─'.repeat(64));
await s.doitExister('#atl-tout-effacer', 'le bouton « Tout effacer »');
await s.page.evaluate(async (b64) => {
    const bin = atob(b64);
    const oct = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([oct], 'capture-a-effacer.png', { type: 'image/png' }));
    document.getElementById('atl-depot')
        .dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    const n = document.getElementById('atl-notes');
    n.value = 'une note qui doit disparaitre';
    n.dispatchEvent(new Event('input', { bubbles: true }));
}, PNG_ROUGE);
await dormir(900);
// LE CONTRÔLE D'UN EXERCICE : 11,7 s mesurées. C'est lui qui remplit le bloc
// « Le contrôle », et c'est la partie du compte rendu qui coûte cher.
await s.cliquer('#atl-controler', 'le bouton « Contrôler »');
await dormir(16000);

const plein = await s.page.evaluate(() => ({
    photos: document.querySelectorAll('#atl-photos .atl-photo').length,
    notes: (document.getElementById('atl-notes').value || '').trim().length,
    controle: document.querySelectorAll('#atl-controle .atl-controle-ligne').length,
    blocCache: document.getElementById('atl-bloc-controle').hidden,
    rangee: (() => { try { return !!localStorage.getItem('mathbox-atelier-notes'); }
        catch (e) { return false; } })(),
    exo: (document.getElementById('atl-exo') || {}).value || ''
}));
dire('une capture est dedans', plein.photos === 1, `${plein.photos}`);
dire('le carnet porte du texte', plein.notes > 0, `${plein.notes} caractère(s)`);
dire('et il est rangé dans le navigateur', plein.rangee);
dire('le contrôle a rendu son verdict', plein.controle > 0 && !plein.blocCache,
    `${plein.controle} ligne(s)`);

console.log('\nLA FENÊTRE DIT CE QU\'ELLE VA RETIRER\n' + '─'.repeat(64));
await s.cliquer('#atl-tout-effacer', 'le bouton « Tout effacer »');
await dormir(900);
const fenetre = await s.page.evaluate(() => {
    const el = document.querySelector('.atl-tout-dit');
    if (!el) return null;
    return {
        lignes: [...el.querySelectorAll('li')].map(l => l.textContent.trim()),
        texte: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        choix: [...el.querySelectorAll('[data-effacer]')].map(b => b.textContent.trim())
    };
});
dire('la fenêtre s\'ouvre', !!fenetre);
if (fenetre) {
    dire('elle énumère ce qui part', fenetre.lignes.length >= 3, fenetre.lignes.join(' · '));
    dire('elle promet que l\'exercice reste', /RESTENT/.test(fenetre.texte));
    dire('et l\'on peut renoncer', fenetre.choix.some(c => /annuler/i.test(c)),
        fenetre.choix.join(' · '));
    await s.page.evaluate(() => document.querySelector('[data-effacer="oui"]').click());
    await dormir(1200);
}

console.log('\nTOUT EST PARTI, ET L\'EXERCICE EST RESTÉ\n' + '─'.repeat(64));
const apres = await s.page.evaluate(() => ({
    photos: document.querySelectorAll('#atl-photos .atl-photo').length,
    notes: (document.getElementById('atl-notes').value || '').trim().length,
    controle: document.querySelectorAll('#atl-controle .atl-controle-ligne').length,
    blocCache: document.getElementById('atl-bloc-controle').hidden,
    rangee: (() => { try { return !!localStorage.getItem('mathbox-atelier-notes'); }
        catch (e) { return false; } })(),
    exo: (document.getElementById('atl-exo') || {}).value || '',
    releve: ''
}));
dire('les captures sont parties', apres.photos === 0, `${apres.photos} restante(s)`);
dire('le carnet est vide', apres.notes === 0);
// LA CLEF DU NAVIGATEUR AUSSI : l'effacer à l'écran sans la retirer ferait
// revenir le carnet au prochain F5, et l'on croirait le bouton cassé.
dire('et il ne reviendra pas au prochain F5', !apres.rangee);
dire('le verdict du contrôle est parti', apres.controle === 0 && apres.blocCache,
    `${apres.controle} ligne(s), bloc ${apres.blocCache ? 'caché' : 'VISIBLE'}`);
dire('mais l\'exercice choisi est resté', apres.exo === plein.exo && !!apres.exo,
    `${plein.exo} → ${apres.exo}`);

// ET LE RELEVÉ NE PORTE PLUS RIEN DE TOUT CELA. C'est le point : ce qu'on
// efface doit disparaître du FICHIER, pas seulement de l'écran.
const releve = await s.page.evaluate(async () => {
    let copie = '';
    const vrai = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (t) => { copie = t; return Promise.resolve(); };
    document.getElementById('atl-releve').click();
    await new Promise(r => setTimeout(r, 900));
    navigator.clipboard.writeText = vrai;
    return copie;
});
dire('et le relevé n\'en parle plus',
    !/## Le contrôle\b/.test(releve) && !/## Le carnet/.test(releve)
        && !/## Captures glissées/.test(releve),
    (releve.match(/## [^\n]+/g) || []).join(' · '));

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + s.erreurs.length}`);
if (s.erreurs.length) console.log(gris(s.erreurs.slice(0, 2).join('\n')));
console.log(ratés === 0 ? vert('\nLE COMPTE RENDU S\'EFFACE, ET L\'EXERCICE RESTE.')
    : rouge(`\n${ratés} mesure(s) manquée(s).`));
await s.fermer();
process.exit(ratés === 0 ? 0 : 1);
