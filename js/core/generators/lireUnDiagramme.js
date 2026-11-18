// LIRE UN DIAGRAMME — onze marches, et une seule faute à attraper d'abord.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « tu as d'autres idées ? » — et l'inventaire du programme
// répondait depuis le 16 : « Les diagrammes statistiques — rien. Il n'y a rien
// pour LIRE ni pour choisir un diagramme en bâtons, un diagramme circulaire, un
// histogramme, alors que c'est la moitié du chapitre. »
//
// ── L'ORDRE DES MARCHES EST CELUI DES FAUTES, PAS CELUI DES OBJETS ────────
//
// On pourrait ranger : bâtons, puis camembert, puis histogramme. Ce serait un
// sommaire, pas une progression. L'ordre suivi ici est celui des erreurs qu'on
// veut rendre visibles une par une :
//
//   1. lire une barre sur un axe gradué de 1 en 1 — tout le monde y arrive, et
//      c'est le but : on y apprend à quoi sert l'axe ;
//   2. LA MÊME CHOSE AVEC UN AUTRE PAS. C'est la marche qui compte. Un élève
//      qui compte les traits et répond « 3 » au lieu de « 15 » ne s'est pas
//      trompé de calcul : il a lu un axe qui n'existait pas. Le diagnostic le
//      lui dit avec son nombre ;
//   3. la barre tombe ENTRE deux graduations — on ne peut plus compter du tout ;
//   4-6. comparer, totaliser, désigner : trois questions où la lecture n'est
//      plus la réponse mais la première étape ;
//   7-8. le camembert, qui ne dit JAMAIS d'effectif : il dit des parts, et il
//      faut un total — donné dans l'énoncé — pour en tirer un nombre ;
//   9-10. l'histogramme, dont les barres se touchent parce que l'axe est
//      continu : on lit une CLASSE, pas une valeur ;
//   11. choisir la représentation, qui est la question du brevet.
//
// Le fichier ne dessine rien : tout le tracé est dans `core/diagrammes.js`, où
// une seule géométrie sert l'écran et le papier.

import { makeItem, finalizeChoices } from '../items.js';
import { figure } from '../figures.js';
// « Combien de élèves » — la règle vit dans `core/accord.js` depuis que les
// statistiques l'ont payée, et on ne la récrit pas ici. Voir `deDevant`.
import { deDevant } from '../accord.js';
import {
    tirerSerie, batonsSvg, planBatons, direLesBatons,
    tirerHistogramme, histogrammeSvg, planHistogramme,
    tirerCirculaire, circulaireSvg, planCirculaire,
    SITUATIONS, NOMS_DIAGRAMMES, POURQUOI_PAS, PARTS_LISIBLES
} from '../diagrammes.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const LIRE = 'don.diagramme.lire';
const CIRCULAIRE = 'don.diagramme.circulaire';
const CHOISIR = 'don.diagramme.choisir';

// ── LES MARCHES ────────────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'batons-un', temps: 'A', titre: 'Lire un bâton (de 1 en 1)',
      skill: LIRE, difficulte: 1 },
    { id: 'batons-echelle', temps: 'A', titre: 'Lire un bâton quand l’axe va de 2, 5 ou 10',
      skill: LIRE, difficulte: 2 },
    { id: 'batons-entre', temps: 'A', titre: 'Le bâton s’arrête ENTRE deux graduations',
      skill: LIRE, difficulte: 3 },
    { id: 'batons-comparer', temps: 'A', titre: 'Combien de plus que l’autre ?',
      skill: LIRE, difficulte: 3 },
    { id: 'batons-total', temps: 'A', titre: 'Combien en tout ?',
      skill: LIRE, difficulte: 3 },
    { id: 'batons-record', temps: 'A', titre: 'Lequel revient le plus souvent ?',
      skill: LIRE, difficulte: 1 },
    { id: 'circulaire-part', temps: 'B', titre: 'Quelle PART représente ce secteur ?',
      skill: CIRCULAIRE, difficulte: 2 },
    { id: 'circulaire-effectif', temps: 'B', titre: 'Du pourcentage à l’effectif',
      skill: CIRCULAIRE, difficulte: 4 },
    { id: 'histogramme-classe', temps: 'C', titre: 'Lire une CLASSE d’un histogramme',
      skill: LIRE, difficulte: 2 },
    { id: 'histogramme-cumul', temps: 'C', titre: 'Combien en dessous de cette borne ?',
      skill: LIRE, difficulte: 4 },
    { id: 'choisir', temps: 'D', titre: 'Quel diagramme pour cette situation ?',
      skill: CHOISIR, difficulte: 3 }
];

const TEMPS = {
    A: 'A — le diagramme en bâtons',
    B: 'B — le diagramme circulaire',
    C: 'C — l’histogramme',
    D: 'D — choisir la représentation'
};

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({
    id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps
}));

/* ── CE QUE CHAQUE MARCHE DEMANDE ─────────────────────────────────────── */

/** Un pas de graduation qui n'est pas 1 — c'est tout le sujet de la marche. */
const pasTrompeur = (rng) => [2, 5, 10][rng.int(0, 2)];

/**
 * LA FAUTE QUI A UN NOM : compter les graduations au lieu de les lire.
 *
 * Elle ne vaut d'être nommée que si elle donne un AUTRE nombre que la bonne
 * réponse — sur un axe de 1 en 1, compter les traits donne la réponse juste, et
 * un diagnostic qui s'y déclencherait accuserait un élève qui a raison.
 */
const compterLesTraits = (valeur, pas) => {
    const traits = valeur / pas;
    // ET SEULEMENT SUR UNE BARRE QUI TOMBE SUR UNE GRADUATION : quand elle
    // s'arrête au milieu, « compter les traits » ne donne pas un nombre entier,
    // donc personne ne peut écrire cette réponse-là. Un diagnostic qui attend
    // « 1,5 » n'attrape rien et encombre la carte de correction.
    if (pas === 1 || !Number.isInteger(traits)) return null;
    return [{
        value: String(traits),
        why: `Tu as compté les GRADUATIONS : il y en a ${traits} sous le haut de la `
            + `barre. Mais l'axe ne va pas de 1 en 1, il va de ${pas} en ${pas} — `
            + `${traits} graduations, c'est ${traits} × ${pas} = ${valeur}.`
    }];
};

/** Le nombre tel qu'on l'écrit : 2,5 et non 2.5. */
const ecrire = (n) => String(n).replace('.', ',');

export function question(etape, rng) {
    const id = etape.id;

    if (id === 'choisir') {
        const s = SITUATIONS[rng.int(0, SITUATIONS.length - 1)];
        return { genre: 'choisir', situation: s };
    }

    if (id === 'circulaire-part' || id === 'circulaire-effectif') {
        const avecPourcents = id === 'circulaire-effectif';
        const c = tirerCirculaire(rng, { avecPourcents });
        return { genre: 'circulaire', c, avecPourcents };
    }

    if (id === 'histogramme-classe' || id === 'histogramme-cumul') {
        const pas = rng.bool() ? 1 : pasTrompeur(rng);
        const h = tirerHistogramme(rng, { pas });
        // LA BORNE DU CUMUL LAISSE TOUJOURS UNE CLASSE DEHORS : « combien en
        // dessous de 180 » quand 180 est le bout de l'axe demande le total, et
        // la question n'est plus celle du cumul.
        const i = id === 'histogramme-cumul'
            ? rng.int(1, Math.max(1, h.classes.length - 2))
            : rng.int(0, h.classes.length - 1);
        return { genre: 'histogramme', h, i, cumul: id === 'histogramme-cumul' };
    }

    const pas = id === 'batons-un' ? 1 : pasTrompeur(rng);
    const s = tirerSerie(rng, { pas, entre: id === 'batons-entre' });
    // LA BARRE DONT ON PARLE N'EST PAS TIRÉE AU HASARD DANS TOUS LES CAS : pour
    // « entre deux graduations », on désigne justement celle qui tombe au
    // milieu — sinon la marche tire parfois une barre pleine et n'enseigne rien.
    let i = rng.int(0, s.barres.length - 1);
    if (id === 'batons-entre') {
        const demi = s.barres.findIndex(b => b.valeur % s.pas !== 0);
        if (demi >= 0) i = demi;
    }
    let j = i;
    if (id === 'batons-comparer') {
        // DEUX BARRES DIFFÉRENTES, ET LA PLUS HAUTE EN PREMIER : « combien de
        // plus » avec une réponse négative est une autre question, qui n'est pas
        // celle de cette marche.
        for (let essai = 0; essai < 20 && j === i; essai++) j = rng.int(0, s.barres.length - 1);
        if (s.barres[j].valeur > s.barres[i].valeur) { const t = i; i = j; j = t; }
    }
    if (id === 'batons-record') {
        i = s.barres.reduce((best, b, k) => (b.valeur > s.barres[best].valeur ? k : best), 0);
    }
    return { genre: 'batons', s, i, j, id };
}

/* ── L'ITEM ───────────────────────────────────────────────────────────── */

function itemBatons(q, etape, rng) {
    const { s, i, j } = q;
    const b = s.barres[i];
    const autre = s.barres[j];
    const commun = {
        skillId: LIRE,
        // LE SURLIGNAGE DÉSIGNE LA BARRE DONT ON PARLE — sauf quand la question
        // EST de la trouver.
        surligne: etape.id === 'batons-record' || etape.id === 'batons-total'
            ? null : b.nom
    };

    if (etape.id === 'batons-record') {
        const svg = batonsSvg(s, {});
        return {
            ...commun, svg, plan: planBatons(s),
            answerKind: 'choice',
            texte: `${s.contexte.sujet} : quelle colonne est la plus haute ?`,
            question: 'Quelle colonne est la plus haute ?',
            choices: finalizeChoices(rng, [
                { value: b.nom, label: b.nom, correct: true },
                ...s.barres.filter((x, k) => k !== i).map(x => ({
                    value: x.nom, label: x.nom, correct: false,
                    why: `${x.nom} compte ${x.valeur} ${s.contexte.quoi}, et ce n'est pas `
                        + `le plus : ${b.nom} en a ${b.valeur}.`
                }))
            ], { count: Math.min(4, s.barres.length) }),
            answer: b.nom,
            explication: `La colonne la plus haute est ${b.nom}, à ${b.valeur} `
                + `${s.contexte.quoi}.`,
            indices: ['Cherche la colonne qui monte le plus haut : inutile de lire '
                + 'les nombres pour cela.',
            `Ensuite seulement, lis sa hauteur sur l'axe : elle vaut ${b.valeur}.`]
        };
    }

    if (etape.id === 'batons-total') {
        const total = s.total;
        return {
            ...commun, svg: batonsSvg(s, {}), plan: planBatons(s),
            answerKind: 'numeric',
            texte: `${s.contexte.sujet} : combien ${deDevant(s.contexte.quoi)} en tout ?`,
            question: `Combien ${deDevant(s.contexte.quoi)} en tout ?`,
            answer: String(total),
            // LA FAUTE D'ICI N'EST PAS LA GRADUATION, C'EST LE COMPTAGE : on
            // additionne les HAUTEURS, pas le nombre de colonnes.
            diagnostics: [{
                value: String(s.barres.length),
                why: `Tu as compté les COLONNES : il y en a ${s.barres.length}. La `
                    + `question demande le total des ${s.contexte.quoi}, donc la somme `
                    + 'de leurs hauteurs.'
            }],
            explication: `On additionne toutes les colonnes : `
                + s.barres.map(x => x.valeur).join(' + ') + ` = ${total}.`,
            indices: ['Lis d’abord la hauteur de CHAQUE colonne, une par une.',
                `Puis additionne-les : ${s.barres.map(x => x.valeur).join(' + ')}.`]
        };
    }

    if (etape.id === 'batons-comparer') {
        const ecart = b.valeur - autre.valeur;
        return {
            ...commun, svg: batonsSvg(s, {}), plan: planBatons(s),
            answerKind: 'numeric',
            texte: `${s.contexte.sujet} : combien ${deDevant(s.contexte.quoi)} de plus `
                + `pour ${b.nom} que pour ${autre.nom} ?`,
            question: `Combien de plus pour ${b.nom} que pour ${autre.nom} ?`,
            answer: ecrire(ecart),
            // LA FAUTE D'ICI EST DE RÉPONDRE LA HAUTEUR AU LIEU DE L'ÉCART.
            diagnostics: [{
                value: ecrire(b.valeur),
                why: `${b.valeur}, c'est la hauteur de ${b.nom}. La question demande `
                    + `COMBIEN DE PLUS que ${autre.nom}, donc une soustraction : `
                    + `${ecrire(b.valeur)} − ${ecrire(autre.valeur)}.`
            }],
            explication: `${b.nom} : ${ecrire(b.valeur)}. ${autre.nom} : `
                + `${ecrire(autre.valeur)}. La différence vaut ${ecrire(b.valeur)} − `
                + `${ecrire(autre.valeur)} = ${ecrire(ecart)}.`,
            indices: [`Lis les deux hauteurs sur l'axe, gradué de ${s.pas} en ${s.pas}.`,
                `${b.nom} vaut ${ecrire(b.valeur)} et ${autre.nom} vaut `
                + `${ecrire(autre.valeur)} : il reste à soustraire.`]
        };
    }

    // Les trois marches de lecture pure.
    const svg = batonsSvg(s, { surligne: b.nom });
    return {
        ...commun, svg, plan: planBatons(s),
        answerKind: 'numeric',
        texte: `${s.contexte.sujet} : combien ${deDevant(s.contexte.quoi)} pour ${b.nom} ?`,
        question: `Combien ${deDevant(s.contexte.quoi)} pour ${b.nom} ?`,
        answer: ecrire(b.valeur),
        diagnostics: compterLesTraits(b.valeur, s.pas),
        explication: s.pas === 1
            ? `La colonne ${b.nom} monte jusqu'à ${ecrire(b.valeur)}.`
            : `L'axe va de ${s.pas} en ${s.pas}. La colonne ${b.nom} monte `
                + `${b.valeur % s.pas === 0
                    ? `jusqu'à la graduation ${ecrire(b.valeur)}`
                    : `entre ${b.valeur - s.pas / 2} et ${b.valeur + s.pas / 2}, `
                      + `donc jusqu'à ${ecrire(b.valeur)}`}.`,
        indices: [
            s.pas === 1 ? 'Suis le haut de la colonne jusqu’à l’axe de gauche.'
                : `Regarde D'ABORD l'axe de gauche : il ne va pas de 1 en 1, il va de `
                  + `${s.pas} en ${s.pas}.`,
            b.valeur % s.pas === 0
                ? `Le haut de la colonne tombe sur une graduation : lis le nombre `
                  + 'écrit en face.'
                : 'Le haut de la colonne tombe ENTRE deux graduations : la valeur est '
                  + 'au milieu des deux nombres écrits.'
        ]
    };
}

function itemCirculaire(q, etape, rng) {
    const c = q.c;
    const part = c.part;
    if (!q.avecPourcents) {
        const nom = c.parts[0].nom;
        return {
            skillId: CIRCULAIRE, svg: circulaireSvg(c), plan: planCirculaire(c),
            answerKind: 'choice',
            texte: `${c.contexte.sujet} : quelle part du disque représente ${nom} ?`,
            question: `Quelle part du disque représente ${nom} ?`,
            answer: `${part.num}/${part.den}`,
            // ── TOUTES LES PROPOSITIONS PORTENT LEUR MOT, OU AUCUNE ──────
            //
            // VU SUR LA PLANCHE : la bonne réponse s'écrivait « 1/5 (un
            // cinquième) » et les trois leurres « 1/3 », « 1/2 », « 1/4 ».
            // L'élève n'a plus besoin de regarder le disque : la plus longue
            // est la bonne. Une étiquette qui n'est pas donnée à TOUTES les
            // propositions est un indice gratuit, et il annule la question.
            choices: finalizeChoices(rng, PARTS_LISIBLES.map(p => {
                const v = `${p.num}/${p.den}`;
                const bon = v === `${part.num}/${part.den}`;
                return {
                    value: v, label: `${v} (${p.mot})`, correct: bon,
                    why: bon ? null : `Le secteur de ${nom} n'occupe pas ${p.mot} du disque.`
                };
            }), { count: 4 }),
            explication: `Le secteur de ${nom} occupe ${part.mot} du disque, `
                + `soit ${part.num}/${part.den}.`,
            indices: ['Un diagramme circulaire ne donne aucun effectif : il montre des '
                + 'PARTS du tout.',
            'Compare le secteur au disque entier : en tient-il la moitié, le quart, '
                + 'le tiers ?']
        };
    }
    // DU POURCENTAGE À L'EFFECTIF — et le total est dans l'énoncé, PAS sur le
    // dessin. C'est la leçon : un camembert seul ne répond jamais à « combien ».
    const pct = c.pourcents[0];
    const nom = c.parts[0].nom;
    const reponse = Math.round(c.total * pct / 100);
    return {
        skillId: CIRCULAIRE, svg: circulaireSvg(c), plan: planCirculaire(c),
        answerKind: 'numeric',
        texte: `${c.contexte.sujet}. Il y a ${c.total} ${c.contexte.quoi} en tout. `
            + `Combien pour ${nom} ?`,
        question: `Il y a ${c.total} ${c.contexte.quoi} en tout. Combien pour ${nom} ?`,
        answer: String(reponse),
        diagnostics: [{
            value: String(pct),
            why: `${pct} est un POURCENTAGE, pas un nombre de ${c.contexte.quoi}. `
                + `Il faut prendre ${pct} % de ${c.total}, c'est-à-dire `
                + `${c.total} × ${pct} ÷ 100.`
        }],
        explication: `${pct} % de ${c.total}, c'est ${c.total} × ${pct} ÷ 100 = ${reponse}.`,
        indices: ['Le disque donne un POURCENTAGE ; le total est écrit dans l’énoncé.',
            `Calcule ${pct} % de ${c.total} : ${c.total} × ${pct} ÷ 100.`]
    };
}

function itemHistogramme(q, etape) {
    const { h, i, cumul } = q;
    const c = h.classes[i];
    if (!cumul) {
        return {
            skillId: LIRE, svg: histogrammeSvg(h, { surligne: c.de }), plan: planHistogramme(h),
            answerKind: 'numeric',
            texte: `${h.contexte.sujet} : combien ${deDevant(h.contexte.quoi)} entre `
                + `${c.de} et ${c.a} ${h.contexte.unite} ?`,
            question: `Combien ${deDevant(h.contexte.quoi)} entre ${c.de} et ${c.a} `
                + `${h.contexte.unite} ?`,
            answer: String(c.valeur),
            diagnostics: compterLesTraits(c.valeur, h.pas),
            explication: `La barre qui va de ${c.de} à ${c.a} ${h.contexte.unite} monte `
                + `jusqu'à ${c.valeur}.`,
            indices: ['Les barres se touchent parce que l’axe du bas est CONTINU : une '
                + 'barre couvre un intervalle, pas une valeur.',
            `Cherche la barre qui commence à ${c.de} et finit à ${c.a}, puis lis sa `
                + `hauteur sur l'axe de gauche (de ${h.pas} en ${h.pas}).`]
        };
    }
    const dessous = h.classes.slice(0, i + 1);
    const somme = dessous.reduce((t, x) => t + x.valeur, 0);
    return {
        skillId: LIRE, svg: histogrammeSvg(h, {}), plan: planHistogramme(h),
        answerKind: 'numeric',
        texte: `${h.contexte.sujet} : combien ${deDevant(h.contexte.quoi)} en dessous `
            + `de ${c.a} ${h.contexte.unite} ?`,
        question: `Combien ${deDevant(h.contexte.quoi)} en dessous de ${c.a} `
            + `${h.contexte.unite} ?`,
        answer: String(somme),
        // LA FAUTE D'ICI : ne lire QUE la dernière barre, au lieu d'additionner
        // toutes celles qui sont en dessous de la borne.
        diagnostics: [{
            value: String(c.valeur),
            why: `${c.valeur}, c'est la seule barre de ${c.de} à ${c.a}. « En dessous `
                + `de ${c.a} » comprend AUSSI toutes les barres d'avant : il faut les `
                + 'additionner.'
        }],
        explication: `On additionne toutes les barres situées avant ${c.a} : `
            + dessous.map(x => x.valeur).join(' + ') + ` = ${somme}.`,
        indices: [`« En dessous de ${c.a} » ne désigne pas une barre, mais TOUTES celles `
            + 'qui sont à sa gauche.',
        `Additionne-les : ${dessous.map(x => x.valeur).join(' + ')}.`]
    };
}

function itemChoisir(q, etape, rng) {
    const s = q.situation;
    const autres = Object.keys(NOMS_DIAGRAMMES).filter(k => k !== s.bon);
    return {
        skillId: CHOISIR, svg: '', plan: null,
        answerKind: 'choice',
        texte: `${s.texte} Quelle représentation convient ?`,
        question: s.texte,
        answer: s.bon,
        choices: finalizeChoices(rng, [
            { value: s.bon, label: NOMS_DIAGRAMMES[s.bon], correct: true },
            ...autres.map(k => ({
                value: k, label: NOMS_DIAGRAMMES[k], correct: false, why: POURQUOI_PAS[k]
            }))
        ], { count: 4 }),
        explication: `${NOMS_DIAGRAMMES[s.bon]}. ${s.pourquoi}`,
        indices: ['Trois questions suffisent : compare-t-on des CATÉGORIES, partage-t-on '
            + 'un TOUT, ou groupe-t-on des mesures en CLASSES ?',
        s.pourquoi]
    };
}

/* ── LE GÉNÉRATEUR ────────────────────────────────────────────────────── */

export const lireUnDiagrammeGenerator = {
    id: 'don.diagrammes',
    label: 'Lire un diagramme',
    skills: [LIRE, CIRCULAIRE, CHOISIR],
    answerKinds: ['numeric', 'choice'],
    // `ecrit` RESTE FAUX : « combien d'élèves pour le judo ? » ne veut rien dire
    // sans le diagramme, et une consigne qui renvoie à une figure absente ne
    // demande rien. C'est `printable` qui ouvre la fiche — elle, porte le
    // dessin (voir `planBatons`, `planCirculaire`, `planHistogramme`).
    ecrit: false,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);
        const fait = q.genre === 'batons' ? itemBatons(q, etape, rng)
            : q.genre === 'circulaire' ? itemCirculaire(q, etape, rng)
                : q.genre === 'histogramme' ? itemHistogramme(q, etape)
                    : itemChoisir(q, etape, rng);

        return makeItem({
            seed: rng.seed,
            generatorId: 'don.diagrammes',
            skillId: fait.skillId,
            answerKind: fait.answerKind,
            prompt: {
                text: fait.texte,
                // LA FEUILLE NE RÉCITE PAS LE DIAGRAMME : elle le DESSINE, et
                // la question y est la même qu'à l'écran. Un énoncé papier qui
                // écrirait « Judo : 15 » répondrait à sa propre question.
                papier: fait.question,
                figure: fait.plan,
                html: `<div class="game-question dg-question">${fait.question}</div>`
                    + (fait.svg ? figure(fait.svg, 'fig-diagramme') : '')
            },
            answer: fait.answer,
            choices: fait.choices || null,
            diagnostics: fait.diagnostics || null,
            hints: fait.indices,
            explanation: fait.explication,
            difficulty: etape.difficulte,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                genre: q.genre,
                // LE PAS DE GRADUATION VOYAGE : c'est lui que le bilan doit
                // pouvoir regarder quand une marche résiste.
                pas: q.s ? q.s.pas : (q.h ? q.h.pas : null),
                decimal: true,
                figure: fait.svg || null
            }
        });
    }
};

export default lireUnDiagrammeGenerator;
