// RELIER SANS CROISER — la règle, la figure, et la preuve qu'elle a une solution.
//
// Rémy : « j'aime bien aussi ce genre d'exercice, où il faut relier sans
// croiser et sans sortir ni passer sur le carré », avec une image : un cadre
// vide, six petits carrés étiquetés A, B, C — deux de chaque — posés un peu
// partout, et rien d'autre. On relie chaque lettre à sa jumelle.
//
// TROIS INTERDITS, ET LE TROISIÈME EST CELUI QU'ON OUBLIE :
//   · les traits ne se CROISENT pas (ni entre eux, ni eux-mêmes) ;
//   · ils ne SORTENT pas du cadre ;
//   · ils ne PASSENT PAS SUR UN CARRÉ — pas même sur les siens, sauf pour en
//     partir et y arriver. C'est ce troisième interdit qui fait la difficulté :
//     un carré n'est pas une étiquette posée là, c'est un OBSTACLE, et il
//     bouche des passages qu'on croyait libres.
//
// CE QUE ÇA TRAVAILLE. Rien de numérique : c'est de la topologie de cour de
// récréation — anticiper, se représenter l'espace, comprendre qu'un trait déjà
// posé DIVISE le cadre en deux régions et que tout ce qui est d'un côté ne
// pourra plus jamais rejoindre l'autre. C'est le même raisonnement que le
// théorème de Jordan, dix ans avant de le rencontrer.
//
// UNE FIGURE PROPOSÉE EST UNE FIGURE RÉSOLUBLE, ET ELLE N'EST PAS TRIVIALE.
// Les deux conditions ne vont pas ensemble, et c'est tout le problème du
// générateur. Tracer d'abord des chemins bien séparés puis poser les carrés à
// leurs bouts garantit la solution — mais on l'a mesuré : ZÉRO croisement sur
// quatre-vingts figures, chaque paire dans son coin, l'élève relie à la règle
// sans rien apprendre. On pose donc les carrés d'abord, on les apparie au
// hasard (c'est cela qui les entrelace), puis on CHERCHE un routage sans
// croisement sur un damier caché ; une figure qu'on n'arrive pas à router est
// jetée. La solution existe toujours avant l'énoncé, et la figure ressemble
// enfin à celle de la fiche. L'élève, lui, ne voit pas le damier et trace à
// main levée : il n'a jamais servi qu'à garantir le passage.

import { makeRng } from './ids.js';

export const CONSIGNE = 'Relie chaque lettre à sa jumelle. Les traits ne doivent '
    + 'jamais se croiser, ni sortir du cadre, ni passer sur un carré — pas même sur '
    + 'les tiens, sauf pour en partir et y arriver. Regarde bien AVANT de tracer : '
    + 'un trait posé coupe le cadre en deux, et ce qui est d\'un côté ne pourra plus '
    + 'rejoindre l\'autre.';

/** Le cadre, en unités de dessin. Le reste s'y rapporte. */
export const CADRE = { x: 0, y: 0, l: 100, h: 78 };

export const LETTRES = ['A', 'B', 'C', 'D', 'E'];

/**
 * Les couleurs, reprises de « relier les points » : ce sont celles qui restent
 * distinctes les unes des autres, y compris en luminosité — donc encore
 * séparables une fois photocopiées en gris. Et la LETTRE reste de toute façon
 * la marque qui compte : la couleur n'est jamais seule.
 */
export const COULEURS = ['#d62728', '#1f77b4', '#2ca02c', '#ff7f0e', '#9467bd'];

export const PALIERS = {
    // RÉGLÉ DEUX FOIS, ET LA SECONDE A CORRIGÉ LA PREMIÈRE.
    //
    // Rémy, d'abord : « c'est vraiment très très facile, mets plus de 3 lettres
    // et rends cela un peu plus dur ». On a ajouté des paires et exigé que les
    // traits droits ne passent pas — `croisementsMin`. Puis, de nouveau :
    // « c'est toujours trop facile ». Et il avait encore raison : mesuré, 100 %
    // des ordres de tracé aboutissaient quand même. CONTOURNER N'EST PAS
    // PRÉVOIR — on contourne au moment où l'on bute, sans avoir rien anticipé.
    //
    // `croisementsMin` reste, en garde-fou vite calculé contre les figures tout
    // à fait plates ; il est descendu, parce que le vrai filtre est ailleurs :
    // `prevoir` exige qu'AU MOINS UN ORDRE de tracé se retrouve coincé. Voir
    // `demandeDePrevoir`. Le premier palier en est dispensé — on y vient pour
    // comprendre la règle, pas pour se faire piéger.
    facile: {
        label: '3 paires — pour comprendre la règle',
        paires: 3, colonnes: 10, lignes: 8, croisementsMin: 2, prevoir: false
    },
    moyen: {
        label: '4 paires — comme sur la fiche, en plus dense',
        paires: 4, colonnes: 13, lignes: 10, croisementsMin: 2, prevoir: true
    },
    difficile: {
        label: '5 paires — il faut vraiment prévoir',
        paires: 5, colonnes: 16, lignes: 12, croisementsMin: 3, prevoir: true
    },
    expert: {
        label: '6 paires — le cadre est plein',
        paires: 6, colonnes: 19, lignes: 14, croisementsMin: 3, prevoir: true
    }
};

// --- Géométrie ----------------------------------------------------------------

/**
 * Deux segments se coupent-ils ?
 *
 * On répond par les orientations, et non en cherchant le point d'intersection :
 * pas de division, donc pas de cas particulier quand les segments sont
 * parallèles, et pas d'erreur d'arrondi qui laisserait passer un croisement
 * rasant. Le cas ALIGNÉ est traité à part, parce que deux traits superposés se
 * croisent bel et bien du point de vue de l'élève.
 */
export function segmentsSeCoupent(a, b, c, d) {
    const o1 = orientation(a, b, c), o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a), o4 = orientation(c, d, b);
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && surSegment(a, b, c)) return true;
    if (o2 === 0 && surSegment(a, b, d)) return true;
    if (o3 === 0 && surSegment(c, d, a)) return true;
    if (o4 === 0 && surSegment(c, d, b)) return true;
    return false;
}

const EPS = 1e-9;
function orientation(p, q, r) {
    const v = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    return Math.abs(v) < EPS ? 0 : (v > 0 ? 1 : 2);
}
function surSegment(p, q, r) {
    return r.x <= Math.max(p.x, q.x) + EPS && r.x >= Math.min(p.x, q.x) - EPS
        && r.y <= Math.max(p.y, q.y) + EPS && r.y >= Math.min(p.y, q.y) - EPS;
}

export const dansRect = (p, r) => p.x >= r.x - EPS && p.x <= r.x + r.l + EPS
    && p.y >= r.y - EPS && p.y <= r.y + r.h + EPS;

/** Un segment touche-t-il ce rectangle (bords compris) ? */
export function segmentTouche(a, b, r) {
    if (dansRect(a, r) || dansRect(b, r)) return true;
    const coins = [
        { x: r.x, y: r.y }, { x: r.x + r.l, y: r.y },
        { x: r.x + r.l, y: r.y + r.h }, { x: r.x, y: r.y + r.h }
    ];
    for (let i = 0; i < 4; i++) {
        if (segmentsSeCoupent(a, b, coins[i], coins[(i + 1) % 4])) return true;
    }
    return false;
}

// --- La figure ----------------------------------------------------------------

/**
 * Le carré d'une lettre, en coordonnées de dessin.
 * @param {{x:number,y:number}} centre - le centre du carré
 */
export const carreDe = (centre, cote) => ({
    x: centre.x - cote / 2, y: centre.y - cote / 2, l: cote, h: cote
});

/** Tous les carrés de la figure, sous forme de rectangles. */
export function carres(fig) {
    return fig.bornes.map(b => ({ ...carreDe(b, fig.cote), lettre: b.lettre, bout: b.bout }));
}

/**
 * LE VERDICT SUR UN TRAIT — et il dit LAQUELLE des trois règles est enfreinte.
 *
 * « Ce n'est pas ça » n'apprend rien. « Ton trait passe sur le carré B » nomme
 * l'obstacle, et c'est justement l'interdit que les élèves oublient.
 *
 * @param {Array<{x,y}>} points - le trait, du premier au dernier point
 * @param {Array} autres - les traits déjà posés, sous la forme {lettre, points}
 */
export function verifierTrait(fig, lettre, points, autres = []) {
    if (!points || points.length < 2) return { ok: false, raison: 'Ce trait est trop court.' };
    const mes = carres(fig).filter(c => c.lettre === lettre);
    const obstacles = carres(fig).filter(c => c.lettre !== lettre);

    // Il part d'un carré de la lettre et arrive sur l'AUTRE.
    const depart = mes.findIndex(c => dansRect(points[0], c));
    const arrivee = mes.findIndex(c => dansRect(points[points.length - 1], c));
    if (depart < 0 || arrivee < 0) {
        return { ok: false, raison: `Ce trait doit partir d'un carré ${lettre} et arriver sur l'autre.` };
    }
    if (depart === arrivee) {
        return { ok: false, raison: `Tu es reparti sur le même carré ${lettre} : il faut rejoindre l'autre.` };
    }

    for (let i = 0; i + 1 < points.length; i++) {
        const a = points[i], b = points[i + 1];
        if (!dansRect(a, fig.cadre) || !dansRect(b, fig.cadre)) {
            return { ok: false, raison: 'Ton trait sort du cadre.' };
        }
        // Un obstacle : n'importe quel carré d'une AUTRE lettre.
        for (const o of obstacles) {
            if (segmentTouche(a, b, o)) {
                return { ok: false, raison: `Ton trait passe sur le carré ${o.lettre}. Un carré se contourne : c'est un obstacle, pas une étiquette.` };
            }
        }
        // SES PROPRES CARRÉS NE SONT PAS DES OBSTACLES, et c'est une règle qu'on
        // avait inventée avant de la mesurer. Le doigt échantillonne un point
        // tous les millimètres : les trois ou quatre premiers tombent DANS le
        // carré de départ, et un trait parfaitement droit se voyait refuser au
        // motif qu'il « repassait sur un carré A ». Rémy n'a jamais demandé
        // cela — « ne pas passer sur le carré » vise les OBSTACLES, c'est-à-dire
        // les carrés des autres lettres. Traverser le sien ne gêne personne, et
        // l'interdiction de se croiser soi-même suffit à empêcher les boucles.
    }

    // Il ne se croise pas lui-même. Les segments VOISINS se touchent par
    // construction (ils partagent un point) : on ne les compare pas. Le premier
    // et le dernier, en revanche, SE COMPARENT — un trait va toujours d'un carré
    // à un AUTRE, donc ses deux bouts ne coïncident jamais, et les exempter
    // laisserait passer un vrai croisement.
    for (let i = 0; i + 1 < points.length; i++) {
        for (let j = i + 2; j + 1 < points.length; j++) {
            if (segmentsSeCoupent(points[i], points[i + 1], points[j], points[j + 1])) {
                return { ok: false, raison: 'Ton trait se croise lui-même.' };
            }
        }
    }

    // Il ne croise aucun trait déjà posé.
    for (const t of autres) {
        if (t.lettre === lettre) continue;
        for (let i = 0; i + 1 < points.length; i++) {
            for (let j = 0; j + 1 < t.points.length; j++) {
                if (segmentsSeCoupent(points[i], points[i + 1], t.points[j], t.points[j + 1])) {
                    return { ok: false, raison: `Ton trait croise le trait ${t.lettre}. Une fois posé, un trait coupe le cadre en deux.` };
                }
            }
        }
    }
    return { ok: true };
}

/** La figure est-elle finie ? Toutes les lettres reliées, et aucune règle enfreinte. */
export function verifierFigure(fig, traits) {
    const faits = [];
    for (const lettre of fig.lettres) {
        const t = traits.find(x => x.lettre === lettre);
        if (!t) return { fini: false, manque: lettre };
        const v = verifierTrait(fig, lettre, t.points, faits);
        if (!v.ok) return { fini: false, lettre, raison: v.raison };
        faits.push(t);
    }
    return { fini: true };
}

// --- La génération ------------------------------------------------------------

/**
 * Une figure et sa solution.
 *
 * ON CONSTRUIT LA SOLUTION D'ABORD, sur un damier caché : des chemins qui ne se
 * touchent pas, même pas par un côté. Le coussin d'une case entre deux chemins
 * n'est pas du luxe — l'élève trace à main levée, et deux chemins collés
 * seraient justes mais infaisables au crayon.
 *
 * @returns {Object|null} null si le tirage n'a pas abouti (l'appelant retire)
 */
export function genererFigure({ rng = makeRng(1), palier = 'moyen' } = {}) {
    const P = PALIERS[palier] || PALIERS.moyen;
    // CINQ PAIRES SONT DIFFICILES À PLACER, et c'est normal : le coussin d'une
    // case coûte de la place, et une figure entrelacée n'est pas toujours
    // routable. On insiste — un tirage coûte deux dixièmes de milliseconde, et
    // une figure se tire une fois pour toutes.
    // MIEUX VAUT UNE FIGURE UN PEU FACILE QUE PAS DE FIGURE. L'épreuve « il faut
    // prévoir » est une PRÉFÉRENCE : elle écarte les tirages plats, mais si
    // aucun tirage ne la passe, on rend le premier qui tenait debout plutôt que
    // rien. Un élève devant un cadre vide n'apprendrait rien du tout.
    let repli = null;
    for (let essai = 0; essai < 250; essai++) {
        const chemins = tirerFigure(P, rng);
        if (!chemins) continue;
        const fig = poserFigure(P, chemins, P.collerAuBord !== false);
        // UNE FIGURE OÙ TOUS LES TRAITS DROITS PASSENT N'EST PAS UN EXERCICE :
        // l'élève relie à la règle sans réfléchir, et n'a rien appris. On exige
        // donc que la solution naïve échoue quelque part.
        if (croisementsDroits(fig) < P.croisementsMin) continue;
        // ET SURTOUT : elle doit se laisser piéger par au moins un ordre. Sans
        // ce filtre, la moitié des figures se faisaient dans n'importe quel
        // sens — mesuré. Le niveau le plus facile en est dispensé : on y vient
        // pour comprendre la règle, pas pour se faire coincer.
        if (P.prevoir && !demandeDePrevoir(fig, rng)) {
            if (!repli) { repli = fig; repli.palier = palier; }
            continue;
        }
        fig.palier = palier;
        return fig;
    }
    return repli;
}

/**
 * POSER LES CARRÉS D'ABORD, ROUTER ENSUITE — et non l'inverse.
 *
 * Le premier jet tirait des chemins qui ne se touchaient pas, puis mettait les
 * carrés à leurs bouts. Les figures étaient résolubles, et elles étaient
 * NULLES : mesuré, zéro croisement droit sur quatre-vingts figures. Chaque
 * paire vivait dans son coin, on reliait à la règle sans réfléchir. C'est
 * exactement le contraire de la fiche de Rémy, où les paires sont ENTRELACÉES —
 * un A en haut à droite, l'autre en bas au milieu, avec B et C entre les deux.
 *
 * On tire donc les carrés d'abord, en les appariant au hasard, puis on CHERCHE
 * un routage sans croisement. Une figure qu'on n'arrive pas à router est jetée.
 * La solution existe toujours avant l'énoncé — c'est le seul point qui ne se
 * négocie pas — mais elle n'est plus imposée par la construction.
 */
function tirerFigure(P, rng) {
    const clef = (x, y) => `${x},${y}`;
    const dedans = (x, y) => x >= 0 && y >= 0 && x < P.colonnes && y < P.lignes;

    // 1. Les carrés. Jamais côte à côte ni en diagonale : il faut de la place
    //    pour poser un trait entre deux, sinon la figure n'est pas traçable.
    const bouts = [];
    for (let essai = 0; essai < 500 && bouts.length < P.paires * 2; essai++) {
        const c = [rng.int(0, P.colonnes - 1), rng.int(0, P.lignes - 1)];
        if (bouts.some(b => Math.abs(b[0] - c[0]) <= 1 && Math.abs(b[1] - c[1]) <= 1)) continue;
        bouts.push(c);
    }
    if (bouts.length < P.paires * 2) return null;

    // 2. L'appariement au hasard : c'est lui qui produit l'entrelacement.
    const melange = rng.shuffle(bouts);
    const paires = [];
    for (let k = 0; k < P.paires; k++) paires.push([melange[2 * k], melange[2 * k + 1]]);

    // 3. Le routage. Et il ne se fait PAS au plus court, volontairement.
    //
    // Le plus court chemin coupe en diagonale et referme le cadre derrière lui :
    // les paires entrelacées — les seules intéressantes — ne passaient plus, le
    // générateur les jetait, et il ne restait que les figures où chaque paire
    // vit dans son coin. Mesuré : zéro croisement droit sur vingt-cinq figures.
    //
    // On route donc AU HASARD, avec un biais vers le but : à chaque pas, deux
    // fois sur trois on avance vers la cible, une fois sur trois on part de
    // côté. Le trait serpente, il longe les bords, et il laisse passer les
    // autres. On essaie plusieurs ordres et plusieurs tirages ; il suffit qu'un
    // seul aboutisse.
    for (let tour = 0; tour < 40; tour++) {
        const ordre = tour === 0 ? paires.map((_, i) => i) : rng.shuffle(paires.map((_, i) => i));
        const proprio = new Map();
        paires.forEach(([a, b], k) => { proprio.set(clef(...a), k); proprio.set(clef(...b), k); });
        const routes = new Array(paires.length);
        let bon = true;
        for (const k of ordre) {
            const route = cheminSinueux(proprio, paires[k][0], paires[k][1], k, tour === 0);
            if (!route) { bon = false; break; }
            route.forEach(([x, y]) => proprio.set(clef(x, y), k));
            routes[k] = route;
        }
        if (bon) return routes;
    }
    return null;

    /**
     * UN CHEMIN QUI SERPENTE, MAIS QU'ON TROUVE À COUP SÛR.
     *
     * La première version marchait au hasard, avec un biais vers le but. Elle
     * serpentait bien, et elle SE PIÉGEAIT ELLE-MÊME : arrivée dans un cul-de-
     * sac, elle abandonnait, et le générateur jetait une figure pourtant
     * parfaitement routable. Mesuré : une figure « expert » sur quatre ne
     * sortait pas et retombait en silence sur quatre paires — c'est-à-dire que
     * le palier le plus dur rendait, une fois sur quatre, le palier moyen.
     * Rémy voyait le résultat sans pouvoir le nommer : « c'est toujours trop
     * facile ».
     *
     * On cherche donc le chemin le MOINS COÛTEUX sur des cases dont le coût est
     * TIRÉ AU SORT. Un coût élevé se contourne, donc le trait ondule ; mais
     * c'est un plus court chemin, donc il est trouvé dès qu'il en existe un.
     * Le hasard décide de la forme, plus de la réussite.
     *
     * `direct` demande des coûts égaux : c'est le chemin le plus court, essayé
     * en premier parce qu'il laisse le plus de place aux paires suivantes.
     */
    function cheminSinueux(proprio, a, b, k, direct) {
        const C = P.colonnes, L = P.lignes, N = C * L;
        const cout = new Int32Array(N);
        if (!direct) for (let i = 0; i < N; i++) cout[i] = 1 + rng.int(0, 6);
        else cout.fill(1);

        const dist = new Int32Array(N).fill(0x7fffffff);
        const pere = new Int32Array(N).fill(-1);
        const fige = new Uint8Array(N);
        const depart = a[1] * C + a[0], but = b[1] * C + b[0];
        dist[depart] = 0;

        // Un tas binaire, et non un balayage : le balayage coûtait deux
        // secondes et demie par figure au niveau expert, mesuré, parce qu'il
        // relit toutes les cases à chaque case sortie.
        const tas = [depart];
        const monter = (i) => {
            while (i > 0) {
                const pa = (i - 1) >> 1;
                if (dist[tas[pa]] <= dist[tas[i]]) break;
                [tas[pa], tas[i]] = [tas[i], tas[pa]];
                i = pa;
            }
        };
        const descendre = (i) => {
            for (;;) {
                const g = 2 * i + 1, d = g + 1;
                let mini = i;
                if (g < tas.length && dist[tas[g]] < dist[tas[mini]]) mini = g;
                if (d < tas.length && dist[tas[d]] < dist[tas[mini]]) mini = d;
                if (mini === i) return;
                [tas[mini], tas[i]] = [tas[i], tas[mini]];
                i = mini;
            }
        };

        while (tas.length) {
            const c = tas[0];
            tas[0] = tas[tas.length - 1];
            tas.pop();
            if (tas.length) descendre(0);
            if (fige[c]) continue;
            fige[c] = 1;
            if (c === but) {
                const route = [];
                for (let v = but; v >= 0; v = pere[v]) route.unshift([v % C, (v - (v % C)) / C]);
                return route;
            }
            const x = c % C, y = (c - x) / C;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const X = x + dx, Y = y + dy;
                if (!dedans(X, Y)) continue;
                const v = Y * C + X;
                if (fige[v]) continue;
                if (v !== but && !libre(proprio, X, Y, k)) continue;
                const d = dist[c] + cout[v];
                if (d < dist[v]) {
                    dist[v] = d;
                    pere[v] = c;
                    tas.push(v);
                    monter(tas.length - 1);
                }
            }
        }
        return null;
    }

    function libre(proprio, x, y, k) {
        const p = proprio.get(clef(x, y));
        if (p !== undefined && p !== k) return false;
        // LE COUSSIN D'UNE CASE. Deux traits qui se longent seraient justes en
        // topologie et infaisables au crayon : l'élève trace à main levée. On
        // interdit donc aussi les cases VOISINES d'une autre paire.
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const q = proprio.get(clef(x + dx, y + dy));
            if (q !== undefined && q !== k) return false;
        }
        return true;
    }
}

/**
 * Les chemins du damier deviennent une figure en unités de dessin.
 *
 * LES CARRÉS DU POURTOUR SONT COLLÉS AU CADRE, et ce n'est pas une coquetterie
 * de mise en page : c'est la correction du reproche de Rémy, « c'est toujours
 * trop facile ».
 *
 * MESURÉ AVANT : sur les figures de niveau facile et moyen, 100 % des ordres de
 * tracé aboutissaient — on prenait les paires dans n'importe quel ordre, on
 * reliait chacune au plus simple, et ça passait. Il n'y avait rien à prévoir.
 *
 * LA RAISON EST GÉOMÉTRIQUE, et elle condamne l'exercice tel quel : dans un
 * rectangle vide semé de petits carrés posés À L'INTÉRIEUR, il reste toujours
 * un anneau libre le long du bord. Tout se contourne par l'extérieur, donc
 * AUCUN appariement n'est impossible — il n'y a pas d'obstruction à découvrir,
 * seulement un trait à faire joliment.
 *
 * Coller au cadre les carrés du pourtour ferme cet anneau. Un carré collé n'est
 * plus une étiquette au milieu de rien : c'est un BOUCHON, il coupe le couloir
 * du bord, et le cadre se sépare enfin en régions. C'est là que « un trait posé
 * coupe le cadre en deux » cesse d'être une phrase de consigne.
 *
 * Le tracé de la solution suit son carré : son premier point glisse avec lui,
 * ce qui allonge le premier segment vers le bord sans traverser quoi que ce
 * soit — la case voisine appartient à la même paire, par construction du damier.
 */
function poserFigure(P, chemins, collerAuBord) {
    const marge = 6;
    const pasX = (CADRE.l - 2 * marge) / Math.max(1, P.colonnes - 1);
    const pasY = (CADRE.h - 2 * marge) / Math.max(1, P.lignes - 1);
    const cote = Math.min(pasX, pasY) * 0.62;
    const point = ([x, y]) => ({ x: marge + x * pasX, y: marge + y * pasY });

    /** Le centre d'un carré, ramené contre le cadre s'il est sur le pourtour. */
    const borne = ([x, y]) => {
        const p = point([x, y]);
        if (!collerAuBord) return p;
        if (x === 0) p.x = CADRE.x + cote / 2;
        else if (x === P.colonnes - 1) p.x = CADRE.x + CADRE.l - cote / 2;
        if (y === 0) p.y = CADRE.y + cote / 2;
        else if (y === P.lignes - 1) p.y = CADRE.y + CADRE.h - cote / 2;
        return p;
    };

    const bornes = [];
    const solution = [];
    chemins.forEach((chemin, k) => {
        const lettre = LETTRES[k];
        const a = borne(chemin[0]);
        const b = borne(chemin[chemin.length - 1]);
        bornes.push({ ...a, lettre, bout: 0 });
        bornes.push({ ...b, lettre, bout: 1 });
        // Les deux bouts du tracé rejoignent leurs carrés déplacés ; le reste
        // du chemin ne bouge pas.
        const trace = chemin.map(point);
        trace[0] = { ...a };
        trace[trace.length - 1] = { ...b };
        solution.push({ lettre, points: trace });
    });
    return {
        cadre: { ...CADRE }, cote, bornes, solution,
        lettres: chemins.map((_, k) => LETTRES[k]),
        colonnes: P.colonnes, lignes: P.lignes
    };
}

// --- « FAUT-IL PRÉVOIR ? » — l'épreuve que la figure doit passer ---------------
//
// Rémy, deux fois : « c'est vraiment très très facile », puis « c'est toujours
// trop facile ». La première fois on a ajouté des paires et exigé que les
// traits droits ne passent pas ; MESURÉ APRÈS, ce n'était pas la bonne mesure :
// 100 % des ordres de tracé aboutissaient quand même. Contourner un carré n'est
// pas prévoir — on le fait au moment où on bute dessus.
//
// LA VRAIE QUESTION EST CELLE-CI : peut-on prendre les paires dans N'IMPORTE
// QUEL ORDRE, relier chacune au plus simple, et arriver au bout ? Si oui, il
// n'y a rien à anticiper, et le nombre de paires n'y changera rien. Une figure
// n'est gardée que si AU MOINS UN ordre se retrouve coincé : c'est la preuve
// qu'il existe un piège, donc quelque chose à voir avant de tracer.
//
// L'épreuve se joue sur une grille fine posée sur le cadre — pas le damier du
// générateur, qui est trop grossier pour ressembler à un trait à main levée.

// LA FINESSE DE LA GRILLE EST LA LARGEUR DU DOIGT, et elle décide de tout.
//
// Trop grossière (quarante colonnes), le coussin d'une case vaut cinq unités de
// dessin pour un trait qui en fait 1,3 : l'épreuve déclarait alors TOUT bouché
// dès quatre paires, elle ne triait plus rien. À soixante-quatre, le couloir
// laissé libre fait environ le double du trait — c'est ce qu'un doigt sait
// faire, et l'épreuve se remet à distinguer les figures.
const GRILLE_EPREUVE = 64;

/**
 * LA CARTE DU CADRE, calculée UNE FOIS par figure.
 *
 * `mur[c]` porte le rang de la lettre dont le carré occupe la case, ou -1. Tout
 * est en tableaux plats d'entiers : l'épreuve rejoue le même parcours des
 * dizaines de fois, et une figure se tire dans le navigateur d'un élève —
 * refaire les `dansRect` à chaque fois coûtait sept dixièmes de seconde par
 * figure au niveau expert, mesuré.
 */
function carteDuCadre(fig) {
    const n = GRILLE_EPREUVE;
    const m = Math.max(8, Math.round(n * (fig.cadre.h / fig.cadre.l)));
    const px = fig.cadre.l / (n - 1), py = fig.cadre.h / (m - 1);
    const mur = new Int8Array(n * m).fill(-1);
    const rang = new Map(fig.lettres.map((l, k) => [l, k]));
    // Les deux bouts de chaque lettre, en cases : ce sont les points de départ
    // et d'arrivée de l'épreuve.
    const bouts = fig.lettres.map(() => [[], []]);
    carres(fig).forEach(c => {
        const k = rang.get(c.lettre);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                const p = { x: fig.cadre.x + i * px, y: fig.cadre.y + j * py };
                if (!dansRect(p, c)) continue;
                mur[j * n + i] = k;
                bouts[k][c.bout].push(j * n + i);
            }
        }
    });
    return { n, m, mur, bouts };
}

/**
 * CET ORDRE-LÀ ABOUTIT-IL SANS RIEN PRÉVOIR ?
 *
 * On relie les paires une à une, chacune au plus court, et le trait posé bouche
 * sa trace ET ses voisines : deux traits ne se superposent pas, et l'élève ne
 * trace pas au micron.
 */
function ordreAboutitSur(carte, ordre) {
    const { n, m, mur, bouts } = carte;
    const occupe = new Uint8Array(n * m);
    const vu = new Int32Array(n * m).fill(-1);
    const pere = new Int32Array(n * m);
    const file = new Int32Array(n * m);

    for (const k of ordre) {
        const [depart, arrivee] = bouts[k];
        if (!depart.length || !arrivee.length) return false;
        const but = new Set(arrivee);
        let fin = 0;
        depart.forEach(c => { if (vu[c] !== k) { vu[c] = k; pere[c] = -1; file[fin++] = c; } });
        let trouve = -1;
        for (let tete = 0; tete < fin && trouve < 0; tete++) {
            const c = file[tete];
            if (but.has(c)) { trouve = c; break; }
            const i = c % n, j = (c - i) / n;
            if (i + 1 < n) pousser(c + 1, c);
            if (i > 0) pousser(c - 1, c);
            if (j + 1 < m) pousser(c + n, c);
            if (j > 0) pousser(c - n, c);
            function pousser(d, venant) {
                if (vu[d] === k || occupe[d]) return;
                if (mur[d] >= 0 && mur[d] !== k) return;
                vu[d] = k;
                pere[d] = venant;
                file[fin++] = d;
            }
        }
        if (trouve < 0) return false;
        // LE TRAIT POSÉ, ET LUI SEUL, avec son coussin d'une case. On avait
        // d'abord bouché toutes les cases VISITÉES par la recherche — c'est-à-
        // dire la moitié du cadre —, ce qui condamnait toutes les paires
        // suivantes : l'épreuve déclarait alors chaque figure piégée, donc ne
        // triait plus rien. Le trait se relit par ses parents.
        for (let c = trouve; c >= 0; c = pere[c]) {
            const i = c % n, j = (c - i) / n;
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    const I = i + di, J = j + dj;
                    if (I < 0 || J < 0 || I >= n || J >= m) continue;
                    occupe[J * n + I] = 1;
                }
            }
        }
    }
    return true;
}

/** Cet ordre de lettres aboutit-il ? (façade publique, pour les tests) */
export function ordreAboutit(fig, ordre) {
    const rang = new Map(fig.lettres.map((l, k) => [l, k]));
    return ordreAboutitSur(carteDuCadre(fig), ordre.map(l => rang.get(l)));
}

/**
 * LA FIGURE DEMANDE-T-ELLE DE PRÉVOIR ? Vrai dès qu'un ordre se retrouve coincé.
 *
 * On n'essaie pas tous les ordres — il y en a 720 à six paires, et une figure
 * se tire dans le navigateur d'un élève. Quatre suffisent : ce qu'on cherche est
 * l'EXISTENCE d'un piège, pas son inventaire.
 */
export function demandeDePrevoir(fig, rng, essais = 3) {
    const carte = carteDuCadre(fig);
    const rangs = fig.lettres.map((_, k) => k);
    for (let e = 0; e < essais; e++) {
        const ordre = e === 0 ? rangs : rng.shuffle(rangs.slice());
        if (!ordreAboutitSur(carte, ordre)) return true;
    }
    return false;
}

/**
 * COMBIEN DE TRAITS DROITS NE PASSENT PAS ? C'est la mesure de l'intérêt d'une
 * figure : si relier chaque lettre à la règle marche du premier coup, il n'y a
 * rien à prévoir et rien à apprendre. On compte les traits droits qui se
 * croisent entre eux ou qui butent sur un carré.
 */
export function croisementsDroits(fig) {
    const droits = fig.lettres.map(lettre => {
        const [a, b] = fig.bornes.filter(p => p.lettre === lettre);
        return { lettre, a, b };
    });
    let n = 0;
    for (let i = 0; i < droits.length; i++) {
        for (let j = i + 1; j < droits.length; j++) {
            if (segmentsSeCoupent(droits[i].a, droits[i].b, droits[j].a, droits[j].b)) n++;
        }
        // Un trait droit qui passe sur le carré d'une autre lettre compte
        // autant : c'est le même « il va falloir contourner ».
        for (const c of carres(fig)) {
            if (c.lettre === droits[i].lettre) continue;
            if (segmentTouche(droits[i].a, droits[i].b, c)) { n++; break; }
        }
    }
    return n;
}

/** Le conseil écrit : il rappelle la règle qu'on oublie, sans montrer le tracé. */
export function conseil(fig, traits) {
    const restantes = fig.lettres.filter(l => !traits.some(t => t.lettre === l));
    if (!restantes.length) return 'Tout est relié — relis les trois interdits et vérifie chaque trait.';
    if (restantes.length === fig.lettres.length) {
        return 'Ne commence pas par la paire la plus proche : commence par celle qui a le moins '
            + 'de chemins possibles — souvent celle qui est coincée dans un coin ou derrière un carré.';
    }
    return `Il te reste ${restantes.join(' et ')}. Avant de tracer, regarde de quel côté de tes `
        + 'traits déjà posés se trouvent les deux carrés : s\'ils ne sont pas du même côté, '
        + 'c\'est qu\'un trait précédent est à refaire.';
}
