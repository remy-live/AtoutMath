// Activité « Contre-la-montre ».
//
// Une jauge se vide à chaque question, et le temps accordé se RESSERRE à chaque
// bonne réponse : on commence à neuf secondes, on finit à moins de trois. C'est
// ce qui transforme une liste de questions en jeu — non pas parce qu'il y a un
// chronomètre, mais parce qu'on sent qu'on va de plus en plus vite.
//
// La descente est amortie dans les deux sens : une erreur (ou un temps écoulé)
// desserre l'étau, sinon un élève en difficulté accélérerait jusqu'à un mur
// dont il ne peut plus redescendre. La série, elle, repart de zéro.
//
// Comme toutes les activités, celle-ci ne connaît AUCUNE notion : elle affiche
// l'énoncé et les propositions de l'item. Elle sert donc aussi bien les
// notations de géométrie que les tables ou les fractions.

import { regTimeout } from '../timers.js';
import { createDemoCursor } from '../demoPointer.js';
import { creerNarrateur } from '../demoNarration.js';
import { demoChoix } from '../demoScript.js';
import { hintBar, wireHint } from './choice.js';

const DEPART = 9000;        // temps accordé à la première question (ms)
const PLANCHER = 2600;      // en dessous, ce n'est plus du calcul mais du réflexe
const ACCELERATION = 0.88;  // facteur appliqué à chaque bonne réponse
const RESPIRATION = 1.22;   // desserrage après une erreur ou un temps écoulé

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let narrateur = null;
    let item = null;

    let budget = DEPART;
    let restant = DEPART;
    let debut = 0;
    let chrono = null;
    let serie = 0;
    let record = 0;
    // Vrai tant qu'une correction est à l'écran. Le voile arrête la souris,
    // pas le clavier : sans ce verrou, un chiffre tapé pendant l'explication
    // répondait par-dessus elle.
    let bloque = false;

    container.innerHTML = `
        <div class="sprint-wrap">
            <div class="sprint-hud">
                <span class="sprint-vitesse" data-vitesse>Vitesse 1</span>
                <span class="sprint-serie" data-serie>Série 0</span>
            </div>
            <div class="sprint-jauge"><div class="sprint-barre" data-barre></div></div>
            <div class="sprint-scene" data-scene></div>
        </div>`;

    const barre = container.querySelector('[data-barre]');
    const scene = container.querySelector('[data-scene]');
    const vitesseEl = container.querySelector('[data-vitesse]');
    const serieEl = container.querySelector('[data-serie]');

    // Le palier affiché se DÉDUIT du budget au lieu d'être compté à part :
    // deux compteurs finissent toujours par diverger.
    const niveau = () => 1 + Math.round(Math.log(DEPART / budget) / Math.log(1 / ACCELERATION));

    function majHud(gagne = false) {
        vitesseEl.textContent = `Vitesse ${niveau()}`;
        serieEl.textContent = serie > 0 ? `🔥 Série ${serie}` : 'Série 0';
        serieEl.classList.toggle('sprint-serie--chaude', serie >= 3);
        if (gagne) {
            vitesseEl.classList.remove('sprint-vitesse--monte');
            void vitesseEl.offsetWidth;
            vitesseEl.classList.add('sprint-vitesse--monte');
        }
    }

    // --- Chronomètre --------------------------------------------------------
    // La jauge est une animation CSS, et non un minuteur qui repeint : elle
    // reste fluide même quand le fil principal travaille. Le décalage négatif
    // permet de la REPRENDRE en cours de route après une pause, au lieu de la
    // faire repartir pleine.

    function armer(ms) {
        if (destroyed) return;
        const ecoule = Math.max(0, budget - ms);
        barre.style.animation = 'none';
        void barre.offsetWidth;
        barre.style.animation = `sprint-fondre ${budget}ms linear -${ecoule}ms forwards`;
        barre.style.animationPlayState = 'running';
        debut = Date.now() - ecoule;
        restant = ms;
        chrono = regTimeout(tempsEcoule, ms);
    }

    function suspendre() {
        if (chrono) { clearTimeout(chrono); chrono = null; }
        restant = Math.max(0, budget - (Date.now() - debut));
        barre.style.animationPlayState = 'paused';
    }

    function accelerer() {
        serie++;
        record = Math.max(record, serie);
        const avant = budget;
        budget = Math.max(PLANCHER, Math.round(budget * ACCELERATION));
        majHud(budget < avant);
    }

    function relacher() {
        serie = 0;
        budget = Math.min(DEPART, Math.round(budget * RESPIRATION));
        majHud();
    }

    function tempsEcoule() {
        chrono = null;
        if (destroyed) return;
        barre.classList.add('sprint-barre--vide');
        relacher();
        bloque = true;

        // Une question laissée sans réponse est une réponse fausse : c'est la
        // règle annoncée par le chronomètre, et elle doit être tracée comme
        // telle — sinon la statistique récompense l'attentisme.
        const result = session.submit('');
        montrerBonne();
        const suite = (result && result.dismissed) || Promise.resolve();
        suite.then(() => { if (!destroyed) regTimeout(suivante, 500); });
    }

    // --- Rendu --------------------------------------------------------------

    function suivante() {
        if (destroyed) return;
        // Le professeur peut sauter une question en cours de route : le
        // compte à rebours de la précédente ne doit pas la suivre.
        if (chrono) { clearTimeout(chrono); chrono = null; }
        bloque = false;
        item = session.next();
        rendre(item);
    }

    function rendre(item) {
        const choices = item.choices || [];
        scene.innerHTML = `
            ${item.prompt.html}
            <div class="sprint-choix">
                ${choices.map((c, i) => `
                    <button type="button" class="sprint-tuile" data-idx="${i}">
                        <span class="sprint-touche" aria-hidden="true">${i + 1}</span>
                        <span class="sprint-etiquette">${c.label}</span>
                    </button>`).join('')}
            </div>
            ${hintBar(session)}`;

        const tuiles = [...scene.querySelectorAll('[data-idx]')];
        barre.classList.remove('sprint-barre--vide');

        if (session.isDemo) {
            // Vignette figée : la jauge est un décor, elle ne descend pas.
            barre.style.animation = 'none';
            barre.style.transform = 'scaleX(0.72)';
            if (!session.frozen) {
                // Quand le robot commente, la jauge ne descend pas : une
                // explication dure plus longtemps qu'une question, et la voir
                // se vider donnerait à croire que le temps est écoulé.
                if (!session.narration) {
                    barre.style.transform = '';
                    barre.style.animation = `sprint-fondre ${DEPART}ms linear forwards`;
                }
                demonstration(tuiles);
            }
            return;
        }

        brancherIndice();
        tuiles.forEach(el => { el.onclick = () => repondre(el, choices, tuiles); });
        armer(budget);
    }

    function repondre(el, choices, tuiles) {
        if (destroyed || bloque || el.dataset.eteinte === '1') return;
        const result = session.submit(choices[Number(el.dataset.idx)].value, { element: el });
        if (result.ignored) return;

        // Le temps s'arrête pendant la correction, dans tous les cas : lire une
        // explication la montre en main n'apprend rien, et ce n'est pas ce
        // qu'on cherche à mesurer.
        suspendre();
        bloque = true;

        if (result.correct) {
            el.classList.add('sprint-tuile--ok');
            accelerer();
            geler(tuiles);
            result.dismissed.then(() => { if (!destroyed) suivante(); });
            return;
        }

        el.classList.add('sprint-tuile--ko');
        el.dataset.eteinte = '1';
        relacher();

        if (result.done) {
            geler(tuiles);
            montrerBonne();
            result.dismissed.then(() => { if (!destroyed) regTimeout(suivante, 500); });
            return;
        }

        // Il reste un essai : on rend la main ET le temps qui restait.
        result.dismissed.then(() => {
            if (destroyed) return;
            bloque = false;
            armer(restant);
        });
    }

    function geler(tuiles) {
        tuiles.forEach(t => { t.style.pointerEvents = 'none'; });
    }

    function montrerBonne() {
        const choices = (item && item.choices) || [];
        const idx = choices.findIndex(c => c.correct);
        const el = scene.querySelector(`[data-idx="${idx}"]`);
        if (el) el.classList.add('sprint-tuile--vraie');
        scene.querySelectorAll('[data-idx]').forEach(t => { t.style.pointerEvents = 'none'; });
    }

    function brancherIndice() {
        const btn = scene.querySelector('[data-hint]');
        if (!btn) return;
        // Demander de l'aide arrête la course : on ne lit pas un indice à la
        // sauvette. La série s'arrête là, le temps aussi.
        btn.addEventListener('click', () => {
            suspendre();
            serie = 0;
            majHud();
        }, { capture: true });
        wireHint(scene, session);
    }

    // Au clavier, on ne vise pas : on frappe le numéro. C'est ce qui rend les
    // paliers rapides jouables ailleurs qu'au doigt.
    function auClavier(e) {
        if (destroyed || bloque || session.isDemo) return;
        const n = Number(e.key);
        if (!n || n < 1 || n > 9) return;
        const el = scene.querySelector(`[data-idx="${n - 1}"]`);
        if (el) { e.preventDefault(); el.click(); }
    }
    document.addEventListener('keydown', auClavier);

    async function demonstration(tuiles) {
        if (!cursor) cursor = createDemoCursor();
        if (session.narration && !narrateur) narrateur = creerNarrateur();
        const fini = await demoChoix({
            narrateur, cursor, item, cellules: tuiles,
            question: scene.querySelector('.game-question'),
            apresChoix: (el) => el.classList.add('sprint-tuile--ok')
        });
        if (!fini || destroyed) return;
        suivante();
    }

    majHud();
    suivante();

    return {
        showNext: suivante,
        showPrevious() { if (session.rewind()) suivante(); },
        destroy() {
            destroyed = true;
            if (chrono) { clearTimeout(chrono); chrono = null; }
            document.removeEventListener('keydown', auClavier);
            if (cursor) { cursor.destroy(); cursor = null; }
            if (narrateur) { narrateur.detruire(); narrateur = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
