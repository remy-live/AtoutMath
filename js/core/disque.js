// LE PÉRIMÈTRE ET L'AIRE DU DISQUE — la valeur exacte, puis la valeur arrondie.
//
// Rémy : « un exercice sur le périmètre et l'aire du disque : au départ on
// donne la valeur exacte, faire des QCM après. Et après on a le droit à la
// calculatrice pour pouvoir calculer la valeur approchée. »
//
// C'EST L'ORDRE DU CHAPITRE, ET IL N'EST PAS ARBITRAIRE. Tant qu'on écrit 10π,
// on travaille la FORMULE : le π reste un symbole qu'on manipule, et l'on voit
// tout de suite si l'élève a pris le rayon pour le diamètre ou l'aire pour le
// périmètre. Dès qu'on écrit 31,4, ces deux erreurs se noient dans la frappe et
// l'arrondi. On sépare donc : d'abord la formule et sa valeur exacte, en
// propositions ; ensuite seulement la calculatrice et la valeur approchée.
//
// UNE VALEUR EXACTE NE SE TAPE PAS AU PAVÉ NUMÉRIQUE. « 10π » n'est pas un
// nombre qu'on saisit avec des chiffres : ces étapes-là restent donc en
// propositions quoi qu'on règle, et c'est le générateur qui le décide, pas le
// professeur — ce n'est pas un choix pédagogique, c'est une impossibilité.
//
// π ≈ 3,14 ET LA TOUCHE π DOIVENT DONNER LE MÊME ARRONDI. C'est la promesse la
// plus délicate de tout le module, et elle est tenue par le TIRAGE : on ne
// propose que les rayons pour lesquels les deux calculs tombent sur le même
// dixième. Voir `arrondiStable`.
//
// Module pur : la figure sort en SVG, aucun DOM n'est touché.

/** L'échelle, dans l'ordre dicté. */
export const MARCHES_DISQUE = [
    { id: 'formule', nom: '1. Quelle formule ?' },
    { id: 'perimetre-exact', nom: '2. Le périmètre exact' },
    { id: 'aire-exacte', nom: '3. L’aire exacte' },
    { id: 'diametre', nom: '4. Quand on donne le diamètre' },
    { id: 'perimetre-arrondi', nom: '5. Le périmètre arrondi' },
    { id: 'aire-arrondie', nom: '6. L’aire arrondie' }
];

/** Ce que valent les étapes qui demandent une valeur exacte, avec π. */
export const ETAPES_EXACTES = ['formule', 'perimetre-exact', 'aire-exacte', 'diametre'];

/** La valeur du collège, celle qu'on écrit au tableau avant la touche π. */
export const PI_COLLEGE = 3.14;

export const ecrireNombre = (x) => String(Math.round(Number(x) * 100) / 100).replace('.', ',');

/** « 10π cm », « 25π cm² » — l'écriture exacte, celle du cahier. */
export const ecrireExact = (k, unite) => `${k === 1 ? '' : ecrireNombre(k)}π ${unite}`;

/**
 * L'ARRONDI EST-IL LE MÊME AVEC 3,14 ET AVEC π ?
 *
 * Un élève de sixième calcule avec 3,14 ; un élève de cinquième appuie sur la
 * touche π. Sur un rayon de 11, l'aire vaut 379,94 avec 3,14 et 380,13 avec π :
 * arrondis au dixième, ce sont deux réponses différentes — et l'exercice
 * compterait faux l'un des deux, sans qu'on sache lequel a raison.
 *
 * On ne tranche pas, on ÉCARTE le cas. Comme la fonction est croissante entre
 * 3,14 et π, il suffit que les deux bornes donnent le même arrondi pour que
 * toutes les valeurs intermédiaires — 3,1416, 3,14159… — le donnent aussi.
 * C'est une garantie, pas une chance.
 */
export function arrondiStable(coefficient, decimales = 1) {
    const p = 10 ** decimales;
    return Math.round(coefficient * PI_COLLEGE * p) === Math.round(coefficient * Math.PI * p);
}

/** L'arrondi qu'on attend, calculé avec le vrai π. */
export const arrondir = (x, decimales = 1) => {
    const p = 10 ** decimales;
    return Math.round(x * p) / p;
};

// LE RAYON 2 EST ÉCARTÉ : le périmètre y vaut 4π et l'aire aussi. Deux réponses
// numériquement identiques sur un exercice qui apprend justement à ne pas
// confondre les deux — et le leurre « c'est l'aire, pas le périmètre » devenait
// impossible à proposer.
// ET LE RAYON 3 NON PLUS, DEPUIS LA FICHE PAPIER : sur une feuille, tous les
// disques partagent une seule échelle, et un rayon de 3 posé à côté d'un rayon
// de 12 devenait un cercle de sept millimètres dont la cote débordait. Entre 4
// et 12, le rapport reste de un à trois.
const RAYON_MIN = 4, RAYON_MAX = 12;

/**
 * COMBIEN DE DÉCIMALES ON DEMANDE — et ce n'est pas la même chose des deux côtés.
 *
 * Mesuré sur les rayons de 3 à 12 : au dixième, l'arrondi du PÉRIMÈTRE est le
 * même avec 3,14 et avec π pour neuf rayons sur dix ; celui de l'AIRE, pour
 * trois seulement. À l'unité, l'aire passe à dix sur dix. On demande donc
 * l'aire à l'unité — ce qui est de toute façon l'usage : « 380 cm² » se lit,
 * « 380,1 cm² » affiche une précision que la mesure n'a pas.
 */
export const decimalesDe = (surLAire) => (surLAire ? 0 : 1);

/**
 * TIRER UN DISQUE.
 *
 * @returns {{marche, r, d, unite, exact, arrondi, coefficient}}
 *   `coefficient` est ce qui multiplie π : 2r pour un périmètre, r² pour une
 *   aire. C'est lui qui porte toute l'arithmétique de l'exercice.
 */
export function tirerDisque(rng, marche = 'perimetre-exact', { unite = 'cm' } = {}) {
    // L'ÉTAPE « QUELLE FORMULE ? » DEMANDE L'UNE OU L'AUTRE, au hasard. Ne poser
    // que le périmètre en ferait une question à retenir une fois ; c'est de
    // savoir LAQUELLE des deux qu'il s'agit, et cela ne se travaille qu'en
    // alternant.
    const surLAire = marche === 'formule'
        ? rng.bool()
        : (marche === 'aire-exacte' || marche === 'aire-arrondie' || marche === 'diametre');
    const coefDe = (r) => (surLAire ? r * r : 2 * r);

    // Le diamètre est toujours pair, par construction : d = 2 × r avec r entier.
    // Un rayon décimal ajouterait une difficulté de calcul à une question qui
    // porte sur la formule.
    let rayons = [];
    for (let r = RAYON_MIN; r <= RAYON_MAX; r++) rayons.push(r);
    // Les étapes arrondies ne gardent que les rayons dont l'arrondi est le même
    // avec 3,14 et avec π.
    const dec = decimalesDe(surLAire);
    if (!ETAPES_EXACTES.includes(marche)) rayons = rayons.filter(r => arrondiStable(coefDe(r), dec));

    const r = rayons[rng.int(0, rayons.length - 1)];
    const coefficient = coefDe(r);
    return {
        marche, r, d: 2 * r, unite,
        coefficient, decimales: dec,
        exact: ecrireExact(coefficient, surLAire ? `${unite}²` : unite),
        arrondi: arrondir(coefficient * Math.PI, dec),
        surLAire
    };
}

// --- Ce qu'on demande ---------------------------------------------------------

export function enonceDe(t) {
    switch (t.marche) {
    case 'formule':
        return t.surLAire
            ? 'Quelle formule donne l’aire d’un disque de rayon r ?'
            : 'Quelle formule donne le périmètre d’un disque de rayon r ?';
    case 'perimetre-exact':
        return `Ce disque a un rayon de ${ecrireNombre(t.r)} ${t.unite}. `
            + `Quel est son périmètre exact ?`;
    case 'aire-exacte':
        return `Ce disque a un rayon de ${ecrireNombre(t.r)} ${t.unite}. `
            + `Quelle est son aire exacte ?`;
    case 'diametre':
        return `Ce disque a un diamètre de ${ecrireNombre(t.d)} ${t.unite}. `
            + `Quelle est son aire exacte ?`;
    case 'perimetre-arrondi':
        return `Ce disque a un rayon de ${ecrireNombre(t.r)} ${t.unite}. `
            + `Quel est son périmètre, arrondi au dixième ?`;
    case 'aire-arrondie':
        return `Ce disque a un rayon de ${ecrireNombre(t.r)} ${t.unite}. `
            + `Quelle est son aire, arrondie à l’unité ?`;
    default:
        return '';
    }
}

/** La formule juste, telle qu'on l'écrit au tableau. */
export const FORMULE_PERIMETRE = '2 × π × r';
export const FORMULE_AIRE = 'π × r × r';

export function reponseDe(t) {
    if (t.marche === 'formule') return t.surLAire ? FORMULE_AIRE : FORMULE_PERIMETRE;
    if (ETAPES_EXACTES.includes(t.marche)) return t.exact;
    return t.arrondi;
}

/** L'unité de la réponse tapée — vide sur une valeur exacte, qui la porte déjà. */
export const uniteDe = (t) => (ETAPES_EXACTES.includes(t.marche) ? ''
    : (t.surLAire ? `${t.unite}²` : t.unite));

/**
 * L'EXPLICATION — le calcul posé, puis la phrase qui dit pourquoi.
 */
export function expliquer(t) {
    const u = t.unite;
    switch (t.marche) {
    case 'formule':
        return t.surLAire
            ? 'L’aire d’un disque vaut π × r × r, c’est-à-dire π × r². Le périmètre, lui, '
                + 'vaut 2 × π × r : une aire ne s’écrit jamais sans un carré.'
            : 'Le périmètre d’un disque vaut 2 × π × r. Avec le diamètre, cela s’écrit π × d, '
                + 'puisque d = 2 × r.';
    case 'perimetre-exact':
        return `Périmètre = 2 × π × r = 2 × π × ${ecrireNombre(t.r)} = ${t.exact}. `
            + `On garde le π : c’est la valeur exacte.`;
    case 'aire-exacte':
        return `Aire = π × r × r = π × ${ecrireNombre(t.r)} × ${ecrireNombre(t.r)} = ${t.exact}. `
            + `Le rayon se multiplie par lui-même, pas par 2.`;
    case 'diametre':
        return `Le rayon vaut la moitié du diamètre : ${ecrireNombre(t.d)} ÷ 2 = ${ecrireNombre(t.r)} ${u}. `
            + `Puis Aire = π × ${ecrireNombre(t.r)} × ${ecrireNombre(t.r)} = ${t.exact}.`;
    case 'perimetre-arrondi':
        return `2 × π × ${ecrireNombre(t.r)} = ${t.exact.replace(` ${u}`, '')} ≈ ${ecrireNombre(t.arrondi)} ${u}. `
            + `La valeur exacte garde le π ; la valeur approchée s’arrondit.`;
    default:
        return `π × ${ecrireNombre(t.r)} × ${ecrireNombre(t.r)} = ${t.exact.replace(` ${u}²`, '')} `
            + `≈ ${ecrireNombre(t.arrondi)} ${u}². `
            + `Une aire se mesure en ${u}², jamais en ${u}.`;
    }
}

/** Trois indices, du sens vers le calcul, sans jamais poser le résultat. */
export function indicesDe(t) {
    if (t.marche === 'formule') {
        return [
            'Un périmètre est une longueur ; une aire est une surface.',
            'Une surface se mesure en cm² : sa formule porte donc un carré.',
            'Périmètre : 2 × π × r. Aire : π × r × r.'
        ];
    }
    const surLAire = t.surLAire;
    return [
        surLAire ? 'L’aire d’un disque vaut π × r × r.' : 'Le périmètre d’un disque vaut 2 × π × r.',
        t.marche === 'diametre'
            ? `Le rayon est la moitié du diamètre : ${ecrireNombre(t.d)} ÷ 2.`
            : `Ici le rayon vaut ${ecrireNombre(t.r)} ${t.unite}.`,
        ETAPES_EXACTES.includes(t.marche)
            ? 'La valeur exacte garde le π : on écrit le nombre devant, puis π.'
            : `Prends la calculatrice, et arrondis ${t.decimales ? 'au dixième' : 'à l’unité'} `
                + 'à la fin — jamais avant.'
    ];
}

/**
 * LES FAUSSES RÉPONSES — les quatre confusions du chapitre, et rien d'autre.
 *
 * Périmètre pris pour aire, rayon pris pour diamètre, carré oublié, 2 oublié :
 * ce sont elles qui coûtent les points, et chacune dit ce qu'elle est.
 */
export function leurresDe(t) {
    const u = t.unite;
    const aire = `${u}²`;
    const brut = (() => {
        switch (t.marche) {
        case 'formule':
            return t.surLAire
                ? [
                    { value: FORMULE_PERIMETRE, why: 'C’est le périmètre : une aire porte un carré.' },
                    { value: 'π × r', why: 'Il manque un rayon : l’aire multiplie le rayon par lui-même.' },
                    { value: '2 × π × r × r', why: 'L’aire ne se double pas : c’est π × r², sans le 2.' }
                ]
                : [
                    { value: FORMULE_AIRE, why: 'C’est l’aire : le périmètre est une longueur, sans carré.' },
                    { value: 'π × r', why: 'Il manque le 2 : le périmètre vaut 2 × π × r.' },
                    { value: '2 × π × r × r', why: 'Le carré est de trop pour un périmètre.' }
                ];
        case 'perimetre-exact':
            return [
                { value: ecrireExact(t.r * t.r, u), why: 'C’est l’aire (π × r²), pas le tour du disque.' },
                { value: ecrireExact(t.r, u), why: 'Tu as oublié le 2 : le périmètre vaut 2 × π × r.' },
                // PAS « 4r » : sur un rayon de 4, 4r et r² valent tous deux 16, et
                // le QCM proposait deux fois la même chose. « 2r² » ne peut se
                // confondre avec aucune des autres pour un rayon d'au moins 3.
                { value: ecrireExact(2 * t.r * t.r, u),
                    why: 'Tu as gardé le 2 du périmètre ET le carré de l’aire : c’est l’un ou l’autre.' }
            ];
        case 'aire-exacte':
            return [
                { value: ecrireExact(2 * t.r, aire), why: 'C’est le périmètre (2 × π × r), pas l’aire.' },
                { value: ecrireExact(t.r, aire), why: 'Il manque un rayon : l’aire vaut π × r × r.' },
                { value: ecrireExact(2 * t.r * t.r, aire), why: 'π × r² ne se double pas.' }
            ];
        case 'diametre':
            return [
                { value: ecrireExact(t.d * t.d, aire), why: 'Tu as pris le diamètre pour le rayon : le rayon en est la moitié.' },
                // π × d et 2 × π × r sont LE MÊME NOMBRE : proposer les deux
                // ferait un QCM avec deux fois la même valeur, dont l'une
                // comptée fausse. On garde l'une, et l'autre erreur est celle
                // du rayon oublié.
                { value: ecrireExact(t.d, aire), why: 'C’est le périmètre (π × d), pas l’aire.' },
                { value: ecrireExact(t.r, aire), why: 'Il manque un rayon : l’aire vaut π × r × r.' }
            ];
        default: {
            const autre = t.surLAire ? 2 * t.r : t.r * t.r;
            return [
                { value: arrondir(autre * Math.PI, t.decimales), why: t.surLAire
                    ? 'C’est le périmètre arrondi, pas l’aire.' : 'C’est l’aire arrondie, pas le périmètre.' },
                { value: arrondir(t.coefficient, t.decimales), why: 'Tu as oublié de multiplier par π.' },
                // LA TROISIÈME ERREUR N'EST PAS LA MÊME DES DEUX CÔTÉS. Sur
                // l'aire, « la moitié » et « le périmètre » tombent sur le même
                // nombre au rayon 4 : le QCM proposait deux fois 25. On prend
                // donc, pour l'aire, l'erreur du diamètre pris pour le rayon.
                t.surLAire
                    ? { value: arrondir(t.d * t.d * Math.PI, t.decimales),
                        why: 'Tu as pris le diamètre pour le rayon : le rayon en est la moitié.' }
                    : { value: arrondir(t.coefficient * Math.PI / 2, t.decimales),
                        why: 'Tu as oublié le 2 : le périmètre vaut 2 × π × r.' }
            ];
        }
        }
    })();

    const juste = reponseDe(t);
    const vus = new Set([String(juste)]);
    return brut.filter(l => {
        const cle = String(l.value);
        if (cle === '' || vus.has(cle)) return false;
        if (typeof l.value === 'number' && (!Number.isFinite(l.value) || l.value <= 0)) return false;
        vus.add(cle);
        return true;
    });
}

// --- La figure ------------------------------------------------------------------

const VUE = 200;

/**
 * LE DISQUE, AVEC LE SEGMENT QU'ON DONNE — et lui seul.
 *
 * Quand l'énoncé donne le rayon, on trace le rayon ; quand il donne le
 * diamètre, on trace le diamètre. Dessiner les deux à la fois répondrait à la
 * question de l'étape 4, où toute la difficulté est justement de passer de l'un
 * à l'autre.
 */
export function figureDisqueSvg(t) {
    const c = VUE / 2;
    const R = 68;
    const T = (v) => v.toFixed(1);
    const parDiametre = t.marche === 'diametre';
    // L'ÉTAPE « QUELLE FORMULE ? » NE PARLE D'AUCUN DISQUE PARTICULIER : sa
    // figure porte donc « r », pas « 10 cm ». Une mesure écrite là laisserait
    // croire qu'il faut calculer quelque chose, alors qu'on demande une lettre.
    const texte = t.marche === 'formule' ? 'r'
        : (parDiametre ? `${ecrireNombre(t.d)} ${t.unite}` : `${ecrireNombre(t.r)} ${t.unite}`);

    // Le segment part du centre (rayon) ou traverse (diamètre), incliné pour ne
    // pas se confondre avec un axe de symétrie du dessin.
    const th = -30 * Math.PI / 180;
    const P = { x: c + R * Math.cos(th), y: c + R * Math.sin(th) };
    const Q = parDiametre ? { x: c - R * Math.cos(th), y: c - R * Math.sin(th) } : { x: c, y: c };
    const mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2;

    return `<svg viewBox="0 0 ${VUE} ${VUE}" class="dsq-fig fig-svg" role="img"
        aria-label="Disque de ${parDiametre ? 'diamètre' : 'rayon'} ${texte}">
        <style>
            .dsq-bord { stroke: #2b6cb0; stroke-width: 2.6; fill: #ebf4ff; }
            .dsq-trait { stroke: #c05621; stroke-width: 2.4; }
            .dsq-centre { fill: #2b6cb0; }
            .dsq-cote { font-size: 15px; font-weight: 800; fill: #9c4221; }
            .dsq-nom { font-size: 13px; font-weight: 800; fill: #2b6cb0; }
        </style>
        <circle cx="${c}" cy="${c}" r="${R}" class="dsq-bord"/>
        <line x1="${T(P.x)}" y1="${T(P.y)}" x2="${T(Q.x)}" y2="${T(Q.y)}" class="dsq-trait"/>
        <circle cx="${c}" cy="${c}" r="3.2" class="dsq-centre"/>
        <text x="${c - 9}" y="${c + 14}" text-anchor="middle" class="dsq-nom">O</text>
        <text x="${T(mx)}" y="${T(my - 12)}" text-anchor="middle" class="dsq-cote">${texte}</text>
    </svg>`;
}
