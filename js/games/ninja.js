// TRANCHER ET TIRER — les trois petits jeux de tri, un seul écran.
//
// Des objets traversent l'écran en cloche, on prend ceux qui remplissent le
// critère et on laisse les autres. Trois habillages d'un même moteur :
// les zéros inutiles d'un nombre, les résultats négatifs, les résultats
// positifs.
//
// Deux partis pris, tous deux venus d'un constat de classe :
//
//   LA CONSIGNE RESTE À L'ÉCRAN, en permanence. C'est le défaut classique de
//   ce genre de jeu : on annonce la règle au départ, puis l'action commence et
//   plus personne ne sait ce qu'il faut couper. Elle est donc écrite en haut,
//   tout le temps, avec le rappel de la règle juste dessous.
//
//   LAISSER FILER COÛTE UNE VIE. Sans cela, ne rien toucher serait la
//   stratégie gagnante — et un jeu de tri où l'on gagne en ne triant pas
//   n'enseigne rien.
//
// En mode « zéros », le nombre vole d'un seul tenant : ses chiffres restent
// côte à côte et se lisent. Les faire voler séparément aurait rendu le nombre
// illisible au moment précis où il faut le lire.
//
// Les règles vivent dans core/tri.js, testées sans navigateur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    MODES, creerPartie, genererVague, toucher, laisserPasserGroupe, vagueFinie, resteAPrendre
} from '../core/tri.js';

// Le doigt qui GLISSE n'atteint qu'un objet dont il touche le milieu : les
// sept dixièmes centraux, soit à peu près la moitié de la surface. Au-delà,
// c'est un frôlement — et un frôlement ne doit pas coûter un cœur.
const COEUR = 0.7;

/**
 * LE NOMBRE VOLE PLUS LENTEMENT QUE LES BULLES.
 *
 * Une bulle porte UN calcul : on lit, on décide, on tranche. Un nombre porte
 * huit tuiles qu'il faut lire de gauche à droite, décider pour chacune, et
 * trancher plusieurs fois — quatre secondes et demie n'y suffisent pas, et le
 * jeu devient un exercice de vitesse au lieu d'un exercice de rang.
 *
 * On ralentit sans changer la trajectoire : diviser la vitesse de lancement
 * par s et la gravité par s² allonge le vol de s tout en gardant EXACTEMENT le
 * même sommet — la cloche reste dans l'écran, elle prend juste son temps.
 */
const LENTEUR_ZEROS = 1.7;

/**
 * ET UN CALCUL DEMANDE PLUS QU'UNE LECTURE. « −7 + 4 » n'est pas « 7 » : il
 * faut poser l'opération dans sa tête avant de savoir si le résultat est
 * positif. À pleine vitesse, l'élève tranche au flair — ou regarde passer la
 * seule bonne réponse de la vague, et perd un cœur sans avoir rien fait de
 * faux. Un tiers de temps en plus suffit à rendre la décision possible.
 */
const LENTEUR_CALCUL = 1.35;

const lenteurDe = (mode) => (mode === 'zeros' ? LENTEUR_ZEROS
    : (mode === 'positifs' || mode === 'negatifs' ? LENTEUR_CALCUL : 1));

/**
 * L'ALLURE, RÉGLABLE PAR LE PROFESSEUR.
 *
 * Le bon rythme n'est pas le même pour tous : celui qui lit vite s'ennuie à
 * regarder monter une bulle, celui qui pose « −7 + 4 » dans sa tête n'a pas
 * fini qu'elle est déjà redescendue. Aucun réglage automatique ne peut le
 * savoir — la classe, elle, le sait.
 *
 * Le nombre MULTIPLIE la durée du vol : 1,5 veut dire « moitié plus de temps ».
 * On divise la vitesse de lancement par l'allure et la gravité par son carré :
 * la cloche garde EXACTEMENT le même sommet, elle prend juste plus ou moins de
 * temps à le parcourir. Sans le carré, les bulles sortiraient par le haut de
 * l'écran au réglage lent.
 */
const ALLURES = {
    tranquille: 1.6, posee: 1.3, normale: 1, rapide: 0.75,
    // Les noms de l'ancien réglage « rythme » du Ninja des Nombres : il ne
    // faisait rien du tout, faute d'être lu. Les garder évite qu'un parcours
    // déjà enregistré change d'allure sans prévenir.
    lent: 1.6, normal: 1
};
const allureDe = (p) => ALLURES[p.vitesse] || ALLURES[p.rythme] || 1;

function auCoeur(el, x, y) {
    const r = el.getBoundingClientRect();
    const dx = (x - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (y - (r.top + r.height / 2)) / (r.height / 2);
    return dx * dx + dy * dy <= COEUR * COEUR;
}

class Ninja extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'ninja');
        this.mode = MODES[this.params.mode] ? this.params.mode : 'negatifs';
        this.def = MODES[this.mode];
        this.allure = allureDe(this.params);
        this.rng = makeRng(this.params.seed);
        this.etat = creerPartie({
            mode: this.mode,
            vies: Math.max(1, Math.min(9, parseInt(this.params.vies) || 3)),
            parVague: parseInt(this.params.parVague) || (this.mode === 'zeros' ? 8 : 5)
        });
        this.entites = [];
        this.trace = [];
        this.tranche = false;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .nj-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: 6px; height: 100%; width: 100%; color: var(--text-main);
                    user-select: none; -webkit-user-select: none;
                }
                /* La consigne ne disparaît JAMAIS : c'est ce qui manque à tous
                   les jeux de ce genre, où la règle est dite au départ puis
                   oubliée dès que ça bouge. */
                .nj-consigne {
                    text-align: center; width: 100%; max-width: 640px;
                    font-weight: 800; font-size: clamp(13px, 3.1cqw, 18px);
                    line-height: 1.25;
                }
                .nj-rappel {
                    text-align: center; width: 100%; max-width: 620px;
                    font-size: clamp(10px, 2.4cqw, 13px); color: var(--text-muted);
                    line-height: 1.3;
                }
                .nj-barre {
                    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
                    justify-content: center; font-size: clamp(11px, 2.6cqw, 14px);
                    font-weight: 700;
                }
                .nj-vies { letter-spacing: 2px; }

                .nj-scene {
                    position: relative; flex: 1; width: 100%; min-height: 0;
                    overflow: hidden; border-radius: 14px;
                    background: var(--bg-plateau); box-shadow: var(--shadow-md);
                    touch-action: none; cursor: crosshair;
                }
                /* LE STAND DE FÊTE FORAINE. Le désert western disait « western »
                   plus qu'il ne disait « stand de tir » : un sol ocre, deux
                   cactus, et des cibles qui flottaient sans rien pour les
                   porter. Ici tout dit le stand — la banne rayée, la guirlande
                   d'ampoules, le comptoir de bois, et surtout les DEUX RAILS
                   sur lesquels les cibles se lèvent. Le décor explique le
                   geste : on vise une cible posée, on ne tranche pas une bulle
                   qui vole. */
                .nj-scene--stand {
                    background:
                        radial-gradient(circle at 12% 30%, rgba(253,224,71,.16) 0 2.2%, transparent 2.6%),
                        radial-gradient(circle at 86% 26%, rgba(248,113,113,.16) 0 1.8%, transparent 2.2%),
                        radial-gradient(circle at 68% 44%, rgba(96,165,250,.14) 0 2%, transparent 2.4%),
                        radial-gradient(circle at 30% 66%, rgba(253,224,71,.10) 0 1.6%, transparent 2%),
                        linear-gradient(#170e3a 0 60%, #2b1a63 60% 82%, #3b1f6b 82%);
                }
                .nj-decor { position: absolute; inset: 0; pointer-events: none; }
                /* La banne rayée, festonnée sur son bord bas. */
                .nj-banne {
                    position: absolute; left: -2%; right: -2%; top: 0; height: 13%;
                    background: repeating-linear-gradient(90deg, #dc2626 0 30px, #fff5f5 30px 60px);
                    filter: drop-shadow(0 3px 5px rgba(0,0,0,.45));
                    -webkit-mask-image: radial-gradient(circle 13px at 15px 100%, transparent 0 13px, #000 13.5px);
                    mask-image: radial-gradient(circle 13px at 15px 100%, transparent 0 13px, #000 13.5px);
                    -webkit-mask-size: 30px 100%; mask-size: 30px 100%;
                    -webkit-mask-repeat: repeat-x; mask-repeat: repeat-x;
                }
                /* La guirlande : des ampoules qui clignotent en décalé. */
                .nj-guirlande {
                    position: absolute; left: 0; right: 0; top: 13.5%; height: 12px;
                    background: radial-gradient(circle 4px at 17px 6px, #fde047 0 4px, transparent 4.5px);
                    background-size: 34px 12px; background-repeat: repeat-x;
                    filter: drop-shadow(0 0 5px rgba(253,224,71,.85));
                    animation: nj-ampoules 1.6s steps(2) infinite;
                }
                @keyframes nj-ampoules { 50% { opacity: .45; background-position: 17px 0; } }
                /* Les rails : les cibles se lèvent DE quelque part. */
                .nj-rail {
                    position: absolute; left: 3%; right: 3%; height: 7px; border-radius: 4px;
                    background: linear-gradient(#e2e8f0, #64748b 55%, #334155);
                    box-shadow: 0 3px 7px rgba(0,0,0,.5);
                }
                .nj-comptoir {
                    position: absolute; left: 0; right: 0; bottom: 0; height: 14%;
                    background:
                        repeating-linear-gradient(90deg, rgba(0,0,0,.16) 0 2px, transparent 2px 58px),
                        linear-gradient(#a16207, #713f12);
                    border-top: 5px solid #d97706;
                    box-shadow: 0 -4px 14px rgba(0,0,0,.45);
                }
                .nj-groupe { position: absolute; display: flex; gap: 3px; will-change: transform; }
                .nj-obj {
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; color: #fff; white-space: nowrap;
                    transition: transform .28s ease, opacity .28s ease;
                }
                /* Chiffres : des tuiles serrées, pour que le nombre se lise. */
                .nj-obj--chiffre {
                    width: clamp(26px, 7cqw, 46px); height: clamp(34px, 9cqw, 58px);
                    border-radius: 8px; font-size: clamp(18px, 5cqw, 32px);
                    background: linear-gradient(160deg, #7dd3fc, #0284c7);
                    box-shadow: 0 3px 0 rgba(0,0,0,.25);
                }
                /* La virgule garde la hauteur d'un chiffre : sans dimensions
                   propres elle s'écrasait à rien, et le nombre devenait
                   illisible à l'endroit exact qui sépare ses deux parties. */
                .nj-obj--virgule {
                    width: clamp(15px, 3.4cqw, 24px); height: clamp(34px, 9cqw, 58px);
                    border-radius: 8px; font-size: clamp(18px, 5cqw, 32px);
                    align-items: flex-end; padding-bottom: 2px;
                    background: linear-gradient(160deg, #cbd5e1, #64748b);
                    box-shadow: 0 3px 0 rgba(0,0,0,.25);
                }
                /* Bulles et cibles : rondes, avec le calcul dedans. */
                .nj-obj--bulle, .nj-obj--cible {
                    width: clamp(66px, 17cqw, 118px); height: clamp(66px, 17cqw, 118px);
                    border-radius: 50%; font-size: clamp(13px, 3.4cqw, 21px);
                }
                .nj-obj--bulle { background: radial-gradient(circle at 35% 30%, #a78bfa, #6d28d9); box-shadow: 0 4px 0 rgba(0,0,0,.24); }
                /* LE COMPTE À REBOURS, ÉCRIT AUTOUR DE LA CIBLE.
                   Une bulle qui redescend montre son délai : on VOIT qu'elle
                   va sortir. Une cible du stand, elle, se baissait d'un coup,
                   sur une horloge que rien n'affichait — on tirait juste ici,
                   une autre cible tombait là, et on perdait un cœur sans
                   comprendre. L'anneau qui se vide rend l'échéance visible :
                   on sait laquelle presse, et on choisit. */
                .nj-obj--cible {
                    --nj-reste: 1;
                    position: relative;
                    background: radial-gradient(circle at 50% 50%, #fecaca 0 24%, #ef4444 24% 42%,
                        #fff 42% 58%, #ef4444 58% 76%, #fecaca 76%);
                    color: #111827; box-shadow: 0 4px 0 rgba(0,0,0,.22);
                }
                /* UN ANNEAU, PAS UN CAMEMBERT. Un dégradé conique posé sur le
                   fond de la cible recouvre la cible : on obtient une part de
                   tarte sur les anneaux, et on ne voit plus ni l'un ni l'autre.
                   Le masque radial ne garde que la couronne extérieure — le
                   centre reste percé, la cible reste une cible. */
                .nj-obj--cible::before {
                    content: ''; position: absolute; inset: -7px; border-radius: 50%;
                    pointer-events: none;
                    background: conic-gradient(from -90deg,
                        var(--nj-jauge, #22c55e) 0 calc(var(--nj-reste) * 360deg),
                        rgba(255, 255, 255, .18) calc(var(--nj-reste) * 360deg) 360deg);
                    -webkit-mask: radial-gradient(circle, #0000 calc(50% - 6px), #000 calc(50% - 6px));
                    mask: radial-gradient(circle, #0000 calc(50% - 6px), #000 calc(50% - 6px));
                }
                /* Le dernier tiers vire à l'orange, le dernier sixième au rouge
                   et la cible se met à battre : c'est le moment de décider. */
                .nj-obj--presse { --nj-jauge: #f59e0b; }
                .nj-obj--urgent { --nj-jauge: #dc2626; animation: nj-battre .55s ease-in-out infinite; }
                @keyframes nj-battre { 50% { transform: scale(1.06); } }
                .nj-etiq { font-style: normal; }
                /* Le calcul posé sur les anneaux d'une cible devient illisible :
                   il lui faut son propre fond. On ne demande pas à un élève de
                   déchiffrer avant de calculer. */
                .nj-obj--cible .nj-etiq {
                    background: rgba(255, 255, 255, .95); border-radius: 999px;
                    padding: 2px 9px; box-shadow: 0 1px 4px rgba(0,0,0,.25);
                }
                /* UN OBJET DÉJÀ RÉGLÉ NE SE VISE PLUS. Il reste trois dixièmes
                   de seconde à l'écran, le temps de son animation — agrandi de
                   moitié ou descendu sur ses voisins, il interceptait des tirs
                   qui ne lui étaient pas destinés. */
                .nj-obj--pris {
                    transform: scale(1.5) rotate(14deg); opacity: 0;
                    pointer-events: none; animation: none;
                }
                /* Le lever et le baisser d'une cible s'animent sur L'OBJET, pas
                   sur le groupe : le groupe porte déjà le transform qui le
                   place, et l'écraser renverrait la cible en haut à gauche. */
                .nj-obj.nj-leve { animation: nj-lever .34s cubic-bezier(.2,1.3,.4,1); }
                .nj-obj.nj-baisse {
                    transform: translateY(60%) scale(.7); opacity: 0;
                    pointer-events: none; animation: none;
                }
                @keyframes nj-lever { from { transform: translateY(70%) scale(.7); opacity: 0; } }
                .nj-obj--rate {
                    animation: nj-secousse .34s ease;
                    box-shadow: 0 0 0 4px var(--danger);
                }
                @keyframes nj-secousse {
                    25% { transform: translateX(-6px); } 75% { transform: translateX(6px); }
                }

                /* LE SABRE. Un point posé à chaque événement de pointeur
                   donnait un pointillé : le doigt va plus vite que les
                   événements, et sur téléphone il en arrive deux fois moins
                   qu'à la souris. On trace donc une VRAIE lame — une polyligne
                   qui relie les derniers points, doublée d'un cœur blanc et
                   d'un halo, et qui s'efface par la queue. */
                /* Largeur et hauteur EXPLICITES : un svg est un élément
                   remplacé, il garde sa taille intrinsèque de 300 × 150 quand
                   on ne lui donne que des décalages, et la lame se dessinait
                   hors du cadre — invisible. */
                .nj-sabre {
                    position: absolute; left: 0; top: 0; width: 100%; height: 100%;
                    pointer-events: none; z-index: 5; overflow: visible;
                }
                .nj-sabre path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
                .nj-lame-halo { stroke: var(--primary); stroke-width: 22; opacity: .28;
                    filter: blur(4px); }
                .nj-lame-corps { stroke: var(--primary); stroke-width: 11; opacity: .85; }
                .nj-lame-coeur { stroke: #fff; stroke-width: 3.5; opacity: .95; }
                .nj-note {
                    min-height: 2.5em; text-align: center; width: 100%; max-width: 640px;
                    font-size: clamp(11px, 2.7cqw, 15px); line-height: 1.3; color: var(--text-muted);
                }
                .nj-note b { color: var(--text-main); }
                .nj-fin { display: inline-block; padding: 5px 13px; border-radius: 999px; font-weight: 700; }
                .nj-fin--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .nj-fin--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
                .nj-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                .nj-btn:hover { background: var(--bg-hover); }
            </style>
            <div class="nj-wrap">
                <div class="nj-consigne" data-consigne></div>
                <div class="nj-rappel">${this.def.rappel}</div>
                <div class="nj-barre">
                    <span class="nj-vies" data-vies></span>
                    <span data-score></span>
                    <button type="button" class="nj-btn" data-neuf>↺ Rejouer</button>
                </div>
                <div class="nj-scene${this.mode === 'positifs' ? ' nj-scene--stand' : ''}" data-scene>
                    ${this.mode === 'positifs' ? `<div class="nj-decor">
                        <div class="nj-banne"></div>
                        <div class="nj-guirlande"></div>
                        <div class="nj-rail" style="top:47%"></div>
                        <div class="nj-rail" style="top:77%"></div>
                        <div class="nj-comptoir"></div>
                    </div>` : ''}
                    <svg class="nj-sabre" data-sabre>
                        <path class="nj-lame-halo" data-lame></path>
                        <path class="nj-lame-corps" data-lame></path>
                        <path class="nj-lame-coeur" data-lame></path>
                    </svg>
                </div>
                <p class="nj-note" data-note></p>
            </div>`;

        this.scene = this.container.querySelector('[data-scene]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.rejouer());

        this.brancherGestes();
        this.majBarre();
        this.lancerVague();
        // La boucle sert aussi en démonstration : c'est elle qui enchaîne les
        // vagues une fois que le robot a fini de trancher.
        if (this.isDemo) this.startGameLoop();
    }

    startGameLoop() {
        this.dernier = performance.now();
        const boucle = (t) => {
            this.rafId = requestAnimationFrame(boucle);
            if (!this.isRunning) return;
            const dt = Math.min(48, t - this.dernier);
            this.dernier = t;
            if (!this.gelDemo) this.avancer(dt / 16.7);
        };
        this.rafId = requestAnimationFrame(boucle);
    }

    // --- Les vagues ---------------------------------------------------------

    lancerVague() {
        if (this.etat.fini) return;
        const v = genererVague(this.etat, this.rng);
        this.etat.vagues++;
        this.consigneEl.textContent = this.mode === 'zeros' ? v.consigne : this.def.consigne;
        this.scene.querySelectorAll('.nj-groupe').forEach(e => e.remove());
        this.entites = [];

        const r = this.scene.getBoundingClientRect();
        const larg = Math.max(200, r.width), haut = Math.max(160, r.height);

        // En démonstration, les objets sont POSÉS, pas lancés : le robot
        // explique un critère, il ne fait pas la preuve de son adresse. Un
        // élève qui regarde la démo doit avoir le temps de lire chaque calcul.
        if (this.isDemo) {
            const objets = v.objets;
            if (this.mode === 'zeros') {
                this.entites.push(this.creerEntite(objets, larg / 2, haut * 0.4, 0, 0, larg, haut, 'chiffre'));
            } else {
                const type = this.mode === 'positifs' ? 'cible' : 'bulle';
                objets.forEach((o, i) => {
                    const colonnes = Math.min(3, objets.length);
                    const x = larg * (0.5 + (i % colonnes - (colonnes - 1) / 2) * 0.28);
                    const y = haut * (0.22 + Math.floor(i / colonnes) * 0.36);
                    this.entites.push(this.creerEntite([o], x, y, 0, 0, larg, haut, type));
                });
            }
            this.note('');
            return;
        }

        // TIR AU STAND : les cibles ne volent pas, elles se lèvent et se
        // baissent. C'est un autre geste et un autre rythme — on vise, on lit,
        // on décide. Une cible en cloche ne laisse le temps de rien.
        if (this.mode === 'positifs') {
            // COMBIEN DE TEMPS UNE CIBLE RESTE-T-ELLE DEBOUT ? Autant qu'il en
            // faut pour venir jusqu'à elle.
            //
            // Cinq secondes et demie, c'était cinq secondes et demie pour
            // CHACUNE — mais leurs horloges tournent ENSEMBLE. Pendant qu'on
            // lisait la cinquième cible, la première se baissait ; et comme
            // laisser filer coûte une vie, on perdait un cœur à l'instant même
            // où l'on tirait juste ailleurs. Le compte était bon, le jeu
            // injouable, et le message affiché parlait d'une autre cible que
            // celle qu'on venait de toucher : impossible de comprendre.
            //
            // Le délai suit donc le TRAVAIL RESTANT — lire un calcul signé,
            // décider, viser, c'est deux bonnes secondes, et il y en a autant
            // que de cibles — et il suit l'allure réglée par le professeur, que
            // le stand ignorait complètement : le réglage n'agissait que sur
            // les bulles en cloche des deux autres modes.
            const duree = (4200 + 2100 * v.objets.length) * this.allure;
            // COMBIEN DE CIBLES PAR RANGÉE ? Autant qu'il en tient, pas quatre
            // d'office. Rémy, sur iPhone : « les cercles de progression se
            // superposent ». Quatre colonnes sur une scène de 340 px laissent
            // 73 px d'axe en axe, alors qu'une cible mesure 66 px et que son
            // anneau de compte à rebours en ajoute encore quatorze : les
            // anneaux mordaient les uns sur les autres et l'on ne savait plus
            // lequel se vidait. On calcule donc les colonnes d'après la place.
            const diametre = Math.min(118, Math.max(66, larg * 0.17)) + 16;
            const colonnes = Math.max(1, Math.min(4, v.objets.length,
                Math.floor(larg * 0.94 / diametre)));
            const lignes = Math.ceil(v.objets.length / colonnes);
            v.objets.forEach((o, i) => {
                const col = i % colonnes, rang = Math.floor(i / colonnes);
                const x = larg * (0.5 + (col - (colonnes - 1) / 2) * (0.86 / colonnes));
                // Les rangées se répartissent sur la hauteur disponible : avec
                // trois rangées, un pas fixe de 0,30 posait la dernière sur le
                // sol du stand.
                const y = haut * (lignes < 2 ? 0.45 : 0.30 + rang * (0.40 / (lignes - 1)));
                const e = this.creerEntite([o], x, y, 0, 0, larg, haut, 'cible');
                e.stand = true;
                e.retard = i * 420 * this.allure;
                // Décalées aussi à l'extinction : cinq cibles qui se baissent
                // dans la même seconde, c'est plusieurs vies d'un coup pour qui
                // n'a hésité qu'une fois.
                e.vieMax = e.vie = duree + i * 800 * this.allure;
                e.el.style.opacity = '0';
                this.entites.push(e);
            });
            this.note('');
            return;
        }

        // Les deux ninjas : une cloche LENTE, qui monte haut. Lire « −7 + 12 »,
        // décider, puis viser : ce sont trois gestes.
        //
        // TOUTES LES BULLES PARTENT DE LA MÊME LIGNE, juste sous le bord. Elles
        // partaient en escalier — la cinquième à deux cents pixels plus bas que
        // la première — c'est-à-dire DÉJÀ au-delà de la ligne de sortie : quatre
        // bulles sur cinq étaient détruites à leur première image, et comptées
        // comme laissées passer. L'élève tranchait la seule bulle visible et
        // perdait ses vies quand même. Leur décalage se fait par le retard au
        // lancement, pas par la hauteur de départ.
        if (this.mode === 'zeros') {
            this.entites.push(this.creerEntite(v.objets, larg / 2, haut + 60, 0,
                -(haut * 0.0110) / LENTEUR_ZEROS / this.allure, larg, haut, 'chiffre'));
        } else {
            const type = 'bulle';
            v.objets.forEach((o, i) => {
                const x = larg * (0.16 + 0.68 * (i + 0.5) / v.objets.length);
                const e = this.creerEntite([o], x, haut + 60, (this.rng.int(-3, 3)) / 14,
                    (-(haut * 0.0114) - this.rng.int(0, 3) / 100) / this.allure, larg, haut, type);
                // L'ÉCART ENTRE DEUX LANCERS SUIT L'ALLURE : sans cela, au
                // réglage lent les cinq bulles partiraient au rythme rapide et
                // se retrouveraient toutes en l'air en même temps.
                e.retard = i * 520 * this.allure;
                this.entites.push(e);
            });
        }
        this.note('');
    }

    /**
     * L'ANNEAU QUI SE VIDE AUTOUR D'UNE CIBLE DU STAND.
     *
     * On n'écrit dans le style que si la valeur a bougé d'un centième : à
     * soixante images par seconde et cinq cibles, poser une propriété
     * personnalisée à chaque image fait recalculer cinq dégradés coniques
     * trois cents fois par seconde pour un résultat identique à l'œil.
     */
    montrerReste(e) {
        const obj = e.el.firstElementChild;
        if (!obj || !e.vieMax) return;
        const reste = Math.max(0, e.vie / e.vieMax);
        if (e.dernierReste != null && Math.abs(reste - e.dernierReste) < 0.01) return;
        e.dernierReste = reste;
        obj.style.setProperty('--nj-reste', reste.toFixed(3));
        obj.classList.toggle('nj-obj--presse', reste <= 0.34 && reste > 0.16);
        obj.classList.toggle('nj-obj--urgent', reste <= 0.16);
    }

    creerEntite(objets, x, y, vx, vy, larg, haut, type) {
        const el = document.createElement('div');
        el.className = 'nj-groupe';
        el.innerHTML = objets.map(o =>
            `<span class="nj-obj nj-obj--${o.texte === ',' ? 'virgule' : type}" data-obj="${o.id}"><i class="nj-etiq">${o.texte}</i></span>`
        ).join('');
        this.scene.appendChild(el);
        el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translateX(-50%)`;
        return { el, objets: objets.map(o => o.id), x, y, vx, vy, retard: 0, sortie: false };
    }

    avancer(k) {
        const r = this.scene.getBoundingClientRect();
        const haut = r.height;
        // La gravité, réglée avec la vitesse de lancement. LE SOMMET EST À
        // 80 % DE LA SCÈNE, plus à 98 : Rémy, deux fois, « les bulles montent
        // trop haut » — une bulle qui frôle le bord passe le plus clair de son
        // vol là où le regard ne va pas, et sur un écran étroit son cercle
        // dépassait carrément. La DURÉE ne change pas : diviser la vitesse de
        // lancement ET la gravité par le même facteur abaisse le sommet en
        // gardant le temps de vol (H ∝ v²/g, T ∝ v/g).
        const g = haut * 0.0000832 / ((lenteurDe(this.mode) * this.allure) ** 2);
        let vivantes = 0;
        this.majSabre();

        for (const e of this.entites) {
            if (e.sortie) continue;
            if (this.isDemo) { vivantes++; continue; }
            if (e.retard > 0) {
                e.retard -= k * 16.7;
                if (e.retard <= 0 && e.stand) { e.el.style.opacity = '1'; e.el.firstElementChild?.classList.add('nj-leve'); }
                continue;
            }
            vivantes++;
            // Au stand, la cible reste en place puis se baisse.
            if (e.stand) {
                e.vie -= k * 16.7;
                this.montrerReste(e);
                if (e.vie <= 0) {
                    e.sortie = true;
                    e.el.firstElementChild?.classList.add('nj-baisse');
                    const el = e.el;
                    setTimeout(() => el.remove(), 300);
                    const p = laisserPasserGroupe(this.etat, e.objets);
                    if (p.perdu) this.perdre(p.message);
                }
                continue;
            }
            e.x += e.vx * k;
            e.y += e.vy * k;
            e.vy += g * k;
            e.el.style.transform = `translate(${Math.round(e.x)}px, ${Math.round(e.y)}px) translateX(-50%)`;
            // UNE BULLE NE SORT QUE SI ELLE EST ENTRÉE. Sans ce verrou, tout
            // objet lancé sous la ligne de sortie était détruit avant d'avoir
            // paru — et compté comme laissé passer.
            if (e.y < haut) e.entre = true;
            if (e.entre && e.y > haut + 90) {
                e.sortie = true;
                e.el.remove();
                const p = laisserPasserGroupe(this.etat, e.objets);
                if (p.perdu) this.perdre(p.message);
            }
        }

        if (this.etat.fini) return this.terminer();
        const toutesSorties = this.entites.every(e => e.sortie);
        if (!this.enTransition && (vagueFinie(this.etat) || toutesSorties)) {
            this.enTransition = true;
            if (vagueFinie(this.etat) && !toutesSorties) {
                this.note(`Vague ${this.etat.vagues} réussie !`, 'ok');
                // LA VAGUE EST UN NOMBRE, en mode « zéros » : c'est ICI que se
                // compte l'unique bonne réponse, quand il ne reste plus un seul
                // zéro inutile. Ailleurs, chaque bulle a déjà été comptée — une
                // prime de vague y ajoutait une réponse qui n'existait pas.
                const v = this.etat.vague;
                const zeros = v && v.objets ? v.objets.filter(o => o.cible).length : 0;
                if (this.mode === 'zeros' && zeros) {
                    this.onCorrectAnswer(null, this.def.skill, {
                        points: 10 + 5 * zeros,
                        questionText: `Enlever les zéros inutiles de ${v.nombre}`,
                        given: v.attendu, expected: v.attendu
                    });
                }
            }
            this.timerId = setTimeout(() => {
                this.enTransition = false;
                if (this.isRunning && !this.etat.fini) this.lancerVague();
            }, 900);
        }
    }

    // --- Le geste -----------------------------------------------------------

    brancherGestes() {
        /**
         * LE COUP PORTE AU CŒUR, PAS AU BORD.
         *
         * En glissant, le doigt traversait tout ce qui affleurait son chemin :
         * on visait une bulle, on effleurait sa voisine, et on perdait un cœur
         * pour une réponse qu'on n'avait jamais voulu donner. Sur un geste
         * CONTINU, on n'atteint donc que ce dont on touche vraiment le milieu —
         * la moitié centrale. Une PRESSION, elle, reste franche : viser puis
         * appuyer est un choix, on le prend tel quel.
         */
        const viser = (ev, franc) => {
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const cible = el && el.closest ? el.closest('[data-obj]') : null;
            if (cible && (franc || auCoeur(cible, ev.clientX, ev.clientY))) this.frapper(cible);
            this.laisserTrace(ev);
        };
        this.scene.addEventListener('pointerdown', (ev) => {
            ev.preventDefault();
            this.tranche = true;
            viser(ev, true);
        });
        this.scene.addEventListener('pointermove', (ev) => {
            // Sur les cibles, un simple survol ne tire pas : il faut appuyer.
            if (this.tranche) viser(ev, false);
        });
        const fin = () => { this.tranche = false; };
        this.scene.addEventListener('pointerup', fin);
        this.scene.addEventListener('pointercancel', fin);
        this.scene.addEventListener('pointerleave', fin);
    }

    /**
     * LA LAME. On garde les derniers points du geste, avec leur heure, et on
     * les relie. Un point posé par événement donnait un pointillé — le doigt
     * va plus vite que les événements, et un téléphone en envoie deux fois
     * moins qu'une souris. La queue s'efface toute seule au bout de deux
     * dixièmes de seconde, si bien que la lame SUIT le doigt au lieu de
     * s'accumuler derrière lui.
     */
    laisserTrace(ev) {
        const r = this.scene.getBoundingClientRect();
        this.trace.push({ x: ev.clientX - r.left, y: ev.clientY - r.top, t: performance.now() });
        if (this.trace.length > 24) this.trace.shift();
        this.majSabre();
    }

    majSabre() {
        const svg = this.container.querySelector('[data-sabre]');
        if (!svg) return;
        const limite = performance.now() - 200;
        while (this.trace.length && this.trace[0].t < limite) this.trace.shift();
        const d = this.trace.length < 2 ? ''
            : 'M ' + this.trace.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');
        svg.querySelectorAll('[data-lame]').forEach(p => p.setAttribute('d', d));
    }

    frapper(el) {
        // Un objet peut avoir quitté l'écran entre le geste et son traitement :
        // on ne suppose jamais que l'élément est encore là.
        if (!el || !el.dataset || !el.dataset.obj) return;
        const id = el.dataset.obj;
        const r = toucher(this.etat, id);
        if (r.raison === 'inconnu' || r.raison === 'inactif') return;

        if (r.ok) {
            el.classList.add('nj-obj--pris');
            // EN MODE « ZÉROS », LA RÉPONSE EST LE NOMBRE, PAS LE CHIFFRE.
            // Nettoyer « 0,4500 » demande trois coups de lame, mais ce n'est
            // pas trois bonnes réponses : c'est UN nombre bien écrit. On
            // compte donc à la fin de la vague, quand le nombre est propre.
            if (this.mode !== 'zeros') {
                this.onCorrectAnswer(null, this.def.skill, {
                    // Les points de l'ancienne prime de vague sont versés ici :
                    // la prime enregistrait une réponse de plus, alors que rien
                    // de nouveau n'avait été répondu.
                    points: 13,
                    questionText: `${r.objet.texte} — ${this.def.consigne}`,
                    given: r.objet.texte, expected: r.objet.texte
                });
            }
            const reste = resteAPrendre(this.etat);
            this.note(reste ? `Encore ${reste} à prendre.` : '');
        } else {
            el.classList.add('nj-obj--rate');
            setTimeout(() => el.classList.remove('nj-obj--rate'), 400);
            this.perdre(r.message, r.objet);
        }
        this.majBarre();
    }

    perdre(message, objet) {
        this.note(message, 'ko');
        this.onWrongAnswer(null, {
            concept: this.def.skill,
            questionText: objet ? objet.texte : this.consigneEl.textContent,
            input: objet ? objet.texte : 'laissé passer',
            expected: this.def.consigne,
            customMessage: message,
            silencieux: true
        });
        this.majBarre();
        if (this.etat.fini) this.terminer();
    }

    terminer() {
        if (this.termine) return;
        this.termine = true;
        this.isRunning = false;
        this.entites.forEach(e => { e.el.remove(); e.sortie = true; });
        this.note(`Partie terminée — ${this.etat.score} points, ${this.etat.touches} bonnes prises `
            + `et ${this.etat.rates + this.etat.laisses} erreurs. ${this.def.rappel}`, 'ko');
    }

    rejouer() {
        this.termine = false;
        this.enTransition = false;
        this.rng = makeRng();
        this.etat = creerPartie({ mode: this.mode, vies: this.etat.viesMax, parVague: this.etat.parVague });
        this.isRunning = true;
        this.majBarre();
        this.lancerVague();
    }

    majBarre() {
        const v = this.container.querySelector('[data-vies]');
        const s = this.container.querySelector('[data-score]');
        if (v) v.textContent = '❤️'.repeat(Math.max(0, this.etat.vies)) + '🖤'.repeat(Math.max(0, this.etat.viesMax - this.etat.vies));
        if (s) s.textContent = `${this.etat.score} pts · vague ${this.etat.vagues}`;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="nj-fin nj-fin--${ton}">${html}</span>` : html;
    }

    // --- Le robot -----------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.scene);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say(`${this.def.consigne} ${this.def.rappel}`, this.scene);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let tour = 0; tour < 3 && this.isRunning; tour++) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const v = this.etat.vague;
            if (!v) break;
            const cible = v.objets.find(o => o.cible && !o.coupe);
            if (!cible) break;
            // L'objet qu'on montre EN LE LAISSANT change à chaque tour, sinon
            // le robot commente trois fois le même. Et sur les zéros, on
            // choisit de préférence un zéro UTILE : c'est là qu'est la leçon,
            // pas sur un chiffre quelconque.
            const nonCibles = v.objets.filter(o => !o.cible && o.texte !== ',');
            const laisser = nonCibles.length
                ? (this.mode === 'zeros' && nonCibles.some(o => o.texte === '0')
                    ? nonCibles.filter(o => o.texte === '0')[tour % nonCibles.filter(o => o.texte === '0').length]
                    : nonCibles[tour % nonCibles.length])
                : null;

            if (laisser) {
                const el = this.scene.querySelector(`[data-obj="${laisser.id}"]`);
                cur.say(this.mode === 'zeros'
                    ? `Celui-là, je le laisse : ${laisser.texte === '0' ? 'ce zéro tient un rang, l\'enlever changerait le nombre' : 'ce n\'est pas un zéro'}.`
                    : `${laisser.texte} fait ${laisser.valeur < 0 ? '−' + Math.abs(laisser.valeur) : laisser.valeur} : je le laisse passer.`,
                    el || this.scene);
                if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            }

            const el = this.scene.querySelector(`[data-obj="${cible.id}"]`);
            cur.say(this.mode === 'zeros'
                ? `Ce zéro-là ne sert à rien : je le tranche.`
                : `${cible.texte} fait ${cible.valeur < 0 ? '−' + Math.abs(cible.valeur) : cible.valeur} : celui-là, je le prends.`,
                el || this.scene);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            if (el && !await cur.tap(el)) return fin();
            this.frapper(el || document.createElement('div'));
            if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Attention : laisser filer un objet qu\'il fallait prendre coûte une vie, exactement comme se tromper. Ne rien toucher n\'est donc pas une stratégie.', this.scene);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineNinja(container, isDemo, params) {
    const jeu = new Ninja(container, isDemo, params);
    jeu.start();
    return jeu;
}
