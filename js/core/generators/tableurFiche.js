// LE TABLEUR — sur le papier.
//
// Un tableur sans ordinateur n'est pas une contradiction : ce qu'on apprend à
// l'École du Tableur, ce sont DEUX choses, et aucune des deux n'a besoin d'un
// écran.
//
//  · SE REPÉRER. B3 est la case de la colonne B et de la ligne 3 ; A1:C2 est le
//    rectangle qui va d'un coin à l'autre. C'est du repérage dans un tableau à
//    double entrée, exactement comme les coordonnées — et sur une feuille, on
//    peut demander l'inverse : voilà la zone coloriée, comment s'appelle-t-elle ?
//
//  · ÉCRIRE LA FORMULE. Et là, le papier fait MIEUX que l'écran. Devant le
//    tableur, l'élève tape « =12+15 » et obtient 27 : le logiciel dit oui, la
//    faute passe. Sur la feuille, la seule chose qu'on lui demande est
//    justement celle qu'il a sautée — écrire =B2+B3 plutôt que le résultat.
//    Rien ne calcule à sa place, donc rien ne masque l'erreur.

import { makeItem } from '../items.js';

const LETTRES = 'ABCDEFGH';

/** Le nom d'une case : la lettre de sa colonne, le numéro de sa ligne. */
export const nomCase = (c, r) => `${LETTRES[c]}${r + 1}`;
/** Le nom d'une plage : ses deux coins, séparés par deux points. */
export const nomPlage = (z) => `${nomCase(z.c1, z.r1)}:${nomCase(z.c2, z.r2)}`;

// Des situations, pas des lettres nues : une colonne « Prix (€) » dit ce que
// la somme veut dire, et c'est ce qui manque le plus aux exercices de tableur.
const SITUATIONS = [
    { titre: 'Courses', quoi: 'Article', unite: 'Prix (€)', lignes: ['Cahier', 'Stylo', 'Gomme', 'Règle', 'Colle'], min: 1, max: 9 },
    { titre: 'Notes', quoi: 'Devoir', unite: 'Note /20', lignes: ['Devoir 1', 'Devoir 2', 'Devoir 3', 'Devoir 4', 'Devoir 5'], min: 6, max: 20 },
    { titre: 'Distances', quoi: 'Étape', unite: 'Km', lignes: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'], min: 3, max: 25 },
    { titre: 'Classe', quoi: 'Groupe', unite: 'Élèves', lignes: ['6e A', '6e B', '6e C', '6e D', '6e E'], min: 18, max: 30 },
    { titre: 'Lecture', quoi: 'Livre', unite: 'Pages', lignes: ['Tome 1', 'Tome 2', 'Tome 3', 'Tome 4', 'Tome 5'], min: 40, max: 220 }
];

const FORMULES = [
    {
        id: 'somme', question: (c) => `le TOTAL des ${c.toLowerCase()}`,
        ecrire: (col, r1, r2) => `=SOMME(${col}${r1}:${col}${r2})`,
        etiquette: 'TOTAL',
        calcul: (vs) => vs.reduce((a, b) => a + b, 0)
    },
    {
        id: 'moyenne', question: (c) => `la MOYENNE des ${c.toLowerCase()}`,
        ecrire: (col, r1, r2) => `=MOYENNE(${col}${r1}:${col}${r2})`,
        etiquette: 'MOYENNE',
        calcul: (vs) => Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 10) / 10
    },
    {
        id: 'addition', question: () => 'la somme des DEUX PREMIÈRES lignes seulement',
        ecrire: (col, r1) => `=${col}${r1}+${col}${r1 + 1}`,
        etiquette: 'Les 2 premiers',
        calcul: (vs) => vs[0] + vs[1]
    },
    {
        id: 'difference', question: () => 'l\'ÉCART entre la première et la dernière ligne',
        ecrire: (col, r1, r2) => `=${col}${r2}-${col}${r1}`,
        etiquette: 'Dernier - 1er',
        calcul: (vs) => vs[vs.length - 1] - vs[0]
    }
];

export const tableurFicheGenerator = {
    id: 'don.tableur-fiche',
    label: 'Se repérer et écrire une formule',
    skills: ['don.tableur.reperage', 'don.tableur.formules'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'quoi', type: 'select', label: 'Ce qu\'on demande', default: 'melange',
            options: [
                { value: 'nommer', label: 'Nommer la case ou la plage coloriée' },
                { value: 'colorier', label: 'Colorier la plage nommée' },
                { value: 'formule', label: 'Écrire la formule' },
                { value: 'melange', label: 'Les trois, mélangés' }
            ]
        },
        {
            id: 'plages', type: 'checkbox', label: 'Plages (A1:C2), pas seulement des cases',
            aide: 'Sans les plages, on ne demande que des cases isolées — le tout premier niveau.',
            default: true
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const avecPlages = p.plages !== false;
        const choix = ['nommer', 'colorier', 'formule'];
        const quoi = choix.includes(p.quoi) ? p.quoi : rng.pick(choix);

        if (quoi === 'formule') return exoFormule(rng);
        return exoZone(rng, quoi, avecPlages);
    }
};

/** Une grille vide, une zone : ou bien on la nomme, ou bien on la colorie. */
function exoZone(rng, quoi, avecPlages) {
    const cols = rng.int(4, 6);
    const rows = rng.int(4, 6);
    // UNE PLAGE OU UNE CASE. La case seule n'est pas un cas dégénéré de la
    // plage : « B3 » et « B3:B3 » ne s'écrivent pas pareil, et c'est le nom
    // qu'on évalue.
    const plage = avecPlages && rng.bool(0.6);
    const c1 = rng.int(0, cols - (plage ? 2 : 1));
    const r1 = rng.int(0, rows - (plage ? 2 : 1));
    const c2 = plage ? rng.int(c1 + (rng.bool(0.35) ? 0 : 1), Math.min(cols - 1, c1 + 2)) : c1;
    const r2 = plage ? rng.int(r1 + (c2 > c1 ? 0 : 1), Math.min(rows - 1, r1 + 2)) : r1;
    const zone = { c1, r1, c2, r2 };
    const seule = c1 === c2 && r1 === r2;
    const nom = seule ? nomCase(c1, r1) : nomPlage(zone);
    const combien = (c2 - c1 + 1) * (r2 - r1 + 1);

    return makeItem({
        seed: rng.seed,
        generatorId: 'don.tableur-fiche',
        skillId: 'don.tableur.reperage',
        answerKind: 'grid',
        prompt: {
            text: quoi === 'nommer' ? 'Comment s\'appelle la zone coloriée ?' : `Colorie ${nom}.`,
            papier: quoi === 'nommer' ? 'Comment s\'appelle la zone coloriée ?' : `Colorie ${nom}.`,
            html: `<div class="game-question">${nom}</div>`
        },
        answer: quoi === 'nommer' ? nom : `${combien} cases`,
        explanation: seule
            ? `${nom} : colonne ${LETTRES[c1]}, ligne ${r1 + 1}.`
            : `${nom} : du coin ${nomCase(c1, r1)} au coin ${nomCase(c2, r2)}, soit ${combien} cases.`,
        difficulty: seule ? 1 : (combien > 4 ? 3 : 2),
        meta: {
            quoi, cols, rows, zone, nom, seule, combien,
            // Le canal par lequel la fiche évite de resservir la même zone.
            theme: `${quoi}-${nom}`
        }
    });
}

/** Un vrai petit tableau de données, et la formule à écrire sous la colonne. */
function exoFormule(rng) {
    const s = rng.pick(SITUATIONS);
    const f = rng.pick(FORMULES);
    const nb = f.id === 'addition' ? rng.int(3, 4) : rng.int(3, 5);
    const valeurs = [];
    for (let i = 0; i < nb; i++) valeurs.push(rng.int(s.min, s.max));

    // La colonne A porte les libellés, la colonne B les nombres ; la ligne 1
    // porte les en-têtes. Les données commencent donc en B2.
    const premiere = 2, derniere = 1 + nb;
    const formule = f.ecrire('B', premiere, derniere);
    const resultat = f.calcul(valeurs);

    return makeItem({
        seed: rng.seed,
        generatorId: 'don.tableur-fiche',
        skillId: 'don.tableur.formules',
        answerKind: 'grid',
        prompt: {
            text: `Écris en B${derniere + 1} la formule qui calcule ${f.question(s.unite)}.`,
            papier: `Écris en B${derniere + 1} la formule qui calcule ${f.question(s.unite)}.`,
            html: `<div class="game-question">${s.titre}</div>`
        },
        answer: formule,
        // LA VALEUR N'EST PAS LA RÉPONSE, elle sert à vérifier. Un élève qui
        // écrit le résultat au lieu de la formule n'a pas fait l'exercice, mais
        // celui qui corrige doit pouvoir contrôler d'un coup d'œil.
        explanation: `${formule} — ce qui donne ${String(resultat).replace('.', ',')}.`,
        difficulty: f.id === 'somme' ? 1 : (f.id === 'moyenne' ? 2 : 3),
        meta: {
            quoi: 'formule', situation: s.titre,
            entetes: [s.quoi, s.unite],
            libelles: s.lignes.slice(0, nb),
            valeurs, premiere, derniere,
            etiquette: f.etiquette, formule, resultat,
            theme: `formule-${s.titre}-${f.id}`
        }
    });
}
