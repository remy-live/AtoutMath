// LES PAIRES À RELIER — 10² d'un côté, 100 de l'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, en préparant son chapitre : « J'aimerai bien un jeu où on relie 10² à
// 100, 10⁻³ à 0,001, etc ».
//
// CE FICHIER EST PUR : pas de DOM, pas de hasard caché, pas d'horloge. Il rend
// une liste de paires, et l'écran (`games/apparier.js`) se charge de les
// dessiner et de tirer les traits. C'est la règle du dépôt pour tout ce qui
// décide de mathématiques — ici, QUELLES écritures désignent le même nombre.
//
// ── QUATRE FAMILLES, ET LA RAISON DE CHACUNE ──────────────────────────────
//
//   · `puissances`    10² ↔ 100. Sa demande, mot pour mot.
//   · `scientifique`  5 × 10² ↔ 500. La suite naturelle : la même lecture,
//                     avec un nombre devant. C'est aussi le calcul qu'il
//                     trouvait manquant au chapitre.
//   · `prefixes`      milli ↔ 10⁻³. Les mots qu'on lit sur les emballages.
//   · `mots`          un million ↔ 10⁶. Parce qu'un élève qui sait dire
//                     « méga, c'est un million » ne sait pas toujours écrire
//                     ce million en puissance de 10 — c'est le troisième pas,
//                     celui qu'on saute.
//
// ── CE QUE DEUX CARTES NE DOIVENT JAMAIS FAIRE ────────────────────────────
//
// DÉSIGNER LE MÊME NOMBRE DEUX FOIS. Si 10² et 10² sortent tous les deux, ou
// si « cent » et 10² sont séparés dans une famille mélangée, l'élève a deux
// réponses justes pour une carte et l'on en compte une fausse. Les paires sont
// donc tirées SANS REMISE sur la valeur, et c'est le seul invariant que ce
// fichier doit garantir.

/** Les exposants qu'on rencontre vraiment au collège. */
const EXPOSANTS = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];

const HAUT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴',
    5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

/** « 10⁻³ » — les exposants s'écrivent en petits chiffres, comme au tableau. */
export const puissance = (n) =>
    `10${String(n).split('').map(c => HAUT[c]).join('')}`;

/**
 * LA VALEUR DE 10ⁿ, ÉCRITE À LA MAIN.
 *
 * `10 ** -7` donne 1.0000000000000001e-7 : on ne peut pas s'en servir pour
 * fabriquer une carte. On pose donc les zéros un par un — la même décision
 * que `core/puissances.js`, et pour la même raison.
 */
export function valeurDe(n) {
    if (n === 0) return '1';
    if (n > 0) return `1${'0'.repeat(n)}`;
    return `0,${'0'.repeat(-n - 1)}1`;
}

/** « 5 × 10³ » devient « 5000 » : on pose la virgule, on ne calcule pas. */
export function decimalDe(chiffre, n) {
    const c = String(chiffre);
    if (n >= 0) return c + '0'.repeat(n);
    return `0,${'0'.repeat(-n - 1)}${c}`;
}

/**
 * UN NOMBRE GROUPÉ PAR TRANCHES DE TROIS — 1 000 000 se compte d'un coup
 * d'œil, 1000000 non. Et c'est justement ce qu'on demande de compter.
 */
export function grouper(texte) {
    const [ent, dec] = String(texte).split(',');
    const e = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const d = dec ? dec.replace(/(\d{3})(?=\d)/g, '$1 ') : null;
    return d ? `${e},${d}` : e;
}

/** Les préfixes qui servent, avec le mot français de leur valeur. */
export const PREFIXES_PAIRES = [
    // TÉRA ET PICO SONT LÀ POUR UNE RAISON MESURÉE : sans eux, ces deux
    // familles n'ont que SEPT paires possibles, et le réglage « 8 paires » du
    // catalogue en rendait sept. Un réglage qui ne tient pas ce qu'il promet
    // est un réglage qui ment. Ils sont de toute façon sur la fiche de Rémy,
    // qui va « de pico à trillion ».
    { n: 12, symbole: 'T', prefixe: 'téra', mot: 'un billion' },
    { n: 9, symbole: 'G', prefixe: 'giga', mot: 'un milliard' },
    { n: 6, symbole: 'M', prefixe: 'méga', mot: 'un million' },
    { n: 3, symbole: 'k', prefixe: 'kilo', mot: 'mille' },
    { n: -2, symbole: 'c', prefixe: 'centi', mot: 'un centième' },
    { n: -3, symbole: 'm', prefixe: 'milli', mot: 'un millième' },
    { n: -6, symbole: 'µ', prefixe: 'micro', mot: 'un millionième' },
    { n: -9, symbole: 'n', prefixe: 'nano', mot: 'un milliardième' },
    { n: -12, symbole: 'p', prefixe: 'pico', mot: 'un billionième' }
];

/** Les familles, et ce que chacune met à gauche et à droite. */
export const FAMILLES_PAIRES = {
    puissances: 'Puissances et nombres',
    scientifique: 'Écritures scientifiques',
    prefixes: 'Préfixes et puissances',
    mots: 'Les mots des grands nombres',
    melange: 'De tout'
};

/** Une paire de la famille « puissances » : 10² ↔ 100. */
function pairePuissance(n) {
    return {
        cle: `p${n}`,
        gauche: puissance(n),
        droite: grouper(valeurDe(n)),
        aide: `${puissance(n)} = ${grouper(valeurDe(n))} : `
            + (n > 0 ? `un 1 suivi de ${n} zéros.`
                     : `le 1 descend au rang ${-n} après la virgule.`)
    };
}

/** Une paire « scientifique » : 5 × 10² ↔ 500. */
function paireScientifique(chiffre, n) {
    return {
        cle: `s${chiffre}e${n}`,
        gauche: `${chiffre} × ${puissance(n)}`,
        droite: grouper(decimalDe(chiffre, n)),
        aide: `${chiffre} × ${puissance(n)} = ${grouper(decimalDe(chiffre, n))} : `
            + `la virgule se déplace de ${Math.abs(n)} rangs vers la `
            + `${n > 0 ? 'droite' : 'gauche'}.`
    };
}

/** Une paire « préfixes » : milli ↔ 10⁻³. */
function pairePrefixe(p) {
    return {
        cle: `x${p.n}`,
        gauche: `${p.prefixe} (${p.symbole})`,
        droite: puissance(p.n),
        aide: `${p.prefixe} vaut ${p.mot}, c'est-à-dire ${puissance(p.n)}.`
    };
}

/** Une paire « mots » : un million ↔ 10⁶. */
function paireMot(p) {
    return {
        cle: `m${p.n}`,
        gauche: p.mot,
        droite: puissance(p.n),
        aide: `${p.mot}, c'est ${puissance(p.n)} — ${grouper(valeurDe(p.n))}.`
    };
}

/**
 * TIRER UN JEU DE PAIRES.
 *
 * ── POURQUOI UN TIRAGE SANS REMISE, ET SUR LA CLÉ ─────────────────────────
 *
 * Deux cartes qui désignent le même nombre donneraient à l'élève DEUX réponses
 * justes pour une carte, dont une comptée fausse. On tire donc des clés
 * distinctes — `p3`, `s5e2`, `x-3` — et jamais deux fois la même.
 *
 * ET LA FAMILLE MÉLANGÉE NE MÉLANGE PAS N'IMPORTE QUOI : « mots » et
 * « prefixes » mettent tous les deux une puissance à DROITE, donc « un
 * million » et « méga » tireraient le même 10⁶ et se répondraient l'un
 * l'autre. Dans le mélange, on prend donc une seule de ces deux familles par
 * jeu de cartes — tirée au sort, pour que les deux se voient.
 *
 * @param {object} o
 * @param {string} [o.famille]  l'une des clés de FAMILLES_PAIRES
 * @param {number} [o.combien]  combien de paires (4 à 8)
 * @param {object} rng          le générateur du dépôt (pick, int, shuffle)
 * @returns {Array<{cle:string, gauche:string, droite:string, aide:string}>}
 */
export function tirerDesPaires({ famille = 'puissances', combien = 6 } = {}, rng) {
    const n = Math.max(3, Math.min(8, Math.round(combien) || 6));
    const quoi = FAMILLES_PAIRES[famille] ? famille : 'puissances';
    // DANS LE MÉLANGE, « mots » ET « prefixes » NE COHABITENT PAS : les deux
    // mettent une puissance à droite, donc « un million » et « méga » se
    // répondraient l'un l'autre.
    const parMots = quoi === 'mots' || (quoi === 'melange' && rng.bool());
    const sources = [];
    if (quoi === 'puissances' || quoi === 'melange') {
        for (const e of EXPOSANTS) sources.push(() => pairePuissance(e));
    }
    if (quoi === 'scientifique' || quoi === 'melange') {
        for (const e of EXPOSANTS) {
            for (const c of [2, 3, 4, 5, 6, 7, 8, 9]) {
                sources.push(() => paireScientifique(c, e));
            }
        }
    }
    if (quoi === 'prefixes' || (quoi === 'melange' && !parMots)) {
        for (const p of PREFIXES_PAIRES) sources.push(() => pairePrefixe(p));
    }
    if (quoi === 'mots' || (quoi === 'melange' && parMots)) {
        for (const p of PREFIXES_PAIRES) sources.push(() => paireMot(p));
    }
    const out = [];
    const vues = new Set();
    for (const fabrique of rng.shuffle(sources)) {
        if (out.length >= n) break;
        const paire = fabrique();
        // ── UNE ÉCRITURE N'APPARAÎT QU'UNE FOIS, DANS TOUT LE TABLEAU ──
        //
        // Pas seulement une fois PAR COLONNE : une fois en tout. J'avais
        // d'abord écrit deux ensembles séparés, un pour la gauche et un pour
        // la droite, ce qui laissait passer le vrai défaut.
        //
        // MESURÉ : sur quinze mille tirages, SOIXANTE-DIX-SEPT parties
        // mettaient la même écriture des deux côtés — « 10³ » à gauche
        // (famille des puissances) et « 10³ » à droite (en face de « kilo »).
        // L'élève relie alors 10³ à 10³, ce qui est VRAI, et on le compte
        // faux. Une erreur comptée sur une réponse juste est ce qu'un
        // exercice peut faire de pire : l'élève ne peut pas apprendre de ce
        // qu'on lui reproche, puisqu'il avait raison.
        //
        // Une partie mélangée sur soixante-cinq, donc une par classe et par
        // séance — assez pour que ce soit arrivé dès le premier jour.
        if (vues.has(paire.cle) || vues.has(paire.gauche) || vues.has(paire.droite)) continue;
        vues.add(paire.cle);
        vues.add(paire.gauche);
        vues.add(paire.droite);
        out.push(paire);
    }
    return out;
}
