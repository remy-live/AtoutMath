// LA PYRAMIDE — à l'écran.
//
// Rémy, en montrant son « Coin des jeux mathématiques » : « Deux jeux dans ces
// styles ». Le premier est celui-ci : « À chaque ligne, tu rajoutes une lettre
// pour faire un nouveau mot. Les lettres PEUVENT ÊTRE MÉLANGÉES. »
//
// LE JEU DE PAPIER EST DÉJÀ PARFAIT — une définition, des cases, un crayon.
// L'écran n'a donc pas à réinventer le jeu : il a à rendre trois services que
// le papier ne rend pas.
//
//   · IL DIT QUAND C'EST JUSTE, tout de suite, ligne par ligne. Sur la feuille,
//     un mot faux à la ligne 3 ne se découvre qu'à la ligne 6, quand plus rien
//     ne marche et qu'il faut tout gommer.
//   · IL DONNE LA LETTRE QUI ARRIVE. « Cette ligne gagne un R » aide sans
//     donner le mot — c'est l'aide exacte de ce jeu, et elle n'existe pas
//     ailleurs.
//   · IL RAPPELLE LES LETTRES DU DESSUS sous la ligne où l'on écrit. Mélangées,
//     comme le dit la règle : c'est LA chose qu'on oublie de faire, et de les
//     voir en désordre suffit souvent à faire tomber le mot.
//
// L'ORDRE DE REMPLISSAGE EST DU HAUT VERS LE BAS, toujours, et c'est pour cela
// que les lignes données sont les premières : chaque mot se cherche à partir du
// précédent, un trou au milieu couperait la chaîne en deux.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    creerPyramide, saisieInitiale, ligneJuste, estResoluePyramide,
    lettreAjoutee, qualitePyramide, DIFFICULTES
} from '../core/pyramide.js';

const COMPETENCE = 'voc.anagramme';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

class Pyramide extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'pyramide');
        this.graine = this.params.seed || 'pyr';
        this.hauteur = Math.min(7, Math.max(3, Number(this.params.hauteur) || 6));
        this.difficulte = DIFFICULTES[this.params.difficulte] ? this.params.difficulte : 'moyen';
        this.aides = 0;
        this.verifs = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .py-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.2cqh, 10px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .py-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size; overflow: hidden;
                }
                /* LA PYRAMIDE EST UN OBJET DE PAPIER : noir sur blanc, quel que
                   soit le thème. Ses cases sont sa grammaire — un fond coloré
                   les rendrait illisibles, et l'escalier ne se lirait plus. */
                .py-table {
                    --py-cote: clamp(15px, min(calc(74cqw / var(--py-h, 6)),
                                     calc(80cqh / var(--py-h, 6))), 44px);
                    display: flex; flex-direction: column; gap: 2px;
                    flex: 0 0 auto; max-width: 100%;
                }
                .py-ligne { display: flex; align-items: stretch; gap: 6px; }
                /* La définition tient sur une ligne et se serre plutôt que de
                   passer à la ligne : douze définitions empilées doivent faire
                   douze lignes, sinon l'escalier se déforme. */
                .py-def {
                    flex: 1 1 auto; min-width: 0;
                    display: flex; align-items: center; justify-content: flex-end;
                    text-align: right; font-weight: 600;
                    font-size: calc(var(--py-cote) * .42); line-height: 1.15;
                    padding: 0 4px; color: var(--text-main);
                    overflow: hidden;
                }
                /* L'ESCALIER GRANDIT VERS LA DROITE, comme dans la revue :
                   toutes les lignes partent de la même verticale et s'allongent.
                   Laissé libre, le bloc de cases se calait à droite et
                   l'escalier descendait à l'envers — la case qui DÉPASSE, celle
                   qui montre la lettre gagnée, se retrouvait à gauche, du côté
                   où l'œil ne la cherche pas. */
                .py-cases {
                    display: flex; gap: 0; flex: 0 0 auto;
                    width: calc(var(--py-cote) * var(--py-h, 6));
                    justify-content: flex-start;
                }
                .py-case {
                    width: var(--py-cote); height: var(--py-cote);
                    background: #fff; border: 0; padding: 0; margin: 0; font: inherit;
                    box-shadow: inset 0 0 0 1px #94a3b8;
                    font-weight: 800; color: #111827;
                    font-size: calc(var(--py-cote) * .56); line-height: 1;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                }
                /* Une ligne donnée est de l'énoncé, pas du jeu : fond gris, pas
                   de curseur, on n'y écrit pas. */
                .py-case--donne { background: #eef2f7; color: #475569; cursor: default; }
                .py-ligne--vise .py-case { box-shadow: inset 0 0 0 2px #6d5cf6; }
                .py-case--ici { background: #ede9ff; }
                .py-ligne--juste .py-case { box-shadow: inset 0 0 0 2px #2f855a; color: #216c48; }
                .py-ligne--faux .py-case { box-shadow: inset 0 0 0 2px #c53030; }
                .py-ligne--vise .py-def { color: #4c3fd0; }

                /* LES LETTRES DU DESSUS, MÉLANGÉES. C'est l'aide permanente du
                   jeu, et elle est gratuite : la règle dit que les lettres se
                   remélangent, encore faut-il les VOIR remélangées. */
                .py-rappel {
                    display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
                    justify-content: center; min-height: 1.6em;
                    font-size: clamp(11px, 2.4cqh, 15px);
                }
                .py-rappel b {
                    display: inline-flex; align-items: center; justify-content: center;
                    min-width: 1.5em; padding: 1px 3px; border-radius: 4px;
                    background: var(--bg-soft, #eef2f7); font-weight: 800;
                }
                .py-rappel i { font-style: normal; opacity: .75; }

                .py-pave { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center;
                    flex: 0 0 auto; max-width: 100%; }
                .py-touche {
                    width: clamp(20px, 5.6cqw, 34px); height: clamp(20px, 4.4cqh, 34px);
                    border: 1px solid var(--border-soft, #cbd5e1); border-radius: 6px;
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    font-weight: 800; font-size: clamp(10px, 2.4cqh, 15px);
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                }
                .py-touche--large { width: auto; padding: 0 10px; }
                .py-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .py-btn {
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    cursor: pointer; font-size: clamp(11px, 2.4cqh, 14px);
                }
                .py-note { min-height: 1.5em; text-align: center; font-weight: 600;
                    font-size: clamp(11px, 2.4cqh, 15px); }
                .py-note--ok { color: #2f855a; }
                .py-note--ko { color: #c53030; }

                /* SUR UN TÉLÉPHONE, LA DÉFINITION PASSE AU-DESSUS.
                   À côté d'un escalier de six cases, il ne reste pas cent
                   quarante pixels : « Ils rongent tout dans la cave » y passait
                   à la ligne, la ligne devenait haute de quatre lignes de
                   texte, et l'escalier — dont les marches doivent être de même
                   hauteur pour se lire comme un escalier — se disloquait.
                   Aucune taille de police ne rattrape cela : c'est la
                   DISPOSITION qui doit changer. Empilée, la définition a toute
                   la largeur, et les cases restent calées à gauche : la marche
                   qui dépasse se voit toujours. */
                @container (max-width: 520px) {
                    .py-table {
                        --py-cote: clamp(17px, min(calc(94cqw / var(--py-h, 6)),
                                         calc(46cqh / var(--py-h, 6))), 40px);
                        gap: 5px; width: 100%;
                    }
                    .py-ligne { flex-direction: column; align-items: stretch; gap: 1px; }
                    .py-def {
                        justify-content: flex-start; text-align: left;
                        font-size: clamp(11px, 3.6cqw, 16px); padding: 0;
                        overflow: visible;
                    }
                }
            </style>
            <div class="py-wrap">
                <div class="py-corps"><div class="py-table" id="py-table"></div></div>
                <div class="py-rappel" id="py-rappel"></div>
                <div class="py-pave" id="py-pave"></div>
                <div class="py-note" id="py-note"></div>
                <div class="py-barre">
                    <button type="button" class="py-btn" id="py-aide">💡 Un indice</button>
                    <button type="button" class="py-btn" id="py-verif">Vérifier</button>
                    <button type="button" class="py-btn" id="py-neuf">Nouvelle pyramide</button>
                </div>
            </div>`;
        this.tableEl = this.container.querySelector('#py-table');
        this.rappelEl = this.container.querySelector('#py-rappel');
        this.paveEl = this.container.querySelector('#py-pave');
        this.noteEl = this.container.querySelector('#py-note');
        this.container.querySelector('#py-aide').onclick = () => this.aider();
        this.container.querySelector('#py-verif').onclick = () => this.verifier();
        this.container.querySelector('#py-neuf').onclick = () => this.poser(true);

        this.paveEl.innerHTML = ALPHABET.split('').map(l =>
            `<button type="button" class="py-touche" data-lettre="${l}">${l}</button>`).join('')
            + '<button type="button" class="py-touche py-touche--large" data-lettre="eff">⌫</button>';
        this.paveEl.querySelectorAll('[data-lettre]').forEach(b => {
            b.onclick = () => this.taper(b.dataset.lettre);
        });

        this.surTouche = (e) => {
            if (this.fini || this.isDemo) return;
            const k = (e.key || '').toUpperCase();
            if (ALPHABET.includes(k) && k.length === 1) { this.taper(k); e.preventDefault(); }
            else if (e.key === 'Backspace') { this.taper('eff'); e.preventDefault(); }
            else if (e.key === 'Enter') { this.verifier(); e.preventDefault(); }
        };
        document.addEventListener('keydown', this.surTouche);

        this.poser();
    }

    /** Une pyramide, sa saisie de départ, et le curseur sur la première ligne à trouver. */
    poser(neuve = false) {
        if (neuve) this.graine = `${this.graine}+`;
        this.p = creerPyramide({
            hauteur: this.hauteur, difficulte: this.difficulte,
            rng: makeRng(this.graine)
        });
        this.saisie = saisieInitiale(this.p);
        this.fini = false;
        this.fautes = null;
        this.vise = this.p.donnes.findIndex(d => !d);
        this.col = 0;
        this.dessiner();
        this.note('');
    }

    dessiner() {
        const p = this.p;
        this.tableEl.style.setProperty('--py-h', p.hauteur);
        this.tableEl.innerHTML = p.barreaux.map((b, i) => {
            const donne = p.donnes[i];
            const mot = this.saisie[i] || '';
            const classes = ['py-ligne'];
            if (i === this.vise && !donne) classes.push('py-ligne--vise');
            if (!donne && this.fautes && this.fautes.has(i)) classes.push('py-ligne--faux');
            if (!donne && mot && ligneJuste(p, i, this.saisie)) classes.push('py-ligne--juste');
            const cases = Array.from({ length: b.mot.length }, (_, c) => {
                const cl = ['py-case'];
                if (donne) cl.push('py-case--donne');
                else if (i === this.vise && c === this.col) cl.push('py-case--ici');
                return `<button type="button" class="${cl.join(' ')}"
                    data-l="${i}" data-c="${c}">${mot[c] || ''}</button>`;
            }).join('');
            return `<div class="${classes.join(' ')}">
                <div class="py-def">${b.def}</div>
                <div class="py-cases">${cases}</div></div>`;
        }).join('');
        this.tableEl.querySelectorAll('[data-l]').forEach(el => {
            el.onclick = () => this.viser(Number(el.dataset.l), Number(el.dataset.c));
        });
        this.dessinerRappel();
    }

    /**
     * LES LETTRES DE LA LIGNE DU DESSUS, REMÉLANGÉES — et le compte de celles
     * qui restent à poser. C'est la traduction visuelle de la règle : on ne
     * cherche pas un mot, on cherche un ARRANGEMENT de lettres connues, plus
     * une inconnue.
     */
    dessinerRappel() {
        const i = this.vise;
        if (this.fini || i <= 0 || i >= this.p.barreaux.length) {
            this.rappelEl.innerHTML = this.fini
                ? ''
                : '<i>Commence par le haut : la première ligne ne tient qu\'en une lettre.</i>';
            return;
        }
        const dessus = this.p.barreaux[i - 1].mot;
        // Mélangées pour de bon : dans l'ordre du mot, elles souffleraient une
        // solution qui n'en est presque jamais une.
        const melange = dessus.split('').sort();
        this.rappelEl.innerHTML = '<i>Reprends ces lettres&nbsp;:</i>'
            + melange.map(l => `<b>${l}</b>`).join('')
            + `<i>+ 1 nouvelle = ${dessus.length + 1} lettres.</i>`;
    }

    viser(ligne, col) {
        if (this.isDemo || this.fini || this.p.donnes[ligne]) return;
        this.vise = ligne;
        this.col = col;
        this.fautes = null;
        this.dessiner();
    }

    taper(lettre) {
        if (this.isDemo || this.fini) return;
        const i = this.vise;
        if (i < 0 || this.p.donnes[i]) return;
        const n = this.p.barreaux[i].mot.length;
        const cases = (this.saisie[i] || '').padEnd(n, ' ').slice(0, n).split('');
        if (lettre === 'eff') {
            // Effacer recule d'abord, comme un vrai retour arrière : sinon on
            // efface une case déjà vide et rien ne bouge.
            if (cases[this.col] === ' ' && this.col > 0) this.col--;
            cases[this.col] = ' ';
        } else {
            cases[this.col] = lettre;
            if (this.col < n - 1) this.col++;
        }
        this.saisie[i] = cases.join('').trimEnd();
        this.fautes = null;

        if (ligneJuste(this.p, i, this.saisie)) {
            const suivante = this.p.donnes.findIndex((d, k) => k > i && !d);
            this.note(`✅ ${this.p.barreaux[i].mot}. `
                + (suivante >= 0 ? 'Ligne suivante.' : ''), 'ok');
            if (suivante >= 0) { this.vise = suivante; this.col = 0; }
        }
        this.dessiner();
        if (estResoluePyramide(this.p, this.saisie)) this.gagner();
    }

    /**
     * L'INDICE DE CE JEU, ET IL N'Y EN A PAS D'AUTRE : la lettre qui arrive.
     * Elle ne donne pas le mot — il reste à trouver l'arrangement —, mais elle
     * débloque toujours, parce que c'est exactement l'inconnue.
     *
     * Au deuxième appel sur la même ligne, on rend le mot : un élève bloqué sur
     * un mot qu'il ne connaît pas ne le trouvera pas en cherchant plus fort, et
     * la pyramide entière s'arrête là.
     */
    aider() {
        if (this.isDemo || this.fini) return;
        const i = this.vise;
        if (i < 0) return;
        this.aides++;
        this.lettreDite = this.lettreDite || new Set();
        const attendu = this.p.barreaux[i].mot;
        if (i > 0 && !this.lettreDite.has(i)) {
            this.lettreDite.add(i);
            const l = lettreAjoutee(this.p.barreaux[i - 1].mot, attendu);
            this.note(`Cette ligne gagne un <b>${l}</b>. Les autres lettres sont celles du dessus, `
                + 'remélangées.');
            return;
        }
        this.saisie[i] = attendu;
        this.soufflees = (this.soufflees || 0) + 1;
        const suivante = this.p.donnes.findIndex((d, k) => k > i && !d);
        if (suivante >= 0) { this.vise = suivante; this.col = 0; }
        this.dessiner();
        this.note(`C'était <b>${attendu}</b> — ${this.p.barreaux[i].def.toLowerCase()}`);
        if (estResoluePyramide(this.p, this.saisie)) this.gagner();
    }

    verifier() {
        if (this.isDemo || this.fini) return;
        this.verifs++;
        const faux = this.p.barreaux
            .map((_, i) => i)
            .filter(i => !this.p.donnes[i] && (this.saisie[i] || '') && !ligneJuste(this.p, i, this.saisie));
        this.fautes = new Set(faux);
        this.dessiner();
        if (estResoluePyramide(this.p, this.saisie)) return this.gagner();
        if (!faux.length) {
            const reste = this.p.barreaux.filter((_, i) => !this.p.donnes[i] && !this.saisie[i]).length;
            this.note(`Rien de faux — il reste ${reste} ligne${reste > 1 ? 's' : ''} à trouver.`, 'ok');
            return;
        }
        // On ne montre que la PREMIÈRE ligne fautive : c'est elle qui bloque la
        // suite, et corriger la cinquième quand la troisième est fausse ne sert
        // à rien.
        const i = faux[0];
        const ecrit = this.saisie[i];
        const attendu = this.p.barreaux[i].mot;
        const dessus = i > 0 ? this.p.barreaux[i - 1].mot : '';
        const memesLettres = ecrit.split('').sort().join('') === attendu.split('').sort().join('');
        if (memesLettres) {
            this.note(`Ligne ${i + 1} : tu as les BONNES LETTRES, mais pas dans le bon ordre.`, 'ko');
        } else if (dessus && ecrit.length === attendu.length) {
            this.note(`Ligne ${i + 1} : ce mot ne reprend pas toutes les lettres de ${dessus}.`, 'ko');
        } else {
            this.note(`Ligne ${i + 1} : il faut ${attendu.length} lettres.`, 'ko');
        }
    }

    gagner() {
        if (this.fini) return;
        this.fini = true;
        this.vise = -1;
        this.fautes = null;
        this.dessiner();
        const q = qualitePyramide(this.p);
        this.note(`🏆 Pyramide complète : ${q.mots.join(' → ')}.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Pyramide de ${q.hauteur} lignes (${q.mots[q.mots.length - 1]})`,
            expected: q.mots.join(' → '), given: q.mots.join(' → '),
            points: Math.max(10, 15 + q.aTrouver * 8 - this.aides * 4 - this.verifs * 2)
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'py-note' + (ton ? ` py-note--${ton}` : '');
    }

    /**
     * Le robot montre LE GESTE, qui n'est pas de deviner un mot : c'est
     * d'écrire les lettres du dessus EN DÉSORDRE et de chercher où la nouvelle
     * se glisse. Tant qu'on relit le mot précédent dans l'ordre, on ne voit
     * rien.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.p) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        const i = this.p.donnes.findIndex(d => !d);
        if (i < 1) return fin();
        const dessus = this.p.barreaux[i - 1].mot;
        const attendu = this.p.barreaux[i].mot;
        const neuve = lettreAjoutee(dessus, attendu);

        cur.say(`La ligne du dessus dit ${dessus}. La suivante a UNE lettre de plus — `
            + 'et les autres peuvent être remélangées.', this.tableEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say(`Alors je n'essaie pas de coller une lettre à ${dessus}. J'écris ses lettres `
            + `en désordre : ${dessus.split('').sort().join(' ')}.`, this.rappelEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say(`La définition dit « ${this.p.barreaux[i].def} ». Avec ces lettres et un `
            + `${neuve} de plus… ça fait ${attendu}.`, this.tableEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        this.saisie[i] = attendu;
        this.vise = i;
        this.dessiner();
        cur.say('Et c\'est cela qu\'on refait à chaque marche : on ne cherche pas un mot, '
            + 'on cherche un ARRANGEMENT.', this.tableEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }
}

export function enginePyramide(container, isDemo, params) {
    const game = new Pyramide(container, isDemo, params);
    game.start();
    return game;
}
