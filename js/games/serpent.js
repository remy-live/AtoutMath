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
    NIVEAUX, CONSIGNE, EXPOSANTS, RAYON_TETE, RAYON_TERME,
    nouvellePartie, avancer, expression, texteTerme, longueurIdeale, anneaux
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
        this.capVoulu = null;
        this.cible = null;
        this.bandeauFait = false;   // le bandeau se refait au changement de terrain
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
                    fill: none; stroke: var(--primary, #4a6fd4); stroke-width: .2;
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
                /* Plus de quadrillage : Rémy voulait « un peu plus libre », et
                   des lignes de case sur un terrain qui n'en a plus seraient un
                   mensonge de dessin. */
                .sp-anneau { stroke: #fff; stroke-width: .12; }
                .sp-tete { stroke: var(--text-main); stroke-width: .2; }
                .sp-oeil { fill: #fff; pointer-events: none; }
                .sp-graine { stroke-width: .12; }
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
        this.note('Pose ton doigt sur le terrain, là où tu veux aller — le serpent '
            + 'y va, en tournant comme il peut. Au clavier : les flèches.');
    }

    brancher() {
        if (this.isDemo) return;

        // LE CLAVIER DONNE UN CAP, PAS UNE CASE. Les quatre flèches valent
        // quatre angles, et le serpent y tourne à sa vitesse de virage : sur un
        // terrain sans grille, appuyer sur ↑ ne peut plus vouloir dire « saute
        // d'une case vers le haut », seulement « prends le nord ».
        const CAPS = { haut: -Math.PI / 2, bas: Math.PI / 2, gauche: Math.PI, droite: 0 };
        this.surTouche = (e) => {
            const s = TOUCHES[e.key] || TOUCHES[(e.key || '').toLowerCase()];
            if (!s) return;
            e.preventDefault();
            this.capVoulu = CAPS[s];
            this.cible = null;
            this.demarrer();
        };
        window.addEventListener('keydown', this.surTouche, { passive: false });

        // LE DOIGT DONNE L'ANGLE EXACT, ET C'EST LÀ QUE LA GRILLE MANQUAIT LE
        // MOINS. Avec des cases, on ne pouvait lire du doigt que l'axe
        // dominant — quatre directions sur les trois cent soixante degrés
        // qu'il désignait. Le serpent va maintenant PRÉCISÉMENT où l'on
        // montre, et les virages sont des courbes.
        const viser = (ev) => {
            const svg = this.sceneEl.querySelector('svg');
            if (!svg) return;
            const b = svg.getBoundingClientRect();
            const niv = this.etat.niv;
            const k = b.width / niv.large;
            const x = (ev.clientX - b.left) / k;
            const y = (ev.clientY - b.top) / k;
            const dx = x - this.etat.tete.x, dy = y - this.etat.tete.y;
            // Une zone morte autour de la tête : un doigt posé dessus ferait
            // osciller le cap à chaque frémissement.
            if (Math.hypot(dx, dy) < RAYON_TETE * 1.6) return;
            this.capVoulu = Math.atan2(dy, dx);
            this.cible = [x, y];
            this.demarrer();
        };
        this.sceneEl.addEventListener('pointerdown', (ev) => {
            ev.preventDefault();
            this.sceneEl.setPointerCapture?.(ev.pointerId);
            this.mene = true;
            viser(ev);
        });
        this.sceneEl.addEventListener('pointermove', (ev) => { if (this.mene) viser(ev); });
        const lacher = () => { this.mene = false; this.cible = null; };
        this.sceneEl.addEventListener('pointerup', lacher);
        this.sceneEl.addEventListener('pointercancel', lacher);
    }

    demarrer() {
        if (!this.enAttente || this.fini) return;
        this.enAttente = false;
        this.note('');
        this.tDerniere = performance.now();
        this.boucle();
    }

    /**
     * LA BOUCLE EST CELLE DE L'ÉCRAN, ET MAINTENANT AUSSI CELLE DU JEU.
     *
     * Avec la grille, il y avait deux horloges : le noyau avançait d'une case
     * toutes les 240 ms, l'écran interpolait entre les deux. Sans cases, la
     * position EST continue : une seule horloge suffit, et l'on passe au noyau
     * le temps réellement écoulé depuis l'image précédente. C'est plus simple
     * et plus juste — un écran à 120 Hz n'accélère plus le serpent.
     */
    boucle() {
        cancelAnimationFrame(this.image);
        if (this.fini || this.enAttente || !this.isRunning) return;
        const trame = (maintenant) => {
            if (this.fini || this.enAttente || !this.isRunning) return;
            const dt = (maintenant - this.tDerniere) / 1000;
            this.tDerniere = maintenant;
            const r = avancer(this.etat, dt, this.capVoulu);
            this.etat = r.etat;
            if (r.dit) {
                this.note(r.dit, r.quoi === 'mur' || r.quoi === 'mordu' ? 'ko'
                    : r.quoi === 'annule' ? 'bravo' : r.quoi === 'fusion' ? 'ok' : '');
            }
            if (r.quoi === 'mange' || r.quoi === 'fusion' || r.quoi === 'annule') this.dessinerBandeau();
            this.dessiner();
            if (this.etat.fini) return this.terminer(this.etat.fini);
            this.image = requestAnimationFrame(trame);
        };
        this.image = requestAnimationFrame(trame);
    }

    destroy() {
        cancelAnimationFrame(this.image);
        if (this.surTouche) window.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }

    dessiner() {
        const e = this.etat, niv = e.niv;
        const teinte = (t, claire) => (claire ? CLAIRES : COULEURS)[t.e] || COULEURS[0];
        const corps = anneaux(e);

        let out = `<rect class="sp-fond" x="0" y="0" width="${niv.large}" height="${niv.haut}" rx="1.5"/>`;

        // Les termes à ramasser.
        e.graines.forEach(g => {
            out += `<circle class="sp-graine" cx="${g.x.toFixed(2)}" cy="${g.y.toFixed(2)}"
                r="${RAYON_TERME}" fill="${teinte(g.t, true)}" stroke="${teinte(g.t)}"/>
                <text class="sp-txt" x="${g.x.toFixed(2)}" y="${(g.y + 0.06).toFixed(2)}"
                    font-size="${RAYON_TERME * 0.95}" fill="${teinte(g.t)}">${texteTerme(g.t)}</text>`;
        });

        // LE CORPS, DE LA QUEUE VERS LA TÊTE, pour que la tête passe dessus.
        for (let i = corps.length - 1; i >= 0; i--) {
            const t = e.corps[i] || e.corps[e.corps.length - 1] || { c: 0, e: 0 };
            const p = corps[i];
            const tete = i === 0 ? ' sp-tete' : '';
            out += `<circle class="sp-anneau${tete}" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}"
                r="${RAYON_TETE}" fill="${teinte(t)}"/>
                <text class="sp-txt" x="${p.x.toFixed(2)}" y="${(p.y + 0.05).toFixed(2)}"
                    font-size="${RAYON_TETE * 0.9}" fill="#fff">${texteTerme(t)}</text>`;
        }
        // LES DEUX YEUX : ils disent le cap. Sans eux, une bille ronde ne
        // montre pas où elle va, et l'on ne sait pas de combien on corrige.
        const t0 = corps[0], c = e.cap;
        [-0.6, 0.6].forEach(a => {
            const ox = t0.x + Math.cos(c + a) * RAYON_TETE * 0.55;
            const oy = t0.y + Math.sin(c + a) * RAYON_TETE * 0.55;
            out += `<circle class="sp-oeil" cx="${ox.toFixed(2)}" cy="${oy.toFixed(2)}" r="${RAYON_TETE * 0.2}"/>`;
        });
        if (this.mene && this.cible) {
            out += `<circle class="sp-cible" cx="${this.cible[0].toFixed(2)}"
                cy="${this.cible[1].toFixed(2)}" r="${RAYON_TERME * 0.9}"/>`;
        }

        this.sceneEl.innerHTML = `<svg class="sp-svg" viewBox="0 0 ${niv.large} ${niv.haut}"
            preserveAspectRatio="none">${out}</svg>`;
        if (!this.bandeauFait) this.dessinerBandeau();
    }

    dessinerBandeau() {
        this.bandeauFait = true;
        const e = this.etat;
        this.exprEl.textContent = expression(e.corps);
        this.bandeauEl.innerHTML = `<span>${e.niv.titre}</span>`
            + `<span>anneaux <b>${e.corps.length}</b> / idéal ${this.ideal}</span>`
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

    /**
     * LE ROBOT VISE LE TERME LE PLUS PROCHE, et se contente de cela.
     *
     * On montre la RÈGLE — les semblables fusionnent, le reste allonge — et
     * non l'adresse au pilotage. Un robot qui jouerait parfaitement donnerait
     * l'impression qu'il faut être bon au serpent pour réussir en algèbre.
     */
    async runDemoSequence() {
        this.tDerniere = performance.now();
        while (this.isRunning) {
            await new Promise(ok => requestAnimationFrame(ok));
            if (!this.isRunning) return;
            if (this.gelDemo) { this.tDerniere = performance.now(); continue; }
            const maintenant = performance.now();
            const dt = (maintenant - this.tDerniere) / 1000;
            this.tDerniere = maintenant;
            const g = this.etat.graines
                .map(x => ({ x, d: Math.hypot(x.x - this.etat.tete.x, x.y - this.etat.tete.y) }))
                .sort((a, b) => a.d - b.d)[0];
            const cap = g
                ? Math.atan2(g.x.y - this.etat.tete.y, g.x.x - this.etat.tete.x)
                : null;
            const r = avancer(this.etat, dt, cap);
            // En démonstration on ne meurt pas : on repart, sinon l'écran se
            // fige sur un mur au bout de quinze secondes.
            this.etat = r.etat.fini && r.etat.fini !== 'gagne'
                ? nouvellePartie(this.rng, this.rang, this.rapportDeLaScene())
                : r.etat;
            if (r.etat.fini === 'gagne') {
                this.etat = nouvellePartie(this.rng, this.rang, this.rapportDeLaScene());
            }
            if (r.dit) this.note(r.dit);
            this.dessinerBandeau();
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
