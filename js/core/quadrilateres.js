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
 * LES TREIZE CONDITIONS, ET LES SEPT CHEMINS QU'ELLES OUVRENT.
 *
 * Rémy, sur sa fiche : cinq cases de figures, treize cartes de conditions, et
 * PLUSIEURS FLÈCHES QUI ARRIVENT SUR LA MÊME CASE.
 *
 * C'est un organigramme plus riche que le premier, et le gain n'est pas
 * décoratif. Le premier ne portait qu'UNE condition par flèche, et il laissait
 * croire qu'il n'y a qu'une façon d'être un parallélogramme. Or il y en a
 * trois, et elles ne se ressemblent pas : des côtés PARALLÈLES, des côtés
 * ÉGAUX, des DIAGONALES qui se coupent en leur milieu. Un élève qui n'a vu que
 * la première ne reconnaît pas un parallélogramme quand on lui donne la
 * troisième — et c'est pourtant celle des exercices.
 *
 * DEUX CHEMINS DIRECTS S'AJOUTENT, ceux qui court-circuitent le
 * parallélogramme : « trois ou quatre angles droits » fait un rectangle d'un
 * quadrilatère quelconque, « quatre côtés égaux » en fait un losange. Ils sont
 * sur la fiche de Rémy, et ils sont utiles : ce sont les définitions qu'on
 * donne en sixième, avant même de parler de parallélogramme.
 *
 * « TROIS OU QUATRE » N'EST PAS UNE APPROXIMATION. Trois angles droits forcent
 * le quatrième — la somme des angles d'un quadrilatère vaut 360°. On écrit donc
 * les deux, parce que c'est ainsi que la propriété se rencontre, et parce que
 * la remarque vaut d'être faite.
 *
 * `ajoute` est ce qu'on écrit SUR la flèche. `piege` est ce qu'on répond à
 * l'élève qui place cette carte au mauvais endroit — c'est la phrase qui
 * enseigne, et c'est pour elle que ce tableau existe plutôt qu'une liste de
 * chaînes.
 *
 * `voie` dit par où passe le trait, quand plusieurs relient les deux mêmes
 * cases : voir `traceFleche` plus bas. La géométrie vit ici, avec le reste,
 * pour que l'écran et le papier dessinent le MÊME organigramme.
 */
export const FLECHES = [
    // --- Du quadrilatère quelconque au parallélogramme : trois chemins --------
    {
        de: 'quadrilatere', vers: 'parallelogramme', voie: -1,
        ajoute: 'les côtés opposés sont parallèles deux à deux',
        piege: 'Le parallélogramme n\'ajoute pas des côtés égaux : il ajoute le '
            + 'PARALLÉLISME des deux paires de côtés opposés. Les longueurs suivent toutes '
            + 'seules.'
    },
    {
        de: 'quadrilatere', vers: 'parallelogramme', voie: 0,
        ajoute: 'les côtés opposés sont égaux deux à deux',
        piege: 'Deux paires de côtés opposés de même longueur suffisent : le parallélisme '
            + 'suit. Attention, il faut bien les côtés OPPOSÉS — deux côtés consécutifs '
            + 'égaux ne donnent rien du tout dans un quadrilatère quelconque.'
    },
    {
        de: 'quadrilatere', vers: 'parallelogramme', voie: 1,
        ajoute: 'les diagonales se coupent en leur milieu',
        piege: 'C\'est la troisième façon d\'être un parallélogramme, et la plus oubliée. '
            + 'Les diagonales se coupent en leur MILIEU — qu\'elles se coupent tout court '
            + 'n\'apprend rien, tout quadrilatère non croisé le fait.'
    },

    // --- Les deux raccourcis, ceux de la sixième ------------------------------
    {
        de: 'quadrilatere', vers: 'rectangle', voie: 0,
        ajoute: 'trois ou quatre angles droits',
        piege: 'Trois suffisent : la somme des angles d\'un quadrilatère vaut 360°, donc le '
            + 'quatrième est droit lui aussi. C\'est la définition du rectangle qu\'on donne '
            + 'en sixième, sans passer par le parallélogramme.'
    },
    {
        de: 'quadrilatere', vers: 'losange', voie: 0,
        ajoute: 'quatre côtés égaux',
        piege: 'QUATRE côtés égaux, pas deux : c\'est la définition du losange, et elle part '
            + 'directement du quadrilatère quelconque. Dans un parallélogramme, deux côtés '
            + 'consécutifs auraient suffi.'
    },

    // --- Du parallélogramme au rectangle : deux chemins -----------------------
    {
        de: 'parallelogramme', vers: 'rectangle', voie: -1,
        ajoute: 'un angle droit',
        piege: 'Un seul angle droit suffit dans un parallélogramme : les trois autres le '
            + 'deviennent forcément.'
    },
    {
        de: 'parallelogramme', vers: 'rectangle', voie: 1,
        ajoute: 'les diagonales ont la même longueur',
        piege: 'Des diagonales de MÊME LONGUEUR font le rectangle ; des diagonales '
            + 'PERPENDICULAIRES font le losange. C\'est la paire qu\'on échange le plus '
            + 'souvent.'
    },

    // --- Du parallélogramme au losange : deux chemins -------------------------
    {
        de: 'parallelogramme', vers: 'losange', voie: -1,
        ajoute: 'deux côtés consécutifs égaux',
        piege: 'Dans un parallélogramme, deux côtés CONSÉCUTIFS de même longueur suffisent : '
            + 'les côtés opposés étaient déjà égaux.'
    },
    {
        de: 'parallelogramme', vers: 'losange', voie: 1,
        ajoute: 'les diagonales sont perpendiculaires',
        piege: 'Des diagonales PERPENDICULAIRES font le losange ; des diagonales de même '
            + 'LONGUEUR font le rectangle. C\'est la paire qu\'on échange le plus souvent.'
    },

    // --- Et le carré, par les deux côtés --------------------------------------
    {
        de: 'rectangle', vers: 'carre', voie: -1,
        ajoute: 'deux côtés consécutifs égaux',
        piege: 'Au rectangle il manque les longueurs ; au losange il manque l\'angle droit. '
            + 'Ce n\'est pas la même carte qui les complète.'
    },
    {
        de: 'rectangle', vers: 'carre', voie: 1,
        ajoute: 'les diagonales sont perpendiculaires',
        piege: 'Au rectangle, les diagonales sont déjà de même longueur : ce qui lui manque, '
            + 'c\'est qu\'elles soient PERPENDICULAIRES.'
    },
    {
        de: 'losange', vers: 'carre', voie: -1,
        ajoute: 'un angle droit',
        piege: 'Au losange il manque l\'angle droit ; au rectangle il manque les longueurs. '
            + 'Ce n\'est pas la même carte qui les complète.'
    },
    {
        de: 'losange', vers: 'carre', voie: 1,
        ajoute: 'les diagonales ont la même longueur',
        piege: 'Au losange, les diagonales sont déjà perpendiculaires : ce qui lui manque, '
            + 'c\'est qu\'elles aient la MÊME LONGUEUR.'
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
// TROIS ÉTIQUETTES DOIVENT TENIR ENTRE LE QUADRILATÈRE ET LE PARALLÉLOGRAMME,
// l'une sous l'autre : c'est ce trajet-là qui fixe la hauteur de tout le reste.
// Mesuré : moins de six unités entre deux étiquettes et elles se chevauchent à
// l'écran. L'organigramme est donc PLUS HAUT QUE LARGE, comme sur la fiche.
export const POSITIONS = {
    quadrilatere: { x: 50, y: 4 },
    parallelogramme: { x: 50, y: 48 },
    rectangle: { x: 19, y: 78 },
    losange: { x: 81, y: 78 },
    carre: { x: 50, y: 97 }
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
    const trous = ordre.slice(0, Math.min(P.trous, ordre.length)).map(cleFleche);
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

/**
 * LA CLEF D'UNE FLÈCHE PORTE SA VOIE, et il le faut : depuis que trois
 * conditions relient le quadrilatère au parallélogramme, « quadrilatere >
 * parallelogramme » désigne trois flèches différentes. Sans la voie, poser une
 * carte sur l'une les remplissait toutes les trois.
 */
export const cleFleche = (f) => `${f.de}>${f.vers}#${f.voie === undefined ? 0 : f.voie}`;
export const flecheDe = (cle) => FLECHES.find(f => cleFleche(f) === cle) || null;

/**
 * OÙ PASSE LE TRAIT D'UN CHEMIN, dans le repère de 100 × 100 des positions.
 *
 * La géométrie vit ICI, et non dans le jeu ni dans la fiche, pour une raison
 * simple : l'écran et le papier doivent dessiner LE MÊME organigramme. Un élève
 * qui a la fiche sous les yeux et l'exercice à l'écran ne doit pas voir deux
 * figures différentes.
 *
 * UN SEUL TRAIT PAR CHEMIN, ET LES CONDITIONS ÉCHELONNÉES DESSUS. Le premier
 * jet donnait un trait à CHACUNE des treize conditions, écartés en éventail.
 * Mesuré à l'écran : six paires d'étiquettes se chevauchaient et huit débordaient
 * sur les cases — trois libellés de quarante caractères ne tiennent pas côte à
 * côte dans un intervalle. Les trois façons d'être un parallélogramme se lisent
 * donc l'une SOUS l'autre, le long de la même flèche : c'est d'ailleurs ainsi
 * qu'on les écrit au tableau.
 *
 * LES DEUX RACCOURCIS CONTOURNENT PAR L'EXTÉRIEUR. « Trois ou quatre angles
 * droits » va du quadrilatère au rectangle en sautant le parallélogramme : un
 * trait droit passerait sur la case du milieu. Il descend donc par le bord, en
 * trois segments, comme sur toutes les fiches.
 *
 * @returns {{points: Array<{x,y}>, contourne: boolean}}
 */
export function traceFleche(f) {
    const a = POSITIONS[f.de], b = POSITIONS[f.vers];
    const RAYON = 8;   // la demi-hauteur d'une case, en unités du plan

    const saute = f.de === 'quadrilatere' && (f.vers === 'rectangle' || f.vers === 'losange');
    if (saute) {
        const gauche = f.vers === 'rectangle';
        const bord = gauche ? 4 : 96;
        return {
            points: [
                { x: a.x + (gauche ? -16 : 16), y: a.y },
                { x: bord, y: a.y },
                { x: bord, y: b.y },
                { x: b.x + (gauche ? -14 : 14), y: b.y }
            ],
            contourne: true
        };
    }

    const dx = b.x - a.x, dy = b.y - a.y;
    const n = Math.hypot(dx, dy) || 1;
    return {
        points: [
            { x: a.x + (dx / n) * RAYON, y: a.y + (dy / n) * RAYON },
            { x: b.x - (dx / n) * RAYON, y: b.y - (dy / n) * RAYON }
        ],
        contourne: false
    };
}

/** Les conditions d'un même chemin, dans l'ordre où elles se lisent. */
export function conditionsDe(de, vers) {
    return FLECHES.filter(f => f.de === de && f.vers === vers);
}

/**
 * OÙ SE POSE L'ÉTIQUETTE D'UNE CONDITION — échelonnée le long de sa flèche.
 *
 * Deux conditions sur le même chemin se lisent l'une après l'autre, réparties
 * sur la longueur du trait plutôt qu'empilées au même endroit. Sur un
 * contournement, elles descendent le long du bord, là où il n'y a rien.
 */
export function posEtiquette(f) {
    const soeurs = conditionsDe(f.de, f.vers);
    const rang = Math.max(0, soeurs.indexOf(f));
    const k = soeurs.length;

    // LES DEUX BRANCHES QUI SE REJOIGNENT SUR LE CARRÉ SE PARTAGENT UN TRIANGLE
    // ÉTROIT, et leurs étiquettes se marchaient dessus des deux façons : dedans
    // elles se rencontraient au milieu, dehors elles retombaient sur la case
    // dont elles partent. Elles descendent donc dans la MOITIÉ BASSE du trait,
    // sous les cases, là où la page est vide des deux côtés.
    const rejoint = f.vers === 'carre';
    const t = rejoint
        ? (k === 1 ? 0.7 : 0.5 + (rang / (k - 1)) * 0.4)
        : (rang + 1) / (k + 1);

    const trace = traceFleche(f);
    if (trace.contourne) {
        const [, haut, bas] = trace.points;
        return { x: haut.x, y: haut.y + (bas.y - haut.y) * t, bord: true };
    }
    const [d, a] = trace.points;
    const x = d.x + (a.x - d.x) * t, y = d.y + (a.y - d.y) * t;

    // UNE ÉTIQUETTE POSÉE SUR UNE FLÈCHE OBLIQUE TOMBE SUR UNE CASE. Mesuré :
    // quatre des treize se retrouvaient par-dessus « Rectangle » ou « Losange »,
    // dont elles cachaient le nom. Les obliques écartent donc leur étiquette du
    // trait — mais PAS TOUJOURS DU MÊME CÔTÉ, et c'est là qu'est la subtilité.
    //
    // Toutes vont vers l'EXTÉRIEUR — les marges de la page —, et celles du bas
    // s'en tirent parce qu'elles sont descendues sous les cases (voir `t`
    // ci-dessus).
    const dx = a.x - d.x, dy = a.y - d.y;
    const n = Math.hypot(dx, dy) || 1;
    if (Math.abs(dx) < 1) return { x, y, bord: false };
    const dehors = x < 50 ? -1 : 1;
    const px = Math.abs(dy / n) * dehors;
    return { x: x + px * 13, y, bord: false };
}

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
