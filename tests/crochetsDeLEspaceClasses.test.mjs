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

/** Les crochets `data-…` posés sur un bouton dans les gabarits. */
function crochetsPoses() {
    const poses = new Map();
    for (const ligne of source.split('\n')) {
        if (!/<button/.test(ligne)) continue;
        for (const m of ligne.matchAll(/\bdata-([a-z-]+)\s*=/g)) {
            if (!poses.has(m[1])) poses.set(m[1], ligne.trim().slice(0, 90));
        }
    }
    return poses;
}

test('CHAQUE CROCHET DE BOUTON EST ÉCOUTÉ PAR LE RÉPARTITEUR', () => {
    const ecoutes = crochetsEcoutes();
    assert.ok(ecoutes.size > 20,
        `on n'a lu que ${ecoutes.size} crochet(s) dans le closest() : la découpe\n`
        + 'de la liste ne marche plus, et cette épreuve ne garde donc plus rien.');

    const muets = [];
    for (const [nom, ligne] of crochetsPoses()) {
        if (ecoutes.has(nom)) continue;
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
