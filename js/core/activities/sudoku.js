// Activité « Sudoku » : la grille aux blocs, trois tailles.
//
// Même genre de réponse que le Mathdoku, le Binairo et le Garam ('grid'),
// mêmes gestes : palette de chiffres, clic qui fait défiler, clavier,
// vérificateur limité, indices gradués. Les chiffres de l'élève s'écrivent en
// bleu, les données en noir — comme au crayon sur une grille imprimée.
//
// Le robot résout comme on apprend à résoudre : candidat unique (« il ne
// reste que le 4 ») puis single caché (« dans ce bloc, le 5 n'a qu'une place
// possible ») — chaque coup expliqué dans une bulle, pause et pas-à-pas.

import { regTimeout } from '../timers.js';
import { hintBar } from './choice.js';
import { brancherGlisserPalette } from './paletteDrag.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { unitesDe } from '../generators/sudoku.js';

const VERIFICATIONS_PAR_GRILLE = 3;
const VIDE = 0;   // au sudoku, 0 n'est jamais une valeur

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;

    let item = null;
    let valeurs = [];
    let verrous = [];
    let unites = [];
    let voisines = [];
    let verifsRestantes = VERIFICATIONS_PAR_GRILLE;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        verifsRestantes = VERIFICATIONS_PAR_GRILLE;
        render();
    }

    function render() {
        const { n, br, bc, givens } = item.meta;
        valeurs = givens.map(v => (v === null ? VIDE : v));
        verrous = givens.map(v => v !== null);
        unites = unitesDe(n, br, bc);
        voisines = Array.from({ length: n * n }, () => new Set());
        for (const u of unites) for (const a of u) for (const b of u) if (a !== b) voisines[a].add(b);

        const cellsHtml = valeurs.map((v, i) => {
            const r = Math.floor(i / n), c = i % n;
            const bords = `${(c + 1) % bc === 0 && c < n - 1 ? ' su-br' : ''}${(r + 1) % br === 0 && r < n - 1 ? ' su-bb' : ''}`;
            const donnee = verrous[i];
            return `<div class="kk-cell su-cell${bords} ${donnee ? 'kk-given' : ''}" role="button"
                 tabindex="${donnee ? -1 : 0}" data-i="${i}"
                 aria-label="Ligne ${r + 1}, colonne ${c + 1}">
                <span class="kk-val">${donnee ? v : ''}</span>
            </div>`;
        });

        const jetons = [];
        for (let v = 1; v <= n; v++) jetons.push(`<button type="button" class="kk-chip su-chip" data-chip="${v}">${v}</button>`);
        jetons.push(`<button type="button" class="kk-chip su-chip kk-chip--gomme" data-chip=""
            aria-label="Effacer une case">⌫</button>`);

        container.innerHTML = `
            <div class="kenken-layout">
                <div class="kenken-context">${item.prompt.html}</div>
                <div class="su-board" style="--su-n:${n};" role="group" aria-label="Grille de sudoku ${n} par ${n}">
                    ${cellsHtml.join('')}
                </div>
                <div class="kk-palette ${n > 6 ? 'kk-palette--large' : ''}" aria-label="Chiffres à placer">${jetons.join('')}</div>
                <div class="kk-actions">
                    <button type="button" class="btn-hint kk-btn-verif" data-verifier>
                        Vérifier <span class="kk-verif-count">(${verifsRestantes})</span>
                    </button>
                    <button type="button" class="kk-btn-valider" data-valider>Valider</button>
                </div>
                <div class="kk-status" role="status"></div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) {
            if (!session.frozen) runDemo();
            return;
        }

        brancherCases();
        brancherPalette();
        brancherVerificateur();
        brancherValidation();
        brancherIndices();
    }

    // --- Saisie -------------------------------------------------------------

    const celluleEl = (i) => container.querySelector(`.su-cell[data-i="${i}"]`);
    const N = () => item.meta.n;

    function poser(i, valeur) {
        if (verrous[i] || session.locked) return;
        valeurs[i] = valeur;
        celluleEl(i).querySelector('.kk-val').textContent = valeur === VIDE ? '' : valeur;
        container.querySelectorAll('.kk-cage--faux, .kk-cage--indice')
            .forEach(e => e.classList.remove('kk-cage--faux', 'kk-cage--indice'));
        statut('');
    }

    function brancherCases() {
        container.querySelectorAll('.su-cell').forEach(el => {
            const i = Number(el.dataset.i);
            if (verrous[i]) return;
            const cycle = () => poser(i, valeurs[i] >= N() ? VIDE : valeurs[i] + 1);
            el.onclick = cycle;
            el.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); }
                else if (/^[0-9]$/.test(e.key)) {
                    const v = Number(e.key);
                    if (v >= 1 && v <= N()) poser(i, v);
                }
                else if (e.key === 'Backspace' || e.key === 'Delete') poser(i, VIDE);
            };
        });
    }

    function brancherPalette() {
        brancherGlisserPalette(container, {
            bloque: () => session.locked,
            cibleSous(e) {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const cell = el && el.closest ? el.closest('.su-cell') : null;
                if (!cell) return null;
                return verrous[Number(cell.dataset.i)] ? null : cell;
            },
            deposer(cible, chip) {
                poser(Number(cible.dataset.i), chip.dataset.chip === '' ? VIDE : Number(chip.dataset.chip));
            }
        });
    }

    // --- Déductions (partagées entre indices et robot) ------------------------

    function candidatsDe(i) {
        const pris = new Set();
        for (const j of voisines[i]) if (valeurs[j] !== VIDE) pris.add(valeurs[j]);
        const libres = [];
        for (let v = 1; v <= N(); v++) if (!pris.has(v)) libres.push(v);
        return libres;
    }

    /** Le prochain coup FORCÉ : candidat unique, sinon single caché. */
    function prochainCoup() {
        for (let i = 0; i < valeurs.length; i++) {
            if (valeurs[i] !== VIDE) continue;
            const cs = candidatsDe(i);
            if (cs.length === 1) return { i, v: cs[0], mode: 'unique' };
        }
        const n = N();
        for (let u = 0; u < unites.length; u++) {
            for (let v = 1; v <= n; v++) {
                if (unites[u].some(i => valeurs[i] === v)) continue;
                const places = unites[u].filter(i => valeurs[i] === VIDE && candidatsDe(i).includes(v));
                if (places.length === 1) {
                    return { i: places[0], v, mode: 'cache', unite: u < n ? 'ligne' : (u < 2 * n ? 'colonne' : 'bloc') };
                }
            }
        }
        return null;
    }

    // --- Vérificateur (limité) : les CONFLITS visibles ------------------------

    function conflits() {
        const fautifs = new Set();
        for (const u of unites) {
            const vus = {};
            for (const i of u) {
                if (valeurs[i] === VIDE) continue;
                if (vus[valeurs[i]] !== undefined) { fautifs.add(i); fautifs.add(vus[valeurs[i]]); }
                else vus[valeurs[i]] = i;
            }
        }
        return [...fautifs];
    }

    function brancherVerificateur() {
        const btn = container.querySelector('[data-verifier]');
        btn.onclick = () => {
            if (verifsRestantes <= 0 || session.locked) return;
            verifsRestantes--;
            container.querySelector('.kk-verif-count').textContent = `(${verifsRestantes})`;
            if (verifsRestantes <= 0) btn.disabled = true;

            const fautifs = conflits();
            fautifs.forEach(i => celluleEl(i).classList.add('kk-cage--faux'));
            if (!fautifs.length) statut('Aucun chiffre en double pour l\'instant. Continue !', 'ok');
            else statut('Des chiffres se répètent dans une ligne, une colonne ou un bloc.', 'ko');
        };
    }

    // --- Validation ----------------------------------------------------------

    function brancherValidation() {
        container.querySelector('[data-valider]').onclick = () => {
            if (session.locked || destroyed) return;
            const vides = valeurs.filter(v => v === VIDE).length;
            if (vides > 0) {
                statut(`Il reste ${vides} case${vides > 1 ? 's' : ''} à remplir.`, 'ko');
                const board = container.querySelector('.su-board');
                board.classList.remove('kk-board--secoue');
                void board.offsetWidth;
                board.classList.add('kk-board--secoue');
                return;
            }

            const result = session.submit('g' + valeurs.join('/'));
            if (result.ignored) return;

            container.querySelector('.su-board').classList.toggle('kk-board--ok', result.correct);
            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) { renderNext(); return; }
                if (result.revealed) {
                    const { solution } = item.meta;
                    solution.forEach((v, i) => {
                        const el = celluleEl(i);
                        el.querySelector('.kk-val').textContent = v;
                        if (valeurs[i] !== v) el.classList.add('kk-cell--corrige');
                    });
                    regTimeout(renderNext, 2600);
                }
            });
        };
    }

    // --- Indices gradués ------------------------------------------------------

    function brancherIndices() {
        const btn = container.querySelector('[data-hint]');
        if (!btn) return;
        btn.onclick = () => {
            const niveau = session.hintIndex;
            const h = session.hint();
            if (!h) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; return; }
            if (niveau === 0) entourerCoup();
            else revelerCase();
            if (!session.hintsAvailable) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; }
        };
    }

    function entourerCoup() {
        // Une erreur d'abord ; sinon la case du prochain coup forcé.
        const faux = valeurs.findIndex((v, i) => !verrous[i] && v !== VIDE && v !== item.meta.solution[i]);
        if (faux !== -1) {
            celluleEl(faux).classList.add('kk-cage--faux');
            statut('La case marquée contient une erreur.', 'ko');
            return;
        }
        const coup = prochainCoup();
        if (!coup) return;
        celluleEl(coup.i).classList.add('kk-cage--indice');
        statut(coup.mode === 'unique'
            ? 'Dans la case entourée, un seul chiffre est encore possible.'
            : `Dans sa ${coup.unite}, un chiffre n'a plus que cette case pour se placer.`, 'ok');
    }

    function revelerCase() {
        const { solution } = item.meta;
        let cible = valeurs.findIndex((v, i) => !verrous[i] && v !== VIDE && v !== solution[i]);
        if (cible === -1) {
            const coup = prochainCoup();
            cible = coup ? coup.i : valeurs.findIndex(v => v === VIDE);
        }
        if (cible === -1) return;
        poser(cible, solution[cible]);
        verrous[cible] = true;
        const el = celluleEl(cible);
        el.classList.add('kk-revealed');
        el.onclick = null;
        el.tabIndex = -1;
    }

    // --- Divers ---------------------------------------------------------------

    function statut(texte, ton = '') {
        const el = container.querySelector('.kk-status');
        if (!el) return;
        el.textContent = texte;
        el.className = `kk-status${ton ? ` kk-status--${ton}` : ''}`;
    }

    // Le robot joue les coups forcés dans l'ordre où on les enseigne, et dit
    // à chaque fois POURQUOI le chiffre est obligé.
    async function runDemo() {
        const { solution } = item.meta;
        if (!cursor) cursor = createDemoCursor();
        // La bulle se pose AUTOUR de la grille, jamais dessus : elle
        // couvrait la ligne de chiffres sur laquelle porte l'explication.
        cursor.protegerZone(container.querySelector('.su-board, .kk-board'));
        const gate = createDemoGate(container.querySelector('.kk-actions') || container);
        const fin = () => { cursor.hideBubble(); gate.destroy(); };

        if (!await cursor.pause(600) || destroyed) return fin();
        cursor.say(`Chaque chiffre de 1 à ${N()} n'apparaît qu'une fois par ligne, colonne et bloc. Je cherche les cases OBLIGÉES.`,
            container.querySelector('.su-board'));
        if (!await cursor.pause(2200) || destroyed) return fin();

        let coup;
        while ((coup = prochainCoup())) {
            if (!await gate.waitTurn() || destroyed) return fin();
            const el = celluleEl(coup.i);
            if (!el) return fin();
            cursor.say(coup.mode === 'unique'
                ? `Sa ligne, sa colonne et son bloc utilisent déjà tous les autres chiffres : il ne reste que le ${coup.v}.`
                : `Dans cette ${coup.unite}, le ${coup.v} n'a plus qu'UNE place possible : celle-ci.`, el);
            if (!await cursor.pause(2100) || destroyed) return fin();
            if (!await cursor.tap(el, 320) || destroyed) return fin();
            valeurs[coup.i] = coup.v;
            el.querySelector('.kk-val').textContent = coup.v;
            el.classList.add('demo-target');
        }
        // Filet (jamais en théorie : les grilles sont résolubles par singles).
        for (let i = 0; i < valeurs.length; i++) {
            if (valeurs[i] !== VIDE) continue;
            const el = celluleEl(i);
            if (!el || !await cursor.tap(el, 300) || destroyed) return fin();
            valeurs[i] = solution[i];
            el.querySelector('.kk-val').textContent = solution[i];
        }
        cursor.say('Grille terminée : aucune ligne, colonne ou bloc n\'a de doublon !',
            container.querySelector('.su-board'));
        container.querySelector('.su-board').classList.add('kk-board--ok');
        if (!await cursor.pause(DEMO_SPEED.between + 600) || destroyed) return fin();
        fin();
        renderNext();
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
