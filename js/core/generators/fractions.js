// Générateurs fractions et décimaux.
//
// Ces notions n'existaient dans aucun jeu. Elles sont ajoutées ici sans
// toucher à une seule ligne des moteurs de jeu : c'est précisément ce que le
// contrat Item permet. Elles deviennent immédiatement jouables dans les bulles,
// le pavé numérique, les taupes, etc.

import { makeItem, finalizeChoices } from '../items.js';
import {
    tirerProduit, etapesProduit, corrigeProduit, reduire, memeValeur,
    tirerParEntier, etapesParEntier, corrigeParEntier
} from '../fractionsProduit.js';
import {
    tirerProduitPose, etapesPose, MARCHES_POSE, PYTHAGORE_MAX
} from '../produitPose.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import {
    NIVEAUX_SOMME, tirerDenominateurs, ppcm, estIrreductible
} from '../fractionsEquivalentes.js';

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function fracHtml(n, d) {
    return `<span class="fraction"><span class="fraction-num">${n}</span><span class="fraction-den">${d}</span></span>`;
}

// --- Comparer deux fractions ------------------------------------------------

export const fracCompareGenerator = {
    id: 'frac.compare',
    label: 'Comparer deux fractions',
    skills: ['num.frac.compare'],
    answerKinds: ['choice'],
    ecrit: true,
    // Sur le papier, une fraction s'écrit EN COLONNE — numérateur sur
    // dénominateur, séparés d'un trait. La barre oblique est une commodité
    // d'écran ; ce n'est pas ce qu'on demande d'écrire à l'élève.
    fractions: true,
    params: [
        { id: 'memeDenominateur', type: 'select', label: 'Dénominateurs', options: ['identiques', 'differents', 'libre'], default: 'libre' },
        { id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 12, min: 3, max: 20 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const maxDen = params.maxDen || 12;
        const mode = params.memeDenominateur || 'libre';
        const wantSame = mode === 'identiques' || (mode === 'libre' && rng.bool(0.5));

        let n1, d1, n2, d2;
        if (wantSame) {
            d1 = d2 = rng.int(3, maxDen);
            n1 = rng.int(1, d1 - 1);
            do { n2 = rng.int(1, d1 - 1); } while (n2 === n1);
        } else {
            d1 = rng.int(2, maxDen);
            // Tirer d2 indépendamment pouvait redonner d1 : on annonçait alors
            // « mets au même dénominateur 121 » sur 10/11 et 6/11, où comparer
            // les numérateurs est justement la bonne méthode. On garantit donc
            // des dénominateurs réellement différents.
            do { d2 = rng.int(2, maxDen); } while (d2 === d1 && maxDen > 2);
            n1 = rng.int(1, d1);
            n2 = rng.int(1, d2);
            // On évite l'égalité, qui rendrait la question ambiguë.
            if (n1 * d2 === n2 * d1) n2 = Math.max(1, n2 - 1);
        }

        // La suite s'appuie sur la situation RÉELLE, pas sur l'intention de
        // tirage : c'est elle qui détermine la méthode à enseigner.
        const same = d1 === d2;
        const v1 = n1 / d1, v2 = n2 / d2;
        const answer = v1 > v2 ? '>' : (v1 < v2 ? '<' : '=');

        // Le distracteur central : comparer les numérateurs en ignorant les
        // dénominateurs. C'est LA erreur classique sur les fractions.
        const naive = n1 > n2 ? '>' : (n1 < n2 ? '<' : '=');
        const choices = ['<', '=', '>'].map(sign => ({
            value: sign,
            label: sign,
            correct: sign === answer,
            why: sign !== answer && sign === naive && !same
                ? 'Tu as comparé seulement les numérateurs. Avec des dénominateurs différents, il faut les mettre au même dénominateur.'
                : undefined
        }));

        const common = same ? d1 : d1 * d2;
        return makeItem({
            seed: rng.seed, generatorId: 'frac.compare', skillId: 'num.frac.compare',
            answerKind: 'choice',
            prompt: {
                text: `${n1}/${d1} … ${n2}/${d2}`,
                // Une ligne d'égalité à compléter, avec un emplacement vide
                // explicite : l'élève voit ce qu'on lui demande de produire.
                html: `<div class="compare-line">
                        ${fracHtml(n1, d1)}
                        <span class="compare-slot" aria-label="signe à choisir"></span>
                        ${fracHtml(n2, d2)}
                       </div>`
            },
            answer,
            choices,
            hints: same
                ? ['Même dénominateur : compare simplement les numérateurs.']
                : [
                    'Les dénominateurs sont différents : on ne peut pas comparer directement.',
                    `Mets au même dénominateur ${common} : ${n1}/${d1} = ${n1 * (common / d1)}/${common} et ${n2}/${d2} = ${n2 * (common / d2)}/${common}.`
                ],
            explanation: same
                ? `Même dénominateur ${d1} : ${n1} ${answer} ${n2}, donc ${n1}/${d1} ${answer} ${n2}/${d2}.`
                : `Au dénominateur commun ${common} : ${n1 * (common / d1)}/${common} ${answer} ${n2 * (common / d2)}/${common}.`,
            difficulty: same ? 2 : 4,
            meta: { n1, d1, n2, d2, same }
        });
    }
};

// --- Multiplier deux fractions ----------------------------------------------
//
// Rémy : « on fait les multiplications de fractions avec et sans
// décomposition ».
//
// LA RÈGLE EST LA PLUS FACILE DU CHAPITRE, ET C'EST LE PIÈGE. Pour additionner
// il faut un dénominateur commun ; pour multiplier, on multiplie les
// numérateurs entre eux et les dénominateurs entre eux, et c'est tout. Ce que
// l'élève ne sait pas faire, c'est s'ARRÊTER avant de calculer — et c'est
// exactement ce que le réglage sépare. Le détail du raisonnement, avec les
// deux chemins, vit dans core/fractionsProduit.js.
//
// LES QUATRE PROPOSITIONS SONT QUATRE CONFUSIONS, pas quatre nombres.
// Additionner au lieu de multiplier, multiplier en croix (ce qui est la
// DIVISION), retourner le résultat : ce sont les trois façons dont un chapitre
// où l'on vient d'apprendre trois opérations sur les fractions se mélange.
//
// ET AUCUNE PROPOSITION NE VAUT LA BONNE RÉPONSE. C'est plus délicat ici
// qu'ailleurs : 24/36 et 2/3 sont deux ÉCRITURES du même nombre, et l'élève
// qui choisit la première a raison. On compare donc des valeurs, jamais des
// chaînes — d'où `memeValeur` dans le noyau.

/**
 * UNE FRACTION PAR UN ENTIER — l'item du cas de sixième.
 *
 * LES TROIS LEURRES SONT LES TROIS ERREURS DU CHAPITRE, et aucune n'est tirée
 * au hasard :
 *
 *   · (a × k)/(b × k) — on a multiplié LES DEUX ÉTAGES. C'est l'erreur, celle
 *     que l'exercice existe pour montrer ; et elle est sournoise, puisque le
 *     résultat VAUT la fraction de départ.
 *   · (a + k)/b — on a ajouté au lieu de multiplier.
 *   · a/(b × k) — on a multiplié le dénominateur au lieu du numérateur.
 */
function itemParEntier(rng, params) {
    const p = tirerParEntier(rng, {
        maxDen: Number(params.maxDen) || 9,
        maxEntier: Number(params.maxNum) || 9
    });
    const ecrire = (f) => `${f.n}/${f.d}`;
    const bonne = p.reponse;
    const pieges = [
        {
            f: { n: p.a * p.k, d: p.b * p.k },
            why: `En multipliant AUSSI le dénominateur, on retombe sur ${p.a}/${p.b} : `
                + 'la multiplication n\'aurait servi à rien. Le nombre de parts change, '
                + 'leur TAILLE non.'
        },
        {
            f: { n: p.a + p.k, d: p.b },
            why: 'C\'est une addition. On multiplie le numérateur, on ne lui ajoute rien.'
        },
        {
            f: { n: p.a, d: p.b * p.k },
            why: 'Le dénominateur dit la TAILLE des parts : le multiplier les rend plus '
                + 'petites, alors qu\'on en voulait davantage.'
        }
    ];

    const vues = [reduire(bonne.n, bonne.d)];
    const gardes = [];
    for (const pi of pieges) {
        if (pi.f.n < 1 || pi.f.d < 2) continue;
        // PAS D'ENTIER DÉGUISÉ DANS LA LISTE. « 9 × 1/5 » proposait « 10/5 »,
        // c'est-à-dire 2 : un entier au milieu de fractions se repère du
        // premier coup d'œil, sans rien calculer. C'est la même règle que
        // pour le produit de deux fractions, où elle n'était écrite que pour
        // le dénominateur 1 — « 6/1 » — et laissait passer « 4/2 ».
        if (pi.f.n % pi.f.d === 0) continue;
        const r = reduire(pi.f.n, pi.f.d);
        // LE PREMIER LEURRE VAUT LA FRACTION DE DÉPART, PAS LA RÉPONSE : il est
        // donc gardé. Mais on vérifie quand même, parce qu'une proposition qui
        // vaut la bonne ferait compter faux un élève qui a raison.
        if (vues.some(v => memeValeur(v, r))) continue;
        vues.push(r);
        gardes.push(pi);
    }

    let ecart = 0;
    const choices = finalizeChoices(rng, [
        { value: ecrire(bonne), label: fracHtml(bonne.n, bonne.d), correct: true },
        ...gardes.map(pi => ({ value: ecrire(pi.f), label: fracHtml(pi.f.n, pi.f.d), why: pi.why }))
    ], {
        count: 4,
        filler: () => {
            for (let i = 0; i < 40; i++) {
                ecart += 1;
                const f = { n: bonne.n + ecart, d: bonne.d };
                // PAS D'ENTIER DÉGUISÉ : la même règle que pour les leurres,
                // qui l'avait seule — le bouche-trou monte le numérateur d'un
                // en un et tombe donc tôt ou tard sur un multiple du
                // dénominateur. Un entier au milieu de fractions se repère
                // sans rien calculer.
                if (f.n % f.d === 0) continue;
                const r = reduire(f.n, f.d);
                if (!vues.some(v => memeValeur(v, r))) { vues.push(r); return ecrire(f); }
            }
            return ecrire({ n: bonne.n + 100, d: bonne.d });
        }
    }).map(c => (/^\d+\/\d+$/.test(String(c.label))
        ? { ...c, label: fracHtml(...String(c.value).split('/')) } : c));

    // L'ENTIER S'ÉCRIT NU, jamais « 3/1 ». C'est ainsi qu'il est écrit au
    // tableau et dans l'énoncé, et l'écrire sur 1 donnerait la méthode avant
    // qu'on l'ait cherchée.
    const entier = `<span class="nb-highlight">${p.k}</span>`;
    const frac = fracHtml(p.a, p.b);
    const texte = p.entierDevant ? `${p.k} × ${p.a}/${p.b} = ?` : `${p.a}/${p.b} × ${p.k} = ?`;

    return makeItem({
        seed: rng.seed, generatorId: 'frac.produit', skillId: 'num.frac.multiplication',
        answerKind: 'choice',
        prompt: {
            text: texte,
            html: `<div class="compare-line">
                    ${p.entierDevant ? `${entier} <span class="compare-op">×</span> ${frac}`
        : `${frac} <span class="compare-op">×</span> ${entier}`}
                    <span class="compare-op">=</span> <span class="compare-slot"></span>
                   </div>`,
            papier: texte.replace(' = ?', ' ='),
        },
        answer: ecrire(bonne),
        choices,
        hints: etapesParEntier(p),
        explanation: corrigeParEntier(p),
        difficulty: 2,
        meta: { a: p.a, b: p.b, k: p.k, parEntier: true, decimal: false }
    });
}

export const fracProduitGenerator = {
    id: 'frac.produit',
    label: 'Multiplier deux fractions',
    skills: ['num.frac.multiplication'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    fractions: true,
    params: [
        {
            id: 'facteurs', type: 'select', label: 'Ce qu\'on multiplie', default: 'deux-fractions',
            aide: 'Multiplier par un ENTIER est le cas de sixième : 3 × 2/5, c\'est '
                + '2/5 + 2/5 + 2/5. Le nombre de parts est multiplié, leur taille non — donc '
                + 'le dénominateur ne bouge pas.',
            options: [
                { value: 'deux-fractions', label: 'Deux fractions' },
                { value: 'par-un-entier', label: 'Une fraction par un entier (6ᵉ)' },
                { value: 'les-deux', label: 'Les deux mélangés' }
            ]
        },
        {
            id: 'decomposition', type: 'select', label: 'Décomposer avant de calculer',
            default: 'sans',
            aide: 'Sans décomposition, on multiplie en haut, on multiplie en bas, c\'est fini. '
                + 'Avec, un facteur du haut se retrouve en bas et il faut le barrer avant de '
                + 'calculer.',
            options: [
                { value: 'sans', label: 'Sans — rien ne se simplifie' },
                { value: 'avec', label: 'Avec — il faut barrer en diagonale' },
                { value: 'les-deux', label: 'Les deux mélangés' }
            ]
        },
        {
            id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 9, min: 2, max: 12
        },
        {
            id: 'maxNum', type: 'number', label: 'Numérateur maximum', default: 10, min: 1, max: 12,
            aide: 'Les fractions peuvent dépasser 1 : 9/4 × 5/9 est un produit comme un '
                + 'autre, et s\'interdire les fractions impropres ferait croire qu\'une '
                + 'fraction est toujours un morceau de gâteau.'
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        // LE CAS DE SIXIÈME A SON PROPRE CHEMIN, et ce n'est pas de la
        // duplication : multiplier par un entier ne se corrige pas avec les
        // mêmes mots, et surtout pas avec les mêmes LEURRES. « Multiplier en
        // croix » n'a aucun sens face à un entier, tandis que « multiplier
        // aussi le dénominateur » est L'erreur du chapitre et n'existe pas
        // entre deux fractions. Des propositions qui ne sont les erreurs de
        // personne transforment la question en tirage au sort.
        const quoi = params.facteurs === 'les-deux'
            ? (rng.bool() ? 'par-un-entier' : 'deux-fractions')
            : (params.facteurs || 'deux-fractions');
        if (quoi === 'par-un-entier') return itemParEntier(rng, params);

        const p = tirerProduit(rng, {
            decomposition: params.decomposition || 'sans',
            maxDen: Number(params.maxDen) || 9,
            maxNum: Number(params.maxNum) || 10
        });

        const ecrire = (f) => `${f.n}/${f.d}`;
        const bonne = p.reponse;

        // LES TROIS CONFUSIONS DU CHAPITRE. On les garde sous la forme où
        // l'élève les AURAIT ÉCRITES — non simplifiée —, parce que c'est celle
        // qu'il cherchera des yeux dans la liste.
        const pieges = [
            {
                f: { n: p.a + p.c, d: p.b + p.d },
                why: 'On n’additionne ni les numérateurs ni les dénominateurs. Cette règle-là '
                    + 'n’existe pour aucune opération sur les fractions.'
            },
            {
                f: { n: p.a * p.d, d: p.b * p.c },
                why: `Multiplier en croix, c’est DIVISER par la seconde fraction : `
                    + `${p.a}/${p.b} ÷ ${p.c}/${p.d}. Pour multiplier, on reste tout droit — `
                    + 'numérateurs avec numérateurs, dénominateurs avec dénominateurs.'
            },
            {
                f: { n: bonne.d, d: bonne.n },
                why: 'Le calcul est bon, mais le résultat est à l’envers : le haut est resté '
                    + 'en bas.'
            }
        ];

        // AUCUNE PROPOSITION NE DOIT VALOIR LA BONNE, ni une autre : deux
        // écritures du même nombre, et l'élève qui prend la « mauvaise » a
        // raison. On compare donc les valeurs réduites.
        const vues = [reduire(bonne.n, bonne.d)];
        const gardes = [];
        for (const pi of pieges) {
            if (pi.f.n < 1 || pi.f.d < 1) continue;
            // PAS DE « 6/1 » DANS LA LISTE. L'inverse d'un résultat inférieur à
            // 1 est un entier, et un entier écrit sur 1 ne s'écrit pas : dans
            // une liste de fractions, il se repère du premier coup d'œil sans
            // qu'on ait rien calculé.
            if (pi.f.d === 1) continue;
            // ET PAS DAVANTAGE « 4/2 », qui est le même défaut écrit autrement.
            if (pi.f.n % pi.f.d === 0) continue;
            const r = reduire(pi.f.n, pi.f.d);
            if (vues.some(v => memeValeur(v, r))) continue;
            vues.push(r);
            gardes.push(pi);
        }

        // LA VALEUR JUGE, L'ÉTIQUETTE SE LIT. Voir `casesFraction` plus bas :
        // « 20|49 » est ce que le pavé enverra, la fraction dessinée est ce
        // que l'élève lit sur le bouton.
        const ecrireCases = (f) => casesFraction(f.n, f.d);
        let ecart = 0;
        const choices = finalizeChoices(rng, [
            { value: ecrireCases(bonne), label: fracHtml(bonne.n, bonne.d), correct: true },
            ...gardes.map(pi => ({
                value: ecrireCases(pi.f), label: fracHtml(pi.f.n, pi.f.d), why: pi.why
            }))
        ], {
            count: 4,
            // Le remplissage doit sortir des FRACTIONS, pas des nombres — et
            // aucune qui vaille l'une des précédentes.
            filler: () => {
                for (let i = 0; i < 40; i++) {
                    ecart += 1;
                    const f = { n: bonne.n + ecart, d: bonne.d };
                    // PAS D'ENTIER DÉGUISÉ, ICI NON PLUS. La règle était écrite
                    // pour les leurres — « pas de 6/1 dans la liste » — et pas
                    // pour le bouche-trou, qui monte le numérateur d'un en un
                    // et tombe donc tôt ou tard sur un multiple du
                    // dénominateur. « 3 × 1/2 » proposait « 4/2 », c'est-à-dire
                    // 2, qui se repère sans rien calculer.
                    if (f.n % f.d === 0) continue;
                    const r = reduire(f.n, f.d);
                    if (!vues.some(v => memeValeur(v, r))) {
                        vues.push(r);
                        return { value: ecrireCases(f), label: fracHtml(f.n, f.d) };
                    }
                }
                const loin = { n: bonne.n + 100, d: bonne.d };
                return { value: ecrireCases(loin), label: fracHtml(loin.n, loin.d) };
            }
        });

        return makeItem({
            seed: rng.seed, generatorId: 'frac.produit', skillId: 'num.frac.multiplication',
            answerKind: 'choice',
            prompt: {
                text: `${p.a}/${p.b} × ${p.c}/${p.d} = ?`,
                html: `<div class="compare-line">
                        ${fracHtml(p.a, p.b)} <span class="compare-op">×</span> ${fracHtml(p.c, p.d)}
                        <span class="compare-op">=</span> ${fenteAvecTrous()}
                       </div>`,
                // Sur le papier, la feuille empile les `a/b` toute seule.
                papier: `${p.a}/${p.b} × ${p.c}/${p.d} =`
            },
            answer: ecrireCases(bonne),
            // Pas de tuyau sur le corrigé — voir `frac.add` plus bas.
            reponsePapier: String(ecrireCases(bonne)).replace('|', '/'),
            choices,
            hints: etapesProduit(p),
            explanation: corrigeProduit(p),
            // Barrer en diagonale demande de VOIR un facteur qui n'est pas
            // écrit ; multiplier tout droit ne demande que les tables.
            difficulty: p.croise ? 4 : 2,
            meta: {
                a: p.a, b: p.b, c: p.c, d: p.d,
                croise: p.croise, g1: p.g1, g2: p.g2,
                produit: p.produit, reponse: p.reponse,
                theme: p.croise ? 'avec-decomposition' : 'sans-decomposition'
            }
        });
    }
};

// --- L'atelier : poser le produit et le simplifier ---------------------------
//
// Rémy, après le QCM : « je trouve que multiplier des fractions en barrant en
// diagonale n'est pas clair, il faut pouvoir décomposer les nombres, mais un
// QCM ce n'est pas terrible. »
//
// LE QCM DEMANDAIT LE RÉSULTAT, ET C'ÉTAIT LE DÉFAUT. On pouvait le trouver en
// multipliant tout puis en simplifiant à la fin — c'est-à-dire par la méthode
// qu'on voulait justement faire abandonner. Ici on ne demande pas un nombre :
// on donne deux gestes, décomposer et barrer, et il n'y a pas d'autre chemin.
//
// Le générateur ne fait donc presque rien : il pose les quatre nombres et
// laisse l'activité `produit-pose` mener le calcul. Tout ce qui compte est
// dans le tirage — voir core/produitPose.js, et son garde-fou : la marche ne
// doit pas mentir sur le nombre de décompositions qu'elle demande.

const LISTE_POSE = MARCHES_POSE.map((m, i) => ({ id: m.id, nom: `${i + 1}. ${m.titre}`, groupe: null }));
const PAR_MARCHE_POSE = 3;

export const fracProduitPoseGenerator = {
    id: 'frac.produit-pose',
    label: 'Poser un produit de fractions',
    skills: ['num.frac.multiplication'],
    // ON N'ÉCRIT PAS UN NOMBRE, ON ÉCRIT UNE FRACTION : deux cases, un trait
    // entre les deux. C'est le genre `text`, comme l'addition posée.
    answerKinds: ['text'],
    ecrit: true,
    fractions: true,
    conseil: (p) => conseilProgression(
        marchesCochees(p, LISTE_POSE).length, PAR_MARCHE_POSE),
    params: [
        paramMarches({ marches: LISTE_POSE, mot: 'marche' }),
        {
            id: 'maxFacteur', type: 'number', label: 'Plus grand facteur',
            default: PYTHAGORE_MAX, min: 2, max: 12,
            aide: 'Rémy : « va jusque 11 dans un premier temps ». C\'est la table de '
                + 'Pythagore du cahier — au-delà, le facteur cherché n\'y est plus, et '
                + 'l\'aide cesse d\'aider.'
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const marche = marcheAuRang(
            ctx.index ?? 0, marchesCochees(params, LISTE_POSE),
            totalDe(ctx, params), params, PAR_MARCHE_POSE);
        const p = tirerProduitPose(rng, {
            marche,
            maxFacteur: Number(params.maxFacteur) || PYTHAGORE_MAX
        });

        return makeItem({
            seed: rng.seed,
            generatorId: 'frac.produit-pose',
            skillId: 'num.frac.multiplication',
            answerKind: 'text',
            prompt: {
                text: `${p.a}/${p.b} × ${p.c}/${p.d} = ?`,
                // RÉMY : « ecris toujours les fractions en colonne ».
                //
                // Cet énoncé n'avait AUCUN `html` : l'écran retombait donc sur
                // `text`, et affichait « 2/3 × 6/5 = ? » à la barre oblique.
                // Sur la feuille imprimée la même question s'empile toute
                // seule — le rendu sait le faire —, si bien que l'exercice
                // enseignait deux écritures selon le support, et la mauvaise à
                // l'écran, qui est le support le plus vu.
                //
                // MESURÉ sur les 238 exercices du catalogue, marche par
                // marche : il n'en restait que deux dans ce cas.
                html: `<div class="compare-line">`
                    + `${fracHtml(p.a, p.b)} <span class="compare-op">×</span> `
                    + `${fracHtml(p.c, p.d)} <span class="compare-op">=</span> ?</div>`,
                consigne: 'Décompose et barre, puis écris le résultat.',
                // Sur le papier il n'y a ni bouton ni table : on écrit le
                // calcul à la main, ce qui est exactement le même travail.
                papier: `${p.a}/${p.b} × ${p.c}/${p.d} =`
            },
            answer: `${p.reponse.n}/${p.reponse.d}`,
            hints: etapesPose(p),
            explanation: `${p.a}/${p.b} × ${p.c}/${p.d} : tout ce qui est en haut se `
                + `multiplie, tout ce qui est en bas aussi. En barrant les facteurs communs `
                + `avant de calculer, il reste ${p.reponse.n}/${p.reponse.d}. Sans les barrer, `
                + `on obtiendrait ${p.brut.n}/${p.brut.d} — le même nombre, mais il faudrait `
                + `encore chercher par combien le simplifier.`,
            difficulty: 2 + Math.min(2, p.gestes),
            meta: {
                // L'ACTIVITÉ CONSTRUIT SON ÉTAT DE DÉPART À PARTIR D'ICI. Les
                // quatre nombres voyagent avec l'item, pas dans une variable
                // du jeu : c'est ce qui rend la question rejouable à
                // l'identique depuis sa graine.
                produit: { a: p.a, b: p.b, c: p.c, d: p.d },
                marche: p.marche, titre: p.titre, gestes: p.gestes,
                reponse: p.reponse, brut: p.brut
            }
        });
    }
};

// --- Additionner deux fractions de même dénominateur ------------------------

/**
 * LES DEUX CASES D'UNE FRACTION, DANS L'ÉNONCÉ.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « du coup, tu le mets pour tous (attention certains exercices ont
 * parfois besoin de la virgule) ? »
 *
 * PAS POUR TOUS — le recensement (`tools/clavierDuCatalogue.mjs`) dit que sur
 * les soixante-dix exercices qui n'atteignent jamais le pavé, l'immense
 * majorité ne DOIT pas se taper : une grille de sudoku se remplit case par
 * case, « pair ou impair » se choisit, un programme Scratch s'assemble. Les
 * seuls qui sont dans le cas de la droite graduée sont ceux dont la réponse
 * est une FRACTION : deux nombres, donc deux cases.
 *
 * ET LA VIRGULE NE VIENT PAS ICI, C'EST VOULU. `numeric.js` la fait paraître
 * quand un morceau de la réponse n'est pas entier ; un numérateur et un
 * dénominateur le sont toujours. Une virgule sous un dénominateur ouvrirait
 * une porte vers une réponse qui n'existe pas.
 */
const casesFraction = (n, d) => `${n}|${d}`;

/**
 * LES DEUX TROUS SE POSENT DANS LA FENTE DE LA LIGNE. `compare-slot` est
 * l'endroit où le QCM dépose la proposition choisie : en propositions, la
 * fente se remplit et les trous s'en vont avec ; au clavier, le pavé compte
 * les `[data-trou]` qu'il y trouve. Une seule place pour la réponse, quelle
 * que soit la façon d'y répondre.
 */
//
// ET ELLE EST « RICHE » DÈS LE DÉPART, PAS SEULEMENT UNE FOIS REMPLIE.
// `compare-slot--riche` — la fente qui prend la largeur de son contenu — n'était
// posée qu'au moment du dépôt (`choice.js`). Vide, la fente restait donc carrée
// à 1,78 em pendant que la fraction à deux trous en faisait 119 px : la barre de
// fraction DÉBORDAIT de 25 px et traversait la case de part en part. C'est le
// long trait qu'on voit sur la capture de Rémy, et il était là avant le
// pointillé dont il se plaignait.
const fenteAvecTrous = () => '<span class="compare-slot compare-slot--riche">'
    + '<span class="fraction">'
    + '<span class="fraction-num"><u class="np-trou" data-trou="0">&nbsp;?&nbsp;</u></span>'
    + '<span class="fraction-den"><u class="np-trou" data-trou="1">&nbsp;?&nbsp;</u></span>'
    + '</span></span>';

// --- Additionner, du même dénominateur jusqu'au PPCM ------------------------
//
// RÉMY : « il n'y a pas d'addition de fraction avec dénominateur multiple ou
// ppcm non ? »
//
// IL Y EN AVAIT — « Poser une Addition de Fractions » et ses quatre marches —
// MAIS PAS EN QCM, ET PAS SOUS LE TITRE OÙ IL L'A CHERCHÉE. Mesuré dans la
// fenêtre de choix : en tapant « addition de fractions », le PREMIER résultat
// est cet exercice-ci, qui ne faisait QUE le même dénominateur, pour toujours,
// sans réglage. Sa compétence s'appelait pourtant « add-meme-denom » et son
// étiquette « (même dénominateur) » : la restriction était écrite partout SAUF
// à l'endroit où le professeur la lit. Un titre générique posé sur l'exercice
// le plus étroit fait croire que le logiciel ne sait pas faire le reste.
//
// IL FAIT MAINTENANT LES QUATRE MARCHES — les mêmes que l'addition posée, même
// vocabulaire, même progression, pour que les deux exercices se suivent.
//
// ET CE N'EST PAS LE MÊME TRAVAIL QUE L'ÉCRIT POSÉ. Là on convertit ligne par
// ligne ; ici on RECONNAÎT parmi quatre propositions. Les leurres portent donc
// les erreurs du chapitre, et l'ORDRE dans lequel ils sont écrits EST le choix
// pédagogique : `finalizeChoices` ne garde que les trois premiers.
const LISTE_ADD = NIVEAUX_SOMME.map((n, i) => ({ id: n.id, nom: `${i + 1}. ${n.nom}` }));
const PAR_MARCHE_ADD = 3;

// LE DÉNOMINATEUR COMMUN DOIT TENIR DANS UNE BULLE. 7/9 + 1/10 demande des
// 90èmes : juste au tableau, illisible dans un rond, et hors de portée d'une
// réponse qu'on ne pose pas sur le papier. On refuse donc les tirages dont le
// commun dépasse quarante — il reste largement de quoi tirer, y compris à la
// marche du PPCM (4 et 6, 6 et 8, 8 et 10, 6 et 10, 9 et 6…).
const COMMUN_MAX = 40;

export const fracAddGenerator = {
    id: 'frac.add',
    label: 'Additionner des fractions (jusqu\'au PPCM)',
    // DEUX COMPÉTENCES, ET C'EST LE RÉGLAGE QUI DÉCIDE. Additionner des
    // huitièmes entre eux et trouver que 4 et 6 se rencontrent à 12 ne sont pas
    // le même savoir-faire : le carnet d'erreurs doit les séparer, sinon une
    // marche réussie masque l'autre.
    skills: ['num.frac.add-meme-denom', 'num.frac.denominateur-commun'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    fractions: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_ADD).length, PAR_MARCHE_ADD),
    params: [
        // LES QUATRE CASES SONT COCHÉES DANS LE PANNEAU, comme chez les treize
        // autres générateurs à progression : un exercice qui annonce une
        // progression l'offre en entier, sinon le réglage se découvre par
        // hasard. C'est le catalogue qui ramène `frac-add` au seul même
        // dénominateur (`params: { marches: ['meme'] }`), parce que c'est tout
        // ce qu'il savait faire jusqu'à aujourd'hui.
        paramMarches({ marches: LISTE_ADD, mot: 'marche' }),
        {
            id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 12, min: 3, max: 20,
            aide: 'Il ne vaut que pour les dénominateurs de départ. Dès qu\'ils diffèrent, on '
                + 'ne dépasse pas dix : l\'aide est la table de Pythagore, et elle s\'arrête là.'
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        // UNE SÉANCE ENREGISTRÉE AVANT CE JOUR RESTE AU MÊME DÉNOMINATEUR.
        //
        // Elle n'a pas de clef « marches » — le réglage n'existait pas —, et
        // `marchesCochees` rend alors TOUTES les marches. Une heure préparée
        // pour des additions de huitièmes se mettrait à poser des PPCM, dans le
        // dos du professeur et au milieu de son heure.
        //
        // C'est la question que `marchesCochees` traite avec son `ancien` chez
        // les autres : « que valait ce réglage avant les cases ? ». Ici la
        // réponse ne se déduit d'aucun ancien réglage — il n'y avait PAS de
        // progression —, elle se dit en clair : avant, cet exercice ne faisait
        // que le même dénominateur. Le `default` du schéma ne peut pas le dire :
        // il ne sert qu'à remplir le panneau, et le panneau doit montrer les
        // quatre marches.
        const avecDefaut = Array.isArray(params.marches) && params.marches.length
            ? params : { ...params, marches: ['meme'] };
        const marche = marcheAuRang(
            ctx.index ?? 0, marchesCochees(avecDefaut, LISTE_ADD),
            totalDe(ctx, avecDefaut), avecDefaut, PAR_MARCHE_ADD);
        const plafond = Math.max(3, Math.min(Number(params.maxDen) || 12, marche === 'meme' ? 20 : 10));

        // ON VÉRIFIE LA PROPRIÉTÉ AU LIEU DE L'ESPÉRER : `tirerDenominateurs`
        // garantit la marche, la boucle garantit que le commun reste lisible.
        let d1 = 4, d2 = 4;
        for (let essai = 0; essai < 80; essai++) {
            [d1, d2] = tirerDenominateurs(rng, marche, plafond);
            if (marche === 'meme' || ppcm(d1, d2) <= COMMUN_MAX) break;
        }
        const commun = ppcm(d1, d2);
        const k1 = commun / d1, k2 = commun / d2;

        // LES DEUX FRACTIONS DE DÉPART SONT IRRÉDUCTIBLES, et ce n'est pas une
        // affaire de goût. Posée « 3/6 + 4/10 », la question a DEUX réponses
        // justes : l'élève qui simplifie d'abord calcule 1/2 + 2/5 et trouve
        // 9/10, celui qui ne simplifie pas trouve 27/30 — la même valeur, pas la
        // même écriture, et 9/10 n'est pas sur les boutons. Le premier a eu tout
        // bon et le logiciel lui dirait qu'il a eu faux. Le mot exact est déjà
        // dans `core/fractionsEquivalentes.js`, pour l'écrit posé : « l'élève
        // simplifie d'abord, trouve un autre dénominateur commun que celui qu'on
        // attend, et IL A RAISON ».
        let n1 = 1, n2 = 1;
        for (let essai = 0; essai < 120; essai++) {
            n1 = rng.int(1, d1 - 1);
            n2 = rng.int(1, d2 - 1);
            if (estIrreductible(n1, d1) && estIrreductible(n2, d2)) break;
            // Repli : 1/d est irréductible quel que soit d.
            n1 = 1; n2 = 1;
        }
        const somme = n1 * k1 + n2 * k2;
        const meme = d1 === d2;

        // LA VALEUR JUGE, L'ÉTIQUETTE SE LIT : « 7|5 » part au pavé, et le
        // bouton montre la fraction dessinée. La bonne proposition doit porter
        // EXACTEMENT ce que le pavé enverra, sinon la cliquer serait compté faux.
        const label = (n, dd) => casesFraction(n, dd);
        const prop = (n, dd, why) => ({ value: label(n, dd), label: fracHtml(n, dd), why });

        // LES LEURRES, DU PLUS INSTRUCTIF AU PLUS ANODIN. Au dénominateur
        // commun, le premier est L'ERREUR DU CHAPITRE — additionner les
        // dénominateurs entre eux — et c'est elle qu'il faut nommer. Les doublons
        // se neutralisent tout seuls (`finalizeChoices` déduplique par valeur) :
        // à la marche « multiple », le commun EST le plus grand des deux, donc le
        // deuxième leurre et le troisième se confondent, et c'est le mieux
        // expliqué des deux qui reste.
        const leurres = meme ? [
            prop(somme, d1 * 2, 'On n\'additionne pas les dénominateurs : ils restent identiques.'),
            prop(n1 * n2, d1, 'Tu as multiplié les numérateurs au lieu de les additionner.'),
            prop(somme - 1, d1, 'Erreur de calcul sur les numérateurs.')
        ] : [
            prop(n1 + n2, d1 + d2,
                'On n\'additionne pas les dénominateurs entre eux : on ne peut additionner '
                + 'que des parts de MÊME taille.'),
            prop(n1 + n2, commun,
                `Le dénominateur commun est bon, mais les numérateurs se convertissent aussi : `
                + `le MÊME facteur en haut et en bas (×${k1} et ×${k2}).`),
            prop(n1 + n2, Math.max(d1, d2),
                'Prendre le plus grand des deux dénominateurs ne suffit pas : il faut encore '
                + 'convertir les deux fractions.'),
            prop(somme - 1, commun, 'La méthode est bonne, le calcul des numérateurs non.')
        ];

        let extra = 1;
        const choices = finalizeChoices(rng, [
            { value: label(somme, commun), label: fracHtml(somme, commun), correct: true },
            ...leurres
        ], {
            count: 4,
            // Les bouche-trous disent leur valeur ET leur étiquette : sans
            // cela, « 9|5 » s'afficherait tel quel sur un bouton.
            filler: () => {
                const n = somme + (++extra);
                return { value: label(n, commun), label: fracHtml(n, commun) };
            }
        });

        const g = gcd(somme, commun);
        const simplifie = g > 1 && somme % commun !== 0
            ? ` (soit ${somme / g}/${commun / g} simplifié)` : '';

        return makeItem({
            seed: rng.seed, generatorId: 'frac.add',
            skillId: meme ? 'num.frac.add-meme-denom' : 'num.frac.denominateur-commun',
            answerKind: 'choice',
            prompt: {
                text: `${n1}/${d1} + ${n2}/${d2} = ?`,
                html: `<div class="compare-line">
                        ${fracHtml(n1, d1)} <span class="compare-op">+</span> ${fracHtml(n2, d2)}
                        <span class="compare-op">=</span> ${fenteAvecTrous()}
                       </div>`
            },
            answer: label(somme, commun),
            // LE CORRIGÉ DU PROFESSEUR N'ÉCRIT PAS « 14|30 ».
            //
            // Le tuyau est la notation du PAVÉ : deux cases, un numérateur et un
            // dénominateur. À l'écran personne ne le voit — l'élève tape dans
            // deux cases, ou clique une fraction dessinée. Sur le papier,
            // `formaterReponse` prend la VALEUR de la bonne proposition dès que
            // son libellé contient du HTML (et une fraction en contient
            // toujours), et le tuyau partait tel quel sur la page des solutions.
            // Mesuré : cinq exercices écrits le faisaient, dont celui-ci.
            //
            // `reponsePapier` est le mécanisme prévu pour cela — « le générateur
            // écrit ce qu'il faut lire, quand ce n'est pas la même chose ».
            reponsePapier: `${somme}/${commun}`,
            choices,
            hints: meme ? [
                'Les dénominateurs sont identiques : on additionne seulement les numérateurs.',
                `${n1} + ${n2} = ${somme}, sur ${d1}.`
            ] : [
                `Cherche un nombre à la fois dans la table de ${d1} et dans celle de ${d2}.`,
                `Les parts n'ont pas la même taille : écris les deux fractions en ${commun}èmes.`,
                `${n1}/${d1} = ${n1 * k1}/${commun} et ${n2}/${d2} = ${n2 * k2}/${commun}.`
            ],
            explanation: meme
                ? `${n1}/${d1} + ${n2}/${d1} = ${somme}/${d1}${simplifie}. Le dénominateur ne change pas.`
                : `${n1}/${d1} + ${n2}/${d2} = ${n1 * k1}/${commun} + ${n2 * k2}/${commun} = `
                    + `${somme}/${commun}${simplifie}.`,
            difficulty: 2 + Math.max(0, LISTE_ADD.findIndex(m => m.id === marche)),
            meta: { n1, n2, d1, d2, commun, somme, marche }
        });
    }
};

// --- Comparer deux décimaux -------------------------------------------------

export const decCompareGenerator = {
    id: 'dec.compare',
    label: 'Comparer deux nombres décimaux',
    skills: ['num.dec.compare'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        { id: 'decimales', type: 'select', label: 'Nombre de décimales', options: [1, 2, 3], default: 2 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const nbDec = params.decimales || 2;
        const fmt = v => v.toFixed(nbDec).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');

        // Cas piégeux volontaire : même partie entière, nombre de décimales
        // différent (2,5 vs 2,45) — l'élève qui compare "45 > 5" se trompe.
        let a, b, sa, sb, piege, guard = 0;
        do {
            const entier = rng.int(0, 9);
            piege = rng.bool(0.5);
            a = entier + rng.int(1, 9) / 10;
            b = piege
                ? entier + rng.int(10, 99) / 100
                : entier + rng.int(1, 9) / 10 + (nbDec > 1 ? rng.int(0, 9) / 100 : 0);
            sa = fmt(a); sb = fmt(b);
        } while (sa === sb && guard++ < 20);

        const answer = a > b ? '>' : '<';
        const naiveA = sa.split(',')[1] || '';
        const naiveB = sb.split(',')[1] || '';
        const naive = Number(naiveA) > Number(naiveB) ? '>' : '<';

        return makeItem({
            seed: rng.seed, generatorId: 'dec.compare', skillId: 'num.dec.compare',
            answerKind: 'choice',
            prompt: {
                text: `${sa} … ${sb}`,
                html: `<div class="compare-line">
                        <span class="compare-value">${sa}</span>
                        <span class="compare-slot" aria-label="signe à choisir"></span>
                        <span class="compare-value">${sb}</span>
                       </div>`
            },
            answer,
            choices: ['<', '>'].map(sign => ({
                value: sign, label: sign, correct: sign === answer,
                why: sign !== answer && sign === naive
                    ? 'Tu as comparé la partie décimale comme un entier. 2,5 vaut 2,50 : on compare rang par rang.'
                    : undefined
            })),
            hints: [
                'Compare d\'abord les parties entières.',
                'Si elles sont égales, compare les dixièmes, puis les centièmes.',
                `${sa} = ${a.toFixed(3)} et ${sb} = ${b.toFixed(3)}.`
            ],
            explanation: `${sa} ${answer} ${sb} : on compare rang par rang (dixièmes, puis centièmes).`,
            difficulty: piege ? 4 : 2,
            meta: { a, b }
        });
    }
};
