// Le Démineur — la version de 1990, avec des explications.
//
// Les règles n'ont pas bougé d'un pouce : un chiffre compte les mines des huit
// cases voisines, un drapeau marque, une mine ouverte termine la partie, et on
// gagne quand toutes les cases sans mine sont ouvertes. On n'y a greffé aucun
// calcul : le démineur EST déjà un exercice de raisonnement, et lui coller une
// multiplication sur chaque case en ferait un questionnaire déguisé en jeu.
//
// Ce qui change, c'est ce qu'il y a autour :
//
//  · la grille est tirée jusqu'à ce que la logique seule la termine — perdre
//    sur un coup de dé ne s'apprend pas, ça se subit ;
//  · le bouton INDICE ne désigne pas une case sûre, il montre le RAISONNEMENT
//    qui la rend sûre. Un indice qui donne la réponse ne fait gagner qu'une
//    partie ; celui-ci apprend une règle ;
//  · quand une mine est ouverte alors qu'elle était déductible, la partie le
//    dit et l'écrit dans le carnet. Quand elle ne l'était pas — ça arrive —
//    elle ne compte pas comme une faute.
//
// Toute la logique vit dans core/demineur.js, sans DOM : c'est elle qui est
// couverte par les tests.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    CACHE, OUVERT, DRAPEAU, niveauDe, creerGrille, xy,
    ouvrir, ouvrirAutour, basculerDrapeau, drapeauxPoses, gagnee,
    deduire, deductionsVisibles, poserMinesDeductibles
} from '../core/demineur.js';

const SKILL = 'num.logique.demineur';

// Les couleurs du démineur d'origine, reprises telles quelles : elles sont
// devenues un code de lecture. Un joueur reconnaît un 3 rouge avant d'avoir lu
// le chiffre — c'est ce qui fait la vitesse.
const TEINTES = ['', '#2563eb', '#15803d', '#dc2626', '#6d28d9', '#b45309', '#0e7490', '#1f2937', '#6b7280'];

class Demineur extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'demineur');
        this.niveau = niveauDe(this.params.niveau || 'debutant');
        // TROIS VIES, et une distinction qui fait tout le jeu : une mine
        // DÉDUCTIBLE coûte une vie, une mine que rien ne permettait de deviner
        // n'en coûte aucune. Avant, la moindre mine terminait la grille — y
        // compris le 50/50 de fin de partie, où le joueur n'a rien fait de
        // faux. On perdait donc une grille entière sur un coup de dé, et le
        // seul message était « c'était un pari » : vrai, mais on ne pouvait
        // plus jouer pour autant.
        this.viesMax = Math.max(1, Math.min(9, parseInt(this.params.vies) || 3));
        this.vies = this.viesMax;
        this.rng = makeRng(this.params.seed);
        this.modeDrapeau = false;
        this.secondes = 0;
        this.fini = false;
        this.gagne = false;
        this.indices = 0;
        this.aideVue = new Set();
    }

    render() {
        const n = this.niveau;
        this.grille = creerGrille(n);
        this.container.innerHTML = `
            <style>
                .dm-wrap {
                    --cols: ${n.cols}; --lignes: ${n.lignes};
                    /* La case se mesure sur la place RÉELLE du plateau, pas sur
                       la fenêtre : le même jeu tourne en aperçu dans une
                       vignette, en plein écran sur un téléphone et dans une
                       colonne sur une tablette. */
                    /* Les 2 px retranchés sont l'écart entre deux cases : sans
                       eux la grille dépasse d'autant de fois 2 px qu'elle a de
                       lignes — invisible en 9 × 9, un demi-écran en 16 × 16. */
                    --case: clamp(17px, min(
                        (100cqw - 26px) / var(--cols) - 2px,
                        (100cqh - 130px) / var(--lignes) - 2px
                    ), 54px);
                    display: flex; flex-direction: column; align-items: center;
                    gap: 8px; max-width: 100%; user-select: none; -webkit-user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .dm-bar {
                    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
                    justify-content: center;
                    width: calc(var(--case) * var(--cols) + 12px); max-width: 100%;
                }
                .dm-compteur {
                    display: flex; align-items: center; gap: 5px;
                    background: #0f172a; color: #f8fafc; font-weight: 800;
                    padding: 5px 10px; border-radius: 10px; font-size: .92rem;
                    font-variant-numeric: tabular-nums; white-space: nowrap;
                }
                .dm-compteur b { color: #fca5a5; }
                .dm-btn {
                    border: 0; border-radius: 10px; padding: 6px 11px; font-weight: 800;
                    font-size: .88rem; cursor: pointer; background: #e2e8f0; color: #0f172a;
                    display: inline-flex; align-items: center; gap: 5px;
                    transition: transform .12s ease, background .12s ease;
                }
                .dm-btn:active { transform: scale(.94); }
                .dm-btn--on { background: #f59e0b; color: #fff; box-shadow: 0 0 0 3px rgba(245,158,11,.28); }
                .dm-btn--aide { background: #ddd6fe; color: #4c1d95; }
                .dm-plateau {
                    display: grid;
                    grid-template-columns: repeat(var(--cols), var(--case));
                    grid-auto-rows: var(--case);
                    gap: 2px; padding: 6px;
                    background: #cbd5e1; border-radius: 12px;
                    box-shadow: inset 0 2px 6px rgba(15,23,42,.22);
                    touch-action: manipulation;
                }
                /* Une case fermée est en RELIEF, une case ouverte est à plat.
                   C'est le seul repère qui compte : on doit voir d'un coup
                   d'œil où finit le connu et où commence le reste. */
                .dm-case {
                    border-radius: max(3px, calc(var(--case) * .16));
                    background: linear-gradient(158deg, #f1f5f9 0%, #cbd5e1 42%, #94a3b8 100%);
                    box-shadow: inset 0 -3px 0 rgba(51,65,85,.34), inset 0 1px 0 rgba(255,255,255,.75);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: calc(var(--case) * .58);
                    line-height: 1; cursor: pointer; color: transparent;
                    transition: background .12s ease, transform .1s ease;
                }
                .dm-case:active { transform: scale(.9); }
                .dm-case--ouverte {
                    background: #fbfdff; box-shadow: inset 0 0 0 1px rgba(148,163,184,.35);
                    cursor: default;
                }
                .dm-case--vide { background: #eef2f7; box-shadow: none; }
                .dm-case--drapeau { font-size: calc(var(--case) * .62); color: #0f172a; }
                .dm-case--mine { background: #fecaca; }
                .dm-case--fatale { background: #dc2626; }
                .dm-case--rate { background: #fed7aa; }
                /* L'indice : la ou les cases qui PORTENT le raisonnement
                   pulsent en violet, la conclusion en vert ou en rouge. On voit
                   d'où vient l'information avant de voir où elle mène. */
                .dm-case--source { animation: dm-bat 1.1s ease-in-out 3; box-shadow: 0 0 0 3px #8b5cf6 inset; }
                .dm-case--sur { box-shadow: 0 0 0 3px #16a34a inset; }
                .dm-case--danger { box-shadow: 0 0 0 3px #dc2626 inset; }
                @keyframes dm-bat { 0%,100% { filter: none } 50% { filter: brightness(1.25) } }
                .dm-note {
                    min-height: 2.4em; max-width: min(520px, 100%);
                    text-align: center; font-size: .86rem; line-height: 1.35;
                    color: var(--text-secondary, #475569); padding: 0 8px;
                }
                .dm-note b { color: #7c3aed; }
                .dm-fin { font-weight: 900; font-size: 1rem; }
                .dm-fin--ok { color: #15803d; }
                .dm-fin--ko { color: #b91c1c; }
                /* En paysage, empiler barre / grille / explication mange toute
                   la hauteur et il ne reste plus de place pour la grille. On
                   passe donc à deux colonnes — et surtout, l'explication reste
                   VISIBLE : c'est elle qui fait la différence entre ce démineur
                   et n'importe quel autre, la masquer serait sacrifier le seul
                   morceau qui enseigne. */
                @container plateau (min-aspect-ratio: 3/2) and (min-width: 560px) {
                    .dm-wrap {
                        display: grid; column-gap: 16px; row-gap: 8px;
                        grid-template-columns: auto minmax(170px, 300px);
                        grid-template-rows: auto 1fr;
                        align-items: center; justify-items: center;
                        --case: clamp(15px, min(
                            (100cqw - 330px) / var(--cols) - 2px,
                            (100cqh - 30px) / var(--lignes) - 2px
                        ), 50px);
                    }
                    .dm-plateau { grid-column: 1; grid-row: 1 / span 2; }
                    .dm-bar { grid-column: 2; grid-row: 1; width: auto; align-self: end; }
                    .dm-note { grid-column: 2; grid-row: 2; text-align: left; align-self: start; }
                }
                /* Vignette de catalogue : quelques centaines de pixels de haut.
                   L'explication n'y sert à rien — personne ne lit une vignette
                   — et la grille, elle, doit rester reconnaissable. */
                @container plateau (max-height: 330px) {
                    .dm-note, .dm-bar { display: none; }
                    .dm-wrap {
                        --case: clamp(12px, min(
                            (100cqw - 20px) / var(--cols) - 2px,
                            (100cqh - 16px) / var(--lignes) - 2px
                        ), 40px);
                    }
                }
                .dm-compteur--vies { letter-spacing: -1px; }
                .dm-vie--perdue { opacity: .35; }
                /* Une mine devinée impossible : marquée en bleu, pas en rouge.
                   Le rouge dit « tu t'es trompé » ; ici, non. */
                .dm-case--pari {
                    background: #dbeafe !important; border-color: #60a5fa !important;
                    box-shadow: 0 0 0 2px rgba(96,165,250,.5) inset;
                }
            </style>
            <div class="dm-wrap">
                <div class="dm-bar">
                    <div class="dm-compteur">💣 <b data-restantes>${n.mines}</b></div>
                    <div class="dm-compteur dm-compteur--vies" data-vies></div>
                    <div class="dm-compteur">⏱ <span data-chrono>0:00</span></div>
                    <button type="button" class="dm-btn" data-mode>🚩 Drapeau</button>
                    <button type="button" class="dm-btn dm-btn--aide" data-indice>💡 Indice</button>
                    <button type="button" class="dm-btn" data-neuf>↻ Nouvelle</button>
                </div>
                <div class="dm-plateau" data-plateau></div>
                <div class="dm-note" data-note>Ouvre une case. Les chiffres comptent les mines des 8 cases voisines.</div>
            </div>
        `;

        this.plateau = this.container.querySelector('[data-plateau]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.restantesEl = this.container.querySelector('[data-restantes]');
        this.viesEl = this.container.querySelector('[data-vies]');
        this.chronoEl = this.container.querySelector('[data-chrono]');
        this.btnMode = this.container.querySelector('[data-mode]');

        const frag = document.createDocumentFragment();
        for (let i = 0; i < n.cols * n.lignes; i++) {
            const d = document.createElement('div');
            d.className = 'dm-case';
            d.dataset.i = i;
            frag.appendChild(d);
        }
        this.plateau.appendChild(frag);
        this.cases = [...this.plateau.children];
        this.majVies();

        this.brancher();

        // En démonstration, la première zone est ouverte AVANT que le robot ne
        // parle. Deux raisons : la vignette du catalogue est photographiée au
        // bout d'une seconde et demie — une grille entièrement fermée n'y dit
        // rien du jeu — et le robot peut alors commenter des chiffres déjà
        // visibles au lieu de faire attendre son premier clic.
        if (this.isDemo) {
            const d = Math.floor(this.grille.lignes / 2) * this.grille.cols
                + Math.floor(this.grille.cols / 2);
            this.premierCoup(d);
            ouvrir(this.grille, d);
        }
        this.peindre();
    }

    brancher() {
        let presse = null, longue = null, bouge = 0, depart = null;

        const fin = () => { if (longue) { clearTimeout(longue); longue = null; } };

        this.plateau.addEventListener('pointerdown', (e) => {
            const el = e.target.closest('.dm-case');
            if (!el || this.fini || this.isDemo) return;
            e.preventDefault();
            presse = Number(el.dataset.i); bouge = 0;
            depart = { x: e.clientX, y: e.clientY };
            // L'appui long pose un drapeau. C'est le seul geste de l'original
            // qui n'a pas d'équivalent tactile — et l'inventer autrement (un
            // second bouton, un double appui) obligerait à l'apprendre.
            longue = setTimeout(() => {
                longue = null;
                if (presse == null) return;
                this.marquer(presse);
                presse = null;
                if (navigator.vibrate) navigator.vibrate(18);
            }, 420);
        });
        this.plateau.addEventListener('pointermove', (e) => {
            if (!depart) return;
            bouge = Math.max(bouge, Math.hypot(e.clientX - depart.x, e.clientY - depart.y));
            if (bouge > 12) { fin(); presse = null; }
        });
        const relacher = () => { fin(); presse = null; depart = null; };
        this.plateau.addEventListener('pointerup', (e) => {
            const el = e.target.closest('.dm-case');
            const i = presse;
            relacher();
            if (!el || i == null || this.fini) return;
            if (Number(el.dataset.i) !== i) return;
            if (this.modeDrapeau) this.marquer(i);
            else this.jouer(i);
        });
        this.plateau.addEventListener('pointercancel', relacher);
        this.plateau.addEventListener('pointerleave', relacher);
        this.plateau.addEventListener('contextmenu', (e) => {
            const el = e.target.closest('.dm-case');
            e.preventDefault();
            if (!el || this.fini || this.isDemo) return;
            fin(); presse = null;
            this.marquer(Number(el.dataset.i));
        });

        this.btnMode.addEventListener('click', () => {
            this.modeDrapeau = !this.modeDrapeau;
            this.btnMode.classList.toggle('dm-btn--on', this.modeDrapeau);
            this.btnMode.textContent = this.modeDrapeau ? '🚩 Drapeau ON' : '🚩 Drapeau';
        });
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.donnerIndice());
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.rejouer());
    }

    startGameLoop() {
        this.timerInterval = setInterval(() => {
            if (!this.isRunning || this.fini || this.gelDemo) return;
            if (!this.grille.posee) return;
            this.secondes++;
            const m = Math.floor(this.secondes / 60), s = this.secondes % 60;
            if (this.chronoEl) this.chronoEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
        }, 1000);
    }

    // --- Les coups ----------------------------------------------------------

    /** Le premier clic pose les mines : il ne peut donc jamais en toucher une. */
    premierCoup(i) {
        const r = poserMinesDeductibles(this.grille, i, this.rng, 400);
        this.garanti = r.garanti;
        this.note(r.garanti
            ? 'Cette grille se termine <b>sans deviner</b> : chaque case s\'obtient par le raisonnement.'
            : 'Grille difficile : il pourrait rester un choix à faire au flair vers la fin.');
    }

    jouer(i) {
        const g = this.grille;
        if (g.etat[i] === DRAPEAU) return;
        if (!g.posee) this.premierCoup(i);

        if (g.etat[i] === OUVERT) {
            // Sur un chiffre déjà servi : le coup double de l'original.
            const su0 = deductionsVisibles(g);
            const r = ouvrirAutour(g, i);
            if (r.perdu) return this.mineTouchee(r.ouvertes.find(c => g.bombe[c]), su0);
            if (r.ouvertes.length) this.peindre();
            if (gagnee(g)) this.reussir();
            return;
        }

        // Ce que le plateau permettait de SAVOIR avant ce clic. C'est la seule
        // mesure juste : on ne juge pas le coup au résultat, on le juge à
        // l'information disponible.
        const su = deductionsVisibles(g);
        const r = ouvrir(g, i);
        this.peindre();

        if (r.perdu) return this.mineTouchee(i, su);

        if (su.surs.has(i)) {
            this.onCorrectAnswer(null, SKILL, {
                points: 10, questionText: `Ouvrir ${this.nomCase(i)}`,
                given: 'ouverte', expected: 'ouverte'
            });
            this.note(`✅ Déduction juste : ${su.surs.get(i)}`);
        } else if (su.mines.has(i)) {
            // Une case déductible comme MINE, ouverte sans exploser : impossible
            // — sauf si le solveur se trompait. On ne dit rien plutôt que de
            // raconter n'importe quoi.
            this.note('');
        }

        if (gagnee(g)) this.reussir();
    }

    /**
     * Une mine ouverte. Tout dépend de ce que le plateau permettait de SAVOIR
     * juste avant : on juge le coup à l'information disponible, pas au
     * résultat.
     *
     *  · DÉDUCTIBLE — c'est une vraie faute : elle coûte une vie, et le carnet
     *    la retient avec le raisonnement qu'il fallait faire.
     *  · IMPRÉVISIBLE — le fameux 50/50 de fin de grille : la mine se marque
     *    toute seule d'un drapeau, on ne perd rien, et LA PARTIE CONTINUE.
     *    Avant, ce coup-là fermait la grille en expliquant qu'il n'y avait rien
     *    à comprendre : le message était juste, mais on ne pouvait plus jouer.
     *    Punir un pari qu'on a soi-même rendu obligatoire n'apprend rien.
     */
    mineTouchee(i, su) {
        const g = this.grille;
        const deductible = su && su.mines.has(i);

        if (!deductible) {
            g.etat[i] = DRAPEAU;                 // la mine est repérée, pas subie
            this.peindre();
            this.cases[i].classList.add('dm-case--pari');
            this.note('🎲 <b>Rien ne permettait de le savoir.</b> La mine est marquée d\'office : '
                + 'ce coup-là était un pari, il ne coûte rien. Continue.', 'ok');
            if (gagnee(g)) this.reussir();
            return;
        }

        this.vies--;
        this.majVies();
        this.onWrongAnswer(null, {
            questionText: `Ouvrir ${this.nomCase(i)}`,
            input: 'ouverte', expected: 'drapeau', concept: SKILL, silencieux: true,
            customMessage: `${this.nomCase(i)} était déductible : ${su.mines.get(i)}`
        });

        if (this.vies > 0) {
            // La grille survit : on marque la mine et on repart. Une déduction
            // ratée doit se payer, pas tout effacer — sinon on ne revoit jamais
            // le raisonnement qu'on vient de manquer.
            g.etat[i] = DRAPEAU;
            this.peindre();
            this.cases[i].classList.add('dm-case--fatale');
            this.note(`💥 <b>Tu pouvais le savoir :</b> ${su.mines.get(i)}<br>`
                + `Il te reste ${this.vies} vie${this.vies > 1 ? 's' : ''}.`, 'ko');
            if (gagnee(g)) this.reussir();
            return;
        }

        this.note(`💥 <b>Tu pouvais le savoir :</b> ${su.mines.get(i)}<br>Plus de vies — relance une grille.`, 'ko');
        this.perdre(i);
    }

    majVies() {
        if (!this.viesEl) return;
        this.viesEl.innerHTML = '❤️'.repeat(Math.max(0, this.vies))
            + `<span class="dm-vie--perdue">${'🖤'.repeat(Math.max(0, this.viesMax - this.vies))}</span>`;
    }

    marquer(i) {
        const g = this.grille;
        if (!g.posee || g.etat[i] === OUVERT) return;
        const su = deductionsVisibles(g);
        const etat = basculerDrapeau(g, i);
        this.peindre();
        if (etat !== DRAPEAU) return;
        if (su.mines.has(i)) {
            this.onCorrectAnswer(null, SKILL, {
                points: 10, questionText: `Marquer ${this.nomCase(i)}`,
                given: 'drapeau', expected: 'drapeau'
            });
            this.note(`🚩 Bien vu : ${su.mines.get(i)}`);
        } else if (su.surs.has(i)) {
            this.onWrongAnswer(null, {
                questionText: `Marquer ${this.nomCase(i)}`,
                input: 'drapeau', expected: 'ouverte', concept: SKILL, silencieux: true,
                customMessage: `${this.nomCase(i)} ne peut pas porter de mine : ${su.surs.get(i)}`
            });
            this.note(`🚩 <b>Non :</b> ${su.surs.get(i)}`, 'ko');
        }
    }

    nomCase(i) {
        const { x, y } = xy(this.grille, i);
        return `${String.fromCharCode(65 + x)}${y + 1}`;
    }

    // --- L'indice -----------------------------------------------------------

    /**
     * Deux temps. Le premier montre le chiffre qui contient l'information, sans
     * dire ce qu'on en tire : l'élève a encore tout à faire, mais il sait où
     * regarder. Le second déroule le raisonnement et désigne les cases. Donner
     * la conclusion d'emblée ferait avancer la partie, pas l'élève.
     */
    donnerIndice() {
        if (this.fini) return;
        const g = this.grille;
        if (!g.posee) { this.note('Ouvre d\'abord une case : sans un seul chiffre, rien n\'est déductible.'); return; }
        const d = deduire(g);
        this.effacerSurbrillance();
        if (!d) {
            this.note('Aucune case ne se déduit avec certitude en l\'état. Ouvre une zone ailleurs, ou tente ta chance : ce coup-là ne comptera pas contre toi.');
            return;
        }
        const cle = d.cases.join(',');
        if (this.aideVue.has(cle)) {
            d.sources.forEach(s => this.cases[s].classList.add('dm-case--source'));
            d.cases.forEach(c => this.cases[c].classList.add(d.type === 'mine' ? 'dm-case--danger' : 'dm-case--sur'));
            this.note(`💡 ${d.texte}`);
            this.aideVue.delete(cle);
        } else {
            this.aideVue.add(cle);
            if (d.sources.length) {
                d.sources.forEach(s => this.cases[s].classList.add('dm-case--source'));
                this.note(d.sources.length > 1
                    ? `💡 Regarde ces deux chiffres <b>ensemble</b> : leurs voisines se recoupent, et ce recoupement suffit à conclure.`
                    : `💡 Tout est dans ce chiffre : compte ses drapeaux, puis ses cases encore cachées.`);
            } else {
                this.note('💡 Compte les drapeaux déjà posés et compare au nombre total de mines.');
            }
        }
        this.indices++;
    }

    effacerSurbrillance() {
        this.cases.forEach(c => c.classList.remove('dm-case--source', 'dm-case--sur', 'dm-case--danger'));
    }

    // --- Fin de partie ------------------------------------------------------

    perdre(fatale) {
        const g = this.grille;
        this.fini = true;
        for (let i = 0; i < g.bombe.length; i++) {
            if (g.bombe[i] && g.etat[i] !== DRAPEAU) g.etat[i] = OUVERT;
        }
        this.peindre();
        if (fatale != null) this.cases[fatale].classList.add('dm-case--fatale');
        const p = this.container.querySelector('[data-note]');
        if (p && !p.innerHTML.includes('💥')) this.note('💥 Mine ! Relance une grille : la suivante est neuve.', 'ko');
    }

    reussir() {
        this.fini = true;
        const g = this.grille;
        for (let i = 0; i < g.bombe.length; i++) if (g.bombe[i]) g.etat[i] = DRAPEAU;
        this.peindre();
        const m = Math.floor(this.secondes / 60), s = this.secondes % 60;
        this.note(`🎉 Grille déminée en ${m}:${String(s).padStart(2, '0')}`
            + (this.indices ? ` avec ${this.indices} indice${this.indices > 1 ? 's' : ''}.` : ' sans aucun indice !'), 'ok');
        this.onCorrectAnswer(null, SKILL, {
            points: 30, questionText: `Grille ${this.niveau.label} déminée`,
            given: 'terminée', expected: 'terminée'
        });
    }

    rejouer() {
        this.fini = false; this.gagne = false; this.secondes = 0;
        this.indices = 0; this.aideVue.clear();
        this.vies = this.viesMax; this.majVies();
        this.grille = creerGrille(this.niveau);
        if (this.chronoEl) this.chronoEl.textContent = '0:00';
        this.effacerSurbrillance();
        this.peindre();
        this.note('Ouvre une case. Les chiffres comptent les mines des 8 cases voisines.');
    }

    // --- Affichage ----------------------------------------------------------

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="dm-fin dm-fin--${ton}">${html}</span>` : html;
    }

    peindre() {
        const g = this.grille;
        for (let i = 0; i < g.etat.length; i++) {
            const el = this.cases[i];
            el.className = 'dm-case';
            if (g.etat[i] === DRAPEAU) {
                el.classList.add('dm-case--drapeau');
                el.textContent = '🚩';
                if (this.fini && !g.bombe[i]) el.classList.add('dm-case--rate');
                el.style.color = '';
            } else if (g.etat[i] === OUVERT) {
                el.classList.add('dm-case--ouverte');
                if (g.bombe[i]) {
                    el.classList.add('dm-case--mine');
                    el.textContent = '💣'; el.style.color = '';
                } else if (g.voisines[i]) {
                    el.textContent = String(g.voisines[i]);
                    el.style.color = TEINTES[g.voisines[i]];
                } else {
                    el.classList.add('dm-case--vide');
                    el.textContent = ''; el.style.color = '';
                }
            } else {
                el.textContent = ''; el.style.color = '';
            }
        }
        if (this.restantesEl) this.restantesEl.textContent = String(g.mines - drapeauxPoses(g));
    }

    // --- Le robot -----------------------------------------------------------

    /**
     * Le robot ne joue pas vite : il joue en expliquant. Chaque coup est
     * précédé de la raison qui le rend certain — c'est exactement ce qu'on
     * demande à l'élève de faire dans sa tête, et personne ne le lui a jamais
     * montré à voix haute.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.plateau);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Le démineur : chaque chiffre compte les mines des huit cases qui l\'entourent. Rien n\'est caché au hasard — tout se déduit.', this.plateau);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Le premier clic ne peut jamais tomber sur une mine : il ouvre toujours une zone, comme celle-ci. C\'est de là que part tout le raisonnement.', this.plateau);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Puis on déroule : à chaque tour, une déduction, dite avant d'être jouée.
        for (let tour = 0; tour < 14; tour++) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            if (gagnee(this.grille)) break;
            const d = deduire(this.grille);
            if (!d) {
                cur.say('Plus rien ne se déduit avec certitude : c\'est le moment où il faudrait choisir. Une grille bien tirée n\'en arrive presque jamais là.', this.plateau);
                if (!await cur.pause(DEMO_SPEED.between)) return fin();
                break;
            }
            this.effacerSurbrillance();
            d.sources.forEach(s => this.cases[s].classList.add('dm-case--source'));
            const cible = this.cases[d.cases[0]];
            cur.say(d.texte, cible);
            // `tap` attend d'abord que la bulle ait eu le temps d'être lue :
            // le robot explique, PUIS joue. L'inverse — jouer puis expliquer —
            // fait regarder le résultat au lieu du raisonnement.
            if (!await cur.tap(cible) || !this.isRunning) return fin();
            if (d.type === 'mine') {
                d.cases.forEach(c => { if (this.grille.etat[c] === CACHE) this.grille.etat[c] = DRAPEAU; });
            } else {
                d.cases.forEach(c => ouvrir(this.grille, c));
            }
            this.effacerSurbrillance();
            this.peindre();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Voilà toute la méthode : un chiffre dont les drapeaux sont au complet libère ses voisines, un chiffre à court de cases les marque toutes. Le bouton 💡 rejoue ce raisonnement quand tu bloques.', this.plateau);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineDemineur(container, isDemo, params) {
    const jeu = new Demineur(container, isDemo, params);
    jeu.start();
    return jeu;
}
