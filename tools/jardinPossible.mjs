// QUEL JARDIN LE VOCABULAIRE PERMET-IL AUJOURD'HUI ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'adore le jeu rows garden qui était souvent sur world of puzzles,
// on pourrait le faire en français avec des mots de math ».
//
// LE ROWS GARDEN est un champ d'hexagones. Chaque RANGÉE se lit de gauche à
// droite et porte DEUX réponses, sans qu'on dise où l'une finit et l'autre
// commence. Chaque FLEUR — six hexagones autour d'un centre — porte un mot de
// six lettres, sans qu'on dise par où il commence. Et les définitions sont
// rangées par COULEUR, pas par position : il faut aussi trouver où chacune va.
//
// C'est un jeu magnifique, et il est VORACE EN VOCABULAIRE. Dans sa forme
// d'origine, les fleurs PAVENT le champ : chaque case appartient à une fleur
// ET à une rangée, donc chaque lettre est contrainte deux fois. Cet outil
// mesure ce que cette voracité coûte, avec le stock de mots que le dépôt
// possède au moment où on le lance.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QU'IL A RÉPONDU LE 5 OCTOBRE 2026, et pourquoi le jeu n'a pas été livré.
//
//   · le dépôt porte 237 mots en tout — le lexique des mots cachés (maths) plus
//     celui de la pyramide (français courant) —, soit 30 à 40 par longueur ;
//   · un lexique ARTIFICIEL dit que la forme d'origine demande environ DEUX
//     CENTS mots par longueur pour se remplir à coup sûr. À soixante, c'est une
//     fois sur dix ; à vingt, jamais ;
//   · et la preuve, pas l'estimation : sur le plus petit jardin pavé possible
//     — quatre fleurs, vingt-huit cases —, la recherche EXHAUSTIVE trouve ZÉRO
//     remplissage. Ce n'est pas « difficile », c'est « ça n'existe pas » ;
//   · en SEMANT les fleurs sur le champ au lieu de l'en paver — la plupart des
//     cases ne sont alors contraintes que par leur rangée —, le plafond est de
//     DEUX fleurs. Trois ne se remplissent jamais, même en laissant tourner la
//     recherche quinze à vingt-huit secondes.
//
// DEUX FLEURS NE FONT PAS UN ROWS GARDEN : les définitions rangées par couleur
// n'ont plus de sens quand il n'y a qu'une fleur par couleur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE DÉPÔT AVAIT DÉJÀ RENCONTRÉ CE MUR, ET IL EN PORTE LA LEÇON.
//
// `js/data/motsPyramide.js`, en tête : « Le but était tout de même d'avoir à la
// fin des mots mathématiques. » On avait conclu l'inverse — la contrainte est
// terrible […] et le lexique des mathématiques est bien trop petit pour la
// porter d'un bout à l'autre. Ce n'est pas vrai pour son SOMMET. » Le chemin
// est en français courant, l'arrivée est en maths. Pour un jardin, le même
// remède demanderait quelques centaines de mots français DE PLUS, chacun avec
// sa définition — c'est du contenu, et c'est le métier de Rémy.
//
// ON GARDE DONC CET OUTIL PLUTÔT QU'UN JEU BANCAL : le jour où le lexique
// grandit, une ligne de commande redit où en est le plafond.
//
//     node tools/jardinPossible.mjs [--long]
//
// `--long` ajoute la recherche à gros budget qui a établi que trois fleurs ne
// se remplissent pas (compter une à deux minutes).

import { LEXIQUE } from '../js/core/motsCaches.js';
import { LEXIQUE_PYRAMIDE } from '../js/data/motsPyramide.js';
import { MOTS_COURANTS } from '../js/data/motsCourants.js';
import { makeRng } from '../js/core/ids.js';

const LONG = process.argv.includes('--long');

// --- Le stock de mots --------------------------------------------------------

const MOTS = [...new Set([
    ...LEXIQUE.map(e => e.mot),
    ...LEXIQUE_PYRAMIDE.map(x => (typeof x === 'string' ? x : x.mot)),
    ...MOTS_COURANTS.map(e => e.mot)
].map(m => String(m).toUpperCase()).filter(m => /^[A-Z]{3,}$/.test(m)))];
const LEX = {};
MOTS.forEach(m => (LEX[m.length] ||= []).push(m));
const SIX = new Set(LEX[6] || []);

// --- La géométrie ------------------------------------------------------------
//
// Repère axial « pointy-top » : une RANGÉE est `r` constant. Les six voisins
// sont (+1,0) (+1,−1) (0,−1) (−1,0) (−1,+1) (0,+1), et l'ordre ci-dessous est
// HORAIRE — c'est celui dans lequel se lit une fleur.
const HORAIRE = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];

// Les centres d'un pavage par sept forment un sous-réseau engendré par (1,2) et
// (3,−1). Vérification : une case est centre si (q + 3r) ≡ 0 [7], et les sept
// décalages de voisinage donnent les sept restes — donc les fleurs pavent sans
// trou ni recouvrement.
const centreDuPavage = (a, b) => [a + 3 * b, 2 * a - b];

/** Un jardin PAVÉ : l'union de fleurs dont les centres forment un paquet. */
function jardinPave(centres) {
    const cases = new Map();
    const fleurs = centres.map(([q, r], i) => {
        cases.set(`${q},${r}`, { q, r, L: r, role: 'centre' });
        const petales = HORAIRE.map(([dq, dr]) => {
            const cle = `${q + dq},${r + dr}`;
            cases.set(cle, { q: q + dq, r: r + dr, L: r + dr, role: 'petale' });
            return cle;
        });
        return { i, centre: `${q},${r}`, petales };
    });
    return { cases, fleurs, rangees: rangeesDe(cases) };
}

/** Un CHAMP de rangées données, sur lequel on sèmera des fleurs. */
function champ(longueurs) {
    const cases = new Map();
    longueurs.forEach((n, L) => {
        for (let C = 0; C < n; C++) {
            const q = C - Math.floor(L / 2);
            cases.set(`${q},${L}`, { q, r: L, L, C });
        }
    });
    return { cases, rangees: rangeesDe(cases) };
}

/** Les rangées : `r` constant, triées par `q`. En dessous de 4 cases, une
 *  rangée ne porte pas de réponse — il n'existe pas de mot de deux lettres. */
function rangeesDe(cases) {
    const parR = new Map();
    for (const [cle, c] of cases) {
        if (!parR.has(c.r)) parR.set(c.r, []);
        parR.get(c.r).push({ cle, ...c });
    }
    return [...parR.entries()].sort((a, b) => a[0] - b[0])
        .map(([r, l]) => ({ r, cles: l.sort((a, b) => a.q - b.q).map(x => x.cle) }))
        .filter(x => x.cles.length >= 4);
}

/** Les emplacements de fleur d'un champ : une case dont les six voisines sont là. */
function emplacements(ch) {
    const out = [];
    for (const [cle, c] of ch.cases) {
        const petales = HORAIRE.map(([dq, dr]) => `${c.q + dq},${c.r + dr}`);
        if (petales.every(p => ch.cases.has(p))) out.push({ centre: cle, petales });
    }
    return out;
}

// --- Le remplissage ----------------------------------------------------------

const colle = (mot, motif) => {
    for (let i = 0; i < mot.length; i++) if (motif[i] !== null && motif[i] !== mot[i]) return false;
    return true;
};

/** Les découpes d'une rangée de n cases en une ou deux réponses d'au moins 3. */
function decoupes(n) {
    const out = [];
    if (LEX[n]) out.push([n]);
    for (let a = 3; a <= n - 3; a++) if (LEX[a] && LEX[n - a]) out.push([a, n - a]);
    return out;
}

/** Cette rangée peut-elle encore se lire, les lettres connues étant ce qu'elles sont ? */
const rangeePossible = (motif, dec) => dec.some(d => {
    let i = 0;
    for (const L of d) {
        if (!LEX[L].some(m => colle(m, motif.slice(i, i + L)))) return false;
        i += L;
    }
    return true;
});

/**
 * REMPLIR : LES FLEURS D'ABORD, LES RANGÉES ENSUITE.
 *
 * L'ordre inverse a été mesuré et il est mauvais : en posant les rangées
 * d'abord et en ne regardant la fleur qu'une fois ses trois rangées écrites,
 * UNE SEULE fleur sur un champ de 22 cases ne réussissait que 2 fois sur 15.
 * La fleur est la contrainte forte — six lettres à prendre dans quarante mots —
 * et on ne la découvrait qu'après avoir tout joué. Posée d'abord, elle fixe six
 * lettres et les rangées se rangent autour : 14 fois sur 15.
 */
function remplir(cadre, fleurs, rng, budget) {
    const lettres = new Map();
    let pas = 0;
    const DEC = {};
    cadre.rangees.forEach(rg => { DEC[rg.cles.length] ||= decoupes(rg.cles.length); });

    const poserRangee = (i) => {
        if (i === cadre.rangees.length) return new Map(lettres);
        const rg = cadre.rangees[i];
        for (const d of rng.shuffle([...DEC[rg.cles.length]])) {
            const essaye = (part, pos) => {
                if (++pas > budget) return null;
                if (part === d.length) return poserRangee(i + 1);
                const L = d[part];
                const bout = rg.cles.slice(pos, pos + L).map(c => lettres.get(c) || null);
                for (const mot of rng.shuffle([...LEX[L]])) {
                    if (!colle(mot, bout)) continue;
                    const poses = [];
                    for (let k = 0; k < L; k++) {
                        const cle = rg.cles[pos + k];
                        if (!lettres.has(cle)) { lettres.set(cle, mot[k]); poses.push(cle); }
                    }
                    const r = essaye(part + 1, pos + L);
                    if (r) return r;
                    poses.forEach(c => lettres.delete(c));
                    if (pas > budget) return null;
                }
                return null;
            };
            const r = essaye(0, 0);
            if (r) return r;
            if (pas > budget) return null;
        }
        return null;
    };

    const poserFleur = (k) => {
        if (k === fleurs.length) return poserRangee(0);
        for (const mot of rng.shuffle([...LEX[6]])) {
            for (let rot = 0; rot < 6; rot++) {
                if (++pas > budget) return null;
                const poses = [];
                let ok = true;
                for (let j = 0; j < 6; j++) {
                    const cle = fleurs[k].petales[(j + rot) % 6];
                    const dedans = lettres.get(cle);
                    if (dedans && dedans !== mot[j]) { ok = false; break; }
                    if (!dedans) { lettres.set(cle, mot[j]); poses.push(cle); }
                }
                if (ok) { const r = poserFleur(k + 1); if (r) return r; }
                poses.forEach(c => lettres.delete(c));
            }
        }
        return null;
    };
    return poserFleur(0);
}

/**
 * LE JARDIN PAVÉ : EN EXISTE-T-IL UN SEUL REMPLISSAGE ?
 *
 * Bornée des DEUX CÔTÉS, et il a fallu l'apprendre : écrite pour un lexique de
 * deux cents mots, cette recherche répondait en quarante millisecondes. Avec
 * huit cents mots elle ne rendait plus la main du tout — cent cinquante mots de
 * six lettres font neuf cents poses par fleur, et l'arbre explose.
 *
 * On s'arrête donc au PREMIER remplissage trouvé (la question est « en
 * existe-t-il », pas « combien »), et au bout d'un budget de pas si l'on n'en
 * trouve aucun. Une réponse bornée dit alors « aucun en N essais », ce qui est
 * plus faible que « aucun n'existe » — et le verdict le dit.
 */
function exhaustifPave(centres, budget = 400000) {
    const j = jardinPave(centres);
    const DEC = {};
    j.rangees.forEach(rg => { DEC[rg.cles.length] ||= decoupes(rg.cles.length); });
    const lettres = new Map();
    const touchees = j.fleurs.map(f => j.rangees.filter(rg => rg.cles.some(c => f.petales.includes(c))));
    let trouves = 0, essais = 0;
    const poser = (i) => {
        if (i === j.fleurs.length) { trouves++; return true; }
        for (const mot of LEX[6]) {
            for (let rot = 0; rot < 6; rot++) {
                if (++essais > budget) return true;
                for (let k = 0; k < 6; k++) lettres.set(j.fleurs[i].petales[(k + rot) % 6], mot[k]);
                const ok = touchees[i].every(rg =>
                    rangeePossible(rg.cles.map(c => lettres.get(c) || null), DEC[rg.cles.length]));
                let fini = false;
                if (ok) fini = poser(i + 1);
                j.fleurs[i].petales.forEach(c => lettres.delete(c));
                if (fini) return true;
            }
        }
        return false;
    };
    poser(0);
    return { trouves, essais, epuise: essais <= budget,
        cases: j.cases.size, fleurs: j.fleurs.length, rangees: j.rangees };
}

/** Le champ semé : combien de fleurs tiennent, et à quel prix ? */
function semer(longueurs, nbFleurs, graine, mains, budget) {
    const ch = champ(longueurs);
    const possibles = emplacements(ch);
    const rng = makeRng(graine);
    // UNE POSE GLOUTONNE RATE PARFOIS SANS QUE LA PLACE MANQUE : elle sème la
    // première fleur au milieu et les suivantes n'ont plus de coin libre. La
    // première version abandonnait au premier échec en annonçant « pas assez de
    // place » — ce qui est FAUX et aurait égaré le prochain lecteur. On retente.
    let posePossible = false;
    for (let m = 0; m < mains; m++) {
        const choisies = [];
        for (const f of rng.shuffle([...possibles])) {
            if (choisies.length >= nbFleurs) break;
            const occupe = new Set(choisies.flatMap(x => [x.centre, ...x.petales]));
            if ([f.centre, ...f.petales].some(c => occupe.has(c))) continue;
            choisies.push(f);
        }
        if (choisies.length < nbFleurs) continue;
        posePossible = true;
        if (remplir(ch, choisies, rng, budget)) return { place: true, rempli: true, mains: m + 1 };
    }
    return { place: posePossible, rempli: false };
}

// --- Le verdict --------------------------------------------------------------

const titre = (t) => console.log(`\n\x1b[1m${t}\x1b[0m\n${'─'.repeat(t.length)}`);

console.log('\x1b[1mQUEL JARDIN LE VOCABULAIRE PERMET-IL AUJOURD\'HUI ?\x1b[0m');

titre('Le stock de mots du dépôt');
console.log(`  ${MOTS.length} mots distincts (mots cachés + pyramide + mots du chemin)`);
for (let L = 3; L <= 11; L++) {
    if (!LEX[L]) continue;
    console.log(`   ${String(L).padStart(2)} lettres : ${String(LEX[L].length).padStart(4)}`);
}
console.log(`\n  Il en faut environ 200 par longueur pour un jardin PAVÉ `
    + `(mesuré sur lexique artificiel : 200 → 10/10, 60 → 1/10, 20 → 0/10).`);

titre('Le jardin d\'origine, où les fleurs PAVENT le champ');
for (const [nom, centres] of Object.entries({
    '3 fleurs': [[0, 0], centreDuPavage(1, 0), centreDuPavage(2, 0)],
    '4 fleurs': [[0, 0], centreDuPavage(1, 0), centreDuPavage(0, 1), centreDuPavage(1, 1)]
})) {
    const t = Date.now();
    const r = exhaustifPave(centres);
    const longs = r.rangees.map(x => x.cles.length).join(' ');
    const verdict = r.trouves
        ? '\x1b[32mil en existe au moins un\x1b[0m'
        : (r.epuise ? '\x1b[31mAUCUN remplissage n\'existe\x1b[0m'
            : '\x1b[33maucun trouvé dans le budget\x1b[0m');
    console.log(`  ${nom}, ${r.cases} cases, rangées ${longs || '(aucune ≥ 4)'} — `
        + `${verdict}  (${r.essais} essais${r.epuise ? ', arbre épuisé' : ''}, ${Date.now() - t} ms)`);
}

titre('Le champ SEMÉ de fleurs — où le plafond se trouve');
const BUDGET = LONG ? 3000000 : 400000;
const MAINS = LONG ? 6 : 20;
for (const longueurs of [[7, 8, 9, 8, 7], [7, 8, 9, 10, 9, 8, 7]]) {
    const cases = longueurs.reduce((a, b) => a + b, 0);
    for (let n = 1; n <= (LONG ? 4 : 3); n++) {
        let ok = 0; const temps = [];
        const essais = LONG ? 4 : 8;
        for (let i = 0; i < essais; i++) {
            const t = Date.now();
            const r = semer(longueurs, n, `jp-${longueurs.join('')}-${n}-${i}`, MAINS, BUDGET);
            temps.push(Date.now() - t);
            if (r.rempli) ok++;
            if (!r.place) { ok = -1; break; }
            if (ok === 0 && i >= 2) break;   // trois échecs de suite suffisent
        }
        temps.sort((a, b) => a - b);
        const med = temps[temps.length >> 1];
        console.log(`  rangées ${JSON.stringify(longueurs).padEnd(22)} ${n} fleur(s), ${cases} cases → `
            + (ok < 0 ? 'pas assez de place pour les poser'
                : `${ok}/${essais} remplis${ok ? `, médiane ${med} ms` : ''}`));
    }
}

titre('Ce qu\'il faut en conclure');
console.log(`  Deux fleurs ne font pas un Rows Garden : ses définitions sont rangées
  par COULEUR, et une couleur qui ne contient qu'une fleur ne cache rien.

  Le remède est celui de la pyramide (\x1b[3mjs/data/motsPyramide.js\x1b[0m) : le chemin
  en français courant, l'arrivée en maths. Il demande quelques centaines de
  mots de plus, chacun avec sa définition — c'est du contenu, pas du code.

  Relancer cet outil le jour où le lexique grandit.`);
