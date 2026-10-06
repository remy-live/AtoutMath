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

const lireJson = async () => {
    const t = await s.page.inputValue('#dgl-json');
    try { return JSON.parse(t); } catch (e) { return null; }
};

/** Le point, en pixels d'écran, correspondant à (x, y) en unités de toile. */
const surLaToile = async (x, y) => {
    const b = await s.page.locator('#dgl-toile').boundingBox();
    return { x: b.x + (x / 400) * b.width, y: b.y + (y / 260) * b.height };
};

console.log('\nL\'ATELIER DES DINGBATS');
console.log('─'.repeat(78));

await s.doitExister('#db-atelier-dingbats', 'le bouton de l\'atelier des dingbats');
await ouvrirLAtelier();
await s.doitExister('#dgl-toile', 'la toile');
await s.doitExister('#dgl-reserve', 'la réserve');
await s.doitExister('#dgl-bande', 'la bande des compositions');
await s.doitExister('#dgl-json', 'la zone du JSON');
await s.doitExister('#dgl-aides', 'la liste des indices');

// UNE TOILE NEUVE EST VIDE, ET ELLE LE DIT. Un rectangle quadrillé sans un mot
// se lit « cassé » aussi bien que « vide ».
const depart = await s.page.evaluate(() => ({
    elements: document.querySelectorAll('#dgl-toile [data-el]').length,
    invite: !!document.querySelector('.dgl-toile-vide'),
    pieces: document.querySelectorAll('#dgl-reserve [data-piece]').length,
    vignettes: document.querySelectorAll('.dgl-vignette').length
}));
dire(depart.elements === 0 && depart.invite,
    'la toile neuve est vide, et elle dit quoi faire', JSON.stringify(depart));
dire(depart.pieces >= 9, 'la réserve porte un mot, les six formes, un trait et une flèche',
    `${depart.pieces} pièces`);
dire(depart.vignettes === 1, 'la récolte commence avec une composition');

// --- LE GLISSER-DÉPOSER, QUI EST LA DEMANDE LITTÉRALE -----------------------
//
// On PREND « Un mot » dans la réserve et on le POSE en haut à gauche de la
// toile. Ce que la sonde vérifie n'est pas qu'un élément apparaisse : c'est
// qu'il apparaisse LÀ OÙ ON L'A LÂCHÉ. Un glisser-déposer qui dépose au milieu
// n'est pas un glisser-déposer, c'est un bouton.
const piece = await s.page.locator('[data-piece="mot"]').boundingBox();
const cible = await surLaToile(100, 70);
await s.page.mouse.move(piece.x + piece.width / 2, piece.y + piece.height / 2);
await s.page.mouse.down();
await s.page.mouse.move(cible.x - 40, cible.y - 30, { steps: 5 });
const fantome = await s.page.evaluate(() => ({
    suit: !!document.querySelector('.dgl-fantome'),
    visee: !!document.querySelector('.dgl-toile--visee')
}));
await s.page.mouse.move(cible.x, cible.y, { steps: 5 });
await s.page.mouse.up();
await dormir(400);

const pose = await lireJson();
const premier = pose && pose.dingbats && pose.dingbats[0] && pose.dingbats[0].elements[0];
dire(!!premier && Math.abs(premier.x - 100) <= 6 && Math.abs(premier.y - 70) <= 6,
    'on prend une pièce dans la réserve et on la pose OÙ ON VEUT',
    premier ? `lâchée en (100,70) → posée en (${premier.x},${premier.y})` : 'rien n\'a été posé');
dire(fantome.suit, 'un fantôme suit le doigt pendant le glissé');
dire(fantome.visee, 'la toile s\'allume quand on la survole avec une pièce');

// --- L'AUTRE GESTE : toucher la pièce, puis l'endroit ------------------------
//
// Il faut les DEUX. Un glissé rate parfois — on part trop vite, le doigt ripe —
// et le geste du tableau blanc, lui, ne rate jamais. C'est aussi le seul qui
// pose la même pièce dix fois sans y revenir.
await s.page.click('[data-piece="forme-cercle"]');
await dormir(200);
const enMain = await s.page.evaluate(() => ({
    prise: !!document.querySelector('.dgl-piece--prise'),
    dit: (document.getElementById('dgl-consigne').textContent || '').replace(/\s+/g, ' ').trim()
}));
const p2 = await surLaToile(300, 180);
await s.page.mouse.click(p2.x, p2.y);
await dormir(300);
const p3 = await surLaToile(300, 60);
await s.page.mouse.click(p3.x, p3.y);
await dormir(350);
const apresTouches = await lireJson();
const cercles = (apresTouches.dingbats[0].elements || []).filter(e => e.forme === 'cercle');
dire(enMain.prise && cercles.length === 2,
    'toucher une pièce la met EN MAIN, et elle se pose autant de fois qu\'on veut',
    `${cercles.length} cercles posés — « ${enMain.dit.slice(0, 54)}… »`);

// On repose la pièce : sans cela, le clic suivant sur la toile en poserait une
// de plus, et toutes les mesures qui suivent seraient fausses.
await s.page.click('[data-piece="forme-cercle"]');
await dormir(250);

// --- ON ATTRAPE ET L'ON DÉPLACE ---------------------------------------------
// ON EXIGE LA BONNE DISTANCE, PAS SEULEMENT LE BON SIGNE.
//
// Ma première version se contentait de « la coordonnée a augmenté » — et elle
// passait au vert alors que l'élément n'avançait que d'UN PAS de souris sur
// huit, parce que la toile se redessinait sous le doigt. UNE MESURE QUI NE
// VÉRIFIE QUE LE SIGNE D'UN DÉPLACEMENT NE MESURE PAS UN DÉPLACEMENT : elle
// mesure qu'il s'est passé quelque chose. On calcule donc la distance attendue
// en unités de toile, et l'on tolère six unités — le magnétisme arrondit à cinq.
const avantGlisse = await lireJson();
const motAvant = avantGlisse.dingbats[0].elements[0];
const prise = await surLaToile(motAvant.x, motAvant.y);
const boite = await s.page.locator('#dgl-toile').boundingBox();
// ON VISE UN COIN LIBRE, et c'est une correction de la sonde elle-même : en
// tirant le mot de 133 unités vers la droite je le posais SOUS un des cercles,
// dont la zone de prise est au-dessus (il est plus récent). Le clic suivant
// sélectionnait donc le cercle, et les deux mesures d'après — l'orientation, la
// couleur — portaient sur le mauvais élément. Le logiciel avait raison.
//
// Les cercles occupent x ∈ [225, 375] ; on emmène donc le mot à GAUCHE et EN
// BAS, là où il n'y a rien.
const duX = 20, duY = 120;                     // en unités de toile
const DX = duX / 400 * boite.width;            // les mêmes, en pixels d'écran
const DY = duY / 260 * boite.height;
await s.page.mouse.move(prise.x, prise.y);
await s.page.mouse.down();
await s.page.mouse.move(prise.x + DX, prise.y + DY, { steps: 8 });
await s.page.mouse.up();
await dormir(350);
const apresGlisse = await lireJson();
const motApres = apresGlisse.dingbats[0].elements[0];
const ecartX = Math.abs((motApres.x - motAvant.x) - duX);
const ecartY = Math.abs((motApres.y - motAvant.y) - duY);
dire(ecartX <= 6 && ecartY <= 6,
    'un élément posé s\'attrape et suit le doigt JUSQU\'AU BOUT',
    `(${motAvant.x},${motAvant.y}) → (${motApres.x},${motApres.y}), `
    + `attendu +${Math.round(duX)},+${Math.round(duY)}`);
dire(motApres.x % 5 === 0 && motApres.y % 5 === 0,
    'le magnétisme colle les coordonnées à la grille de 5');
const zones = await s.page.evaluate(() => document.querySelectorAll('#dgl-toile .dgl-prise').length);
dire(zones === 3, 'chaque élément a sa zone de prise, même entre deux lettres', `${zones} zones`);

// --- L'ORIENTATION ET LA COULEUR --------------------------------------------
// ON CLIQUE AUX COORDONNÉES, PAS SUR LE SÉLECTEUR DE LA ZONE DE PRISE.
// Playwright refuse de cliquer un élément recouvert par un autre — ici le
// `<text>` est AU-DESSUS de sa zone de prise, ce qui est exactement ce qu'on
// veut — et il attend trente secondes avant de le dire. Un doigt, lui, touche
// un POINT : le gestionnaire remonte au groupe par `closest`, et les deux
// cibles mènent au même endroit.
const surLeMot = await surLaToile(motApres.x, motApres.y);
await s.page.mouse.click(surLeMot.x, surLeMot.y);
await dormir(250);
// ON DIT CE QU'ON A SÉLECTIONNÉ. Sans cette ligne, les deux mesures suivantes
// échouaient en annonçant « aucun transform » — c'est-à-dire en accusant le
// curseur d'orientation d'un défaut qui était dans le choix de la cible.
const choisiDit = await s.page.evaluate(() =>
    (document.querySelector('#dgl-inspecteur .dgl-h3') || {}).textContent || '');
dire(/^Le mot/.test(choisiDit), 'toucher un mot sélectionne CE mot', choisiDit.trim());
const curseurAngle = '#dgl-inspecteur input[data-reg="angle"]';
await s.doitExister(curseurAngle, 'le curseur d\'orientation');
await s.page.locator(curseurAngle).fill('90');
await s.page.locator(curseurAngle).dispatchEvent('input');
await dormir(250);
const tourne = await s.page.evaluate(() =>
    (document.querySelector('#dgl-toile text') || {}).outerHTML || '');
dire(/rotate\(90/.test(tourne), 'le curseur d\'orientation tourne vraiment le mot',
    (tourne.match(/transform="[^"]*"/) || ['aucun transform'])[0]);

await s.page.click('#dgl-inspecteur [data-couleur="rouge"]');
await dormir(250);
const rouge = await s.page.evaluate(() =>
    (document.querySelector('#dgl-toile text') || {}).getAttribute('style') || '');
// `--danger-texte` ET PAS `--danger` : l'un est de l'encre, l'autre un fond, et
// employer un fond comme encre ne passe pas le seuil AA.
dire(/var\(--danger-texte\)/.test(rouge), 'la pastille change la couleur, avec un jeton d\'ENCRE', rouge);

// --- LA SOLUTION, ET PLUSIEURS INDICES --------------------------------------
await s.page.click('#dgl-reponse');
await s.page.type('#dgl-reponse', 'racine carrée', { delay: 40 });
await dormir(300);
const foyer = await s.page.evaluate(() => ({
    valeur: document.getElementById('dgl-reponse').value,
    tenu: document.activeElement && document.activeElement.id
}));
dire(foyer.valeur === 'racine carrée' && foyer.tenu === 'dgl-reponse',
    'on donne la solution sans perdre le foyer',
    `« ${foyer.valeur} », foyer sur « ${foyer.tenu} »`);

await s.page.click('#dgl-aide-plus');
await dormir(250);
const foyerAide = await s.page.evaluate(() =>
    (document.activeElement || {}).dataset?.aide);
await s.page.type('[data-aide="0"]', 'Regarde ce qui entoure le mot.', { delay: 25 });
await s.page.click('#dgl-aide-plus');
await dormir(250);
await s.page.type('[data-aide="1"]', 'La forme a quatre côtés égaux.', { delay: 25 });
await dormir(350);
const avecIndices = await lireJson();
const d0 = avecIndices.dingbats[0];
dire(Array.isArray(d0.aides) && d0.aides.length === 2 && foyerAide === '0',
    'on met PLUSIEURS indices, et le foyer tombe dans celui qu\'on vient d\'ajouter',
    JSON.stringify(d0.aides || d0.aide));

// ET LE MOTEUR DU JEU LES SERT, dans l'ordre écrit, sans jamais donner la réponse.
const servis = await s.page.evaluate(async (d) => {
    const { indices, juste } = await import('./js/core/dingbat.js');
    const suite = indices(d);
    return { suite, aucunNeDonne: suite.every(i => !juste(i, d)) };
}, d0);
dire(servis.suite.length === 4 && servis.aucunNeDonne
    && servis.suite[0] === 'Regarde ce qui entoure le mot.',
    'le jeu sert les indices dans l\'ordre écrit, et aucun ne donne la réponse',
    `${servis.suite.length} indices`);

// UN INDICE QUI DONNE LA RÉPONSE EST DÉNONCÉ, pendant qu'on l'écrit.
await s.page.fill('[data-aide="1"]', 'C\'est la racine carrée, voilà.');
await dormir(350);
const criee = await s.page.evaluate(() =>
    (document.getElementById('dgl-avis').textContent || '').replace(/\s+/g, ' ').trim());
dire(/contient la réponse/.test(criee), 'un indice qui donne la réponse est dénoncé',
    criee.slice(0, 76));
await s.page.fill('[data-aide="1"]', 'La forme a quatre côtés égaux.');
await dormir(300);

// --- LA RÉCOLTE : une deuxième composition ----------------------------------
await s.page.click('#dgl-neuve');
await dormir(500);
await s.page.click('[data-piece="mot"]');
const p4 = await surLaToile(200, 130);
await s.page.mouse.click(p4.x, p4.y);
await dormir(300);
await s.page.click('[data-piece="mot"]');
await s.page.fill('#dgl-reponse', 'demi-tour');
await dormir(400);
const deux = await lireJson();
dire(deux && deux.combien === 2 && deux.dingbats.length === 2,
    'une seconde composition s\'ajoute à la récolte, et l\'export les porte toutes',
    `combien : ${deux && deux.combien}`);
const noms = await s.page.evaluate(() =>
    [...document.querySelectorAll('.dgl-vignette-nom')].map(x => x.textContent));
dire(noms.length === 2 && noms[0] === 'racine carrée' && noms[1] === 'demi-tour',
    'la bande nomme chaque composition par sa solution', noms.join(' · '));

// --- « QU'IL SE SAUVE AU FUR ET À MESURE » : ON RECHARGE POUR DE VRAI --------
//
// C'EST LA MESURE QUI COMPTE LE PLUS DE TOUTE CETTE SONDE. La promesse ne se
// vérifie pas en lisant le code : elle se vérifie en fermant la page sans rien
// faire d'autre, puis en revenant.
await ouvrirLaPage();
await ouvrirLAtelier();
const apresRechargement = await lireJson();
const survit = apresRechargement && apresRechargement.combien === 2
    && apresRechargement.dingbats[0].reponse === 'racine carrée'
    && (apresRechargement.dingbats[0].aides || []).length === 2
    && apresRechargement.dingbats[0].elements.length === 3;
dire(survit, 'RIEN N\'EST PERDU APRÈS UN RECHARGEMENT — aucun bouton « enregistrer » n\'a été touché',
    apresRechargement
        ? `${apresRechargement.combien} compositions, ${apresRechargement.dingbats[0].elements.length} éléments, `
          + `${(apresRechargement.dingbats[0].aides || []).length} indices`
        : 'la récolte est vide');

// --- ON JETTE, ET L'ON PEUT REPRENDRE ---------------------------------------
await s.page.click('.dgl-vignette:nth-child(2) [data-jeter]');
await dormir(500);
const apresJet = await lireJson();
const bouton = await s.page.evaluate(() => !!document.getElementById('dgl-reprendre'));
dire(apresJet.combien === 1 && bouton,
    'jeter une composition laisse un « Reprendre » — pas de « êtes-vous sûr ? »',
    `${apresJet.combien} restante(s)`);
await s.page.click('#dgl-reprendre');
await dormir(500);
const reprise = await lireJson();
dire(reprise.combien === 2 && reprise.dingbats.some(d => d.reponse === 'demi-tour'),
    'et le « Reprendre » la remet vraiment', `${reprise.combien} compositions`);

// --- CE QUI SORT EST JOUABLE ------------------------------------------------
const texte = await s.page.inputValue('#dgl-json');
const jouable = await s.page.evaluate(async (t) => {
    const { dessiner, juste } = await import('./js/core/dingbat.js');
    try {
        const lot = JSON.parse(t).dingbats;
        return lot.map(d => ({
            id: d.id,
            lisible: dessiner(d).replace(/<[^>]*>/g, '').trim().length > 0,
            accepte: juste(d.reponse, d)
        }));
    } catch (e) { return [{ id: 'illisible', lisible: false, accepte: false, dit: e.message }]; }
}, texte);
dire(jouable.every(x => x.lisible && x.accepte),
    'chaque dingbat exporté se dessine ET sa réponse est acceptée par le juge du jeu',
    jouable.map(x => x.id).join(', '));

// --- VU COMME L'ÉLÈVE -------------------------------------------------------
await s.page.click('#dgl-comme-eleve');
await dormir(400);
const eleve = await s.page.evaluate(() => ({
    prises: document.querySelectorAll('.dgl-prise').length,
    scene: !!document.querySelector('.dgl-cadre-eleve svg.dg-libre')
}));
dire(eleve.prises === 0 && eleve.scene,
    'l\'aperçu « comme l\'élève » montre la scène du jeu, sans une poignée',
    JSON.stringify(eleve));
await s.page.click('#dgl-comme-eleve');
await dormir(300);

const modele = await s.page.evaluate(() => ({
    combien: document.querySelectorAll('#dgl-modele option').length,
    dessine: !!document.querySelector('#dgl-modele-vue .dg-scene')
}));
dire(modele.combien >= 100 && modele.dessine,
    'les énigmes déjà écrites restent consultables à côté', `${modele.combien} au menu`);

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
