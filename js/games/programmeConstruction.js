// LE PROGRAMME DE CONSTRUCTION — l'écran.
//
// Rémy : « j'aimerais bien un exercice où on a un tracé (points, segments,
// cercle) et il faut faire le programme de construction. »
//
// DEUX FIGURES CÔTE À CÔTE, ET C'EST TOUT LE DISPOSITIF. À gauche, celle qu'on
// doit obtenir ; à droite, celle que le programme de l'élève produit VRAIMENT,
// redessinée à chaque bloc posé. On ne dit pas « juste » ou « faux » à la fin :
// on montre, en continu, l'écart entre ce qu'il a écrit et ce qu'il visait.
// C'est ce qui distingue un programme d'un questionnaire — un programme, ça
// s'exécute, et l'on voit ce qu'il fait.
//
// LES POINTS DE DÉPART SONT DÉJÀ POSÉS DES DEUX CÔTÉS. Sans eux, la figure de
// l'élève serait juste et ne coïnciderait avec aucune autre ; avec eux, la
// comparaison est exacte et l'exercice devient « construis À PARTIR DE CECI »,
// qui est la vraie tâche.
//
// LE BLOC PORTE LA PHRASE ENTIÈRE, avec ses crochets et ses parenthèses. C'est
// la moitié de la leçon : [AB] le segment, (AB) la droite. On ne peut pas les
// effacer, on ne peut que remplir les trous — et l'on a donc lu la notation
// juste vingt fois avant la fin de l'heure.

import { BaseGame } from '../core/BaseGame.js';
import {
    MONDE, OPERATIONS, FAMILLES, ORDRE_FAMILLES,
    NIVEAUX, preparerNiveau, niveauxDisponibles, operationsDe,
    executer, comparer, cleObjet, nomObjet
} from '../core/programmeConstruction.js';

const COMPETENCE = 'geo.construction.programme';

const enAttribut = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * UNE DROITE N'A PAS DE BOUTS : on la coupe au cadre.
 *
 * Un `<line>` a besoin de deux points, et une droite n'en propose aucun de
 * naturel. On calcule donc où elle entre et sort du monde — sinon elle
 * s'arrêterait aux deux points qui l'ont définie, et se lirait comme un
 * segment. La confusion segment / droite est précisément ce que l'exercice
 * travaille : la dessiner de travers serait enseigner le contraire.
 */
function droiteAuCadre(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const ts = [];
    if (Math.abs(dx) > 1e-9) { ts.push((0 - a.x) / dx, (MONDE.w - a.x) / dx); }
    if (Math.abs(dy) > 1e-9) { ts.push((0 - a.y) / dy, (MONDE.h - a.y) / dy); }
    if (!ts.length) return null;
    const dedans = ts.filter(t => {
        const x = a.x + dx * t, y = a.y + dy * t;
        return x >= -0.01 && x <= MONDE.w + 0.01 && y >= -0.01 && y <= MONDE.h + 0.01;
    }).sort((u, v) => u - v);
    if (dedans.length < 2) return null;
    const t0 = dedans[0], t1 = dedans[dedans.length - 1];
    return [{ x: a.x + dx * t0, y: a.y + dy * t0 }, { x: a.x + dx * t1, y: a.y + dy * t1 }];
}

/** Le dessin d'une figure : les tracés, puis les points par-dessus. */
function figureSvg(objets, points, { classe = '', aides = [] } = {}) {
    const cles = new Set(aides.map(cleObjet));
    let out = '';
    (objets || []).forEach(o => {
        const aide = cles.has(cleObjet(o)) ? ' pc-trait--aide' : '';
        if (o.genre === 'cercle') {
            out += `<circle class="pc-trait${aide}" cx="${o.c.x.toFixed(3)}" cy="${o.c.y.toFixed(3)}"
                r="${o.r.toFixed(3)}" fill="none"/>`;
            return;
        }
        const bouts = o.genre === 'droite' ? droiteAuCadre(o.a, o.b) : [o.a, o.b];
        if (!bouts) return;
        out += `<line class="pc-trait${aide}" x1="${bouts[0].x.toFixed(3)}" y1="${bouts[0].y.toFixed(3)}"
            x2="${bouts[1].x.toFixed(3)}" y2="${bouts[1].y.toFixed(3)}"/>`;
    });
    Object.entries(points || {}).forEach(([nom, p]) => {
        out += `<circle class="pc-point" cx="${p.x.toFixed(3)}" cy="${p.y.toFixed(3)}" r="0.9"/>`;
        out += `<text class="pc-nom" x="${(p.x + 2).toFixed(3)}" y="${(p.y - 1.8).toFixed(3)}"
            >${enAttribut(nom)}</text>`;
    });
    return `<svg class="pc-svg ${classe}" viewBox="0 0 ${MONDE.w} ${MONDE.h}"
        preserveAspectRatio="xMidYMid meet">${out}</svg>`;
}

export class ProgrammeConstruction extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'programme-construction');
        const familles = Array.isArray(this.params.familles) && this.params.familles.length
            ? this.params.familles : ORDRE_FAMILLES;
        this.famillesActives = familles;
        // LES NIVEAUX SUIVENT LES RÉGLAGES. Rémy : « on peut avoir ce que l'on
        // veut mettre ». Décocher les cercles ne doit pas proposer un niveau
        // dont la solution en réclame — ce serait un exercice sans réponse.
        this.plan = niveauxDisponibles(familles);
        if (!this.plan.length) this.plan = niveauxDisponibles(ORDRE_FAMILLES);
        // On peut aussi entrer au milieu de l'échelle : c'est le réglage de
        // celui qui a déjà fait les premiers en classe.
        const depuis = Math.max(0, Math.min(NIVEAUX.length - 1, (this.params.depuis | 0)));
        const debut = this.plan.findIndex(i => i >= depuis);
        this.rang = debut < 0 ? 0 : debut;
        this.programme = [];
        this.fini = false;
    }

    get niveau() { return preparerNiveau(this.plan[this.rang]); }

    render() {
        this.container.innerHTML = `
            <style>
                .pc-wrap {
                    display: flex; flex-direction: column; gap: 8px; width: 100%; height: 100%;
                    padding: 8px 10px 10px; box-sizing: border-box; color: var(--text-main);
                    overflow-y: auto; min-height: 0; container-type: inline-size;
                }
                .pc-consigne {
                    text-align: center; color: var(--text-muted); flex: 0 0 auto;
                    font-size: clamp(11px, 2.4cqw, 14px); line-height: 1.35; max-width: 720px;
                    margin: 0 auto;
                }
                .pc-consigne b { color: var(--text-main); }
                /* LES DEUX FIGURES CÔTE À CÔTE, ET L'UNE SOUS L'AUTRE SUR UN
                   TÉLÉPHONE : les comparer suppose de les voir ensemble, et
                   deux colonnes de 160 pixels ne montreraient ni l'une ni
                   l'autre. */
                .pc-figures { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 0 0 auto; }
                @container (max-width: 460px) { .pc-figures { grid-template-columns: 1fr; } }
                .pc-cadre {
                    border: 1.5px solid var(--border-color, #d7dae3); border-radius: 12px;
                    background: var(--card-bg, #fff); padding: 6px; position: relative;
                }
                .pc-cadre--but { border-style: dashed; }
                .pc-cadre--ok { border-color: var(--success); }
                .pc-etiq {
                    position: absolute; top: -9px; left: 10px; padding: 0 6px; font-size: 11px;
                    font-weight: 700; background: var(--card-bg, #fff); color: var(--text-muted);
                }
                /* LA FIGURE NE MANGE PAS L'ÉCRAN. Mesuré : à pleine largeur, le
                   format 100 × 70 donnait deux cadres de 456 px de haut pour un
                   segment, et le programme — qui est le travail — passait sous
                   la ligne de flottaison. Le viewBox se recentre tout seul dans
                   la place qu'on lui laisse. */
                .pc-svg {
                    width: 100%; height: clamp(110px, 30vh, 280px); display: block;
                }
                .pc-trait { stroke: var(--primary); stroke-width: 0.5; fill: none; stroke-linecap: round; }
                /* LES TRAITS DE CONSTRUCTION SE VOIENT MOINS. Ils sont la preuve
                   du travail, pas le résultat : les peindre comme le reste ferait
                   croire qu'on les exige. */
                .pc-trait--aide { stroke: var(--text-muted); stroke-width: 0.3; opacity: .55; }
                .pc-point { fill: var(--text-main); }
                .pc-nom { fill: var(--text-main); font-size: 4px; font-weight: 700;
                    font-family: inherit; }
                .pc-prog { display: flex; flex-direction: column; gap: 5px; }
                .pc-bloc {
                    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
                    border: 1.5px solid var(--border-color, #d7dae3); border-radius: 10px;
                    background: var(--card-bg, #fff); padding: 5px 8px;
                    font-size: clamp(11px, 2.2cqw, 14px);
                }
                .pc-bloc--bloque { border-color: var(--danger); }
                .pc-bloc--jamais { opacity: .45; }
                .pc-rang { font-weight: 700; color: var(--text-muted); min-width: 1.4em; }
                .pc-bloc select {
                    font: inherit; font-weight: 700; color: var(--primary);
                    border: 1.5px solid var(--primary); border-radius: 7px;
                    background: var(--card-bg, #fff); padding: 1px 3px; max-width: 14em;
                }
                .pc-nes { color: var(--success); font-weight: 700; }
                .pc-x { margin-left: auto; border: 0; background: none; cursor: pointer;
                    color: var(--text-muted); font-size: 15px; line-height: 1; padding: 2px 4px; }
                .pc-palette { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
                .pc-ajout {
                    border: 1.5px dashed var(--primary); border-radius: 10px; cursor: pointer;
                    background: transparent; color: var(--primary); font: inherit; font-weight: 600;
                    padding: 5px 9px; font-size: clamp(11px, 2.1cqw, 13px);
                }
                .pc-ajout:disabled { opacity: .4; cursor: not-allowed; }
                .pc-barre { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
                .pc-btn {
                    border: 0; border-radius: 10px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 14px; background: var(--primary); color: #fff;
                }
                .pc-btn--doux { background: transparent; color: var(--text-muted);
                    border: 1.5px solid var(--border-color, #d7dae3); }
                .pc-note { text-align: center; min-height: 1.3em; font-size: clamp(11px, 2.2cqw, 14px); }
                .pc-note--ok { color: var(--success); font-weight: 700; }
                .pc-note--ko { color: var(--danger); font-weight: 600; }
                .pc-note--info { color: var(--primary); font-weight: 600; }
                .pc-vide { color: var(--text-muted); font-style: italic; text-align: center;
                    font-size: clamp(11px, 2.2cqw, 13px); padding: 6px; }
            </style>
            <div class="pc-wrap" lang="fr">
                <div class="pc-consigne" data-consigne></div>
                <div class="pc-figures">
                    <div class="pc-cadre pc-cadre--but"><span class="pc-etiq">La figure à obtenir</span>
                        <div data-but></div></div>
                    <div class="pc-cadre" data-cadre-moi><span class="pc-etiq">Ce que ton programme trace</span>
                        <div data-moi></div></div>
                </div>
                <div class="pc-prog" data-prog></div>
                <div class="pc-palette" data-palette></div>
                <div class="pc-note" data-note></div>
                <div class="pc-barre" data-barre></div>
            </div>`;
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.butEl = this.container.querySelector('[data-but]');
        this.moiEl = this.container.querySelector('[data-moi]');
        this.cadreMoiEl = this.container.querySelector('[data-cadre-moi]');
        this.progEl = this.container.querySelector('[data-prog]');
        this.paletteEl = this.container.querySelector('[data-palette]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.barreEl = this.container.querySelector('[data-barre]');
        this.dessiner();
    }

    startGameLoop() { /* rien à animer : l'exercice avance aux clics */ }

    /** Les points connus juste AVANT le bloc de rang `k`. */
    etatAvant(k) {
        return executer(this.programme.slice(0, k), this.niveau.depart);
    }

    dessiner() {
        const niv = this.niveau;
        const r = executer(this.programme, niv.depart);
        this.dernier = r;

        this.consigneEl.innerHTML = `<b>Niveau ${this.rang + 1} sur ${this.plan.length} — `
            + `${enAttribut(niv.titre)}.</b> ${enAttribut(niv.dit)}`;
        // LA CIBLE NE MONTRE PAS LES TRAITS DE CONSTRUCTION. Les afficher
        // donnerait la méthode ; c'est justement ce qu'on demande de trouver.
        this.butEl.innerHTML = figureSvg(niv.attendus, niv.depart, { classe: 'pc-svg--but' });
        this.moiEl.innerHTML = figureSvg(r.objets, r.points, {
            aides: r.objets.filter(o => !niv.attendus.some(a => cleObjet(a) === cleObjet(o)))
        });

        this.dessinerProgramme(r);
        this.dessinerPalette(r);
        this.dessinerBarre();
        if (r.erreur) this.note(r.erreur.dit, 'ko');
    }

    dessinerProgramme(r) {
        if (!this.programme.length) {
            this.progEl.innerHTML = '<div class="pc-vide">Ton programme est vide : '
                + 'choisis un premier bloc ci-dessous.</div>';
            return;
        }
        this.progEl.innerHTML = this.programme.map((ins, k) => {
            const op = OPERATIONS[ins.op];
            const ligne = (r.lignes || [])[k] || {};
            const avant = this.etatAvant(k);
            const cls = ligne.etat === 'bloque' ? ' pc-bloc--bloque'
                : ligne.etat === 'jamais' ? ' pc-bloc--jamais' : '';
            const morceaux = op.gabarit.map(part => {
                if (typeof part === 'string') return enAttribut(part);
                const sorte = op.prend[part];
                const choix = sorte === 'point'
                    ? Object.keys(avant.points).map(n => ({ v: n, dit: n }))
                    : avant.objets.map(o => ({ v: cleObjet(o), dit: nomObjet(o, avant.points) }));
                const val = ins.args[part] ?? '';
                return `<select data-bloc="${k}" data-arg="${part}">
                    <option value=""${val === '' ? ' selected' : ''}>?</option>
                    ${choix.map(c => `<option value="${enAttribut(c.v)}"${
    c.v === val ? ' selected' : ''}>${enAttribut(c.dit)}</option>`).join('')}
                </select>`;
            }).join('');
            const nes = ligne.noms && ligne.noms.length
                ? `<span class="pc-nes">→ ${ligne.noms.join(', ')}</span>` : '';
            return `<div class="pc-bloc${cls}">
                <span class="pc-rang">${k + 1}.</span>${morceaux}${nes}
                <button type="button" class="pc-x" data-retirer="${k}"
                    aria-label="Retirer ce bloc">✕</button>
            </div>`;
        }).join('');

        if (this.isDemo) return;
        this.progEl.querySelectorAll('select').forEach(sel => {
            sel.onchange = () => {
                const k = Number(sel.dataset.bloc), i = Number(sel.dataset.arg);
                this.programme[k].args[i] = sel.value;
                this.note('');
                this.dessiner();
            };
        });
        this.progEl.querySelectorAll('[data-retirer]').forEach(b => {
            b.onclick = () => {
                this.programme.splice(Number(b.dataset.retirer), 1);
                this.note('');
                this.dessiner();
            };
        });
    }

    dessinerPalette(r) {
        const ops = operationsDe(this.famillesActives);
        this.paletteEl.innerHTML = ops.map(op => {
            // UN BLOC QU'ON NE PEUT PAS ENCORE POSER RESTE VISIBLE, MAIS ÉTEINT.
            // Le cacher ferait croire qu'il n'existe pas ; l'éteindre dit qu'il
            // faudra d'abord tracer quelque chose — ce qui est la leçon sur
            // l'ordre.
            const faut = op.prend.filter(s => s === 'objet').length;
            const peut = r.objets.length >= faut;
            // LE BOUTON DIT L'OBJET, LE BLOC DIT LA PHRASE. Découper le gabarit
            // pour en tirer une étiquette donnait « Trace le segment []… », avec
            // ses crochets orphelins : une phrase à trous n'est pas un nom.
            return `<button type="button" class="pc-ajout" data-op="${op.id}"
                ${peut ? '' : 'disabled title="Il faut d\'abord tracer quelque chose"'}
                >+ ${enAttribut(op.bouton)}</button>`;
        }).join('');
        if (this.isDemo) return;
        this.paletteEl.querySelectorAll('[data-op]').forEach(b => {
            b.onclick = () => {
                this.programme.push({ op: b.dataset.op, args: [] });
                this.note('');
                this.dessiner();
            };
        });
    }

    dessinerBarre() {
        this.barreEl.innerHTML = `
            <button type="button" class="pc-btn" data-verifier>✓ Vérifier ma figure</button>
            <button type="button" class="pc-btn pc-btn--doux" data-vider>↺ Tout effacer</button>`;
        if (this.isDemo) return;
        this.barreEl.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.barreEl.querySelector('[data-vider]').onclick = () => {
            this.programme = [];
            this.note('');
            this.dessiner();
        };
    }

    /**
     * ON EXÉCUTE, PUIS ON COMPARE LES FIGURES.
     *
     * Le refus ne dit jamais « faux » tout court : il nomme ce qui MANQUE au
     * dessin. « Il manque le segment [BC] » se corrige ; « raté » se subit.
     */
    verifier() {
        if (this.fini) return;
        const niv = this.niveau;
        const r = executer(this.programme, niv.depart);
        if (r.erreur) { this.note(r.erreur.dit, 'ko'); return; }
        if (!this.programme.length) {
            this.note('Ton programme est vide : il ne trace rien.', 'info');
            return;
        }
        const c = comparer(r.objets, niv.attendus);
        if (!c.ok) {
            const quoi = c.manquants.map(o => nomObjet(o, niv.points)).join(', ');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Programme de construction — ${niv.titre}`,
                input: this.programme.map(i => OPERATIONS[i.op].libelle(i.args)).join(' ; '),
                expected: niv.attendus.map(o => nomObjet(o, niv.points)).join(', '),
                partiel: true, silencieux: true
            });
            this.note(`Il manque ${quoi} sur ta figure. Compare les deux dessins.`, 'ko');
            return;
        }
        this.cadreMoiEl.classList.add('pc-cadre--ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Programme de construction — ${niv.titre}`,
            expected: niv.titre, given: `${this.programme.length} blocs`, points: 8, partiel: true
        });
        const enTrop = c.enTrop.length;
        this.note(enTrop
            ? `C'est la bonne figure — et tes ${enTrop} trait${enTrop > 1 ? 's' : ''} de `
                + 'construction ont le droit de rester.'
            : 'C\'est exactement la figure demandée.', 'ok');
        this.suivant();
    }

    suivant() {
        if (this.rang + 1 >= this.plan.length) { this.fini = true; return this.gagner(); }
        setTimeout(() => {
            if (!this.isRunning) return;
            this.rang += 1;
            this.programme = [];
            this.cadreMoiEl.classList.remove('pc-cadre--ok');
            this.dessiner();
        }, 1500);
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'pc-note' + (ton ? ` pc-note--${ton}` : '');
    }

    /** Le robot écrit le programme modèle, un bloc à la fois. */
    async runDemoSequence() {
        const niv = this.niveau;
        for (const ins of niv.modeleResolu) {
            if (!this.isRunning) return;
            await new Promise(ok => setTimeout(ok, 900));
            if (this.gelDemo) { await new Promise(ok => setTimeout(ok, 600)); }
            this.programme.push({ op: ins.op, args: [...ins.args] });
            this.dessiner();
        }
        this.note('Le programme est écrit : la figure de droite est celle de gauche.', 'ok');
    }

    /** La barre d'auteur : passer au niveau suivant. */
    sauterQuestion() {
        if (this.rang + 1 >= this.plan.length) return false;
        this.rang += 1;
        this.programme = [];
        this.note('');
        this.dessiner();
        return true;
    }
}

export function engineProgrammeConstruction(container, isDemo, params) {
    const jeu = new ProgrammeConstruction(container, isDemo, params);
    jeu.start();
    return jeu;
}

export const familles = FAMILLES;
