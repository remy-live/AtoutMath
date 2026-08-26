// THALÈS — trois marches, et la deuxième seulement est un calcul.
//
// Rémy : « Un exercice sur le théorème de Thalès. »
//
// ON NE COMMENCE PAS PAR CALCULER, ET C'EST TOUT LE PROPOS. La faute ordinaire
// n'est pas une erreur de calcul : c'est d'écrire AM/MB au lieu de AM/AB — le
// petit morceau sur le RESTE au lieu du TOUT. Le calcul qui suit tombe alors
// parfaitement juste sur une égalité fausse, et rien ne prévient l'élève. On
// fait donc CHOISIR l'égalité avant de laisser calculer quoi que ce soit.
//
// IL Y AVAIT UNE MARCHE DE PLUS, ET ELLE NE SERVAIT À RIEN. Rémy : « On se
// fiche si c'est en papillon ou en triangle imbriqué. Ne mets pas cette
// partie. » Il a raison, et le module de calcul le disait déjà sans qu'on
// l'écoute : un seul signe sépare les deux configurations, et le théorème
// s'écrit pareil dans les deux. Nommer la figure ne fait pas partie de ce
// qu'on apprend ; la reconnaître, oui — et c'est ce que fait la marche
// suivante, qui demande l'égalité SUR la figure qu'on a sous les yeux.
// La figure, elle, continue de prendre les deux formes : c'est le réglage
// « Configuration ».
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
    sontParalleles, rapportsCompares, calculThales, pointsReels,
    placeNoms, ancrageNom, ECART_NOM
} from '../thales.js';

/** Les trois marches, dans l'ordre où on les gravit. */
export const ETAPES_THALES = {
    egalite: { id: 'egalite', rang: 1, label: '1 · Écrire la bonne égalité' },
    calculer: { id: 'calculer', rang: 2, label: '2 · Calculer une longueur' },
    reciproque: { id: 'reciproque', rang: 3, label: '3 · La réciproque : est-ce parallèle ?' }
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
    const TAILLE_NOM = 7, TAILLE_COTE = 6;
    const dirs = placeNoms(P);
    const SEGMENTS = [['A', 'B'], ['A', 'C'], ['A', 'M'], ['A', 'N'], ['B', 'C'], ['M', 'N']];

    /** Distance d'un point à un segment — la vraie, pas celle à la droite. */
    const distSegment = (c, p, q) => {
        const dx = q.x - p.x, dy = q.y - p.y;
        const l2 = dx * dx + dy * dy;
        const t = l2 ? Math.max(0, Math.min(1, ((c.x - p.x) * dx + (c.y - p.y) * dy) / l2)) : 0;
        return Math.hypot(c.x - (p.x + t * dx), c.y - (p.y + t * dy));
    };

    // UNE ÉTIQUETTE EST UNE BOÎTE, PAS UN POINT. « AB = 20 » fait vingt unités
    // de large : c'est son BOUT qui touche le trait, jamais son centre, et
    // c'est exactement l'erreur qui laissait les cotes barrées d'un trait
    // malgré un décalage. On la mesure donc par sa boîte, ancrage compris —
    // une étiquette ancrée à droite s'étend vers la GAUCHE de son point.
    const ancre = (a) => a.h > 0 ? 'start' : a.h < 0 ? 'end' : 'middle';
    const ligneBase = (a, taille) => (a.v > 0 ? 0.82 : a.v < 0 ? -0.10 : 0.34) * taille;
    // LA BOÎTE EST CELLE DE L'ENCRE, pas celle du point d'ancrage. Un texte
    // SVG se pose par le PIED de ses lettres : mesurer la boîte avant ce
    // décalage revenait à mesurer un rectangle situé jusqu'à cinq unités plus
    // haut que le texte réel — donc à déclarer dégagé ce qui ne l'était pas.
    const boite = (x, y, texte, taille, anc) => {
        const base = y + ligneBase(anc, taille);
        const large = texte.length * taille * 0.56;
        const gauche = anc.h > 0 ? x : anc.h < 0 ? x - large : x - large / 2;
        return {
            x0: gauche, x1: gauche + large,
            y0: base - taille * 0.72, y1: base + taille * 0.2
        };
    };
    const echantillons = (b) => {
        const pts = [];
        for (let i = 0; i <= 4; i++) {
            for (let j = 0; j <= 2; j++) {
                pts.push({ x: b.x0 + (b.x1 - b.x0) * i / 4, y: b.y0 + (b.y1 - b.y0) * j / 2 });
            }
        }
        return pts;
    };
    /** Ce qui reste de libre autour d'une boîte : traits et étiquettes déjà posées. */
    const degagement = (b, saufSegment, posees) => {
        let libre = Infinity;
        const pts = echantillons(b);
        for (const [u, v] of SEGMENTS) {
            if (saufSegment && ((u === saufSegment[0] && v === saufSegment[1])
                || (u === saufSegment[1] && v === saufSegment[0]))) continue;
            pts.forEach(c => { libre = Math.min(libre, distSegment(c, P[u], P[v])); });
        }
        posees.forEach(a => {
            // Distance entre deux boîtes : nulle si elles se chevauchent.
            const dx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0);
            const dy = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);
            libre = Math.min(libre, Math.hypot(dx, dy));
        });
        return libre;
    };
    // LES LETTRES D'ABORD : elles sont fixées par la géométrie du point (voir
    // `placeNoms`), les cotes s'arrangeront autour d'elles.
    const posees = [];
    const textes = [];
    for (const nom of ['A', 'B', 'C', 'M', 'N']) {
        const d = dirs[nom], a = ancrageNom(d);
        const x = P[nom].x + d.x * ECART_NOM;
        const y = P[nom].y + d.y * ECART_NOM;
        const b = boite(x, y, nom, TAILLE_NOM, a);
        posees.push(b);
        textes.push({ b, html: `<text x="${x.toFixed(1)}" y="${(y + ligneBase(a, TAILLE_NOM)).toFixed(1)}"
            text-anchor="${ancre(a)}" class="th-nom">${nom}</text>` });
    }

    // OÙ POSER UNE COTE : LÀ OÙ IL N'Y A RIEN.
    //
    // Rémy : « Les lettres se supperpose aux trait. » Les cotes avaient le
    // même défaut, en pire, et pour deux raisons :
    //
    //  · ON LES ÉCARTAIT DU CENTRE DE ABC. Dans un papillon, M et N sont de
    //    l'AUTRE côté de A : ce centre-là tombe sous le point A, et la cote de
    //    (MN) — qui est au-dessus — se faisait repousser vers l'intérieur.
    //  · ON LES POSAIT PAR LEUR BORD GAUCHE, sans ancrage : les écarter vers
    //    la gauche déplaçait ce bord pendant que le texte, lui, repartait vers
    //    la droite par-dessus le trait qu'on venait de fuir.
    //
    // Le remède n'est pas un troisième décalage écrit à la main mais un
    // CRITÈRE : on propose trente emplacements — cinq positions le long du
    // segment, deux côtés, trois distances —, on mesure le dégagement de
    // chacun, et on garde le meilleur. À dégagement égal on préfère le plus
    // proche du segment, sans quoi la cote partirait au large et l'on ne
    // saurait plus ce qu'elle mesure.
    const D_COTE = 6;
    // UNE COTE SE MET DEHORS. C'est la convention de tous les plans et de tous
    // les manuels, et elle a une raison : à l'intérieur, l'étiquette se
    // retrouve entre DEUX traits et l'on ne sait plus lequel elle mesure —
    // « AN = 19 » posé sous (MN) se lit comme la longueur de MN. Le critère de
    // dégagement seul ne voyait pas la différence : les deux côtés du segment
    // sont également libres, il en prenait un au hasard.
    const centre = {
        x: Object.values(P).reduce((t, p) => t + p.x, 0) / 5,
        y: Object.values(P).reduce((t, p) => t + p.y, 0) / 5
    };
    for (const [a, b, nom] of SEGMENTS) {
        if (!cotes.includes(nom) && !cotes.includes(a + b)) continue;
        const cle = cotes.includes(nom) ? nom : a + b;
        const p = P[a], q = P[b];
        const dx = q.x - p.x, dy = q.y - p.y;
        const n = Math.hypot(dx, dy) || 1;
        // UN SEGMENT TROP COURT NE PORTE PAS SA COTE : l'étiquette se poserait
        // sur la lettre du point.
        if (n < 14) continue;
        const texte = `${cle} = ${longueurTexte(f[cle])}`;
        let mieux = null;
        for (const t of [0.28, 0.42, 0.56, 0.7, 0.84]) {
            for (const sens of [1, -1]) {
                for (const ecart of [D_COTE, D_COTE + 4, D_COTE + 8, D_COTE + 13, D_COTE + 19]) {
                    const ux = -dy / n * sens, uy = dx / n * sens;
                    const x = p.x + dx * t + ux * ecart, y = p.y + dy * t + uy * ecart;
                    const anc = ancrageNom({ x: ux, y: uy });
                    const bt = boite(x, y, texte, TAILLE_COTE, anc);
                    const libre = degagement(bt, [a, b], posees);
                    // AU-DELÀ DE HUIT, ÊTRE PLUS DÉGAGÉ NE SERT PLUS À RIEN —
                    // mais être plus loin, si : une cote posée au large est
                    // techniquement libre et pratiquement muette, on ne sait
                    // plus quel segment elle mesure. On plafonne donc le
                    // bénéfice du dégagement, et l'éloignement se paie plein
                    // tarif : la cote se colle au segment dès qu'elle le peut.
                    // Combien l'écart a poussé l'étiquette VERS L'EXTÉRIEUR,
                    // compté le long du rayon qui va du centre de la figure au
                    // milieu du segment.
                    const mx = p.x + dx * t, my = p.y + dy * t;
                    const rx = mx - centre.x, ry = my - centre.y;
                    const r = Math.hypot(rx, ry) || 1;
                    const dehors = ((x - mx) * rx + (y - my) * ry) / r;
                    // NE PAS TOUCHER LE TRAIT PASSE AVANT TOUT LE RESTE.
                    // Sans ce plancher, la préférence pour l'extérieur pouvait
                    // acheter une place collée à un trait : deux points de
                    // bonus contre un demi-point de dégagement perdu, le
                    // compte était vite fait — et c'était le défaut d'origine
                    // qui revenait par la porte de derrière.
                    const trop = libre < 3 ? (3 - libre) * 6 : 0;
                    const score = Math.min(libre, 8) - trop - ecart * 0.35
                        + Math.max(-1, Math.min(1, dehors / 4)) * 2;
                    if (!mieux || score > mieux.score) mieux = { score, x, y, anc, bt };
                }
            }
        }
        posees.push(mieux.bt);
        textes.push({
            b: mieux.bt,
            html: `<text x="${mieux.x.toFixed(1)}" y="${(mieux.y + ligneBase(mieux.anc, TAILLE_COTE)).toFixed(1)}"
                text-anchor="${ancre(mieux.anc)}" class="th-cote">${texte}</text>`
        });
    }

    // LA BOÎTE ÉPOUSE TOUT CE QU'ON A DESSINÉ, figure ET étiquettes. Un carré
    // fixe laissait tantôt la moitié d'un papillon dehors, tantôt un tiers de
    // blanc à droite d'un emboîté ; une boîte calculée sur les seuls points
    // coupait les cotes, qui sortent de la figure.
    const bx = [...Object.values(P).map(p => p.x), ...textes.map(t => t.b.x0),
        ...textes.map(t => t.b.x1)];
    const by = [...Object.values(P).map(p => p.y), ...textes.map(t => t.b.y0),
        ...textes.map(t => t.b.y1)];
    const m = 2;
    const x0 = Math.min(...bx) - m, x1 = Math.max(...bx) + m;
    const y0 = Math.min(...by) - m, y1 = Math.max(...by) + m;

    const trait = (a, b, cls) =>
        `<line x1="${P[a].x}" y1="${P[a].y}" x2="${P[b].x}" y2="${P[b].y}" class="${cls}"/>`;

    return `<svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}"
        class="th-fig fig-svg" role="img"
        aria-label="Figure de Thalès, ${CONFIGURATIONS[f.config].label}">
        <style>
            .th-droite { stroke: #4a5568; stroke-width: .8; fill: none; }
            .th-para { stroke: #2f855a; stroke-width: 1.5; fill: none; }
            .th-base { stroke: #2b6cb0; stroke-width: 1.5; fill: none; }
            .th-nom { font-size: ${TAILLE_NOM}px; font-weight: 800; fill: #1a202c; }
            .th-cote { font-size: ${TAILLE_COTE}px; font-weight: 700; fill: #2c5282; }
        </style>
        ${trait('A', 'B', 'th-droite')}
        ${trait('A', 'C', 'th-droite')}
        ${trait('A', 'M', 'th-droite')}
        ${trait('A', 'N', 'th-droite')}
        ${trait('B', 'C', 'th-base')}
        ${trait('M', 'N', 'th-para')}
        ${textes.map(t => t.html).join('\n        ')}
    </svg>`;
}

// --- LES FRACTIONS S'ÉCRIVENT EN COLONNE ----------------------------------------
//
// Rémy : « Ecris les fraction en colonne. »
//
// « AM/AB », c'est une commodité de clavier, pas une écriture mathématique.
// Or c'est justement l'ÉCRITURE qu'on travaille sur cette marche : l'élève
// doit reconnaître que le petit segment est au NUMÉRATEUR et le grand au
// DÉNOMINATEUR, et la barre oblique ne montre ni l'un ni l'autre — elle les
// met côte à côte. Une barre horizontale les met l'un SUR l'autre, et la
// faute qu'on traque (AM sur MB) devient visible sans lire.
//
// ON TRADUIT LE TEXTE PLUTÔT QUE DE DOUBLER LES DONNÉES. Les quatre fausses
// égalités sont écrites une fois, en texte, avec leur diagnostic ; en écrire
// une seconde version en HTML les aurait fait diverger au premier ajout.
// Cette fonction lit « AM/AB = AN/AC = MN/BC » et le dessine — donc toute
// égalité nouvelle est dessinée sans qu'on y pense.

/** Une fraction à deux étages, comme au tableau. */
const fracHtml = (n, d) => `<span class="fraction"><span class="fraction-num">${n}</span>`
    + `<span class="fraction-den">${d}</span></span>`;

/** « AM/AB = AN/AC = MN/BC » dessiné en trois fractions et deux signes égal. */
export function egaliteEnColonnes(texte) {
    const morceaux = String(texte).split('=').map(x => x.trim());
    return `<span class="th-eg">` + morceaux.map(m => {
        const [n, d] = m.split('/');
        // Un morceau sans barre — une longueur seule — se pose tel quel : la
        // fonction sert aussi aux rapports d'une réciproque.
        return d === undefined ? `<span>${m}</span>` : fracHtml(n.trim(), d.trim());
    }).join('<span class="th-eg-signe">=</span>') + `</span>`;
}

// --- Les trois marches -----------------------------------------------------------

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
        // `value` reste le TEXTE — c'est la clé de la réponse, elle est
        // comparée à `answer` et enregistrée dans le carnet d'erreurs.
        // `label` est ce qu'on montre, `texte` ce que le robot lit à voix
        // haute : trois rôles, trois champs, aucun qui empiète sur l'autre.
        choices: [{
            value: egaliteThales(), label: egaliteEnColonnes(egaliteThales()),
            texte: egaliteThales(), correct: true
        }].concat(fausses.map(x => ({
            value: x.texte, label: egaliteEnColonnes(x.texte), texte: x.texte,
            why: x.pourquoi
        }))),
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
        // LES QUATRE LONGUEURS VONT SUR LA FIGURE, PAS DANS L'ÉNONCÉ. Rémy :
        // « Le texte des boutons est petit. » Elles y étaient pour deux : un
        // énoncé de quatre-vingts caractères prend deux lignes en très gros
        // caractères, pousse la figure vers le bas et écrase tout ce qui
        // suit — c'est ce qui rendait les propositions minuscules. Et c'est
        // par ailleurs la présentation de tous les manuels : une figure de
        // réciproque PORTE ses mesures, sinon on ne sait pas quoi comparer.
        html: '<div class="game-question">Les droites (MN) et (BC) sont-elles '
            + '<b>parallèles</b> ?</div>'
            + `<div class="figure-wrap">${figureThalesSvg(g, ['AM', 'AB', 'AN', 'AC'])}</div>`,
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
        hints: ['Calcule les deux rapports AM/AB et AN/AC, avec les longueurs '
            + 'écrites sur la figure.',
            'Compare-les en FRACTIONS (produit en croix), pas en valeurs approchées.'],
        cotes: [],
        difficulty: 4
    };
}

const MARCHES = {
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
                + 'écrire l\'égalité, calculer une longueur, puis la réciproque. On ne '
                + 'commence pas par le calcul, et c\'est voulu : la faute ordinaire est '
                + 'd\'écrire AM/MB au lieu de AM/AB, et le calcul qui suit tombe alors '
                + 'parfaitement juste sur une égalité fausse.',
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
