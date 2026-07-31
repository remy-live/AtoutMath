// Activité « Garam » : le treillis d'égalités croisées.
//
// Même genre de réponse que le Mathdoku et le Binairo ('grid'), mêmes gestes.
// La grille n'est pas pleine : les cases occupent des positions éparses d'un
// treillis, les signes (∘ et =) sont posés entre elles — un placement CSS
// grid où chaque élément connaît sa ligne et sa colonne.
//
// Le vérificateur marque des ÉGALITÉS fausses (leurs trois cases), l'indice
// entoure une égalité fausse ou presque complète — le meilleur endroit où
// continuer, exactement comme on résout un Garam.

import { regTimeout } from '../timers.js';
import { hintBar } from './choice.js';
import { brancherGlisserPalette } from './paletteDrag.js';
import { createDemoCursor, DEMO_SPEED } from '../demoPointer.js';
import { OPS_GARAM } from '../generators/garam.js';

const VERIFICATIONS_PAR_GRILLE = 3;
const VIDE = -1;

// Pas de plafond à 9 ici : un résultat à deux chiffres vaut jusqu'à 99.
function evaluer(op, a, b) {
    const v = OPS_GARAM[op].calc(a, b);
    return v === null || v < 0 || !Number.isInteger(v) ? null : v;
}

/** Les cases d'une égalité — quatre quand le résultat s'écrit sur deux. */
function casesDe(eq) {
    return eq.z2 !== undefined ? [eq.a, eq.b, eq.z, eq.z2] : [eq.a, eq.b, eq.z];
}

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;

    let item = null;
    let valeurs = [];   // par indice de case ; VIDE = -1 (0 est une valeur !)
    let verrous = [];
    let verifsRestantes = VERIFICATIONS_PAR_GRILLE;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        verifsRestantes = VERIFICATIONS_PAR_GRILLE;
        render();
    }

    function render() {
        const { structure, givens } = item.meta;
        valeurs = givens.map(v => (v === null ? VIDE : v));
        verrous = givens.map(v => v !== null);

        const cellsHtml = structure.cells.map((pos, i) => {
            const donnee = verrous[i];
            return `<div class="kk-cell ga-cell ${donnee ? 'kk-given' : ''}" role="button"
                 tabindex="${donnee ? -1 : 0}" data-i="${i}"
                 style="grid-row:${pos.r + 1}; grid-column:${pos.c + 1};"
                 aria-label="Case ${i + 1}">
                <span class="kk-val">${donnee ? valeurs[i] : ''}</span>
            </div>`;
        });
        const signesHtml = structure.signes.map(sg =>
            `<span class="ga-signe" style="grid-row:${sg.r + 1}; grid-column:${sg.c + 1};">${sg.glyphe}</span>`);

        const jetons = [];
        for (let v = 0; v <= 9; v++) jetons.push(`<button type="button" class="kk-chip ga-chip" data-chip="${v}">${v}</button>`);
        jetons.push(`<button type="button" class="kk-chip ga-chip kk-chip--gomme" data-chip=""
            aria-label="Effacer une case">⌫</button>`);

        container.innerHTML = `
            <div class="kenken-layout">
                <div class="kenken-context">${item.prompt.html}</div>
                <div class="ga-board" style="--ga-rows:${structure.rows}; --ga-cols:${structure.cols};"
                     role="group" aria-label="Treillis de Garam">
                    ${cellsHtml.join('')}${signesHtml.join('')}
                </div>
                <div class="kk-palette kk-palette--large" aria-label="Chiffres à placer">${jetons.join('')}</div>
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

    const celluleEl = (i) => container.querySelector(`.ga-cell[data-i="${i}"]`);

    function poser(i, valeur) {
        if (verrous[i] || session.locked) return;
        valeurs[i] = valeur;
        celluleEl(i).querySelector('.kk-val').textContent = valeur === VIDE ? '' : valeur;
        container.querySelectorAll('.kk-cage--faux, .kk-cage--indice')
            .forEach(e => e.classList.remove('kk-cage--faux', 'kk-cage--indice'));
        statut('');
    }

    function brancherCases() {
        container.querySelectorAll('.ga-cell').forEach(el => {
            const i = Number(el.dataset.i);
            if (verrous[i]) return;
            // Onze états au défilement (vide, 0…9) : praticable mais long —
            // le clavier et la palette sont les vrais chemins ici.
            const cycle = () => poser(i, valeurs[i] === VIDE ? 0 : (valeurs[i] >= 9 ? VIDE : valeurs[i] + 1));
            el.onclick = cycle;
            el.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); }
                else if (/^[0-9]$/.test(e.key)) poser(i, Number(e.key));
                else if (e.key === 'Backspace' || e.key === 'Delete') poser(i, VIDE);
            };
        });
    }

    function brancherPalette() {
        brancherGlisserPalette(container, {
            bloque: () => session.locked,
            cibleSous(e) {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const cell = el && el.closest ? el.closest('.ga-cell') : null;
                if (!cell) return null;
                return verrous[Number(cell.dataset.i)] ? null : cell;
            },
            deposer(cible, chip) {
                poser(Number(cible.dataset.i), chip.dataset.chip === '' ? VIDE : Number(chip.dataset.chip));
            }
        });
    }

    // --- Vérificateur (limité) ----------------------------------------------

    /** Les égalités complètes et fausses — les incomplètes ne disent rien. */
    function egalitesFausses() {
        return item.meta.structure.equations.filter(eq => {
            if (casesDe(eq).some(i => valeurs[i] === VIDE)) return false;
            const T = eq.z2 !== undefined ? 10 * valeurs[eq.z] + valeurs[eq.z2] : valeurs[eq.z];
            return evaluer(eq.op, valeurs[eq.a], valeurs[eq.b]) !== T;
        });
    }

    function brancherVerificateur() {
        const btn = container.querySelector('[data-verifier]');
        btn.onclick = () => {
            if (verifsRestantes <= 0 || session.locked) return;
            verifsRestantes--;
            container.querySelector('.kk-verif-count').textContent = `(${verifsRestantes})`;
            if (verifsRestantes <= 0) btn.disabled = true;

            const fausses = egalitesFausses();
            fausses.forEach(eq =>
                casesDe(eq).forEach(i => celluleEl(i).classList.add('kk-cage--faux')));

            if (!fausses.length) statut('Toutes les égalités complètes sont justes. Continue !', 'ok');
            else statut(`${fausses.length} égalité${fausses.length > 1 ? 's' : ''} fausse${fausses.length > 1 ? 's' : ''}.`, 'ko');
        };
    }

    // --- Validation ----------------------------------------------------------

    function brancherValidation() {
        container.querySelector('[data-valider]').onclick = () => {
            if (session.locked || destroyed) return;
            const vides = valeurs.filter(v => v === VIDE).length;
            if (vides > 0) {
                statut(`Il reste ${vides} case${vides > 1 ? 's' : ''} à remplir.`, 'ko');
                const board = container.querySelector('.ga-board');
                board.classList.remove('kk-board--secoue');
                void board.offsetWidth;
                board.classList.add('kk-board--secoue');
                return;
            }

            const result = session.submit('g' + valeurs.join('/'));
            if (result.ignored) return;

            container.querySelector('.ga-board').classList.toggle('kk-board--ok', result.correct);
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
            if (niveau === 0) entourerZone();
            else revelerCase();
            if (!session.hintsAvailable) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; }
        };
    }

    /** Une égalité fausse, sinon celle à qui il ne manque qu'une case. */
    function equationCiblee() {
        const fausses = egalitesFausses();
        if (fausses.length) return fausses[0];
        const presque = item.meta.structure.equations
            .map(eq => ({ eq, vides: casesDe(eq).filter(i => valeurs[i] === VIDE).length }))
            .filter(x => x.vides > 0)
            .sort((x, y) => x.vides - y.vides)[0];
        return presque ? presque.eq : null;
    }

    function entourerZone() {
        const eq = equationCiblee();
        if (!eq) return;
        casesDe(eq).forEach(i => celluleEl(i).classList.add('kk-cage--indice'));
    }

    function revelerCase() {
        const { solution } = item.meta;
        let cible = valeurs.findIndex((v, i) => !verrous[i] && v !== VIDE && v !== solution[i]);
        if (cible === -1) {
            const eq = equationCiblee();
            cible = eq ? casesDe(eq).find(i => valeurs[i] === VIDE) ?? -1 : -1;
            if (cible === -1) cible = valeurs.findIndex(v => v === VIDE);
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

    async function runDemo() {
        const { solution } = item.meta;
        if (!cursor) cursor = createDemoCursor();
        if (!await cursor.pause(600) || destroyed) return;
        for (let i = 0; i < valeurs.length; i++) {
            if (valeurs[i] !== VIDE) continue;
            const el = celluleEl(i);
            if (!el) return;
            if (!await cursor.tap(el, 320) || destroyed) return;
            valeurs[i] = solution[i];
            el.querySelector('.kk-val').textContent = solution[i];
            el.classList.add('demo-target');
        }
        container.querySelector('.ga-board').classList.add('kk-board--ok');
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
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
