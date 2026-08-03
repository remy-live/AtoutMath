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
    settle: 520,    // temps de lecture après un appui
    drag: 1050,     // un glissement se montre plus lentement qu'un déplacement
    between: 1500   // pause avant la question suivante
};

// --- Pilotage de la démonstration -------------------------------------------
//
// Pause et vitesse sont GLOBALES, et non propres à un curseur : il n'y a jamais
// qu'une démonstration à l'écran, et les commandes doivent pouvoir agir dessus
// sans savoir quel module la joue.
//
// Tout passe par `wait()` : chaque attente est un objet qu'on sait geler et
// relancer avec le temps qui lui restait. Une durée figée dans un `setTimeout`
// ne se met pas en pause — c'est pour cela que les attentes sont réifiées.

let enPause = false;
let vitesse = 1;              // 1 = allure de référence ; 0.5 = deux fois plus lent
const attentes = new Set();   // attentes en cours, tous curseurs confondus

/** @param {number} v - multiplicateur d'allure (0.25 à 3) */
export function reglerVitesseDemo(v) {
    vitesse = Math.max(0.25, Math.min(3, Number(v) || 1));
    return vitesse;
}

export function vitesseDemo() { return vitesse; }
export function estEnPause() { return enPause; }

/** Bascule (sans argument) ou force la pause. @returns {boolean} état obtenu */
export function pauserDemo(valeur) {
    const cible = valeur === undefined ? !enPause : !!valeur;
    if (cible === enPause) return enPause;
    enPause = cible;
    [...attentes].forEach(a => (enPause ? a.geler() : a.repartir()));
    return enPause;
}

/**
 * Coupe court à toutes les attentes en cours, sans détruire les curseurs.
 *
 * C'est ce qui permet de changer de question pendant une démonstration : la
 * boucle qui la joue est une fonction `async` suspendue sur un `await`, et
 * seule une attente résolue à `false` la fait renoncer. Sans cela, l'ancienne
 * démonstration continuerait de piloter la nouvelle question.
 */
export function interrompreDemo() {
    [...attentes].forEach(a => a.fin(false));
}

/**
 * Attente pausable et soumise à la vitesse, hors curseur.
 *
 * C'est le battement de toute la démonstration : la bulle de parole du
 * narrateur s'en sert comme le pointeur, donc « pause » arrête la phrase en
 * cours de lecture et « ×0,5 » laisse le double du temps pour la lire.
 *
 * @param {number} ms
 * @param {(a:Object)=>void} [suivre] - reçoit l'attente, pour la dénouer
 * @returns {Promise<boolean>} false si elle a été interrompue
 */
export function attendreDemo(ms, suivre = null) {
    const duree = Math.max(0, Math.round(ms / vitesse));
    return new Promise(resolve => {
        const a = {
            reste: duree,
            debut: 0,
            timer: null,
            fin(ok) {
                if (a.timer) { clearTimeout(a.timer); a.timer = null; }
                attentes.delete(a);
                resolve(ok);
            },
            geler() {
                if (!a.timer) return;
                clearTimeout(a.timer);
                a.timer = null;
                a.reste = Math.max(0, a.reste - (Date.now() - a.debut));
            },
            repartir() {
                a.debut = Date.now();
                a.timer = regTimeout(() => a.fin(true), a.reste);
            }
        };
        attentes.add(a);
        if (suivre) suivre(a);
        if (!enPause) a.repartir();
    });
}

/**
 * Crée un pointeur. À détruire avec `destroy()` — ou, plus simplement, en
 * laissant `clearEngines()` faire son travail : toutes les attentes passent par
 * `regTimeout`, donc une démonstration interrompue ne laisse rien en vol.
 */
export function createDemoCursor() {
    const el = document.createElement('div');
    el.className = 'demo-cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M5 2.5 L5 19 L9.2 15.2 L11.9 21.2 L14.6 20 L12 14.2 L18 14 Z"
                  fill="#111827" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>
        </svg><span class="demo-cursor-halo"></span>`;
    document.body.appendChild(el);

    let destroyed = false;
    let ghost = null;
    // Les attentes en cours, pour les dénouer à la destruction : une promesse
    // jamais résolue retiendrait indéfiniment la fonction qui l'attend.
    const pending = new Set();

    function wait(ms) {
        if (destroyed) return Promise.resolve(false);
        const duree = Math.max(0, Math.round(ms / vitesse));
        return new Promise(resolve => {
            const a = {
                reste: duree,
                debut: 0,
                timer: null,
                fin(ok) {
                    if (a.timer) { clearTimeout(a.timer); a.timer = null; }
                    attentes.delete(a);
                    pending.delete(a);
                    resolve(ok);
                },
                geler() {
                    if (!a.timer) return;
                    clearTimeout(a.timer);
                    a.timer = null;
                    a.reste = Math.max(0, a.reste - (Date.now() - a.debut));
                },
                repartir() {
                    a.debut = Date.now();
                    a.timer = regTimeout(() => a.fin(!destroyed), a.reste);
                }
            };
            attentes.add(a);
            pending.add(a);
            if (!enPause) a.repartir();
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

    return {
        get destroyed() { return destroyed; },

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
            // La transition dure le temps RÉELLEMENT attendu : au ralenti, un
            // pointeur qui arrive en 750 ms puis attend une seconde n'a pas
            // ralenti, il s'est mis à saccader.
            place(x, y, Math.round(ms / vitesse));
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
            ghost.style.setProperty('transition-duration', `${Math.round(ms / vitesse)}ms`, 'important');
            document.body.appendChild(ghost);
            source.classList.add('drag-source');

            // Un `reflow` sépare la pose du déplacement : sans lui, le
            // navigateur regroupe les deux et le fantôme apparaît déjà arrivé.
            void ghost.offsetWidth;

            const to = centerOf(target);
            ghost.style.left = `${to.x - r.width / 2}px`;
            ghost.style.top = `${to.y - r.height / 2}px`;
            target.classList.add('compare-slot--hover');
            place(to.x, to.y, Math.round(ms / vitesse));

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
            [...pending].forEach(a => a.fin(false));
            pending.clear();
            if (ghost) { ghost.remove(); ghost = null; }
            el.remove();
        }
    };
}
