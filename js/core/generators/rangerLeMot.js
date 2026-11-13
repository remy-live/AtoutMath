// RANGER, ET LE MOT APPARAÎT — l'exercice qui se corrige tout seul.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, page « Ordre · Axe », exercice 17 : « on place les points, on range les
// abscisses dans l'ordre, et les lettres donnent un mot. C'est un exercice qui
// se corrige tout seul : si le mot ne sort pas, l'élève le sait avant le
// professeur. »
//
// ── POURQUOI PLUSIEURS DROITES, ET POURQUOI ELLES SE CHEVAUCHENT ────────────
//
// SUR UNE SEULE DROITE, IL N'Y A RIEN À RANGER : l'ordre des points est l'ordre
// de gauche à droite, et le mot se lit sans avoir lu une seule abscisse. Le
// travail n'apparaît qu'avec DEUX ÉCHELLES DIFFÉRENTES — un point à 0,3 sur une
// droite qui va de 0 à 1 est à gauche d'un point à 1 sur une droite qui va de 0
// à 10, alors qu'il est DESSINÉ bien plus loin vers la droite.
//
// Et il faut que les droites se CHEVAUCHENT. Avec une droite de 0 à 1 et une de
// 100 à 150, tous les points de la première précèdent tous ceux de la seconde :
// on range par droite, sans rien lire. Les trois jeux de droites ci-dessous
// partagent donc leur bord gauche — dans la troisième marche, le MÊME cran vaut
// 10, 1 et 0,1 selon la droite où il se trouve, et c'est exactement le savoir
// que ce chapitre veut.
//
// ── CE QUE L'ÉLÈVE FAIT, ET POURQUOI CE GESTE-LÀ ────────────────────────────
//
// Rémy, consulté sur les trois gestes possibles : « Toucher les points dans
// l'ordre ». On touche le plus petit, puis le suivant, et la lettre vient se
// poser sous les droites. Le mot se construit SOUS SES YEUX — c'est ce qui rend
// vraie sa phrase : il le sait avant le professeur. Taper le mot au pavé de
// lettres l'aurait obligé à l'avoir trouvé AVANT d'écrire, et le garde-fou
// serait devenu une récompense de fin.
//
// Le générateur est PUR : l'écran vit dans `activities/rangerLeMot.js`, la
// feuille dans `ui/fiches/nombres.js`.

import { makeItem, finalizeChoices } from '../items.js';
import { LEXIQUE_PYRAMIDE } from '../../data/motsPyramide.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'num.dec.graduations';

// DIX INTERVALLES PAR DROITE, comme partout dans ce chapitre.
const CRANS = 10;

/**
 * LES TROIS MARCHES. Le nombre de lettres monte avec le nombre de droites : à
 * six lettres sur deux droites, trois points se bousculent sur la même et le
 * dessin devient illisible.
 */
const MARCHES = [
    {
        id: 'deux', nom: '1. Deux droites (entiers et dixièmes)', lettres: 4,
        // 0 → 10 et 0 → 1. L'élève qui range à l'oeil met tous les points de la
        // seconde droite après ceux de la première ; ils valent dix fois moins.
        axes: [{ min: 0, pas: 1 }, { min: 0, pas: 0.1 }]
    },
    {
        id: 'trois', nom: '2. Trois droites', lettres: 5,
        // 0 → 10, 0 → 1 et 1 → 2 : la troisième reprend là où la deuxième
        // s'arrête, et le 1 se retrouve sur les trois.
        axes: [{ min: 0, pas: 1 }, { min: 0, pas: 0.1 }, { min: 1, pas: 0.1 }]
    },
    {
        id: 'melees', nom: '3. Trois droites, échelles mêlées', lettres: 6,
        // 0 → 100, 0 → 10 et 0 → 1. LE MÊME CRAN Y VAUT 10, 1 ET 0,1 : la
        // position dessinée ne dit plus rien du tout, il faut lire les bouts.
        axes: [{ min: 0, pas: 10 }, { min: 0, pas: 1 }, { min: 0, pas: 0.1 }]
    }
];

const LISTE = MARCHES.map(m => ({ id: m.id, nom: m.nom }));
const marcheDe = (id) => MARCHES.find(m => m.id === id) || MARCHES[1];

/** Un nombre écrit à la française, sans zéro inutile. */
const fr = (x) => {
    const s = Math.abs(x) < 1e-9 ? '0' : String(Number(x.toPrecision(12)));
    return s.replace('.', ',');
};

/**
 * LA VALEUR D'UN CRAN, ARRONDIE AU RANG DE SON PAS.
 *
 * `0 + 3 * 0.1` vaut 0,30000000000000004 en virgule flottante, et ce nombre-là
 * s'imprimerait tel quel sur la feuille. On arrondit donc au rang du pas, qui
 * est le seul rang où la graduation a un sens.
 */
const valeurDuCran = (axe, cran) => {
    const decimales = (String(axe.pas).split('.')[1] || '').length;
    return Number((axe.min + cran * axe.pas).toFixed(decimales + 1));
};

/** Mélange une liste avec le tirage de la question — jamais `Math.random`. */
const melanger = (liste, rng) => {
    const t = [...liste];
    for (let i = t.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
};

/**
 * LA FAUTE DE CET EXERCICE, FAITE EXPRÈS : RANGER À L'OEIL.
 *
 * On compare les points par leur POSITION DESSINÉE — le plus à gauche d'abord,
 * toutes droites confondues — au lieu de leur abscisse. C'est exactement la
 * faute que plusieurs échelles existent pour attraper, et elle est bien plus
 * fréquente que celle de l'élève qui lit ligne par ligne.
 *
 * J'AVAIS D'ABORD MIS « le plus de chiffres est le plus grand » — 0,12 devant
 * 0,3. Une épreuve a montré qu'elle NE PEUT PAS se produire ici : avec des pas
 * de 10, 1 et 0,1, toutes les abscisses décimales ont UN seul chiffre après la
 * virgule, et la faute donne donc le bon rangement. Le leurre valait la bonne
 * réponse et disparaissait silencieusement. Un distracteur impossible n'est pas
 * un distracteur.
 */
const parLaPosition = (a, b) => (a.cran - b.cran) || (a.axe - b.axe);

export const rangerLeMotGenerator = {
    id: 'num.ranger-le-mot',
    label: 'Ranger, et le mot apparaît',
    skills: [SKILL],
    // `text` POUR LA RÉPONSE TOUCHÉE : l'activité envoie les lettres dans
    // l'ordre où on les a touchées, et c'est une chaîne. `choice` existe pour
    // les défis, où l'on ne peut pas toucher les points de l'énoncé.
    answerKinds: ['text', 'choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE).length, 3),
    params: [
        paramMarches({ marches: LISTE, mot: 'marche' })
    ],

    generate(params = {}, ctx = {}) {
        const rng = ctx.rng;
        const marche = marcheDe(marcheAuRang(Number(ctx.index) || 0,
            marchesCochees(params, LISTE), totalDe(ctx, params), params, 3));
        const axes = marche.axes.map(a => ({
            min: a.min, pas: a.pas, max: valeurDuCran(a, CRANS)
        }));

        // LE MOT. Le lexique de la Pyramide porte déjà les bons : des mots
        // courts, sans accent, et pour beaucoup des mots de mathématiques —
        // AIRE, ANGLE, DROITE, RAYONS, ARETES. On n'écrit pas une deuxième
        // liste pour la même chose.
        const candidats = LEXIQUE_PYRAMIDE.filter(x => x.mot.length === marche.lettres);
        const choisi = candidats[(rng.int(0, candidats.length - 1)
            + (Number(ctx.index) || 0)) % candidats.length];
        const mot = choisi.mot;
        const n = mot.length;

        // TOUTES LES PLACES POSSIBLES, puis un tirage qui tient trois
        // conditions. Chacune ferme un défaut qui ne plante pas :
        //
        //   · DES ABSCISSES DEUX À DEUX DISTINCTES. Deux points de même
        //     abscisse — et il y en a, puisque les droites se chevauchent — ne
        //     SE RANGENT PAS : la question n'aurait pas une réponse mais deux.
        //   · AU MOINS DEUX DROITES EMPLOYÉES. Tous les points sur la même, et
        //     l'ordre se lit de gauche à droite sans lire une abscisse.
        //   · LE MOT NE SE LIT PAS DROITE PAR DROITE. Si parcourir les droites
        //     de haut en bas, chacune de gauche à droite, donne déjà le mot,
        //     l'élève qui ne sait rien le trouve aussi.
        const places = [];
        axes.forEach((a, i) => {
            for (let c = 0; c <= CRANS; c++) {
                places.push({ axe: i, cran: c, abscisse: valeurDuCran(a, c) });
            }
        });

        let points = null;
        for (let essai = 0; essai < 300 && !points; essai++) {
            const tirage = [];
            const vues = new Set();
            for (const p of melanger(places, rng)) {
                if (vues.has(p.abscisse)) continue;
                vues.add(p.abscisse);
                tirage.push(p);
                if (tirage.length === n) break;
            }
            if (tirage.length < n) continue;
            // TOUTES LES DROITES PORTENT AU MOINS UN POINT, ET AUCUNE N'EN PORTE
            // PLUS DE LA MOITIÉ. Sans la première condition on dessine une
            // droite vide, qui n'est alors qu'un décor ; sans la seconde, le
            // premier tirage donnait trois points sur une droite et un seul
            // sur l'autre — un seul point à comparer à l'autre échelle, donc
            // une seule comparaison difficile dans toute la question.
            const parAxe = axes.map((_, i) => tirage.filter(p => p.axe === i).length);
            if (parAxe.some(c => c === 0)) continue;
            if (Math.max(...parAxe) > Math.ceil(n / 2)) continue;

            const ranges = [...tirage].sort((x, y) => x.abscisse - y.abscisse)
                .map((p, k) => ({ ...p, lettre: mot[k] }));

            // La lecture naïve : droite par droite, de gauche à droite.
            const naif = [...ranges]
                .sort((x, y) => (x.axe - y.axe) || (x.cran - y.cran))
                .map(p => p.lettre).join('');
            if (naif === mot) continue;
            // ET RANGER À L'OEIL NON PLUS. Si l'ordre des positions dessinées
            // donne déjà le mot, l'élève qui ignore les échelles réussit — or
            // les échelles sont tout l'exercice. C'est la condition la plus
            // forte des trois, et c'est elle qui rend le leurre « à l'oeil »
            // toujours possible.
            const alOeil = [...ranges].sort(parLaPosition).map(p => p.lettre).join('');
            if (alOeil === mot) continue;

            points = ranges;
        }
        // LE FILET, et il ne devrait jamais servir : quatre à six points parmi
        // vingt-deux à trente-trois places se tirent du premier coup. Mais un
        // générateur qui rend `null` casse la séance entière, et un filet qui
        // tient une place vaut mieux qu'une page blanche.
        if (!points) {
            points = places.slice(0, n)
                .map((p, k) => ({ ...p, lettre: mot[k] }));
        }

        const ordre = [...points].sort((a, b) => a.abscisse - b.abscisse);
        const abscissesRangees = ordre.map(p => fr(p.abscisse));

        const enonce = 'Touche les points du PLUS PETIT au PLUS GRAND : les lettres '
            + 'donnent un mot.';

        // ── LES TROIS FAUTES, ET LE MOT QUE CHACUNE DONNE ──────────────────
        //
        // Un distracteur n'est utile que s'il est le mot QU'UNE FAUTE PRÉCISE
        // produit. On ne mélange donc pas les lettres au hasard : on refait la
        // faute, et on lit ce qui sort.
        const motDe = (liste) => liste.map(p => p.lettre).join('');
        const fauxNaif = motDe([...points]
            .sort((x, y) => (x.axe - y.axe) || (x.cran - y.cran)));
        const fauxDecroissant = motDe([...ordre].reverse());
        const fauxOeil = motDe([...points].sort(parLaPosition));

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.ranger-le-mot',
            skillId: SKILL,
            answerKind: 'text',
            prompt: {
                text: enonce,
                html: `<div class="game-question">${enonce}</div>`,
                papier: 'Écris les abscisses dans l’ordre croissant, puis recopie '
                    + 'les lettres : elles donnent un mot.'
            },
            answer: mot,
            reponsePapier: `${abscissesRangees.join(' < ')} → ${mot}`,
            choices: finalizeChoices(rng, [
                { value: mot, label: mot, correct: true },
                { value: fauxNaif, label: fauxNaif,
                    why: 'C\'est la lecture droite par droite, de gauche à droite. Elle '
                        + 'ignore que les droites n\'ont pas la même échelle.' },
                { value: fauxOeil, label: fauxOeil,
                    why: 'C\'est le rangement à l\'oeil, par la position dessinée. Mais un '
                        + 'point dessiné plus à droite n\'est plus grand que si les deux '
                        + 'droites ont la MÊME échelle.' },
                { value: fauxDecroissant, label: fauxDecroissant,
                    why: 'Les lettres sont là, mais rangées du plus grand au plus petit.' }
            ], {
                count: 4,
                // UN LEURRE DE SECOURS QUI RESTE UN MOT DES MÊMES LETTRES : un
                // bouton qui porte des lettres étrangères au dessin se raye
                // sans réfléchir, et la question devient plus facile.
                filler: (r) => {
                    const t = melanger(mot.split(''), r).join('');
                    return { value: t, label: t };
                }
            }),
            hints: [
                'Ne range pas les points à l’oeil : les droites n’ont pas la même '
                    + 'échelle. Lis D’ABORD les deux nombres écrits aux bouts de chacune.',
                `Sur la première droite, il y a ${CRANS} intervalles entre ${fr(axes[0].min)} `
                    + `et ${fr(axes[0].max)} : un intervalle vaut donc ${fr(axes[0].pas)}. `
                    + `Sur la deuxième, il vaut ${fr(axes[1].pas)}.`,
                'Compte les intervalles À PARTIR DU BOUT GAUCHE, pas les traits : entre deux '
                    + 'traits voisins il y a un intervalle, et le trait de gauche vaut déjà '
                    + 'le nombre de gauche.'
            ],
            explanation: `${mot} — ${choisi.def} Rangées, les abscisses donnent `
                + `${abscissesRangees.join(' < ')}.`,
            difficulty: marche.id === 'deux' ? 1 : marche.id === 'trois' ? 2 : 3,
            meta: {
                marche: marche.id,
                mot, definition: choisi.def,
                axes, points, ordre: abscissesRangees,
                intervalles: CRANS,
                theme: `${marche.id}-${mot}`
            }
        });
    }
};

export default rangerLeMotGenerator;
