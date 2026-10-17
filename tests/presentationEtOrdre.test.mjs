// L'ORDRE ET LA PRÉSENTATION D'UNE SÉANCE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « en évaluation, penses-tu qu'il faille imposer un ordre ou on laisse
// au choix ? Il faudrait pouvoir peut-être choisir la présentation, qu'en
// penses-tu ? » — puis, la proposition faite : « 1 ordre libre. Le 2, par
// séance et par défaut celle façon duolingo. »
//
// DEUX RÉGLAGES QUI RÉPONDENT À LA MÊME QUESTION : comment l'élève traverse la
// séance. Ils vivent donc côte à côte dans la politique du parcours, et non
// l'un dans la politique et l'autre dans le navigateur de l'élève — qui est
// exactement d'où la présentation vient d'être sortie.
//
// MESURÉ au navigateur, cinq étapes, par le chemin de l'élève
// (`tools/tmp/presentationSeance.mjs`), en demandant à `statutEtape` — celle
// que lisent les trois habillages et que teste `onNodeClick` — combien
// d'étapes il peut lancer :
//
//                                avant           après
//   évaluation d'usine           1 / 5           5 / 5
//   entraînement d'usine         1 / 5           1 / 5   (inchangé)
//
// Et l'habillage dessiné, séance par séance : « chemin » → chemin,
// « mondes » → carte des mondes, « classique » → liste (4 cadenas dessinés
// pour 4 étapes verrouillées : le dessin dit la même chose que la règle),
// « libre » → les trois boutons reviennent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    defaultPolicy, evaluationPolicy, apprentissagePolicy, resolvePolicy, describePolicy
} from '../js/core/policy.js';
import { Shortcodes } from '../js/core/shortcodes.js';
import { makeStep } from '../js/core/path.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ── 1 · L'ORDRE LIBRE EN ÉVALUATION ─────────────────────────────────────────

test('UNE ÉVALUATION LAISSE L\'ORDRE LIBRE', () => {
    // Sur une feuille de papier, l'élève bloqué sur l'exercice 2 saute au 4 ;
    // personne n'a jamais appelé cela de la triche. L'ordre imposé transformait
    // un blocage en zéro sur tout ce qui suit.
    assert.equal(evaluationPolicy().ordreLibre, true);
});

test('ET C\'EST LE CONTRAIRE PARTOUT AILLEURS', () => {
    // En entraînement, l'ordre porte la progression, et « quatre exercices PUIS
    // un jeu » n'a plus de règle si l'on peut commencer par la fin.
    assert.equal(defaultPolicy().ordreLibre, false);
    assert.equal(apprentissagePolicy().ordreLibre, false);
});

test('LE PROFESSEUR PEUT ENCORE IMPOSER L\'ORDRE D\'UNE INTERROGATION', () => {
    // C'est un défaut, pas une loi : la case existe toujours, et ce qu'elle dit
    // l'emporte sur le mode.
    assert.equal(resolvePolicy({ ...evaluationPolicy(), ordreLibre: false }).ordreLibre, false);
    assert.match(lire('js/games/configUI.js'), /id="cfg-ordre-libre"/);
});

test('ET ON LE DIT À L\'ÉLÈVE — UN DROIT QU\'ON N\'ANNONCE PAS N\'EST PAS EXERCÉ', () => {
    // Celui que la règle est censée sauver est justement celui qui ne devinera
    // pas tout seul qu'il a le droit de sauter.
    assert.match(describePolicy(evaluationPolicy()), /L'ordre des exercices est libre\./);
    // Et la phrase disparaît quand le professeur rétablit l'ordre imposé :
    // sinon elle mentirait, ce qui est pire que se taire.
    assert.ok(!/ordre des exercices est libre/.test(
        describePolicy({ ...evaluationPolicy(), ordreLibre: false })));
    assert.ok(!/ordre des exercices est libre/.test(describePolicy(defaultPolicy())));
    // ET SANS TUTOIEMENT. La même phrase s'affiche dans le bandeau du
    // professeur qui compose la séance — mesuré sur sa capture d'écran. Les
    // quatre phrases de cette fonction servent deux lecteurs : aucune ne
    // s'adresse à l'un des deux.
    [describePolicy(evaluationPolicy()), describePolicy(defaultPolicy())]
        .forEach(t => assert.ok(!/\btu\b|\bton\b|\btes\b/i.test(t), t));
});

// ── 2 · LA PRÉSENTATION, PAR SÉANCE ─────────────────────────────────────────

test('LA PRÉSENTATION EST UN RÉGLAGE DE LA SÉANCE, ET PAR DÉFAUT LE CHEMIN', () => {
    // « par séance et par défaut celle façon duolingo ».
    assert.equal(defaultPolicy().presentation, 'chemin');
    assert.equal(evaluationPolicy().presentation, 'chemin');
    assert.equal(apprentissagePolicy().presentation, 'chemin');
});

test('LES QUATRE VALEURS EXISTENT, DONT CELLE QUI REND LA MAIN', () => {
    const PV = lire('js/ui/pathView.js');
    ['chemin', 'mondes', 'classique'].forEach(id =>
        assert.ok(new RegExp(`id: '${id}'`).test(PV), id));
    // `libre` n'est pas un habillage : c'est l'absence d'imposition. Il ne doit
    // donc PAS figurer dans la liste des habillages, sinon on dessinerait une
    // carte « libre » qui n'existe pas.
    assert.ok(!/id: 'libre'/.test(PV));
    assert.match(PV, /export function presentationImposee\(policy\) \{/);
    assert.match(PV, /return STYLES\.some\(s => s\.id === v\) \? v : null;/);
    // Les quatre choix du professeur, eux, sont bien là.
    const CFG = lire('js/games/configUI.js');
    ['chemin', 'mondes', 'classique', 'libre'].forEach(v =>
        assert.ok(new RegExp(`<option value="${v}"`).test(CFG), v));
});

test('LE CHEMIN EST LE PREMIER BOUTON, PARCE QU\'IL EST LE DÉFAUT', () => {
    // L'ordre de la liste est l'ordre des boutons, et le premier est celui
    // qu'on vise sans lire.
    const PV = lire('js/ui/pathView.js');
    const liste = PV.slice(PV.indexOf('const STYLES = ['), PV.indexOf('const PAR_DEFAUT'));
    assert.ok(liste.indexOf("id: 'chemin'") < liste.indexOf("id: 'mondes'"));
    assert.match(PV, /const PAR_DEFAUT = 'chemin';/);
});

test('QUAND LA SÉANCE IMPOSE, LES BOUTONS D\'HABILLAGE DISPARAISSENT', () => {
    // Les laisser en place et ignorer les clics serait le pire des deux
    // mondes : l'élève appuierait trois fois avant de comprendre qu'on lui
    // ment. MESURÉ : 0 bouton sur les trois habillages imposés, 3 sur « libre ».
    const PV = lire('js/ui/pathView.js');
    assert.match(PV, /export function barreDeStyles\(onChange, policy = null\) \{\s*\n\s*if \(presentationImposee\(policy\)\) return null;/);
    // Les deux appelants doivent tester le retour : `appendChild(null)` lève,
    // et c'est toute la vue qui s'arrêterait.
    assert.match(PV, /const boutonsDHabillage = styleSwitcher\(policy\);\s*\n\s*if \(boutonsDHabillage\)/);
    const R = lire('js/core/runner.js');
    assert.match(R, /const boutonsDHabillage = carte\.barreDeStyles\(\(\) => this\.showPathMap\(\), this\.policy\);\s*\n\s*if \(boutonsDHabillage\)/);
});

test('ET LES DEUX ÉCRANS DESSINENT BIEN L\'HABILLAGE DE LA SÉANCE', () => {
    // Cacher les boutons sans changer le dessin aurait figé tout le monde sur
    // le choix du poste — c'est-à-dire l'inverse de ce qui est demandé.
    assert.match(lire('js/ui/pathView.js'), /style: styleDeLaSeance\(policy\),/);
    assert.match(lire('js/core/runner.js'), /style: carte\.styleDeLaSeance\(this\.policy\),/);
});

test('UN PARCOURS SANS RÉGLAGE N\'IMPOSE RIEN DE LUI-MÊME', () => {
    // `presentationImposee` ne lit QUE ce qui est écrit : une valeur inconnue,
    // vide ou `libre` rend la main. C'est ce qui rend le réglage sûr à ajouter
    // — aucun parcours existant ne se met à imposer dans le dos de son auteur.
    const PV = lire('js/ui/pathView.js');
    assert.match(PV, /const v = policy && policy\.presentation;/);
    // Et `styleDeLaSeance` retombe alors sur le choix du poste.
    assert.match(PV, /return presentationImposee\(policy\) \|\| getPathStyle\(\);/);
});

// ── LES DEUX VOYAGENT AVEC LA SÉANCE ────────────────────────────────────────

test('LE CODE ÉLÈVE EMPORTE L\'ORDRE ET LA PRÉSENTATION', () => {
    // Un réglage qui ne suit pas le lien n'est pas un réglage de la séance :
    // le professeur choisirait la liste classique et ses élèves recevraient
    // le chemin.
    const parcours = {
        id: 'p1', name: 'Interro', version: 2,
        policy: { ...evaluationPolicy(), presentation: 'classique', ordreLibre: false },
        steps: [makeStep('calc-add', {}), makeStep('frac-simplifier', {})]
    };
    const relu = resolvePolicy(Shortcodes.decodePath(Shortcodes.encodePath(parcours)).policy);
    assert.equal(relu.presentation, 'classique');
    assert.equal(relu.ordreLibre, false);
    // Et le défaut fait l'aller-retour sans se perdre non plus.
    const nu = { ...parcours, policy: evaluationPolicy() };
    const reluNu = resolvePolicy(Shortcodes.decodePath(Shortcodes.encodePath(nu)).policy);
    assert.equal(reluNu.presentation, 'chemin');
    assert.equal(reluNu.ordreLibre, true);
});

test('LE PROFESSEUR VOIT CE QUE SON CHOIX FAIT', () => {
    // Un menu déroulant sans conséquence écrite est un menu qu'on bascule pour
    // voir. Celui-ci fait disparaître trois boutons de l'écran d'un enfant.
    const CFG = lire('js/games/configUI.js');
    assert.match(CFG, /<label class="cfg-label" for="cfg-presentation">Présentation<\/label>/);
    assert.match(CFG, /les trois boutons d'habillage disparaissent de son écran/);
    // Et il est enregistré : un réglage qui s'affiche sans se sauver est pire
    // qu'un réglage absent.
    assert.match(CFG, /presentation: \(document\.getElementById\('cfg-presentation'\) \|\| \{\}\)\.value \|\| base\.presentation,/);
});
