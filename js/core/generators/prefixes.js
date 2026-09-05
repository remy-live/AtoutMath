// LES PRÉFIXES — kilo, méga, giga, téra, milli, micro, nano.
//
// Rémy : « je ne veux pour l'instant que des exercices sur les puissances sur
// les préfixes ». Il en a fait une colonne entière de sa fiche de quatrième —
// « Nombre / Lecture-préfixe / 10ⁿ », de pico à trillion —, puis il l'a remise
// en jeu deux pages plus loin sur les codes couleur des résistances, et une
// troisième fois dans le devoir : « le diamètre d'un cheveu est environ 50 µm,
// exprime-le en mètres », « 8 To = 8 × 10¹² ».
//
// TROIS CHOSES DIFFÉRENTES, ET ON LES CONFOND :
//
//   · le SYMBOLE — M, µ, n, T — celui qu'on lit sur un emballage ;
//   · le PRÉFIXE — méga, micro, nano, téra — celui qu'on prononce ;
//   · la PUISSANCE — 10⁶, 10⁻⁶, 10⁻⁹, 10¹² — celle avec laquelle on CALCULE.
//
// Un élève sait presque toujours dire « méga, c'est un million ». Il reste
// pourtant bloqué sur « 3 Mo = … octets », parce qu'il n'a jamais fait le
// troisième pas. La progression fait donc les trois séparément avant de les
// mettre ensemble, et la conversion — qui est le but — arrive en dernier.
//
// DEUX PIÈGES QUI MÉRITENT LEUR MARCHE. « m » minuscule est MILLI (10⁻³) quand
// « M » majuscule est MÉGA (10⁶) : un facteur d'un milliard tient dans une
// casse. Et « centi » (10⁻²) ne suit pas le pas de trois — c'est une exception
// héritée du centimètre, et l'annoncer évite qu'on la prenne pour la règle.
//
// Module pur : ni DOM, ni horloge. Il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import { PREFIXES, puissanceTexte, prefixeDe, convertirPrefixe, grouper } from '../puissances.js';
import { paramParMarche, parMarcheDe } from '../progression.js';

const SKILL = 'num.puissances.prefixes';

/** Ceux que le programme demande vraiment de savoir par cœur. */
const USUELS = PREFIXES.filter(p => p.usuel);

/** Combien de questions on passe sur une marche avant de monter. */
const PAR_MARCHE = 3;

/**
 * DES UNITÉS QU'ON RENCONTRE POUR DE VRAI, et pas « le mètre » à toutes les
 * lignes. Un octet se compte en Go parce qu'on achète des disques ; un watt en
 * MW parce qu'on lit la puissance d'une centrale ; un mètre en µm parce qu'un
 * cheveu en fait cinquante. L'unité choisie doit rendre la question crédible,
 * sinon l'exercice devient un jeu d'étiquettes.
 */
const UNITES = [
    { court: 'm', nom: 'mètre', pluriel: 'mètres', grands: [3], petits: [-2, -3, -6, -9] },
    { court: 'g', nom: 'gramme', pluriel: 'grammes', grands: [3, 6], petits: [-3, -6] },
    { court: 'o', nom: 'octet', pluriel: 'octets', grands: [3, 6, 9, 12], petits: [] },
    { court: 'W', nom: 'watt', pluriel: 'watts', grands: [3, 6, 9], petits: [-3, -6] },
    { court: 's', nom: 'seconde', pluriel: 'secondes', grands: [], petits: [-3, -6, -9, -12] },
    { court: 'L', nom: 'litre', pluriel: 'litres', grands: [], petits: [-2, -3] }
];

/** « µm », « Go », « MW » — le symbole du préfixe collé à celui de l'unité. */
export const symboleMesure = (p, u) => `${p.symbole}${u.court}`;

/** Une unité et un préfixe qui vont ensemble : « µm » existe, « µo » non. */
function tirerMesure(rng, sens = null) {
    for (let i = 0; i < 60; i++) {
        const u = rng.pick(UNITES);
        const pool = sens === 'grand' ? u.grands : sens === 'petit' ? u.petits
            : u.grands.concat(u.petits);
        if (!pool.length) continue;
        const p = prefixeDe(rng.pick(pool));
        if (p) return { u, p };
    }
    return { u: UNITES[0], p: prefixeDe(-3) };
}

/** « 5 × 10⁻⁶ » — et « 5 » tout court quand l'exposant est nul. */
export function ecritureMesure(valeur, exposant) {
    return exposant === 0 ? String(valeur) : `${valeur} × ${puissanceTexte(exposant)}`;
}

// --- LES SIX MARCHES ----------------------------------------------------------

export const ETAPES = [
    { id: 'symbole', rang: 1, label: '1 · Lire un symbole', resume: 'M, µ, n : lequel se dit comment ?' },
    { id: 'versPuissance', rang: 2, label: '2 · Du préfixe à la puissance', resume: 'méga, c\'est 10 puissance combien ?' },
    { id: 'versPrefixe', rang: 3, label: '3 · De la puissance au préfixe', resume: '10⁻⁶ porte quel nom ?' },
    { id: 'casse', rang: 4, label: '4 · Le piège de la majuscule', resume: 'm et M ne valent pas la même chose' },
    { id: 'mesure', rang: 5, label: '5 · Convertir une mesure', resume: '50 µm = … m' },
    { id: 'entre', rang: 6, label: '6 · D\'un préfixe à l\'autre', resume: '3 Go, combien de Mo ?' }
];

export const ORDRE = ETAPES.map(e => e.id);
const PAR_ID = Object.fromEntries(ETAPES.map(e => [e.id, e]));

const MARCHES = {
    symbole(rng) {
        const p = rng.pick(USUELS);
        const autres = USUELS.filter(x => x.n !== p.n);
        return {
            prompt: `Sur une étiquette, le symbole « ${p.symbole} » se lit comment ?`,
            html: `<div class="game-question"><span class="lit-consigne">Ce symbole se lit comment ?</span>`
                + `<span class="pf-sym">${p.symbole}</span></div>`,
            papier: `« ${p.symbole} » se lit`,
            answer: p.prefixe,
            choices: [
                { value: p.prefixe, correct: true },
                ...rng.shuffle(autres).slice(0, 3).map(x => ({
                    value: x.prefixe,
                    why: `« ${x.symbole} », c'est ${x.prefixe} — pas « ${p.symbole} ».`
                }))
            ],
            hints: [`Les grands préfixes prennent une MAJUSCULE (M, G, T), les petits une `
                + 'minuscule (m, µ, n). Celui-ci est-il grand ou petit ?'],
            explanation: `« ${p.symbole} » se lit ${p.prefixe} : ${p.exemple}.`,
            difficulty: 1
        };
    },

    versPuissance(rng) {
        const p = rng.pick(USUELS);
        const juste = puissanceTexte(p.n);
        return {
            prompt: `« ${p.prefixe} » vaut quelle puissance de 10 ?`,
            html: `<div class="game-question"><b>${p.prefixe}</b> vaut quelle puissance de 10 ?</div>`,
            // SUR LE PAPIER, LA QUESTION DOIT SE SUFFIRE. « 1 giga… = » se lisait
            // « 1 giga ____ = » une fois la ligne de réponse posée, et l'on ne
            // savait plus lequel des deux blancs remplir.
            papier: `« ${p.prefixe} » = `,
            answer: juste,
            choices: [
                { value: juste, correct: true },
                // LE SIGNE DE L'EXPOSANT : la faute qui coûte le plus cher.
                { value: puissanceTexte(-p.n),
                    why: p.n > 0
                        ? `« ${p.prefixe} » AGRANDIT : son exposant est positif.`
                        : `« ${p.prefixe} » rapetisse : son exposant est NÉGATIF.` },
                // LE PAS DE TROIS, MANQUÉ D'UN CRAN.
                { value: puissanceTexte(p.n + (p.n > 0 ? 3 : -3)),
                    why: `Un cran trop loin : ${p.prefixe} vaut ${juste}.` },
                { value: puissanceTexte(p.n > 0 ? p.n - 3 : p.n + 3),
                    why: `Un cran trop court : ${p.prefixe} vaut ${juste}.` }
            ],
            hints: [p.n === -2
                // CENTI EST L'EXCEPTION, et le dire vaut mieux que laisser
                // l'élève croire que la règle du pas de trois est fausse.
                ? 'Attention, « centi » est la seule exception au pas de trois : c\'est le '
                    + 'CENTIÈME, comme dans centimètre — 10⁻².'
                : 'Les préfixes vont de TROIS EN TROIS : kilo 10³, méga 10⁶, giga 10⁹, '
                    + 'téra 10¹² ; et de l\'autre côté milli 10⁻³, micro 10⁻⁶, nano 10⁻⁹.'],
            explanation: `${p.prefixe} = ${juste}, c'est-à-dire ${p.nom}. Exemple : ${p.exemple}.`,
            difficulty: 1
        };
    },

    versPrefixe(rng) {
        const p = rng.pick(USUELS);
        const autres = USUELS.filter(x => x.n !== p.n);
        return {
            prompt: `${puissanceTexte(p.n)} porte quel préfixe ?`,
            html: `<div class="game-question"><b>${puissanceTexte(p.n)}</b> porte quel préfixe ?</div>`,
            // « 10⁶ = » appellerait le nombre, pas le préfixe : on demande donc
            // ce qu'on veut vraiment lire.
            papier: `${puissanceTexte(p.n)} se dit `,
            answer: p.prefixe,
            choices: [
                { value: p.prefixe, correct: true },
                ...rng.shuffle(autres).slice(0, 3).map(x => ({
                    value: x.prefixe,
                    why: `${x.prefixe} vaut ${puissanceTexte(x.n)}, pas ${puissanceTexte(p.n)}.`
                }))
            ],
            hints: [`${p.n > 0 ? 'L\'exposant est positif : c\'est un GRAND préfixe.'
                : 'L\'exposant est négatif : c\'est un PETIT préfixe.'}`],
            explanation: `${puissanceTexte(p.n)} = ${p.prefixe}, c'est-à-dire ${p.nom}.`,
            difficulty: 2
        };
    },

    /**
     * LE PIÈGE DE LA CASSE, et il vaut un milliard.
     *
     * « m » minuscule est milli (10⁻³), « M » majuscule est méga (10⁶). Entre
     * les deux, un facteur 10⁹. Aucune autre paire de symboles ne coûte aussi
     * cher, et l'on ne s'en aperçoit qu'en tombant dessus.
     */
    casse(rng) {
        const milli = prefixeDe(-3), mega = prefixeDe(6);
        const majuscule = rng.bool();
        const bon = majuscule ? mega : milli;
        const piege = majuscule ? milli : mega;
        const u = rng.pick(UNITES.filter(x => x.grands.includes(6) && x.petits.includes(-3)));
        const sym = symboleMesure(bon, u);
        const valeur = rng.int(2, 9);
        const juste = ecritureMesure(valeur, bon.n);
        return {
            prompt: `${valeur} ${sym} vaut combien de ${u.pluriel} ?`,
            html: `<div class="game-question">${valeur} <b>${sym}</b> = … ${u.pluriel}</div>`,
            papier: `${valeur} ${sym} = … ${u.pluriel}`,
            answer: juste,
            choices: [
                { value: juste, correct: true },
                { value: ecritureMesure(valeur, piege.n),
                    why: `Attention à la CASSE : « ${bon.symbole} » est ${bon.prefixe} `
                        + `(${puissanceTexte(bon.n)}), « ${piege.symbole} » est ${piege.prefixe} `
                        + `(${puissanceTexte(piege.n)}). Il y a un milliard entre les deux.` },
                { value: ecritureMesure(valeur, -bon.n),
                    why: `${bon.prefixe} vaut ${puissanceTexte(bon.n)} : attention au signe de l'exposant.` },
                { value: ecritureMesure(valeur, bon.n + (bon.n > 0 ? 3 : -3)),
                    why: `Un cran trop loin : ${bon.prefixe} vaut ${puissanceTexte(bon.n)}.` }
            ],
            hints: ['Regarde bien la MAJUSCULE. « M » et « m » ne sont pas le même préfixe, '
                + 'et il y a un milliard d\'écart entre les deux.'],
            explanation: `« ${bon.symbole} » est ${bon.prefixe} = ${puissanceTexte(bon.n)}, donc `
                + `${valeur} ${sym} = ${juste} ${u.pluriel}. Ne pas confondre avec `
                + `« ${piege.symbole} » (${piege.prefixe}, ${puissanceTexte(piege.n)}).`,
            difficulty: 3
        };
    },

    /**
     * CONVERTIR UNE MESURE — c'est le but de tout le chapitre.
     *
     * Rémy dans son devoir : « le diamètre d'un cheveu est environ 50 µm.
     * Exprime ce diamètre en m. » On rend donc la réponse sous la forme
     * « 50 × 10⁻⁶ », qui est celle qu'on écrit avant de simplifier, et non un
     * décimal — 0,00005 se recopie de travers une fois sur deux.
     */
    mesure(rng) {
        const { u, p } = tirerMesure(rng);
        const valeur = rng.int(2, 99);
        const { exposant } = convertirPrefixe(valeur, p.n, 0);
        const juste = ecritureMesure(valeur, exposant);
        return {
            prompt: `${valeur} ${symboleMesure(p, u)}, combien de ${u.pluriel} ?`,
            html: `<div class="game-question">${valeur} <b>${symboleMesure(p, u)}</b> = … ${u.pluriel}</div>`,
            papier: `${valeur} ${symboleMesure(p, u)} = … ${u.pluriel}`,
            answer: juste,
            choices: [
                { value: juste, correct: true },
                { value: ecritureMesure(valeur, -exposant),
                    why: `${p.prefixe} vaut ${puissanceTexte(p.n)} : l'exposant est `
                        + `${p.n > 0 ? 'positif' : 'négatif'}.` },
                { value: ecritureMesure(valeur, exposant + (exposant > 0 ? 3 : -3)),
                    why: `Un cran trop loin : ${p.prefixe} vaut ${puissanceTexte(p.n)}.` },
                { value: ecritureMesure(valeur * 10, exposant),
                    why: 'Le nombre de devant ne change pas : c\'est l\'unité qui change.' }
            ],
            hints: [`${p.prefixe} vaut ${puissanceTexte(p.n)} : on garde le nombre et on écrit `
                + 'la puissance à côté.'],
            explanation: `${symboleMesure(p, u)} veut dire « ${p.prefixe}${u.nom} », et `
                + `${p.prefixe} = ${puissanceTexte(p.n)}. Donc ${valeur} ${symboleMesure(p, u)} = `
                + `${juste} ${u.pluriel}.`,
            difficulty: 3
        };
    },

    /**
     * D'UN PRÉFIXE À L'AUTRE — la conversion qu'on fait vraiment.
     *
     * « 3 Go, combien de Mo ? » On ne repasse pas par l'unité de base : on
     * soustrait les exposants, ce qui est exactement la règle du quotient de
     * puissances, appliquée sans en avoir l'air.
     */
    entre(rng) {
        const u = rng.pick(UNITES.filter(x => x.grands.length >= 2 || x.petits.length >= 2));
        const sens = u.grands.length >= 2 && (rng.bool() || u.petits.length < 2) ? 'grands' : 'petits';
        const pool = u[sens];
        const i = rng.int(0, pool.length - 2);
        // Le grand d'abord, le petit ensuite : « 3 Go en Mo », pas l'inverse —
        // c'est le sens dans lequel on lit une capacité de disque.
        const paire = sens === 'grands' ? [pool[i + 1], pool[i]] : [pool[i], pool[i + 1]];
        const de = prefixeDe(paire[0]), vers = prefixeDe(paire[1]);
        const valeur = rng.int(2, 9);
        const { exposant } = convertirPrefixe(valeur, de.n, vers.n);
        const juste = grouper(String(valeur * 10 ** exposant));
        // TOUTES LES PROPOSITIONS SONT DES ENTIERS. Le premier jet offrait
        // « 0,006 » comme piège — c'est-à-dire la division au lieu de la
        // multiplication —, et il se repérait sans réfléchir : c'était le seul
        // à ne pas ressembler aux autres. Un distracteur qui se voit ne piège
        // personne.
        return {
            prompt: `${valeur} ${symboleMesure(de, u)}, combien de ${symboleMesure(vers, u)} ?`,
            html: `<div class="game-question">${valeur} <b>${symboleMesure(de, u)}</b> = … ${symboleMesure(vers, u)}</div>`,
            papier: `${valeur} ${symboleMesure(de, u)} = … ${symboleMesure(vers, u)}`,
            answer: juste,
            choices: [
                { value: juste, correct: true },
                { value: String(valeur),
                    why: `Le nombre change : il faut PLUS de ${symboleMesure(vers, u)} que de `
                        + `${symboleMesure(de, u)}, puisque l'unité est plus petite.` },
                { value: grouper(String(valeur * 10 ** (exposant + 3))),
                    why: `${de.prefixe} et ${vers.prefixe} ne sont séparés que de ${puissanceTexte(exposant)}.` },
                // « Un cran trop peu » n'existe pas quand l'écart n'est que d'un
                // rang — centi et milli sont voisins — : on prend alors un cran
                // de trop de l'autre côté, sans quoi le distracteur vaudrait la
                // bonne réponse et la question n'aurait plus que trois choix.
                { value: grouper(String(valeur * 10 ** (exposant <= 1 ? exposant + 2 : exposant - 1))),
                    why: `Il faut ${puissanceTexte(exposant)} : compte bien les rangs entre `
                        + `${de.prefixe} et ${vers.prefixe}.` }
            ],
            hints: [`${de.prefixe} vaut ${puissanceTexte(de.n)} et ${vers.prefixe} vaut `
                + `${puissanceTexte(vers.n)} : entre les deux, il y a ${puissanceTexte(exposant)}.`],
            explanation: `${puissanceTexte(de.n)} ÷ ${puissanceTexte(vers.n)} = ${puissanceTexte(exposant)}, `
                + `donc 1 ${symboleMesure(de, u)} vaut ${grouper(String(10 ** exposant))} ${symboleMesure(vers, u)}. `
                + `${valeur} ${symboleMesure(de, u)} = ${juste} ${symboleMesure(vers, u)}.`,
            difficulty: 3
        };
    }
};

/** La marche d'une question : celle qu'on a choisie, ou celle du rang. */
export function marchePour(etape, index, params) {
    if (etape && etape !== 'progressif' && PAR_ID[etape]) return etape;
    const rang = Math.floor((index || 0) / parMarcheDe(params, PAR_MARCHE));
    // ARRIVÉ EN HAUT, ON REDESCEND ET L'ON RECOMMENCE — même règle que pour les
    // puissances de 10 : sur une fiche de vingt questions, s'arrêter sur la
    // dernière marche en poserait quinze du même type.
    return ORDRE[rang % ORDRE.length];
}

export const prefixesGenerator = {
    id: 'num.puissances-prefixes',
    label: 'Les préfixes : kilo, méga, giga, milli, micro, nano',
    skills: [SKILL],
    answerKinds: ['choice'],
    ecrit: true,
    conseil: (p) => ORDRE.length * parMarcheDe(p, PAR_MARCHE),
    params: [
        {
            id: 'etape', type: 'select', label: 'Marche à travailler', default: 'progressif',
            echelle: true,
            aide: '« Tout en ordre » monte d\'une marche toutes les trois questions : on lit '
                + 'un symbole, puis on passe du préfixe à la puissance, et l\'on finit par '
                + 'convertir une mesure — qui est le but de tout le chapitre.',
            options: [{ value: 'progressif', label: 'Tout en ordre, du plus simple au plus dur', court: 'Tout' }]
                .concat(ETAPES.map(e => ({ value: e.id, label: e.label, court: String(e.rang) })))
        },
        paramParMarche({ defaut: PAR_MARCHE, marches: ORDRE.length })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const marche = marchePour((params || {}).etape, ctx.index, params);
        const q = MARCHES[marche](rng);
        return makeItem({
            seed: rng.seed,
            generatorId: 'num.puissances-prefixes',
            skillId: SKILL,
            answerKind: 'choice',
            prompt: { text: q.prompt, html: q.html, papier: q.papier || q.prompt },
            answer: q.answer,
            // UN DISTRACTEUR NE DOIT JAMAIS VALOIR LA BONNE RÉPONSE. Les pas de
            // trois se rejoignent parfois — « un cran trop court » depuis 10³
            // tombe sur 10⁰, mais depuis 10⁻³ il tombe sur 10⁰ aussi.
            choices: finalizeChoices(rng,
                q.choices.filter(c => c.correct || String(c.value) !== String(q.answer)),
                { count: 4 }),
            hints: q.hints,
            explanation: q.explanation,
            difficulty: q.difficulty,
            meta: { etape: marche, rang: PAR_ID[marche].rang, marches: ORDRE.length }
        });
    }
};

export default prefixesGenerator;
