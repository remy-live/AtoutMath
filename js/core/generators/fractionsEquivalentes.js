// DEUX EXERCICES SUR LA MÊME RÈGLE : compléter une égalité, et additionner.
//
// Rémy : « un exercice où il faut compléter l'égalité entre fractions, exemple
// 3/2 = 33/… », et « un exercice d'addition de fractions progressif, avec
// d'abord des dénominateurs multiples puis après trouver le PPCM ».
//
// Ce sont deux faces d'une seule règle — multiplier haut et bas par le même
// nombre ne change pas la fraction — et c'est pour cela qu'ils partagent leur
// noyau (`core/fractionsEquivalentes.js`). L'élève qui sait compléter une
// égalité sait déjà mettre au même dénominateur : il ne lui reste qu'à le
// faire deux fois de suite.
//
// « TOUJOURS DES FRACTIONS EN COLONNES » : à l'écran comme sur le papier, une
// fraction s'écrit numérateur sur dénominateur, séparés d'un trait. La barre
// oblique est une commodité de clavier, pas une écriture mathématique — d'où
// `fractions: true`, que la fiche imprimée lit pour composer les colonnes, et
// le HTML en `.fraction` pour l'écran.

import { makeItem } from '../items.js';
import {
    tirerEgalite, etapesEgalite, NIVEAUX_SOMME, tirerSomme, etapesSomme
} from '../fractionsEquivalentes.js';

/** Une fraction en colonne, telle qu'on l'écrit au tableau. */
function fracHtml(n, d, classe = '') {
    return `<span class="fraction ${classe}"><span class="fraction-num">${n}</span>`
        + `<span class="fraction-den">${d}</span></span>`;
}

/** La même, avec un côté vide : c'est ce qu'on demande d'écrire. */
function fracTrou(n, d, trou) {
    const vide = '<span class="frac-trou" aria-label="nombre manquant">?</span>';
    return fracHtml(trou === 'numerateur' ? vide : n, trou === 'denominateur' ? vide : d,
        'fraction--trou');
}

// --- Compléter une égalité ---------------------------------------------------

export const fracEgaliteGenerator = {
    id: 'frac.egalite',
    label: 'Compléter une égalité de fractions',
    skills: ['num.frac.equivalentes'],
    answerKinds: ['numeric'],
    ecrit: true,
    fractions: true,
    params: [
        {
            id: 'sens', type: 'select', label: 'Dans quel sens', default: 'les-deux',
            aide: 'Agrandir se fait par une multiplication et se lit presque tout seul. '
                + 'Simplifier demande de TROUVER le facteur au lieu de le lire — c\'est la '
                + 'même règle, mais c\'est là que les élèves butent.',
            options: [
                { value: 'agrandir', label: 'Agrandir seulement (× un nombre)' },
                { value: 'simplifier', label: 'Simplifier seulement (÷ un nombre)' },
                { value: 'les-deux', label: 'Les deux, au hasard' }
            ]
        },
        {
            id: 'trou', type: 'select', label: 'Le nombre à trouver', default: 'les-deux',
            options: [
                { value: 'numerateur', label: 'Toujours le numérateur' },
                { value: 'denominateur', label: 'Toujours le dénominateur' },
                { value: 'les-deux', label: 'L\'un ou l\'autre' }
            ]
        },
        {
            id: 'maxFacteur', type: 'number', label: 'Facteur maximum', default: 12, min: 2, max: 30,
            aide: 'Jusqu\'où va la multiplication. À 12, on reste dans les tables ; au-delà, '
                + 'l\'exercice devient aussi un calcul.'
        },
        { id: 'maxBase', type: 'number', label: 'Dénominateur de départ maximum', default: 9, min: 2, max: 20 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const e = tirerEgalite(rng, {
            sens: params.sens || 'les-deux',
            trou: params.trou || 'les-deux',
            maxBase: Number(params.maxBase) || 9,
            maxFacteur: Number(params.maxFacteur) || 12
        });

        const texte = `${e.gauche.n}/${e.gauche.d} = `
            + (e.trou === 'numerateur' ? `?/${e.droite.d}` : `${e.droite.n}/?`);

        return makeItem({
            seed: rng.seed, generatorId: 'frac.egalite', skillId: 'num.frac.equivalentes',
            answerKind: 'numeric',
            prompt: {
                text: texte,
                html: `<div class="frac-egalite">
                        ${fracHtml(e.gauche.n, e.gauche.d)}
                        <span class="frac-signe">=</span>
                        ${fracTrou(e.droite.n, e.droite.d, e.trou)}
                       </div>`
            },
            answer: e.reponse,
            hints: etapesEgalite(e),
            explanation: `${e.gauche.n}/${e.gauche.d} = ${e.droite.n}/${e.droite.d} : on `
                + `${e.sens === 'agrandir' ? 'multiplie' : 'divise'} le numérateur ET le `
                + `dénominateur par ${e.facteur}. La fraction ne change pas de valeur.`,
            difficulty: e.sens === 'simplifier' ? 4 : 3,
            meta: { egalite: e, decimal: false }
        });
    }
};

// --- Additionner, marche par marche ------------------------------------------

// COMBIEN DE QUESTIONS AVANT DE MONTER D'UNE MARCHE.
//
// L'exercice fait dix questions par défaut. À deux questions par marche, les
// trois premières marches en prennent six et la dernière — celle du PPCM,
// celle qui se travaille — garde les quatre autres. C'est le bon partage :
// les trois premières préparent, la quatrième est le sujet.
const PAR_MARCHE = 2;

const NIVEAU = Object.fromEntries(NIVEAUX_SOMME.map(n => [n.id, n]));

export const fracSommeProgressiveGenerator = {
    id: 'frac.somme-progressive',
    label: 'Additionner des fractions (progressif)',
    skills: ['num.frac.denominateur-commun'],
    answerKinds: ['text'],
    ecrit: true,
    fractions: true,
    params: [
        {
            id: 'niveau', type: 'select', label: 'La progression', default: 'progressif',
            aide: 'En progressif, l\'exercice monte tout seul de marche en marche : même '
                + 'dénominateur, puis l\'un multiple de l\'autre, puis premiers entre eux, et '
                + 'enfin le vrai PPCM. Chaque marche n\'ajoute QU\'UNE difficulté. On peut '
                + 'aussi s\'arrêter sur une marche et n\'en faire que celle-là.',
            options: [
                { value: 'progressif', label: 'Progressif — les quatre marches à la suite' },
                ...NIVEAUX_SOMME.map(n => ({ value: n.id, label: n.nom }))
            ]
        },
        {
            id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 12, min: 4, max: 20,
            aide: 'Plus les dénominateurs sont grands, plus le découpage commun compte de parts '
                + '— et plus la bande dessinée devient fine.'
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const choisi = params.niveau || 'progressif';
        // La marche : soit celle qu'on a fixée, soit celle où en est la série.
        const marche = choisi === 'progressif'
            ? NIVEAUX_SOMME[Math.min(NIVEAUX_SOMME.length - 1,
                Math.floor((ctx.index || 0) / PAR_MARCHE))].id
            : choisi;

        const s = tirerSomme(rng, { niveau: marche, maxDen: Number(params.maxDen) || 12 });
        const reponse = `${s.reduit.n}/${s.reduit.d}`;

        return makeItem({
            seed: rng.seed, generatorId: 'frac.somme-progressive',
            skillId: 'num.frac.denominateur-commun',
            answerKind: 'text',
            prompt: {
                text: `${s.a.n}/${s.a.d} + ${s.b.n}/${s.b.d} = ?`,
                html: `<div class="frac-egalite">
                        ${fracHtml(s.a.n, s.a.d)}
                        <span class="frac-signe">+</span>
                        ${fracHtml(s.b.n, s.b.d)}
                        <span class="frac-signe">=</span>
                        <span class="frac-trou" aria-label="résultat à écrire">?</span>
                       </div>`
            },
            answer: reponse,
            hints: [(NIVEAU[marche] || {}).aide || '', ...etapesSomme(s)].filter(Boolean),
            explanation: etapesSomme(s).join(' '),
            // Sur le papier, il n'y a pas de bandes à recouper : la correction
            // ne parle donc que de nombres.
            explicationPapier: `${s.a.n}/${s.a.d} + ${s.b.n}/${s.b.d} = `
                + `${s.aReduit.n}/${s.commun} + ${s.bReduit.n}/${s.commun} = ${s.brut.n}/${s.commun}`
                + (s.aSimplifiable ? ` = ${reponse}.` : '.'),
            difficulty: 2 + NIVEAUX_SOMME.findIndex(n => n.id === marche),
            meta: { somme: s, marche }
        });
    }
};
