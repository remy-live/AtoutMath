// COMBIEN DE CUBES ? — le comptage d'un empilement.
//
// Rémy : « j'aimerais un exercice de comptage de cubes ».
//
// TROIS QUESTIONS SUR LE MÊME DESSIN, et ce sont trois compétences :
//
//   · COMBIEN EN TOUT — il faut compter ce qu'on ne voit pas. C'est la
//     question qui prépare le volume : un pavé plein répond L × p × h, et
//     l'élève qui l'a vu une fois ne recompte plus jamais cube par cube.
//   · COMBIEN AU SOL — on lit la BASE, pas le volume. Deux empilements très
//     différents peuvent poser le même nombre de cubes par terre, et s'en
//     apercevoir sépare l'aire du volume mieux qu'une leçon.
//   · COMBIEN EN AJOUTER pour remplir la boîte — une soustraction posée sur
//     un objet, et la première rencontre avec « le pavé qui contient ».
//
// LE DESSIN NE MENT PAS, MAIS IL CACHE. C'est tout l'exercice, et c'est
// pourquoi le noyau garantit qu'aucun cube ne flotte : ce qui est caché est
// dessous ou derrière, jamais suspendu (voir core/cubes.js).

import { makeItem, finalizeChoices } from '../items.js';
import { construire, mesures, FAMILLES } from '../cubes.js';
import { cubesSvg } from '../cubesSvg.js';
import { figure as encadrer } from '../figures.js';

/** Les tailles proposées, du bac à sable au vrai comptage. */
const TAILLES = {
    petit: { largeur: 2, profondeur: 2, hauteur: 2, label: '2 × 2 × 2 — pour découvrir' },
    moyen: { largeur: 3, profondeur: 3, hauteur: 3, label: '3 × 3 × 3' },
    grand: { largeur: 4, profondeur: 3, hauteur: 3, label: '4 × 3 × 3 — plus de cachés' }
};

const QUESTIONS = {
    total: {
        id: 'total', label: 'Combien de cubes en tout ?',
        enonce: 'Combien de cubes en tout ?',
        valeur: (m) => m.total,
    },
    sol: {
        id: 'sol', label: 'Combien de cubes touchent le sol ?',
        enonce: 'Combien de cubes touchent le sol ?',
        valeur: (m) => m.sol,
    },
    ajouter: {
        id: 'ajouter', label: 'Combien en ajouter pour remplir le pavé ?',
        enonce: 'Combien de cubes faut-il AJOUTER pour obtenir un pavé plein ?',
        valeur: (m) => m.aAjouter,
    }
};

export const cubesGenerator = {
    id: 'geo.cubes',
    label: 'Combien de cubes ?',
    skills: ['geo.espace.cubes'],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille de l\'empilement', default: 'moyen',
            aide: 'Ce n\'est pas le nombre de cubes qui fait la difficulté, c\'est le nombre '
                + 'de CACHÉS : un 2 × 2 × 2 n\'en cache qu\'un, un 4 × 3 × 3 en cache six.',
            options: Object.entries(TAILLES).map(([value, t]) => ({ value, label: t.label }))
        },
        {
            id: 'formes', type: 'multiselect', label: 'Formes d\'empilement',
            aide: 'Ce ne sont pas cinq décors, ce sont cinq méthodes de comptage : le pavé se '
                + 'multiplie, l\'escalier se compte par tranches, le pavé creusé se soustrait, '
                + 'et les colonnes quelconques se comptent une par une. Mélangés, ils obligent '
                + 'à CHOISIR la méthode — c\'est là que l\'exercice devient utile.',
            options: Object.entries(FAMILLES).map(([value, label]) => ({ value, label })),
            default: ['pave', 'couche', 'escalier', 'creux']
        },
        {
            id: 'question', type: 'select', label: 'Ce qu\'on demande', default: 'total',
            aide: 'Trois questions sur le même dessin, et trois compétences : le volume, la '
                + 'base, et la comparaison au pavé qui contient.',
            options: Object.values(QUESTIONS).map(q => ({ value: q.id, label: q.label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const t = TAILLES[p.taille] || TAILLES.moyen;
        // ON FILTRE D'ABORD, ON TESTE ENSUITE. Le repli se lisait
        // `(p.formes.length ? p.formes.filter(...) : null) || DEFAUT` : un
        // réglage ne contenant que des noms inconnus passait le premier test,
        // ressortait du filtre en tableau VIDE — et un tableau vide est vrai en
        // JavaScript, donc le repli ne se déclenchait jamais et la famille
        // valait `undefined`.
        const demandees = Array.isArray(p.formes) ? p.formes.filter(f => FAMILLES[f]) : [];
        const choisies = demandees.length ? demandees : ['pave', 'couche', 'escalier', 'creux'];
        const q = QUESTIONS[p.question] || QUESTIONS.total;

        // ON PARCOURT LES FORMES PLUTÔT QUE DE LES TIRER : sur une fiche de
        // douze dessins, un tirage donne trois fois le même empilement et en
        // oublie un autre — et c'est justement la variété des méthodes qu'on
        // veut faire travailler.
        const i = Number(ctx.index) || 0;
        const famille = choisies[i % choisies.length];

        let h = construire(famille, { ...t, rng });
        let m = mesures(h);
        // UNE QUESTION DOIT AVOIR UNE RÉPONSE QUI VAUT LA PEINE. « Combien en
        // ajouter » sur un pavé plein vaut zéro : la figure est juste, la
        // question est vide. On retire au hasard jusqu'à ce qu'il manque
        // quelque chose.
        if (q.id === 'ajouter' && m.aAjouter === 0) {
            h = construire('creux', { ...t, rng });
            m = mesures(h);
        }

        const bon = q.valeur(m);
        // VU DE L'AUTRE COIN, UNE FOIS SUR TROIS. Rémy : « parfois en
        // perspective ». Le dessin était toujours pris du même angle, et l'on
        // finit par lire l'IMAGE au lieu de lire le volume — les mêmes
        // escaliers, toujours montant vers la droite. Le miroir donne la vue
        // depuis l'autre côté : c'est le même empilement, il ne se compte pas
        // autrement, mais il faut de nouveau le regarder. Le tirage vient de
        // l'index, pas du hasard : sur une fiche de neuf dessins, le hasard en
        // donne parfois neuf pareils.
        const miroir = i % 3 === 2;
        const dessin = cubesSvg(h, { miroir });
        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.cubes',
            skillId: 'geo.espace.cubes',
            answerKind: 'numeric',
            prompt: {
                text: q.enonce,
                papier: q.enonce,
                html: `<div class="game-question">${q.enonce}</div>${encadrer(dessin)}`
            },
            answer: bon,
            unite: 'cubes',
            choices: leurres(rng, q, m, bon),
            hints: indices(q, m, famille),
            // L'INDICE MONTRE, IL NE DIT PAS SEULEMENT. Rémy : « couleurs par
            // étage (via l'indice), bouton couche par couche ». Le premier
            // indice colore les étages — c'est la MÉTHODE, pas la réponse ; le
            // second déplie l'empilement couche par couche, du sol au sommet,
            // ce qui est exactement le geste qu'on veut faire faire.
            schemas: [
                cubesSvg(h, { miroir, etages: true, classe: 'cu-svg--indice' }),
                couchesSvg(h, miroir)
            ],
            explanation: expliquer(q, m, famille),
            difficulty: { petit: 1, moyen: 2, grand: 3 }[p.taille] || 2,
            meta: {
                hauteurs: h, famille, question: q.id,
                total: m.total, sol: m.sol, caches: m.caches, aAjouter: m.aAjouter,
                boite: m.boite, reponse: bon, theme: `${famille}-${q.id}`
            }
        });
    }
};

/**
 * LES LEURRES SONT LES FAUTES DU CHAPITRE, pas des nombres voisins.
 *
 * Compter seulement ce qu'on voit, oublier la couche du dessous, confondre le
 * total avec la base : chacune de ces erreurs a un nombre, et le proposer
 * permet à l'élève de reconnaître la sienne au lieu d'en changer au hasard.
 */
function leurres(rng, q, m, bon) {
    const dehors = [
        { v: m.total - m.caches, why: 'C\'est le nombre de cubes qu\'on VOIT. Ceux qui sont derrière et dessous comptent aussi.' },
        { v: m.sol, why: 'C\'est le nombre de cubes posés par terre — la base, pas le volume.' },
        { v: m.boite.cubes, why: 'C\'est le pavé PLEIN qui contiendrait l\'empilement, pas l\'empilement lui-même.' },
        { v: m.aAjouter, why: 'C\'est ce qu\'il MANQUE pour remplir le pavé, pas ce qu\'il y a.' },
        { v: m.total, why: 'C\'est le nombre total de cubes, mais la question n\'est pas celle-là.' }
    ];
    const utiles = dehors
        .filter(c => c.v !== bon && c.v > 0)
        .map(c => ({ value: String(c.v), label: `${c.v}`, why: c.why }));
    // De quoi compléter si l'empilement est trop régulier pour distinguer les
    // fautes : un voisin immédiat, l'erreur de comptage la plus banale.
    const voisins = [bon - 1, bon + 1, bon + m.boite.hauteur]
        .filter(v => v > 0 && v !== bon)
        .map(v => ({ value: String(v), label: `${v}`, why: 'Recompte : il en manque ou il y en a un de trop.' }));
    return finalizeChoices(rng, [
        { value: String(bon), label: `${bon}`, correct: true },
        ...utiles, ...voisins
    ], { count: 4 });
}

/**
 * L'EMPILEMENT DÉPLIÉ, ÉTAGE PAR ÉTAGE.
 *
 * Le premier dessin ne montre que le rez-de-chaussée, le deuxième y ajoute le
 * premier étage, et ainsi de suite jusqu'à l'empilement entier. C'est le
 * « couche par couche » demandé, et sous cette forme il vaut mieux qu'un
 * bouton : les étages sont côte à côte, donc on les COMPARE — on voit ce que
 * chacun ajoute, et le total est la somme de ce qu'on a sous les yeux.
 */
function couchesSvg(h, miroir) {
    const haut = Math.max(...h.flat());
    const vues = [];
    for (let n = 1; n <= haut; n++) {
        const cubes = h.flat().filter(v => v >= n).length;
        vues.push(`<figure class="cu-couche">
            ${cubesSvg(h, { miroir, etages: true, jusqua: n, classe: 'cu-svg--indice' })}
            <figcaption>${n === 1 ? 'le sol' : `+ étage ${n - 1}`} · ${cubes} cube${cubes > 1 ? 's' : ''}</figcaption>
        </figure>`);
    }
    return `<div class="cu-couches">${vues.join('')}</div>`;
}

function indices(q, m, famille) {
    const base = [
        'Compte ÉTAGE par étage : chaque couleur est un étage, et il suffit d\'ajouter '
            + 'ce que chacun porte.'
    ];
    if (q.id === 'total') {
        base.push(famille === 'pave'
            ? `C'est un pavé plein : ${m.boite.largeur} × ${m.boite.profondeur} × ${m.boite.hauteur}.`
            : `N'oublie pas les cubes cachés : il y en a ${m.caches} qu'on ne voit pas du tout.`);
    }
    if (q.id === 'sol') {
        base.push('Une pile, si haute soit-elle, ne pose qu\'UN cube par terre. Compte les cases '
            + 'occupées du sol.');
    }
    if (q.id === 'ajouter') {
        base.push(`Le pavé qui contient tout fait ${m.boite.largeur} × ${m.boite.profondeur} × `
            + `${m.boite.hauteur} = ${m.boite.cubes} cubes. Il y en a ${m.total}.`);
    }
    return base;
}

function expliquer(q, m, famille) {
    const b = m.boite;
    if (q.id === 'total') {
        return famille === 'pave'
            ? `C'est un pavé plein : ${b.largeur} × ${b.profondeur} × ${b.hauteur} = ${m.total} cubes.`
            : `En additionnant les hauteurs des colonnes, on trouve ${m.total} cubes — dont `
                + `${m.caches} qu'on ne voit pas du tout.`;
    }
    if (q.id === 'sol') {
        return `${m.sol} colonnes reposent sur le sol, donc ${m.sol} cubes le touchent. `
            + `L'empilement en compte ${m.total} en tout : le sol ne dit pas le volume.`;
    }
    return `Le pavé plein ferait ${b.largeur} × ${b.profondeur} × ${b.hauteur} = ${b.cubes} cubes. `
        + `Il y en a ${m.total}, donc il en manque ${b.cubes} − ${m.total} = ${m.aAjouter}.`;
}
