// LA TOUR DE BRAHMA — à l'écran.
//
// Rémy : « Le but du jeu est de passer toutes les boules à droite. On déplace
// une boule par une boule. La seule règle est qu'une boule doit toujours être
// posée sur une boule plus grosse. »
//
// LE JEU DE PAPIER EST PARFAIT — trois conduits, des boules à découper — et
// l'écran ne le remplace pas : il le complète. Ce qu'il apporte, c'est le
// COMPTE. Sur la table, on finit en trente-deux coups et l'on n'en sait rien ;
// ici on lit « 32 coups — le minimum est 15 », et c'est là que le défi
// commence vraiment. Le premier tour se fait au hasard, le second se cherche.
//
// ET IL APPORTE L'ÉCART À L'OPTIMUM À CHAQUE INSTANT, pas seulement à la fin.
// Le noyau sait dire, depuis n'importe quelle position, combien de coups il en
// reste au plus court — donc si le dernier coup était un détour. C'est une
// information qu'aucun jeu de table ne peut donner, et elle transforme le
// tâtonnement en raisonnement.
//
// ON NE REFUSE PAS UN COUP INTERDIT EN SILENCE : on dit pourquoi. « Le 4 ne
// peut pas se poser sur le 2 » est la règle elle-même, et l'entendre au moment
// où l'on se trompe vaut mieux que de la relire dans la consigne.

import { BaseGame } from '../core/BaseGame.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    departBrahma, coupValide, jouer, estGagneBrahma, coupsRestants,
    prochainCoupBrahma, minimumBrahma, qualiteBrahma, TAILLES_BRAHMA
} from '../core/tourBrahma.js';

const COMPETENCE = 'defi.recursion';

/** Les teintes des boules, de la plus petite à la plus grosse. */
const TEINTES = ['#7c3aed', '#c1274a', '#2f855a', '#e0a020', '#3182ce', '#b7791f'];

class TourBrahma extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'tour-brahma');
        const t = TAILLES_BRAHMA[this.params.taille] || TAILLES_BRAHMA.quatre;
        this.n = t.n;
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .tb-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.4cqh, 12px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .tb-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size; overflow: hidden;
                }
                /* LE SOCLE ET LES TROIS CONDUITS, comme sur le jeu à découper :
                   des rails où les boules descendent, pas des piquets. C'est le
                   dessin de Rémy, et il rend la règle évidente — une boule
                   posée dessus DÉBORDE si elle est plus large. */
                .tb-socle {
                    display: flex; gap: clamp(4px, 1.5cqw, 14px);
                    padding: clamp(4px, 1.2cqw, 12px);
                    padding-bottom: clamp(8px, 2.4cqw, 22px);
                    background: #7c93b0; border-radius: 10px; flex: 0 0 auto;
                    /* UNE BOULE EST UN CERCLE, PAS UNE PASTILLE. Sa largeur DIT
                       sa taille — c'est la règle du jeu en dessin —, donc sa
                       hauteur doit suivre. Ce qu'on dimensionne est le diamètre
                       de la PLUS GROSSE ; les autres en prennent une fraction,
                       et la pile mesure la somme de ces fractions : c'est la
                       variable --tb-somme, calculée en JavaScript parce que le
                       CSS ne sait pas faire une somme de n termes. (Et pas
                       d'accent grave ici : ce commentaire vit dans un littéral
                       de gabarit, qu'un seul accent grave refermerait.) */
                    --tb-d: clamp(16px, min(26cqw, calc(76cqh / var(--tb-somme, 3.2))), 92px);
                }
                .tb-conduit {
                    width: calc(var(--tb-d) * 1.14);
                    height: calc(var(--tb-d) * var(--tb-somme, 3.2) * 1.06);
                    background: #e6eaee; border: 2px solid #5b7391;
                    border-radius: 8px;
                    display: flex; flex-direction: column-reverse; align-items: center;
                    justify-content: flex-start; gap: 2px; padding-bottom: 3px;
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                    position: relative;
                }
                .tb-conduit--vise { box-shadow: inset 0 0 0 3px #6d5cf6; }
                .tb-conduit--but { box-shadow: inset 0 0 0 3px #2f855a; }
                .tb-boule {
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    color: #fff; font-weight: 800;
                    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .25);
                    flex: 0 0 auto;
                }
                /* La boule soulevée flotte au-dessus du socle : on voit ce qu'on
                   tient, et où on peut le poser. */
                .tb-main {
                    height: calc(var(--tb-d) * .9);
                    display: flex; align-items: center; justify-content: center;
                    font-size: clamp(11px, 2.4cqh, 15px); font-weight: 700; gap: 8px;
                }
                .tb-compte {
                    font-weight: 700; font-size: clamp(11px, 2.4cqh, 15px);
                    display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
                }
                .tb-compte b { color: #4c3fd0; }
                .tb-compte .tb-detour { color: #b7791f; }
                .tb-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .tb-btn {
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    cursor: pointer; font-size: clamp(11px, 2.4cqh, 14px);
                }
                .tb-note { min-height: 1.5em; text-align: center; font-weight: 600;
                    font-size: clamp(11px, 2.4cqh, 15px); }
                .tb-note--ok { color: #2f855a; }
                .tb-note--ko { color: #c53030; }
            </style>
            <div class="tb-wrap">
                <div class="tb-corps"><div class="tb-socle" id="tb-socle"></div></div>
                <div class="tb-main" id="tb-main"></div>
                <div class="tb-compte" id="tb-compte"></div>
                <div class="tb-note" id="tb-note"></div>
                <div class="tb-barre">
                    <button type="button" class="tb-btn" id="tb-aide">💡 Le bon coup</button>
                    <button type="button" class="tb-btn" id="tb-annule">↶ Annuler</button>
                    <button type="button" class="tb-btn" id="tb-neuf">Recommencer</button>
                </div>
            </div>`;
        this.socleEl = this.container.querySelector('#tb-socle');
        this.mainEl = this.container.querySelector('#tb-main');
        this.compteEl = this.container.querySelector('#tb-compte');
        this.noteEl = this.container.querySelector('#tb-note');
        this.container.querySelector('#tb-aide').onclick = () => this.aider();
        this.container.querySelector('#tb-annule').onclick = () => this.annuler();
        this.container.querySelector('#tb-neuf').onclick = () => this.poser();
        this.poser();
    }

    poser() {
        this.etat = departBrahma(this.n);
        this.histoire = [];
        this.prise = null;
        this.coups = 0;
        this.fini = false;
        this.dessiner();
        this.note(`Amène les ${this.n} boules sur le conduit de droite. `
            + `Le minimum est de ${minimumBrahma(this.n)} coups.`);
    }

    dessiner() {
        this.socleEl.style.setProperty('--tb-n', this.n);
        this.socleEl.style.setProperty('--tb-somme', this.sommeParts());
        this.socleEl.innerHTML = this.etat.map((pile, p) => {
            const classes = ['tb-conduit'];
            if (this.prise === p) classes.push('tb-conduit--vise');
            if (p === 2 && !this.fini) classes.push('tb-conduit--but');
            const boules = pile.map(b => this.bouleHtml(b)).join('');
            return `<div class="${classes.join(' ')}" data-p="${p}">${boules}</div>`;
        }).join('');
        this.socleEl.querySelectorAll('[data-p]').forEach(el => {
            el.onclick = () => this.toucher(Number(el.dataset.p));
        });

        // Ce qu'on tient à la main, s'il y a lieu.
        const tenue = this.prise !== null ? this.etat[this.prise][this.etat[this.prise].length - 1] : null;
        this.mainEl.innerHTML = tenue
            ? `<span>Tu tiens&nbsp;:</span>${this.bouleHtml(tenue)}<span>— pose-la sur un conduit.</span>`
            : '';

        const restants = this.fini ? 0 : coupsRestants(this.etat, this.n).length;
        const ideal = this.coups + restants;
        const detour = ideal - minimumBrahma(this.n);
        this.compteEl.innerHTML = `<span><b>${this.coups}</b> coups joués</span>`
            + `<span>minimum : <b>${minimumBrahma(this.n)}</b></span>`
            + (this.fini ? '' : `<span>il en reste <b>${restants}</b> au plus court</span>`)
            + (detour > 0 ? `<span class="tb-detour">${detour} de détour</span>` : '');
    }

    /** La part du plus grand diamètre que prend la boule de taille `b`. */
    part(b) { return 0.45 + 0.55 * (b / this.n); }

    /** La hauteur de la pile complète, en diamètres : la somme des parts. */
    sommeParts() {
        let s = 0;
        for (let b = 1; b <= this.n; b++) s += this.part(b);
        return Math.round(s * 100) / 100;
    }

    bouleHtml(b) {
        // La largeur dit la taille, et c'est la seule chose qui compte : une
        // boule ne se pose que sur plus large qu'elle. La hauteur la suit, pour
        // que ce soit un CERCLE et non une pastille étirée.
        const p = this.part(b);
        return `<div class="tb-boule" style="width:calc(var(--tb-d) * ${p});
            height:calc(var(--tb-d) * ${p}); font-size:calc(var(--tb-d) * ${p} * .46);
            background:${TEINTES[(b - 1) % TEINTES.length]}">${b}</div>`;
    }

    /** Toucher un conduit : on prend sa boule du dessus, ou l'on pose la sienne. */
    toucher(p) {
        if (this.isDemo || this.fini) return;
        if (this.prise === null) {
            if (!this.etat[p].length) {
                this.note('Ce conduit est vide — il n\'y a rien à prendre.', 'ko');
                return;
            }
            this.prise = p;
            this.dessiner();
            this.note('');
            return;
        }
        if (this.prise === p) { this.prise = null; this.dessiner(); this.note(''); return; }
        this.deplacer(this.prise, p);
    }

    deplacer(de, vers) {
        if (!coupValide(this.etat, de, vers)) {
            const prise = this.etat[de][this.etat[de].length - 1];
            const dessous = this.etat[vers][this.etat[vers].length - 1];
            this.prise = null;
            this.dessiner();
            // ON DIT LA RÈGLE AU MOMENT OÙ ON LA HEURTE : c'est là qu'elle
            // s'apprend, pas dans la consigne.
            this.note(`La boule ${prise} ne peut pas se poser sur la ${dessous} : `
                + 'une boule ne va que sur une PLUS GROSSE.', 'ko');
            return;
        }
        const avant = coupsRestants(this.etat, this.n).length;
        this.histoire.push(this.etat.map(p => p.slice()));
        this.etat = jouer(this.etat, de, vers);
        this.coups++;
        this.prise = null;
        const apres = coupsRestants(this.etat, this.n).length;
        this.dessiner();
        if (estGagneBrahma(this.etat, this.n)) return this.gagner();
        // Un coup qui ÉLOIGNE du but : on le signale sans l'interdire. Se
        // tromper fait partie du jeu ; ne pas s'en apercevoir, non.
        this.note(apres > avant
            ? 'Ce coup t\'éloigne : il te reste un coup de plus qu\'avant.'
            : '');
    }

    annuler() {
        if (this.isDemo || this.fini || !this.histoire.length) return;
        this.etat = this.histoire.pop();
        this.coups = Math.max(0, this.coups - 1);
        this.prise = null;
        this.dessiner();
        this.note('Coup annulé.');
    }

    /**
     * L'INDICE DONNE UN COUP, ET DIT POURQUOI CELUI-LÀ. La raison est toujours
     * la même — c'est la récursion du jeu —, et l'entendre trois fois de suite
     * finit par la faire comprendre : pour déplacer la grosse, il faut d'abord
     * dégager toutes les petites AILLEURS.
     */
    aider() {
        if (this.isDemo || this.fini) return;
        const c = prochainCoupBrahma(this.etat, this.n);
        if (!c) return;
        this.aides++;
        const noms = ['gauche', 'milieu', 'droite'];
        const grosse = this.n;
        const ouGrosse = this.etat.findIndex(p => p.includes(grosse));
        this.note(`Joue la boule <b>${c.boule}</b> du conduit ${noms[c.de]} vers `
            + `${noms[c.vers]}. `
            + (ouGrosse === 2
                ? 'La plus grosse est arrivée : il ne reste qu\'à lui ramener les autres.'
                : 'Tant que la plus grosse n\'est pas à droite, tout ce qu\'on fait sert à '
                    + 'DÉGAGER les petites du conduit du milieu.'));
    }

    gagner() {
        this.fini = true;
        this.prise = null;
        this.dessiner();
        const q = qualiteBrahma(this.n, this.coups);
        this.note(q.parfait
            ? `🏆 Parfait — ${q.joues} coups, le minimum absolu pour ${this.n} boules.`
            : `🏆 Gagné en ${q.joues} coups. Le minimum est ${q.mini} : `
                + `${q.detours} coup${q.detours > 1 ? 's' : ''} de détour. Réessaie ?`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Tour de Brahma, ${this.n} boules`,
            expected: `${q.mini} coups`, given: `${q.joues} coups`,
            points: Math.max(10, 40 - q.detours * 2 - this.aides * 3)
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'tb-note' + (ton ? ` tb-note--${ton}` : '');
    }

    /**
     * Le robot ne montre pas une suite de coups : il montre L'IDÉE. Déplacer
     * quatre boules, c'est déplacer les trois du dessus ailleurs, poser la
     * quatrième, et recommencer avec trois. C'est tout le jeu, et c'est la
     * première récursion que rencontre un élève.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.etat) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        cur.say(`Pour amener la boule ${this.n} à droite, il faut d'abord que le conduit de `
            + `droite soit VIDE. Donc que les ${this.n - 1} du dessus soient ailleurs.`,
        this.socleEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say(`Et pour déplacer ces ${this.n - 1} boules, même problème avec la `
            + `${this.n - 1}. Le jeu se ramène toujours à lui-même, une boule de moins.`,
        this.socleEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let i = 0; i < 5; i++) {
            const c = prochainCoupBrahma(this.etat, this.n);
            if (!c) break;
            this.etat = jouer(this.etat, c.de, c.vers);
            this.coups++;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.step || 700) || !this.isRunning) return fin();
        }
        cur.say(`C'est pour cela que le compte double à chaque boule ajoutée, plus un : `
            + '1, 3, 7, 15, 31… Avec soixante-quatre boules, les moines de Brahma en ont '
            + 'pour cinq cents milliards d\'années.', this.compteEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineTourBrahma(container, isDemo, params) {
    const game = new TourBrahma(container, isDemo, params);
    game.start();
    return game;
}
