// LES PRIORITÉS OPÉRATOIRES — à l'écran, ligne après ligne.
//
// Le noyau (core/priorites.js) sait quelle opération est prioritaire et
// pourquoi. Ici : l'expression cliquable, le soulignement, et la ligne qui
// s'écrit dessous.
//
// DEUX GESTES, ET ON NE PASSE PAS AU SECOND SANS AVOIR RÉUSSI LE PREMIER.
// L'élève clique l'opération — elle se souligne — puis il donne son résultat
// dans le trou de la ligne suivante. Fondre les deux en un seul geste ferait
// disparaître la moitié de l'exercice : on saurait qu'il s'est trompé, jamais
// sur quoi.
//
// ON ÉCRIT COMME AU TABLEAU, ET C'EST TOUT L'INTÉRÊT :
//
//     2 × 3 + 9        ← on souligne « 2 × 3 » d'UN SEUL TRAIT
//     ___ + 9          ← on passe À LA LIGNE, on recopie le reste, on remplit
//     15
//
// Le trait est continu sous les trois jetons : souligner « 2 », « × » et « 3 »
// séparément donne trois tirets, et trois tirets ne désignent pas un calcul.
// Et le résultat ne se met JAMAIS au bout de la ligne du dessus derrière un
// « = » : ce n'est pas la ligne du dessus qui vaut 6, c'est le morceau souligné.
//
// LES LIGNES PRÉCÉDENTES RESTENT À L'ÉCRAN, en gris. On voit ce qu'on a
// recopié, et l'erreur de recopie — celle qui coûte le plus de points en
// contrôle — devient visible au lieu de se cacher dans une tête.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { poserPaveTactile, sansClavierSysteme, auDoigt } from '../ui/paveTactile.js';
import { tirerOppose, reponseJuste } from '../core/opposeParentheses.js';
import {
    tirerExpression, operationPrioritaire, critiquer, reduire, reduirePourEcrire,
    ecrireJeton,
    ecrire, terminee
} from '../core/priorites.js';

const COMPETENCE = 'num.prio';

class Priorites extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'priorites');
        this.rng = makeRng(this.params.seed);
        // CINQ BARREAUX QUAND L'OPPOSÉ EST EN JEU, quatre sinon : l'échelle de
        // Rémy ajoute « avec les priorités » APRÈS les quatre de remplissage.
        const hautBarreau = this.params.oppose ? 5 : 4;
        this.niveau = Math.max(1, Math.min(hautBarreau, parseInt(this.params.niveau) || 2));
        this.avecParentheses = this.params.parentheses !== false;
        this.avecPuissances = !!this.params.puissances;
        // LES NOMBRES RELATIFS DANS LA CASCADE. Rémy : « sur les Prio-Bot
        // relatifs, ne mets pas de QCM mais plutôt des calculs en ligne par
        // étape ». C'est le bon exercice pour ce couplage : la faute des
        // relatifs se commet À UNE LIGNE PRÉCISE — on calcule 3 × (−2) juste,
        // puis on recopie « 5 − 6 » au lieu de « 5 − (−6) ». Un QCM ne voit que
        // le résultat final et ne peut pas dire où l'élève a dérapé ; la
        // cascade, elle, s'arrête sur la ligne fautive.
        this.relatifs = !!this.params.relatifs;
        // LE MOINS DEVANT UNE PARENTHÈSE — Rémy : « les élèves galèrent aux
        // exercices −(−3+5×6)−(−7) […] je pense qu'il faut être progressif ».
        // C'est une TABLE DE FORMES différente, et rien d'autre : la cascade,
        // la correction et les messages ne changent pas d'un mot.
        this.avecOppose = !!this.params.oppose;
        // Un opposé sans négatifs n'enseigne rien : le réglage entraîne l'autre.
        if (this.avecOppose) this.relatifs = true;
        // ─────────────────────────────────────────────────────────────────────
        // LES QUATRE PREMIERS BARREAUX DE L'OPPOSÉ NE SE CLIQUENT PAS : ON LES
        // REMPLIT.
        //
        // Rémy, après avoir vu ses élèves dessus : « Au départ, je préfèrerais
        // juste remplacer (avec QCM éventuellement) −(−4) = ? −(+4) = ? puis
        // −(−4) + (−5) = .......... = ; l'élève écrit +4 − 5 et donne le
        // résultat. […] Puis avec des priorités opératoires ».
        //
        // POURQUOI CE N'EST PAS UN DÉTAIL D'INTERFACE. La cascade à cliquer est
        // le geste du chapitre des PRIORITÉS : trancher un ordre. Ici on
        // apprend UNE règle de signe, et on ne devrait avoir à penser qu'à
        // elle. Demander de conduire une cascade dès la première question fait
        // payer les deux difficultés d'un coup — c'est exactement ce qui a
        // arrêté ses élèves.
        //
        // La cascade revient au barreau 5, où elle est le sujet.
        this.remplissage = this.avecOppose && this.niveau <= 4;
        // L'option qui voyage avec chaque appel au noyau : c'est elle qui
        // autorise une soustraction à descendre sous zéro.
        this.opts = { relatifs: this.relatifs };
        this.reussies = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .pr-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; overflow-y: auto;
                }
                .pr-tete {
                    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .9rem;
                }
                .pr-score { font-weight: 800; }
                .pr-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                @media (hover: hover) {
                    .pr-btn:hover { background: var(--bg-hover); }
                }

                /* LA CASCADE. Chaque ligne sous la précédente, alignée à
                   gauche : c'est la présentation du cahier, et elle rend la
                   recopie vérifiable d'un coup d'œil. */
                .pr-cascade {
                    display: flex; flex-direction: column; gap: 6px;
                    align-items: flex-start; width: 100%; max-width: 560px;
                    font-size: clamp(20px, 6cqw, 34px); font-weight: 700;
                    font-variant-numeric: tabular-nums; padding: 6px 2px;
                }
                .pr-ligne {
                    display: flex; align-items: flex-end; gap: .3em; flex-wrap: wrap;
                    min-height: 1.5em;
                }
                /* Les lignes déjà faites s'effacent sans disparaître. */
                .pr-ligne--passee { opacity: .42; font-size: .78em; }

                .pr-jeton {
                    padding: 2px 6px; border-radius: 8px; line-height: 1.1;
                    border: 2px solid transparent;
                }
                /* L'ENCRE EST LA VERSION « TEXTE » DU JETON, PAS LE JETON.
                   --primary est une couleur de FOND ; posée en encre sur
                   --bg-hover, elle donne 1,65 de contraste en thème sombre —
                   deux gris-bleus l'un sur l'autre. --primary-texte existe
                   exactement pour cela, et il s'éclaircit en thème sombre au
                   lieu de s'assombrir. */
                .pr-jeton--op {
                    cursor: pointer; background: var(--bg-hover); color: var(--primary-texte);
                    border-color: var(--border); transition: .12s;
                }
                @media (hover: hover) {
                    .pr-jeton--op:hover { background: var(--primary); color: #fff; }
                }

                /* L'OPÉRATION SOULIGNÉE : UN SEUL TRAIT sous les trois jetons.
                   C'est pour cela qu'ils sont enveloppés ensemble — souligner
                   chacun de son côté donnait trois tirets séparés, et trois
                   tirets ne montrent aucun calcul. */
                .pr-souligne {
                    display: inline-flex; align-items: center; gap: .3em;
                    padding: 0 .1em 3px;
                    border-bottom: 4px solid var(--primary);
                    background: color-mix(in srgb, var(--primary) 14%, transparent);
                    border-radius: 6px 6px 0 0;
                }
                /* Un opérateur ne ressemble à un bouton que TANT QU'IL EN EST
                   UN. Dans le trait, et sur les lignes déjà écrites, il n'y a
                   plus rien à cliquer : c'est de l'écriture, pas un choix. */
                .pr-souligne .pr-jeton,
                .pr-ligne--passee .pr-jeton--op {
                    background: transparent; border-color: transparent;
                    cursor: default; color: inherit;
                }
                .pr-jeton--faux { animation: pr-non .34s ease; }
                @keyframes pr-non { 25% { translate: -6px 0; } 75% { translate: 6px 0; } }

                .pr-trou {
                    width: 2.8em; text-align: center; font: inherit; font-weight: 800;
                    border: none; border-bottom: 3px solid var(--primary);
                    background: color-mix(in srgb, var(--primary) 10%, transparent);
                    color: var(--text-main); padding: 2px; border-radius: 6px 6px 0 0;
                }
                .pr-trou:focus { outline: 2px solid var(--primary); outline-offset: 2px; }

                .pr-note {
                    min-height: 2.6em; text-align: center; line-height: 1.35;
                    font-size: clamp(13px, 3cqw, 15px); color: var(--text-muted);
                    max-width: 560px;
                }
                .pr-note--ok { color: var(--success); font-weight: 700; }
                .pr-note--ko { color: var(--danger); font-weight: 700; }

                /* ─────── LES QUATRE BARREAUX QU'ON REMPLIT ───────
                   L'énoncé reste en tête, en gros ; les lignes remplies
                   s'effacent sous lui comme les lignes passées d'une
                   cascade. C'est la présentation du cahier, et c'est la
                   seule que l'élève retrouvera sur sa copie. */
                .pr-aide {
                    font-size: clamp(12px, 3cqw, 14px); color: var(--text-muted);
                    text-align: center; max-width: 520px; min-height: 1.3em;
                }
                /* UN TROU QUI ATTEND UNE LIGNE EST PLUS LARGE QU'UN TROU QUI
                   ATTEND UN NOMBRE. « 4 − 5 » ne tient pas dans 2,8 em, et un
                   champ trop court fait croire qu'on s'est trompé d'endroit. */
                .pr-trou--ligne { width: 5.2em; }
                /* CE QU'ON N'A PAS ENCORE ATTEINT SE VOIT SANS S'OFFRIR :
                   les pointillés disent qu'il y aura quelque chose à écrire
                   là, et qu'on n'y est pas encore. */
                .pr-apres {
                    opacity: .38; border-bottom: 3px dotted currentColor;
                    padding: 2px .4em; border-radius: 6px 6px 0 0;
                }
                /* UNE RÉPONSE DONNÉE RESTE LISIBLE ET CESSE D'ÊTRE UN CHAMP :
                   elle fait partie de la ligne, désormais. */
                .pr-dit { color: var(--primary); }
                /* Une ligne pas encore atteinte s'annonce sans s'imposer :
                   elle dit combien d'étapes il reste, elle ne demande rien. */
                .pr-ligne--aVenir { opacity: .5; }
                /* ET L'AIDE DISPARAÎT QUAND ELLE EST VIDE : en cascade elle ne
                   sert pas (la note dit déjà quoi faire), et une hauteur
                   réservée pour rien pousse le calcul vers le haut. */
                .pr-aide:empty { min-height: 0; }

                /* LE QCM DU PREMIER BARREAU. Quatre nombres, en ligne s'ils
                   tiennent, sinon sur deux rangées — jamais une colonne de
                   quatre, qui pousse la question hors de l'écran au doigt. */
                .pr-qcm {
                    display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
                    max-width: 520px;
                }
                .pr-choix {
                    font: inherit; font-weight: 800;
                    font-size: clamp(18px, 5cqw, 26px);
                    min-width: 3.4em; min-height: 48px; padding: 8px 18px;
                    border: 2px solid var(--border); border-radius: 12px;
                    background: var(--bg-panel); color: var(--text-main); cursor: pointer;
                }
                @media (hover: hover) {
                    .pr-choix:hover { border-color: var(--primary); background: var(--bg-hover); }
                }
                .pr-choix:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
                .pr-choix--faux { animation: pr-non .34s ease; border-color: var(--danger); }
                .pr-choix--juste { border-color: var(--success); color: var(--success); }
            </style>
            <div class="pr-wrap">
                <div class="pr-tete">
                    <span class="pr-score" data-score></span>
                    <button type="button" class="pr-btn" data-indice>💡 Pourquoi ?</button>
                    <button type="button" class="pr-btn" data-neuf>↺ Autre calcul</button>
                </div>
                <div class="pr-cascade" data-cascade></div>
                <!-- CE QU'IL FAUT FAIRE MAINTENANT, sous la ligne en cours.
                     Séparé de la note : la note dit si c'est juste, l'aide dit
                     ce qu'on attend. Les mêler faisait disparaître la consigne
                     à chaque correction. -->
                <p class="pr-aide" data-aide></p>
                <p class="pr-note" data-note></p>
            </div>`;

        this.cascadeEl = this.container.querySelector('[data-cascade]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.aideEl = this.container.querySelector('[data-aide]');

        // AU DOIGT, LE CLAVIER DU TÉLÉPHONE NE S'OUVRE PAS. Le champ de saisie
        // naît d'un clic sur une opération, donc APRÈS le geste de l'élève :
        // iOS refuse alors d'ouvrir son clavier, et l'on regardait un curseur
        // clignoter sans pouvoir écrire. Le pavé est à nous, il s'ouvre
        // toujours, et il vise le champ courant — recréé à chaque redessin.
        if (auDoigt()) {
            const zone = this.container.querySelector('.pr-wrap');
            this.pave = poserPaveTactile(zone, {
                // Sous la cascade, avant la note : en fin de page le pavé
                // sortait de l'écran d'un téléphone.
                avant: zone.querySelector('.pr-note'),
                // LE « − », SANS QUOI LES RELATIFS SONT INJOUABLES AU DOIGT.
                //
                // Rémy : « on ne peut écrire les − pour le prio bot relatifs à
                // la calculatrice ». C'est exact, et c'était total : le champ
                // porte `inputmode: none` (le clavier du système ne s'ouvre pas
                // — voir `trouHtml`), le pavé est donc la SEULE façon d'écrire,
                // et il n'avait pas de touche de signe. Sur « 2 − 8 × (−4) »,
                // la réponse de la ligne est −32 : l'élève pouvait taper 32 et
                // rien d'autre. Il n'avait aucun moyen de répondre juste.
                //
                // Seulement là où c'est le sujet : sur les Prio-Bot ordinaires
                // aucune ligne ne descend sous zéro, et une touche de signe n'y
                // servirait qu'à fabriquer des fautes.
                signe: this.relatifs,
                // LE « + » N'EST LÀ QUE LÀ OÙ IL S'ÉCRIT. Au barreau 2, l'élève
                // tape une LIGNE — « 4 − 5 », parfois « +4 − 5 » : sans touche
                // « + », la moitié des écritures justes lui sont interdites.
                // Ailleurs, un « + » dans un trou qui attend un nombre ne
                // fabriquerait que des fautes.
                touches: this.remplissage ? [{ k: '+', cls: 'pav-touche--signe' }] : [],
                // ET LE TROU D'UNE LIGNE EST PLUS LONG QU'UN NOMBRE : « −4 − 5 »
                // fait cinq signes plus les espaces, le plafond de six coupait
                // la réponse pendant qu'on l'écrivait.
                maxLong: this.remplissage ? 12 : 6,
                champ: () => this.container.querySelector('.pr-trou'),
                valider: () => {
                    const trou = this.container.querySelector('.pr-trou');
                    if (!trou || !trou.value.trim()) return;
                    if (this.remplissage) this.validerDuPave(trou);
                    else this.valider(trou);
                }
            });
        }
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.poser());
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.expliquer());
        this.poser();
    }

    startGameLoop() { /* Pas d'horloge : on réfléchit à son rythme. */ }

    poser() {
        // DEUX FAÇONS DE RÉPONDRE, ET C'EST LE BARREAU QUI TRANCHE. Les quatre
        // premiers barreaux de l'opposé se remplissent ; tout le reste — les
        // Prio-Bot, les relatifs, et le barreau 5 de l'opposé — se clique.
        if (this.remplissage) return this.poserRemplissage();
        const e = tirerExpression({
            rng: this.rng, niveau: this.niveau, parentheses: this.avecParentheses,
            puissances: this.avecPuissances, relatifs: this.relatifs,
            avecOppose: this.avecOppose
        });
        this.expression = e;
        // Chaque ligne écrite, avec l'endroit où elle est soulignée.
        this.lignes = [{ jetons: e.jetons, souligne: null }];
        this.choisi = null;              // l'index de l'opération soulignée
        // La ligne en train de s'écrire : le reste recopié, et un trou.
        this.brouillon = null;
        this.note('Clique sur l\'opération qu\'il faut faire EN PREMIER.');
        this.dessiner();
        return true;
    }

    /** L'état courant : les jetons de la dernière ligne écrite. */
    get courant() { return this.lignes[this.lignes.length - 1].jetons; }

    dessiner() {
        this.cascadeEl.innerHTML = '';
        const dernier = this.lignes.length - 1;
        this.lignes.forEach((l, i) => {
            this.cascadeEl.appendChild(this.ligneHtml(l, {
                passee: i < dernier,
                // On ne clique que sur la dernière ligne, et seulement tant
                // qu'aucune opération n'est encore soulignée.
                cliquable: i === dernier && !this.brouillon
            }));
        });
        if (this.brouillon) this.cascadeEl.appendChild(this.ligneHtml(this.brouillon, {}));
        if (this.scoreEl) {
            this.scoreEl.textContent = `${this.reussies} calcul${this.reussies > 1 ? 's' : ''} mené${this.reussies > 1 ? 's' : ''} au bout`;
        }
        const trou = this.cascadeEl.querySelector('.pr-trou');
        if (trou) trou.focus();
    }

    /**
     * Une ligne de la cascade.
     * @param {{jetons:Object[], souligne:?number}} l
     */
    ligneHtml(l, { passee, cliquable }) {
        const ligne = document.createElement('div');
        ligne.className = 'pr-ligne' + (passee ? ' pr-ligne--passee' : '');

        let k = 0;
        while (k < l.jetons.length) {
            // LES TROIS JETONS SOULIGNÉS TIENNENT DANS UNE SEULE ENVELOPPE :
            // c'est elle qui porte le trait, et il est donc continu.
            if (l.souligne != null && k === l.souligne - 1) {
                const bloc = document.createElement('span');
                bloc.className = 'pr-souligne';
                for (let m = k; m <= l.souligne + 1 && m < l.jetons.length; m++) {
                    bloc.appendChild(this.jetonHtml(l.jetons[m], m, false, l.jetons[m - 1]));
                }
                ligne.appendChild(bloc);
                k = l.souligne + 2;
                continue;
            }
            ligne.appendChild(this.jetonHtml(l.jetons[k], k, cliquable, l.jetons[k - 1]));
            k++;
        }
        return ligne;
    }

    /** Un jeton : un nombre, un opérateur cliquable, ou LE TROU à remplir. */
    jetonHtml(j, k, cliquable, avant) {
        if (j.trou) return this.trouHtml();
        const el = document.createElement('span');
        // UNE PUISSANCE SE CLIQUE COMME UN OPÉRATEUR. C'est elle, l'opération
        // à faire : « 4² » n'a pas de signe entre deux nombres, il y a un
        // nombre qui porte son exposant. L'élève la souligne donc comme il
        // soulignerait un ×.
        // ET LE MOINS UNAIRE AUSSI — c'est une opération, la seule de « −(−4) ».
        //
        // Rémy : « −(−4) il demande de cliquer sur une opération mais ça ne va
        // pas, ça ne fait rien ». MESURÉ : sur « − (−4) », les deux jetons
        // sortaient en `.pr-jeton` nus, sans `--op`, donc sans gestionnaire de
        // clic. L'écran réclamait un clic et n'offrait rien à cliquer — l'élève
        // ne pouvait pas se tromper, il était simplement arrêté.
        //
        // Le jeton `u` avait été ajouté au MOTEUR sans l'être à la MAIN qui le
        // montre : `etapes()` savait le réduire, l'écran ne savait pas le
        // proposer. Une épreuve du moteur passait donc au vert sur un exercice
        // injouable.
        const agissant = j.type === 'op' || j.type === 'p' || j.type === 'u';
        el.className = 'pr-jeton' + (agissant ? ' pr-jeton--op' : '');
        // LE VOISIN DE GAUCHE VOYAGE AVEC LE JETON : c'est lui qui décide si le
        // nombre négatif prend ses parenthèses. Sans lui, la cascade écrivait
        // « 4 + 3 ÷ −3 », deux signes qui se suivent — ce qu'on ne lit nulle
        // part et surtout pas dans le chapitre qui installe cette notation.
        el.textContent = ecrireJeton(j, avant);
        if (cliquable && agissant) {
            el.addEventListener('click', () => this.choisir(k, el));
        }
        return el;
    }

    trouHtml() {
        const trou = document.createElement('input');
        trou.className = 'pr-trou';
        trou.type = 'text';
        trou.inputMode = 'numeric';
        trou.setAttribute('aria-label', 'résultat de l\'opération soulignée');
        // « Entrée » valide, puis le champ disparaît au redessin — ce qui
        // déclenche « blur », donc un second envoi. Ici il tombe dans le
        // vide (l'opération choisie est retombée à null), mais par chance
        // seulement : le verrou le dit au lieu d'en dépendre.
        // Le verrou se pose AVANT l'appel : valider redessine, ce qui
        // retire le champ, ce qui déclenche « blur » — le second envoi
        // partirait pendant que l'affectation attend son retour.
        let rendu = false;
        const valider = () => {
            if (rendu || !trou.value.trim()) return;
            rendu = true;
            if (!this.valider(trou)) rendu = false;
        };
        trou.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') valider(); });
        // AU DOIGT, PAS DE VALIDATION À LA PERTE DE FOCUS : toucher une touche
        // du pavé fait sortir le champ, et la réponse serait partie au premier
        // chiffre tapé. C'est le bouton OK du pavé qui valide.
        if (!auDoigt()) trou.addEventListener('blur', valider);
        sansClavierSysteme(trou);
        return trou;
    }

    /** L'élève désigne une opération. */
    choisir(index, el) {
        const critique = critiquer(this.courant, index, this.opts);
        if (critique) {
            el.classList.add('pr-jeton--faux');
            setTimeout(() => el.classList.remove('pr-jeton--faux'), 360);
            this.note(critique, 'ko');
            // Se tromper d'opération est une VRAIE erreur : elle compte, et
            // c'est celle qu'on veut voir dans le carnet.
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Quelle opération d'abord dans ${ecrire(this.courant)} ?`,
                input: ecrire([this.courant[index]]),
                expected: ecrire([this.courant[operationPrioritaire(this.courant, this.opts).index]]),
                customMessage: critique
            });
            return;
        }
        this.choisi = index;
        const ligne = this.lignes[this.lignes.length - 1];
        ligne.souligne = index;
        const p = operationPrioritaire(ligne.jetons, this.opts);
        // ON PASSE À LA LIGNE : le reste est recopié tel quel, et le résultat
        // ira dans le trou, à la place exacte du calcul souligné.
        this.brouillon = reduirePourEcrire(ligne.jetons, index);
        this.brouillon.souligne = null;
        this.note(`${p.raison} Écris sur la ligne du dessous combien fait ${p.libelle}.`);
        this.dessiner();
    }

    /**
     * L'élève donne le résultat de l'opération soulignée.
     * @returns {boolean} vrai si la ligne est passée — c'est le verrou du champ.
     */
    valider(trou) {
        if (this.choisi === null) return false;
        // LE VRAI SIGNE MOINS EST ACCEPTÉ COMME LE TRAIT D'UNION. L'expression
        // l'écrit « − » (U+2212) ; le clavier de l'élève produit « - ». Les
        // deux disent la même chose, et refuser le second serait refuser le
        // seul que l'élève puisse taper.
        const brut = trou.value.trim().replace(',', '.').replace(/[\u2212\u2013]/g, '-');
        if (!brut) return false;
        const p = operationPrioritaire(this.courant, this.opts);
        // DANS LE TROU, ON ÉCRIT UN NOMBRE — pas un calcul. Sans ce contrôle,
        // « 2+9 » passait pour une réponse et le reproche devenait absurde :
        // « 8 − 6 ne fait pas 2+9 ».
        //
        // ET LE NOMBRE PEUT ÊTRE NÉGATIF QUAND L'EXERCICE LE PERMET. Mesuré à
        // l'écran sur « 2 − 8 × (−4) » : l'élève tapait −32, la bonne réponse,
        // et se voyait répondre « on écrit le RÉSULTAT, un seul nombre, pas un
        // calcul ». Le contrôle refusait le signe, donc la cascade des relatifs
        // était bloquée dès sa première ligne.
        const forme = this.relatifs ? /^-?\d+(\.\d+)?$/ : /^\d+(\.\d+)?$/;
        if (!forme.test(brut)) {
            this.note(`Dans le trou, on écrit le RÉSULTAT de ${p.libelle} `
                + '— un seul nombre, pas un calcul.', 'ko');
            trou.value = '';
            trou.focus();
            return false;
        }
        if (Number(brut) !== p.valeur) {
            this.note(`${p.libelle} ne fait pas ${brut.replace('.', ',')}. Recompte.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: p.libelle,
                input: brut, expected: String(p.valeur),
                customMessage: 'L\'opération choisie était la bonne : c\'est le calcul qu\'il faut refaire.'
            });
            trou.value = '';
            trou.focus();
            return false;
        }

        const suivant = reduire(this.courant, this.choisi, p.valeur);
        this.lignes.push({ jetons: suivant, souligne: null });
        this.brouillon = null;
        this.choisi = null;

        if (terminee(suivant)) {
            this.reussies++;
            this.note(`✅ ${this.expression.texte} = ${suivant[0].valeur}. `
                + `${this.expression.etapes} étapes, aucune recopie ratée.`, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: this.expression.texte,
                expected: String(this.expression.resultat),
                given: String(suivant[0].valeur),
                points: 6 + this.expression.etapes * 3
            });
            this.dessiner();
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1900);
            return true;
        }
        this.note('Bien. La ligne est recopiée — quelle opération maintenant ?');
        this.dessiner();
        return true;
    }

    // ─────────────────── LES QUATRE BARREAUX QU'ON REMPLIT ───────────────────
    //
    // Rémy : « Au départ, je préfèrerais juste remplacer (avec QCM
    // éventuellement) −(−4) = ? −(+4) = ? puis −(−4) + (−5) = .......... = ;
    // l'élève écrit +4 − 5 et donne le résultat. Puis −(−3+5) = −(....) […]
    // Puis avec des priorités opératoires ».
    //
    // UNE QUESTION EST UNE SUITE DE LIGNES, chacune faite de morceaux : du
    // texte qu'on lit, et des trous qu'on remplit de gauche à droite. Quand
    // tous les trous d'une ligne sont bons, la ligne descend et la suivante
    // s'ouvre. Le tirage ne connaît rien de l'écran, l'écran ne calcule rien :
    // tout ce qui est mathématique vit dans `js/core/opposeParentheses.js`, où
    // il s'éprouve sans navigateur.

    poserRemplissage() {
        this.q = tirerOppose({ rng: this.rng, niveau: this.niveau });
        this.ligne = 0;          // la ligne en cours
        this.trouFait = [];      // ce que l'élève a déjà écrit, ligne par ligne
        this.qcmFige = null;     // la proposition cliquée, le temps de la montrer
        this.note('');
        this.dessinerRemplissage();
        return true;
    }

    /**
     * LE QCM N'EST LÀ QUE POUR INSTALLER LA RÈGLE, PUIS IL S'EFFACE.
     *
     * Rémy, à la question posée : « QCM d'abord, saisie ensuite ». Les trois
     * premières questions se cliquent — au doigt c'est immédiat, et l'erreur
     * se lit : celui qui choisit « −4 » a recopié au lieu de changer le signe.
     * Ensuite on écrit, parce qu'on peut trouver un QCM en éliminant, et que
     * ce qui compte ici est d'ÉCRIRE un signe.
     */
    get auQcm() { return this.niveau === 1 && this.reussies < 3; }

    dessinerRemplissage() {
        this.cascadeEl.innerHTML = '';

        // L'ÉNONCÉ EN TÊTE, et il ne bouge plus : c'est à lui que l'élève
        // revient à chaque ligne.
        const tete = document.createElement('div');
        tete.className = 'pr-ligne';
        tete.appendChild(Object.assign(document.createElement('span'),
            { className: 'pr-jeton', textContent: this.q.enonce }));
        this.cascadeEl.appendChild(tete);

        // TOUTES LES LIGNES SONT LÀ DÈS LE DÉPART, celles qu'on n'a pas encore
        // atteintes en pointillés. C'est la notation de Rémy telle qu'il l'a
        // écrite — « −(−4) + (−5) = .......... = » — et elle dit d'un coup d'œil
        // combien d'étapes il y a. Ne montrer que la ligne en cours faisait
        // apparaître la suivante par surprise, une fois la première validée.
        this.q.lignes.forEach((l, i) => {
            const ligne = document.createElement('div');
            ligne.className = 'pr-ligne'
                + (i < this.ligne ? ' pr-ligne--passee' : '')
                + (i > this.ligne ? ' pr-ligne--aVenir' : '');
            let rang = 0;
            for (const m of l.morceaux) {
                if (m.t === 'texte') {
                    ligne.appendChild(Object.assign(document.createElement('span'),
                        { className: 'pr-jeton', textContent: m.v }));
                    continue;
                }
                ligne.appendChild(this.trouRemplissageHtml(m, i, rang));
                rang++;
            }
            this.cascadeEl.appendChild(ligne);
        });

        if (this.auQcm) this.cascadeEl.appendChild(this.qcmHtml());

        if (this.scoreEl) {
            this.scoreEl.textContent = `${this.reussies} calcul${this.reussies > 1 ? 's' : ''} `
                + `mené${this.reussies > 1 ? 's' : ''} au bout`;
        }
        if (this.aideEl) {
            this.aideEl.textContent = this.auQcm
                ? 'Que vaut ce calcul ?'
                : (this.q.lignes[this.ligne] || {}).aide || 'Écris la réponse.';
        }
        const trou = this.cascadeEl.querySelector('.pr-trou');
        if (trou) trou.focus();
    }

    /** Un trou : déjà rempli, en cours, ou pas encore atteint. */
    trouRemplissageHtml(m, iLigne, rang) {
        const fait = (this.trouFait[iLigne] || [])[rang];
        if (fait !== undefined) {
            return Object.assign(document.createElement('span'),
                { className: 'pr-jeton pr-dit', textContent: fait });
        }
        // LE PREMIER TROU NON REMPLI DE LA LIGNE EN COURS est le seul qui
        // s'ouvre : remplir dans le désordre n'aurait aucun sens sur une ligne
        // qui se lit de gauche à droite, et deux champs à la fois font hésiter.
        //
        // ET AUCUN CHAMP NE S'OUVRE PENDANT LE QCM. Vu à la capture : l'écran
        // montrait un champ de saisie vide AU-DESSUS des quatre propositions —
        // deux façons de répondre à la même question, dont une qui ne marchait
        // pas. On répond par le QCM, ou l'on écrit ; jamais les deux.
        const enCours = !this.auQcm && iLigne === this.ligne
            && rang === (this.trouFait[iLigne] || []).length;
        if (!enCours) {
            return Object.assign(document.createElement('span'),
                { className: 'pr-jeton pr-apres', textContent: '…' });
        }

        // LE TROU OUVERT EST RETENU : le pavé tactile valide sans savoir quel
        // trou il remplit, et il lui faut la réponse attendue.
        this.mCourant = m;
        const trou = document.createElement('input');
        trou.className = 'pr-trou' + (m.genre === 'expression' ? ' pr-trou--ligne' : '');
        trou.type = 'text';
        trou.setAttribute('aria-label', m.genre === 'expression'
            ? 'la ligne réécrite sans parenthèses' : 'le résultat');
        // AU DOIGT, LE CLAVIER DU SYSTÈME RESTE FERMÉ : c'est notre pavé qui
        // écrit, comme partout ailleurs dans ce jeu (voir `trouHtml`).
        if (auDoigt()) sansClavierSysteme(trou);
        let rendu = false;
        const valider = () => {
            if (rendu || !trou.value.trim()) return;
            rendu = true;
            if (!this.validerRemplissage(trou, m)) rendu = false;
        };
        trou.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') valider(); });
        if (!auDoigt()) trou.addEventListener('blur', valider);
        return trou;
    }

    qcmHtml() {
        const zone = document.createElement('div');
        zone.className = 'pr-qcm';
        for (const c of this.q.choix) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'pr-choix';
            b.textContent = c.v;
            if (this.qcmFige === c.v) b.classList.add(c.juste ? 'pr-choix--juste' : 'pr-choix--faux');
            b.addEventListener('click', () => this.choisirQcm(c, b));
            zone.appendChild(b);
        }
        return zone;
    }

    choisirQcm(c, bouton) {
        if (this.qcmFige) return;               // une réponse déjà donnée
        if (c.juste) {
            this.qcmFige = c.v;
            this.trouFait[0] = [c.v];
            bouton.classList.add('pr-choix--juste');
            return this.gagner();
        }
        // UN PIÈGE QUI DIT POURQUOI. Une croix rouge apprend qu'on s'est
        // trompé ; la phrase apprend en quoi — et c'est la seule des deux qui
        // évite de recommencer la même erreur.
        bouton.classList.add('pr-choix--faux');
        setTimeout(() => bouton.classList.remove('pr-choix--faux'), 360);
        this.note(c.pourquoi, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: this.q.enonce, input: c.v, expected: this.q.reponse,
            customMessage: c.pourquoi
        });
    }

    validerRemplissage(trou, m) {
        const donne = trou.value.trim();
        if (!donne) return false;
        if (!reponseJuste(donne, m.attendu)) {
            trou.classList.add('pr-jeton--faux');
            setTimeout(() => trou.classList.remove('pr-jeton--faux'), 360);
            // CE QU'ON REPROCHE DÉPEND DE CE QU'ON ATTENDAIT. Répondre le
            // RÉSULTAT à la ligne de réécriture n'est pas la même erreur que se
            // tromper de signe, et le dire pareil n'apprendrait ni l'une ni
            // l'autre.
            this.note(m.genre === 'expression'
                ? 'Pas encore : on réécrit la ligne SANS parenthèses, on ne la calcule '
                    + 'pas. Le moins devant une parenthèse change le signe de ce qu\'il y a dedans.'
                : `Ce n'est pas ${donne}. Reprends le signe.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: this.q.enonce, input: donne, expected: m.montre
            });
            trou.value = '';
            trou.focus();
            return false;
        }

        (this.trouFait[this.ligne] = this.trouFait[this.ligne] || []).push(m.montre);
        const combien = this.q.lignes[this.ligne].morceaux.filter(x => x.t === 'trou').length;
        if (this.trouFait[this.ligne].length < combien) {
            this.note('');
            this.dessinerRemplissage();
            return true;
        }
        if (this.ligne < this.q.lignes.length - 1) {
            this.ligne++;
            this.note('Bien.');
            this.dessinerRemplissage();
            return true;
        }
        this.gagner();
        return true;
    }

    /** La question est finie : on compte, on félicite, et on en pose une autre. */
    gagner() {
        this.reussies++;
        this.note(`✅ ${this.q.enonce} = ${this.q.reponse}.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: this.q.enonce,
            expected: this.q.reponse, given: this.q.reponse,
            // LE BARREAU PÈSE DANS LES POINTS : remplir deux lignes et deux
            // parenthèses n'est pas le même travail que cliquer un nombre
            // parmi quatre.
            points: 4 + this.niveau * 2
        });
        this.dessinerRemplissage();
        setTimeout(() => { if (this.isRunning) this.poser(); }, 1700);
    }

    /** Le pavé tactile valide : il faut lui redonner le trou attendu. */
    validerDuPave(trou) {
        if (this.mCourant) this.validerRemplissage(trou, this.mCourant);
    }

    expliquerRemplissage() {
        this.note(this.q.pourquoi);
    }

    expliquer() {
        if (this.remplissage) return this.expliquerRemplissage();
        const p = operationPrioritaire(this.courant, this.opts);
        if (!p) return this.note('Il n\'y a plus rien à calculer.');
        if (this.choisi === null) {
            this.note(`${p.raison} Cherche-la dans « ${ecrire(this.courant)} ».`);
        } else {
            this.note(`Il faut calculer ${p.libelle}, `
                + 'puis RECOPIER tout le reste sans y toucher.');
        }
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'pr-note' + (ton ? ` pr-note--${ton}` : '');
    }

    showNext() { return this.poser(); }

    // --- La démonstration -------------------------------------------------------

    /**
     * LA DÉMONSTRATION DES BARREAUX QU'ON REMPLIT.
     *
     * Celle de la cascade parle de `this.expression` et de `this.courant`, qui
     * n'existent pas ici : lancée sur ces barreaux, elle levait à sa deuxième
     * ligne et le `catch` l'avalait. L'aperçu du catalogue montrait alors une
     * case vide — pas une erreur, ce qui est pire : rien ne disait que quelque
     * chose manquait.
     *
     * ELLE MONTRE LA RÈGLE, PAS LE LOGICIEL. Ce qu'un élève doit emporter de
     * quinze secondes d'aperçu, c'est « le moins change le signe de ce qu'il y
     * a dans la parenthèse » — pas où l'on clique.
     */
    async runDemoRemplissage() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        try {
            cur.protegerZone(this.cascadeEl);
            await gate.wait(500);
            cur.say(`Voilà « ${this.q.enonce} ». Le moins devant la parenthèse `
                + 'prend l\'OPPOSÉ de ce qu\'il y a dedans.', this.cascadeEl);
            await gate.wait(2800);

            // LE QCM D'ABORD, S'IL EST LÀ : c'est ce que l'élève verra.
            if (this.auQcm) {
                const bon = [...this.container.querySelectorAll('.pr-choix')]
                    .find(b => b.textContent === this.q.reponse);
                cur.say(this.q.pourquoi, bon || this.cascadeEl);
                await gate.wait(2600);
                if (bon) await cur.tap(bon);
                await gate.wait(1200);
                cur.say('Le nombre ne change pas : seul son signe change.', this.cascadeEl);
                await gate.wait(2400);
                return fin();
            }

            for (let tour = 0; tour < 6 && this.isRunning; tour++) {
                const trou = this.cascadeEl.querySelector('.pr-trou');
                if (!trou || !this.mCourant) break;
                const m = this.mCourant;
                cur.say(m.genre === 'expression'
                    ? 'D\'abord on RÉÉCRIT la ligne sans parenthèses. On ne la calcule '
                        + `pas encore : ${m.montre}.`
                    : `Ici, ${m.montre}.`, trou);
                await gate.wait(2400);
                trou.value = m.montre;
                this.validerRemplissage(trou, m);
                await gate.wait(1100);
                if (this.reussies > 0) break;      // la question est finie
            }
            cur.say(this.q.pourquoi, this.cascadeEl);
            await gate.wait(2600);
        } catch (e) { /* démonstration coupée */ }
        fin();
    }

    async runDemoSequence() {
        if (this.remplissage) return this.runDemoRemplissage();
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        try {
            cur.protegerZone(this.cascadeEl);
            await gate.wait(500);
            cur.say(`Voilà « ${this.expression.texte} ». On ne calcule PAS de gauche à droite.`,
                this.cascadeEl);
            await gate.wait(2600);

            for (let tour = 0; tour < 6 && this.isRunning; tour++) {
                const p = operationPrioritaire(this.courant, this.opts);
                if (!p) break;
                // La dernière ligne EST celle qu'on joue : le brouillon troué
                // n'existe pas encore, on n'a pas encore souligné.
                const ops = [...this.cascadeEl.querySelectorAll('.pr-ligne:last-child .pr-jeton')];
                const cible = ops[p.index];
                cur.say(p.raison, cible || this.cascadeEl);
                await gate.wait(2200);
                if (cible) await cur.tap(cible);
                this.choisir(p.index, cible || document.createElement('span'));
                await gate.wait(900);

                const trou = this.cascadeEl.querySelector('.pr-trou');
                cur.say(`Je souligne, je passe à la ligne, je RECOPIE le reste sans y toucher. `
                    + `Et dans le trou : ${p.libelle} = ${p.valeur}.`, trou || this.cascadeEl);
                await gate.wait(2400);
                if (trou) { trou.value = String(p.valeur); this.valider(trou); }
                await gate.wait(1000);
            }
            cur.say('C\'est la recopie qui coûte des points en contrôle, pas la règle.',
                this.cascadeEl);
            await gate.wait(2600);
        } catch (e) { /* démonstration coupée */ }
        fin();
    }
}

export function enginePriorites(container, isDemo, params) {
    const jeu = new Priorites(container, isDemo, params);
    // C'EST L'USINE QUI DÉMARRE LE JEU, pas l'appelant. Le Runner appelle
    // cette fonction et garde l'instance ; il n'appelle jamais « start ». Sans
    // cette ligne, le jeu se construisait, ne dessinait rien, et l'écran
    // restait vide — sans la moindre erreur pour le dire.
    jeu.start();
    return jeu;
}
