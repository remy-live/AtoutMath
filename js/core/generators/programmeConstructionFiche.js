// LE PROGRAMME DE CONSTRUCTION, SUR PAPIER.
//
// Rémy, après l'écran : « oui » — la fiche.
//
// SUR LE PAPIER, ON NE PEUT PAS EXÉCUTER. C'est toute la différence, et il faut
// la regarder en face : à l'écran, la machine joue le programme et montre la
// figure obtenue, ce qui autorise plusieurs rédactions justes. Une feuille, elle,
// ne calcule rien. Elle ne peut donc pas dire « c'est juste » — c'est le
// professeur qui lit.
//
// ON N'A DONC PAS FAIT SEMBLANT. La feuille ne demande pas de cocher des cases
// pour rester corrigeable à la machine : elle demande d'ÉCRIRE, en toutes
// lettres, ce que l'écran fait poser en blocs. C'est l'exercice du contrôle, et
// c'est le seul endroit où l'élève doit produire la phrase lui-même — sur
// l'écran, le bloc la lui donne toute faite. Les deux supports ne font pas le
// même travail, et c'est pour cela qu'ils vont ensemble.
//
// LA RÉSERVE DE MOTS EST DANS LA CONSIGNE, et elle n'est pas une aide de
// confort : ce sont les huit tournures du chapitre, avec leurs crochets et
// leurs parenthèses. L'élève y recopie « le cercle de centre A passant par B »
// plutôt que d'inventer « le cercle autour de A jusqu'à B ». C'est le
// vocabulaire qu'on note, pas l'orthographe.
//
// LE CORRIGÉ EST UN PROGRAMME MODÈLE, PAS LA VÉRITÉ. Il en existe d'autres —
// la médiatrice s'obtient de deux façons, l'ordre de deux tracés indépendants
// est libre. La feuille de solutions le dit, pour que le professeur qui corrige
// vingt-huit copies ne refuse pas une bonne réponse écrite autrement.

import { makeItem } from '../items.js';
import {
    NIVEAUX, OPERATIONS, ORDRE_FAMILLES, FAMILLES,
    preparerNiveau, niveauxDisponibles, operationsDe, nomObjet, executer, cleObjet
} from '../programmeConstruction.js';

/** Deux lignes de plus que le modèle : de la place, sans donner le compte. */
const LIGNES_EN_PLUS = 2;

export const programmeConstructionFicheGenerator = {
    id: 'geo.construction.programme.fiche',
    label: 'Écrire un programme de construction',
    skills: ['geo.construction.programme'],
    answerKinds: ['figure'],
    params: [
        {
            id: 'familles', type: 'multiselect', deroulant: true, tout: 'familles',
            label: 'Les tournures autorisées', default: [...ORDRE_FAMILLES],
            aide: 'La réserve de mots imprimée en tête de feuille, et les figures qu\'on '
                + 'propose : une figure dont la construction réclamerait une tournure absente '
                + 'ne sort pas. Avec les seuls SEGMENTS ET DROITES, il reste les deux '
                + 'premières figures — ce qu\'on donne en début de sixième.',
            options: FAMILLES.map(f => ({ value: f.id, label: f.nom }))
        },
        {
            id: 'reserve', type: 'checkbox', label: 'Donner la réserve de mots', default: true,
            aide: 'Les tournures du chapitre, imprimées en petit sous chaque figure — là où '
                + 'l\'élève écrit, plutôt qu\'en haut de la page. Décochée, il doit les '
                + 'retrouver seul : c\'est ce qu\'on demande en contrôle, et c\'est une autre '
                + 'difficulté que celle de construire.'
        },
        {
            id: 'depuis', type: 'select', label: 'Commencer à la figure', default: 0,
            echelle: true,
            aide: 'On entre au milieu de l\'échelle quand les premières ont été faites en '
                + 'classe. Les figures se suivent ensuite dans l\'ordre de difficulté.',
            options: [
                { value: 0, label: '1 — Un segment', court: '1' },
                { value: 2, label: '3 — Un cercle', court: '3' },
                { value: 4, label: '5 — Le milieu', court: '5' },
                { value: 6, label: '7 — La perpendiculaire', court: '7' },
                { value: 9, label: '10 — Le triangle équilatéral', court: '10' }
            ]
        }
    ],

    generate(params, ctx) {
        const p = params || {};
        const familles = Array.isArray(p.familles) && p.familles.length ? p.familles : ORDRE_FAMILLES;
        const plan = niveauxDisponibles(familles);
        const dispo = plan.length ? plan : niveauxDisponibles(ORDRE_FAMILLES);

        // LES FIGURES SE SUIVENT, ELLES NE SE TIRENT PAS AU SORT. Une feuille de
        // six figures dans le désordre demanderait le losange avant le milieu.
        // Le rang de l'item dans la fiche EST le rang dans la progression.
        const depuis = Math.max(0, (p.depuis | 0));
        const debut = Math.max(0, dispo.findIndex(i => i >= depuis));
        const rang = (ctx && ctx.index) || 0;
        const niv = preparerNiveau(dispo[(debut + rang) % dispo.length]);

        // LE CORRIGÉ, EN FRANÇAIS. Le modèle désigne ses intersections par des
        // CLÉS d'objets — « droite|0.44|-0.89|3.2 » —, qu'on ne met pas sur une
        // feuille. On rejoue donc le programme et l'on rend à chaque tracé le
        // nom qu'il porte à l'écran : « la médiatrice de [AB] ».
        const phrases = [];
        const jusque = [];
        niv.modeleResolu.forEach(ins => {
            const avant = executer(jusque, niv.depart);
            const args = OPERATIONS[ins.op].prend.map((sorte, i) => {
                if (sorte !== 'objet') return ins.args[i];
                const o = avant.objets.find(x => cleObjet(x) === ins.args[i]);
                return o ? nomObjet(o, avant.points) : '…';
            });
            phrases.push(OPERATIONS[ins.op].libelle(args));
            jusque.push(ins);
        });

        // LA RÉSERVE DE MOTS DESCEND DANS LE BLOC, ET CE N'EST PAS UN CAPRICE.
        //
        // Sa place naturelle est en tête de feuille, avec la consigne. Mesuré :
        // la consigne des fiches est plafonnée à DEUX lignes (`.fp-consigne`,
        // `-webkit-line-clamp: 2`) — une règle partagée par les seize autres
        // fiches, et les blocs commencent juste dessous. La réserve y était
        // coupée à « Trace le segment […] ·… », c'est-à-dire que la seule chose
        // qu'on ne peut pas deviner disparaissait.
        //
        // Elle se pose donc sous chaque figure, en petit. C'est répété, et
        // c'est aussi mieux placé : on la lit là où l'on écrit, pas en haut de
        // la page. Et comme c'est une aide, elle se décoche — pour le contrôle,
        // où retrouver la tournure fait partie du travail.
        //
        // DEUX TROUS COLLÉS NE FONT QU'UNE ELLIPSE. « le segment [……] » se lit
        // comme une coquille ; « le segment […] » se lit comme une phrase à
        // compléter, ce qu'elle est.
        // UN BLANC À REMPLIR, PAS UNE ELLIPSE. Mesuré sur le PDF : le « … »
        // disparaissait purement et simplement — les polices standard d'un PDF
        // ne le portent pas, et la réserve s'imprimait « segment [] · droite ()
        // ». Deux traits bas le remplacent, et ils disent mieux ce qu'on
        // attend : un endroit où écrire.
        const reserve = operationsDe(familles)
            .map(op => op.gabarit.map(x => (typeof x === 'string' ? x : '__')).join('')
                .replace(/_{3,}/g, '__')
                // Le bloc porte l'objet, pas le verbe : « Trace le » et
                // « Place le » se répètent huit fois pour rien dans une réserve.
                .replace(/^(Trace|Place) (le|la|les) /, ''))
            .join(' · ');
        const avecReserve = p.reserve !== false;

        // LA CONSIGNE TIENT DANS SA PLACE, ET C'EST LA RÉSERVE QU'ON PROTÈGE.
        // Mesuré sur l'aperçu : la première version était coupée à « Tu peux
        // laisser tes… » — c'est-à-dire que les huit tournures, la seule chose
        // qu'on ne peut pas deviner, disparaissaient. On a donc taillé dans la
        // prose, pas dans la liste.
        const consigne = 'ÉCRIS LE PROGRAMME DE CONSTRUCTION de chaque figure : la suite des '
            + 'phrases qui permettrait de la refaire sans la voir. Les points marqués d\'une '
            + 'CROIX et d\'une lettre sont donnés ; tout le reste se construit. Attention à la '
            + 'NOTATION — [AB] le segment, (AB) la droite — et à l\'ORDRE : on ne nomme que ce '
            + 'qui existe déjà. Tes traits de construction peuvent rester.'
            + (avecReserve ? '' : ' Écris avec le vocabulaire du cours.');

        return makeItem({
            seed: (ctx && ctx.rng && ctx.rng.seed) || niv.id,
            generatorId: 'geo.construction.programme.fiche',
            skillId: 'geo.construction.programme',
            answerKind: 'figure',
            prompt: { text: consigne, papier: consigne },
            answer: phrases.join(' ; '),
            explanation: 'Il existe souvent PLUSIEURS programmes justes pour la même figure : '
                + 'la médiatrice de [AB] s\'obtient aussi en plaçant le milieu puis en traçant '
                + 'la perpendiculaire, et l\'ordre de deux tracés indépendants est libre. Ce '
                + 'qui compte est la figure obtenue.',
            difficulty: Math.min(5, 1 + Math.floor(niv0(niv) / 3)),
            meta: {
                niveauId: niv.id,
                titre: niv.titre,
                depart: niv.depart,
                // Les tracés à montrer : ceux qu'on exige, sans les aides — la
                // figure imprimée ne doit pas trahir la méthode.
                objets: niv.attendus.map(o => (o.genre === 'cercle'
                    ? { genre: 'cercle', c: { ...o.c }, r: o.r }
                    : { genre: o.genre, a: { ...o.a }, b: { ...o.b } })),
                lignes: niv.modele.length + LIGNES_EN_PLUS,
                reserve: avecReserve ? reserve : null,
                solution: phrases
            }
        });
    }
};

/** Le rang du niveau dans la liste, pour graduer la difficulté. */
function niv0(niv) {
    return NIVEAUX.findIndex(n => n.id === niv.id);
}
