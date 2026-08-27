// LE COMPTAGE DE CUBES — un empilement, et « combien y en a-t-il ? ».
//
// Rémy : « j'aimerais un exercice de comptage de cubes ».
//
// C'EST L'EXERCICE OÙ L'ON APPREND QU'UN DESSIN MENT. On voit vingt faces et
// il y a douze cubes ; on voit douze cubes et il y en a seize, parce que trois
// sont derrière et un dessous. Compter ce qu'on ne voit pas est exactement ce
// qu'on demandera plus tard pour le volume d'un pavé — et le pavé plein, dont
// la réponse est L × p × h, est la première marche de cette leçon.
//
// LE SOLIDE EST UNE CARTE DE HAUTEURS. `hauteurs[y][x]` dit combien de cubes
// sont empilés sur la case (x, y) du sol. Deux conséquences, et ce sont elles
// qui rendent l'exercice honnête :
//
//   · AUCUN CUBE NE FLOTTE. Une pile part toujours du sol, donc tout ce qui
//     est caché est bien SOUS ou DERRIÈRE quelque chose — jamais suspendu.
//     Sans cette garantie, la figure aurait plusieurs réponses.
//   · LE PAVÉ QUI CONTIENT LE SOLIDE se lit directement : c'est la boîte de
//     largeur × profondeur × hauteur maximale. « Combien en ajouter pour
//     remplir la boîte » devient une soustraction que l'on peut poser.
//
// Module pur : ni DOM, ni hasard propre.

/** Le nombre de cubes de l'empilement. */
export const totalCubes = (h) => h.flat().reduce((s, v) => s + v, 0);

/** Combien de cubes touchent le sol : une colonne non vide, un cube au sol. */
export const cubesAuSol = (h) => h.flat().filter(v => v > 0).length;

/**
 * LA BOÎTE QUI CONTIENT TOUT — mesurée sur les cubes, pas sur le tableau.
 *
 * Une colonne peut être vide : quand elle est au bord, le tableau est plus
 * grand que le solide, et « le pavé qui contient » compterait des cubes qui ne
 * contiennent rien. On prend donc l'étendue RÉELLEMENT occupée.
 */
export function boitePleine(h) {
    let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity, hauteur = 0;
    h.forEach((ligne, y) => ligne.forEach((n, x) => {
        if (!n) return;
        x1 = Math.min(x1, x); x2 = Math.max(x2, x);
        y1 = Math.min(y1, y); y2 = Math.max(y2, y);
        hauteur = Math.max(hauteur, n);
    }));
    if (!Number.isFinite(x1)) {
        return { x1: 0, y1: 0, largeur: 0, profondeur: 0, hauteur: 0, cubes: 0 };
    }
    const largeur = x2 - x1 + 1, profondeur = y2 - y1 + 1;
    return { x1, y1, largeur, profondeur, hauteur, cubes: largeur * profondeur * hauteur };
}

/** Combien de cubes il manque pour que la boîte soit pleine. */
export const cubesAAjouter = (h) => boitePleine(h).cubes - totalCubes(h);

/**
 * LES CUBES QU'ON NE VOIT PAS DU TOUT.
 *
 * On regarde l'empilement d'en haut, de la droite et de devant à la fois —
 * c'est l'axonométrie du dessin. Un cube ne montre donc rien s'il a un voisin
 * dans ces trois directions : au-dessus, en x+1 et en y+1.
 *
 * Ce n'est pas exporté comme QUESTION — un cube dont une face est libre peut
 * encore être masqué par une pile plus haute posée devant, et une question
 * dont la réponse dépend d'un détail de dessin n'est pas une question. Mais
 * c'est la bonne mesure pour DIRE combien de cubes se cachent, dans un indice
 * ou dans le corrigé.
 */
export function cubesCaches(h) {
    const P = h.length, L = h[0] ? h[0].length : 0;
    let n = 0;
    for (let y = 0; y < P; y++) for (let x = 0; x < L; x++) {
        for (let z = 0; z < h[y][x]; z++) {
            const dessus = z + 1 < h[y][x];
            const droite = x + 1 < L && h[y][x + 1] > z;
            const devant = y + 1 < P && h[y + 1][x] > z;
            if (dessus && droite && devant) n++;
        }
    }
    return n;
}

// --- Le dessin, en données ----------------------------------------------------

// LA PERSPECTIVE CAVALIÈRE, celle du collège.
//
// Rémy : « pour le comptage de cubes, je voulais aussi que tu mettes en place
// de la perspective cavalière. »
//
// CE N'EST PAS UN DÉTAIL DE STYLE, C'EST LE DESSIN DU PROGRAMME. La vue
// précédente était une AXONOMÉTRIE isométrique : les trois axes à trente degrés,
// aucune face en vraie grandeur. Jolie, et étrangère au cahier — l'élève de
// sixième apprend à représenter un pavé en perspective cavalière, et c'est
// cette figure-là qu'on lui demandera de reproduire.
//
// SA RÈGLE TIENT EN TROIS PHRASES :
//   1. La FACE AVANT se dessine en VRAIE GRANDEUR — un carré reste un carré.
//      C'est la propriété qui la distingue de toutes les autres vues, et celle
//      qui permet de mesurer sur le dessin.
//   2. Les FUYANTES partent à un angle constant, ici 30°.
//   3. Elles sont RÉDUITES d'un coefficient, ici 1/2. Sans réduction, le solide
//      paraît deux fois trop profond ; c'est le choix des manuels.
//
// L'orientation reste celle d'avant — `y` croissant vient vers l'observateur,
// donc vers la gauche et vers le bas — pour que l'ordre de peinture, les faces
// visibles et les exercices déjà écrits gardent le même sens.
export const FUITE = { angle: 30, coefficient: 0.5 };
const FX = FUITE.coefficient * Math.cos(FUITE.angle * Math.PI / 180);
const FY = FUITE.coefficient * Math.sin(FUITE.angle * Math.PI / 180);

export const projeter = (x, y, z) => ({
    // La face avant (y constant) garde ses proportions : un déplacement d'un
    // cube en x vaut exactement une unité à l'écran, un déplacement en z aussi.
    x: x - y * FX,
    y: -z + y * FY
});

/** Les trois faces visibles d'un cube, chacune en quatre points projetés. */
export function facesCube(x, y, z) {
    const P = (a, b, c) => projeter(x + a, y + b, z + c);
    return {
        // Le dessus, puis la face de droite (x+1) et celle de gauche (y+1) :
        // ce sont exactement les trois qui regardent l'observateur.
        dessus: [P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)],
        droite: [P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)],
        gauche: [P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)]
    };
}

/**
 * LES CUBES DANS L'ORDRE OÙ IL FAUT LES PEINDRE.
 *
 * Du plus loin au plus près : l'observateur est du côté des x, y et z
 * croissants, donc un cube de somme x + y + z plus grande est devant. Peints
 * dans cet ordre, les cubes se recouvrent tout seuls, sans qu'on ait à
 * calculer une seule occultation.
 */
export function cubesAPeindre(h) {
    const liste = [];
    h.forEach((ligne, y) => ligne.forEach((n, x) => {
        for (let z = 0; z < n; z++) liste.push({ x, y, z });
    }));
    return liste.sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z));
}

/** La boîte du dessin, en unités projetées : de quoi le cadrer sans marge perdue. */
export function boiteDessin(h) {
    const b = boitePleine(h);
    const coins = [];
    for (const x of [b.x1, b.x1 + b.largeur]) {
        for (const y of [b.y1, b.y1 + b.profondeur]) {
            for (const z of [0, b.hauteur]) coins.push(projeter(x, y, z));
        }
    }
    const xs = coins.map(p => p.x), ys = coins.map(p => p.y);
    const xmin = Math.min(...xs), xmax = Math.max(...xs);
    const ymin = Math.min(...ys), ymax = Math.max(...ys);
    return {
        xmin, xmax, ymin, ymax,
        largeur: Math.max(0.5, xmax - xmin),
        hauteur: Math.max(0.5, ymax - ymin)
    };
}

// --- Les familles d'empilements ----------------------------------------------

/** Un pavé plein : la réponse est L × p × h, et c'est tout l'intérêt. */
export function pave(largeur, profondeur, hauteur) {
    return Array.from({ length: profondeur }, () => new Array(largeur).fill(hauteur));
}

/**
 * LES CINQ FAMILLES, de la plus lisible à la moins.
 *
 * `pave` compte par multiplication, `couche` par un pavé plus un reste,
 * `escalier` par tranches, `creux` par soustraction, `libre` colonne par
 * colonne. Ce ne sont pas cinq décors : ce sont cinq méthodes de comptage, et
 * c'est pour cela qu'on les propose séparément.
 */
export const FAMILLES = {
    pave: 'Un pavé plein',
    couche: 'Un pavé, plus une couche entamée',
    escalier: 'Un escalier',
    creux: 'Un pavé à qui il manque des cubes',
    libre: 'Des colonnes de hauteurs quelconques'
};

/**
 * LA TAILLE ANNONCÉE EST UN PLAFOND, PAS UN GABARIT.
 *
 * Sur la première fiche imprimée, `pave` et `escalier` ne tiraient rien au
 * sort : le pavé de 3 × 3 × 3 est le pavé de 3 × 3 × 3, et l'escalier qui en
 * descend aussi. Les empilements 1, 5 et 9 sortaient identiques, avec la même
 * réponse — trois exercices pour le prix d'un, et un élève qui recopie.
 *
 * ON N'AMPUTE QU'UNE DIMENSION, ou aucune. Les rogner toutes les trois donnait
 * bien de la variété, mais faisait tomber un « 3 × 3 × 3 » à six cubes : on
 * annonçait un exercice et l'on en donnait un autre, trois fois plus facile.
 *
 * LE PAVÉ A DROIT À DEUX, parce qu'il n'a que ça. Les autres familles tirent
 * leur relief au sort et sortent douze figures différentes même à dimensions
 * fixes ; un pavé plein est un pavé plein, et avec une seule dimension mobile
 * il ne connaît que quatre figures — sur les trois cases qu'il occupe dans une
 * fiche de douze, deux tombaient encore identiques.
 */
function cadreTire({ largeur, profondeur, hauteur }, rng, ampute = 1) {
    const d = [largeur, profondeur, hauteur];
    // On tire les dimensions à rogner sans remise, en comptant `d.length` comme
    // « celle-là, on n'y touche pas ».
    rng.shuffle([0, 1, 2, 3]).slice(0, ampute).forEach(i => {
        if (i < 3 && d[i] > 2) d[i] -= 1;
    });
    return { largeur: d[0], profondeur: d[1], hauteur: d[2] };
}

export function construire(famille, opts) {
    const rng = opts.rng;
    const { largeur, profondeur, hauteur } = cadreTire(opts, rng, famille === 'pave' ? 2 : 1);
    const cadre = { largeur, profondeur, hauteur, rng };
    const h = pave(largeur, profondeur, hauteur);
    if (famille === 'pave') return h;

    if (famille === 'escalier') {
        // UNE MARCHE PAR RANGÉE, mais pas toujours la même rangée ni le même
        // sens : l'escalier descend le long des lignes ou des colonnes, et vers
        // l'avant ou vers l'arrière. Quatre escaliers au lieu d'un, et l'élève
        // doit regarder DANS QUEL SENS il descend au lieu de reconnaître un
        // dessin déjà vu.
        const parLigne = rng.int(0, 1) === 0;
        const enSens = rng.int(0, 1) === 0;
        return h.map((ligne, y) => ligne.map((_, x) => {
            const rang = parLigne ? y : x;
            const total = parLigne ? profondeur : largeur;
            const marche = enSens ? rang : total - 1 - rang;
            return Math.max(1, hauteur - marche);
        }));
    }
    if (famille === 'couche') {
        // Un pavé complet, puis une couche posée dessus à moitié.
        const bas = pave(largeur, profondeur, Math.max(1, hauteur - 1));
        const cases = rng.shuffle(bas.flatMap((l, y) => l.map((_, x) => ({ x, y }))));
        cases.slice(0, Math.max(1, Math.round(cases.length * 0.55)))
            .forEach(({ x, y }) => { bas[y][x] += 1; });
        return bas;
    }
    if (famille === 'creux') {
        // Un pavé à qui l'on retire des cubes par le HAUT : une pile ne se
        // creuse jamais par le milieu, sinon un cube flotterait. Une colonne
        // peut disparaître entièrement — c'est ce qui rend « combien de cubes
        // touchent le sol » autre chose qu'une lecture de la base.
        const cases = rng.shuffle(h.flatMap((l, y) => l.map((_, x) => ({ x, y }))));
        cases.slice(0, Math.max(1, Math.round(cases.length * 0.45))).forEach(({ x, y }) => {
            h[y][x] = Math.max(0, h[y][x] - rng.int(1, hauteur));
        });
        return garantir(h, cadre);
    }
    // libre : chaque colonne tire sa hauteur, zéro compris.
    const libre = h.map(ligne => ligne.map(() => rng.int(0, hauteur)));
    return garantir(libre, cadre);
}

/**
 * LE SOLIDE DOIT TENIR SES PROMESSES : occuper toute l'étendue de son cadre, et
 * garder assez de colonnes pour rester un solide et non trois piquets. Sans
 * cela, un tirage malheureux donne un empilement bien plus petit que la taille
 * demandée — et l'élève à qui l'on a promis un 4 × 3 × 3 compte six cubes.
 */
function garantir(h, { largeur, profondeur, hauteur, rng }) {
    const pose = (x, y, n) => { h[y][x] = Math.max(h[y][x], n); };
    // Les quatre coins de la base fixent l'étendue ; le sommet fixe la hauteur.
    pose(0, 0, 1); pose(largeur - 1, 0, 1);
    pose(0, profondeur - 1, 1); pose(largeur - 1, profondeur - 1, 1);
    pose(rng.int(0, largeur - 1), rng.int(0, profondeur - 1), hauteur);
    // Au moins la moitié des colonnes debout : en dessous, ce n'est plus un
    // empilement, c'est un semis.
    const vides = h.flatMap((l, y) => l.map((n, x) => (n ? null : { x, y }))).filter(Boolean);
    const trop = vides.length - Math.floor(largeur * profondeur * 0.45);
    rng.shuffle(vides).slice(0, Math.max(0, trop)).forEach(({ x, y }) => pose(x, y, rng.int(1, hauteur)));
    return h;
}

/** Ce qui se mesure sur un empilement : de quoi écrire l'énoncé et le corrigé. */
export function mesures(h) {
    const b = boitePleine(h);
    return {
        total: totalCubes(h),
        sol: cubesAuSol(h),
        caches: cubesCaches(h),
        aAjouter: cubesAAjouter(h),
        boite: b
    };
}
