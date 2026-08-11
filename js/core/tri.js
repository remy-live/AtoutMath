// TRIER À LA VOLÉE — le moteur commun des petits jeux de tri.
//
// Trois jeux demandés séparément font en réalité le même geste : des objets
// traversent l'écran, certains sont à prendre, les autres à laisser. Ce qui
// change est le CRITÈRE, et c'est justement lui qu'on travaille :
//
//   ZÉROS     un nombre est projeté chiffre par chiffre ; on tranche les zéros
//             INUTILES, et seulement eux. Le 0 de 1,05 ne se coupe pas.
//   NÉGATIFS  des bulles portent un calcul simplifié (3 − 7) ; on coupe celles
//             dont le résultat est négatif.
//   POSITIFS  des cibles portent un calcul ; on tire sur les positives.
//
// Écrire trois moteurs aurait produit trois jeux qui divergent à la première
// correction. Écrire trois habillages d'un même moteur garantit qu'une règle
// corrigée l'est partout — et que le compte des vies, la fin de vague et le
// diagnostic d'erreur se comportent pareil dans les trois.
//
// Une règle commune, et elle n'est pas anodine : LAISSER PASSER un objet à
// prendre coûte une vie, comme se tromper de cible. Sans cela, la stratégie
// gagnante serait de ne rien toucher.

export const MODES = {
    zeros: {
        id: 'zeros',
        titre: 'Ninja des zéros inutiles',
        consigne: 'Tranche UNIQUEMENT les zéros inutiles.',
        rappel: 'Un zéro est inutile s\'il est devant le nombre, ou tout à la fin après la virgule. Les autres tiennent la place d\'un rang : ils restent.',
        skill: 'num.decimaux.zeros',
        geste: 'trancher'
    },
    negatifs: {
        id: 'negatifs',
        titre: 'Ninja des résultats négatifs',
        consigne: 'Coupe les bulles dont le résultat est NÉGATIF. Laisse passer les autres.',
        rappel: 'Le résultat est négatif quand le nombre le plus éloigné de zéro est négatif.',
        skill: 'num.relatifs.somme',
        geste: 'trancher'
    },
    positifs: {
        id: 'positifs',
        titre: 'Tir sur les résultats positifs',
        consigne: 'Tire sur les cibles dont le résultat est POSITIF. Épargne les autres.',
        rappel: 'Le résultat est positif quand le nombre le plus éloigné de zéro est positif.',
        skill: 'num.relatifs.somme',
        geste: 'tirer'
    }
};

// --- Les zéros inutiles -------------------------------------------------------

/**
 * Décompose une écriture décimale et dit, pour chaque caractère, s'il est un
 * zéro INUTILE.
 *
 * Deux cas, et deux seulement :
 *   · les zéros de tête de la partie entière — 011 s'écrit 11 ;
 *   · les zéros de queue de la partie décimale — 1,820 s'écrit 1,82.
 *
 * Tous les autres tiennent la place d'un rang et ne se suppriment pas : le 0
 * de 1,05 n'est pas décoratif, il dit qu'il n'y a pas de dixième. C'est
 * exactement la confusion que le jeu vise, d'où l'intérêt d'en mettre.
 *
 * Le dernier chiffre de la partie entière ne se coupe jamais : 0,5 garde son
 * zéro, sans quoi il ne resterait plus de partie entière du tout.
 */
export function analyserZeros(texte) {
    const s = String(texte);
    const virgule = s.indexOf(',');
    const entiere = virgule < 0 ? s : s.slice(0, virgule);
    const decimale = virgule < 0 ? '' : s.slice(virgule + 1);

    // Zéros de tête : tous ceux qui précèdent le premier chiffre non nul.
    let tete = 0;
    while (tete < entiere.length - 1 && entiere[tete] === '0') tete++;

    // Zéros de queue : tous ceux qui suivent le dernier chiffre non nul.
    let queue = decimale.length;
    while (queue > 0 && decimale[queue - 1] === '0') queue--;

    return [...s].map((c, i) => {
        if (c === ',') return { c, i, inutile: false, role: 'virgule' };
        if (i < entiere.length) {
            return { c, i, inutile: c === '0' && i < tete, role: 'entiere' };
        }
        const rang = i - entiere.length - 1;
        return { c, i, inutile: c === '0' && rang >= queue, role: 'decimale' };
    });
}

/** Le nombre débarrassé de ses zéros inutiles. */
export function sansZerosInutiles(texte) {
    const nettoye = analyserZeros(texte).filter(o => !o.inutile).map(o => o.c).join('');
    // « 1, » n'existe pas : quand toute la partie décimale a disparu, la
    // virgule s'en va avec elle.
    return nettoye.endsWith(',') ? nettoye.slice(0, -1) : nettoye;
}

/** Un nombre à trancher : des zéros inutiles, et au moins un zéro utile. */
export function tirerNombre(rng) {
    const chiffres = () => rng.int(1, 9);
    const entiere = `${chiffres()}${rng.bool() ? chiffres() : ''}`;
    // Les zéros de tête, ceux que l'on doit couper.
    const tete = '0'.repeat(rng.int(1, 2));
    // La partie décimale contient souvent un zéro UTILE au milieu : c'est le
    // piège du jeu, et sans lui on trancherait tous les zéros à l'aveugle.
    const milieu = rng.bool() ? `${chiffres()}0${chiffres()}` : `${chiffres()}${chiffres()}`;
    const queue = '0'.repeat(rng.int(1, 2));
    return `${tete}${entiere},${milieu}${queue}`;
}

// --- Les calculs de relatifs ---------------------------------------------------

/** Un calcul simplifié (3 − 7) et son résultat. */
export function tirerCalcul(rng, signeVoulu) {
    for (let essai = 0; essai < 60; essai++) {
        const a = rng.int(1, 12) * (rng.bool() ? 1 : -1);
        const b = rng.int(1, 12) * (rng.bool() ? 1 : -1);
        const total = a + b;
        if (total === 0) continue;
        if (signeVoulu === 'positif' && total < 0) continue;
        if (signeVoulu === 'negatif' && total > 0) continue;
        const gauche = a < 0 ? `−${Math.abs(a)}` : String(a);
        return { texte: `${gauche} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`, valeur: total };
    }
    return { texte: '3 − 7', valeur: -4 };
}

// --- Le jeu ---------------------------------------------------------------------

export function creerPartie({ mode = 'negatifs', vies = 3, parVague = 5 } = {}) {
    return {
        mode, viesMax: vies, vies,
        parVague: Math.max(2, Math.min(8, parVague)),
        score: 0, vagues: 0, touches: 0, rates: 0, laisses: 0,
        vague: null, fini: false
    };
}

let compteur = 0;

/**
 * La vague suivante. Elle contient TOUJOURS au moins un objet à prendre et un
 * objet à laisser : une vague homogène ne fait rien trier du tout, et c'est
 * pourtant ce que produit un tirage naïf une fois sur seize.
 */
export function genererVague(etat, rng) {
    const n = etat.parVague;
    let objets;

    if (etat.mode === 'zeros') {
        const nombre = tirerNombre(rng);
        objets = analyserZeros(nombre).map(o => ({
            id: `o${++compteur}`, texte: o.c, cible: o.inutile,
            role: o.role, rang: o.i, coupe: false
        }));
        etat.vague = { objets, nombre, attendu: sansZerosInutiles(nombre), consigne: `Tranche les zéros inutiles de ${nombre}` };
        return etat.vague;
    }

    const veut = etat.mode === 'positifs' ? 'positif' : 'negatif';
    const contraire = veut === 'positif' ? 'negatif' : 'positif';
    objets = [];
    // Au moins un de chaque, le reste au hasard : c'est ce qui garantit qu'il
    // y a réellement à trier.
    const plan = [veut, contraire, ...Array.from({ length: n - 2 }, () => (rng.bool() ? veut : contraire))];
    for (const quoi of rng.shuffle(plan)) {
        const c = tirerCalcul(rng, quoi);
        objets.push({
            id: `o${++compteur}`, texte: c.texte, valeur: c.valeur,
            cible: quoi === veut, coupe: false
        });
    }
    etat.vague = { objets, consigne: MODES[etat.mode].consigne };
    return etat.vague;
}

/**
 * Le joueur touche un objet.
 * @returns {{ok:boolean, raison:string, message:string, fini:boolean}}
 */
export function toucher(etat, id) {
    if (etat.fini || !etat.vague) return { ok: false, raison: 'inactif', message: '' };
    const o = etat.vague.objets.find(x => x.id === id);
    if (!o || o.coupe) return { ok: false, raison: 'inconnu', message: '' };
    o.coupe = true;

    if (o.cible) {
        etat.score += 10;
        etat.touches++;
        return { ok: true, raison: 'juste', objet: o, message: '', fini: vagueFinie(etat) };
    }
    etat.rates++;
    etat.vies--;
    if (etat.vies <= 0) etat.fini = true;
    return {
        ok: false, raison: 'faux', objet: o,
        message: messageErreur(etat, o),
        fini: vagueFinie(etat)
    };
}

/** Ce qu'il fallait voir. Un « raté » sans explication n'apprend rien. */
export function messageErreur(etat, o) {
    if (etat.mode === 'zeros') {
        if (o.c === '0' || o.texte === '0') {
            return o.role === 'decimale'
                ? 'Ce zéro-là est UTILE : il tient un rang après la virgule. Sans lui, les chiffres suivants changeraient de place.'
                : 'Ce zéro-là est UTILE : c\'est le chiffre des unités, on ne peut pas l\'enlever.';
        }
        return `Tu as tranché un ${o.texte}, pas un zéro.`;
    }
    const attendu = etat.mode === 'positifs' ? 'positif' : 'négatif';
    return `${o.texte} = ${o.valeur < 0 ? '−' + Math.abs(o.valeur) : o.valeur}, ce n'est pas ${attendu}.`;
}

/** Un objet à prendre est sorti de l'écran sans avoir été touché. */
export function laisserPasser(etat, id) {
    if (etat.fini || !etat.vague) return { perdu: false };
    const o = etat.vague.objets.find(x => x.id === id);
    if (!o || o.coupe || !o.cible) return { perdu: false };
    o.coupe = true;
    etat.laisses++;
    etat.vies--;
    if (etat.vies <= 0) etat.fini = true;
    return {
        perdu: true, objet: o,
        message: etat.mode === 'zeros'
            ? 'Un zéro inutile est passé : relis le nombre de gauche à droite avant de trancher.'
            : `${o.texte} = ${o.valeur < 0 ? '−' + Math.abs(o.valeur) : o.valeur} : celui-là était à prendre.`
    };
}

/**
 * UN GROUPE QUI S'ÉCHAPPE COÛTE UNE VIE, PAS UNE PAR OBJET.
 *
 * En mode « zéros inutiles », le nombre entier voyage d'un seul tenant : ses
 * chiffres sont des objets distincts, mais ils tombent ensemble. Compter une
 * vie par zéro manqué faisait perdre trois cœurs d'un coup à qui en avait
 * tranché deux sur trois — c'est-à-dire à quelqu'un qui avait presque tout
 * juste. On sanctionne le nombre raté, pas chacun de ses chiffres.
 */
export function laisserPasserGroupe(etat, ids) {
    const viesAvant = etat.vies;
    const etaitFini = etat.fini;
    let premier = null;
    for (const id of ids) {
        const p = laisserPasser(etat, id);
        if (p.perdu && !premier) premier = p;
    }
    // Le compte est REFAIT à partir de l'avant : une seule vie, quel que soit
    // le nombre d'objets manqués dans le groupe.
    etat.vies = Math.max(0, viesAvant - (premier ? 1 : 0));
    etat.fini = etaitFini || etat.vies <= 0;
    return premier || { perdu: false };
}

export function vagueFinie(etat) {
    return !!etat.vague && etat.vague.objets.every(o => !o.cible || o.coupe);
}

export function resteAPrendre(etat) {
    return etat.vague ? etat.vague.objets.filter(o => o.cible && !o.coupe).length : 0;
}
