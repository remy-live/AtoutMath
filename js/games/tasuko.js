// LE TASUKO — à l'écran.
//
// Rémy : « Fais un tasuko », puis une capture du vrai jeu qui m'a corrigé. Les
// pièces sont des DOMINOS de deux cases, et leurs sommes doivent faire 1, 2,
// 3, … n, chacune une seule fois. Voir js/core/tasuko.js pour la démonstration.
//
// LA LISTE DES SOMMES EST LA MOITIÉ DU JEU, alors elle est à l'écran en
// permanence. Sans elle, le joueur relie des chiffres au hasard et ne sait
// jamais où il en est ; avec elle, la question devient la bonne : « il me reste
// le 5 et le 7 — où peuvent-ils bien tenir ? » C'est le raisonnement qui compte
// ici, et c'est celui auquel on ne pense pas tout seul.
//
// ON RELIE, COMME ON TRACE UN DOMINO. Le geste est donc celui-là : on touche
// une case, puis sa voisine, et la capsule se pose sur les deux. Toucher une
// case déjà entourée retire sa paire — c'est le geste d'effacer un trait, et
// il ne demande aucun bouton de plus.
//
// UNE PAIRE JUSTE PEUT ÊTRE UNE FAUTE, ET C'EST TOUT LE JEU. « 3 + 4 = 7 » est
// une addition correcte, et pourtant elle peut être au mauvais endroit : soit
// elle vole un chiffre à une autre, soit le 7 est déjà employé ailleurs. Le jeu
// ne refuse donc pas les paires justes — il les POSE et les signale, parce que
// c'est là, et pas ailleurs, que se fait le raisonnement.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    creerTasuko, casesCouvertes, sommesEmployees, chevauchements, sommesEnDouble,
    estResoluTasuko, diagnostic, prochaineAddition, qualiteTasuko, paireDe, TAILLES_TASUKO
} from '../core/tasuko.js';

const COMPETENCE = 'num.logique.tasuko';

/** Les teintes des capsules : on tourne, pour que deux voisines se distinguent. */
const TEINTES = ['#6d5cf6', '#2f855a', '#b7791f', '#c53030', '#0987a0', '#805ad5',
    '#d53f8c', '#2b6cb0'];

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
                    gap: clamp(3px, 1.1cqh, 9px);
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
                    /* Le plafond est haut EXPRÈS : une grille de seize cases
                       sur un écran d'ordinateur restait grande comme un timbre
                       quand il était à 62 pixels. */
                    --tk-cote: clamp(20px, min(calc(88cqw / var(--tk-l, 4)),
                                     calc(84cqh / var(--tk-h, 4))), 96px);
                    display: grid; gap: 0;
                    grid-template-columns: repeat(var(--tk-l, 4), var(--tk-cote));
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
                .tk-capsule { stroke-width: .07; }

                /* LES SOMMES À TROUVER : la moitié du jeu, donc toujours visible.
                   Celles qui sont faites s'éteignent au lieu de disparaître —
                   ce qui reste se lit mieux à côté de ce qui est fait. */
                .tk-sommes {
                    display: flex; gap: 3px; flex-wrap: wrap; justify-content: center;
                    max-width: 100%;
                }
                .tk-somme {
                    min-width: 1.7em; padding: 1px 4px; border-radius: 999px;
                    font-weight: 800; text-align: center;
                    font-size: clamp(10px, 2.3cqh, 15px);
                    border: 1.5px solid #6d5cf6; color: #4c3fd0;
                    background: var(--bg-panel, #fff);
                }
                .tk-somme--faite {
                    border-color: #cbd5e1; color: #a0aec0;
                    text-decoration: line-through; background: transparent;
                }
                .tk-somme--double { border-color: #c53030; color: #c53030; }

                .tk-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .tk-btn {
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    cursor: pointer; font-size: clamp(11px, 2.4cqh, 14px);
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
                <div class="tk-sommes" id="tk-sommes"></div>
                <div class="tk-note" id="tk-note"></div>
                <div class="tk-barre">
                    <button type="button" class="tk-btn" id="tk-aide">💡 Un indice</button>
                    <button type="button" class="tk-btn" id="tk-verif">Vérifier</button>
                    <button type="button" class="tk-btn" id="tk-neuf">Nouvelle grille</button>
                </div>
            </div>`;
        this.grilleEl = this.container.querySelector('#tk-grille');
        this.calqueEl = this.container.querySelector('#tk-calque');
        this.sommesEl = this.container.querySelector('#tk-sommes');
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
        this.note(`Relie DEUX CASES VOISINES pour faire une somme. Il en faut une de chaque : `
            + `1, 2, 3… jusqu'à ${this.g.n}.`);
    }

    dessiner() {
        const g = this.g;
        this.grilleEl.style.setProperty('--tk-l', g.l);
        this.grilleEl.style.setProperty('--tk-h', g.h);
        const pris = casesCouvertes(g, this.choisies);
        const fautes = new Set(this.fautes || []);
        const casesFautives = new Set();
        fautes.forEach(id => {
            const p = paireDe(g, id);
            if (p) p.cellules.forEach(c => casesFautives.add(c));
        });

        this.grilleEl.innerHTML = g.grille.map((ligne, y) => ligne.map((v, x) => {
            const c = y * g.l + x;
            const classes = ['tk-case'];
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
            const p = paireDe(g, id);
            if (!p) return '';
            return this.capsuleSvg(p, TEINTES[p.somme % TEINTES.length], fautes.has(id), i);
        }).join('');

        // Les sommes : faites, en double, ou encore à trouver.
        const employees = sommesEmployees(g, this.choisies);
        this.sommesEl.innerHTML = Array.from({ length: g.n }, (_, i) => i + 1).map(s => {
            const ids = employees.get(s) || [];
            const cls = ids.length > 1 ? 'tk-somme tk-somme--double'
                : ids.length ? 'tk-somme tk-somme--faite' : 'tk-somme';
            return `<span class="${cls}">${s}</span>`;
        }).join('');
        void pris;
    }

    /** La capsule d'une paire : un rectangle arrondi sur ses deux cases. */
    capsuleSvg(p, teinte, faute, rang) {
        const xs = p.cases.map(([x]) => x), ys = p.cases.map(([, y]) => y);
        const x0 = Math.min(...xs), y0 = Math.min(...ys);
        const x1 = Math.max(...xs) + 1, y1 = Math.max(...ys) + 1;
        const m = 0.09;
        return `<rect class="tk-capsule" x="${x0 + m}" y="${y0 + m}"
            width="${x1 - x0 - m * 2}" height="${y1 - y0 - m * 2}"
            rx="${0.5 - m}" fill="${faute ? 'rgba(197,48,48,.16)' : teinte}"
            fill-opacity="${faute ? 1 : 0.2}"
            stroke="${faute ? '#c53030' : teinte}"
            stroke-dasharray="${faute ? '.18 .13' : ''}" data-rang="${rang}"/>`;
    }

    /**
     * DEUX TOUCHES : une case, puis sa voisine. Toucher une case déjà entourée
     * retire sa paire.
     */
    toucher(c) {
        if (this.isDemo || this.fini) return;
        this.montre = null;
        this.fautes = null;
        const g = this.g;
        const dejaLa = this.choisies.find(id => {
            const p = paireDe(g, id);
            return p && p.cellules.includes(c);
        });
        if (dejaLa !== undefined) {
            const p = paireDe(g, dejaLa);
            this.choisies = this.choisies.filter(id => id !== dejaLa);
            this.depart = null;
            this.dessiner();
            this.note(`Paire retirée : la somme ${p.somme} est de nouveau à faire.`);
            return;
        }
        if (this.depart === null) {
            this.depart = c;
            this.dessiner();
            this.note('Et maintenant sa voisine — au-dessus, au-dessous, à gauche ou à droite.');
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
        this.depart = null;
        const [xa, ya] = [deb % g.l, Math.floor(deb / g.l)];
        const [xb, yb] = [fin % g.l, Math.floor(fin / g.l)];
        const voisines = Math.abs(xa - xb) + Math.abs(ya - yb) === 1;
        if (!voisines) {
            this.dessiner();
            this.note('Une paire tient sur deux cases VOISINES, côte à côte ou l\'une sur '
                + 'l\'autre — jamais en diagonale.', 'ko');
            return;
        }
        const somme = g.grille[ya][xa] + g.grille[yb][xb];
        const p = g.paires.find(x =>
            (x.cellules[0] === deb && x.cellules[1] === fin)
            || (x.cellules[0] === fin && x.cellules[1] === deb));
        if (!p) {
            // Voisines, mais la somme ne fait partie d'aucune de celles qu'on
            // cherche : c'est un calcul juste qui ne sert à rien, et le dire
            // ainsi vaut mieux que de refuser sans expliquer.
            this.dessiner();
            this.note(`${g.grille[ya][xa]} + ${g.grille[yb][xb]} = ${somme}, mais on ne cherche `
                + `que les sommes de 1 à ${g.n}.`, 'ko');
            return;
        }
        // UNE PAIRE JUSTE MAIS QUI EMPIÈTE EST POSÉE QUAND MÊME, et signalée.
        // La refuser cacherait le raisonnement ; la montrer, c'est enseigner la
        // règle qui fait tout le jeu.
        const pris = casesCouvertes(g, this.choisies);
        const empiete = p.cellules.some(c => pris[c]);
        const dejaFaite = sommesEmployees(g, this.choisies).has(p.somme);
        this.choisies.push(p.id);
        this.fautes = empiete ? chevauchements(g, this.choisies)
            : dejaFaite ? sommesEnDouble(g, this.choisies) : null;
        this.dessiner();
        if (empiete) {
            this.note(`${p.a} + ${p.b} = ${p.somme} est juste, mais elle prend un chiffre déjà `
                + 'employé. Les deux en rouge ne peuvent pas coexister.', 'ko');
        } else if (dejaFaite) {
            this.note(`${p.a} + ${p.b} = ${p.somme}, mais la somme ${p.somme} est DÉJÀ faite `
                + 'ailleurs. Chaque somme ne se fait qu\'une fois : l\'une des deux est mal '
                + 'placée.', 'ko');
        } else {
            this.note(`${p.a} + ${p.b} = ${p.somme} ✓`, 'ok');
        }
        if (estResoluTasuko(g, this.choisies)) this.gagner();
    }

    aider() {
        if (this.isDemo || this.fini) return;
        const doubles = chevauchements(this.g, this.choisies);
        const memes = doubles.length ? [] : sommesEnDouble(this.g, this.choisies);
        if (doubles.length || memes.length) {
            this.fautes = doubles.length ? doubles : memes;
            this.montre = null;
            this.dessiner();
            this.note(doubles.length
                ? 'Deux de tes paires se partagent un chiffre. Tant qu\'elles sont là, plus '
                    + 'rien ne se déduit : retires-en une.'
                : 'Deux de tes paires font la même somme. Tant qu\'elles sont là, plus rien '
                    + 'ne se déduit : retires-en une.', 'ko');
            return;
        }
        const p = prochaineAddition(this.g, this.choisies);
        if (!p) {
            this.note('Tout est entouré.', 'ok');
            return;
        }
        this.aides++;
        // DEUX TEMPS : d'abord le raisonnement, ensuite la paire. Le premier
        // temps est ce qu'on veut enseigner ; le second n'est plus qu'un service
        // rendu à celui qui bloque vraiment.
        const montrable = p.parLaSomme !== null || p.parLaCase !== null;
        const repere = p.parLaCase !== null ? p.parLaCase : p.paire.cellules[0];
        if (montrable && this.montre !== repere) {
            this.montre = repere;
            this.fautes = null;
            this.dessiner();
            if (p.parLaSomme !== null) {
                this.note(`Cherche par la SOMME, pas par les chiffres : le <b>${p.parLaSomme}</b> `
                    + 'ne peut se faire qu\'à un seul endroit de la grille. Il est là.');
            } else {
                const v = this.g.grille[Math.floor(repere / this.g.l)][repere % this.g.l];
                this.note(`Regarde ce <b>${v}</b> : plus aucune paire possible ne peut le `
                    + 'prendre, sauf une. Il n\'y a donc pas à choisir.');
            }
            return;
        }
        this.choisies.push(p.paire.id);
        this.montre = null;
        this.dessiner();
        this.note(`${p.paire.a} + ${p.paire.b} = ${p.paire.somme}.`);
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
            this.note(`${d.n} paires se partagent un chiffre — en rouge.`, 'ko');
            return;
        }
        if (d.quoi === 'sommeDouble') {
            this.fautes = sommesEnDouble(this.g, this.choisies);
            this.dessiner();
            this.note(`${d.n} paires font la même somme — en rouge. Chaque somme ne sert `
                + 'qu\'une fois.', 'ko');
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
        this.note(`🏆 Grille finie — les sommes de 1 à ${this.g.n}, et pas un chiffre perdu.`,
            'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Tasuko ${this.g.l} × ${this.g.h} — les sommes de 1 à ${this.g.n}`,
            expected: q.lignes.join(' ; '), given: q.lignes.join(' ; '),
            points: Math.max(10, 15 + q.additions * 2 - this.aides * 3 - this.verifs * 2)
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'tk-note' + (ton ? ` tk-note--${ton}` : '');
    }

    /**
     * Le robot montre LE BON RAISONNEMENT, qui n'est pas de chercher une paire
     * qui tombe juste — il y en a partout — mais de partir d'une SOMME et de se
     * demander où elle peut bien tenir.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.g) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        cur.say(`Il y a ${this.g.paires.length} façons de relier deux cases voisines dans cette `
            + `grille, et il n'en faut que ${this.g.n} : une par somme, de 1 à ${this.g.n}. `
            + 'Relier ce qui tombe juste ne suffit donc pas.', this.grilleEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say('Le bon réflexe n\'est pas de regarder les chiffres, c\'est de regarder cette '
            + 'liste-là et de prendre une somme qui reste.', this.sommesEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let n = 0; n < 3; n++) {
            const p = prochaineAddition(this.g, this.choisies);
            if (!p) break;
            const repere = p.parLaCase !== null ? p.parLaCase : p.paire.cellules[0];
            this.montre = repere;
            this.dessiner();
            if (p.parLaSomme !== null) {
                cur.say(`Le ${p.parLaSomme} : je cherche partout où deux voisines le font, et `
                    + 'il n\'y a qu\'un seul endroit. Aucune hésitation.', this.grilleEl);
            } else {
                const v = this.g.grille[Math.floor(repere / this.g.l)][repere % this.g.l];
                cur.say(`Ou par la case : ce ${v}-là n'a plus qu'une seule voisine libre dont `
                    + 'la somme serve encore.', this.grilleEl);
            }
            if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();
            this.choisies.push(p.paire.id);
            this.montre = null;
            this.dessiner();
            cur.say(`${p.paire.a} + ${p.paire.b} = ${p.paire.somme}. Et cette paire-là en coince `
                + 'd\'autres à son tour.', this.sommesEl);
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
