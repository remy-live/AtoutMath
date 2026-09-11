// LES ANAGRAMMES DU VOCABULAIRE — la règle, sans une ligne de DOM.
//
// Rémy : « j'aimerais bien aussi un anagramme de mot mathématique, par exemple
// RACER est l'anagramme de CARRE. »
//
// L'exercice a l'air d'un jeu de lettres et n'en est pas tout à fait un. Ce
// qu'il travaille, c'est le LEXIQUE : reconnaître qu'avec un C, un A, deux R
// et un E on ne peut écrire qu'un seul mot de mathématiques. Un élève qui sait
// ce qu'est une bissectrice la retrouve dans le désordre ; un élève qui a
// seulement croisé le mot ne la retrouve pas. La définition sert de filet —
// et c'est ELLE qu'on lit vraiment, puisque les lettres, on les a déjà.
//
// TOUT LE MÉLANGE N'EST PAS ÉGAL. « ERRCA » ne se regarde pas : cinq
// consonnes empilées ne font pas un mot, l'œil abandonne. « RACER » se lit,
// donc on l'essaie, donc on cherche. Le tirage préfère donc les arrangements
// PRONONÇABLES : ils font croire à un mot, et c'est ce qui donne envie de le
// démonter. C'est la seule chose que ce module fait de subtil.

import { motsDisponibles, THEMES } from './motsCaches.js';

export { THEMES };

const VOYELLES = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

/**
 * Les lettres d'un mot, en majuscules, sans accent ni trait d'union.
 *
 * Le lexique est déjà écrit ainsi, mais la RÉPONSE de l'élève ne l'est pas :
 * il tape « médiatrice » avec son accent et sa minuscule, et refuser cela
 * n'enseignerait que la disposition d'un clavier.
 */
export function normaliser(texte) {
    return String(texte ?? '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toUpperCase().replace(/[^A-Z]/g, '');
}

/** Deux mots ont-ils exactement les mêmes lettres ? */
export function memesLettres(a, b) {
    const tri = (m) => normaliser(m).split('').sort().join('');
    return tri(a) === tri(b) && normaliser(a).length > 0;
}

/**
 * À quel point cet arrangement RESSEMBLE À UN MOT.
 *
 * Plus c'est bas, mieux c'est. On pénalise ce qui rend une suite de lettres
 * illisible — trois consonnes ou trois voyelles d'affilée, une consonne
 * doublée là où elle ne se prononce pas — et l'on récompense légèrement un
 * mélange qui ne commence NI ne finit comme le mot d'origine : « CARRE » →
 * « CAERR » se devine au premier coup d'œil, ce n'est plus une énigme.
 */
export function lisibilite(arrangement, original) {
    const l = arrangement.split('');
    let peine = 0;
    let suiteC = 0, suiteV = 0;
    l.forEach((c, i) => {
        if (VOYELLES.has(c)) { suiteV++; suiteC = 0; } else { suiteC++; suiteV = 0; }
        if (suiteC >= 3) peine += 3;
        if (suiteV >= 3) peine += 2;
        // Une lettre doublée à l'intérieur passe (CARRE, POMME) ; en tête ou
        // en queue, elle ne se prononce dans aucun mot français.
        if (i > 0 && c === l[i - 1] && (i === 1 || i === l.length - 1)) peine += 2;
    });
    if (!VOYELLES.has(l[l.length - 1]) && !'LMNRST'.includes(l[l.length - 1])) peine += 1;
    if (original) {
        if (l[0] === original[0]) peine += 2;
        if (l[l.length - 1] === original[original.length - 1]) peine += 1;
    }
    return peine;
}

/**
 * UN ARRANGEMENT QUI ALTERNE, plutôt qu'un tirage au sort.
 *
 * Un simple brassage de BISSECTRICE donne « STESCIECBIR » : sept consonnes
 * pour quatre voyelles, le hasard les empile, et l'œil renonce avant d'avoir
 * essayé. On construit donc en posant alternativement une consonne et une
 * voyelle, sans jamais en aligner plus de deux du même genre — ce qui donne
 * des suites qui se prononcent, donc qu'on a envie de démonter. Quand un des
 * deux tas s'épuise, le reste s'ajoute : un mot à sept consonnes ne peut pas
 * faire de miracle, mais il fait mieux que le hasard.
 */
function entrelacer(lettres, rng) {
    const v = rng.shuffle(lettres.filter(c => VOYELLES.has(c)));
    const c = rng.shuffle(lettres.filter(c => !VOYELLES.has(c)));
    const out = [];
    let genre = null, suite = 0;
    while (v.length || c.length) {
        let prend = c.length >= v.length ? 'c' : 'v';
        if (prend === genre && suite >= 2) prend = prend === 'c' ? 'v' : 'c';
        if (prend === 'c' && !c.length) prend = 'v';
        if (prend === 'v' && !v.length) prend = 'c';
        out.push(prend === 'c' ? c.shift() : v.shift());
        suite = prend === genre ? suite + 1 : 1;
        genre = prend;
    }
    return out.join('');
}

/**
 * Un mélange lisible du mot — jamais le mot lui-même.
 *
 * On tire des arrangements des deux façons — au hasard et par entrelacement —
 * et l'on garde le plus lisible. Le nombre d'essais suit la longueur : sur
 * onze lettres, trente tirages ne rencontrent rien de bon.
 */
export function melanger(mot, rng, essais = 0) {
    const lettres = normaliser(mot).split('');
    if (lettres.length < 2) return lettres.join('');
    const tours = essais || (30 + 14 * lettres.length);
    const original = lettres.join('');
    let meilleur = null, meilleurePeine = Infinity;
    for (let i = 0; i < tours; i++) {
        // Une fois sur deux par entrelacement : le hasard pur garde sa chance
        // de tomber sur un vrai mot, comme RACER pour CARRE.
        const arrangement = i % 2 ? entrelacer(lettres, rng) : rng.shuffle(lettres).join('');
        if (arrangement === original) continue;
        const peine = lisibilite(arrangement, original);
        if (peine < meilleurePeine) { meilleurePeine = peine; meilleur = arrangement; }
        if (meilleurePeine === 0) break;
    }
    // Un mot dont toutes les permutations sont le mot lui-même (« AAA ») ne
    // peut pas être une anagramme : on rend au moins quelque chose de stable.
    if (!meilleur) {
        const t = [...lettres];
        [t[0], t[t.length - 1]] = [t[t.length - 1], t[0]];
        return t.join('');
    }
    return meilleur;
}

/** Les mots assez longs pour faire une énigme, dans le thème demandé. */
export function motsJouables({ theme = 'tout', niveauMax = 3, longueurMin = 4, longueurMax = 99 } = {}) {
    return motsDisponibles({ theme, niveauMax })
        .filter(m => m.mot.length >= longueurMin && m.mot.length <= longueurMax);
}

/**
 * Une énigme.
 *
 * `eviter` porte les mots déjà tombés : revoir le même mot deux questions plus
 * loin ne se cherche pas, il se reconnaît.
 */
export function tirerAnagramme(rng, options = {}) {
    const { theme = 'tout', niveauMax = 3, longueurMin = 4, longueurMax = 99, eviter = [] } = options;
    const tous = motsJouables({ theme, niveauMax, longueurMin, longueurMax });
    if (!tous.length) return null;
    const exclus = new Set(eviter);
    const restants = tous.filter(m => !exclus.has(m.mot));
    const choix = rng.pick(restants.length ? restants : tous);
    return {
        mot: choix.mot,
        melange: melanger(choix.mot, rng),
        def: choix.def,
        theme: choix.theme,
        niveau: choix.niveau
    };
}

/** La proposition est-elle LE mot ? (accents et casse pardonnés) */
export function verifier(proposition, mot) {
    return normaliser(proposition) === normaliser(mot);
}

/**
 * Ce qu'on dit à celui qui se trompe.
 *
 * Trois cas, et ils n'appellent pas la même chose : avoir employé d'autres
 * lettres est une inattention, avoir écrit un vrai mot avec les bonnes lettres
 * est presque juste, et n'avoir rien écrit n'est pas une erreur.
 */
export function analyser(proposition, mot) {
    const p = normaliser(proposition), m = normaliser(mot);
    if (!p) return { etat: 'vide', message: 'Écris un mot avec toutes les lettres.' };
    if (p === m) return { etat: 'juste', message: '' };
    if (p.length !== m.length) {
        return {
            etat: 'longueur',
            message: `Ton mot a ${p.length} lettre${p.length > 1 ? 's' : ''}, il en faut ${m.length} — `
                + 'toutes les lettres servent, et chacune une seule fois.'
        };
    }
    if (!memesLettres(p, m)) {
        return { etat: 'lettres', message: 'Ce ne sont pas les mêmes lettres : reprends celles qui sont données.' };
    }
    return { etat: 'faux', message: 'Les bonnes lettres, mais pas le bon mot. Relis la définition.' };
}

/**
 * L'INDICE DÉCOUVRE LE DÉBUT, jamais une lettre au hasard.
 *
 * Une lettre isolée au milieu n'aide pas : on ne sait pas la relier. Le début
 * d'un mot, si — c'est ainsi qu'on le cherche dans sa tête.
 */
export function debutDevoile(mot, combien) {
    const m = normaliser(mot);
    const n = Math.max(0, Math.min(m.length - 1, Math.floor(combien)));
    return m.slice(0, n);
}
