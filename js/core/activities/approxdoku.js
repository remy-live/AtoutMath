// Activité « Approxdoku » : le carré latin aux égalités fausses de un.
//
// RÉMY : « et un approxdoku », puis la page d'Erich Friedman en capture.
//
// LA RÈGLE TIENT EN UNE PHRASE et c'est le dessin qui la porte : des cercles
// reliés par des opérateurs, enfermés dans une capsule, et quelque part dans la
// chaîne un « ≈ ». Les deux côtés du « ≈ » diffèrent de UN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI UNE GRILLE À PISTES ALTERNÉES, ET NON UN TABLEAU À BORDURES.
//
// Une case de Mathdoku est un carré collé à ses voisines : la cage se dessine
// en épaississant des bordures. Ici il n'y a pas de cases collées — il y a des
// CERCLES SÉPARÉS, et entre deux cercles d'une même chaîne, un opérateur. Le
// blanc entre les cercles n'est donc pas une marge décorative : c'est une piste
// de la grille, qui porte un caractère.
//
// La grille a donc 2n−1 pistes dans chaque sens : les impaires portent les
// cercles, les paires portent les opérateurs. Une capsule s'y pose comme
// n'importe quel autre élément, de la piste du premier cercle à celle du
// dernier, et le navigateur la place au pixel près sans qu'on ait à calculer
// quoi que ce soit. C'est ce qui rend le dessin juste à toutes les largeurs.
//
// ET LES OPÉRATEURS VERTICAUX NE SONT PAS TOURNÉS. Sur la page de Friedman, ils
// le sont — un « ≈ » entre deux cercles empilés y est une double vague
// verticale. On les laisse droits : un « ÷ » tourné d'un quart de tour n'est
// plus un « ÷ » pour un élève de sixième, et la chaîne se lit de haut en bas
// sans qu'aucun signe ait besoin d'être redressé mentalement.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { brancherGlisserPalette } from './paletteDrag.js';
import { createDemoCursor, createDemoGate } from '../demoPointer.js';
import { equationJuste, placeDuTilde, evaluerCote } from '../generators/approxdoku.js';
import { contenuCase, brancherChamps, saisieActive } from '../../ui/champsGrille.js';

// Le vérificateur est LIMITÉ, comme au Mathdoku et au Strimko : vérifier doit
// rester un choix qui se paie, pas un oracle qu'on presse après chaque case.
const VERIFICATIONS_PAR_GRILLE = 3;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;

    let item = null;
    let grille = [];
    let verifsRestantes = VERIFICATIONS_PAR_GRILLE;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        verifsRestantes = VERIFICATIONS_PAR_GRILLE;
        render();
    }

    // --- Le dessin ----------------------------------------------------------

    // LES LIGNES DE GRILLE SONT NUMÉROTÉES À PARTIR DE 1, et une piste va de la
    // ligne k à la ligne k+1. Le cercle (r, c) occupe donc la piste 2c+1 en
    // colonne et 2r+1 en ligne ; l'opérateur qui le suit occupe la piste 2c+2.
    const ligneDeCase = (i) => 2 * i + 1;

    /** La capsule d'une chaîne, posée sur la grille par ses pistes. */
    function capsuleHtml(eq, i) {
        const premiere = eq.cases[0];
        const derniere = eq.cases[eq.cases.length - 1];
        const style = eq.sens === 'h'
            ? `grid-row:${ligneDeCase(premiere.r)};`
              + `grid-column:${ligneDeCase(premiere.c)}/${ligneDeCase(derniere.c) + 1}`
            : `grid-column:${ligneDeCase(premiere.c)};`
              + `grid-row:${ligneDeCase(premiere.r)}/${ligneDeCase(derniere.r) + 1}`;
        // `role="img"` ET UN NOM, PLUTÔT QU'UNE PHRASE CACHÉE EN BAS DE PAGE.
        //
        // J'avais écrit un paragraphe `class="sr-only"` qui récitait les chaînes.
        // Cette classe N'EXISTE PAS dans ce dépôt (vérifié : zéro occurrence en
        // CSS) — elle se serait donc affichée en toutes lettres sous la grille.
        // C'est la friction notée hier, mot pour mot, et elle s'est reproduite
        // le lendemain. Une capsule nommée dit la même chose, là où elle est,
        // et ne demande aucune classe à inventer.
        return `<div class="ax-capsule" style="${style}" data-eq="${i}"
            role="img" aria-label="${nommerEquation(eq)}"></div>`;
    }

    /** Les opérateurs d'une chaîne, un par intervalle entre deux cercles. */
    function operateursHtml(eq, i) {
        return eq.ops.map((op, k) => {
            const avant = eq.cases[k];
            const style = eq.sens === 'h'
                ? `grid-row:${ligneDeCase(avant.r)};grid-column:${ligneDeCase(avant.c) + 1}`
                : `grid-column:${ligneDeCase(avant.c)};grid-row:${ligneDeCase(avant.r) + 1}`;
            return `<div class="ax-op ${op === '≈' ? 'ax-op--tilde' : ''}"
                style="${style}" data-eq="${i}" data-op="${k}">${op}</div>`;
        }).join('');
    }

    /**
     * CE QUE L'ÉQUATION SE NOMME POUR QUI NE VOIT PAS L'ÉCRAN.
     *
     * Un lecteur d'écran qui annonce « cercle, cercle, cercle » ne dit rien. On
     * lui donne la chaîne telle qu'elle se lit : « ligne 2, de la colonne 1 à la
     * colonne 3 : plus, à peu près égal ».
     */
    function nommerEquation(eq) {
        const noms = { '+': 'plus', '−': 'moins', '×': 'multiplié par', '÷': 'divisé par',
            '≈': 'à peu près égal à' };
        const p = eq.cases[0], d = eq.cases[eq.cases.length - 1];
        const ou = eq.sens === 'h'
            ? `ligne ${p.r + 1}, de la colonne ${p.c + 1} à la colonne ${d.c + 1}`
            : `colonne ${p.c + 1}, de la ligne ${p.r + 1} à la ligne ${d.r + 1}`;
        return `Chaîne ${ou} : ${eq.ops.map(o => noms[o] || o).join(', ')}.`;
    }

    function render() {
        const { n, equations } = item.meta;
        grille = Array.from({ length: n }, () => Array(n).fill(0));
        const avecChamp = saisieActive(session.params);

        // Une case hors de toute chaîne reste un cercle seul : c'est ainsi
        // chez Friedman, et c'est une information — elle ne se déduit que de sa
        // ligne et de sa colonne.
        const ronds = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                ronds.push(`
                    <div class="ax-rond" role="button"
                         tabindex="${avecChamp ? -1 : 0}"
                         style="grid-row:${ligneDeCase(r)};grid-column:${ligneDeCase(c)}"
                         data-r="${r}" data-c="${c}"
                         aria-label="Ligne ${r + 1}, colonne ${c + 1}">
                        ${contenuCase({
        valeur: '', donnee: false, champ: avecChamp,
        aria: `Ligne ${r + 1}, colonne ${c + 1}`, motif: `[1-${n}]`
    })}
                    </div>`);
            }
        }

        const jetons = [];
        for (let v = 1; v <= n; v++) {
            jetons.push(`<button type="button" class="ax-chip" data-chip="${v}">${v}</button>`);
        }
        jetons.push(`<button type="button" class="ax-chip ax-chip--gomme" data-chip=""
            aria-label="Effacer une case">⌫</button>`);

        // `repeat()` n'accepte pas un nombre calculé en CSS : on écrit donc les
        // pistes ici, où `n` est un vrai nombre.
        const pistes = `repeat(${n - 1}, var(--ax-rond) var(--ax-op)) var(--ax-rond)`;

        container.innerHTML = `
            <div class="approxdoku-layout">
                <div class="approxdoku-context">${item.prompt.html || item.prompt.text}</div>
                <div class="ax-cadre">
                    <div class="ax-grille" role="group"
                         aria-label="Grille d'Approxdoku"
                         style="grid-template-columns:${pistes};grid-template-rows:${pistes}">
                        ${equations.map(capsuleHtml).join('')}
                        ${equations.map(operateursHtml).join('')}
                        ${ronds.join('')}
                    </div>
                </div>
                <div class="ax-palette" aria-label="Nombres à placer">${jetons.join('')}</div>
                <div class="ax-actions">
                    <button type="button" class="btn-hint ax-btn-verif" data-verifier>
                        Vérifier <span class="ax-verif-count">(${verifsRestantes})</span>
                    </button>
                    <button type="button" class="ax-btn-valider" data-valider>Valider</button>
                </div>
                <div class="ax-status" role="status"></div>
                ${hintBar(session)}
            </div>`;

        if (session.frozen) return;
        if (session.isDemo) { runDemo(); return; }

        brancherCases();
        brancherPalette();
        brancherVerificateur();
        brancherValidation();
        wireHint(container, session);
    }

    // --- Saisie -------------------------------------------------------------

    const rondEl = (r, c) => container.querySelector(`.ax-rond[data-r="${r}"][data-c="${c}"]`);

    function poser(r, c, v) {
        grille[r][c] = v;
        const el = rondEl(r, c);
        if (!el) return;
        // LA CASE SANS CLAVIER S'APPELLE `.kk-val` — c'est `contenuCase` qui le
        // décide, pas nous. Au Strimko, une classe inventée ici a rendu toute la
        // saisie au doigt muette : la valeur était retenue, jamais affichée.
        const champ = el.querySelector('input');
        if (champ) champ.value = v || '';
        else el.querySelector('.kk-val').textContent = v || '';
        el.classList.toggle('ax-rempli', !!v);
        // Toute retouche efface le verdict précédent : laisser « deux chaînes
        // fausses » au-dessus d'une grille qu'on vient de changer, c'est faire
        // chercher des fautes qui n'y sont plus.
        effacerVerdict();
    }

    function brancherCases() {
        const n = item.meta.n;
        if (saisieActive(session.params)) {
            // `cleDe` REÇOIT LE CHAMP, PAS LA CASE, et `bloque` ne reçoit RIEN.
            // Les deux ont coûté douze erreurs de page par grille au Strimko.
            brancherChamps(container, {
                bloque: () => session.locked,
                cleDe: (champ) => {
                    const rond = champ.closest('.ax-rond');
                    return `${rond.dataset.r},${rond.dataset.c}`;
                },
                // ET LA VALEUR REVIENT EN NOMBRE : `brut` est une chaîne, et
                // tout ce qui suit compare des nombres.
                poser: (cle, brut) => {
                    const [r, c] = cle.split(',').map(Number);
                    poser(r, c, brut === '' ? 0 : Number(brut));
                }
            });
            return;
        }
        // SANS CLAVIER : un appui fait défiler les valeurs, vide compris — il
        // doit pouvoir REVENIR à vide, sans quoi une case posée par erreur ne
        // s'enlève plus.
        container.querySelectorAll('.ax-rond').forEach(el => {
            el.addEventListener('click', () => {
                if (session.locked) return;
                const r = Number(el.dataset.r), c = Number(el.dataset.c);
                poser(r, c, (grille[r][c] + 1) % (n + 1));
            });
        });
    }

    function brancherPalette() {
        brancherGlisserPalette(container, {
            jeton: '.ax-chip',
            classeVisee: 'ax-rond--visee',
            bloque: () => session.locked,
            cibleSous(e) {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                return el && el.closest ? el.closest('.ax-rond') : null;
            },
            deposer(cible, chip) {
                poser(Number(cible.dataset.r), Number(cible.dataset.c),
                    chip.dataset.chip === '' ? 0 : Number(chip.dataset.chip));
            }
        });
    }

    // --- Vérifier, et valider -----------------------------------------------

    const statutEl = () => container.querySelector('.ax-status');

    function effacerVerdict() {
        container.querySelectorAll('.ax-faute').forEach(el => el.classList.remove('ax-faute'));
        container.querySelectorAll('.ax-capsule--faute')
            .forEach(el => el.classList.remove('ax-capsule--faute'));
        const s = statutEl();
        if (s) s.textContent = '';
    }

    /**
     * CE QUI NE VA PAS, SANS DIRE LA RÉPONSE.
     *
     * On ne compare JAMAIS à la solution. On signale deux choses que l'élève
     * peut constater lui-même en relisant :
     *
     *   · un nombre qui revient dans une ligne ou dans une colonne ;
     *   · une chaîne ENTIÈREMENT remplie dont l'équation est fausse.
     *
     * « Entièrement remplie » n'est pas un détail : une chaîne à trous n'est ni
     * vraie ni fausse, et la marquer en rouge accuserait l'élève d'une faute
     * qu'il n'a pas encore eu l'occasion de commettre.
     */
    function fautes() {
        const { n, equations } = item.meta;
        const cases = new Set();
        const chaines = [];

        const repetitions = (liste) => {
            const vus = new Map();
            for (const { r, c } of liste) {
                const v = grille[r][c];
                if (!v) continue;
                if (vus.has(v)) { cases.add(`${r},${c}`); cases.add(vus.get(v)); }
                else vus.set(v, `${r},${c}`);
            }
        };
        for (let r = 0; r < n; r++) repetitions(Array.from({ length: n }, (_, c) => ({ r, c })));
        for (let c = 0; c < n; c++) repetitions(Array.from({ length: n }, (_, r) => ({ r, c })));

        equations.forEach((eq, i) => {
            const vals = eq.cases.map(({ r, c }) => grille[r][c]);
            if (vals.some(v => !v)) return;
            if (!equationJuste(eq.ops, vals)) chaines.push(i);
        });
        return { cases, chaines };
    }

    /** Combien de cases l'élève a posées. */
    const posees = () => grille.flat().filter(Boolean).length;

    function brancherVerificateur() {
        const bouton = container.querySelector('[data-verifier]');
        if (!bouton) return;
        bouton.addEventListener('click', () => {
            if (verifsRestantes <= 0 || session.locked) return;

            // UNE GRILLE VIDE NE COÛTE PAS UNE VÉRIFICATION — trois essais pour
            // toute la grille, en dépenser un pour s'entendre dire que rien ne
            // cloche dans une grille vide, c'est en perdre un tiers.
            if (posees() === 0) {
                const s = statutEl();
                if (s) {
                    s.textContent = 'Écris d\'abord quelques nombres : il n\'y a rien '
                        + 'à vérifier pour l\'instant.';
                }
                return;
            }

            verifsRestantes--;
            const compteur = container.querySelector('.ax-verif-count');
            if (compteur) compteur.textContent = `(${verifsRestantes})`;
            if (verifsRestantes <= 0) bouton.disabled = true;

            const { cases, chaines } = fautes();
            cases.forEach(cle => {
                const [r, c] = cle.split(',').map(Number);
                const el = rondEl(r, c);
                if (el) el.classList.add('ax-faute');
            });
            chaines.forEach(i => {
                const el = container.querySelector(`.ax-capsule[data-eq="${i}"]`);
                if (el) el.classList.add('ax-capsule--faute');
            });

            const s = statutEl();
            if (!s) return;
            const morceaux = [];
            if (cases.size) {
                morceaux.push(`${cases.size} case${cases.size > 1 ? 's' : ''} en double `
                    + '(un nombre revient dans une ligne ou une colonne)');
            }
            if (chaines.length) {
                morceaux.push(`${chaines.length} chaîne${chaines.length > 1 ? 's' : ''} `
                    + `fausse${chaines.length > 1 ? 's' : ''}`);
            }
            if (morceaux.length) { s.textContent = morceaux.join(' et ') + '.'; return; }

            // UNE GRILLE PLEINE SANS FAUTE NE S'ENTEND PAS DIRE « CONTINUE ».
            //
            // Et ce n'est pas donner la réponse : une grille pleine où aucun
            // nombre ne se répète et où toutes les chaînes sont vraies EST une
            // solution — et le générateur n'en laisse qu'une. L'élève a déjà sa
            // réponse sous les yeux ; on ne lui apprend que ce qu'on a mesuré.
            const { n } = item.meta;
            s.textContent = posees() === n * n
                ? 'Ta grille est complète et rien n\'y cloche : tu peux valider.'
                : 'Rien ne cloche pour l\'instant. Continue.';
        });
    }

    function brancherValidation() {
        const bouton = container.querySelector('[data-valider]');
        if (!bouton) return;
        bouton.addEventListener('click', () => {
            const { n, solution } = item.meta;
            const manque = n * n - posees();
            if (manque) {
                const s = statutEl();
                if (s) {
                    s.textContent = `Il reste ${manque} case${manque > 1 ? 's' : ''} à remplir.`;
                }
                return;
            }

            const juste = grille.every((ligne, r) => ligne.every((v, c) => v === solution[r][c]));
            const donne = grille.map(l => l.join('')).join('|');
            const result = session.submit(donne, { element: bouton });
            if (result.ignored) return;

            const plateau = container.querySelector('.ax-grille');
            if (plateau) plateau.classList.add(juste ? 'ax-grille--ok' : 'ax-grille--secoue');
            if (!juste) {
                const { cases, chaines } = fautes();
                cases.forEach(cle => {
                    const [r, c] = cle.split(',').map(Number);
                    const el = rondEl(r, c);
                    if (el) el.classList.add('ax-faute');
                });
                chaines.forEach(i => {
                    const el = container.querySelector(`.ax-capsule[data-eq="${i}"]`);
                    if (el) el.classList.add('ax-capsule--faute');
                });
                regTimeout(() => {
                    if (plateau) plateau.classList.remove('ax-grille--secoue');
                }, 400);
            }
            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct || result.revealed) regTimeout(renderNext, 1200);
            });
        });
    }

    // --- La démonstration ---------------------------------------------------

    async function runDemo() {
        const { n, equations, solution } = item.meta;
        if (!cursor) cursor = createDemoCursor();
        const gate = createDemoGate(container.querySelector('.approxdoku-layout') || container);
        const fin = () => { cursor?.hideBubble(); gate?.destroy(); };
        try {
            cursor.protegerZone(container.querySelector('.ax-cadre'));
            if (!await gate.wait(600) || destroyed) return fin();
            cursor.say(`Chaque ligne et chaque colonne portent les nombres de 1 à ${n}, `
                + 'une fois chacun — comme un sudoku.', container.querySelector('.ax-grille'));
            if (!await gate.wait(3200) || destroyed) return fin();

            // ON MONTRE UNE CHAÎNE EN LA PARCOURANT, parce que c'est le seul
            // point de règle qui ne se devine pas : le « ≈ » ne veut pas dire
            // « égal », il veut dire « à un près ».
            const eq = equations.find(e => e.cases.length >= 3) || equations[0];
            if (eq) {
                const capsule = container.querySelector(
                    `.ax-capsule[data-eq="${equations.indexOf(eq)}"]`);
                if (capsule) capsule.classList.add('ax-capsule--montre');
                cursor.say('Dans une capsule, les deux côtés du « ≈ » ne sont PAS égaux : '
                    + 'ils se suivent, à un près.', capsule || container.querySelector('.ax-grille'));
                if (!await gate.wait(3600) || destroyed) return fin();
                for (const p of eq.cases) {
                    const el = rondEl(p.r, p.c);
                    if (el && !await cursor.tap(el, 420)) return fin();
                    if (destroyed) return fin();
                }

                // ET L'ON MONTRE LE COMPTE, sur cette chaîne-là, avec ses vrais
                // nombres : « 6 et 5, ça se suit » dit la règle mieux que toute
                // reformulation.
                eq.cases.forEach(p => poser(p.r, p.c, solution[p.r][p.c]));
                const vals = eq.cases.map(p => solution[p.r][p.c]);
                const k = placeDuTilde(eq.ops);
                const g = evaluerCote(vals.slice(0, k + 1), eq.ops.slice(0, k));
                const d = evaluerCote(vals.slice(k + 1), eq.ops.slice(k + 1));
                cursor.say(`Ici ${g} d'un côté et ${d} de l'autre : ils se suivent, `
                    + 'la chaîne est juste.', capsule || container.querySelector('.ax-grille'));
                if (!await gate.wait(3800) || destroyed) return fin();
                if (capsule) capsule.classList.remove('ax-capsule--montre');
            }
            if (!await gate.wait(1200) || destroyed) return fin();
        } catch (e) { /* démonstration coupée */ }
        fin();
    }

    // --- Cycle de vie --------------------------------------------------------

    renderNext();

    // LE CONTRAT D'UNE ACTIVITÉ NE SE DEVINE PAS NON PLUS : `showNext` et
    // `showPrevious` sont ce qui branche les flèches du meneur, et `destroy`
    // doit CLORE LA SESSION — sans `session.finish()`, l'exercice reste ouvert
    // dans le journal et la séance ne s'achève jamais.
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
