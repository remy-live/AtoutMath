// UNE SÉANCE DONNÉE ARRIVE-T-ELLE AVEC SES EXERCICES ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui : « Relatifs — 4C · 0 exercice à faire », sur une
// séance qui en porte seize. Et : « pourquoi la séance ne se lance pas
// directement avec le bon nombre d'exercices et la carte du monde ».
//
// CE QUE SEULE CETTE SONDE PEUT DIRE. Le parcours est juste au serveur, le nom
// arrive, la classe arrive — tout a l'air de marcher. Ce qui manque est le
// CONTENU, et il ne manque que sur le chemin de l'élève : celui que ni
// `npm test` ni `testApi.php` n'empruntent, puisqu'il faut un professeur qui
// prépare, un serveur qui range, et un élève qui ouvre son poste.
//
// LE DÉFAUT, EN UNE PHRASE : ce que le serveur range dans `paths.data` n'est
// pas toujours un parcours. `monterLaBibliotheque` y envoie l'ENVELOPPE de
// « Préparer », où le parcours est un étage plus bas — et `normalizePath` sur
// cette forme rend ZÉRO étape.
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

// ── LE PROFESSEUR PRÉPARE, PAR LA PORTE DE L'ATELIER ────────────────────────
console.log('\n\x1b[1mLE PROFESSEUR PRÉPARE UNE SÉANCE DE TROIS EXERCICES\x1b[0m');
const classeId = await s.page.evaluate(async () => {
    const { mesClasses } = await import('./js/core/espaceProf.js');
    const l = await mesClasses();
    const c = (Array.isArray(l) ? l : []).find((x) => /6e B/.test(x.name || ''));
    return c ? c.id : null;
});

// ON ENREGISTRE PAR LA PORTE DE « PRÉPARER » — `saveTeacherPath`, qui range une
// ENVELOPPE. C'est tout l'objet de la mesure : passer par `makePath` seul
// contournerait précisément la forme qui casse.
const prepare = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const p = makePath('La séance de Rémy', [
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 5 }),
        makeStep('calc-prio', {}, { stepId: 'b', nbItems: 6 }),
        makeStep('calc-mult-flash', {}, { stepId: 'c', nbItems: 7 })
    ], politiquePerso());
    const entree = state.saveTeacherPath(p.name, p);
    return { id: entree.id, etapes: p.steps.length };
});
console.log(`   enregistré : ${prepare.etapes} exercices (entrée ${prepare.id})`);
// La veille remonte la bibliothèque deux secondes après la dernière retouche.
await dormir(4000);

// ── IL LA DONNE À LA CLASSE ─────────────────────────────────────────────────
const donne = await s.page.evaluate(async ([cid, pid]) => {
    const { state } = await import('./js/core/state.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const entree = state.teacherPaths.find((p) => p.id === pid);
    const r = await donnerAuServeur(entree, cid);
    return { erreur: r.erreur || '', ok: !!r.ok };
}, [classeId, prepare.id]);
dire('la séance part au serveur', donne.ok, donne.erreur);

// CE QUE LE SERVEUR GARDE : on veut un parcours avec ses étapes, pas une
// enveloppe.
const auServeur = await s.page.evaluate(async ([pid]) => {
    const { auServeur: appel } = await import('./js/core/espaceProf.js');
    const r = await appel('/teacher/paths', { action: 'list' });
    const ligne = (r.paths || []).find((x) => x.id === pid);
    const d = ligne ? ligne.data : null;
    return {
        trouve: !!ligne,
        etapesAuPremierNiveau: ((d && d.steps) || []).length,
        etapesUnEtagePlusBas: ((d && d.data && d.data.steps) || []).length
    };
}, [prepare.id]);
console.log(`   au serveur : ${auServeur.etapesAuPremierNiveau} étape(s) au premier niveau, `
    + `${auServeur.etapesUnEtagePlusBas} un étage plus bas`);
dire('LE SERVEUR RANGE UN PARCOURS, PAS UNE ENVELOPPE',
    auServeur.etapesAuPremierNiveau === 3 && auServeur.etapesUnEtagePlusBas === 0);

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
await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(5000);

const chezLEleve = await p.evaluate(async () => {
    const { lireSeances } = await import('./js/ui/donnerSeance.js');
    const liste = (await lireSeances()) || [];
    const mienne = liste.find((x) => /La séance de Rémy/.test(x.titre || ''))
        || liste[liste.length - 1];
    return {
        combien: liste.length,
        titre: mienne ? mienne.titre : '(aucune)',
        etapes: ((mienne && mienne.path && mienne.path.steps) || []).length,
        // CE QUE L'ÉCRAN ÉCRIT, et c'est la phrase que Rémy a photographiée.
        texte: (document.body.innerText.match(/\d+ exercices? à faire/) || [''])[0]
    };
});
console.log(`   « ${chezLEleve.titre} » : ${chezLEleve.etapes} étape(s)`);
console.log(`   l'écran dit : « ${chezLEleve.texte || '(rien)'} »`);
dire('LA SÉANCE ARRIVE AVEC SES TROIS EXERCICES', chezLEleve.etapes === 3,
    `${chezLEleve.etapes} étape(s)`);
dire('ET L\'ÉCRAN NE DIT PLUS « 0 exercice à faire »',
    !!chezLEleve.texte && !/^0 /.test(chezLEleve.texte), chezLEleve.texte || '(rien)');

// ── ET LA CARTE DU MONDE ────────────────────────────────────────────────────
//
// Rémy : « pourquoi la séance ne se lance pas directement avec […] la carte du
// monde ». Elle ne se dessine qu'à partir de DEUX étapes : avec zéro, il n'y
// avait rien à dessiner — la carte n'était pas en cause.
console.log('\n\x1b[1mET LA CARTE\x1b[0m');
const carte = await p.evaluate(async () => {
    const bouton = [...document.querySelectorAll('button')]
        .find((b) => /commencer ma séance/i.test(b.textContent || ''));
    if (!bouton) return { bouton: false };
    bouton.click();
    await new Promise((ok) => setTimeout(ok, 2600));
    return {
        bouton: true,
        noeuds: document.querySelectorAll('.world-node').length,
        fil: document.querySelectorAll('#fil-seance .fil-pas').length
    };
});
dire('« Commencer ma séance » existe', carte.bouton !== false);
dire('ET LA CARTE PORTE LES TROIS ÉTAPES',
    carte.noeuds >= 3 || carte.fil >= 3,
    `carte : ${carte.noeuds} · fil : ${carte.fil}`);

console.log(`\nerreurs de page : ${s.erreurs.length + erreursEleve.length}`);
[...s.erreurs, ...erreursEleve].slice(0, 4).forEach((e) => console.log('   ' + e));
if (s.erreurs.length || erreursEleve.length) ratés++;

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S) — une séance arrive vide.\x1b[0m`
    : '\n\x1b[32mLA SÉANCE ARRIVE ENTIÈRE, ET LA CARTE AVEC.\x1b[0m');
await p.close();
await s.fermer();
process.exit(ratés ? 1 : 0);
