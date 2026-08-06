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
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
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

        // Les deux cases d'un résultat double s'ACCOLENT VERTICALEMENT, comme
        // sur les fiches : le résultat d'une verticale s'écrit de haut en bas,
        // dizaines puis unités, et les deux cases doivent se lire comme un
        // seul nombre.
        const dizaines = new Set(), unites = new Set();
        structure.equations.forEach(eq => {
            if (eq.z2 !== undefined) { dizaines.add(eq.z); unites.add(eq.z2); }
        });

        const cellsHtml = structure.cells.map((pos, i) => {
            const donnee = verrous[i];
            const accole = dizaines.has(i) ? ' ga-cell--diz' : (unites.has(i) ? ' ga-cell--uni' : '');
            return `<div class="kk-cell ga-cell${accole} ${donnee ? 'kk-given' : ''}" role="button"
                 tabindex="${donnee ? -1 : 0}" data-i="${i}"
                 style="grid-row:${pos.r + 1}; grid-column:${pos.c + 1};"
                 aria-label="Case ${i + 1}">
                <span class="kk-val">${donnee ? valeurs[i] : ''}</span>
            </div>`;
        });
        const signesHtml = structure.signes.map(sg =>
            `<span class="ga-signe" style="grid-row:${sg.r + 1}; grid-column:${sg.c + 1};">${sg.glyphe}</span>`);

        // Le treillis authentique est COMPACT : les pistes qui ne portent que
        // des SIGNES sont deux fois plus étroites que celles des cases. La
        // règle vaut dans les deux sens — la rangée des unités d'un résultat
        // vertical est collée à celle des dizaines, sans rangée de signes
        // entre elles, donc à hauteur pleine bien que de rang impair.
        const piste = (n, occupe) => Array.from({ length: n }, (_, i) => occupe(i) ? '1fr' : '0.5fr');
        const colW = piste(structure.cols, c => structure.cells.some(p => p.c === c));
        const rowH = piste(structure.rows, r => structure.cells.some(p => p.r === r));
        const somme = (arr) => arr.reduce((s, v) => s + parseFloat(v), 0);
        // `--ga-unites` = la largeur du plateau en « pistes de case ». Les
        // chiffres s'y accrochent : sur un Garam géant, une taille de police
        // calée sur la hauteur du CONTENEUR débordait des cases de 19 px.
        const gabarit = `--ga-ratio:${(somme(colW) / somme(rowH)).toFixed(3)};`
            + `--ga-unites:${somme(colW).toFixed(1)};`
            + `grid-template-columns:${colW.join(' ')};grid-template-rows:${rowH.join(' ')};`;

        const jetons = [];
        for (let v = 0; v <= 9; v++) jetons.push(`<button type="button" class="kk-chip ga-chip" data-chip="${v}">${v}</button>`);
        jetons.push(`<button type="button" class="kk-chip ga-chip kk-chip--gomme" data-chip=""
            aria-label="Effacer une case">⌫</button>`);

        container.innerHTML = `
            <div class="kenken-layout">
                <div class="kenken-context">${item.prompt.html}</div>
                <div class="ga-board" style="${gabarit}"
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

    // Le robot résout COMME ON RÉSOUT UN GARAM : il cherche une égalité où il
    // ne manque qu'une case, dit le calcul qui la donne, la remplit — et
    // chaque case posée en débloque d'autres. Pause et pas-à-pas compris.
    async function runDemo() {
        const { structure, solution } = item.meta;
        if (!cursor) cursor = createDemoCursor();
        // La bulle se pose AUTOUR de la grille, jamais dessus : elle
        // couvrait la ligne de chiffres sur laquelle porte l'explication.
        cursor.protegerZone(container.querySelector('.ga-board, .kk-board'));
        const gate = createDemoGate(container.querySelector('.kk-actions') || container);
        const fin = () => { cursor.hideBubble(); gate.destroy(); };

        const lit = (i) => (valeurs[i] === VIDE ? '?' : valeurs[i]);
        const cibleDe = () => {
            // L'égalité résoluble : une seule case vide parmi les siennes.
            for (const eq of structure.equations) {
                const vides = casesDe(eq).filter(i => valeurs[i] === VIDE);
                if (vides.length === 1) return { eq, idx: vides[0] };
            }
            // Un résultat vertical peut manquer TOUT ENTIER — ses deux
            // chiffres à la fois. Les deux opérandes suffisent : on pose les
            // dizaines, puis les unités. C'est ce que fait un élève, et sans
            // ce cas le robot sautait ces cases sans un mot.
            for (const eq of structure.equations) {
                if (eq.z2 === undefined) continue;
                if (valeurs[eq.a] === VIDE || valeurs[eq.b] === VIDE) continue;
                if (valeurs[eq.z] === VIDE) return { eq, idx: eq.z };
                if (valeurs[eq.z2] === VIDE) return { eq, idx: eq.z2 };
            }
            return null;
        };
        const phraseDe = (eq, idx) => {
            const sym = OPS_GARAM[eq.op].symbole;
            const double = eq.z2 !== undefined;
            const cible = double ? `${lit(eq.z)}${lit(eq.z2)}` : `${lit(eq.z)}`;
            const v = solution[idx];
            if (idx === eq.a) return `? ${sym} ${lit(eq.b)} = ${cible} : je cherche le nombre de départ → ${v}.`;
            if (idx === eq.b) return `${lit(eq.a)} ${sym} ? = ${cible} : je remonte le calcul → ${v}.`;
            const T = double ? 10 * solution[eq.z] + solution[eq.z2] : solution[eq.z];
            if (double && idx === eq.z) return `${lit(eq.a)} ${sym} ${lit(eq.b)} = ${T} : ça dépasse dix, donc les DIZAINES vont dans la case du dessus → ${v}.`;
            if (double) return `${lit(eq.a)} ${sym} ${lit(eq.b)} = ${T} : les UNITÉS vont juste en dessous → ${v}.`;
            return `${lit(eq.a)} ${sym} ${lit(eq.b)} = ? : je calcule → ${v}.`;
        };

        if (!await cursor.pause(600) || destroyed) return fin();
        cursor.say('Je cherche une égalité où il ne manque qu\'UNE case : elle se calcule à coup sûr.',
            container.querySelector('.ga-board'));
        if (!await cursor.pause(2000) || destroyed) return fin();

        let prochaine;
        while ((prochaine = cibleDe())) {
            if (!await gate.waitTurn() || destroyed) return fin();
            const { eq, idx } = prochaine;
            const el = celluleEl(idx);
            if (!el) return fin();
            cursor.say(phraseDe(eq, idx), el);
            if (!await cursor.pause(2100) || destroyed) return fin();
            if (!await cursor.tap(el, 320) || destroyed) return fin();
            valeurs[idx] = solution[idx];
            el.querySelector('.kk-val').textContent = solution[idx];
            el.classList.add('demo-target');
        }
        // Filet : si une case restait (jamais en théorie), on la pose sans bruit.
        for (let i = 0; i < valeurs.length; i++) {
            if (valeurs[i] !== VIDE) continue;
            const el = celluleEl(i);
            if (!el || !await cursor.tap(el, 300) || destroyed) return fin();
            valeurs[i] = solution[i];
            el.querySelector('.kk-val').textContent = solution[i];
        }
        cursor.say('Toutes les égalités sont vraies : le Garam est terminé !',
            container.querySelector('.ga-board'));
        container.querySelector('.ga-board').classList.add('kk-board--ok');
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
