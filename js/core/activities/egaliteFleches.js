// L'ÉGALITÉ FLÉCHÉE — on écrit le facteur SUR les flèches.
//
// Rémy : « il faudrait rajouter une étape, celle de compléter le numérateur et
// le dénominateur. On laisse les flèches, l'élève doit taper dans les cases des
// flèches par quoi il doit diviser ou multiplier, et après on met la réponse. »
//
// LA FIGURE DEVIENT LA COPIE. Le pavé numérique posait la réponse dans un écran
// noir, à l'autre bout de l'écran : l'élève tapait « 11 » sans que rien ne dise
// OÙ ce 11 s'écrit. Ici il l'écrit à sa place — sur l'arc, entre les deux
// numérateurs —, et c'est exactement le geste du cahier.
//
// DEUX CASES SUR LES FLÈCHES, ET C'EST LA RÈGLE, PAS UNE CORVÉE. Les deux arcs
// portent le même nombre : le faire écrire deux fois est précisément ce qu'on
// veut installer. Un élève qui n'en remplit qu'un s'entend dire pourquoi il en
// manque un.
//
// LA SECONDE ÉTAPE AJOUTE UNE CASE, PAS UN ÉCRAN. Le nombre qui manque à droite
// devient lui aussi une case, dans la fraction, à sa place. La figure ne change
// pas entre les deux étapes — un geste de plus, voilà tout, et c'est le pas qui
// sépare « je vois le facteur » de « je sais m'en servir ».
//
// (Préfixe `fe-` : il est déjà celui des arcs dans `css/modules.css`.)

import { hintBar, wireHint } from './choice.js';
import { egaliteFlecheeHtml } from '../fractionsEquivalentes.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

/** Les touches, dans l'ordre où on les lit — pas celui d'une calculatrice. */
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/** Trois chiffres suffisent : au-delà, ce n'est plus un facteur, c'est un appui resté enfoncé. */
const MAX_CHIFFRES = 3;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let item = null;
    let cases = null;
    let cursor = null;
    let gate = null;

    /** Les cases à remplir, dans l'ordre où on les visite. */
    const aRemplir = () => (item.meta.complete ? ['haut', 'bas', 'trou'] : ['haut', 'bas']);

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        if (opts.rendreLaMain && opts.rendreLaMain(item)) return;
        demarrer();
    }

    function demarrer() {
        cases = { haut: '', bas: '', trou: '', actif: 'haut' };
        render();
        if (session.isDemo && !session.frozen) runDemo();
    }

    // --- Le dessin -------------------------------------------------------------

    function figureHtml() {
        const m = item.meta;
        return egaliteFlecheeHtml({
            gauche: m.gauche, droite: m.droite, signe: m.signe,
            trou: m.complete ? m.trou : null,
            cases
        });
    }

    function render() {
        const pret = aRemplir().every(k => cases[k] !== '');
        container.innerHTML = `
            <div class="fe-scene">
                <div class="game-question">${item.prompt.consigne || ''}</div>
                <div class="fe-fig" data-fig>${figureHtml()}</div>
                <p class="fe-note" data-note role="status"></p>
                <div class="fe-pave" role="group" aria-label="Chiffres">
                    ${DIGITS.map(k => `<button type="button" class="fe-touche"
                        data-touche="${k}">${k}</button>`).join('')}
                    <button type="button" class="fe-touche fe-touche--del" data-touche="←"
                        aria-label="Effacer">⌫</button>
                    <button type="button" class="fe-touche fe-touche--ok" data-valider
                        ${pret ? '' : 'disabled'}>Valider</button>
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
        el.classList.remove('fe-fig--non');
        void el.offsetWidth;
        el.classList.add('fe-fig--non');
    }

    // --- Les gestes ------------------------------------------------------------

    function brancher() {
        container.querySelectorAll('[data-case]').forEach(b => {
            b.onclick = () => {
                if (session.locked) return;
                cases.actif = b.dataset.case;
                render();
            };
        });
        container.querySelectorAll('[data-touche]').forEach(b => {
            b.onclick = () => taper(b.dataset.touche);
        });
        const v = container.querySelector('[data-valider]');
        if (v) v.onclick = valider;

        container.tabIndex = -1;
        container.onkeydown = (ev) => {
            if (session.locked) return;
            if (/^[0-9]$/.test(ev.key)) { ev.preventDefault(); return taper(ev.key); }
            if (ev.key === 'Backspace') { ev.preventDefault(); return taper('←'); }
            if (ev.key === 'Enter') { ev.preventDefault(); return valider(); }
            if (ev.key === 'Tab') {
                // Passer d'une case à l'autre sans quitter la figure.
                ev.preventDefault();
                const l = aRemplir();
                const i = l.indexOf(cases.actif);
                cases.actif = l[(i + (ev.shiftKey ? l.length - 1 : 1)) % l.length];
                render();
            }
        };
    }

    function taper(k) {
        if (session.locked || !cases) return;
        const cle = cases.actif;
        if (k === '←') cases[cle] = String(cases[cle]).slice(0, -1);
        else cases[cle] = (String(cases[cle]) + k).slice(0, MAX_CHIFFRES);
        // ON PASSE À LA CASE SUIVANTE TOUT SEUL quand celle-ci tient déjà deux
        // chiffres et que la suivante est vide : c'est le cas ordinaire, et
        // revenir la chercher du doigt pour rien fait perdre du temps. On y
        // revient en la touchant.
        if (k !== '←' && cases[cle].length >= 2) {
            const l = aRemplir();
            const suivante = l[l.indexOf(cle) + 1];
            if (suivante && !cases[suivante]) cases.actif = suivante;
        }
        note('');
        render();
    }

    /**
     * CE QUI NE VA PAS, NOMMÉ — et dans l'ordre où on le regarde.
     *
     * Les trois fautes de cette figure ne sont pas la même erreur. Écrire deux
     * nombres différents sur les deux arcs, c'est ignorer la règle ; écrire le
     * même mais le mauvais, c'est avoir mal lu la ligne ; avoir le bon facteur
     * et rater le nombre, c'est une table de multiplication. Un « faux » unique
     * les confond toutes les trois.
     */
    function diagnostic() {
        const m = item.meta;
        const f = String(m.facteur);
        if (cases.haut !== cases.bas) {
            return 'Les deux flèches portent le MÊME nombre : c’est ce qui fait qu’une '
                + 'fraction ne change pas de valeur.';
        }
        if (cases.haut !== f) {
            const [de, a] = m.trou === 'numerateur'
                ? [m.gauche.d, m.droite.d] : [m.gauche.n, m.droite.n];
            return `Regarde la ligne écrite des deux côtés : on y passe de ${de} à ${a}.`;
        }
        if (m.complete && cases.trou !== String(m.manquant)) {
            const [de, mot] = m.trou === 'numerateur'
                ? [m.gauche.n, 'numérateur'] : [m.gauche.d, 'dénominateur'];
            return `Le facteur est bon. Applique-le à l’autre ligne : ${de} ${m.signe} ${f} `
                + `donne le ${mot}.`;
        }
        return '';
    }

    function valider() {
        if (destroyed || session.locked) return;
        if (!aRemplir().every(k => cases[k] !== '')) return;
        const m = item.meta;
        // CE QU'ON ENVOIE EST CE QU'ON A ÉCRIT. À la première étape, la réponse
        // attendue est un nombre : on n'envoie donc le facteur que si les deux
        // arcs s'accordent — sinon la réponse EST le désaccord, et elle est
        // fausse pour la bonne raison.
        const donnee = m.complete
            ? `${cases.haut}/${cases.bas}/${cases.trou}`
            : (cases.haut === cases.bas ? cases.haut : `${cases.haut}·${cases.bas}`);
        const misconception = diagnostic();
        const result = session.submit(donnee, {
            element: container.querySelector('[data-fig]'),
            ...(misconception ? { misconception } : {})
        });
        if (result.ignored) return;
        if (!result.correct) { note(misconception); secouer(); }

        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) return renderNext();
            if (result.revealed) {
                // La correction montre la figure remplie : c'est elle qu'on
                // relira, pas un nombre au bas de l'écran.
                cases = {
                    haut: String(m.facteur), bas: String(m.facteur),
                    trou: String(m.manquant), actif: null
                };
                render();
                setTimeout(() => { if (!destroyed) renderNext(); }, 1800);
                return;
            }
            cases = { haut: '', bas: '', trou: '', actif: 'haut' };
            note('');
            render();
        });
    }

    // --- Le robot --------------------------------------------------------------

    async function appuyer(selecteur, action) {
        const el = container.querySelector(selecteur);
        if (!el || destroyed) return false;
        if (!await cursor.tap(el, DEMO_SPEED.move)) return false;
        if (destroyed) return false;
        action();
        return !destroyed;
    }

    async function ecrire(nombre) {
        for (const c of String(nombre)) {
            if (!await appuyer(`[data-touche="${c}"]`, () => taper(c))) return false;
        }
        return true;
    }

    /** Le robot écrit le facteur sur les deux arcs, puis complète. */
    async function runDemo() {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const m = item.meta;
        const souffler = (ms) => cursor.pause(ms);
        const vise = (s) => container.querySelector(s);

        if (!await gate.waitTurn() || destroyed) return;
        if (!await souffler(600) || destroyed) return;
        const [de, a] = m.trou === 'numerateur'
            ? [m.gauche.d, m.droite.d] : [m.gauche.n, m.droite.n];
        cursor.say(`Une ligne est écrite des deux côtés : de ${de} à ${a}.`, vise('[data-fig]'));
        if (!await souffler(DEMO_SPEED.settle) || destroyed) return;

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say(`${de} ${m.signe} ${m.facteur} = ${a} : je l’écris sur la flèche.`,
            vise('[data-case="haut"]'));
        if (!await souffler(DEMO_SPEED.settle) || destroyed) return;
        if (cases.actif !== 'haut' && !await appuyer('[data-case="haut"]',
            () => { cases.actif = 'haut'; render(); })) return;
        if (!await ecrire(m.facteur)) return;

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say('L’autre flèche porte le MÊME nombre.', vise('[data-case="bas"]'));
        if (!await souffler(DEMO_SPEED.settle) || destroyed) return;
        if (cases.actif !== 'bas' && !await appuyer('[data-case="bas"]',
            () => { cases.actif = 'bas'; render(); })) return;
        if (!await ecrire(m.facteur)) return;

        if (m.complete) {
            const [depuis, mot] = m.trou === 'numerateur'
                ? [m.gauche.n, 'numérateur'] : [m.gauche.d, 'dénominateur'];
            if (!await gate.waitTurn() || destroyed) return;
            cursor.say(`Et le ${mot} suit : ${depuis} ${m.signe} ${m.facteur} = ${m.manquant}.`,
                vise('[data-case="trou"]'));
            if (!await souffler(DEMO_SPEED.settle) || destroyed) return;
            if (cases.actif !== 'trou' && !await appuyer('[data-case="trou"]',
                () => { cases.actif = 'trou'; render(); })) return;
            if (!await ecrire(m.manquant)) return;
        }

        // Le robot ne valide pas : une démonstration ne répond pas à la place
        // de l'élève. Elle s'arrête sur la figure remplie, qui est la leçon.
        if (!await gate.waitTurn() || destroyed) return;
        cursor.say('Les deux flèches portent le même nombre : la fraction ne change pas.',
            vise('[data-fig]'));
        if (!await souffler(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    if (opts.item) { item = opts.item; demarrer(); } else renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        montrerSolution() {
            if (!item) return;
            cases = {
                haut: String(item.meta.facteur), bas: String(item.meta.facteur),
                trou: String(item.meta.manquant), actif: null
            };
            render();
        },
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
