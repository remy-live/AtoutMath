// LE QR CODE, ÉCRIT À LA MAIN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Pour le lien, tu proposes le code à taper mais tu pourrais aussi
// proposer un lien (la page actuelle)?code= et un QR code évidemment tu
// verrouilles la sécurité »
//
// POURQUOI PAS UNE BIBLIOTHÈQUE. Le logiciel n'a ni étape de construction ni
// dépendance : chaque fichier est un module ES lu tel quel par le navigateur.
// Faire venir une bibliothèque de l'extérieur, ce serait soit un service
// distant — un lien de classe envoyé chez un tiers, alors qu'il n'a aucune
// raison de sortir de la salle —, soit un fichier minifié qu'on ne peut ni
// lire ni corriger, au milieu d'un code qui s'explique partout ailleurs.
//
// COMMENT ON SAIT QUE C'EST JUSTE. On ne se relit pas soi-même : un QR faux ne
// se voit pas, il se scanne mal, et c'est l'élève devant son téléphone qui le
// découvre. Deux épreuves, donc, sur 708 chaînes de 1 à 700 caractères, accents
// et UTF-8 compris (`tools/tmp/qrContreSegno.mjs`) :
//
//   · ON SE FAIT LIRE. Chaque symbole passe par `zxing-cpp`, le décodeur des
//     lecteurs du commerce : 674 lus, 0 faux, 34 refusés à l'écriture parce que
//     trop longs pour la version 20.
//   · ON SE FAIT COMPARER. Quand le message remplit EXACTEMENT une version — donc
//     sans bourrage —, notre matrice doit être celle de `segno`, module par
//     module : 20 cas sur 20, un par version. Le bourrage est le seul endroit où
//     deux encodeurs conformes peuvent différer, et les deux se lisent.
//
// TROIS ERREURS ONT ÉTÉ TROUVÉES AINSI, et aucune ne se voyait à la lecture :
// l'information de format écrite du bit de poids FAIBLE en tête (aucun lecteur
// ne trouvait alors quel masque retirer) ; un bit de format écrit par-dessus le
// module noir de la norme ; et le bourrage qui repartait de la parité du
// message au lieu de son propre rang.
//
// ET UNE QUATRIÈME QUI N'EN ÉTAIT PAS UNE. Le premier décodeur essayé,
// `cv2.QRCodeDetector` d'OpenCV, refusait 167 de nos symboles sur 666 — tous au
// masque 2 — et refusait aussi ceux de segno au masque 4. Sur les mêmes images,
// `zxing-cpp` lit tout. C'était le décodeur, pas l'encodeur ; j'ai failli aller
// « corriger » du code juste, et c'est la comparaison avec segno sur les cas
// sans bourrage qui a tranché.
//
// CE QU'ON IMPLÉMENTE, ET RIEN DE PLUS : le mode OCTET, le niveau de correction
// M, les versions 1 à 20. C'est-à-dire jusqu'à 669 caractères — un lien de
// parcours en fait de 60 à 250. Le mode octet code n'importe quel texte (UTF-8)
// sans avoir à décider s'il est numérique ou alphanumérique ; le niveau M
// répare 15 % du symbole, ce qu'il faut pour un code projeté au tableau ou
// photocopié. Le reste de la norme ne servirait à personne ici.

/**
 * LE DÉCOUPAGE EN BLOCS, niveau M, versions 1 à 20.
 *
 * Chaque ligne donne les groupes de blocs sous la forme
 * `[combien de blocs, mots au total par bloc, mots de données par bloc]`.
 * Le nombre de mots de CORRECTION par bloc en découle : total − données, et il
 * est le même pour tous les blocs d'une version.
 *
 * Cette table vient de la norme (ISO/IEC 18004, tableau 9). Elle a été extraite
 * de `segno` puis vérifiée par la comparaison bout à bout : une erreur de
 * recopie ici ferait diverger le symbole entier, donc elle ne peut pas passer
 * inaperçue.
 */
const BLOCS = [
    /*  1 */[[1, 26, 16]],
    /*  2 */[[1, 44, 28]],
    /*  3 */[[1, 70, 44]],
    /*  4 */[[2, 50, 32]],
    /*  5 */[[2, 67, 43]],
    /*  6 */[[4, 43, 27]],
    /*  7 */[[4, 49, 31]],
    /*  8 */[[2, 60, 38], [2, 61, 39]],
    /*  9 */[[3, 58, 36], [2, 59, 37]],
    /* 10 */[[4, 69, 43], [1, 70, 44]],
    /* 11 */[[1, 80, 50], [4, 81, 51]],
    /* 12 */[[6, 58, 36], [2, 59, 37]],
    /* 13 */[[8, 59, 37], [1, 60, 38]],
    /* 14 */[[4, 64, 40], [5, 65, 41]],
    /* 15 */[[5, 65, 41], [5, 66, 42]],
    /* 16 */[[7, 73, 45], [3, 74, 46]],
    /* 17 */[[10, 74, 46], [1, 75, 47]],
    /* 18 */[[9, 69, 43], [4, 70, 44]],
    /* 19 */[[3, 70, 44], [11, 71, 45]],
    /* 20 */[[3, 67, 41], [13, 68, 42]]
];

/**
 * LES CENTRES DES MOTIFS D'ALIGNEMENT — les petits carrés qui aident le lecteur
 * à redresser une photo prise de travers. On les pose à tous les croisements de
 * ces coordonnées, SAUF aux trois coins déjà occupés par les grands repères.
 */
const REPERES = [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
    [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
    [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
    [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90]
];

// --- Le corps fini à 256 éléments -------------------------------------------
//
// La correction d'erreurs de Reed-Solomon compte dans un monde où l'addition
// est le OU exclusif et où la multiplication passe par des logarithmes. On
// tabule les puissances de 2 dans ce monde-là (polynôme 0x11D, celui de la
// norme), et la multiplication redevient une addition d'exposants.

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const multiplier = (a, b) => (a && b) ? EXP[LOG[a] + LOG[b]] : 0;

/** Le polynôme générateur de degré `n` : le produit des (x − α⁰)…(x − αⁿ⁻¹). */
function generateur(n) {
    let g = [1];
    for (let i = 0; i < n; i++) {
        const suivant = new Array(g.length + 1).fill(0);
        for (let j = 0; j < g.length; j++) {
            suivant[j] ^= g[j];                       // × x
            suivant[j + 1] ^= multiplier(g[j], EXP[i]);
        }
        g = suivant;
    }
    return g;
}

/** Les `n` mots de correction d'un bloc : le reste de la division polynomiale. */
function correction(donnees, n) {
    const g = generateur(n);
    const reste = new Uint8Array(donnees.length + n);
    reste.set(donnees);
    for (let i = 0; i < donnees.length; i++) {
        const coef = reste[i];
        if (!coef) continue;
        for (let j = 0; j < g.length; j++) reste[i + j] ^= multiplier(g[j], coef);
    }
    return Array.from(reste.slice(donnees.length));
}

// --- Les données -------------------------------------------------------------

/** Combien d'octets de données cette version peut porter, niveau M. */
function capacite(version) {
    return BLOCS[version - 1].reduce((s, [n, , d]) => s + n * d, 0);
}

/** Le nombre de bits que prend la longueur du message, en mode octet. */
const bitsDeLongueur = (version) => (version <= 9 ? 8 : 16);

/**
 * LE FLUX BINAIRE : le mode, la longueur, les octets, puis le bourrage.
 *
 * Le bourrage n'est pas des zéros : la norme impose d'alterner 0xEC et 0x11.
 * Des zéros feraient de grandes plages claires, que le lecteur confondrait avec
 * le fond — c'est le même souci que le masquage résout plus loin.
 */
function motsDeDonnees(octets, version) {
    const bits = [];
    const pousser = (valeur, n) => { for (let i = n - 1; i >= 0; i--) bits.push((valeur >> i) & 1); };
    pousser(0b0100, 4);                        // mode octet
    pousser(octets.length, bitsDeLongueur(version));
    for (const o of octets) pousser(o, 8);

    const place = capacite(version) * 8;
    for (let i = 0; i < 4 && bits.length < place; i++) bits.push(0);   // terminateur
    while (bits.length % 8) bits.push(0);

    const mots = [];
    for (let i = 0; i < bits.length; i += 8) {
        let v = 0;
        for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
        mots.push(v);
    }
    // L'alternance part de 0xEC, à compter du PREMIER mot de bourrage — pas de
    // la parité de la position dans le message, qui n'a rien à voir.
    const bourrage = [0xEC, 0x11];
    for (let k = 0; mots.length < capacite(version); k++) mots.push(bourrage[k % 2]);
    return mots;
}

/**
 * LES MOTS FINAUX : les blocs sont ENTRELACÉS, et c'est tout l'intérêt.
 *
 * Une tache sur le symbole abîme alors un mot de chaque bloc plutôt que tout un
 * bloc : chacun reste sous son seuil de réparation, et le code se lit encore.
 */
function motsFinaux(octets, version) {
    const groupes = BLOCS[version - 1];
    const mots = motsDeDonnees(octets, version);
    const nEc = groupes[0][1] - groupes[0][2];

    const donnees = [], redondance = [];
    let i = 0;
    for (const [n, , d] of groupes) {
        for (let b = 0; b < n; b++) {
            const bloc = mots.slice(i, i + d);
            i += d;
            donnees.push(bloc);
            redondance.push(correction(Uint8Array.from(bloc), nEc));
        }
    }
    const out = [];
    const plusLong = Math.max(...donnees.map(b => b.length));
    for (let k = 0; k < plusLong; k++) for (const b of donnees) if (k < b.length) out.push(b[k]);
    for (let k = 0; k < nEc; k++) for (const b of redondance) out.push(b[k]);
    return out;
}

// --- Le dessin ---------------------------------------------------------------

/**
 * Les motifs que le lecteur cherche AVANT de lire quoi que ce soit : les trois
 * grands repères des coins, la piste de synchronisation, les petits repères
 * d'alignement, et le module noir de la norme. `fixe` retient leurs places :
 * les données ne doivent jamais s'y écrire.
 */
function poserLesMotifs(m, fixe, taille, version) {
    const repere = (r0, c0) => {
        for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
                const y = r0 + r, x = c0 + c;
                if (y < 0 || x < 0 || y >= taille || x >= taille) continue;
                const dedans = r >= 0 && r <= 6 && c >= 0 && c <= 6;
                const noir = dedans && (r === 0 || r === 6 || c === 0 || c === 6
                    || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
                m[y][x] = noir ? 1 : 0;
                fixe[y][x] = 1;
            }
        }
    };
    repere(0, 0); repere(0, taille - 7); repere(taille - 7, 0);

    for (let i = 8; i < taille - 8; i++) {
        const v = i % 2 === 0 ? 1 : 0;
        m[6][i] = v; fixe[6][i] = 1;
        m[i][6] = v; fixe[i][6] = 1;
    }

    // LES TROIS COINS SONT EXCLUS EXPLICITEMENT, et non « parce que la place est
    // déjà prise » : à partir de la version 7, un motif d'alignement tombe sur
    // la piste de synchronisation elle-même, et un test d'occupation le
    // supprimerait à tort.
    const pos = REPERES[version - 1];
    const dernier = pos.length - 1;
    for (let i = 0; i < pos.length; i++) {
        for (let j = 0; j < pos.length; j++) {
            if ((i === 0 && j === 0) || (i === 0 && j === dernier) || (i === dernier && j === 0)) continue;
            const r = pos[i], c = pos[j];
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const noir = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
                    m[r + dr][c + dc] = noir ? 1 : 0;
                    fixe[r + dr][c + dc] = 1;
                }
            }
        }
    }

    m[4 * version + 9][8] = 1;
    fixe[4 * version + 9][8] = 1;

    // Les emplacements de l'information de format et de version : réservés
    // maintenant, remplis après le choix du masque.
    for (let i = 0; i < 9; i++) { fixe[8][i] = 1; fixe[i][8] = 1; }
    for (let i = 0; i < 8; i++) { fixe[8][taille - 1 - i] = 1; fixe[taille - 1 - i][8] = 1; }
    if (version >= 7) {
        for (let i = 0; i < 18; i++) {
            const r = Math.floor(i / 3), c = i % 3;
            fixe[r][taille - 11 + c] = 1;
            fixe[taille - 11 + c][r] = 1;
        }
    }
}

/**
 * LES DONNÉES EN ZIGZAG : deux colonnes à la fois, de droite à gauche, en
 * remontant puis en redescendant. La colonne 6 se saute — c'est la piste de
 * synchronisation verticale, qui traverse tout le symbole.
 */
function poserLesDonnees(m, fixe, taille, mots) {
    let bit = 0;
    const total = mots.length * 8;
    let versLeHaut = true;
    for (let col = taille - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        for (let k = 0; k < taille; k++) {
            const r = versLeHaut ? taille - 1 - k : k;
            for (const c of [col, col - 1]) {
                if (fixe[r][c]) continue;
                m[r][c] = bit < total ? (mots[bit >> 3] >> (7 - (bit & 7))) & 1 : 0;
                bit++;
            }
        }
        versLeHaut = !versLeHaut;
    }
}

/**
 * LES HUIT MASQUES. Un symbole brut peut produire de grandes plages uniformes,
 * ou pire, des motifs qui ressemblent aux repères des coins : le lecteur s'y
 * perd. On superpose donc un damier — toujours l'un des huit de la norme — et
 * l'on garde celui qui gêne le moins.
 */
const MASQUES = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

/**
 * LE COÛT D'UN MASQUE, selon les quatre règles de la norme : les suites d'une
 * même couleur, les carrés de 2×2, les motifs qui imitent un repère de coin, et
 * le déséquilibre entre noir et blanc.
 */
function penalite(m, taille) {
    let score = 0;

    // Règle 1 : cinq modules de même couleur à la file, puis un point par
    // module supplémentaire.
    const suite = (lire) => {
        for (let a = 0; a < taille; a++) {
            let n = 1;
            for (let b = 1; b < taille; b++) {
                if (lire(a, b) === lire(a, b - 1)) {
                    n++;
                } else {
                    if (n >= 5) score += n - 2;
                    n = 1;
                }
            }
            if (n >= 5) score += n - 2;
        }
    };
    suite((r, c) => m[r][c]);
    suite((c, r) => m[r][c]);

    // Règle 2 : chaque carré 2×2 d'une seule couleur.
    for (let r = 0; r < taille - 1; r++) {
        for (let c = 0; c < taille - 1; c++) {
            const v = m[r][c];
            if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
        }
    }

    // Règle 3 : la suite 1:1:3:1:1 bordée de quatre modules clairs — c'est la
    // signature des repères de coin, et la voir ailleurs égare le lecteur.
    const MOTIF_A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const MOTIF_B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    const cherche = (lire) => {
        for (let a = 0; a < taille; a++) {
            for (let b = 0; b <= taille - 11; b++) {
                let a1 = true, b1 = true;
                for (let k = 0; k < 11; k++) {
                    const v = lire(a, b + k);
                    if (v !== MOTIF_A[k]) a1 = false;
                    if (v !== MOTIF_B[k]) b1 = false;
                }
                if (a1) score += 40;
                if (b1) score += 40;
            }
        }
    };
    cherche((r, c) => m[r][c]);
    cherche((c, r) => m[r][c]);

    // Règle 4 : l'écart à la moitié de modules noirs.
    let noirs = 0;
    for (let r = 0; r < taille; r++) for (let c = 0; c < taille; c++) noirs += m[r][c];
    const part = noirs * 100 / (taille * taille);
    score += Math.floor(Math.abs(part - 50) / 5) * 10;
    return score;
}

/** L'information de format : niveau M et masque, protégés par un BCH(15,5). */
function infoDeFormat(masque) {
    const donnee = (0b00 << 3) | masque;        // 00 = niveau M
    let reste = donnee << 10;
    for (let i = 14; i >= 10; i--) if ((reste >> i) & 1) reste ^= 0b10100110111 << (i - 10);
    return (((donnee << 10) | reste) ^ 0b101010000010010);
}

/** L'information de version, à partir de la version 7 : un BCH(18,6). */
function infoDeVersion(version) {
    let reste = version << 12;
    for (let i = 17; i >= 12; i--) if ((reste >> i) & 1) reste ^= 0x1F25 << (i - 12);
    return (version << 12) | reste;
}

function poserLeFormat(m, taille, bits) {
    for (let i = 0; i < 15; i++) {
        // LE BIT DE POIDS FORT EN PREMIER. Écrit dans l'autre sens, le symbole
        // reste beau mais aucun lecteur ne le déchiffre : il ne sait plus quel
        // masque retirer, et rend une chaîne vide. C'est exactement ce qu'OpenCV
        // faisait de nos soixante-douze premiers essais.
        const b = (bits >> (14 - i)) & 1;
        // La première copie, autour du repère du coin haut-gauche.
        if (i < 6) m[8][i] = b;
        else if (i === 6) m[8][7] = b;
        else if (i === 7) m[8][8] = b;
        else if (i === 8) m[7][8] = b;
        else m[14 - i][8] = b;
        // La seconde, répartie sur les deux autres coins : si l'un est abîmé,
        // l'autre dit encore quel masque a servi.
        //
        // SEPT MODULES EN COLONNE, HUIT EN LIGNE — et pas huit et sept. La
        // ligne (taille − 8) de la colonne 8 est le MODULE NOIR de la norme,
        // qui vaut 1 quoi qu'il arrive ; y écrire un bit de format l'effaçait,
        // et le symbole entier devenait illisible. C'est l'erreur que la
        // comparaison avec segno a montrée en premier.
        if (i < 7) m[taille - 1 - i][8] = b;
        else m[8][taille - 15 + i] = b;
    }
}

function poserLaVersion(m, taille, version) {
    if (version < 7) return;
    const bits = infoDeVersion(version);
    for (let i = 0; i < 18; i++) {
        const b = (bits >> i) & 1;
        const r = Math.floor(i / 3), c = i % 3;
        m[r][taille - 11 + c] = b;
        m[taille - 11 + c][r] = b;
    }
}

/** La plus petite version qui porte ce texte, ou `null` s'il est trop long. */
function versionPour(octets) {
    for (let v = 1; v <= BLOCS.length; v++) {
        if (4 + bitsDeLongueur(v) + 8 * octets.length <= capacite(v) * 8) return v;
    }
    return null;
}

/**
 * LE QR CODE D'UN TEXTE.
 *
 * @param {string} texte
 * @param {{version?: number}} [options] version imposée, pour les vérifications
 * @returns {{taille: number, modules: number[][], version: number, masque: number}|null}
 *          `null` si le texte ne tient pas dans les versions gérées.
 */
export function qrcode(texte, options = {}) {
    const octets = Array.from(new TextEncoder().encode(String(texte ?? '')));
    const version = options.version || versionPour(octets);
    if (!version || version < 1 || version > BLOCS.length) return null;
    if (4 + bitsDeLongueur(version) + 8 * octets.length > capacite(version) * 8) return null;

    const taille = 17 + 4 * version;
    const mots = motsFinaux(octets, version);

    const vide = () => Array.from({ length: taille }, () => new Uint8Array(taille));
    const fixe = vide();
    const base = vide();
    poserLesMotifs(base, fixe, taille, version);
    poserLesDonnees(base, fixe, taille, mots);

    let meilleur = null;
    for (let masque = 0; masque < 8; masque++) {
        const m = base.map(l => Uint8Array.from(l));
        for (let r = 0; r < taille; r++) {
            for (let c = 0; c < taille; c++) {
                if (!fixe[r][c] && MASQUES[masque](r, c)) m[r][c] ^= 1;
            }
        }
        poserLeFormat(m, taille, infoDeFormat(masque));
        poserLaVersion(m, taille, version);
        const score = penalite(m, taille);
        if (!meilleur || score < meilleur.score) meilleur = { score, masque, m };
    }

    return {
        taille, version, masque: meilleur.masque,
        modules: meilleur.m.map(l => Array.from(l))
    };
}

/**
 * LE MÊME, EN SVG — prêt à poser dans la page ou à imprimer.
 *
 * LA MARGE BLANCHE N'EST PAS DE LA DÉCORATION : la norme demande quatre modules
 * de silence tout autour, et sans eux beaucoup de lecteurs ne trouvent pas le
 * symbole. On dessine un fond blanc explicite pour la même raison — un QR sur
 * fond sombre ne se lit pas, et la page peut être en thème sombre.
 *
 * Les modules noirs sont réunis en UN seul chemin : quelques centaines de
 * rectangles séparés alourdiraient la page et l'impression pour rien.
 */
export function qrcodeSVG(texte, { module = 4, marge = 4, titre = '' } = {}) {
    const q = qrcode(texte);
    if (!q) return '';
    const cote = (q.taille + 2 * marge) * module;
    let d = '';
    for (let r = 0; r < q.taille; r++) {
        for (let c = 0; c < q.taille; c++) {
            if (!q.modules[r][c]) continue;
            d += `M${(c + marge) * module} ${(r + marge) * module}h${module}v${module}h-${module}z`;
        }
    }
    const nom = titre ? `<title>${titre.replace(/[<&]/g, '')}</title>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cote} ${cote}"`
        + ` width="${cote}" height="${cote}" role="img">${nom}`
        + `<rect width="${cote}" height="${cote}" fill="#fff"/>`
        + `<path d="${d}" fill="#000"/></svg>`;
}
