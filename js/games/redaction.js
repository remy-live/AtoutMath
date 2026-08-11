// RÉDIGER : PARALLÈLES ET PERPENDICULAIRES.
//
// Quatre temps, et le troisième est celui qui n'existe nulle part ailleurs :
// la propriété s'écrit MOT À MOT pendant que la figure montre ce que chaque
// morceau désigne. « Si deux droites sont parallèles » → les deux parallèles
// clignotent. « toute perpendiculaire à l'une » → la perpendiculaire se trace.
// « est perpendiculaire à l'autre » → l'angle droit apparaît sur la seconde.
//
// C'est le seul moment où un élève voit qu'une phrase de cours DÉSIGNE des
// objets du dessin, au lieu d'être une formule à réciter. Le reste de
// l'exercice — remettre la phrase dans l'ordre, remplir « Je sais que », puis
// « Donc » — n'est là que pour qu'il ait quelque chose à quoi rattacher ce
// moment-là.
//
// La matière (phrase, figure, relations, corrections) vit dans core/redaction.js.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    PROPRIETE, ETAPES, tirerFigure, donnees, conclusion, etiquettes,
    groupesMelanges, verifierPhrase, verifierDonnee, verifierConclusion
} from '../core/redaction.js';

const SKILL = 'geo.para-perp';

class Redaction extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'redaction');
        this.rng = makeRng(this.params.seed);
        this.figure = tirerFigure(this.rng);
        this.etape = 0;
        this.phrase = new Array(PROPRIETE.groupes.length).fill(null);
        this.banque = groupesMelanges(this.rng);
        this.trous = { d0g: null, d0d: null, d1g: null, d1d: null, cg: null, cd: null };
        this.choisi = null;
        this.motsRevele = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .rd-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    height: 100%; width: 100%; color: var(--text-main);
                    user-select: none; -webkit-user-select: none; overflow-y: auto;
                }
                .rd-fil { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .rd-fil-etape {
                    font-size: .74rem; font-weight: 700; padding: 3px 10px; border-radius: 999px;
                    background: var(--bg-hover); color: var(--text-muted);
                }
                .rd-fil-etape--active { background: var(--primary); color: #fff; }
                .rd-fil-etape--faite { background: color-mix(in srgb, var(--success) 25%, transparent); color: var(--success); }
                .rd-consigne { text-align: center; font-weight: 700; max-width: 640px;
                    font-size: clamp(13px, 3cqw, 17px); line-height: 1.3; }

                .rd-corps { display: flex; gap: 16px; align-items: flex-start;
                    justify-content: center; width: 100%; flex-wrap: wrap; }
                .rd-figure { flex: none; }
                .rd-figure svg { display: block; width: clamp(210px, 42cqw, 380px); height: auto; }
                /* La convention de lecture : les parallèles sont en POINTILLÉS.
                   Sans elle, rien sur un dessin ne dit que deux droites le sont —
                   et l'élève « voit » un parallélisme qu'il devrait déduire. */
                .rd-para { stroke: #2563eb; stroke-width: 2.6; stroke-dasharray: 9 6; fill: none; }
                .rd-perp { stroke: #b45309; stroke-width: 2.6; fill: none; }
                .rd-perp--trace { stroke-dasharray: 400; stroke-dashoffset: 400; }
                .rd-perp--vue { transition: stroke-dashoffset 1.5s ease-out; stroke-dashoffset: 0; }
                .rd-nom { font-size: 15px; font-weight: 800; }
                .rd-angle { stroke: #b45309; stroke-width: 2.2; fill: none; opacity: 0; transition: opacity .6s; }
                .rd-angle--vu { opacity: 1; }
                .rd-clignote { animation: rd-cli 1s ease-in-out 3; }
                @keyframes rd-cli { 50% { stroke-width: 6; stroke-opacity: .45; } }

                .rd-texte { flex: 1 1 300px; max-width: 460px; min-width: 260px;
                    display: flex; flex-direction: column; gap: 10px; }
                .rd-ligne {
                    background: var(--bg-panel); border: 1px solid var(--border);
                    border-radius: 12px; padding: 9px 13px;
                    font-size: clamp(13px, 2.9cqw, 16px); line-height: 1.55;
                }
                .rd-ligne--vide { opacity: .35; }
                .rd-mot { font-weight: 800; color: var(--primary); }
                .rd-etiquette, .rd-groupe {
                    display: inline-block; padding: 5px 11px; border-radius: 9px;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    font-weight: 700; cursor: pointer; font-size: .95em;
                }
                .rd-etiquette--prise, .rd-groupe--pris { opacity: .3; cursor: default; }
                .rd-etiquette--choisi, .rd-groupe--choisi { border-color: var(--primary); color: var(--primary); }
                .rd-trou {
                    display: inline-block; min-width: 3.4em; padding: 2px 9px;
                    border-bottom: 2px dashed var(--primary); text-align: center;
                    font-weight: 800; cursor: pointer; color: var(--primary);
                }
                .rd-trou--vide::before { content: '?'; opacity: .5; }
                .rd-trou--juste { border-bottom-style: solid; border-color: var(--success); color: var(--success); }
                .rd-fente {
                    display: inline-block; min-width: 6em; min-height: 1.7em;
                    padding: 3px 9px; margin: 2px; border-radius: 8px;
                    border: 2px dashed var(--border); vertical-align: middle;
                    cursor: pointer; font-weight: 700;
                }
                .rd-fente--pleine { border-style: solid; border-color: var(--success); }
                .rd-banque { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; }
                .rd-note { min-height: 2.6em; text-align: center; max-width: 640px;
                    font-size: clamp(11px, 2.7cqw, 15px); line-height: 1.35; color: var(--text-muted); }
                .rd-note b { color: var(--text-main); }
                .rd-fin { display: inline-block; padding: 5px 13px; border-radius: 999px; font-weight: 700; }
                .rd-fin--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .rd-fin--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
                .rd-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 600;
                    font-size: 13px; padding: 6px 13px;
                }
                .rd-btn--primaire { background: var(--primary); color: #fff; border-color: var(--primary); }
            </style>
            <div class="rd-wrap">
                <div class="rd-fil" data-fil></div>
                <div class="rd-consigne" data-consigne></div>
                <div class="rd-corps">
                    <div class="rd-figure" data-figure></div>
                    <div class="rd-texte" data-texte></div>
                </div>
                <div class="rd-banque" data-banque></div>
                <p class="rd-note" data-note></p>
                <div><button type="button" class="rd-btn rd-btn--primaire" data-suite hidden>Continuer</button></div>
            </div>`;

        this.filEl = this.container.querySelector('[data-fil]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.figureEl = this.container.querySelector('[data-figure]');
        this.texteEl = this.container.querySelector('[data-texte]');
        this.banqueEl = this.container.querySelector('[data-banque]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.suiteEl = this.container.querySelector('[data-suite]');
        this.suiteEl.addEventListener('click', () => this.suivant());

        this.dessinerFigure();
        this.peindre();
    }

    startGameLoop() { /* Au rythme de la rédaction : rien à animer en continu. */ }

    // --- La figure ----------------------------------------------------------

    dessinerFigure() {
        const f = this.figure;
        const W = 300, H = 240;
        const a = f.inclinaison * Math.PI / 180;
        const cx = W / 2, cy = H / 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        const nx = -dy, ny = dx;              // la normale : direction de la perpendiculaire
        const e = f.ecart;                    // demi-écart entre les parallèles
        const L = 150;

        const droite = (ox, oy) => ({
            x1: cx + ox - dx * L, y1: cy + oy - dy * L,
            x2: cx + ox + dx * L, y2: cy + oy + dy * L
        });
        const p1 = droite(nx * -e, ny * -e);
        const p2 = droite(nx * e, ny * e);
        // La perpendiculaire coupe les deux, quelque part le long d'elles.
        const t = (f.ou - 50) / 100 * 2 * L;
        const px = cx + dx * t, py = cy + dy * t;
        const perp = { x1: px - nx * (e + 34), y1: py - ny * (e + 34), x2: px + nx * (e + 34), y2: py + ny * (e + 34) };

        // Le carré de l'angle droit, sur la SECONDE parallèle : c'est ce que la
        // propriété fait apparaître, et il reste caché jusque-là.
        const ix = px + nx * e, iy = py + ny * e;
        const c = 13;
        const carre = `M ${ix + dx * c} ${iy + dy * c} L ${ix + dx * c - nx * c} ${iy + dy * c - ny * c} L ${ix - nx * c} ${iy - ny * c}`;
        // Et celui de la donnée, sur la première : lui est visible dès le départ.
        const jx = px - nx * e, jy = py - ny * e;
        const carre1 = `M ${jx + dx * c} ${jy + dy * c} L ${jx + dx * c + nx * c} ${jy + dy * c + ny * c} L ${jx + nx * c} ${jy + ny * c}`;

        // Le nom se pose À CÔTÉ de la droite, décalé le long de sa normale :
        // posé dessus, il se lit mal et masque le trait au moment où l'élève
        // cherche justement à le suivre.
        const nom = (x, y, texte, couleur, sens) =>
            `<text class="rd-nom" x="${x + nx * 15 * sens}" y="${y + ny * 15 * sens + 5}" fill="${couleur}">(${texte})</text>`;

        this.figureEl.innerHTML = `
            <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Deux droites parallèles et une perpendiculaire">
                <line class="rd-para" data-para="1" x1="${p1.x1}" y1="${p1.y1}" x2="${p1.x2}" y2="${p1.y2}" />
                <line class="rd-para" data-para="2" x1="${p2.x1}" y1="${p2.y1}" x2="${p2.x2}" y2="${p2.y2}" />
                <line class="rd-perp rd-perp--trace" data-perp x1="${perp.x1}" y1="${perp.y1}" x2="${perp.x2}" y2="${perp.y2}" />
                <path class="rd-angle rd-angle--vu" d="${carre1}" />
                <path class="rd-angle" data-angle d="${carre}" />
                ${nom(p1.x2 - 30 * dx, p1.y2 - 30 * dy, f.noms.p1, '#2563eb', -1)}
                ${nom(p2.x2 - 30 * dx, p2.y2 - 30 * dy, f.noms.p2, '#2563eb', 1)}
                <text class="rd-nom" x="${perp.x2 + dx * 16}" y="${perp.y2 + dy * 16 + 5}" fill="#b45309">(${f.noms.perp})</text>
            </svg>`;
        // Au premier temps, la perpendiculaire n'est pas encore tracée : elle
        // apparaît quand la phrase en parle.
        if (this.etape >= 1) this.montrerPerpendiculaire();
    }

    montrerPerpendiculaire() {
        this.figureEl.querySelector('[data-perp]')?.classList.add('rd-perp--vue');
    }

    clignoterParalleles() {
        this.figureEl.querySelectorAll('[data-para]').forEach(l => {
            l.classList.remove('rd-clignote');
            void l.getBoundingClientRect();
            l.classList.add('rd-clignote');
        });
    }

    montrerAngleDroit() {
        this.figureEl.querySelector('[data-angle]')?.classList.add('rd-angle--vu');
    }

    // --- Les quatre temps ---------------------------------------------------

    peindre() {
        this.filEl.innerHTML = ETAPES.map((e, i) =>
            `<span class="rd-fil-etape ${i === this.etape ? 'rd-fil-etape--active' : i < this.etape ? 'rd-fil-etape--faite' : ''}">${e.titre}</span>`
        ).join('');
        this.consigneEl.textContent = ETAPES[this.etape].consigne;
        this.suiteEl.hidden = true;

        if (this.etape === 0) return this.peindrePhrase();
        if (this.etape === 1) return this.peindreDonnees();
        if (this.etape === 2) return this.peindreOr();
        return this.peindreDonc();
    }

    /** Temps 1 : remettre la propriété dans l'ordre. */
    peindrePhrase() {
        this.texteEl.innerHTML = `
            <div class="rd-ligne">${this.phrase.map((g, i) =>
            `<span class="rd-fente ${g ? 'rd-fente--pleine' : ''}" data-fente="${i}">${g || ''}</span>`).join(' ')}</div>`;
        this.banqueEl.innerHTML = this.banque.map((g, i) =>
            `<span class="rd-groupe ${this.phrase.includes(g) ? 'rd-groupe--pris' : ''}
                ${this.choisi === i ? 'rd-groupe--choisi' : ''}" data-groupe="${i}">${g}</span>`).join('');

        this.banqueEl.querySelectorAll('[data-groupe]').forEach(el => {
            el.onclick = () => {
                const i = Number(el.dataset.groupe);
                if (this.phrase.includes(this.banque[i])) return;
                this.choisi = this.choisi === i ? null : i;
                // On pose dans la première fente libre : le geste le plus
                // fréquent est « je continue la phrase », pas « je vise ».
                if (this.choisi !== null) {
                    const libre = this.phrase.findIndex(x => x === null);
                    if (libre >= 0) { this.phrase[libre] = this.banque[i]; this.choisi = null; }
                }
                this.peindrePhrase();
                this.controlerPhrase();
            };
        });
        this.texteEl.querySelectorAll('[data-fente]').forEach(el => {
            el.onclick = () => {
                const i = Number(el.dataset.fente);
                if (!this.phrase[i]) return;
                this.phrase[i] = null;
                this.peindrePhrase();
            };
        });
    }

    controlerPhrase() {
        if (this.phrase.some(g => g === null)) return;
        const r = verifierPhrase(this.phrase);
        if (r.juste) {
            this.note('✅ C\'est exactement la propriété du cours.', 'ok');
            this.onCorrectAnswer(null, SKILL, {
                points: 15, questionText: 'Reconstituer la propriété des parallèles et perpendiculaires',
                given: 'ordre juste', expected: 'ordre juste'
            });
            this.suiteEl.hidden = false;
        } else {
            this.note(`Pas tout à fait : c'est à partir du <b>${r.premierFaux + 1}<sup>e</sup> morceau</b> que ça se gâte. Relis à voix haute, la phrase doit s'entendre.`, 'ko');
            this.onWrongAnswer(null, {
                concept: SKILL, questionText: 'Ordre de la propriété',
                input: this.phrase.join(' '), expected: PROPRIETE.enonce,
                customMessage: PROPRIETE.enonce, silencieux: true
            });
        }
    }

    /** Temps 2 : lire la figure et remplir « Je sais que ». */
    peindreDonnees() {
        const d = donnees(this.figure);
        this.montrerPerpendiculaire();
        this.texteEl.innerHTML = `
            <div class="rd-ligne">
                <span class="rd-mot">Je sais que</span> :<br>
                (<span class="rd-trou ${this.trous.d0g ? '' : 'rd-trou--vide'}" data-trou="d0g">${this.trous.d0g || ''}</span>)
                ${d[0].relation}
                (<span class="rd-trou ${this.trous.d0d ? '' : 'rd-trou--vide'}" data-trou="d0d">${this.trous.d0d || ''}</span>)<br>
                (<span class="rd-trou ${this.trous.d1g ? '' : 'rd-trou--vide'}" data-trou="d1g">${this.trous.d1g || ''}</span>)
                ${d[1].relation}
                (<span class="rd-trou ${this.trous.d1d ? '' : 'rd-trou--vide'}" data-trou="d1d">${this.trous.d1d || ''}</span>)
            </div>`;
        this.peindreEtiquettes();
        this.brancherTrous(() => this.controlerDonnees());
    }

    controlerDonnees() {
        const t = this.trous;
        if (!t.d0g || !t.d0d || !t.d1g || !t.d1d) return;
        const a = verifierDonnee(this.figure, 0, t.d0g, t.d0d);
        const b = verifierDonnee(this.figure, 1, t.d1g, t.d1d);
        if (a.juste && b.juste) {
            this.note(`✅ ${a.message}, et ${b.message}.`, 'ok');
            this.onCorrectAnswer(null, SKILL, {
                points: 15, questionText: 'Lire les données sur la figure',
                given: 'données justes', expected: 'données justes'
            });
            this.suiteEl.hidden = false;
        } else {
            this.note((a.juste ? b.message : a.message), 'ko');
        }
    }

    /** Temps 3 : la propriété s'écrit pendant que la figure la montre. */
    peindreOr() {
        this.banqueEl.innerHTML = '';
        this.majOr();
        this.jouerMiseEnScene(0);
    }

    majOr() {
        const vus = PROPRIETE.groupes.slice(0, this.motsRevele).join(' ');
        this.texteEl.innerHTML = `
            <div class="rd-ligne"><span class="rd-mot">Je sais que</span> : ${this.resumeDonnees()}</div>
            <div class="rd-ligne ${this.motsRevele ? '' : 'rd-ligne--vide'}">
                <span class="rd-mot">Or</span> ${vus || '…'}
            </div>`;
    }

    resumeDonnees() {
        const d = donnees(this.figure);
        return `(${d[0].gauche}) ${d[0].relation} (${d[0].droite}) et (${d[1].gauche}) ${d[1].relation} (${d[1].droite}).`;
    }

    jouerMiseEnScene(i) {
        const scenes = PROPRIETE.mise_en_scene;
        if (i >= scenes.length) {
            this.note('La propriété désigne des objets du dessin : c\'est ce qui la rend utilisable.');
            this.suiteEl.hidden = false;
            return;
        }
        const s = scenes[i];
        this.motsRevele = s.jusqu_a;
        this.majOr();
        this.note(s.dit);
        if (s.montre === 'paralleles') this.clignoterParalleles();
        if (s.montre === 'perpendiculaire') this.montrerPerpendiculaire();
        if (s.montre === 'conclusion') this.montrerAngleDroit();
        // Lentement : c'est le seul moment où l'on voit une phrase de cours
        // DÉSIGNER quelque chose, et il ne se rejoue pas tout seul.
        this.timerId = setTimeout(() => { if (this.isRunning) this.jouerMiseEnScene(i + 1); }, 3400);
    }

    /** Temps 4 : la conclusion. */
    peindreDonc() {
        this.montrerAngleDroit();
        this.texteEl.innerHTML = `
            <div class="rd-ligne"><span class="rd-mot">Je sais que</span> : ${this.resumeDonnees()}</div>
            <div class="rd-ligne"><span class="rd-mot">Or</span> ${PROPRIETE.enonce}</div>
            <div class="rd-ligne">
                <span class="rd-mot">Donc</span>
                (<span class="rd-trou ${this.trous.cg ? '' : 'rd-trou--vide'}" data-trou="cg">${this.trous.cg || ''}</span>)
                ⊥
                (<span class="rd-trou ${this.trous.cd ? '' : 'rd-trou--vide'}" data-trou="cd">${this.trous.cd || ''}</span>)
            </div>`;
        this.peindreEtiquettes();
        this.brancherTrous(() => this.controlerConclusion());
    }

    controlerConclusion() {
        if (!this.trous.cg || !this.trous.cd) return;
        const r = verifierConclusion(this.figure, this.trous.cg, this.trous.cd);
        if (r.juste) {
            this.note(`🎉 ${r.message}. Le raisonnement est complet : données, propriété, conclusion.`, 'ok');
            this.onCorrectAnswer(null, SKILL, {
                points: 25, questionText: 'Conclure avec la propriété des parallèles et perpendiculaires',
                given: `(${this.trous.cg}) ⊥ (${this.trous.cd})`, expected: `(${conclusion(this.figure).gauche}) ⊥ (${conclusion(this.figure).droite})`
            });
            this.suiteEl.textContent = 'Une autre figure';
            this.suiteEl.hidden = false;
        } else {
            this.note(r.message, 'ko');
            this.onWrongAnswer(null, {
                concept: SKILL, questionText: 'Conclusion du raisonnement',
                input: `(${this.trous.cg}) ⊥ (${this.trous.cd})`,
                expected: `(${conclusion(this.figure).gauche}) ⊥ (${conclusion(this.figure).droite})`,
                customMessage: r.message, silencieux: true
            });
        }
    }

    // --- Les étiquettes de droites ------------------------------------------

    peindreEtiquettes() {
        const noms = etiquettes(this.figure);
        this.banqueEl.innerHTML = noms.map(n =>
            `<span class="rd-etiquette ${this.choisi === n ? 'rd-etiquette--choisi' : ''}" data-etiq="${n}">(${n})</span>`).join('');
        this.banqueEl.querySelectorAll('[data-etiq]').forEach(el => {
            el.onclick = () => {
                this.choisi = this.choisi === el.dataset.etiq ? null : el.dataset.etiq;
                this.peindreEtiquettes();
            };
        });
    }

    brancherTrous(apres) {
        this.texteEl.querySelectorAll('[data-trou]').forEach(el => {
            el.onclick = () => {
                const k = el.dataset.trou;
                // Un trou déjà rempli se vide au clic : se reprendre doit être
                // aussi simple que répondre.
                if (!this.choisi) { this.trous[k] = null; }
                else { this.trous[k] = this.choisi; this.choisi = null; }
                this.peindre();
                apres();
            };
        });
    }

    suivant() {
        if (this.etape >= ETAPES.length - 1) return this.nouvelleFigure();
        this.etape++;
        this.note('');
        this.peindre();
    }

    nouvelleFigure() {
        this.rng = makeRng();
        this.figure = tirerFigure(this.rng);
        this.etape = 1;                 // la phrase est acquise, on n'y revient pas
        this.trous = { d0g: null, d0d: null, d1g: null, d1d: null, cg: null, cd: null };
        this.choisi = null;
        this.motsRevele = 0;
        this.suiteEl.textContent = 'Continuer';
        this.dessinerFigure();
        this.note('');
        this.peindre();
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="rd-fin rd-fin--${ton}">${html}</span>` : html;
    }

    // --- Le robot -----------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('En géométrie, une justification a toujours trois lignes : JE SAIS QUE, OR, DONC. On va les écrire une par une.', this.container);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Temps 1 : la phrase, dans l'ordre.
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('D\'abord la propriété du cours. Je la remets dans l\'ordre : elle doit s\'entendre comme une phrase.', this.banqueEl);
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        for (const g of PROPRIETE.groupes) {
            const i = this.banque.indexOf(g);
            const el = this.banqueEl.querySelector(`[data-groupe="${i}"]`);
            if (el && !await cur.tap(el)) return fin();
            const libre = this.phrase.findIndex(x => x === null);
            if (libre >= 0) this.phrase[libre] = g;
            this.peindrePhrase();
        }
        cur.say(PROPRIETE.enonce, this.texteEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Temps 2 : les données.
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        this.etape = 1; this.peindre();
        const d = donnees(this.figure);
        cur.say(`Je lis la figure. Les droites en pointillés sont parallèles : ${d[0].dit}. Et l'angle droit dit que ${d[1].dit}.`, this.figureEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        this.trous = { ...this.trous, d0g: d[0].gauche, d0d: d[0].droite, d1g: d[1].gauche, d1d: d[1].droite };
        this.peindre();
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

        // Temps 3 : la mise en scène — c'est le cœur.
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        this.etape = 2; this.peindre();
        cur.say('Voilà le moment important : la propriété s\'écrit, et la figure montre de QUOI elle parle à chaque morceau.', this.texteEl);
        if (!await cur.pause(DEMO_SPEED.between * 2) || !this.isRunning) return fin();

        // Temps 4 : conclure.
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        this.etape = 3; this.peindre();
        const c = conclusion(this.figure);
        cur.say(`La propriété parle de « l'autre » parallèle : celle dont on n'a pas encore parlé. Donc (${c.gauche}) est perpendiculaire à (${c.droite}).`, this.texteEl);
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        this.trous.cg = c.gauche; this.trous.cd = c.droite;
        this.peindre();
        this.montrerAngleDroit();
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineRedaction(container, isDemo, params) {
    const jeu = new Redaction(container, isDemo, params);
    jeu.start();
    return jeu;
}
