// L'ARBRE DE CALCULS — recopier et compléter, puis écrire en ligne.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre, la capture d'un fil de profs où une collègue cherche des
// arbres de calculs « éditables » et où la seule réponse est « Latex… ».
// Rémy : « Et ce genre d exercice ».
//
// DEUX QUESTIONS POUR UN MÊME ARBRE, et c'est le manuel qui les pose ainsi :
// compléter les cases, puis écrire l'expression en ligne. La seconde est la
// seule qui apprenne quelque chose — un élève sait calculer −0,6 × (−5), il ne
// sait pas parenthéser —, et c'est aussi la seule dont la correction demande
// un peu de soin : une expression juste s'écrit de plusieurs façons.
//
// Le reste — les formes, les viviers de nombres, la mise en page sur sa
// grille, l'écriture en ligne et sa relecture — vit dans `arbresDeCalculs.js`,
// qui ne connaît ni le DOM ni le catalogue.

import { makeItem } from '../items.js';
import {
    FORMES, TAILLES, NOMBRES, OPERATIONS,
    batir, calculerArbre, parenthesesUtiles, enLigne, ecrireCases, nombreFr
} from '../arbresDeCalculs.js';

const SKILL = 'num.prio.parentheses';

export const QUESTIONS = {
    completer: 'Compléter l\'arbre',
    ligne: 'Écrire l\'expression en ligne',
    'les-deux': 'Les deux, en alternance'
};

/** Combien de feuilles porte cette forme. */
const compterFeuilles = (f) => (f === null ? 1 : compterFeuilles(f[0]) + compterFeuilles(f[1]));

/**
 * TIRE UN ARBRE QUI TIENT DEBOUT, ou rend `null` après trop d'essais.
 *
 * ON TIRE ET ON RETIRE, on ne répare pas. Un arbre réparé après coup — une
 * feuille remplacée pour que la division tombe juste — a des nombres qui ne
 * vont pas ensemble, et cela se voit sur la feuille. MESURÉ sur mille
 * quatre-vingts tirages : quatre essais en moyenne, cent vingt au pire, et
 * quatre-vingt-dix millisecondes pour l'ensemble.
 */
export function tirerArbre(rng, { taille, nombres, operations }) {
    const vivier = NOMBRES[nombres] || NOMBRES.relatifs;
    const signes = (OPERATIONS[operations] || OPERATIONS['sans-division']).signes;
    const formes = FORMES[taille] || FORMES.moyen;
    for (let essai = 0; essai < 600; essai++) {
        const forme = formes[rng.int(0, formes.length - 1)];
        const combien = compterFeuilles(forme);
        const ops = Array.from({ length: combien - 1 },
            () => signes[rng.int(0, signes.length - 1)]);
        // AU PLUS UNE DIVISION PAR ARBRE. Deux divisions qui tombent juste dans
        // le même arbre se tirent une fois sur cent, et l'exercice n'y gagne
        // rien : la division est là pour être rencontrée, pas pour être le
        // seul obstacle de la feuille.
        if (ops.filter(o => o === '÷').length > 1) continue;
        const valeurs = Array.from({ length: combien }, () => vivier.tirer(rng));
        const arbre = batir(forme, ops, valeurs);
        if (!calculerArbre(arbre, {
            decimales: vivier.decimales, positif: nombres === 'entiers'
        })) continue;
        // ET SES PARENTHÈSES DOIVENT SERVIR — voir `parenthesesUtiles`. Sans
        // cette condition, un tirage sur deux donnait une ligne qui valait la
        // même chose sans aucune parenthèse, c'est-à-dire un exercice qui
        // n'enseigne pas ce pour quoi il existe.
        if (!parenthesesUtiles(arbre)) continue;
        return arbre;
    }
    return null;
}

/** L'arbre, mis à plat pour l'écran et pour la fiche : des cases et des liens. */
export function aPlat(arbre) {
    const idDe = (n) => n.id;
    const cases = [...arbre.feuilles, ...arbre.noeuds]
        .map(n => ({
            id: n.id, genre: n.genre, ligne: n.ligne, colonne: n.colonne,
            valeur: n.valeur,
            ...(n.genre === 'noeud' ? { op: n.op, g: idDe(n.g), d: idDe(n.d) } : {})
        }))
        .sort((a, b) => (a.ligne - b.ligne) || (a.colonne - b.colonne));
    return {
        cases,
        racine: arbre.noeuds[arbre.noeuds.length - 1].id,
        lignes: arbre.lignes,
        colonnes: arbre.feuilles.length
    };
}

export const arbreCalculGenerator = {
    id: 'num.arbre-calcul',
    label: 'L\'Arbre de Calculs',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'La taille de l\'arbre', default: 'moyen',
            options: Object.entries(TAILLES).map(([value, t]) => ({ value, label: t.nom }))
        },
        {
            id: 'nombres', type: 'select', label: 'Les nombres du haut', default: 'relatifs',
            options: Object.entries(NOMBRES).map(([value, n]) => ({ value, label: n.nom }))
        },
        {
            id: 'operations', type: 'select', label: 'Les opérations',
            default: 'sans-division',
            options: Object.entries(OPERATIONS).map(([value, o]) => ({ value, label: o.nom }))
        },
        {
            id: 'question', type: 'select', label: 'Ce qu\'on demande',
            default: 'completer',
            aide: 'Compléter l\'arbre fait calculer ; écrire en ligne fait parenthéser. '
                + 'C\'est la seconde que les élèves ratent en contrôle.',
            options: Object.entries(QUESTIONS).map(([value, label]) => ({ value, label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const taille = TAILLES[p.taille] ? p.taille : 'moyen';
        const nombres = NOMBRES[p.nombres] ? p.nombres : 'relatifs';
        const operations = OPERATIONS[p.operations] ? p.operations : 'sans-division';
        // « LES DEUX » ALTERNE SUR LE RANG, et ne tire pas à pile ou face :
        // sur une feuille de quatre arbres, le hasard sert trois fois la même
        // question une fois sur quatre, et la feuille rate alors la moitié de
        // ce qu'elle voulait montrer.
        const question = p.question === 'les-deux'
            ? ((ctx.index || 0) % 2 === 0 ? 'completer' : 'ligne')
            : (QUESTIONS[p.question] ? p.question : 'completer');

        let arbre = tirerArbre(rng, { taille, nombres, operations });
        // UN REPLI QUI NE MENT PAS : si le tirage demandé n'aboutit pas, on
        // retombe sur les entiers relatifs sans division, qui aboutissent
        // toujours. Mieux vaut un arbre plus simple qu'une question vide.
        if (!arbre) arbre = tirerArbre(rng, { taille, nombres: 'relatifs', operations: 'sans-division' });

        const plat = aPlat(arbre);
        const ligne = enLigne(arbre.racine);
        const nombresDesFeuilles = arbre.feuilles.map(f => f.valeur);

        const consigne = question === 'ligne'
            ? 'Écris ce calcul en une seule ligne, avec les parenthèses qu\'il faut.'
            : 'Complète l\'arbre : chaque opération descend son résultat dans la case du dessous.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.arbre-calcul',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                papier: question === 'ligne'
                    ? 'Écris l\'expression « en ligne » qui correspond à cet arbre.'
                    : 'Recopie et complète l\'arbre.',
                html: `<div class="game-question ac-consigne">${consigne}</div>`
            },
            answer: question === 'ligne' ? ligne : ecrireCases(arbre.noeuds),
            hints: question === 'ligne'
                ? [
                    'Pars de la case du BAS et remonte : elle dit la dernière opération, '
                        + 'donc celle qui sépare la ligne en deux morceaux.',
                    'Chaque case qui n\'est pas un nombre donné devient une PARENTHÈSE — '
                        + 'sauf quand elle contient déjà l\'opération la plus forte.',
                    `Il y a ${nombresDesFeuilles.length} nombres à employer, chacun une fois, `
                        + 'et dans l\'ordre où ils sont écrits en haut.'
                ]
                : [
                    'Commence par la ligne du HAUT : ses deux cases sont des nombres donnés, '
                        + 'donc leur opération se calcule tout de suite.',
                    'Chaque flèche descend un résultat. Une case du bas ne se calcule que '
                        + 'lorsque SES DEUX cases du dessus sont remplies.',
                    `La case rouge est la dernière : ici, ${nombreFr(arbre.racine.valeur)}.`
                ],
            explanation: `${ligne} = ${nombreFr(arbre.racine.valeur)}`,
            difficulty: taille === 'petit' ? 1 : taille === 'moyen' ? 2 : 3,
            meta: {
                question, taille, nombres, operations,
                cases: plat.cases, racine: plat.racine,
                lignes: plat.lignes, colonnes: plat.colonnes,
                ligneAttendue: ligne,
                valeur: arbre.racine.valeur,
                nombresDesFeuilles,
                titreCourt: 'Arbre de calculs',
                texteLecon: 'La case du bas dit la DERNIÈRE opération : c\'est elle qui '
                    + 'coupe la ligne en deux, et c\'est pour cela qu\'il faut des parenthèses.'
            }
        });
    }
};

export default arbreCalculGenerator;
