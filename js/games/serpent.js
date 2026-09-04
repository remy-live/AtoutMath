// LE SERPENT LITTÉRAL — l'écran.
//
// Une grille, un serpent dont chaque anneau porte un terme, et l'expression
// écrite en grand au-dessus. Toute la règle vit dans `core/serpent.js`, testée
// sans navigateur ; ce fichier dessine et écoute les touches.
//
// TROIS DÉCISIONS, ET ELLES SONT PÉDAGOGIQUES.
//
// ① L'EXPRESSION EST ÉCRITE EN GRAND, EN PERMANENCE. Sans elle, on jouerait à
//    un serpent coloré : c'est la ligne d'algèbre qui fait de ce jeu un
//    exercice. Elle change à chaque bouchée, dans l'ordre des anneaux — jamais
//    rangée par degrés, ce qui ferait le travail à la place de l'élève.
//
// ② CHAQUE FAMILLE A SA COULEUR, et c'est la seule aide donnée. Deux anneaux de
//    même couleur fusionneront s'ils deviennent voisins ; l'élève voit donc ce
//    qu'il POURRAIT regrouper sans qu'on lui dise comment. Retirer la couleur
//    rendrait le jeu illisible à la vitesse où il se joue ; ajouter une flèche
//    « va par là » le rendrait inutile.
//
// ③ ON NE DIT JAMAIS « FAUX ». Ramasser un terme qui ne se regroupe avec rien
//    est un choix légitime — parfois le seul possible. Il coûte un anneau, et
//    l'anneau se voit. La sanction est dans la mécanique, pas dans un message.
//
// LE CLAVIER ET LE DOIGT MÈNENT LE MÊME SERPENT. Les flèches, ZQSD et WASD (un
// clavier de salle informatique n'est pas toujours en AZERTY), et le glissé sur
// le terrain — le jeu se joue autant sur une tablette que sur un poste.

import { BaseGame } from '../core/BaseGame.js';
import {
    NIVEAUX, CONSIGNE, EXPOSANTS,
    nouvellePartie, avancer, expression, texteTerme, longueurIdeale
} from '../core/serpent.js';
import { makeRng } from '../core/ids.js';

const COMPETENCE = 'num.litteral.reduire';

/** Une couleur par famille : c'est le seul indice, et il suffit. */
const COULEURS = ['#8a6414', '#3d6fd0', '#2f8f5b', '#a03a8f'];
const CLAIRES = ['#f0d9a4', '#c8d9f6', '#bfe6d2', '#eecbe6'];

const TOUCHES = {
    ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite',
    z: 'haut', s: 'bas', q: 'gauche', d: 'droite',
    w: 'haut', a: 'gauche'
};

export class Serpent extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'serpent');
        this.rng = makeRng(this.params.graine);
        const depuis = Math.max(0, Math.min(NIVEAUX.length - 1, (this.params.depuis | 0)));
        this.rang = depuis;
        this.vies = Math.max(1, this.params.vies | 0 || 3);
        this.fini = false;
        this.enAttente = true;      // on ne démarre qu'au premier geste du joueur
        this.charger();
    }

    charger() {
        this.etat = nouvellePartie(this.rng, this.rang);
        this.ideal = longueurIdeale(this.etat.graines);
        this.enAttente = true;
        this.sensVoulu = null;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .sp-wrap {
                    display: flex; flex-direction: column; gap: 6px; width: 100%; height: 100%;
                    padding: 8px 10px 10px; box-sizing: border-box; color: var(--text-main);
                    min-height: 0; container-type: inline-size;
                }
                .sp-consigne {
                    text-align: center; color: var(--text-muted); flex: 0 0 auto;
                    font-size: clamp(10px, 2.1cqw, 13px); line-height: 1.3;
                    max-width: 620px; margin: 0 auto;
                }
                /* LA LIGNE D'ALGÈBRE : c'est elle qui fait l'exercice, et elle
                   était le plus petit texte de l'écran sur un téléphone —
                   16 px mesurés, pour la seule chose qu'on veut faire lire. Le
                   plancher passe à 22 px : c'est le titre de la partie. */
                .sp-expr {
                    text-align: center; font-weight: 800; flex: 0 0 auto;
                    font-size: clamp(22px, 6.4cqw, 32px); min-height: 1.25em;
                    font-variant-numeric: tabular-nums; letter-spacing: .4px;
                    line-height: 1.15;
                }
                .sp-bandeau {
                    display: flex; gap: 6px 14px; justify-content: center; flex: 0 0 auto;
                    flex-wrap: wrap; font-size: clamp(11px, 2.4cqw, 13px);
                    color: var(--text-muted);
                }
                .sp-bandeau b { color: var(--text-main); }
                /* LE CORPS : terrain et croix. En portrait ils s'empilent, en
                   téléphone couché ils se mettent côte à côte — sinon la croix
                   sort de l'écran et le jeu redevient injouable. */
                .sp-corps {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    flex: 1 1 auto; min-height: 0; width: 100%;
                }
                .sp-scene {
                    flex: 1 1 auto; min-height: 0; min-width: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                }
                .sp-svg {
                    display: block; touch-action: none;
                    height: 100%; width: auto; max-width: 100%; max-height: 100%;
                }
                /* LA CROIX DIRECTIONNELLE, ET ELLE N'EST PAS OPTIONNELLE.
                   Sur un téléphone il n'y avait RIEN pour jouer : pas de
                   flèches, et le glissé ne s'annonçait nulle part. Elle prend
                   au passage la place blanche que le terrain laissait sous lui.
                   Sur grand écran elle reste, en retrait : le clavier suffit,
                   mais la souris doit pouvoir jouer aussi. */
                .sp-croix {
                    display: grid; grid-template-columns: repeat(3, 52px);
                    grid-template-rows: repeat(3, 44px); gap: 4px; flex: 0 0 auto;
                }
                .sp-fleche {
                    border: 0; border-radius: 11px; cursor: pointer; font-size: 1.25rem;
                    background: color-mix(in srgb, var(--text-main) 12%, var(--bg-panel, #fff));
                    color: var(--text-main); font-weight: 900; font-family: inherit;
                    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
                }
                .sp-fleche:active { background: var(--primary); color: #fff; scale: .93; }
                @container (min-width: 760px) { .sp-croix { opacity: .5; } }

                /* TÉLÉPHONE COUCHÉ : LA CONTRAINTE EST LA HAUTEUR, PAS LA
                   LARGEUR — et c'est ce que la première version avait manqué.
                   Elle masquait la consigne sous 400 px de LARGE ; en paysage
                   l'écran est large, la consigne s'affichait donc sur deux
                   lignes et mangeait la hauteur qui restait au terrain, qui
                   tombait à 210 px de côté. Mesuré, et injouable.
                   On bascule ici en grille : le terrain prend toute la hauteur
                   d'un côté, l'expression, le bandeau, la croix et la note se
                   rangent en colonne de l'autre. « display: contents » sur le
                   corps laisse ses deux enfants rejoindre cette grille. */
                @media (max-height: 560px) {
                    .sp-consigne { display: none; }
                    .sp-wrap {
                        display: grid; gap: 4px 12px; align-items: center;
                        grid-template-columns: minmax(0, 1fr) auto;
                        grid-template-rows: auto auto 1fr auto;
                        grid-template-areas:
                            "scene expr"
                            "scene bandeau"
                            "scene croix"
                            "scene note";
                    }
                    .sp-corps { display: contents; }
                    .sp-scene { grid-area: scene; height: 100%; }
                    .sp-expr { grid-area: expr; font-size: clamp(18px, 3.2cqw, 28px); }
                    .sp-bandeau { grid-area: bandeau; }
                    .sp-croix {
                        grid-area: croix; justify-self: center; align-self: center;
                        grid-template-columns: repeat(3, 46px); grid-template-rows: repeat(3, 38px);
                    }
                    .sp-note { grid-area: note; min-height: 1.3em; font-size: 11px; }
                }
                .sp-fond { fill: var(--card-bg, #fff); stroke: var(--border-color, #d7dae3); stroke-width: .04; }
                .sp-quadrillage { stroke: var(--border-color, #d7dae3); stroke-width: .015; opacity: .55; }
                .sp-anneau { stroke: #fff; stroke-width: .05; }
                .sp-tete { stroke: var(--text-main); stroke-width: .09; }
                .sp-graine { stroke-width: .04; }
                .sp-txt {
                    text-anchor: middle; dominant-baseline: central; font-weight: 800;
                    pointer-events: none;
                }
                .sp-note {
                    text-align: center; min-height: 2.3em; flex: 0 0 auto;
                    font-size: clamp(10px, 2.1cqw, 13px); line-height: 1.3;
                }
                .sp-note--ok { color: var(--success, #2e7d32); }
                .sp-note--ko { color: var(--danger, #c0392b); }
                .sp-note--bravo { color: var(--success, #2e7d32); font-weight: 700; }
                @container (max-width: 400px) { .sp-consigne { display: none; } }
            </style>
            <div class="sp-wrap">
                <p class="sp-consigne">${CONSIGNE}</p>
                <div class="sp-expr" data-expr></div>
                <div class="sp-bandeau" data-bandeau></div>
                <div class="sp-corps">
                    <div class="sp-scene" data-scene></div>
                    <div class="sp-croix" role="group" aria-label="Diriger le serpent">
                        <span></span>
                        <button type="button" class="sp-fleche" data-dir="haut" aria-label="Haut">▲</button>
                        <span></span>
                        <button type="button" class="sp-fleche" data-dir="gauche" aria-label="Gauche">◀</button>
                        <span></span>
                        <button type="button" class="sp-fleche" data-dir="droite" aria-label="Droite">▶</button>
                        <span></span>
                        <button type="button" class="sp-fleche" data-dir="bas" aria-label="Bas">▼</button>
                        <span></span>
                    </div>
                </div>
                <div class="sp-note" data-note></div>
            </div>`;
        this.exprEl = this.container.querySelector('[data-expr]');
        this.bandeauEl = this.container.querySelector('[data-bandeau]');
        this.sceneEl = this.container.querySelector('[data-scene]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.brancher();
        this.dessiner();
        this.note('Touche une flèche pour lancer le serpent.');
    }

    brancher() {
        if (this.isDemo) return;
        this.surTouche = (e) => {
            const s = TOUCHES[e.key] || TOUCHES[(e.key || '').toLowerCase()];
            if (!s) return;
            e.preventDefault();
            this.sensVoulu = s;
            this.demarrer();
        };
        window.addEventListener('keydown', this.surTouche, { passive: false });

        // LA CROIX. `pointerdown` et non `click` : sur un serpent qui avance
        // toutes les 340 ms, attendre le relâchement du doigt fait manquer le
        // pas — le virage part un tour trop tard, et l'on meurt en croyant
        // avoir tourné.
        this.container.querySelectorAll('[data-dir]').forEach(b => {
            b.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.sensVoulu = b.dataset.dir;
                this.demarrer();
            });
        });

        // LE GLISSÉ : on lit la direction dominante, comme sur le Peintre.
        let dep = null;
        this.sceneEl.addEventListener('pointerdown', (e) => { dep = [e.clientX, e.clientY]; });
        this.sceneEl.addEventListener('pointerup', (e) => {
            if (!dep) return;
            const dx = e.clientX - dep[0], dy = e.clientY - dep[1];
            dep = null;
            if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
            this.sensVoulu = Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut');
            this.demarrer();
        });
    }

    demarrer() {
        if (!this.enAttente || this.fini) return;
        this.enAttente = false;
        this.note('');
        this.boucle();
    }

    boucle() {
        clearTimeout(this.minuteur);
        if (this.fini || this.enAttente || !this.isRunning) return;
        this.minuteur = setTimeout(() => {
            const r = avancer(this.etat, this.sensVoulu);
            this.sensVoulu = null;
            this.etat = r.etat;
            if (r.dit) this.note(r.dit, r.quoi === 'mur' || r.quoi === 'mordu' ? 'ko'
                : r.quoi === 'annule' ? 'bravo' : r.quoi === 'fusion' ? 'ok' : '');
            this.dessiner();
            if (this.etat.fini) return this.terminer(this.etat.fini);
            this.boucle();
        }, this.etat.niv.vitesse);
    }

    destroy() {
        clearTimeout(this.minuteur);
        if (this.surTouche) window.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }

    dessiner() {
        const e = this.etat, niv = e.niv;
        const teinte = (t, claire) => (claire ? CLAIRES : COULEURS)[t.e] || COULEURS[0];
        const taille = 1;

        let out = `<rect class="sp-fond" x="0" y="0" width="${niv.large}" height="${niv.haut}" rx=".2"/>`;
        for (let x = 1; x < niv.large; x++) {
            out += `<line class="sp-quadrillage" x1="${x}" y1="0" x2="${x}" y2="${niv.haut}"/>`;
        }
        for (let y = 1; y < niv.haut; y++) {
            out += `<line class="sp-quadrillage" x1="0" y1="${y}" x2="${niv.large}" y2="${y}"/>`;
        }

        // Les termes à ramasser : pastilles claires, cerclées de leur famille.
        e.graines.forEach(g => {
            out += `<circle class="sp-graine" cx="${g.x + .5}" cy="${g.y + .5}" r=".38"
                fill="${teinte(g.t, true)}" stroke="${teinte(g.t)}"/>
                <text class="sp-txt" x="${g.x + .5}" y="${g.y + .52}" font-size=".34"
                    fill="${teinte(g.t)}">${texteTerme(g.t)}</text>`;
        });

        // Le serpent : la tête cerclée, chaque anneau à la couleur de sa famille.
        e.cases.forEach(([x, y], i) => {
            const t = e.corps[i] || e.corps[e.corps.length - 1] || { c: 0, e: 0 };
            const tete = i === 0 ? ' sp-tete' : '';
            out += `<rect class="sp-anneau${tete}" x="${x + .04}" y="${y + .04}"
                width="${taille - .08}" height="${taille - .08}" rx=".18"
                fill="${teinte(t)}"/>
                <text class="sp-txt" x="${x + .5}" y="${y + .52}" font-size=".3"
                    fill="#fff">${texteTerme(t)}</text>`;
        });

        this.sceneEl.innerHTML = `<svg class="sp-svg" viewBox="-.1 -.1 ${niv.large + .2} ${niv.haut + .2}"
            preserveAspectRatio="xMidYMid meet">${out}</svg>`;

        this.exprEl.textContent = expression(e.corps);
        const long = e.corps.length;
        this.bandeauEl.innerHTML = `<span>${niv.titre}</span>`
            + `<span>anneaux <b>${long}</b> / idéal ${this.ideal}</span>`
            + `<span>reste <b>${e.graines.length}</b></span>`
            + `<span>vies <b>${this.vies}</b></span>`;
    }

    terminer(comment) {
        clearTimeout(this.minuteur);
        if (comment === 'gagne') return this.gagne();
        // Perdre coûte une vie et rejoue LE MÊME niveau : recommencer ailleurs
        // punirait sans laisser retenter le rangement qu'on vient de rater.
        this.vies -= 1;
        if (this.vies <= 0) {
            this.fini = true;
            return this.terminerPartie({
                gagne: false, concept: COMPETENCE,
                quoi: 'Regrouper les termes semblables',
                obtenu: `niveau ${this.rang + 1} sur ${NIVEAUX.length}`,
                conseil: 'Ramasse les termes semblables À LA SUITE : c\'est ce qui '
                    + 'raccourcit le serpent.'
            });
        }
        setTimeout(() => {
            if (!this.isRunning) return;
            this.charger();
            this.dessiner();
            this.note(`Il te reste ${this.vies} vie${this.vies > 1 ? 's' : ''}. `
                + 'Une flèche pour repartir.');
        }, 1500);
    }

    gagne() {
        const long = this.etat.corps.length;
        const parfait = long <= this.ideal;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Serpent littéral — ${this.etat.niv.titre}`,
            expected: `${this.ideal} anneaux`, given: `${long} anneaux`,
            points: parfait ? 12 : 8, partiel: true
        });
        this.note(parfait
            ? `Terrain nettoyé en ${long} anneau${long > 1 ? 'x' : ''} — le minimum. `
                + `Tu as tout regroupé : ${expression(this.etat.corps)}.`
            : `Terrain nettoyé, mais ${long} anneaux au lieu de ${this.ideal} : `
                + 'des termes semblables sont restés séparés.', 'bravo');

        if (this.rang + 1 >= NIVEAUX.length) {
            this.fini = true;
            return this.terminerPartie({
                gagne: true, concept: COMPETENCE,
                quoi: 'Regrouper les termes semblables',
                obtenu: `${NIVEAUX.length} terrains`, points: 25
            });
        }
        setTimeout(() => {
            if (!this.isRunning) return;
            this.rang += 1;
            this.charger();
            this.dessiner();
            this.note(`${this.etat.niv.titre}. Une flèche pour repartir.`);
        }, 2200);
    }

    note(texte, ton) {
        if (!this.noteEl) return;
        this.noteEl.textContent = texte || '';
        this.noteEl.className = 'sp-note' + (ton ? ` sp-note--${ton}` : '');
    }

    /** Le robot joue tout droit puis tourne : on montre la règle, pas l'adresse. */
    async runDemoSequence() {
        const sens = ['droite', 'bas', 'gauche', 'haut'];
        let i = 0;
        for (let pas = 0; pas < 60 && this.isRunning && !this.etat.fini; pas++) {
            await new Promise(ok => setTimeout(ok, 320));
            if (this.gelDemo) await new Promise(ok => setTimeout(ok, 500));
            // On vise la graine la plus proche, sans chercher le chemin optimal.
            const [hx, hy] = this.etat.cases[0];
            const g = this.etat.graines
                .map(x => ({ x, d: Math.abs(x.x - hx) + Math.abs(x.y - hy) }))
                .sort((a, b) => a.d - b.d)[0];
            let voulu = sens[i % 4];
            if (g) {
                voulu = Math.abs(g.x.x - hx) > 0
                    ? (g.x.x > hx ? 'droite' : 'gauche')
                    : (g.x.y > hy ? 'bas' : 'haut');
            }
            const r = avancer(this.etat, voulu);
            if (r.etat.fini) { i += 1; this.etat = { ...r.etat, fini: null }; }
            else this.etat = r.etat;
            if (r.dit) this.note(r.dit);
            this.dessiner();
        }
    }

    /**
     * LA BARRE D'AUTEUR : la première pression vide le terrain courant, la
     * seconde passe au niveau suivant. Le meneur appelle `sauterEtape`.
     */
    sauterEtape() {
        if (this.fini) return false;
        clearTimeout(this.minuteur);
        if (this.etat.graines.length) {
            this.etat = { ...this.etat, graines: [] };
            this.enAttente = true;
            this.note('Terrain vidé.', 'info');
            this.dessiner();
            return true;
        }
        if (this.rang + 1 >= NIVEAUX.length) return false;
        this.rang += 1;
        this.charger();
        this.note('');
        this.dessiner();
        return true;
    }

    /** Pendant du saut : on resème le terrain, puis on recule d'un niveau. */
    revenirEtape() {
        if (this.isDemo || this.fini) return false;
        clearTimeout(this.minuteur);
        if (this.etat.mange || !this.etat.graines.length) {
            this.charger();
            this.note('');
            this.dessiner();
            return true;
        }
        if (this.rang <= 0) return false;
        this.rang -= 1;
        this.charger();
        this.dessiner();
        return true;
    }

    planEtapes() {
        return { courante: this.rang, liste: NIVEAUX.map(n => n.titre) };
    }
}

export function engineSerpent(container, isDemo, params) {
    const jeu = new Serpent(container, isDemo, params);
    jeu.start();
    return jeu;
}

export const couleurs = COULEURS;
export const exposants = EXPOSANTS;
