// Activité « Les Pentaminos » — on prend une pièce et on la pose.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 29 octobre : « les penamios, ca me va ». La maquette montrait quatre
// pièces dans un 4 × 5, un bac en bas, et quatre boutons — Tourner, Retourner,
// Aide, Tout sortir. C'est ce qui est construit ici.
//
// ── LE GLISSER, ÉCRIT UNE QUATRIÈME FOIS, ET LES TROIS LEÇONS TIENNENT ─────
//
// Ce dépôt a payé trois fois le même ensemble de pièges — la Grille de
// Nombres, les allumettes, La Traversée. On les referme ici d'un coup, et
// c'est pour cela qu'il n'y a AUCUN `onclick` dans ce fichier :
//
//   · LES ÉCOUTEURS VIVENT SUR LA RACINE, qui survit aux repeints. Posés sur
//     les pièces, ils disparaîtraient au premier redessin, en plein geste.
//   · ON NE CAPTURE LE POINTEUR QU'AU PREMIER MOUVEMENT. `setPointerCapture`
//     dès l'appui fait livrer le `click` qui suit à la racine au lieu de la
//     pièce, et le simple toucher cesse de marcher sans erreur ni trace.
//   · LE TOUCHER EST TRAITÉ DANS `pointerup`, PAS DANS UN `click`. C'est la
//     façon la plus simple de ne jamais avoir à avaler le clic fantôme qu'un
//     doigt laisse derrière lui — il n'y a pas de clic à avaler.
//
// ── CE QU'UNE PIÈCE POSÉE DOIT GARDER ──────────────────────────────────────
//
// Son ORIENTATION. Une pièce qu'on reprend du plateau et qu'on repose à côté
// doit rester tournée comme elle était : sinon l'élève, qui l'avait mise
// d'équerre, recommence son travail à chaque essai.
//
// ── UN PLAN DE TRAVAIL, PAS UN BAC ET UN PLATEAU ──────────────────────────
//
// RÉMY, 30 octobre : « en fait je voyais vraiment des pièces libres qui
// peuvent aller n'importe tout mais qui reste magnétique sur la grille à
// remplir ».
//
// Il n'y a donc plus deux endroits — un bac en bas, un plateau en haut — mais
// UNE TABLE avec un cadre dessus. Une pièce y vit où on la laisse : à côté du
// cadre, dessous, en attente. Et dès qu'on l'amène sur la grille, elle
// S'AIMANTE : on arrondit sa position au quart de case près, et si la pose
// tient, elle claque dans les cases.
//
// L'AIMANT DISPENSE DE VISER. On lisait la case sous le DOIGT ; on lit
// maintenant le coin haut-gauche de la PIÈCE, arrondi à la case la plus
// proche. Une pièce à moitié hors du cadre entre donc toute seule, et il n'y a
// plus de différence entre « poser » et « poser juste ».
//
// ET LE RECTANGLE SE VÉRIFIE EXACTEMENT PAREIL. J'avais mis Rémy en garde —
// « le rectangle ne peut alors plus se vérifier tout seul » —, et c'était faux :
// une pièce aimantée est posée sur des cases comme avant, une pièce laissée
// dehors n'est simplement pas comptée. La mise en garde a coûté un aller-retour.

/** La colonne des deux commandes, à droite d'une pièce, en cases. */
const PLACE_CMD = 1.4;

/** La marge que les pièces gardent avec le bord de la table, en cases. */
const BORD = 0.3;

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import {
    FORMES, TEINTES, couvertes, estFini, orientations, posees, poseTient, resoudre
} from '../pentaminos.js';

/** En deçà de ce déplacement, le geste reste un simple toucher. */
const SEUIL = 8;

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** Pour chaque pièce : son orientation courante et, si elle est posée, où. */
    let etats = new Map();
    let choisie = null, fini = false;
    /** Le geste en cours. */
    let prise = null, depart = null, aGlisse = false, fantome = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    /**
     * TOUTES LES PIÈCES REVIENNENT SUR LA TABLE, dans leur orientation d'origine.
     *
     * `x, y` sont les cases de la GRILLE quand la pièce y est aimantée ;
     * `px, py` sa place LIBRE sur le plan, en cases elle aussi — et non en
     * pixels, pour qu'un changement de largeur d'écran ne déplace rien : la
     * case est l'unité du jeu, le pixel n'est que son rendu du moment.
     */
    function remettre() {
        etats = new Map(item.meta.pieces.map(id => [id, {
            vues: orientations(FORMES[id]), vue: 0,
            x: null, y: null, px: 0, py: 0, departX: 0, departY: 0
        }]));
        choisie = null;
        fini = false;
    }

    const formeDe = (id) => {
        const e = etats.get(id);
        return e.vues[e.vue % e.vues.length];
    };
    const posePiece = (id) => {
        const e = etats.get(id);
        return e.x === null ? null : { id, x: e.x, y: e.y, cells: formeDe(id) };
    };
    const toutesLesPoses = () => item.meta.pieces.map(posePiece).filter(Boolean);

    /**
     * LES REPÈRES DU PLAN, MESURÉS SUR L'ÉCRAN.
     *
     * Tout le placement en dépend, et l'on ne REFAIT PAS le calcul de mise en
     * page : la grille est centrée par le CSS, et redire ici où le CSS la met
     * ferait deux vérités pour une seule position — celle qui se décale le jour
     * où l'on touche à une marge.
     *
     * Rend tout en CASES : où commence la grille dans le plan, et la taille du
     * plan. Null tant que rien n'est dessiné.
     */
    function reperes() {
        const plan = container.querySelector('[data-plan]');
        const grille = container.querySelector('[data-grille]');
        const uneCase = container.querySelector('.pn-vide');
        if (!plan || !grille || !uneCase) return null;
        const u = uneCase.getBoundingClientRect().width;
        if (!u) return null;
        const rp = plan.getBoundingClientRect();
        const rg = grille.getBoundingClientRect();
        return {
            u, gauche: rp.left, haut: rp.top,
            gx: (rg.left - rp.left) / u, gy: (rg.top - rp.top) / u,
            large: rp.width / u, haute: rp.height / u
        };
    }

    /** La largeur et la hauteur d'une pièce, en cases, dans son orientation. */
    function taille(id) {
        const f = formeDe(id);
        return {
            l: Math.max(...f.map(c => c[0])) + 1,
            h: Math.max(...f.map(c => c[1])) + 1
        };
    }

    /**
     * UNE PIÈCE LIBRE RESTE SUR LA TABLE.
     *
     * On réserve la colonne des commandes à droite : sans elle, une pièce
     * choisie contre le bord droit pousserait ses deux pastilles hors du plan,
     * et la page prendrait une barre de défilement horizontale — ce que la
     * sonde mesure, et ce que personne ne veut sur une tablette.
     */
    function caler(e, id, r) {
        const t = taille(id);
        e.px = Math.max(BORD, Math.min(e.px, r.large - t.l - PLACE_CMD - BORD));
        e.py = Math.max(BORD, Math.min(e.py, r.haute - t.h - BORD));
    }

    /**
     * OÙ LES PIÈCES ATTENDENT AU DÉBUT : sous le cadre, de gauche à droite,
     * en revenant à la ligne. C'est le seul endroit où l'on range à la place de
     * l'élève — après, c'est lui qui décide.
     *
     * On en profite pour donner au plan la hauteur de ce qu'il contient : un
     * plan trop court couperait la dernière rangée, un plan trop haut mettrait
     * les boutons hors de l'écran.
     */
    function placerAuDepart() {
        let r = reperes();
        if (!r) return;
        // ── ON RANGE D'ABORD À CÔTÉ DU CADRE, ENSUITE DESSOUS ──────────────
        //
        // Tout mettre en dessous faisait une table de seize cases de haut pour
        // une grille de cinq, et il fallait alors rapetisser les cases jusqu'à
        // 20 px pour que l'écran d'un téléphone l'accepte. Les deux bandes qui
        // longent le cadre étaient vides pendant ce temps-là.
        //
        // Trois zones, dans cet ordre : à droite du cadre, à gauche, puis la
        // pleine largeur en dessous pour ce qui n'entre nulle part. Chacune
        // range de gauche à droite et revient à la ligne quand elle est pleine.
        const ranger = (r) => {
            const L = item.meta.largeur, H = item.meta.hauteur;
            const basDuCadre = r.gy + H;
            const zones = [
                { x0: r.gx + L + 0.5, x1: r.large - BORD, y0: r.gy, yMax: basDuCadre },
                { x0: BORD, x1: Math.max(BORD, r.gx - 0.5), y0: r.gy, yMax: basDuCadre },
                { x0: BORD, x1: r.large - BORD, y0: basDuCadre + 0.8, yMax: Infinity }
            ].map(z => ({ ...z, x: z.x0, y: z.y0, ligne: 0 }));
            let bas = basDuCadre;
            for (const id of item.meta.pieces) {
                const t = taille(id);
                const besoin = t.l + PLACE_CMD;
                const e = etats.get(id);
                for (const z of zones) {
                    if (besoin > z.x1 - z.x0) continue;
                    if (z.x > z.x0 && z.x + besoin > z.x1) {
                        z.x = z.x0; z.y += z.ligne + 0.5; z.ligne = 0;
                    }
                    if (z.y + t.h > z.yMax) continue;
                    e.px = z.x; e.py = z.y;
                    e.departX = z.x; e.departY = z.y;
                    z.x += besoin + 0.4;
                    z.ligne = Math.max(z.ligne, t.h);
                    bas = Math.max(bas, z.y + t.h);
                    break;
                }
            }
            return Math.ceil(bas + 0.6);
        };
        let ph = ranger(r);

        // ── LA TABLE DOIT TENIR DANS L'ÉCRAN ───────────────────────────────
        //
        // MESURÉ sur un téléphone de 390 × 844 : au niveau 3 — six pièces, une
        // grille de 5 × 6 — le plan faisait 852 px à lui seul. La page ne
        // défilait pas pour autant : elle COUPAIT. Deux pièces se trouvaient
        // donc hors d'atteinte, et rien ne le disait.
        //
        // ON CHERCHE LA PLUS GRANDE CASE QUI TIENNE, et c'est tout le sujet :
        // rapetissir d'un coup au rapport qui manque donnait une table trop
        // petite, parce que le rangement CHANGE avec la taille de la case. À
        // 37 px, les bandes qui longent le cadre sont trop étroites pour une
        // pièce et tout descend dessous ; à 23 px elles s'ouvrent, la table
        // tient en deux fois moins de haut — et l'on aurait pu garder 30.
        //
        // ON SIMULE AU LIEU DE TÂTONNER À L'ÉCRAN. Les trois repères dont le
        // rangement a besoin se calculent : la largeur du plan ne dépend pas de
        // la case, le cadre est centré, et son décalage vertical est fixe en
        // pixels. Vingt-huit essais ne coûtent donc rien, là où vingt-huit
        // mesures auraient forcé autant de recalculs de mise en page.
        const plan = container.querySelector('[data-plan]');
        const layout = container.querySelector('.pn-layout');
        if (plan && layout) {
            const rl = layout.getBoundingClientRect();
            const rp = plan.getBoundingClientRect();
            const dispo = window.innerHeight - rp.top - (rl.bottom - rp.bottom) - 8;
            const L = item.meta.largeur;
            const W = r.large * r.u;        // la table, en pixels : fixe
            const dyCadre = r.gy * r.u;     // le cadre commence là : fixe aussi
            if (dispo > 0 && ph * r.u > dispo) {
                let choisi = null;
                for (let u = Math.floor(r.u) - 1; u >= 20 && !choisi; u--) {
                    const rr = { ...r, u, large: W / u, gx: (W / u - L) / 2, gy: dyCadre / u };
                    const essai = ranger(rr);
                    if (essai * u <= dispo) choisi = { u, rr, ph: essai };
                }
                if (!choisi) {
                    const u = 20;
                    const rr = { ...r, u, large: W / u, gx: (W / u - L) / 2, gy: dyCadre / u };
                    choisi = { u, rr, ph: ranger(rr) };
                }
                layout.style.setProperty('--pn-u', `${choisi.u}px`);
                // Et l'on range une dernière fois sur les repères VRAIS : la
                // simulation sert à choisir, pas à placer.
                const neuf = reperes();
                ph = neuf ? ranger(neuf) : choisi.ph;
            }
            plan.style.setProperty('--pn-ph', String(ph));
        }
    }

    function render(prochain) {
        item = prochain;
        prise = null; depart = null; aGlisse = false;
        cacherFantome();
        remettre();

        const { largeur, hauteur } = item.meta;
        container.innerHTML = `
            <div class="pn-layout">
                <div class="pn-context">${item.prompt.html}</div>
                <div class="pn-plan" data-plan>
                    <div class="pn-plateau" data-plateau
                         style="--pn-l:${largeur};--pn-h:${hauteur}">
                        <div class="pn-grille" data-grille></div>
                    </div>
                    <!-- TOUTES LES PIÈCES VIVENT DANS LA MÊME COUCHE, aimantées
                         ou libres : deux couches, c'était deux endroits où
                         une pièce pouvait être, et le glisser devait savoir
                         de laquelle il la sortait. -->
                    <div class="pn-pieces" data-pieces></div>
                </div>
                <!-- UNE SEULE LIGNE POUR LES DEUX RENSEIGNEMENTS. Elles en
                     faisaient deux, et sur un téléphone chaque ligne est prise
                     à la table : mesuré, le plan n'avait que 336 px de haut au
                     niveau 3, et il fallait rapetisser les cases jusqu'au
                     plancher pour y tenir. -->
                <div class="pn-aire">${largeur} × ${hauteur} = ${largeur * hauteur} cases,
                    donc ${item.meta.combien} pièces<span class="pn-rappel"
                    data-rappel> · touche une pièce pour la tourner</span></div>
                <div class="pn-outils">
                    <button type="button" class="pn-outil" data-outil="aide">
                        <span aria-hidden="true">💡</span>Aide</button>
                    <button type="button" class="pn-outil" data-outil="vider">
                        <span aria-hidden="true">↺</span>Tout sortir</button>
                </div>
                <div class="pn-statut" role="status" aria-live="polite"></div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        brancherOutils();
        brancherGeste();
        // DANS CET ORDRE : la grille doit exister pour qu'on puisse la MESURER,
        // et c'est sa position mesurée qui dit où les pièces attendent.
        peindre();
        placerAuDepart();
        peindre();
    }

    // ───────────────────────────────────────────────────────── dessiner ────

    /** Une pièce, en cases absolues dans sa propre boîte. */
    function pieceHtml(id, ou) {
        const cells = formeDe(id);
        const w = Math.max(...cells.map(c => c[0])) + 1;
        const h = Math.max(...cells.map(c => c[1])) + 1;
        const dedans = (x, y) => cells.some(c => c[0] === x && c[1] === y);
        const cases = cells.map(([x, y]) => {
            // LE BISEAU SUIT LA SILHOUETTE, pas chaque case : posé sur toutes,
            // il découpe un carré en bandes et la pièce ne se lit plus comme
            // UNE pièce. Vu sur la maquette, corrigé avant de l'envoyer.
            const bords = [
                !dedans(x, y - 1) ? 'pn-h' : '', !dedans(x, y + 1) ? 'pn-b' : '',
                !dedans(x - 1, y) ? 'pn-g' : '', !dedans(x + 1, y) ? 'pn-d' : ''
            ].filter(Boolean).join(' ');
            return `<span class="pn-case ${bords}" data-cx="${x}" data-cy="${y}"
                style="left:calc(${x} * var(--pn-u));top:calc(${y} * var(--pn-u))"></span>`;
        }).join('');
        // LES DEUX COMMANDES SONT SUR LA PIÈCE, pas dans une barre au bas de
        // l'écran. Rémy, 30 octobre : « il faut les icones sur les figures ».
        // Une barre éloignée oblige à quitter la pièce des yeux, à viser un
        // bouton, puis à revenir : trois gestes pour en faire un.
        //
        // ELLES SE POSENT À DROITE DE LA PIÈCE, en colonne, et JAMAIS dessus :
        // un bouton posé au milieu d'un pentamino tombe sur une case creuse
        // dès que la pièce est un L ou un U, et l'on ne sait plus ce qu'on
        // touche. Rien ne rogne ce qui dépasse du plateau — vérifié dans le
        // CSS avant de les y mettre.
        const cmds = (choisie === id && !fini && !session.locked)
            ? `<span class="pn-cmds">
                <button type="button" class="pn-cmd btn-carre" data-cmd="tourner"
                    title="Tourner" aria-label="tourner la pièce ${id}">↻</button>
                <button type="button" class="pn-cmd btn-carre" data-cmd="retourner"
                    title="Retourner" aria-label="retourner la pièce ${id}">⇄</button>
               </span>`
            : '';
        return `<div class="pn-piece${choisie === id ? ' pn-piece--choisie' : ''}"
            data-piece="${id}" data-ou="${ou}" role="button" tabindex="0"
            aria-label="pièce ${id}"
            style="--pn-c:${TEINTES[id]};width:calc(${w} * var(--pn-u));
                   height:calc(${h} * var(--pn-u))">${cases}${cmds}</div>`;
    }

    function peindre() {
        const { largeur, hauteur } = item.meta;

        const grille = container.querySelector('[data-grille]');
        if (grille) {
            grille.innerHTML = Array.from({ length: largeur * hauteur }, (_, k) =>
                `<span class="pn-vide" data-gx="${k % largeur}" data-gy="${
                    Math.floor(k / largeur)}"></span>`).join('');
        }

        // UNE SEULE BOUCLE POUR TOUTES LES PIÈCES, aimantées ou non : la seule
        // différence est l'origine du calcul — le coin de la grille pour une
        // pièce posée, le coin du plan pour une pièce libre.
        const zone = container.querySelector('[data-pieces]');
        const r = reperes();
        if (zone && r) {
            zone.innerHTML = item.meta.pieces.map(id => {
                const e = etats.get(id);
                const posee = e.x !== null;
                const x = posee ? r.gx + e.x : e.px;
                const y = posee ? r.gy + e.y : e.py;
                return `<div class="${posee ? 'pn-pose' : 'pn-libre'}"
                    style="left:calc(${x} * var(--pn-u));top:calc(${y} * var(--pn-u))"
                    >${pieceHtml(id, posee ? 'plateau' : 'plan')}</div>`;
            }).join('');
        }

        const combien = couvertes(toutesLesPoses()).size;
        const st = container.querySelector('.pn-statut');
        if (st && !fini) {
            st.textContent = `${combien} cases sur ${largeur * hauteur} couvertes.`;
        }
        container.querySelectorAll('[data-outil]').forEach(b => {
            b.disabled = fini || session.locked;
        });
        // Sans pièce choisie, aucune commande n'est à l'écran : on dit où les
        // trouver plutôt que de laisser l'élève chercher un bouton absent.
        const rappel = container.querySelector('[data-rappel]');
        if (rappel) rappel.hidden = !!choisie || fini || session.locked;
    }

    // ────────────────────────────────────────────────────────── le geste ────

    /**
     * OÙ LA PIÈCE TOMBERAIT SI ON LÂCHAIT MAINTENANT — l'aimant.
     *
     * ON NE LIT PLUS LA CASE SOUS LE DOIGT. C'était `elementFromPoint`, et cela
     * voulait dire : pour poser, il faut viser une case avec le point précis
     * par lequel on a pris la pièce. Un pentamino en L pris par son angle
     * creux ne pouvait tout simplement pas se poser — le doigt était sur du
     * vide.
     *
     * On lit maintenant le COIN HAUT-GAUCHE de la pièce, qu'on ramène à la case
     * la plus proche. Une pièce à moitié hors du cadre entre donc toute seule :
     * c'est l'aimant que Rémy décrit, et c'est aussi ce qui rend le geste
     * possible à une main sur une tablette.
     *
     * Rend des cases de GRILLE, qui peuvent être négatives ou hors du cadre —
     * `poseTient` tranche ensuite.
     */
    function caseAimantee(p, cx, cy, r) {
        // ON REÇOIT LA PRISE, ON NE LA CHERCHE PAS. `lacher` met `prise` à null
        // AVANT d'appeler `deposer` — pour qu'un second `pointerup` ne repose
        // pas la même pièce —, si bien qu'une fonction qui lisait la variable
        // rendait null au seul moment qui compte : le lâcher. Mesuré : plus
        // aucune pièce ne se posait, nulle part, sans une erreur de page.
        if (!p || !r) return null;
        const px = (cx - p.dx - r.gauche) / r.u;
        const py = (cy - p.dy - r.haut) / r.u;
        return { x: Math.round(px - r.gx), y: Math.round(py - r.gy), px, py };
    }

    function brancherGeste() {
        const racine = container.querySelector('.pn-layout');
        if (!racine) return;

        racine.addEventListener('pointerdown', (e) => {
            if (fini || destroyed || session.locked) return;
            // LES COMMANDES SONT DANS LA PIÈCE, donc le doigt qui les touche
            // touche aussi la pièce. Sans cette ligne, appuyer sur « tourner »
            // arme un glisser, et la pièce part avec le doigt.
            if (e.target.closest && e.target.closest('[data-cmd]')) return;
            const el = e.target.closest ? e.target.closest('[data-piece]') : null;
            if (!el || !racine.contains(el)) return;
            const sous = e.target.closest ? e.target.closest('[data-cx]') : null;
            // OÙ L'ON A PRIS LA PIÈCE, en pixels dans sa propre boîte. C'est ce
            // qui l'empêche de SAUTER : le fantôme était centré sous le doigt,
            // si bien que prendre le bout d'un I la décalait de deux cases, et
            // le dessin ne montrait plus où elle allait tomber — la visée
            // bleue, elle, tenait déjà compte de la case saisie. Les deux se
            // contredisaient. Rémy : « j'aimerai que la pièce bouge librement
            // sur l'espace ».
            const r = el.getBoundingClientRect();
            prise = {
                id: el.dataset.piece, ou: el.dataset.ou,
                ax: sous ? Number(sous.dataset.cx) : 0,
                ay: sous ? Number(sous.dataset.cy) : 0,
                dx: e.clientX - r.left, dy: e.clientY - r.top,
                el
            };
            depart = { x: e.clientX, y: e.clientY };
            aGlisse = false;
        });

        racine.addEventListener('pointermove', (e) => {
            if (!prise || !depart || destroyed) return;
            if (!aGlisse && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) < SEUIL) return;
            if (!aGlisse) {
                aGlisse = true;
                try { racine.setPointerCapture(e.pointerId); } catch (err) { /* souris */ }
                montrerFantome(prise.el);
                // La pièce quitte le plateau dès qu'on la soulève : sans cela
                // elle se gênerait elle-même au moment de se reposer.
                if (prise.ou === 'plateau') {
                    const et = etats.get(prise.id);
                    et.x = null; et.y = null;
                    peindre();
                }
            }
            poserFantome(e.clientX, e.clientY);
            viser(e.clientX, e.clientY);
        });

        const lacher = (e) => {
            if (!prise) return;
            const p = prise, glisse = aGlisse;
            prise = null; depart = null; aGlisse = false;
            cacherFantome();
            effacerLaVisee();
            if (!glisse) { toucher(p); return; }
            try { racine.releasePointerCapture(e.pointerId); } catch (err) { /* souris */ }
            deposer(p, e.clientX, e.clientY);
        };
        racine.addEventListener('pointerup', lacher);
        racine.addEventListener('pointercancel', () => {
            prise = null; depart = null; aGlisse = false; cacherFantome(); peindre();
        });
    }

    /**
     * UN SIMPLE TOUCHER CHOISIT LA PIÈCE, et ne fait rien d'autre.
     *
     * Il la RENVOYAIT AU BAC quand elle était posée — ce qui avait un sens tant
     * qu'il y avait un bac, et plus aucun maintenant : toucher une pièce pour
     * voir ses commandes la faisait sauter à l'autre bout de l'écran. Sur un
     * plan de travail, on prend une pièce en la glissant, pas en la touchant.
     */
    function toucher(p) {
        choisie = p.id;
        peindre();
    }

    /**
     * LÂCHER : la pièce s'aimante si elle tient, et reste où elle est sinon.
     *
     * C'EST TOUTE LA DEMANDE DE RÉMY. Avant, une pièce lâchée hors du cadre
     * retournait au bac : on ne pouvait rien poser à côté, rien mettre de côté,
     * rien essayer. Maintenant elle reste sous la main, et le cadre l'attire
     * dès qu'elle l'atteint.
     */
    function deposer(p, cx, cy) {
        const e = etats.get(p.id);
        choisie = p.id;
        const r = reperes();
        const ou = caseAimantee(p, cx, cy, r);
        if (!r || !ou) { peindre(); return; }
        const autres = couvertes(item.meta.pieces
            .filter(id => id !== p.id).map(posePiece).filter(Boolean));
        if (poseTient(formeDe(p.id), ou.x, ou.y,
            item.meta.largeur, item.meta.hauteur, autres)) {
            e.x = ou.x; e.y = ou.y;
        } else {
            e.x = null; e.y = null;
            e.px = ou.px; e.py = ou.py;
            caler(e, p.id, r);
        }
        peindre();
        verifier();
    }

    /**
     * ON EFFACE LES DEUX MARQUES, PAS UNE SEULE.
     *
     * C'ÉTAIT LA TRACE. Rémy, 30 octobre : « il laisse des traces sur le
     * plateau ». On n'enlevait que `pn-visee` ; or `pn-visee--non` est stylée
     * TOUTE SEULE dans le CSS — fond rose, bord rouge — et n'a donc pas besoin
     * de sa sœur pour se voir. Chaque position refusée laissait sa marque, et
     * elles s'accumulaient : mesuré, DOUZE cases sur vingt restaient rouges
     * derrière la pièce qu'on promenait, photo à l'appui.
     *
     * Ni la sonde ni les épreuves ne l'avaient vu, parce qu'au lâcher le
     * plateau se repeint et que tout disparaît : elles ne regardaient que
     * l'état d'arrivée. Une marque qui ne vit que pendant le geste ne se
     * mesure QUE pendant le geste.
     */
    function effacerLaVisee() {
        container.querySelectorAll('.pn-visee, .pn-visee--non').forEach(x =>
            x.classList.remove('pn-visee', 'pn-visee--non'));
    }

    /** Pendant qu'on tient une pièce, on montre où elle tomberait. */
    function viser(cx, cy) {
        effacerLaVisee();
        const r = reperes();
        const ou = caseAimantee(prise, cx, cy, r);
        if (!ou || !prise) return;
        const x = ou.x, y = ou.y;
        const autres = couvertes(item.meta.pieces
            .filter(id => id !== prise.id).map(posePiece).filter(Boolean));
        const tient = poseTient(formeDe(prise.id), x, y,
            item.meta.largeur, item.meta.hauteur, autres);
        // UNE SEULE CLASSE POSÉE DIRECTEMENT, bleue ou rouge. L'écriture d'avant
        // ajoutait `pn-visee` dans les deux branches d'un ternaire — donc
        // toujours la même — puis repassait pour ajouter le rouge par-dessus.
        // Deux passes pour une décision, et c'est la seconde qui a fait les
        // traces : le nettoyage, lui, n'en connaissait qu'une.
        for (const [a, b] of posees(formeDe(prise.id), x, y)) {
            const el = container.querySelector(`[data-gx="${a}"][data-gy="${b}"]`);
            if (el) el.classList.add(tient ? 'pn-visee' : 'pn-visee--non');
        }
    }

    function montrerFantome(el) {
        cacherFantome();
        fantome = el.cloneNode(true);
        fantome.classList.add('pn-fantome');
        fantome.classList.remove('pn-piece--choisie');
        fantome.removeAttribute('data-piece');
        // Le clone emporterait les deux commandes avec lui : deux boutons qui
        // volent sous le doigt, qu'on ne peut pas toucher et qui cachent la
        // pièce qu'on est en train de placer.
        fantome.querySelectorAll('[data-cmd]').forEach(b => b.remove());
        const r = el.getBoundingClientRect();
        fantome.style.width = `${r.width}px`;
        fantome.style.height = `${r.height}px`;
        document.body.appendChild(fantome);
    }
    /**
     * LE FANTÔME SUIT LE DOIGT DEPUIS L'ENDROIT OÙ ON A PRIS LA PIÈCE.
     *
     * Il se posait centré sous le doigt — `translate(-50%, -50%)` dans le CSS
     * —, si bien qu'un I pris par le bout faisait un bond de deux cases à
     * l'instant où il se soulevait. Pire : la visée bleue, elle, tenait déjà
     * compte de la case saisie, donc le dessin et la case visée se
     * contredisaient. On retire le décalage du CSS et on le fait ici, avec
     * l'écart mesuré au `pointerdown`.
     */
    function poserFantome(x, y) {
        if (!fantome || !prise) return;
        fantome.style.left = `${x - prise.dx}px`;
        fantome.style.top = `${y - prise.dy}px`;
    }
    function cacherFantome() {
        if (fantome) { fantome.remove(); fantome = null; }
        document.querySelectorAll('.pn-fantome').forEach(f => f.remove());
    }

    // ───────────────────────────────────────────────────────── les outils ────

    function brancherOutils() {
        container.querySelectorAll('[data-outil]').forEach(b => {
            b.onclick = () => {
                if (fini || session.locked) return;
                const quoi = b.dataset.outil;
                if (quoi === 'vider') {
                    // ELLES REVIENNENT À LEUR PLACE DE DÉPART, et non à zéro :
                    // sur un plan de travail, « tout sortir » doit rendre la
                    // table telle qu'on l'a trouvée, pas empiler quatre pièces
                    // dans un coin.
                    for (const id of item.meta.pieces) {
                        const e = etats.get(id);
                        e.x = null; e.y = null;
                        e.px = e.departX; e.py = e.departY;
                    }
                    choisie = null; peindre(); return;
                }
                if (quoi === 'aide') { aider(); return; }
            };
        });

        // LES DEUX COMMANDES DE LA PIÈCE SE BRANCHENT PAR DÉLÉGATION, sur la
        // racine qui survit : elles sont redessinées à chaque `peindre()`, donc
        // un écouteur posé sur le bouton lui-même mourrait au premier geste.
        // C'est la règle que ce dépôt a payée cinq fois pour le glisser.
        const racine = container.querySelector('.pn-layout');
        if (racine) {
            racine.addEventListener('click', (e) => {
                const b = e.target.closest ? e.target.closest('[data-cmd]') : null;
                if (!b || fini || session.locked || !choisie) return;
                tournerLaChoisie(b.dataset.cmd === 'retourner');
            });
        }
    }

    /**
     * TOURNER OU RETOURNER LA PIÈCE CHOISIE — elle, et elle seule.
     *
     * RÉMY, 30 octobre : « quand on clique sur un bouton ca ne tourne inverse
     * que la pièce qu'on manipule ». C'est le cas depuis que les deux commandes
     * sont portées par la pièce choisie, et une épreuve le garde.
     *
     * UNE PIÈCE POSÉE QUI NE TIENT PLUS TOURNÉE SORT DU CADRE au lieu de
     * refuser de tourner. Le refus était cohérent avec un bac — on ne la
     * renvoyait pas en douce —, il ne l'est plus avec un plan de travail : le
     * bouton doit TOUJOURS agir, et la pièce reste là où elle était, à la main
     * de l'élève, simplement détachée de la grille.
     *
     * Le X ne tourne jamais, le I n'a que deux orientations : « Tourner » sans
     * effet n'est pas une panne, c'est la SYMÉTRIE de la pièce, et c'est une
     * chose à voir.
     */
    function tournerLaChoisie(miroir) {
        const e = etats.get(choisie);
        const avant = e.vue;
        // Les orientations sont rangées en deux moitiés : les quatre rotations,
        // puis les quatre du miroir. « Retourner » saute d'une moitié à l'autre.
        const n = e.vues.length;
        e.vue = miroir ? (e.vue + Math.max(1, Math.floor(n / 2))) % n : (e.vue + 1) % n;
        const r = reperes();
        if (e.x !== null) {
            const autres = couvertes(item.meta.pieces
                .filter(id => id !== choisie).map(posePiece).filter(Boolean));
            if (!poseTient(formeDe(choisie), e.x, e.y,
                item.meta.largeur, item.meta.hauteur, autres)) {
                if (r) { e.px = r.gx + e.x; e.py = r.gy + e.y; }
                e.x = null; e.y = null;
                if (r) caler(e, choisie, r);
                dire('Tournée, elle ne tient plus là : elle est sortie du cadre.');
                peindre();
                return;
            }
        } else if (r) {
            // Tournée hors du cadre, elle peut déborder de la table : on la
            // ramène dedans plutôt que de la laisser à moitié dehors.
            caler(e, choisie, r);
        }
        peindre();
        verifier();
    }

    function dire(texte) {
        const st = container.querySelector('.pn-statut');
        if (st) st.textContent = texte;
    }

    /**
     * L'AIDE POSE UNE PIÈCE, PAS TOUTE LA GRILLE.
     *
     * Elle résout le rectangle avec ce qui reste dehors, puis pose la première
     * pièce de ce pavage. L'élève garde le reste du raisonnement ; on ne lui
     * rend que le cran qu'il avait perdu.
     */
    function aider() {
        const dehors = item.meta.pieces.filter(id => etats.get(id).x === null);
        if (!dehors.length) { dire('Tout est dans le cadre : regarde ce qui se chevauche.'); return; }
        const sol = resoudre(item.meta.largeur, item.meta.hauteur,
            item.meta.pieces, item.meta.combien);
        if (!sol) { dire('Reprends depuis le début : ce début-là ne mène nulle part.'); return; }
        // On repart d'un pavage complet et on remet TOUT : une aide qui pose
        // une pièce par-dessus un début contradictoire n'aide pas, elle ajoute
        // une contradiction.
        for (const id of item.meta.pieces) {
            const e = etats.get(id);
            e.x = null; e.y = null;
            e.px = e.departX; e.py = e.departY;
        }
        const premiere = sol[0];
        const e = etats.get(premiere.id);
        e.vue = e.vues.findIndex(v =>
            v.map(c => c.join(',')).join(' ') === premiere.cells.map(c => c.join(',')).join(' '));
        if (e.vue < 0) e.vue = 0;
        e.x = premiere.x; e.y = premiere.y;
        choisie = premiere.id;
        peindre();
        dire(`La pièce ${premiere.id} tient là : reprends à partir d'elle.`);
    }

    // ──────────────────────────────────────────────────────── corriger ────

    function verifier() {
        if (fini) return;
        if (!estFini(toutesLesPoses(), item.meta.largeur, item.meta.hauteur)) return;
        fini = true;
        choisie = null;
        peindre();
        const plateau = container.querySelector('[data-plateau]');
        if (plateau) plateau.classList.add('pn-plateau--ok');
        dire('Le rectangle est plein — pas un trou, pas un chevauchement.');
        const result = session.submit('plein');
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot pose la solution, pièce après pièce. */
    async function runDemo() {
        peindre();
        for (const s of item.meta.solution) {
            if (destroyed) return;
            const e = etats.get(s.id);
            const voulu = s.cells.map(c => c.join(',')).join(' ');
            const i = e.vues.findIndex(v => v.map(c => c.join(',')).join(' ') === voulu);
            e.vue = i < 0 ? 0 : i;
            e.x = s.x; e.y = s.y;
            peindre();
            await new Promise(r => regTimeout(r, 620));
        }
        if (!destroyed) regTimeout(renderNext, 1100);
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            cacherFantome();
            container.innerHTML = '';
            session.finish();
        }
    };
}
