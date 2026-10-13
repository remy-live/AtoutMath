// LA FRACTION DÉCIMALE ET L'ÉCRITURE À VIRGULE — le même nombre, deux écritures.
//
// RÉMY, après une séance : « on a fait des exercices où il faut convertir 3,5
// en 35/10 etc et inversement ».
//
// LE VA-ET-VIENT EST L'EXERCICE, et non l'un des deux sens. Un élève qui
// n'apprend que « virgule → fraction » apprend une recette ; celui qui fait
// les deux comprend qu'il s'agit du MÊME nombre écrit deux fois. C'est le
// pivot du chapitre : sans lui, le décimal et la fraction restent deux objets
// étrangers, et toute la suite — comparer, additionner, placer sur une
// droite — se fait deux fois.
//
// LE ZÉRO QUI TIENT LE RANG EST LE VRAI PIÈGE. 7/100 n'est pas 0,7 mais 0,07,
// et 3,05 n'est pas 35/100 mais 305/100. Ce n'est pas une étourderie : c'est
// la question de savoir ce que COMPTE le dénominateur. On le pose donc
// exprès, et l'erreur a un nom — voir `diagnostics` plus bas.

import { makeItem } from '../items.js';
import { fractionHtml } from '../fractionsEquivalentes.js';

const SKILL = 'num.decimal.fraction';

/** Les trois rangs du chapitre, et ce qu'ils valent. */
const RANGS = {
    dixiemes: { decimales: 1, denominateur: 10, nom: 'dixièmes' },
    centiemes: { decimales: 2, denominateur: 100, nom: 'centièmes' },
    milliemes: { decimales: 3, denominateur: 1000, nom: 'millièmes' }
};

/**
 * Écrit un décimal à la française, SANS zéro inutile à droite.
 *
 * `toFixed` en poserait : 3,50 pour 3,5. Or « supprimer les zéros inutiles »
 * est une compétence voisine qu'on vient d'enseigner (`num.decimal.zeros`) —
 * l'exercice ne va pas écrire au tableau ce qu'il a appris à barrer.
 *
 * J'AVAIS ÉCRIT ICI QUE LES FLOTTANTS FAUSSAIENT LE CALCUL — « 305 / 100 vaut
 * 3.0500000000000003 ». C'EST FAUX, et je ne l'avais jamais calculé.
 * `tools/epreuveTombe.mjs` a posé sa seconde question — ce défaut existe-t-il ?
 * — et l'essai a été fait : sur les 300 000 numérateurs de 0 à 99 999 aux
 * trois rangs, la division `n / 10^d` et la composition chiffre à chiffre
 * donnent EXACTEMENT le même nombre. Zéro divergence. Diviser par une
 * puissance de dix est exact dans toute l'étendue où cet exercice travaille.
 *
 * On garde quand même la composition par chiffres, pour la raison qui reste
 * vraie : c'est la CHAÎNE qu'on veut, avec sa virgule française et sans zéro
 * inutile. `String(3.5)` rend « 3.5 », point compris, et il faudrait de toute
 * façon la réécrire.
 */
function ecrireDecimal(numerateur, decimales) {
    const signe = numerateur < 0 ? '-' : '';
    const chiffres = String(Math.abs(numerateur)).padStart(decimales + 1, '0');
    const entiere = chiffres.slice(0, chiffres.length - decimales);
    const apres = chiffres.slice(chiffres.length - decimales).replace(/0+$/, '');
    return signe + entiere + (apres ? ',' + apres : '');
}

/** La même valeur, en écriture machine — c'est elle qu'on compare. */
function valeurDecimale(numerateur, decimales) {
    return Number(ecrireDecimal(numerateur, decimales).replace(',', '.'));
}

/**
 * Tire un numérateur pour un rang donné.
 *
 * `avecZero` demande un nombre dont le PREMIER chiffre après la virgule est un
 * zéro — 3,05, 0,07. C'est le cas qui sépare ceux qui ont compris de ceux qui
 * récitent, et il ne sort presque jamais d'un tirage uniforme : à deux
 * décimales, un nombre sur dix seulement. On le force donc une fois sur trois.
 */
function tirerNumerateur(rng, rang, avecZero, maxEntier) {
    const { decimales, denominateur } = RANGS[rang];
    const entier = rng.int(0, Math.max(0, maxEntier));
    if (avecZero && decimales >= 2) {
        // Un zéro juste après la virgule, puis des chiffres quelconques — DONT
        // LE DERNIER N'EST PAS NUL.
        //
        // Ce commentaire disait déjà « dont le dernier n'est pas nul » et le
        // code ne le faisait pas : à trois décimales, le tirage pouvait rendre
        // 3050, qui s'écrit 3,05 — deux décimales pour un dénominateur 1000.
        // L'élève qui compte les chiffres après la virgule, comme on le lui
        // apprend, répondait alors 100 et était marqué faux. C'est l'épreuve
        // « autant de décimales que de zéros » qui l'a trouvé, sur mon propre
        // générateur, avant qu'il ne serve.
        const brut = rng.int(1, Math.pow(10, decimales - 1) - 1);
        const reste = brut % 10 === 0 ? brut + 1 : brut;
        return entier * denominateur + reste;
    }
    // Le dernier chiffre n'est pas nul : 3,50 s'écrit 3,5, et la question
    // « combien de décimales ? » n'aurait plus de sens.
    const partie = rng.int(1, denominateur - 1);
    return entier * denominateur + (partie % 10 === 0 ? partie + 1 : partie);
}

export const fractionDecimaleGenerator = {
    id: 'num.fraction-decimale',
    label: 'Fraction décimale et écriture à virgule',
    skills: [SKILL],
    answerKinds: ['numeric'],
    ecrit: true,
    // « TOUJOURS DES FRACTIONS EN COLONNES » : la fiche imprimée lit ce
    // drapeau pour composer ses colonnes, et l'écran rend la fraction
    // numérateur sur dénominateur. La barre oblique est une commodité de
    // clavier, pas une écriture mathématique.
    fractions: true,
    params: [
        {
            id: 'sens', type: 'select', label: 'Dans quel sens', default: 'les-deux',
            aide: 'Le va-et-vient EST l\'exercice : un seul sens s\'apprend comme une '
                + 'recette. On ne fige le sens que pour une remédiation courte.',
            options: [
                { value: 'vers-fraction', label: 'De la virgule vers la fraction (3,5 → 35/10)' },
                { value: 'vers-virgule', label: 'De la fraction vers la virgule (35/10 → 3,5)' },
                { value: 'les-deux', label: 'Les deux, au hasard' }
            ]
        },
        // LE DÉNOMINATEUR EST L'AUTRE MOITIÉ DE LA RÈGLE, ET LA PLUS OUBLIÉE.
        //
        // Donner « /10 » et demander le numérateur, c'est seulement demander
        // de retirer la virgule — un geste de copiste. Demander le
        // DÉNOMINATEUR oblige à compter les décimales, c'est-à-dire à savoir
        // ce que le dénominateur COMPTE. C'est là que se joue 7/100 = 0,07.
        //
        // (Le « pourquoi » vit ici et non dans l'aide du réglage : une aide
        // tient en deux phrases courtes, et `tests/aidesReglages.test.mjs`
        // garde cette règle — il m'a repris pour trois caractères.)
        {
            id: 'trou', type: 'select', label: 'Ce qu\'on demande d\'écrire', default: 'les-deux',
            aide: 'Le numérateur, c\'est retirer la virgule. Le dénominateur, c\'est '
                + 'compter les décimales.',
            options: [
                { value: 'numerateur', label: 'Le numérateur (le dénominateur est donné)' },
                { value: 'denominateur', label: 'Le dénominateur (le numérateur est donné)' },
                { value: 'les-deux', label: 'L\'un ou l\'autre' }
            ]
        },
        {
            id: 'rangs', type: 'multiselect', label: 'Jusqu\'où', deroulant: true,
            default: ['dixiemes', 'centiemes'],
            options: [
                { value: 'dixiemes', label: 'Dixièmes (un chiffre après la virgule)' },
                { value: 'centiemes', label: 'Centièmes (deux chiffres)' },
                { value: 'milliemes', label: 'Millièmes (trois chiffres)' }
            ]
        },
        {
            id: 'maxEntier', type: 'number', label: 'Partie entière maximum', default: 9,
            min: 0, max: 99,
            aide: 'À 0, on ne pose que des nombres plus petits que 1 — 0,7 = 7/10. C\'est '
                + 'la première marche, et celle où le zéro de gauche se perd.'
        },
        {
            id: 'piegeZero', type: 'boolean', label: 'Poser le zéro qui tient le rang',
            default: true,
            aide: '7/100 = 0,07 et non 0,7 ; 3,05 = 305/100 et non 35/100. C\'est LA '
                + 'question du chapitre, et elle ne sort presque jamais d\'un tirage au '
                + 'hasard : une question sur trois la pose exprès.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const choisis = (Array.isArray(params.rangs) && params.rangs.length
            ? params.rangs : ['dixiemes', 'centiemes']).filter(r => RANGS[r]);
        const rang = choisis.length ? rng.pick(choisis) : 'dixiemes';
        const { decimales, denominateur, nom } = RANGS[rang];

        const sens = params.sens === 'vers-fraction' || params.sens === 'vers-virgule'
            ? params.sens
            : (rng.int(0, 1) ? 'vers-fraction' : 'vers-virgule');

        // UNE QUESTION SUR TROIS POSE LE ZÉRO, quand le réglage l'autorise et
        // que le rang le permet — aux dixièmes il n'y a pas de place pour lui.
        const avecZero = params.piegeZero !== false && decimales >= 2 && rng.int(0, 2) === 0;
        const numerateur = tirerNumerateur(rng, rang, avecZero,
            Number(params.maxEntier ?? 9));
        const ecriture = ecrireDecimal(numerateur, decimales);
        const valeur = valeurDecimale(numerateur, decimales);

        if (sens === 'vers-virgule') {
            const texte = `${numerateur}/${denominateur} = ?`;
            return makeItem({
                seed: rng.seed, generatorId: 'num.fraction-decimale', skillId: SKILL,
                answerKind: 'numeric',
                prompt: {
                    text: `Écris ${numerateur}/${denominateur} avec une virgule.`,
                    papier: `${numerateur}/${denominateur} = \\ldots`,
                    html: `<div class="game-question">Écris ce nombre avec une virgule :</div>
                           <div class="frac-egalite">${fractionHtml(numerateur, denominateur)}
                           <span class="frac-signe">=</span>
                           <span class="frac-trou" aria-label="nombre manquant">?</span></div>`
                },
                answer: valeur,
                // L'ERREUR A UN NOM. Celui qui écrit 0,7 pour 7/100 n'a pas
                // mal calculé : il a compté les chiffres du NUMÉRATEUR au lieu
                // des zéros du dénominateur. « Faux » ne le lui dit pas.
                diagnostics: [{
                    value: valeurDecimale(numerateur, Math.max(1, decimales - 1)),
                    why: `Il manque un rang. ${denominateur} a ${decimales} zéro`
                        + `${decimales > 1 ? 's' : ''}, donc il faut ${decimales} chiffre`
                        + `${decimales > 1 ? 's' : ''} après la virgule — au besoin un zéro `
                        + 'juste après elle pour tenir le rang.'
                }, {
                    value: numerateur,
                    why: 'C\'est le numérateur recopié. Le trait de fraction est une '
                        + `division : il faut partager ${numerateur} en ${denominateur}.`
                }],
                hints: [
                    `${denominateur} a ${decimales} zéro${decimales > 1 ? 's' : ''}.`,
                    `Donc le résultat a ${decimales} chiffre${decimales > 1 ? 's' : ''} `
                        + 'après la virgule.',
                    `${numerateur}/${denominateur} = ${ecriture}`
                ],
                explanation: `${numerateur}/${denominateur} se lit « ${numerateur} ${nom} ». `
                    + `${denominateur} a ${decimales} zéro${decimales > 1 ? 's' : ''}, donc on `
                    + `pose ${decimales} chiffre${decimales > 1 ? 's' : ''} après la virgule : `
                    + `${ecriture}.`,
                difficulty: decimales + (avecZero ? 1 : 0),
                // L'ÉLÈVE ÉCRIT UN NOMBRE À VIRGULE : la touche virgule doit
                // exister. Sans ce drapeau, le pavé ne la montre pas et la
                // question devient impossible — le défaut serait ici, et
                // l'élève le verrait là-bas.
                meta: { decimal: true, rang, sens, avecZero, enonce: texte }
            });
        }

        // --- De la virgule vers la fraction ------------------------------------
        const trou = params.trou === 'numerateur' || params.trou === 'denominateur'
            ? params.trou
            : (rng.int(0, 1) ? 'numerateur' : 'denominateur');
        const reponse = trou === 'numerateur' ? numerateur : denominateur;
        const vide = '<span class="frac-trou" aria-label="nombre manquant">?</span>';
        const texte = trou === 'numerateur'
            ? `${ecriture} = ?/${denominateur}`
            : `${ecriture} = ${numerateur}/?`;

        return makeItem({
            seed: rng.seed, generatorId: 'num.fraction-decimale', skillId: SKILL,
            answerKind: 'numeric',
            prompt: {
                text: `Complète : ${texte}`,
                papier: `${ecriture} = ${trou === 'numerateur' ? '\\ldots' : numerateur}/`
                    + `${trou === 'numerateur' ? denominateur : '\\ldots'}`,
                html: `<div class="game-question">Complète l'égalité :</div>
                       <div class="frac-egalite"><span class="frac-nombre">${ecriture}</span>
                       <span class="frac-signe">=</span>
                       ${fractionHtml(trou === 'numerateur' ? vide : numerateur,
                           trou === 'denominateur' ? vide : denominateur, 'fraction--trou')}
                       </div>`
            },
            answer: reponse,
            diagnostics: trou === 'numerateur' ? [{
                // Le nombre recopié avec sa virgule, ou sa partie entière :
                // deux façons de n'avoir pas vu que le numérateur est un
                // ENTIER — le nombre écrit sans sa virgule.
                value: valeur,
                why: 'Un numérateur est un nombre entier : on écrit le nombre SANS sa '
                    + `virgule. ${ecriture} donne ${numerateur}.`
            }] : [{
                value: decimales,
                why: 'C\'est le NOMBRE de décimales, pas le dénominateur. Il en faut un '
                    + `qui s'écrive avec ${decimales} zéro${decimales > 1 ? 's' : ''} : `
                    + `${denominateur}.`
            }],
            hints: trou === 'numerateur'
                ? [`On écrit ${ecriture} sans sa virgule.`,
                    `Cela donne ${numerateur}.`]
                : [`${ecriture} a ${decimales} chiffre${decimales > 1 ? 's' : ''} après la virgule.`,
                    `Il faut donc un 1 suivi de ${decimales} zéro${decimales > 1 ? 's' : ''}.`,
                    `C'est ${denominateur}.`],
            explanation: `${ecriture} se lit « ${numerateur} ${nom} » : `
                + `${ecriture} = ${numerateur}/${denominateur}. Le numérateur est le nombre `
                + `écrit sans sa virgule, et le dénominateur porte autant de zéros qu'il y a `
                + `de chiffres après la virgule.`,
            difficulty: decimales + (avecZero ? 1 : 0),
            // ICI LA RÉPONSE EST UN ENTIER — un numérateur ou un dénominateur.
            // Montrer la touche virgule inviterait à écrire 3,5 là où l'on
            // attend 35.
            meta: { decimal: false, rang, sens, trou, avecZero, enonce: texte }
        });
    }
};
