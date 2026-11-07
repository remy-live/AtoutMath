// Activité « Les Transvasements » — on prend un bidon et on le penche.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 29 octobre : « j'aime bien les transvasements […] il faudra faire du
// drag drop plutôt ».
//
// LA MAQUETTE PROPOSAIT UN MODE « VERSER » PUIS DEUX TOUCHERS — c'est-à-dire un
// formulaire à trois temps pour un geste qui en a UN. Prendre un bidon et le
// pencher sur l'autre, c'est ce qu'on fait avec ses mains, et c'est ce qu'il a
// demandé. Même leçon que La Traversée le 27 : « il faudrait pouvoir
// dragdropper ».
//
// ── UN SEUL GESTE, TROIS DESTINATIONS ──────────────────────────────────────
//
// On prend un bidon et on le penche :
//
//   · sur un AUTRE BIDON  → on verse jusqu'à ce que l'un soit vide ou l'autre
//     plein. Il n'y a pas de demi-mesure : c'est ce qui fait de ce jeu de
//     l'arithmétique et non de l'adresse.
//   · sur le ROBINET      → on le remplit.
//   · sur l'ÉVIER         → on le vide.
//
// Le niveau 3 n'a ni robinet ni évier : rien n'entre, rien ne sort, et c'est un
// autre problème — on partage au lieu de mesurer.
//
// ── LE GLISSER, CINQUIÈME ÉCRITURE, ET LES TROIS LEÇONS TIENNENT ───────────
//
// Écouteurs sur la racine qui survit aux repeints ; capture du pointeur au
// PREMIER MOUVEMENT seulement ; et aucun `onclick` sur les bidons — le simple
// toucher est traité dans `pointerup`, donc il n'y a pas de clic fantôme à
// avaler. Les trois pièges ont été payés sur la Grille de Nombres, les
// allumettes et La Traversée.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { appliquer, atteint, resoudre } from '../transvasements.js';

/** En deçà de ce déplacement, le geste reste un simple toucher. */
const SEUIL = 8;

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    let etat = [], coups = 0, fini = false;
    let prise = null, depart = null, aGlisse = false, fantome = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function remettre() {
        etat = item.meta.depart.slice();
        coups = 0;
        fini = false;
    }

    function render(prochain) {
        item = prochain;
        prise = null; depart = null; aGlisse = false;
        cacherFantome();
        remettre();

        const avecRobinet = item.meta.famille === 'robinet';
        container.innerHTML = `
            <div class="ts-layout">
                <div class="ts-context">${item.prompt.html}</div>
                <div class="ts-scene" data-scene>
                    ${avecRobinet ? `
                    <div class="ts-robinet" data-zone="robinet" title="le robinet">
                        ${ROBINET}<span class="ts-etiq">le robinet</span>
                    </div>` : ''}
                    <div class="ts-bidons" data-bidons></div>
                    ${avecRobinet ? `
                    <div class="ts-evier" data-zone="evier" title="l'évier">
                        ${EVIER}<span class="ts-etiq">l'évier</span>
                    </div>` : ''}
                </div>
                <div class="ts-statut" role="status" aria-live="polite"></div>
                <div class="ts-actions">
                    <button type="button" class="ts-btn" data-recommencer>↺ Recommencer</button>
                    <button type="button" class="ts-btn" data-aide>💡 Un geste</button>
                </div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        container.querySelector('[data-recommencer]').onclick = () => {
            if (fini) return;
            remettre(); peindre();
        };
        container.querySelector('[data-aide]').onclick = () => aider();
        brancherGeste();
        peindre();
    }

    // ───────────────────────────────────────────────────────── dessiner ────

    /**
     * UN BIDON, EN VERRE GRADUÉ.
     *
     * LA HAUTEUR DU BIDON SUIT SA CAPACITÉ, et ce n'est pas de la décoration :
     * un bidon de 3 L aussi haut qu'un de 8 L, et l'élève compare des niveaux
     * qui ne veulent rien dire. Ici, un litre fait la même hauteur partout —
     * c'est ce qui rend la comparaison visuelle honnête.
     */
    function bidonHtml(i) {
        const cap = item.meta.caps[i];
        const plein = etat[i];
        const grads = Array.from({ length: cap - 1 }, (_, k) =>
            `<span class="ts-grad" style="bottom:calc(${k + 1} * var(--ts-litre))"></span>`)
            .join('');
        return `<div class="ts-bidon${prise && prise.i === i ? ' ts-bidon--pris' : ''}"
            data-bidon="${i}" data-zone="bidon" role="button" tabindex="0"
            aria-label="${item.meta.noms[i]}, ${plein} litre${plein > 1 ? 's' : ''}
                sur ${cap}"
            style="height:calc(${cap} * var(--ts-litre) + var(--ts-rebord))">
            <span class="ts-eau" style="height:calc(${plein} * var(--ts-litre))"></span>
            ${grads}
            <span class="ts-reflet"></span>
            <span class="ts-litres">${plein} L</span>
            <span class="ts-nom">${cap} L</span>
        </div>`;
    }

    function peindre() {
        const zone = container.querySelector('[data-bidons]');
        if (zone) {
            zone.innerHTML = item.meta.caps.map((_, i) => bidonHtml(i)).join('');
        }
        const st = container.querySelector('.ts-statut');
        if (st && !fini) {
            st.textContent = coups
                ? `${coups} geste${coups > 1 ? 's' : ''}. Il te faut ${item.meta.cible} L `
                    + 'dans un bidon.'
                : 'Prends un bidon et penche-le sur un autre, sur le robinet ou sur l\'évier.';
        }
        container.querySelectorAll('.ts-btn').forEach(b => {
            b.disabled = fini || session.locked;
        });
    }

    function dire(texte) {
        const st = container.querySelector('.ts-statut');
        if (st) st.textContent = texte;
    }

    // ────────────────────────────────────────────────────────── le geste ────

    /** Ce qu'il y a sous le doigt : un bidon, le robinet, l'évier, ou rien. */
    function cibleSous(x, y) {
        const el = document.elementFromPoint(x, y);
        const z = el && el.closest ? el.closest('[data-zone]') : null;
        if (!z || !container.contains(z)) return null;
        return {
            zone: z.dataset.zone,
            i: z.dataset.bidon === undefined ? -1 : Number(z.dataset.bidon),
            el: z
        };
    }

    function brancherGeste() {
        const racine = container.querySelector('.ts-layout');
        if (!racine) return;

        racine.addEventListener('pointerdown', (e) => {
            if (fini || destroyed || session.locked) return;
            const el = e.target.closest ? e.target.closest('[data-bidon]') : null;
            if (!el || !racine.contains(el)) return;
            prise = { i: Number(el.dataset.bidon), el };
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
                peindre();
            }
            poserFantome(e.clientX, e.clientY);
            viser(e.clientX, e.clientY);
        });

        const lacher = (e) => {
            if (!prise) return;
            const p = prise, glisse = aGlisse;
            prise = null; depart = null; aGlisse = false;
            cacherFantome();
            container.querySelectorAll('.ts-visee').forEach(x => x.classList.remove('ts-visee'));
            if (!glisse) { peindre(); return; }
            try { racine.releasePointerCapture(e.pointerId); } catch (err) { /* souris */ }
            verser(p.i, cibleSous(e.clientX, e.clientY));
        };
        racine.addEventListener('pointerup', lacher);
        racine.addEventListener('pointercancel', () => {
            prise = null; depart = null; aGlisse = false; cacherFantome(); peindre();
        });
    }

    function viser(x, y) {
        container.querySelectorAll('.ts-visee').forEach(e => e.classList.remove('ts-visee'));
        const c = cibleSous(x, y);
        if (!c || !prise) return;
        if (c.zone === 'bidon' && c.i === prise.i) return;
        c.el.classList.add('ts-visee');
    }

    /** Le geste est joué — ou refusé EN LE DISANT, jamais en ne faisant rien. */
    function verser(i, cible) {
        if (!cible) { peindre(); return; }
        const { caps, famille, noms } = item.meta;
        let quoi = 'verser', vers = cible.i;
        if (cible.zone === 'robinet') { quoi = 'remplir'; vers = -1; }
        else if (cible.zone === 'evier') { quoi = 'vider'; vers = -1; }
        else if (cible.i === i) { peindre(); return; }

        const apres = appliquer(etat, caps, famille, quoi, i, vers);
        if (!apres) {
            // UN GESTE SANS EFFET SE DIT. Un bidon qu'on penche et qui ne fait
            // rien se lit comme une panne ; c'est pourtant la règle du jeu —
            // on ne verse pas un bidon vide, on ne remplit pas un bidon plein.
            dire(quoi === 'remplir' ? `${noms[i]} est déjà plein.`
                : quoi === 'vider' ? `${noms[i]} est déjà vide.`
                    : etat[i] === 0 ? `${noms[i]} est vide : il n'y a rien à verser.`
                        : `${noms[vers]} est déjà plein.`);
            peindre();
            return;
        }
        etat = apres;
        coups++;
        peindre();
        if (atteint(etat, item.meta.cible)) reussi();
    }

    function montrerFantome(el) {
        cacherFantome();
        fantome = el.cloneNode(true);
        fantome.classList.add('ts-fantome');
        fantome.removeAttribute('data-bidon');
        fantome.removeAttribute('data-zone');
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
        document.querySelectorAll('.ts-fantome').forEach(f => f.remove());
    }

    /** L'aide joue UN geste de la plus courte solution, pas toute la suite. */
    function aider() {
        if (fini || session.locked) return;
        const route = resoudreIci();
        if (!route || !route.length) {
            dire('Tu y es presque — regarde ce que contient chaque bidon.');
            return;
        }
        const g = route[0];
        const { noms } = item.meta;
        dire(g.quoi === 'remplir' ? `Remplis ${noms[g.de]}.`
            : g.quoi === 'vider' ? `Vide ${noms[g.de]}.`
                : `Verse ${noms[g.de]} dans ${noms[g.vers]}.`);
    }

    /**
     * LA PLUS COURTE SUITE DEPUIS L'ÉTAT COURANT, et non depuis le début.
     *
     * Une aide qui repartirait du départ dirait à l'élève de tout recommencer —
     * ce qui est vrai et inutile. Le noyau, lui, part toujours de l'état
     * initial : c'est ce qu'il doit faire pour garantir qu'une énigme servie a
     * une solution. On refait donc ici le même parcours en largeur, mais depuis
     * où l'élève en est.
     */
    function resoudreIci() {
        const { caps, famille, cible } = item.meta;
        if (atteint(etat, cible)) return [];
        const vus = new Set([etat.join(',')]);
        let file = [{ e: etat, chemin: [] }];
        for (let p = 0; p < 40 && file.length; p++) {
            const suivante = [];
            for (const { e, chemin } of file) {
                for (const quoi of ['remplir', 'vider', 'verser']) {
                    for (let i = 0; i < caps.length; i++) {
                        const cibles = quoi === 'verser'
                            ? caps.map((_, j) => j).filter(j => j !== i) : [-1];
                        for (const j of cibles) {
                            const suite = appliquer(e, caps, famille, quoi, i, j);
                            if (!suite) continue;
                            const k = suite.join(',');
                            if (vus.has(k)) continue;
                            vus.add(k);
                            const route = chemin.concat([{ quoi, de: i, vers: j }]);
                            if (atteint(suite, cible)) return route;
                            suivante.push({ e: suite, chemin: route });
                        }
                    }
                }
            }
            file = suivante;
        }
        return null;
    }

    function reussi() {
        fini = true;
        peindre();
        const scene = container.querySelector('[data-scene]');
        if (scene) scene.classList.add('ts-scene--ok');
        const mini = item.meta.minimum;
        dire(`${item.meta.cible} L, exactement — en ${coups} geste${coups > 1 ? 's' : ''}.`
            + (coups > mini ? ` La plus courte en demande ${mini}.` : ' C\'est le minimum.'));
        const result = session.submit(String(item.meta.cible));
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot joue la solution la plus courte, en la commentant. */
    async function runDemo() {
        peindre();
        const route = resoudre(item.meta.caps, item.meta.cible, item.meta.famille) || [];
        const { noms } = item.meta;
        for (const g of route) {
            if (destroyed) return;
            etat = g.etat.slice();
            coups++;
            peindre();
            dire(g.quoi === 'remplir' ? `On remplit ${noms[g.de]}.`
                : g.quoi === 'vider' ? `On vide ${noms[g.de]}.`
                    : `On verse ${noms[g.de]} dans ${noms[g.vers]}.`);
            await new Promise(r => regTimeout(r, 900));
        }
        if (!destroyed) regTimeout(renderNext, 1200);
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

/* ── LE DÉCOR : un robinet et un évier, dessinés ─────────────────────────────

   Ils ne sont pas décoratifs : ce sont des CIBLES de glisser, au même titre
   qu'un bidon. Un bouton « Remplir » dirait la même chose en trois temps. */
const ROBINET = `<svg viewBox="0 0 60 60" aria-hidden="true" class="ts-icone">
    <rect x="4" y="8" width="10" height="34" rx="3" fill="#9aa7b4"/>
    <rect x="6" y="10" width="3" height="30" rx="1.5" fill="#cfd8e3"/>
    <path d="M9 14 H38 a6 6 0 0 1 6 6 V30" stroke="#9aa7b4" stroke-width="9"
        fill="none" stroke-linecap="round"/>
    <path d="M9 14 H38 a6 6 0 0 1 6 6 V30" stroke="#cfd8e3" stroke-width="3"
        fill="none" stroke-linecap="round" opacity=".7"/>
    <circle cx="14" cy="10" r="6" fill="#64748b"/>
    <rect x="40" y="32" width="8" height="18" rx="4" fill="#60c6f0" opacity=".85"/>
</svg>`;

const EVIER = `<svg viewBox="0 0 60 60" aria-hidden="true" class="ts-icone">
    <ellipse cx="30" cy="20" rx="24" ry="9" fill="#cfd8e3"/>
    <path d="M6 20 q24 16 48 0 v6 q-24 18 -48 0 z" fill="#9aa7b4"/>
    <ellipse cx="30" cy="20" rx="15" ry="5.5" fill="#64748b"/>
    <path d="M26 30 q4 10 8 0" stroke="#60c6f0" stroke-width="3" fill="none"
        stroke-linecap="round"/>
    <path d="M24 40 q6 12 12 0" stroke="#60c6f0" stroke-width="2.4" fill="none"
        stroke-linecap="round" opacity=".7"/>
</svg>`;
