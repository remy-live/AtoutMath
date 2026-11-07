// COMPLÉTER UNE SÉANCE DÉJÀ DONNÉE : EST-CE QUE ÇA ARRIVE À L'ÉLÈVE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « si je me rends compte qu'une séance est trop courte ou que les
// élèves vont trop vite, puis-je la compléter ? ».
//
// LA LECTURE DU CODE DIT NON pour une séance simplement DONNÉE (par opposition
// à IMPOSÉE) : `js/core/parcoursServeur.js` écrit la séance locale UNE FOIS,
// sous l'identifiant `s_srv_<assignmentId>` —
//
//     const id = 's_srv_' + String(a.assignmentId || a.pathId);
//     if (dejaLa.has(id)) continue;
//
// — et cet identifiant ne change pas quand le parcours, lui, change. C'est une
// affirmation trop lourde pour une lecture de code : si elle est vraie, un
// professeur qui rallonge sa séance le fait dans le vide, et rien ne le lui
// dit. On la MESURE donc, sur le chemin réel : le professeur donne, l'élève
// reçoit, le professeur complète, l'élève recharge.
//
// ET ON MESURE AUSSI L'AUTRE CAS. Un élève qui n'avait pas encore reçu la
// séance doit, lui, recevoir la version complète : si ce n'était pas le cas,
// ce ne serait plus un piège mais une panne. Deux élèves, donc, et la
// différence entre les deux est tout le sujet.
//
//   node tools/seanceQuiChange.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
await dormir(800);

/** Le parcours d'essai, avec autant d'étapes qu'on veut. */
const PARCOURS = (exos) => ({
    id: 'essai-seance-qui-change',
    name: 'Séance du lundi',
    steps: exos.map((x, i) => ({
        id: 'e' + i, type: 'exercise', exerciseId: x,
        config: {}, rules: { nbItems: 4, threshold: 3 }
    }))
});

// ─── LE PROFESSEUR DONNE UNE SÉANCE DE DEUX EXERCICES ───────────────────────
const classeId = await s.page.evaluate(async () => {
    // `mesClasses()` REND LE TABLEAU, pas un objet qui le contient : ma
    // première version cherchait `r.classes` et trouvait « aucune classe » sur
    // un serveur qui en a deux. On lit la signature plutôt que de la deviner.
    const { mesClasses } = await import('./js/core/espaceProf.js');
    const liste = await mesClasses();
    const c = (Array.isArray(liste) ? liste : []).find((x) => /6e B/.test(x.name || x.nom || ''));
    return c ? c.id : null;
});
console.log('classe trouvée : ' + classeId);

const donner = (parcours) => s.page.evaluate(async ([p, cid]) => {
    const { monterUnParcours, donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    // `monterUnParcours` garde une empreinte pour ne pas remonter deux fois le
    // même ; on passe par `donnerAuServeur`, qui monte PUIS assigne.
    const r = await donnerAuServeur(p, cid);
    const m = await monterUnParcours(p);
    return { donne: !r.erreur, monte: m.monte, erreur: r.erreur || m.erreur || '' };
}, [parcours, classeId]);

console.log('\n\x1b[1mLE PROFESSEUR DONNE\x1b[0m une séance de 2 exercices : '
    + JSON.stringify(await donner(PARCOURS(['calc-add', 'calc-sub']))));

// ─── TOM OUVRE SON POSTE ET REÇOIT LA SÉANCE ────────────────────────────────
const ouvrirPoste = async (billet, place) => {
    const p = await s.ctx.newPage();
    await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=${place}#billet=${encodeURIComponent(billet)}`);
    await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    await dormir(4000);   // le temps d'une synchronisation
    return p;
};

/** Combien d'étapes l'élève a-t-il dans la séance « Séance du lundi » ? */
const etapesVues = (p) => p.evaluate(async () => {
    const { lireSeances } = await import('./js/ui/donnerSeance.js');
    const toutes = (await lireSeances()) || [];
    return toutes.filter((x) => /Séance du lundi/.test(x.titre || x.nom || ''))
        .map((x) => ({
            id: x.id,
            // L'IDENTITÉ DU TRAVAIL, QU'ON SURVEILLE AUTANT QUE LE COMPTE.
            // C'est elle qui retient l'avancement de l'élève
            // (`computeAssignedPath` filtre sur `pathId`, et les numéros
            // d'étape en dérivent). Si elle changeait au complément, tout ce
            // que l'élève a fait deviendrait orphelin — il repartirait de zéro
            // sur la carte, sans qu'aucune erreur ne paraisse.
            pathId: x.pathId,
            etapes: ((x.path || {}).steps || []).length,
            exercices: ((x.path || {}).steps || []).map((e) => e.exerciseId).join(' · ')
        }));
});

const tom = await ouvrirPoste('tom.b/7777', 1);
const avantTom = await etapesVues(tom);
console.log('\n\x1b[1mTOM REÇOIT\x1b[0m : ' + JSON.stringify(avantTom));

// ─── LE PROFESSEUR COMPLÈTE : TROIS EXERCICES ───────────────────────────────
console.log('\n\x1b[1mLE PROFESSEUR COMPLÈTE\x1b[0m (3 exercices) : '
    + JSON.stringify(await donner(PARCOURS(['calc-add', 'calc-sub', 'calc-mul']))));

// ─── TOM RECHARGE — ET C'EST LÀ QUE TOUT SE JOUE ────────────────────────────
await tom.reload();
await tom.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(5000);
const apresTom = await etapesVues(tom);
console.log('\n\x1b[1mTOM APRÈS RECHARGEMENT\x1b[0m : ' + JSON.stringify(apresTom));

// ─── EMMA, QUI N'AVAIT RIEN REÇU, OUVRE SON POSTE MAINTENANT ────────────────
// Son code est tiré au sort à l'import : on le demande au professeur, comme
// l'écran le ferait.
const billetEmma = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => /Emma/.test(x.prenom || ''));
    return e ? `${e.login}/${e.code}` : null;
}, [classeId]);
const emma = await ouvrirPoste(billetEmma, 2);
const vuEmma = await etapesVues(emma);
console.log('\n\x1b[1mEMMA, QUI OUVRE APRÈS\x1b[0m (' + billetEmma + ') : ' + JSON.stringify(vuEmma));

// ─── LE VERDICT ─────────────────────────────────────────────────────────────
const n = (v) => (v[0] ? v[0].etapes : 0);
console.log('\n────────────────────────────────────────────────────────────');
console.log(`  Tom avant : ${n(avantTom)} étape(s) · Tom après : ${n(apresTom)} · Emma : ${n(vuEmma)}`);
if (n(apresTom) === n(avantTom) && n(vuEmma) > n(avantTom)) {
    console.log('  \x1b[31m→ LE COMPLÉMENT N\'ARRIVE PAS À CELUI QUI A DÉJÀ LA SÉANCE.\x1b[0m');
    console.log('    Et il arrive à celui qui ouvre après : deux élèves de la même');
    console.log('    classe n\'ont donc PAS la même séance, sans que rien ne le dise.');
} else if (n(apresTom) > n(avantTom)) {
    console.log('  \x1b[32m→ LE COMPLÉMENT ARRIVE : la séance se complète.\x1b[0m');
} else {
    console.log('  \x1b[33m→ MESURE INCOMPLÈTE : relire les chiffres ci-dessus.\x1b[0m');
}

// ─── ET CE QU'ON A PU CASSER EN RÉPARANT ────────────────────────────────────
//
// « Une mesure qui ne regarde que ce qu'on a corrigé ne voit pas ce qu'on a
// cassé. » Deux choses à vérifier, et elles comptent autant que le complément.

// 1. L'IDENTITÉ DU TRAVAIL N'A PAS BOUGÉ. Si elle changeait, l'avancement
//    déjà acquis serait orphelin et l'élève repartirait de zéro.
console.log('\n\x1b[1mCE QU\'ON A PU CASSER\x1b[0m');

// 0. LES DEUX ÉLÈVES RANGENT LEUR TRAVAIL SOUS LE MÊME NOM.
//    `runsDeLaSeance` (js/core/bilanSeance.js) filtre les travaux sur cette
//    identité : deux élèves qui n'en ont pas la même sont deux élèves dont le
//    bilan n'en retient qu'un. C'était le cas quand chacun la recalculait sur
//    le contenu qu'il avait sous les yeux.
const memeNom = apresTom[0] && vuEmma[0] && apresTom[0].pathId === vuEmma[0].pathId;
console.log('   Tom et Emma rangent sous le même nom : '
    + (memeNom ? '\x1b[32moui\x1b[0m' : '\x1b[31mNON — le bilan en perdrait un\x1b[0m')
    + '  (' + String((apresTom[0] || {}).pathId) + ' / ' + String((vuEmma[0] || {}).pathId) + ')');
const memeIdentite = avantTom[0] && apresTom[0] && avantTom[0].pathId === apresTom[0].pathId;
console.log('   l\'identité du travail est restée la même : '
    + (memeIdentite ? '\x1b[32moui\x1b[0m' : '\x1b[31mNON — l\'avancement serait orphelin\x1b[0m')
    + '  (' + String((avantTom[0] || {}).pathId).slice(0, 12) + '…)');

// 2. UNE VRAIE RETOUCHE NE DOIT PAS PASSER. On remplace le PREMIER exercice :
//    ce n'est plus un complément, c'est une réécriture, et un élève a peut-être
//    déjà fait l'ancien. La séance de Tom ne doit pas bouger d'un pouce.
console.log('\n   le professeur REMPLACE le premier exercice : '
    + JSON.stringify(await donner(PARCOURS(['calc-div', 'calc-sub', 'calc-mul']))));
await tom.reload();
await tom.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(5000);
const apresRetouche = await etapesVues(tom);
console.log('   Tom après la retouche : ' + JSON.stringify(apresRetouche));
const intact = apresRetouche[0] && apresRetouche[0].exercices === apresTom[0].exercices;
console.log(intact
    ? '   \x1b[32m→ UNE RETOUCHE NE RÉÉCRIT PAS UNE SÉANCE EN COURS.\x1b[0m'
    : '   \x1b[31m→ LA SÉANCE A ÉTÉ RÉÉCRITE : le bilan de Tom désigne d\'autres exercices que ceux qu\'il a faits.\x1b[0m');

console.log('\nerreurs de page : ' + s.erreurs.length + ' · fenêtres natives : ' + s.fenetresNatives.length);
s.erreurs.slice(0, 4).forEach((e) => console.log('   ' + e));
await s.fermer();
