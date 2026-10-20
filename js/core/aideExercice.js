// L'AIDE D'UN EXERCICE — ce qu'il faut faire, un exemple, la leçon.
//
// Le « ? » ouvrait un unique paragraphe : la consigne entière d'un trait,
// suivie des rappels de cours collés à sa suite dans le même bloc — sans
// retour à la ligne, parce que c'étaient des `<span>` dans un `<p>`. Rémy :
// « la mise en forme est maladroite, ça ne revient pas à la ligne, les aides
// ne sont pas hyper claires. On pourrait avoir un onglet exemple où on voit
// étape par étape. Je prends la consigne pour la multiplication, c'est dur à
// comprendre. »
//
// TROIS IDÉES.
//
//   1. UNE CONSIGNE A UNE TÊTE ET UNE QUEUE. La première phrase dit ce qu'on
//      doit faire ; tout le reste explique les réglages, les variantes, les
//      cas particuliers. Les afficher du même poids, c'est demander de lire
//      cinq lignes pour trouver la première. On sépare donc l'ESSENTIEL du
//      DÉTAIL, et le détail se lit en phrases distinctes, pas en pavé.
//   2. UN EXEMPLE VAUT MIEUX QU'UNE EXPLICATION, et il ne s'écrit pas à la
//      main. Chaque générateur produit déjà, pour chaque question, ses
//      `hints` — les indices dans l'ordre où on les donnerait — et son
//      `explanation`. Un exemple, c'est donc UNE VRAIE QUESTION de cet
//      exercice-ci, avec ses indices en étapes numérotées et sa réponse. Rien
//      à écrire dans les descripteurs, rien qui puisse se désynchroniser.
//   3. CE QUI N'A PAS DE GÉNÉRATEUR A UN ROBOT. La moitié du catalogue est
//      faite de jeux : ils n'ont pas de « question », ils ont un plateau. Pour
//      eux, l'exemple, c'est de regarder le robot jouer — et le dire vaut
//      mieux qu'un onglet vide.
//
// Module pur : pas de DOM. C'est ui/aideExercice.js qui peint.

import { figuresDe } from './visuelQuestion.js';

/** Coupe un texte en phrases, en respectant les abréviations courantes. */
/**
 * UNE IDÉE PAR LIGNE, DÈS QUE LE MESSAGE DÉPASSE LE COUP D'ŒIL.
 *
 * RÉMY : « une aide doit être visuelle et pas trop longue en explication comme
 * c'est parfois le cas pour certains exercices », et, juste avant : « un élève
 * qui galère c'est aussi un élève qui peut avoir du mal à lire ».
 *
 * MESURÉ AVANT D'ÉCRIRE CETTE FONCTION (tools/cequilFautLire.mjs) : 47 des 97
 * exercices à l'écran posent à l'élève un bloc de plus de 25 mots d'un seul
 * trait. Les réécrire un par un, c'est 47 textes à retoucher — et plusieurs
 * sont BONS : « Temps, Distance, Vitesse » faisait 44 mots, mais sur quatre
 * lignes, et se traverse en diagonale.
 *
 * CE QUI FATIGUE N'EST PAS LE TOTAL, C'EST LE PLUS LONG MORCEAU D'UN TRAIT.
 * Alors on ne réécrit pas : on AÈRE. Une phrase par ligne, comme un professeur
 * au tableau. Le texte ne change pas d'un mot, et les 97 exercices en
 * profitent le même jour.
 *
 * ON NE COUPE PAS UN MESSAGE COURT : « Ce n'est pas ça. Il te reste un essai. »
 * sur deux lignes n'aide personne et fait une carte bancale.
 *
 * ET L'ON RESPECTE LES RETOURS À LA LIGNE DÉJÀ ÉCRITS : `phrases` aplatit les
 * blancs, donc l'appliquer au texte entier collerait les trois formules de
 * « Temps, Distance, Vitesse » en une seule ligne — en croyant l'aérer. On
 * découpe ligne par ligne.
 */
export function aerer(texte, seuil = 15) {
    const t = String(texte == null ? '' : texte);
    if (!t.trim() || t.trim().split(/\s+/).length <= seuil) return t;
    return t.split('\n')
        .map(l => phrases(l).map(decouperLaChaine).join('\n'))
        .join('\n');
}

// UNE SUITE D'ÉTAPES N'EST PAS UNE PHRASE, ET SE LIT EN COLONNE.
//
// Mesuré sur les deux plus longues du catalogue, qui ne sont pas du français :
//
//   · Pythagore : « RT² = RS² + ST² ; RS² = RT² − ST² ; RS² = 13² − 12² ;
//     RS² = 169 − 144 ; RS² = 25 ; RS = √25 = 5 cm » — 39 mots d'un trait, et
//     c'est un CALCUL. Sur le cahier, il s'écrit une ligne par étape, aligné
//     sur le signe égal ; d'un seul tenant, il ne se lit pas du tout ;
//   · les Dominos : « DÉPART | 4 × 5 → 20 | 3 × 9 → 27 | … » — 51 mots, et
//     c'est une CHAÎNE, c'est-à-dire la liste des dominos posés.
//
// On coupe donc aussi sur « ; » et sur « | », qui ne séparent jamais deux mots
// d'une même idée : ce sont les séparateurs qu'on emploie en écrivant des
// étapes à la suite faute de pouvoir aller à la ligne.
function decouperLaChaine(phrase) {
    return phrase.split(/\s*[;|]\s+/).map(apresLesDeuxPoints).join('\n');
}

// LE DEUX-POINTS EST UNE RESPIRATION, et c'est le dernier gros morceau.
//
// Ce qui restait après les deux premières règles, mesuré : des phrases de
// trente mots bâties sur « … : … : … ». Coupées aux deux-points, elles
// deviennent la correction telle qu'on l'écrit au tableau —
//
//   (−4) et (−4) ont le même signe :
//   on ajoute les distances à zéro (les valeurs absolues) :
//   4 + 4 = 8, et on garde ce signe :
//   −8.
//
// SEULEMENT QUAND LE MORCEAU EST LONG. « Il est 5 h 00 : bravo » n'a aucun
// besoin de deux lignes, et une carte de retour hachée menu se lit plus mal
// qu'une phrase.
function apresLesDeuxPoints(bout) {
    if (bout.trim().split(/\s+/).length <= 15) return bout;
    return bout.split(/\s+:\s+/).map((p, i, l) => (i < l.length - 1 ? p + ' :' : p)).join('\n');
}

export function phrases(texte) {
    const t = String(texte || '').replace(/\s+/g, ' ').trim();
    if (!t) return [];
    // On coupe après . ! ? ou : suivis d'une espace et d'une majuscule (ou
    // d'un guillemet ouvrant, fréquent ici : « Le réglage « Jusqu'à » … »).
    // UNE PHRASE DE MATHÉMATIQUES NE COMMENCE PAS TOUJOURS PAR UNE MAJUSCULE.
    // Mesuré sur « Factoriser » : « … = (x − 2)(2x + 3). −3x + 6 = −3(x − 2) —
    // c'est là que le facteur commun se cache. » Le point est bien là, mais la
    // suite commence par un SIGNE MOINS, et la coupure ne se faisait pas : 31
    // mots d'un trait au lieu de deux lignes. On accepte donc aussi ce par quoi
    // commence un calcul — parenthèse, signe, racine.
    // ET ELLE COMMENCE PARFOIS PAR UNE INCONNUE. Mesuré sur le même
    // exercice : « … = (x − 3)(x + 3)(5x + 3). x² − 9 se factorise en … » —
    // la suite commence par « x² », donc en minuscule, et les deux phrases
    // restaient collées (31 mots). On accepte une lettre seule suivie d'un
    // signe : c'est une inconnue qui entame un calcul, jamais un mot.
    return t.split(/(?<=[.!?])\s+(?=[«"(\[+−–√A-ZÀÂÉÈÊËÎÏÔÖÙÛÜÇ0-9]|[a-z][²³]?\s*[=−+×÷])/)
        .map(p => p.trim()).filter(Boolean);
}

/**
 * LA TÊTE ET LA QUEUE D'UNE CONSIGNE.
 *
 * L'essentiel est la première phrase — sauf si elle est très courte (« Lis le
 * nombre. »), auquel cas la suivante la complète : une consigne de quatre mots
 * en gros caractères tout en haut d'un panneau vide n'aide personne.
 */
export function decouperConsigne(texte) {
    const p = phrases(texte);
    if (!p.length) return { essentiel: '', details: [] };
    const essentiel = [p[0]];
    if (p.length > 1 && p[0].length < 45) essentiel.push(p[1]);
    return { essentiel: essentiel.join(' '), details: p.slice(essentiel.length) };
}

/**
 * L'EXEMPLE, à partir d'une question réellement engendrée.
 *
 * Les indices sont donnés dans l'ordre où l'exercice les donnerait. Le
 * DERNIER indice est souvent la réponse elle-même (« 10 × 6 = 60. ») : le
 * garder ferait deux fois la même ligne, l'explication venant juste après. On
 * l'écarte quand il redit l'explication.
 */
export function etapesExemple(item) {
    if (!item) return null;
    const question = (item.prompt && (item.prompt.text || item.prompt.html)) || '';
    // LA FIGURE FAIT PARTIE DE LA QUESTION, et pas de la décoration.
    //
    // RÉMY, capture de l'aide à l'appui : « dans l'aide j'ai cela, mais il
    // manque le schéma ». L'exemple affichait « Comment note-t-on cette
    // figure ? » SANS la figure — c'est-à-dire une question mot pour mot
    // impossible à résoudre, sur l'écran qui existe pour expliquer.
    //
    // LA CAUSE : `prompt.text` est la phrase SEULE ; le dessin est dans
    // `prompt.html`. On prenait `text || html`, donc jamais le dessin dès que
    // la phrase existait — c'est-à-dire toujours.
    //
    // C'EST LA DEUXIÈME FOIS, ET `figuresDe` EST NÉE DE LA PREMIÈRE. Rémy,
    // alors sur le carnet d'erreurs : « quand il y a quelque chose de visuel,
    // il faut afficher ce visuel ». On réemploie donc le même extracteur
    // plutôt que d'en écrire un second qui divergerait.
    const explication = String(item.explanation || '').trim();
    const bruts = (item.hints || []).map(h => String(h || '').trim()).filter(Boolean);
    const memeChose = (a, b) => normaliser(a) === normaliser(b);
    const etapes = bruts.filter((h, i) =>
        !(i === bruts.length - 1 && explication && memeChose(h, explication)));
    return {
        question: String(question).trim(),
        figures: figuresDe(item.prompt && item.prompt.html),
        etapes,
        reponse: item.answer === undefined || item.answer === null ? '' : String(item.answer),
        explication
    };
}

const normaliser = (s) => String(s).toLowerCase()
    .replace(/[\s.;,!?]/g, '')
    .replace(/[×x*]/g, '×');

/**
 * CE QUI NE REGARDE QUE LE PROFESSEUR : « Dix marches. », « Trois temps. »
 *
 * RÉMY, devant le nouvel écran d'apprentissage : « tu vois tu écris dix
 * marches, etc, on s'en fiche en tant qu'élève ».
 *
 * Il a raison, et c'est une question de DESTINATAIRE. Le champ `instruction`
 * du catalogue est écrit pour lui : il dit comment l'exercice est bâti, par où
 * il monte, ce qu'il travaille. Ces phrases-là sont exactement ce qu'il faut
 * savoir pour CHOISIR un exercice, et exactement ce dont un enfant de onze ans
 * n'a rien à faire au moment de commencer.
 *
 * MESURÉ sur les 236 exercices du catalogue : 21 consignes ouvrent sur une
 * phrase de cinq mots ou moins, et huit d'entre elles ne font qu'annoncer la
 * structure — « Onze marches. », « Douze marches, deux questions chacune. »,
 * « Six étapes qui se cochent. » On les reconnaît à ce qu'elles COMPTENT
 * quelque chose du dispositif, et c'est tout ce qu'elles font.
 */
// `\b` NE MARCHE PAS DEVANT UN ACCENT, et c'est un piège silencieux : en
// JavaScript, `\b` se calcule sur [A-Za-z0-9_], donc « é » est un caractère
// NON-mot — il n'y a aucune frontière entre l'espace et le « é » de
// « étapes », et /\bétapes\b/ ne trouve jamais rien. Mesuré : « Six étapes
// qui se cochent. » passait au travers. On écrit donc les bornes à la main,
// avec les lettres accentuées dedans.
const MOTS_DE_STRUCTURE = new RegExp(
    '(?:^|[^a-zà-öø-ÿ])'
    + '(marches?|paliers?|niveaux?|temps|étapes?|usages?|barreaux|séries?|manches?)'
    + '(?![a-zà-öø-ÿ])', 'i');

const compterLesMots = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

const estDuRangement = (phrase) =>
    compterLesMots(phrase) <= 6 && MOTS_DE_STRUCTURE.test(phrase);

/**
 * LA PHRASE QU'ON MONTRE À L'ÉLÈVE AVANT DE COMMENCER.
 *
 * RÉMY : « il faut vraiment vraiment être court ».
 *
 * ON PREND LA CONSIGNE DE PAPIER QUAND ELLE EXISTE, et c'est le point : elle
 * est déjà écrite pour un élève, puisqu'elle s'imprime en tête de sa feuille.
 * MESURÉ : 134 exercices en ont une, 8 mots en médiane — contre 95 mots pour
 * la consigne du « Détour par le Nombre Rond ». On ne réécrit donc rien : on
 * cesse d'aller chercher le mauvais champ.
 *
 * SANS ELLE, la première phrase de la consigne du professeur, le rangement
 * écarté. Et si tout est du rangement, on rend la première phrase quand même :
 * mieux vaut une phrase qui ne sert qu'à moitié qu'un écran muet.
 */
export function phrasePourLEleve(exo, plafond = 20) {
    if (!exo) return '';
    // ON NE COUPE PAS AU MOT PRÈS : une phrase amputée ne veut plus rien dire.
    // On ajoute des phrases ENTIÈRES tant qu'on reste sous le plafond, et la
    // première passe toujours — mieux vaut une phrase trop longue qu'un écran
    // muet. MESURÉ sur les 236 exercices : 9 mots en médiane.
    const assembler = (liste) => {
        const out = [];
        let n = 0;
        for (const p of liste) {
            if (out.length && n + compterLesMots(p) > plafond) break;
            out.push(p);
            n += compterLesMots(p);
        }
        return out.join(' ');
    };
    const papier = String(exo.consignePapier || '').trim();
    if (papier) return assembler(phrases(papier));
    const p = phrases(exo.instruction).filter(x => !estDuRangement(x));
    return assembler(p.length ? p : phrases(exo.instruction));
}

/**
 * Un exemple est-il possible ? Il faut un générateur — un jeu de plateau n'a
 * pas de « question » à montrer, il a un robot.
 */
export const peutMontrerUnExemple = (exo) => !!(exo && exo.generatorId);

/**
 * UNE QUESTION COMME CELLES DE CET EXERCICE, choisie pour ce qu'elle MONTRE.
 *
 * ON EN TIRE PLUSIEURS ET L'ON GARDE LA PLUS INSTRUCTIVE. Un tirage au hasard
 * tombe volontiers sur « 2 × 2 = ? » : c'est une question valable de
 * l'exercice, et un exemple inutile — il n'a rien à expliquer. Celle qui porte
 * le plus d'indices est celle qui a le plus à dire.
 *
 * CETTE FONCTION VIT ICI, ET NON DANS LE PANNEAU D'AIDE, depuis que l'écran
 * d'apprentissage en a besoin lui aussi. Rémy : « il faut faire plus court,
 * plus simple, un exemple ». Deux copies auraient donné deux exemples
 * différents du même exercice selon la porte par laquelle on arrive — et
 * surtout, l'une des deux aurait cessé d'évoluer avec l'autre.
 *
 * @param {Object} exo        l'exercice du catalogue
 * @param {Object} generateur le générateur, déjà résolu : le noyau de l'aide
 *                            ne connaît pas le registre, et c'est ce qui le
 *                            garde éprouvable sans DOM.
 * @param {Function} faireRng (graine) => rng
 * @param {string} graine     de quoi redonner le MÊME exemple, ou un autre
 */
export function meilleurExemple(exo, generateur, faireRng, graine = '', candidats = 4) {
    if (!exo || !generateur || typeof generateur.generate !== 'function') return null;
    let meilleur = null;
    for (let k = 0; k < candidats; k++) {
        try {
            const item = generateur.generate({ ...(exo.params || {}) }, {
                rng: faireRng(`exemple-${exo.id}-${graine}-${k}`),
                weakTables: [],
                difficulty: (exo.params && exo.params.difficulty) || null,
                index: k
            });
            const ex = etapesExemple(item);
            if (!ex || !ex.question) continue;
            if (!meilleur || ex.etapes.length > meilleur.etapes.length) meilleur = ex;
        } catch (e) { /* ce tirage-là ne passe pas, un autre passera */ }
    }
    return meilleur;
}

/** Les rappels de cours, sans doublon et bornés : trois suffisent à relire. */
export function leconsDe(liste, maximum = 3) {
    return [...new Set((liste || []).map(l => String(l || '').trim()).filter(Boolean))]
        .slice(0, maximum);
}

/**
 * LES ONGLETS RÉELLEMENT OFFERTS. Un onglet vide est pire qu'un onglet absent :
 * on clique, il ne se passe rien, et l'on cesse de croire au panneau.
 */
export function ongletsPour({ exo, lecons = [] } = {}) {
    const onglets = [{ id: 'consigne', label: 'Ce qu\'il faut faire' }];
    // « Le robot joue » plutôt que « Voir jouer » : c'est le nom que portent
    // désormais la bande de démonstration et le bouton de l'en-tête, et l'élève
    // doit reconnaître la même chose sous le même mot.
    onglets.push({ id: 'exemple', label: peutMontrerUnExemple(exo) ? 'Un exemple' : 'Le robot joue' });
    if (lecons.length) onglets.push({ id: 'lecon', label: 'La leçon' });
    return onglets;
}
