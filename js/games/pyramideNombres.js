// LA PYRAMIDE DE NOMBRES — à l'écran.
//
// Rémy : « Deux jeux dans ces styles. » Voici la jumelle arithmétique de la
// pyramide de mots : même escalier, même remplissage de proche en proche, mais
// chaque case est la SOMME DES DEUX DU DESSOUS.
//
// CE QUE L'ÉCRAN AJOUTE, C'EST LA VÉRIFICATION IMMÉDIATE. Sur le papier, une
// erreur au deuxième étage se découvre au sommet, quand plus rien ne tombe
// juste et qu'il faut tout regommer. Ici, une case fausse se voit tout de
// suite — et l'élève apprend qu'une pyramide se contrôle case par case.
//
// L'AIDE MONTRE UN TRIANGLE, PAS UN NOMBRE. « Ici, deux cases sur trois sont
// remplies : 23 − 9 = 14. » C'est la méthode qui ne bloque jamais, et c'est
// aussi elle qui fait comprendre qu'on peut DESCENDRE — la faute de tout le
// monde étant de ne savoir qu'additionner vers le haut.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    creerPyramideNombres, saisieInitialePN, estResoluePN, casesFaussesPN,
    prochaineCase, qualitePN, TAILLES_PN, DIFFICULTES_PN
} from '../core/pyramideNombres.js';

const COMPETENCE = 'num.pyramide-additive';

class PyramideNombres extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'pyramide-nombres');
        this.graine = this.params.seed || 'pn';
        this.taille = TAILLES_PN[this.params.taille] ? this.params.taille : 'moyenne';
        this.difficulte = DIFFICULTES_PN[this.params.difficulte] ? this.params.difficulte : 'melange';
        this.aides = 0;
        this.verifs = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .pn-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.2cqh, 10px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .pn-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size; overflow: hidden;
                }
                /* La case est LARGE, pas carrée : un sommet à trois chiffres doit
                   y tenir sans que le nombre se serre. */
                .pn-table {
                    --pn-h: clamp(16px, min(calc(78cqw / var(--pn-n, 5) / 1.5),
                                  calc(80cqh / var(--pn-n, 5))), 46px);
                    --pn-w: calc(var(--pn-h) * 1.5);
                    display: flex; flex-direction: column-reverse; gap: 3px; flex: 0 0 auto;
                }
                .pn-rang { display: flex; gap: 3px; justify-content: center; }
                .pn-case {
                    width: var(--pn-w); height: var(--pn-h);
                    background: #fff; border: 0; padding: 0; margin: 0; font: inherit;
                    box-shadow: inset 0 0 0 1px #94a3b8; border-radius: 4px;
                    font-weight: 800; color: #111827;
                    font-size: calc(var(--pn-h) * .52); line-height: 1;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                }
                /* Une case donnée est de l'énoncé : on n'y écrit pas. */
                .pn-case--donne { background: #eef2f7; color: #475569; cursor: default; }
                .pn-case--vise { box-shadow: inset 0 0 0 3px #6d5cf6; background: #f5f3ff; }
                .pn-case--faux { box-shadow: inset 0 0 0 3px #c53030; color: #c53030; }
                /* Le triangle que l'aide désigne : les deux cases connues et
                   celle qu'on en tire. */
                .pn-case--montre { background: #fef3c7; box-shadow: inset 0 0 0 2px #b7791f; }

                .pn-pave { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
                .pn-touche {
                    width: clamp(26px, 6.5cqw, 44px); height: clamp(24px, 5cqh, 40px);
                    border: 1px solid var(--border-soft, #cbd5e1); border-radius: 8px;
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    font-weight: 800; font-size: clamp(13px, 2.8cqh, 19px);
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                }
                .pn-touche--large { width: auto; padding: 0 12px; }
                .pn-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .pn-btn {
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    cursor: pointer; font-size: clamp(11px, 2.4cqh, 14px);
                }
                .pn-note { min-height: 1.5em; text-align: center; font-weight: 600;
                    font-size: clamp(11px, 2.4cqh, 15px); }
                .pn-note--ok { color: #2f855a; }
                .pn-note--ko { color: #c53030; }
            </style>
            <div class="pn-wrap">
                <div class="pn-corps"><div class="pn-table" id="pn-table"></div></div>
                <div class="pn-pave" id="pn-pave"></div>
                <div class="pn-note" id="pn-note"></div>
                <div class="pn-barre">
                    <button type="button" class="pn-btn" id="pn-aide">💡 Un indice</button>
                    <button type="button" class="pn-btn" id="pn-verif">Vérifier</button>
                    <button type="button" class="pn-btn" id="pn-neuf">Nouvelle pyramide</button>
                </div>
            </div>`;
        this.tableEl = this.container.querySelector('#pn-table');
        this.paveEl = this.container.querySelector('#pn-pave');
        this.noteEl = this.container.querySelector('#pn-note');
        this.container.querySelector('#pn-aide').onclick = () => this.aider();
        this.container.querySelector('#pn-verif').onclick = () => this.verifier();
        this.container.querySelector('#pn-neuf').onclick = () => this.poser(true);

        this.paveEl.innerHTML = '0123456789'.split('').map(c =>
            `<button type="button" class="pn-touche" data-chiffre="${c}">${c}</button>`).join('')
            + '<button type="button" class="pn-touche pn-touche--large" data-chiffre="eff">⌫</button>';
        this.paveEl.querySelectorAll('[data-chiffre]').forEach(b => {
            b.onclick = () => this.taper(b.dataset.chiffre);
        });

        this.surTouche = (e) => {
            if (this.fini || this.isDemo) return;
            if (/^[0-9]$/.test(e.key)) { this.taper(e.key); e.preventDefault(); }
            else if (e.key === 'Backspace') { this.taper('eff'); e.preventDefault(); }
            else if (e.key === 'Enter') { this.verifier(); e.preventDefault(); }
        };
        document.addEventListener('keydown', this.surTouche);
        this.poser();
    }

    poser(neuve = false) {
        if (neuve) this.graine = `${this.graine}+`;
        this.p = creerPyramideNombres({
            taille: this.taille, difficulte: this.difficulte, rng: makeRng(this.graine)
        });
        this.saisie = saisieInitialePN(this.p);
        this.brouillon = '';
        this.fini = false;
        this.fautes = null;
        this.montre = null;
        this.vise = this.premiereVide();
        this.dessiner();
        const q = qualitePN(this.p);
        this.note(`${q.aTrouver} cases à trouver. Chaque case est la SOMME des deux du dessous.`);
    }

    premiereVide() {
        for (let k = 0; k < this.p.lignes.length; k++) {
            for (let i = 0; i < this.p.lignes[k].length; i++) {
                if (!this.p.donnes[k][i]) return [k, i];
            }
        }
        return null;
    }

    dessiner() {
        const p = this.p;
        this.tableEl.style.setProperty('--pn-n', p.n);
        const faux = new Set((this.fautes || []).map(([k, i]) => `${k},${i}`));
        const montre = new Set((this.montre || []).map(([k, i]) => `${k},${i}`));
        // `column-reverse` empile la base en bas : on écrit donc les rangs dans
        // l'ordre naturel, du sol au sommet.
        this.tableEl.innerHTML = p.lignes.map((l, k) => {
            const cases = l.map((_, i) => {
                const classes = ['pn-case'];
                if (p.donnes[k][i]) classes.push('pn-case--donne');
                else if (this.vise && this.vise[0] === k && this.vise[1] === i) {
                    classes.push('pn-case--vise');
                }
                if (faux.has(`${k},${i}`)) classes.push('pn-case--faux');
                if (montre.has(`${k},${i}`)) classes.push('pn-case--montre');
                const ecrit = this.vise && this.vise[0] === k && this.vise[1] === i && this.brouillon
                    ? this.brouillon
                    : (this.saisie[k][i] === null ? '' : this.saisie[k][i]);
                return `<button type="button" class="${classes.join(' ')}"
                    data-k="${k}" data-i="${i}">${ecrit}</button>`;
            }).join('');
            return `<div class="pn-rang">${cases}</div>`;
        }).join('');
        this.tableEl.querySelectorAll('[data-k]').forEach(el => {
            el.onclick = () => this.viser(Number(el.dataset.k), Number(el.dataset.i));
        });
    }

    viser(k, i) {
        if (this.isDemo || this.fini || this.p.donnes[k][i]) return;
        this.poserBrouillon();
        this.vise = [k, i];
        this.brouillon = '';
        this.fautes = null;
        this.montre = null;
        this.dessiner();
    }

    /** Le nombre en cours de frappe se pose dans la case quand on la quitte. */
    poserBrouillon() {
        if (!this.vise || !this.brouillon) return;
        const [k, i] = this.vise;
        this.saisie[k][i] = Number(this.brouillon);
    }

    taper(c) {
        if (this.isDemo || this.fini || !this.vise) return;
        const [k, i] = this.vise;
        if (c === 'eff') {
            // Effacer retire un chiffre, puis vide la case : c'est le geste
            // qu'on attend d'un retour arrière.
            this.brouillon = this.brouillon
                ? this.brouillon.slice(0, -1)
                : String(this.saisie[k][i] ?? '').slice(0, -1);
            this.saisie[k][i] = this.brouillon ? Number(this.brouillon) : null;
        } else {
            // Trois chiffres suffisent : le plus haut sommet possible vaut 192.
            if (this.brouillon.length >= 3) this.brouillon = '';
            this.brouillon = (this.brouillon + c).replace(/^0+(?=\d)/, '');
            this.saisie[k][i] = Number(this.brouillon);
        }
        this.fautes = null;
        this.montre = null;
        this.dessiner();
        if (estResoluePN(this.p, this.saisie)) return this.gagner();
    }

    /**
     * L'INDICE MONTRE UN TRIANGLE, ET ÉCRIT SON CALCUL.
     *
     * Il ne remplit rien : la case reste à écrire, et c'est bien le but. Ce
     * qu'il donne, c'est le GESTE — « cherche un triangle où deux cases sur
     * trois sont remplies » —, et il le donne sur un exemple concret pris dans
     * la pyramide qui est sous les yeux.
     */
    aider() {
        if (this.isDemo || this.fini) return;
        this.poserBrouillon();
        this.brouillon = '';
        // UNE CASE FAUSSE EMPOISONNE TOUT CE QU'ON EN DÉDUIT, et l'indice n'y
        // échappait pas : après un 99 posé au hasard, il annonçait
        // « 9 − 99 = −90 » comme une déduction, avec le même aplomb que pour
        // une vraie. On refuse donc de raisonner sur une pyramide fausse — et
        // le dire est justement la leçon de cet exercice : une erreur en bas
        // se propage jusqu'au sommet.
        const faux = casesFaussesPN(this.p, this.saisie);
        if (faux.length) {
            this.fautes = faux;
            this.montre = null;
            this.dessiner();
            this.note(`${faux.length > 1 ? 'Des cases sont fausses' : 'Une case est fausse'} `
                + '(en rouge). Tant qu\'elle y est, tout ce qu\'on en déduit est faux aussi : '
                + 'corrige-la d\'abord.', 'ko');
            return;
        }
        const c = prochaineCase(this.p, this.saisie);
        if (!c) {
            this.note('Plus rien ne se déduit : il y a une case fausse quelque part. '
                + 'Touche « Vérifier ».', 'ko');
            return;
        }
        this.aides++;
        const [k, i] = c.ou;
        this.vise = [k, i];
        // Les deux cases connues du même petit triangle, pour qu'on VOIE d'où
        // vient le calcul.
        this.montre = this.trianglesDe(k, i);
        this.dessiner();
        this.note(c.sens === 'monter'
            ? `Ces deux cases-là sont remplies : <b>${c.calcul}</b>. On MONTE en additionnant.`
            : `Le dessus et une des deux sont remplis : <b>${c.calcul}</b>. `
                + 'On DESCEND en soustrayant.');
    }

    /** Les deux autres cases du triangle qui donne (k, i). */
    trianglesDe(k, i) {
        const p = this.p;
        const connue = ([a, b]) => p.lignes[a] && p.lignes[a][b] !== undefined
            && this.saisie[a][b] !== null;
        const candidats = [
            [[k - 1, i], [k - 1, i + 1]],           // les deux du dessous
            [[k + 1, i - 1], [k, i - 1]],           // le dessus à gauche
            [[k + 1, i], [k, i + 1]]                // le dessus à droite
        ];
        const bon = candidats.find(paire => paire.every(connue));
        return bon ? [...bon, [k, i]] : [[k, i]];
    }

    verifier() {
        if (this.isDemo || this.fini) return;
        this.poserBrouillon();
        this.brouillon = '';
        this.verifs++;
        if (estResoluePN(this.p, this.saisie)) return this.gagner();
        const faux = casesFaussesPN(this.p, this.saisie);
        this.fautes = faux;
        this.montre = null;
        this.dessiner();
        if (!faux.length) {
            const reste = this.saisie.flat().filter(v => v === null).length;
            this.note(`Rien de faux — il reste ${reste} case${reste > 1 ? 's' : ''} à remplir.`, 'ok');
            return;
        }
        this.note(`${faux.length} case${faux.length > 1 ? 's' : ''} en rouge. `
            + 'Rappelle-toi : plus on monte, plus les nombres GROSSISSENT.', 'ko');
    }

    gagner() {
        if (this.fini) return;
        this.fini = true;
        this.vise = null;
        this.fautes = null;
        this.montre = null;
        this.dessiner();
        const q = qualitePN(this.p);
        this.note(`🏆 Pyramide complète — sommet ${q.sommet}, base `
            + `${q.base.join(' · ')}.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Pyramide additive de ${this.p.n} étages (sommet ${q.sommet})`,
            expected: String(q.sommet), given: String(q.sommet),
            points: Math.max(10, 12 + q.aTrouver * 3 - this.aides * 3 - this.verifs * 2)
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'pn-note' + (ton ? ` pn-note--${ton}` : '');
    }

    /**
     * Le robot montre LE GESTE, qui n'est pas de calculer : c'est de CHERCHER
     * un triangle où deux cases sur trois sont remplies. Tant qu'on lit la
     * pyramide de bas en haut comme une colonne d'additions, on bloque à la
     * première case creuse du bas.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.p) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        cur.say('Chaque case est la somme des deux du dessous. Mais on ne remplit pas '
            + 'la pyramide dans l\'ordre : on cherche un TRIANGLE où deux cases sur trois '
            + 'sont déjà là.', this.tableEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let n = 0; n < 3; n++) {
            const c = prochaineCase(this.p, this.saisie);
            if (!c) break;
            const [k, i] = c.ou;
            this.vise = [k, i];
            this.montre = this.trianglesDe(k, i);
            this.dessiner();
            cur.say(c.sens === 'monter'
                ? `En voilà un : ${c.calcul}. Vers le haut, on additionne.`
                : `Et celui-ci descend : ${c.calcul}. Vers le bas, on SOUSTRAIT — c'est `
                    + 'la moitié du jeu que tout le monde oublie.', this.tableEl);
            if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();
            this.saisie[k][i] = c.valeur;
            this.montre = null;
            this.dessiner();
        }
        cur.say('Chaque case remplie en ouvre d\'autres. On ne bloque jamais.', this.tableEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }
}

export function enginePyramideNombres(container, isDemo, params) {
    const game = new PyramideNombres(container, isDemo, params);
    game.start();
    return game;
}
