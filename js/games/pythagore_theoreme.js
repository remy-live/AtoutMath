// PYTHAGORE, TRÈS PROGRESSIVEMENT — l'exercice à l'écran.
//
// Six niveaux, six marches (core/pythagore.js). Le principe hérité de
// l'exercice des parallèles et perpendiculaires : ON NE DEMANDE JAMAIS DEUX
// CHOSES NOUVELLES À LA FOIS. Montrer l'hypoténuse du doigt ne demande pas de
// phrase ; remettre la phrase en ordre ne demande pas de calcul ; le calcul
// arrive quand l'égalité est un acquis.
//
// La figure est toujours là, et elle est toujours VRAIE : le triangle est
// dessiné avec les proportions de son triplet, tourné au hasard — un théorème
// appris sur un triangle toujours posé sur son angle droit ne se reconnaît
// plus dès que la figure penche.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    THEOREME, NIVEAUX, niveauDe, tirerTriangle, cotesDe, direTriangle,
    egaliteDe, verifierEgalite, etapesCalcul, groupesMelanges, verifierPhrase
} from '../core/pythagore.js';
import { rendreGlissable, CSS_GLISSER } from '../core/glisserDeposer.js';

const SKILL = 'geo.pythagore';

class Pythagore extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'pythagore');
        this.rng = makeRng(this.params.seed);
        this.niveau = niveauDe(this.params.niveau);
        this.reussis = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                ${CSS_GLISSER}
                .py-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    height: 100%; width: 100%; color: var(--text-main); overflow-y: auto;
                    padding: 8px; box-sizing: border-box; container-type: inline-size;
                }
                .py-consigne { text-align: center; font-weight: 700; max-width: 640px;
                    font-size: clamp(13px, 3cqw, 17px); line-height: 1.3; }
                .py-corps { display: flex; gap: 14px; align-items: flex-start;
                    justify-content: center; width: 100%; flex-wrap: wrap; }
                .py-figure svg { display: block; width: clamp(220px, 44cqw, 360px); height: auto; }
                .py-cote { stroke: var(--text-main); stroke-width: 2.6; fill: none; cursor: pointer; }
                .py-cote--zone { stroke: transparent; stroke-width: 22; cursor: pointer; }
                .py-cote--hypo { stroke: #2563eb; }
                .py-cote--montre { animation: py-cli .6s ease-in-out 4; }
                @keyframes py-cli { 50% { stroke-width: 8; filter: drop-shadow(0 0 7px rgba(37,99,235,.9)); } }
                .py-cote--faute { stroke: var(--danger, #dc2626); animation: py-cli .5s ease 2; }
                .py-angle { stroke: #b45309; stroke-width: 2.4; fill: none; }
                .py-nom {
                    font-size: 23px; font-weight: 800; fill: var(--text-main);
                    paint-order: stroke; stroke: var(--bg-panel); stroke-width: 4px; stroke-linejoin: round;
                }
                .py-mesure {
                    font-size: 17px; font-weight: 700; fill: #6b7280;
                    paint-order: stroke; stroke: var(--bg-panel); stroke-width: 4px; stroke-linejoin: round;
                }

                .py-zone { flex: 1 1 300px; max-width: 480px; min-width: 260px;
                    display: flex; flex-direction: column; gap: 10px; }
                .py-phrase { display: flex; flex-wrap: wrap; gap: 6px; min-height: 40px;
                    border: 2px dashed var(--border); border-radius: 10px; padding: 8px; }
                .py-banque { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
                .py-mot {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 8px; padding: 6px 10px; cursor: pointer; font: inherit; font-weight: 600;
                    font-size: clamp(12px, 2.6cqw, 15px);
                }
                .py-mot--pose { background: color-mix(in srgb, var(--primary) 12%, var(--bg-panel)); }
                .py-mot--faux { animation: py-secoue .4s ease 2; border-color: var(--danger, #dc2626); }
                @keyframes py-secoue { 50% { transform: translateX(-4px); } }

                .py-egalite { display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
                    justify-content: center; font-size: clamp(17px, 4cqw, 24px); font-weight: 800; }
                .py-trou {
                    min-width: 54px; height: 38px; border: 2px dashed var(--border); border-radius: 9px;
                    display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
                    background: var(--bg-panel); font: inherit; color: var(--text-main);
                }
                .py-trou--choisi { border-color: var(--primary); border-style: solid; }
                .py-trou--plein { border-style: solid; }
                .py-calc { display: flex; flex-direction: column; gap: 8px;
                    font-size: clamp(15px, 3.4cqw, 20px); font-weight: 700; }
                .py-calc-ligne { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
                .py-saisie {
                    width: 96px; padding: 6px 8px; border: 2px solid var(--border); border-radius: 9px;
                    font: inherit; font-weight: 800; text-align: center;
                    background: var(--bg-panel); color: var(--text-main);
                }
                .py-saisie--ok { border-color: var(--success, #16a34a); }
                .py-saisie--ko { border-color: var(--danger, #dc2626); animation: py-secoue .4s ease 2; }

                .py-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .py-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 13px;
                }
                .py-btn--valider { border-color: var(--primary); background: var(--primary); color: #fff; }
                .py-note { min-height: 2.6em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 640px; }
                .py-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .py-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="py-wrap">
                <div class="py-consigne" data-consigne></div>
                <div class="py-corps">
                    <div class="py-figure" data-figure></div>
                    <div class="py-zone" data-zone></div>
                </div>
                <div class="py-barre" data-barre></div>
                <div class="py-note" data-note></div>
            </div>`;
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.figureEl = this.container.querySelector('[data-figure]');
        this.zoneEl = this.container.querySelector('[data-zone]');
        this.barreEl = this.container.querySelector('[data-barre]');
        this.noteEl = this.container.querySelector('[data-note]');
    }

    startGameLoop() { this.poser(); }

    poser() {
        this.t = tirerTriangle(this.rng);
        this.infos = cotesDe(this.t);
        // Chercher l'hypoténuse au niveau 4, une cathète au niveau 5 ; au
        // niveau 6, l'un ou l'autre.
        this.chercher = this.niveau.id === 5 || (this.niveau.id === 6 && this.rng.bool(0.5))
            ? this.rng.pick(this.infos.cathetes).nom : null;
        this.consigneEl.textContent = this.niveau.consigne;
        this.dessinerFigure();
        this.monterNiveau();
        this.note('');
        return true;
    }

    // --- La figure -----------------------------------------------------------

    /** Les coordonnées des trois sommets, à l'échelle du triplet, tournées. */
    pointsDe() {
        const [a, b] = this.t.triplet;
        const droit = this.t.angleDroit;
        const autres = [0, 1, 2].filter(i => i !== droit);
        const brut = [];
        brut[droit] = { x: 0, y: 0 };
        brut[autres[0]] = { x: a, y: 0 };
        brut[autres[1]] = { x: 0, y: b };
        const rad = this.t.orientation * Math.PI / 180;
        const tourne = brut.map(p => ({
            x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
            y: p.x * Math.sin(rad) + p.y * Math.cos(rad)
        }));
        // Cadre 300 × 240, avec la marge des étiquettes.
        const xs = tourne.map(p => p.x), ys = tourne.map(p => p.y);
        const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
        const k = Math.min(232 / w, 168 / h);
        return tourne.map(p => ({
            x: 34 + (p.x - Math.min(...xs)) * k,
            y: 36 + (p.y - Math.min(...ys)) * k
        }));
    }

    dessinerFigure(avecMesures) {
        const P = this.pointsDe();
        const s = this.t.sommets;
        const droit = this.t.angleDroit;
        const autres = [0, 1, 2].filter(i => i !== droit);
        const centre = { x: (P[0].x + P[1].x + P[2].x) / 3, y: (P[0].y + P[1].y + P[2].y) / 3 };
        const mesures = avecMesures ?? this.niveau.id >= 4;

        const norme = (v) => { const n = Math.hypot(v.x, v.y) || 1; return { x: v.x / n, y: v.y / n }; };
        // Le petit carré de l'angle droit, dans le coin.
        const u = norme({ x: P[autres[0]].x - P[droit].x, y: P[autres[0]].y - P[droit].y });
        const v = norme({ x: P[autres[1]].x - P[droit].x, y: P[autres[1]].y - P[droit].y });
        const q = 13;
        const carre = `M ${P[droit].x + u.x * q} ${P[droit].y + u.y * q}
            L ${P[droit].x + (u.x + v.x) * q} ${P[droit].y + (u.y + v.y) * q}
            L ${P[droit].x + v.x * q} ${P[droit].y + v.y * q}`;

        const cotes = [
            { i: autres[0], j: autres[1], nom: this.infos.hypo.nom, longueur: this.infos.hypo.longueur, hypo: true },
            { i: droit, j: autres[0], nom: this.infos.cathetes[0].nom, longueur: this.infos.cathetes[0].longueur },
            { i: droit, j: autres[1], nom: this.infos.cathetes[1].nom, longueur: this.infos.cathetes[1].longueur }
        ];

        let svg = `<svg viewBox="0 0 300 240" role="img" aria-label="${direTriangle(this.t)}">`;
        cotes.forEach(c => {
            const m = { x: (P[c.i].x + P[c.j].x) / 2, y: (P[c.i].y + P[c.j].y) / 2 };
            const dehors = norme({ x: m.x - centre.x, y: m.y - centre.y });
            svg += `<line class="py-cote" data-cote="${c.nom}" x1="${P[c.i].x}" y1="${P[c.i].y}"
                x2="${P[c.j].x}" y2="${P[c.j].y}"></line>`;
            svg += `<line class="py-cote--zone" data-cote="${c.nom}" x1="${P[c.i].x}" y1="${P[c.i].y}"
                x2="${P[c.j].x}" y2="${P[c.j].y}"></line>`;
            if (mesures) {
                // La longueur cherchée reste un « ? » : la figure pose la
                // question, elle ne donne pas la réponse.
                const cache = this.niveau.id >= 4
                    && ((this.chercher || this.infos.hypo.nom) === c.nom);
                svg += `<text class="py-mesure" x="${m.x + dehors.x * 17}" y="${m.y + dehors.y * 17 + 5}"
                    text-anchor="middle">${cache ? '?' : c.longueur + ' cm'}</text>`;
            }
        });
        svg += `<path class="py-angle" d="${carre}"></path>`;
        s.forEach((nom, i) => {
            const dehors = norme({ x: P[i].x - centre.x, y: P[i].y - centre.y });
            svg += `<text class="py-nom" x="${P[i].x + dehors.x * 16}" y="${P[i].y + dehors.y * 16 + 7}"
                text-anchor="middle">${nom}</text>`;
        });
        svg += '</svg>';
        this.figureEl.innerHTML = svg;
    }

    // --- Les niveaux ----------------------------------------------------------

    monterNiveau() {
        this.barreEl.innerHTML = '';
        switch (this.niveau.cle) {
            case 'hypotenuse': return this.monterHypotenuse();
            case 'phrase': return this.monterPhrase();
            case 'egalite': return this.monterEgalite();
            default: return this.monterCalcul();
        }
    }

    // Niveau 1 : cliquer l'hypoténuse.
    monterHypotenuse() {
        this.zoneEl.innerHTML = `<p style="text-align:center">${direTriangle(this.t)}.<br>
            <b>L'hypoténuse</b> est le côté en face de l'angle droit.</p>`;
        this.figureEl.querySelectorAll('[data-cote]').forEach(el => {
            el.onclick = () => {
                if (this.isDemo) return;
                const nom = el.dataset.cote;
                const trait = this.figureEl.querySelector(`.py-cote[data-cote="${nom}"]`);
                if (nom === this.infos.hypo.nom) {
                    trait.classList.add('py-cote--hypo', 'py-cote--montre');
                    this.note(`✅ [${nom}] est bien l'hypoténuse : elle est en face de l'angle droit ${this.infos.sommetDroit}, et c'est le plus long côté.`, 'ok');
                    this.gagner(`Montrer l'hypoténuse de ${this.t.nom}`, nom, 6);
                    setTimeout(() => { if (this.isRunning) this.poser(); }, 1700);
                } else {
                    trait.classList.add('py-cote--faute');
                    setTimeout(() => trait.classList.remove('py-cote--faute'), 900);
                    this.note(`❌ [${nom}] touche le sommet ${this.infos.sommetDroit}, celui de l'angle droit. `
                        + `L'hypoténuse est le côté qui ne le touche PAS.`, 'ko');
                    this.perdre(`Montrer l'hypoténuse de ${this.t.nom}`, nom, this.infos.hypo.nom,
                        `L'hypoténuse est en face de l'angle droit ${this.infos.sommetDroit}.`);
                }
            };
        });
    }

    // Niveau 2 : la phrase dans l'ordre.
    monterPhrase() {
        this.phrase = new Array(THEOREME.groupes.length).fill(null);
        this.banque = groupesMelanges(this.rng);
        this.zoneEl.innerHTML = `
            <div class="py-phrase" data-phrase></div>
            <div class="py-banque" data-banque></div>`;
        this.barreEl.innerHTML = `<button type="button" class="py-btn py-btn--valider" data-verif>Vérifier</button>`;
        this.barreEl.querySelector('[data-verif]').onclick = () => this.validerPhrase();
        this.peindrePhrase();
    }

    /** Retire un morceau posé et retasse : jamais de trou au milieu. */
    reprendreMot(rang) {
        this.phrase[rang] = null;
        this.phrase = this.phrase.filter(g => g !== null).concat(
            new Array(THEOREME.groupes.length).fill(null)).slice(0, THEOREME.groupes.length);
        this.peindrePhrase();
    }

    peindrePhrase() {
        const zone = this.zoneEl.querySelector('[data-phrase]');
        const banque = this.zoneEl.querySelector('[data-banque]');
        zone.innerHTML = this.phrase.map((g, i) => g === null
            ? `<button type="button" class="py-mot py-trou" data-rang="${i}" style="min-width:80px">&nbsp;</button>`
            : `<button type="button" class="py-mot py-mot--pose" data-rang="${i}">${g}</button>`).join('');
        banque.innerHTML = this.banque.map((g, k) =>
            this.phrase.includes(g) ? '' : `<button type="button" class="py-mot" data-mot="${k}">${g}</button>`).join('');

        // LE CLIC ET LE GLISSÉ font la même chose : le clic pose dans le
        // premier trou libre, le glissé pose où l'on vise.
        banque.querySelectorAll('[data-mot]').forEach(b => {
            const poser = (rang) => {
                if (this.isDemo || this.vientDeGlisser) return;
                const mot = this.banque[Number(b.dataset.mot)];
                const trou = rang !== undefined && this.phrase[rang] === null ? rang : this.phrase.indexOf(null);
                if (trou === -1) return;
                this.phrase[trou] = mot;
                this.peindrePhrase();
            };
            b.onclick = () => poser();
            rendreGlissable(b, {
                cibles: '.py-trou, .py-mot--pose',
                deposer: (c) => {
                    const rang = Number(c.dataset.rang);
                    // Sur un morceau déjà posé : il repart au stock, le nouveau prend sa place.
                    if (this.phrase[rang] !== null) this.phrase[rang] = null;
                    this.phrase[rang] = this.banque[Number(b.dataset.mot)];
                    this.peindrePhrase();
                },
                actif: () => !this.isDemo,
                marquerGlissement: (v) => { this.vientDeGlisser = v; }
            });
        });

        // UN MORCEAU POSÉ SE REPREND : au clic, ou en le glissant dans le vide.
        zone.querySelectorAll('.py-mot--pose').forEach(b => {
            b.onclick = () => { if (!this.isDemo && !this.vientDeGlisser) this.reprendreMot(Number(b.dataset.rang)); };
            rendreGlissable(b, {
                cibles: '.py-trou',
                deposer: (c) => {
                    const de = Number(b.dataset.rang), vers = Number(c.dataset.rang);
                    const mot = this.phrase[de];
                    this.phrase[de] = null;
                    this.phrase[vers] = mot;
                    this.peindrePhrase();
                },
                retirer: () => this.reprendreMot(Number(b.dataset.rang)),
                zoneRetour: banque,
                actif: () => !this.isDemo,
                marquerGlissement: (v) => { this.vientDeGlisser = v; }
            });
        });
    }

    validerPhrase() {
        if (this.phrase.includes(null)) { this.note('Pose tous les morceaux d\'abord.'); return; }
        const bilan = verifierPhrase(this.phrase);
        if (bilan.juste) {
            this.note('✅ C\'est la phrase du cours, mot pour mot. C\'est elle qu\'on écrira à la ligne « Or ».', 'ok');
            this.gagner('La phrase du théorème', 'phrase juste', 10);
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1700);
            return;
        }
        const el = this.zoneEl.querySelectorAll('.py-mot--pose')[bilan.premierFaux];
        if (el) { el.classList.add('py-mot--faux'); setTimeout(() => el.classList.remove('py-mot--faux'), 900); }
        this.note(`❌ Relis à partir du morceau ${bilan.premierFaux + 1} : jusqu'ici tout était juste.`, 'ko');
        this.perdre('La phrase du théorème', this.phrase.join(' '), THEOREME.enonce,
            'La phrase commence par la CONDITION (« Si un triangle est rectangle ») puis dit l\'égalité.');
    }

    // Niveau 3 : l'égalité pour CE triangle.
    monterEgalite() {
        this.trous = [null, null, null];
        this.choisi = null;
        this.zoneEl.innerHTML = `
            <p style="text-align:center">${direTriangle(this.t)}.</p>
            <div class="py-egalite" data-eg>
                <button type="button" class="py-trou" data-trou="0">?</button><span>² =</span>
                <button type="button" class="py-trou" data-trou="1">?</button><span>² +</span>
                <button type="button" class="py-trou" data-trou="2">?</button><span>²</span>
            </div>
            <div class="py-banque" data-banque>
                ${this.rng.shuffle([this.infos.hypo.nom, this.infos.cathetes[0].nom, this.infos.cathetes[1].nom])
                    .map(n => `<button type="button" class="py-mot" data-nom="${n}">${n}</button>`).join('')}
            </div>`;
        this.barreEl.innerHTML = `<button type="button" class="py-btn py-btn--valider" data-verif>Vérifier</button>`;
        this.barreEl.querySelector('[data-verif]').onclick = () => this.validerEgalite();

        this.peindreEgalite();
    }

    /** Repose l'égalité : chaque case porte son nom, chaque nom son état. */
    peindreEgalite() {
        const trous = [...this.zoneEl.querySelectorAll('[data-trou]')];
        const banque = this.zoneEl.querySelector('[data-banque]');
        trous.forEach((tr, i) => {
            tr.textContent = this.trous[i] === null ? '?' : this.trous[i];
            tr.classList.toggle('py-trou--plein', this.trous[i] !== null);
        });
        banque.querySelectorAll('[data-nom]').forEach(b => {
            const pris = this.trous.includes(b.dataset.nom);
            b.disabled = pris;
            b.style.opacity = pris ? '.3' : '';
        });

        // Poser un nom : au clic (premier trou libre) ou au glissé (où l'on vise).
        const poser = (nom, i) => {
            if (this.isDemo) return;
            const libre = i !== undefined ? i : this.trous.indexOf(null);
            if (libre === -1) return;
            // Un nom ne sert qu'une fois : s'il était ailleurs, il déménage.
            const ancien = this.trous.indexOf(nom);
            if (ancien !== -1) this.trous[ancien] = null;
            this.trous[libre] = nom;
            this.peindreEgalite();
        };
        banque.querySelectorAll('[data-nom]').forEach(b => {
            b.onclick = () => { if (!this.vientDeGlisser && !b.disabled) poser(b.dataset.nom); };
            rendreGlissable(b, {
                cibles: '[data-trou]',
                deposer: (c) => { if (!b.disabled) poser(b.dataset.nom, Number(c.dataset.trou)); },
                actif: () => !this.isDemo,
                marquerGlissement: (v) => { this.vientDeGlisser = v; }
            });
        });
        // UNE CASE REMPLIE SE VIDE : au clic, ou en la glissant hors des cases.
        trous.forEach((tr, i) => {
            tr.onclick = () => {
                if (this.isDemo || this.vientDeGlisser || this.trous[i] === null) return;
                this.trous[i] = null;
                this.peindreEgalite();
            };
            rendreGlissable(tr, {
                cibles: '[data-trou]',
                deposer: (c) => {
                    const vers = Number(c.dataset.trou);
                    if (this.trous[i] === null || vers === i) return;
                    const nom = this.trous[i];
                    this.trous[i] = this.trous[vers];    // échange : deux cases pleines permutent
                    this.trous[vers] = nom;
                    this.peindreEgalite();
                },
                retirer: () => {
                    if (this.trous[i] === null) return;
                    this.trous[i] = null;
                    this.peindreEgalite();
                },
                zoneRetour: banque,
                actif: () => !this.isDemo && this.trous[i] !== null,
                marquerGlissement: (v) => { this.vientDeGlisser = v; }
            });
        });
    }

    validerEgalite() {
        if (this.trous.includes(null)) { this.note('Complète les trois cases d\'abord.'); return; }
        const bilan = verifierEgalite(this.t, this.trous[0], this.trous[1], this.trous[2]);
        if (bilan.juste) {
            this.note(`✅ ${bilan.message} — le carré seul est celui de l'hypoténuse.`, 'ok');
            this.gagner(`Égalité de Pythagore dans ${this.t.nom}`, bilan.message, 12);
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1700);
            return;
        }
        this.note('❌ ' + bilan.message, 'ko');
        this.perdre(`Égalité de Pythagore dans ${this.t.nom}`,
            `${this.trous[0]}² = ${this.trous[1]}² + ${this.trous[2]}²`, egaliteDe(this.t).texte, bilan.message);
    }

    // Niveaux 4, 5, 6 : le calcul, ligne à ligne.
    monterCalcul() {
        this.calc = etapesCalcul(this.t, this.chercher);
        const { hypo, cathetes } = this.infos;
        const donnees = this.calc.cherche === hypo.nom
            ? `${cathetes[0].nom} = ${cathetes[0].longueur} cm et ${cathetes[1].nom} = ${cathetes[1].longueur} cm`
            : `${hypo.nom} = ${hypo.longueur} cm et `
                + `${cathetes.find(x => x.nom !== this.calc.cherche).nom} = ${cathetes.find(x => x.nom !== this.calc.cherche).longueur} cm`;
        // Au niveau 6 s'ajoutent les deux premières lignes de la rédaction :
        // elles sont données à REMETTRE, pas à taper — taper une propriété
        // entière au clavier n'apprend que la patience.
        const redaction = this.niveau.id === 6 ? `
            <p style="font-size:.86rem"><b>Je sais que</b> ${minuscule(direTriangle(this.t))}, avec ${donnees}.<br>
            <b>Or</b> ${THEOREME.enonce}<br><b>Donc :</b></p>` : `
            <p style="text-align:center">${direTriangle(this.t)}, avec ${donnees}.<br>
            Calcule <b>${this.calc.cherche}</b>.</p>`;

        this.zoneEl.innerHTML = redaction + `
            <div class="py-calc">
                <div class="py-calc-ligne">${echapper(this.calc.lignes[0].texte)}</div>
                <div class="py-calc-ligne">${echapper(this.calc.lignes[1].texte.replace(/ = $/, ''))} =
                    <input class="py-saisie" data-ligne="1" type="number" inputmode="numeric" aria-label="le carré"></div>
                <div class="py-calc-ligne" data-l2 style="opacity:.35">${echapper(this.calc.lignes[2].texte.replace(/ = $/, ''))} =
                    <input class="py-saisie" data-ligne="2" type="number" inputmode="numeric" disabled aria-label="la longueur"> cm</div>
            </div>`;
        this.barreEl.innerHTML = `<button type="button" class="py-btn py-btn--valider" data-verif>Vérifier</button>`;
        this.barreEl.querySelector('[data-verif]').onclick = () => this.validerCalcul();
        this.zoneEl.querySelector('[data-ligne="1"]').focus();
    }

    validerCalcul() {
        const l1 = this.zoneEl.querySelector('[data-ligne="1"]');
        const l2 = this.zoneEl.querySelector('[data-ligne="2"]');
        const etape2 = !l2.disabled;
        const champ = etape2 ? l2 : l1;
        const attendu = etape2 ? this.calc.lignes[2].attendu : this.calc.lignes[1].attendu;
        const donne = Number(champ.value);
        if (champ.value === '') { this.note('Écris ta réponse d\'abord.'); return; }
        if (donne === attendu) {
            champ.classList.remove('py-saisie--ko');
            champ.classList.add('py-saisie--ok');
            champ.disabled = true;
            if (!etape2) {
                const suite = this.zoneEl.querySelector('[data-l2]');
                suite.style.opacity = '1';
                l2.disabled = false;
                l2.focus();
                this.note(`Bien : ${this.calc.cherche}² = ${attendu}. Reste à revenir à la longueur — la racine.`, 'ok');
                return;
            }
            this.note(`✅ ${this.calc.cherche} = ${attendu} cm. Le carré, puis la racine : c'est toute la méthode.`, 'ok');
            this.gagner(`Pythagore : calculer ${this.calc.cherche}`, `${attendu} cm`, this.niveau.id === 6 ? 20 : 15);
            setTimeout(() => { if (this.isRunning) this.poser(); }, 1900);
            return;
        }
        champ.classList.add('py-saisie--ko');
        setTimeout(() => champ.classList.remove('py-saisie--ko'), 900);
        const conseil = etape2
            ? `Cherche le nombre qui, multiplié par lui-même, donne ${this.calc.lignes[1].attendu}.`
            : (this.calc.cherche === this.infos.hypo.nom
                ? 'Pour l\'hypoténuse, on ADDITIONNE les deux carrés.'
                : 'Pour un côté de l\'angle droit, on SOUSTRAIT : le carré de l\'hypoténuse MOINS le carré connu.');
        this.note('❌ ' + conseil, 'ko');
        this.perdre(`Pythagore : calculer ${this.calc.cherche}`, String(donne), String(attendu), conseil);
    }

    // --- Apprentissage --------------------------------------------------------

    gagner(question, reponse, points) {
        this.reussis++;
        this.onCorrectAnswer(null, SKILL, {
            questionText: question, expected: reponse, given: reponse, points
        });
    }

    perdre(question, donne, attendu, message) {
        this.onWrongAnswer(null, {
            concept: SKILL, questionText: question, input: donne, expected: attendu,
            customMessage: message
        });
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'py-note' + (ton ? ` py-note--${ton}` : '');
    }

    // --- La démonstration -----------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.t) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        // Quel que soit le niveau, le robot commence par LE geste fondateur :
        // trouver l'angle droit, puis le côté d'en face.
        const carre = this.figureEl.querySelector('.py-angle');
        cur.say(`D'abord l'angle droit : il est en ${this.infos.sommetDroit}, marqué par le petit carré.`, carre || this.figureEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        const hypoEl = this.figureEl.querySelector(`.py-cote[data-cote="${this.infos.hypo.nom}"]`);
        if (hypoEl) hypoEl.classList.add('py-cote--hypo', 'py-cote--montre');
        cur.say(`En face de lui, le côté [${this.infos.hypo.nom}] : c'est l'HYPOTÉNUSE, toujours la plus longue. `
            + `Tout le théorème parle d'elle.`, hypoEl || this.figureEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        const e = egaliteDe(this.t);
        cur.say(`L'égalité s'écrit alors sans réfléchir : ${e.texte}. Le carré SEUL, c'est elle ; `
            + `les deux autres s'additionnent.`, this.zoneEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (this.niveau.id >= 4 && this.calc) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say(`Avec les nombres : ${this.calc.lignes[1].texte}${this.calc.lignes[1].attendu}. `
                + `Puis on REVIENT À LA LONGUEUR : ${this.calc.lignes[2].texte}${this.calc.resultat} cm. `
                + `La racine carrée est la dernière marche, ne l'oublie jamais.`, this.zoneEl);
            if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Toujours ce chemin : l\'angle droit, l\'hypoténuse d\'en face, l\'égalité, et seulement '
            + 'ensuite les nombres.', this.consigneEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

/* « Le triangle ABC » devient « le triangle ABC » : seul l'article plie. */
const minuscule = (t) => String(t).replace(/^Le/, 'le');

const echapper = (t) => String(t ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function enginePythagoreTheoreme(container, isDemo, params) {
    const jeu = new Pythagore(container, isDemo, params);
    jeu.start();
    return jeu;
}
