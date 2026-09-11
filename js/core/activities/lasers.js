// Activité « Le rayon et les miroirs » : la grille où l'on pose des miroirs.
//
// Rémy : « j'aimerai bien un jeu dans ce style avec des lasers et des miroirs
// […] C'est un exercice bonus comme le sudoku. »
//
// TOUT LE JEU TIENT DANS UN GESTE, et l'écran n'en demande pas un second. On
// touche une case, un miroir apparaît ; on retouche, il bascule dans l'autre
// sens ; une troisième fois, il disparaît. Le rayon se retrace à chaque appui,
// et l'on voit tout de suite s'il arrive. Pas de bouton « vérifier » : ce
// serait demander de confirmer ce qu'on a sous les yeux. C'est la même règle
// que pour le circuit d'eau, et pour la même raison.
//
// LE RAYON EST UN SEUL TRAIT, PAS UNE SUITE DE SEGMENTS DE CASE.
//
// Première tentative : un petit trait dessiné dans chaque case traversée. À
// l'écran, les traits ne se rejoignaient pas exactement aux frontières — un
// demi-pixel d'écart par case, et le rayon avait l'air pointillé. On construit
// donc UNE polyligne, avec un point au centre de chaque case où le rayon tourne
// et un point à l'entrée et à la sortie : un seul tracé, aucune jointure à
// tenir.
//
// LE BUDGET SE VOIT AVANT D'ÊTRE DÉPASSÉ. Les miroirs restants sont comptés en
// haut, et le geste qui dépasserait est refusé avec sa raison — plutôt que
// laissé faire puis reproché. Un état interdit qui existe quand même est un
// piège, et l'élève devrait défaire lui-même ce que l'écran a accepté.

import { regTimeout } from '../timers.js';
import { hintBar } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import {
    VIDE, MUR, MINE, MIROIRS, PAS, tracer, poserMiroir, miroirsPoses, ditLeReste
} from '../lasers.js';

/** Le côté d'une case dans le dessin : tout le reste s'exprime en fractions. */
const C = 100;

/**
 * LA MARGE AUTOUR DE LA GRILLE, ET ELLE N'EST PAS DÉCORATIVE.
 *
 * L'émetteur est DEHORS : le rayon vient de l'extérieur, c'est ce qui rend la
 * première case aussi ordinaire que les autres. Sans marge, il était dessiné
 * en coordonnées négatives et le cadre le coupait — mesuré à l'écran : la
 * source du premier niveau était invisible, et l'on ne savait pas d'où partait
 * le trait rouge.
 */
const MARGE = 40;

/** Les directions dites comme on les dirait à un élève. */
const MOTS = { E: 'la droite', O: 'la gauche', N: 'le haut', S: 'le bas' };

export function mount(container, session) {
    let destroyed = false;
    let cursor = null;

    let item = null;
    let g = null;         // la grille telle qu'elle est à l'écran
    let fini = false;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        const m = item.meta;
        g = {
            n: m.n, cases: [...m.depart], fixes: [...m.fixes],
            source: m.source, cibles: m.cibles, budget: m.budget, solution: m.solution
        };
        fini = false;
        render();
    }

    // --- Le dessin ------------------------------------------------------------

    /** Le milieu d'une case, en coordonnées du dessin. */
    const centre = (x, y) => [x * C + C / 2, y * C + C / 2];

    /**
     * LE TRAJET DU RAYON, EN UNE SEULE POLYLIGNE.
     *
     * On part du bord de la grille — le rayon vient de la source, qui est
     * DEHORS —, on passe par le centre de chaque case où il tourne, et l'on
     * finit soit sur la cible, soit au bord par où il sort.
     */
    function traitDuRayon(r) {
        if (!r.chemin.length) return '';
        const pts = [];
        const p0 = r.chemin[0];
        const [dx0, dy0] = PAS[p0.entre];
        const [cx0, cy0] = centre(p0.x, p0.y);
        pts.push([cx0 - dx0 * C / 2, cy0 - dy0 * C / 2]);
        r.chemin.forEach(p => pts.push(centre(p.x, p.y)));
        const der = r.chemin[r.chemin.length - 1];
        if (r.fin === 'sortie') {
            const [dx, dy] = PAS[der.sort];
            const [cx, cy] = centre(der.x, der.y);
            pts.push([cx + dx * C / 2, cy + dy * C / 2]);
        }
        return pts.map(p => p.join(',')).join(' ');
    }

    /** La source : un émetteur posé contre le bord, tourné vers l'intérieur. */
    function sourceSvg() {
        const [cx, cy] = centre(g.source.x, g.source.y);
        const [dx, dy] = PAS[g.source.sens];
        const x = cx - dx * (C / 2 + 16);
        const y = cy - dy * (C / 2 + 16);
        const angle = { E: 0, S: 90, O: 180, N: 270 }[g.source.sens];
        return `<g class="la-source" transform="translate(${x} ${y}) rotate(${angle})">
            <rect x="-20" y="-15" width="34" height="30" rx="7"/>
            <circle class="la-oeil" cx="14" cy="0" r="7"/>
        </g>`;
    }

    /**
     * LES CRISTAUX, allumés un par un.
     *
     * Chacun porte son NUMÉRO D'ORDRE quand il y en a plusieurs — non pour dire
     * dans quel ordre les prendre (ce serait donner la réponse), mais pour
     * qu'on puisse en parler et compter ceux qui restent. C'est le rayon qui
     * impose l'ordre, pas le dessin.
     */
    function ciblesSvg(allumees) {
        return g.cibles.map((c, k) => {
            const [cx, cy] = centre(c.x, c.y);
            const on = allumees.has(k);
            return `<g class="la-cible${on ? ' la-cible--allumee' : ''}"
                transform="translate(${cx} ${cy})">
                <path d="M0,-30 L24,0 L0,30 L-24,0 Z"/>
                <path class="la-cible-coeur" d="M0,-15 L12,0 L0,15 L-12,0 Z"/>
            </g>`;
        }).join('');
    }

    function caseSvg(i) {
        const x = i % g.n, y = Math.floor(i / g.n);
        const quoi = g.cases[i];
        const fixe = g.fixes[i];
        const [cx, cy] = centre(x, y);
        if (quoi === MUR) {
            return `<rect class="la-mur" x="${x * C + 6}" y="${y * C + 6}"
                width="${C - 12}" height="${C - 12}" rx="8"/>`;
        }
        // LA MINE : une étoile hérissée, qui ne ressemble à rien d'autre sur la
        // grille. Un rond rouge se serait confondu avec un cristal éteint, et
        // c'est justement la case qu'il ne faut pas confondre.
        if (quoi === MINE) {
            const branches = [];
            for (let k = 0; k < 8; k++) {
                const a = (k * Math.PI) / 4;
                const r1 = k % 2 ? 12 : 26;
                branches.push(`${(cx + Math.cos(a) * r1).toFixed(1)},${(cy + Math.sin(a) * r1).toFixed(1)}`);
            }
            return `<g class="la-mine"><polygon points="${branches.join(' ')}"/>
                <circle cx="${cx}" cy="${cy}" r="6"/></g>`;
        }
        if (!MIROIRS.includes(quoi)) return '';
        // UN MIROIR EST UN TRAIT ÉPAIS AVEC UN DOS. Le trait fin seul se
        // confondait avec le rayon quand les deux se croisaient ; le dos
        // sombre dit de quel côté la lumière ne passe pas.
        const d = quoi === '/'
            ? `M${cx - 30},${cy + 30} L${cx + 30},${cy - 30}`
            : `M${cx - 30},${cy - 30} L${cx + 30},${cy + 30}`;
        return `<g class="la-miroir${fixe ? ' la-miroir--fixe' : ''}">
            <path class="la-miroir-dos" d="${d}"/>
            <path class="la-miroir-face" d="${d}"/>
        </g>`;
    }

    function render() {
        const cases = g.cases.map((_, i) => `<button type="button" class="la-case"
            data-i="${i}" aria-label="Ligne ${Math.floor(i / g.n) + 1}, colonne ${(i % g.n) + 1}"
            ></button>`).join('');

        container.innerHTML = `
            <div class="la-layout">
                <div class="la-context">${item.prompt.html}</div>
                <div class="la-barre">
                    <div class="la-compteur" data-compteur></div>
                    ${g.cibles.length > 1
        ? '<div class="la-compteur la-compteur--cristaux" data-cristaux></div>' : ''}
                    <button type="button" class="la-btn-doux" data-recommencer>Tout enlever</button>
                </div>
                <div class="la-board" style="--la-n:${g.n}" role="group"
                     aria-label="Grille du rayon">
                    <svg class="la-svg" aria-hidden="true"
                        viewBox="${-MARGE} ${-MARGE} ${g.n * C + 2 * MARGE} ${g.n * C + 2 * MARGE}">
                        <g class="la-quadrillage" data-quadrillage></g>
                        <g data-pieces></g>
                        <polyline class="la-rayon" data-rayon points=""/>
                        <g data-source></g>
                        <g data-cible></g>
                    </svg>
                    <div class="la-cases" style="--la-n:${g.n}">${cases}</div>
                </div>
                <div class="la-status" role="status"></div>
                ${hintBar(session)}
            </div>`;

        // Le quadrillage ne bouge jamais : on le dessine une fois.
        const q = [];
        for (let k = 0; k <= g.n; k++) {
            q.push(`<line x1="${k * C}" y1="0" x2="${k * C}" y2="${g.n * C}"/>`);
            q.push(`<line x1="0" y1="${k * C}" x2="${g.n * C}" y2="${k * C}"/>`);
        }
        container.querySelector('[data-quadrillage]').innerHTML = q.join('');

        peindre();

        if (session.isDemo) {
            if (!session.frozen) runDemo();
            return;
        }
        brancherCases();
        brancherRecommencer();
        brancherIndices();
    }

    // --- L'état, repeint après chaque geste ----------------------------------

    /**
     * REPEINDRE : le rayon, les pièces, le compteur.
     *
     * Tout se relit dans `tracer`, sur la grille telle qu'elle est à cet
     * instant. Aucun état d'affichage n'est tenu à part, donc rien ne peut
     * diverger de ce que le noyau calcule.
     */
    function peindre() {
        const r = tracer(g);
        container.querySelector('[data-pieces]').innerHTML =
            g.cases.map((_, i) => caseSvg(i)).join('');
        const ray = container.querySelector('[data-rayon]');
        ray.setAttribute('points', traitDuRayon(r));
        ray.classList.toggle('la-rayon--arrive', r.touche);
        container.querySelector('[data-source]').innerHTML = sourceSvg();
        container.querySelector('[data-cible]').innerHTML = ciblesSvg(r.allumees);

        const reste = g.budget - miroirsPoses(g.cases, g.fixes);
        const c = container.querySelector('[data-compteur]');
        c.innerHTML = `<b>${reste}</b> <span>miroir${reste > 1 ? 's' : ''} `
            + `à poser sur ${g.budget}</span>`;
        c.classList.toggle('la-compteur--vide', reste === 0);
        // LE COMPTE DES CRISTAUX, quand il y en a plus d'un : c'est le second
        // chiffre du jeu, et sans lui on ne sait pas si l'on progresse.
        const cr = container.querySelector('[data-cristaux]');
        if (cr) {
            // L'ACCORD SUIT LE NOMBRE ALLUMÉ, PAS LE TOTAL. Écrit à l'envers,
            // cela donnait « 1 cristaux sur 2 allumé » — vu à l'écran, et c'est
            // le genre de faute qu'un professeur de mathématiques ne laisse pas
            // passer plus qu'un autre.
            const k = r.allumees.size;
            cr.innerHTML = `<b>${k}</b> <span>${k > 1 ? 'cristaux' : 'cristal'} `
                + `sur ${g.cibles.length} allumé${k > 1 ? 's' : ''}</span>`;
            cr.classList.toggle('la-compteur--plein', k === g.cibles.length);
        }
        return r;
    }

    function statut(texte, ton = '') {
        const el = container.querySelector('.la-status');
        if (!el) return;
        el.textContent = texte;
        el.className = `la-status${ton ? ` la-status--${ton}` : ''}`;
    }

    // --- Les gestes -----------------------------------------------------------

    function jouer(i) {
        if (session.locked || fini || destroyed) return;
        const res = poserMiroir(g, i);
        if (res.refus) { statut(res.refus, 'ko'); return; }
        g = { ...g, cases: res.cases };
        statut('');
        const r = peindre();
        // LE RAYON QUI N'ARRIVE PAS DIT POURQUOI, sans dire quoi faire : « il
        // sort de la grille » se corrige, « raté » se subit. Et l'on ne dit
        // rien tant qu'il reste des miroirs à poser — commenter un trajet
        // inachevé serait reprocher de ne pas avoir fini.
        if (r.touche) { terminer(); return; }
        if (miroirsPoses(g.cases, g.fixes) >= g.budget) statut(ditLeReste(g, r), 'ko');
    }

    function brancherCases() {
        container.querySelectorAll('.la-case[data-i]').forEach(el => {
            el.onclick = () => jouer(Number(el.dataset.i));
        });
    }

    function brancherRecommencer() {
        container.querySelector('[data-recommencer]').onclick = () => {
            if (session.locked || fini) return;
            // ON REVIENT AU DÉPART, ET LE BUDGET AVEC. C'est le bouton qui rend
            // le budget jouable : on essaie, on voit qu'on s'est trompé de
            // trajet, on repart en sachant où l'on va. Les miroirs vissés
            // restent — ils ne sont pas à nous.
            g = { ...g, cases: g.cases.map((c, i) => (g.fixes[i] ? c
                : ((c === MUR || c === MINE) ? c : VIDE))) };
            statut('');
            peindre();
        };
    }

    // --- La fin ----------------------------------------------------------------

    function terminer() {
        fini = true;
        container.querySelector('.la-board').classList.add('la-board--ok');
        const result = session.submit('rayon-arrive');
        if (result.ignored) return;
        statut(g.cibles.length > 1
            ? `Les ${g.cibles.length} cristaux sont allumés !` : 'Le cristal est allumé !', 'ok');
        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.revealed) { montrerSolution(); regTimeout(renderNext, 2600); return; }
            renderNext();
        });
    }

    function montrerSolution() {
        g = { ...g, cases: [...g.solution] };
        peindre();
        container.querySelector('.la-board').classList.add('la-board--ok');
    }

    // --- Indices ----------------------------------------------------------------

    function brancherIndices() {
        const btn = container.querySelector('[data-hint]');
        if (!btn) return;
        btn.onclick = () => {
            const niveau = session.hintIndex;
            const h = session.hint();
            if (!h) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; return; }
            // LE TROISIÈME INDICE DÉSIGNE UNE CASE, ET NE POSE RIEN. Le geste
            // reste celui de l'élève, sinon l'indice devient la réponse.
            if (niveau >= 2) designerLaCase();
            if (!session.hintsAvailable) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; }
        };
    }

    /** La première case de la solution où il manque un miroir. */
    function prochaineCase() {
        for (let i = 0; i < g.solution.length; i++) {
            if (MIROIRS.includes(g.solution[i]) && !MIROIRS.includes(g.cases[i])) return i;
        }
        return -1;
    }

    function designerLaCase() {
        container.querySelectorAll('.la-case--indice')
            .forEach(e => e.classList.remove('la-case--indice'));
        const i = prochaineCase();
        if (i < 0) return;
        const el = container.querySelector(`.la-case[data-i="${i}"]`);
        if (el) el.classList.add('la-case--indice');
        statut('Un miroir manque ici — reste à trouver dans quel sens.', 'ok');
    }

    // --- Démonstration -----------------------------------------------------------

    async function runDemo() {
        if (!cursor) cursor = createDemoCursor();
        cursor.protegerZone(container.querySelector('.la-board'));
        const gate = createDemoGate(container.querySelector('.la-layout') || container);
        const fin = () => { cursor?.hideBubble(); gate?.destroy(); };

        // LE PRINCIPE D'ABORD, EN UNE PHRASE. Rémy : « de manière générale, il
        // faut que le texte du robot soit très court. Et qu'il explique le
        // principe. » Une bulle qu'on lit en une seconde peut être lue ; une
        // bulle de trois lignes est sautée, et le robot n'a plus rien montré.
        cursor.say('Un miroir fait tourner le rayon d’un quart de tour.',
            container.querySelector('.la-board'));
        if (!await cursor.pause(1200) || destroyed) return fin();
        while (!destroyed) {
            const i = prochaineCase();
            if (i < 0) break;
            if (!await gate.waitTurn() || destroyed) return fin();
            const el = container.querySelector(`.la-case[data-i="${i}"]`);
            if (!el) return fin();
            const vise = g.solution[i];
            // ET ENSUITE, RIEN QUE LE VIRAGE, avec ses vraies directions : le
            // texte d'avant disait « ce qui allait à droite » quel que soit le
            // sens réel du rayon, ce qui était faux une fois sur deux.
            cursor.say(`Ici : ${virageDit(i, vise)}.`, el);
            // Le robot appuie autant de fois qu'il faut pour arriver au bon
            // sens : c'est le geste de l'élève, montré tel quel.
            for (let k = 0; k < 3 && g.cases[i] !== vise; k++) {
                if (!await cursor.tap(el, 340) || destroyed) return fin();
                const res = poserMiroir(g, i);
                if (!res.refus) g = { ...g, cases: res.cases };
                peindre();
                if (!await cursor.pause(280) || destroyed) return fin();
            }
            if (!await cursor.pause(600) || destroyed) return fin();
        }
        fin();
        if (destroyed) return;
        container.querySelector('.la-board').classList.add('la-board--ok');
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    /**
     * LE VIRAGE, DIT EN CINQ MOTS : « la droite devient le haut ».
     *
     * On le lit sur le trajet plutôt que sur le miroir : c'est la direction
     * RÉELLE du rayon à cet endroit qui compte, et elle dépend de tout ce qui
     * précède.
     */
    function virageDit(i, miroir) {
        const essai = g.cases.slice();
        essai[i] = miroir;
        const r = tracer({ ...g, cases: essai });
        const p = r.chemin.find(c => c.y * g.n + c.x === i);
        if (!p) return miroir === '/' ? 'la droite devient le haut' : 'la droite devient le bas';
        return `${MOTS[p.entre]} devient ${MOTS[p.sort]}`;
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        montrerSolution() { montrerSolution(); return true; },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
