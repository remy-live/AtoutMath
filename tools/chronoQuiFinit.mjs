// LE COMPTE À REBOURS QUI ARRIVE À ZÉRO, ET LE GROUPE D'APRÈS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « quand j'ai mis un compte à rebours et qu'il arrive à zéro, pour le
// groupe d'après je ne peux plus mettre de compte à rebours ».
//
// ── CETTE MESURE COÛTE UNE MINUTE, ET C'EST POUR CELA QU'ELLE EXISTE ───────
//
// Le plus petit compte à rebours que le serveur accepte dure une minute
// (`api/index.php` : `$minutes <= 0` veut dire « arrêter »). On ne peut donc
// pas mesurer ce défaut sans ATTENDRE — et c'est précisément pourquoi il a
// vécu : personne ne reste une minute devant un écran pour voir si un bouton
// revient. Rémy, lui, y passe son heure de cours.
//
// ON NE TRICHE PAS EN AVANÇANT L'HORLOGE DE LA PAGE : la date de fin vient du
// SERVEUR, et un faux `finAt` mesurerait le faux. On attend pour de vrai.
//
// `tests/chronoQuiFinit.test.mjs` garde la règle en quelques millisecondes à
// chaque `npm test` ; celle-ci dit que l'écran la respecte.
//
//   node tools/chronoQuiFinit.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();

let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'} ${quoi}${detail ? '  — ' + detail : ''}`);
};

/**
 * ATTENDRE QUE LE DÉCOMPTE PARAISSE, plutôt que de regarder une fois.
 *
 * MESURÉ : deux secondes après le clic sur « Lancer », la barre n'avait pas
 * encore repris sa forme — le lancement passe par le SERVEUR, puis la barre se
 * redessine. La sonde criait au défaut sur un chrono qui, trois secondes plus
 * tard, tournait très bien. **Un délai fixe mesure la vitesse du serveur, pas
 * le logiciel** : on attend une CONDITION, avec un plafond.
 */
async function attendre(condition, secondes = 10) {
    for (let i = 0; i < secondes * 4; i++) {
        if (await s.page.evaluate(condition)) return true;
        await dormir(250);
    }
    return false;
}

// ── ON VA DANS LE DIRECT D'UNE CLASSE ──────────────────────────────────────
//
// Les crochets sont LUS DANS LA SOURCE (js/ui/espaceClasses.js) : `#ec-racine`,
// l'onglet `[data-onglet="direct"]`, la barre `.ec-pilote`. Un sélecteur
// inventé rendrait « absent », c'est-à-dire la même réponse qu'un écran cassé.
// LA PORTE EST `#top-btn-classe`, ET NON `#btn-classes`.
//
// `doitExister` m'a repris ici : `#btn-classes` existe bien, mais il est
// `hidden` — c'est la commande, pas la porte. La porte du professeur est
// l'onglet du haut (`initPortesProf`, js/ui/builder.js), qui ne fait que
// cliquer la commande à sa place. Cliquer une commande cachée aurait marché
// tout en ne mesurant PAS le chemin de Rémy.
await s.doitExister('#top-btn-classe', 'la porte « Mes classes » du professeur');
await s.page.click('#top-btn-classe');
await dormir(2500);
await s.doitExister('#ec-racine', 'l\'espace des classes du professeur');

// La première classe de la liste, puis son onglet « En direct ». On lit ce que
// la page offre plutôt que de deviner un attribut : s'il n'y a qu'une classe,
// l'espace l'ouvre peut-être déjà.
const nomsVus = await s.page.evaluate(() => [...document.querySelectorAll(
    '#ec-racine [data-onglet], #ec-racine [data-classe], #ec-racine button')]
    .slice(0, 14).map(b => (b.dataset.onglet || b.dataset.classe || b.textContent || '')
        .trim().slice(0, 28)));
console.log('       ce que l\'espace offre :', JSON.stringify(nomsVus));

// LES CROCHETS SONT LUS DANS LA SOURCE : la carte d'une classe porte
// `data-ouvrir="<id>"` (ligne 582 de js/ui/espaceClasses.js) et les onglets
// `data-onglet="direct"`. J'avais d'abord écrit `[data-classe]`, qui n'existe
// pas — et `doitExister` l'a dit tout de suite, au lieu de me laisser croire
// que l'espace était vide.
// ON CLIQUE LE NOM DE LA CLASSE, ET NON LE MILIEU DE LA CARTE.
//
// MESURÉ : un clic sur `[data-ouvrir]` tombe au CENTRE de la carte, c'est-à-dire
// sur le code de classe et son bouton de copie, qui sont branchés avant et
// rendent la main. La carte ne s'ouvrait pas, sans la moindre erreur de page —
// la sonde croyait alors que l'espace était cassé. `.ec-carte-nom` est en haut
// à gauche, et il n'appartient qu'à la carte.
await s.doitExister('#ec-racine [data-ouvrir] .ec-carte-nom', 'le nom d\'une classe');
await s.page.click('#ec-racine [data-ouvrir] .ec-carte-nom');
await dormir(1800);
await s.doitExister('#ec-racine [data-onglet="direct"]', 'l\'onglet « Le direct »');
await s.page.click('#ec-racine [data-onglet="direct"]');
await dormir(1800);

await s.doitExister('.ec-pilote', 'la barre du pilote, où vit le compte à rebours');
const auDepart = await s.page.evaluate(() => ({
    champ: !!document.querySelector('#ec-chrono-min'),
    lancer: !!document.querySelector('[data-chrono]'),
    arreter: !!document.querySelector('[data-chrono-off]')
}));
dire(auDepart.champ && auDepart.lancer,
    'au départ, le champ des minutes et « Lancer » sont là',
    JSON.stringify(auDepart));

// ── ON LANCE UNE MINUTE ────────────────────────────────────────────────────
await s.page.evaluate(() => { document.querySelector('#ec-chrono-min').value = '1'; });
await s.page.click('[data-chrono]');
await attendre(() => !!document.querySelector('.ec-chrono-reste'));
const lance = await s.page.evaluate(() => ({
    reste: (document.querySelector('.ec-chrono-reste') || {}).textContent || '',
    arreter: !!document.querySelector('[data-chrono-off]'),
    champ: !!document.querySelector('#ec-chrono-min')
}));
dire(!!lance.reste && lance.arreter && !lance.champ,
    'le chrono tourne : le décompte remplace le champ', JSON.stringify(lance));

// ── ON ATTEND LE ZÉRO, POUR DE VRAI ────────────────────────────────────────
console.log('  …  on attend que la minute tombe (c\'est le prix de cette mesure)');
for (let i = 0; i < 80; i++) {
    await dormir(1500);
    const fini = await s.page.evaluate(() => !!document.querySelector('#ec-chrono-min'));
    if (fini) break;
    if (i % 8 === 7) {
        const reste = await s.page.evaluate(() =>
            (document.querySelector('.ec-chrono-reste') || {}).textContent || '(plus de décompte)');
        console.log(`       il reste ${reste}`);
    }
}

// ── ET LE GROUPE D'APRÈS ───────────────────────────────────────────────────
const apres = await s.page.evaluate(() => ({
    champ: !!document.querySelector('#ec-chrono-min'),
    lancer: !!document.querySelector('[data-chrono]'),
    reste: (document.querySelector('.ec-chrono-reste') || {}).textContent || ''
}));
dire(apres.champ && apres.lancer,
    'À ZÉRO, LE CHAMP ET « LANCER » SONT REVENUS — c\'est la demande de Rémy',
    JSON.stringify(apres));

if (apres.champ && apres.lancer) {
    // ET IL REPART. Un champ qui revient mais qu'on ne peut pas employer
    // n'aurait rien corrigé : on relance pour de bon.
    await s.page.evaluate(() => { document.querySelector('#ec-chrono-min').value = '2'; });
    await s.page.click('[data-chrono]');
    await attendre(() => !!document.querySelector('.ec-chrono-reste'));
    const relance = await s.page.evaluate(() => ({
        reste: (document.querySelector('.ec-chrono-reste') || {}).textContent || '',
        arreter: !!document.querySelector('[data-chrono-off]')
    }));
    dire(!!relance.reste && relance.arreter,
        'et un second compte à rebours part pour le groupe suivant',
        JSON.stringify(relance));
    // On le coupe : une sonde ne laisse pas une classe d'essai sous chrono.
    await s.page.click('[data-chrono-off]');
    await dormir(800);
}

console.log('\n' + '─'.repeat(70));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre\x1b[0m`
    : '\x1b[32mLE CHRONO SE TERMINE ET L\'ON PEUT EN RELANCER UN.\x1b[0m');
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(x => console.log(`  ${x}`));
await s.fermer();
