// ÉLÉMENTS DE GÉOMÉTRIE — appartenance, codage, milieu.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sa fiche de 6e « Éléments de géométrie » à l'appui. J'avais croisé ses
// vingt-cinq exercices avec le catalogue ; il a retenu trois manques, et ce
// sont ceux-ci.
//
// CE QUI RESTE SUR LE PAPIER, ET POURQUOI. Sa fiche fait reproduire l'étoile,
// le badge, le pavage, les figures au compas — rien de tout cela n'est ici, et
// ce n'est pas un oubli. C'est sa ligne rouge, écrite dans docs/architecture :
// « Je ne veux pas de construction géométrique avec des outils virtuels. Rien
// ne remplace le geste. » L'écran prend ce qu'il fait mieux qu'une photocopie
// — une figure neuve à chaque question, une correction immédiate — et laisse
// le tracé à la règle.
//
// ── LES TROIS NOTIONS ───────────────────────────────────────────────────────
//
//   APPARTENANCE  (ses ex. 11, 12, 13) : ∈ et ∉, une page entière de sa fiche,
//                 et rien dans l'application. Le cœur n'est pas le symbole,
//                 c'est la distinction [AB] / (AB) / [AB) : un point peut
//                 être sur la droite sans être sur le segment.
//
//   CODAGE        (ses ex. 7, 8) : l'application savait POSER un codage sur
//                 une figure ; elle ne savait pas demander de le LIRE.
//                 « Grâce au codage, j'ai GI = … ».
//
//   MILIEU        (son ex. 10) : du codage vers la phrase et de la phrase vers
//                 le codage — avec le piège qui n'est dans aucun manuel, un
//                 point équidistant de A et de B qui n'est pas sur [AB].
//
// ── UNE QUESTION À QUATRE AFFIRMATIONS, ET NON UN ∈ / ∉ ─────────────────────
//
// Sa fiche présente l'appartenance en grille à remplir : douze cases, deux
// réponses possibles chacune. Sur papier c'est juste — les douze se lisent
// d'un coup et se corrigent ensemble. Posée telle quelle à l'écran, une case
// devient une question à DEUX propositions, c'est-à-dire un pile ou face : un
// élève qui clique au hasard a la moitié des points, et l'échelle d'aide, qui
// ouvre justement les séances à deux propositions, ne pourrait plus rien
// mesurer.
//
// On pose donc QUATRE affirmations dont une seule est vraie. C'est la même
// matière — ce sont ses cases —, rassemblées en une question qui ne se devine
// pas. Et les trois fausses ne sont pas des remplissages : chacune porte une
// confusion nommée, celles qu'il corrige à la main chaque année.

import { makeItem, finalizeChoices } from '../items.js';
import { figure } from '../figures.js';
import { scene, appartient, droiteDe, boutsDe, pointsSur } from '../pointsDroites.js';
import { sceneSvg, figureCodeeSvg } from '../pointsDroitesSvg.js';
import {
    etoile, deuxSegmentsPartages, equidistantHorsSegment, egalitesDe, marquesDe,
    memeLongueur
, estMilieu, entre, carreLongueur } from '../figureCodee.js';

const SORTES = {
    segment: { ecrire: (a, b) => `[${a}${b}]`, nom: (a, b) => `le segment [${a}${b}]` },
    droite: { ecrire: (a, b) => `(${a}${b})`, nom: (a, b) => `la droite (${a}${b})` },
    'demi-droite': { ecrire: (a, b) => `[${a}${b})`, nom: (a, b) => `la demi-droite [${a}${b})` }
};

const ecrire = (x, a, b, sorte, dedans) =>
    `${x} ${dedans ? '∈' : '∉'} ${SORTES[sorte].ecrire(a, b)}`;

/**
 * Une scène jouable, ou rien.
 *
 * `scene` peut échouer — elle rejoue plutôt que de rattraper, et finit par
 * rendre `null` si les contraintes ne tombent jamais ensemble. On insiste ici
 * plutôt que de dessiner une figure dont on ne saurait rien dire.
 */
function sceneSure(rng, cfg) {
    for (let essai = 0; essai < 40; essai++) {
        const sc = scene(rng, cfg);
        if (sc) return sc;
    }
    return null;
}

// ── APPARTENANCE ────────────────────────────────────────────────────────────

/**
 * Toutes les affirmations qu'on peut écrire sur cette figure, avec leur
 * vérité et, pour les fausses, la confusion qu'elles portent.
 *
 * ON LES ÉNUMÈRE TOUTES PLUTÔT QUE DE LES INVENTER. Fabriquer un leurre, c'est
 * décider d'avance de quoi l'élève se trompe ; énumérer puis filtrer, c'est
 * laisser la figure dire ce qu'elle permet de confondre. La seconde façon
 * donne des questions dont la difficulté vient du dessin, pas de mon idée du
 * dessin.
 */
function affirmations(sc) {
    const noms = Object.keys(sc.points);
    const out = [];
    for (const d of sc.droites) {
        const [deb, fin] = boutsDe(d);
        // Les couples (a, b) qui nomment un objet : les extrémités, et les
        // couples intérieurs, qui donnent des segments plus courts.
        const couples = [];
        for (let i = 0; i < d.points.length; i++) {
            for (let j = 0; j < d.points.length; j++) {
                if (i !== j) couples.push([d.points[i], d.points[j]]);
            }
        }
        for (const [a, b] of couples) {
            for (const sorte of Object.keys(SORTES)) {
                for (const x of noms) {
                    if (x === a || x === b) continue;        // trivial
                    const vrai = appartient(sc, x, a, b, sorte);
                    out.push({
                        texte: ecrire(x, a, b, sorte, vrai), juste: true,
                        x, a, b, sorte, dedans: vrai, d, deb, fin
                    });
                    out.push({
                        texte: ecrire(x, a, b, sorte, !vrai), juste: false,
                        x, a, b, sorte, dedans: !vrai, d, deb, fin,
                        why: pourquoiFaux(sc, x, a, b, sorte, vrai)
                    });
                }
            }
        }
    }
    return out;
}

/** Ce qui ne va pas dans une affirmation fausse — nommé, jamais « c'est faux ». */
function pourquoiFaux(sc, x, a, b, sorte, vraiDedans) {
    const surLaDroite = appartient(sc, x, a, b, 'droite');
    const objet = SORTES[sorte].ecrire(a, b);
    if (!surLaDroite) {
        return vraiDedans
            ? ''
            : `${x} n'est sur aucune des deux droites de la figure : il n'est donc `
                + `pas sur ${objet}.`;
    }
    if (vraiDedans) {
        // On prétend que x n'y est pas, alors qu'il y est.
        return `${x} est bien sur ${objet} — regarde le trait, il passe exactement `
            + `par la croix de ${x}.`;
    }
    // x est sur la droite, mais pas sur l'objet plus court qu'on nomme.
    if (sorte === 'segment') {
        return `${x} est sur la droite (${a}${b}), mais le SEGMENT [${a}${b}] s'arrête `
            + `à ${a} et à ${b} : ${x} est au-delà.`;
    }
    return `[${a}${b}) part de ${a} et file du côté de ${b}. ${x} est sur la droite, `
        + `mais de l'AUTRE côté de ${a}.`;
}

/**
 * LA DIFFICULTÉ D'UNE AFFIRMATION, ET C'EST ELLE QU'ON CHOISIT.
 *
 * Premier jet : je prenais une affirmation vraie au hasard. Mesuré sur les
 * cinq premières questions — la bonne réponse était un ∉ dans QUATRE cas, et
 * à chaque fois pour la même raison creuse : « x n'est sur aucune droite qui
 * porte a et b ». C'est vrai, ça se voit en une seconde, et ça n'enseigne
 * rien. Le hasard ne tirait pas au hasard : il tirait ce qui est le plus
 * fréquent, or les couples (point, objet) sans rapport sont l'immense
 * majorité.
 *
 * Trois familles, donc, et l'on choisit dans laquelle on pose la question :
 *
 *   'hors'    x n'est sur aucune droite portant a et b — vrai d'un coup d'œil ;
 *   'dedans'  x est sur l'objet nommé ;
 *   'au-dela' x est sur la DROITE, mais hors du segment ou du mauvais côté de
 *             l'origine. C'est LA question du chapitre, celle où le crochet et
 *             la parenthèse veulent dire quelque chose.
 */
function familleDe(sc, t) {
    if (!appartient(sc, t.x, t.a, t.b, 'droite')) return 'hors';
    return t.dedans === appartient(sc, t.x, t.a, t.b, t.sorte)
        ? (appartient(sc, t.x, t.a, t.b, t.sorte) ? 'dedans' : 'au-dela')
        : (appartient(sc, t.x, t.a, t.b, t.sorte) ? 'dedans' : 'au-dela');
}

function itemAppartenance(rng, params) {
    const sc = sceneSure(rng, { droites: 2, parDroite: 3, horsDroites: 2 });
    if (!sc) return null;
    const toutes = affirmations(sc).map(t => ({ ...t, famille: familleDe(sc, t) }));

    // Les sortes autorisées par le réglage : on commence par le segment et la
    // droite, la demi-droite vient après — c'est l'ordre de sa fiche, et
    // l'ordre de la difficulté.
    const sortes = params.sortes === 'segment-droite'
        ? ['segment', 'droite'] : Object.keys(SORTES);
    const admis = (t) => sortes.includes(t.sorte);

    // DEUX FOIS SUR TROIS, LA QUESTION PORTE SUR UN POINT DE LA DROITE. Le
    // troisième tiers garde les cas francs — sa fiche en a aussi, et ils
    // rassurent — mais ils ne peuvent plus occuper toute la place.
    const viseFin = rng.bool(0.68);
    const pool = (fam) => rng.shuffle(toutes.filter(t =>
        t.juste && admis(t) && fam.includes(t.famille)));
    const candidates = viseFin
        ? [...pool(['au-dela', 'dedans']), ...pool(['hors'])]
        : [...pool(['hors', 'dedans']), ...pool(['au-dela'])];

    const fausses = toutes.filter(t => !t.juste && admis(t) && t.why);
    if (!candidates.length || fausses.length < 3) return null;

    for (const bonne of candidates.slice(0, 14)) {
        const vus = new Set([`${bonne.x}|${bonne.a}${bonne.b}`]);
        const dispo = rng.shuffle(fausses.filter(f => f.texte !== bonne.texte))
            .filter((f, i, arr) => arr.findIndex(g => g.texte === f.texte) === i);

        // LE SYMBOLE NE DOIT PAS TRAHIR LA RÉPONSE. Trois ∈ et un seul ∉ :
        // l'intrus se repère sans lire la figure, et la question ne mesure
        // plus que la capacité à compter les symboles.
        const memeSigne = dispo.filter(f => f.dedans === bonne.dedans);
        const autreSigne = dispo.filter(f => f.dedans !== bonne.dedans);
        const choisis = [];
        const prendre = (liste) => {
            for (const f of liste) {
                if (choisis.length >= 3) return;
                const cle = `${f.x}|${f.a}${f.b}`;
                if (vus.has(cle)) continue;
                vus.add(cle);
                choisis.push(f);
            }
        };
        prendre(memeSigne.slice(0, 1));      // au moins un leurre du même signe
        prendre(autreSigne);
        prendre(memeSigne);
        prendre(dispo);                      // et l'on complète si besoin
        if (choisis.length < 3) continue;
        if (!choisis.some(f => f.dedans === bonne.dedans)) continue;
        return { sc, bonne, leurres: choisis.slice(0, 3) };
    }
    return null;
}

// ── LE GÉNÉRATEUR ───────────────────────────────────────────────────────────

export const elementsGeometrieGenerator = {
    id: 'geo.elements',
    label: 'Appartenance, codage, milieu',
    skills: ['geo.appartenance', 'geo.codage.lire', 'geo.milieu'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        {
            id: 'notion', type: 'select', label: 'Quelle notion', default: 'appartenance',
            aide: 'Trois notions de la fiche « Éléments de géométrie » : ∈ et ∉, la '
                + 'lecture d\'un codage, et le milieu d\'un segment.',
            options: [
                { value: 'appartenance', label: '∈ / ∉ — le point est-il dessus ?' },
                { value: 'codage', label: 'Lire un codage' },
                { value: 'milieu', label: 'Le milieu d\'un segment' }
            ]
        },
        {
            id: 'sortes', type: 'select', label: 'Quels objets', default: 'tous',
            aide: 'La demi-droite est la plus difficile : son origine s\'écrit en '
                + 'premier, et [AB) n\'est pas [BA).',
            options: [
                { value: 'segment-droite', label: 'Segment et droite seulement' },
                { value: 'tous', label: 'Segment, droite et demi-droite' }
            ]
        },
        // ── DEUX RÉGLAGES QUI N'EN ÉTAIENT PAS ──────────────────────────
        //
        // `ficheReglages.test.mjs` refuse tout bouton qui ne change rien à la
        // feuille — « un bouton qui ne fait rien est pire qu'un bouton absent :
        // on l'essaie, rien ne bouge, et l'on ne sait pas si c'est la fiche ou
        // soi qu'on n'a pas comprise ». Il est tombé sur « Quels objets »,
        // offert au codage et au milieu, où il ne gouverne rien.
        //
        // Deux réponses possibles : retirer le bouton, ou donner à chacun de
        // ces deux exercices le réglage qui lui manquait vraiment. C'est la
        // seconde — un professeur veut pouvoir décider si le piège tombe, et
        // combien de familles de longueurs la figure porte.
        {
            id: 'familles', type: 'select', label: 'Combien de longueurs', default: 'melange',
            aide: 'Trois segments de même longueur donnent TROIS égalités, pas deux — '
                + 'c\'est là que le comptage se joue.',
            options: [
                { value: 'paires', label: 'Deux paires' },
                { value: 'melange', label: 'Une famille de trois, parfois' }
            ]
        },
        {
            id: 'piege', type: 'select', label: 'Le point équidistant hors du segment',
            default: 'oui',
            aide: 'Le point à égale distance de A et de B qui n\'est PAS sur [AB] : il '
                + 'n\'est dans aucun manuel, et c\'est lui qui sépare ceux qui savent la '
                + 'définition.',
            options: [
                { value: 'oui', label: 'Oui, une question sur quatre' },
                { value: 'non', label: 'Non, jamais' }
            ]
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const notion = String(params.notion || 'appartenance');
        if (notion === 'codage') return genCodage(rng, params);
        if (notion === 'milieu') return genMilieu(rng, params);
        return genAppartenance(rng, params);
    }
};

function genAppartenance(rng, params) {
    let tire = null;
    for (let essai = 0; essai < 60 && !tire; essai++) tire = itemAppartenance(rng, params);
    if (!tire) return null;
    const { sc, bonne, leurres } = tire;

    const choices = finalizeChoices(rng, [
        { value: 'ok', label: bonne.texte, texte: bonne.texte, correct: true },
        ...leurres.map((f, i) => ({
            value: 'faux' + i, label: f.texte, texte: f.texte, correct: false, why: f.why
        }))
    ], { count: 4 });

    const objet = SORTES[bonne.sorte].nom(bonne.a, bonne.b);
    return makeItem({
        seed: rng.seed,
        generatorId: 'geo.elements',
        skillId: 'geo.appartenance',
        answerKind: 'choice',
        prompt: {
            text: 'Quelle affirmation est vraie ?',
            html: '<div class="game-question pd-consigne">Quelle affirmation est '
                + 'VRAIE&nbsp;?</div>' + figure(sceneSvg(sc)),
            papier: 'Quelle affirmation est vraie ?'
        },
        answer: 'ok',
        reponsePapier: bonne.texte,
        choices,
        hints: [
            'Le crochet est un mur, la parenthèse laisse filer. [AB] s\'arrête aux deux '
                + 'points, (AB) ne s\'arrête jamais, [AB) part de A et continue.',
            `Regarde ${objet} : le trait surligné est exactement ce dont parle la bonne `
                + 'affirmation.'
        ],
        // LE SECOND INDICE MONTRE L'OBJET, il ne le décrit pas. Dire « regarde
        // le segment [AB] » à un élève qui ne voit pas où il commence ne l'aide
        // pas ; le surligner lui rend la question.
        schemas: ['', figure(sceneSvg(sc, {
            montrer: { a: bonne.a, b: bonne.b, sorte: bonne.sorte },
            vedettes: [bonne.x]
        }))],
        explanation: `${bonne.texte} : ${phraseExplication(sc, bonne)}`,
        difficulty: bonne.sorte === 'demi-droite' ? 3 : 2,
        meta: { notion: 'appartenance', sorte: bonne.sorte }
    });
}

function phraseExplication(sc, t) {
    const objet = SORTES[t.sorte].ecrire(t.a, t.b);
    if (!t.dedans) {
        if (!appartient(sc, t.x, t.a, t.b, 'droite')) {
            return `${t.x} n'est sur aucune droite qui porte ${t.a} et ${t.b}.`;
        }
        if (t.sorte === 'segment') {
            return `${t.x} est bien sur la droite (${t.a}${t.b}), mais hors du segment : `
                + `celui-ci s'arrête à ${t.a} et à ${t.b}.`;
        }
        return `${t.x} est sur la droite, mais du mauvais côté de l'origine ${t.a}.`;
    }
    const porte = pointsSur(sc, t.a, t.b, t.sorte).join(', ');
    return `${objet} porte les points ${porte}.`;
}


// ── LIRE UN CODAGE ──────────────────────────────────────────────────────────
//
// RÉMY, ex. 7 et 8 : « Grâce au codage, j'ai GI = … », « Écris les données
// fournies par le codage ».
//
// L'ÉGALITÉ S'ÉCRIT SANS CROCHETS, et ce n'est pas un détail de typographie.
// [AB] est un OBJET — un segment —, AB est un NOMBRE — sa longueur. On écrit
// AB = CD parce qu'on compare deux longueurs ; écrire [AB] = [CD] dirait que
// les deux segments sont le même objet, ce qui est faux. Son cours le pose
// noir sur blanc : « Pour parler de la longueur de [AB], on note AB ». Un des
// leurres porte précisément cette confusion.

function genCodage(rng, params) {
    const compter = params.notion === 'codage' && rng.bool(0.3);
    // COMBIEN D'ÉGALITÉS ? PAS SIX.
    //
    // Vu à l'écran : avec trois branches dans chacun des deux groupes, la
    // réponse est 3 + 3 = 6, et les leurres 5, 7, 8. Compter six égalités deux
    // à deux sur six segments, c'est de la combinatoire — pas la question de
    // sa fiche, qui demande de LIRE un codage. Une famille de trois et une
    // paire donnent 3 + 1 = 4 : le piège reste entier (trois segments égaux ne
    // font pas deux égalités mais trois) et le compte reste celui d'un élève
    // de sixième.
    const trois = String(params.familles || 'melange') !== 'paires';
    const fig = compter
        ? etoile(rng, { tailles: trois ? [3, 2] : [2, 2] })
        : etoile(rng, { tailles: trois && rng.bool(0.35) ? [3, 2] : [2, 2] });
    if (!fig) return null;
    const egalites = egalitesDe(fig);
    if (egalites.length < 2) return null;
    const svg = figureCodeeSvg(fig);

    if (compter) return itemCompter(rng, fig, egalites, svg);

    // Une égalité VRAIE, et trois qui ne le sont pas — mais qu'on pourrait
    // croire, parce qu'elles nomment des segments de la figure.
    const [u, v] = rng.pick(egalites);
    const tous = fig.segments.map(s => `${s.a}${s.b}`);
    const faux = [];
    for (const p of rng.shuffle(tous)) {
        for (const q of rng.shuffle(tous)) {
            if (p === q || memeLongueur(fig, p, q)) continue;
            const t = `${p} = ${q}`;
            if (!faux.some(f => f.texte === t || f.texte === `${q} = ${p}`)) {
                faux.push({ texte: t,
                    why: `Ces deux segments ne portent pas la même marque : le codage `
                        + `ne dit rien de leurs longueurs.` });
            }
            if (faux.length >= 2) break;
        }
        if (faux.length >= 2) break;
    }
    if (faux.length < 2) return null;
    // LE LEURRE DE L'ÉCRITURE : [GI] = [FI] au lieu de GI = FI.
    faux.push({ texte: `[${u}] = [${v}]`,
        why: '[GI] est un OBJET, GI est un NOMBRE — sa longueur. Deux segments '
            + 'de même longueur ne sont pas le même segment : on écrit GI = FI, '
            + 'sans crochets.' });

    const choices = finalizeChoices(rng, [
        { value: 'ok', label: `${u} = ${v}`, texte: `${u} = ${v}`, correct: true },
        ...faux.slice(0, 3).map((f, i) => ({
            value: 'faux' + i, label: f.texte, texte: f.texte, correct: false, why: f.why
        }))
    ], { count: 4 });

    return makeItem({
        seed: rng.seed,
        generatorId: 'geo.elements',
        skillId: 'geo.codage.lire',
        answerKind: 'choice',
        prompt: {
            text: 'Que donne le codage de cette figure ?',
            html: '<div class="game-question pd-consigne">Que donne le '
                + 'codage&nbsp;?</div>' + figure(svg),
            papier: 'Que donne le codage de cette figure ?'
        },
        answer: 'ok',
        reponsePapier: `${u} = ${v}`,
        choices,
        hints: [
            'Les segments qui portent la MÊME marque ont la même longueur. Une marque '
                + 'seule ne dirait rien : le codage exprime une égalité.',
            `Ici, ${egalites.map(([p, q]) => `${p} = ${q}`).join(' et ')}.`
        ],
        schemas: ['', figure(svg)],
        explanation: `Le codage donne ${egalites.map(([p, q]) => `${p} = ${q}`).join(', ')}. `
            + 'On écrit les LONGUEURS, sans crochets.',
        difficulty: 2,
        meta: { notion: 'codage' }
    });
}

/**
 * COMBIEN D'INFORMATIONS LE CODAGE DONNE-T-IL ?
 *
 * Sa fiche le dit ainsi : « le nombre de lignes correspond au nombre
 * d'informations fournies par le codage ». Trois segments de même longueur
 * donnent TROIS égalités — AB = CD, AB = EF, CD = EF — et non deux : une
 * information est une comparaison, et l'élève qui les compte doit toutes les
 * voir.
 */
function itemCompter(rng, fig, egalites, svg) {
    const n = egalites.length;
    const autres = [n + 1, n - 1, n + 2, Math.max(1, n - 2)]
        .filter(v => v >= 1 && v !== n)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .slice(0, 3);
    if (autres.length < 3) return null;

    return makeItem({
        seed: rng.seed,
        generatorId: 'geo.elements',
        skillId: 'geo.codage.lire',
        answerKind: 'choice',
        prompt: {
            text: 'Combien d\'égalités de longueurs ce codage donne-t-il ?',
            html: '<div class="game-question pd-consigne">Combien d\'égalités de '
                + 'longueurs ce codage donne-t-il&nbsp;?</div>' + figure(svg),
            papier: 'Combien d\'égalités de longueurs ce codage donne-t-il ?'
        },
        answer: String(n),
        reponsePapier: String(n),
        choices: finalizeChoices(rng, [
            { value: String(n), label: String(n), texte: String(n), correct: true },
            ...autres.map(v => ({ value: String(v), label: String(v), texte: String(v),
                correct: false,
                why: 'Compte les PAIRES de segments qui portent la même marque : trois '
                    + 'segments marqués pareil donnent trois égalités, pas deux.' }))
        ], { count: 4 }),
        hints: [
            'Une information, c\'est une comparaison entre DEUX segments.',
            'Trois segments qui portent la même marque donnent trois égalités : le '
                + 'premier avec le deuxième, le premier avec le troisième, le deuxième '
                + 'avec le troisième.'
        ],
        schemas: ['', figure(svg)],
        explanation: `Le codage donne ${n} égalité${n > 1 ? 's' : ''} : `
            + egalites.map(([p, q]) => `${p} = ${q}`).join(', ') + '.',
        difficulty: 3,
        meta: { notion: 'codage' }
    });
}

// ── LE MILIEU ───────────────────────────────────────────────────────────────
//
// RÉMY, ex. 10 : « AI = IB, I est le milieu de [AB] ».
//
// DEUX CONDITIONS, ET L'ÉLÈVE N'EN RETIENT QU'UNE. Être le milieu de [AB],
// c'est être SUR le segment ET à égale distance de A et de B. Le piège de
// l'équidistant hors du segment n'est dans aucun manuel — et c'est justement
// pourquoi il mérite d'être posé : il est la seule question qui distingue
// l'élève qui sait la définition de celui qui a retenu « à égale distance ».

function genMilieu(rng, params) {
    // Les trois figures de sa fiche, et la troisième est le piège : un point
    // à égale distance de A et de B qui n'est pas sur [AB].
    const avecPiege = String(params.piege || 'oui') !== 'non';
    const cas = avecPiege ? rng.int(1, 10) : rng.int(1, 7);
    const fig = cas <= 7 ? deuxSegmentsPartages(rng) : equidistantHorsSegment(rng);
    if (!fig) return null;

    // ── ON ÉNUMÈRE LES PHRASES, ON NE LES INVENTE PAS ───────────────────
    //
    // Premier jet : j'écrivais à la main une phrase vraie et trois fausses.
    // Deux défauts, tous deux visibles à la lecture des premières questions.
    // Un leurre dégénéré — « N est le milieu de [GN] », où le point est sa
    // propre extrémité — que personne ne coche jamais. Et surtout : quand la
    // réponse était « X n'est PAS le milieu », elle était la seule phrase
    // négative des quatre, donc repérable sans regarder la figure. C'est
    // exactement ce que Rémy reprochait aux QCM de calcul littéral — « on
    // trouve tout de suite ce qui ne va pas ».
    //
    // On énumère donc tous les triplets, on calcule la vérité de chaque
    // phrase sur les coordonnées, et l'on impose qu'au moins un leurre ait la
    // MÊME FORME que la bonne réponse. La forme ne dit plus rien.
    const noms = Object.keys(fig.points);
    const phrases = [];
    for (const x of noms) {
        for (const y of noms) {
            for (const z of noms) {
                if (y >= z || x === y || x === z) continue;
                const vrai = estMilieu(fig.points, x, y, z);
                const objet = `[${y}${z}]`;
                phrases.push({ texte: `${x} est le milieu de ${objet}`, juste: vrai,
                    positive: true, x, y, z,
                    why: vrai ? '' : pourquoiPasMilieu(fig, x, y, z) });
                phrases.push({ texte: `${x} n'est pas le milieu de ${objet}`, juste: !vrai,
                    positive: false, x, y, z,
                    why: vrai
                        ? `${x} EST le milieu de ${objet} : il est sur le segment, et les `
                            + 'deux morceaux portent la même marque.'
                        : '' });
            }
        }
    }

    const vraies = rng.shuffle(phrases.filter(p => p.juste));
    const fausses = rng.shuffle(phrases.filter(p => !p.juste && p.why));
    // ── ON CHOISIT LA FORME, ON NE LA SUBIT PAS ─────────────────────────
    //
    // Premier jet : je préférais les phrases positives, « plus instructives »
    // — elles demandent de vérifier les DEUX conditions, là où une négative se
    // contente d'en trouver une qui manque. Mesuré : 800 bonnes réponses
    // positives sur 800. Une préférence appliquée sans quota devient une
    // règle, et la moitié de la notion disparaissait — à commencer par le
    // piège, dont toute la leçon tient dans « M n'est PAS le milieu ».
    //
    // Deux fois sur trois la réponse est positive, une fois sur trois
    // négative. Et sur la figure du piège, c'est toujours de M qu'on parle :
    // le poser pour ensuite interroger un autre point reviendrait à monter le
    // décor sans jouer la scène.
    // LE SEUIL EST ÉCRIT DEUX FOIS, ET LES DEUX DIFFÉRAIENT.
    //
    // Le choix de la figure, trois lignes plus haut, bascule à 7 ; la
    // préférence de forme, ici, basculait à 8. Le tirage numéro 8 recevait
    // donc la figure du PIÈGE et le traitement des figures ordinaires — vu à
    // l'écran : le triangle de l'équidistant posé, et la question qui
    // demandait quand même « qui est le milieu de [TZ] ? » en phrase positive.
    // Le décor était monté, la scène n'était pas jouée.
    //
    // Le seuil est nommé une seule fois maintenant, et tout le reste le lit.
    const piege = cas > 7;
    const veutPositive = piege ? false : rng.bool(0.62);
    const surM = piege ? fig.M : null;
    vraies.sort((a, b) => {
        const ca = (a.positive === veutPositive ? 2 : 0) + (surM && a.x === surM ? 1 : 0);
        const cb = (b.positive === veutPositive ? 2 : 0) + (surM && b.x === surM ? 1 : 0);
        return cb - ca;
    });

    for (const bonne of vraies.slice(0, 8)) {
        const memeForme = fausses.filter(f => f.positive === bonne.positive
            && !(f.x === bonne.x && f.y === bonne.y && f.z === bonne.z));
        const autreForme = fausses.filter(f => f.positive !== bonne.positive
            && !(f.x === bonne.x && f.y === bonne.y && f.z === bonne.z));
        if (!memeForme.length) continue;
        const choisis = [];
        const vus = new Set([`${bonne.x}|${bonne.y}${bonne.z}`]);
        const prendre = (liste, max) => {
            for (const f of liste) {
                if (choisis.length >= max) return;
                const cle = `${f.x}|${f.y}${f.z}`;
                if (vus.has(cle)) continue;
                vus.add(cle);
                choisis.push(f);
            }
        };
        prendre(memeForme, 1);
        prendre(autreForme, 2);
        prendre(memeForme, 3);
        prendre(fausses, 3);
        if (choisis.length < 3) continue;
        return itemMilieu(rng, { fig, bonne, leurres: choisis.slice(0, 3), piege });
    }
    return null;
}

/** Laquelle des deux conditions manque — jamais « c'est faux ». */
function pourquoiPasMilieu(fig, x, y, z) {
    const surLeSegment = entre(fig.points, x, y, z);
    const aEgaleDistance = carreLongueur(fig.points[x], fig.points[y])
        === carreLongueur(fig.points[x], fig.points[z]);
    if (!surLeSegment && aEgaleDistance) {
        return `${x} est bien à égale distance de ${y} et de ${z} — mais il n'est pas SUR `
            + `[${y}${z}]. Le milieu doit être les deux à la fois.`;
    }
    if (!surLeSegment) {
        return `${x} n'est pas sur [${y}${z}] : le milieu est entre les deux extrémités.`;
    }
    return `${x} est bien sur [${y}${z}], mais ${x}${y} et ${x}${z} ne sont pas égaux — `
        + 'ils ne portent pas la même marque.';
}

function itemMilieu(rng, { fig, bonne, leurres, piege }) {
    const svg = figureCodeeSvg(fig, { vedettes: [] });
    const eg = egalitesDe(fig);
    return makeItem({
        seed: rng.seed,
        generatorId: 'geo.elements',
        skillId: 'geo.milieu',
        answerKind: 'choice',
        prompt: {
            text: 'Quelle phrase est vraie ?',
            html: '<div class="game-question pd-consigne">Quelle phrase est '
                + 'VRAIE&nbsp;?</div>' + figure(svg),
            papier: 'Quelle phrase est vraie ?'
        },
        answer: 'ok',
        reponsePapier: bonne.texte,
        choices: finalizeChoices(rng, [
            { value: 'ok', label: bonne.texte, texte: bonne.texte, correct: true },
            ...leurres.map((l, i) => ({ value: 'faux' + i, label: l.texte, texte: l.texte,
                correct: false, why: l.why }))
        ], { count: 4 }),
        hints: [
            'Être le milieu de [AB] demande DEUX choses : être SUR le segment, et être à '
                + 'égale distance de A et de B.',
            eg.length
                ? `Le codage dit ${eg.map(([p, q]) => `${p} = ${q}`).join(', ')}. Regarde `
                    + 'maintenant où se trouve chaque point.'
                : 'Aucune marque commune sur cette figure : aucun couple de morceaux n\'est '
                    + 'annoncé égal.'
        ],
        schemas: ['', figure(svg)],
        explanation: bonne.positive
            ? `${bonne.x} est sur [${bonne.y}${bonne.z}] et ${bonne.x}${bonne.y} = `
                + `${bonne.x}${bonne.z} : c'est donc bien le milieu.`
            : pourquoiPasMilieu(fig, bonne.x, bonne.y, bonne.z),
        difficulty: piege ? 3 : 2,
        meta: { notion: 'milieu', piege }
    });
}
