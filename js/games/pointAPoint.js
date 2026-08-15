// POINT À POINT — à l'écran.
//
// Le noyau (core/pointAPoint.js) porte les dessins, l'ordre et les calculs.
// Ici : les pastilles, les traits, et la correction.
//
// CE QUI A COMMANDÉ CE FICHIER.
//
//   · LE NUMÉRO N'EST JAMAIS ÉCRIT. Chaque pastille porte un CALCUL, et son
//     résultat donne son rang. Chercher « celui qui vaut 13 » oblige à balayer
//     tout le dessin en calculant de tête — c'est là qu'est le travail, et il
//     disparaîtrait à la seconde où l'on afficherait les numéros.
//
//   · LE TRAIT EST UN SVG. Vingt segments qui doivent rester nets à toutes les
//     tailles, avec des diagonales : le SVG les trace juste, et une seule
//     `viewBox` de 100 × 100 dispense de convertir quoi que ce soit — le noyau
//     donne déjà ses points dans ce carré.
//
//   · LA PASTILLE EST GROSSE, MÊME AU DOIGT. On ne vise pas un point de trois
//     pixels sur un téléphone. Le disque cliquable dépasse largement le rond
//     dessiné, et le calcul se lit à côté, jamais dessous.
//
//   · DEUX CORRECTIONS, DEUX MÉTIERS. « Au fur et à mesure » refuse le mauvais
//     clic sans dire lequel était bon : l'image ne se déforme pas. « À la fin »
//     laisse tout passer et montre les fautes au bout — plus dur, et c'est un
//     contrôle.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    DESSINS, NOMS_DESSINS, FAMILLES, NOMS_FAMILLES,
    tirerPointAPoint, commencer, attendu, cliquer, annuler, corriger, traits
} from '../core/pointAPoint.js';

const COMPETENCE = 'num.calc.recherche';

class PointAPoint extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'point-a-point');
        this.rng = makeRng(this.params.seed);
    }

    render() {
        this.container.innerHTML = `
            <style>
                .pp-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 6px;
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; overflow: hidden;
                }
                .pp-tete { display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .86rem; flex: 0 0 auto; }
                /* LA CONSIGNE VIVANTE : le rang cherché, en gros. C'est la
                   seule information dont l'élève a besoin à chaque instant. */
                .pp-cherche {
                    font-weight: 900; font-size: clamp(13px, 3.2cqw, 17px);
                    padding: 4px 16px; border-radius: 999px; color: #fff;
                    background: linear-gradient(135deg, #f59e0b, #ef4444);
                    box-shadow: 0 3px 10px rgba(239,68,68,.38);
                }
                .pp-jauge { width: min(34cqw, 150px); height: 10px; border-radius: 999px;
                    background: color-mix(in srgb, var(--text-main) 14%, transparent);
                    overflow: hidden; border: 1.5px solid var(--text-main); }
                .pp-jauge > div { height: 100%; width: 0; transition: width .25s;
                    background: linear-gradient(90deg, #60a5fa, #2563eb); }

                .pp-vue {
                    position: relative; flex: 1 1 auto; width: 100%; min-height: 0;
                    display: flex; align-items: center; justify-content: center;
                    touch-action: manipulation; user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .pp-scene { position: relative; }
                .pp-scene svg { position: absolute; inset: 0; width: 100%; height: 100%;
                    pointer-events: none; overflow: visible; }
                .pp-trait { stroke: #2563eb; stroke-width: .9; fill: none;
                    stroke-linecap: round; stroke-linejoin: round; }
                .pp-trait--faux { stroke: #dc2626; stroke-dasharray: 2 1.6; }

                /* LA PASTILLE. Le disque de clic est plus large que le rond
                   visible : au doigt, viser un point ne doit pas être l'exercice. */
                .pp-point {
                    position: absolute; translate: -50% -50%; border: 0; padding: 0;
                    background: none; cursor: pointer; font-family: inherit;
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; gap: 1px; line-height: 1;
                    -webkit-tap-highlight-color: transparent;
                }
                .pp-point b {
                    display: block; border-radius: 50%; background: var(--bg-panel);
                    border: 2px solid #1e293b; box-sizing: border-box;
                }
                .pp-point span {
                    font-weight: 800; color: var(--text-main); white-space: nowrap;
                    background: color-mix(in srgb, var(--bg-panel) 82%, transparent);
                    border-radius: 4px; padding: 0 2px;
                }
                .pp-point:active b { scale: .82; }
                .pp-point--relie b { background: #2563eb; border-color: #1e3a8a; }
                .pp-point--relie span { opacity: .38; }
                .pp-point--faux b { animation: pp-non .4s ease; }
                @keyframes pp-non { 25% { translate: -18% 0; } 75% { translate: 18% 0; } }
                .pp-point--erreur b { background: #dc2626; border-color: #7f1d1d; }
                /* Le dessin fini : les calculs s'effacent, l'image reste seule. */
                .pp-scene--fini .pp-point span { opacity: 0; transition: opacity .5s; }
                .pp-scene--fini .pp-trait { animation: pp-eclat .7s ease; }
                @keyframes pp-eclat { 40% { stroke-width: 1.7; } }

                .pp-pied { display: flex; gap: 8px; align-items: center; justify-content: center;
                    flex-wrap: wrap; flex: 0 0 auto; }
                .pp-btn {
                    border: 0; border-radius: 10px; padding: 8px 14px; cursor: pointer;
                    font-family: inherit; font-weight: 700; font-size: .84rem;
                    background: color-mix(in srgb, var(--text-main) 12%, var(--bg-panel));
                    color: var(--text-main); touch-action: manipulation;
                }
                .pp-btn:active { scale: .95; }
                .pp-btn[disabled] { opacity: .4; cursor: default; }
                .pp-btn--fort { background: var(--primary); color: #fff; }
                .pp-note { min-height: 1.8em; text-align: center; font-size: .84rem;
                    color: var(--text-muted); flex: 0 0 auto; max-width: 660px; }
                .pp-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .pp-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
                @media (max-height: 560px) { .pp-note { min-height: 1.2em; font-size: .76rem; } }
            </style>
            <div class="pp-wrap">
                <div class="pp-tete">
                    <span class="pp-cherche" data-cherche></span>
                    <div class="pp-jauge"><div data-jauge></div></div>
                    <span data-compte></span>
                </div>
                <div class="pp-vue" data-vue>
                    <div class="pp-scene" data-scene>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                            <g data-traits></g>
                        </svg>
                    </div>
                </div>
                <div class="pp-pied">
                    <button type="button" class="pp-btn" data-annuler>↩ Effacer le dernier</button>
                    <button type="button" class="pp-btn pp-btn--fort" data-verifier hidden>Vérifier</button>
                    <button type="button" class="pp-btn" data-neuf>↺ Autre dessin</button>
                </div>
                <div class="pp-note" data-note></div>
            </div>`;
        this.vueEl = this.container.querySelector('[data-vue]');
        this.sceneEl = this.container.querySelector('[data-scene]');
        this.traitsEl = this.container.querySelector('[data-traits]');
        this.noteEl = this.container.querySelector('[data-note]');

        this.container.querySelector('[data-annuler]').onclick = () => this.effacer();
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();

        this.observateur = new ResizeObserver(() => { if (this.etat) this.cadrer(); });
        this.observateur.observe(this.vueEl);
    }

    startGameLoop() { this.poser(); }

    poser() {
        const p = this.params;
        const dessin = p.dessin && DESSINS[p.dessin] ? p.dessin : this.rng.pick(NOMS_DESSINS);
        const famille = p.famille && FAMILLES[p.famille] ? p.famille : this.rng.pick(NOMS_FAMILLES);
        this.exercice = tirerPointAPoint({
            rng: this.rng, dessin, famille,
            verification: p.verification === 'fin' ? 'fin' : 'immediate'
        });
        this.etat = commencer(this.exercice);
        this.corrige = null;
        this.dessinerPoints();
        this.majTout();
        this.note(`Cherche le calcul qui vaut <b>1</b>, clique dessus, puis celui qui vaut 2… `
            + `${this.exercice.total} points, et une image à la fin.`);
        return true;
    }

    // --- Le dessin -------------------------------------------------------------

    /** La scène est un CARRÉ : sans cela le dessin s'étire et le chat s'aplatit. */
    cadrer() {
        const w = this.vueEl.clientWidth || 300, h = this.vueEl.clientHeight || 300;
        // La marge laisse la place aux étiquettes des points du bord, qui
        // débordent du carré des coordonnées.
        const cote = Math.max(150, Math.min(w, h) - 28);
        this.cote = cote;
        this.sceneEl.style.width = `${cote}px`;
        this.sceneEl.style.height = `${cote}px`;
        this.sceneEl.querySelectorAll('.pp-point').forEach(el => {
            const r = Math.max(9, Math.round(cote * 0.032));
            el.querySelector('b').style.cssText = `width:${r * 2}px; height:${r * 2}px`;
            // Un cran plus petit qu'avant : « les calculs sont un peu gros ».
            // Ce qui doit se lire d'un coup d'œil, c'est le RÉSULTAT qu'on
            // cherche, pas le calcul — celui-là, on le pose dans sa tête.
            el.querySelector('span').style.fontSize = `${Math.max(9, Math.round(cote * 0.030))}px`;
        });
        this.ecarterEtiquettes();
    }

    /**
     * LES CALCULS NE SE MARCHENT PLUS DESSUS.
     *
     * Chaque étiquette était posée sous son point, sans regarder les voisines :
     * deux points proches donnaient « 9 + 418 − 8 » — deux calculs imbriqués
     * l'un dans l'autre, illisibles tous les deux. Or le jeu consiste
     * précisément à LIRE les calculs pour trouver celui qui vaut le rang
     * suivant : une étiquette illisible n'est pas un défaut de présentation,
     * c'est une question qu'on ne peut pas poser.
     *
     * On essaie donc des places, dans l'ordre : dessous (le défaut, c'est là
     * qu'on l'attend), dessus, puis décalé de plus en plus loin sur le côté.
     * La première qui ne touche personne est retenue. Le point, lui, ne bouge
     * jamais : c'est lui qu'on relie, et le dessin en dépend.
     */
    ecarterEtiquettes() {
        const spans = [...this.sceneEl.querySelectorAll('.pp-point span')];
        if (!spans.length) return;
        spans.forEach(s => { s.style.transform = ''; });
        const scene = this.sceneEl.getBoundingClientRect();
        const chevauche = (a, b) => !(a.right <= b.left || b.right <= a.left
            || a.bottom <= b.top || b.bottom <= a.top);
        // En proportion de la boîte de l'étiquette, pour rester juste à toutes
        // les tailles d'écran.
        const essais = [[0, 0], [0, -2.2], [0, 1.2], [0, -3.4],
            [0.7, 0], [-0.7, 0], [0.7, -2.2], [-0.7, -2.2],
            [1.25, 0], [-1.25, 0], [1.25, -2.2], [-1.25, -2.2]];
        const posees = [];
        for (const s of spans) {
            const b0 = s.getBoundingClientRect();
            let choix = null;
            for (const [fx, fy] of essais) {
                const dx = fx * b0.width, dy = fy * b0.height;
                const b = { left: b0.left + dx, right: b0.right + dx,
                    top: b0.top + dy, bottom: b0.bottom + dy };
                // Une étiquette peut mordre un peu sur la marge — elle est
                // faite pour ça — mais pas s'échapper de la scène.
                if (b.left < scene.left - 26 || b.right > scene.right + 26) continue;
                if (b.top < scene.top - 26 || b.bottom > scene.bottom + 26) continue;
                if (posees.some(o => chevauche(b, o))) continue;
                choix = { dx, dy, b };
                break;
            }
            // Rien de libre : on laisse à sa place plutôt que de l'envoyer au
            // hasard. Mieux vaut un chevauchement qu'une étiquette égarée loin
            // de son point.
            if (!choix) choix = { dx: 0, dy: 0, b: b0 };
            if (choix.dx || choix.dy) {
                s.style.transform = `translate(${Math.round(choix.dx)}px, ${Math.round(choix.dy)}px)`;
            }
            posees.push(choix.b);
        }
    }

    dessinerPoints() {
        this.sceneEl.querySelectorAll('.pp-point').forEach(el => el.remove());
        this.sceneEl.classList.remove('pp-scene--fini');
        const frag = document.createDocumentFragment();
        this.boutons = new Map();
        this.exercice.points.forEach(p => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'pp-point';
            b.style.left = `${p.x}%`;
            b.style.top = `${p.y}%`;
            // ARIA dit le calcul, pas le rang : un lecteur d'écran ne doit pas
            // donner la réponse que l'œil doit chercher.
            b.setAttribute('aria-label', p.texte);
            b.innerHTML = `<b></b><span>${p.texte}</span>`;
            b.onclick = () => this.toucher(p.ordre);
            frag.appendChild(b);
            this.boutons.set(p.ordre, b);
        });
        this.sceneEl.appendChild(frag);
        this.cadrer();
        this.dessinerTraits();
    }

    dessinerTraits() {
        const segs = traits(this.etat);
        const fautes = new Map((this.corrige?.fautes || []).map(f => [f.place, f]));
        let html = '';
        segs.forEach(([a, b], i) => {
            // En correction à la fin, on colore le segment qui ARRIVE sur un
            // point mal placé : c'est là que le tracé a dévié.
            const faux = fautes.has(i + 2);
            html += `<line class="pp-trait${faux ? ' pp-trait--faux' : ''}"
                x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
        });
        this.traitsEl.innerHTML = html;
    }

    majTout() {
        const e = this.etat, total = this.exercice.total;
        const veut = attendu(e);
        const fini = e.fini;
        this.container.querySelector('[data-cherche]').textContent = fini
            ? '✓ Dessin terminé'
            : `Cherche le calcul qui vaut ${veut}`;
        this.container.querySelector('[data-jauge]').style.width =
            `${Math.round((e.clics.length / total) * 100)}%`;
        this.container.querySelector('[data-compte]').textContent =
            `${e.clics.length} / ${total}`;
        this.container.querySelector('[data-annuler]').disabled = !e.clics.length;
        // Le bouton « Vérifier » n'existe qu'en correction à la fin — ailleurs
        // il n'y a rien à vérifier, tout a déjà été jugé au clic.
        const verif = this.container.querySelector('[data-verifier]');
        verif.hidden = !(this.exercice.verification === 'fin' && fini && !this.corrige);
        this.boutons.forEach((b, ordre) => {
            b.classList.toggle('pp-point--relie', e.clics.includes(ordre));
        });
    }

    // --- Jouer -------------------------------------------------------------------

    toucher(ordre) {
        if (this.isDemo || !this.etat || this.corrige) return;
        const veut = attendu(this.etat);
        const p = this.exercice.points[ordre - 1];
        const r = cliquer(this.etat, ordre);

        if (!r.ok) {
            if (r.raison === 'pas-le-bon') {
                const b = this.boutons.get(ordre);
                if (b) {
                    b.classList.remove('pp-point--faux');
                    void b.offsetWidth;
                    b.classList.add('pp-point--faux');
                }
                // ON NE DIT PAS QUEL POINT C'ÉTAIT. On dit ce que celui-ci
                // vaut : l'élève corrige son calcul, pas sa visée.
                this.note(`${p.texte} fait ${p.ordre}, et je cherche ${veut}.`, 'ko');
                this.onWrongAnswer(null, {
                    concept: COMPETENCE,
                    questionText: `Quel calcul vaut ${veut} ?`,
                    input: p.texte, expected: `un calcul qui vaut ${veut}`,
                    customMessage: `${p.texte} = ${p.ordre}. Il fallait un calcul qui vaut ${veut}.`
                });
            }
            return;
        }

        // En correction immédiate, un clic accepté est un calcul juste : c'est
        // une réponse, elle compte. En correction à la fin, tout est accepté —
        // rien n'est prouvé, on ne note qu'au moment de vérifier.
        if (this.exercice.verification === 'immediate') {
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Quel calcul vaut ${veut} ?`,
                expected: String(veut), given: p.texte, points: 1
            });
        }
        this.dessinerTraits();
        this.majTout();
        if (r.fini) {
            if (this.exercice.verification === 'fin') {
                this.note('Tous les points sont reliés. Appuie sur <b>Vérifier</b> pour savoir si l\'ordre était bon.');
            } else this.reussi();
        } else this.note('');
    }

    effacer() {
        if (this.isDemo || !this.etat || this.corrige) return;
        if (!annuler(this.etat)) return;
        this.dessinerTraits();
        this.majTout();
        this.note('');
    }

    verifier() {
        const c = corriger(this.etat);
        this.corrige = c;
        if (c.ok) return this.reussi();

        this.dessinerTraits();
        c.fautes.forEach(f => this.boutons.get(f.clique)?.classList.add('pp-point--erreur'));
        const f = c.fautes[0];
        const mauvais = this.exercice.points[f.clique - 1];
        this.note(`✗ ${c.fautes.length} point(s) dans le désordre. Au ${f.place}<sup>e</sup> `
            + `rang tu as pris « ${mauvais.texte} », qui vaut ${mauvais.ordre}.`, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `Relier ${this.exercice.total} points dans l'ordre des résultats`,
            input: `${c.fautes.length} erreur(s)`, expected: 'l\'ordre 1, 2, 3…',
            customMessage: `Au rang ${f.place}, « ${mauvais.texte} » vaut ${mauvais.ordre}, pas ${f.attendu}.`
        });
        // On rend la main : les traits fautifs restent visibles, et l'élève
        // repart d'un dessin neuf quand il veut.
        this.container.querySelector('[data-verifier]').hidden = true;
    }

    reussi() {
        this.sceneEl.classList.add('pp-scene--fini');
        this.note(`🎉 C'est « ${this.exercice.nom} » ! Tous les calculs étaient dans l'ordre.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Relier ${this.exercice.total} points dans l'ordre des résultats`,
            expected: 'l\'ordre 1, 2, 3…', given: 'l\'ordre 1, 2, 3…',
            points: 6 + this.exercice.total
        });
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'pp-note' + (ton ? ` pp-note--${ton}` : '');
    }

    // --- La démonstration -------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.etat) this.poser();
        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Les points ne portent pas de numéro : ils portent un CALCUL. Le résultat '
            + 'donne le rang.', this.container.querySelector('[data-cherche]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let k = 1; k <= Math.min(4, this.exercice.total); k++) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const p = this.exercice.points[k - 1];
            cur.say(`Je cherche ${k}. Là : ${p.texte} fait ${k} — je clique.`,
                this.boutons.get(k));
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            cliquer(this.etat, k);
            this.dessinerTraits();
            this.majTout();
            if (!await cur.pause(DEMO_SPEED.settle / 2) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et ainsi de suite. À la fin, les calculs s\'effacent et il ne reste que '
            + 'l\'image — que personne n\'a vue en commençant.', this.sceneEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.observateur) { this.observateur.disconnect(); this.observateur = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function enginePointAPoint(container, isDemo, params) {
    const jeu = new PointAPoint(container, isDemo, params);
    // C'est l'usine qui démarre le jeu : le Runner ne le fait pas.
    jeu.start();
    return jeu;
}
