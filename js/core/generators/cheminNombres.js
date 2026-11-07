// LE CHEMIN DES NOMBRES (Hidato) — de 1 jusqu'au bout, sans lever le crayon.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 octobre : « tu me les fais tous, avec des grilles faciles ».
//
// LA RÈGLE : écrire tous les nombres de 1 au dernier, de sorte que deux
// nombres qui SE SUIVENT occupent deux cases qui se touchent — par un côté ou
// par un coin.
//
// ── POURQUOI CELUI-LÀ EN PARTICULIER ────────────────────────────────────────
//
// C'est celui que je proposerais pour les élèves les plus fragiles. On ne
// calcule pas, on COMPTE : « après 13 vient 14, et 14 doit toucher 13 ». La
// réussite est à portée dès la première grille, et c'est exactement ce qui
// manque à un élève qui a renoncé.
//
// ET IL TRAVAILLE QUELQUE CHOSE DE RÉEL : la suite des entiers comme une
// CHAÎNE — chaque nombre a un avant et un après — plutôt que comme une liste
// qu'on récite. Quand deux nombres donnés sont à cinq cases l'un de l'autre et
// qu'il manque quatre nombres entre eux, le chemin est forcé : c'est du
// dénombrement, et cela se voit sur la grille.
//
// ── COMMENT ON FABRIQUE UNE GRILLE ──────────────────────────────────────────
//
// On tire d'abord le CHEMIN — un parcours qui passe par toutes les cases une
// fois — puis on efface des nombres tant que la solution reste unique. Tirer
// des nombres et chercher ensuite un chemin qui marche reviendrait à résoudre
// le problème ; partir du chemin le donne.

import { makeItem } from '../items.js';

const SKILL = 'num.logique.chemin';

export const FORMATS = {
    petit: { lignes: 4, colonnes: 4, nom: 'Petite — 4 × 4 (jusqu\'à 16)' },
    moyen: { lignes: 5, colonnes: 5, nom: 'Moyenne — 5 × 5 (jusqu\'à 25)' },
    grand: { lignes: 6, colonnes: 6, nom: 'Grande — 6 × 6 (jusqu\'à 36)' }
};

/** La part des nombres qu'on cherche à effacer. « Des grilles faciles ». */
const VIDES = { facile: 0.45, moyen: 0.65, difficile: 0.8 };

/**
 * CE QU'UNE TENTATIVE DE CHEMIN S'AUTORISE avant qu'on reparte d'un autre
 * départ, et ce que la série de preuves d'unicité s'autorise en tout. Les deux
 * sont des NOMBRES DE NŒUDS et non des millisecondes : une grille doit se
 * refabriquer à l'identique depuis sa graine, sur la tablette de l'élève comme
 * ici, et un plafond en temps la rendrait dépendante de la charge du
 * processeur. Voir `tirerChemin` et `compterChemins` pour ce que chacun corrige.
 */
const PLAFOND_CHEMIN = 20000;
const PLAFOND_NOEUDS = 200000;
const DIFFICULTE_ITEM = { facile: 1, moyen: 2, difficile: 3 };

/** Deux cases se touchent si elles partagent un côté OU un coin. */
const colle = (a, b) => Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1
    && !(a[0] === b[0] && a[1] === b[1]);

/**
 * UN CHEMIN QUI PASSE PAR TOUTES LES CASES, tiré au sort.
 *
 * On avance au hasard vers une case voisine encore libre, et l'on revient sur
 * ses pas quand on s'enferme. Comme les déplacements vont aussi en diagonale,
 * il y a beaucoup plus de chemins qu'il n'y paraît.
 *
 * ── MAIS « QUELQUES MILLISECONDES » ÉTAIT UNE MESURE EN 4 × 4 ───────────────
 *
 * Le commentaire d'origine promettait un chemin en quelques millisecondes.
 * C'était vrai, et mesuré — sur les deux formats qui existaient alors. En
 * 6 × 6 le même code ne rendait pas la main en quarante secondes : un
 * parcours hamiltonien qui s'enferme dans un coin fait remonter la recherche
 * sur trente coups, et il y a trente-six cases à visiter.
 *
 * ON PLAFONNE DONC CHAQUE TENTATIVE et l'on repart d'ailleurs : un chemin se
 * trouve presque toujours vite quand le départ est bon, et jamais quand il est
 * mauvais. Quarante départs plafonnés valent mieux qu'un seul illimité.
 */
function tirerChemin(rng, lignes, colonnes, plafond = PLAFOND_CHEMIN) {
    const total = lignes * colonnes;
    const num = Array.from({ length: lignes }, () => Array(colonnes).fill(0));
    const ordre = [];
    const voisines = (r, c) => {
        const out = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (!dr && !dc) continue;
                const a = r + dr, b = c + dc;
                if (a >= 0 && b >= 0 && a < lignes && b < colonnes && !num[a][b]) out.push([a, b]);
            }
        }
        return out;
    };
    let noeuds = 0;
    const avancer = (r, c, k) => {
        num[r][c] = k;
        ordre.push([r, c]);
        if (k === total) return true;
        if (++noeuds > plafond) { num[r][c] = 0; ordre.pop(); return false; }
        for (const [a, b] of rng.shuffle(voisines(r, c))) {
            if (avancer(a, b, k + 1)) return true;
            if (noeuds > plafond) break;
        }
        num[r][c] = 0;
        ordre.pop();
        return false;
    };
    for (let essai = 0; essai < 40; essai++) {
        num.forEach(l => l.fill(0));
        ordre.length = 0;
        noeuds = 0;
        if (avancer(rng.int(0, lignes - 1), rng.int(0, colonnes - 1), 1)) return num;
    }
    return null;
}

/**
 * COMPTE LES CHEMINS COMPATIBLES AVEC CE QUI EST ÉCRIT. On s'arrête à `limite`.
 *
 * On pose les nombres dans l'ordre, de 1 au dernier : à chaque étape, soit le
 * nombre est donné — et il doit toucher le précédent —, soit on essaie les
 * cases voisines encore libres. C'est l'ordre le plus contraint qui soit.
 *
 * ET IL EST PLAFONNÉ EN NŒUDS (`budget`), partagé par toute la série
 * d'effacements : entre deux nombres donnés éloignés, le nombre de chemins à
 * essayer monte vite, et une preuve interrompue n'est pas une preuve. Quand le
 * plafond tombe, l'appelant REMET la case qu'il voulait effacer — une case de
 * plus donnée rend la grille plus facile, jamais fausse.
 */
export function compterChemins(lignes, colonnes, donnees, limite = 2, budget = null) {
    const bourse = budget || { noeuds: Infinity, epuise: false };
    const total = lignes * colonnes;
    const place = new Map();
    for (let r = 0; r < lignes; r++) {
        for (let c = 0; c < colonnes; c++) if (donnees[r][c]) place.set(donnees[r][c], [r, c]);
    }
    const pris = Array.from({ length: lignes }, () => Array(colonnes).fill(false));
    place.forEach(([r, c]) => { pris[r][c] = true; });
    let trouves = 0;

    const poser = (k, ou) => {
        if (trouves >= limite) return;
        if (--bourse.noeuds < 0) { bourse.epuise = true; return; }
        if (k > total) { trouves++; return; }
        const impose = place.get(k);
        if (impose) {
            if (ou && !colle(ou, impose)) return;
            poser(k + 1, impose);
            return;
        }
        const essais = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (!dr && !dc) continue;
                const a = ou[0] + dr, b = ou[1] + dc;
                if (a >= 0 && b >= 0 && a < lignes && b < colonnes && !pris[a][b]) {
                    essais.push([a, b]);
                }
            }
        }
        for (const [a, b] of essais) {
            pris[a][b] = true;
            poser(k + 1, [a, b]);
            pris[a][b] = false;
            if (trouves >= limite || bourse.epuise) return;
        }
    };

    const depart = place.get(1);
    if (!depart) return 0;
    poser(2, depart);
    return trouves;
}

export const cheminNombresGenerator = {
    id: 'logique.chemin-nombres',
    label: 'Le Chemin des Nombres',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'format', type: 'select', label: 'Taille de la grille', default: 'petit',
            options: Object.entries(FORMATS).map(([value, f]) => ({ value, label: f.nom }))
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'facile',
            aide: 'Elle change le nombre de cases déjà écrites. En facile, plus de la moitié '
                + 'des nombres est donnée.',
            options: [
                { value: 'facile', label: 'Facile — plus de la moitié est donnée' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'difficile', label: 'Difficile' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const f = FORMATS[p.format] || FORMATS.petit;
        const { lignes, colonnes } = f;
        const total = lignes * colonnes;
        const part = VIDES[p.difficulte] || VIDES.facile;

        let sol = tirerChemin(rng, lignes, colonnes);
        if (!sol) {
            // Filet : le serpent, qui existe toujours — on descend chaque
            // colonne à tour de rôle.
            sol = Array.from({ length: lignes }, () => Array(colonnes).fill(0));
            let k = 1;
            for (let r = 0; r < lignes; r++) {
                for (let j = 0; j < colonnes; j++) {
                    const c = r % 2 ? colonnes - 1 - j : j;
                    sol[r][c] = k++;
                }
            }
        }

        // LE PREMIER ET LE DERNIER RESTENT TOUJOURS ÉCRITS : sans le 1, on ne
        // sait pas par où commencer, et la grille n'a plus de solution unique
        // mais des dizaines, toutes les mêmes à l'envers près.
        const donnees = sol.map(l => l.slice());
        const ordre = rng.shuffle(Array.from({ length: total }, (_, i) => i));
        const but = Math.round(total * part);
        // UNE SEULE BOURSE POUR TOUTE LA SÉRIE : trente-six preuves plafonnées
        // chacune ne borneraient rien. S'arrêter tôt est sans danger — on garde
        // une case de plus écrite, donc une grille plus facile.
        const bourse = { noeuds: PLAFOND_NOEUDS, epuise: false };
        let efface = 0;
        for (const i of ordre) {
            if (efface >= but || bourse.epuise) break;
            const r = Math.floor(i / colonnes), c = i % colonnes;
            const v = donnees[r][c];
            if (v === 1 || v === total) continue;
            donnees[r][c] = 0;
            const n = compterChemins(lignes, colonnes, donnees, 2, bourse);
            if (n === 1 && !bourse.epuise) efface++;
            else donnees[r][c] = v;
        }

        const cases = [];
        for (let r = 0; r < lignes; r++) {
            for (let c = 0; c < colonnes; c++) {
                cases.push(donnees[r][c]
                    ? { r, c, type: 'donnee', valeur: donnees[r][c] }
                    : { r, c, type: 'vide' });
            }
        }

        const consigne = `Écris tous les nombres de 1 à ${total}. Deux nombres qui se suivent `
            + 'doivent occuper deux cases qui se touchent, par un côté ou par un coin.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.chemin-nombres',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne, papier: consigne,
                html: `<div class="game-question gn-consigne">${consigne}</div>`
            },
            answer: 'g' + sol.map(l => l.join(',')).join('/'),
            hints: [
                'Pars du 1 et cherche où peut aller le 2 : il n\'y a souvent qu\'une ou deux '
                    + 'cases possibles.',
                'Regarde deux nombres donnés proches l\'un de l\'autre — par exemple 7 et 10. '
                    + 'Il manque 8 et 9 entre eux : le chemin qui les relie est presque forcé.',
                'Une case coincée dans un coin ne touche que trois voisines : c\'est souvent '
                    + 'elle qui décide.'
            ],
            explanation: `Les nombres de 1 à ${total} forment une chaîne : chacun touche le `
                + 'précédent et le suivant.',
            difficulty: DIFFICULTE_ITEM[p.difficulte] || 1,
            meta: {
                lignes, colonnes, cases, solution: sol,
                chiffres: { min: 1, max: total },
                // AU-DELÀ DE NEUF, PAS DE JETONS : trente-six boutons sous une
                // grille, ce n'est plus une palette, c'est un mur. Le champ de
                // saisie ouvre le pavé numérique du téléphone, qui fait mieux.
                palette: false,
                titreCourt: 'Chemin des Nombres',
                texteLecon: 'Deux nombres qui se suivent occupent deux cases qui se touchent.'
            }
        });
    }
};

export default cheminNombresGenerator;
