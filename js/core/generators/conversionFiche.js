// LE TABLEAU DE CONVERSION, SUR LE PAPIER.
//
// Rémy : « ce serait bien pdf, un tableau à compléter avec quelques lignes et
// des conversions à effectuer ».
//
// C'est exactement la feuille de conversion des cahiers : UN tableau, ses
// colonnes d'unités en tête, et autant de lignes que de conversions à faire.
// L'élève écrit le nombre de départ dans les bonnes colonnes, pose la virgule,
// comble les zéros, et lit la réponse.
//
// LES EN-TÊTES SONT-ILS DONNÉS ? C'est le réglage qui change tout. Donnés, on
// travaille la conversion ; à remplir, on travaille l'ordre des unités — deux
// exercices différents, et le second est celui où l'on se trompe (hecto avant
// déca).
//
// Rien n'est calculé ici : les conversions viennent de core/conversion.js, le
// même modèle que l'écran.

import { makeItem } from '../items.js';
import {
    familleDe, tirerConversion, NOMS_FAMILLES, chiffresDansLeTableau
} from '../conversion.js';

const NOMBRE_FR = (v) => String(v).replace('.', ',');

export const conversionFicheGenerator = {
    id: 'mes.conversion-fiche',
    label: 'Tableau de conversion (fiche)',
    answerKinds: ['numeric'],
    // La compétence s'appelle `num.conversion` — c'est bien le tableau de
    // numération qu'on remplit, pas une compétence de mesure à part.
    skills: ['num.conversion'],
    params: [
        {
            id: 'famille', type: 'select', label: 'Grandeur', default: 'longueur',
            options: [
                { value: 'longueur', label: 'Longueurs (km … mm)' },
                { value: 'masse', label: 'Masses (kg … mg)' },
                { value: 'capacite', label: 'Contenances (hL … mL)' }
            ]
        },
        {
            id: 'lignes', type: 'select', label: 'Conversions par tableau', default: 8,
            options: [
                { value: 3, label: '3 lignes' },
                { value: 4, label: '4 lignes' },
                { value: 5, label: '5 lignes' },
                { value: 6, label: '6 lignes' },
                { value: 8, label: '8 lignes' },
                { value: 10, label: '10 lignes' }
            ]
        },
        // AVEC OU SANS LE TABLEAU. Le tableau est un ÉCHAFAUDAGE : il sert le
        // temps qu'on apprend où tombent les chiffres, puis il gêne. Une fiche
        // de fin de séquence demande la conversion toute seule, sur une ligne.
        {
            id: 'tableau', type: 'checkbox', label: 'Imprimer le tableau', default: true,
            aide: 'Décoché, il ne reste que les conversions à faire, alignées sur '
                + 'la feuille : c\'est l\'exercice une fois le tableau su.'
        },
        // « DONNER LES UNITÉS EN EN-TÊTE » N'EST PLUS UN CHOIX. Rémy : « enlève,
        // ça ne sert à rien. »
        //
        // Il a raison, et l'aide que j'avais écrite le disait sans le voir :
        // « décoché, c'est un AUTRE exercice ». Un tableau de conversion sans
        // ses unités n'est plus un tableau de conversion, c'est un exercice de
        // récitation de préfixes — qui a sa place, mais pas caché dans une case
        // à cocher d'un exercice qui n'annonce pas cela. Le tableau porte donc
        // toujours ses unités ; c'est ce que fait un tableau.
        //
        // Le champ reste, à `true`, pour les fiches déjà enregistrées.
        {
            id: 'entetes', type: 'checkbox', label: 'Donner les unités en en-tête',
            default: true, cache: true
        },
        {
            id: 'decimales', type: 'checkbox', label: 'Nombres à virgule', default: false
        },
        {
            id: 'ecart', type: 'select', label: 'Écart entre les unités', default: 3,
            aide: 'Un écart de 1 reste dans les rangs voisins ; à 6, on passe du '
                + 'kilomètre au millimètre.',
            options: [
                { value: 1, label: '1 rang' }, { value: 2, label: '2 rangs' },
                { value: 3, label: '3 rangs' }, { value: 6, label: 'Tout le tableau' }
            ]
        }
    ],

    // Les réglages d'abord, le contexte ensuite : signature du registre.
    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const famille = NOMS_FAMILLES.includes(params.famille) ? params.famille : 'longueur';
        const f = familleDe(famille);
        const nb = Math.max(3, Math.min(10, Number(params.lignes) || 8));

        // Des conversions TOUTES DIFFÉRENTES dans un même tableau : deux fois
        // « 505 mm = … m » sur la même feuille, c'est une ligne perdue.
        const vues = new Set();
        const conversions = [];
        for (let essai = 0; conversions.length < nb && essai < nb * 20; essai++) {
            const c = tirerConversion({
                rng, famille,
                ecart: Math.max(1, Math.min(6, Number(params.ecart) || 3)),
                decimales: !!params.decimales
            });
            const cle = `${c.valeur} ${c.depart}→${c.arrivee}`;
            if (vues.has(cle)) continue;
            vues.add(cle);
            // LE CORRIGÉ MONTRE LE TABLEAU REMPLI, pas seulement la réponse :
            // c'est le placement des chiffres qui est la leçon, et un corrigé
            // qui donne « 1 300 m » sans dire OÙ tombe le 1 n'explique rien.
            const index = (rang) => f.unites.findIndex(u => u.rang === rang);
            const brut = chiffresDansLeTableau(c.valeur, famille, c.depart)
                .map(x => ({ col: index(x.colonne), chiffre: x.chiffre }));
            // UN NOMBRE QUI NE TIENT PAS DANS LE TABLEAU N'EST PAS UNE
            // CONVERSION QU'ON FAIT AVEC LUI. « 76 km » déborde à gauche du
            // kilomètre : il n'y a pas de colonne pour le 7. On écartait le
            // chiffre en trop — et le corrigé montrait « 6 » tout seul dans la
            // colonne des km pour un nombre qui vaut 76. On refuse le tirage.
            if (brut.some(x => x.col < 0)) continue;
            const cases = brut;
            conversions.push({
                valeur: c.valeur, depart: c.depart, arrivee: c.arrivee,
                attendu: c.attendu,
                enonce: `${NOMBRE_FR(c.valeur)} ${c.depart} = ……………… ${c.arrivee}`,
                complet: `${NOMBRE_FR(c.valeur)} ${c.depart} = ${NOMBRE_FR(c.attendu)} ${c.arrivee}`,
                reponse: `${NOMBRE_FR(c.attendu)} ${c.arrivee}`,
                cases,
                // La virgule se pose juste APRÈS la colonne de l'unité
                // demandée : c'est toute la règle, et elle se voit.
                virguleApres: index(f.unites.find(u => u.symbole === c.arrivee).rang)
            });
        }

        return makeItem({
            seed: rng.seed,
            generatorId: 'mes.conversion-fiche',
            skillId: 'num.conversion',
            answerKind: 'numeric',
            prompt: {
                text: `Convertis avec le tableau : ${conversions.map(c => c.enonce).join(' ; ')}`,
                papier: conversions.map(c => c.enonce).join(' ; '),
                html: `<div class="game-question">Convertis avec le tableau des ${f.nom.toLowerCase()}.</div>`
            },
            answer: conversions[0] ? conversions[0].attendu : 0,
            explanation: conversions.map(c => `${NOMBRE_FR(c.valeur)} ${c.depart} = ${c.reponse}`).join(' · '),
            explicationPapier: conversions.map(c => `${NOMBRE_FR(c.valeur)} ${c.depart} = ${c.reponse}`).join(' · '),
            difficulty: 3,
            meta: {
                famille, nom: f.nom,
                unites: f.unites.map(u => u.symbole),
                conversions,
                entetes: params.entetes !== false,
                tableau: params.tableau !== false,
                // Ce que la fiche exclura pour le tableau suivant.
                theme: conversions.map(c => c.enonce).join('|')
            }
        });
    }
};
