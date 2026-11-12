// BOULDER DASH — à l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « et j'adorai aussi boulder dash », puis « B — la
// partie » : grand tableau, chronomètre, trois vies, rien de noté.
//
// ── CE QUI DOIT SE VOIR, ET POURQUOI ───────────────────────────────────────
//
//   · LES ROCHERS GLISSENT, ils ne sautent pas. Le monde dit quelles pierres
//     ont bougé (`mouvements`), et le dessin les anime d'une case à l'autre
//     sur la durée d'un pas. Sans cela, un rocher apparaît ailleurs et l'élève
//     ne voit JAMAIS la chute — c'est-à-dire précisément la chose qu'il doit
//     apprendre à anticiper. Même leçon que sur le Pont et la lampe.
//   · LA PORTE EST GRISE TANT QU'IL MANQUE DES DIAMANTS, puis verte. On la voit
//     depuis le début : c'est elle qui dit où l'on va.
//   · LE COMPTEUR DIT « 3 / 6 », et non « 3 ». Un nombre seul ne dit pas
//     combien il en reste à faire.
//
// ── LE PAVÉ DE QUATRE FLÈCHES N'EST PAS UN PIS-ALLER ───────────────────────
//
// Bumpy se joue avec deux moitiés d'écran parce qu'il n'a que deux gestes.
// Ici il y en a quatre, et un écran coupé en quatre quartiers serait
// indevinable. Rémy joue sur tablette : il lui faut des flèches qu'on VOIT.

import { BaseGame } from '../core/BaseGame.js';
import {
    CASE, DIRECTIONS, NIVEAUX, TIC_MS, TUILE, avancer, etatInitial, lireNiveau
} from '../core/boulderDash.js';

/** Combien de temps dure l'impact d'un rocher, en millisecondes. */
const CHOC_MS = 620;

/**
 * L'ÉCRAN DOIT-IL RESTER CALME ?
 *
 * Un élève que le mouvement gêne n'a pas à choisir entre son confort et le
 * jeu que son professeur a donné : la secousse disparaît, l'éclat et le voile
 * restent. On perd le tremblement, jamais l'information.
 */
const ecranCalme = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
};
import { faireJouer } from '../core/boulderRobot.js';

/** Les couleurs de la mine. */
const ENCRE = {
    fond: '#0b1226',
    terre: '#a16207', terreClair: '#ca8a04',
    roche: '#3f4e86', rocheHaut: '#6b7cc4',
    rocher: '#64748b', rocherClair: '#cbd5e1',
    diamant: '#22d3ee', diamantClair: '#cffafe',
    sortie: '#22c55e', sortieFermee: '#334155',
    peau: '#fcd9b6', casque: '#f59e0b', corps: '#ef4444'
};

class BoulderDash extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'boulder-dash');
        // CE JEU AVANCE TOUT SEUL PENDANT QU'ON LIT : il le déclare, pour que
        // les cartes de correction ne s'effacent pas d'elles-mêmes.
        this.tempsReel = true;
        this.rang = 0;
        this.vies = 3;
        this.diamantsTotal = 0;
        this.dir = null;
    }

    render() {
        const L = NIVEAUX[0].lignes[0].length * CASE;
        const H = NIVEAUX[0].lignes.length * CASE;
        this.container.innerHTML = `
            <style>
                .bd-wrap { display: flex; flex-direction: column; align-items: center;
                    gap: 10px; width: 100%; user-select: none;
                    -webkit-user-select: none; touch-action: none; }
                .bd-hud { display: flex; gap: 18px; align-items: baseline;
                    font-weight: 800; font-variant-numeric: tabular-nums; }
                .bd-hud span { color: var(--text-muted); font-size: .8rem;
                    text-transform: uppercase; letter-spacing: .05em; }
                .bd-hud b { font-size: 1.1rem; color: var(--text-main); }
                .bd-hud b.bd-presse { color: #dc2626; }
                .bd-cadre { position: relative; width: 100%; max-width: ${L}px; }
                .bd-toile { display: block; width: 100%; height: auto;
                    border-radius: 12px; box-shadow: 0 10px 30px -18px #000; }
                .bd-pave { display: grid; grid-template-columns: repeat(3, 56px);
                    grid-template-rows: repeat(2, 48px); gap: 6px; }
                .bd-fl { border: 1px solid var(--border); background: var(--bg-panel);
                    border-radius: 12px; font-size: 1.3rem; font-weight: 800;
                    color: var(--text-main); display: grid; place-items: center;
                    cursor: pointer; }
                .bd-fl--haut { grid-column: 2; grid-row: 1; }
                .bd-fl--gauche { grid-column: 1; grid-row: 2; }
                .bd-fl--bas { grid-column: 2; grid-row: 2; }
                .bd-fl--droite { grid-column: 3; grid-row: 2; }
                @media (hover: hover) { .bd-fl:hover { background: var(--bg-hover); } }
                .bd-fl--tenue { background: var(--primary); color: #fff;
                    border-color: var(--primary); }
                .bd-mot { min-height: 1.6em; font-weight: 700; text-align: center; }
                .bd-fin { position: absolute; inset: 0; display: none;
                    place-items: center; text-align: center; border-radius: 12px;
                    background: rgb(11 18 38 / .9); color: #eef2ff; padding: 20px; }
                .bd-fin--vu { display: grid; }
                .bd-fin h3 { margin: 0 0 6px; font-size: 1.3rem; }
                .bd-fin p { margin: 0 0 14px; opacity: .85; }
            </style>
            <div class="bd-wrap">
                <div class="bd-hud">
                    <div><span>Tableau</span> <b data-tableau>1</b></div>
                    <div><span>Diamants</span> <b data-diamants>0 / 0</b></div>
                    <div><span>Temps</span> <b data-temps>0</b></div>
                    <div><span>Vies</span> <b data-vies>3</b></div>
                </div>
                <div class="bd-cadre">
                    <canvas class="bd-toile" width="${L}" height="${H}"
                        role="img" aria-label="La mine de Boulder Dash"></canvas>
                    <div class="bd-fin" data-fin>
                        <div>
                            <h3 data-fin-titre></h3>
                            <p data-fin-texte></p>
                            <button type="button" class="pl-btn pl-btn--fort"
                                data-neuf>Recommencer</button>
                        </div>
                    </div>
                </div>
                <div class="bd-pave">
                    <button type="button" class="bd-fl bd-fl--haut" data-dir="haut"
                        aria-label="Monter">↑</button>
                    <button type="button" class="bd-fl bd-fl--gauche" data-dir="gauche"
                        aria-label="Aller à gauche">←</button>
                    <button type="button" class="bd-fl bd-fl--bas" data-dir="bas"
                        aria-label="Descendre">↓</button>
                    <button type="button" class="bd-fl bd-fl--droite" data-dir="droite"
                        aria-label="Aller à droite">→</button>
                </div>
                <div class="bd-mot" data-mot>Creuse la terre, ramasse les diamants,
                    puis sors par la porte. Les rochers tombent.</div>
            </div>`;
        this.toile = this.container.querySelector('.bd-toile');
        this.ctx = this.toile.getContext('2d');
        this.finEl = this.container.querySelector('[data-fin]');
        this.brancher();
        this.chargerTableau(0);
    }

    brancher() {
        const nomDe = {
            ArrowLeft: 'gauche', ArrowRight: 'droite',
            ArrowUp: 'haut', ArrowDown: 'bas'
        };
        this.tenues = new Set();
        const marquer = () => {
            this.container.querySelectorAll('[data-dir]').forEach(b =>
                b.classList.toggle('bd-fl--tenue', this.tenues.has(b.dataset.dir)));
            // LA DERNIÈRE TOUCHE ENFONCÉE GAGNE : en diagonale, un joueur
            // appuie sur la seconde flèche sans lâcher la première, et il
            // attend que ce soit la nouvelle qui compte.
            const l = [...this.tenues];
            const avant = this.dir;
            this.dir = l.length ? DIRECTIONS[l[l.length - 1]] : null;
            if (!avant && this.dir) this.reveiller();
        };
        this._bas = (e) => {
            const nom = nomDe[e.key];
            if (!nom) return;
            e.preventDefault();
            this.tenues.delete(nom);
            this.tenues.add(nom);
            marquer();
        };
        this._haut = (e) => {
            const nom = nomDe[e.key];
            if (!nom) return;
            e.preventDefault();
            this.tenues.delete(nom);
            marquer();
        };
        document.addEventListener('keydown', this._bas);
        document.addEventListener('keyup', this._haut);

        this.container.querySelectorAll('[data-dir]').forEach(b => {
            const nom = b.dataset.dir;
            b.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.tenues.delete(nom);
                this.tenues.add(nom);
                marquer();          // `marquer` réveille le tic au besoin
                // LE SENS D'ABORD, LA CAPTURE ENSUITE, et la capture dans un
                // `try` : `setPointerCapture` jette quand le pointeur n'est
                // plus actif, et l'exception interromprait le gestionnaire
                // AVANT que le sens soit posé. Leçon payée sur Bumpy.
                try { b.setPointerCapture(e.pointerId); } catch (err) { /* sans */ }
            });
            const lacher = () => { this.tenues.delete(nom); marquer(); };
            b.addEventListener('pointerup', lacher);
            b.addEventListener('pointercancel', lacher);
            b.addEventListener('pointerleave', lacher);
        });

        const neuf = this.container.querySelector('[data-neuf]');
        if (neuf) neuf.onclick = () => this.recommencer();
    }

    /**
     * LE PREMIER PAS PART TOUT DE SUITE.
     *
     * RÉMY : « je trouve que boulder dash pour les touches c'est laborieux et
     * peu fluide ».
     *
     * MESURÉ AVANT (tools/fluiditeBoulder.mjs) : entre l'appui sur la flèche
     * et le départ du mineur, JUSQU'À 156 MILLISECONDES — médiane 151. Le
     * monde avance par tics de 150 ms, et une touche pressée juste après un
     * tic attendait le suivant. C'est exactement la sensation de lourdeur :
     * on appuie, et il ne se passe rien pendant un sixième de seconde.
     *
     * ON ARME DONC LE TIC quand une direction arrive alors qu'on était à
     * l'arrêt : le prochain affichage — seize millisecondes au plus — fait le
     * pas.
     *
     * ET CE N'EST PAS UNE TRICHE, parce que le pas du joueur EST le tic du
     * monde : les rochers tombent du même coup. Marteler la flèche ne gagne
     * pas un tour d'avance sur la pierre qui vous suit ; cela avance tout
     * ensemble, comme toujours.
     */
    reveiller() {
        if (this.fige || this.isDemo || !this.niveau) return;
        this.depuisTic = TIC_MS;
    }

    chargerTableau(rang) {
        this.rang = rang % NIVEAUX.length;
        this.niveau = lireNiveau(NIVEAUX[this.rang]);
        this.etat = etatInitial(this.niveau);
        this.reste = this.niveau.secondes * 1000;
        this.depuisTic = 0;
        this.mouvements = [];
        this.avant = { c: this.etat.c, r: this.etat.r };
        this.fige = false;
        this.choc = null;
        this.dernier = null;
        this.demoCoups = null;
        this.majHud();
        this.dire(`Tableau ${this.rang + 1} — ${this.niveau.nom} · `
            + `${this.niveau.ilEnFaut} diamants pour ouvrir la porte`);
    }

    recommencer() {
        this.vies = 3;
        this.diamantsTotal = 0;
        this.finEl.classList.remove('bd-fin--vu');
        this.chargerTableau(0);
        if (!this.raf) this.raf = requestAnimationFrame(this.boucle);
    }

    majHud() {
        const poser = (clef, v) => {
            const el = this.container.querySelector(`[data-${clef}]`);
            if (el) el.textContent = v;
        };
        poser('tableau', this.rang + 1);
        poser('diamants', `${this.etat ? this.etat.pris : 0} / ${this.niveau.ilEnFaut}`);
        poser('vies', this.vies);
        const t = Math.max(0, Math.ceil(this.reste / 1000));
        poser('temps', t);
        const el = this.container.querySelector('[data-temps]');
        if (el) el.classList.toggle('bd-presse', t <= 15);
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
        const dt = this.dernier === null ? 16 : Math.min(60, t - this.dernier);
        this.dernier = t;
        // LE CHOC VIEILLIT MÊME QUAND LE MONDE EST FIGÉ : c'est justement
        // pendant ce gel qu'on le montre.
        if (this.choc) {
            this.choc.t += dt;
            if (this.choc.t > CHOC_MS) this.choc = null;
        }
        if (!this.fige && !this.gelDemo) this.horloge(dt);
        this.dessiner();
        this.raf = requestAnimationFrame(this.boucle);
    };

    horloge(dt) {
        this.reste -= dt;
        if (this.reste <= 0) { this.perdreUneVie('Le temps est écoulé.'); return; }
        this.depuisTic += dt;
        if (this.depuisTic < TIC_MS) { this.majHud(); return; }
        this.depuisTic -= TIC_MS;
        this.unPas();
        this.majHud();
    }

    unPas() {
        const d = this.isDemo ? this.coupDeDemo() : this.dir;
        this.avant = { c: this.etat.c, r: this.etat.r };
        const r = avancer(this.etat, this.niveau, d);
        this.etat = r.etat;
        this.mouvements = r.mouvements;
        for (const fait of r.faits) this.surFait(fait);
    }

    surFait(fait) {
        if (fait === 'diamant') {
            this.dire(`${this.etat.pris} diamant${this.etat.pris > 1 ? 's' : ''} sur `
                + `${this.niveau.ilEnFaut}.`);
        }
        if (fait === 'ouverte') this.dire('La porte est ouverte !');
        if (fait === 'ecrase') {
            // ON LE VOIT AVANT DE LE LIRE. Rémy : « quand un boulet tombe sur
            // nous, il faut qqch de visuel ». Le jeu se figeait, écrivait une
            // phrase sous la grille, et rechargeait une seconde plus tard :
            // l'élève voyait son mineur disparaître sans savoir pourquoi, et
            // la phrase arrivait là où il ne regardait pas.
            //
            // LA CASE EST PRISE MAINTENANT, avant que `chargerTableau` ne
            // remette le tableau à zéro : après, elle n'existe plus.
            this.choc = { c: this.etat.c, r: this.etat.r, t: 0 };
            this.perdreUneVie('Un rocher t\'est tombé dessus.');
        }
        if (fait === 'sortie') this.tableauFini();
    }

    perdreUneVie(pourquoi) {
        if (this.fige) return;
        this.vies--;
        this.fige = true;
        this.majHud();
        if (this.vies > 0) {
            this.dire(`${pourquoi} Il te reste ${this.vies} vie${this.vies > 1 ? 's' : ''}.`);
            const rang = this.rang;
            setTimeout(() => {
                if (!this.isRunning) return;
                // ON REPREND AU TABLEAU, pas au début : un élève qui refait
                // deux tableaux pour atteindre celui où il a échoué abandonne
                // avant d'y arriver. Les diamants déjà sortis restent acquis.
                this.chargerTableau(rang);
            }, 1100);
            return;
        }
        this.terminer('Plus de vies', `Tu es allé jusqu'au tableau ${this.rang + 1}.`);
    }

    tableauFini() {
        this.diamantsTotal += this.etat.pris;
        this.fige = true;
        if (this.rang + 1 >= NIVEAUX.length) {
            this.terminer('Toute la mine !', 'Tu as fini les trois tableaux. On recommence ?');
            return;
        }
        this.dire('Sorti ! Tableau suivant.');
        const suivant = this.rang + 1;
        setTimeout(() => {
            if (!this.isRunning) return;
            this.chargerTableau(suivant);
        }, 1100);
    }

    /**
     * LA PARTIE EST FINIE — et c'est LE SEUL MOMENT OÙ L'ON MARQUE.
     *
     * Le catalogue range Boulder Dash en « 1 partie ». Marquer à chaque
     * tableau terminerait l'activité au premier : mesuré sur Bumpy, le
     * plateau disparaissait quelques secondes après son ouverture. Ce n'est
     * pas un exercice — il n'y a ni bonne ni mauvaise réponse, seulement une
     * partie jouée, et c'est cela qu'on enregistre pour qu'elle compte dans
     * un parcours.
     */
    terminer(titre, texte) {
        this.fige = true;
        if (!this.isDemo) {
            this.onCorrectAnswer(null, null, {
                questionText: `Une partie de Boulder Dash — jusqu'au tableau ${this.rang + 1}`,
                expected: 'une partie', given: `tableau ${this.rang + 1}`,
                points: 10 + this.rang * 10 + this.diamantsTotal * 2
            });
        }
        this.container.querySelector('[data-fin-titre]').textContent = titre;
        this.container.querySelector('[data-fin-texte]').textContent = texte;
        this.finEl.classList.add('bd-fin--vu');
    }

    // ── LE DESSIN ──────────────────────────────────────────────────────────

    dessiner() {
        const g = this.ctx, n = this.niveau;
        if (!g || !n) return;
        const f = Math.min(1, this.depuisTic / TIC_MS);
        g.fillStyle = ENCRE.fond;
        g.fillRect(0, 0, this.toile.width, this.toile.height);

        // LA SECOUSSE EST POSÉE SUR TOUT LE MONDE, pas sur la seule case :
        // c'est la grille entière qui encaisse, et c'est ce qui fait sentir
        // le poids. Elle s'éteint en même temps que le choc.
        //
        // PAS DE SECOUSSE POUR QUI A DEMANDÉ UN ÉCRAN QUI NE BOUGE PAS. Le
        // reste de l'effet — l'éclat, le voile — tient tout seul : on perd le
        // tremblement, jamais l'information.
        const secoue = this.choc && !ecranCalme();
        if (secoue) {
            const part = 1 - this.choc.t / CHOC_MS;
            const a = 7 * part * part;
            g.save();
            g.translate(Math.sin(this.choc.t / 18) * a, Math.cos(this.choc.t / 13) * a * 0.7);
        }

        // LES PIERRES QUI BOUGENT NE SONT PAS DESSINÉES À LEUR PLACE DE
        // GRILLE : on les efface de la grille et on les repose entre les deux
        // cases. C'est tout ce qui sépare une chute d'une téléportation.
        const bouge = new Map(this.mouvements.map(m => [`${m.vers.c},${m.vers.r}`, m]));
        for (let r = 0; r < n.hauteur; r++) {
            for (let c = 0; c < n.largeur; c++) {
                if (bouge.has(`${c},${r}`)) continue;
                this.dessinerTuile(g, n.cases[r][c], c * CASE, r * CASE);
            }
        }
        for (const m of this.mouvements) {
            const x = (m.de.c + (m.vers.c - m.de.c) * f) * CASE;
            const y = (m.de.r + (m.vers.r - m.de.r) * f) * CASE;
            this.dessinerTuile(g, m.t, x, y);
        }
        this.dessinerMineur(g, f);
        if (secoue) g.restore();
        if (this.choc) this.dessinerChoc(g);
    }

    /**
     * L'IMPACT : un éclat, puis un voile.
     *
     * L'ÉCLAT EST DESSINÉ SUR LA CASE DU MINEUR et grandit en s'effaçant —
     * c'est lui qui dit OÙ. Le voile rouge couvre toute la grille et dit QUOI,
     * pour celui qui regardait ailleurs. Les deux ensemble tiennent moins
     * d'une seconde, avant que le tableau ne se recharge.
     */
    dessinerChoc(g) {
        const part = Math.min(1, this.choc.t / CHOC_MS);
        const cx = (this.choc.c + 0.5) * CASE;
        const cy = (this.choc.r + 0.5) * CASE;
        g.save();
        // LE VOILE D'ABORD, SOUS L'ÉCLAT : un éclat lavé par le voile ne se
        // verrait plus, et c'est lui qui porte l'endroit.
        g.fillStyle = `rgba(220, 38, 38, ${(0.30 * (1 - part)).toFixed(3)})`;
        g.fillRect(0, 0, this.toile.width, this.toile.height);
        // ET UN LISERÉ, PARCE QUE LE VOILE SEUL NE SUFFIT PAS. Vu sur la
        // photo : sur la terre ORANGE de la mine, un voile rouge à trente
        // pour cent passe presque inaperçu. Un cadre épais, lui, se voit sur
        // n'importe quel fond, et il prend l'œil de celui qui regardait
        // ailleurs — c'est tout ce qu'on lui demande.
        g.strokeStyle = `rgba(220, 38, 38, ${(0.85 * (1 - part)).toFixed(3)})`;
        g.lineWidth = 12;
        g.strokeRect(6, 6, this.toile.width - 12, this.toile.height - 12);
        g.globalAlpha = Math.max(0, 1 - part);
        g.strokeStyle = '#fde047';
        g.lineWidth = 3.2;
        g.lineCap = 'round';
        const rayon = CASE * (0.4 + part * 1.5);
        for (let i = 0; i < 8; i++) {
            const an = (i / 8) * Math.PI * 2 + 0.2;
            g.beginPath();
            g.moveTo(cx + Math.cos(an) * rayon * 0.42, cy + Math.sin(an) * rayon * 0.42);
            g.lineTo(cx + Math.cos(an) * rayon, cy + Math.sin(an) * rayon);
            g.stroke();
        }
        g.beginPath();
        g.arc(cx, cy, rayon * 0.5, 0, Math.PI * 2);
        g.strokeStyle = '#f87171';
        g.lineWidth = 2.4;
        g.stroke();
        g.restore();
    }

    dessinerTuile(g, t, x, y) {
        if (t === TUILE.ROCHE) {
            g.fillStyle = ENCRE.roche; g.fillRect(x, y, CASE, CASE);
            g.fillStyle = ENCRE.rocheHaut; g.fillRect(x, y, CASE, 4);
        } else if (t === TUILE.TERRE) {
            g.fillStyle = ENCRE.terre; g.fillRect(x, y, CASE, CASE);
            // DES GRAINS, et non un aplat : la terre doit se distinguer d'un
            // mur au premier coup d'œil, et la couleur seule ne suffit jamais.
            g.fillStyle = ENCRE.terreClair;
            for (let i = 0; i < 7; i++) {
                const a = (Math.round(x) * 7 + Math.round(y) * 13 + i * 29) % (CASE - 8) + 4;
                const b = (Math.round(x) * 11 + Math.round(y) * 5 + i * 17) % (CASE - 8) + 4;
                g.fillRect(x + a, y + b, 2.5, 2.5);
            }
        } else if (t === TUILE.ROCHER) {
            // LA PIERRE REMPLIT SA CASE, et c'est une correction d'apparence
            // qui compte : à 0,42 de côté, elle flottait au milieu d'un carré
            // noir, et une pierre PRISE DANS LA TERRE ressemblait à une pierre
            // posée au fond d'un trou. On ne peut pas anticiper une chute si
            // l'on ne voit pas ce qui la retient.
            const cx = x + CASE / 2, cy = y + CASE / 2;
            g.fillStyle = ENCRE.rocher;
            g.beginPath(); g.arc(cx, cy, CASE * .49, 0, Math.PI * 2); g.fill();
            g.fillStyle = ENCRE.rocherClair;
            g.beginPath(); g.arc(cx - CASE * .15, cy - CASE * .15, CASE * .13, 0, Math.PI * 2);
            g.fill();
        } else if (t === TUILE.DIAMANT) {
            const cx = x + CASE / 2, cy = y + CASE / 2, R = CASE * .5;
            g.fillStyle = ENCRE.diamant;
            g.beginPath();
            g.moveTo(cx, cy - R); g.lineTo(cx + R * .85, cy);
            g.lineTo(cx, cy + R); g.lineTo(cx - R * .85, cy);
            g.closePath(); g.fill();
            g.fillStyle = ENCRE.diamantClair;
            g.beginPath();
            g.moveTo(cx, cy - R); g.lineTo(cx + R * .36, cy - R * .25);
            g.lineTo(cx, cy + R * .1); g.lineTo(cx - R * .36, cy - R * .25);
            g.closePath(); g.fill();
        } else if (t === TUILE.SORTIE) {
            const ouverte = this.etat && this.etat.ouverte;
            g.fillStyle = ouverte ? ENCRE.sortie : ENCRE.sortieFermee;
            g.fillRect(x + 3, y + 2, CASE - 6, CASE - 2);
            g.fillStyle = ENCRE.fond;
            g.fillRect(x + 10, y + 11, CASE - 20, CASE - 11);
            if (ouverte) {
                g.fillStyle = '#86efac';
                g.fillRect(x + 10, y + 11, CASE - 20, 3);
            }
        }
    }

    dessinerMineur(g, f) {
        const e = this.etat;
        if (!e) return;
        const x = (this.avant.c + (e.c - this.avant.c) * f + .5) * CASE;
        const y = (this.avant.r + (e.r - this.avant.r) * f + .5) * CASE;
        g.fillStyle = ENCRE.corps;
        g.fillRect(x - 9, y - 1, 18, 14);
        g.fillStyle = ENCRE.peau;
        g.beginPath(); g.arc(x, y - 4, 10, 0, Math.PI * 2); g.fill();
        g.fillStyle = ENCRE.casque;
        g.beginPath(); g.arc(x, y - 6, 10.5, Math.PI, 0); g.fill();
        g.fillRect(x - 13, y - 7, 26, 3);
        // LA LAMPE DU CASQUE : c'est elle qui dit « on est dans une mine »,
        // et elle donne au personnage un haut et un bas lisibles.
        g.fillStyle = '#fff7cc';
        g.beginPath(); g.arc(x, y - 12, 3.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1f2937';
        g.beginPath(); g.arc(x - 3.4, y - 3, 1.9, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + 3.4, y - 3, 1.9, 0, Math.PI * 2); g.fill();
    }

    /**
     * L'APERÇU DU PROFESSEUR : le robot joue, il ne regarde pas.
     *
     * IL JOUE LA PARTIE QUE LE ROBOT DE `core/boulderRobot.js` A TROUVÉE, et
     * non des coups au hasard. Un robot qui tâtonne se fait écraser au
     * vingtième pas — mesuré —, et Rémy verrait un jeu qui perd, ce qui
     * ressemble beaucoup à un jeu cassé.
     */
    coupDeDemo() {
        if (!this.demoCoups) {
            this.demoCoups = faireJouer(NIVEAUX[this.rang]).coups;
            this.demoPas = 0;
        }
        return this.demoCoups[this.demoPas++] || null;
    }

    async runDemoSequence() {
        this.startGameLoop();
    }

    destroy() {
        document.removeEventListener('keydown', this._bas);
        document.removeEventListener('keyup', this._haut);
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        super.destroy();
    }
}

export function engineBoulderDash(container, isDemo, params) {
    const game = new BoulderDash(container, isDemo, params);
    game.start();
    return game;
}
