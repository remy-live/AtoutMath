// MULTIKART — les calculs qu'on pose sous les portiques.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 23 novembre, devant la première version : « et configurer pour ne pas
// avoir que des tables de pythagore (addition, x10, x100, etc et on a le
// résultat et il faut trouver le calcul) et aussi pas forcément que 3 passages,
// ca peut être 2, puis 3 puis 4 ».
//
// TROIS RÉGLAGES EN SORTENT, ET ILS SONT ICI :
//
//   · LA FAMILLE DE CALCULS — tables, divisions, additions, soustractions,
//     multiplier par 10, 100, 1 000, diviser par 10, 100 ;
//   · LE SENS — « on donne le calcul, trouve le résultat », ou l'inverse :
//     « on donne le résultat, trouve le calcul » ;
//   · LE NOMBRE DE VOIES — deux, trois, quatre, ou les trois à la suite.
//
// ── UN LEURRE VIENT D'UNE VRAIE ERREUR ───────────────────────────────────────
//
// C'était la meilleure idée du fichier reçu, pour les tables : le voisin dans
// la table, l'addition des deux nombres, les chiffres retournés. On l'étend à
// chaque famille, et CHAQUE FAMILLE A SES ERREURS À ELLE :
//
//   · 47 + 8 → 45 ou 65 : la retenue oubliée, ou comptée deux fois ;
//   · 53 − 7 → 54 : « 7 − 3 », l'élève retranche le petit du grand ;
//   · 3,4 × 100 → « 3,400 » : ON AJOUTE DES ZÉROS — l'erreur que la leçon de
//     sixième existe pour défaire. Elle est écrite telle quelle sur le panneau,
//     et c'est bien pour cela que les résultats sont des TEXTES, pas des
//     nombres : 3,400 et 3,4 sont le même nombre, pas la même écriture.
//
// ── LES DÉCIMAUX SONT DES ENTIERS ET UN RANG ─────────────────────────────────
//
// Jamais de virgule flottante : 0,1 + 0,2 ne fait pas 0,3 dans une machine, et
// un panneau qui afficherait « 34,000000000004 » serait une faute du logiciel
// comptée à l'élève. Un nombre est ici un entier `m` et un nombre de décimales
// `d` : 3,4 est (34, 1). Multiplier par 100, c'est retirer deux rangs.

/* ─────────────────────────────────────────────────────────────────────────
 * 1. LES NOMBRES
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * L'espace fine insécable des milliers : « 12 000 » ne se coupe pas en deux sur
 * un panneau. Nommée par son code, parce qu'elle ne se voit pas dans un fichier.
 */
const FINE = String.fromCharCode(0x202f);

/** Le même nombre, sans zéro inutile à droite de la virgule. */
export function normal(m, d) {
    let mm = m, dd = d;
    while (dd > 0 && mm % 10 === 0) { mm /= 10; dd--; }
    return [mm, dd];
}

/** « 3,4 », « 340 », « 0,07 », « 12 000 » : l'écriture française d'un nombre. */
export function ecrire(m, d = 0) {
    const [mm, dd] = normal(m, d);
    const signe = mm < 0 ? '−' : '';
    let chiffres = String(Math.abs(mm));
    if (dd > 0) chiffres = chiffres.padStart(dd + 1, '0');
    const entier = dd > 0 ? chiffres.slice(0, -dd) : chiffres;
    const decimales = dd > 0 ? chiffres.slice(-dd) : '';
    // L'espace des milliers est une espace insécable fine : « 12 000 » ne se
    // coupe pas en deux sur un panneau.
    const groupe = entier.length > 4 ? entier.replace(/\B(?=(\d{3})+$)/g, FINE) : entier;
    return signe + groupe + (decimales ? `,${decimales}` : '');
}

/** Décaler de `k` rangs : k > 0 multiplie par 10 puissance k, k < 0 divise. */
export function decaler(m, d, k) {
    if (k >= 0) return d >= k ? normal(m, d - k) : normal(m * 10 ** (k - d), 0);
    return normal(m, d - k);
}

/** Une clé qui dit si deux écritures désignent le MÊME nombre. */
const cleDe = (m, d) => normal(m, d).join('e-');

/* ─────────────────────────────────────────────────────────────────────────
 * 2. LES FAMILLES
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Les six familles de calcul. `exemple` est ce que le réglage affiche — un
 * exemple se lit plus vite qu'un nom —, `competence` ce que le bilan retient.
 */
export const FAMILLES = {
    mul: { nom: 'Tables de multiplication', exemple: '7 × 8', competence: null },
    div: { nom: 'Divisions (les tables à l\'envers)', exemple: '56 ÷ 7', competence: 'num.div.quotient' },
    add: { nom: 'Additions de tête', exemple: '47 + 8', competence: 'num.add.entiers' },
    sub: { nom: 'Soustractions de tête', exemple: '53 − 7', competence: 'num.sub.entiers' },
    dix: { nom: 'Multiplier par 10, 100, 1 000', exemple: '3,4 × 100', competence: 'num.dec.puissances10' },
    dixieme: { nom: 'Diviser par 10, 100', exemple: '340 ÷ 100', competence: 'num.dec.puissances10' }
};

export const SENS = ['resultat', 'calcul', 'mixte'];

const PUISSANCE = ['1', '10', '100', `1${FINE}000`];

/**
 * UN FAIT : un calcul et son résultat, tous deux en texte.
 *
 * `valeur` est la clé du NOMBRE — deux écritures du même nombre ont la même —,
 * `resultat` son écriture. C'est `valeur` qu'on compare quand il faut savoir
 * si un leurre est par accident juste : 3 × 8 et 4 × 6 ne s'écrivent pas
 * pareil, et tous deux font 24.
 */
function fait(op, a, b, calcul, m, d, competence, table = null) {
    return {
        op, a, b, table, calcul, m, d,
        resultat: ecrire(m, d), valeur: cleDe(m, d),
        egalite: `${calcul} = ${ecrire(m, d)}`,
        competence, cle: `${op}:${calcul}`
    };
}

/** Le fait « a op b », pour chaque famille. `a` et `b` sont des entiers ou des [m, d]. */
export function leFait(op, a, b) {
    if (op === 'mul') return fait(op, a, b, `${a} × ${b}`, a * b, 0, null);
    if (op === 'div') return fait(op, a, b, `${a} ÷ ${b}`, a / b, 0, FAMILLES.div.competence);
    if (op === 'add') return fait(op, a, b, `${a} + ${b}`, a + b, 0, FAMILLES.add.competence);
    if (op === 'sub') return fait(op, a, b, `${a} − ${b}`, a - b, 0, FAMILLES.sub.competence);
    // Pour les puissances de dix, `a` est [m, d] et `b` le nombre de rangs.
    //
    // ON NORMALISE D'ABORD. « 35,0 » s'écrit « 35 » : tiré comme (350, 1), il
    // passait pour un décimal, recevait le piège à zéros — « 35000 » — et le
    // portique « 35 × 1 000 » arrivait avec DEUX bons panneaux, « 35000 » et
    // « 35 000 », dont un compté faux. Tombé à la première épreuve.
    const [m, d] = normal(a[0], a[1]);
    if (op === 'dix') {
        const r = decaler(m, d, b);
        return fait(op, [m, d], b, `${ecrire(m, d)} × ${PUISSANCE[b]}`, r[0], r[1], FAMILLES.dix.competence);
    }
    const r = decaler(m, d, -b);
    return fait(op, [m, d], b, `${ecrire(m, d)} ÷ ${PUISSANCE[b]}`, r[0], r[1], FAMILLES.dixieme.competence);
}

/** Un nombre à décaler : un entier, ou un décimal à une ou deux décimales. */
function nombreADecaler(rng, grand) {
    const genre = rng.int(0, 5);
    if (genre <= 1) return [rng.int(2, grand ? 99 : 60), 0];          // 7, 34
    if (genre === 2) return [rng.int(11, 99), 1];                     // 3,4
    if (genre === 3) return [rng.int(101, 999), 1];                   // 12,5
    if (genre === 4) return [rng.pick([5, 7, 25, 75, 8, 12, 45]), 2]; // 0,07 ; 0,25
    return [rng.int(1, 9), 1];                                        // 0,7
}

/** Tirer un fait dans une famille. */
export function tirerFait(op, rng, tables = [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    if (op === 'mul' || op === 'div') {
        const table = rng.pick(tables);
        const autre = rng.int(2, 10);
        if (op === 'mul') {
            const f = rng.bool(0.45) ? leFait('mul', autre, table) : leFait('mul', table, autre);
            f.table = table;
            f.competence = `mult:${table}`;
            return f;
        }
        const f = leFait('div', table * autre, table);
        f.table = table;
        return f;
    }
    if (op === 'add') {
        // Trois gestes : passer la dizaine (47 + 8), ajouter des dizaines
        // (36 + 20), et les deux à la fois (25 + 37).
        const genre = rng.int(0, 2);
        const a = rng.int(13, 78);
        const b = genre === 0 ? rng.int(3, 9) : genre === 1 ? rng.int(1, 4) * 10 : rng.int(12, 39);
        return leFait('add', a, b);
    }
    if (op === 'sub') {
        const genre = rng.int(0, 2);
        const a = rng.int(31, 98);
        const b = genre === 0 ? rng.int(3, 9) : genre === 1 ? rng.int(1, 2) * 10 : rng.int(12, 29);
        return leFait('sub', a, b);
    }
    if (op === 'dix') return leFait('dix', nombreADecaler(rng, true), rng.int(1, 3));
    // Diviser : on part plus souvent d'un entier, « 340 ÷ 100 ».
    const k = rng.int(1, 2);
    const depart = rng.bool(0.6) ? [rng.int(3, 98) * (rng.bool(0.5) ? 10 : 1), 0] : nombreADecaler(rng, false);
    return leFait('dixieme', depart, k);
}

/* ─────────────────────────────────────────────────────────────────────────
 * 3. LES LEURRES
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * LES MAUVAIS RÉSULTATS QUI RESSEMBLENT AU BON — sens « trouve le résultat ».
 *
 * Rend des TEXTES, tous différents, aucun n'étant une autre écriture du bon
 * résultat… sauf un, voulu : « 3,400 » pour 3,4 × 100 n'est pas 340, c'est
 * 3,4 avec des zéros, et c'est exactement l'erreur à faire voir.
 */
export function leurresDeResultat(f, rng) {
    const vivier = [];
    const entier = (v) => { if (Number.isInteger(v) && v > 0) vivier.push(ecrire(v, 0)); };
    if (f.op === 'mul') {
        const { a, b, m: juste } = f;
        if (b > 2) entier(a * (b - 1));
        entier(a * (b + 1));
        if (a > 2) entier((a - 1) * b);
        entier((a + 1) * b);
        entier(a + b);
        const diz = Math.floor(juste / 10), u = juste % 10;
        if (juste >= 12 && u !== 0 && diz !== u) entier(u * 10 + diz);
        if (juste > 12) entier(juste - 10);
        entier(juste + 10);
        if (juste > 4) entier(juste - 2);
        entier(juste + 2);
        // Les petits produits ont peu de voisins : 2 × 2 n'en a que deux.
        entier(juste + 1);
        entier(juste + a);
    } else if (f.op === 'div') {
        const q = f.m;
        [q - 1, q + 1, q + 2, q - 2, f.b, f.b + 1, q + 10].forEach(entier);
    } else if (f.op === 'add') {
        const s = f.m;
        // La retenue oubliée, la retenue comptée deux fois, puis les proches.
        [s - 10, s + 10, s - 1, s + 1, s + 2, s - 2, s + 9].forEach(entier);
    } else if (f.op === 'sub') {
        const r = f.m, { a, b } = f;
        // « 53 − 7 = 54 » : on retranche le petit chiffre du grand.
        const pieges = Math.floor(a / 10) * 10 - Math.floor(b / 10) * 10 + Math.abs((a % 10) - (b % 10));
        [pieges, r + 10, r - 10, r + 1, r - 1, r + 2, a + b].forEach(entier);
    } else {
        const [m, d] = f.a, k = f.op === 'dix' ? f.b : -f.b;
        // La virgule mal placée, d'un rang ou de deux, dans les deux sens.
        // Pas au-delà de trois rangs : « 6 300 000 » pour 63 × 1 000 ne trompe
        // personne, c'est un panneau perdu.
        for (const e of [k - 1, k + 1, -k, k - 2, k + 2]) {
            if (Math.abs(e) <= 3) vivier.push(ecrire(...decaler(m, d, e)));
        }
        // ON AJOUTE DES ZÉROS : 3,4 × 100 → « 3,400 ». Seulement pour un
        // décimal qu'on multiplie — pour un entier, ajouter des zéros est juste.
        if (f.op === 'dix' && d > 0) vivier.unshift(`${ecrire(m, d)}${'0'.repeat(f.b)}`);
    }
    const vus = new Set([f.resultat]);
    const bons = [];
    for (const t of vivier) { if (!vus.has(t)) { vus.add(t); bons.push(t); } }
    // Le piège à zéros reste en tête : c'est lui qu'on veut voir sur la piste.
    const tete = f.op === 'dix' && f.a[1] > 0 ? bons.splice(0, 1) : [];
    return [...tete, ...rng.shuffle(bons)];
}

/**
 * LES CALCULS VOISINS QUI NE DONNENT PAS LE RÉSULTAT — sens « trouve le calcul ».
 *
 * Rend des FAITS de la même famille, dont aucun n'a la valeur cherchée. Sans
 * cette garde, « 24 = ? » offrirait 4 × 6 et 3 × 8 : deux bonnes arches, dont
 * une comptée fausse.
 */
export function leurresDeCalcul(f, rng) {
    const voisins = [];
    const pousser = (g) => { if (g && g.m > 0) voisins.push(g); };
    if (f.op === 'mul') {
        const { a, b } = f;
        for (const [x, y] of [[a, b + 1], [a, b - 1], [a + 1, b], [a - 1, b], [a + 1, b - 1], [a - 1, b + 1],
            [b, b], [a, a], [a + 1, b + 1], [a + 2, b], [a, b + 2], [a - 1, b - 1], [a + 2, b + 1]]) {
            if (x >= 1 && y >= 1 && x <= 12 && y <= 12) pousser(leFait('mul', x, y));
        }
    } else if (f.op === 'div') {
        const t = f.b, q = f.m;
        for (const [tt, qq] of [[t, q + 1], [t, q - 1], [t + 1, q + 1], [t - 1, q - 1], [t + 1, q - 1], [t - 1, q + 1],
            [t, q + 2], [t + 2, q + 1], [t + 1, q + 2], [t, q + 3], [t + 1, q + 3]]) {
            if (tt >= 2 && qq >= 2) pousser(leFait('div', tt * qq, tt));
        }
    } else if (f.op === 'add' || f.op === 'sub') {
        const { a, b } = f;
        for (const [x, y] of [[a + 10, b], [a - 10, b], [a, b + 1], [a, b - 1], [a + 1, b], [a - 1, b], [a, b + 10]]) {
            // Une soustraction garde son grand nombre devant ; une addition
            // n'a que faire de l'ordre. La première version exigeait x > y
            // pour les deux : « 22 + 40 » n'avait alors AUCUN voisin, et le
            // portique arrivait avec une seule arche. Vu au premier essai.
            if (x > 0 && y > 0 && (f.op === 'add' || x > y)) pousser(leFait(f.op, x, y));
        }
    } else {
        const [m, d] = f.a;
        const k = f.b, max = f.op === 'dix' ? 3 : 2;
        for (const kk of [k - 1, k + 1]) if (kk >= 1 && kk <= max) pousser(leFait(f.op, [m, d], kk));
        // Le même décalage sur un nombre dix fois plus grand, ou plus petit.
        pousser(leFait(f.op, normal(m * 10, d), k));
        pousser(leFait(f.op, normal(m, d + 1), k));
        pousser(leFait(f.op, normal(m, d + 2), k));
    }
    // AUCUN LEURRE N'A LA VALEUR CHERCHÉE, ET DEUX LEURRES N'ONT JAMAIS LA
    // MÊME : « 2 × 3 » et « 3 × 2 » sur deux arches voisines, ce serait le
    // même calcul écrit deux fois. Un seul ensemble garde les deux règles —
    // la valeur cherchée y est dès le départ.
    const vus = new Set([f.valeur]);
    return rng.shuffle(voisins.filter((g) => !vus.has(g.valeur) && vus.add(g.valeur)));
}

/* ─────────────────────────────────────────────────────────────────────────
 * 4. LES PORTIQUES
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * COMBIEN DE VOIES AU PORTIQUE `i` ?
 *
 * « Progressif » est ce que Rémy a décrit : « ça peut être 2, puis 3 puis 4 ».
 * Un tiers de la course à deux voies — on entre dans le jeu, une chance sur
 * deux —, un tiers à trois, un tiers à quatre. Le calcul ne change pas ; ce qui
 * monte, c'est le nombre de mauvaises réponses à écarter.
 */
export function voiesDuPortique(reglage, i, total) {
    if (reglage === 2 || reglage === '2') return 2;
    if (reglage === 4 || reglage === '4') return 4;
    if (reglage === 'progressif') return 2 + Math.min(2, Math.floor((3 * i) / Math.max(1, total)));
    return 3;
}

/** Le centre de chaque voie, en fraction de la demi-largeur de la piste. */
export function centresDesVoies(n) {
    return Array.from({ length: n }, (_, i) => (((2 * i + 1) / n) - 1) * 0.99);
}

/** La voie où se trouve un kart, sur une piste à `n` voies. */
export function voieDe(x, n = 3) {
    const centres = centresDesVoies(n);
    let mieux = 0;
    for (let i = 1; i < n; i++) if (Math.abs(x - centres[i]) < Math.abs(x - centres[mieux])) mieux = i;
    return mieux;
}

/**
 * UN PORTIQUE, à partir d'un fait.
 *
 * `affiche` est ce qu'on écrit en haut, `choix` ce qu'on écrit sur les
 * panneaux — des textes dans les deux sens. `verites[i]` est l'égalité vraie de
 * chaque calcul proposé, pour la correction : « 6 × 9 = 54 » sous un portique
 * qui demandait 56.
 */
export function fabriquerUnPortique(f, sens, voies, rng, index = 0) {
    const calcul = sens === 'calcul';
    let leurres, juste, verites = null;
    if (calcul) {
        const autres = leurresDeCalcul(f, rng).slice(0, voies - 1);
        leurres = autres.map((g) => g.calcul);
        juste = f.calcul;
        verites = new Map([[f.calcul, f.egalite], ...autres.map((g) => [g.calcul, g.egalite])]);
    } else {
        leurres = leurresDeResultat(f, rng).slice(0, voies - 1);
        juste = f.resultat;
    }
    // Une famille qui n'a pas assez de voisins rend moins de voies qu'on n'en
    // demande : mieux vaut trois arches que quatre dont une vide.
    const choix = rng.shuffle([juste, ...leurres]);
    return {
        index, fait: f, sens: calcul ? 'calcul' : 'resultat',
        affiche: calcul ? f.resultat : f.calcul,
        question: calcul ? `${f.resultat} = ?` : `${f.calcul} = ?`,
        choix, voies: choix.length, juste, voieJuste: choix.indexOf(juste),
        verites: verites ? choix.map((t) => verites.get(t)) : null,
        egalite: f.egalite, barre: [],
        passe: false, reussi: false, donne: null
    };
}

/**
 * LES PORTIQUES D'UNE COURSE.
 *
 * `faits` sert à « Réviser mes erreurs » : la course ne tire plus, elle repasse
 * les calculs ratés — deux fois chacun. La seconde fois, une multiplication et
 * une addition sont retournées : savoir 7 × 8 n'est pas encore savoir 8 × 7.
 */
export function fabriquerPortiques({ familles = ['mul'], tables, sens = 'resultat', voies = 3 },
    combien, rng, faits = null) {
    const ops = familles.filter((o) => FAMILLES[o]);
    if (!ops.length) ops.push('mul');
    const liste = [];
    let dernier = '';
    for (let i = 0; i < combien; i++) {
        let f;
        if (faits && faits.length) {
            f = faits[i % faits.length];
            if (i >= faits.length && (f.op === 'mul' || f.op === 'add')) {
                const table = f.table, competence = f.competence;
                f = leFait(f.op, f.b, f.a);
                f.table = table; f.competence = competence;
            }
        } else {
            let essais = 0;
            do { f = tirerFait(rng.pick(ops), rng, tables); } while (f.calcul === dernier && ++essais < 12);
        }
        dernier = f.calcul;
        // « Mixte » alterne : un portique dans un sens, le suivant dans l'autre.
        const s = sens === 'mixte' ? (i % 2 === 0 ? 'resultat' : 'calcul') : sens;
        liste.push(fabriquerUnPortique(f, s, voiesDuPortique(voies, i, combien), rng, i));
    }
    return liste;
}
