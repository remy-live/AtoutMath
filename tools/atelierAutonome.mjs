// LE FICHIER AUTONOME, OUVERT COMME RÉMY L'OUVRIRA — depuis le disque.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour l'atelier, donne-le-moi directement ici sous forme de fichier. »
//
// ── POURQUOI CETTE SONDE EXISTE EN PLUS DE L'AUTRE ─────────────────────────
//
// `tools/atelierEssai.mjs` mesure l'atelier SERVI par le site. Le fichier
// autonome, lui, s'ouvre sous `file://` — un monde où le navigateur REFUSE les
// imports de modules, où `localStorage` est partagé par tous les fichiers du
// disque, et où la moindre référence à un fichier voisin échoue en silence sur
// une page blanche.
//
// UNE MESURE QUI N'EMPRUNTE PAS LE CHEMIN DE L'UTILISATEUR NE MESURE PAS SON
// PROBLÈME, et son chemin à lui est un double-clic sur un fichier reçu par
// courriel. C'est donc celui-là qu'on prend.
//
//   node tools/paquetAtelier.mjs && node tools/atelierAutonome.mjs

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const FICHIER = 'tools/tmp/atelier-dingbats-autonome.html';
if (!existsSync(FICHIER)) {
    console.error(`\n  ${FICHIER} n'existe pas — lancer d'abord : node tools/paquetAtelier.mjs\n`);
    process.exit(1);
}

const s = await ouvrirSonde({ largeur: 1280, hauteur: 1000 });
let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`
        + (detail ? `  — ${detail}` : ''));
};

console.log('\nLE FICHIER AUTONOME, DEPUIS LE DISQUE');
console.log('─'.repeat(78));

const ko = Math.round(statSync(FICHIER).size / 1024);
dire(ko < 400, 'le fichier tient dans un courriel', `${ko} Ko`);

// `file://` ET RIEN D'AUTRE : pas de serveur, pas de réseau.
await s.page.goto('file://' + resolve(FICHIER));
let pret = true;
try {
    await s.page.waitForFunction(
        () => document.documentElement.dataset.atelierEssai === 'pret', { timeout: 15000 });
} catch (e) { pret = false; }
dire(pret, 'il s\'ouvre d\'un double-clic — aucun module, aucun fichier voisin',
    pret ? '' : 'la page ne s\'est jamais déclarée prête');
if (!pret) {
    s.erreurs.slice(0, 5).forEach(x => console.log(`  ${x}`));
    await s.fermer();
    process.exit(1);
}

// AUCUNE REQUÊTE VERS UN FICHIER VOISIN : c'est ce qui le rend transportable.
// Une feuille de style oubliée ne fait pas d'erreur de page — elle rend un écran
// sans couleurs, qu'on peut prendre pour un choix.
const dehors = await s.page.evaluate(() => ({
    liens: document.querySelectorAll('link[href], script[src], img[src]').length,
    styles: document.querySelectorAll('style').length,
    scripts: document.querySelectorAll('script').length
}));
dire(dehors.liens === 0 && dehors.styles >= 1 && dehors.scripts >= 1,
    'tout est dedans : aucun lien vers un fichier voisin', JSON.stringify(dehors));

// LES JETONS DE COULEUR SONT LÀ : sans `base.css`, la page s'affiche en noir sur
// blanc et tout paraît « simplement sobre ».
const couleurs = await s.page.evaluate(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--primary-texte').trim();
    const fond = getComputedStyle(document.body).backgroundColor;
    return { jeton: v, fond };
});
dire(!!couleurs.jeton && couleurs.fond !== 'rgba(0, 0, 0, 0)',
    'les couleurs de la maison sont embarquées', JSON.stringify(couleurs));

// --- ET IL MARCHE : on trace, on écrit, on exporte --------------------------
const etat = () => s.page.evaluate(() => window.__atelierEssai.etat());
const surLaToile = async (x, y) => {
    const b = await s.page.locator('#ae-toile').boundingBox();
    return { x: b.x + (x / 400) * b.width, y: b.y + (y / 260) * b.height };
};

await s.page.click('[data-outil="carre"]');
const a = await surLaToile(90, 70);
const b = await surLaToile(210, 190);
await s.page.mouse.move(a.x, a.y);
await s.page.mouse.down();
await s.page.mouse.move(b.x, b.y, { steps: 10 });
await s.page.mouse.up();
await dormir(350);
const carre = (await etat()).lot[0].elements[0];
dire(!!carre && carre.forme === 'carre' && Math.abs(carre.largeur - 120) <= 8,
    'on y trace une figure, et elle a la taille tracée',
    carre ? `côté ${carre.largeur}` : 'rien');

await s.page.click('[data-outil="mot"]');
const c = await surLaToile(150, 130);
await s.page.mouse.click(c.x, c.y);
await dormir(350);
await s.page.type('#ae-saisie', 'RACINE', { delay: 25 });
await s.page.keyboard.press('Enter');
await dormir(350);
const mot = (await etat()).lot[0].elements[1];
dire(!!mot && mot.texte === 'RACINE', 'on y écrit un mot directement sur la toile',
    mot ? `« ${mot.texte} »` : 'rien');

await s.page.fill('#ae-reponse', 'racine carrée');
await dormir(400);
const sortie = await s.page.evaluate((t) => {
    try {
        const lot = JSON.parse(t).dingbats;
        return { ok: true, combien: lot.length, id: lot[0].id, reponse: lot[0].reponse };
    } catch (e) { return { ok: false, dit: e.message }; }
}, await s.page.inputValue('#ae-json'));
dire(sortie.ok && sortie.reponse === 'racine carrée' && /^dg-/.test(sortie.id),
    'le JSON qu\'il produit est le même que celui du site', JSON.stringify(sortie));

// L'ENREGISTREMENT MARCHE AUSSI SOUS `file://`, où `localStorage` est partagé
// par tous les fichiers du disque — ce qui vaut la peine d'être vérifié plutôt
// que supposé : un refus silencieux ferait perdre son travail.
await s.page.reload();
await s.page.waitForFunction(
    () => document.documentElement.dataset.atelierEssai === 'pret', { timeout: 15000 });
const apres = (await etat()).lot[0];
dire(apres.elements.length === 2 && apres.reponse === 'racine carrée',
    'et rien n\'est perdu quand on referme le fichier',
    `${apres.elements.length} éléments, « ${apres.reponse} »`);

await s.photo('body', 'tools/tmp/atelier-autonome.png');

console.log('\n' + '─'.repeat(78));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre\x1b[0m`
    : '\x1b[32mLE FICHIER S\'OUVRE SEUL, ET IL FAIT TOUT CE QUE FAIT LE SITE.\x1b[0m');
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.fenetresNatives.forEach(x => console.log(`  FENÊTRE NATIVE : ${x}`));
s.erreurs.slice(0, 6).forEach(x => console.log(`  ${x}`));
if (s.fenetresNatives.length || s.erreurs.length) manques++;
await s.fermer();
process.exit(manques ? 1 : 0);
