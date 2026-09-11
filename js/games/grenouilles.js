// LES GRENOUILLES — à l'écran.
//
// Rémy : « Les grenouilles vertes ne peuvent aller qu'à droite et les rouges
// qu'à gauche. Une grenouille n'a le droit de sauter qu'au-dessus d'UNE seule
// grenouille. » Le but : que les deux groupes aient échangé leurs places.
//
// UNE SEULE TOUCHE PAR GRENOUILLE, ET CE N'EST PAS UNE SIMPLIFICATION : c'est
// une propriété du jeu. Une grenouille glisse si le nénuphar voisin est libre,
// et saute s'il est occupé — jamais les deux à la fois. Chaque bête a donc au
// plus UN coup, et il n'y a rien à choisir : on touche, elle bouge.
//
// CE QUE L'ÉCRAN APPORTE ICI EST PRÉCIEUX, et c'est de dire quand c'est MORT.
// Le jeu ne se perd pas : il se bloque. Deux vertes qui avancent l'une derrière
// l'autre, et plus personne ne passera jamais — mais il reste des coups
// possibles, et l'élève continue vingt minutes sans savoir que c'est fini
// depuis le troisième coup. Le noyau cherche le chemin le plus court depuis la
// position courante ; quand il n'y en a plus, on le dit tout de suite, et l'on
// propose d'annuler.
//
// LA FLÈCHE SUR CHAQUE GRENOUILLE N'EST PAS UN ORNEMENT : le sens autorisé est
// une RÈGLE, et une couleur ne la dit pas. Verte à droite, rouge à gauche —
// écrit sur la bête, on ne l'oublie pas au sixième coup.

import { BaseGame } from '../core/BaseGame.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    departGrenouilles, coupsPossibles, jouerGrenouille, estGagneGrenouilles,
    cheminLePlusCourt, prochainCoupGrenouilles, minimumGrenouilles,
    qualiteGrenouilles, TAILLES_GRENOUILLES
} from '../core/grenouilles.js';

const COMPETENCE = 'defi.grenouilles';

/**
 * UNE GRENOUILLE VUE DE FACE : un corps, deux yeux en bosse, quatre pattes.
 * Dessinée plutôt qu'écrite en emoji, parce qu'il en faut DEUX couleurs et
 * qu'aucun emoji n'existe en rouge — et parce que la même forme sert au PDF.
 */
export function grenouilleSvg(fonce, clair) {
    return `<svg viewBox="0 0 100 84" aria-hidden="true">
        <ellipse cx="22" cy="62" rx="16" ry="11" fill="${fonce}"/>
        <ellipse cx="78" cy="62" rx="16" ry="11" fill="${fonce}"/>
        <circle cx="28" cy="24" r="14" fill="${clair}"/>
        <circle cx="72" cy="24" r="14" fill="${clair}"/>
        <ellipse cx="50" cy="52" rx="34" ry="26" fill="${clair}"/>
        <circle cx="28" cy="24" r="5.5" fill="#1a202c"/>
        <circle cx="72" cy="24" r="5.5" fill="#1a202c"/>
        <path d="M34 60 q16 12 32 0" fill="none" stroke="${fonce}" stroke-width="4"
            stroke-linecap="round"/>
    </svg>`;
}

class Grenouilles extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'grenouilles');
        const t = TAILLES_GRENOUILLES[this.params.taille] || TAILLES_GRENOUILLES.quatre;
        this.n = t.n;
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .gr-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.4cqh, 12px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .gr-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size; overflow: hidden;
                }
                .gr-ruban {
                    display: flex; gap: clamp(2px, .8cqw, 8px); flex: 0 0 auto;
                    --gr-pad: clamp(26px, min(calc(88cqw / var(--gr-cases, 9)), 62cqh), 82px);
                }
                /* Le nénuphar : une case carrée, vide ou occupée. Le fond dit la
                   couleur qui l'occupe, comme sur la fiche de Rémy. */
                .gr-pad {
                    width: var(--gr-pad); height: var(--gr-pad);
                    border-radius: 12px; border: 2px solid #94a3b8; background: #eef2f7;
                    display: flex; align-items: center; justify-content: center;
                    position: relative; flex: 0 0 auto;
                    -webkit-tap-highlight-color: transparent;
                }
                .gr-pad--V { background: #dcf0d6; border-color: #4a8f3c; }
                .gr-pad--R { background: #fbdcdc; border-color: #c1392b; }
                /* Une grenouille qui PEUT bouger se touche ; les autres non, et
                   cela se voit avant d'essayer. */
                .gr-pad--jouable { cursor: pointer; }
                .gr-pad--jouable:hover { filter: brightness(1.06); }
                .gr-pad--montre { box-shadow: 0 0 0 4px rgba(183, 121, 31, .55); }
                .gr-pad svg { width: 78%; height: 78%; display: block; }
                /* La flèche du sens autorisé : la règle, écrite sur la bête. */
                .gr-sens {
                    position: absolute; bottom: 1px; right: 4px;
                    font-size: calc(var(--gr-pad) * .26); font-weight: 800; opacity: .75;
                }
                .gr-pad--R .gr-sens { right: auto; left: 4px; }

                .gr-compte {
                    font-weight: 700; font-size: clamp(11px, 2.4cqh, 15px);
                    display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
                }
                .gr-compte b { color: #4c3fd0; }
                .gr-compte .gr-detour { color: #b7791f; }
                .gr-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .gr-btn {
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    cursor: pointer; font-size: clamp(11px, 2.4cqh, 14px);
                }
                .gr-note { min-height: 2.6em; text-align: center; font-weight: 600;
                    font-size: clamp(11px, 2.4cqh, 15px); }
                .gr-note--ok { color: #2f855a; }
                .gr-note--ko { color: #c53030; }
            </style>
            <div class="gr-wrap">
                <div class="gr-corps"><div class="gr-ruban" id="gr-ruban"></div></div>
                <div class="gr-compte" id="gr-compte"></div>
                <div class="gr-note" id="gr-note"></div>
                <div class="gr-barre">
                    <button type="button" class="gr-btn" id="gr-aide">💡 Le bon saut</button>
                    <button type="button" class="gr-btn" id="gr-annule">↶ Annuler</button>
                    <button type="button" class="gr-btn" id="gr-neuf">Recommencer</button>
                </div>
            </div>`;
        this.rubanEl = this.container.querySelector('#gr-ruban');
        this.compteEl = this.container.querySelector('#gr-compte');
        this.noteEl = this.container.querySelector('#gr-note');
        this.container.querySelector('#gr-aide').onclick = () => this.aider();
        this.container.querySelector('#gr-annule').onclick = () => this.annuler();
        this.container.querySelector('#gr-neuf').onclick = () => this.poser();
        this.poser();
    }

    poser() {
        this.etat = departGrenouilles(this.n);
        this.histoire = [];
        this.coups = 0;
        this.fini = false;
        this.montre = null;
        this.dessiner();
        this.note(`Échange les ${this.n} vertes et les ${this.n} rouges. `
            + `Le minimum est de ${minimumGrenouilles(this.n)} coups.`);
    }

    dessiner() {
        this.rubanEl.style.setProperty('--gr-cases', this.etat.length);
        const jouables = new Set(coupsPossibles(this.etat).map(c => c.de));
        this.rubanEl.innerHTML = this.etat.map((v, i) => {
            const classes = ['gr-pad'];
            if (v) classes.push(`gr-pad--${v}`);
            if (jouables.has(i) && !this.fini) classes.push('gr-pad--jouable');
            if (this.montre === i) classes.push('gr-pad--montre');
            const bete = v === 'V' ? grenouilleSvg('#2f6b23', '#6cbf4a')
                : v === 'R' ? grenouilleSvg('#8f1f14', '#e6503c') : '';
            const fleche = v ? `<span class="gr-sens">${v === 'V' ? '→' : '←'}</span>` : '';
            return `<div class="${classes.join(' ')}" data-i="${i}">${bete}${fleche}</div>`;
        }).join('');
        this.rubanEl.querySelectorAll('[data-i]').forEach(el => {
            el.onclick = () => this.toucher(Number(el.dataset.i));
        });

        const chemin = this.fini ? [] : cheminLePlusCourt(this.etat, this.n);
        const mini = minimumGrenouilles(this.n);
        this.compteEl.innerHTML = `<span><b>${this.coups}</b> coups joués</span>`
            + `<span>minimum : <b>${mini}</b></span>`
            + (chemin === null
                ? '<span class="gr-detour">position bloquée</span>'
                : this.fini ? ''
                    : `<span>il en reste <b>${chemin.length}</b> au plus court</span>`
                        + (this.coups + chemin.length > mini
                            ? `<span class="gr-detour">${this.coups + chemin.length - mini} de détour</span>`
                            : ''));
    }

    toucher(i) {
        if (this.isDemo || this.fini) return;
        this.montre = null;
        const c = coupsPossibles(this.etat).find(x => x.de === i);
        if (!c) {
            const v = this.etat[i];
            this.note(!v
                ? 'C\'est le nénuphar libre — c\'est là qu\'on veut aller, pas d\'où l\'on part.'
                : v === 'V'
                    ? 'Cette verte ne peut pas bouger : à sa droite, soit le nénuphar est pris '
                        + 'et celui d\'après aussi, soit il y a DEUX grenouilles à franchir.'
                    : 'Cette rouge ne peut pas bouger : à sa gauche, soit le nénuphar est pris '
                        + 'et celui d\'après aussi, soit il y a DEUX grenouilles à franchir.', 'ko');
            return;
        }
        const avant = cheminLePlusCourt(this.etat, this.n);
        this.histoire.push(this.etat.slice());
        this.etat = jouerGrenouille(this.etat, i);
        this.coups++;
        this.dessiner();
        if (estGagneGrenouilles(this.etat, this.n)) return this.gagner();

        // LA POSITION MORTE SE DIT TOUT DE SUITE. C'est le seul service que
        // le papier ne rend pas, et c'est celui qui compte : sans lui, on
        // s'acharne un quart d'heure sur une partie finie depuis le début.
        const apres = cheminLePlusCourt(this.etat, this.n);
        if (apres === null) {
            this.note('⚠️ Cette position est PERDUE : il reste des coups possibles, mais plus '
                + 'aucun ne mène au but. C\'est la faute classique — deux grenouilles de la '
                + 'même couleur l\'une derrière l\'autre, et un saut ne franchit qu\'UNE bête. '
                + 'Annule, et alterne les couleurs.', 'ko');
            return;
        }
        this.note(avant && apres.length > avant.length - 1
            ? 'Ce coup t\'éloigne du but.'
            : c.saut ? 'Saut ✓' : 'Glissade ✓');
    }

    annuler() {
        if (this.isDemo || this.fini || !this.histoire.length) return;
        this.etat = this.histoire.pop();
        this.coups = Math.max(0, this.coups - 1);
        this.montre = null;
        this.dessiner();
        this.note('Coup annulé.');
    }

    aider() {
        if (this.isDemo || this.fini) return;
        if (cheminLePlusCourt(this.etat, this.n) === null) {
            this.note('Il n\'y a plus de bon coup : cette position ne mène nulle part. '
                + 'Annule jusqu\'à retrouver une position vivante.', 'ko');
            return;
        }
        const c = prochainCoupGrenouilles(this.etat, this.n);
        if (!c) return;
        this.aides++;
        this.montre = c.de;
        this.dessiner();
        this.note(`Touche cette grenouille : elle ${c.saut ? 'SAUTE par-dessus sa voisine'
            : 'glisse d\'un nénuphar'}. `
            + 'La règle qui ne trompe jamais : on alterne les couleurs, sans jamais faire '
            + 'avancer deux fois la même de suite.');
    }

    gagner() {
        this.fini = true;
        this.montre = null;
        this.dessiner();
        const q = qualiteGrenouilles(this.n, this.coups);
        this.note(q.parfait
            ? `🏆 Parfait — ${q.joues} coups. C'est le minimum : ${q.sauts} sauts `
                + `(${this.n} × ${this.n} croisements) et ${q.glissades} glissades.`
            : `🏆 Gagné en ${q.joues} coups. Le minimum est ${q.mini} — `
                + `${q.sauts} sauts et ${q.glissades} glissades. Réessaie ?`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Les grenouilles, ${this.n} contre ${this.n}`,
            expected: `${q.mini} coups`, given: `${q.joues} coups`,
            points: Math.max(10, 40 - q.detours * 2 - this.aides * 3)
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'gr-note' + (ton ? ` gr-note--${ton}` : '');
    }

    /**
     * Le robot montre LA FAUTE avant de montrer la méthode : il fait avancer
     * deux vertes de suite, laisse voir que c'est mort, annule, et explique
     * l'alternance. On retient bien mieux une règle dont on a vu l'accident.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.etat) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        cur.say('Les vertes ne vont qu\'à droite, les rouges qu\'à gauche, et un saut ne '
            + 'franchit qu\'UNE grenouille. On ne revient jamais en arrière.', this.rubanEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        // La faute : deux vertes de suite.
        const depart = this.etat.slice();
        this.etat = jouerGrenouille(this.etat, this.n - 1);
        this.etat = jouerGrenouille(this.etat, this.n - 2);
        this.coups = 2;
        this.dessiner();
        cur.say('Regarde la faute que tout le monde fait : deux vertes avancent l\'une '
            + 'derrière l\'autre. La position est déjà PERDUE — il reste des coups, mais '
            + 'aucun ne mène au but.', this.rubanEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        this.etat = depart;
        this.coups = 0;
        this.dessiner();
        cur.say('Un saut ne franchit qu\'une bête : deux de la même couleur côte à côte, et '
            + 'plus personne ne passe. Donc on ALTERNE — une verte, une rouge, une verte…',
        this.rubanEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let i = 0; i < 5; i++) {
            const c = prochainCoupGrenouilles(this.etat, this.n);
            if (!c) break;
            this.etat = jouerGrenouille(this.etat, c.de);
            this.coups++;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.step || 700) || !this.isRunning) return fin();
        }
        cur.say(`Et le compte se démontre : ${this.n} × ${this.n} sauts, un par croisement, `
            + `plus ${2 * this.n} glissades. ${minimumGrenouilles(this.n)} coups, jamais moins.`,
        this.compteEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineGrenouilles(container, isDemo, params) {
    const game = new Grenouilles(container, isDemo, params);
    game.start();
    return game;
}
