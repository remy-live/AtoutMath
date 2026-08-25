// LA PYRAMIDE — à chaque ligne, une lettre de plus.
//
// Rémy, avec la page de son « Coin des jeux mathématiques » : « À chaque ligne,
// tu rajoutes une lettre pour faire un nouveau mot. Les lettres PEUVENT ÊTRE
// MÉLANGÉES. »
//
// C'est cette dernière phrase qui fait tout le jeu. Sans elle, on lit le mot
// précédent et l'on cherche où coller la lettre : trois essais suffisent. Avec
// elle, il faut RECONNAÎTRE un ensemble de lettres sous un ordre nouveau —
// CODE puis CORDE puis DECORS — et c'est exactement l'anagramme, donc le
// dénombrement des arrangements qu'on retrouvera plus tard.
//
// LE SOMMET EST UNE LETTRE SEULE, et sa définition s'écrit toute seule : « la
// 15ᵉ lettre de l'alphabet ». Pas besoin de la stocker, et l'élève y gagne un
// premier barreau gratuit qui installe le mécanisme.
//
// LE JEU EST UN CHEMIN DANS UN GRAPHE. Le lexique (data/motsPyramide.js) ne
// contient pas de pyramides : il contient des mots, et l'on cherche ici les
// suites où chaque mot a les lettres du précédent plus une. Ajouter un mot au
// lexique crée donc d'un coup toutes les pyramides qui passent par lui.
//
// Module pur : ni DOM, ni hasard propre.

import { LEXIQUE_PYRAMIDE } from '../data/motsPyramide.js';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Les lettres d'un mot, triées : deux anagrammes ont la même clé. */
export const cleLettres = (mot) => mot.split('').sort().join('');

/**
 * `enfant` est-il `parent` plus exactement une lettre ?
 *
 * On compare les deux clés triées comme deux mots à fusionner : chaque lettre
 * du parent doit se retrouver dans l'enfant, dans l'ordre, et il doit rester
 * exactement une lettre en trop. Compter les lettres marcherait aussi ; cette
 * version-ci tient en cinq lignes et ne se trompe pas sur les doublons (TERME
 * a deux E, METIER aussi).
 */
export function estFils(parent, enfant) {
    if (enfant.length !== parent.length + 1) return false;
    const a = cleLettres(parent), b = cleLettres(enfant);
    let i = 0, enTrop = 0;
    for (const c of b) {
        if (i < a.length && a[i] === c) i++;
        else enTrop++;
    }
    return i === a.length && enTrop === 1;
}

/** Le lexique rangé par longueur : on ne compare jamais que deux niveaux. */
function parLongueur(lexique) {
    const m = new Map();
    lexique.forEach(e => {
        if (!m.has(e.mot.length)) m.set(e.mot.length, []);
        m.get(e.mot.length).push(e);
    });
    return m;
}

/**
 * TOUTES LES PYRAMIDES D'UNE HAUTEUR DONNÉE.
 *
 * On les énumère une fois pour toutes plutôt que de tirer au hasard puis de
 * réessayer : le lexique est petit, l'exploration est instantanée, et surtout
 * on SAIT combien il y en a. Un tirage qui échoue est un jeu qui ne s'ouvre
 * pas ; une liste vide se voit dans un test.
 */
export function toutesLesPyramides(hauteur, lexique = LEXIQUE_PYRAMIDE) {
    const niveaux = parLongueur(lexique);
    const trouvees = [];
    const explorer = (suite) => {
        if (suite.length === hauteur) { trouvees.push(suite); return; }
        const dernier = suite[suite.length - 1];
        (niveaux.get(dernier.mot.length + 1) || [])
            .filter(e => estFils(dernier.mot, e.mot))
            .forEach(e => explorer([...suite, e]));
    };
    // Le sommet : une lettre, avec la définition qui s'écrit toute seule.
    // « La 1ʳᵉ lettre », pas « la 1ᵉ » : c'est la PREMIÈRE, pas la unième, et
    // c'est la seule de l'alphabet à ne pas prendre le « ᵉ » ordinaire.
    ALPHABET.split('').forEach((l, i) => explorer([{
        mot: l, def: `La ${i + 1}${i ? 'ᵉ' : 'ʳᵉ'} lettre de l'alphabet.`
    }]));
    return trouvees;
}

/**
 * LA LETTRE QUI ARRIVE d'un barreau au suivant : celle de l'enfant qui n'est
 * pas dans le parent. C'est elle que l'indice montre — dire « il y a un R en
 * plus » aide sans donner le mot, ce qu'aucune autre aide ne sait faire ici.
 */
export function lettreAjoutee(parent, enfant) {
    const a = cleLettres(parent).split('');
    for (const c of cleLettres(enfant)) {
        const i = a.indexOf(c);
        if (i < 0) return c;
        a.splice(i, 1);
    }
    return '';
}

/**
 * COMBIEN DE BARREAUX SONT DONNÉS AU DÉPART.
 *
 * Le sommet toujours : une pyramide qui commence par une case vide de une
 * lettre n'a aucune prise, et l'élève tire au sort parmi vingt-six. Ensuite,
 * la difficulté est le nombre de lignes qu'il reste à trouver.
 */
export const DIFFICULTES = {
    facile: { id: 'facile', label: 'Facile — la moitié est écrite', part: 0.5 },
    moyen: { id: 'moyen', label: 'Moyen — les deux premières lignes', part: 0.28 },
    difficile: { id: 'difficile', label: 'Difficile — le sommet seul', part: 0 }
};

/**
 * Une pyramide prête à jouer.
 *
 * @param {{hauteur?: number, difficulte?: string, rng: object, lexique?: Array}} opts
 * @returns {{barreaux: Array, donnes: boolean[], hauteur: number}|null}
 */
export function creerPyramide({ hauteur = 6, difficulte = 'moyen', rng, lexique, rang }) {
    const toutes = toutesLesPyramides(hauteur, lexique);
    if (!toutes.length) return null;
    // DEUX PYRAMIDES D'UNE MÊME FICHE NE PARTENT PAS DE LA MÊME LETTRE.
    //
    // Tirées librement, elles se ressemblaient au premier coup d'œil : la
    // première imprimée donnait L → IL → ILE → ILES… et la seconde
    // L → IL → LIT → LITS…, deux chaînes bel et bien différentes mais dont les
    // deux premières lignes étaient identiques — l'élève y voit une faute
    // d'impression avant d'y voir un second exercice. `rang` fait tourner la
    // lettre de départ ; sans lui, on tire comme avant.
    const barreaux = rang === undefined
        ? rng.pick(toutes)
        : (() => {
            const racines = [...new Set(toutes.map(c => c[0].mot))].sort();
            const racine = racines[Number(rang) % racines.length];
            return rng.pick(toutes.filter(c => c[0].mot === racine));
        })();
    const d = DIFFICULTES[difficulte] || DIFFICULTES.moyen;
    // LES LIGNES DONNÉES SONT LES PREMIÈRES, jamais des lignes au hasard. Une
    // pyramide se remplit du haut vers le bas — chaque mot se cherche à partir
    // du précédent —, et un trou au milieu couperait la chaîne en deux.
    const nDonnes = 1 + Math.round((hauteur - 1) * d.part);
    return {
        hauteur,
        barreaux,
        donnes: barreaux.map((_, i) => i < nDonnes),
        difficulte: d.id
    };
}

/** La saisie de départ : les lignes données sont écrites, les autres vides. */
export const saisieInitiale = (p) =>
    p.barreaux.map((b, i) => (p.donnes[i] ? b.mot : ''));

/** Une ligne est juste quand elle porte exactement le mot attendu. */
export const ligneJuste = (p, i, saisie) =>
    (saisie[i] || '').toUpperCase() === p.barreaux[i].mot;

/** La pyramide est finie quand toutes ses lignes sont justes. */
export const estResoluePyramide = (p, saisie) =>
    p.barreaux.every((_, i) => ligneJuste(p, i, saisie));

/**
 * CE QUI CLOCHE, EN UN SEUL DIAGNOSTIC.
 *
 * On rend la PREMIÈRE ligne fautive, du haut vers le bas, parce que c'est
 * celle qui bloque la suite : corriger la ligne 5 quand la 3 est fausse ne
 * sert à rien. Et l'on distingue trois fautes, parce qu'elles n'appellent pas
 * la même remarque — pas les bonnes lettres, les bonnes lettres mais pas un
 * mot du jeu, ou rien d'écrit.
 */
export function diagnostic(p, saisie) {
    for (let i = 0; i < p.barreaux.length; i++) {
        const ecrit = (saisie[i] || '').toUpperCase();
        const attendu = p.barreaux[i].mot;
        if (!ecrit) return { ok: false, ligne: i, quoi: 'vide' };
        if (ecrit === attendu) continue;
        if (ecrit.length !== attendu.length) return { ok: false, ligne: i, quoi: 'longueur' };
        // Les bonnes lettres, mais pas le bon mot : c'est un autre anagramme,
        // et l'élève est bien plus près qu'il ne le croit.
        if (cleLettres(ecrit) === cleLettres(attendu)) {
            return { ok: false, ligne: i, quoi: 'anagramme' };
        }
        // Les lettres du dessus sont-elles au moins reprises ? Si non, c'est la
        // règle du jeu qui n'est pas comprise, pas le mot qui manque.
        if (i > 0 && !estFils(p.barreaux[i - 1].mot, ecrit)) {
            return { ok: false, ligne: i, quoi: 'regle' };
        }
        return { ok: false, ligne: i, quoi: 'lettres' };
    }
    return { ok: true };
}

/** De quoi écrire un corrigé : les mots, et la lettre gagnée à chaque marche. */
export function qualitePyramide(p) {
    return {
        hauteur: p.hauteur,
        mots: p.barreaux.map(b => b.mot),
        ajouts: p.barreaux.slice(1).map((b, i) => lettreAjoutee(p.barreaux[i].mot, b.mot)),
        aTrouver: p.donnes.filter(d => !d).length
    };
}
