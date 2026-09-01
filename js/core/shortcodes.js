// Codes de partage de parcours.
//
// L'ancien format encodait le jeu sur 2 lettres via une table écrite à la
// main (8 jeux sur 15 y figuraient ; les autres devenaient « XX » et
// disparaissaient silencieusement), le nombre de questions sur 1 lettre, et
// les tables en lettres. Impossible de coder une politique, un barème, un
// paramètre non numérique.
//
// La table écrite à la main est revenue depuis, mais pour une autre raison et
// sans le défaut : elle ne sert plus qu'au CODE COURT (voir plus bas), elle
// couvre tout le catalogue, et un test échoue si un exercice y manque. Rien
// ne peut plus disparaître en silence.
//
// Format v2 : le parcours est sérialisé en JSON compact puis encodé en
// base64url. Rien à maintenir quand on ajoute un exercice, et un parcours
// complet (politique + barème + surcharges) tient dans un lien.
//
// Un code v2 commence par « M2- ». Les anciens codes restent décodables.

import { normalizePath, makePath, questionsConseilleesDe } from './path.js';
import { getExerciseById } from '../data/catalog.js';
import { defaultPolicy, resolvePolicy, apprentissagePolicy, evaluationPolicy, MODES } from './policy.js';
import { SEUIL_DEFAUT } from './recompenses.js';
import { seuilConseille } from './seuilEtape.js';
import { CODES_EXERCICES, EXERCICE_PAR_IDENTITE } from '../data/codesExercices.js';

const PREFIX = 'M2-';

/**
 * LE CODE COURT — TROIS LETTRES, pour l'usage le plus fréquent.
 *
 * « Fais l'exercice sur les relatifs ce soir » n'a pas besoin d'un parcours :
 * c'est UN exercice, avec ses réglages d'usine. Le format complet coûtait
 * pourtant 81 caractères de base64 — à recopier sur un téléphone, en devoirs,
 * c'est une faute de frappe garantie et un élève qui abandonne.
 *
 * DEUX LETTRES D'IDENTITÉ, UNE LETTRE DE CONTRÔLE. Rémy : « pourquoi pas 2
 * caractères, ça FAIT 26*26 possibilités de jeu ». C'est vrai : 23 lettres au
 * carré font 529 places, largement de quoi loger les 139 exercices. Mais on a
 * mesuré ce que deux lettres SEULES coûtaient, sur cette table-ci : sur les
 * 6 116 façons de se tromper d'une lettre, 2 440 tombent sur un AUTRE exercice
 * du catalogue. Deux fois sur cinq. Il s'ouvre sans un mot, l'élève travaille
 * sagement la mauvaise chose, et personne ne le sait. (C'est même pire que le
 * hasard, justement parce que les codes sont mnémoniques : les exercices d'une
 * même famille se ressemblent, donc leurs codes se touchent.)
 *
 * On aurait pu allonger l'identité — plus de places, moins de voisins occupés.
 * Mais rallonger ne fait que RARÉFIER la faute silencieuse, jamais disparaître.
 * La troisième lettre, elle, ne porte aucune information : elle vérifie les
 * deux autres, et ramène le risque à zéro. Une lettre de plus, et c'est une
 * garantie au lieu d'une probabilité.
 *
 * CE QU'ELLE GARANTIT, exactement — et c'est démontrable, pas empirique :
 *   • toute faute d'UNE lettre, à n'importe laquelle des trois places, est
 *     rejetée (message d'erreur, jamais un mauvais exercice) ;
 *   • l'inversion des deux lettres d'identité est rejetée aussi.
 * CE QU'ELLE NE GARANTIT PAS, et il faut le dire : les CHIFFRES du nombre de
 * questions ne sont pas protégés. « ARF-12 » mal recopié en « ARF-13 » donne
 * treize questions au lieu de douze. C'est délibéré : l'exercice reste le bon,
 * la faute est visible et sans gravité, et protéger le nombre coûterait une
 * lettre de plus à dicter pour un risque qui ne fait pas travailler à côté.
 * La démonstration tient à deux choses : l'alphabet compte 23 lettres, et 23
 * est PREMIER. Le contrôle vaut (1×première + 2×deuxième) modulo 23 ; changer
 * une lettre de d ≠ 0 change le contrôle de d ou de 2d, et ni l'un ni l'autre
 * n'est nul modulo un nombre premier. Inverser les deux le change de
 * (première − deuxième), nul seulement si les lettres étaient identiques —
 * auquel cas il n'y a rien à inverser.
 *
 * L'alphabet écarte I, O et Q : recopiés à la main ils deviennent 1, 0 et O.
 * Il ne contient AUCUN chiffre, et c'est utile deux fois — plus aucune
 * confusion possible entre une lettre et un chiffre, et le nombre de questions
 * écrit à la suite se sépare tout seul du code.
 */
const ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ';   // 23 lettres — 23 est premier
const LONGUEUR_IDENTITE = 2;
const LONGUEUR_COURT = LONGUEUR_IDENTITE + 1;

/** La lettre qui vérifie les deux autres : (1×a + 2×b) modulo 23. */
function lettreDeControle(identite) {
    let somme = 0;
    for (let i = 0; i < identite.length; i++) {
        const rang = ALPHABET.indexOf(identite[i]);
        if (rang < 0) return null;
        somme += (i + 1) * rang;
    }
    return ALPHABET[somme % ALPHABET.length];
}

/**
 * @returns {string} les trois lettres de l'exercice, ou '' s'il n'a pas encore
 * d'identité dans la table. Le vide n'est pas une panne : l'appelant retombe
 * alors sur le format complet, qui sait tout coder.
 */
export function codeCourt(exerciseId) {
    const identite = CODES_EXERCICES[exerciseId];
    if (!identite) return '';
    const controle = lettreDeControle(identite);
    return controle ? identite + controle : '';
}

/**
 * LE NOMBRE DE QUESTIONS ÉCRIT APRÈS LE CODE, en clair : « TPW-12 ».
 *
 * En clair, et non encodé : c'est justement ce que le professeur veut pouvoir
 * dicter et l'élève relire. Deux chiffres au plus — au-delà de quatre-vingt
 * dix-neuf questions, ce n'est plus un devoir du soir.
 *
 * ET LE SÉPARATEUR NE COMPTE PAS. Un code écrit au tableau se recopie comme on
 * l'entend : « TPW-12 », « tpw 12 », « TPW12 », un tiret long parce que le
 * traitement de texte l'a changé. On ne lit donc pas un séparateur : le code
 * n'a que des lettres, le nombre n'a que des chiffres, la coupure est là où
 * les unes cèdent la place aux autres. Tout le reste tombe au nettoyage.
 *
 * ET PLUSIEURS EXERCICES S'ÉCRIVENT À LA SUITE : « ARF-12-TPW-20 ». Rémy :
 * « pourquoi du coup les liens sont si grands lorsqu'on met par exemple deux
 * exercices ? » Parce que le format complet transportait le NOM DE FICHIER de
 * chaque exercice en toutes lettres — « num-relatifs-addition », vingt-et-un
 * caractères, puis un tiers de plus une fois passé en base64. Deux exercices
 * coûtaient 161 caractères. Depuis que chaque exercice a ses deux lettres, il
 * n'y a plus de raison : on enchaîne les codes courts, et les mêmes 161
 * caractères en font 13.
 *
 * La lecture reste sans ambiguïté SANS séparateur, et c'est ce qui permet au
 * nettoyage de tout jeter : trois lettres, puis zéro à deux chiffres, et on
 * recommence. « ARF12TPW20 » se relit aussi bien que « ARF-12 TPW-20 ».
 */
const MOTIF_ETAPE = /([A-Z]{3})([0-9]{0,2})/y;

function decouperChaine(code) {
    const brut = normaliserCourt(code);
    if (!brut) return null;
    const etapes = [];
    let i = 0;
    while (i < brut.length) {
        MOTIF_ETAPE.lastIndex = i;
        const m = MOTIF_ETAPE.exec(brut);
        if (!m || m.index !== i) return null;
        const identite = m[1].slice(0, LONGUEUR_IDENTITE);
        // Le contrôle d'abord : un code faux doit être refusé, pas interprété.
        if (m[1][LONGUEUR_IDENTITE] !== lettreDeControle(identite)) return null;
        const exerciseId = EXERCICE_PAR_IDENTITE.get(identite);
        if (!exerciseId || !getExerciseById(exerciseId)) return null;
        const n = m[2] ? Number(m[2]) : null;
        if (m[2] && !(n >= 1 && n <= 99)) return null;
        etapes.push({ exerciseId, questions: n });
        i = MOTIF_ETAPE.lastIndex;
    }
    return etapes.length ? etapes : null;
}

/** Le découpage d'un code à UN seul exercice, ou null. */
function decouperCodeCourt(code) {
    const etapes = decouperChaine(code);
    return (etapes && etapes.length === 1) ? etapes[0] : null;
}

/**
 * Le code tel qu'on l'écrit au tableau : « TP-W » se lit, « tpw » aussi.
 *
 * On ne remplace plus rien ici. L'ancien code mélangeait lettres et chiffres et
 * devait deviner (« O » vaut-il zéro ?) ; celui-ci n'a que des lettres, et un
 * caractère qui n'est pas de l'alphabet fait simplement échouer le code — ce
 * qui est le bon comportement : mieux vaut « code inconnu » qu'un exercice pris
 * au hasard.
 */
export const normaliserCourt = (code) => String(code || '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Le nombre d'unités d'un exercice laissé « tel quel ».
 *
 * Ce n'est plus dix pour tout le monde : une grille de sudoku, une partie
 * d'échecs et une addition ne se comptent pas pareil. Le code court dit « cet
 * exercice, tel quel » — encore faut-il que « tel quel » veuille dire la même
 * chose à l'écriture et à la relecture.
 */
const telQuel = questionsConseilleesDe;

/**
 * Cette étape se réduit-elle à « cet exercice, tel quel » ?
 *
 * LE NOMBRE DE QUESTIONS NE DISQUALIFIE PLUS. Rémy : « pour envoyer un code
 * juste sur un exercice avec le nombre de questions, comment fait-on ?
 * L'idéal serait que le code soit hyper court. » Il n'y avait pas de moyen :
 * changer le compte faisait basculer sur le format complet — quatre-vingts
 * caractères de base64 pour la seule différence d'un nombre. On l'écrit donc
 * APRÈS le code, en clair : « TPW-12 », six caractères qu'on dicte encore.
 *
 * Le seuil suit la règle des 70 % comme partout ailleurs : il n'est pas dans
 * le code parce qu'il se recalcule. Encore faut-il que celui de l'étape SOIT
 * celui-là : sinon le code mentirait sur ce qu'il rend, et on repasse au
 * format complet.
 */
function etapeSimple(s) {
    if (!s || !s.exerciseId) return false;
    if (s.overrides && Object.keys(s.overrides).length) return false;
    if ((s.weight || 1) !== 1 || s.timeLimit) return false;
    // Une étape-jeu, une étape sans total, une graine imposée : trois choses
    // que la chaîne ne sait pas dire. Les taire ferait d'un jeu de récompense
    // un exercice ordinaire — c'est le format complet qui doit prendre.
    if (s.bonus || s.sansTotal || s.forceSeed) return false;
    const n = s.nbItems || telQuel(s.exerciseId);
    if (!Number.isInteger(n) || n < 1 || n > 99) return false;
    const seuilAttendu = seuilConseille(n);
    const seuil = (s.threshold === null || s.threshold === undefined) ? seuilAttendu : s.threshold;
    return seuil === seuilAttendu;
}

/** La politique est-elle celle d'usine ? Sinon elle doit voyager, donc base64. */
/**
 * La séance est-elle réglée d'usine ? Si oui, la chaîne courte suffit.
 *
 * ELLE SE COMPARE CLÉ PAR CLÉ, sur la liste que le format complet sait
 * écrire. Elle vérifiait quatre réglages nommés — le mode, les aides, les
 * essais, la note — et laissait passer tout le reste : le jour où l'on a
 * ajouté « l'élève choisit l'ordre des étapes », un parcours qui l'utilisait
 * partait en chaîne courte, qui ne sait pas le dire, et arrivait chez le
 * collègue verrouillé dans l'ordre. Sans un mot. Une liste nommée en dur ne
 * peut que se démoder : celle-ci suit CLES_POLITIQUE, donc tout réglage
 * partageable est couvert le jour où il naît.
 */
function politiqueOrdinaire(policy) {
    const pol = resolvePolicy(policy);
    const def = resolvePolicy(defaultPolicy());
    if (pol.mode !== def.mode || pol.grading) return false;
    for (const cle of Object.keys(CLES_POLITIQUE)) {
        // `showCorrection` se déduit de `correction` : le comparer deux fois
        // ne peut que se contredire (voir `compact`).
        if (cle === 'showCorrection' && pol.correction) continue;
        if (!memeValeur(pol[cle], def[cle])) return false;
    }
    return true;
}

/**
 * Le parcours écrit en codes courts enchaînés, ou '' s'il n'y tient pas.
 *
 * CE QUI NE TIENT PAS DANS LA CHAÎNE, et pourquoi c'est le bon partage :
 * une surcharge (« seulement les tables de 7 »), un barème, un mode
 * apprentissage, un temps limité, un coefficient — tout cela change ce que
 * l'élève reçoit et doit donc voyager. Le format complet le fait. La chaîne
 * courte ne prétend coder que ce qu'on peut dicter : des exercices, dans un
 * ordre, avec leur nombre de questions.
 *
 * LE NOM DU PARCOURS N'Y EST PAS. C'est le seul vrai renoncement : « Révisions
 * du chapitre 3 » pesait à lui seul 30 des 117 octets. À la relecture, le nom
 * se refait à partir des exercices — moins joli, mais un élève qui reçoit
 * « ARF-12-TPW-20 » au lieu de 178 caractères de lien y gagne largement.
 */
function chaineCourte(path) {
    const p = normalizePath(path);
    if (!p.steps || !p.steps.length) return '';
    if (!politiqueOrdinaire(p.policy)) return '';
    // Le seuil qui ouvre les jeux de récompense ne voyage pas dans la chaîne :
    // s'il a été déplacé, il doit voyager en entier.
    if (p.bonusSeuil !== undefined && p.bonusSeuil !== SEUIL_DEFAUT) return '';
    let out = '';
    for (const s of p.steps) {
        if (!etapeSimple(s)) return '';
        const code = codeCourt(s.exerciseId);
        // Pas d'identité pour cet exercice ? On ne bricole pas un code
        // approximatif : le format complet sait tout coder, il prend le relais.
        if (!code) return '';
        const n = s.nbItems || telQuel(s.exerciseId);
        // « ARF » quand c'est l'exercice tel quel, « ARF-12 » quand le
        // professeur a choisi le nombre de questions.
        out += (out ? '-' : '') + code + (n === telQuel(s.exerciseId) ? '' : `-${n}`);
    }
    return out;
}

// --- base64url ---------------------------------------------------------------

function toBase64Url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length + 3) % 4);
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

/**
 * REPRÉSENTATION COMPACTE : clés courtes, et on n'émet QUE ce qui diffère.
 *
 * Rémy : « est-ce qu'au niveau des options ça couvre tout ? » Non, ça ne
 * couvrait pas tout, et c'était silencieux — un contrôle partagé arrivait chez
 * le collègue avec la bonne note sur 10 mais l'arrondi, les pénalités, le
 * régime de correction et « ne pas montrer la note » remis d'usine. Neuf
 * réglages passaient à la trappe. On ne liste donc plus les champs à la main :
 * on COMPARE la politique à celle de son mode, et tout écart voyage.
 *
 * « Diffère » veut dire : diffère de la politique DU MODE, pas de celle
 * d'usine. C'est ce que `resolvePolicy` refera à la relecture — elle repart de
 * la politique du mode et applique ce qu'on lui donne. Encoder par rapport à
 * autre chose produirait un parcours qui ne se relit pas comme il s'écrit.
 */
const CLES_POLITIQUE = {
    hints: 'h', maxAttemptsPerItem: 'a', correction: 'c', showCorrection: 'sc',
    adaptive: 'ad', shuffleSteps: 'sh', ordreLibre: 'ol', allowRetryStep: 'rs', pointsPerItem: 'pi',
    hintPenalty: 'hp', showMe: 'sm', guided: 'gd'
};
const CLES_BAREME = {
    scale: 's', rule: 'r', penalties: 'p', arrondi: 'a',
    showCalculation: 'sc', note: 'n'
};

const memeValeur = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function politiqueDuMode(mode) {
    return mode === MODES.EVALUATION ? evaluationPolicy()
        : mode === MODES.APPRENTISSAGE ? apprentissagePolicy()
            : defaultPolicy();
}

function compact(path) {
    const p = normalizePath(path);
    const pol = resolvePolicy(p.policy);
    const base = politiqueDuMode(pol.mode);

    const out = { n: p.name, s: p.steps.map(compactStep) };
    // Le seuil qui ouvre les jeux de récompense du parcours.
    if (p.bonusSeuil !== undefined && p.bonusSeuil !== SEUIL_DEFAUT) out.b = p.bonusSeuil;

    const polOut = {};
    if (pol.mode !== defaultPolicy().mode) polOut.m = pol.mode;
    for (const [cle, court] of Object.entries(CLES_POLITIQUE)) {
        // `showCorrection` se DÉDUIT de `correction` : l'écrire aussi ne peut
        // que se contredire. On le laisse à `resolvePolicy`.
        if (cle === 'showCorrection' && pol.correction) continue;
        if (!memeValeur(pol[cle], base[cle])) polOut[court] = pol[cle];
    }
    if (pol.grading) {
        const bBase = base.grading || {};
        const g = {};
        for (const [cle, court] of Object.entries(CLES_BAREME)) {
            if (!memeValeur(pol.grading[cle], bBase[cle])) g[court] = pol.grading[cle];
        }
        // Un barème sur un mode qui n'en a pas d'usine doit exister même vide,
        // sinon la relecture croirait qu'il n'y a pas de note du tout.
        polOut.g = g;
    } else if (base.grading) {
        polOut.g = null;   // le professeur a retiré la note d'une évaluation
    }
    if (Object.keys(polOut).length) out.p = polOut;
    return out;
}

const CLES_ETAPE = {
    nbItems: 'q', threshold: 't', weight: 'w', timeLimit: 'l',
    forceSeed: 'f', sansTotal: 'st', bonus: 'b'
};

function compactStep(s) {
    const out = { e: s.exerciseId };
    if (s.nbItems && s.nbItems !== 10) out.q = s.nbItems;
    if (s.threshold !== null && s.threshold !== undefined) out.t = s.threshold;
    if (s.weight && s.weight !== 1) out.w = s.weight;
    if (s.timeLimit) out.l = s.timeLimit;
    if (s.forceSeed) out.f = s.forceSeed;
    // UNE ÉTAPE-JEU et UNE ÉTAPE SANS TOTAL ne sont pas des détails
    // d'affichage : l'une ne compte ni dans le travail ni dans la note, l'autre
    // change l'en-tête que l'élève lit. Les perdre change le parcours.
    if (s.sansTotal) out.st = 1;
    if (s.bonus) out.b = 1;
    if (s.overrides && Object.keys(s.overrides).length) out.o = s.overrides;
    return out;
}

function expand(obj) {
    // On repart de la politique du mode, puis on applique ce qui voyageait.
    const p = obj.p || {};
    const pol = { ...politiqueDuMode(p.m) };
    if (p.m) pol.mode = p.m;
    for (const [cle, court] of Object.entries(CLES_POLITIQUE)) {
        if (p[court] === undefined) continue;
        // L'ancien format écrivait les booléens en 1/0 : il y a des liens dans
        // la nature, ils doivent continuer de se lire.
        pol[cle] = (typeof pol[cle] === 'boolean') ? !!p[court] : p[court];
    }
    if (p.g === null) {
        pol.grading = null;
    } else if (p.g) {
        pol.grading = { ...(politiqueDuMode(p.m).grading || {}) };
        for (const [cle, court] of Object.entries(CLES_BAREME)) {
            if (p.g[court] !== undefined) pol.grading[cle] = p.g[court];
        }
    }
    const path = makePath(obj.n || 'Parcours partagé', [], resolvePolicy(pol));
    if (obj.b !== undefined) path.bonusSeuil = obj.b;
    path.steps = (obj.s || []).map((s, i) => ({
        stepId: `sc_${i}`,
        exerciseId: s.e,
        overrides: s.o || {},
        nbItems: s.q || 10,
        threshold: s.t !== undefined ? s.t : null,
        weight: s.w || 1,
        timeLimit: s.l || null,
        forceSeed: s.f || null,
        sansTotal: !!s.st,
        bonus: !!s.b
    }));
    return path;
}

// --- Décodage des anciens codes ---------------------------------------------

const LEGACY_CODES = {
    AA: 'calc-add', AB: 'calc-mult-flash', AC: 'calc-mult-missing', AD: 'geom-grid',
    AE: 'calc-prio', AF: 'calc-arcade-shooter', AG: 'calc-math-memory', AH: 'calc-labyrinthe'
};

function letterToNum(ch) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) return c - 64;
    if (c >= 97 && c <= 122) return c - 70;
    return 1;
}

function decodeLegacy(code) {
    const steps = [];
    code.split('-').forEach((part, i) => {
        if (part.length < 3) return;
        const exerciseId = LEGACY_CODES[part.substring(0, 2)];
        if (!exerciseId || !getExerciseById(exerciseId)) return;
        const nbItems = letterToNum(part.substring(2, 3));
        const tablesChars = part.substring(3);
        const overrides = {};
        if (tablesChars.length) overrides.tables = [...tablesChars].map(letterToNum);
        steps.push({
            stepId: `lg_${i}`, exerciseId, overrides,
            nbItems, threshold: null, weight: 1, timeLimit: null, forceSeed: null
        });
    });
    const path = makePath('Parcours partagé', steps, defaultPolicy());
    path.steps = steps;
    return path;
}

// --- API ---------------------------------------------------------------------

export const Shortcodes = {
    /**
     * @returns {string} code partageable — TROIS LETTRES par exercice quand le
     * parcours n'est fait que d'exercices pris tels quels, le format complet
     * dès qu'un réglage doit voyager.
     */
    encodePath(path) {
        try {
            return chaineCourte(path) || PREFIX + toBase64Url(JSON.stringify(compact(path)));
        } catch (e) {
            console.error('[shortcodes] encodage impossible', e);
            return '';
        }
    },

    /** @returns {Object|null} parcours normalisé v2 */
    decodePath(code) {
        if (!code) return null;
        const trimmed = String(code).trim();
        try {
            if (trimmed.startsWith(PREFIX)) {
                return expand(JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length))));
            }
            const chaine = decouperChaine(trimmed);
            if (chaine) {
                // LE NOM SE REFAIT à partir des exercices : il ne voyage pas
                // dans la chaîne, mais l'élève doit lire autre chose que
                // « Parcours partagé » en haut de son écran.
                const titres = chaine.map(e => (getExerciseById(e.exerciseId) || {}).title || 'Exercice');
                const path = makePath(titres.join(' + '), [], defaultPolicy());
                path.steps = chaine.map((e, i) => {
                    // Le nombre de questions écrit après le tiret, s'il y est —
                    // et le seuil s'en déduit, comme partout ailleurs.
                    const n = e.questions || telQuel(e.exerciseId);
                    return {
                        stepId: `sc_${i}`, exerciseId: e.exerciseId, overrides: {},
                        nbItems: n, threshold: seuilConseille(n), weight: 1,
                        timeLimit: null, forceSeed: null
                    };
                });
                return path;
            }
            // UN CODE QU'ON NE SAIT PAS LIRE REND null, JAMAIS UN PARCOURS VIDE.
            // L'ancien décodeur ignorait en silence ce qu'il ne reconnaissait
            // pas et rendait un parcours sans aucune étape : l'appelant croyait
            // avoir réussi. Refuser franchement, c'est le message d'erreur que
            // l'élève doit voir.
            const ancien = decodeLegacy(trimmed);
            return (ancien && ancien.steps.length) ? ancien : null;
        } catch (e) {
            console.warn('[shortcodes] code illisible', e);
            return null;
        }
    },

    /**
     * L'exercice désigné par un code court à UN seul exercice, ou null.
     * Une chaîne de plusieurs exercices n'en désigne pas un : elle rend null.
     */
    exerciceDuCodeCourt(code) {
        const d = decouperCodeCourt(code);
        return d ? (getExerciseById(d.exerciseId) || null) : null;
    },

    shareUrl(path) {
        const code = this.encodePath(path);
        return `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(code)}`;
    },

    // --- Compatibilité avec l'ancienne API ---
    encodeSequence(steps) {
        return this.encodePath(Array.isArray(steps) ? { steps } : steps);
    },
    decodeSequence(code) {
        const path = this.decodePath(code);
        return path ? path.steps : [];
    }
};
