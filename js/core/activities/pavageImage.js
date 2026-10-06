// LE PAVAGE DES TRANSFORMATIONS — l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu pourrais refaire ce pavage et poser différentes questions et si
// l'élève se trompe, lui compter faux mais aussi montrer la transformation ».
//
// Les trois demandes sont dans cette phrase, et la troisième est celle qui
// décide de tout le fichier : MONTRER. Pas « expliquer », pas « afficher la
// bonne réponse » — montrer le geste.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI L'ANIMATION EST LA CORRECTION, ET PAS UN BONUS.
//
// Un élève qui se trompe ici ne s'est pas trompé de calcul : il a mal SUIVI une
// figure. Lui écrire « la bonne réponse était 9 » ne lui apprend rien — il voit
// bien que ce n'est pas 9 qu'il a touché, et il ne sait toujours pas pourquoi.
// Ce qu'il lui manque, c'est le TRAJET : voir sa pièce quitter sa place, passer
// de l'autre côté de l'axe, et se poser.
//
// On anime donc la pièce elle-même — un fantôme qui glisse, tourne ou se
// retourne — avec l'axe ou le centre dessiné pendant tout le mouvement. C'est
// la seule correction qui dise quelque chose sur une transformation.
//
// ET ON NE L'ANIME PAS AVANT. Le réglage par défaut est `si-faux` : une
// animation systématique donnerait la réponse avant que l'élève ait cherché, et
// l'exercice deviendrait un dessin animé. Le professeur peut la mettre sur
// `toujours` pour une séance de découverte — c'est son métier, pas le nôtre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE DESSIN : DES CASES, PAS DES POLYGONES.
//
// Une pièce est un polyomino. On pourrait calculer son contour et tracer un
// seul chemin ; on dessine plutôt un carré par case, et l'on pose le trait noir
// seulement sur les côtés qui donnent sur une AUTRE pièce. Deux raisons, toutes
// deux mesurées sur la fiche de Rémy :
//
//   · le contour d'un polyomino à trou — ça arrive — demande deux chemins et
//     une règle de remplissage ; le carré par case n'a pas ce problème ;
//   · c'est le trait entre deux pièces qui porte l'information. Un contour
//     dessinerait deux fois la même frontière, une par pièce, et les deux
//     traits superposés font une épaisseur double là où les pièces se touchent.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { meneurDemo } from '../meneurDemo.js';
import { appliquer } from '../transformations.js';
import { direTransformation } from '../mosaique.js';
import { marqueurPoint } from '../figures.js';

/** Le côté d'une case, en unités de dessin. */
// LA CASE, EN PIXELS. Rémy, devant l'écran : « il faudrait des carreaux, une
// figure plus grande ». Elle valait 34 px — assez pour viser au doigt, pas
// assez pour COMPTER. Or compter les carreaux est le geste même de l'exercice :
// « trois à droite et deux en haut » ne se lit pas sur un dessin où l'on
// distingue mal les lignes. À 46 px la plus grande mosaïque tient encore dans
// une page, et le cadre défile si l'écran est étroit.
const COTE = 46;
const MARGE = 22;

/**
 * LES COULEURS DES PIÈCES.
 *
 * Elles ne portent AUCUNE information : deux pièces voisines doivent seulement
 * se distinguer, et c'est le NUMÉRO qui désigne. Un élève daltonien fait donc
 * l'exercice exactement comme les autres — ce qui ne serait pas le cas si l'on
 * avait écrit « l'image de la pièce bleue ».
 *
 * On prend des teintes claires : le numéro est écrit par-dessus en noir, et il
 * doit se lire. Mesuré sur le Jardin : une encre qui suit le thème devient
 * illisible dès que la couleur de fond est fixe (contraste 1,11 en thème
 * sombre). L'encre est donc littérale ici aussi.
 */
const TEINTES = [
    '#bfdbfe', '#fecaca', '#bbf7d0', '#fde68a', '#e9d5ff', '#a5f3fc',
    '#fed7aa', '#d9f99d', '#fbcfe8', '#c7d2fe', '#99f6e4', '#fef08a',
    '#ddd6fe', '#bae6fd', '#fecdd3', '#d1fae5'
];

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null, gate = null;
    let item = null;
    let repondu = false;

    function renderNext() {
        item = session.next();
        if (!item) return;
        repondu = false;
        dessiner();
    }

    // ── La géométrie du dessin ──────────────────────────────────────────────

    const boite = () => item.meta.boite;
    /** Du repère des cases (y monte) vers celui du SVG (y descend). */
    const X = (x) => MARGE + (x - boite().x0) * COTE;
    const Y = (y) => MARGE + (boite().y1 - y) * COTE;

    function tailleSvg() {
        const b = boite();
        return { w: (b.x1 - b.x0) * COTE + MARGE * 2, h: (b.y1 - b.y0) * COTE + MARGE * 2 };
    }

    /** Les quatre côtés d'une case, en coordonnées de dessin. */
    function cotesDe(c) {
        const g = X(c.x - 0.5), d = X(c.x + 0.5), h = Y(c.y + 0.5), b = Y(c.y - 0.5);
        return {
            haut: [g, h, d, h], bas: [g, b, d, b],
            gauche: [g, h, g, b], droite: [d, h, d, b]
        };
    }

    // ── Le dessin ───────────────────────────────────────────────────────────

    function svgDuPavage() {
        const { w, h } = tailleSvg();
        const b = boite();
        const pieces = item.meta.pieces;
        const occupe = new Map();
        pieces.forEach(p => p.cases.forEach(c => occupe.set(`${c.x},${c.y}`, p.n)));

        // ── LES CARREAUX, ET J'AVAIS ÉCRIT LE CONTRAIRE ────────────────────
        //
        // RÉMY : « il faudrait des carreaux ».
        //
        // IL A RAISON, ET MON COMMENTAIRE D'ORIGINE DISAIT L'INVERSE : « un
        // quadrillage complet ferait ressembler la mosaïque à du papier
        // millimétré ». C'était un argument de dessinateur, pas de professeur.
        // Sa feuille EST du papier quadrillé, et ce n'est pas un décor : la
        // réponse à « quelle translation ? » se lit en comptant les carreaux
        // entre deux sommets. Sans eux, l'élève voit des taches de couleur et
        // ne peut mesurer aucun déplacement — c'est-à-dire qu'il ne peut pas
        // faire l'exercice autrement qu'à l'œil.
        //
        // ILS PASSENT PAR-DESSUS LES COULEURS, et non dessous : les fonds sont
        // opaques, un quadrillage posé en dessous disparaîtrait à l'intérieur
        // des pièces — c'est-à-dire partout où l'on compte. Très pâle, il se
        // lit comme les carreaux d'un cahier sous la couleur d'un feutre.
        let carreaux = '';
        for (let x = b.x0; x <= b.x1; x++) {
            carreaux += `<line class="pv-carreau" x1="${X(x)}" y1="${Y(b.y0)}"`
                + ` x2="${X(x)}" y2="${Y(b.y1)}"/>`;
        }
        for (let y = b.y0; y <= b.y1; y++) {
            carreaux += `<line class="pv-carreau" x1="${X(b.x0)}" y1="${Y(y)}"`
                + ` x2="${X(b.x1)}" y2="${Y(y)}"/>`;
        }

        let fond = '', traits = '', numeros = '';
        pieces.forEach((p, i) => {
            const teinte = TEINTES[i % TEINTES.length];
            for (const c of p.cases) {
                fond += `<rect class="pv-case" data-piece="${p.n}"`
                    + ` x="${X(c.x - 0.5)}" y="${Y(c.y + 0.5)}" width="${COTE}" height="${COTE}"`
                    + ` fill="${teinte}"/>`;
                // LE TRAIT NE SE POSE QU'À LA FRONTIÈRE : entre deux cases de
                // la MÊME pièce il n'y a rien à séparer, et un quadrillage
                // complet ferait ressembler la mosaïque à du papier millimétré.
                const voisins = [
                    ['haut', { x: c.x, y: c.y + 1 }], ['bas', { x: c.x, y: c.y - 1 }],
                    ['gauche', { x: c.x - 1, y: c.y }], ['droite', { x: c.x + 1, y: c.y }]
                ];
                for (const [cote, v] of voisins) {
                    if (occupe.get(`${v.x},${v.y}`) === p.n) continue;
                    const [x1, y1, x2, y2] = cotesDe(c)[cote];
                    traits += `<line class="pv-bord" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
                }
            }
            const centre = centreDessin(p.cases);
            numeros += `<text class="pv-num" x="${centre.x}" y="${centre.y}"`
                + ` text-anchor="middle" dominant-baseline="central">${p.n}</text>`;
        });

        // ── LES SOMMETS NOMMÉS, ET ILS SUIVENT LE RÉGLAGE DU POSTE ─────────
        //
        // RÉMY : « que les points soient des croix, pixel ou rond selon
        // l'option ».
        //
        // L'OPTION EXISTE DEPUIS LONGTEMPS — « Marque des points » dans les
        // réglages d'affichage, `state.stylePoint` : croix, plus ou disque —
        // et toutes les figures du logiciel la suivent. Celle-ci dessinait son
        // propre disque de 3,5 px : un exercice qui invente sa convention
        // apprend à l'élève que la convention n'en est pas une.
        //
        // `marqueurPoint` écrit LES TROIS marques dans le SVG, et le CSS en
        // montre une selon `html[data-point]`. Changer le réglage ne redessine
        // donc rien : une mosaïque déjà à l'écran change de convention à
        // l'instant où le professeur bascule l'option.
        let points = '';
        for (const s of item.meta.sommets) {
            points += marqueurPoint(X(s.x), Y(s.y), 'pv-sommet', 6)
                // LA LETTRE SE POSE PLUS HAUT QU'AVANT, parce que la marque a
                // grandi avec la figure : une croix de 6 px de demi-branche
                // monte jusqu'à 7 px au-dessus du point, et la lettre posée à
                // 11 px s'asseyait dessus. Vu à l'écran sur « I » et « J ».
                + `<text class="pv-lettre" x="${X(s.x)}" y="${Y(s.y) - 14}"`
                + ` text-anchor="middle">${s.nom}</text>`;
        }

        // LA TAILLE EST ÉCRITE SUR LE DESSIN, ET C'EST TOUT LE DÉFAUT.
        //
        // RÉMY : « une figure plus grande ». Je commençais par agrandir la
        // case — et MESURÉ dans un navigateur, cela ne changeait RIEN :
        // viewBox 550 de large, rendu 320 px. Un `<svg>` sans `width` ni
        // `height` n'a pas de taille naturelle ; `max-width: 100%` n'a donc
        // rien à limiter, et c'est le `min-width: 320px` de la feuille de
        // style qui décidait de tout. La mosaïque faisait 320 px sur un écran
        // de 1400, quelle que soit la valeur de COTE.
        //
        // On écrit donc sa taille naturelle. `max-width: 100%` et
        // `height: auto` la font toujours rétrécir sur un téléphone — mais
        // elle ne RÉTRÉCIT plus sur un grand écran, où il y a la place.
        return `<svg class="pv-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"
            aria-label="Mosaïque de ${pieces.length} pièces numérotées">
            <g class="pv-fonds">${fond}</g>
            <g class="pv-carreaux">${carreaux}</g>
            <g class="pv-traits">${traits}</g>
            <g class="pv-contour-g" data-contour></g>
            <g class="pv-repere" data-repere></g>
            <g class="pv-numeros">${numeros}</g>
            <g class="pv-points">${points}</g>
            <g class="pv-vol" data-vol></g>
        </svg>`;
    }

    /**
     * OÙ SE POSE LE NUMÉRO — et pourquoi ce n'est PAS le centre de gravité.
     *
     * Vu à l'écran : le « 6 » d'une pièce en L flottait DEHORS, à côté de la
     * figure. Le centre de gravité d'un polyomino concave tombe dans le creux,
     * c'est-à-dire chez la voisine — et le numéro EST la réponse de l'exercice.
     * Un élève qui lit « 6 » sur la mauvaise pièce donne la mauvaise réponse en
     * ayant parfaitement raisonné.
     *
     * On prend donc le centre de la CASE la plus proche du centre de gravité :
     * elle appartient à la pièce par construction.
     */
    function centreDessin(cases) {
        const gx = cases.reduce((s, c) => s + c.x, 0) / cases.length;
        const gy = cases.reduce((s, c) => s + c.y, 0) / cases.length;
        let meilleure = cases[0], mieux = Infinity;
        for (const c of cases) {
            const d = (c.x - gx) ** 2 + (c.y - gy) ** 2;
            if (d < mieux) { mieux = d; meilleure = c; }
        }
        return { x: X(meilleure.x), y: Y(meilleure.y) };
    }

    function dessiner() {
        const t = item.meta.transfo;
        container.innerHTML = `
            <div class="game-question">${item.prompt.text}</div>
            <div class="pv-cadre">${svgDuPavage()}</div>
            <div class="pv-aide" data-statut aria-live="polite">Touche la pièce qui est l'image de la pièce ${item.meta.depuis}.</div>
            ${hintBar(item)}`;
        wireHint(container, session, item);

        // LA PIÈCE DE DÉPART S'ALLUME. Sans cela, l'élève commence par la
        // chercher parmi seize numéros — et c'est du temps pris sur la
        // transformation, qui est le vrai sujet.
        marquer(item.meta.depuis, 'pv-depart');
        entourer(item.meta.depuis, 'pv-contour', { remplacer: true });
        dessinerRepere(t);

        container.querySelectorAll('.pv-case').forEach(el => {
            el.addEventListener('click', () => repondre(Number(el.dataset.piece)));
        });

        if (item.meta.montrer === 'toujours') regTimeout(() => animer(), 600);
    }

    const casesDe = (n) => (item.meta.pieces.find(p => p.n === n) || { cases: [] }).cases;

    /**
     * LE LISERÉ DE LA PIÈCE DE DÉPART SUIT SON CONTOUR, PAS SES CASES.
     *
     * Vu à l'écran : un `stroke` posé sur chaque `<rect>` dessine les QUATRE
     * côtés de chaque case, y compris celles qui sont à l'intérieur de la
     * pièce. La pièce de départ apparaissait quadrillée de bleu — elle avait
     * l'air découpée en morceaux, ce qui est exactement le contraire de ce
     * qu'on veut montrer : une pièce est UNE figure, qui se déplace d'un bloc.
     *
     * On retrace donc son seul CONTOUR, avec la même règle que les traits noirs
     * de la mosaïque : un côté n'est dessiné que s'il donne sur autre chose.
     */
    function entourer(n, classe, { remplacer = false } = {}) {
        const g = container.querySelector('[data-contour]');
        if (!g) return;
        const cases = casesDe(n);
        const dedans = new Set(cases.map(c => `${c.x},${c.y}`));
        let d = '';
        for (const c of cases) {
            const voisins = [
                ['haut', { x: c.x, y: c.y + 1 }], ['bas', { x: c.x, y: c.y - 1 }],
                ['gauche', { x: c.x - 1, y: c.y }], ['droite', { x: c.x + 1, y: c.y }]
            ];
            for (const [cote, v] of voisins) {
                if (dedans.has(`${v.x},${v.y}`)) continue;
                const [x1, y1, x2, y2] = cotesDe(c)[cote];
                d += `<line class="${classe}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
            }
        }
        if (remplacer) g.innerHTML = d; else g.insertAdjacentHTML('beforeend', d);
    }

    /** Retirer un contour posé plus tôt — la réponse fausse, au second essai. */
    function effacerContour(classe) {
        container.querySelectorAll(`[data-contour] .${classe}`).forEach(el => el.remove());
    }

    function marquer(n, classe) {
        container.querySelectorAll(`.pv-case[data-piece="${n}"]`)
            .forEach(el => el.classList.add(classe));
    }

    /**
     * L'AXE, LE CENTRE OU LA FLÈCHE, DESSINÉS PENDANT TOUTE LA QUESTION.
     *
     * Ce n'est pas une aide : c'est l'ÉNONCÉ. « La symétrie d'axe (GJ) » n'est
     * lisible que si l'on peut voir où passe (GJ) ; demander à l'élève de le
     * reconstituer de tête, c'est lui poser une deuxième question qu'on ne lui
     * a pas posée.
     */
    function dessinerRepere(t) {
        const g = container.querySelector('[data-repere]');
        if (!g) return;
        const b = boite();
        if (t.genre === 'axiale') {
            const a = t.axe.a;
            g.innerHTML = t.axe.type === 'v'
                ? `<line class="pv-axe" x1="${X(a)}" y1="${Y(b.y1)}" x2="${X(a)}" y2="${Y(b.y0)}"/>`
                : `<line class="pv-axe" x1="${X(b.x0)}" y1="${Y(a)}" x2="${X(b.x1)}" y2="${Y(a)}"/>`;
            return;
        }
        if (t.genre === 'centrale' || t.genre === 'rotation') {
            // LE CENTRE EST UN POINT, LUI AUSSI, et il suit donc la même
            // option que les sommets nommés — « croix, pixel ou rond selon
            // l'option », dit Rémy. Deux conventions dans une seule figure,
            // l'une pour les sommets et l'autre pour le centre, c'est une de
            // trop. Il reste rouge : c'est l'énoncé, pas le dessin.
            g.innerHTML = marqueurPoint(X(t.centre.x), Y(t.centre.y), 'pv-centre', 8);
            return;
        }
        if (t.genre === 'translation' && t.pointsVecteur) {
            const [p, q] = t.pointsVecteur;
            g.innerHTML = `<defs><marker id="pv-pointe" viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>
                <line class="pv-fleche" x1="${X(p.x)}" y1="${Y(p.y)}" x2="${X(q.x)}" y2="${Y(q.y)}"
                    marker-end="url(#pv-pointe)"/>`;
        }
    }

    // ── La réponse ──────────────────────────────────────────────────────────

    function repondre(n) {
        if (destroyed || repondu || session.locked) return;
        const juste = String(n) === String(item.answer);
        repondu = true;

        const result = session.submit(String(n), {
            element: container.querySelector(`.pv-case[data-piece="${n}"]`)
        });
        if (result.ignored) { repondu = false; return; }

        marquer(n, juste ? 'pv-juste' : 'pv-faux');
        entourer(n, juste ? 'pv-contour--ok' : 'pv-contour--ko');
        const statut = container.querySelector('[data-statut]');

        // ─────────────────────────────────────────────────────────────────────
        //
        // TROIS ISSUES, ET LA DEUXIÈME MANQUAIT — `tools/mosaique.mjs` l'a
        // trouvée : après une réponse fausse, l'élève restait BLOQUÉ. `repondu`
        // ne retombait jamais, et la question ne tournait pas non plus, puisque
        // `renderNext` n'est appelé que sur `correct || revealed`. L'exercice
        // s'arrêtait à la première erreur.
        //
        // ON NE MONTRE PAS LE TRAJET TANT QU'IL LUI RESTE UN ESSAI, et ce n'est
        // pas une précaution de confort : c'est la règle que `core/itemSession.js`
        // a déjà apprise à ses dépens — « ON NE DONNE PAS LA RÉPONSE TANT QU'IL
        // LUI RESTE UN ESSAI […] le deuxième essai n'était plus un essai,
        // c'était une recopie ». Un trajet joué au premier échec désigne la
        // pièce d'arrivée : le second essai se réduirait à la toucher.
        //
        // ─────────────────────────────────────────────────────────────────────
        if (juste) {
            if (statut) statut.textContent = 'Oui : c\'est bien là que la pièce tombe.';
        } else if (!result.done) {
            // Il lui reste un essai : on dit que ce n'est pas là, on efface la
            // marque, et on lui rend la main. Rien d'autre — surtout pas la
            // réponse.
            if (statut) {
                statut.textContent = `Ce n'est pas là. Reprends UN coin de la pièce ${item.meta.depuis}, `
                    + 'et cherche où il tombe.';
            }
            regTimeout(() => {
                if (destroyed || repondu === false) return;
                container.querySelectorAll('.pv-case.pv-faux')
                    .forEach(el => el.classList.remove('pv-faux'));
                effacerContour('pv-contour--ko');
                repondu = false;
            }, 900);
        } else {
            // Plus d'essai : c'est le moment de MONTRER, et c'est la demande de
            // Rémy — « si l'élève se trompe, lui compter faux mais aussi montrer
            // la transformation ».
            if (statut) {
                statut.textContent = `La pièce ${item.meta.depuis} se pose sur la pièce ${item.meta.vers}. `
                    + 'Regarde le trajet.';
            }
            if (item.meta.montrer !== 'jamais') animer();
        }

        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct || result.revealed) regTimeout(renderNext, juste ? 900 : 2600);
        });
    }

    // ── MONTRER ─────────────────────────────────────────────────────────────

    /**
     * LE FANTÔME QUI FAIT LE TRAJET.
     *
     * On ne peut pas animer la pièce elle-même : elle fait partie de la
     * mosaïque, et la retirer ouvrirait un trou blanc pendant le mouvement. On
     * clone donc ses cases dans une couche au-dessus, et c'est le clone qui
     * voyage.
     *
     * LE MOUVEMENT EST CELUI DE LA TRANSFORMATION, PAS UN GLISSEMENT POUR TOUT
     * LE MONDE. Faire glisser le fantôme en ligne droite d'un bout à l'autre
     * serait joli et MENTEUR : il dirait « translation » quelle que soit la
     * transformation, et un élève qui regarde une symétrie glisser en ligne
     * droite retient exactement le contraire de ce qu'on veut lui apprendre.
     *
     *   · translation  → il glisse (c'est bien ce qu'elle fait) ;
     *   · rotation     → il tourne autour du centre, d'un quart de tour ;
     *   · symétrie centrale → il tourne d'un demi-tour autour du centre ;
     *   · symétrie axiale   → il se RETOURNE : on l'écrase jusqu'à l'axe, puis
     *     on le rouvre de l'autre côté. C'est le seul mouvement qui montre
     *     qu'un reflet n'est pas une rotation, et c'est précisément la confusion
     *     la plus fréquente entre les deux.
     */
    function animer() {
        const vol = container.querySelector('[data-vol]');
        if (!vol) return;
        const t = item.meta.transfo;
        const cases = casesDe(item.meta.depuis);
        if (!cases.length) return;

        const carres = cases.map(c =>
            `<rect x="${X(c.x - 0.5)}" y="${Y(c.y + 0.5)}" width="${COTE}" height="${COTE}"/>`).join('');
        vol.innerHTML = `<g class="pv-fantome" data-fantome>${carres}</g>`;
        const g = vol.querySelector('[data-fantome]');
        if (!g) return;

        // L'arrivée s'allume dès le départ : l'œil sait où regarder.
        marquer(item.meta.vers, 'pv-arrivee');
        entourer(item.meta.vers, 'pv-contour--arrivee');

        const etapes = trajet(t, cases);
        let i = 0;
        const avancer = () => {
            if (destroyed || !g.isConnected) return;
            if (i >= etapes.length) {
                g.classList.add('pv-fantome--pose');
                regTimeout(() => { if (g.isConnected) g.remove(); }, 700);
                return;
            }
            g.setAttribute('transform', etapes[i].transform);
            i++;
            regTimeout(avancer, etapes[i - 1].duree);
        };
        regTimeout(avancer, 120);
    }

    /**
     * LES ÉTAPES DU TRAJET, en transformations SVG.
     *
     * On découpe en petits pas plutôt que de confier le mouvement à une
     * transition CSS : une transition entre deux `transform` interpole les
     * MATRICES, ce qui pour un demi-tour donne un écrasement au lieu d'une
     * rotation — le fantôme s'aplatit, traverse, et se rouvre. C'est joli et
     * c'est faux.
     */
    function trajet(t, cases) {
        const pas = [];
        const N = 16;
        const duree = Math.max(40, Math.round(DEMO_SPEED.move / N));

        if (t.genre === 'translation') {
            const dx = t.vecteur.x * COTE, dy = -t.vecteur.y * COTE;
            for (let k = 1; k <= N; k++) {
                pas.push({ transform: `translate(${dx * k / N} ${dy * k / N})`, duree });
            }
            return pas;
        }
        if (t.genre === 'rotation' || t.genre === 'centrale') {
            const cx = X(t.centre.x), cy = Y(t.centre.y);
            // Dans le repère de l'ÉCRAN, l'ordonnée descend : un quart de tour
            // de sens direct y tourne donc dans l'autre sens. Le signe vient de
            // là, et pas d'un tâtonnement.
            const quarts = t.genre === 'centrale' ? 2 : (((t.quarts % 4) + 4) % 4);
            const angle = -quarts * 90;
            const n = quarts === 2 ? N * 2 : N;
            for (let k = 1; k <= n; k++) {
                pas.push({ transform: `rotate(${angle * k / n} ${cx} ${cy})`, duree });
            }
            return pas;
        }
        if (t.genre === 'axiale') {
            const vertical = t.axe.type === 'v';
            const a = vertical ? X(t.axe.a) : Y(t.axe.a);
            for (let k = 1; k <= N; k++) {
                // De 1 à −1 : la pièce s'écrase sur l'axe, puis se rouvre de
                // l'autre côté. C'est le geste d'un reflet.
                const f = 1 - 2 * k / N;
                pas.push({
                    transform: vertical
                        ? `translate(${a} 0) scale(${f} 1) translate(${-a} 0)`
                        : `translate(0 ${a}) scale(1 ${f}) translate(0 ${-a})`,
                    duree
                });
            }
            return pas;
        }
        // Un genre qu'on ne connaît pas : on pose le fantôme à l'arrivée
        // plutôt que de ne rien montrer du tout.
        const image = cases.map(c => appliquer(c, t));
        const d = { x: X(image[0].x) - X(cases[0].x), y: Y(image[0].y) - Y(cases[0].y) };
        return [{ transform: `translate(${d.x} ${d.y})`, duree: 400 }];
    }

    // ── La démonstration du robot ───────────────────────────────────────────

    async function lancerDemo() {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const robot = meneurDemo(cursor, gate, () => !destroyed, null, { rangementSeul: true });
        const svg = container.querySelector('.pv-svg');

        if (!await robot.tour()) return;
        cursor.say(`On me donne une pièce — la ${item.meta.depuis} — et une transformation.`,
            container.querySelector(`.pv-case[data-piece="${item.meta.depuis}"]`));
        if (!await robot.pause(DEMO_SPEED.between)) return;

        if (!await robot.tour()) return;
        cursor.say('Je ne suis pas la pièce entière : je choisis UN coin, et je cherche où il tombe.', svg);
        if (!await robot.pause(DEMO_SPEED.between)) return;

        if (!await robot.tour()) return;
        cursor.say(`Voilà le trajet de ${direTransformation(item.meta.transfo)}.`, svg);
        animer();
        if (!await robot.pause(DEMO_SPEED.between + 1800)) return;

        if (!await robot.tour()) return;
        const el = container.querySelector(`.pv-case[data-piece="${item.meta.vers}"]`);
        cursor.say(`Elle se pose sur la pièce ${item.meta.vers} : c'est la réponse.`, el);
        if (el && !await robot.toucher(el)) return;
        if (!await robot.pause(DEMO_SPEED.settle)) return;
        robot.fin();
    }

    renderNext();
    if (opts.demo) regTimeout(lancerDemo, 400);

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
