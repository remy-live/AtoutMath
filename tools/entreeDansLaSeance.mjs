// L'ÉLÈVE OUVRE SA SÉANCE — combien d'écrans avant la première question ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « quand l'élève ouvre sa session, et qu'on a imposé une séance, il y a
// deux mouvements, le premier clic sur un écran joli qui prend presque tout
// l'espace et après quand on clique on arrive sur le parcours, tu comprends ? »
//
// ── CE QUE SEULE CETTE SONDE PEUT DIRE ─────────────────────────────────────
//
// Le défaut n'est dans AUCUN des deux écrans : chacun, pris seul, est juste.
// Il est dans leur SUCCESSION — et une succession ne se lit pas dans le code,
// parce qu'elle est écrite à deux endroits éloignés (`ui/pathView.js` dessine
// l'accueil, `core/runner.js` ouvre sur la carte). On ne peut la voir qu'en
// comptant les clics depuis l'écran d'accueil jusqu'à la première question.
//
// ET C'EST CE QU'ON COMPTE, EXACTEMENT : combien de clics, et ce qu'on a sous
// les yeux après chacun. Un chiffre, pas une impression.
//
// ── ET LE MOT DU PROFESSEUR, AU PASSAGE ────────────────────────────────────
//
// Rémy, sur le mot calé entre deux exercices : « je le voyais plus comme une
// popup et il faut que l'élève appuie sur un bouton pour poursuivre ». On
// vérifie donc qu'il ARRÊTE l'élève — c'est tout l'objet d'un bouton — et que
// l'exercice est DÉJÀ MONTÉ derrière, ce qui est la différence entre une
// fenêtre et un écran de plus à traverser.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

await s.identifier();
await dormir(1500);

// ── LE PROFESSEUR DONNE UNE SÉANCE QUI COMMENCE PAR UN MOT ──────────────────
//
// Comme la sienne : un mot d'accueil, puis des exercices.
console.log('\n\x1b[1mLE PROFESSEUR DONNE UNE SÉANCE\x1b[0m');
const classeId = await s.page.evaluate(async () => {
    const { mesClasses } = await import('./js/core/espaceProf.js');
    const l = await mesClasses();
    const c = (Array.isArray(l) ? l : []).find((x) => /6e B/.test(x.name || ''));
    return c ? c.id : null;
});

const prepare = await s.page.evaluate(async ([cid]) => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep, makeMessage } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const p = makePath('La séance de Rémy', [
        makeMessage({ titre: 'Avant de commencer',
            texte: 'Bonjour et bienvenue à cette série d\'exercices de *révisions*.' },
        { stepId: 'mot' }),
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 5 }),
        makeStep('calc-prio', {}, { stepId: 'b', nbItems: 6 })
    ], politiquePerso());
    const entree = state.saveTeacherPath(p.name, p);
    const r = await donnerAuServeur(entree, cid);
    return { ok: !!r.ok, erreur: r.erreur || '' };
}, [classeId]);
dire('la séance part au serveur', prepare.ok, prepare.erreur);
await dormir(2500);

// ── L'ÉLÈVE OUVRE SON POSTE ─────────────────────────────────────────────────
console.log('\n\x1b[1mL\'ÉLÈVE OUVRE SON POSTE\x1b[0m');
const billet = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => /Emma/.test(x.prenom || ''));
    return e ? `${e.login}/${e.code}` : null;
}, [classeId]);

const p = await s.ctx.newPage();
const erreursEleve = [];
p.on('pageerror', (e) => erreursEleve.push(String(e).slice(0, 160)));
p.on('dialog', async (d) => { erreursEleve.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });
await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(5000);

/** Ce que l'élève a sous les yeux, en un mot. */
const ecran = () => p.evaluate(() => {
    const visible = (sel) => {
        const el = document.querySelector(sel);
        return !!(el && el.getBoundingClientRect().width > 0 && !el.hidden);
    };
    return {
        accueil: visible('.path-ouvrir-seance'),
        // LA CARTE DU MENEUR, et non celle de l'accueil : `.run-carte` n'existe
        // que dans la couche de jeu. Crochet LU dans `core/runner.js`
        // (`ecran.className = 'run-carte'`), pas deviné.
        carteDuMeneur: visible('.run-carte'),
        motEnFenetre: visible('.run-mot-popup'),
        ecranPleinDuMot: visible('.run-mot .run-mot-texte'),
        // LE PLATEAU PORTE-T-IL UNE QUESTION ? `.game-question` est le crochet
        // réel du plateau — quatre inventés avant lui dans ce chantier.
        question: visible('#game-board .game-question') || visible('#game-board canvas'),
        bouton: (document.querySelector('.path-ouvrir-seance, .run-carte-suite, '
            + '#btn-run-mot, [data-run-suite]') || {}).textContent || ''
    };
});

const depart = await ecran();
dire('l\'élève arrive sur l\'accueil, avec son bouton',
    depart.accueil && !depart.carteDuMeneur, JSON.stringify(depart));

// ── ON COMPTE LES CLICS JUSQU'À LA PREMIÈRE QUESTION ────────────────────────
//
// C'est LA mesure. On clique le bouton le plus évident de l'écran, on regarde,
// et l'on recommence — exactement ce que fait un élève de sixième.
console.log('\n\x1b[1mCOMBIEN DE CLICS JUSQU\'À LA PREMIÈRE QUESTION\x1b[0m');
await p.click('.path-ouvrir-seance');
let clics = 1;
await dormir(3000);
let vu = await ecran();
console.log(`   clic ${clics} → ${JSON.stringify(vu)}`);

dire('UN SEUL CLIC, ET L\'ON N\'EST PLUS SUR LA CARTE',
    !vu.carteDuMeneur, vu.carteDuMeneur ? 'la carte du meneur s\'est remontrée' : 'pas de carte');

// LE MOT DU PROFESSEUR DOIT ARRÊTER L'ÉLÈVE, et l'exercice être déjà derrière.
dire('LE MOT ARRIVE EN FENÊTRE, ET NON SUR UN ÉCRAN À LUI SEUL',
    vu.motEnFenetre && !vu.ecranPleinDuMot,
    vu.motEnFenetre ? 'fenêtre' : (vu.ecranPleinDuMot ? 'écran plein' : '(rien)'));
dire('TÉMOIN : L\'EXERCICE EST DÉJÀ MONTÉ DERRIÈRE LA FENÊTRE', vu.question,
    vu.question ? 'une question est là' : 'le plateau est vide');

const bouton = await p.evaluate(() =>
    (document.getElementById('btn-run-mot') || {}).textContent || '');
dire('et il faut appuyer sur un bouton pour poursuivre',
    bouton.trim() === 'J\'ai compris', bouton.trim() || '(aucun bouton)');

// LE FOCUS EST SUR LE BOUTON : au clavier, « Entrée » doit suffire.
const auFocus = await p.evaluate(() => (document.activeElement || {}).id || '');
dire('le curseur est posé sur le bouton (« Entrée » suffit)',
    auFocus === 'btn-run-mot', auFocus || '(ailleurs)');

await p.click('#btn-run-mot');
clics++;
await dormir(1200);
vu = await ecran();
console.log(`   clic ${clics} → ${JSON.stringify(vu)}`);
dire('EN FERMANT LA FENÊTRE, ON EST SUR L\'EXERCICE — pas sur un écran de plus',
    vu.question && !vu.motEnFenetre && !vu.carteDuMeneur, JSON.stringify(vu));
dire(`DEUX CLICS EN TOUT : « Commencer ma séance », puis « J'ai compris »`,
    clics === 2, `${clics} clic(s)`);

// ── LA CARTE REVIENT ENTRE LES ÉTAPES, ET C'EST VOULU ───────────────────────
//
// TÉMOIN DE LA CORRECTION PRÉCÉDENTE. Si l'on avait supprimé la carte tout
// court, cette sonde serait verte et le parcours aurait perdu le seul endroit
// d'où l'on prend une étape facultative ou un jeu gagné.
// ── L'AUTRE ENTRÉE : ON CLIQUE UNE ÉTAPE SUR LA CARTE DE « MON PARCOURS » ───
//
// C'EST LE TROU QUI A LAISSÉ PASSER LE DÉFAUT UNE SECONDE FOIS.
//
// Cette sonde ne mesurait QUE le bouton « Commencer ma séance ». Or l'élève qui
// REPREND une séance commencée — c'est-à-dire la plupart du temps — n'appuie pas
// sur ce bouton : il clique une étape sur la carte de « Mon Parcours », ou le
// bouton « Jouer : … » posé dessous. Ces deux chemins-là passaient par
// `launchAssigned`, qui ne disait pas au meneur qu'on venait de la carte — et le
// meneur la redessinait.
//
// RÉMY : « il y a toujours l'écran d'accueil avec le monde puis on clique et on
// va sur le monde, il y a tjs deux étapes ».
console.log('\n\x1b[1mET SI L\'ON CLIQUE UNE ÉTAPE SUR LA CARTE DE « MON PARCOURS »\x1b[0m');
const parLaCarte = await p.evaluate(async () => {
    // On quitte la séance en cours et l'on revient à « Mon Parcours », comme
    // l'élève qui ferme et rouvre.
    const { state } = await import('./js/core/state.js');
    const run = state.activeSequenceRunner;
    if (run) { try { run.exit(); } catch (e) { /* déjà sorti */ } }
    await new Promise((ok) => setTimeout(ok, 900));
    // LE NOM EST LU DANS LA SOURCE : `renderStudentPathView`, et non le
    // `renderPathView` que j'allais inventer — un nom faux rend `undefined`,
    // c'est-à-dire la même réponse qu'un logiciel cassé.
    const { renderStudentPathView } = await import('./js/ui/pathView.js');
    renderStudentPathView();
    await new Promise((ok) => setTimeout(ok, 900));
    // LE BOUTON « Jouer : … » DE LA CARTE. Crochet LU dans `ui/pathView.js`
    // (`btn.className = 'btn-toggle active world-map-play'`), pas deviné.
    const jouer = document.querySelector('.world-map-play');
    if (!jouer) return { raté: 'pas de bouton « Jouer » sur la carte de Mon Parcours' };
    jouer.click();
    await new Promise((ok) => setTimeout(ok, 1800));
    return {
        raté: null,
        carteDuMeneur: !!document.querySelector('.run-carte'),
        question: !!(document.querySelector('#game-board .game-question')
            || document.querySelector('#game-board canvas'))
    };
});
if (parLaCarte.raté) {
    dire('on peut partir de la carte de Mon Parcours', false, parLaCarte.raté);
} else {
    dire('ON NE REMONTRE PAS LA CARTE : elle était déjà sous les yeux',
        !parLaCarte.carteDuMeneur,
        parLaCarte.carteDuMeneur ? 'le monde s\'affiche DEUX fois' : 'une seule fois');
    dire('et l\'on travaille tout de suite', parLaCarte.question,
        JSON.stringify(parLaCarte));
}

console.log('\n\x1b[1mLA CARTE REVIENT ENTRE LES ÉTAPES\x1b[0m');
const apresUneEtape = await p.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const run = state.activeSequenceRunner || window.__atoutmathRunner;
    if (!run) return { pasDeMeneur: true };
    await run.showPathMap();
    await new Promise((ok) => setTimeout(ok, 800));
    return { carte: !!document.querySelector('.run-carte') };
});
dire('TÉMOIN : la carte entre les étapes existe toujours',
    apresUneEtape.carte === true || apresUneEtape.pasDeMeneur,
    JSON.stringify(apresUneEtape));

console.log(`\nerreurs de page : ${s.erreurs.length + erreursEleve.length}`);
[...s.erreurs, ...erreursEleve].slice(0, 5).forEach((e) => console.log('   ' + e));
if (s.erreurs.length || erreursEleve.length || s.fenetresNatives.length) ratés++;

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S)\x1b[0m`
    : '\n\x1b[32mUN CLIC POUR ENTRER, UN POUR LE MOT, ET L\'ON TRAVAILLE.\x1b[0m');
await p.close();
await s.fermer();
process.exit(ratés ? 1 : 0);
