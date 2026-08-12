// LE CANON DES COMPLÉMENTS — préparer le boulet qui fait le compte.
//
// Des boulets ennemis avancent vers le canon, chacun porte un nombre. On
// PRÉPARE son boulet au pavé — un 23 s'approche et la cible est 100 : on
// charge 77 — puis on TAPE le boulet visé, et le nôtre part à sa rencontre.
// À l'impact, si la somme fait la cible, explosion ; sinon notre boulet est
// perdu et l'ennemi CONTINUE SA ROUTE. Un boulet qui atteint le canon coûte
// une vie.
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
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                }
                .cn-tete { display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .92rem; }
                .cn-cible { font-weight: 900; color: var(--primary); font-size: 1.1rem; }
                .cn-palier { color: var(--text-muted); font-size: .82rem; font-style: italic; }

                /* LE CHAMP DE BATAILLE. Un ciel dégradé, un sol, et des
                   boulets qui roulent : le décor porte le jeu autant que la
                   règle — un rectangle blanc avec des ronds gris n'a jamais
                   donné envie de calculer. */
                .cn-terrain {
                    position: relative; width: min(94cqw, 700px); height: 320px;
                    border-radius: 14px; overflow: hidden;
                    border: 3px solid color-mix(in srgb, var(--text-main) 70%, transparent);
                    background:
                        radial-gradient(circle at 50% 120%, rgba(253,224,71,.35), transparent 55%),
                        linear-gradient(180deg, #1e3a5f 0%, #2d5580 42%, #4a7ba7 68%, #6b8f5a 68%, #4d6b3f 100%);
                    touch-action: manipulation; user-select: none;
                    box-shadow: inset 0 -18px 40px rgba(0,0,0,.28);
                }
                .cn-wrap--colonne .cn-terrain {
                    height: min(56cqh, 420px);
                    background:
                        radial-gradient(circle at -10% 50%, rgba(253,224,71,.35), transparent 55%),
                        linear-gradient(90deg, #1e3a5f 0%, #2d5580 42%, #4a7ba7 68%, #6b8f5a 68%, #4d6b3f 100%);
                }
                /* Les étoiles du fond : trois nuages fixes, discrets. */
                .cn-terrain::before {
                    content: ''; position: absolute; inset: 0; pointer-events: none;
                    background:
                        radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,.7), transparent),
                        radial-gradient(2px 2px at 62% 14%, rgba(255,255,255,.5), transparent),
                        radial-gradient(2px 2px at 84% 30%, rgba(255,255,255,.6), transparent),
                        radial-gradient(1.5px 1.5px at 38% 9%, rgba(255,255,255,.5), transparent);
                }

                /* LE BOULET ENNEMI : une bille de fonte, avec sa mèche qui
                   fume et son reflet. Il tourne en avançant. */
                .cn-boulet {
                    position: absolute; border-radius: 50%; display: flex;
                    align-items: center; justify-content: center; font-weight: 900;
                    width: 56px; height: 56px; font-size: 18px; border: 0; padding: 0;
                    color: #fff7ed; cursor: pointer; font-family: inherit;
                    background: radial-gradient(circle at 32% 28%, #64748b 0%, #334155 45%, #0f172a 100%);
                    box-shadow: 0 4px 10px rgba(0,0,0,.45), inset -6px -6px 12px rgba(0,0,0,.55),
                                inset 4px 4px 10px rgba(255,255,255,.18);
                    text-shadow: 0 1px 3px rgba(0,0,0,.9);
                    -webkit-tap-highlight-color: transparent;
                    transition: filter .12s ease;
                }
                .cn-boulet:hover { filter: brightness(1.35) drop-shadow(0 0 8px rgba(252,211,77,.9)); }
                /* La mèche allumée, en haut du boulet. */
                .cn-boulet::after {
                    content: ''; position: absolute; top: -7px; left: 50%; width: 7px; height: 7px;
                    border-radius: 50%; transform: translateX(-50%);
                    background: radial-gradient(circle, #fef08a 0%, #f97316 55%, transparent 75%);
                    animation: cn-meche .5s ease-in-out infinite alternate;
                }
                @keyframes cn-meche { from { opacity: .5; scale: .75; } to { opacity: 1; scale: 1.3; } }

                /* NOTRE BOULET : lumineux, avec une traînée. */
                .cn-boulet--mien {
                    background: radial-gradient(circle at 34% 30%, #fef3c7 0%, #fbbf24 40%, #d97706 100%);
                    color: #431407; pointer-events: none; text-shadow: none;
                    box-shadow: 0 0 18px rgba(251,191,36,.85), inset -5px -5px 10px rgba(120,53,15,.5);
                }
                .cn-boulet--mien::after { display: none; }

                .cn-boum {
                    position: absolute; border-radius: 50%; pointer-events: none; z-index: 5;
                    background: radial-gradient(circle, #fff7ed 0%, #fcd34d 30%, #f97316 55%, transparent 72%);
                    animation: cn-boum .5s ease-out forwards;
                }
                @keyframes cn-boum { from { scale: .3; opacity: 1; } to { scale: 2.6; opacity: 0; } }

                /* LE CANON : dessiné, pas un émoji — et il recule au tir. */
                .cn-canon { position: absolute; width: 74px; height: 60px; pointer-events: none; }
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
                <div class="cn-terrain" data-terrain></div>
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
        // Un fût, deux roues, un socle : le canon se reconnaît de loin, et sa
        // gueule pointe vers l'arrivée des boulets.
        this.canonEl.innerHTML = `
            <svg viewBox="0 0 74 60" aria-hidden="true"
                 style="transform: rotate(${this.colonne ? -90 : 0}deg)">
                <defs>
                    <linearGradient id="cn-fut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#94a3b8"/><stop offset=".45" stop-color="#475569"/>
                        <stop offset="1" stop-color="#1e293b"/>
                    </linearGradient>
                </defs>
                <rect x="6" y="40" width="46" height="9" rx="4" fill="#78350f"/>
                <circle cx="17" cy="49" r="9" fill="#92400e" stroke="#451a03" stroke-width="2.5"/>
                <circle cx="17" cy="49" r="2.6" fill="#451a03"/>
                <circle cx="40" cy="49" r="7" fill="#92400e" stroke="#451a03" stroke-width="2.5"/>
                <rect x="12" y="18" width="52" height="20" rx="9" fill="url(#cn-fut)"/>
                <rect x="58" y="15" width="10" height="26" rx="4" fill="#1e293b"/>
                <ellipse cx="66" cy="28" rx="3.4" ry="10" fill="#0b1220"/>
            </svg>`;
        this.terrainEl.appendChild(this.canonEl);
        this.placerCanon();
        this.prochainBoulet = 0;
        this.majTete();
        this.note(`Prépare ton boulet au pavé, puis touche le boulet ennemi visé. `
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

        // De nouveaux ennemis, tant que le niveau n'a pas son compte.
        this.prochainBoulet -= 28;
        const simultanes = Math.min(this.voies + 1, 1 + Math.floor(this.niveau / 2));
        if (this.boulets.length < simultanes && this.prochainBoulet <= 0) {
            this.prochainBoulet = 1400 - Math.min(800, this.niveau * 120);
            this.creerEnnemi();
        }

        // Les ennemis avancent vers le canon.
        const vitesse = (0.028 + this.niveau * 0.004) * longueur / 60;
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
        const b = { el, valeur, voie: this.rng.int(0, this.voies - 1), avancee: -60 };
        el.onclick = () => this.tirer(b);
        this.terrainEl.appendChild(el);
        this.placerEnnemi(b);
        this.boulets.push(b);
    }

    placerEnnemi(b) {
        const t = this.geometrie();
        const axe = this.axeVoie(b.voie);
        // La rotation dit le roulement : sans elle, un boulet « glisse ».
        b.el.style.rotate = `${-b.avancee * 2.6}deg`;
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
            // Le boulet ennemi CONTINUE SA ROUTE — c'est la punition du jeu,
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
