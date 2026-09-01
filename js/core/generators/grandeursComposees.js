// LES GRANDEURS COMPOSÉES — ce qui se cache derrière la barre de fraction.
//
// Rémy : « je pense qu'il faudrait des exercices sur les grandeurs composées ».
//
// CE CHAPITRE N'EST PAS UN CHAPITRE DE CALCUL, C'EST UN CHAPITRE DE LECTURE.
// Les opérations sont une division et une multiplication ; ce qui se rate, c'est
// de savoir LAQUELLE. Et la réponse est écrite dans l'unité : « g/cm³ » se lit
// « des grammes POUR UN centimètre cube », donc c'est une masse DIVISÉE par un
// volume. Un élève qui lit l'unité n'a plus à retenir de formule — il les
// retrouve toutes les trois, pour n'importe quelle grandeur composée, y compris
// celles qu'il n'a jamais vues.
//
// D'OÙ LA FORME DES ÉNONCÉS : l'unité est TOUJOURS écrite, et l'explication
// commence par la relire. « 7,9 g/cm³, c'est 7,9 g pour 1 cm³ ; donc pour 20 cm³
// il y en a vingt fois plus. » C'est le raisonnement de proportionnalité qu'on
// veut installer, pas la formule.
//
// LA VITESSE N'EST PAS ICI. Elle a son propre exercice — « Temps, Distance,
// Vitesse » —, et elle est si familière qu'elle masque le reste : un élève sait
// faire des km/h sans avoir compris ce qu'est une grandeur composée. On
// travaille donc les AUTRES, celles où il faut vraiment lire l'unité.

import { makeItem } from '../items.js';

/**
 * LES GRANDEURS. Chacune porte son unité composée, celles de ses deux
 * grandeurs simples, et de quoi fabriquer un énoncé crédible.
 *
 * `valeurs` sont les valeurs réalistes de la grandeur composée — celles d'un
 * vrai tableau : le fer pèse bien 7,9 g/cm³, un robinet débite bien 12 L/min.
 * Un énoncé qui donnerait 340 g/cm³ apprendrait à ne pas se relire.
 */
export const GRANDEURS = [
    {
        id: 'masse-volumique', nom: 'la masse volumique', genre: 'f', unite: 'g/cm³',
        haut: { nom: 'masse', unite: 'g' }, bas: { nom: 'volume', unite: 'cm³' },
        // Le nom SANS article : l'énoncé le colle à « un morceau de », et « un
        // morceau de le plomb » était du charabia. L'élision devant une voyelle
        // se fait ici, une fois, plutôt que dans chaque énoncé.
        sujets: [
            { quoi: 'fer', valeur: 7.9 }, { quoi: 'aluminium', valeur: 2.7 },
            { quoi: 'plomb', valeur: 11.3 }, { quoi: 'chêne', valeur: 0.75 },
            { quoi: 'verre', valeur: 2.5 }, { quoi: 'cuivre', valeur: 8.9 }
        ],
        bases: [10, 20, 4, 5, 50, 100, 2],
        dire: (s) => `un morceau ${de(s.quoi)}`,
        haut_q: (b, u) => `Quelle est sa masse pour ${b} ${u} ?`,
        bas_q: (h, u) => `Quel est son volume si sa masse est de ${h} ${u} ?`
    },
    {
        id: 'prix-au-kilo', nom: 'le prix au kilogramme', genre: 'm', unite: '€/kg',
        haut: { nom: 'prix', unite: '€' }, bas: { nom: 'masse', unite: 'kg' },
        sujets: [
            { quoi: 'les pommes', valeur: 2.4 }, { quoi: 'le riz', valeur: 1.8 },
            { quoi: 'les tomates', valeur: 3.5 }, { quoi: 'les carottes', valeur: 1.2 },
            { quoi: 'le café', valeur: 12 }, { quoi: 'les cerises', valeur: 6.5 }
        ],
        bases: [2, 3, 4, 5, 10, 20],
        dire: (s) => s.quoi,
        haut_q: (b, u) => `Combien coûtent ${b} ${u} ?`,
        bas_q: (h, u) => `Quelle masse a-t-on achetée pour ${h} ${u} ?`
    },
    {
        id: 'debit', nom: 'le débit', genre: 'm', unite: 'L/min',
        haut: { nom: 'volume', unite: 'L' }, bas: { nom: 'durée', unite: 'min' },
        sujets: [
            { quoi: 'un robinet', valeur: 12 }, { quoi: 'une douche', valeur: 9 },
            { quoi: 'un arrosage automatique', valeur: 5 }, { quoi: 'une pompe', valeur: 25 },
            { quoi: 'une fontaine', valeur: 4 }
        ],
        bases: [3, 4, 5, 10, 12, 20],
        dire: (s) => s.quoi,
        haut_q: (b, u) => `Quel volume s'écoule en ${b} ${u} ?`,
        bas_q: (h, u) => `Combien de temps faut-il pour recueillir ${h} ${u} ?`
    },
    {
        id: 'densite', nom: 'la densité de population', genre: 'f', unite: 'hab/km²',
        haut: { nom: 'population', unite: 'habitants' }, bas: { nom: 'superficie', unite: 'km²' },
        sujets: [
            { quoi: 'un département', valeur: 85 }, { quoi: 'une région', valeur: 120 },
            { quoi: 'une île', valeur: 45 }, { quoi: 'un canton', valeur: 230 }
        ],
        bases: [10, 20, 50, 100, 200, 400],
        dire: (s) => s.quoi,
        haut_q: (b, u) => `Combien d'habitants compte une zone de ${b} ${u} ?`,
        bas_q: (h, u) => `Quelle superficie occupent ${h} ${u} ?`
    },
    {
        id: 'salaire', nom: 'le salaire horaire', genre: 'm', unite: '€/h',
        haut: { nom: 'salaire', unite: '€' }, bas: { nom: 'durée', unite: 'h' },
        sujets: [
            { quoi: 'un plombier', valeur: 32 }, { quoi: 'une jardinière', valeur: 18 },
            { quoi: 'un baby-sitter', valeur: 11 }, { quoi: 'une professeure particulière', valeur: 25 }
        ],
        bases: [2, 3, 4, 5, 8, 10],
        dire: (s) => s.quoi,
        haut_q: (b, u) => `Combien gagne-t-il en ${b} ${u} ?`,
        bas_q: (h, u) => `Combien de temps a-t-il travaillé pour gagner ${h} ${u} ?`
    },
    {
        id: 'rendement', nom: 'le rendement', genre: 'm', unite: 'kg/ha',
        haut: { nom: 'récolte', unite: 'kg' }, bas: { nom: 'surface', unite: 'ha' },
        sujets: [
            { quoi: 'un champ de blé', valeur: 7000 }, { quoi: 'un verger', valeur: 4500 },
            { quoi: 'une vigne', valeur: 6000 }
        ],
        bases: [2, 3, 4, 5, 10],
        dire: (s) => s.quoi,
        haut_q: (b, u) => `Quelle récolte donnent ${b} ${u} ?`,
        bas_q: (h, u) => `Quelle surface a-t-il fallu pour récolter ${h} ${u} ?`
    }
];

/** « de fer », mais « d'aluminium » : l'élision se fait ici, pas dans l'énoncé. */
const de = (mot) => (/^[aeiouyéèêh]/i.test(mot) ? `d'${mot}` : `de ${mot}`);

/**
 * LES CONVERSIONS D'UNITÉS COMPOSÉES — l'autre moitié du chapitre.
 *
 * Passer de m/s à km/h n'est pas une règle à retenir mais deux conversions
 * enchaînées : les mètres deviennent des kilomètres (÷ 1000), les secondes des
 * heures (÷ 3600), et le rapport est donc multiplié par 3600 ÷ 1000 = 3,6.
 * `pourquoi` le dit ; c'est cela qu'on veut installer, pas le facteur.
 */
export const CONVERSIONS = [
    {
        de: 'm/s', vers: 'km/h', facteur: 3.6,
        valeurs: [5, 10, 15, 20, 25, 30],
        pourquoi: 'les mètres deviennent des kilomètres (on divise par 1 000) et les secondes '
            + 'des heures (on divise par 3 600) : le rapport est donc multiplié par '
            + '3 600 ÷ 1 000 = 3,6'
    },
    {
        de: 'km/h', vers: 'm/s', facteur: 1 / 3.6,
        valeurs: [18, 36, 54, 72, 90, 108],
        pourquoi: 'c\'est l\'opération inverse de la précédente : on divise par 3,6'
    },
    {
        de: 'g/cm³', vers: 'kg/m³', facteur: 1000,
        valeurs: [1, 2.5, 2.7, 7.9, 8.9, 11.3],
        pourquoi: 'un gramme vaut un millième de kilogramme, et un centimètre cube un '
            + 'millionième de mètre cube : le rapport est multiplié par 1 000 000 ÷ 1 000 = 1 000'
    },
    {
        de: 'L/min', vers: 'L/h', facteur: 60,
        valeurs: [4, 5, 9, 12, 25],
        pourquoi: 'une heure vaut soixante minutes, donc il en coule soixante fois plus'
    }
];

const fr = (x) => {
    const n = Math.round(x * 1000) / 1000;
    return String(n).replace('.', ',');
};

const grandeurDe = (id) => GRANDEURS.find(g => g.id === id) || null;

export const grandeursComposeesGenerator = {
    id: 'mes.grandeurs-composees',
    label: 'Les grandeurs composées',
    skills: ['mes.grandeurs.composees'],
    answerKinds: ['numeric'],
    ecrit: true,
    params: [
        {
            id: 'chercher', type: 'select', label: 'Ce qu\'on cherche', default: 'melange',
            aide: 'Les trois questions sont la MÊME relation lue dans les trois sens. '
                + 'Chercher la grandeur composée est le plus facile — c\'est une division, '
                + 'et l\'unité la dicte. Chercher le dénominateur est le plus dur.',
            options: [
                { value: 'composee', label: 'La grandeur composée (une division)' },
                { value: 'haut', label: 'La grandeur du haut (une multiplication)' },
                { value: 'bas', label: 'La grandeur du bas (une division)' },
                { value: 'convertir', label: 'Convertir une unité composée' },
                { value: 'melange', label: 'Mélangé' }
            ]
        },
        {
            id: 'grandeurs', type: 'multiselect', label: 'Les grandeurs travaillées',
            aide: 'La vitesse n\'est pas dans la liste : elle a son propre exercice, et elle '
                + 'est si familière qu\'elle masque le reste — on sait faire des km/h sans '
                + 'avoir compris ce qu\'est une grandeur composée.',
            options: GRANDEURS.map(g => ({ value: g.id, label: `${g.nom} (${g.unite})` })),
            default: GRANDEURS.map(g => g.id)
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const quoi = ['composee', 'haut', 'bas', 'convertir'].includes(p.chercher)
            ? p.chercher : rng.pick(['composee', 'haut', 'bas', 'composee', 'haut', 'convertir']);
        if (quoi === 'convertir') return itemConversion(rng);

        const choisies = (Array.isArray(p.grandeurs) && p.grandeurs.length
            ? p.grandeurs.filter(grandeurDe) : GRANDEURS.map(g => g.id)).map(grandeurDe);
        const g = rng.pick(choisies.length ? choisies : GRANDEURS);
        const sujet = rng.pick(g.sujets);
        const bas = rng.pick(g.bases);
        // Le produit est arrondi au millième : « 0,75 × 20 = 15 » doit tomber
        // juste, sinon l'élève doute de son calcul et non de son raisonnement.
        const haut = Math.round(sujet.valeur * bas * 1000) / 1000;

        const lecture = `${fr(sujet.valeur)} ${g.unite}, cela veut dire ${fr(sujet.valeur)} `
            + `${g.haut.unite} pour 1 ${g.bas.unite}`;
        // L'ACCORD SE FAIT SUR LA GRANDEUR, pas au jugé : « quelle est la masse
        // volumique » mais « QUEL est le débit ». Un énoncé mal accordé se
        // relit deux fois, et l'élève doute de sa lecture avant de douter de
        // son calcul.
        const quelEst = g.genre === 'f' ? 'Quelle est' : 'Quel est';
        let texte, reponse, unite, calcul;
        if (quoi === 'composee') {
            texte = `Pour ${g.dire(sujet)}, on mesure ${fr(haut)} ${g.haut.unite} `
                + `pour ${fr(bas)} ${g.bas.unite}. ${quelEst} ${g.nom} ?`;
            reponse = sujet.valeur; unite = g.unite;
            calcul = `${fr(haut)} ÷ ${fr(bas)} = ${fr(sujet.valeur)} ${g.unite}`;
        } else if (quoi === 'haut') {
            texte = `Pour ${g.dire(sujet)}, ${g.nom} vaut ${fr(sujet.valeur)} ${g.unite}. `
                + g.haut_q(fr(bas), g.bas.unite);
            reponse = haut; unite = g.haut.unite;
            calcul = `${fr(sujet.valeur)} × ${fr(bas)} = ${fr(haut)} ${g.haut.unite}`;
        } else {
            texte = `Pour ${g.dire(sujet)}, ${g.nom} vaut ${fr(sujet.valeur)} ${g.unite}. `
                + g.bas_q(fr(haut), g.haut.unite);
            reponse = bas; unite = g.bas.unite;
            calcul = `${fr(haut)} ÷ ${fr(sujet.valeur)} = ${fr(bas)} ${g.bas.unite}`;
        }

        return makeItem({
            seed: rng.seed,
            generatorId: 'mes.grandeurs-composees',
            skillId: 'mes.grandeurs.composees',
            answerKind: 'numeric',
            prompt: { text: `${texte} (en ${unite})`, papier: `${texte} Réponds en ${unite}.` },
            answer: reponse,
            hints: [
                'RELIS L\'UNITÉ, elle dit tout : la barre « / » se lit « pour un ». '
                    + `Ici, ${lecture}.`,
                quoi === 'composee'
                    ? 'On cherche « combien pour UN » : c\'est donc une DIVISION — la grandeur '
                        + 'du haut divisée par celle du bas.'
                    : (quoi === 'haut'
                        ? 'On sait combien il y en a pour un, et on en veut plusieurs : c\'est '
                            + 'une MULTIPLICATION.'
                        : 'On sait combien il y en a pour un, et on sait le total : pour savoir '
                            + 'combien d\'unités, on DIVISE.'),
                `Le calcul : ${calcul}.`
            ],
            explanation: `${lecture}. Donc ${calcul}.`,
            // Chercher le dénominateur demande de retourner la relation : c'est
            // le sens que les élèves inversent.
            difficulty: quoi === 'composee' ? 2 : (quoi === 'haut' ? 2 : 3),
            meta: { grandeur: g.id, quoi, unite, theme: `composee-${quoi}` }
        });
    }
};

function itemConversion(rng) {
    const c = rng.pick(CONVERSIONS);
    const v = rng.pick(c.valeurs);
    const reponse = Math.round(v * c.facteur * 1000) / 1000;
    const texte = `Convertis ${fr(v)} ${c.de} en ${c.vers}.`;
    return makeItem({
        seed: rng.seed,
        generatorId: 'mes.grandeurs-composees',
        skillId: 'mes.grandeurs.composees',
        answerKind: 'numeric',
        prompt: { text: `${texte} (en ${c.vers})`, papier: texte },
        answer: reponse,
        hints: [
            'Une unité composée se convertit en convertissant SES DEUX unités, l\'une après '
                + 'l\'autre — pas en retenant un facteur.',
            `Ici, ${c.pourquoi}.`,
            `${fr(v)} ${c.de} = ${fr(reponse)} ${c.vers}.`
        ],
        explanation: `${fr(v)} ${c.de} = ${fr(reponse)} ${c.vers}, parce que ${c.pourquoi}.`,
        difficulty: 3,
        meta: { conversion: `${c.de}->${c.vers}`, quoi: 'convertir', unite: c.vers, theme: 'composee-convertir' }
    });
}
