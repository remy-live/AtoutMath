// LES ÉCHECS — les règles complètes, validées au perft.
//
// Un moteur d'échecs ne se vérifie pas à l'œil : il se vérifie en COMPTANT.
// Le « perft » énumère toutes les positions atteignables en n coups depuis une
// position donnée, et ces nombres sont connus au coup près — 20, 400, 8 902
// depuis le départ. Un roque oublié, un en passant de travers, une épinglure
// mal filtrée, et le compte tombe faux. Les tests de ce module reposent
// dessus : si le perft passe, les règles y sont, TOUTES.
//
// Le plateau est un tableau de 64 cases, rangée 8 en haut (indices 0..7).
// Pièces blanches en MAJUSCULES (PNBRQK), noires en minuscules. Le trait est
// 'B' ou 'N', comme dans les autres jeux de plateau (voir core/ia.js).

export const N = 8;
const idx = (x, y) => y * 8 + x;
const dedans = (x, y) => x >= 0 && y >= 0 && x < 8 && y < 8;
const autre = (c) => c === 'B' ? 'N' : 'B';
const couleurDe = (p) => !p ? null : (p === p.toUpperCase() ? 'B' : 'N');

const CAVALIER = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const ROI = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const FOU = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const TOUR = [[0, -1], [0, 1], [-1, 0], [1, 0]];

export function initial() {
    return fenVersEtat('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
}

/** Lit une position en notation FEN — la lingua franca des diagrammes. */
export function fenVersEtat(fen) {
    const [pos, trait, roques, ep] = fen.trim().split(/\s+/);
    const cases = new Array(64).fill(null);
    let x = 0, y = 0;
    for (const c of pos) {
        if (c === '/') { y++; x = 0; }
        else if (/\d/.test(c)) x += Number(c);
        else cases[idx(x++, y)] = c;
    }
    return {
        cases,
        trait: trait === 'w' ? 'B' : 'N',
        roque: {
            BR: roques.includes('K'), BD: roques.includes('Q'),
            NR: roques.includes('k'), ND: roques.includes('q')
        },
        ep: (ep && ep !== '-') ? idx(ep.charCodeAt(0) - 97, 8 - Number(ep[1])) : null,
        demiCoups: 0
    };
}

/** La case (x, y) est-elle attaquée par `par` ? Le cœur de toute la légalité. */
export function attaquee(etat, x, y, par) {
    const sens = par === 'B' ? 1 : -1;      // les pions attaquent vers le haut (blancs)
    for (const dx of [-1, 1]) {
        const px = x + dx, py = y + sens;
        if (dedans(px, py) && etat.cases[idx(px, py)] === (par === 'B' ? 'P' : 'p')) return true;
    }
    for (const [dx, dy] of CAVALIER) {
        const cx = x + dx, cy = y + dy;
        if (dedans(cx, cy) && etat.cases[idx(cx, cy)] === (par === 'B' ? 'N' : 'n')) return true;
    }
    for (const [dx, dy] of ROI) {
        const cx = x + dx, cy = y + dy;
        if (dedans(cx, cy) && etat.cases[idx(cx, cy)] === (par === 'B' ? 'K' : 'k')) return true;
    }
    for (const [dirs, lettres] of [[FOU, 'BQ'], [TOUR, 'RQ']]) {
        const cibles = par === 'B' ? lettres : lettres.toLowerCase();
        for (const [dx, dy] of dirs) {
            let cx = x + dx, cy = y + dy;
            while (dedans(cx, cy)) {
                const p = etat.cases[idx(cx, cy)];
                if (p) { if (cibles.includes(p)) return true; break; }
                cx += dx; cy += dy;
            }
        }
    }
    return false;
}

function roiDe(etat, couleur) {
    const r = couleur === 'B' ? 'K' : 'k';
    const i = etat.cases.indexOf(r);
    return { x: i % 8, y: Math.floor(i / 8) };
}

export function enEchec(etat, couleur = etat.trait) {
    const r = roiDe(etat, couleur);
    return attaquee(etat, r.x, r.y, autre(couleur));
}

function pseudoCoups(etat) {
    const out = [];
    const moi = etat.trait;
    const pousse = (de, vers, extra) => out.push({ de, vers, ...extra });

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const p = etat.cases[idx(x, y)];
            if (!p || couleurDe(p) !== moi) continue;
            const g = p.toUpperCase();
            const de = idx(x, y);

            if (g === 'P') {
                const sens = moi === 'B' ? -1 : 1;
                const depart = moi === 'B' ? 6 : 1;
                const derniere = moi === 'B' ? 0 : 7;
                const avancer = (vx, vy) => {
                    if (vy === derniere) {
                        for (const promo of ['Q', 'R', 'B', 'N']) pousse(de, idx(vx, vy), { promotion: promo });
                    } else pousse(de, idx(vx, vy));
                };
                if (!etat.cases[idx(x, y + sens)]) {
                    avancer(x, y + sens);
                    if (y === depart && !etat.cases[idx(x, y + 2 * sens)]) {
                        pousse(de, idx(x, y + 2 * sens), { double: true });
                    }
                }
                for (const dx of [-1, 1]) {
                    const cx = x + dx, cy = y + sens;
                    if (!dedans(cx, cy)) continue;
                    const cible = etat.cases[idx(cx, cy)];
                    if (cible && couleurDe(cible) !== moi) avancer(cx, cy);
                    else if (idx(cx, cy) === etat.ep) pousse(de, idx(cx, cy), { enPassant: true });
                }
                continue;
            }
            if (g === 'N' || g === 'K') {
                for (const [dx, dy] of (g === 'N' ? CAVALIER : ROI)) {
                    const cx = x + dx, cy = y + dy;
                    if (!dedans(cx, cy)) continue;
                    const cible = etat.cases[idx(cx, cy)];
                    if (!cible || couleurDe(cible) !== moi) pousse(de, idx(cx, cy));
                }
                continue;
            }
            const dirs = g === 'B' ? FOU : g === 'R' ? TOUR : ROI;   // Q = les huit
            for (const [dx, dy] of dirs) {
                let cx = x + dx, cy = y + dy;
                while (dedans(cx, cy)) {
                    const cible = etat.cases[idx(cx, cy)];
                    if (!cible) pousse(de, idx(cx, cy));
                    else { if (couleurDe(cible) !== moi) pousse(de, idx(cx, cy)); break; }
                    cx += dx; cy += dy;
                }
            }
        }
    }

    // Le roque : cases libres entre roi et tour, et le roi ne TRAVERSE aucune
    // case attaquée — y compris la sienne. C'est le coup le plus contraint du
    // jeu, et le perft de la position « kiwipete » le vérifie sous le feu.
    const y0 = moi === 'B' ? 7 : 0;
    const lui = autre(moi);
    if (etat.cases[idx(4, y0)] === (moi === 'B' ? 'K' : 'k') && !attaquee(etat, 4, y0, lui)) {
        if (etat.roque[moi + 'R'] && !etat.cases[idx(5, y0)] && !etat.cases[idx(6, y0)]
            && etat.cases[idx(7, y0)] === (moi === 'B' ? 'R' : 'r')
            && !attaquee(etat, 5, y0, lui) && !attaquee(etat, 6, y0, lui)) {
            pousse(idx(4, y0), idx(6, y0), { roque: 'R' });
        }
        if (etat.roque[moi + 'D'] && !etat.cases[idx(3, y0)] && !etat.cases[idx(2, y0)] && !etat.cases[idx(1, y0)]
            && etat.cases[idx(0, y0)] === (moi === 'B' ? 'R' : 'r')
            && !attaquee(etat, 3, y0, lui) && !attaquee(etat, 2, y0, lui)) {
            pousse(idx(4, y0), idx(2, y0), { roque: 'D' });
        }
    }
    return out;
}

/** Les coups LÉGAUX : ceux qui ne laissent pas son propre roi en prise. */
export function coups(etat) {
    const legaux = pseudoCoups(etat).filter(c => !enEchec(jouer(etat, c), etat.trait));
    // On marque les prises au passage : `ordonner` n'a que la liste sous la
    // main, et l'élagage alpha-bêta vit de cet ordre.
    for (const c of legaux) c.capture = !!etat.cases[c.vers] || !!c.enPassant;
    return legaux;
}

export function jouer(etat, coup) {
    const cases = etat.cases.slice();
    const roque = { ...etat.roque };
    const p = cases[coup.de];
    const prise = cases[coup.vers];
    const moi = etat.trait;
    const y0 = moi === 'B' ? 7 : 0;

    cases[coup.de] = null;
    cases[coup.vers] = coup.promotion
        ? (moi === 'B' ? coup.promotion : coup.promotion.toLowerCase())
        : p;

    if (coup.enPassant) {
        // Le pion pris n'est PAS sur la case d'arrivée : il est juste derrière.
        cases[coup.vers + (moi === 'B' ? 8 : -8)] = null;
    }
    if (coup.roque === 'R') { cases[idx(5, y0)] = cases[idx(7, y0)]; cases[idx(7, y0)] = null; }
    if (coup.roque === 'D') { cases[idx(3, y0)] = cases[idx(0, y0)]; cases[idx(0, y0)] = null; }

    // Les droits de roque s'éteignent quand le roi ou la tour BOUGE — et
    // quand une tour est PRISE sur sa case d'origine.
    if (p === 'K') { roque.BR = roque.BD = false; }
    if (p === 'k') { roque.NR = roque.ND = false; }
    for (const [caseIdx, droit] of [[idx(7, 7), 'BR'], [idx(0, 7), 'BD'], [idx(7, 0), 'NR'], [idx(0, 0), 'ND']]) {
        if (coup.de === caseIdx || coup.vers === caseIdx) roque[droit] = false;
    }

    return {
        cases, roque,
        trait: autre(moi),
        ep: coup.double ? coup.de + (moi === 'B' ? -8 : 8) : null,
        demiCoups: (p.toUpperCase() === 'P' || prise || coup.enPassant) ? 0 : etat.demiCoups + 1
    };
}

export function terminee(etat) {
    if (!coups(etat).length) {
        return enEchec(etat)
            ? { gagnant: autre(etat.trait), raison: 'échec et mat' }
            : { gagnant: null, raison: 'pat' };
    }
    if (etat.demiCoups >= 100) return { gagnant: null, raison: 'cinquante coups sans prise' };
    // Matériel insuffisant : deux rois, ou roi contre roi et pièce mineure.
    const restes = etat.cases.filter(Boolean).map(p => p.toUpperCase()).filter(p => p !== 'K');
    if (restes.length === 0 || (restes.length === 1 && (restes[0] === 'B' || restes[0] === 'N'))) {
        return { gagnant: null, raison: 'matériel insuffisant' };
    }
    return null;
}

/** Compte les positions à n coups : LA vérification d'un générateur de coups. */
export function perft(etat, prof) {
    if (prof === 0) return 1;
    let total = 0;
    for (const c of coups(etat)) total += perft(jouer(etat, c), prof - 1);
    return total;
}

// --- L'évaluation -----------------------------------------------------------

const VALEURS = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
// Deux tables suffisent à donner du jeu : le pion qui avance et occupe le
// centre, le cavalier qui fuit le bord. Le reste est affaire de matériel.
const PST_P = [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0
];
const PST_N = [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50
];

export function evaluer(etat) {
    let score = 0;
    for (let i = 0; i < 64; i++) {
        const p = etat.cases[i];
        if (!p) continue;
        const g = p.toUpperCase();
        const blanche = p === g;
        // Les tables sont écrites côté blanc : pour une noire, on lit en miroir.
        const j = blanche ? i : (63 - i);
        let v = VALEURS[g];
        if (g === 'P') v += PST_P[j];
        if (g === 'N') v += PST_N[j];
        score += (couleurDe(p) === etat.trait) ? v : -v;
    }
    return score;
}

/** Prises et promotions d'abord : l'élagage alpha-bêta vit de cet ordre. */
export function ordonner(liste) {
    return liste.sort((a, b) => {
        const va = (a.promotion ? 900 : 0) + (a.capture ? 100 : 0);
        const vb = (b.promotion ? 900 : 0) + (b.capture ? 100 : 0);
        return vb - va;
    });
}
