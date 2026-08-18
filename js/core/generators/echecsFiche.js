// L'ÉCHIQUIER — sur le papier, comme repère.
//
// « e4 » n'est pas du jargon de joueur : c'est un COUPLE DE COORDONNÉES dans
// un tableau à double entrée, une lettre pour la colonne et un chiffre pour la
// ligne — exactement ce qu'on demande en sixième avec les repères, et
// exactement ce qu'on retrouvera au tableur avec B3. L'échiquier a l'avantage
// d'être une grille que les élèves regardent volontiers.
//
// Trois exercices :
//   · NOMMER   — les pièces sont posées, on écrit leurs cases ;
//   · PLACER   — les cases sont écrites, on pose les pièces (la grille à
//     composer : c'est le sens inverse, et il est plus difficile) ;
//   · DÉPLACER — une seule pièce, et il faut marquer TOUTES les cases où elle
//     peut aller. Là ce n'est plus du repérage mais de la géométrie : les
//     diagonales du fou, les alignements de la tour, le saut du cavalier qui
//     n'est ni l'un ni l'autre.
//
// Les cases atteignables ne sont pas recalculées ici : c'est le moteur d'échecs
// du projet (core/echecs.js, validé au perft) qui les donne. Une fiche qui
// mentirait sur les déplacements d'un cavalier serait pire qu'une absence de
// fiche.

import { makeItem } from '../items.js';
import { fenVersEtat, coups } from '../echecs.js';

// Les initiales françaises : Tour, Cavalier, Fou, Dame, Roi, Pion. C'est la
// notation du cours d'échecs en France, et elle s'imprime — les symboles
// Unicode (♞) n'existent pas dans la police du PDF.
export const PIECES = {
    R: { lettre: 'T', nom: 'tour', fen: 'R', feminin: true },
    N: { lettre: 'C', nom: 'cavalier', fen: 'N' },
    B: { lettre: 'F', nom: 'fou', fen: 'B' },
    Q: { lettre: 'D', nom: 'dame', fen: 'Q', feminin: true },
    P: { lettre: 'P', nom: 'pion', fen: 'P' }
};

/** « la tour noire », « le cavalier blanc » : le genre suit la PIÈCE. */
export function direPiece(type, noir) {
    const p = PIECES[type];
    if (p.feminin) return `la ${p.nom} ${noir ? 'noire' : 'blanche'}`;
    return `le ${p.nom} ${noir ? 'noir' : 'blanc'}`;
}

const COLONNES = 'abcdefgh';

/** Le nom d'une case : sa colonne en lettre, sa ligne en chiffre. */
export const nomCaseEchecs = (x, y) => `${COLONNES[x]}${8 - y}`;
/** L'inverse : « e4 » redonne ses coordonnées dans la grille. */
export function caseDepuisNom(nom) {
    return { x: COLONNES.indexOf(nom[0]), y: 8 - Number(nom[1]) };
}

/** Une position en FEN, à partir d'une liste de pièces posées. */
function versFen(posees, trait) {
    const cases = new Array(64).fill(null);
    posees.forEach(p => { cases[p.y * 8 + p.x] = p.fen; });
    const rangs = [];
    for (let y = 0; y < 8; y++) {
        let ligne = '', vide = 0;
        for (let x = 0; x < 8; x++) {
            const c = cases[y * 8 + x];
            if (!c) { vide++; continue; }
            if (vide) { ligne += vide; vide = 0; }
            ligne += c;
        }
        if (vide) ligne += vide;
        rangs.push(ligne);
    }
    // Pas de roque, pas de prise en passant : ces deux règles n'ont rien à
    // faire dans un exercice de repérage, et le roque ajouterait au roi des
    // cases qu'aucun élève ne devinerait.
    return `${rangs.join('/')} ${trait === 'B' ? 'w' : 'b'} - -`;
}

const loin = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > 1;

export const echecsFicheGenerator = {
    id: 'logi.echecs-fiche',
    label: 'L\'échiquier comme repère',
    // Lire « e4 » sur un échiquier, c'est lire un couple de coordonnées :
    // la compétence existe, elle s'appelle `geo.repere.coord`.
    skills: ['geo.repere.coord'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'quoi', type: 'select', label: 'Ce qu\'on demande', default: 'melange',
            options: [
                { value: 'nommer', label: 'Nommer la case de chaque pièce' },
                { value: 'placer', label: 'Placer les pièces aux cases données' },
                { value: 'deplacements', label: 'Marquer où la pièce peut aller' },
                { value: 'melange', label: 'Les trois, mélangés' }
            ]
        },
        // Cinq au plus : les cinq types sont alors tous différents, et chaque
        // ligne de réponse (« C (noir) : …… ») désigne une seule pièce. Au
        // sixième, deux cavaliers noirs rendraient la correction impossible.
        { id: 'pieces', type: 'number', label: 'Pièces à repérer', default: 4, min: 2, max: 5 }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const choix = ['nommer', 'placer', 'deplacements'];
        const quoi = choix.includes(p.quoi) ? p.quoi : rng.pick(choix);
        const combien = Math.max(2, Math.min(5, Number(p.pieces) || 4));
        return quoi === 'deplacements' ? exoDeplacements(rng) : exoReperage(rng, quoi, combien);
    }
};

/** Des pièces posées sur des cases distinctes : à nommer, ou à placer. */
function exoReperage(rng, quoi, combien) {
    const types = rng.shuffle(Object.keys(PIECES));
    const posees = [];
    const prises = new Set();
    for (let i = 0; i < combien; i++) {
        // LE TYPE D'ABORD, LA CASE ENSUITE. Dans l'autre sens, un pion tombé
        // sur la première rangée devait changer de type — et se retrouvait
        // parfois en double avec une tour déjà posée, deux lignes de réponse
        // « T (noir) : …… » pour deux pièces différentes.
        const type = types[i % types.length];
        // Un pion sur la première ou la dernière rangée n'existe pas : sur une
        // fiche d'échecs, une position impossible se remarque.
        const yMin = type === 'P' ? 1 : 0, yMax = type === 'P' ? 6 : 7;
        let x, y, k = 0;
        do { x = rng.int(0, 7); y = rng.int(yMin, yMax); k++; }
        while (prises.has(`${x},${y}`) && k < 60);
        prises.add(`${x},${y}`);
        posees.push({
            x, y, type, noir: rng.bool(),
            lettre: PIECES[type].lettre, nom: PIECES[type].nom,
            // La casse FEN porte la couleur : majuscule pour les blancs.
            fen: rng.bool() ? PIECES[type].fen.toLowerCase() : PIECES[type].fen,
            case: nomCaseEchecs(x, y)
        });
    }
    posees.sort((a, b) => a.case.localeCompare(b.case));

    return makeItem({
        seed: rng.seed,
        generatorId: 'logi.echecs-fiche',
        skillId: 'geo.repere.lire',
        answerKind: 'grid',
        prompt: {
            text: quoi === 'nommer'
                ? 'Écris la case de chaque pièce.'
                : `Place les pièces : ${posees.map(q => `${q.lettre} en ${q.case}`).join(', ')}.`,
            papier: quoi === 'nommer'
                ? 'Écris la case de chaque pièce.'
                : `Place les pièces : ${posees.map(q => `${q.lettre} en ${q.case}`).join(', ')}.`,
            html: `<div class="game-question">${posees.length} pièces</div>`
        },
        answer: posees.map(q => `${q.lettre}${q.case}`).join(' '),
        explanation: posees.map(q => `${direPiece(q.type, q.noir)} en ${q.case}`).join(' ; ') + '.',
        difficulty: combien > 4 ? 3 : 2,
        meta: {
            quoi, posees, combien: posees.length,
            theme: `${quoi}-${posees.map(q => q.case).join('.')}`
        }
    });
}

/** Une pièce, quelques obstacles, et toutes les cases où elle peut aller. */
function exoDeplacements(rng) {
    // Le pion est écarté : ses déplacements dépendent de la couleur, du rang de
    // départ et de ce qu'il y a en diagonale. C'est une leçon à part, pas un
    // exercice de géométrie.
    for (let essai = 0; essai < 120; essai++) {
        // TOUR, FOU, CAVALIER — et pas la dame. La dame n'est que la tour plus
        // le fou : elle n'apprend aucune figure nouvelle, et depuis le centre
        // elle donne vingt-cinq cases à marquer. Ces trois-là sont exactement
        // les trois géométries : l'alignement, la diagonale, et le saut qui
        // n'est ni l'un ni l'autre.
        const type = rng.pick(['R', 'N', 'B']);
        // Les deux rois sont indispensables : le moteur ne donne que les coups
        // LÉGAUX, et la légalité se définit par rapport au roi. On les met dans
        // deux coins opposés, loin de tout.
        const roiB = { x: 0, y: 7, fen: 'K' };
        const roiN = { x: 7, y: 0, fen: 'k' };
        const x = rng.int(1, 6), y = rng.int(1, 6);
        const piece = { x, y, fen: PIECES[type].fen };
        if (!loin(piece, roiB) || !loin(piece, roiN)) continue;

        // Deux obstacles noirs : ils font la différence entre « la tour va
        // jusqu'au bord » et « la tour s'arrête ou prend ». Sans eux, l'exercice
        // se réduit à recopier une croix.
        const obstacles = [];
        for (let i = 0; i < 2; i++) {
            const ox = rng.int(0, 7), oy = rng.int(1, 6);
            const o = { x: ox, y: oy, fen: 'p' };
            if ((ox === x && oy === y) || !loin(o, roiB) || !loin(o, roiN)) continue;
            if (obstacles.some(q => q.x === ox && q.y === oy)) continue;
            obstacles.push(o);
        }

        const etat = fenVersEtat(versFen([roiB, roiN, piece, ...obstacles], 'B'));
        const de = y * 8 + x;
        const cibles = coups(etat).filter(c => c.de === de)
            .map(c => ({ x: c.vers % 8, y: Math.floor(c.vers / 8) }));
        // Une pièce coincée ne fait pas un exercice ; une dame au grand large
        // en donne vingt-cinq, et marquer vingt-cinq croix n'apprend plus rien
        // après la dixième.
        if (cibles.length < 4 || cibles.length > 16) continue;

        const posees = [
            { ...piece, type, noir: false, lettre: PIECES[type].lettre, nom: PIECES[type].nom, case: nomCaseEchecs(x, y) },
            ...obstacles.map(o => ({
                ...o, type: 'P', noir: true, lettre: 'P', nom: 'pion', case: nomCaseEchecs(o.x, o.y)
            }))
        ];
        const noms = cibles.map(c => nomCaseEchecs(c.x, c.y)).sort();

        return makeItem({
            seed: rng.seed,
            generatorId: 'logi.echecs-fiche',
            skillId: 'geo.repere.lire',
            answerKind: 'grid',
            prompt: {
                text: `Marque toutes les cases où ${direPiece(type, false)} peut aller.`,
                papier: `Marque toutes les cases où ${direPiece(type, false)} peut aller.`,
                html: `<div class="game-question">${PIECES[type].nom}</div>`
            },
            answer: noms.join(' '),
            explanation: `${noms.length} cases : ${noms.join(', ')}. `
                + 'Les pions noirs bloquent — on peut les prendre, mais pas les traverser.',
            difficulty: type === 'N' ? 2 : 3,
            meta: {
                quoi: 'deplacements', type, nom: PIECES[type].nom,
                posees, cibles, noms, depart: nomCaseEchecs(x, y),
                theme: `deplacements-${type}-${nomCaseEchecs(x, y)}`
            }
        });
    }
    // Filet : si rien n'a marché, une tour au centre d'un plateau nu marche
    // toujours.
    return exoReperage(rng, 'nommer', 3);
}
