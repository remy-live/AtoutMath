// LE MÊME COMPTE, DEUX ORDINATEURS — ET LA BIBLIOTHÈQUE QUI NE SUIT PAS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « le parcours que j'ai créé au collège sur mon compte, je ne l'ai pas
// sur mon mac chez moi !!!! »
//
// CE QUE CETTE SONDE MESURE, ET POURQUOI AUCUNE ÉPREUVE NE POUVAIT LE DIRE : un
// SECOND ORDINATEUR. `tools/boutEnBout.mjs` ouvre deux onglets, mais deux
// onglets partagent IndexedDB — le parcours y est déjà, et la synchronisation
// n'a rien à faire pour qu'on le voie. Il faut un CONTEXTE NEUF, c'est-à-dire
// un navigateur qui n'a jamais rien vu de ce compte, pour que la question se
// pose : la bibliothèque DESCEND-ELLE du serveur toute seule ?
//
// LE SOUPÇON, LU DANS LE CODE AVANT DE MESURER :
// `parcoursServeur.js` porte les deux sens. `monterLaBibliotheque()` (vers le
// serveur) est appelée au démarrage par `initParcoursServeur()` ET à chaque
// enregistrement par la veille. `ramenerLaBibliotheque()` (depuis le serveur)
// porte en commentaire « c'est ce qui fait qu'un professeur retrouve ses
// parcours sur un ordinateur qu'il n'a jamais utilisé » — et n'est appelée
// QU'À UN SEUL ENDROIT : `parcoursDeLaSeance(pathId)`, qui sert à compléter une
// séance déjà donnée. Personne ne l'appelle au démarrage.
//
// On le vérifie en l'exécutant, parce qu'un soupçon lu n'est pas une mesure.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

// ── LE POSTE DU COLLÈGE ─────────────────────────────────────────────────────
console.log('\n\x1b[1mLE POSTE DU COLLÈGE\x1b[0m');
await s.identifier();
await dormir(1200);

// ON ENREGISTRE PAR LA PORTE DU LOGICIEL. `state.saveTeacherPath` est ce
// qu'appelle l'atelier quand Rémy clique « Enregistrer » ; c'est elle qui
// déclenche `teacherPaths_updated`, donc la veille, donc la montée. Passer par
// `monterUnParcours` directement aurait mesuré le serveur en sautant
// précisément le maillon qu'on soupçonne.
const posé = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    // DEUX ÉTAPES, ET ON LES RECOMPTERA. Un parcours qui redescend avec son nom
    // mais sans ses étapes a l'air d'être arrivé ; il est vide.
    const p = makePath('Les priorités du jeudi', [
        makeStep('calc-add', {}, { stepId: 'a', nbQuestions: 6 }),
        makeStep('calc-prio', {}, { stepId: 'b', nbQuestions: 8 })
    ], politiquePerso());
    // LA SIGNATURE EST `(nom, parcours)`, et l'entrée rangée est une ENVELOPPE
    // `{ id, name, data, folderId, timestamp }` — pas le parcours. C'est tout
    // le nœud de l'affaire, et on le mesure plus bas.
    const entree = state.saveTeacherPath(p.name, p);
    return { id: entree.id, nom: entree.name, etapes: (p.steps || []).length,
             combien: (state.teacherPaths || []).length };
});
console.log(`   enregistré : « ${posé.nom} » (${posé.id}), ${posé.etapes} étapes`);
dire('il est dans la bibliothèque de ce poste', posé.combien >= 1, `${posé.combien} parcours`);

// LA VEILLE ATTEND DEUX SECONDES APRÈS LA DERNIÈRE RETOUCHE. On lui laisse le
// temps : une sonde plus pressée que le logiciel mesure sa propre impatience.
await dormir(4000);

const auServeur = await s.page.evaluate(async () => {
    const { auServeur: appel } = await import('./js/core/espaceProf.js');
    const r = await appel('/teacher/paths', { action: 'list' });
    return { erreur: r.erreur || '', noms: (r.paths || []).map(x => (x.data || {}).name || x.name) };
});
dire('IL EST MONTÉ AU SERVEUR TOUT SEUL',
    auServeur.noms.includes('Les priorités du jeudi'),
    auServeur.erreur || JSON.stringify(auServeur.noms));

// ── LE MAC DE LA MAISON ─────────────────────────────────────────────────────
//
// UN CONTEXTE NEUF, et c'est tout l'enjeu : pas d'IndexedDB, pas de
// `localStorage`, rien. Exactement ce que voit un ordinateur sur lequel on
// ouvre le site pour la première fois.
console.log('\n\x1b[1mLE MAC DE LA MAISON (navigateur neuf)\x1b[0m');
const maison = await s.nav.newContext({ viewport: { width: 1400, height: 950 } });
const mac = await maison.newPage();
const erreursMac = [];
mac.on('pageerror', (e) => erreursMac.push(String(e).slice(0, 160)));
mac.on('dialog', async (d) => { erreursMac.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });

await mac.goto(`http://127.0.0.1:${s.port}/index.html`);
await mac.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
// AVANT DE S'IDENTIFIER, IL N'A QUE CE QUE LE LOGICIEL SÈME TOUT SEUL.
//
// Ma première version exigeait ZÉRO parcours ici, et se trompait : « Parcours
// découverte » et « Tout sur papier » naissent sur chaque machine au premier
// démarrage (voir `js/core/parcoursSemes.js`). Ce qu'on vérifie vraiment, c'est
// qu'AUCUN parcours de Rémy n'est là — il n'a encore rien dit de qui il est.
const avantIdentification = await mac.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return (state.teacherPaths || []).map((p) => p.name || '?');
});
console.log(`   avant de s'identifier : ${JSON.stringify(avantIdentification)}`);
dire('aucun parcours du compte avant de s\'identifier',
    !avantIdentification.includes('Les priorités du jeudi'));

// IL S'IDENTIFIE COMME AU COLLÈGE — même compte, même mot de passe.
await mac.evaluate(async ([e, m]) => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    return await identifierProf(e, m);
}, [s.info.email || 'remy@essai.test', s.info.mdp || 'motdepassetreslong']);
await mac.reload();
await mac.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
// ON LAISSE LARGEMENT LE TEMPS AU DÉMARRAGE DE FAIRE CE QU'IL FAIT. Six
// secondes : si rien ne descend en six secondes, rien ne descendra.
await dormir(6000);

/** Combien d'étapes porte une entrée de bibliothèque, quelle que soit sa forme. */
const COMPTER = `(p) => {
    const c = p && p.data && typeof p.data === 'object' && !Array.isArray(p.data) ? p.data : p;
    return ((c && c.steps) || []).length;
}`;

const chezLui = await mac.evaluate(async (compterSource) => {
    const compter = eval(compterSource);
    const { state } = await import('./js/core/state.js');
    const { auServeur } = await import('./js/core/espaceProf.js');
    const r = await auServeur('/teacher/paths', { action: 'list' });
    return {
        local: (state.teacherPaths || []).map((p) => ({
            nom: p.name || (p.data || {}).name || '?', etapes: compter(p) })),
        serveur: (r.paths || []).map((x) => ({
            nom: (x.data || {}).name || x.name || '?', etapes: compter(x.data) }))
    };
}, COMPTER);
console.log(`   le serveur a   : ${JSON.stringify(chezLui.serveur)}`);
console.log(`   ce poste a     : ${JSON.stringify(chezLui.local)}`);
const auServeurOk = chezLui.serveur.find((p) => p.nom === 'Les priorités du jeudi');
dire('LE SERVEUR LE GARDE, AVEC SES ÉTAPES',
    !!auServeurOk && auServeurOk.etapes === 2,
    auServeurOk ? `${auServeurOk.etapes} étapes` : 'absent du serveur');
const local = chezLui.local.find((p) => p.nom === 'Les priorités du jeudi');
dire('ET IL EST DANS SA BIBLIOTHÈQUE, SANS RIEN CLIQUER', !!local,
    chezLui.local.length ? '' : 'bibliothèque VIDE');
dire('AVEC SES DEUX ÉTAPES', !!local && local.etapes === 2,
    local ? `${local.etapes} étape(s)` : '(rien à compter)');

// ET CE QUE DONNE LE RAPATRIEMENT QUAND ON L'APPELLE À LA MAIN : c'est le seul
// chemin qui existe aujourd'hui (`parcoursDeLaSeance`), et il faut savoir s'il
// marche, pour distinguer « jamais appelé » de « appelé et faux ».
const force = await mac.evaluate(async (compterSource) => {
    const compter = eval(compterSource);
    const { ramenerLaBibliotheque } = await import('./js/core/parcoursServeur.js');
    const r = await ramenerLaBibliotheque();
    const { state } = await import('./js/core/state.js');
    return { ramenes: r.ramenes, erreur: r.erreur,
             liste: (state.teacherPaths || []).map((p) => ({
                 nom: p.name || (p.data || {}).name || '?', etapes: compter(p) })) };
}, COMPTER);
console.log(`\n   \x1b[1mEN FORÇANT ramenerLaBibliotheque()\x1b[0m : ${force.ramenes} ramené(s) ${force.erreur || ''}`);
console.log(`   ${JSON.stringify(force.liste)}`);
const ramené = force.liste.find((p) => p.nom === 'Les priorités du jeudi');
dire('forcé, le rapatriement le ramène', !!ramené);
dire('ET AVEC SES ÉTAPES, PAS UNE COQUILLE VIDE',
    !!ramené && ramené.etapes === 2, ramené ? `${ramené.etapes} étape(s)` : '');

// ET CE QU'IL VOIT À L'ÉCRAN, puisque c'est la seule chose qui compte pour lui.
//
// LE BON ÉCRAN EST LE TIROIR DES PARCOURS, pas « Mes classes ». Ma première
// version ouvrait l'espace classes et concluait « pas à l'écran » : les classes
// ne listent pas la bibliothèque. C'est le huitième sélecteur inventé de ce
// chantier, et la règle du journal valait encore — on LIT la source avant
// d'écrire un sélecteur.
// ON LIT `textContent` DU PANNEAU, PAS `innerText` DU CORPS, et c'est une
// leçon payée deux fois ce soir : `innerText` ne rend que le texte VISIBLE. Le
// tiroir n'est pas déplié sur l'écran d'accueil, donc `document.body.innerText`
// ne contenait AUCUN nom de parcours — pas même « Parcours découverte », qui
// est là depuis le premier démarrage. La sonde annonçait « pas à l'écran » sur
// une liste parfaitement remplie.
// ON CLIQUE « PRÉPARER », PUIS L'ONGLET DES PARCOURS, comme lui.
//
// DEUX VERSIONS AVANT CELLE-CI MESURAIENT LE VIDE, et c'est le témoin qui l'a
// dit : appeler `montrerPanneau('parcours')` sans que l'écran « Préparer » soit
// monté ne remplit rien — même « Parcours découverte », présent depuis le
// premier démarrage, n'apparaissait pas. Un panneau qu'on n'a pas ouvert par la
// porte n'est pas un panneau vide, c'est un panneau pas encore construit.
await mac.click('#top-btn-preparer');
await dormir(1500);
const aLEcran = await mac.evaluate(async () => {
    const onglet = [...document.querySelectorAll('[data-panneau], .tiroir-onglet, #tiroir-parcours-onglet')]
        .find((b) => /parcours/i.test(b.dataset.panneau || b.textContent || ''));
    if (onglet) onglet.click();
    await new Promise((ok) => setTimeout(ok, 1500));
    const panneau = document.getElementById('tiroir-parcours');
    if (!panneau) return 'pas de panneau #tiroir-parcours';
    const texte = panneau.textContent || '';
    return {
        leSien: /Les priorités du jeudi/.test(texte),
        lesSemes: /Parcours découverte/.test(texte),
        debut: texte.replace(/\s+/g, ' ').trim().slice(0, 140)
    };
}).catch((e) => 'ERREUR: ' + e.message);
if (typeof aLEcran === 'object') console.log(`   le tiroir dit : ${aLEcran.debut}`);
if (typeof aLEcran === 'string') {
    dire('et il le LIT dans le tiroir des parcours', false, aLEcran);
} else {
    // LE TÉMOIN COMPTE AUTANT QUE LA MESURE : si « Parcours découverte » n'est
    // pas listé non plus, ce n'est pas le rapatriement qui a échoué, c'est la
    // sonde qui regarde au mauvais endroit.
    dire('le tiroir liste bien quelque chose (témoin)', aLEcran.lesSemes === true);
    dire('ET IL Y LIT SON PARCOURS DU COLLÈGE', aLEcran.leSien === true);
}

console.log(`\nerreurs de page : ${s.erreurs.length + erreursMac.length}`);
[...s.erreurs, ...erreursMac].slice(0, 5).forEach((e) => console.log('   ' + e));

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S) — un parcours ne suit pas son professeur.\x1b[0m`
    : '\n\x1b[32mLA BIBLIOTHÈQUE SUIT LE PROFESSEUR D\'UN POSTE À L\'AUTRE.\x1b[0m');
await maison.close();
await s.fermer();
process.exit(ratés ? 1 : 0);
