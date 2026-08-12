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
        this.motsDeja = 0;
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
                /* Le nom d'une droite doit rester lisible APRÈS réduction : la
                   figure fait 380 px sur un ordinateur et 210 sur un
                   téléphone, soit un texte presque deux fois plus petit. On
                   l'écrit donc gros dans le repère du viewBox, avec un
                   liseré blanc qui le décolle des traits qu'il croise. */
                .rd-nom {
                    font-size: 24px; font-weight: 800;
                    paint-order: stroke; stroke: var(--bg-panel); stroke-width: 4px;
                    stroke-linejoin: round;
                }
                .rd-angle { stroke: #b45309; stroke-width: 2.2; fill: none; opacity: 0; transition: opacity .35s; }
                .rd-angle--vu { opacity: 1; }
                /* L'angle droit ne se contente pas d'apparaître : il se signale.
                   Un fondu de 0 à 1 sur un petit carré de treize pixels passait
                   complètement inaperçu — le moment le plus important de
                   l'exercice était le moins visible. */
                .rd-angle--pop { animation: rd-pop .8s ease-out 3; }
                @keyframes rd-pop {
                    0%, 100% { stroke-width: 2.2; }
                    45% { stroke-width: 8; filter: drop-shadow(0 0 7px rgba(180,83,9,.95)); }
                }
                /* Le clignotement des parallèles, en NET. La version discrète
                   (trait à peine épaissi) ne se remarquait pas sur un
                   téléphone. */
                .rd-clignote { animation: rd-cli .62s ease-in-out 5; }
                @keyframes rd-cli {
                    0%, 100% { stroke-width: 2.6; }
                    50% { stroke-width: 9; filter: drop-shadow(0 0 8px rgba(37,99,235,.95)); }
                }
                /* Les mots qui viennent d'apparaître dans la propriété. */
                .rd-neuf { animation: rd-neuf .62s ease-in-out 5; border-radius: 5px; }
                @keyframes rd-neuf {
                    0%, 100% { background: transparent; }
                    50% { background: color-mix(in srgb, var(--primary) 34%, transparent); }
                }

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
                /* GLISSER-DÉPOSER. « touch-action: none » sur ce qui se glisse,
                   et rien d'autre : le reste de la page doit continuer à
                   défiler normalement au doigt. */
                .rd-etiquette, .rd-groupe { touch-action: none; }
                /* LE FANTÔME PASSE AU-DESSUS DE TOUT.
                   Il vit sur le <body>, alors que l'exercice s'affiche dans
                   #game-layer, qui est en z-index 10000 : à 9999 le fantôme
                   glissait DERRIÈRE l'exercice, invisible. On ne pouvait pas
                   voir ce qu'on déplaçait — et un glisser-déposer dont on ne
                   voit rien bouger passe pour cassé. */
                .rd-fantome {
                    position: fixed; z-index: 2147483000; pointer-events: none;
                    transform: translate(-50%, -50%) scale(1.06);
                    opacity: .95; box-shadow: var(--shadow-md);
                    border-color: var(--primary); color: var(--primary);
                }
                .rd-source { opacity: .28; }
                .rd-survol {
                    background: color-mix(in srgb, var(--primary) 22%, transparent);
                    border-color: var(--primary); border-style: solid;
                }
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
        // Le cadre est plus large que le tracé : les noms de droites se posent
        // au BOUT des traits, et grossis pour le téléphone ils sortaient de la
        // figure — « (d₃) » se lisait « (d ». La marge leur appartient.
        const W = 360, H = 250;
        const a = f.inclinaison * Math.PI / 180;
        const cx = W / 2, cy = H / 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        const nx = -dy, ny = dx;              // la normale : direction de la perpendiculaire
        const e = f.ecart;                    // demi-écart entre les parallèles
        const L = 128;

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

        // Le nom se pose À CÔTÉ de la droite, décalé le long de sa normale, et
        // RAMENÉ DANS LE CADRE : une étiquette à moitié coupée ne nomme rien.
        // Un demi-cadratin par caractère est une estimation généreuse de la
        // largeur, qui suffit à décider du bord dont il faut s'écarter.
        // Chaque parallèle porte son nom au bout LE PLUS LOIN du croisement :
        // du côté proche, l'étiquette se serait posée sur l'angle droit que la
        // propriété fait justement apparaître.
        const loin = f.ou > 50 ? -1 : 1;
        const bout = (d) => loin > 0
            ? { x: d.x2 - 26 * dx, y: d.y2 - 26 * dy }
            : { x: d.x1 + 26 * dx, y: d.y1 + 26 * dy };

        const MARGE = 6;
        const nom = (x, y, texte, couleur, sens) => {
            const etiquette = `(${texte})`;
            const demi = etiquette.length * 6.5;
            const px = Math.min(W - MARGE - demi, Math.max(MARGE + demi, x + nx * 23 * sens));
            const py = Math.min(H - MARGE, Math.max(MARGE + 16, y + ny * 23 * sens + 5));
            return `<text class="rd-nom" x="${px}" y="${py}" fill="${couleur}"
                          text-anchor="middle">${etiquette}</text>`;
        };

        // Le tracé part du côté de la PREMIÈRE parallèle et descend vers la
        // seconde : c'est l'ordre de la phrase (« perpendiculaire à l'une…
        // à l'autre »), et il faut qu'il soit celui du geste.
        // Longueur réelle du segment, et fraction parcourue au moment où il
        // atteint la seconde parallèle : c'est là que l'angle droit apparaît.
        this.perpLong = 2 * (e + 34);
        this.perpFraction = (34 + 2 * e) / this.perpLong;
        // Où le trait marque une pause : entre les deux parallèles. Il a coupé
        // « l'une », il n'a pas encore atteint « l'autre » — exactement là où
        // en est la phrase à ce moment-là.
        this.perpMilieu = (34 + e) / this.perpLong;

        this.figureEl.innerHTML = `
            <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Deux droites parallèles et une perpendiculaire">
                <line class="rd-para" data-para="1" x1="${p1.x1}" y1="${p1.y1}" x2="${p1.x2}" y2="${p1.y2}" />
                <line class="rd-para" data-para="2" x1="${p2.x1}" y1="${p2.y1}" x2="${p2.x2}" y2="${p2.y2}" />
                <line class="rd-perp" data-perp x1="${perp.x1}" y1="${perp.y1}" x2="${perp.x2}" y2="${perp.y2}"
                      style="stroke-dasharray:${this.perpLong};stroke-dashoffset:${this.perpLong}" />
                <path class="rd-angle rd-angle--vu" d="${carre1}" />
                <path class="rd-angle" data-angle d="${carre}" />
                ${nom(bout(p1).x, bout(p1).y, f.noms.p1, '#2563eb', -1)}
                ${nom(bout(p2).x, bout(p2).y, f.noms.p2, '#2563eb', 1)}
                ${nom(perp.x2, perp.y2 + 12, f.noms.perp, '#b45309', 0)}
            </svg>`;
        // LA PERPENDICULAIRE EST UNE DONNÉE, pas une conclusion : elle est là
        // dès le premier écran. Cachée, elle laissait sur la figure un angle
        // droit et une étiquette « (d₃) » qui ne désignaient rien — l'élève
        // cherchait une droite absente. Ce qui reste caché jusqu'au bout, et
        // qui est le vrai enjeu de l'exercice, c'est le SECOND angle droit :
        // celui que la propriété fait apparaître.
        this.montrerPerpendiculaire();
    }

    /** La perpendiculaire, posée d'un coup — pour les temps où elle est un acquis. */
    montrerPerpendiculaire() {
        const l = this.figureEl.querySelector('[data-perp]');
        if (!l) return;
        l.style.transition = 'none';
        l.style.strokeDashoffset = '0';
    }

    /**
     * LA PERPENDICULAIRE SE RETRACE, du début, à vitesse constante.
     *
     * Et l'angle droit n'apparaît pas à la fin de l'animation : il apparaît à
     * l'instant précis où le trait ATTEINT la seconde parallèle. C'est cette
     * coïncidence qui fait la démonstration — le trait touche, l'angle naît.
     * Un angle qui surgirait avant, ou une seconde après, ne dirait rien.
     */
    tracerPerpendiculaire({ de = 0, a = 1, duree = 1700, angleEnArrivant = false } = {}) {
        const l = this.figureEl.querySelector('[data-perp]');
        if (!l) return;
        clearTimeout(this.timerAngle);
        if (de === 0) this.cacherAngleDroit();
        l.style.transition = 'none';
        l.style.strokeDashoffset = this.perpLong * (1 - de);
        void l.getBoundingClientRect();                 // on force le retour au départ
        // `linear` et pas `ease` : sans vitesse constante, la fraction de
        // longueur ne correspondrait plus à la fraction de temps, et l'angle
        // apparaîtrait à côté du trait au lieu de sous lui.
        l.style.transition = `stroke-dashoffset ${duree}ms linear`;
        l.style.strokeDashoffset = this.perpLong * (1 - a);
        if (angleEnArrivant && this.perpFraction > de && this.perpFraction <= a) {
            this.timerAngle = setTimeout(
                () => { if (this.isRunning) this.montrerAngleDroit(); },
                Math.round(duree * (this.perpFraction - de) / (a - de)));
        }
    }

    /** La perpendiculaire n'est pas encore là : la phrase n'en a pas parlé. */
    cacherPerpendiculaire() {
        const l = this.figureEl.querySelector('[data-perp]');
        if (!l) return;
        clearTimeout(this.timerAngle);
        l.style.transition = 'none';
        l.style.strokeDashoffset = this.perpLong;
        this.cacherAngleDroit();
    }

    cacherAngleDroit() {
        this.figureEl.querySelector('[data-angle]')?.classList.remove('rd-angle--vu', 'rd-angle--pop');
    }

    clignoterParalleles() {
        this.figureEl.querySelectorAll('[data-para]').forEach(l => {
            l.classList.remove('rd-clignote');
            void l.getBoundingClientRect();
            l.classList.add('rd-clignote');
        });
    }

    montrerAngleDroit(pop = true) {
        const a = this.figureEl.querySelector('[data-angle]');
        if (!a) return;
        a.classList.remove('rd-angle--pop');
        void a.getBoundingClientRect();
        a.classList.add('rd-angle--vu');
        if (pop) a.classList.add('rd-angle--pop');
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
            // Glisser un morceau dans une fente précise : c'est le geste qu'on
            // fait naturellement quand on veut CORRIGER l'ordre, plutôt que de
            // tout vider pour recommencer.
            this.glisser(el, '[data-fente]', (cible) => {
                const i = Number(el.dataset.groupe);
                const g = this.banque[i];
                if (this.phrase.includes(g)) return;
                const f = Number(cible.dataset.fente);
                this.phrase[f] = g;
                this.choisi = null;
                this.peindrePhrase();
                this.controlerPhrase();
            });
            el.onclick = () => {
                if (this.vientDeGlisser) return;
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
                if (this.vientDeGlisser) return;
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
        // On repart de la figure NUE : seules les deux parallèles. La
        // perpendiculaire va se retracer sous les yeux, et c'est ce tracé qui
        // fait la démonstration.
        this.motsRevele = 0;
        this.motsDeja = 0;
        this.cacherPerpendiculaire();
        this.majOr();
        this.jouerMiseEnScene(0);
    }

    majOr() {
        // Les mots qui viennent d'apparaître clignotent : sans ça, la phrase
        // s'allonge et on ne sait pas quel morceau la figure est en train
        // d'illustrer.
        const vus = PROPRIETE.groupes.slice(0, this.motsRevele)
            .map((mot, i) => i >= this.motsDeja ? `<span class="rd-neuf">${mot}</span>` : mot)
            .join(' ');
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
        this.motsDeja = this.motsRevele;
        this.motsRevele = s.jusqu_a;
        this.majOr();
        this.note(s.dit);
        if (s.montre === 'paralleles') this.clignoterParalleles();
        // Le trait part du haut et s'arrête ENTRE les deux parallèles : il a
        // coupé « l'une », pas encore « l'autre ».
        if (s.montre === 'perpendiculaire') {
            this.tracerPerpendiculaire({ de: 0, a: this.perpMilieu, duree: 1700 });
        }
        // Puis il reprend sa route, et l'angle droit naît à la seconde
        // parallèle — au moment où le trait la touche, pas avant.
        if (s.montre === 'conclusion') {
            this.tracerPerpendiculaire({ de: this.perpMilieu, a: 1, duree: 1600, angleEnArrivant: true });
        }
        // Lentement : c'est le seul moment où l'on voit une phrase de cours
        // DÉSIGNER quelque chose, et il ne se rejoue pas tout seul.
        this.timerId = setTimeout(() => { if (this.isRunning) this.jouerMiseEnScene(i + 1); }, 3400);
    }

    /** Temps 4 : la conclusion. */
    peindreDonc() {
        // Sans clignotement ici : cette méthode est rappelée à chaque étiquette
        // posée, et l'angle se remettrait à clignoter à chaque clic.
        this.montrerAngleDroit(false);
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
                if (this.vientDeGlisser) return;
                this.choisi = this.choisi === el.dataset.etiq ? null : el.dataset.etiq;
                this.peindreEtiquettes();
            };
            this.glisser(el, '[data-trou]', (cible) => {
                this.trous[cible.dataset.trou] = el.dataset.etiq;
                this.choisi = null;
                this.peindre();
                this.apresTrou?.();
            });
        });
    }

    brancherTrous(apres) {
        this.apresTrou = apres;
        this.texteEl.querySelectorAll('[data-trou]').forEach(el => {
            el.onclick = () => {
                if (this.vientDeGlisser) return;
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

    // --- Glisser-déposer ------------------------------------------------------

    /**
     * RENDRE UN ÉLÉMENT GLISSABLE, à la souris ET au doigt.
     *
     * L'appui simple continue de marcher — c'est le geste le plus sûr, et il
     * reste le seul au clavier. Mais devant une étiquette et un trou, on essaie
     * de glisser : ne rien obtenir donne l'impression que l'écran est cassé.
     *
     * Le tactile passe par les événements TOUCH bruts, pas par les événements
     * pointeur. Safari émet un `pointercancel` dès qu'il décide qu'un geste est
     * un défilement, et cette page défile : le glissement mourait à mi-chemin.
     * `touch-action: none` sur l'étiquette ne suffit pas — c'est la leçon déjà
     * apprise sur la mise en page des fiches.
     */
    glisser(el, selecteurCible, deposer) {
        if (this.isDemo) return;
        let fantome = null, cible = null;

        const viser = (x, y) => {
            const sous = document.elementFromPoint(x, y);
            const c = sous && sous.closest(selecteurCible);
            if (c === cible) return;
            cible?.classList.remove('rd-survol');
            cible = c;
            cible?.classList.add('rd-survol');
        };

        const bouger = (x, y) => {
            if (!fantome) {
                const r = el.getBoundingClientRect();
                fantome = el.cloneNode(true);
                fantome.classList.add('rd-fantome');
                fantome.style.width = `${r.width}px`;
                document.body.appendChild(fantome);
                el.classList.add('rd-source');
            }
            fantome.style.left = `${x}px`;
            fantome.style.top = `${y}px`;
            viser(x, y);
        };

        const lacher = () => {
            el.classList.remove('rd-source');
            fantome?.remove();
            fantome = null;
            const c = cible;
            cible?.classList.remove('rd-survol');
            cible = null;
            // Le clic qui suit un glissement ne doit pas re-sélectionner
            // l'étiquette qu'on vient de déposer.
            this.vientDeGlisser = true;
            setTimeout(() => { this.vientDeGlisser = false; }, 350);
            if (c) deposer(c);
        };

        el.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') return;          // le doigt : plus bas
            e.preventDefault();
            const move = (m) => bouger(m.clientX, m.clientY);
            const up = () => {
                document.removeEventListener('pointermove', move);
                document.removeEventListener('pointerup', up);
                if (fantome) lacher();
            };
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
        });

        el.addEventListener('touchstart', (e) => {
            const d = e.touches[0];
            const depart = { x: d.clientX, y: d.clientY };
            let parti = false;
            const move = (m) => {
                const p = m.touches[0];
                // Huit pixels de marge : en dessous, c'est un appui qui tremble,
                // pas un glissement — et l'appui a déjà son propre effet.
                if (!parti && Math.hypot(p.clientX - depart.x, p.clientY - depart.y) < 8) return;
                parti = true;
                m.preventDefault();                          // on prend la main sur le défilement
                bouger(p.clientX, p.clientY);
            };
            const fin = () => {
                document.removeEventListener('touchmove', move);
                document.removeEventListener('touchend', fin);
                document.removeEventListener('touchcancel', fin);
                if (parti) lacher();
            };
            document.addEventListener('touchmove', move, { passive: false });
            document.addEventListener('touchend', fin);
            document.addEventListener('touchcancel', fin);
        }, { passive: true });
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
        this.motsDeja = 0;
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
        clearTimeout(this.timerAngle);
        // Un fantôme de glissement vit hors du conteneur du jeu : il ne
        // disparaîtrait pas tout seul.
        document.querySelectorAll('.rd-fantome').forEach(f => f.remove());
        super.destroy();
    }
}

export function engineRedaction(container, isDemo, params) {
    const jeu = new Redaction(container, isDemo, params);
    jeu.start();
    return jeu;
}
