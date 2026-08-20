// ACTIVITÉ « TRACER L'IMAGE SUR LE QUADRILLAGE ».
//
// L'élève colorie des cases. C'est tout, et c'est voulu : sur une fiche, cet
// exercice se fait au crayon, en noircissant des carreaux, et l'écran ne doit
// pas inventer un geste que le papier ne connaît pas. Un clic pose une case,
// un second la retire.
//
// ON NE VALIDE QU'À LA DEMANDE. Corriger au fil des clics transformerait
// l'exercice en jeu de chaud-froid : l'élève poserait une case au hasard, la
// verrait rougir, essaierait la voisine. Ce qu'on veut est qu'il COMPTE, qu'il
// pose sa figure entière, et qu'il la soumette — comme il rend une feuille.
//
// LA CORRECTION MONTRE OÙ, PAS SEULEMENT QUOI. Un « faux » sur cinq cases
// n'apprend rien. On dit combien de cases sont justes, combien manquent,
// combien sont en trop — et à la révélation, on superpose l'attendu au tracé
// de l'élève, en distinguant les trois cas par la couleur ET par la forme,
// parce qu'un polycopié photocopié n'a pas de couleurs et qu'un élève sur
// douze les distingue mal.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { quadrillageSvg } from '../quadrillageSvg.js';
import { cleFigure, comparer } from '../transformations.js';
import { imageAttendue } from '../generators/transfoQuadrillage.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

export function mount(container, session) {
    let destroyed = false;
    let cursor = null;
    let gate = null;

    let item = null;
    let posees = [];        // les cases coloriées par l'élève
    let svg = null;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        posees = [];
        render();
    }

    function render() {
        const m = item.meta;
        // La consigne est REÉCRITE à partir du texte, pas reprise du HTML de
        // l'item : celui-ci porte déjà une copie figée du quadrillage — utile
        // au carnet d'erreurs et à la feuille imprimée, encombrante ici, où le
        // quadrillage est justement celui sur lequel on va cliquer.
        const grille = quadrillageSvg({
            largeur: m.largeur, hauteur: m.hauteur,
            figures: [{ cases: m.depart, classe: 'qd-depart' }],
            transfo: m.transfo, ancre: m.ancre, interactive: true, prefixe: 'qdj'
        });
        container.innerHTML = `
            <div class="game-question">${echapper(item.prompt.text)}</div>
            <div class="figure-wrap figure-wrap--interactive qd-plateau">${grille}</div>
            <div class="qd-barre">
                <span class="qd-compte" role="status"></span>
                <button type="button" class="qd-effacer" data-effacer>Tout effacer</button>
                <button type="button" class="kk-btn-valider" data-valider>Valider</button>
            </div>
            ${hintBar(session)}`;

        svg = container.querySelector('svg');
        majCompte();

        if (session.isDemo) {
            if (!session.frozen) runDemo();
            return;
        }

        wireHint(container, session);
        brancherIndiceCase();
        svg.querySelectorAll('.qd-hit').forEach(hit => {
            hit.addEventListener('click', () => basculer(hit));
            hit.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); basculer(hit); }
            });
        });
        container.querySelector('[data-effacer]').onclick = () => {
            if (session.locked) return;
            posees = [];
            svg.querySelectorAll('.qd-posee').forEach(el => el.remove());
            majCompte();
        };
        container.querySelector('[data-valider]').onclick = valider;
    }

    // --- L'INDICE QUI TRACE UNE CASE ------------------------------------------
    //
    // Rémy : « pour un indice, tu pourrais tracer juste UNE case ». Les phrases
    // d'aide rappellent la règle — compte les carreaux jusqu'à l'axe, reporte
    // de l'autre côté — mais l'élève qui bloque ne bloque pas sur la règle : il
    // bloque sur le PREMIER report, celui qui n'a aucun repère avant lui. Une
    // case posée pour lui, et tout le reste se compte à partir d'elle.
    //
    // La case donnée entre dans le compte et dans la validation — elle est
    // vraiment tracée, pas montrée — mais elle garde sa marque : on doit
    // pouvoir distinguer, en regardant la figure finie, ce qu'on a trouvé de
    // ce qu'on a reçu.

    /**
     * Le bouton d'indice donne d'abord les PHRASES, puis les CASES. Une case
     * offerte d'entrée priverait de l'effort ; une phrase de plus quand on a
     * déjà tout lu ne sert à rien.
     */
    function brancherIndiceCase() {
        const btn = container.querySelector('[data-hint]');
        if (!btn) return;
        const phrase = btn.onclick;
        const majTexte = () => {
            if (session.hintsAvailable) return;
            btn.disabled = false;
            btn.innerHTML = '<span aria-hidden="true">🎯</span> Trace une case';
        };
        btn.onclick = (e) => {
            if (session.hintsAvailable) { phrase(e); majTexte(); return; }
            montrerUneCase();
            majTexte();
        };
        majTexte();
    }

    /** Pose la prochaine case attendue, dans l'ordre de lecture. */
    function montrerUneCase() {
        if (session.locked || destroyed) return;
        const reste = [...imageAttendue(item.meta)]
            .sort((a, b) => (a.y - b.y) || (a.x - b.x))
            .find(p => !posees.some(q => q.x === p.x && q.y === p.y));
        if (!reste) { statut('Toutes les cases de l\'image sont déjà posées.'); return; }
        const hit = svg.querySelector(`.qd-hit[data-c="${reste.x},${reste.y}"]`);
        if (!hit) return;
        // Une case donnée ne se compte pas comme une aide de plus tant qu'elle
        // ne coûte rien : c'est `session.hint()` qui trace l'usage, et il l'a
        // déjà fait pour les phrases. On note donc la case comme aide ici.
        if (!session.sansTrace) session.hintIndex++;
        posees.push(reste);
        svg.insertBefore(rectangle(hit, 'qd-posee qd-indice', `${reste.x},${reste.y}`),
            sousLesMarques());
        majCompte();
    }

    // --- Colorier -------------------------------------------------------------

    const lire = (hit) => {
        const [x, y] = hit.dataset.c.split(',').map(Number);
        return { x, y };
    };

    function basculer(hit) {
        if (session.locked || destroyed) return;
        const p = lire(hit);
        // ON NE COLORIE PAS SUR LA FIGURE DE DÉPART. Elle est la donnée de
        // l'énoncé : la recouvrir effacerait la question, et une image qui
        // chevaucherait le départ n'est jamais la bonne réponse ici.
        if ((item.meta.depart || []).some(d => d.x === p.x && d.y === p.y)) {
            secouer();
            return;
        }
        const dedans = posees.findIndex(q => q.x === p.x && q.y === p.y);
        if (dedans >= 0) {
            posees.splice(dedans, 1);
            const el = svg.querySelector(`.qd-posee[data-c="${hit.dataset.c}"]`);
            if (el) el.remove();
        } else {
            posees.push(p);
            svg.insertBefore(rectangle(hit, 'qd-posee', hit.dataset.c), sousLesMarques());
        }
        majCompte();
    }

    /** Un carré posé au même endroit qu'une cible, sous les cibles cliquables. */
    function rectangle(hit, classe, cle) {
        const ns = 'http://www.w3.org/2000/svg';
        const r = document.createElementNS(ns, 'rect');
        ['x', 'y', 'width', 'height'].forEach(a => r.setAttribute(a, hit.getAttribute(a)));
        r.setAttribute('class', `qd-case ${classe}`);
        if (cle) r.setAttribute('data-c', cle);
        return r;
    }

    /** Où s'insèrent les cases coloriées : sous l'axe, sous les cibles. */
    const sousLesMarques = () => svg.querySelector('.qd-marques') || svg.querySelector('.qd-hit');

    const echapper = (s) => String(s ?? '').replace(/[&<>]/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    function majCompte() {
        const el = container.querySelector('.qd-compte');
        if (!el) return;
        const n = posees.length, cible = (item.meta.depart || []).length;
        el.textContent = n === 0
            ? `${cible} cases à colorier`
            : `${n} case${n > 1 ? 's' : ''} coloriée${n > 1 ? 's' : ''} sur ${cible}`;
        el.classList.toggle('qd-compte--prete', n === cible);
    }

    function secouer() {
        const p = container.querySelector('.qd-plateau');
        if (!p) return;
        p.classList.remove('qd-plateau--secoue');
        void p.offsetWidth;
        p.classList.add('qd-plateau--secoue');
    }

    // --- Valider --------------------------------------------------------------

    function valider() {
        if (session.locked || destroyed) return;
        const attendu = (item.meta.depart || []).length;
        // UNE FIGURE INCOMPLÈTE N'EST PAS UNE ERREUR, c'est un travail en
        // cours. La compter comme une faute punirait celui qui réfléchit
        // encore, et fausserait le carnet d'erreurs.
        if (posees.length !== attendu) {
            const manque = attendu - posees.length;
            statut(manque > 0
                ? `L'image a autant de cases que la figure de départ : il en manque ${manque}.`
                : `Il y a ${-manque} case${-manque > 1 ? 's' : ''} de trop : l'image en compte ${attendu}.`);
            secouer();
            return;
        }

        const bilan = comparer(imageAttendue(item.meta), posees);
        const result = session.submit(cleFigure(posees), { misconception: diagnostic(bilan) });
        if (result.ignored) return;

        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) { renderNext(); return; }
            if (result.revealed) { montrerLaCorrection(bilan); regTimeout(renderNext, 3400); }
        });
    }

    /** Ce qui ne va pas, dit en cases — jamais « faux ». */
    function diagnostic(bilan) {
        const bouts = [];
        if (bilan.justes) bouts.push(`${bilan.justes} case${bilan.justes > 1 ? 's' : ''} juste${bilan.justes > 1 ? 's' : ''}`);
        if (bilan.oublies.length) bouts.push(`${bilan.oublies.length} oubliée${bilan.oublies.length > 1 ? 's' : ''}`);
        if (bilan.enTrop.length) bouts.push(`${bilan.enTrop.length} en trop`);
        return bouts.length ? `${bouts.join(', ')}. Reprends case par case.` : '';
    }

    /**
     * L'attendu superposé au tracé. Trois états, trois marques : la case juste
     * garde sa couleur, la case oubliée est hachurée, la case en trop est
     * barrée. La couleur seule ne suffirait pas.
     */
    function montrerLaCorrection(bilan) {
        const hitDe = (p) => svg.querySelector(`.qd-hit[data-c="${p.x},${p.y}"]`);
        bilan.oublies.forEach(p => {
            const h = hitDe(p);
            if (h) svg.insertBefore(rectangle(h, 'qd-oubliee'), sousLesMarques());
        });
        bilan.enTrop.forEach(p => {
            const el = svg.querySelector(`.qd-posee[data-c="${p.x},${p.y}"]`);
            if (el) el.classList.add('qd-en-trop');
        });
    }

    function statut(texte) {
        const el = container.querySelector('.qd-compte');
        if (el) { el.textContent = texte; el.classList.remove('qd-compte--prete'); }
    }

    // --- Montre-moi -----------------------------------------------------------
    //
    // Le robot colorie les cases UNE PAR UNE, dans l'ordre de la lecture. Voir
    // apparaître la figure case après case est ce qui enseigne la méthode :
    // on ne trace pas une image d'un trait, on reporte case par case.

    async function runDemo() {
        const cases = [...imageAttendue(item.meta)].sort((a, b) => (a.y - b.y) || (a.x - b.x));
        if (!cases.length) { regTimeout(renderNext, DEMO_SPEED.between); return; }
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        cursor.say(phraseDepart(), container.querySelector('.qd-plateau') || container);
        if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;

        for (const p of cases) {
            const hit = svg.querySelector(`.qd-hit[data-c="${p.x},${p.y}"]`);
            if (!hit) continue;
            if (!await gate.waitTurn() || destroyed) return;
            if (!await cursor.tap(hit) || destroyed) return;
            svg.insertBefore(rectangle(hit, 'qd-posee', `${p.x},${p.y}`), sousLesMarques());
        }

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say(phraseFin(), container.querySelector('.qd-plateau') || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    // Une bulle se lit à peu près à trois cent quarante millisecondes le mot :
    // trois lignes figent la démonstration au point qu'on la croit plantée.
    const COURT = 110;
    const tientEnUneBulle = (t) => typeof t === 'string' && t.trim() && t.trim().length <= COURT;

    function phraseDepart() {
        const indice = (item.hints || [])[0];
        if (tientEnUneBulle(indice)) return indice.trim();
        return 'On prend les cases une par une, jamais la figure d\'un bloc.';
    }

    function phraseFin() {
        if (tientEnUneBulle(item.explanation)) return item.explanation.trim();
        return 'Chaque case reportée, l\'image apparaît toute seule.';
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
