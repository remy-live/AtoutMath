// CE QUI EST ÉGAL MAIS PAS FINI SE DIT, MÊME AU MILIEU D'UNE CHAÎNE.
//
// Rémy, capture d'iPhone sur « Fractions pas à pas ». L'énoncé : 1/4 + 5/4. La
// ligne en cours : « On ajoute les numérateurs, le dénominateur ne bouge pas ».
// Dans le champ, en rouge : 6/4. Et son message : « je sais que je n'ai pas
// simplifié mais il me dit faux ».
//
// IL AVAIT RAISON, ET LE LOGICIEL LE SAVAIT DÉJÀ. `verifieTexte` répond pour
// 6/4 : `{ juste: false, inacheve: true, pourquoi: "C'est bien égal, mais ce
// n'est pas fini : la fraction se simplifie encore." }` — la phrase de Rémy,
// écrite dans le code, et jetée. On retombait sur le juge de la LIGNE, qui
// répondait tout autre chose : « à cette ligne on REGROUPE, on ne calcule pas
// encore ». Le bon reproche existait ; c'est le mauvais qui sortait.
//
// MESURÉ DANS UN NAVIGATEUR, la même intention jugée deux fois :
//
//     8/5 + 9/5, on tape 17/5 ... « Parfait ! +10 »
//     4/3 + 2/3, on tape  6/3 ... REFUSÉ, et pour le mauvais motif
//
// Le même geste, deux verdicts — la seule différence étant que 17/5 est déjà
// réduit, donc reconnu par `sautDirect`. Une règle qu'on ne peut pas apprendre
// n'est pas une règle.
//
// APRÈS, sur trois questions (chacune dans son propre passage, parce qu'une
// ligne acceptée change la ligne suivante) :
//
//     la forme regroupée   (3+5)/4  → acceptée, c'est ce que l'étape demande
//     la somme non réduite  8/4     → PRESQUE, « ça se simplifie encore »,
//                                     et AUCUNE vie perdue — score inchangé
//     la réponse directe    2       → acceptée, score 1/8
//
// ON NE L'ACCEPTE DONC PAS : la ligne finale demande la forme réduite, et la
// donner reste le travail. On dit seulement LEQUEL des deux reproches est le
// bon — et `signalerInacheve` ne soumet rien, donc l'élève ne perd rien à
// s'être arrêté à mi-chemin.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const LS = readFileSync(
    new URL('../js/core/activities/litteralSaisie.js', import.meta.url), 'utf8');

test('UNE LIGNE ÉGALE MAIS NON RÉDUITE DIT « PAS FINI », PAS « NE CALCULE PAS »', () => {
    const i = LS.indexOf('const valider = () => {');
    assert.ok(i > 0, 'la validation doit exister');
    const bloc = LS.slice(i, i + 2600);
    assert.match(bloc, /if \(etapes\.length && !etapes\[rang\]\.finale && !sautDirect\(saisie\)\) \{/,
        'le cas se traite là où l\'on renonçait au saut direct');
    assert.match(bloc, /const presque = item\.verifieTexte \? item\.verifieTexte\(saisie\) : null;/,
        'on redemande à l\'item ce qu\'il en pense : c\'est lui qui sait que la '
        + 'valeur est bonne et la forme inachevée');
    assert.match(bloc, /if \(presque && typeof presque === 'object' && presque\.inacheve\) \{\s*\n\s*return signalerInacheve\(presque\.pourquoi \|\| ''\);/,
        'et l\'on dit CE reproche-là, pas celui de la ligne');
    // L'ORDRE COMPTE : le juge de la ligne reste le cas ordinaire. Le mettre en
    // premier ramènerait le défaut exactement tel qu'il était.
    const iPresque = bloc.indexOf('presque.inacheve');
    const iLigne = bloc.indexOf('return validerEtape();');
    assert.ok(iPresque > 0 && iLigne > iPresque,
        '`validerEtape` reste le cas ordinaire, APRÈS le cas de l\'inachevé');
});

test('ET CE N\'EST PAS UNE FAUTE : RIEN N\'EST SOUMIS', () => {
    // `signalerInacheve` colorie, explique et rend la main. Il ne passe pas par
    // `session.submit`, donc la séance n'en sait rien : pas de vie perdue, pas
    // d'erreur au carnet. C'est ce qui rend acceptable de refuser une réponse
    // dont la VALEUR est juste — on ne punit pas la moitié du travail.
    const i = LS.indexOf('const signalerInacheve = (pourquoi) => {');
    assert.ok(i > 0, 'le signalement doit exister');
    const bloc = LS.slice(i, LS.indexOf('};', i));
    assert.doesNotMatch(bloc, /session\.submit/,
        'un inachevé ne se soumet pas : la séance n\'a pas à compter une faute '
        + 'qui n\'en est pas une');
    assert.match(bloc, /champ\.classList\.add\('ls-champ--presque'\);/,
        'et le champ le dit dans sa couleur — ni vert, ni rouge');
});

test('LE SAUT DIRECT RESTE CE QUE RÉMY A DEMANDÉ', () => {
    // « on peut tolérer si l'élève marque directement la version simplifiée ».
    // Le correctif ne doit pas l'avoir défait : celui qui écrit la réponse
    // réduite d'un coup la voit acceptée, et la question compte.
    const i = LS.indexOf('const sautDirect = (texte) => {');
    assert.ok(i > 0);
    const bloc = LS.slice(i, i + 400);
    assert.match(bloc, /const v = item\.verifieTexte\(texte\);\s*\n\s*if \(!v \|\| !v\.juste\) return false;/,
        'le saut direct exige toujours une réponse JUSTE — c\'est justement ce '
        + 'qui laissait 6/4 sans explication, et c\'est le nouveau cas qui le '
        + 'rattrape, pas un assouplissement de celui-ci');
    assert.match(bloc, /rang = etapes\.length - 1;/,
        'et il pose la réponse sur la dernière ligne');
});
