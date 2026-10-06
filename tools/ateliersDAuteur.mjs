// LES DEUX ATELIERS D'AUTEUR, DANS UN VRAI NAVIGATEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu me fais dans le debug un atelier pour les phrases énigmes du jour
// (ça on a déjà) et aussi qqch pour éditer des dingbats et les transformer en
// json. Globalement un éditeur de lettre où on peut choisir l'orientation la
// couleur rajouter des traits des formes. »
//
// ── CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE ────────────────────────────────
//
// `tests/dingbatLibre.test.mjs` prouve que le dessin se fabrique et que le JSON
// se relit. Il ne peut rien dire de l'ATELIER, qui est un écran :
//
//   · qu'un mot s'ATTRAPE — un `<text>` SVG ne se laisse saisir que sur le tracé
//     de ses lettres, et l'on clique entre le R et le A sans que rien ne bouge ;
//   · que le curseur d'orientation TOURNE réellement le mot ;
//   · que la pastille de couleur CHANGE la couleur ;
//   · et surtout QUE LE FOYER NE SE PERDE PAS quand on tape. C'est le piège le
//     plus cher du dépôt : un écran qui se redessine à chaque frappe reprend le
//     foyer au champ, on tape « RACINE » et il ne reste que « R ». Trois fois
//     payé (`core/foyerDeLaSaisie.js`), et aucun test sous Node ne le voit.
//
// CETTE SONDE PREND DONC LE CHEMIN DE RÉMY : elle allume les outils d'auteur,
// clique le bouton de la palette, pose des éléments, tape au clavier, et lit ce
// que l'écran RÉPOND.
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
await s.page.goto(`http://127.0.0.1:${s.port}/index.html?auteur=1`);
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await s.doitExister('#debug-toolbar', 'la palette d\'outils d\'auteur');

// LA PALETTE COMMENCE REPLIÉE SUR UN ÉCRAN ÉTROIT, et il faut la déplier pour
// atteindre un bouton. Ici elle est large, mais le choix est RETENU d'une fois
// sur l'autre : une sonde qui le suppose mesure l'état d'hier.
if (await s.page.evaluate(() =>
    document.getElementById('debug-toolbar').classList.contains('dbg--folded'))) {
    await s.page.click('#db-fold');
    await dormir(250);
}

console.log('\nL\'ATELIER DES DINGBATS');
console.log('─'.repeat(78));

await s.doitExister('#db-atelier-dingbats', 'le bouton de l\'atelier des dingbats');
await s.page.click('#db-atelier-dingbats');
await dormir(900);
await s.doitExister('#dgl-toile', 'la toile');
await s.doitExister('#dgl-json', 'la zone du JSON');
await s.doitExister('#dgl-inspecteur', 'les réglages de l\'élément');

// UNE TOILE NEUVE PORTE DÉJÀ UN MOT, et c'est voulu : une toile vide ne dit pas
// qu'on peut déplacer quelque chose.
const depart = await s.page.evaluate(() => ({
    mots: document.querySelectorAll('#dgl-toile text').length,
    prises: document.querySelectorAll('#dgl-toile .dgl-prise').length,
    contours: document.querySelectorAll('#dgl-toile .dgl-contour').length
}));
dire(depart.mots === 1, 'la toile neuve porte un mot', `${depart.mots} texte(s)`);
// LA ZONE DE PRISE EST LA MESURE QUI COMPTE : sans elle, on clique entre deux
// lettres et rien ne se passe — ce qui ressemble exactement à un atelier cassé.
dire(depart.prises === 1, 'chaque élément a sa zone de prise', `${depart.prises}`);
dire(depart.contours === 1, 'l\'élément choisi porte un contour visible');

// --- ON DÉPLACE AU DOIGT, ET L'ON VÉRIFIE QUE ÇA A BOUGÉ ---------------------
const lireJson = async () => {
    const t = await s.page.inputValue('#dgl-json');
    try { return JSON.parse(t); } catch (e) { return null; }
};
const avantGlisse = await lireJson();
const boite = await s.page.locator('#dgl-toile').boundingBox();
// LE CENTRE DE LA TOILE EST LE CENTRE DU MOT : un élément neuf s'y pose exprès.
await s.page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
await s.page.mouse.down();
await s.page.mouse.move(boite.x + boite.width / 2 + 100, boite.y + boite.height / 2 - 60, { steps: 8 });
await s.page.mouse.up();
await dormir(300);
const apresGlisse = await lireJson();
const bouge = apresGlisse && avantGlisse
    && apresGlisse.elements[0].x > avantGlisse.elements[0].x
    && apresGlisse.elements[0].y < avantGlisse.elements[0].y;
dire(!!bouge, 'un mot s\'attrape et se déplace',
    avantGlisse && apresGlisse
        ? `(${avantGlisse.elements[0].x},${avantGlisse.elements[0].y}) → `
          + `(${apresGlisse.elements[0].x},${apresGlisse.elements[0].y})`
        : 'JSON illisible');
// LE MAGNÉTISME EST ALLUMÉ : les coordonnées doivent tomber sur la grille de 5.
dire(!!apresGlisse && apresGlisse.elements[0].x % 5 === 0 && apresGlisse.elements[0].y % 5 === 0,
    'le magnétisme colle les coordonnées à la grille de 5');

// --- L'ORIENTATION, QUI EST LA DEMANDE LITTÉRALE DE RÉMY ---------------------
const curseurAngle = '#dgl-inspecteur input[data-reg="angle"]';
await s.doitExister(curseurAngle, 'le curseur d\'orientation');
await s.page.locator(curseurAngle).fill('90');
await s.page.locator(curseurAngle).dispatchEvent('input');
await dormir(250);
const tourne = await s.page.evaluate(() =>
    (document.querySelector('#dgl-toile text') || {}).outerHTML || '');
dire(/rotate\(90/.test(tourne), 'le curseur d\'orientation tourne vraiment le mot',
    (tourne.match(/transform="[^"]*"/) || ['aucun transform'])[0]);

// --- LA COULEUR, DEUXIÈME DEMANDE LITTÉRALE ---------------------------------
await s.doitExister('#dgl-inspecteur [data-couleur="rouge"]', 'la pastille rouge');
await s.page.click('#dgl-inspecteur [data-couleur="rouge"]');
await dormir(250);
const rouge = await s.page.evaluate(() =>
    (document.querySelector('#dgl-toile text') || {}).getAttribute('style') || '');
// `--danger-texte` ET PAS `--danger` : l'un est de l'encre, l'autre un fond, et
// employer un fond comme encre ne passe pas le seuil AA.
dire(/var\(--danger-texte\)/.test(rouge), 'la pastille change la couleur, avec un jeton d\'ENCRE', rouge);

// --- DES TRAITS ET DES FORMES, TROISIÈME DEMANDE ---------------------------
await s.page.click('[data-ajouter="forme"]');
await dormir(200);
await s.page.click('[data-ajouter="trait"]');
await dormir(300);
const trois = await s.page.evaluate(() => ({
    elements: document.querySelectorAll('#dgl-toile [data-el]').length,
    traits: document.querySelectorAll('#dgl-toile [data-el] line').length,
    formes: document.querySelectorAll('#dgl-toile rect:not(.dgl-fond):not(.dgl-prise):not(.dgl-contour)').length,
    bouts: document.querySelectorAll('#dgl-toile .dgl-bout').length
}));
dire(trois.elements === 3 && trois.traits >= 1 && trois.formes >= 1,
    'on ajoute un trait et une forme', JSON.stringify(trois));
// LES DEUX BOUTS D'UN TRAIT SE DÉPLACENT SÉPARÉMENT : sans poignées, un trait
// ne peut qu'être translaté, et l'on ne peut pas dessiner une diagonale.
dire(trois.bouts === 2, 'un trait choisi montre ses deux poignées de bout');

// --- LE FOYER : LE PIÈGE LE PLUS CHER DU DÉPÔT ------------------------------
//
// On tape la réponse lettre par lettre. Si l'écran se redessinait à chaque
// frappe, le champ perdrait le foyer et il ne resterait qu'une lettre.
await s.page.click('#dgl-reponse');
await s.page.type('#dgl-reponse', 'racine carrée', { delay: 45 });
await dormir(300);
const foyer = await s.page.evaluate(() => ({
    valeur: document.getElementById('dgl-reponse').value,
    toujours: document.activeElement && document.activeElement.id
}));
dire(foyer.valeur === 'racine carrée' && foyer.toujours === 'dgl-reponse',
    'on tape la réponse sans perdre le foyer',
    `« ${foyer.valeur} », foyer sur « ${foyer.toujours} »`);

// --- CE QUI SE VOIT MAL EST DIT ---------------------------------------------
const avis = await s.page.evaluate(() => {
    const a = document.getElementById('dgl-avis');
    return { classe: a.className, dit: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90) };
});
dire(/dgl-avis--ok/.test(avis.classe), 'une composition saine ne déclenche aucun avertissement', avis.dit);

// Et un défaut volontaire doit être VU : on vide la réponse.
await s.page.fill('#dgl-reponse', '');
await dormir(250);
const avisKo = await s.page.evaluate(() =>
    (document.getElementById('dgl-avis').textContent || '').replace(/\s+/g, ' ').trim());
dire(/insoluble/.test(avisKo), 'une énigme sans réponse est signalée tout de suite', avisKo.slice(0, 80));
await s.page.fill('#dgl-reponse', 'racine carrée');
await dormir(250);

// --- LE JSON EST JOUABLE : la seule chose qui compte en sortie --------------
const jsonFinal = await s.page.inputValue('#dgl-json');
const jouable = await s.page.evaluate(async (texte) => {
    const { dessiner } = await import('./js/core/dingbat.js');
    const { juste } = await import('./js/core/dingbat.js');
    try {
        const d = JSON.parse(texte);
        const html = dessiner(d);
        return {
            ok: true,
            texte: html.replace(/<[^>]*>/g, '').trim(),
            accepte: juste(d.reponse, d)
        };
    } catch (e) { return { ok: false, dit: e.message }; }
}, jsonFinal);
dire(jouable.ok && jouable.texte.length > 0 && jouable.accepte,
    'le JSON produit se dessine ET sa réponse est acceptée par le juge du jeu',
    jouable.ok ? `« ${jouable.texte} »` : jouable.dit);

// --- VU COMME L'ÉLÈVE : plus une seule poignée ------------------------------
await s.page.click('#dgl-comme-eleve');
await dormir(400);
const eleve = await s.page.evaluate(() => ({
    prises: document.querySelectorAll('.dgl-prise').length,
    cadre: !!document.querySelector('.dgl-cadre-eleve .dg-scene--libre'),
    svg: !!document.querySelector('.dgl-cadre-eleve svg.dg-libre')
}));
dire(eleve.prises === 0 && eleve.cadre && eleve.svg,
    'l\'aperçu « comme l\'élève » montre la scène du jeu, sans une poignée',
    JSON.stringify(eleve));
await s.page.click('#dgl-comme-eleve');
await dormir(300);

// --- LES CENT NEUF SONT LÀ, À CÔTÉ -----------------------------------------
const modele = await s.page.evaluate(() => ({
    combien: document.querySelectorAll('#dgl-modele option').length,
    dessine: !!document.querySelector('#dgl-modele-vue .dg-scene'),
    dit: (document.getElementById('dgl-modele-dit').textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70)
}));
dire(modele.combien >= 100 && modele.dessine,
    'les énigmes déjà écrites sont consultables à côté',
    `${modele.combien} au menu — ${modele.dit}`);

// --- RELIRE UN JSON FERME LA BOUCLE ----------------------------------------
const aRelire = JSON.stringify({
    id: 'dg-sonde', theme: 'maths', niveau: 3, forme: 'libre',
    reponse: 'demi-tour',
    elements: [{ type: 'mot', texte: 'TOUR', x: 200, y: 130, taille: 40, angle: 180, couleur: 'bleu' }]
});
await s.page.fill('#dgl-json', aRelire);
await s.page.click('#dgl-relire');
await dormir(600);
const relu = await s.page.evaluate(() => ({
    mot: (document.querySelector('#dgl-toile text') || {}).textContent || '',
    reponse: document.getElementById('dgl-reponse').value,
    niveau: document.getElementById('dgl-niveau').value
}));
dire(relu.mot === 'TOUR' && relu.reponse === 'demi-tour' && relu.niveau === '3',
    'une composition se recolle et se retouche plus tard', JSON.stringify(relu));

await s.photo('.dgl-panneau', 'tools/tmp/atelier-dingbats.png');
await s.page.click('#dgl-fermer');
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
    lignes: document.querySelectorAll('.atq-ligne').length,
    genre: (document.querySelector('.atq-onglet--actif') || {}).textContent?.replace(/\s+/g, ' ').trim()
}));
dire(listeOuverte.onglets === 4 && listeOuverte.lignes > 50,
    'les quatre listes sont là, et celle du genre choisi est remplie',
    `${listeOuverte.lignes} lignes — ${listeOuverte.genre}`);

// ON CLIQUE UNE ENTRÉE EXISTANTE : c'est le geste de « cette énigme est presque
// bonne, je la reprends ».
await s.page.click('.atq-ligne');
await dormir(400);
const reprise = await s.page.evaluate(() => ({
    texte: (document.querySelector('#atq-formulaire [data-ch="texte"]') || {}).value || '',
    reponse: (document.querySelector('#atq-formulaire [data-ch="reponse"]') || {}).value || '',
    apercu: (document.querySelector('.atq-carte-txt') || {}).textContent || '',
    sortie: ''
}));
reprise.sortie = await s.page.inputValue('#atq-json');
dire(reprise.texte.length > 10 && reprise.apercu.slice(0, 30) === reprise.texte.slice(0, 30),
    'une entrée se reprend, et l\'aperçu montre ce que l\'écran montrera',
    `« ${reprise.texte.slice(0, 48)}… »`);
// LE TEXTE EXPORTÉ EST DU JAVASCRIPT, et c'est ce que Rémy colle : on le RELIT.
const relitJs = await s.page.evaluate((t) => {
    try { const o = new Function(`return [${t}][0];`)(); return { ok: true, cle: Object.keys(o).join(',') }; }
    catch (e) { return { ok: false, dit: e.message }; }
}, reprise.sortie);
dire(relitJs.ok, 'ce qui sort se relit comme du JavaScript',
    relitJs.ok ? relitJs.cle : relitJs.dit);

// LE FOYER, ICI AUSSI : on tape dans l'énoncé, qui redessine l'aperçu à chaque
// frappe. C'est exactement la situation où le foyer se perd.
await s.page.click('#atq-formulaire [data-ch="indice"]');
await s.page.fill('#atq-formulaire [data-ch="indice"]', '');
await s.page.type('#atq-formulaire [data-ch="indice"]', 'Compte deux fois chaque poignée.', { delay: 35 });
await dormir(300);
const foyerQ = await s.page.evaluate(() => ({
    valeur: (document.querySelector('#atq-formulaire [data-ch="indice"]') || {}).value || '',
    tenu: (document.activeElement || {}).dataset?.ch
}));
dire(foyerQ.valeur === 'Compte deux fois chaque poignée.' && foyerQ.tenu === 'indice',
    'on écrit un indice entier sans perdre le foyer',
    `« ${foyerQ.valeur} » (foyer : ${foyerQ.tenu})`);

// LA RÈGLE D'OR SE VOIT À L'ÉCRAN : un indice qui donne la réponse.
const rep = await s.page.inputValue('#atq-formulaire [data-ch="reponse"]');
await s.page.fill('#atq-formulaire [data-ch="indice"]', `La réponse est ${rep}, voilà.`);
await dormir(350);
const criee = await s.page.evaluate(() =>
    (document.getElementById('atq-avis').textContent || '').replace(/\s+/g, ' ').trim());
// Sur une réponse d'un ou deux chiffres la règle se TAIT exprès (voir
// `avisSur`) : on ne juge donc ce point que si la réponse est un mot.
const motReponse = rep.replace(/[^\p{L}]+/gu, '').length >= 4;
dire(!motReponse || /contient la réponse/.test(criee),
    motReponse ? 'un indice qui donne la réponse est dénoncé' : `réponse « ${rep} » : la règle se tait exprès`,
    criee.slice(0, 80));

// ON CHANGE DE GENRE : le formulaire doit changer de forme, pas seulement de titre.
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

// ── LE VERDICT ──────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(78));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre\x1b[0m`
    : '\x1b[32mLES DEUX ATELIERS RÉPONDENT, ET LE FOYER NE SE PERD PAS.\x1b[0m');
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.fenetresNatives.forEach(x => console.log(`  FENÊTRE NATIVE : ${x}`));
s.erreurs.slice(0, 6).forEach(x => console.log(`  ${x}`));
if (s.fenetresNatives.length || s.erreurs.length) manques++;
await s.fermer();
process.exit(manques ? 1 : 0);
