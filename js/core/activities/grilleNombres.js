// UNE GRILLE DE CASES OÙ L'ON ÉCRIT DES NOMBRES — pour cinq jeux à la fois.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 octobre : « tu me les fais tous, avec des grilles faciles, que ça
// fonctionne sur ordi, tablette et téléphone. Tu peux faire les 6 cette nuit ».
//
// CINQ DES SIX SONT LA MÊME CHOSE. Le Kakuro, le Yohaku, le Suguru, les
// Gratte-ciel et le Chemin des Nombres posent tous la même question à l'élève
// — écris un nombre dans chaque case — et ne diffèrent que par ce qu'on
// dessine AUTOUR : des murs et des sommes en diagonale, des totaux en marge,
// des zones aux bords épais, des indices hors de la grille. Cinq copies d'une
// même activité, c'est cinq endroits où corriger le jour où la saisie au
// doigt changera.
//
// CE MODULE NE SAIT RIEN DES MATHÉMATIQUES DE CES JEUX. Il reçoit du
// générateur une description de grille — quelles cases s'écrivent, lesquelles
// sont données, où sont les murs, ce qui s'affiche en marge — et il affiche,
// saisit, compare. Toute la règle du jeu vit dans le générateur, et c'est lui
// qui a vérifié l'unicité de la solution.
//
// LE CONTRAT, dans `item.meta` :
//
//   lignes, colonnes   la taille
//   cases[]            { r, c, type, valeur?, zone?, haut?, bas? }
//                      type : 'vide' (à remplir) · 'donnee' (écrite d'avance)
//                             'mur' (noire) · 'indice' (noire à deux sommes)
//   solution[][]       la grille complète attendue — 0 pour les murs
//   chiffres           { min, max } : ce qu'on peut écrire
//   marges             { haut, bas, gauche, droite } : des étiquettes, ou rien
//   zones              vrai si les bords de zone se dessinent (Suguru)
//   palette            vrai si l'on offre les jetons (faux au-delà de neuf)
//
// LA SAISIE EST CELLE DU DÉPÔT (`ui/champsGrille.js`) : un vrai champ par
// case, donc le pavé numérique du téléphone, les flèches, l'avance
// automatique et l'ordre de lecture. On ne la réécrit pas.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { contenuCase, brancherChamps, saisieActive } from '../../ui/champsGrille.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { meneurDemo } from '../meneurDemo.js';

/** La réponse d'une grille, écrite d'une seule chaîne. Voir `ecrireGrille`. */
export const ecrireGrille = (g) => 'g' + g.map(l => l.join(',')).join('/');

export function mount(container, session) {
    let destroyed = false;
    let cursor = null;
    let gate = null;
    let item = null;
    /** Ce que l'élève a écrit, case par case. 0 = vide. */
    let grille = [];
    let caseActive = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    const typeDe = (r, c) => (item.meta.cases.find(x => x.r === r && x.c === c) || {});
    const estMur = (r, c) => /^(mur|indice)$/.test(typeDe(r, c).type || '');

    function render(prochain) {
        item = prochain;
        const { lignes, colonnes, cases, chiffres, marges = {}, zones, palette } = item.meta;
        grille = Array.from({ length: lignes }, (_, r) =>
            Array.from({ length: colonnes }, (_, c) => {
                const t = typeDe(r, c);
                return t.type === 'donnee' ? Number(t.valeur) : 0;
            }));
        caseActive = null;

        const champ = saisieActive(session.params);
        const signes = chiffres.max > 9 ? 2 : 1;
        const motif = signes > 1 ? '[0-9]{1,2}' : `[${chiffres.min}-${chiffres.max}]`;

        // ── LES BORDS DE ZONE ──────────────────────────────────────────────
        //
        // Un trait épais entre deux cases de zones DIFFÉRENTES, rien entre
        // deux cases de la même. C'est le seul dessin du Suguru, et il porte
        // toute la règle : sans lui, la grille n'a plus de sens.
        const bordsDe = (r, c) => {
            if (!zones) return '';
            const z = typeDe(r, c).zone;
            const autre = (rr, cc) => (rr < 0 || cc < 0 || rr >= lignes || cc >= colonnes)
                || typeDe(rr, cc).zone !== z;
            return [
                autre(r - 1, c) ? 'gn-cell--haut' : '',
                autre(r + 1, c) ? 'gn-cell--bas' : '',
                autre(r, c - 1) ? 'gn-cell--gauche' : '',
                autre(r, c + 1) ? 'gn-cell--droite' : ''
            ].filter(Boolean).join(' ');
        };

        // ── TOUT DANS UNE SEULE GRILLE, MARGES COMPRISES ───────────────────
        //
        // Les totaux du Yohaku et les indices des Gratte-ciel vivent HORS du
        // damier, mais doivent s'aligner au pixel sur ses colonnes. Deux
        // grilles côte à côte ne s'alignent que par accident ; une seule, où
        // les marges sont des cases comme les autres, s'aligne par
        // construction.
        //
        // ET TOUTES LES CASES SONT ÉMISES, coins vides compris, dans l'ordre
        // de lecture : le rangement automatique de la grille est alors sans
        // surprise. (Le Shikaku a appris la leçon inverse — là-bas, des
        // éléments placés À LA MAIN bousculaient ceux qui ne l'étaient pas.)
        const mg = marges.gauche ? 1 : 0, md = marges.droite ? 1 : 0;
        const mh = marges.haut ? 1 : 0, mb = marges.bas ? 1 : 0;
        const etiq = (v, sens) => `<div class="gn-marge gn-marge--${sens}">${
            v === null || v === undefined ? '' : v}</div>`;
        const vide = '<div class="gn-marge gn-marge--coin"></div>';
        const bande = (liste, sens) => (mg ? vide : '')
            + Array.from({ length: colonnes }, (_, c) => etiq((liste || [])[c], sens)).join('')
            + (md ? vide : '');


        const cellules = [];
        for (let r = 0; r < lignes; r++) {
            for (let c = 0; c < colonnes; c++) {
                const t = typeDe(r, c);
                const aria = `ligne ${r + 1}, colonne ${c + 1}`;
                if (t.type === 'mur') {
                    cellules.push(`<div class="gn-cell gn-cell--mur"></div>`);
                    continue;
                }
                if (t.type === 'indice') {
                    // LES DEUX SOMMES DU KAKURO, de part et d'autre d'une
                    // diagonale : en haut à droite ce que vaut la ligne qui
                    // part vers la droite, en bas à gauche la colonne qui
                    // descend. C'est la convention de toutes les grilles
                    // publiées, et en changer rendrait illisibles celles que
                    // l'élève trouvera ailleurs.
                    cellules.push(`<div class="gn-cell gn-cell--indice">
                        <span class="gn-ind gn-ind--droite">${t.droite || ''}</span>
                        <span class="gn-ind gn-ind--bas">${t.bas || ''}</span>
                    </div>`);
                    continue;
                }
                const donnee = t.type === 'donnee';
                cellules.push(`<div class="gn-cell ${donnee ? 'gn-cell--donnee' : ''}
                    ${bordsDe(r, c)}" data-r="${r}" data-c="${c}">
                    ${contenuCase({
                        valeur: donnee ? t.valeur : '', donnee, champ, aria, motif, signes
                    })}</div>`);
            }
        }

        // On recompose ligne par ligne, en glissant les marges latérales.
        const rangees = [];
        if (mh) rangees.push(bande(marges.haut, 'haut'));
        for (let r = 0; r < lignes; r++) {
            rangees.push((mg ? etiq((marges.gauche || [])[r], 'gauche') : '')
                + cellules.slice(r * colonnes, (r + 1) * colonnes).join('')
                + (md ? etiq((marges.droite || [])[r], 'droite') : ''));
        }
        if (mb) rangees.push(bande(marges.bas, 'bas'));


        const jetons = [];
        if (palette !== false && chiffres.max <= 9) {
            for (let v = chiffres.min; v <= chiffres.max; v++) {
                jetons.push(`<button type="button" class="gn-jeton" data-jeton="${v}">${v}</button>`);
            }
            jetons.push(`<button type="button" class="gn-jeton gn-jeton--gomme" data-jeton=""
                aria-label="Effacer une case">⌫</button>`);
        }

        container.innerHTML = `
            <div class="gn-layout">
                <div class="gn-context">${item.prompt.html}</div>
                <div class="gn-board" role="group"
                     style="--gn-cols:${colonnes + mg + md}; --gn-rows:${lignes + mh + mb}"
                     aria-label="${item.meta.titreCourt || 'Grille'}">${rangees.join('')}</div>
                ${jetons.length ? `<div class="gn-palette"
                    aria-label="Nombres à placer">${jetons.join('')}</div>` : ''}
                <div class="gn-actions">
                    <button type="button" class="gn-btn gn-btn--doux" data-recommencer>
                        ↺ Recommencer</button>
                    <button type="button" class="gn-btn gn-btn--fort" data-valider>Valider</button>
                </div>
                <div class="gn-statut" role="status"></div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) {
            if (!session.frozen) runDemo();
            return;
        }
        wireHint(container, session);
        brancherCases();
        brancherChamps(container, {
            poser: (cle, v) => {
                const [r, c] = cle.split(',').map(Number);
                poser(r, c, v === '' ? 0 : Number(v));
            },
            cleDe: (ch) => {
                const cel = ch.closest('.gn-cell');
                return `${cel.dataset.r},${cel.dataset.c}`;
            },
            bloque: () => session.locked || destroyed
        });
        brancherPalette();
        brancherBoutons();
        majReste();
    }

    const statut = (texte, ton = '') => {
        const el = container.querySelector('.gn-statut');
        if (!el) return;
        el.textContent = texte;
        el.className = `gn-statut${ton ? ' gn-statut--' + ton : ''}`;
    };

    const videsRestantes = () => {
        let n = 0;
        for (let r = 0; r < item.meta.lignes; r++) {
            for (let c = 0; c < item.meta.colonnes; c++) {
                if (!estMur(r, c) && !grille[r][c]) n++;
            }
        }
        return n;
    };

    function majReste() {
        const n = videsRestantes();
        if (!n) { statut('La grille est complète : tu peux valider.', 'ok'); return; }
        statut(`${n} case${n > 1 ? 's' : ''} ${n > 1 ? 'restent' : 'reste'} à remplir.`);
    }

    function poser(r, c, v) {
        if (session.locked || destroyed) return;
        if (estMur(r, c) || typeDe(r, c).type === 'donnee') return;
        grille[r][c] = v;
        majReste();
    }

    const celluleEl = (r, c) => container.querySelector(`.gn-cell[data-r="${r}"][data-c="${c}"]`);

    /** Toucher une case la désigne : le jeton suivant ira dedans. */
    function brancherCases() {
        container.querySelectorAll('.gn-cell[data-r]').forEach(cel => {
            if (cel.classList.contains('gn-cell--donnee')) return;
            cel.addEventListener('pointerdown', () => {
                container.querySelectorAll('.gn-cell--active')
                    .forEach(x => x.classList.remove('gn-cell--active'));
                cel.classList.add('gn-cell--active');
                caseActive = { r: Number(cel.dataset.r), c: Number(cel.dataset.c) };
            });
        });
    }

    /**
     * LA PALETTE EST LE GESTE DE LA TABLETTE : on touche une case, on touche
     * un nombre. Le clavier reste là pour ceux qui en ont un — les deux
     * écrivent dans la même grille.
     */
    function brancherPalette() {
        container.querySelectorAll('[data-jeton]').forEach(btn => {
            btn.onclick = () => {
                if (!caseActive || session.locked || destroyed) {
                    if (!caseActive) statut('Touche d\'abord une case de la grille.');
                    return;
                }
                const v = btn.dataset.jeton === '' ? 0 : Number(btn.dataset.jeton);
                poser(caseActive.r, caseActive.c, v);
                const cel = celluleEl(caseActive.r, caseActive.c);
                const ch = cel && cel.querySelector('.kk-val');
                if (ch) {
                    if (ch.tagName === 'INPUT') ch.value = v ? String(v) : '';
                    else ch.textContent = v ? String(v) : '';
                }
            };
        });
    }

    function secouer() {
        const b = container.querySelector('.gn-board');
        if (!b) return;
        b.classList.remove('gn-board--secoue');
        void b.offsetWidth;
        b.classList.add('gn-board--secoue');
    }

    function brancherBoutons() {
        container.querySelector('[data-recommencer]').onclick = () => {
            if (session.locked || destroyed) return;
            render(item);
        };
        container.querySelector('[data-valider]').onclick = () => {
            if (session.locked || destroyed) return;
            const n = videsRestantes();
            if (n) {
                statut(`Il reste ${n} case${n > 1 ? 's' : ''} à remplir.`, 'ko');
                secouer();
                return;
            }
            const result = session.submit(ecrireGrille(grille));
            if (result.ignored) return;
            const board = container.querySelector('.gn-board');
            board.classList.toggle('gn-board--ok', result.correct);
            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) { renderNext(); return; }
                if (result.revealed) { montrerLaSolution(); regTimeout(renderNext, 3200); }
                else statut('Ce n\'est pas la bonne grille — cherche la case dont tu es le '
                    + 'moins sûr.', 'ko');
            });
        };
    }

    /** La solution s'écrit DANS la grille : c'est là qu'elle se comprend. */
    function montrerLaSolution() {
        const { lignes, colonnes, solution } = item.meta;
        for (let r = 0; r < lignes; r++) {
            for (let c = 0; c < colonnes; c++) {
                if (estMur(r, c)) continue;
                const cel = celluleEl(r, c);
                if (!cel) continue;
                const el = cel.querySelector('.kk-val');
                const bon = solution[r][c];
                if (el) {
                    if (el.tagName === 'INPUT') el.value = String(bon);
                    else el.textContent = String(bon);
                }
                if (grille[r][c] !== bon) cel.classList.add('gn-cell--corrige');
            }
        }
        statut('Voici la grille attendue.', 'ok');
    }

    /**
     * LE ROBOT REMPLIT DANS L'ORDRE DE LECTURE, en disant la règle du jeu à
     * la première case. Il ne cherche pas : montrer une recherche demanderait
     * de montrer les essais ratés, et une démonstration qui se trompe à
     * l'écran apprend surtout à douter du logiciel.
     */
    async function runDemo() {
        const board = container.querySelector('.gn-board');
        if (!board) return;
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const robot = meneurDemo(cursor, gate, () => !destroyed, null, { rangementSeul: true });
        if (!await robot.tour()) return;
        cursor.say((item.hints || [])[0] || 'On remplit case par case.', board);
        if (!await robot.pause(DEMO_SPEED.settle)) return;
        const { lignes, colonnes, solution } = item.meta;
        for (let r = 0; r < lignes; r++) {
            for (let c = 0; c < colonnes; c++) {
                if (estMur(r, c) || typeDe(r, c).type === 'donnee') continue;
                if (!await robot.tour()) return;
                const cel = celluleEl(r, c);
                const el = cel && cel.querySelector('.kk-val');
                if (el) {
                    if (el.tagName === 'INPUT') el.value = String(solution[r][c]);
                    else el.textContent = String(solution[r][c]);
                }
                if (cel) cel.classList.add('gn-cell--demo');
                if (!await robot.pause(DEMO_SPEED.between / 2)) return;
            }
        }
        if (!await robot.tour()) return;
        cursor.say('La grille est complète.', board);
        if (!await robot.pause(DEMO_SPEED.between)) return;
        renderNext();
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
