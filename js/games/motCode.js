// LE MOT CODÉ — à l'écran.
//
// Rémy : « fais-moi aussi le jeu (par thématique ou mélange) du jeu que je t'ai
// [montré] avec les lettres et les chiffres ».
//
// LA DIFFÉRENCE AVEC LES MOTS CROISÉS TIENT EN UN GESTE. Là-bas, on écrit une
// lettre dans UNE case. Ici, on choisit un NUMÉRO puis une lettre, et la lettre
// se pose d'un coup dans toutes les cases qui portent ce numéro. C'est tout le
// plaisir du mot codé : une trouvaille éclaire la grille entière, et c'est
// aussi ce qui la rend jouable sans définitions.
//
// D'OÙ LA CLÉ SOUS LA GRILLE, qui n'est pas un ornement mais l'état du jeu :
// autant de cases qu'il y a de lettres à retrouver, chacune avec son numéro. On
// y voit d'un coup d'œil ce qui reste à trouver — et, sur papier comme ici,
// c'est elle qu'on relit pour ne pas se contredire.
//
// LA CONTRAINTE QUI FAIT AVANCER : deux numéros ne peuvent pas cacher la même
// lettre. Le jeu la signale au lieu de la refuser — « le E est déjà sur le
// 14 » —, parce que s'en apercevoir SOI-MÊME est justement le raisonnement.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    creerMotCode, saisieInitiale, numerosFaux, lettresEnDouble,
    estResoluCode, qualiteCode, THEMES
} from '../core/motCode.js';

const COMPETENCE = 'voc.mathematique';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

class MotCode extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'mot-code');
        this.graine = this.params.seed || 'mcode';
        this.theme = THEMES[this.params.theme] ? this.params.theme : 'angles';
        this.niveauMax = Number(this.params.niveauMax) || 3;
        this.nbMots = Number(this.params.nbMots) || 10;
        this.offertes = this.params.offertes === undefined ? 3 : Number(this.params.offertes);
        this.saisie = {};
        this.verifs = 0;
        this.soufflees = new Set();
    }

    render() {
        this.container.innerHTML = `
            <style>
                .mk-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.2cqh, 9px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                /* LA GRILLE EST NOIRE SUR BLANC, quel que soit le thème choisi.
                   C'est un objet de papier : ses cases sont sa grammaire, et un
                   thème coloré les rendrait illisibles. Même règle que pour les
                   mots croisés. */
                .mk-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size;
                }
                /* PAS DE FOND SOUS LA GRILLE, et pas d'espace entre les
                   cases : une case muette doit DISPARAÎTRE, pas devenir un
                   carré gris. Rémy, sur les mots croisés imprimés : « les
                   cases qui ne servent pas, ne les mets juste pas, on ne doit
                   voir que la grille des mots ». C'est le même dessin ici — la
                   silhouette des mots se lit toute seule dès qu'on laisse le
                   blanc autour. Le trait de chaque case est donc porté par la
                   case elle-même, en ombre intérieure : elle ne prend pas de
                   place et ne décale rien. */
                .mk-grille {
                    --mk-cote: clamp(13px, min(calc(96cqw / var(--mk-cols, 10)),
                                     calc(96cqh / var(--mk-rows, 10))), 54px);
                    display: grid; gap: 0; background: transparent;
                    flex: 0 0 auto;
                }
                .mk-case {
                    position: relative; width: var(--mk-cote); height: var(--mk-cote);
                    background: #fff; border: 0; padding: 0; font: inherit;
                    box-shadow: inset 0 0 0 1px #94a3b8;
                    font-weight: 800; color: #111827;
                    font-size: calc(var(--mk-cote) * .5); line-height: 1;
                    display: flex; align-items: flex-end; justify-content: center;
                    padding-bottom: calc(var(--mk-cote) * .04);
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                }
                /* Une case muette ne se dessine pas : on ne doit voir que la
                   silhouette des mots. Rémy, sur les mots croisés : « les cases
                   qui ne servent pas, ne les mets juste pas ». */
                .mk-case--muette { background: transparent; box-shadow: none; cursor: default; }
                .mk-num {
                    position: absolute; top: 1px; left: 0; right: 0; text-align: center;
                    font-size: calc(var(--mk-cote) * .32);
                    font-weight: 700; color: #94a3b8; pointer-events: none;
                }
                .mk-case--vise { background: #ffe9b8; box-shadow: inset 0 0 0 2px #f59e0b; }
                .mk-case--donnee { background: #eef2ff; color: #3730a3; }
                .mk-case--faute { color: #dc2626; }

                /* LA CLÉ : l'état du jeu, pas une légende. Elle défile si elle
                   ne tient pas — vingt lettres sur un téléphone font deux
                   rangées, et les rogner cacherait des numéros. */
                .mk-cle {
                    display: flex; flex-wrap: wrap; gap: 3px; justify-content: center;
                    max-height: 26cqh; overflow-y: auto; width: 100%; flex: 0 0 auto;
                }
                .mk-clef {
                    --mk-c: clamp(24px, 4.4cqw, 40px);
                    width: var(--mk-c); border: 0; background: none; padding: 0;
                    font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent;
                    display: flex; flex-direction: column; align-items: center; gap: 1px;
                }
                .mk-clef b {
                    width: 100%; height: var(--mk-c);
                    display: flex; align-items: center; justify-content: center;
                    border: 1.5px solid var(--border); border-radius: 6px;
                    background: var(--bg-panel); font-size: calc(var(--mk-c) * .52);
                    color: var(--text-main);
                }
                .mk-clef i {
                    font-style: normal; font-size: calc(var(--mk-c) * .34);
                    font-weight: 700; color: var(--text-soft, #6b7280); line-height: 1;
                }
                .mk-clef--vise b { border-color: #f59e0b; background: #fff6e0; color: #92400e; }
                .mk-clef--donnee b { border-color: #6366f1; background: #eef2ff; color: #3730a3; }
                .mk-clef--faute b { border-color: #dc2626; color: #dc2626; }

                .mk-pave {
                    display: flex; flex-wrap: wrap; gap: 3px; justify-content: center;
                    flex: 0 0 auto;
                }
                .mk-touche {
                    min-width: clamp(22px, 3.6cqw, 34px); padding: 5px 3px;
                    border: 1px solid var(--border); border-radius: 7px;
                    background: var(--bg-panel); color: var(--text-main);
                    font: inherit; font-weight: 700; font-size: clamp(.75rem, 1.5cqh, .95rem);
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                }
                .mk-touche--prise { opacity: .38; }
                .mk-touche--eff { color: var(--warning, #f59e0b); }
                .mk-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .mk-btn {
                    padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border);
                    background: var(--bg-panel); color: var(--text-main);
                    font: inherit; font-weight: 700; font-size: clamp(.75rem, 1.5cqh, .9rem);
                    cursor: pointer;
                }
                .mk-note { margin: 0; min-height: 1.2em; text-align: center;
                    font-size: clamp(.75rem, 1.6cqh, .95rem); }
                .mk-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .mk-note--ko { color: var(--danger, #dc2626); font-weight: 700; }
            </style>
            <div class="mk-wrap" data-wrap>
                <div class="mk-corps"><div class="mk-grille" data-grille></div></div>
                <div class="mk-cle" data-cle></div>
                <div class="mk-pave" data-pave></div>
                <div class="mk-barre">
                    <button type="button" class="mk-btn" data-aide>💡 Une lettre</button>
                    <button type="button" class="mk-btn" data-verifier>Vérifier</button>
                    <button type="button" class="mk-btn" data-valider>Valider</button>
                    <button type="button" class="mk-btn" data-neuf>Nouvelle grille</button>
                </div>
                <p class="mk-note" data-note></p>
            </div>`;

        this.wrapEl = this.container.querySelector('[data-wrap]');
        this.grilleEl = this.container.querySelector('[data-grille]');
        this.cleEl = this.container.querySelector('[data-cle]');
        this.paveEl = this.container.querySelector('[data-pave]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-valider]').onclick = () => this.valider();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();

        this.paveEl.innerHTML = ALPHABET.split('').map(l =>
            `<button type="button" class="mk-touche" data-lettre="${l}">${l}</button>`).join('')
            + '<button type="button" class="mk-touche mk-touche--eff" data-lettre="eff">⌫</button>';
        this.paveEl.querySelectorAll('[data-lettre]').forEach(b => {
            b.onclick = () => this.taper(b.dataset.lettre);
        });

        this.surTouche = (e) => {
            if (this.isDemo || !this.m) return;
            if (e.key === 'Backspace') { e.preventDefault(); this.taper('eff'); return; }
            const l = String(e.key || '').toUpperCase();
            if (l.length === 1 && ALPHABET.includes(l)) this.taper(l);
        };
        document.addEventListener('keydown', this.surTouche);
    }

    startGameLoop() { this.poser(); }
    showNext() { return this.poser(); }

    // --- Une grille -----------------------------------------------------------

    poser() {
        this.compteur = (this.compteur || 0) + 1;
        this.m = creerMotCode({
            theme: this.theme, niveauMax: this.niveauMax, nbMots: this.nbMots,
            offertes: this.offertes, essais: 10,
            rng: makeRng(`${this.graine}-${this.compteur}`),
            rngPour: (i) => makeRng(`${this.graine}-${this.compteur}-${i}`)
        });
        this.saisie = saisieInitiale(this.m);
        this.donnees = new Set(this.m.donnees);
        this.soufflees = new Set();
        this.fautes = null;
        this.fini = false;
        // Le numéro visé : le premier qui n'est pas offert.
        this.vise = this.m.lettres.map(l => this.m.code[l]).sort((a, b) => a - b)
            .find(n => !this.saisie[n]) || null;
        this.dessiner();
        const q = qualiteCode(this.m);
        this.note(`${q.mots} mots, ${q.alphabet} lettres à retrouver. `
            + 'Touche un numéro, puis la lettre qu\'il cache.');
        return true;
    }

    // --- Le dessin ------------------------------------------------------------

    dessiner() {
        const m = this.m;
        this.wrapEl.style.setProperty('--mk-cols', m.largeur);
        this.wrapEl.style.setProperty('--mk-rows', m.hauteur);
        this.grilleEl.style.gridTemplateColumns = `repeat(${m.largeur}, var(--mk-cote))`;

        this.grilleEl.innerHTML = m.cases.map((ligne, y) => ligne.map((c, x) => {
            if (c === null) return '<div class="mk-case mk-case--muette"></div>';
            const num = m.numeros[y][x];
            const classes = ['mk-case'];
            if (num === this.vise) classes.push('mk-case--vise');
            else if (this.saisie[num] && this.donnees.has(m.parNumero[num])) classes.push('mk-case--donnee');
            if (this.fautes && this.fautes.has(num)) classes.push('mk-case--faute');
            return `<button type="button" class="${classes.join(' ')}" data-num="${num}">
                <span class="mk-num">${num}</span>${this.saisie[num] || ''}</button>`;
        }).join('')).join('');
        this.grilleEl.querySelectorAll('[data-num]').forEach(b => {
            b.onclick = () => this.viser(Number(b.dataset.num));
        });

        this.cleEl.innerHTML = m.lettres.map((_, i) => {
            const num = i + 1;
            const donne = this.donnees.has(m.parNumero[num]);
            const classes = ['mk-clef'];
            if (num === this.vise) classes.push('mk-clef--vise');
            else if (donne) classes.push('mk-clef--donnee');
            if (this.fautes && this.fautes.has(num)) classes.push('mk-clef--faute');
            return `<button type="button" class="${classes.join(' ')}" data-clef="${num}">
                <b>${this.saisie[num] || ''}</b><i>${num}</i></button>`;
        }).join('');
        this.cleEl.querySelectorAll('[data-clef]').forEach(b => {
            b.onclick = () => this.viser(Number(b.dataset.clef));
        });

        // UNE LETTRE DÉJÀ POSÉE SUR UN AUTRE NUMÉRO S'ESTOMPE : la règle « deux
        // numéros ne cachent pas la même lettre » se voit alors sur le clavier
        // au lieu de se découvrir après coup.
        const prises = new Set(Object.entries(this.saisie)
            .filter(([n]) => Number(n) !== this.vise).map(([, l]) => l));
        this.paveEl.querySelectorAll('[data-lettre]').forEach(b => {
            b.classList.toggle('mk-touche--prise', prises.has(b.dataset.lettre));
        });
    }

    viser(num) {
        if (this.isDemo || this.fini) return;
        this.vise = num;
        this.dessiner();
    }

    // --- Écrire ---------------------------------------------------------------

    taper(lettre) {
        if (this.isDemo || this.fini || !this.vise) return;
        const num = this.vise;
        if (this.donnees.has(this.m.parNumero[num]) || this.soufflees.has(num)) {
            this.note('Cette lettre-là t\'est donnée : choisis un autre numéro.');
            return;
        }
        if (lettre === 'eff') {
            delete this.saisie[num];
            this.fautes = null;
            this.dessiner();
            return;
        }
        const ailleurs = Object.keys(this.saisie)
            .find(n => Number(n) !== num && this.saisie[n] === lettre);
        this.saisie[num] = lettre;
        this.fautes = null;
        // ON POSE QUAND MÊME, ET L'ON PRÉVIENT. Refuser cacherait la
        // contradiction ; la montrer, c'est enseigner la règle qui fait
        // avancer un mot codé.
        if (ailleurs) {
            this.note(`Attention : le ${lettre} est déjà sur le numéro ${ailleurs}. `
                + 'Deux numéros ne peuvent pas cacher la même lettre.', 'ko');
        } else {
            this.note('');
        }
        // On avance au premier numéro encore vide : on ne repointe pas à la
        // main entre deux trouvailles.
        const suivant = this.m.lettres.map(l => this.m.code[l]).sort((a, b) => a - b)
            .find(n => n > num && !this.saisie[n]);
        this.vise = suivant
            || this.m.lettres.map(l => this.m.code[l]).sort((a, b) => a - b)
                .find(n => !this.saisie[n]) || num;
        this.dessiner();
        if (estResoluCode(this.m, this.saisie)) this.gagner();
    }

    // --- Aider et vérifier ----------------------------------------------------

    /** Une lettre, celle du numéro visé — et elle se verrouille. */
    aider() {
        if (this.isDemo || this.fini) return;
        const num = this.vise;
        if (!num) return;
        if (this.saisie[num] === this.m.parNumero[num]) {
            this.note(`Le numéro ${num} est déjà juste. Vise-en un autre.`);
            return;
        }
        this.saisie[num] = this.m.parNumero[num];
        this.soufflees.add(num);
        this.fautes = null;
        this.dessiner();
        this.note(`Le numéro ${num} cache un ${this.m.parNumero[num]}. `
            + 'Regarde tout de suite où il se pose ailleurs dans la grille.');
        if (estResoluCode(this.m, this.saisie)) this.gagner();
    }

    verifier() {
        if (this.isDemo || this.fini) return;
        this.verifs++;
        const faux = numerosFaux(this.m, this.saisie);
        this.fautes = new Set(faux);
        this.dessiner();
        const doubles = lettresEnDouble(this.saisie);
        if (faux.length) {
            this.note(`${faux.length} numéro${faux.length > 1 ? 's' : ''} en rouge : `
                + `${faux.join(', ')}.`, 'ko');
        } else if (doubles.length) {
            const d = doubles[0];
            this.note(`Rien de faux, mais le ${d.lettre} est sur deux numéros `
                + `(${d.numeros.join(' et ')}).`, 'ko');
        } else {
            this.note('Rien de faux pour l\'instant — mais tout n\'est pas trouvé.', 'ok');
        }
    }

    valider() {
        if (this.isDemo || this.fini) return;
        if (estResoluCode(this.m, this.saisie)) return this.gagner();
        const reste = this.m.lettres.filter(l => !this.saisie[this.m.code[l]]).length;
        if (reste) {
            this.note(`Il reste ${reste} numéro${reste > 1 ? 's' : ''} sans lettre.`, 'ko');
            return;
        }
        this.verifier();
    }

    gagner() {
        if (this.fini) return;
        this.fini = true;
        const q = qualiteCode(this.m);
        this.vise = null;
        this.fautes = null;
        this.dessiner();
        this.note(`✅ Alphabet retrouvé — ${q.mots} mots du vocabulaire : `
            + `${this.m.mots.map(w => w.mot).join(', ')}.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Mot codé (${THEMES[this.theme]}) : ${q.alphabet} lettres`,
            expected: 'alphabet complet', given: 'alphabet complet',
            points: Math.max(10, 45 - this.soufflees.size * 4 - this.verifs * 2)
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'mk-note' + (ton ? ` mk-note--${ton}` : '');
    }

    // --- La démonstration ------------------------------------------------------

    /**
     * Le robot montre LE GESTE, qui n'est pas de deviner une lettre : c'est de
     * regarder où le numéro qu'on vient de trouver se pose AILLEURS. Un mot codé
     * ne se résout pas case par case, il se résout par propagation.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.m) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        const q = qualiteCode(this.m);
        cur.say(`${q.alphabet} lettres se cachent derrière ${q.alphabet} numéros. `
            + `${this.m.donnees.length} sont données : elles sont déjà dans la grille, partout `
            + 'où leur numéro paraît.', this.grilleEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Le numéro le plus fréquent encore inconnu : c'est celui qui rapporte
        // le plus, et donc celui par lequel on commence.
        const compte = new Map();
        this.m.numeros.forEach(l => l.forEach(n => {
            if (n && !this.saisie[n]) compte.set(n, (compte.get(n) || 0) + 1);
        }));
        const meilleur = [...compte.entries()].sort((a, b) => b[1] - a[1])[0];
        if (!meilleur) return fin();
        const [num, combien] = meilleur;

        this.vise = num; this.dessiner();
        cur.say(`Je ne prends pas un numéro au hasard : le ${num} paraît ${combien} fois. `
            + 'Le trouver éclaire toute la grille d\'un coup.', this.cleEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        this.saisie[num] = this.m.parNumero[num];
        this.soufflees.add(num);
        this.dessiner();
        cur.say(`C'est un ${this.m.parNumero[num]} — et le voilà posé sur ses ${combien} cases `
            + 'sans que j\'aie rien écrit de plus. C\'est cela, un mot codé : on ne remplit pas '
            + 'des cases, on remplit un alphabet.', this.grilleEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }
}

export function engineMotCode(container, isDemo, params) {
    const game = new MotCode(container, isDemo, params);
    game.start();
    return game;
}
