// LE CANON DES COMPLÉMENTS — préparer le boulet qui fait le compte.
//
// Des ASTÉROÏDES foncent sur le canon orbital, chacun porte un nombre. On
// PRÉPARE sa charge au pavé — un 23 s'approche et la cible est 100 : on
// charge 77 — puis on TAPE l'astéroïde visé, et le tir part à sa rencontre.
// À l'impact, si la somme fait la cible, il éclate ; sinon le tir est perdu et
// la roche CONTINUE SA ROUTE. Un astéroïde qui atteint le canon coûte une vie.
//
// Le décor est l'espace, et ce n'est pas qu'une image : au sol, une ligne
// d'horizon n'autorisait qu'une seule direction d'arrivée. Dans le vide, les
// voies se répartissent librement — et l'on peut donc en remplir plusieurs à
// la fois, ce qui est tout l'enjeu des niveaux avancés.
//
// Ce qui fait travailler le complément mieux qu'une question posée : ON
// PRÉPARE AVANT DE TIRER. Le calcul précède le geste, comme le joueur de
// fléchettes calcule avant de lancer — et l'erreur s'affiche en toutes
// lettres : « 23 + 71 = 94, pas 100 ».
//
// Les VOIES suivent la cible : une pour 10, deux pour 100, trois pour 1000 —
// plus la cible est grande, plus il y a de circulation. Sur un écran large
// les voies sont des LIGNES (le canon à gauche, les boulets arrivent de
// droite) ; sur un téléphone tenu droit, des COLONNES (le canon en bas).

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { CSS_GLISSER } from '../core/glisserDeposer.js';

const COMPETENCE = 'num.complement';

/**
 * Les valeurs qu'un boulet peut porter, par cible et par niveau.
 *
 * LA PROGRESSION EST LE CŒUR DU JEU. On ne commence pas par 23 : à 100, les
 * premiers boulets sont des dizaines rondes (30 → 70), puis des multiples de
 * cinq (35 → 65), et seulement quand l'élève tient la mécanique arrivent les
 * nombres quelconques (23 → 77), qui demandent la vraie technique — compléter
 * d'abord les unités à 10, puis les dizaines à 90.
 */
export function tirerValeur(cible, niveau, rng) {
    if (cible === 10) return rng.int(1, 9);
    const pas = cible === 100
        ? (niveau <= 2 ? 10 : (niveau <= 4 ? 5 : 1))
        : (niveau <= 2 ? 100 : (niveau <= 4 ? 50 : (niveau <= 6 ? 10 : 1)));
    return rng.int(1, cible / pas - 1) * pas;
}

/** Ce que le pas courant demande, en clair — pour l'annonce de niveau. */
export function direPalier(cible, niveau) {
    if (cible === 10) return 'les amis de 10';
    if (niveau <= 2) return cible === 100 ? 'des dizaines rondes' : 'des centaines rondes';
    if (niveau <= 4) return cible === 100 ? 'des multiples de 5' : 'des multiples de 50';
    if (cible === 100) return 'des nombres quelconques — complète les unités à 10, puis les dizaines à 90';
    return niveau <= 6 ? 'des dizaines' : 'des nombres quelconques';
}

class Canon extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'canon');
        this.rng = makeRng(this.params.seed);
        this.cible = Number(this.params.cible) || 100;
        this.voies = this.cible === 10 ? 1 : (this.cible === 100 ? 2 : 3);
        this.viesDepart = Number(this.params.vies) || 3;
        this.rafId = null;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .cn-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                }
                .cn-tete { display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .92rem; }
                .cn-cible { font-weight: 900; color: var(--primary); font-size: 1.1rem; }
                .cn-palier { color: var(--text-muted); font-size: .82rem; font-style: italic; }

                /* L'ESPACE. Le champ de bataille au sol enfermait le jeu dans
                   une ligne d'horizon : des boulets qui roulent ne peuvent
                   venir que d'un côté, et la troisième voie n'avait nulle part
                   où passer. Dans le vide il n'y a ni haut ni bas — les voies
                   se répartissent librement, on peut en ouvrir plus, et les
                   astéroïdes arrivent de partout à la fois. */
                /* LE TERRAIN PREND LA HAUTEUR QU'ON LUI DONNE. Figé à 320 px,
                   il laissait la moitié basse d'un écran d'ordinateur vide et
                   les astéroïdes traversaient une meurtrière. Il grandit avec
                   l'écran, sans jamais descendre sous la taille où l'on ne
                   distingue plus les voies. */
                .cn-terrain {
                    position: relative; width: min(94cqw, 860px);
                    height: clamp(260px, 66cqh, 520px);
                    border-radius: 14px; overflow: hidden;
                    border: 3px solid color-mix(in srgb, var(--text-main) 70%, transparent);
                    background:
                        radial-gradient(circle at 74% 20%, rgba(167,139,250,.30), transparent 44%),
                        radial-gradient(circle at 26% 78%, rgba(56,189,248,.20), transparent 42%),
                        radial-gradient(circle at 96% 92%, rgba(244,114,182,.16), transparent 38%),
                        linear-gradient(160deg, #04051a 0%, #0a0f36 48%, #150a33 100%);
                    touch-action: manipulation; user-select: none;
                    box-shadow: inset 0 0 60px rgba(0,0,0,.6);
                }
                .cn-wrap--colonne .cn-terrain { height: min(56cqh, 420px); }

                /* Le champ d'étoiles : deux couches, dont une qui scintille. */
                .cn-terrain::before {
                    content: ''; position: absolute; inset: 0; pointer-events: none;
                    background:
                        radial-gradient(1.6px 1.6px at 12% 18%, rgba(255,255,255,.9), transparent),
                        radial-gradient(1.2px 1.2px at 28% 62%, rgba(255,255,255,.6), transparent),
                        radial-gradient(1.8px 1.8px at 44% 12%, rgba(255,255,255,.8), transparent),
                        radial-gradient(1.2px 1.2px at 58% 78%, rgba(255,255,255,.55), transparent),
                        radial-gradient(1.6px 1.6px at 71% 40%, rgba(255,255,255,.75), transparent),
                        radial-gradient(1.2px 1.2px at 86% 66%, rgba(255,255,255,.6), transparent),
                        radial-gradient(1.4px 1.4px at 94% 14%, rgba(255,255,255,.7), transparent),
                        radial-gradient(1.2px 1.2px at 8% 88%, rgba(255,255,255,.5), transparent);
                }
                .cn-terrain::after {
                    content: ''; position: absolute; inset: 0; pointer-events: none;
                    background:
                        radial-gradient(1.4px 1.4px at 22% 34%, rgba(191,219,254,.9), transparent),
                        radial-gradient(1.4px 1.4px at 52% 52%, rgba(254,240,138,.8), transparent),
                        radial-gradient(1.4px 1.4px at 78% 26%, rgba(255,255,255,.85), transparent),
                        radial-gradient(1.4px 1.4px at 36% 86%, rgba(196,181,253,.8), transparent);
                    animation: cn-scintille 2.6s ease-in-out infinite alternate;
                }
                @keyframes cn-scintille { from { opacity: .25; } to { opacity: 1; } }

                /* LA PLANÈTE : un repère de profondeur, posé au fond. Elle
                   donne l'échelle, et le vide cesse d'être un fond uni. */
                /* Elle occupait 46 % du terrain, posée juste sous le canon :
                   un disque bleu plus large que haut l'arène, qui prenait le
                   premier plan alors qu'il est un DÉCOR. Réduite et effacée,
                   elle redonne la profondeur qu'on lui demandait sans se
                   mettre devant le jeu. */
                .cn-planete {
                    position: absolute; border-radius: 50%; pointer-events: none;
                    left: -12%; bottom: -30%; width: 28%; aspect-ratio: 1;
                    background:
                        radial-gradient(circle at 34% 26%, #93c5fd 0%, #3b82f6 34%, #1d4ed8 62%, #0b1a52 100%);
                    box-shadow: 0 0 42px rgba(59,130,246,.25), inset -14px -12px 32px rgba(0,0,0,.6);
                    opacity: .55;
                }
                .cn-planete::after {
                    content: ''; position: absolute; inset: -16% -30%;
                    border-radius: 50%; border: 3px solid rgba(148,163,184,.18);
                    transform: rotate(-18deg);
                }

                /* L'ASTÉROÏDE ENNEMI : une roche irrégulière, cratérisée, avec
                   sa traînée de plasma derrière elle. Elle tourne en avançant. */
                .cn-boulet {
                    position: absolute; border-radius: 50%; display: flex;
                    align-items: center; justify-content: center; font-weight: 900;
                    width: 56px; height: 56px; font-size: 18px; border: 0; padding: 0;
                    color: #fff7ed; cursor: pointer; font-family: inherit;
                    border-radius: 52% 48% 44% 56% / 50% 54% 46% 50%;
                    /* Les deux premières couches sont les CRATÈRES : elles
                       défilent quand la roche avance, ce qui la fait tourner
                       sans emporter le nombre avec elle. La troisième, le
                       corps, ne bouge pas. */
                    background:
                        radial-gradient(circle 7px at 14px 16px, rgba(0,0,0,.5) 0 7px, transparent 8px),
                        radial-gradient(circle 5px at 34px 38px, rgba(0,0,0,.4) 0 5px, transparent 6px),
                        radial-gradient(circle at 32% 26%, #a8a29e 0%, #57534e 42%, #292524 78%, #1c1917 100%);
                    background-size: 30px 30px, 44px 44px, 100% 100%;
                    background-repeat: repeat, repeat, no-repeat;
                    box-shadow: 0 0 14px rgba(251,146,60,.35), inset -7px -7px 14px rgba(0,0,0,.65),
                                inset 5px 5px 12px rgba(255,255,255,.14);
                    text-shadow: 0 1px 3px rgba(0,0,0,.95);
                    -webkit-tap-highlight-color: transparent;
                    transition: filter .12s ease;
                }
                .cn-boulet:hover { filter: brightness(1.4) drop-shadow(0 0 10px rgba(252,211,77,.95)); }
                /* LA TRAÎNÉE, derrière l'astéroïde — donc du côté d'où il
                   vient : à droite quand il arrive de droite, en bas quand il
                   tombe. Elle dit le sens de la marche d'un coup d'œil. */
                .cn-boulet::after {
                    content: ''; position: absolute; top: 50%; left: 100%;
                    width: 46px; height: 15px; transform: translateY(-50%);
                    border-radius: 50%;
                    background: linear-gradient(90deg, rgba(251,146,60,.85), rgba(249,115,22,.35) 45%, transparent);
                    animation: cn-trainee .45s ease-in-out infinite alternate;
                }
                .cn-wrap--colonne .cn-boulet::after {
                    top: 100%; left: 50%; width: 15px; height: 46px;
                    transform: translateX(-50%);
                    background: linear-gradient(180deg, rgba(251,146,60,.85), rgba(249,115,22,.35) 45%, transparent);
                }
                @keyframes cn-trainee { from { opacity: .45; } to { opacity: 1; } }

                /* NOTRE TIR : une charge de plasma, pas une bille de fonte. */
                .cn-boulet--mien {
                    border-radius: 50%;
                    background: radial-gradient(circle at 40% 34%, #ffffff 0%, #a5f3fc 32%, #22d3ee 60%, #0891b2 100%);
                    color: #083344; pointer-events: none; text-shadow: none;
                    box-shadow: 0 0 24px rgba(34,211,238,.95), 0 0 46px rgba(34,211,238,.5),
                                inset -4px -4px 10px rgba(8,51,68,.5);
                }
                .cn-boulet--mien::after {
                    content: ''; position: absolute; inset: -6px; border-radius: 50%;
                    background: none; border: 2px solid rgba(165,243,252,.55);
                    animation: cn-halo .6s ease-out infinite;
                    top: auto; left: auto; width: auto; height: auto; transform: none;
                }
                @keyframes cn-halo { from { scale: .8; opacity: .9; } to { scale: 1.5; opacity: 0; } }

                .cn-boum {
                    position: absolute; border-radius: 50%; pointer-events: none; z-index: 5;
                    background: radial-gradient(circle, #ffffff 0%, #a5f3fc 26%, #22d3ee 48%, #7c3aed 66%, transparent 74%);
                    animation: cn-boum .5s ease-out forwards;
                }
                @keyframes cn-boum { from { scale: .3; opacity: 1; } to { scale: 2.6; opacity: 0; } }

                /* LE CANON : dessiné, pas un émoji — et il recule au tir. */
                /* Le canon suivait une taille fixe de 74 px : dans une arène
                   deux fois plus grande, il devenait une vignette. */
                .cn-canon { position: absolute; width: clamp(74px, 11cqw, 118px);
                    aspect-ratio: 74 / 60; pointer-events: none; }
                .cn-canon svg { width: 100%; height: 100%; overflow: visible; }
                .cn-canon--tire { animation: cn-recul .28s ease-out; }
                @keyframes cn-recul {
                    30% { translate: -9px 0; }
                }
                .cn-wrap--colonne .cn-canon--tire { animation: cn-recul-bas .28s ease-out; }
                @keyframes cn-recul-bas { 30% { translate: 0 9px; } }

                .cn-pupitre { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: center; }
                /* LA CHAMBRE DE CHARGE : c'est le boulet qu'on prépare, alors
                   elle EST un boulet — même rondeur, même lueur. */
                .cn-charge {
                    min-width: 74px; height: 58px; border-radius: 999px;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: 1.4rem; padding: 0 16px; color: #431407;
                    background: radial-gradient(circle at 34% 30%, #fef3c7 0%, #fbbf24 40%, #d97706 100%);
                    box-shadow: 0 0 16px rgba(251,191,36,.7), inset -5px -5px 10px rgba(120,53,15,.45);
                }
                .cn-charge--vide {
                    color: var(--text-muted); font-size: .8rem; font-weight: 700;
                    background: var(--bg-panel); border: 2.5px dashed var(--border); box-shadow: none;
                }
                .cn-pave { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; max-width: 300px; }
                .cn-chiffre {
                    width: 44px; height: 44px; border: 1.5px solid var(--border); border-radius: 12px;
                    background: var(--bg-panel); color: var(--text-main); font: inherit;
                    font-weight: 900; font-size: 1.05rem; cursor: pointer;
                    transition: transform .1s ease, background .1s ease;
                }
                .cn-chiffre:active { transform: scale(.9); background: var(--bg-hover); }
                .cn-note { min-height: 2.4em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 640px; }
                .cn-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .cn-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="cn-wrap" data-wrap>
                <div class="cn-tete">
                    <span>Complète à <span class="cn-cible" data-cible></span></span>
                    <span data-vies></span>
                    <span>Niveau <b data-niveau>1</b></span>
                    <span class="cn-palier" data-palier></span>
                </div>
                <div class="cn-terrain" data-terrain><div class="cn-planete"></div></div>
                <div class="cn-pupitre">
                    <div class="cn-charge cn-charge--vide" data-charge>prépare…</div>
                    <div class="cn-pave" data-pave></div>
                </div>
                <div class="cn-note" data-note></div>
            </div>`;
        this.wrapEl = this.container.querySelector('[data-wrap]');
        this.terrainEl = this.container.querySelector('[data-terrain]');
        this.chargeEl = this.container.querySelector('[data-charge]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-cible]').textContent = String(this.cible);
        const pave = this.container.querySelector('[data-pave]');
        pave.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(v =>
            `<button type="button" class="cn-chiffre" data-v="${v}">${v}</button>`).join('')
            + '<button type="button" class="cn-chiffre" data-v="efface" aria-label="Effacer">⌫</button>';
        pave.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => this.taperPave(b.dataset.v); });
        // Le clavier aussi, pour l'ordinateur.
        this.surTouche = (e) => {
            if (/^[0-9]$/.test(e.key)) this.taperPave(e.key);
            if (e.key === 'Backspace') this.taperPave('efface');
        };
        document.addEventListener('keydown', this.surTouche);
    }

    startGameLoop() {
        this.vies = this.viesDepart;
        this.niveau = 1;
        this.detruits = 0;
        this.poser();
        this.boucle();
    }

    poser() {
        this.boulets = [];       // les ennemis : {el, valeur, voie, avancee}
        this.tirs = [];          // nos boulets : {el, valeur, cibleBoulet, x, y}
        this.charge = '';
        this.majCharge();
        this.terrainEl.querySelectorAll('.cn-boulet, .cn-canon').forEach(el => el.remove());
        // Le canon : à gauche en lignes, en bas en colonnes.
        this.colonne = (this.container.clientWidth || 800) < 560;
        this.wrapEl.classList.toggle('cn-wrap--colonne', this.colonne);
        this.canonEl = document.createElement('div');
        this.canonEl.className = 'cn-canon';
        // LE CANON ORBITAL : un socle ancré, une tourelle, un fût à bobines
        // d'énergie dont la gueule luit. Il se reconnaît de loin et pointe
        // toujours vers l'arrivée des astéroïdes.
        this.canonEl.innerHTML = `
            <svg viewBox="0 0 74 60" aria-hidden="true"
                 style="transform: rotate(${this.colonne ? -90 : 0}deg)">
                <defs>
                    <linearGradient id="cn-fut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#e2e8f0"/><stop offset=".42" stop-color="#64748b"/>
                        <stop offset="1" stop-color="#0f172a"/>
                    </linearGradient>
                    <radialGradient id="cn-gueule">
                        <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#67e8f9"/>
                        <stop offset="1" stop-color="#0e7490"/>
                    </radialGradient>
                </defs>
                <path d="M4 52h44l-6-10H10z" fill="#1e293b" stroke="#475569" stroke-width="1.6"/>
                <rect x="14" y="34" width="30" height="12" rx="5" fill="#334155" stroke="#64748b" stroke-width="1.4"/>
                <circle cx="29" cy="28" r="13" fill="url(#cn-fut)" stroke="#0f172a" stroke-width="1.6"/>
                <circle cx="29" cy="28" r="5" fill="#0ea5e9" opacity=".85"/>
                <rect x="30" y="20" width="34" height="16" rx="7" fill="url(#cn-fut)" stroke="#0f172a" stroke-width="1.4"/>
                <rect x="38" y="18" width="4" height="20" rx="2" fill="#22d3ee" opacity=".9"/>
                <rect x="48" y="18" width="4" height="20" rx="2" fill="#22d3ee" opacity=".9"/>
                <rect x="60" y="17" width="9" height="22" rx="4" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
                <ellipse cx="68" cy="28" rx="3.6" ry="9" fill="url(#cn-gueule)"/>
            </svg>`;
        this.terrainEl.appendChild(this.canonEl);
        this.placerCanon();
        this.prochainBoulet = 0;
        this.majTete();
        this.note(`Prépare ta charge au pavé, puis touche l'astéroïde visé. `
            + `La somme doit faire ${this.cible}.`);
        return true;
    }

    placerCanon() {
        const t = this.geometrie();
        if (this.colonne) {
            this.canonEl.style.left = `${t.w / 2 - 37}px`;
            this.canonEl.style.top = `${t.h - 66}px`;
        } else {
            this.canonEl.style.left = '4px';
            this.canonEl.style.top = `${t.h / 2 - 30}px`;
        }
    }

    geometrie() {
        return { w: this.terrainEl.clientWidth || 640, h: this.terrainEl.clientHeight || 300 };
    }

    /** L'axe d'une voie, en pixels — perpendiculaire au sens de marche. */
    axeVoie(voie) {
        const t = this.geometrie();
        const large = this.colonne ? t.w : t.h;
        return Math.round(large * (voie + 1) / (this.voies + 1));
    }

    majTete() {
        this.container.querySelector('[data-vies]').textContent =
            '❤️'.repeat(Math.max(0, this.vies)) + '🖤'.repeat(Math.max(0, this.viesDepart - this.vies));
        this.container.querySelector('[data-niveau]').textContent = String(this.niveau);
        const pal = this.container.querySelector('[data-palier]');
        if (pal) pal.textContent = direPalier(this.cible, this.niveau);
    }

    majCharge() {
        this.chargeEl.textContent = this.charge === '' ? 'prépare…' : this.charge;
        this.chargeEl.classList.toggle('cn-charge--vide', this.charge === '');
    }

    taperPave(v) {
        if (this.isDemo || !this.isRunning) return;
        if (v === 'efface') this.charge = this.charge.slice(0, -1);
        else if (this.charge.length < String(this.cible).length) this.charge += v;
        this.majCharge();
    }

    // --- La cadence ------------------------------------------------------------

    boucle() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        let dernier = 0;
        const pas = (t) => {
            this.rafId = requestAnimationFrame(pas);
            if (!this.isRunning || this.isDemo === 'fige') return;
            if (t - dernier < 28) return;
            dernier = t;
            this.avancer();
        };
        this.rafId = requestAnimationFrame(pas);
    }

    avancer() {
        const t = this.geometrie();
        const longueur = this.colonne ? t.h : t.w;

        // DE PLUS EN PLUS D'ASTÉROÏDES À LA FOIS. Au premier niveau on en voit
        // un : le temps de lire, de préparer son complément et de viser. Puis
        // le ciel se remplit — deux, trois, jusqu'à deux par voie — et il faut
        // choisir lequel traiter d'abord. C'est là que le complément doit être
        // devenu automatique, pas seulement calculable.
        this.prochainBoulet -= 28;
        const simultanes = Math.min(this.voies * 2 + 1, this.voies + Math.floor((this.niveau + 1) / 2));
        if (this.boulets.length < Math.max(1, simultanes) && this.prochainBoulet <= 0) {
            // Si toutes les voies sont encombrées à l'entrée, on repasse dans
            // un instant plutôt que d'attendre un cycle entier.
            this.prochainBoulet = this.creerEnnemi()
                ? 1500 - Math.min(1050, this.niveau * 150) : 280;
        }

        // Les ennemis avancent vers le canon.
        // « Trop lent » : à 0,028, un astéroïde mettait près d'une minute à
        // traverser. Le complément se calcule en quelques secondes ; ce qui
        // reste à faire ensuite, c'est viser. À 0,11, la traversée dure une
        // douzaine de secondes au premier niveau et sept au huitième — assez
        // pour penser, trop peu pour s'ennuyer.
        const vitesse = (0.11 + this.niveau * 0.014) * longueur / 60;
        for (const b of [...this.boulets]) {
            b.avancee += vitesse;
            this.placerEnnemi(b);
            if (b.avancee >= longueur - 58) {
                b.el.remove();
                this.boulets = this.boulets.filter(x => x !== b);
                this.vies--;
                this.majTete();
                this.note(`💥 Le ${b.valeur} a atteint le canon ! Son complément était ${this.cible - b.valeur}.`, 'ko');
                this.onWrongAnswer(null, {
                    concept: COMPETENCE,
                    questionText: `${b.valeur} + ? = ${this.cible}`,
                    input: '(pas tiré à temps)',
                    expected: String(this.cible - b.valeur),
                    customMessage: `Il fallait charger ${this.cible - b.valeur} et tirer sur le ${b.valeur}.`,
                    silencieux: true
                });
                if (this.vies <= 0) return this.perdu();
            }
        }

        // Nos tirs filent vers leur cible.
        for (const tir of [...this.tirs]) {
            const but = tir.cibleBoulet;
            if (!this.boulets.includes(but)) { tir.el.remove(); this.tirs = this.tirs.filter(x => x !== tir); continue; }
            const bx = parseFloat(but.el.style.left) + 26, by = parseFloat(but.el.style.top) + 26;
            const dx = bx - tir.x, dy = by - tir.y;
            const d = Math.hypot(dx, dy);
            const pasTir = longueur / 38;
            if (d < 30) {
                this.impact(tir, but);
                continue;
            }
            tir.x += dx / d * pasTir;
            tir.y += dy / d * pasTir;
            tir.el.style.left = `${tir.x - 26}px`;
            tir.el.style.top = `${tir.y - 26}px`;
        }
    }

    creerEnnemi() {
        const valeur = tirerValeur(this.cible, this.niveau, this.rng);
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'cn-boulet';
        el.textContent = String(valeur);
        // Il ENTRE par le bord : posé à l'arrêt à moitié dedans, il avait
        // l'air coupé. `overflow: hidden` le cache jusqu'à son entrée.
        //
        // ON ÉVITE LA VOIE OÙ UN ASTÉROÏDE VIENT D'ENTRER : maintenant qu'il y
        // en a plusieurs à la fois, deux lancés coup sur coup dans la même
        // voie se recouvriraient, et l'élève lirait un nombre pour l'autre.
        const occupees = new Set(this.boulets.filter(x => x.avancee < 84).map(x => x.voie));
        const libres = [...Array(this.voies).keys()].filter(v => !occupees.has(v));
        // Aucune voie dégagée : on ATTEND. Lancer quand même empilerait deux
        // roches l'une sur l'autre, et un nombre en cacherait un autre.
        if (!libres.length) { el.remove(); return false; }
        const b = { el, valeur, voie: this.rng.pick(libres), avancee: -60 };
        el.onclick = () => this.tirer(b);
        this.terrainEl.appendChild(el);
        this.placerEnnemi(b);
        this.boulets.push(b);
        return true;
    }

    placerEnnemi(b) {
        const t = this.geometrie();
        const axe = this.axeVoie(b.voie);
        // La rotation dit le roulement : sans elle, un boulet « glisse ».
        // LE NOMBRE NE TOURNE PAS AVEC LA ROCHE. Faire pivoter le bouton
        // entier retournait son chiffre : « 60 » se lisait « 09 », et l'élève
        // calculait le complément d'un nombre qui n'existait pas. C'est le
        // FOND qui tourne — la roche, ses cratères — pendant que l'étiquette
        // reste droite.
        b.el.style.backgroundPosition = `${b.avancee * 0.9}px ${b.avancee * 0.5}px,`
            + `${-b.avancee * 0.7}px ${b.avancee * 0.35}px, 0 0`;
        if (this.colonne) {
            b.el.style.left = `${axe - 28}px`;
            b.el.style.top = `${b.avancee - 28}px`;
        } else {
            b.el.style.left = `${t.w - b.avancee - 28}px`;
            b.el.style.top = `${axe - 28}px`;
        }
    }

    // --- Tirer -------------------------------------------------------------------

    tirer(cibleBoulet) {
        if (this.isDemo || !this.isRunning) return;
        if (this.charge === '') {
            this.note('Prépare d\'abord ton boulet au pavé : c\'est lui qui doit compléter.', 'ko');
            return;
        }
        const valeur = Number(this.charge);
        this.charge = '';
        this.majCharge();
        const el = document.createElement('div');
        el.className = 'cn-boulet cn-boulet--mien';
        el.textContent = String(valeur);
        const t = this.geometrie();
        const x = this.colonne ? t.w / 2 : 62, y = this.colonne ? t.h - 62 : t.h / 2;
        el.style.left = `${x - 26}px`;
        el.style.top = `${y - 26}px`;
        this.terrainEl.appendChild(el);
        this.tirs.push({ el, valeur, cibleBoulet, x, y });
        this.reculer();
    }

    /** Le canon recule au tir : c'est le retour de manivelle qui fait le poids. */
    reculer() {
        if (!this.canonEl) return;
        this.canonEl.classList.remove('cn-canon--tire');
        void this.canonEl.offsetWidth;          // relance l'animation
        this.canonEl.classList.add('cn-canon--tire');
    }

    impact(tir, ennemi) {
        tir.el.remove();
        this.tirs = this.tirs.filter(x => x !== tir);
        const somme = tir.valeur + ennemi.valeur;
        if (somme === this.cible) {
            // L'EXPLOSION : le complément était le bon.
            const boum = document.createElement('div');
            boum.className = 'cn-boum';
            boum.style.left = ennemi.el.style.left;
            boum.style.top = ennemi.el.style.top;
            boum.style.width = '52px';
            boum.style.height = '52px';
            this.terrainEl.appendChild(boum);
            setTimeout(() => boum.remove(), 500);
            ennemi.el.remove();
            this.boulets = this.boulets.filter(x => x !== ennemi);
            this.detruits++;
            this.note(`💥 ${ennemi.valeur} + ${tir.valeur} = ${this.cible} !`, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `${ennemi.valeur} + ? = ${this.cible}`,
                expected: String(tir.valeur), given: String(tir.valeur),
                points: this.cible === 10 ? 4 : (this.cible === 100 ? 6 : 8)
            });
            // Cinq boulets détruits : le niveau monte. Et quand le PALIER
            // change — les nombres deviennent quelconques — on le dit, avec la
            // technique qui va avec : c'est là que l'élève a besoin d'un mot.
            if (this.detruits % 5 === 0) {
                const avant = direPalier(this.cible, this.niveau);
                this.niveau++;
                this.majTete();
                const apres = direPalier(this.cible, this.niveau);
                this.note(apres !== avant
                    ? `⭐ Niveau ${this.niveau} — maintenant, ${apres}.`
                    : `Niveau ${this.niveau} : les boulets accélèrent.`, 'ok');
            }
        } else {
            // L'astéroïde CONTINUE SA ROUTE — c'est la punition du jeu,
            // et l'erreur est dite en entier.
            this.note(`❌ ${ennemi.valeur} + ${tir.valeur} = ${somme}, pas ${this.cible}. `
                + `L'ami de ${ennemi.valeur}, c'est ${this.cible - ennemi.valeur}.`, 'ko');
            this.onWrongAnswer(ennemi.el, {
                concept: COMPETENCE,
                questionText: `${ennemi.valeur} + ? = ${this.cible}`,
                input: String(tir.valeur),
                expected: String(this.cible - ennemi.valeur),
                customMessage: `${ennemi.valeur} + ${tir.valeur} = ${somme}. Pour aller de ${ennemi.valeur} à ${this.cible}, il faut ${this.cible - ennemi.valeur}.`
            });
        }
    }

    perdu() {
        this.note(`Partie finie : ${this.detruits} boulet${this.detruits > 1 ? 's' : ''} détruit${this.detruits > 1 ? 's' : ''}. On repart !`, 'ko');
        this.vies = this.viesDepart;
        this.niveau = 1;
        this.detruits = 0;
        setTimeout(() => { if (this.isRunning) { this.poser(); this.majTete(); } }, 1500);
    }

    showNext() { this.vies = this.viesDepart; this.niveau = 1; this.detruits = 0; return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'cn-note' + (ton ? ` cn-note--${ton}` : '');
    }

    // --- La démonstration ----------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.boulets) this.poser();
        if (!await cur.pause(700) || !this.isRunning) return fin();
        cur.say(`L'ordre fait tout : on CALCULE d'abord, on tire ensuite. Un boulet approche, `
            + `je cherche son complément à ${this.cible} AVANT de le toucher.`, this.chargeEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Attendre un ennemi, préparer son complément, tirer.
        for (let k = 0; k < 2; k++) {
            let garde = 0;
            while (!this.boulets.length && garde++ < 40) { await cur.pause(120); if (!this.isRunning) return fin(); }
            const ennemi = this.boulets[0];
            if (!ennemi) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const manque = this.cible - ennemi.valeur;
            cur.say(`Le ${ennemi.valeur} arrive : pour aller à ${this.cible}, il manque ${manque}. Je le charge.`, this.chargeEl);
            this.charge = String(manque);
            this.majCharge();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
            if (ennemi.el.isConnected && !await cur.tap(ennemi.el)) return fin();
            // Le tir, à la main du robot.
            const valeur = Number(this.charge);
            this.charge = '';
            this.majCharge();
            const el = document.createElement('div');
            el.className = 'cn-boulet cn-boulet--mien';
            el.textContent = String(valeur);
            const t = this.geometrie();
            const x = this.colonne ? t.w / 2 : 62, y = this.colonne ? t.h - 62 : t.h / 2;
            el.style.left = `${x - 26}px`; el.style.top = `${y - 26}px`;
            this.terrainEl.appendChild(el);
            this.tirs.push({ el, valeur, cibleBoulet: ennemi, x, y });
            this.reculer();
            if (!await cur.pause(1500) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Toujours ce chemin : je lis le nombre, je calcule le complément, je charge, et '
            + 'SEULEMENT ensuite je tire. Le calcul d\'abord, le geste après.', this.chargeEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.surTouche) { document.removeEventListener('keydown', this.surTouche); this.surTouche = null; }
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineCanon(container, isDemo, params) {
    const jeu = new Canon(container, isDemo, params);
    jeu.start();
    return jeu;
}
