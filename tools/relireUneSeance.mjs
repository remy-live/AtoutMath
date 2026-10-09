// RELIRE UNE SÉANCE — ce que le logiciel en dit, avant que la classe le dise.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je peux te donner ma séance et tu vérifies si tout est ok. »
//
// OUI, ET C'EST MIEUX QUE DE LA LIRE À L'ŒIL. Sa séance « Relatifs » avait
// l'air parfaite dans l'atelier, et portait un mot aux titre et texte VIDES —
// une étape que l'élève aurait traversée en cherchant ce qu'il devait
// comprendre. On ne voit pas cela dans une liste de seize lignes ; on le voit
// en demandant au logiciel ce qu'il compte en faire.
//
// ── CE QU'IL DIT, ET CE QU'IL NE DIT PAS ───────────────────────────────────
//
// IL DIT : le nombre d'étapes déclarées et le nombre RÉELLEMENT traversées (la
// différence est toujours intéressante), le total des questions, le barème, la
// durée estimée, et chaque étape avec son exercice, son compte et son seuil.
//
// IL AVERTIT sur ce qui se voit mal : un mot vide, un mot en dernière position
// (il garde son écran plein — c'est peut-être voulu, c'est peut-être un mot
// d'accueil oublié en bas), une séance qui déborde de l'heure, un seuil
// impossible, un exercice disparu du catalogue.
//
// IL NE JUGE PAS LE CHOIX DES EXERCICES. Le niveau, la progression, ce qui
// convient à une 4ᵉ un lundi matin : c'est le métier de Rémy, et aucune mesure
// ne le remplace.
//
//   node tools/relireUneSeance.mjs <fichier.json>
//
// Le fichier peut être une enveloppe de bibliothèque, un parcours nu, un
// fichier exporté par « Gérer mes parcours » ou un tableau : c'est
// `lireLeFichier` qui tranche, donc exactement ce que le logiciel accepte.

import { readFileSync } from 'node:fs';
import '../js/core/activities/index.js';
import {
    normalizePath, hydratePath, totalItems, totalWeight, estUnMessage
} from '../js/core/path.js';
import { cheminDeLEntree } from '../js/core/entreeParcours.js';
import { lireLeFichier } from '../js/core/fichierParcours.js';
import { estimerParcours, direDuree, tensionDuree } from '../js/core/dureeParcours.js';
import { natureDe } from '../js/core/duree.js';
import { getExerciseById } from '../js/data/catalog.js';
import { motVide, apercuDuMessage } from '../js/core/messageEtape.js';

const chemin = process.argv[2];
if (!chemin) {
    console.error('Usage : node tools/relireUneSeance.mjs <fichier.json>');
    process.exit(2);
}

const brut = readFileSync(chemin, 'utf8');
// ON PASSE PAR LA MÊME PORTE QUE LE LOGICIEL. Une lecture écrite ici à part
// accepterait des formes que l'import refuse, et dirait « tout va bien » d'un
// fichier que Rémy ne pourrait pas rouvrir.
const { parcours, erreur, ecartes } = lireLeFichier(brut);
if (erreur) {
    // UNE ENVELOPPE DE BIBLIOTHÈQUE SEULE passe par `lireLeFichier`. Si elle
    // échoue quand même, on tente le déballage direct : le fichier vient
    // peut-être d'un copier-coller du stockage du navigateur, qui est
    // exactement ce que Rémy a envoyé la première fois.
    let secours = null;
    try {
        const d = JSON.parse(brut);
        secours = normalizePath(cheminDeLEntree(d) || d, d.name || 'Parcours');
    } catch (e) { /* non : on gardera l'erreur de `lireLeFichier` */ }
    if (!secours || !(secours.steps || []).length) {
        console.error(`\x1b[31m${erreur}\x1b[0m`);
        process.exit(1);
    }
    parcours.push(secours);
}
if (ecartes) console.log(`\x1b[33m${ecartes} ligne(s) écartée(s) à la lecture.\x1b[0m\n`);

let avertissements = 0;
const alerter = (quoi) => { avertissements++; console.log(`  \x1b[33m⚠\x1b[0m  ${quoi}`); };

for (const p of parcours) {
    const h = hydratePath(p);
    const questions = totalItems(p);
    const traversees = h.steps.length;

    console.log(`\x1b[1m« ${p.name} »\x1b[0m`);
    console.log(`   ${p.steps.length} étape(s) déclarée(s), ${traversees} traversée(s)`);
    console.log(`   ${questions} questions · barème sur ${totalWeight(p)}`);

    // LA DURÉE SE DEMANDE DANS LA FORME QUE L'ESTIMATEUR ATTEND — `questions`,
    // pas `nbItems`. Mon premier essai lui a passé les étapes telles quelles :
    // il a compris « une question par étape » et répondu « 4 à 9 min » pour
    // cent trois questions. Un chiffre faux est pire qu'aucun chiffre.
    const pour = h.steps.filter((s) => !estUnMessage(s)).map((s) => {
        const exo = getExerciseById(s.exerciseId);
        return { exerciceId: s.exerciseId, nature: exo ? natureDe(exo) : 'notion',
            questions: s.nbItems || 10 };
    });
    const d = estimerParcours(pour, {});
    const tension = tensionDuree(d.max);
    console.log(`   durée estimée : ${direDuree(d.min, d.max)}`
        + `${tension && tension !== 'ok' ? `  (${tension})` : ''}`);
    console.log('');

    let rang = 0;
    for (const s of p.steps) {
        rang++;
        const num = String(rang).padStart(2);
        if (estUnMessage(s)) {
            console.log(`  ${num}. 💬 ${motVide(s.message)
                ? '\x1b[33m*** VIDE : cette étape ne montrera RIEN ***\x1b[0m'
                : '« ' + apercuDuMessage(s.message, 60) + ' »'}`);
            continue;
        }
        const exo = getExerciseById(s.exerciseId);
        console.log(`  ${num}. ${String(s.nbItems).padStart(2)} q. seuil `
            + `${String(s.threshold == null ? '—' : s.threshold).padStart(2)}  `
            + (exo ? exo.title : `\x1b[31m${s.exerciseId} — INCONNU AU CATALOGUE\x1b[0m`));
    }
    console.log('');

    // ── CE QUI SE VOIT MAL ─────────────────────────────────────────────────
    const vides = p.steps.filter((s) => estUnMessage(s) && motVide(s.message));
    if (vides.length) {
        alerter(`${vides.length} mot(s) vide(s) : l'élève ne les verra pas (ils sont `
            + 'écartés), mais ils encombrent la liste — autant les supprimer.');
    }
    const inconnus = p.steps.filter((s) => !estUnMessage(s) && !getExerciseById(s.exerciseId));
    if (inconnus.length) {
        alerter(`${inconnus.length} exercice(s) inconnu(s) du catalogue : `
            + `${inconnus.map((s) => s.exerciseId).join(', ')}. Ils seront ÉCARTÉS.`);
    }
    const dernier = h.steps[h.steps.length - 1];
    if (dernier && estUnMessage(dernier)) {
        alerter('la séance FINIT par un mot : il garde son écran plein (c\'est voulu '
            + 'pour un mot de la fin, mais vérifiez qu\'il n\'est pas un mot d\'accueil '
            + 'resté en bas).');
    }
    const seuilsFous = p.steps.filter((s) => !estUnMessage(s)
        && s.threshold != null && s.threshold > s.nbItems);
    if (seuilsFous.length) {
        alerter(`${seuilsFous.length} étape(s) dont le seuil dépasse le nombre de `
            + 'questions : elles ne pourront JAMAIS être réussies.');
    }
    if (d.max > 3600) {
        alerter(`la séance peut dépasser l'heure (${direDuree(d.min, d.max)}) : `
            + `${questions} questions. Les élèves lents n'iront pas au bout — ce n'est `
            + 'un défaut que si vous comptiez la finir en une séance.');
    }
    if (traversees < 2) {
        alerter('moins de deux étapes traversées : ni la carte ni le fil ne se '
            + 'dessineront.');
    }
}

console.log(avertissements
    ? `\x1b[33m${avertissements} point(s) à regarder.\x1b[0m`
    : '\x1b[32mRien à signaler.\x1b[0m');
