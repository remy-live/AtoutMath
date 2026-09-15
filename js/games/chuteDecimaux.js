// LA CHUTE DES DÉCIMAUX — à l'écran.
//
// Rémy : « Je pensais à un jeu sympa, un [segment] en dessous séparé en 10,
// exemple 3 jusque 4, ça fait dix espaces. Des briques tombent du ciel et il
// faut les placer entre les graduations des axes. Exemple 3,15 le placer entre
// 3,1 et 3,2 ».
//
// Le noyau (core/chuteDecimaux.js) tire la brique et le segment, et sait dire
// ce qu'une erreur veut dire. Ici on fait tomber, on écoute le doigt, et on
// montre où c'était.
//
// LE GESTE : on touche l'intervalle, la brique y va. Pas de flèches à trouver,
// pas de glisser-déposer qui rate d'un pixel — au doigt sur une tablette comme
// à la souris. Les flèches du clavier marchent aussi, pour qui les préfère.
//
// LA CHUTE EST LA PRESSION, PAS L'OBSTACLE. Elle laisse largement le temps de
// lire et de compter ; ce qu'elle interdit, c'est d'essayer les dix intervalles
// l'un après l'autre. Un jeu d'encadrement où l'on peut tout essayer
// n'enseigne pas l'encadrement, il enseigne la patience.
//
// ET ON MONTRE TOUJOURS OÙ C'ÉTAIT. Une brique qui se casse sans rien dire
// n'apprend rien : la bonne case s'allume, et la phrase de correction nomme
// l'erreur — « trop à droite : le premier chiffre après la virgule dit le
// dixième ».

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    genererChute, ecrire, verifierPose, aider, niveauDe
} from '../core/chuteDecimaux.js';

const COMPETENCE = 'num.dec.encadrer';

/**
 * L'ESPACE ENTRE DEUX CASES, EN PIXELS.
 *
 * Partagé avec `--cd-espace` dans la feuille de style ci-dessous, et ce n'est
 * pas une commodité : les traits de graduation se placent EN FONCTION de lui.
 * Deux valeurs qui doivent s'accorder ne s'écrivent qu'une fois, sans quoi
 * l'une bouge un jour et les nombres se décalent de leurs traits sans que
 * personne ne comprenne pourquoi.
 */
const ESPACE = 3;

/** Combien de secondes la brique met à tomber, selon le niveau. */
const CHUTE = { 1: 14, 2: 13, 3: 12, 4: 12 };

class ChuteDecimaux extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'chute-decimaux');
        this.rng = makeRng(this.params.seed);
        this.niveau = Number(this.params.niveau) || 1;
        this.reussis = 0;
        this.suite = 0;
        this.aidesUtilisees = 0;
        this.palierAide = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .cd-wrap {
                    display: flex; flex-direction: column; width: 100%; height: 100%;
                    padding: 10px; box-sizing: border-box; color: var(--text-main);
                    container-type: inline-size; gap: 8px;
                }
                .cd-tete {
                    display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;
                    font-size: .9rem; color: var(--text-muted);
                }
                .cd-tete b { color: var(--text-main); font-size: 1rem; }
                .cd-ciel {
                    position: relative; flex: 1 1 auto; min-height: 150px; max-height: 52vh;
                    border-radius: 14px; overflow: hidden;
                    background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%);
                }
                .cd-brique {
                    position: absolute; left: 50%; top: 0;
                    transform: translate(-50%, 0);
                    background: var(--primary, #6366f1); color: #fff;
                    font-weight: 800; font-size: clamp(1.1rem, 4cqw, 1.8rem);
                    padding: 10px 20px; border-radius: 12px;
                    box-shadow: 0 6px 16px rgba(79, 70, 229, .35);
                    white-space: nowrap;
                }
                .cd-brique--juste { background: #10b981; box-shadow: 0 6px 16px rgba(16,185,129,.4); }
                .cd-brique--faux { background: #dc2626; box-shadow: 0 6px 16px rgba(220,38,38,.4); }
                /* LA MARGE N'EST PAS DÉCORATIVE : elle loge les deux nombres
                   des extrémités. Une graduation est une FRONTIÈRE, donc le
                   premier nombre est centré sur le bord GAUCHE de la première
                   case et le dernier sur le bord DROIT de la dernière : sans
                   cette réserve, ils sortent de l'écran — mesuré à 27 px de
                   débordement de chaque côté, par l'audit. */
                .cd-droite {
                    flex: none; padding: 0 var(--cd-marge, 26px) 6px;
                    --cd-espace: 3px;
                }
                .cd-cases { display: grid; gap: var(--cd-espace); }
                .cd-case {
                    /* LA DROITE GRADUÉE MÉRITE SA PLACE : c'est elle qu'on
                       regarde pour répondre, pas le ciel. Des cases hautes se
                       touchent au doigt sans viser, et se voient du fond de la
                       salle quand le professeur projette. */
                    height: clamp(52px, 8vh, 78px); border-radius: 8px 8px 0 0; cursor: pointer;
                    background: var(--bg-hover, #f1f5f9);
                    border: 2px solid transparent; border-bottom: none;
                    transition: background .12s;
                }
                .cd-case:hover { background: #e0e7ff; }
                .cd-case--vise { border-color: var(--primary, #6366f1); background: #e0e7ff; }
                .cd-case--bonne { background: #bbf7d0; }
                .cd-case--ratee { background: #fecaca; }
                .cd-axe { height: 3px; background: var(--text-main); border-radius: 2px; }
                /* ON NE MET PAS LES NOMBRES DANS UNE GRILLE, ON LES POSE SUR
                   LEURS TRAITS. La grille demandait une colonne de plus que de
                   cases et un décalage d'une demi-colonne — ce qui faisait
                   dépasser la ligne des deux côtés. Chacun est maintenant placé
                   à sa fraction exacte, et recentré sur lui-même. */
                .cd-nombres {
                    position: relative; height: 1.5em;
                    font-size: clamp(.6rem, 2cqw, .82rem);
                }
                .cd-nombre {
                    position: absolute; top: 5px; transform: translateX(-50%);
                    text-align: center; font-variant-numeric: tabular-nums;
                    color: var(--text-muted); white-space: nowrap;
                }
                .cd-nombre b { color: var(--text-main); }
                .cd-note { min-height: 3em; font-size: .95rem; line-height: 1.4; }
                .cd-note--ok { color: #15803d; font-weight: 700; }
                .cd-note--ko { color: #b45309; }
                .cd-boutons { display: flex; gap: 8px; flex-wrap: wrap; }
                .cd-bouton {
                    border: none; border-radius: 9px; padding: 8px 15px; font: inherit;
                    font-weight: 700; cursor: pointer; background: var(--bg-hover, #e2e8f0);
                    color: var(--text-main);
                }
                .cd-jauge { height: 5px; border-radius: 99px; background: var(--bg-hover, #e2e8f0); }
                .cd-jauge i { display: block; height: 100%; border-radius: 99px;
                              background: var(--primary, #6366f1); width: 100%; }
                .cd-jauge--urgent i { background: #dc2626; }
            </style>
            <div class="cd-wrap">
                <div class="cd-tete">
                    <b data-consigne></b>
                    <span data-score></span>
                </div>
                <div class="cd-jauge"><i data-jauge></i></div>
                <div class="cd-ciel" data-ciel></div>
                <div class="cd-droite">
                    <div class="cd-cases" data-cases></div>
                    <div class="cd-axe"></div>
                    <div class="cd-nombres" data-nombres></div>
                </div>
                <div class="cd-note" data-note></div>
                <div class="cd-boutons">
                    <button type="button" class="cd-bouton" data-aide>Un indice</button>
                    <button type="button" class="cd-bouton" data-neuf>↺ Une autre brique</button>
                </div>
            </div>`;

        this.ciel = this.container.querySelector('[data-ciel]');
        this.casesEl = this.container.querySelector('[data-cases]');
        this.nombresEl = this.container.querySelector('[data-nombres]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.jaugeEl = this.container.querySelector('[data-jauge]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.consigneEl = this.container.querySelector('[data-consigne]');

        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();

        // LES FLÈCHES AUSSI. Au clavier, on vise avec ← →, on pose avec Entrée
        // ou ↓ : c'est le geste de qui a un vrai clavier, et il ne coûte rien à
        // celui qui joue au doigt.
        this._touche = (e) => {
            if (!this.tour || this.fige) return;
            if (e.key === 'ArrowLeft') { this.viser(this.vise - 1); e.preventDefault(); }
            else if (e.key === 'ArrowRight') { this.viser(this.vise + 1); e.preventDefault(); }
            else if (e.key === 'ArrowDown' || e.key === 'Enter') { this.poserLa(this.vise); e.preventDefault(); }
        };
        document.addEventListener('keydown', this._touche);

        this.poser();
    }

    startGameLoop() { /* la brique tombe toute seule */ }

    // ─────────────────────────────────────────────────────── un tour ────────

    poser() {
        this.arreterLaChute();
        this.tour = genererChute({ niveau: this.niveau, rng: this.rng });
        this.vise = Math.floor(this.tour.combien / 2);
        this.fige = false;
        this.palierAide = 0;
        this.note('');
        this.dessiner();
        this.lancerLaChute();
    }

    dessiner() {
        const t = this.tour;
        const n = niveauDe(this.niveau);
        this.consigneEl.textContent = n.titre;
        this.scoreEl.textContent = this.reussis
            ? `${this.reussis} posée${this.reussis > 1 ? 's' : ''}`
              + (this.suite > 1 ? ` · ${this.suite} d'affilée` : '')
            : 'Pose la brique entre les deux bonnes graduations.';

        const colonnes = `repeat(${t.combien}, 1fr)`;
        this.casesEl.style.gridTemplateColumns = colonnes;
        this.casesEl.innerHTML = '';
        for (let i = 0; i < t.combien; i++) {
            const c = document.createElement('div');
            c.className = 'cd-case' + (i === this.vise ? ' cd-case--vise' : '');
            c.dataset.i = i;
            c.setAttribute('role', 'button');
            c.setAttribute('aria-label',
                `Entre ${ecrire(t.graduations[i])} et ${ecrire(t.graduations[i + 1])}`);
            c.onclick = () => this.poserLa(i);
            c.onmouseenter = () => { if (!this.fige) this.viser(i); };
            this.casesEl.appendChild(c);
        }

        // LES NOMBRES SOUS L'AXE, ALIGNÉS SUR LES TRAITS ET NON SUR LES CASES.
        // Une graduation est une FRONTIÈRE : la mettre au milieu d'une case
        // ferait lire « la case 3,1 » au lieu de « entre 3,1 et 3,2 », c'est-à-
        // dire exactement le contresens qu'on veut défaire.
        // LA POSITION EXACTE D'UN TRAIT, ESPACES COMPRIS.
        //
        // Les cases sont séparées de ESPACE pixels. Le bord gauche de la case i
        // n'est donc PAS à i/combien de la largeur : c'est i fois (la largeur
        // disponible divisée par le nombre de cases), plus i espaces. Ignorer
        // les espaces décalait les traits du milieu de trois pixels — mesuré —
        // et trois pixels, sur un jeu dont tout le propos est de savoir de quel
        // CÔTÉ d'un trait on tombe, sont trois pixels de trop.
        //
        // Le dernier trait est le bord DROIT de la dernière case, c'est-à-dire
        // exactement 100 % : la formule ne vaut que pour les bords gauches.
        const creux = (t.combien - 1) * ESPACE;
        this.nombresEl.innerHTML = t.graduations.map((g, i) => {
            const ou = i === t.combien
                ? '100%'
                : `calc(${i} * (100% - ${creux}px) / ${t.combien} + ${i * ESPACE}px)`;
            return `<span class="cd-nombre" style="left:${ou}">${
                (i === 0 || i === t.combien) ? '<b>' + ecrire(g) + '</b>' : ecrire(g)}</span>`;
        }).join('');

        this.ciel.innerHTML = '';
        this.brique = document.createElement('div');
        this.brique.className = 'cd-brique';
        this.brique.textContent = ecrire(t.nombre);
        this.ciel.appendChild(this.brique);
    }

    viser(i) {
        const max = this.tour.combien - 1;
        this.vise = Math.max(0, Math.min(max, i));
        this.casesEl.querySelectorAll('.cd-case').forEach((c, k) =>
            c.classList.toggle('cd-case--vise', k === this.vise));
    }

    // ─────────────────────────────────────────────────────── la chute ───────

    lancerLaChute() {
        const duree = (CHUTE[this.niveau] || 12) * 1000;
        this.debut = Date.now();
        this.timerInterval = setInterval(() => {
            if (this.isDemo || this.fige || this.gelDemo) return;
            const passe = Date.now() - this.debut;
            const reste = Math.max(0, 1 - passe / duree);
            this.jaugeEl.style.width = (reste * 100) + '%';
            this.jaugeEl.parentElement.classList.toggle('cd-jauge--urgent', reste < 0.25);
            if (this.brique) {
                const h = this.ciel.clientHeight - this.brique.offsetHeight - 4;
                this.brique.style.top = Math.round((1 - reste) * h) + 'px';
            }
            if (reste <= 0) this.tropTard();
        }, 100);
    }

    arreterLaChute() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    }

    tropTard() {
        if (this.fige) return;
        this.fige = true;
        this.arreterLaChute();
        this.suite = 0;
        this.montrerLaBonne();
        this.brique.classList.add('cd-brique--faux');
        this.note('⏱ Trop tard — la brique s\'est cassée. '
            + `${ecrire(this.tour.nombre)} allait entre ${ecrire(this.tour.bornes.gauche)} `
            + `et ${ecrire(this.tour.bornes.droite)}.`, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `Encadrer ${ecrire(this.tour.nombre)}`,
            input: 'trop tard', expected: ecrire(this.tour.bornes.gauche)
                + ' – ' + ecrire(this.tour.bornes.droite),
            customMessage: 'Le temps a manqué.', silencieux: true
        });
        setTimeout(() => { if (this.isRunning) this.poser(); }, 2600);
    }

    montrerLaBonne() {
        const cases = this.casesEl.querySelectorAll('.cd-case');
        const bonne = cases[this.tour.bonIntervalle];
        if (bonne) bonne.classList.add('cd-case--bonne');
    }

    // ───────────────────────────────────────────────────── la réponse ───────

    poserLa(i) {
        if (this.fige || this.isDemo || !this.tour) return;
        this.fige = true;
        this.arreterLaChute();
        const r = verifierPose(this.tour, i);
        const cases = this.casesEl.querySelectorAll('.cd-case');

        // La brique va se poser sur la case choisie : c'est ce qui rend le
        // geste lisible, même quand il est faux.
        const cible = cases[i];
        if (cible && this.brique) {
            const boite = cible.getBoundingClientRect();
            const ciel = this.ciel.getBoundingClientRect();
            this.brique.style.transition = 'left .35s ease-out, top .35s ease-out';
            this.brique.style.left = Math.round(boite.left - ciel.left + boite.width / 2) + 'px';
            this.brique.style.top = Math.round(this.ciel.clientHeight - this.brique.offsetHeight - 2) + 'px';
        }

        if (r.juste) {
            this.reussis++; this.suite++;
            if (cible) cible.classList.add('cd-case--bonne');
            this.brique.classList.add('cd-brique--juste');
            this.note('✅ ' + r.dire, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Encadrer ${ecrire(this.tour.nombre)}`,
                expected: ecrire(this.tour.bornes.gauche) + ' – ' + ecrire(this.tour.bornes.droite),
                given: ecrire(this.tour.bornes.gauche) + ' – ' + ecrire(this.tour.bornes.droite),
                points: 8 + this.niveau * 2
            });
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1700);
            return;
        }

        this.suite = 0;
        if (cible) cible.classList.add('cd-case--ratee');
        this.montrerLaBonne();
        this.brique.classList.add('cd-brique--faux');
        this.note('❌ ' + r.dire, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `Encadrer ${ecrire(this.tour.nombre)}`,
            input: `${ecrire(this.tour.graduations[i])} – ${ecrire(this.tour.graduations[i + 1])}`,
            expected: `${ecrire(this.tour.bornes.gauche)} – ${ecrire(this.tour.bornes.droite)}`,
            customMessage: r.dire, silencieux: true
        });
        setTimeout(() => { if (this.isRunning) this.poser(); }, 3200);
    }

    note(texte, ton = '') {
        this.noteEl.className = 'cd-note' + (ton ? ' cd-note--' + ton : '');
        this.noteEl.textContent = texte;
    }

    /**
     * L'AIDE MONTE EN TROIS DEGRÉS, et elle arrête la chute pendant qu'on lit.
     *
     * Un indice qu'il faut lire en courant n'est pas un indice. On rend la
     * seconde moitié du temps à qui demande : il en a besoin, et le lui
     * reprendre punirait le seul geste qu'on voulait encourager.
     */
    aider() {
        if (this.isDemo || this.fige || !this.tour) return;
        this.aidesUtilisees++;
        this.note('💡 ' + aider(this.tour, this.palierAide));
        this.palierAide = Math.min(2, this.palierAide + 1);
        this.debut = Math.max(this.debut, Date.now() - (CHUTE[this.niveau] || 12) * 500);
    }

    // ───────────────────────────────────────────────────────── le robot ─────

    async runDemoSequence() {
        const cur = createDemoCursor();
        const gate = createDemoGate();
        this.demoCursor = cur; this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        const t = this.tour;

        cur.say(`La brique porte ${ecrire(t.nombre)}. En bas, la droite va de `
            + `${ecrire(t.debut)} à ${ecrire(t.debut + t.longueur)}, en dix morceaux.`, this.ciel);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('On regarde le PREMIER chiffre après la virgule : c\'est lui qui dit '
            + 'entre quelles graduations on tombe.', this.nombresEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        const cible = this.casesEl.querySelectorAll('.cd-case')[t.bonIntervalle];
        cur.say(`${ecrire(t.nombre)} est entre ${ecrire(t.bornes.gauche)} et `
            + `${ecrire(t.bornes.droite)} : c'est là.`, cible || this.casesEl);
        if (cible && !await cur.tap(cible)) return fin();
        if (cible) { cible.classList.add('cd-case--bonne'); }
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        this.arreterLaChute();
        if (this._touche) document.removeEventListener('keydown', this._touche);
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineChuteDecimaux(container, isDemo, params) {
    const jeu = new ChuteDecimaux(container, isDemo, params);
    jeu.start();
    return jeu;
}
