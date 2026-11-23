// MULTIKART — ce qu'on voit, et ce qu'on touche.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// La course elle-même — portiques, rivaux, bonus, classement — est dans
// `js/core/multiKart.js`, qui ne dessine rien. Ici, on la MONTRE : une route en
// fausse 3D, trois arches, un kart vu de dos, et un tableau de bord.
//
// RÉMY, 23 novembre : « voilà un jeu canon, tu me l'améliores, le rends encore
// plus beau, plus cohérent, ne mets pas le son ». Puis, pendant que j'y
// travaillais : « il faut que tout passe dans la fenêtre et que ce soit
// compatible téléphone portable ».
//
// ── « TOUT PASSE DANS LA FENÊTRE » ───────────────────────────────────────────
//
// Le fichier reçu était une PAGE : toile en plein écran, tableau de bord et
// menus en position fixe, tailles lues sur la fenêtre du navigateur. Monté dans
// le cadre d'un exercice, il aurait recouvert l'en-tête du parcours et débordé
// de sa carte. Ici, RIEN ne sort du conteneur : tout est en position absolue
// dans `.mk-wrap`, et toutes les tailles — toile, textes, boutons — se lisent
// sur LUI. Une unité, `--u`, vaut un centième de son petit côté utile ; chaque
// taille s'écrit en multiples d'elle. Le même jeu tient alors dans une vignette
// de catalogue, dans un téléphone tenu debout et sur le tableau de la classe.
//
// ── « COMPATIBLE TÉLÉPHONE » ─────────────────────────────────────────────────
//
// 1. ON TOUCHE LE RÉSULTAT. Le fichier demandait de viser un tiers d'écran ou
//    d'appuyer sur « Gauche / Centre / Droite » dans une barre du bas. Mais la
//    caméra suit le kart : quand on roule à gauche, l'arche de gauche est AU
//    MILIEU de l'écran. On touche donc le panneau qu'on lit, et le kart y va.
//
// 2. LES TROIS RÉSULTATS SE LISENT DE LOIN. Peints sur les arches, ils
//    faisaient six pixels de haut à l'apparition du portique sur un écran de
//    390 de large : on ne les lisait qu'à la dernière seconde. Ce sont
//    maintenant des panneaux qui gardent une taille lisible et flottent
//    au-dessus du portique tant qu'il est loin, puis viennent se poser dans
//    leur arche quand elle est assez grande pour les recevoir.
//
// 3. DEUX BOUTONS, AUX POUCES. Le frein à gauche, le bonus à droite, ronds, en
//    bas — et rien d'autre : la barre de quatre boutons mangeait un cinquième
//    de l'écran d'un téléphone.
//
// ── « PLUS COHÉRENT », CÔTÉ ÉCRAN ────────────────────────────────────────────
//
// LA CAMÉRA ROULE DERRIÈRE LE KART. Dans le fichier reçu, elle était posée SUR
// lui, et le kart n'était qu'un dessin collé en bas de l'écran. Le portique
// était donc jugé un tiers de seconde APRÈS être passé au-dessus du kart, et un
// rival à dix mètres devant était dessiné sous l'écran. Le kart est maintenant
// un objet de la piste comme les autres : on le voit passer sous l'arche à
// l'instant où elle est jugée, et l'arche du bon résultat s'allume en vert.
//
// UN SEUL ENDROIT POUR CHAQUE CHOSE. « Portique 3 / 10 » était écrit deux fois,
// la voie visée trois (pastille, barre du bas, tapis de lumière). Il reste : le
// calcul au milieu, la place à gauche, le compte à droite, et une ligne de
// course tout en haut où quatre points disent qui est devant.
//
// LES RÉGLAGES SONT CEUX DU PROFESSEUR. Tables et allure se choisissent où se
// règlent tous les exercices ; l'écran de départ ne garde que ce qui regarde
// l'élève : comment on joue, et la couleur du ciel.
//
// PAS DE SON. Demandé. Tout ce que le son disait est dit à l'œil : le kart qui
// tousse, l'arche qui verdit, la correction écrite sous le calcul.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { meneurDemo } from '../core/meneurDemo.js';
import {
    Course, PISTE, ALLURES, CIRCUITS, ARCHES, BONUS, PILOTES, SERIE_BONUS,
    tempsEcrit, rangEcrit
} from '../core/multiKart.js';

/* ─────────────────────────────────────────────────────────────────────────
 * LES PETITS OUTILS DU DESSIN
 * ───────────────────────────────────────────────────────────────────────── */

const borner = (v, a, b) => Math.max(a, Math.min(b, v));
const entre = (a, b, t) => a + (b - a) * t;

function rvb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Le mélange de deux couleurs écrites « #rrggbb ». */
function meler(a, b, t) {
    const x = rvb(a), y = rvb(b);
    const m = (i) => Math.round(x[i] + (y[i] - x[i]) * t);
    return `rgb(${m(0)}, ${m(1)}, ${m(2)})`;
}

function rectRond(c, x, y, l, h, r) {
    const rr = Math.max(0, Math.min(r, l * 0.5, h * 0.5));
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + l, y, x + l, y + h, rr);
    c.arcTo(x + l, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + l, y, rr);
    c.closePath();
}

function quad(c, x1, y1, x2, y2, x3, y3, x4, y4) {
    c.beginPath();
    c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.lineTo(x4, y4);
    c.closePath();
    c.fill();
}

/** Douze crans de brume : assez pour un dégradé, assez peu pour un cache. */
const CRANS_DE_BRUME = 12;

/**
 * Où le kart se pose à l'écran. La moitié de la hauteur est l'horizon ; le kart
 * est 0,78 demi-hauteur plus bas, donc à 89 % — comme dans le fichier reçu.
 */
const POSE_DU_KART = 0.78;

const ICONES = {
    vide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"></path><circle cx="12" cy="16.5" r="0.8" fill="currentColor"></circle></svg>',
    turbo: '<svg viewBox="0 0 24 24"><path d="M4 13C4 7.5 7.5 4 12 4s8 3.5 8 9H4z" fill="#ef4444"/><circle cx="9" cy="9" r="1.8" fill="#fff"/><circle cx="15" cy="9" r="1.8" fill="#fff"/><circle cx="12" cy="6.2" r="1.5" fill="#fff"/><path d="M8.5 13h7v4.5a3.5 3.5 0 0 1-7 0V13z" fill="#fde68a"/></svg>',
    carapace: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="13" rx="8.5" ry="6.5" fill="#22c55e"/><path d="M4.5 14.5c4.5 1.8 10.5 1.8 15 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M8 9.5l4-2 4 2" stroke="#bbf7d0" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
    etoile: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5z" fill="#fde047" stroke="#f59e0b" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    bouclier: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="rgba(56,189,248,0.35)" stroke="#38bdf8" stroke-width="2.2"/><path d="M8.5 8.5a5 5 0 0 1 4-2" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    eclair: '<svg viewBox="0 0 24 24"><path d="M13.5 2L4 14h7l-1.5 8L19 10h-7l1.5-8z" fill="#fde047" stroke="#ca8a04" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    banane: '<svg viewBox="0 0 24 24"><path d="M6 17c4.5 1.5 9.5-1.5 11.5-8.5.5 5-2.5 10.5-8.5 11-1.5.1-2.6-.9-3-2.5z" fill="#facc15"/><circle cx="17.5" cy="7.8" r="1.4" fill="#78350f"/></svg>'
};
const ORDRE_ROULETTE = ['turbo', 'carapace', 'etoile', 'bouclier', 'eclair', 'banane'];

class MultiKart extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'multikart');
        // LA COURSE AVANCE TOUTE SEULE : une carte de correction qui attend un
        // clic la figerait, ou la laisserait filer derrière elle. La correction
        // est écrite sous le calcul, le temps de la lire, et s'en va.
        this.tempsReel = true;
        this.graine = this.params.seed || this.params.graine || 'mk';
        this.tables = (Array.isArray(this.params.tables) ? this.params.tables : [])
            .map(Number).filter((t) => t >= 1 && t <= 12);
        if (!this.tables.length) this.tables = [2, 3, 4, 5, 6, 7, 8, 9, 10];
        this.allure = ALLURES[this.params.allure] ? this.params.allure : 'tranquille';
        this.circuit = CIRCUITS[this.params.circuit] ? this.params.circuit : 'prairie';
        // LE NOMBRE DE PORTIQUES EST CELUI DE L'ÉTAPE. Le parcours annonce
        // « 10 portiques » en haut de l'écran : la course en a dix, et chacun
        // compte pour une question. Hors parcours, dix.
        this.combien = borner(Math.round(Number(this.params.nbQuestions) || 10), 3, 30);
        this.alea = makeRng(`${this.graine}-gerbes`);
    }

    render() {
        this.container.innerHTML = `
            <style>
                .mk-wrap {
                    position: relative; width: 100%; height: 100%; min-height: 240px;
                    overflow: hidden; touch-action: none; --u: 6px;
                    user-select: none; -webkit-user-select: none;
                    background: #0b1220; color: #fff; font-weight: 700;
                    -webkit-tap-highlight-color: transparent;
                }
                /* La police seulement : hériter aussi la COULEUR écrivait
                   « Réviser mes erreurs » en blanc sur un bouton jaune — la
                   règle générale, plus précise, l'emportait sur celle du
                   bouton. Vu sur la photo du bilan. */
                .mk-wrap button { font: inherit; }
                .mk-toile { display: block; width: 100%; height: 100%; }

                /* ── LA LIGNE DE COURSE ──────────────────────────────────
                   Quatre points sur un fil, du départ à l'arrivée. Elle dit
                   en un coup d'oeil ce que disaient deux compteurs : où l'on
                   en est de la course, et qui est devant. */
                .mk-ligne {
                    position: absolute; left: calc(var(--u) * 2); right: calc(var(--u) * 2);
                    top: calc(var(--u) * 1.1); height: 4px; border-radius: 999px;
                    background: rgba(15, 23, 42, .55); pointer-events: none;
                }
                .mk-ligne i {
                    position: absolute; top: 50%; width: 9px; height: 9px;
                    margin: -4.5px 0 0 -4.5px; border-radius: 50%;
                    border: 1.5px solid rgba(255, 255, 255, .9); left: 0;
                }
                .mk-ligne i.mk-moi {
                    width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px;
                    border-width: 2px; z-index: 1;
                }

                .mk-hud {
                    position: absolute; left: 0; right: 0; top: calc(var(--u) * 2.6);
                    display: flex; align-items: flex-start; justify-content: space-between;
                    gap: calc(var(--u) * 1.2); padding: 0 calc(var(--u) * 1.6);
                    pointer-events: none;
                }
                .mk-pastille {
                    flex: 0 0 auto; display: flex; flex-direction: column;
                    align-items: center; justify-content: center; line-height: 1.05;
                    min-width: calc(var(--u) * 9); padding: calc(var(--u) * .8) calc(var(--u) * 1.4);
                    background: rgba(15, 23, 42, .84); border-radius: calc(var(--u) * 2);
                    border: 1.5px solid rgba(255, 255, 255, .22);
                    font-variant-numeric: tabular-nums;
                }
                .mk-pastille b { font-size: clamp(15px, calc(var(--u) * 3.6), 28px); font-weight: 900; }
                .mk-pastille i {
                    font-style: normal; opacity: .8;
                    font-size: clamp(10px, calc(var(--u) * 2), 14px);
                }
                .mk-rang--1 { border-color: #fde047; color: #fef08a; }
                .mk-rang--2 { border-color: #cbd5e1; }
                .mk-rang--3 { border-color: #fdba74; color: #fed7aa; }
                .mk-centre {
                    flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column;
                    align-items: center; gap: calc(var(--u) * .9);
                }
                .mk-calcul {
                    width: 100%; max-width: calc(var(--u) * 58); text-align: center;
                    background: rgba(15, 23, 42, .88); border-radius: calc(var(--u) * 2.4);
                    border: 2px solid rgba(255, 255, 255, .26);
                    padding: calc(var(--u) * .9) calc(var(--u) * 1.6) calc(var(--u) * 1.1);
                }
                .mk-question {
                    font-size: clamp(21px, calc(var(--u) * 6.2), 46px); font-weight: 900;
                    line-height: 1.12; letter-spacing: .02em; white-space: nowrap;
                    font-variant-numeric: tabular-nums;
                }
                /* LA JAUGE D'APPROCHE : elle se remplit jusqu'au portique. On
                   sait combien de temps il reste pour calculer sans quitter
                   le calcul des yeux. */
                .mk-approche {
                    height: clamp(4px, calc(var(--u) * .9), 7px); margin-top: calc(var(--u) * .6);
                    border-radius: 999px; background: rgba(255, 255, 255, .16); overflow: hidden;
                }
                .mk-approche i {
                    display: block; height: 100%; width: 0; border-radius: 999px;
                    background: linear-gradient(90deg, #38bdf8, #fde047 70%, #fb7185);
                }
                .mk-retour, .mk-annonce {
                    max-width: 100%; padding: calc(var(--u) * .7) calc(var(--u) * 2);
                    border-radius: 999px; text-align: center;
                    font-size: clamp(13px, calc(var(--u) * 3), 22px); font-weight: 900;
                    opacity: 0; transform: translateY(-4px);
                    transition: opacity .18s, transform .18s;
                    font-variant-numeric: tabular-nums;
                }
                .mk-vu { opacity: 1; transform: none; }
                .mk-retour--juste { background: #15803d; color: #f0fdf4; }
                .mk-retour--faux { background: #fff1f2; color: #9f1239; border: 2px solid #fb7185; }
                .mk-annonce {
                    background: rgba(15, 23, 42, .88); color: #fde68a;
                    font-size: clamp(11px, calc(var(--u) * 2.4), 17px);
                }

                /* ── LES DEUX BOUTONS, AUX POUCES ─────────────────────── */
                .mk-rond {
                    position: absolute; bottom: calc(var(--u) * 2);
                    width: clamp(50px, calc(var(--u) * 13), 86px);
                    height: clamp(50px, calc(var(--u) * 13), 86px);
                    border-radius: 50%; border: 3px solid rgba(255, 255, 255, .7);
                    background: rgba(15, 23, 42, .74); cursor: pointer; padding: 0;
                    color: #fff;
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; gap: 1px; touch-action: none;
                    font-size: clamp(9px, calc(var(--u) * 1.9), 13px); font-weight: 800;
                }
                .mk-rond svg { width: 46%; height: 46%; }
                .mk-frein { left: calc(var(--u) * 2); }
                .mk-frein--tenu { background: #be123c; border-color: #fecdd3; }
                .mk-bonus { right: calc(var(--u) * 2); }
                .mk-bonus--vide { opacity: .78; }
                .mk-bonus--vide svg { opacity: .55; }
                .mk-bonus--plein {
                    border-color: #fde047; background: rgba(120, 53, 15, .86);
                    box-shadow: 0 0 0 4px rgba(253, 224, 71, .32);
                    animation: mk-bat .9s ease-in-out infinite;
                }
                @keyframes mk-bat { 50% { transform: scale(1.07); } }
                .mk-serie { display: flex; gap: 3px; }
                .mk-serie i {
                    width: 6px; height: 6px; border-radius: 50%;
                    background: rgba(255, 255, 255, .28);
                }
                .mk-serie i.mk-allume { background: #fde047; }

                /* ── LES FEUX DU DÉPART ───────────────────────────────── */
                .mk-feux {
                    position: absolute; left: 50%; top: 40%;
                    transform: translate(-50%, -50%); display: none;
                    flex-direction: column; align-items: center;
                    gap: calc(var(--u) * 1.2); pointer-events: none;
                }
                .mk-feux--vu { display: flex; }
                .mk-feux div {
                    display: flex; gap: calc(var(--u) * 1.6);
                    padding: calc(var(--u) * 1.4) calc(var(--u) * 2);
                    background: rgba(15, 23, 42, .9); border-radius: 999px;
                }
                .mk-feux i {
                    width: clamp(20px, calc(var(--u) * 6), 44px);
                    height: clamp(20px, calc(var(--u) * 6), 44px);
                    border-radius: 50%; background: #334155;
                }
                .mk-feux i.mk-rouge { background: #ef4444; box-shadow: 0 0 14px #ef4444; }
                .mk-feux i.mk-vert { background: #22c55e; box-shadow: 0 0 16px #22c55e; }
                .mk-feux span {
                    font-size: clamp(16px, calc(var(--u) * 4.4), 34px); font-weight: 900;
                    text-shadow: 0 2px 0 rgba(15, 23, 42, .7);
                }

                /* ── L'ÉCRAN DE DÉPART ET LE BILAN ────────────────────── */
                .mk-voile {
                    position: absolute; inset: 0; display: none;
                    align-items: center; justify-content: center;
                    padding: calc(var(--u) * 2); background: rgba(8, 15, 30, .62);
                    overflow-y: auto; touch-action: pan-y;
                }
                .mk-voile--vu { display: flex; }
                .mk-carte {
                    width: min(100%, 520px); margin: auto; text-align: center;
                    background: rgba(15, 23, 42, .95); border-radius: calc(var(--u) * 3);
                    border: 1.5px solid rgba(255, 255, 255, .18);
                    padding: calc(var(--u) * 2.6) calc(var(--u) * 2.6);
                    display: flex; flex-direction: column; gap: calc(var(--u) * 1.5);
                }
                .mk-carte h3 {
                    margin: 0; font-weight: 900; line-height: 1.1;
                    font-size: clamp(19px, calc(var(--u) * 5), 36px);
                }
                .mk-carte p {
                    margin: 0; font-weight: 600; line-height: 1.35;
                    font-size: clamp(12.5px, calc(var(--u) * 2.5), 17px);
                }
                .mk-carte p b { color: #fde68a; font-weight: 800; }
                .mk-regles {
                    margin: 0; padding: 0; list-style: none; text-align: left;
                    display: flex; flex-direction: column; gap: calc(var(--u) * .8);
                    font-size: clamp(12px, calc(var(--u) * 2.4), 16px); font-weight: 600;
                }
                .mk-regles li { display: flex; gap: 8px; align-items: baseline; }
                .mk-regles li b { flex: 0 0 auto; color: #7dd3fc; font-weight: 900; }
                .mk-circuits { display: flex; gap: calc(var(--u) * 1); justify-content: center; }
                .mk-circuit {
                    flex: 1 1 0; min-width: 0; border-radius: calc(var(--u) * 1.6);
                    border: 2px solid rgba(255, 255, 255, .25); cursor: pointer;
                    padding: calc(var(--u) * 1) 4px; font-weight: 800; color: #fff;
                    font-size: clamp(11px, calc(var(--u) * 2.1), 14px);
                    text-shadow: 0 1px 2px rgba(0, 0, 0, .55);
                }
                .mk-circuit[aria-pressed="true"] {
                    border-color: #fde047; box-shadow: 0 0 0 3px rgba(253, 224, 71, .35);
                }
                .mk-bouton {
                    border: 0; border-radius: 999px; cursor: pointer; font-weight: 900;
                    padding: calc(var(--u) * 1.5) calc(var(--u) * 3);
                    font-size: clamp(15px, calc(var(--u) * 3.2), 22px);
                    background: #22c55e; color: #052e16;
                }
                .mk-bouton--second { background: #fde047; color: #422006; }
                .mk-bouton[disabled] { opacity: .6; cursor: default; }
                .mk-boutons { display: flex; flex-wrap: wrap; gap: calc(var(--u) * 1.2); justify-content: center; }
                .mk-boutons .mk-bouton { flex: 1 1 auto; }

                .mk-podium {
                    display: flex; align-items: flex-end; justify-content: center;
                    gap: calc(var(--u) * 1); height: clamp(64px, calc(var(--u) * 17), 120px);
                }
                /* LE NOM EST AU-DESSUS DE LA MARCHE, pas dedans : sur un
                   téléphone la troisième marche fait trente pixels de haut, et
                   « 3e / Toi » sur deux lignes y était coupé. Vu sur la photo. */
                .mk-colonne {
                    flex: 0 1 30%; height: 100%; display: flex; flex-direction: column;
                    align-items: center; justify-content: flex-end; gap: 3px;
                    font-size: clamp(11px, calc(var(--u) * 2.3), 15px); font-weight: 900;
                }
                .mk-colonne span {
                    padding: 1px 9px; border-radius: 999px; border: 2px solid;
                    background: rgba(255, 255, 255, .1);
                }
                .mk-colonne--moi span { background: #fff; color: #0f172a; }
                .mk-marche {
                    width: 100%; flex: 0 0 auto; color: #0f172a; padding-top: 2px;
                    border-radius: calc(var(--u) * 1.2) calc(var(--u) * 1.2) 0 0;
                }
                .mk-chiffres { display: flex; gap: calc(var(--u) * .8); }
                .mk-chiffre {
                    flex: 1 1 0; min-width: 0; background: rgba(255, 255, 255, .08);
                    border-radius: calc(var(--u) * 1.4); padding: calc(var(--u) * .9) 2px;
                }
                .mk-chiffre b {
                    display: block; font-weight: 900; font-variant-numeric: tabular-nums;
                    font-size: clamp(14px, calc(var(--u) * 3.2), 22px);
                }
                .mk-chiffre span {
                    display: block; opacity: .78; font-weight: 600;
                    font-size: clamp(9.5px, calc(var(--u) * 1.8), 12px);
                }
                .mk-faits { text-align: left; }
                .mk-faits h4 {
                    margin: 0 0 4px; font-weight: 800;
                    font-size: clamp(11px, calc(var(--u) * 2.1), 14px);
                }
                .mk-puces { display: flex; flex-wrap: wrap; gap: 5px; }
                .mk-puces span {
                    padding: 2px 9px; border-radius: 999px; font-weight: 800;
                    font-size: clamp(11.5px, calc(var(--u) * 2.2), 15px);
                    font-variant-numeric: tabular-nums;
                }
                .mk-puces--ok span { background: #14532d; color: #bbf7d0; }
                .mk-puces--ko span { background: #fff1f2; color: #9f1239; }
                /* ── LA FENÊTRE BASSE : un téléphone couché ──────────────
                   280 pixels de haut ne logent pas un bilan empilé : mesuré,
                   « Continuer » tombait sous le bord et il fallait faire
                   défiler. Le bilan passe sur deux colonnes — le compte et les
                   boutons à gauche, les calculs à droite — et rend le podium :
                   la phrase dit déjà la place. La carte de départ, elle, perd
                   ses trois règles, que la consigne et la démonstration
                   donnent ailleurs. */
                .mk-bas .mk-carte { gap: calc(var(--u) * 1); padding: calc(var(--u) * 2); }
                .mk-bas .mk-regles, .mk-bas .mk-podium { display: none; }
                .mk-bas #mk-fin .mk-carte {
                    width: min(100%, 780px); display: grid; align-items: start;
                    grid-template-columns: 1fr 1fr; column-gap: calc(var(--u) * 2.4);
                }
                .mk-bas #mk-fin h3, .mk-bas #mk-fin-texte { grid-column: 1 / -1; }
                .mk-bas #mk-faits { grid-column: 2; grid-row: 3 / span 2; }

                /* Lu par un lecteur d'écran, jamais vu : la toile ne dit rien
                   à qui ne la voit pas. */
                .mk-dit {
                    position: absolute; width: 1px; height: 1px; overflow: hidden;
                    clip-path: inset(50%); white-space: nowrap;
                }
            </style>
            <div class="mk-wrap" id="mk-wrap">
                <canvas class="mk-toile" id="mk-toile"></canvas>
                <div class="mk-ligne" id="mk-ligne" aria-hidden="true"></div>
                <div class="mk-dit" id="mk-choix" aria-live="polite"></div>
                <div class="mk-hud" id="mk-hud">
                    <span class="mk-pastille" id="mk-rang"><b>1er</b><i>sur 4</i></span>
                    <div class="mk-centre">
                        <div class="mk-calcul">
                            <div class="mk-question" id="mk-question"></div>
                            <div class="mk-approche" aria-hidden="true"><i id="mk-approche"></i></div>
                        </div>
                        <div class="mk-retour" id="mk-retour" role="status"></div>
                        <div class="mk-annonce" id="mk-annonce"></div>
                    </div>
                    <span class="mk-pastille" id="mk-compte"><b>1/10</b><i>00:00</i></span>
                </div>
                <button type="button" class="mk-rond mk-frein" id="mk-frein"
                    aria-label="Frein : ralentir pour finir son calcul">Frein</button>
                <button type="button" class="mk-rond mk-bonus mk-bonus--vide" id="mk-bonus"
                    aria-label="Bonus"></button>
                <div class="mk-feux" id="mk-feux" aria-hidden="true">
                    <div><i></i><i></i><i></i></div><span></span>
                </div>
                <div class="mk-voile" id="mk-depart">
                    <div class="mk-carte">
                        <h3>MultiKart</h3>
                        <p>Le calcul est écrit en haut. <b>Place ton kart dans la voie du bon résultat</b>
                           avant de passer sous le portique.</p>
                        <ul class="mk-regles">
                            <li><b>Voie</b><span>Touche le résultat — ou les flèches ← → du clavier.</span></li>
                            <li><b>Frein</b><span>Ralentis pour finir ton calcul : mieux vaut juste que premier.</span></li>
                            <li><b>Bonus</b><span>${SERIE_BONUS} bons résultats d'affilée, et tu en gagnes un.</span></li>
                        </ul>
                        <p id="mk-tables"></p>
                        <div class="mk-circuits" id="mk-circuits"></div>
                        <button type="button" class="mk-bouton" id="mk-go">Départ !</button>
                    </div>
                </div>
                <div class="mk-voile" id="mk-fin">
                    <div class="mk-carte">
                        <h3 id="mk-fin-titre"></h3>
                        <p id="mk-fin-texte"></p>
                        <div class="mk-podium" id="mk-podium"></div>
                        <div class="mk-chiffres" id="mk-chiffres"></div>
                        <div class="mk-faits" id="mk-faits"></div>
                        <div class="mk-boutons">
                            <button type="button" class="mk-bouton mk-bouton--second" id="mk-encore"></button>
                            <button type="button" class="mk-bouton" id="mk-suite">Continuer</button>
                        </div>
                    </div>
                </div>
            </div>`;
        const q = (id) => this.container.querySelector(`#${id}`);
        this.wrap = q('mk-wrap');
        this.toile = q('mk-toile');
        this.ctx = this.toile.getContext('2d');
        this.el = {
            ligne: q('mk-ligne'), hud: q('mk-hud'), rang: q('mk-rang'), question: q('mk-question'),
            approche: q('mk-approche'), retour: q('mk-retour'), annonce: q('mk-annonce'),
            compte: q('mk-compte'), frein: q('mk-frein'), bonus: q('mk-bonus'),
            feux: q('mk-feux'), depart: q('mk-depart'), fin: q('mk-fin'),
            encore: q('mk-encore'), suite: q('mk-suite'), choix: q('mk-choix')
        };
        this.ecrit = {};
        this.proj = Array.from({ length: PISTE.PORTEE + 2 }, () => ({
            a: { x: 0, y: 0, w: 0, s: 0 }, b: { x: 0, y: 0, w: 0, s: 0 },
            clip: 0, vu: false, seg: null, n: 0
        }));
        this.decalages = new Float64Array(PISTE.PORTEE + 3);
        this.teintes = new Map();
        this.cam = null;
        this.panneaux = null;

        // La ligne de course : un point par pilote.
        this.el.ligne.innerHTML = PILOTES.map((p, i) =>
            `<i${i === 0 ? ' class="mk-moi"' : ''} style="background:${p.coque}"></i>`).join('');
        this.points = [...this.el.ligne.children];

        q('mk-tables').innerHTML = `Tables travaillées : <b>${this.tables.join(' · ')}</b>`;
        const circuits = q('mk-circuits');
        circuits.innerHTML = Object.entries(CIRCUITS).map(([cle, c]) =>
            `<button type="button" class="mk-circuit" data-circuit="${cle}"
                style="background: linear-gradient(180deg, ${c.ciel[0]}, ${c.ciel[1]} 55%, ${c.herbe[0]} 56%)"
                >${c.nom}</button>`).join('');
        circuits.addEventListener('click', (e) => {
            const b = e.target.closest('[data-circuit]');
            if (b) this.choisirCircuit(b.dataset.circuit);
        });
        q('mk-go').addEventListener('click', () => this.lancerLesFeux());
        this.el.encore.addEventListener('click', () => this.rejouer());
        this.el.suite.addEventListener('click', () => this.continuer());

        // POUR LES SONDES, ET POUR ELLES SEULES. Les trois panneaux ne sont que
        // des pixels sur une toile : sans cette porte, une sonde ne peut pas
        // savoir OÙ toucher, et l'on ne mesurerait le jeu qu'au clavier — donc
        // pas sur le chemin de l'élève qui joue au doigt.
        this.wrap.mesure = () => ({
            phase: this.phase, voie: this.course.joueur.voie,
            panneaux: this.panneaux ? this.panneaux.map(Math.round) : null,
            choix: this.course.portiqueActif ? this.course.portiqueActif.choix.slice() : null
        });

        this.brancher();
        this.choisirCircuit(this.circuit);
        this.nouvelleCourse(null);
        this.phase = this.isDemo ? 'course' : 'accueil';
        this.el.depart.classList.toggle('mk-voile--vu', !this.isDemo);
        if (this.isDemo) this.course.demarrer();
        this.dernier = null;
        this.raf = requestAnimationFrame(this.boucle);
    }

    /* ─────────────────────────────────────────────────────────────────────
     * LES COMMANDES
     * ───────────────────────────────────────────────────────────────────── */

    brancher() {
        const surPiste = (e) => {
            if (e.target.closest('button, .mk-voile')) return;
            if (this.phase !== 'course' || this.isDemo) return;
            e.preventDefault();
            const cadre = this.wrap.getBoundingClientRect();
            this.course.viser(this.voieTouchee(e.clientX - cadre.left, cadre.width));
        };
        this.wrap.addEventListener('pointerdown', surPiste);

        const tenir = (oui) => (e) => {
            if (oui && e.pointerId !== undefined && this.el.frein.setPointerCapture) {
                try { this.el.frein.setPointerCapture(e.pointerId); } catch { /* sans capture, tant pis */ }
            }
            this.freiner(oui);
        };
        this.el.frein.addEventListener('pointerdown', tenir(true));
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) =>
            this.el.frein.addEventListener(n, tenir(false)));
        this.el.bonus.addEventListener('click', () => {
            if (this.phase === 'course' && !this.isDemo) this.course.utiliserBonus();
        });

        this.surTouche = (e) => {
            if (!this.isRunning || this.isDemo) return;
            if (this.phase !== 'course' && this.phase !== 'feux') return;
            if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '')) return;
            const bas = e.type === 'keydown';
            const k = this.course;
            if (e.key === 'ArrowDown') { e.preventDefault(); this.freiner(bas); return; }
            if (!bas) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); k.viser(k.joueur.voie - 1); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); k.viser(k.joueur.voie + 1); }
            else if (e.key === '1' || e.key === '2' || e.key === '3') k.viser(Number(e.key) - 1);
            else if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                if (!e.repeat) k.utiliserBonus();
            }
        };
        window.addEventListener('keydown', this.surTouche);
        window.addEventListener('keyup', this.surTouche);
        this.detacher = () => {
            this.wrap.removeEventListener('pointerdown', surPiste);
            window.removeEventListener('keydown', this.surTouche);
            window.removeEventListener('keyup', this.surTouche);
        };
    }

    freiner(oui) {
        this.course.freiner(oui && this.phase === 'course');
        this.el.frein.classList.toggle('mk-frein--tenu', !!oui && this.phase === 'course');
    }

    /**
     * LA VOIE QU'ON VIENT DE TOUCHER.
     *
     * LE PANNEAU LE PLUS PROCHE DU DOIGT, pas le tiers d'écran. La caméra suit
     * le kart : quand il roule à gauche, le panneau de gauche est au milieu de
     * l'écran, et « toucher le tiers gauche » enverrait le doigt sur de
     * l'herbe. On touche ce qu'on lit.
     *
     * Les tiers ne servent que s'il n'y a aucun panneau à l'écran — entre le
     * dernier portique et la ligne d'arrivée.
     */
    voieTouchee(x, largeur) {
        const p = this.panneaux;
        if (!p) return borner(Math.floor(x / (largeur / 3)), 0, 2);
        let mieux = 0;
        for (let i = 1; i < 3; i++) if (Math.abs(x - p[i]) < Math.abs(x - p[mieux])) mieux = i;
        return mieux;
    }

    choisirCircuit(cle) {
        this.circuit = CIRCUITS[cle] ? cle : 'prairie';
        this.theme = CIRCUITS[this.circuit];
        this.teintes.clear();
        this.container.querySelectorAll('[data-circuit]').forEach((b) =>
            b.setAttribute('aria-pressed', String(b.dataset.circuit === this.circuit)));
    }

    /* ─────────────────────────────────────────────────────────────────────
     * LE DÉROULÉ
     * ───────────────────────────────────────────────────────────────────── */

    nouvelleCourse(faits) {
        this.numero = (this.numero || 0) + 1;
        this.course = new Course({
            tables: this.tables, portiques: this.isDemo ? 3 : this.combien,
            // LA DÉMONSTRATION ROULE AU RALENTI : le robot parle, et il lui faut
            // le temps de finir sa phrase avant le portique. Mesuré à l'allure
            // tranquille : la bulle du frein s'affichait une demi-seconde.
            allure: this.isDemo ? 'ralenti' : this.allure,
            graine: `${this.graine}-${this.numero}`, faits
        });
        // LA PREMIÈRE COURSE EST CELLE QUI COMPTE. Celles qu'on relance depuis
        // le bilan — « Réviser mes erreurs », « Rejouer » — sont de
        // l'entraînement : leurs réponses nourrissent le carnet d'erreurs,
        // mais elles ne s'ajoutent pas aux questions de l'étape, qui
        // afficherait sinon « 14 portiques sur 10 ».
        this.comptee = this.numero === 1;
        this.retenue = null;
        this.temps = 0;
        this.cap = 0;
        this.champ = PISTE.CHAMP;
        this.gerbes = [];
        this.finDans = null;
        this.el.fin.classList.remove('mk-voile--vu');
        this.el.retour.classList.remove('mk-vu');
        this.el.annonce.classList.remove('mk-vu');
        this.el.suite.disabled = false;
        this.el.suite.textContent = 'Continuer';
    }

    lancerLesFeux() {
        this.el.depart.classList.remove('mk-voile--vu');
        this.el.fin.classList.remove('mk-voile--vu');
        this.phase = 'feux';
        this.feux = 0;
        this.el.feux.classList.add('mk-feux--vu');
    }

    /**
     * TROIS FEUX ROUGES, PUIS LE VERT.
     *
     * Le fichier reçu comptait « 3, 2, 1 » dans une bulle. Trois feux qui
     * s'allument disent la même chose sans un chiffre de plus sur un écran qui
     * va en être couvert — et l'on a le temps de lire son premier calcul, qui
     * est déjà affiché.
     */
    avancerFeux(dt) {
        this.feux += dt;
        const allumes = Math.min(3, Math.floor(this.feux / 0.7));
        const vert = this.feux >= 2.8;
        const lampes = this.el.feux.querySelectorAll('i');
        lampes.forEach((l, i) => {
            l.classList.toggle('mk-rouge', !vert && i < allumes);
            l.classList.toggle('mk-vert', vert);
        });
        this.el.feux.lastElementChild.textContent = vert ? 'Partez !' : 'Prêt ?';
        if (vert && this.phase === 'feux') {
            this.phase = 'course';
            this.course.demarrer();
        }
        if (this.feux >= 3.6) this.el.feux.classList.remove('mk-feux--vu');
    }

    boucle = (t) => {
        this.raf = null;
        if (!this.isRunning || !this.toile || !this.toile.isConnected) return;
        // UN PAS BORNÉ : au retour d'un onglet resté une minute en arrière-plan,
        // l'écart vaut soixante secondes et le kart franchit six portiques
        // d'un bond, tous faux.
        const dt = this.dernier === null ? 1 / 60 : Math.min(0.05, (t - this.dernier) / 1000);
        this.dernier = t;
        if (!this.gelDemo) this.avancer(dt);
        this.dessiner();
        this.raf = requestAnimationFrame(this.boucle);
    };

    avancer(dt) {
        this.temps += dt;
        const k = this.course;
        if (this.el.feux.classList.contains('mk-feux--vu')) this.avancerFeux(dt);
        for (const ev of k.avancer(dt)) this.surEvenement(ev);

        // LE CAP : la somme des virages. C'est lui qui fait défiler les
        // collines — elles glissent quand on TOURNE, pas quand on avance.
        const seg = k.segments[Math.floor(k.joueur.z / PISTE.LONGUEUR_SEGMENT)];
        if (seg) this.cap += seg.courbe * (k.joueur.vitesse / k.allure.croisiere) * dt * 0.5;
        const veut = (k.turbo > 0 || k.etoile > 0) && k.etat === 'course'
            ? PISTE.CHAMP_TURBO : PISTE.CHAMP;
        this.champ += (veut - this.champ) * Math.min(1, 5 * dt);

        this.avancerGerbes(dt);
        if (this.finDans !== null) {
            this.finDans -= dt;
            if (this.finDans <= 0) { this.finDans = null; this.montrerBilan(); }
        }
        this.majHud();
    }

    /**
     * CE QUE LA COURSE ANNONCE, ET CE QU'ON EN MONTRE.
     *
     * Le coeur ne sait pas qu'il y a un écran : il rend une liste d'événements.
     * C'est ici qu'un portique devient une réponse enregistrée, une gerbe et
     * une ligne de correction.
     */
    surEvenement(ev) {
        if (ev.quoi === 'portique') {
            const p = ev.portique;
            if (ev.juste) {
                this.dire(this.el.retour, `✔ ${p.texte} = ${p.juste}`, 1500, 'mk-retour--juste');
                this.gerbe(22, ['#fde047', '#4ade80', '#ffffff', '#38bdf8']);
            } else {
                // LA CORRECTION DIT LES DEUX : le bon résultat, et celui qu'on a
                // pris. « Faux » tout seul n'apprend rien ; « 7 × 8 = 56, pas
                // 54 » montre de combien on s'est trompé, donc pourquoi.
                this.dire(this.el.retour, `${p.texte} = ${p.juste}, pas ${p.donne}`,
                    2800, 'mk-retour--faux');
                if (ev.protege === 'bouclier') this.dire(this.el.annonce, 'Le bouclier a tenu !', 1600);
                else if (!ev.protege) this.gerbe(10, ['#94a3b8', '#cbd5e1', '#64748b']);
            }
            this.rapporter(p);
        } else if (ev.quoi === 'bonus') {
            this.dire(this.el.annonce, `${BONUS[ev.id].nom} — touche le bouton`, 2000);
        } else if (ev.quoi === 'usage') {
            this.dire(this.el.annonce, BONUS[ev.id].dit, 1900);
            if (ev.id === 'etoile' || ev.id === 'turbo') this.gerbe(14, ['#fde047', '#f97316', '#ffffff']);
        } else if (ev.quoi === 'touche') {
            this.dire(this.el.annonce, `${ev.pilote.nom} part en tête-à-queue !`, 1700);
        } else if (ev.quoi === 'arrivee') {
            this.gerbe(46, ['#fde047', '#4ade80', '#38bdf8', '#f472b6', '#ffffff']);
            this.freiner(false);
            this.phase = 'arrivee';
            this.dire(this.el.annonce, `Arrivée ! ${rangEcrit(ev.rang)} sur 4`, 2400);
            // Pas de bilan dans une démonstration : on y montre le geste, on
            // n'y note personne.
            if (!this.isDemo) this.finDans = 2.4;
        }
    }

    /**
     * UN PORTIQUE EST UNE QUESTION.
     *
     * Juste ou faux, il est TRANCHÉ : on ne repasse pas sous un portique. D'où
     * le numéro d'essai, assez grand pour que le parcours tienne la question
     * pour close quel que soit le nombre d'essais qu'il accorde ailleurs —
     * sans lui, une erreur ne comptait pas, et une course de dix portiques
     * avec deux fautes s'arrêtait à « 8 sur 10 » sans jamais finir l'étape.
     *
     * LE DERNIER PORTIQUE ATTEND. Le parcours ferme l'étape une seconde et
     * demie après la dernière question ; or il reste alors la ligne d'arrivée
     * à franchir, et le podium à lire. On le garde donc en main, et il part
     * quand l'élève touche « Continuer ».
     */
    rapporter(p) {
        if (this.isDemo) return;
        const dernier = p.index === this.course.total - 1;
        const envoi = () => {
            const partiel = !this.comptee;
            if (p.reussi) {
                this.onCorrectAnswer(null, `mult:${p.table}`, {
                    questionText: p.texte, given: p.donne, expected: p.juste, partiel
                });
            } else {
                this.onWrongAnswer(null, {
                    concept: `mult:${p.table}`, questionText: p.texte,
                    input: p.donne, expected: p.juste,
                    silencieux: true, partiel, attemptIndex: 9
                });
            }
        };
        if (dernier && this.comptee) this.retenue = envoi; else envoi();
    }

    continuer() {
        if (this.retenue) { const envoi = this.retenue; this.retenue = null; envoi(); }
        this.el.suite.disabled = true;
        this.el.suite.textContent = 'C\'est noté';
    }

    rejouer() {
        const faits = this.aRevoir && this.aRevoir.length ? this.aRevoir : null;
        // On ne perd pas la dernière réponse de la course comptée en relançant.
        if (this.retenue) this.continuer();
        this.nouvelleCourse(faits);
        this.lancerLesFeux();
    }

    dire(el, texte, duree, classe = '') {
        el.textContent = texte;
        if (el === this.el.retour) el.className = `mk-retour mk-vu ${classe}`;
        else el.classList.add('mk-vu');
        clearTimeout(el._tempo);
        el._tempo = setTimeout(() => el.classList.remove('mk-vu'), duree);
    }

    /* ── LE TABLEAU DE BORD ────────────────────────────────────────────── */

    /** N'écrit dans la page que ce qui a changé : soixante fois par seconde, sinon. */
    poser(cle, valeur, fn) {
        if (this.ecrit[cle] === valeur) return;
        this.ecrit[cle] = valeur;
        fn(valeur);
    }

    majHud() {
        const k = this.course, e = this.el;
        const p = k.portiqueActif;
        this.poser('question', p ? `${p.texte} = ?` : 'Arrivée !', (v) => { e.question.textContent = v; });
        // LES TROIS RÉSULTATS, EN TOUTES LETTRES. Ils ne sont peints que sur
        // la toile : sans cette ligne, un lecteur d'écran lirait la question
        // et aucune des réponses.
        this.poser('choix', p && k.etat === 'course'
            ? `gauche ${p.choix[0]}, centre ${p.choix[1]}, droite ${p.choix[2]}` : '',
        (v) => { e.choix.textContent = v; });
        this.poser('approche', Math.round(k.approche * 100), (v) => { e.approche.style.width = `${v}%`; });
        const rang = k.rangFinal || k.rang();
        this.poser('rang', rang, (v) => {
            e.rang.firstElementChild.textContent = rangEcrit(v);
            e.rang.className = `mk-pastille mk-rang--${v}`;
        });
        this.poser('compte', `${Math.min(k.actif + 1, k.total)}/${k.total}`,
            (v) => { e.compte.firstElementChild.textContent = v; });
        this.poser('chrono', tempsEcrit(k.temps), (v) => { e.compte.lastElementChild.textContent = v; });

        const tous = [k.joueur, ...k.rivaux];
        tous.forEach((q, i) => this.poser(`pt${i}`,
            Math.round(borner(q.z / k.arriveeZ, 0, 1) * 1000) / 10,
            (v) => { this.points[i].style.left = `${v}%`; }));

        const cle = k.roulette > 0 ? `r${k.rouletteCran % 6}`
            : (k.bonus || `vide${k.serie % SERIE_BONUS}`);
        this.poser('bonus', cle, () => {
            const b = e.bonus;
            if (k.roulette > 0) {
                b.className = 'mk-rond mk-bonus';
                b.innerHTML = `${ICONES[ORDRE_ROULETTE[k.rouletteCran % 6]]}<span>…</span>`;
            } else if (k.bonus) {
                b.className = 'mk-rond mk-bonus mk-bonus--plein';
                b.innerHTML = `${ICONES[k.bonus]}<span>Bonus</span>`;
                b.setAttribute('aria-label', `Bonus : ${BONUS[k.bonus].nom}`);
            } else {
                // TROIS POINTS QUI S'ALLUMENT : la série en cours. C'est la
                // règle du bonus, dite sans une phrase.
                const n = k.serie % SERIE_BONUS;
                b.className = 'mk-rond mk-bonus mk-bonus--vide';
                b.innerHTML = `${ICONES.vide}<span class="mk-serie">${
                    [0, 1, 2].map((i) => `<i${i < n ? ' class="mk-allume"' : ''}></i>`).join('')}</span>`;
                b.setAttribute('aria-label', 'Bonus : aucun pour l\'instant');
            }
        });
    }

    /* ── LE BILAN ──────────────────────────────────────────────────────── */

    /**
     * LE PODIUM, PUIS CE QU'IL FAUT REVOIR.
     *
     * LE TITRE DIT LES CALCULS AVANT LA PLACE. « 8 justes sur 10 » est ce que
     * l'élève emporte ; « 2e sur 4 » est le plaisir de la course. Dans le
     * fichier reçu, le titre était le podium et la précision un chiffre parmi
     * quatre.
     */
    montrerBilan() {
        this.phase = 'bilan';
        const b = this.course.bilan();
        this.aRevoir = b.aRevoir;
        const q = (id) => this.container.querySelector(`#${id}`);
        const s = b.justes > 1 ? 's' : '';
        q('mk-fin-titre').textContent = `${b.justes} résultat${s} juste${s} sur ${b.total}`;
        q('mk-fin-texte').textContent = b.aRevoir.length === 0
            ? `Sans faute — et tu finis ${rangEcrit(b.rang)} sur 4 !`
            : `Tu finis ${rangEcrit(b.rang)} sur 4. `
                + (b.aRevoir.length > 1
                    ? 'Ces calculs sont à revoir : refais la course sur eux seuls.'
                    : 'Ce calcul est à revoir : refais la course sur lui seul.');

        // Le podium : 2e, 1er, 3e — comme une vraie remise de coupes.
        const haut = { 0: 68, 1: 48, 2: 32 };
        const fond = ['#fde047', '#e2e8f0', '#fdba74'];
        q('mk-podium').innerHTML = [1, 0, 2].map((i) => {
            const p = b.classement[i];
            const pilote = PILOTES.find((x) => x.id === p.id);
            return `<div class="mk-colonne${p.joueur ? ' mk-colonne--moi' : ''}">
                <span style="border-color:${pilote.coque}">${p.nom}</span>
                <div class="mk-marche" style="height:${haut[i]}%; background:${fond[i]}">${
    rangEcrit(i + 1)}</div></div>`;
        }).join('');

        // TROIS CHIFFRES, ET PAS LA PLACE : elle est déjà dite par la phrase et
        // par le podium, juste au-dessus.
        q('mk-chiffres').innerHTML = [
            [`${Math.round(b.precision * 100)} %`, 'de réussite'],
            [tempsEcrit(b.temps), 'temps'],
            [`${b.meilleureSerie}`, 'justes à la suite']
        ].map(([v, n]) => `<div class="mk-chiffre"><b>${v}</b><span>${n}</span></div>`).join('');

        const uniques = [...new Map(b.reussis.map((f) => [f.texte, f])).values()];
        q('mk-faits').innerHTML = (b.aRevoir.length
            ? `<h4>À revoir</h4><div class="mk-puces mk-puces--ko">${
                b.aRevoir.map((f) => `<span>${f.texte}</span>`).join('')}</div>` : '')
            + (uniques.length
                ? `<h4 style="margin-top:8px">Réussis</h4><div class="mk-puces mk-puces--ok">${
                    uniques.map((f) => `<span>${f.texte}</span>`).join('')}</div>` : '');

        // EN ÉVALUATION, ON NE REJOUE PAS : une interrogation qu'on refait
        // jusqu'à la réussir n'en est plus une.
        this.el.encore.hidden = this.enEvaluation;
        this.el.encore.style.display = this.enEvaluation ? 'none' : '';
        this.el.encore.textContent = b.aRevoir.length ? 'Réviser mes erreurs' : 'Rejouer';
        this.el.fin.classList.add('mk-voile--vu');
        this.el.fin.scrollTop = 0;
    }

    /* ── LES GERBES ────────────────────────────────────────────────────── */

    gerbe(combien, couleurs) {
        const larg = this.wrap.clientWidth, haut = this.wrap.clientHeight;
        for (let i = 0; i < combien; i++) {
            const a = -Math.PI * (0.15 + this.alea.next() * 0.7);
            const v = (0.25 + this.alea.next() * 0.55) * haut;
            this.gerbes.push({
                x: larg * 0.5 + (this.alea.next() - 0.5) * larg * 0.12, y: haut * 0.8,
                vx: Math.cos(a) * v, vy: Math.sin(a) * v, vie: 0, max: 0.7 + this.alea.next() * 0.6,
                r: 2.5 + this.alea.next() * 3.5, couleur: this.alea.pick(couleurs)
            });
        }
    }

    avancerGerbes(dt) {
        const haut = this.wrap.clientHeight || 400;
        for (let i = this.gerbes.length - 1; i >= 0; i--) {
            const g = this.gerbes[i];
            g.vie += dt;
            g.vy += haut * 1.4 * dt;
            g.x += g.vx * dt; g.y += g.vy * dt;
            if (g.vie >= g.max) this.gerbes.splice(i, 1);
        }
    }

    /* ─────────────────────────────────────────────────────────────────────
     * LE DESSIN
     * ───────────────────────────────────────────────────────────────────── */

    /** L'unité du tableau de bord, et la hauteur qu'il occupe. */
    mesurer(larg, haut) {
        // UN CENTIÈME DU PETIT CÔTÉ UTILE. La hauteur compte pour une fois et
        // demie : un écran large et bas — un téléphone couché — doit garder un
        // tableau de bord fin, sans quoi il mange la route.
        const u = borner(Math.min(larg, haut * 1.5) / 100, 3, 9.5);
        this.wrap.style.setProperty('--u', `${u.toFixed(2)}px`);
        this.u = u;
        // Tout ce qui est dessiné « à sa taille » — karts, décors, bonus — se
        // règle sur cette demi-largeur, bornée par la hauteur pour qu'un kart
        // ne fasse pas le tiers d'un écran couché.
        this.ech = Math.min(larg, haut * 1.9) / 2;
        this.etroit = larg < 560;
        this.wrap.classList.toggle('mk-bas', haut < 400);
        // L'HORIZON MONTE QUAND L'ÉCRAN EST DEBOUT. À mi-hauteur sur un
        // téléphone tenu droit, il laissait 45 % de l'écran au ciel — vu sur
        // la photo à 390 de large — et la route, où tout se passe, n'en avait
        // que la moitié. Le kart, lui, reste posé au même endroit.
        const debout = borner((haut / larg - 1) / 0.6, 0, 1);
        this.horizon = haut * (0.5 - 0.09 * debout);
        this.vertical = (haut * 0.89 - this.horizon) / POSE_DU_KART;
    }

    /** La couleur d'une chose de la piste, fondue dans la brume du lointain. */
    teinte(couleur, n) {
        const cran = Math.min(CRANS_DE_BRUME - 1,
            Math.floor(Math.pow(n / PISTE.PORTEE, 1.7) * CRANS_DE_BRUME));
        if (cran === 0) return couleur;
        const cle = `${couleur}${cran}`;
        let t = this.teintes.get(cle);
        if (!t) {
            t = meler(couleur, this.theme.brume, (cran / (CRANS_DE_BRUME - 1)) * 0.8);
            this.teintes.set(cle, t);
        }
        return t;
    }

    dessiner() {
        const c = this.ctx, toile = this.toile;
        const larg = this.wrap.clientWidth, haut = this.wrap.clientHeight;
        if (!larg || !haut) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (toile.width !== Math.round(larg * dpr) || toile.height !== Math.round(haut * dpr)) {
            toile.width = Math.round(larg * dpr);
            toile.height = Math.round(haut * dpr);
            this.mesurer(larg, haut);
            this.voileCoins = null;
        }
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const k = this.course, j = k.joueur, L = PISTE.LONGUEUR_SEGMENT;

        // ── LA CAMÉRA, DERRIÈRE LE KART ─────────────────────────────────
        //
        // Le recul est calculé pour que le kart se pose toujours au même
        // endroit de l'écran, que le champ soit large (turbo) ou non : c'est
        // la piste qui s'étire quand on accélère, pas le kart qui recule.
        const prof = 1 / Math.tan((this.champ * Math.PI) / 360);
        const recul = (prof * PISTE.HAUTEUR_CAMERA) / POSE_DU_KART;
        const camZ = Math.max(0, j.z - recul);
        const base = Math.floor(camZ / L);
        const part = (camZ - base * L) / L;
        const nb = Math.max(0, Math.min(PISTE.PORTEE, k.segments.length - base - 1));
        const camY = PISTE.HAUTEUR_CAMERA + this.sol(j.z);

        // Premier passage : de combien chaque segment est déporté par les
        // virages. On en a besoin AVANT de projeter, pour garder le kart au
        // milieu de l'écran jusque dans une courbe.
        const off = this.decalages;
        let cumul = 0, pente = -(k.segments[base].courbe * part);
        for (let n = 0; n < nb; n++) {
            off[n] = cumul;
            cumul += pente;
            pente += k.segments[base + n].courbe;
        }
        off[nb] = cumul;
        const nK = borner(Math.floor(j.z / L) - base, 0, Math.max(0, nb - 1));
        const tK = borner((j.z - (base + nK) * L) / L, 0, 1);
        const camX = j.x * PISTE.LARGEUR + entre(off[nK], off[nK + 1], tK);
        this.cam = { camX, camY, camZ, prof, base, nb, larg, haut };

        const projeter = (e, wx, wy, wz) => {
            const s = prof / Math.max(12, wz - camZ);
            e.s = s;
            e.x = larg * 0.5 + s * (wx - camX) * larg * 0.5;
            e.y = this.horizon - s * (wy - camY) * this.vertical;
            e.w = s * PISTE.LARGEUR * larg * 0.5;
        };

        let plafond = haut;
        const vus = [];
        for (let n = 0; n < nb; n++) {
            const seg = k.segments[base + n], p = this.proj[n];
            p.seg = seg; p.n = n; p.vu = false;
            projeter(p.a, off[n], seg.p1.y, seg.p1.z);
            projeter(p.b, off[n + 1], seg.p2.y, seg.p2.z);
            p.clip = plafond;
            if (seg.p1.z - camZ <= 10 || p.b.y >= plafond || p.b.y >= p.a.y) continue;
            plafond = p.b.y;
            p.vu = true;
            vus.push(p);
        }

        // ── CE QUI ROULE, RANGÉ PAR SEGMENT ─────────────────────────────
        const choses = new Map();
        const ranger = (genre, ref, z, x) => {
            const pos = this.placer(z, x);
            if (!pos) return;
            if (!choses.has(pos.n)) choses.set(pos.n, []);
            choses.get(pos.n).push({ genre, ref, z, pos });
        };
        for (const b of k.boites) if (b.prise <= 0) ranger('boite', b, b.z, b.x);
        for (const b of k.bananes) if (b.la) ranger('banane', b, b.z, b.x);
        for (const o of k.carapaces) ranger('carapace', o, o.z, o.x);
        for (const r of k.rivaux) ranger('rival', r, r.z, r.x);
        ranger('joueur', j, j.z, j.x);

        this.dessinerDecor(c, larg, haut);

        const actif = k.etat === 'course' ? k.portiqueActif : null;
        this.panneaux = null;
        let aPanneauter = null;
        for (let i = vus.length - 1; i >= 0; i--) {
            const p = vus[i];
            this.dessinerRuban(c, larg, haut, p, actif);
            for (const d of p.seg.decors) this.dessinerUnDecor(c, p, d);
            const ici = choses.get(p.n);
            if (ici) {
                ici.sort((u, v) => v.z - u.z);
                for (const o of ici) this.dessinerChose(c, o);
            }
            const g = p.seg.portique;
            if (g && (g === actif || g.passe)) {
                this.dessinerPortique(c, p, g, g === actif);
                if (g === actif) aPanneauter = p;
            } else if (p.seg.depart) this.dessinerBanderole(c, p, 'DÉPART', '#38bdf8');
            else if (p.seg.arrivee) this.dessinerBanderole(c, p, 'ARRIVÉE', '#fbbf24');
        }
        // LES PANNEAUX EN DERNIER, PAR-DESSUS TOUT. Un résultat caché par une
        // bosse ou par le kart de Léo, c'est une question qu'on ne peut pas
        // lire — et l'on perdrait un portique sur un hasard de la piste.
        if (aPanneauter) this.dessinerPanneaux(c, larg, aPanneauter, actif);

        this.dessinerEffets(c, larg, haut);
    }

    /** La hauteur de la piste en un point. */
    sol(z) {
        const L = PISTE.LONGUEUR_SEGMENT, segs = this.course.segments;
        const i = borner(Math.floor(z / L), 0, segs.length - 1);
        return entre(segs[i].p1.y, segs[i].p2.y, borner((z - i * L) / L, 0, 1));
    }

    /**
     * OÙ TOMBE À L'ÉCRAN UN POINT DE LA PISTE.
     *
     * AU POINT EXACT, PAS AU DÉBUT DE SON SEGMENT. Le fichier reçu posait
     * chaque rival au début du segment qu'il occupait : à vingt mètres, un
     * segment fait le sixième de la distance, et le kart de devant avançait
     * par à-coups. On interpole dans le segment — hauteur, déport du virage —
     * et il glisse.
     */
    placer(z, x) {
        const { camX, camY, camZ, prof, base, nb, larg } = this.cam;
        const L = PISTE.LONGUEUR_SEGMENT;
        const n = Math.floor(z / L) - base;
        if (n < 0 || n >= nb || z - camZ < 60) return null;
        const p = this.proj[n];
        if (!p.vu) return null;
        const t = (z - (base + n) * L) / L;
        const s = prof / (z - camZ);
        const centre = entre(this.decalages[n], this.decalages[n + 1], t);
        const ySol = entre(p.seg.p1.y, p.seg.p2.y, t);
        return {
            n, s, clip: p.clip,
            x: larg * 0.5 + s * (centre + x * PISTE.LARGEUR - camX) * larg * 0.5,
            y: this.horizon - s * (ySol - camY) * this.vertical,
            w: s * PISTE.LARGEUR * larg * 0.5
        };
    }

    /* ── LE CIEL ET LE LOINTAIN ────────────────────────────────────────── */

    dessinerDecor(c, larg, haut) {
        const th = this.theme, t = this.temps;
        const horizon = this.horizon;
        const ciel = c.createLinearGradient(0, 0, 0, horizon * 1.1);
        ciel.addColorStop(0, th.ciel[0]);
        ciel.addColorStop(0.6, th.ciel[1]);
        ciel.addColorStop(1, th.ciel[2]);
        c.fillStyle = ciel;
        c.fillRect(0, 0, larg, haut);
        const m = haut / 600;
        const tour = (v, periode) => ((v % periode) + periode) % periode;

        if (th.nuit) {
            for (let s = 0; s < 46; s++) {
                const sx = tour(s * 173 + 40 - this.cap * 30, larg);
                const sy = (s * 89 + 20) % Math.max(60, horizon - 20);
                c.fillStyle = `rgba(224, 242, 254, ${0.35 + 0.5 * Math.abs(Math.sin(t * 1.6 + s))})`;
                c.beginPath();
                c.arc(sx, sy, s % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
                c.fill();
            }
        }

        // L'astre : il glisse quand on tourne, comme tout le lointain.
        const ax = tour(larg * 0.74 - this.cap * 60, larg + 240) - 120;
        const ay = this.circuit === 'canyon' ? horizon * 0.62 : horizon * 0.34;
        const ar = (this.circuit === 'canyon' ? 44 : 30) * Math.max(0.7, m);
        const halo = c.createRadialGradient(ax, ay, ar * 0.3, ax, ay, ar * 3.4);
        halo.addColorStop(0, th.astre);
        halo.addColorStop(0.3, th.halo);
        halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
        c.fillStyle = halo;
        c.beginPath(); c.arc(ax, ay, ar * 3.4, 0, Math.PI * 2); c.fill();
        c.fillStyle = th.astre;
        c.beginPath(); c.arc(ax, ay, ar, 0, Math.PI * 2); c.fill();
        if (th.nuit) {
            // Un croissant : la lune mordue par un disque de la couleur du ciel.
            c.fillStyle = th.ciel[1];
            c.beginPath(); c.arc(ax + ar * 0.42, ay - ar * 0.18, ar * 0.86, 0, Math.PI * 2); c.fill();
        }

        for (let n = 0; n < 6; n++) {
            const nx = tour(n * 310 + t * 9 - this.cap * 90, larg + 320) - 160;
            const ny = horizon * (0.2 + (n % 3) * 0.13);
            this.nuage(c, nx, ny, (26 + (n % 2) * 10) * Math.max(0.7, m),
                th.nuit ? 0.13 : (this.circuit === 'canyon' ? 0.5 : 0.8));
        }
        if (!th.nuit) {
            const bx = tour(larg * 0.2 + t * 11 - this.cap * 70, larg + 260) - 130;
            this.montgolfiere(c, bx, horizon * 0.5 + Math.sin(t * 1.3) * 6, Math.max(0.7, m));
        }

        // TROIS PLANS DE RELIEF, du plus pâle au plus franc : c'est l'écart de
        // teinte entre eux qui donne la distance.
        const plans = [
            { couleur: th.lointain, pas: 250, h0: 60, h1: 70, vit: 26, bas: 4 },
            { couleur: th.collineLoin, pas: 210, h0: 34, h1: 46, vit: 48, bas: 8 },
            { couleur: th.collinePres, pas: 170, h0: 16, h1: 26, vit: 80, bas: 14 }
        ];
        plans.forEach((pl, rang) => {
            const glisse = tour(this.cap * pl.vit, pl.pas);
            const depart = Math.floor((this.cap * pl.vit) / pl.pas);
            c.fillStyle = pl.couleur;
            c.beginPath();
            c.moveTo(-pl.pas, haut);
            c.lineTo(-pl.pas, horizon + pl.bas * m);
            for (let i = -1; i * pl.pas < larg + pl.pas; i++) {
                const x = i * pl.pas - glisse;
                const graine = Math.abs(Math.sin((i + depart) * (1.7 + rang)));
                const hh = (pl.h0 + graine * pl.h1) * m;
                if (this.circuit === 'canyon' && rang < 2) {
                    // Des mesas : un plateau, deux falaises.
                    const l = pl.pas * (0.34 + graine * 0.3);
                    c.lineTo(x + pl.pas * 0.12, horizon + pl.bas * m);
                    c.lineTo(x + pl.pas * 0.2, horizon - hh);
                    c.lineTo(x + pl.pas * 0.2 + l, horizon - hh);
                    c.lineTo(x + pl.pas * 0.28 + l, horizon + pl.bas * m);
                } else if (th.nuit && rang === 1) {
                    // Une ville : des tours, et leurs fenêtres plus bas.
                    const l = pl.pas * 0.42;
                    c.lineTo(x + pl.pas * 0.1, horizon + pl.bas * m);
                    c.lineTo(x + pl.pas * 0.1, horizon - hh * 1.5);
                    c.lineTo(x + pl.pas * 0.1 + l, horizon - hh * 1.5);
                    c.lineTo(x + pl.pas * 0.1 + l, horizon - hh * 0.8);
                    c.lineTo(x + pl.pas * 0.9, horizon - hh * 0.8);
                    c.lineTo(x + pl.pas * 0.9, horizon + pl.bas * m);
                } else {
                    c.bezierCurveTo(x + pl.pas * 0.28, horizon - hh, x + pl.pas * 0.72, horizon - hh,
                        x + pl.pas, horizon + pl.bas * m);
                }
            }
            c.lineTo(larg + pl.pas * 2, haut);
            c.closePath();
            c.fill();
            if (th.nuit && rang === 1) {
                for (let i = -1; i * pl.pas < larg + pl.pas; i++) {
                    const x = i * pl.pas - glisse;
                    const graine = Math.abs(Math.sin((i + depart) * 2.7));
                    const hh = (pl.h0 + graine * pl.h1) * m * 1.5;
                    for (let f = 0; f < 6; f++) {
                        c.fillStyle = (f + i + depart) % 3 === 0 ? '#fde68a' : '#67e8f9';
                        c.fillRect(x + pl.pas * (0.16 + (f % 3) * 0.11), horizon - hh * (0.9 - Math.floor(f / 3) * 0.3),
                            3 * m, 4 * m);
                    }
                }
            }
        });
        // Sous l'horizon, la couleur du sol lointain : ce qu'on aperçoit entre
        // deux bosses de la piste.
        c.fillStyle = this.teinte(th.herbe[1], PISTE.PORTEE);
        c.fillRect(0, horizon + 14 * m, larg, haut);
    }

    nuage(c, x, y, r, alpha) {
        const boules = [[0, 0, 1], [0.85, -0.25, 1.15], [1.75, 0, 0.9], [-0.75, 0.1, 0.75]];
        for (const [dx, dy, k] of boules) {
            const g = c.createRadialGradient(x + dx * r, y + dy * r - r * k * 0.2, r * k * 0.15,
                x + dx * r, y + dy * r, r * k);
            g.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            g.addColorStop(1, 'rgba(255, 255, 255, 0)');
            c.fillStyle = g;
            c.beginPath();
            c.arc(x + dx * r, y + dy * r, r * k, 0, Math.PI * 2);
            c.fill();
        }
    }

    montgolfiere(c, x, y, m) {
        c.save();
        c.translate(x, y);
        c.scale(m, m);
        c.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(-10, 18); c.lineTo(-6, 29); c.moveTo(10, 18); c.lineTo(6, 29);
        c.stroke();
        c.fillStyle = '#78350f';
        rectRond(c, -8, 28, 16, 10, 4);
        c.fill();
        const g = c.createRadialGradient(-8, -14, 4, 0, -6, 32);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, this.theme.vibreur[1]);
        g.addColorStop(1, '#7f1d1d');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(0, -34);
        c.bezierCurveTo(28, -34, 30, -2, 11, 20);
        c.lineTo(-11, 20);
        c.bezierCurveTo(-30, -2, -28, -34, 0, -34);
        c.closePath();
        c.fill();
        c.restore();
    }

    /* ── LA PISTE ──────────────────────────────────────────────────────── */

    dessinerRuban(c, larg, haut, p, actif) {
        const th = this.theme, seg = p.seg, n = p.n;
        const x1 = p.a.x, w1 = p.a.w;
        const x2 = p.b.x, y2 = p.b.y, w2 = p.b.w;
        const ton = seg.sombre ? 1 : 0;

        c.fillStyle = this.teinte(th.herbe[ton], n);
        c.fillRect(0, y2, larg, p.a.y - y2 + 1);

        c.fillStyle = this.teinte(th.vibreur[ton], n);
        quad(c, x1 - w1 * 1.1, p.a.y, x1 - w1, p.a.y, x2 - w2, y2, x2 - w2 * 1.1, y2);
        quad(c, x1 + w1, p.a.y, x1 + w1 * 1.1, p.a.y, x2 + w2 * 1.1, y2, x2 + w2, y2);

        c.fillStyle = this.teinte(th.piste[ton], n);
        quad(c, x1 - w1, p.a.y, x1 + w1, p.a.y, x2 + w2, y2, x2 - w2, y2);

        // LE TAPIS DE LUMIÈRE : de la couleur de l'arche visée, il part du
        // kart et va jusqu'au portique. C'est la seule chose qui dise « tu vas
        // là » — et elle le dit sur la route, où l'on regarde.
        const k = this.course;
        if (k.etat === 'course' && actif && seg.index <= actif.segment && n > 3) {
            // UN VOILE CLAIR ET DEUX RAILS DE COULEUR, pas un aplat teinté :
            // de l'ambre à 16 % sur du bitume gris donnait un brun de boue —
            // vu sur la première photo.
            const v = PISTE.VOIES[k.joueur.voie], demi = 0.3;
            c.fillStyle = seg.sombre ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.05)';
            quad(c, x1 + (v - demi) * w1, p.a.y, x1 + (v + demi) * w1, p.a.y,
                x2 + (v + demi) * w2, y2, x2 + (v - demi) * w2, y2);
            c.fillStyle = ARCHES[k.joueur.voie].trait;
            c.globalAlpha = 0.85 - 0.5 * (n / PISTE.PORTEE);
            for (const cote of [-0.27, 0.27]) {
                const e1 = Math.max(1, w1 * 0.02), e2 = Math.max(0.8, w2 * 0.02);
                quad(c, x1 + (v + cote) * w1 - e1, p.a.y, x1 + (v + cote) * w1 + e1, p.a.y,
                    x2 + (v + cote) * w2 + e2, y2, x2 + (v + cote) * w2 - e2, y2);
            }
            c.globalAlpha = 1;
        }

        // Les deux lignes de rive, continues.
        c.fillStyle = this.teinte('#f8fafc', n);
        const r1 = Math.max(0.6, w1 * 0.014), r2 = Math.max(0.5, w2 * 0.014);
        quad(c, x1 - w1 * 0.955 - r1, p.a.y, x1 - w1 * 0.955 + r1, p.a.y, x2 - w2 * 0.955 + r2, y2, x2 - w2 * 0.955 - r2, y2);
        quad(c, x1 + w1 * 0.955 - r1, p.a.y, x1 + w1 * 0.955 + r1, p.a.y, x2 + w2 * 0.955 + r2, y2, x2 + w2 * 0.955 - r2, y2);

        // Les pointillés qui séparent les trois voies.
        if (!seg.sombre) {
            const d1 = Math.max(1, w1 * 0.016), d2 = Math.max(0.7, w2 * 0.016);
            c.fillStyle = th.trait;
            c.globalAlpha = 1 - 0.7 * Math.pow(n / PISTE.PORTEE, 1.5);
            for (const f of [-0.33, 0.33]) {
                quad(c, x1 + w1 * f - d1, p.a.y, x1 + w1 * f + d1, p.a.y,
                    x2 + w2 * f + d2, y2, x2 + w2 * f - d2, y2);
            }
            c.globalAlpha = 1;
        }

        if (seg.depart || seg.arrivee) {
            const cases = 12;
            for (let i = 0; i < cases; i++) {
                const t0 = -1 + (2 * i) / cases, t1 = -1 + (2 * (i + 1)) / cases;
                c.fillStyle = (i + seg.index) % 2 === 0 ? '#ffffff' : '#0f172a';
                quad(c, x1 + t0 * w1, p.a.y, x1 + t1 * w1, p.a.y, x2 + t1 * w2, y2, x2 + t0 * w2, y2);
            }
        }
    }

    /** Ne peindre que ce qui dépasse devant la bosse la plus proche. */
    decouper(c, clip) {
        c.save();
        c.beginPath();
        c.rect(0, 0, this.cam.larg, clip);
        c.clip();
    }

    dessinerUnDecor(c, p, d) {
        const l = p.a.s * 520 * d.taille * this.ech;
        if (l < 4) return;
        const h = l * 1.45;
        const x = p.a.x + d.cote * p.a.w, y = p.a.y;
        const grand = d.genre === 'grand';
        this.decouper(c, p.clip);
        c.globalAlpha = 1 - 0.75 * Math.pow(p.n / PISTE.PORTEE, 2);
        c.fillStyle = 'rgba(0, 0, 0, 0.2)';
        c.beginPath(); c.ellipse(x, y, l * 0.36, l * 0.09, 0, 0, Math.PI * 2); c.fill();

        if (this.circuit === 'prairie') {
            if (grand) {
                c.fillStyle = '#7c4a1e';
                rectRond(c, x - l * 0.07, y - h * 0.42, l * 0.14, h * 0.42, l * 0.05);
                c.fill();
                for (const [dx, dy, r, coul] of [[0, -0.66, 0.34, '#15803d'], [-0.23, -0.56, 0.25, '#16a34a'],
                    [0.23, -0.56, 0.25, '#16a34a'], [-0.07, -0.76, 0.22, '#4ade80']]) {
                    c.fillStyle = coul;
                    c.beginPath(); c.arc(x + l * dx, y + h * dy, l * r, 0, Math.PI * 2); c.fill();
                }
            } else {
                // Un buisson, et trois fleurs dessus.
                c.fillStyle = '#16a34a';
                c.beginPath(); c.ellipse(x, y - h * 0.13, l * 0.36, h * 0.15, 0, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#22c55e';
                c.beginPath(); c.ellipse(x - l * 0.1, y - h * 0.18, l * 0.2, h * 0.1, 0, 0, Math.PI * 2); c.fill();
                for (const [dx, dy, coul] of [[-0.18, -0.2, '#fde047'], [0.12, -0.24, '#f9a8d4'], [0.02, -0.12, '#ffffff']]) {
                    c.fillStyle = coul;
                    c.beginPath(); c.arc(x + l * dx, y + h * dy, Math.max(1, l * 0.045), 0, Math.PI * 2); c.fill();
                }
            }
        } else if (this.circuit === 'canyon') {
            if (grand) {
                c.fillStyle = '#15803d';
                rectRond(c, x - l * 0.09, y - h * 0.85, l * 0.18, h * 0.85, l * 0.09); c.fill();
                rectRond(c, x - l * 0.28, y - h * 0.62, l * 0.12, h * 0.26, l * 0.06); c.fill();
                rectRond(c, x - l * 0.28, y - h * 0.44, l * 0.24, h * 0.09, l * 0.045); c.fill();
                rectRond(c, x + l * 0.16, y - h * 0.72, l * 0.12, h * 0.26, l * 0.06); c.fill();
                rectRond(c, x + l * 0.04, y - h * 0.54, l * 0.24, h * 0.09, l * 0.045); c.fill();
            } else {
                c.fillStyle = '#9a3412';
                c.beginPath();
                c.moveTo(x - l * 0.45, y);
                c.bezierCurveTo(x - l * 0.35, y - h * 0.5, x + l * 0.35, y - h * 0.5, x + l * 0.45, y);
                c.closePath(); c.fill();
                c.fillStyle = '#c2410c';
                c.beginPath();
                c.moveTo(x - l * 0.3, y - h * 0.04);
                c.bezierCurveTo(x - l * 0.2, y - h * 0.36, x + l * 0.05, y - h * 0.36, x + l * 0.1, y - h * 0.04);
                c.closePath(); c.fill();
            }
        } else {
            // La nuit, des lampadaires : un mât, et un halo de la couleur du
            // vibreur le plus proche.
            const coul = grand ? '#22d3ee' : '#e879f9';
            c.fillStyle = '#334155';
            c.fillRect(x - l * 0.025, y - h * 0.6, l * 0.05, h * 0.6);
            const g = c.createRadialGradient(x, y - h * 0.62, l * 0.03, x, y - h * 0.62, l * 0.4);
            g.addColorStop(0, '#f0f9ff');
            g.addColorStop(0.3, coul);
            g.addColorStop(1, 'rgba(15, 23, 42, 0)');
            c.fillStyle = g;
            c.beginPath(); c.arc(x, y - h * 0.62, l * 0.4, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
        c.restore();
    }

    /* ── LES PORTIQUES ─────────────────────────────────────────────────── */

    /**
     * TROIS ARCHES, UNE PAR VOIE.
     *
     * PASSÉ, LE PORTIQUE RÉPOND. L'arche du bon résultat verdit ; celle qu'on
     * a prise à tort rougit. On le voit en passant dessous — puisque la caméra
     * roule derrière — et c'est la correction la plus rapide qui soit : pas un
     * mot, la bonne porte allumée.
     */
    dessinerPortique(c, p, g, actif) {
        const cx = p.a.x, y = p.a.y, route = p.a.w;
        if (route < 14) return;
        const k = this.course;
        const demi = route * 0.295, hauteur = route * 0.68;
        this.decouper(c, p.clip);
        c.globalAlpha = Math.min(1, 1.25 - Math.pow(p.n / PISTE.PORTEE, 2));
        for (let i = 0; i < 3; i++) {
            const ax = cx + PISTE.VOIES[i] * route;
            const visee = actif && i === k.joueur.voie;
            let trait = ARCHES[i].trait, voile = visee ? ARCHES[i].lueur : ARCHES[i].voile;
            if (!actif) {
                const bonne = i === g.voieJuste;
                const prise = g.choix[i] === g.donne;
                trait = bonne ? '#22c55e' : (prise ? '#f43f5e' : 'rgba(148, 163, 184, 0.5)');
                voile = bonne ? 'rgba(34, 197, 94, 0.4)' : (prise ? 'rgba(244, 63, 94, 0.32)' : 'rgba(148, 163, 184, 0.06)');
            }
            const tube = Math.max(2.5, route * (visee ? 0.046 : 0.034));
            const arc = () => {
                c.beginPath();
                c.moveTo(ax - demi, y);
                c.bezierCurveTo(ax - demi, y - hauteur * 1.12, ax + demi, y - hauteur * 1.12, ax + demi, y);
            };
            const fond = c.createLinearGradient(ax, y - hauteur, ax, y);
            fond.addColorStop(0, voile);
            fond.addColorStop(1, 'rgba(15, 23, 42, 0.02)');
            c.fillStyle = fond;
            arc(); c.closePath(); c.fill();
            c.lineCap = 'round';
            if (visee) {
                c.strokeStyle = ARCHES[i].lueur;
                c.lineWidth = tube * 2.6;
                arc(); c.stroke();
            }
            // Un liseré sombre sous le tube : il détache l'arche du ciel clair
            // de la prairie comme du ciel noir de la nuit.
            c.strokeStyle = 'rgba(15, 23, 42, 0.55)';
            c.lineWidth = tube * 1.5;
            arc(); c.stroke();
            c.strokeStyle = visee ? '#ffffff' : trait;
            c.lineWidth = tube;
            arc(); c.stroke();
        }
        c.globalAlpha = 1;
        c.restore();
    }

    /**
     * LES TROIS RÉSULTATS, LISIBLES DÈS QUE LE PORTIQUE PARAÎT.
     *
     * Un panneau ne descend jamais sous une taille qu'on lit sur un téléphone.
     * Tant que son arche est trop petite pour le recevoir, il flotte au-dessus
     * d'elle, les trois écartés juste assez pour ne pas se toucher ; quand elle
     * a grandi, il glisse dedans. On a ainsi tout le trajet pour calculer, au
     * lieu de la dernière seconde.
     */
    dessinerPanneaux(c, larg, p, g) {
        const cx = p.a.x, y = p.a.y, route = p.a.w;
        const k = this.course;
        const demi = route * 0.295, hauteur = route * 0.68;
        const hMin = borner(this.u * 4.4, 22, 40);
        const h = Math.max(hMin, route * 0.21);
        const police = Math.floor(h * 0.68);
        c.font = `900 ${police}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        const l = Math.max(...g.choix.map((v) => c.measureText(String(v)).width)) + h * 0.9;
        // De combien l'arche sait recevoir son panneau : 0, pas du tout ; 1, entièrement.
        const dedans = borner(((demi * 2) / l - 0.95) / 0.5, 0, 1);
        const ecart = Math.max(PISTE.VOIES[2] * route, l + 6);
        const yLoin = y - hauteur * 1.02 - h * 0.75;
        const yPres = y - hauteur * 0.62;
        const plancher = (this.el.hud.offsetTop + this.el.hud.offsetHeight) + h * 0.62;
        const py = Math.max(plancher, entre(yLoin, yPres, dedans));
        const xs = [-1, 0, 1].map((s) => cx + s * ecart);
        // Dans un virage serré, le portique lointain peut frôler le bord : on
        // ramène les panneaux dans l'écran sans changer leur ordre.
        const marge = l / 2 + 4;
        const glisse = xs[0] < marge ? marge - xs[0] : (xs[2] > larg - marge ? larg - marge - xs[2] : 0);
        this.panneaux = xs.map((x) => x + glisse);

        for (let i = 0; i < 3; i++) {
            const x = this.panneaux[i];
            const visee = i === k.joueur.voie;
            const ax = cx + PISTE.VOIES[i] * route;
            // Le fil qui relie le panneau à son arche, tant qu'il flotte.
            if (dedans < 1 && p.clip > y - hauteur) {
                c.strokeStyle = ARCHES[i].trait;
                c.globalAlpha = 0.75 * (1 - dedans);
                c.lineWidth = 2;
                c.beginPath();
                c.moveTo(x, py + h * 0.5);
                c.lineTo(ax, y - hauteur * 0.84);
                c.stroke();
                c.globalAlpha = 1;
            }
            const ll = visee ? l * 1.1 : l, hh = visee ? h * 1.12 : h;
            c.fillStyle = visee ? '#0b1220' : 'rgba(15, 23, 42, 0.92)';
            rectRond(c, x - ll / 2, py - hh / 2, ll, hh, hh / 2);
            c.fill();
            c.strokeStyle = visee ? '#fde047' : ARCHES[i].trait;
            c.lineWidth = Math.max(2, h * (visee ? 0.11 : 0.08));
            c.stroke();
            c.fillStyle = visee ? '#fde047' : '#ffffff';
            c.font = `900 ${Math.floor(police * (visee ? 1.1 : 1))}px system-ui, -apple-system, "Segoe UI", sans-serif`;
            c.fillText(String(g.choix[i]), x, py + hh * 0.04);
        }
    }

    dessinerBanderole(c, p, mot, couleur) {
        const cx = p.a.x, y = p.a.y, route = p.a.w;
        if (route < 22) return;
        const hauteur = route * 0.8, tube = Math.max(4, route * 0.05);
        this.decouper(c, p.clip);
        c.strokeStyle = couleur;
        c.lineWidth = tube;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(cx - route * 1.02, y);
        c.bezierCurveTo(cx - route * 1.02, y - hauteur * 1.15, cx + route * 1.02, y - hauteur * 1.15, cx + route * 1.02, y);
        c.stroke();
        const l = Math.min(route * 1.3, Math.max(85, route * 0.9));
        const h = Math.max(18, route * 0.22);
        const sy = y - hauteur * 0.95 - h * 0.5;
        c.fillStyle = 'rgba(15, 23, 42, 0.92)';
        rectRond(c, cx - l * 0.5, sy, l, h, h * 0.5);
        c.fill();
        c.strokeStyle = couleur;
        c.lineWidth = Math.max(2, tube * 0.45);
        c.stroke();
        c.font = `900 ${Math.max(10, Math.floor(h * 0.55))}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        c.fillStyle = '#ffffff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(mot, cx, sy + h * 0.52);
        c.restore();
    }

    /* ── CE QUI ROULE ──────────────────────────────────────────────────── */

    dessinerChose(c, o) {
        const { pos, ref } = o;
        const k = this.course, t = this.temps;
        if (o.genre === 'joueur') {
            const vif = k.turbo > 0 || k.etoile > 0;
            this.dessinerKart(c, {
                x: pos.x, y: pos.y, largeur: pos.s * this.largeurKart() * this.ech,
                braquage: ref.braquage, pilote: PILOTES[0], tour: 0,
                turbo: k.turbo > 0 && k.etat === 'course', etoile: k.etoile > 0,
                bouclier: k.bouclier, frein: ref.frein && k.etat === 'course',
                fete: k.fete > 0, toux: k.toux > 0,
                saut: k.etat !== 'attente' ? Math.sin(t * (vif ? 38 : 22)) * 1.6 : 0,
                nom: false, avance: ref.z
            });
            return;
        }
        this.decouper(c, pos.clip);
        if (o.genre === 'rival') {
            const mini = ref.ralenti > 0 ? 0.68 : 1;
            const l = pos.s * this.largeurKart() * mini * this.ech;
            if (l >= 8) {
                this.dessinerKart(c, {
                    x: pos.x, y: pos.y, largeur: l,
                    braquage: borner((PISTE.VOIES[ref.voie] - ref.x) * 2.4, -1, 1),
                    pilote: ref, tour: ref.tete > 0 ? (1 - ref.tete / 1.4) * Math.PI * 4 : 0,
                    turbo: ref.elan > 0, etoile: false, bouclier: false, frein: false,
                    fete: false, toux: ref.toux > 0,
                    saut: Math.sin(t * 20 + ref.rangee * 2) * l * 0.012, nom: true,
                    avance: ref.z
                });
            }
        } else if (o.genre === 'boite') {
            const r = pos.s * 210 * this.ech;
            if (r >= 4) {
                const sy = pos.y - r * 1.35 + Math.sin(t * 4.2 + ref.phase) * r * 0.22;
                const teinte = Math.floor((t * 160 + ref.phase * 60) % 360);
                c.fillStyle = 'rgba(0, 0, 0, 0.26)';
                c.beginPath(); c.ellipse(pos.x, pos.y, r * 0.85, r * 0.24, 0, 0, Math.PI * 2); c.fill();
                const halo = c.createRadialGradient(pos.x, sy, r * 0.3, pos.x, sy, r * 1.5);
                halo.addColorStop(0, `hsla(${teinte}, 95%, 65%, 0.65)`);
                halo.addColorStop(1, `hsla(${(teinte + 90) % 360}, 95%, 60%, 0)`);
                c.fillStyle = halo;
                c.beginPath(); c.arc(pos.x, sy, r * 1.5, 0, Math.PI * 2); c.fill();
                const g = c.createRadialGradient(pos.x - r * 0.3, sy - r * 0.3, r * 0.1, pos.x, sy, r);
                g.addColorStop(0, '#ffffff');
                g.addColorStop(0.45, `hsl(${teinte}, 90%, 62%)`);
                g.addColorStop(1, `hsl(${(teinte + 110) % 360}, 85%, 42%)`);
                c.fillStyle = g;
                c.beginPath(); c.arc(pos.x, sy, r, 0, Math.PI * 2); c.fill();
                c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                c.lineWidth = Math.max(1.5, r * 0.12);
                c.stroke();
                if (r > 9) {
                    c.font = `900 ${Math.floor(r * 1.25)}px system-ui, sans-serif`;
                    c.fillStyle = '#ffffff';
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';
                    c.fillText('?', pos.x, sy + r * 0.06);
                }
            }
        } else if (o.genre === 'banane') {
            const l = pos.s * 220 * this.ech;
            if (l >= 4) {
                c.fillStyle = '#facc15';
                c.beginPath();
                c.moveTo(pos.x - l * 0.42, pos.y - l * 0.08);
                c.quadraticCurveTo(pos.x, pos.y - l * 0.65, pos.x + l * 0.42, pos.y - l * 0.08);
                c.quadraticCurveTo(pos.x, pos.y - l * 0.26, pos.x - l * 0.42, pos.y - l * 0.08);
                c.fill();
                c.fillStyle = '#78350f';
                c.beginPath(); c.arc(pos.x, pos.y - l * 0.42, Math.max(2, l * 0.08), 0, Math.PI * 2); c.fill();
            }
        } else if (o.genre === 'carapace') {
            const r = pos.s * 210 * this.ech;
            if (r >= 4) {
                const sy = pos.y - r * 0.65;
                const g = c.createRadialGradient(pos.x - r * 0.3, sy - r * 0.3, r * 0.1, pos.x, sy, r);
                g.addColorStop(0, '#bbf7d0'); g.addColorStop(0.5, '#22c55e'); g.addColorStop(1, '#15803d');
                c.fillStyle = g;
                c.beginPath(); c.ellipse(pos.x, sy, r, r * 0.72, 0, 0, Math.PI * 2); c.fill();
                c.strokeStyle = '#ffffff';
                c.lineWidth = Math.max(2, r * 0.18);
                c.beginPath();
                c.ellipse(pos.x, sy + r * 0.12, r * 0.96, r * 0.26, Math.sin(t * 18) * 0.25, 0, Math.PI * 2);
                c.stroke();
            }
        }
        c.restore();
    }

    /** Un kart fait la moitié d'une voie ; un peu plus sur un écran étroit, où tout est petit. */
    largeurKart() { return this.etroit ? 660 : 560; }

    /**
     * UN KART, VU DE DOS ET D'UN PEU HAUT.
     *
     * RÉMY, en voyant la première version : « améliore les karts qui ne
     * ressemblent pas à grand chose ». Il avait raison, et c'était le dessin
     * que j'avais repris du fichier reçu courbe pour courbe : une coque en
     * haricot, quatre rectangles noirs, une boule. À 200 pixels de large on
     * devinait un kart ; à 70, sur un téléphone, une tache rouge.
     *
     * CE QUI FAIT QU'ON RECONNAÎT UN KART, et qui manquait :
     *   · DEUX GROSSES ROUES ARRIÈRE et deux petites devant, plus haut à
     *     l'écran parce que plus loin — c'est cet écart de taille qui dit
     *     « vu de derrière » ;
     *   · un NEZ et deux PONTONS, donc une forme qui s'effile vers l'avant ;
     *   · un BAQUET, et le dos du pilote qui en dépasse ;
     *   · un CASQUE à bande, vu de l'arrière — la visière noire du fichier
     *     reçu était peinte sur la nuque ;
     *   · un moteur, deux sorties d'échappement rondes — on les voit de face,
     *     puisqu'elles nous regardent —, un pare-chocs, une plaque, deux feux ;
     *   · et UN CONTOUR sombre partout : c'est lui qui garde les formes
     *     séparées quand le kart ne fait plus que quelques dizaines de pixels.
     *
     * Les couleurs de chacun sont trois : la coque, le liseré, le casque. Le
     * reste — ombre, reflet — se déduit de la coque.
     */
    dessinerKart(c, o) {
        const { x, y, largeur: l, braquage, pilote } = o;
        const h = l * 0.74, t = this.temps;
        const fin = l >= 46;
        const te = Math.floor((t * 420) % 360);
        const coque = o.etoile ? `hsl(${te}, 90%, 55%)` : pilote.coque;
        const sombre = o.etoile ? `hsl(${te}, 90%, 36%)` : meler(pilote.coque, '#0f172a', 0.45);
        const clair = o.etoile ? `hsl(${te}, 95%, 76%)` : meler(pilote.coque, '#ffffff', 0.5);
        const contour = 'rgba(15, 23, 42, 0.62)';
        const ep = Math.max(1, l * 0.013);
        // On dessine dans le repère du kart : X en largeurs, Y en hauteurs,
        // le sol à zéro et le haut vers le haut.
        const X = (v) => v * l, Y = (v) => -v * h;
        const rond = (cx, cy, rx, ry) => {
            c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        };
        const cerner = () => { c.strokeStyle = contour; c.lineWidth = ep; c.stroke(); };

        c.save();
        c.translate(x, y);
        c.lineJoin = 'round';
        c.lineCap = 'round';

        c.fillStyle = 'rgba(0, 0, 0, 0.34)';
        rond(0, Y(0.03), X(0.6), h * 0.13); c.fill();

        if (o.etoile) {
            const aura = c.createRadialGradient(0, Y(0.6), l * 0.1, 0, Y(0.6), l * 0.8);
            aura.addColorStop(0, `hsla(${te}, 100%, 70%, 0.55)`);
            aura.addColorStop(1, `hsla(${(te + 120) % 360}, 100%, 55%, 0)`);
            c.fillStyle = aura;
            rond(0, Y(0.6), l * 0.8, l * 0.8); c.fill();
        }
        if (o.toux) {
            for (let i = 0; i < 3; i++) {
                const a = (t * 2.2 + i / 3) % 1;
                c.fillStyle = `rgba(148, 163, 184, ${0.6 * (1 - a)})`;
                rond((i - 1) * l * 0.22, Y(0.12) + a * h * 0.45, l * (0.08 + a * 0.15), l * (0.08 + a * 0.15));
                c.fill();
            }
        }
        if (o.tour > 0) {
            const f = Math.cos(o.tour);
            c.scale(Math.abs(f) < 0.18 ? 0.18 * Math.sign(f || 1) : f, 1);
        }
        c.translate(0, o.saut);
        c.rotate(braquage * 0.07);
        const dec = braquage * l * 0.06;     // les roues avant braquent
        const dp = braquage * l * 0.035;     // le pilote se penche dans le virage

        // ── 1. LE TRAIN AVANT : loin, donc petit et haut ────────────────
        c.strokeStyle = '#475569';
        c.lineWidth = Math.max(1.5, l * 0.03);
        c.beginPath(); c.moveTo(X(-0.36) + dec, Y(0.47)); c.lineTo(X(0.36) + dec, Y(0.47)); c.stroke();
        for (const s of [-1, 1]) {
            c.save();
            c.translate(X(0.4 * s) + dec, Y(0.47));
            c.rotate(braquage * 0.3);
            const g = c.createLinearGradient(0, -h * 0.13, 0, h * 0.13);
            g.addColorStop(0, '#64748b'); g.addColorStop(0.3, '#1e293b'); g.addColorStop(1, '#020617');
            c.fillStyle = g;
            rectRond(c, -l * 0.07, -h * 0.13, l * 0.14, h * 0.26, l * 0.055);
            c.fill(); cerner();
            c.restore();
        }

        // ── 2. LE NEZ ET LE PLANCHER ────────────────────────────────────
        c.fillStyle = coque;
        c.beginPath();
        c.moveTo(X(-0.16), Y(0.42));
        c.quadraticCurveTo(X(-0.19), Y(0.6), dec * 0.3, Y(0.63));
        c.quadraticCurveTo(X(0.19), Y(0.6), X(0.16), Y(0.42));
        c.closePath(); c.fill(); cerner();
        c.fillStyle = '#1e293b';
        c.beginPath();
        c.moveTo(X(-0.24), Y(0.46)); c.lineTo(X(0.24), Y(0.46));
        c.lineTo(X(0.34), Y(0.14)); c.lineTo(X(-0.34), Y(0.14));
        c.closePath(); c.fill();

        // ── 3. LES PONTONS : ce qui donne au kart sa forme de flèche ────
        for (const s of [-1, 1]) {
            c.fillStyle = s < 0 ? coque : sombre;
            c.beginPath();
            c.moveTo(X(0.2 * s), Y(0.47));
            c.bezierCurveTo(X(0.33 * s), Y(0.48), X(0.43 * s), Y(0.36), X(0.4 * s), Y(0.18));
            c.lineTo(X(0.25 * s), Y(0.18));
            c.quadraticCurveTo(X(0.21 * s), Y(0.32), X(0.2 * s), Y(0.47));
            c.closePath(); c.fill(); cerner();
        }

        // ── 4. LES ROUES ARRIÈRE : près, donc grosses ───────────────────
        for (const s of [-1, 1]) {
            const x0 = s > 0 ? X(0.31) : X(-0.53);
            const g = c.createLinearGradient(0, Y(0.43), 0, 0);
            g.addColorStop(0, '#7c8aa0'); g.addColorStop(0.16, '#334155');
            g.addColorStop(0.5, '#0f172a'); g.addColorStop(1, '#020617');
            c.fillStyle = g;
            rectRond(c, x0, Y(0.43), X(0.22), h * 0.43, l * 0.085);
            c.fill(); cerner();
            if (fin) {
                // Les sculptures du pneu défilent avec la route.
                c.save();
                rectRond(c, x0, Y(0.43), X(0.22), h * 0.43, l * 0.085);
                c.clip();
                c.strokeStyle = 'rgba(148, 163, 184, 0.42)';
                c.lineWidth = Math.max(1, h * 0.022);
                const phase = ((o.avance || 0) / 150) % 1;
                c.beginPath();
                for (let i = -1; i < 6; i++) {
                    const yy = Y(0.43) + ((i + 1 - phase) / 5) * h * 0.43;
                    c.moveTo(x0, yy); c.lineTo(x0 + X(0.11), yy + h * 0.035); c.lineTo(x0 + X(0.22), yy);
                }
                c.stroke();
                c.restore();
            }
        }

        // ── 5. LE MOTEUR, LES ÉCHAPPEMENTS, LE PARE-CHOCS ───────────────
        c.fillStyle = '#334155';
        rectRond(c, X(-0.31), Y(0.27), X(0.62), h * 0.2, l * 0.04);
        c.fill();
        for (const s of [-1, 1]) {
            const cx = X(0.15 * s), cy = Y(0.145), r = l * 0.05;
            if (o.turbo || o.etoile) {
                const long = h * (0.42 + 0.1 * Math.sin(t * 47 + s * 2.1));
                c.fillStyle = o.etoile ? '#f43f5e' : '#38bdf8';
                c.beginPath();
                c.moveTo(cx - r * 0.95, cy);
                c.quadraticCurveTo(cx, cy + long * 1.15, cx + r * 0.95, cy);
                c.closePath(); c.fill();
                c.fillStyle = '#fef08a';
                c.beginPath();
                c.moveTo(cx - r * 0.5, cy);
                c.quadraticCurveTo(cx, cy + long * 0.7, cx + r * 0.5, cy);
                c.closePath(); c.fill();
            }
            const chrome = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
            chrome.addColorStop(0, '#f8fafc'); chrome.addColorStop(0.6, '#94a3b8'); chrome.addColorStop(1, '#475569');
            c.fillStyle = chrome;
            rond(cx, cy, r, r); c.fill();
            c.fillStyle = (o.turbo || o.etoile) ? '#fde047' : '#0b1220';
            rond(cx, cy, r * 0.58, r * 0.58); c.fill();
        }
        c.fillStyle = pilote.lisere;
        rectRond(c, X(-0.3), Y(0.085), X(0.6), h * 0.055, h * 0.03);
        c.fill(); cerner();

        // ── 6. LE CAPOT ARRIÈRE, SES FEUX, SA PLAQUE ────────────────────
        const robe = c.createLinearGradient(X(-0.34), 0, X(0.34), 0);
        robe.addColorStop(0, sombre); robe.addColorStop(0.28, coque);
        robe.addColorStop(0.45, clair); robe.addColorStop(0.62, coque); robe.addColorStop(1, sombre);
        c.fillStyle = robe;
        c.beginPath();
        c.moveTo(X(-0.34), Y(0.24));
        c.bezierCurveTo(X(-0.35), Y(0.46), X(-0.17), Y(0.53), 0, Y(0.53));
        c.bezierCurveTo(X(0.17), Y(0.53), X(0.35), Y(0.46), X(0.34), Y(0.24));
        c.bezierCurveTo(X(0.2), Y(0.2), X(-0.2), Y(0.2), X(-0.34), Y(0.24));
        c.closePath(); c.fill(); cerner();
        c.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        c.lineWidth = Math.max(1.2, l * 0.016);
        c.beginPath(); c.moveTo(X(-0.24), Y(0.45)); c.quadraticCurveTo(0, Y(0.51), X(0.24), Y(0.45)); c.stroke();
        for (const s of [-1, 1]) {
            if (o.frein) { c.shadowColor = '#f43f5e'; c.shadowBlur = 12; }
            c.fillStyle = o.frein ? '#ffe4e6' : '#b91c1c';
            rectRond(c, X(0.25 * s) - l * 0.045, Y(0.35), l * 0.09, h * 0.055, h * 0.027);
            c.fill();
            c.shadowBlur = 0;
        }
        c.fillStyle = '#ffffff';
        rectRond(c, X(-0.1), Y(0.41), X(0.2), h * 0.15, h * 0.04);
        c.fill(); cerner();
        if (l > 34) {
            c.font = `900 ${Math.max(9, Math.floor(h * 0.14))}px system-ui, sans-serif`;
            c.fillStyle = '#0f172a';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(pilote.num, 0, Y(0.33));
        }

        // ── 7. L'AILERON ────────────────────────────────────────────────
        c.fillStyle = '#334155';
        for (const s of [-1, 1]) c.fillRect(X(0.17 * s) - l * 0.018, Y(0.66), l * 0.036, h * 0.15);
        c.fillStyle = pilote.lisere;
        rectRond(c, X(-0.37), Y(0.705), X(0.74), h * 0.085, h * 0.035);
        c.fill(); cerner();
        c.fillStyle = coque;
        c.fillRect(X(-0.07), Y(0.705) + ep * 0.5, X(0.14), h * 0.085 - ep);
        for (const s of [-1, 1]) {
            rectRond(c, X(0.37 * s) - l * 0.03, Y(0.75), l * 0.06, h * 0.16, l * 0.016);
            c.fill(); cerner();
        }

        // ── 8. LE PILOTE DANS SON BAQUET ────────────────────────────────
        c.fillStyle = pilote.lisere;
        c.beginPath();
        c.moveTo(dp + X(-0.21), Y(0.68));
        c.quadraticCurveTo(dp + X(-0.23), Y(0.93), dp + X(-0.1), Y(0.96));
        c.lineTo(dp + X(0.1), Y(0.96));
        c.quadraticCurveTo(dp + X(0.23), Y(0.93), dp + X(0.21), Y(0.68));
        c.closePath(); c.fill(); cerner();
        c.fillStyle = coque;
        for (const s of [-1, 1]) { rond(dp + X(0.175 * s), Y(0.87), l * 0.05, h * 0.055); c.fill(); }
        if (o.fete) {
            const vague = Math.sin(t * 18) * 0.05;
            c.strokeStyle = pilote.lisere;
            c.lineWidth = Math.max(3, l * 0.06);
            c.beginPath();
            c.moveTo(dp + X(0.18), Y(0.86));
            c.quadraticCurveTo(dp + X(0.3), Y(1.02), dp + X(0.29 + vague), Y(1.22));
            c.stroke();
            c.fillStyle = coque;
            rond(dp + X(0.29 + vague), Y(1.24), l * 0.05, l * 0.05); c.fill(); cerner();
        }
        c.fillStyle = '#1e293b';
        rectRond(c, dp + X(-0.125), Y(0.91), X(0.25), h * 0.27, l * 0.05);
        c.fill();
        c.strokeStyle = coque;
        c.lineWidth = ep * 1.4;
        c.stroke();
        if (fin) {
            c.strokeStyle = 'rgba(148, 163, 184, 0.35)';
            c.lineWidth = ep;
            c.beginPath();
            c.moveTo(dp + X(-0.045), Y(0.86)); c.lineTo(dp + X(-0.045), Y(0.7));
            c.moveTo(dp + X(0.045), Y(0.86)); c.lineTo(dp + X(0.045), Y(0.7));
            c.stroke();
        }
        // L'écharpe, qui claque au vent : c'est elle qu'on suit des yeux.
        const bat = Math.sin(t * 15) * h * 0.06;
        c.strokeStyle = pilote.echarpe;
        c.lineWidth = Math.max(3, l * 0.05);
        c.beginPath();
        c.moveTo(dp + X(0.05), Y(0.95));
        c.bezierCurveTo(dp + X(0.22), Y(1.0) + bat, dp + X(0.34), Y(0.89) - bat, dp + X(0.47), Y(0.96) + bat);
        c.stroke();
        // Le casque, de dos : une bande, un bourrelet à la nuque.
        const rc = l * 0.155, cy = Y(1.1);
        const dome = c.createRadialGradient(dp - rc * 0.35, cy - rc * 0.4, rc * 0.1, dp, cy, rc);
        dome.addColorStop(0, '#ffffff'); dome.addColorStop(0.3, pilote.casque);
        dome.addColorStop(1, meler(pilote.casque, '#0f172a', 0.6));
        c.fillStyle = dome;
        rond(dp, cy, rc, rc); c.fill();
        c.save();
        rond(dp, cy, rc, rc); c.clip();
        c.fillStyle = pilote.lisere;
        c.fillRect(dp - rc * 0.24, cy - rc, rc * 0.48, rc * 2);
        c.fillStyle = pilote.echarpe;
        c.fillRect(dp - rc * 0.07, cy - rc, rc * 0.14, rc * 2);
        c.fillStyle = 'rgba(15, 23, 42, 0.55)';
        c.fillRect(dp - rc, cy + rc * 0.62, rc * 2, rc);
        c.restore();
        rond(dp, cy, rc, rc); cerner();

        if (o.bouclier) {
            const rb = l * 0.74 * (1 + Math.sin(t * 8) * 0.03);
            const bulle = c.createRadialGradient(0, Y(0.62), rb * 0.2, 0, Y(0.62), rb);
            bulle.addColorStop(0, 'rgba(56, 189, 248, 0.06)');
            bulle.addColorStop(0.75, 'rgba(56, 189, 248, 0.26)');
            bulle.addColorStop(1, 'rgba(186, 230, 253, 0.72)');
            c.fillStyle = bulle;
            rond(0, Y(0.62), rb, rb); c.fill();
            c.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            c.lineWidth = 3;
            c.beginPath(); c.arc(0, Y(0.62), rb * 0.82, Math.PI * 1.18, Math.PI * 1.48); c.stroke();
        }
        c.restore();

        if (o.nom && l > 28) {
            const corps = Math.max(10, Math.min(15, Math.floor(l * 0.15)));
            c.font = `800 ${corps}px system-ui, sans-serif`;
            const tl = c.measureText(pilote.nom).width + 14, th = corps + 7;
            const ty = y - h * 1.36 - th;
            c.fillStyle = 'rgba(15, 23, 42, 0.78)';
            rectRond(c, x - tl * 0.5, ty, tl, th, th * 0.5);
            c.fill();
            c.fillStyle = '#ffffff';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(pilote.nom, x, ty + th * 0.52);
        }
    }

    /* ── PAR-DESSUS TOUT ───────────────────────────────────────────────── */

    dessinerEffets(c, larg, haut) {
        const k = this.course, t = this.temps;
        for (const g of this.gerbes) {
            c.globalAlpha = Math.max(0, 1 - g.vie / g.max);
            c.fillStyle = g.couleur;
            c.beginPath(); c.arc(g.x, g.y, g.r, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;

        // Les traits de vitesse : ils rayonnent du point de fuite quand on file.
        if ((k.turbo > 0 || k.etoile > 0) && k.etat === 'course') {
            const cx = larg * 0.5, cy = this.horizon, portee = Math.hypot(larg, haut) * 0.55;
            c.strokeStyle = 'rgba(224, 242, 254, 0.5)';
            c.lineWidth = 2.2;
            c.lineCap = 'round';
            c.beginPath();
            for (let i = 0; i < 16; i++) {
                const a = i * 2.399963;
                const d = portee * (0.35 + ((t * 1.9 + i * 0.137) % 0.65));
                const lg = portee * 0.09;
                c.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
                c.lineTo(cx + Math.cos(a) * (d + lg), cy + Math.sin(a) * (d + lg));
            }
            c.stroke();
        }

        // Les coins s'assombrissent un peu : l'oeil reste sur la route.
        if (!this.voileCoins) {
            const g = c.createRadialGradient(larg / 2, haut * 0.55, Math.min(larg, haut) * 0.45,
                larg / 2, haut * 0.55, Math.hypot(larg, haut) * 0.62);
            g.addColorStop(0, 'rgba(2, 6, 23, 0)');
            g.addColorStop(1, 'rgba(2, 6, 23, 0.38)');
            this.voileCoins = g;
        }
        c.fillStyle = this.voileCoins;
        c.fillRect(0, 0, larg, haut);

        if (k.flash > 0) {
            c.fillStyle = `rgba(254, 249, 195, ${Math.min(0.85, k.flash * 1.7)})`;
            c.fillRect(0, 0, larg, haut);
        }
    }

    /* ─────────────────────────────────────────────────────────────────────
     * LA DÉMONSTRATION
     * ─────────────────────────────────────────────────────────────────────
     *
     * Trois portiques : un juste, un FAUX exprès, un juste. Montrer l'erreur
     * fait partie de la consigne — on y voit le kart tousser, l'arche du bon
     * résultat s'allumer en vert, et la correction s'écrire sous le calcul.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const robot = meneurDemo(cur, gate, () => this.isRunning,
            () => { this.demoCursor = null; this.demoGate = null; });
        const fin = () => robot.fin();
        const k = this.course;

        /** Rouler jusqu'à ce que le portique `i` soit à `part` de son approche. */
        const jusqua = async (i, part) => {
            while (this.isRunning && k.actif === i && k.approche < part) {
                if (!await robot.pause(40)) return false;
            }
            return this.isRunning;
        };
        const passer = async (i) => {
            while (this.isRunning && k.actif === i) if (!await robot.pause(40)) return false;
            return this.isRunning;
        };

        if (!await robot.pause(400)) return fin();
        cur.say('Le calcul est écrit en haut. Trois résultats arrivent : un par voie.', this.el.question);
        if (!await jusqua(0, 0.45)) return fin();
        let p = k.portiques[0];
        cur.say(`${p.texte} = ${p.juste} : je touche ce résultat, et mon kart y va.`, this.wrap);
        k.viser(p.voieJuste);
        if (!await passer(0)) return fin();

        if (!await jusqua(1, 0.4)) return fin();
        p = k.portiques[1];
        const faux = [0, 1, 2].find((v) => v !== p.voieJuste);
        cur.say('Si je me trompe de voie…', this.wrap);
        k.viser(faux);
        if (!await passer(1)) return fin();
        cur.say('… le kart tousse, la bonne arche s\'allume en vert, et la correction s\'écrit ici.',
            this.el.retour);
        if (!await robot.attendre(DEMO_SPEED.between)) return fin();

        if (!await jusqua(2, 0.3)) return fin();
        p = k.portiques[2];
        cur.say('Pas sûr ? Le frein te laisse le temps de finir ton calcul.', this.el.frein);
        k.freiner(true);
        if (!await jusqua(2, 0.8)) return fin();
        k.freiner(false);
        k.viser(p.voieJuste);
        if (!await passer(2)) return fin();
        cur.say(`${SERIE_BONUS} bons résultats d'affilée, et tu gagnes un bonus.`, this.el.bonus);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    startGameLoop() { /* tout part de render(), et du bouton « Départ ! » */ }

    destroy() {
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        if (this.el) [this.el.retour, this.el.annonce].forEach((e) => clearTimeout(e._tempo));
        if (this.detacher) this.detacher();
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineMultiKart(container, isDemo, params) {
    const game = new MultiKart(container, isDemo, params);
    game.start();
    return game;
}
