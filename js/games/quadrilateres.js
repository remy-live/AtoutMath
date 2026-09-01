// L'ORGANIGRAMME DES QUADRILATÈRES — à l'écran.
//
// Rémy : « J'aime l'organigramme avec les cartes à replacer. Il faut des choses
// visuelles quitte à avoir des animations. »
//
// QUATRE PARTIS PRIS.
//
//   · LA FIGURE SE DESSINE QUAND LA CARTE TOMBE JUSTE. C'est l'animation qui
//     compte, et elle n'est pas décorative : le contour du quadrilatère se
//     TRACE, côté par côté, à l'endroit exact où l'élève vient de poser le nom.
//     Il voit alors ce qu'il a nommé. Une case qui se contenterait de verdir
//     dirait « juste » ; celle-ci dit « voilà à quoi ça ressemble ».
//
//   · LES CASES VIDES MONTRENT DÉJÀ LEUR FIGURE EN POINTILLÉ. Sans cela,
//     l'exercice serait un pur jeu de mémoire — six mots, six trous. Avec le
//     contour, l'élève peut RAISONNER sur ce qu'il voit : celui-ci a un angle
//     droit, celui-là quatre côtés égaux. C'est de la géométrie, pas du
//     par-cœur.
//
//   · LES DEUX FLÈCHES QUI MÈNENT AU CARRÉ SONT LE CŒUR DE LA FIGURE. On y
//     arrive du rectangle en ajoutant les longueurs, du losange en ajoutant
//     l'angle droit — chaque chemin apporte ce que l'autre avait déjà. Le
//     plateau les met côte à côte pour qu'on ne puisse pas ne pas le voir.
//
//   · ON GLISSE AU DOIGT, avec la machinerie de palette déjà écrite pour le
//     Mathdoku et le Binairo. Même fantôme, même visée, même dépôt : un élève
//     qui sait jouer à l'un sait jouer à celui-ci.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { brancherGlisserPalette } from '../core/activities/paletteDrag.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    FAMILLES, FLECHES, POSITIONS, PALIERS, MODES, familleDe, flecheDe, cleFleche,
    genererOrganigramme, verifierDepot, verifierOrganigramme, conseil
} from '../core/quadrilateres.js';

const COMPETENCE = 'geo.quadrilateres.familles';

class Organigramme extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'quadrilateres');
        this.rng = makeRng(this.params.seed);
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'noms';
        this.poses = {};
    }

    render() {
        this.container.innerHTML = `
            <style>
                .qd-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 6px;
                    width: 100%; height: 100%; padding: 6px 10px 10px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                    min-height: 0; user-select: none; -webkit-user-select: none;
                }
                .qd-consigne {
                    text-align: center; color: var(--text-muted); flex: 0 0 auto;
                    font-size: clamp(11px, 2.5cqw, 13px); line-height: 1.3; max-width: 660px;
                }
                .qd-scene {
                    flex: 1 1 auto; width: 100%; min-height: 0;
                    display: flex; align-items: center; justify-content: center;
                }
                .qd-plan {
                    position: relative; width: min(100%, 62cqh); aspect-ratio: 0.92;
                    max-width: 480px;
                }
                .qd-fils { position: absolute; inset: 0; width: 100%; height: 100%; }
                .qd-lien { stroke: var(--text-muted); stroke-width: 1.6; fill: none; opacity: .55; }
                .qd-lien--fait { stroke: var(--success); }

                /* --- Une case de l'organigramme --- */
                .qd-case {
                    position: absolute; transform: translate(-50%, -50%);
                    width: 30%; box-sizing: border-box;
                    border: 1.5px solid var(--border); border-radius: 10px;
                    background: var(--bg-panel); padding: 3px 2px 2px;
                    display: flex; flex-direction: column; align-items: center; gap: 1px;
                }
                .qd-case--trou { border-style: dashed; background: color-mix(in srgb, var(--warning) 10%, var(--bg-panel)); }
                .qd-case--visee { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent); }
                .qd-case--juste { border-color: var(--success); background: color-mix(in srgb, var(--success) 12%, var(--bg-panel)); }
                .qd-figure { width: 76%; aspect-ratio: 1.35; display: block; }
                .qd-trait {
                    fill: color-mix(in srgb, var(--primary) 12%, transparent);
                    stroke: var(--text-main); stroke-width: 4; stroke-linejoin: round;
                }
                /* LE CONTOUR SE TRACE : le pointillé vaut la longueur du
                   périmètre entier, et en ramenant le décalage à zéro le trait
                   se dessine côté après côté, comme à la règle. */
                .qd-trait--anime {
                    stroke-dasharray: var(--tour); stroke-dashoffset: var(--tour);
                    animation: qd-tracer .75s ease-out forwards;
                }
                @keyframes qd-tracer { to { stroke-dashoffset: 0; } }
                .qd-trait--fantome { stroke: var(--border); stroke-dasharray: 6 6; fill: none; }
                .qd-nom {
                    font-weight: 800; font-size: clamp(8px, 2.1cqw, 12px); text-align: center;
                    line-height: 1.05; min-height: 1.1em;
                }
                .qd-nom--vide { color: var(--text-muted); font-weight: 600; }

                /* --- Une étiquette de flèche --- */
                .qd-etiq {
                    position: absolute; transform: translate(-50%, -50%);
                    min-width: 22%; max-width: 34%; box-sizing: border-box;
                    border: 1.5px dashed var(--border); border-radius: 8px;
                    background: var(--bg-panel); padding: 3px 5px; text-align: center;
                    font-size: clamp(7px, 1.9cqw, 11px); line-height: 1.15; font-weight: 700;
                    color: var(--text-muted);
                }
                .qd-etiq--pose { border-style: solid; color: var(--text-main); }
                .qd-etiq--juste { border-color: var(--success); background: color-mix(in srgb, var(--success) 14%, var(--bg-panel)); color: var(--text-main); }
                .qd-etiq--visee { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent); }

                /* --- Les cartes --- */
                .qd-cartes {
                    display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;
                    flex: 0 0 auto; max-width: 640px;
                }
                /* LES JETONS DU MATHDOKU SONT CARRÉS, CEUX-CI PORTENT DES MOTS.
                   La règle globale « .kk-chip » impose 56 px de côté — faite
                   pour un chiffre — et « Parallélogramme » s'y chevauchait,
                   illisible. On garde la CLASSE, parce que c'est elle que la
                   machinerie de glisser reconnaît, et on rend la taille au
                   contenu. */
                .qd-cartes .kk-chip {
                    width: auto; height: auto; flex: 0 0 auto; white-space: nowrap;
                    border: 1.5px solid var(--primary); border-radius: 9px; cursor: grab;
                    background: var(--bg-panel); color: var(--text-main);
                    font-weight: 700; padding: 7px 11px; font-size: clamp(10px, 2.2cqw, 13px);
                    touch-action: none; min-height: 34px; display: inline-flex; align-items: center;
                }
                .qd-cartes .kk-chip--pris { opacity: .25; pointer-events: none; }

                .qd-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .qd-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 6px 11px; font-size: .82rem; min-height: 34px;
                }
                .qd-note {
                    min-height: 2.2em; text-align: center; font-size: .82rem; line-height: 1.3;
                    color: var(--text-muted); max-width: 660px; flex: 0 0 auto;
                }
                .qd-note--ok { color: var(--success); font-weight: 700; }
                .qd-note--ko { color: var(--danger); font-weight: 600; }

                /* Couché, le plan à gauche et les cartes à droite : en paysage
                   c'est la hauteur qui manque. La requête interroge le PLATEAU,
                   pas cette boîte — un élément ne peut pas questionner son
                   propre conteneur. */
                @container plateau (max-height: 470px) and (min-width: 620px) {
                    .qd-wrap {
                        display: grid; grid-template-columns: minmax(0, auto) minmax(200px, 300px);
                        grid-template-rows: min-content minmax(0, 1fr) min-content;
                        align-items: center; justify-items: center; gap: 3px 10px; padding: 4px 8px;
                    }
                    .qd-consigne { grid-column: 2; grid-row: 1; }
                    .qd-scene { grid-column: 1; grid-row: 1 / 4; height: 100%; align-self: stretch; }
                    .qd-cartes { grid-column: 2; grid-row: 2; }
                    .qd-barre { grid-column: 2; grid-row: 3; }
                    .qd-note { grid-column: 2; grid-row: 3; display: none; }
                }
            </style>
            <div class="qd-wrap">
                <div class="qd-consigne" data-consigne></div>
                <div class="qd-scene"><div class="qd-plan" data-plan></div></div>
                <div class="qd-cartes" data-cartes></div>
                <div class="qd-barre">
                    <button type="button" class="qd-btn" data-effacer>↺ Recommencer</button>
                    <button type="button" class="qd-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="qd-btn" data-neuf>Autre organigramme</button>
                </div>
                <div class="qd-note" data-note></div>
            </div>`;

        this.planEl = this.container.querySelector('[data-plan]');
        this.cartesEl = this.container.querySelector('[data-cartes]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
    }

    startGameLoop() { this.poser(); }

    poser() {
        this.org = genererOrganigramme({ rng: this.rng, palier: this.palier });
        this.poses = {};
        this.fini = false;
        this.dessiner();
        this.note('');
        return true;
    }

    showNext() { return this.poser(); }

    effacer() {
        if (this.isDemo || !this.org) return;
        this.poses = {};
        this.fini = false;
        this.dessiner();
        this.note('');
    }

    // --- Le dessin ----------------------------------------------------------

    dessiner() {
        const org = this.org;
        const noms = org.mode === MODES.FAMILLES;
        this.consigneEl.textContent = noms
            ? 'Glisse chaque nom dans sa case. On descend en ajoutant une condition à la fois : '
                + 'la case la plus basse est la plus particulière.'
            : 'Glisse chaque condition sur sa flèche. Descendre d\'un cran, c\'est ajouter '
                + 'UNE SEULE condition — celle qui manque encore à la figure du dessus.';

        let html = `<svg class="qd-fils" viewBox="0 0 100 100" preserveAspectRatio="none">
            ${FLECHES.map(f => this.lienSvg(f)).join('')}</svg>`;

        for (const fam of FAMILLES) {
            const p = POSITIONS[fam.id];
            const trou = org.trous.includes(fam.id);
            const pose = this.poses[fam.id];
            const juste = pose && verifierDepot(org, fam.id, pose).ok;
            const classe = trou ? (juste ? 'qd-case--juste' : 'qd-case--trou') : '';
            const montre = !trou || juste;
            html += `<div class="qd-case ${classe}" style="left:${p.x}%; top:${p.y}%"
                data-case="${fam.id}" data-depose="${trou && !juste ? '1' : ''}">
                ${this.figureSvg(fam, montre, juste && this.vientDePoser === fam.id)}
                <div class="qd-nom ${montre ? '' : 'qd-nom--vide'}">${montre ? fam.nom : '?'}</div>
            </div>`;
        }

        if (org.mode === MODES.PROPRIETES) {
            for (const f of FLECHES) {
                const cle = cleFleche(f);
                const trou = org.trous.includes(cle);
                const pose = this.poses[cle];
                const juste = pose && verifierDepot(org, cle, pose).ok;
                const a = POSITIONS[f.de], b = POSITIONS[f.vers];
                const classe = juste ? 'qd-etiq--juste' : (pose ? 'qd-etiq--pose' : '');
                const texte = trou ? (pose ? pose.texte : '?') : f.ajoute;
                html += `<div class="qd-etiq ${trou ? classe : 'qd-etiq--pose'}"
                    style="left:${(a.x + b.x) / 2}%; top:${(a.y + b.y) / 2}%"
                    data-case="${cle}" data-depose="${trou && !juste ? '1' : ''}">${texte}</div>`;
            }
        }
        this.planEl.innerHTML = html;

        const restantes = org.cartes.filter(c => !Object.values(this.poses).some(p => p.id === c.id));
        this.cartesEl.innerHTML = restantes.map(c =>
            `<div class="kk-chip" data-carte="${c.id}">${c.texte}</div>`).join('');
        this.brancherGlisser();
        this.vientDePoser = null;
    }

    /** Le trait entre deux cases, et sa flèche. */
    lienSvg(f) {
        const a = POSITIONS[f.de], b = POSITIONS[f.vers];
        const fait = this.org.mode === MODES.PROPRIETES
            && this.poses[cleFleche(f)] && verifierDepot(this.org, cleFleche(f), this.poses[cleFleche(f)]).ok;
        return `<line class="qd-lien ${fait ? 'qd-lien--fait' : ''}"
            x1="${a.x}" y1="${a.y + 6}" x2="${b.x}" y2="${b.y - 6}"
            vector-effect="non-scaling-stroke"></line>`;
    }

    /**
     * LE CONTOUR DU QUADRILATÈRE. En pointillé tant que la case est vide — pour
     * qu'on puisse RAISONNER sur la figure au lieu de deviner un mot —, et
     * tracé d'un trait quand le nom vient d'être posé.
     */
    figureSvg(fam, montre, anime) {
        const pts = fam.figure.map(p => p.join(',')).join(' ');
        const tour = perimetre(fam.figure);
        const classe = montre ? (anime ? 'qd-trait qd-trait--anime' : 'qd-trait') : 'qd-trait qd-trait--fantome';
        return `<svg class="qd-figure" viewBox="0 0 100 90" preserveAspectRatio="xMidYMid meet">
            <polygon class="${classe}" points="${pts}" style="--tour:${tour.toFixed(1)}"></polygon>
        </svg>`;
    }

    brancherGlisser() {
        if (this.isDemo) return;
        brancherGlisserPalette(this.container, {
            classeVisee: this.org.mode === MODES.FAMILLES ? 'qd-case--visee' : 'qd-etiq--visee',
            bloque: () => this.fini,
            cibleSous: (e) => {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const cible = el && el.closest('[data-depose="1"]');
                return cible || null;
            },
            deposer: (cible, chip) => this.deposer(cible.dataset.case, chip.dataset.carte)
        });
    }

    deposer(caseId, carteId) {
        if (this.isDemo || this.fini) return;
        const carte = this.org.cartes.find(c => c.id === carteId);
        if (!carte) return;
        const v = verifierDepot(this.org, caseId, carte);
        if (!v.ok) {
            this.note(v.raison || 'Ce n\'est pas là.', 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Organigramme — ${etiquette(this.org, caseId)}`,
                input: carte.texte, expected: attendu(this.org, caseId),
                partiel: true, silencieux: true
            });
            return;
        }
        this.poses[caseId] = carte;
        this.vientDePoser = caseId;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Organigramme — ${etiquette(this.org, caseId)}`,
            expected: carte.texte, given: carte.texte, points: 6, partiel: true
        });
        this.dessiner();
        const bilan = verifierOrganigramme(this.org, this.poses);
        if (bilan.fini) return this.gagner();
        this.note(v.texteJuste || '', v.texteJuste ? 'ok' : '');
    }

    gagner() {
        this.fini = true;
        this.note('✅ L\'organigramme est complet. Retiens la forme : on arrive au carré '
            + 'PAR DEUX CHEMINS, et chacun ajoute ce que l\'autre avait déjà.', 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Organigramme des quadrilatères — ${this.org.palier}`,
            expected: `${this.org.trous.length} cases`, given: `${this.org.trous.length} cases`,
            points: 10 + this.org.trous.length * 3
        });
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 3000);
    }

    aider() {
        if (this.isDemo || !this.org) return;
        this.note(conseil(this.org, this.poses));
    }

    montrerSolution() {
        if (!this.org) return false;
        this.org.trous.forEach(t => {
            this.poses[t] = this.org.cartes.find(c => verifierDepot(this.org, t, c).ok);
        });
        this.fini = true;
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'qd-note' + (ton ? ` qd-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.org) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Cet organigramme n\'est pas une liste : les familles s\'EMBOÎTENT. Chaque '
            + 'flèche descend d\'un cran en ajoutant une seule condition, et tout ce qui est '
            + 'en bas est aussi tout ce qui est au-dessus.', this.planEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let k = 0; k < 2 && k < this.org.trous.length; k++) {
            const caseId = this.org.trous[this.org.trous.length - 1 - k];
            const carte = this.org.cartes.find(c => verifierDepot(this.org, caseId, c).ok);
            if (!carte) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say(k === 0
                ? 'Je commence par le HAUT, la case la plus générale : c\'est celle qui n\'a '
                  + 'encore aucune condition.'
                : 'Puis je descends. À chaque cran, je me demande ce qui a été AJOUTÉ — et '
                  + 'rien de plus.', this.planEl.querySelector(`[data-case="${caseId}"]`) || this.planEl);
            this.poses[caseId] = carte;
            this.vientDePoser = caseId;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et regarde le bas : on arrive au carré depuis le rectangle ET depuis le '
            + 'losange. Chaque chemin ajoute ce que l\'autre avait déjà — c\'est pour cela '
            + 'qu\'un carré est à la fois un rectangle et un losange.', this.planEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

/** Le périmètre du contour, pour que l'animation de tracé fasse le tour juste. */
function perimetre(pts) {
    let t = 0;
    for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        t += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return t;
}

const etiquette = (org, caseId) => (org.mode === MODES.FAMILLES
    ? `case ${familleDe(caseId).nom}`
    : `flèche ${familleDe(flecheDe(caseId).de).nom} → ${familleDe(flecheDe(caseId).vers).nom}`);

const attendu = (org, caseId) => (org.mode === MODES.FAMILLES
    ? familleDe(caseId).nom : flecheDe(caseId).ajoute);

export function engineQuadrilateres(container, isDemo, params) {
    const jeu = new Organigramme(container, isDemo, params);
    jeu.start();
    return jeu;
}
