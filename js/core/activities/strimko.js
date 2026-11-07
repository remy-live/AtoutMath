// Activité « Strimko » : le carré latin à ruisseaux.
//
// RÉMY : « tu me fais le jeu strimko ».
//
// CHAQUE LIGNE, CHAQUE COLONNE ET CHAQUE RUISSEAU portent les nombres de 1 à n,
// une fois chacun. Un ruisseau est une CHAÎNE de cases qui se touchent, et
// c'est tout ce qui change par rapport au Mathdoku — mais ça change beaucoup :
// il n'y a plus un seul calcul à faire, rien que de la déduction.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE DESSIN EST LA MOITIÉ DE LA RÈGLE, et c'est pour ça qu'il est en SVG plutôt
// qu'en bordures de cases.
//
// Un Mathdoku entoure ses cages d'un trait épais : une cage est une TACHE, on
// la voit d'un coup. Un ruisseau, lui, est un CHEMIN : on le suit. Le dessiner
// en bordures donnerait une tache en forme de serpent, qu'on ne saurait ni
// suivre ni distinguer de sa voisine quand elles s'enroulent l'une dans
// l'autre — et elles s'enroulent toujours.
//
// On trace donc une CHAÎNE DE PERLES : un disque par case, un segment épais
// entre deux cases consécutives. Le doigt suit le trait, et deux ruisseaux qui
// se croisent restent lisibles parce qu'ils ne se touchent qu'aux cases.
//
// ET LA COULEUR NE PORTE RIEN TOUTE SEULE. Sept ruisseaux, sept teintes : un
// élève daltonien en confondrait deux. C'est le TRAIT qui dit l'appartenance —
// la couleur ne fait que reposer l'œil.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { brancherGlisserPalette } from './paletteDrag.js';
import { createDemoCursor, createDemoGate } from '../demoPointer.js';
import { carteDesRuisseaux } from '../generators/strimko.js';
import { contenuCase, brancherChamps, saisieActive } from '../../ui/champsGrille.js';
import { meneurDemo } from '../meneurDemo.js';

// Le vérificateur est LIMITÉ, comme au Mathdoku : vérifier doit rester un choix
// qui se paie, pas un oracle qu'on presse après chaque case.
const VERIFICATIONS_PAR_GRILLE = 3;

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
        const { n, ruisseaux, donnees } = item.meta;
        grille = Array.from({ length: n }, () => Array(n).fill(0));
        verrous = Array.from({ length: n }, () => Array(n).fill(false));
        for (const d of donnees) { grille[d.r][d.c] = d.v; verrous[d.r][d.c] = true; }

        const carte = carteDesRuisseaux(n, ruisseaux);
        const avecChamp = saisieActive(session.params);

        const cases = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const donnee = verrous[r][c];
                cases.push(`
                    <div class="st-cell ${donnee ? 'st-given' : ''}" role="button"
                         tabindex="${(donnee || avecChamp) ? -1 : 0}"
                         data-r="${r}" data-c="${c}" data-ruisseau="${carte[r][c]}"
                         aria-label="Ligne ${r + 1}, colonne ${c + 1}, ruisseau ${carte[r][c] + 1}">
                        ${contenuCase({
        valeur: donnee ? grille[r][c] : '', donnee, champ: avecChamp,
        aria: `Ligne ${r + 1}, colonne ${c + 1}`, motif: `[1-${n}]`
    })}
                    </div>`);
            }
        }

        const jetons = [];
        for (let v = 1; v <= n; v++) {
            jetons.push(`<button type="button" class="st-chip" data-chip="${v}">${v}</button>`);
        }
        jetons.push(`<button type="button" class="st-chip st-chip--gomme" data-chip=""
            aria-label="Effacer une case">⌫</button>`);

        container.innerHTML = `
            <div class="strimko-layout">
                <div class="strimko-context">${item.prompt.html || item.prompt.text}</div>
                <div class="st-cadre" style="--st-n:${n}">
                    ${ruisseauxSvg(n, ruisseaux)}
                    <div class="st-board" role="group" aria-label="Grille de Strimko">
                        ${cases.join('')}
                    </div>
                </div>
                <div class="st-palette" aria-label="Nombres à placer">${jetons.join('')}</div>
                <div class="st-actions">
                    <button type="button" class="btn-hint st-btn-verif" data-verifier>
                        Vérifier <span class="st-verif-count">(${verifsRestantes})</span>
                    </button>
                    <button type="button" class="st-btn-valider" data-valider>Valider</button>
                </div>
                <div class="st-status" role="status"></div>
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

    /**
     * LES RUISSEAUX, EN CHAÎNES DE PERLES.
     *
     * LE REPÈRE EST LA GRILLE ELLE-MÊME : `viewBox="0 0 n n"`, donc le centre
     * de la case (r, c) est exactement en (c + 0,5 ; r + 0,5). Aucun pixel
     * n'apparaît ici, et le dessin suit donc la grille quelle que soit la
     * taille de l'écran — c'est ce qui évite les traits qui se décalent d'une
     * demi-case sur un téléphone.
     */
    function ruisseauxSvg(n, ruisseaux) {
        const chemins = ruisseaux.map((ruisseau, i) => {
            const pts = ruisseau.map(p => `${p.c + 0.5},${p.r + 0.5}`).join(' ');
            const perles = ruisseau.map(p =>
                `<circle class="st-perle" cx="${p.c + 0.5}" cy="${p.r + 0.5}" r="0.33"/>`).join('');
            return `<g class="st-ruisseau st-ruisseau--${i % 7}">
                <polyline class="st-fil" points="${pts}"/>${perles}</g>`;
        }).join('');
        // `aria-hidden` : ce dessin répète une information que chaque case
        // porte déjà dans son `aria-label` (« ruisseau 3 »). Le lire deux fois
        // ne renseigne personne et allonge la grille d'autant.
        return `<svg class="st-ruisseaux" viewBox="0 0 ${n} ${n}" aria-hidden="true"
            preserveAspectRatio="none">${chemins}</svg>`;
    }

    // --- Saisie -------------------------------------------------------------

    const celluleEl = (r, c) => container.querySelector(`.st-cell[data-r="${r}"][data-c="${c}"]`);

    function poser(r, c, v) {
        if (verrous[r][c]) return;
        grille[r][c] = v;
        const el = celluleEl(r, c);
        if (!el) return;
        // LA CASE SANS CLAVIER S'APPELLE `.kk-val`, et c'est `contenuCase` qui
        // le décide — pas nous.
        //
        // Il y avait écrit `.cg-valeur`, qui n'existe NULLE PART dans le dépôt
        // (vérifié : une seule occurrence, celle-ci). Au doigt, `querySelector`
        // rendait donc `null` et la ligne jetait « Cannot set properties of null
        // ». Comme le `grille[r][c] = v` est juste au-dessus, la valeur était
        // bien RETENUE : le vérificateur la voyait, « Valider » l'acceptait, et
        // l'écran ne montrait rien. On tapait sur une case, il ne se passait
        // rien, et le jeu disait ensuite « ta grille est complète ».
        //
        // MESURÉ PAR `tools/strimko.mjs` AU DOIGT : 4 cases lues sur 16, c'est-
        // à-dire les quatre indices et pas une de plus. Toute la saisie tablette
        // était morte, et aucune des seize épreuves du générateur ne pouvait le
        // dire — elles ne touchent pas à l'écran.
        const champ = el.querySelector('input');
        if (champ) champ.value = v || '';
        else el.querySelector('.kk-val').textContent = v || '';
        el.classList.toggle('st-rempli', !!v);
        // Toute retouche efface le verdict précédent : laisser « il reste deux
        // fautes » au-dessus d'une grille qu'on vient de changer, c'est faire
        // chercher des fautes qui n'y sont plus.
        effacerVerdict();
    }

    function brancherCases() {
        const n = item.meta.n;
        if (saisieActive(session.params)) {
            // `cleDe` REÇOIT LE CHAMP, PAS LA CASE, et `bloque` ne reçoit RIEN.
            //
            // Les deux étaient écrits de travers ici, et la sonde l'a dit en
            // douze lignes identiques : « Cannot read properties of undefined
            // (reading 'dataset') », une par case tapée. `bloque` est, dans
            // `brancherChamps`, la question « la grille est-elle figée ? » —
            // appelée sans argument. On lui lisait un `dataset` sur rien.
            //
            // RIEN NE SE VOYAIT À L'ÉCRAN : les cases se remplissaient, la
            // grille se validait. L'erreur partait dans la console, où aucun
            // élève ne regarde — et `poser` recevait des coordonnées `NaN`,
            // donc écrivait à côté. C'est l'exemple même de la mesure qui
            // n'emprunte pas le chemin de l'utilisateur : quatre mille épreuves
            // vertes ne l'avaient pas vu.
            brancherChamps(container, {
                bloque: () => session.locked,
                cleDe: (champ) => {
                    const cell = champ.closest('.st-cell');
                    return `${cell.dataset.r},${cell.dataset.c}`;
                },
                // ET LA VALEUR REVIENT EN NOMBRE : `brut` est une chaîne, et
                // `fautes()` compare des nombres. Un '3' rangé dans la grille
                // ne serait jamais égal au 3 de la case voisine — le
                // vérificateur, lui, n'aurait rien signalé.
                poser: (cle, brut) => {
                    const [r, c] = cle.split(',').map(Number);
                    poser(r, c, brut === '' ? 0 : Number(brut));
                }
            });
            return;
        }
        // SANS CLAVIER : un appui fait défiler les valeurs, vide compris. C'est
        // le geste du doigt, et il doit pouvoir REVENIR à vide — sans quoi une
        // case posée par erreur ne s'enlève plus.
        container.querySelectorAll('.st-cell').forEach(el => {
            el.addEventListener('click', () => {
                const r = Number(el.dataset.r), c = Number(el.dataset.c);
                if (verrous[r][c]) return;
                poser(r, c, (grille[r][c] + 1) % (n + 1));
            });
        });
    }

    function brancherPalette() {
        brancherGlisserPalette(container, {
            jeton: '.st-chip',
            classeVisee: 'st-cell--visee',
            bloque: () => session.locked,
            cibleSous(e) {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const cell = el && el.closest ? el.closest('.st-cell') : null;
                if (!cell) return null;
                // LES CASES DONNÉES REFUSENT LE DÉPÔT ICI, et non après coup :
                // c'est ce qui fait que le jeton ne s'y colle même pas, au lieu
                // d'y tomber et de ne rien faire.
                return verrous[Number(cell.dataset.r)][Number(cell.dataset.c)] ? null : cell;
            },
            deposer(cible, chip) {
                poser(Number(cible.dataset.r), Number(cible.dataset.c),
                    chip.dataset.chip === '' ? 0 : Number(chip.dataset.chip));
            }
        });
    }

    // --- Vérifier, et valider -----------------------------------------------

    const statutEl = () => container.querySelector('.st-status');

    function effacerVerdict() {
        container.querySelectorAll('.st-faute').forEach(el => el.classList.remove('st-faute'));
        const s = statutEl();
        if (s) s.textContent = '';
    }

    /**
     * CE QUI NE VA PAS, SANS DIRE LA RÉPONSE.
     *
     * On ne compare PAS à la solution : on cherche les répétitions, c'est-à-dire
     * ce que l'élève peut constater lui-même en relisant. Comparer dirait « cette
     * case est fausse » d'une case juste posée au mauvais endroit, et surtout ça
     * donnerait la réponse par élimination au troisième essai.
     */
    function fautes() {
        const { n, ruisseaux } = item.meta;
        const carte = carteDesRuisseaux(n, ruisseaux);
        const mauvaises = new Set();
        const marquer = (cases) => {
            const vus = new Map();
            for (const { r, c } of cases) {
                const v = grille[r][c];
                if (!v) continue;
                if (vus.has(v)) { mauvaises.add(`${r},${c}`); mauvaises.add(vus.get(v)); }
                else vus.set(v, `${r},${c}`);
            }
        };
        for (let r = 0; r < n; r++) marquer(Array.from({ length: n }, (_, c) => ({ r, c })));
        for (let c = 0; c < n; c++) marquer(Array.from({ length: n }, (_, r) => ({ r, c })));
        for (const ruisseau of ruisseaux) marquer(ruisseau);
        return mauvaises;
    }

    function brancherVerificateur() {
        const bouton = container.querySelector('[data-verifier]');
        if (!bouton) return;
        bouton.addEventListener('click', () => {
            if (verifsRestantes <= 0 || session.locked) return;

            // UNE GRILLE VIDE NE COÛTE PAS UNE VÉRIFICATION.
            //
            // Mesuré à la sonde : « Vérifier » sur une grille où l'on n'avait
            // rien écrit répondait « Rien ne se répète pour l'instant.
            // Continue. » — et retirait un des TROIS essais. Rien ne se répète
            // en effet, puisqu'il n'y a rien : la phrase est vraie et ne dit
            // rien, et elle se paie au prix d'un tiers du vérificateur. C'est
            // le genre de dépense qu'un élève fait une fois par curiosité, et
            // qu'il paie pendant toute la grille.
            const posees = grille.flat().filter(Boolean).length;
            const donnees = verrous.flat().filter(Boolean).length;
            if (posees <= donnees) {
                const s = statutEl();
                if (s) {
                    s.textContent = 'Écris d\'abord quelques nombres : il n\'y a rien '
                        + 'à vérifier pour l\'instant.';
                }
                return;
            }

            verifsRestantes--;
            const compteur = container.querySelector('.st-verif-count');
            if (compteur) compteur.textContent = `(${verifsRestantes})`;
            if (verifsRestantes <= 0) bouton.disabled = true;

            const mauvaises = fautes();
            mauvaises.forEach(cle => {
                const [r, c] = cle.split(',').map(Number);
                const el = celluleEl(r, c);
                if (el) el.classList.add('st-faute');
            });
            const s = statutEl();
            if (!s) return;
            // UNE GRILLE PLEINE SANS RÉPÉTITION NE S'ENTEND PAS DIRE
            // « CONTINUE ».
            //
            // Mesuré à la sonde, sur une grille remplie JUSTE jusqu'à la
            // dernière case : le verdict était mot pour mot celui de la grille
            // vide — « Rien ne se répète pour l'instant. Continue. » Continuer
            // quoi ? L'élève a fini, et on lui répond comme s'il était au
            // milieu.
            //
            // ET CE N'EST PAS DONNER LA RÉPONSE : une grille pleine où aucun
            // nombre ne se répète dans sa ligne, sa colonne ni son ruisseau EST
            // une solution — chaque ligne porte alors n valeurs distinctes
            // prises entre 1 et n, donc toutes. Le Strimko n'en ayant qu'une
            // (c'est ce que le générateur garantit), elle est LA solution.
            // L'élève a déjà sa réponse sous les yeux : on ne lui apprend que
            // ce que le vérificateur a mesuré.
            const pleine = posees === item.meta.n * item.meta.n;
            s.textContent = mauvaises.size
                ? `${mauvaises.size} case${mauvaises.size > 1 ? 's' : ''} en double : un nombre `
                  + 'revient deux fois dans une ligne, une colonne ou un ruisseau.'
                : pleine
                    ? 'Ta grille est complète et rien ne s\'y répète : tu peux valider.'
                    : 'Rien ne se répète pour l\'instant. Continue.';
        });
    }

    function brancherValidation() {
        const bouton = container.querySelector('[data-valider]');
        if (!bouton) return;
        bouton.addEventListener('click', () => {
            const { n, solution } = item.meta;
            const vide = [];
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) if (!grille[r][c]) vide.push({ r, c });
            }
            if (vide.length) {
                const s = statutEl();
                if (s) {
                    s.textContent = `Il reste ${vide.length} case${vide.length > 1 ? 's' : ''} `
                        + 'à remplir.';
                }
                return;
            }

            const juste = grille.every((ligne, r) => ligne.every((v, c) => v === solution[r][c]));
            const donne = grille.map(l => l.join('')).join('|');
            const result = session.submit(donne, { element: bouton });
            if (result.ignored) return;

            const board = container.querySelector('.st-board');
            if (board) board.classList.add(juste ? 'st-board--ok' : 'st-board--secoue');
            if (!juste) {
                fautes().forEach(cle => {
                    const [r, c] = cle.split(',').map(Number);
                    const el = celluleEl(r, c);
                    if (el) el.classList.add('st-faute');
                });
                regTimeout(() => {
                    if (board) board.classList.remove('st-board--secoue');
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
        const { n, ruisseaux, solution } = item.meta;
        if (!cursor) cursor = createDemoCursor();
        const gate = createDemoGate(container.querySelector('.strimko-layout') || container);
        const robot = meneurDemo(cursor, gate, () => !destroyed, null, { garderPointeur: true });
        const fin = () => robot.fin();
        try {
            cursor.protegerZone(container.querySelector('.st-cadre'));
            if (!await robot.attendre(600)) return fin();
            cursor.say(`Chaque ligne et chaque colonne portent les nombres de 1 à ${n}, `
                + 'une fois chacun — comme un sudoku.', container.querySelector('.st-board'));
            if (!await robot.attendre(3200)) return fin();

            // ON MONTRE LE RUISSEAU EN LE PARCOURANT, parce que c'est le seul
            // point de règle qui ne se devine pas — et qu'un chemin se montre
            // en le suivant, pas en le nommant.
            const el0 = container.querySelector('.st-ruisseau--0');
            if (el0) el0.classList.add('st-ruisseau--montre');
            cursor.say('Et la chaîne de perles, c\'est un RUISSEAU : lui aussi porte '
                + `les ${n} nombres.`, container.querySelector('.st-cadre'));
            if (!await robot.attendre(3400)) return fin();
            for (const p of ruisseaux[0]) {
                const el = celluleEl(p.r, p.c);
                if (el && !await cursor.tap(el, 420)) return fin();
                if (destroyed) return fin();
            }
            if (el0) el0.classList.remove('st-ruisseau--montre');

            const libre = [];
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) if (!verrous[r][c]) libre.push({ r, c });
            }
            const cible = libre[0];
            if (cible) {
                const el = celluleEl(cible.r, cible.c);
                cursor.say('Ici, un seul nombre tient à la fois dans la ligne, la colonne '
                    + 'et le ruisseau.', el);
                if (!await robot.attendre(2800)) return fin();
                if (el && await cursor.tap(el, 700)) poser(cible.r, cible.c, solution[cible.r][cible.c]);
            }
            if (!await robot.attendre(1600)) return fin();
        } catch (e) { /* démonstration coupée */ }
        fin();
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
