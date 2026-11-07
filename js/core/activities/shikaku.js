// Activité « Shikaku » : découper la grille en rectangles.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, avec une capture d'écran : « Tu pourrais me créer ce jeu là ».
//
// LE GESTE EST TOUT L'EXERCICE : on glisse d'un coin à l'autre, et le
// rectangle se pose. Deux choix, faits une fois pour toutes :
//
//   · ON GLISSE, ON NE TAPE PAS DEUX COINS. Taper deux fois demande de se
//     souvenir du premier coin entre les deux appuis ; glisser MONTRE le
//     rectangle pendant qu'on le construit, avec son nombre de cases écrit
//     dessus. C'est la différence entre compter dans sa tête et voir.
//   · UN RECTANGLE QUI NE TOMBE PAS JUSTE N'EST PAS POSÉ, et l'on DIT
//     pourquoi : « 6 cases, mais le nombre dedans est 8 ». Les logiciels de
//     Shikaku laissent poser n'importe quoi et colorent en rouge ; ici le
//     refus est la leçon — longueur × largeur, à chaque geste, et le mot
//     « cases » est dit à voix haute.
//
// La ligne rouge du dépôt ne s'y oppose pas : on ne trace rien à la règle ni
// au compas, on découpe une grille de cases — le geste du Sudoku, pas celui
// de la construction géométrique.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { meneurDemo } from '../meneurDemo.js';
import { ecrireDecoupage } from '../generators/shikaku.js';

/** Les couleurs tournent : deux rectangles voisins n'ont jamais la même. */
const COULEURS = 6;

export function mount(container, session) {
    let destroyed = false;
    let cursor = null;
    let gate = null;
    let item = null;
    /** Les rectangles posés par l'élève, dans l'ordre où il les a posés. */
    let poses = [];
    let depart = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    // --- Lecture de la grille ------------------------------------------------

    const dansRect = (rec, r, c) => r >= rec.r0 && r <= rec.r1 && c >= rec.c0 && c <= rec.c1;
    const rectDe = (r, c) => poses.find(rec => dansRect(rec, r, c));
    const aireDe = (rec) => (rec.r1 - rec.r0 + 1) * (rec.c1 - rec.c0 + 1);

    /** Les nombres de l'énoncé qui tombent dans ce rectangle. */
    const nombresDe = (rec) => item.meta.indices.filter(i => dansRect(rec, i.r, i.c));

    const cases = () => item.meta.lignes * item.meta.colonnes;
    const couvertes = () => poses.reduce((n, rec) => n + aireDe(rec), 0);

    // --- Dessin --------------------------------------------------------------

    const zone = (rec) => `grid-area: ${rec.r0 + 1} / ${rec.c0 + 1} / ${rec.r1 + 2} / ${rec.c1 + 2}`;

    function render(prochain) {
        item = prochain;
        poses = [];
        depart = null;
        const { lignes, colonnes, indices } = item.meta;

        // CHAQUE CASE DIT OÙ ELLE VA, et ce n'est pas une précaution de style.
        //
        // MESURÉ : sans position explicite, les cases sont placées
        // AUTOMATIQUEMENT par la grille — et les nombres, eux, ont une place
        // fixe. La grille place d'abord ce qui est fixe, puis range les cases
        // dans ce qui reste : les quarante-deux cases glissaient donc d'un
        // cran à chaque nombre rencontré, et la grille poussait des rangées
        // en trop. `document.elementFromPoint` au milieu du plateau répondait
        // « case [0,6] » là où l'on visait [1,1], et un rectangle juste se
        // posait sur deux nombres. Tracé événement par événement avant de
        // comprendre.
        const cellules = [];
        for (let r = 0; r < lignes; r++) {
            for (let c = 0; c < colonnes; c++) {
                cellules.push(`<button type="button" class="sk-case" data-r="${r}" data-c="${c}"
                    style="${zone({ r0: r, c0: c, r1: r, c1: c })}"
                    aria-label="ligne ${r + 1}, colonne ${c + 1}"></button>`);
            }
        }
        const nombres = indices.map((i, k) =>
            `<span class="sk-nb" data-nb="${k}" style="${zone({ r0: i.r, c0: i.c, r1: i.r, c1: i.c })}"
                >${i.n}</span>`).join('');

        container.innerHTML = `
            <div class="sk-layout">
                <div class="sk-context">${item.prompt.html}</div>
                <div class="sk-board" style="--sk-l:${lignes}; --sk-c:${colonnes}"
                     role="group" aria-label="Grille de Shikaku">
                    ${cellules.join('')}
                    <div class="sk-rects" aria-hidden="true"></div>
                    ${nombres}
                    <div class="sk-apercu" hidden aria-hidden="true"></div>
                </div>
                <div class="sk-actions">
                    <button type="button" class="sk-btn sk-btn--doux" data-recommencer>
                        ↺ Recommencer</button>
                    <button type="button" class="sk-btn sk-btn--fort" data-valider>Valider</button>
                </div>
                <div class="sk-statut" role="status"></div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) {
            if (!session.frozen) runDemo();
            return;
        }
        wireHint(container, session);
        brancherGlisser();
        brancherBoutons();
        majReste();
    }

    const statut = (texte, ton = '') => {
        const el = container.querySelector('.sk-statut');
        if (!el) return;
        el.textContent = texte;
        el.className = `sk-statut${ton ? ' sk-statut--' + ton : ''}`;
    };

    /** Combien de cases restent à couvrir — c'est le seul compte qui compte. */
    function majReste() {
        const reste = cases() - couvertes();
        if (!reste) { statut('La grille est couverte : tu peux valider.', 'ok'); return; }
        statut(`${reste} case${reste > 1 ? 's' : ''} ${reste > 1 ? 'restent' : 'reste'} à couvrir.`);
    }

    function peindre() {
        const hote = container.querySelector('.sk-rects');
        if (!hote) return;
        hote.innerHTML = poses.map((rec, k) =>
            `<div class="sk-rect sk-rect--${k % COULEURS}" style="${zone(rec)}"></div>`).join('');
        // LE NOMBRE SE LIT SUR SON RECTANGLE, donc il change d'encre avec lui :
        // du blanc sur un fond pastel se perd, et c'est le seul chiffre de la
        // grille qu'on doit pouvoir relire après l'avoir posé.
        container.querySelectorAll('.sk-nb').forEach((el, k) => {
            const i = item.meta.indices[k];
            el.classList.toggle('sk-nb--pose', !!rectDe(i.r, i.c));
        });
    }

    // --- Le glisser ----------------------------------------------------------

    /** La case sous le doigt, ou null — `elementFromPoint` dit QUI est là. */
    function caseSous(x, y) {
        const el = document.elementFromPoint(x, y);
        const cel = el && el.closest ? el.closest('.sk-case') : null;
        if (!cel || !container.contains(cel)) return null;
        return { r: Number(cel.dataset.r), c: Number(cel.dataset.c) };
    }

    const rectEntre = (a, b) => ({
        r0: Math.min(a.r, b.r), c0: Math.min(a.c, b.c),
        r1: Math.max(a.r, b.r), c1: Math.max(a.c, b.c)
    });

    function montrerApercu(rec) {
        const ap = container.querySelector('.sk-apercu');
        if (!ap) return;
        if (!rec) { ap.hidden = true; return; }
        ap.hidden = false;
        ap.setAttribute('style', zone(rec));
        // LE NOMBRE DE CASES S'ÉCRIT PENDANT QU'ON GLISSE. C'est tout l'intérêt
        // du geste : on voit « 3 × 4 = 12 » se former au lieu de le calculer
        // après coup.
        const h = rec.r1 - rec.r0 + 1, w = rec.c1 - rec.c0 + 1;
        ap.textContent = `${h} × ${w} = ${h * w}`;
        const n = nombresDe(rec);
        ap.classList.toggle('sk-apercu--ok', n.length === 1 && n[0].n === h * w);
    }

    function brancherGlisser() {
        const board = container.querySelector('.sk-board');
        board.addEventListener('pointerdown', (e) => {
            if (session.locked || destroyed) return;
            const cel = caseSous(e.clientX, e.clientY);
            if (!cel) return;
            e.preventDefault();
            depart = cel;
            board.setPointerCapture(e.pointerId);
            montrerApercu(rectEntre(cel, cel));
        });
        board.addEventListener('pointermove', (e) => {
            if (!depart) return;
            const cel = caseSous(e.clientX, e.clientY);
            if (cel) montrerApercu(rectEntre(depart, cel));
        });
        const finir = (e) => {
            if (!depart) return;
            const cel = caseSous(e.clientX, e.clientY) || depart;
            const rec = rectEntre(depart, cel);
            const seul = depart.r === cel.r && depart.c === cel.c;
            depart = null;
            montrerApercu(null);
            // UN SIMPLE APPUI SUR UN RECTANGLE POSÉ LE RETIRE. C'est la gomme,
            // et elle est là où se trouve ce qu'on veut effacer.
            const dessous = rectDe(rec.r0, rec.c0);
            if (seul && dessous) {
                poses = poses.filter(x => x !== dessous);
                peindre(); majReste();
                return;
            }
            poser(rec);
        };
        board.addEventListener('pointerup', finir);
        board.addEventListener('pointercancel', () => {
            depart = null; montrerApercu(null);
        });
    }

    /**
     * POSER — ET REFUSER EN DISANT POURQUOI.
     *
     * Les trois refus sont les trois façons de se tromper, et chacun nomme ce
     * qui ne va pas plutôt que de dire « faux » :
     *   · le rectangle ne contient aucun nombre — il n'appartient à personne ;
     *   · il en contient deux — la règle en veut un seul ;
     *   · il en contient un, mais le compte n'y est pas — et l'on écrit les
     *     deux nombres côte à côte, parce que c'est leur comparaison qui
     *     apprend quelque chose.
     */
    function poser(rec) {
        const h = rec.r1 - rec.r0 + 1, w = rec.c1 - rec.c0 + 1;
        const aire = h * w;
        // « 1 × 1 = 1 cases » : l'accord se voit tout de suite sur une feuille
        // de maths, et il fait trébucher la lecture au moment où l'on demande
        // de compter avec attention.
        const cas = (n) => `${n} case${n > 1 ? 's' : ''}`;
        const dedans = nombresDe(rec);
        if (!dedans.length) {
            statut(`Ce rectangle de ${cas(aire)} ne contient aucun nombre.`, 'ko');
            secouer(); return;
        }
        if (dedans.length > 1) {
            statut(`Ce rectangle contient ${dedans.length} nombres : il n'en faut qu'un.`, 'ko');
            secouer(); return;
        }
        if (dedans[0].n !== aire) {
            statut(`${h} × ${w} = ${cas(aire)}, mais le nombre dedans est ${dedans[0].n}.`, 'ko');
            secouer(); return;
        }
        // IL EFFACE CE QU'IL RECOUVRE. Redessiner par-dessus est la façon
        // naturelle de se corriger : obliger à effacer d'abord ferait deux
        // gestes là où l'élève en voit un.
        poses = poses.filter(x => !(x.r0 <= rec.r1 && x.r1 >= rec.r0
            && x.c0 <= rec.c1 && x.c1 >= rec.c0));
        poses.push(rec);
        peindre();
        majReste();
    }

    function secouer() {
        const board = container.querySelector('.sk-board');
        if (!board) return;
        board.classList.remove('sk-board--secoue');
        void board.offsetWidth;
        board.classList.add('sk-board--secoue');
    }

    // --- Boutons -------------------------------------------------------------

    function brancherBoutons() {
        container.querySelector('[data-recommencer]').onclick = () => {
            if (session.locked || destroyed) return;
            poses = [];
            peindre();
            majReste();
        };
        container.querySelector('[data-valider]').onclick = () => {
            if (session.locked || destroyed) return;
            const reste = cases() - couvertes();
            if (reste > 0) {
                statut(`Il reste ${reste} case${reste > 1 ? 's' : ''} à couvrir.`, 'ko');
                secouer();
                return;
            }
            // L'ORDRE DE LECTURE, LE MÊME QUE CELUI DU GÉNÉRATEUR : de haut en
            // bas, de gauche à droite. Deux découpages identiques doivent
            // s'écrire pareil, sinon le bon serait compté faux.
            const tri = poses.slice().sort((a, b) => (a.r0 - b.r0) || (a.c0 - b.c0));
            const result = session.submit(ecrireDecoupage(tri));
            if (result.ignored) return;
            const board = container.querySelector('.sk-board');
            board.classList.toggle('sk-board--ok', result.correct);
            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) { renderNext(); return; }
                if (result.revealed) { montrerLaSolution(); regTimeout(renderNext, 3000); }
            });
        };
    }

    /** La solution se montre DANS la grille : c'est là qu'elle se comprend. */
    function montrerLaSolution() {
        poses = item.meta.solution.map(r => ({ ...r }));
        peindre();
        statut('Voici le découpage attendu.', 'ok');
    }

    // --- Le robot ------------------------------------------------------------

    /**
     * LE ROBOT POSE LES RECTANGLES DANS L'ORDRE OÙ ON LES TROUVERAIT : les
     * nombres premiers d'abord — ils n'ont qu'une forme —, les autres ensuite,
     * du plus petit au plus grand. Montrer la solution dans l'ordre de lecture
     * n'apprendrait rien : c'est la STRATÉGIE qu'on vient voir.
     */
    const premier = (n) => {
        if (n < 2) return false;
        for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
        return true;
    };

    async function runDemo() {
        const board = container.querySelector('.sk-board');
        if (!board) return;
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const robot = meneurDemo(cursor, gate, () => !destroyed, null, { rangementSeul: true });
        if (!await robot.tour()) return;
        cursor.say('On cherche en combien de cases se découpe chaque nombre.', board);
        if (!await robot.pause(DEMO_SPEED.settle)) return;

        const ordre = item.meta.solution
            .map((rec, k) => ({ rec, n: item.meta.indices[k].n }))
            .sort((a, b) => (premier(b.n) - premier(a.n)) || (a.n - b.n));
        for (const { rec, n } of ordre) {
            if (!await robot.tour()) return;
            const h = rec.r1 - rec.r0 + 1, w = rec.c1 - rec.c0 + 1;
            const cible = container.querySelector(`.sk-case[data-r="${rec.r0}"][data-c="${rec.c0}"]`);
            if (cible) cursor.say(premier(n)
                ? `${n} est premier : une seule ligne de ${n} cases.`
                : `${n} = ${h} × ${w}`, cible);
            poses.push({ ...rec });
            peindre();
            if (!await robot.pause(DEMO_SPEED.between)) return;
        }
        if (!await robot.tour()) return;
        cursor.say('Toute la grille est couverte, sans trou ni chevauchement.', board);
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
