// Curseur de démonstration.
//
// Une démonstration muette n'enseigne rien. Jusqu'ici, les activités se
// contentaient de marquer la bonne réponse puis d'enchaîner : sur la
// comparaison de nombres, on voyait les questions défiler sans jamais voir le
// geste — ni le signe saisi, ni le glisser-déposer qui est pourtant TOUT ce que
// l'exercice demande d'apprendre.
//
// Ce module fournit un pointeur visible, que les activités déplacent, font
// appuyer et font glisser. Ce qui compte n'est pas qu'il aille au bon endroit,
// mais qu'on ait le temps de suivre son trajet : les durées sont volontairement
// lentes, à hauteur d'un geste humain montré à un élève.
//
// Il est en `position: fixed` sur le `body` : les mêmes appels fonctionnent
// dans la vignette d'une carte, dans le simulateur du professeur et en plein
// écran, sans que l'activité ait à savoir où elle est montée.

import { regTimeout } from './timers.js';

export const DEMO_SPEED = {
    move: 750,      // trajet d'un point à un autre
    press: 260,     // enfoncement
    settle: 650,    // temps de lecture après un appui
    drag: 1050,     // un glissement se montre plus lentement qu'un déplacement
    between: 1900   // pause avant la question suivante
};

// --- Vitesse globale des démonstrations -------------------------------------
// Un même robot va trop vite pour l'un, trop lentement pour l'autre : le
// facteur multiplie TOUTES les durées (trajets, pauses, lectures) et se
// retient d'une session à l'autre.
// L'ordre du tableau est l'ordre du cycle : le premier clic RALENTIT — c'est
// presque toujours ce qu'on cherche quand on touche à la vitesse d'une démo.
const VITESSES = [
    { facteur: 1, libelle: '▶ Normal' },
    { facteur: 1.7, libelle: '🐢 Lent' },
    { facteur: 0.6, libelle: '⚡ Rapide' }
];

let facteurVitesse = (() => {
    const v = parseFloat(localStorage.getItem('mathbox-demo-speed'));
    return VITESSES.some(o => o.facteur === v) ? v : 1;
})();

export function setDemoSpeedFactor(f) {
    facteurVitesse = f;
    try { localStorage.setItem('mathbox-demo-speed', String(f)); } catch { /* stockage plein ou privé */ }
}

// --- Mode muet ---------------------------------------------------------------
// Les vignettes d'aperçu (survol du catalogue, cartes, mode présentation)
// jouent la démonstration en miniature : une bulle d'explication posée sur
// <body> y recouvrirait toute la page — et survivait à la vignette. En muet,
// le robot joue sans parler ; le plein écran garde ses bulles.
let muet = false;
export function setDemoMuet(v) { muet = !!v; }

// Tous les pointeurs vivants. `clearEngines()` coupe les minuteurs d'une
// démonstration interrompue, mais l'ÉLÉMENT du curseur, posé sur <body>,
// restait affiché : on fermait l'aperçu et une flèche fantôme continuait de
// flotter sur l'écran. Ce registre permet de les balayer tous à la fermeture.
const curseursVivants = new Set();

/** Détruit tous les pointeurs de démonstration encore à l'écran. */
export function destroyAllDemoCursors() {
    [...curseursVivants].forEach(c => c.destroy());
    curseursVivants.clear();
    // Ceinture et bretelles : un curseur créé par un module rechargé (autre
    // instance de ce fichier) ne serait pas dans le registre. La bulle vit
    // elle aussi sur <body> : sans ce balayage, une explication du robot
    // restait affichée après la fermeture du jeu.
    document.querySelectorAll('.demo-cursor, .demo-bubble').forEach(el => el.remove());
}

/**
 * Barre de commande d'une démonstration : pause / lecture et pas-à-pas.
 *
 * Le robot appelle `waitTurn()` avant chaque coup. En lecture, la promesse se
 * résout tout de suite ; en pause, elle attend « Un pas » (qui libère UN coup
 * puis rebloque) ou « Reprendre ». On peut ainsi suivre une déduction à son
 * rythme, ce qu'un défilement continu ne permet pas.
 */
export function createDemoGate(host) {
    let paused = false;
    let destroyed = false;
    let attentes = [];

    const bar = document.createElement('div');
    bar.className = 'demo-controls';
    bar.innerHTML = `
        <button type="button" class="demo-ctrl-btn" data-demo-pause aria-label="Mettre la démonstration en pause">⏸ Pause</button>
        <button type="button" class="demo-ctrl-btn" data-demo-step aria-label="Avancer d'un pas">⏭ Un pas</button>
        <button type="button" class="demo-ctrl-btn" data-demo-speed aria-label="Vitesse de la démonstration"></button>`;
    host.appendChild(bar);

    // Vitesse : un bouton qui fait le tour Lent → Normal → Rapide, et
    // retient le choix pour les prochaines démonstrations.
    const btnVitesse = bar.querySelector('[data-demo-speed]');
    const majVitesse = () => {
        const v = VITESSES.find(o => o.facteur === facteurVitesse) || VITESSES[1];
        btnVitesse.textContent = v.libelle;
        btnVitesse.classList.toggle('demo-ctrl-btn--active', v.facteur !== 1);
    };
    btnVitesse.onclick = () => {
        const i = VITESSES.findIndex(o => o.facteur === facteurVitesse);
        setDemoSpeedFactor(VITESSES[(i + 1) % VITESSES.length].facteur);
        majVitesse();
    };
    majVitesse();

    const btnPause = bar.querySelector('[data-demo-pause]');
    const liberer = () => { attentes.forEach(r => r()); attentes = []; };
    const poserPause = (etat) => {
        paused = etat;
        btnPause.innerHTML = paused ? '▶ Reprendre' : '⏸ Pause';
        btnPause.classList.toggle('demo-ctrl-btn--active', paused);
    };

    btnPause.onclick = () => {
        poserPause(!paused);
        if (!paused) liberer();
    };
    bar.querySelector('[data-demo-step]').onclick = () => {
        // « Un pas » implique la pause : on libère un seul coup, la boucle
        // se rebloquera au prochain `waitTurn()`.
        if (!paused) poserPause(true);
        liberer();
    };

    return {
        get paused() { return paused; },
        async waitTurn() {
            if (destroyed) return false;
            if (!paused) return true;
            return new Promise(res => attentes.push(() => res(!destroyed)));
        },
        destroy() {
            destroyed = true;
            liberer();
            bar.remove();
        }
    };
}

/**
 * Crée un pointeur. À détruire avec `destroy()` — ou, plus simplement, en
 * laissant `clearEngines()` faire son travail : toutes les attentes passent par
 * `regTimeout`, donc une démonstration interrompue ne laisse rien en vol.
 */
export function createDemoCursor() {
    // Un curseur créé en mode muet (vignettes d'aperçu) reste DISCRET pour
    // toute sa vie : ni flèche ni bulle. Douze cartes qui montent leurs
    // aperçus en même temps lançaient douze robots — autant de flèches et de
    // bulles qui traversaient l'écran le temps du gel des vignettes.
    const discret = muet;
    const el = document.createElement('div');
    el.className = 'demo-cursor';
    el.setAttribute('aria-hidden', 'true');
    if (discret) el.style.display = 'none';
    el.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M5 2.5 L5 19 L9.2 15.2 L11.9 21.2 L14.6 20 L12 14.2 L18 14 Z"
                  fill="#111827" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>
        </svg><span class="demo-cursor-halo"></span>`;
    document.body.appendChild(el);

    let destroyed = false;
    let ghost = null;
    let bulle = null;
    // Les attentes en cours, pour les dénouer à la destruction : une promesse
    // jamais résolue retiendrait indéfiniment la fonction qui l'attend.
    const pending = new Set();

    function wait(ms) {
        if (destroyed) return Promise.resolve(false);
        return new Promise(resolve => {
            const done = (ok) => { pending.delete(done); resolve(ok); };
            pending.add(done);
            regTimeout(() => done(!destroyed), ms * facteurVitesse);
        });
    }

    function place(x, y, ms) {
        el.style.transitionDuration = `${ms}ms`;
        el.style.transform = `translate(${x}px, ${y}px)`;
    }

    function centerOf(target) {
        const r = target.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    const api = {
        get destroyed() { return destroyed; },

        /**
         * Bulle d'explication accrochée au pointeur : le robot dit POURQUOI il
         * joue ce coup. Elle reste affichée jusqu'au prochain `say()` ou à
         * `hideBubble()`, pour laisser le temps de lire.
         */
        say(texte, cible = null) {
            if (destroyed || !texte || muet || discret) return;
            if (!bulle) {
                bulle = document.createElement('div');
                bulle.className = 'demo-bubble';
                bulle.setAttribute('role', 'status');
                document.body.appendChild(bulle);
            }
            bulle.textContent = texte;
            bulle.classList.add('demo-bubble--on');
            const ancre = cible ? centerOf(cible) : positionActuelle();
            requestAnimationFrame(() => {
                if (!bulle) return;
                const b = bulle.getBoundingClientRect();
                const marge = 10;
                let left = ancre.x - b.width / 2;
                left = Math.max(marge, Math.min(left, window.innerWidth - b.width - marge));
                let top = ancre.y - b.height - 46;
                const dessous = top < marge;
                if (dessous) top = ancre.y + 40;
                // La pointe vise l'ancre même quand la bulle a été ramenée
                // dans la fenêtre, et bascule en haut quand la bulle est
                // passée dessous — sinon elle désignait le vide.
                const pointe = Math.max(14, Math.min(ancre.x - left, b.width - 14));
                bulle.style.setProperty('--bulle-pointe', `${Math.round(pointe)}px`);
                bulle.classList.toggle('demo-bubble--dessous', dessous);
                bulle.style.left = `${Math.round(left)}px`;
                bulle.style.top = `${Math.round(top)}px`;
            });
        },

        hideBubble() {
            if (bulle) bulle.classList.remove('demo-bubble--on');
        },

        /** Amène le pointeur au centre de l'élément et attend d'y être. */
        async moveTo(target, ms = DEMO_SPEED.move) {
            if (destroyed || !target) return false;
            const { x, y } = centerOf(target);
            // Premier positionnement : sans transition, sinon le pointeur
            // traverse l'écran depuis son coin d'origine.
            if (!el.dataset.placed) {
                el.dataset.placed = '1';
                place(x, y, 0);
                el.classList.add('demo-cursor--visible');
                return wait(220);
            }
            place(x, y, ms * facteurVitesse);
            return wait(ms);
        },

        /** Appui visible : halo qui se referme sur le point. */
        async press() {
            if (destroyed) return false;
            el.classList.add('demo-cursor--pressed');
            return wait(DEMO_SPEED.press);
        },

        async release() {
            if (destroyed) return false;
            el.classList.remove('demo-cursor--pressed');
            return wait(160);
        },

        /** Appui complet sur un élément : trajet, enfoncement, relâchement. */
        async tap(target, ms) {
            if (!await this.moveTo(target, ms)) return false;
            if (!await this.press()) return false;
            return this.release();
        },

        /**
         * Saisit une tuile, la fait glisser jusqu'à la cible et la dépose.
         * Le fantôme est le clone que l'élève verra sous son doigt : c'est le
         * même artifice que le glisser-déposer réel, pour que la démonstration
         * montre exactement le geste attendu.
         */
        async dragFromTo(source, target, ms = DEMO_SPEED.drag) {
            if (destroyed || !source || !target) return false;
            if (!await this.moveTo(source)) return false;
            if (!await this.press()) return false;

            const r = source.getBoundingClientRect();
            ghost = source.cloneNode(true);
            ghost.classList.add('drag-ghost', 'drag-ghost--demo');
            ghost.style.width = `${r.width}px`;
            ghost.style.height = `${r.height}px`;
            ghost.style.left = `${r.left}px`;
            ghost.style.top = `${r.top}px`;
            ghost.style.setProperty('transition-duration', `${ms * facteurVitesse}ms`, 'important');
            document.body.appendChild(ghost);
            source.classList.add('drag-source');

            // Un `reflow` sépare la pose du déplacement : sans lui, le
            // navigateur regroupe les deux et le fantôme apparaît déjà arrivé.
            void ghost.offsetWidth;

            const to = centerOf(target);
            ghost.style.left = `${to.x - r.width / 2}px`;
            ghost.style.top = `${to.y - r.height / 2}px`;
            target.classList.add('compare-slot--hover');
            place(to.x, to.y, ms * facteurVitesse);

            if (!await wait(ms + 120)) return false;

            target.classList.remove('compare-slot--hover');
            source.classList.remove('drag-source');
            if (ghost) { ghost.remove(); ghost = null; }
            await this.release();
            return !destroyed;
        },

        /** Pause de lecture, interruptible comme le reste. */
        pause(ms = DEMO_SPEED.settle) { return wait(ms); },

        destroy() {
            destroyed = true;
            curseursVivants.delete(api);
            pending.forEach(done => done(false));
            pending.clear();
            if (ghost) { ghost.remove(); ghost = null; }
            if (bulle) { bulle.remove(); bulle = null; }
            el.remove();
        }
    };

    // La position courante du pointeur, pour ancrer la bulle quand aucun
    // élément cible n'est fourni.
    function positionActuelle() {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top };
    }

    curseursVivants.add(api);
    return api;
}
