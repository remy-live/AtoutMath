// L'AIDE VIENT À L'ÉLÈVE BLOQUÉ SANS QU'IL AIT À LA DEMANDER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « des élèves en difficulté ont eu pas mal de soucis sur les tableaux à
// compléter. J'ai des idées est ce que quand l'élève fait beaucoup d'erreurs on
// fait clignoter le bouton indice ou montre moi et quand c'est la calculatrice
// le clignotement est discret il faudrait une couleur plus visible ».
//
// CE QUE LE TABLEAU FAISAIT DÉJÀ, et qui n'était pas en cause : chaque case
// fausse est EXPLIQUÉE (`pourquoiFaux`), et « 💡 Aide-moi » désigne la
// prochaine case déductible en l'entourant. L'aide était là, gratuite et
// illimitée. Le défaut n'était pas son absence : celui qui sait que « Aide-moi »
// va l'aider n'en a pas besoin, et celui qui en a besoin ne le sait pas.
//
// LE SIGNAL EST LA CASE, PAS LE TABLEAU, et c'est la décision que ces épreuves
// gardent. Huit erreurs réparties sur huit cases, c'est un élève qui tâtonne et
// qui avance ; DEUX sur la MÊME case, c'est un élève arrêté — la première
// erreur apprend quelque chose, la seconde dit que ça n'a pas suffi. Un
// compteur par tableau ferait sauter l'aide sur un élève qui progresse, ce qui
// est exactement la façon de la rendre invisible à force d'être là.
//
// ── CE QUE CES ÉPREUVES NE REMPLACENT PAS ─────────────────────────────────
//
// `tools/eleveBloqueDevantLeTableau.mjs` joue l'élève en difficulté dans un
// vrai navigateur : il tape deux fois un nombre faux dans la même case et
// MESURE ce qu'elle a sous les yeux — la phrase, la couleur de l'encre sur les
// pixels, l'anneau du bouton, la case entourée. C'est lui qui a trouvé que le
// conseil sortait en rouge, comme une seconde réprimande (photo :
// `tools/tmp/tableau-bloque.png`). Il ne tourne pas à chaque commit ; ces
// épreuves-ci gardent l'ACCORD entre les six morceaux, qui est ce qui se défait
// tout seul — un seuil déplacé, un `rates` oublié dans `poser`, une règle CSS
// renommée, et le mécanisme devient muet SANS LA MOINDRE ERREUR.

import test from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle as aideCorps, declare, valeurDe } from './aidesCss.mjs';

const SOURCE = 'js/games/tableauCroise.js';
const source = lireFeuille(SOURCE);
const UI = lireFeuille('css/ui.css');

/** Le corps d'une méthode de classe, indentée de quatre espaces. */
function methode(src, nom) {
    const debut = src.indexOf(`\n    ${nom}`);
    assert.notEqual(debut, -1, `la méthode « ${nom} » a disparu de ${SOURCE}`);
    const fin = src.indexOf('\n    }', debut);
    assert.notEqual(fin, -1, `la méthode « ${nom} » ne se referme pas`);
    return src.slice(debut, fin);
}

test('ON COMPTE LES ERREURS PAR CASE, PAS PAR TABLEAU', () => {
    const corps = methode(source, 'valider(el)');
    // LA CLÉ EST LA CASE. Un compteur global — `this.rates = this.rates + 1` —
    // déclencherait l'aide au deuxième nombre faux du tableau, où qu'il soit :
    // l'élève qui tâtonne case après case et qui AVANCE verrait l'aide lui
    // sauter dessus, et ce qui est permanent n'attire plus l'œil.
    assert.match(corps, /const k = cle\(r, c\);\s*\n\s*this\.rates\[k\] = \(this\.rates\[k\] \|\| 0\) \+ 1;/,
        'le compteur d\'erreurs n\'est plus indexé par la case.\n'
        + 'Un compteur par TABLEAU déclenche l\'aide sur un élève qui progresse :\n'
        + 'huit erreurs sur huit cases, c\'est quelqu\'un qui cherche et qui avance ;\n'
        + 'deux sur la même case, c\'est quelqu\'un d\'arrêté. Seule la seconde\n'
        + 'situation demande qu\'on vienne à lui.');
});

test('UNE PREMIÈRE ERREUR ENSEIGNE, LA DEUXIÈME SUR LA MÊME CASE APPELLE L\'AIDE', () => {
    const corps = methode(source, 'valider(el)');
    // LE SEUIL EST DEUX, et il se défend des deux côtés. À UN, l'aide arrive
    // avant que l'explication n'ait eu sa chance — or l'explication SUFFIT la
    // plupart du temps : elle nomme l'erreur de cet exercice (« on a additionné
    // là où il fallait soustraire »). À TROIS, l'élève a retapé deux fois dans
    // le vide, et c'est précisément le moment qu'on voulait lui épargner.
    assert.match(corps, /if \(this\.rates\[k\] >= 2\) \{\s*\n\s*this\.aider\(this\.pourquoiFaux\(r, c, n\)\);/,
        'la deuxième erreur sur la même case n\'appelle plus l\'aide toute seule.\n'
        + 'Rémy : « est ce que quand l\'élève fait beaucoup d\'erreurs on fait\n'
        + 'clignoter le bouton indice ou montre moi ».');
    // ET LA PREMIÈRE ERREUR GARDE SON EXPLICATION. C'est elle qui apprend
    // quelque chose ; la remplacer par un conseil dès le premier essai
    // retirerait à l'élève la seule phrase qui nomme SON erreur.
    assert.match(corps, /this\.note\(this\.pourquoiFaux\(r, c, n\), 'ko'\);/,
        'la première erreur ne dit plus POURQUOI elle est fausse');
});

test('UN TABLEAU NEUF REPART D\'UN COMPTEUR VIDE', () => {
    // SANS CELA, LA CORRECTION SE RETOURNE CONTRE L'ÉLÈVE : le deuxième tableau
    // s'ouvrirait avec les cases du premier déjà « ratées deux fois », et la
    // première erreur y ferait battre le bouton. Même piège que les boutons de
    // la pyramide, et il se défait de la même façon — en oubliant une ligne
    // dans `poser`.
    assert.match(methode(source, 'poser()'), /this\.rates = \{\};/,
        'un tableau neuf garde le compteur d\'erreurs du précédent');
    assert.match(methode(source, 'effacer()'), /this\.rates = \{\};/,
        '« Effacer » laisse le compteur d\'erreurs en place : l\'élève qui\n'
        + 'repart de zéro verrait l\'aide à sa première erreur');
});

test('L\'EXPLICATION NE DISPARAÎT PAS SOUS LES YEUX DE L\'ÉLÈVE', () => {
    const corps = methode(source, 'aider(pourquoi = \'\')');
    // ELLE ÉTAIT PEUT-ÊTRE EN TRAIN DE LA LIRE. L'aide arrive sans qu'on l'ait
    // demandée : remplacer la phrase affichée par une autre au moment où elle
    // se penche sur l'écran, c'est lui retirer ce qu'elle cherchait. On ajoute,
    // on ne remplace pas.
    assert.match(corps, /\$\{pourquoi\}<br><span class="tc-conseil">\$\{conseil\(this\.tableau, this\.saisies\)\}<\/span>/,
        'l\'aide spontanée remplace l\'explication de l\'erreur au lieu de s\'y\n'
        + 'ajouter : la phrase qui nomme son erreur disparaît pendant qu\'elle la lit.');
    // ET « AIDE-MOI » À LA MAIN NE CHANGE PAS : le conseil seul, sans
    // reproche — il n'a rien fait de faux en demandant de l'aide.
    assert.match(corps, /: conseil\(this\.tableau, this\.saisies\), pourquoi \? 'ko' : undefined\)/,
        'le bouton « Aide-moi » ne donne plus le conseil seul');
});

test('LE CONSEIL N\'EST PAS ÉCRIT DANS LA COULEUR DU REPROCHE', () => {
    // VU SUR LA PHOTO, pas déduit : les deux phrases sortaient du même rouge, et
    // celle qui aide se lisait comme une seconde réprimande. Le rouge dit
    // « non », pas « voici comment ».
    const conseil = aideCorps(source, '.tc-conseil', { ou: SOURCE });
    const reproche = aideCorps(source, '.tc-note--ko', { ou: SOURCE });
    const cConseil = valeurDe(conseil, 'color');
    const cReproche = valeurDe(reproche, 'color');
    assert.ok(cConseil && cConseil !== cReproche,
        'le conseil est écrit dans la couleur du reproche '
        + `(${cConseil} contre ${cReproche}).\n`
        + 'Les deux phrases se suivent dans la même note : si elles ont la même\n'
        + 'encre, l\'élève lit deux fois « non » et jamais « voici comment ».');
    assert.ok(declare(conseil, 'font-weight', '700'),
        'le conseil n\'est plus en gras : c\'est la phrase qu\'on doit lire,\n'
        + 'et elle vient APRÈS une phrase rouge qui attire l\'œil toute seule.');
});

test('LE BOUTON D\'AIDE SE RAPPELLE À L\'ŒIL — ET SEULEMENT QUAND L\'AIDE VIENT TOUTE SEULE', () => {
    const corps = methode(source, 'aider(pourquoi = \'\')');
    // LE BATTEMENT EST UN APPEL, PAS UN ACCUSÉ DE RÉCEPTION. Le faire battre
    // quand l'élève vient de le toucher, c'est lui répondre « j'ai bien vu que
    // tu m'as touché » — du bruit sur un geste qu'il maîtrise déjà.
    assert.match(corps, /if \(pourquoi\) \{[\s\S]*?querySelector\('\[data-aide\]'\)/,
        'le bouton bat aussi quand l\'élève vient de le cliquer lui-même');
    // LE RETRAIT, LE REFLOW, PUIS LA REMISE. Sans le `void b.offsetWidth`,
    // l'animation ne rejoue pas la deuxième fois : pour le navigateur, la classe
    // n'a jamais quitté l'élément — rien n'a changé, donc rien ne rejoue. Un
    // élève bloqué sur une deuxième case ne verrait alors plus rien battre.
    assert.match(corps, /remove\('tc-btn--appel'\);\s*\n\s*void b\.offsetWidth;\s*\n\s*b\.classList\.add\('tc-btn--appel'\);/,
        'le battement du bouton ne rejouera pas une seconde fois : sans le\n'
        + 'reflow entre le retrait et la remise de la classe, le navigateur ne\n'
        + 'voit aucun changement et ne relance pas l\'animation.');
    // ET LA CASE SUIVANTE EST ENTOURÉE. Lire « la colonne Mardi » et devoir la
    // chercher des yeux ajoute une difficulté qui n'est pas celle de l'exercice.
    assert.match(corps, /td\.classList\.add\('tc-vise'\)/,
        'l\'aide ne montre plus OÙ aller : elle le dit en mots seulement');
});

test('IL BAT EN AMBRE, LA COULEUR QUE RIEN D\'AUTRE N\'UTILISE DANS CETTE BARRE', () => {
    const regle = aideCorps(source, '.tc-btn--appel', { ou: SOURCE });
    assert.ok(declare(regle, 'animation', 'tc-appel'),
        'le bouton d\'aide ne bat plus du tout');
    // TROIS BATTEMENTS, PUIS PLUS RIEN. Un clignotement sans fin cesse d'être
    // vu au bout d'une minute et devient agaçant — et ici il resterait allumé
    // pendant tout le reste du tableau.
    assert.match(regle, /animation:[^;]*\s3;/,
        'le battement ne s\'arrête plus au bout de trois : un bouton qui\n'
        + 'clignote sans fin n\'attire plus l\'œil, il agace.');
    // L'AMBRE EST LA COULEUR QUE LE DÉPÔT RÉSERVE À « REGARDE ICI », et elle
    // n'est utilisée nulle part ailleurs dans cette barre : elle ne se confond
    // donc avec rien. Rémy, sur l'autre battement : « le clignotement est
    // discret il faudrait une couleur plus visible ».
    const battement = source.slice(source.indexOf('@keyframes tc-appel'));
    const bloc = battement.slice(0, battement.indexOf('\n                }'));
    assert.match(bloc, /box-shadow: 0 0 0 6px var\(--warning\)/,
        'l\'anneau du bouton d\'aide n\'est plus en ambre plein. En `--primary`\n'
        + 'à demi transparent, il bat dans la teinte de tout le reste de la\n'
        + 'barre, sur un fond clair : mesuré sur la calculatrice, on ne le\n'
        + 'voyait pas.');
    // ET CELUI QUI NE SUPPORTE PAS LES ANIMATIONS VOIT QUAND MÊME QUELQUE
    // CHOSE. `animation: none` tout seul rendrait le bouton muet pour lui, et
    // c'est l'élève qu'on vient d'identifier comme bloqué.
    const calme = source.slice(source.indexOf('prefers-reduced-motion',
        source.indexOf('@keyframes tc-appel')));
    assert.match(calme.slice(0, 400), /\.tc-btn--appel \{ animation: none;[\s\S]*?box-shadow: 0 0 0 3px var\(--warning\)/,
        'sans animation, le bouton d\'aide ne se distingue plus du tout :\n'
        + 'il faut lui laisser son anneau, fixe.');
});

test('LA CALCULATRICE DISPONIBLE BAT DANS LA MÊME COULEUR, ET PLEINE', () => {
    // RÉMY, dans la même phrase que la précédente : « quand c'est la
    // calculatrice le clignotement est discret il faudrait une couleur plus
    // visible ». Le halo était en `--primary` à 40 % — la teinte de tout le
    // reste de l'en-tête, posée en transparence sur un fond clair.
    const bloc = UI.slice(UI.indexOf('@keyframes calc-dispo'));
    const corps = bloc.slice(0, bloc.indexOf('\n}'));
    assert.match(corps, /box-shadow: 0 0 0 6px var\(--warning\)/,
        'le halo de la calculatrice disponible est redevenu discret.\n'
        + 'Rémy : « quand c\'est la calculatrice le clignotement est discret il\n'
        + 'faudrait une couleur plus visible ».');
    assert.ok(!/color-mix\(in srgb, var\(--primary\)[^)]*\d+%/.test(corps),
        'le halo repasse par `--primary` en transparence : c\'est la couleur de\n'
        + 'tout le reste de la barre, et c\'est exactement ce qui le rendait\n'
        + 'invisible.');
});
