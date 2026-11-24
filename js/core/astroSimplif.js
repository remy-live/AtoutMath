// ASTRO-SIMPLIF — les règles, sans une ligne de DOM.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 24 novembre, en collant un jeu complet écrit ailleurs : « c'est ça que
// tu m'intègres ». Des astéroïdes portent une fraction et descendent vers le
// vaisseau ; ses canons tirent des DIVISEURS — ÷ 2, ÷ 3, ÷ 5… — qui divisent
// le numérateur ET le dénominateur ; une fraction devenue irréductible
// explose.
//
// C'EST LA SIMPLIFICATION ÉCRITE AU TABLEAU, faite au lieu d'être écrite :
// 36/48 → ÷ 2 → 18/24 → ÷ 2 → 9/12 → ÷ 3 → 3/4. Le bilan relit ces chaînes à
// la fin, et c'est en les relisant qu'on voit ce qu'on vient de faire.
//
// Ici, rien ne connaît ni les pixels ni l'horloge du navigateur : les positions
// vont de 0 à 1 (x de gauche à droite, y du haut de l'écran à la ligne de
// défense), le temps avance par `avancer(dt)`. C'est ce qui permet de jouer
// des missions entières dans une épreuve, sans écran.
//
// ── CE QUI A CHANGÉ PAR RAPPORT AU JEU REÇU, ET POURQUOI ─────────────────────
//
// 1. UN TIR FAUX COÛTE QUELQUE CHOSE. Dans le fichier reçu, il remettait le
//    combo à 1, et c'est tout : la stratégie gagnante était d'appuyer sur les
//    cinq canons à la suite, et le jeu n'enseignait plus la divisibilité mais
//    la vitesse des pouces. Le Chasseur de Diviseurs avait payé la même leçon
//    (voir `js/core/diviseurs.js`). Le tir faux paie maintenant trois fois :
//    il rebondit, et l'astéroïde fait un BOND vers le vaisseau ; les canons
//    SURCHAUFFENT une seconde et demie ; et une fraction qui a fait
//    rebondir plus d'un tir explose bien, mais compte comme À REVOIR. Le
//    message dit toujours pourquoi le tir n'est pas passé.
//
//    MESURÉ (`node tools/equilibreAstro.mjs`, 40 missions par ligne), en
//    fractions simplifiées :
//
//                       calcule tout   se trompe 1 fois sur 4   mitraille
//      bond seul            100 %             100 %                100 %
//      + surchauffe         100 %          98 à 100 %          4 à 87 %
//      + « à revoir »       100 %          92 à 96 %           4 à 34 %
//
//    Le bond et la surchauffe seuls ne suffisaient pas chez les cadets : des
//    fractions en une ou deux étapes, et ÷ 2 qui passe une fois sur deux, se
//    cassent par hasard avant d'avoir approché. Un rebond reste permis :
//    se tromper puis corriger, c'est apprendre.
//
// 2. LA MISSION A EXACTEMENT AUTANT DE FRACTIONS QUE L'ÉTAPE EN ANNONCE.
//    Le jeu reçu était sans fin, avec quatre boucliers : la partie s'arrêtait
//    au quatrième impact. Dans un parcours, « 10 fractions » en haut de
//    l'écran doit vouloir dire dix astéroïdes, chacun une question. Un
//    astéroïde qui touche le vaisseau est une fraction ratée, et la mission
//    continue — comme MultiKart, qui n'a pas de vies non plus.
//
// 3. LE RAYON « PGCD » NE DONNE PLUS LA RÉPONSE. Il réduisait la fraction
//    d'un coup, sans que l'élève ait rien divisé — et la fraction comptait
//    comme réussie. Il ÉCRIT maintenant le PGCD sur l'astéroïde : « PGCD 12 ».
//    Reste à le casser en canons, 12 = 2 × 2 × 3. C'est le lien entre le PGCD
//    et la simplification, dit au moment où l'on en a besoin.
//
// 4. LE BOUCLIER « +1 » DEVIENT UN REMPART. Sans vies, rendre une vie ne veut
//    plus rien dire ; le rempart repousse vers le haut le prochain astéroïde
//    qui allait toucher — une seconde chance sur UNE fraction, pas un point
//    gagné sans calcul.

import { makeRng } from './ids.js';

/** Le plus grand diviseur commun, par l'algorithme d'Euclide. */
export function pgcd(a, b) {
    let x = Math.abs(a), y = Math.abs(b);
    while (y !== 0) { const t = y; y = x % y; x = t; }
    return x;
}

export const irreductible = (num, den) => pgcd(num, den) === 1;

/**
 * LES TROIS GRADES. Ce sont ceux du jeu reçu — les canons, la taille des
 * nombres, le nombre d'étapes —, réglés par le professeur et non plus choisis
 * sur l'écran d'accueil : c'est lui qui sait si sa classe connaît la table de 11.
 *
 * `chute` est le temps, en secondes, qu'un astéroïde met à descendre du haut
 * de l'écran jusqu'au vaisseau. Le jeu reçu parlait en pixels par seconde :
 * 24 px/s sur un écran de 600 px, mais 24 px/s aussi sur un téléphone de
 * 450 px, qui donnait donc un quart de temps en moins pour calculer.
 */
export const GRADES = {
    cadet: {
        nom: 'Cadet', niveau: '6e – 5e', canons: [2, 3, 5, 7, 10],
        chute: 24, cadence: 4.5, ensemble: 2, maxDen: 120, etapes: [1, 2]
    },
    pilote: {
        nom: 'Pilote', niveau: '5e – 4e', canons: [2, 3, 5, 7, 11],
        chute: 21, cadence: 4.1, ensemble: 3, maxDen: 260, etapes: [2, 3]
    },
    commandant: {
        nom: 'Commandant', niveau: '4e – 3e', canons: [2, 3, 5, 7, 11, 13],
        chute: 18, cadence: 3.8, ensemble: 3, maxDen: 450, etapes: [2, 3]
    }
};

/** L'allure multiplie le temps de chute : c'est le temps qu'on a pour calculer. */
export const ALLURES = {
    lente: { nom: 'Lente', facteur: 1.45 },
    normale: { nom: 'Normale', facteur: 1 },
    rapide: { nom: 'Rapide', facteur: 0.75 }
};

/**
 * LA COULEUR DE CHAQUE CANON, reprise du jeu reçu. Elle suit le diviseur
 * partout : le bouton, le rayon, le bandeau du mémo. Aucune n'est le vert ni
 * le rouge purs, qui disent « juste » et « faux » dans tout le logiciel.
 */
export const COULEURS = {
    2: '#38bdf8', 3: '#34d399', 5: '#fbbf24', 7: '#c084fc',
    10: '#2dd4bf', 11: '#f472b6', 13: '#fb7185'
};

/**
 * LES CRITÈRES, tels que le mémo de bord les écrit. Repris du jeu reçu ; la
 * phrase de 7, 11 et 13 dit ce qu'on fait vraiment au collège quand il n'y a
 * pas de critère simple : on connaît la table, ou l'on pose la division.
 */
export const CRITERES = {
    2: 'Un nombre est divisible par <b>2</b> s\'il est pair : il finit par <b>0, 2, 4, 6 ou 8</b>.',
    3: 'Un nombre est divisible par <b>3</b> si la <b>somme de ses chiffres</b> est dans la table de 3 : 42 → 4 + 2 = 6.',
    5: 'Un nombre est divisible par <b>5</b> s\'il finit par <b>0 ou 5</b>.',
    7: 'Pour <b>7</b>, on connaît sa table : 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98…',
    10: 'Un nombre est divisible par <b>10</b> s\'il finit par <b>0</b>.',
    11: 'Pour <b>11</b> : 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132, 143…',
    13: 'Pour <b>13</b> : 26, 39, 52, 65, 78, 91, 104, 117, 130, 143, 156, 169…'
};

/**
 * LES CAPSULES. Quatre, comme dans le jeu reçu ; deux ont changé de sens
 * (voir l'en-tête). Aucune ne simplifie à la place de l'élève.
 *
 * « RALENTI », ET NON PLUS « STASE ». Rémy : « Stase est un mot compliqué. »
 * Un mot qu'il faut expliquer à un élève de sixième n'explique rien ; celui-ci
 * dit ce qu'il fait. Et la phrase dit combien : deux fois moins vite.
 */
export const CAPSULES = {
    pgcd: { nom: 'PGCD', couleur: '#38bdf8', dit: 'Le PGCD s\'écrit sur l\'astéroïde visé : casse-le en canons !' },
    rempart: { nom: 'Rempart', couleur: '#34d399', dit: 'Rempart levé : le prochain astéroïde qui touche sera repoussé.' },
    ralenti: { nom: 'Ralenti', couleur: '#c084fc', dit: 'Ralenti : les astéroïdes descendent deux fois moins vite pendant 6 secondes.' },
    double: { nom: '× 2', couleur: '#fbbf24', dit: 'Points doublés pendant 8 secondes !' }
};

/** Durées, en secondes, et quelques constantes de la mission. */
export const DUREES = { RALENTI: 6, DOUBLE: 8 };
export const LENTEUR_DU_RALENTI = 0.5;
/** Le bond d'un astéroïde touché par un tir faux, en part de la descente. */
export const BOND = 0.12;
/**
 * LA SURCHAUFFE : après un tir faux, les canons se taisent un moment.
 *
 * MESURÉ (`tools/equilibreAstro.mjs`) : avec le seul bond, un robot qui
 * appuie sur tous les canons à la suite, sans rien calculer, simplifiait
 * 10 fractions sur 10 dans les trois grades — la rafale casse la fraction
 * avant que les bonds ne l'aient rapprochée. Il faut donc que le tir faux
 * coûte du TEMPS, et pas seulement de la distance : on ne mitraille plus.
 */
export const SURCHAUFFE = 1.5;
/**
 * LES DEUX VISÉES. Rémy : « ce serait bien d'avoir un mode auto (comme
 * maintenant) où ça vise, mais aussi là où le vaisseau tire droit, et on
 * pourrait alors avoir plusieurs fractions ».
 *
 * EN AUTOMATIQUE, le canon part vers la fraction touchée du doigt, sinon vers
 * la plus menaçante : on choisit QUOI simplifier, jamais OÙ tirer.
 *
 * EN TIR DROIT, le canon part tout droit, et touche la plus basse des
 * fractions au-dessus du vaisseau. Le choix de la cible redevient un geste —
 * se placer dessous —, et c'est ce qui permet d'en mettre davantage à l'écran
 * sans que l'élève perde le fil : deux de plus, qui arrivent plus serrées.
 * Une fraction qui en cache une autre la protège, comme un vrai astéroïde.
 */
export const VISEES = {
    auto: { nom: 'Automatique', enPlus: 0, cadence: 1 },
    droit: { nom: 'Tir droit', enPlus: 2, cadence: 0.7 }
};
/** La demi-largeur touchée par un tir droit, en part de l'écran : l'écran la règle sur la taille réelle des astéroïdes. */
export const PORTEE = 0.08;
/** Où le rempart renvoie l'astéroïde qu'il arrête. */
export const RENVOI_DU_REMPART = 0.25;
/** Chute d'une capsule, en part de l'écran par seconde. */
export const CHUTE_DES_CAPSULES = 0.16;
/** Un boss toutes les cinq fractions, comme dans le jeu reçu. */
export const BOSS_TOUS_LES = 5;
export const COMBO_MAX = 8;
/** Les rebonds qu'une fraction supporte en restant « simplifiée » : au-delà, elle est à revoir. */
export const REBONDS_PERMIS = 1;

/**
 * LES FRACTIONS DE DÉPART, toutes irréductibles. Ce sont celles du jeu reçu :
 * on les fabrique en multipliant haut ET bas par des canons du grade.
 */
export const BASES = [
    [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5],
    [1, 6], [5, 6], [2, 7], [3, 7], [4, 7], [5, 7], [3, 8], [5, 8], [7, 8],
    [2, 9], [4, 9], [5, 9], [7, 9], [3, 10], [7, 10], [4, 11], [5, 12]
];

/**
 * FABRIQUER UNE FRACTION À SIMPLIFIER — et non la tirer au hasard.
 *
 * Une fraction tirée au hasard peut demander un facteur que le grade n'a pas :
 * 34/51 se simplifie par 17, et un cadet n'a pas de canon ÷ 17. Elle serait
 * indestructible, et l'élève n'aurait aucun moyen de savoir pourquoi. On part
 * donc d'une fraction irréductible et l'on multiplie haut et bas par des
 * canons du grade : le PGCD est alors exactement leur produit, et il se casse
 * toujours avec les canons qu'on a.
 */
export function fabriquerFraction(rng, cleGrade, { boss = false } = {}) {
    const g = GRADES[cleGrade] || GRADES.cadet;
    const [p, q] = rng.pick(BASES);
    const [lo, hi] = boss ? [3, 3] : g.etapes;
    const etapes = rng.int(lo, hi);
    const plafond = boss ? Math.round(g.maxDen * 1.6) : g.maxDen;
    // ÷ 10 n'entre qu'en premier facteur, et chez les cadets : c'est le seul
    // grade qui l'a, et deux ÷ 10 empilés donnent des centaines sans intérêt.
    const facteurs = g.canons.filter((d) => d !== 10);
    let mult = 1;
    const pris = [];
    for (let i = 0; i < etapes; i++) {
        const f = (g.canons.includes(10) && i === 0 && rng.bool(0.25)) ? 10 : rng.pick(facteurs);
        if (q * mult * f <= plafond) { mult *= f; pris.push(f); }
    }
    if (mult === 1) { mult = facteurs[0]; pris.push(facteurs[0]); }
    return { num: p * mult, den: q * mult, base: [p, q], facteurs: pris };
}

/** La série d'une mission : `combien` fractions, sans doublon, un boss toutes les cinq. */
export function fabriquerSerie(rng, cleGrade, combien) {
    const vues = new Set();
    const serie = [];
    for (let i = 0; i < combien; i++) {
        const boss = (i + 1) % BOSS_TOUS_LES === 0;
        let f = null;
        for (let essai = 0; essai < 40; essai++) {
            f = fabriquerFraction(rng, cleGrade, { boss });
            // LE GÉANT DEMANDE AU MOINS DEUX DIVISIONS. Sous le plafond des
            // cadets, une fraction en septièmes n'en reçoit souvent qu'une —
            // 14/49 —, et l'astéroïde géant tombait d'un seul tir.
            if (boss && f.facteurs.length < 2 && essai < 39) continue;
            if (!vues.has(`${f.num}/${f.den}`)) break;
        }
        vues.add(`${f.num}/${f.den}`);
        serie.push({ num: f.num, den: f.den, boss });
    }
    return serie;
}

/** La somme des chiffres, ÉCRITE : « 1 + 6 = 7 ». */
function sommeEcrite(n) {
    const chiffres = String(n).split('').map(Number);
    const s = chiffres.reduce((a, b) => a + b, 0);
    return { texte: `${chiffres.join(' + ')} = ${s}`, s };
}

/** Pourquoi `d` ne divise pas `n` — dit par le critère quand il existe, par le reste sinon. */
function pourquoiPas(n, d) {
    if (d === 2) return `${n} est impair : il finit par ${n % 10}`;
    if (d === 5) return `${n} ne finit ni par 0 ni par 5`;
    if (d === 10) return `${n} ne finit pas par 0`;
    if (d === 3) {
        // Un nombre d'un seul chiffre se dit sans somme : « 7 n'est pas dans
        // la table de 3 » est vrai, et suffit.
        if (n < 10) return `${n} n'est pas dans la table de 3`;
        const { texte, s } = sommeEcrite(n);
        return `pour ${n}, ${texte}, et ${s} n'est pas dans la table de 3`;
    }
    // 7, 11, 13 : pas de critère simple au collège. On dit LE RESTE, comme le
    // Chasseur de Diviseurs : « 50 = 7 × 7 + 1 » montre qu'on est passé à côté
    // d'un multiple, et duquel.
    const quotient = Math.floor(n / d);
    return `${n} = ${d} × ${quotient} + ${n % d}, il reste ${n % d}`;
}

/**
 * LE MESSAGE D'UN TIR FAUX.
 *
 * IL NOMME CELUI DES DEUX QUI BLOQUE. Le jeu reçu parlait toujours du premier
 * nombre qui ne passait pas ; or l'erreur la plus fréquente est de regarder
 * le numérateur seul : 18/25, ÷ 2 — 18 est pair, et c'est 25 qui bloque. Le
 * message le dit : « 18 se divise par 2, mais 25 est impair ».
 */
export function expliquer(num, den, d) {
    const hautOk = num % d === 0;
    const basOk = den % d === 0;
    if (hautOk && basOk) return '';
    if (hautOk) return `÷ ${d} impossible : ${num} se divise par ${d}, mais ${pourquoiPas(den, d)}.`;
    if (basOk) return `÷ ${d} impossible : ${den} se divise par ${d}, mais ${pourquoiPas(num, d)}.`;
    return `÷ ${d} impossible : ${pourquoiPas(num, d)}.`;
}

/**
 * LE CLAVIER : ON TAPE LE DIVISEUR. Rémy, devant « ÷ 2 — touche 1, ÷ 3 —
 * touche 2 » : « c'est un peu absurde ». La touche était le rang du canon,
 * reprise du jeu reçu ; c'est maintenant le nombre lui-même — 2 pour ÷ 2,
 * 5 pour ÷ 5, et 1 puis 0 pour ÷ 10, comme on l'écrirait.
 *
 * `tampon` est ce qu'on a déjà tapé, `chiffre` la touche qui arrive. On tire
 * dès que ce qu'on a tapé est un canon et qu'aucun canon plus long ne commence
 * pareil : « 2 » part tout de suite, « 1 » attend la suite (10, 11 ou 13). Un
 * chiffre qui ne prolonge rien recommence un nombre neuf : 1 puis 2 tire ÷ 2.
 *
 * @returns {{ tir: number|null, tampon: string }}
 */
export function frapper(tampon, chiffre, canons) {
    const ecrits = canons.map(String);
    const essai = `${tampon}${chiffre}`;
    const plusLong = ecrits.some((c) => c.length > essai.length && c.startsWith(essai));
    if (ecrits.includes(essai) && !plusLong) return { tir: Number(essai), tampon: '' };
    if (plusLong) return { tir: null, tampon: essai };
    return tampon ? frapper('', chiffre, canons) : { tir: null, tampon: '' };
}

/** Ce qu'on a tapé, quand la suite n'est pas venue : un canon s'il en est un, sinon rien. */
export function finirFrappe(tampon, canons) {
    return canons.map(String).includes(tampon) ? Number(tampon) : null;
}

/** La chaîne écrite : « 36/48 → 18/24 → 3/4 ». */
export const chaineEcrite = (chaine) => chaine.map(([n, d]) => `${n}/${d}`).join(' → ');

/**
 * UNE MISSION : `combien` fractions qui descendent, des canons, des capsules.
 *
 * Elle rend ce qui se passe dans `evenements`, que l'écran vide à chaque
 * image : c'est lui qui dessine les rayons et les éclats, elle qui décide.
 */
export class Mission {
    constructor({ grade = 'cadet', allure = 'normale', combien = 10, graine = 'astro', fractions = null, visee = 'auto' } = {}) {
        this.cleGrade = GRADES[grade] ? grade : 'cadet';
        this.grade = GRADES[this.cleGrade];
        this.visee = VISEES[visee] ? visee : 'auto';
        this.portee = PORTEE;
        this.allure = ALLURES[allure] ? allure : 'normale';
        this.rng = makeRng(graine);
        // LA RÉVISION rejoue les fractions ratées, telles qu'elles étaient au
        // départ : on refait la chaîne entière, pas sa dernière marche.
        this.aVenir = fractions && fractions.length
            ? fractions.map((f, i) => ({ num: f.num, den: f.den, boss: false, rang: i }))
            : fabriquerSerie(this.rng, this.cleGrade, combien).map((f, i) => ({ ...f, rang: i }));
        this.total = this.aVenir.length;
        this.asteroides = [];
        this.capsules = [];
        this.vaisseau = { x: 0.5, but: 0.5, pousse: 0 };
        this.verrou = null;
        this.score = 0;
        this.combo = 1;
        this.ralenti = 0;
        this.double = 0;
        this.remparts = 0;
        this.tirs = 0;
        this.surchauffe = 0;
        this.tirsJustes = 0;
        this.attente = 0.6;
        this.temps = 0;
        this.prochainId = 1;
        this.rapports = [];
        this.evenements = [];
        this.finie = false;
    }

    get lances() { return this.total - this.aVenir.length; }
    /** Combien d'astéroïdes à la fois, et tous les combien : la visée les change. */
    get ensemble() { return this.grade.ensemble + VISEES[this.visee].enPlus; }
    get cadence() { return this.grade.cadence * VISEES[this.visee].cadence; }
    get faites() { return this.rapports.length; }

    /** La durée de chute d'un astéroïde neuf : un peu plus courte à chaque fraction réussie. */
    chuteIci(boss) {
        const g = this.grade;
        const acceleration = Math.max(0.75, 1 - 0.03 * this.rapports.filter((r) => r.reussi).length);
        return g.chute * ALLURES[this.allure].facteur * acceleration * (boss ? 1.4 : 1);
    }

    /** Un astéroïde neuf, placé où il ne cache pas celui qui vient d'entrer. */
    lancer() {
        const f = this.aVenir.shift();
        if (!f) return null;
        let x = 0.15 + this.rng.next() * 0.7;
        if (f.boss) x = 0.5;
        for (let essai = 0; essai < 8 && !f.boss; essai++) {
            if (!this.asteroides.some((a) => a.y < 0.3 && Math.abs(a.x - x) < 0.28)) break;
            x = 0.15 + this.rng.next() * 0.7;
        }
        const a = {
            id: this.prochainId++, rang: f.rang, x, y: -0.08,
            num: f.num, den: f.den, depart: [f.num, f.den], chaine: [[f.num, f.den]],
            fautes: 0, boss: !!f.boss, vitesse: 1 / this.chuteIci(f.boss),
            indice: null, rotation: this.rng.next() * Math.PI * 2,
            tour: (this.rng.bool() ? -1 : 1) * (0.18 + this.rng.next() * 0.22),
            graine: f.num + f.den
        };
        this.asteroides.push(a);
        this.evenements.push({ type: 'apparition', id: a.id, boss: a.boss, num: a.num, den: a.den });
        return a;
    }

    /**
     * LA CIBLE : celle qu'on a touchée du doigt, sinon la plus proche du
     * vaisseau en largeur, avec un penchant pour la plus basse — c'est elle
     * qui menace. Repris du jeu reçu.
     */
    cible() {
        if (this.visee === 'droit') return this.auDessus();
        if (this.verrou) {
            const v = this.asteroides.find((a) => a.id === this.verrou);
            if (v) return v;
            this.verrou = null;
        }
        let mieux = null, note = Infinity;
        for (const a of this.asteroides) {
            const n = Math.abs(a.x - this.vaisseau.x) - a.y * 0.35;
            if (n < note) { note = n; mieux = a; }
        }
        return mieux;
    }

    /**
     * EN TIR DROIT : la plus basse des fractions que le tir rencontre en
     * montant. Il faut qu'elle soit entrée dans le ciel — on ne tire pas sur
     * ce qu'on ne voit pas encore.
     */
    auDessus() {
        const x = this.vaisseau.x;
        let mieux = null;
        for (const a of this.asteroides) {
            if (a.y < 0 || Math.abs(a.x - x) > this.portee * (a.boss ? 1.3 : 1)) continue;
            if (!mieux || a.y > mieux.y) mieux = a;
        }
        return mieux;
    }

    verrouiller(id) {
        // En tir droit, toucher une fraction, c'est aller se placer dessous.
        if (this.visee === 'droit') {
            const a = this.asteroides.find((x) => x.id === id);
            if (a) this.diriger(a.x);
            return;
        }
        this.verrou = this.asteroides.some((a) => a.id === id) ? id : null;
        const a = this.cible();
        if (a) this.vaisseau.but = Math.min(0.92, Math.max(0.08, a.x));
    }

    diriger(x) {
        this.verrou = null;
        this.vaisseau.but = Math.min(0.92, Math.max(0.08, x));
    }

    pousser(sens) { this.vaisseau.pousse = sens; if (sens) this.verrou = null; }

    /**
     * TIRER `d` SUR LA CIBLE.
     *
     * Juste : haut et bas sont divisés ; si la fraction devient irréductible,
     * l'astéroïde explose. Faux : le tir rebondit, l'astéroïde fait un bond,
     * le combo retombe, et le message dit pourquoi.
     */
    tirer(d) {
        if (this.finie) return null;
        if (this.surchauffe > 0) {
            this.evenements.push({ type: 'surchauffe', d, reste: this.surchauffe });
            return { ok: false, chaud: true };
        }
        const a = this.cible();
        if (!a) {
            this.evenements.push({ type: 'tir-vide', d });
            return { ok: false, vide: true };
        }
        this.tirs++;
        if (a.num % d === 0 && a.den % d === 0) {
            this.tirsJustes++;
            a.num /= d;
            a.den /= d;
            a.chaine.push([a.num, a.den]);
            // L'indice du PGCD suit la fraction : 12 est devenu 6 après ÷ 2.
            if (a.indice) a.indice = pgcd(a.num, a.den);
            if (irreductible(a.num, a.den)) {
                this.reussir(a, d);
                return { ok: true, fini: true, id: a.id };
            }
            const points = 25 * (this.double > 0 ? 2 : 1);
            this.score += points;
            this.evenements.push({ type: 'division', id: a.id, d, num: a.num, den: a.den, points });
            return { ok: true, fini: false, id: a.id };
        }
        a.fautes++;
        this.combo = 1;
        this.surchauffe = SURCHAUFFE;
        a.y = Math.min(0.97, a.y + BOND);
        const message = expliquer(a.num, a.den, d);
        this.evenements.push({ type: 'ricochet', id: a.id, d, num: a.num, den: a.den, message });
        return { ok: false, id: a.id, message };
    }

    reussir(a, d) {
        const mult = this.double > 0 ? 2 : 1;
        const etapes = a.chaine.length - 1;
        const points = (a.boss ? 350 : 120) * Math.max(1, etapes) * this.combo * mult;
        this.score += points;
        this.combo = Math.min(COMBO_MAX, this.combo + 1);
        this.retirer(a);
        const rapport = this.rapporter(a, a.fautes <= REBONDS_PERMIS);
        this.evenements.push({ type: 'irreductible', id: a.id, d, x: a.x, y: a.y, points, rapport, boss: a.boss });
        // Une capsule de temps en temps — toujours sur un boss.
        if (a.boss || this.rng.bool(0.32)) {
            const sorte = this.rng.pick(Object.keys(CAPSULES));
            const c = { id: this.prochainId++, sorte, x: a.x, y: Math.max(0.05, a.y), phase: this.rng.next() * 6 };
            this.capsules.push(c);
            this.evenements.push({ type: 'capsule-larguee', id: c.id, sorte });
        }
    }

    retirer(a) {
        this.asteroides = this.asteroides.filter((x) => x !== a);
        if (this.verrou === a.id) this.verrou = null;
    }

    rapporter(a, reussi) {
        const g = pgcd(...a.depart);
        const rapport = {
            rang: a.rang, depart: a.depart, chaine: a.chaine.map((c) => [...c]),
            juste: [a.depart[0] / g, a.depart[1] / g], reussi, fautes: a.fautes, boss: a.boss
        };
        this.rapports.push(rapport);
        return rapport;
    }

    /** Ramasser une capsule — au doigt, ou parce qu'elle est tombée sur le vaisseau. */
    ramasser(id) {
        const i = this.capsules.findIndex((c) => c.id === id);
        if (i < 0) return null;
        const [c] = this.capsules.splice(i, 1);
        const ev = { type: 'capsule', id: c.id, sorte: c.sorte, x: c.x, y: c.y };
        if (c.sorte === 'rempart') this.remparts = Math.min(2, this.remparts + 1);
        else if (c.sorte === 'ralenti') this.ralenti = DUREES.RALENTI;
        else if (c.sorte === 'double') this.double = DUREES.DOUBLE;
        else if (c.sorte === 'pgcd') {
            const a = this.cible();
            if (a) { a.indice = pgcd(a.num, a.den); ev.cible = a.id; ev.indice = a.indice; }
            else { this.score += 150; ev.points = 150; }
        }
        this.evenements.push(ev);
        return ev;
    }

    avancer(dt) {
        if (this.finie) return;
        this.temps += dt;
        if (this.ralenti > 0) this.ralenti = Math.max(0, this.ralenti - dt);
        if (this.double > 0) this.double = Math.max(0, this.double - dt);
        if (this.surchauffe > 0) this.surchauffe = Math.max(0, this.surchauffe - dt);

        // Le vaisseau : vers son but, ou poussé par les flèches.
        const v = this.vaisseau;
        if (v.pousse) v.but = Math.min(0.92, Math.max(0.08, v.but + v.pousse * 0.9 * dt));
        v.x += (v.but - v.x) * Math.min(1, 12 * dt);

        // Un astéroïde neuf : tout de suite si le ciel est vide, sinon à la cadence.
        this.attente -= dt;
        if (this.aVenir.length && (this.asteroides.length === 0
            || (this.attente <= 0 && this.asteroides.length < this.ensemble))) {
            this.lancer();
            this.attente = this.cadence;
        }

        const lent = this.ralenti > 0 ? LENTEUR_DU_RALENTI : 1;
        for (const a of [...this.asteroides]) {
            a.y += a.vitesse * lent * dt;
            a.rotation += a.tour * lent * dt;
            if (a.y < 1) continue;
            if (this.remparts > 0) {
                this.remparts--;
                a.y = RENVOI_DU_REMPART;
                this.evenements.push({ type: 'rempart', id: a.id, x: a.x });
                continue;
            }
            this.combo = 1;
            this.retirer(a);
            const rapport = this.rapporter(a, false);
            this.evenements.push({ type: 'impact', id: a.id, x: a.x, num: a.num, den: a.den, rapport });
        }

        for (const c of [...this.capsules]) {
            c.y += CHUTE_DES_CAPSULES * dt;
            if (c.y >= 0.94 && Math.abs(c.x - v.x) < 0.11) this.ramasser(c.id);
            else if (c.y > 1.08) this.capsules = this.capsules.filter((x) => x !== c);
        }

        if (!this.aVenir.length && !this.asteroides.length) {
            this.finie = true;
            this.evenements.push({ type: 'fin' });
        }
    }

    bilan() {
        const r = this.rapports;
        const justes = r.filter((x) => x.reussi).length;
        let serie = 0, meilleure = 0;
        for (const x of r) { serie = x.reussi ? serie + 1 : 0; meilleure = Math.max(meilleure, serie); }
        return {
            total: this.total, justes, score: this.score,
            precision: this.tirs ? this.tirsJustes / this.tirs : 1,
            tirs: this.tirs, tirsJustes: this.tirsJustes, meilleureSerie: meilleure,
            reussies: r.filter((x) => x.reussi),
            aRevoir: r.filter((x) => !x.reussi).map((x) => ({ num: x.depart[0], den: x.depart[1] }))
        };
    }
}

/**
 * LE CHEMIN LE PLUS COURT, pour la démonstration et pour l'épreuve qui
 * vérifie que chaque fraction se casse avec les canons du grade : on tire le
 * plus grand canon qui passe, et l'on recommence.
 */
export function cheminAvec(num, den, canons) {
    const pas = [];
    let n = num, d = den;
    while (!irreductible(n, d)) {
        const c = [...canons].sort((a, b) => b - a).find((k) => n % k === 0 && d % k === 0);
        if (!c) return null;
        pas.push(c);
        n /= c; d /= c;
    }
    return pas;
}
