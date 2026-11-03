// Activité « L'énigme des cavaliers » — on touche un cavalier, puis sa case.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 31 octobre : « j'aimeri bien aussi cette enigme ».
//
// ── POURQUOI ON TOUCHE, ET POURQUOI ON NE GLISSE PAS ───────────────────────
//
// Ce dépôt a écrit le glisser cinq fois et en connaît tous les pièges. Ici il
// serait pourtant le MAUVAIS geste, et pas pour une raison de confort :
//
// Toucher un cavalier ALLUME SES DEUX CASES POSSIBLES. C'est précisément ce
// qu'il faut voir pour trouver la solution — « chaque case n'a que deux
// voisines, donc les huit cases font un anneau, donc les cavaliers ne peuvent
// pas se dépasser ». Un glisser laisse l'élève chercher au jugé et cache la
// seule chose que l'énigme veut lui montrer.
//
// Le geste reste traité dans `pointerup`, sur la racine qui survit aux
// repeints : les trois leçons du glisser valent aussi pour le toucher, et
// c'est ce qui évite le clic fantôme du doigt.
//
// ── CE QU'ON NE COMPTE PAS ─────────────────────────────────────────────────
//
// On compte les coups, et on les MONTRE, mais on ne refuse jamais un coup de
// plus : il y a plusieurs chemins, et punir celui qui a cherché en ferait une
// épreuve de mémoire au lieu d'une énigme.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { coups, estArrive, graphe, jouer } from '../cavaliers.js';

/** Le dessin d'un cavalier, dans sa case. */
const CAVALIER = `<svg viewBox="0 0 24 24" class="cv-piece" aria-hidden="true">
    <path d="M7 21h11v-2H7v2zM8.5 17h8.5c0-4.5-1-7-3-9l1-2.5L13 4l-.8 1.6C11 4.6 9.6 4 8.2 4
        L6 7.5 4.6 9.3c-.4.5-.2 1.2.4 1.4l2.1.7 1.3-1.7.9.7-1.6 2.2c-.5.7-.8 1.6-.8 2.5V17z"
        fill="currentColor"/>
    <circle cx="9.4" cy="7.4" r=".9" fill="#fff"/>
</svg>`;

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** L'état du damier : une couleur par case, ou null. */
    let cases = [];
    let voisins = [];
    let choisi = null;     // la case du cavalier qu'on tient
    let coupsJoues = 0;
    let fini = false;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function remettre() {
        cases = item.meta.depart.slice();
        voisins = graphe({
            colonnes: item.meta.colonnes, lignes: item.meta.lignes,
            mortes: item.meta.mortes
        });
        choisi = null;
        coupsJoues = 0;
        fini = false;
    }

    function render(prochain) {
        item = prochain;
        remettre();
        const { colonnes, lignes } = item.meta;
        container.innerHTML = `
            <div class="cv-layout" style="--cv-c:${colonnes};--cv-l:${lignes}">
                <div class="cv-context">${item.prompt.html}</div>
                <div class="cv-plateaux">
                    <div class="cv-bloc">
                        <div class="cv-damier" data-damier></div>
                        <div class="cv-legende">à toi de jouer</div>
                    </div>
                    <!-- LE BUT EST DESSINÉ À CÔTÉ, EN PETIT, et pas décrit en
                         mots : « échange les rouges et les bleus » demande de
                         se représenter la figure d'arrivée, et c'est un effort
                         qui n'a rien à voir avec l'énigme. -->
                    <div class="cv-bloc cv-bloc--but">
                        <div class="cv-damier cv-damier--but" data-but></div>
                        <div class="cv-legende">à obtenir</div>
                    </div>
                </div>
                <div class="cv-outils">
                    <button type="button" class="cv-outil" data-outil="recommencer">
                        <span aria-hidden="true">↺</span>Recommencer</button>
                    <button type="button" class="cv-outil" data-outil="aide">
                        <span aria-hidden="true">💡</span>Un coup</button>
                </div>
                <div class="cv-statut" role="status" aria-live="polite"></div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        brancherOutils();
        brancherGeste();
        peindre();
    }

    // ───────────────────────────────────────────────────────── dessiner ────

    /** Un damier, avec ses cavaliers. `interactif` pose les crochets du geste. */
    function damierHtml(etat, interactif) {
        const { colonnes, lignes } = item.meta;
        const mortes = new Set(item.meta.mortes || []);
        const ouPeutAller = (choisi !== null && interactif)
            ? new Set(voisins[choisi].filter(k => etat[k] === null)) : new Set();
        const out = [];
        for (let k = 0; k < colonnes * lignes; k++) {
            const morte = mortes.has(k);
            const couleur = etat[k];
            const classes = [
                'cv-case',
                // LES CASES SE COLORENT COMME UN ÉCHIQUIER : sans cela on ne
                // voit pas la forme du saut, et le L devient une incantation.
                ((k % colonnes) + Math.floor(k / colonnes)) % 2 ? 'cv-case--sombre' : '',
                morte ? 'cv-case--morte' : '',
                interactif && choisi === k ? 'cv-case--choisie' : '',
                ouPeutAller.has(k) ? 'cv-case--possible' : ''
            ].filter(Boolean).join(' ');
            const dedans = couleur
                ? `<span class="cv-cavalier cv-cavalier--${couleur}">${CAVALIER}</span>`
                : (ouPeutAller.has(k) ? '<span class="cv-point" aria-hidden="true"></span>' : '');
            const etiquette = couleur
                ? `cavalier ${couleur === 'A' ? 'rouge' : 'bleu'}`
                : (morte ? 'case inutilisable' : 'case vide');
            out.push(`<span class="${classes}"${interactif ? ` data-case="${k}"` : ''}
                ${interactif ? `role="button" tabindex="${morte ? -1 : 0}"` : ''}
                aria-label="${etiquette}">${dedans}</span>`);
        }
        return out.join('');
    }

    function peindre() {
        const damier = container.querySelector('[data-damier]');
        if (damier) damier.innerHTML = damierHtml(cases, true);
        const but = container.querySelector('[data-but]');
        if (but) but.innerHTML = damierHtml(item.meta.arrivee, false);
        if (!fini) {
            const mini = item.meta.minimum;
            dire(coupsJoues === 0
                ? (mini ? `${mini} coups suffisent. Touche un cavalier.`
                    : 'Touche un cavalier.')
                : `${coupsJoues} coup${coupsJoues > 1 ? 's' : ''} joué${
                    coupsJoues > 1 ? 's' : ''}.`);
        }
        container.querySelectorAll('[data-outil]').forEach(b => {
            b.disabled = fini || session.locked;
        });
    }

    function dire(texte) {
        const st = container.querySelector('.cv-statut');
        if (st) st.textContent = texte;
    }

    // ────────────────────────────────────────────────────────── le geste ────

    function brancherGeste() {
        const racine = container.querySelector('.cv-layout');
        if (!racine) return;
        // SUR LA RACINE, QUI SURVIT AUX REPEINTS : les cases sont refaites à
        // chaque coup, donc un écouteur posé sur une case mourrait au premier.
        racine.addEventListener('pointerup', (e) => {
            if (fini || destroyed || session.locked) return;
            const el = e.target.closest ? e.target.closest('[data-case]') : null;
            if (!el || !racine.contains(el)) return;
            toucher(Number(el.dataset.case));
        });
        racine.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const el = e.target.closest ? e.target.closest('[data-case]') : null;
            if (!el) return;
            e.preventDefault();
            toucher(Number(el.dataset.case));
        });
    }

    function toucher(k) {
        if ((item.meta.mortes || []).includes(k)) return;
        // ON CHOISIT, PUIS ON POSE — et toucher un autre cavalier change de
        // cavalier au lieu de refuser : c'est le geste qu'on fait sans y
        // penser quand on s'est trompé de pièce.
        if (cases[k]) { choisi = (choisi === k) ? null : k; peindre(); return; }
        if (choisi === null) return;
        if (!voisins[choisi].includes(k)) {
            dire('Un cavalier saute en L : deux cases d\'un côté, une de l\'autre.');
            return;
        }
        cases = jouer(cases, choisi, k);
        coupsJoues++;
        choisi = null;
        peindre();
        verifier();
    }

    // ───────────────────────────────────────────────────────── les outils ────

    function brancherOutils() {
        container.querySelectorAll('[data-outil]').forEach(b => {
            b.onclick = () => {
                if (fini || session.locked) return;
                if (b.dataset.outil === 'recommencer') {
                    cases = item.meta.depart.slice();
                    coupsJoues = 0; choisi = null;
                    peindre();
                    dire('On repart du début.');
                    return;
                }
                aider();
            };
        });
    }

    /**
     * L'AIDE DONNE UN COUP, PAS LA SOLUTION.
     *
     * Elle résout DEPUIS L'ÉTAT COURANT — et non depuis le départ — puis joue
     * le premier coup de cette route. Rejouer la solution d'origine
     * par-dessus un début différent n'aiderait pas : elle ajouterait une
     * contradiction.
     */
    function aider() {
        const route = resoudreDIci();
        if (!route) {
            dire('Depuis cette position, je ne trouve pas. Recommence.');
            return;
        }
        if (!route.length) { dire('C\'est déjà fait.'); return; }
        const c = route[0];
        cases = jouer(cases, c.de, c.vers);
        coupsJoues++;
        choisi = null;
        peindre();
        dire(`Un coup joué pour toi. Il en reste ${route.length - 1}.`);
        verifier();
    }

    /** Le plus court chemin depuis l'état courant, par parcours en largeur. */
    function resoudreDIci() {
        const but = item.meta.arrivee;
        if (estArrive(cases, but)) return [];
        const cle = (c) => c.map(x => x || '.').join('');
        const vus = new Set([cle(cases)]);
        let file = [{ etat: cases, chemin: [] }];
        for (let p = 0; p < 60 && file.length; p++) {
            const suivante = [];
            for (const { etat, chemin } of file) {
                for (const c of coups(etat, voisins)) {
                    const apres = jouer(etat, c.de, c.vers);
                    const k = cle(apres);
                    if (vus.has(k)) continue;
                    vus.add(k);
                    const route = chemin.concat([c]);
                    if (estArrive(apres, but)) return route;
                    suivante.push({ etat: apres, chemin: route });
                }
            }
            file = suivante;
        }
        return null;
    }

    // ──────────────────────────────────────────────────────── corriger ────

    function verifier() {
        if (fini) return;
        if (!estArrive(cases, item.meta.arrivee)) return;
        fini = true;
        choisi = null;
        peindre();
        const damier = container.querySelector('[data-damier]');
        if (damier) damier.classList.add('cv-damier--ok');
        const mini = item.meta.minimum;
        dire(coupsJoues === mini
            ? `Échangés en ${coupsJoues} coups — c'est le minimum.`
            : `Échangés en ${coupsJoues} coups.`);
        const result = session.submit('echange');
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot joue la solution, coup après coup. */
    async function runDemo() {
        peindre();
        for (const c of item.meta.solution) {
            if (destroyed) return;
            cases = jouer(cases, c.de, c.vers);
            coupsJoues++;
            peindre();
            await new Promise(r => regTimeout(r, 480));
        }
        if (!destroyed) regTimeout(renderNext, 1100);
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
