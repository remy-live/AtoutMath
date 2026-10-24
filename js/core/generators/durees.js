// CALCULER AVEC DES DURÉES — sixième, bloc 8.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa progression de sixième. La pendule se lit déjà dans le
// logiciel ; rien n'y faisait ADDITIONNER 1 h 45 et 2 h 30.
//
// ── POURQUOI C'EST UN CHAPITRE À PART, ET NON UNE ADDITION DE PLUS ─────────
//
// PARCE QUE LA RETENUE NE VAUT PLUS DIX. 45 + 30 = 75, et 75 minutes ne
// s'écrivent pas : c'est 1 h 15. L'élève qui a passé cinq ans à retenir
// « au-delà de 9, je retiens 1 » applique la même règle et répond « 3 h 75 »,
// ou pire, « 4 h 15 » en retenant un au mauvais moment.
//
// C'EST DONC UN CHAPITRE DE BASE SOIXANTE, déguisé en chapitre d'horloge. Et
// c'est le seul endroit du programme où l'on calcule dans une base qui n'est
// pas dix : ce qui y est appris sert ensuite aux angles, puis aux
// coordonnées géographiques.
//
// ── LES QUATRE ERREURS ENCODÉES ────────────────────────────────────────────
//
//   1. LES MINUTES QUI DÉPASSENT SOIXANTE et qu'on laisse telles quelles :
//      « 3 h 75 ».
//   2. LA RETENUE À DIX au lieu de soixante : 45 + 30 = 75 → « on retient 7,
//      il reste 5 ».
//   3. LA SOUSTRACTION OÙ L'ON EMPRUNTE DIX au lieu de soixante.
//   4. LA CONVERSION QUI MULTIPLIE PAR CENT : 2 h 15 écrit « 215 minutes ».

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const COMPETENCE = 'mes.duree.calcul';

const MARCHES = [
    { id: 'somme', nom: 'Additionner deux durées' },
    { id: 'difference', nom: 'Soustraire deux durées' },
    { id: 'vers-minutes', nom: 'En minutes seulement' },
    { id: 'vers-heures', nom: 'Des minutes vers heures et minutes' }
];
const TEMPS = {};
const MOT = 'palier';
const ANCIEN = { cle: 'palier' };

/** « 2 h 05 » — les minutes s'écrivent sur DEUX chiffres, comme sur une pendule. */
export function ecrireDuree(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${String(m).padStart(2, '0')}`;
}

/** Une durée en minutes, dont les minutes ne sont jamais rondes par hasard. */
function tirerDuree(rng, hMax = 4) {
    const h = rng.int(0, hMax);
    const m = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][rng.int(0, 11)];
    return h * 60 + (h === 0 && m === 0 ? 30 : m);
}

/**
 * LES ARRÊTS D'UNE SOUSTRACTION DE DURÉES — écrits une fois pour les trois.
 *
 * L'écran, le papier et les épreuves ont besoin de la MÊME liste. Recopiée,
 * elle finirait par ne plus l'être, et la feuille imprimée montrerait un
 * autre chemin que l'écran sur la même question.
 */
export function arretsDesBonds(petit, grand) {
    const palier = Math.ceil(petit / 60) * 60;
    return (palier > petit && palier < grand) ? [petit, palier, grand] : [petit, grand];
}

/**
 * LE SCHÉMA DES BONDS — « 1:48 → 2:00 → 3:17 », et un « + …… » par flèche.
 *
 * RÉMY, carnet du 24 octobre :
 *
 *   « Moi j'aimerai bien que si on calcule 3:17-1:48
 *     On ait le schéma suiavt,
 *     1:48 --> 2:00 --> 3:17 avec +.... au-dessus de chaque flèche
 *     Avec flèche et bulle, qqch de propre pour bien montrer. »
 *
 * CE QU'IL DEMANDE N'EST PAS UNE ILLUSTRATION, C'EST UNE MÉTHODE. On ne pose
 * pas une soustraction de durées en colonnes — la retenue y vaut soixante et
 * non dix, et c'est l'erreur que cet exercice existe pour attraper. On
 * AVANCE : du plus petit jusqu'à l'heure ronde, puis de l'heure ronde
 * jusqu'au plus grand. Les deux bonds mis bout à bout SONT la différence, et
 * aucune retenue ne se pose.
 *
 * LES FLÈCHES PORTENT DES POINTILLÉS, PAS LES VALEURS — c'est son « +.... »,
 * et c'est ce qui distingue un INDICE d'une correction. Le schéma montre où
 * sauter ; ce qu'on gagne à chaque bond reste à trouver.
 *
 * UN SEUL BOND QUAND IL N'Y EN A QU'UN : si le plus petit tombe déjà sur une
 * heure ronde, ou si l'heure ronde dépasse le plus grand, un second bond
 * vide dessinerait une flèche qui ne va nulle part.
 *
 * @param {number} petit  en minutes
 * @param {number} grand  en minutes, strictement plus grand
 * @param {object} [o]  `o.cases: true` remplace les pointillés par des cases
 *     où l'on tape — c'est l'outil « Schéma », que l'élève ouvre et qui reste
 *     ouvert. Sans elle, le dessin est muet : c'est ce qu'il faut dans la
 *     carte d'indice, qui se referme et où taper ne servirait à rien.
 */
function schemaBonds(petit, grand, o = {}) {
    const arrets = arretsDesBonds(petit, grand);
    // LA BOÎTE A GRANDI PAR LE HAUT — 150 au lieu de 124. Les bulles se posent
    // sur le sommet des arcs, et ce sommet était à 25 px du bord : une bulle qui
    // porte une case en fait 28. Elle débordait du dessin, donc de la carte.
    const W = 440, H = 150;
    // LA LIGNE EST SCHÉMATIQUE, PAS GRADUÉE : les arrêts sont régulièrement
    // espacés. À l'échelle, le premier bond — douze minutes contre une heure
    // dix-sept — ferait trois pixels de large, et son « + …… » ne tiendrait
    // pas dessus. Ce dessin dit QUAND on s'arrête, pas combien c'est long.
    const xs = arrets.map((_, i) => 46 + i * ((W - 92) / (arrets.length - 1)));
    const yLigne = 118;
    const R = 6;
    const points = arrets.map((v, i) =>
        `<circle cx="${xs[i]}" cy="${yLigne}" r="${R}" fill="currentColor"/>`
        + `<text x="${xs[i]}" y="${yLigne + 24}" text-anchor="middle" font-size="15"
            fill="currentColor">${ecrireDuree(v)}</text>`).join('');
    // ── LA POINTE S'ARRÊTE AVANT LE POINT, SANS LÂCHER LA LIGNE ───────────
    //
    // RÉMY, en choisissant ce dessin : « l'extrémité de la pointe de la
    // flèche arrive sur le cercle ».
    //
    // ELLE Y ARRIVAIT POUR DEUX RAISONS QUI S'AJOUTENT. La courbe finissait à
    // dix unités du centre, c'est-à-dire à QUATRE du bord d'un point de rayon
    // six ; et une pointe SVG DÉBORDE du bout de la courbe — avec `refX="9"`
    // sur un gabarit de 10 et un marqueur large de six fois l'épaisseur du
    // trait, 1,2 unité passe devant. Il restait trois unités, et la courbe
    // arrive de biais : à l'écran, la pointe touchait.
    //
    // LA PREMIÈRE CORRECTION A ÉTÉ TROP LOIN, et c'est la PHOTO qui l'a dit,
    // pas la mesure : en reculant la fin de la courbe à douze unités AU-DESSUS
    // de la ligne, la flèche ne descendait plus jusqu'à son arrêt — elle
    // flottait, et le dessin ne disait plus « on arrive ICI ». Mesuré :
    // 14,4 unités d'air, soit dix pixels à l'écran. Dans la maquette que Rémy
    // a choisie, l'arc finit AU RAS de l'axe, et c'est exactement pour cela
    // que la pointe y touchait le cercle.
    //
    // ON GARDE DONC L'ATTERRISSAGE et l'on recule À L'HORIZONTALE : la courbe
    // finit quatre unités au-dessus de la ligne, à `R + 8` du centre. Mesuré
    // par `tools/pointeDuBond.mjs`, qui demande au navigateur le bout de la
    // courbe, sa tangente, et y ajoute le débord du marqueur : 7,4 unités
    // d'air, cinq pixels — un trait blanc entre la pointe et le point.
    const fleches = xs.slice(0, -1).map((x, i) => {
        const x2 = xs[i + 1];
        const milieu = (x + x2) / 2;
        return `<path d="M ${x + R + 6} ${yLigne - 4} Q ${milieu} ${yLigne - 58}
            ${x2 - R - 8} ${yLigne - 4}" fill="none" stroke="currentColor"
            stroke-width="2" marker-end="url(#md-pointe)"/>`;
    }).join('');
    // LA PHRASE POUR QUI NE VOIT PAS LE DESSIN, calculée à part : imbriquée
    // dans le gabarit, elle demanderait des apostrophes dans des apostrophes.
    const dit = arrets.map(ecrireDuree).join(' puis ');
    // LA POINTE DE FLÈCHE EST UN `marker`, et son identifiant est propre à ce
    // dessin : deux schémas sur la même page partageraient sinon la même
    // définition, ce qui marche — jusqu'au jour où l'un des deux change.
    const dessin = `<svg class="md-bonds" viewBox="0 0 ${W} ${H}" width="100%" role="img"
        aria-label="On avance par bonds : ${dit}.">
        <defs><marker id="md-pointe" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>
        <line x1="30" y1="${yLigne}" x2="${W - 30}" y2="${yLigne}"
            stroke="currentColor" stroke-width="1.5" opacity=".45"/>
        ${fleches}${points}</svg>`;

    // ── LES BULLES SONT EN HTML, PAS DANS LE SVG ──────────────────────────
    //
    // RÉMY a choisi le dessin « C — Les bulles » parmi quatre maquettes, et
    // il a demandé en même temps « on pourra compléter les pointillés ». Une
    // case où l'on tape est un `<input>` : dans un SVG il faudrait un
    // `<foreignObject>`, que tout le monde ne rend pas pareil. On pose donc
    // les bulles PAR-DESSUS, en pourcentage de la scène — le SVG garde ses
    // proportions quand la largeur change, et les bulles suivent.
    //
    // `data-case-outil="texte"` : la case garde ce qu'on tape (« 40 min »),
    // et les frappes n'arrivent pas à l'exercice. Voir `activities/outils.js`.
    const cases = !!o.cases;
    // PAS DE `placeholder` DANS LA CASE. Photographié : le pointillé du
    // marque-page se posait AU-DESSUS du pointillé qui souligne la case, et
    // l'on voyait deux rangées de points l'une sur l'autre. C'est le reproche
    // que Rémy avait déjà fait à la fiche des fractions — « tu écris
    // ...../..... avec des drole de pointillé et mets moins de pointillés ».
    // Le soulignement suffit à dire qu'il y a quelque chose à écrire.
    const trou = (quoi) => (cases
        ? `<input class="md-case" type="text" maxlength="8" data-case-outil="texte"
            aria-label="${quoi}">`
        : '……');
    const bulles = xs.slice(0, -1).map((x, i) => {
        const centre = ((x + xs[i + 1]) / 2 / W) * 100;
        return `<span class="md-bulle" style="left:${centre.toFixed(2)}%">+ ${
            trou(`Ce qu'on ajoute au bond ${i + 1}`)}</span>`;
    }).join('');
    // ── « EN TOUT », SEULEMENT QUAND IL Y A DEUX BONDS ────────────────────
    //
    // PHOTOGRAPHIÉ sur « 1 h 05 − 45 min » : un seul bond, et la ligne du total
    // demandait de RECOPIER le nombre qu'on venait d'écrire au-dessus de la
    // flèche. Un élève à qui l'on fait écrire deux fois la même chose cherche
    // ce qu'il n'a pas compris. Quand il n'y a qu'un bond, ce bond EST la
    // différence, et l'ovale n'ajoute rien — il retire.
    const total = xs.length > 2
        ? `<div class="md-total">en tout :
            <span class="md-entoure">${trou('Le total des bonds')}</span></div>`
        : '';
    return `<div class="md-bonds-bloc">
        <div class="md-scene">${dessin}${bulles}</div>${total}</div>`;
}

/**
 * LA TABLE DE SOIXANTE — « en indice une table de 60 pour trouver le nombre
 * d'heure », demandée le 24 octobre.
 *
 * POURQUOI ELLE AIDE VRAIMENT : « 196 minutes, combien d'heures ? » est une
 * division euclidienne par 60, et un élève de sixième ne la pose pas de tête.
 * La table lui donne l'encadrement — 180 < 196 < 240 —, donc 3 heures, et le
 * reste se lit par soustraction. On ne lui demande pas de diviser, on lui
 * demande de REGARDER.
 *
 * ON S'ARRÊTE JUSTE AU-DESSUS DE CE QU'IL FAUT : une table de dix lignes sous
 * une question qui en demande trois est une colonne de chiffres qu'on ne lit
 * pas. Deux lignes de marge suffisent à montrer que ça continue.
 */
function tableDe60(minutes) {
    const jusqua = Math.min(10, Math.max(3, Math.floor(minutes / 60) + 2));
    const lignes = [];
    for (let k = 1; k <= jusqua; k++) {
        // LA LIGNE QUI ENCADRE SE SIGNALE : c'est la dernière qui ne dépasse
        // pas. Sans elle, la table est juste et ne montre rien.
        const tient = k * 60 <= minutes;
        lignes.push(`<li${tient ? ' class="md-table-tient"' : ''}>${k} h = ${k * 60} min</li>`);
    }
    return `<ul class="md-table-60">${lignes.join('')}</ul>`;
}

export const dureesGenerator = {
    id: 'mes.durees',
    label: 'Calculer avec des durées',
    skills: [COMPETENCE],
    answerKinds: ['choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES, ANCIEN).length, 3),
    params: [
        paramMarches({ marches: MARCHES, groupes: TEMPS, mot: MOT, ancien: ANCIEN }),
        {
            // ── LE SCHÉMA SUR LA FEUILLE ──────────────────────────────────
            //
            // RÉMY, après avoir choisi le dessin de l'écran : « tu me fera
            // aussi une version imprimé pour les schémas ».
            //
            // COCHÉ PAR DÉFAUT, PARCE QUE C'EST LA MÉTHODE. On ne pose pas une
            // soustraction de durées en colonnes ; le schéma n'est pas une
            // illustration, c'est la façon de la faire. Mais il prend deux
            // centimètres par question : sur une feuille de vingt calculs
            // rapides, le professeur voudra le retirer.
            //
            // `papier: true` : ce réglage ne change RIEN à l'écran — le bouton
            // « Schéma » y est toujours là —, donc il n'a sa place que dans le
            // panneau d'impression. Voir `core/reglagesFiche.js`, qui existe
            // pour empêcher les boutons qui ne changent rien.
            id: 'schemaPapier', type: 'checkbox', papier: true,
            label: 'Le schéma des bonds sous les soustractions', default: true,
            visibleSi: (r) => marchesCochees(r, MARCHES, ANCIEN)
                .some(m => m.id === 'difference'),
            aide: 'La ligne du temps avec ses deux bonds à compléter. Décoché, '
                + 'il ne reste que le calcul et sa ligne de réponse.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const i = Number(ctx.index) || 0;
        const marche = marcheAuRang(i, marchesCochees(p, MARCHES, ANCIEN),
            totalDe(ctx, p), p, 3);
        const commun = {
            seed: rng.seed,
            generatorId: 'mes.durees',
            skillId: COMPETENCE,
            answerKind: 'choice'
        };

        if (marche === 'somme' || marche === 'difference') {
            const somme = marche === 'somme';
            let x = tirerDuree(rng, 3), y = tirerDuree(rng, 2);
            if (!somme && y >= x) { const t = x; x = y + 30; y = t; }
            const total = somme ? x + y : x - y;
            const mx = x % 60, my = y % 60;
            // LES MINUTES DÉPASSENT-ELLES SOIXANTE ? C'est tout le sujet : sans
            // retenue, la question se répond sans rien avoir compris.
            const deborde = somme ? (mx + my >= 60) : (mx < my);

            // L'ERREUR N° 1 : les minutes laissées au-delà de soixante.
            const brut = somme
                ? `${Math.floor(x / 60) + Math.floor(y / 60)} h ${String(mx + my).padStart(2, '0')}`
                : `${Math.floor(x / 60) - Math.floor(y / 60)} h ${String(Math.abs(mx - my)).padStart(2, '0')}`;
            // L'ERREUR N° 2 : la retenue de DIX au lieu de SOIXANTE.
            const dix = somme ? total + 50 : total - 50;

            const leurres = [
                { v: brut, why: deborde
                    ? `Les minutes dépassent 60 : ${mx} + ${my} = ${mx + my}, c'est-à-dire `
                        + `1 h ${String((mx + my) - 60).padStart(2, '0')}. On reporte cette heure.`
                    : 'Les heures ne se retiennent pas ici — relis le calcul des minutes.' },
                { v: ecrireDuree(Math.max(0, dix)), why: 'La retenue d\'une heure vaut SOIXANTE '
                    + 'minutes, pas dix : une pendule ne compte pas en base dix.' },
                { v: ecrireDuree(somme ? total + 60 : Math.max(0, total - 60)),
                    why: 'Une heure de trop (ou de moins) : la retenue a été comptée deux fois.' }
            ];
            const bonne = ecrireDuree(total);
            return makeItem({
                ...commun,
                prompt: {
                    text: `${ecrireDuree(x)} ${somme ? '+' : '−'} ${ecrireDuree(y)} = ?`,
                    html: `<div class="game-question">${ecrireDuree(x)} `
                        + `${somme ? '+' : '−'} ${ecrireDuree(y)} =&nbsp;?</div>`,
                    papier: `${ecrireDuree(x)} ${somme ? '+' : '−'} ${ecrireDuree(y)} =`,
                    // ── LE SCHÉMA SUR LA FEUILLE ──────────────────────────
                    //
                    // ON ENVOIE LES ARRÊTS, PAS LE DESSIN. La feuille mesure en
                    // millimètres et trace DEUX FOIS — l'aperçu en HTML, le PDF
                    // en jsPDF ; un SVG d'écran n'entre ni dans l'un ni dans
                    // l'autre, et une image collée sortirait floue. Voir
                    // `mesurerBonds` dans `core/fiche.js`, qui décide où tombe
                    // chaque trait, une fois, pour les deux traceurs.
                    //
                    // ET C'EST `arretsDesBonds` QUI RÉPOND, la fonction que
                    // l'écran emploie déjà : le papier montre donc le MÊME
                    // chemin que le bouton « Schéma », par construction et non
                    // par recopie.
                    //
                    // ON NE JOINT PAS LES RÉPONSES POUR LE CORRIGÉ, et c'est
                    // une chose vérifiée plutôt que supposée : `composerSolutions`
                    // ne redessine RIEN de la feuille — ni tableau ni schéma —,
                    // elle compose une liste de réponses. Du code qui aurait
                    // écrit les bonds en gris sur un corrigé n'aurait jamais pu
                    // s'exécuter, et un commentaire l'aurait pourtant expliqué.
                    ...(somme || p.schemaPapier === false ? {} : {
                        bonds: { arrets: arretsDesBonds(y, x).map(ecrireDuree) }
                    })
                },
                answer: bonne,
                choices: finalizeChoices(rng, [
                    { value: bonne, label: bonne, correct: true },
                    ...leurres.filter(l => l.v !== bonne)
                        .map(l => ({ value: l.v, label: l.v, why: l.why }))
                ], { count: 4, filler: (r) => ecrireDuree(Math.max(5, total + r.int(1, 3) * 15)) }),
                hints: somme
                    ? [
                        'Additionne les heures d\'un côté, les minutes de l\'autre.',
                        'Puis regarde les minutes : au-delà de 60, elles font une heure de plus.'
                    ]
                    // ── AVANCER, ET QUAND ÇA VAUT LA PEINE ────────────────
                    //
                    // RÉMY : « 1:48 --> 2:00 --> 3:17 avec +.... au-dessus de
                    // chaque flèche ». Les deux indices de la somme ne valaient
                    // rien pour la différence : « additionne les heures d'un
                    // côté » est précisément ce qu'il ne faut PAS faire quand
                    // les minutes du bas dépassent celles du haut.
                    //
                    // MAIS ELLES NE LE DÉPASSENT PAS TOUJOURS. Vu sur SA
                    // capture : « 3 h 15 − 5 min », où 15 est plus grand que 5.
                    // Mon indice lui disait quand même « on n'en pose pas une »,
                    // alors que c'est exactement ce qu'il fallait faire : les
                    // heures entre elles, les minutes entre elles, sans retenue.
                    // UN INDICE QUI DÉTOURNE D'UNE MÉTHODE JUSTE est pire qu'un
                    // indice absent.
                    //
                    // LE DESSIN RESTE DANS LES DEUX CAS — avancer n'est jamais
                    // FAUX, et c'est ce qu'il voulait voir. C'est la PHRASE qui
                    // change, et elle dit laquelle des deux routes est la plus
                    // courte ici.
                    : deborde
                        ? [
                            'ON N\'EN POSE PAS UNE : les minutes du bas dépassent celles du '
                                + 'haut. On AVANCE du plus petit vers le plus grand, en '
                                + 's\'arrêtant à l\'heure ronde.',
                            'Deux bonds, et leur somme est la réponse. Combien pour atteindre '
                                + 'l\'heure ronde ? Puis combien pour finir ?'
                        ]
                        : [
                            'Ici les minutes du haut sont les plus grandes : tu peux poser, '
                                + 'les heures entre elles et les minutes entre elles.',
                            'Et l\'autre route marche aussi : on AVANCE du plus petit vers le '
                                + 'plus grand, et les deux bonds font la réponse.'
                        ],
                // ── LE DESSIN DÈS LE PREMIER INDICE ───────────────────────
                //
                // RÉMY, capture à l'appui : « je ne vois pas les schémas pour
                // les heures et minutes ».
                //
                // MESURÉ sur son chemin : après UN clic sur « Un indice », le
                // texte s'affiche et le schéma n'est pas là — il attendait le
                // SECOND. Or les deux indices parlent des bonds, et un dessin
                // qu'il faut demander deux fois est un dessin qu'on ne voit
                // pas. C'était exactement sa demande : « qqch de propre pour
                // bien montrer ».
                //
                // LA SOMME N'EN A PAS : on la pose, et il n'y a rien à montrer
                // qu'une addition.
                schemas: somme ? [] : [schemaBonds(y, x), schemaBonds(y, x)],
                explanation: deborde
                    ? `${mx} ${somme ? '+' : '−'} ${my} minutes ${somme ? 'font' : 'demandent'} `
                        + `une retenue de SOIXANTE minutes, pas de dix. Le résultat est ${bonne}.`
                    : `Les heures entre elles, les minutes entre elles : ${bonne}.`,
                difficulty: deborde ? 3 : 1,
                meta: {
                    marche, x, y, total, deborde, theme: `${marche}-${deborde}`,
                    // ── LE DESSIN QUI SE POSE, ET QUI SE REMPLIT ──────────
                    //
                    // IL Y A EU UN BOUTON « SCHÉMA » ICI, pendant une version.
                    // RÉMY, capture à l'appui : « petit bug quand on demande
                    // l'incide, enlève le bouton shéma finalement ».
                    //
                    // CE QU'IL VOYAIT : le schéma posé sous l'énoncé par
                    // l'indice, en pointillés morts, ET le même schéma dans le
                    // panneau du bouton, avec ses cases. Deux dessins de la
                    // même chose, dont un seul répondait quand on écrivait
                    // dedans. Le bouton partait d'une idée juste — ne pas faire
                    // payer un indice pour voir le dessin — mais un doublon
                    // coûte plus cher qu'un indice.
                    //
                    // CE QUI SURVIT DU BOUTON, CE SONT LES CASES. « il faut
                    // pouvoir écrire dans les bulles », la veille. C'est donc
                    // le dessin POSÉ qui les porte.
                    //
                    // ET IL EST DISTINCT DE `schemas[]`, qui part dans la carte
                    // d'indice : la carte est MODALE, une case qu'elle
                    // porterait s'effacerait dès « Merci ! ». Voir
                    // `wireHint` dans `activities/choice.js`.
                    //
                    // LA CLÉ N'EXISTE PAS SUR LA SOMME : `undefined` est une
                    // clé PRÉSENTE, et l'épreuve « aucun meta ne porte de
                    // code » la refuse.
                    ...(somme ? {} : { schemaPose: schemaBonds(y, x, { cases: true }) })
                }
            });
        }

        if (marche === 'vers-minutes') {
            const d = tirerDuree(rng, 4) || 95;
            const h = Math.floor(d / 60), m = d % 60;
            const bonne = `${d} min`;
            const leurres = [
                { v: `${h * 100 + m} min`, why: 'Une heure vaut 60 minutes, pas 100 : '
                    + `${h} h ${String(m).padStart(2, '0')} ne s'écrit pas ${h}${String(m).padStart(2, '0')}.` },
                { v: `${h * 60} min`, why: 'Les minutes de la durée ont été oubliées.' },
                { v: `${d + 60} min`, why: 'Une heure de trop.' }
            ];
            return makeItem({
                ...commun,
                prompt: {
                    text: `Combien de minutes font ${ecrireDuree(d)} ?`,
                    html: `<div class="game-question">Combien de minutes font `
                        + `<b>${ecrireDuree(d)}</b>&nbsp;?</div>`,
                    papier: `${ecrireDuree(d)} = …… min`
                },
                answer: bonne,
                choices: finalizeChoices(rng, [
                    { value: bonne, label: bonne, correct: true },
                    ...leurres.filter(l => l.v !== bonne)
                        .map(l => ({ value: l.v, label: l.v, why: l.why }))
                ], { count: 4, filler: (r) => `${d + r.int(1, 5) * 10} min` }),
                hints: ['Une heure vaut 60 minutes.', `${h} × 60 = ${h * 60}, puis on ajoute ${m}.`],
                explanation: `${h} h = ${h * 60} min, plus ${m} min : ${d} minutes en tout.`,
                difficulty: 2,
                meta: { marche, d, theme: `min-${d}` }
            });
        }

        // DES MINUTES VERS HEURES ET MINUTES — c'est la division euclidienne
        // par 60, et il vaut la peine de le dire : le quotient donne les
        // heures, le reste les minutes.
        const total = rng.int(70, 400);
        const bonne = ecrireDuree(total);
        const leurres = [
            { v: `${Math.round(total / 60)} h`, why: 'On ne garde pas que les heures : '
                + 'il reste des minutes, et elles comptent.' },
            { v: ecrireDuree(total + 60), why: 'Une heure de trop.' },
            { v: `${Math.floor(total / 100)} h ${String(total % 100).padStart(2, '0')}`,
                why: 'On divise par 60, pas par 100 : une heure vaut soixante minutes.' }
        ];
        return makeItem({
            ...commun,
            prompt: {
                text: `Écris ${total} minutes en heures et minutes.`,
                html: `<div class="game-question">Écris <b>${total} minutes</b> en heures `
                    + 'et minutes.</div>',
                papier: `${total} min = …… h …… min`
            },
            answer: bonne,
            choices: finalizeChoices(rng, [
                { value: bonne, label: bonne, correct: true },
                ...leurres.filter(l => l.v !== bonne)
                    .map(l => ({ value: l.v, label: l.v, why: l.why }))
            ], { count: 4, filler: (r) => ecrireDuree(total + r.int(1, 4) * 15) }),
            hints: [
                'Divise par 60 : le quotient donne les heures.',
                'Et le RESTE de cette division donne les minutes.',
                // RÉMY : « en indice une table de 60 pour trouver le nombre
                // d'heure ». Le dernier indice la POSE ; voir `tableDe60`.
                'Lis la table : la dernière ligne qui ne dépasse pas donne les '
                    + 'heures, et ce qui manque pour y arriver donne les minutes.'
            ],
            // LA TABLE DÈS LE PREMIER INDICE, et de nouveau avec celui qui la
            // nomme. Elle attendait le TROISIÈME : personne ne clique trois
            // fois, et Rémy ne l'a jamais vue. Le second indice ne parle que du
            // reste, il n'a rien à montrer.
            schemas: [tableDe60(total), '', tableDe60(total)],
            explanation: `${total} = 60 × ${Math.floor(total / 60)} + ${total % 60}, `
                + `donc ${total} min = ${bonne}. C'est une division euclidienne par 60 : `
                + 'le quotient compte les heures, le reste les minutes.',
            difficulty: 2,
            meta: { marche, total, theme: `h-${total}` }
        });
    }
};
