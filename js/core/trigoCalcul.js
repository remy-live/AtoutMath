// LA TRIGONOMÉTRIE QUI CALCULE — une longueur, puis un angle.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « tu as d'autres idées ? » — et l'inventaire du programme
// le disait depuis le 16 : « Trigonométrie (3ème) — on nomme, on ne calcule
// pas. “Hypoténuse, Opposé, Adjacent” apprend à repérer les côtés. Il manque
// ensuite tout : choisir entre cosinus, sinus et tangente, calculer une
// longueur, calculer un angle. »
//
// ── CE QUI EXISTAIT DÉJÀ, ET POURQUOI ON NE L'A PAS ÉTENDU ────────────────
//
// `core/trigonometrie.js` sait trois choses, et les enseigne bien : cliquer le
// côté sur la figure, écrire son nom, écrire la formule « cos(G) = … ». Les
// trois sont des lectures. Ici on CALCULE — on tape un nombre, on arrondit, on
// se trompe de touche de calculatrice. Ce n'est pas la même activité, ce n'est
// pas le même clavier, et ce ne sont pas les mêmes fautes.
//
// ON RÉEMPLOIE SON TRIANGLE, en revanche : `tirerTriangle`, `rolesDe`,
// `pointsDe` et les trois `FONCTIONS` viennent de là. Un second triangle écrit
// à côté finirait par ne plus dire la même chose que le premier.
//
// ── LES QUATRE FAUTES QUE CET EXERCICE EXISTE POUR RENDRE VISIBLES ────────
//
//   1. LE MAUVAIS RAPPORT. L'élève écrit cos là où il fallait sin : le calcul
//      est juste, le nombre est faux, et rien ne le signale. C'est la faute
//      reine du chapitre, et elle a son diagnostic.
//   2. MULTIPLIER AU LIEU DE DIVISER. Quand le côté cherché est au
//      DÉNOMINATEUR du rapport, on ne multiplie plus, on divise — et c'est le
//      seul moment du chapitre où le geste change. Une marche entière lui est
//      consacrée, et une autre mélange les deux.
//   3. LA CALCULATRICE EN RADIANS. cos(35) vaut 0,819 en degrés et −0,903 en
//      radians. Le résultat est aberrant, l'élève ne sait pas pourquoi, et
//      aucun professeur ne peut le deviner sans voir l'écran de la machine.
//      Le nombre, lui, est PRÉVISIBLE : on le calcule, et on le nomme.
//   4. RENDRE LE RAPPORT AU LIEU DE L'ANGLE. « cos(x) = 0,57 » donne x = 55°,
//      et l'on écrit 0,57 parce que c'est le dernier nombre affiché.
//
// Aucun DOM ici : ce fichier se lit sous Node, donc il s'éprouve.

import { plan, ferme, texte } from './planPapier.js';
import { afficherEnColonnes } from './maths/fractionColonne.js';
import {
    ROLES, FONCTIONS, tirerTriangle, rolesDe, nomCote, pointsDe,
    sommetDroit, sommetVise, angleVise
} from './trigonometrie.js';

/* ── LES VALEURS TIRÉES ───────────────────────────────────────────────── */

/**
 * LES ANGLES POSSIBLES, ET POURQUOI 45° N'Y EST PAS.
 *
 * À 45°, le triangle est isocèle : l'opposé et l'adjacent sont égaux, donc
 * choisir le mauvais rapport donne LE MÊME NOMBRE. La faute n° 1 du chapitre
 * devient invisible, et la question ne mesure plus rien.
 *
 * LES BORNES ONT ÉTÉ RESSERRÉES DEUX FOIS, EN COMPTANT (voir
 * `ecarterLesEtiquettes` et le compteur qui a servi à régler tout cela) :
 *
 *   · de 20° à 70° : à 20° les cathètes sont dans un rapport de 0,36, le
 *     triangle sort en AIGUILLE, « ? » chevauche « 9 cm » et l'arc mord les
 *     deux côtés ;
 *   · de 25° à 65° : les chevauchements tombent à zéro, mais la mesure de
 *     l'angle reste POSÉE SUR UN TRAIT dans 42 figures sur 1 200 — à 25°, la
 *     bissectrice ne fait que 12,5° avec chaque côté, et pousser l'étiquette
 *     plus loin la jette sur le côté d'en face. Il n'y a pas de place ;
 *   · de 30° à 65° : zéro chevauchement, zéro étiquette sur un trait.
 *
 * ET 45° RESTE DEHORS, pour une raison qui n'a rien à voir avec le dessin : le
 * triangle y est isocèle, l'opposé et l'adjacent sont égaux, donc choisir le
 * MAUVAIS rapport donne le même nombre. La faute n° 1 du chapitre deviendrait
 * invisible, et la question ne mesurerait plus rien.
 */
export const ANGLES = [30, 35, 40, 50, 55, 60, 65];

/** Les longueurs données, en centimètres. Entières : ce n'est pas le sujet. */
const LONGUEURS = [4, 5, 6, 7, 8, 9, 10, 12, 14, 15];

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/** Au dixième, et écrit comme on l'écrit : 6,9 et non 6.9. */
export const auDixieme = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
/** Au degré près. */
export const auDegre = (x) => String(Math.round(x));

/**
 * LES SIX SITUATIONS, ET IL N'Y EN A PAS SEPT.
 *
 * On connaît un angle et UN côté, on en cherche un AUTRE : trois choix pour le
 * connu, deux pour le cherché. Le rapport se lit alors tout seul — c'est celui
 * qui porte les deux côtés en jeu, et aucun autre.
 *
 * `produit` dit où tombe le côté cherché : au NUMÉRATEUR du rapport, et l'on
 * multiplie ; au dénominateur, et l'on divise. C'est la seule chose qui change
 * le geste, donc c'est elle qui sépare les marches.
 */
export const SITUATIONS = [
    { connue: ROLES.HYPOTENUSE, cherche: ROLES.ADJACENT, fonction: 'cos', produit: true },
    { connue: ROLES.HYPOTENUSE, cherche: ROLES.OPPOSE, fonction: 'sin', produit: true },
    { connue: ROLES.ADJACENT, cherche: ROLES.OPPOSE, fonction: 'tan', produit: true },
    { connue: ROLES.ADJACENT, cherche: ROLES.HYPOTENUSE, fonction: 'cos', produit: false },
    { connue: ROLES.OPPOSE, cherche: ROLES.HYPOTENUSE, fonction: 'sin', produit: false },
    { connue: ROLES.OPPOSE, cherche: ROLES.ADJACENT, fonction: 'tan', produit: false }
];

/**
 * UN TRIANGLE DESSINÉ À L'ANGLE QU'ON ANNONCE.
 *
 * `tirerTriangle` choisit une forme dans une liste : elle sert à faire varier
 * l'allure quand on NOMME les côtés, où la mesure ne compte pas. Ici elle
 * compterait : une figure annoncée à 60° et dessinée à 22° apprend à ne pas
 * regarder le dessin — et c'est exactement ce qu'on veut qu'ils fassent.
 *
 * On recalcule donc les deux cathètes depuis l'angle. Le reste du triangle —
 * noms, angle droit, angle visé, orientation — vient de `tirerTriangle`, et
 * l'orientation reste libre : « adjacent » n'est pas « horizontal ».
 */
export function aLAngle(t, degres) {
    const aigus = [0, 1, 2].filter(i => i !== t.angleDroit);
    const r = Math.tan(rad(degres));
    // `pointsDe` place aigus[0] sur l'axe des x à distance `a`, aigus[1] sur
    // l'axe des y à distance `b`. Vu de aigus[0], l'opposé est `b` et
    // l'adjacent `a` : tan = b/a. Vu de aigus[1], c'est l'inverse.
    const forme = t.angleVise === aigus[0] ? { a: 10, b: 10 * r } : { a: 10 * r, b: 10 };
    return { ...t, forme, degres };
}

export const triangleAAngle = (rng, degres) => aLAngle(tirerTriangle(rng), degres);

/**
 * UNE QUESTION DE CALCUL : la figure, ce qu'on donne, ce qu'on cherche.
 *
 * @param {Object} rng
 * @param {Object} opts { genre: 'produit' | 'quotient' | 'melange' | 'angle' |
 *                        'choisir' }
 */
export function tirerCalcul(rng, { genre = 'produit' } = {}) {
    const degres = ANGLES[rng.int(0, ANGLES.length - 1)];
    const t = triangleAAngle(rng, degres);
    const roles = rolesDe(t);

    if (genre === 'angle') return tirerAngle(rng, t, roles);

    const possibles = genre === 'melange' ? SITUATIONS
        : SITUATIONS.filter(s => s.produit === (genre !== 'quotient'));
    const s = possibles[rng.int(0, possibles.length - 1)];
    const donnee = LONGUEURS[rng.int(0, LONGUEURS.length - 1)];
    const valeur = {
        cos: Math.cos(rad(degres)), sin: Math.sin(rad(degres)), tan: Math.tan(rad(degres))
    }[s.fonction];
    const exact = s.produit ? donnee * valeur : donnee / valeur;
    return {
        genre: genre === 'melange' ? (s.produit ? 'produit' : 'quotient') : genre,
        t, roles, degres, situation: s, donnee, exact,
        reponse: auDixieme(exact), unite: 'cm',
        nomConnu: roles[s.connue], nomCherche: roles[s.cherche]
    };
}

/**
 * CALCULER L'ANGLE — deux côtés donnés, et la touche « seconde » de la machine.
 *
 * LES DEUX LONGUEURS SONT ENTIÈRES ET LEUR RAPPORT DONNE UN ANGLE RAISONNABLE :
 * on tire jusqu'à tomber entre 15° et 75°. En dehors, la figure devient une
 * aiguille, et un angle de 4° ne se lit sur aucun dessin.
 */
function tirerAngle(rng, t0, roles0) {
    const cle = ['cos', 'sin', 'tan'][rng.int(0, 2)];
    let petit = 0, grand = 0, degres = 0;
    for (let essai = 0; essai < 60; essai++) {
        const a = LONGUEURS[rng.int(0, LONGUEURS.length - 1)];
        const b = LONGUEURS[rng.int(0, LONGUEURS.length - 1)];
        petit = Math.min(a, b); grand = Math.max(a, b);
        if (petit === grand) continue;
        // POUR LA TANGENTE, LE RAPPORT N'EST PAS BORNÉ : l'opposé peut dépasser
        // l'adjacent. Pour le cosinus et le sinus, le rapport est un quotient
        // par l'HYPOTÉNUSE, donc toujours plus petit que 1 — un triangle où
        // l'hypoténuse n'est pas le plus long côté n'existe pas.
        const q = cle === 'tan' ? (rng.bool() ? grand / petit : petit / grand) : petit / grand;
        degres = cle === 'cos' ? deg(Math.acos(q))
            : cle === 'sin' ? deg(Math.asin(q)) : deg(Math.atan(q));
        // LA MÊME FENÊTRE QUE `ANGLES`, ET POUR LA MÊME RAISON : un angle
        // trouvé à 15° se dessine en aiguille, et sa mesure « ? » n'a plus de
        // place entre les deux côtés — mesuré, 25 figures sur 400.
        if (degres >= 30 && degres <= 65) {
            // LE TRIANGLE SE REDESSINE À L'ANGLE TROUVÉ : le dessin doit dire
            // la même chose que les nombres. On garde le triangle qu'on avait —
            // ses noms, son angle droit, son orientation — et l'on ne change
            // que sa FORME : `aLAngle` ne tire rien au sort.
            const t = aLAngle(t0, degres);
            const roles = rolesDe(t);
            const f = FONCTIONS[cle];
            return {
                genre: 'angle', t, roles, degres,
                cle, fonction: f,
                // Ce qu'on écrit sur la figure : les deux côtés du rapport.
                haut: { role: f.haut, valeur: cle === 'tan' && q > 1 ? grand : petit },
                bas: { role: f.bas, valeur: cle === 'tan' && q > 1 ? petit : grand },
                quotient: q,
                exact: degres, reponse: auDegre(degres), unite: '°',
                nomHaut: roles[f.haut], nomBas: roles[f.bas]
            };
        }
    }
    // SECOURS : un rapport qu'on sait honnête. Ne devrait pas servir, et l'on
    // préfère un angle connu à une boucle qui tourne.
    void roles0;
    const t = aLAngle(t0, 60);
    const roles = rolesDe(t);
    const f = FONCTIONS.cos;
    return {
        genre: 'angle', t, roles, degres: 60, cle: 'cos', fonction: f,
        haut: { role: f.haut, valeur: 5 }, bas: { role: f.bas, valeur: 10 },
        quotient: 0.5, exact: 60, reponse: '60', unite: '°',
        nomHaut: roles[f.haut], nomBas: roles[f.bas]
    };
}

/* ── CE QUI S'ÉCRIT ───────────────────────────────────────────────────── */

const LE = {
    [ROLES.HYPOTENUSE]: 'l’hypoténuse', [ROLES.OPPOSE]: 'le côté opposé',
    [ROLES.ADJACENT]: 'le côté adjacent'
};

export function enonceDe(c) {
    const A = angleVise(c.t);
    if (c.genre === 'angle') {
        return `Dans ce triangle rectangle, calcule la mesure de l’angle ${A}, `
            + 'arrondie au degré.';
    }
    return `Dans ce triangle rectangle, calcule la longueur ${c.nomCherche}, `
        + 'arrondie au dixième de centimètre.';
}

/** L'énoncé de la marche « quel rapport ? » — on ne calcule pas, on choisit. */
export const enonceChoix = (c) => {
    const A = angleVise(c.t);
    return `On connaît l’angle ${A} et ${LE[c.situation.connue]} ${c.nomConnu}. `
        + `Pour trouver ${c.nomCherche}, quel rapport faut-il écrire ?`;
};

/**
 * LA RÉDACTION — « Je sais que… Or… Donc… »
 *
 * ───────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, 19 novembre, en donnant le plan ligne à ligne :
 *
 *     Je sais que : ABC est un triangle rectangle en A
 *     Or : sin(B) = CA/BC
 *     sin(B) = 3/5
 *     Donc B = arcsin(3/5) = …
 *
 * et, pour une longueur : « Et le produit en croix pour calculer une longueur ».
 *
 * CE N'EST PAS DE LA MISE EN FORME. « Je sais que / Or / Donc » est la forme
 * qu'on exige sur une copie, et c'est elle qui rapporte les points au brevet :
 * un élève qui écrit le bon nombre sans la justifier ne démontre rien. La même
 * demande avait déjà produit `core/thalesRedaction.js` ; on en reprend la
 * structure au mot près — des blocs `{ titre, lignes }` — parce que c'est la
 * même rédaction, apprise au même moment de l'année, et que deux écritures
 * différentes pour une seule leçon enseigneraient qu'il y en a deux.
 *
 * ON ÉCRIT « arcsin » ET NON « sin⁻¹ », parce que c'est ce que Rémy a écrit.
 * La machine, elle, porte « sin⁻¹ » au-dessus de la touche : la dernière
 * ligne le dit, sans quoi l'élève cherche une touche qui n'existe pas.
 *
 * @returns {{titre:string, lignes:string[]}[]}
 */
export function redactionDe(c) {
    const A = angleVise(c.t);
    const D = sommetDroit(c.t);
    const saisQue = `${c.t.nom} est un triangle rectangle en ${D}`;

    if (c.genre === 'angle') {
        const f = c.fonction;
        const q = c.quotient.toFixed(3).replace('.', ',');
        return [
            { titre: 'Je sais que', lignes: [saisQue] },
            { titre: 'Or', lignes: [
                `${f.nom}(${A}) = ${c.nomHaut} / ${c.nomBas}`,
                `${f.nom}(${A}) = ${c.haut.valeur} / ${c.bas.valeur}`
            ] },
            { titre: 'Donc', lignes: [
                `${A} = arc${f.nom}(${c.haut.valeur} / ${c.bas.valeur}) ≈ ${c.reponse}°`,
                `Sur la machine : touche « seconde » puis ${f.nom} (${f.nom}⁻¹), `
                    + 'et le mode DEGRÉS.'
            ] }
        ];
    }

    // ── UNE LONGUEUR : LE PRODUIT EN CROIX ───────────────────────────────
    //
    // RÉMY : « Et le produit en croix pour calculer une longueur ».
    //
    // On n'écrit donc pas « x = 8 × cos(35°) » tombé du ciel : on pose
    // l'égalité des deux rapports, on remplace par les valeurs, et la ligne
    // suivante est le produit en croix. C'est LA MÊME MÉTHODE QUE THALÈS, et
    // c'est fait exprès — un élève qui a appris le produit en croix en
    // quatrième doit le retrouver en troisième, pas découvrir une règle de
    // plus qui lui ressemble.
    const f = FONCTIONS[c.situation.fonction];
    const haut = c.roles[f.haut], bas = c.roles[f.bas];
    const n = (x) => String(x).replace('.', ',');
    const cherche = c.nomCherche, connu = c.nomConnu;
    // L'inconnue est-elle AU NUMÉRATEUR du rapport ? C'est ce qui décide du
    // sens du produit en croix, et c'est la seule chose qui change entre les
    // deux cas.
    const enHaut = c.situation.produit;
    const remplace = enHaut
        ? `${f.nom}(${c.degres}°) = ${cherche} / ${n(c.donnee)}`
        : `${f.nom}(${c.degres}°) = ${n(c.donnee)} / ${cherche}`;
    return [
        { titre: 'Je sais que', lignes: [saisQue] },
        { titre: 'Or', lignes: [
            `${f.nom}(${A}) = ${haut} / ${bas}`,
            remplace
        ] },
        { titre: 'Donc, par le produit en croix', lignes: enHaut
            ? [`${cherche} = ${n(c.donnee)} × ${f.nom}(${c.degres}°)`,
                `${cherche} ≈ ${c.reponse} cm`]
            : [`${cherche} × ${f.nom}(${c.degres}°) = ${n(c.donnee)}`,
                `${cherche} = ${n(c.donnee)} ÷ ${f.nom}(${c.degres}°)`,
                `${cherche} ≈ ${c.reponse} cm`] }
    ];
}

/**
 * LA RÉDACTION, MISE À PLAT — c'est ce que porte `explanation`.
 *
 * UNE IDÉE PAR LIGNE, ET C'EST TOUT CE QU'IL FAUT : la carte de correction
 * affiche en `white-space: pre-line` (voir `messageHtml` dans
 * `js/ui/gameFeedbackUI.js`), donc un retour à la ligne suffit — aucune balise
 * à poser ici. Et les fractions écrites « 3 / 5 » s'empilent à l'affichage,
 * par `afficherEnColonnes`. Le texte, lui, reste du texte : c'est lui qui part
 * dans le PDF, dans le carnet d'erreurs et dans la voix.
 */
/**
 * LA RÉDACTION, MISE EN PAGE — « Je sais que / Or / Donc » comme au tableau.
 *
 * RÉMY, 20 novembre : « tu n'as pas mis la partie rédaction pour la
 * trigonométrie ». Elle y était — mais seulement dans `explanation`, c'est-à-
 * dire après DEUX erreurs sur la même question, ou derrière deux appuis de
 * « Montre-moi ». Un élève qui répond juste ne la voyait jamais, et c'est
 * précisément celui à qui il faut montrer comment on rédige : au brevet, la
 * rédaction vaut des points à part.
 *
 * LES TROIS MOTS SONT EN GRAS ET SUR LEUR PROPRE LIGNE, parce que c'est leur
 * place qui s'apprend autant que leur contenu : « Je sais que » dit l'hypothèse,
 * « Or » la propriété, « Donc » la conclusion. Un paragraphe où les trois mots
 * se suivent dans le texte n'enseigne pas cette structure-là.
 *
 * ET LES FRACTIONS S'EMPILENT. Rémy : « je ne veux que des fractions en
 * colonnes » — `afficherEnColonnes` s'en charge, ici comme ailleurs.
 */
export function redactionHtml(c) {
    const bloc = (b) => `<p class="tc-red-pas">`
        + `<span class="tc-red-mot">${b.titre}</span>`
        + b.lignes.map((l, i) => `<span class="tc-red-ligne${i ? ' tc-red-ligne--suite' : ''}">`
            + `${afficherEnColonnes(l)}</span>`).join('')
        + '</p>';
    return `<div class="tc-redaction">${redactionDe(c).map(bloc).join('')}</div>`;
}

export function expliquer(c) {
    return redactionDe(c)
        .map(b => `${b.titre} : ${b.lignes.join('\n')}`)
        .join('\n');
}

export function indicesDe(c) {
    const A = angleVise(c.t);
    if (c.genre === 'angle') {
        return [
            `Tu connais DEUX côtés : ${c.nomHaut} et ${c.nomBas}. Lequel est `
            + `l’hypoténuse ? Lequel touche l’angle ${A} ?`,
            `${LE[c.fonction.haut]} sur ${LE[c.fonction.bas]} : c’est ${c.fonction.libelle} `
            + `(${c.fonction.memo}). Calcule le quotient, puis cherche l’angle avec la `
            + `touche ${c.fonction.nom}⁻¹.`
        ];
    }
    const f = FONCTIONS[c.situation.fonction];
    return [
        `Regarde les DEUX côtés en jeu : celui qu’on te donne (${c.nomConnu}) et celui `
        + `que tu cherches (${c.nomCherche}). C’est le rapport qui porte ces deux-là.`,
        c.situation.produit
            ? `${LE[f.haut]} sur ${LE[f.bas]} : c’est ${f.libelle} (${f.memo}). Le côté `
              + `cherché est en HAUT du rapport, donc on multiplie.`
            : `${LE[f.haut]} sur ${LE[f.bas]} : c’est ${f.libelle} (${f.memo}). Le côté `
              + `cherché est en BAS du rapport, donc on DIVISE.`
    ];
}

/**
 * CE QU'ON RECONNAÎT DANS UN NOMBRE FAUX.
 *
 * Ces valeurs ne s'affichent JAMAIS — voir `diagnostics` dans `core/items.js` :
 * elles servent à répondre quand l'élève a tapé celle-là, et rien d'autre.
 */
export function diagnosticsDe(c) {
    const A = angleVise(c.t);
    const out = [];
    if (c.genre === 'angle') {
        // RENDRE LE RAPPORT AU LIEU DE L'ANGLE : c'est le dernier nombre
        // affiché par la machine avant la touche « seconde ».
        out.push({
            value: c.quotient.toFixed(2).replace('.', ','),
            why: `${c.quotient.toFixed(2).replace('.', ',')} est le RAPPORT `
                + `${c.haut.valeur} ÷ ${c.bas.valeur}, pas l’angle. Il reste à `
                + `demander à la machine quel angle a ce ${c.fonction.libelle}-là : `
                + `touche « seconde » puis ${c.fonction.nom}.`
        });
        // ET L'ANGLE COMPLÉMENTAIRE : avoir pris l'autre angle aigu.
        out.push({
            value: auDegre(90 - c.exact),
            why: `${auDegre(90 - c.exact)}°, c’est l’AUTRE angle aigu du triangle. `
                + `Depuis l’angle ${A}, ${c.nomHaut} est ${LE[c.fonction.haut]} — `
                + 'depuis l’autre, les rôles s’échangent.'
        });
        return out;
    }
    const f = FONCTIONS[c.situation.fonction];
    const valeurs = {
        cos: Math.cos(rad(c.degres)), sin: Math.sin(rad(c.degres)),
        tan: Math.tan(rad(c.degres))
    };
    // 1. LE MAUVAIS RAPPORT, pour chacun des deux autres.
    for (const cle of ['cos', 'sin', 'tan']) {
        if (cle === c.situation.fonction) continue;
        const v = c.situation.produit ? c.donnee * valeurs[cle] : c.donnee / valeurs[cle];
        if (!Number.isFinite(v) || v <= 0) continue;
        out.push({
            value: auDixieme(v),
            why: `Tu as pris ${FONCTIONS[cle].libelle}. Les deux côtés en jeu sont `
                + `${c.nomConnu} et ${c.nomCherche}, c’est-à-dire ${LE[f.haut]} et `
                + `${LE[f.bas]} : le rapport qui les porte est ${f.libelle} (${f.memo}).`
        });
    }
    // 2. MULTIPLIER AU LIEU DE DIVISER, ou l'inverse.
    const envers = c.situation.produit
        ? c.donnee / valeurs[c.situation.fonction]
        : c.donnee * valeurs[c.situation.fonction];
    out.push({
        value: auDixieme(envers),
        why: c.situation.produit
            ? `Tu as DIVISÉ. Ici ${c.nomCherche} est en HAUT du rapport `
              + `${f.nom}(${A}) = ${c.roles[f.haut]} / ${c.roles[f.bas]} : on multiplie.`
            : `Tu as MULTIPLIÉ. Ici ${c.nomCherche} est en BAS du rapport `
              + `${f.nom}(${A}) = ${c.roles[f.haut]} / ${c.roles[f.bas]} : on divise.`
    });
    // 3. LA CALCULATRICE EN RADIANS — et le nombre est prévisible.
    const enRadians = {
        cos: Math.cos(c.degres), sin: Math.sin(c.degres), tan: Math.tan(c.degres)
    }[c.situation.fonction];
    const vRad = c.situation.produit ? c.donnee * enRadians : c.donnee / enRadians;
    if (Number.isFinite(vRad)) {
        out.push({
            value: auDixieme(vRad),
            why: 'Ta calculatrice est en RADIANS. Cherche « DEG » (ou « MODE ») : '
                + `${f.nom}(${c.degres}°) vaut `
                + `${valeurs[c.situation.fonction].toFixed(3).replace('.', ',')}, pas `
                + `${enRadians.toFixed(3).replace('.', ',')}. Le reste de ton calcul est juste.`
        });
    }
    // ON NE GARDE PAS DEUX DIAGNOSTICS SUR LE MÊME NOMBRE : le premier gagne,
    // et un doublon ferait dire deux choses contraires à la même réponse.
    //
    // ET L'ON JETTE LES NOMBRES QU'ON NE PEUT PAS TAPER : une longueur négative
    // — ce que donne le cosinus d'un angle lu en radians, une fois sur deux —
    // n'apparaîtra jamais dans la case. Le pavé d'une longueur n'a pas de
    // signe moins, et un diagnostic qui attend l'impossible encombre la carte
    // de correction sans jamais servir.
    const vus = new Set();
    return out.filter(d => {
        const n = Number(String(d.value).replace(',', '.'));
        if (!Number.isFinite(n) || n <= 0) return false;
        if (vus.has(d.value) || d.value === c.reponse) return false;
        vus.add(d.value);
        return true;
    });
}

/* ── LA FIGURE ────────────────────────────────────────────────────────── */

/**
 * OÙ TOMBE CHAQUE TRAIT — une fois, pour l'écran ET pour le papier.
 *
 * La règle de `core/planPapier.js` : « c'est ici, UNE FOIS, qu'on décide où
 * tombe chaque trait. Les deux traceurs ne font ensuite que recopier ces
 * nombres. »
 */
export function geometrieTriangle(c, taille = 100) {
    const t = c.t;
    const p = pointsDe(t, taille);
    const centre = {
        x: (p[0].x + p[1].x + p[2].x) / 3,
        y: (p[0].y + p[1].y + p[2].y) / 3
    };
    const vers = (a, b) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        const n = Math.hypot(dx, dy) || 1;
        return { x: dx / n, y: dy / n };
    };
    // L'ANGLE DROIT : un petit carré sur le sommet, le long des deux cathètes.
    const d = t.angleDroit;
    const autres = [0, 1, 2].filter(i => i !== d);
    const u = vers(p[d], p[autres[0]]), v = vers(p[d], p[autres[1]]);
    const COTE = taille * 0.1;
    const droit = [
        [p[d].x + u.x * COTE, p[d].y + u.y * COTE],
        [p[d].x + (u.x + v.x) * COTE, p[d].y + (u.y + v.y) * COTE],
        [p[d].x + v.x * COTE, p[d].y + v.y * COTE]
    ];
    // L'ARC DE L'ANGLE VISÉ : une ligne brisée, pour que les deux traceurs la
    // dessinent pareil (jsPDF n'a pas d'arc).
    const s = t.angleVise;
    const voisins = [0, 1, 2].filter(i => i !== s);
    const a1 = Math.atan2(p[voisins[0]].y - p[s].y, p[voisins[0]].x - p[s].x);
    let a2 = Math.atan2(p[voisins[1]].y - p[s].y, p[voisins[1]].x - p[s].x);
    // ON PREND LE PLUS PETIT DES DEUX CHEMINS : l'arc d'un angle aigu ne fait
    // jamais le tour de la figure.
    while (a2 - a1 > Math.PI) a2 -= 2 * Math.PI;
    while (a1 - a2 > Math.PI) a2 += 2 * Math.PI;
    // ── L'ARC NE DÉBORDE PAS DU PLUS COURT DES DEUX CÔTÉS ───────────────
    //
    // VU SUR LA PLANCHE : sur un triangle plat, un arc de rayon fixe
    // traversait le petit côté de part en part et venait couper l'hypoténuse.
    // Un arc d'angle doit tenir DANS l'angle — c'est ce qui le désigne.
    const longueur = (i, j) => Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y);
    const R = Math.min(taille * 0.2,
        0.34 * Math.min(longueur(s, voisins[0]), longueur(s, voisins[1])));
    const arc = [];
    for (let i = 0; i <= 14; i++) {
        const th = a1 + (a2 - a1) * (i / 14);
        arc.push([p[s].x + Math.cos(th) * R, p[s].y + Math.sin(th) * R]);
    }
    const mid = (a1 + a2) / 2;
    return {
        points: p, centre,
        contour: ferme([[p[0].x, p[0].y], [p[1].x, p[1].y], [p[2].x, p[2].y]]),
        droit, arc,
        // L'ÉTIQUETTE DE L'ANGLE SE POSE SUR SA BISSECTRICE, un peu plus loin
        // que l'arc : dessus, elle couvrirait le trait qu'elle annote.
        angleEtiquette: { x: p[s].x + Math.cos(mid) * R * 1.75,
            y: p[s].y + Math.sin(mid) * R * 1.75 },
        // LE SOMMET DE L'ANGLE ET SA BISSECTRICE : c'est la direction dans
        // laquelle sa mesure s'écarte quand elle gêne. Elle sort DANS l'angle,
        // donc l'étiquette continue de le désigner si loin qu'elle aille.
        sommetVise: { p: p[s], n: { x: Math.cos(mid), y: Math.sin(mid) }, d: R * 1.75 },
        /** Le milieu d'un côté, et la normale qui SORT de la figure. */
        cote(i, j) {
            const m = { x: (p[i].x + p[j].x) / 2, y: (p[i].y + p[j].y) / 2 };
            const dir = vers(p[i], p[j]);
            let nx = -dir.y, ny = dir.x;
            if ((centre.x - m.x) * nx + (centre.y - m.y) * ny > 0) { nx = -nx; ny = -ny; }
            return { m, n: { x: nx, y: ny } };
        },
        /** Le sommet, et la direction qui s'éloigne du centre. */
        sommet(i) {
            const dir = vers(centre, p[i]);
            return { p: p[i], n: dir };
        }
    };
}

/** Ce qui s'écrit sur les côtés : la donnée, le « ? », ou rien. */
export function etiquettesDe(c) {
    const t = c.t;
    const out = {};
    const pose = (nom, quoi) => { out[nom] = quoi; };
    if (c.genre === 'angle') {
        pose(c.nomHaut, `${c.haut.valeur} cm`);
        pose(c.nomBas, `${c.bas.valeur} cm`);
    } else {
        pose(c.nomConnu, `${c.donnee} cm`);
        pose(c.nomCherche, '?');
    }
    void t;
    return out;
}

/* ── LES ÉTIQUETTES, ET LA PLACE QU'ELLES SE FONT ─────────────────────── */

/**
 * LA BOÎTE D'UN TEXTE, dans le repère du dessin.
 *
 * ── LE POINT RENDU EST LE CENTRE DU TEXTE, PAS SA LIGNE DE BASE ──────────
 *
 * VU SUR LA FEUILLE IMPRIMÉE, et c'est la deuxième fois que cette distinction
 * se paie : « 5 cm » était posé SUR le côté du triangle, alors que le compteur
 * de collisions annonçait zéro. La boîte était calculée autour de la LIGNE DE
 * BASE — en haut du texte —, pendant que les deux traceurs écrivent le texte
 * CENTRÉ sur le point (ils ajoutent tous deux 0,35 hauteur). On mesurait donc
 * une étiquette quatre unités plus haut que celle qui s'imprime.
 *
 * La boîte est maintenant centrée comme l'écriture : c'est la même convention
 * des deux côtés, et le compteur mesure enfin ce qu'on voit.
 *
 * 0,56 × la hauteur par caractère : la même estimation que `cadreDuPlan` dans
 * `planPapier.js`, mesurée sur Helvetica.
 */
export const boiteTexte = (x, y, t, h) => {
    const w = String(t).length * h * 0.56;
    return { x0: x - w / 2, x1: x + w / 2, y0: y - h * 0.52, y1: y + h * 0.52 };
};

/**
 * LA CORRECTION QUI CENTRE UN TEXTE SUR SON POINT, en hauteurs de texte.
 *
 * ── POURQUOI C'EST UNE CONSTANTE EXPORTÉE ET NON DEUX FOIS « 0,35 » ──────
 *
 * Les deux traceurs placent la LIGNE DE BASE ; nous raisonnons sur le CENTRE.
 * L'écart entre les deux est ce nombre, et il doit être le même des trois
 * côtés — le SVG, le papier, et la boîte qui sert à écarter les étiquettes.
 *
 * ÉCRIT EN TROIS ENDROITS, IL A DÉJÀ DIVERGÉ UNE FOIS : la boîte mesurait
 * autour de la ligne de base pendant que les traceurs écrivaient centré, et
 * « 5 cm » s'imprimait SUR le côté du triangle pendant que le compteur de
 * collisions annonçait zéro. Une épreuve ne pouvait pas l'attraper : elle
 * employait la même boîte que le code, donc les deux se trompaient ensemble.
 * C'est la constante, maintenant, qui tient les trois d'accord.
 */
export const CENTRAGE = 0.35;
const seCroisent = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * UN TRAIT TRAVERSE-T-IL CETTE ÉTIQUETTE ?
 *
 * ON TESTE LA BOÎTE, PAS LE CENTRE — et c'est la deuxième version. La première
 * mesurait la distance du CENTRE de l'étiquette au trait : « 9 cm » passait
 * alors le contrôle avec son centre à huit unités du côté, pendant que son
 * « 9 » était posé dessus. Une étiquette large est large des deux côtés.
 *
 * On échantillonne le segment plutôt que de croiser quatre arêtes : à cette
 * échelle c'est exact, et c'est quatre lignes au lieu de quarante.
 */
export function traitDansLaBoite(boite, [x1, y1], [x2, y2], marge = 0) {
    const n = 24;
    for (let i = 0; i <= n; i++) {
        const x = x1 + (x2 - x1) * (i / n), y = y1 + (y2 - y1) * (i / n);
        if (x >= boite.x0 - marge && x <= boite.x1 + marge
            && y >= boite.y0 - marge && y <= boite.y1 + marge) return true;
    }
    return false;
}

/**
 * LES ÉTIQUETTES S'ÉCARTENT JUSQU'À NE PLUS SE TOUCHER.
 *
 * ── POURQUOI UN CALCUL ET NON DES CONSTANTES BIEN CHOISIES ────────────────
 *
 * MESURÉ sur 1 200 tirages (`tools/tmp/etiquettesTrigo.mjs`) avec des écarts
 * fixes : 31 chevauchements et 42 étiquettes posées SUR un côté du triangle.
 * Presque tous opposaient la mesure de l'angle à la longueur du côté d'à côté
 * — « 10 cm × 30° » —, et c'est géométrique : sur un triangle serré, le milieu
 * d'un côté court et le sommet de l'angle sont à quelques pixels l'un de
 * l'autre. Aucun écart fixe ne les sépare dans TOUTES les orientations.
 *
 * Chaque étiquette garde donc sa direction — la normale qui sort du côté, la
 * bissectrice pour l'angle, la fuite du centre pour une lettre de sommet — et
 * l'on ne règle que la DISTANCE, en la poussant tant que quelque chose se
 * touche. Le déplacement est borné : une étiquette qui s'éloignerait sans fin
 * ne désignerait plus rien.
 */
export function ecarterLesEtiquettes(etiquettes, segments, hauteur, { max = 22 } = {}) {
    const pose = (e) => ({ x: e.ax + e.nx * e.d, y: e.ay + e.ny * e.d });
    for (let tour = 0; tour < 30; tour++) {
        const places = etiquettes.map(pose);
        const boites = etiquettes.map((e, i) =>
            boiteTexte(places[i].x, places[i].y, e.t, hauteur));
        let bouge = false;
        for (let i = 0; i < etiquettes.length; i++) {
            let pousse = false;
            for (let j = 0; j < etiquettes.length; j++) {
                if (i !== j && seCroisent(boites[i], boites[j])) { pousse = true; break; }
            }
            // ET UNE ÉTIQUETTE POSÉE SUR UN TRAIT S'ÉCARTE AUSSI : un « 7 cm »
            // à cheval sur l'hypoténuse ne se lit pas, et l'on ne sait plus
            // quel côté il cote.
            if (!pousse && segments.some(s =>
                // UNE MARGE DE SÉCURITÉ, et elle a sa raison : sur le papier,
                // la largeur du texte est mesurée par jsPDF, ici elle est
                // ESTIMÉE à 0,56 hauteur par caractère. L'estimation peut
                // tomber un peu court sur un « 10 cm », et le « m » vient
                // alors effleurer le trait. Un sixième de hauteur de marge, et
                // l'écart absorbe l'erreur d'estimation.
                traitDansLaBoite(boites[i], s[0], s[1], hauteur * 0.16))) {
                pousse = true;
            }
            // ── LA MESURE DE L'ANGLE A LE DROIT D'ALLER BIEN PLUS LOIN ───
            //
            // Et il le faut, pour une raison qui se calcule : « 35° » fait
            // dix-huit unités de large sur onze de haut, donc sa demi-diagonale
            // vaut dix. Pour qu'elle tienne ENTRE les deux côtés d'un angle de
            // 30°, il faut la poser à 10 ÷ sin(15°) = quarante unités du
            // sommet. À vingt-deux, elle est forcément posée sur un trait —
            // mesuré, 178 figures sur 1 200.
            //
            // ET ELLE RESTE DANS L'ANGLE si loin qu'elle aille : la bissectrice
            // ne sort du triangle qu'au côté opposé, qui est à cent unités.
            // C'est pour cela que seule celle-là a ce droit — une longueur
            // posée le long d'un côté, elle, s'éloignerait de ce qu'elle cote.
            const plafond = etiquettes[i].angle ? max * 2.4 : max;
            if (pousse && etiquettes[i].d < plafond) {
                etiquettes[i].d = Math.min(plafond, etiquettes[i].d + 1.5);
                bouge = true;
            }
        }
        if (!bouge) break;
    }
    return etiquettes.map(e => ({ ...e, ...pose(e) }));
}

/**
 * TOUTES LES ÉTIQUETTES DE LA FIGURE, PLACÉES — et c'est ici, une fois.
 *
 * L'écran et le papier lisent la même liste : une figure annotée deux fois
 * diverge au premier réglage, et le défaut ne se voit que sur l'un des deux.
 */
export function etiquettesPlacees(c, taille = 100, hauteur = 11) {
    const g = geometrieTriangle(c, taille);
    const etiq = etiquettesDe(c);
    const t = c.t;
    const liste = [];
    t.sommets.forEach((lettre, i) => {
        const s = g.sommet(i);
        liste.push({ ax: s.p.x, ay: s.p.y, nx: s.n.x, ny: s.n.y, d: taille * 0.13,
            t: lettre, gras: true });
    });
    [[0, 1], [1, 2], [0, 2]].forEach(([i, j]) => {
        const quoi = etiq[nomCote(t, i, j)];
        if (!quoi) return;
        const k = g.cote(i, j);
        liste.push({ ax: k.m.x, ay: k.m.y, nx: k.n.x, ny: k.n.y, d: taille * 0.11,
            t: quoi });
    });
    const s = g.sommetVise;
    liste.push({ ax: s.p.x, ay: s.p.y, nx: s.n.x, ny: s.n.y, d: s.d,
        t: c.genre === 'angle' ? '?' : `${c.degres}°`, angle: true });
    const cotes = [[0, 1], [1, 2], [0, 2]].map(([i, j]) =>
        [[g.points[i].x, g.points[i].y], [g.points[j].x, g.points[j].y]]);
    return { g, etiquettes: ecarterLesEtiquettes(liste, cotes, hauteur) };
}

const d2 = (n) => Number(n).toFixed(2);
const chemin = (l) => 'M ' + l.map(([x, y]) => `${d2(x)} ${d2(y)}`).join(' L ');
const echapper = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * LE TRIANGLE À L'ÉCRAN.
 *
 * LE CADRE SE CALCULE SUR TOUT CE QU'ON DESSINE, étiquettes comprises — c'est
 * ce qui empêche un « 14 cm » de sortir du `viewBox` quand la figure penche.
 * Une figure coupée est le défaut le plus banal de ce dépôt, et il se ferme
 * ici, une fois.
 */
export function triangleSvg(c, o = {}) {
    const T = 11;                 // la hauteur du texte, dans le repère du dessin
    const { g, etiquettes: textes } = etiquettesPlacees(c, 100, T);
    void o;
    // LE CADRE : tout ce qui est dessiné, plus la place des lettres.
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const voir = (x, y) => {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    };
    [...g.contour, ...g.droit, ...g.arc].forEach(([x, y]) => voir(x, y));
    textes.forEach(t2 => {
        const w = String(t2.t).length * T * 0.56;
        voir(t2.x - w / 2, t2.y - T * 0.8);
        voir(t2.x + w / 2, t2.y + T * 0.3);
    });
    const M = 4;
    const vb = `${d2(x0 - M)} ${d2(y0 - M)} ${d2(x1 - x0 + 2 * M)} ${d2(y1 - y0 + 2 * M)}`;
    const corps = `<path d="${chemin(g.contour)}" class="tc-trait"/>`
        + `<path d="${chemin(g.droit)}" class="tc-droit"/>`
        + `<path d="${chemin(g.arc)}" class="tc-arc"/>`
        + textes.map(t2 => `<text x="${d2(t2.x)}" y="${d2(t2.y + T * CENTRAGE)}"
            text-anchor="middle" class="tc-texte${t2.gras ? ' tc-sommet' : ''}"
            font-size="${T}">${echapper(t2.t)}</text>`).join('');
    return `<svg class="tc-figure" viewBox="${vb}" width="100%"
        role="img" aria-label="${echapper(direLaFigure(c))}">${corps}</svg>`;
}

/** LE MÊME TRIANGLE, pour le papier. */
export function planTriangle(c) {
    const { g, etiquettes } = etiquettesPlacees(c, 100, 11);
    const p = plan();
    p.traits.push(g.contour, g.droit, g.arc);
    etiquettes.forEach(e => p.textes.push(texte(e.x, e.y, e.t, 'milieu', 0, CENTRAGE)));
    // UN TRIANGLE PORTE QUATRE ÉTIQUETTES ET PAS DOUZE : trente-six millimètres
    // suffisent, et c'est le plafond ordinaire des figures cotées.
    p.hauteurMax = 38;
    return p;
}

/** La figure dite à voix haute — pour qui ne la voit pas. */
export function direLaFigure(c) {
    const t = c.t;
    const dit = Object.entries(etiquettesDe(c))
        .map(([nom, quoi]) => `${nom} ${quoi === '?' ? 'inconnu' : quoi}`).join(', ');
    return `Triangle ${t.nom} rectangle en ${sommetDroit(t)}, `
        + (c.genre === 'angle' ? `angle en ${sommetVise(t)} cherché`
            : `angle de ${c.degres} degrés en ${sommetVise(t)}`)
        + `. ${dit}.`;
}
