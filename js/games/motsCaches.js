// LES MOTS CACHÉS DU COURS.
//
// On glisse le doigt sur une suite de lettres ; si elle forme un mot de la
// liste, il se surligne — ET SA DÉFINITION S'AFFICHE. C'est la seule chose qui
// distingue ce jeu d'un passe-temps de fin d'heure : on ne cherche pas des
// lettres, on relit le lexique. « Hypoténuse », « quotient », « médiatrice »
// sont exactement les mots qu'un élève reconnaît de loin sans pouvoir les
// dire, et qui font échouer une consigne qu'il aurait su traiter.
//
// La grille elle-même vit dans core/motsCaches.js, testée sans navigateur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    THEMES, tirerMots, creerGrille, segment, motTrouve, toutTrouve
} from '../core/motsCaches.js';

const SKILL = 'voc.mathematique';

class MotsCaches extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'motscaches');
        this.theme = this.params.theme || 'tout';
        this.taille = Math.max(8, Math.min(16, parseInt(this.params.taille) || 12));
        this.nbMots = Math.max(4, Math.min(16, parseInt(this.params.nbMots) || 10));
        this.diagonales = this.params.diagonales !== false;
        this.envers = !!this.params.envers;
        this.trouves = [];
        this.rate = 0;
    }

    render() {
        this.nouvelleGrille();
        this.container.innerHTML = `
            <style>
                .mc-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: 9px; height: 100%; width: 100%;
                    color: var(--text-main); user-select: none; -webkit-user-select: none;
                }
                .mc-haut {
                    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
                    justify-content: center; font-size: clamp(12px, 2.8cqw, 15px);
                }
                .mc-score { font-weight: 800; }
                .mc-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                .mc-btn:hover { background: var(--bg-hover); }

                /* Le corps : la grille et la liste des mots côte à côte quand il
                   y a de la largeur, l'une sous l'autre sur un téléphone. */
                .mc-corps {
                    display: flex; gap: 14px; align-items: flex-start;
                    justify-content: center; width: 100%; flex: 1; min-height: 0;
                }
                @container plateau (max-aspect-ratio: 1/1) {
                    .mc-corps { flex-direction: column; align-items: center; }
                }

                .mc-grille {
                    --pas: clamp(15px, min(
                        (100cqw - 24px) / var(--n),
                        (100cqh - 190px) / var(--n)
                    ), 46px);
                    display: grid; flex: none;
                    grid-template-columns: repeat(var(--n), var(--pas));
                    background: var(--bg-plateau); padding: 6px;
                    border-radius: 12px; box-shadow: var(--shadow-md);
                    touch-action: none;
                }
                @container plateau (min-aspect-ratio: 1/1) {
                    .mc-grille { --pas: clamp(15px, min((60cqw - 24px) / var(--n), (100cqh - 120px) / var(--n)), 46px); }
                }
                .mc-case {
                    width: var(--pas); height: var(--pas);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700; font-size: calc(var(--pas) * .55);
                    border-radius: calc(var(--pas) * .22); cursor: pointer;
                    transition: background .1s, color .1s, transform .1s;
                }
                .mc-case--trace { background: var(--primary); color: #fff; transform: scale(1.06); }
                /* Un mot trouvé reste lisible : on le marque au surligneur, on ne
                   le rature pas — il doit pouvoir être RELU, c'est le but. */
                .mc-case--trouve {
                    background: color-mix(in srgb, var(--success) 30%, transparent);
                    color: var(--text-main);
                }
                .mc-case--trace.mc-case--trouve { background: var(--primary); color: #fff; }

                .mc-liste {
                    display: flex; flex-wrap: wrap; gap: 5px 8px;
                    align-content: flex-start; justify-content: center;
                    max-width: min(34cqw, 260px); min-width: 150px;
                    font-size: clamp(11px, 2.4cqw, 14px);
                }
                @container plateau (max-aspect-ratio: 1/1) {
                    .mc-liste { max-width: 100%; }
                }
                .mc-mot {
                    padding: 3px 9px; border-radius: 999px; font-weight: 700;
                    background: var(--bg-hover); border: 1px solid var(--border);
                    cursor: help;
                }
                .mc-mot--ok {
                    background: color-mix(in srgb, var(--success) 22%, transparent);
                    border-color: color-mix(in srgb, var(--success) 45%, transparent);
                    text-decoration: line-through; opacity: .75;
                }
                .mc-def {
                    min-height: 3em; text-align: center; width: 100%;
                    max-width: 620px; line-height: 1.35;
                    font-size: clamp(12px, 2.8cqw, 15px); color: var(--text-muted);
                }
                .mc-def b { color: var(--text-main); }
                .mc-def--ok {
                    background: color-mix(in srgb, var(--success) 14%, transparent);
                    border-radius: 10px; padding: 7px 12px;
                }
            </style>
            <div class="mc-wrap">
                <div class="mc-haut">
                    <span class="mc-score" data-score></span>
                    <span data-theme>${THEMES[this.theme] || ''}</span>
                    <button type="button" class="mc-btn" data-indice>💡 Indice</button>
                    <button type="button" class="mc-btn" data-neuf>🎲 Nouvelle grille</button>
                </div>
                <div class="mc-corps">
                    <div class="mc-grille" data-grille style="--n:${this.taille}"></div>
                    <div class="mc-liste" data-liste></div>
                </div>
                <p class="mc-def" data-def></p>
            </div>`;

        this.grilleEl = this.container.querySelector('[data-grille]');
        this.listeEl = this.container.querySelector('[data-liste]');
        this.defEl = this.container.querySelector('[data-def]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.donnerIndice());
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.rejouer());

        this.dessiner();
        this.brancherGestes();
        this.dire('Glisse ton doigt sur les lettres pour tracer un mot. Chaque mot trouvé te donne sa définition.');
    }

    startGameLoop() { /* Pas d'horloge : on cherche à son rythme. */ }

    nouvelleGrille() {
        const rng = makeRng(this.params.seed);
        const dispo = tirerMots({
            theme: this.theme, niveauMax: this.params.niveauMax || 3,
            nbMots: this.nbMots, rng
        });
        this.etat = creerGrille({
            taille: this.taille, nbMots: this.nbMots, rng,
            mots: dispo, diagonales: this.diagonales, envers: this.envers
        });
        this.trouves = [];
    }

    dessiner() {
        this.grilleEl.style.setProperty('--n', this.etat.taille);
        this.grilleEl.innerHTML = this.etat.grille.map((ligne, y) =>
            ligne.map((c, x) => `<div class="mc-case" data-x="${x}" data-y="${y}">${c}</div>`).join('')
        ).join('');
        this.cases = [...this.grilleEl.querySelectorAll('.mc-case')];
        this.majListe();
        this.majScore();
    }

    caseEn(x, y) {
        return this.grilleEl.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    }

    majListe() {
        this.listeEl.innerHTML = this.etat.mots.map(m =>
            `<span class="mc-mot ${this.trouves.includes(m.mot) ? 'mc-mot--ok' : ''}"
                data-mot="${m.mot}" title="${this.trouves.includes(m.mot) ? m.def.replace(/"/g, '&quot;') : 'À trouver'}">${m.mot}</span>`
        ).join('');
    }

    majScore() {
        this.scoreEl.textContent = `${this.trouves.length} / ${this.etat.mots.length} mots`;
    }

    dire(html, ton) {
        this.defEl.className = 'mc-def' + (ton ? ` mc-def--${ton}` : '');
        this.defEl.innerHTML = html;
    }

    // --- Le tracé -----------------------------------------------------------

    brancherGestes() {
        const caseSous = (ev) => {
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            return el && el.classList.contains('mc-case') ? el : null;
        };

        this.grilleEl.addEventListener('pointerdown', (ev) => {
            const el = ev.target.closest?.('.mc-case');
            if (!el) return;
            ev.preventDefault();
            this.depart = { x: +el.dataset.x, y: +el.dataset.y };
            this.dernierDepart = this.depart;
            this.tracer(this.depart, this.depart);
        });
        this.grilleEl.addEventListener('pointermove', (ev) => {
            if (!this.depart) return;
            // `elementFromPoint` plutôt que ev.target : au doigt, la cible reste
            // celle du pointerdown pendant tout le glissement.
            const el = caseSous(ev);
            if (el) this.tracer(this.depart, { x: +el.dataset.x, y: +el.dataset.y });
        });
        const fin = (ev) => {
            if (!this.depart) return;
            const el = caseSous(ev) || ev.target.closest?.('.mc-case');
            const arrivee = el ? { x: +el.dataset.x, y: +el.dataset.y } : this.depart;
            this.depart = null;
            this.valider(arrivee);
        };
        this.grilleEl.addEventListener('pointerup', fin);
        this.grilleEl.addEventListener('pointercancel', () => {
            this.depart = null; this.effacerTrace(); this.derniere = null;
        });
    }

    effacerTrace() {
        this.cases.forEach(c => c.classList.remove('mc-case--trace'));
    }

    tracer(a, b) {
        this.effacerTrace();
        const cases = segment(a.x, a.y, b.x, b.y);
        this.derniere = cases;
        if (!cases) return;
        cases.forEach(c => this.caseEn(c.x, c.y)?.classList.add('mc-case--trace'));
    }

    valider(arrivee) {
        const cases = this.derniere;
        const depart = this.dernierDepart;
        this.effacerTrace();
        this.derniere = null;
        if (!cases) {
            // Un geste de travers ne trace rien du tout — et sans un mot, on
            // regarde son doigt en se demandant pourquoi la case ne s'allume
            // pas. Le silence est ici le pire retour possible.
            if (depart && arrivee && (depart.x !== arrivee.x || depart.y !== arrivee.y)) {
                this.dire('Un mot se trace en ligne DROITE : une ligne, une colonne ou une diagonale — jamais en escalier.');
            }
            return;
        }
        if (cases.length < 2) return;

        const mot = motTrouve(this.etat, cases);
        if (!mot) {
            // Un tracé raté ne coûte rien et ne s'écrit nulle part : chercher
            // suppose d'essayer, et compter les essais comme des fautes
            // apprendrait exactement le contraire de ce qu'on veut.
            this.rate++;
            this.dire('Ce n\'est pas un mot de la liste. Regarde aussi les colonnes et les diagonales.');
            return;
        }
        if (this.trouves.includes(mot.mot)) {
            this.dire(`<b>${mot.mot}</b> — ${mot.def}`, 'ok');
            return;
        }

        this.trouves.push(mot.mot);
        for (let i = 0; i < mot.longueur; i++) {
            this.caseEn(mot.x + mot.dx * i, mot.y + mot.dy * i)?.classList.add('mc-case--trouve');
        }
        this.majListe();
        this.majScore();
        this.dire(`✅ <b>${mot.mot}</b> — ${mot.def}`, 'ok');
        this.onCorrectAnswer(null, SKILL, {
            points: 10, questionText: `Trouver « ${mot.mot} » et lire sa définition`,
            given: mot.mot, expected: mot.mot
        });

        if (toutTrouve(this.etat, this.trouves)) {
            this.dire(`🎉 Les ${this.etat.mots.length} mots sont trouvés ! Relis la liste : ce sont les mots que ton cours emploie sans les expliquer.`, 'ok');
            this.onCorrectAnswer(null, SKILL, {
                points: 30, questionText: `Grille de vocabulaire (${THEMES[this.theme]}) terminée`,
                given: 'terminée', expected: 'terminée'
            });
        }
    }

    // --- Aides --------------------------------------------------------------

    donnerIndice() {
        const reste = this.etat.mots.filter(m => !this.trouves.includes(m.mot));
        if (!reste.length) return;
        const m = reste[0];
        // L'indice ne donne pas le mot : il donne sa DÉFINITION et sa première
        // lettre clignotante. On cherche alors le mot en pensant à ce qu'il
        // veut dire — ce qui est le seul apprentissage possible ici.
        this.effacerTrace();
        const el = this.caseEn(m.x, m.y);
        if (el) {
            el.classList.add('mc-case--trace');
            setTimeout(() => el.classList.remove('mc-case--trace'), 1400);
        }
        this.dire(`Indice : « ${m.def} » — ce mot commence sur la case allumée et se lit en ${m.direction}.`);
    }

    rejouer() {
        this.params.seed = undefined;
        this.nouvelleGrille();
        this.dessiner();
        this.dire('Nouvelle grille. Glisse ton doigt sur les lettres pour tracer un mot.');
    }

    // --- Le robot -----------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.grilleEl);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Des mots de mathématiques sont cachés dans cette grille : horizontalement, verticalement, en diagonale. On glisse le doigt de la première lettre à la dernière.', this.grilleEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (const m of this.etat.mots.slice(0, 3)) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const depart = this.caseEn(m.x, m.y);
            const arrivee = this.caseEn(m.x + m.dx * (m.longueur - 1), m.y + m.dy * (m.longueur - 1));
            cur.say(`Je cherche un mot qui se lit en ${m.direction}. Là : ${m.mot.split('').join(' ')}.`, depart);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            if (!await cur.moveTo(depart) || !this.isRunning) return fin();
            this.tracer({ x: m.x, y: m.y }, { x: m.x + m.dx * (m.longueur - 1), y: m.y + m.dy * (m.longueur - 1) });
            if (!await cur.moveTo(arrivee) || !this.isRunning) return fin();
            this.valider({ x: m.x + m.dx * (m.longueur - 1), y: m.y + m.dy * (m.longueur - 1) });
            cur.say(`${m.mot} : ${m.def}`, arrivee);
            if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et c\'est là tout l\'intérêt : chaque mot trouvé donne sa définition. Le bouton 💡 fait l\'inverse — il donne la définition, à toi de retrouver le mot.', this.grilleEl);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineMotsCaches(container, isDemo, params) {
    const jeu = new MotsCaches(container, isDemo, params);
    jeu.start();
    return jeu;
}
