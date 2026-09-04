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

// --- Le terrain, SANS CASES ---------------------------------------------------
//
// Rémy : « pour le serpent, ne mets pas de case, que ce soit un peu plus
// libre. » La grille disparaît donc, et le serpent glisse où il veut.
//
// CE QUI NE CHANGE PAS D'UNE LIGNE : L'ALGÈBRE. On pourrait croire que
// « deux anneaux VOISINS fusionnent » demandait une grille — il n'en est rien.
// Voisins veut dire voisins DANS LE CORPS, l'anneau i et l'anneau i + 1 : c'est
// une propriété de l'ordre des termes, pas des coordonnées. `reduire` est donc
// intact, et tous ses tests avec lui. Seul le DÉPLACEMENT devient continu.
//
// COMMENT ON REMPLACE LES QUATRE DIRECTIONS. Le serpent porte un CAP, un angle,
// et il tourne vers celui qu'on lui demande à vitesse de virage bornée. C'est
// cette borne qui fait la conduite : sans elle on pivoterait sur place et le
// jeu redeviendrait une grille à quatre directions déguisée ; trop serrée, on
// ne rattrape plus un terme qu'on a dépassé. Elle remplace aussi le vieux
// garde-fou « pas de demi-tour sur place » — un demi-tour prend maintenant du
// temps et de la place, comme pour un vrai serpent.
//
// LE CORPS EST UNE TRACE, PAS UNE LISTE DE CASES. On garde le chemin parcouru
// par la tête, et chaque anneau se pose dessus à sa distance : le premier à
// ESPACEMENT derrière la tête, le deuxième à deux fois, et ainsi de suite. Le
// corps suit donc exactement là où la tête est passée — c'est ce qui donne au
// serpent son ondulation, qu'aucune grille ne sait produire.

/** L'aire de jeu, en unités arbitraires : c'est l'écran qui la met à l'échelle. */
// LA TAILLE D'UN ANNEAU EST UNE QUESTION DE LISIBILITÉ, PAS DE DESSIN.
//
// Chaque anneau porte un terme, et ce terme doit se lire : sur un téléphone,
// l'écriture tombait à 8,7 px avec un rayon de 1,15 — mesuré, et sous le
// plancher qu'on tient partout ailleurs. L'anneau fait donc la même taille que
// les pastilles à ramasser, et l'écartement suit : légèrement inférieur à deux
// rayons, pour que le corps se lise comme un corps continu plutôt que comme un
// collier de perles séparées.
export const RAYON_TETE = 1.35;
export const RAYON_TERME = 1.35;
export const ESPACEMENT = 2.4;      // entre deux anneaux, en unités
const PAS_TRACE = 0.35;             // finesse de la trace gardée

const angle = (dx, dy) => Math.atan2(dy, dx);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * L'ÉCART ENTRE DEUX CAPS, RAMENÉ DANS ]−π, π].
 *
 * Sans cette normalisation, aller de 350° à 10° se lit comme un virage de
 * −340° : le serpent fait presque un tour complet pour vingt degrés.
 */
export function ecartCap(de, vers) {
    let d = (vers - de) % (2 * Math.PI);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return d;
}

/**
 * LES NIVEAUX, ET CE QUE CHACUN AJOUTE.
 *
 * Un seul ingrédient nouveau par palier — c'est la règle de toutes les
 * progressions de ce catalogue. Les constantes et les x d'abord, parce que
 * « 2x + 3 ne se réduit pas » est LA faute du chapitre ; les carrés ensuite,
 * puisque Rémy les avait demandés (« mets des boutons carrés voire cube ») ;
 * les coefficients négatifs en dernier, parce qu'ils ouvrent les annulations,
 * qui sont le plus joli coup du jeu.
 *
 * `large` et `haut` ne comptent plus des cases mais des UNITÉS d'aire ;
 * `vitesse` est en unités par seconde, `virage` en radians par seconde.
 */
export const NIVEAUX = [
    { titre: 'Des x et des nombres', large: 44, haut: 44, exposants: [0, 1], negatifs: false, termes: 8, vitesse: 13, virage: 3.4 },
    { titre: 'Plus de termes', large: 48, haut: 48, exposants: [0, 1], negatifs: false, termes: 11, vitesse: 14, virage: 3.3 },
    { titre: 'Les carrés arrivent', large: 48, haut: 48, exposants: [0, 1, 2], negatifs: false, termes: 12, vitesse: 15, virage: 3.2 },
    { titre: 'Carrés et cubes', large: 52, haut: 52, exposants: [0, 1, 2, 3], negatifs: false, termes: 13, vitesse: 16, virage: 3.1 },
    { titre: 'Les négatifs', large: 52, haut: 52, exposants: [0, 1, 2], negatifs: true, termes: 14, vitesse: 17, virage: 3.0 },
    { titre: 'Tout à la fois', large: 56, haut: 56, exposants: [0, 1, 2, 3], negatifs: true, termes: 16, vitesse: 18, virage: 2.9 }
];

/**
 * L'AIRE PREND LA FORME DE L'ÉCRAN, à surface constante.
 *
 * Même raison qu'avec la grille : un carré sur un téléphone portrait laisse un
 * tiers de la hauteur en blanc. On garde la SURFACE du niveau — c'est elle qui
 * fait la difficulté, puisqu'elle décide de la place qu'on a pour manœuvrer —
 * et l'on redistribue les côtés. Jamais moins de trente unités : en deçà, un
 * serpent de quatre anneaux ne peut plus se retourner.
 */
export function formePourEcran(niv, rapport) {
    const aire = niv.large * niv.haut;
    if (!rapport || !isFinite(rapport) || rapport <= 0) return { large: niv.large, haut: niv.haut };
    let large = Math.round(Math.sqrt(aire * rapport));
    large = Math.max(30, Math.min(Math.round(aire / 30), large));
    const haut = Math.max(30, Math.round(aire / large));
    return { large, haut };
}

/**
 * SEMER LES TERMES, SANS LES SEMER N'IMPORTE COMMENT.
 *
 * Trois garde-fous, et le troisième est nouveau. On ne pose rien trop près du
 * serpent ni devant lui — un terme ramassé avant d'avoir pu choisir n'est pas
 * un choix. Chaque famille présente l'est au moins deux fois : un x² unique ne
 * pourrait fusionner avec rien, et l'anneau qu'il coûte serait une punition
 * sans leçon. Et deux termes ne se touchent pas : sans grille pour les tenir
 * écartés, deux pastilles collées se ramassent d'un seul passage, ce qui
 * retire à l'élève le choix qu'on veut lui laisser.
 */
export function semer(rng, niv, depart) {
    const ECART = RAYON_TERME * 3.2;
    // LE BORD SE MESURE EN RAYONS DE VIRAGE, PAS EN RAYONS DE PASTILLE.
    //
    // Mesuré : un pilote qui fonce au terme le plus proche mourait contre le
    // mur 86 fois sur 180 parties. La faute n'était pas à lui — je semais
    // jusqu'à 2,7 unités du bord alors que le serpent tourne sur un rayon de
    // près de 4. Un terme posé là ne PEUT pas se prendre sans finir dans le
    // mur : ce n'est plus une difficulté, c'est un piège. On garde donc au
    // moins un virage complet de marge, et le bord redevient un endroit qu'on
    // évite plutôt qu'un endroit qui punit.
    const rayonVirage = niv.vitesse / Math.max(0.1, niv.virage);
    const BORD = Math.max(RAYON_TERME * 2, rayonVirage * 1.7);
    const out = [];
    const familles = [];
    niv.exposants.forEach(e => familles.push(e, e));
    while (familles.length < niv.termes) familles.push(rng.pick(niv.exposants));
    const tirees = rng.shuffle(familles).slice(0, niv.termes);

    for (const e of tirees) {
        let p = null;
        for (let essai = 0; essai < 400 && !p; essai++) {
            const c = {
                x: BORD + rng.next() * (niv.large - 2 * BORD),
                y: BORD + rng.next() * (niv.haut - 2 * BORD)
            };
            if (depart && dist(c, depart) < 12) continue;
            if (out.some(g => dist(g, c) < ECART)) continue;
            p = c;
        }
        if (!p) continue;
        const amplitude = e === 0 ? 9 : 6;
        let coef = rng.int(1, amplitude);
        if (niv.negatifs && rng.bool(0.35)) coef = -coef;
        out.push({ x: p.x, y: p.y, t: terme(coef, e) });
    }
    return out;
}

/** L'état de départ d'un niveau. */
export function nouvellePartie(rng, rang, rapport) {
    const base = NIVEAUX[Math.max(0, Math.min(NIVEAUX.length - 1, rang | 0))];
    const niv = { ...base, ...formePourEcran(base, rapport) };
    const depart = { x: niv.large / 2, y: niv.haut / 2 };
    return {
        niv, rang,
        tete: { ...depart },
        cap: 0,                       // vers la droite
        trace: [{ ...depart }],
        corps: [terme(0, 0)],
        graines: semer(rng, niv, depart),
        mange: 0, fusions: 0, annulations: 0,
        fini: null                    // 'gagne' | 'mordu' | 'mur'
    };
}

/** Le serpent porte-t-il autre chose que le zéro du départ ? */
const vide = (corps) => corps.length === 1 && corps[0].c === 0 && corps[0].e === 0;

/**
 * OÙ SE POSENT LES ANNEAUX, le long de la trace.
 *
 * On remonte le chemin parcouru par la tête en cumulant les distances, et l'on
 * dépose un anneau chaque fois qu'on a reculé d'`ESPACEMENT`. Le corps épouse
 * ainsi la courbe exacte que la tête a décrite.
 */
export function anneaux(etat) {
    const n = Math.max(1, etat.corps.length);
    const out = [{ ...etat.tete }];
    let voulu = ESPACEMENT, parcouru = 0;
    for (let i = 1; i < etat.trace.length && out.length < n; i++) {
        const a = etat.trace[i - 1], b = etat.trace[i];
        const d = dist(a, b);
        while (parcouru + d >= voulu && out.length < n) {
            const t = (voulu - parcouru) / (d || 1);
            out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
            voulu += ESPACEMENT;
        }
        parcouru += d;
    }
    // Trace trop courte au démarrage : on empile derrière la tête.
    while (out.length < n) {
        const q = out[out.length - 1];
        out.push({ x: q.x - Math.cos(etat.cap) * ESPACEMENT, y: q.y - Math.sin(etat.cap) * ESPACEMENT });
    }
    return out;
}

/**
 * UN INSTANT DE JEU.
 *
 * @param {Object} etat
 * @param {number} dt      secondes écoulées
 * @param {number|null} capVoulu  l'angle demandé, ou null pour continuer tout droit
 * @returns {{ etat, quoi: string, dit: string }}
 */
export function avancer(etat, dt, capVoulu) {
    if (etat.fini) return { etat, quoi: etat.fini, dit: '' };
    const niv = etat.niv;
    const pas = Math.max(0, Math.min(0.12, dt || 0));   // un écran qui rame ne téléporte pas

    // ① TOURNER, À VITESSE DE VIRAGE BORNÉE.
    let cap = etat.cap;
    if (capVoulu !== null && capVoulu !== undefined && isFinite(capVoulu)) {
        const ecart = ecartCap(cap, capVoulu);
        const max = niv.virage * pas;
        cap += Math.abs(ecart) <= max ? ecart : Math.sign(ecart) * max;
    }

    // ② AVANCER.
    const tete = {
        x: etat.tete.x + Math.cos(cap) * niv.vitesse * pas,
        y: etat.tete.y + Math.sin(cap) * niv.vitesse * pas
    };
    if (tete.x < RAYON_TETE || tete.y < RAYON_TETE
        || tete.x > niv.large - RAYON_TETE || tete.y > niv.haut - RAYON_TETE) {
        return { etat: { ...etat, cap, fini: 'mur' }, quoi: 'mur',
            dit: 'Le mur. Les bords ne pardonnent pas.' };
    }

    // ③ LA TRACE, tenue à la longueur qu'il faut pour porter tout le corps.
    const trace = [...etat.trace];
    if (!trace.length || dist(trace[0], tete) >= PAS_TRACE) trace.unshift({ ...tete });
    else trace[0] = { ...tete };
    const besoin = (Math.max(1, etat.corps.length) + 1) * ESPACEMENT;
    let cumul = 0, coupe = trace.length;
    for (let i = 1; i < trace.length; i++) {
        cumul += dist(trace[i - 1], trace[i]);
        if (cumul > besoin) { coupe = i + 1; break; }
    }
    trace.length = Math.min(trace.length, coupe);

    const suite = { ...etat, cap, tete, trace };

    // ④ SE MORD-ON ? On ignore les trois premiers anneaux : ils touchent la
    //    tête par construction, et les compter tuerait dès le premier virage.
    const corpsLa = anneaux(suite);
    for (let i = 3; i < corpsLa.length; i++) {
        if (dist(tete, corpsLa[i]) < RAYON_TETE * 1.5) {
            return { etat: { ...suite, fini: 'mordu' }, quoi: 'mordu',
                dit: 'Tu t\'es mordu. Un serpent long est un serpent qui se mord — '
                    + 'ramasse les termes semblables à la suite pour rester court.' };
        }
    }

    // ⑤ RAMASSE-T-ON ?
    const i = suite.graines.findIndex(g => dist(g, tete) < RAYON_TETE + RAYON_TERME);
    if (i < 0) return { etat: suite, quoi: 'rien', dit: '' };

    const graine = suite.graines[i];
    const brut = vide(etat.corps) ? [graine.t] : [graine.t, ...etat.corps];
    const { corps, fusions, annulations } = reduire(brut);
    const graines = suite.graines.filter((_, k) => k !== i);
    const apres = { ...suite, corps, graines,
        mange: etat.mange + 1,
        fusions: etat.fusions + fusions,
        annulations: etat.annulations + annulations };

    if (!graines.length) {
        return { etat: { ...apres, fini: 'gagne' }, quoi: 'gagne', dit: 'Terrain nettoyé.' };
    }
    if (annulations) {
        return { etat: apres, quoi: 'annule',
            dit: `${texteTerme(graine.t)} annule son opposé : l'anneau disparaît.` };
    }
    if (fusions) {
        return { etat: apres, quoi: 'fusion',
            dit: fusions > 1 ? `${fusions} fusions d'un coup !` : 'Termes semblables : ils fusionnent.' };
    }
    return { etat: apres, quoi: 'mange',
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
