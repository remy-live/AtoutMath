// L'ATELIER D'ESSAI, DANS UN VRAI NAVIGATEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour créer une flèche, un rectangle, on clique on relâche. Idem pour
// le mot. Double-clic pour éditer. Fais-moi quelque chose de plus moderne, plus
// facile, plus sympa. On essaie d'abord puis on l'intègre. »
//
// ── CE QU'ON MESURE, ET POURQUOI CELA ──────────────────────────────────────
//
// Aucune épreuve sous Node ne peut dire qu'un geste est FACILE. Elle peut en
// revanche dire qu'il MARCHE, et c'est tout ce qui sépare « je n'aime pas » de
// « c'est cassé » — la seule confusion qui ferait rejeter un essai pour une
// mauvaise raison.
//
// Les quatre points qui comptent, dans l'ordre de la demande :
//
//   · ON TRACE : appuie, tire, relâche → la forme a la taille tracée ;
//   · ON CLIQUE ON RELÂCHE AU MÊME ENDROIT → la forme existe quand même. C'est
//     le cas le plus fréquent au doigt, et celui qui ferait croire à un outil
//     cassé s'il ne fabriquait rien ;
//   · DOUBLE-CLIC → on édite le mot sur place ;
//   · et tout le reste tient : poignées, rotation, annuler, enregistrement.
//
//   node tools/atelierEssai.mjs

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 1000 });
let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`
        + (detail ? `  — ${detail}` : ''));
};

const adresse = `http://127.0.0.1:${s.port}/atelier-dingbats.html`;
const ouvrirLaPage = async () => {
    await s.page.goto(adresse);
    await s.page.waitForFunction(
        () => document.documentElement.dataset.atelierEssai === 'pret', { timeout: 20000 });
};

// ON PART D'UNE RÉCOLTE VIDE : sans cela la sonde mesurerait ce qu'une
// exécution précédente a laissé, et son premier chiffre serait celui d'hier.
await s.page.goto(adresse);
await s.page.evaluate(() => {
    try { localStorage.removeItem('atoutmath.atelier.essai'); } catch (e) { /* privé */ }
});
await ouvrirLaPage();

await s.doitExister('#ae-toile', 'la toile');
await s.doitExister('#ae-outils', 'la boîte à outils');
await s.doitExister('#ae-bande', 'la bande des compositions');
await s.doitExister('#ae-json', 'la zone du JSON');

const etat = () => s.page.evaluate(() => window.__atelierEssai.etat());
const elements = async () => (await etat()).lot[(await etat()).courant].elements;

/** Le point, en pixels d'écran, correspondant à (x, y) en unités de toile. */
const surLaToile = async (x, y) => {
    const b = await s.page.locator('#ae-toile').boundingBox();
    return { x: b.x + (x / 400) * b.width, y: b.y + (y / 260) * b.height };
};

console.log('\nL\'ATELIER D\'ESSAI — le geste');
console.log('─'.repeat(78));

// LA PAGE DOIT ÊTRE UNE PAGE : `css/base.css` pose `body { display: flex;
// height: 100dvh; overflow: hidden }` pour l'application, qui est un écran
// unique. Repris tel quel ici, cela écrasait la bande des compositions à un
// pixel et surtout EMPÊCHAIT LA PAGE DE DÉFILER — la fiche et l'export
// devenaient inatteignables. La photo ne le montrait pas : elle capture la
// boîte entière de l'élément, défilement ou non. Il faut donc le DEMANDER.
const miseEnPage = await s.page.evaluate(() => ({
    defile: getComputedStyle(document.body).overflow !== 'hidden',
    bande: Math.round(document.querySelector('.ae-bande').getBoundingClientRect().height),
    // LE BAS EST-IL ATTEIGNABLE ? `getBoundingClientRect().bottom` se compte
    // depuis la FENÊTRE, `scrollHeight` depuis le DOCUMENT : les comparer
    // directement, comme je l'avais fait, compare deux repères différents. On
    // ramène donc le premier dans le second en ajoutant le défilement courant.
    basAtteignable: document.querySelector('.ae-sortie').getBoundingClientRect().bottom
        + window.scrollY <= document.documentElement.scrollHeight + 2
}));
dire(miseEnPage.defile && miseEnPage.bande >= 70 && miseEnPage.basAtteignable,
    'la page défile, et la bande des compositions a sa hauteur',
    JSON.stringify(miseEnPage));

const depart = await etat();
dire(depart.outil === 'select' && depart.lot.length === 1,
    'on arrive la main vide, sur une toile neuve',
    `outil « ${depart.outil} », ${depart.lot.length} composition`);
const outils = await s.page.evaluate(() => document.querySelectorAll('[data-outil]').length);
dire(outils === 10, 'dix outils : la main, le mot, six formes, un trait, une flèche', `${outils}`);

// --- ON TRACE UN RECTANGLE ---------------------------------------------------
//
// Appuie, tire, relâche. Ce qu'on vérifie n'est pas qu'un rectangle apparaisse :
// c'est qu'il ait LA TAILLE TRACÉE. Un outil qui dépose toujours la même boîte
// n'est pas un outil de dessin, c'est un bouton.
await s.page.click('[data-outil="rectangle"]');
await dormir(200);
const outilPris = await s.page.evaluate(() =>
    !!document.querySelector('[data-outil="rectangle"].ae-outil--actif'));
dire(outilPris, 'l\'outil en main se voit');

const a = await surLaToile(80, 60);
const b = await surLaToile(240, 160);
await s.page.mouse.move(a.x, a.y);
await s.page.mouse.down();
await s.page.mouse.move(b.x, b.y, { steps: 10 });
await s.page.mouse.up();
await dormir(350);

const apresTrace = await elements();
const rect = apresTrace[0];
dire(rect && rect.type === 'forme' && rect.forme === 'rectangle'
    && Math.abs(rect.largeur - 160) <= 8 && Math.abs(rect.hauteur - 100) <= 8
    && Math.abs(rect.x - 160) <= 8 && Math.abs(rect.y - 110) <= 8,
    'on trace un rectangle, et il a LA TAILLE TRACÉE',
    rect ? `${rect.largeur}×${rect.hauteur} centré en (${rect.x},${rect.y}), attendu 160×100 en (160,110)` : 'rien');

// L'OUTIL REVIENT À LA MAIN : on vient de tracer, on veut ajuster.
dire((await etat()).outil === 'select', 'l\'outil revient à la main après une forme');

// --- LE TRACÉ NE DOIT PAS TREMBLER -------------------------------------------
//
// RÉMY : « c'est bizarre au début, quand on trace les figures, ça tremble ».
//
// TREMBLER, C'EST RECULER QUAND LA MAIN AVANCE. On tire donc un rectangle en
// vingt petits pas tous dans le même sens, et l'on exige que sa largeur ne
// DIMINUE jamais. Une seule marche arrière suffit à faire trembler l'image, et
// c'est précisément ce qu'un œil voit sans savoir le nommer.
await s.page.click('[data-outil="rectangle"]');
await dormir(200);
const t0 = await surLaToile(60, 50);
await s.page.mouse.move(t0.x, t0.y);
await s.page.mouse.down();
const largeurs = [];
for (let k = 1; k <= 20; k++) {
    const pas = await surLaToile(60 + k * 8, 50 + k * 4);
    await s.page.mouse.move(pas.x, pas.y);
    largeurs.push((await elements()).at(-1).largeur);
}
await s.page.mouse.up();
await dormir(300);
const reculs = largeurs.filter((l, i) => i > 0 && l < largeurs[i - 1]);
dire(reculs.length === 0,
    'le tracé ne TREMBLE pas : la largeur ne recule jamais quand la main avance',
    `${reculs.length} recul(s) sur 20 pas · ${largeurs.join(' ')}`);
// Et l'on nettoie ce rectangle d'épreuve : la suite compte les éléments.
await s.page.keyboard.press('Delete');
await dormir(300);

// --- LE POINT CLIQUÉ EST LE COIN SUPÉRIEUR GAUCHE ----------------------------
//
// RÉMY : « au rectangle dessiné, cela ne dessine pas depuis le coin supérieur
// gauche, cela dessine depuis le centre ». C'était vrai du CLIC — tirer donnait
// bien un rectangle de coin à coin, mais un simple clic le posait centré sur le
// point, et la moitié partait hors de la toile quand on cliquait près du bord.
//
// Un outil ne doit pas changer de sens selon qu'on a bougé la main ou non.
await s.page.click('[data-outil="rectangle"]');
await dormir(200);
const coinClic = await surLaToile(40, 30);
await s.page.mouse.move(coinClic.x, coinClic.y);
await s.page.mouse.down();
await s.page.mouse.up();
await dormir(350);
const pose = (await elements()).at(-1);
const hautGauche = { x: pose.x - pose.largeur / 2, y: pose.y - pose.hauteur / 2 };
dire(Math.abs(hautGauche.x - 40) <= 3 && Math.abs(hautGauche.y - 30) <= 3,
    'un simple clic pose la figure DEPUIS le coin cliqué, pas centrée dessus',
    `cliqué en (40,30) → coin supérieur gauche (${hautGauche.x},${hautGauche.y})`);
await s.page.keyboard.press('Delete');
await dormir(250);

// --- « ON CLIQUE ON RELÂCHE » : le cas le plus fréquent au doigt --------------
await s.page.click('[data-outil="fleche"]');
await dormir(200);
const c = await surLaToile(300, 210);
await s.page.mouse.move(c.x, c.y);
await s.page.mouse.down();
await s.page.mouse.up();
await dormir(350);
const apresClic = await elements();
const fleche = apresClic[1];
const longue = fleche ? Math.hypot(fleche.x2 - fleche.x1, fleche.y2 - fleche.y1) : 0;
dire(!!fleche && fleche.type === 'trait' && fleche.fleche === true && longue > 100,
    'un clic SANS tirer crée quand même la flèche, à une taille normale',
    fleche ? `longueur ${Math.round(longue)}` : 'rien n\'a été créé');

// --- LE MOT, ET LE DOUBLE-CLIC POUR ÉDITER -----------------------------------
await s.page.click('[data-outil="mot"]');
await dormir(200);
// LE CURSEUR DIT CE QUI VA SE PASSER. Rémy : « quand on prend l'outil mot, le
// curseur de la souris devrait prendre la forme d'un curseur ». Une croix
// annonce un tracé, une barre annonce qu'on va écrire : ce sont deux gestes
// différents, et la main doit le savoir AVANT d'appuyer.
const curseur = await s.page.evaluate(() =>
    getComputedStyle(document.getElementById('ae-toile')).cursor);
dire(curseur === 'text', 'avec l\'outil mot, le curseur de la souris devient une barre de texte',
    curseur);
const d = await surLaToile(160, 110);
await s.page.mouse.click(d.x, d.y);
await dormir(400);
const saisieOuverte = await s.page.evaluate(() => {
    const ch = document.getElementById('ae-saisie');
    return { visible: !ch.hidden, foyer: document.activeElement === ch };
});
dire(saisieOuverte.visible && saisieOuverte.foyer,
    'un mot neuf ouvre sa saisie tout de suite — on n\'a pas à deviner le double-clic',
    JSON.stringify(saisieOuverte));

// ON ÉCRIT DIRECTEMENT SUR LA TOILE : plus de cadre, plus de fond, plus d'encre
// dans le champ — il ne reste que le curseur. Rémy : « sans cadre autour ».
const sansCadre = await s.page.evaluate(() => {
    const g = getComputedStyle(document.getElementById('ae-saisie'));
    const transparent = (c) => /rgba\(0, 0, 0, 0\)|transparent/.test(c);
    return {
        bordure: g.borderTopWidth, fond: g.backgroundColor,
        encre: g.webkitTextFillColor || g.color, curseur: g.caretColor,
        ombre: g.boxShadow,
        ok: parseFloat(g.borderTopWidth) === 0 && transparent(g.backgroundColor)
            && transparent(g.webkitTextFillColor || g.color)
            && !transparent(g.caretColor) && g.boxShadow === 'none'
    };
});
dire(sansCadre.ok, 'on écrit SUR la toile : ni cadre, ni fond, ni encre — rien que le curseur',
    `bordure ${sansCadre.bordure}, fond ${sansCadre.fond}, curseur ${sansCadre.curseur}`);

await s.page.type('#ae-saisie', 'RACINE', { delay: 35 });
await dormir(250);
const pendant = await s.page.evaluate(() => ({
    surLaToile: (document.querySelector('#ae-toile text') || {}).textContent || '',
    foyer: document.activeElement.id
}));
dire(pendant.surLaToile === 'RACINE' && pendant.foyer === 'ae-saisie',
    'le mot se dessine À CHAQUE LETTRE, sans que le champ perde le foyer',
    `« ${pendant.surLaToile} », foyer sur « ${pendant.foyer} »`);
await s.page.keyboard.press('Enter');
await dormir(350);

const motPose = (await elements())[2];
// LE MOT GARDE LA POSITION DU CURSEUR — c'est la demande de Rémy : « le mot ne
// se centre pas, il garde la position du curseur ». On ne regarde donc PAS son
// centre (qui se décale à droite à mesure qu'il s'allonge, et c'est normal) mais
// son BORD GAUCHE, qui doit rester sur le point cliqué.
const coinsDuMot = await s.page.evaluate(() => window.__atelierEssai.coins());
const bordGauche = coinsDuMot ? Math.min(...coinsDuMot.map(p => p.x)) : null;
dire(!!motPose && motPose.texte === 'RACINE' && bordGauche !== null && Math.abs(bordGauche - 160) <= 6,
    'Entrée pose le mot, et il COMMENCE là où l\'on a cliqué',
    motPose ? `« ${motPose.texte} » : bord gauche ${bordGauche}, centre ${motPose.x} — cliqué en 160` : 'rien');

// DOUBLE-CLIC POUR ÉDITER — la demande, mot pour mot.
const surLeMot = await surLaToile(motPose.x, motPose.y);
await s.page.mouse.dblclick(surLeMot.x, surLeMot.y);
await dormir(400);
const rouverte = await s.page.evaluate(() => {
    const ch = document.getElementById('ae-saisie');
    return { visible: !ch.hidden, valeur: ch.value };
});
dire(rouverte.visible && rouverte.valeur === 'RACINE',
    'double-clic sur un mot rouvre sa saisie, avec son texte dedans',
    JSON.stringify(rouverte));
await s.page.keyboard.press('Escape');
await dormir(300);

// --- LES POIGNÉES : tourner et redimensionner --------------------------------
await s.page.mouse.click(surLeMot.x, surLeMot.y);
await dormir(300);
const poignees = await s.page.evaluate(() => ({
    coins: document.querySelectorAll('[data-poignee="no"],[data-poignee="ne"],[data-poignee="se"],[data-poignee="so"]').length,
    pivot: document.querySelectorAll('[data-poignee="rot"]').length,
    barre: !document.getElementById('ae-barre').hidden
}));
dire(poignees.coins === 4 && poignees.pivot === 1 && poignees.barre,
    'la sélection montre quatre coins, un pivot, et sa barre contextuelle',
    JSON.stringify(poignees));

// LA POIGNÉE DE ROTATION. On la tire sur le côté : l'angle doit devenir droit,
// parce qu'elle se cale sur les crans de cinq degrés et SAUTE sur les droits.
const pivotBoite = await s.page.locator('[data-poignee="rot"]').boundingBox();
const centreMot = await surLaToile(motPose.x, motPose.y);
await s.page.mouse.move(pivotBoite.x + pivotBoite.width / 2, pivotBoite.y + pivotBoite.height / 2);
await s.page.mouse.down();
await s.page.mouse.move(centreMot.x + 150, centreMot.y, { steps: 10 });
await s.page.mouse.up();
await dormir(350);
const tourne = (await elements())[2];
dire(tourne.angle === 90, 'le pivot tourne le mot, et se cale sur les angles droits',
    `angle ${tourne.angle}°`);

// LA POIGNÉE DE COIN : un mot GROSSIT, il ne s'étire pas — étirer une lettre
// dans un seul sens la rend illisible, et un dingbat se lit.
// ON TIRE LE COIN VERS L'EXTÉRIEUR, le long de la droite qui le relie au
// centre — et non « vers le bas à droite ». Le mot vient d'être tourné d'un
// quart de tour : « vers le bas à droite » ne l'éloigne plus de son centre, et
// ma première version mesurait un agrandissement qui n'avait aucune raison
// d'arriver. UNE MESURE DOIT TENIR DANS LE REPÈRE DE L'OBJET, pas dans celui de
// l'écran, dès que l'objet peut tourner.
const avantTaille = tourne.taille;
// LE COIN OPPOSÉ EST LE CLOU : on relève sa position avant de tirer. C'est la
// demande de Rémy — « que le ragrandissement ne se fasse pas centré, que le coin
// supérieur gauche reste fixe » — et elle ne se vérifie qu'en le comparant.
const coinsAvant = await s.page.evaluate(() => window.__atelierEssai.coins());
const coin = await s.page.locator('[data-poignee="se"]').boundingBox();
const cxy = await surLaToile(motPose.x, motPose.y);
const cxCoin = coin.x + coin.width / 2, cyCoin = coin.y + coin.height / 2;
const versDehors = { x: cxCoin - cxy.x, y: cyCoin - cxy.y };
await s.page.mouse.move(cxCoin, cyCoin);
await s.page.mouse.down();
await s.page.mouse.move(cxy.x + versDehors.x * 1.8, cxy.y + versDehors.y * 1.8, { steps: 8 });
await s.page.mouse.up();
await dormir(350);
const grossi = (await elements())[2];
dire(grossi.taille > avantTaille && !('hauteur' in grossi),
    'une poignée de coin fait GROSSIR le mot, elle ne l\'étire pas',
    `taille ${avantTaille} → ${grossi.taille}`);

const coinsApres = await s.page.evaluate(() => window.__atelierEssai.coins());
// On a tiré « se » : le clou est « no », l'autre bout de la diagonale.
const clouAvant = coinsAvant[0], clouApres = coinsApres[0];
const bouge = Math.hypot(clouApres.x - clouAvant.x, clouApres.y - clouAvant.y);
dire(bouge <= 2, 'LE COIN OPPOSÉ NE BOUGE PAS : l\'objet grandit depuis lui, pas depuis son centre',
    `(${clouAvant.x},${clouAvant.y}) → (${clouApres.x},${clouApres.y}), écart ${bouge.toFixed(1)}`);

// --- ANNULER -----------------------------------------------------------------
await s.page.click('#ae-annuler');
await dormir(350);
const annule = (await elements())[2];
dire(annule.taille === avantTaille, 'Annuler revient en arrière',
    `taille ${grossi.taille} → ${annule.taille}`);
await s.page.click('#ae-refaire');
await dormir(350);
dire((await elements())[2].taille === grossi.taille, 'et Refaire revient en avant');

// --- LA COULEUR, DEPUIS LA BARRE CONTEXTUELLE --------------------------------
await s.page.mouse.click(surLeMot.x, surLeMot.y);
await dormir(300);
const pastille = await s.page.$('#ae-barre [data-couleur="rouge"]');
if (pastille) { await pastille.click(); await dormir(300); }
const colore = await s.page.evaluate(() =>
    (document.querySelector('#ae-toile text') || {}).getAttribute('style') || '');
// `--danger-texte` ET PAS `--danger` : l'un est de l'encre, l'autre un fond.
dire(/var\(--danger-texte\)/.test(colore),
    'la barre contextuelle change la couleur, avec un jeton d\'ENCRE', colore.slice(0, 54));

// --- LA SOLUTION, LES INDICES, ET CE QUI SORT --------------------------------
await s.page.click('#ae-reponse');
await s.page.type('#ae-reponse', 'racine carrée', { delay: 30 });
await s.page.click('#ae-aide-plus');
await dormir(250);
await s.page.type('[data-aide="0"]', 'Regarde ce qui entoure le mot.', { delay: 20 });
await dormir(400);
const fiche = await s.page.evaluate(() => ({
    reponse: document.getElementById('ae-reponse').value,
    foyer: (document.activeElement || {}).dataset?.aide
}));
dire(fiche.reponse === 'racine carrée' && fiche.foyer === '0',
    'on donne la solution et un indice sans perdre le foyer', JSON.stringify(fiche));

const texte = await s.page.inputValue('#ae-json');
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
    'ce qui sort de l\'essai se dessine ET sa réponse est acceptée par le juge du jeu',
    jouable.map(x => x.id).join(', '));

// --- ÇA SE SAUVE : on recharge pour de vrai ----------------------------------
await ouvrirLaPage();
const apresRechargement = await etat();
const survit = apresRechargement.lot.length === 1
    && apresRechargement.lot[0].elements.length === 3
    && apresRechargement.lot[0].reponse === 'racine carrée'
    && (apresRechargement.lot[0].aides || []).length === 1;
dire(survit, 'RIEN N\'EST PERDU APRÈS UN RECHARGEMENT — aucun bouton « enregistrer » n\'a été touché',
    `${apresRechargement.lot[0].elements.length} éléments, `
    + `${(apresRechargement.lot[0].aides || []).length} indice(s)`);

// --- LA RÉCOLTE EST BIEN À PART ----------------------------------------------
const separee = await s.page.evaluate(() => {
    try {
        return !localStorage.getItem('atoutmath.atelier.dingbats.recolte');
    } catch (e) { return true; }
});
dire(separee, 'l\'essai n\'a pas touché à la récolte de l\'atelier intégré');

// --- L'IMPORT D'UN SVG -------------------------------------------------------
//
// RÉMY : « il faudrait pouvoir importer des svg ». Ce qu'il importe finira servi
// à chaque élève : on mesure donc AUSSI que le fichier d'épreuve, qui porte
// exprès un `<script>` et un `onclick`, en ressorte sans eux.
console.log('─'.repeat(78));
await s.doitExister('#ae-import', 'le bouton d\'import');
await s.page.setInputFiles('#ae-import', 'tools/tmp/maison.svg');
await dormir(700);
const importe = (await elements()).at(-1);
dire(!!importe && importe.type === 'dessin' && importe.contenu.includes('<path'),
    'un SVG s\'importe et se pose sur la toile',
    importe ? `${importe.largeur}×${importe.hauteur}, viewBox ${(importe.vueBoite || []).join(' ')}` : 'rien');
dire(!!importe && !/script|onclick/i.test(importe.contenu),
    'LE SCRIPT ET LE GESTIONNAIRE D\'ÉVÉNEMENT SONT PARTIS — c\'est ce qui sera servi aux élèves',
    importe ? importe.contenu.replace(/\s+/g, ' ').slice(0, 60) : '');
dire(!!importe && /currentColor/.test(importe.contenu),
    'le dessin suit l\'encre du thème : il ne disparaîtra pas sur le thème sombre');
const proportions = importe ? Math.abs(importe.hauteur / importe.largeur - 18 / 24) : 1;
dire(proportions < 0.05, 'ses proportions sont gardées : un dessin étiré est un dessin abîmé',
    importe ? `${importe.largeur}×${importe.hauteur} pour un viewBox 24×18` : '');
const dessine = await s.page.evaluate(() =>
    document.querySelectorAll('#ae-toile [data-el] svg').length);
dire(dessine === 1, 'et il se dessine vraiment dans la scène', `${dessine} svg imbriqué(s)`);
const ditImport = await s.page.evaluate(() =>
    (document.getElementById('ae-consigne').textContent || '').trim());
dire(/retiré/.test(ditImport), 'on DIT ce qu\'on a retiré du fichier', ditImport.slice(0, 70));

await s.photo('body', 'tools/tmp/atelier-essai.png');

console.log('\n' + '─'.repeat(78));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre\x1b[0m`
    : '\x1b[32mON TRACE, ON CLIQUE, ON DOUBLE-CLIQUE — ET ÇA SE SAUVE.\x1b[0m');
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.fenetresNatives.forEach(x => console.log(`  FENÊTRE NATIVE : ${x}`));
s.erreurs.slice(0, 6).forEach(x => console.log(`  ${x}`));
if (s.fenetresNatives.length || s.erreurs.length) manques++;
await s.fermer();
process.exit(manques ? 1 : 0);
