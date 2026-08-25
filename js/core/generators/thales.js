// THALÈS — quatre marches, et la troisième seulement est un calcul.
//
// Rémy : « Un exercice sur le théorème de Thalès. »
//
// ON NE COMMENCE PAS PAR CALCULER, ET C'EST TOUT LE PROPOS. La faute ordinaire
// n'est pas une erreur de calcul : c'est d'écrire AM/MB au lieu de AM/AB — le
// petit morceau sur le RESTE au lieu du TOUT. Le calcul qui suit tombe alors
// parfaitement juste sur une égalité fausse, et rien ne prévient l'élève. On
// fait donc RECONNAÎTRE la configuration, puis CHOISIR l'égalité, avant de
// laisser calculer quoi que ce soit.
//
// LA RÉCIPROQUE EST UNE MARCHE À PART, parce que c'est une autre question. Les
// trois premières marches partent de « les droites sont parallèles » ; la
// quatrième demande de le DÉMONTRER, en comparant deux rapports. C'est le seul
// endroit du chapitre où l'on compare des fractions, et c'est là qu'on écrit
// 0,333 au lieu de 1/3 — d'où la comparaison en produits en croix.
//
// LA FIGURE EST DESSINÉE, PAS À L'ÉCHELLE, et c'est ce que font tous les
// manuels : une figure à l'échelle se mesure à la règle, et l'élève cesse
// d'appliquer le théorème. Seul le RAPPORT est respecté, parce que c'est lui
// qu'on doit voir.

import { makeItem, finalizeChoices } from '../items.js';
import {
    CONFIGURATIONS, creerThales, longueurTexte, egaliteThales, FAUSSES_EGALITES,
    sontParalleles, rapportsCompares, calculThales, pointsReels
} from '../thales.js';

/** Les quatre marches, dans l'ordre où on les gravit. */
export const ETAPES_THALES = {
    configuration: { id: 'configuration', rang: 1, label: '1 · Reconnaître la configuration' },
    egalite: { id: 'egalite', rang: 2, label: '2 · Écrire la bonne égalité' },
    calculer: { id: 'calculer', rang: 3, label: '3 · Calculer une longueur' },
    reciproque: { id: 'reciproque', rang: 4, label: '4 · La réciproque : est-ce parallèle ?' }
};

export const ORDRE_THALES = Object.values(ETAPES_THALES)
    .sort((a, b) => a.rang - b.rang).map(e => e.id);

/** Combien de questions on passe sur une marche avant de monter. */
const PAR_MARCHE = 3;

/**
 * LA FIGURE, EN SVG — la même à l'écran et (redessinée) sur la fiche.
 *
 * `cotes` dit quelles longueurs sont écrites sur le dessin : une figure qui
 * porte toutes ses mesures ne demande plus rien, une figure qui n'en porte
 * aucune ne demande pas la bonne chose.
 */
export function figureThalesSvg(f, cotes = []) {
    const P = f.points;
    // Le papillon monte au-dessus de A : la boîte doit suivre, sinon la moitié
    // de la figure sort du cadre.
    const ys = Object.values(P).map(p => p.y);
    const y0 = Math.min(...ys) - 16, y1 = Math.max(...ys) + 16;

    // LA COTE SE POSE À CÔTÉ DU SEGMENT, PAS DESSUS. Les premières versions
    // écrivaient l'étiquette au milieu du segment avec un décalage fixe : sur
    // A–B, ce milieu tombe pile sur le point M quand le rapport vaut ½, et
    // « AB = 12 » se posait sur la lettre M. On décale donc PERPENDICULAIREMENT
    // au segment, du côté opposé au centre de la figure, et l'on choisit où le
    // long du segment — pour qu'AB ne se pose pas là où AM est déjà.
    const centre = { x: (P.A.x + P.B.x + P.C.x) / 3, y: (P.A.y + P.B.y + P.C.y) / 3 };
    const cote = (a, b, nom, t = 0.5) => {
        if (!cotes.includes(nom)) return '';
        const p = P[a], q = P[b];
        const dx = q.x - p.x, dy = q.y - p.y;
        const n = Math.hypot(dx, dy) || 1;
        // UN SEGMENT TROP COURT NE PORTE PAS SA COTE : l'étiquette se poserait
        // sur la lettre du point. Depuis que la figure ÉTALE les rapports
        // (voir pointsThales), le cas ne se présente plus sur les figures
        // fabriquées ici — le garde-fou reste pour les autres appelants.
        if (n < 14) return '';
        const mx = p.x + dx * t, my = p.y + dy * t;
        // La normale, orientée à l'opposé du centre.
        let nx = -dy / n, ny = dx / n;
        if ((mx - centre.x) * nx + (my - centre.y) * ny < 0) { nx = -nx; ny = -ny; }
        const d = 8;
        return `<text x="${(mx + nx * d).toFixed(1)}" y="${(my + ny * d + 2).toFixed(1)}"
            class="th-cote">${nom} = ${longueurTexte(f[nom])}</text>`;
    };
    const point = (p, nom, dx, dy) =>
        `<circle cx="${p.x}" cy="${p.y}" r="1.8" class="th-pt"/>`
        + `<text x="${p.x + dx}" y="${p.y + dy}" class="th-nom">${nom}</text>`;

    return `<svg viewBox="-12 ${y0} 134 ${y1 - y0}" class="th-fig fig-svg" role="img"
        aria-label="Figure de Thalès, ${CONFIGURATIONS[f.config].label}">
        <style>
            .th-droite { stroke: #4a5568; stroke-width: .8; fill: none; }
            .th-para { stroke: #2f855a; stroke-width: 1.5; fill: none; }
            .th-base { stroke: #2b6cb0; stroke-width: 1.5; fill: none; }
            .th-pt { fill: #1a202c; }
            .th-nom { font-size: 7px; font-weight: 800; fill: #1a202c; }
            .th-cote { font-size: 5.4px; font-weight: 700; fill: #4a5568; }
        </style>
        <line x1="${P.A.x}" y1="${P.A.y}" x2="${P.B.x}" y2="${P.B.y}" class="th-droite"/>
        <line x1="${P.A.x}" y1="${P.A.y}" x2="${P.C.x}" y2="${P.C.y}" class="th-droite"/>
        <line x1="${P.A.x}" y1="${P.A.y}" x2="${P.M.x}" y2="${P.M.y}" class="th-droite"/>
        <line x1="${P.A.x}" y1="${P.A.y}" x2="${P.N.x}" y2="${P.N.y}" class="th-droite"/>
        <line x1="${P.B.x}" y1="${P.B.y}" x2="${P.C.x}" y2="${P.C.y}" class="th-base"/>
        <line x1="${P.M.x}" y1="${P.M.y}" x2="${P.N.x}" y2="${P.N.y}" class="th-para"/>
        ${point(P.A, 'A', 2, -3)}
        ${point(P.B, 'B', -7, 6)}
        ${point(P.C, 'C', 3, 6)}
        ${point(P.M, 'M', -7, 3)}
        ${point(P.N, 'N', 3, 3)}
        ${cote('A', 'M', 'AM', 0.6)}
        ${cote('A', 'B', 'AB', 0.85)}
        ${cote('A', 'N', 'AN', 0.6)}
        ${cote('A', 'C', 'AC', 0.85)}
        ${cote('M', 'N', 'MN', 0.5)}
        ${cote('B', 'C', 'BC', 0.5)}
    </svg>`;
}

// --- Les quatre marches ---------------------------------------------------------

function etapeConfiguration(rng, config) {
    const f = creerThales({ config, rng });
    if (!f) return null;
    const c = CONFIGURATIONS[config];
    const autre = CONFIGURATIONS[config === 'emboites' ? 'papillon' : 'emboites'];
    return {
        f,
        prompt: 'Quelle est la configuration de cette figure ?',
        html: `<div class="game-question">Quelle est la <b>configuration</b> de cette figure ?</div>
            <div class="figure-wrap">${figureThalesSvg(f)}</div>`,
        papier: 'Quelle est la configuration de cette figure : triangles emboîtés, '
            + 'ou papillon ?',
        answer: c.label,
        choices: [
            { value: c.label, correct: true },
            { value: autre.label, why: `Non : ${c.aide}` },
            { value: 'Aucune des deux : Thalès ne s\'applique pas',
                why: 'Si, il s\'applique : deux droites sécantes en A, coupées par deux '
                    + 'parallèles, c\'est exactement le cas de Thalès.' }
        ],
        nbChoix: 3,
        explanation: `${c.label} — ${c.aide} Dans les deux cas, le théorème s'écrit `
            + `pareil : ${egaliteThales()}.`,
        hints: ['Regarde où se trouve le point A par rapport aux deux droites parallèles.',
            'S\'il est en dehors des deux, les triangles sont emboîtés ; s\'il est entre '
                + 'les deux, c\'est un papillon.'],
        difficulty: 1
    };
}

function etapeEgalite(rng, config) {
    const f = creerThales({ config, rng });
    if (!f) return null;
    const fausses = rng.shuffle(FAUSSES_EGALITES.slice()).slice(0, 3);
    return {
        f,
        prompt: 'Quelle égalité donne le théorème de Thalès sur cette figure ?',
        html: '<div class="game-question">Quelle égalité donne le théorème de <b>Thalès</b> '
            + 'ici ?</div>'
            + `<div class="figure-wrap">${figureThalesSvg(f)}</div>`,
        papier: 'Les droites (MN) et (BC) sont parallèles. Écris l\'égalité des trois '
            + 'rapports donnée par le théorème de Thalès.',
        answer: egaliteThales(),
        choices: [{ value: egaliteThales(), correct: true }]
            .concat(fausses.map(x => ({ value: x.texte, why: x.pourquoi }))),
        explanation: `${egaliteThales()}. Chaque petit segment se compare au segment ENTIER `
            + 'qui le contient — AM avec AB, pas avec MB — et les trois rapports vont tous '
            + 'dans le même sens.',
        hints: ['Chaque rapport compare un petit segment au GRAND segment qui le contient.',
            'AM va avec AB (et non avec MB), AN va avec AC, MN va avec BC.'],
        difficulty: 3
    };
}

function etapeCalculer(rng, config) {
    const f = creerThales({ config, rng });
    if (!f) return null;
    // On cherche une longueur du petit triangle : c'est le sens direct, celui
    // qu'on rencontre d'abord.
    const cherche = rng.pick(['AN', 'MN', 'AM']);
    const calc = calculThales(f, cherche);
    const cotes = calc.donnees;
    const L = longueurTexte;
    const donnees = cotes.map(n => `${n} = ${L(f[n])} cm`).join(', ');
    return {
        f,
        prompt: `(MN) et (BC) sont parallèles. ${donnees}. Calcule ${cherche}, en cm.`,
        html: `<div class="game-question">(MN) // (BC). Calcule <b>${cherche}</b> (en cm).</div>`
            + `<div class="figure-wrap">${figureThalesSvg(f, cotes)}</div>`,
        papier: `Les droites (MN) et (BC) sont parallèles, ${donnees}. Calcule ${cherche}, en cm.`,
        answer: calc.valeur,
        numerique: true,
        explanation: calc.lignes.join(' '),
        hints: ['Commence par écrire l\'égalité de Thalès : ' + egaliteThales() + '.',
            `Garde les deux rapports qui contiennent ${cherche} et une longueur connue, `
                + 'puis fais le produit en croix.'],
        cotes,
        difficulty: 3
    };
}

function etapeReciproque(rng, config) {
    const f = creerThales({ config, rng });
    if (!f) return null;
    // UNE FOIS SUR DEUX C'EST FAUX, et il faut que ce soit faux de PEU : si le
    // décalage saute aux yeux, l'élève répond sans calculer et n'apprend rien.
    const paralleles = rng.bool(0.5);
    const g = { ...f };
    if (!paralleles) {
        const ecart = rng.pick([1, -1, 2, -2]);
        g.AN = Math.max(1, Math.round((f.AN + ecart) * 10) / 10);
        if (sontParalleles(g)) g.AN = Math.round((g.AN + 1) * 10) / 10;
    }
    // La figure suit les longueurs DONNÉES, pas le rapport d'origine : sans
    // cela, elle dessinerait (MN) parallèle à (BC) alors que la réponse est
    // « non ».
    g.points = pointsReels(g);
    const vrai = sontParalleles(g);
    const r = rapportsCompares(g);
    const L = longueurTexte;
    const donnees = `AM = ${L(g.AM)} cm, AB = ${L(g.AB)} cm, AN = ${L(g.AN)} cm, `
        + `AC = ${L(g.AC)} cm`;
    return {
        f: g,
        prompt: `${donnees}. Les droites (MN) et (BC) sont-elles parallèles ?`,
        html: `<div class="game-question">${donnees}.<br>`
            + 'Les droites (MN) et (BC) sont-elles <b>parallèles</b> ?</div>'
            + `<div class="figure-wrap">${figureThalesSvg(g)}</div>`,
        papier: `${donnees}. Les droites (MN) et (BC) sont-elles parallèles ? Justifie.`,
        answer: vrai ? 'Oui, elles sont parallèles' : 'Non, elles ne sont pas parallèles',
        choices: [
            { value: vrai ? 'Oui, elles sont parallèles' : 'Non, elles ne sont pas parallèles',
                correct: true },
            { value: vrai ? 'Non, elles ne sont pas parallèles' : 'Oui, elles sont parallèles',
                why: vrai
                    ? `Refais le calcul : ${r.premier} et ${r.second} sont bien la même fraction.`
                    : `Les deux rapports valent ${r.premier} et ${r.second} : ce n'est pas `
                        + 'la même fraction, donc les droites ne sont pas parallèles.' },
            { value: 'On ne peut pas savoir',
                why: 'Si : la réciproque de Thalès tranche. Il suffit de comparer AM/AB et '
                    + 'AN/AC — s\'ils sont égaux, c\'est parallèle.' }
        ],
        nbChoix: 3,
        explanation: `AM/AB = ${r.premier} et AN/AC = ${r.second}. `
            + (vrai
                ? 'Les deux rapports sont ÉGAUX, et les points sont dans le même ordre : '
                    + 'd\'après la réciproque du théorème de Thalès, (MN) et (BC) sont parallèles.'
                : 'Les deux rapports sont DIFFÉRENTS, donc (MN) et (BC) ne sont pas '
                    + 'parallèles. Attention : compare des fractions, pas des valeurs '
                    + 'arrondies — 1/3 n\'est pas 0,33.'),
        hints: ['Calcule les deux rapports AM/AB et AN/AC.',
            'Compare-les en FRACTIONS (produit en croix), pas en valeurs approchées.'],
        cotes: [],
        difficulty: 4
    };
}

const MARCHES = {
    configuration: etapeConfiguration,
    egalite: etapeEgalite,
    calculer: etapeCalculer,
    reciproque: etapeReciproque
};

/** La marche à travailler pour la question numéro `index`. */
export function marcheThales(etape, index) {
    if (etape && etape !== 'progressif' && MARCHES[etape]) return etape;
    const rang = Math.floor((index || 0) / PAR_MARCHE);
    // Arrivé en haut on recommence en bas : sur une fiche de vingt questions,
    // plafonner donnerait onze fois la même.
    return ORDRE_THALES[rang % ORDRE_THALES.length];
}

export const thalesGenerator = {
    id: 'geo.thales',
    label: 'Le théorème de Thalès',
    skills: ['geo.thales'],
    // Trois marches sur quatre sont des propositions, la troisième est un
    // nombre : l'item déclare donc ce qu'il est, question par question.
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        {
            id: 'etape', type: 'select', label: 'Marche à travailler', default: 'progressif',
            aide: '« Tout en ordre » monte d\'une marche toutes les trois questions : '
                + 'reconnaître la configuration, écrire l\'égalité, calculer, puis la '
                + 'réciproque. On ne commence pas par le calcul, et c\'est voulu : la faute '
                + 'ordinaire est d\'écrire AM/MB au lieu de AM/AB, et le calcul qui suit '
                + 'tombe alors parfaitement juste sur une égalité fausse.',
            options: [{ value: 'progressif', label: 'Tout en ordre, du plus simple au plus dur' }]
                .concat(ORDRE_THALES.map(e => ({ value: e, label: ETAPES_THALES[e].label })))
        },
        {
            id: 'config', type: 'select', label: 'Configuration', default: 'melange',
            aide: 'Le papillon est le même théorème avec le point A entre les deux '
                + 'parallèles. Le travailler à part aide ceux qui ne le reconnaissent pas.',
            options: [
                { value: 'melange', label: 'Les deux, mélangées' },
                { value: 'emboites', label: 'Triangles emboîtés seulement' },
                { value: 'papillon', label: 'Papillon seulement' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const marche = marcheThales(p.etape, ctx.index);
        // « Mélange » tire à chaque question ; un réglage explicite s'impose,
        // ce qui permet de ne travailler que le papillon — celui que les élèves
        // ne reconnaissent pas.
        const config = CONFIGURATIONS[p.config] ? p.config
            : rng.pick(['emboites', 'papillon']);
        let q = null;
        // La figure peut être impossible (inégalité triangulaire) : on retire.
        for (let essai = 0; essai < 30 && !q; essai++) q = MARCHES[marche](rng, config);
        if (!q) return null;
        const numerique = !!q.numerique;
        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.thales',
            skillId: 'geo.thales',
            answerKind: numerique ? 'numeric' : 'choice',
            prompt: { text: q.prompt, html: q.html, papier: q.papier || q.prompt },
            answer: q.answer,
            choices: numerique ? null
                : finalizeChoices(rng, q.choices, { count: q.nbChoix || 4 }),
            hints: q.hints,
            explanation: q.explanation,
            difficulty: q.difficulty,
            meta: {
                etape: marche, rang: ETAPES_THALES[marche].rang,
                config: q.f.config,
                // La fiche redessine la figure : il lui faut les points et les
                // longueurs, pas le SVG de l'écran.
                points: q.f.points,
                longueurs: ['AB', 'AC', 'BC', 'AM', 'AN', 'MN']
                    .reduce((o, n) => ({ ...o, [n]: q.f[n] }), {}),
                cotes: q.cotes || []
            }
        });
    }
};
