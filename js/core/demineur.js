// Le Démineur — toute la logique, sans une ligne de DOM.
//
// Les règles sont celles de 1990, à la virgule près : des mines cachées, un
// chiffre qui compte les mines des huit cases voisines, un drapeau pour
// marquer, et une partie gagnée quand toutes les cases SANS mine sont
// ouvertes. Rien n'a été ajouté — ni bonus, ni calcul plaqué par-dessus. Le
// démineur est déjà un exercice de raisonnement complet : chaque chiffre est
// une équation (« il me manque 2 mines parmi ces 3 cases »), et gagner, c'est
// enchaîner des déductions certaines.
//
// Deux choses seulement séparent ce démineur de l'original, et toutes les deux
// servent l'élève :
//
//  1. La grille est GARANTIE DÉDUCTIBLE quand c'est possible : on ne tire pas
//     une grille au hasard, on tire des grilles jusqu'à en trouver une que la
//     logique seule termine. Perdre sur un coup de dé n'apprend rien et se
//     retient comme une injustice.
//  2. Le solveur qui sert à cette garantie sert AUSSI d'indice : à tout moment
//     il sait dire quelle case est déductible, et surtout POURQUOI. C'est la
//     même fonction — un indice qui se contenterait de désigner une case sûre
//     serait un aveu, celui-ci montre le raisonnement.

export const CACHE = 0;
export const OUVERT = 1;
export const DRAPEAU = 2;

export const NIVEAUX = [
    { id: 'debutant', label: 'Débutant', cols: 9, lignes: 9, mines: 10 },
    { id: 'confirme', label: 'Confirmé', cols: 12, lignes: 12, mines: 22 },
    { id: 'expert', label: 'Expert', cols: 16, lignes: 16, mines: 46 }
];

export function niveauDe(id) {
    return NIVEAUX.find(n => n.id === id) || NIVEAUX[0];
}

/** Une grille vierge : ni mines, ni chiffres — ils viennent au premier clic. */
export function creerGrille(niveau) {
    const n = typeof niveau === 'string' ? niveauDe(niveau) : niveau;
    const total = n.cols * n.lignes;
    return {
        cols: n.cols, lignes: n.lignes, mines: n.mines, niveau: n.id,
        bombe: new Uint8Array(total),
        voisines: new Uint8Array(total),
        etat: new Uint8Array(total),
        posee: false
    };
}

export function xy(g, i) { return { x: i % g.cols, y: Math.floor(i / g.cols) }; }
export function idx(g, x, y) { return y * g.cols + x; }

/** Les huit voisines, en évitant les bords — et le repli d'une ligne à l'autre. */
export function voisins(g, i) {
    const { x, y } = xy(g, i);
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= g.cols || ny >= g.lignes) continue;
            out.push(idx(g, nx, ny));
        }
    }
    return out;
}

function compterVoisines(g) {
    for (let i = 0; i < g.bombe.length; i++) {
        g.voisines[i] = g.bombe[i] ? 0 : voisins(g, i).reduce((s, v) => s + g.bombe[v], 0);
    }
}

/**
 * Pose les mines n'importe où SAUF sur la case de départ et ses voisines : le
 * premier clic ouvre donc toujours une zone, jamais une mine. Sans cette
 * règle, une partie sur dix se termine au premier geste — et une partie perdue
 * avant d'avoir commencé n'enseigne rien.
 */
export function poserMines(g, depart, rng) {
    const interdit = new Set([depart, ...voisins(g, depart)]);
    const libres = [];
    for (let i = 0; i < g.bombe.length; i++) if (!interdit.has(i)) libres.push(i);
    const melange = rng.shuffle(libres);
    g.bombe.fill(0);
    // Si la grille est si petite que le carré interdit ne laisse pas assez de
    // place, on garde autant de mines que possible : mieux vaut une grille plus
    // facile qu'une boucle infinie.
    const combien = Math.min(g.mines, melange.length);
    for (let k = 0; k < combien; k++) g.bombe[melange[k]] = 1;
    compterVoisines(g);
    g.posee = true;
    return g;
}

/**
 * Ouvre une case, et par propagation toutes celles qui ne touchent aucune mine
 * — c'est le geste qui « déplie » le plateau.
 * @returns {{ouvertes:number[], perdu:boolean}}
 */
export function ouvrir(g, i) {
    if (g.etat[i] !== CACHE) return { ouvertes: [], perdu: false };
    if (g.bombe[i]) { g.etat[i] = OUVERT; return { ouvertes: [i], perdu: true }; }
    const pile = [i], ouvertes = [];
    while (pile.length) {
        const c = pile.pop();
        if (g.etat[c] !== CACHE) continue;
        g.etat[c] = OUVERT;
        ouvertes.push(c);
        if (g.voisines[c] === 0) {
            voisins(g, c).forEach(v => { if (g.etat[v] === CACHE) pile.push(v); });
        }
    }
    return { ouvertes, perdu: false };
}

/**
 * Le « clic du milieu » de l'original : une case ouverte dont le chiffre est
 * déjà atteint en drapeaux ouvre toutes ses autres voisines d'un coup. C'est le
 * geste qui fait la vitesse d'un joueur expérimenté — et il se paie : si un
 * drapeau est mal placé, on ouvre une mine.
 */
export function ouvrirAutour(g, i) {
    if (g.etat[i] !== OUVERT || !g.voisines[i]) return { ouvertes: [], perdu: false };
    const vs = voisins(g, i);
    const drapeaux = vs.filter(v => g.etat[v] === DRAPEAU).length;
    if (drapeaux !== g.voisines[i]) return { ouvertes: [], perdu: false };
    let perdu = false;
    const ouvertes = [];
    vs.forEach(v => {
        if (g.etat[v] !== CACHE) return;
        const r = ouvrir(g, v);
        ouvertes.push(...r.ouvertes);
        if (r.perdu) perdu = true;
    });
    return { ouvertes, perdu };
}

export function basculerDrapeau(g, i) {
    if (g.etat[i] === CACHE) { g.etat[i] = DRAPEAU; return DRAPEAU; }
    if (g.etat[i] === DRAPEAU) { g.etat[i] = CACHE; return CACHE; }
    return OUVERT;
}

export function drapeauxPoses(g) {
    let n = 0;
    for (let i = 0; i < g.etat.length; i++) if (g.etat[i] === DRAPEAU) n++;
    return n;
}

export function gagnee(g) {
    for (let i = 0; i < g.bombe.length; i++) {
        if (!g.bombe[i] && g.etat[i] !== OUVERT) return false;
    }
    return true;
}

// --- Le raisonnement --------------------------------------------------------

/**
 * Chaque chiffre visible est une contrainte : « parmi ces cases encore
 * cachées, il y a exactement ce nombre de mines ». C'est la seule chose que le
 * joueur ait à manipuler, donc c'est la seule chose que le solveur manipule.
 */
export function contraintes(g) {
    const out = [];
    for (let i = 0; i < g.etat.length; i++) {
        if (g.etat[i] !== OUVERT || !g.voisines[i]) continue;
        const vs = voisins(g, i);
        const caches = vs.filter(v => g.etat[v] === CACHE);
        if (!caches.length) continue;
        const drapeaux = vs.filter(v => g.etat[v] === DRAPEAU).length;
        out.push({ source: i, cases: caches, reste: g.voisines[i] - drapeaux });
    }
    return out;
}

const nom = (g, i) => {
    const { x, y } = xy(g, i);
    return `${String.fromCharCode(65 + x)}${y + 1}`;
};

const liste = (g, cases) => cases.map(c => nom(g, c)).join(', ');

// « 1 mine » se lit comme un relevé de compteur ; « une mine » se lit comme une
// phrase. Les deux mots sont féminins, l'accord est donc toujours le même.
const pluriel = (n, mot) => n <= 1 ? `une ${mot}` : `${n} ${mot}s`;

/**
 * Cherche UNE déduction certaine à partir de ce qui est visible, et la rend
 * avec sa justification. Trois règles, dans l'ordre où un humain les emploie :
 *
 *  1. le compte est bon — le chiffre est déjà atteint en drapeaux, donc toutes
 *     les autres voisines sont sûres ;
 *  2. il ne reste que ça — il manque autant de mines qu'il reste de cases
 *     cachées, donc ce sont toutes des mines ;
 *  3. l'inclusion — quand les cases d'un chiffre sont toutes comprises dans
 *     celles d'un autre, la différence se déduit par soustraction. C'est la
 *     règle qui débloque les fameux « 1-2-1 », et celle qu'un élève ne trouve
 *     pas seul : elle mérite donc d'être expliquée, pas seulement appliquée.
 *
 * @returns {null|{type:'sur'|'mine', cases:number[], sources:number[], regle:string, texte:string}}
 */
export function deduire(g) {
    const cs = contraintes(g);

    for (const c of cs) {
        if (c.reste === 0) {
            return {
                type: 'sur', cases: c.cases, sources: [c.source], regle: 'compte',
                texte: `Le ${g.voisines[c.source]} en ${nom(g, c.source)} a déjà tous ses drapeaux : `
                    + `${c.cases.length > 1 ? 'ses autres voisines sont' : `sa dernière voisine ${nom(g, c.cases[0])} est`} `
                    + `sans mine. On peut ouvrir ${liste(g, c.cases)}.`
            };
        }
    }

    for (const c of cs) {
        if (c.reste === c.cases.length) {
            return {
                type: 'mine', cases: c.cases, sources: [c.source], regle: 'complet',
                texte: c.reste === 1
                    ? `Le ${g.voisines[c.source]} en ${nom(g, c.source)} attend encore une mine, `
                        + `et il ne lui reste qu'une case cachée : ${liste(g, c.cases)} — c'est une mine.`
                    : `Le ${g.voisines[c.source]} en ${nom(g, c.source)} attend encore ${c.reste} mines, `
                        + `et il ne lui reste que ${c.reste} cases cachées : ${liste(g, c.cases)} — ce sont des mines.`
            };
        }
    }

    // Règle d'inclusion. On ne compare que des contraintes qui se touchent :
    // deux chiffres éloignés n'ont aucune case commune, les confronter serait
    // du temps perdu.
    for (const a of cs) {
        const petit = new Set(a.cases);
        for (const b of cs) {
            if (b === a || b.cases.length <= a.cases.length) continue;
            if (!a.cases.every(x => b.cases.includes(x))) continue;
            const diff = b.cases.filter(x => !petit.has(x));
            const reste = b.reste - a.reste;
            if (reste === 0) {
                return {
                    type: 'sur', cases: diff, sources: [a.source, b.source], regle: 'inclusion',
                    texte: `Les ${a.cases.length} cases du ${g.voisines[a.source]} en ${nom(g, a.source)} `
                        + `sont toutes comprises dans celles du ${g.voisines[b.source]} en ${nom(g, b.source)}. `
                        + `Ces deux chiffres attendent le même nombre de mines (${b.reste}) : `
                        + `tout est donc à l'intérieur, et ${liste(g, diff)} ${diff.length > 1 ? 'sont sans mine' : 'est sans mine'}.`
                };
            }
            if (reste === diff.length) {
                return {
                    type: 'mine', cases: diff, sources: [a.source, b.source], regle: 'inclusion',
                    texte: `Le ${g.voisines[b.source]} en ${nom(g, b.source)} attend ${pluriel(b.reste, 'mine')}, `
                        + `dont ${a.reste} déjà dans les cases du ${g.voisines[a.source]} en ${nom(g, a.source)}. `
                        + `Il en reste donc ${b.reste} − ${a.reste} = ${reste} pour ${liste(g, diff)} : `
                        + `${diff.length > 1 ? 'ce sont des mines' : 'c\'est une mine'}.`
                };
            }
        }
    }

    // Dernier recours : le compte global. Quand toutes les mines sont marquées,
    // le reste de la grille est sûr — et réciproquement.
    const restantes = g.mines - drapeauxPoses(g);
    const caches = [];
    for (let i = 0; i < g.etat.length; i++) if (g.etat[i] === CACHE) caches.push(i);
    if (caches.length) {
        if (restantes === 0) {
            return {
                type: 'sur', cases: caches, sources: [], regle: 'total',
                texte: `Les ${g.mines} mines sont toutes marquées : tout le reste de la grille est sans danger.`
            };
        }
        if (restantes === caches.length) {
            return {
                type: 'mine', cases: caches, sources: [], regle: 'total',
                texte: `Il reste ${pluriel(restantes, 'mine')} à trouver et exactement autant de cases cachées : `
                    + `ce sont toutes des mines.`
            };
        }
    }
    return null;
}

/**
 * TOUT ce qui est déductible en l'état, et pourquoi. `deduire` s'arrête à la
 * première trouvaille — c'est ce qu'il faut pour un indice, où l'on ne veut
 * qu'une chose à la fois. Ici on veut l'inverse : savoir si le coup que
 * l'élève vient de jouer était déductible, donc balayer toutes les règles.
 *
 * C'est cette distinction qui rend le suivi honnête. Un démineur oblige
 * parfois à deviner ; compter une mine tirée au hasard comme une faute serait
 * injuste, et ne rien compter du tout priverait l'élève de la seule trace qui
 * l'intéresse : « ce coup-là, tu pouvais le savoir ».
 *
 * @returns {{surs: Map<number,string>, mines: Map<number,string>}}
 */
export function deductionsVisibles(g) {
    const surs = new Map(), mines = new Map();
    const poser = (carte, cases, texte) => cases.forEach(c => { if (!carte.has(c)) carte.set(c, texte); });
    const cs = contraintes(g);

    for (const c of cs) {
        if (c.reste === 0) {
            poser(surs, c.cases, `Le ${g.voisines[c.source]} en ${nom(g, c.source)} a déjà tous ses drapeaux : `
                + `ses autres voisines sont sans mine.`);
        } else if (c.reste === c.cases.length) {
            poser(mines, c.cases, c.reste === 1
                ? `Le ${g.voisines[c.source]} en ${nom(g, c.source)} attend encore une mine `
                    + `et n'a plus qu'une case cachée : elle porte la mine.`
                : `Le ${g.voisines[c.source]} en ${nom(g, c.source)} attend encore ${c.reste} mines `
                    + `et n'a plus que ${c.reste} cases cachées : elles portent toutes une mine.`);
        }
    }
    for (const a of cs) {
        const petit = new Set(a.cases);
        for (const b of cs) {
            if (b === a || b.cases.length <= a.cases.length) continue;
            if (!a.cases.every(x => b.cases.includes(x))) continue;
            const diff = b.cases.filter(x => !petit.has(x));
            const reste = b.reste - a.reste;
            if (reste === 0) {
                poser(surs, diff, `Le ${g.voisines[a.source]} en ${nom(g, a.source)} et le ${g.voisines[b.source]} `
                    + `en ${nom(g, b.source)} attendent le même nombre de mines, dans des cases emboîtées : `
                    + `la différence est sans mine.`);
            } else if (reste === diff.length) {
                poser(mines, diff, `${b.reste} − ${a.reste} = ${reste} : il reste ${pluriel(reste, 'mine')} `
                    + `pour les cases du ${g.voisines[b.source]} en ${nom(g, b.source)} qui ne touchent pas `
                    + `le ${g.voisines[a.source]} en ${nom(g, a.source)}.`);
            }
        }
    }
    const restantes = g.mines - drapeauxPoses(g);
    const caches = [];
    for (let i = 0; i < g.etat.length; i++) if (g.etat[i] === CACHE) caches.push(i);
    if (caches.length && restantes === 0) {
        poser(surs, caches, `Toutes les mines sont marquées : le reste de la grille est sans danger.`);
    } else if (caches.length && restantes === caches.length) {
        poser(mines, caches, `Il reste ${pluriel(restantes, 'mine')} et exactement autant de cases cachées.`);
    }
    return { surs, mines };
}

/**
 * Déroule le raisonnement jusqu'au bout, en trichant sur la carte des mines
 * pour appliquer chaque déduction. Sert à deux choses : vérifier qu'une grille
 * se termine sans deviner, et savoir de combien on s'en approche.
 */
export function resoudre(g, depart) {
    const t = creerGrille({ cols: g.cols, lignes: g.lignes, mines: g.mines, id: g.niveau });
    t.bombe.set(g.bombe);
    t.voisines.set(g.voisines);
    t.posee = true;
    const r0 = ouvrir(t, depart);
    if (r0.perdu) return { fini: false, restant: t.etat.length, grille: t };

    for (let garde = 0; garde < 5000; garde++) {
        if (gagnee(t)) return { fini: true, restant: 0, grille: t };
        const d = deduire(t);
        if (!d) break;
        if (d.type === 'mine') d.cases.forEach(c => { if (t.etat[c] === CACHE) t.etat[c] = DRAPEAU; });
        else d.cases.forEach(c => ouvrir(t, c));
    }
    let restant = 0;
    for (let i = 0; i < t.bombe.length; i++) if (!t.bombe[i] && t.etat[i] !== OUVERT) restant++;
    return { fini: gagnee(t), restant, grille: t };
}

/**
 * Pose les mines de façon que la grille se termine PAR LE RAISONNEMENT SEUL.
 * On tire, on vérifie, on recommence. Quand le budget d'essais est épuisé — ça
 * arrive au niveau expert, où les grilles entièrement déductibles sont rares —
 * on garde la meilleure trouvée et on le dit : `garanti` vaut alors faux, et
 * le jeu peut prévenir qu'il restera peut-être un choix à faire au flair.
 */
export function poserMinesDeductibles(g, depart, rng, essais = 400) {
    let meilleure = null, meilleurRestant = Infinity;
    for (let k = 0; k < essais; k++) {
        poserMines(g, depart, rng);
        const r = resoudre(g, depart);
        if (r.fini) return { garanti: true, essais: k + 1 };
        if (r.restant < meilleurRestant) {
            meilleurRestant = r.restant;
            meilleure = Uint8Array.from(g.bombe);
        }
    }
    if (meilleure) { g.bombe.set(meilleure); compterVoisines(g); }
    return { garanti: false, essais, restant: meilleurRestant };
}
