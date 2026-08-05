// Activité « Binairo » : la grille de 0 et de 1.
//
// Même genre de réponse que le Mathdoku ('grid'), mêmes gestes — appui pour
// faire défiler vide → 0 → 1 → vide, jetons à glisser — mêmes indices
// gradués et même vérificateur limité. Ce qui change est la nature des
// contraintes : plus de cages, mais l'équilibre des chiffres par ligne et par
// colonne et l'interdiction des triples. Le vérificateur marque donc des
// SÉRIES et des LIGNES, pas des zones.
//
// Attention au piège du zéro : ici 0 est une VALEUR. Le vide est -1.

import { regTimeout } from '../timers.js';
import { hintBar } from './choice.js';
import { brancherGlisserPalette } from './paletteDrag.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

const VERIFICATIONS_PAR_GRILLE = 3;
const VIDE = -1;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;

    let item = null;
    let grille = [];
    let verrous = [];
    let verifsRestantes = VERIFICATIONS_PAR_GRILLE;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        verifsRestantes = VERIFICATIONS_PAR_GRILLE;
        render();
    }

    function render() {
        const { n, givens } = item.meta;
        grille = givens.map(ligne => ligne.map(v => (v === null ? VIDE : v)));
        verrous = givens.map(ligne => ligne.map(v => v !== null));

        const cellsHtml = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const donnee = verrous[r][c];
                cellsHtml.push(`
                    <div class="kk-cell bn-cell ${donnee ? 'kk-given' : ''}" role="button"
                         tabindex="${donnee ? -1 : 0}" data-r="${r}" data-c="${c}"
                         aria-label="Case ligne ${r + 1}, colonne ${c + 1}">
                        <span class="kk-val">${donnee ? grille[r][c] : ''}</span>
                    </div>`);
            }
        }

        container.innerHTML = `
            <div class="kenken-layout">
                <div class="kenken-context">${item.prompt.html}</div>
                <div class="kk-board bn-board" style="--kk-n:${n}" role="group" aria-label="Grille de Binairo">
                    ${cellsHtml.join('')}
                </div>
                <div class="kk-palette" aria-label="Chiffres à placer">
                    <button type="button" class="kk-chip" data-chip="0">0</button>
                    <button type="button" class="kk-chip" data-chip="1">1</button>
                    <button type="button" class="kk-chip kk-chip--gomme" data-chip=""
                        aria-label="Effacer une case">⌫</button>
                </div>
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

    const celluleEl = (r, c) => container.querySelector(`.kk-cell[data-r="${r}"][data-c="${c}"]`);

    function poser(r, c, valeur) {
        if (verrous[r][c] || session.locked) return;
        grille[r][c] = valeur;
        celluleEl(r, c).querySelector('.kk-val').textContent = valeur === VIDE ? '' : valeur;
        container.querySelectorAll('.kk-cell--conflit, .kk-cage--faux, .kk-cage--indice')
            .forEach(e => e.classList.remove('kk-cell--conflit', 'kk-cage--faux', 'kk-cage--indice'));
        statut('');
    }

    function brancherCases() {
        container.querySelectorAll('.kk-cell').forEach(el => {
            const r = Number(el.dataset.r), c = Number(el.dataset.c);
            if (verrous[r][c]) return;
            const cycle = () => {
                const v = grille[r][c];
                poser(r, c, v === VIDE ? 0 : (v === 0 ? 1 : VIDE));
            };
            el.onclick = cycle;
            el.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); }
                else if (e.key === '0' || e.key === '1') poser(r, c, Number(e.key));
                else if (e.key === 'Backspace' || e.key === 'Delete') poser(r, c, VIDE);
            };
        });
    }

    function brancherPalette() {
        brancherGlisserPalette(container, {
            bloque: () => session.locked,
            cibleSous(e) {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const cell = el && el.closest ? el.closest('.kk-cell') : null;
                if (!cell) return null;
                return verrous[Number(cell.dataset.r)][Number(cell.dataset.c)] ? null : cell;
            },
            deposer(cible, chip) {
                poser(Number(cible.dataset.r), Number(cible.dataset.c),
                    chip.dataset.chip === '' ? VIDE : Number(chip.dataset.chip));
            }
        });
    }

    // --- Vérificateur (limité) ----------------------------------------------

    /** Séries de trois et lignes/colonnes en excès, sur les cases REMPLIES. */
    function violations() {
        const { n } = item.meta;
        const series = [];      // cases appartenant à un triple
        const excedents = [];   // cases du chiffre en trop dans une ligne/colonne
        const moitie = n / 2;

        const scanner = (cellules) => {
            for (let i = 0; i + 2 < cellules.length; i++) {
                const [a, b, c] = [cellules[i], cellules[i + 1], cellules[i + 2]];
                const v = grille[a.r][a.c];
                if (v !== VIDE && grille[b.r][b.c] === v && grille[c.r][c.c] === v) {
                    series.push(a, b, c);
                }
            }
            for (const v of [0, 1]) {
                const porteurs = cellules.filter(p => grille[p.r][p.c] === v);
                if (porteurs.length > moitie) excedents.push(...porteurs);
            }
        };

        for (let r = 0; r < n; r++) scanner(Array.from({ length: n }, (_, c) => ({ r, c })));
        for (let c = 0; c < n; c++) scanner(Array.from({ length: n }, (_, r) => ({ r, c })));
        return { series, excedents };
    }

    function brancherVerificateur() {
        const btn = container.querySelector('[data-verifier]');
        btn.onclick = () => {
            if (verifsRestantes <= 0 || session.locked) return;
            verifsRestantes--;
            container.querySelector('.kk-verif-count').textContent = `(${verifsRestantes})`;
            if (verifsRestantes <= 0) btn.disabled = true;

            const { series, excedents } = violations();
            series.forEach(({ r, c }) => celluleEl(r, c).classList.add('kk-cage--faux'));
            excedents.forEach(({ r, c }) => celluleEl(r, c).classList.add('kk-cell--conflit'));

            const nbSeries = series.length / 3;
            if (!series.length && !excedents.length) {
                statut('Tout ce qui est rempli respecte les règles. Continue !', 'ok');
            } else {
                statut(`${nbSeries ? `${nbSeries} série${nbSeries > 1 ? 's' : ''} de trois` : ''}`
                    + `${nbSeries && excedents.length ? ' et ' : ''}`
                    + `${excedents.length ? 'un chiffre en trop sur une ligne ou une colonne' : ''}.`, 'ko');
            }
        };
    }

    // --- Validation ----------------------------------------------------------

    function brancherValidation() {
        container.querySelector('[data-valider]').onclick = () => {
            if (session.locked || destroyed) return;
            const vides = grille.flat().filter(v => v === VIDE).length;
            if (vides > 0) {
                statut(`Il reste ${vides} case${vides > 1 ? 's' : ''} à remplir.`, 'ko');
                const board = container.querySelector('.kk-board');
                board.classList.remove('kk-board--secoue');
                void board.offsetWidth;
                board.classList.add('kk-board--secoue');
                return;
            }

            const result = session.submit('g' + grille.map(l => l.join('')).join('/'));
            if (result.ignored) return;

            container.querySelector('.kk-board').classList.toggle('kk-board--ok', result.correct);
            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) { renderNext(); return; }
                if (result.revealed) {
                    const { n, solution } = item.meta;
                    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
                        const el = celluleEl(r, c);
                        el.querySelector('.kk-val').textContent = solution[r][c];
                        if (grille[r][c] !== solution[r][c]) el.classList.add('kk-cell--corrige');
                    }
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

    /**
     * La zone à regarder : les cases fausses s'il y en a, sinon une paire de
     * chiffres identiques adjacents dont une voisine est vide — le motif
     * exact que la consigne apprend à exploiter.
     */
    function entourerZone() {
        const { n, solution } = item.meta;
        const fausses = [];
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            if (grille[r][c] !== VIDE && !verrous[r][c] && grille[r][c] !== solution[r][c]) fausses.push({ r, c });
        }
        if (fausses.length) {
            fausses.forEach(({ r, c }) => celluleEl(r, c).classList.add('kk-cage--indice'));
            return;
        }
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            const v = grille[r][c];
            if (v === VIDE) continue;
            for (const [dr, dc] of [[0, 1], [1, 0]]) {
                const r2 = r + dr, c2 = c + dc;
                if (r2 >= n || c2 >= n || grille[r2][c2] !== v) continue;
                const bouts = [{ r: r - dr, c: c - dc }, { r: r2 + dr, c: c2 + dc }]
                    .filter(p => p.r >= 0 && p.r < n && p.c >= 0 && p.c < n && grille[p.r][p.c] === VIDE);
                if (bouts.length) {
                    [{ r, c }, { r: r2, c: c2 }, bouts[0]]
                        .forEach(p => celluleEl(p.r, p.c).classList.add('kk-cage--indice'));
                    return;
                }
            }
        }
        // Rien d'exploitables : la ligne la plus proche d'être finie.
        let meilleure = null, minVides = Infinity;
        for (let r = 0; r < n; r++) {
            const vides = grille[r].filter(v => v === VIDE).length;
            if (vides > 0 && vides < minVides) { minVides = vides; meilleure = r; }
        }
        if (meilleure !== null) {
            for (let c = 0; c < n; c++) celluleEl(meilleure, c).classList.add('kk-cage--indice');
        }
    }

    function revelerCase() {
        const { n, solution } = item.meta;
        let cible = null;
        for (let r = 0; r < n && !cible; r++) for (let c = 0; c < n && !cible; c++) {
            if (!verrous[r][c] && grille[r][c] !== VIDE && grille[r][c] !== solution[r][c]) cible = { r, c };
        }
        if (!cible) {
            for (let r = 0; r < n && !cible; r++) for (let c = 0; c < n && !cible; c++) {
                if (grille[r][c] === VIDE) cible = { r, c };
            }
        }
        if (!cible) return;
        poser(cible.r, cible.c, solution[cible.r][cible.c]);
        verrous[cible.r][cible.c] = true;
        const el = celluleEl(cible.r, cible.c);
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

    /**
     * Le robot ne remplit plus les cases dans l'ordre de lecture : il joue les
     * coups dans l'ordre où ils se DÉDUISENT, et dit à chaque fois quelle
     * règle il applique. C'est la différence entre montrer la solution et
     * montrer comment on la trouve.
     */
    async function runDemo() {
        const { n, solution } = item.meta;
        if (!cursor) cursor = createDemoCursor();
        // La bulle se pose AUTOUR de la grille, jamais dessus : elle
        // couvrait la ligne de chiffres sur laquelle porte l'explication.
        cursor.protegerZone(container.querySelector('.bn-board, .kk-board'));
        const gate = createDemoGate(container.querySelector('.kenken-layout') || container);
        const fin = () => { cursor.hideBubble(); gate.destroy(); };

        if (!await cursor.pause(600) || destroyed) return fin();
        while (!destroyed) {
            const coup = prochainCoupBinairo(grille, n, solution);
            if (!coup) break;
            if (!await gate.waitTurn() || destroyed) return fin();
            const el = celluleEl(coup.r, coup.c);
            if (!el) return fin();
            cursor.say(coup.motif, el);
            if (!await cursor.tap(el, 340) || destroyed) return fin();
            grille[coup.r][coup.c] = coup.v;
            el.querySelector('.kk-val').textContent = coup.v;
            el.classList.add('demo-target');
            if (!await cursor.pause(900) || destroyed) return fin();
        }
        fin();
        if (destroyed) return;
        container.querySelector('.kk-board').classList.add('kk-board--ok');
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

/**
 * Le prochain coup DÉDUCTIBLE et la règle qui le justifie.
 *
 * Les règles sont essayées dans l'ordre où on les enseigne :
 *   1. deux chiffres identiques qui se suivent → les extrémités portent l'autre ;
 *   2. un trou entre deux identiques → le milieu porte l'autre ;
 *   3. une ligne ou colonne qui a déjà tous ses 0 (ou ses 1) → le reste se complète.
 * S'il n'y a plus rien de déductible par ces règles (rare), on retombe sur la
 * solution avec un motif d'élimination — jamais de coup silencieux.
 */
function prochainCoupBinairo(grille, n, solution) {
    const vide = (r, c) => r >= 0 && r < n && c >= 0 && c < n && grille[r][c] === VIDE;
    const val = (r, c) => (r >= 0 && r < n && c >= 0 && c < n) ? grille[r][c] : VIDE;

    // Règle 1 : X X _  (dans les quatre orientations, horizontal et vertical).
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (!vide(r, c)) continue;
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
            for (const sens of [-1, 1]) {
                const v1 = val(r + sens * dr, c + sens * dc);
                const v2 = val(r + 2 * sens * dr, c + 2 * sens * dc);
                if (v1 !== VIDE && v1 === v2 && solution[r][c] === 1 - v1) {
                    return {
                        r, c, v: 1 - v1,
                        motif: `Deux ${v1} se suivent : jamais trois identiques, je pose un ${1 - v1}.`
                    };
                }
            }
        }
    }

    // Règle 2 : X _ X — le milieu ne peut pas former un triple.
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (!vide(r, c)) continue;
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
            const avant = val(r - dr, c - dc);
            const apres = val(r + dr, c + dc);
            if (avant !== VIDE && avant === apres && solution[r][c] === 1 - avant) {
                return {
                    r, c, v: 1 - avant,
                    motif: `Un ${avant} de chaque côté : un ${avant} au milieu ferait trois identiques, je pose un ${1 - avant}.`
                };
            }
        }
    }

    // Règle 3 : ligne ou colonne qui a déjà son compte d'un chiffre.
    const moitie = n / 2;
    for (let r = 0; r < n; r++) {
        for (const v of [0, 1]) {
            if (grille[r].filter(x => x === v).length !== moitie) continue;
            const c = grille[r].findIndex(x => x === VIDE);
            if (c !== -1 && solution[r][c] === 1 - v) {
                return {
                    r, c, v: 1 - v,
                    motif: `Cette ligne a déjà tous ses ${v} (${moitie} sur ${n} cases) : je complète avec des ${1 - v}.`
                };
            }
        }
    }
    for (let c = 0; c < n; c++) {
        const colonne = Array.from({ length: n }, (_, r) => grille[r][c]);
        for (const v of [0, 1]) {
            if (colonne.filter(x => x === v).length !== moitie) continue;
            const r = colonne.findIndex(x => x === VIDE);
            if (r !== -1 && solution[r][c] === 1 - v) {
                return {
                    r, c, v: 1 - v,
                    motif: `Cette colonne a déjà tous ses ${v} : je complète avec des ${1 - v}.`
                };
            }
        }
    }

    // Rien de déductible par les règles simples : première case vide, par
    // élimination sur la solution.
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (grille[r][c] === VIDE) {
            return {
                r, c, v: solution[r][c],
                motif: `Par élimination, seul un ${solution[r][c]} convient ici sans casser l'équilibre.`
            };
        }
    }
    return null;
}
