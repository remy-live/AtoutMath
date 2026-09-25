// LES RACINES CARRÉES — HUIT BARREAUX, JUSQU'À √72 = 6√2.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo d'un cahier : « et ce genre de chose aussi ». La page montre
// deux choses, et ce sont les deux moitiés du chapitre :
//
//   √(a + b) < √a + √b          la racine n'est PAS additive
//
//   √72 = √(8 × 9) = √8 × √9 = 3√8 = 3√(4 × 2) = 3 × √4 × √2 = 3 × 2 × √2 = 6√2
//
// LE SECOND CALCUL MÉRITE QU'ON S'Y ARRÊTE, parce qu'il enseigne la méthode
// plus honnêtement qu'une réponse directe : l'élève n'a pas vu tout de suite
// que 72 = 36 × 2. Il a pris 8 × 9, sorti le 9, puis a recommencé sur le 8.
// C'est plus long et c'est JUSTE — et cela dit l'essentiel : on peut s'y
// prendre en plusieurs fois, il suffit de recommencer tant qu'il reste un
// carré dedans.
//
// LES HUIT BARREAUX, ET CE QU'ON AJOUTE À CHACUN :
//
//   1. √81                    connaître ses carrés
//   2. √4 × √25               √a × √b = √(ab), tout est carré parfait
//   3. √8 = 2√2               extraire UN carré, en un pas
//   4. √72 = 6√2              le plus grand carré, ou plusieurs pas  ← la photo
//   5. 3√2 × 5√6              produit, puis simplification
//   6. 2√8 + √18              somme : il faut simplifier AVANT
//   7. √(9 + 16)              le piège : la racine n'est pas additive ← la page
//   8. √50 ÷ √2, 6/√3         quotients, et le dénominateur qu'on rend entier
//
// ── L'ARITHMÉTIQUE EST EXACTE ───────────────────────────────────────────────
//
// Tout se calcule sous la forme (n/d)√r, avec r SANS facteur carré et n/d
// irréductible. C'est la seule façon de savoir que √50 ÷ √2 vaut exactement 5
// et non 4,999999999. Et c'est aussi ce qui permet de vérifier : le test
// recalcule chaque énoncé en nombres à virgule, par un autre chemin, et
// compare.

import { makeItem, finalizeChoices } from '../items.js';
import * as fx from '../maths/formule.js';
import { garnirEtapesNombres } from '../maths/etapesNombres.js';
import { lireExacte, memeR as memeExacte, sansCarre, radicandesEcrits }
    from '../maths/valeurExacte.js';

const M = '−';
const nb = (v) => (v < 0 ? M + Math.abs(v) : String(v));
const pgcd = (a, b) => (b ? pgcd(b, a % b) : Math.abs(a));

// ── LA FORME (n/d)√r ────────────────────────────────────────────────────────

/**
 * Construit (n/d)√r SOUS SA FORME RÉDUITE : les carrés de r sortent, la
 * fraction se simplifie.
 *
 * C'est ici qu'est toute la leçon du chapitre, et elle tient en une boucle :
 * on décompose r en facteurs premiers, chaque PAIRE sort un facteur, chaque
 * facteur seul reste dedans. √72 = √(2×2×2×3×3) : la paire de 2 sort un 2, la
 * paire de 3 sort un 3, le 2 restant demeure — 2 × 3 × √2 = 6√2.
 */
function rac(n, d, r) {
    if (d === 0 || r <= 0 || !Number.isInteger(r)) return null;
    let dehors = 1, dedans = 1, m = r;
    for (let p = 2; p * p <= m; p++) {
        let e = 0;
        while (m % p === 0) { m /= p; e++; }
        dehors *= Math.pow(p, Math.floor(e / 2));
        if (e % 2) dedans *= p;
    }
    if (m > 1) dedans *= m;
    n *= dehors;
    if (d < 0) { n = -n; d = -d; }
    const g = pgcd(Math.abs(n), d) || 1;
    return { n: n / g, d: d / g, r: dedans };
}

const entier = (v) => rac(v, 1, 1);
const racineDe = (v) => rac(1, 1, v);
const foisR = (a, b) => rac(a.n * b.n, a.d * b.d, a.r * b.r);
/** Somme : elle n'a de sens que si les deux radicandes sont les mêmes. */
const plusR = (a, b) => (a.r !== b.r ? null : rac(a.n * b.d + b.n * a.d, a.d * b.d, a.r));
const moinsR = (a, b) => (a.r !== b.r ? null : rac(a.n * b.d - b.n * a.d, a.d * b.d, a.r));
/**
 * Quotient — et c'est lui qui « rend le dénominateur entier ».
 *
 * (n₁/d₁)√r₁ ÷ (n₂/d₂)√r₂ : on multiplie en haut et en bas par √r₂, ce qui
 * fait sortir r₂ du dénominateur. C'est exactement le geste du cours.
 */
const surR = (a, b) => (b.n === 0 ? null
    : rac(a.n * b.d, a.d * b.n * b.r, a.r * b.r));

const valeur = (x) => (x.n / x.d) * Math.sqrt(x.r);
const memeR = (a, b) => !!a && !!b && a.n === b.n && a.d === b.d && a.r === b.r;

/**
 * (n/d)√r, EN ARBRE DE FORMULE — et c'est de là que tout est écrit ensuite.
 *
 * Rémy, capture à l'appui : « les racines carrées sont très moches ». Elles
 * l'étaient, et pour une raison qu'une mesure a révélée : la police Outfit ne
 * contient AUCUN glyphe √. Le signe affiché venait d'une police de secours
 * choisie par le système, posé à côté d'une barre CSS qu'il ne pouvait pas
 * rejoindre. Le module `maths/formule` le DESSINE ; voir son en-tête.
 *
 * MAIS LE GAIN N'EST PAS QUE TYPOGRAPHIQUE. Cette fonction rend un ARBRE, et
 * l'écran comme la fiche papier le lisent tous les deux. Ils ne peuvent donc
 * plus se contredire — ce qui était arrivé la veille, l'écran affichant
 * « 5√3 ÷ √3 » quand le papier disait « √75 ÷ √3 ». Les deux avaient la même
 * valeur ; c'est ce qui rendait l'écart invisible à tout contrôle numérique.
 */
function arbre(x) {
    const radical = fx.racine(fx.nombre(x.r));
    let dessus;
    if (x.r === 1) dessus = fx.nombre(Math.abs(x.n));
    else if (Math.abs(x.n) === 1) dessus = radical;
    else dessus = fx.produit([fx.nombre(Math.abs(x.n)), radical], 'implicite');
    if (x.n < 0) dessus = fx.oppose(dessus);
    return x.d === 1 ? dessus : fx.quotient(dessus, fx.nombre(x.d));
}

/** `6√2`, `5`, `−√3`, `2√5/3` — pour la fiche, la voix et les clefs de tri. */
const txt = (x) => fx.texte(arbre(x));
/** Le même, dessiné. */
const html = (x) => fx.html(arbre(x));
/** Un radical seul, écrit à la main : `rac('9 + 16')`. */
const racHtml = (dedans) => fx.formule(`√(${dedans})`);

/** La décomposition en facteurs premiers, en liste. */
function facteurs(n) {
    const f = [];
    let m = n;
    for (let p = 2; p * p <= m; p++) while (m % p === 0) { f.push(p); m /= p; }
    if (m > 1) f.push(m);
    return f;
}

/**
 * LE SUPPORT VISUEL : LES PAIRES QUI SORTENT.
 *
 * Rémy : « il faut toujours un support visuel ». Pour une racine, ce n'est ni
 * un dessin ni un axe — c'est la décomposition, montrée de façon que la règle
 * se voie : chaque PAIRE de facteurs identiques sort un facteur, ce qui reste
 * seul demeure sous la racine. C'est la méthode entière, en une ligne, et elle
 * explique du même coup pourquoi √72 peut se faire en plusieurs fois.
 */
function pairesHtml(n) {
    const f = facteurs(n);
    const paires = [], seuls = [];
    let i = 0;
    while (i < f.length) {
        if (f[i + 1] === f[i]) { paires.push(f[i]); i += 2; }
        else { seuls.push(f[i]); i += 1; }
    }
    const boites = paires.map(p =>
        `<span class="rc-paire">${p} × ${p}<b>→ ${p}</b></span>`).join('');
    const reste = seuls.length
        ? `<span class="rc-reste">${seuls.join(' × ')}<b>reste dedans</b></span>`
        : '<span class="rc-reste rc-reste--vide">rien ne reste<b>c\'est un carré parfait</b></span>';
    return `<div class="rc-paires">
        <div class="rc-decomp">${n} = ${f.join(' × ')}</div>
        <div class="rc-rangee">${boites}${reste}</div>
        <div class="rc-regle">chaque PAIRE sort un facteur</div>
    </div>`;
}

/**
 * LE DESSIN DE L'ÉNONCÉ : LA MATIÈRE, PAS LE RÉSULTAT.
 *
 * `pairesHtml` montre la méthode ALLANT JUSQU'AU BOUT — les paires encadrées,
 * les flèches, ce qui reste dedans. Posé dans l'énoncé, il donnait la réponse :
 * au barreau 3, « 12 = 2 × 2 × 3 » avec « 2 × 2 → 2 » et « 3 reste dedans »,
 * il ne restait plus rien à chercher, et le barreau ne mesurait plus rien.
 *
 * On suit donc ici la règle déjà tenue au chapitre de la factorisation, où le
 * dessin de l'énoncé montre les RÔLES (qui est a, qui est b) et non le résultat :
 * l'énoncé reçoit la décomposition brute — la matière première, celle que le
 * prérequis `num.arith.decomposition` a appris à fabriquer —, et l'indice reçoit
 * `pairesHtml`, qui montre quoi en faire. Ainsi le support visuel est toujours
 * là, comme Rémy le demande, sans que la question se réponde toute seule.
 */
function decompHtml(n, etiquette = '') {
    const f = facteurs(n);
    return `<div class="rc-matiere">
        ${etiquette ? `<span class="rc-etiq">${etiquette}</span>` : ''}
        <span class="rc-decomp">${n} = ${f.join(' × ')}</span>
    </div>`;
}

/**
 * LE DESSIN DU BARREAU 1 : LE CARRÉ LUI-MÊME.
 *
 * La décomposition ne convient pas ici, et la sonde l'a montré sans discuter :
 * pour un carré de nombre premier, elle EST la réponse — « 121 = 11 × 11 » sous
 * la question « √121 ». Six cent six questions sur trente mille étaient dans ce
 * cas.
 *
 * Ce qu'on montre à la place est la DÉFINITION : un carré d'aire c, dont on
 * demande le côté. Le nombre n'est écrit nulle part. Qu'on puisse le trouver en
 * comptant les cases n'est pas un défaut — c'est précisément ce qu'est une
 * racine carrée, et l'élève qui compte apprend la chose plutôt que de la
 * réciter.
 */
function carreHtml(c) {
    const cote = Math.round(Math.sqrt(c));
    const pas = Math.max(5, Math.round(126 / cote));
    const t = cote * pas;
    const lignes = [];
    for (let i = 1; i < cote; i++) {
        lignes.push(`<line x1="${i * pas}" y1="0" x2="${i * pas}" y2="${t}"/>`);
        lignes.push(`<line x1="0" y1="${i * pas}" x2="${t}" y2="${i * pas}"/>`);
    }
    return `<div class="rc-matiere rc-carre">
        <span class="rc-etiq">un carré d'aire ${c}</span>
        <svg viewBox="0 0 ${t} ${t}" width="${t}" height="${t}" role="img"
             aria-label="Un carré d'aire ${c}, quadrillé en cases de 1."
             class="rc-grille"><g class="rc-traits">${lignes.join('')}</g>
            <rect x="0" y="0" width="${t}" height="${t}" class="rc-bord"/></svg>
        <span class="rc-regle">combien de cases sur un côté ?</span>
    </div>`;
}

/** Deux décompositions côte à côte, quand l'énoncé porte deux racines. */
const deuxDecomp = (a, b) => `<div class="rc-matieres">${decompHtml(a)}${decompHtml(b)}</div>`;

/**
 * LE DESSIN DU BARREAU 7, où décomposer serait déjà répondre.
 *
 * Décomposer 25 dirait que 9 + 16 = 25 : toute la question du barreau. Ce qu'on
 * montre à la place est la seule chose qui soit de la STRUCTURE et non du
 * résultat — l'étendue de la barre. C'est aussi, exactement, ce que la page de
 * Rémy reproche à l'erreur : la barre couvre la somme entière.
 */
function sousLaBarreHtml(a, b) {
    return `<div class="rc-matiere rc-barre">
        <span class="rc-etiq">sous la barre</span>
        <span class="rc-decomp">${a} + ${b}</span>
        <span class="rc-regle">on calcule d'abord ce qui est dessous, ensuite la racine</span>
    </div>`;
}

// ── LES HUIT BARREAUX ───────────────────────────────────────────────────────

const CARRES = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225];

function barreau1(rng) {
    const c = CARRES[rng.int(0, CARRES.length - 1)];
    const r = Math.round(Math.sqrt(c));
    return {
        enonce: `√${c}`, valeur: entier(r),
        etapes: `${r} × ${r} = ${c}, donc √${c} = ${r}.`,
        visuel: pairesHtml(c), structure: carreHtml(c),
        leurres: [
            // « La racine, c'est la moitié » — la confusion la plus répandue. On
            // ne la propose QUE si la moitié tombe juste : `entier(9 / 2)` aurait
            // affiché « 9/2 », une fraction au milieu d'entiers, qui se repère
            // sans rien savoir des racines. Un leurre qui se devine à sa forme
            // n'est pas un leurre.
            ...(c % 2 === 0 ? [{ valeur: entier(c / 2),
                why: `Une racine carrée n'est pas une moitié : on cherche le nombre `
                    + `qui, MULTIPLIÉ PAR LUI-MÊME, donne ${c}.` }] : []),
            { valeur: entier(c), why: `${c} est le nombre écrit SOUS la racine : `
                + `il reste à en prendre la racine.` },
            { valeur: entier(r + 1), why: `${r + 1} × ${r + 1} = ${(r + 1) * (r + 1)}, `
                + `pas ${c}.` },
            { valeur: entier(r - 1), why: `${r - 1} × ${r - 1} = ${(r - 1) * (r - 1)}, `
                + `pas ${c}.` }
        ]
    };
}

function barreau2(rng) {
    // a ≠ b, et c'est la même raison qu'au barreau 8 : √49 × √49 vaut 49,
    // c'est-à-dire le nombre déjà écrit deux fois dans la question. L'élève
    // recopie sans rien calculer, et retient « racine fois racine, ça redonne
    // le nombre » — vrai ici, faux partout ailleurs.
    const dispo = CARRES.slice(0, 8);
    const a = dispo[rng.int(0, dispo.length - 1)];
    const restants = dispo.filter(c => c !== a);
    const b = restants[rng.int(0, restants.length - 1)];
    const ra = Math.round(Math.sqrt(a)), rb = Math.round(Math.sqrt(b));
    return {
        enonce: `√${a} × √${b}`, valeur: entier(ra * rb),
        etapes: `√${a} = ${ra} et √${b} = ${rb}, donc le produit vaut ${ra * rb}. `
            + `On peut aussi écrire √${a} × √${b} = √${a * b} = ${ra * rb}.`,
        visuel: pairesHtml(a * b), structure: deuxDecomp(a, b),
        lignes: [
            { titre: 'Chaque racine, calculée à part',
                montrer: `${ra} × ${rb}`, memesNombres: true,
                multiplication: true, racine: false,
                aide: `√${a} = ${ra} et √${b} = ${rb} : ce sont deux carrés parfaits.` }
        ],
        titreFinal: 'On multiplie',
        leurres: [
            { valeur: entier(ra + rb), why: `Les racines se MULTIPLIENT ici : `
                + `${ra} × ${rb}, pas ${ra} + ${rb}.` },
            { valeur: racineDe(a + b), why: `√a × √b = √(a × b), et non √(a + b). `
                + `La racine ne traverse pas une addition.` },
            { valeur: entier(a * b), why: `C'est le produit SOUS les racines : `
                + `il faut encore en prendre la racine.` }
        ]
    };
}

/** Extraire un carré, en un seul pas : √8, √12, √18, √20. */
function barreau3(rng) {
    const carre = [4, 9, 16, 25][rng.int(0, 3)];
    const libres = [2, 3, 5, 6, 7, 10, 11].filter(v => v * carre <= 250);
    const libre = libres[rng.int(0, libres.length - 1)];
    const n = carre * libre;
    const k = Math.round(Math.sqrt(carre));
    const v = racineDe(n);
    return {
        enonce: `√${n}`, valeur: v,
        etapes: `${n} = ${carre} × ${libre}, et ${carre} est un carré parfait. `
            + `Donc √${n} = √${carre} × √${libre} = ${k}√${libre}.`,
        visuel: pairesHtml(n), structure: decompHtml(n),
        // LA CHAÎNE — deux gestes, deux lignes. Rémy : « oui fais les ».
        lignes: [
            { titre: 'On écrit le carré qui se cache dedans',
                montrer: `√(${carre} × ${libre})`,
                carresDedans: true, memesNombres: true,
                parentheses: true, multiplication: true,
                aide: `${n} = ${carre} × ${libre}, et ${carre} est un carré parfait.` }
        ],
        titreFinal: 'On sort le carré',
        leurres: [
            { valeur: rac(carre, 1, libre), why: `√${carre} vaut ${k}, pas ${carre} : `
                + `c'est la RACINE du carré qui sort.` },
            { valeur: rac(k, 1, carre), why: `C'est ${libre} qui reste sous la racine, `
                + `pas ${carre} — le carré, lui, en sort.` },
            { valeur: entier(k * libre), why: `Le ${libre} reste SOUS la racine : `
                + `√${libre} n'est pas un entier.` }
        ]
    };
}

/**
 * √72 — le plus grand carré, ou plusieurs pas. La photo.
 *
 * On choisit des nombres dont la décomposition contient DEUX paires (ou une
 * paire d'un carré déjà composé), pour que la méthode « en plusieurs fois »
 * de la page ait un sens.
 */
/**
 * LES NOMBRES DU BARREAU 4, CALCULÉS UNE FOIS POUR TOUTES.
 *
 * LA CONDITION DIT EXACTEMENT CE QUE LA PHOTO ENSEIGNE : il faut AU MOINS DEUX
 * paires dans la décomposition — donc au moins deux facteurs qui sortent —,
 * sans quoi « s'y prendre en plusieurs fois » n'a aucun sens et l'exercice
 * retombe sur le barreau 3. Et il doit rester quelque chose dedans, sinon
 * c'est le barreau 1.
 *
 * ON NE TIRE PAS POUR RATTRAPER ENSUITE. La première écriture tirait trois
 * nombres au hasard et, si le produit dépassait 900, se rappelait elle-même
 * avec un faux tirage (`{ int: () => 0 }`) : tous les dépassements donnaient
 * alors LE MÊME nombre, 8 — c'est-à-dire la question du barreau 3, avec un
 * leurre « 2√2 » qui se trouvait être la bonne réponse. On construit donc la
 * liste des nombres valables, et on tire dedans. C'est la cinquième fois que
 * ce motif se présente dans ce projet ; c'est la dernière.
 */
const NOMBRES_B4 = (() => {
    const out = [];
    for (let n = 12; n <= 500; n++) {
        const v = racineDe(n);
        if (v.r === 1) continue;             // carré parfait : barreau 1
        if (facteurs(v.n).length < 2) continue;  // une seule paire : barreau 3
        out.push(n);
    }
    return out;
})();

function barreau4(rng) {
    const n = NOMBRES_B4[rng.int(0, NOMBRES_B4.length - 1)];
    const v = racineDe(n);
    const f = facteurs(n);
    return {
        enonce: `√${n}`, valeur: v,
        etapes: `${n} = ${f.join(' × ')}. Chaque paire sort un facteur : il reste `
            + `${v.r === 1 ? 'rien' : v.r} sous la racine, et ${v.n} devant. `
            + `On peut aussi y aller en plusieurs fois — sortir un carré, puis `
            + `recommencer sur ce qui reste : le résultat est le même.`,
        visuel: pairesHtml(n), structure: decompHtml(n),
        lignes: [
            { titre: 'Le plus grand carré qui divise le nombre',
                montrer: `√(${v.n * v.n} × ${v.r})`,
                carresDedans: true, memesNombres: true,
                parentheses: true, multiplication: true,
                aide: `${n} = ${f.join(' × ')} : les facteurs qui vont deux par deux `
                    + `forment le carré ${v.n * v.n}.` }
        ],
        titreFinal: 'On sort le carré',
        // L'ORDRE DE CETTE LISTE DÉCIDE DE LA DIFFICULTÉ, et ce n'est pas une
        // façon de parler : l'échelle d'aide commence une séance à DEUX
        // propositions pour mettre en confiance, et `reduireChoix` ne garde
        // alors que le premier leurre écrit ici.
        //
        // La forme inachevée est donc placée en TROISIÈME. Posée en tête, elle
        // faisait de la première question de la séance un choix entre 6√7 et
        // 2√63 — deux écritures du MÊME nombre, dont l'une est simplement moins
        // finie que l'autre. C'est la discrimination la plus fine du barreau,
        // offerte au moment où l'élève a le moins d'appuis. Elle n'apparaît
        // maintenant qu'à quatre propositions, c'est-à-dire une fois qu'il a
        // montré qu'il sait extraire.
        leurres: [
            { valeur: rac(v.n * v.r, 1, 1), why: `Le ${v.r} reste sous la racine : `
                + `√${v.r} n'est pas un entier, on ne peut pas le multiplier au ${v.n}.` },
            { valeur: rac(1, 1, v.n * v.r), why: `Le ${v.n} est SORTI de la racine : `
                + `il ne faut pas le remettre dedans.` },
            // LA FAUTE DE CETTE PAGE : s'arrêter en chemin. 3√8 est juste, mais
            // ce n'est pas fini — il reste un carré dans le 8. `aMoitie` rend
            // `null` si la forme à moitié simplifiée se trouve être la forme
            // finale : ce serait la bonne réponse, marquée fausse.
            ...(aMoitie(n) ? [{ valeur: rac(1, 1, n), texteForce: aMoitie(n),
                why: `C'est juste, mais ce n'est pas FINI : il reste un carré sous la `
                    + `racine. On recommence tant qu'il en reste un.`, memeValeur: true }] : []),
            { valeur: rac(v.n + 1, 1, v.r), why: `Une paire a été comptée en trop : `
                + `recompte les facteurs qui vont deux par deux.` }
        ]
    };
}

/**
 * L'écriture « à moitié simplifiée » — celle où l'on s'arrête trop tôt.
 *
 * Rend `null` quand il n'y a rien à moitié faire : ou bien le nombre n'a pas
 * de carré du tout, ou bien sortir une paire suffit à terminer — et l'écriture
 * obtenue est alors la BONNE RÉPONSE. La proposer comme leurre poserait deux
 * fois la même réponse, dont l'une marquée fausse.
 */
function aMoitie(n) {
    const f = facteurs(n);
    // On sort UNE seule paire, et l'on laisse le reste dedans.
    for (let i = 0; i + 1 < f.length; i++) {
        if (f[i] === f[i + 1]) {
            const reste = n / (f[i] * f[i]);
            const ecriture = `${f[i]}√${reste}`;
            return ecriture === txt(racineDe(n)) ? null : ecriture;
        }
    }
    return null;
}

function barreau5(rng) {
    const k1 = rng.int(2, 5), k2 = rng.int(2, 5);
    const r1 = [2, 3, 5, 6, 7][rng.int(0, 4)];
    const r2 = [2, 3, 5, 6, 10][rng.int(0, 4)];
    const a = rac(k1, 1, r1), b = rac(k2, 1, r2);
    const v = foisR(a, b);
    return {
        enonce: `${txt(a)} × ${txt(b)}`, valeur: v,
        etapes: `On multiplie les entiers entre eux et les racines entre elles : `
            + `${k1} × ${k2} = ${k1 * k2}, et √${r1} × √${r2} = √${r1 * r2}. `
            + `Puis on simplifie ce qui peut l'être.`,
        visuel: pairesHtml(r1 * r2), structure: deuxDecomp(r1, r2),
        lignes: [
            { titre: 'Les nombres ensemble, les racines ensemble',
                montrer: `(${k1} × ${k2}) × √(${r1} × ${r2})`,
                memesNombres: true, parentheses: true, multiplication: true,
                aide: 'Un produit se réarrange : on met les entiers d\'un côté et les '
                    + 'racines de l\'autre, sans rien calculer encore.' }
        ],
        titreFinal: 'On calcule, et l\'on simplifie ce qui peut l\'être',
        leurres: [
            { valeur: rac(k1 * k2, 1, r1 + r2), why: `Les radicandes se MULTIPLIENT : `
                + `√${r1} × √${r2} = √${r1 * r2}, pas √${r1 + r2}.` },
            { valeur: rac(k1 + k2, 1, r1 * r2), why: `Les entiers devant se multiplient `
                + `aussi : ${k1} × ${k2}, pas ${k1} + ${k2}.` },
            { valeur: rac(k1 * k2 * r1 * r2, 1, 1), why: `Le produit des radicandes reste `
                + `SOUS la racine tant qu'il n'est pas un carré parfait.` }
        ]
    };
}

function barreau6(rng) {
    // Deux termes qui, une fois simplifiés, ont le MÊME radicande — sinon la
    // somme ne se réduit pas, et le barreau n'enseignerait rien.
    const r = [2, 3, 5, 6, 7][rng.int(0, 4)];
    const c1 = [4, 9, 16][rng.int(0, 2)];
    // On tire dans la liste RESTANTE, pas dans ses deux premiers éléments :
    // `[4, 9, 25].filter(...)[rng.int(0, 1)]` laissait le 25 inaccessible dès
    // que c1 valait 16, sans que rien ne le signale.
    const restants = [4, 9, 25].filter(c => c !== c1);
    const c2 = restants[rng.int(0, restants.length - 1)];
    const k1 = rng.int(1, 3), k2 = rng.int(1, 3);
    const a = rac(k1, 1, c1 * r), b = rac(k2, 1, c2 * r);
    const moinsCi = rng.bool(0.35) && valeur(a) > valeur(b);
    const v = moinsCi ? moinsR(a, b) : plusR(a, b);
    return {
        enonce: `${k1 === 1 ? '' : k1}√${c1 * r} ${moinsCi ? M : '+'} `
            + `${k2 === 1 ? '' : k2}√${c2 * r}`,
        valeur: v,
        etapes: `On ne peut additionner que des racines SEMBLABLES. On simplifie donc `
            + `d'abord : ${k1 === 1 ? '' : k1}√${c1 * r} = ${txt(a)} et `
            + `${k2 === 1 ? '' : k2}√${c2 * r} = ${txt(b)}. Les deux portent √${r} : `
            + `on ${moinsCi ? 'retire' : 'ajoute'} alors les nombres devant.`,
        visuel: pairesHtml(c1 * r), structure: deuxDecomp(c1 * r, c2 * r),
        // LE BARREAU LE PLUS RICHE DU CHAPITRE, ET C'EST L'EXPRESSION QUE RÉMY
        // A ENVOYÉE EN PHOTO : 3√80 − 2√125. Trois gestes, trois lignes — et
        // l'élève qui échoue n'a presque jamais raté l'addition : il a raté la
        // simplification, deux lignes plus haut.
        lignes: [
            { titre: 'On simplifie chaque racine',
                montrer: `${k1 === 1 ? '' : `${k1} × `}${Math.round(Math.sqrt(c1))}√${r} `
                    + `${moinsCi ? M : '+'} ${k2 === 1 ? '' : `${k2} × `}`
                    + `${Math.round(Math.sqrt(c2))}√${r}`,
                carresSortis: true, memesNombres: true, multiplication: true,
                aide: `√${c1 * r} = ${Math.round(Math.sqrt(c1))}√${r} et `
                    + `√${c2 * r} = ${Math.round(Math.sqrt(c2))}√${r}.` },
            { titre: 'On multiplie les nombres de devant',
                montrer: `${txt(a)} ${moinsCi ? M : '+'} ${txt(b)}`,
                carresSortis: true,
                aide: 'Les deux portent maintenant la même racine : elles sont '
                    + 'SEMBLABLES, et c\'est ce qui autorise à les réunir.' }
        ],
        titreFinal: `On ${moinsCi ? 'retire' : 'ajoute'} les nombres de devant`,
        leurres: [
            { valeur: rac(1, 1, moinsCi ? c1 * r - c2 * r : c1 * r + c2 * r),
                why: `On n'additionne pas SOUS les racines : √a + √b n'est pas √(a + b). `
                    + `C'est même le contraire, √(a+b) est plus petit.` },
            { valeur: rac(k1 + k2, 1, c1 * r), why: `Les deux racines ne sont pas encore `
                + `semblables : il faut les simplifier avant d'ajouter les nombres devant.` },
            { valeur: foisR(a, b), why: `Le signe est un ${moinsCi ? 'moins' : 'plus'}, `
                + `pas un produit.` }
        ]
    };
}

/** LE PIÈGE DE LA PAGE : √(a + b) n'est pas √a + √b. */
function barreau7(rng) {
    // Deux carrés parfaits dont la SOMME est aussi un carré : l'élève peut
    // alors calculer les deux membres exactement, et voir qu'ils diffèrent.
    // LES DEUX TERMES SONT DES CARRÉS PARFAITS, TOUJOURS — ce sont les carrés
    // des côtés d'un triangle rectangle à côtés entiers. C'est ce qui garantit
    // que le leurre du piège (√a + √b, le nombre entier qu'on obtient en
    // distribuant la racine) existe à CHAQUE tirage. Un couple où le second
    // n'était pas un carré — [4, 21, 25] — faisait disparaître ce leurre sans
    // rien signaler : le barreau perdait alors précisément ce qu'il enseigne.
    const couples = [[9, 16, 25], [16, 9, 25], [36, 64, 100], [64, 36, 100],
        [25, 144, 169], [144, 25, 169], [81, 144, 225], [64, 225, 289]];
    const [a, b, s] = couples[rng.int(0, couples.length - 1)];
    const racS = Math.round(Math.sqrt(s));
    const ra = Math.round(Math.sqrt(a)), rb = Math.round(Math.sqrt(b));
    const faux = Number.isInteger(Math.sqrt(b)) ? ra + rb : null;
    return {
        enonce: `√(${a} + ${b})`, valeur: entier(racS),
        etapes: `On calcule D'ABORD ce qui est sous la racine : ${a} + ${b} = ${s}, `
            + `et √${s} = ${racS}.`
            + (faux ? ` Surtout pas √${a} + √${b} = ${ra} + ${rb} = ${faux} : `
                + `la racine ne traverse pas une addition, et ${racS} < ${faux}.` : ''),
        visuel: pairesHtml(s), structure: sousLaBarreHtml(a, b),
        lignes: [
            { titre: 'On calcule D\'ABORD ce qui est sous la barre',
                montrer: `√${s}`, avecRacine: true,
                aide: `La barre couvre TOUTE la somme : ${a} + ${b} = ${s}.` }
        ],
        titreFinal: 'Et l\'on prend la racine',
        leurres: [
            ...(faux ? [{ valeur: entier(faux),
                why: `C'est √${a} + √${b} = ${ra} + ${rb}. Mais √(a + b) n'est PAS `
                    + `√a + √b : la barre couvre toute la somme, il faut l'additionner `
                    + `avant. Et l'on a toujours √(a+b) < √a + √b.` }] : []),
            { valeur: entier(s), why: `${s} est ce qu'il y a SOUS la racine : il reste `
                + `à en prendre la racine.` },
            { valeur: entier(racS + 1), why: `${racS + 1} × ${racS + 1} = `
                + `${(racS + 1) * (racS + 1)}, pas ${s}.` },
            { valeur: racineDe(a * b), why: `La barre couvre une SOMME, pas un produit.` }
        ]
    };
}

function barreau8(rng) {
    if (rng.bool(0.5)) {
        // √(kc) ÷ √k : le quotient tombe juste.
        const k = [2, 3, 5, 7][rng.int(0, 3)];
        const c = CARRES[rng.int(0, 6)];
        const a = racineDe(k * c), b = racineDe(k);
        const v = surR(a, b);
        return {
            // `√${k * c}` ET NON `txt(a)` : `a` vaut `racineDe(75)`, que `rac`
            // rend DÉJÀ SIMPLIFIÉ sous la forme 5√3. L'énoncé aurait posé la
            // question à moitié résolue.
            //
            // Autrefois ce piège pouvait frapper l'écran SEUL — il l'a fait :
            // « 5√3 ÷ √3 » affiché pendant que la fiche disait « √75 ÷ √3 ».
            // Depuis qu'un énoncé est une chaîne unique lue deux fois, une
            // telle divergence n'est plus possible ; il reste à ne pas
            // simplifier la question elle-même, ce que cette ligne assure.
            enonce: `√${k * c} ÷ √${k}`, valeur: v,
            etapes: `√a ÷ √b = √(a ÷ b) : ici √${k * c} ÷ √${k} = √${c} = ${txt(v)}.`,
            visuel: pairesHtml(c), structure: deuxDecomp(k * c, k),
            lignes: [
                { titre: 'Deux racines qui se divisent n\'en font qu\'une',
                    montrer: `√(${k * c}/${k})`, avecRacine: true, memesNombres: true,
                    parentheses: true, fraction: true,
                    aide: '√a ÷ √b = √(a ÷ b) : la division passe SOUS la barre.' }
            ],
            titreFinal: 'On calcule sous la barre, puis on prend la racine',
            leurres: [
                { valeur: racineDe(k * c - k), why: `Les radicandes se DIVISENT, ils ne `
                    + `se retranchent pas : ${k * c} ÷ ${k} = ${c}.` },
                { valeur: racineDe(k * c * k), why: `C'est une division : on divise les `
                    + `radicandes, on ne les multiplie pas.` },
                { valeur: rac(1, 1, c * k), why: `Le √${k} du bas disparaît en simplifiant, `
                    + `il ne remonte pas en haut.` }
            ]
        };
    }
    // k / √r : on rend le dénominateur entier.
    const r = [2, 3, 5, 6, 7][rng.int(0, 4)];
    // k ≠ r : « 3 ÷ √3 » vaut √3, c'est-à-dire exactement ce qui est écrit au
    // dénominateur de la question. L'élève lit la réponse dans l'énoncé, et le
    // réflexe qu'il en retire — « recopier le bas » — est faux partout ailleurs.
    // On tire donc dans la liste des k valables plutôt que de corriger après
    // coup.
    const k = [2, 3, 4, 5, 6, 7, 8, 9].filter(v => v !== r)[rng.int(0, 6)];
    const a = entier(k), b = racineDe(r);
    const v = surR(a, b);
    return {
        // La barre de fraction, et non « ÷ » : c'est sous cette forme que la
        // question se pose au lycée, et c'est elle qui montre qu'il y a une
        // racine EN BAS — tout l'objet du barreau.
        enonce: `${k}/√${r}`, valeur: v,
        etapes: `On ne laisse pas de racine au dénominateur. On multiplie en haut ET en `
            + `bas par √${r} : le bas devient ${r}, et le haut ${k}√${r}. `
            + `Après simplification : ${txt(v)}.`,
        visuel: pairesHtml(r * r),
        lignes: [
            { titre: `On multiplie en haut ET en bas par √${r}`,
                montrer: `(${k} × √${r})/(√${r} × √${r})`,
                memesNombres: true, parentheses: true, multiplication: true, fraction: true,
                aide: 'Multiplier le haut et le bas par la même chose ne change pas '
                    + 'le quotient — et c\'est ce qui va faire disparaître la racine '
                    + 'du dénominateur.' }
        ],
        titreFinal: `En bas, √${r} × √${r} = ${r} : le dénominateur est entier`,
        // Le fait qui débloque tout le barreau, et qui n'est pas la réponse :
        // une racine multipliée par elle-même redonne son radicande.
        // LE RADICAL DE CETTE CARTE PASSE AUSSI PAR LE MODULE. Écrit « √ » à la
        // main, il tombait sur la police de secours — visiblement plus clair et
        // plus fin que celui de l'énoncé, juste au-dessus. Deux radicaux
        // différents dans la même fenêtre, c'est la faute dont Rémy est parti.
        structure: `<div class="rc-matiere rc-barre">`
            + `<span class="rc-etiq">le fait utile</span>`
            + `<span class="rc-decomp">${fx.formule(`√${r} × √${r}`)} = ${r}</span>`
            + `<span class="rc-regle">multiplier en haut ET en bas ne change pas le quotient</span></div>`,
        leurres: [
            { valeur: rac(k, r, 1), why: `√${r} × √${r} = ${r}, mais le haut a été `
                + `multiplié aussi : il devient ${k}√${r}.` },
            { valeur: rac(k, 1, r), why: `Le dénominateur ${r} n'a pas été gardé : `
                + `multiplier en haut et en bas laisse bien un ${r} en bas.` },
            { valeur: rac(k * r, 1, r), why: `Le haut est multiplié par √${r}, pas par `
                + `${r} : ${k} × √${r} = ${k}√${r}.` }
        ]
    };
}

const BARREAUX = {
    1: { faire: barreau1, nom: 'Les carrés parfaits' },
    2: { faire: barreau2, nom: '√a × √b' },
    3: { faire: barreau3, nom: 'Extraire un carré' },
    4: { faire: barreau4, nom: 'Le plus grand carré' },
    5: { faire: barreau5, nom: 'Produit de deux racines' },
    6: { faire: barreau6, nom: 'Somme de racines semblables' },
    7: { faire: barreau7, nom: 'La racine n\'est pas additive' },
    8: { faire: barreau8, nom: 'Quotients et dénominateur' }
};

// ── LE GÉNÉRATEUR ───────────────────────────────────────────────────────────

/**
 * Des leurres de secours, pour que le compte soit TOUJOURS de quatre.
 *
 * Même raison qu'au chapitre des fractions : deux fautes différentes tombent
 * parfois sur le même nombre, ou sur le bon ; on les écarte alors, et il n'en
 * reste plus assez. Une question à deux propositions n'est pas difficile, elle
 * est cassée. Ceux-ci ne visent aucune faute précise, et leur `why` le dit.
 */
function leurresDeSecours(v) {
    const out = [];
    const vus = new Set([txt(v)]);
    const pousser = (x, why) => {
        if (!x || vus.has(txt(x)) || x.n === 0) return;
        vus.add(txt(x));
        out.push({ valeur: x, why });
    };
    for (let k = 1; k <= 4; k++) {
        pousser(rac(v.n + k, v.d, v.r),
            `Il s'en faut de ${k} devant la racine : recompte les facteurs qui sortent.`);
        pousser(rac(v.n - k, v.d, v.r),
            `Il s'en faut de ${k} devant la racine : recompte les facteurs qui sortent.`);
    }
    [2, 3, 5, 6, 7, 10].forEach(r => pousser(rac(v.n, v.d, r),
        `Le nombre devant est juste, mais pas ce qui reste sous la racine.`));
    return out;
}

export const racinesGenerator = {
    id: 'nb.racines',
    label: 'Racines carrées : simplifier, multiplier, additionner',
    skills: ['nb.racines.simplifier', 'nb.racines.calculer'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        {
            id: 'barreau', type: 'select', label: 'Quel barreau', default: '1',
            aide: 'Un barreau ajoute UNE chose au précédent. La progression se fait '
                + 'en posant plusieurs de ces exercices à la suite dans une séance.',
            options: [
                { value: '1', label: '1 — √81' },
                { value: '2', label: '2 — √4 × √25' },
                { value: '3', label: '3 — √8 = 2√2' },
                { value: '4', label: '4 — √72 = 6√2' },
                { value: '5', label: '5 — 3√2 × 5√6' },
                { value: '6', label: '6 — 2√8 + √18' },
                { value: '7', label: '7 — √(9 + 16), le piège' },
                { value: '8', label: '8 — quotients et dénominateur' },
                { value: 'revision', label: 'Révision — les barreaux 1 à 4' },
                { value: 'toutes', label: 'Tout mélangé' }
            ]
        },
        {
            id: 'etapes', type: 'select', label: 'Pas à pas', default: 'non',
            // PAS SUR LA FICHE PAPIER : le découpage est une affaire d'écran.
            // Sur une feuille, la question et son corrigé sont les mêmes avec
            // ou sans lignes intermédiaires, et un bouton qui ne change rien à
            // la feuille est pire qu'un bouton absent — voir
            // `ficheReglages.test.mjs`.
            papier: false,
            aide: 'La question s\'écrit ligne à ligne : on montre le carré, on le sort, '
                + 'puis on calcule. Seule la dernière ligne est notée.',
            options: [
                { value: 'non', label: 'Non — la réponse d\'un coup' },
                { value: 'oui', label: 'Oui — une ligne à la fois' }
            ]
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const choix = String(params.barreau || '1');
        const possibles = choix === 'toutes' ? [1, 2, 3, 4, 5, 6, 7, 8]
            : (choix === 'revision' ? [1, 2, 3, 4] : [Number(choix) || 1]);
        // UN BARREAU INCONNU NE DOIT PAS FAIRE TOMBER LE GÉNÉRATEUR.
        //
        // `Number('9') || 1` vaut 9, et il n'y a pas de neuvième barreau :
        // `BARREAUX[9].faire` levait alors une erreur, c'est-à-dire un
        // exercice qui ne s'ouvre pas du tout. Aucun chemin de l'application ne
        // produit cette valeur aujourd'hui — les réglages viennent d'une liste
        // fermée — mais un parcours enregistré l'an dernier, ou un barreau
        // retiré du catalogue, suffirait. On retombe sur le premier barreau, ce
        // qui donne une question juste au lieu d'un écran vide.
        const tire = possibles[rng.int(0, possibles.length - 1)];
        const rang = BARREAUX[tire] ? tire : 1;
        const pasAPas = String(params.etapes || 'non') === 'oui';
        const q = BARREAUX[rang].faire(rng);
        // LES LIGNES DE LA CHAÎNE, s'il y en a. Les barreaux 1 et 2 n'en ont
        // pas : leur réponse s'écrit d'un trait, et découper « √49 » en deux
        // lignes ferait passer pour compliqué ce qui ne l'est pas.
        const lignes = q.lignes || [];

        // UN ÉNONCÉ, DEUX LECTURES — et c'est tout l'intérêt du module.
        //
        // Chaque barreau ne déclare plus qu'une CHAÎNE de formule. L'écran et
        // la fiche papier en sont deux rendus du même arbre : ils ne peuvent
        // plus dire deux choses différentes. Auparavant chaque barreau écrivait
        // son `html` et son `texte` à la main, côte à côte — et le barreau 8 a
        // fini par les faire diverger sans que rien ne le signale, les deux
        // écritures ayant la même valeur.
        q.html = fx.formule(q.enonce);
        q.texte = fx.formuleTexte(q.enonce);

        // ON DÉDOUBLONNE SUR L'ÉCRITURE, et la bonne réponse est dans
        // l'ensemble de départ : un leurre qui s'écrirait comme elle serait une
        // SECONDE bonne réponse, marquée fausse.
        const faux = [];
        const dejaVu = new Set([txt(q.valeur)]);
        for (const l of [...q.leurres, ...leurresDeSecours(q.valeur)]) {
            if (faux.length >= 3) break;
            const etiquette = l.texteForce || (l.valeur && txt(l.valeur));
            if (!etiquette || dejaVu.has(etiquette)) continue;
            dejaVu.add(etiquette);
            faux.push({ ...l, etiquette });
        }

        // CHAQUE PROPOSITION PORTE SON TEXTE, ET CE N'EST PAS UN CONFORT.
        //
        // MESURÉ : la fiche papier de ce chapitre imprimait
        // « faux0 · ok · faux1 · faux2 » à la place des quatre propositions.
        // `js/ui/printQuestions.js` écrit le champ `texte` s'il existe ; sinon
        // le libellé, mais SEULEMENT s'il ne contient pas de balise — et le
        // nôtre en contient toujours, puisqu'une racine est dessinée. Restait
        // la `value`, qui est une clef interne. La feuille était inutilisable,
        // et rien à l'écran ne le laissait voir.
        //
        // Le texte vient du même arbre que le libellé : il dit donc forcément
        // la même chose.
        const brutes = [
            { value: 'ok', label: html(q.valeur), texte: txt(q.valeur), correct: true },
            ...faux.map((l, i) => ({
                value: 'faux' + i,
                label: l.texteForce ? fx.formule(l.texteForce) : html(l.valeur),
                texte: l.texteForce ? fx.formuleTexte(l.texteForce) : txt(l.valeur),
                correct: false, why: l.why
            }))
        ];
        // ON PASSE PAR `finalizeChoices`, COMME TOUS LES AUTRES QCM DE L'APPLI.
        //
        // Ces trois chapitres de Seconde mélangeaient leurs propositions à la
        // main. Le mélange était juste — mais `finalizeChoices` ne fait pas que
        // mélanger : il NOTE AU PASSAGE le rang d'origine de chaque leurre,
        // et c'est ce rang que `reduireChoix` lit pour décider lequel survit
        // quand l'échelle d'aide ouvre une séance à deux propositions.
        //
        // Faute de l'appeler, `rang` restait indéfini ; `reduireChoix` retombe
        // alors sur `?? 99` pour tous, le tri devient neutre, et le leurre
        // conservé est simplement le premier du mélange — c'est-à-dire un
        // leurre au hasard. Le principe « le distracteur le plus instructif est
        // celui qui reste quand il n'en reste qu'un » ne s'appliquait donc à
        // AUCUN des trois chapitres, sans que rien ne le signale : le QCM était
        // bien formé, les quatre propositions étaient là, seul l'ordre mentait.
        //
        // Trouvé en cherchant pourquoi le leurre inachevé du barreau 6 tombait
        // encore en première question après avoir été rangé en fin de liste.
        const choices = finalizeChoices(rng, brutes, { count: 4 });

        return makeItem({
            seed: rng.seed,
            generatorId: 'nb.racines',
            skillId: rang <= 4 ? 'nb.racines.simplifier' : 'nb.racines.calculer',
            answerKind: 'choice',
            prompt: {
                text: `Simplifie : ${q.texte}`,
                html: '<div class="game-question rc-consigne">Écris cette expression sous '
                    + 'sa forme la plus simple.</div>'
                    + `<div class="rc-expression">${q.html}</div>` + q.structure,
                papier: `Simplifier : ${q.texte}`
            },
            answer: 'ok',
            // CE QUI S'ÉCRIT, SE TAPE ET S'IMPRIME — voir factorisation.js :
            // `answer` est une sentinelle de QCM, et le clavier a besoin de
            // l'expression, pas de la valeur.
            reponsePapier: txt(q.valeur),
            choices,
            /**
             * JUGER UNE RÉPONSE TAPÉE.
             *
             * On compare des VALEURS EXACTES, jamais des flottants : √2 × √2
             * vaut 2, et le calcul en virgule flottante rend
             * 2.0000000000000004. Un juge à epsilon près marche presque
             * toujours, et « presque » est le pire des états — la question qui
             * échoue est rare, donc invisible, et elle compte faux une réponse
             * juste.
             *
             * ET L'ÉGALITÉ NE SUFFIT PAS : √20 vaut 2√5 mais n'est pas la
             * forme demandée — la consigne dit « sous sa forme la plus
             * simple ». On exige donc qu'il ne reste aucun carré sous une
             * racine, ni aucune racine au dénominateur. C'est la leçon du
             * chapitre, et c'est ce que `rac` fait en interne.
             */
            verifieTexte: (saisie) => {
                const lu = lireExacte(saisie, fx);
                if (!lu) {
                    return { juste: false,
                        pourquoi: 'Je n\'arrive pas à lire cette expression. '
                            + 'Écris-la avec les touches, par exemple 6√2.' };
                }
                if (!memeExacte(lu, q.valeur)) return { juste: false };
                let arbre = null;
                try { arbre = fx.analyser(String(saisie).replace(/\s+/g, '')); }
                catch (e) { arbre = null; }
                const rads = arbre ? radicandesEcrits(arbre) : [];
                if (rads.some(r => r === null || !sansCarre(r))) {
                    return { juste: false, inacheve: true,
                        pourquoi: 'C\'est bien égal, mais ce n\'est pas fini : il reste '
                            + 'un carré sous une racine. On le sort, et on recommence '
                            + 'tant qu\'il en reste un.' };
                }
                return { juste: true };
            },
            hints: [
                rang <= 4
                    ? 'Décompose le nombre sous la racine. Chaque PAIRE de facteurs '
                        + 'identiques sort un facteur ; ce qui reste seul demeure dedans.'
                    : 'Simplifie chaque racine d\'abord. Ensuite seulement, occupe-toi de '
                        + 'l\'opération.',
                q.etapes
            ],
            schemas: ['', q.visuel],
            explanation: `${q.texte} = ${txt(q.valeur)}. ${q.etapes}`,
            difficulty: Math.min(5, 1 + Math.floor(rang / 2)),
            meta: {
                barreau: rang,
                nomDuBarreau: BARREAUX[rang].nom,
                // LE CLAVIER DE CE CHAPITRE : une racine, pas de lettre, pas
                // de carré. Une touche offerte est une touche qu'on croit
                // utile — « √5² » est précisément la faute qu'on éviterait de
                // rendre tapable.
                composable: 'litteral',
                lettre: null,
                carre: false,
                racine: true,
                multiplication: lignes.some(l => l.multiplication),
                parentheses: lignes.some(l => l.parentheses),
                fraction: q.valeur.d !== 1 || lignes.some(l => l.fraction),
                // « PAS À PAS » SUR UN BARREAU QUI N'A QU'UN GESTE : on écrit
                // quand même, sans chaîne. Le barreau 1 — √144 = 12 — ne se
                // découpe pas, et lui inventer une ligne intermédiaire ferait
                // passer pour compliqué ce qui ne l'est pas. Mais retomber sur
                // un QCM au milieu d'un exercice qui s'appelle « pas à pas »
                // serait pire : l'élève croirait avoir changé d'exercice.
                ...(pasAPas
                    ? { saisieSeule: true,
                        ...(lignes.length ? { etapes: garnirEtapesNombres(lignes),
                            titreFinal: q.titreFinal
                                || 'La réponse, sous sa forme la plus simple' } : {}) }
                    : {})
            }
        });
    }
};

export const POUR_ESSAI = {
    BARREAUX, rac, entier, racineDe, foisR, plusR, surR, txt, valeur, facteurs, memeR
};
