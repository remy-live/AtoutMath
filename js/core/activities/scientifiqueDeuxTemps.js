// L'ÉCRITURE SCIENTIFIQUE EN DEUX TEMPS — à l'écran, comme au cahier.
//
// RÉMY, 26 novembre : « on a 134 × 10⁵, on met d'abord 134 sous forme
// scientifique en laissant le 10⁵, puis après on applique la règle des
// puissances pour avoir à la fin 1,34 × 10⁷ ».
//
//        134 × 10⁵
//     =  [ 1,34 ] × 10^[ 2 ] × 10⁵      ← premier temps : 134 seul
//     =    1,34   × 10^[ 7 ]            ← second temps : la règle
//
// TROIS CASES, ET PAS UNE DE PLUS. Le 10⁵ de la ligne du milieu est ÉCRIT,
// pas à remplir : « en laissant le 10⁵ », c'est précisément qu'on n'y touche
// pas. Et la mantisse de la dernière ligne se RECOPIE toute seule depuis la
// ligne du milieu : la règle des puissances ne la change pas, et la faire
// retaper ne mesurerait qu'une recopie.
//
// LE DIAGNOSTIC DIT LA LIGNE. Une réponse fausse n'est pas « 1,34 × 10⁷ ou
// rien » : la ligne 2 peut être juste et la 3 fausse — la faute de Rémy,
// 1,34 × 10⁵ —, ou l'inverse. La ligne fautive se marque, et la phrase dit
// pourquoi (voir `juger` dans core/scientifiqueDeuxTemps.js).

import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { meneurDemo } from '../meneurDemo.js';
import { dessinerExposants, puissanceTexte } from '../puissances.js';
import { juger, saisieDe, relatif } from '../scientifiqueDeuxTemps.js';

const CHIFFRES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const ORDRE = ['mantisse', 'p', 'final'];
/** Assez pour 3,5937 et pour −12 ; au-delà, c'est un doigt resté appuyé. */
const LONGUEUR = { mantisse: 7, p: 3, final: 3 };

const STYLE = `
<style>
    .sd-scene { display: flex; flex-direction: column; gap: 12px; align-items: center; width: 100%; }
    .sd-lignes {
        display: grid; grid-template-columns: auto auto; column-gap: 10px; row-gap: 10px;
        align-items: center; justify-content: center;
        font-size: clamp(1.25rem, 5.2vw, 2rem); font-weight: 800; font-variant-numeric: tabular-nums;
        padding: 14px clamp(10px, 3vw, 22px); border-radius: 18px;
        background: var(--bg-panel, #fff); border: 2px solid var(--border, #e2e8f0);
    }
    .sd-egal { color: var(--text-muted, #64748b); justify-self: end; }
    /* PAS DE FLEX ICI, ET C'EST CE QUI TIENT LES EXPOSANTS EN L'AIR. Rémy :
       « parfois tes exposants sont un peu décalés ». Une ligne en flex centrée
       faisait de chaque <sup> un élément aligné AU MILIEU : le 8 de
       « 65 400 × 10⁸ » tombait à hauteur des chiffres. En ligne, il garde
       son exposant. */
    .sd-expr { display: inline-block; white-space: nowrap; line-height: 1.6; }
    .sd-expr sup { font-size: .62em; vertical-align: super; line-height: 0; }
    .sd-expr.sd-ligne--ko { outline: 3px solid var(--danger, #dc2626); outline-offset: 2px; border-radius: 10px; }
    .sd-donne { color: var(--text-muted, #64748b); }
    .sd-case {
        vertical-align: middle;
        min-width: 2.6em; min-height: 1.5em; padding: 0 .3em; border-radius: 10px;
        border: 2px dashed var(--primary, #4f46e5); background: var(--bg-hover, #f8fafc);
        color: var(--text-main, #0f172a); font: inherit; cursor: pointer; line-height: 1.4;
    }
    .sd-case--actif { border-style: solid; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #4f46e5) 30%, transparent); }
    .sd-case--plein { border-style: solid; }
    .sd-puiss { white-space: nowrap; }
    /* La CASE de l'exposant se pose là où s'écrit un exposant : petite, en haut. */
    .sd-puiss .sd-case { min-width: 1.9em; font-size: .62em; vertical-align: super; margin-left: .05em; }
    .sd-recopie { color: var(--text-muted, #64748b); }
    .sd-quoi {
        grid-column: 2; font-size: .82rem; font-weight: 600; color: var(--text-muted, #64748b);
        margin-top: -6px;
    }
    .sd-note { min-height: 1.4em; margin: 0; text-align: center; font-weight: 700; color: var(--danger, #b91c1c); max-width: 46ch; }
    .sd-pave { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; width: min(100%, 420px); }
    .sd-touche {
        height: clamp(40px, 7vh, 54px); border-radius: 12px; border: 1px solid var(--border, #cbd5e1);
        background: var(--bg-panel, #fff); color: var(--text-main, #0f172a);
        font: inherit; font-size: 1.25rem; font-weight: 800; cursor: pointer;
    }
    .sd-touche--ok { grid-column: span 2; background: var(--primary, #4f46e5); color: #fff; border: 0; }
    .sd-touche--ok:disabled { opacity: .45; cursor: default; }
    .sd-touche:focus-visible, .sd-case:focus-visible { outline: 3px solid var(--primary, #4f46e5); outline-offset: 2px; }
    .sd-lignes--non { animation: sd-non .3s; }
    @keyframes sd-non { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
    @media (prefers-reduced-motion: reduce) { .sd-lignes--non { animation: none; } }
</style>`;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let item = null;
    let cases = null;
    let fautive = 0;
    let cursor = null;
    let gate = null;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        if (opts.rendreLaMain && opts.rendreLaMain(item)) return;
        demarrer();
    }

    function demarrer() {
        cases = { mantisse: '', p: '', final: '', actif: 'mantisse' };
        fautive = 0;
        render();
        if (session.isDemo && !session.frozen) runDemo();
    }

    const q = () => item.meta.deuxTemps;
    const lisible = (v) => String(v || '').replace(/-/g, '−');

    function caseHtml(cle, etiquette) {
        const v = cases[cle];
        const cls = ['sd-case', v ? 'sd-case--plein' : '', cases.actif === cle ? 'sd-case--actif' : '']
            .filter(Boolean).join(' ');
        return `<button type="button" class="${cls}" data-case="${cle}" aria-label="${etiquette}">${
            v ? lisible(v) : '&nbsp;'}</button>`;
    }

    function lignesHtml() {
        const d = q();
        const recopie = cases.mantisse ? lisible(cases.mantisse) : '…';
        return `
            <div class="sd-lignes" data-fig role="group" aria-label="Le calcul, ligne par ligne">
                <span></span>
                <span class="sd-expr sd-donne">${dessinerExposants(`${d.aGroupe} × ${puissanceTexte(d.n)}`)}</span>
                <span class="sd-egal">=</span>
                <span class="sd-expr${fautive === 2 ? ' sd-ligne--ko' : ''}" data-ligne="2">
                    ${caseHtml('mantisse', `${d.aGroupe} en écriture scientifique : le nombre devant`)}
                    × <span class="sd-puiss">10${caseHtml('p', 'son exposant')}</span>
                    × ${dessinerExposants(puissanceTexte(d.n))}
                </span>
                <span class="sd-quoi">J'écris ${d.aGroupe} en écriture scientifique, et je garde ${dessinerExposants(puissanceTexte(d.n))}.</span>
                <span class="sd-egal">=</span>
                <span class="sd-expr${fautive === 3 ? ' sd-ligne--ko' : ''}" data-ligne="3">
                    <span class="sd-recopie">${recopie}</span>
                    × <span class="sd-puiss">10${caseHtml('final', 'l\'exposant final')}</span>
                </span>
                <span class="sd-quoi">J'applique la règle : un produit de puissances de 10 ajoute les exposants.</span>
            </div>`;
    }

    function render() {
        const pret = ORDRE.every(k => cases[k] !== '');
        container.innerHTML = `${STYLE}
            <div class="sd-scene">
                ${item.prompt.html || ''}
                ${lignesHtml()}
                <p class="sd-note" data-note role="status"></p>
                <div class="sd-pave" role="group" aria-label="Pavé">
                    ${CHIFFRES.map(k => `<button type="button" class="sd-touche" data-touche="${k}">${k}</button>`).join('')}
                    <button type="button" class="sd-touche" data-touche="," aria-label="Virgule">,</button>
                    <button type="button" class="sd-touche" data-touche="-" aria-label="Signe moins">−</button>
                    <button type="button" class="sd-touche" data-touche="←" aria-label="Effacer">⌫</button>
                    <button type="button" class="sd-touche sd-touche--ok" data-valider ${pret ? '' : 'disabled'}>Valider</button>
                </div>
            </div>
            ${hintBar(item)}`;
        wireHint(container, item, session);
        brancher();
    }

    const note = (texte) => {
        const el = container.querySelector('[data-note]');
        if (el) el.textContent = texte || '';
    };

    function secouer() {
        const el = container.querySelector('[data-fig]');
        if (!el) return;
        el.classList.remove('sd-lignes--non');
        void el.offsetWidth;
        el.classList.add('sd-lignes--non');
    }

    function brancher() {
        container.querySelectorAll('[data-case]').forEach(b => {
            b.onclick = () => {
                if (session.locked) return;
                cases.actif = b.dataset.case;
                render();
            };
        });
        container.querySelectorAll('[data-touche]').forEach(b => { b.onclick = () => taper(b.dataset.touche); });
        const v = container.querySelector('[data-valider]');
        if (v) v.onclick = valider;
        container.tabIndex = -1;
        container.onkeydown = (ev) => {
            if (session.locked) return;
            if (/^[0-9]$/.test(ev.key)) { ev.preventDefault(); return taper(ev.key); }
            if (ev.key === ',' || ev.key === '.') { ev.preventDefault(); return taper(','); }
            if (ev.key === '-' || ev.key === '−') { ev.preventDefault(); return taper('-'); }
            if (ev.key === 'Backspace') { ev.preventDefault(); return taper('←'); }
            if (ev.key === 'Enter') {
                ev.preventDefault();
                // Entrée passe à la case suivante tant qu'il en reste une vide.
                const vide = ORDRE.find(k => cases[k] === '');
                if (vide) { cases.actif = vide; return render(); }
                return valider();
            }
            if (ev.key === 'Tab') {
                ev.preventDefault();
                const i = ORDRE.indexOf(cases.actif);
                cases.actif = ORDRE[(i + (ev.shiftKey ? ORDRE.length - 1 : 1)) % ORDRE.length];
                render();
            }
        };
    }

    /**
     * UNE TOUCHE. La virgule ne va que dans la mantisse ; le signe moins ne va
     * que devant un exposant, et il s'y BASCULE — on le met ou on l'enlève —
     * parce que c'est ainsi qu'on corrige un signe, sans tout effacer.
     */
    function taper(k) {
        if (session.locked || !cases || !cases.actif) return;
        const cle = cases.actif;
        let v = String(cases[cle]);
        if (k === '←') v = v.slice(0, -1);
        else if (k === ',') { if (cle !== 'mantisse' || v.includes(',')) return; v = (v || '0') + ','; }
        else if (k === '-') { if (cle === 'mantisse') return; v = v.startsWith('-') ? v.slice(1) : `-${v}`; }
        else v = (v + k).slice(0, LONGUEUR[cle]);
        cases[cle] = v;
        fautive = 0;
        note('');
        render();
    }

    function valider() {
        if (destroyed || session.locked) return;
        if (!ORDRE.every(k => cases[k] !== '' && cases[k] !== '-')) return;
        const verdict = juger(q(), cases);
        const result = session.submit(saisieDe(cases), {
            element: container.querySelector('[data-fig]'),
            ...(verdict.juste ? {} : { misconception: verdict.pourquoi })
        });
        if (result.ignored) return;
        if (!result.correct) {
            // ON MARQUE LA LIGNE SANS REDESSINER. La carte « Ce n'est pas ça »
            // vient de se poser DANS ce conteneur : un `render()` ici l'effaçait
            // aussitôt, et la suite — qui attend qu'on la ferme — n'arrivait
            // jamais. Vu par la sonde : la ligne marquée, la phrase écrite, et
            // plus rien ne bougeait.
            fautive = verdict.ligne;
            const ligne = container.querySelector(`[data-ligne="${verdict.ligne}"]`);
            if (ligne) ligne.classList.add('sd-ligne--ko');
            note(verdict.pourquoi);
            secouer();
        }
        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) return renderNext();
            if (result.revealed) {
                // La correction montre les lignes REMPLIES : c'est elles qu'on
                // relira, pas une phrase au bas de l'écran.
                remplir();
                setTimeout(() => { if (!destroyed) renderNext(); }, 2200);
                return;
            }
            // On garde ce qui était juste : la ligne 2 bonne ne se retape pas.
            if (verdict.ligne === 3) cases = { ...cases, final: '', actif: 'final' };
            else cases = { mantisse: '', p: '', final: '', actif: 'mantisse' };
            fautive = 0;
            render();
            note(verdict.pourquoi);
        });
    }

    function remplir() {
        const d = q();
        cases = { mantisse: d.mantisse, p: String(d.p), final: String(d.final), actif: null };
        fautive = 0;
        render();
    }

    // --- Le robot --------------------------------------------------------------

    async function appuyer(selecteur, action) {
        const el = container.querySelector(selecteur);
        if (!el || destroyed) return false;
        const robot = meneurDemo(cursor, gate, () => !destroyed, null, { rangementSeul: true });
        if (!await robot.toucher(el, DEMO_SPEED.move)) return false;
        if (destroyed) return false;
        action();
        return !destroyed;
    }

    async function ecrire(cle, texte) {
        if (cases.actif !== cle && !await appuyer(`[data-case="${cle}"]`, () => { cases.actif = cle; render(); })) return false;
        for (const c of String(texte)) {
            if (!await appuyer(`[data-touche="${c}"]`, () => taper(c))) return false;
        }
        return true;
    }

    /** Le robot écrit les deux temps, en disant chaque fois ce qu'il fait. Il ne valide pas. */
    async function runDemo() {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const robot = meneurDemo(cursor, gate, () => !destroyed, null, { rangementSeul: true });
        const d = q();
        const vise = (s) => container.querySelector(s);
        const souffle = (ms) => robot.pause(ms);
        const n = puissanceTexte(d.n), p = puissanceTexte(d.p);

        if (!await robot.tour()) return;
        cursor.say(`D'abord ${d.aGroupe} tout seul, sans toucher au ${n}.`, vise('[data-ligne="2"]'));
        if (!await souffle(DEMO_SPEED.settle)) return;
        if (!await robot.tour()) return;
        cursor.say(`La virgule après le premier chiffre : ${d.mantisse}.`, vise('[data-case="mantisse"]'));
        if (!await ecrire('mantisse', d.mantisse)) return;
        if (!await robot.tour()) return;
        cursor.say(d.p > 0
            ? `${d.aGroupe} est plus grand que 1 : ${d.aGroupe} = ${d.mantisse} × ${p}.`
            : `${d.aGroupe} est plus petit que 1 : l'exposant est négatif, ${p}.`, vise('[data-case="p"]'));
        if (!await ecrire('p', String(d.p))) return;
        if (!await robot.tour()) return;
        cursor.say(`Puis la règle : ${p} × ${n}, on ajoute ${relatif(d.p)} et ${relatif(d.n)}.`, vise('[data-case="final"]'));
        if (!await ecrire('final', String(d.final))) return;
        if (!await robot.tour()) return;
        cursor.say(`${d.aGroupe} × ${n} = ${d.mantisse} × ${puissanceTexte(d.final)}.`, vise('[data-fig]'));
        if (!await souffle(DEMO_SPEED.between)) return;
        renderNext();
    }

    if (opts.item) { item = opts.item; demarrer(); } else renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        montrerSolution() { if (item) remplir(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.onkeydown = null;
            container.innerHTML = '';
            session.finish();
        }
    };
}
