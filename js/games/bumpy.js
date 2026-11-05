// BUMPY — à l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « quand j'étais jeune, je jouais à un jeu Bumpy, je
// l'adorai, c'est un chouette jeu pour ceux qui vont vite et ca fait les
// réflexes ». Et, sur ce qu'il en aimait : « j'aimais tout ».
//
// ON LE FAIT DONC FIDÈLE. La balle rebondit toute seule, on ne la dirige qu'à
// gauche et à droite, il faut tout ramasser pour que la sortie s'ouvre, les
// plateformes claires se cassent sous le rebond, les rouges brûlent, et la
// goutte d'eau est le seul moyen de les traverser.
//
// ── DEUX CHOSES QUE L'ORIGINAL NE FAISAIT PAS, ET POURQUOI ─────────────────
//
//   · ON REPREND AU TABLEAU, PAS AU DÉBUT. En 1989 on recommençait tout. Dans
//     une salle de classe, un élève qui refait trois tableaux pour atteindre
//     celui où il a échoué abandonne avant d'y arriver — et c'est une
//     récréation, pas une épreuve d'endurance.
//   · ET IL Y A TROIS VIES AFFICHÉES. Savoir combien il en reste change la
//     façon de jouer : on ose un passage quand on en a trois, on assure quand
//     il n'en reste qu'une. Sans le compteur, on ne fait qu'être surpris.
//
// ── LE PILOTAGE EST LE MÊME AU DOIGT ET AU CLAVIER ─────────────────────────
//
// Flèches gauche et droite, ou les deux moitiés de l'écran. Pas de bouton de
// saut : il n'y en a pas, la balle saute toute seule — et c'est toute l'idée.
// Un troisième geste donnerait à croire qu'on peut contrôler la hauteur.

import { BaseGame } from '../core/BaseGame.js';
import {
    CASE, NIVEAUX, RAYON, TUILE, avancer, etatInitial, lireNiveau
} from '../core/bumpy.js';

/** Les couleurs du tableau. Un vert de nuit, et chaque tuile sa matière. */
const ENCRE = {
    fond: '#0b1226', grille: '#141d3a',
    mur: '#3f4e86', murHaut: '#6b7cc4',
    cassable: '#b08968', cassableHaut: '#dcc1a0',
    feu: '#dc2626', feuHaut: '#fca5a5',
    objet: '#fbbf24', eau: '#38bdf8',
    sortie: '#22c55e', sortieFermee: '#334155',
    balle: '#f472b6', balleClair: '#fbcfe8'
};

class Bumpy extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'bumpy');
        // CE JEU AVANCE TOUT SEUL PENDANT QU'ON LIT : il le déclare, pour que
        // les cartes de correction ne s'effacent pas d'elles-mêmes. Voir
        // `tempsReel` dans core/BaseGame.js.
        this.tempsReel = true;
        this.rang = 0;
        this.vies = 3;
        this.entree = 0;
        this.touches = { gauche: false, droite: false };
    }

    render() {
        const L = NIVEAUX[0].lignes[0].length * CASE;
        const H = NIVEAUX[0].lignes.length * CASE;
        this.container.innerHTML = `
            <style>
                .bp-wrap { display: flex; flex-direction: column; align-items: center;
                    gap: 10px; width: 100%; user-select: none;
                    -webkit-user-select: none; touch-action: none; }
                .bp-hud { display: flex; gap: 18px; align-items: baseline;
                    font-weight: 800; font-variant-numeric: tabular-nums; }
                .bp-hud span { color: var(--text-muted); font-size: .82rem;
                    text-transform: uppercase; letter-spacing: .05em; }
                .bp-hud b { font-size: 1.1rem; color: var(--text-main); }
                .bp-cadre { position: relative; width: 100%; max-width: ${L}px; }
                .bp-toile { display: block; width: 100%; height: auto;
                    border-radius: 12px; box-shadow: 0 10px 30px -18px #000; }
                /* LES DEUX MOITIÉS DE L'ÉCRAN SONT LES DEUX FLÈCHES. Elles sont
                   invisibles : un bouton dessiné sur le plateau cacherait
                   justement la plateforme qu'on vise. */
                .bp-moitie { position: absolute; top: 0; bottom: 0; width: 50%;
                    cursor: pointer; }
                .bp-moitie--g { left: 0; } .bp-moitie--d { right: 0; }
                .bp-mot { min-height: 1.6em; font-weight: 700; text-align: center; }
                .bp-fin { position: absolute; inset: 0; display: none;
                    place-items: center; text-align: center; border-radius: 12px;
                    background: rgb(11 18 38 / .88); color: #eef2ff; padding: 20px; }
                .bp-fin--vu { display: grid; }
                .bp-fin h3 { margin: 0 0 6px; font-size: 1.3rem; }
                .bp-fin p { margin: 0 0 14px; opacity: .85; }
            </style>
            <div class="bp-wrap">
                <div class="bp-hud">
                    <div><span>Tableau</span> <b data-tableau>1</b></div>
                    <div><span>À ramasser</span> <b data-restants>0</b></div>
                    <div><span>Vies</span> <b data-vies>3</b></div>
                </div>
                <div class="bp-cadre">
                    <canvas class="bp-toile" width="${L}" height="${H}"
                        role="img" aria-label="Le plateau de Bumpy"></canvas>
                    <div class="bp-moitie bp-moitie--g" data-cote="-1"
                        aria-label="Aller à gauche"></div>
                    <div class="bp-moitie bp-moitie--d" data-cote="1"
                        aria-label="Aller à droite"></div>
                    <div class="bp-fin" data-fin>
                        <div>
                            <h3 data-fin-titre></h3>
                            <p data-fin-texte></p>
                            <button type="button" class="pl-btn pl-btn--fort"
                                data-neuf>Recommencer</button>
                        </div>
                    </div>
                </div>
                <div class="bp-mot" data-mot>Flèches ← → ou les deux moitiés de l'écran.
                    La balle rebondit toute seule.</div>
            </div>`;
        this.toile = this.container.querySelector('.bp-toile');
        this.ctx = this.toile.getContext('2d');
        this.finEl = this.container.querySelector('[data-fin]');
        this.brancher();
        this.chargerTableau(0);
    }

    brancher() {
        const surTouche = (e, enfonce) => {
            if (e.key === 'ArrowLeft') this.touches.gauche = enfonce;
            else if (e.key === 'ArrowRight') this.touches.droite = enfonce;
            else return;
            e.preventDefault();
            this.entree = (this.touches.droite ? 1 : 0) - (this.touches.gauche ? 1 : 0);
        };
        this._bas = (e) => surTouche(e, true);
        this._haut = (e) => surTouche(e, false);
        document.addEventListener('keydown', this._bas);
        document.addEventListener('keyup', this._haut);

        this.container.querySelectorAll('[data-cote]').forEach(el => {
            const cote = Number(el.dataset.cote);
            // `pointerdown` ET `pointerup` SUR LA MOITIÉ, et la capture : un
            // doigt qui glisse d'une moitié à l'autre doit changer de sens, pas
            // laisser la balle filer parce qu'il a quitté l'élément.
            el.addEventListener('pointerdown', (e) => {
                el.setPointerCapture(e.pointerId);
                this.entree = cote;
            });
            const lacher = () => { this.entree = 0; };
            el.addEventListener('pointerup', lacher);
            el.addEventListener('pointercancel', lacher);
        });

        const neuf = this.container.querySelector('[data-neuf]');
        if (neuf) neuf.onclick = () => this.recommencer();
    }

    chargerTableau(rang) {
        this.rang = rang % NIVEAUX.length;
        this.niveau = lireNiveau(NIVEAUX[this.rang]);
        this.etat = etatInitial(this.niveau);
        this.fini = false;
        this.dernier = null;
        this.majHud();
        this.dire(`Tableau ${this.rang + 1} — ${this.niveau.nom}`);
    }

    recommencer() {
        this.vies = 3;
        this.finEl.classList.remove('bp-fin--vu');
        this.chargerTableau(0);
        if (!this.raf) this.raf = requestAnimationFrame(this.boucle);
    }

    majHud() {
        const poser = (clef, v) => {
            const el = this.container.querySelector(`[data-${clef}]`);
            if (el) el.textContent = v;
        };
        poser('tableau', this.rang + 1);
        poser('restants', this.etat ? this.etat.restants : 0);
        poser('vies', this.vies);
    }

    dire(texte) {
        const el = this.container.querySelector('[data-mot]');
        if (el) el.textContent = texte;
    }

    startGameLoop() {
        this.dernier = null;
        if (!this.raf) this.raf = requestAnimationFrame(this.boucle);
    }

    boucle = (t) => {
        this.raf = null;
        if (!this.isRunning || !this.toile || !this.toile.isConnected) return;
        const dt = this.dernier === null ? 1 / 60 : Math.min(0.05, (t - this.dernier) / 1000);
        this.dernier = t;
        if (!this.fini && !this.gelDemo) this.pas(dt);
        this.dessiner();
        this.raf = requestAnimationFrame(this.boucle);
    };

    pas(dt) {
        // LE PAS DU MONDE EST DÉCOUPÉ, et c'est ce qui empêche la balle de
        // traverser un mur : `avancer` plafonne déjà à 25 ms, mais plafonner
        // RALENTIT le jeu quand l'image tarde. On rejoue donc autant de petits
        // pas qu'il faut pour couvrir le temps écoulé.
        let reste = dt;
        while (reste > 0 && !this.fini) {
            const p = Math.min(0.02, reste);
            reste -= p;
            const r = avancer(this.etat, this.niveau, p, this.isDemo ? 0 : this.entree);
            this.etat = r.etat;
            for (const fait of r.faits) this.surFait(fait);
        }
        this.majHud();
    }

    surFait(fait) {
        if (fait === 'objet') this.dire(`Encore ${this.etat.restants} à ramasser.`);
        if (fait === 'ouverte') this.dire('La sortie est ouverte !');
        if (fait === 'eau') this.dire('La goutte d\'eau : le feu ne te brûlera plus.');
        if (fait === 'feu') this.perdreUneVie();
        if (fait === 'sortie') this.tableauFini();
    }

    perdreUneVie() {
        this.vies--;
        this.majHud();
        if (this.vies > 0) {
            // ON REPREND AU TABLEAU, pas au début : voir l'en-tête.
            this.dire(`Le feu ! Il te reste ${this.vies} vie${this.vies > 1 ? 's' : ''}.`);
            const rang = this.rang;
            this.fini = true;
            setTimeout(() => {
                if (!this.isRunning) return;
                this.chargerTableau(rang);
            }, 900);
            return;
        }
        this.terminer('Plus de vies', `Tu es allé jusqu'au tableau ${this.rang + 1}.`);
    }

    tableauFini() {
        // LE SEUL MOMENT OÙ L'ON MARQUE. Ce n'est pas un exercice : il n'y a ni
        // bonne ni mauvaise réponse, seulement un tableau franchi — et c'est
        // cela qu'on enregistre, pour que la partie compte dans un parcours.
        // Même raisonnement que `passerMonde` dans les Petites Ailes.
        if (!this.isDemo) {
            this.onCorrectAnswer(null, null, {
                questionText: `Finir le tableau ${this.rang + 1} — ${this.niveau.nom}`,
                expected: this.niveau.nom, given: this.niveau.nom,
                points: 10 + this.rang * 5
            });
        }
        if (this.rang + 1 >= NIVEAUX.length) {
            this.terminer('Tous les tableaux !', 'Tu les as tous finis. On recommence ?');
            return;
        }
        this.fini = true;
        this.dire('Tableau fini !');
        const suivant = this.rang + 1;
        setTimeout(() => {
            if (!this.isRunning) return;
            this.chargerTableau(suivant);
        }, 900);
    }

    terminer(titre, texte) {
        this.fini = true;
        this.container.querySelector('[data-fin-titre]').textContent = titre;
        this.container.querySelector('[data-fin-texte]').textContent = texte;
        this.finEl.classList.add('bp-fin--vu');
    }

    // ── LE DESSIN ──────────────────────────────────────────────────────────
    //
    // CHAQUE TUILE A SA MATIÈRE, et non sa seule couleur : le mur porte une
    // arête claire en haut, la plateforme cassable des planches, le feu des
    // pointes. Photocopié en gris — ce qui n'arrivera jamais ici — on les
    // distinguerait encore, et c'est le bon critère : la couleur seule ne
    // suffit jamais.

    dessiner() {
        const g = this.ctx, n = this.niveau;
        if (!g || !n) return;
        g.fillStyle = ENCRE.fond;
        g.fillRect(0, 0, this.toile.width, this.toile.height);
        g.strokeStyle = ENCRE.grille;
        g.lineWidth = 1;
        for (let c = 1; c < n.largeur; c++) {
            g.beginPath(); g.moveTo(c * CASE, 0); g.lineTo(c * CASE, this.toile.height); g.stroke();
        }
        for (let r = 1; r < n.hauteur; r++) {
            g.beginPath(); g.moveTo(0, r * CASE); g.lineTo(this.toile.width, r * CASE); g.stroke();
        }
        for (let r = 0; r < n.hauteur; r++) {
            for (let c = 0; c < n.largeur; c++) {
                this.dessinerTuile(g, n.cases[r][c], c * CASE, r * CASE);
            }
        }
        this.dessinerBalle(g);
    }

    dessinerTuile(g, t, x, y) {
        if (t === TUILE.MUR) {
            g.fillStyle = ENCRE.mur; g.fillRect(x, y, CASE, CASE);
            g.fillStyle = ENCRE.murHaut; g.fillRect(x, y, CASE, 4);
        } else if (t === TUILE.CASSABLE) {
            g.fillStyle = ENCRE.cassable; g.fillRect(x, y, CASE, CASE);
            g.fillStyle = ENCRE.cassableHaut; g.fillRect(x, y, CASE, 4);
            g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(x + CASE / 2, y + 5); g.lineTo(x + CASE / 2, y + CASE);
            g.stroke();
        } else if (t === TUILE.FEU) {
            g.fillStyle = ENCRE.feu; g.fillRect(x, y, CASE, CASE);
            g.fillStyle = ENCRE.feuHaut;
            g.beginPath();
            for (let i = 0; i < 4; i++) {
                g.moveTo(x + i * 8, y + 8);
                g.lineTo(x + i * 8 + 4, y);
                g.lineTo(x + i * 8 + 8, y + 8);
            }
            g.fill();
        } else if (t === TUILE.OBJET) {
            g.fillStyle = ENCRE.objet;
            g.beginPath(); g.arc(x + CASE / 2, y + CASE / 2, 7, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#fff7cc';
            g.beginPath(); g.arc(x + CASE / 2 - 2, y + CASE / 2 - 2, 2.5, 0, Math.PI * 2); g.fill();
        } else if (t === TUILE.EAU) {
            g.fillStyle = ENCRE.eau;
            g.beginPath();
            g.moveTo(x + CASE / 2, y + 6);
            g.quadraticCurveTo(x + CASE - 6, y + CASE - 8, x + CASE / 2, y + CASE - 6);
            g.quadraticCurveTo(x + 6, y + CASE - 8, x + CASE / 2, y + 6);
            g.fill();
        } else if (t === TUILE.SORTIE) {
            // LA SORTIE FERMÉE N'EST PAS CACHÉE : on la voit depuis le début,
            // grise, et c'est elle qui dit où l'on va. Une porte qui apparaît
            // au dernier objet ramassé transformerait le tableau en surprise.
            const ouverte = this.etat && this.etat.ouverte;
            g.fillStyle = ouverte ? ENCRE.sortie : ENCRE.sortieFermee;
            g.fillRect(x + 4, y + 2, CASE - 8, CASE - 2);
            g.fillStyle = ENCRE.fond;
            g.fillRect(x + 10, y + 10, CASE - 20, CASE - 10);
            if (ouverte) {
                g.fillStyle = '#86efac';
                g.fillRect(x + 10, y + 10, CASE - 20, 3);
            }
        }
    }

    dessinerBalle(g) {
        const e = this.etat;
        if (!e) return;
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.beginPath(); g.ellipse(e.x, e.y + RAYON + 3, RAYON, 3.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = e.eau ? ENCRE.eau : ENCRE.balle;
        g.beginPath(); g.arc(e.x, e.y, RAYON, 0, Math.PI * 2); g.fill();
        g.fillStyle = ENCRE.balleClair;
        g.beginPath(); g.arc(e.x - 3.5, e.y - 3.5, 3.5, 0, Math.PI * 2); g.fill();
        // LES DEUX YEUX REGARDENT OÙ L'ON VA : c'est le seul endroit du dessin
        // qui dit le sens, et il se lit sans y penser.
        const dx = this.entree * 3;
        g.fillStyle = '#1f2937';
        g.beginPath(); g.arc(e.x - 3 + dx, e.y - 1, 1.8, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(e.x + 3 + dx, e.y - 1, 1.8, 0, Math.PI * 2); g.fill();
    }

    /** Le robot va chercher le premier objet, puis se laisse rebondir. */
    async runDemoSequence() {
        this.startGameLoop();
        let sens = 1;
        this.demoTempo = setInterval(() => {
            if (!this.isRunning) return;
            sens = -sens;
            this.entree = sens;
        }, 1400);
    }

    destroy() {
        document.removeEventListener('keydown', this._bas);
        document.removeEventListener('keyup', this._haut);
        if (this.demoTempo) { clearInterval(this.demoTempo); this.demoTempo = null; }
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        super.destroy();
    }
}

export function engineBumpy(container, isDemo, params) {
    const game = new Bumpy(container, isDemo, params);
    game.start();
    return game;
}
