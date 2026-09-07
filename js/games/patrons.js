// LE PATRON DU CUBE — l'écran.
//
// La figure à plat, deux boutons, et le pliage qui tranche. Toute la géométrie
// vit dans `core/patrons.js`, testée sans navigateur ; ce fichier dessine.
//
// LE PLIAGE EST LA RÉCOMPENSE, ET IL VIENT APRÈS LA RÉPONSE. C'est l'ordre qui
// compte : on demande d'abord de DÉCIDER, et l'on montre ensuite. Un bouton
// « plier » disponible avant la réponse ferait de l'exercice une manipulation
// sans enjeu — on plierait pour voir, puis on cocherait. Ici on s'engage, puis
// on regarde si l'on avait raison, ce qui est la même chose qu'une conjecture
// suivie d'une vérification.
//
// LE PLIAGE SE PLIE. Il a fallu deux essais pour l'admettre. La première
// version ne faisait que COLORIER les cases de la face qu'elles deviendraient,
// avec cet argument : « ce qu'on veut faire voir, c'est quelle case devient
// quelle face, et c'est une information de coloriage, pas de volume. »
// L'argument est faux, et Rémy l'a dit en six mots : « le patron qui se plie
// ne se plie pas ». Un coloriage montre le RÉSULTAT du pliage à qui sait déjà
// plier ; l'élève qui ne sait pas, lui, a besoin de voir les carrés SE LEVER.
// C'est le geste qui manque, pas la couleur.
//
// Les carrés se relèvent donc vraiment, en trois dimensions, autour de leurs
// arêtes communes : chaque carré est une boîte emboîtée dans celle de son
// voisin, et un seul angle — l'angle du pli, de 0 à 90 degrés — les fait tous
// tourner ensemble, chacun entraînant ce qui est accroché plus loin. C'est
// exactement ainsi qu'une feuille se plie. L'arbre du pliage vient du noyau
// (`arbrePliage`), qui est le MÊME parcours que celui qui décide de la
// réponse : l'animation ne peut donc pas montrer un cube qui se ferme là où le
// calcul dit qu'il se recouvre.
//
// ET QUAND ÇA SE RECOUVRE, ON LE VOIT ARRIVER. Le carré en trop se pose PAR
// DESSUS celui qui occupait déjà la place, légèrement en avant pour qu'on
// distingue les deux épaisseurs. « Il retombe sur une face déjà prise » cesse
// d'être une phrase.
//
// QUAND ÇA NE SE FERME PAS, ON MONTRE OÙ. Le noyau rend `doublons` : les cases
// qui reçoivent une face déjà prise. Ce sont elles qui se recouvrent, et les
// désigner vaut mieux que « ce n'est pas un patron » — l'élève voit alors
// pourquoi, et la fois d'après il cherche le recouvrement.

import { BaseGame } from '../core/BaseGame.js';
import {
    FAMILLES, ORDRE_FAMILLES, CONSIGNES,
    preparerSerie, plier, profil, arbrePliage
} from '../core/patrons.js';
import { makeRng } from '../core/ids.js';

const COMPETENCE = 'geo.espace.patron';

/**
 * LES SIX COULEURS DES FACES, PAR PAIRES.
 *
 * Les opposées partagent une teinte et se distinguent par la clarté : c'est ce
 * qui rend la question « laquelle sera en face ? » lisible d'un coup d'œil une
 * fois le pliage montré. Choisies distinguables aussi en noir et blanc, parce
 * que la fiche s'imprime et qu'un daltonien lit le même écran que les autres.
 */
const TEINTES = [
    '#3d6fd0', '#a8c2f0',   // paire 0/1 — bleu
    '#2f8f5b', '#a9dcbe',   // paire 2/3 — vert
    '#c06a1f', '#f0cfa4'    // paire 4/5 — orange
];

/**
 * DU DÉPLACEMENT D'UNE CASE AU SENS DU PLI.
 *
 * Le noyau parle en `dx, dy` — la case voisine est à droite, en dessous. Le
 * dessin, lui, a besoin de savoir autour de QUELLE ARÊTE le carré se relève :
 * c'est la même information, dite du point de vue du pli.
 */
const SENS = { '1,0': 'est', '-1,0': 'ouest', '0,1': 'sud', '0,-1': 'nord' };

const enTexte = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Patrons extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'patrons');
        const familles = Array.isArray(this.params.familles) && this.params.familles.length
            ? this.params.familles : ORDRE_FAMILLES;
        this.rng = makeRng(this.params.graine);
        this.serie = preparerSerie(this.rng, {
            familles,
            combien: Math.max(2, this.params.combien | 0 || 8)
        });
        this.rang = 0;
        this.plie = false;       // le pliage a-t-il été montré pour cette question ?
        this.fini = false;
    }

    get question() { return this.serie[this.rang]; }

    render() {
        this.container.innerHTML = `
            <style>
                .pa-wrap {
                    display: flex; flex-direction: column; gap: 8px; width: 100%; height: 100%;
                    padding: 8px 10px 10px; box-sizing: border-box; color: var(--text-main);
                    min-height: 0; container-type: inline-size;
                }
                .pa-consigne {
                    text-align: center; color: var(--text-muted); flex: 0 0 auto;
                    font-size: clamp(11px, 2.3cqw, 14px); line-height: 1.35;
                    max-width: 620px; margin: 0 auto;
                }
                .pa-consigne b { color: var(--text-main); }
                /* LA SCÈNE EST UN CONTENEUR DE TAILLE : c'est elle qui dit
                   au carré combien de pixels il vaut, sans que personne n'ait
                   à mesurer quoi que ce soit en JavaScript. */
                .pa-scene {
                    flex: 1 1 auto; min-height: 0; position: relative;
                    container-type: size; container-name: pascene;
                    /* LES CARRÉS SONT EN POSITION ABSOLUE ET NE POUSSENT RIEN :
                       ce qui dépasse dépasse pour de bon. L'audit l'a mesuré —
                       49 px hors de l'écran pendant le pliage, quand la
                       perspective rapproche une face du regard et l'agrandit.
                       La scène est déjà dimensionnée pour contenir la figure à
                       plat ; on coupe ce qui sortirait du cadre plutôt que de
                       laisser la page déborder. */
                    overflow: hidden;
                }
                /* La perspective vit sur le parent des faces, jamais sur les
                   faces : posée sur chacune, chaque carré aurait son propre
                   point de fuite et le cube ne se refermerait pas. */
                .pa-stage {
                    position: absolute; inset: 0;
                    perspective: calc(var(--s) * 11);
                    perspective-origin: 50% 45%;
                }
                /* La variable du côté d'un carré. Les demi-étendues « hx »
                   et « hy » disent jusqu'où la figure s'écarte du carré resté
                   posé ; on divise la place par le double, et tout tient à
                   plat comme une fois plié. */
                .pa-monde {
                    position: absolute; inset: 0;
                    --s: min(calc(92cqw / (2 * var(--hx))), calc(92cqh / (2 * var(--hy))));
                    transform-style: preserve-3d;
                    /* DEUX CADRAGES POUR DEUX ÉTATS, et le glissement de l'un à
                       l'autre fait partie du pli. À plat, c'est la FIGURE qu'on
                       centre ; pliée, c'est le CUBE, qui se forme autour du
                       carré resté posé — rarement au milieu de la figure. Sans
                       ce décalage, le cube se refermait dans un coin. La
                       variable « plat » vaut 1 tant que c'est à plat et 0 une
                       fois plié : la translation s'annule d'elle-même. */
                    transform: translate(calc(var(--dx, 0) * var(--s) * var(--plat, 1)),
                                         calc(var(--dy, 0) * var(--s) * var(--plat, 1)))
                               rotateX(var(--vx, 0deg)) rotateY(var(--vy, 0deg));
                    transition: transform .9s cubic-bezier(.34, .01, .2, 1);
                }
                /* DES CARRÉS CARRÉS, ET QUI SE TOUCHENT VRAIMENT.
                   Rémy : « utilise des carrés non arrondis. J'ai l'impression
                   qu'ils sont décalés. Quand ça se plie, c'est un peu décalé. »
                   Les deux remarques n'en font qu'une, et la mesure a donné la
                   cause : les carrés voisins se CHEVAUCHAIENT de 1 à 3 px.

                   La raison est un piège classique. Un enfant en position
                   absolue se place par rapport à la BOÎTE DE PADDING de son
                   parent, pas à sa boîte de bordure : en « border-box », un
                   « left: 100% » valait donc « le côté MOINS les deux
                   bordures », soit trois pixels de trop vers la gauche — et
                   cela s'accumulait le long d'une chaîne de carrés.

                   Le trait est donc un « outline », qui ne fait PAS partie de la
                   boîte : la géométrie redevient exacte, et le contour se
                   dessine à l'intérieur grâce au décalage négatif. Les coins
                   sont vifs, comme un patron découpé aux ciseaux. */
                .pa-face {
                    --trait: 1.5px;
                    position: absolute; width: var(--s); height: var(--s);
                    box-sizing: border-box; border: none;
                    outline: var(--trait) solid var(--text-main);
                    outline-offset: calc(-1 * var(--trait));
                    background: var(--card-bg, #fff);
                    transform-style: preserve-3d;
                    /* Une face vue de dos reste peinte : sinon, la moitié du
                       cube disparaît dès qu'il tourne. */
                    backface-visibility: visible;
                    transition: transform .9s cubic-bezier(.34, .01, .2, 1),
                                background-color .5s ease, outline-color .3s ease;
                    display: flex; align-items: center; justify-content: center;
                }
                /* LE CARRÉ RESTÉ POSÉ. Il ne tourne pas : c'est la table. */
                .pa-face--racine {
                    left: 50%; top: 50%;
                    margin-left: calc(var(--s) / -2); margin-top: calc(var(--s) / -2);
                }
                /* Les quatre sens du pli. Le point de rotation est L'ARÊTE
                   COMMUNE avec le carré porteur, et les quatre signes sont
                   choisis pour que tout se relève DU MÊME CÔTÉ — vers celui
                   qui regarde. Un seul signe inversé et le cube se retourne
                   comme un gant. */
                .pa-face--est {
                    left: 100%; top: 0; transform-origin: 0% 50%;
                    transform: rotateY(calc(-1 * var(--a, 0deg))) rotateY(var(--releve, 0deg));
                }
                .pa-face--ouest {
                    left: -100%; top: 0; transform-origin: 100% 50%;
                    transform: rotateY(var(--a, 0deg)) rotateY(calc(-1 * var(--releve, 0deg)));
                }
                .pa-face--sud {
                    left: 0; top: 100%; transform-origin: 50% 0%;
                    transform: rotateX(var(--a, 0deg)) rotateX(calc(-1 * var(--releve, 0deg)));
                }
                .pa-face--nord {
                    left: 0; top: -100%; transform-origin: 50% 100%;
                    transform: rotateX(calc(-1 * var(--a, 0deg))) rotateX(var(--releve, 0deg));
                }
                /* LE CUBE EN VERRE, POUR LA QUESTION DES FACES OPPOSÉES.
                   Un cube fermé cache trois de ses six faces, et deux faces
                   opposées ne sont JAMAIS visibles ensemble : la réponse —
                   « ces deux-là portent la même teinte » — devenait invérifiable
                   au moment précis où on la donne. Les faces deviennent donc
                   translucides une fois le pli terminé : on voit à travers, et
                   la paire se lit d'un coup d'œil. Seulement pour cette
                   question-là ; pour « est-ce un patron ? », un cube plein dit
                   mieux qu'il est fermé.
                   Et la transparence passe par la COULEUR, jamais par
                   « opacity » : une opacité inférieure à 1 aplatit d'office la
                   scène 3D qu'elle contient — mesuré, le cube s'est réduit à un
                   seul carré. C'est le canal alpha du remplissage qui fait le
                   verre, et lui seul. */
                .pa-face--cliquable { cursor: pointer; }
                .pa-face--cliquable:hover { --trait: 2.5px; outline-color: var(--primary, #4a6fd4); }
                .pa-face--depart { --trait: 2.5px; outline-color: var(--primary, #4a6fd4); }
                .pa-face--choisie { --trait: 2.5px; outline-color: var(--primary, #4a6fd4); }
                /* Le carré qui retombe sur une place déjà prise : cerclé de
                   rouge, et surélevé pour qu'on voie les deux épaisseurs. */
                /* Mesuré à l'écran : surélevé d'un vingtième de carré, le
                   doublon restait COINCÉ derrière la face qu'il recouvre — on
                   n'en voyait qu'un liseré rouge. Il flotte maintenant
                   nettement au dessus, teinté, et l'on voit ce qu'on dit :
                   deux carrés pour une seule place. */
                .pa-face--double {
                    --trait: 3px; outline-color: var(--danger, #c0392b);
                    background: color-mix(in srgb, var(--danger, #c0392b) 22%, #fff);
                }
                .pa-marque {
                    font-weight: 800; color: var(--text-main);
                    font-size: calc(var(--s) * .34); line-height: 1; pointer-events: none;
                }
                .pa-outils { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; flex: 0 0 auto; }
                .pa-btn {
                    border: 1.5px solid var(--border-color, #d7dae3); background: var(--card-bg, #fff);
                    color: var(--text-main); border-radius: 10px; padding: 7px 18px; cursor: pointer;
                    font-size: clamp(12px, 2.4cqw, 15px); font-weight: 700;
                }
                .pa-btn:hover:not(:disabled) { border-color: var(--primary); }
                .pa-btn:disabled { opacity: .4; cursor: default; }
                .pa-note {
                    text-align: center; min-height: 2.6em; flex: 0 0 auto;
                    font-size: clamp(11px, 2.2cqw, 13px); line-height: 1.35;
                }
                .pa-note--ok { color: var(--success, #2e7d32); }
                .pa-note--ko { color: var(--danger, #c0392b); }
                .pa-compte { text-align: center; color: var(--text-muted); font-size: 11px; flex: 0 0 auto; }
                @container (max-width: 400px) { .pa-consigne { display: none; } }
            </style>
            <div class="pa-wrap">
                <p class="pa-consigne" data-consigne></p>
                <div class="pa-scene" data-scene></div>
                <div class="pa-outils" data-outils></div>
                <div class="pa-note" data-note></div>
                <div class="pa-compte" data-compte></div>
            </div>`;
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.sceneEl = this.container.querySelector('[data-scene]');
        this.outilsEl = this.container.querySelector('[data-outils]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.compteEl = this.container.querySelector('[data-compte]');
        this.dessiner();
    }

    dessiner() {
        const q = this.question;
        if (!q) return;
        const { faces, doublons } = plier(q.forme);
        this.doubles = new Set(doublons);
        this.faces = faces;

        // LE CARRÉ QUI RESTE POSÉ est le plus central : la figure dépliée tient
        // alors dans son cadre au lieu de partir dans un coin, et le cube fini
        // se referme au milieu. N'importe quel carré ferait l'affaire pour le
        // calcul — c'est un choix de cadrage, pas de géométrie.
        const cx = (Math.min(...q.forme.map(c => c[0])) + Math.max(...q.forme.map(c => c[0]))) / 2;
        const cy = (Math.min(...q.forme.map(c => c[1])) + Math.max(...q.forme.map(c => c[1]))) / 2;
        const ranges = q.forme.slice().sort((A, B) =>
            (Math.abs(A[0] - cx) + Math.abs(A[1] - cy)) - (Math.abs(B[0] - cx) + Math.abs(B[1] - cy)));
        // Et jamais un carré qui se recouvre : celui-là doit rester en l'air,
        // ce qu'un carré posé sur la table ne peut pas faire.
        const centre = ranges.find(c => !this.doubles.has(`${c[0]},${c[1]}`)) || ranges[0];
        const racine = `${centre[0]},${centre[1]}`;
        const arbre = arbrePliage(q.forme, racine);

        // La place qu'il faut : la moitié de la figure de chaque côté, plus un
        // souffle. C'est l'état À PLAT qui commande — le cube, lui, tient dans
        // moins de deux carrés.
        const largeur = Math.max(...q.forme.map(c => c[0])) + 1;
        const hauteur = Math.max(...q.forme.map(c => c[1])) + 1;
        const hx = largeur / 2 + 0.12;
        const hy = hauteur / 2 + 0.12;
        // Ce qui sépare le carré posé du milieu de la figure : c'est de cela
        // qu'on décale le monde tant qu'il est à plat.
        const dx = centre[0] - (largeur - 1) / 2;
        const dy = centre[1] - (hauteur - 1) / 2;

        this.sceneEl.innerHTML = `<div class="pa-stage">
            <div class="pa-monde" style="--hx:${hx};--hy:${hy};--dx:${dx};--dy:${dy}">
                ${this.faceHtml(racine, arbre, null, q)}
            </div>
        </div>`;
        this.mondeEl = this.sceneEl.querySelector('.pa-monde');

        this.consigneEl.innerHTML = enTexte(CONSIGNES[q.famille]);
        this.compteEl.textContent = `Figure ${this.rang + 1} sur ${this.serie.length}`
            + `  ·  bandes de ${q.profil}`;

        if (!this.isDemo && q.famille === 'opposees' && !this.plie) {
            this.sceneEl.querySelectorAll('[data-case]').forEach(r => {
                r.onclick = () => this.repondreOpposee(r.dataset.case);
            });
        }
        this.dessinerOutils();

        // LE PLI PART À LA FRAME SUIVANTE, ET C'EST TOUT LE TRUC. Les carrés
        // naissent à plat ; on leur donne leur angle d'arrivée une fois qu'ils
        // sont posés, et la transition CSS fait le reste. Appliquer l'angle
        // dans le même souffle que la création ne montrerait qu'un cube déjà
        // fermé — c'est ce que faisait l'ancienne version, en couleurs.
        this.appliquerPli(false, true);
        if (this.plie) {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (this.mondeEl && this.mondeEl.isConnected) this.appliquerPli(true, false);
            }));
        }
    }

    /** Un carré, et tout ce qui pend après lui. */
    faceHtml(k, arbre, sens, q) {
        const classes = ['pa-face'];
        if (sens) classes.push(`pa-face--${sens}`);
        else classes.push('pa-face--racine');
        if (q.famille === 'opposees' && !this.plie) classes.push('pa-face--cliquable');
        if (q.famille === 'opposees' && k === q.depart) classes.push('pa-face--depart');
        if (this.choisie === k) classes.push('pa-face--choisie');
        const marque = (q.famille === 'opposees' && k === q.depart)
            ? '<span class="pa-marque">★</span>' : '';
        const petits = (arbre.enfants[k] || []).map(e =>
            this.faceHtml(e.cle, arbre, SENS[`${e.dx},${e.dy}`], q)).join('');
        return `<div class="${classes.join(' ')}" data-case="${k}">${marque}${petits}</div>`;
    }

    /**
     * L'ÉTAT DU PLIAGE, EN TROIS VARIABLES.
     *
     * L'angle du pli est posé une seule fois, sur le monde : les carrés le
     * lisent par héritage, donc ils tournent tous ensemble, et une transition
     * CSS suffit à animer les six. Le point de vue bascule en même temps —
     * de face quand c'est à plat, de trois quarts quand c'est un cube : un cube
     * regardé pile en face n'est qu'un carré.
     *
     * @param {boolean} plie - l'angle d'arrivée
     * @param {boolean} sec - poser l'état sans le montrer arriver
     */
    appliquerPli(plie, sec) {
        const m = this.mondeEl;
        if (!m) return;
        const verre = !!plie && !!this.question && this.question.famille === 'opposees';
        if (sec) m.style.transition = 'none';
        m.style.setProperty('--a', plie ? '90deg' : '0deg');
        m.style.setProperty('--vx', plie ? '-24deg' : '0deg');
        m.style.setProperty('--vy', plie ? '32deg' : '0deg');
        m.style.setProperty('--plat', plie ? '0' : '1');
        m.classList.toggle('pa-monde--verre', verre);
        m.querySelectorAll('[data-case]').forEach(el => {
            const k = el.dataset.case;
            const dbl = this.doubles.has(k);
            el.classList.toggle('pa-face--double', !!(plie && dbl));
            // LA COULEUR N'APPARAÎT QU'APRÈS LE PLIAGE. Avant, elle donnerait la
            // réponse : deux carrés de la même teinte se font face.
            el.style.backgroundColor = (plie && !dbl)
                ? TEINTES[this.faces[k]] + (verre ? 'b0' : '') : '';
            // LE CARRÉ EN TROP NE SE COUCHE PAS. Première tentative : le
            // soulever d'un vingtième de carré le long de sa normale. Mesuré à
            // l'écran, il restait invisible — pour la moitié des faces, la
            // normale pointe vers l'INTÉRIEUR du cube, et le doublon partait se
            // cacher dedans. Il s'arrête donc à soixante degrés au lieu de
            // quatre-vingt-dix : un rabat qui reste en l'air, qu'aucune
            // orientation ne peut faire disparaître, et qui dit la chose mieux
            // qu'un décalage — la place est prise, il ne peut pas se poser.
            el.style.setProperty('--releve', plie && dbl ? '30deg' : '0deg');
        });
        if (sec) {
            // Forcer le calcul du style avant de rendre la transition : sinon
            // le navigateur regroupe les deux changements et rien ne s'anime.
            void m.offsetWidth;
            m.style.transition = '';
        }
    }

    dessinerOutils() {
        const q = this.question;
        if (q.famille === 'reconnaitre' && !this.plie) {
            this.outilsEl.innerHTML = `
                <button type="button" class="pa-btn" data-rep="oui">Oui, ça se plie en cube</button>
                <button type="button" class="pa-btn" data-rep="non">Non, ça ne se ferme pas</button>`;
        } else {
            this.outilsEl.innerHTML = '';
        }
        if (this.isDemo) {
            this.outilsEl.querySelectorAll('button').forEach(b => { b.disabled = true; });
            return;
        }
        this.outilsEl.querySelectorAll('[data-rep]').forEach(b => {
            b.onclick = () => this.repondreReconnaitre(b.dataset.rep === 'oui');
        });
    }

    /** « Est-ce un patron ? » — on tranche, PUIS on plie. */
    repondreReconnaitre(dit) {
        if (this.fini || this.plie || this.isDemo) return;
        const q = this.question;
        const juste = dit === q.reponse;
        this.plie = true;
        this.dessiner();

        if (juste) {
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Ce patron (bandes de ${q.profil}) se plie-t-il en cube ?`,
                expected: q.reponse ? 'oui' : 'non', given: dit ? 'oui' : 'non', points: 6
            });
            this.note(q.reponse
                ? 'Oui : les six faces tombent chacune à leur place. Les carrés de même '
                    + 'teinte se feront face.'
                : 'Non : le carré rouge reste en l’air, il ne peut pas se poser — '
                    + 'sa place est déjà prise.', 'ok');
        } else {
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Ce patron (bandes de ${q.profil}) se plie-t-il en cube ?`,
                input: dit ? 'oui' : 'non', expected: q.reponse ? 'oui' : 'non',
                silencieux: true
            });
            this.note(q.reponse
                ? 'Il se ferme, pourtant : chaque teinte est prise une seule fois. '
                    + 'Regarde le pliage.'
                : 'Il ne se ferme pas : regarde le carré rouge, il retombe sur une '
                    + 'face déjà occupée et reste en l’air.', 'ko');
        }
        this.suivant();
    }

    /** « Quelle case sera en face ? » — un clic, et l'on montre le pliage. */
    repondreOpposee(k) {
        if (this.fini || this.plie || this.isDemo) return;
        const q = this.question;
        if (k === q.depart) {
            this.note('C\'est le carré de départ : cherche celui qui lui fera face.', 'ko');
            return;
        }
        this.choisie = k;
        this.plie = true;
        const juste = k === q.reponse;
        this.dessiner();

        if (juste) {
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Quel carré se retrouve en face du carré marqué ? (bandes de ${q.profil})`,
                expected: q.reponse, given: k, points: 8
            });
            this.note('Exactement : ces deux-là portent la même teinte, ils se font face.', 'ok');
        } else {
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Quel carré se retrouve en face du carré marqué ? (bandes de ${q.profil})`,
                input: k, expected: q.reponse, silencieux: true
            });
            this.note('Pas celui-là. Les deux carrés de même teinte sont ceux qui se '
                + 'font face : repère-les sur le pliage.', 'ko');
        }
        this.suivant();
    }

    suivant() {
        if (this.rang + 1 >= this.serie.length) {
            this.fini = true;
            return this.terminerPartie({
                gagne: true, concept: COMPETENCE,
                quoi: 'Reconnaître les patrons du cube',
                obtenu: `${this.serie.length} figures`, points: 20
            });
        }
        setTimeout(() => {
            if (!this.isRunning) return;
            this.rang += 1;
            this.plie = false;
            this.choisie = null;
            this.note('');
            this.dessiner();
            // Le pliage dure neuf dixièmes de seconde : partir au bout de
            // 2,1 s ne laissait qu'un instant pour REGARDER le cube fermé, qui
            // est pourtant tout ce qu'on est venu voir.
        }, 3000);
    }

    note(texte, ton) {
        if (!this.noteEl) return;
        this.noteEl.textContent = texte || '';
        this.noteEl.className = 'pa-note' + (ton ? ` pa-note--${ton}` : '');
    }

    /** Le robot devine juste, et laisse le temps de regarder le pliage. */
    async runDemoSequence() {
        for (let i = 0; i < this.serie.length; i++) {
            if (!this.isRunning) return;
            this.rang = i;
            this.plie = false;
            this.choisie = null;
            this.dessiner();
            await new Promise(ok => setTimeout(ok, 1200));
            if (this.gelDemo) await new Promise(ok => setTimeout(ok, 700));
            const q = this.question;
            this.plie = true;
            if (q.famille === 'opposees') this.choisie = q.reponse;
            this.dessiner();
            this.note(q.famille === 'reconnaitre'
                ? (q.reponse ? 'Celui-ci se ferme.' : 'Celui-ci se recouvre : ce n\'est pas un patron.')
                : 'Les deux carrés de même teinte se font face.', q.reponse ? 'ok' : '');
            await new Promise(ok => setTimeout(ok, 1300));
        }
    }

    /**
     * LA BARRE D'AUTEUR AVANCE EN DEUX TEMPS : la première pression montre le
     * pliage de la figure affichée, la seconde passe à la suivante. Le meneur
     * appelle `sauterEtape` — pas `sauterQuestion`.
     */
    sauterEtape() {
        if (this.fini) return false;
        if (!this.plie) {
            this.plie = true;
            const q = this.question;
            if (q.famille === 'opposees') this.choisie = q.reponse;
            this.note(q.famille === 'reconnaitre'
                ? (q.reponse ? 'C\'est un patron.' : 'Ce n\'en est pas un.')
                : `La face opposée est ${q.reponse}.`, 'info');
            this.dessiner();
            return true;
        }
        if (this.rang + 1 >= this.serie.length) return false;
        this.rang += 1;
        this.plie = false;
        this.choisie = null;
        this.note('');
        this.dessiner();
        return true;
    }

    /** Pendant du saut : on replie la figure, puis on recule d'une question. */
    revenirEtape() {
        if (this.isDemo || this.fini) return false;
        if (this.plie) {
            this.plie = false;
            this.choisie = null;
            this.note('');
            this.dessiner();
            return true;
        }
        if (this.rang <= 0) return false;
        this.rang -= 1;
        this.dessiner();
        return true;
    }

    planEtapes() {
        return {
            courante: this.rang,
            liste: this.serie.map(q => (q.famille === 'reconnaitre' ? 'Plier ?' : 'En face ?')
                + ` ${q.profil}`)
        };
    }
}

export function enginePatrons(container, isDemo, params) {
    const jeu = new Patrons(container, isDemo, params);
    jeu.start();
    return jeu;
}

export const familles = FAMILLES;
export const teintes = TEINTES;
export const profilDe = profil;
