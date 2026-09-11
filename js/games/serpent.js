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

    /** Les proportions de la place où le terrain va se dessiner. */
    rapportDeLaScene() {
        if (!this.sceneEl) return null;
        const b = this.sceneEl.getBoundingClientRect();
        if (!b.width || !b.height) return null;
        return b.width / b.height;
    }

    charger() {
        this.etat = nouvellePartie(this.rng, this.rang, this.rapportDeLaScene());
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
                /* Le terrain épouse maintenant les proportions de la scène
                   (voir « formePourEcran »), donc il peut la remplir sans se
                   déformer : la grille n'est plus carrée sur un écran qui ne
                   l'est pas. */
                .sp-svg { display: block; touch-action: none; width: 100%; height: 100%; }
                /* LE DOIGT VISE, ET ON LE MONTRE. Une petite cible suit le
                   doigt sur le terrain : sans elle, rien ne dirait que
                   l'écran écoute — c'était le défaut de la première version,
                   où le glissé marchait sans s'annoncer. La croix
                   directionnelle a disparu avec cette version ; le terrain,
                   lui, récupère toute sa place. */
                .sp-cible {
                    fill: none; stroke: var(--primary, #4a6fd4); stroke-width: .06;
                    opacity: .55; pointer-events: none;
                }

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
                        /* LA COLONNE DE DROITE SE TIENT. En « auto » elle
                           prenait la largeur de la plus longue ligne du
                           bandeau, et le terrain tombait à 172 px de large —
                           mesuré, et pire que ce qu'on venait de corriger. */
                        grid-template-columns: minmax(0, 1fr) clamp(120px, 30%, 260px);
                        grid-template-rows: auto auto 1fr;
                        grid-template-areas:
                            "scene expr"
                            "scene bandeau"
                            "scene note";
                    }
                    .sp-corps { display: contents; }
                    .sp-scene { grid-area: scene; height: 100%; }
                    .sp-expr { grid-area: expr; font-size: clamp(18px, 3.2cqw, 28px); }
                    .sp-bandeau { grid-area: bandeau; }
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
                </div>
                <div class="sp-note" data-note></div>
            </div>`;
        this.exprEl = this.container.querySelector('[data-expr]');
        this.bandeauEl = this.container.querySelector('[data-bandeau]');
        this.sceneEl = this.container.querySelector('[data-scene]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.brancher();
        // LE CONSTRUCTEUR NE CONNAÎT PAS ENCORE LA TAILLE DE LA SCÈNE : le
        // premier terrain est donc carré. Maintenant qu'il y a un écran, on le
        // refait à la bonne forme — avant que le joueur ait vu quoi que ce soit.
        this.charger();
        this.dessiner();
        this.note('Pose ton doigt sur le terrain, là où tu veux aller — le serpent y va. Au clavier : les flèches.');
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

        // LE DOIGT EST LE GOUVERNAIL, ET NON QUATRE BOUTONS.
        //
        // Rémy : « au tactile ça suit le doigt, je pense que c'est mieux ». Il
        // a raison, et la croix directionnelle disparaît avec cette version.
        // Une croix demande de viser un bouton pendant qu'on regarde le
        // serpent — deux endroits pour les yeux, sur un écran où il n'y a
        // déjà pas de place. Ici on pose le doigt SUR LE TERRAIN, à l'endroit
        // où l'on veut aller, et le serpent s'y dirige ; on le fait glisser et
        // il suit. Le terrain récupère au passage la place que la croix
        // prenait, ce qui était mon souci en paysage.
        //
        // ON LIT L'AXE DOMINANT, pas l'angle exact : un serpent ne va que dans
        // quatre directions, et lui en proposer une cinquième ne ferait
        // qu'inventer un virage que le joueur n'a pas demandé.
        const viser = (e) => {
            const svg = this.sceneEl.querySelector('svg');
            if (!svg) return;
            const b = svg.getBoundingClientRect();
            const niv = this.etat.niv;
            const cote = b.width / (niv.large + .2);
            const doigtX = (e.clientX - b.left) / cote - .1;
            const doigtY = (e.clientY - b.top) / cote - .1;
            const [hx, hy] = this.tetePeinte();
            const dx = doigtX - (hx + .5), dy = doigtY - (hy + .5);
            // UNE ZONE MORTE AUTOUR DE LA TÊTE. Sans elle, un doigt posé juste
            // sur le serpent fait osciller la consigne à chaque frémissement.
            if (Math.abs(dx) < .6 && Math.abs(dy) < .6) return;
            this.sensVoulu = Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut');
            this.cible = [doigtX, doigtY];
            this.demarrer();
        };
        this.sceneEl.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.sceneEl.setPointerCapture?.(e.pointerId);
            this.mene = true;
            viser(e);
        });
        this.sceneEl.addEventListener('pointermove', (e) => { if (this.mene) viser(e); });
        const lacher = () => { this.mene = false; this.cible = null; };
        this.sceneEl.addEventListener('pointerup', lacher);
        this.sceneEl.addEventListener('pointercancel', lacher);
    }

    demarrer() {
        if (!this.enAttente || this.fini) return;
        this.enAttente = false;
        this.note('');
        this.precedent = this.etat.cases.map(c => [...c]);
        this.tDernierPas = performance.now();
        this.boucle();
    }

    /**
     * LA BOUCLE EST DÉSORMAIS CELLE DE L'ÉCRAN, PAS CELLE DU JEU.
     *
     * Rémy : « je vois bien que le serpent c'est carreau par carreau mais ça ne
     * fait pas fluide du tout ». C'était exact : on redessinait tout à chaque
     * pas logique, donc le serpent SAUTAIT d'une case à l'autre toutes les
     * 230 ms. Un vrai snake glisse.
     *
     * La règle du jeu, elle, reste discrète — et c'est volontaire : c'est
     * `core/serpent.js`, testé sans navigateur, et un serpent qui avancerait
     * en continu rendrait « deux anneaux voisins » impossible à définir. On
     * sépare donc les deux horloges. Le NOYAU avance case par case ; l'ÉCRAN
     * interpole entre la position d'avant et celle d'après, soixante fois par
     * seconde. Rien de la logique ne change, et tous ses tests tiennent.
     */
    boucle() {
        cancelAnimationFrame(this.image);
        if (this.fini || this.enAttente || !this.isRunning) return;
        const trame = (maintenant) => {
            if (this.fini || this.enAttente || !this.isRunning) return;
            const duree = this.etat.niv.vitesse;
            let avancement = (maintenant - this.tDernierPas) / duree;
            if (avancement >= 1) {
                this.precedent = this.etat.cases.map(c => [...c]);
                const r = avancer(this.etat, this.sensVoulu);
                this.sensVoulu = null;
                this.etat = r.etat;
                this.tDernierPas = maintenant;
                avancement = 0;
                if (r.dit) {
                    this.note(r.dit, r.quoi === 'mur' || r.quoi === 'mordu' ? 'ko'
                        : r.quoi === 'annule' ? 'bravo' : r.quoi === 'fusion' ? 'ok' : '');
                }
                this.dessiner();
                if (this.etat.fini) return this.terminer(this.etat.fini);
            }
            this.placer(avancement);
            this.image = requestAnimationFrame(trame);
        };
        this.image = requestAnimationFrame(trame);
    }

    destroy() {
        cancelAnimationFrame(this.image);
        if (this.surTouche) window.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }

    /** Où la tête est PEINTE en ce moment — le doigt vise le dessin, pas la grille. */
    tetePeinte() {
        const a = (this.precedent && this.precedent[0]) || this.etat.cases[0];
        const b = this.etat.cases[0];
        const t = this.dernierAvancement || 0;
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }

    /**
     * PLACER LES ANNEAUX ENTRE DEUX CASES.
     *
     * Un anneau qui vient d'apparaître — parce qu'on a mangé — n'a pas de
     * position précédente : on le fait SORTIR DE LA QUEUE, ce qui est
     * exactement ce qu'on voit quand un vrai serpent s'allonge. Sans cela il
     * surgirait d'un coup au milieu du terrain.
     */
    placer(t) {
        this.dernierAvancement = t;
        if (this.cibleEl) {
            if (this.mene && this.cible) {
                this.cibleEl.setAttribute('cx', this.cible[0].toFixed(2));
                this.cibleEl.setAttribute('cy', this.cible[1].toFixed(2));
                this.cibleEl.style.display = '';
            } else this.cibleEl.style.display = 'none';
        }
        if (!this.anneauxEl) return;
        const av = this.precedent || this.etat.cases;
        this.anneauxEl.forEach((g, i) => {
            const b = this.etat.cases[i];
            if (!b) return;
            const a = av[i] || av[av.length - 1] || b;
            const x = a[0] + (b[0] - a[0]) * t;
            const y = a[1] + (b[1] - a[1]) * t;
            g.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)})`);
        });
    }

    dessiner() {
        const e = this.etat, niv = e.niv;
        const teinte = (t, claire) => (claire ? CLAIRES : COULEURS)[t.e] || COULEURS[0];

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

        // LE SERPENT : un groupe par anneau, POSÉ À L'ORIGINE et déplacé par
        // une transformation. C'est ce qui permet à `placer` de le faire
        // glisser sans reconstruire le dessin soixante fois par seconde.
        e.cases.forEach((_, i) => {
            const t = e.corps[i] || e.corps[e.corps.length - 1] || { c: 0, e: 0 };
            const tete = i === 0 ? ' sp-tete' : '';
            out += `<g class="sp-groupe" data-anneau="${i}">
                <rect class="sp-anneau${tete}" x=".04" y=".04" width=".92" height=".92" rx=".18"
                    fill="${teinte(t)}"/>
                <text class="sp-txt" x=".5" y=".52" font-size=".3" fill="#fff">${texteTerme(t)}</text>
                </g>`;
        });

        // LA CIBLE DU DOIGT, dessinée en dernier pour rester au-dessus.
        out += `<circle class="sp-cible" data-cible cx="0" cy="0" r=".42" style="display:none"/>`;

        this.sceneEl.innerHTML = `<svg class="sp-svg" viewBox="-.1 -.1 ${niv.large + .2} ${niv.haut + .2}"
            preserveAspectRatio="xMidYMid meet">${out}</svg>`;
        this.anneauxEl = [...this.sceneEl.querySelectorAll('[data-anneau]')];
        this.cibleEl = this.sceneEl.querySelector('[data-cible]');
        this.placer(this.dernierAvancement || 0);

        this.exprEl.textContent = expression(e.corps);
        const long = e.corps.length;
        this.bandeauEl.innerHTML = `<span>${niv.titre}</span>`
            + `<span>anneaux <b>${long}</b> / idéal ${this.ideal}</span>`
            + `<span>reste <b>${e.graines.length}</b></span>`
            + `<span>vies <b>${this.vies}</b></span>`;
    }

    terminer(comment) {
        cancelAnimationFrame(this.image);
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
        cancelAnimationFrame(this.image);
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
        cancelAnimationFrame(this.image);
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
