// LES PETITES AILES — à l'écran.
//
// Rémy : « J'adorerai le jeu Tiny Wings sur iPhone. »
//
// UNE SEULE TOUCHE, DU DÉBUT À LA FIN. On appuie n'importe où pour plonger, on
// relâche pour planer. Il n'y a rien d'autre à apprendre, et c'est ce qui fait
// tenir ce jeu-là : le geste est immédiat, la maîtrise ne l'est pas.
//
// LES MATHS SONT DANS LE DÉCOR, PAS DANS UN FORMULAIRE. Une consigne est
// annoncée — « avale les multiples de 7 » — et des nombres flottent au-dessus
// des collines. Poser une question au clavier arrêterait le vol ; ici, décider
// en une fraction de seconde si 63 convient EST le jeu. Quand on se trompe, on
// ne perd pas seulement une vie : on lit pourquoi.
//
// LE DESSIN SE FAIT SUR UNE TOILE, en coordonnées de MONDE converties une seule
// fois par image. Le terrain se redessine à chaque image parce qu'il est une
// fonction — on ne stocke aucun point, on demande la hauteur là où l'on en a
// besoin. Deux couches d'arrière-plan, tirées du même relief à amplitude
// réduite, donnent la profondeur sans coûter un dessin de plus.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    ZONES, SOL_MOYEN, zoneDe, relief, pas, etatInitial, tirerConsigne, tirerVolee,
    convient, pourquoiPas, qualiteAiles, VX_MAX
} from '../core/petitesAiles.js';

const COMPETENCE = 'num.aile.reconnaitre';

/** Combien de nombres on croise avant que la consigne change. */
const PAR_CONSIGNE = 8;

class PetitesAiles extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'petites-ailes');
        this.graine = this.params.seed || 'pa';
        this.vies = 3;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .pa-wrap {
                    position: relative; width: 100%; height: 100%;
                    overflow: hidden; touch-action: none; cursor: pointer;
                    user-select: none; -webkit-user-select: none;
                    background: #bfe6ff;
                }
                .pa-toile { display: block; width: 100%; height: 100%; }
                .pa-hud {
                    position: absolute; left: 0; right: 0; top: 0; padding: 8px 12px;
                    display: flex; gap: 12px; align-items: center; justify-content: space-between;
                    font-weight: 800; color: #12324a; pointer-events: none;
                    text-shadow: 0 1px 0 rgba(255,255,255,.6);
                    font-size: clamp(12px, 2.6vh, 17px);
                }
                .pa-consigne {
                    background: rgba(255,255,255,.82); border-radius: 999px;
                    padding: 4px 14px; color: #1a365d;
                }
                .pa-vies { letter-spacing: 2px; }
                .pa-note {
                    position: absolute; left: 50%; bottom: 14%; transform: translateX(-50%);
                    max-width: 88%; text-align: center; font-weight: 700;
                    background: rgba(255,255,255,.92); border-radius: 12px;
                    padding: 8px 14px; color: #742a2a; pointer-events: none;
                    font-size: clamp(12px, 2.5vh, 16px);
                    opacity: 0; transition: opacity .18s;
                }
                .pa-note--vu { opacity: 1; }
                .pa-fin {
                    position: absolute; inset: 0; display: none;
                    flex-direction: column; align-items: center; justify-content: center;
                    gap: 10px; background: rgba(10, 30, 48, .72); color: #fff;
                    text-align: center; padding: 18px;
                }
                .pa-fin--vu { display: flex; }
                .pa-fin h3 { margin: 0; font-size: clamp(18px, 4vh, 30px); }
                .pa-fin p { margin: 0; font-weight: 600; font-size: clamp(12px, 2.6vh, 17px); }
                .pa-rejouer {
                    margin-top: 6px; padding: 9px 22px; border-radius: 999px;
                    border: 0; background: #6d5cf6; color: #fff; font-weight: 800;
                    cursor: pointer; font-size: clamp(13px, 2.8vh, 18px);
                }
            </style>
            <div class="pa-wrap" id="pa-wrap">
                <canvas class="pa-toile" id="pa-toile"></canvas>
                <div class="pa-hud">
                    <span class="pa-consigne" id="pa-consigne"></span>
                    <span id="pa-score"></span>
                    <span class="pa-vies" id="pa-vies"></span>
                </div>
                <div class="pa-note" id="pa-note"></div>
                <div class="pa-fin" id="pa-fin">
                    <h3 id="pa-fin-titre"></h3>
                    <p id="pa-fin-texte"></p>
                    <button type="button" class="pa-rejouer" id="pa-rejouer">Rejouer</button>
                </div>
            </div>`;
        this.wrap = this.container.querySelector('#pa-wrap');
        this.toile = this.container.querySelector('#pa-toile');
        this.ctx = this.toile.getContext('2d');
        this.consigneEl = this.container.querySelector('#pa-consigne');
        this.scoreEl = this.container.querySelector('#pa-score');
        this.viesEl = this.container.querySelector('#pa-vies');
        this.noteEl = this.container.querySelector('#pa-note');
        this.finEl = this.container.querySelector('#pa-fin');
        this.container.querySelector('#pa-rejouer').onclick = () => this.commencer();

        this.appuie = false;
        const bas = (e) => { this.appuie = true; e.preventDefault(); };
        const haut = () => { this.appuie = false; };
        this.wrap.addEventListener('pointerdown', bas);
        window.addEventListener('pointerup', haut);
        this.surTouche = (e) => {
            if (e.code !== 'Space' && e.key !== ' ') return;
            e.preventDefault();
            this.appuie = e.type === 'keydown';
        };
        window.addEventListener('keydown', this.surTouche);
        window.addEventListener('keyup', this.surTouche);
        this.detacher = () => {
            this.wrap.removeEventListener('pointerdown', bas);
            window.removeEventListener('pointerup', haut);
            window.removeEventListener('keydown', this.surTouche);
            window.removeEventListener('keyup', this.surTouche);
        };

        this.commencer();
    }

    commencer() {
        this.rng = makeRng(this.graine);
        this.graine = `${this.graine}+`;
        this.zone = ZONES[0];
        this.grainePaysage = this.rng.int(0, 999) / 100;
        this.etat = etatInitial(this.zone, this.grainePaysage);
        this.consigne = tirerConsigne(this.rng);
        this.bulles = [];
        this.prochaineBulle = 340;
        this.restantConsigne = PAR_CONSIGNE;
        this.bons = 0;
        this.rates = 0;
        this.vies = 3;
        this.fini = false;
        this.finEl.classList.remove('pa-fin--vu');
        this.note('');
        this.majHud();
        this.dernier = null;
        if (!this.raf) this.raf = requestAnimationFrame(this.boucle);
    }

    boucle = (t) => {
        this.raf = null;
        if (!this.isRunning || !this.toile || !this.toile.isConnected) return;
        const dt = this.dernier === null ? 1 / 60
            // UN PAS BORNÉ : quand l'onglet revient au premier plan après une
            // minute, l'écart vaut soixante secondes et l'oiseau traverse la
            // carte d'un bond. On plafonne à trois images.
            : Math.min(0.05, (t - this.dernier) / 1000);
        this.dernier = t;
        if (!this.fini) this.avancer(dt);
        this.dessiner();
        this.raf = requestAnimationFrame(this.boucle);
    };

    avancer(dt) {
        this.zone = zoneDe(this.etat.x);
        this.etat = pas(this.etat, dt, this.appuie && !this.isDemo, this.zone,
            this.grainePaysage);

        // On sème les nombres devant l'oiseau, jamais derrière.
        while (this.prochaineBulle < this.etat.x + 1400) {
            const x = this.prochaineBulle;
            const sol = relief(x, this.zone, this.grainePaysage);
            const valeurs = tirerVolee(this.rng, this.consigne, 1);
            // À PORTÉE DE L'OISEAU QUI GLISSE, et pas seulement de celui qui
            // vole. Semés soixante à cent quatre-vingts pixels au-dessus du sol,
            // ils étaient inatteignables tant qu'on restait sur les collines :
            // six secondes de jeu, zéro nombre avalé. Le vol doit rapporter
            // davantage, pas être la seule façon de marquer.
            this.bulles.push({
                x, y: sol.hauteur + 18 + this.rng.int(0, 55),
                v: valeurs[0], pris: false
            });
            this.prochaineBulle += 260 + this.rng.int(0, 200) / this.zone.cadeaux;
        }
        this.bulles = this.bulles.filter(b => b.x > this.etat.x - 400);

        // La collision : un simple disque autour de l'oiseau.
        for (const b of this.bulles) {
            if (b.pris) continue;
            if (Math.abs(b.x - this.etat.x) > 34) continue;
            if (Math.abs(b.y - this.etat.y) > 40) continue;
            b.pris = true;
            this.avaler(b.v);
        }
        this.majHud();
    }

    avaler(v) {
        if (convient(this.consigne, v)) {
            this.bons++;
            this.note('');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Avale ${this.consigne.titre}`,
                expected: 'oui', given: String(v), points: 6
            });
        } else {
            this.rates++;
            this.vies--;
            this.note(pourquoiPas(this.consigne, v));
            this.onWrongAnswer(null, {
                questionText: `Avale ${this.consigne.titre}`,
                expected: this.consigne.titre, given: String(v),
                concept: COMPETENCE
            });
            if (this.vies <= 0) return this.terminer();
        }
        this.restantConsigne--;
        if (this.restantConsigne <= 0) {
            this.consigne = tirerConsigne(this.rng, this.consigne.id);
            this.restantConsigne = PAR_CONSIGNE;
            // Les nombres déjà semés suivaient l'ancienne consigne : on les
            // retire plutôt que de les faire mentir.
            this.bulles = this.bulles.filter(b => b.pris);
            this.prochaineBulle = this.etat.x + 500;
        }
    }

    terminer() {
        this.fini = true;
        const q = qualiteAiles(this.etat.x / 10, this.bons, this.rates);
        this.container.querySelector('#pa-fin-titre').textContent =
            `${q.distance} m parcourus`;
        this.container.querySelector('#pa-fin-texte').textContent =
            `${q.bons} bons nombres avalés, ${q.rates} ratés — ${q.taux} % de réussite.`;
        this.finEl.classList.add('pa-fin--vu');
    }

    majHud() {
        this.consigneEl.textContent = `Avale ${this.consigne.titre}`;
        this.scoreEl.textContent = `${Math.round(this.etat.x / 10)} m · ${this.bons} ✓`;
        this.viesEl.textContent = '❤️'.repeat(Math.max(0, this.vies));
    }

    note(texte) {
        this.noteEl.textContent = texte || '';
        this.noteEl.classList.toggle('pa-note--vu', !!texte);
    }

    /** La caméra : l'oiseau au tiers gauche, l'altitude suivie de loin. */
    dessiner() {
        const c = this.ctx, toile = this.toile;
        const larg = this.wrap.clientWidth, haut = this.wrap.clientHeight;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (toile.width !== Math.round(larg * dpr) || toile.height !== Math.round(haut * dpr)) {
            toile.width = Math.round(larg * dpr);
            toile.height = Math.round(haut * dpr);
        }
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, larg, haut);

        // L'ÉCHELLE SUIT LA LARGEUR, PAS LA HAUTEUR. Dans un jeu à défilement,
        // ce qui compte est de VOIR DEVANT : il faut au moins une colline
        // d'avance pour décider quand appuyer. Réglée sur la hauteur, l'échelle
        // donnait sur un téléphone en portrait un oiseau énorme et une demi-
        // colline visible — impossible d'anticiper quoi que ce soit. Le
        // plancher, lui, garde l'oiseau assez gros pour qu'on le voie.
        const e = Math.max(0.6, Math.min(1.3, larg / 900));
        const camX = this.etat.x - (larg / e) * 0.32;
        // L'altitude de l'écran suit l'oiseau mollement : sans cela l'image
        // saute à chaque bosse et l'on a le mal de mer.
        const viseY = this.etat.y;
        this.camY = this.camY === undefined ? viseY : this.camY + (viseY - this.camY) * 0.08;
        const versEcran = (y) => haut * 0.62 - (y - this.camY) * e;
        const versEcranX = (x) => (x - camX) * e;

        // Le ciel.
        const ciel = c.createLinearGradient(0, 0, 0, haut);
        ciel.addColorStop(0, '#9fd8ff');
        ciel.addColorStop(1, '#e8f6ff');
        c.fillStyle = ciel;
        c.fillRect(0, 0, larg, haut);

        // Deux collines d'arrière-plan, tirées du même relief : la profondeur
        // sans un dessin de plus.
        const couches = [
            { part: 0.35, teinte: '#a9c8e8', decalage: 90 },
            { part: 0.62, teinte: '#87b0d8', decalage: 40 }
        ];
        for (const k of couches) {
            c.fillStyle = k.teinte;
            c.beginPath();
            c.moveTo(0, haut);
            for (let px = 0; px <= larg; px += 6) {
                const xm = camX * k.part + px / e;
                const s = relief(xm, this.zone, this.grainePaysage);
                const y = SOL_MOYEN + (s.hauteur - SOL_MOYEN) * k.part - k.decalage;
                c.lineTo(px, versEcran(y));
            }
            c.lineTo(larg, haut);
            c.closePath();
            c.fill();
        }

        // Le relief de jeu.
        c.fillStyle = '#2f855a';
        c.beginPath();
        c.moveTo(0, haut);
        for (let px = 0; px <= larg; px += 4) {
            const s = relief(camX + px / e, this.zone, this.grainePaysage);
            c.lineTo(px, versEcran(s.hauteur));
        }
        c.lineTo(larg, haut);
        c.closePath();
        c.fill();
        // Le liseré clair, qui donne l'herbe.
        c.strokeStyle = '#68d391';
        c.lineWidth = 5 * e;
        c.beginPath();
        for (let px = 0; px <= larg; px += 4) {
            const s = relief(camX + px / e, this.zone, this.grainePaysage);
            const y = versEcran(s.hauteur);
            if (px === 0) c.moveTo(px, y); else c.lineTo(px, y);
        }
        c.stroke();

        // Les nombres.
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        for (const b of this.bulles) {
            if (b.pris) continue;
            const px = versEcranX(b.x);
            if (px < -60 || px > larg + 60) continue;
            const py = versEcran(b.y);
            const r = 22 * e;
            c.beginPath();
            c.arc(px, py, r, 0, Math.PI * 2);
            c.fillStyle = 'rgba(255,255,255,.93)';
            c.fill();
            c.lineWidth = 3 * e;
            c.strokeStyle = '#4c3fd0';
            c.stroke();
            c.fillStyle = '#1a365d';
            c.font = `800 ${Math.round((b.v > 99 ? 16 : 19) * e)}px system-ui, sans-serif`;
            c.fillText(String(b.v), px, py + 1);
        }

        // L'oiseau : un disque, une aile, un bec. Il pique quand on appuie.
        const ox = versEcranX(this.etat.x), oy = versEcran(this.etat.y + 20);
        const angle = Math.max(-1.1, Math.min(1.1,
            -Math.atan2(this.etat.vy, Math.max(60, this.etat.vx))));
        c.save();
        c.translate(ox, oy);
        c.rotate(-angle);
        c.scale(e, e);
        c.fillStyle = '#f6ad55';
        c.beginPath(); c.moveTo(16, 0); c.lineTo(4, -5); c.lineTo(4, 5); c.closePath(); c.fill();
        c.fillStyle = this.appuie ? '#e04a3a' : '#ecc94b';
        c.beginPath(); c.arc(0, 0, 15, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#8a5f11'; c.lineWidth = 2.5; c.stroke();
        c.fillStyle = '#d69e2e';
        c.beginPath(); c.ellipse(-4, 2, 10, 6, -0.4, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#1a202c';
        c.beginPath(); c.arc(6, -4, 2.6, 0, Math.PI * 2); c.fill();
        c.restore();

        // La jauge de vitesse : trois traits derrière l'oiseau quand ça file.
        const part = Math.max(0, (this.etat.vx - 200) / (VX_MAX - 200));
        if (part > 0.15) {
            c.strokeStyle = `rgba(255,255,255,${Math.min(0.75, part)})`;
            c.lineWidth = 3 * e;
            for (let i = 0; i < 3; i++) {
                const ly = oy + (-10 + i * 10) * e;
                c.beginPath();
                c.moveTo(ox - (24 + part * 40) * e, ly);
                c.lineTo(ox - 18 * e, ly);
                c.stroke();
            }
        }
    }

    /**
     * Le robot montre LE GESTE, qui tient en une phrase et se sent en dix
     * secondes : appuyer dans la descente, relâcher au sommet.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Une seule touche : tu appuies pour PLONGER, tu relâches pour planer. '
            + 'Appuie dans la descente — tu prends de la vitesse — et relâche au sommet : '
            + 'la bosse te met en l\'air, et tu sautes toute la côte suivante.', this.wrap);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Le robot joue parfaitement pendant quelques secondes.
        this.demoJoue = true;
        for (let i = 0; i < 260 && this.isRunning; i++) {
            const sol = relief(this.etat.x, this.zone, this.grainePaysage);
            this.appuie = sol.pente < 0;
            if (!await cur.pause(16)) break;
        }
        this.appuie = false;
        this.demoJoue = false;
        if (!this.isRunning) return fin();

        cur.say(`Et les maths sont dans le décor : ${this.consigneEl.textContent.toLowerCase()}. `
            + 'Décider en une seconde si un nombre convient, c\'est exactement ce qu\'on '
            + 'veut savoir faire sans réfléchir.', this.consigneEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        if (this.detacher) this.detacher();
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function enginePetitesAiles(container, isDemo, params) {
    const game = new PetitesAiles(container, isDemo, params);
    game.start();
    return game;
}
