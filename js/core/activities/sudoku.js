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
import { contenuCase, brancherChamps, saisieActive } from '../../ui/champsGrille.js';

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
            // LA CASE EST UN CHAMP quand la saisie clavier est offerte. Elle
            // garde alors son `tabindex` à -1 : c'est le champ qui reçoit le
            // foyer, pas la case autour — sinon Tab s'arrêterait deux fois par
            // case, une fois sur la boîte et une fois sur ce qu'on écrit.
            const champ = saisieActive(session.params);
            return `<div class="kk-cell su-cell${bords} ${donnee ? 'kk-given' : ''}" role="button"
                 tabindex="${(donnee || champ) ? -1 : 0}" data-i="${i}"
                 aria-label="Ligne ${r + 1}, colonne ${c + 1}">
                ${contenuCase({
        valeur: donnee ? v : '', donnee, champ,
        aria: `Ligne ${r + 1}, colonne ${c + 1}`,
        motif: `[1-${n}]`
    })}
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
        guider();
    }

    // --- Saisie -------------------------------------------------------------

    const celluleEl = (i) => container.querySelector(`.su-cell[data-i="${i}"]`);
    const N = () => item.meta.n;

    function poser(i, valeur) {
        if (verrous[i] || session.locked) return;
        valeurs[i] = valeur;
        // Le champ et le simple texte s'écrivent différemment : l'un porte une
        // valeur, l'autre du contenu.
        const boite = celluleEl(i).querySelector('.kk-val');
        const texte = valeur === VIDE ? '' : String(valeur);
        if (boite.tagName === 'INPUT') { if (boite.value !== texte) boite.value = texte; }
        else boite.textContent = texte;
        container.querySelectorAll('.kk-cage--faux, .kk-cage--indice')
            .forEach(e => e.classList.remove('kk-cage--faux', 'kk-cage--indice'));
        statut('');
        // EN TUTORIEL, LE COUP SUIVANT S'ALLUME TOUT SEUL : c'est ce qui fait
        // voir qu'une case remplie en débloque une autre, la seule chose qu'il
        // y ait à comprendre du sudoku.
        if (enTutoriel()) guider();
    }

    function brancherCases() {
        // LES CHAMPS D'ABORD : l'ordre de tabulation est celui du DOM, donc
        // ligne après ligne et de gauche à droite dans chaque ligne — l'ordre
        // de lecture de la grille, celui que Rémy demande.
        brancherChamps(container, {
            bloque: () => session.locked,
            cleDe: (champ) => champ.closest('.su-cell').dataset.i,
            poser: (cle, brut) => {
                const i = Number(cle);
                const v = brut === '' ? VIDE : Number(brut);
                if (v !== VIDE && (v < 1 || v > N())) return;
                poser(i, v);
            }
        });
        container.querySelectorAll('.su-cell').forEach(el => {
            const i = Number(el.dataset.i);
            if (verrous[i]) return;
            const cycle = () => poser(i, valeurs[i] >= N() ? VIDE : valeurs[i] + 1);
            // Avec un champ, cliquer sert à ÉCRIRE dedans : faire tourner la
            // valeur par-dessus rendrait la case incontrôlable.
            el.onclick = el.querySelector('.kk-champ') ? null : cycle;
            // QUAND LA CASE PORTE UN CHAMP, ELLE NE TRAITE PLUS LA FRAPPE.
            // Les deux écoutaient : la case posait la valeur sur `keydown`, le
            // champ la reposait sur `input` — et ce double passage empêchait
            // l'avance automatique de tenir. Un seul chemin, celui du champ.
            el.onkeydown = el.querySelector('.kk-champ') ? null : (e) => {
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
    /**
     * COMMENT ON PARLE D'UNE UNITÉ. Les lignes d'abord, puis les colonnes,
     * puis les blocs — et « ligne » est féminin quand « bloc » ne l'est pas :
     * une phrase qui dit « ce ligne » se lit deux fois, et la deuxième fois
     * l'élève ne pense plus au sudoku.
     */
    const MOTS_UNITE = {
        ligne: { det: 'cette', nom: 'ligne', pron: 'elle', autres: 'la colonne et le bloc' },
        colonne: { det: 'cette', nom: 'colonne', pron: 'elle', autres: 'la ligne et le bloc' },
        bloc: { det: 'ce', nom: 'bloc', pron: 'il', autres: 'la ligne et la colonne' }
    };
    const nomUnite = (u) => (u < N() ? 'ligne' : (u < 2 * N() ? 'colonne' : 'bloc'));
    const motsUnite = (u) => MOTS_UNITE[nomUnite(u)];

    /**
     * L'UNITÉ LA PLUS CONVAINCANTE d'une case.
     *
     * Une case « obligée » l'est par TROIS unités à la fois — sa ligne, sa
     * colonne et son bloc — et c'est ce qui rend l'explication du robot
     * brumeuse : « sa ligne, sa colonne et son bloc utilisent déjà tous les
     * autres chiffres » demande de regarder partout à la fois. On montre donc
     * celle qui, à elle seule, en dit le plus : la plus remplie. C'est aussi
     * celle qu'un élève regarderait en premier.
     */
    function meilleureUnite(i) {
        let best = -1, remplies = -1;
        unites.forEach((u, k) => {
            if (!u.includes(i)) return;
            const n = u.filter(j => valeurs[j] !== VIDE).length;
            if (n > remplies) { remplies = n; best = k; }
        });
        return best;
    }

    function prochainCoup() {
        for (let i = 0; i < valeurs.length; i++) {
            if (valeurs[i] !== VIDE) continue;
            const cs = candidatsDe(i);
            if (cs.length === 1) return { i, v: cs[0], mode: 'unique', u: meilleureUnite(i) };
        }
        const n = N();
        for (let u = 0; u < unites.length; u++) {
            for (let v = 1; v <= n; v++) {
                if (unites[u].some(i => valeurs[i] === v)) continue;
                const places = unites[u].filter(i => valeurs[i] === VIDE && candidatsDe(i).includes(v));
                if (places.length === 1) {
                    return { i: places[0], v, mode: 'cache', u, unite: nomUnite(u) };
                }
            }
        }
        return null;
    }

    /**
     * LA PHRASE DU COUP, avec les chiffres qu'on voit — pas « tous les autres ».
     *
     * Rémy : « il faut vraiment que le robot soit clair ». Une explication qui
     * dit « il ne reste que le 3 » sans dire OÙ regarder ni ce qu'il y a déjà
     * ne s'attrape pas : l'élève ne sait pas quoi vérifier. Celle-ci nomme
     * l'unité, énumère ce qu'elle contient, et conclut.
     */
    function direCoup(coup) {
        const dedans = unites[coup.u]
            .map(j => valeurs[j]).filter(v => v !== VIDE).sort((a, b) => a - b);
        const m = motsUnite(coup.u);
        if (coup.mode === 'unique') {
            return `Regarde ${m.det} ${m.nom} : ${m.pron} contient déjà ${dedans.join(', ')}. `
                + `Avec ${m.autres} de la case allumée, il ne reste que le <b>${coup.v}</b>.`;
        }
        return `Dans ${m.det} ${m.nom}, le <b>${coup.v}</b> manque encore — et de toutes ses `
            + 'cases vides, une seule peut le recevoir : celle qui est allumée.';
    }

    /** Allume l'unité qui explique le coup, et la case visée. */
    function montrerPiste(coup) {
        effacerPiste();
        if (!coup) return;
        unites[coup.u].forEach(j => celluleEl(j)?.classList.add('su-unite'));
        celluleEl(coup.i)?.classList.add('kk-cage--indice');
    }

    function effacerPiste() {
        container.querySelectorAll('.su-unite')
            .forEach(e => e.classList.remove('su-unite'));
    }

    /**
     * LE MODE TUTORIEL — le jeu ne se contente pas d'être facile, il GUIDE.
     *
     * Une grille presque finie reste une page blanche pour qui n'a jamais vu
     * de sudoku : on ne sait pas par où entrer. Ici le prochain coup est
     * toujours désigné, avec sa raison, et l'élève n'a qu'à le poser — puis à
     * regarder ce qu'il débloque. C'est la méthode qu'on lui apprend, jouée
     * par lui et non regardée.
     */
    const enTutoriel = () => item.meta.difficulte === 'tutoriel' && !session.isDemo;

    function guider() {
        if (!enTutoriel() || session.locked) return;
        const coup = prochainCoup();
        if (!coup) { effacerPiste(); return; }
        montrerPiste(coup);
        statut(direCoup(coup), 'aide');
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
        // Le chiffre dont on parle est en gras : c'est le seul mot de la phrase
        // qu'on doit pouvoir lire sans lire la phrase.
        el.innerHTML = texte;
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
        const fin = () => { cursor?.hideBubble(); gate?.destroy(); };

        if (!await cursor.pause(600) || destroyed) return fin();
        cursor.say(`Chaque chiffre de 1 à ${N()} n'apparaît qu'une fois par ligne, colonne et bloc. Je cherche les cases OBLIGÉES.`,
            container.querySelector('.su-board'));
        if (!await cursor.pause(2200) || destroyed) return fin();

        let coup;
        while ((coup = prochainCoup())) {
            if (!await gate.waitTurn() || destroyed) return fin();
            const el = celluleEl(coup.i);
            if (!el) return fin();
            // LE ROBOT MONTRE CE QU'IL REGARDE AVANT DE DIRE CE QU'IL EN
            // CONCLUT. Rémy : « il faut vraiment que le robot soit clair ».
            // Une phrase sur trois unités à la fois ne s'attrape pas ; une
            // unité allumée, ses chiffres énumérés, et la conclusion, si.
            montrerPiste(coup);
            const dedans = unites[coup.u].map(j => valeurs[j])
                .filter(v => v !== VIDE).sort((a, b) => a - b);
            const m = motsUnite(coup.u);
            cursor.say(coup.mode === 'unique'
                ? `${m.det[0].toUpperCase()}${m.det.slice(1)} ${m.nom} contient déjà `
                    + `${dedans.join(', ')}. Avec ${m.autres} de la case allumée, il ne reste `
                    + `que le ${coup.v}.`
                : `Dans ${m.det} ${m.nom}, le ${coup.v} manque encore — et une seule case vide `
                    + 'peut le recevoir : celle qui est allumée.', el);
            if (!await cursor.pause(2600) || destroyed) return fin();
            if (!await cursor.tap(el, 320) || destroyed) return fin();
            valeurs[coup.i] = coup.v;
            el.querySelector('.kk-val').textContent = coup.v;
            el.classList.add('demo-target');
            effacerPiste();
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
