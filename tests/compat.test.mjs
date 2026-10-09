// TRADUIRE LES ANCIENNES CLÉS DE NOTION — ET SAVOIR SE TAIRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// L'ancienne application nommait les notions comme elle pouvait : « mult:7 »,
// « addition », « priority », parfois rien du tout — et dans ce cas elle les
// DEVINAIT à la forme des champs d'une question. `js/core/compat.js` traduit
// tout cela vers les identifiants du référentiel (`js/data/skills.js`).
//
// POURQUOI C'EST DÉLICAT, et pourquoi quarante-quatre lignes méritent une
// épreuve : ce module est le seul endroit du logiciel qui a le droit de
// DEVINER. Tout le reste déclare sa compétence. Une mauvaise traduction ne
// jette pas : elle range trois mois de travail sous la mauvaise notion, et le
// modèle de maîtrise annonce alors un élève fragile en addition alors qu'il
// l'est en soustraction. Rémy propose un exercice qui ne sert à rien.
//
// DEUX RÈGLES ICI, ET LA SECONDE COMPTE AUTANT QUE LA PREMIÈRE :
//
//   1. CE QU'ON RECONNAÎT, ON LE TRADUIT — et vers une compétence QUI EXISTE
//      vraiment dans le référentiel. Une traduction vers un identifiant
//      inventé est pire qu'un `null` : elle fabrique une notion fantôme qui
//      apparaîtra dans le bilan du professeur sans libellé.
//   2. CE QU'ON NE RECONNAÎT PAS REND `null`. Pas une valeur par défaut, pas
//      « num.add.entiers parce qu'il faut bien ». Une tentative sans
//      compétence est simplement exclue du modèle ; une tentative rangée sous
//      une mauvaise compétence le fausse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { conceptToSkill, deriveSkillFromLegacy } from '../js/core/compat.js';
import { skillLabel } from '../js/data/skills.js';

/**
 * UNE COMPÉTENCE TRADUITE DOIT EXISTER.
 *
 * `skillLabel` rend l'identifiant lui-même quand il ne le connaît pas : c'est
 * le signe qu'on a fabriqué une notion fantôme. On s'en sert comme d'un témoin
 * extérieur, pour ne pas recopier ici la liste du référentiel — une épreuve qui
 * recopie la table qu'elle vérifie ne vérifie rien.
 */
function existeVraiment(skillId) {
    const libelle = skillLabel(skillId);
    return typeof libelle === 'string' && libelle !== skillId && libelle.length > 0;
}

test('LES ANCIENNES CLÉS SE TRADUISENT VERS DES COMPÉTENCES QUI EXISTENT', () => {
    const traduites = [
        conceptToSkill('addition'),
        conceptToSkill('soustraction'),
        conceptToSkill('priority'),
        conceptToSkill('coords'),
        conceptToSkill('mult:7')
    ];
    for (const s of traduites) {
        assert.ok(s, 'une clé connue doit se traduire');
        assert.ok(existeVraiment(s),
            `« ${s} » n'est pas dans le référentiel : le bilan du professeur afficherait une notion sans nom`);
    }
});

test('TOUTES LES TABLES DE MULTIPLICATION PASSENT, PAS SEULEMENT CELLE DE SEPT', () => {
    for (let t = 2; t <= 12; t++) {
        const s = conceptToSkill(`mult:${t}`);
        assert.equal(s, `num.mult.table.${t}`, `la table de ${t}`);
    }
    // Et la forme doit être exacte : « mult:sept » ou « mult: 7 » ne sont pas
    // des clés de l'époque, et les accepter à moitié rangerait n'importe quoi
    // sous n'importe quelle table.
    assert.equal(conceptToSkill('mult:sept'), null);
    assert.equal(conceptToSkill('mult:'), null);
    assert.equal(conceptToSkill('multi:7'), null);
});

test('UN IDENTIFIANT DÉJÀ MODERNE TRAVERSE SANS ÊTRE TOUCHÉ', () => {
    // Un fichier à moitié migré contient les deux formes. Retraduire un
    // identifiant déjà bon le casserait.
    for (const s of ['num.add.entiers', 'geo.repere.coord', 'mes.duree', 'don.moyenne']) {
        assert.equal(conceptToSkill(s), s);
    }
});

test('CE QU\'ON NE RECONNAÎT PAS REND NULL, JAMAIS UNE VALEUR PAR DÉFAUT', () => {
    // C'est la règle la plus importante du fichier. Une tentative sans
    // compétence est exclue du modèle de maîtrise — c'est honnête. Une
    // tentative rangée sous une compétence fausse le fausse, et personne ne le
    // verra jamais.
    for (const inconnu of ['', null, undefined, 'bidule', 'calcul', 'maths', 'num', 0]) {
        assert.equal(conceptToSkill(inconnu), null, `« ${inconnu} » ne doit rien inventer`);
    }
});

test('UNE ANCIENNE QUESTION SE LAISSE DEVINER PAR SES CHAMPS', () => {
    // Les formes réellement rencontrées dans les anciens stockages. Chacune
    // vient d'un exercice précis, et c'est le seul indice qui reste.
    assert.equal(deriveSkillFromLegacy({ t: 7 }), 'num.mult.table.7');
    assert.equal(deriveSkillFromLegacy({ targetFactor: 8 }), 'num.mult.table.8');
    assert.equal(deriveSkillFromLegacy({ col: 9 }), 'num.mult.table.9');
    assert.equal(deriveSkillFromLegacy({ eq: '2+3*4' }), 'num.prio');
    assert.equal(deriveSkillFromLegacy({ tx: 3, ty: 4 }), 'geo.repere.coord');
    assert.equal(deriveSkillFromLegacy({ a: 7, b: 8, op: '-' }), 'num.sub.entiers');
    assert.equal(deriveSkillFromLegacy({ a: 7, b: 8 }), 'num.add.entiers');
});

test('LA COMPÉTENCE DÉCLARÉE L\'EMPORTE SUR TOUTE DEVINETTE', () => {
    // L'ORDRE DES TESTS DANS `deriveSkillFromLegacy` EST LE SUJET.
    //
    // Une question qui porte À LA FOIS un `skillId` et des champs devinables
    // doit rendre le `skillId` : c'est la seule information sûre. Remonter la
    // devinette avant la déclaration ferait passer un exercice de soustraction
    // pour une table de multiplication dès qu'il a un champ `t`.
    assert.equal(deriveSkillFromLegacy({ skillId: 'num.sub.relatifs', t: 7, a: 1, b: 2 }), 'num.sub.relatifs');
    // Et le `concept` passe avant les champs, pour la même raison.
    assert.equal(deriveSkillFromLegacy({ concept: 'priority', a: 1, b: 2 }), 'num.prio');
    // L'opérateur passe avant la forme « a et b » : sans cela, toute
    // soustraction deviendrait une addition.
    assert.equal(deriveSkillFromLegacy({ a: 7, b: 8, op: '-' }), 'num.sub.entiers');
});

test('UNE QUESTION DONT ON NE SAIT RIEN NE SE DEVINE PAS', () => {
    assert.equal(deriveSkillFromLegacy(null), null);
    assert.equal(deriveSkillFromLegacy(undefined), null);
    assert.equal(deriveSkillFromLegacy({}), null);
    assert.equal(deriveSkillFromLegacy({ questionText: '7 + 8' }), null,
        'le TEXTE d\'une question n\'est pas un indice : on ne lit pas « + » pour conclure');
    // Un seul des deux champs ne suffit pas à conclure à une addition.
    assert.equal(deriveSkillFromLegacy({ a: 7 }), null);
    assert.equal(deriveSkillFromLegacy({ b: 8 }), null);
});

test('ZÉRO EST UNE VALEUR, PAS UNE ABSENCE', () => {
    // Le piège classique du `if (qd.t)` : la table de 0 n'existe pas, mais une
    // COORDONNÉE à 0 oui, et une addition de 0 aussi. Le code teste bien
    // `!== undefined` ; cette ligne-ci s'oppose au jour où quelqu'un
    // « simplifiera ».
    assert.equal(deriveSkillFromLegacy({ tx: 0, ty: 0 }), 'geo.repere.coord');
    assert.equal(deriveSkillFromLegacy({ a: 0, b: 0 }), 'num.add.entiers');
    assert.equal(deriveSkillFromLegacy({ eq: 0 }), 'num.prio');
});
