// LES OPÉRATIONS POSÉES, SUR LE PAPIER.
//
// C'est l'exercice le plus banal d'une feuille de calcul, et celui qui
// manquait : « pose et effectue ». Rémy le demande pour les quatre opérations.
//
// CE QUE LA FICHE DONNE, ET CE QU'ELLE NE DONNE PAS. Elle imprime la potence
// ou les colonnes, avec les nombres déjà ALIGNÉS — l'alignement est un
// exercice à lui seul, il se travaille à l'écran où l'on peut se tromper et
// recommencer ; sur une photocopie, un élève qui aligne mal n'a plus qu'à
// raturer. Elle laisse en revanche toute la place d'écrire : les retenues, les
// produits partiels, les soustractions successives de la division.
//
// Ce module ne calcule RIEN lui-même : tout vient de core/poser.js, le même
// modèle que l'écran. Une fiche qui referait ses colonnes de son côté finirait
// par ne plus dire la même chose que le jeu.

import { makeItem } from '../items.js';
import { poser, enFrancais, decimales as decimalesDe } from '../poser.js';

const SIGNE = { '+': '+', '-': '−', '×': '×', '÷': '÷' };
const NOM = {
    '+': 'addition', '-': 'soustraction',
    '×': 'multiplication', '÷': 'division'
};

/** Un entier de `n` chiffres, dont le premier n'est jamais zéro. */
function entier(rng, n) {
    if (n <= 1) return rng.int(2, 9);
    let v = rng.int(1, 9);
    for (let i = 1; i < n; i++) v = v * 10 + rng.int(0, 9);
    return v;
}

/**
 * UN NOMBRE DONT LA PARTIE ENTIÈRE FAIT `n` CHIFFRES, avec `d` décimales.
 *
 * On construit l'entier puis on divise par une puissance de dix : 345 et une
 * décimale donnent 34,5. Jamais d'addition de flottants, donc jamais de
 * 0,30000000000000004 dans une colonne.
 *
 * C'EST LA PARTIE ENTIÈRE QUI EST FIXÉE, pas le nombre total de chiffres.
 * Compter tous les chiffres donnait « 87,32 + 1027 » : deux nombres de quatre
 * chiffres, mais d'ordres de grandeur si différents que l'addition n'a plus
 * l'air d'une addition. À partie entière égale, on retrouve ce qu'on écrit au
 * tableau — « 87,32 + 43 ».
 *
 * ET LA DERNIÈRE DÉCIMALE N'EST JAMAIS NULLE. 880 / 10 s'écrit « 88 » : la
 * virgule demandée disparaissait toute seule, et une fiche réglée « jusqu'aux
 * dixièmes » sortait des lignes d'entiers sans qu'on comprenne pourquoi.
 */
function nombre(rng, n, d) {
    if (!d) return entier(rng, n);
    for (let essai = 0; essai < 20; essai++) {
        const v = entier(rng, n + d);
        if (v % 10 !== 0) return v / Math.pow(10, d);
    }
    // Le filet : on force le dernier chiffre plutôt que de rendre un entier.
    return (entier(rng, n + d) - (entier(rng, n + d) % 10) + rng.int(1, 9)) / Math.pow(10, d);
}

/**
 * COMBIEN DE DÉCIMALES À CHACUN DES DEUX NOMBRES.
 *
 * PAS LE MÊME NOMBRE DES DEUX CÔTÉS, et c'est tout l'exercice. « 12,5 + 3,75 »
 * est la question ; « 12,50 + 3,75 » est la même opération avec la difficulté
 * effacée d'avance. L'élève qui aligne sur le bord droit trouve juste dans le
 * second cas et faux dans le premier — donc seul le premier apprend quelque
 * chose. Rémy le dit dans la consigne de l'écran : « c'est la virgule qui
 * aligne, pas le bord droit ».
 *
 * L'un des deux porte toujours le maximum demandé : sans cela, régler « deux
 * décimales » pourrait ne rien donner de plus qu'une seule.
 */
function decimalesDesDeux(rng, d) {
    if (!d) return [0, 0];
    const autre = rng.int(0, d);
    return rng.bool() ? [d, autre] : [autre, d];
}

/**
 * UN TIRAGE QUI POSE VRAIMENT LA QUESTION.
 *
 * Une addition sans une seule retenue ne s'appelle pas « poser une addition » :
 * c'est aligner des chiffres. Une soustraction sans emprunt non plus. On
 * retire donc, et on retire jusqu'à en avoir — mais pas indéfiniment : au bout
 * de quarante essais on accepte ce qu'on a, plutôt que de faire tourner le
 * navigateur pour un cas de bord.
 */
function tirer(rng, operation, chiffres, nombres, avecRetenue, diviseur, decs, jusquOu) {
    // JUSQU'OÙ POUSSER LA DIVISION. Trois exercices, et trois seulement :
    //   · `reste`     — on s'arrête au quotient entier et à son reste ;
    //   · `dividende` — le dividende porte une virgule, qu'on abaisse ;
    //   · `centieme`  — dividende entier, mais on continue en abaissant des
    //                   zéros jusqu'au centième.
    // On ne divise JAMAIS par un décimal : à l'école, on commence par déplacer
    // la virgule des deux nombres, et c'est un autre chapitre. Le noyau refuse
    // d'ailleurs de le poser, et il a raison.
    const optionsDiv = jusquOu === 'centieme' ? { decimalesMax: 2 } : {};

    for (let essai = 0; essai < 40; essai++) {
        // La partie entière, la même pour tout le monde : les décimales
        // s'ajoutent, elles ne rognent pas le nombre.
        // Deux chiffres au moins devant la virgule : « 4 × 2,21 » n'est pas
        // une multiplication posée, c'est une table.
        const ent = Math.max(2, chiffres - decs);
        let ops;
        if (operation === '+') {
            // Tous les termes n'ont pas le même nombre de décimales : à trois
            // nombres, on tire pour chacun, l'un au moins portant le maximum.
            const rangs = Array.from({ length: nombres }, () => rng.int(0, decs));
            if (decs) rangs[rng.int(0, nombres - 1)] = decs;
            ops = rangs.map(d => nombre(rng, ent, d));
        } else if (operation === '-') {
            // Le grand d'abord : une soustraction posée ne descend pas
            // sous zéro, et le noyau refuse — à juste titre — de la poser.
            const [dA, dB] = decimalesDesDeux(rng, decs);
            const a = nombre(rng, ent, dA);
            const b = nombre(rng, Math.max(1, ent - rng.int(0, 1)), dB);
            // On garde LES DÉCIMALES AVEC LEUR NOMBRE : échanger les deux
            // valeurs échange aussi leurs virgules, et c'est très bien — ce
            // qui compte est qu'elles diffèrent, pas laquelle est en haut.
            ops = a >= b ? [a, b] : [b, a];
            if (ops[0] === ops[1]) continue;
        } else if (operation === '×') {
            // LA MULTIPLICATION DÉCIMALE NE S'ALIGNE PAS SUR LA VIRGULE : on
            // multiplie comme si de rien n'était et l'on compte les décimales
            // des deux facteurs à la fin. Deux facteurs à virgule sont donc
            // pleinement légitimes, et c'est même le cas intéressant.
            const [dA, dB] = decimalesDesDeux(rng, decs);
            ops = [nombre(rng, ent, dA), nombre(rng, Math.max(1, ent - 1), dB)];
        } else {
            // LE DIVISEUR EST LE RÉGLAGE QUI COMPTE, et il tirait à deux
            // chiffres dès que les nombres en faisaient trois. « 4 173 ÷ 67 »
            // n'est pas la même chose que « 4 173 ÷ 7 » : la première demande
            // d'estimer un quotient partiel à chaque étape, ce qui n'a plus
            // rien d'une division apprise en CM2. Rémy : « les divisions du pdf
            // sont super dures !!! ». Un chiffre par défaut ; deux, quand on
            // le demande.
            //
            // Le quotient, lui, garde au moins deux chiffres : sinon la
            // potence n'a qu'une étape et ne montre rien de la méthode.
            const nd = Math.max(1, Math.min(2, Number(diviseur) || 1));
            const d = entier(rng, nd);
            const q = entier(rng, Math.max(2, chiffres - nd));
            if (jusquOu === 'dividende') {
                // UN DIVIDENDE À VIRGULE. On le construit par le quotient pour
                // que la division tombe juste : la leçon est « la virgule du
                // quotient tombe quand on abaisse celle du dividende », et un
                // reste au bout la brouillerait sans rien ajouter.
                //
                // Le quotient garde deux chiffres devant sa virgule : tiré
                // comme le quotient entier, il tombait à « 1,4 », et la
                // potence n'avait plus qu'une étape à montrer.
                const q10 = entier(rng, Math.max(3, chiffres - nd + 1));
                ops = [Math.round(q10 * d) / 10, d];
                // Un produit qui finit par zéro rend un dividende entier, donc
                // pas l'exercice demandé : on retire.
                if (decimalesDe(ops[0]) === 0) continue;
            } else {
                // POURSUIVRE UNE DIVISION QUI TOMBE JUSTE N'A AUCUN SENS :
                // « 146 ÷ 2 = 73 », on s'arrête, il n'y a rien à poursuivre.
                // On force donc un reste quand c'est l'exercice demandé.
                const mini = jusquOu === 'centieme' ? 1 : 0;
                if (d <= mini) continue;
                const reste = rng.int(mini, Math.max(mini, d - 1));
                ops = [q * d + reste, d];
            }
        }
        // LE RÉGLAGE DOIT SE VOIR SUR LA FEUILLE. Les décimales tirées peuvent
        // toutes tomber à zéro — 880 / 10 s'écrit « 88 » — et l'on obtenait
        // alors une ligne d'entiers sur une fiche réglée « à virgule ».
        if (decs && operation !== '÷' && !ops.some(v => decimalesDe(v) > 0)) continue;
        let table;
        try { table = poser(operation, ops, optionsDiv); } catch (e) { continue; }
        if (!avecRetenue) return { ops, table };
        if (operation === '+' && table.colonnes.some(c => c.retenueSortante > 0)) return { ops, table };
        if (operation === '-' && table.colonnes.some(c => c.emprunte)) return { ops, table };
        if (operation === '×' || operation === '÷') return { ops, table };
    }
    // Le filet : on repose le tirage le plus simple qui marche à coup sûr.
    const ops = operation === '÷' ? [144, 6] : [entier(rng, chiffres), entier(rng, chiffres)];
    const rangees = operation === '-' && ops[0] < ops[1] ? [ops[1], ops[0]] : ops;
    return { ops: rangees, table: poser(operation, rangees, optionsDiv) };
}

/** L'opération posée EST la compétence : une par signe. */
const COMPETENCE_POSEE = {
    '+': 'num.add.entiers', '-': 'num.sub.entiers',
    '×': 'num.mult.sens', '÷': 'num.div.quotient'
};

export const poserFicheGenerator = {
    id: 'calc.poser-fiche',
    label: 'Poser une opération (fiche)',
    answerKinds: ['numeric'],
    // `calc.pose` n'existe pas au référentiel. Poser une opération, c'est la
    // compétence de l'opération posée : les quatre, selon le réglage.
    skills: ['num.add.entiers', 'num.sub.entiers', 'num.mult.sens', 'num.div.quotient'],
    params: [
        {
            id: 'operation', type: 'select', label: 'Opération', default: '+',
            options: [
                { value: '+', label: 'Addition' },
                { value: '-', label: 'Soustraction' },
                { value: '×', label: 'Multiplication' },
                { value: '÷', label: 'Division' }
            ]
        },
        {
            id: 'chiffres', type: 'select', label: 'Taille des nombres', default: 3,
            options: [
                { value: 2, label: '2 chiffres' },
                { value: 3, label: '3 chiffres' },
                { value: 4, label: '4 chiffres' },
                { value: 5, label: '5 chiffres' }
            ]
        },
        {
            id: 'nombres', type: 'select', label: 'Combien de nombres', default: 2,
            // Trois termes, cela n'existe qu'en addition : une soustraction à
            // trois nombres n'est pas une opération posée, et une division non
            // plus. Le libellé portait « (addition) » faute de mieux.
            visibleSi: (r) => r.operation === '+',
            aide: 'À trois nombres, la retenue peut valoir 2 — et c\'est justement ce '
                + 'qu\'on n\'apprend jamais si l\'on n\'additionne que deux nombres.',
            options: [{ value: 2, label: 'Deux' }, { value: 3, label: 'Trois' }]
        },
        {
            id: 'diviseur', type: 'select', label: 'Diviseur', default: 1,
            visibleSi: (r) => r.operation === '÷',
            aide: 'À un chiffre, on lit le quotient dans la table. À deux, il faut '
                + 'l\'ESTIMER à chaque étape, puis se corriger : c\'est un autre '
                + 'exercice, et il arrive bien plus tard.',
            options: [
                { value: 1, label: 'Un chiffre — 4 173 ÷ 7' },
                { value: 2, label: 'Deux chiffres — 4 173 ÷ 67' }
            ]
        },
        {
            id: 'decimales', type: 'select', label: 'Nombres à virgule', default: 0,
            // Pas pour la division : on ne pose pas une division PAR un
            // décimal, et ce qu'on peut faire de la virgule y est un autre
            // choix — celui d'en dessous.
            visibleSi: (r) => r.operation !== '÷',
            aide: 'C\'est là que tout se joue : on aligne sur la VIRGULE, pas sur le bord '
                + 'droit. Les deux nombres n\'ont d\'ailleurs pas le même nombre de '
                + 'décimales — « 12,5 + 3,75 » — sans quoi la difficulté s\'efface toute '
                + 'seule. La multiplication, elle, ne s\'aligne pas du tout : on multiplie '
                + 'comme si de rien n\'était et l\'on compte les décimales à la fin.',
            options: [
                { value: 0, label: 'Nombres entiers' },
                { value: 1, label: 'Jusqu\'aux dixièmes' },
                { value: 2, label: 'Jusqu\'aux centièmes' }
            ]
        },
        {
            id: 'jusquOu', type: 'select', label: 'Jusqu\'où diviser', default: 'reste',
            visibleSi: (r) => r.operation === '÷',
            aide: 'La virgule du quotient tombe exactement quand on abaisse celle du '
                + 'dividende : ce n\'est pas une convention à retenir, c\'est une '
                + 'conséquence du rang. Et « poursuivre au centième » est l\'autre moitié '
                + 'du chapitre : le reste n\'est plus un reste, on abaisse des zéros.',
            options: [
                { value: 'reste', label: 'S\'arrêter au reste' },
                { value: 'dividende', label: 'Dividende à virgule — 47,5 ÷ 5' },
                { value: 'centieme', label: 'Poursuivre jusqu\'au centième' }
            ]
        },
        {
            id: 'retenue', type: 'checkbox', label: 'Garantir au moins une retenue', default: true,
            // Une retenue s'obtient — et se garantit — en addition et en
            // soustraction. En multiplication et en division, le générateur
            // n'a pas de bouton à offrir là-dessus.
            visibleSi: (r) => r.operation === '+' || r.operation === '-',
            aide: 'Une addition sans retenue ne s\'appelle pas « poser une addition » : '
                + 'c\'est aligner des chiffres.'
        }
    ],

    // Les réglages d'abord, le contexte ensuite : c'est la signature du
    // registre, et l'inverser donne « rng.int is not a function » au premier
    // appel réel.
    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const operation = SIGNE[params.operation] ? params.operation : '+';
        const chiffres = Math.max(2, Math.min(5, Number(params.chiffres) || 3));
        // `termes` en second : c'est le nom que porte le MÊME réglage à
        // l'écran. Sans cet alias, choisir « trois nombres » avant d'imprimer
        // n'avait aucun effet sur la feuille — le réglage était bien lu, mais
        // sous un autre nom, et la fiche retombait sur son défaut.
        const combien = Number(params.nombres ?? params.termes) || 2;
        const nombres = operation === '+' ? Math.max(2, Math.min(3, combien)) : 2;
        // `decimales` accepte encore l'ancienne case à cocher de l'écran : elle
        // vaut `true`, c'est-à-dire « une décimale ». Sans cet accueil, un
        // exercice réglé « nombres à virgule » au catalogue ouvrait une fiche
        // d'entiers, et le réglage semblait ne rien faire.
        const brut = params.decimales;
        const decs = brut === true ? 1
            : Math.max(0, Math.min(2, Number(brut) || 0));
        // `decimalesQuotient` est le nom que porte LE MÊME choix à l'écran :
        // demander un quotient décimal là-bas doit donner une feuille de
        // quotients décimaux ici, sans qu'on ait à le redire.
        const jusquOu = ['reste', 'dividende', 'centieme'].includes(params.jusquOu)
            ? params.jusquOu
            : (Number(params.decimalesQuotient) > 0 ? 'centieme' : 'reste');
        const { ops, table } = tirer(rng, operation, chiffres, nombres,
            params.retenue !== false, params.diviseur, decs, jusquOu);

        const texte = ops.map(enFrancais).join(` ${SIGNE[operation]} `);
        const resultat = operation === '÷' ? table.quotient : table.resultat;
        // Le reste fait partie de la réponse d'une division : « 147 ÷ 4 = 36 »
        // est faux tant qu'on n'a pas dit « il reste 3 ».
        // UNE DIVISION POUSSÉE AU CENTIÈME N'A PAS DE RESTE À ANNONCER : on
        // écrit « ≈ 14,71 », c'est-à-dire « au centième près ». Dire « 14,71
        // reste 0,03 » mélange les deux façons de répondre, et c'est justement
        // la confusion qu'on cherche à éviter en classe.
        const approche = operation === '÷' && !table.exacte && table.decimalesQuotient > 0;
        const reponse = approche ? `≈ ${enFrancais(table.quotient)}`
            : operation === '÷' && !table.exacte
                ? `${enFrancais(table.quotient)} reste ${enFrancais(table.reste)}`
                : enFrancais(resultat);

        return makeItem({
            seed: rng.seed,
            generatorId: 'calc.poser-fiche',
            // LA COMPÉTENCE DE L'OPÉRATION POSÉE, et non un `calc.pose` qui
            // n'existe pas au référentiel : sans libellé, le profil affichait
            // l'identifiant brut. Rémy : « ce n'est pas du tout parlant pour
            // l'utilisateur. »
            skillId: COMPETENCE_POSEE[operation] || 'num.add.entiers',
            answerKind: 'numeric',
            prompt: {
                text: `Pose et effectue : ${texte}`,
                papier: texte,
                html: `<div class="game-question">Pose et effectue : ${texte}</div>`
            },
            answer: resultat,
            explanation: `${texte} = ${reponse}`,
            explicationPapier: `${texte} = ${reponse}`,
            // Une virgule ajoute une difficulté réelle, et deux davantage : le
            // niveau ne peut pas ne tenir qu'à la taille des nombres.
            difficulty: Math.min(5, chiffres - 1 + decimalesDe(resultat)),
            meta: {
                operation, operandes: ops, texte, table, reponse,
                // Ce que la feuille aura à dessiner de plus : une virgule, et à
                // quel rang. Le rendu ne le recalcule pas dans son coin.
                decimales: decs, jusquOu,
                nom: NOM[operation],
                // Ce que la fiche exclura pour le bloc suivant : deux fois la
                // même opération sur une feuille, c'est une question perdue.
                theme: texte
            }
        });
    }
};
