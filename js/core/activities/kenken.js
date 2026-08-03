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
import { createDemoCursor, DEMO_SPEED } from '../demoPointer.js';
import { creerNarrateur } from '../demoNarration.js';
import { OPS } from '../generators/kenken.js';

// Le vérificateur est LIMITÉ : vérifier doit rester un choix qui se paie, pas
// un oracle qu'on presse après chaque case.
const VERIFICATIONS_PAR_GRILLE = 3;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let narrateur = null;

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

    // --- Le raisonnement du robot ---------------------------------------------
    //
    // Remplir la grille dans l'ordre de lecture ne montrait RIEN : on voyait la
    // solution apparaître, jamais comment on la trouve. Le robot cherche donc
    // le prochain coup comme on l'apprend à un élève, et dit à voix haute la
    // règle qui le lui donne — en désignant ce qu'il regarde.
    //
    // Chaque raison est VÉRIFIÉE contre la solution avant d'être prononcée :
    // une justification fausse serait pire que pas de justification.

    const cageDeCase = (r, c) =>
        item.meta.cages.find(k => k.cells.some(p => p.r === r && p.c === c)) || null;

    /** Valeurs déjà posées sur la ligne et la colonne de la case. */
    function dejaVues(r, c) {
        const { n } = item.meta;
        const ligne = [], colonne = [];
        for (let i = 0; i < n; i++) {
            if (i !== c && grille[r][i]) ligne.push(grille[r][i]);
            if (i !== r && grille[i][c]) colonne.push(grille[i][c]);
        }
        return { ligne, colonne };
    }

    /** Valeurs encore admissibles pour la case, au seul titre du carré latin. */
    function possibles(r, c) {
        const { lo, hi } = item.meta;
        const { ligne, colonne } = dejaVues(r, c);
        const prises = new Set([...ligne, ...colonne]);
        const out = [];
        for (let v = lo; v <= hi; v++) if (!prises.has(v)) out.push(v);
        return out;
    }

    /**
     * Toutes les façons de compléter une cage, compte tenu de ce qui est déjà
     * posé — arithmétique de la cage ET carré latin. Les cages font au plus
     * quatre cases : l'énumération exhaustive est immédiate et sans piège.
     */
    function completions(cage) {
        const { lo, hi } = item.meta;
        const vides = cage.cells.filter(p => !grille[p.r][p.c]);
        const posees = cage.cells.filter(p => grille[p.r][p.c]).map(p => grille[p.r][p.c]);
        const out = [];

        const essayer = (i, choix) => {
            if (i === vides.length) {
                const vals = [...posees, ...choix];
                if (cage.op === null ? vals[0] === cage.target
                    : OPS[cage.op].calc(vals) === cage.target) out.push(choix.slice());
                return;
            }
            const { r, c } = vides[i];
            for (let v = lo; v <= hi; v++) {
                if (!possibles(r, c).includes(v)) continue;
                // Deux cases d'une même cage peuvent partager une ligne : le
                // carré latin les interdit d'être égales.
                const conflit = choix.some((autre, j) =>
                    autre === v && (vides[j].r === r || vides[j].c === c));
                if (conflit) continue;
                choix.push(v);
                essayer(i + 1, choix);
                choix.pop();
            }
        };
        essayer(0, []);
        return { vides, completions: out };
    }

    const liste = (vals) => {
        const t = [...new Set(vals)].sort((a, b) => a - b);
        return t.length > 1 ? `${t.slice(0, -1).join(', ')} et ${t[t.length - 1]}` : String(t[0] || '');
    };

    /**
     * Le prochain coup et sa raison, de la règle la plus lisible à la plus fine.
     * @returns {{r,c,valeur,phrase,cage?,croix?}|null}
     */
    function prochainCoup() {
        const { n, solution } = item.meta;
        const vides = [];
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!grille[r][c]) vides.push({ r, c });
        if (!vides.length) return null;

        // 1. Le carré latin suffit : tout est pris sauf une valeur.
        for (const { r, c } of vides) {
            const p = possibles(r, c);
            if (p.length === 1 && p[0] === solution[r][c]) {
                const { ligne, colonne } = dejaVues(r, c);
                return {
                    r, c, valeur: p[0], croix: true,
                    phrase: `Sur cette ligne et cette colonne, il y a déjà ${liste([...ligne, ...colonne])}. `
                        + `Il ne reste que ${p[0]}.`
                };
            }
        }

        // 2. Une cage à laquelle il ne manque qu'une case : l'opération donne
        //    directement le compte.
        for (const cage of item.meta.cages) {
            if (cage.op === null) continue;
            const manquantes = cage.cells.filter(p => !grille[p.r][p.c]);
            if (manquantes.length !== 1) continue;
            const { r, c } = manquantes[0];
            const { completions: sols } = completions(cage);
            const valeurs = new Set(sols.map(s => s[0]));
            if (valeurs.size !== 1 || !valeurs.has(solution[r][c])) continue;
            const posees = cage.cells.filter(p => grille[p.r][p.c]).map(p => grille[p.r][p.c]);
            return {
                r, c, valeur: solution[r][c], cage,
                phrase: `Cette zone fait ${cage.label} et j'y ai déjà ${liste(posees)} : `
                    + `il manque ${solution[r][c]}.`
            };
        }

        // 3. La cage tout entière, croisée avec la ligne et la colonne : une
        //    seule valeur y tient encore pour cette case.
        for (const cage of item.meta.cages) {
            if (cage.op === null) continue;
            const { vides: cases, completions: sols } = completions(cage);
            if (!sols.length) continue;
            for (let i = 0; i < cases.length; i++) {
                const valeurs = new Set(sols.map(s => s[i]));
                const { r, c } = cases[i];
                if (valeurs.size !== 1 || !valeurs.has(solution[r][c])) continue;
                return {
                    r, c, valeur: solution[r][c], cage, croix: true,
                    phrase: `Dans cette zone à ${cage.label}, en tenant compte de la ligne et de la `
                        + `colonne, cette case ne peut être que ${solution[r][c]}.`
                };
            }
        }

        // 4. Rien d'évident : on avance sur la case la plus contrainte, et on
        //    le dit — annoncer une déduction qu'on n'a pas faite serait mentir.
        const cible = vides
            .map(p => ({ ...p, p: possibles(p.r, p.c) }))
            .sort((a, b) => a.p.length - b.p.length)[0];
        return {
            r: cible.r, c: cible.c, valeur: solution[cible.r][cible.c], croix: true,
            phrase: `Ici, ${liste(cible.p)} restent possibles. En regardant la suite de la grille, `
                + `c'est ${solution[cible.r][cible.c]} qui convient.`
        };
    }

    function eclairer(coup) {
        eteindre();
        if (coup.cage) coup.cage.cells.forEach(({ r, c }) => celluleEl(r, c).classList.add('kk-cage--indice'));
        if (coup.croix) {
            const { n } = item.meta;
            for (let i = 0; i < n; i++) {
                if (i !== coup.c) celluleEl(coup.r, i).classList.add('kk-cell--regarde');
                if (i !== coup.r) celluleEl(i, coup.c).classList.add('kk-cell--regarde');
            }
        }
    }

    function eteindre() {
        container.querySelectorAll('.kk-cage--indice, .kk-cell--regarde')
            .forEach(el => el.classList.remove('kk-cage--indice', 'kk-cell--regarde'));
    }

    function poserDemo(r, c) {
        grille[r][c] = item.meta.solution[r][c];
        const el = celluleEl(r, c);
        el.querySelector('.kk-val').textContent = grille[r][c];
        el.classList.add('demo-target');
    }

    // Combien de coups sont commentés avant de passer à la main levée. La
    // méthode s'apprend sur quelques cases ; les onze suivantes ne feraient
    // que répéter, et une démonstration d'une minute n'est plus regardée.
    const COUPS_COMMENTES = 5;

    /** Démonstration : le robot déduit, explique, puis remplit. */
    async function runDemo() {
        if (!cursor) cursor = createDemoCursor();
        if (session.narration && !narrateur) narrateur = creerNarrateur();

        const plateau = container.querySelector('.kk-board');
        if (narrateur && !await narrateur.dire(
            `La règle : ${item.explanation}`, plateau)) return;
        if (!await cursor.pause(narrateur ? 200 : 600) || destroyed) return;

        for (let i = 0; ; i++) {
            const coup = prochainCoup();
            if (!coup) break;
            const commente = narrateur && i < COUPS_COMMENTES;
            const el = celluleEl(coup.r, coup.c);
            if (!el) break;

            if (commente) {
                eclairer(coup);
                if (!await narrateur.dire(coup.phrase, el) || destroyed) { eteindre(); return; }
            }
            if (!await cursor.tap(el, commente ? 340 : 200) || destroyed) { eteindre(); return; }
            poserDemo(coup.r, coup.c);
            eteindre();

            if (narrateur && i === COUPS_COMMENTES - 1) {
                if (!await narrateur.dire('Le reste se déduit de la même façon, case après case.', plateau)) return;
            }
        }

        plateau.classList.add('kk-board--ok');
        if (narrateur) {
            if (!await narrateur.dire('Grille terminée : chaque zone donne son résultat.', plateau)) return;
        } else if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (narrateur) { narrateur.detruire(); narrateur = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
