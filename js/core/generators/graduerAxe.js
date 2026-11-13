// GRADUER UN AXE — écrire ce qui manque, et non lire une croix.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY envoie une page de ses fiches, « Ordre · Axe », et demande : « on a ce
// genre d'exercice ? ». Sur les trois colonnes, deux étaient déjà couvertes —
// « La Loupe sur la Droite » LIT une abscisse, « Le Dessin Gradué » POSE un
// point. La troisième, ses exercices 13 et 15, ne l'était pas : GRADUER.
//
// ── POURQUOI CE N'EST PAS LE MÊME SAVOIR QUE LIRE UN POINT ────────────────
//
// Lire une croix se fait en comptant des intervalles jusqu'à elle. Graduer
// demande de savoir, pour CHAQUE case, ce qu'on y écrit — donc de tenir le pas
// de l'axe sur toute sa longueur. Entre 8,13 et 8,14, un élève peut très bien
// lire un point juste et, à qui lui demande d'écrire la graduation suivante,
// répondre 8,14 puis 8,15 : il a compris la lecture et pas le pas.
//
// C'EST AUSSI LE SEUL DES TROIS QUI SE CORRIGE AU COUP D'ŒIL : trois cases
// remplies à la file montrent immédiatement si le pas tient ou s'il dérive.
//
// ── TROIS CASES, ET NON UNE ───────────────────────────────────────────────
//
// Une seule case se devine par symétrie — celle du milieu vaut la moyenne des
// bouts, et l'on peut la trouver sans jamais penser au pas. Trois cases
// éloignées obligent à compter depuis le bout, à chaque fois.
//
// ── LES TROIS MARCHES SONT LES TROIS ZOOMS DE SA PAGE ─────────────────────
//
// Dixièmes entre deux entiers, centièmes entre deux dixièmes, millièmes entre
// deux centièmes. C'est la cascade de son exercice 14, prise ici une marche à
// la fois — et c'est là que se voit l'idée que le tableau de numération ne
// donne jamais : entre deux décimaux il y en a toujours d'autres.
//
// Le générateur est PUR : le dessin vit dans `figures.js`, partagé avec la
// feuille imprimée.

import { makeItem, finalizeChoices } from '../items.js';
import { axeSvg, figure } from '../figures.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'num.dec.graduations';

/** Écriture française d'un décimal, sans traîne de virgule flottante. */
const fr = (x, rang) => x.toFixed(rang)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
    .replace('.', ',');

/**
 * LES TROIS MARCHES.
 *
 * `rang` est le nombre de décimales de ce qu'on écrit ; `pas` la valeur d'un
 * intervalle ; `rangDebut` le nombre de décimales du bout gauche — c'est lui
 * qui fait RECONNAÎTRE le zoom au premier coup d'œil, parce qu'un axe qui
 * commence à 8,13 ne peut pas être gradué de 0,1 en 0,1.
 */
const MARCHES = [
    { id: 'dixiemes', nom: '1. De 0,1 en 0,1', rang: 1, pas: 0.1, rangDebut: 0,
        dit: 'de 0,1 en 0,1' },
    { id: 'centiemes', nom: '2. De 0,01 en 0,01', rang: 2, pas: 0.01, rangDebut: 1,
        dit: 'de 0,01 en 0,01' },
    { id: 'milliemes', nom: '3. De 0,001 en 0,001', rang: 3, pas: 0.001, rangDebut: 2,
        dit: 'de 0,001 en 0,001' }
];

const LISTE = MARCHES.map(m => ({ id: m.id, nom: m.nom }));
const marcheDe = (id) => MARCHES.find(m => m.id === id) || MARCHES[0];

/**
 * LE BOUT GAUCHE DE L'AXE, « rond » à l'échelle du dessus.
 *
 * Pour les centièmes on part d'un nombre à UN chiffre après la virgule (8,1),
 * pour les millièmes à deux (8,13). Un axe des centièmes qui commencerait à
 * 8,17 serait juste, et personne ne reconnaîtrait le zoom.
 */
function tirerDebut(rng, marche) {
    const entier = rng.int(0, 12);
    if (marche.rangDebut === 0) return entier;
    // LA DERNIÈRE DÉCIMALE N'EST JAMAIS ZÉRO, et ce n'est pas une coquetterie.
    // Un axe des centièmes qui irait de 6 à 6,1 s'écrit « 6 » et « 6,1 » —
    // exactement un axe des DIXIÈMES vu de loin. L'élève reconnaît le zoom aux
    // nombres des deux bouts avant de compter quoi que ce soit, et celui-là
    // lui ment. De 6,07 à 6,08, aucune confusion n'est possible.
    const haut = Math.pow(10, marche.rangDebut);
    let decimales = rng.int(1, haut - 1);
    // On relance tant que la dernière décimale est nulle : 6,30 s'écrit « 6,3 »
    // et redonne l'axe qu'on voulait écarter.
    for (let essai = 0; essai < 20 && decimales % 10 === 0; essai++) {
        decimales = rng.int(1, haut - 1);
    }
    if (decimales % 10 === 0) decimales += 1;
    return Number((entier + decimales / haut).toFixed(marche.rangDebut));
}

/**
 * LES TROIS CRANS À REMPLIR, ENTRE 2 ET 8.
 *
 * NI LES BOUTS — ils sont écrits, ce sont eux l'énoncé —, NI TROIS VOISINS :
 * trois cases côte à côte se remplissent en ajoutant un pas trois fois, sans
 * jamais revenir compter depuis le bord.
 *
 * ── ET DEUX BORNES QUE LA PHOTO A DICTÉES ───────────────────────────────
 *
 * PAS LES CRANS 1 NI 9 : une case y recouvre l'étiquette du bout. Mesuré —
 * « 9,19 » dans une case au cran 9 passait par-dessus le « 9,2 » du bord
 * droit, et les deux devenaient illisibles.
 *
 * DEUX CRANS D'ÉCART AU MOINS entre deux cases voisines : à un cran d'écart,
 * deux cases de millièmes se chevauchent. L'écart se compte donc entre
 * VOISINES, et non seulement entre la première et la dernière.
 */
function tirerLesCases(rng) {
    for (let essai = 0; essai < 60; essai++) {
        const a = rng.int(2, 4);
        const b = rng.int(a + 2, 6);
        const c = rng.int(b + 2, 8);
        if (c <= 8 && b - a >= 2 && c - b >= 2) return [a, b, c];
    }
    return [2, 5, 8];
}

export const graduerAxeGenerator = {
    id: 'num.graduer-axe',
    label: 'Graduer un axe',
    skills: [SKILL],
    // PAS DE QCM TOUT SEUL : la réponse est une SUITE de trois nombres, et
    // c'est le pavé numérique à trois cases qui la recueille. Les propositions
    // existent quand même — elles portent les trois nombres d'un coup, et
    // c'est ce qui rend les fautes du chapitre reconnaissables d'un regard.
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE).length, 3),
    params: [
        paramMarches({ marches: LISTE, mot: 'marche' })
    ],

    generate(params = {}, ctx = {}) {
        const rng = ctx.rng;
        // L'ORDRE DES ARGUMENTS EST (index, marches, …), ET JE L'AI EU À
        // L'ENVERS : `marcheAuRang(marches, index, …)` rendait toujours la
        // première marche, donc les trois zooms dessinaient le même axe. Rien
        // ne plantait — c'est ce qui rend cette faute-là coûteuse.
        const marche = marcheDe(marcheAuRang(Number(ctx.index) || 0,
            marchesCochees(params, LISTE), totalDe(ctx, params), params, 3));

        const { rang, pas } = marche;
        const debut = tirerDebut(rng, marche);
        const fin = Number((debut + 10 * pas).toFixed(rang));
        const crans = tirerLesCases(rng);
        const valeurs = crans.map(k => Number((debut + k * pas).toFixed(rang)));
        const label = (v) => fr(v, rang);
        const ensemble = (liste) => liste.map(label).join('|');

        // ── LES TROIS FAUTES DU CHAPITRE, CHACUNE ENTIÈRE ─────────────────
        //
        // Une proposition porte les TROIS nombres : une faute de pas se voit
        // alors telle qu'elle est — elle grandit de case en case —, alors
        // qu'un distracteur à un seul nombre la montrerait comme un écart
        // quelconque.
        //
        //   1. LE PAS DE L'ÉCHELLE DU DESSUS. Sur un axe des centièmes, écrire
        //      8,1 / 8,4 / 8,7 : l'élève a bien compté les intervalles et les a
        //      comptés en dixièmes. C'est LA faute, et elle est invisible sur
        //      une seule case quand le cran tombe bien.
        //   2. COMPTER LES TRAITS. Tout est décalé d'un cran — l'élève compte
        //      le trait de départ comme le premier intervalle.
        //   3. REPARTIR DE ZÉRO. On écrit 0,4 / 0,7 au lieu de 8,14 / 8,17 :
        //      la partie avant la virgule a été oubliée en route.
        const pasDuDessus = Math.pow(10, -(rang - 1));
        const fauxEchelle = crans.map(k =>
            Number((debut + k * pasDuDessus).toFixed(Math.max(0, rang - 1))));
        const fauxDecale = crans.map(k =>
            Number((debut + (k + 1) * pas).toFixed(rang)));
        const fauxDepart = crans.map(k => Number((k * pas).toFixed(rang)));

        const enonce = `L'axe est gradué ${marche.dit}. Écris le nombre qui manque `
            + 'dans chaque case.';
        const dessin = axeSvg({
            debut, fin, pas, rang,
            // CHAQUE CASE SAIT COMBIEN DE SIGNES ELLE DOIT CONTENIR : c'est
            // ce qui la taille. « 10,523 » en demande six, « 3,4 » trois.
            cases: crans.map((i, k) => ({ i, signes: label(valeurs[k]).length }))
        });

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.graduer-axe',
            skillId: SKILL,
            // `numeric` ET NON `choice`, ET CE N'EST PAS UN DÉTAIL DE GOÛT.
            //
            // MESURÉ EN JOUANT LA QUESTION : avec `choice`, le pavé laisse la
            // place aux quatre propositions et NE S'AFFICHE PAS (voir
            // `propositions` dans `activities/numeric.js`). Les trois cases
            // étaient bien dessinées, elles portaient leur `data-trou`, et il
            // n'y avait aucun moyen d'écrire dedans. Rien ne plante, rien ne
            // prévient : la question est simplement impossible.
            //
            // LES PROPOSITIONS RESTENT, et elles servent : l'escalier les
            // reprend quand l'élève bute, et le défi en mode QCM s'en sert.
            answerKind: 'numeric',
            prompt: {
                text: `${enonce} (axe de ${label(debut)} à ${label(fin)})`,
                html: `<div class="game-question">${enonce}</div>` + figure(dessin),
                papier: `Complète les graduations de l'axe ci-dessus.`
            },
            answer: ensemble(valeurs),
            // PAS DE BARRE SUR LE CORRIGÉ IMPRIMÉ. « 8,14|8,17|8,19 » est ce
            // que le pavé envoie, pas ce qu'un professeur lit sur sa feuille.
            reponsePapier: valeurs.map(label).join(' · '),
            choices: finalizeChoices(rng, [
                { value: ensemble(valeurs), label: valeurs.map(label).join(' · '),
                    correct: true },
                { value: ensemble(fauxEchelle), label: fauxEchelle.map(v => fr(v, Math.max(0, rang - 1))).join(' · '),
                    why: `Le compte est bon, l'échelle non : ici un intervalle vaut `
                        + `${fr(pas, rang)}, pas ${fr(pasDuDessus, Math.max(0, rang - 1))}.` },
                { value: ensemble(fauxDecale), label: fauxDecale.map(label).join(' · '),
                    why: 'Un cran trop loin : on compte les INTERVALLES depuis le trait '
                        + 'de gauche, jamais les traits.' },
                { value: ensemble(fauxDepart), label: fauxDepart.map(label).join(' · '),
                    why: `L'axe ne commence pas à 0 : il commence à ${label(debut)}, `
                        + 'et c\'est de là qu\'on compte.' }
            ], {
                count: 4,
                filler: (r) => {
                    const d = r.int(1, 3);
                    const liste = crans.map(k => Number((debut + (k + d) * pas).toFixed(rang)));
                    return { value: ensemble(liste), label: liste.map(label).join(' · ') };
                }
            }),
            hints: [
                `Les deux grands traits valent ${label(debut)} et ${label(fin)} : entre eux, `
                    + 'l\'axe est coupé en DIX intervalles égaux.',
                `Un intervalle vaut donc ${fr(pas, rang)}. Pour chaque case, compte les `
                    + `intervalles depuis ${label(debut)}.`
            ],
            explanation: `De ${label(debut)} à ${label(fin)}, l'axe est coupé en dix : un `
                + `intervalle vaut ${fr(pas, rang)}. Les cases sont ${crans.join(', ')} `
                + `intervalles après ${label(debut)}, donc on écrit `
                + `${valeurs.map(label).join(', ')}.`,
            difficulty: rang,
            meta: {
                marche: marche.id,
                // TROIS CASES DANS L'ÉNONCÉ, TROIS MORCEAUX DANS LA RÉPONSE,
                // ET `cases` QUI LE DIT. Une épreuve de la maison confronte les
                // trois : le pavé, lui, compte les `[data-trou]` du HTML.
                cases: 3,
                // LA VIRGULE EST SUR LE PAVÉ dès les dixièmes, et c'est tout
                // l'exercice : sans elle, il n'y a rien à écrire.
                decimal: true,
                debut, fin, pas, rang, crans, valeurs,
                // CE QUE LA FEUILLE DESSINE — voir le rendu `graduer`.
                intervalles: 10, grandsTous: 10,
                theme: `${marche.id}-${debut}`
            }
        });
    }
};
