// « DÉVELOPPE ET RÉDUIS » N'EST PAS FINI TANT QU'IL RESTE 3 × 2 À CALCULER.
//
// Rémy : « pour le développe pas à pas, quand tu demandes de développer et
// réduire 3(x−2) j'écris 3*x−3*2 et tu considères que la réponse est bonne
// alors qu'on n'a pas réduit. »
//
// LE GARDE-FOU QUI EXISTAIT NE POUVAIT PAS LE VOIR, et c'est ce qui rend cette
// épreuve utile : il comparait le nombre de TERMES ÉCRITS au nombre de
// monômes. « 2x + 4x + 30 » a trois termes pour deux monômes — attrapé. Mais
// « 3×x − 3×2 » en a DEUX pour deux : la moitié non faite n'est pas entre les
// termes, elle est DANS un terme.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import * as fx from '../js/core/maths/formule.js';
import { produitDeNombres } from '../js/core/maths/etapes.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';

test('UN PRODUIT DE DEUX NOMBRES SE RECONNAÎT, OÙ QU\'IL SOIT', () => {
    const a = (s) => fx.analyser(String(s).replace(/\s+/g, ''));

    assert.equal(produitDeNombres(a('3*x-3*2')), true, 'le cas de Rémy');
    assert.equal(produitDeNombres(a('8x+8*4')), true, 'un seul terme suffit');
    // ON DESCEND PARTOUT : sous un opposé, dans une parenthèse. Une recherche
    // qui ne regarderait que le premier niveau laisserait passer celui-ci.
    assert.equal(produitDeNombres(a('-(3*2)+x')), true, 'sous un opposé');

    // ET L'ON NE REFUSE PAS CE QUI EST JUSTE.
    assert.equal(produitDeNombres(a('3x-6')), false, 'la réponse réduite');
    assert.equal(produitDeNombres(a('3*x-6')), false,
        'un nombre fois une LETTRE est une écriture, pas un calcul en attente');
    assert.equal(produitDeNombres(a('2x+4x+30')), false,
        'celui-ci est non réduit, mais c\'est l\'AUTRE garde-fou qui le dit');
    assert.equal(produitDeNombres(a('x*x')), false, 'deux lettres ne sont pas deux nombres');
});

test('LE JUGE DU DÉVELOPPEMENT REFUSE LA LIGNE NON CALCULÉE, ET LE DIT', () => {
    const g = getGenerator('lit.developpement');
    // On prend la première question simple : k(x + b), celle de Rémy.
    const item = g.generate({ etapes: 'oui' },
        { rng: makeRng('e1'), weakTables: [], difficulty: null, index: 0 });
    const enonce = item.prompt.papier;          // « Développer et réduire : 8(x + 4) »
    const m = /(\d+)\(x \+ (\d+)\)/.exec(enonce);
    assert.ok(m, 'on attend une question de la forme k(x + b) — lu : ' + enonce);
    const k = Number(m[1]), b = Number(m[2]);

    const nonCalcule = item.verifieTexte(`${k}*x+${k}*${b}`);
    assert.equal(nonCalcule.juste, false, 'la ligne non calculée ne passe pas');
    // CE N'EST PAS UNE FAUTE, C'EST UNE MOITIÉ DE TRAVAIL. `inacheve` dit à
    // l'activité de ne PAS soumettre : l'élève a développé, et c'est la partie
    // difficile. Lui retirer une vie pour la ligne qu'il allait écrire lui
    // apprendrait à se méfier de la ligne intermédiaire.
    assert.equal(nonCalcule.inacheve, true, 'et ce n\'est pas compté comme une erreur');
    assert.match(nonCalcule.pourquoi, /produit de deux NOMBRES/,
        'le message doit dire CE QUI manque, pas « faux »');

    // ET LA RÉPONSE JUSTE PASSE, avec ou sans le signe × entre le nombre et x.
    assert.equal(item.verifieTexte(`${k}x+${k * b}`).juste, true);
    assert.equal(item.verifieTexte(`${k}*x+${k * b}`).juste, true,
        '« 8 × x + 32 » est la bonne réponse écrite autrement');
});

test('L\'ASTÉRISQUE EST BRANCHÉ SUR LE CHAMP, et seulement où le × existe', () => {
    // Un essai qui vérifie la RÈGLE et pas son EMPLOI laisse passer la refonte
    // qui emporte la touche. On lit donc le clavier de l'activité.
    // Le RENDU, lui, est mesuré au navigateur : `tools/tmp/devPasAPas.mjs`
    // tape « 3 » puis « * » et lit « 3× » dans le champ.
    const texte = readFileSync(new URL('../js/core/activities/litteralSaisie.js',
        import.meta.url), 'utf8');
    assert.match(texte, /e\.key === '\*' && m\.multiplication/,
        'l\'astérieque doit écrire le signe fois, là où le pavé porte la touche ×');
    // CETTE LIGNE ÉPINGLAIT `taper('×')`, ET LE SIGNE EST DEVENU UN RÉGLAGE.
    // Rémy : « dans les paramètres d'affichage, propose aussi le x […] ou
    // l'astérisque ». L'intention de l'épreuve n'a pas bougé d'un mot — la
    // touche écrit LE SIGNE DE MULTIPLICATION et non l'astérisque brut — mais
    // ce signe se lit maintenant dans `signeFois.js`, et il vaut « × » tant
    // que personne n'a rien changé.
    assert.match(texte, /taper\(glypheFois\(\)\)/,
        'et écrire le signe de multiplication du moment, pas l\'astérisque');
    assert.match(texte, /import \{ glypheFois \} from '\.\.\/signeFois\.js';/,
        'ce qui suppose que la touche sache où le demander');
});
