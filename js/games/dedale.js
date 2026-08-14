// LES DÉDALES — à l'écran.
//
// Le noyau (core/dedale.js) porte les formes, les murs et le dessin caché.
// Ici : le tracé des murs, le personnage, les commandes, et le fil.
//
// QUATRE CHOIX COMMANDENT CE FICHIER.
//
//   · LE FIL D'ARIANE SE REMBOBINE. On ne peint pas les cases visitées : on
//     tient le CHEMIN COURANT depuis le départ. Revenir sur ses pas efface le
//     fil derrière soi. C'est ce qui rend la promesse du jeu littéralement
//     vraie dans les dédales à dessin : quand on arrive, le fil est le dessin,
//     et rien d'autre — pas les impasses explorées en route.
//     (Dans un arbre, le chemin du départ à la case courante est unique : le
//     fil ainsi tenu EST ce chemin, sans avoir à le recalculer.)
//
//   · LE DESSIN NE SE MONTRE JAMAIS À L'AVANCE. Ni en filigrane, ni au
//     survol, ni dans le titre. On annonce qu'il y en a un, c'est tout — le
//     découvrir est la récompense.
//
//   · TOUT LE DÉDALE TIENT À L'ÉCRAN. Un labyrinthe qu'il faut faire défiler
//     ne se lit plus : on ne voit pas où l'on va, donc on n'anticipe pas, donc
//     on tâtonne. La case rétrécit, jamais le champ.
//
//   · TROIS FAÇONS DE SE DÉPLACER. Clavier, croix tactile, et le doigt posé
//     sur le dédale que l'on promène — un pas au plus par événement, jamais à
//     travers un mur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    FORMES, NOMS_FORMES, DESSINS, NOMS_DESSINS, cle, ouvert,
    creerDedale, creerDedaleDessin, avancer, partDessin, chemin
} from '../core/dedale.js';

const COMPETENCE = 'geo.espace.deplacement';
const CASE_MAX = 46;
const CASE_MIN = 13;      // en dessous, le doigt ne vise plus rien

/** Les sens, dans l'ordre où la croix les présente. */
const SENS = { h: [0, -1], b: [0, 1], g: [-1, 0], d: [1, 0] };

class Dedale extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'dedale');
        this.rng = makeRng(this.params.seed);
        this.mode = this.params.mode === 'dessin' ? 'dessin' : 'forme';
        this.cote = CASE_MAX;
        this.resolus = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .dd-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 6px;
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; overflow: hidden;
                }
                .dd-tete {
                    display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .86rem; flex: 0 0 auto;
                }
                .dd-titre {
                    font-weight: 900; font-size: clamp(13px, 3cqw, 16px);
                    padding: 4px 14px; border-radius: 999px; color: #fff;
                    background: linear-gradient(135deg, #6366f1, #0ea5e9);
                    box-shadow: 0 3px 10px rgba(99,102,241,.38);
                }
                .dd-jauge {
                    width: min(38cqw, 170px); height: 10px; border-radius: 999px;
                    background: color-mix(in srgb, var(--text-main) 14%, transparent);
                    overflow: hidden; border: 1.5px solid var(--text-main);
                }
                .dd-jauge > div {
                    height: 100%; width: 0; transition: width .25s;
                    background: linear-gradient(90deg, #34d399, #059669);
                }

                .dd-corps {
                    display: flex; align-items: center; justify-content: center; gap: 12px;
                    flex: 1 1 auto; width: 100%; min-height: 0;
                }
                .dd-vue {
                    position: relative; flex: 1 1 auto; height: 100%; min-height: 0;
                    display: flex; align-items: center; justify-content: center;
                    touch-action: none; user-select: none; -webkit-tap-highlight-color: transparent;
                }
                .dd-plateau { position: relative; }

                /* LA CASE. Ses murs sont ses bordures : un mur est un côté sans
                   passage, donc le dessin des murs se déduit du noyau sans
                   qu'aucune liste de segments n'ait à être tenue à jour. */
                .dd-case {
                    position: absolute; box-sizing: border-box;
                    background: color-mix(in srgb, var(--text-main) 5%, var(--bg-panel));
                    border: 0 solid #1e293b;
                }
                .dd-case.dd-m-h { border-top-width: var(--mur); }
                .dd-case.dd-m-b { border-bottom-width: var(--mur); }
                .dd-case.dd-m-g { border-left-width: var(--mur); }
                .dd-case.dd-m-d { border-right-width: var(--mur); }

                /* LE FIL. Un rond plein au centre de la case, relié à la
                   suivante — on le voit comme un trait continu. */
                .dd-fil {
                    position: absolute; border-radius: 3px; z-index: 2;
                    background: linear-gradient(135deg, #f472b6, #db2777);
                    box-shadow: 0 0 8px rgba(219,39,119,.55);
                    animation: dd-pose .18s ease;
                }
                @keyframes dd-pose { from { opacity: 0; scale: .5; } }
                /* Les impasses explorées, quand on demande à les garder : gris
                   pâle, en dessous du fil, pour ne jamais brouiller le dessin. */
                .dd-vieux { position: absolute; z-index: 1; border-radius: 2px;
                    background: color-mix(in srgb, var(--text-main) 20%, transparent); }

                .dd-depart, .dd-arrivee {
                    position: absolute; z-index: 1; display: flex;
                    align-items: center; justify-content: center; border-radius: 5px;
                    font-size: 74%; line-height: 1;
                }
                .dd-depart { background: rgba(16,185,129,.28); }
                .dd-arrivee { background: rgba(245,158,11,.34); animation: dd-appel 1.5s ease-in-out infinite alternate; }
                @keyframes dd-appel { to { filter: brightness(1.45); } }

                .dd-heros {
                    position: absolute; border-radius: 50%; z-index: 4;
                    background: radial-gradient(circle at 34% 28%, #fff 0%, #a5b4fc 35%, #4f46e5 78%, #312e81 100%);
                    border: 2px solid #1e1b4b;
                    box-shadow: 0 3px 9px rgba(0,0,0,.4);
                    display: flex; align-items: center; justify-content: center; gap: 14%;
                    transition: left .1s linear, top .1s linear;
                }
                .dd-heros i { width: 21%; height: 27%; border-radius: 50%; background: #f8fafc; }
                .dd-heros[data-sens="d"] i { translate: 22% 0; }
                .dd-heros[data-sens="g"] i { translate: -22% 0; }
                .dd-heros[data-sens="h"] i { translate: 0 -22%; }
                .dd-heros[data-sens="b"] i { translate: 0 22%; }
                .dd-heros--mur { animation: dd-cogne .22s ease; }
                @keyframes dd-cogne { 50% { filter: brightness(1.8) saturate(.3); scale: .88; } }

                .dd-pied { display: flex; gap: 12px; align-items: center;
                    justify-content: center; flex: 0 0 auto; flex-wrap: wrap; }
                .dd-croix { display: grid; grid-template-columns: repeat(3, 46px);
                    grid-template-rows: repeat(3, 40px); gap: 3px; }
                .dd-fleche {
                    border: 0; border-radius: 10px; cursor: pointer; font-size: 1.2rem;
                    background: color-mix(in srgb, var(--text-main) 12%, var(--bg-panel));
                    color: var(--text-main); font-weight: 900; font-family: inherit;
                    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
                }
                .dd-fleche:active { background: var(--primary); color: #fff; scale: .93; }
                .dd-btn {
                    border: 0; border-radius: 10px; padding: 8px 14px; cursor: pointer;
                    font-family: inherit; font-weight: 700; font-size: .84rem;
                    background: color-mix(in srgb, var(--text-main) 12%, var(--bg-panel));
                    color: var(--text-main); touch-action: manipulation;
                }
                .dd-btn:active { scale: .95; }
                .dd-note { min-height: 1.8em; text-align: center; font-size: .84rem;
                    color: var(--text-muted); flex: 0 0 auto; max-width: 660px; }
                .dd-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .dd-note--ko { color: var(--danger, #dc2626); font-weight: 600; }

                @container (min-width: 760px) { .dd-croix { opacity: .6; } }
                @media (max-height: 560px) {
                    .dd-corps { gap: 8px; }
                    .dd-croix { grid-template-columns: repeat(3, 38px); grid-template-rows: repeat(3, 32px); }
                    .dd-pied { flex-direction: column; gap: 6px; }
                    .dd-note { min-height: 1.2em; font-size: .76rem; }
                }
            </style>
            <div class="dd-wrap">
                <div class="dd-tete">
                    <span class="dd-titre" data-titre></span>
                    <div class="dd-jauge"><div data-jauge></div></div>
                    <span data-pas>0 pas</span>
                </div>
                <div class="dd-corps">
                    <div class="dd-vue" data-vue tabindex="0" aria-label="Dédale">
                        <div class="dd-plateau" data-plateau></div>
                    </div>
                    <div class="dd-pied">
                        <div class="dd-croix">
                            <span></span><button type="button" class="dd-fleche" data-sens="h">▲</button><span></span>
                            <button type="button" class="dd-fleche" data-sens="g">◀</button>
                            <span></span>
                            <button type="button" class="dd-fleche" data-sens="d">▶</button>
                            <span></span><button type="button" class="dd-fleche" data-sens="b">▼</button><span></span>
                        </div>
                        <button type="button" class="dd-btn" data-neuf>↺ Autre dédale</button>
                    </div>
                </div>
                <div class="dd-note" data-note></div>
            </div>`;
        this.vueEl = this.container.querySelector('[data-vue]');
        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.brancherCommandes();

        this.observateur = new ResizeObserver(() => {
            if (!this.etat) return;
            // Le dédale ne se refait PAS quand l'écran bouge : on perdrait le
            // chemin en cours. Seule la taille des cases suit.
            if (this.coteCase() !== this.cote) this.dessiner();
        });
        this.observateur.observe(this.vueEl);
    }

    brancherCommandes() {
        this.container.querySelectorAll('[data-sens]').forEach(b => {
            b.onclick = () => this.aller(b.dataset.sens);
        });
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();

        this.surTouche = (e) => {
            if (this.isDemo || !this.isRunning) return;
            const s = {
                ArrowLeft: 'g', ArrowRight: 'd', ArrowUp: 'h', ArrowDown: 'b',
                q: 'g', d: 'd', z: 'h', s: 'b'
            }[e.key];
            if (s) { e.preventDefault(); this.aller(s); }
        };
        document.addEventListener('keydown', this.surTouche);

        // LE DOIGT PROMENÉ : on désigne la case voisine où aller. Un pas au
        // plus par événement — un doigt rapide ne doit pas traverser des murs
        // parce qu'il a sauté trois cases entre deux images.
        let suit = false;
        const versLa = (ev) => {
            if (!this.etat || this.fini) return;
            const r = this.plateauEl.getBoundingClientRect();
            if (!r.width) return;
            const bx = Math.floor((ev.clientX - r.left) / this.cote);
            const by = Math.floor((ev.clientY - r.top) / this.cote);
            const dx = bx - this.position[0], dy = by - this.position[1];
            if (!dx && !dy) return;
            this.aller(Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'd' : 'g') : (dy > 0 ? 'b' : 'h'), true);
        };
        this.vueEl.onpointerdown = (ev) => {
            if (this.isDemo) return;
            ev.preventDefault();
            suit = true;
            try { this.vueEl.setPointerCapture(ev.pointerId); } catch { /* sans capture */ }
            versLa(ev);
        };
        this.vueEl.onpointermove = (ev) => { if (suit) versLa(ev); };
        const lacher = () => { suit = false; };
        this.vueEl.onpointerup = lacher;
        this.vueEl.onpointercancel = lacher;
    }

    startGameLoop() { this.poser(); }

    // --- Poser un dédale ------------------------------------------------------

    poser() {
        const p = this.params;
        if (this.mode === 'dessin') {
            const nom = p.dessin && DESSINS[p.dessin] ? p.dessin : this.rng.pick(NOMS_DESSINS);
            this.etat = creerDedaleDessin({
                rng: this.rng, dessin: nom,
                marge: Math.max(0, Math.min(4, Number(p.marge ?? 2)))
            });
        } else {
            const nom = p.forme && FORMES[p.forme] ? p.forme : this.rng.pick(NOMS_FORMES);
            const t = TAILLES[p.taille] || TAILLES.moyen;
            this.etat = creerDedale({ rng: this.rng, forme: nom, cols: t, lignes: t });
        }
        this.position = this.etat.depart.slice();
        this.sens = 'b';
        // Le fil : le chemin courant depuis le départ. Il se rembobine.
        this.fil = [this.etat.depart.slice()];
        this.explorees = new Set([cle(this.etat.depart[0], this.etat.depart[1])]);
        this.pas = 0;
        this.fini = false;

        // ON NE NOMME PAS LE DESSIN. « L'escalier » écrit en haut, et il n'y a
        // plus rien à découvrir.
        this.container.querySelector('[data-titre]').textContent = this.mode === 'dessin'
            ? 'Ton chemin dessine quelque chose…'
            : (FORMES[this.etat.forme] || FORMES.rectangle).nom;
        this.dessiner();
        this.majTete();
        this.note(this.mode === 'dessin'
            ? 'Va du rond vert à l\'étoile. Le fil rose que tu laisses derrière toi finira par former une image — et si tu reviens sur tes pas, il se rembobine.'
            : 'Va du rond vert à l\'étoile. Flèches du clavier, croix, ou promène ton doigt sur le dédale.');
        return true;
    }

    // --- Le dessin de la grille -------------------------------------------------

    coteCase() {
        const e = this.etat;
        if (!e || !this.vueEl) return CASE_MAX;
        const w = this.vueEl.clientWidth || 400, h = this.vueEl.clientHeight || 320;
        return Math.max(CASE_MIN, Math.min(CASE_MAX,
            Math.floor(Math.min(w / e.cols, h / e.lignes))));
    }

    dessiner() {
        const e = this.etat;
        const C = this.cote = this.coteCase();
        const mur = Math.max(1, Math.round(C / 14));
        this.plateauEl.style.cssText =
            `width:${e.cols * C}px; height:${e.lignes * C}px; --mur:${mur}px`;

        let html = '';
        for (const k of e.dans) {
            const [x, y] = k.split(',').map(Number);
            // Un côté est un mur dès qu'il n'y a pas de passage — y compris au
            // bord de la forme, où la case voisine n'existe pas.
            const murs = Object.entries(SENS)
                .filter(([, [dx, dy]]) => {
                    const n = [x + dx, y + dy];
                    return !e.dans.has(cle(n[0], n[1])) || !ouvert(e, [x, y], n);
                })
                .map(([s]) => `dd-m-${s}`).join(' ');
            html += `<div class="dd-case ${murs}" style="left:${x * C}px; top:${y * C}px;`
                + `width:${C}px; height:${C}px"></div>`;
        }
        const [dx, dy] = e.depart, [ax, ay] = e.arrivee;
        const m = Math.round(C * 0.14), petit = C - 2 * m;
        html += `<div class="dd-depart" style="left:${dx * C + m}px; top:${dy * C + m}px;`
            + `width:${petit}px; height:${petit}px; font-size:${Math.round(C * 0.5)}px">🟢</div>`;
        html += `<div class="dd-arrivee" style="left:${ax * C + m}px; top:${ay * C + m}px;`
            + `width:${petit}px; height:${petit}px; font-size:${Math.round(C * 0.5)}px">⭐</div>`;
        const cote = Math.round(C * 0.6);
        html += `<div class="dd-heros" data-heros style="width:${cote}px; height:${cote}px"></div>`;
        this.plateauEl.innerHTML = html;
        this.herosEl = this.plateauEl.querySelector('[data-heros]');
        this.herosEl.innerHTML = '<i></i><i></i>';
        this.dessinerFil();
        this.placerHeros();
    }

    /**
     * LE FIL, redessiné en entier à chaque pas.
     *
     * On pourrait n'ajouter que le segment neuf ; il faudrait alors savoir le
     * retirer au rembobinage, et l'erreur d'un seul retrait laisserait un
     * morceau de dessin faux à l'écran. Un dédale fait au plus quelques
     * centaines de cases : on redessine, et le fil affiché est le fil, toujours.
     */
    dessinerFil() {
        this.plateauEl.querySelectorAll('.dd-fil, .dd-vieux').forEach(el => el.remove());
        const C = this.cote;
        const frag = document.createDocumentFragment();

        // Les impasses gardées, si on l'a demandé : sous le fil, en gris.
        if (this.params.trace === 'tout') {
            const surLeFil = new Set(this.fil.map(c => cle(c[0], c[1])));
            const t = Math.max(3, Math.round(C * 0.16));
            for (const k of this.explorees) {
                if (surLeFil.has(k)) continue;
                const [x, y] = k.split(',').map(Number);
                const el = document.createElement('div');
                el.className = 'dd-vieux';
                el.style.cssText = `left:${x * C + (C - t) / 2}px; top:${y * C + (C - t) / 2}px;`
                    + `width:${t}px; height:${t}px`;
                frag.appendChild(el);
            }
        }

        if (this.params.trace !== 'rien' || this.mode === 'dessin') {
            const ep = Math.max(3, Math.round(C * 0.3));
            const pose = (x, y, w, h) => {
                const el = document.createElement('div');
                el.className = 'dd-fil';
                el.style.cssText = `left:${x}px; top:${y}px; width:${w}px; height:${h}px`;
                frag.appendChild(el);
            };
            // Une pastille par case, et un pont vers la suivante : les deux
            // ensemble se lisent comme un trait continu, même en diagonale de
            // l'écran, sans avoir à calculer des jointures.
            this.fil.forEach(([x, y]) => pose(x * C + (C - ep) / 2, y * C + (C - ep) / 2, ep, ep));
            for (let i = 1; i < this.fil.length; i++) {
                const [x0, y0] = this.fil[i - 1], [x1, y1] = this.fil[i];
                const cx = Math.min(x0, x1) * C + (C - ep) / 2;
                const cy = Math.min(y0, y1) * C + (C - ep) / 2;
                if (x0 === x1) pose(cx, cy, ep, C + ep);
                else pose(cx, cy, C + ep, ep);
            }
        }
        this.plateauEl.appendChild(frag);
    }

    placerHeros() {
        if (!this.herosEl) return;
        const C = this.cote, cote = Math.round(C * 0.6), m = (C - cote) / 2;
        this.herosEl.dataset.sens = this.sens;
        this.herosEl.style.left = `${this.position[0] * C + m}px`;
        this.herosEl.style.top = `${this.position[1] * C + m}px`;
    }

    majTete() {
        const pc = this.mode === 'dessin'
            ? partDessin(this.etat, new Set(this.fil.map(c => cle(c[0], c[1]))))
            : Math.round((1 - this.reste() / Math.max(1, this.etat.solution.length - 1)) * 100);
        this.container.querySelector('[data-jauge]').style.width = `${Math.max(0, pc)}%`;
        this.container.querySelector('[data-pas]').textContent = `${this.pas} pas`;
    }

    /** Combien de cases restent entre ici et l'arrivée — dans un arbre, c'est exact. */
    reste() {
        const c = chemin(this.etat, this.position, this.etat.arrivee);
        return c ? c.length - 1 : 0;
    }

    // --- Jouer -----------------------------------------------------------------

    aller(sens, silencieux = false) {
        if (this.isDemo || !this.etat || this.fini) return;
        this.sens = sens;
        const r = avancer(this.etat, this.position, sens);
        if (!r.ok) {
            this.placerHeros();
            if (!silencieux && this.herosEl) {
                this.herosEl.classList.remove('dd-heros--mur');
                void this.herosEl.offsetWidth;
                this.herosEl.classList.add('dd-heros--mur');
            }
            return;
        }
        this.position = r.position;
        this.pas++;
        this.explorees.add(cle(r.position[0], r.position[1]));

        // LE REMBOBINAGE : revenir sur la case d'avant retire le dernier
        // maillon au lieu d'en ajouter un. Le fil reste donc le chemin simple
        // du départ à ici — c'est ce qui fait que l'image finale est propre.
        const avant = this.fil[this.fil.length - 2];
        if (avant && avant[0] === r.position[0] && avant[1] === r.position[1]) this.fil.pop();
        else this.fil.push(r.position.slice());

        this.dessinerFil();
        this.placerHeros();
        this.majTete();
        if (r.arrive) this.gagne();
    }

    gagne() {
        this.fini = true;
        this.resolus++;
        const optimal = this.etat.solution.length - 1;
        const direct = this.pas === optimal;
        this.note(this.mode === 'dessin'
            ? `🎉 Regarde ton fil : c'est « ${this.etat.dessin.nom} » ! ${this.pas} pas.`
            : `🎉 Sorti en ${this.pas} pas` + (direct ? ' — sans un seul détour !' : `, le plus court en faisait ${optimal}.`),
        'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: this.mode === 'dessin'
                ? `Dédale à dessin — ${this.etat.dessin.nom}`
                : `Dédale « ${(FORMES[this.etat.forme] || FORMES.rectangle).nom} »`,
            expected: 'sortie atteinte', given: 'sortie atteinte',
            points: 10 + (direct ? 8 : 0)
        });
        setTimeout(() => { if (this.isRunning && this.fini) this.poser(); }, 2600);
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'dd-note' + (ton ? ` dd-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.etat) this.poser();
        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Le rond vert, c\'est toi ; l\'étoile, la sortie. Entre les deux, un seul '
            + 'chemin — ce dédale n\'a aucune boucle.', this.plateauEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(this.mode === 'dessin'
            ? 'Ici, le chemin de la sortie DESSINE quelque chose. Impossible de le voir '
              + 'd\'avance : il apparaît sous tes pas.'
            : 'Les flèches, la croix, ou ton doigt promené sur le dédale : trois façons '
              + 'd\'avancer, jamais à travers un mur.',
        this.container.querySelector('.dd-croix'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // On suit la vraie solution sur quelques cases : le fil se voit naître.
        const route = this.etat.solution;
        for (let i = 1; i < Math.min(route.length, 9); i++) {
            if (!this.isRunning) return fin();
            const [dx, dy] = [route[i][0] - this.position[0], route[i][1] - this.position[1]];
            const s = dx === 1 ? 'd' : dx === -1 ? 'g' : dy === 1 ? 'b' : 'h';
            this.sens = s;
            this.position = route[i].slice();
            this.fil.push(route[i].slice());
            this.pas++;
            this.dessinerFil();
            this.placerHeros();
            this.majTete();
            if (!await cur.pause(DEMO_SPEED.settle / 2)) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et si je reviens sur mes pas, le fil se rembobine : seule la route que '
            + 'je garde reste tracée.', this.plateauEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.surTouche) { document.removeEventListener('keydown', this.surTouche); this.surTouche = null; }
        if (this.observateur) { this.observateur.disconnect(); this.observateur = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

const TAILLES = { petit: 11, moyen: 15, grand: 21 };

export function engineDedale(container, isDemo, params) {
    const jeu = new Dedale(container, isDemo, params);
    // C'est l'usine qui démarre le jeu : le Runner ne le fait pas.
    jeu.start();
    return jeu;
}
