// Activité « Pose la Loupe » — on fait GLISSER le verre jusqu'à la croix.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, deux fois, et la seconde a défait la première :
//
// > « pour le zoom, il faudrait que ce soit l'élève qui pose la loupe et gère
// > le zoom quand il se rend compte que ca ne tombe pas encore juste. »
//
// > « je trouve la disposition mauvais. Je préfèrerai que l'élève puisse avoir
// > une loupe et que ce soit pas un étirement vertical qui déforme la croix,
// > c'est pas terribe. Et puis le clavier en dessous est coupé »
//
// ── CE QUI A CHANGÉ, ET POURQUOI ───────────────────────────────────────────
//
// La première version remplaçait la droite par l'intervalle choisi, étiré
// jusqu'à remplir l'écran. Cet étirement ne tirait QUE l'horizontale : la croix,
// qui est un X, devenait un X aplati. Une loupe, elle, agrandit les deux
// directions du même facteur — et une croix reste une croix.
//
// Alors la droite ne bouge plus. Un verre glisse dessus et montre, agrandi six
// fois, le morceau qu'il couvre. L'élève le fait glisser jusqu'à la croix, lit
// les petits traits, et écrit.
//
// ── UN SEUL GESTE, ET IL N'A PAS DE MODE ───────────────────────────────────
//
// On pose le doigt n'importe où dans le dessin : le verre y va. On glisse : il
// suit. C'est tout. Il n'y a pas de « mode zoom », pas de bouton à armer, pas
// d'intervalle à choisir avant de pouvoir regarder. Les deux flèches font la
// même chose d'un cran, pour le clavier et pour les doigts qui ne glissent pas.
//
// ── CE QUI N'EST PAS UNE FAUTE ─────────────────────────────────────────────
//
// Poser le verre au mauvais endroit n'est pas jugé, n'est pas compté, et ne
// dit rien. On peut le promener toute la question. Ce qui est jugé, c'est
// l'abscisse écrite — une seule fois, à la fin. Rémy : « quand il se rend
// compte que ça ne tombe pas encore juste » suppose qu'il PUISSE se tromper
// sans être puni.
//
// ── POURQUOI UN PAVÉ À SOI, ET POURQUOI IL EST À CÔTÉ ──────────────────────
//
// Le pavé de `numeric.js` est une ACTIVITÉ entière : il tient la session, les
// propositions, la démonstration. On ne peut pas l'ouvrir au milieu d'une
// autre. On réécrit donc le clavier — vingt lignes — mais AVEC SES CLASSES
// (`numpad-device`, `numpad-key`, `numpad-screen`) : même dessin, même taille
// de touche, mêmes sondes.
//
// ET SUR UN ÉCRAN LARGE IL SE MET À CÔTÉ DU DESSIN, pas en dessous. Empilés,
// dessin et pavé faisaient 762 px sur un portable de 720 : « le clavier en
// dessous est coupé ». Une addition de hauteurs ne se corrige pas en rognant
// chaque morceau — elle se corrige en cessant d'additionner.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { loupeSvg, LOUPE_GEO } from '../figures.js';

const CHIFFRES = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

/** Un nombre à la française, à `rang` décimales, sans zéro inutile. */
const fr = (v, rang) => v.toFixed(rang)
    .replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace('.', ',');

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** Où est le centre du verre, en centièmes de la droite (0 à 100). */
    let centre = 50;
    let saisie = '';
    let fini = false;
    let message = '';
    /** Vrai pendant qu'un doigt tient le verre. */
    let tient = false;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(prochain) {
        item = prochain;
        // LE VERRE NE COMMENCE JAMAIS SUR LA CROIX. S'il y était déjà, la
        // question se résoudrait en se posant : il n'y aurait plus de geste, et
        // c'est le geste qu'on enseigne. On le range donc à l'autre bout, à
        // trente-cinq centièmes au moins de ce qu'il faut lire.
        centre = item.meta.croix < 50 ? 85 : 15;
        saisie = '';
        fini = false;
        message = '';
        tient = false;

        container.innerHTML = `
            <div class="lp-layout">
                <div class="lp-context">${item.prompt.html}</div>
                <div class="lp-scene">
                    <div class="lp-gauche">
                        <div class="lp-plan" data-plan tabindex="0" role="slider"
                             aria-label="La loupe, à faire glisser le long de la droite"
                             aria-valuemin="0" aria-valuemax="100"></div>
                        <div class="lp-barre">
                            <button type="button" class="lp-fleche" data-pas="-1"
                                    aria-label="Glisser la loupe vers la gauche">◀</button>
                            <span class="lp-aide">Fais glisser la loupe</span>
                            <button type="button" class="lp-fleche" data-pas="1"
                                    aria-label="Glisser la loupe vers la droite">▶</button>
                        </div>
                    </div>
                    <div class="numpad-device lp-pave">
                        <div class="numpad-screen" aria-live="polite">
                            <span class="numpad-value" data-display></span>
                        </div>
                        <div class="numpad" role="group" aria-label="Pavé numérique">
                            ${CHIFFRES.map(c => `<button type="button" class="numpad-key"
                                data-touche="${c}">${c}</button>`).join('')}
                            <button type="button" class="numpad-key" data-touche=",">,</button>
                            <button type="button" class="numpad-key" data-touche="0">0</button>
                            <button type="button" class="numpad-key numpad-key--del"
                                    data-touche="←" aria-label="Effacer le dernier chiffre">←</button>
                            <button type="button" class="numpad-key numpad-key--ok"
                                    data-valider>Valider</button>
                        </div>
                    </div>
                </div>
                <div class="lp-statut" role="status" aria-live="polite"></div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        container.querySelectorAll('[data-touche]').forEach((b) => {
            b.onclick = () => taper(b.getAttribute('data-touche'));
        });
        container.querySelector('[data-valider]').onclick = valider;
        container.querySelectorAll('[data-pas]').forEach((b) => {
            b.onclick = () => poser(centre + Number(b.getAttribute('data-pas')));
        });
        brancherLeGeste();
        peindre();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LE GESTE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * OÙ EST LE DOIGT, EN CENTIÈMES DE LA DROITE.
     *
     * ON PASSE PAR `getScreenCTM()`, ET NON PAR LA LARGEUR DE LA BOÎTE. Un
     * `viewBox` que son élément n'a pas le même rapport conserve des bandes
     * vides sur les côtés (`preserveAspectRatio` par défaut) : diviser par la
     * largeur de la boîte donne alors un décalage que rien n'explique, et qui
     * grandit vers les bords. La matrice de l'écran, elle, est exacte quelle que
     * soit la mise en page.
     */
    function auDoigt(ev) {
        const svg = container.querySelector('.lp-svg');
        if (!svg || !svg.getScreenCTM) return null;
        const ctm = svg.getScreenCTM();
        if (!ctm) return null;
        const p = svg.createSVGPoint();
        p.x = ev.clientX; p.y = ev.clientY;
        const u = p.matrixTransform(ctm.inverse()).x;
        return (u - LOUPE_GEO.G) / ((LOUPE_GEO.D - LOUPE_GEO.G) / 100);
    }

    /** Pose le verre à `c` centièmes, arrondi au cran et borné à la droite. */
    function poser(c) {
        if (fini || destroyed || c === null || !Number.isFinite(c)) return;
        const avant = centre;
        centre = Math.max(0, Math.min(100, Math.round(c)));
        // ON NE REDESSINE QUE SI LE CRAN A CHANGÉ. Un doigt qui glisse émet un
        // événement tous les quelques pixels ; reconstruire le dessin à chaque
        // fois alors que le verre n'a pas bougé d'un cran, c'est cent dessins
        // pour rien et un glissé qui accroche.
        if (centre !== avant) peindre();
    }

    function brancherLeGeste() {
        const plan = container.querySelector('[data-plan]');
        if (!plan) return;

        // LES ÉCOUTEURS DU GLISSÉ VIVENT SUR `window`, PAS SUR LE DESSIN.
        // `peindre()` remplace le `<svg>` en entier : un écouteur posé dessus
        // disparaîtrait au premier cran franchi, et le glissé s'arrêterait tout
        // seul après un pixel. `setPointerCapture` aurait le même sort.
        const bouge = (ev) => {
            if (destroyed) { lache(); return; }
            if (!tient) return;
            ev.preventDefault();
            poser(auDoigt(ev));
        };
        const lache = () => {
            if (!tient) return;
            tient = false;
            window.removeEventListener('pointermove', bouge);
            window.removeEventListener('pointerup', lache);
            window.removeEventListener('pointercancel', lache);
            peindre();
        };

        plan.onpointerdown = (ev) => {
            if (fini || session.locked) return;
            tient = true;
            poser(auDoigt(ev));
            peindre();
            window.addEventListener('pointermove', bouge, { passive: false });
            window.addEventListener('pointerup', lache);
            window.addEventListener('pointercancel', lache);
        };
        // `touch-action: none` EST DANS LE CSS, et il est indispensable : sans
        // lui le navigateur décide que ce glissé horizontal est un défilement de
        // page, prend la main, et le verre ne bouge plus du tout.
        plan.onkeydown = (ev) => {
            const d = { ArrowLeft: -1, ArrowRight: 1, Home: -100, End: 100 }[ev.key];
            if (d === undefined) return;
            ev.preventDefault();
            poser(centre + d);
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LE DESSIN
    // ─────────────────────────────────────────────────────────────────────────

    function peindre() {
        const plan = container.querySelector('[data-plan]');
        if (plan) {
            const e = item.meta.entier;
            plan.innerHTML = loupeSvg({
                gauche: String(e), droite: String(e + 1),
                croix: item.meta.croix, centre,
                nombre: (c) => fr(e + c / 100, 1)
            });
            plan.setAttribute('aria-valuenow', String(centre));
            plan.setAttribute('aria-valuetext', `la loupe est sur ${fr(e + centre / 100, 2)}`);
            plan.classList.toggle('lp-plan--tenu', tient);
        }
        const aff = container.querySelector('[data-display]');
        if (aff) aff.textContent = saisie || ' ';
        const ok = container.querySelector('[data-valider]');
        if (ok) ok.disabled = fini || !saisie || session.locked;
        container.querySelectorAll('[data-pas]').forEach((b) => { b.disabled = fini; });
        const st = container.querySelector('.lp-statut');
        if (st) st.textContent = message;
    }

    function taper(touche) {
        if (fini || destroyed || session.locked) return;
        if (touche === '←') saisie = saisie.slice(0, -1);
        else if (touche === ',') { if (saisie && !saisie.includes(',')) saisie += ','; }
        else if (saisie.length < 8) saisie += touche;
        peindre();
    }

    function valider() {
        if (fini || !saisie || session.locked) return;
        fini = true;
        const result = session.submit(saisie);
        message = result.correct
            ? `${saisie} — c'est bien là que tombait la croix.`
            : `Tu as écrit ${saisie}. ${item.explanation}`;
        peindre();
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot fait glisser le verre jusqu'à la croix, puis écrit. */
    async function runDemo() {
        peindre();
        // IL GLISSE, IL NE SAUTE PAS. Une démonstration qui poserait le verre
        // d'un coup montrerait le résultat du geste et non le geste — et c'est
        // le geste qui est la leçon.
        const but = item.meta.croix;
        const n = 14;
        for (let k = 1; k <= n; k++) {
            if (destroyed) return;
            poser(centre + (but - centre) / (n - k + 1));
            await new Promise(r => regTimeout(r, 55));
        }
        await new Promise(r => regTimeout(r, 420));
        for (const c of String(item.answer)) {
            if (destroyed) return;
            taper(c);
            await new Promise(r => regTimeout(r, 180));
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
