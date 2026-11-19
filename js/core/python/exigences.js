// CE QUE LE PROGRAMME DOIT FAIRE, ET PAS SEULEMENT CE QU'IL DOIT AFFICHER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre, capture à l'appui. La question : « Les deux boîtes sont
// remplies. Ajoute la ligne qui affiche leur SOMME. Le programme doit écrire
// 14. » Il écrit :
//
//     a = 7
//     b = 7
//     print(14)
//
// et le logiciel répond que c'est juste. Son commentaire : « ça dit bon... ».
//
// ── IL ME L'AVAIT DÉJÀ DIT UNE FOIS, SUR UN AUTRE ÉCRAN ──────────────────
//
// École du Tableur : « la bonne réponse est =A1+B1 pas 17 ». C'est la même
// phrase, au symbole près, et la même faute de ma part — j'avais même écrit
// la règle dans ce dépôt : « on ne dit plus "attendu : 17" sous une question
// qui demande une formule ». Puis je l'ai refaite ici.
//
// ── POURQUOI LE PREMIER JET JUGEAIT SUR LA SORTIE, ET POURQUOI C'EST BIEN ─
//
// « Un élève qui écrit print('Bonjour') avec des apostrophes au lieu de
// guillemets a écrit un programme juste » : comparer les SOURCES reviendrait
// à noter la façon d'écrire, et à refuser des solutions correctes — la pire
// chose qu'un exercice de programmation puisse faire. Ce principe reste.
//
// MAIS IL NE SUFFIT PAS QUAND C'EST LE CALCUL QU'ON ENSEIGNE. « Affiche leur
// somme » ne demande pas un 14 à l'écran : il demande un programme qui
// marcherait encore si les deux boîtes changeaient. On ajoute donc, pour ces
// marches-là SEULEMENT, une exigence sur ce que le programme CONTIENT.
//
// ── ET L'EXIGENCE EST LA PLUS LARGE POSSIBLE ─────────────────────────────
//
// On ne demande jamais une écriture précise : `print(a + b)` et `print(b + a)`
// passent tous les deux, et `print( a+b )` aussi. On demande que les BOÎTES
// soient là — c'est-à-dire que le résultat soit calculé et non recopié. Toute
// exigence plus étroite recommencerait à noter la façon d'écrire.

/** Les lignes qui appellent `print`, sans les commentaires. */
const lignesPrint = (source) => String(source || '')
    .split('\n')
    .map((l) => l.replace(/#.*$/, ''))
    .filter((l) => /\bprint\s*\(/.test(l));

/** Le mot `nom` est-il employé comme identifiant dans ce texte ? */
const emploie = (texte, nom) =>
    new RegExp(`(^|[^\\w])${nom}($|[^\\w])`).test(String(texte || ''));

/** Un `print` qui emploie TOUS ces noms. */
const printAvec = (source, noms) =>
    lignesPrint(source).some((l) => noms.every((n) => emploie(l, n)));

/** Le code sans ses chaînes de caractères : ce qui reste est du calcul. */
const horsTexte = (source) => String(source || '')
    .replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");

/**
 * CE QUE CHAQUE MARCHE EXIGE EN PLUS DE SA SORTIE.
 *
 * Chacune rend `null` quand le programme fait ce qu'on demande, et sinon la
 * phrase à dire. CETTE PHRASE COMMENCE TOUJOURS PAR RECONNAÎTRE CE QUI EST
 * JUSTE : l'élève a bien obtenu le bon affichage, et le lui nier le
 * découragerait sur le seul point qu'il avait réussi.
 */
const REGLES = {
    // ── ON NE DEMANDE PAS OÙ LE CALCUL SE FAIT, SEULEMENT QU'IL SE FASSE ─
    //
    // Premier jet : « une ligne `print` doit contenir a ET b ». Il refusait
    //
    //     s = a + b
    //     print(s + 0)
    //
    // qui est un programme juste, et même un bon réflexe. ON REGARDE DONC CE
    // QUE L'ÉLÈVE A AJOUTÉ — tout ce qui n'est pas une des deux boîtes
    // données — et l'on exige que les deux noms y servent, où qu'ils soient.
    'une-ligne': (src) => {
        const ajoute = horsTexte(src).split('\n')
            .filter((l) => !/^\s*\w+\s*=\s*-?\d+\s*$/.test(l))
            .join('\n');
        return (emploie(ajoute, 'a') && emploie(ajoute, 'b')) ? null : {
            dire: 'Ton programme affiche le bon nombre, mais il ne le CALCULE pas.',
            aide: 'Il faut additionner les deux boîtes : print(a + b). Écrit comme ça, '
                + 'le programme marcherait encore si a et b changeaient — c’est toute '
                + 'la différence entre un programme et une réponse.'
        };
    },

    'deux-lignes': (src, meta) => {
        const nom = (String(meta.solution || '').match(/^(\w+)\s*=/) || [])[1];
        if (!nom) return null;
        const range = new RegExp(`(^|\\n)\\s*${nom}\\s*=`).test(String(src));
        return (range && printAvec(src, [nom])) ? null : {
            dire: `Ton programme affiche le bon nombre, mais il n’emploie pas la boîte ${nom}.`,
            aide: `On demande DEUX lignes : d’abord ${nom} = …, puis print(${nom}). `
                + 'Afficher le nombre directement saute l’étape qu’on travaille ici.'
        };
    },

    'petit-programme': (src, meta) => {
        const sol = String(meta.solution || '');
        if (/\bfor\b/.test(sol)) {
            return /\bfor\b/.test(horsTexte(src)) ? null : {
                dire: 'Ton programme affiche les bonnes lignes, mais sans boucle.',
                aide: 'Écrire les print les uns sous les autres marche pour cinq lignes '
                    + 'et plus du tout pour mille. C’est la boucle « for » qu’on '
                    + 'travaille ici.'
            };
        }
        const nu = horsTexte(src);
        return (/\bif\b/.test(nu) && /\belse\b/.test(nu)) ? null : {
            dire: 'Ton programme affiche le bon mot, mais il ne CHOISIT pas.',
            aide: 'Il faut un « if » et un « else » : le programme doit afficher '
                + 'l’autre mot si la boîte contenait un autre nombre.'
        };
    },

    'fonction-appel': (src) => printAvec(src, ['double']) ? null : {
        dire: 'Ton programme affiche le bon nombre, mais il n’appelle pas la fonction.',
        aide: 'C’est elle qu’on travaille ici : écris print(double(…)). Une fonction '
            + 'qu’on n’appelle jamais ne sert à rien, et c’est tout l’objet de cette '
            + 'marche.'
    },

    'fonction-retour': (src) => {
        const nu = horsTexte(src);
        const retour = (nu.match(/return\s+(.*)/) || [])[1] || '';
        return (retour && emploie(retour, 'x')) ? null : {
            dire: 'Ton programme affiche le bon nombre, mais la fonction ne calcule rien.',
            aide: 'Le « return » doit se servir de x — par exemple 3 * x. Sinon la '
                + 'fonction rend toujours la même chose, quel que soit le nombre '
                + 'qu’on lui donne.'
        };
    },

    'fonction-ecrire': (src) => {
        const nu = horsTexte(src);
        const def = /\bdef\s+aire\s*\(([^)]*)\)/.exec(nu);
        const params = def ? def[1].split(',').map((p) => p.trim()).filter(Boolean) : [];
        const retour = (nu.match(/return\s+(.*)/) || [])[1] || '';
        const sert = params.length >= 2 && params.every((p) => emploie(retour, p));
        return (sert && printAvec(src, ['aire'])) ? null : {
            dire: 'Ton programme affiche le bon nombre, mais la fonction demandée manque.',
            aide: 'Il faut « def aire(L, l) », un « return » qui MULTIPLIE les deux, '
                + 'puis un print qui appelle aire(…). C’est la fonction qu’on écrit '
                + 'ici, pas le résultat.'
        };
    },

    'dessin-carre': (src) => /\bfor\b/.test(horsTexte(src)) ? null : {
        dire: 'La figure est la bonne, mais tu l’as tracée sans boucle.',
        aide: 'La consigne demande une boucle « for » : quatre côtés identiques, '
            + 'c’est exactement ce pour quoi les boucles existent.'
    },

    'dessin-polygone': (src) => /\bfor\b/.test(horsTexte(src)) ? null : {
        dire: 'La figure est la bonne, mais tu l’as tracée sans boucle.',
        aide: 'Avec douze côtés, écrire douze fois les deux lignes devient '
            + 'impossible à relire. La boucle est là pour ça.'
    },

    'dessin-fonction': (src) => {
        const nu = horsTexte(src);
        const def = /\bdef\s+(\w+)\s*\(\s*(\w+)/.exec(nu);
        if (!def) {
            return { dire: 'La figure est la bonne, mais il n’y a pas de fonction.',
                aide: 'La consigne demande « def carre(cote): » — une seule définition, '
                    + 'puis deux appels avec deux côtés différents.' };
        }
        // DEUX APPELS AU MOINS, et avec des valeurs différentes : c'est le
        // point de la marche. Une fonction appelée une seule fois ne montre
        // pas encore à quoi elle sert.
        const appels = [...nu.matchAll(new RegExp(`(^|[^\\w.])${def[1]}\\s*\\(([^)]*)\\)`, 'gm'))]
            .map((m) => m[2].trim())
            .filter((a, i, t) => !/^\s*$/.test(a) || t.length > 2);
        const distincts = new Set(appels);
        return distincts.size >= 2 ? null : {
            dire: 'La figure est la bonne, mais la fonction n’est pas vraiment employée.',
            aide: 'Appelle-la DEUX fois, avec deux côtés différents. C’est là qu’on '
                + 'voit à quoi sert un paramètre : une définition, plusieurs dessins.'
        };
    }
};

/**
 * LE PROGRAMME FAIT-IL CE QU'ON DEMANDE, ET PAS SEULEMENT CE QU'IL FAUT ?
 *
 * @returns {null|{dire:string, aide:string}} `null` si tout va bien.
 */
export function exigenceNonTenue(marche, source, meta = {}) {
    const regle = REGLES[marche];
    if (!regle) return null;
    return regle(source, meta) || null;
}

/** Cette marche juge-t-elle AUSSI sur ce que le programme contient ? */
export const aUneExigence = (marche) => Object.prototype.hasOwnProperty.call(REGLES, marche);
