// LE CHAT GÉOMÈTRE — sur le papier, dans l'autre sens.
//
// À l'écran, l'élève voit la figure et cherche le programme : il essaie, il
// regarde, il corrige. C'est la bonne façon d'apprendre — mais c'est aussi une
// façon de ne jamais anticiper. Tant qu'on peut lancer, on ne prévoit pas.
//
// SUR LA FEUILLE, ON RENVERSE : le programme est donné, la figure est à
// tracer. Rien ne s'exécute, donc il faut lire « répéter 6 fois : avancer de
// 30, tourner de 60° » et SAVOIR que cela ferme un hexagone. C'est de la
// géométrie pure, et c'est exactement ce qu'on demande au brevet quand on
// donne un programme de construction.
//
// Le second exercice est l'angle manquant : la figure est là, le programme
// aussi, et il y a un trou à la place du nombre de degrés. Un polygone
// régulier à n côtés se ferme en tournant de 360 ÷ n — c'est LA propriété du
// chapitre, et ici elle est la seule façon de répondre.

import { makeItem } from '../items.js';
import { executer } from '../scratchVM.js';

const av = (n) => ({ type: 'avancer', valeur: n });
const dr = (n) => ({ type: 'droite', valeur: n });
const ga = (n) => ({ type: 'gauche', valeur: n });
const rep = (n, corps) => ({ type: 'repeter', valeur: n, corps });

/**
 * Les figures tirables. Chacune sait construire son programme et dire quel est
 * son angle caractéristique — celui qu'on efface pour le second exercice.
 *
 * Les côtés sont des multiples de 10 : un carreau vaut 10 pas, et une figure
 * dont les sommets tombent entre deux lignes ne se compte plus.
 */
const FIGURES = [
    {
        id: 'carre', nom: 'un carré', facile: true,
        faire: (rng) => { const c = rng.int(3, 5) * 10; return { script: [rep(4, [av(c), dr(90)])], angle: 90, n: 4 }; }
    },
    {
        id: 'triangle', nom: 'un triangle équilatéral', facile: true,
        faire: (rng) => { const c = rng.int(4, 6) * 10; return { script: [rep(3, [av(c), dr(120)])], angle: 120, n: 3 }; }
    },
    {
        id: 'hexagone', nom: 'un hexagone régulier',
        faire: (rng) => { const c = rng.int(2, 4) * 10; return { script: [rep(6, [av(c), dr(60)])], angle: 60, n: 6 }; }
    },
    {
        id: 'octogone', nom: 'un octogone régulier',
        faire: (rng) => { const c = rng.int(2, 3) * 10; return { script: [rep(8, [av(c), dr(45)])], angle: 45, n: 8 }; }
    },
    {
        id: 'rectangle', nom: 'un rectangle', facile: true,
        faire: (rng) => {
            const L = rng.int(4, 6) * 10, l = rng.int(2, 3) * 10;
            return { script: [rep(2, [av(L), dr(90), av(l), dr(90)])], angle: 90, n: 4 };
        }
    },
    {
        id: 'escalier', nom: 'un escalier', dur: true,
        faire: (rng) => {
            const c = rng.int(2, 3) * 10, marches = rng.int(3, 4);
            return { script: [rep(marches, [av(c), dr(90), av(c), ga(90)])], angle: 90, n: 4 };
        }
    },
    {
        id: 'etoile', nom: 'une étoile à cinq branches', dur: true,
        faire: (rng) => { const c = rng.int(5, 7) * 10; return { script: [rep(5, [av(c), dr(144)])], angle: 144, n: 5 }; }
    }
];

/** Le programme mis en toutes lettres, une ligne par bloc, indentée. */
/**
 * Le programme, ligne par ligne — ET LE GENRE DE CHAQUE BLOC.
 *
 * La fiche ne se contente plus d'écrire du texte indenté : elle dessine de
 * VRAIS blocs, aux couleurs de Scratch. Le « genre » dit lequel — Mouvement
 * (bleu) ou Contrôle (jaune) —, et « fin » ferme le C d'un « répéter ». Un
 * élève qui a le logiciel sous les yeux doit reconnaître la même chose sur sa
 * feuille : un programme recopié en lignes de texte est déjà une traduction.
 */
export function ecrireProgramme(script, angleCache) {
    const out = [];
    // UN BLOC SE DIT EN TROIS MORCEAUX : ce qui précède le nombre, LE NOMBRE,
    // et ce qui le suit. C'est ainsi que Scratch l'affiche — « avancer de
    // (50) pas », le nombre dans une gélule blanche —, et la fiche le dessine
    // maintenant pareil. `texte` reste la phrase entière : elle sert au dire à
    // voix haute, aux tests, et à tout rendu qui n'a pas de gélule à offrir.
    const bloc = (creux, genre, avant, valeur, apres, reste = {}) => ({
        creux, genre, avant, valeur, apres,
        texte: `${avant}${valeur}${apres}`, ...reste
    });
    const aller = (blocs, creux) => {
        for (const b of blocs) {
            if (b.type === 'repeter') {
                out.push(bloc(creux, 'controle', 'répéter ', b.valeur, ' fois'));
                aller(b.corps || [], creux + 1);
                // La barre du bas qui referme le C. Sans elle, on ne voit pas
                // où la répétition s'arrête — et c'est justement la question.
                out.push({ creux, texte: '', genre: 'controle', fin: true });
                continue;
            }
            if (b.type === 'avancer') {
                out.push(bloc(creux, 'mouvement', 'avancer de ', b.valeur, ' pas'));
                continue;
            }
            // Pas de flèche ↻ : elle n'existe pas dans la police du PDF, et
            // « à droite » le dit déjà. L'aperçu et la feuille imprimée
            // doivent porter le même texte, sans quoi l'un des deux ment.
            const sens = b.type === 'droite' ? 'à droite' : 'à gauche';
            // LE TROU EST À LA PLACE DU NOMBRE, pas de la ligne entière : on
            // doit voir qu'il s'agit d'un angle, et lequel.
            const val = (angleCache && b.valeur === angleCache) ? '……' : b.valeur;
            out.push(bloc(creux, 'mouvement', `tourner ${sens} de `, val, '°'));
        }
    };
    aller(script, 0);
    return out;
}

export const chatFicheGenerator = {
    id: 'geo.chat-fiche',
    label: 'Programme de construction du chat',
    skills: ['geo.figure.programme'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'quoi', type: 'select', label: 'Ce qu\'on demande', default: 'melange',
            options: [
                { value: 'dessiner', label: 'Tracer la figure que dessine le programme' },
                { value: 'angle', label: 'Retrouver l\'angle manquant' },
                { value: 'melange', label: 'Les deux, mélangés' }
            ]
        },
        {
            id: 'niveau', type: 'select', label: 'Difficulté', default: 'moyen',
            options: [
                { value: 'facile', label: 'Carré, rectangle, triangle' },
                { value: 'moyen', label: 'Jusqu\'à l\'octogone' },
                { value: 'difficile', label: 'Escalier et étoile compris' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const niveau = ['facile', 'moyen', 'difficile'].includes(p.niveau) ? p.niveau : 'moyen';
        const quoi = ['dessiner', 'angle'].includes(p.quoi) ? p.quoi : rng.pick(['dessiner', 'angle']);

        const pool = FIGURES.filter(f => (niveau === 'facile' ? f.facile
            : (niveau === 'moyen' ? !f.dur : true)));
        const fig = rng.pick(pool.length ? pool : FIGURES);
        const { script, angle, n } = fig.faire(rng);

        // On exécute pour connaître l'encombrement : c'est lui qui donne la
        // taille du quadrillage, et c'est aussi lui qui dit où poser le chat
        // pour que la figure tienne dans le cadre.
        const { traces } = executer(script, { x: 0, y: 0, dir: 90, stylo: true });
        const pts = traces.flat();
        const xs = pts.map(q => q.x), ys = pts.map(q => q.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        // Un carreau vaut 10 pas ; on ajoute une marge d'un carreau de chaque
        // côté et l'on arrondit vers le haut.
        const cases = Math.max(6, Math.ceil(Math.max(maxX - minX, maxY - minY) / 10) + 2);
        // « || 0 » : un arrondi peut rendre -0, qui traîne ensuite dans le
        // JSON de l'item et se compare mal.
        const depart = {
            x: Math.round((-(minX + maxX) / 2) / 10) * 10 || 0,
            y: Math.round((-(minY + maxY) / 2) / 10) * 10 || 0,
            dir: 90, stylo: true
        };

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.chat-fiche',
            skillId: 'geo.figure.programme',
            answerKind: 'grid',
            prompt: {
                text: quoi === 'angle'
                    ? 'Quel angle manque pour que la figure se ferme ?'
                    : 'Trace la figure que dessine ce programme.',
                papier: quoi === 'angle'
                    ? 'Quel angle manque pour que la figure se ferme ?'
                    : 'Trace la figure que dessine ce programme.',
                html: `<div class="game-question">${fig.nom}</div>`
            },
            answer: quoi === 'angle' ? `${angle}°` : fig.nom,
            explanation: quoi === 'angle'
                ? `${angle}° — ${fig.id === 'etoile'
                    ? 'une étoile à cinq branches tourne de 2 × 360 ÷ 5.'
                    : `un polygone régulier à ${n} côtés se ferme en tournant de 360 ÷ ${n}.`}`
                : `Le programme dessine ${fig.nom}.`,
            difficulty: fig.dur ? 3 : (fig.facile ? 1 : 2),
            meta: {
                quoi, figure: fig.id, nom: fig.nom, angle, n,
                script, depart, cases,
                lignes: ecrireProgramme(script, quoi === 'angle' ? angle : null),
                // Le tracé, en pas de chat : la fiche n'a plus qu'à le mettre
                // à l'échelle de son quadrillage.
                traces: executer(script, depart).traces,
                theme: `${quoi}-${fig.id}`
            }
        });
    }
};
