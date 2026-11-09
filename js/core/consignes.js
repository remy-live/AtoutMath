// LA CONSIGNE QUI CHANGE — le cœur commun des trois jeux vifs.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Je préfère un jeu assez rapide fun », puis, devant les trois
// propositions : « Les 3 sont top tu peux y aller ».
//
//   · LE CHAT PERCHÉ — on n'est sauvé que posé sur un nombre qui obéit.
//   · LA RUÉE — on ramasse les nombres qui obéissent, on évite les autres.
//   · LA PLUIE — on attrape ceux qui obéissent, on laisse filer les autres.
//
// ── CE QUI FAIT QUE CES TROIS JEUX SONT DES JEUX DE MATHS ─────────────────
//
// Dans les trois, le geste du joueur EST une décision mathématique, prise en
// une seconde, sous pression : « 51 est-il premier ? » — et l'on court déjà.
// Ce n'est pas une question posée puis récompensée ; c'est la question qui
// décide où l'on pose le pied. C'est le critère que le plateau de Rémy avait
// imposé, et ces trois-là le passent.
//
// ── POURQUOI UN SEUL FICHIER POUR LES TROIS ───────────────────────────────
//
// Parce que la règle est la même : un nombre obéit, ou il n'obéit pas. Trois
// copies de « est-ce un multiple de 6 » auraient fini par ne plus répondre la
// même chose — et un jeu où la bonne réponse dépend du jeu auquel on joue est
// pire qu'un jeu cassé, parce que personne ne le voit.
//
// ── ET POURQUOI UNE CONSIGNE EST UNE DONNÉE, PAS UNE FONCTION ─────────────
//
// `{ famille: 'multiples', parametre: 6 }` se range, se transmet, et se relit.
// Une fonction `(n) => n % 6 === 0` ne traverserait pas le réseau — et ces
// trois jeux sont faits pour trente ardoises qui doivent TOUTES recevoir la
// même consigne à la même seconde.

/* ──────────────────────────── DEUX OUTILS ──────────────────────────────── */

/** Un nombre premier, sans table et sans surprise. */
export function estPremier(n) {
    const v = Math.round(Number(n));
    if (!Number.isFinite(v) || v < 2) return false;
    if (v % 2 === 0) return v === 2;
    for (let d = 3; d * d <= v; d += 2) {
        if (v % d === 0) return false;
    }
    return true;
}

/** Un carré parfait. */
export function estCarre(n) {
    const v = Math.round(Number(n));
    if (!Number.isFinite(v) || v < 0) return false;
    const r = Math.round(Math.sqrt(v));
    return r * r === v;
}

/* ──────────────────────────── LES FAMILLES ─────────────────────────────── */

/**
 * LES SIX FAMILLES DE CONSIGNES, et ce qu'elles coûtent à l'élève.
 *
 * ELLES SONT CLASSÉES DE LA PLUS MÉCANIQUE À LA PLUS RÉFLÉCHIE, et c'est ce
 * qui permet au professeur de choisir : `parite` se décide d'un coup d'œil,
 * `premiers` demande de chercher un diviseur sous pression. Un jeu vif dont
 * toutes les consignes seraient des nombres premiers ne serait pas vif, ce
 * serait une interrogation chronométrée.
 */
export const FAMILLES = {
    parite: { nom: 'pairs ou impairs', facile: true },
    comparaison: { nom: 'plus grand, plus petit', facile: true },
    multiples: { nom: 'les multiples', facile: true },
    encadrement: { nom: 'entre deux bornes', facile: false },
    carres: { nom: 'les carrés parfaits', facile: false },
    premiers: { nom: 'les nombres premiers', facile: false }
};

/**
 * CE NOMBRE OBÉIT-IL À CETTE CONSIGNE ?
 *
 * C'EST L'ARBITRE DES TROIS JEUX, et il tient en dix lignes. Le chat perché
 * s'en sert pour dire qui est sauvé, la ruée pour compter les points, la pluie
 * pour dire si le panier a bien fait. Un seul arbitre, trois jeux.
 */
export function obeit(consigne, n) {
    if (!consigne) return false;
    const v = Number(n);
    if (!Number.isFinite(v)) return false;
    const p = Number(consigne.parametre);
    switch (consigne.famille) {
        case 'parite': return p === 0 ? v % 2 === 0 : Math.abs(v % 2) === 1;
        case 'multiples': return p !== 0 && v % p === 0;
        case 'premiers': return estPremier(v);
        case 'carres': return estCarre(v);
        // `sens` vaut 1 pour « plus grand que », −1 pour « plus petit que ».
        case 'comparaison': return consigne.sens < 0 ? v < p : v > p;
        case 'encadrement': return v >= p && v <= Number(consigne.jusqua);
        default: return false;
    }
}

/**
 * LA CONSIGNE, ÉCRITE COMME ON LA CRIE À LA CLASSE.
 *
 * ELLE EST À L'IMPÉRATIF ET AU PLURIEL — « LES MULTIPLES DE 6 » et non « un
 * nombre divisible par 6 » : c'est une phrase qu'on lit en courant, du fond de
 * la salle, en une demi-seconde. La précision grammaticale coûterait des mots,
 * et les mots coûtent du temps de jeu.
 */
export function texteDeLaConsigne(consigne) {
    if (!consigne) return '';
    const p = consigne.parametre;
    switch (consigne.famille) {
        case 'parite': return p === 0 ? 'LES NOMBRES PAIRS' : 'LES NOMBRES IMPAIRS';
        case 'multiples': return `LES MULTIPLES DE ${p}`;
        case 'premiers': return 'LES NOMBRES PREMIERS';
        case 'carres': return 'LES CARRÉS PARFAITS';
        case 'comparaison':
            return consigne.sens < 0 ? `PLUS PETIT QUE ${p}` : `PLUS GRAND QUE ${p}`;
        case 'encadrement': return `ENTRE ${p} ET ${consigne.jusqua}`;
        default: return '';
    }
}

/**
 * UNE CONSIGNE TIRÉE AU SORT, parmi les familles autorisées.
 *
 * ON NE TIRE JAMAIS DEUX FOIS LA MÊME DE SUITE : une consigne qui ne change
 * pas alors que l'écran annonce « NOUVELLE CONSIGNE » fait croire à l'élève
 * qu'il a mal lu, et il perd les trois secondes qui comptent.
 *
 * @param {object} rng le tirage de `core/ids.js`
 * @param {object} [o] { familles, maxi, precedente }
 */
export function tirerUneConsigne(rng, o = {}) {
    const permises = (o.familles || Object.keys(FAMILLES))
        .filter(f => FAMILLES[f]);
    const maxi = Math.max(20, Math.round(o.maxi || 99));
    const avant = o.precedente;
    for (let essai = 0; essai < 24; essai++) {
        const famille = rng.pick(permises.length ? permises : Object.keys(FAMILLES));
        const c = { famille };
        if (famille === 'parite') c.parametre = rng.int(0, 1);
        else if (famille === 'multiples') c.parametre = rng.int(2, 9);
        else if (famille === 'comparaison') {
            c.parametre = rng.int(Math.round(maxi * 0.3), Math.round(maxi * 0.7));
            c.sens = rng.bool() ? 1 : -1;
        } else if (famille === 'encadrement') {
            c.parametre = rng.int(5, Math.round(maxi * 0.6));
            c.jusqua = c.parametre + rng.int(Math.round(maxi * 0.15), Math.round(maxi * 0.35));
        }
        if (!avant || texteDeLaConsigne(c) !== texteDeLaConsigne(avant)) return c;
    }
    return { famille: 'parite', parametre: avant && avant.parametre === 0 ? 1 : 0 };
}

/**
 * DES NOMBRES DONT UNE PART OBÉIT, ET LE RESTE NON.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * C'EST LA FONCTION QUI DÉCIDE SI LE JEU EST JOUABLE, et c'est pour cela
 * qu'elle est ici plutôt que dans chaque écran. Un terrain où tout obéit se
 * ramasse les yeux fermés ; un terrain où rien n'obéit fait courir trente
 * élèves pour rien. **On vise donc une part donnée — un peu moins de la
 * moitié —, et on la garantit.**
 *
 * ON MÉLANGE À LA FIN, sans quoi les bons nombres sortiraient tous en premier
 * et le terrain serait lisible à sa seule disposition — ce qui réglerait le
 * jeu sans la moindre arithmétique.
 *
 * ET SI LA CONSIGNE EST TROP RARE POUR LE TIRAGE — « les carrés parfaits »
 * entre 1 et 20 n'en donne que quatre —, on rend ce qu'on a trouvé plutôt que
 * de tourner sans fin. Un terrain un peu pauvre reste un terrain ; une boucle
 * infinie fige trente écrans d'un coup.
 */
export function tirerDesNombres(consigne, rng, o = {}) {
    const combien = Math.max(1, Math.round(o.combien || 12));
    const maxi = Math.max(10, Math.round(o.maxi || 99));
    const mini = Math.max(0, Math.round(o.mini ?? 2));
    const part = Math.min(0.9, Math.max(0.1, o.part ?? 0.45));
    const voulus = Math.round(combien * part);
    const bons = [];
    const mauvais = [];
    // DEUX FOIS PLUS D'ESSAIS QUE DE NOMBRES DEMANDÉS, et pas davantage : au
    // delà, on cherche une aiguille que la consigne n'a pas mise dans le foin.
    for (let essai = 0; essai < combien * 60; essai++) {
        if (bons.length >= voulus && mauvais.length >= combien - voulus) break;
        const n = rng.int(mini, maxi);
        if (obeit(consigne, n)) {
            if (bons.length < voulus) bons.push(n);
        } else if (mauvais.length < combien - voulus) {
            mauvais.push(n);
        }
    }
    return rng.shuffle([...bons, ...mauvais]);
}

/**
 * COMBIEN, PARMI CES NOMBRES, OBÉISSENT.
 *
 * Elle sert aux trois jeux pour la même chose : savoir s'il reste quelque
 * chose à faire. Un terrain dont tous les bons nombres sont ramassés doit se
 * renouveler, sinon trente élèves courent dans le vide en attendant la fin.
 */
export function combienObeissent(consigne, nombres) {
    return (nombres || []).filter(n => obeit(consigne, n)).length;
}
