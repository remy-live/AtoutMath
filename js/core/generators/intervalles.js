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

// ── L'AXE, DESSINÉ ──────────────────────────────────────────────────────────

const L = 320;        // largeur du dessin, en unités de vue
const H = 54;         // hauteur : la droite, les crochets, les graduations
const Y = 26;         // hauteur de la droite dans le dessin
const MARGE = 18;     // de quoi loger une flèche et une étiquette aux bouts

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

/** Un crochet, tourné du bon côté. */
function crochet(x, ferme, versLaDroite) {
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
        + `M ${x} ${Y + 11} L ${x + d} ${Y + 11}" fill="none" stroke="currentColor" `
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
    const f = fenetre(Math.min(...bornes), Math.max(...bornes));

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
                + `fill="currentColor">${v}</text>`;
        }
    }

    vivants.forEach((p, i) => {
        const dy = i * 14;
        const x1 = p.a === null ? 6 : versX(p.a, f);
        const x2 = p.b === null ? L - 6 : versX(p.b, f);
        const teinte = p.teinte || 'currentColor';
        g += `<g transform="translate(0 ${-dy})" ${p.teinte ? `style="color:${p.teinte}"` : ''}>`;
        // LA BANDE DE L'INTERVALLE, ÉPAISSE : c'est elle qui dit d'un coup d'œil
        // OÙ l'on est, avant même qu'on lise les crochets.
        g += `<path d="M ${x1} ${Y - 16} L ${x2} ${Y - 16}" stroke="${teinte}" `
            + `stroke-width="6" stroke-linecap="butt" fill="none" opacity=".5"/>`;
        if (p.a !== null) g += crochet(x1, p.ea, true);
        if (p.b !== null) g += crochet(x2, p.eb, false);
        // Vers l'infini, une flèche plutôt qu'un crochet : c'est ce qui se
        // dessine au tableau, et cela redit que la borne n'est pas atteinte.
        if (p.a === null) g += `<path d="M 6 ${Y - 16} l 9 -5 l 0 10 z" fill="${teinte}"/>`;
        if (p.b === null) g += `<path d="M ${L - 6} ${Y - 16} l -9 -5 l 0 10 z" fill="${teinte}"/>`;
        g += `</g>`;
    });

    const titre = opts.titre || 'Droite graduée';
    return `<svg class="iv-axe" viewBox="0 -${hauteur - H} ${L} ${hauteur}" `
        + `role="img" aria-label="${titre}" style="max-width:100%;height:auto">${g}</svg>`;
}

// ── LES TROIS ÉCRITURES ─────────────────────────────────────────────────────

const INF = '∞';
const LE = '⩽';   // ⩽ — celui du programme français, pas le ≤ anglo-saxon
const GE = '⩾';   // ⩾

/** `]2 ; 5]`, `]−∞ ; 3[`, `[0 ; +∞[` */
export function intervalleTexte(I) {
    const g = I.a === null ? `]−${INF}` : `${I.ea ? '[' : ']'}${I.a}`;
    const d = I.b === null ? `+${INF}[` : `${I.b}${I.eb ? ']' : '['}`;
    return `${g} ; ${d}`;
}

/** `2 < x ⩽ 5`, `x ⩾ 0`, `x < 3` */
export function inegaliteTexte(I) {
    if (I.a === null) return `x ${I.eb ? LE : '<'} ${I.b}`;
    if (I.b === null) return `x ${I.ea ? GE : '>'} ${I.a}`;
    return `${I.a} ${I.ea ? LE : '<'} x ${I.eb ? LE : '<'} ${I.b}`;
}

/** La phrase du manuel : « x est un réel compris entre −5 exclu et 7 inclus ». */
export function phraseTexte(I) {
    if (I.a === null) return `x est un réel ${I.eb ? 'inférieur ou égal' : 'strictement inférieur'} à ${I.b}`;
    if (I.b === null) return `x est un réel ${I.ea ? 'supérieur ou égal' : 'strictement supérieur'} à ${I.a}`;
    return `x est un réel compris entre ${I.a} ${I.ea ? 'inclus' : 'exclu'} `
        + `et ${I.b} ${I.eb ? 'inclus' : 'exclu'}`;
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
                + `${I.ea ? a + ' qui est PRIS' : a + ' qui est LAISSÉ'} et `
                + `${I.eb ? b + ' qui est PRIS' : b + ' qui est LAISSÉ'}.` });
        l.push({ I: { ...I, ea: !I.ea },
            why: `La borne ${a} est du mauvais côté du crochet.` });
        l.push({ I: { ...I, eb: !I.eb },
            why: `La borne ${b} est du mauvais côté du crochet.` });
        l.push({ I: { a: b, b: a, ea: I.eb, eb: I.ea },
            why: 'Les deux bornes sont échangées : un intervalle s\'écrit toujours '
                + 'du plus petit vers le plus grand.' });
    } else {
        const fini = a === null ? b : a;
        l.push({ I: { ...I, ea: a === null ? I.ea : !I.ea, eb: b === null ? I.eb : !I.eb },
            why: `La borne ${fini} est du mauvais côté du crochet.` });
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
    const g = I.a === null ? `[−${INF}` : `${I.ea ? '[' : ']'}${I.a}`;
    const d = I.b === null ? `+${INF}]` : `${I.b}${I.eb ? ']' : '['}`;
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
                `Ici, ${I.a !== null ? `${I.a} est ${I.ea ? 'PRIS' : 'LAISSÉ'}` : 'on va vers −∞'}`
                    + ` et ${I.b !== null ? `${I.b} est ${I.eb ? 'PRIS' : 'LAISSÉ'}` : 'on va vers +∞'}.`
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
