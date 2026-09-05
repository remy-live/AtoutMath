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
import { paramParMarche, rangMarche, conseilProgression, parMarcheDe } from '../progression.js';
import {
    tirerEgalite, etapesEgalite, NIVEAUX_SOMME, tirerCalcul, tirerComplement,
    ecrireFraction
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
//
// C'EST MAINTENANT UN RÉGLAGE, et c'est cet écran-là que Rémy montrait :
// « quand on a une progression, il faudrait pouvoir choisir aussi la
// répartition non ? ». Deux reste le défaut ; voir core/progression.js.
const PAR_MARCHE = 2;

const NIVEAU = Object.fromEntries(NIVEAUX_SOMME.map(n => [n.id, n]));

/** La marche : celle qu'on a fixée, ou celle où en est la série. */
function marcheDe(params, index) {
    const choisi = params.niveau || 'progressif';
    if (choisi !== 'progressif') return choisi;
    return NIVEAUX_SOMME[rangMarche(index || 0, NIVEAUX_SOMME.length, params, PAR_MARCHE)].id;
}

// --- LE DESSIN DE L'INDICE ---------------------------------------------------
//
// Rémy, au banc iPhone, sur les histoires de fractions : « l'indice est
// incompréhensible. Pourquoi ne pas avoir un petit schéma ? C'est quelque chose
// que nous n'avons pas mis dans les indices alors que c'est souvent plus
// parlant. »
//
// « Écris l'entier en 6èmes avant de retirer » suppose qu'on a compris ce
// qu'est l'entier — c'est-à-dire exactement ce qui bloque. Une bande coupée en
// six, dont cinq sont coloriées et la sixième hachurée, ne le suppose pas :
// elle le montre. Et la bande n'est pas un ornement, c'est la définition même
// d'une fraction : autant de parts prises sur autant de parts égales.

/** Une bande coupée en `d` parts, dont `n` sont coloriées. */
function bandeIndice(n, d, { reste = false } = {}) {
    const W = 240, H = 26, pas = W / d;
    const parts = Array.from({ length: d }, (_, i) => {
        const pleine = i < n;
        const teinte = pleine ? 'var(--primary)' : (reste ? 'var(--warning, #f59e0b)' : 'none');
        const opacite = pleine ? '.55' : (reste ? '.42' : '0');
        return `<rect x="${(i * pas).toFixed(2)}" y="1" width="${pas.toFixed(2)}" height="${H}"`
            + ` fill="${teinte}" fill-opacity="${opacite}"`
            + ' stroke="currentColor" stroke-width="1.2"/>';
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H + 2}" role="img"`
        + ` aria-label="Une bande coupée en ${d} parts, dont ${n} sont coloriées">${parts}</svg>`;
}

/** Le schéma du premier indice, s'il y en a un pour ce calcul-là. */
function schemaIndice(c) {
    if (c.type === 'complement') {
        return `${bandeIndice(c.b.n, c.commun, { reste: true })}
            <p class="fs-legende">Le tout, c'est les ${c.commun} parts : ${c.commun}/${c.commun}.
            ${c.b.n} sont prises (en bleu). Ce qui reste, c'est l'orange —
            et ça se compte en ${c.commun}èmes.</p>`;
    }
    if (c.a.d === c.b.d) {
        return `${bandeIndice(c.a.n, c.a.d)}${bandeIndice(c.b.n, c.b.d)}
            <p class="fs-legende">Les parts ont déjà la même taille : il suffit de compter
            combien on en a en tout.</p>`;
    }
    return `${bandeIndice(c.a.n, c.a.d)}${bandeIndice(c.b.n, c.b.d)}
        <p class="fs-legende">Les deux bandes font la même longueur, mais leurs parts n'ont pas
        la même taille : on ne peut pas les compter ensemble. Il faut recouper les deux
        en ${c.commun}èmes.</p>`;
}

/** Le corps d'un item de calcul posé — partagé avec les problèmes. */
function itemDeCalcul(c, rng, {
    generatorId, skillId, marche, enonce = '', enonceTexte = '', question = '',
    avecCalcul = true
}) {
    const op = c.signe === '−' ? '−' : '+';
    const reponse = c.simplifie
        ? `${c.reduit.n}/${c.reduit.d}`
        : `${c.brut.n}/${c.brut.d}`;
    // L'ENTIER N'A PAS DE DÉNOMINATEUR : « 1 − 4/9 », jamais « 1/1 − 4/9 ».
    const texte = `${ecrireFraction(c.a)} ${op} ${ecrireFraction(c.b)} = ?`;
    return makeItem({
        seed: rng.seed, generatorId, skillId,
        answerKind: 'text',
        prompt: {
            // Le texte nu : c'est lui qui part sur la feuille et dans le
            // carnet d'erreurs. Y laisser l'HTML de l'énoncé imprimait les
            // balises.
            // Sans énoncé, le calcul EST la question : on ne peut pas le
            // retirer. Avec un énoncé, il n'est qu'une aide, et le réglage
            // décide.
            text: enonceTexte
                ? (avecCalcul ? `${enonceTexte} (${texte})` : enonceTexte)
                : texte,
            html: `<div class="frac-egalite">
                    ${enonce ? `<p class="frac-enonce">${enonce}</p>` : ''}
                    ${c.a.d === 1 ? `<span class="frac-entier">${c.a.n}</span>`
        : fracHtml(c.a.n, c.a.d)}
                    <span class="frac-signe">${op}</span>
                    ${fracHtml(c.b.n, c.b.d)}
                    <span class="frac-signe">=</span>
                    <span class="frac-trou" aria-label="résultat à écrire">?</span>
                   </div>`
        },
        answer: reponse,
        hints: (c.type === 'complement'
            ? ['Le tout, c\'est TOUTES les parts : écris l\'entier en '
                + `${c.commun}èmes avant de retirer.`]
            : [(NIVEAU[marche] || {}).aide || '',
                `Cherche un nombre à la fois dans la table de ${c.a.d} et dans celle de ${c.b.d}.`]
        ).concat(c.etapes).filter(Boolean),
        // LE PREMIER INDICE SE DESSINE. Rémy : « l'indice est incompréhensible ;
        // pourquoi ne pas avoir un petit schéma ? c'est souvent plus parlant ».
        // Une phrase qui dit « écris l'entier en 6èmes » suppose qu'on a déjà
        // compris ce qu'est l'entier ; une bande coupée en six, dont cinq sont
        // coloriées, le MONTRE.
        schemas: [schemaIndice(c)],
        explanation: c.etapes.join(' '),
        explicationPapier: `${ecrireFraction(c.a)} ${op} ${ecrireFraction(c.b)} = `
            + `${c.aReduit.n}/${c.commun} ${op} ${c.bReduit.n}/${c.commun} = ${c.brut.n}/${c.commun}`
            + (c.simplifie ? ` = ${reponse}.` : '.'),
        difficulty: c.type === 'complement'
            ? 2 : 2 + NIVEAUX_SOMME.findIndex(n => n.id === marche),
        meta: { calcul: c, marche, enonce, enonceTexte, question }
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
    // Quatre marches à deux questions : huit suffisaient, et le défaut de dix
    // les couvrait. Dès qu'on demande trois ou quatre questions par marche, il
    // en faut douze ou seize — sans ce conseil, le réglage n'aurait fait que
    // tronquer la progression plus tôt. Voir core/duree.js.
    conseil: (p) => ((p && p.niveau) || 'progressif') === 'progressif'
        ? conseilProgression(NIVEAUX_SOMME.length, p, PAR_MARCHE) : 6,
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
        paramParMarche({ defaut: PAR_MARCHE, marches: NIVEAUX_SOMME.length }),
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

// « ÉCRIS LES FRACTIONS EN FRACTION COLONNE », y compris au milieu d'une
// phrase. Une fraction en colonne est un `inline-flex` : elle se pose dans le
// texte comme un mot, sans casser la ligne de base.
//
// Deux formes, et c'est nécessaire : l'HTML pour l'écran, et le texte nu pour
// la feuille imprimée et le carnet d'erreurs — où « 5/9 » se recompose en
// colonnes tout seul (`fractions: true`), alors qu'une balise `<span>` s'y
// imprimerait telle quelle.
const colonneHtml = (f) => '<span class="fraction frac-dans-texte">'
    + `<span class="fraction-num">${f.n}</span>`
    + `<span class="fraction-den">${f.d}</span></span>`;
const nuHtml = (f) => `${f.n}/${f.d}`;

const HISTOIRES = [
    {
        quoi: 'tarte',
        somme: (a, b) => `Léa mange ${a} de la tarte, puis ${b}. Quelle part de la tarte a-t-elle mangée&nbsp;?`,
        difference: (a, b) => `Il restait ${a} de la tarte. On en mange ${b}. Quelle part reste-t-il&nbsp;?`
    },
    {
        quoi: 'arrosoir',
        somme: (a, b) => `Un arrosoir contient ${a} de litre. On y verse ${b} de litre. Combien contient-il&nbsp;?`,
        difference: (a, b) => `Un bidon contient ${a} de litre. On en verse ${b} de litre. Combien reste-t-il&nbsp;?`
    },
    {
        // Un trajet, c'est le TOUT : « Malo doit parcourir 8/9 du trajet » ne
        // veut rien dire. Une différence honnête, ici, compare deux marcheurs.
        quoi: 'trajet',
        somme: (a, b) => `Sur son trajet, Malo parcourt ${a} à pied, puis ${b} à vélo. Quelle part du trajet a-t-il faite&nbsp;?`,
        difference: (a, b) => `Malo a fait ${a} du trajet, Zoé en a fait ${b}. Quelle part du trajet Malo a-t-il faite en plus&nbsp;?`
    },
    {
        quoi: 'ruban',
        somme: (a, b) => `On colle bout à bout un ruban de ${a} de mètre et un autre de ${b} de mètre. Quelle longueur obtient-on&nbsp;?`,
        difference: (a, b) => `Un ruban mesure ${a} de mètre. On en coupe ${b} de mètre. Quelle longueur reste-t-il&nbsp;?`
    },
    {
        // « 5/9 du jardin SONT semés » mais « 1/9 du jardin EST semé » : on
        // tourne la phrase pour que l'accord ne dépende pas du numérateur tiré.
        quoi: 'jardin',
        somme: (a, b) => `Papi sème des radis sur ${a} du jardin et des carottes sur ${b}. Quelle part du jardin est semée&nbsp;?`,
        difference: (a, b) => `On a semé ${a} du jardin. Une taupe en abîme ${b}. Quelle part reste semée&nbsp;?`
    },
    {
        quoi: 'récréation',
        somme: (a, b) => `Zoé travaille ${a} d'heure, puis encore ${b} d'heure. Combien de temps a-t-elle travaillé&nbsp;?`,
        difference: (a, b) => `La récréation dure ${a} d'heure. Il s'en est déjà écoulé ${b}. Combien reste-t-il&nbsp;?`
    },
    {
        quoi: 'chocolat',
        somme: (a, b) => `Nino mange ${a} de la plaquette de chocolat, et son frère ${b}. Quelle part ont-ils mangée à eux deux&nbsp;?`,
        difference: (a, b) => `Il reste ${a} de la plaquette de chocolat. Nino en mange ${b}. Quelle part reste-t-il&nbsp;?`
    },
    {
        quoi: 'billes',
        somme: (a, b) => `Sur ses billes, Sacha en donne ${a} à Lou et ${b} à Anna. Quelle part de ses billes a-t-il donnée&nbsp;?`,
        difference: (a, b) => `Sacha a gagné ${a} des billes du sac, Lou en a gagné ${b}. Quelle part Sacha a-t-il gagnée en plus&nbsp;?`
    },
    {
        quoi: 'peinture',
        somme: (a, b) => `Le peintre couvre ${a} du mur le matin et ${b} l'après-midi. Quelle part du mur a-t-il peinte&nbsp;?`,
        difference: (a, b) => `Le peintre a couvert ${a} du mur. La pluie en abîme ${b}. Quelle part reste peinte&nbsp;?`
    },
    {
        quoi: 'argent de poche',
        somme: (a, b) => `Lou dépense ${a} de son argent de poche en bandes dessinées et ${b} en bonbons. Quelle part a-t-elle dépensée&nbsp;?`,
        difference: (a, b) => `Lou avait mis de côté ${a} de son argent de poche. Elle en dépense ${b}. Quelle part lui reste-t-il&nbsp;?`
    }
];

// LE COMPLÉMENT À UN, EN HISTOIRES.
//
// Rémy : « il a fait 4/9 du trajet, combien lui reste-t-il ? en expliquant
// qu'on fait 1 − 4/9 = 9/9 − 4/9 = 5/9 ». C'est le cas le plus facile — un
// seul dénominateur — et pourtant celui qui fait buter : il faut d'abord voir
// que le TOUT s'écrit en neuvièmes. Les contextes sont donc les plus concrets
// possibles : un livre qu'on lit, un puzzle qu'on monte, une bouteille qu'on
// vide. Le « reste », là, se voit.
const COMPLEMENTS = [
    { quoi: 'trajet', dit: (a) => `Malo a parcouru ${a} du trajet. Quelle part lui reste-t-il à faire&nbsp;?` },
    { quoi: 'livre', dit: (a) => `Zoé a lu ${a} de son livre. Quelle part lui reste-t-il à lire&nbsp;?` },
    { quoi: 'puzzle', dit: (a) => `Nino a monté ${a} de son puzzle. Quelle part lui reste-t-il à monter&nbsp;?` },
    // « Remplie aux 3/4 » se dit, « remplie aux 1/4 » non : l'article s'accorde
    // avec le numérateur, qu'on tire au hasard. On tourne la phrase.
    { quoi: 'bouteille', dit: (a) => `On a rempli ${a} de la bouteille. Quelle part reste-t-il à remplir&nbsp;?` },
    { quoi: 'pizza', dit: (a) => `On a mangé ${a} de la pizza. Quelle part reste-t-il dans le carton&nbsp;?` },
    { quoi: 'mur', dit: (a) => `Le peintre a couvert ${a} du mur. Quelle part lui reste-t-il à peindre&nbsp;?` },
    { quoi: 'devoirs', dit: (a) => `Lou a fait ${a} de ses devoirs. Quelle part lui reste-t-il à faire&nbsp;?` },
    { quoi: 'course', dit: (a) => `Sacha a couru ${a} de la course. Quelle part lui reste-t-il à courir&nbsp;?` },
    { quoi: 'jardin', dit: (a) => `Papi a semé ${a} du jardin. Quelle part reste-t-il à semer&nbsp;?` },
    { quoi: 'gâteau', dit: (a) => `Il ne reste que ${a} du gâteau. Quelle part a été mangée&nbsp;?` }
];

export const fracProblemeGenerator = {
    id: 'frac.probleme',
    label: 'Problèmes de fractions (addition et soustraction)',
    skills: ['num.frac.denominateur-commun', 'num.probleme.fraction'],
    answerKinds: ['text'],
    ecrit: true,
    fractions: true,
    // Les compléments à UN passent AVANT la progression et ne comptent pas
    // dedans : il faut donc les ajouter au compte, sinon régler « 3 questions
    // “combien reste-t-il ?” » mangerait trois marches sur quatre.
    conseil: (p) => {
        const avant = Math.max(0, Number((p && p.complements) ?? 3) || 0);
        const suite = ((p && p.niveau) || 'progressif') === 'progressif'
            ? conseilProgression(NIVEAUX_SOMME.length, p, PAR_MARCHE)
            : parMarcheDe(p, PAR_MARCHE) * 3;
        return avant + suite;
    },
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
        paramParMarche({ defaut: PAR_MARCHE, marches: NIVEAUX_SOMME.length }),
        { ...PARAM_OPERATION, default: 'les-deux' },
        PARAM_SIMPLIFIER,
        {
            id: 'complements', type: 'number', label: 'Questions « combien reste-t-il ? »',
            default: 3, min: 0, max: 10,
            aide: 'Les premières questions sont des compléments à UN : « il a parcouru 4/9 du '
                + 'trajet, combien lui reste-t-il ? ». C\'est le cas le plus facile — un seul '
                + 'dénominateur, aucun PPCM — et pourtant celui qui fait buter, parce qu\'il '
                + 'faut d\'abord voir que le tout s\'écrit en neuvièmes : 1 = 9/9. Ensuite '
                + 'viennent les problèmes à deux fractions.'
        },
        { id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 10, min: 4, max: 10 },
        // ÉCRIRE LE CALCUL, OU LE FAIRE CHERCHER. Rémy : « pour histoire de
        // fraction, mets une option pour écrire ou non le calcul ». L'énoncé
        // portait toujours « (1 − 1/5 = …) » entre parenthèses : c'est une
        // béquille utile au début — elle dit quelle opération poser — et une
        // réponse donnée d'avance ensuite, puisque tout le travail du problème
        // est justement de TROUVER le calcul.
        {
            id: 'calcul', type: 'checkbox', label: 'Écrire le calcul dans l\'énoncé',
            default: true,
            aide: 'Décoché, l\'énoncé s\'arrête à la question : c\'est à l\'élève de poser '
                + 'l\'opération. C\'est le même exercice, une marche plus haut.'
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const maxDen = Math.min(10, Number(params.maxDen) || 10);
        const avecCalcul = (params || {}).calcul !== false;
        const index = ctx.index || 0;

        // ON COMMENCE PAR LE RESTE. Un seul dénominateur, une seule idée : le
        // tout, c'est toutes les parts. Puis les deux fractions arrivent, et
        // avec elles le dénominateur commun.
        if (index < Number(params.complements ?? 3)) {
            const c = tirerComplement(rng, { maxDen });
            c.simplifie = params.simplifier === 'oui' && c.aSimplifiable;
            const h = rng.pick(COMPLEMENTS);
            return itemDeCalcul(c, rng, {
                generatorId: 'frac.probleme',
                skillId: 'num.frac.denominateur-commun',
                marche: 'complement',
                enonce: h.dit(colonneHtml(c.b)),
                enonceTexte: h.dit(nuHtml(c.b)).replace(/&nbsp;/g, ' '),
                question: h.quoi, avecCalcul
            });
        }

        const marche = marcheDe(params, index - Number(params.complements ?? 3));
        const c = tirerCalcul(rng, {
            niveau: marche,
            maxDen,
            operation: params.operation || 'les-deux'
        });
        c.simplifie = params.simplifier === 'oui' && c.aSimplifiable;

        const h = rng.pick(HISTOIRES);
        const dit = c.signe === '−' ? h.difference : h.somme;
        const enonce = dit(colonneHtml(c.a), colonneHtml(c.b));
        const enonceTexte = dit(nuHtml(c.a), nuHtml(c.b)).replace(/&nbsp;/g, ' ');

        return itemDeCalcul(c, rng, {
            generatorId: 'frac.probleme',
            skillId: 'num.frac.denominateur-commun',
            marche, enonce, enonceTexte, question: h.quoi, avecCalcul
        });
    }
};
