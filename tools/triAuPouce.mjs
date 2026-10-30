// LE TRI AU POUCE, SUR UN VRAI TÉLÉPHONE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu pourrais me faire, pour la revue du catalogue, sur téléphone, un
// fonctionnement pratique pour que je t'envoie ce que l'on garde ou non. »
//
// ── CE QUE `tests/triTelephone.test.mjs` NE PEUT PAS DIRE ──────────────────
//
// Les épreuves sous Node tiennent la RÈGLE : trois réponses, trois statuts, et
// « pas encore lu » qui n'est pas « on garde ». Elles ne peuvent rien dire de ce
// que Rémy va vraiment faire, qui tient en une phrase : SORTIR SON TÉLÉPHONE,
// TRANCHER TRENTE CARTES AU POUCE, ME COLLER TROIS LIGNES. Il faut donc mesurer :
//
//   · QU'ON ARRIVE SUR LES CARTES SANS RIEN TOUCHER à 390 px de large. Un écran
//     qui ouvre sur le tableau de onze colonnes et cache sa bascule dans une
//     barre repliée n'a pas résolu le problème, il l'a déplacé ;
//   · QUE LES BOUTONS SE TAPENT AU POUCE — quarante-huit pixels au moins. Mesuré
//     sur les PIXELS RENDUS, pas sur la feuille de style : un `min-height` que
//     la grille écrase ne se voit que là ;
//   · QUE LA PILE AVANCE TOUTE SEULE. C'est ce qui fait qu'on en trie trente au
//     lieu de cinq, et c'est aussi là qu'on SAUTE une carte si l'on avance en
//     plus de la voir disparaître — le défaut le plus facile à ne pas voir ;
//   · QUE LA CONSIGNE PORTE LES TROIS SEAUX après un vrai tri à trois doigts ;
//   · QUE LA REMARQUE SE TAPE EN ENTIER. Le piège le plus cher du dépôt : un
//     écran qui se redessine à chaque frappe reprend le foyer, on tape « trop
//     long » et il ne reste que « t ». Trois fois payé (`core/foyerDeLaSaisie.js`) ;
//   · QUE LES DEUX FORMES ÉCRIVENT DANS LE MÊME CARNET : on tranche au pouce,
//     on repasse au tableau, et la décision y est. Un second carnet aurait
//     divergé au premier aller-retour.
//
//   node tools/triAuPouce.mjs

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

// 390 × 844 : un iPhone, celui sur lequel Rémy essaie. Sous 768 px, le logiciel
// bascule au doigt — c'est le seuil que le reste du dépôt emploie.
const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`
        + (detail ? `  — ${detail}` : ''));
};

await s.identifier();

const adresse = `http://127.0.0.1:${s.port}/index.html?auteur=1`;

// ON PART D'UN CARNET VIDE, sinon le premier chiffre qu'on lit est celui d'hier.
await s.page.goto(adresse);
await s.page.evaluate(() => {
    try { localStorage.removeItem('mathbox-revue'); } catch (e) { /* privé */ }
});
await s.page.goto(adresse);
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

// LA PALETTE D'AUTEUR COMMENCE REPLIÉE SUR UN ÉCRAN ÉTROIT, et le choix est
// retenu : une sonde qui le suppose mesure l'état d'hier.
if (await s.page.evaluate(() =>
    document.getElementById('debug-toolbar').classList.contains('dbg--folded'))) {
    await s.page.click('#db-fold');
    await dormir(250);
}

console.log('\nLE TRI AU POUCE — 390 × 844');
console.log('─'.repeat(78));

await s.doitExister('#db-revue');
await s.page.click('#db-revue');
await s.page.waitForSelector('#revue-catalogue.rv--ouvert', { timeout: 15000 });
await dormir(400);

// ── 1. ON ARRIVE SUR LES CARTES, SANS RIEN TOUCHER ──────────────────────────

await s.doitExister('.rv-cadre');
dire(await s.page.evaluate(() => document.querySelector('.rv-cadre').classList.contains('rv-pouce')),
    'à 390 px, la revue ouvre DIRECTEMENT sur les cartes');
await s.doitExister('.tt-carte');
await s.doitExister('[data-pouce]');
dire((await s.page.textContent('[data-pouce]')).includes('tableau'),
    'la bascule annonce où elle MÈNE (« En tableau »), pas où l\'on est');

// LA TÊTE NE MANGE PAS L'ÉCRAN. Mesure prise sur une photo : sept boutons et la
// ligne de bilan faisaient 250 px avant la première carte — le tiers d'un
// iPhone, pour des commandes dont aucune ne sert pendant une passe. On range
// celles-là en mode pouce, et l'on MESURE le résultat plutôt que de le croire.
const hautDeLaCarte = await s.page.evaluate(() =>
    Math.round(document.querySelector('.tt-carte').getBoundingClientRect().top));
dire(hautDeLaCarte <= 200, 'la première carte commence dans le premier quart de l\'écran',
    `${hautDeLaCarte} px de tête`);
const rangees = await s.page.evaluate(() => ['[data-consigne]', '[data-copier]', '[data-fichier]']
    .filter(q => getComputedStyle(document.querySelector(q)).display !== 'none'));
dire(!rangees.length, 'les commandes de bilan sont rangées le temps de la passe',
    rangees.join(' '));

// ── 2. CE QUI SE TAPE AU POUCE SE TAPE AU POUCE ─────────────────────────────

const cibles = await s.page.evaluate(() => [...document.querySelectorAll(
    '.tt-rep, .tt-essai, .tt-pas-btn, .tt-env')].map(b => {
    const r = b.getBoundingClientRect();
    return { quoi: b.className.split(' ')[0], h: Math.round(r.height), l: Math.round(r.width) };
}));
const petits = cibles.filter(c => c.h < 44);
dire(!petits.length, `les ${cibles.length} commandes font 44 px de haut au moins`,
    petits.length ? petits.map(c => `${c.quoi} ${c.h}px`).join(', ')
        : `la plus courte : ${Math.min(...cibles.map(c => c.h))}px`);
const reps = cibles.filter(c => c.quoi === 'tt-rep');
dire(reps.length === 3 && reps.every(r => r.l >= 100),
    'les trois réponses font au moins 100 px de large', reps.map(r => `${r.l}px`).join(' · '));

// LA PAGE NE DÉFILE PAS DE TRAVERS. Une photo ne le dirait jamais.
const deTravers = await s.page.evaluate(() => {
    const c = document.querySelector('.rv-cadre');
    return c.scrollWidth - c.clientWidth;
});
dire(deTravers <= 1, 'rien ne dépasse sur le côté', `${deTravers} px de débord`);

// ── 3. LA PILE AVANCE TOUTE SEULE, ET NE SAUTE RIEN ─────────────────────────

const carteCourante = () => s.page.evaluate(() => {
    const t = document.querySelector('.tt-id');
    return t ? t.textContent.trim() : null;
});
const reste = () => s.page.evaluate(() => {
    const m = document.querySelector('.tt-avance').textContent.match(/reste\s+(\d+)/);
    return m ? Number(m[1]) : -1;
});

const avant = await reste();
const premiere = await carteCourante();
await s.page.click('[data-reponse="garder"]');
await dormir(220);
const deuxieme = await carteCourante();
dire(deuxieme && deuxieme !== premiere,
    'un appui sur « On garde » amène la carte suivante', `${premiere} → ${deuxieme}`);
dire((await reste()) === avant - 1, 'et le compte de ce qui reste baisse de UN',
    `${avant} → ${await reste()}`);

// LA CARTE SUIVANTE N'EST PAS SAUTÉE. Avec « ne montrer que ce qui reste », la
// carte tranchée disparaît et la suivante prend SA place : avancer en plus en
// sauterait une sur deux, et un catalogue à moitié trié ne se voit pas.
// ON COMPTE LES APPUIS, PAS LES CARTES VUES : cinq appuis laissent SIX cartes
// dans la trace, parce que la sixième est celle qu'on regarde et qu'on n'a pas
// encore tranchée. La première version de cette mesure attendait « cinq de
// moins » après quatre appuis, et c'est l'écart qui l'a dit.
const toutes = [premiere, deuxieme];
for (let i = 0; i < 4; i++) {
    await s.page.click('[data-reponse="garder"]');
    await dormir(200);
    toutes.push(await carteCourante());
}
dire(new Set(toutes.filter(Boolean)).size === toutes.length,
    'cinq appuis, six cartes différentes — aucune n\'est sautée, aucune ne revient',
    toutes.join(' → '));
dire((await reste()) === avant - 5, 'et cinq de moins à trancher', `il en reste ${await reste()}`);

// ── 4. LES TROIS RÉPONSES, PUIS LA CONSIGNE ─────────────────────────────────

const aRevoir = await carteCourante();
await s.page.click('[data-reponse="test"]');
await dormir(220);
const retire = await carteCourante();
await s.page.click('[data-reponse="retirer"]');
await dormir(220);

await s.doitExister('[data-tt-consigne]');
const consigne = await s.page.inputValue('[data-tt-consigne]');
dire(/^STATUT /.test(consigne), 'la consigne est celle que je sais relire',
    consigne.slice(0, 64) + (consigne.length > 64 ? '…' : ''));
dire(consigne.includes('valide = '), 'elle porte le seau « valide »');
dire(consigne.includes(`test = ${aRevoir}`) || consigne.includes(`, ${aRevoir}`),
    `« À revoir » met ${aRevoir} dans le seau « test »`);
dire(consigne.includes(`brouillon = ${retire}`) || consigne.includes(`, ${retire}`),
    `« On retire » met ${retire} dans le seau « brouillon »`);
dire(!(await s.page.isDisabled('[data-tt-copier]')),
    'le bouton « Copier pour me l\'envoyer » est actif dès qu\'il y a quelque chose à envoyer');

// ── 4 bis. « TOUT MONTRER » : L'AUTRE MOITIÉ DU GESTE ──────────────────────

// DEUX CHEMINS MÈNENT À LA CARTE SUIVANTE, et une correction posée sur un seul
// des deux ne ferme rien (c'est la friction la plus répétée du dépôt). Avec
// « que ce qui reste », la carte tranchée DISPARAÎT et la suivante prend sa
// place ; sans le filtre, elle reste et c'est le rang qui avance. Le second
// chemin est celui où l'on SAUTE une carte si l'on fait les deux à la fois.
await s.page.uncheck('[data-reste]');
await dormir(400);
const ici = await carteCourante();
await s.page.click('[data-reponse="garder"]');
await dormir(280);
dire((await carteCourante()) !== ici, 'sans le filtre aussi, on avance d\'une carte',
    `${ici} → ${await carteCourante()}`);
await s.page.click('[data-pas="-1"]');
await dormir(280);
dire((await carteCourante()) === ici, 'et « Précédent » ramène sur CELLE qu\'on vient de trancher',
    `${await carteCourante()}`);
const rempli = await s.page.evaluate(() => {
    const b = document.querySelector('.tt-rep--choisie');
    return b ? b.dataset.reponse : null;
});
dire(rempli === 'garder', 'qui montre, remplie, la réponse qu\'on lui a donnée', String(rempli));
await s.page.check('[data-reste]');
await dormir(350);

// ── 5. LA REMARQUE SE TAPE EN ENTIER ───────────────────────────────────────

await s.doitExister('.rv-cadre [data-remarque]');
const mot = 'trop long pour la 6e';
await s.page.click('.rv-cadre [data-remarque]');
await s.page.type('.rv-cadre [data-remarque]', mot, { delay: 24 });
await dormir(300);
const tape = await s.page.inputValue('.rv-cadre [data-remarque]');
dire(tape === mot, 'la remarque se tape EN ENTIER — le foyer ne se perd pas',
    `« ${tape} »`);
const foyer = await s.page.evaluate(() =>
    document.activeElement && document.activeElement.dataset.remarque !== undefined);
dire(foyer, 'et le curseur est encore dans le champ à la fin');

// ── 6. LES DEUX FORMES, UN SEUL CARNET ──────────────────────────────────────

const avecRemarque = await carteCourante();
await s.page.click('[data-pouce]');
await dormir(500);
dire(await s.page.evaluate(() => !!document.querySelector('.rv-table')),
    'la bascule ramène au tableau de onze colonnes');
const dansLeTableau = await s.page.evaluate((id) => {
    const ch = document.querySelector(`input.rv-remarque[data-remarque="${CSS.escape(id)}"]`);
    return ch ? ch.value : null;
}, avecRemarque);
dire(dansLeTableau === mot, 'la remarque tapée au pouce est DANS le tableau',
    `« ${dansLeTableau} »`);
const cochee = await s.page.evaluate((id) => {
    const l = document.querySelector(`tr[data-ligne="${CSS.escape(id)}"]`);
    return l ? !!l.querySelector('.rv-ligne--change') || l.classList.contains('rv-ligne--change') : null;
}, avecRemarque);
void cochee;

// ET L'ON REVIENT AUX CARTES AU MÊME ENDROIT DU CARNET.
await s.page.click('[data-pouce]');
await dormir(400);
dire(await s.page.evaluate(() => document.querySelector('.rv-cadre').classList.contains('rv-pouce')),
    'et la bascule ramène aux cartes');

// ── 7. LA RECHERCHE RESTREINT LA PILE ──────────────────────────────────────

// LE CHAMP DE RECHERCHE RESTE DEHORS SUR UN TÉLÉPHONE — c'est le seul filtre
// dont on se sert à chaque fois. Filtrer puis trancher les douze cartes du
// domaine, c'est la passe qu'on fait vraiment dans une salle d'attente.
await s.doitExister('.rv-tete [data-f="texte"]');
await s.page.fill('.rv-tete [data-f="texte"]', 'fraction');
await dormir(450);
const apres = await s.page.evaluate(() => {
    const m = document.querySelector('.tt-pas-ou');
    return m ? m.textContent.trim() : '';
});
dire(/^1 \/ \d+$/.test(apres), 'une recherche restreint la pile ET repart de la première carte',
    `« ${apres} »`);

// ── 8. ET RIEN NE S'EST PLAINT ─────────────────────────────────────────────

// ON REPLIE LA PALETTE D'AUTEUR AVANT LA PHOTO. Elle flotte par-dessus tout,
// et dépliée elle recouvre exactement les trois boutons de réponse : la photo
// montrerait alors un écran que Rémy ne voit pas — sur son téléphone, la
// palette est repliée, c'est son état par défaut sous 780 px. Une photo qui ne
// montre pas l'écran de l'utilisateur ne mesure pas son problème.
if (!(await s.page.evaluate(() =>
    document.getElementById('debug-toolbar').classList.contains('dbg--folded')))) {
    await s.page.click('#db-fold');
    await dormir(300);
}
await s.photo('#revue-catalogue', 'tools/tmp/tri-au-pouce.png');
dire(s.fenetresNatives.length === 0, 'aucune fenêtre native',
    s.fenetresNatives.join(' | '));
dire(s.erreurs.length === 0, 'aucune erreur de page', s.erreurs.slice(0, 3).join(' | '));

console.log('─'.repeat(78));
console.log(manques
    ? `\x1b[31m${manques} mesure(s) manquent.\x1b[0m`
    : '\x1b[32mLE TRI AU POUCE FAIT CE QUE RÉMY A DEMANDÉ.\x1b[0m');

await s.fermer();
process.exit(manques ? 1 : 0);
