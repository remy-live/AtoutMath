// LE DUEL DES TABLES — un Pong à deux, sur une seule tablette.
//
// La tablette se pose à plat entre les deux joueurs. La moitié du haut est
// retournée à 180° : chacun lit à l'endroit, chacun a son pavé sous les
// doigts. Le serveur choisit une table — c'est là qu'est le chambrage, « tiens,
// je te mets du 8 » — puis la balle fait des allers-retours, et CHAQUE frappe
// demande un calcul, des deux côtés. Elle accélère à chaque renvoi.
//
// Rien n'est enregistré au carnet. Deux enfants jouent sur un seul profil :
// attribuer à l'un les réponses de l'autre fausserait ses statistiques pour de
// bon. Un duel est un duel, il se joue et il s'oublie.
//
// Le multi-tactile tient en trois précautions, et elles sont toutes les trois
// nécessaires :
//   · on écoute `pointerdown`, jamais `click` — le clic sérialise les entrées
//     et perd un appui quand les deux joueurs tapent au même instant ;
//   · `touch-action: none` sur le plateau, sinon le navigateur préempte le
//     doigt pour faire défiler ou zoomer ;
//   · chaque moitié a ses propres écouteurs, donc deux `pointerId` différents
//     ne se croisent jamais.

import { BaseGame } from '../core/BaseGame.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED, dureeDemo } from '../core/demoPointer.js';
import {
    creerPartie, servir, repondre, manquer, pointSuivant, composerFrappe,
    dureeVol, longueurReponse, tablesValides, BORNES_COMPOSE
} from '../core/duel.js';

const NOMS = ['Joueur 1', 'Joueur 2'];

class Duel extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'duel');
        this.partie = creerPartie({
            tables: tablesValides(this.params.tables),
            operations: this.params.operations === 'muldiv' ? ['mul', 'div'] : ['mul'],
            cible: parseInt(this.params.cible) || 7,
            envoi: this.params.envoi === 'compose' ? 'compose' : 'auto',
            rythme: this.params.rythme
        });
        this.saisie = ['', ''];
        this.prets = [false, false];
        this.vol = null;          // { debut, duree, de, vers }
        // La brique en cours de fabrication (mode composé) : deux facteurs, et
        // celui des deux qu'on est en train de taper.
        this.brique = { a: '', b: '', sur: 'a' };
    }

    render() {
        const p = this.partie;
        this.container.innerHTML = `
            <style>
                /* LE TERRAIN PREND TOUT CE QUI RESTE.
                   Les deux camps se partageaient l'écran en trois tiers égaux
                   (1fr auto 1fr) : chacun gardait près de 300 px pour un
                   clavier qui en occupe 58, et le couloir où circule la balle
                   — le jeu lui-même — se retrouvait à 21 % de la surface. Les
                   camps sont maintenant dimensionnés PAR LEUR CONTENU (auto),
                   et le terrain reçoit la ligne 1fr. Un camp fait la hauteur
                   de son bandeau, de sa saisie et de sa rangée de touches, pas
                   un millimètre de plus. */
                .du-plateau {
                    width: 100%; height: 100%;
                    display: grid; grid-template-rows: auto minmax(0, 1fr) auto;
                    gap: 0; touch-action: none; user-select: none;
                    -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
                    background: #0b1120; border-radius: 16px; overflow: hidden;
                    position: relative; container-type: size; container-name: duel;
                }
                /* La moitié du haut est retournée : la tablette est posée à
                   plat entre deux joueurs qui se font face. */
                .du-cote--haut { transform: rotate(180deg); }
                /* L'enveloppe ne sert qu'en paysage, pour porter la rotation
                   d'un quart de tour. En portrait elle se fond dans son
                   parent : display:contents la retire de la mise en page
                   sans toucher au balisage. */
                .du-cote-inner { display: contents; }
                .du-cote {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: flex-start; gap: 4px; padding: 6px 10px;
                    min-height: 0; position: relative;
                }
                /* La teinte du camp passe par une VARIABLE, pas par
                   currentColor : dans une règle qui déclare aussi sa propre
                   couleur de texte, currentColor prend CELLE-LÀ, pas celle
                   héritée. Les boutons de table s'affichaient donc en sombre
                   sur sombre — invisibles. */
                .du-cote--0 { --du-teinte: #a78bfa; color: #a78bfa;
                              background: linear-gradient(180deg, #1e1b4b, #0b1120); }
                .du-cote--1 { --du-teinte: #38bdf8; color: #38bdf8;
                              background: linear-gradient(0deg, #082f49, #0b1120); }
                .du-cote--actif::after {
                    content: ''; position: absolute; inset: 3px; border-radius: 12px;
                    border: 2px solid var(--du-teinte); opacity: .55; pointer-events: none;
                    animation: du-respire 1.1s ease-in-out infinite;
                }
                @keyframes du-respire { 50% { opacity: .15 } }
                /* « Prêt » : le camp s'éclaire, l'autre joueur voit qu'on
                   n'attend plus que lui. */
                .du-cote--pret { box-shadow: inset 0 0 0 3px var(--du-teinte); }

                /* Le nom, le score et la consigne sur UNE ligne : trois lignes
                   empilées coûtaient soixante pixels par camp, pris sur le
                   terrain. */
                .du-tete {
                    display: flex; align-items: baseline; gap: 7px; width: 100%;
                    justify-content: center; color: #e2e8f0; font-weight: 800;
                    font-size: clamp(.66rem, 1.9cqh, .9rem); flex-shrink: 0;
                    min-height: 1.3em; overflow: hidden;
                }
                .du-nom { opacity: .75; flex-shrink: 0; }
                .du-pts {
                    background: #f8fafc; color: #0b1120; border-radius: 999px;
                    min-width: 1.8em; text-align: center; padding: 1px 9px;
                    font-weight: 900; font-variant-numeric: tabular-nums;
                    font-size: 1.15em; flex-shrink: 0;
                }
                .du-etat {
                    color: #cbd5e1; font-weight: 700; text-align: left;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    min-width: 0;
                }
                /* CE QU'ON TAPE DOIT SE VOIR COMME UN ÉCRAN.
                   Rémy : « sur mon iPhone, on ne voit toujours pas ». Le
                   nombre était posé nu sur le fond du camp : vide, il ne
                   restait qu'un point gris de deux pixels, et rien ne disait
                   OÙ la réponse allait s'écrire. Un cadre aux couleurs du camp
                   règle la question avant même qu'on ait tapé. */
                .du-saisie {
                    font-weight: 900; color: #f8fafc; letter-spacing: .06em;
                    font-size: clamp(1.2rem, 5.2cqh, 2.3rem); line-height: 1.05;
                    font-variant-numeric: tabular-nums; min-height: 1em; flex-shrink: 0;
                    min-width: 2.6em; text-align: center; padding: 1px .35em;
                    border: 2px solid color-mix(in srgb, var(--du-teinte) 55%, transparent);
                    border-radius: 10px; background: rgba(2, 6, 23, .75);
                }
                .du-saisie--vide { color: #64748b; }

                /* Un display:grid posé sur une classe l'emporte sur l'attribut
                   hidden, qui ne vaut qu'une règle du navigateur : sans ces
                   deux lignes, le pavé ET les tables restaient affichés en
                   même temps, chacun sur la moitié de l'autre. */
                .du-pave[hidden], .du-tables[hidden], .du-brique[hidden] { display: none; }
                /* EN ATTENTE, PAS ÉTEINT. À trois dixièmes d'opacité sur un
                   fond presque noir, les touches du joueur qui ne joue pas
                   disparaissaient : on ne voyait plus qu'il avait un clavier,
                   et sur un téléphone on ne le voyait pas du tout. Elles
                   restent lisibles — c'est le curseur qui dit qu'elles ne
                   répondent pas, pas leur effacement. */
                .du-pave--inerte { opacity: .62; pointer-events: none; }
                /* UNE SEULE RANGÉE de chiffres, collée au bord du joueur.
                   En deux rangées de six, le pavé mangeait la moitié de son
                   camp : c'est le COULOIR où circule la balle qui doit avoir
                   la place, pas le clavier. Onze touches sur une ligne restent
                   largement tapables au pouce, et le joueur garde les yeux sur
                   le jeu au lieu de chercher une touche dans une grille. */
                .du-pave--compose { grid-template-columns: repeat(13, 1fr) !important; }
                .du-pave {
                    display: grid; grid-template-columns: repeat(11, 1fr);
                    grid-auto-rows: minmax(0, 1fr);
                    gap: clamp(2px, .8cqh, 6px); width: 100%; max-width: 560px;
                    flex: 0 0 auto; min-height: 0;
                    height: clamp(38px, 7.5cqh, 62px);
                }
                .du-touche {
                    border: 0; border-radius: 10px; font-weight: 900;
                    font-size: clamp(.9rem, 4.2cqh, 1.7rem);
                    background: #1e293b; color: #f1f5f9;
                    box-shadow: inset 0 -3px 0 rgba(0,0,0,.35);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; touch-action: none; min-height: 0;
                }
                .du-touche--enfoncee { background: #475569; box-shadow: none; transform: translateY(2px); }
                .du-touche--eff { background: #7c2d12; color: #fed7aa; }

                /* Les tables du service : elles remplacent le pavé le temps du
                   choix. Deux rangées de gros boutons, un geste, la balle part. */
                /* Les tables du service : UNE rangée, exactement la place du
                   pavé. Sur deux rangées étirées (flex: 1), le camp du
                   serveur était plus haut de quarante pixels que celui du
                   receveur — le filet n'était plus au milieu, et le terrain
                   changeait de taille à chaque service. Même hauteur des deux
                   côtés, à toutes les phases : le couloir ne bouge plus. */
                .du-tables {
                    display: grid; grid-auto-flow: column;
                    grid-auto-columns: minmax(0, 1fr);
                    gap: clamp(2px, .8cqh, 6px); width: 100%; max-width: 560px;
                    flex: 0 0 auto; min-height: 0;
                    height: clamp(38px, 7.5cqh, 62px);
                }
                .du-table {
                    border: 0; border-radius: 10px; font-weight: 900;
                    font-size: clamp(.72rem, 3.2cqh, 1.25rem);
                    background: var(--du-teinte); color: #0b1120;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; touch-action: none; min-height: 0;
                    box-shadow: inset 0 -3px 0 rgba(0,0,0,.3);
                }
                .du-table--enfoncee { transform: translateY(2px); box-shadow: none; }

                /* Le terrain : la bande centrale que la balle traverse. Sa
                   hauteur n'est plus fixée — il occupe la ligne 1fr de la
                   grille, c'est-à-dire tout ce que les deux camps ne prennent
                   pas. */
                .du-terrain {
                    position: relative; min-height: 96px;
                    background: #020617; border-top: 2px solid #1e293b; border-bottom: 2px solid #1e293b;
                    overflow: hidden;
                }
                .du-filet {
                    position: absolute; left: 0; right: 0; top: 50%;
                    border-top: 3px dashed #334155;
                }
                .du-balle {
                    position: absolute; left: 50%; top: 0;
                    transform: translate(-50%, -50%);
                    display: flex; align-items: center; justify-content: center;
                    padding: 6px 16px; border-radius: 999px;
                    font-weight: 900; font-size: clamp(1.1rem, 6cqh, 2.2rem);
                    background: #f8fafc; color: #0f172a;
                    box-shadow: 0 0 26px rgba(248,250,252,.55);
                    white-space: nowrap; opacity: 0;
                }
                .du-balle--vivante { opacity: 1; }
                /* LA BRIQUE PORTE LA COULEUR DE CELUI QUI L'A ENVOYÉE.
                   Rémy : « il faudrait aussi avoir un repère de l'élève qui
                   envoie le calcul. » Elle prenait la couleur de sa
                   DESTINATION : impossible de savoir d'où venait « 7 × 8 »,
                   donc impossible de savoir à qui en vouloir. Le halo dit
                   maintenant l'expéditeur, et une petite flèche redit le sens
                   du vol pour ceux qui ne lisent pas les couleurs. */
                .du-balle--de-0 { background: #ede9fe; color: #2e1065;
                    box-shadow: 0 0 26px rgba(167,139,250,.9), 0 0 0 3px rgba(167,139,250,.55); }
                .du-balle--de-1 { background: #e0f2fe; color: #082f49;
                    box-shadow: 0 0 26px rgba(56,189,248,.9), 0 0 0 3px rgba(56,189,248,.55); }
                .du-balle-sens { opacity: .55; font-size: .7em; margin-left: .35em; }

                /* L'IMPACT : « quand un joueur a donné une bonne réponse, il
                   faudrait qu'on voie que ça fonctionne — une explosion. »
                   Une brique renvoyée disparaissait et une autre repartait :
                   rien ne disait qu'on venait de la TOUCHER. L'anneau part de
                   la ligne du défenseur au moment exact du renvoi. */
                .du-impact {
                    position: absolute; width: 26px; height: 26px; border-radius: 50%;
                    transform: translate(-50%, -50%); pointer-events: none; opacity: 0;
                    border: 3px solid #fff; z-index: 4;
                }
                .du-impact--part { animation: du-impact .42s cubic-bezier(.2,.7,.4,1) forwards; }
                @keyframes du-impact {
                    0% { opacity: 1; transform: translate(-50%, -50%) scale(.35); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(5.2); }
                }
                .du-impact--0 { border-color: #a78bfa; box-shadow: 0 0 22px rgba(167,139,250,.9); }
                .du-impact--1 { border-color: #38bdf8; box-shadow: 0 0 22px rgba(56,189,248,.9); }
                /* Le camp qui vient de renvoyer flashe une fois : le retour est
                   là où l'on regarde, c'est-à-dire chez soi. */
                .du-cote--frappe { animation: du-frappe .38s ease-out; }
                @keyframes du-frappe {
                    0% { box-shadow: inset 0 0 0 0 var(--du-teinte); }
                    35% { box-shadow: inset 0 0 44px -4px var(--du-teinte); }
                    100% { box-shadow: inset 0 0 0 0 var(--du-teinte); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .du-impact--part, .du-cote--frappe { animation-duration: .01ms; }
                }

                /* LE CAMP QUI ENVOIE. Un liseré plein du côté de l'expéditeur,
                   pendant tout le vol : on sait qui a servi cette brique-là. */
                .du-cote--envoie { box-shadow: inset 0 0 0 3px var(--du-teinte); }

                /* LA BRIQUE EN FABRICATION (mode composé). Elle se remplit
                   sous les doigts de celui qui la compose — c'est le « on voit
                   la brique qui se prépare » de la demande. */
                .du-brique {
                    display: flex; align-items: center; gap: 6px;
                    background: #0f172a; border: 2px dashed var(--du-teinte);
                    border-radius: 12px; padding: 3px 14px; color: #f8fafc;
                    font-weight: 900; font-size: clamp(1.1rem, 5cqh, 2.1rem);
                    font-variant-numeric: tabular-nums; min-height: 1.4em;
                }
                .du-brique--prete { border-style: solid; background: var(--du-teinte); color: #0b1120; }
                .du-brique-case { min-width: 1.6em; text-align: center; }
                .du-brique-case--vise { text-decoration: underline; text-underline-offset: .18em; }
                .du-brique-case--vide { opacity: .4; }
                .du-touche--fois { background: #334155; color: #fde68a; }
                .du-touche--lancer { background: #15803d; color: #dcfce7; }
                .du-touche--lancer:disabled { opacity: .45; }

                /* Écran de fin et écran de départ : posés SUR le terrain, pas
                   à la place — le score reste lisible pendant l'annonce. */
                /* L'annonce est écrite DEUX FOIS, tête-bêche. Les deux joueurs
                   se font face : un seul texte, quel que soit son sens, serait
                   à l'envers pour l'un des deux — et c'est précisément le
                   moment où l'on veut que les deux lisent la même chose en
                   même temps. */
                .du-voile {
                    position: absolute; inset: 0; z-index: 5;
                    display: flex; flex-direction: column;
                    align-items: stretch; justify-content: space-between;
                    background: rgba(2,6,23,.92); text-align: center; padding: 6px;
                }
                .du-voile[hidden] { display: none; }
                .du-annonce {
                    flex: 1 1 0; min-height: 0;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center; gap: 3px;
                }
                .du-annonce--haut { transform: rotate(180deg); }
                .du-voile h4 {
                    margin: 0; color: #fde68a; font-size: clamp(.9rem, 4.4cqh, 1.6rem); font-weight: 900;
                }
                .du-voile p { margin: 0; color: #cbd5e1; font-size: clamp(.65rem, 2.4cqh, .95rem); }
                .du-rejouer {
                    border: 0; border-radius: 999px; padding: 8px 20px; font-weight: 900;
                    background: #22c55e; color: #04240f; cursor: pointer;
                    font-size: clamp(.75rem, 3cqh, 1.05rem); touch-action: none;
                }

                /* PAYSAGE : LE PLATEAU TOURNE D'UN QUART DE TOUR.
                   Coupé en haut et en bas, chaque camp n'avait plus que deux
                   cents pixels de haut : des touches de 26 px, une saisie
                   minuscule et un couloir où la balle traversait en trois
                   centimètres. Coupé à GAUCHE et à DROITE, chaque camp
                   récupère toute la hauteur de l'écran, et le couloir toute sa
                   largeur — c'est-à-dire le côté long.
                   Les deux joueurs se placent alors aux deux bouts : leur
                   moitié pivote de 90° pour qu'ils lisent à l'endroit. Une
                   rotation change ce qu'on VOIT, pas la boîte : le contenu est
                   donc dimensionné avec les côtés échangés (100cqh de large
                   pour une colonne haute de tout l'écran) avant d'être
                   tourné.
                   La requête porte sur le conteneur PARENT : une requête de
                   conteneur style les descendants du conteneur nommé, jamais
                   le conteneur lui-même — les règles visant .du-plateau ne
                   s'appliquaient donc pas, et le plateau restait en rangées. */
                @container plateau (min-aspect-ratio: 13/10) and (min-height: 520px) {
                    /* En paysage, le camp est une BANDE de largeur fixe le
                       long du bord, et le couloir prend tout le milieu — même
                       principe qu'en portrait, un quart de tour plus loin. La
                       largeur ne peut pas se déduire du contenu ici : il est
                       pivoté, donc c'est sa HAUTEUR à plat qui deviendra la
                       largeur de la bande. On la nomme, et les deux s'y
                       réfèrent. */
                    .du-plateau {
                        --camp: clamp(128px, 21cqw, 186px);
                        grid-template-rows: 1fr;
                        grid-template-columns: var(--camp) minmax(120px, 1fr) var(--camp);
                    }
                    .du-terrain { height: auto; min-height: 0; border: 0;
                                  border-left: 2px solid #1e293b; border-right: 2px solid #1e293b; }
                    .du-filet { top: 0; bottom: 0; left: 50%; right: auto;
                                border-top: 0; border-left: 3px dashed #334155; }
                    .du-cote {
                        overflow: hidden; padding: 0;
                        align-items: center; justify-content: center;
                    }
                    /* La moitié se dessine à plat, aux dimensions échangées,
                       puis pivote autour de son centre. */
                    .du-cote--haut { transform: none; }
                    .du-cote-inner {
                        width: 100cqh; height: var(--camp);
                        display: flex; flex-direction: column; align-items: center;
                        justify-content: center; gap: 4px; padding: 5px 10px;
                        box-sizing: border-box;
                    }
                    .du-cote--0 .du-cote-inner { transform: rotate(90deg); }
                    .du-cote--1 .du-cote-inner { transform: rotate(-90deg); }
                    /* La bande s'élargit pour loger deux rangées de touches :
                       en une seule, elles tombaient à dix-neuf pixels. */
                    .du-pave, .du-tables { max-width: min(620px, 94cqh); }
                    .du-pave, .du-tables { height: clamp(64px, 13cqw, 104px); }
                    .du-tete { font-size: clamp(.62rem, 1.7cqw, .85rem); }
                    .du-saisie { font-size: clamp(1.1rem, 4.6cqw, 2rem); }
                    .du-annonce--haut { transform: rotate(180deg); }
                }
                /* Écran court MAIS étroit (téléphone en paysage serré) : on
                   garde la coupe haut/bas et on resserre. */
                @container plateau (max-height: 640px) {
                    .du-cote { padding: 4px 8px; gap: 3px; }
                    /* ÉCRAN COURT : LE BANDEAU ET L'ÉCRAN DE SAISIE SE METTENT
                       SUR LA MÊME LIGNE. Empilés, ils coûtaient soixante-dix
                       pixels par camp — cent quarante pris au couloir sur un
                       écran qui n'en a que trois cent quatre-vingt-dix. Côte à
                       côte, ils en coûtent trente-cinq. */
                    .du-cote { flex-flow: row wrap; align-items: center;
                               justify-content: center; column-gap: 10px; }
                    .du-tete { width: auto; flex: 0 1 auto; }
                    .du-saisie { flex: 0 0 auto; }
                    .du-pave, .du-tables, .du-brique { flex-basis: 100%; }
                    .du-pave, .du-tables { max-width: 820px; height: clamp(46px, 12cqh, 62px); }
                    .du-saisie { font-size: clamp(1.1rem, 6cqh, 1.9rem); }
                    .du-tete { font-size: clamp(.62rem, 2.4cqh, .85rem); }
                }

                /* TÉLÉPHONE : LA RANGÉE UNIQUE, ET DES TOUCHES HAUTES.
                   CE BLOC VIENT EN DERNIER : les paliers de resserrement plus
                   haut fixent eux aussi la hauteur du pavé, et une requête de
                   conteneur n'ajoute aucune spécificité — seul l'ordre tranche. */
                @container plateau (max-width: 560px) {
                    /* UNE SEULE RANGÉE DE CHIFFRES, MÊME SUR UN TÉLÉPHONE.
                       Rémy, deux fois : « pour le duel à deux, le mieux serait
                       une seule rangée de chiffres en bas, là ça prend tellement
                       de place », puis « une seule rangée de chiffres et tout le
                       reste le plateau de jeu ». J'avais replié le pavé en deux
                       rangées de six pour élargir les touches — et j'avais donc
                       repris d'une main la place qu'il demandait de rendre.
                       Onze touches sur 390 px font 33 px de large ; on les fait
                       HAUTES, ce qui donne une cible de 33 × 58 — un pouce
                       s'appuie large et court, pas l'inverse — et le couloir
                       récupère soixante pixels. */
                    .du-pave, .du-tables { height: clamp(48px, 11cqh, 74px); }
                    /* TOUT CE QUE L'ÉCRAN A. Rémy, deux bancs de suite : « on ne
                       voit toujours pas bien pour le duel ». Sur un iPhone, le
                       plateau perdait quarante pixels de large et autant de haut
                       dans la marge du cadre de jeu — un huitième de la surface,
                       pris à un jeu où DEUX joueurs se partagent déjà l'écran.
                       Le duel est le seul jeu qui se joue à deux sur le même
                       appareil : c'est celui qui a le plus besoin de ses bords. */
                    .du-tete { font-size: clamp(.72rem, 2.8cqh, .95rem); }
                    .du-saisie { font-size: clamp(1.4rem, 6.4cqh, 2.3rem); }
                    .du-touche { font-size: clamp(1.05rem, 5cqh, 1.7rem); }
                    .du-table { font-size: clamp(.82rem, 3.8cqh, 1.25rem); }
                }
                @media (max-width: 560px) {
                    .canvas-area:has(.du-plateau) { padding: 0; }
                    .du-plateau { border-radius: 0; }
                }
                /* Même règle en bande latérale, où la touche tombait à dix-neuf
                   pixels. La profondeur de la bande se mesure alors sur la
                   LARGEUR du plateau : c'est elle qui la porte une fois pivotée. */
                /* En bande latérale, la rangée unique est LONGUE (elle court sur
                   toute la hauteur de l'écran une fois pivotée) : elle n'a pas
                   besoin de se replier, et la bande reste peu profonde. */
                @container plateau (min-aspect-ratio: 13/10) and (min-height: 520px) {
                    .du-pave, .du-tables { height: clamp(52px, 10cqw, 92px); }
                }
            </style>
            <div class="du-plateau" data-plateau>
                ${this.cote(0)}
                <div class="du-terrain" data-terrain>
                    <div class="du-filet"></div>
                    <div class="du-balle" data-balle></div>
                    <div class="du-impact" data-impact></div>
                    <div class="du-voile" data-voile hidden>
                        ${[0, 1].map(i => `
                        <div class="du-annonce ${i === 0 ? 'du-annonce--haut' : ''}">
                            <h4 data-voile-titre></h4>
                            <p data-voile-texte></p>
                            <button type="button" class="du-rejouer" data-rejouer hidden>Rejouer</button>
                        </div>`).join('')}
                    </div>
                </div>
                ${this.cote(1)}
            </div>
        `;

        this.plateau = this.container.querySelector('[data-plateau]');
        this.terrain = this.container.querySelector('[data-terrain]');
        this.balleEl = this.container.querySelector('[data-balle]');
        this.impactEl = this.container.querySelector('[data-impact]');
        this.voile = this.container.querySelector('[data-voile]');
        this.cotes = [0, 1].map(i => this.container.querySelector(`[data-cote="${i}"]`));

        this.brancher();
        this.majEcran();
        this.annoncer('LE DUEL', `Premier à ${p.cible} points. Chacun tape sur SA moitié — appuyez tous les deux pour commencer.`);
    }

    cote(i) {
        const tables = this.partie.tables;
        return `
            <section class="du-cote du-cote--${i} ${i === 0 ? 'du-cote--haut' : ''}" data-cote="${i}">
              <div class="du-cote-inner">
                <div class="du-tete">
                    <span class="du-nom">${NOMS[i]}</span>
                    <span class="du-pts" data-pts="${i}">0</span>
                    <span class="du-etat" data-etat="${i}"></span>
                </div>
                <div class="du-saisie du-saisie--vide" data-saisie="${i}">—</div>
                <div class="du-brique" data-brique="${i}" hidden>
                    <span class="du-brique-case" data-brique-a>·</span>
                    <span>×</span>
                    <span class="du-brique-case" data-brique-b>·</span>
                </div>
                <div class="du-pave" data-pave="${i}">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n =>
            `<button type="button" class="du-touche" data-touche="${n}">${n}</button>`).join('')}
                    <button type="button" class="du-touche du-touche--eff" data-touche="eff">⌫</button>
                </div>
                <!-- LE PAVÉ DU FABRICANT : les mêmes chiffres, plus la touche
                     « × » qui passe au second facteur et « ▶ » qui lance la
                     brique. Un pavé distinct plutôt qu'un pavé qui change de
                     touches : au milieu d'un duel, un clavier qui se
                     réorganise fait perdre le point. -->
                <div class="du-pave du-pave--compose" data-compose="${i}" hidden>
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n =>
            `<button type="button" class="du-touche" data-cmp="${n}">${n}</button>`).join('')}
                    <button type="button" class="du-touche du-touche--eff" data-cmp="eff">⌫</button>
                    <button type="button" class="du-touche du-touche--fois" data-cmp="fois">×</button>
                    <button type="button" class="du-touche du-touche--lancer" data-cmp="lancer">▶</button>
                </div>
                <div class="du-tables" data-tables="${i}" hidden>
                    ${tables.map(t => `<button type="button" class="du-table" data-table="${t}">×${t}</button>`).join('')}
                </div>
              </div>
            </section>
        `;
    }

    // --- Entrées ------------------------------------------------------------

    brancher() {
        this.cotes.forEach((section, i) => {
            // Un seul écouteur par moitié, sur `pointerdown` : deux doigts
            // posés au même instant produisent deux événements distincts, avec
            // deux `pointerId`. C'est tout ce qu'il faut pour le jeu à deux.
            section.addEventListener('pointerdown', (e) => {
                if (this.isDemo) return;
                const btn = e.target.closest('button');
                if (!btn) {
                    // Appui SUR SA MOITIÉ, hors des touches : c'est le « je
                    // suis prêt » que réclame l'annonce de départ. Sans lui,
                    // l'écran disait « appuyez tous les deux pour commencer »
                    // et rien n'écoutait : le duel ne démarrait que si l'un
                    // des deux devinait qu'il fallait taper une table.
                    this.direPret(i);
                    return;
                }
                e.preventDefault();
                this.enfoncer(btn);
                if (btn.dataset.table) this.choisirTable(i, Number(btn.dataset.table));
                else if (btn.dataset.cmp) this.composer(i, btn.dataset.cmp);
                else if (btn.dataset.touche) this.taper(i, btn.dataset.touche);
                else if (btn.dataset.rejouer !== undefined) this.rejouer();
            });
            section.addEventListener('pointerup', (e) => {
                const btn = e.target.closest('button');
                if (btn) btn.classList.remove('du-touche--enfoncee', 'du-table--enfoncee');
            });
            section.addEventListener('pointercancel', () => {
                section.querySelectorAll('button').forEach(b =>
                    b.classList.remove('du-touche--enfoncee', 'du-table--enfoncee'));
            });
        });
        // Le voile (départ, fin de partie) est commun aux deux moitiés.
        this.voile.addEventListener('pointerdown', (e) => {
            const btn = e.target.closest('[data-rejouer]');
            if (!btn || this.isDemo) return;
            e.preventDefault();
            this.rejouer();
        });
    }

    enfoncer(btn) {
        btn.classList.add(btn.dataset.table ? 'du-table--enfoncee' : 'du-touche--enfoncee');
        setTimeout(() => btn.classList.remove('du-touche--enfoncee', 'du-table--enfoncee'), 140);
    }

    choisirTable(cote, table) {
        const p = this.partie;
        if (p.phase === 'point') pointSuivant(p);
        if (p.phase !== 'service' || cote !== p.serveur) return;
        // Le service efface l'annonce en cours : la consigne de départ ne doit
        // pas rester posée sur le terrain pendant le premier échange.
        clearTimeout(this.minuteurAnnonce);
        this.voile.hidden = true;
        servir(p, table, Math.random);
        this.saisie = ['', ''];
        this.lancerVol();
        this.majEcran();
    }

    /**
     * FABRIQUER SA BRIQUE, puis la lancer.
     *
     * Les chiffres remplissent le facteur visé, « × » passe au second, « ▶ »
     * envoie. Le refus est EXPLIQUÉ dans l'état du camp plutôt que silencieux :
     * un bouton qui ne fait rien passe pour cassé, et « 3 × 4 » quand on
     * travaille la table de 7 est une erreur de règle, pas une maladresse.
     */
    composer(cote, touche) {
        const p = this.partie;
        if (p.phase === 'point') pointSuivant(p);
        if (p.phase !== 'composer' || cote !== p.attaquant) return;
        clearTimeout(this.minuteurAnnonce);
        this.voile.hidden = true;
        const b = this.brique;

        if (touche === 'eff') {
            if (b[b.sur]) b[b.sur] = b[b.sur].slice(0, -1);
            else if (b.sur === 'b') { b.sur = 'a'; b.a = b.a.slice(0, -1); }
        } else if (touche === 'fois') {
            if (b.a) b.sur = 'b';
        } else if (touche === 'lancer') {
            const r = composerFrappe(p, b.a, b.b);
            if (!r.ok) {
                this.refus(cote, r.raison);
                return;
            }
            this.brique = { a: '', b: '', sur: 'a' };
            this.saisie = ['', ''];
            this.lancerVol();
            this.majEcran();
            return;
        } else {
            // Deux chiffres au plus par facteur : les bornes vont jusqu'à 12.
            if (b[b.sur].length >= 2) return;
            const essai = b[b.sur] + touche;
            if (Number(essai) > BORNES_COMPOSE.max) return;
            b[b.sur] = essai;
            // « 7 » puis un second chiffre impossible : on passe tout seul au
            // facteur suivant, pour que le geste courant tienne en trois appuis.
            if (b.sur === 'a' && Number(b.a) * 10 > BORNES_COMPOSE.max) b.sur = 'b';
        }
        this.majEcran();
    }

    /** Pourquoi la brique n'est pas partie. */
    refus(cote, raison) {
        const etat = this.container.querySelector(`[data-etat="${cote}"]`);
        if (!etat) return;
        const tables = this.partie.tables.join(', ');
        etat.textContent = raison === 'table'
            ? `Il faut une des tables travaillées : ${tables}`
            : `Deux nombres entre ${BORNES_COMPOSE.min} et ${BORNES_COMPOSE.max}`;
        this.cotes[cote].classList.add('du-cote--frappe');
        setTimeout(() => this.cotes[cote].classList.remove('du-cote--frappe'), 420);
    }

    taper(cote, touche) {
        const p = this.partie;
        if (p.phase !== 'echange' || cote !== p.defenseur) return;
        if (touche === 'eff') {
            this.saisie[cote] = this.saisie[cote].slice(0, -1);
        } else {
            if (this.saisie[cote].length >= 4) return;
            this.saisie[cote] += touche;
        }
        this.majSaisie(cote);
        // Validation AUTOMATIQUE au bon nombre de chiffres : demander un
        // « valider » de plus coûterait un appui à chaque frappe, et c'est ce
        // demi-temps-là qui fait la différence entre un échange et un exercice.
        // La touche ⌫ permet de se rattraper avant d'atteindre la longueur.
        if (this.saisie[cote].length === longueurReponse(p)) this.valider(cote);
    }

    valider(cote) {
        const p = this.partie;
        const valeur = Number(this.saisie[cote]);
        this.saisie[cote] = '';
        const r = repondre(p, valeur, Math.random);
        if (r.bon) {
            // « QUAND UN JOUEUR A DONNÉ UNE BONNE RÉPONSE, IL FAUDRAIT QU'ON
            // VOIE QUE ÇA FONCTIONNE. » La brique disparaissait et une autre
            // repartait : rien ne disait qu'on venait de la toucher. L'anneau
            // part de la ligne de celui qui vient de renvoyer, et son camp
            // flashe une fois.
            this.impact(cote);
            this.saisie = ['', ''];
            if (r.aComposer) { this.brique = { a: '', b: '', sur: 'a' }; this.vol = null; }
            else this.lancerVol();
            this.majEcran();
            return;
        }
        this.finDePoint(r.point);
    }

    /** L'explosion du renvoi, sur la ligne du joueur qui vient de frapper. */
    impact(cote) {
        this.cotes[cote].classList.remove('du-cote--frappe');
        // Relire une propriété force le navigateur à reprendre l'animation :
        // sans cela, deux renvois de suite n'en jouent qu'une.
        void this.cotes[cote].offsetWidth;
        this.cotes[cote].classList.add('du-cote--frappe');
        setTimeout(() => this.cotes[cote].classList.remove('du-cote--frappe'), 400);

        const el = this.impactEl;
        if (!el || !this.terrain) return;
        const horizontal = this.terrainHorizontal();
        if (horizontal) {
            el.style.left = cote === 0 ? '2%' : '98%';
            el.style.top = '50%';
        } else {
            el.style.left = '50%';
            el.style.top = cote === 0 ? '2%' : '98%';
        }
        el.classList.remove('du-impact--part', 'du-impact--0', 'du-impact--1');
        void el.offsetWidth;
        el.classList.add('du-impact--part', `du-impact--${cote}`);
    }

    /** Les deux camps sont-ils côte à côte (paysage) ou l'un sur l'autre ? */
    terrainHorizontal() {
        const a = this.cotes[0].getBoundingClientRect();
        const b = this.cotes[1].getBoundingClientRect();
        return Math.abs(b.left - a.left) > Math.abs(b.top - a.top);
    }

    // --- La balle -----------------------------------------------------------

    lancerVol() {
        const p = this.partie;
        this.vol = { debut: performance.now(), duree: dureeVol(p), vers: p.defenseur };
    }

    startGameLoop() {
        const boucle = () => {
            if (!this.isRunning) return;
            this.rafId = requestAnimationFrame(boucle);
            if (this.gelDemo) return;
            this.animerBalle();
        };
        this.rafId = requestAnimationFrame(boucle);
    }

    animerBalle() {
        const p = this.partie;
        if (p.phase !== 'echange' || !this.vol || !this.balleEl) {
            if (this.balleEl) this.balleEl.classList.remove('du-balle--vivante');
            return;
        }
        const k = Math.min(1, (performance.now() - this.vol.debut) / this.vol.duree);
        // La flèche redit le sens du vol : la couleur dit QUI a envoyé, elle ne
        // peut pas dire les deux.
        const fleche = this.terrainHorizontal()
            ? (this.vol.vers === 0 ? '◀' : '▶')
            : (this.vol.vers === 0 ? '▲' : '▼');
        this.balleEl.innerHTML = `${p.balle.texte}<span class="du-balle-sens">${fleche}</span>`;
        this.balleEl.classList.add('du-balle--vivante');
        this.balleEl.classList.toggle('du-balle--de-0', p.attaquant === 0);
        this.balleEl.classList.toggle('du-balle--de-1', p.attaquant === 1);

        // L'AXE DE VOL SE LIT SUR LE PLATEAU, il ne se devine pas. En portrait
        // les camps sont l'un au-dessus de l'autre et la balle monte ou
        // descend ; en paysage ils sont côte à côte et elle traverse. Coder
        // l'axe en dur aurait fait voler la balle en travers du couloir dès
        // qu'on tourne la tablette.
        const horizontal = this.terrainHorizontal();
        if (horizontal) {
            const w = this.terrain.clientWidth;
            // Le camp 0 est à gauche : une balle qui va vers lui revient.
            const x = this.vol.vers === 0 ? w * (1 - k) : w * k;
            this.balleEl.style.transform = `translate(-50%, -50%) translateX(${x}px)`;
            this.balleEl.style.top = '50%';
            this.balleEl.style.left = '0';
        } else {
            const h = this.terrain.clientHeight;
            const y = this.vol.vers === 0 ? h * (1 - k) : h * k;
            this.balleEl.style.transform = `translate(-50%, -50%) translateY(${y}px)`;
            this.balleEl.style.top = '0';
            this.balleEl.style.left = '50%';
        }
        if (k >= 1 && !this.isDemo) this.finDePoint(manquer(p));
    }

    // --- Points et fin de partie --------------------------------------------

    finDePoint(pt) {
        if (!pt) return;
        const p = this.partie;
        this.saisie = ['', ''];
        this.vol = null;
        this.majEcran();
        if (p.phase === 'fini') {
            this.annoncer(`${NOMS[p.gagnant]} gagne !`,
                `${p.score[0]} — ${p.score[1]}`, true);
            return;
        }
        const detail = pt.raison === 'faux'
            ? `${pt.donne} au lieu de ${pt.attendu}`
            : `personne n'a renvoyé ${pt.attendu}`;
        this.brique = { a: '', b: '', sur: 'a' };
        this.annoncer(`Point pour ${NOMS[pt.pour]}`,
            `${detail} · ${pt.echanges} échange${pt.echanges > 1 ? 's' : ''} · à ${NOMS[p.serveur]} `
            + `${p.envoi === 'compose' ? 'de composer' : 'de servir'}`);
        // L'annonce s'efface toute seule : personne ne doit avoir à la chasser
        // d'un appui pour reprendre le duel.
        clearTimeout(this.minuteurAnnonce);
        this.minuteurAnnonce = setTimeout(() => {
            if (!this.isRunning || this.partie.phase === 'fini') return;
            this.voile.hidden = true;
            pointSuivant(this.partie);
            this.majEcran();
        }, 2200);
    }

    annoncer(titre, texte, fin = false) {
        if (!this.voile) return;
        this.voile.querySelectorAll('[data-voile-titre]').forEach(el => { el.textContent = titre; });
        this.voile.querySelectorAll('[data-voile-texte]').forEach(el => { el.textContent = texte; });
        this.voile.querySelectorAll('[data-rejouer]').forEach(el => { el.hidden = !fin; });
        this.voile.hidden = false;
    }

    /**
     * « Je suis prêt ».
     *
     * Les deux joueurs se font face et ne voient pas le même sens : un seul
     * bouton « Commencer » serait à l'envers pour l'un des deux. Chacun tape
     * donc SA moitié — le même geste que tout le reste du jeu — et la partie
     * part quand les deux l'ont fait. L'annonce dit lequel manque, sinon on
     * s'accuse mutuellement de ne pas avoir appuyé.
     */
    direPret(i) {
        const p = this.partie;
        if (p.phase === 'fini' || this.voile.hidden) return;
        if (this.prets[i]) return;
        this.prets[i] = true;
        this.cotes[i].classList.add('du-cote--pret');
        if (this.prets[0] && this.prets[1]) {
            clearTimeout(this.minuteurAnnonce);
            this.voile.hidden = true;
            this.cotes.forEach(c => c.classList.remove('du-cote--pret'));
            this.majEcran();
            return;
        }
        const attendu = NOMS[this.prets[0] ? 1 : 0];
        this.annoncer('LE DUEL', `${NOMS[i]} est prêt. On attend ${attendu}…`);
    }

    rejouer() {
        clearTimeout(this.minuteurAnnonce);
        this.partie = creerPartie({
            tables: this.partie.tables,
            operations: this.partie.operations,
            cible: this.partie.cible,
            envoi: this.partie.envoi,
            rythme: this.partie.rythme
        });
        this.saisie = ['', ''];
        this.brique = { a: '', b: '', sur: 'a' };
        this.vol = null;
        this.prets = [false, false];
        this.cotes.forEach(c => c.classList.remove('du-cote--pret'));
        this.voile.hidden = true;
        this.majEcran();
    }

    // --- Affichage ----------------------------------------------------------

    /** La brique en fabrication : deux cases, celle qu'on remplit soulignée. */
    majBrique(i) {
        const el = this.container.querySelector(`[data-brique="${i}"]`);
        if (!el) return;
        const b = this.brique;
        const cases = [['a', el.querySelector('[data-brique-a]')], ['b', el.querySelector('[data-brique-b]')]];
        cases.forEach(([cle, noeud]) => {
            noeud.textContent = b[cle] || '·';
            noeud.classList.toggle('du-brique-case--vise', b.sur === cle);
            noeud.classList.toggle('du-brique-case--vide', !b[cle]);
        });
        const prete = b.a !== '' && b.b !== '';
        el.classList.toggle('du-brique--prete', prete);
        const lancer = this.container.querySelector(`[data-compose="${i}"] [data-cmp="lancer"]`);
        if (lancer) lancer.disabled = !prete;
    }

    majSaisie(i) {
        const el = this.container.querySelector(`[data-saisie="${i}"]`);
        if (!el) return;
        const p = this.partie;
        const v = this.saisie[i];
        const monTour = p.phase === 'echange' && p.defenseur === i;
        // Des emplacements vides montrent combien de chiffres on attend. C'est
        // ce qui rend la validation automatique prévisible : on sait que la
        // frappe partira au dernier chiffre, donc on peut se rattraper au ⌫
        // avant. Sans ça, le pavé valide « par surprise ».
        const attendu = monTour ? longueurReponse(p) : 0;
        el.textContent = monTour ? v.padEnd(Math.max(v.length, attendu), '·') : (v || '—');
        el.classList.toggle('du-saisie--vide', !v);
    }

    majEcran() {
        const p = this.partie;
        [0, 1].forEach(i => {
            this.container.querySelector(`[data-pts="${i}"]`).textContent = String(p.score[i]);
            const pave = this.container.querySelector(`[data-pave="${i}"]`);
            const tables = this.container.querySelector(`[data-tables="${i}"]`);
            const compose = this.container.querySelector(`[data-compose="${i}"]`);
            const brique = this.container.querySelector(`[data-brique="${i}"]`);
            const etat = this.container.querySelector(`[data-etat="${i}"]`);
            const sert = p.phase === 'service' && p.serveur === i;
            const defend = p.phase === 'echange' && p.defenseur === i;
            const fabrique = p.phase === 'composer' && p.attaquant === i;
            // LE CAMP QUI A ENVOYÉ RESTE DÉSIGNÉ pendant tout le vol.
            this.cotes[i].classList.toggle('du-cote--envoie',
                p.phase === 'echange' && p.attaquant === i);

            compose.hidden = !fabrique;
            brique.hidden = !fabrique;
            if (fabrique) this.majBrique(i);
            // Le pavé reste EN PLACE quand ce n'est pas son tour, simplement
            // éteint. Le faire disparaître laissait une moitié d'écran vide et
            // obligeait à retrouver les touches à chaque renvoi — dans un
            // échange qui accélère, on garde les doigts posés, comme sur une
            // raquette. Seul le service échange le pavé contre les tables.
            pave.hidden = sert || fabrique;
            pave.classList.toggle('du-pave--inerte', !defend);
            tables.hidden = !sert;
            etat.textContent = p.phase === 'fini' ? ''
                : sert ? 'À toi de servir : choisis ta table'
                    : fabrique ? 'Compose ton calcul, puis ▶ pour l\'envoyer'
                        : defend ? 'Tape le résultat !'
                            : p.phase === 'echange'
                                ? (p.attaquant === i ? 'Tu as envoyé — à lui de jouer' : 'À l\'adversaire…')
                                : (p.phase === 'composer' ? 'L\'adversaire prépare sa brique…' : '');
            this.cotes[i].classList.toggle('du-cote--actif', sert || defend || fabrique);
            this.majSaisie(i);
        });
        if (p.phase !== 'echange' && this.balleEl) {
            this.balleEl.classList.remove('du-balle--vivante');
        }
    }

    // --- Le robot -----------------------------------------------------------

    /**
     * Le robot joue LES DEUX CÔTÉS. C'est la seule façon de montrer ce qui fait
     * ce jeu : l'aller-retour. Un robot qui ne tiendrait qu'une raquette
     * donnerait à croire que l'autre joueur attend son tour, alors qu'il
     * calcule exactement autant.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.plateau);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        const p = this.partie;
        this.startGameLoop();

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Un duel à deux sur la même tablette : elle se pose à plat entre vous, et la moitié du haut est retournée pour que chacun lise à l\'endroit.', this.plateau);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        const bouton = this.container.querySelector(`[data-cote="${p.serveur}"] [data-table="${p.tables[Math.min(2, p.tables.length - 1)]}"]`);
        cur.say('Le serveur choisit sa table. C\'est là qu\'on chambre : on attaque là où l\'autre est le moins sûr.', bouton || this.plateau);
        if (!await cur.tap(bouton || this.plateau) || !this.isRunning) return fin();
        servir(p, Number(bouton ? bouton.dataset.table : p.tables[0]), Math.random);
        this.lancerVol();
        this.majEcran();
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('La balle porte l\'opération. Celui qui la reçoit tape le résultat avant qu\'elle n\'atteigne sa ligne — le pavé valide tout seul au bon nombre de chiffres.', this.terrain);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Six échanges : de quoi voir la balle changer de camp et accélérer.
        for (let i = 0; i < 6; i++) {
            if (!this.isRunning || p.phase !== 'echange') break;
            const cote = p.defenseur;
            const attendu = String(p.balle.reponse);
            this.saisie[cote] = '';
            for (const chiffre of attendu) {
                const t = this.container.querySelector(`[data-cote="${cote}"] [data-touche="${chiffre}"]`);
                if (t) { this.enfoncer(t); }
                this.saisie[cote] += chiffre;
                this.majSaisie(cote);
                if (!await cur.pause(dureeDemo(210)) || !this.isRunning) return fin();
            }
            this.saisie[cote] = '';
            repondre(p, Number(attendu), Math.random);
            this.lancerVol();
            this.majEcran();
            if (i === 1) {
                cur.say('Et voilà l\'échange : elle repart aussitôt avec un autre produit de la MÊME table, vers l\'autre joueur. Les deux calculent, sans arrêt.', this.terrain);
            }
            if (i === 3) {
                cur.say('À chaque renvoi elle va un peu plus vite. Un point se joue en cinq, dix, quinze échanges — c\'est ça qui use les tables.', this.terrain);
            }
            if (!await cur.pause(dureeDemo(i === 1 || i === 3 ? DEMO_SPEED.between : 700)) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Une erreur ou une balle laissée passer, et le point va à l\'autre. Le perdant du point sert le suivant : on peut toujours revenir.', this.terrain);
        const pt = manquer(p);
        this.finDePoint(pt);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Rien n\'est enregistré dans le carnet : à deux sur un seul profil, on ne saurait pas à qui attribuer les réponses. Un duel se joue, et il s\'oublie.', this.plateau);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    pause() {
        clearTimeout(this.minuteurAnnonce);
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        super.pause();
    }

    destroy() {
        clearTimeout(this.minuteurAnnonce);
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineDuel(container, isDemo, params) {
    const jeu = new Duel(container, isDemo, params);
    jeu.start();
    return jeu;
}
