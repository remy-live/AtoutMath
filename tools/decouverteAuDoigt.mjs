// LE MODE DÉCOUVERTE, PAR LE CHEMIN DU VISITEUR — il arrive sans rien.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/decouverteAuDoigt.mjs
//
// RÉMY, 3 novembre : « j'aimerai bien un mode démo dans l'accueil avec un
// apercu des exercices […] et pouvoir faire qqs exercices. »
//
// CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE :
//
//   · LA PORTE EXISTE SUR L'ACCUEIL, et elle s'ouvre. Le noyau sait quels
//     exercices montrer ; il ne sait rien du bouton.
//   · LES APERÇUS SONT DES FIGURES, pas des rectangles gris. C'est toute la
//     valeur d'une vitrine : on reconnaît l'exercice d'un coup d'œil. Un
//     générateur qui refuse ses réglages rend une carte vide, et rien ne le
//     dit.
//   · ON PEUT JOUER POUR DE VRAI — c'est sa demande explicite.
//   · ET RIEN N'EST ENREGISTRÉ. C'est écrit en haut de l'écran : si le journal
//     grossissait, la promesse serait fausse, et c'est la seule chose ici
//     qu'on ne peut pas se permettre.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const TAILLES = [
    { nom: 'doigt', largeur: 390, hauteur: 900 },
    { nom: 'ordi', largeur: 1280, hauteur: 950 }
];

async function unePasse(taille) {
    const s = await ouvrirSonde({ largeur: taille.largeur, hauteur: taille.hauteur });
    const dits = [], ratés = [];
    try {
        // LE VISITEUR N'A PAS DE COMPTE : on ne s'identifie pas, et c'est tout
        // le sujet. Une sonde qui s'identifierait d'abord mesurerait l'écran
        // d'un élève inscrit.
        await dormir(900);
        await s.doitExister('#portail-decouvrir', 'la porte de la découverte');
        dits.push('la porte « Découvrir AtoutMath » est sur l\'accueil');

        await s.page.click('#portail-decouvrir');
        await dormir(900);
        await s.doitExister('.dc-vitrine', 'la vitrine');

        const vu = await s.page.evaluate(() => {
            const cartes = [...document.querySelectorAll('.dc-carte')];
            return {
                cartes: cartes.length,
                essayer: document.querySelectorAll('[data-essayer]').length,
                fiches: document.querySelectorAll('[data-fiche]').length,
                // Un aperçu VIDE est le défaut silencieux de cet écran.
                vides: cartes.filter(c =>
                    !(c.querySelector('.dc-apercu') || {}).innerHTML.trim()).length,
                // Et un aperçu qui ne porte AUCUN dessin ni aucun texte n'est
                // pas une vitrine : c'est un rectangle gris.
                sansFigure: cartes.filter(c => {
                    const a = c.querySelector('.dc-apercu');
                    if (!a) return true;
                    return !a.querySelector('svg, canvas, table, img')
                        && a.textContent.trim().length < 3;
                }).length,
                niveaux: cartes.map(c =>
                    (c.querySelector('.dc-niveau') || {}).textContent || '').filter(Boolean).length,
                // ET AUCUN APERÇU N'EST ROGNÉ. Le cadre est à hauteur fixe et
                // coupe EN HAUT ET EN BAS : une figure trop grande n'a pas
                // l'air rognée, elle a l'air mal dessinée, et personne ne va
                // chercher la hauteur d'une boîte CSS. Quatre sur dix sortaient
                // du cadre avant qu'on les rapetisse. On mesure le rendu, donc
                // APRÈS la mise à l'échelle : c'est ce que le visiteur voit.
                rognes: cartes.filter(c => {
                    const cadre = c.querySelector('.dc-cadre');
                    if (!cadre) return false;
                    const boite = cadre.parentElement;
                    const st = getComputedStyle(boite);
                    const dispo = boite.clientHeight
                        - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom);
                    return cadre.getBoundingClientRect().height > dispo + 1;
                }).length,
                dehors: document.documentElement.scrollWidth - window.innerWidth
            };
        });
        dits.push(`${vu.cartes} cartes, ${vu.essayer} boutons « Essayer », `
            + `${vu.fiches} boutons « La fiche »`);
        if (vu.cartes < 8) { ratés.push('vitrine'); dits.push('MOINS DE HUIT CARTES'); }
        dits.push(vu.vides === 0 ? 'aucun aperçu vide'
            : `${vu.vides} APERÇU(S) VIDE(S)`);
        if (vu.vides) ratés.push('aperçu vide');
        dits.push(vu.sansFigure === 0 ? 'chaque aperçu porte une figure ou un énoncé'
            : `${vu.sansFigure} APERÇU(S) SANS RIEN À REGARDER`);
        if (vu.sansFigure) ratés.push('aperçu muet');
        dits.push(vu.niveaux === vu.cartes ? 'chaque carte dit ses niveaux'
            : `${vu.niveaux} carte(s) sur ${vu.cartes} disent leurs niveaux`);
        if (vu.niveaux !== vu.cartes) ratés.push('niveaux');
        dits.push(vu.rognes === 0 ? 'aucun aperçu ne sort de son cadre'
            : `${vu.rognes} APERÇU(S) ROGNÉ(S) PAR LE CADRE`);
        if (vu.rognes) ratés.push('aperçu rogné');
        dits.push(`rien ne déborde en largeur : ${vu.dehors} px`);
        if (vu.dehors > 0) ratés.push('débordement');

        // ON PHOTOGRAPHIE UNE CARTE, PAS LA VITRINE : au doigt, dix cartes
        // empilées font 3 000 px de haut, et la photo sort coupée — ce que la
        // sonde dit, à juste titre. Une carte suffit pour voir si l'aperçu est
        // une figure ou un rectangle gris.
        const img = await s.photo('.dc-carte', `tools/tmp/dc-carte-${taille.nom}.png`, 0);
        dits.push(img && !img.unie ? `la vitrine est dessinée (${img.teintes} teintes)`
            : 'LA VITRINE EST UNE IMAGE UNIE');
        if (!img || img.unie) ratés.push('vitrine unie');

        // LA CAPTURE DE LA VITRINE SE PREND AVANT DE JOUER : prise après, elle
        // montrait l'exercice ouvert — c'est-à-dire tout sauf ce qu'on vient de
        // construire.
        await s.page.screenshot({ path: `tools/tmp/dc-vitrine-${taille.nom}.png`,
            fullPage: true });

        // ── ON JOUE POUR DE VRAI, ET RIEN NE DOIT S'ÉCRIRE ─────────────────
        const avant = await s.page.evaluate(async () => {
            // `all()` EST L'INTERFACE : `lire()` n'existe pas, et un crochet
            // inventé fait mourir la sonde en emportant tout ce qu'elle avait
            // mesuré avant. Lu dans la source, comme le veut la maison.
            const { journal } = await import('./js/core/journal.js');
            const j = journal.all();
            return Array.isArray(j) ? j.length : 0;
        });
        await s.page.click('[data-essayer]');
        await dormir(1600);
        const enJeu = await s.page.evaluate(() => ({
            couche: document.querySelectorAll('#game-layer .game-question, '
                + '#game-layer canvas, #game-layer .pn-layout, #game-layer .cv-damier').length,
            vitrine: document.querySelectorAll('.dc-vitrine').length
        }));
        dits.push(enJeu.couche > 0 ? 'l\'exercice s\'ouvre et se joue'
            : 'L\'EXERCICE NE S\'OUVRE PAS');
        if (!enJeu.couche) ratés.push('essayer');

        const apres = await s.page.evaluate(async () => {
            // `all()` EST L'INTERFACE : `lire()` n'existe pas, et un crochet
            // inventé fait mourir la sonde en emportant tout ce qu'elle avait
            // mesuré avant. Lu dans la source, comme le veut la maison.
            const { journal } = await import('./js/core/journal.js');
            const j = journal.all();
            return Array.isArray(j) ? j.length : 0;
        });
        dits.push(apres === avant
            ? `rien n'est enregistré (${avant} entrée(s) au journal, avant comme après)`
            : `LE JOURNAL A GROSSI : ${avant} → ${apres}`);
        if (apres !== avant) ratés.push('trace');

        await s.page.screenshot({ path: `tools/tmp/dc-ecran-${taille.nom}.png`, fullPage: true });
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
    if (r.ratés.length) console.log(`   ratés : ${r.ratés.join(', ')}`);
    console.log(`   erreurs de page : ${r.erreurs.length}, fenêtres natives : ${r.fenetres.length}`);
    r.erreurs.slice(0, 4).forEach(e => console.log(`     ! ${e}`));
    fautes += r.erreurs.length + r.fenetres.length + r.ratés.length;
}
console.log(fautes ? `\n${fautes} chose(s) à regarder.` : '\nTOUT PASSE.');
process.exitCode = fautes ? 1 : 0;
