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
// RÉMY, en trois temps :
//   « si je modifie une séance dans les parcours, le parcours se modifie aussi
//     sur la séance en cours ? »
//   « et un élève qui a fait 5 exercices et je change le 6ème, il reçoit les
//     modifs ? »
//   « si je supprime un exercice vers la fin et que personne n'est arrivé, il
//     ne l'auront pas ? »
//
// LA RÈGLE, EN UNE PHRASE : ce qui se passe APRÈS la dernière étape que l'élève
// a faite le suit ; ce qui touche à ce qu'il a déjà fait, non.
//
// ON LA MESURE DANS L'ORDRE OÙ ELLE SE VIT EN CLASSE : on donne, l'élève
// travaille, et le professeur retouche pendant l'heure.
console.log('\n\x1b[1mQUESTION 2 — LE PROFESSEUR RETOUCHE PENDANT L\'HEURE\x1b[0m');

/** Ce que porte la séance rangée chez un élève. */
const seanceDe = (page) => page.evaluate(async () => {
    const { lireSeances } = await import('./js/ui/donnerSeance.js');
    const l = (await lireSeances()) || [];
    const m = l.find((x) => /Séance du mardi/.test(x.titre || ''));
    const steps = (m && m.path && m.path.steps) || [];
    return { etapes: steps.length, premiere: steps[0] ? steps[0].nbItems : 0,
        derniere: steps.length ? steps[steps.length - 1].nbItems : 0,
        exos: steps.map((x) => x.exerciseId).join(',') };
});

/**
 * Retoucher le parcours, le remonter, et faire resynchroniser l'élève — SANS
 * attendre les minuteries.
 *
 * ON NE MESURE PAS LA PATIENCE DE LA SONDE. Premier jet : on dormait quatorze
 * secondes et la retouche n'arrivait pas. Impossible de dire si le logiciel
 * refusait ou si la veille n'avait pas tourné — deux diagnostics opposés
 * derrière le même rouge. On appelle donc les deux fonctions nommément, et
 * l'on REGARDE LE SERVEUR entre les deux.
 */
const retoucher = async (f) => {
    await s.page.evaluate(async ([id, quoi]) => {
        const { state } = await import('./js/core/state.js');
        const { makeStep, normalizePath } = await import('./js/core/path.js');
        const { cheminDeLEntree } = await import('./js/core/entreeParcours.js');
        const { monterLaBibliotheque } = await import('./js/core/parcoursServeur.js');
        const entree = state.teacherPaths.find((x) => x.id === id);
        const parcours = normalizePath(cheminDeLEntree(entree) || entree, entree.name);
        if (quoi === 'ajouter') {
            parcours.steps.push(makeStep('calc-sub', {}, { stepId: 'd', nbItems: 9 }));
        }
        if (quoi === 'changer-la-derniere') {
            parcours.steps[parcours.steps.length - 1].nbItems = 3;
        }
        if (quoi === 'retirer-la-derniere') parcours.steps.pop();
        if (quoi === 'changer-la-premiere') parcours.steps[0].nbItems = 20;
        entree.data = parcours;
        entree.timestamp = Date.now();
        state.saveTeacherPaths();
        await monterLaBibliotheque();
    }, [donne.entreeId, f]);
    await dormir(1200);
    const auServeur = await s.page.evaluate(async ([id]) => {
        const { auServeur: appel } = await import('./js/core/espaceProf.js');
        const r = await appel('/teacher/paths', { action: 'list' });
        const ligne = (r.paths || []).find((x) => x.id === id);
        const d = ligne ? ligne.data : null;
        const dedans = d && d.data ? d.data : d;
        const steps = (dedans && dedans.steps) || [];
        return { etapes: steps.length,
            premiere: steps[0] ? steps[0].nbItems : 0,
            derniere: steps.length ? steps[steps.length - 1].nbItems : 0 };
    }, [donne.entreeId]);
    console.log(`   témoin — au serveur : ${auServeur.etapes} étapes `
        + `(1ʳᵉ : ${auServeur.premiere} q., dernière : ${auServeur.derniere} q.)`);
    await p.evaluate(async () => {
        const { syncNow } = await import('./js/core/sync.js');
        await syncNow({ silent: true });
    });
    // LA SYNCHRONISATION EST ASYNCHRONE JUSQU'À L'ÉCRITURE : `syncNow` rend la
    // main avant que `recevoirLesAssignations` ait fini d'écrire. Mesuré : à
    // 1,5 s la sonde lisait l'ancienne séance une fois sur deux, et le même
    // rouge désignait tantôt le logiciel, tantôt l'horloge.
    await dormir(3000);
    return auServeur;
};

console.log(`   au départ : ${JSON.stringify(await seanceDe(p))}`);

// ── (a) AJOUTER UNE ÉTAPE À LA FIN ─────────────────────────────────────────
console.log('\n   \x1b[1m(a) le professeur AJOUTE une étape à la fin\x1b[0m');
await retoucher('ajouter');
const apresAjout = await seanceDe(p);
console.log(`   chez l'élève : ${apresAjout.etapes} étapes (${apresAjout.exos})`);
dire('UNE ÉTAPE AJOUTÉE À LA FIN DESCEND CHEZ L\'ÉLÈVE', apresAjout.etapes === 4,
    `${apresAjout.etapes} étapes`);
dire('ET SON EXERCICE EN COURS N\'EST PAS ARRACHÉ',
    await p.evaluate(() => !!document.querySelector('#game-board .game-question, #game-board canvas')));

// ── L'ÉLÈVE TRAVAILLE : IL EN TERMINE DEUX ─────────────────────────────────
//
// Tout ce qui suit dépend de CE QU'IL A FAIT. Sans cette étape, on mesurerait
// une séance que personne n'a commencée, où toute retouche passe — ce qui est
// juste, et ne répond pas à la question de Rémy.
const faites = await p.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const a = state.studentPath;
    if (!a || !Array.isArray(a.steps)) return { sansParcours: true };
    for (const s of a.steps.slice(0, 2)) {
        state.markStudentPathStepCompleted(s.stepId, {
            runId: 'sonde', solved: 4, required: 3, questions: 4, passed: true
        });
    }
    return { faites: (state.studentPath.completed || []).length };
});
console.log(`\n   l'élève termine ${faites.faites} exercices`);
dire('TÉMOIN : l\'élève a bien commencé sa séance', faites.faites === 2,
    JSON.stringify(faites));

// ── (b) CHANGER UNE ÉTAPE QU'IL N'A PAS ATTEINTE ───────────────────────────
console.log('\n   \x1b[1m(b) le professeur CHANGE la dernière étape — personne n\'y est arrivé\x1b[0m');
await retoucher('changer-la-derniere');
const apresChangement = await seanceDe(p);
console.log(`   chez l'élève : la dernière fait ${apresChangement.derniere} questions`);
dire('IL REÇOIT LA RETOUCHE D\'UNE ÉTAPE QU\'IL N\'A JAMAIS VUE',
    apresChangement.derniere === 3, `${apresChangement.derniere} questions`);

// ── (c) LA RETIRER ─────────────────────────────────────────────────────────
console.log('\n   \x1b[1m(c) le professeur RETIRE la dernière étape\x1b[0m');
await retoucher('retirer-la-derniere');
const apresRetrait = await seanceDe(p);
console.log(`   chez l'élève : ${apresRetrait.etapes} étapes (${apresRetrait.exos})`);
dire('UNE ÉTAPE QUE PERSONNE N\'A ATTEINTE DISPARAÎT AUSSI',
    apresRetrait.etapes === 3, `${apresRetrait.etapes} étapes`);
dire('ET LES DEUX QU\'IL A FAITES SONT TOUJOURS LÀ, DANS L\'ORDRE',
    apresRetrait.exos.startsWith('calc-add,calc-prio'), apresRetrait.exos);

// ── (d) CHANGER UNE ÉTAPE QU'IL A DÉJÀ FAITE ───────────────────────────────
//
// ICI LA RÈGLE DIT NON, ET ELLE A RAISON : il a travaillé sur ce qu'il avait
// sous les yeux, et un bilan qui désigne un autre exercice ne veut plus rien
// dire.
console.log('\n   \x1b[1m(d) le professeur CHANGE la 1ʳᵉ étape — qu\'il a DÉJÀ faite\x1b[0m');
await retoucher('changer-la-premiere');
const apresInterdit = await seanceDe(p);
console.log(`   chez l'élève : la première fait ${apresInterdit.premiere} questions`);
dire('CE QU\'IL A DÉJÀ FAIT NE BOUGE PAS', apresInterdit.premiere === 4,
    `${apresInterdit.premiere} questions`);

// ── (e) ET LE CAMARADE QUI SE CONNECTE APRÈS ───────────────────────────────
//
// C'EST LA MESURE QUI COMPTE, et celle qui a fait écrire toute cette règle.
console.log('\n   \x1b[1m(e) un camarade se connecte APRÈS toutes les retouches\x1b[0m');
const autre = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => !/Emma/.test(x.prenom || ''));
    return e ? { login: e.login, code: e.code, prenom: e.prenom } : null;
}, [classeId]);
// SON PROPRE CONTEXTE DE NAVIGATION, ET C'EST INDISPENSABLE : un onglet de plus
// partage le stockage local, donc la session d'Emma. Premier jet : la page
// s'ouvrait DÉJÀ connectée, `#portail-login` n'existait pas, et la sonde est
// morte sur un délai d'attente en croyant mesurer un portail.
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
    + `1ʳᵉ : ${chezLAutre.premiere} q.`);
dire('LES DEUX ÉLÈVES ONT LE MÊME NOMBRE D\'ÉTAPES',
    chezLAutre.etapes === apresInterdit.etapes,
    `${apresInterdit.etapes} contre ${chezLAutre.etapes}`);
dire('ET LES MÊMES EXERCICES, DANS LE MÊME ORDRE',
    chezLAutre.exos === apresInterdit.exos,
    `${apresInterdit.exos} | ${chezLAutre.exos}`);

// ── LA DIVERGENCE QUI RESTE, ET POURQUOI ELLE EST VOULUE ───────────────────
const memeTravail = chezLAutre.premiere === apresInterdit.premiere;
if (memeTravail) {
    console.log('  \x1b[32m✓\x1b[0m la 1ʳᵉ étape est la même chez les deux.');
} else {
    console.log('  \x1b[33m⚠ ASYMÉTRIE VOULUE\x1b[0m — la 1ʳᵉ étape fait '
        + `${apresInterdit.premiere} questions chez celui qui l'a FAITE et `
        + `${chezLAutre.premiere} chez celui qui ne l'a pas encore faite.`);
    console.log('    C\'est la seule divergence qui reste, et elle est le prix de');
    console.log('    la règle : on ne réécrit pas le travail d\'un élève. Elle ne');
    console.log('    survient que si le professeur change une étape DÉJÀ FAITE —');
    console.log('    l\'atelier l\'en prévient sur le badge « Donné à… ».');
}

console.log(`\nerreurs de page : ${s.erreurs.length + erreursEleve.length}`);
[...s.erreurs, ...erreursEleve].slice(0, 5).forEach((e) => console.log('   ' + e));
if (s.erreurs.length || erreursEleve.length || s.fenetresNatives.length) ratés++;

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S)\x1b[0m`
    : '\n\x1b[32mLES DEUX RÉPONSES SONT MESURÉES.\x1b[0m');
await p.close();
await s.fermer();
process.exit(ratés ? 1 : 0);
