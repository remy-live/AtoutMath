// L'ORGANIGRAMME DES QUADRILATÈRES — la hiérarchie, et ce qu'elle enseigne.
//
// Rémy : « des exercices pour comprendre comment on passe d'un quadrilatère à
// un parallélogramme. J'aime l'organigramme avec les cartes à replacer. Il faut
// des choses visuelles quitte à avoir des animations. »
//
// CE QUE L'ORGANIGRAMME DIT, ET QU'UNE LISTE DE DÉFINITIONS NE DIT PAS. Un
// élève apprend cinq définitions séparées et croit avoir cinq familles côte à
// côte. Or elles s'EMBOÎTENT : un carré est un rectangle, un rectangle est un
// parallélogramme. « Est-ce qu'un carré est un rectangle ? » est la question
// qui départage ceux qui ont compris.
//
// PAS DE TRAPÈZE. Rémy : « enlève le trapèze, ce n'est pas au programme ». Il
// y était, en haut de l'arbre, parce que la hiérarchie mathématique complète le
// place là — et c'est exactement la raison de l'enlever : ce logiciel enseigne
// le programme du collège, pas la hiérarchie complète. Une case de plus à
// apprendre, qui ne sera demandée nulle part, coûte à l'élève sans rien lui
// rendre. Le quadrilatère quelconque descend donc DIRECTEMENT au
// parallélogramme.
//
// ET LE CARRÉ SE REJOINT PAR DEUX CHEMINS. C'est le cœur de la figure, et sa
// beauté : on descend au carré depuis le rectangle en ajoutant « deux côtés
// consécutifs de même longueur », ou depuis le losange en ajoutant « un angle
// droit ». Chaque chemin apporte la propriété que l'AUTRE avait déjà. Un élève
// qui voit cela ne confondra plus jamais un losange et un carré.
//
// CHAQUE FLÈCHE PORTE UNE SEULE PROPRIÉTÉ, ET C'EST LA RÈGLE DU JEU : descendre
// d'un cran, c'est ajouter exactement une condition. Un organigramme dont les
// flèches porteraient deux conditions n'apprendrait rien — on ne saurait pas
// laquelle a fait la différence.

/**
 * Les cinq familles. `figure` est le contour à dessiner, dans un carré de 100 ;
 * `quoi` est la définition telle qu'on la dit en classe.
 */
export const FAMILLES = [
    {
        id: 'quadrilatere', nom: 'Quadrilatère', rang: 0,
        quoi: 'quatre côtés, et rien de plus',
        figure: [[10, 22], [86, 10], [92, 62], [24, 78]]
    },
    {
        id: 'parallelogramme', nom: 'Parallélogramme', rang: 1,
        quoi: 'les côtés opposés sont parallèles deux à deux',
        figure: [[26, 20], [92, 20], [74, 72], [8, 72]]
    },
    {
        id: 'rectangle', nom: 'Rectangle', rang: 2,
        quoi: 'un parallélogramme qui a un angle droit — donc quatre',
        figure: [[12, 24], [88, 24], [88, 68], [12, 68]]
    },
    {
        id: 'losange', nom: 'Losange', rang: 2,
        quoi: 'un parallélogramme dont les quatre côtés sont de même longueur',
        figure: [[50, 12], [90, 46], [50, 80], [10, 46]]
    },
    {
        id: 'carre', nom: 'Carré', rang: 3,
        quoi: 'à la fois rectangle ET losange',
        figure: [[24, 24], [76, 24], [76, 76], [24, 76]]
    }
];

/**
 * LES FLÈCHES, et la propriété que chacune ajoute.
 *
 * `ajoute` est ce qu'on écrit SUR la flèche : la condition unique qui fait
 * descendre d'un cran. `piege` est ce qu'on répond à l'élève qui place cette
 * carte au mauvais endroit — c'est la phrase qui enseigne.
 */
export const FLECHES = [
    {
        de: 'quadrilatere', vers: 'parallelogramme',
        ajoute: 'les côtés opposés parallèles',
        piege: 'Le parallélogramme n\'ajoute pas des côtés égaux : il ajoute le '
            + 'PARALLÉLISME des deux paires de côtés opposés. Les longueurs suivent toutes '
            + 'seules.'
    },
    {
        de: 'parallelogramme', vers: 'rectangle',
        ajoute: 'un angle droit',
        piege: 'Un seul angle droit suffit dans un parallélogramme : les trois autres le '
            + 'deviennent forcément.'
    },
    {
        de: 'parallelogramme', vers: 'losange',
        ajoute: 'deux côtés consécutifs égaux',
        piege: 'Dans un parallélogramme, deux côtés CONSÉCUTIFS de même longueur suffisent : '
            + 'les côtés opposés étaient déjà égaux.'
    },
    {
        de: 'rectangle', vers: 'carre',
        ajoute: 'deux côtés consécutifs égaux',
        piege: 'Au rectangle il manque les longueurs ; au losange il manque l\'angle droit. '
            + 'Ce n\'est pas la même carte qui les complète.'
    },
    {
        de: 'losange', vers: 'carre',
        ajoute: 'un angle droit',
        piege: 'Au losange il manque l\'angle droit ; au rectangle il manque les longueurs. '
            + 'Ce n\'est pas la même carte qui les complète.'
    }
];

export const familleDe = (id) => FAMILLES.find(f => f.id === id) || null;

/**
 * LES POSITIONS DE L'ORGANIGRAMME, dans un repère de 100 × 100.
 *
 * Le losange et le rectangle sont côte à côte, et le carré SOUS LES DEUX : la
 * figure doit montrer qu'on y arrive des deux côtés. Une hiérarchie dessinée en
 * simple colonne perdrait exactement ce qu'elle a d'intéressant.
 */
export const POSITIONS = {
    quadrilatere: { x: 50, y: 9 },
    parallelogramme: { x: 50, y: 37 },
    rectangle: { x: 24, y: 66 },
    losange: { x: 76, y: 66 },
    carre: { x: 50, y: 93 }
};

/**
 * TOUT CE QU'UN QUADRILATÈRE EST AUSSI — en remontant les flèches.
 *
 * C'est la question qui départage : « un carré est-il un rectangle ? ». Oui, et
 * un losange, et un parallélogramme, et un quadrilatère.
 */
export function ancetres(id) {
    const out = new Set();
    const marche = (courant) => {
        FLECHES.filter(f => f.vers === courant).forEach(f => {
            if (out.has(f.de)) return;
            out.add(f.de);
            marche(f.de);
        });
    };
    marche(id);
    return [...out];
}

/** Est-ce que TOUT `a` est un `b` ? (« tout carré est un rectangle » : vrai) */
export const estToujours = (a, b) => a === b || ancetres(a).includes(b);

export const MODES = {
    FAMILLES: 'familles',      // placer les NOMS dans les cases
    PROPRIETES: 'proprietes'   // placer les CONDITIONS sur les flèches
};

export const PALIERS = {
    decouverte: { label: 'Placer trois noms', mode: MODES.FAMILLES, trous: 3 },
    noms: { label: 'Placer tous les noms', mode: MODES.FAMILLES, trous: 5 },
    conditions: { label: 'Placer les conditions sur les flèches', mode: MODES.PROPRIETES, trous: 3 },
    tout: { label: 'Toutes les conditions', mode: MODES.PROPRIETES, trous: 5 }
};

/**
 * Un organigramme à compléter.
 *
 * ON NE VIDE JAMAIS LE HAUT EN PREMIER. « Quadrilatère » tout en haut est le
 * seul nom qu'un élève de sixième pose sans réfléchir ; le retirer d'abord
 * rendrait l'exercice trivial pour commencer et dur pour finir, exactement à
 * l'envers. On perce donc EN PARTANT DU BAS — carré, losange, rectangle — là
 * où les distinctions se jouent.
 *
 * @returns {Object} { mode, trous, cartes, solution }
 */
export function genererOrganigramme({ rng, palier = 'noms' } = {}) {
    const P = PALIERS[palier] || PALIERS.noms;
    if (P.mode === MODES.FAMILLES) {
        const ordre = [...FAMILLES].sort((a, b) => b.rang - a.rang);
        const trous = ordre.slice(0, Math.min(P.trous, ordre.length)).map(f => f.id);
        return {
            mode: P.mode, palier,
            trous,
            // Les cartes sont MÉLANGÉES, mais ce sont exactement les cases à
            // remplir : pas de carte en trop. Un intrus transformerait un
            // exercice de classement en exercice d'élimination.
            cartes: rng.shuffle(trous.map(id => ({ id, texte: familleDe(id).nom }))),
            solution: Object.fromEntries(trous.map(id => [id, id]))
        };
    }
    // Les conditions : on perce les flèches du bas vers le haut, pour la même
    // raison — c'est en bas que « angle droit » et « côtés égaux » s'échangent.
    const ordre = [...FLECHES].reverse();
    const trous = ordre.slice(0, Math.min(P.trous, ordre.length))
        .map(f => `${f.de}>${f.vers}`);
    return {
        mode: P.mode, palier,
        trous,
        cartes: rng.shuffle(trous.map(cle => {
            const f = flecheDe(cle);
            return { id: cle, texte: f.ajoute };
        })),
        solution: Object.fromEntries(trous.map(cle => [cle, cle]))
    };
}

export const cleFleche = (f) => `${f.de}>${f.vers}`;
export const flecheDe = (cle) => FLECHES.find(f => cleFleche(f) === cle) || null;

/**
 * Une carte posée sur une case : est-ce juste ?
 *
 * DEUX FLÈCHES PORTENT LE MÊME TEXTE, et ce n'est pas un défaut — c'est le
 * chapitre. « Un angle droit » mène du parallélogramme au rectangle ET du
 * losange au carré. Une carte qui porte ce texte est donc juste aux DEUX
 * endroits : refuser l'une des deux enseignerait le contraire de ce que
 * l'organigramme montre.
 */
export function verifierDepot(org, caseId, carte) {
    if (org.mode === MODES.FAMILLES) {
        return { ok: carte.id === caseId, raison: carte.id === caseId ? '' : mauvaiseFamille(caseId, carte.id) };
    }
    const attendue = flecheDe(caseId);
    const posee = flecheDe(carte.id);
    if (!attendue || !posee) return { ok: false, raison: '' };
    if (posee.ajoute === attendue.ajoute) return { ok: true, texteJuste: memeTexte(attendue) };
    return { ok: false, raison: attendue.piege };
}

/** Quand deux flèches portent la même condition, on le DIT : c'est la leçon. */
function memeTexte(fleche) {
    const jumelles = FLECHES.filter(f => f.ajoute === fleche.ajoute);
    if (jumelles.length < 2) return '';
    const autre = jumelles.find(f => cleFleche(f) !== cleFleche(fleche));
    return `Et la même condition sert aussi de ${familleDe(autre.de).nom.toLowerCase()} `
        + `à ${familleDe(autre.vers).nom.toLowerCase()} : c'est pour cela qu'on arrive au carré `
        + 'par deux chemins.';
}

function mauvaiseFamille(attendu, propose) {
    const a = familleDe(attendu), p = familleDe(propose);
    if (!a || !p) return '';
    if (estToujours(p.id, a.id)) {
        return `Tout ${p.nom.toLowerCase()} est bien un ${a.nom.toLowerCase()} — mais ici on `
            + `veut la case la plus GÉNÉRALE, celle où l'on n'a pas encore ajouté de condition.`;
    }
    if (estToujours(a.id, p.id)) {
        return `Attention au sens : tout ${a.nom.toLowerCase()} est un ${p.nom.toLowerCase()}, `
            + 'et non l\'inverse. Les cases du bas sont les plus particulières.';
    }
    return `${p.nom} et ${a.nom} ne sont pas au même niveau : on descend en ajoutant une `
        + 'condition à la fois.';
}

/** L'organigramme est-il complet et juste ? */
export function verifierOrganigramme(org, poses) {
    for (const caseId of org.trous) {
        const carte = poses[caseId];
        if (!carte) return { fini: false, manque: caseId };
        if (!verifierDepot(org, caseId, carte).ok) return { fini: false, faux: caseId };
    }
    return { fini: true };
}

/** Le conseil écrit : il rappelle la règle, jamais la case. */
export function conseil(org, poses) {
    const reste = org.trous.filter(t => !poses[t]);
    if (!reste.length) return 'Tout est posé — relis chaque flèche : descendre d\'un cran, c\'est ajouter UNE condition.';
    if (org.mode === MODES.FAMILLES) {
        return 'Commence par le bas : la case la plus basse est la plus PARTICULIÈRE, celle '
            + 'qui a le plus de conditions. Chaque fois qu\'on monte, on en enlève une.';
    }
    return 'Chaque flèche ajoute UNE SEULE condition. Demande-toi ce qui manque encore à la '
        + 'figure du dessus pour devenir celle du dessous — et rien de plus.';
}
