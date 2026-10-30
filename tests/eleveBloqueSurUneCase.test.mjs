// L'ÉLÈVE ARRÊTÉ REÇOIT UNE DÉMONSTRATION, PAS UN PARAGRAPHE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, en deux temps. D'abord : « des élèves en difficulté ont eu pas mal de
// soucis sur les tableaux à compléter. J'ai des idées est ce que quand l'élève
// fait beaucoup d'erreurs on fait clignoter le bouton indice ou montre moi ».
// Puis, devant ce que j'en avais fait : « tes phrases son tellement longues et
// compliquées elles ne seront pas lues pour le remplissage du tableau il faut
// du visuel tu sélectionnes les cellules tu montres bien ».
//
// LA SECONDE PHRASE TRANCHE AUTRE CHOSE QUE LA LONGUEUR : ce n'est pas la
// phrase qui est trop longue, c'est le MÉDIA qui est faux. Un élève arrêté
// devant un tableau ne lit pas un paragraphe sur la méthode, il regarde le
// tableau. Ces épreuves gardent donc deux choses : que le signal soit LA CASE
// et non le tableau, et que la réponse soit MONTRÉE et non écrite.
//
// ── CE QU'ELLES NE REMPLACENT PAS ─────────────────────────────────────────
//
// `tools/eleveBloqueDevantLeTableau.mjs` joue l'élève en difficulté dans un
// vrai navigateur : deux nombres faux dans la MÊME case, puis il mesure
// l'extinction sur les PIXELS, compare les nombres de la bande à ceux des
// cases allumées, **fait le calcul qu'on vient de montrer et vérifie que la
// case tombe juste**. C'est lui la preuve ; celles-ci gardent l'accord entre
// les morceaux, qui est ce qui se défait tout seul — un seuil déplacé, un
// `rates` oublié dans `poser`, une couleur changée d'un seul côté, et le
// mécanisme devient muet SANS LA MOINDRE ERREUR.

import test from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle as aideCorps, declare, valeurDe } from './aidesCss.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    genererTableau, prochaineLigne, cle, estDonnee, PALIERS
} from '../js/core/tableauCroise.js';

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

// ── LE SIGNAL EST LA CASE ──────────────────────────────────────────────────

test('ON COMPTE LES ERREURS PAR CASE, PAS PAR TABLEAU', () => {
    const corps = methode(source, 'valider(el)');
    // LA CLÉ EST LA CASE. Un compteur global — `this.rates = this.rates + 1` —
    // déclencherait la démonstration au deuxième nombre faux du tableau, où
    // qu'il soit : l'élève qui tâtonne case après case et qui AVANCE verrait
    // son tableau s'éteindre sous les yeux, et ce qui arrive tout le temps ne
    // signale plus rien.
    assert.match(corps, /const k = cle\(r, c\);\s*\n\s*this\.rates\[k\] = \(this\.rates\[k\] \|\| 0\) \+ 1;/,
        'le compteur d\'erreurs n\'est plus indexé par la case.\n'
        + 'Huit erreurs sur huit cases, c\'est quelqu\'un qui cherche et qui avance ;\n'
        + 'deux sur la même case, c\'est quelqu\'un d\'arrêté. Seule la seconde\n'
        + 'situation demande qu\'on vienne à lui.');
});

test('UNE PREMIÈRE ERREUR DONNE LE SENS, LA DEUXIÈME MONTRE LE CALCUL', () => {
    const corps = methode(source, 'valider(el)');
    // LE SEUIL EST DEUX, et il se défend des deux côtés. À UN, on éteint le
    // tableau de quelqu'un qui se serait corrigé tout seul. À TROIS, il a
    // retapé deux fois dans le vide — c'est le moment qu'on voulait lui
    // épargner.
    assert.match(corps, /if \(this\.rates\[k\] >= 2\) \{\s*\n\s*this\.aider\(this\.pourquoiFaux\(r, c, n\)\);/,
        'la deuxième erreur sur la même case ne déclenche plus la démonstration.');
    assert.match(corps, /this\.note\(this\.pourquoiFaux\(r, c, n\), 'ko'\);/,
        'la première erreur ne dit plus dans quel sens aller');
});

test('UN TABLEAU NEUF REPART D\'UN COMPTEUR VIDE', () => {
    // SANS CELA, LA CORRECTION SE RETOURNE CONTRE L'ÉLÈVE : le deuxième tableau
    // s'ouvrirait avec les cases du premier déjà « ratées deux fois », et la
    // première erreur y éteindrait tout.
    assert.match(methode(source, 'poser()'), /this\.rates = \{\};/,
        'un tableau neuf garde le compteur d\'erreurs du précédent');
    assert.match(methode(source, 'effacer()'), /this\.rates = \{\};/,
        '« Recommencer » laisse le compteur d\'erreurs en place');
});

// ── ON MONTRE, ON N'ÉCRIT PAS ──────────────────────────────────────────────

test('CE QUI EST ÉCRIT SOUS LA CASE FAUSSE TIENT EN TROIS MOTS', () => {
    // LA VERSION D'AVANT FAISAIT TRENTE-DEUX MOTS : « Trop grand. Cette case
    // est DANS le tableau, pas dans les totaux : on part du total de sa ligne
    // (ou de sa colonne) et on RETIRE ce qu'on y a déjà. » Elle était juste, et
    // elle n'était pas lue.
    const corps = methode(source, 'pourquoiFaux(r, c, n)');
    const rendus = [...corps.matchAll(/return ('[^']*'|`[^`]*`);/g)].map(m => m[1].slice(1, -1));
    assert.ok(rendus.length >= 2, 'la méthode ne rend plus de verdict du tout');
    rendus.forEach((t) => {
        const mots = t.trim().split(/\s+/).length;
        assert.ok(mots <= 3,
            `« ${t} » fait ${mots} mots sous une case fausse.\n`
            + 'Rémy : « tes phrases son tellement longues et compliquées elles ne\n'
            + 'seront pas lues ». La méthode se MONTRE sur le tableau ; il ne reste\n'
            + 'ici que le sens dans lequel aller.');
    });
    // ET LA FLÈCHE, QUI SE LIT SANS LIRE. C'est elle qui porte l'information
    // pour qui ne lit pas les deux mots.
    assert.ok(rendus.some(t => t.includes('↓')) && rendus.some(t => t.includes('↑')),
        'les flèches ont disparu du verdict : il faut lire les mots pour savoir\n'
        + 'dans quel sens aller.');
    // ET AUCUNE PHRASE RECOLLÉE : un `+ '…'` ramènerait le paragraphe sans
    // qu'aucun `return` ne paraisse long.
    assert.ok(!/\+\s*'/.test(corps),
        'le verdict se recolle morceau par morceau : le paragraphe revient par\n'
        + 'la bande, et aucun `return` ne paraît long.');
});

test('L\'AIDE MONTRE D\'ABORD, ET N\'ÉCRIT QU\'EN DERNIER RECOURS', () => {
    const corps = methode(source, 'aider(pourquoi = \'\')');
    const report = corps.indexOf('this.montrerLeReport()');
    const geste = corps.indexOf('this.montrerLeGeste()');
    const ecrit = corps.indexOf('conseil(this.tableau, this.saisies)');
    assert.ok(report > 0 && geste > report,
        'l\'aide ne fait plus RANGER avant de faire calculer : tant qu\'une phrase\n'
        + 'de l\'énoncé n\'est pas reportée, il n\'y a rien à déduire, et montrer une\n'
        + 'ligne enverrait l\'élève chercher un raisonnement là où il lui manque une\n'
        + 'lecture.');
    assert.ok(ecrit > geste,
        'la phrase écrite repasse devant la démonstration. Elle ne doit rester que\n'
        + 'pour le seul cas qu\'on ne sait pas montrer : tout est rempli, et quelque\n'
        + 'chose ne tombe pas juste.');
});

test('LE TABLEAU S\'ÉTEINT, MAIS IL SE RALLUME À TOUS LES COUPS', () => {
    // UN TABLEAU ÉTEINT QU'ON NE RALLUME PAS EST UN EXERCICE ILLISIBLE, et le
    // défaut ne lèverait aucune erreur. Quatre sorties, quatre rallumages.
    assert.match(methode(source, 'dessiner()'), /this\.effacerLeGeste\(\);/,
        'un tableau redessiné garde l\'extinction du précédent');
    assert.match(methode(source, 'gagner()'), /this\.effacerLeGeste\(\);/,
        'le tableau gagné reste éteint, avec une opération sous un tableau complet');
    assert.match(methode(source, 'valider(el)'), /this\.effacerLeGeste\(\);\s*\n\s*this\.note\(''\);/,
        'une case juste ne rallume pas le tableau');
    assert.match(methode(source, 'brancherCases()'),
        /if \(!td \|\| !td\.classList\.contains\('tc-cible'\)\) this\.effacerLeGeste\(\);/,
        'l\'élève qui va travailler AILLEURS garde son tableau éteint sur une\n'
        + 'case dont il ne veut plus. Et la garde est dans l\'autre sens aussi :\n'
        + 'cliquer la case qu\'on lui montre ne doit RIEN effacer, il a encore\n'
        + 'besoin des couleurs et de l\'opération sous les yeux.');
});

test('UNE CASE JUSTE MONTRE LA SUIVANTE SANS ÉTEINDRE LE TABLEAU', () => {
    // L'ANCIENNE PHRASE DISAIT LA MÊME CHOSE : « Regarde la ligne "Total" : il
    // n'y manque qu'une seule case ». Le cercle la remplace. Mais on ne monte
    // PAS la démonstration complète ici : un élève qui enchaîne n'a pas besoin
    // qu'on éteigne son tableau à chaque bonne réponse.
    const viser = methode(source, 'viser()');
    assert.match(viser, /prochaineLigne\(this\.tableau, this\.saisies\)/,
        '`viser` ne cherche plus la prochaine case déductible');
    assert.match(viser, /classList\.add\('tc-vise'\)/, '`viser` n\'entoure plus rien');
    assert.ok(!viser.includes('tc-montre'),
        'une bonne réponse éteint le tableau : l\'élève qui avance se fait\n'
        + 'interrompre par une démonstration qu\'il n\'a pas demandée.');
});

// ── LE LIEN ENTRE UN NOMBRE ET SA CASE ─────────────────────────────────────

test('LES NOMBRES DE L\'OPÉRATION ONT LA COULEUR DE LEUR CASE', () => {
    // C'EST TOUT LE MÉCANISME. « 56 − 7 − 12 − 15 = ? » ne veut rien dire si
    // l'on ne voit pas d'où sortent les nombres ; c'est la couleur qui les
    // ramène à leur case, et c'est ce que fait le doigt du professeur. Deux
    // teintes réglées séparément dérivent au premier changement, et rien ne
    // casse : on lit juste un calcul tombé du ciel.
    const paires = [
        ['.tc-geste .g-src', '.tc-table.tc-montre td.tc-source', 'les nombres connus'],
        ['.tc-geste .g-tot', '.tc-table.tc-montre td.tc-somme', 'le total']
    ];
    for (const [bande, cellule, quoi] of paires) {
        const a = valeurDe(aideCorps(source, bande, { ou: SOURCE }), 'background');
        const b = valeurDe(aideCorps(source, cellule, { ou: SOURCE }), 'background');
        assert.ok(a && a === b,
            `${quoi} : la bande et la case ne sont plus de la même couleur.\n`
            + `      bande  ${a}\n      case   ${b}\n`
            + 'Le lien entre le nombre et sa case est tout ce qui remplace la phrase.');
    }
});

test('L\'OPÉRATION DISPARAÎT VRAIMENT QUAND ELLE EST CACHÉE', () => {
    // LE PIÈGE A DÉJÀ ÉTÉ PAYÉ UNE FOIS, sur l'écran de fin de Math Crush : un
    // `display: flex` écrit dans une classe l'emporte sur le `hidden` du
    // navigateur, et le bandeau reste affiché pendant tout le jeu. Aucune
    // erreur, aucun test en échec — ça se voit à l'œil, et seulement à l'œil.
    const regle = aideCorps(source, '.tc-geste', { ou: SOURCE });
    assert.ok(declare(regle, 'display', 'flex'), '`.tc-geste` ne se dispose plus en flex');
    assert.ok(source.includes('.tc-geste[hidden] { display: none; }'),
        '`.tc-geste[hidden] { display: none; }` a disparu : le `display: flex` de\n'
        + 'la classe bat le `hidden` du navigateur, et l\'opération reste sous le\n'
        + 'tableau pendant tout l\'exercice.');
});

test('LA PISTE EST CE QUI RESTE ALLUMÉ, ET ELLE S\'ALLUME DANS L\'ORDRE', () => {
    const eteint = aideCorps(source, '.tc-table.tc-montre td:not(.tc-piste),\n'
        + '                .tc-table.tc-montre th:not(.tc-piste)', { ou: SOURCE });
    const opacite = Number((valeurDe(eteint, 'opacity') || '1').replace(/[^\d.]/g, ''));
    assert.ok(opacite <= 0.3,
        `ce qui n'est pas la piste reste à ${opacite} d'opacité : le tableau n'est\n`
        + 'plus éteint, et l\'élève doit de nouveau chercher OÙ regarder — c\'est le\n'
        + 'plus fort des quatre gestes.');
    // L'ORDRE EST LE SENS. Tout allumer d'un coup donne une image à
    // déchiffrer ; allumé en quatre temps, cela se SUIT — c'est le doigt qui
    // se déplace.
    const piste = aideCorps(source, '.tc-table.tc-montre .tc-piste', { ou: SOURCE });
    assert.match(piste, /animation-delay: calc\(var\(--i, 0\) \* \.\d+s\)/,
        'les cases s\'allument toutes en même temps : on montre une image au lieu\n'
        + 'de montrer un geste.');
    // ON DÉSIGNE LA LIGNE EXACTE. La première écriture cherchait
    // `setProperty('--i', …)` n'importe où dans la méthode : en retirant celui
    // des cases de la piste, celui de la CIBLE le remplaçait et l'épreuve
    // restait verte sur le défaut même qu'elle devait attraper
    // (tools/epreuveTombe.mjs l'a dit).
    const geste = methode(source, 'montrerLeGeste()');
    assert.match(geste, /td\.classList\.add\('tc-piste', role\);\s*\n\s*td\.style\.setProperty\('--i', String\(i\)\)/,
        'le code ne numérote plus les cases de la piste : le délai de chacune vaut\n'
        + 'alors zéro, et la règle CSS ci-dessus ne retarde plus rien.');
    assert.match(geste, /cible\.style\.setProperty\('--i', String\(i\)\)/,
        'la case qui manque n\'est plus numérotée : elle s\'allume avec la première\n'
        + 'au lieu d\'arriver en dernier, et le geste perd son sens.');
});

test('L\'OPÉRATION ARRIVE APRÈS LES CASES, JAMAIS AVANT', () => {
    // SINON ELLE DONNE LA FIN DU FILM AVANT LE FILM : on lirait le calcul tout
    // fait pendant que les cases s'allument encore, et l'ordre — qui EST le
    // sens — ne servirait plus à rien.
    assert.match(methode(source, 'montrerLeGeste()'),
        /setProperty\('--retard', `\$\{\(\(i \+ 1\) \* 0\.16\)\.toFixed\(2\)\}s`\)/,
        'le bandeau n\'attend plus que les cases soient allumées');
    const regle = aideCorps(source, '.tc-geste', { ou: SOURCE });
    assert.match(regle, /animation-delay: var\(--retard, 0s\)/,
        'la feuille de style ignore le retard que le code calcule');
});

// ── CE QU'ON MONTRE EST-IL VRAI ? ──────────────────────────────────────────

test('LE CALCUL QU\'ON MONTRE TOMBE TOUJOURS SUR LA BONNE VALEUR', () => {
    // LA MESURE QUI COMPTE LE PLUS, et elle ne demande pas de navigateur :
    // montrer un calcul FAUX est pire que ne rien montrer — l'élève le suit,
    // se fait refuser, et n'a plus aucune raison de croire le logiciel.
    //
    // CE QUE CETTE ÉPREUVE GARDE : la RÈGLE que la démonstration applique —
    // le total de la piste moins les autres, ou la somme des autres —, sur
    // tous les paliers et sur un tableau déroulé jusqu'au bout, comme un élève
    // qui suivrait l'aide à chaque case.
    //
    // CE QU'ELLE NE GARDE PAS, et il faut le savoir : elle ne lit pas le code
    // de `montrerLeGeste`, elle rejoue sa règle. C'est la sonde
    // (`tools/eleveBloqueDevantLeTableau.mjs`) qui fait le calcul AFFICHÉ et
    // l'écrit dans la case.
    for (const palier of Object.keys(PALIERS)) {
        for (let g = 1; g <= 12; g++) {
            const t = genererTableau({ rng: makeRng(`geste-${palier}-${g}`), palier });
            const saisies = {};
            let pas = 0;
            for (let suite = prochaineLigne(t, saisies); suite; suite = prochaineLigne(t, saisies)) {
                const ligne = suite.sens === 'ligne';
                const [rc, cc] = suite.case;
                const dernier = ligne ? t.C : t.R;
                const cibleEstTotal = ligne ? cc === t.C : rc === t.R;
                // CHAQUE NOMBRE MONTRÉ EST-IL SOUS SES YEUX ? C'est la vraie
                // question, et la première écriture ne la posait pas : elle
                // n'additionnait que des `t.valeurs`, c'est-à-dire la vérité
                // du tableau — or « le total d'une ligne vaut la somme de sa
                // ligne » est vrai PAR CONSTRUCTION, quoi qu'on fasse. Elle
                // restait donc verte en ne gardant rien, et une piste à DEUX
                // cases vides passait sans broncher (tools/epreuveTombe.mjs).
                // Montrer un nombre qui n'est écrit NULLE PART dans le
                // tableau, c'est le sortir d'un chapeau.
                const vu = (r, c) => estDonnee(t, r, c)
                    || Number(saisies[cle(r, c)]) === t.valeurs[r][c];
                let calcul = 0;
                if (!cibleEstTotal) {
                    const [tr, tc] = ligne ? [suite.indice, t.C] : [t.R, suite.indice];
                    assert.ok(vu(tr, tc), `${palier} graine ${g} : on part d'un total `
                        + `(${t.valeurs[tr][tc]}) que l'élève n'a pas encore sous les yeux.`);
                    calcul = t.valeurs[tr][tc];
                }
                for (let k = 0; k <= dernier; k++) {
                    const r = ligne ? suite.indice : k;
                    const c = ligne ? k : suite.indice;
                    if (r === rc && c === cc) continue;
                    if (!cibleEstTotal && k === dernier) continue;
                    assert.ok(vu(r, c), `${palier} graine ${g} : l'opération montre `
                        + `${t.valeurs[r][c]}, qui n'est écrit dans AUCUNE case visible.`);
                    calcul += cibleEstTotal ? t.valeurs[r][c] : -t.valeurs[r][c];
                }
                assert.equal(calcul, t.valeurs[rc][cc],
                    `${palier} graine ${g} : l'opération montrée donne ${calcul}, la case `
                    + `vaut ${t.valeurs[rc][cc]}. L'élève suivrait le calcul et serait refusé.`);
                saisies[cle(rc, cc)] = String(t.valeurs[rc][cc]);
                assert.ok(++pas < 80, 'le tableau ne se termine pas');
            }
            // ET IL S'EST VRAIMENT REMPLI : une épreuve qui ne vérifierait rien
            // parce que `prochaineLigne` rend `null` dès le départ serait verte
            // en ne gardant rien.
            assert.ok(pas >= t.trous - 1, `${palier} graine ${g} : ${pas} case(s) déduite(s)`);
        }
    }
});

// ── LE BOUTON, ET L'AUTRE BATTEMENT ────────────────────────────────────────

test('LE BOUTON D\'AIDE NE BAT QUE QUAND L\'AIDE VIENT TOUTE SEULE', () => {
    const corps = methode(source, 'appeler(spontanee)');
    // LE BATTEMENT EST UN APPEL, PAS UN ACCUSÉ DE RÉCEPTION : le faire battre
    // quand l'élève vient de le toucher, c'est lui répondre « j'ai bien vu que
    // tu m'as touché ».
    assert.match(corps, /if \(!spontanee\) return;/,
        'le bouton bat aussi quand l\'élève vient de le cliquer lui-même');
    // LE RETRAIT, LE REFLOW, PUIS LA REMISE. Sans le `void b.offsetWidth`,
    // l'animation ne rejoue pas la deuxième fois : pour le navigateur, la
    // classe n'a jamais quitté l'élément. Un élève arrêté sur une DEUXIÈME
    // case ne verrait alors plus rien battre.
    assert.match(corps, /remove\('tc-btn--appel'\);\s*\n\s*void b\.offsetWidth;\s*\n\s*b\.classList\.add\('tc-btn--appel'\);/,
        'le battement du bouton ne rejouera pas une seconde fois : sans le reflow\n'
        + 'entre le retrait et la remise de la classe, le navigateur ne voit aucun\n'
        + 'changement et ne relance pas l\'animation.');
});

test('IL BAT EN AMBRE, LA COULEUR QUE RIEN D\'AUTRE N\'UTILISE DANS CETTE BARRE', () => {
    const regle = aideCorps(source, '.tc-btn--appel', { ou: SOURCE });
    assert.ok(declare(regle, 'animation', 'tc-appel'), 'le bouton d\'aide ne bat plus du tout');
    // TROIS BATTEMENTS, PUIS PLUS RIEN. Un clignotement sans fin cesse d'être
    // vu au bout d'une minute et devient agaçant.
    assert.match(regle, /animation:[^;]*\s3;/,
        'le battement ne s\'arrête plus au bout de trois');
    const battement = source.slice(source.indexOf('@keyframes tc-appel'));
    assert.match(battement.slice(0, battement.indexOf('\n                }')),
        /box-shadow: 0 0 0 6px var\(--warning\)/,
        'l\'anneau du bouton d\'aide n\'est plus en ambre plein. En `--primary` à\n'
        + 'demi transparent, il bat dans la teinte de tout le reste de la barre :\n'
        + 'mesuré sur la calculatrice, on ne le voyait pas.');
    // ET CELUI QUI NE SUPPORTE PAS LES ANIMATIONS VOIT QUAND MÊME QUELQUE
    // CHOSE : c'est l'élève qu'on vient d'identifier comme arrêté.
    const calme = source.slice(source.indexOf('prefers-reduced-motion',
        source.indexOf('@keyframes tc-appel')));
    assert.match(calme.slice(0, 400),
        /\.tc-btn--appel \{ animation: none;[\s\S]*?box-shadow: 0 0 0 3px var\(--warning\)/,
        'sans animation, le bouton d\'aide ne se distingue plus du tout');
});

test('LA CALCULATRICE DISPONIBLE BAT DANS LA MÊME COULEUR, ET PLEINE', () => {
    // RÉMY, dans la même phrase que la demande d'origine : « quand c'est la
    // calculatrice le clignotement est discret il faudrait une couleur plus
    // visible ». Le halo était en `--primary` à 40 % — la teinte de tout le
    // reste de l'en-tête, posée en transparence sur un fond clair.
    const bloc = UI.slice(UI.indexOf('@keyframes calc-dispo'));
    const corps = bloc.slice(0, bloc.indexOf('\n}'));
    assert.match(corps, /box-shadow: 0 0 0 6px var\(--warning\)/,
        'le halo de la calculatrice disponible est redevenu discret');
    assert.ok(!/color-mix\(in srgb, var\(--primary\)[^)]*\d+%/.test(corps),
        'le halo repasse par `--primary` en transparence : c\'est la couleur de tout\n'
        + 'le reste de la barre, et c\'est ce qui le rendait invisible.');
});
