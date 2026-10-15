// LIRE LA FRACTION D'UNE FIGURE — le tout premier geste du chapitre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on a même pas fait d'exercice de fraction où il faut écrire la
// fraction en fonction d'un camembert, pavage et avec la difficulté que
// parfois les parts ne sont pas identiques et que du coup, on sépare
// mentalement et en indice on peut voir la découpe ».
//
// IL AVAIT RAISON, ET C'ÉTAIT LE TROU LE PLUS SURPRENANT DU CHAPITRE. Audité
// avant d'écrire : VINGT-HUIT exercices de fractions au catalogue — comparer,
// additionner, multiplier, simplifier, poser, douze cartes de calcul — et PAS
// UN SEUL ne demandait de lire une figure pour en écrire la fraction. « La
// Pizzeria des Fractions » fait l'inverse : on lui donne 3/4, l'élève colorie.
//
// Or c'est le geste qui fonde tout le reste : le dénominateur dit EN COMBIEN
// DE PARTS ÉGALES le tout est coupé, le numérateur COMBIEN ON EN PREND.
//
// ── LA DIFFICULTÉ QU'IL DEMANDE EST LA BONNE ──────────────────────────────
//
// « parfois les parts ne sont pas identiques et du coup on sépare
// mentalement ». Une figure aux morceaux inégaux NE SE COMPTE PAS : il faut
// voir que le grand morceau en vaut deux petits, donc tout ramener au plus
// petit. Un élève qui compte « 1 morceau sur 3 » sans regarder leur taille
// écrit une fraction fausse — et c'est exactement l'erreur que cet exercice
// existe pour attraper.
//
// « en indice on peut voir la découpe » : le second indice ne DIT pas la
// réponse, il REDÉCOUPE la figure. Les traits qui manquaient apparaissent, et
// l'élève compte alors des parts vraiment égales.
//
// ── UNE DÉCISION QUI SE VOIT DANS TOUT LE FICHIER ─────────────────────────
//
// LA FRACTION EST TOUJOURS IRRÉDUCTIBLE. Si la figure montrait 6 parts dont 3
// coloriées, « 1/2 » serait une réponse JUSTE que la grille compterait fausse
// — et la comparaison des réponses ne sait pas accepter deux écritures. On
// choisit donc toujours un numérateur premier avec le dénominateur : une
// seule écriture possible, et l'on ne punit personne pour avoir simplifié.
// La simplification a son propre exercice, et sa propre compétence.
//
// Tout ce fichier est pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'num.frac.sens';

/** Le plus grand commun diviseur — pour garantir l'irréductibilité. */
export function pgcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) { const t = y; y = x % y; x = t; }
    return x;
}

/** Les numérateurs premiers avec `n`, strictement entre 0 et n. */
export const numerateursPossibles = (n) =>
    Array.from({ length: n - 1 }, (_, i) => i + 1).filter(k => pgcd(k, n) === 1);

// ── LE DÉCOUPAGE ───────────────────────────────────────────────────────────
//
// UNE FIGURE EST UNE SUITE DE MORCEAUX, chacun pesant un certain nombre
// d'unités fines. Parts égales : que des morceaux de 1. Parts inégales :
// quelques morceaux de 2 ou de 3, et c'est là que l'élève doit redécouper.
//
// LE TOTAL NE CHANGE JAMAIS : c'est le dénominateur, et c'est lui qu'on
// cherche. Ce qui change, c'est le nombre de morceaux VISIBLES — et toute la
// difficulté tient dans l'écart entre les deux.

/**
 * Des morceaux qui totalisent `n` unités, dont `k` sont coloriées.
 *
 * @param {boolean} inegal  mêler des morceaux de plusieurs tailles
 * @param {number} largeurLigne  la largeur d'une ligne, pour un PAVAGE ; 0
 *   pour un camembert, qui n'a pas de ligne.
 * @returns {{poids:number, plein:boolean}[]}
 */
export function decouper(n, k, rng, inegal, largeurLigne = 0) {
    // ── LE CAMEMBERT : une suite libre ─────────────────────────────────
    //
    // LES MORCEAUX COLORIÉS D'ABORD, LES AUTRES ENSUITE, puis on mélange :
    // c'est la seule façon d'être sûr que la somme des pleins fasse
    // exactement k. Tirer morceau par morceau en décidant de sa couleur au
    // vol laisse toujours un reste qu'il faut rattraper d'un bricolage.
    if (!largeurLigne) {
        return rng.shuffle([
            ...tailles(k, rng, inegal).map(poids => ({ poids, plein: true })),
            ...tailles(n - k, rng, inegal).map(poids => ({ poids, plein: false }))
        ]);
    }

    // ── LE PAVAGE : CHAQUE LIGNE SE REMPLIT EXACTEMENT ─────────────────
    //
    // VU SUR LA PLANCHE, ET C'EST UN DÉFAUT DE MATHÉMATIQUES, PAS DE DESSIN.
    // La version d'avant posait les morceaux à la file et passait à la ligne
    // quand le suivant ne tenait plus : le pavage sortait AVEC DES TROUS et
    // des bords en escalier. Or la figure DOIT valoir un — c'est le tout dont
    // on prend une fraction. Troué, l'élève ne sait plus de quoi il parle, et
    // la question n'a plus de réponse.
    //
    // On découpe donc ligne par ligne, chacune remplie au trait près, puis on
    // choisit parmi ces morceaux-là ceux qu'on colorie.
    for (let essai = 0; essai < 60; essai++) {
        const poids = [];
        for (let l = 0; l < n / largeurLigne; l++) poids.push(...tailles(largeurLigne, rng, inegal));
        const pleins = choisirPleins(poids, k, rng);
        if (pleins) return poids.map((p, i) => ({ poids: p, plein: pleins.has(i) }));
    }
    // Faute de mieux après soixante essais : des parts toutes égales, qui
    // remplissent toujours. Une figure juste et moins intéressante vaut mieux
    // qu'une figure trouée.
    return Array.from({ length: n }, (_, i) => ({ poids: 1, plein: i < k }));
}

/**
 * QUELS MORCEAUX COLORIER pour que le total fasse exactement `k`.
 *
 * Un sac-à-dos minuscule — une dizaine de morceaux de 1 à 3 — qu'on résout en
 * remontant : on essaie de prendre le morceau courant, sinon on le laisse.
 * Les indices sont visités dans un ordre mélangé, sans quoi ce serait
 * toujours les premiers morceaux de la figure qui seraient coloriés.
 */
export function choisirPleins(poids, k, rng) {
    const ordre = rng.shuffle(poids.map((_, i) => i));
    const pris = new Set();
    const chercher = (rang, reste) => {
        if (reste === 0) return true;
        if (rang >= ordre.length || reste < 0) return false;
        const i = ordre[rang];
        if (poids[i] <= reste) {
            pris.add(i);
            if (chercher(rang + 1, reste - poids[i])) return true;
            pris.delete(i);
        }
        return chercher(rang + 1, reste);
    };
    return chercher(0, k) ? pris : null;
}

/** Découpe `total` unités en morceaux de 1, ou de 1 à 3 si l'on veut inégal. */
function tailles(total, rng, inegal) {
    if (!inegal) return Array.from({ length: total }, () => 1);
    const out = [];
    let reste = total;
    while (reste > 0) {
        // JAMAIS PLUS DU TIERS DU TOUT EN UN SEUL MORCEAU : au-delà, la figure
        // n'a plus assez de traits pour qu'on devine l'unité, et l'exercice
        // devient une devinette. Mesuré en regardant les dessins.
        const max = Math.min(3, reste);
        const poids = reste <= 1 ? 1 : rng.int(1, max);
        out.push(poids);
        reste -= poids;
    }
    return out;
}

// ── LES DEUX DESSINS ───────────────────────────────────────────────────────

const PLEIN = 'var(--primary)';
const VIDE = 'var(--bg-panel)';
const TRAIT = 'currentColor';

/**
 * LE CAMEMBERT — un disque coupé en secteurs.
 *
 * @param {{poids:number, plein:boolean}[]} morceaux
 * @param {number} n  le total en unités fines
 * @param {boolean} finesse  tracer AUSSI les coupes qui manquent (l'indice)
 */
export function camembertSvg(morceaux, n, finesse = false) {
    const R = 76;
    const cx = 84;
    const cy = 84;
    const point = (u) => {
        // L'ANGLE PART DU HAUT ET TOURNE DANS LE SENS DES AIGUILLES : c'est
        // ainsi qu'on coupe un gâteau, et c'est ainsi que l'élève lit.
        const a = (u / n) * Math.PI * 2 - Math.PI / 2;
        return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    };
    let u = 0;
    let dessin = '';
    for (const m of morceaux) {
        const [x1, y1] = point(u);
        const [x2, y2] = point(u + m.poids);
        const grand = m.poids / n > 0.5 ? 1 : 0;
        dessin += `<path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} `
            + `A ${R} ${R} 0 ${grand} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" `
            + `fill="${m.plein ? PLEIN : VIDE}" stroke="${TRAIT}" stroke-width="2"/>`;
        u += m.poids;
    }
    // LES COUPES QUI MANQUENT, en pointillés : c'est tout l'indice. On ne les
    // trace QUE là où il n'y a pas déjà un trait, sinon le dessin se double.
    if (finesse) {
        const bords = new Set();
        let v = 0;
        for (const m of morceaux) { bords.add(v); v += m.poids; }
        for (let i = 0; i < n; i++) {
            if (bords.has(i)) continue;
            const [x, y] = point(i);
            dessin += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" `
                + `stroke="${TRAIT}" stroke-width="1.6" stroke-dasharray="5 4" opacity=".75"/>`;
        }
    }
    return `<svg class="lf-figure" viewBox="0 0 168 168" width="100%" `
        + `style="max-width:220px" role="img" aria-label="${direLaFigure(morceaux, n)}">`
        + dessin + '</svg>';
}

/**
 * LE PAVAGE — un rectangle quadrillé.
 *
 * LES MORCEAUX SE POSENT DE GAUCHE À DROITE, LIGNE PAR LIGNE, et un morceau ne
 * se coupe jamais entre deux lignes : un morceau en deux bouts ne se compte
 * plus comme un morceau. Quand il ne tient pas dans la fin de ligne, on passe
 * à la ligne suivante — le trou qui reste est une case vide ordinaire.
 */
export function pavageSvg(morceaux, n, finesse = false) {
    const colonnes = colonnesPour(n);
    const lignes = Math.ceil(n / colonnes);
    const C = 34;
    const L = colonnes * C;
    const H = lignes * C;
    let x = 0;
    let y = 0;
    let dessin = '';
    const poses = [];
    for (const m of morceaux) {
        // LE PASSAGE À LA LIGNE EST UN FILET, PAS UNE MISE EN PAGE : les
        // morceaux arrivent déjà découpés ligne par ligne (`decouper`), donc
        // il ne sert jamais. Il reste pour qu'un appel direct — une épreuve,
        // un essai — ne dessine pas un morceau hors du cadre.
        if (x + m.poids > colonnes) { x = 0; y += 1; }
        poses.push({ ...m, x, y });
        dessin += `<rect x="${x * C}" y="${y * C}" width="${m.poids * C}" height="${C}" `
            + `fill="${m.plein ? PLEIN : VIDE}" stroke="${TRAIT}" stroke-width="2"/>`;
        x += m.poids;
    }
    if (finesse) {
        for (const m of poses) {
            for (let i = 1; i < m.poids; i++) {
                dessin += `<line x1="${(m.x + i) * C}" y1="${m.y * C}" `
                    + `x2="${(m.x + i) * C}" y2="${(m.y + 1) * C}" stroke="${TRAIT}" `
                    + 'stroke-width="1.6" stroke-dasharray="5 4" opacity=".75"/>';
            }
        }
    }
    return `<svg class="lf-figure" viewBox="-1 -1 ${L + 2} ${H + 2}" width="100%" `
        + `style="max-width:${Math.min(300, L * 1.6)}px" role="img" `
        + `aria-label="${direLaFigure(morceaux, n)}">${dessin}</svg>`;
}

/**
 * COMBIEN DE COLONNES POUR N UNITÉS.
 *
 * On cherche le rectangle le plus proche du carré : 12 donne 4 colonnes et 3
 * lignes, pas 12 × 1. Une bande d'une seule ligne se compte sans jamais voir
 * une surface, et c'est une surface qu'un pavage doit faire voir.
 */
export function colonnesPour(n) {
    let best = n;
    for (let c = 2; c <= n; c++) {
        if (n % c) continue;
        const l = n / c;
        // À ÉCART ÉGAL, LA PLUS LARGE : 10 se pave en 5 × 2 et non en 2 × 5.
        // Un rectangle plus haut que large se lit mal sur un téléphone, où
        // c'est la largeur qui est comptée.
        if (Math.abs(c - l) < Math.abs(best - n / best)
            || (Math.abs(c - l) === Math.abs(best - n / best) && c > best)) best = c;
    }
    return best;
}

/** La figure dite à voix haute — pour qui ne la voit pas. */
export function direLaFigure(morceaux, n) {
    const pleins = morceaux.filter(m => m.plein).length;
    return `Une figure en ${morceaux.length} morceaux, dont ${pleins} colorié`
        + `${pleins > 1 ? 's' : ''}, pour un total de ${n} parts égales.`;
}

// ── LES MARCHES ────────────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'camembert-egal', temps: 'A', titre: 'Un camembert, parts égales',
      support: 'camembert', ns: [4, 6, 8] },
    { id: 'pavage-egal', temps: 'A', titre: 'Un pavage, parts égales',
      support: 'pavage', ns: [4, 6, 8, 9] },
    { id: 'melange-egal', temps: 'A', titre: 'Les deux, au hasard',
      support: 'melange', ns: [4, 6, 8, 9, 10, 12] },
    { id: 'camembert-inegal', temps: 'B', titre: 'Un camembert aux parts INÉGALES',
      support: 'camembert', ns: [6, 8, 9, 10], inegal: true },
    { id: 'pavage-inegal', temps: 'B', titre: 'Un pavage aux parts INÉGALES',
      support: 'pavage', ns: [6, 8, 9, 10, 12], inegal: true },
    { id: 'melange-inegal', temps: 'B', titre: 'Les deux, parts inégales',
      support: 'melange', ns: [6, 8, 9, 10, 12], inegal: true }
];

const TEMPS = {
    A: 'A — les parts sont toutes pareilles',
    B: 'B — les parts ne sont pas pareilles'
};

/** La question d'une marche : la figure, et la fraction qu'elle montre. */
export function question(etape, rng) {
    const n = etape.ns[rng.int(0, etape.ns.length - 1)];
    const choix = numerateursPossibles(n);
    const k = choix[rng.int(0, choix.length - 1)];
    const inegal = !!etape.inegal;
    const support = etape.support === 'melange'
        ? (rng.bool() ? 'camembert' : 'pavage') : etape.support;
    // LE PAVAGE A BESOIN DE SA LARGEUR DE LIGNE pour se remplir exactement ;
    // le camembert n'a pas de ligne du tout.
    const largeur = support === 'pavage' ? colonnesPour(n) : 0;
    let morceaux = decouper(n, k, rng, inegal, largeur);
    // UNE FIGURE « INÉGALE » QUI SORT TOUTE ÉGALE N'ENSEIGNE RIEN : le hasard
    // peut rendre n morceaux de 1. On retire jusqu'à ce qu'il y ait vraiment
    // deux tailles — c'est le sujet de la marche, pas un bonus.
    if (inegal) {
        for (let essai = 0; essai < 40 && new Set(morceaux.map(m => m.poids)).size < 2; essai++) {
            morceaux = decouper(n, k, rng, true, largeur);
        }
    }
    const dessiner = (fin) => (support === 'camembert'
        ? camembertSvg(morceaux, n, fin) : pavageSvg(morceaux, n, fin));
    return {
        n, k, morceaux, support, inegal,
        figure: dessiner(false),
        decoupe: dessiner(true),
        visibles: morceaux.length
    };
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));

/** Le trou où l'élève écrit, numéroté comme le pavé les attend. */
const trou = (i) => `<u class="np-trou" data-trou="${i}">&nbsp;?&nbsp;</u>`;

export const lireUneFractionGenerator = {
    id: 'frac.lire',
    label: 'Lire la fraction d\'une figure',
    skills: [SKILL],
    answerKinds: ['text'],
    // LA FEUILLE PORTE LA FIGURE AUTANT QUE L'ÉCRAN — mais elle demande un
    // générateur de fiche à elle, qui sait dessiner en PDF. Tant qu'il
    // n'existe pas, l'exercice reste un exercice d'écran : une consigne qui
    // renvoie à une figure absente ne demande rien.
    ecrit: false,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);

        return makeItem({
            seed: rng.seed,
            generatorId: 'frac.lire',
            skillId: SKILL,
            // DEUX TROUS, DONC UNE PAIRE RANGÉE : le numérateur PUIS le
            // dénominateur. C'est le même mécanisme que « Image et
            // Antécédent », et il est bien à sa place ici — une fraction
            // n'est pas un nombre à taper, c'est deux nombres l'un sur
            // l'autre.
            answerKind: 'text',
            prompt: {
                text: `Quelle fraction de la figure est coloriée ? (${q.k} sur ${q.n})`,
                html: '<div class="game-question">'
                    + `<div class="lf-scene">${q.figure}</div>`
                    + '<span class="lit-consigne">Quelle fraction est coloriée ?</span>'
                    + `<span class="fraction fraction--grande"><span class="fraction-num">${trou(0)}</span>`
                    + `<span class="fraction-den">${trou(1)}</span></span></div>`
            },
            answer: `${q.k}|${q.n}`,
            // LE PIÈGE QUI A UN NOM : compter les MORCEAUX au lieu des PARTS.
            // Sur une figure inégale, c'est l'erreur de presque tout le monde
            // la première fois — et lui dire « faux » sans la nommer ne lui
            // apprend rien.
            diagnostics: q.inegal && q.visibles !== q.n ? [{
                value: `${q.morceaux.filter(m => m.plein).length}|${q.visibles}`,
                why: `Tu as compté les MORCEAUX : il y en a ${q.visibles}. Mais ils ne sont `
                    + 'pas de la même taille, et une fraction compte des parts ÉGALES. '
                    + `Le plus petit morceau tient ${q.n} fois dans la figure.`
            }] : null,
            hints: [
                // LE PREMIER INDICE DIT LA RÈGLE, PAS LA FIGURE.
                q.inegal
                    ? 'Les morceaux ne sont pas tous de la même taille : compte en parts ÉGALES, '
                        + 'celles du plus petit.'
                    : 'Le chiffre du BAS dit en combien de parts égales la figure est coupée ; '
                        + 'celui du HAUT, combien sont coloriées.',
                // ET LE SECOND REDÉCOUPE — c'est ce que Rémy demandait : « en
                // indice on peut voir la découpe ».
                //
                // MAIS SEULEMENT LÀ OÙ IL Y A QUELQUE CHOSE À REDÉCOUPER. Vu
                // sur la planche : aux parts égales, le second indice
                // remontrait la MÊME figure en annonçant « voilà toutes ses
                // coupes ». Un indice qui ne montre rien de neuf en promettant
                // le contraire est pire que pas d'indice : l'élève le lit, ne
                // voit pas la différence, et conclut qu'il n'a pas compris.
                q.inegal
                    ? 'Voilà la figure avec toutes ses coupes. Compte maintenant.'
                    : `Compte D'ABORD toutes les parts : ce nombre va EN BAS. `
                        + 'Puis compte celles qui sont coloriées : il va en haut.'
            ],
            schemas: ['', q.inegal ? q.decoupe : ''],
            explanation: `La figure vaut ${q.n} parts égales, et ${q.k} ${q.k > 1 ? 'sont' : 'est'} `
                + `coloriée${q.k > 1 ? 's' : ''} : c'est ${q.k}/${q.n}.`,
            difficulty: etape.temps === 'A' ? 1 : 3,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                n: q.n, k: q.k, support: q.support, visibles: q.visibles, inegal: q.inegal,
                // DEUX TROUS : c'est `meta` que le pavé lit, comme pour
                // « Image et Antécédent ».
                trous: 2
            }
        });
    }
};

export default lireUneFractionGenerator;
