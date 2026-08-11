// LE PLAN DE VILLE — se repérer et se déplacer, sans DOM.
//
// L'élève conduit une voiture sur un plan qui NE BOUGE JAMAIS, en suivant un
// itinéraire donné en mots : « prends la deuxième à gauche, puis la première à
// droite ». Toute la difficulté — et tout l'intérêt — tient dans une phrase :
//
//     LA GAUCHE DE LA VOITURE N'EST PAS LA GAUCHE DE L'ÉCRAN.
//
// Quand la voiture descend, sa gauche est à l'est, c'est-à-dire à DROITE sur
// le plan. Un enfant qui n'a pas fait ce chemin-là tourne du bon côté tant que
// la voiture monte, et se trompe systématiquement dès qu'elle redescend. C'est
// exactement la compétence visée par « se repérer et se déplacer en utilisant
// des repères » du cycle 3, et elle ne se travaille qu'en tournant vraiment.
//
// Ce module ne connaît ni le SVG ni les touches. Il tient la ville, tire les
// itinéraires, les met en phrases et juge les coups. Le tout est testable sans
// navigateur — ce qui compte, parce qu'un itinéraire mal décrit envoie l'élève
// dans le mur en lui donnant tort.

/** Les quatre caps, dans l'ordre des aiguilles d'une montre. */
export const CAPS = ['N', 'E', 'S', 'O'];
const VECTEURS = { N: [0, -1], E: [1, 0], S: [0, 1], O: [-1, 0] };

/** Tourner : la gauche retire un quart de tour, la droite en ajoute un. */
export function tourner(cap, sens) {
    const i = CAPS.indexOf(cap);
    if (i < 0) return cap;
    if (sens === 'gauche') return CAPS[(i + 3) % 4];
    if (sens === 'droite') return CAPS[(i + 1) % 4];
    if (sens === 'demi-tour') return CAPS[(i + 2) % 4];
    return cap;
}

/** Le sens relatif qui mène du cap `a` au cap `b`. */
export function sensEntre(a, b) {
    const d = (CAPS.indexOf(b) - CAPS.indexOf(a) + 4) % 4;
    return ['tout-droit', 'droite', 'demi-tour', 'gauche'][d];
}

export const cle = (x, y) => `${x},${y}`;
const cleArete = (a, b) => (a.x < b.x || (a.x === b.x && a.y < b.y))
    ? `${a.x},${a.y}|${b.x},${b.y}` : `${b.x},${b.y}|${a.x},${a.y}`;

/** Le carrefour atteint en avançant d'un pas depuis (x, y) au cap donné. */
export function devant(x, y, cap) {
    const [dx, dy] = VECTEURS[cap];
    return { x: x + dx, y: y + dy };
}

/** Y a-t-il une rue entre ces deux carrefours voisins ? */
export function rue(ville, a, b) {
    return ville.rues.has(cleArete(a, b));
}

/**
 * Les caps praticables depuis un carrefour.
 * Le demi-tour est exclu : on ne fait pas demi-tour au milieu d'un carrefour,
 * et l'autoriser retirerait toute conséquence à une erreur.
 */
export function sortiesRelatives(ville, x, y, cap) {
    const out = {};
    for (const sens of ['gauche', 'tout-droit', 'droite']) {
        const c = sens === 'tout-droit' ? cap : tourner(cap, sens);
        const n = devant(x, y, c);
        if (n.x < 0 || n.y < 0 || n.x >= ville.cols || n.y >= ville.rows) continue;
        if (rue(ville, { x, y }, n)) out[sens] = { cap: c, ...n };
    }
    return out;
}

// --- La ville ----------------------------------------------------------------

/**
 * Trace une ville : une trame de rues à laquelle on RETIRE des tronçons.
 *
 * Une trame complète ferait de « la première à gauche » et « la deuxième à
 * gauche » la même chose à un carrefour près, puisqu'une rue part à gauche
 * partout. Il faut donc des trous : des pâtés de maisons qu'on longe sans
 * pouvoir tourner. C'est ce qui donne un sens au comptage — et c'est ce qui
 * fait qu'on lit le plan au lieu de compter les carrefours.
 *
 * On ne retire un tronçon que si la ville reste d'un seul tenant : une rue
 * coupée du reste rendrait des itinéraires impossibles.
 */
export function creerVille({ cols = 5, rows = 5, trous = 0.22, rng } = {}) {
    const alea = rng || { next: Math.random, int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)) };
    const rues = new Set();
    const toutes = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (x + 1 < cols) toutes.push([{ x, y }, { x: x + 1, y }]);
            if (y + 1 < rows) toutes.push([{ x, y }, { x, y: y + 1 }]);
        }
    }
    toutes.forEach(([a, b]) => rues.add(cleArete(a, b)));

    const ville = { cols, rows, rues, lieux: [] };
    const cible = Math.floor(toutes.length * trous);
    const melange = toutes.slice();
    for (let i = melange.length - 1; i > 0; i--) {
        const j = Math.floor(alea.next() * (i + 1));
        [melange[i], melange[j]] = [melange[j], melange[i]];
    }
    let retires = 0;
    for (const [a, b] of melange) {
        if (retires >= cible) break;
        const k = cleArete(a, b);
        rues.delete(k);
        // Un carrefour ne doit jamais devenir un cul-de-sac ni un îlot : on
        // exige deux rues au minimum, faute de quoi la voiture y arrive sans
        // pouvoir en repartir autrement qu'en faisant demi-tour.
        if (degre(ville, a) < 2 || degre(ville, b) < 2 || !connexe(ville)) rues.add(k);
        else retires++;
    }
    return ville;
}

export function degre(ville, n) {
    return CAPS.reduce((s, c) => {
        const v = devant(n.x, n.y, c);
        if (v.x < 0 || v.y < 0 || v.x >= ville.cols || v.y >= ville.rows) return s;
        return s + (rue(ville, n, v) ? 1 : 0);
    }, 0);
}

export function connexe(ville) {
    const total = ville.cols * ville.rows;
    const vus = new Set([cle(0, 0)]);
    const pile = [{ x: 0, y: 0 }];
    while (pile.length) {
        const n = pile.pop();
        for (const c of CAPS) {
            const v = devant(n.x, n.y, c);
            if (v.x < 0 || v.y < 0 || v.x >= ville.cols || v.y >= ville.rows) continue;
            if (!rue(ville, n, v) || vus.has(cle(v.x, v.y))) continue;
            vus.add(cle(v.x, v.y));
            pile.push(v);
        }
    }
    return vus.size === total;
}

// --- L'itinéraire --------------------------------------------------------------

/**
 * Tire un itinéraire : une suite de carrefours, sans demi-tour ni repassage.
 *
 * On impose un NOMBRE DE VIRAGES plutôt qu'une longueur : c'est le virage qui
 * fait l'exercice. Un trajet de dix rues tout droit ne demande rien ; trois
 * virages sur cinq rues demandent trois fois de se replacer dans la voiture.
 *
 * `droitAuDepart` impose des rues TOUT DROIT avant le premier virage. Un
 * itinéraire qui commence par « prends la première à droite » au carrefour même
 * du départ ne laisse rien à lire : la voiture tourne avant d'être partie. En
 * démarrant tout droit, l'élève voit d'abord la voiture s'engager, compte les
 * rues qui défilent, et tourne à la bonne.
 */
export function tirerItineraire(ville, {
    virages = 3, capDepart = null, essais = 400, droitAuDepart = 1, rng
} = {}) {
    const alea = rng || { next: Math.random, int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)) };
    const pick = (arr) => arr[Math.floor(alea.next() * arr.length)];

    for (let essai = 0; essai < essais; essai++) {
        const depart = { x: Math.floor(alea.next() * ville.cols), y: Math.floor(alea.next() * ville.rows) };
        const capsPossibles = CAPS.filter(c => {
            const v = devant(depart.x, depart.y, c);
            return v.x >= 0 && v.y >= 0 && v.x < ville.cols && v.y < ville.rows && rue(ville, depart, v);
        });
        if (!capsPossibles.length) continue;
        const cap0 = capDepart && capsPossibles.includes(capDepart) ? capDepart : pick(capsPossibles);

        const noeuds = [{ ...depart }];
        const vus = new Set([cle(depart.x, depart.y)]);
        let cap = cap0, ici = { ...depart }, tournes = 0;
        // On avance au hasard, mais on privilégie les virages tant qu'on n'en a
        // pas assez, puis le tout droit : l'itinéraire ne part pas en spirale.
        const pas = virages * 2 + 3;
        for (let i = 0; i < pas && tournes <= virages; i++) {
            const sorties = sortiesRelatives(ville, ici.x, ici.y, cap);
            const libres = Object.entries(sorties)
                .filter(([, n]) => !vus.has(cle(n.x, n.y)));
            if (!libres.length) break;
            let candidats;
            if (i < droitAuDepart) {
                // Les premiers pas sont tout droit, sans négociation possible :
                // si cette rue-là ne continue pas, ce départ ne convient pas et
                // on en tire un autre.
                candidats = libres.filter(([s]) => s === 'tout-droit');
                if (!candidats.length) break;
            } else {
                const veutTourner = tournes < virages;
                candidats = libres.filter(([s]) => veutTourner ? s !== 'tout-droit' : true);
            }
            const [sens, suivant] = pick(candidats.length ? candidats : libres);
            if (sens !== 'tout-droit') tournes++;
            cap = suivant.cap;
            ici = { x: suivant.x, y: suivant.y };
            vus.add(cle(ici.x, ici.y));
            noeuds.push({ ...ici });
            if (tournes === virages && noeuds.length >= virages + 2) break;
        }
        if (tournes === virages && noeuds.length >= 2) {
            return { noeuds, capDepart: cap0, capArrivee: cap };
        }
    }
    return null;
}

// --- La feuille de route -------------------------------------------------------

const ORDINAUX = ['', 'première', 'deuxième', 'troisième', 'quatrième', 'cinquième'];

/**
 * Met un itinéraire EN MOTS, comme le ferait un passager.
 *
 * « La deuxième à gauche » ne veut pas dire « le deuxième carrefour » : ça veut
 * dire la deuxième rue qui part sur ta gauche. Entre les deux, il peut y avoir
 * des carrefours où rien ne part à gauche — c'est justement ce qu'il faut lire
 * sur le plan. On compte donc les OCCASIONS de tourner, pas les croisements.
 *
 * La feuille commence par « Avance » : c'est ce que dit un passager, et c'est
 * ce que la voiture fait — le premier pas est tout droit. Sans cette ligne, la
 * première consigne affichée est un virage, et on cherche à tourner avant même
 * d'être parti.
 */
export function decrireItineraire(ville, itineraire) {
    const { noeuds, capDepart } = itineraire;
    const etapes = [{ type: 'depart', texte: 'Avance', noeud: { ...noeuds[0] } }];
    let cap = capDepart;
    // Occasions rencontrées depuis le dernier virage, par côté.
    let occasions = { gauche: 0, droite: 0 };
    let droitDepuis = 0;

    for (let i = 0; i + 1 < noeuds.length; i++) {
        const ici = noeuds[i], suivant = noeuds[i + 1];
        const capVers = CAPS.find(c => {
            const v = devant(ici.x, ici.y, c);
            return v.x === suivant.x && v.y === suivant.y;
        });
        const sens = sensEntre(cap, capVers);

        // Ce carrefour offrait-il une rue à gauche, à droite ? (Le carrefour de
        // DÉPART compte : « la première à gauche », c'est bien la première
        // occasion rencontrée, y compris tout de suite.)
        const sorties = sortiesRelatives(ville, ici.x, ici.y, cap);
        if (sorties.gauche) occasions.gauche++;
        if (sorties.droite) occasions.droite++;

        if (sens === 'tout-droit') { droitDepuis++; cap = capVers; continue; }

        etapes.push({
            type: 'tourner', sens, rang: occasions[sens],
            avant: droitDepuis,
            texte: `Prends la ${ORDINAUX[occasions[sens]] || `${occasions[sens]}ᵉ`} à ${sens}`,
            noeud: { ...ici }
        });
        cap = capVers;
        occasions = { gauche: 0, droite: 0 };
        droitDepuis = 0;
    }

    const arrivee = noeuds[noeuds.length - 1];
    etapes.push({
        type: 'arrivee',
        rues: droitDepuis,
        texte: droitDepuis > 0
            ? `Continue tout droit : c'est ${droitDepuis === 1 ? 'la rue suivante' : `${droitDepuis} rues plus loin`}`
            : 'Tu y es : c\'est juste là',
        noeud: { ...arrivee }
    });
    return etapes;
}

// --- Le jugement d'un coup -------------------------------------------------------

/**
 * L'élève choisit un sens depuis sa position : est-ce le bon ?
 *
 * On renvoie de quoi EXPLIQUER, pas seulement de quoi sanctionner : le cap
 * attendu, celui qu'on a pris, et le nom de l'erreur — confondre sa gauche et
 * celle de l'écran ne se corrige pas avec le même mot que tourner trop tôt.
 */
export function jugerCoup(ville, etat, sens) {
    const { noeuds, index, cap } = etat;
    const ici = noeuds[index];
    const attendu = noeuds[index + 1];
    if (!attendu) return { fini: true };

    const sorties = sortiesRelatives(ville, ici.x, ici.y, cap);
    const choisi = sorties[sens];
    if (!choisi) {
        return { ok: false, faute: 'pas-de-rue', message: 'Il n\'y a pas de rue de ce côté-là : regarde le plan avant de tourner.' };
    }
    if (choisi.x === attendu.x && choisi.y === attendu.y) {
        return { ok: true, cap: choisi.cap, noeud: { x: choisi.x, y: choisi.y } };
    }

    const capAttendu = CAPS.find(c => {
        const v = devant(ici.x, ici.y, c);
        return v.x === attendu.x && v.y === attendu.y;
    });
    const bonSens = sensEntre(cap, capAttendu);
    // L'erreur SIGNATURE : avoir pris la gauche de l'écran pour celle de la
    // voiture. Elle ne se produit que quand la voiture ne monte pas, et c'est
    // la seule qui se corrige d'une phrase.
    const miroir = (sens === 'gauche' && bonSens === 'droite') || (sens === 'droite' && bonSens === 'gauche');
    return {
        ok: false,
        faute: miroir ? 'miroir' : 'mauvais-sens',
        bonSens, capAttendu, capPris: choisi.cap,
        message: miroir
            ? `La voiture roule vers ${nomCap(cap)} : sa ${bonSens} n'est pas de ce côté de l'écran. Mets-toi à la place du conducteur.`
            : `Ce n'était pas ce virage-là : il fallait aller à ${bonSens === 'tout-droit' ? 'tout droit' : bonSens}.`
    };
}

/**
 * « à » + un nom de lieu, en français correct.
 *
 * « Va jusqu'à le parc » se lisait en toutes lettres à l'écran. La contraction
 * ne s'invente pas au cas par cas dans chaque phrase : elle se fait ici, une
 * fois, pour toutes les destinations.
 */
export function aLieu(nom) {
    const n = String(nom || '');
    if (/^les /i.test(n)) return `aux ${n.slice(4)}`;
    if (/^le /i.test(n)) return `au ${n.slice(3)}`;
    return `à ${n}`;                    // « à la gare », « à l'école »
}

export function nomCap(cap) {
    return { N: 'le haut du plan', E: 'la droite du plan', S: 'le bas du plan', O: 'la gauche du plan' }[cap] || cap;
}
