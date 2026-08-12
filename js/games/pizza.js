// LA PIZZERIA DES FRACTIONS — garnir une commande, part par part.
//
// « Les deux tiers de champignons et le quart de sauce tomate. » Deux
// dénominateurs différents : on ne peut rien poser tant qu'on n'a pas trouvé le
// découpage où les deux se comptent en même chose. C'est le PPCM, et la pizza
// arrive coupée en autant de parts — douze pour 3 et 4. Les deux tiers font
// alors huit parts, le quart en fait trois.
//
// L'élève ne calcule pas une fraction équivalente sur une feuille : il compte
// des parts, et le nombre qu'il trouve EST le numérateur. C'est le même
// raisonnement, mais dans le sens où il se comprend.
//
// Deux gestes, parce qu'ils ne conviennent pas aux mêmes mains : on choisit un
// ingrédient puis on tape les parts (et on peut BALAYER pour en garnir
// plusieurs d'un trait), ou bien on fait glisser l'ingrédient depuis la caisse
// jusqu'à la part. Le second est le plus naturel au doigt, le premier le plus
// rapide quand on a compris.
//
// Les nombres vivent dans core/pizza.js, sans DOM et testés : une commande qui
// ne tiendrait pas sur une pizza ferait chercher à l'élève une erreur qui n'est
// pas la sienne.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    INGREDIENTS, tirerCommande, verifier, expliquer, direFraction,
    complement, parts
} from '../core/pizza.js';

const NIVEAUX = {
    facile: { nbFractions: 2, denominateurs: [2, 3, 4], label: '2 fractions · moitiés, tiers, quarts' },
    moyen: { nbFractions: 2, denominateurs: [2, 3, 4, 6], label: '2 fractions · jusqu\'aux sixièmes' },
    difficile: { nbFractions: 3, denominateurs: [2, 3, 4, 6, 8], label: '3 fractions · jusqu\'aux huitièmes' }
};

// Le dessin de chaque ingrédient, posé au milieu d'une part. Les fractions se
// comptent à l'œil : deux garnitures qui se ressemblent, et la pizza n'est plus
// lisible au moment précis où il faut la compter.
const DESSINS = {
    // Chaque ingrédient est dessiné PLUSIEURS FOIS, à des positions et des
    // tailles décalées : une seule rondelle bien centrée fait un pictogramme,
    // trois rondelles éparpillées font une garniture. La différence est
    // exactement celle entre un schéma et une pizza.
    tomate: (r) => semer(r, 3, (u, k) => `
        <circle r="${u * .34}" fill="#e23b2e" />
        <circle r="${u * .34}" fill="none" stroke="#a81f14" stroke-width="${u * .07}" opacity=".55" />
        <path d="M${-u * .2} 0 A${u * .2} ${u * .2} 0 0 1 ${u * .2} 0Z" fill="#f87171" opacity=".55"
              transform="rotate(${k * 47})" />`),
    champignons: (r) => semer(r, 3, (u) => `
        <path d="M${-u * .38} ${u * .04} a${u * .38} ${u * .33} 0 0 1 ${u * .76} 0 z"
              fill="#efe0c9" stroke="#9c7d5c" stroke-width="${u * .07}" stroke-linejoin="round" />
        <path d="M${-u * .13} ${u * .04} h${u * .26} l${-u * .04} ${u * .3}
                 a${u * .09} ${u * .09} 0 0 1 ${-u * .18} 0 z"
              fill="#faf3e6" stroke="#9c7d5c" stroke-width="${u * .06}" stroke-linejoin="round" />
        <path d="M${-u * .2} ${u * .02} h${u * .4}" stroke="#c4a883" stroke-width="${u * .05}" />`),
    olives: (r) => semer(r, 4, (u) => `
        <ellipse rx="${u * .3}" ry="${u * .25}" fill="#3d2168" />
        <ellipse rx="${u * .3}" ry="${u * .25}" fill="none" stroke="#241040" stroke-width="${u * .07}" />
        <ellipse rx="${u * .11}" ry="${u * .09}" fill="#f6efdd" />`),
    jambon: (r) => semer(r, 3, (u, k) => `
        <g transform="rotate(${k * 37})">
            <path d="M${-u * .38} ${-u * .16} q${u * .19} ${-u * .16} ${u * .38} 0
                     t${u * .38} 0 v${u * .3} q${-u * .19} ${u * .16} ${-u * .38} 0
                     t${-u * .38} 0 z"
                  fill="#f2839f" stroke="#cf5878" stroke-width="${u * .07}" stroke-linejoin="round" />
            <circle cx="${-u * .12}" cy="${u * .02}" r="${u * .06}" fill="#fbd0dc" />
            <circle cx="${u * .18}" cy="${u * .06}" r="${u * .05}" fill="#fbd0dc" />
        </g>`),
    poivron: (r) => semer(r, 3, (u, k) => `
        <g transform="rotate(${k * 63})">
            <path d="M${-u * .34} 0 a${u * .34} ${u * .28} 0 1 1 ${u * .68} 0
                     a${u * .34} ${u * .28} 0 1 1 ${-u * .68} 0 z"
                  fill="none" stroke="#15803d" stroke-width="${u * .13}" />
            <path d="M${-u * .34} 0 a${u * .34} ${u * .28} 0 0 1 ${u * .68} 0"
                  fill="none" stroke="#4ade80" stroke-width="${u * .05}" />
        </g>`),
    ananas: (r) => semer(r, 3, (u, k) => `
        <g transform="rotate(${k * 29})">
            <path d="M${-u * .3} ${-u * .26} h${u * .6} l${-u * .1} ${u * .55} h${-u * .4} z"
                  fill="#fbcf3b" stroke="#c98a0c" stroke-width="${u * .07}" stroke-linejoin="round" />
            <path d="M${-u * .16} ${-u * .1} h${u * .32}" stroke="#e9a615" stroke-width="${u * .05}" />
            <circle r="${u * .07}" cy="${u * .06}" fill="#fef3c7" />
        </g>`)
};

// Les positions de semis : un hasard FIXE, pour que la garniture ne saute pas
// d'un endroit à l'autre au moindre redessin. Trois morceaux en triangle
// irrégulier, ça remplit sans faire de motif.
const SEMIS = [
    { x: -.42, y: -.30, e: 1.00 }, { x: .40, y: -.18, e: .88 },
    { x: -.06, y: .40, e: .95 }, { x: .34, y: .38, e: .78 }
];

/** Répète un motif sur les positions de semis, à l'échelle de la part. */
function semer(r, combien, motif) {
    const u = r * 1.15;
    return SEMIS.slice(0, combien).map((p, k) =>
        `<g transform="translate(${p.x * r},${p.y * r}) scale(${p.e})">${motif(u, k)}</g>`).join('');
}

// Le fond d'une part garnie : la couleur de l'ingrédient, très éclaircie, pour
// rester une pizza et non un camembert statistique.
// La mozzarella : UN aplat, le même pour toutes les parts nues.
const FROMAGE = '#f7dda2';

const TEINTES_PART = {
    tomate: '#f3a9a2', champignons: '#e8d3b4', olives: '#c9bde4',
    jambon: '#f8c8dc', poivron: '#bfe3c3', ananas: '#fbe9a7'
};

const par = (id) => INGREDIENTS.find(i => i.id === id) || INGREDIENTS[0];

class Pizza extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'pizza');
        this.niveau = NIVEAUX[this.params.niveau] || NIVEAUX.moyen;
        this.rng = makeRng(this.params.seed);
        this.reussies = 0;
        this.ratees = 0;
    }

    // --- Mise en place -----------------------------------------------------------

    render() {
        this.container.innerHTML = `
            <style>
                .pz-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 6px;
                    width: 100%; height: 100%; color: var(--text-main);
                    user-select: none; -webkit-user-select: none;
                }
                .pz-haut {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    flex-wrap: wrap; width: 100%; flex: 0 0 auto;
                    font-size: clamp(11px, 2.6cqw, 14px); font-weight: 700;
                }
                .pz-score { color: var(--text-muted); font-weight: 600; }
                .pz-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: .82rem; padding: 4px 10px;
                }
                .pz-btn:hover { background: var(--bg-hover); }

                /* LE BON DE COMMANDE. Une ligne = une fraction et son
                   ingrédient : « un quart d'ananas ». RIEN D'AUTRE.
                   Il affichait « 0 / 8 », c'est-à-dire la réponse : combien de
                   huitièmes font un quart était justement la question posée.
                   Le nombre de parts DÉJÀ POSÉES reste, lui — l'élève peut les
                   compter sur la pizza, l'écrire ne lui apprend rien de plus. */
                .pz-commande {
                    display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
                    width: 100%; max-width: 640px; flex: 0 0 auto;
                }
                .pz-ligne {
                    display: flex; align-items: center; gap: 7px;
                    padding: 5px 11px; border-radius: 12px; font-weight: 700;
                    background: var(--bg-hover); border: 2px solid transparent;
                    font-size: clamp(11px, 2.5cqw, 13.5px); transition: .15s;
                }
                /* La ligne sur laquelle l'élève travaille en ce moment. Elle
                   ne dit pas si le compte est bon : elle dit seulement quel
                   ingrédient la main tient. */
                .pz-ligne--actif { border-color: var(--primary); }
                .pz-pastille { width: 15px; height: 15px; border-radius: 50%; flex-shrink: 0; }
                .pz-compteur { font-variant-numeric: tabular-nums; color: var(--text-muted); font-weight: 800; }

                .pz-scene {
                    flex: 1 1 auto; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                }
                .pz-svg { width: 100%; height: 100%; display: block; touch-action: none; }
                .pz-part { cursor: pointer; }
                .pz-part:hover .pz-fond { filter: brightness(1.06); }

                /* LA CAISSE À INGRÉDIENTS : on en choisit un, ou on le fait
                   glisser sur une part. Le bac sélectionné est franchement
                   marqué — sans ça, on verse du poivron en croyant verser des
                   champignons, et l'erreur n'est pas mathématique. */
                .pz-bacs {
                    display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
                    width: 100%; flex: 0 0 auto;
                }
                .pz-bac {
                    display: flex; flex-direction: column; align-items: center; gap: 2px;
                    padding: 6px 10px 5px; border-radius: 14px; cursor: grab;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); font: inherit; font-weight: 700;
                    font-size: .68rem; touch-action: none;
                    -webkit-tap-highlight-color: transparent;
                    box-shadow: 0 3px 0 rgba(15,23,42,.12);
                }
                .pz-bac--actif { border-color: currentColor; transform: translateY(-2px); }
                .pz-bac--actif .pz-bac-nom { color: inherit; }
                .pz-bac-nom { color: var(--text-muted); }
                .pz-bac svg { display: block; }
                .pz-gomme { color: var(--text-muted); }

                /* Le grain d'ingrédient qui suit le doigt pendant le glissé. */
                .pz-grain {
                    position: fixed; z-index: 60; pointer-events: none;
                    transform: translate(-50%, -50%); filter: drop-shadow(0 3px 5px rgba(0,0,0,.3));
                }

                .pz-note {
                    min-height: 2.5em; text-align: center; width: 100%; max-width: 640px;
                    font-size: clamp(11px, 2.7cqw, 14px); line-height: 1.35;
                    color: var(--text-muted); flex: 0 0 auto;
                }
                .pz-note b { color: var(--text-main); }
                .pz-bulle { display: inline-block; padding: 5px 13px; border-radius: 999px; font-weight: 700; }
                .pz-bulle--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .pz-bulle--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }

                .pz-four {
                    border: 0; border-radius: 999px; padding: 9px 26px; cursor: pointer;
                    font: inherit; font-weight: 900; font-size: clamp(13px, 3cqw, 16px);
                    background: var(--primary); color: #fff; flex: 0 0 auto;
                    box-shadow: 0 3px 0 rgba(15,23,42,.2);
                }
                .pz-four:disabled { opacity: .4; cursor: default; box-shadow: none; }
                .pz-four:active:not(:disabled) { transform: translateY(3px); box-shadow: none; }
            </style>
            <div class="pz-wrap">
                <div class="pz-haut">
                    <span data-titre></span>
                    <span class="pz-score" data-score></span>
                    <button type="button" class="pz-btn" data-neuf>↺ Autre commande</button>
                </div>
                <div class="pz-commande" data-commande></div>
                <div class="pz-scene" data-scene></div>
                <div class="pz-bacs" data-bacs></div>
                <p class="pz-note" data-note></p>
                <button type="button" class="pz-four" data-four>🔥 Au four !</button>
            </div>`;

        this.sceneEl = this.container.querySelector('[data-scene]');
        this.commandeEl = this.container.querySelector('[data-commande]');
        this.bacsEl = this.container.querySelector('[data-bacs]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.titreEl = this.container.querySelector('[data-titre]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.fourEl = this.container.querySelector('[data-four]');
        this.fourEl.addEventListener('click', () => this.enfourner());
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.nouvelleCommande());

        this.nouvelleCommande();
    }

    startGameLoop() { /* Rien à animer en continu : on garnit à son rythme. */ }

    nouvelleCommande() {
        this.commande = tirerCommande({ ...this.niveau, rng: this.rng });
        if (!this.commande) { this.note('Impossible de composer une commande.', 'ko'); return; }
        this.garniture = new Array(this.commande.parts).fill(null);
        this.choisi = this.commande.fractions[0].ingredient;
        this.cuite = false;

        const dens = this.commande.fractions.map(f => f.den);
        this.titreEl.innerHTML = `🍕 Pizza en <b>${this.commande.parts}</b> parts `
            + `<span style="font-weight:500">(PPCM de ${dens.join(' et ')})</span>`;
        this.dessinerPizza();
        this.dessinerBacs();
        this.majCommande();
        this.majScore();
        this.fourEl.disabled = false;
        this.note(`${dens.join(' et ')} n'ont pas le même dénominateur : on coupe la pizza en <b>${this.commande.parts}</b> parts, `
            + `le plus petit découpage qui convient aux deux. Choisis un ingrédient et garnis.`);
    }

    majScore() {
        this.scoreEl.textContent = `${this.reussies} pizza${this.reussies > 1 ? 's' : ''} réussie${this.reussies > 1 ? 's' : ''}`
            + (this.ratees ? ` · ${this.ratees} à refaire` : '');
    }

    // --- Le bon de commande --------------------------------------------------------

    majCommande() {
        const compte = {};
        this.garniture.forEach(g => { if (g) compte[g] = (compte[g] || 0) + 1; });
        this.commandeEl.innerHTML = this.commande.fractions.map(f => {
            const ing = par(f.ingredient);
            const pose = compte[f.ingredient] || 0;
            // « un quart d'ananas », et rien de plus : combien de parts cela
            // fait sur cette pizza-là est TOUTE la question de l'exercice.
            const actif = f.ingredient === this.choisi ? ' pz-ligne--actif' : '';
            return `<span class="pz-ligne${actif}">
                <span class="pz-pastille" style="background:${ing.teinte}"></span>
                ${direFraction(f.num, f.den)} ${complement(ing.nom)}
                ${pose ? `<span class="pz-compteur">${pose} posée${pose > 1 ? 's' : ''}</span>` : ''}
            </span>`;
        }).join('');
    }

    // --- La pizza -------------------------------------------------------------------

    dessinerPizza() {
        const n = this.commande.parts;
        const R = 150, cx = 170, cy = 170;
        const croute = R + 16;

        // Une part = un secteur. On la trace en partant du haut et dans le sens
        // des aiguilles : c'est le sens où l'on compte spontanément.
        const secteur = (i, rayon) => {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
            const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
            const x0 = cx + rayon * Math.cos(a0), y0 = cy + rayon * Math.sin(a0);
            const x1 = cx + rayon * Math.cos(a1), y1 = cy + rayon * Math.sin(a1);
            const grand = (a1 - a0) > Math.PI ? 1 : 0;
            return `M${cx} ${cy} L${x0} ${y0} A${rayon} ${rayon} 0 ${grand} 1 ${x1} ${y1} Z`;
        };
        const milieu = (i, k = 0.62) => {
            const a = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
            return { x: cx + R * k * Math.cos(a), y: cy + R * k * Math.sin(a) };
        };
        this.geo = { n, R, cx, cy, milieu };

        // LES PARTS SE DÉTACHENT. Un très léger écartement depuis le centre,
        // et chacune projette son ombre : c'est ce qui fait qu'on voit des
        // PARTS et non un disque rayé. Sur un camembert de statistiques les
        // secteurs se touchent ; sur une pizza coupée, non.
        const ecart = 5;
        const decale = (i) => {
            const a = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
            return `translate(${ecart * Math.cos(a)},${ecart * Math.sin(a)})`;
        };
        const parts = Array.from({ length: n }, (_, i) => `
            <g class="pz-part" data-part="${i}" transform="${decale(i)}">
                <path class="pz-fond" d="${secteur(i, R)}" fill="${FROMAGE}" />
                <g data-garni="${i}"></g>
                <path d="${secteur(i, R)}" fill="none" stroke="#e2b06a" stroke-width="1.6"
                      stroke-linejoin="round" opacity=".75" />
            </g>`).join('');

        // La croûte : un anneau doré, ses cloques de cuisson, et quelques
        // taches de four. Sans elles, on regarde une roue en bois.
        const cloques = Array.from({ length: 18 }, (_, k) => {
            const a = (k / 18) * Math.PI * 2 + 0.21;
            const rr = croute - 8 - (k % 3) * 2.5;
            const taille = 4.2 + (k % 4) * 1.1;
            return `<circle cx="${cx + rr * Math.cos(a)}" cy="${cy + rr * Math.sin(a)}"
                            r="${taille}" fill="${k % 3 === 0 ? '#a4661f' : '#f7d4a0'}"
                            opacity="${k % 3 === 0 ? .5 : .6}" />`;
        }).join('');

        this.sceneEl.innerHTML = `
            <svg class="pz-svg" viewBox="0 0 340 340" preserveAspectRatio="xMidYMid meet"
                 role="img" aria-label="Pizza en ${n} parts">
                <!-- APLATS. Les dégradés radiaux et l'ombre portée donnaient une
                     pizza en relief, jolie de près et brouillonne de loin : la
                     mozzarella passait du crème au doré, si bien que deux parts
                     nues n'avaient pas la même couleur selon leur place sur le
                     disque. Or ce qu'on demande ici, c'est de COMPTER des parts
                     identiques. Un aplat par matière, un liseré net entre elles,
                     et les parts se comparent d'un regard. -->
                <circle cx="${cx}" cy="${cy}" r="${croute}" fill="#e7a95d" />
                <circle cx="${cx}" cy="${cy}" r="${croute}" fill="none" stroke="#c9853a" stroke-width="2.5" />
                ${cloques}
                <!-- La sauce déborde sous le fromage : c'est ce liseré rouge qui
                     fait « pizza » plutôt que « galette ». -->
                <circle cx="${cx}" cy="${cy}" r="${R + 5}" fill="#c9402c" />
                ${parts}
                <circle cx="${cx}" cy="${cy}" r="2.5" fill="#d9a05b" opacity=".5" />
            </svg>`;

        this.brancherGestes();
    }

    /** Repeint une part : le fond prend la teinte, le dessin se pose dessus. */
    peindre(i) {
        const id = this.garniture[i];
        const g = this.sceneEl.querySelector(`[data-garni="${i}"]`);
        const fond = this.sceneEl.querySelector(`[data-part="${i}"] .pz-fond`);
        if (!g || !fond) return;
        if (!id) { g.innerHTML = ''; fond.setAttribute('fill', FROMAGE); return; }
        const ing = par(id);
        // La part prend la TEINTE de son ingrédient, pas seulement son dessin :
        // c'est à l'œil qu'on doit compter « huit parts sur douze ». Avec deux
        // petits champignons posés au milieu d'une part beige, il faut viser
        // chaque part pour savoir si elle est garnie — et on recompte trois
        // fois. Un fond coloré se compte d'un regard.
        fond.setAttribute('fill', TEINTES_PART[id] || FROMAGE);
        const m = this.geo.milieu(i);
        const r = Math.min(30, (this.geo.R * 1.7) / this.geo.n + 10);
        g.innerHTML = `<g transform="translate(${m.x},${m.y})">${DESSINS[id](r)}</g>`;
        g.setAttribute('data-ing', ing.id);
    }

    // --- Les ingrédients --------------------------------------------------------------

    dessinerBacs() {
        const utiles = this.commande.fractions.map(f => par(f.ingredient));
        this.bacsEl.innerHTML = utiles.map(ing => `
            <button type="button" class="pz-bac" data-bac="${ing.id}" style="color:${ing.teinte}"
                aria-label="${ing.nom}">
                <svg width="30" height="30" viewBox="-16 -16 32 32">${DESSINS[ing.id](15)}</svg>
                <span class="pz-bac-nom">${ing.nom}</span>
            </button>`).join('')
            + `<button type="button" class="pz-bac pz-gomme" data-bac="" aria-label="Enlever la garniture">
                <svg width="30" height="30" viewBox="-16 -16 32 32" fill="none" stroke="currentColor"
                    stroke-width="2.4" stroke-linecap="round"><path d="M-8 -8 L8 8 M8 -8 L-8 8" /></svg>
                <span class="pz-bac-nom">enlever</span>
            </button>`;
        this.bacsEl.querySelectorAll('[data-bac]').forEach(b => {
            b.addEventListener('pointerdown', (e) => this.prendreIngredient(e, b));
        });
        this.majBacs();
    }

    majBacs() {
        this.bacsEl.querySelectorAll('[data-bac]').forEach(b => {
            b.classList.toggle('pz-bac--actif', b.dataset.bac === (this.choisi || ''));
        });
    }

    /**
     * Prendre un ingrédient — d'un simple appui, ou pour le faire glisser.
     *
     * Les deux gestes partagent le même début : on ne demande pas à l'enfant de
     * décider avant de toucher lequel des deux il fait. S'il lâche sans bouger,
     * l'ingrédient est simplement sélectionné ; s'il glisse jusqu'à une part,
     * elle est garnie au lâcher.
     */
    prendreIngredient(e, bouton) {
        if (this.isDemo || this.cuite) return;
        e.preventDefault();
        const id = bouton.dataset.bac;
        this.choisi = id;
        this.majBacs();
        // Le bon de commande souligne la ligne de l'ingrédient en main : c'est
        // le seul lien entre « le quart d'ananas » et le bac qu'on vient de
        // prendre, maintenant que le compteur ne l'annonce plus.
        this.majCommande();

        const grain = document.createElement('div');
        grain.className = 'pz-grain';
        grain.innerHTML = id
            ? `<svg width="42" height="42" viewBox="-16 -16 32 32">${DESSINS[id](15)}</svg>`
            : `<svg width="34" height="34" viewBox="-16 -16 32 32" fill="none" stroke="#64748b"
                 stroke-width="3" stroke-linecap="round"><path d="M-8 -8 L8 8 M8 -8 L-8 8" /></svg>`;
        grain.style.left = `${e.clientX}px`;
        grain.style.top = `${e.clientY}px`;
        grain.style.display = 'none';
        document.body.appendChild(grain);

        let bouge = false;
        const suivre = (ev) => {
            if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 6) {
                bouge = true; grain.style.display = '';
            }
            grain.style.left = `${ev.clientX}px`;
            grain.style.top = `${ev.clientY}px`;
        };
        const lacher = (ev) => {
            window.removeEventListener('pointermove', suivre);
            window.removeEventListener('pointerup', lacher);
            window.removeEventListener('pointercancel', lacher);
            grain.remove();
            if (!bouge) return;                       // simple sélection
            const cible = document.elementFromPoint(ev.clientX, ev.clientY);
            const part = cible && cible.closest('[data-part]');
            if (part) this.garnir(Number(part.dataset.part));
        };
        window.addEventListener('pointermove', suivre);
        window.addEventListener('pointerup', lacher);
        window.addEventListener('pointercancel', lacher);
    }

    /**
     * Garnir au doigt, en BALAYANT : une fois l'ingrédient choisi, on passe sur
     * les parts et elles se remplissent. Huit parts à taper une par une, c'est
     * huit occasions de rater le geste sur une chose déjà comprise.
     */
    brancherGestes() {
        const svg = this.sceneEl.querySelector('.pz-svg');
        if (!svg) return;
        let actif = false;
        const partSous = (ev) => {
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const p = el && el.closest('[data-part]');
            return p ? Number(p.dataset.part) : null;
        };
        svg.addEventListener('pointerdown', (ev) => {
            if (this.isDemo || this.cuite) return;
            ev.preventDefault();
            actif = true;
            const i = partSous(ev);
            if (i !== null) this.garnir(i);
        });
        svg.addEventListener('pointermove', (ev) => {
            if (!actif) return;
            const i = partSous(ev);
            if (i !== null) this.garnir(i);
        });
        const stop = () => { actif = false; };
        svg.addEventListener('pointerup', stop);
        svg.addEventListener('pointercancel', stop);
        svg.addEventListener('pointerleave', stop);
    }

    garnir(i) {
        if (this.cuite || this.garniture[i] === (this.choisi || null)) return;
        this.garniture[i] = this.choisi || null;
        this.peindre(i);
        this.majCommande();
    }

    // --- Le four ----------------------------------------------------------------------

    enfourner() {
        if (this.cuite) return;
        const r = verifier(this.commande, this.garniture);
        if (r.ok) {
            this.cuite = true;
            this.reussies++;
            this.fourEl.disabled = true;
            this.majScore();
            const dit = this.commande.fractions
                .map(f => `${direFraction(f.num, f.den)} = ${parts(this.commande.cible[f.ingredient])} sur ${this.commande.parts}`)
                .join(', ');
            this.note(`🍕 Parfait ! ${dit}.`, 'ok');
            if (!this.isDemo) {
                this.onCorrectAnswer(null, 'num.frac.denominateur-commun', {
                    points: 25,
                    questionText: this.commande.fractions.map(f => `${f.num}/${f.den}`).join(' + ')
                        + ` sur ${this.commande.parts} parts`,
                    given: 'juste', expected: 'juste'
                });
            }
            this.timerId = setTimeout(() => { if (this.isRunning) this.nouvelleCommande(); }, 2800);
            return;
        }

        this.ratees++;
        this.majScore();
        // On explique LE premier compte faux, pas les trois : une correction
        // qu'on ne lit pas ne corrige rien.
        const faux = r.detail.find(d => !d.ok);
        const message = r.intrus.length
            ? `${par(r.intrus[0]).nom} : ce n'était pas dans la commande. Enlève-le avec la croix.`
            : expliquer(this.commande, faux);
        this.note(message, 'ko');
        if (!this.isDemo) {
            this.onWrongAnswer(null, {
                concept: 'num.frac.denominateur-commun',
                questionText: faux ? `${faux.num}/${faux.den} sur ${this.commande.parts} parts` : 'garniture hors commande',
                input: faux ? `${faux.pose} parts` : r.intrus.join(', '),
                expected: faux ? `${faux.attendu} parts` : 'rien',
                customMessage: message,
                silencieux: true
            });
        }
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="pz-bulle pz-bulle--${ton}">${html}</span>` : html;
    }

    // --- Le robot ------------------------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.sceneEl);
        this.demoGate = gate;
        const fin = () => { cur?.destroy(); gate?.destroy(); this.demoCursor = null; this.demoGate = null; };
        const f = this.commande.fractions;
        const dens = f.map(x => x.den);

        if (!await cur.pause(600) || !this.isRunning) return fin();
        // Une idée par bulle : le robot attend le temps de lire ce qu'il dit.
        cur.say(`${dens.join(' et ')} : pas le même dénominateur.`, this.commandeEl);
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`On coupe en ${this.commande.parts} : ${dens.join(' et ')} divisent ${this.commande.parts}.`, this.sceneEl);
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

        for (const frac of f) {
            const ing = par(frac.ingredient);
            const cible = this.commande.cible[frac.ingredient];
            const facteur = this.commande.parts / frac.den;

            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say(`${direFraction(frac.num, frac.den)} : ${frac.num} × ${facteur} = ${parts(cible)}.`, this.commandeEl);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

            const bac = this.bacsEl.querySelector(`[data-bac="${ing.id}"]`);
            this.choisi = ing.id;
            this.majBacs();
            this.majCommande();
            if (bac && !await cur.tap(bac)) return fin();

            for (let k = 0; k < cible; k++) {
                const libre = this.garniture.findIndex(g => !g);
                if (libre < 0) break;
                const part = this.sceneEl.querySelector(`[data-part="${libre}"]`);
                if (part && !await cur.moveTo(part)) return fin();
                this.garniture[libre] = ing.id;
                this.peindre(libre);
                this.majCommande();
                if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
            }
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Le compte y est : au four.', this.fourEl);
        if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
        if (!await cur.tap(this.fourEl)) return fin();
        this.enfourner();
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        document.querySelectorAll('.pz-grain').forEach(g => g.remove());
        super.destroy();
    }
}

export function enginePizza(container, isDemo, params) {
    const jeu = new Pizza(container, isDemo, params);
    jeu.start();
    return jeu;
}
