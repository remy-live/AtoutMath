// LA SESSION EXPRESS, SUR LE CHEMIN DE RÉMY.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 17 novembre : « on pourrait envisager une session express, avec des
// jeux mathématiques (ou des défis) quand il reste 10 minutes, je vais sur la
// classe, je clique session express et hop », puis « on pourrait même donner
// un code express ».
//
// ── POURQUOI UNE SONDE, ET POURQUOI ELLE CLIQUE VRAIMENT ──────────────────
//
// « JE VAIS SUR LA CLASSE, JE CLIQUE » est la demande elle-même : ce qui est
// mesuré ici n'est pas que la séance se fabrique — `tests/sessionExpress.test.mjs`
// le dit en deux millisecondes —, c'est qu'un professeur pressé la TROUVE et
// l'OBTIENNE en un geste. Un bouton dessiné mais pas branché, un crochet
// oublié dans la liste des sélecteurs, une séance montée mais pas imposée : ces
// trois défauts-là sont invisibles à la lecture, et chacun rend le bouton
// inutile sans lever la moindre erreur.
//
// ET L'ÉLÈVE EST LÀ AUSSI. Une séance qui part au serveur et ne s'ouvre pas
// chez lui n'est pas une session express : c'est une séance de plus dans une
// liste. Son poste est donc ouvert AVANT le clic, et jamais rechargé — comme
// celui de ses élèves, qui travaillent déjà.
//
//     node tools/sessionExpress.mjs
//     node tools/sessionExpress.mjs --photos

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const photos = process.argv.includes('--photos');
let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();
const classeId = s.info.classe;

// ── L'ÉLÈVE EST DÉJÀ AU TRAVAIL ───────────────────────────────────────────
console.log('\n\x1b[1mUN ÉLÈVE A SON POSTE OUVERT\x1b[0m');
const billet = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => x.login && x.code);
    return e ? `${e.login}/${e.code}` : null;
}, [classeId]);
dire('un billet d\'élève est disponible', !!billet, String(billet));

const eleve = await s.ctx.newPage();
const ennuis = [];
eleve.on('pageerror', (e) => ennuis.push(String(e).slice(0, 160)));
eleve.on('dialog', async (d) => {
    ennuis.push('FENÊTRE NATIVE : ' + d.message());
    await d.dismiss();
});
await eleve.goto(
    `http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
await eleve.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
dire('son poste est ouvert', true);

// ── RÉMY VA SUR LA CLASSE ─────────────────────────────────────────────────
console.log('\n\x1b[1mRÉMY VA SUR LA CLASSE\x1b[0m');
await s.page.click('#top-btn-classe');
await s.page.waitForTimeout(900);
// `doitExister` JETTE si le crochet ne désigne rien : un sélecteur inventé rend
// `false`, c'est-à-dire la même réponse qu'un logiciel cassé.
await s.doitExister(`[data-ouvrir="${classeId}"]`);
await s.page.click(`[data-ouvrir="${classeId}"]`);
await s.page.waitForTimeout(900);
await s.doitExister('[data-onglet="seances"]');
await s.page.click('[data-onglet="seances"]');
await s.page.waitForTimeout(700);
dire('l\'écran « Les séances » est ouvert', true);

// ── ET IL CLIQUE ──────────────────────────────────────────────────────────
//
// LE BOUTON DOIT SE VOIR SANS QU'ON LE CHERCHE : on mesure qu'il est à
// l'écran, pas seulement dans le HTML. Un bouton présent mais hors de la zone
// visible est un bouton qu'on ne clique pas à trois minutes de la sonnerie.
await s.doitExister('[data-session-express]');
const place = await s.page.evaluate(() => {
    const b = document.querySelector('[data-session-express]');
    const r = b.getBoundingClientRect();
    return { haut: Math.round(r.top), bas: Math.round(r.bottom),
        hauteur: Math.round(r.height), fenetre: window.innerHeight,
        texte: b.textContent.trim() };
});
dire('le bouton est à l\'écran, sans défiler',
    place.haut >= 0 && place.bas <= place.fenetre,
    `« ${place.texte} » à ${place.haut} px, fenêtre ${place.fenetre}`);
// ET IL SE TOUCHE : 44 px est la borne de toutes les recommandations
// d'accessibilité, et celle du bon sens sur une tablette de professeur.
dire('et il se touche au doigt', place.hauteur >= 36, `${place.hauteur} px`);

await s.page.click('[data-session-express]');
// LA SÉANCE MONTE PUIS S'IMPOSE : deux allers-retours au serveur.
await s.page.waitForTimeout(2500);

// ── LE CODE S'AFFICHE, EN GRAND ───────────────────────────────────────────
console.log('\n\x1b[1mLE CODE EXPRESS\x1b[0m');
const code = await s.page.evaluate(() => {
    const el = document.querySelector('.ec-express-code');
    if (!el) return null;
    const st = getComputedStyle(el);
    return { texte: el.textContent.trim(), taille: parseFloat(st.fontSize) };
});
dire('le code s\'affiche', !!code, code ? code.texte : 'aucun élément .ec-express-code');
if (code) {
    // IL SE DICTE : trois lettres par jeu, un tiret entre, et rien d'autre.
    // Un code en base64 commence par « M2- » et fait cent quatre-vingts
    // caractères — il ne s'épelle pas devant une classe.
    // L'EN-TÊTE « 9L » EN TÊTE — c'est lui qui dit « tout est ouvert », et il
    // ne coûte que deux caractères à dicter. Voir `ENTETE` dans shortcodes.js.
    dire('il se dicte à voix haute',
        /^9L(-[A-Z]{3})+$/.test(code.texte) && code.texte.length <= 26,
        `« ${code.texte} », ${code.texte.length} caractères`);
    // ET IL SE LIT DE LOIN : il est tenu à bout de bras au-dessus d'une classe.
    dire('et il s\'écrit assez grand pour être lu', code.taille >= 24,
        `${Math.round(code.taille)} px`);
}
if (photos) await s.photo('.modal-panel, .glass-panel', 'tools/tmp/express-code.png');

// ── LA SÉANCE EST EN COURS, CHEZ L'ÉLÈVE ──────────────────────────────────
console.log('\n\x1b[1mCHEZ L\'ÉLÈVE, SANS QU\'IL AIT RIEN LANCÉ\x1b[0m');
// ON LIT CE QUE LE SERVEUR RÉPOND VRAIMENT, et non ce qu'on croit qu'il
// répond : premier jet de cette sonde, `seancesDeLaClasse().classe` — qui
// n'existe pas dans la réponse. Elle accusait donc le logiciel d'un défaut
// qu'elle avait elle-même. C'est `mesClasses()` qui porte `impose_path_id`.
const auServeur = await s.page.evaluate(async ([cid]) => {
    const { seancesDeLaClasse, mesClasses } = await import('./js/core/espaceProf.js');
    const r = await seancesDeLaClasse(cid);
    const cls = await mesClasses();
    const la = (cls.classes || cls || []).find(c => c.id === cid) || {};
    return { impose: la.impose_path_id || '',
        noms: (r.seances || []).map(x => x.nom || x.name || ''),
        ids: (r.seances || []).map(x => x.pathId) };
}, [classeId]);
dire('la séance express est au serveur',
    auServeur.noms.some(n => /express/i.test(n)), auServeur.noms.join(' | '));
dire('et elle est celle qui est imposée',
    !!auServeur.impose && auServeur.ids.includes(auServeur.impose), auServeur.impose);

// L'ARDOISE DE L'ÉLÈVE BAT TOUTES LES DIX SECONDES : on attend son tour.
let vu = null;
for (let i = 0; i < 14 && !vu; i++) {
    await dormir(2000);
    // ON CHERCHE LE MOT DANS TOUTE LA PAGE DE L'ÉLÈVE, et non dans un crochet
    // qu'on aurait deviné : le bandeau du moment, la carte de la séance et
    // l'écran de départ portent le nom chacun à leur façon, et celui qui
    // s'affiche dépend de la case « écran de séance ». Ce qu'on mesure est
    // qu'il la VOIT, pas où elle est peinte.
    vu = await eleve.evaluate(() => {
        const t = document.body.innerText || '';
        const i = t.toLowerCase().indexOf('session express');
        return i >= 0 ? t.slice(i, i + 40).replace(/\n/g, ' ') : null;
    }).catch(() => null);
}
dire('l\'élève voit la session express arriver, sans rien lancer', !!vu,
    vu || 'rien dans le bandeau du moment après 28 s');

// ── ET LES TROIS JEUX SONT OUVERTS D'EMBLÉE ───────────────────────────────
//
// RÉMY, 18 novembre : « il faut pas que la session express attende que l'on
// fasse un jeu pour en avoir un autre, tout doit être ouvert. »
//
// LA MESURE DISCRIMINE, ET C'EST VÉRIFIÉ : la même sonde lancée avec
// `ordreLibre: false` compte DEUX cadenas sur trois jeux, et zéro avec. Une
// mesure qui rendrait zéro dans les deux cas ne garderait rien.
const cadenas = await eleve.evaluate(() => ({
    verrous: (document.body.innerText.match(/🔒/g) || []).length,
    debloquer: (document.body.innerText.match(/à débloquer/g) || []).length
}));
dire('aucun jeu n\'attend qu\'on finisse le précédent',
    cadenas.verrous === 0 && cadenas.debloquer === 0,
    `${cadenas.verrous} cadenas, ${cadenas.debloquer} « à débloquer »`);
if (photos) await s.photo('body', 'tools/tmp/express-prof.png');

dire('aucune erreur de page côté professeur', s.erreurs.length === 0,
    s.erreurs.slice(0, 2).join(' | '));
dire('aucune fenêtre native', s.fenetresNatives.length === 0,
    s.fenetresNatives.slice(0, 2).join(' | '));
dire('aucune erreur de page côté élève', ennuis.length === 0, ennuis.slice(0, 2).join(' | '));

await eleve.close();
await s.fermer();

console.log('\n' + '─'.repeat(64));
console.log(rates ? `\n${rates} POINT(S) À REVOIR.`
    : '\nDIX MINUTES, UN CLIC, ET UN CODE QUI SE DICTE.');
process.exit(rates ? 1 : 0);
