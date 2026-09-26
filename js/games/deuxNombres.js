// LES DEUX NOMBRES — à l'écran.
//
// Rémy, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Le quatrième s'appelait
// « A 1-Off Puzzle ». La règle et le juge sont dans js/core/deuxNombres.js.
//
// ON ÉCRIT LES DEUX NOMBRES, ON NE DÉPLACE PAS DE FENÊTRES. Le jeu d'origine se
// joue avec deux boucles dessinées par-dessus les lettres ; les faire glisser
// au doigt, sur une ligne de sept cases, demande une précision qu'on n'a pas.
// Deux champs et un clavier de chiffres font le même travail, et laissent toute
// la place à ce qui compte : chercher.
//
// LA LIGNE SE SOULIGNE QUAND ON A TROUVÉ. C'est là qu'on voit le chevauchement
// — le chiffre du milieu appartient aux deux nombres, et il est de la couleur
// des deux. Le montrer avant reviendrait à donner la réponse.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { genererDeuxNombres, verifierDeuxNombres, placesDe, PALIERS_DEUX_NOMBRES }
    from '../core/deuxNombres.js';

const COMPETENCE = 'num.logique.deux-nombres';

class DeuxNombres extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'deux-nombres');
        this.palier = PALIERS_DEUX_NOMBRES[this.params.palier] ? this.params.palier : 'facile';
        this.rng = makeRng(this.params.seed || `dn${Date.now()}`);
        this.verifs = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .dn-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(8px, 2.4cqh, 20px);
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .dn-phrase {
                    font-size: clamp(.85rem, 2.8cqh, 1.15rem); text-align: center;
                    max-width: 44ch; font-weight: 600;
                }
                .dn-ligne { display: flex; gap: clamp(4px, 1.4cqw, 10px); }
                .dn-chiffre {
                    width: var(--dn-cote); height: var(--dn-cote);
                    display: flex; align-items: center; justify-content: center;
                    background: var(--bg-plateau); border-radius: 8px;
                    font-weight: 700; font-size: clamp(1.1rem, 5cqh, 2.4rem);
                    position: relative;
                }
                /* Les deux soulignements, posés après coup : le chiffre partagé
                   porte les deux, et c'est la le point du jeu. */
                .dn-chiffre--gauche { box-shadow: inset 0 -6px 0 0 #4dabf7; }
                .dn-chiffre--droite { box-shadow: inset 0 6px 0 0 #f0a04b; }
                .dn-chiffre--gauche.dn-chiffre--droite {
                    box-shadow: inset 0 -6px 0 0 #4dabf7, inset 0 6px 0 0 #f0a04b;
                }
                .dn-champs { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: center; }
                .dn-champ {
                    width: 5ch; padding: 6px 8px; text-align: center;
                    font-size: clamp(.95rem, 3.2cqh, 1.4rem); font-weight: 700;
                    border: 2px solid var(--border); border-radius: 8px;
                    background: var(--bg-panel); color: var(--text-main);
                }
                .dn-champ--gauche { border-color: #4dabf7; }
                .dn-champ--droite { border-color: #f0a04b; }
                .dn-et { font-size: clamp(.8rem, 2.4cqh, 1rem); color: var(--text-muted); }
                .dn-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .dn-btn {
                    border: none; border-radius: 999px; padding: 7px 16px;
                    background: var(--primary); color: #fff; font-weight: 700;
                    font-size: clamp(.78rem, 2.2cqh, .95rem); cursor: pointer;
                }
                .dn-note {
                    min-height: 2.6em; text-align: center; max-width: 50ch;
                    font-size: clamp(.74rem, 2.2cqh, .95rem); line-height: 1.35;
                }
                .dn-note--ko { color: var(--danger-texte); }
                .dn-note--ok { color: var(--success); font-weight: 700; }
            </style>
            <div class="dn-wrap">
                <p class="dn-phrase" data-phrase></p>
                <div class="dn-ligne" data-ligne></div>
                <div class="dn-champs">
                    <input class="dn-champ dn-champ--gauche" data-gauche inputmode="numeric"
                           maxlength="4" aria-label="Le nombre de gauche" autocomplete="off">
                    <span class="dn-et">et</span>
                    <input class="dn-champ dn-champ--droite" data-droite inputmode="numeric"
                           maxlength="4" aria-label="Le nombre de droite" autocomplete="off">
                </div>
                <div class="dn-barre">
                    <button type="button" class="dn-btn" data-verifier>Vérifier</button>
                </div>
                <p class="dn-note" data-note role="status" aria-live="polite"></p>
            </div>`;
        this.ui = {
            phrase: this.container.querySelector('[data-phrase]'),
            ligne: this.container.querySelector('[data-ligne]'),
            gauche: this.container.querySelector('[data-gauche]'),
            droite: this.container.querySelector('[data-droite]'),
            note: this.container.querySelector('[data-note]')
        };
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        // ENTRÉE VALIDE, comme partout ailleurs : un élève qui tape au clavier
        // ne doit pas avoir à viser un bouton.
        [this.ui.gauche, this.ui.droite].forEach(ch => {
            ch.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.verifier(); });
        });
    }

    startGameLoop() { this.nouvelleLigne(); }

    nouvelleLigne() {
        this.g = genererDeuxNombres({ rng: this.rng, ...PALIERS_DEUX_NOMBRES[this.palier] });
        if (!this.g) { this.note('Ligne introuvable — on recommence.', 'ko'); return; }
        this.fini = false;
        this.ui.phrase.textContent = this.g.texte;
        this.ui.gauche.value = '';
        this.ui.droite.value = '';
        this.ui.gauche.disabled = false;
        this.ui.droite.disabled = false;
        this.dessiner();
        this.note('Les deux nombres se lisent dans la ligne, et partagent un chiffre.', '');
        if (!this.isDemo) regTimeout(() => this.ui.gauche.focus(), 80);
    }

    dessiner(gauche = null, droite = null) {
        const cote = 'min(calc((100cqh - 240px)), calc((100cqw - 40px) / '
            + `${this.g.ligne.length}), 64px)`;
        this.ui.ligne.style.setProperty('--dn-cote', cote);
        this.ui.ligne.innerHTML = this.g.ligne.map((c, i) => {
            const classes = ['dn-chiffre'];
            if (gauche && i >= gauche[0] && i < gauche[1]) classes.push('dn-chiffre--gauche');
            if (droite && i >= droite[0] && i < droite[1]) classes.push('dn-chiffre--droite');
            return `<div class="${classes.join(' ')}">${c}</div>`;
        }).join('');
    }

    verifier() {
        if (this.fini || !this.g) return;
        const a = this.ui.gauche.value.trim(), b = this.ui.droite.value.trim();
        const bilan = verifierDeuxNombres(this.g, a, b);
        if (bilan.ok) return this.gagner(a, b);

        this.verifs += 1;
        const p = bilan.problemes[0];
        this.note(p.message, 'ko');
        this.onWrongAnswer(null, {
            questionText: `Les Deux Nombres — ${this.g.ligne.join(' ')} · ${this.g.court}`,
            input: `${a} et ${b}`,
            expected: `${this.g.solution.a} et ${this.g.solution.b}`,
            concept: COMPETENCE,
            customMessage: p.message
        });
    }

    gagner(a, b) {
        this.fini = true;
        this.ui.gauche.disabled = true;
        this.ui.droite.disabled = true;
        // ON SOULIGNE LÀ OÙ C'EST VRAI — et le chiffre partagé porte les deux
        // couleurs. C'est la seule façon de VOIR le chevauchement.
        const la = String(a).length, lb = String(b).length;
        const pa = placesDe(this.g.ligne, a), pb = placesDe(this.g.ligne, b);
        let ou = null;
        pa.forEach(ia => pb.forEach(ib => { if (ib === ia + la - 1) ou = [ia, ib]; }));
        if (ou) this.dessiner([ou[0], ou[0] + la], [ou[1], ou[1] + lb]);
        this.note(`🏆 ${a} et ${b} — ils partagent le chiffre du milieu.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Les Deux Nombres — ${this.g.ligne.join(' ')} · ${this.g.court}`,
            given: `${a} et ${b}`, expected: `${a} et ${b}`,
            points: Math.max(8, 14 - this.verifs * 2)
        });
        regTimeout(() => { if (this.isRunning) { this.verifs = 0; this.nouvelleLigne(); } }, 2600);
    }

    note(texte, ton) {
        this.ui.note.textContent = texte || '';
        this.ui.note.className = 'dn-note' + (ton ? ` dn-note--${ton}` : '');
    }

    /**
     * LE ROBOT MONTRE LA MÉTHODE, qui n'est pas de deviner : on prend le
     * premier chiffre, on lit le nombre qui commence là, on calcule ce que la
     * phrase demande, et l'on regarde si CE nombre-là est écrit juste après.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => {
            cur.destroy(); gate.destroy();
            this.demoCursor = null; this.demoGate = null;
        };
        if (!this.g) this.nouvelleLigne();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        cur.say('Les chiffres ne se sautent pas : un nombre se lit d\u2019affilée dans la '
            + 'ligne. Et les deux nombres partagent un chiffre.', this.ui.ligne);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        const { a, b } = this.g.solution;
        cur.say(`J\u2019essaie ${a}. La phrase demande ${this.g.court}, donc je cherche `
            + `${b} juste après — en partageant le dernier chiffre.`, this.ui.ligne);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        this.ui.gauche.value = String(a);
        this.ui.droite.value = String(b);
        const la = String(a).length, lb = String(b).length;
        const ia = placesDe(this.g.ligne, a)[0] || 0;
        this.dessiner([ia, ia + la], [ia + la - 1, ia + la - 1 + lb]);
        cur.say('Le chiffre du milieu est souligné deux fois : il sert aux deux nombres.',
            this.ui.ligne);
        if (!await gate.wait(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineDeuxNombres(container, isDemo, params) {
    const game = new DeuxNombres(container, isDemo, params);
    game.start();
    return game;
}
