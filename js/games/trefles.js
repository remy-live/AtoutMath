// LE TRÈFLE À QUATRE FEUILLES — à l'écran.
//
// RÉMY : « J'ai pensé à des mini jeux pour une pause comme la grenouille ou le
// parking, je pensais aussi à des choses sympas comme cela », avec la page
// d'une revue : un champ de trèfles à trois feuilles, et « Encoure les trèfles
// à 4 feuilles ».
//
// ON GARDE LE GESTE DU PAPIER : quand on en trouve un, on l'ENTOURE. Le cercle
// se dessine autour, à l'encre, exactement comme au crayon sur la revue. Ce
// n'est pas un ornement — c'est ce qui fait qu'on voit d'un coup d'œil ce
// qu'on a déjà trouvé, sans compter, et qu'on ne reclique pas dessus.
//
// LE CHAMP EST SEMÉ AILLEURS (`core/champDeTrefles.js`), là où ça se mesure
// sans navigateur : combien de trèfles, lesquels ont quatre feuilles, et
// surtout la garantie qu'aucun d'eux n'est recouvert au point d'être
// incliquable. Ici, on ne fait que dessiner et écouter.
//
// C'EST UNE PAUSE, ET LE JEU SE COMPORTE COMME TEL. Une erreur ne finit pas la
// partie, ne coûte pas de vie, et n'entre PAS au carnet d'erreurs : cliquer à
// côté sur un champ de deux cents trèfles n'est pas une erreur de
// mathématiques, c'est l'œil qui passe. Le chronomètre MONTE au lieu de
// descendre, pour la même raison.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { regTimeout } from '../core/timers.js';
import { createDemoCursor, createDemoGate } from '../core/demoPointer.js';
import {
    PALIERS, RAYON, semerLeChamp, ordreDeDessin,
    cheminsDunTrefle, pedonculeDunTrefle, motDeFin
} from '../core/champDeTrefles.js';

const COMPETENCE = 'defi.trefles';

class Trefles extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'trefles');
        this.rng = makeRng(this.params.seed);
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'pre';
        this.champs = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .tr-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size;
                }
                .tr-tete {
                    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .9rem;
                }
                .tr-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                @media (hover: hover) { .tr-btn:hover { background: var(--bg-hover); } }
                .tr-compte { font-weight: 800; font-variant-numeric: tabular-nums; }
                .tr-chrono { color: var(--text-muted); font-variant-numeric: tabular-nums; }
                .tr-consigne { font-weight: 800; font-size: clamp(15px, 3.6cqw, 20px); }

                /* LE CHAMP EST UNE PAGE, et il garde son fond clair dans les
                   deux thèmes. Les trèfles sont cernés d'encre sombre : sur un
                   fond sombre, le cerne disparaît et le champ devient une
                   tache verte où l'on ne compte plus rien. C'est une feuille
                   qu'on regarde, pas une interface. */
                .tr-page {
                    background: #fbfbf7; border: 1px solid var(--border);
                    border-radius: 14px; padding: 4px; width: 100%;
                    flex: 1 1 auto; min-height: 0;
                    display: flex; align-items: center; justify-content: center;
                }
                .tr-svg { width: 100%; height: 100%; display: block; touch-action: manipulation; }

                .tr-feuille { fill: #7cb35f; stroke: #1f2a1c; stroke-width: .7; }
                .tr-tige { fill: none; stroke: #1f2a1c; stroke-width: .8; stroke-linecap: round; }
                .tr-trefle { cursor: pointer; }
                /* LE CERCLE DU CRAYON : il se dessine d'un trait, un peu de
                   travers, comme à la main. Un cercle parfait ferait coche de
                   logiciel ; celui-ci dit « c'est toi qui l'as entouré ». */
                .tr-rond {
                    fill: none; stroke: #d62828; stroke-width: 1.6; stroke-linecap: round;
                    stroke-dasharray: 150; stroke-dashoffset: 150;
                    animation: tr-tracer .45s ease-out forwards;
                }
                @keyframes tr-tracer { to { stroke-dashoffset: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .tr-rond { animation: none; stroke-dashoffset: 0; }
                }
                /* L'ERREUR NE PUNIT PAS, ELLE RÉPOND. Le trèfle se teinte une
                   demi-seconde : on sait qu'on a bien cliqué sur CELUI-LÀ, et
                   qu'il a trois feuilles. Sans ce retour, on reclique dessus. */
                .tr-rate .tr-feuille { fill: #c9a227; transition: fill .12s; }

                .tr-note {
                    min-height: 1.4em; text-align: center; font-size: clamp(13px, 3cqw, 15px);
                    color: var(--text-muted); line-height: 1.35;
                }
                .tr-note--ok { color: var(--success); font-weight: 700; }

                /* LE COUP DE POUCE : on éteint tout sauf un quartier du champ.
                   On ne montre pas le trèfle — ce serait finir le jeu à la
                   place du joueur —, on montre OÙ CHERCHER, ce qui est
                   précisément le conseil qu'on donnerait à voix haute. */
                .tr-quartier { fill: rgba(255,255,255,.72); pointer-events: none; }
            </style>
            <div class="tr-wrap">
                <div class="tr-tete">
                    <span class="tr-compte" data-tr-compte></span>
                    <span class="tr-chrono" data-tr-chrono>0 s</span>
                    <button type="button" class="tr-btn" data-tr-pouce>💡 Où chercher ?</button>
                    <button type="button" class="tr-btn" data-tr-neuf>↺ Un autre champ</button>
                </div>
                <div class="tr-consigne" data-tr-consigne></div>
                <div class="tr-page"><svg class="tr-svg" data-tr-champ role="img"
                    aria-label="Un champ de trèfles : il faut cliquer ceux qui ont quatre feuilles"></svg></div>
                <p class="tr-note" data-tr-note></p>
            </div>`;

        this.compteEl = this.container.querySelector('[data-tr-compte]');
        this.chronoEl = this.container.querySelector('[data-tr-chrono]');
        this.consigneEl = this.container.querySelector('[data-tr-consigne]');
        this.svgEl = this.container.querySelector('[data-tr-champ]');
        this.noteEl = this.container.querySelector('[data-tr-note]');
        this.container.querySelector('[data-tr-neuf]').addEventListener('click', () => this.poser());
        this.container.querySelector('[data-tr-pouce]').addEventListener('click', () => this.ouChercher());
        this.svgEl.addEventListener('click', (e) => {
            const g = e.target.closest('[data-i]');
            if (g) this.cliquer(Number(g.dataset.i), g);
        });
        this.poser();
    }

    /** Le chronomètre MONTE : c'est une pause, pas une épreuve. */
    startGameLoop() {
        this.timerInterval = setInterval(() => {
            if (!this.isRunning || !this.debut || this.fini) return;
            const s = Math.round((Date.now() - this.debut) / 1000);
            if (this.chronoEl) this.chronoEl.textContent = s < 60
                ? `${s} s`
                : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
        }, 500);
    }

    poser() {
        this.champ = semerLeChamp({ rng: this.rng, palier: this.palier });
        this.trouves = new Set();
        this.erreurs = 0;
        this.fini = false;
        this.debut = Date.now();
        if (this.chronoEl) this.chronoEl.textContent = '0 s';
        this.dessiner();
        this.note('');
        return true;
    }

    dessiner() {
        const c = this.champ;
        const marge = RAYON * 1.4;
        this.svgEl.setAttribute('viewBox',
            `${-marge} ${-marge} ${c.largeur + marge * 2} ${c.hauteur + marge * 2}`);
        this.svgEl.innerHTML = ordreDeDessin(c).map(t => {
            const feuilles = cheminsDunTrefle(t.feuilles)
                .map(f => `<path class="tr-feuille" d="${f.d}" transform="rotate(${f.rotation})"/>`)
                .join('');
            return `<g class="tr-trefle" data-i="${t.i}"
                transform="translate(${t.x.toFixed(2)} ${t.y.toFixed(2)}) rotate(${t.angle.toFixed(1)})">
                <path class="tr-tige" d="${pedonculeDunTrefle()}"/>${feuilles}</g>`;
        }).join('');
        this.majCompte();
    }

    majCompte() {
        const c = this.champ;
        this.compteEl.textContent = `${this.trouves.size} / ${c.aTrouver} trouvé${
            this.trouves.size > 1 ? 's' : ''}`;
        this.consigneEl.textContent = c.aTrouver > 1
            ? `Trouve les ${c.aTrouver} trèfles à quatre feuilles.`
            : 'Trouve le trèfle à quatre feuilles.';
    }

    cliquer(i, g) {
        if (this.fini || this.isDemo) return;
        const t = this.champ.trefles.find(x => x.i === i);
        if (!t || this.trouves.has(i)) return;

        if (t.feuilles !== 4) {
            this.erreurs++;
            g.classList.add('tr-rate');
            regTimeout(() => g.classList.remove('tr-rate'), 450);
            return;
        }

        this.trouves.add(i);
        // ON L'ENTOURE, comme sur la revue. Le cercle se pose DANS le groupe du
        // trèfle mais sans sa rotation : un cercle n'a pas d'orientation, et le
        // faire tourner ne ferait que décaler son départ de tracé.
        const rond = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        rond.setAttribute('class', 'tr-rond');
        rond.setAttribute('r', String(RAYON * 1.15));
        g.appendChild(rond);
        // ET IL PASSE AU-DESSUS : entouré, il ne doit plus être caché par ses
        // voisins, sinon le cercle se retrouve à moitié sous un autre trèfle et
        // l'on ne sait plus ce qu'on a trouvé.
        this.svgEl.appendChild(g);
        this.majCompte();
        if (this.trouves.size >= this.champ.aTrouver) this.gagner();
    }

    gagner() {
        this.fini = true;
        this.champs++;
        const secondes = (Date.now() - this.debut) / 1000;
        this.note(motDeFin({ secondes, erreurs: this.erreurs, aTrouver: this.champ.aTrouver }), 'ok');
        // LES POINTS SUIVENT LE CHAMP ET LA PROPRETÉ, pas la vitesse. Un champ
        // se cherche vite ou lentement selon qu'on a de la chance au premier
        // coup d'œil ; ce qui se travaille, c'est de ne pas cliquer au hasard.
        const base = { promenade: 8, pre: 14, champ: 20, foret: 28 }[this.palier] || 14;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Trouver ${this.champ.aTrouver} trèfles à quatre feuilles `
                + `parmi ${this.champ.trefles.length}`,
            expected: String(this.champ.aTrouver), given: String(this.trouves.size),
            points: Math.max(4, base - this.erreurs * 2)
        });
        regTimeout(() => { if (this.isRunning) this.poser(); }, 2600);
    }

    /**
     * OÙ CHERCHER — et non QUOI cliquer.
     *
     * On éteint les trois quarts du champ et l'on laisse celui qui contient un
     * trèfle encore à trouver. C'est le conseil qu'on donnerait à voix haute :
     * « regarde plutôt en bas à gauche ». Montrer le trèfle lui-même finirait
     * le jeu à la place du joueur, et il n'y a plus rien à y gagner.
     */
    ouChercher() {
        if (this.fini || this.isDemo) return;
        const reste = this.champ.trefles.filter(t => t.feuilles === 4 && !this.trouves.has(t.i));
        if (!reste.length) return;
        const cible = reste[0];
        const c = this.champ;
        const gauche = cible.x < c.largeur / 2, haut = cible.y < c.hauteur / 2;
        const marge = RAYON * 1.4;
        const x0 = -marge, y0 = -marge;
        const L = c.largeur + marge * 2, H = c.hauteur + marge * 2;
        // Les trois rectangles qui couvrent tout SAUF le quartier visé.
        const voiles = [
            gauche ? { x: x0 + L / 2, y: y0, w: L / 2, h: H } : { x: x0, y: y0, w: L / 2, h: H },
            haut ? { x: gauche ? x0 : x0 + L / 2, y: y0 + H / 2, w: L / 2, h: H / 2 }
                : { x: gauche ? x0 : x0 + L / 2, y: y0, w: L / 2, h: H / 2 }
        ];
        const anciens = this.svgEl.querySelectorAll('.tr-quartier');
        anciens.forEach(v => v.remove());
        for (const v of voiles) {
            const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            r.setAttribute('class', 'tr-quartier');
            r.setAttribute('x', String(v.x)); r.setAttribute('y', String(v.y));
            r.setAttribute('width', String(v.w)); r.setAttribute('height', String(v.h));
            this.svgEl.appendChild(r);
        }
        this.note(`Il en reste un ${haut ? 'en haut' : 'en bas'} ${gauche ? 'à gauche' : 'à droite'}.`);
        regTimeout(() => {
            this.svgEl.querySelectorAll('.tr-quartier').forEach(v => v.remove());
        }, 2200);
    }

    note(texte, ton) {
        if (!this.noteEl) return;
        this.noteEl.textContent = texte || '';
        this.noteEl.className = 'tr-note' + (ton ? ` tr-note--${ton}` : '');
    }

    showNext() { return this.poser(); }

    /**
     * LA DÉMONSTRATION MONTRE LE GESTE, PAS LA RÉPONSE.
     *
     * Le robot balaie LIGNE PAR LIGNE avant d'aller au trèfle : c'est la seule
     * chose à apprendre ici, et la montrer vaut mieux que l'écrire dans la
     * consigne — où personne ne la lit.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        try {
            cur.protegerZone([this.svgEl]);
            await gate.wait(500);
            cur.say('Des trèfles à trois feuilles, et quelques-uns à quatre. '
                + 'Le piège : ils sont tournés dans tous les sens.', this.consigneEl);
            await gate.wait(3200);
            // DEUX BULLES PLUTÔT QU'UNE. Au-delà de cent dix signes, la bulle
            // du robot couvre ce qu'elle commente — c'est éprouvé ailleurs
            // dans le dépôt, et l'épreuve me l'a rappelé ici.
            cur.say('On ne saute pas d\'un trèfle à l\'autre au hasard : on BALAIE, '
                + 'ligne par ligne.', this.svgEl);
            await gate.wait(2600);
            cur.say('On va deux fois plus vite, et l\'on ne repasse pas au même endroit.',
                this.svgEl);
            await gate.wait(2400);
            const cible = this.champ.trefles.find(t => t.feuilles === 4);
            const g = this.svgEl.querySelector(`[data-i="${cible.i}"]`);
            if (g && await cur.tap(g, 900)) {
                this.trouves.add(cible.i);
                const rond = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                rond.setAttribute('class', 'tr-rond');
                rond.setAttribute('r', String(RAYON * 1.15));
                g.appendChild(rond);
                this.svgEl.appendChild(g);
                this.majCompte();
                cur.say('Celui-ci en a quatre. On l\'entoure, comme sur le papier.', g);
                await gate.wait(2600);
            }
        } catch (e) { /* démonstration coupée */ }
        fin();
    }
}

export function engineTrefles(container, isDemo, params) {
    const jeu = new Trefles(container, isDemo, params);
    // C'EST L'USINE QUI DÉMARRE LE JEU : le Runner garde l'instance et
    // n'appelle jamais « start ». Sans cette ligne, l'écran reste vide, sans
    // la moindre erreur pour le dire.
    jeu.start();
    return jeu;
}
