// REPÉRER LES CÔTÉS D'UN TRIANGLE RECTANGLE — la marche AVANT toute formule.
//
// Rémy : « on va commencer un exercice sur la trigonométrie où il faut repérer
// le côté adjacent, l'opposé et l'hypoténuse ».
//
// POURQUOI CETTE MARCHE EXISTE, ET POURQUOI ELLE EST SÉPARÉE DU CALCUL.
//
// La faute ordinaire en trigonométrie n'est pas une erreur de calculatrice :
// c'est d'avoir pris le mauvais côté. L'élève écrit « cos = adjacent /
// hypoténuse », applique la formule sans broncher, et obtient un nombre
// parfaitement faux qu'aucune vérification n'attrape — parce que le calcul,
// lui, est juste. Tant que le repérage n'est pas acquis, apprendre les trois
// rapports ne sert à rien : on empile une règle exacte sur une lecture fausse.
//
// LES TROIS RÈGLES, DANS L'ORDRE OÙ ELLES SE POSENT.
//
//   · L'HYPOTÉNUSE NE DÉPEND PAS DE L'ANGLE CHOISI. Elle est en face de l'angle
//     droit, toujours, et c'est le seul repère fixe de la figure. On la trouve
//     donc EN PREMIER, avant même de regarder quel angle on considère — c'est
//     ce qui donne un point d'appui quand tout le reste bouge.
//   · LE CÔTÉ OPPOSÉ est celui qui NE TOUCHE PAS l'angle considéré. Il est en
//     face, comme son nom le dit.
//   · LE CÔTÉ ADJACENT est celui qui touche l'angle SANS ÊTRE L'HYPOTÉNUSE.
//     Cette dernière précision est toute la difficulté : l'hypoténuse aussi
//     touche l'angle. « Adjacent » veut dire « à côté », et deux côtés sont à
//     côté de l'angle — d'où la faute la plus fréquente du chapitre.
//
// ET C'EST POURQUOI L'ORIENTATION CHANGE À CHAQUE FIGURE. Un triangle toujours
// dessiné l'angle droit en bas à gauche enseigne « adjacent = horizontal », qui
// est faux et qui s'effondre au premier contrôle. On fait donc tourner la
// figure, et l'on change d'angle considéré sur le même triangle : c'est la
// seule façon de vérifier que l'élève lit la figure au lieu de reconnaître une
// image.

import { shortId } from './ids.js';

/** Les trois rôles, dans l'ordre où on les enseigne. */
export const ROLES = {
    HYPOTENUSE: 'hypotenuse',
    OPPOSE: 'oppose',
    ADJACENT: 'adjacent'
};

export const LIBELLES = {
    [ROLES.HYPOTENUSE]: 'l\'hypoténuse',
    [ROLES.OPPOSE]: 'le côté opposé',
    [ROLES.ADJACENT]: 'le côté adjacent'
};

/** Le nom court, celui qu'on écrit sur une étiquette. */
export const COURTS = {
    [ROLES.HYPOTENUSE]: 'hypoténuse',
    [ROLES.OPPOSE]: 'opposé',
    [ROLES.ADJACENT]: 'adjacent'
};

const NOMS = ['ABC', 'DEF', 'MNP', 'RST', 'IJK', 'KLM', 'PQR', 'EFG'];

/**
 * DEUX FORMES DE TRIANGLE, ET C'EST DÉLIBÉRÉ.
 *
 * Un triangle rectangle isocèle a ses deux cathètes égales : rien ne distingue
 * l'adjacent de l'opposé à l'œil, et l'élève ne peut plus s'en tirer en
 * choisissant « le plus court ». Un triangle très aplati, à l'inverse, rend la
 * figure lisible quand on découvre. On tire donc entre plusieurs formes, sans
 * jamais retomber sur la même proportion.
 */
const FORMES = [
    { a: 3, b: 4 }, { a: 4, b: 3 }, { a: 5, b: 12 }, { a: 12, b: 5 },
    { a: 1, b: 1 }, { a: 2, b: 3 }, { a: 3, b: 2 }, { a: 8, b: 15 }
];

/**
 * Un triangle rectangle à lire.
 *
 * @param {Object} rng
 * @param {Object} opts
 * @param {boolean} [opts.tourner]  faire pivoter la figure (défaut : oui)
 * @returns {Object} le triangle, ses sommets, son angle droit et l'angle visé
 */
export function tirerTriangle(rng, opts = {}) {
    const nom = rng.pick(NOMS);
    const sommets = nom.split('');
    const forme = rng.pick(FORMES);
    // L'angle droit est sur un sommet quelconque : le mettre toujours au même
    // reviendrait à dessiner toujours la même figure sous trois noms.
    const angleDroit = rng.int(0, 2);
    // L'ANGLE CONSIDÉRÉ N'EST JAMAIS L'ANGLE DROIT. « Adjacent à l'angle
    // droit » n'a pas de sens : les deux côtés qui le touchent sont les
    // cathètes, et l'hypoténuse est en face. La question ne se pose que pour
    // l'un des deux angles aigus.
    const aigus = [0, 1, 2].filter(i => i !== angleDroit);
    const angleVise = rng.pick(aigus);
    // L'ORIENTATION EST LIBRE — voir l'en-tête : c'est elle qui empêche
    // d'apprendre « adjacent = horizontal ».
    const orientation = opts.tourner === false ? 0 : rng.int(0, 359);
    return {
        id: 't_' + shortId(6),
        nom, sommets, forme, angleDroit, angleVise, orientation
    };
}

/** Le nom d'un côté : ses deux sommets, dans l'ordre du nom du triangle. */
export const nomCote = (t, i, j) =>
    t.sommets[Math.min(i, j)] + t.sommets[Math.max(i, j)];

/** Le sommet qui porte l'angle droit. */
export const sommetDroit = (t) => t.sommets[t.angleDroit];

/** Le sommet de l'angle considéré. */
export const sommetVise = (t) => t.sommets[t.angleVise];

/**
 * QUEL CÔTÉ JOUE QUEL RÔLE — le cœur du module, et il tient en trois lignes.
 *
 * L'hypoténuse relie les deux sommets qui ne portent pas l'angle droit. Le
 * côté opposé relie les deux sommets qui ne portent pas l'angle visé. Et
 * l'adjacent est celui qui reste : il touche l'angle visé ET l'angle droit.
 *
 * @returns {{hypotenuse: string, oppose: string, adjacent: string}}
 */
export function rolesDe(t) {
    const autresQueDroit = [0, 1, 2].filter(i => i !== t.angleDroit);
    const autresQueVise = [0, 1, 2].filter(i => i !== t.angleVise);
    return {
        [ROLES.HYPOTENUSE]: nomCote(t, autresQueDroit[0], autresQueDroit[1]),
        [ROLES.OPPOSE]: nomCote(t, autresQueVise[0], autresQueVise[1]),
        // L'ADJACENT JOINT L'ANGLE VISÉ À L'ANGLE DROIT, et non l'angle visé au
        // sommet restant. Le premier jet écrivait ce dernier : sur un triangle
        // IJK rectangle en J, angle visé en K, il rendait « IK » — c'est-à-dire
        // l'hypoténuse elle-même. La faute était invisible sur la moitié des
        // tirages (quand les deux coïncident par symétrie des indices) et
        // rendait l'exercice insoluble sur l'autre moitié.
        [ROLES.ADJACENT]: nomCote(t, t.angleVise, t.angleDroit)
    };
}

/** Les trois côtés du triangle, dans l'ordre des sommets. */
export function cotesDe(t) {
    return [nomCote(t, 0, 1), nomCote(t, 1, 2), nomCote(t, 0, 2)];
}

/** Le rôle d'un côté donné, ou null s'il n'appartient pas au triangle. */
export function roleDe(t, nom) {
    const r = rolesDe(t);
    return Object.keys(r).find(k => memeCote(r[k], nom)) || null;
}

/** « AB » et « BA » sont le même côté : l'ordre des lettres n'est pas la chose. */
export const memeCote = (a, b) =>
    String(a || '').split('').sort().join('') === String(b || '').split('').sort().join('');

/**
 * LES COORDONNÉES DE LA FIGURE, dans un carré de 100.
 *
 * On place l'angle droit à l'origine, les deux cathètes sur les axes, puis on
 * fait tourner l'ensemble et on le recentre. La figure vit ici, dans le noyau,
 * et non dans le jeu : l'écran et le papier doivent dessiner LE MÊME triangle,
 * et un test doit pouvoir mesurer où sont les côtés sans ouvrir un navigateur.
 */
export function pointsDe(t, taille = 100) {
    const { a, b } = t.forme;
    // Les deux sommets aigus, placés sur les axes depuis l'angle droit.
    const brut = [];
    brut[t.angleDroit] = { x: 0, y: 0 };
    const aigus = [0, 1, 2].filter(i => i !== t.angleDroit);
    brut[aigus[0]] = { x: a, y: 0 };
    brut[aigus[1]] = { x: 0, y: b };

    const rad = (t.orientation * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const tournes = brut.map(p => ({
        x: p.x * cos - p.y * sin,
        y: p.x * sin + p.y * cos
    }));

    // Recentrer et mettre à l'échelle : la figure occupe le carré, quelle que
    // soit sa forme et son orientation.
    const xs = tournes.map(p => p.x), ys = tournes.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min(taille / (x1 - x0 || 1), taille / (y1 - y0 || 1));
    const dx = (taille - (x1 - x0) * k) / 2, dy = (taille - (y1 - y0) * k) / 2;
    return tournes.map(p => ({
        // L'ÉCRAN A SON AXE DES Y VERS LE BAS. Sans ce retournement, la figure
        // se dessine en miroir de ce que le calcul a produit — ce qui ne se
        // voit pas sur un triangle isocèle, et se voit sur tous les autres.
        x: (p.x - x0) * k + dx,
        y: taille - ((p.y - y0) * k + dy)
    }));
}

/**
 * LA QUESTION POSÉE — un rôle à retrouver, et la réponse attendue.
 *
 * On demande l'HYPOTÉNUSE en premier quand on découvre : c'est le seul repère
 * qui ne dépend pas de l'angle, et le trouver donne un point d'appui pour les
 * deux autres.
 */
export function questionsDe(t, { ordre = null } = {}) {
    const r = rolesDe(t);
    const roles = ordre || [ROLES.HYPOTENUSE, ROLES.OPPOSE, ROLES.ADJACENT];
    return roles.map(role => ({ role, attendu: r[role] }));
}

/**
 * LE REFUS QUI ENSEIGNE — chaque erreur a son diagnostic, et ils ne se
 * ressemblent pas.
 *
 * C'est la raison d'être de ce module plutôt qu'un simple « faux » : un élève
 * qui prend l'hypoténuse pour l'adjacent n'a pas fait la même erreur que celui
 * qui confond adjacent et opposé. Le premier n'a pas retenu la clause « sans
 * être l'hypoténuse » ; le second n'a pas regardé quel angle on considère.
 */
export function verifier(t, roleDemande, coteDonne) {
    const r = rolesDe(t);
    const attendu = r[roleDemande];
    if (memeCote(attendu, coteDonne)) return { ok: true };

    const A = sommetVise(t), D = sommetDroit(t);
    const donne = roleDe(t, coteDonne);
    if (!donne) {
        return { ok: false, raison: `« ${coteDonne} » n'est pas un côté de ce triangle.` };
    }

    if (roleDemande === ROLES.HYPOTENUSE) {
        return {
            ok: false,
            faute: 'hypotenuse',
            raison: `L'hypoténuse est EN FACE DE L'ANGLE DROIT, et lui seul — elle ne `
                + `dépend pas de l'angle qu'on considère. L'angle droit est en ${D} : `
                + `l'hypoténuse ne le touche donc pas, alors que « ${coteDonne} » y passe. `
                + `C'est ${attendu}.`
        };
    }
    if (roleDemande === ROLES.ADJACENT && donne === ROLES.HYPOTENUSE) {
        // LA FAUTE DU CHAPITRE, et elle est logique : l'hypoténuse touche bien
        // l'angle. Ce qui manque, c'est la clause qui l'exclut.
        return {
            ok: false,
            faute: 'adjacent-hypotenuse',
            raison: `Presque : « ${coteDonne} » touche bien l'angle en ${A}. Mais c'est `
                + `l'HYPOTÉNUSE, et l'adjacent est l'autre côté qui touche l'angle — `
                + `« adjacent » veut dire « à côté », et il y en a deux à côté. Celui `
                + `qu'on appelle adjacent est celui qui n'est pas l'hypoténuse : ${attendu}.`
        };
    }
    if (roleDemande === ROLES.OPPOSE && donne === ROLES.HYPOTENUSE) {
        return {
            ok: false,
            faute: 'oppose-hypotenuse',
            raison: `« ${coteDonne} » touche l'angle en ${A} : il ne peut donc pas lui être `
                + `opposé. Le côté opposé est celui qui NE TOUCHE PAS l'angle — ${attendu}.`
        };
    }
    // Il reste l'échange adjacent / opposé.
    return {
        ok: false,
        faute: 'echange',
        raison: roleDemande === ROLES.OPPOSE
            ? `« ${coteDonne} » touche l'angle en ${A} : c'est l'adjacent. L'opposé est en `
                + `face, il ne touche pas l'angle — ${attendu}.`
            : `« ${coteDonne} » ne touche pas l'angle en ${A} : c'est l'opposé. L'adjacent `
                + `touche l'angle, sans être l'hypoténuse — ${attendu}.`
    };
}

/** L'aide qu'on donne, sans jamais nommer le côté. */
export function conseil(t, role) {
    const A = sommetVise(t), D = sommetDroit(t);
    if (role === ROLES.HYPOTENUSE) {
        return `Cherche l'angle droit — il est en ${D}. L'hypoténuse est le côté d'en face, `
            + 'celui qui ne le touche pas. Elle ne change jamais, quel que soit l\'angle '
            + 'qu\'on considère : c\'est ton point de repère.';
    }
    if (role === ROLES.OPPOSE) {
        return `Pose ton doigt sur l'angle en ${A}. Deux côtés en partent : ce ne sont pas `
            + 'eux. Le côté opposé est le troisième, celui qui reste de l\'autre côté.';
    }
    return `Deux côtés touchent l'angle en ${A}, et c'est là qu'on se trompe. L'un des deux `
        + 'est l\'hypoténuse — trouve-la d\'abord, elle est en face de l\'angle droit. '
        + 'L\'adjacent est l\'autre.';
}

/** Ce qu'on retient à la fin, en une phrase. */
export function laLecon(t) {
    const A = sommetVise(t), D = sommetDroit(t);
    const r = rolesDe(t);
    return `Angle droit en ${D}, donc l'hypoténuse est ${r[ROLES.HYPOTENUSE]} — toujours en `
        + `face de l'angle droit. Pour l'angle en ${A} : ${r[ROLES.OPPOSE]} est en face `
        + `(opposé), ${r[ROLES.ADJACENT]} le touche sans être l'hypoténuse (adjacent).`;
}

/* ═══════════════════ ÉCRIRE LE CÔTÉ, ET NON LE MONTRER ═══════════════════ */
//
// Rémy : « tu peux aussi poser une question quel est le côté opposé à G, et on
// passe à la question suivante. Et il peut aussi l'écrire avec les crochets. »
//
// POURQUOI ÉCRIRE N'EST PAS MONTRER. Cliquer le bon segment prouve qu'on a LU
// la figure ; l'écrire prouve en plus qu'on sait le NOMMER — c'est-à-dire
// désigner un segment par ses deux extrémités, avec la notation du cours. Or
// c'est cette écriture-là qui servira ensuite : une formule s'écrit
// « cos(G) = [GF] / [GH] », pas en pointant du doigt. Un élève qui montre
// juste et qui écrit « G » ou « GFH » n'a pas encore le geste.
//
// LES CROCHETS SONT ACCEPTÉS, PAS EXIGÉS. C'est la notation juste — [FH] est le
// SEGMENT, (FH) la droite, FH la longueur — et l'on veut la voir arriver. Mais
// refuser « FH » sur un exercice qui porte sur le repérage des côtés, ce serait
// sanctionner une notation dans l'exercice où l'on apprend autre chose. On
// accepte donc les deux, et l'on FÉLICITE les crochets : c'est ainsi qu'une
// habitude se prend, pas en la punissant.

/**
 * Ce que l'élève a écrit, ramené à deux lettres majuscules.
 *
 * On accepte les crochets, les parenthèses, les espaces, les minuscules — tout
 * ce qu'une main d'élève produit — et l'on rend « » si ce n'est pas la
 * désignation d'un segment.
 */
export function lireCote(texte) {
    const brut = String(texte == null ? '' : texte)
        .toUpperCase()
        .replace(/[[\]()\s.,;·-]/g, '');
    return /^[A-Z]{2}$/.test(brut) ? brut : '';
}

/** L'élève a-t-il mis les crochets du segment ? */
export const avecCrochets = (texte) => /\[\s*[A-Za-z]\s*[A-Za-z]\s*\]/.test(String(texte || ''));

/**
 * LA QUESTION, ÉCRITE COMME LE PROFESSEUR LA POSE.
 *
 * « Quel est le côté opposé à l'angle en G ? » — et non « clique le côté
 * opposé ». Le verbe change le geste attendu, il doit changer dans l'énoncé.
 */
export function questionEcrite(t, role) {
    if (role === ROLES.HYPOTENUSE) return 'Quelle est l\'hypoténuse de ce triangle ?';
    const A = sommetVise(t);
    return `Quel est le côté ${role === ROLES.OPPOSE ? 'opposé' : 'adjacent'} `
        + `à l'angle en ${A} ?`;
}

/**
 * LE REFUS, QUAND ON A ÉCRIT PLUTÔT QUE MONTRÉ.
 *
 * Trois familles d'erreur, et elles ne se corrigent pas de la même façon :
 * l'écriture qui n'en est pas une (« G », « GFH »), le côté qui n'existe pas
 * dans ce triangle, et le mauvais côté — c'est là qu'on retombe sur `verifier`,
 * qui sait déjà nommer la confusion.
 */
export function verifierEcrit(t, role, saisie) {
    const nom = lireCote(saisie);
    if (!nom) {
        return {
            ok: false, faute: 'ecriture',
            raison: 'Un côté se désigne par SES DEUX EXTRÉMITÉS : deux lettres, '
                + 'comme [AB]. Une seule lettre nomme un point, trois nomment le triangle.'
        };
    }
    if (nom[0] === nom[1]) {
        return {
            ok: false, faute: 'ecriture',
            raison: `« ${nom} » n'est pas un côté : ses deux extrémités sont le même point.`
        };
    }
    const v = verifier(t, role, nom);
    if (!v.ok) return v;
    // JUSTE — et l'on dit si la notation y était, sans l'avoir exigée.
    return { ok: true, crochets: avecCrochets(saisie), nom };
}

/* ═══════════════════════ ÉCRIRE LA FORMULE ═══════════════════════════════ */
//
// Rémy : « on pourrait y inclure l'écriture des formules, en aidant au départ. »
//
// CE N'EST PAS LA MARCHE SUIVANTE, C'EST LA MÊME. Un élève qui sait dire quel
// côté est l'adjacent et qui écrit quand même « cos = opposé / hypoténuse » n'a
// pas un problème de repérage : il a un problème de FORMULE. Et l'inverse est
// vrai. Les deux fautes coûtent le même zéro et se corrigent autrement, donc
// elles se travaillent l'une après l'autre — sur la MÊME figure, pour que le
// lien se voie.
//
// L'AIDE DU DÉPART EST LE RAPPORT EN TOUTES LETTRES. Au premier palier, on
// donne « cosinus = adjacent / hypoténuse » et l'élève n'a plus qu'à remplir
// les deux côtés : il travaille le repérage DANS une formule, ce qui n'est pas
// le même exercice que le repérage tout court. Au palier suivant le rappel
// disparaît, et il faut savoir lequel des trois rapports on écrit.

export const FONCTIONS = {
    cos: {
        cle: 'cos', nom: 'cos', libelle: 'cosinus',
        haut: ROLES.ADJACENT, bas: ROLES.HYPOTENUSE, memo: 'CAH'
    },
    sin: {
        cle: 'sin', nom: 'sin', libelle: 'sinus',
        haut: ROLES.OPPOSE, bas: ROLES.HYPOTENUSE, memo: 'SOH'
    },
    tan: {
        cle: 'tan', nom: 'tan', libelle: 'tangente',
        haut: ROLES.OPPOSE, bas: ROLES.ADJACENT, memo: 'TOA'
    }
};

export const ORDRE_FONCTIONS = ['cos', 'sin', 'tan'];

/**
 * LE MOYEN MNÉMOTECHNIQUE, ET CE QU'IL VAUT.
 *
 * « CAH SOH TOA » se retient en une minute et se récite toute une vie ; il ne
 * dit rien de ce que les rapports SIGNIFIENT, et c'est très bien — on ne lui
 * demande que de tenir la place le jour du contrôle. La phrase qui l'accompagne,
 * elle, porte le seul repère utile : l'hypoténuse est en bas de cos et de sin,
 * et elle disparaît de la tangente.
 */
export const MEMO = 'CAH · SOH · TOA — Cosinus : Adjacent sur Hypoténuse. '
    + 'Sinus : Opposé sur Hypoténuse. Tangente : Opposé sur Adjacent. '
    + 'L\'hypoténuse est au dénominateur des deux premiers, et absente du troisième : '
    + 'la tangente ne parle que des deux côtés de l\'angle droit.';

/** La formule attendue pour cette figure et cette fonction. */
export function formuleDe(t, cle) {
    const f = FONCTIONS[cle];
    if (!f) return null;
    const r = rolesDe(t);
    return {
        fonction: f,
        angle: sommetVise(t),
        // Ce qui s'écrit à gauche du signe égal : « cos(G) ».
        gauche: `${f.nom}(${sommetVise(t)})`,
        haut: f.haut, bas: f.bas,
        attenduHaut: r[f.haut], attenduBas: r[f.bas],
        // Le rappel du palier d'aide : le rapport en toutes lettres.
        rappel: `${f.libelle} = ${COURTS[f.haut]} / ${COURTS[f.bas]}`,
        // La formule complète, telle qu'on l'écrit au tableau.
        texte: `${f.nom}(${sommetVise(t)}) = [${r[f.haut]}] / [${r[f.bas]}]`
    };
}

/**
 * LES DEUX MOITIÉS SE CORRIGENT SÉPARÉMENT — et c'est tout l'intérêt.
 *
 * « cos(G) = [GH] / [GF] » n'est pas « à moitié juste » : c'est la formule
 * RENVERSÉE, une faute précise qui a son nom. La distinguer de « j'ai pris le
 * mauvais côté en haut » est la seule façon de dire à l'élève ce qu'il doit
 * revoir — le rapport, ou la figure.
 */
export function verifierFormule(t, cle, hautSaisi, basSaisi) {
    const f = formuleDe(t, cle);
    if (!f) return { ok: false, raison: 'Fonction inconnue.' };
    const h = lireCote(hautSaisi), b = lireCote(basSaisi);
    if (!h || !b) {
        return {
            ok: false, faute: 'ecriture',
            raison: 'Chaque case attend un CÔTÉ : deux lettres, comme [AB].'
        };
    }
    const hOk = memeCote(h, f.attenduHaut);
    const bOk = memeCote(b, f.attenduBas);
    if (hOk && bOk) {
        return { ok: true, crochets: avecCrochets(hautSaisi) && avecCrochets(basSaisi) };
    }
    // LA FRACTION RENVERSÉE — la faute la plus fréquente, et la plus vexante :
    // les deux côtés sont les bons, ils sont juste à l'envers.
    if (memeCote(h, f.attenduBas) && memeCote(b, f.attenduHaut)) {
        return {
            ok: false, faute: 'renversee',
            raison: 'Les deux côtés sont les bons, mais dans l\'autre sens : '
                + `${f.fonction.libelle} = ${COURTS[f.haut]} / ${COURTS[f.bas]}, `
                + `donc [${f.attenduHaut}] AU-DESSUS et [${f.attenduBas}] en dessous. `
                + 'Un rapport renversé donne son inverse, pas le même nombre.'
        };
    }
    // Sinon, c'est un côté mal repéré : on rend le diagnostic du repérage, qui
    // sait nommer la confusion (hypoténuse prise pour l'adjacent, etc.).
    const quel = !hOk ? f.haut : f.bas;
    const donne = !hOk ? h : b;
    const v = verifier(t, quel, donne);
    return {
        ok: false, faute: v.faute || 'cote',
        ou: !hOk ? 'haut' : 'bas',
        raison: `Au ${!hOk ? 'NUMÉRATEUR' : 'DÉNOMINATEUR'}, on attend `
            + `${LIBELLES[quel]}. ${v.raison || ''}`.trim()
    };
}

/** L'aide de la formule : le rapport, jamais le côté. */
export function conseilFormule(t, cle) {
    const f = formuleDe(t, cle);
    if (!f) return '';
    return `${f.fonction.memo} : ${f.fonction.libelle} = ${COURTS[f.haut]} / ${COURTS[f.bas]}. `
        + `Reste à lire la figure : quel côté est ${LIBELLES[f.haut]} de l'angle en ${f.angle}, `
        + `et quel côté est ${LIBELLES[f.bas]} ?`;
}

/** Ce qu'on retient une fois la formule écrite. */
export function laLeconFormule(t, cle) {
    const f = formuleDe(t, cle);
    if (!f) return '';
    return `${f.texte} — ${f.fonction.libelle} = ${COURTS[f.haut]} sur ${COURTS[f.bas]}, `
        + `lus par rapport à l'angle en ${f.angle}.`;
}
