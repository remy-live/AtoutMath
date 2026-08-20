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
    tirerEgalite, etapesEgalite, NIVEAUX_SOMME, tirerCalcul
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
        { id: 'maxBase', type: 'number', label: 'Dénominateur de départ maximum', default: 9, min: 2, max: 20 },
        {
            id: 'bandes', type: 'number', label: 'Questions avec les bandes', default: 3, min: 0, max: 10,
            aide: 'Rémy : « les bandes l\'une en dessous de l\'autre, la seconde découpée : '
                + 'l\'élève aura juste à compter dans un premier temps, deux ou trois questions, '
                + 'et après tu les enlèves pour qu\'il multiplie. » Pendant ces questions-là les '
                + 'nombres restent petits — on ne compte pas jusqu\'à quatre-vingts. Ensuite les '
                + 'bandes disparaissent et il ne reste que les deux flèches de multiplication.'
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        // LES PREMIÈRES QUESTIONS SE COMPTENT, LES SUIVANTES SE CALCULENT.
        //
        // Deux bandes de même longueur, la seconde découpée : la réponse se LIT
        // en comptant les parts. C'est la marche zéro — celle où l'on constate
        // que les deux écritures désignent la même longueur. Puis les bandes
        // s'en vont, et il faut multiplier.
        //
        // Pendant la phase du comptage, la fraction reste PROPRE et les nombres
        // petits : au-delà d'une vingtaine de parts, compter n'est plus une
        // méthode, c'est une corvée.
        const avecBandes = (ctx.index || 0) < Number(params.bandes ?? 3);
        const e = tirerEgalite(rng, {
            sens: params.sens || 'les-deux',
            trou: params.trou || 'les-deux',
            propre: avecBandes,
            // Dix-huit parts au plus dans la bande du bas : au-delà, sur un
            // téléphone, chaque part fait dix pixels et l'on ne compte plus,
            // on devine.
            maxBase: avecBandes ? 6 : (Number(params.maxBase) || 9),
            maxFacteur: avecBandes ? 3 : (Number(params.maxFacteur) || 12)
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
            explanation: `${e.gauche.n}/${e.gauche.d} = ${e.droite.n}/${e.droite.d} : on `
                + `${e.sens === 'agrandir' ? 'multiplie' : 'divise'} le numérateur ET le `
                + `dénominateur par ${e.facteur}. La fraction ne change pas de valeur.`,
            hints: avecBandes
                ? ['Les deux bandes font la MÊME longueur : ce que tu cherches se compte.',
                    ...etapesEgalite(e)]
                : etapesEgalite(e),
            difficulty: (avecBandes ? 1 : 3) + (e.sens === 'simplifier' ? 1 : 0),
            meta: { egalite: e, avecBandes, decimal: false }
        });
    }
};

// --- Poser une addition (ou une soustraction) ---------------------------------

// COMBIEN DE QUESTIONS AVANT DE MONTER D'UNE MARCHE.
//
// L'exercice fait dix questions par défaut. À deux questions par marche, les
// trois premières marches en prennent six et la dernière — celle du PPCM,
// celle qui se travaille — garde les quatre autres. C'est le bon partage :
// les trois premières préparent, la quatrième est le sujet.
const PAR_MARCHE = 2;

const NIVEAU = Object.fromEntries(NIVEAUX_SOMME.map(n => [n.id, n]));

/** La marche : celle qu'on a fixée, ou celle où en est la série. */
function marcheDe(params, index) {
    const choisi = params.niveau || 'progressif';
    if (choisi !== 'progressif') return choisi;
    return NIVEAUX_SOMME[Math.min(NIVEAUX_SOMME.length - 1,
        Math.floor((index || 0) / PAR_MARCHE))].id;
}

/** Le corps d'un item de calcul posé — partagé avec les problèmes. */
function itemDeCalcul(c, rng, { generatorId, skillId, marche, enonce = '', question = '' }) {
    const op = c.signe === '−' ? '−' : '+';
    const reponse = c.simplifie
        ? `${c.reduit.n}/${c.reduit.d}`
        : `${c.brut.n}/${c.brut.d}`;
    const texte = `${c.a.n}/${c.a.d} ${op} ${c.b.n}/${c.b.d} = ?`;
    return makeItem({
        seed: rng.seed, generatorId, skillId,
        answerKind: 'text',
        prompt: {
            text: enonce ? `${enonce} (${texte})` : texte,
            html: `<div class="frac-egalite">
                    ${enonce ? `<p class="frac-enonce">${enonce}</p>` : ''}
                    ${fracHtml(c.a.n, c.a.d)}
                    <span class="frac-signe">${op}</span>
                    ${fracHtml(c.b.n, c.b.d)}
                    <span class="frac-signe">=</span>
                    <span class="frac-trou" aria-label="résultat à écrire">?</span>
                   </div>`
        },
        answer: reponse,
        hints: [
            (NIVEAU[marche] || {}).aide || '',
            `Cherche un nombre à la fois dans la table de ${c.a.d} et dans celle de ${c.b.d}.`,
            ...c.etapes
        ].filter(Boolean),
        explanation: c.etapes.join(' '),
        explicationPapier: `${c.a.n}/${c.a.d} ${op} ${c.b.n}/${c.b.d} = `
            + `${c.aReduit.n}/${c.commun} ${op} ${c.bReduit.n}/${c.commun} = ${c.brut.n}/${c.commun}`
            + (c.simplifie ? ` = ${reponse}.` : '.'),
        difficulty: 2 + NIVEAUX_SOMME.findIndex(n => n.id === marche),
        meta: { calcul: c, marche, enonce, question }
    });
}

const PARAM_OPERATION = {
    id: 'operation', type: 'select', label: 'L\'opération', default: 'somme',
    aide: 'La soustraction ne demande rien de plus au dénominateur — c\'est exactement le même '
        + 'travail — mais elle empêche de répondre au flair : on ne peut plus additionner deux '
        + 'petits nombres au hasard et tomber juste. Le résultat reste toujours positif : pas de '
        + 'nombres relatifs ici.',
    options: [
        { value: 'somme', label: 'Additions seulement' },
        { value: 'difference', label: 'Soustractions seulement' },
        { value: 'les-deux', label: 'Les deux mélangées' }
    ]
};

const PARAM_SIMPLIFIER = {
    id: 'simplifier', type: 'select', label: 'Simplifier le résultat', default: 'non',
    aide: 'Au départ, on s\'arrête au résultat brut : mettre au même dénominateur est déjà tout '
        + 'l\'exercice, et simplifier par-dessus fait rater les deux. La ligne s\'ajoute quand '
        + 'la mise au même dénominateur est acquise.',
    options: [
        { value: 'non', label: 'Non — on s\'arrête au résultat' },
        { value: 'oui', label: 'Oui — une ligne de plus' }
    ]
};

export const fracSommeProgressiveGenerator = {
    id: 'frac.somme-progressive',
    label: 'Additionner des fractions (calcul posé)',
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
        PARAM_OPERATION,
        PARAM_SIMPLIFIER,
        {
            id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 10, min: 4, max: 10,
            aide: 'On ne dépasse pas dix : l\'aide est la table de Pythagore, et elle s\'arrête '
                + 'à dix. Un dénominateur qui n\'y figure pas rendrait l\'aide muette au moment '
                + 'où elle sert.'
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const marche = marcheDe(params, ctx.index);
        const c = tirerCalcul(rng, {
            niveau: marche,
            maxDen: Math.min(10, Number(params.maxDen) || 10),
            operation: params.operation || 'somme'
        });
        c.simplifie = params.simplifier === 'oui' && c.aSimplifiable;
        return itemDeCalcul(c, rng, {
            generatorId: 'frac.somme-progressive',
            skillId: 'num.frac.denominateur-commun',
            marche
        });
    }
};

// --- Les mêmes calculs, mais en histoires -------------------------------------
//
// Rémy : « on propose un exercice où il y a des énoncés très simples où on
// additionne ou soustrait des fractions ». TRÈS SIMPLES est la consigne, et
// c'est la difficile : un énoncé de problème ajoute une lecture, et la lecture
// ne doit pas devenir l'exercice. Une phrase, deux fractions, une question —
// et surtout un CONTEXTE où la fraction se voit (une tarte, un bidon, un
// trajet), jamais un habillage décoratif posé sur un calcul.

const HISTOIRES = [
    {
        quoi: 'tarte', unite: 'de la tarte',
        somme: (a, b) => `Léa mange ${a} de la tarte, puis ${b}. Quelle part de la tarte a-t-elle mangée&nbsp;?`,
        difference: (a, b) => `Il restait ${a} de la tarte. On en mange ${b}. Quelle part reste-t-il&nbsp;?`
    },
    {
        quoi: 'bidon', unite: 'de litre',
        somme: (a, b) => `Un arrosoir contient ${a} de litre. On y verse ${b} de litre. Combien contient-il&nbsp;?`,
        difference: (a, b) => `Un bidon contient ${a} de litre. On en verse ${b} de litre. Combien reste-t-il&nbsp;?`
    },
    {
        quoi: 'trajet', unite: 'du trajet',
        somme: (a, b) => `Sur son trajet, Malo parcourt ${a} à pied, puis ${b} à vélo. Quelle part du trajet a-t-il faite&nbsp;?`,
        difference: (a, b) => `Malo doit parcourir ${a} du trajet. Il en a déjà fait ${b}. Quelle part lui reste-t-il&nbsp;?`
    },
    {
        quoi: 'ruban', unite: 'de mètre',
        somme: (a, b) => `On colle bout à bout un ruban de ${a} de mètre et un autre de ${b} de mètre. Quelle longueur obtient-on&nbsp;?`,
        difference: (a, b) => `Un ruban mesure ${a} de mètre. On en coupe ${b} de mètre. Quelle longueur reste-t-il&nbsp;?`
    },
    {
        quoi: 'jardin', unite: 'du jardin',
        somme: (a, b) => `Papi sème des radis sur ${a} du jardin et des carottes sur ${b}. Quelle part du jardin est semée&nbsp;?`,
        difference: (a, b) => `${a} du jardin sont semés. Une taupe abîme ${b} du jardin. Quelle part reste semée&nbsp;?`
    },
    {
        quoi: 'journée', unite: 'de l\'heure',
        somme: (a, b) => `Zoé travaille ${a} d\'heure, puis encore ${b} d\'heure. Combien de temps a-t-elle travaillé&nbsp;?`,
        difference: (a, b) => `La récréation dure ${a} d\'heure. ${b} d\'heure sont déjà passés. Combien reste-t-il&nbsp;?`
    }
];

export const fracProblemeGenerator = {
    id: 'frac.probleme',
    label: 'Problèmes de fractions (addition et soustraction)',
    skills: ['num.frac.denominateur-commun', 'num.probleme.fraction'],
    answerKinds: ['text'],
    ecrit: true,
    fractions: true,
    params: [
        {
            id: 'niveau', type: 'select', label: 'La progression', default: 'progressif',
            aide: 'Les mêmes quatre marches que le calcul posé — la difficulté est dans les '
                + 'dénominateurs, pas dans l\'histoire.',
            options: [
                { value: 'progressif', label: 'Progressif — les quatre marches à la suite' },
                ...NIVEAUX_SOMME.map(n => ({ value: n.id, label: n.nom }))
            ]
        },
        { ...PARAM_OPERATION, default: 'les-deux' },
        PARAM_SIMPLIFIER,
        { id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 10, min: 4, max: 10 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const marche = marcheDe(params, ctx.index);
        const c = tirerCalcul(rng, {
            niveau: marche,
            maxDen: Math.min(10, Number(params.maxDen) || 10),
            operation: params.operation || 'les-deux'
        });
        c.simplifie = params.simplifier === 'oui' && c.aSimplifiable;

        const h = rng.pick(HISTOIRES);
        const dire = (f) => `<b>${f.n}/${f.d}</b>`;
        const enonce = c.signe === '−'
            ? h.difference(dire(c.a), dire(c.b))
            : h.somme(dire(c.a), dire(c.b));

        return itemDeCalcul(c, rng, {
            generatorId: 'frac.probleme',
            skillId: 'num.frac.denominateur-commun',
            marche, enonce, question: h.quoi
        });
    }
};
