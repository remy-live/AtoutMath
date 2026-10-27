// LA TRAVERSÉE — le loup, la chèvre et le chou, et ce qu'il y a derrière.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre : « fais allumettes, la traversée ».
//
// LA RÈGLE : tout le monde est sur la rive gauche, il faut tout amener à
// droite. La barque ne porte qu'un ou deux passagers, et le passeur doit
// toujours être dedans — une barque ne traverse pas toute seule. Certains ne
// peuvent pas rester ensemble sans surveillance.
//
// ── CE QUE ÇA TRAVAILLE, ET POURQUOI C'EST BIEN DES MATHÉMATIQUES ───────────
//
// Je l'avais classé « plus proche du jeu que des mathématiques » en le
// proposant. Rémy l'a pris quand même, et il a raison :
//
//   · ON EXPLORE UN GRAPHE D'ÉTATS. Chaque situation — qui est sur quelle
//     rive, où est la barque — est un sommet ; chaque traversée est une
//     arête. Chercher la solution, c'est chercher un chemin. Un élève ne
//     nomme pas cela ainsi, mais c'est exactement ce qu'il fait.
//   · IL FAUT RECULER POUR AVANCER. Le coup qui débloque tout est de
//     RAMENER quelque chose en arrière, et c'est contre tous les réflexes.
//     C'est la même difficulté que « pour simplifier cette fraction, il faut
//     d'abord la compliquer ».
//   · ON COMPTE, ET LE MINIMUM SE DÉMONTRE. Sept traversées pour le loup, la
//     chèvre et le chou — pas six, et l'on peut dire pourquoi.
//
// ── CE QUI SE GARDE ICI N'EST PAS L'UNICITÉ, MAIS L'EXISTENCE ───────────────
//
// Contrairement à toutes les grilles du logiciel, plusieurs chemins mènent à
// l'autre rive et les compter faux serait absurde. Ce qu'il faut garantir est
// autre chose : qu'un chemin EXISTE. Un scénario insoluble servi à un élève
// est un piège, et rien dans l'énoncé ne lui permettrait de s'en douter.
//
// On cherche donc le plus court chemin par un parcours en largeur AVANT de
// servir l'énigme. Il est instantané — soixante-quatre états pour six
// passagers — et il donne du même coup le nombre minimal de traversées, qui
// sert d'objectif et d'indice.

import { makeItem } from '../items.js';

const SKILL = 'num.logique.traversee';

/**
 * LES SCÉNARIOS. Chacun porte ses passagers, la taille de la barque et les
 * paires qui ne se supportent pas.
 *
 * `passeur` est celui qui rame : il compte dans la barque et doit être à bord
 * à chaque traversée. Quand il vaut −1, n'importe qui peut ramer (c'est le cas
 * de la famille, où tout le monde sait tenir les rames).
 *
 * PAS DE CANNIBALES ET PAS DE MARIS JALOUX, les deux classiques du genre :
 * l'un se raconte mal en classe, l'autre repose sur une morale qui a cent
 * cinquante ans. Le loup et la chèvre suffisent.
 */
/**
 * LES TROIS PREMIERS SONT LA MÊME ÉNIGME EN COSTUMES DIFFÉRENTS, et c'est
 * voulu : trois objets, deux disputes qui se suivent, une barque qui n'en
 * porte qu'un. Le raisonnement est identique.
 *
 * POURQUOI LES AVOIR ÉCRITS ALORS. Regardé sur la fiche imprimée : avec un
 * seul costume, une feuille de quatre énigmes imprimait QUATRE FOIS la même
 * histoire, titre compris. Personne ne fait quatre fois la même chose. Le
 * raisonnement se refait volontiers quand l'histoire change — c'est d'ailleurs
 * ainsi que cette énigme a voyagé pendant mille ans.
 */
/**
 * « LE LOUP ET LA CHÈVRE » — l'article du second passe en minuscule.
 *
 * Tous les passagers du fichier portent un nom qui COMMENCE par son article :
 * « Le loup », « La poule », « L'aînée ». Recollés tels quels, ils donnaient
 * « Le renard et La poule sont restés seuls », avec une majuscule au milieu
 * de la phrase — vu sur la capture de l'écran d'échec, le 27 octobre, en
 * regardant autre chose.
 *
 * ELLE VIT ICI, ET NON DANS L'ACTIVITÉ, pour qu'une épreuve puisse la lire :
 * une fonction enfermée dans la fermeture d'un `mount` ne se mesure pas.
 */
export function etPuis(a, b) {
    return `${a} et ${b.charAt(0).toLowerCase()}${b.slice(1)}`;
}

export const SCENARIOS = {
    loupChevre: {
        famille: 'classique',
        nom: 'Le loup, la chèvre et le chou',
        titre: 'Le loup, la chèvre et le chou',
        passagers: [
            { id: 'passeur', nom: 'Le passeur', emoji: '🧑‍🌾' },
            { id: 'loup', nom: 'Le loup', emoji: '🐺' },
            { id: 'chevre', nom: 'La chèvre', emoji: '🐐' },
            { id: 'chou', nom: 'Le chou', emoji: '🥬' }
        ],
        passeur: 0,
        places: 2,
        interdits: [['loup', 'chevre'], ['chevre', 'chou']],
        pourquoi: 'Le loup mangerait la chèvre, la chèvre le chou.'
    },
    renardPoule: {
        famille: 'classique',
        nom: 'Le renard, la poule et le grain',
        titre: 'Le renard, la poule et le grain',
        passagers: [
            { id: 'passeur', nom: 'La fermière', emoji: '👩‍🌾' },
            { id: 'renard', nom: 'Le renard', emoji: '🦊' },
            { id: 'poule', nom: 'La poule', emoji: '🐔' },
            { id: 'grain', nom: 'Le sac de grain', emoji: '🌾' }
        ],
        passeur: 0,
        places: 2,
        interdits: [['renard', 'poule'], ['poule', 'grain']],
        pourquoi: 'Le renard mangerait la poule, la poule le grain.'
    },
    chatSouris: {
        famille: 'classique',
        nom: 'Le chat, la souris et le fromage',
        titre: 'Le chat, la souris et le fromage',
        passagers: [
            { id: 'passeur', nom: 'Le meunier', emoji: '🧑‍🍳' },
            { id: 'chat', nom: 'Le chat', emoji: '🐈' },
            { id: 'souris', nom: 'La souris', emoji: '🐁' },
            { id: 'fromage', nom: 'Le fromage', emoji: '🧀' }
        ],
        passeur: 0,
        places: 2,
        interdits: [['chat', 'souris'], ['souris', 'fromage']],
        pourquoi: 'Le chat mangerait la souris, la souris le fromage.'
    },
    famille: {
        famille: 'famille',
        nom: 'La famille — la barque ne porte pas un adulte et un enfant',
        titre: 'La famille et la barque',
        passagers: [
            { id: 'papa', nom: 'Le père', emoji: '🧔' },
            { id: 'maman', nom: 'La mère', emoji: '👩' },
            { id: 'ainee', nom: 'L\'aînée', emoji: '👧' },
            { id: 'cadet', nom: 'Le cadet', emoji: '🧒' }
        ],
        // N'IMPORTE QUI SAIT RAMER ICI : ce qui contraint n'est pas l'appétit
        // mais le POIDS. La barque porte les deux enfants ensemble, ou un
        // adulte tout seul — jamais un adulte avec quelqu'un.
        passeur: -1,
        places: 2,
        lourds: ['papa', 'maman'],
        interdits: [],
        pourquoi: 'La barque porte les deux enfants, ou un adulte seul.'
    }
};

// ── POURQUOI IL N'Y A PAS DE SCÉNARIO À QUATRE ANIMAUX ──────────────────────
//
// Je voulais ajouter le chien au loup, à la chèvre et au chou. Mesuré avant de
// l'écrire, avec `plusCourtChemin` sur les trois tailles de barque :
//
//     barque de 2 : INSOLUBLE      barque de 3 : 3 traversées
//                                  barque de 4 : 3 traversées
//
// LES DEUX SONT MAUVAIS, et pour des raisons opposées. Avec une barque de
// deux, quel que soit le premier passager emmené, les trois qui restent
// contiennent toujours une paire qui se mange : l'énigme n'a pas de solution,
// et rien dans l'énoncé ne permettrait à l'élève de s'en douter. Avec une
// barque de trois, on emmène les deux ennemis du milieu et c'est fini en trois
// traversées — il n'y a plus de retour en arrière, c'est-à-dire plus rien à
// chercher.
//
// CE N'EST PAS UN ACCIDENT, et c'est joli : l'énigme du loup, de la chèvre et
// du chou tient parce que la barque porte EXACTEMENT un passager en plus du
// passeur. C'est ce rapport-là qui fait l'énigme, pas le nombre d'animaux.

/**
 * LES ÉTATS SE RANGENT DANS UN ENTIER : le bit k vaut 1 si le passager k est
 * sur la rive GAUCHE, et un bit de plus dit où est la barque. Un état tient
 * donc dans un nombre, et la file du parcours en largeur dans un tableau.
 */
const BARQUE = (n) => 1 << n;

/** Cette rive se passe-t-elle de surveillance ? */
function rivePaisible(scenario, surRive, indexPasseurPresent) {
    if (indexPasseurPresent) return true;
    for (const [a, b] of scenario.interdits) {
        const ia = scenario.passagers.findIndex(p => p.id === a);
        const ib = scenario.passagers.findIndex(p => p.id === b);
        if (surRive.includes(ia) && surRive.includes(ib)) return false;
    }
    return true;
}

/** Les passagers présents sur une rive, dans un état donné. */
function surLaRive(scenario, etat, gauche) {
    const n = scenario.passagers.length;
    const out = [];
    for (let k = 0; k < n; k++) {
        const estAGauche = !!(etat & (1 << k));
        if (estAGauche === gauche) out.push(k);
    }
    return out;
}

/** L'état est-il vivable ? On regarde les DEUX rives, barque comprise. */
export function etatValable(scenario, etat) {
    const n = scenario.passagers.length;
    const barqueAGauche = !!(etat & BARQUE(n));
    const gauche = surLaRive(scenario, etat, true);
    const droite = surLaRive(scenario, etat, false);
    // LE PASSEUR SURVEILLE LA RIVE OÙ IL SE TROUVE. Quand n'importe qui peut
    // ramer, c'est la présence d'un ADULTE qui tient lieu de surveillance.
    const surveille = (rive) => (scenario.passeur >= 0
        ? rive.includes(scenario.passeur)
        : rive.some(k => (scenario.lourds || []).includes(scenario.passagers[k].id)));
    void barqueAGauche;
    return rivePaisible(scenario, gauche, surveille(gauche))
        && rivePaisible(scenario, droite, surveille(droite));
}

/** Toutes les traversées possibles depuis cet état. */
export function coups(scenario, etat) {
    const n = scenario.passagers.length;
    const barqueAGauche = !!(etat & BARQUE(n));
    const candidats = surLaRive(scenario, etat, barqueAGauche);
    const out = [];
    // TOUTES LES PARTIES DE LA RIVE qui tiennent dans la barque, la barque
    // vide exceptée : une barque qui traverse sans personne ne traverse pas.
    const choisir = (depuis, pris) => {
        if (pris.length) {
            // QUI RAME : le passeur quand le scénario en désigne un, n'importe
            // qui sinon — une barque non vide trouve toujours ses rames.
            const ok = scenario.passeur < 0 || pris.includes(scenario.passeur);
            // UN ADULTE OCCUPE LA BARQUE ENTIÈRE, quand le scénario parle de
            // poids : ni deux adultes, ni un adulte avec un enfant. C'est cette
            // règle-là qui fait l'énigme, et la relâcher la tue — mesuré, elle
            // tombait de neuf traversées à cinq.
            const lourds = pris.filter(k =>
                (scenario.lourds || []).includes(scenario.passagers[k].id)).length;
            const poidsOk = lourds === 0 || (lourds === 1 && pris.length === 1);
            if (ok && poidsOk) {
                let neuf = etat ^ BARQUE(n);
                for (const k of pris) neuf ^= (1 << k);
                if (etatValable(scenario, neuf)) out.push({ pris: pris.slice(), etat: neuf });
            }
        }
        if (pris.length >= scenario.places) return;
        for (let i = depuis; i < candidats.length; i++) {
            pris.push(candidats[i]);
            choisir(i + 1, pris);
            pris.pop();
        }
    };
    choisir(0, []);
    return out;
}

/**
 * LE PLUS COURT CHEMIN, par un parcours en largeur.
 *
 * On le lance AVANT de servir l'énigme : un scénario insoluble est un piège,
 * et rien dans l'énoncé ne permettrait à l'élève de s'en douter. Il rend
 * aussi le nombre minimal de traversées, qui sert d'objectif ET d'indice.
 *
 * C'est instantané : seize états pour trois passagers, soixante-quatre pour
 * six. Il n'y a rien à plafonner ici — et le dire évite qu'on se demande,
 * dans six mois, pourquoi ce fichier n'a pas de budget de nœuds comme les
 * autres.
 */
export function plusCourtChemin(scenario) {
    const n = scenario.passagers.length;
    const depart = (1 << n) - 1 | BARQUE(n);   // tout le monde à gauche
    const arrivee = 0;                          // tout le monde à droite
    if (!etatValable(scenario, depart)) return null;
    const vu = new Map([[depart, null]]);
    let file = [depart];
    while (file.length) {
        const suivante = [];
        for (const etat of file) {
            if (etat === arrivee) {
                const chemin = [];
                let e = etat;
                while (vu.get(e)) { chemin.unshift(vu.get(e).pris); e = vu.get(e).avant; }
                return chemin;
            }
            for (const c of coups(scenario, etat)) {
                if (vu.has(c.etat)) continue;
                vu.set(c.etat, { avant: etat, pris: c.pris });
                suivante.push(c.etat);
            }
        }
        file = suivante;
    }
    return null;
}

const DIFFICULTE_ITEM = { classique: 1, famille: 2 };

export const traverseeGenerator = {
    id: 'logique.traversee',
    label: 'La Traversée',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'scenario', type: 'select', label: 'L\'histoire', default: 'classique',
            aide: 'En « classique », l\'histoire change à chaque énigme — renard et poule, '
                + 'chat et souris — mais le raisonnement est le même.',
            options: [
                { value: 'classique', label: 'Le loup, la chèvre et le chou (et ses cousines)' },
                { value: 'famille', label: 'La famille et la barque' },
                { value: 'melange', label: 'Mélange — les deux' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        // ON TIRE L'HISTOIRE DANS LE GROUPE CHOISI : c'est ce qui fait qu'une
        // feuille de quatre énigmes en raconte quatre, et non la même quatre
        // fois. `rng` dépend de la graine de l'item, donc deux élèves à la
        // même graine ont bien la même énigme.
        const groupe = ['classique', 'famille', 'melange'].includes(p.scenario)
            ? p.scenario : 'classique';
        const candidats = Object.keys(SCENARIOS).filter(k =>
            groupe === 'melange' || SCENARIOS[k].famille === groupe);
        // ON TOURNE SUR LE RANG DE L'ÉNIGME, pas seulement sur le hasard.
        // Mesuré : en tirant au sort seul, une feuille de six racontait cinq
        // fois le renard — les graines voisines d'une même feuille donnent des
        // premiers tirages voisins. Le rang garantit le tour complet ; le
        // hasard décide par où l'on commence.
        const cle = candidats[(rng.int(0, candidats.length - 1)
            + (ctx.index || 0)) % candidats.length];
        const scenario = SCENARIOS[cle];

        // ON RÉSOUT AVANT DE SERVIR. Voir `plusCourtChemin` : ce qui se garde
        // ici n'est pas l'unicité du chemin — il y en a plusieurs, et c'est
        // très bien — mais son EXISTENCE.
        const chemin = plusCourtChemin(scenario);
        const minimum = chemin ? chemin.length : 0;

        const nom = (k) => scenario.passagers[k].nom.toLowerCase()
            .replace(/^le |^la |^l'/, '');
        const etapes = (chemin || []).map((pris, i) => {
            const qui = pris.map(nom).join(' et ');
            return `${i + 1}. ${i % 2 === 0 ? 'Aller' : 'Retour'} avec ${qui}`;
        });

        // SON INSTRUCTION DU 26 : « les énoncés doivent être plus court, vraiment
        // sans exception ». Le premier jet faisait 185 caractères et la garde du
        // catalogue l'a refusé — plafond 160. On élide le second « mangerait »,
        // et la règle de la barque se dit en trois mots : « passeur compris ».
        //
        // CHEZ LA FAMILLE, `pourquoi` DIT DÉJÀ la règle de la barque : la
        // répéter ferait une phrase de plus pour la même chose.
        const consigne = `Fais passer tout le monde sur l'autre rive. ${scenario.pourquoi}`
            + (scenario.passeur >= 0
                ? ` La barque porte ${scenario.places} passagers, passeur compris.` : '');

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.traversee',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                // LA CONSIGNE IMPRIMÉE EST GÉNÉRIQUE, et c'est forcé : la fiche
                // prend `papier` du PREMIER item et le met en tête de la
                // feuille, alors qu'une feuille de quatre énigmes en raconte
                // quatre. On lisait « Le loup mangerait la chèvre » au-dessus
                // d'une énigme de renard et de poule. Vu sur la fiche imprimée.
                // La règle de chaque histoire est écrite SOUS son titre, dans
                // son propre bloc.
                papier: 'Fais passer tout le monde sur l\'autre rive. Une traversée par '
                    + 'ligne ; la flèche dit le sens.',
                html: `<div class="game-question tv-consigne">${consigne}</div>`
            },
            // LA RÉPONSE EST « TOUT LE MONDE EST PASSÉ », PAS UN CHEMIN
            // PARTICULIER. Plusieurs chemins mènent à l'autre rive, et compter
            // faux celui qui n'est pas le nôtre serait absurde — c'est la
            // différence exacte avec toutes les grilles du logiciel.
            answer: 'traverse',
            hints: [
                'Qui ne peut pas rester seul avec qui ? Commence par emmener celui qui '
                    + 'est au milieu des disputes.',
                'IL FAUT PARFOIS RAMENER QUELQU\'UN EN ARRIÈRE. C\'est le coup auquel '
                    + 'personne ne pense, et c\'est celui qui débloque tout.',
                minimum
                    ? `Cela se fait en ${minimum} traversées. Si tu en es à plus, c'est qu'il `
                        + 'y a un aller-retour en trop quelque part.'
                    : 'Reprends depuis le début, en changeant le tout premier passager.'
            ],
            explanation: minimum
                ? `Il faut ${minimum} traversées au minimum. Une solution : ${etapes.join(' ; ')}.`
                : 'Tout le monde doit arriver sur l\'autre rive.',
            difficulty: DIFFICULTE_ITEM[scenario.famille] || 1,
            meta: {
                scenario: cle,
                titre: scenario.titre,
                passagers: scenario.passagers,
                places: scenario.places,
                passeur: scenario.passeur,
                lourds: scenario.lourds || [],
                interdits: scenario.interdits,
                pourquoi: scenario.pourquoi,
                minimum,
                solution: etapes,
                // LE CHEMIN BRUT, en rangs de passagers : c'est lui qu'une
                // épreuve peut REJOUER contre les règles, là où les phrases
                // françaises ne se relisent qu'à coups d'expressions
                // régulières. Une épreuve qui doit analyser du texte pour
                // vérifier un calcul mesure l'analyse, pas le calcul.
                chemin: chemin || [],
                titreCourt: 'La Traversée',
                texteLecon: 'Pour avancer, il faut parfois ramener quelqu\'un en arrière.'
            }
        });
    }
};

export default traverseeGenerator;
