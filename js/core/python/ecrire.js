// LES MARCHES OÙ L'ÉLÈVE TAPE — la seconde moitié de la demande.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « des qcm et APRÈS que l'élève tape, l'aider sur
// l'indentation ». Puis le 19 : « il faudrait que l'élève puisse faire des
// petits programmes ».
//
// ── CINQ MARCHES, ET LA QUANTITÉ DE TEXTE À TAPER EST LA PROGRESSION ─────
//
// « Hyper hyper hyper progressif », écrit trois fois. Ce qui monte d'une
// marche à l'autre n'est pas la difficulté du concept — ils ont tous été vus
// dans les seize QCM — c'est CE QU'IL FAUT PRODUIRE :
//
//   1. UN MOT à la place d'un trou. Le programme est écrit, il manque
//      « print ». On apprend que taper, ça marche.
//   2. UNE LIGNE entière, la dernière. Le reste est posé.
//   3. LE DÉCALAGE SEUL. Toutes les lignes sont là, aucune n'est décalée :
//      l'élève ne tape RIEN, il pose l'indentation avec les deux boutons.
//      C'EST LA MARCHE QUE RÉMY A DEMANDÉE, et elle n'existe nulle part
//      ailleurs : ni au tableau ni dans un manuel on ne peut isoler
//      l'indentation de l'écriture.
//   4. DEUX LIGNES à partir de rien.
//   5. UN PETIT PROGRAMME entier.
//
// ── ET CE QU'ON VÉRIFIE EST CE QUE LE PROGRAMME AFFICHE ──────────────────
//
// Pas le texte tapé. Un élève qui écrit « print('Bonjour') » avec des
// apostrophes au lieu de guillemets a écrit un programme juste, et Python le
// lui dira en affichant Bonjour. Comparer les CHAÎNES DE CARACTÈRES du
// programme reviendrait à noter la façon d'écrire au lieu du résultat — et à
// refuser des solutions correctes, ce qui est la pire chose qu'un exercice de
// programmation puisse faire.

const MOTS = ['Bonjour', 'Salut', 'Bravo', 'Coucou', 'Merci'];
const ACTIONS = ['tour', 'étape', 'ligne', 'passage'];
const choisir = (rng, liste) => liste[rng.int(0, liste.length - 1)];

/** Le gabarit commun : ce que chaque marche rend au générateur. */
const fait = (o) => ({ indices: [], ...o });

/* ── 1. UN MOT ──────────────────────────────────────────────────────────── */
function unMot(rng) {
    const mot = choisir(rng, MOTS);
    return fait({
        // LE TROU EST UNE LIGNE DE POINTS, et non une ligne vide : une ligne
        // vide ne dit pas qu'il manque quelque chose, elle dit qu'il n'y a
        // rien. Mesuré sur « Graduer un axe », où Rémy avait demandé la même
        // chose : « mets des pointillés ».
        depart: `.....("${mot}")`,
        consigne: `Remplace les points par le mot qui affiche. Le programme doit `
            + `écrire ${mot}.`,
        sortieAttendue: mot + '\n',
        solution: `print("${mot}")`,
        indices: ['Le mot qui affiche quelque chose en Python s’écrit en cinq lettres.',
            `Écris : print("${mot}")`]
    });
}

/* ── 2. UNE LIGNE ───────────────────────────────────────────────────────── */
function uneLigne(rng) {
    const a = rng.int(3, 9), b = rng.int(3, 9);
    return fait({
        depart: `a = ${a}\nb = ${b}\n`,
        consigne: `Les deux boîtes sont remplies. Ajoute la ligne qui affiche leur `
            + `SOMME. Le programme doit écrire ${a + b}.`,
        sortieAttendue: String(a + b) + '\n',
        solution: `a = ${a}\nb = ${b}\nprint(a + b)`,
        indices: ['Il faut un print, et dedans un calcul — sans guillemets, sinon '
            + 'Python recopierait au lieu de calculer.',
        'Écris : print(a + b)']
    });
}

/* ── 3. LE DÉCALAGE SEUL — la marche que Rémy a demandée ─────────────────
 *
 * RIEN À TAPER. Toutes les lignes sont écrites, aucune n'est décalée, et le
 * programme ne marche donc pas. L'élève pose l'indentation avec les deux
 * boutons, et c'est tout l'exercice.
 *
 * POURQUOI ELLE N'EXISTE NULLE PART AILLEURS : ni au tableau ni dans un
 * manuel on ne peut séparer l'indentation de l'écriture — on recopie un
 * programme entier, et le décalage vient avec. Ici il vient SEUL, et c'est la
 * seule façon de le travailler pour lui-même.
 */
function leDecalage(rng) {
    const n = rng.int(2, 4);
    const quoi = choisir(rng, ACTIONS);
    return fait({
        depart: `for i in range(${n}):\nprint("${quoi}")\nprint("fini")`,
        // LES DEUX FLÈCHES NE SONT PAS DANS L'ÉNONCÉ, ET C'EST VOULU.
        // Elles sont écrites sur les boutons, à deux centimètres sous le
        // code : les nommer suffit. Les METTRE dans la phrase obligeait à les
        // rafistoler dans le PDF, où elles s'impriment « ? ».
        consigne: 'Rien n’est décalé, donc ça ne marche pas. Avec les deux boutons, '
            + `mets la ligne 2 DANS la boucle. Il doit écrire ${quoi} ${n} fois, puis fini.`,
        // ── ET LA FEUILLE IMPRIMÉE NE PARLE PAS DE BOUTONS ──────────────
        //
        // DEUX RAISONS, et la seconde n'a été vue qu'en REGARDANT la feuille.
        // (1) Sur le papier il n'y a pas de boutons : un élève à qui l'on dit
        // « appuie sur ⇥ » cherche quelque chose qui n'existe pas.
        // (2) `⇤` et `⇥` ne sont pas dans la table de caractères d'un PDF :
        // ils s'imprimaient « ? ». L'épreuve `caracteresDuPapier` l'a dit, et
        // c'est elle qui m'a renvoyé à la première raison.
        consignePapier: `Recopie-le en décalant la ligne 2 d'un cran. Il doit écrire `
            + `${quoi} ${n} fois, puis fini.`,
        sortieAttendue: Array.from({ length: n }, () => quoi).join('\n') + '\nfini\n',
        solution: `for i in range(${n}):\n    print("${quoi}")\nprint("fini")`,
        indices: ['Clique dans la ligne 2, puis appuie UNE FOIS sur le bouton de droite.',
            'La ligne 3 reste collée à gauche : elle n’est pas dans la boucle, '
            + 'elle vient après.']
    });
}

/* ── 4. DEUX LIGNES ─────────────────────────────────────────────────────── */
function deuxLignes(rng) {
    const v = rng.int(5, 20);
    const nom = choisir(rng, ['a', 'n', 'x']);
    return fait({
        depart: '',
        consigne: `Écris un programme de DEUX lignes : range ${v} dans une boîte `
            + `appelée ${nom}, puis affiche ce qu’elle contient.`,
        sortieAttendue: String(v) + '\n',
        solution: `${nom} = ${v}\nprint(${nom})`,
        indices: ['La première ligne range, la seconde affiche.',
            `Écris : ${nom} = ${v}  puis  print(${nom})`]
    });
}

/* ── 5. UN PETIT PROGRAMME ──────────────────────────────────────────────── */
function petitProgramme(rng) {
    const n = rng.int(3, 5);
    const genre = rng.int(0, 1);
    if (genre === 0) {
        return fait({
            depart: '',
            consigne: `Écris un programme qui affiche les nombres de 0 à ${n - 1}, `
                + 'un par ligne.',
            sortieAttendue: Array.from({ length: n }, (_, k) => k).join('\n') + '\n',
            solution: `for i in range(${n}):\n    print(i)`,
            indices: ['Une boucle « for » et un « print » décalé en dessous.',
                `range(${n}) donne 0, 1, … , ${n - 1}.`]
        });
    }
    const seuil = rng.int(4, 8);
    const valeur = rng.bool() ? rng.int(seuil + 1, seuil + 5) : rng.int(0, seuil - 1);
    const dit = valeur > seuil ? 'grand' : 'petit';
    return fait({
        depart: `n = ${valeur}\n`,
        consigne: `La boîte n est remplie. Écris la suite : si n dépasse ${seuil}, le `
            + 'programme doit afficher grand ; sinon, petit.',
        sortieAttendue: dit + '\n',
        solution: `n = ${valeur}\nif n > ${seuil}:\n    print("grand")\nelse:\n    print("petit")`,
        indices: [`Il faut un « if n > ${seuil} : », puis un « else : ».`,
            'Les deux lignes qui affichent sont DÉCALÉES, chacune sous son mot.']
    });
}

/* ── 6 à 8. LIRE UN PROGRAMME ET ÉCRIRE CE QU'IL AFFICHE ─────────────────
 *
 * RÉMY, 19 novembre : « ça devrait être bon ». Il venait de taper, ligne par
 * ligne, la sortie d'une boucle qu'un QCM lui demandait de RECONNAÎTRE parmi
 * quatre. Écrire vaut mieux que choisir : au brevet on ne donne pas quatre
 * sorties au choix, et dérouler une boucle tour par tour dans sa tête n'a rien
 * à voir avec repérer la bonne ligne dans une liste.
 *
 * CES TROIS MARCHES NE SE LANCENT PAS. Ce que l'élève tape est une RÉPONSE,
 * pas un programme : on la compare au texte attendu. C'est la leçon directe de
 * ce qui lui est arrivé — ses cinq nombres chacun sur leur ligne formaient du
 * Python valide qui n'affiche RIEN, et le logiciel a comparé ce vide à la
 * bonne réponse.
 *
 * ET LA SORTIE ATTENDUE EST CALCULÉE ICI, pas devinée : chaque fabricant
 * déroule sa propre boucle en JavaScript, de sorte que l'énoncé et la réponse
 * ne peuvent pas diverger.
 */
const CONSIGNE_SORTIE = 'Écris ce que ce programme affiche, une ligne par ligne '
    + 'affichée.';

function sortieDeuxLignes(rng) {
    const mot = choisir(rng, MOTS);
    const a = rng.int(2, 9), b = rng.int(2, 9);
    return fait({
        genre: 'sortie',
        programme: `print("${mot}")\nprint(${a} * ${b})`,
        consigne: CONSIGNE_SORTIE,
        sortieAttendue: `${mot}\n${a * b}\n`,
        indices: ['Deux « print », donc DEUX lignes affichées.',
            `Les guillemets empêchent le calcul : la première ligne affiche le mot `
            + `tel quel, la seconde le RÉSULTAT de ${a} × ${b}.`]
    });
}

function sortieBoucle(rng) {
    const n = rng.int(3, 5);
    const quoi = choisir(rng, ACTIONS);
    const avecNombre = rng.bool();
    const lignes = avecNombre
        ? Array.from({ length: n }, (_, k) => String(k))
        : Array.from({ length: n }, () => quoi);
    return fait({
        genre: 'sortie',
        programme: avecNombre
            ? `for i in range(${n}):\n    print(i)`
            : `for i in range(${n}):\n    print("${quoi}")`,
        consigne: CONSIGNE_SORTIE,
        sortieAttendue: lignes.join('\n') + '\n',
        indices: [`range(${n}) donne ${n} tours.`,
            avecNombre
                ? `Une boucle commence à ZÉRO : 0, 1, … jusqu’à ${n - 1}.`
                : `La même ligne est affichée à chaque tour, donc ${n} fois.`]
    });
}

function sortieTantQue(rng) {
    const n = rng.int(3, 6);
    const monte = rng.bool();
    const lignes = monte
        ? Array.from({ length: n }, (_, k) => String(k + 1))
        : Array.from({ length: n }, (_, k) => String(n - k));
    return fait({
        genre: 'sortie',
        // LA DESCENTE EST CELLE DE LA CAPTURE DE RÉMY, au nombre près.
        programme: monte
            ? `n = 1\nwhile n <= ${n}:\n    print(n)\n    n = n + 1`
            : `n = ${n}\nwhile n > 0:\n    print(n)\n    n = n - 1`,
        consigne: CONSIGNE_SORTIE,
        sortieAttendue: lignes.join('\n') + '\n',
        indices: ['Déroule tour par tour : qu’affiche-t-il au premier tour ? et '
            + 'que vaut n juste après ?',
        monte ? `n part de 1 et monte jusqu’à ${n}.`
            : `n part de ${n} et descend jusqu’à 1 — pas jusqu’à 0, car la boucle `
                + 's’arrête dès que n n’est plus strictement positif.']
    });
}

/** Les huit fabricants, dans l'ordre des marches. */
export const FABRIQUES_ECRITURE = {
    'un-mot': unMot,
    'une-ligne': uneLigne,
    'le-decalage': leDecalage,
    'deux-lignes': deuxLignes,
    'petit-programme': petitProgramme,
    'sortie-deux-lignes': sortieDeuxLignes,
    'sortie-boucle': sortieBoucle,
    'sortie-tant-que': sortieTantQue
};
