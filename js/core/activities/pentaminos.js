// Activité « Les Pentaminos » — on prend une pièce et on la pose.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 29 octobre : « les penamios, ca me va ». La maquette montrait quatre
// pièces dans un 4 × 5, un bac en bas, et quatre boutons — Tourner, Retourner,
// Aide, Tout sortir. C'est ce qui est construit ici.
//
// ── LE GLISSER, ÉCRIT UNE QUATRIÈME FOIS, ET LES TROIS LEÇONS TIENNENT ─────
//
// Ce dépôt a payé trois fois le même ensemble de pièges — la Grille de
// Nombres, les allumettes, La Traversée. On les referme ici d'un coup, et
// c'est pour cela qu'il n'y a AUCUN `onclick` dans ce fichier :
//
//   · LES ÉCOUTEURS VIVENT SUR LA RACINE, qui survit aux repeints. Posés sur
//     les pièces, ils disparaîtraient au premier redessin, en plein geste.
//   · ON NE CAPTURE LE POINTEUR QU'AU PREMIER MOUVEMENT. `setPointerCapture`
//     dès l'appui fait livrer le `click` qui suit à la racine au lieu de la
//     pièce, et le simple toucher cesse de marcher sans erreur ni trace.
//   · LE TOUCHER EST TRAITÉ DANS `pointerup`, PAS DANS UN `click`. C'est la
//     façon la plus simple de ne jamais avoir à avaler le clic fantôme qu'un
//     doigt laisse derrière lui — il n'y a pas de clic à avaler.
//
// ── CE QU'UNE PIÈCE POSÉE DOIT GARDER ──────────────────────────────────────
//
// Son ORIENTATION. Une pièce qu'on reprend du plateau et qu'on remet dans le
// bac doit y revenir tournée comme elle était : sinon l'élève, qui l'avait
// mise d'équerre, recommence son travail à chaque essai.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import {
    FORMES, TEINTES, couvertes, estFini, orientations, posees, poseTient, resoudre
} from '../pentaminos.js';

/** En deçà de ce déplacement, le geste reste un simple toucher. */
const SEUIL = 8;

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** Pour chaque pièce : son orientation courante et, si elle est posée, où. */
    let etats = new Map();
    let choisie = null, fini = false;
    /** Le geste en cours. */
    let prise = null, depart = null, aGlisse = false, fantome = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    /** Toutes les pièces reviennent au bac, dans leur orientation d'origine. */
    function remettre() {
        etats = new Map(item.meta.pieces.map(id => [id, {
            vues: orientations(FORMES[id]), vue: 0, x: null, y: null
        }]));
        choisie = null;
        fini = false;
    }

    const formeDe = (id) => {
        const e = etats.get(id);
        return e.vues[e.vue % e.vues.length];
    };
    const posePiece = (id) => {
        const e = etats.get(id);
        return e.x === null ? null : { id, x: e.x, y: e.y, cells: formeDe(id) };
    };
    const toutesLesPoses = () => item.meta.pieces.map(posePiece).filter(Boolean);

    function render(prochain) {
        item = prochain;
        prise = null; depart = null; aGlisse = false;
        cacherFantome();
        remettre();

        const { largeur, hauteur } = item.meta;
        container.innerHTML = `
            <div class="pn-layout">
                <div class="pn-context">${item.prompt.html}</div>
                <div class="pn-plateau" data-plateau
                     style="--pn-l:${largeur};--pn-h:${hauteur}">
                    <div class="pn-grille" data-grille></div>
                    <div class="pn-pieces" data-posees></div>
                </div>
                <div class="pn-aire">${largeur} × ${hauteur} = ${largeur * hauteur} cases,
                    donc ${item.meta.combien} pièces</div>
                <div class="pn-bac" data-bac></div>
                <div class="pn-outils">
                    <button type="button" class="pn-outil" data-outil="tourner">
                        <span aria-hidden="true">↻</span>Tourner</button>
                    <button type="button" class="pn-outil" data-outil="retourner">
                        <span aria-hidden="true">⇄</span>Retourner</button>
                    <button type="button" class="pn-outil" data-outil="aide">
                        <span aria-hidden="true">💡</span>Aide</button>
                    <button type="button" class="pn-outil" data-outil="vider">
                        <span aria-hidden="true">↺</span>Tout sortir</button>
                </div>
                <div class="pn-statut" role="status" aria-live="polite"></div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        brancherOutils();
        brancherGeste();
        peindre();
    }

    // ───────────────────────────────────────────────────────── dessiner ────

    /** Une pièce, en cases absolues dans sa propre boîte. */
    function pieceHtml(id, ou) {
        const cells = formeDe(id);
        const w = Math.max(...cells.map(c => c[0])) + 1;
        const h = Math.max(...cells.map(c => c[1])) + 1;
        const dedans = (x, y) => cells.some(c => c[0] === x && c[1] === y);
        const cases = cells.map(([x, y]) => {
            // LE BISEAU SUIT LA SILHOUETTE, pas chaque case : posé sur toutes,
            // il découpe un carré en bandes et la pièce ne se lit plus comme
            // UNE pièce. Vu sur la maquette, corrigé avant de l'envoyer.
            const bords = [
                !dedans(x, y - 1) ? 'pn-h' : '', !dedans(x, y + 1) ? 'pn-b' : '',
                !dedans(x - 1, y) ? 'pn-g' : '', !dedans(x + 1, y) ? 'pn-d' : ''
            ].filter(Boolean).join(' ');
            return `<span class="pn-case ${bords}" data-cx="${x}" data-cy="${y}"
                style="left:calc(${x} * var(--pn-u));top:calc(${y} * var(--pn-u))"></span>`;
        }).join('');
        return `<div class="pn-piece${choisie === id ? ' pn-piece--choisie' : ''}"
            data-piece="${id}" data-ou="${ou}" role="button" tabindex="0"
            aria-label="pièce ${id}"
            style="--pn-c:${TEINTES[id]};width:calc(${w} * var(--pn-u));
                   height:calc(${h} * var(--pn-u))">${cases}</div>`;
    }

    function peindre() {
        const { largeur, hauteur } = item.meta;

        const grille = container.querySelector('[data-grille]');
        if (grille) {
            grille.innerHTML = Array.from({ length: largeur * hauteur }, (_, k) =>
                `<span class="pn-vide" data-gx="${k % largeur}" data-gy="${
                    Math.floor(k / largeur)}"></span>`).join('');
        }

        const zone = container.querySelector('[data-posees]');
        if (zone) {
            zone.innerHTML = item.meta.pieces.filter(id => etats.get(id).x !== null)
                .map(id => {
                    const e = etats.get(id);
                    return `<div class="pn-pose" style="left:calc(${e.x} * var(--pn-u));
                        top:calc(${e.y} * var(--pn-u))">${pieceHtml(id, 'plateau')}</div>`;
                }).join('');
        }

        const bac = container.querySelector('[data-bac]');
        if (bac) {
            const dehors = item.meta.pieces.filter(id => etats.get(id).x === null);
            bac.innerHTML = dehors.length
                ? dehors.map(id => pieceHtml(id, 'bac')).join('')
                : '<span class="pn-bacVide">le bac est vide</span>';
        }

        const combien = couvertes(toutesLesPoses()).size;
        const st = container.querySelector('.pn-statut');
        if (st && !fini) {
            st.textContent = `${combien} cases sur ${largeur * hauteur} couvertes.`;
        }
        container.querySelectorAll('[data-outil]').forEach(b => {
            const quoi = b.dataset.outil;
            b.disabled = fini || session.locked
                || ((quoi === 'tourner' || quoi === 'retourner') && !choisie);
        });
    }

    // ────────────────────────────────────────────────────────── le geste ────

    /** La case de grille sous ce point, ou null. */
    function caseSous(x, y) {
        const el = document.elementFromPoint(x, y);
        const c = el && el.closest ? el.closest('[data-gx]') : null;
        return (c && container.contains(c))
            ? { x: Number(c.dataset.gx), y: Number(c.dataset.gy) } : null;
    }

    function brancherGeste() {
        const racine = container.querySelector('.pn-layout');
        if (!racine) return;

        racine.addEventListener('pointerdown', (e) => {
            if (fini || destroyed || session.locked) return;
            const el = e.target.closest ? e.target.closest('[data-piece]') : null;
            if (!el || !racine.contains(el)) return;
            const sous = e.target.closest ? e.target.closest('[data-cx]') : null;
            prise = {
                id: el.dataset.piece, ou: el.dataset.ou,
                ax: sous ? Number(sous.dataset.cx) : 0,
                ay: sous ? Number(sous.dataset.cy) : 0,
                el
            };
            depart = { x: e.clientX, y: e.clientY };
            aGlisse = false;
        });

        racine.addEventListener('pointermove', (e) => {
            if (!prise || !depart || destroyed) return;
            if (!aGlisse && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) < SEUIL) return;
            if (!aGlisse) {
                aGlisse = true;
                try { racine.setPointerCapture(e.pointerId); } catch (err) { /* souris */ }
                montrerFantome(prise.el);
                // La pièce quitte le plateau dès qu'on la soulève : sans cela
                // elle se gênerait elle-même au moment de se reposer.
                if (prise.ou === 'plateau') {
                    const et = etats.get(prise.id);
                    et.x = null; et.y = null;
                    peindre();
                }
            }
            poserFantome(e.clientX, e.clientY);
            viser(e.clientX, e.clientY);
        });

        const lacher = (e) => {
            if (!prise) return;
            const p = prise, glisse = aGlisse;
            prise = null; depart = null; aGlisse = false;
            cacherFantome();
            container.querySelectorAll('.pn-visee').forEach(x => x.classList.remove('pn-visee'));
            if (!glisse) { toucher(p); return; }
            try { racine.releasePointerCapture(e.pointerId); } catch (err) { /* souris */ }
            deposer(p, e.clientX, e.clientY);
        };
        racine.addEventListener('pointerup', lacher);
        racine.addEventListener('pointercancel', () => {
            prise = null; depart = null; aGlisse = false; cacherFantome(); peindre();
        });
    }

    /** Un simple toucher : on choisit la pièce ; posée, elle revient au bac. */
    function toucher(p) {
        choisie = p.id;
        if (p.ou === 'plateau') {
            const e = etats.get(p.id);
            e.x = null; e.y = null;
        }
        peindre();
    }

    function deposer(p, cx, cy) {
        const cible = caseSous(cx, cy);
        const e = etats.get(p.id);
        choisie = p.id;
        if (cible) {
            const x = cible.x - p.ax, y = cible.y - p.ay;
            const autres = couvertes(item.meta.pieces
                .filter(id => id !== p.id).map(posePiece).filter(Boolean));
            if (poseTient(formeDe(p.id), x, y, item.meta.largeur, item.meta.hauteur, autres)) {
                e.x = x; e.y = y;
            }
        }
        peindre();
        verifier();
    }

    /** Pendant qu'on tient une pièce, on montre où elle tomberait. */
    function viser(cx, cy) {
        container.querySelectorAll('.pn-visee').forEach(x => x.classList.remove('pn-visee'));
        const cible = caseSous(cx, cy);
        if (!cible || !prise) return;
        const x = cible.x - prise.ax, y = cible.y - prise.ay;
        const autres = couvertes(item.meta.pieces
            .filter(id => id !== prise.id).map(posePiece).filter(Boolean));
        const tient = poseTient(formeDe(prise.id), x, y,
            item.meta.largeur, item.meta.hauteur, autres);
        for (const [a, b] of posees(formeDe(prise.id), x, y)) {
            const el = container.querySelector(`[data-gx="${a}"][data-gy="${b}"]`);
            if (el) el.classList.add(tient ? 'pn-visee' : 'pn-visee');
        }
        if (!tient) {
            container.querySelectorAll('.pn-visee').forEach(x => x.classList.add('pn-visee--non'));
        }
    }

    function montrerFantome(el) {
        cacherFantome();
        fantome = el.cloneNode(true);
        fantome.classList.add('pn-fantome');
        fantome.classList.remove('pn-piece--choisie');
        fantome.removeAttribute('data-piece');
        const r = el.getBoundingClientRect();
        fantome.style.width = `${r.width}px`;
        fantome.style.height = `${r.height}px`;
        document.body.appendChild(fantome);
    }
    function poserFantome(x, y) {
        if (fantome) { fantome.style.left = `${x}px`; fantome.style.top = `${y}px`; }
    }
    function cacherFantome() {
        if (fantome) { fantome.remove(); fantome = null; }
        document.querySelectorAll('.pn-fantome').forEach(f => f.remove());
    }

    // ───────────────────────────────────────────────────────── les outils ────

    function brancherOutils() {
        container.querySelectorAll('[data-outil]').forEach(b => {
            b.onclick = () => {
                if (fini || session.locked) return;
                const quoi = b.dataset.outil;
                if (quoi === 'vider') {
                    for (const id of item.meta.pieces) {
                        const e = etats.get(id); e.x = null; e.y = null;
                    }
                    choisie = null; peindre(); return;
                }
                if (quoi === 'aide') { aider(); return; }
                if (!choisie) return;
                tournerLaChoisie(quoi === 'retourner');
            };
        });
    }

    /**
     * TOURNER OU RETOURNER LA PIÈCE CHOISIE.
     *
     * Une pièce POSÉE tourne sur place si elle le peut, et sinon ne tourne pas
     * — on ne la renvoie pas au bac en douce. Le X ne tourne jamais, le I n'a
     * que deux orientations : « Tourner » sans effet n'est pas une panne, c'est
     * la SYMÉTRIE de la pièce, et c'est une chose à voir.
     */
    function tournerLaChoisie(miroir) {
        const e = etats.get(choisie);
        const avant = e.vue;
        // Les orientations sont rangées en deux moitiés : les quatre rotations,
        // puis les quatre du miroir. « Retourner » saute d'une moitié à l'autre.
        const n = e.vues.length;
        e.vue = miroir ? (e.vue + Math.max(1, Math.floor(n / 2))) % n : (e.vue + 1) % n;
        if (e.x !== null) {
            const autres = couvertes(item.meta.pieces
                .filter(id => id !== choisie).map(posePiece).filter(Boolean));
            if (!poseTient(formeDe(choisie), e.x, e.y,
                item.meta.largeur, item.meta.hauteur, autres)) {
                e.vue = avant;
                dire('Elle ne tient pas tournée à cette place.');
                peindre();
                return;
            }
        }
        peindre();
        verifier();
    }

    function dire(texte) {
        const st = container.querySelector('.pn-statut');
        if (st) st.textContent = texte;
    }

    /**
     * L'AIDE POSE UNE PIÈCE, PAS TOUTE LA GRILLE.
     *
     * Elle résout le rectangle avec ce qui reste dehors, puis pose la première
     * pièce de ce pavage. L'élève garde le reste du raisonnement ; on ne lui
     * rend que le cran qu'il avait perdu.
     */
    function aider() {
        const dehors = item.meta.pieces.filter(id => etats.get(id).x === null);
        if (!dehors.length) { dire('Tout est posé : regarde ce qui se chevauche.'); return; }
        const sol = resoudre(item.meta.largeur, item.meta.hauteur,
            item.meta.pieces, item.meta.combien);
        if (!sol) { dire('Reprends depuis le début : ce début-là ne mène nulle part.'); return; }
        // On repart d'un pavage complet et on remet TOUT : une aide qui pose
        // une pièce par-dessus un début contradictoire n'aide pas, elle ajoute
        // une contradiction.
        for (const id of item.meta.pieces) {
            const e = etats.get(id); e.x = null; e.y = null;
        }
        const premiere = sol[0];
        const e = etats.get(premiere.id);
        e.vue = e.vues.findIndex(v =>
            v.map(c => c.join(',')).join(' ') === premiere.cells.map(c => c.join(',')).join(' '));
        if (e.vue < 0) e.vue = 0;
        e.x = premiere.x; e.y = premiere.y;
        choisie = premiere.id;
        peindre();
        dire(`La pièce ${premiere.id} tient là : reprends à partir d'elle.`);
    }

    // ──────────────────────────────────────────────────────── corriger ────

    function verifier() {
        if (fini) return;
        if (!estFini(toutesLesPoses(), item.meta.largeur, item.meta.hauteur)) return;
        fini = true;
        choisie = null;
        peindre();
        const plateau = container.querySelector('[data-plateau]');
        if (plateau) plateau.classList.add('pn-plateau--ok');
        dire('Le rectangle est plein — pas un trou, pas un chevauchement.');
        const result = session.submit('plein');
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot pose la solution, pièce après pièce. */
    async function runDemo() {
        peindre();
        for (const s of item.meta.solution) {
            if (destroyed) return;
            const e = etats.get(s.id);
            const voulu = s.cells.map(c => c.join(',')).join(' ');
            const i = e.vues.findIndex(v => v.map(c => c.join(',')).join(' ') === voulu);
            e.vue = i < 0 ? 0 : i;
            e.x = s.x; e.y = s.y;
            peindre();
            await new Promise(r => regTimeout(r, 620));
        }
        if (!destroyed) regTimeout(renderNext, 1100);
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            cacherFantome();
            container.innerHTML = '';
            session.finish();
        }
    };
}
