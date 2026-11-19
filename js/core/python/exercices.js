// LES PROGRAMMES DE « PYTHON PAS À PAS », marche par marche.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « J'aimerai bien des exercices pour apprendre python.
// L'idéal serait de faire des qcm et après que l'élève tape, l'aider sur
// l'indentation. Être hyper hyper hyper progressif. »
//
// ── « HYPER HYPER HYPER PROGRESSIF » EST LA CONTRAINTE, PAS UN SOUHAIT ────
//
// Il l'a écrit trois fois de suite. On en a tiré une règle de fabrication :
// UNE MARCHE N'APPORTE QU'UNE SEULE IDÉE NEUVE, et celle d'avant est toujours
// encore vraie. D'où des marches qui paraissent se ressembler — « print d'un
// texte », puis « print d'un calcul », puis « print d'un calcul entre
// guillemets » — alors qu'elles séparent trois choses qu'un débutant
// confond, et qu'il confondra TOUT L'ANNÉE si on les lui donne ensemble.
//
// ── ET POURQUOI LES QCM VIENNENT D'ABORD ─────────────────────────────────
//
// « des qcm ET APRÈS que l'élève tape » : deux temps, dans cet ordre. Le QCM
// n'est pas une version au rabais de la saisie, c'est la marche d'avant — on
// apprend à LIRE un programme avant d'en écrire un, exactement comme on lit
// avant d'écrire. Un élève qui ne sait pas dire ce qu'affiche
// « for i in range(3): print(i) » ne peut pas l'écrire ; il peut seulement le
// recopier.
//
// Les treize marches de ce fichier sont toutes des QCM. La saisie commence
// après, avec l'éditeur — et elle s'appuie sur le vocabulaire que ces QCM
// auront posé : « dans la boucle », « décalée », « les deux-points ».

// ── LA MATIÈRE DES PROGRAMMES ─────────────────────────────────────────────
//
// On varie les mots et les nombres, jamais la forme : l'élève doit reconnaître
// la MÊME question d'une fois sur l'autre. Un exercice qui change de structure
// à chaque tirage se présente comme treize exercices différents.
const MOTS = ['Bonjour', 'Salut', 'Bravo', 'Au revoir', 'Coucou', 'Merci'];
const PRENOMS = ['Lea', 'Tom', 'Emma', 'Sacha', 'Noah', 'Jade'];
// LES MOTS SONT ACCENT-FREE EN APPARENCE SEULEMENT : ils vivent entre
// guillemets, donc Python accepte n'importe quel accent. On écrit donc le
// français correct — « étape » et non « etape », qui se lit comme une faute
// de frappe du professeur sur la photo d'écran. L'accent INTERDIT, c'est
// celui des NOMS DE VARIABLES, et il a sa marche à lui (voir `la-faute`).
const ACTIONS = ['tour', 'étape', 'ligne', 'passage'];

const choisir = (rng, liste) => liste[rng.int(0, liste.length - 1)];

/**
 * DEUX NOMBRES DONT LA SOMME ET LE PRODUIT DIFFÈRENT.
 *
 * 2 et 2 sont les seuls de 2 à 9 pour lesquels a + b = a × b. Un tirage sur
 * soixante-quatre posait donc « 4 » deux fois dans la même liste de
 * propositions : la bonne réponse et le leurre « tu as multiplié ». L'élève
 * voyait deux cases identiques, en cochait une, et avait raison ou tort selon
 * l'ordre du tirage. On les écarte à la source plutôt que de compter sur la
 * déduplication, qui aurait rendu trois propositions au lieu de quatre.
 */
const deuxNombres = (rng) => {
    let a = rng.int(2, 9), b = rng.int(2, 9);
    if (a + b === a * b) b = rng.int(3, 9);
    return [a, b];
};

/**
 * Le gabarit commun : ce que chaque marche doit rendre.
 *
 * PAS DE CHAMP « montrer » : l'énoncé ne surligne RIEN. Le premier jet en
 * avait un, et la marche « quelles lignes sont répétées par la boucle ? »
 * s'affichait avec les lignes 2 et 3 déjà peintes — la question donnait sa
 * réponse. Voir `enonceHtml` dans le générateur.
 */
const fait = (o) => ({ indices: [], leurres: [], ...o });

/* ── 1. UN SEUL PRINT, ET UN TEXTE ─────────────────────────────────────────
 *
 * La toute première marche n'apprend qu'une chose : ce qui est entre
 * guillemets ressort tel quel, et le reste (print, les parenthèses, les
 * guillemets eux-mêmes) ne s'affiche pas. C'est évident une fois su, et
 * c'est la faute la plus fréquente du premier jour.
 */
function afficher(rng) {
    const mot = choisir(rng, MOTS);
    return fait({
        source: `print("${mot}")`,
        question: 'Que va afficher ce programme ?',
        reponse: mot,
        leurres: [
            { value: `"${mot}"`, why: 'Les guillemets servent à DIRE à Python où le texte '
                + 'commence et où il finit. Ils ne s’affichent pas.' },
            { value: `print("${mot}")`, why: 'Python n’affiche pas le programme : il '
                + 'l’exécute. Seul ce qui est entre guillemets ressort.' },
            { value: 'print', why: '« print » est l’ORDRE d’afficher, pas ce qu’on affiche.' }
        ],
        explication: `Tout ce qui est entre guillemets s’affiche tel quel : ${mot}.`,
        indices: ['Regarde ce qu’il y a entre les guillemets.',
            'Les guillemets, les parenthèses et le mot « print » ne s’affichent jamais.']
    });
}

/* ── 2. UN CALCUL ──────────────────────────────────────────────────────── */
function calcul(rng) {
    const [a, b] = deuxNombres(rng);
    return fait({
        source: `print(${a} + ${b})`,
        question: 'Que va afficher ce programme ?',
        reponse: String(a + b),
        leurres: [
            { value: `${a} + ${b}`, why: 'Sans guillemets, Python CALCULE au lieu de '
                + 'recopier. Il affiche donc le résultat.' },
            { value: `${a}${b}`, why: 'Le « + » entre deux nombres est une addition, pas '
                + 'une mise bout à bout.' },
            { value: String(a * b), why: 'Le signe écrit est « + », pas « × ».' }
        ],
        explication: `Sans guillemets, Python calcule : ${a} + ${b} vaut ${a + b}.`,
        indices: ['Il n’y a pas de guillemets autour du calcul.',
            `Python calcule d’abord ${a} + ${b}, puis affiche le résultat.`]
    });
}

/* ── 3. LE MÊME CALCUL, MAIS ENTRE GUILLEMETS ──────────────────────────────
 *
 * LA MARCHE QUI SÉPARE LES DEUX PRÉCÉDENTES, et qui mérite d'exister seule.
 * Un élève qui a réussi 1 et 2 sans l'avoir vue croit que Python « comprend »
 * ce qu'il lit. Ici il découvre que non : Python obéit à un signe de
 * ponctuation.
 */
function texteOuCalcul(rng) {
    const [a, b] = deuxNombres(rng);
    return fait({
        source: `print("${a} + ${b}")`,
        question: 'Que va afficher ce programme ?',
        reponse: `${a} + ${b}`,
        leurres: [
            { value: String(a + b), why: 'Attention aux guillemets ! Ils disent à Python : '
                + 'affiche ce texte tel quel, SANS le calculer.' },
            { value: `"${a} + ${b}"`, why: 'Les guillemets ne s’affichent pas.' },
            { value: String(a * b), why: 'Le signe écrit est « + », et de toute façon '
                + 'les guillemets empêchent tout calcul.' }
        ],
        explication: `Les guillemets changent tout : ${a} + ${b} est ici un TEXTE, `
            + `et Python le recopie sans calculer. Sans guillemets, il aurait affiché ${a + b}.`,
        indices: ['Compare avec l’exercice d’avant : qu’est-ce qui a changé ?',
            'Ce qui est entre guillemets n’est jamais calculé.']
    });
}

/* ── 4. UNE VARIABLE ──────────────────────────────────────────────────── */
function variable(rng) {
    const nom = choisir(rng, ['a', 'n', 'x', 'nombre']);
    const v = rng.int(2, 20);
    return fait({
        source: `${nom} = ${v}\nprint(${nom})`,
        question: 'Que va afficher ce programme ?',
        reponse: String(v),
        leurres: [
            { value: nom, why: `Sans guillemets, ${nom} n’est pas un texte : c’est le NOM `
                + 'd’une boîte, et Python affiche ce qu’il y a dedans.' },
            { value: `${nom} = ${v}`, why: 'Python n’affiche que ce qu’on lui demande '
                + 'd’afficher, c’est-à-dire ce qui est dans les parenthèses du print.' },
            { value: 'rien', why: 'Le print de la ligne 2 affiche bien quelque chose.' }
        ],
        explication: `La ligne 1 range ${v} dans la boîte ${nom} ; la ligne 2 affiche ce `
            + `qu’il y a dedans, donc ${v}.`,
        indices: [`Que contient ${nom} au moment du print ?`,
            'Le signe « = » range une valeur dans une boîte qui porte un nom.']
    });
}

/* ── 5. DEUX RANGEMENTS DE SUITE : LE DERNIER GAGNE ────────────────────────
 *
 * La découverte que les lignes s'exécutent DANS L'ORDRE, de haut en bas, et
 * qu'une boîte ne garde qu'une chose. C'est l'idée la plus importante des
 * cinq premières marches, et elle ne se voit que sur cet exemple-là.
 */
function ordre(rng) {
    const nom = choisir(rng, ['a', 'n', 'x']);
    const v1 = rng.int(2, 9), v2 = rng.int(10, 20);
    return fait({
        source: `${nom} = ${v1}\n${nom} = ${v2}\nprint(${nom})`,
        question: 'Que va afficher ce programme ?',
        reponse: String(v2),
        leurres: [
            { value: String(v1), why: 'Les lignes s’exécutent dans l’ordre, de haut en bas. '
                + `La ligne 2 a REMPLACÉ ${v1} par ${v2}.` },
            { value: String(v1 + v2), why: 'Le second « = » ne s’ajoute pas au premier : '
                + 'il écrase ce qu’il y avait.' },
            { value: `${v1} puis ${v2}`, why: 'Il n’y a qu’un seul print, donc une seule '
                + 'ligne affichée.' }
        ],
        explication: `Une boîte ne contient qu’une chose à la fois. La ligne 2 remplace `
            + `${v1} par ${v2} ; le print affiche donc ${v2}.`,
        indices: ['Lis les lignes dans l’ordre, de haut en bas.',
            `Que contient ${nom} juste AVANT la ligne 3 ?`]
    });
}

/* ── 6. CALCULER AVEC DEUX VARIABLES ──────────────────────────────────── */
function calculVariable(rng) {
    const [a, b] = deuxNombres(rng);
    return fait({
        source: `a = ${a}\nb = ${b}\nprint(a * b)`,
        question: 'Que va afficher ce programme ?',
        reponse: String(a * b),
        leurres: [
            { value: String(a + b), why: 'Le signe écrit est « * », qui veut dire « × ».' },
            { value: 'a * b', why: 'Python remplace chaque nom par ce qu’il contient, '
                + 'puis calcule.' },
            { value: `${a} * ${b}`, why: 'Python ne se contente pas de remplacer : il va '
                + 'jusqu’au bout du calcul.' }
        ],
        explication: `Python remplace a par ${a} et b par ${b}, puis calcule : `
            + `${a} × ${b} = ${a * b}.`,
        indices: ['En Python, « * » est le signe de la multiplication.',
            `Remplace a par ${a} et b par ${b}, puis calcule.`]
    });
}

/* ── 7. CE QUE L'ÉLÈVE TAPE ENTRE DANS UNE BOÎTE ──────────────────────── */
function saisie(rng) {
    const tape = rng.int(3, 12);
    const f = rng.int(2, 5);
    return fait({
        source: `n = int(input("Un nombre : "))\nprint(n * ${f})`,
        question: `L’élève tape ${tape}, puis appuie sur Entrée. Qu’affiche le programme ?`,
        reponse: String(tape * f),
        leurres: [
            { value: String(tape), why: `Le print n’affiche pas n, mais n × ${f}.` },
            { value: `n * ${f}`, why: 'Python remplace n par ce que l’élève a tapé, '
                + 'puis calcule.' },
            { value: 'Un nombre : ', why: 'Ce texte-là s’affiche AVANT, pour demander. '
                + 'La question porte sur ce qui s’affiche après.' }
        ],
        explication: `input() met ce que l’élève tape dans la boîte n — ici ${tape}. `
            + `Le print affiche donc ${tape} × ${f} = ${tape * f}.`,
        indices: ['input() attend que l’élève tape quelque chose, et le range dans n.',
            `n contient ${tape} ; que vaut n × ${f} ?`]
    });
}

/* ── 8. LE SI, ET UNE SEULE DES DEUX BRANCHES ─────────────────────────── */
function siAlors(rng) {
    const seuil = rng.int(4, 9);
    const grand = rng.bool();
    const n = grand ? rng.int(seuil + 1, seuil + 6) : rng.int(0, seuil - 1);
    return fait({
        source: `n = ${n}\nif n > ${seuil}:\n    print("grand")\nelse:\n    print("petit")`,
        question: 'Que va afficher ce programme ?',
        reponse: grand ? 'grand' : 'petit',
        leurres: [
            { value: grand ? 'petit' : 'grand',
                why: `n vaut ${n}. Le test « n > ${seuil} » est donc ${grand ? 'VRAI' : 'FAUX'}, `
                    + `et c’est ${grand ? 'la ligne 3' : 'la ligne 5'} qui s’exécute.` },
            { value: 'grand puis petit', why: 'Un « si … sinon » choisit UNE des deux '
                + 'branches, jamais les deux.' },
            { value: 'rien', why: 'L’une des deux branches s’exécute toujours.' }
        ],
        explication: `n vaut ${n}, donc « n > ${seuil} » est ${grand ? 'vrai' : 'faux'} : `
            + `Python affiche « ${grand ? 'grand' : 'petit'} » et saute l’autre branche.`,
        indices: [`Commence par répondre à la question : est-ce que ${n} > ${seuil} ?`,
            'Si c’est vrai, c’est la ligne décalée sous le « if » ; sinon, celle sous le '
            + '« else ».']
    });
}

/* ── 8 bis. SINON SI — et il ne se lit QUE si le premier est faux ─────────
 *
 * RÉMY, 19 novembre : « il faut rajouter elif, else, while ».
 *
 * LA SEULE IDÉE NEUVE DE CETTE MARCHE, et elle est contre-intuitive : un
 * « elif » n'est PAS un second « if ». Python s'arrête à la première branche
 * vraie et saute toutes les autres — même si elles sont vraies aussi. C'est
 * exactement ce qu'un élève ne devine pas, et c'est pourquoi le programme est
 * tiré de façon à ce que DEUX conditions soient vraies à la fois : sans cela,
 * la marche ne distingue rien d'une suite de « if » indépendants.
 */
function sinonSi(rng) {
    // n EST CHOISI POUR QUE LES DEUX PREMIÈRES CONDITIONS SOIENT VRAIES.
    // « n > 10 » et « n > 5 » le sont toutes les deux dès que n dépasse 10 :
    // c'est le seul tirage qui enseigne quelque chose.
    const n = rng.int(11, 20);
    const source = [
        `n = ${n}`,
        'if n > 10:',
        '    print("grand")',
        'elif n > 5:',
        '    print("moyen")',
        'else:',
        '    print("petit")'
    ].join('\n');
    return fait({
        source,
        question: 'Que va afficher ce programme ?',
        reponse: 'grand',
        leurres: [
            { value: 'grand puis moyen', why: `n vaut ${n}, donc « n > 10 » ET « n > 5 » sont `
                + 'vrais tous les deux. Mais Python s’arrête à la PREMIÈRE branche vraie '
                + 'et saute toutes les suivantes : c’est toute la différence entre « elif » '
                + 'et un second « if ».' },
            { value: 'moyen', why: 'Python lit les branches DANS L’ORDRE, de haut en bas. '
                + `Comme ${n} > 10, il s’arrête à la première.` },
            { value: 'petit', why: '« else » n’est lu que si AUCUNE des branches au-dessus '
                + 'n’est vraie.' }
        ],
        explication: `n vaut ${n}. La ligne 2 est vraie, donc Python affiche « grand » et `
            + 'SAUTE tout le reste — le « elif » et le « else » ne sont même pas lus. Une '
            + 'seule branche s’exécute, toujours.',
        indices: ['Lis les branches dans l’ordre, et arrête-toi à la première qui est vraie.',
            `Est-ce que ${n} > 10 ?`]
    });
}

/* ── 9. COMBIEN DE FOIS ? ─────────────────────────────────────────────── */
function combienDeTours(rng) {
    const n = rng.int(3, 6);
    const quoi = choisir(rng, ACTIONS);
    return fait({
        source: `for i in range(${n}):\n    print("${quoi}")`,
        question: 'Combien de lignes ce programme affiche-t-il ?',
        reponse: String(n),
        leurres: [
            { value: String(n - 1), why: `range(${n}) donne ${n} valeurs : de 0 à ${n - 1}. `
                + `Cela fait bien ${n} tours.` },
            { value: '1', why: 'La ligne décalée sous le « for » est répétée à chaque tour.' },
            { value: String(n + 1), why: `range(${n}) s’arrête AVANT ${n} : il y a ${n} tours, `
                + 'pas un de plus.' }
        ],
        explication: `range(${n}) fait tourner la boucle ${n} fois, et la ligne décalée `
            + `s’exécute à chaque tour : ${n} lignes.`,
        indices: [`range(${n}) compte ${n} valeurs.`,
            'La ligne DÉCALÉE est celle qui se répète.']
    });
}

/* ── 10. ET ELLE COMMENCE À ZÉRO ──────────────────────────────────────────
 *
 * La faute la plus universelle du début de Python, et elle a sa marche.
 */
function deZero(rng) {
    const n = rng.int(3, 5);
    const vrai = Array.from({ length: n }, (_, k) => k).join('  ');
    return fait({
        source: `for i in range(${n}):\n    print(i)`,
        question: 'Que va afficher ce programme ?',
        reponse: vrai,
        leurres: [
            { value: Array.from({ length: n }, (_, k) => k + 1).join('  '),
                why: 'En Python, une boucle « range » commence toujours à 0, jamais à 1.' },
            { value: Array.from({ length: n + 1 }, (_, k) => k).join('  '),
                why: `range(${n}) s’arrête AVANT ${n} : la dernière valeur est ${n - 1}.` },
            { value: String(n), why: 'Le print affiche i à chaque tour, pas une seule fois '
                + 'à la fin.' }
        ],
        explication: `range(${n}) donne 0, 1, … , ${n - 1} — ${n} valeurs qui commencent `
            + 'à ZÉRO et s’arrêtent juste avant le nombre écrit.',
        indices: ['Par quoi commence une boucle range ?',
            `range(${n}) donne ${n} valeurs, de 0 à ${n - 1}.`]
    });
}

/* ── 10 bis. TANT QUE — une boucle qui s'arrête quand elle veut ───────────
 *
 * RÉMY, 19 novembre : « il faut rajouter elif, else, while ».
 *
 * CE QUI SÉPARE « while » DE « for », ET QUI EST TOUTE LA MARCHE : un « for »
 * sait d'avance combien de tours il fera, un « while » ne le sait pas. Il
 * REGARDE son test à chaque tour, et il s'arrête quand celui-ci devient faux.
 * Compter les tours demande donc de suivre la variable, pas de lire un nombre.
 */
function tantQue(rng) {
    const depart = rng.int(3, 6);
    const source = [
        `n = ${depart}`,
        'while n > 0:',
        '    print(n)',
        '    n = n - 1'
    ].join('\n');
    const vrai = Array.from({ length: depart }, (_, k) => depart - k).join('  ');
    return fait({
        source,
        question: 'Que va afficher ce programme ?',
        reponse: vrai,
        leurres: [
            { value: Array.from({ length: depart }, (_, k) => k + 1).join('  '),
                why: `n part de ${depart} et DIMINUE d’un à chaque tour : le compte à `
                    + 'rebours descend, il ne monte pas.' },
            { value: Array.from({ length: depart + 1 }, (_, k) => depart - k).join('  '),
                why: 'Quand n vaut 0, le test « n > 0 » est FAUX : la boucle s’arrête '
                    + 'AVANT d’afficher 0.' },
            { value: String(depart), why: 'Le print est DANS la boucle : il s’exécute à '
                + 'chaque tour, pas une seule fois.' }
        ],
        explication: `n part de ${depart}. À chaque tour, Python affiche n puis lui retire 1. `
            + 'Quand n arrive à 0, le test « n > 0 » devient faux et la boucle s’arrête : '
            + `${depart} lignes, de ${depart} à 1.`,
        indices: ['Écris la valeur de n à chaque tour, sur ton brouillon.',
            'La boucle s’arrête dès que « n > 0 » devient FAUX.']
    });
}

/* ── 10 ter. ET CELLE QUI NE S'ARRÊTE JAMAIS ─────────────────────────────
 *
 * LA FAUTE QUE TOUT LE MONDE FAIT UNE FOIS, et qui mérite sa marche : on
 * écrit le « while », on oublie de changer la variable, et le programme tourne
 * pour toujours. Sur l'ordinateur de la salle, cela se termine par un onglet
 * figé que l'élève ne sait pas rouvrir — autant lui montrer d'abord ici,
 * tranquillement, sur un programme qu'on LIT.
 */
function sansFin(rng) {
    const depart = rng.int(3, 6);
    const source = [
        `n = ${depart}`,
        'while n > 0:',
        '    print(n)'
    ].join('\n');
    return fait({
        source,
        question: 'Que fait ce programme ?',
        reponse: 'il ne s’arrête jamais',
        leurres: [
            { value: `il affiche ${depart} une fois`, why: 'Le print est dans la boucle, et '
                + 'rien n’a changé n : le test est encore vrai, donc on recommence.' },
            { value: `il affiche ${depart} fois le nombre ${depart}`,
                why: 'Rien dans la boucle ne change n : il n’y a aucune raison que le test '
                    + `« n > 0 » devienne faux. Comparé au programme d’avant, c’est la ligne `
                    + '« n = n − 1 » qui manque.' },
            { value: 'il n’affiche rien', why: `n vaut ${depart}, donc « n > 0 » est vrai dès `
                + 'le départ : la boucle démarre bien.' }
        ],
        explication: 'Rien dans la boucle ne change n : le test « n > 0 » reste vrai pour '
            + 'toujours, et le programme affiche le même nombre sans fin. UNE BOUCLE '
            + '« while » DOIT CONTENIR CE QUI FINIRA PAR RENDRE SON TEST FAUX — ici, la '
            + 'ligne « n = n − 1 » qui manque.',
        indices: ['Qu’est-ce qui pourrait rendre « n > 0 » faux ?',
            'Compare avec le programme de la marche d’avant : quelle ligne manque ?']
    });
}

/* ── 11. QUELLES LIGNES SONT DANS LA BOUCLE ? ──────────────────────────────
 *
 * LA MARCHE CHARNIÈRE, ET LA RAISON POUR LAQUELLE CET EXERCICE EXISTE.
 *
 * Rémy : « l'aider sur l'indentation ». On ne demande pas encore d'en écrire ;
 * on demande de la LIRE, c'est-à-dire de nommer ce que le décalage veut dire.
 * Tant que « dans la boucle » n'est pas un mot que l'élève emploie, aucune
 * aide à la saisie ne lui parlera.
 */
function dansLaBoucle(rng) {
    const n = rng.int(2, 4);
    const quoi = choisir(rng, ACTIONS);
    const source = [
        `for i in range(${n}):`,
        `    print("${quoi}")`,
        '    print(i)',
        'print("fini")'
    ].join('\n');
    return fait({
        source,
        question: 'Quelles lignes sont RÉPÉTÉES par la boucle ?',
        reponse: 'les lignes 2 et 3',
        leurres: [
            { value: 'les lignes 2, 3 et 4', why: 'La ligne 4 n’est pas décalée : elle est '
                + 'SORTIE de la boucle, et ne s’exécute qu’une fois, à la fin.' },
            { value: 'la ligne 2 seulement', why: 'Les lignes 2 ET 3 sont décalées du même '
                + 'nombre d’espaces : elles sont toutes les deux dans la boucle.' },
            { value: 'toutes les lignes', why: 'La ligne 1 est le « for » lui-même, et la '
                + 'ligne 4 n’est pas décalée.' }
        ],
        explication: 'Ce sont les lignes DÉCALÉES sous le « for » qui se répètent : les '
            + 'lignes 2 et 3. La ligne 4, collée à gauche, est sortie de la boucle.',
        indices: ['Suis le trait vertical : il marque le décalage.',
            'Une ligne décalée sous le « for » est dans la boucle ; une ligne collée à '
            + 'gauche en est sortie.']
    });
}

/* ── 12. DEUX PROGRAMMES QUI NE DIFFÈRENT QUE PAR UN DÉCALAGE ──────────────
 *
 * ET C'EST TOUT L'ARGUMENT DE PYTHON. Les deux programmes ont exactement les
 * mêmes mots, les mêmes nombres, les mêmes lignes ; quatre espaces les
 * séparent, et ils ne font pas la même chose. Aucune phrase ne dit cela aussi
 * bien que les deux programmes posés côte à côte.
 */
function deuxProgrammes(rng) {
    const n = rng.int(3, 4);
    const mot = choisir(rng, MOTS);
    const dedans = `for i in range(${n}):\n    print("${mot}")\n    print("---")`;
    const dehors = `for i in range(${n}):\n    print("${mot}")\nprint("---")`;
    // On tire QUELLE des deux questions on pose, pour que la réponse ne soit
    // pas toujours le même programme : un élève repère très vite « c'est
    // toujours le A », et il ne lit plus.
    const viseDedans = rng.bool();
    const combien = viseDedans ? n : 1;
    return fait({
        sources: [dedans, dehors],
        noms: ['A', 'B'],
        // « DANS QUEL PROGRAMME », ET NON « DANS LEQUEL DE CES DEUX » :
        // `tests/catalog.test.mjs` garde une règle payée deux fois dans la
        // même journée — une question qui dit « de ces » PROMET une liste, et
        // sur une feuille imprimée les propositions n'existent pas. Ici les
        // deux programmes sont bien sur le papier, mais pas les propositions
        // « les deux » et « aucun des deux » : la promesse était donc fausse
        // pour la moitié des réponses possibles. Reformulée, la question se
        // répond en écrivant A ou B, à l'écran comme sur la feuille.
        question: `Dans quel programme la ligne print("---") `
            + `s’affiche-t-elle ${combien === 1 ? 'UNE SEULE FOIS' : combien + ' FOIS'} ?`,
        reponse: viseDedans ? 'A' : 'B',
        leurres: [
            { value: viseDedans ? 'B' : 'A',
                why: viseDedans
                    ? 'Dans B, la dernière ligne n’est PAS décalée : elle est sortie de la '
                      + 'boucle et ne s’affiche qu’une fois.'
                    : `Dans A, la dernière ligne EST décalée : elle est dans la boucle et `
                      + `s’affiche ${n} fois.` },
            { value: 'les deux', why: 'Les deux programmes ont les mêmes mots, mais pas le '
                + 'même décalage — donc pas le même résultat.' },
            { value: 'aucun des deux', why: 'La ligne print("---") s’affiche dans les deux '
                + 'programmes ; la question est COMBIEN de fois.' }
        ],
        explication: 'Les deux programmes ont exactement les mêmes mots. Seule la dernière '
            + `ligne change de place : décalée (A), elle est DANS la boucle et sort ${n} `
            + 'fois ; collée à gauche (B), elle est SORTIE de la boucle et ne sort qu’une '
            + 'fois. En Python, le décalage n’est pas de la présentation : c’est le sens.',
        indices: ['Regarde la dernière ligne des deux programmes.',
            'Une ligne décalée sous le « for » se répète ; une ligne collée à gauche ne '
            + 's’exécute qu’une fois, après la boucle.']
    });
}

/* ── 13. TROUVER LA FAUTE ─────────────────────────────────────────────────
 *
 * ET ICI, LES PROPOSITIONS SONT LES PHRASES DU VÉRIFICATEUR LUI-MÊME.
 *
 * Ce n'est pas une coquetterie : c'est ce qui fait tenir les deux moitiés de
 * l'exercice ensemble. Quand l'élève passera à la saisie et qu'il lira
 * « ligne 2 : elle est décalée, mais la ligne 1 ne finit pas par : », il aura
 * déjà coché cette phrase dix fois dans un QCM. Le message d'erreur ne sera
 * pas une langue étrangère, ce sera une vieille connaissance.
 */
const FAUTES = [
    { code: 'for i in range(3):\nprint(i)',
      dire: 'Il manque le décalage à la ligne 2.',
      pourquoi: 'La ligne 1 finit par « : », donc ce qui suit doit être décalé vers la '
        + 'droite. Sans décalage, la boucle n’a rien à répéter.' },
    { code: 'print("Bonjour")\n    print("Salut")',
      dire: 'La ligne 2 est décalée sans raison.',
      pourquoi: 'On ne décale qu’APRÈS une ligne qui finit par « : ». La ligne 1 n’en a '
        + 'pas, donc la ligne 2 doit être collée à gauche.' },
    { code: 'for i in range(3)\n    print(i)',
      dire: 'Il manque les deux-points à la ligne 1.',
      pourquoi: 'En Python, « for », « if » et « while » finissent TOUJOURS par « : ».' },
    { code: 'n = 3\nif n = 3:\n    print("oui")',
      dire: 'Il faut deux signes « = » pour comparer.',
      pourquoi: 'Un seul « = » RANGE une valeur ; deux « == » demandent si deux choses '
        + 'sont égales.' },
    { code: 'print("Bonjour"',
      dire: 'Il manque une parenthèse fermante.',
      pourquoi: 'Chaque parenthèse ouverte doit être refermée, sinon Python attend la '
        + 'suite jusqu’à la fin du programme.' },
    { code: 'prenom = "Lea"\nprint(Prenom)',
      dire: 'Le nom de la ligne 2 n’est pas celui de la ligne 1.',
      pourquoi: 'Python distingue les majuscules des minuscules : « prenom » et « Prenom » '
        + 'sont deux boîtes différentes, et la seconde est vide.' }
];

function laFaute(rng) {
    const i = rng.int(0, FAUTES.length - 1);
    const f = FAUTES[i];
    const autres = FAUTES.filter((_, k) => k !== i);
    return fait({
        source: f.code,
        question: 'Ce programme ne marche pas. Pourquoi ?',
        reponse: f.dire,
        leurres: autres.slice(0, 3).map((a) => ({
            value: a.dire,
            why: 'Ce n’est pas ce qui cloche ici — relis les deux lignes l’une après l’autre.'
        })),
        explication: f.pourquoi,
        indices: ['Lis le programme ligne par ligne, comme Python le fait.',
            'Regarde la fin de la ligne 1, puis le début de la ligne 2.']
    });
}

/** Les treize fabricants, dans l'ordre des marches. */
export const FABRIQUES = {
    afficher, calcul, 'texte-ou-calcul': texteOuCalcul, variable, ordre,
    'calcul-variable': calculVariable, saisie, 'si-alors': siAlors,
    'sinon-si': sinonSi,
    'combien-de-tours': combienDeTours, 'de-zero': deZero,
    'tant-que': tantQue, 'sans-fin': sansFin,
    'dans-la-boucle': dansLaBoucle, 'deux-programmes': deuxProgrammes,
    'la-faute': laFaute
};
