// L'ANNEAU DE MOTS — la grille que Rémy fabrique à la main.
//
// TROISIÈME ESSAI, ET CETTE FOIS J'AI LU LA GRILLE. Rémy : « pour le mot caché,
// ce n'est vraiment pas ça, je te redonne un exercice que j'ai créé. » Il a
// joint la photo de sa fiche. Je l'ai décodée case par case, et elle dit
// exactement comment elle est faite :
//
//     INCONNUE · UN          DÉVELOPPER   EXPRESSION
//     NUMÉRIQUE              ÉCRITURE     ADDITION
//     LETTRES                NOMBRE       TRENTE
//     SOMME                  DEUX         CINQ
//     CALCUL · SEPT   LITTÉRALE   DIVISER   TROIS
//
// CE N'EST NI UN MOT CROISÉ NI UN PAVÉ : C'EST UN ANNEAU. Un cadre de quatre
// bandes par côté, le centre laissé vide, et — c'est le point capital — LES MOTS
// NE SE CROISENT JAMAIS. Chaque bande est un couloir indépendant.
//
// POURQUOI C'EST LA BONNE FORME, ET PAS UN CAPRICE DE MISE EN PAGE :
//
//   · UN MOT CODÉ N'A PAS DE DÉFINITIONS. Dans un mot croisé, les croisements
//     remplacent les définitions manquantes : une lettre commune fait tomber
//     deux mots à la fois. Mais ils rendent la GÉNÉRATION incertaine — il faut
//     essayer, reculer, recommencer, et l'on finit avec un rectangle à trous.
//     Ici la difficulté ne vient pas des croisements, elle vient de l'alphabet :
//     trouver que 16 = E allume quarante cases d'un coup, partout dans l'anneau.
//     Le croisement ne manque donc pas ; il ferait double emploi.
//
//   · CHAQUE BANDE SE REMPLIT SEULE, donc la grille est TOUJOURS pleine. Plus de
//     rectangle aux trois quarts noir quand le lexique du thème est court : on
//     sait à l'avance qu'il faut 11, puis 9, puis 7, puis 5 lettres, et l'on va
//     les chercher. C'est un problème de rangement, pas de chance.
//
//   · LE CENTRE VIDE EST LA PLACE DE LA CONSIGNE, sur le papier comme à l'écran.
//     Rémy y écrit son énoncé. Une grille pleine n'en laisserait pas.
//
// LA GÉOMÉTRIE, EXACTEMENT. Pour une grille L × H et une profondeur d, on pose
// pour chaque i de 0 à d−1 :
//
//     ┌─────────────────────────┐   · une case d'angle en (i, i) : c'est une
//     │ ↳ · · · · · · · · ↳ · ⇓ │     flèche COUDÉE, elle lance à la fois la
//     │ · ↳ · · · · · · · ⇓ · · │     bande horizontale qui part vers la droite
//     │ · · ↳ · · · · · ⇓ · · · │     ET la bande verticale qui descend ;
//     │ · · · ↳ · · · ⇓ · · · · │   · une flèche ⇓ en (i, L−1−i), qui lance la
//     │ · · · ·       · · · · · │     bande verticale de droite ;
//     │ · · · ·       · · · · · │   · une flèche ⇒ en (H−1−i, i), qui lance la
//     │ · · · ⇒ · · · ▪ · · · · │     bande horizontale du bas ;
//     │ · · ⇒ · · · · · ▪ · · · │   · une case muette en (H−1−i, L−1−i) : elle
//     │ · ⇒ · · · · · · · ▪ · · │     ne lance rien, elle FERME les deux bandes
//     │ ⇒ · · · · · · ⇒ · · ▪ · │     qui viennent buter dessus.
//     └─────────────────────────┘
//
// Les longueurs tombent alors toutes seules : L−2i−2 pour les bandes
// horizontales, H−2i−2 pour les verticales. Chez Rémy (13 × 12, profondeur 4) :
// 11, 9, 7, 5 en haut et en bas, 10, 8, 6, 4 à gauche et à droite.
//
// UNE BANDE PEUT PORTER DEUX MOTS, séparés par une case muette qui reprend la
// flèche de la bande — c'est ce qu'il fait pour « CALCUL ▪ SEPT » sur ses onze
// cases du bas. On préfère toujours UN mot qui remplit la bande à deux mots qui
// la remplissent : moins de cases muettes, plus de lettres à décoder.
//
// Module pur : ni DOM, ni horloge, ni journal.

/** En dessous, ce n'est plus un mot, c'est une abréviation. */
export const LONGUEUR_MIN = 3;

/** Au-delà, la bande deviendrait un patchwork de petits mots. */
const MOTS_PAR_BANDE = 3;

/**
 * LES BANDES D'UN ANNEAU, dans l'ordre où on les remplit : les plus longues
 * d'abord, parce qu'un mot de onze lettres ne se trouve pas deux fois.
 *
 * @returns {{bandes: Array, fleches: Array}} `fleches` porte les cases muettes
 *   d'angle, avec le sens qu'elles annoncent : `coin` (droite ET bas), `bas`,
 *   `droite`, ou `fin` (elle ne lance rien, elle ferme).
 */
export function bandesAnneau(largeur, hauteur, profondeur) {
    const L = Math.max(1, Math.floor(largeur));
    const H = Math.max(1, Math.floor(hauteur));
    const bandes = [];
    const fleches = [];
    const dMax = Math.floor((Math.min(L, H) - 1) / 2);
    const d = Math.max(0, Math.min(Math.floor(profondeur), dMax));

    for (let i = 0; i < d; i++) {
        const lh = L - 2 * i - 2;      // longueur des bandes horizontales
        const lv = H - 2 * i - 2;      // longueur des bandes verticales
        if (lh < LONGUEUR_MIN && lv < LONGUEUR_MIN) break;

        fleches.push({ x: i, y: i, type: 'coin' });
        fleches.push({ x: L - 1 - i, y: i, type: 'bas' });
        fleches.push({ x: i, y: H - 1 - i, type: 'droite' });
        fleches.push({ x: L - 1 - i, y: H - 1 - i, type: 'fin' });

        if (lh >= LONGUEUR_MIN) {
            bandes.push({ id: `h${i}`, sens: 'h', x: i + 1, y: i, longueur: lh, rang: i });
            bandes.push({ id: `b${i}`, sens: 'h', x: i + 1, y: H - 1 - i, longueur: lh, rang: i });
        }
        if (lv >= LONGUEUR_MIN) {
            bandes.push({ id: `g${i}`, sens: 'v', x: i, y: i + 1, longueur: lv, rang: i });
            bandes.push({ id: `d${i}`, sens: 'v', x: L - 1 - i, y: i + 1, longueur: lv, rang: i });
        }
    }
    bandes.sort((a, b) => b.longueur - a.longueur || (a.id < b.id ? -1 : 1));
    return { bandes, fleches, profondeur: d };
}

/**
 * LES DÉCOUPES POSSIBLES D'UNE BANDE, de la meilleure à la moins bonne.
 *
 * Une bande de n cases porte k mots et k−1 cases muettes entre eux : les mots
 * totalisent donc n−k+1 lettres. On les rend triées : d'abord un seul mot qui
 * remplit tout, puis deux, puis trois — et à nombre égal, les découpes les plus
 * équilibrées d'abord, parce qu'un « 3 + 7 » se lit moins bien qu'un « 5 + 5 ».
 */
export function decoupes(n, maxMots = MOTS_PAR_BANDE) {
    const out = [];
    const bati = [];
    const creuser = (reste) => {
        if (reste === 0) { if (bati.length) out.push(bati.slice()); return; }
        if (bati.length >= maxMots) return;
        // Le premier mot commence au bord de la bande ; chacun des suivants
        // coûte d'abord sa case muette.
        const cout = bati.length ? 1 : 0;
        for (let l = LONGUEUR_MIN; l + cout <= reste; l++) {
            bati.push(l);
            creuser(reste - l - cout);
            bati.pop();
        }
    };
    creuser(n);
    const ecart = (d) => Math.max(...d) - Math.min(...d);
    return out.sort((a, b) => a.length - b.length || ecart(a) - ecart(b));
}

/** Les mots d'une réserve, rangés par longueur. */
function parLongueur(mots) {
    const m = new Map();
    mots.forEach(w => {
        const l = w.mot.length;
        if (!m.has(l)) m.set(l, []);
        m.get(l).push(w);
    });
    return m;
}

/**
 * REMPLIT UNE BANDE. On essaie les découpes dans l'ordre et l'on s'arrête à la
 * première qui trouve ses mots ; les mots retenus sortent de la réserve.
 *
 * `null` si rien ne rentre — l'appelant décidera d'en faire des cases muettes
 * plutôt que de mentir sur une bande à moitié pleine.
 */
export function garnirBande(bande, reserve, rng) {
    const parL = parLongueur(reserve);
    for (const decoupe of decoupes(bande.longueur)) {
        if (!decoupe.every(l => (parL.get(l) || []).length)) continue;
        const pris = [];
        const utilises = new Set();
        let ok = true;
        for (const l of decoupe) {
            const libres = (parL.get(l) || []).filter(w => !utilises.has(w.mot));
            if (!libres.length) { ok = false; break; }
            // Le thème d'abord : c'est le vocabulaire qu'on veut faire lire.
            const duTheme = libres.filter(w => w.duTheme);
            const choix = rng.pick(duTheme.length ? duTheme : libres);
            utilises.add(choix.mot);
            pris.push(choix);
        }
        if (!ok) continue;
        return pris;
    }
    return null;
}

/**
 * L'ANNEAU GARNI, en un tirage.
 *
 * @returns {{cases, largeur, hauteur, mots, fleches, muettes, trous}}
 *   `cases[y][x]` porte une lettre, ou `null` pour une case muette.
 *   `trous` compte les cases qu'on n'a pas su remplir : c'est ce qui départage
 *   deux tirages.
 */
export function garnirAnneau({ largeur, hauteur, profondeur, mots, rng }) {
    const { bandes, fleches } = bandesAnneau(largeur, hauteur, profondeur);
    const cases = Array.from({ length: hauteur }, () => new Array(largeur).fill(null));
    const muettes = fleches.map(f => ({ ...f }));
    const poses = [];
    let reserve = mots.slice();
    let trous = 0;

    for (const bande of bandes) {
        const pris = garnirBande(bande, reserve, rng);
        const dx = bande.sens === 'h' ? 1 : 0;
        const dy = bande.sens === 'h' ? 0 : 1;
        const flecheBande = bande.sens === 'h' ? 'droite' : 'bas';
        if (!pris) { trous += bande.longueur; continue; }
        const choisis = new Set(pris.map(w => w.mot));
        reserve = reserve.filter(w => !choisis.has(w.mot));

        let k = 0;
        pris.forEach((w, iMot) => {
            if (iMot) {
                // La case muette qui sépare deux mots reprend la flèche de sa
                // bande : sans elle, on ne saurait pas que le mot repart.
                muettes.push({ x: bande.x + dx * k, y: bande.y + dy * k, type: flecheBande });
                k++;
            }
            const x = bande.x + dx * k;
            const y = bande.y + dy * k;
            for (let j = 0; j < w.mot.length; j++) {
                cases[y + dy * j][x + dx * j] = w.mot[j];
            }
            poses.push({
                mot: w.mot, def: w.def, duTheme: !!w.duTheme,
                x, y, dir: bande.sens, bande: bande.id
            });
            k += w.mot.length;
        });
    }

    return {
        cases, largeur, hauteur,
        mots: poses.sort((a, b) => (a.y - b.y) || (a.x - b.x)),
        fleches: muettes,
        trous
    };
}
