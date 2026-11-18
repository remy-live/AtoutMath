// DIRE EN FRANÇAIS CE QUE L'ÉLÈVE A FAIT DE TRAVERS DANS SON PROGRAMME.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « L'idéal serait de faire des qcm et après que l'élève
// tape, l'aider sur l'indentation. Être hyper hyper hyper progressif. »
//
// ── POURQUOI CE FICHIER EXISTE, ET POURQUOI IL PASSE AVANT L'INTERPRÉTEUR ──
//
// Le logiciel exécute du vrai Python (Skulpt). Avant de l'adopter, on lui a
// soumis seize programmes dans Chromium — `tools/tmp/mesurePython.mjs`, mesure
// consignée dans `docs/remarques-2026-10-15.md`. Il charge en 105 ms et
// exécute chaque programme de collège en 2 à 6 ms : il tient. Mais sur les
// fautes de débutant, voilà ce qu'il répond :
//
//   oublié l'indentation après « : »   →  bad input on line 2
//   indenté une ligne sans raison      →  bad input on line 2
//   oublié les deux-points             →  bad input on line 1
//   écrit « if n = 3: »                →  bad input on line 2
//   mis un accent dans un nom          →  bad token T_OP on line 1
//
// QUATRE FAUTES ENTIÈREMENT DIFFÉRENTES, LA MÊME PHRASE. En anglais, et sans
// jamais nommer ce qui ne va pas. Un élève de troisième à qui l'on répond
// « bad input on line 2 » n'apprend rien ; il appelle le professeur, et le
// professeur passe son heure à lire des programmes à la place de ses
// vingt-cinq autres élèves.
//
// Donc : ON JUGE D'ABORD, ON EXÉCUTE ENSUITE. Ce fichier nomme la faute, dit
// LA LIGNE, et dit QUOI FAIRE. Skulpt ne voit que ce qu'on a déjà déclaré
// lisible, et ses erreurs d'exécution (celles qui, elles, sont utiles :
// `NameError` nomme la variable) sont traduites par `traduireErreur`.
//
// ── LA RÈGLE QUI GOUVERNE TOUTES LES AUTRES ───────────────────────────────
//
// ON NE REFUSE JAMAIS UN PROGRAMME CORRECT. Un vérificateur qui invente une
// faute est pire que pas de vérificateur : l'élève corrige ce qui n'était pas
// cassé, et apprend que la machine ment. Chaque règle ci-dessous ne se
// déclenche donc que sur du Python RÉELLEMENT invalide, ou — et c'est écrit à
// chaque fois — sur une forme valide mais que ce niveau n'a pas encore
// rencontrée, auquel cas le ton est celui d'un conseil et non d'un refus.

// Les mots qui ouvrent un bloc : après eux, la ligne finit par deux-points et
// la suivante est décalée. C'est TOUTE la grammaire de l'indentation en
// Python, et elle tient en une ligne — c'est ce qu'on veut faire voir.
const OUVREURS = ['if', 'elif', 'else', 'for', 'while', 'def', 'class', 'try',
    'except', 'finally', 'with'];

// Les mots qui ne peuvent PAS commencer un programme : ils continuent un bloc
// commencé plus haut. Un programme qui démarre par « else » n'a pas de « si ».
const SUITES = ['elif', 'else', 'except', 'finally'];

const PAS = 4;   // On décale de quatre espaces. Voir `conseilDuPas` plus bas.

/**
 * Remplace le CONTENU des chaînes et des commentaires par des espaces, en
 * gardant la longueur et les guillemets.
 *
 * SANS ELLE, TOUT LE RESTE SE TROMPE. `print("if x = 3")` contient un « if »
 * sans deux-points et un « = » dans un test ; un commentaire français contient
 * des accents. Trois des règles d'en dessous auraient crié sur du code sain —
 * c'est exactement la friction que `sansCommentaires` ferme déjà du côté des
 * épreuves (voir CLAUDE.md §4), et elle se repose ici, dans le produit.
 *
 * Elle rend aussi `ouverte` : le guillemet qui n'a jamais été refermé.
 */
export function masquer(ligne) {
    let hors = '', dedans = null, ouverte = null;
    for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (dedans) {
            hors += (c === dedans) ? c : ' ';
            if (c === dedans) dedans = null;
        } else if (c === '"' || c === "'") {
            dedans = c; ouverte = { signe: c, colonne: i }; hors += c;
        } else if (c === '#') {
            // LE COMMENTAIRE MANGE LA FIN DE LA LIGNE, espaces compris : on le
            // remplace par du vide pour que « finit par deux-points » reste
            // vrai quand l'élève écrit « for i in range(3):  # ma boucle ».
            hors += ' '.repeat(ligne.length - i);
            return { texte: hors, ouverte: null };
        } else hors += c;
    }
    return { texte: hors, ouverte: dedans ? ouverte : null };
}

/** Le nombre d'espaces en tête, et le texte utile. Une tabulation vaut 1. */
const creuxDe = (ligne) => ligne.length - ligne.replace(/^[ \t]+/, '').length;

/**
 * Découpe le programme en lignes déjà masquées et mesurées.
 *
 * ── LA LIGNE QUI N'EN EST PAS UNE ─────────────────────────────────────────
 *
 * PREMIER JET, ET IL REFUSAIT DU PYTHON JUSTE :
 *
 *     t = [1,
 *          2]
 *
 * La seconde ligne est décalée de cinq espaces sans que la première finisse
 * par deux-points — ma règle criait « indentation en trop ». Or ce n'est pas
 * une ligne : c'est la SUITE de la précédente, et Python ne lui impose
 * strictement aucun décalage tant que le crochet n'est pas refermé. Même
 * chose derrière une barre oblique inverse en fin de ligne.
 *
 * On compte donc les crochets ouverts, et une ligne qui commence à l'intérieur
 * d'un crochet est marquée `suite` : les règles d'indentation et de
 * deux-points l'ignorent. La règle en tête de ce fichier — ne jamais refuser
 * un programme correct — se paie ici, en une variable.
 */
export function lire(source) {
    let profondeur = 0, colle = false;
    return String(source).replace(/\r\n?/g, '\n').split('\n').map((brut, i) => {
        const { texte, ouverte } = masquer(brut);
        const suite = profondeur > 0 || colle;
        for (const c of texte) {
            if (c === '(' || c === '[' || c === '{') profondeur++;
            else if (c === ')' || c === ']' || c === '}') profondeur = Math.max(0, profondeur - 1);
        }
        colle = /\\\s*$/.test(brut);
        return {
            n: i + 1, brut, texte, ouverte, suite,
            creux: creuxDe(brut),
            nu: texte.trim(),
            vide: texte.trim() === '',
            tabulation: /^[ \t]*\t/.test(brut),
            // « finit par deux-points » se lit sur le texte MASQUÉ, donc après
            // avoir ôté le commentaire : voir `masquer`.
            ouvre: profondeur === 0 && /:\s*$/.test(texte) && OUVREURS.some(
                (m) => new RegExp('^' + m + '\\b').test(texte.trim()))
        };
    });
}

const ennui = (ligne, faute, dire, aide) => ({ ligne, faute, dire, aide });

/**
 * LE DIAGNOSTIC. Rend `null` quand on ne voit rien à redire, sinon le premier
 * ennui trouvé : `{ ligne, faute, dire, aide }`.
 *
 * `dire` est la phrase qu'on montre à l'élève. `aide` est la phrase d'après,
 * celle qui dit QUOI FAIRE — on les sépare parce que l'interface les affiche
 * à deux endroits et à deux moments.
 *
 * L'ORDRE DES RÈGLES EST UNE DÉCISION. Une ligne peut porter trois fautes à la
 * fois ; on nomme celle qui vient en PREMIER dans l'ordre où l'élève a écrit,
 * et, à ligne égale, la plus grossière. Dire « il manque les deux-points »
 * à quelqu'un dont le guillemet n'est pas fermé l'envoie corriger la mauvaise
 * chose.
 */
export function diagnostiquer(source) {
    const lignes = lire(source);
    if (lignes.every((l) => l.vide)) {
        return ennui(1, 'vide', 'Ton programme est vide.',
            'Écris au moins une ligne, par exemple print("Bonjour").');
    }

    return chaineOuverte(lignes)
        || guillemetDepareille(lignes)
        || parenthesesDesequilibrees(lignes)
        || accentDansUnNom(lignes)
        || deuxPointsOublies(lignes)
        || egalDansUnTest(lignes)
        || tabulationEtEspaces(lignes)
        || indentation(lignes)
        || null;
}

// ── 1. LA CHAÎNE QU'ON N'A PAS REFERMÉE ───────────────────────────────────
//
// Skulpt dit « bad input on line 1 » et montre la ligne 1 ; l'élève regarde
// la ligne 1, qui lui paraît juste, parce que ce qui manque est à sa FIN.
function chaineOuverte(lignes) {
    for (const l of lignes) {
        if (!l.ouverte) continue;
        return ennui(l.n, 'chaine-ouverte',
            `Ligne ${l.n} : le texte s'ouvre par ${l.ouverte.signe} mais ne se referme jamais.`,
            `Ajoute un ${l.ouverte.signe} à la fin du texte.`);
    }
    return null;
}

// ── 2. LE GUILLEMET QUI CHANGE EN COURS DE ROUTE ──────────────────────────
//
// « print("Bonjour') » : les deux signes existent, le compte y est, et
// pourtant rien ne marche. C'est la faute la plus désespérante à chercher
// soi-même, parce que l'œil lit un texte entre guillemets.
function guillemetDepareille(lignes) {
    for (const l of lignes) {
        // On relit le BRUT : `masquer` a justement effacé l'intérieur.
        const m = l.brut.match(/"[^"\n]*'|'[^'\n]*"/);
        if (!m) continue;
        // Faux positif à écarter : une apostrophe DANS un texte entre
        // guillemets doubles est parfaitement correcte — « print("l'eau") » —
        // et c'est du français courant, donc fréquent chez nos élèves. On ne
        // crie que si la ligne, une fois masquée, garde un guillemet solitaire.
        if (!l.ouverte) continue;
        return ennui(l.n, 'guillemet-depareille',
            `Ligne ${l.n} : le texte commence par un guillemet et finit par l'autre.`,
            'Les deux bouts d\'un texte doivent porter le MÊME signe : "…" ou \'…\'.');
    }
    return null;
}

// ── 3. LES PARENTHÈSES ────────────────────────────────────────────────────
//
// Skulpt répond « EOF in multi-line statement on line 2 » pour un programme
// d'UNE ligne : il a lu la ligne 2, qui n'existe pas, en cherchant la
// parenthèse. On nomme la ligne où elle s'est ouverte.
function parenthesesDesequilibrees(lignes) {
    const PAIRES = { ')': '(', ']': '[', '}': '{' };
    const pile = [];
    for (const l of lignes) {
        for (let i = 0; i < l.texte.length; i++) {
            const c = l.texte[i];
            if (c === '(' || c === '[' || c === '{') pile.push({ c, n: l.n, i });
            else if (PAIRES[c]) {
                const haut = pile.pop();
                if (!haut) {
                    return ennui(l.n, 'parenthese-en-trop',
                        `Ligne ${l.n} : il y a un ${c} qui ne ferme rien.`,
                        `Ce ${c} n'a pas de ${inverse(c)} devant lui : enlève-le.`);
                }
                if (haut.c !== PAIRES[c]) {
                    return ennui(l.n, 'parenthese-melangee',
                        `Ligne ${l.n} : un ${haut.c} ouvert à la ligne ${haut.n} est fermé par un ${c}.`,
                        `Ferme-le avec un ${ferme(haut.c)}.`);
                }
            }
        }
    }
    if (pile.length) {
        const haut = pile[pile.length - 1];
        return ennui(haut.n, 'parenthese-oubliee',
            `Ligne ${haut.n} : le ${haut.c} n'est jamais refermé.`,
            `Ajoute un ${ferme(haut.c)} à la fin.`);
    }
    return null;
}
const ferme = (c) => ({ '(': ')', '[': ']', '{': '}' }[c]);
const inverse = (c) => ({ ')': '(', ']': '[', '}': '{' }[c]);

// ── 4. L'ACCENT DANS UN NOM DE VARIABLE ───────────────────────────────────
//
// « prénom = "Léa" » : Skulpt rend « bad token T_OP ». Le mot « token »
// n'existe pas pour un élève de troisième, et « T_OP » n'existe pour
// personne. C'est une faute QUE NOS ÉLÈVES FONT PLUS QUE D'AUTRES : ils
// écrivent en français, et « prénom » est le premier nom de variable qui
// vient quand on demande un prénom.
//
// Le texte entre guillemets, lui, prend tous les accents du monde — et c'est
// `masquer` qui fait la différence.
function accentDansUnNom(lignes) {
    for (const l of lignes) {
        const m = l.texte.match(/[A-Za-z_][A-Za-z0-9_]*[À-ÖØ-öø-ÿ][A-Za-z0-9_À-ÖØ-öø-ÿ]*|[À-ÖØ-öø-ÿ][A-Za-z0-9_À-ÖØ-öø-ÿ]*/);
        if (!m) continue;
        return ennui(l.n, 'accent-dans-un-nom',
            `Ligne ${l.n} : « ${m[0]} » porte un accent, et un nom de variable n'en prend pas.`,
            `Écris « ${sansAccent(m[0])} ». Dans un TEXTE entre guillemets, en revanche, les accents sont permis.`);
    }
    return null;
}
const sansAccent = (mot) => mot.normalize('NFD').replace(/[̀-ͯ]/g, '');

// ── 5. LES DEUX-POINTS OUBLIÉS ────────────────────────────────────────────
//
// C'est la faute n° 1 du débutant, et Skulpt la désigne par « bad input ».
// On la reconnaît sans ambiguïté : la ligne commence par un mot qui ouvre un
// bloc et ne finit pas par deux-points.
function deuxPointsOublies(lignes) {
    for (const l of lignes) {
        if (l.vide || l.suite) continue;
        const mot = (l.nu.match(/^[a-z]+/) || [])[0];
        if (!OUVREURS.includes(mot)) continue;
        if (/:\s*$/.test(l.texte)) continue;
        // UNE CONDITION OUVERTE SUR PLUSIEURS LIGNES N'EST PAS FINIE : les
        // deux-points sont tout en bas, et ce n'est pas une faute.
        if (/[([{]/.test(l.texte) && !/[)\]}]\s*$/.test(l.texte.trimEnd())) {
            const ouverts = (l.texte.match(/[([{]/g) || []).length;
            const fermes = (l.texte.match(/[)\]}]/g) || []).length;
            if (ouverts > fermes) continue;
        }
        // « else » et « try » n'ont rien entre le mot et les deux-points ; les
        // autres ont une condition, et une ligne qui se poursuit entre
        // parenthèses n'est pas finie — on l'a déjà vérifié en 3.
        return ennui(l.n, 'deux-points-oublies',
            `Ligne ${l.n} : il manque les deux-points à la fin.`,
            `En Python, « ${mot} » finit TOUJOURS par « : », et la ligne d'après est décalée.`);
    }
    return null;
}

// ── 6. UN SEUL ÉGAL DANS UN TEST ──────────────────────────────────────────
//
// « if n = 3: ». Skulpt : « bad input on line 2 ». Or c'est la confusion la
// plus profonde du début de Python, et elle mérite sa phrase : un égal RANGE
// une valeur, deux égaux COMPARENT.
function egalDansUnTest(lignes) {
    for (const l of lignes) {
        const mot = (l.nu.match(/^[a-z]+/) || [])[0];
        if (!['if', 'elif', 'while'].includes(mot)) continue;
        // On regarde la condition seule, et on écarte les opérateurs qui
        // contiennent légitimement un égal : ==, !=, <=, >=.
        const condition = l.texte.replace(/^\s*[a-z]+\s*/, '').replace(/:\s*$/, '');
        if (!/(^|[^=!<>])=([^=]|$)/.test(condition)) continue;
        return ennui(l.n, 'un-seul-egal',
            `Ligne ${l.n} : « ${mot} » demande une COMPARAISON, et tu as écrit un seul « = ».`,
            'Un « = » range une valeur dans une variable ; « == » demande si deux choses sont égales.');
    }
    return null;
}

// ── 7. TABULATIONS ET ESPACES MÉLANGÉS ────────────────────────────────────
//
// Invisible à l'œil, fatal à l'exécution, et impossible à trouver seul : deux
// lignes qui paraissent alignées ne le sont pas. Les tablettes et les claviers
// n'insèrent pas tous la même chose, donc ça arrive même sans faute de
// l'élève — raison de plus pour le dire au lieu de laisser « bad input ».
function tabulationEtEspaces(lignes) {
    const avecTab = lignes.filter((l) => !l.vide && l.tabulation);
    const avecEspaces = lignes.filter((l) => !l.vide && l.creux > 0 && !l.tabulation);
    if (!avecTab.length || !avecEspaces.length) return null;
    return ennui(avecTab[0].n, 'tabulation-et-espaces',
        `Ligne ${avecTab[0].n} : le décalage est fait avec une tabulation, ailleurs avec des espaces.`,
        'Deux lignes peuvent sembler alignées sans l\'être. Décale tout avec des espaces.');
}

// ── 8. L'INDENTATION — LE CŒUR DE LA DEMANDE ──────────────────────────────
//
// RÉMY : « l'aider sur l'indentation ». Trois cas, trois phrases, et aucun
// des trois ne se devine derrière « bad input on line 2 » :
//
//   a) la ligne d'après un « : » n'est pas décalée — le bloc est VIDE ;
//   b) une ligne est décalée alors que rien ne l'a ouverte ;
//   c) on revient en arrière, mais sur aucun niveau existant.
//
// On tient la pile des niveaux ouverts, exactement comme Python.
function indentation(lignes) {
    // LES LIGNES DE SUITE SONT ÉCARTÉES : à l'intérieur d'un crochet ouvert,
    // Python n'impose aucun décalage, et l'élève aligne comme il veut.
    const utiles = lignes.filter((l) => !l.vide && !l.suite);
    if (!utiles.length) return null;

    if (utiles[0].creux > 0) {
        return ennui(utiles[0].n, 'premiere-ligne-decalee',
            `Ligne ${utiles[0].n} : la première ligne du programme est décalée vers la droite.`,
            'Elle doit commencer tout à gauche, contre le bord.');
    }
    if (SUITES.includes((utiles[0].nu.match(/^[a-z]+/) || [])[0])) {
        const mot = utiles[0].nu.match(/^[a-z]+/)[0];
        return ennui(utiles[0].n, 'suite-sans-debut',
            `Ligne ${utiles[0].n} : « ${mot} » continue quelque chose qui n'a pas commencé.`,
            mot === 'else' || mot === 'elif'
                ? 'Il faut un « if » au-dessus, au même décalage.'
                : 'Il faut un « try » au-dessus, au même décalage.');
    }

    const niveaux = [0];
    for (let i = 0; i < utiles.length; i++) {
        const l = utiles[i], avant = utiles[i - 1];
        if (avant && avant.ouvre) {
            // (a) APRÈS UN DEUX-POINTS, ON DESCEND D'UN CRAN. Toujours.
            if (l.creux <= avant.creux) {
                return ennui(l.n, 'indentation-manquante',
                    `Ligne ${avant.n} finit par « : », donc la ligne ${l.n} doit être DÉCALÉE vers la droite.`,
                    `Ajoute ${PAS} espaces devant « ${apercu(l.nu)} ». C'est ce décalage qui dit que la ligne est DANS le bloc.`);
            }
            niveaux.push(l.creux);
            continue;
        }
        if (avant && l.creux > avant.creux) {
            // (b) ON NE DESCEND QUE DERRIÈRE UN DEUX-POINTS.
            return ennui(l.n, 'indentation-en-trop',
                `Ligne ${l.n} : elle est décalée, mais la ligne ${avant.n} ne finit pas par « : ».`,
                'Seule une ligne qui ouvre un bloc — if, for, while, def — permet de décaler la suivante. Ramène celle-ci à gauche.');
        }
        while (niveaux.length > 1 && l.creux < niveaux[niveaux.length - 1]) niveaux.pop();
        if (l.creux !== niveaux[niveaux.length - 1]) {
            // (c) LE RETOUR EN ARRIÈRE QUI NE RETOMBE SUR RIEN. C'est le seul
            // cas où Skulpt était clair (« unindent does not match any outer
            // indentation level ») — mais en anglais, et sans dire sur quoi il
            // FALLAIT retomber. On le dit.
            return ennui(l.n, 'indentation-bancale',
                `Ligne ${l.n} : elle est décalée de ${l.creux} espaces, et aucune ligne au-dessus ne l'est d'autant.`,
                `Les décalages possibles ici sont : ${niveaux.join(', ')} ou ${niveaux[niveaux.length - 1] + PAS} espaces.`);
        }
    }
    const dernier = utiles[utiles.length - 1];
    if (dernier.ouvre) {
        return ennui(dernier.n, 'bloc-vide',
            `Ligne ${dernier.n} finit par « : », mais rien ne suit.`,
            `Écris en dessous, décalée de ${PAS} espaces, la ligne qui doit être faite.`);
    }
    return null;
}

const apercu = (t) => (t.length > 24 ? t.slice(0, 22) + '…' : t);

/**
 * CONSEILLER UN DÉCALAGE RÉGULIER, SANS LE RÉCLAMER.
 *
 * Python accepte n'importe quelle largeur de décalage pourvu qu'elle soit
 * constante : « if x: » suivi de deux espaces est du Python juste. On ne le
 * refuse donc pas — ce serait inventer une faute, et la règle en tête de ce
 * fichier l'interdit. Mais quatre espaces est la convention du langage et
 * celle des manuels de Rémy, et un élève qui décale de deux aujourd'hui
 * lira de travers le code de demain. D'où un CONSEIL, rendu à part, que
 * l'interface montre en gris et sans empêcher de valider.
 */
export function conseilDuPas(source) {
    const utiles = lire(source).filter((l) => !l.vide && l.creux > 0);
    if (!utiles.length) return null;
    const creux = [...new Set(utiles.map((l) => l.creux))].sort((a, b) => a - b);
    if (creux.every((c) => c % PAS === 0)) return null;
    return `Tu décales de ${creux[0]} espaces ; l'usage en Python est d'en mettre ${PAS}.`;
}

// ── TRADUIRE CE QUE SKULPT, LUI, DIT BIEN ─────────────────────────────────
//
// Toutes ses erreurs ne sont pas opaques : `NameError` nomme la variable,
// `ZeroDivisionError` nomme la faute. Celles-là, il n'y a qu'à les mettre en
// français — et surtout à AJOUTER la phrase qui dit quoi faire, que Python
// ne donne jamais parce qu'il s'adresse à des gens qui savent déjà.
const TRADUCTIONS = [
    [/name '(.+?)' is not defined/, (m) =>
        [`« ${m[1]} » n'a jamais reçu de valeur.`,
            `Range quelque chose dedans avant de t'en servir : ${m[1]} = …`]],
    [/division by zero/, () =>
        ['Tu as divisé par zéro.',
            'Aucun nombre ne peut être divisé par 0 — même pas 0.']],
    [/list index out of range/, () =>
        ['Tu demandes une case qui n\'existe pas dans la liste.',
            'La première case porte le numéro 0 : une liste de 3 cases va de 0 à 2.']],
    [/unsupported operand type|cannot concatenate|can only concatenate/, () =>
        ['Tu mélanges un nombre et un texte.',
            'int("3") transforme le texte "3" en nombre ; str(3) fait l\'inverse.']],
    [/invalid literal for int/, () =>
        ['Ce texte ne se transforme pas en nombre.',
            'int() ne sait lire que des chiffres : « douze » ne passe pas, « 12 » oui.']],
    [/object is not callable/, () =>
        ['Tu mets des parenthèses derrière quelque chose qui n\'est pas une fonction.',
            'Si une variable porte le nom d\'une fonction, la fonction est perdue : change le nom de la variable.']],
    [/maximum recursion depth|too much recursion/, () =>
        ['Ton programme s\'appelle lui-même sans fin.',
            'Une fonction qui s\'appelle elle-même doit avoir un cas où elle s\'arrête.']]
];

/**
 * Rend `{ dire, aide }` pour une erreur d'EXÉCUTION de Skulpt, ou une
 * traduction par défaut quand on ne la connaît pas — jamais rien de vide :
 * un message d'erreur absent se lit comme un logiciel cassé.
 */
export function traduireErreur(erreur) {
    const texte = String(erreur && erreur.message ? erreur.message : erreur || '');
    for (const [motif, dire] of TRADUCTIONS) {
        const m = texte.match(motif);
        if (m) { const [d, a] = dire(m); return { dire: d, aide: a }; }
    }
    // ON NE MONTRE PAS L'ANGLAIS BRUT À UN ÉLÈVE DE SIXIÈME, mais on ne le
    // jette pas non plus : Rémy, lui, saura le lire par-dessus son épaule.
    return { dire: 'Ton programme s\'arrête en cours de route.',
        aide: 'Relis la ligne indiquée. (Message de Python : ' + texte.replace(/ on line \d+/, '') + ')' };
}
