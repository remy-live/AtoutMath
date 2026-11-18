// LE DEVOIR À LA MAISON, DES DEUX CÔTÉS — Rémy le pose, l'élève le reçoit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « une séance qui s'ouvre et se ferme toute seule à une
// date, et le tableau de qui l'a faite. »
//
// ── POURQUOI UNE SONDE, ALORS QUE DEUX HARNAIS MESURENT DÉJÀ ──────────────
//
// `tests/devoir.test.mjs` dit que les dates se calculent et se disent bien ;
// `php tools/testApi.php` dit que le serveur range l'échéance, ne l'efface pas
// en redonnant la séance, et compte ceux qui l'ont rendue. Il reste entre les
// deux tout ce qui ne vit que dans le navigateur, et qui rend le devoir
// inutilisable sans lever la moindre erreur :
//
//   · LE BOUTON. « à rendre pour… » doit exister sur la ligne de la séance,
//     être écouté par le répartiteur (un crochet absent de sa liste s'affiche
//     normalement et NE FAIT RIEN), et ouvrir une FENÊTRE — pas un `prompt`ʼ,
//     que Rémy a banni ;
//   · LA DATE QUI REVIENT. Posée, elle doit réapparaître sur la ligne, avec le
//     compte des rendus. C'est le seul endroit où le professeur la relit ;
//   · L'ÉLÈVE. La date doit traverser le serveur et arriver sur SA carte
//     d'accueil, sans qu'il ait rien à chercher. C'est tout l'intérêt : un
//     devoir qu'on ne voit pas n'est pas donné.
//
//     node tools/devoirALaMaison.mjs
//     node tools/devoirALaMaison.mjs --photos

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

// ── ON DONNE D'ABORD UNE SÉANCE À LA CLASSE ───────────────────────────────
//
// Le devoir est une séance À QUI L'ON POSE UNE DATE : il n'y a pas d'objet
// « devoir » dans ce logiciel, et c'est une décision — voir `core/devoir.js`.
console.log('\n\x1b[1mUNE SÉANCE EST DONNÉE À LA CLASSE\x1b[0m');
const donnee = await s.page.evaluate(async ([cid]) => {
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { defaultPolicy } = await import('./js/core/policy.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const p = makePath('Les fractions — devoir', [
        makeStep('calc-add', {}, { stepId: 'x1', nbItems: 3 })
    ], defaultPolicy());
    const r = await donnerAuServeur(p, cid);
    return r.erreur ? { erreur: r.erreur } : { pathId: p.id, nom: p.name };
}, [classeId]);
dire('la séance part au serveur', !donnee.erreur, donnee.erreur || donnee.nom);

// ── RÉMY VA SUR LA CLASSE, ONGLET « LES SÉANCES » ─────────────────────────
console.log('\n\x1b[1mRÉMY POSE L\'ÉCHÉANCE\x1b[0m');
await s.page.click('#top-btn-classe');
await s.page.waitForTimeout(900);
await s.doitExister(`[data-ouvrir="${classeId}"]`);
await s.page.click(`[data-ouvrir="${classeId}"]`);
await s.page.waitForTimeout(900);
await s.doitExister('[data-onglet="seances"]');
await s.page.click('[data-onglet="seances"]');
await s.page.waitForTimeout(1200);

// LE BOUTON EXISTE, ET IL EST SUR LA LIGNE DE LA SÉANCE.
await s.doitExister('[data-echeance]');
const place = await s.page.evaluate(() => {
    const b = document.querySelector('[data-echeance]');
    const r = b.getBoundingClientRect();
    return { texte: b.textContent.trim(), haut: Math.round(r.height),
        visible: r.width > 0 && r.height > 0 };
});
dire('le bouton « à rendre pour… » est sur la ligne', place.visible,
    `« ${place.texte} », ${place.haut} px`);
dire('et il se touche au doigt', place.haut >= 24, `${place.haut} px`);

await s.page.click('[data-echeance]');
await s.page.waitForTimeout(700);
// LA FENÊTRE PROPOSE QUATRE DATES — et c'est une FENÊTRE, pas un `prompt`ʼ.
const fenetre = await s.page.evaluate(() => {
    const prop = [...document.querySelectorAll('[data-quand]')]
        .map(b => b.textContent.trim().replace(/\s+/g, ' '));
    return { prop, champ: !!document.querySelector('[data-echeance-date]'),
        poser: !!document.querySelector('[data-echeance-poser]') };
});
dire('quatre dates sont proposées', fenetre.prop.length === 4, fenetre.prop.join(' | '));
dire('et un champ de date pour le reste', fenetre.champ && fenetre.poser);
if (photos) await s.photo('.modal-panel, .glass-panel', 'tools/tmp/devoir-fenetre.png');

// ON CLIQUE « DIMANCHE SOIR », la troisième — celle qu'on donne vraiment.
await s.page.click('[data-quand]:nth-of-type(3)');
await s.page.waitForTimeout(2500);

// ── LA DATE REVIENT SUR LA LIGNE, AVEC LE COMPTE DES RENDUS ───────────────
console.log('\n\x1b[1mCE QUE RÉMY RELIT ENSUITE\x1b[0m');
const ligne = await s.page.evaluate(() => {
    const q = document.querySelector('.ec-devoir-quand');
    const c = document.querySelector('.ec-devoir-compte');
    const b = document.querySelector('[data-echeance]');
    return { quand: q ? q.textContent.trim() : null,
        compte: c ? c.textContent.trim() : null,
        bouton: b ? b.textContent.trim() : null };
});
dire('la ligne porte l\'échéance', !!ligne.quand && /rendre/.test(ligne.quand),
    ligne.quand || 'rien dans .ec-devoir-quand');
dire('et le compte de ceux qui l\'ont rendu', !!ligne.compte, ligne.compte || 'rien');
// ET LE BOUTON CHANGE DE MOT : « à rendre pour… » devient « changer
// l'échéance ». Un bouton qui dit la même chose avant et après laisse croire
// que le clic n'a rien fait.
dire('le bouton dit maintenant qu\'il CHANGE la date',
    !!ligne.bouton && /changer/i.test(ligne.bouton), ligne.bouton || '');
if (photos) await s.photo('.ec-seances', 'tools/tmp/devoir-ligne.png');

// ── ET L'ÉLÈVE, LUI, LE VOIT SUR SA CARTE D'ACCUEIL ───────────────────────
console.log('\n\x1b[1mCHEZ L\'ÉLÈVE, SUR SA CARTE D\'ACCUEIL\x1b[0m');
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
eleve.on('dialog', async (d) => { ennuis.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });
await eleve.goto(
    `http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
await eleve.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

// L'ARDOISE SE SYNCHRONISE TOUTE SEULE : on attend son tour plutôt que de
// recharger — un rechargement mesurerait un chemin que l'élève n'emprunte pas.
// ── ON REGARDE CE QUI EST VISIBLE, PAS CE QUI EST DANS LA PAGE ──────────
//
// PREMIER JET : chercher « à rendre » dans `document.body.innerText`. Il
// répondait NON pendant que la carte d'accueil portait la date — parce que
// `.auj-carte` est bien dans le DOM en mode poste, mais INVISIBLE : ce n'est
// pas l'écran qu'on y voit. `innerText` avait raison, et ma question était
// mal posée. Ce que l'élève voit, c'est le bandeau de séance de `pathView`.
let vu = null;
for (let i = 0; i < 14 && !vu; i++) {
    await dormir(2000);
    vu = await eleve.evaluate(() => {
        const t = document.body.innerText || '';
        const i2 = t.toLowerCase().indexOf('à rendre');
        return i2 >= 0 ? t.slice(Math.max(0, i2 - 70), i2 + 70).replace(/\n/g, ' ') : null;
    }).catch(() => null);
}
dire('l\'élève voit « à rendre » sur l\'écran qu\'il a devant lui', !!vu,
    vu || 'rien de visible après 28 s');
// ET LA CARTE L'ANNONCE COMME UN DEVOIR, pas comme « ta séance du jour ».
const carte = await eleve.evaluate(() => {
    const t = document.querySelector('.auj-carte .auj-dit b');
    const s2 = document.querySelector('.auj-carte .auj-dit span');
    return { titre: t ? t.textContent.trim() : '', sous: s2 ? s2.textContent.trim() : '' };
});
dire('et la carte dit « devoir », pas « séance du jour »',
    /devoir/i.test(carte.titre), `« ${carte.titre} » · « ${carte.sous} »`);
if (photos) await s.photo('body', 'tools/tmp/devoir-eleve.png');

dire('aucune erreur de page côté professeur', s.erreurs.length === 0,
    s.erreurs.slice(0, 2).join(' | '));
dire('aucune fenêtre native', s.fenetresNatives.length === 0,
    s.fenetresNatives.slice(0, 2).join(' | '));
dire('aucune erreur de page côté élève', ennuis.length === 0, ennuis.slice(0, 2).join(' | '));

await eleve.close();
await s.fermer();
console.log('\n' + '─'.repeat(64));
console.log(rates ? `\n${rates} POINT(S) À REVOIR.`
    : '\nUNE DATE, UN CLIC, ET L\'ÉLÈVE LA VOIT EN ARRIVANT.');
process.exit(rates ? 1 : 0);
