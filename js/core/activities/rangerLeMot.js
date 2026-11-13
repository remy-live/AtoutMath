// Activité « Ranger, et le mot apparaît » — on touche, et la lettre se pose.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, page « Ordre · Axe », exercice 17 : « on place les points, on range les
// abscisses dans l'ordre, et les lettres donnent un mot. C'est un exercice qui
// se corrige tout seul : si le mot ne sort pas, l'élève le sait avant le
// professeur. »
//
// Consulté sur les trois gestes possibles — toucher les points dans l'ordre,
// taper le mot au pavé de lettres, ou écrire les abscisses rangées —, il a
// répondu : « Toucher les points dans l'ordre ». C'est le seul des trois où le
// mot se construit SOUS SES YEUX, donc le seul qui tient sa phrase.
//
// ── CE QUE LE GESTE DOIT PERMETTRE, ET CE QU'IL NE DOIT PAS ─────────────────
//
// On touche un jeton : sa lettre va dans la première case libre. On touche un
// jeton DÉJÀ POSÉ : sa lettre revient, et celles d'après SE RESSERRENT. C'est
// le même choix que « Le Dessin Gradué » — Rémy : « quand on clique sur un
// point qui est sur un axe ca le remet » —, et le resserrement est délibéré :
// reprendre une lettre au milieu pour laisser un trou obligerait à se souvenir
// de la place vide, ce qui n'a rien à voir avec l'exercice.
//
// ── LES JETONS SONT AU-DESSUS, LES NOMBRES AU-DESSOUS ───────────────────────
//
// Et ce n'est pas un choix d'esthétique. Un jeton au cran 0 ou au cran 10 se
// pose sur le bout de la droite ; si les nombres des bouts étaient du même
// côté, il les couvrirait — c'est le défaut que la photo de la feuille de
// « Graduer un Axe » avait montré, avec une case qui recouvrait l'étiquette du
// bord droit. En séparant les deux côtés, le cas n'existe plus, et l'on garde
// le droit de poser un point sur un bout.
//
// ── POURQUOI LE DESSIN N'A PAS DE PLAFOND DE HAUTEUR ────────────────────────
//
// Cette activité a sa propre mise en page (`rlm-layout`), comme « Le Dessin
// Gradué » : elle ne vit pas dans `numpad-context`, donc aucun des plafonds
// écrits pour protéger le pavé numérique ne s'y applique. Mesuré sur la cascade
// de loupes, ces plafonds réduisaient un dessin haut à 19 px par ligne. Ici le
// dessin prend la largeur qu'on lui donne et la hauteur qui suit.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';

/** Échappe ce qui part dans du HTML — les lettres viennent d'un lexique, pas d'une saisie. */
const sansBalise = (s) => String(s).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Un nombre à la française. */
const fr = (x) => {
    const s = Math.abs(x) < 1e-9 ? '0' : String(Number(Number(x).toPrecision(12)));
    return s.replace('.', ',');
};

// LA GÉOMÉTRIE DU DESSIN, en unités de `viewBox`. Large et basse : 400 de large
// pour 44 + 64 par droite, soit un rapport proche de 1,8 à trois droites. Un
// dessin presque carré se laisse écraser par n'importe quel plafond de hauteur
// et ses jetons deviennent invisibles ; celui-ci occupe toute la largeur qu'on
// lui donne.
const W = 400, G = 30, D = 370, HAUT = 44, PAS = 64, BAS = 30;

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** Les lettres touchées, dans l'ordre — c'est la réponse en construction. */
    let touches = [];
    let fini = false;
    let resultatJuste = null;

    const points = () => (item && item.meta && item.meta.points) || [];
    const axes = () => (item && item.meta && item.meta.axes) || [];

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(prochain) {
        item = prochain;
        touches = [];
        fini = false;
        resultatJuste = null;

        container.innerHTML = `
            <div class="rlm-layout">
                <div class="rlm-context">${item.prompt.html}</div>
                <div class="rlm-plan"></div>
                <div class="rlm-mot" role="status" aria-live="polite"></div>
                <div class="rlm-statut" role="status" aria-live="polite"></div>
                <div class="rlm-actions">
                    <button type="button" class="rlm-btn" data-recommencer>
                        ↺ Recommencer</button>
                    <button type="button" class="rlm-btn rlm-btn--fort" data-valider>
                        Valider</button>
                </div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        peindre();
        // LA PREMIÈRE PHRASE SE DIT AVANT LE PREMIER CONTACT. Sans cet appel, la
        // ligne d'état restait VIDE tant qu'on n'avait touché personne : l'élève
        // qui ne sait pas par où commencer n'avait rien pour commencer.
        direOuEnEstLeMot();
        container.querySelector('[data-recommencer]').onclick = () => {
            if (fini) return;
            touches = [];
            peindre();
            direOuEnEstLeMot();
        };
        container.querySelector('[data-valider]').onclick = valider;
    }

    /** L'abscisse d'un cran, en pixels de `viewBox`. */
    const xDe = (cran) => G + (cran / (item.meta.intervalles || 10)) * (D - G);
    const yDe = (i) => HAUT + i * PAS;

    function dessiner() {
        const n = axes().length;
        const H = HAUT + (n - 1) * PAS + BAS;
        const morceaux = [];

        axes().forEach((a, i) => {
            const y = yDe(i);
            morceaux.push(`<line class="rlm-axe" x1="${G}" y1="${y}" x2="${D + 8}" y2="${y}"
                marker-end="url(#rlm-fleche)"/>`);
            for (let c = 0; c <= (item.meta.intervalles || 10); c++) {
                const h = (c === 0 || c === (item.meta.intervalles || 10)) ? 7 : 4;
                morceaux.push(`<line class="rlm-cran" x1="${xDe(c).toFixed(1)}" y1="${y - h}"
                    x2="${xDe(c).toFixed(1)}" y2="${y + h}"/>`);
            }
            // LES DEUX BOUTS CHIFFRÉS, SOUS LA DROITE — ce sont eux qui disent
            // ce que vaut un intervalle, et c'est la première chose à lire.
            morceaux.push(`<text class="rlm-borne" x="${G}" y="${y + 18}"
                text-anchor="middle">${sansBalise(fr(a.min))}</text>`);
            morceaux.push(`<text class="rlm-borne" x="${D}" y="${y + 18}"
                text-anchor="middle">${sansBalise(fr(a.max))}</text>`);
        });

        // LES JETONS AU-DESSUS. Un jeton touché garde sa place et son dessin :
        // il se grise et porte le rang où sa lettre est partie, ce qui permet
        // de relire son propre rangement sans le défaire.
        points().forEach((p, k) => {
            const y = yDe(p.axe);
            const x = xDe(p.cran);
            const rang = touches.indexOf(k);
            const etat = rang >= 0 ? ' rlm-jeton--pose' : '';
            const faux = fini && !resultatJuste ? ' rlm-jeton--fini' : '';
            morceaux.push(`<g class="rlm-jeton${etat}${faux}" data-point="${k}"
                role="button" tabindex="0"
                aria-label="Point ${sansBalise(p.lettre)}${rang >= 0
    ? `, posé en ${rang + 1}` : ''}">
                <circle cx="${x.toFixed(1)}" cy="${(y - 17).toFixed(1)}" r="11"/>
                <text x="${x.toFixed(1)}" y="${(y - 13).toFixed(1)}"
                    text-anchor="middle">${sansBalise(p.lettre)}</text>
                ${rang >= 0 ? `<text class="rlm-rang" x="${(x + 12).toFixed(1)}"
                    y="${(y - 23).toFixed(1)}">${rang + 1}</text>` : ''}
            </g>`);
        });

        return `<svg class="rlm-svg" viewBox="0 0 ${W} ${H}"
            preserveAspectRatio="xMidYMid meet" role="img"
            aria-label="${axes().length} droites graduées portant des points lettrés">
            <defs>
                <marker id="rlm-fleche" viewBox="0 0 10 10" refX="8" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
                </marker>
            </defs>
            ${morceaux.join('\n            ')}
        </svg>`;
    }

    function peindre() {
        const plan = container.querySelector('.rlm-plan');
        if (!plan) return;
        plan.innerHTML = dessiner();
        plan.classList.toggle('rlm-plan--ok', fini && !!resultatJuste);

        // LES CASES DU MOT. Elles sont AUTANT QUE LES LETTRES dès le départ :
        // un élève qui en voit cinq sait qu'il cherche cinq points, et c'est
        // une information que le dessin lui donne déjà en comptant les jetons.
        const mot = container.querySelector('.rlm-mot');
        if (mot) {
            mot.innerHTML = points().map((_, i) => {
                const k = touches[i];
                const lettre = k === undefined ? '' : points()[k].lettre;
                return `<span class="rlm-case${lettre ? ' rlm-case--pleine' : ''}"
                    >${sansBalise(lettre)}</span>`;
            }).join('');
        }

        const valider = container.querySelector('[data-valider]');
        if (valider) {
            valider.disabled = fini || session.locked || touches.length < points().length;
        }
        const recommencer = container.querySelector('[data-recommencer]');
        if (recommencer) recommencer.disabled = fini || !touches.length;

        if (!fini) brancherGestes();
    }

    function brancherGestes() {
        container.querySelectorAll('[data-point]').forEach((g) => {
            const k = Number(g.getAttribute('data-point'));
            // `onclick` SUR UN GROUPE SVG MARCHE, et c'est mesuré : un élément
            // SVG n'a pas de MÉTHODE `click()` — elle vit sur `HTMLElement` —,
            // mais l'événement du navigateur, lui, part bien du doigt ou de la
            // souris. C'est une sonde qui s'y était trompée, pas le logiciel.
            g.onclick = () => toucher(k);
            g.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toucher(k); }
            };
        });
    }

    function toucher(k) {
        if (fini || destroyed || session.locked) return;
        const rang = touches.indexOf(k);
        if (rang >= 0) {
            // ON REPREND, ET LES SUIVANTES SE RESSERRENT — voir l'en-tête.
            touches.splice(rang, 1);
        } else if (touches.length < points().length) {
            touches.push(k);
        }
        peindre();
        direOuEnEstLeMot();
    }

    /**
     * CE QU'ON DIT PENDANT, ET CE QU'ON TAIT.
     *
     * On ne dit JAMAIS si le rangement en cours est juste : ce serait corriger
     * avant l'heure, et l'exercice tient précisément sur le fait que l'élève
     * voit lui-même le mot sortir ou ne pas sortir. On relit donc seulement ce
     * qu'il a touché, en nombres — c'est ce qu'il a vraiment à vérifier.
     */
    function direOuEnEstLeMot() {
        const statut = container.querySelector('.rlm-statut');
        if (!statut || fini) return;
        if (!touches.length) {
            statut.textContent = 'Touche d’abord le point dont l’abscisse est la '
                + 'plus petite.';
            return;
        }
        const lus = touches.map(k => fr(points()[k].abscisse));
        statut.textContent = touches.length < points().length
            ? `Tu as rangé : ${lus.join(' < ')}`
            : `Tu as rangé : ${lus.join(' < ')} — tu peux valider.`;
    }

    function valider() {
        if (fini || session.locked || touches.length < points().length) return;
        const envoye = touches.map(k => points()[k].lettre).join('');
        fini = true;
        const result = session.submit(envoye);
        resultatJuste = !!result.correct;
        peindre();
        const statut = container.querySelector('.rlm-statut');
        if (statut) {
            statut.textContent = result.correct
                ? `${item.meta.mot} — ${item.meta.definition}`
                // ON DIT LE MOT TROUVÉ ET LE BON, ET L'ORDRE DES ABSCISSES :
                // « c'est faux » seul laisserait l'élève relire dix points sans
                // savoir lequel reprendre, et le rangement est justement ce
                // qu'il y a à relire.
                : `Tu as écrit ${envoye}. Le mot était ${item.meta.mot}, `
                    + `et l’ordre : ${(item.meta.ordre || []).join(' < ')}.`;
        }
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot touche les points dans l'ordre, et le mot se construit. */
    async function runDemo() {
        peindre();
        const ordre = points()
            .map((p, k) => ({ k, x: p.abscisse }))
            .sort((a, b) => a.x - b.x)
            .map(o => o.k);
        for (const k of ordre) {
            if (destroyed) return;
            touches.push(k);
            peindre();
            await new Promise(r => regTimeout(r, 420));
        }
        if (!destroyed) regTimeout(renderNext, 1200);
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            container.innerHTML = '';
            session.finish();
        }
    };
}
