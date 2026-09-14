// LE SERPENT LITTÉRAL — regrouper les termes semblables, pour de vrai.
//
// Rémy voulait « un jeu sympa comme Nova ou le Peintre ». Ces deux-là ont un
// point commun qui fait tout : LE CALCUL EST LE MOUVEMENT. On ne pose pas une
// question entre deux tirs — c'est le déplacement lui-même qui est le calcul.
// Ce module cherche la même chose pour le calcul littéral, chapitre où la 4e
// n'avait aucun jeu (six jeux d'arcade en 4e, contre vingt-sept en 6e).
//
// LA TROUVAILLE : LE CORPS DU SERPENT EST L'EXPRESSION.
//
// Chaque anneau porte un terme, dans l'ordre où on l'a ramassé. Et deux anneaux
// VOISINS qui portent des termes semblables fusionnent aussitôt : le serpent
// raccourcit d'un anneau. C'est tout le jeu, et c'est toute la leçon.
//
//   · Ramasser 2x, puis 3x, puis 5   → [5][3x][2x] → les deux x sont voisins,
//     ils fusionnent → [5][5x]. Deux anneaux.
//   · Ramasser 2x, puis 5, puis 3x   → [3x][5][2x] → le 5 s'est glissé entre
//     les deux x : rien ne fusionne. Trois anneaux, et un serpent plus long est
//     un serpent qui se mord.
//
// L'ORDRE DE RAMASSAGE EST DONC L'ORDRE DE RÉDUCTION, et « on regroupe les
// termes semblables » cesse d'être une consigne : c'est ce qui vous garde en
// vie. Un élève qui croit que 2x + 3 se réduit ramasse dans le désordre, gagne
// des anneaux, et meurt de sa propre erreur sans qu'on lui ait rien dit.
//
// LES FUSIONS S'ENCHAÎNENT, et c'est la récompense du jeu : ramasser 2x, 3x, 4x
// à la file donne [4x][3x][2x] → [7x][2x] → [9x]. Un seul anneau pour trois
// termes.
//
// ET DEUX OPPOSÉS S'ANNULENT. 3x puis −3x donnent 0x, qui n'est pas « un anneau
// portant zéro » mais RIEN DU TOUT : l'anneau disparaît. C'est exact — le terme
// s'en va vraiment de l'expression — et c'est le meilleur coup du jeu.
//
// CE QU'ON NE FAIT PAS. Aucune question n'est posée, aucune réponse n'est
// tapée. Si l'on demandait « combien font 2x + 3x ? » avant de laisser avancer,
// on aurait un questionnaire avec un serpent dessus. La règle de réduction est
// appliquée par le jeu, en silence, et l'élève la découvre en constatant qu'il
// raccourcit.

/** Un terme : un coefficient et un exposant. `{ c: 3, e: 2 }` se lit « 3x² ». */
export const terme = (c, e = 0) => ({ c, e });

export const EXPOSANTS = ['', 'x', 'x²', 'x³'];

/** Deux termes sont SEMBLABLES quand ils portent la même puissance de x. */
export const semblables = (a, b) => !!a && !!b && a.e === b.e;

/** L'écriture d'un terme, telle qu'on l'écrit au tableau. */
export function texteTerme(t, { signe = false } = {}) {
    if (!t) return '';
    // LE MOINS EST UN VRAI SIGNE MOINS, PAS UN TIRET. « 5x -2 » et « 5x − 2 »
    // se ressemblent à l'œil nu ; le second seul est de la typographie
    // mathématique, et l'écart se voyait entre les constantes (tiret) et les
    // termes en x (moins) — deux signes différents dans une même expression.
    const moins = (n) => String(n).replace('-', '−');
    if (t.e === 0) return signe && t.c > 0 ? `+${t.c}` : moins(t.c);
    const part = t.c === 1 ? '' : t.c === -1 ? '−' : moins(t.c);
    const tete = signe && t.c > 0 ? '+' : '';
    return `${tete}${part}${EXPOSANTS[t.e]}`;
}

/**
 * L'EXPRESSION PORTÉE PAR LE CORPS, de la tête à la queue.
 *
 * On l'écrit dans l'ordre des anneaux et non dans l'ordre des degrés : c'est
 * l'expression telle que l'élève l'a ramassée, et c'est elle qu'il doit
 * apprendre à lire. La ranger par degrés décroissants ferait le travail à sa
 * place et cacherait justement ce qu'on lui demande de voir.
 */
export function expression(corps) {
    if (!corps || !corps.length) return '0';
    return corps.map((t, i) => (i ? ` ${texteTerme(t, { signe: true })}` : texteTerme(t)))
        .join('').replace(/ \+/g, ' + ').replace(/ −/g, ' − ');
}

/**
 * RÉDUIRE DEPUIS LA TÊTE, EN CASCADE.
 *
 * On ne réduit pas l'expression entière : seulement ce qui vient de devenir
 * VOISIN de la tête, puis ce que cette fusion rend voisin à son tour. Réduire
 * partout d'un coup rendrait l'ordre de ramassage indifférent — et l'ordre est
 * précisément ce qu'on apprend ici.
 *
 * @returns {{ corps: Array, fusions: number, annulations: number }}
 */
export function reduire(corps) {
    const out = corps.map(t => ({ ...t }));
    let fusions = 0, annulations = 0;
    while (out.length >= 2 && semblables(out[0], out[1])) {
        out[0] = terme(out[0].c + out[1].c, out[0].e);
        out.splice(1, 1);
        fusions += 1;
        // DEUX OPPOSÉS NE LAISSENT PAS UN ANNEAU À ZÉRO : ils ne laissent rien.
        if (out[0].c === 0) { out.shift(); annulations += 1; }
    }
    return { corps: out, fusions, annulations };
}

// --- Le terrain --------------------------------------------------------------

export const SENS = {
    haut: { dx: 0, dy: -1 }, bas: { dx: 0, dy: 1 },
    gauche: { dx: -1, dy: 0 }, droite: { dx: 1, dy: 0 }
};

export const OPPOSE = { haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' };

const cle = (x, y) => `${x},${y}`;

/**
 * LES NIVEAUX, ET CE QUE CHACUN AJOUTE.
 *
 * Un seul ingrédient nouveau par palier — c'est la règle de toutes les
 * progressions de ce catalogue. Les constantes et les x d'abord, parce que
 * « 2x + 3 ne se réduit pas » est LA faute du chapitre ; les carrés ensuite,
 * puisque Rémy les avait demandés (« mets des boutons carrés voire cube ») ;
 * les coefficients négatifs en dernier, parce qu'ils ouvrent les annulations,
 * qui sont le plus joli coup du jeu.
 */
// `vitesse` est la DURÉE d'un pas en millisecondes, et l'écran l'anime
// désormais d'un bout à l'autre au lieu de sauter d'une case à l'autre. Le
// glissement change la perception : 340 ms passaient pour vives quand on
// sautait, elles traînent quand on glisse. Les six paliers sont resserrés
// d'autant.
export const NIVEAUX = [
    { titre: 'Des x et des nombres', large: 11, haut: 11, exposants: [0, 1], negatifs: false, termes: 8, vitesse: 240 },
    { titre: 'Plus de termes', large: 12, haut: 12, exposants: [0, 1], negatifs: false, termes: 11, vitesse: 225 },
    { titre: 'Les carrés arrivent', large: 12, haut: 12, exposants: [0, 1, 2], negatifs: false, termes: 12, vitesse: 215 },
    { titre: 'Carrés et cubes', large: 13, haut: 13, exposants: [0, 1, 2, 3], negatifs: false, termes: 13, vitesse: 205 },
    { titre: 'Les négatifs', large: 13, haut: 13, exposants: [0, 1, 2], negatifs: true, termes: 14, vitesse: 195 },
    { titre: 'Tout à la fois', large: 14, haut: 14, exposants: [0, 1, 2, 3], negatifs: true, termes: 16, vitesse: 185 }
];

/**
 * SEMER LES TERMES, SANS LES SEMER N'IMPORTE COMMENT.
 *
 * Deux garde-fous. On ne pose rien sur le serpent ni juste devant lui — un
 * terme ramassé avant d'avoir pu choisir n'est pas un choix. Et l'on veille à
 * ce que CHAQUE famille présente le soit au moins deux fois : un x² unique sur
 * le terrain ne pourrait fusionner avec rien, et l'anneau qu'il coûte serait
 * une punition sans leçon.
 */
export function semer(rng, niv, occupe = []) {
    const pris = new Set(occupe.map(([x, y]) => cle(x, y)));
    const libres = [];
    for (let y = 0; y < niv.haut; y++) {
        for (let x = 0; x < niv.large; x++) if (!pris.has(cle(x, y))) libres.push([x, y]);
    }
    const places = rng.shuffle(libres).slice(0, niv.termes);
    // Chaque famille au moins deux fois, puis on complète au hasard.
    const familles = [];
    niv.exposants.forEach(e => familles.push(e, e));
    while (familles.length < places.length) familles.push(rng.pick(niv.exposants));
    const tirees = rng.shuffle(familles).slice(0, places.length);
    return places.map(([x, y], i) => {
        const e = tirees[i];
        const amplitude = e === 0 ? 9 : 6;
        let c = rng.int(1, amplitude);
        if (niv.negatifs && rng.bool(0.35)) c = -c;
        return { x, y, t: terme(c, e) };
    });
}

/**
 * LE TERRAIN PREND LA FORME DE L'ÉCRAN, à nombre de cases constant.
 *
 * Les niveaux décrivent des terrains carrés, et un carré sur un téléphone
 * portrait laisse un tiers de la hauteur en blanc — mesuré : 325 px de terrain
 * dans 470 px de place. On garde donc le NOMBRE de cases du niveau, qui est ce
 * qui fait sa difficulté, et l'on redistribue les côtés selon les proportions
 * de la place disponible. Un téléphone joue alors sur 9 × 13 là où un écran
 * large joue sur 11 × 11 : même terrain, même compte, aucune place perdue.
 *
 * Le côté minimal est de huit cases. En deçà, un serpent de quatre anneaux ne
 * peut plus faire demi-tour, et le terrain devient un couloir.
 */
export function formePourEcran(niv, rapport) {
    const cases = niv.large * niv.haut;
    if (!rapport || !isFinite(rapport) || rapport <= 0) return { large: niv.large, haut: niv.haut };
    let large = Math.round(Math.sqrt(cases * rapport));
    large = Math.max(8, Math.min(cases / 8 | 0, large));
    const haut = Math.max(8, Math.round(cases / large));
    return { large, haut };
}

/**
 * L'état de départ d'un niveau.
 *
 * `rapport` est la largeur divisée par la hauteur de la place disponible ;
 * omis, le terrain garde la forme carrée déclarée par le niveau.
 */
export function nouvellePartie(rng, rang, rapport) {
    const base = NIVEAUX[Math.max(0, Math.min(NIVEAUX.length - 1, rang | 0))];
    const niv = { ...base, ...formePourEcran(base, rapport) };
    const x0 = Math.floor(niv.large / 2), y0 = Math.floor(niv.haut / 2);
    // On réserve la case du serpent et les trois devant lui.
    const reserve = [[x0, y0], [x0 + 1, y0], [x0 + 2, y0], [x0 + 3, y0]];
    return {
        niv, rang,
        cases: [[x0, y0]],
        corps: [terme(0, 0)],
        sens: 'droite',
        graines: semer(rng, niv, reserve),
        mange: 0, fusions: 0, annulations: 0,
        fini: null            // 'gagne' | 'mordu' | 'mur'
    };
}

/** Le serpent porte-t-il autre chose que le zéro du départ ? */
const vide = (corps) => corps.length === 1 && corps[0].c === 0 && corps[0].e === 0;

/**
 * UN PAS.
 *
 * @returns {{ etat, quoi: string, dit: string }} — `quoi` vaut 'rien',
 *   'mange', 'fusion', 'annule', 'mur', 'mordu' ou 'gagne'.
 */
export function avancer(etat, sens) {
    if (etat.fini) return { etat, quoi: etat.fini, dit: '' };
    // ON NE FAIT PAS DEMI-TOUR SUR PLACE. Un serpent de deux anneaux qui
    // rebrousse chemin se mange lui-même sans que le joueur l'ait voulu : ce
    // n'est pas une erreur de calcul, et cela ne doit pas coûter la partie.
    const d = (sens && sens !== OPPOSE[etat.sens]) ? sens : etat.sens;
    const v = SENS[d];
    const [hx, hy] = etat.cases[0];
    const nx = hx + v.dx, ny = hy + v.dy;
    const niv = etat.niv;

    if (nx < 0 || ny < 0 || nx >= niv.large || ny >= niv.haut) {
        return { etat: { ...etat, sens: d, fini: 'mur' }, quoi: 'mur',
            dit: 'Le mur. Les bords ne pardonnent pas.' };
    }
    // La queue libère sa case dans le même mouvement : s'y rendre est permis.
    const corpsSansQueue = etat.cases.slice(0, -1);
    if (corpsSansQueue.some(([x, y]) => x === nx && y === ny)) {
        return { etat: { ...etat, sens: d, fini: 'mordu' }, quoi: 'mordu',
            dit: 'Tu t\'es mordu. Un serpent long est un serpent qui se mord — '
                + 'ramasse les termes semblables à la suite pour rester court.' };
    }

    const i = etat.graines.findIndex(g => g.x === nx && g.y === ny);
    if (i < 0) {
        return {
            etat: { ...etat, sens: d, cases: [[nx, ny], ...corpsSansQueue] },
            quoi: 'rien', dit: ''
        };
    }

    // On ramasse : un anneau de plus, puis la réduction depuis la tête.
    const graine = etat.graines[i];
    const brut = vide(etat.corps) ? [graine.t] : [graine.t, ...etat.corps];
    const cases = vide(etat.corps) ? [[nx, ny]] : [[nx, ny], ...etat.cases];
    const { corps, fusions, annulations } = reduire(brut);
    // Chaque fusion retire un anneau — par la queue, pour que le corps reste
    // une chaîne continue de cases voisines.
    const perdus = cases.length - Math.max(1, corps.length);
    const finales = perdus > 0 ? cases.slice(0, cases.length - perdus) : cases;
    const graines = etat.graines.filter((_, k) => k !== i);

    const suite = {
        ...etat, sens: d, cases: finales, corps, graines,
        mange: etat.mange + 1,
        fusions: etat.fusions + fusions,
        annulations: etat.annulations + annulations
    };
    if (!graines.length) {
        return { etat: { ...suite, fini: 'gagne' }, quoi: 'gagne',
            dit: 'Terrain nettoyé.' };
    }
    if (annulations) {
        return { etat: suite, quoi: 'annule',
            dit: `${texteTerme(graine.t)} annule son opposé : l'anneau disparaît.` };
    }
    if (fusions) {
        return { etat: suite, quoi: 'fusion',
            dit: fusions > 1 ? `${fusions} fusions d'un coup !` : 'Termes semblables : ils fusionnent.' };
    }
    return { etat: suite, quoi: 'mange',
        dit: `${texteTerme(graine.t)} ne se regroupe avec rien : un anneau de plus.` };
}

/**
 * LA LONGUEUR IDÉALE D'UN TERRAIN.
 *
 * Autant d'anneaux que de familles semées : c'est ce qu'on obtient en ramassant
 * famille par famille, et c'est la mesure honnête de « bien joué ». On la
 * calcule plutôt que de la deviner, et le jeu s'en sert pour dire à l'élève
 * s'il a rangé ou subi.
 */
export function longueurIdeale(graines) {
    return new Set(graines.map(g => g.t.e)).size || 1;
}

export const CONSIGNE = 'Ramasse tous les termes sans te mordre. '
    + 'Deux anneaux voisins qui se ressemblent fusionnent, et le serpent raccourcit.';
