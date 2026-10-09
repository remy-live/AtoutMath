// « IL FAUDRAIT TAPER [OG] » — la notation du cercle, au doigt.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour le vocabulaire du cerclke, tu acceptes comme rayon og comme
// réponse alors qu'il faudrait taper [OG], par contre c'est galère au clavier,
// permet d'avoir des touches de crochet ou parenthèses et en majuscule.
// Précise leur erreur si ils se trompent, est ce clair »
//
// LES TROIS POINTS SONT UN SEUL TRAVAIL, et c'est pour cela qu'une seule sonde
// les mesure : on ne peut exiger les crochets qu'à condition de les rendre
// tapables, et de dire ce qui manque quand ils manquent.
//
// CE QU'ELLE PREND DU CHEMIN DE L'ÉLÈVE, et qu'aucune épreuve sous Node ne
// peut prendre : la touche existe-t-elle sous le doigt, écrit-elle au bon
// endroit dans le champ, le champ montre-t-il des MAJUSCULES, et la phrase
// d'erreur arrive-t-elle sous les yeux sans coûter un essai.
//
//     node tools/notationDuCercle.mjs
//
// 390 × 844 : le téléphone de Rémy, c'est-à-dire l'écran où « c'est galère ».

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
await s.identifier();

let manques = 0;
const dire = (ok, texte) => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${texte}`);
};

/**
 * Ouvre l'exercice RÉGLÉ COMME LE PROFESSEUR LE RÈGLE — « trouver » et
 * « répondre seul » sont deux réglages de la fiche, pas une porte dérobée —, et
 * rend la notation attendue.
 */
async function ouvrirSurUneNotation(mots) {
    const raté = await s.ouvrirExercice('geo-cercle-vocabulaire',
        { mots, sens: 'trouver', reponse: 'seul' });
    if (raté) throw new Error('ouverture de l\'exercice : ' + raté);
    await s.page.waitForFunction(() => !!(window.__sondeRunner
        && window.__sondeRunner.session && window.__sondeRunner.session.item),
    { timeout: 15000 });
    await s.doitExister('#cv-champ', 'le champ où l\'élève écrit la notation');
    return s.page.evaluate(() => window.__sondeRunner.session.item.answer);
}

/**
 * Écrit un texte, valide, et dit CE QUI S'EST PASSÉ.
 *
 * Trois choses se mesurent, et aucune ne se déduit des deux autres :
 *   · `acceptée` — la série a-t-elle compté une bonne réponse ;
 *   · `essai`    — l'essai a-t-il été consommé ;
 *   · `dit`      — ce que l'élève lit sous le champ.
 *
 * ON NE MESURE PAS L'ACCEPTATION PAR SA BANNIÈRE : celle de la réussite est
 * éphémère (`showSuccess` la referme après 1,2 s) et l'on conclurait au refus
 * en regardant trop tard. Le compteur des items réussis, lui, ne se referme pas.
 */
async function essayer(texte) {
    const avant = await s.page.evaluate(() => ({
        reussis: window.__sondeRunner.itemsSolved.size,
        essai: window.__sondeRunner.session.attemptIndex
    }));
    await s.page.fill('#cv-champ', texte);
    await s.page.click('[data-valider]');
    let apres = avant;
    for (let k = 0; k < 16; k++) {
        await dormir(200);
        apres = await s.page.evaluate(() => ({
            reussis: window.__sondeRunner.itemsSolved.size,
            essai: window.__sondeRunner.session
                ? window.__sondeRunner.session.attemptIndex : null
        }));
        if (apres.reussis > avant.reussis || apres.essai !== avant.essai) break;
    }
    const dit = await s.page.evaluate(() => {
        const el = document.querySelector('.cv-statut');
        return el ? el.textContent.trim() : null;
    });
    // La carte d'erreur attend qu'on la ferme : sans cela, la mesure suivante
    // tape derrière un voile.
    const fermer = await s.page.$('.fb-close');
    if (fermer) { await fermer.click(); await dormir(700); }
    return {
        acceptee: apres.reussis > avant.reussis,
        essaiCompte: apres.essai !== null && apres.essai !== avant.essai,
        dit
    };
}

// ── LE SEGMENT : « og » ne vaut pas « [OG] » ───────────────────────────────
//
// Rayon, diamètre et corde s'écrivent tous les trois entre crochets : la
// notation attendue est donc un segment, quel que soit le tirage.
console.log('\n\x1b[1mLE SEGMENT — « og » ne doit plus valoir « [OG] »\x1b[0m');
let attendue = await ouvrirSurUneNotation(['rayon', 'diametre', 'corde']);
const lettres = attendue.replace(/[^A-Z]/g, '');
console.log(`  la figure attend « ${attendue} » (lettres ${lettres})`);

const nu = await essayer(lettres.toLowerCase());
dire(!nu.acceptee, `« ${lettres.toLowerCase()} » n'est plus accepté comme réponse`);
dire(/crochet/i.test(nu.dit || ''), `on lui dit ce qui manque : « ${nu.dit || '—'} »`);
// ET LA MESURE DE L'ESSAI SE LIE AU REFUS. Seule, elle passait au VERT avec le
// défaut remis : une réponse ACCEPTÉE fait passer à la question suivante, où
// l'essai repart de zéro — donc « inchangé ». Un chiffre qui ne bouge pas pour
// deux raisons opposées ne mesure rien.
dire(!nu.acceptee && !nu.essaiCompte, 'et cela ne lui coûte pas un essai : il corrige');

const paren = await essayer(`(${lettres})`);
dire(!paren.acceptee, `« (${lettres}) » n'est pas accepté pour un segment`);
dire(/droite/i.test(paren.dit || ''), `on lui dit pourquoi : « ${paren.dit || '—'} »`);

const mot = await essayer('un rayon');
dire(!mot.acceptee, '« un rayon » n\'est pas une notation');
dire(/notation/i.test(mot.dit || ''), `on le lui dit : « ${mot.dit || '—'} »`);

// ── LES TOUCHES, ET LES MAJUSCULES ─────────────────────────────────────────
console.log('\n\x1b[1mLES TOUCHES — « c\'est galère au clavier »\x1b[0m');
await s.doitExister('[data-notation]', 'les touches de crochets et de parenthèses');
const touches = await s.page.evaluate(() => [...document.querySelectorAll('[data-notation]')]
    .map(b => ({ signes: b.dataset.notation, h: Math.round(b.getBoundingClientRect().height),
        l: Math.round(b.getBoundingClientRect().width) })));
console.log('  ' + touches.map(t => `« ${t.signes} » ${t.l}×${t.h}`).join(' · '));
dire(touches.some(t => t.signes === '[]') && touches.some(t => t.signes === '()'),
    'les crochets ET les parenthèses sont là');
// LES QUATRE SIGNES EN MÊME TEMPS, TOUJOURS : n'offrir que « [ ] » devant un
// rayon dirait que la réponse est un segment — la moitié de la question.
dire(touches.length === 2, `deux touches, pas une de plus : ${touches.length}`);
dire(touches.every(t => t.h >= 44 && t.l >= 44),
    'chacune fait au moins 44 px au doigt');

// LA TOUCHE ENTOURE CE QUI EST ÉCRIT : l'élève tape les lettres, puis ferme.
// Une touche qui écrirait « [ » à la FIN donnerait « OG[ ».
await s.page.fill('#cv-champ', lettres.toLowerCase());
await s.page.click('[data-notation="[]"]');
let vu = await s.page.inputValue('#cv-champ');
dire(vu === `[${lettres}]`, `« ${lettres.toLowerCase()} » puis la touche donne « ${vu} »`);

// ET ELLE REMPLACE L'AUTRE PAIRE : tapé « ( ) » par erreur, une touche corrige.
await s.page.click('[data-notation="()"]');
vu = await s.page.inputValue('#cv-champ');
dire(vu === `(${lettres})`, `puis la touche « ( ) » donne « ${vu} »`);

// LE CHAMP VIDE : la touche pose la paire et le curseur se met DEDANS.
await s.page.fill('#cv-champ', '');
await s.page.click('[data-notation="[]"]');
const dansLaPaire = await s.page.evaluate(() => {
    const c = document.querySelector('#cv-champ');
    return { v: c.value, curseur: c.selectionStart };
});
dire(dansLaPaire.v === '[]' && dansLaPaire.curseur === 1,
    `champ vide : « ${dansLaPaire.v} », curseur en ${dansLaPaire.curseur}`);

// LES MAJUSCULES. « og » tapé en bas de casse doit s'afficher « OG » : la
// figure porte des majuscules, et un champ qui montre « og » enseigne une
// notation qui n'existe pas.
await s.page.fill('#cv-champ', 'og');
dire(await s.page.inputValue('#cv-champ') === 'OG',
    `« og » tapé s'affiche « ${await s.page.inputValue('#cv-champ')} »`);

// ET LA BONNE RÉPONSE PASSE — c'est la mesure qui dit que tout cela n'a pas
// simplement fermé la porte.
await s.page.fill('#cv-champ', '');
const juste = await essayer(attendue);
dire(juste.acceptee, `« ${attendue} » est accepté, et la série avance`);

// ── ET L'AUTRE CHAMP, CELUI OÙ L'ON ÉCRIT UN MOT ───────────────────────────
//
// « Une mesure qui ne regarde que ce qu'on a corrigé ne voit pas ce qu'on a
// cassé. » Posée une ligne trop haut, la mise en majuscules prenait LES DEUX
// champs — et « UN RAYON » en capitales n'est pas la façon dont on écrit un
// mot français. Le défaut a vécu dix minutes ; sans cette mesure il aurait
// vécu jusqu'à ce que Rémy le voie.
console.log('\n\x1b[1mLE MOT — l\'autre champ, qu\'on n\'a pas touché\x1b[0m');
await s.ouvrirExercice('geo-cercle-vocabulaire',
    { mots: ['rayon', 'diametre', 'corde'], sens: 'nommer', reponse: 'seul' });
await s.doitExister('#cv-champ', 'le champ où l\'élève écrit le mot');
await s.page.fill('#cv-champ', 'un rayon');
dire(await s.page.inputValue('#cv-champ') === 'un rayon',
    `« un rayon » reste « ${await s.page.inputValue('#cv-champ')} »`);
dire(await s.page.evaluate(() => document.querySelectorAll('[data-notation]').length) === 0,
    'et aucune touche de crochet ne vient encombrer la réponse en toutes lettres');
const motJuste = await essayer('rayon');
dire(motJuste.acceptee, '« rayon » vaut toujours « un rayon »');

// ── LA DROITE : une tangente ne s'écrit pas entre crochets ─────────────────
console.log('\n\x1b[1mLA DROITE — « [AB] » ne vaut pas « (AB) »\x1b[0m');
attendue = await ouvrirSurUneNotation(['tangente', 'secante']);
const lettresD = attendue.replace(/[^A-Z]/g, '');
console.log(`  la figure attend « ${attendue} »`);
const crochets = await essayer(`[${lettresD}]`);
dire(!crochets.acceptee, `« [${lettresD}] » n'est pas accepté pour une droite`);
dire(/parenthès|segment/i.test(crochets.dit || ''),
    `on lui dit la différence : « ${crochets.dit || '—'} »`);

// ── LA PHOTO SE PREND LA PHRASE SOUS LES YEUX ──────────────────────────────
//
// Un compte de touches ne dit pas de quoi l'écran a l'air, et c'est la phrase
// LA PLUS LONGUE qui décide : trois lignes de correction sous une figure de
// 320 px, dans un écran de 844, cela passe ou cela pousse le bouton dehors.
// On photographie donc ici, pendant qu'elle est affichée — et non à la fin,
// quand une bonne réponse l'a effacée.
const bas = await s.page.evaluate(() => {
    const el = document.querySelector('.cv-statut');
    const b = document.querySelector('[data-valider]');
    return { phrase: Math.round(el.getBoundingClientRect().bottom),
        valider: Math.round(b.getBoundingClientRect().bottom),
        fenetre: window.innerHeight };
});
dire(bas.phrase <= bas.fenetre && bas.valider <= bas.fenetre,
    `tout tient dans l'écran : phrase à ${bas.phrase}, « Valider » à ${bas.valider}, `
    + `écran de ${bas.fenetre}`);
await s.photo('.canvas-area', 'tools/tmp/notation-cercle.png', 0);

const justeD = await essayer(attendue);
dire(justeD.acceptee, `« ${attendue} » est accepté`);

console.log('\n' + '─'.repeat(74));
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log('  ' + e));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre.\x1b[0m`
    : '\x1b[32mLA NOTATION EST EXIGÉE, TAPABLE, ET L\'ERREUR EST DITE.\x1b[0m');
await s.fermer();
process.exitCode = manques || s.fenetresNatives.length || s.erreurs.length ? 1 : 0;
