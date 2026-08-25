// LES PUISSANCES DE 10 — sept marches, dans l'ordre.
//
// Rémy : « Des exercices sur les puissances de 10 dont l'écriture scientifique,
// hyper progressif : déjà reconnaître, puis transformer. »
//
// LA PROGRESSION EST DANS LE GÉNÉRATEUR, PAS DANS LE RÉGLAGE. Le réglage
// « progressif » lit `ctx.index` — le rang de la question dans la série — et
// monte d'une marche tous les trois succès. L'élève commence donc toujours par
// lire 10³ et finit par comparer deux écritures, sans que personne ait eu à
// composer un parcours à la main. Chaque marche reste disponible seule, pour le
// jour où l'on veut ne travailler que celle-là.
//
// POURQUOI « RECONNAÎTRE » AVANT « TRANSFORMER », et pourquoi deux marches
// entières pour cela : la faute ordinaire de quatrième n'est pas de mal
// calculer, c'est d'écrire 34 × 10³ et de croire que c'est une écriture
// scientifique. L'élève transforme avant de savoir ce qu'il doit obtenir, donc
// il transforme vers n'importe quoi. La marche 4 — « dis POURQUOI ce n'en est
// pas une » — est celle qui coûte le plus cher à écrire et qui rapporte le
// plus : « trop grand » et « trop petit » ne se corrigent pas dans le même
// sens.

import { makeItem, finalizeChoices } from '../items.js';
import {
    ETAPES_PUISSANCES, ORDRE_ETAPES, puissanceTexte, valeurPuissance, decimaleDe,
    mantisseTexte, scientifiqueTexte, jugerMantisse, RAISONS, versScientifique,
    comparerScientifiques, nomPuissance, grouper
} from '../puissances.js';

/** Tout ce qui s'AFFICHE passe par là : 7850000 se lit 7 850 000. */
const aff = grouper;

/**
 * Deux écritures désignent-elles le même nombre ?
 *
 * Sert à écarter les faux distracteurs. On compare les nombres, pas les
 * chaînes : « 0,00010 » et « 0,0001 » ne se ressemblent pas et valent pourtant
 * la même chose. Les valeurs manipulées ici tiennent largement dans un double,
 * et l'on ne cherche qu'une égalité franche — pas un dernier chiffre.
 */
function memeNombre(a, b) {
    const n = (v) => Number(String(v).replace(/\s|\u00a0/g, '').replace(',', '.'));
    const x = n(a), y = n(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= Math.abs(y) * 1e-12;
}

/** Combien de questions on passe sur une marche avant de monter. */
const PAR_MARCHE = 3;

/** Des chiffres significatifs plausibles : « 34 », « 5 », « 207 ». */
function tirerChiffres(rng, long = rng.int(1, 3)) {
    let s = String(rng.int(1, 9));
    for (let i = 1; i < long; i++) s += String(rng.int(0, 9));
    return s.replace(/0+$/, '') || s[0];
}

// --- Les sept marches ----------------------------------------------------------

function etapeLire(rng) {
    const n = rng.pick([2, 3, 4, 5, 6, -1, -2, -3, -4]);
    const valeur = valeurPuissance(n);
    const nom = nomPuissance(n);
    return {
        prompt: `Combien vaut ${puissanceTexte(n)} ?`,
        html: `<div class="game-question">Combien vaut <b>${puissanceTexte(n)}</b> ?</div>`,
        answer: valeur,
        choices: [
            { value: valeur, correct: true },
            // LA FAUTE DE COMPTAGE : on écrit autant de zéros que l'exposant,
            // mais du mauvais côté de la virgule, ou un de trop.
            { value: valeurPuissance(n > 0 ? n + 1 : n - 1),
                why: `Un zéro de trop. ${puissanceTexte(n)}, c'est ${n > 0 ? `un 1 suivi de ${n} zéros` : `${-n} rangs après la virgule`}.` },
            { value: valeurPuissance(-n),
                why: n > 0 ? 'Là tu as divisé au lieu de multiplier : l\'exposant est POSITIF.'
                    : 'Attention au signe : un exposant NÉGATIF donne un nombre plus petit que 1.' },
            // POUR UN EXPOSANT NÉGATIF, LA FAUTE INTÉRESSANTE N'EST PAS LA MÊME.
            // « 10 × n » n'effleure personne ici ; ce que les élèves écrivent,
            // c'est un nombre NÉGATIF — ils confondent le signe de l'exposant
            // avec le signe du nombre. C'est la confusion à provoquer.
            (n > 0
                ? { value: String(10 * n),
                    why: `${puissanceTexte(n)} n'est pas 10 × ${n} : c'est 10 multiplié par lui-même ${n} fois.` }
                : { value: `-${valeurPuissance(-n)}`,
                    why: 'Un exposant négatif ne rend pas le nombre négatif : il le rend PETIT. '
                        + `${puissanceTexte(n)} est un nombre positif, plus petit que 1.` })
        ],
        explanation: `${puissanceTexte(n)} = ${aff(valeur)}${nom ? ` — c'est ${nom}.` : '.'} `
            + (n > 0 ? `L'exposant compte les ZÉROS après le 1 : ${n} zéros.`
                : `Un exposant négatif descend sous la virgule : le 1 est au ${-n}ᵉ rang après la virgule.`),
        hints: [n > 0 ? 'Un exposant positif : le nombre est plus grand que 1.'
            : 'Un exposant négatif : le nombre est plus PETIT que 1.',
        `L'exposant ${n} te dit de combien de rangs le 1 se déplace.`],
        difficulty: n > 0 ? 1 : 2
    };
}

function etapeEcrire(rng) {
    const n = rng.pick([3, 4, 5, 6, 2, -2, -3, -4]);
    const valeur = valeurPuissance(n);
    return {
        prompt: `${aff(valeur)} = 10 puissance combien ?`,
        html: `<div class="game-question"><span class="nb-highlight">${aff(valeur)}</span> = 10<sup>?</sup></div>`,
        answer: String(n),
        choices: [
            { value: String(n), label: puissanceTexte(n), correct: true },
            { value: String(-n), label: puissanceTexte(-n),
                why: n > 0 ? `${valeur} est plus GRAND que 1 : l'exposant est positif.`
                    : `${valeur} est plus PETIT que 1 : l'exposant est négatif.` },
            { value: String(n > 0 ? n + 1 : n - 1), label: puissanceTexte(n > 0 ? n + 1 : n - 1),
                why: 'Recompte les zéros — il y en a un de moins que tu ne crois.' },
            { value: String(n > 0 ? n - 1 : n + 1), label: puissanceTexte(n > 0 ? n - 1 : n + 1),
                why: 'Recompte les zéros — il y en a un de plus que tu ne crois.' }
        ],
        explanation: `${aff(valeur)} = ${puissanceTexte(n)}. `
            + (n > 0 ? `Il y a ${n} zéros après le 1, donc l'exposant vaut ${n}.`
                : `Le 1 est au ${-n}ᵉ rang après la virgule, donc l'exposant vaut ${n}.`),
        hints: ['Compte les zéros.',
            valeur.includes(',') ? 'Le nombre est plus petit que 1 : l\'exposant sera négatif.'
                : 'Le nombre est plus grand que 1 : l\'exposant sera positif.'],
        difficulty: n > 0 ? 1 : 2
    };
}

/** Une écriture « a × 10ⁿ » volontairement fausse, et de quelle façon. */
function ecritureBancale(rng, chiffres, exposant, quoi) {
    if (quoi === 'tropGrand') {
        // On décale la virgule d'un rang vers la droite : 34 × 10³ au lieu de 3,4 × 10⁴.
        const a = decimaleDe(chiffres, 2, 0);
        return { a, n: exposant - 1, texte: `${a} × ${puissanceTexte(exposant - 1)}` };
    }
    // Vers la gauche : 0,34 × 10⁵.
    const a = decimaleDe(chiffres, 0, 0);
    return { a, n: exposant + 1, texte: `${a} × ${puissanceTexte(exposant + 1)}` };
}

function etapeReconnaitre(rng) {
    const chiffres = tirerChiffres(rng, rng.int(2, 3));
    const n = rng.pick([2, 3, 4, 5, -2, -3, -4]);
    const bonne = scientifiqueTexte(chiffres, n);
    const grand = ecritureBancale(rng, chiffres, n, 'tropGrand');
    const petit = ecritureBancale(rng, chiffres, n, 'tropPetit');
    const autres = tirerChiffres(rng, 2);
    const quatre = [bonne, grand.texte, petit.texte,
        `${decimaleDe(autres, 2, 0)} × ${puissanceTexte(rng.pick([2, 3, -2, -3]))}`];
    return {
        prompt: 'Laquelle de ces écritures est une écriture scientifique ?',
        html: '<div class="game-question">Laquelle est une écriture <b>scientifique</b> ?</div>',
        // SUR LE PAPIER, LES QUATRE ÉCRITURES DOIVENT ÊTRE DANS L'ÉNONCÉ.
        // La fiche imprime la question, pas les propositions : « laquelle de
        // ces écritures ? » sans les écritures est une question à laquelle
        // personne ne peut répondre. On les recopie donc dans le texte, dans
        // un ordre tiré au sort mais reproductible.
        papier: `Laquelle de ces écritures est une écriture scientifique : `
            + `${rng.shuffle(quatre.slice()).join('   ;   ')} ?`,
        answer: bonne,
        choices: [
            { value: bonne, correct: true },
            { value: grand.texte, why: `${grand.a} est trop grand : le nombre devant doit être plus petit que 10.` },
            { value: petit.texte, why: `${petit.a} est trop petit : le nombre devant doit être au moins 1.` },
            { value: quatre[3],
                why: 'Le nombre devant doit être compris entre 1 (compris) et 10 (exclu).' }
        ],
        explanation: `Une écriture scientifique, c'est a × 10ⁿ avec 1 ⩽ a < 10 : `
            + `UN SEUL chiffre avant la virgule, et pas zéro. Ici c'est ${bonne}.`,
        hints: ['Regarde seulement le nombre écrit DEVANT le × 10.',
            'Il doit avoir exactement un chiffre avant la virgule, et ce chiffre n\'est pas 0.'],
        difficulty: 2
    };
}

function etapePourquoi(rng) {
    const chiffres = tirerChiffres(rng, rng.int(2, 3));
    const n = rng.pick([2, 3, 4, -2, -3]);
    const quoi = rng.pick(['tropGrand', 'tropPetit']);
    const mauvaise = ecritureBancale(rng, chiffres, n, quoi);
    const juge = jugerMantisse(mauvaise.a);
    return {
        prompt: `${mauvaise.texte} n'est pas une écriture scientifique. Pourquoi ?`,
        html: `<div class="game-question"><span class="nb-highlight">${mauvaise.texte}</span><br>`
            + 'n\'est pas une écriture scientifique. <b>Pourquoi ?</b></div>',
        answer: RAISONS[juge.quoi],
        choices: [
            { value: RAISONS[juge.quoi], correct: true },
            { value: RAISONS[quoi === 'tropGrand' ? 'tropPetit' : 'tropGrand'],
                why: `Relis : ${mauvaise.a} ${quoi === 'tropGrand' ? 'est plus grand que 10' : 'est plus petit que 1'}.` },
            { value: 'L\'exposant est négatif, et c\'est interdit.',
                why: 'Un exposant négatif est parfaitement permis : il sert à écrire les petits nombres.' },
            { value: 'L\'exposant est trop grand.',
                why: 'L\'exposant n\'a aucune limite. C\'est le nombre DEVANT qui est encadré.' }
        ],
        explanation: `${RAISONS[juge.quoi]} Il faut 1 ⩽ a < 10, et l'écriture correcte est `
            + `${scientifiqueTexte(chiffres, n)}.`,
        hints: ['Ne regarde pas l\'exposant : il a le droit d\'être ce qu\'il veut.',
            `Compare ${mauvaise.a} à 1 et à 10.`],
        difficulty: 3
    };
}

function etapeVersScientifique(rng) {
    const chiffres = tirerChiffres(rng, rng.int(2, 3));
    const n = rng.pick([3, 4, 5, 6, -2, -3, -4]);
    const decimal = decimaleDe(chiffres, 1, n);
    const bonne = scientifiqueTexte(chiffres, n);
    const grand = ecritureBancale(rng, chiffres, n, 'tropGrand');
    const petit = ecritureBancale(rng, chiffres, n, 'tropPetit');
    return {
        prompt: `Écris ${aff(decimal)} en écriture scientifique.`,
        html: `<div class="game-question">Écris <span class="nb-highlight">${aff(decimal)}</span> `
            + 'en écriture <b>scientifique</b>.</div>',
        answer: bonne,
        choices: [
            { value: bonne, correct: true },
            { value: `${mantisseTexte(chiffres)} × ${puissanceTexte(-n)}`,
                why: `Signe de l'exposant : ${aff(decimal)} est ${n > 0 ? 'plus GRAND' : 'plus PETIT'} que 1.` },
            { value: grand.texte, why: 'Le nombre devant doit être plus petit que 10.' },
            { value: petit.texte, why: 'Le nombre devant doit être au moins 1.' }
        ],
        explanation: `${aff(decimal)} = ${bonne}. On place la virgule après le PREMIER chiffre `
            + `significatif (${chiffres[0]}), puis on compte de combien de rangs elle a bougé : `
            + `${Math.abs(n)}. Comme ${decimal} est ${n > 0 ? 'plus grand' : 'plus petit'} que 1, `
            + `l'exposant est ${n > 0 ? 'positif' : 'négatif'}.`,
        hints: ['Place d\'abord la virgule juste après le premier chiffre qui n\'est pas 0.',
            `Ensuite compte les rangs franchis, et regarde si ${aff(decimal)} est plus grand ou plus petit que 1.`],
        difficulty: 3
    };
}

function etapeVersDecimale(rng) {
    const chiffres = tirerChiffres(rng, rng.int(2, 3));
    const n = rng.pick([3, 4, 5, -2, -3, -4]);
    const bonne = decimaleDe(chiffres, 1, n);
    return {
        prompt: `Écris ${scientifiqueTexte(chiffres, n)} sans puissance de 10.`,
        html: `<div class="game-question">Écris <span class="nb-highlight">${scientifiqueTexte(chiffres, n)}</span> `
            + 'sans puissance de 10.</div>',
        answer: bonne,
        choices: [
            { value: bonne, correct: true },
            { value: decimaleDe(chiffres, 1, -n),
                why: `L'exposant est ${n}, donc la virgule part vers la ${n > 0 ? 'DROITE' : 'GAUCHE'} — le nombre devient plus ${n > 0 ? 'grand' : 'petit'}.` },
            { value: decimaleDe(chiffres, 1, n > 0 ? n - 1 : n + 1),
                why: 'Un rang de trop peu : recompte les déplacements de la virgule.' },
            { value: decimaleDe(chiffres, 1, n > 0 ? n + 1 : n - 1),
                why: 'Un rang de trop : recompte les déplacements de la virgule.' }
        ],
        explanation: `${scientifiqueTexte(chiffres, n)} = ${aff(bonne)}. L'exposant ${n} déplace la `
            + `virgule de ${Math.abs(n)} rangs vers la ${n > 0 ? 'droite' : 'gauche'}, `
            + `en complétant par des zéros.`,
        hints: [`L'exposant vaut ${n} : la virgule se déplace de ${Math.abs(n)} rangs.`,
            n > 0 ? 'Exposant positif : vers la droite, le nombre grandit.'
                : 'Exposant négatif : vers la gauche, le nombre rapetisse.'],
        difficulty: 3
    };
}

function etapeComparer(rng) {
    // UN CAS SUR DEUX A LE MÊME EXPOSANT, et c'est fait exprès : sans cela,
    // l'élève apprend « le plus grand exposant gagne » et ne regarde plus
    // jamais la mantisse. Le piège doit tomber assez souvent pour se voir.
    const memeExposant = rng.bool(0.5);
    const n1 = rng.pick([3, 4, 5, -2, -3, -4]);
    const n2 = memeExposant ? n1 : rng.pick([3, 4, 5, -2, -3, -4].filter(x => x !== n1));
    const a = { chiffres: tirerChiffres(rng, 2), exposant: n1 };
    let b = { chiffres: tirerChiffres(rng, 2), exposant: n2 };
    let garde = 0;
    while (comparerScientifiques(a, b) === 0 && garde++ < 20) b.chiffres = tirerChiffres(rng, 2);
    const ordre = comparerScientifiques(a, b);
    const grand = ordre > 0 ? a : b;
    const petit = ordre > 0 ? b : a;
    const tg = scientifiqueTexte(grand.chiffres, grand.exposant);
    const tp = scientifiqueTexte(petit.chiffres, petit.exposant);
    return {
        prompt: `Lequel est le plus grand : ${scientifiqueTexte(a.chiffres, a.exposant)} ou `
            + `${scientifiqueTexte(b.chiffres, b.exposant)} ?`,
        html: '<div class="game-question">Lequel est le <b>plus grand</b> ?<br>'
            + `<span class="nb-highlight">${scientifiqueTexte(a.chiffres, a.exposant)}</span>`
            + ` &nbsp;ou&nbsp; <span class="nb-highlight">${scientifiqueTexte(b.chiffres, b.exposant)}</span></div>`,
        answer: tg,
        choices: [
            { value: tg, correct: true },
            { value: tp, why: memeExposant
                ? 'Les exposants sont ÉGAUX : c\'est le nombre devant qui départage.'
                : 'Compare d\'abord les exposants — le plus grand exposant l\'emporte.' }
        ],
        nbChoix: 2,
        explanation: memeExposant
            ? `Les deux exposants valent ${n1} : on compare alors les nombres devant, `
                + `et ${mantisseTexte(grand.chiffres)} > ${mantisseTexte(petit.chiffres)}. Donc ${tg}.`
            : `L'exposant ${grand.exposant} est plus grand que ${petit.exposant}, `
                + `donc ${tg} l'emporte — quel que soit le nombre devant, puisque celui-ci `
                + 'reste toujours entre 1 et 10.',
        hints: ['Regarde les EXPOSANTS avant tout le reste.',
            memeExposant ? 'Ils sont égaux : c\'est donc le nombre devant qui décide.'
                : 'Ils sont différents : le plus grand exposant gagne, point.'],
        difficulty: 4
    };
}

const MARCHES = {
    lire: etapeLire,
    ecrire: etapeEcrire,
    reconnaitre: etapeReconnaitre,
    pourquoi: etapePourquoi,
    versScientifique: etapeVersScientifique,
    versDecimale: etapeVersDecimale,
    comparer: etapeComparer
};

/**
 * La marche à travailler pour la question numéro `index`.
 *
 * `etape` vaut soit l'identifiant d'une marche — on y reste —, soit
 * « progressif » : on monte alors d'une marche tous les `PAR_MARCHE` items, et
 * l'on s'arrête sur la dernière. `bornes` restreint la montée à un intervalle,
 * ce qui donne les deux exercices que Rémy demandait : « déjà reconnaître »,
 * puis « transformer ».
 */
export function marchePour(etape, index, bornes) {
    const liste = bornes
        ? ORDRE_ETAPES.slice(ORDRE_ETAPES.indexOf(bornes[0]), ORDRE_ETAPES.indexOf(bornes[1]) + 1)
        : ORDRE_ETAPES;
    if (etape && etape !== 'progressif' && MARCHES[etape]) return etape;
    const rang = Math.floor((index || 0) / PAR_MARCHE);
    // ARRIVÉ EN HAUT, ON REDESCEND ET L'ON RECOMMENCE. La première version
    // s'arrêtait sur la dernière marche, et cela se voyait à l'impression :
    // sur une fiche de vingt questions, l'exercice « transformer » en posait
    // trois du premier type, trois du deuxième et QUATORZE du troisième. Le
    // cycle donne une feuille équilibrée, et une longue séance qui repasse
    // par tout au lieu de s'enliser sur la fin.
    return liste[rang % liste.length];
}

/** Le générateur, partagé par les deux exercices du catalogue. */
function fabriquer(id, competence, bornes) {
    return {
        id,
        label: bornes ? `Puissances de 10 — ${ETAPES_PUISSANCES[bornes[0]].label.slice(4)} …` : 'Puissances de 10',
        skills: [competence],
        answerKinds: ['choice'],
        ecrit: true,
        params: [
            {
                id: 'etape', type: 'select', label: 'Marche à travailler', default: 'progressif',
                aide: '« Tout en ordre » monte d\'une marche toutes les trois questions : on '
                    + 'commence par lire 10³ et l\'on finit par comparer deux écritures. Choisir '
                    + 'une marche précise y reste, pour une séance qui ne travaille que celle-là.',
                options: [{ value: 'progressif', label: 'Tout en ordre, du plus simple au plus dur' }]
                    .concat((bornes
                        ? ORDRE_ETAPES.slice(ORDRE_ETAPES.indexOf(bornes[0]), ORDRE_ETAPES.indexOf(bornes[1]) + 1)
                        : ORDRE_ETAPES).map(e => ({ value: e, label: ETAPES_PUISSANCES[e].label })))
            }
        ],

        generate(params, ctx) {
            const rng = ctx.rng;
            const p = params || {};
            const marche = marchePour(p.etape, ctx.index, bornes);
            const q = MARCHES[marche](rng);
            // LES CHOIX PUREMENT NUMÉRIQUES S'AFFICHENT GROUPÉS, mais leur
            // `value` reste brute : c'est elle qui sert à comparer la réponse
            // et à dédoublonner les distracteurs. Un choix qui porte déjà une
            // étiquette — « 10⁴ » — n'est pas touché.
            const choix = q.choices
                // GARDE-FOU : UN DISTRACTEUR NE DOIT JAMAIS VALOIR LA BONNE
                // RÉPONSE. Pour 10⁻⁴, l'un d'eux sortait « 0,00010 » — qui est
                // le MÊME nombre que 0,0001, écrit autrement. L'élève qui le
                // choisissait avait raison et se voyait compté faux. Les
                // chaînes diffèrent, donc rien ne l'avait signalé : on compare
                // donc les valeurs, pas les écritures.
                .filter(c => c.correct || !memeNombre(c.value, q.answer))
                .map(c => (c.label === undefined && /^\d+(,\d+)?$/.test(String(c.value))
                    ? { ...c, label: aff(c.value) } : c));
            return makeItem({
                seed: rng.seed,
                generatorId: id,
                skillId: competence,
                answerKind: 'choice',
                prompt: { text: q.prompt, html: q.html, papier: q.papier || q.prompt },
                answer: q.answer,
                choices: finalizeChoices(rng, choix, { count: q.nbChoix || 4 }),
                hints: q.hints,
                explanation: q.explanation,
                difficulty: q.difficulty,
                meta: { etape: marche, rang: ETAPES_PUISSANCES[marche].rang }
            });
        }
    };
}

// LES DEUX EXERCICES SONT LES DEUX MOTS DE RÉMY : « déjà reconnaître, puis
// transformer ». Ils partagent tout, sauf l'intervalle de marches — et donc la
// compétence qu'ils font travailler.
export const puissancesReconnaitreGenerator =
    fabriquer('num.puissances-reconnaitre', 'num.puissances.dix', ['lire', 'pourquoi']);

export const puissancesTransformerGenerator =
    fabriquer('num.puissances-transformer', 'num.puissances.scientifique',
        ['versScientifique', 'comparer']);

/** Et celui qui prend tout, pour une révision ou une fiche de fin de chapitre. */
export const puissancesGenerator =
    fabriquer('num.puissances', 'num.puissances.scientifique', null);
