// LE PATRON DU CUBE — l'écran.
//
// La figure à plat, deux boutons, et le pliage qui tranche. Toute la géométrie
// vit dans `core/patrons.js`, testée sans navigateur ; ce fichier dessine.
//
// LE PLIAGE EST LA RÉCOMPENSE, ET IL VIENT APRÈS LA RÉPONSE. C'est l'ordre qui
// compte : on demande d'abord de DÉCIDER, et l'on montre ensuite. Un bouton
// « plier » disponible avant la réponse ferait de l'exercice une manipulation
// sans enjeu — on plierait pour voir, puis on cocherait. Ici on s'engage, puis
// on regarde si l'on avait raison, ce qui est la même chose qu'une conjecture
// suivie d'une vérification.
//
// COMMENT ON MONTRE LE PLIAGE SANS TROIS DIMENSIONS. On ne construit pas un
// cube en perspective : on relève les cases dans l'ordre du parcours, chacune
// se colorant de la face qu'elle deviendra, et les paires opposées se
// répondent par leur couleur. Un vrai pliage 3D serait plus joli et dirait
// moins — ce qu'on veut faire voir, c'est QUELLE CASE DEVIENT QUELLE FACE, et
// c'est une information de coloriage, pas de volume.
//
// QUAND ÇA NE SE FERME PAS, ON MONTRE OÙ. Le noyau rend `doublons` : les cases
// qui reçoivent une face déjà prise. Ce sont elles qui se recouvrent, et les
// désigner vaut mieux que « ce n'est pas un patron » — l'élève voit alors
// pourquoi, et la fois d'après il cherche le recouvrement.

import { BaseGame } from '../core/BaseGame.js';
import {
    FAMILLES, ORDRE_FAMILLES, CONSIGNES,
    preparerSerie, plier, profil
} from '../core/patrons.js';
import { makeRng } from '../core/ids.js';

const COMPETENCE = 'geo.espace.patron';

/**
 * LES SIX COULEURS DES FACES, PAR PAIRES.
 *
 * Les opposées partagent une teinte et se distinguent par la clarté : c'est ce
 * qui rend la question « laquelle sera en face ? » lisible d'un coup d'œil une
 * fois le pliage montré. Choisies distinguables aussi en noir et blanc, parce
 * que la fiche s'imprime et qu'un daltonien lit le même écran que les autres.
 */
const TEINTES = [
    '#3d6fd0', '#a8c2f0',   // paire 0/1 — bleu
    '#2f8f5b', '#a9dcbe',   // paire 2/3 — vert
    '#c06a1f', '#f0cfa4'    // paire 4/5 — orange
];

const enTexte = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Patrons extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'patrons');
        const familles = Array.isArray(this.params.familles) && this.params.familles.length
            ? this.params.familles : ORDRE_FAMILLES;
        this.rng = makeRng(this.params.graine);
        this.serie = preparerSerie(this.rng, {
            familles,
            combien: Math.max(2, this.params.combien | 0 || 8)
        });
        this.rang = 0;
        this.plie = false;       // le pliage a-t-il été montré pour cette question ?
        this.fini = false;
    }

    get question() { return this.serie[this.rang]; }

    render() {
        this.container.innerHTML = `
            <style>
                .pa-wrap {
                    display: flex; flex-direction: column; gap: 8px; width: 100%; height: 100%;
                    padding: 8px 10px 10px; box-sizing: border-box; color: var(--text-main);
                    min-height: 0; container-type: inline-size;
                }
                .pa-consigne {
                    text-align: center; color: var(--text-muted); flex: 0 0 auto;
                    font-size: clamp(11px, 2.3cqw, 14px); line-height: 1.35;
                    max-width: 620px; margin: 0 auto;
                }
                .pa-consigne b { color: var(--text-main); }
                .pa-scene { flex: 1 1 auto; min-height: 0; display: block; width: 100%; }
                .pa-svg { width: 100%; height: 100%; display: block; }
                .pa-case {
                    stroke: var(--text-main); stroke-width: .09; fill: var(--card-bg, #fff);
                    transition: fill .35s ease, opacity .35s ease;
                }
                .pa-case--cliquable { cursor: pointer; }
                .pa-case--cliquable:hover { stroke-width: .16; }
                .pa-case--depart { stroke-width: .2; stroke: var(--primary, #4a6fd4); }
                .pa-case--double { stroke: var(--danger, #c0392b); stroke-width: .2; }
                .pa-case--choisie { stroke: var(--primary, #4a6fd4); stroke-width: .2; }
                .pa-marque {
                    text-anchor: middle; dominant-baseline: central; font-weight: 800;
                    font-size: .34px; pointer-events: none; fill: var(--text-main);
                }
                .pa-outils { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; flex: 0 0 auto; }
                .pa-btn {
                    border: 1.5px solid var(--border-color, #d7dae3); background: var(--card-bg, #fff);
                    color: var(--text-main); border-radius: 10px; padding: 7px 18px; cursor: pointer;
                    font-size: clamp(12px, 2.4cqw, 15px); font-weight: 700;
                }
                .pa-btn:hover:not(:disabled) { border-color: var(--primary); }
                .pa-btn:disabled { opacity: .4; cursor: default; }
                .pa-note {
                    text-align: center; min-height: 2.6em; flex: 0 0 auto;
                    font-size: clamp(11px, 2.2cqw, 13px); line-height: 1.35;
                }
                .pa-note--ok { color: var(--success, #2e7d32); }
                .pa-note--ko { color: var(--danger, #c0392b); }
                .pa-compte { text-align: center; color: var(--text-muted); font-size: 11px; flex: 0 0 auto; }
                @container (max-width: 400px) { .pa-consigne { display: none; } }
            </style>
            <div class="pa-wrap">
                <p class="pa-consigne" data-consigne></p>
                <div class="pa-scene" data-scene></div>
                <div class="pa-outils" data-outils></div>
                <div class="pa-note" data-note></div>
                <div class="pa-compte" data-compte></div>
            </div>`;
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.sceneEl = this.container.querySelector('[data-scene]');
        this.outilsEl = this.container.querySelector('[data-outils]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.compteEl = this.container.querySelector('[data-compte]');
        this.dessiner();
    }

    dessiner() {
        const q = this.question;
        if (!q) return;
        const { faces, doublons } = plier(q.forme);
        const doubles = new Set(doublons);
        const largeur = Math.max(...q.forme.map(c => c[0])) + 1;
        const hauteur = Math.max(...q.forme.map(c => c[1])) + 1;
        const M = 0.35;

        const cases = q.forme.map(([x, y]) => {
            const k = `${x},${y}`;
            const classes = ['pa-case'];
            if (q.famille === 'opposees' && !this.plie) classes.push('pa-case--cliquable');
            if (q.famille === 'opposees' && k === q.depart) classes.push('pa-case--depart');
            if (this.plie && q.famille === 'reconnaitre' && doubles.has(k)) classes.push('pa-case--double');
            if (this.choisie === k) classes.push('pa-case--choisie');
            // LA COULEUR N'APPARAÎT QU'APRÈS LE PLIAGE. Avant, elle donnerait la
            // réponse : deux cases de la même teinte se font face.
            const teinte = this.plie && !doubles.has(k) ? TEINTES[faces[k]] : '';
            const style = teinte ? ` style="fill:${teinte}"` : '';
            const marque = (q.famille === 'opposees' && k === q.depart) ? '★' : '';
            return `<g><rect class="${classes.join(' ')}" data-case="${k}"${style}
                x="${x}" y="${y}" width="1" height="1" rx=".05"/>
                ${marque ? `<text class="pa-marque" x="${x + 0.5}" y="${y + 0.5}">${marque}</text>` : ''}</g>`;
        }).join('');

        this.sceneEl.innerHTML = `<svg class="pa-svg"
            viewBox="${-M} ${-M} ${largeur + 2 * M} ${hauteur + 2 * M}"
            preserveAspectRatio="xMidYMid meet">${cases}</svg>`;

        this.consigneEl.innerHTML = enTexte(CONSIGNES[q.famille]);
        this.compteEl.textContent = `Figure ${this.rang + 1} sur ${this.serie.length}`
            + `  ·  bandes de ${q.profil}`;

        if (!this.isDemo && q.famille === 'opposees' && !this.plie) {
            this.sceneEl.querySelectorAll('[data-case]').forEach(r => {
                r.onclick = () => this.repondreOpposee(r.dataset.case);
            });
        }
        this.dessinerOutils();
    }

    dessinerOutils() {
        const q = this.question;
        if (q.famille === 'reconnaitre' && !this.plie) {
            this.outilsEl.innerHTML = `
                <button type="button" class="pa-btn" data-rep="oui">Oui, ça se plie en cube</button>
                <button type="button" class="pa-btn" data-rep="non">Non, ça ne se ferme pas</button>`;
        } else {
            this.outilsEl.innerHTML = '';
        }
        if (this.isDemo) {
            this.outilsEl.querySelectorAll('button').forEach(b => { b.disabled = true; });
            return;
        }
        this.outilsEl.querySelectorAll('[data-rep]').forEach(b => {
            b.onclick = () => this.repondreReconnaitre(b.dataset.rep === 'oui');
        });
    }

    /** « Est-ce un patron ? » — on tranche, PUIS on plie. */
    repondreReconnaitre(dit) {
        if (this.fini || this.plie || this.isDemo) return;
        const q = this.question;
        const juste = dit === q.reponse;
        this.plie = true;
        this.dessiner();

        if (juste) {
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Ce patron (bandes de ${q.profil}) se plie-t-il en cube ?`,
                expected: q.reponse ? 'oui' : 'non', given: dit ? 'oui' : 'non', points: 6
            });
            this.note(q.reponse
                ? 'Oui : les six faces tombent chacune à leur place. Les carrés de même '
                    + 'teinte se feront face.'
                : 'Non, et les carrés cerclés de rouge disent pourquoi : ils se '
                    + 'recouvrent une fois plié.', 'ok');
        } else {
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Ce patron (bandes de ${q.profil}) se plie-t-il en cube ?`,
                input: dit ? 'oui' : 'non', expected: q.reponse ? 'oui' : 'non',
                silencieux: true
            });
            this.note(q.reponse
                ? 'Il se ferme, pourtant : chaque teinte est prise une seule fois. '
                    + 'Regarde le pliage.'
                : 'Il ne se ferme pas : les carrés cerclés de rouge retombent sur une '
                    + 'face déjà occupée.', 'ko');
        }
        this.suivant();
    }

    /** « Quelle case sera en face ? » — un clic, et l'on montre le pliage. */
    repondreOpposee(k) {
        if (this.fini || this.plie || this.isDemo) return;
        const q = this.question;
        if (k === q.depart) {
            this.note('C\'est le carré de départ : cherche celui qui lui fera face.', 'ko');
            return;
        }
        this.choisie = k;
        this.plie = true;
        const juste = k === q.reponse;
        this.dessiner();

        if (juste) {
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Quel carré se retrouve en face du carré marqué ? (bandes de ${q.profil})`,
                expected: q.reponse, given: k, points: 8
            });
            this.note('Exactement : ces deux-là portent la même teinte, ils se font face.', 'ok');
        } else {
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Quel carré se retrouve en face du carré marqué ? (bandes de ${q.profil})`,
                input: k, expected: q.reponse, silencieux: true
            });
            this.note('Pas celui-là. Les deux carrés de même teinte sont ceux qui se '
                + 'font face : repère-les sur le pliage.', 'ko');
        }
        this.suivant();
    }

    suivant() {
        if (this.rang + 1 >= this.serie.length) {
            this.fini = true;
            return this.terminerPartie({
                gagne: true, concept: COMPETENCE,
                quoi: 'Reconnaître les patrons du cube',
                obtenu: `${this.serie.length} figures`, points: 20
            });
        }
        setTimeout(() => {
            if (!this.isRunning) return;
            this.rang += 1;
            this.plie = false;
            this.choisie = null;
            this.note('');
            this.dessiner();
        }, 2100);
    }

    note(texte, ton) {
        if (!this.noteEl) return;
        this.noteEl.textContent = texte || '';
        this.noteEl.className = 'pa-note' + (ton ? ` pa-note--${ton}` : '');
    }

    /** Le robot devine juste, et laisse le temps de regarder le pliage. */
    async runDemoSequence() {
        for (let i = 0; i < this.serie.length; i++) {
            if (!this.isRunning) return;
            this.rang = i;
            this.plie = false;
            this.choisie = null;
            this.dessiner();
            await new Promise(ok => setTimeout(ok, 1200));
            if (this.gelDemo) await new Promise(ok => setTimeout(ok, 700));
            const q = this.question;
            this.plie = true;
            if (q.famille === 'opposees') this.choisie = q.reponse;
            this.dessiner();
            this.note(q.famille === 'reconnaitre'
                ? (q.reponse ? 'Celui-ci se ferme.' : 'Celui-ci se recouvre : ce n\'est pas un patron.')
                : 'Les deux carrés de même teinte se font face.', q.reponse ? 'ok' : '');
            await new Promise(ok => setTimeout(ok, 1300));
        }
    }

    /**
     * LA BARRE D'AUTEUR AVANCE EN DEUX TEMPS : la première pression montre le
     * pliage de la figure affichée, la seconde passe à la suivante. Le meneur
     * appelle `sauterEtape` — pas `sauterQuestion`.
     */
    sauterEtape() {
        if (this.fini) return false;
        if (!this.plie) {
            this.plie = true;
            const q = this.question;
            if (q.famille === 'opposees') this.choisie = q.reponse;
            this.note(q.famille === 'reconnaitre'
                ? (q.reponse ? 'C\'est un patron.' : 'Ce n\'en est pas un.')
                : `La face opposée est ${q.reponse}.`, 'info');
            this.dessiner();
            return true;
        }
        if (this.rang + 1 >= this.serie.length) return false;
        this.rang += 1;
        this.plie = false;
        this.choisie = null;
        this.note('');
        this.dessiner();
        return true;
    }

    /** Pendant du saut : on replie la figure, puis on recule d'une question. */
    revenirEtape() {
        if (this.isDemo || this.fini) return false;
        if (this.plie) {
            this.plie = false;
            this.choisie = null;
            this.note('');
            this.dessiner();
            return true;
        }
        if (this.rang <= 0) return false;
        this.rang -= 1;
        this.dessiner();
        return true;
    }

    planEtapes() {
        return {
            courante: this.rang,
            liste: this.serie.map(q => (q.famille === 'reconnaitre' ? 'Plier ?' : 'En face ?')
                + ` ${q.profil}`)
        };
    }
}

export function enginePatrons(container, isDemo, params) {
    const jeu = new Patrons(container, isDemo, params);
    jeu.start();
    return jeu;
}

export const familles = FAMILLES;
export const teintes = TEINTES;
export const profilDe = profil;
