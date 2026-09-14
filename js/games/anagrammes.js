// LES ANAGRAMMES DU VOCABULAIRE — à l'écran.
//
// Rémy : « j'aimerais bien aussi un anagramme de mot mathématique, par exemple
// RACER est l'anagramme de CARRE. »
//
// LES LETTRES SONT DES JETONS, comme les chiffres du carré magique ou de
// l'hexagrille : on prend, on pose, on reprend. Écrire au clavier obligerait à
// retaper le mot en entier au premier doute, et sur une tablette cela ferait
// monter le clavier du système par-dessus les lettres — celles-là mêmes qu'on
// regarde. Poser un jeton, c'est aussi VOIR ce qu'il reste, et le reste est la
// moitié du raisonnement : quand il ne demeure qu'un T et un E, la fin du mot
// se devine.
//
// LA DÉFINITION EST L'ÉNIGME, pas le décor. Les lettres, on les a déjà ; ce
// qu'on cherche est le mot du cours qui va avec cette phrase-là. Un élève qui
// sait ce qu'est une bissectrice la retrouve dans le désordre, un élève qui a
// seulement croisé le mot ne la retrouve pas — et c'est exactement ce que
// l'exercice mesure.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { tirerAnagramme, analyser, debutDevoile, normaliser } from '../core/anagrammes.js';

const COMPETENCE = 'voc.mathematique';
/** Au-delà, l'énigme n'en est plus une : on garde la trace des mots vus. */
const MEMOIRE = 12;

class Anagrammes extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'anagrammes');
        this.rng = makeRng(this.params.seed);
        this.theme = this.params.theme || 'tout';
        this.niveauMax = Number(this.params.niveauMax) || 3;
        this.longueurMin = Number(this.params.longueurMin) || 4;
        // Quand la définition paraît : tout de suite, ou seulement après un
        // essai. Différée, elle fait d'abord chercher DANS LES LETTRES ; c'est
        // plus difficile, et c'est le vrai jeu d'anagramme.
        this.quandDef = this.params.definition || 'toujours';
        this.vus = [];
        this.reussis = 0;
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .an-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; gap: clamp(8px, 2cqh, 16px);
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none;
                }
                .an-tete { text-align: center; font-size: .9rem; color: var(--text-muted); }
                .an-compte { font-weight: 800; }

                /* LA DÉFINITION EST L'ÉNONCÉ : elle a la taille d'un énoncé. */
                .an-def {
                    text-align: center; font-weight: 700; max-width: 34ch;
                    font-size: clamp(15px, min(3.4cqw, 4cqh), 26px); line-height: 1.35;
                    text-wrap: balance;
                }
                .an-def--cachee { color: var(--text-muted); font-weight: 600; font-style: italic; }

                /* LE MOT EN CONSTRUCTION : une case par lettre, pour qu'on voie
                   dès le premier coup d'œil COMBIEN il en faut. */
                .an-mot { display: flex; gap: clamp(3px, .8cqw, 7px); flex-wrap: wrap; justify-content: center; }
                .an-case {
                    width: var(--an-cote); height: calc(var(--an-cote) * 1.15);
                    border-radius: 9px; border: 2.5px dashed var(--border);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: calc(var(--an-cote) * .58);
                    background: var(--bg-panel); color: var(--primary);
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                }
                .an-case--pleine { border-style: solid; border-color: var(--primary); }
                .an-case--soufflee { border-color: var(--warning, #f59e0b); color: var(--text-muted); cursor: default; }
                .an-case--ok { border-color: var(--success, #16a34a); color: var(--success, #16a34a); }
                .an-case--ko { border-color: var(--danger, #dc2626); animation: an-secoue .4s ease 2; }
                @keyframes an-secoue {
                    0%, 100% { transform: none; } 25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }

                /* LE TAS DE LETTRES. Il se vide à mesure : ce qui reste est un
                   indice à lui tout seul. */
                .an-tas { display: flex; gap: clamp(4px, 1cqw, 8px); flex-wrap: wrap; justify-content: center; }
                .an-jeton {
                    width: var(--an-cote); height: calc(var(--an-cote) * 1.15);
                    border-radius: 10px; border: 2px solid var(--primary);
                    background: color-mix(in srgb, var(--primary) 12%, var(--bg-panel));
                    color: var(--text-main); font: inherit; font-weight: 900;
                    font-size: calc(var(--an-cote) * .58);
                    display: inline-flex; align-items: center; justify-content: center;
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                    box-shadow: 0 2px 0 rgba(15,23,42,.16);
                }
                .an-jeton:active { transform: translateY(2px); box-shadow: none; }
                .an-jeton--pose { visibility: hidden; }

                .an-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .an-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 13px;
                }
                .an-btn--valider { border-color: var(--primary); background: var(--primary); color: #fff; }
                .an-btn:disabled { opacity: .45; cursor: default; }
                .an-note {
                    min-height: 2.6em; text-align: center; font-size: .9rem;
                    color: var(--text-muted); max-width: 44ch;
                }
                .an-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .an-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="an-wrap" data-wrap>
                <div class="an-tete">Retrouve le mot de mathématiques —
                    <span class="an-compte" data-compte>0 trouvé</span></div>
                <p class="an-def" data-def></p>
                <div class="an-mot" data-mot></div>
                <div class="an-tas" data-tas></div>
                <div class="an-barre">
                    <button type="button" class="an-btn" data-indice>💡 Une lettre</button>
                    <button type="button" class="an-btn" data-effacer>↺ Tout reprendre</button>
                    <button type="button" class="an-btn" data-neuf>Autre mot</button>
                    <button type="button" class="an-btn an-btn--valider" data-valider>Valider</button>
                </div>
                <p class="an-note" data-note></p>
            </div>`;

        this.wrapEl = this.container.querySelector('[data-wrap]');
        this.defEl = this.container.querySelector('[data-def]');
        this.motEl = this.container.querySelector('[data-mot]');
        this.tasEl = this.container.querySelector('[data-tas]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.compteEl = this.container.querySelector('[data-compte]');
        this.container.querySelector('[data-indice]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.toutReprendre();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();
        this.container.querySelector('[data-valider]').onclick = () => this.valider();

        // Le clavier reste possible sur ordinateur : taper une lettre pose le
        // jeton correspondant. C'est plus rapide pour qui a un clavier, et cela
        // ne retire rien à ceux qui n'en ont pas.
        this.surTouche = (e) => {
            if (this.isDemo || !this.q) return;
            if (e.key === 'Enter') { this.valider(); return; }
            if (e.key === 'Backspace') { e.preventDefault(); this.reprendreDernier(); return; }
            const l = normaliser(e.key);
            if (l.length === 1) this.poserLettre(l);
        };
        document.addEventListener('keydown', this.surTouche);
    }

    startGameLoop() { this.poser(); }

    // --- Une énigme ----------------------------------------------------------

    poser() {
        this.q = tirerAnagramme(this.rng, {
            theme: this.theme, niveauMax: this.niveauMax,
            longueurMin: this.longueurMin, eviter: this.vus
        });
        if (!this.q) return false;
        this.vus = [this.q.mot, ...this.vus].slice(0, MEMOIRE);
        // Le tas : une entrée par lettre du mélange, chacune posable une fois.
        this.tas = this.q.melange.split('').map((lettre, i) => ({ lettre, i, pose: false }));
        // Le mot en construction : `null` = vide, sinon l'indice du jeton posé,
        // ou 'soufflee' pour une lettre donnée par l'indice.
        this.cases = new Array(this.q.mot.length).fill(null);
        this.souffle = 0;
        this.essais = 0;
        this.fini = false;
        this.dessiner();
        this.note('');
        return true;
    }

    showNext() { return this.poser(); }

    /** La définition se montre-t-elle déjà ? */
    get defVisible() {
        if (this.quandDef === 'toujours') return true;
        if (this.quandDef === 'jamais') return false;
        return this.essais > 0 || this.souffle > 0;
    }

    // --- Le dessin -----------------------------------------------------------

    dessiner() {
        const n = this.q.mot.length;
        // La case se dimensionne sur la place ET sur le nombre de lettres :
        // « PERPENDICULAIRE » en fait quinze, et quinze cases de 56 px ne
        // tiennent sur aucun téléphone.
        this.wrapEl.style.setProperty('--an-cote',
            `clamp(22px, min(${(88 / Math.max(n, 6)).toFixed(1)}cqw, 9cqh), 58px)`);

        this.defEl.textContent = this.defVisible
            ? this.q.def
            : 'La définition arrive après un premier essai — cherche d\'abord dans les lettres.';
        this.defEl.classList.toggle('an-def--cachee', !this.defVisible);

        this.motEl.innerHTML = this.cases.map((c, k) => {
            const soufflee = c === 'soufflee';
            const lettre = soufflee ? this.q.mot[k] : (c === null ? '' : this.tas[c].lettre);
            return `<button type="button" class="an-case${lettre ? ' an-case--pleine' : ''}${soufflee ? ' an-case--soufflee' : ''}"
                    data-case="${k}" ${soufflee ? 'disabled' : ''}>${lettre}</button>`;
        }).join('');
        this.motEl.querySelectorAll('[data-case]').forEach(b => {
            b.onclick = () => this.reprendre(Number(b.dataset.case));
        });

        this.tasEl.innerHTML = this.tas.map(j =>
            `<button type="button" class="an-jeton${j.pose ? ' an-jeton--pose' : ''}"
                     data-jeton="${j.i}">${j.lettre}</button>`).join('');
        this.tasEl.querySelectorAll('[data-jeton]').forEach(b => {
            b.onclick = () => this.poserJeton(Number(b.dataset.jeton));
        });

        this.compteEl.textContent = `${this.reussis} trouvé${this.reussis > 1 ? 's' : ''}`;
        const valider = this.container.querySelector('[data-valider]');
        if (valider) valider.disabled = this.cases.includes(null);
    }

    // --- Poser et reprendre --------------------------------------------------

    /** La première case libre, celle où le prochain jeton se pose. */
    premiereLibre() {
        return this.cases.findIndex(c => c === null);
    }

    poserJeton(i) {
        if (this.isDemo || this.fini) return;
        const j = this.tas[i];
        if (!j || j.pose) return;
        const k = this.premiereLibre();
        if (k === -1) return;
        j.pose = true;
        this.cases[k] = i;
        this.dessiner();
    }

    /** Au clavier : on pose le premier jeton disponible portant cette lettre. */
    poserLettre(lettre) {
        const j = this.tas.find(x => !x.pose && x.lettre === lettre);
        if (j) this.poserJeton(j.i);
    }

    reprendre(k) {
        if (this.isDemo || this.fini) return;
        const c = this.cases[k];
        if (c === null || c === 'soufflee') return;
        this.tas[c].pose = false;
        // LE MOT NE GARDE PAS DE TROU AU MILIEU. Retirer la troisième lettre
        // de six laissait « CA_RES » : les suivantes ne bougeaient pas, et la
        // case libre n'était plus celle où le prochain jeton allait tomber.
        // Tout ce qui suit se resserre, les lettres soufflées restant à leur
        // place — elles appartiennent au mot, pas à la saisie.
        this.cases[k] = null;
        this.resserrer();
        this.dessiner();
    }

    reprendreDernier() {
        for (let k = this.cases.length - 1; k >= 0; k--) {
            if (this.cases[k] !== null && this.cases[k] !== 'soufflee') { this.reprendre(k); return; }
        }
    }

    /** Les jetons posés glissent vers le début, les lettres soufflées restent. */
    resserrer() {
        const poses = this.cases.filter(c => c !== null && c !== 'soufflee');
        let n = 0;
        this.cases = this.cases.map(c => c === 'soufflee' ? 'soufflee' : (n < poses.length ? poses[n++] : null));
    }

    toutReprendre() {
        if (this.isDemo || this.fini) return;
        this.tas.forEach(j => { j.pose = false; });
        this.cases = this.cases.map(c => c === 'soufflee' ? 'soufflee' : null);
        this.dessiner();
        this.note('');
    }

    // --- Aider ---------------------------------------------------------------

    /**
     * L'INDICE DÉCOUVRE LE DÉBUT DU MOT, une lettre à la fois.
     *
     * Une lettre au hasard au milieu n'aide pas : on ne sait pas la relier. Le
     * début, si — c'est ainsi qu'on cherche un mot dans sa tête. La lettre
     * donnée est verrouillée et son jeton retiré du tas : sinon on la
     * reposerait ailleurs et le mot deviendrait impossible.
     */
    aider() {
        if (this.isDemo || this.fini) return;
        if (this.souffle >= this.q.mot.length - 1) {
            this.note('Il ne reste plus qu\'une lettre à trouver : celle-là, tu l\'as.');
            return;
        }
        this.toutReprendre();
        this.souffle++;
        this.aides++;
        const debut = debutDevoile(this.q.mot, this.souffle);
        this.cases = this.cases.map((c, k) => k < debut.length ? 'soufflee' : null);
        // Les jetons correspondants quittent le tas, un par lettre donnée.
        const restant = [...debut];
        this.tas.forEach(j => {
            const i = restant.indexOf(j.lettre);
            if (i >= 0) { restant.splice(i, 1); j.pose = true; }
        });
        this.dessiner();
        this.note(`Le mot commence par « ${debut} ».`);
    }

    // --- Répondre ------------------------------------------------------------

    proposition() {
        return this.cases.map((c, k) =>
            c === 'soufflee' ? this.q.mot[k] : (c === null ? '' : this.tas[c].lettre)).join('');
    }

    valider() {
        if (this.isDemo || this.fini) return;
        const donne = this.proposition();
        const bilan = analyser(donne, this.q.mot);
        if (bilan.etat === 'juste') return this.gagner();
        this.essais++;
        this.motEl.querySelectorAll('.an-case').forEach(el => el.classList.add('an-case--ko'));
        setTimeout(() => this.motEl.querySelectorAll('.an-case')
            .forEach(el => el.classList.remove('an-case--ko')), 900);
        this.note('❌ ' + bilan.message, 'ko');
        // La définition entre en jeu au premier essai raté, quand elle était
        // différée : c'est le filet, il se tend quand on tombe.
        this.dessiner();
        this.onWrongAnswer(null, {
            concept: COMPETENCE, questionText: `Anagramme : ${this.q.melange} (${this.q.def})`,
            input: donne || '(rien)', expected: this.q.mot,
            explanation: this.q.def, customMessage: bilan.message, silencieux: true
        });
    }

    gagner() {
        this.fini = true;
        this.reussis++;
        this.motEl.querySelectorAll('.an-case').forEach(el => el.classList.add('an-case--ok'));
        this.note(`✅ ${this.q.mot} — ${this.q.def}`, 'ok');
        this.compteEl.textContent = `${this.reussis} trouvé${this.reussis > 1 ? 's' : ''}`;
        // Un mot trouvé sans indice vaut plus qu'un mot trouvé avec : ce n'est
        // pas le même travail.
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Anagramme : ${this.q.melange}`, expected: this.q.mot, given: this.q.mot,
            points: this.souffle ? 8 : (this.essais ? 12 : 18)
        });
        setTimeout(() => { if (this.isRunning) this.poser(); }, 2200);
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'an-note' + (ton ? ` an-note--${ton}` : '');
    }

    // --- La démonstration ----------------------------------------------------

    /**
     * Le robot montre LA MÉTHODE, pas la réponse : il lit la définition, il
     * cherche la longueur, il repère les lettres rares — un Q, un Y, un double
     * R disent presque à eux seuls de quel mot il s'agit — et seulement
     * ensuite il pose.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.q) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        cur.say(`Les lettres sont toutes là, dans le désordre : ${this.q.melange.split('').join(' ')}. `
            + 'Ce n\'est pas un mot au hasard — c\'est un mot du cours.', this.tasEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say(`Je lis la définition : « ${this.q.def} » C'est elle l'énigme ; `
            + 'les lettres, je les ai déjà.', this.defEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say(`Et je compte les cases : ${this.q.mot.length} lettres. `
            + 'Un mot trop court ou trop long, je peux l\'écarter tout de suite.', this.motEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Il pose le mot, lettre par lettre : c'est le geste qu'on demande.
        for (const lettre of this.q.mot) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const j = this.tas.find(x => !x.pose && x.lettre === lettre);
            if (!j) break;
            const el = this.tasEl.querySelector(`[data-jeton="${j.i}"]`);
            // `tap`, pas `tapOn` : le curseur n'a jamais eu de `tapOn`, et la
            // démonstration mourait sur cette ligne — sans erreur visible pour
            // qui ne regarde pas la console. Trente-sept autres jeux appellent
            // `tap` ; celui-ci était le seul à s'être trompé de nom.
            if (el) await cur.tap(el);
            j.pose = true;
            this.cases[this.premiereLibre()] = j.i;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.press)) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`${this.q.mot}. Le tas s'est vidé exactement, donc j'ai employé toutes les `
            + 'lettres et aucune deux fois — c\'est la vérification qui va avec ce jeu.', this.motEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }
}

export function engineAnagrammes(container, isDemo, params) {
    const game = new Anagrammes(container, isDemo, params);
    game.start();
    return game;
}
