// LES PETITES AILES — à l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 22 novembre, en m'envoyant un jeu complet écrit ailleurs : « je préfère
// ce tiny wings […] Tu refais tout le jeu à partir de ce que j'ai donné […] Ne
// mets pas le son. »
//
// ── CE QUE SES CAPTURES DISAIENT, ET QUE J'AVAIS MAL LU ──────────────────────
//
// Deux jours plus tôt, il m'avait écrit « ça a un plus bel habillage » avec
// quatre captures de Tiny Wings. J'y avais vu des bandes qui TRAVERSENT la
// colline en diagonale, et j'avais passé une journée à en poser.
//
// ELLES NE LA TRAVERSENT PAS, ELLES LA SUIVENT. Chaque strate est une copie de
// la silhouette décalée vers le bas, dans un ton plus chaud que celle du
// dessus : du jaune pâle sous l'herbe, de l'orange au milieu, du brun en
// profondeur. C'est une terre qu'on a coupée en deux, pas une colline rayée —
// et c'est pour cela que le relief a enfin de l'épaisseur.
//
// ── CE QUI FAIT LE RESTE DE L'HABILLAGE ──────────────────────────────────────
//
// Le gazon, qui n'est pas une strate mais un trait épais sur la crête, et c'est
// lui que l'oiseau suit du regard. Le soleil qui traverse le ciel pendant la
// partie, et qui DIT l'heure qu'il est sans un chiffre. Deux lignes de
// montagnes en parallaxe. Une mer en trois couches avec son écume. Des arbres,
// des fleurs, et des panneaux de distance plantés dans l'herbe.
//
// ── PAS DE SON, PAS DE POLICE DISTANTE ───────────────────────────────────────
//
// Le son : Rémy l'a écrit. Les polices : le fichier d'origine charge Fredoka et
// Nunito chez Google, ce qui est deux fois impossible ici — la politique de
// sécurité du site ne l'autorise pas, et une tablette hors ligne afficherait
// une police de secours au milieu d'un jeu qui marche. On prend celles du site.
//
// ── LE DESSIN COÛTE CE QU'IL COÛTE, ET ON L'A MESURÉ ─────────────────────────
//
// Les strates demandent six remplissages du même contour, l'océan trois, les
// décors une poignée d'arcs. `node tools/imagesDesAiles.mjs` compte les images
// que le jeu peint VRAIMENT en quatre secondes — 47 à 54 dans un conteneur sans
// carte graphique. Chronométrer `dessiner()` ne mesure rien : le canevas
// exécute ses ordres plus tard, et l'on trouve 0,15 ms ou 15 selon la façon
// de tricher. L'outil explique les deux pièges.

import { BaseGame } from '../core/BaseGame.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { meneurDemo } from '../core/meneurDemo.js';
import {
    Relief, etatInitial, pas, qualiteAiles, nomDeLIle, ILES,
    NIVEAU_MER, melerCouleur, borner, entre, nuitTombee
} from '../core/petitesAiles.js';

/** L'épaisseur d'une strate, en pixels de monde. */
const EPAISSEUR_STRATE = 54;

/* ── LE CIEL AU FIL DE LA JOURNÉE ────────────────────────────────────────
 *
 * TROIS COULEURS, ET QUATRE ÉTAPES. Un seul dégradé du bleu au noir donnerait
 * un ciel qui s'éteint ; ce qu'on veut est un ciel qui TOURNE — le bleu passe
 * au doré, le doré au rose, le rose au violet de nuit. C'est le seul endroit du
 * jeu où l'on voit le temps passer, et c'est lui qui met la pression.
 */
const CIELS = [
    { a: 0, haut: '#38bdf8', milieu: '#bae6fd', bas: '#fef9c3' },
    { a: 0.5, haut: '#2563eb', milieu: '#fde047', bas: '#fdba74' },
    { a: 0.82, haut: '#312e81', milieu: '#f43f5e', bas: '#fb923c' },
    { a: 1, haut: '#0f172a', milieu: '#1e1b4b', bas: '#312e81' }
];

/**
 * LA COULEUR DU CIEL À L'HEURE `t`, SUR L'ÎLE `theme`.
 *
 * ── LE DÉFAUT QUE LA PHOTO DU PAYS KAWAÏ A MONTRÉ ───────────────────────
 *
 * Premier jet : le ciel ne suivait QUE l'heure. Les treize îles avaient donc
 * le même ciel bleu de midi, et la garde « chaque île se détache de son propre
 * ciel » mesurait un ciel qui n'était jamais dessiné. Deux défauts pour le
 * prix d'un : l'île perdait sa couleur — c'était le point fort de l'ancienne
 * version, « chaque monde a SA palette » —, et l'épreuve mesurait à côté de
 * l'écran.
 *
 * LE JOUR APPARTIENT À L'ÎLE, LE SOIR AU CYCLE. Jusqu'au tiers de la journée,
 * on voit le ciel de l'île tel qu'il est écrit, et c'est lui que la garde
 * mesure ; ensuite, le couchant puis la nuit le gagnent peu à peu, et toutes
 * les îles finissent sous le même ciel noir — ce qui est juste : la nuit
 * tombe partout pareil.
 */
function cielA(t, theme) {
    let i = 0;
    while (i < CIELS.length - 2 && t > CIELS[i + 1].a) i++;
    const a = CIELS[i], b = CIELS[i + 1];
    const k = borner((t - a.a) / Math.max(0.0001, b.a - a.a), 0, 1);
    const cycle = {
        haut: melerCouleur(a.haut, b.haut, k),
        milieu: melerCouleur(a.milieu, b.milieu, k),
        bas: melerCouleur(a.bas, b.bas, k)
    };
    if (!theme) return cycle;
    const soir = borner((t - 0.33) / 0.55, 0, 1);
    const doux = soir * soir * (3 - 2 * soir);
    const milieuIle = melerCouleur(theme.ciel[0], theme.ciel[1], 0.6);
    return {
        haut: melerCouleur(theme.ciel[0], cycle.haut, doux),
        milieu: melerCouleur(milieuIle, cycle.milieu, doux),
        bas: melerCouleur(theme.ciel[1], cycle.bas, doux)
    };
}

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
                    background: #8fd3ff;
                }
                .pa-toile { display: block; width: 100%; height: 100%; }
                .pa-hud {
                    position: absolute; left: 0; right: 0; top: 0; padding: 8px 12px;
                    display: flex; gap: 10px; align-items: center; justify-content: space-between;
                    font-weight: 800; color: #12324a; pointer-events: none;
                    text-shadow: 0 1px 0 rgba(255,255,255,.6);
                    font-size: clamp(12px, 2.6vh, 17px);
                }
                .pa-ile {
                    background: rgba(255,255,255,.88); border-radius: 999px;
                    padding: 4px 14px; color: #1a365d; white-space: nowrap;
                }
                /* ── LA BARRE DU JOUR ────────────────────────────────────
                   Elle remplace la jauge de progression de l'ancienne version,
                   et elle dit la seule chose qui presse : combien il reste de
                   jour. Du doré à gauche, de la nuit à droite, et un curseur
                   qui va de l'un à l'autre — on lit l'heure qu'il est sans
                   savoir lire une heure. */
                .pa-jour {
                    flex: 1 1 auto; max-width: 280px; height: 12px; border-radius: 999px;
                    background: linear-gradient(90deg, #fde047, #fb923c, #7c3aed, #1e1b4b);
                    position: relative; box-shadow: inset 0 0 0 1px rgba(26,54,93,.2);
                }
                .pa-jour i {
                    position: absolute; top: 50%; width: 14px; height: 14px;
                    margin: -7px 0 0 -7px; border-radius: 50%;
                    background: #fffbeb; border: 2px solid rgba(26,54,93,.45);
                    left: 0; transition: left .2s linear;
                }
                /* LE SCORE A SA PASTILLE, COMME L'ÎLE. Sans elle, il était
                   écrit en bleu nuit à même le ciel — lisible à midi sur les
                   collines, et effacé sur six ciels sur treize, puis sur tous
                   à la nuit tombée. Vu sur la photo de la banquise. */
                .pa-score {
                    white-space: nowrap; background: rgba(255,255,255,.88);
                    border-radius: 999px; padding: 4px 14px; color: #1a365d;
                }
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
                .pa-banniere {
                    position: absolute; left: 50%; top: 24%; transform: translate(-50%, -6px);
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
                    <span class="pa-ile" id="pa-ile"></span>
                    <span class="pa-jour" id="pa-jour" aria-hidden="true"><i></i></span>
                    <span class="pa-score" id="pa-score"></span>
                </div>
                <div class="pa-banniere" id="pa-banniere"></div>
                <div class="pa-depart" id="pa-depart">
                    <h3>Les Petites Ailes</h3>
                    <p>Appuie pour <b>plonger</b> — relâche pour <b>planer</b>.</p>
                    <p><span class="pa-touche">clic</span> ou
                       <span class="pa-touche">espace</span></p>
                    <small>Plonge dans la descente : c'est là que la vitesse se gagne.<br>
                    Au bout de chaque île, un tremplin — et la mer à franchir d'un seul vol.</small>
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
        this.ileEl = this.container.querySelector('#pa-ile');
        this.jourEl = this.container.querySelector('#pa-jour').firstElementChild;
        this.scoreEl = this.container.querySelector('#pa-score');
        this.banniereEl = this.container.querySelector('#pa-banniere');
        this.departEl = this.container.querySelector('#pa-depart');
        this.finEl = this.container.querySelector('#pa-fin');
        this.container.querySelector('#pa-rejouer').onclick = () => this.commencer();

        this.appuie = false;
        /** Ce que la DÉMONSTRATION demande — voir la boucle de `pas`. */
        this.appuieRobot = false;
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
        this.relief = new Relief(this.graine);
        this.graine = `${this.graine}+`;
        this.etat = etatInitial(this.relief);
        this.cam = { x: this.etat.x, y: this.etat.y - 60, zoom: 0.92 };
        this.temps = 0;
        this.graines = 0;
        this.eclats = 0;
        this.ile = 0;
        this.etincelles = [];
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
        this.temps += dt;
        if (!this.fini) this.avancer(dt);
        this.dessiner();
        this.raf = requestAnimationFrame(this.boucle);
    };

    avancer(dt) {
        // TANT QU'ON N'A PAS APPUYÉ, LE JOUR NE PASSE PAS. L'oiseau glisse déjà
        // — c'est plus joli qu'une image figée — mais personne ne doit perdre
        // pendant qu'il lit la consigne. La démonstration du meneur en est
        // dispensée pour la même raison : elle montre, elle ne joue pas.
        const avantNuit = this.etat.nuit;
        this.etat = pas(this.etat, dt,
            this.isDemo ? this.appuieRobot : this.appuie, this.relief);
        if (!this.demarre || this.isDemo) this.etat.nuit = avantNuit;

        if (this.etat.evenement) this.surEvenement(this.etat.evenement);
        this.ramasser();
        this.avancerEtincelles(dt);

        if (this.demarre && !this.isDemo && nuitTombee(this.etat.nuit)) this.terminer();
        this.majCamera(dt);
        this.majHud();
    }

    /**
     * CE QUE LE NOYAU ANNONCE, ET CE QU'ON EN MONTRE.
     *
     * Le noyau ne sait pas qu'il y a un écran : il pose un `evenement` et passe
     * à la suite. C'est ici qu'on décide d'une bannière, d'une gerbe ou d'un
     * point marqué — et c'est ce qui permet de jouer trois minutes de partie
     * dans une épreuve sans rien afficher.
     */
    surEvenement(ev) {
        if (ev.quoi === 'ile') {
            this.ile = ev.ile;
            this.banniere(`Île ${ev.ile + 1} — ${nomDeLIle(ev.ile)}`
                + (ev.parfaite ? ' · traversée parfaite !' : ''));
            this.gerbe(this.etat.x, this.etat.y, ev.parfaite ? 26 : 12);
            if (this.isDemo) return;
            // LE SEUL MOMENT OÙ L'ON MARQUE. Ce n'est pas un exercice : il n'y
            // a ni bonne ni mauvaise réponse, seulement une mer franchie — et
            // c'est cela qu'on enregistre, pour que la partie compte dans un
            // parcours.
            this.onCorrectAnswer(null, null, {
                questionText: `Atteindre ${nomDeLIle(ev.ile)}`,
                expected: nomDeLIle(ev.ile), given: nomDeLIle(ev.ile),
                points: 12 + ev.ile * 4
            });
        } else if (ev.quoi === 'catapulte') {
            this.banniere('Super tremplin !');
            this.gerbe(ev.x, ev.y, 20);
        } else if (ev.quoi === 'ricochet') {
            this.gerbe(ev.x, NIVEAU_MER, 14, '#bae6fd');
        } else if (ev.quoi === 'superglisse') {
            this.gerbe(ev.x, ev.y, 10, '#fef08a');
        }
    }

    /** Les graines et les éclats qu'on touche en passant. */
    ramasser() {
        const { x, y } = this.etat;
        for (const b of this.relief.bonus) {
            if (b.pris || Math.abs(b.x - x) > 44) continue;
            if (Math.abs(b.y - y) > 48) continue;
            b.pris = true;
            if (b.type === 'graine') this.graines++; else this.eclats++;
            this.gerbe(b.x, b.y, b.type === 'graine' ? 7 : 18,
                b.type === 'graine' ? '#fef08a' : '#fdba74');
        }
    }

    /* ── LES ÉTINCELLES ───────────────────────────────────────────────────
     *
     * Elles ne servent à rien, et c'est pour cela qu'elles comptent : une
     * graine qui disparaît sans un geste ne se sent pas ramassée. Quatre-vingt-
     * dix au plus à l'écran, et elles meurent toutes seules.
     */
    gerbe(x, y, combien, couleur = '#ffffff') {
        for (let i = 0; i < combien && this.etincelles.length < 90; i++) {
            const a = (i / combien) * Math.PI * 2;
            this.etincelles.push({
                x, y, vx: Math.cos(a) * (60 + i * 7), vy: Math.sin(a) * (60 + i * 5) - 60,
                vie: 0.5 + (i % 5) * 0.08, couleur
            });
        }
    }

    avancerEtincelles(dt) {
        for (const p of this.etincelles) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.vie -= dt;
        }
        this.etincelles = this.etincelles.filter((p) => p.vie > 0);
    }

    /**
     * LA CAMÉRA — elle recule quand on monte.
     *
     * C'est ce qui rend le grand saut lisible : à l'apogée, l'oiseau est à sept
     * cents pixels du sol, et sans recul on ne verrait qu'un ciel vide. Le zoom
     * descend alors jusqu'à 0,45 et l'on voit l'île d'en face arriver.
     */
    majCamera(dt) {
        const larg = this.wrap.clientWidth, haut = this.wrap.clientHeight;
        const sol = this.relief.echantillon(this.etat.x);
        const solRef = sol.ocean ? NIVEAU_MER : sol.y;
        const altitude = Math.max(0, solRef - this.etat.y);
        const base = Math.min(0.98, Math.max(0.72, larg / 1150));
        const vise = entre(base, 0.45, borner(altitude / 760, 0, 1));
        this.cam.zoom = entre(this.cam.zoom, vise, 4.6 * dt);
        const devant = (larg * 0.24) / this.cam.zoom;
        const milieu = entre(this.etat.y, (this.etat.y + solRef) * 0.52, 0.56);
        this.cam.x = entre(this.cam.x, this.etat.x + devant, 8 * dt);
        this.cam.y = entre(this.cam.y, milieu - (haut * 0.04) / this.cam.zoom, 6.5 * dt);
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
        const q = qualiteAiles(this.etat.x / 10, this.ile, this.graines, this.eclats);
        this.container.querySelector('#pa-fin-titre').textContent =
            `La nuit est tombée — île ${q.ile + 1}`;
        const s = q.graines > 1 ? 's' : '';
        this.container.querySelector('#pa-fin-texte').textContent =
            `${nomDeLIle(q.ile)} · ${q.distance} m · ${q.graines} graine${s} ramassée${s}`
            + `${q.eclats ? ` · ${q.eclats} éclat${q.eclats > 1 ? 's' : ''} de soleil` : ''}.`
            + ' Chaque mer franchie sans toucher l\'eau te rend du jour :'
            + ' plonge dans la grande descente, et laisse le tremplin faire le reste.';
        this.finEl.classList.add('pa-fin--vu');
    }

    majHud() {
        this.ileEl.textContent = `Île ${this.ile + 1} · ${nomDeLIle(this.ile)}`;
        this.jourEl.style.left = `${Math.round(borner(this.etat.nuit, 0, 1) * 100)}%`;
        this.scoreEl.textContent = `${Math.round(this.etat.x / 10)} m · 🌻 ${this.graines}`;
        if (this.demarre) this.departEl.classList.add('pa-depart--parti');
    }

    /* ─────────────────────────────────────────────────────────────────────
     * LE DESSIN
     * ───────────────────────────────────────────────────────────────────── */

    dessiner() {
        const c = this.ctx, toile = this.toile;
        const larg = this.wrap.clientWidth, haut = this.wrap.clientHeight;
        if (!larg || !haut) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (toile.width !== Math.round(larg * dpr) || toile.height !== Math.round(haut * dpr)) {
            toile.width = Math.round(larg * dpr);
            toile.height = Math.round(haut * dpr);
        }
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, larg, haut);

        const z = this.cam.zoom;
        const vx = (x) => (x - this.cam.x) * z + larg / 2;
        const vy = (y) => (y - this.cam.y) * z + haut / 2;
        const theme = this.relief.ileDe(this.etat.x).theme;
        const nuit = borner(this.etat.nuit, 0, 1);

        this.dessinerCiel(c, larg, haut, nuit, theme);
        this.dessinerMontagnes(c, larg, haut, theme, nuit);
        this.dessinerTerres(c, larg, haut, vx, vy, z);
        this.dessinerBonus(c, larg, vx, vy, z);
        this.dessinerEtincelles(c, vx, vy, z);
        this.dessinerOiseau(c, vx, vy, z);
        this.voileDeNuit(c, larg, haut, nuit);
    }

    /**
     * LE CIEL, ET LE SOLEIL QUI LE TRAVERSE.
     *
     * LE SOLEIL EST L'HORLOGE DU JEU. La barre du haut dit la même chose en
     * chiffres, mais c'est lui qu'on regarde : il part en haut à gauche au
     * matin et touche l'horizon à droite quand il ne reste plus rien. On sait
     * combien il reste de jour sans avoir jamais lu la barre.
     */
    dessinerCiel(c, larg, haut, nuit, theme) {
        const p = cielA(nuit, theme);
        const g = c.createLinearGradient(0, 0, 0, haut);
        g.addColorStop(0, p.haut);
        g.addColorStop(0.58, p.milieu);
        g.addColorStop(1, p.bas);
        c.fillStyle = g;
        c.fillRect(0, 0, larg, haut);

        if (nuit > 0.52) {
            // Les étoiles sortent quand le ciel s'assombrit. Leur position
            // vient d'un calcul, pas d'un tirage : elles ne doivent pas
            // scintiller en sautant d'un bout à l'autre du ciel.
            const a = borner((nuit - 0.52) / 0.35, 0, 0.92);
            for (let i = 0; i < 70; i++) {
                const sx = ((i * 97) % 1000) / 1000, sy = ((i * 211) % 620) / 1000;
                const vif = 0.55 + 0.45 * Math.sin(this.temps * 3 + i);
                c.fillStyle = `rgba(255,255,255,${a * vif})`;
                c.beginPath();
                c.arc(sx * larg, sy * haut, 1 + (i % 3) * 0.7, 0, Math.PI * 2);
                c.fill();
            }
        }

        const sx = entre(larg * 0.2, larg * 0.84, nuit);
        const sy = entre(haut * 0.25, haut * 0.76, Math.pow(nuit, 1.35))
            - Math.sin(nuit * Math.PI) * 55;
        const halo = c.createRadialGradient(sx, sy, 8, sx, sy, 105);
        halo.addColorStop(0, 'rgba(255,251,235,.9)');
        halo.addColorStop(0.4, 'rgba(253,224,71,.35)');
        halo.addColorStop(1, 'rgba(253,224,71,0)');
        c.fillStyle = halo;
        c.beginPath(); c.arc(sx, sy, 105, 0, Math.PI * 2); c.fill();
        c.fillStyle = nuit > 0.75 ? '#fed7aa' : '#fef9c3';
        c.beginPath(); c.arc(sx, sy, 27, 0, Math.PI * 2); c.fill();
    }

    /** Deux lignes de montagnes, qui défilent vingt fois plus lentement. */
    dessinerMontagnes(c, larg, haut, theme, nuit) {
        const teinte = borner(nuit * 0.65, 0, 0.65);
        for (const k of [
            { part: 0.05, base: 0.72, amp: 75, periode: 0.0026, couleur: theme.montLoin },
            { part: 0.13, base: 0.80, amp: 55, periode: 0.0040, couleur: theme.montPres }
        ]) {
            c.fillStyle = melerCouleur(k.couleur, '#1e293b', teinte);
            c.beginPath();
            c.moveTo(0, haut);
            const defile = this.cam.x * k.part;
            for (let x = 0; x <= larg + 20; x += 20) {
                const w = x + defile;
                c.lineTo(x, haut * k.base - Math.sin(w * k.periode) * k.amp
                    - Math.cos(w * k.periode * 0.53) * k.amp * 0.5);
            }
            c.lineTo(larg, haut);
            c.closePath();
            c.fill();
        }
    }

    /**
     * LES ÎLES ET LES MERS — le cœur de l'habillage.
     *
     * ── L'ORDRE DES SIX STRATES EST TOUT ────────────────────────────────
     *
     * On peint d'abord l'île ENTIÈRE dans le ton le plus profond, puis on
     * repose par-dessus des rubans de plus en plus clairs, chacun plus mince
     * que le précédent. Le dernier posé est le plus clair et le plus mince :
     * c'est la bande de surface. Dans l'autre sens, la première strate
     * couvrirait tout et il n'en resterait qu'une.
     *
     * ── ET LA LIMITE DES STRATES ONDULE ─────────────────────────────────
     *
     * Un décalage de sinus, dix pixels d'amplitude, différent pour chaque
     * strate. Sans lui, les six rubans sont rigoureusement parallèles et le
     * relief ressemble à une coupe de manuel de géologie ; avec lui, il
     * ressemble à une terre.
     */
    dessinerTerres(c, larg, haut, vx, vy, z) {
        const demi = (larg * 0.68) / z;
        const gauche = this.cam.x - demi, droite = this.cam.x + demi;
        this.relief.assurerJusqua(droite + 2000);
        const bas = haut + 40;

        for (const ile of this.relief.iles) {
            if (ile.finX < gauche || ile.debutX > droite) continue;
            const x0 = Math.max(gauche, ile.debutX), x1 = Math.min(droite, ile.finX);
            if (x0 >= x1) continue;

            // Le contour, échantillonné une fois et réutilisé huit fois.
            const pts = [];
            for (let x = x0; x <= x1; x += 8) {
                const s = this.relief.echantillon(x);
                pts.push({ x: vx(x), y: vy(s.y), w: x, ocean: s.ocean });
            }
            if (pts.length < 2) continue;

            const tons = ile.theme.strates;
            c.beginPath();
            c.moveTo(pts[0].x, bas);
            for (const p of pts) c.lineTo(p.x, p.y);
            c.lineTo(pts[pts.length - 1].x, bas);
            c.closePath();
            c.fillStyle = tons[tons.length - 1];
            c.fill();

            for (let b = tons.length - 2; b >= 0; b--) {
                const prof = (b + 1) * EPAISSEUR_STRATE;
                c.beginPath();
                for (let i = 0; i < pts.length; i++) {
                    if (i === 0) c.moveTo(pts[i].x, pts[i].y); else c.lineTo(pts[i].x, pts[i].y);
                }
                for (let i = pts.length - 1; i >= 0; i--) {
                    const onde = Math.sin(pts[i].w * 0.011 + b * 1.4) * 10;
                    c.lineTo(pts[i].x, pts[i].y + (prof + onde) * z);
                }
                c.closePath();
                c.fillStyle = tons[b];
                c.fill();
            }

            // ── LE GAZON : deux traits, l'ombre dessous et l'herbe dessus ──
            //
            // ET IL S'ARRÊTE À L'EAU. Le trait suivait le relief sans rien
            // demander : il descendait sous la mer, longeait le fond et
            // remontait de l'autre côté — de l'herbe sous l'eau. C'est la même
            // leçon que l'ancienne version avait payée sur ses falaises.
            c.lineCap = 'round'; c.lineJoin = 'round';
            c.beginPath();
            let leve = true;
            for (const p of pts) {
                if (p.ocean) { leve = true; continue; }
                if (leve) { c.moveTo(p.x, p.y); leve = false; } else c.lineTo(p.x, p.y);
            }
            c.strokeStyle = ile.theme.gazonOmbre;
            c.lineWidth = Math.max(2, 17 * z);
            c.stroke();
            c.strokeStyle = ile.theme.gazon;
            c.lineWidth = Math.max(1.5, 11 * z);
            c.stroke();

            this.dessinerDecors(c, gauche, droite, vx, vy, z);
        }

        // ── LES MERS, ENTRE DEUX ÎLES ────────────────────────────────────
        for (let i = 0; i < this.relief.iles.length; i++) {
            const a = this.relief.iles[i], b = this.relief.iles[i + 1];
            const mg = a.rivageSortieX, md = b ? b.rivageEntreeX : a.finX;
            if (!mg || md < gauche || mg > droite) continue;
            this.dessinerMer(c, Math.max(mg, gauche - 300), Math.min(md, droite + 300),
                vx, vy, z);
        }
    }

    /**
     * UNE MER — et elle est posée DANS son bassin, pas par-dessus.
     *
     * ── LE DÉFAUT QUE LA PHOTO A MONTRÉ ─────────────────────────────────
     *
     * Premier jet : l'eau était un rectangle, du rivage au rivage d'en face et
     * du niveau de la mer jusqu'en bas de l'écran. Or l'île, elle, est peinte
     * jusqu'en bas aussi — ses strates profondes descendent sous le niveau de
     * la mer. Le bord GAUCHE du rectangle tombait donc en plein milieu de la
     * plage immergée, et l'on voyait une COUPURE VERTICALE NETTE entre du
     * sable en plein soleil et de l'eau sombre. Rien ne le signalait : aucune
     * erreur, aucune épreuve rouge, et dans le code les deux formes sont
     * justes chacune de son côté.
     *
     * L'eau suit donc le TERRAIN : sa surface ondule d'un rivage à l'autre,
     * puis on revient par le fond en longeant la plage. C'est un bassin rempli,
     * et il n'a plus de bord qui n'existe pas.
     */
    dessinerMer(c, mg, md, vx, vy, z) {
        if (md <= mg) return;
        const t = this.temps * 4;
        const surface = vy(NIVEAU_MER);
        // Le fond du bassin, parcouru une fois et réutilisé trois fois.
        const fond = [];
        for (let x = md; x >= mg; x -= 16) fond.push({ x: vx(x), y: vy(this.relief.echantillon(x).y) });
        const g = vx(mg), d = vx(md);

        /** Le chemin « surface ondulée puis fond du bassin ». */
        const bassin = (amplitude, phase) => {
            c.beginPath();
            c.moveTo(g, surface);
            for (let x = g; x <= d; x += 12) {
                c.lineTo(x, surface + Math.sin(x * 0.022 + phase) * amplitude * z);
            }
            for (const p of fond) c.lineTo(p.x, p.y);
            c.closePath();
        };

        bassin(5, -t * 0.8 + 1.7);
        c.fillStyle = 'rgba(14,165,233,.42)';
        c.fill();

        const eau = c.createLinearGradient(0, surface - 8 * z, 0, surface + 340 * z);
        eau.addColorStop(0, 'rgba(103,232,249,.66)');
        eau.addColorStop(0.28, 'rgba(14,165,233,.82)');
        eau.addColorStop(0.68, 'rgba(3,105,161,.94)');
        eau.addColorStop(1, 'rgba(15,23,42,.99)');
        bassin(4.5, t);
        c.fillStyle = eau;
        c.fill();

        c.beginPath();
        for (let x = g; x <= d; x += 12) {
            const y = surface + Math.sin(x * 0.022 + t) * 4.5 * z;
            if (x === g) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.strokeStyle = 'rgba(255,255,255,.9)';
        c.lineWidth = Math.max(1.5, 6.5 * z);
        c.stroke();
    }

    /**
     * LES ARBRES, LES FLEURS ET LES PANNEAUX.
     *
     * LE PANNEAU DE DISTANCE EST LE SEUL CHIFFRE DU PAYSAGE, et il fait un
     * travail qu'aucun affichage de coin d'écran ne fait : il reste DERRIÈRE
     * quand on le dépasse. On voit donc le chemin parcouru au lieu de le lire.
     */
    dessinerDecors(c, gauche, droite, vx, vy, z) {
        for (const d of this.relief.decors) {
            if (d.x < gauche - 60 || d.x > droite + 60) continue;
            c.save();
            c.translate(vx(d.x), vy(d.y));
            c.rotate(d.angle * 0.6);
            c.scale(z, z);
            if (d.type === 'arbre') {
                const s = d.taille;
                c.fillStyle = d.tronc;
                c.fillRect(-3 * s, -14 * s, 6 * s, 16 * s);
                c.fillStyle = d.feuille;
                if (d.forme === 'sapin') {
                    c.beginPath();
                    c.moveTo(0, -56 * s); c.lineTo(20 * s, -12 * s); c.lineTo(-20 * s, -12 * s);
                    c.closePath(); c.fill();
                } else {
                    c.beginPath(); c.arc(0, -32 * s, 21 * s, 0, Math.PI * 2); c.fill();
                    c.beginPath(); c.arc(14 * s, -22 * s, 13 * s, 0, Math.PI * 2); c.fill();
                }
            } else if (d.type === 'fleurs') {
                c.strokeStyle = 'rgba(30,60,30,.45)';
                c.lineWidth = 1.4;
                for (let i = -1; i <= 1; i++) {
                    c.beginPath();
                    c.moveTo(i * 9, 0); c.lineTo(i * 9, -11 - Math.abs(i) * 3);
                    c.stroke();
                    c.fillStyle = d.couleur;
                    c.beginPath();
                    c.arc(i * 9, -13 - Math.abs(i) * 3, 3.6, 0, Math.PI * 2);
                    c.fill();
                }
            } else {
                c.strokeStyle = '#8a5a30'; c.lineWidth = 4;
                c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -34); c.stroke();
                c.save();
                c.translate(0, -44); c.rotate(-0.12);
                c.fillStyle = '#fef3c7';
                c.strokeStyle = '#8a5a30'; c.lineWidth = 3;
                c.beginPath(); c.rect(-30, -13, 60, 24); c.fill(); c.stroke();
                c.fillStyle = '#7c4a1e';
                c.font = '700 14px system-ui, sans-serif';
                c.textAlign = 'center'; c.textBaseline = 'middle';
                c.fillText(d.texte, 0, 0);
                c.restore();
            }
            c.restore();
        }
    }

    /** Les graines en arc et les éclats de soleil. */
    dessinerBonus(c, larg, vx, vy, z) {
        for (const b of this.relief.bonus) {
            if (b.pris) continue;
            const x = vx(b.x);
            if (x < -40 || x > larg + 40) continue;
            const y = vy(b.y) + Math.sin(this.temps * 3 + b.phase) * 4 * z;
            if (b.type === 'graine') {
                c.fillStyle = '#fde047';
                c.beginPath(); c.arc(x, y, 7 * z, 0, Math.PI * 2); c.fill();
                c.strokeStyle = '#a16207'; c.lineWidth = Math.max(1, 2 * z); c.stroke();
                c.fillStyle = '#92400e';
                c.beginPath(); c.arc(x, y, 2.6 * z, 0, Math.PI * 2); c.fill();
            } else {
                // L'ÉCLAT DE SOLEIL EST HAUT ET IL BRILLE : c'est la seule
                // récompense qui demande de VOLER, donc la seule qu'on doit
                // voir de loin.
                const halo = c.createRadialGradient(x, y, 2, x, y, 30 * z);
                halo.addColorStop(0, 'rgba(255,247,200,.95)');
                halo.addColorStop(1, 'rgba(253,186,116,0)');
                c.fillStyle = halo;
                c.beginPath(); c.arc(x, y, 30 * z, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#fde68a';
                c.beginPath();
                for (let i = 0; i < 10; i++) {
                    const a = -Math.PI / 2 + (i * Math.PI) / 5;
                    const r = (i % 2 ? 7 : 16) * z;
                    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
                    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
                }
                c.closePath(); c.fill();
                c.strokeStyle = '#d97706'; c.lineWidth = Math.max(1, 2 * z); c.stroke();
            }
        }
    }

    dessinerEtincelles(c, vx, vy, z) {
        for (const p of this.etincelles) {
            c.globalAlpha = Math.max(0, Math.min(1, p.vie * 2));
            c.fillStyle = p.couleur;
            c.beginPath(); c.arc(vx(p.x), vy(p.y), 3.4 * z, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
    }

    /**
     * L'OISEAU — un disque, une aile, un bec, et un œil.
     *
     * L'ORDRE DE DESSIN EST TOUT L'OISEAU : le bec tracé en premier disparaît
     * sous le corps, et il ne reste qu'une boule jaune avec un point. Queue,
     * corps, aile, bec, œil. C'est une leçon de l'ancienne version, et elle
     * vaut pour n'importe quel personnage rond.
     */
    dessinerOiseau(c, vx, vy, z) {
        const e = this.etat;
        const x = vx(e.x), y = vy(e.y);
        c.save();
        c.translate(x, y);
        c.rotate(e.rotation);
        c.scale(z, z);
        c.fillStyle = '#ea580c';
        c.beginPath(); c.moveTo(-12, 0); c.lineTo(-30, -9); c.lineTo(-27, 4);
        c.closePath(); c.fill();
        c.fillStyle = this.appuie ? '#f97316' : '#fbbf24';
        c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#b45309'; c.lineWidth = 3;
        c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.stroke();
        const bat = Math.sin(this.temps * (this.appuie ? 26 : 11)) * 0.5;
        c.save();
        c.translate(-3, 2); c.rotate(bat * 0.5 - 0.3);
        c.fillStyle = '#f59e0b';
        c.beginPath(); c.ellipse(0, 0, 14, this.appuie ? 5 : 8, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#b45309'; c.lineWidth = 2; c.stroke();
        c.restore();
        c.fillStyle = '#fb923c';
        c.beginPath(); c.moveTo(31, 1); c.lineTo(16, -6); c.lineTo(16, 7);
        c.closePath(); c.fill();
        c.strokeStyle = '#c2410c'; c.lineWidth = 1.6; c.stroke();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(8, -6, 6.4, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#1a202c';
        c.beginPath(); c.arc(10, -6, 3.2, 0, Math.PI * 2); c.fill();
        c.restore();

        // Les traits de vitesse, qui disent qu'on file.
        const v = Math.hypot(e.vx, e.vy);
        const part = borner((v - 350) / 900, 0, 1);
        if (part > 0.05) {
            c.strokeStyle = `rgba(255,255,255,${0.2 + part * 0.6})`;
            c.lineWidth = Math.max(1.5, 3 * z);
            for (let i = 0; i < 3; i++) {
                const ly = y + (-11 + i * 11) * z;
                c.beginPath();
                c.moveTo(x - (26 + part * 60) * z, ly);
                c.lineTo(x - 20 * z, ly);
                c.stroke();
            }
        }
    }

    /**
     * LE VOILE DE NUIT.
     *
     * Le ciel s'assombrit tout seul, mais la TERRE ne le sait pas : ses strates
     * gardent leurs jaunes de midi pendant que le ciel vire au violet, et l'on
     * voit alors une île de carte postale sous un ciel d'orage. Un voile bleu
     * nuit par-dessus tout remet les deux à la même heure.
     */
    voileDeNuit(c, larg, haut, nuit) {
        if (nuit < 0.35) return;
        c.fillStyle = `rgba(16, 20, 54, ${borner((nuit - 0.35) * 0.62, 0, 0.42)})`;
        c.fillRect(0, 0, larg, haut);
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
        const robot = meneurDemo(cur, gate, () => this.isRunning,
            () => { this.demoCursor = null; this.demoGate = null; });
        const fin = () => robot.fin();

        if (!await robot.pause(500)) return fin();
        cur.say('Une seule touche : clic, doigt ou barre d\'espace.', this.wrap);
        if (!await robot.attendre(DEMO_SPEED.between)) return fin();

        cur.say('J\'appuie pour PLONGER, je relâche pour planer.', this.wrap);
        if (!await robot.attendre(DEMO_SPEED.between)) return fin();

        cur.say('J\'appuie dans la DESCENTE : c\'est là que la vitesse se gagne.', this.wrap);
        if (!await robot.attendre(DEMO_SPEED.between)) return fin();

        // Le robot joue parfaitement pendant quelques secondes.
        for (let i = 0; i < 300 && this.isRunning; i++) {
            // LES DEUX : `appuie` pour que l'oiseau pique à l'écran,
            // `appuieRobot` pour que la physique l'entende.
            this.appuie = this.relief.echantillon(this.etat.x).pente > 0;
            this.appuieRobot = this.appuie;
            if (!await robot.pause(16)) break;
        }
        this.appuie = false;
        this.appuieRobot = false;
        if (!this.isRunning) return fin();

        cur.say('Au bout de l\'île : une grande descente, un tremplin, et la mer d\'un seul vol.',
            this.wrap);
        if (!await robot.attendre(DEMO_SPEED.between)) return fin();

        cur.say(`Traverser sans toucher l'eau te rend du jour — il y a ${ILES.length} îles.`,
            this.ileEl);
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
