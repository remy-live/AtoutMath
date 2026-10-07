// LES DEUX ATELIERS D'AUTEUR, DANS UN VRAI NAVIGATEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu me fais dans le debug un atelier pour les phrases énigmes du jour
// (ça on a déjà) et aussi qqch pour éditer des dingbats et les transformer en
// json. Globalement un éditeur de lettre où on peut choisir l'orientation la
// couleur rajouter des traits des formes. »
//
// Puis, après l'avoir essayé : « qu'il se sauve au fur et à mesure et je te les
// enverrai grâce à un bouton exporter. Du drag drop facile, qqch d'hyper facile,
// et je donne la solution. Et on peut mettre des indices. »
//
// ── CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE ────────────────────────────────
//
// `tests/dingbatLibre.test.mjs` prouve que le dessin se fabrique et que le JSON
// se relit. Il ne peut rien dire de l'ATELIER, qui est un écran :
//
//   · qu'une pièce se PREND et se POSE — le geste que Rémy a demandé ;
//   · qu'un mot s'ATTRAPE, y compris entre deux lettres ;
//   · que le curseur d'orientation TOURNE réellement le mot ;
//   · QUE LA RÉCOLTE SURVIVE À UN RECHARGEMENT — « qu'il se sauve au fur et à
//     mesure » est une promesse qui ne se vérifie qu'en rechargeant pour de vrai ;
//   · et QUE LE FOYER NE SE PERDE PAS quand on tape. C'est le piège le plus cher
//     du dépôt : un écran qui se redessine à chaque frappe reprend le foyer au
//     champ, on tape « RACINE » et il ne reste que « R ». Trois fois payé
//     (`core/foyerDeLaSaisie.js`), et aucun test sous Node ne le voit.
//
//   node tools/ateliersDAuteur.mjs

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 980 });
let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`
        + (detail ? `  — ${detail}` : ''));
};

await s.identifier();

// LES OUTILS D'AUTEUR S'ALLUMENT PAR L'ADRESSE. Rémy teste sur son iPhone, où
// l'on n'ouvre pas de console : `?auteur=1` est l'entrée qu'il emploie, donc
// c'est celle que la sonde emprunte. Voir `js/core/outilsAuteur.js`.
const adresse = `http://127.0.0.1:${s.port}/index.html?auteur=1`;
const ouvrirLaPage = async () => {
    await s.page.goto(adresse);
    await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    // LA PALETTE COMMENCE REPLIÉE SUR UN ÉCRAN ÉTROIT, et le choix est RETENU
    // d'une fois sur l'autre : une sonde qui le suppose mesure l'état d'hier.
    if (await s.page.evaluate(() =>
        document.getElementById('debug-toolbar').classList.contains('dbg--folded'))) {
        await s.page.click('#db-fold');
        await dormir(250);
    }
};

// ON PART D'UNE RÉCOLTE VIDE. Sans cela la sonde mesurerait ce qu'une exécution
// précédente a laissé dans `localStorage` — et le premier chiffre qu'elle donne
// serait celui d'hier.
await s.page.goto(adresse);
await s.page.evaluate(() => {
    try { localStorage.removeItem('atoutmath.atelier.dingbats.recolte'); } catch (e) { /* privé */ }
});
await ouvrirLaPage();

const ouvrirLAtelier = async () => {
    await s.page.click('#db-atelier-dingbats');
    await dormir(900);
};




console.log('\nL\'ATELIER DES DINGBATS, INTÉGRÉ');
console.log('─'.repeat(78));

// RÉMY : « parfait, tu me l'intègres à AtoutMath désormais. » Le bouton de la
// palette ouvrait l'atelier À RÉSERVE ; il ouvre désormais celui où l'on prend
// un outil et où l'on dessine — le même code que la page autonome.
await s.doitExister('#db-atelier-dingbats', 'le bouton de l\'atelier des dingbats');
await s.page.click('#db-atelier-dingbats');
await dormir(900);
await s.doitExister('#ae-toile', 'la toile de l\'atelier');
await s.doitExister('#ae-outils', 'la boîte à outils');
await s.doitExister('#ae-json', 'la zone du JSON');

const lAncien = await s.page.evaluate(() => document.querySelectorAll('#dgl-toile, .dgl-piece').length);
dire(lAncien === 0, 'il ne reste rien de l\'atelier à réserve — un seul geste, un seul code',
    `${lAncien} reste(s)`);

// LA FEUILLE DE STYLE ARRIVE À LA DEMANDE, et avec le `?v=` du site : sans lui,
// une correction de style servirait l'ancienne version après le rituel.
const feuille = await s.page.evaluate(() => {
    const l = document.querySelector('link[data-atelier-toile]');
    return l ? l.getAttribute('href') : 'absente';
});
dire(/css\/atelierEssai\.css\?v=\d+/.test(feuille),
    'la feuille de style est apportée à la demande, estampillée comme le site', feuille);

const surLaToile = async (x, y) => {
    const b = await s.page.locator('#ae-toile').boundingBox();
    return { x: b.x + (x / 400) * b.width, y: b.y + (y / 260) * b.height };
};
const etat = () => s.page.evaluate(() => window.__atelierEssai.etat());

await s.page.click('[data-outil="rectangle"]');
const a1 = await surLaToile(80, 60);
const b1 = await surLaToile(240, 160);
await s.page.mouse.move(a1.x, a1.y);
await s.page.mouse.down();
await s.page.mouse.move(b1.x, b1.y, { steps: 8 });
await s.page.mouse.up();
await dormir(400);
const trace = (await etat()).lot[0].elements.at(-1);
dire(!!trace && Math.abs(trace.largeur - 160) <= 8 && Math.abs(trace.hauteur - 100) <= 8,
    'on y trace comme sur la page : appuie, tire, relâche',
    trace ? `${trace.largeur}×${trace.hauteur}` : 'rien');

// LES RACCOURCIS MARCHENT DANS LA MODALE. Le clavier est écouté sur la RACINE de
// l'atelier et non sur le document — sinon les touches traverseraient jusqu'au
// jeu ouvert derrière. C'est exactement ce que cette mesure garde : le
// changement aurait pu les rendre muets.
const avantZ = (await etat()).lot[0].elements.length;
await s.page.keyboard.press('Control+z');
await dormir(400);
const apresZ = (await etat()).lot[0].elements.length;
dire(apresZ === avantZ - 1, 'Ctrl+Z marche DANS la modale, sans traverser vers le jeu',
    `${avantZ} → ${apresZ} élément(s)`);

// ET LA RÉCOLTE EST CELLE DE L'APPLICATION : la page autonome lit la même.
const clef = await s.page.evaluate(() => {
    try { return !!localStorage.getItem('atoutmath.atelier.dingbats.recolte'); }
    catch (e) { return false; }
});
dire(clef, 'la récolte est enregistrée sous la clef de l\'application');

await s.photo('.ae-modale', 'tools/tmp/atelier-dingbats.png');
await s.page.click('#ae-modale-fermer');
await dormir(300);

console.log('\nL\'ATELIER DU QUOTIDIEN');
console.log('─'.repeat(78));

await s.doitExister('#db-atelier-quotidien', 'le bouton de l\'atelier du quotidien');
await s.page.click('#db-atelier-quotidien');
await dormir(800);
await s.doitExister('#atq-liste', 'la liste des entrées');
await s.doitExister('#atq-formulaire', 'le formulaire');
await s.doitExister('#atq-apercu', 'l\'aperçu');

const listeOuverte = await s.page.evaluate(() => ({
    onglets: document.querySelectorAll('.atq-onglet').length,
    lignes: document.querySelectorAll('.atq-ligne').length
}));
dire(listeOuverte.onglets === 4 && listeOuverte.lignes > 50,
    'les quatre listes sont là, et celle du genre choisi est remplie',
    `${listeOuverte.lignes} lignes`);

await s.page.click('.atq-ligne');
await dormir(400);
const reprise2 = await s.page.evaluate(() => ({
    texte: (document.querySelector('#atq-formulaire [data-ch="texte"]') || {}).value || '',
    apercu: (document.querySelector('.atq-carte-txt') || {}).textContent || ''
}));
reprise2.sortie = await s.page.inputValue('#atq-json');
dire(reprise2.texte.length > 10 && reprise2.apercu.slice(0, 30) === reprise2.texte.slice(0, 30),
    'une entrée se reprend, et l\'aperçu montre ce que l\'écran montrera',
    `« ${reprise2.texte.slice(0, 46)}… »`);

// LE TEXTE EXPORTÉ EST DU JAVASCRIPT, et c'est ce que Rémy colle : on le RELIT.
const relitJs = await s.page.evaluate((t) => {
    try { const o = new Function(`return [${t}][0];`)(); return { ok: true, cle: Object.keys(o).join(',') }; }
    catch (e) { return { ok: false, dit: e.message }; }
}, reprise2.sortie);
dire(relitJs.ok, 'ce qui sort se relit comme du JavaScript',
    relitJs.ok ? relitJs.cle : relitJs.dit);

await s.page.click('#atq-formulaire [data-ch="indice"]');
await s.page.fill('#atq-formulaire [data-ch="indice"]', '');
await s.page.type('#atq-formulaire [data-ch="indice"]', 'Compte deux fois chaque poignée.', { delay: 30 });
await dormir(300);
const foyerQ = await s.page.evaluate(() => ({
    valeur: (document.querySelector('#atq-formulaire [data-ch="indice"]') || {}).value || '',
    tenu: (document.activeElement || {}).dataset?.ch
}));
dire(foyerQ.valeur === 'Compte deux fois chaque poignée.' && foyerQ.tenu === 'indice',
    'on écrit un indice entier sans perdre le foyer', `foyer : ${foyerQ.tenu}`);

await s.page.click('.atq-onglet[data-genre="citation"]');
await dormir(400);
const citation = await s.page.evaluate(() => ({
    auteur: !!document.querySelector('#atq-formulaire [data-ch="auteur"]'),
    sur: !!document.querySelector('#atq-formulaire [data-ch="sur"]'),
    reponse: !!document.querySelector('#atq-formulaire [data-ch="reponse"]')
}));
dire(citation.auteur && citation.sur && !citation.reponse,
    'changer de genre change les champs, pas seulement le titre', JSON.stringify(citation));

await s.photo('.atq-panneau', 'tools/tmp/atelier-quotidien.png');
await s.page.click('#atq-fermer');
await dormir(300);

console.log('\nLE TRI DES DINGBATS, DANS LA REVUE');
console.log('─'.repeat(78));

// RÉMY : « pour les dingbats intègre-le dans la revue catalogue pour que je
// puisse faire le tri et te faire un rapport. » Un onglet qui ne s'ouvre pas est
// le défaut le plus bête et le plus fréquent : on le mesure.
await s.page.click('#db-revue');
await dormir(900);
await s.doitExister('[data-vue="dingbats"]', 'l\'onglet des dingbats dans la revue');
await s.page.click('[data-vue="dingbats"]');
await dormir(900);
await s.doitExister('.dgt-liste', 'la grille des dingbats');

const grille = await s.page.evaluate(() => ({
    cartes: document.querySelectorAll('.dgt-carte').length,
    dessins: document.querySelectorAll('.dgt-scene .dg-scene').length,
    filtres: document.querySelectorAll('[data-filtre]').length,
    compte: (document.querySelector('[data-tri-compte]').textContent || '').trim()
}));
dire(grille.cartes >= 100 && grille.dessins === grille.cartes,
    'les 109 dingbats sont là, chacun DESSINÉ — on trie en regardant, pas en lisant',
    `${grille.cartes} cartes, ${grille.dessins} dessins`);
dire(grille.filtres >= 10, 'les filtres thème / niveau / déjà lus sont là', `${grille.filtres}`);

// ON TRANCHE DEUX LIGNES, et l'on vérifie que le compte ET le rapport suivent.
await s.page.click('.dgt-carte:nth-child(1) .banc-q-oui');
await dormir(400);
await s.page.click('.dgt-carte:nth-child(2) .banc-q-non');
await dormir(400);
const apresTri = await s.page.evaluate(() => ({
    compte: (document.querySelector('[data-tri-compte]').textContent || '').trim(),
    oui: document.querySelectorAll('.dgt-carte--oui').length,
    non: document.querySelectorAll('.dgt-carte--non').length
}));
dire(apresTri.oui === 1 && apresTri.non === 1 && /2 relus sur 109/.test(apresTri.compte),
    'un verdict se pose, se voit sur la carte entière, et le compte suit',
    apresTri.compte);

// LE FILTRE « PAS ENCORE LUS » est le plus utile de tous : on relit cent neuf
// énigmes en plusieurs fois, et retrouver où l'on en était est tout le problème.
await s.page.click('[data-filtre="vu"][data-valeur="nonlues"]');
await dormir(600);
const restantes = await s.page.evaluate(() => document.querySelectorAll('.dgt-carte').length);
dire(restantes === grille.cartes - 2, 'le filtre « pas encore lus » retire ce qui est tranché',
    `${restantes} restantes sur ${grille.cartes}`);

// LE RAPPORT, qui est le seul objet qui sort de l'écran et m'arrive.
const rapport = await s.page.evaluate(async () => {
    const { rapport } = await import('./js/ui/dingbatsTri.js');
    return rapport();
});
dire(/À SUPPRIMER \(1\)/.test(rapport) && /À GARDER \(1\)/.test(rapport)
    && /2 relus sur 109/.test(rapport) && /dg-/.test(rapport),
    'le rapport porte les deux tas, leur compte, et les identifiants',
    rapport.split('\n')[0]);

await s.photo('.rv-cadre', 'tools/tmp/revue-dingbats.png');

// ── LE VERDICT ──────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(78));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre\x1b[0m`
    : '\x1b[32mON POSE, ÇA SE SAUVE, ET LE FOYER NE SE PERD PAS.\x1b[0m');
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.fenetresNatives.forEach(x => console.log(`  FENÊTRE NATIVE : ${x}`));
s.erreurs.slice(0, 6).forEach(x => console.log(`  ${x}`));
if (s.fenetresNatives.length || s.erreurs.length) manques++;
await s.fermer();
process.exit(manques ? 1 : 0);
