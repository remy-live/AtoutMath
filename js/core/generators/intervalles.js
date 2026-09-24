// LES INTERVALLES DE SECONDE — TROIS ÉCRITURES D'UNE MÊME CHOSE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on va faire des exercices de seconde. Premier type : placer des
// nombres dans le bon ensemble de nombres et aussi sur les intervalles, sur un
// axe, avec inégalité, union et intersection, il faut toujours un support
// visuel. » Puis : « il faut faire toutes les possibilités et aussi savoir
// écrire avec les signes inférieurs ou égal et le bon côté du crochet. »
//
// CE QU'ON TRAVAILLE, C'EST UNE TRADUCTION. Un même ensemble de réels s'écrit
// de trois façons — une inégalité, un dessin sur l'axe, un intervalle — et
// l'élève de Seconde doit passer de n'importe laquelle aux deux autres. Le
// manuel le dit en trois colonnes (Inégalité · Représentation · Intervalle) et
// en efface une ; on fait pareil, mais dans LES SIX SENS, parce qu'un élève
// qui sait lire un axe ne sait pas forcément en dessiner un.
//
//      inégalité  →  intervalle        axe  →  intervalle
//      inégalité  →  axe               axe  →  inégalité
//      intervalle →  inégalité         intervalle → axe
//
// LE SUPPORT VISUEL NE DISPARAÎT JAMAIS, et c'est une contrainte de Rémy, pas
// une décoration. Quand la question PART de l'axe, il est dans l'énoncé ; quand
// elle ARRIVE à l'axe, les quatre propositions sont quatre axes dessinés. Il
// n'y a donc aucune question de ce module où l'on ne voit pas de droite
// graduée — y compris sur la fiche papier.
//
// LES LEURRES SONT LES FAUTES RÉELLES, PAS DU BRUIT. Celui qui se trompe ici
// se trompe presque toujours de l'une de ces quatre façons, et chaque
// proposition fausse porte la phrase qui la nomme :
//
//   · LE CROCHET À L'ENVERS      [2 ; 5[  au lieu de  ]2 ; 5]
//   · OUVERT POUR FERMÉ          [2 ; 5]  au lieu de  [2 ; 5[
//   · LE SENS DE L'INÉGALITÉ     x ⩽ 3    au lieu de  x ⩾ 3
//   · L'INFINI FERMÉ             ]−∞ ; 3] écrit [−∞ ; 3]
//
// Le dernier mérite qu'on s'y arrête : l'infini n'est pas un nombre, il n'est
// jamais atteint, donc son crochet est TOUJOURS ouvert. C'est la seule règle
// de ce chapitre qui ne souffre aucune exception, et c'est celle qu'on oublie.

import { makeItem } from '../items.js';
import * as fx from '../maths/formule.js';

// ── L'AXE, DESSINÉ ──────────────────────────────────────────────────────────

const L = 320;        // largeur du dessin, en unités de vue
const H = 54;         // hauteur : la droite, les crochets, les graduations
const Y = 26;         // hauteur de la droite dans le dessin
const MARGE = 18;     // de quoi loger une flèche et une étiquette aux bouts
// LA COULEUR DE L'INTERVALLE. Une variable CSS avec un repli : la couleur de
// l'application suit le thème, et le repli sert au papier et aux captures.
const TEINTE = 'var(--primary, #4f46e5)';
// LA SECONDE COULEUR, pour l'union et l'intersection : deux intervalles sur la
// même droite doivent se distinguer d'un coup d'œil, sans avoir à suivre le
// trait des yeux d'un bout à l'autre.
const TEINTE2 = 'var(--success, #16a34a)';
const DECALAGE = 15;  // l'écart vertical entre deux intervalles superposés

/**
 * LA FENÊTRE DE L'AXE : ce qu'on montre autour de l'intervalle.
 *
 * On ne cadre pas sur l'intervalle lui-même. Un axe qui commencerait à 2 pour
 * un intervalle [2 ; 5] ne montrerait pas que 2 est une BORNE — il faut voir
 * qu'il y a des nombres avant, et que le crochet les exclut. On garde donc au
 * moins deux unités de part et d'autre, et l'on inclut toujours zéro : c'est
 * le repère dont l'élève se sert pour lire, et le manuel le trace toujours.
 */
function fenetre(a, b) {
    const bas = a === null ? (b - 6) : a;
    const haut = b === null ? (a + 6) : b;
    let min = Math.min(0, bas) - 2;
    let max = Math.max(0, haut) + 2;
    // Une fenêtre trop large rend les graduations illisibles ; trop étroite,
    // elle ne montre rien. Huit à seize unités est la plage où l'on lit encore
    // les nombres sous les traits.
    if (max - min < 8) { const q = (8 - (max - min)) / 2; min -= q; max += q; }
    return { min: Math.floor(min), max: Math.ceil(max) };
}

const versX = (v, f) => MARGE + ((v - f.min) / (f.max - f.min)) * (L - 2 * MARGE);

/**
 * LA FENÊTRE COMMUNE À PLUSIEURS INTERVALLES.
 *
 * Deux axes empilés — I au-dessus, J en dessous — ne se lisent que s'ils
 * portent LA MÊME GRADUATION. Chacun cadré sur ses propres bornes, le 0 de
 * l'un ne tomberait pas au-dessus du 0 de l'autre, et l'élève ne pourrait
 * plus voir où les deux se recouvrent — c'est-à-dire exactement ce que
 * l'exercice lui demande de voir.
 *
 * ET LE CAS OÙ IL N'Y A AUCUNE BORNE FINIE : ℝ tout entier, qui est une
 * réponse possible à une union. `Math.min()` d'une liste vide rend +Infinity,
 * la fenêtre devient NaN et le dessin disparaît sans une erreur.
 */
export function fenetreCommune(parts) {
    const b = parts.filter(Boolean).flatMap(p => [p.a, p.b]).filter(v => v !== null);
    if (!b.length) return fenetre(-3, 3);
    return fenetre(Math.min(...b), Math.max(...b));
}

/** Un crochet, tourné du bon côté, et de la couleur de son intervalle. */
function crochet(x, ferme, versLaDroite, teinte = TEINTE) {
    // LE SENS DU CROCHET EST LE SUJET DE L'EXERCICE : il doit être dessiné,
    // pas approché. Le crochet d'une borne INCLUSE s'ouvre vers l'intérieur de
    // l'intervalle ; celui d'une borne exclue lui tourne le dos. Les deux
    // barres horizontales sont donc du côté de l'intervalle pour un crochet
    // fermé, et du côté opposé pour un crochet ouvert.
    // ET IL EST DESSINÉ GROS. MESURÉ à l'écran, deux propositions côte à côte
    // qui ne différaient que par le sens d'un crochet : avec des bras de six
    // pixels sur un axe de 324, on ne les distingue pas — l'exercice devient
    // un jeu de devinette au lieu d'un exercice de lecture. Les bras passent à
    // neuf, le trait à trois, et la barre verticale dépasse la droite de onze
    // pixels de part et d'autre. C'est ce qu'on vient regarder : c'est ce qui
    // doit se voir en premier.
    const sens = versLaDroite ? 1 : -1;
    const d = ferme ? sens * 9 : -sens * 9;
    return `<path d="M ${x} ${Y - 11} L ${x + d} ${Y - 11} M ${x} ${Y - 11} L ${x} ${Y + 11} `
        + `M ${x} ${Y + 11} L ${x + d} ${Y + 11}" fill="none" stroke="${teinte}" `
        + `stroke-width="3" stroke-linecap="round"/>`;
}

/**
 * Le dessin d'un ou plusieurs intervalles sur une même droite graduée.
 *
 * @param {Array<{a:?number,b:?number,ea:boolean,eb:boolean,teinte?:string}>} parts
 *   `a`/`b` : les bornes, `null` pour l'infini. `ea`/`eb` : borne incluse.
 * @param {Object} [opts]
 * @param {string} [opts.titre] ce que le lecteur d'écran doit entendre.
 */
export function axeHtml(parts, opts = {}) {
    const vivants = parts.filter(Boolean);
    const bornes = vivants.flatMap(p => [p.a, p.b]).filter(v => v !== null);
    const f = opts.fenetre || fenetreCommune(vivants);

    const hauteur = H + (vivants.length - 1) * 14;
    let g = '';

    // La droite, ses flèches, ses graduations entières et leurs nombres.
    g += `<path d="M 4 ${Y} L ${L - 4} ${Y}" stroke="currentColor" stroke-width="1.6" fill="none"/>`;
    g += `<path d="M ${L - 4} ${Y} l -7 -4 l 0 8 z" fill="currentColor"/>`;
    for (let v = f.min; v <= f.max; v++) {
        const x = versX(v, f);
        const gros = v === 0 || v === 1;
        g += `<path d="M ${x} ${Y - 5} L ${x} ${Y + 5}" stroke="currentColor" `
            + `stroke-width="${gros ? 1.8 : 1}" fill="none"/>`;
        // ON N'ÉCRIT PAS TOUS LES NOMBRES. Le manuel n'en écrit que deux — 0 et
        // 1 — et laisse les graduations dire le reste ; seize nombres sous une
        // droite de trois cents pixels se chevauchent et ne se lisent plus. On
        // garde 0, 1 et les bornes de l'intervalle, qui sont ce qu'on regarde.
        const estBorne = bornes.includes(v);
        if (gros || estBorne) {
            g += `<text x="${x}" y="${Y + 19}" text-anchor="middle" font-size="11" `
                + `fill="currentColor">${nb(v)}</text>`;
        }
    }

    vivants.forEach((p, i) => {
        const dy = i * DECALAGE;
        const x1 = p.a === null ? 6 : versX(p.a, f);
        const x2 = p.b === null ? L - 6 : versX(p.b, f);
        const teinte = p.teinte || TEINTE;
        g += `<g transform="translate(0 ${-dy})">`;
        // L'INTERVALLE SE DESSINE SUR LA DROITE, ET EN COULEUR.
        //
        // Rémy, capture à l'appui : « pourquoi le trait est au dessus, fais-le
        // d'une autre couleur. » Il a raison sur les deux points, et c'est la
        // même raison : au-dessus et en gris, la bande était un objet À CÔTÉ de
        // la droite, alors qu'elle EST la partie de la droite dont on parle.
        // Le manuel la trace sur la droite elle-même. On la pose donc à la
        // hauteur de l'axe, épaisse, et de la couleur de l'application — les
        // graduations restent noires dessous, ce qui laisse lire les nombres.
        //
        // UN SEUL DÉCALAGE SUBSISTE, quand on dessine DEUX intervalles sur la
        // même droite (l'union, l'intersection) : sans lui, le second couvrirait
        // le premier et l'on ne verrait plus qu'un seul segment.
        g += `<path d="M ${x1} ${Y} L ${x2} ${Y}" stroke="${teinte}" `
            + `stroke-width="5" stroke-linecap="butt" fill="none"/>`;
        if (p.a !== null) g += crochet(x1, p.ea, true, teinte);
        if (p.b !== null) g += crochet(x2, p.eb, false, teinte);
        // Vers l'infini, une flèche plutôt qu'un crochet : c'est ce qui se
        // dessine au tableau, et cela redit que la borne n'est pas atteinte.
        if (p.a === null) g += `<path d="M 4 ${Y} l 10 -5 l 0 10 z" fill="${teinte}"/>`;
        if (p.b === null) g += `<path d="M ${L - 4} ${Y} l -10 -5 l 0 10 z" fill="${teinte}"/>`;
        g += `</g>`;
    });

    // LA LETTRE, DANS LE COIN. Quand on empile deux axes pour demander I ∩ J,
    // il faut pouvoir dire LEQUEL est lequel autrement que par la couleur :
    // un élève daltonien lit la lettre, et l'énoncé écrit « I = … » juste à
    // côté avec la même. On la pose en haut à gauche, loin de la droite
    // (y = 26) et des nombres (y = 45) : elle ne recouvre rien.
    const lettre = opts.nom
        ? `<text x="3" y="13" font-size="14" font-weight="700" `
            + `fill="${opts.teinte || TEINTE}">${opts.nom}</text>`
        : '';
    const titre = opts.titre || 'Droite graduée';
    return `<svg class="iv-axe" viewBox="0 -${hauteur - H} ${L} ${hauteur}" `
        + `role="img" aria-label="${titre}" style="max-width:100%;height:auto">${lettre}${g}</svg>`;
}

// ── LES TROIS ÉCRITURES ─────────────────────────────────────────────────────

const INF = '∞';
// LE SIGNE MOINS, ET NON LE TRAIT D'UNION DU CLAVIER.
//
// `-3` et `−3` ne sont pas le même caractère : le premier est un trait
// d'union, plus court et collé, le second est le signe moins de la
// typographie mathématique. On ne s'en aperçoit pas sur un caractère isolé —
// on s'en aperçoit quand les deux se côtoient, et c'est exactement ce qui
// arrivait : ce module écrivait déjà `]−∞ ; 3]` avec le vrai moins pour
// l'infini et `[-3 ; 1]` avec le trait d'union pour les bornes, et la liste
// des ensembles de nombres écrit `−18/3`. Trois écritures du même signe dans
// le même chapitre.
const nb = (v) => String(v).replace('-', '−');
const LE = '⩽';   // ⩽ — celui du programme français, pas le ≤ anglo-saxon
const GE = '⩾';   // ⩾

/** `]2 ; 5]`, `]−∞ ; 3[`, `[0 ; +∞[` */
export function intervalleTexte(I) {
    const g = I.a === null ? `]−${INF}` : `${I.ea ? '[' : ']'}${nb(I.a)}`;
    const d = I.b === null ? `+${INF}[` : `${nb(I.b)}${I.eb ? ']' : '['}`;
    return `${g} ; ${d}`;
}

/** `2 < x ⩽ 5`, `x ⩾ 0`, `x < 3` */
export function inegaliteTexte(I) {
    if (I.a === null) return `x ${I.eb ? LE : '<'} ${nb(I.b)}`;
    if (I.b === null) return `x ${I.ea ? GE : '>'} ${nb(I.a)}`;
    return `${nb(I.a)} ${I.ea ? LE : '<'} x ${I.eb ? LE : '<'} ${nb(I.b)}`;
}

/** La phrase du manuel : « x est un réel compris entre −5 exclu et 7 inclus ». */
export function phraseTexte(I) {
    if (I.a === null) return `x est un réel ${I.eb ? 'inférieur ou égal' : 'strictement inférieur'} à ${nb(I.b)}`;
    if (I.b === null) return `x est un réel ${I.ea ? 'supérieur ou égal' : 'strictement supérieur'} à ${nb(I.a)}`;
    return `x est un réel compris entre ${nb(I.a)} ${I.ea ? 'inclus' : 'exclu'} `
        + `et ${nb(I.b)} ${I.eb ? 'inclus' : 'exclu'}`;
}

// ── LES QUATRE FAUTES QU'ON FAIT VRAIMENT ───────────────────────────────────

/**
 * Les variantes fausses d'un intervalle, chacune avec la phrase qui la nomme.
 *
 * On ne fabrique pas des leurres au hasard : chacun est une faute que l'on voit
 * sur les copies, et son `why` dit laquelle — c'est ce qui transforme un
 * « faux » en correction.
 */
function fautes(I) {
    const l = [];
    const a = I.a, b = I.b;
    if (a !== null && b !== null) {
        l.push({ I: { ...I, ea: !I.ea, eb: !I.eb },
            why: 'Les deux crochets sont inversés : ici c\'est '
                + `${nb(a)} qui est ${I.ea ? 'PRIS' : 'LAISSÉ'} et `
                + `${nb(b)} qui est ${I.eb ? 'PRIS' : 'LAISSÉ'}.` });
        l.push({ I: { ...I, ea: !I.ea },
            why: `La borne ${nb(a)} est du mauvais côté du crochet.` });
        l.push({ I: { ...I, eb: !I.eb },
            why: `La borne ${nb(b)} est du mauvais côté du crochet.` });
        l.push({ I: { a: b, b: a, ea: I.eb, eb: I.ea },
            why: 'Les deux bornes sont échangées : un intervalle s\'écrit toujours '
                + 'du plus petit vers le plus grand.' });
    } else {
        const fini = a === null ? b : a;
        l.push({ I: { ...I, ea: a === null ? I.ea : !I.ea, eb: b === null ? I.eb : !I.eb },
            why: `La borne ${nb(fini)} est du mauvais côté du crochet.` });
        // LE CROCHET DE L'INFINI, tourné vers l'intérieur. C'est la faute que
        // le dessin ne montre pas et que l'écriture trahit.
        l.push({ I: { ...I, infiniFerme: true },
            why: 'L\'infini n\'est pas un nombre : on ne peut pas l\'atteindre, '
                + 'donc son crochet est TOUJOURS ouvert.' });
        l.push({ I: a === null ? { a: fini, b: null, ea: I.eb, eb: false }
            : { a: null, b: fini, ea: false, eb: I.ea },
            why: 'C\'est l\'autre moitié de la droite : regardez de quel côté part '
                + 'la flèche.' });
    }
    return l;
}

/** L'écriture d'un intervalle dont on a fermé l'infini — faute volontaire. */
function texteAvecFaute(I) {
    if (!I.infiniFerme) return intervalleTexte(I);
    const g = I.a === null ? `[−${INF}` : `${I.ea ? '[' : ']'}${nb(I.a)}`;
    const d = I.b === null ? `+${INF}]` : `${nb(I.b)}${I.eb ? ']' : '['}`;
    return `${g} ; ${d}`;
}

/**
 * Trois leurres distincts, tirés des fautes réelles.
 *
 * ON DÉDOUBLONNE SUR CE QUE L'ÉLÈVE VOIT, pas sur l'objet — et c'est une
 * correction, pas une précaution.
 *
 * MESURÉ sur trente questions (`tools/tmp/voirIntervalles.mjs`) : trois
 * portaient DEUX PROPOSITIONS IDENTIQUES, dont l'une marquée fausse.
 * Toujours le même cas : une demi-droite dont on demande l'inégalité. La
 * faute « infini fermé » change l'écriture de l'intervalle — [−∞ ; 3] au lieu
 * de ]−∞ ; 3] — mais une inégalité ne parle pas de l'infini : `x ⩽ 3` s'écrit
 * pareil des deux côtés. Deux objets différents, un seul texte.
 *
 * Comparer les objets ne pouvait donc pas le voir. On compare l'ÉTIQUETTE,
 * celle qui sera affichée, et le problème disparaît pour tous les cas de cette
 * famille — y compris ceux qu'on n'a pas encore écrits.
 *
 * @param {Function} rendre  ce qui sera AFFICHÉ pour un intervalle donné.
 */
function leurres(I, rng, rendre, combien = 3) {
    const vus = [];
    const dejaLu = new Set([rendre(I)]);
    const melange = fautes(I).slice();
    // On mélange pour que la bonne réponse ne soit pas toujours au même rang.
    for (let i = melange.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [melange[i], melange[j]] = [melange[j], melange[i]];
    }
    for (const f of melange) {
        if (vus.length >= combien) break;
        const etiquette = rendre(f.I);
        if (dejaLu.has(etiquette)) continue;
        dejaLu.add(etiquette);
        vus.push(f);
    }
    return vus;
}

// ── TIRER UN INTERVALLE ─────────────────────────────────────────────────────

/**
 * @param {Object} rng
 * @param {string} forme  'borne' (deux bornes), 'demi' (une infinie), 'les-deux'
 */
export function tirerIntervalle(rng, forme = 'les-deux') {
    const quoi = forme === 'les-deux' ? (rng.bool(0.55) ? 'borne' : 'demi') : forme;
    if (quoi === 'demi') {
        const v = rng.int(-6, 8);
        const versLaDroite = rng.bool(0.5);
        const inclus = rng.bool(0.5);
        return versLaDroite
            ? { a: v, b: null, ea: inclus, eb: false }
            : { a: null, b: v, ea: false, eb: inclus };
    }
    const a = rng.int(-6, 4);
    const b = a + rng.int(2, 6);
    return { a, b, ea: rng.bool(0.5), eb: rng.bool(0.5) };
}

export const AXE_SEUL = (I) => axeHtml([I], { titre: `Droite graduée : ${intervalleTexte(I)}` });

// ── LE GÉNÉRATEUR : LES SIX SENS DE TRADUCTION ──────────────────────────────

// UNE CONSIGNE EST UNE PHRASE, PAS DEUX MORCEAUX COLLÉS.
//
// Ma première version fabriquait « Cet intervalle se lit : Quelle droite
// graduée ? » et « Cet ensemble de nombres s'écrit : Quel intervalle ? » — du
// français d'automate, assemblé à partir d'un début et d'une fin qui ne se
// connaissaient pas. On écrit la phrase entière : le nom de ce qu'on MONTRE,
// et le nom de ce qu'on DEMANDE, dans une seule question.
const DEPART = {
    inegalite: (I) => ({
        nom: 'cette inégalité',
        montre: `<div class="iv-ecriture">${inegaliteTexte(I)}</div>`,
        papier: inegaliteTexte(I)
    }),
    intervalle: (I) => ({
        nom: 'cet intervalle',
        montre: `<div class="iv-ecriture">${intervalleTexte(I)}</div>`,
        papier: intervalleTexte(I)
    }),
    phrase: (I) => ({
        nom: 'cette phrase',
        montre: `<div class="iv-phrase">${phraseTexte(I)}.</div>`,
        papier: phraseTexte(I) + '.'
    }),
    axe: () => ({
        nom: 'cette droite graduée',
        montre: '',
        papier: 'Voir la droite graduée ci-dessus.'
    })
};

const CE_QU_ON_DEMANDE = {
    intervalle: 'Quel intervalle',
    inegalite: 'Quelle inégalité',
    axe: 'Quelle droite graduée'
};

const ARRIVEE = {
    intervalle: {
        question: 'Quel intervalle ?',
        texte: (I) => texteAvecFaute(I),
        skill: 'nb.intervalle.ecrire'
    },
    inegalite: {
        question: 'Quelle inégalité ?',
        texte: (I) => inegaliteTexte(I),
        skill: 'nb.intervalle.inegalite'
    },
    axe: {
        question: 'Quelle droite graduée ?',
        // LA RÉPONSE EST UN DESSIN. C'est la seule façon de demander « sais-tu
        // le représenter ? » à un élève qui ne peut pas tracer : il choisit
        // parmi quatre axes, dont trois portent les fautes de crochet.
        texte: (I) => axeHtml([I], { titre: intervalleTexte(I) }),
        skill: 'nb.intervalle.lire'
    }
};

// Les six traductions possibles. On ne part jamais de l'axe POUR aller à
// l'axe, et l'on ne part pas d'une écriture pour la redonner telle quelle.
const SENS = [
    { de: 'inegalite', vers: 'intervalle' },
    { de: 'inegalite', vers: 'axe' },
    { de: 'intervalle', vers: 'inegalite' },
    { de: 'intervalle', vers: 'axe' },
    { de: 'axe', vers: 'intervalle' },
    { de: 'axe', vers: 'inegalite' },
    // La phrase du manuel — « x est un réel compris entre −5 exclu et 7
    // inclus » — est la quatrième écriture, et c'est celle par laquelle
    // l'énoncé d'un problème arrive toujours.
    { de: 'phrase', vers: 'intervalle' },
    { de: 'phrase', vers: 'axe' }
];

export const intervallesGenerator = {
    id: 'nb.intervalles',
    label: 'Intervalles : inégalité, axe, écriture',
    skills: ['nb.intervalle.ecrire', 'nb.intervalle.inegalite', 'nb.intervalle.lire'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        {
            id: 'sens', type: 'select', label: 'Ce qu\'on demande', default: 'toutes',
            // COURT, ET LE TEST L'EXIGE : « le ? dit ce que le réglage CHANGE ; le
            // pourquoi va dans un commentaire du code ». Le pourquoi est en tête
            // de ce fichier.
            aide: 'Ce que l\'élève doit produire. « Toutes » mélange les six '
                + 'traductions — c\'est le réglage de la classe.',
            options: [
                { value: 'toutes', label: 'Toutes les traductions' },
                { value: 'intervalle', label: 'Écrire l\'intervalle' },
                { value: 'inegalite', label: 'Écrire l\'inégalité' },
                { value: 'axe', label: 'Représenter sur l\'axe' }
            ]
        },
        {
            id: 'forme', type: 'select', label: 'Sortes d\'intervalles', default: 'les-deux',
            aide: 'Les demi-droites portent la faute du crochet de l\'infini. '
                + 'Les isoler permet de la travailler seule.',
            options: [
                { value: 'les-deux', label: 'Bornés et demi-droites' },
                { value: 'borne', label: 'Bornés seulement — [a ; b]' },
                { value: 'demi', label: 'Demi-droites seulement — vers ±∞' }
            ]
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const I = tirerIntervalle(rng, params.forme || 'les-deux');

        const voulu = params.sens && params.sens !== 'toutes' ? params.sens : null;
        const possibles = voulu ? SENS.filter(s => s.vers === voulu) : SENS;
        const sens = possibles[rng.int(0, possibles.length - 1)];
        const depart = DEPART[sens.de](I);
        const arrivee = ARRIVEE[sens.vers];

        // LE SUPPORT VISUEL, TOUJOURS — la contrainte de Rémy. Quand la
        // question PART de l'axe, il est dans l'énoncé. Quand elle y ARRIVE,
        // les propositions sont des axes. Et quand elle va d'une écriture à
        // l'autre, on montre quand même l'axe : c'est lui qui rend la
        // traduction évidente, et c'est là qu'on veut que l'œil aille.
        const axeDansLEnonce = sens.vers !== 'axe';
        const dessin = axeDansLEnonce
            ? axeHtml([I], { titre: `Droite graduée : ${intervalleTexte(I)}` }) : '';

        // LA MÊME FONCTION REND LA BONNE RÉPONSE ET LES LEURRES : c'est ce qui
        // garantit qu'on les compare sur le même terrain.
        const rendre = sens.vers === 'axe'
            ? (J) => axeHtml([J], { titre: 'proposition' })
            : (sens.vers === 'intervalle' ? texteAvecFaute : inegaliteTexte);

        const faux = leurres(I, rng, rendre, 3);
        const choix = [
            { value: 'ok', label: arrivee.texte(I), correct: true },
            ...faux.map((f, i) => ({
                value: 'faux' + i,
                label: rendre(f.I),
                correct: false,
                why: f.why
            }))
        ];
        for (let i = choix.length - 1; i > 0; i--) {
            const j = rng.int(0, i);
            [choix[i], choix[j]] = [choix[j], choix[i]];
        }

        const consigne = `${CE_QU_ON_DEMANDE[sens.vers]} correspond à ${depart.nom} ?`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'nb.intervalles',
            skillId: arrivee.skill,
            answerKind: 'choice',
            prompt: {
                text: `${depart.papier} — ${CE_QU_ON_DEMANDE[sens.vers]} ?`,
                html: `<div class="game-question iv-consigne">${consigne}</div>`
                    + depart.montre + dessin,
                // SUR LE PAPIER, L'AXE AUSSI. Une fiche imprimée où la question
                // dit « cette droite » sans droite est une question sans énoncé.
                papier: depart.papier
            },
            answer: 'ok',
            choices: choix,
            hints: [
                'Un crochet TOURNÉ VERS L\'INTÉRIEUR prend la borne ; tourné vers '
                    + 'l\'extérieur, il la laisse dehors.',
                `Ici, ${I.a !== null ? `${nb(I.a)} est ${I.ea ? 'PRIS' : 'LAISSÉ'}` : 'on va vers −∞'}`
                    + ` et ${I.b !== null ? `${nb(I.b)} est ${I.eb ? 'PRIS' : 'LAISSÉ'}` : 'on va vers +∞'}.`
            ],
            schemas: ['', axeHtml([I], { titre: 'l\'intervalle' })],
            explanation: `${phraseTexte(I)} : cela s'écrit ${inegaliteTexte(I)}, `
                + `soit l'intervalle ${intervalleTexte(I)}.`
                + ((I.a === null || I.b === null)
                    ? ' Le crochet de l\'infini est toujours ouvert : l\'infini n\'est pas un '
                        + 'nombre, on ne l\'atteint jamais.' : ''),
            difficulty: (I.a === null || I.b === null) ? 3 : 2,
            meta: { de: sens.de, vers: sens.vers }
        });
    }
};

// ── LES ENSEMBLES DE NOMBRES : ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ ────────────────────────────
//
// Rémy : « placer des nombres dans le bon ensemble de nombres », et il a joint
// les exercices 45 à 47 de son manuel — « indiquer pour chaque nombre le plus
// petit ensemble de nombres auquel il appartient ».
//
// LE PIÈGE EST TOUJOURS LE MÊME, et ce n'est pas la définition : c'est qu'il
// faut CALCULER AVANT DE CLASSER. √64 n'est pas irrationnel, il vaut 8.
// −18/3 n'est pas une fraction, il vaut −6. (2√3)² vaut 12. 6,23 × 10² vaut
// 623. L'élève qui répond à la forme écrite au lieu de la valeur se trompe
// quatre fois sur cinq — et c'est exactement ce que le manuel cherche.
//
// ON NE CALCULE DONC PAS LES ENSEMBLES, ON LES ÉCRIT. Un générateur qui
// tirerait des nombres au hasard devrait décider si √n est rationnel : c'est
// faisable pour une racine carrée, faux dès qu'on mélange π. La liste est
// écrite à la main, chaque entrée porte sa valeur ET sa raison, et c'est ce
// qui la rend vérifiable — un test la relit.

const ENSEMBLES = [
    { id: 'N', nom: 'ℕ', label: 'ℕ — les entiers naturels' },
    { id: 'Z', nom: 'ℤ', label: 'ℤ — les entiers relatifs' },
    { id: 'D', nom: '\u{1D53B}', label: '\u{1D53B} — les décimaux' },
    { id: 'Q', nom: 'ℚ', label: 'ℚ — les rationnels' },
    { id: 'R', nom: 'ℝ', label: 'ℝ — les réels' }
];
const RANG = { N: 0, Z: 1, D: 2, Q: 3, R: 4 };

// `ecrit` : ce qu'on montre. `vaut` : ce que ça fait. `ens` : le plus petit
// ensemble. `parce` : la phrase qui explique, et qui dit le CALCUL d'abord.
const NOMBRES = [
    { ecrit: '12', vaut: '12', ens: 'N', parce: '12 est un entier, et il est positif : il est déjà dans ℕ.' },
    { ecrit: '√64', vaut: '8', ens: 'N', parce: '√64 = 8 : ce n\'est pas un irrationnel, c\'est un entier.' },
    { ecrit: '(−4)⁰', vaut: '1', ens: 'N', parce: 'Tout nombre non nul à la puissance 0 vaut 1 — le signe moins n\'y change rien.' },
    { ecrit: '(2√3)²', vaut: '12', ens: 'N', parce: 'On élève le 2 ET la racine : (2√3)² = 4 × 3 = 12, un entier.' },
    { ecrit: '6,23 × 10²', vaut: '623', ens: 'N', parce: '6,23 × 100 = 623 : la virgule se déplace, le nombre devient entier.' },
    // LES PARENTHÈSES SONT NÉCESSAIRES, ET ELLES NE S'IMPRIMENT PAS.
    //
    // « 36/5 × 25/6 » se lit, comme partout, de gauche à droite :
    // ((36/5) × 25)/6. La VALEUR ne change pas — multiplier et diviser
    // commutent —, mais le DESSIN si : une grande fraction portant
    // « 36/5 × 25 » au numérateur, au lieu de deux fractions multipliées.
    // Les parenthèses disent l'arbre qu'on veut ; `formule.js` ne réécrit
    // que les parenthèses NÉCESSAIRES, donc la feuille imprime bien
    // « 36/5 × 25/6 ».
    { ecrit: '(36/5) × (25/6)', vaut: '30', ens: 'N', parce: 'Le produit des fractions fait 900/30, et 900/30 = 30 : un entier, pas une fraction.' },
    { ecrit: '−5', vaut: '−5', ens: 'Z', parce: 'Entier, mais négatif : il n\'est pas dans ℕ.' },
    { ecrit: '−18/3', vaut: '−6', ens: 'Z', parce: '−18/3 = −6 : la fraction tombe juste, et le résultat est négatif.' },
    { ecrit: '−14/7', vaut: '−2', ens: 'Z', parce: '−14/7 = −2 : ce n\'est pas une fraction irréductible, elle se simplifie.' },
    { ecrit: '2⁻¹', vaut: '0,5', ens: 'D', parce: '2⁻¹ = 1/2 = 0,5 : un décimal, pas un entier.' },
    { ecrit: '3,14', vaut: '3,14', ens: 'D', parce: 'Deux décimales, et il s\'arrête : c\'est un décimal. π, lui, ne s\'arrête pas.' },
    { ecrit: '2,5 × 10⁻³', vaut: '0,0025', ens: 'D', parce: '2,5 ÷ 1000 = 0,0025 : l\'écriture décimale s\'arrête.' },
    { ecrit: '7/4', vaut: '1,75', ens: 'D', parce: '7/4 = 1,75 : le dénominateur ne contient que des 2, donc l\'écriture décimale s\'arrête.' },
    { ecrit: '−9/4', vaut: '−2,25', ens: 'D', parce: '−9/4 = −2,25 : décimal, et négatif.' },
    { ecrit: '2/3', vaut: '0,666…', ens: 'Q', parce: '2/3 = 0,666… : les décimales ne s\'arrêtent jamais, mais c\'est un quotient d\'entiers.' },
    { ecrit: '1/3', vaut: '0,333…', ens: 'Q', parce: 'Le dénominateur contient un 3 : l\'écriture décimale est infinie. Mais c\'est bien un quotient d\'entiers.' },
    { ecrit: '−5/6', vaut: '−0,8333…', ens: 'Q', parce: 'Le 3 du dénominateur empêche l\'écriture décimale de s\'arrêter.' },
    { ecrit: '√5', vaut: '2,236…', ens: 'R', parce: '5 n\'est pas un carré parfait : √5 ne s\'écrit comme aucun quotient d\'entiers.' },
    { ecrit: '2π', vaut: '6,283…', ens: 'R', parce: 'π est irrationnel, et le multiplier par 2 n\'y change rien.' },
    { ecrit: '√2 × √3', vaut: '√6', ens: 'R', parce: '√2 × √3 = √6, et 6 n\'est pas un carré parfait.' },
    { ecrit: '(√3/3)²', vaut: '1/3', ens: 'Q', parce: '(√3)² = 3, donc 3/9 = 1/3 : le carré fait disparaître la racine.' },
    { ecrit: '(√2)⁻⁵ × (√2)⁶', vaut: '√2', ens: 'R', parce: 'Les exposants s\'ajoutent : −5 + 6 = 1, il reste √2, irrationnel.' }
];

export const ensemblesGenerator = {
    id: 'nb.ensembles',
    label: 'Le plus petit ensemble de nombres',
    skills: ['nb.ensembles.appartenance'],
    answerKinds: ['choice'],
    ecrit: true,
    // SUR LA FEUILLE, −9/4 S'ÉCRIT EN COLONNE. La barre oblique est une
    // commodité d'écran ; une fiche qui l'imprime enseigne le contraire du
    // cours. La liste des nombres en contient sept — 7/4, −18/3, 2/3… — et
    // c'est un test du catalogue qui l'a vu, pas moi.
    fractions: true,
    params: [
        {
            id: 'portee', type: 'select', label: 'Jusqu\'où', default: 'tous',
            aide: 'Les irrationnels demandent de reconnaître qu\'une racine ne tombe '
                + 'pas juste. Sans eux, on travaille le calcul avant de classer.',
            options: [
                { value: 'tous', label: 'Tous, jusqu\'aux irrationnels' },
                { value: 'rationnels', label: 'Sans les irrationnels (ℕ à ℚ)' }
            ]
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const pool = params.portee === 'rationnels'
            ? NOMBRES.filter(n => n.ens !== 'R') : NOMBRES;
        const n = pool[rng.int(0, pool.length - 1)];
        const bon = ENSEMBLES.find(e => e.id === n.ens);

        // LES LEURRES SONT LES ENSEMBLES VOISINS, et c'est là qu'est la faute :
        // on répond ℝ pour un rationnel, ou ℚ pour un décimal. Proposer
        // des ensembles lointains rendrait la question facile pour une mauvaise
        // raison. On prend donc les deux d'au-dessus et celui d'en dessous.
        const r = RANG[n.ens];
        const voisins = ENSEMBLES.filter(e => e.id !== n.ens)
            .sort((a, b) => Math.abs(RANG[a.id] - r) - Math.abs(RANG[b.id] - r))
            .slice(0, 3);
        // LE BOUTON PORTE LE NOM, PAS SEULEMENT LE SYMBOLE. Quatre boutons
        // marqués « ℚ », « 𝔻 », « ℤ », « ℕ » demandent à l'élève de se
        // rappeler quel signe veut dire quoi AVANT de pouvoir répondre — et
        // c'est une seconde question, qui n'est pas celle qu'on pose. Le nom
        // écrit à côté du symbole est aussi ce qui l'apprend.
        const choix = [
            { value: n.ens, label: bon.label, correct: true },
            ...voisins.map(e => ({
                value: e.id, label: e.label, correct: false,
                why: RANG[e.id] > r
                    ? `${e.nom} le contient, mais ce n'est pas le PLUS PETIT : ${n.parce}`
                    : `${n.ecrit} n'est pas dans ${e.nom} — ${n.parce}`
            }))
        ];
        for (let i = choix.length - 1; i > 0; i--) {
            const j = rng.int(0, i);
            [choix[i], choix[j]] = [choix[j], choix[i]];
        }

        return makeItem({
            seed: rng.seed,
            generatorId: 'nb.ensembles',
            skillId: 'nb.ensembles.appartenance',
            answerKind: 'choice',
            prompt: {
                text: `${fx.formuleTexte(n.ecrit)} — quel est le plus petit `
                    + 'ensemble auquel il appartient ?',
                html: '<div class="game-question iv-consigne">Le plus petit ensemble '
                    + 'auquel ce nombre appartient ?</div>'
                    // ── LE NOMBRE, DESSINÉ ─────────────────────────────
                    //
                    // RÉMY : « les racines carrées de plus petit ensemble de
                    // nombre n'ont pas de trait horizontaux. Utilise ta
                    // fonction pour écrire les formule car même pour les
                    // fractions ca ne les dessine pas en colonnes. »
                    //
                    // Il a raison sur les deux, et c'est la même cause : cette
                    // ligne posait `n.ecrit` — du TEXTE — directement dans la
                    // page. « √64 » y était un glyphe √ suivi de 64, sans la
                    // barre qui dit jusqu'où va la racine ; « 7/4 » une barre
                    // oblique, là où le cours écrit une colonne. Deux
                    // écritures qu'un élève ne verra dans aucun manuel.
                    //
                    // `formule.js` existe pour cela — c'est la fonction qu'il
                    // demande, écrite pour les racines du chapitre. On la
                    // branche ici.
                    + `<div class="iv-ecriture">${fx.formule(n.ecrit)}</div>`
                    // SURTOUT PAS `poupeesHtml(n.ens)` ICI — et c'est ce que
                    // j'avais écrit, à trois lignes du commentaire qui dit de
                    // ne pas le faire. Le cadre éclairé EST la réponse : la
                    // question devenait « sais-tu lire un surlignage ? ».
                    + poupeesHtml(null),
                // MÊME ARBRE, DEUX LECTURES : l'écran le dessine, la feuille
                // l'écrit à plat. Ils ne peuvent plus dire deux choses.
                papier: fx.formuleTexte(n.ecrit)
            },
            answer: n.ens,
            choices: choix,
            hints: [
                'Calcule d\'abord, classe ensuite : la forme écrite n\'est pas la valeur.',
                `${n.ecrit} vaut ${n.vaut}.`
            ],
            schemas: ['', poupeesHtml(null)],
            explanation: `${n.ecrit} = ${n.vaut}, donc ${bon.nom}. ${n.parce}`,
            difficulty: r >= 3 ? 3 : 2,
            meta: { ens: n.ens }
        });
    }
};

/**
 * LE SUPPORT VISUEL DES ENSEMBLES : les poupées russes.
 *
 * Rémy : « il faut toujours un support visuel ». Pour les intervalles c'est la
 * droite graduée ; ici c'est le dessin des inclusions — cinq cadres emboîtés,
 * ℕ au centre. C'est ce dessin qui rend évident qu'un entier est AUSSI un
 * décimal et AUSSI un réel, donc que la question « le plus petit » a un sens.
 *
 * ON NE PLACE PAS LE NOMBRE DEDANS : ce serait donner la réponse. Le dessin
 * est une carte, pas un corrigé — sauf dans l'indice, où l'on éclaire la
 * bonne case parce qu'on est en train d'expliquer.
 */
function poupeesHtml(surligne) {
    // LE DESSIN DISAIT LE CONTRAIRE DE LA LEÇON, et il a fallu le regarder
    // pour s'en apercevoir : les cadres rétrécissaient en largeur de ℕ vers ℝ
    // mais GRANDISSAIENT en hauteur, si bien que ℕ dépassait de ℝ de vingt
    // pixels en haut et en bas. Le dessin censé montrer que tout entier est
    // aussi un réel montrait un ℕ qui sort de ℝ. Un emboîtement se vérifie au
    // pixel, pas à l'œil : on part d'un seul nombre, l'ÉLOIGNEMENT du centre,
    // et les quatre côtés s'en déduisent — ils ne peuvent plus se contredire.
    const l = 300, h = 170, PAS = 16;
    let g = '';
    ENSEMBLES.forEach((e, i) => {
        // ℕ est le plus à l'intérieur (4 crans), ℝ le cadre extérieur (0).
        const dehors = ENSEMBLES.length - 1 - i;
        const x = 8 + dehors * PAS;
        const y = 8 + dehors * PAS;
        const w = l - 16 - dehors * PAS * 2;
        const hh = h - 16 - dehors * PAS * 2;
        const actif = surligne === e.id;
        // `fill-opacity` et non un second `opacity` : l'attribut était écrit
        // DEUX FOIS sur la même balise, et le navigateur garde le dernier —
        // le fond du cadre éclairé était donc opaque, il recouvrait les cadres
        // intérieurs au lieu de les teinter.
        g += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="12" `
            + `fill="${actif ? 'var(--primary, #4f46e5)' : 'none'}" fill-opacity=".14" `
            + `stroke="currentColor" `
            + `stroke-width="${actif ? 2.4 : 1}" opacity="${actif ? 1 : .45}"/>`;
        // La lettre dans le coin haut-gauche de SON cadre : les cinq forment
        // un escalier, et l'on voit d'un coup lequel est dans lequel.
        g += `<text x="${x + 9}" y="${y + 15}" font-size="13" font-weight="700" `
            + `fill="currentColor" opacity="${actif ? 1 : .65}">${e.nom}</text>`;
    });
    return `<svg class="iv-poupees" viewBox="0 0 ${l} ${h}" role="img" `
        + `aria-label="Les ensembles de nombres emboîtés : ℕ dans ℤ dans 𝔻 dans ℚ dans ℝ" `
        + `style="max-width:100%;height:auto;margin-top:6px">${g}</svg>`;
}

// ── UNION ET INTERSECTION ───────────────────────────────────────────────────
//
// Rémy : « fais l'ensemble des nombres et l'union et l'intersection ». Ce sont
// les exercices 70 à 72 de son manuel : deux intervalles, et l'on demande
// I ∩ J puis I ∪ J.
//
// CE QUI SE JOUE ICI N'EST PAS LA DÉFINITION, c'est le crochet de la BORNE
// PARTAGÉE, et c'est une règle que l'élève ne devine pas :
//
//   I = [−4 ; 1[   J = ]−1 ; 4]
//   I ∩ J = ]−1 ; 1[   — à chaque bout on garde le crochet LE PLUS SÉVÈRE
//   I ∪ J = [−4 ; 4]   — à chaque bout on garde le crochet LE PLUS GÉNÉREUX
//
// L'intersection est la partie commune : un nombre doit être dans les DEUX,
// donc il suffit qu'un seul des deux le refuse. L'union est le contraire : il
// suffit qu'un seul l'accepte. D'où les deux crochets opposés — et d'où la
// faute, qui consiste à recopier le crochet du mauvais intervalle.
//
// ET DEUX CAS QUE LE COURS NE PEUT PAS ÉVITER :
//
//   · L'INTERSECTION VIDE. [−5 ; −2] ∩ [1 ; 4] = ∅. Ce n'est pas « zéro », ce
//     n'est pas « entre −2 et 1 » : c'est qu'aucun nombre n'est dans les deux.
//     La réponse fausse la plus fréquente est justement l'intervalle du TROU,
//     c'est-à-dire l'ensemble des nombres qui ne sont dans NI l'un NI l'autre.
//
//   · L'UNION QUI N'EST PAS UN INTERVALLE. [−5 ; −2] ∪ [1 ; 4] ne se réduit
//     à rien : on l'écrit en deux morceaux. L'élève qui répond [−5 ; 4]
//     « bouche le trou » et fait entrer 0 dans un ensemble où il n'est pas.
//
// LE DESSIN EST DONC DEUX AXES EMPILÉS, sur la MÊME graduation, I au-dessus
// et J en dessous, chacun de sa couleur et portant sa lettre. Rémy : « il faut
// toujours un support visuel ». Ici il ne décore pas : la réponse SE VOIT —
// l'intersection est la tranche verticale où les deux traits se superposent.

// Les deux couleurs des deux intervalles.
//
// ELLES NE SONT PAS PRISES DANS LE THÈME, et c'est délibéré. `var(--primary)`
// et `var(--success)` conviennent tant qu'on ne dessine qu'un intervalle, mais
// le thème « forêt » de l'application pose --primary à #15803d et --success à
// #22c55e : deux verts. Deux intervalles qu'on doit distinguer d'un coup d'œil
// deviendraient indiscernables — sur UN thème seulement, c'est-à-dire pour les
// élèves d'une classe et pas des autres. On fixe donc les deux teintes, et on
// les choisit lisibles sur fond clair comme sur fond sombre.
const TEINTE_I = '#6366f1';   // indigo
const TEINTE_J = '#ea580c';   // orange
const TEINTE_R = '#0d9488';   // sarcelle — la réponse, dans la correction

const VIDE = '∅';

// ── COMPARER DES BORNES ─────────────────────────────────────────────────────
//
// Tout le calcul tient dans deux comparaisons, et elles ne sont pas
// symétriques. Pour une borne BASSE à valeur égale, c'est la borne EXCLUE qui
// est la plus haute : ]2 commence après [2. Pour une borne HAUTE c'est
// l'inverse : 2[ s'arrête avant 2].

const basse = (I) => ({ v: I.a, inclus: I.ea });
const haute = (I) => ({ v: I.b, inclus: I.eb });

/** > 0 si p commence plus tard que q. `null` vaut −∞. */
function cmpBasse(p, q) {
    if (p.v === null && q.v === null) return 0;
    if (p.v === null) return -1;
    if (q.v === null) return 1;
    if (p.v !== q.v) return p.v - q.v;
    return (p.inclus ? 0 : 1) - (q.inclus ? 0 : 1);
}

/** > 0 si p finit plus tard que q. `null` vaut +∞. */
function cmpHaute(p, q) {
    if (p.v === null && q.v === null) return 0;
    if (p.v === null) return 1;
    if (q.v === null) return -1;
    if (p.v !== q.v) return p.v - q.v;
    return (p.inclus ? 1 : 0) - (q.inclus ? 1 : 0);
}

/**
 * I ∩ J, rendu comme une LISTE d'intervalles : `[]` pour l'ensemble vide.
 *
 * La liste plutôt qu'un intervalle-ou-null, parce que l'union, elle, peut en
 * rendre deux — et que le reste du code (affichage, dessin, leurres) n'a
 * alors qu'une seule forme à connaître.
 */
export function intersection(I, J) {
    const bas = cmpBasse(basse(I), basse(J)) >= 0 ? basse(I) : basse(J);
    const ht = cmpHaute(haute(I), haute(J)) <= 0 ? haute(I) : haute(J);
    if (bas.v !== null && ht.v !== null) {
        if (bas.v > ht.v) return [];
        // Bornes égales : il faut que les DEUX prennent le point, sinon il
        // manque à l'un des deux et l'intersection est vide.
        if (bas.v === ht.v && !(bas.inclus && ht.inclus)) return [];
    }
    return [{ a: bas.v, b: ht.v, ea: bas.inclus, eb: ht.inclus }];
}

/** I ∪ J : un intervalle s'ils se touchent, deux morceaux sinon. */
export function union(I, J) {
    const [g, d] = cmpBasse(basse(I), basse(J)) <= 0 ? [I, J] : [J, I];
    const hg = haute(g), bd = basse(d);
    // Y a-t-il un trou entre les deux ? Il n'y en a pas si celui de gauche va
    // au-delà du départ de l'autre — ou s'il s'arrête exactement dessus et que
    // l'un des deux prend le point.
    let recolle;
    if (hg.v === null || bd.v === null) recolle = true;
    else if (hg.v > bd.v) recolle = true;
    else if (hg.v === bd.v) recolle = hg.inclus || bd.inclus;
    else recolle = false;
    if (!recolle) return [g, d];
    const ht = cmpHaute(haute(I), haute(J)) >= 0 ? haute(I) : haute(J);
    return [{ a: basse(g).v, b: ht.v, ea: basse(g).inclus, eb: ht.inclus }];
}

/** Ce que l'élève lit : `∅`, `[−1 ; 1[`, ou `]−∞ ; 1] ∪ [4 ; +∞[`. */
export function ensembleTexte(parts) {
    if (!parts.length) return VIDE;
    return parts.map(intervalleTexte).join(' ∪ ');
}

// ── TIRER DEUX INTERVALLES ──────────────────────────────────────────────────
//
// On ne tire pas deux intervalles au hasard : on tire une POSITION RELATIVE,
// puis les bornes qui la réalisent. Au hasard, un cas sur deux serait deux
// intervalles disjoints — le cas le plus rare en classe — et l'emboîtement,
// qui est celui où la faute de crochet est la plus instructive, ne sortirait
// presque jamais.

const POSITIONS = ['chevauche', 'emboite', 'accole', 'disjoint', 'demi'];
const CROISES = ['chevauche', 'emboite', 'demi'];
const SEPARES = ['accole', 'disjoint'];

function tirerPaire(rng, position) {
    const cr = () => rng.bool(0.5);
    if (position === 'demi') {
        // Deux demi-droites de sens opposés qui se recouvrent : l'union est ℝ
        // tout entier, et l'intersection un intervalle borné. C'est le cas du
        // manuel où l'on découvre qu'une union peut valoir « tous les réels ».
        const p = rng.int(-4, 1);
        const q = p + rng.int(2, 5);
        return [{ a: p, b: null, ea: cr(), eb: false },
            { a: null, b: q, ea: false, eb: cr() }];
    }
    if (position === 'emboite') {
        const a1 = rng.int(-6, -2);
        const a2 = a1 + rng.int(1, 3);
        const b2 = a2 + rng.int(2, 4);
        const b1 = b2 + rng.int(1, 3);
        return [{ a: a1, b: b1, ea: cr(), eb: cr() },
            { a: a2, b: b2, ea: cr(), eb: cr() }];
    }
    if (position === 'accole') {
        // LES DEUX SE TOUCHENT EN UN POINT, et c'est le cas le plus fin du
        // chapitre : l'intersection est VIDE alors que les traits se rejoignent
        // sur le dessin, et l'union est pourtant un seul intervalle. On
        // interdit que les deux crochets soient fermés — sinon l'intersection
        // vaudrait le singleton {3}, qui s'écrit [3 ; 3] et qui n'est pas au
        // programme de Seconde.
        const a1 = rng.int(-6, -2);
        const m = a1 + rng.int(2, 4);
        const b2 = m + rng.int(2, 4);
        const fermeAGauche = rng.bool(0.5);
        return [{ a: a1, b: m, ea: cr(), eb: fermeAGauche },
            { a: m, b: b2, ea: !fermeAGauche, eb: cr() }];
    }
    if (position === 'disjoint') {
        const a1 = rng.int(-7, -4);
        const b1 = a1 + rng.int(1, 2);
        const a2 = b1 + rng.int(2, 3);
        const b2 = a2 + rng.int(1, 3);
        return [{ a: a1, b: b1, ea: cr(), eb: cr() },
            { a: a2, b: b2, ea: cr(), eb: cr() }];
    }
    // 'chevauche' : a1 < a2 < b1 < b2 — le cas ordinaire.
    const a1 = rng.int(-6, -2);
    const a2 = a1 + rng.int(2, 3);
    const b1 = a2 + rng.int(1, 3);
    const b2 = b1 + rng.int(2, 4);
    return [{ a: a1, b: b1, ea: cr(), eb: cr() },
        { a: a2, b: b2, ea: cr(), eb: cr() }];
}

// ── LES FAUTES QU'ON FAIT VRAIMENT, SUR ∩ ET ∪ ──────────────────────────────

// `cle: true` marque les leurres qu'on ne veut JAMAIS perdre.
//
// MESURÉ sur trente questions : sur une union de deux intervalles disjoints —
// la question où l'élève « bouche le trou » — le leurre « [−6 ; 0] » n'était
// proposé qu'une fois sur deux. Le tirage prenait trois fautes au hasard dans
// la liste, et celle qui EST la faute du cas partait avec les autres. Une
// question dont le bon leurre est absent n'est plus une question difficile :
// c'est une question facile.
function fautesEnsemblistes(I, J, op, bonne, autre) {
    const l = [];
    const nomOp = op === 'inter' ? 'I ∩ J' : 'I ∪ J';
    const nomAutre = op === 'inter' ? 'I ∪ J' : 'I ∩ J';

    // LA FAUTE REINE : confondre les deux symboles.
    l.push({ cle: true, parts: autre,
        why: `C'est ${nomAutre}, pas ${nomOp}. ∩ garde ce qui est dans les DEUX `
            + 'à la fois ; ∪ garde ce qui est dans l\'un OU dans l\'autre.' });

    // LE CROCHET DE LA BORNE PARTAGÉE, pris à l'envers — la faute du chapitre.
    if (bonne.length === 1) {
        const K = bonne[0];
        if (K.a !== null) l.push({ cle: true, parts: [{ ...K, ea: !K.ea }],
            why: `À la borne ${nb(K.a)}, c'est le crochet de l'autre intervalle qui a été `
                + `recopié. Pour ${op === 'inter' ? 'une intersection on garde le plus '
                    + 'SÉVÈRE des deux' : 'une union on garde le plus GÉNÉREUX des deux'}.` });
        if (K.b !== null) l.push({ cle: true, parts: [{ ...K, eb: !K.eb }],
            why: `À la borne ${nb(K.b)}, c'est le crochet de l'autre intervalle qui a été `
                + `recopié. Pour ${op === 'inter' ? 'une intersection on garde le plus '
                    + 'SÉVÈRE des deux' : 'une union on garde le plus GÉNÉREUX des deux'}.` });
    }

    // L'INTERSECTION VIDE, remplie par le TROU. C'est la réponse fausse la plus
    // fréquente : l'élève voit l'espace entre les deux traits et le prend pour
    // la réponse, alors que c'est justement ce qui n'est dans NI l'un NI l'autre.
    if (!bonne.length) {
        const [g, d] = cmpBasse(basse(I), basse(J)) <= 0 ? [I, J] : [J, I];
        // `<` ET NON `<=` : deux intervalles ACCOLÉS — ]−5 ; −3[ et [−3 ; 1] —
        // ont une intersection vide sans avoir de trou entre eux. La borne
        // basse et la borne haute du « trou » valaient alors le même nombre et
        // l'on proposait `[−3 ; −3[`, qui ne veut rien dire. Un leurre doit
        // être une réponse qu'un élève PEUT écrire ; celui-là n'apprenait rien
        // et signalait surtout qu'il était faux.
        if (g.b !== null && d.a !== null && g.b < d.a) {
            l.push({ cle: true, parts: [{ a: g.b, b: d.a, ea: !g.eb, eb: !d.ea }],
                why: `Ce sont les nombres qui sont entre les deux — donc dans NI l'un `
                    + 'NI l\'autre. L\'intersection, elle, est vide : ∅.' });
        }
    }

    // L'UNION EN DEUX MORCEAUX, dont on a « bouché le trou ».
    if (bonne.length === 2) {
        const [g, d] = bonne;
        l.push({ cle: true, parts: [{ a: g.a, b: d.b, ea: g.ea, eb: d.eb }],
            why: `Le trou a été bouché : ${g.b !== null && d.a !== null
                ? `les nombres entre ${nb(g.b)} et ${nb(d.a)} ne sont dans aucun des deux`
                : 'des nombres qui ne sont dans aucun des deux entreraient'}. `
                + 'Une union peut très bien s\'écrire en deux morceaux.' });
    }

    // ON A RECOPIÉ L'UN DES DEUX. Fréquent quand l'un contient l'autre : la
    // réponse EST l'un des deux, et l'élève qui répond l'autre a lu le dessin
    // à l'envers.
    l.push({ parts: [I], why: 'C\'est I tout seul — regarde ce que J ajoute (∪) ou retire (∩).' });
    l.push({ parts: [J], why: 'C\'est J tout seul — regarde ce que I ajoute (∪) ou retire (∩).' });
    // Et « vide » proposé à tort : c'est la réponse-réflexe dès qu'on voit deux
    // traits qui ne se ressemblent pas.
    // ET SEULEMENT POUR UNE INTERSECTION : personne ne répond « vide » à la
    // réunion de deux intervalles qui ne le sont pas. MESURÉ : ce leurre
    // sortait dans onze des seize questions d'union, et il y prenait la place
    // d'un leurre qui, lui, disait quelque chose.
    if (bonne.length && op === 'inter') l.push({ parts: [],
        why: 'Ce n\'est pas vide : regarde le dessin, il y a bien une tranche '
            + 'couverte par les DEUX traits à la fois.' });

    return l;
}

const CONSIGNE_OP = {
    inter: 'Quel est l\'ensemble I ∩ J ?',
    union: 'Quel est l\'ensemble I ∪ J ?'
};

export const ensemblistesGenerator = {
    id: 'nb.intervalles.ensemblistes',
    label: 'Union et intersection de deux intervalles',
    skills: ['nb.intervalle.ensembliste'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        {
            id: 'operation', type: 'select', label: 'Ce qu\'on demande', default: 'toutes',
            aide: 'Mélangées, l\'élève doit d\'abord LIRE le symbole — c\'est là que '
                + 'se fait la confusion. Séparées, on travaille une règle à la fois.',
            options: [
                { value: 'toutes', label: 'Les deux, mélangées — ∩ et ∪' },
                { value: 'inter', label: 'Intersection seulement — ∩' },
                { value: 'union', label: 'Union seulement — ∪' }
            ]
        },
        {
            id: 'cas', type: 'select', label: 'Position des deux intervalles', default: 'tous',
            aide: 'Séparés : l\'intersection est vide et l\'union s\'écrit en deux '
                + 'morceaux. Ce sont les deux cas que l\'élève ne voit jamais venir.',
            options: [
                { value: 'tous', label: 'Toutes les positions' },
                { value: 'croises', label: 'Qui se croisent — le cas ordinaire' },
                { value: 'separes', label: 'Séparés ou collés — ∅ et les trous' }
            ]
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const choixDeCas = params.cas === 'croises' ? CROISES
            : (params.cas === 'separes' ? SEPARES : POSITIONS);
        const position = choixDeCas[rng.int(0, choixDeCas.length - 1)];
        const [I, J] = tirerPaire(rng, position);

        const op = params.operation && params.operation !== 'toutes'
            ? params.operation : (rng.bool(0.5) ? 'inter' : 'union');
        const inter = intersection(I, J);
        const uni = union(I, J);
        const bonne = op === 'inter' ? inter : uni;
        const autre = op === 'inter' ? uni : inter;

        const rendre = (parts) => ensembleTexte(parts);
        const dejaLu = new Set([rendre(bonne)]);
        const tout = fautesEnsemblistes(I, J, op, bonne, autre);
        for (let i = tout.length - 1; i > 0; i--) {
            const j = rng.int(0, i);
            [tout[i], tout[j]] = [tout[j], tout[i]];
        }
        // Les leurres clefs d'abord — mélangés entre eux, pour que la bonne
        // réponse ne se repère pas à la place de ses voisines, mais servis
        // avant les leurres de remplissage.
        const melange = [...tout.filter(f => f.cle), ...tout.filter(f => !f.cle)];
        const faux = [];
        for (const f of melange) {
            if (faux.length >= 3) break;
            const etiquette = rendre(f.parts);
            if (dejaLu.has(etiquette)) continue;
            dejaLu.add(etiquette);
            faux.push(f);
        }

        const choix = [
            { value: 'ok', label: rendre(bonne), correct: true },
            ...faux.map((f, i) => ({ value: 'faux' + i, label: rendre(f.parts),
                correct: false, why: f.why }))
        ];
        for (let i = choix.length - 1; i > 0; i--) {
            const j = rng.int(0, i);
            [choix[i], choix[j]] = [choix[j], choix[i]];
        }

        // LA MÊME GRADUATION POUR LES DEUX AXES — et pour celui de la
        // correction. Trois dessins cadrés chacun sur ses bornes ne se
        // superposeraient pas, et c'est la superposition qui EST la réponse.
        const f = fenetreCommune([I, J, ...bonne]);
        const dessinI = axeHtml([{ ...I, teinte: TEINTE_I }],
            { fenetre: f, nom: 'I', teinte: TEINTE_I, titre: `I = ${intervalleTexte(I)}` });
        const dessinJ = axeHtml([{ ...J, teinte: TEINTE_J }],
            { fenetre: f, nom: 'J', teinte: TEINTE_J, titre: `J = ${intervalleTexte(J)}` });

        const legende = `<div class="iv-deux">`
            + `<span class="iv-nom" style="color:${TEINTE_I}">I = ${intervalleTexte(I)}</span>`
            + `<span class="iv-nom" style="color:${TEINTE_J}">J = ${intervalleTexte(J)}</span>`
            + `</div>`;

        const dessinReponse = bonne.length
            ? axeHtml(bonne.map(K => ({ ...K, teinte: TEINTE_R })),
                { fenetre: f, nom: op === 'inter' ? '∩' : '∪', teinte: TEINTE_R,
                    titre: `${op === 'inter' ? 'I ∩ J' : 'I ∪ J'} = ${ensembleTexte(bonne)}` })
            : '';

        const pourquoi = (() => {
            if (op === 'inter' && !bonne.length) {
                return 'Aucun nombre n\'est dans les deux à la fois : les deux traits ne se '
                    + 'superposent nulle part. L\'intersection est VIDE, et cela s\'écrit ∅.';
            }
            if (op === 'union' && bonne.length === 2) {
                return 'Entre les deux il y a un trou, et l\'union ne le bouche pas : on '
                    + 'laisse la réponse en deux morceaux, reliés par le symbole ∪.';
            }
            if (op === 'union' && bonne[0] && bonne[0].a === null && bonne[0].b === null) {
                return 'Les deux demi-droites se recouvrent et couvrent toute la droite : '
                    + 'l\'union est ℝ, c\'est-à-dire ]−∞ ; +∞[.';
            }
            return op === 'inter'
                ? 'On garde la tranche où les DEUX traits se superposent. À chaque borne, '
                    + 'c\'est le crochet le plus SÉVÈRE qui l\'emporte : il suffit qu\'un '
                    + 'seul des deux refuse le nombre pour qu\'il soit dehors.'
                : 'On garde tout ce qui est couvert par au moins un trait. À chaque borne, '
                    + 'c\'est le crochet le plus GÉNÉREUX qui l\'emporte : il suffit qu\'un '
                    + 'seul des deux accepte le nombre pour qu\'il soit dedans.';
        })();

        return makeItem({
            seed: rng.seed,
            generatorId: 'nb.intervalles.ensemblistes',
            skillId: 'nb.intervalle.ensembliste',
            answerKind: 'choice',
            prompt: {
                text: `I = ${intervalleTexte(I)} et J = ${intervalleTexte(J)}. `
                    + (op === 'inter' ? 'Écris I ∩ J.' : 'Écris I ∪ J.'),
                html: `<div class="game-question iv-consigne">${CONSIGNE_OP[op]}</div>`
                    + legende + dessinI + dessinJ,
                papier: `I = ${intervalleTexte(I)} et J = ${intervalleTexte(J)}`
            },
            answer: 'ok',
            choices: choix,
            hints: [
                op === 'inter'
                    ? 'I ∩ J, c\'est ce qui est dans les DEUX. Sur le dessin : la tranche '
                        + 'verticale où les deux traits sont là en même temps.'
                    : 'I ∪ J, c\'est ce qui est dans l\'un OU dans l\'autre. Sur le dessin : '
                        + 'tout ce qui est couvert par au moins un trait.',
                pourquoi
            ],
            schemas: ['', dessinReponse],
            explanation: `I ∩ J = ${ensembleTexte(inter)} et I ∪ J = ${ensembleTexte(uni)}. `
                + pourquoi,
            // Le papier n'a pas le dessin de la correction : il faut que la
            // phrase se suffise, et elle le fait — elle nomme les deux résultats.
            difficulty: (!bonne.length || bonne.length === 2) ? 4 : 3,
            meta: { op, position, vide: !bonne.length, morceaux: bonne.length }
        });
    }
};
