// LA COURSE DE VECTEURS — l'écran.
//
// Rémy : « j'aimerais bien le jeu course de vecteur Vector Racer / Racetrack ».
//
// LE PARI DE CET ÉCRAN : ne jamais demander à l'élève de calculer sa position.
// Les NEUF ARRIVÉES POSSIBLES sont dessinées sur le quadrillage, en un carré
// de trois sur trois, et l'on choisit un point — pas une flèche abstraite. Ce
// carré se déplace tout seul avec la vitesse, et c'est ce déplacement qui
// enseigne : plus on va vite, plus le carré des choix part loin devant, et
// moins on a de prise sur le virage qui arrive. Personne n'a besoin qu'on le
// lui explique après l'avoir vu deux fois.
//
// CE QUI EST ROUGE EST INTERDIT, et on le voit AVANT de jouer : un point qui
// enverrait la voiture dans le décor est barré. L'élève peut donc essayer
// mentalement les neuf coups sans risque — c'est-à-dire faire exactement le
// travail d'anticipation qu'on veut lui faire faire.
//
// La règle, les pistes, la recherche du meilleur chemin et le robot vivent
// dans core/courseVecteurs.js, sans DOM et avec leurs tests.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    PISTES, pisteParId, lirePiste, etatDepart, coupsPossibles, jouer,
    cheminOptimal, conseil, expliquerCoup, VITESSE_MAX
} from '../core/courseVecteurs.js';

// Le pas du quadrillage dans le repère du SVG. Le dessin entier est ensuite
// mis à l'échelle par le `viewBox` : une seule unité à régler.
const PAS = 10;

// UN VECTEUR S'ÉCRIT AVEC SES SIGNES. « 3 » ne dit pas dans quel sens on va ;
// « +3 » et « −1 » le disent, et c'est exactement ce qu'on veut faire lire.
const signe = (n) => (n > 0 ? `+${n}` : n < 0 ? `\u2212${Math.abs(n)}` : '0');

/**
 * UNE COULEUR PAR ACCÉLÉRATION, LA MÊME DES DEUX CÔTÉS.
 *
 * Rémy : « ne mets pas de flèche pour le pad, mais des pastilles de couleurs
 * sur les touches du pad ET les pastilles de déplacement ». Une flèche sur la
 * touche et un point sur la piste sont deux dessins différents pour la même
 * chose : il faut traduire de l'un à l'autre, et c'est du travail perdu.
 * Deux pastilles de la même couleur, elles, ne se traduisent pas — on voit
 * tout de suite où l'on va atterrir.
 *
 * Neuf teintes franches, et pas de rouge pur : le rouge dit « impossible »,
 * il ne doit désigner que cela.
 */
const TEINTES_ACC = {
    '-1,-1': '#8b5cf6', '0,-1': '#3b82f6', '1,-1': '#06b6d4',
    '-1,0': '#f59e0b', '0,0': '#64748b', '1,0': '#84cc16',
    '-1,1': '#ec4899', '0,1': '#f97316', '1,1': '#14b8a6'
};

const PILOTES = [
    { id: 'a', nom: 'Bleue', teinte: '#4f46e5', clair: '#a5b4fc' },
    { id: 'b', nom: 'Rouge', teinte: '#dc2626', clair: '#fca5a5' }
];

// Les neuf coups au clavier : le pavé numérique EST le carré des choix.
// 7 8 9 en haut, 4 5 6 au milieu, 1 2 3 en bas — la disposition du pavé est
// déjà le dessin de l'accélération, il n'y a rien à apprendre.
const TOUCHES = {
    Numpad7: [-1, -1], Numpad8: [0, -1], Numpad9: [1, -1],
    Numpad4: [-1, 0], Numpad5: [0, 0], Numpad6: [1, 0],
    Numpad1: [-1, 1], Numpad2: [0, 1], Numpad3: [1, 1],
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    Space: [0, 0]
};

class CourseVecteurs extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'course-vecteurs');
        this.rng = makeRng(this.params.seed);
        this.adversaire = this.params.adversaire || 'seul';
        this.molesse = this.params.robot === 'facile' ? 0.6
            : this.params.robot === 'moyen' ? 0.3 : 0;
        this.choisirPiste(this.params.piste || 'echauffement');
    }

    /**
     * DEBOUT OU COUCHÉE, selon la forme de l'écran.
     *
     * Toutes les pistes sont dessinées en largeur ; sur un téléphone tenu
     * droit, elles tiennent alors dans un timbre-poste. On les transpose —
     * les données, pas le dessin : voir `transposer` dans le noyau, la droite
     * reste la droite.
     */
    ecranDebout() {
        const b = this.container.getBoundingClientRect();
        return b.height > b.width * 1.15;
    }

    choisirPiste(id) {
        const def = id === 'toutes' ? this.rng.pick(PISTES) : pisteParId(id);
        this.piste = lirePiste(def, { debout: this.ecranDebout() });
        const record = cheminOptimal(this.piste, etatDepart(this.piste));
        this.record = record ? record.longueur : null;
        this.voitures = this.pilotes().map((p, i) => ({
            ...p, etat: etatDepart(this.piste, i * Math.ceil(this.piste.depart.length / 2))
        }));
        this.trait = 0;
        this.fini = false;
        this.indice = '';
        this.vise = null;
        this.montrerConsigne();
    }

    /**
     * La consigne de la piste, en grand, avant de courir. Une fois lue, elle
     * s'efface et rend sa place au circuit — c'est la demande de Rémy, et
     * c'est aussi ce qui règle le « c'est petit sur iPhone ».
     */
    montrerConsigne() {
        const boite = this.container.querySelector('[data-avant]');
        if (!boite) return;              // avant le premier rendu
        // Le robot joue tout seul : un écran à valider bloquerait la
        // démonstration, et personne n'est là pour appuyer.
        if (this.isDemo) { boite.hidden = true; return; }
        this.container.querySelector('[data-avant-nom]').textContent = this.piste.nom || 'La piste';
        this.container.querySelector('[data-avant-mot]').textContent = this.piste.aide || '';
        boite.hidden = false;
    }

    masquerConsigne() {
        const boite = this.container.querySelector('[data-avant]');
        if (boite) boite.hidden = true;
        this.container.focus({ preventScroll: true });
    }

    pilotes() {
        if (this.adversaire === 'deux') return PILOTES;
        if (this.adversaire === 'robot') return [PILOTES[0], { ...PILOTES[1], nom: 'Robot', robot: true }];
        return [PILOTES[0]];
    }

    get moi() { return this.voitures[this.trait]; }

    // --- Écran ---------------------------------------------------------------

    render() {
        const options = PISTES.map(p =>
            `<option value="${p.id}"${p.id === this.piste.id ? ' selected' : ''}>${p.nom}</option>`).join('');

        this.container.innerHTML = `
            <style>
                .cv-wrap {
                    display: flex; flex-direction: column; gap: 8px;
                    width: 100%; height: 100%; min-height: 0; color: var(--text-main);
                    user-select: none; -webkit-user-select: none; position: relative;
                    container-type: size; container-name: cvcadre;
                }
                /* LA CONSIGNE D'ABORD, LE CIRCUIT ENSUITE.
                   Rémy, au banc iPhone : « c'est petit sur iPhone ; pour la
                   consigne, mets-la avant, puis on passe au circuit ». Les
                   quatre lignes de conseil restaient sous le pavé pendant
                   toute la course : cent dix pixels de hauteur, pris au
                   circuit, pour un texte qu'on lit une fois. Elles passent
                   devant, en grand, le temps de les lire — et la piste hérite
                   de la place quand elles s'effacent. */
                .cv-avant {
                    position: absolute; inset: 0; z-index: 5;
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; gap: clamp(10px, 3cqh, 22px);
                    padding: clamp(14px, 5cqw, 40px); text-align: center;
                    background: var(--bg-app);
                }
                .cv-avant[hidden] { display: none; }
                .cv-avant-nom {
                    font-weight: 900; font-size: clamp(1.1rem, 5cqw, 1.9rem); color: var(--primary);
                }
                .cv-avant-mot {
                    font-size: clamp(.9rem, 3.4cqw, 1.15rem); line-height: 1.45;
                    max-width: 34em; color: var(--text-main);
                }
                .cv-avant-btn {
                    border: 0; border-radius: 999px; cursor: pointer; font: inherit;
                    font-weight: 800; font-size: clamp(.95rem, 3.6cqw, 1.2rem);
                    padding: 10px 26px; background: var(--primary); color: #fff;
                }
                .cv-barre {
                    display: flex; align-items: center; justify-content: center;
                    gap: clamp(6px, 2cqw, 16px); flex-wrap: wrap; flex: 0 0 auto;
                    font-size: clamp(.68rem, 2.2cqw, .9rem);
                }
                .cv-jauge {
                    display: flex; align-items: center; gap: 6px; font-weight: 800;
                    padding: 4px 10px; border-radius: 999px; border: 2px solid var(--border);
                    background: var(--bg-panel); white-space: nowrap;
                }
                .cv-jauge--trait { border-color: currentColor; box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 18%, transparent); }
                .cv-pastille { width: .8em; height: .8em; border-radius: 50%; background: currentColor; }
                /* LA VITESSE EST ÉCRITE COMME UN VECTEUR, entre parenthèses et
                   séparée d'un point-virgule : c'est la notation du cours, et
                   c'est là qu'elle prend un sens. */
                .cv-vitesse { font-variant-numeric: tabular-nums; }
                .cv-piste-boite { flex: 1 1 auto; min-height: 0; display: flex; justify-content: center; }
                .cv-svg { width: 100%; height: 100%; }
                .cv-sol { fill: var(--bg-panel); }
                                /* LE HORS-PISTE DOIT SE VOIR COMME UN MUR, pas comme un fond :
                   à contraste trop faible, l'élève cherche la route au lieu de
                   la suivre. */
                .cv-hors { fill: color-mix(in srgb, var(--text-muted) 45%, transparent); }
                .cv-grille { stroke: var(--border); stroke-width: .35; fill: none; }
                .cv-depart { fill: color-mix(in srgb, #10b981 35%, transparent); }
                .cv-arrivee { fill: url(#cv-damier); opacity: .85; }
                .cv-bord { fill: none; stroke: var(--text-main); stroke-width: 1.1; }
                /* LA TRACE EST LE PASSÉ, LA FLÈCHE EST L'AVENIR : deux traits de la
                   même couleur qui voudraient dire deux choses différentes se
                   confondent. C'était la trace qui était en pointillé — mais un
                   vecteur DÉJÀ PARCOURU est un fait, et un fait se dessine
                   plein. C'est donc l'inverse : le passé en trait plein avec sa
                   pointe et ses composantes, l'avenir — « où j'irais sans rien
                   faire » — en pointillé, parce qu'il n'a pas encore eu lieu. */
                /* CHAQUE TOUR EST UN VECTEUR, et il se voit : trait plein,
                   pointe, point d'arrêt, composantes écrites à côté. Les tours
                   passés s'estompent un peu — assez pour que le dernier se
                   distingue, pas assez pour qu'on ne puisse plus les relire. */
                .cv-vecteur { stroke-width: 1.15; stroke-linecap: round; }
                .cv-vecteur--vieux { opacity: .55; }
                .cv-arret { stroke: #fff; stroke-width: .4; }
                .cv-arret--vieux { opacity: .55; }
                .cv-compo {
                    font-size: 3.1px; font-weight: 800; text-anchor: middle;
                    dominant-baseline: central; paint-order: stroke;
                    stroke: var(--bg-panel); stroke-width: 1.1px; stroke-linejoin: round;
                }
                .cv-compo--vieux { opacity: .6; }
                .cv-voiture { stroke: #fff; stroke-width: .9; }
                .cv-fleche { stroke-width: 1.7; stroke-linecap: round;
                    stroke-dasharray: 2.2 1.7; opacity: .9; }
                /* Les neuf choix. Le point plein appelle le doigt ; le point
                   barré dit « pas par là » sans qu'on ait à essayer. */
                .cv-choix { cursor: pointer; }
                .cv-choix circle { stroke-width: .8; }
                .cv-choix--ok circle { fill: color-mix(in srgb, currentColor 55%, transparent); stroke: currentColor; }
                .cv-choix--ok:hover circle { fill: currentColor; }
                .cv-choix--arrivee circle { fill: #10b981; stroke: #065f46; }
                .cv-choix--ko circle { fill: none; stroke: var(--danger, #ef4444); stroke-dasharray: 1.6 1.4; }
                .cv-choix--ko line { stroke: var(--danger, #ef4444); stroke-width: .9; }
                .cv-choix--vise circle { stroke-width: 1.6; }
                /* LA CIBLE DU DOIGT EST PLUS GRANDE QUE LE POINT, et invisible.
                   Sur une tablette, un point de dix pixels ne se touche pas ;
                   peint, il ferait un deuxième anneau autour de chaque choix —
                   c'est ce qui arrivait, les neuf pastilles se chevauchaient en
                   une bouillie. */
                .cv-choix circle.cv-touche { fill: transparent; stroke: none; }
                .cv-sortie { stroke: var(--danger, #ef4444); stroke-width: 1.2; }
                /* LE PAVÉ DES NEUF, EN GRAND.
                   Les neuf points du quadrillage sont la leçon ; sur une
                   tablette ils sont aussi la commande, mais sur un téléphone
                   ils font douze pixels et ne se touchent pas. Le même carré
                   de trois sur trois, posé sous la piste, se touche au pouce —
                   et, comme il porte les mêmes couleurs, il dit exactement la
                   même chose : ce qui est barré en rouge enverrait dans le
                   décor. */
                .cv-commande {
                    flex: 0 0 auto; display: grid; gap: clamp(3px, .8cqh, 6px);
                    grid-template-columns: repeat(3, clamp(30px, 6cqh, 52px));
                    grid-auto-rows: clamp(26px, 5cqh, 46px);
                    justify-content: center; align-self: center;
                }
                .cv-touche-acc {
                    border: 2px solid var(--border); border-radius: 9px; cursor: pointer;
                    background: var(--bg-panel); color: var(--text-main);
                    font-size: clamp(.85rem, 3cqh, 1.3rem); font-weight: 800; line-height: 1;
                    -webkit-tap-highlight-color: transparent;
                }
                .cv-touche-acc:hover { background: var(--bg-hover); }
                .cv-touche-acc:active { transform: scale(.93); }
                /* LA PASTILLE DE LA TOUCHE — la jumelle de celle qu'on voit
                   sur la piste. Même couleur, même rôle : celle qu'on touche
                   dit où l'on atterrit. */
                .cv-past {
                    display: block; width: 62%; aspect-ratio: 1; margin: auto;
                    border-radius: 50%; background: var(--past);
                    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .18);
                }
                .cv-touche-acc--ko .cv-past {
                    background: none; box-shadow: inset 0 0 0 2px currentColor;
                }
                /* La croix de l'impossible, reprise du plateau : deux traits en
                   diagonale, dessinés par-dessus la pastille creuse. */
                .cv-touche-acc--ko { position: relative; }
                .cv-touche-acc--ko::after {
                    content: ''; position: absolute; inset: 28%;
                    background:
                        linear-gradient(45deg, transparent 44%, currentColor 44%, currentColor 56%, transparent 56%),
                        linear-gradient(-45deg, transparent 44%, currentColor 44%, currentColor 56%, transparent 56%);
                }
                .cv-touche-acc--arrivee .cv-past { background: #10b981; }
                .cv-touche-acc--ko { color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); opacity: .55; }
                .cv-touche-acc--arrivee { border-color: #10b981; color: #10b981; }
                .cv-touche-acc--vise { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent); }
                .cv-pied {
                    flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
                    gap: 8px; flex-wrap: wrap; font-size: clamp(.66rem, 2.1cqw, .86rem);
                }
                .cv-mot { color: var(--text-muted); text-align: center; max-width: 46em; line-height: 1.3; }
                .cv-btn {
                    border: 2px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 10px; padding: 5px 12px; font-weight: 700; cursor: pointer;
                    font-size: inherit; -webkit-tap-highlight-color: transparent;
                }
                .cv-btn:hover { background: var(--bg-hover); }
                .cv-select { font: inherit; padding: 4px 8px; border-radius: 10px;
                    border: 2px solid var(--border); background: var(--bg-panel); color: var(--text-main); }
            </style>
            <div class="cv-wrap">
                <div class="cv-barre" data-barre></div>
                <div class="cv-piste-boite">
                    <svg class="cv-svg" data-svg preserveAspectRatio="xMidYMid meet"
                         role="img" aria-label="Piste de course"></svg>
                </div>
                <div class="cv-commande" data-commande role="group"
                     aria-label="Changer la vitesse"></div>
                <div class="cv-mot" data-mot></div>
                <div class="cv-pied">
                    <select class="cv-select" data-piste aria-label="Choisir la piste">${options}</select>
                    <button type="button" class="cv-btn" data-neuf>↺ Recommencer</button>
                    <button type="button" class="cv-btn" data-aide>💡 Quel coup ?</button>
                </div>
                <div class="cv-avant" data-avant hidden>
                    <div class="cv-avant-nom" data-avant-nom></div>
                    <p class="cv-avant-mot" data-avant-mot></p>
                    <button type="button" class="cv-avant-btn" data-partir>C'est parti ▶</button>
                </div>
            </div>`;

        this.svg = this.container.querySelector('[data-svg]');
        this.container.querySelector('[data-neuf]').onclick = () => {
            this.choisirPiste(this.params.piste === 'toutes' ? 'toutes' : this.piste.id);
            this.dessiner();
        };
        this.container.querySelector('[data-piste]').onchange = (e) => {
            this.choisirPiste(e.target.value);
            this.dessiner();
        };
        this.container.querySelector('[data-aide]').onclick = () => this.souffler();
        this.container.querySelector('[data-partir]').onclick = () => this.masquerConsigne();
        this.montrerConsigne();

        this.container.tabIndex = -1;
        this.container.focus({ preventScroll: true });
        this.container.onkeydown = (e) => {
            const a = TOUCHES[e.code];
            if (!a || this.fini || this.moi.robot) return;
            e.preventDefault();
            this.tenter(a[0], a[1]);
        };

        this.dessiner();
    }

    // --- Dessin --------------------------------------------------------------

    dessiner() {
        if (!this.svg) return;
        const p = this.piste;
        const L = p.largeur * PAS, H = p.hauteur * PAS;
        this.svg.setAttribute('viewBox', `-1 -1 ${L + 2} ${H + 2}`);

        let sol = '', hors = '', dep = '', arr = '';
        for (let y = 0; y < p.hauteur; y++) {
            for (let x = 0; x < p.largeur; x++) {
                const r = `<rect x="${x * PAS}" y="${y * PAS}" width="${PAS}" height="${PAS}" />`;
                if (!p.sol.has(`${x},${y}`)) { hors += r; continue; }
                sol += r;
                if (p.arriveeSet.has(`${x},${y}`)) arr += r;
                else if (p.depart.some(c => c.x === x && c.y === y)) dep += r;
            }
        }
        // Le quadrillage est le SUPPORT du jeu, pas un décor : c'est lui qui
        // permet de compter les cases d'un coup d'œil et donc de lire un
        // vecteur sans le calculer.
        let grille = '';
        for (let x = 0; x <= p.largeur; x++) grille += `<line x1="${x * PAS}" y1="0" x2="${x * PAS}" y2="${H}" />`;
        for (let y = 0; y <= p.hauteur; y++) grille += `<line x1="0" y1="${y * PAS}" x2="${L}" y2="${y * PAS}" />`;

        const traces = this.voitures.map(v => this.traceSvg(v)).join('');
        const autos = this.voitures.map(v => this.voitureSvg(v)).join('');
        const choix = this.fini || this.moi.robot ? '' : this.choixSvg(this.moi);

        const defs = `<defs>
            ${this.voitures.map(v => `<marker id="cv-pointe-${v.id}" viewBox="0 0 8 8"
                    refX="6" refY="4" markerWidth="4" markerHeight="4" orient="auto">
                <path d="M0 0 L8 4 L0 8 z" fill="${v.teinte}" />
            </marker>`).join('')}
            <pattern id="cv-damier" width="${PAS / 2}" height="${PAS / 2}"
                     patternUnits="userSpaceOnUse">
                <rect width="${PAS / 2}" height="${PAS / 2}" fill="#fff" />
                <rect width="${PAS / 4}" height="${PAS / 4}" fill="#111827" />
                <rect x="${PAS / 4}" y="${PAS / 4}" width="${PAS / 4}" height="${PAS / 4}"
                      fill="#111827" />
            </pattern>
        </defs>`;

        this.svg.innerHTML = `
            ${defs}
            <g class="cv-hors">${hors}</g>
            <g class="cv-sol">${sol}</g>
            <g class="cv-depart">${dep}</g>
            <g class="cv-arrivee">${arr}</g>
            <g class="cv-grille">${grille}</g>
            ${traces}${autos}${choix}`;

        this.svg.querySelectorAll('[data-coup]').forEach(g => {
            const [ax, ay] = g.dataset.coup.split(',').map(Number);
            const jouerCoup = (e) => { e.preventDefault(); this.tenter(ax, ay); };
            g.addEventListener('click', jouerCoup);
            g.addEventListener('touchstart', jouerCoup, { passive: false });
        });

        this.majCommande();
        this.majBarre();
    }

    /** Le même carré de neuf, en boutons — pour le pouce. */
    majCommande() {
        const boite = this.container.querySelector('[data-commande]');
        if (!boite) return;
        if (this.fini || this.moi.robot) { boite.innerHTML = ''; return; }
        const coups = coupsPossibles(this.piste, this.moi.etat);
        boite.innerHTML = coups.map(c => {
            const cle = `${c.ax},${c.ay}`;
            const classe = (c.arrive ? ' cv-touche-acc--arrivee' : c.valide ? '' : ' cv-touche-acc--ko')
                + (this.vise && this.vise.ax === c.ax && this.vise.ay === c.ay ? ' cv-touche-acc--vise' : '');
            return `<button type="button" class="cv-touche-acc${classe}" data-acc="${cle}"
                aria-label="vitesse ${c.vx} ; ${c.vy}"
                ><span class="cv-past" style="--past:${TEINTES_ACC[cle]}"></span></button>`;
        }).join('');
        boite.querySelectorAll('[data-acc]').forEach(b => {
            const [ax, ay] = b.dataset.acc.split(',').map(Number);
            b.onclick = () => this.tenter(ax, ay);
        });
    }

    /**
     * LA TRACE EST UNE SUITE DE VECTEURS, ET ELLE DOIT SE LIRE COMME TELLE.
     *
     * Rémy : « pour la course de vecteurs, dessine en très clair les vecteurs
     * déjà tracés ». C'était une polyligne en pointillé pâle — un joli trait
     * courbe, dans lequel on ne voyait plus rien de ce que le jeu enseigne :
     * ni où chaque tour s'était arrêté, ni de combien la voiture avait avancé,
     * ni même que le chemin est fait de segments DROITS.
     *
     * Chaque tour est donc redessiné pour ce qu'il est : une flèche pleine,
     * avec sa pointe, un point à son arrivée, et ses deux composantes écrites
     * à côté. C'est le cahier de l'élève, celui où l'on écrit (+3 ; −1) sous
     * chaque trait — sauf qu'ici il s'écrit tout seul.
     */
    traceSvg(v) {
        const t = v.etat.trace;
        const C = (c) => ({ x: c.x * PAS + PAS / 2, y: c.y * PAS + PAS / 2 });
        let d = '';
        for (let i = 1; i < t.length; i++) {
            const a = C(t[i - 1]), b = C(t[i]);
            const dx = t[i].x - t[i - 1].x, dy = t[i].y - t[i - 1].y;
            // Le dernier vecteur est le plus foncé : c'est celui qu'on vient de
            // jouer, et celui sur lequel porte la question suivante.
            const vieux = i < t.length - 1 ? ' cv-vecteur--vieux' : '';
            if (dx || dy) {
                d += `<line class="cv-vecteur${vieux}" style="stroke:${v.teinte}"
                    x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
                    marker-end="url(#cv-pointe-${v.id})" />`;
                // LES COMPOSANTES SE POSENT À CÔTÉ DU TRAIT, jamais dessus :
                // décalées perpendiculairement, elles ne masquent ni la flèche
                // ni le quadrillage qu'on compte pour les vérifier.
                const n = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                const ox = -(b.y - a.y) / n * PAS * 0.42, oy = (b.x - a.x) / n * PAS * 0.42;
                d += `<text class="cv-compo${vieux}" style="fill:${v.teinte}"
                    x="${(a.x + b.x) / 2 + ox}" y="${(a.y + b.y) / 2 + oy}"
                    >(${signe(dx)} ; ${signe(dy)})</text>`;
            }
            // Le point d'arrêt de chaque tour : sans lui, deux vecteurs alignés
            // se lisent comme un seul.
            d += `<circle class="cv-arret${vieux}" style="fill:${v.teinte}"
                cx="${b.x}" cy="${b.y}" r="${PAS * 0.11}" />`;
        }
        const sortie = v.etat.sortiPar
            ? `<line class="cv-sortie" x1="${v.etat.x * PAS + PAS / 2}" y1="${v.etat.y * PAS + PAS / 2}"
                 x2="${v.etat.sortiPar.x * PAS + PAS / 2}" y2="${v.etat.sortiPar.y * PAS + PAS / 2}" />`
            : '';
        return `${d}${sortie}`;
    }

    voitureSvg(v) {
        const cx = v.etat.x * PAS + PAS / 2, cy = v.etat.y * PAS + PAS / 2;
        // LA FLÈCHE DE VITESSE PART DE LA VOITURE ET MONTRE OÙ ELLE IRAIT SANS
        // RIEN FAIRE. C'est la seule chose qu'un débutant oublie : la voiture
        // ne s'arrête pas parce qu'on ne touche à rien.
        const fleche = (v.etat.vx || v.etat.vy)
            ? `<line class="cv-fleche" style="stroke:${v.teinte}" x1="${cx}" y1="${cy}"
                 x2="${cx + v.etat.vx * PAS}" y2="${cy + v.etat.vy * PAS}"
                 marker-end="url(#cv-pointe-${v.id})" />`
            : '';
        return `${fleche}<circle class="cv-voiture" cx="${cx}" cy="${cy}" r="${PAS * 0.3}"
            fill="${v.teinte}" />`;
    }

    choixSvg(v) {
        const coups = coupsPossibles(this.piste, v.etat);
        const dedans = coups.map(c => {
            const cx = c.x * PAS + PAS / 2, cy = c.y * PAS + PAS / 2;
            const classe = c.arrive ? 'cv-choix--arrivee' : c.valide ? 'cv-choix--ok' : 'cv-choix--ko';
            const vise = this.vise && this.vise.ax === c.ax && this.vise.ay === c.ay ? ' cv-choix--vise' : '';
            const croix = c.valide || c.arrive ? ''
                : `<line x1="${cx - 1.6}" y1="${cy - 1.6}" x2="${cx + 1.6}" y2="${cy + 1.6}" />
                   <line x1="${cx + 1.6}" y1="${cy - 1.6}" x2="${cx - 1.6}" y2="${cy + 1.6}" />`;
            // La pastille prend la couleur de SON ACCÉLÉRATION, pas celle de la
            // voiture : c'est ce qui l'apparie à la touche du pavé.
            return `<g class="cv-choix ${classe}${vise}" data-coup="${c.ax},${c.ay}"
                        style="color:${TEINTES_ACC[`${c.ax},${c.ay}`] || v.teinte}" role="button"
                        aria-label="vitesse ${c.vx} ; ${c.vy}">
                    <circle cx="${cx}" cy="${cy}" r="${PAS * 0.24}" />
                    ${croix}
                    <circle class="cv-touche" cx="${cx}" cy="${cy}" r="${PAS * 0.46}" />
                </g>`;
        }).join('');
        return `<g>${dedans}</g>`;
    }

    majBarre() {
        const barre = this.container.querySelector('[data-barre]');
        const mot = this.container.querySelector('[data-mot]');
        if (!barre) return;
        barre.innerHTML = this.voitures.map((v, i) => `
            <span class="cv-jauge${i === this.trait && !this.fini ? ' cv-jauge--trait' : ''}"
                  style="color:${v.teinte}">
                <span class="cv-pastille"></span>
                <span style="color:var(--text-main)">${v.nom}</span>
                <span class="cv-vitesse" style="color:var(--text-main)">
                    (${v.etat.vx} ; ${v.etat.vy})</span>
                <span style="color:var(--text-muted)">${v.etat.tours} tours</span>
                ${v.etat.sorties ? `<span style="color:var(--danger)">${v.etat.sorties} sortie${v.etat.sorties > 1 ? 's' : ''}</span>` : ''}
            </span>`).join('')
            + (this.record ? `<span class="cv-jauge" style="color:var(--text-muted)">
                    record théorique : ${this.record} tours</span>` : '');
        // La consigne de la piste a été lue AVANT la course (voir
        // `montrerConsigne`) : cette ligne-ci ne porte plus que ce qui arrive
        // en cours de route, et reste vide le reste du temps.
        if (mot) mot.textContent = this.indice;
    }

    // --- Jouer ---------------------------------------------------------------

    tenter(ax, ay) {
        if (this.fini || !this.isRunning) return;
        const v = this.moi;
        const avant = v.etat;
        const coup = coupsPossibles(this.piste, avant).find(c => c.ax === ax && c.ay === ay);
        if (!coup) return;

        v.etat = jouer(this.piste, avant, ax, ay);
        this.indice = '';
        this.vise = null;

        // UNE QUESTION, C'EST UNE COURSE — pas un coup.
        //
        // Le meneur compte les tentatives pour savoir quand l'étape est finie :
        // en enregistrant chaque coup, une série de dix « questions » s'arrêtait
        // au dixième virage, avant la ligne d'arrivée. Ce qui se juge ici, c'est
        // d'ARRIVER, et le carnet d'erreurs, lui, retient les sorties de piste :
        // ce sont elles qui disent ce qui n'est pas compris.
        if (!v.robot) {
            const question = `Position (${avant.x} ; ${avant.y}), vitesse (${avant.vx} ; ${avant.vy})`;
            if (!coup.valide && !coup.arrive) {
                // SORTIE DE PISTE : une tentative fausse, et la raison DITE.
                // « Tu es sorti » n'apprend rien ; « à cette vitesse tu ne
                // pouvais plus tenir le virage » se retient.
                this.onWrongAnswer(null, {
                    concept: 'geo.transfo.translation',
                    questionText: question,
                    input: `(${coup.vx} ; ${coup.vy})`,
                    expected: 'rester sur la piste',
                    customMessage: coup.trop
                        ? `Trop vite : la vitesse ne dépasse pas ${VITESSE_MAX} cases par tour.`
                        : `Sortie de piste : à la vitesse (${coup.vx} ; ${coup.vy}), la voiture `
                            + 'traverse le décor avant d\'arriver. Il fallait freiner AVANT.',
                    silencieux: false
                });
            }
        }

        if (v.etat.fini) {
            this.fini = true;
            if (!v.robot) {
                const parfait = this.record && v.etat.tours <= this.record;
                this.onCorrectAnswer(null, 'geo.transfo.translation', {
                    points: 20 + (parfait ? 20 : 0) - Math.min(15, v.etat.sorties * 5),
                    questionText: `${this.piste.nom} — arriver sans sortir de la piste`,
                    given: `${v.etat.tours} tours, ${v.etat.sorties} sortie(s)`,
                    expected: `${this.record} tours`
                });
            }
            this.indice = this.voitures.length > 1
                ? `${v.nom} passe la ligne en ${v.etat.tours} tours !`
                : `Arrivée en ${v.etat.tours} tours`
                    + (this.record ? ` (record théorique : ${this.record}).` : '.')
                    + (v.etat.tours <= this.record ? ' Parcours parfait !' : '');
            this.dessiner();
            // La course suivante s'enchaîne toute seule : c'est une série, et
            // le bouton « Recommencer » sert à repartir tout de suite.
            this.relance = setTimeout(() => {
                if (!this.isRunning) return;
                this.choisirPiste(this.params.piste === 'toutes' ? 'toutes' : this.piste.id);
                this.dessiner();
            }, 2800);
            return;
        }

        this.trait = (this.trait + 1) % this.voitures.length;
        this.dessiner();
        if (this.moi.robot) setTimeout(() => this.jouerRobot(), 650);
    }

    jouerRobot() {
        if (this.fini || !this.isRunning || !this.moi.robot) return;
        const c = conseil(this.piste, this.moi.etat, { mou: this.molesse, rng: this.rng });
        this.tenter(c.ax, c.ay);
    }

    /** L'indice : le coup ET la raison, jamais le coup tout seul. */
    souffler() {
        if (this.fini || this.moi.robot) return;
        // LE POINT CONSEILLÉ RESTE MARQUÉ JUSQU'À CE QU'ON JOUE. Effacé au
        // redessin suivant, l'indice disparaissait avant qu'on ait fini de
        // lire la phrase qui l'explique.
        this.vise = conseil(this.piste, this.moi.etat);
        this.indice = expliquerCoup(this.moi.etat, this.vise);
        this.dessiner();
    }

    startGameLoop() { /* jeu au tour par tour : rien à animer */ }

    // --- Le robot montre -----------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.svg);
        this.demoGate = gate;
        const fin = () => {
            cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null;
        };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Une course sur papier quadrillé. La voiture GARDE sa vitesse d\'un tour sur '
            + 'l\'autre : je ne choisis que comment la changer, d\'une case au plus.', this.svg);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Les neuf points sont mes neuf arrivées possibles. Les rouges m\'enverraient '
            + 'dans le décor : je les vois AVANT de jouer.', this.svg);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let tour = 0; tour < 8 && !this.fini; tour++) {
            if (this.gelDemo) { if (!await cur.pause(400)) return fin(); tour--; continue; }
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const c = conseil(this.piste, this.moi.etat);
            cur.say(expliquerCoup(this.moi.etat, c), this.svg);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            const cible = this.svg.querySelector(`[data-coup="${c.ax},${c.ay}"]`);
            if (cible && !await cur.tap(cible, 380)) return fin();
            this.tenter(c.ax, c.ay);
            if (this.moi && this.moi.robot) this.jouerRobot();
            if (!await cur.pause(320) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Le carré des neuf points s\'éloigne à mesure qu\'on accélère : c\'est pour ça '
            + 'qu\'il faut freiner AVANT le virage, jamais dedans.', this.svg);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        this.container.onkeydown = null;
        if (this.relance) { clearTimeout(this.relance); this.relance = null; }
        super.destroy();
    }
}

export function engineCourseVecteurs(container, isDemo, params) {
    const jeu = new CourseVecteurs(container, isDemo, params);
    jeu.start();
    return jeu;
}
