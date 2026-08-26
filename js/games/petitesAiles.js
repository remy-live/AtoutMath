// LES PETITES AILES — à l'écran.
//
// Rémy : « J'adorerais le jeu Tiny Wings sur iPhone. » Puis, après l'avoir
// essayé : « Je ne comprends pas. N'en fais pas un jeu mathématiques et on
// accélère en cliquant ou en appuyant sur la barre d'espace. C'est plus un jeu
// de réflexe et on peut passer de monde à monde. »
//
// LES NOMBRES SONT PARTIS. Ils flottaient au-dessus des collines et il fallait
// n'avaler que les multiples de 7 : deux jeux dans le même écran, l'un qui
// demande de sentir le relief, l'autre de calculer. On ne fait bien ni l'un ni
// l'autre — et l'on ne comprend ni pourquoi on perd un cœur, ni ce qu'on
// attend de nous. Il ne reste que le vol.
//
// UNE SEULE TOUCHE, ET ON LE DIT. Clic, doigt ou barre d'espace : on appuie
// pour PLONGER — c'est là qu'on prend de la vitesse —, on relâche pour planer.
// C'est écrit en toutes lettres sur l'écran de départ, qui reste tant qu'on n'a
// pas appuyé une première fois, et une jauge montre la vitesse pendant qu'on
// joue. « Je ne comprends pas » était d'abord un défaut d'annonce.
//
// LA NUIT COURT DERRIÈRE, et c'est elle qui fait le RÉFLEXE. Un mur d'ombre
// avance à vitesse constante ; flâner, c'est se faire prendre. Aller vite n'est
// plus un score, c'est la condition pour continuer.
//
// ET L'ON PASSE DE MONDE EN MONDE. Six mondes, chacun avec son relief, sa
// palette et sa nuit plus rapide. Franchir une frontière repousse la nuit :
// c'est la respiration qu'on s'est gagnée, et c'est ce qui donne envie d'y
// aller.
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
    MONDES, SOL_MOYEN, mondeDe, progressionMonde, relief, pas, etatInitial,
    semerEtoile, ECART_ETOILES, avancerNuit, rattrape, RECUL_ETOILE, RECUL_MONDE,
    qualiteAiles, VX_MAX, VX_MIN
} from '../core/petitesAiles.js';

/** L'avance donnée à l'oiseau au départ : le temps de comprendre le geste. */
const AVANCE_DEPART = 1500;

class PetitesAiles extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'petites-ailes');
        this.graine = this.params.seed || 'pa';
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
                    display: flex; gap: 10px; align-items: center; justify-content: space-between;
                    font-weight: 800; color: #12324a; pointer-events: none;
                    text-shadow: 0 1px 0 rgba(255,255,255,.6);
                    font-size: clamp(12px, 2.6vh, 17px);
                }
                .pa-monde {
                    background: rgba(255,255,255,.86); border-radius: 999px;
                    padding: 4px 14px; color: #1a365d; white-space: nowrap;
                }
                /* LA BARRE DIT COMBIEN IL RESTE AVANT LE MONDE SUIVANT. C'est
                   la seule façon de rendre le but VISIBLE : sans elle, « on peut
                   passer de monde à monde » reste une promesse dont rien à
                   l'écran ne dit où elle en est. */
                .pa-jauge {
                    flex: 1 1 auto; max-width: 260px; height: 9px; border-radius: 999px;
                    background: rgba(255,255,255,.6); overflow: hidden;
                    box-shadow: inset 0 0 0 1px rgba(26,54,93,.18);
                }
                .pa-jauge i { display: block; height: 100%; background: #f6ad55; width: 0; }
                /* L'ÉCRAN DE DÉPART EXPLIQUE LE GESTE, ET RIEN D'AUTRE. Il
                   reste tant qu'on n'a pas appuyé : personne ne peut commencer
                   sans avoir lu la seule chose à savoir. */
                .pa-depart {
                    position: absolute; inset: 0; display: flex;
                    flex-direction: column; align-items: center; justify-content: center;
                    gap: 8px; text-align: center; padding: 20px;
                    background: rgba(12, 38, 60, .55); color: #fff; pointer-events: none;
                }
                .pa-depart h3 { margin: 0; font-size: clamp(19px, 4.4vh, 34px); }
                .pa-depart p { margin: 0; font-weight: 600; font-size: clamp(13px, 2.8vh, 19px); }
                .pa-depart small { opacity: .85; font-weight: 600; }
                .pa-depart--parti { display: none; }
                .pa-touche {
                    display: inline-block; padding: 2px 10px; border-radius: 7px;
                    background: rgba(255,255,255,.22); border: 1px solid rgba(255,255,255,.5);
                }
                /* LA BANNIÈRE DE MONDE : elle traverse l'écran une seconde et
                   demie, puis s'efface. Un changement de monde qui ne se dit pas
                   ressemble à un bug de couleurs. */
                .pa-banniere {
                    position: absolute; left: 50%; top: 26%; transform: translate(-50%, -6px);
                    padding: 8px 22px; border-radius: 999px; font-weight: 900;
                    background: rgba(255,255,255,.94); color: #1a365d;
                    font-size: clamp(15px, 3.4vh, 25px); pointer-events: none;
                    opacity: 0; transition: opacity .25s, transform .25s;
                }
                .pa-banniere--vu { opacity: 1; transform: translate(-50%, 0); }
                .pa-fin {
                    position: absolute; inset: 0; display: none;
                    flex-direction: column; align-items: center; justify-content: center;
                    gap: 10px; background: rgba(10, 30, 48, .78); color: #fff;
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
                    <span class="pa-monde" id="pa-monde"></span>
                    <span class="pa-jauge"><i id="pa-jauge"></i></span>
                    <span id="pa-score"></span>
                </div>
                <div class="pa-banniere" id="pa-banniere"></div>
                <div class="pa-depart" id="pa-depart">
                    <h3>Les Petites Ailes</h3>
                    <p>Appuie pour <b>plonger</b> — relâche pour <b>planer</b>.</p>
                    <p><span class="pa-touche">clic</span> ou
                       <span class="pa-touche">espace</span></p>
                    <small>Plonge dans la descente : c'est là que la vitesse se gagne.<br>
                    La nuit court derrière toi.</small>
                </div>
                <div class="pa-fin" id="pa-fin">
                    <h3 id="pa-fin-titre"></h3>
                    <p id="pa-fin-texte"></p>
                    <button type="button" class="pa-rejouer" id="pa-rejouer">Rejouer</button>
                </div>
            </div>`;
        this.wrap = this.container.querySelector('#pa-wrap');
        this.toile = this.container.querySelector('#pa-toile');
        this.ctx = this.toile.getContext('2d');
        this.mondeEl = this.container.querySelector('#pa-monde');
        this.jaugeEl = this.container.querySelector('#pa-jauge');
        this.scoreEl = this.container.querySelector('#pa-score');
        this.banniereEl = this.container.querySelector('#pa-banniere');
        this.departEl = this.container.querySelector('#pa-depart');
        this.finEl = this.container.querySelector('#pa-fin');
        this.container.querySelector('#pa-rejouer').onclick = () => this.commencer();

        this.appuie = false;
        // UN APPUI SUR LE JEU EST UN APPUI SUR LE JEU, y compris le tout
        // premier : celui qui fait disparaître l'écran de départ doit AUSSI
        // faire plonger. Demander deux appuis pour un jeu à une touche serait
        // le premier malentendu.
        const bas = (e) => { this.appuie = true; this.demarre = true; e.preventDefault(); };
        const haut = () => { this.appuie = false; };
        this.wrap.addEventListener('pointerdown', bas);
        window.addEventListener('pointerup', haut);
        this.surTouche = (e) => {
            if (e.code !== 'Space' && e.key !== ' ') return;
            e.preventDefault();
            this.appuie = e.type === 'keydown';
            if (this.appuie) this.demarre = true;
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
        this.monde = MONDES[0];
        this.grainePaysage = this.rng.int(0, 999) / 100;
        this.etat = etatInitial(this.monde, this.grainePaysage);
        this.etoiles = [];
        this.prochaineEtoile = 400;
        this.ramassees = 0;
        // LA NUIT PART LOIN DERRIÈRE. Le temps de lire l'écran de départ, de
        // comprendre le geste et de rater les trois premières bosses.
        this.nuit = -AVANCE_DEPART;
        this.demarre = this.isDemo;
        this.fini = false;
        this.finEl.classList.remove('pa-fin--vu');
        this.departEl.classList.toggle('pa-depart--parti', !!this.demarre);
        this.banniereEl.classList.remove('pa-banniere--vu');
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
        // TANT QU'ON N'A PAS APPUYÉ, LA NUIT ATTEND. L'oiseau glisse déjà —
        // c'est plus joli qu'une image figée — mais personne ne doit perdre
        // pendant qu'il lit la consigne.
        const avant = this.monde;
        this.monde = mondeDe(this.etat.x);
        this.etat = pas(this.etat, dt, this.appuie && !this.isDemo, this.monde,
            this.grainePaysage);
        if (this.demarre && !this.isDemo) this.nuit = avancerNuit(this.nuit, dt, this.monde);

        if (this.monde.id !== avant.id) this.passerMonde();

        // On sème les étoiles devant l'oiseau, jamais derrière.
        while (this.prochaineEtoile < this.etat.x + 1400) {
            this.etoiles.push(semerEtoile(this.prochaineEtoile, this.monde,
                this.grainePaysage, this.rng));
            this.prochaineEtoile += ECART_ETOILES + this.rng.int(0, 190);
        }
        this.etoiles = this.etoiles.filter(e => e.x > this.etat.x - 400);

        for (const e of this.etoiles) {
            if (e.prise) continue;
            if (Math.abs(e.x - this.etat.x) > 34) continue;
            if (Math.abs(e.y - this.etat.y) > 40) continue;
            e.prise = true;
            this.ramassees++;
            this.nuit -= RECUL_ETOILE;
        }

        if (this.demarre && !this.isDemo && rattrape(this.nuit, this.etat.x)) this.terminer();
        this.majHud();
    }

    /** Une frontière franchie : on l'annonce, et la nuit recule. */
    passerMonde() {
        this.nuit -= RECUL_MONDE;
        this.banniere(`Monde ${this.monde.id} — ${this.monde.nom}`);
        if (this.isDemo) return;
        // LE SEUL MOMENT OÙ L'ON MARQUE. Ce n'est pas un exercice : il n'y a ni
        // bonne ni mauvaise réponse, seulement un cap franchi — et c'est cela
        // qu'on enregistre, pour que la partie compte dans un parcours.
        this.onCorrectAnswer(null, null, {
            questionText: `Atteindre ${this.monde.nom}`,
            expected: this.monde.nom, given: this.monde.nom,
            points: 12 + this.monde.id * 4
        });
    }

    banniere(texte) {
        this.banniereEl.textContent = texte;
        this.banniereEl.classList.add('pa-banniere--vu');
        clearTimeout(this.tempoBanniere);
        this.tempoBanniere = setTimeout(() => {
            this.banniereEl.classList.remove('pa-banniere--vu');
        }, 1800);
    }

    terminer() {
        this.fini = true;
        const q = qualiteAiles(this.etat.x / 10, this.monde.id, this.ramassees);
        this.container.querySelector('#pa-fin-titre').textContent =
            `La nuit t'a rattrapé — monde ${q.monde}`;
        this.container.querySelector('#pa-fin-texte').textContent =
            `${this.monde.nom} · ${q.distance} m · ${q.etoiles} étoile`
            + `${q.etoiles > 1 ? 's' : ''} ramassée${q.etoiles > 1 ? 's' : ''}.`;
        this.finEl.classList.add('pa-fin--vu');
    }

    majHud() {
        const p = progressionMonde(this.etat.x);
        this.mondeEl.textContent = `Monde ${p.monde.id} · ${p.monde.nom}`;
        this.jaugeEl.style.width = `${Math.round(Math.max(0, Math.min(1, p.part)) * 100)}%`;
        this.scoreEl.textContent = `${Math.round(this.etat.x / 10)} m · ⭐ ${this.ramassees}`;
        if (this.demarre) this.departEl.classList.add('pa-depart--parti');
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
        const M = this.monde;

        // Le ciel, à la couleur du monde.
        const ciel = c.createLinearGradient(0, 0, 0, haut);
        ciel.addColorStop(0, M.ciel[0]);
        ciel.addColorStop(1, M.ciel[1]);
        c.fillStyle = ciel;
        c.fillRect(0, 0, larg, haut);

        // Deux collines d'arrière-plan, tirées du même relief : la profondeur
        // sans un dessin de plus.
        const couches = [
            { part: 0.35, teinte: M.fond[0], decalage: 90 },
            { part: 0.62, teinte: M.fond[1], decalage: 40 }
        ];
        for (const k of couches) {
            c.fillStyle = k.teinte;
            c.beginPath();
            c.moveTo(0, haut);
            for (let px = 0; px <= larg; px += 6) {
                const xm = camX * k.part + px / e;
                const s = relief(xm, M, this.grainePaysage);
                const y = SOL_MOYEN + (s.hauteur - SOL_MOYEN) * k.part - k.decalage;
                c.lineTo(px, versEcran(y));
            }
            c.lineTo(larg, haut);
            c.closePath();
            c.fill();
        }

        // Le relief de jeu.
        c.fillStyle = M.sol;
        c.beginPath();
        c.moveTo(0, haut);
        for (let px = 0; px <= larg; px += 4) {
            const s = relief(camX + px / e, M, this.grainePaysage);
            c.lineTo(px, versEcran(s.hauteur));
        }
        c.lineTo(larg, haut);
        c.closePath();
        c.fill();
        // Le liseré clair, qui donne l'herbe.
        c.strokeStyle = M.herbe;
        c.lineWidth = 5 * e;
        c.beginPath();
        for (let px = 0; px <= larg; px += 4) {
            const s = relief(camX + px / e, M, this.grainePaysage);
            const y = versEcran(s.hauteur);
            if (px === 0) c.moveTo(px, y); else c.lineTo(px, y);
        }
        c.stroke();

        // Les étoiles.
        for (const et of this.etoiles) {
            if (et.prise) continue;
            const px = versEcranX(et.x);
            if (px < -40 || px > larg + 40) continue;
            this.dessinerEtoile(px, versEcran(et.y), 13 * e);
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

        // Les traits de vitesse derrière l'oiseau quand ça file.
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

        this.dessinerNuit(c, larg, haut, versEcranX);
        this.dessinerVitesse(c, larg, haut);
    }

    /**
     * LE MUR DE NUIT — un dégradé, pas un rectangle noir.
     *
     * On doit le voir ARRIVER, et sentir qu'il gagne du terrain sans qu'il
     * masque ce qu'on est en train de faire. Un dégradé sur deux cent quarante
     * pixels assombrit le bord de l'écran bien avant de toucher l'oiseau :
     * c'est l'avertissement, et c'est lui qui fait accélérer.
     */
    dessinerNuit(c, larg, haut, versEcranX) {
        const px = versEcranX(this.nuit);
        if (px < -260) return;
        const g = c.createLinearGradient(px - 240, 0, px, 0);
        g.addColorStop(0, 'rgba(9, 14, 38, 0)');
        g.addColorStop(0.55, 'rgba(9, 14, 38, .45)');
        g.addColorStop(1, 'rgba(9, 14, 38, .92)');
        c.fillStyle = g;
        c.fillRect(px - 240, 0, 240, haut);
        // Et tout ce qui est DERRIÈRE le mur est déjà nuit noire.
        c.fillStyle = 'rgba(9, 14, 38, .96)';
        c.fillRect(Math.min(px, larg) - larg, 0, larg, haut);
    }

    /**
     * LA JAUGE DE VITESSE, EN BAS.
     *
     * « On accélère en cliquant » ne veut rien dire si l'accélération ne se voit
     * pas. Une barre qui se remplit pendant qu'on plonge dans la descente, et
     * qui se vide quand on s'obstine à appuyer dans la côte, apprend le geste en
     * trois secondes — mieux que n'importe quelle phrase.
     */
    dessinerVitesse(c, larg, haut) {
        const part = Math.max(0, Math.min(1, (this.etat.vx - VX_MIN) / (VX_MAX - VX_MIN)));
        const w = Math.min(220, larg * 0.42), h = 9;
        const x = (larg - w) / 2, y = haut - 22;
        c.fillStyle = 'rgba(255,255,255,.55)';
        c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.fill();
        c.fillStyle = part > 0.66 ? '#e04a3a' : (part > 0.33 ? '#f6ad55' : '#63b3ed');
        c.beginPath(); c.roundRect(x, y, Math.max(h, w * part), h, h / 2); c.fill();
        c.fillStyle = 'rgba(18,50,74,.85)';
        c.font = '800 11px system-ui, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'bottom';
        c.fillText('vitesse', larg / 2, y - 3);
    }

    dessinerEtoile(cx, cy, r) {
        const c = this.ctx;
        c.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = (Math.PI / 5) * i - Math.PI / 2;
            const rr = i % 2 ? r * 0.44 : r;
            const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.closePath();
        c.fillStyle = '#ffd76a';
        c.fill();
        c.lineWidth = Math.max(1.4, r * 0.16);
        c.strokeStyle = '#c47f16';
        c.stroke();
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
        cur.say('Une seule touche — clic, doigt ou barre d\'espace. Tu appuies pour '
            + 'PLONGER, tu relâches pour planer. Il n\'y a rien à calculer : c\'est un jeu '
            + 'd\'adresse.', this.wrap);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say('Appuie dans la DESCENTE — tu prends de la vitesse — et relâche au '
            + 'sommet : la bosse te met en l\'air, et tu sautes toute la côte suivante. '
            + 'Regarde la jauge de vitesse en bas.', this.wrap);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Le robot joue parfaitement pendant quelques secondes.
        for (let i = 0; i < 260 && this.isRunning; i++) {
            const sol = relief(this.etat.x, this.monde, this.grainePaysage);
            this.appuie = sol.pente < 0;
            if (!await cur.pause(16)) break;
        }
        this.appuie = false;
        if (!this.isRunning) return fin();

        cur.say('Et il faut aller vite : la nuit court derrière toi. Chaque frontière '
            + 'franchie ouvre un nouveau monde et la repousse — il y en a six.',
        this.mondeEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        clearTimeout(this.tempoBanniere);
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
