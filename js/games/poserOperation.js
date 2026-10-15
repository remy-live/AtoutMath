// POSER UNE OPÉRATION — à l'écran, en deux temps.
//
// Le noyau (core/poser.js) porte les rangs, les colonnes et les retenues. Ici :
// la grille où l'on aligne, le pavé de chiffres, et les petits ronds.
//
// TEMPS 1 : ALIGNER. On fait glisser chaque chiffre dans sa colonne, et rien
// d'autre ne se passe tant que ce n'est pas juste. C'est là que se perd
// l'élève qui « sait calculer mais rate ses opérations » : il cale 12,4 sous
// 324,5 en collant à droite, et le calcul qui suit ne peut plus être bon.
//
// TEMPS 2 : CALCULER, COLONNE PAR COLONNE, DE DROITE À GAUCHE. On ne peut pas
// remplir la colonne des dizaines avant celle des unités — l'algorithme EST
// cet ordre, et une grille qu'on remplirait dans le désordre ne l'enseignerait
// pas.
//
// LES RETENUES NE SE NOTENT PAS AU MÊME ENDROIT SELON L'OPÉRATION, et c'est
// fidèle au tableau : EN HAUT à l'addition (elle s'ajoute aux chiffres du
// dessus), EN BAS contre le soustracteur à la soustraction (méthode par
// compensation). Les petits ronds sont donc sur deux rangées différentes.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    poser, etendue, placementAttendu, verifierPlacement, attenduEn,
    premierRang, rangSuivant, decimales, chiffreAuRang, rangsDe,
    apercuPose, verifierPose
} from '../core/poser.js';
import { CSS_GLISSER, rendreGlissable } from '../core/glisserDeposer.js';
import { showModal } from '../ui/modal.js';

const COMPETENCE = 'num.add.entiers';
const SIGNES = { '+': '+', '-': '−' };

class PoserOperation extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'poser-operation');
        this.rng = makeRng(this.params.seed);
        // LA MULTIPLICATION N'EST PAS ENCORE ICI, et ce n'est pas un oubli :
        // son algorithme n'est pas en colonnes mais en LIGNES de produits
        // partiels décalés, puis une addition de ces lignes. Le noyau sait
        // déjà les calculer (core/poser.js), l'écran reste à écrire — et le
        // forcer dans cette grille-ci donnerait un mauvais compromis pour les
        // trois. On retombe donc sur l'addition plutôt que de casser.
        this.operation = ['+', '-'].includes(this.params.operation) ? this.params.operation : '+';
        // LA MÉTHODE DE RETENUE DE LA SOUSTRACTION — Rémy : « j'ai des élèves
        // qui font une autre méthode où pour 53 − 17, il mette le 1 à 3 et au
        // lieu du 5, il barre et mette 4 ». Les deux s'enseignent en France,
        // et un élève qui applique CORRECTEMENT celle qu'on lui a apprise ne
        // pouvait pas l'écrire dans la grille.
        this.methode = this.params.methode === 'emprunt' ? 'emprunt' : 'compensation';
        this.avecVirgule = this.params.decimales === true;
        this.nbTermes = this.operation === '+' ? Math.max(2, Math.min(3, parseInt(this.params.termes) || 2)) : 2;
        this.chiffres = Math.max(2, Math.min(4, parseInt(this.params.chiffres) || 3));
        this.reussies = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                ${CSS_GLISSER}
                /* LE JETON EST LE NOMBRE ENTIER. On ne fait plus glisser des
                   chiffres un par un : poser une opération, c'est décider où va
                   LE NOMBRE, et découper cette décision en quatre gestes la
                   faisait disparaître. */
                .po-nombre {
                    display: inline-flex; align-items: center; gap: 1px;
                    padding: 5px 10px; border-radius: 10px; cursor: grab;
                    background: color-mix(in srgb, var(--primary) 16%, transparent);
                    border: 2px solid var(--primary); font-weight: 900;
                    font-variant-numeric: tabular-nums;
                    font-size: clamp(18px, 5cqw, 26px);
                }
                .po-nombre[hidden] { display: none; }
                .po-nombre b { font-weight: 900; pointer-events: none; }
                /* La virgule de la plaque, dans le rouge de celle de la grille :
                   c'est le MÊME signe, il doit avoir la même tête aux deux
                   endroits. Elle ne se saisit pas — on attrape le nombre par un
                   chiffre — d'où pointer-events none, qui était jusqu'ici écrit
                   en style d'élément dans le code. */
                .po-nombre .po-virgule {
                    color: var(--danger); font-size: 1.45em; font-weight: 900;
                    line-height: 1; pointer-events: none;
                }
                /* L'APERÇU : là où le nombre tomberait si l'on lâchait. C'est
                   lui qui fait VOIR le décalage avant de le commettre. */
                .po-case--apercu {
                    outline: 2px dashed var(--primary);
                    background: color-mix(in srgb, var(--primary) 10%, transparent);
                }
                .po-fantome { opacity: .45; font-weight: 900; }
                .po-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; overflow-y: auto;
                }
                .po-tete { display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .9rem; }
                .po-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                @media (hover: hover) {
                    .po-btn:hover { background: var(--bg-hover); }
                }
                .po-etape {
                    font-weight: 800; font-size: clamp(14px, 3.4cqw, 18px); color: #fff;
                    padding: 5px 14px; border-radius: 999px;
                    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
                }

                /* LA GRILLE. Une colonne par rang, et la virgule dessinée sur la
                   frontière entre les unités et les dixièmes. */
                .po-grille {
                    display: grid; gap: 2px; font-variant-numeric: tabular-nums;
                    font-weight: 800; font-size: clamp(19px, 5.5cqw, 30px);
                }
                .po-case {
                    width: clamp(30px, 8.5cqw, 46px); height: clamp(32px, 9cqw, 48px);
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 6px; position: relative;
                }
                .po-case--pose { background: var(--bg-hover); }
                .po-case--cible { outline: 3px dashed var(--primary); cursor: pointer; }
                .po-case--active { outline: 3px solid var(--primary);
                    background: color-mix(in srgb, var(--primary) 14%, transparent); }
                .po-case--faux { animation: po-non .34s ease; }
                @keyframes po-non { 25% { translate: -5px 0; } 75% { translate: 5px 0; } }
                /* LA VIRGULE EST UNE VIRGULE, PAS UNE PUCE.

                   Rémy : « les virgules ne sont pas très visibles ».

                   MESURÉ AVANT, au navigateur, et sur la surface d'ENCRE — ce
                   que l'œil reçoit, non une taille de police : sur la plaque à
                   faire glisser, la virgule portait 136 pixels d'encre contre
                   866 pour le chiffre voisin, soit 16 % de lui. Dans la grille,
                   ce n'était même pas une virgule : un rond rouge de 8 px, que
                   la photo fait lire comme une puce de liste — et celui de la
                   ligne du résultat, posé sous des cases encore sans bordure,
                   flottait tout seul dans le vide.

                   OR C'EST ELLE QUI ALIGNE, et la consigne ne dit que cela :
                   « les unités sous les unités : c'est la virgule qui aligne,
                   pas le bord droit ». La montrer d'une façon sur la plaque et
                   d'une autre dans la grille laissait à l'élève le soin de
                   faire le lien — sur le seul signe dont l'exercice dépend.

                   ELLE GARDE SA PLACE : sur la frontière droite de la colonne
                   des unités, sans colonne à elle. Et pointer-events none,
                   parce qu'elle déborde sur une case qui se clique. */
                .po-case--virgule::after {
                    content: ','; position: absolute; right: 0; bottom: 0;
                    transform: translate(50%, -12%);
                    font-size: 1.6em; line-height: 1; font-weight: 900;
                    color: var(--danger); pointer-events: none;
                    /* ELLE CHEVAUCHE LA CASE SUIVANTE, QUI SE PEINT APRÈS ELLE.
                       Vu en thème sombre, où les fonds de case sont opaques :
                       la moitié droite de la virgule disparaissait derrière le
                       chiffre d'à côté. Deux frères également positionnés se
                       peignent dans l'ordre du code — il faut donc le dire.
                       Le trait de l'opération, lui, reste au-dessus. */
                    z-index: 1;
                }
                .po-signe { display: flex; align-items: center; justify-content: center;
                    font-size: clamp(19px, 5.5cqw, 30px); font-weight: 900; }
                .po-trait { grid-column: 1 / -1; height: 3px; background: var(--text-main); margin: 3px 0; }

                /* LES PETITS RONDS DES RETENUES. */
                .po-retenue {
                    width: clamp(30px, 8.5cqw, 46px); height: clamp(18px, 5cqw, 26px);
                    display: flex; align-items: center; justify-content: center;
                }
                .po-rond {
                    width: clamp(17px, 4.6cqw, 24px); height: clamp(17px, 4.6cqw, 24px);
                    border-radius: 50%; border: 2px dashed var(--danger);
                    display: flex; align-items: center; justify-content: center;
                    font-size: clamp(11px, 3cqw, 15px); font-weight: 900;
                    color: var(--danger); cursor: pointer; background: transparent;
                }
                .po-rond--plein { border-style: solid; }
                /* AU COIN DU CHIFFRE, pour la soustraction. Il déborde un peu
                   de la case sur la gauche : c'est ainsi qu'on l'écrit au
                   crayon, entre les deux colonnes, et c'est ce débordement qui
                   dit à quel chiffre il s'ajoute. */
                .po-case--porte-rond { position: relative; overflow: visible; }
                /* LES MARQUES D'UNE SOUSTRACTION S'ECRIVENT AU CRAYON, PAS
                   DANS UN ROND.

                   REMY, capture d'un cahier a l'appui : « j'aime pas la
                   presentation par cassage. Presente-le comme cela sans le
                   CDU et les traits de separation ». Sur son image la retenue
                   n'est pas cerclee : c'est un petit chiffre de couleur pose
                   dans la marge, et le chiffre remplace est BARRE d'un trait
                   oblique. C'est ce qu'un eleve a sous les yeux dans son
                   cahier, et le rond rouge n'y ressemblait pas.

                   PAS DE C/D/U NI DE TRAITS VERTICAUX : il les a ecartes
                   lui-meme, et il a raison — la colonne se voit deja, et
                   trois lettres de plus au-dessus d'une operation de deux
                   chiffres encombrent plus qu'elles n'aident.

                   LE ROND RESTE A L'ADDITION, ou la tradition de classe
                   l'emploie et ou personne ne s'en est plaint. */
                .po-marque {
                    position: absolute; left: -7px;
                    min-width: clamp(11px, 2.8cqw, 14px); padding: 0 1px;
                    border: 0; background: var(--bg-panel); border-radius: 3px;
                    font-size: clamp(10px, 2.7cqw, 14px); font-weight: 900;
                    line-height: 1.15; color: var(--danger); cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                }
                /* VIDE, ELLE DOIT SE VOIR : sans repere, l'eleve ne sait pas
                   ou ecrire. Pointillee et pale, elle s'efface des qu'il a
                   ecrit — et le dessin redevient celui du cahier. */
                .po-marque--vide {
                    border: 1.5px dashed var(--danger); opacity: .5;
                    min-height: clamp(11px, 2.8cqw, 14px);
                }
                /* DEUX MARQUES DU HAUT, ET ELLES N'ONT NI LA MEME PLACE NI
                   LA MEME TAILLE. Remy, en regardant la photo d'essai :
                   « mets pour la compensation le 1 a gauche du 2 sur ton
                   image de test et un chiffre plus grand par cassage ».

                   DEVANT  la dizaine empruntee : un petit 1 pose A GAUCHE du
                           chiffre, sur sa ligne — on lit « 12 » d'un trait,
                           et c'est bien un seul nombre qu'on lit. Pose
                           au-dessus, il devenait un exposant.
                   DESSUS  le chiffre reecrit du cassage : il REMPLACE celui
                           qui est barre, donc il se lit comme un chiffre et
                           non comme une annotation. Il est presque aussi
                           grand que lui. */
                .po-marque--devant {
                    top: 50%; transform: translateY(-50%); left: -9px;
                }
                .po-marque--dessus {
                    top: -13px; left: -1px;
                    font-size: clamp(14px, 3.8cqw, 19px);
                    min-width: clamp(13px, 3.4cqw, 17px);
                }
                .po-marque--bas { bottom: -6px; }
                /* EN HAUT À GAUCHE DU CHIFFRE DU HAUT : la dizaine empruntée
                   s'écrit DEVANT lui — c'est le « 1 » de 13. Rémy : « à côté
                   du 0 en haut et à côté du 2 en bas ». */
                .po-rond--coin-haut { top: -4px; }
                /* LE CHIFFRE BARRÉ. Un trait en travers, et non une rature :
                   on doit encore LIRE ce qu'il y avait — c'est de lui qu'on
                   est parti. */
                .po-case--barree { position: relative; }
                .po-case--barree::after {
                    content: ''; position: absolute; left: 12%; right: 12%; top: 50%;
                    border-top: 2.5px solid var(--danger); transform: rotate(-12deg);
                    pointer-events: none;
                }


                .po-pave { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: 340px; }
                .po-touche {
                    width: 46px; height: 46px; border-radius: 10px; cursor: pointer;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); font-size: 20px; font-weight: 800;
                }
                @media (hover: hover) {
                    .po-touche:hover { background: var(--primary); color: #fff; }
                }
                .po-jeton {
                    padding: 6px 11px; border-radius: 9px; cursor: grab; touch-action: none;
                    background: color-mix(in srgb, var(--primary) 16%, transparent);
                    border: 2px solid var(--primary); font-weight: 900;
                    font-size: clamp(16px, 4.5cqw, 22px);
                }
                .po-jeton[hidden] { display: none; }
                .po-ligne-jetons { display: flex; gap: 6px; align-items: center; flex-wrap: wrap;
                    justify-content: center; }
                .po-ligne-jetons b { font-size: .8em; opacity: .7; }

                .po-note { min-height: 2.6em; text-align: center; line-height: 1.35;
                    font-size: clamp(13px, 3cqw, 15px); color: var(--text-muted); max-width: 560px; }
                .po-note--ok { color: var(--success); font-weight: 700; }
                .po-note--ko { color: var(--danger); font-weight: 700; }

                /* LES DEUX MÉTHODES, DANS LA FENÊTRE. Deux cartes qu'on
                   compare d'un coup d'œil : le titre dit le geste, la ligne
                   dessous le fait sur 53 − 17. */
                .po-meth-dit { margin: 0 0 12px; color: var(--text-muted); }
                .po-meth { display: block; width: 100%; text-align: left;
                    margin-bottom: 10px; padding: 12px 14px; border-radius: 10px;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); cursor: pointer; line-height: 1.5; }
                /* LE SURVOL EST PROTÉGÉ : sur un téléphone, un :hover nu
                   reste COLLÉ après le toucher, et la carte qu'on vient de
                   quitter garde l'air d'être choisie. Une épreuve du dépôt
                   garde cette règle. */
                @media (hover: hover) {
                    .po-meth:hover { border-color: var(--primary); }
                }
                .po-meth--actif { border-color: var(--primary); }
                .po-meth i { font-weight: 600; color: var(--primary-texte); font-style: normal; }
                .po-meth-ex { display: block; margin-top: 6px;
                    font-variant-numeric: tabular-nums; color: var(--text-muted); }
            </style>
            <div class="po-wrap">
                <div class="po-tete">
                    <span data-score></span>
                    <button type="button" class="po-btn" data-indice>💡 Aide</button>
                    <button type="button" class="po-btn" data-neuf>↺ Autre opération</button>
                    <button type="button" class="po-btn" data-methode hidden>⇄ Méthode</button>
                </div>
                <div class="po-etape" data-etape></div>
                <div class="po-grille" data-grille></div>
                <div data-zone></div>
                <p class="po-note" data-note></p>
            </div>`;

        this.etapeEl = this.container.querySelector('[data-etape]');
        this.grilleEl = this.container.querySelector('[data-grille]');
        this.zoneEl = this.container.querySelector('[data-zone]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.poser());
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.aider());
        // LE BOUTON NE SERT QU'À LA SOUSTRACTION : une addition n'a qu'une
        // façon de poser sa retenue, et un bouton qui ouvre une fenêtre sans
        // objet apprend à ne plus la lire.
        const bm = this.container.querySelector('[data-methode]');
        bm.hidden = this.operation !== '-';
        bm.addEventListener('click', () => this.choisirMethode());
        this.poser();
    }

    startGameLoop() { /* Pas d'horloge. */ }

    /** Tire une opération dont toutes les étapes tombent dans le niveau. */
    poser() {
        for (let essai = 0; essai < 300; essai++) {
            const dec = this.avecVirgule ? this.rng.int(1, 2) : 0;
            const tirer = () => {
                const n = this.rng.int(Math.pow(10, this.chiffres - 1), Math.pow(10, this.chiffres) - 1);
                return dec ? Number((n / Math.pow(10, dec)).toFixed(dec)) : n;
            };
            let operandes = Array.from({ length: this.nbTermes }, tirer);
            if (this.operation === '-') {
                operandes.sort((a, b) => b - a);
                // Une soustraction ne se pose que du grand vers le petit, et
                // deux nombres égaux ne font pas un exercice.
                if (operandes[0] === operandes[1]) continue;
            }
            let t;
            try { t = poser(this.operation, operandes, { methode: this.methode }); }
            catch (e) { continue; }
            this.tableau = t;
            this.operandes = operandes;
            break;
        }
        this.etendue = etendue(this.operandes, this.tableau.resultat);
        this.attendu = placementAttendu(this.operandes);
        this.pose = this.operandes.map(() => []);
        this.etape = 1;
        this.rangCourant = null;
        this.resultats = {};
        this.retenues = {};     // la marque du HAUT : le petit 1, ou le chiffre réécrit
        this.marquesBas = {};   // la marque du BAS : le +1 de la compensation
        this.note('');
        this.dessiner();
        return true;
    }

    dessiner() {
        this.etapeEl.textContent = this.etape === 1
            ? '① Aligne les nombres dans les bonnes colonnes'
            : '② Calcule colonne par colonne, en partant de la droite';
        this.scoreEl.textContent = `${this.reussies} opération${this.reussies > 1 ? 's' : ''} posée${this.reussies > 1 ? 's' : ''}`;
        this.dessinerGrille();
        this.zoneEl.innerHTML = '';
        if (this.etape === 1) this.dessinerJetons();
        else this.dessinerPave();
    }

    dessinerGrille() {
        const rangs = this.etendue.rangs;             // du plus fort au plus faible
        const g = this.grilleEl;
        g.innerHTML = '';
        // Une colonne pour le signe, puis une par rang.
        g.style.gridTemplateColumns = `auto repeat(${rangs.length}, auto)`;

        // LA RANGÉE DES RETENUES EST CELLE DE L'ADDITION, ET D'ELLE SEULE.
        //
        // RÉMY, devant 307 − 260 : « logiquement la retenue devrait être à
        // l'endroit où il y a une retenue, en l'occurrence à côté du 0 en haut
        // et à côté du 2 en bas ». Une soustraction n'écrit pas ses retenues
        // sur une ligne à part : elle les écrit CONTRE les chiffres, dans la
        // marge entre deux colonnes. Elles sont donc posées par
        // `caseOperande`, au coin du chiffre qu'elles changent.
        if (this.operation === '+') this.rangeeRetenues(rangs);

        this.operandes.forEach((v, i) => {
            const signe = document.createElement('div');
            signe.className = 'po-signe';
            signe.textContent = i === this.operandes.length - 1 ? SIGNES[this.operation] : '';
            g.appendChild(signe);
            rangs.forEach(r => g.appendChild(this.caseOperande(i, r)));
        });

        // POUR LA SOUSTRACTION, LE PETIT ROND N'A PAS DE RANGÉE À LUI. Il se
        // note EN BAS À GAUCHE du chiffre du nombre du bas — c'est ainsi qu'on
        // écrit la compensation au tableau, et c'est ce qui la rend lisible :
        // le « 1 » qu'on ajoute appartient à CE chiffre-là, pas à la colonne
        // en général. Sur sa propre rangée, il flottait sous le trait et l'on
        // ne savait plus à quel nombre il se rapportait. Il est posé dans la
        // case, par `caseOperande`.

        const trait = document.createElement('div');
        trait.className = 'po-trait';
        g.appendChild(trait);

        const vide = document.createElement('div');
        g.appendChild(vide);
        rangs.forEach(r => g.appendChild(this.caseResultat(r)));
    }

    /**
     * Le petit rond d'une colonne, ou null s'il n'y a pas de retenue possible
     * à ce rang — ou si l'on n'en est pas encore à calculer.
     *
     * @param {number} rang
     * @param {boolean} [auCoin] - posé au coin du chiffre plutôt que sur sa
     *   propre rangée : c'est la compensation de la soustraction.
     */
    rondRetenue(rang, auCoin, ou = 'retenue') {
        if (auCoin !== undefined && !auCoin) return null;
        if (this.etape !== 2) return null;
        if (attenduEn(this.tableau, rang, ou) === null) return null;
        const rond = document.createElement('button');
        rond.type = 'button';
        // `btn-carre`' : « MA TAILLE EST LA MIENNE, ne l'étire pas ».
        //
        // RÉMY, pour la DEUXIÈME fois : « y a pas un souci sur les retenues,
        // elle devrait pas être ronde ». Mesuré au doigt : 17,9 × 44 px, soit
        // deux fois et demie plus haut que large. Le plancher tactile de 44 px
        // (voir `css/modules.css`) s'applique à tout bouton de jeu qui ne
        // déclare pas sa forme, et un rayon de 50 % sur un rectangle étiré
        // donne exactement l'ovale qu'il voit.
        //
        // LA DIVISION POSÉE LE DÉCLARAIT DÉJÀ (`btn-carre pl-rond`, dans
        // `poserLongue.js`) depuis sa première remarque du 8 octobre : la
        // correction avait été posée sur UN des deux chemins qui mènent au même
        // endroit. C'est la sixième fois que le dépôt paie cette leçon, et
        // `tools/boutonsEtires.mjs` existe maintenant pour qu'il n'y ait pas
        // de septième — il ouvre tous les jeux au format téléphone et liste ce
        // que le plancher a étiré.
        //
        // (Le nom dit « carré » et sert aussi à des pastilles RONDES — les
        // jetons du Mastermind, les ronds de la division. Son sens est celui de
        // la ligne du dessus ; on suit l'usage plutôt que d'inventer un second
        // nom pour la même chose.)
        const sac = ou === 'retenue-bas' ? this.marquesBas : this.retenues;
        // UNE SOUSTRACTION ECRIT AU CRAYON, UNE ADDITION DANS UN ROND.
        // Voir la feuille de style : c'est la demande de Remy, image de
        // cahier a l'appui.
        // OU VA LA MARQUE : a gauche du chiffre quand c'est la dizaine
        // empruntee, AU-DESSUS quand c'est le chiffre reecrit du cassage —
        // celui-la remplace le chiffre barre, il n'annote pas.
        const col = (this.tableau.colonnes.find(c => c.rang === rang) || {});
        const place = ou === 'retenue-bas' ? 'bas'
            : (col.hautCorrige !== null && col.hautCorrige !== undefined ? 'dessus' : 'devant');
        // DEUX AFFECTATIONS ET NON UN TERNAIRE, et ce n'est pas du style :
        // l'epreuve des pastilles lit l'affectation entiere, et un ternaire
        // qui porte `btn-carre` dans UNE de ses deux branches la fait passer
        // au vert pour les deux. Separees, chacune repond d'elle-meme.
        const vide = sac[rang] === undefined;
        if (auCoin) {
            rond.className = `btn-carre po-marque po-marque--${place}${vide ? ' po-marque--vide' : ''}`;
        } else {
            rond.className = `btn-carre po-rond${sac[rang] ? ' po-rond--plein' : ''}`;
        }
        // LE « +1 » S'ÉCRIT AVEC SON SIGNE : c'est ce qu'on AJOUTE au chiffre
        // du bas, et un « 1 » nu se lirait comme un chiffre de plus.
        rond.textContent = sac[rang] === undefined ? ''
            : (ou === 'retenue-bas' ? `+${sac[rang]}` : String(sac[rang]));
        rond.dataset.rang = rang;
        rond.dataset.ou = ou;
        rond.title = ou === 'retenue-bas'
            ? 'Ce qu\'on ajoute au chiffre du bas' : 'La retenue de cette colonne';
        rond.addEventListener('click', (ev) => {
            ev.stopPropagation();
            this.tournerRetenue(rang, ou);
        });
        return rond;
    }

    rangeeRetenues(rangs) {
        const g = this.grilleEl;
        g.appendChild(document.createElement('div'));
        rangs.forEach(r => {
            const cell = document.createElement('div');
            cell.className = 'po-retenue';
            const rond = this.rondRetenue(r);
            if (rond) cell.appendChild(rond);
            g.appendChild(cell);
        });
    }

    caseOperande(i, rang) {
        const el = document.createElement('div');
        el.className = 'po-case';
        if (rang === 0 && this.etendue.virgule) el.classList.add('po-case--virgule');
        const mis = this.pose[i].find(m => m.rang === rang);
        if (mis) { el.textContent = mis.chiffre; el.classList.add('po-case--pose'); }
        else if (this.etape === 1) {
            el.classList.add('po-case--cible');
            el.dataset.operande = i;
            el.dataset.rang = rang;
        }
        // LES DEUX MARQUES D'UNE SOUSTRACTION, CHACUNE À SON CHIFFRE.
        //
        //   EN HAUT   le petit 1 qui fait du 0 un 10 — les deux méthodes
        //             l'écrivent — ou, par emprunt, le chiffre barré et
        //             réécrit (le 3 qui devient 2) ;
        //   EN BAS    le +1 contre le chiffre du bas, et seulement dans la
        //             compensation.
        //
        // Elles débordent un peu de la case sur la gauche : c'est ainsi qu'on
        // les écrit au crayon, entre deux colonnes, et c'est ce débordement
        // qui dit à quel chiffre elles s'appliquent.
        // LE CHIFFRE RÉÉCRIT SE BARRE, comme au crayon. Rémy : « au lieu du
        // 5, il barre et mette 4 ». Tant que l'élève n'a rien écrit dans le
        // rond, on ne barre rien : le trait est la seconde moitié de SON
        // geste, pas une correction que le logiciel ferait à sa place.
        if (i === 0 && this.parEmprunt()
            && (this.tableau.colonnes.find(c => c.rang === rang) || {}).hautCorrige !== null
            && this.retenues[rang] !== undefined) {
            el.classList.add('po-case--barree');
        }
        const dernier = this.operandes.length - 1;
        const rond = this.operation !== '-' ? null
            : (i === 0
                ? this.rondRetenue(rang, true, 'retenue')
                : (i === dernier && !this.parEmprunt()
                    ? this.rondRetenue(rang, true, 'retenue-bas') : null));
        if (rond) { el.classList.add('po-case--porte-rond'); el.appendChild(rond); }
        return el;
    }

    caseResultat(rang) {
        const el = document.createElement('div');
        el.className = 'po-case';
        if (rang === 0 && this.etendue.virgule) el.classList.add('po-case--virgule');
        if (this.resultats[rang] !== undefined) {
            el.textContent = this.resultats[rang];
            el.classList.add('po-case--pose');
        }
        if (this.etape === 2 && rang === this.rangCourant) el.classList.add('po-case--active');
        el.dataset.resultat = rang;
        return el;
    }

    /**
     * L'ORDRE DES LIGNES EST LIBRE À L'ADDITION, ET SEULEMENT LÀ.
     *
     * Rémy : « pour l'addition on se fiche de poser un nombre en haut ou en
     * bas, c'est la même chose ». C'est vrai, et le refuser enseignait une
     * fausse règle : 47 + 128 et 128 + 47 sont la même opération posée, les
     * deux sont justes. Une soustraction, elle, n'a qu'un ordre — on ne
     * retire pas le grand du petit —, et c'est une vraie règle qu'il faut
     * tenir.
     *
     * On ÉCHANGE donc les deux opérandes plutôt que de refuser le dépôt. Comme
     * l'addition est commutative, le tableau des colonnes est identique après
     * l'échange : rien de ce qui suit n'a besoin de le savoir.
     *
     * @returns {boolean} vrai si l'échange a eu lieu
     */
    echangerLignes(depuis, vers) {
        if (this.operation !== '+') return false;
        // Une ligne déjà remplie n'est pas libre : on ne va pas déloger un
        // nombre que l'élève vient de poser.
        if (this.pose[vers].length) return false;

        const permute = (t) => { const x = t[depuis]; t[depuis] = t[vers]; t[vers] = x; };
        permute(this.operandes);
        permute(this.pose);
        permute(this.attendu);
        return true;
    }

    // --- Étape 1 : l'alignement ------------------------------------------------

    dessinerJetons() {
        // LA CONSIGNE NE DOIT PAS ÉCRASER LA CORRECTION. Le refus d'un dépôt
        // redessine l'écran quatre dixièmes de seconde plus tard ; si la
        // consigne se réécrit à ce moment-là, l'élève voit passer « décalé
        // d'une colonne » puis plus rien, et croit que rien ne s'est produit.
        const dejaDit = /po-note--(ok|ko)/.test(this.noteEl.className);
        if (!dejaDit) this.note('Fais glisser CHAQUE NOMBRE dans la grille — en entier. Attrape-le par '
            + 'n\'importe lequel de ses chiffres : celui que tu tiens tombe dans la colonne '
            + 'que tu survoles, et les autres suivent. Les unités sous les unités.');
        this.attendu.forEach((att, i) => {
            const ligne = document.createElement('div');
            ligne.className = 'po-ligne-jetons';
            const jeton = document.createElement('div');
            jeton.className = 'po-nombre';
            jeton.hidden = this.pose[i].length > 0;
            // Chaque chiffre est un élément à lui : c'est ainsi qu'on sait
            // LEQUEL a été attrapé, sans mesurer des pixels à la main.
            att.chiffres.forEach((c, j) => {
                const b = document.createElement('b');
                b.textContent = c.chiffre;
                b.dataset.index = String(j);
                jeton.appendChild(b);
                // La virgule se dessine entre les unités et les dixièmes : elle
                // ne compte pas comme un chiffre, elle sépare.
                if (c.rang === 0 && att.chiffres.some(x => x.rang < 0)) {
                    const v = document.createElement('span');
                    v.className = 'po-virgule';
                    v.textContent = ',';
                    jeton.appendChild(v);
                }
            });
            this.brancherJeton(jeton, i);
            ligne.appendChild(jeton);
            this.zoneEl.appendChild(ligne);
        });
    }

    brancherJeton(jeton, operande) {
        // L'index du chiffre saisi se lit sur l'élément touché, AVANT que le
        // glisser ne commence : c'est ce qui permet d'attraper le nombre par
        // n'importe quel chiffre.
        const noter = (ev) => {
            const cible = ev.target && ev.target.closest('b[data-index]');
            this.chiffrePris = cible ? Number(cible.dataset.index) : 0;
        };
        jeton.addEventListener('pointerdown', noter);
        jeton.addEventListener('touchstart', noter, { passive: true });

        rendreGlissable(jeton, {
            cibles: '[data-operande]',
            actif: () => !this.isDemo && this.etape === 1,
            survoler: (cible) => this.apercu(cible, operande),
            deposer: (cible) => this.deposerNombre(cible, operande)
        });
    }

    /** Le fantôme dans la grille : ce que donnerait le lâcher, à cet instant. */
    apercu(cible, operande) {
        this.grilleEl.querySelectorAll('.po-case--apercu').forEach(c => {
            c.classList.remove('po-case--apercu');
            const f = c.querySelector('.po-fantome');
            if (f) f.remove();
        });
        if (!cible || Number(cible.dataset.operande) !== operande) return;
        const rang = Number(cible.dataset.rang);
        apercuPose(this.operandes[operande], this.chiffrePris || 0, rang).forEach(c => {
            const q = this.grilleEl.querySelector(
                `[data-operande="${operande}"][data-rang="${c.rang}"]`);
            if (!q || q.textContent.trim()) return;
            q.classList.add('po-case--apercu');
            const f = document.createElement('span');
            f.className = 'po-fantome';
            f.textContent = c.chiffre;
            q.appendChild(f);
        });
    }

    deposerNombre(cible, operande) {
        const ligne = Number(cible.dataset.operande);
        if (ligne !== operande && !this.echangerLignes(operande, ligne)) {
            this.note('Dans une soustraction, l\'ordre compte : le nombre dont on retire va '
                + 'AU-DESSUS, celui qu\'on retire en dessous.', 'ko');
            this.dessiner();
            return;
        }
        operande = ligne;
        const rang = Number(cible.dataset.rang);
        const valeur = this.operandes[operande];
        const v = verifierPose(valeur, this.chiffrePris || 0, rang);
        if (!v.ok) {
            cible.classList.add('po-case--faux');
            const dix = Math.abs(v.ecart);
            this.note(`Décalé de ${dix} colonne${dix > 1 ? 's' : ''} : le nombre est `
                + `${dix === 1 ? 'dix' : `10^${dix}`} fois trop ${v.ecart > 0 ? 'grand' : 'petit'}. `
                + 'C\'est la VIRGULE qui aligne, pas le bord droit.', 'ko');
            setTimeout(() => this.dessiner(), 420);
            return;
        }
        // Le nombre entier se pose d'un coup : c'était une seule décision.
        this.pose[operande] = apercuPose(valeur, this.chiffrePris || 0, rang)
            .map(c => ({ rang: c.rang, chiffre: c.chiffre }));

        const juste = verifierPlacement(this.operandes, this.pose);
        if (juste.ok) {
            this.etape = 2;
            this.rangCourant = premierRang(this.tableau);
            this.note('✅ Bien aligné. Maintenant on calcule, en partant de la droite. '
                + `Colonne des ${this.nomRang(this.rangCourant)} : que met-on dessous ?`, 'ok');
            // `partiel` : ALIGNER N'EST PAS AVOIR POSÉ L'OPÉRATION.
            //
            // RÉMY, après une séance : « sur Poser une opération, les élèves
            // ont fait 2 opérations (ou 3) et ont eu 5/5 ».
            //
            // MESURÉ : une seule opération déclarait DEUX questions — celle-ci
            // à l'alignement, puis celle de `finir()` au résultat. Trois
            // opérations en valaient donc six, et une étape de cinq se
            // refermait avant la troisième. Deux opérations suivies de
            // l'alignement d'une troisième suffisaient aussi : cinq.
            //
            // `BaseGame` dit la règle depuis longtemps — « UNE ÉTAPE N'EST PAS
            // UNE QUESTION […] c'est l'OPÉRATION qui compte, une fois finie » —
            // et `runner.onAttempt` la fait appliquer (`if (payload.partiel)
            // return;`). Ce jeu-ci n'avait jamais posé le drapeau.
            //
            // LA TENTATIVE RESTE ENREGISTRÉE : elle nourrit les statistiques et
            // le carnet d'erreurs — aligner sur la virgule EST une réussite, et
            // c'est même la moitié difficile de l'exercice. Elle ne fait
            // simplement plus avancer le compteur de questions.
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Aligner ${this.operandes.map(x => String(x).replace('.', ',')).join(` ${this.operation} `)}`,
                expected: 'aligné sur la virgule', given: 'juste', points: 8,
                partiel: true
            });
        } else {
            this.note('Ce nombre est bien placé. Pose l\'autre.', 'ok');
        }
        this.dessiner();
    }

    nomRang(r) {
        return { 3: 'milliers', 2: 'centaines', 1: 'dizaines', 0: 'unités',
            '-1': 'dixièmes', '-2': 'centièmes' }[String(r)] || `rang ${r}`;
    }

    // --- Étape 2 : le calcul ----------------------------------------------------

    dessinerPave() {
        const pave = document.createElement('div');
        pave.className = 'po-pave';
        for (let n = 0; n <= 9; n++) {
            const t = document.createElement('button');
            t.type = 'button';
            t.className = 'po-touche';
            t.textContent = n;
            t.addEventListener('click', () => this.taper(n));
            pave.appendChild(t);
        }
        this.zoneEl.appendChild(pave);
        // LA QUESTION DE COLONNE NE S'IMPOSE PLUS À TOUT LE MONDE.
        //
        // Deux défauts tenaient dans cette ligne. Elle écrasait tout message
        // qui ne commençait pas par ✅ : celui qui annonce la retenue était
        // réécrit dans la milliseconde qui suivait, et l'élève ne l'a jamais
        // lu. Et une fois la dernière colonne remplie, `rangCourant` vaut
        // null : on demandait alors « Colonne des rang null : que met-on
        // dessous ? » par-dessus une opération terminée.
        //
        // Le dessin ne pose donc la question que s'il reste une colonne ET que
        // personne n'a rien à dire de plus précis.
        if (this.rangCourant !== null && !this.noteEl.textContent.trim()) {
            this.note(`Colonne des ${this.nomRang(this.rangCourant)} : que met-on dessous ?`);
        }
    }

    taper(n) {
        const r = this.rangCourant;
        if (r === null) return;
        const attendu = attenduEn(this.tableau, r, 'resultat');
        if (n !== attendu) {
            const c = this.grilleEl.querySelector(`[data-resultat="${r}"]`);
            if (c) { c.classList.add('po-case--faux'); setTimeout(() => this.dessiner(), 380); }
            this.note(`Ce n'est pas le chiffre des ${this.nomRang(r)}. `
                + (this.operation === '+' ? 'N\'oublie pas la retenue de la colonne précédente.'
                    : 'Regarde s\'il faut emprunter dix au chiffre du haut.'), 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Colonne des ${this.nomRang(r)} de ${this.enonce()}`,
                input: String(n), expected: String(attendu),
                customMessage: 'Une colonne à la fois, retenue comprise.'
            });
            return;
        }
        this.resultats[r] = n;
        // ON SIGNALE LA RETENUE, ON NE LA RÉCLAME PAS. Le petit rond reste là
        // pour qui a besoin de l'écrire ; celui qui la garde en tête continue.
        const suivant = rangSuivant(this.tableau, r);
        const aPoser = suivant !== null ? attenduEn(this.tableau, suivant, 'retenue') : 0;
        this.rangCourant = suivant;
        if (suivant === null) return this.finir();
        const retenue = !aPoser ? ''
            : `Bien, et il y a une retenue de ${aPoser} — écris-la dans le petit rond, `
                + 'ou garde-la en tête. ';
        // Le message est posé APRÈS le dessin : c'est le dessin qui écrit la
        // consigne de colonne par défaut, et il ne doit pas recouvrir celle-ci.
        this.note('');
        this.dessiner();
        this.note(retenue + `Colonne des ${this.nomRang(suivant)} : que met-on dessous ?`);
    }

    /** La soustraction se fait-elle en barrant le chiffre du haut ? */
    parEmprunt() {
        return this.operation === '-' && this.methode === 'emprunt';
    }

    /**
     * CE QUE LE PETIT ROND PEUT PORTER, DANS CETTE COLONNE-LÀ.
     *
     * À l'addition et par compensation, c'est une retenue : 0, 1, parfois 2.
     *
     * PAR EMPRUNT, C'EST UN CHIFFRE RÉÉCRIT, et faire tourner un rond de 0 à
     * 19 demanderait vingt clics pour une marque qui n'est même pas notée.
     * Les trois valeurs possibles se déduisent du chiffre du haut, qui est
     * écrit juste en dessous et que tout le monde voit :
     *
     *     h − 1    on lui a pris une dizaine     (53 : le 5 barré devient 4)
     *     h + 10   il en reçoit une              (53 : le 3 devient 13)
     *     h + 9    les deux à la fois            (503 : le 0 devient 9)
     *
     * Trois candidats, donc : la marque ne se devine pas, et elle s'atteint
     * en trois clics au pire.
     */
    valeursDuRond(rang, ou) {
        // LE « +1 » DU BAS N'A QU'UNE VALEUR : c'est une compensation, elle
        // vaut un ou rien. Un rond qui tournerait de 0 à 2 donnerait le choix
        // là où il n'y en a pas.
        if (ou === 'retenue-bas') return [1];
        if (!this.parEmprunt()) {
            // EN HAUT, DANS LA COMPENSATION, C'EST LA DIZAINE EMPRUNTÉE : le
            // petit 1 devant le chiffre. Elle non plus n'a qu'une valeur.
            if (this.operation === '-') return [1];
            const maxi = this.tableau.retenueMax || 1;
            return Array.from({ length: maxi + 1 }, (_, k) => k);
        }
        // PAR EMPRUNT, la marque est un chiffre réécrit — ou le petit 1 de la
        // colonne qui emprunte. Les valeurs possibles se déduisent du chiffre
        // du haut, écrit juste en dessous : on lui a pris une dizaine, il en
        // reçoit une, ou les deux.
        const c = this.tableau.colonnes.find(x => x.rang === rang);
        if (c && c.retenueHaut) return [1];
        const h = (c && c.chiffreHaut) || 0;
        return [...new Set([h - 1, h + 9])].filter(v => v >= 0);
    }

    /**
     * Les petits ronds tournent sur leurs valeurs possibles — puis vide.
     *
     * ET LE PETIT 1 DU HAUT ÉCRIT AUSSI LE +1 DU BAS, dans la compensation.
     * Rémy : « on clique sur la retenue du haut, ça affiche 1 et en bas à
     * gauche +1 ». Les deux marques sont UNE SEULE décision — j'emprunte dix,
     * donc je les rends — et les séparer en deux clics ferait croire qu'on
     * peut faire l'une sans l'autre, ce qui est exactement la faute du
     * chapitre.
     */
    tournerRetenue(rang, ou = 'retenue') {
        const sac = ou === 'retenue-bas' ? this.marquesBas : this.retenues;
        const suite = [undefined, ...this.valeursDuRond(rang, ou)];
        sac[rang] = suite[(suite.indexOf(sac[rang]) + 1) % suite.length];

        if (ou === 'retenue' && this.operation === '-' && !this.parEmprunt()) {
            const suivant = rangSuivant(this.tableau, rang);
            if (suivant !== null && attenduEn(this.tableau, suivant, 'retenue-bas') !== null) {
                this.marquesBas[suivant] = sac[rang] === undefined ? undefined : 1;
            }
        }
        this.dessiner();
    }

    /**
     * LA FENÊTRE QUI MONTRE LES DEUX MÉTHODES, ET QUI LES FAIT CHANGER.
     *
     * RÉMY : « du coup peut être un bouton changer de méthode avec un popup
     * qui montre un exemple ».
     *
     * L'EXEMPLE EST TOUJOURS 53 − 17, parce que c'est LE SIEN et qu'il tient
     * en deux colonnes : une qui emprunte, une qui ne le fait pas. Un exemple
     * à quatre chiffres montrerait la même chose en moins lisible.
     */
    choisirMethode() {
        const carte = (id, titre, lignes, actif) =>
            `<button type="button" class="po-meth${actif ? ' po-meth--actif' : ''}"`
            + ` data-methode="${id}">`
            + `<b>${titre}</b>${actif ? ' <i>— en cours</i>' : ''}`
            + `<span class="po-meth-ex">${lignes}</span></button>`;
        const html = '<p class="po-meth-dit">Les deux donnent 36. Choisis celle que tu '
            + 'as apprise.</p>'
            + carte('compensation', 'On compense : +1 en bas',
                '<u>1</u>3 − 7 = 6, puis le <b>1</b> de 17 devient <b>2</b> : 5 − 2 = 3',
                this.methode === 'compensation')
            + carte('emprunt', 'On emprunte : le haut est barré',
                '<u>1</u>3 − 7 = 6, puis on barre le <b>5</b> et l\'on écrit <b>4</b> : '
                + '4 − 1 = 3',
                this.methode === 'emprunt');
        // `showModal` REND UN OBJET, PAS L'ÉLÉMENT : `{ close, element }`.
        // Écrit comme si c'était le nœud, le code levait « querySelectorAll
        // is not a function » — et la fenêtre s'ouvrait quand même, sans
        // aucun de ses boutons branché. Vu à la sonde, pas à la lecture.
        const fenetre = showModal('Les deux méthodes de retenue', html, { width: '460px' });
        fenetre.element.querySelectorAll('[data-methode]').forEach(b => {
            b.addEventListener('click', () => {
                this.methode = b.dataset.methode;
                fenetre.close();
                // ON REPOSE L'OPÉRATION EN COURS, et c'est voulu : les marques
                // déjà écrites ne veulent plus rien dire dans l'autre méthode.
                this.poser();
            });
        });
    }

    finir() {
        // LES RETENUES NE SONT PAS CONTRÔLÉES. Rémy : « vraiment retenue
        // optionnelle ». Le résultat juste suffit — c'est lui qu'on demande, et
        // celui qui tient sa retenue de tête a fait le même travail que celui
        // qui l'écrit. Les petits ronds restent là pour qui en a besoin.
        this.reussies++;
        this.note(`✅ ${this.enonce()} = ${String(this.tableau.resultat).replace('.', ',')}`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: this.enonce(),
            expected: String(this.tableau.resultat), given: String(this.tableau.resultat),
            points: 8 + this.tableau.colonnes.length * 2
        });
        this.dessiner();
        setTimeout(() => { if (this.isRunning) this.poser(); }, 2000);
    }

    enonce() {
        return this.operandes.map(x => String(x).replace('.', ','))
            .join(` ${SIGNES[this.operation]} `);
    }

    aider() {
        if (this.etape === 1) {
            return this.note('Les unités sous les unités : c\'est la virgule qui aligne, '
                + 'pas le bord droit. 324,5 et 12,4 ont leur 4 et leur 2 dans la même colonne.');
        }
        if (this.rangCourant === null) return this.note('L\'opération est finie : la suivante arrive.');
        const c = this.tableau.colonnes.find(x => x.rang === this.rangCourant);
        if (this.operation === '+') {
            return this.note(`On additionne ${c.chiffres.filter(x => x !== null).join(' + ')}`
                + `${c.retenueEntrante ? ` + ${c.retenueEntrante} de retenue` : ''} = ${c.total}. `
                + 'On écrit le chiffre des unités, et le reste part en retenue.');
        }
        return this.note(c.emprunte
            ? 'Le chiffre du haut est trop petit : on lui ajoute dix, et l\'on ajoute un au '
                + 'chiffre du BAS de la colonne suivante.'
            : 'On soustrait directement : le chiffre du haut est assez grand.');
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'po-note' + (ton ? ` po-note--${ton}` : '');
    }

    showNext() { return this.poser(); }

    // --- La démonstration -----------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        try {
            cur.protegerZone([this.grilleEl, this.zoneEl]);
            await gate.wait(500);
            cur.say('D\'abord aligner : les unités sous les unités. C\'est la virgule qui commande, '
                + 'pas le bord droit.', this.grilleEl);
            await gate.wait(3000);
            this.pose = this.attendu.map(a => a.chiffres.map(c => ({ rang: c.rang, chiffre: c.chiffre })));
            this.etape = 2;
            this.rangCourant = premierRang(this.tableau);
            this.dessiner();
            await gate.wait(1000);

            for (const c of this.tableau.colonnes) {
                if (!this.isRunning) break;
                cur.say(this.operation === '+'
                    ? `${c.chiffres.filter(x => x !== null).join(' + ')}`
                        + `${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''} = ${c.total} : j'écris ${c.resultat}`
                        + `${c.retenueSortante ? `, je retiens ${c.retenueSortante}` : ''}.`
                    : `Colonne des ${this.nomRang(c.rang)} : ${c.resultat}`
                        + `${c.emprunte ? ' — j\'ai ajouté dix en haut, et un en bas à la colonne suivante.' : '.'}`,
                this.grilleEl);
                await gate.wait(2500);
                this.resultats[c.rang] = c.resultat;
                // LE ROBOT ÉCRIT LES DEUX MARQUES, comme un élève : celle du
                // haut sur la colonne qui emprunte, celle du bas sur la
                // suivante. Il n'en écrivait qu'une, et la démonstration
                // enseignait donc une moitié de geste.
                const h = attenduEn(this.tableau, c.rang, 'retenue');
                if (h) this.retenues[c.rang] = h;
                const s = rangSuivant(this.tableau, c.rang);
                if (s !== null) {
                    const a = attenduEn(this.tableau, s, 'retenue');
                    if (a) this.retenues[s] = a;
                    const b = attenduEn(this.tableau, s, 'retenue-bas');
                    if (b) this.marquesBas[s] = b;
                }
                this.rangCourant = s;
                this.dessiner();
                await gate.wait(700);
            }
            // LA DEUXIÈME PHRASE PARLAIT DU BARÈME, PAS DU GESTE : le robot montre
            // où il écrit la retenue, il ne dit pas comment le logiciel compte.
            cur.say('Moi, j\'écris les retenues dans les petits ronds : c\'est ainsi qu\'on ne les '
                + 'oublie pas.', this.grilleEl);
            await gate.wait(2800);
        } catch (e) { /* démonstration coupée */ }
        fin();
    }
}

export function enginePoserOperation(container, isDemo, params) {
    const jeu = new PoserOperation(container, isDemo, params);
    // C'EST L'USINE QUI DÉMARRE LE JEU, pas l'appelant. Le Runner appelle
    // cette fonction et garde l'instance ; il n'appelle jamais « start ». Sans
    // cette ligne, le jeu se construisait, ne dessinait rien, et l'écran
    // restait vide — sans la moindre erreur pour le dire.
    jeu.start();
    return jeu;
}
