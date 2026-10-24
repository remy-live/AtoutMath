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
//
// DEUX MODES DE PLUS, DEMANDÉS PAR RÉMY : « pour les sommes et produits il
// faut aussi faire faire des calculs pas que le signe, et aussi des jeux en
// rapport avec cela ». Le moteur savait déjà trier des calculs ; il ne savait
// tirer que des SOMMES.
//
//   PRODUITS  les bulles portent un produit ; on coupe celles dont le
//             résultat est négatif. La règle n'est plus la même.
//   MÊLÉS     sommes ET produits dans la même vague, moitié-moitié — c'est
//             l'erreur reine de la 4ᵉ mise en jeu : appliquer la règle du
//             produit à une somme.

// LES DEUX EXERCICES ÉCRIVENT LE MÊME CALCUL DE LA MÊME FAÇON. « Somme ou
// Produit ? » porte déjà ces deux écritures simplifiées ; les recopier ici
// donnerait deux notations pour un seul chapitre, et l'élève croirait en voir
// deux.
import { sommeSimple, produitSimple } from './generators/relatifsMelange.js';

export const MODES = {
    zeros: {
        id: 'zeros',
        titre: 'Ninja des zéros inutiles',
        consigne: 'Tranche UNIQUEMENT les zéros inutiles.',
        rappel: 'Un zéro est inutile s\'il est devant le nombre, ou tout à la fin après la virgule. Les autres tiennent la place d\'un rang : ils restent.',
        // « decimal », PAS « decimaux » : une lettre, et tout ce que l'élève
        // réussissait ici partait dans le vide — ni maîtrise, ni carnet
        // d'erreurs, ni bilan, puisque la compétence n'existait pas. Un test
        // vérifie désormais qu'aucun identifiant cité dans le code ne manque à
        // `data/skills.js`.
        skill: 'num.decimal.zeros',
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
    },
    produits: {
        id: 'produits',
        titre: 'Ninja des produits négatifs',
        consigne: 'Coupe les bulles dont le PRODUIT est négatif. Laisse passer les autres.',
        rappel: 'Un produit est négatif quand ses deux facteurs sont de signes CONTRAIRES. Le plus éloigné de zéro ne décide de rien ici.',
        skill: 'num.relatifs.produit',
        geste: 'trancher',
        operation: '×'
    },
    meles: {
        id: 'meles',
        titre: 'Ninja des deux règles',
        consigne: 'Coupe les résultats NÉGATIFS — mais regarde l\'opération : somme et produit n\'ont pas la même règle.',
        rappel: 'Dans une SOMME, le signe vient du nombre le plus éloigné de zéro. Dans un PRODUIT, il vient des signes des deux facteurs.',
        skill: 'num.relatifs.produit',
        geste: 'trancher',
        operation: 'melange'
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

/**
 * UN CALCUL SIMPLIFIÉ (3 − 7, ou −3 × (−7)) ET SON RÉSULTAT.
 *
 * RÉMY : « pour les sommes et produits il faut aussi faire faire des calculs
 * pas que le signe, et aussi des jeux en rapport avec cela ».
 *
 * LE PRODUIT N'EST PAS LA SOMME, ET C'EST TOUT LE SUJET. Dans une somme,
 * c'est le nombre le plus ÉLOIGNÉ DE ZÉRO qui donne le signe ; dans un
 * produit, ce sont les deux SIGNES qui décident. L'erreur reine de la 4ᵉ est
 * d'appliquer la seconde règle à la première — « moins et moins font plus »,
 * donc −3 − 5 = 8.
 *
 * LES DEUX ÉCRITURES VIENNENT DU MÊME ENDROIT QUE « SOMME OU PRODUIT ? » :
 * deux exercices qui écrivent le même calcul de deux façons apprennent deux
 * notations, et l'élève croit voir deux chapitres.
 *
 * @param {'positif'|'negatif'} signeVoulu  le signe que doit avoir le résultat
 * @param {'+'|'×'} op                      l'opération
 */
export function tirerCalcul(rng, signeVoulu, op = '+') {
    const produit = op === '×';
    // DES FACTEURS DE TABLE, et non jusqu'à douze : le jeu se joue à la
    // volée, et (−11) × 12 n'est plus un réflexe de signe, c'est un calcul
    // posé — ce que le chronomètre du jeu ne laisse pas faire.
    //
    // ET LE FACTEUR 1 EST ÉCARTÉ. Photographié : deux bulles sur cinq
    // portaient « 9 × (−1) » et « 2 × (−1) ». Le signe y est juste, mais le
    // produit n'en est pas un — multiplier par un ne fait rien, et l'élève
    // lit l'opposé là où on lui demande une règle de signes. Le cas de ±1 a
    // sa marche à lui dans « Multiplier des Relatifs » ; ici il dilue le jeu.
    const bas = produit ? 2 : 1;
    const borne = produit ? 9 : 12;
    for (let essai = 0; essai < 60; essai++) {
        const a = rng.int(bas, borne) * (rng.bool() ? 1 : -1);
        const b = rng.int(bas, borne) * (rng.bool() ? 1 : -1);
        const total = produit ? a * b : a + b;
        if (total === 0) continue;
        if (signeVoulu === 'positif' && total < 0) continue;
        if (signeVoulu === 'negatif' && total > 0) continue;
        return { texte: produit ? produitSimple(a, b) : sommeSimple(a, b), valeur: total, op };
    }
    return produit
        ? { texte: '−3 × 7', valeur: -21, op: '×' }
        : { texte: '3 − 7', valeur: -4, op: '+' };
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
    // MOITIÉ-MOITIÉ, et non un tirage à pile ou face par objet.
    //
    // Au hasard, une vague de six pouvait ne contenir qu'UNE seule cible : si
    // elle passait pendant qu'on calculait les cinq autres, on perdait un cœur
    // sans avoir rien fait de faux, et le jeu paraissait injuste. Une vague
    // équilibrée donne toujours de quoi trancher, et le tri reste entier — il
    // faut encore décider, pour chaque objet, de quel côté il tombe.
    const cibles = Math.max(1, Math.round(n / 2));
    const plan = [
        ...Array.from({ length: cibles }, () => veut),
        ...Array.from({ length: n - cibles }, () => contraire)
    ];

    // LES OPÉRATIONS AUSSI SE PLANIFIENT, ET POUR LA MÊME RAISON QUE LES
    // CIBLES. En mode « mêlés », une opération tirée à pile ou face par objet
    // donne une vague de cinq sommes une fois sur trente-deux — et la vague
    // qui ne mêle rien est exactement celle où l'élève applique une règle sans
    // la choisir, c'est-à-dire le défaut que ce mode existe pour corriger.
    const op = MODES[etat.mode].operation || '+';
    const sommes = Math.max(1, Math.round(n / 2));
    const ops = op === 'melange'
        ? rng.shuffle([
            ...Array.from({ length: sommes }, () => '+'),
            ...Array.from({ length: n - sommes }, () => '×')
        ])
        : Array.from({ length: n }, () => op);

    rng.shuffle(plan).forEach((quoi, i) => {
        const c = tirerCalcul(rng, quoi, ops[i]);
        objets.push({
            id: `o${++compteur}`, texte: c.texte, valeur: c.valeur, op: c.op,
            cible: quoi === veut, coupe: false
        });
    });
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
    const dit = `${o.texte} = ${o.valeur < 0 ? '−' + Math.abs(o.valeur) : o.valeur}, `
        + `ce n'est pas ${attendu}.`;
    // ET L'ON NOMME LA CONFUSION QUAND C'EST UN PRODUIT : dire « ce n'est pas
    // négatif » laisse l'élève avec la règle qu'il vient d'appliquer. Celle
    // du produit ne regarde pas le nombre le plus éloigné de zéro.
    return o.op === '×'
        ? `${dit} Dans un produit, ce sont les SIGNES des deux facteurs qui décident.`
        : dit;
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
