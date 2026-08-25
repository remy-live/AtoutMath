// LE TASUKO — à l'écran.
//
// Rémy : « Fais un tasuko. » Une grille de chiffres, des additions cachées
// dedans, et une seconde règle qui change tout : TOUS les chiffres doivent
// servir, et chacun une seule fois.
//
// ON ENTOURE, COMME DANS UNE RECHERCHE DE MOTS. Le geste est donc celui-là et
// pas un autre : on touche une extrémité, puis l'autre, et la capsule se pose
// sur les trois cases. Deux touches, pas trois — c'est le geste du crayon qui
// fait le tour d'un mot, et il marche aussi bien à la souris qu'au doigt.
//
// UNE ADDITION POSÉE PEUT ÊTRE UNE FAUTE, ET C'EST TOUT LE JEU. « 3 + 4 = 7 »
// est juste et peut néanmoins être au mauvais endroit, parce qu'elle prend un
// chiffre dont une autre avait besoin. Le jeu ne refuse donc pas les additions
// justes : il refuse celles qui se CHEVAUCHENT, et il le dit — c'est là que se
// fait le raisonnement.
//
// L'AIDE NE DONNE PAS UNE ADDITION, ELLE MONTRE UNE CASE. « Ce 6-là : plus
// aucune autre addition ne peut le prendre. » C'est la seule règle dont le
// joueur ait besoin pour finir n'importe quelle grille, et la lui montrer une
// fois vaut mieux que de lui offrir dix réponses.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    creerTasuko, additionsPossibles, casesCouvertes, chevauchements,
    estResoluTasuko, diagnostic, prochaineAddition, qualiteTasuko, TAILLES_TASUKO
} from '../core/tasuko.js';

const COMPETENCE = 'num.logique.tasuko';

/** Les teintes des capsules : on tourne, pour que deux voisines se distinguent. */
const TEINTES = ['#6d5cf6', '#2f855a', '#b7791f', '#c53030', '#0987a0', '#805ad5'];

class Tasuko extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'tasuko');
        this.graine = this.params.seed || 'tk';
        this.taille = TAILLES_TASUKO[this.params.taille] ? this.params.taille : 'moyenne';
        this.aides = 0;
        this.verifs = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .tk-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.2cqh, 10px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .tk-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size; overflow: hidden;
                }
                /* La grille est un objet de papier : noir sur blanc, quel que
                   soit le thème. Ses cases sont sa grammaire. */
                .tk-plateau { position: relative; flex: 0 0 auto; }
                .tk-grille {
                    --tk-cote: clamp(20px, min(calc(88cqw / var(--tk-l, 6)),
                                     calc(86cqh / var(--tk-h, 4))), 56px);
                    display: grid; gap: 0;
                    grid-template-columns: repeat(var(--tk-l, 6), var(--tk-cote));
                    background: #fff;
                }
                .tk-case {
                    width: var(--tk-cote); height: var(--tk-cote);
                    background: transparent; border: 0; padding: 0; margin: 0; font: inherit;
                    box-shadow: inset 0 0 0 1px #94a3b8;
                    font-weight: 800; color: #111827;
                    font-size: calc(var(--tk-cote) * .48); line-height: 1;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                    position: relative; z-index: 2;
                }
                /* Une case déjà prise par une addition : le chiffre s'assombrit
                   et la capsule passe dessous. */
                .tk-case--pris { color: #1a202c; }
                .tk-case--depart { background: rgba(109, 92, 246, .18); }
                .tk-case--montre { background: rgba(183, 121, 31, .28); }
                .tk-case--faute { background: rgba(197, 48, 48, .22); }
                /* LES CAPSULES SONT SOUS LES CHIFFRES, dans un calque à part :
                   elles doivent pouvoir déborder d'une case sans la décaler, et
                   le chiffre doit rester lisible par-dessus. */
                .tk-calque {
                    position: absolute; inset: 0; pointer-events: none; z-index: 1;
                    overflow: visible;
                }
                .tk-capsule { fill: none; stroke-width: .1; }

                .tk-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .tk-btn {
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    cursor: pointer; font-size: clamp(11px, 2.4cqh, 14px);
                }
                .tk-compte {
                    font-weight: 700; font-size: clamp(11px, 2.4cqh, 15px); opacity: .8;
                }
                .tk-note { min-height: 1.5em; text-align: center; font-weight: 600;
                    font-size: clamp(11px, 2.4cqh, 15px); }
                .tk-note--ok { color: #2f855a; }
                .tk-note--ko { color: #c53030; }
            </style>
            <div class="tk-wrap">
                <div class="tk-corps">
                    <div class="tk-plateau" id="tk-plateau">
                        <svg class="tk-calque" id="tk-calque" preserveAspectRatio="none"></svg>
                        <div class="tk-grille" id="tk-grille"></div>
                    </div>
                </div>
                <div class="tk-compte" id="tk-compte"></div>
                <div class="tk-note" id="tk-note"></div>
                <div class="tk-barre">
                    <button type="button" class="tk-btn" id="tk-aide">💡 Un indice</button>
                    <button type="button" class="tk-btn" id="tk-verif">Vérifier</button>
                    <button type="button" class="tk-btn" id="tk-neuf">Nouvelle grille</button>
                </div>
            </div>`;
        this.grilleEl = this.container.querySelector('#tk-grille');
        this.calqueEl = this.container.querySelector('#tk-calque');
        this.compteEl = this.container.querySelector('#tk-compte');
        this.noteEl = this.container.querySelector('#tk-note');
        this.container.querySelector('#tk-aide').onclick = () => this.aider();
        this.container.querySelector('#tk-verif').onclick = () => this.verifier();
        this.container.querySelector('#tk-neuf').onclick = () => this.poser(true);
        this.poser();
    }

    poser(neuve = false) {
        if (neuve) this.graine = `${this.graine}+`;
        this.g = creerTasuko({ taille: this.taille, rng: makeRng(this.graine) });
        this.choisies = [];
        this.depart = null;
        this.montre = null;
        this.fautes = null;
        this.fini = false;
        this.dessiner();
        this.note('Touche les DEUX BOUTS d\'une addition pour l\'entourer.');
    }

    dessiner() {
        const g = this.g;
        this.grilleEl.style.setProperty('--tk-l', g.l);
        this.grilleEl.style.setProperty('--tk-h', g.h);
        const pris = casesCouvertes(g, this.choisies);
        const fautes = new Set(this.fautes || []);
        const casesFautives = new Set();
        fautes.forEach(id => {
            const a = g.additions.find(x => x.id === id);
            if (a) a.cellules.forEach(c => casesFautives.add(c));
        });

        this.grilleEl.innerHTML = g.grille.map((ligne, y) => ligne.map((v, x) => {
            const c = y * g.l + x;
            const classes = ['tk-case'];
            if (pris[c]) classes.push('tk-case--pris');
            if (this.depart === c) classes.push('tk-case--depart');
            if (this.montre === c) classes.push('tk-case--montre');
            if (casesFautives.has(c)) classes.push('tk-case--faute');
            return `<button type="button" class="${classes.join(' ')}" data-c="${c}">${v}</button>`;
        }).join('')).join('');
        this.grilleEl.querySelectorAll('[data-c]').forEach(el => {
            el.onclick = () => this.toucher(Number(el.dataset.c));
        });

        // LE CALQUE EST EN UNITÉS DE CASE, pas en pixels : la capsule suit la
        // grille quelle que soit la taille de l'écran, et le même calcul sert
        // au PDF (voir printSheet.js).
        this.calqueEl.setAttribute('viewBox', `0 0 ${g.l} ${g.h}`);
        this.calqueEl.innerHTML = this.choisies.map((id, i) => {
            const a = g.additions.find(x => x.id === id);
            if (!a) return '';
            return this.capsuleSvg(a, TEINTES[i % TEINTES.length], fautes.has(id));
        }).join('');

        const q = qualiteTasuko(g);
        this.compteEl.textContent = `${this.choisies.length} / ${q.additions} additions`;
    }

    /** La capsule d'une addition : un rectangle arrondi sur ses trois cases. */
    capsuleSvg(a, teinte, faute) {
        const xs = a.cases.map(([x]) => x), ys = a.cases.map(([, y]) => y);
        const x0 = Math.min(...xs), y0 = Math.min(...ys);
        const x1 = Math.max(...xs) + 1, y1 = Math.max(...ys) + 1;
        const m = 0.11;
        return `<rect class="tk-capsule" x="${x0 + m}" y="${y0 + m}"
            width="${x1 - x0 - m * 2}" height="${y1 - y0 - m * 2}"
            rx="${0.5 - m}" stroke="${faute ? '#c53030' : teinte}"
            stroke-dasharray="${faute ? '.22 .16' : ''}"/>`;
    }

    /**
     * DEUX TOUCHES : un bout, puis l'autre. Toucher une case déjà entourée
     * retire son addition — c'est le geste d'effacer un trait de crayon, et il
     * ne demande aucun bouton de plus.
     */
    toucher(c) {
        if (this.isDemo || this.fini) return;
        this.montre = null;
        this.fautes = null;
        const g = this.g;
        const dejaLa = this.choisies.find(id => {
            const a = g.additions.find(x => x.id === id);
            return a && a.cellules.includes(c);
        });
        if (dejaLa !== undefined) {
            this.choisies = this.choisies.filter(id => id !== dejaLa);
            this.depart = null;
            this.dessiner();
            this.note('Addition retirée.');
            return;
        }
        if (this.depart === null) {
            this.depart = c;
            this.dessiner();
            this.note('Et maintenant l\'autre bout — deux cases plus loin.');
            return;
        }
        if (this.depart === c) {
            this.depart = null;
            this.dessiner();
            this.note('');
            return;
        }
        this.essayer(this.depart, c);
    }

    essayer(deb, fin) {
        const g = this.g;
        const a = g.additions.find(x =>
            (x.cellules[0] === deb && x.cellules[2] === fin)
            || (x.cellules[0] === fin && x.cellules[2] === deb));
        this.depart = null;
        if (!a) {
            // On distingue « pas alignées » de « alignées mais pas une
            // addition » : ce ne sont pas la même erreur, et la seconde est un
            // vrai calcul qui vient d'être fait de travers.
            const [xa, ya] = [deb % g.l, Math.floor(deb / g.l)];
            const [xb, yb] = [fin % g.l, Math.floor(fin / g.l)];
            const alignees = (ya === yb && Math.abs(xa - xb) === 2)
                || (xa === xb && Math.abs(ya - yb) === 2);
            this.dessiner();
            this.note(alignees
                ? 'Ces trois cases-là ne font pas une addition : le résultat doit être à un '
                    + 'BOUT, et valoir la somme des deux autres.'
                : 'Une addition tient sur trois cases voisines, en ligne ou en colonne : '
                    + 'touche les deux bouts.', 'ko');
            return;
        }
        // UNE ADDITION JUSTE MAIS QUI EMPIÈTE EST POSÉE QUAND MÊME, et signalée.
        // La refuser cacherait le raisonnement ; la montrer, c'est enseigner la
        // règle qui fait tout le jeu.
        const pris = casesCouvertes(g, this.choisies);
        const empiete = a.cellules.some(c => pris[c]);
        this.choisies.push(a.id);
        this.fautes = empiete ? chevauchements(g, this.choisies) : null;
        this.dessiner();
        if (empiete) {
            this.note(`${a.a} + ${a.b} = ${a.somme} est juste, mais elle prend un chiffre `
                + 'déjà employé. Les deux en rouge ne peuvent pas coexister.', 'ko');
        } else {
            this.note(`${a.a} + ${a.b} = ${a.somme} ✓`, 'ok');
        }
        if (estResoluTasuko(g, this.choisies)) this.gagner();
    }

    aider() {
        if (this.isDemo || this.fini) return;
        const doubles = chevauchements(this.g, this.choisies);
        if (doubles.length) {
            this.fautes = doubles;
            this.montre = null;
            this.dessiner();
            this.note('Deux de tes additions se partagent un chiffre. Tant qu\'elles sont là, '
                + 'plus rien ne se déduit : retires-en une.', 'ko');
            return;
        }
        const p = prochaineAddition(this.g, this.choisies);
        if (!p) {
            this.note('Tout est entouré.', 'ok');
            return;
        }
        this.aides++;
        // DEUX TEMPS : d'abord la case qui force, ensuite l'addition. Le
        // premier temps est le raisonnement ; le second n'est plus qu'un
        // service rendu à celui qui bloque vraiment.
        if (p.parLaCase !== null && this.montre !== p.parLaCase) {
            this.montre = p.parLaCase;
            this.fautes = null;
            this.dessiner();
            const v = this.g.grille[Math.floor(p.parLaCase / this.g.l)][p.parLaCase % this.g.l];
            this.note(`Regarde ce <b>${v}</b> : plus aucune autre addition ne peut le prendre. `
                + 'Il n\'y a donc qu\'un seul trait possible autour de lui.');
            return;
        }
        this.choisies.push(p.addition.id);
        this.montre = null;
        this.dessiner();
        this.note(`${p.addition.a} + ${p.addition.b} = ${p.addition.somme}.`);
        if (estResoluTasuko(this.g, this.choisies)) this.gagner();
    }

    verifier() {
        if (this.isDemo || this.fini) return;
        this.verifs++;
        const d = diagnostic(this.g, this.choisies);
        if (d.ok) return this.gagner();
        if (d.quoi === 'chevauchement') {
            this.fautes = chevauchements(this.g, this.choisies);
            this.dessiner();
            this.note(`${d.n} additions se partagent un chiffre — en rouge.`, 'ko');
            return;
        }
        this.fautes = null;
        this.dessiner();
        this.note(`Rien ne se chevauche, mais ${d.n} chiffre${d.n > 1 ? 's ne servent' : ' ne sert'} `
            + 'encore à rien.', 'ok');
    }

    gagner() {
        if (this.fini) return;
        this.fini = true;
        this.depart = null;
        this.montre = null;
        this.fautes = null;
        this.dessiner();
        const q = qualiteTasuko(this.g);
        this.note(`🏆 Grille finie — ${q.additions} additions, et pas un chiffre perdu.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Tasuko ${this.g.l} × ${this.g.h} — ${q.additions} additions`,
            expected: q.lignes.join(' ; '), given: q.lignes.join(' ; '),
            points: Math.max(10, 15 + q.additions * 2 - this.aides * 3 - this.verifs * 2)
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'tk-note' + (ton ? ` tk-note--${ton}` : '');
    }

    /**
     * Le robot montre LE GESTE, qui n'est pas de trouver une addition — on en
     * voit dix — mais de repérer un chiffre que PLUS RIEN D'AUTRE ne peut
     * prendre. C'est par là qu'on commence, et c'est ce qui distingue ce jeu
     * d'une simple recherche de mots.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.g) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        const total = additionsPossibles(this.g.grille).length;
        cur.say(`Il y a ${total} additions lisibles dans cette grille, et seulement `
            + `${this.g.solution.length} sont bonnes. Entourer ce qu'on voit ne suffit donc pas.`,
        this.grilleEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let n = 0; n < 2; n++) {
            const p = prochaineAddition(this.g, this.choisies);
            if (!p || p.parLaCase === null) break;
            this.montre = p.parLaCase;
            this.dessiner();
            const v = this.g.grille[Math.floor(p.parLaCase / this.g.l)][p.parLaCase % this.g.l];
            cur.say(`Je ne cherche pas une addition, je cherche un chiffre COINCÉ : ce ${v}-là, `
                + 'plus aucune autre addition ne peut le prendre.', this.grilleEl);
            if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();
            this.choisies.push(p.addition.id);
            this.montre = null;
            this.dessiner();
            cur.say(`Donc c'est celle-ci, sans hésiter : ${p.addition.a} + ${p.addition.b} `
                + `= ${p.addition.somme}. Et elle en coince d'autres à son tour.`, this.grilleEl);
            if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();
        }
        cur.say('De proche en proche, toute la grille se découpe. On ne devine jamais.',
            this.grilleEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineTasuko(container, isDemo, params) {
    const game = new Tasuko(container, isDemo, params);
    game.start();
    return game;
}
