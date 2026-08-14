// LES ARPENTEURS — à deux, sur la même tablette.
//
// Un nombre tombe, on clôture un rectangle de cette aire, chacun son tour ;
// celui qui ne peut plus poser a perdu. On glisse le doigt en diagonale d'un
// coin à l'autre, et le tracé annonce en direct ce qu'on est en train de
// dessiner : « 5 × 7 = 35 ». C'est ce compteur qui fait travailler — on voit
// l'aire changer sous le doigt bien avant de valider.
//
// RIEN N'EST ENREGISTRÉ dans le profil, comme pour le duel : deux personnes
// jouent sur un seul compte, et attribuer les coups de l'un aux statistiques
// de l'autre ne voudrait rien dire.
//
// Les règles vivent dans core/arpenteurs.js, testées sans navigateur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    creerPartie, idx, libre, placementPossible, tirerCible, poser,
    restant, score, conseil, formes, utiliserJoker
} from '../core/arpenteurs.js';

const TAILLES = {
    petit: { cols: 18, rows: 12, label: '18 × 12 — partie rapide' },
    moyen: { cols: 24, rows: 16, label: '24 × 16' },
    grand: { cols: 30, rows: 20, label: '30 × 20 — partie longue' }
};

class Arpenteurs extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'arpenteurs');
        const t = TAILLES[this.params.terrain] || TAILLES.moyen;
        this.rng = makeRng(this.params.seed);
        // Sur un téléphone tenu debout, un terrain 24 × 16 se réduit à des
        // carreaux minuscules parce que c'est la LARGEUR qui manque. On tourne
        // donc le terrain dans le sens de l'écran : mêmes règles, mêmes aires,
        // mais des cases deux fois plus grandes.
        const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth * 1.15;
        const cols = portrait ? t.rows : t.cols;
        const rows = portrait ? t.cols : t.rows;
        this.solo = String(this.params.joueurs) === '1';
        this.etat = creerPartie({
            cols, rows,
            table: parseInt(this.params.table) || 10,
            minCote: this.params.bandes ? 1 : 2,
            joueurs: this.solo ? 1 : 2
        });
        this.noms = [null, this.params.nom1 || 'Joueur 1', this.params.nom2 || 'Joueur 2'];
    }

    render() {
        const e = this.etat;
        this.container.innerHTML = `
            <style>
                .ar-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: 8px; height: 100%; width: 100%; color: var(--text-main);
                    user-select: none; -webkit-user-select: none;
                }
                .ar-haut {
                    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
                    justify-content: center; width: 100%;
                }
                .ar-joueur {
                    display: flex; align-items: center; gap: 7px;
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 2px solid transparent; font-size: clamp(12px, 2.6cqw, 15px);
                    opacity: .5; transition: opacity .15s, border-color .15s;
                }
                .ar-joueur--actif { opacity: 1; border-color: currentColor; }
                /* « display » est posé explicitement plus haut : sans cette
                   règle, l'attribut « hidden » ne cache rien et le second
                   joueur restait affiché en solo. */
                .ar-joueur[hidden] { display: none; }
                .ar-joueur--1 { color: #1d4ed8; background: color-mix(in srgb, #60a5fa 22%, transparent); }
                .ar-joueur--2 { color: #b45309; background: color-mix(in srgb, #fbbf24 26%, transparent); }
                .ar-cible {
                    font-weight: 900; font-size: clamp(22px, 5.6cqw, 40px);
                    line-height: 1; padding: 0 6px;
                }

                /* Le pas du quadrillage est calculé en JavaScript, en pixels
                   ENTIERS (voir ajusterTaille). Un pas fractionnaire — ce que
                   donnait le clamp() d'avant — fait dériver le fond répété
                   d'un côté et les parcelles positionnées de l'autre : au
                   bout de vingt colonnes, le quadrillage « ne tombe plus
                   juste ». Et la bordure est en box-shadow, pas en border :
                   avec box-sizing border-box (réglé globalement), une bordure
                   de 2px rognerait 4px sur la largeur utile et décalerait
                   encore le fond d'un demi-carreau. */
                .ar-terrain {
                    --pas: 18px;
                    position: relative; flex: none; touch-action: none;
                    width: calc(var(--pas) * var(--cols));
                    height: calc(var(--pas) * var(--rows));
                    background: var(--bg-plateau);
                    background-image:
                        linear-gradient(to right, color-mix(in srgb, var(--text-muted) 26%, transparent) 1px, transparent 1px),
                        linear-gradient(to bottom, color-mix(in srgb, var(--text-muted) 26%, transparent) 1px, transparent 1px);
                    background-size: var(--pas) var(--pas);
                    background-position: 0 0;
                    box-shadow: 0 0 0 2px color-mix(in srgb, var(--text-main) 35%, transparent), var(--shadow-md);
                    border-radius: 4px; overflow: hidden;
                }
                .ar-parcelle {
                    position: absolute; box-sizing: border-box;
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; line-height: 1.05; gap: 1px;
                    font-weight: 800; color: #fff; border-radius: 3px;
                    border: 1px solid rgba(255,255,255,.55);
                    animation: ar-pose .3s ease-out; overflow: hidden;
                }
                /* La parcelle porte SA multiplication, et rien d'autre :
                   l'aire écrite dessous rendait le calcul inutile. */
                .ar-parcelle i { font-style: normal; font-weight: 900; }
                @keyframes ar-pose { from { transform: scale(.86); opacity: .4; } }
                .ar-parcelle--1 { background: linear-gradient(150deg, #60a5fa, #1d4ed8); }
                .ar-parcelle--2 { background: linear-gradient(150deg, #fbbf24, #b45309); }

                /* Le tracé en cours : on voit l'aire AVANT de lâcher. C'est là
                   que le calcul se fait — après, il est trop tard pour penser. */
                .ar-trace {
                    position: absolute; box-sizing: border-box; pointer-events: none;
                    display: flex; align-items: center; justify-content: center;
                    border: 3px dashed var(--ar-main, var(--primary)); border-radius: 4px;
                    background: color-mix(in srgb, var(--ar-main, var(--primary)) 22%, transparent);
                    font-weight: 900; color: var(--ar-main, var(--primary));
                    font-size: clamp(11px, calc(var(--pas) * 1.1), 22px);
                    text-shadow: 0 1px 0 var(--bg-plateau), 0 -1px 0 var(--bg-plateau),
                                 1px 0 0 var(--bg-plateau), -1px 0 0 var(--bg-plateau);
                }
                .ar-trace--ok { border-color: var(--success); color: var(--success);
                    background: color-mix(in srgb, var(--success) 26%, transparent); }
                .ar-trace--ko { border-color: var(--danger); color: var(--danger);
                    background: color-mix(in srgb, var(--danger) 20%, transparent); }

                .ar-note {
                    min-height: 2.7em; text-align: center; width: 100%; max-width: 640px;
                    font-size: clamp(11px, 2.7cqw, 15px); line-height: 1.35; color: var(--text-muted);
                }
                .ar-note b { color: var(--text-main); }
                .ar-fin { display: inline-block; padding: 5px 13px; border-radius: 999px; font-weight: 700; }
                .ar-fin--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .ar-fin--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
                .ar-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                .ar-btn:hover { background: var(--bg-hover); }
            </style>
            <div class="ar-wrap">
                <div class="ar-haut">
                    <span class="ar-joueur ar-joueur--1" data-j1></span>
                    <span class="ar-cible" data-cible></span>
                    <span class="ar-joueur ar-joueur--2" data-j2${this.solo ? ' hidden' : ''}></span>
                </div>
                <div class="ar-terrain" data-terrain style="--cols:${e.cols};--rows:${e.rows}"></div>
                <p class="ar-note" data-note></p>
                <div class="ar-haut">
                    <button type="button" class="ar-btn" data-formes>💡 Quelles formes ?</button>
                    <button type="button" class="ar-btn" data-joker></button>
                    <button type="button" class="ar-btn" data-neuf>↺ Nouvelle partie</button>
                </div>
            </div>`;

        this.terrain = this.container.querySelector('[data-terrain]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.cibleEl = this.container.querySelector('[data-cible]');
        this.j1El = this.container.querySelector('[data-j1]');
        this.j2El = this.container.querySelector('[data-j2]');
        this.container.querySelector('[data-formes]').addEventListener('click', () => this.note(conseil(this.etat)));
        this.jokerEl = this.container.querySelector('[data-joker]');
        this.jokerEl.addEventListener('click', () => this.jouerJoker());
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.rejouer());

        this.brancherGestes();
        this.ajusterTaille();
        if (typeof ResizeObserver === 'function') {
            this.observateur = new ResizeObserver(() => this.ajusterTaille());
            this.observateur.observe(this.container);
        }
        this.tourSuivant();
    }

    startGameLoop() { /* Au tour par tour : rien à animer en continu. */ }

    // --- La taille du terrain -----------------------------------------------
    //
    // On mesure la place RÉELLEMENT libre (le bandeau et la note ont la taille
    // qu'a leur texte, pas celle qu'on aurait devinée) et on en déduit un pas
    // en pixels entiers. Entier : c'est la condition pour que le fond répété
    // et les parcelles absolues restent alignés d'un bout à l'autre.

    ajusterTaille() {
        const wrap = this.container.querySelector('.ar-wrap');
        if (!wrap || !this.terrain || !wrap.clientHeight) return;
        let pris = 0;
        for (const el of wrap.children) if (el !== this.terrain) pris += el.offsetHeight;
        const gaps = 8 * Math.max(0, wrap.children.length - 1);
        const dispoH = wrap.clientHeight - pris - gaps - 6;
        const dispoW = wrap.clientWidth - 8;
        const pas = Math.max(9, Math.min(46, Math.floor(
            Math.min(dispoW / this.etat.cols, dispoH / this.etat.rows)
        )));
        if (pas === this.pas) return;
        this.pas = pas;
        this.terrain.style.setProperty('--pas', `${pas}px`);
        this.terrain.querySelectorAll('.ar-parcelle').forEach(el => this.habiller(el));
    }

    /** Le texte d'une parcelle, dimensionné pour tenir dans la parcelle. */
    habiller(el) {
        const pas = this.pas || 18;
        const w = Number(el.dataset.w), h = Number(el.dataset.h);
        const mul = `${w}×${h}`;
        // Deux lignes seulement si la hauteur les accepte, et une taille de
        // police bornée par la LARGEUR disponible : « 3×12 » dans une bande de
        // trois cases déborderait sinon.
        // Rien d'autre que les CÔTÉS. L'aire était rappelée sous la
        // multiplication : la parcelle donnait alors la réponse au tour
        // suivant qui retomberait sur le même nombre, et surtout elle donnait
        // au voisin, d'un coup d'œil, ce qu'il aurait dû calculer.
        const parLigne = (pas * w - 6) / (mul.length * 0.62);
        const taille = Math.max(7, Math.min(pas * 0.8, parLigne, pas * h * 0.8));
        el.style.fontSize = `${taille.toFixed(1)}px`;
        el.innerHTML = `<i>${mul}</i>`;
    }

    // --- Le déroulement -----------------------------------------------------

    tourSuivant() {
        const n = tirerCible(this.etat, this.rng);
        this.majBandeau();
        if (n === null) return this.finir();
        this.note(this.solo
            ? `Clôture une parcelle de <b>${n}</b> cases. Glisse d'un coin à l'autre.`
            : `Au tour de <b>${this.noms[this.etat.joueur]}</b> : clôture une parcelle de <b>${n}</b> cases. `
                + `Glisse d'un coin à l'autre.`);
    }

    /** Le joker : on refuse le nombre tiré, une fois par partie. */
    jouerJoker() {
        const r = utiliserJoker(this.etat, this.rng);
        if (!r.ok) {
            this.note(r.raison === 'epuise'
                ? 'Ton joker est déjà passé : il n\'y en a qu\'un par partie.'
                : (r.raison === 'seul-possible'
                    ? `Inutile ici : ${this.etat.cible} est le SEUL nombre encore posable. `
                        + 'Ton joker te reste.'
                    : 'La partie est finie.'));
            return;
        }
        this.majBandeau();
        this.note(`Joker ! Le nombre change : clôture une parcelle de <b>${r.cible}</b> cases.`);
    }

    majBandeau() {
        const e = this.etat;
        this.cibleEl.textContent = e.cible ?? '—';
        this.j1El.textContent = this.solo
            ? `${score(e, 1)} cases clôturées`
            : `${this.noms[1]} · ${score(e, 1)}`;
        this.j2El.textContent = `${this.noms[2]} · ${score(e, 2)}`;
        this.j1El.classList.toggle('ar-joueur--actif', e.joueur === 1 && !e.perdant);
        this.j2El.classList.toggle('ar-joueur--actif', e.joueur === 2 && !e.perdant);
        // LE TRACÉ PREND LA COULEUR DE CELUI QUI JOUE. Il était toujours
        // indigo, c'est-à-dire presque le bleu du joueur 1 : pendant que le
        // second dessinait, le terrain donnait la couleur de son adversaire.
        if (this.terrain) {
            this.terrain.style.setProperty('--ar-main', e.joueur === 2 ? '#b45309' : '#1d4ed8');
        }
        if (this.jokerEl) {
            const reste = e.jokers[e.joueur];
            this.jokerEl.textContent = reste ? '🃏 Joker — changer de nombre' : '🃏 Joker utilisé';
            this.jokerEl.disabled = !reste || !!e.perdant;
        }
    }

    finir() {
        const e = this.etat;
        if (this.solo) {
            const pris = score(e, 1), total = e.cols * e.rows;
            this.note(`🏁 Plus aucune parcelle ne rentre. Tu as clôturé <b>${pris}</b> cases sur ${total} `
                + `(${Math.round(pris / total * 100)} %). Il en restait ${restant(e)}, trop morcelées `
                + 'pour un rectangle — c\'est là que se gagne la partie suivante.', 'ok');
            return;
        }
        const gagnant = e.perdant === 1 ? 2 : 1;
        this.note(`🏁 Plus aucune parcelle ne rentre : <b>${this.noms[e.perdant]}</b> ne peut plus poser. `
            + `<b>${this.noms[gagnant]}</b> gagne, avec ${score(e, gagnant)} cases contre ${score(e, e.perdant)}. `
            + `Il restait ${restant(e)} cases libres — trop morcelées pour un rectangle.`, 'ok');
    }

    rejouer() {
        const e = this.etat;
        this.rng = makeRng();
        this.etat = creerPartie({ cols: e.cols, rows: e.rows, table: e.table, minCote: e.minCote });
        this.terrain.innerHTML = '';
        this.tourSuivant();
    }

    // --- Le tracé -----------------------------------------------------------

    caseSous(ev) {
        const r = this.terrain.getBoundingClientRect();
        const pas = this.pas || r.width / this.etat.cols;
        return {
            x: Math.max(0, Math.min(this.etat.cols - 1, Math.floor((ev.clientX - r.left) / pas))),
            y: Math.max(0, Math.min(this.etat.rows - 1, Math.floor((ev.clientY - r.top) / pas)))
        };
    }

    brancherGestes() {
        this.terrain.addEventListener('pointerdown', (ev) => {
            if (this.etat.perdant || this.isDemo) return;
            ev.preventDefault();
            this.coin = this.caseSous(ev);
            this.dessinerTrace(this.coin, this.coin);
        });
        this.terrain.addEventListener('pointermove', (ev) => {
            if (!this.coin) return;
            this.dessinerTrace(this.coin, this.caseSous(ev));
        });
        const lacher = (ev) => {
            if (!this.coin) return;
            const a = this.coin, b = this.caseSous(ev);
            this.coin = null;
            this.effacerTrace();
            this.valider(a, b);
        };
        this.terrain.addEventListener('pointerup', lacher);
        this.terrain.addEventListener('pointercancel', () => { this.coin = null; this.effacerTrace(); });
    }

    rect(a, b) {
        return {
            x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
            w: Math.abs(b.x - a.x) + 1, h: Math.abs(b.y - a.y) + 1
        };
    }

    dessinerTrace(a, b) {
        const r = this.rect(a, b);
        const aire = r.w * r.h;
        let el = this.terrain.querySelector('.ar-trace');
        if (!el) {
            el = document.createElement('div');
            el.className = 'ar-trace';
            this.terrain.appendChild(el);
        }
        const bon = aire === this.etat.cible && libre(this.etat, r.x, r.y, r.w, r.h)
            && r.w >= this.etat.minCote && r.h >= this.etat.minCote;
        el.className = 'ar-trace ' + (aire === this.etat.cible ? (bon ? 'ar-trace--ok' : 'ar-trace--ko')
            : (aire > this.etat.cible ? 'ar-trace--ko' : ''));
        el.style.left = `calc(var(--pas) * ${r.x})`;
        el.style.top = `calc(var(--pas) * ${r.y})`;
        el.style.width = `calc(var(--pas) * ${r.w})`;
        el.style.height = `calc(var(--pas) * ${r.h})`;
        // LES DIMENSIONS, PAS LE PRODUIT. Afficher « 3 × 4 = 12 » pendant le
        // tracé dispensait de calculer : il suffisait d'étirer le rectangle
        // jusqu'à lire le nombre demandé. C'est le seul calcul du jeu — on le
        // rend à l'élève.
        el.textContent = `${r.w} × ${r.h}`;
    }

    effacerTrace() {
        this.terrain.querySelector('.ar-trace')?.remove();
    }

    valider(a, b) {
        const r = this.rect(a, b);
        const res = poser(this.etat, r.x, r.y, r.w, r.h);
        if (!res.ok) {
            this.note(res.message, 'ko');
            return;
        }
        this.peindre(res.parcelle);
        this.note(`✅ ${res.message}`, 'ok');
        this.timerId = setTimeout(() => { if (this.isRunning) this.tourSuivant(); }, 700);
        this.majBandeau();
    }

    peindre(p) {
        const el = document.createElement('div');
        el.className = `ar-parcelle ar-parcelle--${p.joueur}`;
        el.style.left = `calc(var(--pas) * ${p.x})`;
        el.style.top = `calc(var(--pas) * ${p.y})`;
        el.style.width = `calc(var(--pas) * ${p.w})`;
        el.style.height = `calc(var(--pas) * ${p.h})`;
        el.dataset.w = p.w; el.dataset.h = p.h; el.dataset.aire = p.aire;
        this.habiller(el);
        this.terrain.appendChild(el);
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="ar-fin ar-fin--${ton}">${html}</span>` : html;
        // Une note sur trois lignes au lieu de deux mange une rangée de
        // carreaux : on reprend la mesure plutôt que de laisser le terrain
        // déborder sous les boutons.
        this.ajusterTaille();
    }

    // --- Le robot -----------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.terrain);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Un jeu à DEUX, sur la même tablette. À chaque tour, un nombre de la table de Pythagore tombe, et celui dont c\'est le tour doit clôturer une parcelle de cette aire exactement.', this.terrain);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let tour = 0; tour < 5 && this.etat.cible; tour++) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const n = this.etat.cible;
            const liste = formes(this.etat, n);
            const p = placementPossible(this.etat, n);
            if (!p) break;
            cur.say(tour === 0
                ? `${n}. La question n'est pas « combien font 6 × 6 » mais l'inverse : quelles multiplications donnent ${n} ? Ici ${liste.map(([a, b]) => `${a} × ${b}`).join(', ')}.`
                : `${n} : je peux le faire en ${liste.map(([a, b]) => `${a} × ${b}`).join(' ou ')}. Je choisis ${p.w} × ${p.h}.`,
                this.terrain);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

            const res = poser(this.etat, p.x, p.y, p.w, p.h);
            if (res.ok) this.peindre(res.parcelle);
            this.majBandeau();
            if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
            tirerCible(this.etat, this.rng);
            this.majBandeau();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Celui qui ne peut plus poser a perdu. À la fin il reste toujours des trous : une surface libre ne suffit pas, encore faut-il qu\'elle ait la bonne FORME. Connaître beaucoup de décompositions, c\'est donc avoir plus de coups possibles que l\'autre.', this.terrain);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.observateur) { this.observateur.disconnect(); this.observateur = null; }
        super.destroy();
    }
}

export function engineArpenteurs(container, isDemo, params) {
    const jeu = new Arpenteurs(container, isDemo, params);
    jeu.start();
    return jeu;
}
