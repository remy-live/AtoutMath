// Activité « Pose la Loupe » — on touche un intervalle, il devient la droite.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour le zoom, il faudrait que ce soit l'élève qui pose la loupe et
// gère le zoom quand il se rend compte que ca ne tombe pas encore juste. »
//
// ── LE GESTE, ET CE QU'IL AUTORISE ─────────────────────────────────────────
//
// On touche un intervalle : il devient la droite entière, et les deux nombres
// des bouts gagnent une décimale. On peut revenir en arrière. On peut zoomer
// trop. On peut zoomer sur le mauvais intervalle — et alors la croix n'y est
// pas, l'écran le dit, et rien ne se passe.
//
// CE DERNIER POINT EST LE PLUS IMPORTANT. « Il se rend compte que ça ne tombe
// pas encore juste » suppose qu'il PUISSE se tromper sans être puni : toucher
// un mauvais intervalle n'est pas une faute comptée, c'est une loupe mal posée
// qu'on repose. Ce qui est jugé, c'est l'abscisse écrite — une seule fois, à la
// fin.
//
// ── POURQUOI UN PAVÉ À SOI, ET PAS CELUI DU DÉPÔT ──────────────────────────
//
// Le pavé de `numeric.js` est une ACTIVITÉ entière : il tient la session, les
// propositions, la démonstration, les outils. On ne peut pas l'ouvrir au milieu
// d'une autre. On réécrit donc le clavier — vingt lignes — mais AVEC SES
// CLASSES (`numpad-device`, `numpad-key`, `numpad-screen`) : même dessin, même
// taille de touche, mêmes sondes. Un clavier qui ressemblerait à un autre
// clavier serait une deuxième chose à apprendre.
//
// ── CE QUI N'EST PAS DIT, ET POURQUOI ──────────────────────────────────────
//
// L'écran ne dit JAMAIS « c'est bon, tu peux lire ». Ce serait corriger avant
// l'heure, et le savoir du jour est précisément de RECONNAÎTRE qu'une croix
// tombe sur une graduation. On montre donc la droite, et rien d'autre.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { loupeSvg } from '../figures.js';

const CHIFFRES = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

/** Un nombre à la française, à `rang` décimales, sans zéro inutile. */
const fr = (v, rang) => v.toFixed(rang)
    .replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace('.', ',');

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** La pile des zooms : chaque entrée est `{ debut, rang }`. */
    let pile = [];
    let saisie = '';
    let fini = false;
    let message = '';

    const niveau = () => pile[pile.length - 1];

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(prochain) {
        item = prochain;
        // AU DÉPART : la droite des entiers, de `entier` à `entier + 1`.
        pile = [{ debut: item.meta.entier, rang: 0 }];
        saisie = '';
        fini = false;
        message = '';

        container.innerHTML = `
            <div class="lp-layout">
                <div class="lp-context">${item.prompt.html}</div>
                <div class="lp-plan"></div>
                <div class="lp-barre">
                    <button type="button" class="lp-btn" data-revenir>↶ Dézoomer</button>
                    <span class="lp-niveau" role="status" aria-live="polite"></span>
                </div>
                <div class="lp-statut" role="status" aria-live="polite"></div>
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
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        container.querySelectorAll('[data-touche]').forEach((b) => {
            b.onclick = () => taper(b.getAttribute('data-touche'));
        });
        container.querySelector('[data-valider]').onclick = valider;
        container.querySelector('[data-revenir]').onclick = dezoomer;
        peindre();
    }

    /** Les deux bouts du niveau courant, en nombres. */
    function bouts() {
        const n = niveau();
        const large = Math.pow(10, -n.rang);
        return { gauche: n.debut, droite: Number((n.debut + large).toFixed(n.rang + 1)) };
    }

    /** Où tombe la croix sur le niveau courant, de 0 à 10. */
    function place() {
        const n = niveau();
        const { gauche, droite } = bouts();
        const v = item.meta.valeur;
        if (v < gauche || v > droite) return null;
        return Number(((v - gauche) / (droite - gauche) * 10).toFixed(n.rang + 2));
    }

    function peindre() {
        const n = niveau();
        const { gauche, droite } = bouts();
        const plan = container.querySelector('.lp-plan');
        if (plan) {
            plan.innerHTML = loupeSvg({
                gauche: fr(gauche, n.rang), droite: fr(droite, n.rang),
                place: place(), zones: !fini
            });
            if (!fini) brancherZones();
        }
        const niv = container.querySelector('.lp-niveau');
        if (niv) {
            niv.textContent = pile.length === 1
                ? 'Droite de départ'
                : `${pile.length - 1} zoom${pile.length > 2 ? 's' : ''}`;
        }
        const rev = container.querySelector('[data-revenir]');
        if (rev) rev.disabled = fini || pile.length === 1;
        const aff = container.querySelector('[data-display]');
        if (aff) aff.textContent = saisie || ' ';
        const ok = container.querySelector('[data-valider]');
        if (ok) ok.disabled = fini || !saisie || session.locked;
        const st = container.querySelector('.lp-statut');
        if (st) st.textContent = message;
    }

    function brancherZones() {
        container.querySelectorAll('[data-zone]').forEach((g) => {
            const i = Number(g.getAttribute('data-zone'));
            // `onclick` SUR UN GROUPE SVG MARCHE : un élément SVG n'a pas de
            // MÉTHODE `click()` — elle vit sur `HTMLElement` —, mais
            // l'événement du navigateur part bien du doigt. C'est une sonde qui
            // s'y était trompée, pas le logiciel.
            g.onclick = () => zoomer(i);
            g.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoomer(i); }
            };
        });
    }

    function zoomer(i) {
        if (fini || destroyed || session.locked) return;
        const n = niveau();
        const large = Math.pow(10, -n.rang);
        const debut = Number((n.debut + i * large / 10).toFixed(n.rang + 1));
        const fin = Number((debut + large / 10).toFixed(n.rang + 1));
        const v = item.meta.valeur;
        if (v < debut || v > fin) {
            // ON NE COMPTE PAS CELA COMME UNE FAUTE. Une loupe mal posée se
            // repose ; c'est le sens même de « il se rend compte que ça ne
            // tombe pas encore juste ».
            message = 'La croix n’est pas dans cet intervalle-là. Regarde bien '
                + 'entre quelles deux graduations elle se trouve.';
            peindre();
            return;
        }
        message = '';
        pile.push({ debut, rang: n.rang + 1 });
        peindre();
    }

    function dezoomer() {
        if (fini || pile.length === 1) return;
        pile.pop();
        message = '';
        peindre();
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
            ? `${saisie} — la croix tombait bien sur cette graduation.`
            : `Tu as écrit ${saisie}. ${item.explanation}`;
        peindre();
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot zoome au bon endroit, puis écrit la réponse. */
    async function runDemo() {
        peindre();
        for (let k = 0; k < item.meta.zooms; k++) {
            if (destroyed) return;
            const n = niveau();
            const large = Math.pow(10, -n.rang);
            const i = Math.floor(Number((((item.meta.valeur - n.debut) / large) * 10)
                .toFixed(6)));
            zoomer(Math.min(9, Math.max(0, i)));
            await new Promise(r => regTimeout(r, 620));
        }
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
