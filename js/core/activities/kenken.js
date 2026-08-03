// Activité « Mathdoku » : la grille à cages.
//
// Nouveau genre de réponse, 'grid' : l'élève ne choisit pas et ne tape pas un
// nombre, il construit un état complet — la grille remplie — qui est validé
// d'un bloc. Le générateur fournit le puzzle et sa solution dans `meta` ;
// cette activité ne sait rien des mathématiques du carré latin, elle ne fait
// qu'afficher, saisir et comparer.
//
// Deux gestes de saisie qui coexistent : un appui sur une case fait défiler
// les valeurs (vide → lo → … → hi → vide), et les jetons de la palette se
// glissent dans les cases (Pointer Events, comme le glisser des comparaisons —
// l'API HTML5 ne marche pas au doigt).

import { regTimeout } from '../timers.js';
import { hintBar } from './choice.js';
import { brancherGlisserPalette } from './paletteDrag.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { OPS } from '../generators/kenken.js';

// Le vérificateur est LIMITÉ : vérifier doit rester un choix qui se paie, pas
// un oracle qu'on presse après chaque case.
const VERIFICATIONS_PAR_GRILLE = 3;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;

    let item = null;
    let grille = [];          // valeurs saisies, 0 = vide
    let verrous = [];         // cases données ou révélées : intouchables
    let verifsRestantes = VERIFICATIONS_PAR_GRILLE;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        verifsRestantes = VERIFICATIONS_PAR_GRILLE;
        render();
    }

    function render() {
        const { n, lo, hi, cages } = item.meta;
        grille = Array.from({ length: n }, () => Array(n).fill(0));
        verrous = Array.from({ length: n }, () => Array(n).fill(false));

        // Cases données : pré-remplies et verrouillées. C'est le « coup de
        // pouce » classique du KenKen, et l'outil du générateur pour garantir
        // l'unicité.
        for (const cage of cages) {
            if (cage.op === null) {
                const { r, c } = cage.cells[0];
                grille[r][c] = cage.target;
                verrous[r][c] = true;
            }
        }

        const cageDe = Array.from({ length: n }, () => Array(n).fill(-1));
        cages.forEach((cage, i) => cage.cells.forEach(p => { cageDe[p.r][p.c] = i; }));

        const cellsHtml = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const ci = cageDe[r][c];
                const cage = cages[ci];
                // Bordures épaisses là où la cage change : c'est le dessin des
                // cages, il doit dominer le quadrillage.
                const bords = [
                    r === 0 || cageDe[r - 1][c] !== ci ? 'kk-bt' : '',
                    c === n - 1 || cageDe[r][c + 1] !== ci ? 'kk-br' : '',
                    r === n - 1 || cageDe[r + 1][c] !== ci ? 'kk-bb' : '',
                    c === 0 || cageDe[r][c - 1] !== ci ? 'kk-bl' : ''
                ].join(' ');
                const premiere = cage.cells[0].r === r && cage.cells[0].c === c;
                const donnee = verrous[r][c];
                cellsHtml.push(`
                    <div class="kk-cell ${bords} ${donnee ? 'kk-given' : ''}" role="button"
                         tabindex="${donnee ? -1 : 0}" data-r="${r}" data-c="${c}" data-cage="${ci}"
                         aria-label="Case ligne ${r + 1}, colonne ${c + 1}">
                        ${premiere ? `<span class="kk-label">${cage.label}</span>` : ''}
                        <span class="kk-val">${donnee ? cage.target : ''}</span>
                    </div>`);
            }
        }

        const jetons = [];
        for (let v = lo; v <= hi; v++) {
            jetons.push(`<button type="button" class="kk-chip" data-chip="${v}">${v}</button>`);
        }
        jetons.push(`<button type="button" class="kk-chip kk-chip--gomme" data-chip=""
            aria-label="Effacer une case">⌫</button>`);

        container.innerHTML = `
            <div class="kenken-layout">
                <div class="kenken-context">${item.prompt.html}</div>
                <div class="kk-board" style="--kk-n:${n}" role="group" aria-label="Grille de Mathdoku">
                    ${cellsHtml.join('')}
                </div>
                <div class="kk-palette" aria-label="Chiffres à placer">${jetons.join('')}</div>
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
        const el = celluleEl(r, c);
        el.querySelector('.kk-val').textContent = valeur || '';
        // Toute édition invalide les marques du vérificateur et des indices :
        // elles décrivaient un état qui n'existe plus.
        container.querySelectorAll('.kk-cell--conflit, .kk-cage--faux, .kk-cage--indice')
            .forEach(e => e.classList.remove('kk-cell--conflit', 'kk-cage--faux', 'kk-cage--indice'));
        statut('');
    }

    function brancherCases() {
        container.querySelectorAll('.kk-cell').forEach(el => {
            const r = Number(el.dataset.r), c = Number(el.dataset.c);
            if (verrous[r][c]) return;
            const cycle = () => {
                const { lo, hi } = item.meta;
                const v = grille[r][c];
                poser(r, c, v === 0 ? lo : (v >= hi ? 0 : v + 1));
            };
            el.onclick = cycle;
            el.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); }
                else if (/^[0-9]$/.test(e.key)) {
                    const v = Number(e.key);
                    if (v >= item.meta.lo && v <= item.meta.hi) poser(r, c, v);
                } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
                    poser(r, c, 0);
                }
            };
        });
    }

    /** Glisser un jeton de la palette vers une case — logique partagée. */
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
                    chip.dataset.chip === '' ? 0 : Number(chip.dataset.chip));
            }
        });
    }

    // --- Vérificateur (limité) ----------------------------------------------

    function brancherVerificateur() {
        const btn = container.querySelector('[data-verifier]');
        btn.onclick = () => {
            if (verifsRestantes <= 0 || session.locked) return;
            verifsRestantes--;
            const compteur = container.querySelector('.kk-verif-count');
            compteur.textContent = `(${verifsRestantes})`;
            if (verifsRestantes <= 0) btn.disabled = true;

            const { n, cages } = item.meta;
            let doublons = 0, cagesFausses = 0;

            // Doublons ligne/colonne parmi les cases remplies.
            const marquer = (cells) => cells.forEach(({ r, c }) => celluleEl(r, c).classList.add('kk-cell--conflit'));
            for (let r = 0; r < n; r++) {
                const parValeur = {};
                for (let c = 0; c < n; c++) if (grille[r][c]) (parValeur[grille[r][c]] ||= []).push({ r, c });
                Object.values(parValeur).forEach(l => { if (l.length > 1) { doublons++; marquer(l); } });
            }
            for (let c = 0; c < n; c++) {
                const parValeur = {};
                for (let r = 0; r < n; r++) if (grille[r][c]) (parValeur[grille[r][c]] ||= []).push({ r, c });
                Object.values(parValeur).forEach(l => { if (l.length > 1) { doublons++; marquer(l); } });
            }

            // Cages complètes au mauvais résultat. Les cages incomplètes ne
            // disent rien : le vérificateur ne doit pas deviner à la place de
            // l'élève.
            for (const cage of cages) {
                if (cage.op === null) continue;
                const vals = cage.cells.map(p => grille[p.r][p.c]);
                if (vals.some(v => v === 0)) continue;
                if (OPS[cage.op].calc(vals) !== cage.target) {
                    cagesFausses++;
                    cage.cells.forEach(({ r, c }) => celluleEl(r, c).classList.add('kk-cage--faux'));
                }
            }

            if (!doublons && !cagesFausses) statut('Tout ce qui est rempli est juste. Continue !', 'ok');
            else statut(`${cagesFausses ? `${cagesFausses} zone${cagesFausses > 1 ? 's' : ''} fausse${cagesFausses > 1 ? 's' : ''}` : ''}${cagesFausses && doublons ? ' et ' : ''}${doublons ? `${doublons} chiffre${doublons > 1 ? 's' : ''} en double` : ''}.`, 'ko');
        };
    }

    // --- Validation ----------------------------------------------------------

    function brancherValidation() {
        container.querySelector('[data-valider]').onclick = () => {
            if (session.locked || destroyed) return;
            const vides = grille.flat().filter(v => v === 0).length;
            if (vides > 0) {
                statut(`Il reste ${vides} case${vides > 1 ? 's' : ''} à remplir.`, 'ko');
                container.querySelector('.kk-board').classList.remove('kk-board--secoue');
                void container.querySelector('.kk-board').offsetWidth;
                container.querySelector('.kk-board').classList.add('kk-board--secoue');
                return;
            }

            const result = session.submit('g' + grille.map(l => l.join('')).join('/'));
            if (result.ignored) return;

            container.querySelector('.kk-board').classList.toggle('kk-board--ok', result.correct);
            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) { renderNext(); return; }
                if (result.revealed) {
                    // La solution s'affiche dans la grille elle-même : c'est
                    // là qu'elle se comprend, pas dans un texte à côté.
                    const { n } = item.meta;
                    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
                        const el = celluleEl(r, c);
                        const attendu = item.meta.solution[r][c];
                        el.querySelector('.kk-val').textContent = attendu;
                        if (grille[r][c] !== attendu) el.classList.add('kk-cell--corrige');
                    }
                    regTimeout(renderNext, 2600);
                }
                // Sinon : la politique accorde un nouvel essai, la grille
                // reste telle quelle et l'élève corrige.
            });
        };
    }

    // --- Indices gradués ------------------------------------------------------

    /**
     * L'indice est une ACTION en plus du texte : le premier entoure une zone
     * (fausse s'il y en a une, sinon la plus simple à continuer), le second
     * remplit une case juste. Le texte, lui, passe par session.hint() — c'est
     * lui qui compte l'usage et respecte la politique du professeur.
     */
    function brancherIndices() {
        const btn = container.querySelector('[data-hint]');
        if (!btn) return;
        btn.onclick = () => {
            const niveau = session.hintIndex; // avant consommation : 0 puis 1
            const h = session.hint();
            if (!h) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; return; }

            if (niveau === 0) entourerZone();
            else revelerCase();

            if (!session.hintsAvailable) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; }
        };
    }

    function cageFausseOuSuivante() {
        const { cages, solution } = item.meta;
        // D'abord une cage contenant une erreur avérée…
        const fausse = cages.find(cage => cage.op !== null &&
            cage.cells.some(({ r, c }) => grille[r][c] !== 0 && grille[r][c] !== solution[r][c]));
        if (fausse) return fausse;
        // … sinon la plus petite cage encore incomplète : le meilleur endroit
        // où continuer.
        return cages
            .filter(cage => cage.cells.some(({ r, c }) => grille[r][c] === 0))
            .sort((a, b) => a.cells.length - b.cells.length)[0] || null;
    }

    function entourerZone() {
        const cage = cageFausseOuSuivante();
        if (!cage) return;
        cage.cells.forEach(({ r, c }) => celluleEl(r, c).classList.add('kk-cage--indice'));
    }

    function revelerCase() {
        const { n, solution } = item.meta;
        // De préférence une case fausse (on la corrige), sinon une case vide
        // de la plus petite cage inachevée.
        let cible = null;
        for (let r = 0; r < n && !cible; r++) for (let c = 0; c < n && !cible; c++) {
            if (!verrous[r][c] && grille[r][c] !== 0 && grille[r][c] !== solution[r][c]) cible = { r, c };
        }
        if (!cible) {
            const cage = cageFausseOuSuivante();
            if (cage) cible = cage.cells.find(({ r, c }) => grille[r][c] === 0) || null;
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
     * Démonstration : le robot joue les coups dans l'ordre où ils se
     * déduisent — cage presque finie, ligne à une case, colonne à une case —
     * et explique chaque déduction dans une bulle. Pause et pas-à-pas
     * permettent de suivre le raisonnement à son rythme.
     */
    async function runDemo() {
        const { n, solution } = item.meta;
        if (!cursor) cursor = createDemoCursor();
        const gate = createDemoGate(container.querySelector('.kenken-layout') || container);
        const fin = () => { cursor.hideBubble(); gate.destroy(); };

        if (!await cursor.pause(600) || destroyed) return fin();
        while (!destroyed) {
            const coup = prochainCoupKenken(grille, item.meta);
            if (!coup) break;
            if (!await gate.waitTurn() || destroyed) return fin();
            const el = celluleEl(coup.r, coup.c);
            if (!el) return fin();
            cursor.say(coup.motif, el);
            if (!await cursor.tap(el, 340) || destroyed) return fin();
            grille[coup.r][coup.c] = solution[coup.r][coup.c];
            el.querySelector('.kk-val').textContent = solution[coup.r][coup.c];
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
 * Le prochain coup déductible d'un Mathdoku, avec la règle qui le justifie.
 * Ordre des règles : cage à une seule case restante (l'opération impose la
 * valeur), puis ligne ou colonne où il ne manque qu'un chiffre, puis, à
 * défaut, la plus petite cage inachevée par élimination.
 */
function prochainCoupKenken(grille, meta) {
    const { n, lo, hi, cages, solution } = meta;

    // 1. Une cage où il ne reste qu'une case vide : l'opération la donne.
    for (const cage of cages) {
        if (cage.op === null) continue;
        const videsCage = cage.cells.filter(({ r, c }) => grille[r][c] === 0);
        if (videsCage.length !== 1) continue;
        const { r, c } = videsCage[0];
        const v = solution[r][c];
        const remplies = cage.cells.filter(p => grille[p.r][p.c] !== 0)
            .map(p => grille[p.r][p.c]);
        return {
            r, c, v,
            motif: remplies.length
                ? `Cage « ${cage.label} » : avec ${remplies.join(' et ')} déjà posé${remplies.length > 1 ? 's' : ''}, seul ${v} donne ${cage.target}.`
                : `Cage « ${cage.label} » : une seule case, elle vaut ${cage.target}.`
        };
    }

    // 2. Ligne ou colonne où il ne manque qu'une valeur.
    for (let r = 0; r < n; r++) {
        const vides = [];
        for (let c = 0; c < n; c++) if (grille[r][c] === 0) vides.push(c);
        if (vides.length === 1) {
            const c = vides[0], v = solution[r][c];
            return { r, c, v, motif: `Dans cette ligne, il ne manque plus que le ${v} (chaque chiffre de ${lo} à ${hi} apparaît une fois).` };
        }
    }
    for (let c = 0; c < n; c++) {
        const vides = [];
        for (let r = 0; r < n; r++) if (grille[r][c] === 0) vides.push(r);
        if (vides.length === 1) {
            const r = vides[0], v = solution[r][c];
            return { r, c, v, motif: `Dans cette colonne, il ne manque plus que le ${v}.` };
        }
    }

    // 3. La plus petite cage inachevée, par élimination.
    const cage = cages
        .filter(cg => cg.cells.some(({ r, c }) => grille[r][c] === 0))
        .sort((a, b) => a.cells.length - b.cells.length)[0];
    if (!cage) return null;
    const { r, c } = cage.cells.find(p => grille[p.r][p.c] === 0);
    const v = solution[r][c];
    return {
        r, c, v,
        motif: cage.op === null
            ? `Cette case est donnée : ${cage.target}.`
            : `Cage « ${cage.label} » : j'essaie ${v} ici, c'est la seule valeur compatible avec la ligne, la colonne et l'opération.`
    };
}
