// COLORIER PAR LES NOMBRES — l'écran.
//
// Rémy : « on pourrait faire un paint by numbers où on donne le nombre de cases
// à colorier. Il faut commencer par hyper simple. »
//
// TOUTE LA LOGIQUE EST DANS core/colorierNombres.js, sans DOM : c'est elle qui
// est couverte par les tests, et c'est elle qui garantit la seule chose qui
// compte — que la grille se termine par déduction, sans jamais deviner.
//
// TROIS DÉCISIONS D'ÉCRAN, et aucune n'est décorative.
//
// 1. LA CROIX EST AUSSI IMPORTANTE QUE LA COULEUR. Marquer « celle-ci est
//    blanche, j'en suis sûr » est un geste de raisonnement, pas une commodité :
//    c'est ce qui rétrécit les possibilités et fait avancer la déduction. Elle
//    a donc son bouton, sa touche, et le clic droit — pas un réglage caché.
//
// 2. LA LIGNE ET LA COLONNE SURVOLÉES S'ÉCLAIRENT. Sur une grille de dix, l'œil
//    perd la ligne entre l'indice et la case qu'il vise, et l'on colorie à côté.
//    Ce n'est pas une erreur de mathématiques, et elle ne doit pas être comptée
//    comme telle.
//
// 3. UN INDICE SE BARRE QUAND SON BLOC EST FAIT. Un élève qui a posé trois
//    blocs sur cinq doit voir lesquels lui restent, sans les recompter à chaque
//    regard. C'est le geste qu'on fait au crayon sur le papier.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    INCONNU, PLEIN, CROIX, PALIERS,
    genererGrille, prochainCoup, verifier, indicesDe
} from '../core/colorierNombres.js';

const SKILL = 'num.logique.colorier';

class ColorierNombres extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'colorierNombres');
        this.rng = makeRng(this.params.seed);
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'decouverte';
        this.modeCroix = false;
        this.fini = false;
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .cn-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px 10px 10px; box-sizing: border-box;
                    color: var(--text-main); container-type: size; min-height: 0;
                    user-select: none; -webkit-user-select: none;
                }
                .cn-consigne {
                    text-align: center; flex: 0 0 auto; max-width: 640px; line-height: 1.35;
                    font-size: clamp(11px, 2.6cqw, 14px); color: var(--text-muted);
                }
                .cn-consigne b { color: var(--primary); }

                /* LA GRILLE SE MESURE SUR LA SCÈNE, pas sur le plateau entier :
                   la consigne, les boutons et la note prennent déjà leur part,
                   et une grille calée sur la hauteur totale se réserverait une
                   place occupée. */
                .cn-scene {
                    flex: 1 1 auto; width: 100%; min-height: 0;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size;
                }
                /* Le plateau : le coin, les indices de colonnes, les indices de
                   lignes, et la grille. Un seul grid les tient alignés — deux
                   tableaux côte à côte finissent toujours par se décaler d'un
                   pixel, et un indice décalé d'un pixel désigne la mauvaise
                   ligne. */
                .cn-plateau {
                    display: grid; gap: 3px;
                    grid-template-columns: auto auto;
                    grid-template-rows: auto auto;
                }
                .cn-coin { }
                .cn-haut, .cn-gauche, .cn-grille { display: grid; gap: 2px; }
                .cn-haut { grid-auto-flow: column; align-items: end; }
                .cn-gauche { justify-items: end; }

                .cn-ind {
                    display: flex; gap: .35em; font-weight: 800; color: var(--text-muted);
                    font-size: var(--cn-police); line-height: 1;
                    align-items: center; justify-content: flex-end;
                }
                .cn-haut .cn-ind { flex-direction: column; justify-content: flex-end; }
                /* UN INDICE BARRÉ EST UN BLOC DÉJÀ POSÉ. C'est le geste du crayon
                   sur le papier, et il évite de tout recompter à chaque regard. */
                .cn-ind span.fait { color: var(--success); text-decoration: line-through; opacity: .55; }
                /* La ligne dont le compte ne peut plus tomber juste : on le dit
                   tout de suite plutôt qu'à la fin, quand il faudrait chercher. */
                .cn-ind.cn-ind--faux { color: var(--danger); }
                .cn-ind.cn-ind--visee { color: var(--primary); }

                .cn-case {
                    width: var(--cn-case); height: var(--cn-case); box-sizing: border-box;
                    border-radius: 3px; cursor: pointer;
                    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
                    background: var(--bg-app);
                    display: flex; align-items: center; justify-content: center;
                    font-size: calc(var(--cn-case) * .62); line-height: 1;
                    color: var(--text-muted);
                }
                .cn-case--plein {
                    background: var(--primary); border-color: var(--primary);
                }
                .cn-case--croix::after { content: '×'; }
                /* LE TRAIT DE CINQ EN CINQ. Sur une grille de dix, compter « la
                   septième case » sans repère se rate une fois sur trois — c'est
                   pour cela que les grilles de mots croisés et les rapporteurs
                   ont tous des graduations plus fortes. */
                .cn-case--bloc5 { border-left-width: 3px; border-left-color: var(--text-muted); }
                .cn-case--bloc5h { border-top-width: 3px; border-top-color: var(--text-muted); }
                .cn-case--visee { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--primary) 45%, transparent); }
                .cn-case--faute { animation: cn-non .45s ease; }
                @keyframes cn-non { 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }

                .cn-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .cn-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 6px 11px; font-size: .82rem; min-height: 34px;
                }
                .cn-btn--actif {
                    border-color: var(--primary); color: var(--primary);
                    background: color-mix(in srgb, var(--primary) 12%, var(--bg-panel));
                }
                .cn-note {
                    min-height: 3.1em; text-align: center; font-size: .85rem; line-height: 1.35;
                    color: var(--text-muted); max-width: 660px; flex: 0 0 auto;
                }
                .cn-note--ok { color: var(--success); font-weight: 700; }
                .cn-note--ko { color: var(--danger); font-weight: 600; }
                .cn-note b { color: var(--primary); }

                /* Couché : la grille à gauche, le texte à droite — en paysage
                   c'est la hauteur qui manque. */
                @container plateau (max-height: 460px) and (min-width: 720px) {
                    .cn-wrap {
                        display: grid; grid-template-columns: minmax(0, auto) minmax(220px, 320px);
                        grid-template-rows: min-content minmax(0, 1fr) min-content;
                        align-items: center; justify-items: center; gap: 4px 12px;
                    }
                    .cn-consigne { grid-column: 2; grid-row: 1; }
                    .cn-scene { grid-column: 1; grid-row: 1 / 4; height: 100%; align-self: stretch; }
                    .cn-note { grid-column: 2; grid-row: 2; }
                    .cn-barre { grid-column: 2; grid-row: 3; }
                }
            </style>
            <div class="cn-wrap">
                <div class="cn-consigne" data-consigne></div>
                <div class="cn-scene"><div class="cn-plateau" data-plateau></div></div>
                <div class="cn-barre">
                    <button type="button" class="cn-btn" data-mode>✏️ Colorier</button>
                    <button type="button" class="cn-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="cn-btn" data-neuf>↻ Autre grille</button>
                </div>
                <div class="cn-note" data-note></div>
            </div>`;

        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.btnMode = this.container.querySelector('[data-mode]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();
        this.btnMode.onclick = () => this.basculerMode();

        // LE CLIC DROIT BARRE, comme dans tous les jeux de ce genre. C'est le
        // geste de celui qui connaît ; le bouton reste pour celui qui découvre
        // et pour la tablette, qui n'a pas de clic droit.
        this.plateauEl.oncontextmenu = (e) => {
            const c = e.target.closest('[data-x]');
            if (!c) return;
            e.preventDefault();
            this.toucher(+c.dataset.x, +c.dataset.y, true);
        };
        this.plateauEl.onclick = (e) => {
            const c = e.target.closest('[data-x]');
            if (c) this.toucher(+c.dataset.x, +c.dataset.y, this.modeCroix);
        };
        this.plateauEl.onmouseover = (e) => {
            const c = e.target.closest('[data-x]');
            this.viser(c ? { x: +c.dataset.x, y: +c.dataset.y } : null);
        };
        this.plateauEl.onmouseleave = () => this.viser(null);
    }

    startGameLoop() { this.poser(); }
    showNext() { return this.poser(); }

    poser() {
        this.grille = genererGrille({ rng: this.rng, palier: this.palier });
        const { hauteur, largeur } = this.grille.enonce;
        this.etat = Array.from({ length: hauteur }, () => new Array(largeur).fill(INCONNU));
        this.fini = false;
        this.vise = null;
        this.dessiner();
        // LA NOTE NE REDIT PAS LA CONSIGNE — elle donne la méthode. Le compte
        // des cases restantes est déjà écrit en haut ; l'écrire deux fois occupe
        // la seule ligne dont on dispose pour dire par où commencer.
        this.note('Commence par les <b>grands nombres</b> : un bloc large ne peut pas '
            + 'beaucoup bouger, donc il recouvre à coup sûr des cases du milieu.'
            + (this.grille.sujet ? ' À la fin, cela dessine quelque chose.' : ''));
        return true;
    }

    basculerMode() {
        this.modeCroix = !this.modeCroix;
        this.btnMode.textContent = this.modeCroix ? '❌ Barrer' : '✏️ Colorier';
        this.btnMode.classList.toggle('cn-btn--actif', this.modeCroix);
    }

    // --- Le dessin ----------------------------------------------------------

    /**
     * COMBIEN DE BLOCS SONT DÉJÀ POSÉS AU DÉBUT DE LA LIGNE.
     *
     * On ne barre un indice que si le bloc est CLOS des deux côtés — sinon un
     * bloc en cours de construction se barrerait tout seul, et l'élève croirait
     * l'avoir fini. On lit donc depuis le bord tant que les blocs coïncident.
     */
    blocsFaits(cases, blocs) {
        // D'ABORD LE CAS SIMPLE, ET C'EST CELUI DE LA FIN : si les cases
        // coloriées dessinent exactement les blocs demandés, la ligne est
        // faite — même si l'élève n'a barré aucune blanche. Sans cette
        // première lecture, une grille gagnée gardait six indices sur dix non
        // barrés, et l'écran ne disait plus que c'était fini. Mesuré.
        const dessines = indicesDe(cases.map(c => (c === PLEIN ? 1 : 0)));
        if (dessines.length === blocs.length && dessines.every((v, i) => v === blocs[i])) {
            return blocs.length;
        }

        const lus = [];
        let n = 0;
        for (let i = 0; i < cases.length; i++) {
            if (cases[i] === PLEIN) n++;
            else if (cases[i] === CROIX) { if (n) { lus.push(n); n = 0; } }
            else { if (n) lus.push(n); break; }     // INCONNU : on ne conclut plus
        }
        if (n && cases[cases.length - 1] !== INCONNU) lus.push(n);
        let faits = 0;
        while (faits < lus.length && faits < blocs.length && lus[faits] === blocs[faits]) faits++;
        return faits;
    }

    indiceHtml(blocs, cases, sens, index) {
        const faits = this.blocsFaits(cases, blocs);
        const somme = blocs.reduce((a, b) => a + b, 0);
        const poses = cases.filter(c => c === PLEIN).length;
        // TROP DE CASES COLORIÉES : on le dit tout de suite. À la fin, il
        // faudrait chercher la faute dans toute la grille.
        const trop = poses > somme;
        const cls = `cn-ind${trop ? ' cn-ind--faux' : ''}`
            + (this.vise && this.vise[sens === 'ligne' ? 'y' : 'x'] === index ? ' cn-ind--visee' : '');
        return `<div class="${cls}" data-ind="${sens}" data-index="${index}">`
            + blocs.map((b, i) => `<span class="${i < faits ? 'fait' : ''}">${b}</span>`).join('')
            + '</div>';
    }

    dessiner() {
        const { hauteur, largeur, lignes, colonnes } = this.grille.enonce;
        const grand = Math.max(hauteur, largeur);
        // La case se mesure sur la scène : ni plus large que la place, ni plus
        // haute. Les indices prennent leur part — trois caractères au plus haut.
        const profH = Math.max(...colonnes.map(c => c.length));
        const profG = Math.max(...lignes.map(c => c.length));
        const colonnesTotal = largeur + profG * 0.62;
        const lignesTotal = hauteur + profH * 0.85;

        // LE PLAFOND EST HAUT, ET C'EST LA PLACE QUI TRANCHE. Mesuré sur un
        // 1100 x 780 : avec un plafond à 46 pixels, la grille de cinq occupait
        // 256 pixels dans une scène qui en offrait 1040 — trois quarts de vide
        // autour d'un exercice qu'on lit case par case. À 64, elle prend la
        // place qu'elle mérite, et la grille de dix ne bouge pas : c'est la
        // hauteur de la scène qui la bride, pas le plafond.
        this.plateauEl.style.setProperty('--cn-case',
            `min(${(94 / colonnesTotal).toFixed(2)}cqw, ${(94 / lignesTotal).toFixed(2)}cqh, 64px)`);
        this.plateauEl.style.setProperty('--cn-police', 'calc(var(--cn-case) * .5)');

        const cases = [];
        for (let y = 0; y < hauteur; y++) {
            for (let x = 0; x < largeur; x++) {
                const v = this.etat[y][x];
                const cls = ['cn-case'];
                if (v === PLEIN) cls.push('cn-case--plein');
                if (v === CROIX) cls.push('cn-case--croix');
                if (x % 5 === 0 && x) cls.push('cn-case--bloc5');
                if (y % 5 === 0 && y) cls.push('cn-case--bloc5h');
                if (this.vise && (this.vise.x === x || this.vise.y === y)) cls.push('cn-case--visee');
                cases.push(`<div class="${cls.join(' ')}" data-x="${x}" data-y="${y}"
                    role="button" aria-label="colonne ${x + 1}, ligne ${y + 1}"></div>`);
            }
        }

        this.plateauEl.innerHTML = `
            <div class="cn-coin"></div>
            <div class="cn-haut" style="grid-template-columns: repeat(${largeur}, var(--cn-case))">
                ${colonnes.map((b, x) =>
            this.indiceHtml(b, this.etat.map(l => l[x]), 'colonne', x)).join('')}
            </div>
            <div class="cn-gauche" style="grid-template-rows: repeat(${hauteur}, var(--cn-case))">
                ${lignes.map((b, y) => this.indiceHtml(b, this.etat[y], 'ligne', y)).join('')}
            </div>
            <div class="cn-grille" style="grid-template-columns: repeat(${largeur}, var(--cn-case))">
                ${cases.join('')}
            </div>`;

        const reste = this.grille.total - this.etat.flat().filter(c => c === PLEIN).length;
        this.consigneEl.innerHTML = this.fini
            ? (this.grille.sujet
                ? `C'est <b>${this.grille.sujet}</b>.`
                : 'La grille est complète.')
            : `Les nombres disent les <b>blocs</b> coloriés de chaque ligne et de chaque `
                + `colonne, dans l'ordre. Il reste <b>${Math.max(0, reste)}</b> case`
                + `${Math.max(0, reste) > 1 ? 's' : ''} à colorier.`;
        void grand;
    }

    viser(c) {
        const avant = this.vise;
        this.vise = c;
        if ((avant && c && avant.x === c.x && avant.y === c.y) || (!avant && !c)) return;
        if (this.fini) return;
        // ON NE REDESSINE QUE LES CLASSES, pas la grille : réécrire cent cases à
        // chaque passage de souris fait clignoter ce qu'on essaie de viser.
        this.plateauEl.querySelectorAll('[data-x]').forEach(el => {
            el.classList.toggle('cn-case--visee',
                !!c && (+el.dataset.x === c.x || +el.dataset.y === c.y));
        });
        this.plateauEl.querySelectorAll('[data-ind]').forEach(el => {
            el.classList.toggle('cn-ind--visee', !!c
                && +el.dataset.index === (el.dataset.ind === 'ligne' ? c.y : c.x));
        });
    }

    // --- Le jeu -------------------------------------------------------------

    toucher(x, y, croix) {
        if (this.isDemo || this.fini) return;
        const avant = this.etat[y][x];
        const veut = croix ? CROIX : PLEIN;
        this.etat[y][x] = avant === veut ? INCONNU : veut;

        // UNE CASE COLORIÉE À TORT EST UNE ERREUR DE RAISONNEMENT, et on la
        // compte comme telle — mais on ne l'efface pas. L'élève doit pouvoir
        // constater lui-même que sa ligne ne tombe plus juste : c'est là qu'il
        // apprend, pas dans une case qui disparaît toute seule.
        if (this.etat[y][x] === PLEIN && this.grille.solution[y][x] !== 1) {
            const el = this.plateauEl.querySelector(`[data-x="${x}"][data-y="${y}"]`);
            if (el) { el.classList.add('cn-case--faute'); setTimeout(() => el.classList.remove('cn-case--faute'), 500); }
            this.onWrongAnswer(el, {
                concept: SKILL,
                questionText: `Colorier par les nombres — ligne ${y + 1}, colonne ${x + 1}`,
                input: `colonne ${x + 1}, ligne ${y + 1}`,
                expected: 'une case de cette ligne compatible avec ses blocs',
                partiel: true, silencieux: true
            });
            this.dessiner();
            return this.note(`Cette case ne peut pas être coloriée : relis les nombres de `
                + `la <b>ligne ${y + 1}</b> et de la <b>colonne ${x + 1}</b>.`, 'ko');
        }

        this.dessiner();
        const v = verifier(this.grille.solution, this.etat);
        if (v.fini) return this.gagner();
        this.note('');
    }

    gagner() {
        this.fini = true;
        this.dessiner();
        this.onCorrectAnswer(null, SKILL, {
            questionText: `Colorier par les nombres — ${PALIERS[this.palier].label}`,
            expected: `${this.grille.total} cases`,
            given: `${this.grille.total} cases`,
            points: 20 + this.grille.total
        });
        this.note(this.grille.sujet
            ? `Terminé — c'était <b>${this.grille.sujet}</b>.`
            : 'Terminé : toutes les lignes et toutes les colonnes tombent juste.', 'ok');
        if (this.demoGate) return;
        setTimeout(() => { if (!this.destroyed) this.poser(); }, 1600);
    }

    /**
     * L'AIDE MONTRE UNE LIGNE ET DIT POURQUOI — elle ne remplit pas la grille.
     *
     * Un élève à qui l'on désigne une case isolée apprend qu'il faut demander ;
     * un élève à qui l'on dit « regarde la ligne 3, et voici le calcul » refait
     * le raisonnement et gagne la ligne suivante tout seul. C'est le même
     * solveur qui a validé la grille : l'aide ne peut donc pas se tromper.
     */
    aider() {
        if (this.fini) return;
        const coup = prochainCoup(this.grille.enonce, this.etat);
        if (!coup) {
            return this.note('Plus rien ne se déduit d\'un coup : croise une ligne et une '
                + 'colonne déjà bien avancées.');
        }
        this.aides++;
        // On éclaire la ligne désignée, sans y écrire : c'est à l'élève de poser.
        this.vise = coup.sens === 'ligne' ? { x: -1, y: coup.index } : { x: coup.index, y: -1 };
        this.dessiner();
        this.note(coup.raison, coup.contradiction ? 'ko' : null);
    }

    /** La solution d'auteur — la barre de débogage, pas l'élève. */
    montrerSolution() {
        if (!this.grille) return false;
        this.etat = this.grille.solution.map(l => l.map(c => (c === 1 ? PLEIN : CROIX)));
        this.fini = true;
        this.vise = null;
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }

    note(html, ton) {
        this.noteEl.className = `cn-note${ton ? ` cn-note--${ton}` : ''}`;
        this.noteEl.innerHTML = html || '';
    }

    /**
     * LA DÉMONSTRATION SUIT LE SOLVEUR, coup par coup.
     *
     * Elle ne remplit pas la grille : elle montre l'ORDRE dans lequel on la
     * remplit — la ligne la plus généreuse d'abord, puis ce qu'elle ouvre. C'est
     * la seule chose qu'un élève ne devine pas tout seul.
     */
    async runDemoSequence() {
        // LA DÉMONSTRATION POSE SA PROPRE GRILLE. `start()` appelle SOIT
        // `startGameLoop`, SOIT `runDemoSequence` — jamais les deux. Sans cette
        // ligne, le robot lisait une grille qui n'existait pas encore, et
        // l'aperçu du catalogue affichait un plateau vide avec une erreur dans
        // la console. Mesuré au navigateur.
        if (!this.grille) this.poser();
        const cursor = createDemoCursor(this.container);
        this.demoGate = createDemoGate();
        const gate = this.demoGate;
        const dire = (t) => cursor.say(t);

        await gate.wait(400);
        dire('Les nombres disent les blocs coloriés de chaque ligne.');
        await gate.wait(DEMO_SPEED * 2);

        // UN DÉPLACEMENT PAR LIGNE, PAS PAR CASE. Mesuré : à raison d'un trajet
        // de curseur et d'une pause par case, le robot avait posé cinq croix au
        // bout de vingt-deux secondes — personne ne regarde jusque-là. Ce qu'il
        // y a à montrer n'est pas le clic, c'est l'ORDRE : quelle ligne on
        // attaque, et pourquoi. Le curseur va donc à la première case de la
        // ligne, puis elle se remplit d'un coup.
        for (let pas = 0; pas < 40 && !gate.stopped; pas++) {
            const coup = prochainCoup(this.grille.enonce, this.etat);
            if (!coup || coup.contradiction) break;
            if (pas < 3) dire(coup.raison.replace(/<[^>]+>/g, ''));

            const premiere = coup.cases[0];
            const y0 = coup.sens === 'ligne' ? coup.index : premiere.i;
            const x0 = coup.sens === 'ligne' ? premiere.i : coup.index;
            const cible = this.plateauEl.querySelector(`[data-x="${x0}"][data-y="${y0}"]`);
            if (cible) await cursor.moveTo(cible, DEMO_SPEED / 3);
            if (gate.stopped) break;

            for (const { i, v } of coup.cases) {
                const y = coup.sens === 'ligne' ? coup.index : i;
                const x = coup.sens === 'ligne' ? i : coup.index;
                this.etat[y][x] = v;
            }
            this.dessiner();
            await gate.wait(pas < 3 ? DEMO_SPEED : DEMO_SPEED / 3);
            if (verifier(this.grille.solution, this.etat).fini) break;
        }

        if (!gate.stopped) {
            dire(this.grille.sujet ? `Et c'était ${this.grille.sujet}.` : 'Et la grille est finie.');
            await gate.wait(DEMO_SPEED);
        }
        cursor.destroy();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineColorierNombres(container, isDemo, params) {
    const jeu = new ColorierNombres(container, isDemo, params);
    jeu.start();
    return jeu;
}
