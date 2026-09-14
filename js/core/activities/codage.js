// ACTIVITÉ « CODER LA FIGURE ».
//
// Rémy : « le but est de coder la figure par glisser de codage sur les
// segments, et on peut faire un glisser d'angle droit soit sur les diagonales
// soit sur les sommets ».
//
// DEUX GESTES POUR LA MÊME CHOSE, comme partout ailleurs dans l'application :
// on glisse un symbole depuis la palette, ou l'on tape directement le segment
// et la marque défile. Le glisser est ce que Rémy a demandé et ce qui parle au
// doigt ; le tapotement sauve celui qui a raté sa cible trois fois de suite, et
// donne au clavier un chemin — chaque zone est focalisable, Entrée fait défiler.
//
// LA CORRECTION NE DIT PAS « FAUX ». Le noyau sait DIRE ce qui cloche : une
// même marque sur deux longueurs différentes, une égalité vraie codée de deux
// façons, un angle droit là où il n'y en a pas. C'est cela qu'on affiche, et
// dans cet ordre — ce qui manque avant ce qui est faux, parce qu'on ne
// reproche pas une erreur à qui n'a pas fini.

import { regTimeout } from '../timers.js';
import { hintBar } from './choice.js';
import { brancherGlisserPalette } from './paletteDrag.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import {
    construireFigure, classesDeLongueur, anglesDroitsDe, canoniser,
    verifierCodage, bornesDe, NOM_TYPE
} from '../codage.js';
import { codageSvg, jetonSvg, jetonAngleSvg } from '../codageSvg.js';

/** Les quatre marques d'égalité disponibles, dans l'ordre de la palette. */
const MARQUES = [1, 2, 3, 4];

export function mount(container, session) {
    let destroyed = false;
    let cursor = null;
    let gate = null;

    let item = null;
    let fig = null;
    let ids = [];
    let pts = [];
    let pose = { marques: {}, angles: {} };

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        const m = item.meta;
        fig = construireFigure(m.type, m.dims, m.rotation);
        ids = m.segments;
        pts = m.points;
        pose = { marques: {}, angles: {} };
        render();
    }

    function render() {
        const jetons = MARQUES.map(n =>
            `<button type="button" class="kk-chip cg-chip" data-chip="${n}"
                     aria-label="Marque à ${n === 4 ? 'croix' : `${n} trait${n > 1 ? 's' : ''}`}">
                ${jetonSvg(n)}
            </button>`).join('')
            + `<button type="button" class="kk-chip cg-chip cg-chip--angle" data-chip="angle"
                       aria-label="Angle droit">${jetonAngleSvg()}</button>`
            + `<button type="button" class="kk-chip cg-chip cg-chip--gomme" data-chip=""
                       aria-label="Effacer une marque">⌫</button>`;

        container.innerHTML = `
            <div class="cg-layout">
                <div class="cg-contexte">${item.prompt.html}</div>
                <div class="cg-figure">${dessin()}</div>
                <div class="cg-cote">
                    <div class="kk-palette cg-palette" aria-label="Marques à poser">${jetons}</div>
                    <div class="kk-actions">
                        <button type="button" class="kk-btn-valider" data-valider>Valider</button>
                    </div>
                    <div class="kk-status cg-status" role="status"></div>
                    ${hintBar(session)}
                </div>
            </div>`;

        if (session.isDemo) {
            if (!session.frozen) runDemo();
            return;
        }
        brancherCibles();
        brancherPalette();
        brancherValidation();
        brancherIndices();
    }

    // Les zones de dépôt existent même en démonstration : c'est sur elles que
    // le pointeur du robot vient taper.
    const dessin = (etats = {}) => codageSvg(fig, {
        segments: ids, points: pts, pose, interactif: true, etats
    });

    /** Redessiner : la figure entière, car une marque déplace ses voisines. */
    function redessiner(etats = {}) {
        const boite = container.querySelector('.cg-figure');
        if (!boite) return;
        boite.innerHTML = dessin(etats);
        if (!session.isDemo) brancherCibles();
    }

    // --- Poser, enlever ---------------------------------------------------------

    function poserMarque(segId, valeur) {
        if (session.locked || destroyed) return;
        if (!ids.includes(segId)) return;
        if (valeur) pose.marques[segId] = valeur; else delete pose.marques[segId];
        statut('');
        redessiner();
    }

    function poserAngle(ptId, actif) {
        if (session.locked || destroyed) return;
        if (!pts.includes(ptId)) return;
        if (actif) pose.angles[ptId] = true; else delete pose.angles[ptId];
        statut('');
        redessiner();
    }

    /** Le tapotement fait défiler : rien, un trait, deux, trois, la croix. */
    function faireDefiler(segId) {
        const actuel = pose.marques[segId] || 0;
        poserMarque(segId, actuel >= MARQUES.length ? 0 : actuel + 1);
    }

    function brancherCibles() {
        container.querySelectorAll('.cg-cible--seg').forEach(cible => {
            cible.addEventListener('click', () => faireDefiler(cible.dataset.seg));
            cible.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); faireDefiler(cible.dataset.seg); }
                else if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault(); poserMarque(cible.dataset.seg, 0);
                }
            });
        });
        container.querySelectorAll('.cg-cible--pt').forEach(cible => {
            const bascule = () => poserAngle(cible.dataset.pt, !pose.angles[cible.dataset.pt]);
            cible.addEventListener('click', bascule);
            cible.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bascule(); }
            });
        });
    }

    function brancherPalette() {
        brancherGlisserPalette(container, {
            bloque: () => session.locked,
            classeVisee: 'cg-cible--visee',
            cibleSous(e) {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const cible = el && el.closest ? el.closest('.cg-cible') : null;
                if (!cible) return null;
                // UNE MARQUE NE SE POSE PAS SUR UN SOMMET, un angle droit ne se
                // pose pas sur un segment : la palette dit ce qu'on tient, la
                // figure dit où cela veut dire quelque chose.
                const chip = document.querySelector('.kk-chip.drag-source');
                const quoi = chip ? chip.dataset.chip : '';
                if (quoi === '') return cible;                       // la gomme va partout
                const surPoint = cible.classList.contains('cg-cible--pt');
                return (quoi === 'angle') === surPoint ? cible : null;
            },
            deposer(cible, chip) {
                const quoi = chip.dataset.chip;
                if (cible.classList.contains('cg-cible--pt')) {
                    poserAngle(cible.dataset.pt, quoi === 'angle');
                } else {
                    poserMarque(cible.dataset.seg, quoi === '' ? 0 : Number(quoi));
                }
            }
        });
    }

    // --- Valider -----------------------------------------------------------------

    function brancherValidation() {
        const btn = container.querySelector('[data-valider]');
        if (!btn) return;
        btn.onclick = () => {
            if (session.locked || destroyed) return;
            const bilan = verifierCodage(fig, pose, ids, pts);

            // CE QUI N'EST PAS FINI N'EST PAS UNE ERREUR. Tant qu'il reste un
            // segment nu, on le dit et l'on ne compte rien : valider à moitié
            // ferait perdre une vie pour une phrase inachevée.
            const manque = bilan.problemes.find(p => p.genre === 'manque');
            if (manque) { statut(manque.message, 'ko'); secouer(); return; }

            const result = session.submit(canoniser(pose, ids, pts), {
                misconception: bilan.correct ? '' : bilan.problemes[0].message
            });
            if (result.ignored) return;

            if (!bilan.correct) {
                statut(bilan.problemes[0].message, 'ko');
                marquerFautes(bilan);
            }

            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) { renderNext(); return; }
                if (result.revealed) { montrerLeCodage(); regTimeout(renderNext, 3400); }
            });
        };
    }

    // --- Les indices, qui MONTRENT ------------------------------------------------

    /**
     * L'indice fait quelque chose, en plus de le dire — comme dans le Mathdoku.
     * Le premier ENTOURE un paquet de segments égaux encore mal codé : c'est
     * l'endroit où regarder, et la question « pourquoi ceux-là ? » est
     * exactement celle qu'on veut poser. Le second POSE leurs marques : on voit
     * alors sur la figure ce que la phrase disait.
     */
    function brancherIndices() {
        const btn = container.querySelector('[data-hint]');
        if (!btn) return;
        btn.onclick = () => {
            const niveau = session.hintIndex;
            const h = session.hint();
            if (!h) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; return; }
            const paquet = paquetAAider();
            if (!paquet) return;
            if (niveau === 0) entourer(paquet);
            else poserPaquet(paquet);
            if (!session.hintsAvailable) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; }
        };
    }

    /** Le premier paquet de segments égaux qui n'est pas encore bien codé. */
    function paquetAAider() {
        const classes = classesDeLongueur(fig, ids);
        return classes.find(classe => {
            const codes = classe.map(id => pose.marques[id]);
            return codes.some(c => !c) || new Set(codes).size > 1;
        }) || null;
    }

    function entourer(paquet) {
        paquet.forEach(id => {
            const el = cibleSegment(id);
            if (el) el.classList.add('cg-cible--indice');
        });
    }

    function poserPaquet(paquet) {
        // La marque choisie est la première encore libre : on ne dérange pas
        // ce que l'élève a déjà posé ailleurs.
        const prises = new Set(Object.values(pose.marques).map(Number));
        const libre = MARQUES.find(n => !prises.has(n)) || 1;
        paquet.forEach(id => { pose.marques[id] = libre; });
        const etats = {};
        paquet.forEach(id => { etats[id] = 'juste'; });
        redessiner(etats);
    }

    /** Les segments et les points en cause s'allument : on VOIT ce qui cloche. */
    function marquerFautes(bilan) {
        const etats = {};
        bilan.problemes.forEach(p => p.cibles.forEach(c => { etats[c] = 'faux'; }));
        redessiner(etats);
    }

    /** À la révélation, la figure se code toute seule — c'est là qu'on comprend. */
    function montrerLeCodage() {
        pose = { marques: {}, angles: {} };
        classesDeLongueur(fig, ids).forEach((classe, i) => {
            classe.forEach(id => { pose.marques[id] = i + 1; });
        });
        anglesDroitsDe(fig, pts).forEach(p => { pose.angles[p] = true; });
        const etats = {};
        ids.forEach(id => { etats[id] = 'juste'; });
        pts.forEach(p => { if (pose.angles[p]) etats[p] = 'juste'; });
        redessiner(etats);
        statut(item.explanation, 'ok');
    }

    function secouer() {
        const boite = container.querySelector('.cg-figure');
        if (!boite) return;
        boite.classList.remove('cg-figure--secouee');
        void boite.offsetWidth;
        boite.classList.add('cg-figure--secouee');
    }

    function statut(texte, ton = '') {
        const el = container.querySelector('.cg-status');
        if (!el) return;
        el.textContent = texte;
        el.className = `kk-status cg-status${ton ? ` kk-status--${ton}` : ''}`;
    }

    // --- Le robot ------------------------------------------------------------------

    /**
     * Le robot code la figure sous les yeux de l'élève, en disant CE QUI
     * AUTORISE chaque marque. Il pose les paquets l'un après l'autre — d'abord
     * les côtés, puis les demi-diagonales — parce que c'est l'ordre dans lequel
     * on regarde une figure, et il finit par les angles droits.
     */
    async function runDemo() {
        if (!cursor) cursor = createDemoCursor();
        cursor.protegerZone(container.querySelector('.cg-figure'));
        gate = createDemoGate(container.querySelector('.cg-layout') || container);
        const fin = () => { cursor?.hideBubble(); gate?.destroy(); gate = null; };

        if (!await cursor.pause(600) || destroyed) return fin();

        const classes = classesDeLongueur(fig, ids);
        for (let i = 0; i < classes.length; i++) {
            const classe = classes[i];
            if (!await gate.waitTurn() || destroyed) return fin();
            const premier = cibleSegment(classe[0]);
            if (premier) cursor.say(phraseClasse(classe, i), premier);
            if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return fin();
            for (const id of classe) {
                const el = cibleSegment(id);
                if (!el) continue;
                if (!await cursor.tap(el, 300) || destroyed) return fin();
                pose.marques[id] = i + 1;
                redessiner();
            }
        }

        const droits = anglesDroitsDe(fig, pts);
        if (!await gate.waitTurn() || destroyed) return fin();
        const ancre = container.querySelector('.cg-figure');
        cursor.say(droits.length
            ? `Les angles droits, maintenant : ${droits.length === 1 ? 'il y en a un seul' : `il y en a ${droits.length}`}.`
            : `Dans ${NOM_TYPE[item.meta.type]}, aucun angle n'est droit : on ne pose rien.`, ancre);
        if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return fin();
        for (const p of droits) {
            const el = ciblePoint(p);
            if (!el) continue;
            if (!await cursor.tap(el, 300) || destroyed) return fin();
            pose.angles[p] = true;
            redessiner();
        }

        fin();
        if (destroyed) return;
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    const cibleSegment = (id) => container.querySelector(`.cg-cible--seg[data-seg="${id}"]`);
    const ciblePoint = (p) => container.querySelector(`.cg-cible--pt[data-pt="${p}"]`);

    /** Ce que le robot DIT avant de poser un paquet de marques. */
    function phraseClasse(classe, rang) {
        const noms = classe.map(id => `[${bornesDe(id).de}${bornesDe(id).a}]`).join(', ');
        const cotes = classe.every(id => !id.includes('O'));
        if (cotes) {
            return classe.length === 4
                ? `Les quatre côtés ont la même longueur : ${noms} portent la même marque.`
                : `${noms} sont opposés, donc de même longueur : même marque pour eux deux.`;
        }
        return classe.length === 4
            ? 'Les deux diagonales ont la même longueur et se coupent en leur milieu : '
                + 'les quatre demi-diagonales sont donc égales.'
            : `${noms} sont les deux moitiés d'une même diagonale : elles sont égales.`
                + (rang > 1 ? ' Mais l\'autre diagonale n\'a pas la même longueur : autre marque.' : '');
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
