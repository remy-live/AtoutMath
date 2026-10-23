// COMBIEN DE CLICS POUR CHOISIR LES COLONNES, DEPUIS L'ATELIER ?
//
//   node tools/optionsDeLaFeuille.mjs
//
// Rémy : « pour l'apercu de la feuille, il faudrait que je puisse choisir les
// options (couleur/colonne) pour vérifier ».
//
// Les deux réglages EXISTENT — `#fq-couleur` et `#fq-colonnes`. La question
// n'est donc pas de les écrire, c'est de savoir ce qu'il faut faire pour les
// atteindre. On compte les replis fermés entre lui et eux.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1600, hauteur: 1000 });
await s.identifier();

// L'ATELIER S'OUVRE SUR UN EXERCICE, comme la barre de passe le fait.
await s.page.evaluate(async () => {
    const m = await import('./js/ui/atelier.js');
    m.ouvrirAtelier('num-pgcd-ppcm');
});
await dormir(2500);
await s.doitExister('#atl-volet-fiche', 'le volet de la feuille');

// LE VOLET S'ALLUME PAR SA PASTILLE — `[data-volet="fiche"]`, lue dans la
// source. Ma première version mesurait le cadre avant d'avoir cliqué : la
// fenêtre d'impression n'y existait pas encore, et la sonde annonçait
// « ni #fq-colonnes ni #fp-couleur » sur un Atelier parfaitement sain.
const dejaLa = await s.page.evaluate(() =>
    document.querySelector('[data-volet="fiche"]').classList.contains('active'));
if (!dejaLa) await s.cliquer('[data-volet="fiche"]', 'la pastille « La feuille »');
await dormir(3500);

// LE VOLET DE LA FEUILLE EST UN IFRAME : les réglages vivent DEDANS.
const m = await s.page.evaluate(() => {
    const cadre = document.getElementById('atl-fiche');
    const d = cadre && cadre.contentDocument;
    if (!d) return { erreur: 'le cadre de la feuille n\'a pas de document' };
    const trouve = (sel) => d.querySelector(sel);
    const cible = trouve('#fq-colonnes') || trouve('#fp-couleur');
    if (!cible) {
        return {
            erreur: 'ni #fq-colonnes ni #fp-couleur dans le cadre',
            modales: [...d.querySelectorAll('[id$="-modal"]')].map(x => x.id)
        };
    }
    // ON REMONTE LES REPLIS FERMÉS entre le réglage et la racine : c'est le
    // nombre de clics qu'il faut faire pour le voir.
    const replis = [];
    for (let e = cible.parentElement; e; e = e.parentElement) {
        if (e.tagName === 'DETAILS') {
            const som = e.querySelector('summary');
            replis.push({
                nom: som ? som.textContent.trim() : e.id || '(sans nom)',
                ouvert: e.open
            });
        }
    }
    return {
        reglage: cible.id,
        visible: !!cible.offsetParent,
        replis,
        clics: replis.filter(r => !r.ouvert).length,
        // ET CE QUE LE PREMIER REPLI ANNONCE : s'il ne nomme ni la couleur ni
        // les colonnes, on ne l'ouvre pas pour les chercher.
        leNomDuDehors: replis.length ? replis[replis.length - 1].nom : '(aucun repli)'
    };
});
console.log(JSON.stringify(m, null, 1));
const vert = (x) => `\x1b[32m${x}\x1b[0m`, rouge = (x) => `\x1b[31m${x}\x1b[0m`;
// UN CLIC, PAS DEUX. C'est la mesure entière : un réglage qu'on atteint en
// deux replis fermés est un réglage qu'on ne trouve pas, et Rémy a demandé
// ceux-là en croyant qu'ils n'existaient pas.
const bon = m.clics === 1 && /colonnes/.test(m.leNomDuDehors) && /couleur/.test(m.leNomDuDehors);
console.log(bon ? vert('\nUN SEUL CLIC, ET LE NOM LE DIT.')
    : rouge(`\n${m.clics} clic(s), et le nom dit « ${m.leNomDuDehors} ».`));
process.exitCode = bon ? 0 : 1;
console.log(await s.photo('#atl-volet-fiche', 'tools/tmp/atelier-feuille.png', 0));
console.log(`erreurs : ${s.erreurs.length} | fenêtres natives : ${s.fenetresNatives.length}`);
await s.fermer();
