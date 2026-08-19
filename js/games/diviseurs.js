// LE CHASSEUR DE DIVISEURS — à l'écran.
//
// Rémy : « un jeu un peu futuriste pour travailler la décomposition et la
// divisibilité, où il y a des nombres qui arrivent et on peut tirer des
// diviseurs dessus. Exemple 30 : on peut tirer 6, du coup ça se transforme en
// 5, et on ne peut capturer que les nombres premiers. »
//
// C'est la décomposition en facteurs premiers, jouée à l'envers : on ne
// l'écrit pas, on la FAIT. 60 descend ; je tire 4, il devient 15 ; je tire 3,
// il devient 5 ; 5 est premier, je le capture — et j'ai écrit 60 = 4 × 3 × 5
// sans y penser. Le bilan de fin de partie relit ces chemins, cette fois
// écrits comme au tableau.
//
// POURQUOI LA FAUTE COÛTE QUELQUE CHOSE. Sans prix, la stratégie gagnante est
// de tirer 2, puis 3, puis 4, jusqu'à ce que ça passe — et le jeu n'enseigne
// plus la divisibilité, il enseigne la patience. Un tir qui ne divise pas
// coûte donc un bouclier, et le message dit LE RESTE : « 7 ne divise pas 30,
// il reste 2 ». C'est là qu'est la leçon.
//
// LES CIBLES SONT FABRIQUÉES, pas tirées au hasard : une cible d'un niveau
// « facteurs 2, 3 et 5 » ne peut contenir que ces facteurs-là. Un 91 y serait
// indestructible, et l'élève n'aurait aucun moyen de savoir pourquoi.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED, dureeDemo } from '../core/demoPointer.js';
import {
    creerPartie, ajouterCible, tirerSur, perdreCible, bilan, estPremier,
    diviseursStricts, facteursPremiers, NIVEAUX
} from '../core/diviseurs.js';

const COMPETENCE = 'num.arith.decomposition';

class Diviseurs extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'diviseurs');
        this.rng = makeRng(this.params.seed);
        this.niveau = NIVEAUX[this.params.niveau] ? this.params.niveau : 'facile';
        this.partie = creerPartie({
            niveau: this.niveau,
            boucliers: Number(this.params.boucliers) || 3
        });
        // La saisie du canon : le diviseur qu'on est en train de composer.
        this.saisie = '';
        this.vise = null;
        // Les positions à l'écran, gardées à part de l'état de jeu : le noyau
        // ne connaît ni les pixels ni le temps.
        this.vols = new Map();     // id -> { t0, duree }
        this.eclats = [];
    }

    render() {
        this.container.innerHTML = `
            <style>
                .dv-wrap {
                    position: absolute; inset: 0; display: flex; flex-direction: column;
                    background: radial-gradient(120% 90% at 50% 0%, #1e1b4b 0%, #020617 70%);
                    color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif;
                    container-type: size; overflow: hidden;
                    user-select: none; -webkit-user-select: none;
                }
                /* Les étoiles : trois couches fixes, pas d'animation — un fond
                   qui bouge derrière des nombres qu'on doit lire est un fond
                   qui gêne. */
                .dv-ciel {
                    position: absolute; inset: 0; pointer-events: none; opacity: .55;
                    background-image:
                        radial-gradient(1.5px 1.5px at 12% 22%, #fff, transparent),
                        radial-gradient(1px 1px at 68% 14%, #c7d2fe, transparent),
                        radial-gradient(1.5px 1.5px at 82% 61%, #fff, transparent),
                        radial-gradient(1px 1px at 32% 74%, #a5b4fc, transparent),
                        radial-gradient(1px 1px at 51% 41%, #fff, transparent),
                        radial-gradient(1.5px 1.5px at 22% 55%, #e0e7ff, transparent);
                }
                .dv-tete {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 8px; padding: 6px clamp(8px, 2cqw, 18px); flex: 0 0 auto; z-index: 3;
                    font-weight: 800; font-size: clamp(11px, 2.4cqh, 15px);
                }
                .dv-boucliers { color: #38bdf8; letter-spacing: 3px; }
                .dv-score { color: #fcd34d; }
                .dv-vague { color: #a5b4fc; }

                /* LE CIEL DE JEU : les cibles y descendent. */
                .dv-espace { position: relative; flex: 1 1 auto; min-height: 0; z-index: 2; }
                .dv-cible {
                    position: absolute; transform: translate(-50%, -50%);
                    display: flex; flex-direction: column; align-items: center; gap: 1px;
                    padding: clamp(5px, 1.4cqh, 11px) clamp(10px, 2cqw, 18px);
                    border-radius: 14px; border: 2px solid #38bdf8;
                    background: rgba(8, 47, 73, .9); color: #e0f2fe;
                    font-weight: 900; font-size: clamp(17px, 4.4cqh, 34px);
                    box-shadow: 0 0 18px rgba(56,189,248,.45); cursor: pointer;
                    white-space: nowrap; -webkit-tap-highlight-color: transparent;
                }
                /* UN NOMBRE PREMIER SE VOIT. C'est l'information dont dépend
                   tout le jeu : on ne capture que lui. */
                .dv-cible--premier {
                    border-color: #fbbf24; color: #fef3c7;
                    background: rgba(69, 26, 3, .92);
                    box-shadow: 0 0 22px rgba(251,191,36,.55);
                }
                .dv-cible--vise { outline: 3px solid #f8fafc; outline-offset: 3px; }
                .dv-depart { font-size: .38em; font-weight: 700; opacity: .75; letter-spacing: .04em; }
                .dv-cible--touche { animation: dv-touche .35s ease-out; }
                @keyframes dv-touche {
                    0% { transform: translate(-50%, -50%) scale(1.35); filter: brightness(2.2); }
                    100% { transform: translate(-50%, -50%) scale(1); }
                }
                .dv-eclat {
                    position: absolute; transform: translate(-50%, -50%);
                    font-weight: 900; pointer-events: none; white-space: nowrap;
                    animation: dv-monte 1.1s ease-out forwards;
                    font-size: clamp(13px, 2.8cqh, 20px);
                }
                @keyframes dv-monte {
                    0% { opacity: 1; }
                    100% { opacity: 0; transform: translate(-50%, -180%) scale(1.2); }
                }
                .dv-eclat--ok { color: #4ade80; }
                .dv-eclat--ko { color: #f87171; }
                .dv-eclat--capture { color: #fcd34d; }
                /* Le sol : la ligne qu'une cible ne doit pas franchir. */
                .dv-sol {
                    position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
                    background: linear-gradient(90deg, transparent, #ef4444, transparent);
                    box-shadow: 0 0 14px #ef4444;
                }

                /* LE CANON : la saisie du diviseur, et le pavé. */
                .dv-bas { flex: 0 0 auto; padding: 4px clamp(6px, 2cqw, 16px) 8px; z-index: 3; }
                .dv-canon {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    font-weight: 900; font-size: clamp(14px, 3cqh, 22px); min-height: 1.6em;
                }
                .dv-obus {
                    min-width: 2.6em; text-align: center; padding: 1px 12px; border-radius: 10px;
                    background: rgba(56,189,248,.16); border: 2px solid #38bdf8; color: #e0f2fe;
                    font-variant-numeric: tabular-nums;
                }
                .dv-obus--vide { opacity: .45; }
                .dv-sur { color: #94a3b8; font-size: .72em; font-weight: 700; }
                .dv-pave {
                    display: grid; grid-template-columns: repeat(6, 1fr);
                    gap: clamp(3px, .8cqh, 7px); max-width: 560px; margin: 6px auto 0;
                }
                .dv-touche {
                    border: 1px solid rgba(148,163,184,.4); border-radius: 9px;
                    background: rgba(30,41,59,.9); color: #e2e8f0;
                    font: inherit; font-weight: 900; cursor: pointer;
                    font-size: clamp(.85rem, 2.8cqh, 1.3rem);
                    height: clamp(30px, 6cqh, 48px);
                    display: flex; align-items: center; justify-content: center;
                    -webkit-tap-highlight-color: transparent;
                }
                .dv-touche--tir { background: #b91c1c; border-color: #ef4444; color: #fee2e2; }
                .dv-touche--eff { background: #78350f; border-color: #f59e0b; color: #fef3c7; }
                .dv-note {
                    text-align: center; min-height: 2.2em; font-size: clamp(11px, 2.4cqh, 14px);
                    color: #cbd5e1; padding: 0 8px; font-weight: 600;
                }
                .dv-note--ok { color: #4ade80; }
                .dv-note--ko { color: #fca5a5; }

                /* L'écran de fin : le bilan, écrit comme au tableau. */
                .dv-fin {
                    position: absolute; inset: 0; z-index: 6; display: flex;
                    flex-direction: column; align-items: center; justify-content: center; gap: 8px;
                    background: rgba(2,6,23,.94); padding: 12px; overflow-y: auto;
                }
                .dv-fin h4 { margin: 0; color: #fcd34d; font-size: clamp(1rem, 4cqh, 1.7rem); }
                .dv-bilan { font-size: clamp(11px, 2.4cqh, 15px); line-height: 1.5; max-width: 40ch; }
                .dv-bilan div { font-variant-numeric: tabular-nums; }
                .dv-rejouer {
                    border: 0; border-radius: 999px; padding: 8px 22px; font-weight: 900;
                    background: #22c55e; color: #04240f; cursor: pointer; font-size: 1rem;
                }
            </style>
            <div class="dv-wrap" data-wrap>
                <div class="dv-ciel"></div>
                <div class="dv-tete">
                    <span class="dv-boucliers" data-boucliers></span>
                    <span class="dv-vague" data-vague></span>
                    <span class="dv-score" data-score>0</span>
                </div>
                <div class="dv-espace" data-espace><div class="dv-sol"></div></div>
                <div class="dv-bas">
                    <div class="dv-canon">
                        <span class="dv-sur" data-sur></span>
                        <span class="dv-obus dv-obus--vide" data-obus>—</span>
                    </div>
                    <div class="dv-pave" data-pave></div>
                    <p class="dv-note" data-note></p>
                </div>
            </div>`;

        this.espaceEl = this.container.querySelector('[data-espace]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.obusEl = this.container.querySelector('[data-obus]');
        this.surEl = this.container.querySelector('[data-sur]');

        const pave = this.container.querySelector('[data-pave]');
        pave.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n =>
            `<button type="button" class="dv-touche" data-t="${n}">${n}</button>`).join('')
            + '<button type="button" class="dv-touche dv-touche--eff" data-t="eff">⌫</button>'
            + '<button type="button" class="dv-touche dv-touche--tir" data-t="feu">▶ FEU</button>';
        pave.querySelectorAll('[data-t]').forEach(b => {
            b.onclick = () => this.taper(b.dataset.t);
        });

        this.surTouche = (e) => {
            if (this.isDemo || this.partie.finie) return;
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.taper('feu'); return; }
            if (e.key === 'Backspace') { e.preventDefault(); this.taper('eff'); return; }
            if (/^[0-9]$/.test(e.key)) this.taper(e.key);
        };
        document.addEventListener('keydown', this.surTouche);
        this.majTete();
        this.note('Tire un DIVISEUR sur un nombre : il se divise. Un nombre premier se capture — '
            + 'tire son propre nombre dessus.');
    }

    startGameLoop() {
        this.t0 = performance.now();
        this.prochaine = 0;
        const boucle = () => {
            if (!this.isRunning) return;
            this.rafId = requestAnimationFrame(boucle);
            if (this.gelDemo) { this.decalerVols(); return; }
            this.avancer();
        };
        this.rafId = requestAnimationFrame(boucle);
    }

    /** Une pause du robot ne doit pas faire tomber les cibles d'un coup. */
    decalerVols() {
        const t = performance.now();
        if (this.dernierGel) {
            const dt = t - this.dernierGel;
            this.vols.forEach(v => { v.t0 += dt; });
        }
        this.dernierGel = t;
    }

    // --- Le temps qui passe ---------------------------------------------------

    avancer() {
        this.dernierGel = null;
        const t = performance.now();
        const p = this.partie;
        if (p.finie) return;

        // Une nouvelle cible de temps en temps ; le rythme s'accélère un peu.
        const cadence = Math.max(2600, 5200 - p.vague * 180);
        if (t - this.prochaine > cadence && p.cibles.length < 5) {
            this.prochaine = t;
            p.vague++;
            const c = ajouterCible(p, this.rng, p.vague);
            const chute = (NIVEAUX[this.niveau].chute) * Math.max(0.55, 1 - p.vague * 0.02);
            this.vols.set(c.id, { t0: t, duree: chute, x: 12 + this.rng.next() * 76 });
            if (!this.vise) this.vise = c.id;
            // Le compteur de vagues bouge à CHAQUE arrivée : il ne se mettait à
            // jour qu'au moment d'un tir, et affichait « Vague 0 » pendant les
            // vingt premières secondes.
            this.majTete();
            this.dessiner();
        }

        // Les cibles descendent ; celles qui touchent le sol coûtent un bouclier.
        let bouge = false;
        [...p.cibles].forEach(c => {
            const v = this.vols.get(c.id);
            if (!v) return;
            const k = (t - v.t0) / v.duree;
            if (k >= 1) {
                perdreCible(p, c.id);
                this.vols.delete(c.id);
                if (this.vise === c.id) this.vise = p.cibles[0] ? p.cibles[0].id : null;
                this.eclat(v.x, 92, `${c.valeur} passe !`, 'ko');
                this.note(`${c.valeur} est passé — il te restait ${c.valeur === c.depart
                    ? 'tout à faire' : 'à finir'}. Bouclier perdu.`, 'ko');
                bouge = true;
            }
        });
        if (bouge || p.finie) { this.majTete(); this.dessiner(); }
        if (p.finie) return this.finir();
        this.placer(t);
    }

    /** Les positions, chaque image : c'est la seule chose qui bouge vraiment. */
    placer(t) {
        this.espaceEl.querySelectorAll('[data-cible]').forEach(el => {
            const v = this.vols.get(Number(el.dataset.cible));
            if (!v) return;
            const k = Math.min(1, (t - v.t0) / v.duree);
            el.style.left = `${v.x}%`;
            el.style.top = `${(6 + k * 84).toFixed(2)}%`;
        });
    }

    // --- Tirer ------------------------------------------------------------------

    taper(touche) {
        if (this.isDemo || this.partie.finie) return;
        if (touche === 'eff') { this.saisie = this.saisie.slice(0, -1); this.majCanon(); return; }
        if (touche === 'feu') { this.feu(); return; }
        if (this.saisie.length >= 3) return;
        this.saisie += touche;
        this.majCanon();
    }

    feu() {
        const p = this.partie;
        if (!this.saisie) { this.note('Compose d\'abord un diviseur, puis FEU.'); return; }
        const cible = p.cibles.find(c => c.id === this.vise) || p.cibles[0];
        if (!cible) { this.note('Aucune cible en vue.'); return; }
        const d = Number(this.saisie);
        const avant = cible.valeur;
        const v = this.vols.get(cible.id) || { x: 50 };
        const r = tirerSur(p, cible.id, d);
        this.saisie = '';
        this.majCanon();

        if (!r.ok) {
            this.eclat(v.x, 60, `${d} ✗`, 'ko');
            this.note('❌ ' + r.message, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE, questionText: `Un diviseur de ${avant}`,
                input: String(d), expected: String(diviseursStricts(avant)[0] ?? avant),
                explanation: `${avant} = ${facteursPremiers(avant).join(' × ')}`,
                customMessage: r.message, silencieux: true
            });
            this.majTete(); this.dessiner();
            if (p.finie) this.finir();
            return;
        }

        if (r.capture) {
            this.eclat(v.x, 55, `+${r.points}`, 'capture');
            this.vols.delete(cible.id);
            if (this.vise === cible.id) this.vise = p.cibles[0] ? p.cibles[0].id : null;
            this.note(`✅ ${r.message} ${avant === cible.depart ? '' : `Chemin : ${cible.depart} → `
                + `${cible.chemin.join(' → ')}.`}`, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Décomposer ${cible.depart}`,
                expected: facteursPremiers(cible.depart).join(' × '),
                given: cible.chemin.join(' × '), points: r.points
            });
        } else {
            this.eclat(v.x, 58, `÷${d}`, 'ok');
            this.note('✅ ' + r.message, 'ok');
        }
        this.majTete();
        this.dessiner();
    }

    // --- L'écran -----------------------------------------------------------------

    eclat(x, y, texte, ton) {
        const el = document.createElement('div');
        el.className = `dv-eclat dv-eclat--${ton}`;
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        el.textContent = texte;
        this.espaceEl.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    }

    majTete() {
        const p = this.partie;
        this.container.querySelector('[data-boucliers]').textContent =
            '🛡'.repeat(Math.max(0, p.boucliers)) || '—';
        this.container.querySelector('[data-vague]').textContent = `Vague ${p.vague}`;
        this.container.querySelector('[data-score]').textContent = `${p.score} pts`;
    }

    majCanon() {
        this.obusEl.textContent = this.saisie || '—';
        this.obusEl.classList.toggle('dv-obus--vide', !this.saisie);
        const c = this.partie.cibles.find(x => x.id === this.vise);
        this.surEl.textContent = c ? `sur ${c.valeur} :` : '';
    }

    dessiner() {
        const p = this.partie;
        const vivantes = new Set(p.cibles.map(c => c.id));
        this.espaceEl.querySelectorAll('[data-cible]').forEach(el => {
            if (!vivantes.has(Number(el.dataset.cible))) el.remove();
        });
        p.cibles.forEach(c => {
            let el = this.espaceEl.querySelector(`[data-cible="${c.id}"]`);
            if (!el) {
                el = document.createElement('button');
                el.type = 'button';
                el.dataset.cible = String(c.id);
                el.onclick = () => { this.vise = c.id; this.dessiner(); this.majCanon(); };
                this.espaceEl.appendChild(el);
            }
            const premier = estPremier(c.valeur);
            el.className = 'dv-cible'
                + (premier ? ' dv-cible--premier' : '')
                + (this.vise === c.id ? ' dv-cible--vise' : '');
            el.innerHTML = `${c.valeur}`
                + (c.depart !== c.valeur ? `<span class="dv-depart">venu de ${c.depart}</span>` : '');
        });
        this.majCanon();
        this.placer(performance.now());
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'dv-note' + (ton ? ` dv-note--${ton}` : '');
    }

    /**
     * LE BILAN EST LA LEÇON. On a joué à décomposer sans le dire ; l'écran de
     * fin l'écrit comme au tableau — « 60 = 2 × 2 × 3 × 5 » — à côté du chemin
     * qu'on a réellement pris. Ce sont deux écritures de la même chose, et
     * c'est en les voyant côte à côte qu'on comprend ce qu'on vient de faire.
     */
    finir() {
        if (this.fini) return;
        this.fini = true;
        const lignes = bilan(this.partie);
        const wrap = this.container.querySelector('[data-wrap]');
        const fin = document.createElement('div');
        fin.className = 'dv-fin';
        fin.innerHTML = `
            <h4>${this.partie.score} points</h4>
            <div class="dv-bilan">${lignes.length
        ? lignes.slice(-8).map(l => `<div><b>${l.texte}</b>${l.fautes ? '' : ' ✦'}</div>`).join('')
        : '<div>Aucun nombre décomposé cette fois.</div>'}</div>
            <p class="dv-note">${lignes.length
        ? 'Voilà ce que tu as décomposé — c\'est exactement la décomposition en facteurs '
                + 'premiers. ✦ marque celles faites sans une seule faute.'
        : 'Tire un diviseur, pas un nombre au hasard : le message dit toujours ce qui reste.'}</p>
            <button type="button" class="dv-rejouer" data-neuf>Rejouer</button>`;
        wrap.appendChild(fin);
        fin.querySelector('[data-neuf]').onclick = () => this.rejouer();
    }

    rejouer() {
        this.partie = creerPartie({ niveau: this.niveau, boucliers: Number(this.params.boucliers) || 3 });
        this.vols.clear();
        this.saisie = '';
        this.vise = null;
        this.fini = false;
        this.container.querySelectorAll('.dv-fin').forEach(e => e.remove());
        this.espaceEl.querySelectorAll('[data-cible]').forEach(e => e.remove());
        this.prochaine = 0;
        this.majTete();
        this.dessiner();
        this.note('On repart.');
    }

    showNext() { this.rejouer(); return true; }

    // --- La démonstration ---------------------------------------------------------

    /**
     * Le robot décompose UN nombre en entier, à voix haute. C'est le seul
     * moyen de faire comprendre que « tirer 6 sur 30 » n'est pas un tir : c'est
     * une division, et qu'on recommence jusqu'à tomber sur un premier.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        // Une cible choisie, pas tirée : on veut celle qui montre le mieux.
        const p = this.partie;
        p.cibles = [{ id: 1, valeur: 60, depart: 60, chemin: [], fautes: 0 }];
        p.prochainId = 2;
        this.vise = 1;
        this.vols.set(1, { t0: performance.now() + 999999, duree: 1e9, x: 50 });
        this.dessiner();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        cur.say('60 descend. Je ne peux pas le capturer : on ne capture que les nombres PREMIERS, '
            + 'et 60 n\'en est pas un. Il faut d\'abord le casser.', this.espaceEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        const etapes = [
            { d: 4, mot: '60 est pair, et même divisible par 4 : je tire 4. Il reste 15.' },
            { d: 3, mot: '15 : la somme de ses chiffres fait 6, donc il est divisible par 3. '
                + 'Je tire 3, il reste 5.' },
            { d: 5, mot: '5 est premier — il s\'allume en jaune. Je tire 5 sur 5 : capturé.' }
        ];
        for (const e of etapes) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say(e.mot, this.espaceEl.querySelector('[data-cible="1"]') || this.espaceEl);
            if (!await gate.wait(dureeDemo(1400)) || !this.isRunning) return fin();
            tirerSur(p, 1, e.d);
            this.majTete();
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.press)) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et voilà ce qu\'on vient d\'écrire sans le dire : 60 = 4 × 3 × 5, '
            + 'c\'est-à-dire 2 × 2 × 3 × 5. C\'est la décomposition en facteurs premiers.',
        this.espaceEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }
}

export function engineDiviseurs(container, isDemo, params) {
    const jeu = new Diviseurs(container, isDemo, params);
    jeu.start();
    return jeu;
}
