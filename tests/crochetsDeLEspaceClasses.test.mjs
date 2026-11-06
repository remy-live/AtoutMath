// TOUT CROCHET POSÉ SUR UN BOUTON EST INSCRIT CHEZ LE RÉPARTITEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// L'espace classes n'écoute pas les boutons un par un : un seul gestionnaire
// remonte au `closest()` d'une LISTE de crochets, et agit selon celui qu'il
// trouve. C'est une bonne architecture — trente boutons, un écouteur — et elle
// a un défaut qu'il faut garder, parce qu'il ne se voit pas :
//
//     UN CROCHET NEUF QU'ON OUBLIE D'INSCRIRE ÉCHOUE EN SILENCE.
//
// Mesuré en ajoutant le bouton « renommer » que Rémy demandait le 13 octobre
// (« il faut que ce soit simple de le renommer ») : la sonde voyait « bouton
// renommer 79 × 25 px, élève Bernard Tom, identifiant tom.b » — le bouton
// existait, à la bonne taille, avec ses attributs et son infobulle — puis
// « le clic n'ouvre aucune fenêtre ». Rien dans la console, aucune erreur de
// page, aucune piste. Le gestionnaire sortait sur `if (!el) return;`.
//
// ── CE QUE CETTE ÉPREUVE REGARDE ──────────────────────────────────────────
//
// Les attributs `data-…` POSÉS SUR UN BOUTON dans les gabarits du fichier, et
// la liste de sélecteurs du `closest()`. Tout ce qui est dans la première doit
// être dans la seconde.
//
// Elle ne regarde PAS les `data-…` posés ailleurs — sur une ligne de tableau,
// sur un conteneur — qui servent à transporter une valeur et que personne ne
// clique. C'est pour cela qu'on exige `<button` sur la même ligne.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = 'js/ui/espaceClasses.js';
const source = readFileSync(SOURCE, 'utf8');

/**
 * La liste de sélecteurs du répartiteur, telle qu'elle est écrite.
 *
 * On la découpe du premier `[data-` de l'appel à `closest(` jusqu'à sa
 * parenthèse fermante : elle est écrite sur une dizaine de lignes concaténées,
 * et la lire en une fois évite de dépendre de leur découpage.
 */
function crochetsEcoutes() {
    // IL Y A PLUSIEURS RÉPARTITEURS DANS CE FICHIER, et c'est leur UNION qui
    // compte. Deux erreurs successives l'ont appris :
    //
    //   · viser « le premier closest() » n'en lisait qu'un seul crochet —
    //     l'épreuve se déclarait alors inutilisable, ce qui était le bon
    //     réflexe, mais c'était la découpe qui avait tort ;
    //   · viser « celui qui en porte le plus » accusait `data-ote` et
    //     `data-mets`, qui sont bel et bien écoutés, par un second
    //     gestionnaire local au choix des exercices.
    //
    // Un crochet écouté par N'IMPORTE LEQUEL fait son travail. On les réunit.
    const tous = new Set();
    for (const m of source.matchAll(/\.closest\(/g)) {
        const bloc = source.slice(m.index, m.index + 3000);
        for (const x of bloc.matchAll(/\[data-([a-z-]+)\]/g)) tous.add(x[1]);
    }
    assert.ok(tous.size, `le répartiteur de ${SOURCE} n'appelle plus closest()`);
    return tous;
}

/**
 * Les crochets `data-…` posés sur une COMMANDE dans les gabarits.
 *
 * ET `<input>` COMPTE AUTANT QUE `<button>`, ce qui manquait. Cette épreuve ne
 * regardait que les boutons, et le trou s'est vu le jour où la case à cocher
 * « Plein écran chez les élèves » est arrivée — Rémy : « après peut être vaut
 * il mieux le mettre en paramètre ». Une case à cocher se CLIQUE : son crochet
 * échoue exactement de la même façon silencieuse, et l'épreuve écrite pour
 * garder ce défaut-là n'allait pas le voir.
 *
 * `<select>` et `<textarea>` ne sont pas ajoutés ici, et c'est délibéré : ce
 * répartiteur écoute le CLIC, et ce qu'on attend d'un menu déroulant ou d'un
 * champ de texte est un `change` ou une saisie — un crochet de clic y serait
 * une autre erreur, que cette épreuve ne saurait pas juger. Le jour où il en
 * faudra un, on l'ajoutera en sachant pourquoi.
 */
function crochetsPoses() {
    const poses = new Map();
    // ── UNE BALISE TIENT SUR PLUSIEURS LIGNES, ET C'EST LE CAS COURANT ────
    //
    // La lecture se faisait LIGNE À LIGNE : une balise écrite
    //
    //     <button type="button" class="ec-pilote-btn ec-pilote-btn--actif"
    //             data-tab-voir>Voir la réponse</button>
    //
    // n'était pas vue, parce que la ligne qui porte le crochet ne porte pas
    // `<button`. MESURÉ le jour où trois boutons de la même fenêtre ont été
    // ajoutés : deux ont été attrapés, le troisième a passé — le seul dont le
    // crochet était à la ligne. Une épreuve qui n'attrape que deux défauts sur
    // trois donne une assurance qu'elle n'a pas.
    //
    // ON LIT DONC LA BALISE ENTIÈRE, de `<button` jusqu'au `>` qui la ferme.
    for (const balise of source.match(/<(?:button|input)\b[\s\S]*?>/g) || []) {
        const ligne = balise.replace(/\s+/g, ' ').trim().slice(0, 90);
        for (const m of ligne.matchAll(/\bdata-([a-z-]+)\s*=/g)) {
            if (!poses.has(m[1])) poses.set(m[1], ligne.trim().slice(0, 90));
        }
        // UNE CASE À COCHER PORTE SON CROCHET SANS VALEUR — `data-ecran-seance`
        // tout court, puisqu'il n'y a rien à transporter : son état EST dans
        // `checked`. Le motif ci-dessus exige un `=` et l'aurait donc manqué.
        //
        // ET CE QUI SUIT LE CROCHET N'EST PAS UNE ESPACE. Première écriture :
        // `(?=[\s>])`. `epreuveTombe` a refusé de la croire, et il avait
        // raison — la ligne du gabarit est
        //
        //     <input type="checkbox" data-ecran-seance${pleinEcran ? …}>
        //
        // donc le caractère suivant est un `$` d'interpolation. On exige donc
        // seulement que le NOM s'arrête là, sans rien dire de ce qui vient
        // après : c'est la seule forme qui ne dépende pas de l'écriture du
        // gabarit. (Le piège est de la même famille que le `\b` des feuilles
        // de style, payé trois fois dans ce dépôt.)
        for (const m of balise.matchAll(/\bdata-([a-z]+(?:-[a-z]+)*)(?![a-z0-9-])/g)) {
            if (!poses.has(m[1])) poses.set(m[1], ligne);
        }
    }
    return poses;
}

/**
 * LES CROCHETS QUE LE FICHIER BRANCHE LUI-MÊME, bouton par bouton.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE RÉPARTITEUR N'EST PAS LA SEULE FAÇON DE BRANCHER UN BOUTON, et l'épreuve
 * le croyait. Une fenêtre ouverte par cet écran — « Au tableau », qui projette
 * les questions du défi — tient son propre état (quelle question, réponse
 * montrée ou non) et pose donc ses gestes à la main :
 *
 *     el('[data-tab-prec]').onclick = () => aller(-1);
 *
 * Ce bouton marche. L'exiger dans la liste du `closest()` aurait obligé à y
 * inscrire un crochet que le répartiteur ne traite pas — c'est-à-dire à mentir
 * dans la liste même que cette épreuve garde.
 *
 * ON DISTINGUE DONC LES DEUX CAS AU LIEU D'EN FORCER UN. Un crochet est
 * acceptable s'il est écouté par le répartiteur OU branché ici, sur place. Ce
 * qui reste interdit — et c'est tout l'objet de l'épreuve — est le crochet
 * branché NULLE PART : celui-là s'affiche, se clique, et ne fait rien.
 */
function crochetsBranchesSurPlace() {
    const sur = new Set();
    for (const m of source.matchAll(
        /\[data-([a-z]+(?:-[a-z]+)*)\]'\s*\)\s*(?:\|\|[^\n]*)?\.\s*onclick/g)) {
        sur.add(m[1]);
    }
    return sur;
}

/** `data-saut-eleve` → `sautEleve`, comme le navigateur le range. */
const enCamel = (nom) => nom.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/**
 * LES CROCHETS QU'ON LIT COMME UNE VALEUR, et non comme une cible de clic.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Beaucoup de crochets ne servent qu'à TRANSPORTER quelque chose jusqu'au
 * gestionnaire : `data-prenom` porte le prénom à afficher dans la question
 * « Retirer Emma ? », `data-exo` l'exercice sur lequel l'élève se trouve,
 * `data-graine` la question exacte à rouvrir. Ils vivent sur le même bouton
 * qu'un crochet écouté, et c'est ce dernier qui déclenche.
 *
 * LA RÈGLE D'AVANT NE LES RECONNAISSAIT QUE PAR LEUR PRÉFIXE — `data-pseudo-
 * actuel` accompagne `data-pseudo` —, ce qui laissait de côté tous ceux dont
 * le nom ne commence pas par celui de leur voisin, c'est-à-dire la plupart.
 * Tant que la lecture se faisait ligne à ligne, ils passaient inaperçus ; la
 * lecture de la balise entière les a tous fait crier d'un coup, sur du code
 * parfaitement sain. Une épreuve qui crie sur du code sain finit éteinte.
 *
 * ON LES RECONNAÎT DONC À CE QU'ILS SONT : des valeurs qu'on LIT. Le
 * répartiteur écrit `const d = el.dataset;` puis `d.prenom` ; ailleurs on lit
 * `bouton.dataset.reglages`. Les deux formes se cherchent ici.
 */
function crochetsLus() {
    const lus = new Set();
    for (const m of source.matchAll(/\b(?:d|dataset)\.([a-zA-Z]+)\b/g)) lus.add(m[1]);
    return lus;
}

/**
 * LES CROCHETS SUR LESQUELS LE RÉPARTITEUR AIGUILLE — et eux n'ont pas d'excuse.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CECI EST LA MOITIÉ QUI MANQUAIT, ET `epreuveTombe` L'A DIT. En acceptant tout
 * crochet « lu quelque part », l'épreuve laissait passer le défaut même qu'elle
 * garde : un crochet absent de la liste du `closest()` mais SUR LEQUEL le
 * répartiteur aiguille est lu — `if (d.defiTableau !== undefined)` — et il est
 * pourtant mort, puisque le gestionnaire sort avant d'y arriver. Retiré de la
 * liste, le bouton ne faisait plus rien et l'épreuve restait verte.
 *
 * LES DEUX USAGES NE SE RESSEMBLENT POURTANT PAS :
 *
 *   · un PORTEUR se lit comme une valeur — `d.prenom`, `d.exo`, `d.graine` ;
 *   · un AIGUILLAGE se lit comme une présence — `d.defiTableau !== undefined`,
 *     et c'est la forme qu'emploie tout ce fichier pour décider d'une action.
 *
 * Seul le second doit être dans la liste. On le reconnaît à sa forme, et c'est
 * la forme que le fichier emploie partout : une exception y serait visible.
 */
function crochetsDAiguillage() {
    const aig = new Set();
    for (const m of source.matchAll(/\bd\.([a-zA-Z]+)\s*!==\s*undefined/g)) aig.add(m[1]);
    return aig;
}

test('CHAQUE CROCHET DE BOUTON EST ÉCOUTÉ PAR LE RÉPARTITEUR', () => {
    const ecoutes = crochetsEcoutes();
    assert.ok(ecoutes.size > 20,
        `on n'a lu que ${ecoutes.size} crochet(s) dans le closest() : la découpe\n`
        + 'de la liste ne marche plus, et cette épreuve ne garde donc plus rien.');

    const surPlace = crochetsBranchesSurPlace();
    const lus = crochetsLus();
    const aiguillages = crochetsDAiguillage();
    const muets = [];
    for (const [nom, ligne] of crochetsPoses()) {
        if (ecoutes.has(nom)) continue;
        // BRANCHÉ À LA MAIN, DANS CE FICHIER : voir `crochetsBranchesSurPlace`.
        if (surPlace.has(nom)) continue;
        // SIMPLE PORTEUR DE VALEUR, LU AILLEURS : voir `crochetsLus`. Un
        // crochet d'AIGUILLAGE, lui, n'a pas cette excuse — c'est justement
        // celui qui doit être dans la liste pour que le clic l'atteigne.
        if (lus.has(enCamel(nom)) && !aiguillages.has(enCamel(nom))) continue;
        // UN CROCHET QUI N'EST QU'UN PORTEUR DE VALEUR est normal : il voyage
        // avec un autre, qui est écouté. On les reconnaît à leur préfixe —
        // `data-pseudo-actuel` accompagne `data-pseudo`, `data-poste-code`
        // accompagne `data-poste`. Les exiger ferait crier l'épreuve sur du
        // code sain, et une épreuve qui crie sur du code sain finit éteinte.
        const porteur = [...ecoutes].some(e => nom.startsWith(e + '-'));
        if (porteur) continue;
        muets.push(`  · data-${nom}\n      ${ligne}`);
    }

    assert.equal(muets.length, 0,
        'des boutons portent un crochet que le répartiteur n\'écoute pas.\n'
        + 'Ils s\'afficheront normalement et NE FERONT RIEN au clic : le\n'
        + 'gestionnaire sort sur `if (!el) return;`, sans erreur ni message.\n'
        + `Il faut les ajouter à la liste du closest() dans ${SOURCE}.\n`
        + muets.join('\n'));
});
