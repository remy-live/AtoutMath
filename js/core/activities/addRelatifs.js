// ADDITIONNER DES RELATIFS — le tableau de pastilles, et l'écriture qui se
// simplifie sous les yeux.
//
// L'activité voisine (relatifs.js) montre un DÉPLACEMENT : l'ascenseur, le
// thermomètre, la droite graduée. Elle répond à « qu'est-ce qu'un nombre
// négatif ». Celle-ci répond à la question d'après, qui n'était traitée nulle
// part : « pourquoi (+7) + (−3) s'écrit 7 − 3, et pourquoi ça fait 4 ».
//
// Deux gestes portent tout :
//
//   LE TABLEAU À DEUX COLONNES — rouge pour les positifs, bleu pour les
//   négatifs. Quand tout est du même côté, il n'y a qu'à compter ; c'est le
//   temps A, et il sert à installer l'écriture sans rien d'autre à penser.
//
//   L'ÉLIMINATION DES PAIRES — une rouge et une bleue s'avancent l'une vers
//   l'autre et disparaissent ensemble. C'est LE moment du chapitre : la
//   soustraction n'est pas décrétée, elle se voit. L'animation est lente
//   exprès, et on élimine une paire à gauche, une à droite, comme sur un
//   tableau de classe.
//
// Les questions viennent de generators/relatifsAddition.js, testé sans DOM.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint, wireShowMe } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

/** Un nombre à la française : virgule décimale, vrai signe moins. */
const fmt = (v) => String(Math.round(v * 10) / 10).replace('-', '−').replace('.', ',');

export function mount(container, session) {
    let destroyed = false;
    let cursor = null, gate = null;
    let item = null, etat = null;
    // Le pavé de la question courante, pour que la démonstration puisse taper
    // dessus : le curseur du robot n'émet pas de vrais clics, et un robot qui
    // mime la frappe sur un afficheur resté à « ? » ne montre rien.
    let pave = null;
    const nettoyeurs = [];

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(courant) {
        item = courant;
        nettoyeurs.forEach(f => f());
        nettoyeurs.length = 0;
        const m = item.meta;

        etat = {
            a: m.a, b: m.b, total: m.total,
            modele: m.modele, question: m.question,
            decimal: !!m.decimal,
            elimines: 0,
            fige: false
        };

        const clavier = item.answerKind === 'choice'
            ? `<div class="ad-choix">${item.choices.map((c, i) =>
                `<button type="button" class="ad-choix-btn" data-choix="${i}">${c.label}</button>`).join('')}</div>`
            : paveHtml(etat.decimal);

        container.innerHTML = `
            <div class="ad-layout">
                ${item.prompt.html}
                <div class="ad-etape">Marche ${m.rang} / ${m.total_etapes} · ${m.titre}</div>
                ${m.modele === 'pastilles' ? tableauHtml(m.a, m.b) : ''}
                <div class="ad-calcul" data-calcul></div>
                ${clavier}
                ${hintBar(session)}
            </div>`;

        majCalcul();
        brancher();

        if (session.isDemo) {
            // La démonstration REPART à chaque question. Lancée une seule fois
            // au montage, elle jouait la première marche puis se taisait pour
            // les onze suivantes : on regardait un robot immobile devant un
            // exercice qui, lui, continuait.
            if (!session.frozen) runDemo();
            return;
        }

        wireHint(container, session);
        wireShowMe(container, session, {
            enPage: true,
            message: m.modele === 'pastilles'
                ? 'Je forme les paires et je les élimine, une de chaque côté. Regarde ce qui reste.'
                : 'Je simplifie l\'écriture d\'abord, puis je calcule.',
            highlight: () => (m.modele === 'pastilles' ? animerElimination() : animerEcriture())
        });
    }

    // --- Le tableau de pastilles ---------------------------------------------

    function jetons(n, signe) {
        return Array.from({ length: n }, (_, i) =>
            `<span class="ad-jeton ad-jeton--${signe}" data-jeton="${signe}" data-rang="${i}">${signe === 'plus' ? '+' : '−'}</span>`
        ).join('');
    }

    // LES NÉGATIFS À GAUCHE, LES POSITIFS À DROITE — demande de Rémy, et elle
    // remet le tableau dans le sens de la droite graduée : à gauche de zéro les
    // nombres négatifs, à droite les positifs. Les deux colonnes étaient dans
    // l'ordre inverse, ce qui obligeait l'élève à retourner mentalement l'image
    // qu'on lui avait donnée du nombre relatif deux exercices plus tôt.
    function tableauHtml(a, b) {
        const plus = (a > 0 ? a : 0) + (b > 0 ? b : 0);
        const moins = (a < 0 ? -a : 0) + (b < 0 ? -b : 0);
        return `
            <div class="ad-tableau" data-tableau>
                <div class="ad-col ad-col--moins">
                    <div class="ad-col-titre">−</div>
                    <div class="ad-jetons" data-col="moins">${jetons(moins, 'moins')}</div>
                    <div class="ad-col-compte" data-compte="moins">${moins}</div>
                </div>
                <div class="ad-col ad-col--plus">
                    <div class="ad-col-titre">+</div>
                    <div class="ad-jetons" data-col="plus">${jetons(plus, 'plus')}</div>
                    <div class="ad-col-compte" data-compte="plus">${plus}</div>
                </div>
            </div>`;
    }

    /**
     * L'élimination, une paire à la fois. Lente, et volontairement : c'est le
     * seul endroit du chapitre où l'on VOIT pourquoi une soustraction apparaît,
     * et une animation rapide en ferait un effet de style.
     */
    function animerElimination() {
        const paires = Math.min(
            container.querySelectorAll('[data-col="plus"] .ad-jeton:not(.ad-jeton--parti)').length,
            container.querySelectorAll('[data-col="moins"] .ad-jeton:not(.ad-jeton--parti)').length
        );
        if (!paires) return Promise.resolve(true);
        etat.fige = true;
        return new Promise((resolve) => {
            let fait = 0;
            const suivant = () => {
                if (destroyed) return resolve(false);
                if (fait >= paires) {
                    etat.fige = false;
                    majCompte();
                    resolve(true);
                    return;
                }
                for (const col of ['plus', 'moins']) {
                    const j = container.querySelector(`[data-col="${col}"] .ad-jeton:not(.ad-jeton--parti)`);
                    if (j) { j.classList.add('ad-jeton--paire'); regTimeout(() => j.classList.add('ad-jeton--parti'), 420); }
                }
                fait++;
                etat.elimines = fait;
                majCompte();
                regTimeout(suivant, 620);
            };
            regTimeout(suivant, 320);
        });
    }

    function majCompte() {
        for (const col of ['plus', 'moins']) {
            const el = container.querySelector(`[data-compte="${col}"]`);
            if (!el) continue;
            el.textContent = container.querySelectorAll(
                `[data-col="${col}"] .ad-jeton:not(.ad-jeton--parti)`).length;
        }
    }

    /** L'écriture qui se simplifie : (+7) + (−3), puis 7 − 3. */
    function animerEcriture() {
        const el = container.querySelector('[data-calcul]');
        if (!el || !item.meta.simplifiee) return Promise.resolve(true);
        el.classList.add('ad-calcul--montre');
        el.innerHTML = `<span class="ad-avant">${item.meta.simplifiee}</span>`;
        return new Promise(r => regTimeout(() => r(true), 900));
    }

    function majCalcul() {
        const el = container.querySelector('[data-calcul]');
        if (!el) return;
        const m = item.meta;
        if (m.question === 'ecriture') { el.textContent = ''; return; }
        // Sur les pastilles, la ligne DIT ce que le tableau montre. Une image
        // muette n'apprend pas l'écriture, et c'est l'écriture qu'on vise.
        el.textContent = m.modele === 'pastilles'
            ? `${fmt(m.a)} et ${fmt(m.b)}, c'est-à-dire ${m.simplifiee}`
            : '';
    }

    // --- Le pavé --------------------------------------------------------------

    function paveHtml(decimal) {
        const touches = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '−', '0', ...(decimal ? [','] : []), '⌫'];
        return `<div class="rl-saisie">
            <div class="rl-champ" data-reponse-vue><span>Résultat</span><b data-affiche>?</b></div>
            <div class="rl-pave${decimal ? ' rl-pave--virgule' : ''}">
                ${touches.map(k => `<button type="button" class="rl-touche${k === '−' ? ' rl-touche--signe' : ''}${k === '⌫' ? ' rl-touche--eff' : ''}" data-touche="${k}">${k}</button>`).join('')}
            </div>
            <button type="button" class="kk-btn-valider" data-valider>Valider</button>
        </div>`;
    }

    /**
     * L'erreur derrière la réponse — pas « faux », mais CE QUI a été confondu.
     * C'est ce que lira le carnet, et c'est ce qui permet de reproposer la
     * bonne marche plutôt qu'une question au hasard.
     */
    function diagnostic(donne) {
        const { a, b, total } = etat;
        if (donne === Math.abs(a) + Math.abs(b)) return 'relatifs:signes-ignores';
        if (donne === -total) return 'relatifs:signe-inverse';
        if (donne === Math.abs(Math.abs(a) - Math.abs(b)) && (a >= 0) === (b >= 0)) return 'relatifs:soustrait-a-tort';
        if (donne === a - b) return 'relatifs:signe-du-second';
        return null;
    }

    function brancher() {
        const repondre = (valeur) => {
            if (destroyed || etat.fige) return;
            const res = session.submit(valeur, {
                misconception: typeof valeur === 'number' ? diagnostic(valeur) : null
            });
            if (res.ignored) return;
            res.dismissed.then(async () => {
                if (destroyed) return;
                if (res.correct) {
                    // On ATTEND l'élimination avant d'enchaîner. Sans cette
                    // attente, la question suivante s'affichait par-dessus
                    // l'animation : l'élève qui répond juste ne voyait jamais
                    // les paires s'annuler, c'est-à-dire jamais la seule chose
                    // que cette marche a à montrer.
                    if (etat.modele === 'pastilles') await animerElimination();
                    renderNext();
                    return;
                }
                if (res.revealed) {
                    const montre = etat.modele === 'pastilles' ? animerElimination() : animerEcriture();
                    montre.then(() => regTimeout(renderNext, 1500));
                }
            });
        };

        // Le pavé vit DANS la page : un <input> ferait monter le clavier du
        // téléphone par-dessus le tableau de pastilles, c'est-à-dire par-dessus
        // ce dont on a besoin pour répondre.
        pave = null;
        const affiche = container.querySelector('[data-affiche]');
        const btn = container.querySelector('[data-valider]');
        if (affiche && btn) {
            let saisie = '';
            const peindre = () => {
                affiche.textContent = saisie === '' ? '?' : saisie.replace('-', '−').replace('.', ',');
                affiche.classList.toggle('rl-affiche--vide', saisie === '');
            };
            const valider = () => {
                if (saisie === '' || saisie === '-' || saisie.endsWith('.')) return;
                repondre(parseFloat(saisie));
            };
            const frappe = (k) => {
                if (k === '⌫') saisie = saisie.slice(0, -1);
                else if (k === '−') saisie = saisie.startsWith('-') ? saisie.slice(1) : '-' + saisie;
                else if (k === ',') { if (!saisie.includes('.') && saisie.replace('-', '') !== '') saisie += '.'; }
                else if (saisie.replace(/[-.]/g, '').length < 4) saisie += k;
                peindre();
            };
            container.querySelectorAll('[data-touche]').forEach(t => {
                t.onclick = () => { if (!session.locked) frappe(t.dataset.touche); };
            });
            btn.onclick = valider;
            const surTouche = (e) => {
                if (session.locked) return;
                if (/^[0-9]$/.test(e.key)) frappe(e.key);
                else if (e.key === 'Backspace') frappe('⌫');
                else if (e.key === '-') frappe('−');
                else if (e.key === ',' || e.key === '.') frappe(',');
                else if (e.key === 'Enter') { valider(); return; }
                else return;
                e.preventDefault();
            };
            document.addEventListener('keydown', surTouche);
            nettoyeurs.push(() => document.removeEventListener('keydown', surTouche));
            peindre();
            pave = { frappe };
        }

        // En choix, la valeur peut être un NOMBRE (un total) ou une CHAÎNE
        // (une écriture) : on renvoie donc la valeur du choix telle quelle,
        // sans la convertir.
        container.querySelectorAll('[data-choix]').forEach(b => {
            b.onclick = () => repondre(item.choices[Number(b.dataset.choix)].value);
        });
    }

    // --- Le robot -------------------------------------------------------------

    /**
     * Où le robot regarde quand il parle.
     *
     * Il visait `container` — le centre géométrique de la zone de jeu, c'est-à-dire
     * un point entre les éléments plutôt que sur l'un d'eux : la flèche se posait
     * dans le vide, et la bulle s'étalait par-dessus les pastilles dont elle
     * parlait. Chaque phrase désigne maintenant ce qu'elle commente.
     */
    const vise = (...selecteurs) => {
        for (const s of selecteurs) {
            const el = container.querySelector(s);
            // La ligne de calcul est vide sur les marches d'écriture : la viser
            // reviendrait à désigner un point de hauteur nulle.
            if (el && el.getBoundingClientRect().height > 2) return el;
        }
        return container;
    };

    async function runDemo() {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const fin = () => { cursor?.hideBubble(); return true; };
        const m = item.meta;

        // Tableau, ligne de calcul, pavé : rien de tout cela ne doit passer
        // sous une bulle. C'est exactement ce qu'on demande de regarder.
        cursor.protegerZone([...container.querySelectorAll('.ad-layout > *')]
            .filter(el => !el.classList.contains('hint-bar')));

        if (!await cursor.pause(500)) return fin();
        if (m.texteLecon) {
            cursor.say(m.texteLecon, vise('[data-tableau]', '[data-calcul]', '.game-question'));
            if (!await cursor.pause(DEMO_SPEED.between)) return fin();
        }

        if (!await gate.waitTurn()) return fin();
        if (m.question === 'ecriture') {
            cursor.say(`On n'écrit jamais deux signes à la suite. Dans ${item.prompt.text.replace('Écris ce calcul plus simplement : ', '')}, `
                + `le « + » et le signe du deuxième nombre se réduisent à un seul signe.`, vise('.game-question'));
            if (!await cursor.pause(DEMO_SPEED.settle)) return fin();
            const bon = item.choices.findIndex(c => c.correct);
            const cible = container.querySelector(`[data-choix="${bon}"]`);
            if (cible && !await cursor.tap(cible)) return fin();
            if (cible) cible.classList.add('demo-target');
            cursor.say(`On écrit donc ${item.answer}. Le calcul, lui, n'a pas changé.`, cible || container);
            if (!await cursor.pause(DEMO_SPEED.between)) return fin();
            fin();
            renderNext();
            return true;
        }

        const memeSigne = (m.a >= 0) === (m.b >= 0);
        if (m.modele === 'pastilles') {
            cursor.say(memeSigne
                ? `Toutes les pastilles sont dans la même colonne : il n'y a aucune paire à éliminer, on compte.`
                : `Il y a des pastilles des deux couleurs. Une rouge et une bleue valent zéro ensemble : je les élimine deux par deux, une de chaque côté.`,
                vise('[data-tableau]'));
            if (!await cursor.pause(DEMO_SPEED.settle)) return fin();
            await animerElimination();
        } else {
            cursor.say(`${item.prompt.text.replace(' = ?', '')} s'écrit plus simplement ${m.simplifiee}.`,
                vise('[data-calcul]', '.game-question'));
            if (!await cursor.pause(DEMO_SPEED.settle)) return fin();
            await animerEcriture();
        }

        if (!await gate.waitTurn()) return fin();
        cursor.say(item.explanation, vise('[data-calcul]', '[data-tableau]', '.game-question'));
        if (!await cursor.pause(DEMO_SPEED.between)) return fin();

        // Puis on tape la réponse, chiffre par chiffre — la virgule comprise,
        // qui a sa propre touche et que l'on oublie sinon d'appuyer.
        const texte = fmt(m.total);
        for (const c of texte) {
            const k = c === '−' ? '−' : c === ',' ? ',' : c;
            const t = container.querySelector(`[data-touche="${k}"]`);
            if (t && !await cursor.tap(t)) return fin();
            if (pave) pave.frappe(k);   // le chiffre s'inscrit vraiment
        }
        const valider = container.querySelector('[data-valider]');
        if (valider && !await cursor.tap(valider)) return fin();
        if (!await cursor.pause(DEMO_SPEED.settle)) return fin();

        // ON ENCHAÎNE. La démonstration s'arrêtait ici : elle jouait la marche 1
        // et laissait le robot planté devant, alors que l'exercice en compte
        // douze — c'est précisément la progression qu'il fallait montrer.
        fin();
        renderNext();
        return true;
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            nettoyeurs.forEach(f => f());
            nettoyeurs.length = 0;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}

export default { mount };
