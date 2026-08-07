// Générateur « Additionner des nombres relatifs ».
//
// C'est le premier endroit où le nombre cesse d'être une quantité pour
// devenir une POSITION et un DÉPLACEMENT. L'élève qui bute sur (−7) + (+4)
// ne bute presque jamais sur le calcul : il bute sur ce que veut dire un
// nombre négatif. On ne commence donc pas par l'écriture — on commence par
// trois situations où le signe a un sens physique, et l'écriture arrive en
// dernier, comme un résumé de ce qu'on sait déjà faire.
//
//   1. L'ASCENSEUR      — on est à un étage, on monte ou on descend. Les
//                         sous-sols donnent les négatifs sans qu'on ait à
//                         les expliquer : le −2, c'est le deuxième sous-sol.
//   2. LE THERMOMÈTRE   — même droite, mais VERTICALE et graduée en degrés,
//                         et surtout : on part souvent d'un négatif. « Il
//                         fait −3, il monte de 5 » n'a rien d'abstrait.
//   3. LES PASTILLES    — le modèle qui explique POURQUOI les signes
//                         s'annulent : une pastille + et une pastille −
//                         forment une paire qui vaut zéro. C'est lui qu'on
//                         invoque quand l'élève demande « mais pourquoi ? ».
//   4. L'ÉCRITURE       — (−7) + (+4) = ?, sans support. Les trois modèles
//                         restent disponibles en indice.
//   5. LES CHAÎNES      — trois termes : (−3) + (+8) + (−2). On regroupe,
//                         on ne recommence pas de zéro à chaque signe.
//
// Tout ce fichier est pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem } from '../items.js';

const SKILL_SOMME = 'num.relatifs.somme';
const SKILL_SENS = 'num.relatifs.sens';

/** Écriture d'un relatif entre parenthèses : (+4), (−7). Le tiret est un
 *  vrai signe moins (U+2212), pas un trait d'union. */
export function ecrire(n) {
    return n < 0 ? `(−${Math.abs(n)})` : `(+${n})`;
}

/**
 * Un nombre écrit avec un VRAI signe moins (U+2212), jamais le trait d'union
 * du clavier. Sur un chapitre où le signe EST le sujet, un « -12 » plus court
 * que le « − » des graduations n'est pas un détail de typographie : c'est
 * l'œil qui ne fait plus le lien entre l'énoncé et la droite.
 */
export function nb(v) {
    return String(v).replace('-', '−');
}

/** Le rang à la française : 1er, puis 2e, 3e… « 1ᵉ étage » ne se dit pas. */
export function rang(n) {
    return n === 1 ? '1er' : `${n}e`;
}

/** Le même nombre, tel qu'on le lit à voix haute dans une phrase. */
export function signe(n) {
    return n < 0 ? `−${Math.abs(n)}` : `+${n}`;
}

export const NIVEAUX = [
    {
        id: 'ascenseur-positif', modele: 'ascenseur', titre: 'L\'ascenseur, vers le haut',
        difficulte: 1, min: 0, max: 8, pas: [1, 5], sensNegatif: false,
        aide: 'Monter, c\'est avancer vers le haut sur la colonne des étages.'
    },
    {
        id: 'ascenseur-sous-sol', modele: 'ascenseur', titre: 'L\'ascenseur et les sous-sols',
        difficulte: 2, min: -4, max: 8, pas: [1, 6], sensNegatif: true,
        aide: 'Sous le rez-de-chaussée, les étages sont négatifs : −2, c\'est le 2e sous-sol. Descendre, c\'est aller vers les nombres de plus en plus petits.'
    },
    {
        id: 'thermometre', modele: 'thermometre', titre: 'Le thermomètre',
        difficulte: 2, min: -12, max: 12, pas: [2, 9], sensNegatif: true,
        aide: 'La température monte : on va vers le haut du thermomètre. Elle baisse : on descend. Le 0 n\'est pas la fin, on continue en dessous.'
    },
    {
        id: 'pastilles', modele: 'pastilles', titre: 'Les pastilles qui s\'annulent',
        difficulte: 2, min: -7, max: 7, pas: [1, 7], sensNegatif: true,
        aide: 'Une pastille bleue (+1) et une pastille rouge (−1) forment une PAIRE qui vaut 0 : on les barre toutes les deux. Ce qui reste est la réponse.'
    },
    {
        id: 'ecriture', modele: 'ecriture', titre: 'L\'écriture mathématique',
        difficulte: 3, min: -12, max: 12, pas: [1, 12], sensNegatif: true,
        aide: 'Même signe : on additionne et on garde le signe. Signes différents : on soustrait le plus petit du plus grand, et on garde le signe du PLUS GRAND en distance à zéro.'
    },
    {
        id: 'chaine', modele: 'ecriture', titre: 'Trois nombres à la suite',
        difficulte: 4, min: -12, max: 12, pas: [1, 9], sensNegatif: true, termes: 3,
        aide: 'On avance de gauche à droite, un déplacement après l\'autre — ou bien on regroupe d\'abord tous les positifs, puis tous les négatifs.'
    }
];

/**
 * L'explication d'une somme, dans le langage du modèle. Elle REFAIT le
 * raisonnement au lieu d'annoncer le résultat : c'est ce qu'on relit après
 * une erreur.
 */
export function expliquer(modele, depart, deplacements, resultat) {
    const total = depart + deplacements.reduce((s, d) => s + d, 0);
    if (modele === 'ascenseur') {
        const d = deplacements[0];
        const verbe = d >= 0 ? `monte de ${d}` : `descend de ${Math.abs(d)}`;
        return `On part de l'étage ${nb(depart)}. L'ascenseur ${verbe} étage${Math.abs(d) > 1 ? 's' : ''} : `
            + `on se déplace ${d >= 0 ? 'vers le haut' : 'vers le bas'} de ${Math.abs(d)} cran${Math.abs(d) > 1 ? 's' : ''}. `
            + `On arrive à l'étage ${nb(total)}${total < 0 ? ` (${rang(Math.abs(total))} sous-sol)` : ''}.`;
    }
    if (modele === 'thermometre') {
        const d = deplacements[0];
        const verbe = d >= 0 ? `monte de ${d}` : `baisse de ${Math.abs(d)}`;
        return `Il fait ${nb(depart)} °C. La température ${verbe} degré${Math.abs(d) > 1 ? 's' : ''} : `
            + `on compte ${Math.abs(d)} graduation${Math.abs(d) > 1 ? 's' : ''} vers ${d >= 0 ? 'le haut' : 'le bas'}. `
            + `Il fait maintenant ${nb(total)} °C.`;
    }
    if (modele === 'pastilles') {
        const a = depart, b = deplacements[0];
        const paires = Math.min(Math.abs(a), Math.abs(b));
        const memeSigne = (a >= 0) === (b >= 0);
        if (memeSigne) {
            return `Toutes les pastilles sont de la même couleur : aucune paire ne s'annule. `
                + `${Math.abs(a)} et ${Math.abs(b)} font ${Math.abs(a) + Math.abs(b)}, et le signe ne change pas : ${nb(total)}.`;
        }
        return `On forme ${paires} paire${paires > 1 ? 's' : ''} (une bleue avec une rouge), et chaque paire vaut 0. `
            + `Il reste ${Math.abs(total)} pastille${Math.abs(total) > 1 ? 's' : ''} `
            + `${total > 0 ? 'bleue' : total < 0 ? 'rouge' : ''}${Math.abs(total) > 1 && total !== 0 ? 's' : ''}`
            + `${total === 0 ? '— aucune' : ''} : le résultat est ${nb(total)}.`;
    }
    // Écriture : on décrit le geste sur la droite graduée, puis la règle.
    if (deplacements.length > 1) {
        const positifs = [depart, ...deplacements].filter(n => n > 0);
        const negatifs = [depart, ...deplacements].filter(n => n < 0);
        const sp = positifs.reduce((s, n) => s + n, 0);
        const sn = negatifs.reduce((s, n) => s + n, 0);
        return `On regroupe : les positifs font ${signe(sp)}, les négatifs font ${signe(sn)}. `
            + `Il reste ${signe(sp)} et ${signe(sn)} : le résultat est ${nb(total)}.`;
    }
    const a = depart, b = deplacements[0];
    if ((a >= 0) === (b >= 0)) {
        return `${ecrire(a)} et ${ecrire(b)} ont le même signe : on ajoute les distances à zéro `
            + `(${Math.abs(a)} + ${Math.abs(b)} = ${Math.abs(a) + Math.abs(b)}) et on garde ce signe : ${nb(total)}.`;
    }
    const grand = Math.abs(a) >= Math.abs(b) ? a : b;
    return `Les signes sont différents : on retire la plus petite distance à zéro de la plus grande `
        + `(${Math.max(Math.abs(a), Math.abs(b))} − ${Math.min(Math.abs(a), Math.abs(b))} = ${Math.abs(total)}), `
        + `et on garde le signe de ${ecrire(grand)}, le plus éloigné de zéro : ${nb(total)}.`;
}

/** L'énoncé, dans le langage du modèle. */
function enonceDe(modele, depart, deplacements) {
    if (modele === 'ascenseur') {
        const d = deplacements[0];
        const lieu = depart === 0 ? 'au rez-de-chaussée'
            : depart > 0 ? `au ${rang(depart)} étage` : `au ${rang(Math.abs(depart))} sous-sol`;
        return `L'ascenseur est ${lieu}. Il ${d >= 0 ? 'monte' : 'descend'} de ${Math.abs(d)} étage${Math.abs(d) > 1 ? 's' : ''}. Où arrive-t-il ?`;
    }
    if (modele === 'thermometre') {
        const d = deplacements[0];
        return `Il fait ${nb(depart)} °C. La température ${d >= 0 ? 'monte' : 'baisse'} de ${Math.abs(d)} degré${Math.abs(d) > 1 ? 's' : ''}. Quelle température fait-il ?`;
    }
    if (modele === 'pastilles') {
        return `Combien font ${ecrire(depart)} et ${ecrire(deplacements[0])} ensemble ?`;
    }
    return `${ecrire(depart)} + ${deplacements.map(ecrire).join(' + ')} = ?`;
}

/** Trois distracteurs qui portent chacun une erreur classique. */
export function leurres(depart, deplacements, resultat) {
    const total = resultat;
    const set = new Map();
    const ajouter = (v, pourquoi) => {
        if (v !== total && Number.isFinite(v) && !set.has(v)) set.set(v, pourquoi);
    };
    const somme = deplacements.reduce((s, d) => s + d, 0);
    // L'erreur reine : on additionne les distances à zéro en oubliant les signes.
    ajouter(Math.abs(depart) + Math.abs(somme),
        'Tu as ajouté les nombres sans tenir compte des signes.');
    // Le signe inversé.
    ajouter(-total, 'Le calcul est bon, mais le signe est inversé : regarde qui est le plus loin de zéro.');
    // On a soustrait dans le mauvais sens.
    ajouter(depart - somme,
        deplacements[0] < 0 ? 'Tu as descendu au lieu de monter (ou l\'inverse).'
            : 'Tu as changé le sens du déplacement.');
    // Le décalage d'un cran : on compte la case de départ comme un pas.
    ajouter(total + (somme >= 0 ? 1 : -1),
        'Il y a un cran d\'écart : la case de départ ne compte pas comme un déplacement.');
    ajouter(total + (somme >= 0 ? -1 : 1), 'Il manque un cran dans le déplacement.');
    return [...set.entries()].map(([value, why]) => ({ value, why }));
}

export const relatifsGenerator = {
    id: 'num.relatifs',
    label: 'Additionner des nombres relatifs',
    skills: [SKILL_SOMME, SKILL_SENS],
    answerKinds: ['numeric', 'choice'],
    params: [
        {
            id: 'niveau', type: 'select', label: 'Niveau',
            options: [
                { value: 'progressif', label: 'Progressif (les 6 étapes à la suite)' },
                ...NIVEAUX.map((n, i) => ({ value: n.id, label: `${i + 1}. ${n.titre}` }))
            ],
            default: 'progressif'
        },
        {
            id: 'reponse', type: 'select', label: 'Réponse',
            options: [
                { value: 'saisie', label: 'À saisir (clavier de nombres)' },
                { value: 'choix', label: 'À choisir parmi quatre' }
            ],
            default: 'saisie'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const choix = params?.niveau || 'progressif';
        // En progressif, deux questions par étape : le temps de s'installer
        // dans un modèle avant d'en changer.
        const rang = choix === 'progressif'
            ? Math.min(NIVEAUX.length - 1, Math.floor((ctx.index ?? 0) / 2))
            : Math.max(0, NIVEAUX.findIndex(n => n.id === choix));
        const niveau = NIVEAUX[rang];

        const [pasMin, pasMax] = niveau.pas;
        const tirerPas = () => {
            const g = rng.int(pasMin, pasMax);
            return niveau.sensNegatif && rng.bool() ? -g : g;
        };

        // Le point de départ, puis les déplacements — en s'assurant que le
        // résultat reste dans la fenêtre du modèle : un thermomètre gradué de
        // −12 à 12 ne doit pas demander une réponse à 19.
        let depart, deplacements, total;
        let essais = 0;
        do {
            depart = niveau.modele === 'pastilles'
                ? (rng.bool() ? rng.int(1, 7) : -rng.int(1, 7))
                : rng.int(niveau.min, niveau.max);
            // `termes` compte les nombres de l'écriture, départ compris :
            // « trois nombres à la suite » vaut un départ et deux
            // déplacements, pas trois déplacements.
            const n = (niveau.termes || 2) - 1;
            deplacements = Array.from({ length: n }, tirerPas).filter(d => d !== 0);
            if (!deplacements.length) deplacements = [tirerPas() || 1];
            total = depart + deplacements.reduce((s, d) => s + d, 0);
            essais++;
        } while (essais < 40 && (total < niveau.min || total > niveau.max));

        const enonce = enonceDe(niveau.modele, depart, deplacements);
        const explication = expliquer(niveau.modele, depart, deplacements, total);

        // Les aides montent d'un cran à la fois : d'abord où regarder, puis
        // le geste, puis le raisonnement complet. Jamais la réponse seule.
        const aides = [
            niveau.aide,
            niveau.modele === 'pastilles'
                ? `Commence par former les paires : il y en a ${Math.min(Math.abs(depart), Math.abs(deplacements[0]))}.`
                : niveau.modele === 'ecriture'
                    ? `Place-toi sur ${nb(depart)} sur la droite des nombres, puis déplace-toi de ${deplacements.map(d => `${Math.abs(d)} cran${Math.abs(d) > 1 ? 's' : ''} vers ${d >= 0 ? 'la droite' : 'la gauche'}`).join(', puis ')}.`
                    : `Pars de ${nb(depart)} et compte ${Math.abs(deplacements[0])} cran${Math.abs(deplacements[0]) > 1 ? 's' : ''} vers ${deplacements[0] >= 0 ? 'le haut' : 'le bas'}.`,
            explication
        ];

        const modeReponse = params?.reponse === 'choix' ? 'choice' : 'numeric';
        const distracteurs = leurres(depart, deplacements, total).slice(0, 3);

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.relatifs',
            skillId: niveau.modele === 'ecriture' ? SKILL_SOMME : SKILL_SENS,
            answerKind: modeReponse,
            prompt: {
                text: enonce,
                html: `<div class="game-question">${enonce}</div>`
            },
            answer: total,
            choices: modeReponse === 'choice'
                ? [{ value: total, label: nb(total), correct: true },
                    ...distracteurs.map(d => ({ value: d.value, label: nb(d.value), correct: false, why: d.why }))]
                    .sort((a, b) => a.value - b.value)
                : null,
            hints: aides,
            explanation: explication,
            difficulty: niveau.difficulte,
            meta: {
                modele: niveau.modele, depart, deplacements, total,
                min: niveau.min, max: niveau.max,
                niveau: niveau.id, titre: niveau.titre,
                rang: rang + 1, total_niveaux: NIVEAUX.length,
                lecon: SKILL_SOMME
            }
        });
    }
};

export default relatifsGenerator;
