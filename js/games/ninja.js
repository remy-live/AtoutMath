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
    MODES, creerPartie, genererVague, toucher, laisserPasser, vagueFinie, resteAPrendre
} from '../core/tri.js';

class Ninja extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'ninja');
        this.mode = MODES[this.params.mode] ? this.params.mode : 'negatifs';
        this.def = MODES[this.mode];
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
                .nj-obj--cible {
                    background: radial-gradient(circle at 50% 50%, #fecaca 0 24%, #ef4444 24% 42%, #fff 42% 58%, #ef4444 58% 76%, #fecaca 76%);
                    color: #111827; box-shadow: 0 4px 0 rgba(0,0,0,.22);
                }
                .nj-etiq { font-style: normal; }
                /* Le calcul posé sur les anneaux d'une cible devient illisible :
                   il lui faut son propre fond. On ne demande pas à un élève de
                   déchiffrer avant de calculer. */
                .nj-obj--cible .nj-etiq {
                    background: rgba(255, 255, 255, .95); border-radius: 999px;
                    padding: 2px 9px; box-shadow: 0 1px 4px rgba(0,0,0,.25);
                }
                .nj-obj--pris { transform: scale(1.5) rotate(14deg); opacity: 0; }
                .nj-obj--rate {
                    animation: nj-secousse .34s ease;
                    box-shadow: 0 0 0 4px var(--danger);
                }
                @keyframes nj-secousse {
                    25% { transform: translateX(-6px); } 75% { transform: translateX(6px); }
                }

                .nj-lame {
                    position: absolute; width: 10px; height: 10px; border-radius: 50%;
                    background: var(--primary); pointer-events: none;
                    transition: opacity .3s linear, transform .3s linear;
                }
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
                <div class="nj-scene" data-scene></div>
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

        if (this.mode === 'zeros') {
            // Le nombre vole d'un seul tenant : ses chiffres doivent se lire.
            this.entites.push(this.creerEntite(v.objets, larg / 2, haut + 60, 0, -(haut * 0.036), larg, haut, 'chiffre'));
        } else {
            const type = this.mode === 'positifs' ? 'cible' : 'bulle';
            v.objets.forEach((o, i) => {
                const x = larg * (0.16 + 0.68 * (i + 0.5) / v.objets.length);
                const e = this.creerEntite([o], x, haut + 80 + i * 26, (this.rng.int(-8, 8)) / 12, -(haut * 0.033) - this.rng.int(0, 6) / 10, larg, haut, type);
                e.retard = i * 260;
                this.entites.push(e);
            });
        }
        this.note('');
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
        // La gravité est réglée pour que la cloche dure environ deux secondes :
        // le temps de LIRE un calcul, ce qui est tout le sujet.
        const g = haut * 0.00095;
        let vivantes = 0;

        for (const e of this.entites) {
            if (e.sortie) continue;
            if (this.isDemo) { vivantes++; continue; }
            if (e.retard > 0) { e.retard -= k * 16.7; continue; }
            vivantes++;
            e.x += e.vx * k;
            e.y += e.vy * k;
            e.vy += g * k;
            e.el.style.transform = `translate(${Math.round(e.x)}px, ${Math.round(e.y)}px) translateX(-50%)`;
            if (e.y > haut + 90) {
                e.sortie = true;
                e.el.remove();
                for (const id of e.objets) {
                    const p = laisserPasser(this.etat, id);
                    if (p.perdu) this.perdre(p.message);
                }
            }
        }

        if (this.etat.fini) return this.terminer();
        const toutesSorties = this.entites.every(e => e.sortie);
        if (!this.enTransition && (vagueFinie(this.etat) || toutesSorties)) {
            this.enTransition = true;
            if (vagueFinie(this.etat) && !toutesSorties) {
                this.note(`Vague ${this.etat.vagues} réussie !`, 'ok');
                this.onCorrectAnswer(null, this.def.skill, {
                    points: 15, questionText: this.consigneEl.textContent,
                    given: 'trié', expected: 'trié'
                });
            }
            this.timerId = setTimeout(() => {
                this.enTransition = false;
                if (this.isRunning && !this.etat.fini) this.lancerVague();
            }, 900);
        }
    }

    // --- Le geste -----------------------------------------------------------

    brancherGestes() {
        const viser = (ev) => {
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const cible = el && el.closest ? el.closest('[data-obj]') : null;
            if (cible) this.frapper(cible);
            this.laisserTrace(ev);
        };
        this.scene.addEventListener('pointerdown', (ev) => {
            ev.preventDefault();
            this.tranche = true;
            viser(ev);
        });
        this.scene.addEventListener('pointermove', (ev) => {
            // Sur les cibles, un simple survol ne tire pas : il faut appuyer.
            if (this.tranche) viser(ev);
        });
        const fin = () => { this.tranche = false; };
        this.scene.addEventListener('pointerup', fin);
        this.scene.addEventListener('pointercancel', fin);
        this.scene.addEventListener('pointerleave', fin);
    }

    laisserTrace(ev) {
        const r = this.scene.getBoundingClientRect();
        const d = document.createElement('div');
        d.className = 'nj-lame';
        d.style.left = `${ev.clientX - r.left - 5}px`;
        d.style.top = `${ev.clientY - r.top - 5}px`;
        this.scene.appendChild(d);
        requestAnimationFrame(() => { d.style.opacity = '0'; d.style.transform = 'scale(.3)'; });
        setTimeout(() => d.remove(), 340);
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
            this.onCorrectAnswer(null, this.def.skill, {
                points: 10,
                questionText: this.mode === 'zeros'
                    ? `Trancher un zéro inutile de ${this.etat.vague.nombre}`
                    : `${r.objet.texte} — ${this.def.consigne}`,
                given: r.objet.texte, expected: r.objet.texte
            });
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
