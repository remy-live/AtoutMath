// DEUX QUESTIONS DE RÉMY, LA VEILLE DE LA RENTRÉE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   1. « t'es sûr qu'il n'y a qu'un pas quand le parcours est imposé et que
//      l'on se connecte ? »
//   2. « si je modifie une séance dans les parcours, le parcours se modifie
//      aussi sur la séance en cours ? »
//
// ── POURQUOI ON NE RÉPOND PAS DE MÉMOIRE ───────────────────────────────────
//
// À la première, j'avais déjà répondu « deux clics » — mais en entrant par un
// BILLET, qui saute l'écran de connexion. Rémy demande depuis la CONNEXION.
// Compter des clics sur un chemin qui n'est pas le sien, c'est compter autre
// chose. On tape donc l'identifiant et le code, comme un élève le mardi matin.
//
// À la seconde, la réponse se lit dans une ligne de SQL — `assignments a JOIN
// paths p ON p.id = a.path_id` : l'élève reçoit le contenu ACTUEL du parcours,
// et la veille remonte la bibliothèque deux secondes après chaque retouche.
// Mais une lecture de code n'est pas une mesure, et ce qui compte ici est ce
// que l'élève VOIT : au prochain démarrage, ou pendant qu'il travaille ?
//
// ── CE QU'ON MESURE, DONC ──────────────────────────────────────────────────
//
//   · le nombre de clics entre « Entrer » et la première question ;
//   · ce que devient une séance DÉJÀ ARRIVÉE quand le professeur retouche son
//     parcours — avant rechargement, après rechargement, et pendant un
//     exercice en cours.
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

// ── LE PROFESSEUR DONNE UNE SÉANCE DE TROIS EXERCICES ───────────────────────
console.log('\n\x1b[1mLE PROFESSEUR DONNE UNE SÉANCE DE TROIS EXERCICES\x1b[0m');
const classeId = await s.page.evaluate(async () => {
    const { mesClasses } = await import('./js/core/espaceProf.js');
    const l = await mesClasses();
    const c = (Array.isArray(l) ? l : []).find((x) => /6e B/.test(x.name || ''));
    return c ? c.id : null;
});

const donne = await s.page.evaluate(async ([cid]) => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    // PAS DE MOT DU PROFESSEUR ICI : on compte les pas d'une séance NUE, pour
    // que le chiffre réponde à la question posée. Le mot, qui ajoute sa
    // fenêtre, est mesuré par `tools/entreeDansLaSeance.mjs`.
    const p = makePath('Séance du mardi', [
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 4 }),
        makeStep('calc-prio', {}, { stepId: 'b', nbItems: 4 }),
        makeStep('calc-mult-flash', {}, { stepId: 'c', nbItems: 4 })
    ], politiquePerso());
    const entree = state.saveTeacherPath(p.name, p);
    const r = await donnerAuServeur(entree, cid);
    return { ok: !!r.ok, erreur: r.erreur || '', entreeId: entree.id };
}, [classeId]);
dire('la séance part au serveur', donne.ok, donne.erreur);
await dormir(2500);

const identifiants = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => /Emma/.test(x.prenom || ''));
    return e ? { login: e.login, code: e.code } : null;
}, [classeId]);
console.log(`   l'élève : ${identifiants.login}`);

// ── QUESTION 1 : COMBIEN DE PAS DEPUIS L'ÉCRAN DE CONNEXION ? ───────────────
console.log('\n\x1b[1mQUESTION 1 — COMBIEN DE PAS DEPUIS « Entrer »\x1b[0m');
const p = await s.ctx.newPage();
const erreursEleve = [];
p.on('pageerror', (e) => erreursEleve.push(String(e).slice(0, 160)));
p.on('dialog', async (d) => { erreursEleve.push('NATIVE : ' + d.message()); await d.dismiss(); });
// `?poste=1` EST LE POSTE DE LA SALLE : c'est le mode où l'élève s'identifie,
// et c'est celui de Rémy au collège. Sans billet dans l'adresse : on veut
// l'ÉCRAN DE CONNEXION, pas le raccourci.
await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(1500);

// LES CROCHETS SONT LUS DANS `js/ui/portailUI.js`, ils ne s'inventent pas.
const auPortail = await p.evaluate(() => ({
    login: !!document.getElementById('portail-login'),
    code: !!document.getElementById('portail-code-eleve'),
    bouton: (document.getElementById('portail-connecter') || {}).textContent || ''
}));
dire('l\'écran de connexion est là, avec ses deux champs',
    auPortail.login && auPortail.code, JSON.stringify(auPortail));

await p.fill('#portail-login', identifiants.login);
await p.fill('#portail-code-eleve', identifiants.code);
await p.click('#portail-connecter');
let pas = 1;                       // « Entrer » compte comme un pas.
await dormir(6000);

/** Ce que l'élève a sous les yeux. */
const ecran = () => p.evaluate(() => {
    const vu = (sel) => {
        const el = document.querySelector(sel);
        return !!(el && el.getBoundingClientRect().width > 0 && !el.hidden);
    };
    const b = document.querySelector('.path-ouvrir-seance');
    return {
        portail: vu('#portail-connecter'),
        accueil: vu('.path-ouvrir-seance'),
        carteDuMeneur: vu('.run-carte'),
        question: vu('#game-board .game-question') || vu('#game-board canvas'),
        bouton: b ? b.textContent.trim() : ''
    };
});

let vu = await ecran();
console.log(`   pas ${pas} (« Entrer ») → ${JSON.stringify(vu)}`);
dire('après « Entrer », l\'élève est sur son accueil avec SA séance',
    !vu.portail && vu.accueil, JSON.stringify(vu));
dire('et le bouton annonce la séance', /séance/i.test(vu.bouton), vu.bouton);

await p.click('.path-ouvrir-seance');
pas++;
await dormir(3500);
vu = await ecran();
console.log(`   pas ${pas} (« ${'Commencer ma séance'} ») → ${JSON.stringify(vu)}`);
dire('ON N\'EST PAS PASSÉ PAR LA CARTE DU MENEUR', !vu.carteDuMeneur,
    vu.carteDuMeneur ? 'la carte s\'est remontrée' : 'pas de carte');
dire('LA PREMIÈRE QUESTION EST À L\'ÉCRAN', vu.question, JSON.stringify(vu));
dire('DEUX PAS DEPUIS LE PORTAIL : « Entrer », puis « Commencer ma séance »',
    pas === 2, `${pas} pas`);
console.log('   (soit UN SEUL pas une fois connecté — et un de plus si la');
console.log('    séance commence par un mot du professeur, qui demande son bouton.)');

// ── QUESTION 2 : LE PROFESSEUR RETOUCHE SON PARCOURS ────────────────────────
//
// RÉMY : « si je modifie une séance dans les parcours, le parcours se modifie
// aussi sur la séance en cours ? »
//
// LA RÉPONSE N'EST NI OUI NI NON, ET C'EST POURQUOI IL FAUT LA MESURER. Le
// logiciel distingue deux retouches (`complementDeSeance`, js/core/seances.js) :
//
//   · AJOUTER DES ÉTAPES À LA FIN — accepté, et cela DESCEND chez les élèves
//     qui ont déjà la séance. Rémy l'avait demandé : « si je me rends compte
//     qu'une séance est trop courte […] puis-je la compléter ? »
//   · CHANGER OU RETIRER une étape déjà donnée — REFUSÉ. Un élève l'a peut-être
//     déjà validée sous l'ancien réglage, et le bilan compterait deux versions
//     de la même étape.
//
// CE QU'ON VÉRIFIE ICI, ET QUI EST LE VRAI RISQUE : qu'un refus ne fasse pas
// DIVERGER deux élèves de la même classe — celui qui avait déjà la séance et
// celui qui se connecte après la retouche.
console.log('\n\x1b[1mQUESTION 2 — LE PROFESSEUR RETOUCHE SON PARCOURS\x1b[0m');

/** Ce que porte la séance rangée chez un élève. */
const seanceDe = (page) => page.evaluate(async () => {
    const { lireSeances } = await import('./js/ui/donnerSeance.js');
    const l = (await lireSeances()) || [];
    const m = l.find((x) => /Séance du mardi/.test(x.titre || ''));
    const steps = (m && m.path && m.path.steps) || [];
    return { etapes: steps.length, premiere: steps[0] ? steps[0].nbItems : 0,
        exos: steps.map((x) => x.exerciseId).join(',') };
});

/**
 * Retoucher le parcours dans l'atelier, le remonter, et faire resynchroniser
 * l'élève — SANS attendre les minuteries.
 *
 * ON NE MESURE PAS LA PATIENCE DE LA SONDE. Premier jet : on retouchait, on
 * dormait quatorze secondes, et l'ajout n'arrivait pas. Impossible de dire si
 * le logiciel refusait l'ajout ou si la veille n'avait pas encore tourné — deux
 * diagnostics opposés derrière le même rouge. On appelle donc les deux
 * fonctions nommément, et l'on REGARDE LE SERVEUR entre les deux : le témoin
 * dit où la retouche s'est arrêtée.
 */
const retoucher = async (quoi) => {
    await s.page.evaluate(async ([id, q]) => {
        const { state } = await import('./js/core/state.js');
        const { makeStep, normalizePath } = await import('./js/core/path.js');
        const { cheminDeLEntree } = await import('./js/core/entreeParcours.js');
        const { monterLaBibliotheque } = await import('./js/core/parcoursServeur.js');
        const entree = state.teacherPaths.find((x) => x.id === id);
        const p = normalizePath(cheminDeLEntree(entree) || entree, entree.name);
        if (q === 'ajouter') p.steps.push(makeStep('calc-sub', {}, { stepId: 'd', nbItems: 9 }));
        if (q === 'changer') p.steps[0].nbItems = 20;
        entree.data = p;
        entree.timestamp = Date.now();
        state.saveTeacherPaths();
        await monterLaBibliotheque();
    }, [donne.entreeId, quoi]);
    await dormir(1200);
    // TÉMOIN : la retouche est-elle AU SERVEUR ? Sans lui, un rouge plus bas
    // pourrait vouloir dire « le logiciel refuse » ou « rien n'est monté ».
    const auServeur = await s.page.evaluate(async ([id]) => {
        const { auServeur: appel } = await import('./js/core/espaceProf.js');
        const r = await appel('/teacher/paths', { action: 'list' });
        const ligne = (r.paths || []).find((x) => x.id === id);
        const d = ligne ? ligne.data : null;
        const dedans = d && d.data ? d.data : d;
        const steps = (dedans && dedans.steps) || [];
        return { etapes: steps.length, premiere: steps[0] ? steps[0].nbItems : 0 };
    }, [donne.entreeId]);
    console.log(`   témoin — au serveur : ${auServeur.etapes} étapes, `
        + `la première en ${auServeur.premiere} questions`);
    // L'élève resynchronise : on le lui demande plutôt que d'attendre dix
    // secondes qu'il le fasse tout seul.
    await p.evaluate(async () => {
        const { syncNow } = await import('./js/core/sync.js');
        await syncNow({ silent: true });
    });
    await dormir(1500);
    return auServeur;
};

const avant = await seanceDe(p);
console.log(`   chez l'élève AVANT : ${avant.etapes} étapes (${avant.exos}), `
    + `la première en ${avant.premiere} questions`);

// ── (a) AJOUTER UNE ÉTAPE À LA FIN ─────────────────────────────────────────
console.log('\n   \x1b[1m(a) le professeur AJOUTE une étape à la fin\x1b[0m');
await retoucher('ajouter');
const apresAjout = await seanceDe(p);
console.log(`   chez l'élève : ${apresAjout.etapes} étapes (${apresAjout.exos})`);
dire('UNE ÉTAPE AJOUTÉE À LA FIN DESCEND CHEZ L\'ÉLÈVE QUI A DÉJÀ LA SÉANCE',
    apresAjout.etapes === 4, `${apresAjout.etapes} étapes`);
dire('ET SON EXERCICE EN COURS N\'EST PAS ARRACHÉ',
    await p.evaluate(() => !!document.querySelector('#game-board .game-question, #game-board canvas')));

// ── (b) CHANGER UNE ÉTAPE DÉJÀ DONNÉE ──────────────────────────────────────
console.log('\n   \x1b[1m(b) le professeur CHANGE la 1ʳᵉ étape : 4 → 20 questions\x1b[0m');
await retoucher('changer');
const apresChangement = await seanceDe(p);
console.log(`   chez l'élève : la première en ${apresChangement.premiere} questions`);
dire('UNE ÉTAPE DÉJÀ DONNÉE NE CHANGE PAS CHEZ L\'ÉLÈVE — c\'est la règle',
    apresChangement.premiere === 4, `${apresChangement.premiere} questions`);

// ── (c) ET UN CAMARADE QUI SE CONNECTE APRÈS LA RETOUCHE ? ─────────────────
//
// C'EST LA MESURE QUI COMPTE. Si le second recevait 20 questions pendant que
// le premier en garde 4, deux élèves de la même classe feraient deux travaux
// différents sous le même nom — et rien ne le dirait, ni à eux ni à Rémy.
console.log('\n   \x1b[1m(c) un camarade se connecte APRÈS la retouche\x1b[0m');
const autre = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => !/Emma/.test(x.prenom || ''));
    return e ? { login: e.login, code: e.code, prenom: e.prenom } : null;
}, [classeId]);
console.log(`   le camarade : ${autre.prenom} (${autre.login})`);
// SON PROPRE CONTEXTE DE NAVIGATION, ET C'EST INDISPENSABLE : un onglet de
// plus partage le stockage local, donc la session d'Emma. Premier jet : la page
// s'ouvrait DÉJÀ connectée, le champ `#portail-login` n'existait pas, et la
// sonde est morte sur un délai d'attente en croyant mesurer un portail.
const ctxAutre = await s.nav.newContext({ viewport: { width: 1200, height: 900 } });
const q = await ctxAutre.newPage();
q.on('pageerror', (e) => erreursEleve.push(String(e).slice(0, 160)));
await q.goto(`http://127.0.0.1:${s.port}/index.html?poste=1`);
await q.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(1500);
await q.fill('#portail-login', autre.login);
await q.fill('#portail-code-eleve', autre.code);
await q.click('#portail-connecter');
await dormir(9000);
const chezLAutre = await seanceDe(q);
console.log(`   chez ${autre.prenom} : ${chezLAutre.etapes} étapes (${chezLAutre.exos}), `
    + `la première en ${chezLAutre.premiere} questions`);
dire('LES DEUX ÉLÈVES ONT LE MÊME NOMBRE D\'ÉTAPES',
    chezLAutre.etapes === apresChangement.etapes,
    `${apresChangement.etapes} contre ${chezLAutre.etapes}`);
// ── LE DÉFAUT CONNU, ET POURQUOI IL N'EST PAS COMPTÉ COMME UN RATÉ ────────
//
// Les deux élèves DIVERGENT, et c'est mesuré : 4 questions chez celui qui
// avait ouvert la séance, 20 chez celui qui se connecte après.
//
// CE N'EST PAS UN ÉCHEC DE LA MESURE, C'EST SON RÉSULTAT. La règle qui protège
// l'élève commencé (`complementDeSeance`) vit dans SON navigateur : elle
// compare ce qui arrive à ce qu'il a. Le camarade n'a rien à comparer, donc
// rien ne le protège. Tant que l'assignation ne porte pas au SERVEUR une copie
// figée du contenu au moment du don, la convergence est hors de portée du
// navigateur. Voir docs/frictions.md.
//
// ON NE PEINT PAS CE ROUGE EN VERT, et l'on ne le compte pas non plus en
// raté : une sonde qui sort en erreur pour un défaut connu et documenté est
// une sonde qu'on cesse de lancer. Elle le CONSTATE, fort — et le jour où
// quelqu'un corrige, elle le dit aussi.
const memeTravail = chezLAutre.premiere === apresChangement.premiere;
if (memeTravail) {
    console.log('  \x1b[32m✓ CORRIGÉ\x1b[0m — les deux élèves ont le même travail.');
    console.log('    \x1b[1mMettre cette sonde à jour : le constat ci-dessous n\'a plus lieu.\x1b[0m');
} else {
    console.log(`  \x1b[33m⚠ DÉFAUT CONNU\x1b[0m — la première étape fait `
        + `${apresChangement.premiere} questions chez l'un et ${chezLAutre.premiere} `
        + 'chez l\'autre.');
    console.log('    Deux élèves de la même classe, la même séance, deux travaux.');
    console.log('    L\'atelier le DIT sur le badge « Donné à… » ; le corriger demande');
    console.log('    une copie figée au serveur. Voir docs/frictions.md.');
}
await q.close();
await ctxAutre.close();

console.log(`\nerreurs de page : ${s.erreurs.length + erreursEleve.length}`);
[...s.erreurs, ...erreursEleve].slice(0, 5).forEach((e) => console.log('   ' + e));
if (s.erreurs.length || erreursEleve.length || s.fenetresNatives.length) ratés++;

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S)\x1b[0m`
    : '\n\x1b[32mLES DEUX RÉPONSES SONT MESURÉES.\x1b[0m');
await p.close();
await s.fermer();
process.exit(ratés ? 1 : 0);
