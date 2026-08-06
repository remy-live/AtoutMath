// « Le Chat Géomètre » — repasser des figures en programmant le chat.
//
// L'exercice n'est pas un cours de code déguisé : c'est de la GÉOMÉTRIE. Ce
// qu'on travaille, niveau après niveau, c'est l'angle dont il faut tourner
// pour fermer une figure — et la découverte que pour un polygone régulier à
// n côtés, cet angle vaut 360 ÷ n. Les blocs sont le moyen ; l'angle est
// l'objet.
//
// La progression est écrite à la main, pas tirée au sort. Chaque niveau a une
// raison d'exister et prépare le suivant :
//   1-2   un côté, puis un angle : on ne manipule qu'un nombre
//   3     le carré à la main, huit blocs — pénible EXPRÈS
//   4     le même carré avec « répéter » : le soulagement est l'argument
//   5-7   triangle, hexagone, octogone : 360 ÷ n se laisse deviner
//   8-11  stylo levé, figures composées : escalier, croix, maison
//   12    l'étoile à 5 branches, où l'angle dépasse 90°
//
// Chaque niveau porte SA palette : au niveau 1 il n'y a qu'« avancer ». C'est
// ce qui fait tenir l'écran d'un téléphone, et c'est aussi ce qui rend la
// progression lisible — un bloc nouveau est un événement.

import { makeItem } from '../items.js';
import { executer } from '../scratchVM.js';

const SKILL = 'geo.figure.programme';

// Raccourcis d'écriture des scripts modèles.
const av = (n) => ({ type: 'avancer', valeur: n });
const dr = (n) => ({ type: 'droite', valeur: n });
const ga = (n) => ({ type: 'gauche', valeur: n });
const po = () => ({ type: 'stylo' });
const le = () => ({ type: 'leveStylo' });
const va = (x, y) => ({ type: 'allerA', valeur: x, valeur2: y });
const rep = (n, corps) => ({ type: 'repeter', valeur: n, corps });

/** Le corps d'un polygone régulier : le cœur de l'exercice. */
const polygone = (n, cote) => rep(n, [av(cote), dr(360 / n)]);

/**
 * Recale le point de départ pour que la figure tombe au MILIEU de la scène.
 *
 * Écrire les coordonnées de départ à la main est une source d'erreurs sans
 * fin : ajouter un côté à un polygone en déplace le centre, et la figure sort
 * du cadre sans que rien ne le signale. On exécute donc le modèle depuis
 * l'origine, on mesure son encombrement, et on décale le départ d'autant.
 *
 * Exception : un modèle qui contient « aller à » vise des coordonnées
 * ABSOLUES ; les décaler ne déplacerait qu'une partie de la figure. Ces
 * niveaux-là déclarent donc leur départ eux-mêmes, et on les laisse tels quels.
 */
function centrer(niveau) {
    const depart = { ...niveau.depart };
    if (!contientAllerA(niveau.modele)) {
        const pts = executer(niveau.modele, { ...depart, x: 0, y: 0 }).traces.flat();
        if (pts.length) {
            const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
            // Arrondi au carreau : un carreau vaut 10 pas, et une figure dont
            // le départ tombe à 3,7 pas d'une ligne ne se lit plus. On compte
            // les côtés en carreaux ou on ne les compte pas.
            depart.x = Math.round(-(Math.min(...xs) + Math.max(...xs)) / 2 / 10) * 10;
            depart.y = Math.round(-(Math.min(...ys) + Math.max(...ys)) / 2 / 10) * 10;
        }
    }
    return { depart, figure: executer(niveau.modele, depart).traces };
}

function contientAllerA(script) {
    for (const b of script || []) {
        if (b.type === 'allerA') return true;
        if (b.corps && contientAllerA(b.corps)) return true;
    }
    return false;
}

const NIVEAUX = [
    {
        id: 'trait', titre: 'Un seul trait',
        consigne: 'Fais avancer le chat pour repasser le trait.',
        palette: ['avancer'],
        depart: { dir: 90, stylo: true },
        modele: [av(240)],
        // Le bloc est déjà posé : il ne reste que le nombre à trouver.
        amorce: [av(50)],
        aide: ['Le trait mesure 240 pas de long.', 'Touche le nombre dans le bloc pour le changer.'],
        lecon: 'Le chat avance dans la direction où il regarde. « avancer de 100 pas » trace un trait de 100 pas.',
        difficulte: 1
    },
    {
        id: 'angle-droit', titre: "L'angle droit",
        consigne: "Repasse l'équerre : un trait, un quart de tour, un autre trait.",
        palette: ['avancer', 'droite'],
        depart: { dir: 90, stylo: true },
        modele: [av(200), dr(90), av(200)],
        amorce: [av(200), dr(45), av(200)],
        aide: ['Un quart de tour, c\'est 90 degrés.', 'Le chat tourne SUR PLACE : il ne trace rien pendant qu\'il tourne.'],
        lecon: "Tourner ne trace rien : le chat pivote sur place. Un quart de tour vaut 90°, un demi-tour 180°.",
        difficulte: 1
    },
    {
        id: 'carre-main', titre: 'Le carré, à la main',
        consigne: 'Repasse le carré. Un côté, un quart de tour… quatre fois.',
        palette: ['avancer', 'droite'],
        depart: { dir: 90, stylo: true },
        // Écrit à la main VOLONTAIREMENT : « répéter » n'est pas encore dans la
        // palette. C'est la pénibilité de ces huit blocs qui rend le niveau
        // suivant convaincant.
        modele: [av(180), dr(90), av(180), dr(90), av(180), dr(90), av(180), dr(90)],
        amorce: [],
        aide: ['Quatre côtés, donc quatre fois « avancer » et quatre fois « tourner ».',
            'Chaque côté fait 180 pas, chaque tour 90 degrés.'],
        lecon: 'Un carré a quatre côtés égaux et quatre angles droits. En le parcourant, le chat fait quatre quarts de tour : 4 × 90 = 360°, un tour complet.',
        difficulte: 2
    },
    {
        id: 'carre-boucle', titre: 'Le carré, avec une boucle',
        consigne: 'Le même carré, mais en écrivant le côté UNE SEULE fois.',
        palette: ['avancer', 'droite', 'repeter'],
        depart: { dir: 90, stylo: true },
        modele: [rep(4, [av(180), dr(90)])],
        amorce: [],
        // Le tracé seul ne suffit plus : c'est la boucle qu'on enseigne ici.
        exigences: { boucle: true, maxBlocs: 4 },
        aide: ['Mets « avancer » et « tourner » DANS le bloc « répéter ».',
            'Le carré a 4 côtés identiques : répète 4 fois.'],
        lecon: 'Quand un motif se répète, on ne le réécrit pas : on le met dans « répéter ». Le carré, c’est « avancer, tourner » répété 4 fois.',
        difficulte: 2
    },
    {
        id: 'triangle', titre: 'Le triangle équilatéral',
        consigne: 'Trois côtés égaux. De combien le chat doit-il tourner ?',
        palette: ['avancer', 'droite', 'repeter'],
        depart: { dir: 90, stylo: true },
        modele: [polygone(3, 180)],
        amorce: [],
        exigences: { boucle: true },
        aide: ['Le chat fait un tour complet en parcourant la figure : 360°.',
            '360 ÷ 3 = 120. Attention, ce n’est pas l’angle du triangle (60°) mais celui dont le chat TOURNE.'],
        lecon: "En faisant le tour d'une figure, le chat tourne en tout de 360°. Pour un triangle, il tourne 3 fois : 360 ÷ 3 = 120° à chaque coin.",
        difficulte: 3
    },
    {
        id: 'hexagone', titre: "L'hexagone",
        consigne: 'Six côtés égaux. Trouve l’angle sans chercher au hasard.',
        palette: ['avancer', 'droite', 'repeter'],
        depart: { dir: 90, stylo: true },
        modele: [polygone(6, 100)],
        amorce: [],
        exigences: { boucle: true },
        aide: ['Même raisonnement que pour le triangle : 360 ÷ 6.', '360 ÷ 6 = 60 degrés.'],
        lecon: 'La règle vaut pour tous les polygones réguliers : angle de rotation = 360 ÷ nombre de côtés.',
        difficulte: 3
    },
    {
        id: 'octogone', titre: "L'octogone",
        consigne: 'Huit côtés. Applique la règle.',
        palette: ['avancer', 'droite', 'repeter'],
        depart: { dir: 90, stylo: true },
        modele: [polygone(8, 80)],
        amorce: [],
        exigences: { boucle: true },
        aide: ['360 ÷ 8 = 45 degrés.'],
        lecon: 'Plus un polygone régulier a de côtés, plus son angle de rotation est petit — et plus il ressemble à un cercle.',
        difficulte: 3
    },
    {
        id: 'escalier', titre: "L'escalier",
        consigne: 'Trois marches. Le motif « monter, avancer » se répète.',
        palette: ['avancer', 'droite', 'gauche', 'repeter'],
        depart: { dir: 0, stylo: true },
        modele: [rep(3, [av(70), dr(90), av(70), ga(90)])],
        amorce: [],
        exigences: { boucle: true },
        aide: ['Une marche = monter, tourner à droite, avancer, tourner à gauche.',
            'Le motif d’une marche se répète 3 fois.'],
        lecon: 'Un motif peut contenir plusieurs mouvements. Ce qui compte est de repérer ce qui se répète à l’identique.',
        difficulte: 4
    },
    {
        id: 'croix', titre: 'La croix',
        consigne: 'Deux traits qui se croisent. Le chat doit lever son stylo pour se déplacer.',
        palette: ['avancer', 'droite', 'gauche', 'stylo', 'leveStylo', 'allerA'],
        depart: { x: 0, y: 0, dir: 90, stylo: false },
        modele: [va(-100, 0), po(), av(200), le(), va(0, -100), ga(90), po(), av(200)],
        amorce: [],
        aide: ['Lève le stylo pour aller au départ du deuxième trait, puis repose-le.',
            'Sans lever le stylo, le chat relie les deux traits par une ligne en trop.'],
        lecon: 'Stylo levé, le chat se déplace sans écrire. C’est indispensable pour dessiner une figure faite de morceaux séparés.',
        difficulte: 4
    },
    {
        id: 'maison', titre: 'La maison',
        consigne: 'Un carré surmonté d’un toit triangulaire.',
        palette: ['avancer', 'droite', 'gauche', 'repeter', 'stylo', 'leveStylo'],
        depart: { dir: 90, stylo: true },
        // Le carré ramène le chat à son coin haut gauche, tourné vers la
        // droite : le toit part de là, sans lever le stylo.
        modele: [rep(4, [av(160), dr(90)]), ga(60), av(160), dr(120), av(160)],
        amorce: [],
        aide: ['Commence par le carré, puis remonte au coin haut gauche.',
            'Le toit est un triangle équilatéral posé sur le carré : ses angles font 60°.'],
        lecon: 'Une figure composée se construit morceau par morceau. On termine chaque morceau à l’endroit où commence le suivant.',
        difficulte: 5
    },
    {
        id: 'etoile', titre: "L'étoile à cinq branches",
        consigne: 'Cinq côtés, mais le chat tourne BEAUCOUP plus qu’un pentagone.',
        palette: ['avancer', 'droite', 'repeter'],
        depart: { dir: 72, stylo: true },
        modele: [rep(5, [av(200), dr(144)])],
        amorce: [],
        exigences: { boucle: true },
        aide: ['L’étoile se referme après DEUX tours complets : 2 × 360 ÷ 5.',
            '720 ÷ 5 = 144 degrés.'],
        lecon: "L'étoile à 5 branches se ferme après deux tours complets : l'angle vaut 2 × 360 ÷ 5 = 144°. Un pentagone, lui, n'en fait qu'un : 72°.",
        difficulte: 5
    },
    {
        id: 'rosace', titre: 'La rosace',
        consigne: 'Six carrés en éventail : une boucle DANS une boucle.',
        palette: ['avancer', 'droite', 'repeter'],
        depart: { dir: 90, stylo: true },
        modele: [rep(6, [rep(4, [av(90), dr(90)]), dr(60)])],
        amorce: [],
        exigences: { imbrication: 2 },
        aide: ['La boucle intérieure trace un carré ; l’extérieure le fait pivoter.',
            'Six carrés qui se partagent le tour : 360 ÷ 6 = 60° entre deux carrés.'],
        lecon: 'Une boucle peut en contenir une autre. La rosace, c’est « tracer un carré puis pivoter », répété six fois.',
        difficulte: 6
    }
];

export const scratchGenerator = {
    id: 'geo.scratch',
    label: 'Le Chat Géomètre (repasser une figure)',
    skills: [SKILL],
    answerKinds: ['scratch'],
    params: [
        {
            id: 'mode', type: 'select', label: 'Mode', default: 'progression',
            options: [
                { value: 'progression', label: 'Progression (12 figures à repasser)' },
                { value: 'libre', label: 'Mode libre (dessiner ce qu’on veut)' }
            ]
        },
        {
            id: 'depart', type: 'select', label: 'Commencer au niveau',
            options: NIVEAUX.map((n, i) => ({ value: i + 1, label: `${i + 1}. ${n.titre}` })),
            default: 1
        },
        {
            id: 'saisie', type: 'select', label: 'Poser les blocs',
            options: [
                { value: 'auto', label: 'Selon l’appareil (recommandé)' },
                { value: 'toucher', label: 'Taper pour ajouter' },
                { value: 'glisser', label: 'Glisser-déposer' }
            ],
            default: 'auto'
        }
    ],

    generate(params, ctx) {
        if (params?.mode === 'libre') return atelierLibre(ctx, params);
        // Les niveaux s'enchaînent dans l'ordre : c'est une progression, pas
        // un tirage. `index` est fourni par la session, sinon on avance seul.
        const premier = Math.max(1, Math.min(NIVEAUX.length, parseInt(params?.depart) || 1)) - 1;
        const rang = (premier + (ctx.index ?? 0)) % NIVEAUX.length;
        const niveau = NIVEAUX[rang];
        const { depart, figure } = centrer(niveau);

        return makeItem({
            seed: ctx.rng.seed, generatorId: 'geo.scratch', skillId: SKILL,
            answerKind: 'scratch',
            prompt: {
                text: `${niveau.titre} — ${niveau.consigne}`,
                html: `<div class="game-question sc-consigne"><b>${niveau.titre}</b><span>${niveau.consigne}</span></div>`
            },
            answer: JSON.stringify(niveau.modele),
            hints: niveau.aide,
            explanation: niveau.lecon,
            difficulty: niveau.difficulte,
            meta: {
                niveau: rang + 1, total: NIVEAUX.length, id: niveau.id, titre: niveau.titre,
                palette: niveau.palette, depart, amorce: niveau.amorce || [],
                modele: niveau.modele, figure, exigences: niveau.exigences || null,
                saisie: params?.saisie || 'auto'
            }
        });
    }
};

/**
 * Le MODE LIBRE : la page blanche.
 *
 * Douze figures imposées apprennent l'angle ; elles n'apprennent pas l'envie.
 * Ici il n'y a rien à repasser, aucune exigence de code, toute la palette et
 * une scène vide : on essaie « répéter 36 fois : avancer 20, tourner 10 » pour
 * voir ce que ça fait. C'est ainsi qu'on découvre le cercle — et c'est
 * exactement l'usage qu'on fait de Scratch en classe entre deux exercices.
 *
 * Aucune correction, donc : le bouton « Valider » cède la place à « J'ai
 * fini », qui clôt la séance sans rien juger.
 */
function atelierLibre(ctx, params) {
    return makeItem({
        seed: ctx.rng.seed, generatorId: 'geo.scratch', skillId: SKILL,
        answerKind: 'scratch',
        prompt: {
            text: 'Mode libre — Dessine ce que tu veux : le chat obéit à ton programme.',
            html: '<div class="game-question sc-consigne"><b>Mode libre</b>'
                + '<span>Dessine ce que tu veux : le chat obéit à ton programme.</span></div>'
        },
        answer: 'libre',
        hints: ['Essaie « répéter 36 fois » avec « avancer de 20 » et « tourner de 10 » : tu obtiendras un cercle.',
            'Pour dessiner plusieurs morceaux séparés, lève le stylo, déplace-toi, puis repose-le.'],
        explanation: 'Un programme qui répète un motif en tournant à chaque fois dessine une figure régulière : c’est le principe de toutes les rosaces.',
        difficulty: 1,
        meta: {
            libre: true,
            niveau: 1, total: 1, id: 'libre', titre: 'Mode libre',
            palette: ['avancer', 'droite', 'gauche', 'orienter', 'allerA', 'stylo', 'leveStylo', 'repeter'],
            depart: { x: 0, y: 0, dir: 90, stylo: true },
            amorce: [], figure: [], exigences: null,
            // Le robot n'a rien à corriger, mais il a quelque chose à MONTRER :
            // la rosace, le programme qui donne envie d'en essayer d'autres.
            modele: [rep(36, [av(20), dr(10)])],
            saisie: params?.saisie || 'auto'
        }
    });
}

export { NIVEAUX as NIVEAUX_SCRATCH, centrer as centrerFigure };
