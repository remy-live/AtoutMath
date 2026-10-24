#!/usr/bin/env node
// CE QUE TROUVE LA BARRE DE RECHERCHE — pour ce qu'on y tape vraiment.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « le nom Détour Express n'est pas évident car si je tape 99 dans la
// barre de recherche, j'aurai pu espérer tomber dessus ».
//
// IL AVAIT RAISON, ET LE CHIFFRE EST SÉVÈRE : « 99 » rendait ZÉRO résultat —
// « 101 » et « 19 » aussi — alors que l'exercice du détour existe précisément
// pour 76 + 99. Le nombre n'était écrit nulle part de cherchable.
//
// CE QUE CET OUTIL FERME COMME FRICTION. Une recherche qui ne trouve rien ne
// lève aucune erreur : elle affiche une liste vide, ce qui est exactement ce
// qu'affiche une recherche dont le résultat n'existe pas. Rien ne distingue
// « il n'y a pas d'exercice sur 99 » de « l'exercice sur 99 ne porte pas le
// mot 99 ». Seul quelqu'un qui CHERCHE la chose et sait qu'elle existe peut
// le dire — et ce quelqu'un, c'est Rémy, une fois sur dix.
//
// USAGE
//   node tools/cequOnTape.mjs 99 101 "table de 7"
//   node tools/cequOnTape.mjs --muets          → tout ce qui ne trouve RIEN
//
// `--muets` passe une liste de requêtes qu'un professeur de collège tape
// vraiment : les nombres remarquables du programme, et quelques mots. Il
// n'imprime que celles qui ne rendent rien — ce sont les seules à regarder.

import { exercices } from '../js/data/catalog.js';
import { preparer, chercher } from '../js/core/recherche.js';

// ON INDEXE CE QUE `ficheDe` INDEXE, moins les deux mots déduits de l'activité
// (« jeu », « à deux ») : ils ne tiennent qu'à la couche d'affichage, et les
// importer ferait entrer le DOM dans un outil qui tourne sous Node.
const fiches = exercices.map(e => preparer({
    id: e.id, titre: e.title,
    chemin: e.tags?.chemin || [], niveaux: e.tags?.niveaux || [],
    motsCles: [...(e.motsClefs || [])],
    texte: e.instruction || ''
}));

// CE QU'UN PROFESSEUR TAPE VRAIMENT. Les nombres d'abord — ce sont eux qu'on
// oublie d'écrire dans les mots-clefs, parce qu'ils sont dans la tête de
// celui qui a écrit l'exercice et nulle part sur la page.
const USUELS = [
    '9', '99', '8', '98', '11', '19', '21', '101',
    '10', '100', '1000', '25', '50', '0,5', '0,25', '0,07',
    '1/2', '1/4', '3/4', 'table de 7', '7 x 8', 'pi', '360', '180', '90',
    // « periode » a été retiré de cette liste, et c'est une décision : rien,
    // dans le catalogue, ne parle de développement décimal périodique. La
    // réponse RIEN y était donc JUSTE — et une alarme qui sonne toujours pour
    // une bonne raison apprend à ne plus regarder l'outil.
    'pourcentage', 'symetrie', 'relatifs', 'puissance',
    'fraction', 'aire', 'perimetre', 'volume', 'angle', 'equation',
    'monnaie', 'euros', 'durees', 'vitesse', 'proportionnalite'
];

const args = process.argv.slice(2);
const muets = args.includes('--muets');
const requetes = muets ? USUELS : args.filter(a => !a.startsWith('--'));

if (!requetes.length) {
    console.log('Usage : node tools/cequOnTape.mjs <requête…>   ou   --muets');
    process.exit(1);
}

let rien = 0;
for (const q of requetes) {
    const r = chercher(fiches, q) || [];
    if (muets && r.length) continue;
    if (!r.length) rien++;
    const titres = r.slice(0, 6).map(x => x.fiche.titre).join(' · ');
    console.log(`${r.length ? '  ok  ' : ' RIEN '} « ${q} » → ${r.length}`
        + (titres ? ` : ${titres}` : ''));
}

if (muets) {
    console.log(rien
        ? `\n${rien} requête(s) sur ${USUELS.length} ne trouvent RIEN.`
        : `\nLes ${USUELS.length} requêtes usuelles trouvent toutes quelque chose.`);
}
