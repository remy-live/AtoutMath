// LA MÉDIANE AU DOIGT — on range la série, puis on barre par les deux bouts.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 17 novembre : « et pour la médiane, on peut ranger dans l'ordre
// croissant par drag drop », puis « et on peut sélectionner ou barrer des
// valeurs qui s'affichent ».
//
// ── CE GESTE EST LA LEÇON, ET CE N'EST PAS LA LIGNE ROUGE ──────────────────
//
// « Je ne veux pas de construction géométrique avec des outils virtuels. Rien
// ne remplace le geste. » La règle vise le tracé : on ne trace pas à la souris
// ce qui se trace à la règle et au compas. Ranger une série et en barrer les
// extrêmes n'est pas un tracé — c'est ce que Rémy fait au tableau, et c'est le
// seul endroit où la méthode de la médiane se VOIT. Au pavé numérique, l'élève
// tape un nombre : on ne sait pas s'il a rangé, compté, ou deviné le milieu.
//
// ── POURQUOI BARRER, ET PAS « DÉSIGNER LE MILIEU » ─────────────────────────
//
// Parce que c'est la méthode du papier, celle qui survit à une série de onze
// valeurs : on raye le plus petit ET le plus grand, et on recommence. Compter
// « (n+1)/2 » est une formule ; barrer deux par deux est un raisonnement, et
// il explique DE LUI-MÊME pourquoi une série paire n'a pas de milieu.
//
// ── LA SÉRIE PAIRE EST LE MOMENT QUI COMPTE ────────────────────────────────
//
// Quand il reste DEUX jetons, l'activité ne conclut pas à la place de l'élève :
// elle lui propose les deux survivants et leur moyenne. C'est exactement l'idée
// fausse que cette marche existe pour défaire — « la médiane est une valeur de
// la série » — et elle se joue ici en un seul appui, devant les deux nombres
// qu'il vient lui-même d'isoler.
//
// ── CE QU'ON CORRIGE PENDANT, ET CE QU'ON TAIT ─────────────────────────────
//
// On aide sur le RANGEMENT — « ce nombre est plus grand que son voisin de
// droite » — parce que ranger est un MOYEN, pas la question posée. On ne dit
// jamais rien du milieu : c'est la réponse.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';

/** Un nombre à la française. */
const fr = (x) => {
    const s = Math.abs(x) < 1e-9 ? '0' : String(Number(Number(x).toPrecision(12)));
    return s.replace('.', ',');
};
const sansBalise = (s) => String(s).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * LES TROIS DÉCISIONS DE CETTE ACTIVITÉ SONT PURES, ET ELLES SORTENT D'ICI.
 *
 * Même choix que `ui/ecranDeSeance.js` : ce qui se décide sans écran s'éprouve
 * sans navigateur. Ce qui reste dans `mount` — le glisser, le dessin, le
 * robot — se mesure sur le chemin de l'élève (`node tools/medianeAuDoigt.mjs`),
 * parce que rien d'autre ne peut le mesurer.
 */

/** Le rang du premier nombre plus grand que son voisin de droite, ou -1. */
export function premiereDescente(valeurs) {
    for (let i = 0; i < valeurs.length - 1; i++) {
        if (valeurs[i] > valeurs[i + 1]) return i;
    }
    return -1;
}

/**
 * CE JETON EST-IL UN BOUT ? On ne barre que le plus petit ou le plus grand de
 * ce qui reste debout : barrer au milieu ferait disparaître la médiane
 * elle-même sans que rien ne le signale, et l'élève arriverait à un « dernier
 * debout » faux en croyant avoir suivi la méthode.
 */
export function estUnBout(debout, k) {
    if (debout.length <= 1) return false;
    return k === debout[0] || k === debout[debout.length - 1];
}

/**
 * APRÈS CE BARRÉ, OÙ EN EST-ON ?
 *
 * MESURÉ SUR LE CHEMIN DE L'ÉLÈVE, et c'est le défaut que cette fonction
 * existe pour ne plus jamais réintroduire : sur 160 · 161 · 167 · 168 · 169,
 * l'exercice se bloquait à « 167 et 168 ». On barre un jeton À LA FOIS — c'est
 * un doigt, pas une paire —, donc une série IMPAIRE passe par deux debout
 * entre son troisième et son quatrième barré. Basculer là vers le choix du
 * milieu arrêtait tout : plus rien ne se barrait, et le dernier bout restait.
 *
 * C'EST LA PARITÉ DE LA SÉRIE QUI DÉCIDE, pas ce qu'il reste à l'écran.
 */
export function phaseApres(taille, restants) {
    if (restants === 2 && taille % 2 === 0) return 'choisir';
    return 'barrer';
}

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** L'ordre courant des jetons : des RANGS dans la série d'origine. */
    let ordre = [];
    /** Les rangs barrés, dans l'ordre où on les a barrés. */
    let barres = [];
    /** 'ranger' · 'barrer' · 'choisir' · 'fini' */
    let phase = 'ranger';
    /** La valeur choisie quand il reste deux jetons. */
    let choisie = null;
    let resultatJuste = null;
    let glisse = null;

    const serie = () => (item && item.meta && item.meta.serie) || [];
    const valeur = (k) => serie()[k];
    /** Les jetons encore debout, de gauche à droite. */
    const debout = () => ordre.filter(k => !barres.includes(k));

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(prochain) {
        item = prochain;
        // LA SÉRIE ARRIVE DANS L'ORDRE DE L'ÉNONCÉ, c'est-à-dire en désordre :
        // c'est la matière de l'exercice. On ne la trie surtout pas ici.
        ordre = serie().map((_, k) => k);
        barres = [];
        choisie = null;
        phase = 'ranger';
        resultatJuste = null;

        container.innerHTML = `
            <div class="md-layout">
                <div class="md-context">${item.prompt.html}</div>
                <p class="md-consigne" data-consigne></p>
                <div class="md-rangee" data-rangee role="list"></div>
                <div class="md-choix" data-choix hidden></div>
                <div class="md-statut" role="status" aria-live="polite" data-statut></div>
                <div class="md-actions">
                    <button type="button" class="md-btn" data-recommencer>↺ Recommencer</button>
                    <button type="button" class="md-btn md-btn--fort" data-valider>Valider</button>
                </div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        container.querySelector('[data-recommencer]').onclick = recommencer;
        container.querySelector('[data-valider]').onclick = valider;
        peindre();
    }

    function recommencer() {
        if (phase === 'fini' || session.locked) return;
        ordre = serie().map((_, k) => k);
        barres = [];
        choisie = null;
        phase = 'ranger';
        peindre();
    }

    // ─────────────────────────────────────────────────── LE DESSIN ──────────

    function peindre() {
        const rangee = container.querySelector('[data-rangee]');
        if (!rangee) return;
        const vivants = debout();
        rangee.innerHTML = ordre.map((k) => {
            const barre = barres.includes(k);
            // LE DERNIER DEBOUT SE MONTRE, parce que c'est la réponse que
            // l'élève vient de faire apparaître : la cacher serait lui retirer
            // le seul retour que ce geste produit.
            const seul = phase !== 'ranger' && vivants.length === 1 && vivants[0] === k;
            const bout = phase === 'barrer' && !barre
                && (vivants[0] === k || vivants[vivants.length - 1] === k);
            return `<button type="button" class="md-jeton${barre ? ' md-jeton--barre' : ''}${
                seul ? ' md-jeton--seul' : ''}${bout ? ' md-jeton--bout' : ''}"
                data-rang="${k}" role="listitem"
                ${barre ? 'aria-disabled="true"' : ''}
                aria-label="${sansBalise(fr(valeur(k)))}${barre ? ', barré' : ''}">${
    sansBalise(fr(valeur(k)))}</button>`;
        }).join('');

        const consigne = container.querySelector('[data-consigne]');
        if (consigne) consigne.textContent = PHRASES[phase] || '';
        rangee.classList.toggle('md-rangee--range', phase !== 'ranger');

        // `btn` ET NON `valider` : la fonction du même nom vit juste en dessous,
        // et une variable locale qui la masque donnerait un bouton qui ne fait
        // rien, sans la moindre erreur.
        const btn = container.querySelector('[data-valider]');
        if (btn) {
            btn.textContent = phase === 'ranger' ? 'C’est rangé' : 'Valider';
            btn.disabled = phase === 'fini'
                || (phase === 'barrer' && vivants.length > 1)
                || (phase === 'choisir' && choisie === null);
        }
        rangee.classList.toggle('md-rangee--ok', phase === 'fini' && resultatJuste === true);
        rangee.classList.toggle('md-rangee--ko', phase === 'fini' && resultatJuste === false);
        peindreLesChoix();
        if (phase !== 'fini') brancherGestes();
    }

    const PHRASES = {
        ranger: 'Range la série dans l’ordre CROISSANT : fais glisser les nombres.',
        barrer: 'Barre le plus petit ET le plus grand, deux par deux, jusqu’au milieu.',
        choisir: 'Il en reste DEUX : la médiane est au milieu de ces deux nombres.',
        fini: ''
    };

    /**
     * LES TROIS PROPOSITIONS DE LA SÉRIE PAIRE.
     *
     * Les deux survivants et leur moyenne. Ce ne sont pas des leurres tirés au
     * hasard : ce sont LES deux réponses qu'un élève donne vraiment quand il ne
     * sait pas quoi faire des deux nombres du milieu.
     */
    function peindreLesChoix() {
        const zone = container.querySelector('[data-choix]');
        if (!zone) return;
        const vivants = debout();
        if (phase !== 'choisir' || vivants.length !== 2) { zone.hidden = true; return; }
        const a = valeur(vivants[0]), b = valeur(vivants[1]);
        const milieu = (a + b) / 2;
        zone.hidden = false;
        zone.innerHTML = [a, milieu, b].map(v => `<button type="button"
            class="md-prop${choisie === v ? ' md-prop--prise' : ''}"
            data-prop="${v}">${sansBalise(fr(v))}</button>`).join('');
        zone.querySelectorAll('[data-prop]').forEach(b2 => {
            b2.onclick = () => {
                if (session.locked || phase !== 'choisir') return;
                choisie = Number(b2.getAttribute('data-prop'));
                peindre();
            };
        });
    }

    const dire = (texte) => {
        const el = container.querySelector('[data-statut]');
        if (el) el.textContent = texte;
    };

    // ──────────────────────────────────────────────────── LES GESTES ────────

    function brancherGestes() {
        container.querySelectorAll('[data-rang]').forEach((el) => {
            const k = Number(el.getAttribute('data-rang'));
            el.onclick = () => { if (phase === 'barrer') barrer(k); };
            // LE CLAVIER RANGE AUSSI, ET CE N'EST PAS UN LUXE : un glisser ne
            // se fait ni au clavier ni au lecteur d'écran, et le rangement est
            // la moitié de l'exercice. Les flèches déplacent le jeton tenu.
            el.onkeydown = (e) => {
                if (phase === 'barrer' && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault(); barrer(k); return;
                }
                if (phase !== 'ranger') return;
                const pas = e.key === 'ArrowLeft' ? -1 : (e.key === 'ArrowRight' ? 1 : 0);
                if (!pas) return;
                e.preventDefault();
                const i = ordre.indexOf(k);
                const j = i + pas;
                if (j < 0 || j >= ordre.length) return;
                ordre.splice(i, 1);
                ordre.splice(j, 0, k);
                peindre();
                const rendu = container.querySelector(`[data-rang="${k}"]`);
                if (rendu) rendu.focus();
            };
            if (phase === 'ranger') brancherLeGlisser(el, k);
        });
    }

    /**
     * LE GLISSER, EN ÉVÉNEMENTS DE POINTEUR — et jamais l'API « drag and drop »
     * du navigateur, qui ne répond pas au doigt. C'est la règle déjà posée dans
     * `choice.js`, et l'application est utilisée sur tablette.
     *
     * ── ON ÉCOUTE LE DOCUMENT, ET PAS LE JETON ─────────────────────────────
     *
     * PREMIER JET, ET IL ÉTAIT FAUX : `el.setPointerCapture(...)` sur le jeton,
     * puis `insertBefore` pour le déplacer. MESURÉ dans le navigateur, en
     * comptant les événements : les deux premiers `pointermove` arrivaient bien
     * sur le jeton tenu, et tous les suivants sur ses VOISINS. Le jeton restait
     * « tenu » pour toujours, le `pointerup` n'arrivait jamais, et le rangement
     * ne bougeait pas d'un cran.
     *
     * LA RAISON EST DANS `insertBefore` LUI-MÊME : déplacer un nœud, c'est
     * d'abord le RETIRER de l'arbre, et un élément retiré perd sa capture.
     * Le geste se détruisait donc exactement au moment où il réussissait.
     *
     * On écoute le DOCUMENT pendant le glissé : il ne bouge pas, lui. C'est
     * aussi ce qui fait qu'un doigt qui sort de la rangée — ou de la fenêtre —
     * lâche proprement le jeton au lieu de le laisser collé.
     */
    function brancherLeGlisser(el, k) {
        el.onpointerdown = (e) => {
            if (phase !== 'ranger' || session.locked || glisse) return;
            e.preventDefault();
            glisse = { rang: k, x0: e.clientX, el };
            el.classList.add('md-jeton--tenu');
            document.addEventListener('pointermove', pendantLeGlisse);
            document.addEventListener('pointerup', lacher);
            document.addEventListener('pointercancel', lacher);
        };
    }

    function pendantLeGlisse(e) {
        if (!glisse) return;
        const el = glisse.el;
        el.style.transform = `translateX(${e.clientX - glisse.x0}px)`;
        const rangee = container.querySelector('[data-rangee]');
        if (!rangee) return;
        for (const v of [...rangee.children]) {
            if (v === el) continue;
            const r = v.getBoundingClientRect();
            if (e.clientX <= r.left || e.clientX >= r.right) continue;
            const cible = e.clientX > r.left + r.width / 2 ? v.nextSibling : v;
            // ── ON NE RECALE QUE SI LE JETON A VRAIMENT CHANGÉ DE PLACE ────
            //
            // RÉMY, 20 novembre : « le tri pour la médiane est bizarre, ça
            // fait des fantômes curieux dans le déplacement ».
            //
            // MESURÉ, ET LE DÉFAUT EST DANS CES DEUX LIGNES. Dès que le doigt
            // entrait dans la MOITIÉ GAUCHE du voisin de droite, on demandait
            // « insère-le avant ce voisin » — c'est-à-dire exactement là où il
            // était déjà. Le DOM ne bougeait pas, mais le décalage était remis
            // à zéro : le jeton SAUTAIT EN ARRIÈRE sous un doigt parti 88 px
            // plus loin, puis repartait au mouvement suivant. Relevé pendant
            // un glissé de 224 px : 12@372, 12@344, 12@422, 12@408…
            //
            // Une insertion qui ne déplace rien ne doit donc rien recaler.
            if (cible === el || cible === el.nextSibling) continue;
            rangee.insertBefore(el, cible);
            // LE POINT DE RÉFÉRENCE A BOUGÉ AVEC LE JETON : sans ce recalage,
            // le décalage affiché saute d'une case entière et le jeton part se
            // coller sous le doigt d'à côté.
            glisse.x0 = e.clientX;
            el.style.transform = '';
            break;
        }
    }

    function lacher() {
        if (!glisse) return;
        const { el, rang } = glisse;
        glisse = null;
        document.removeEventListener('pointermove', pendantLeGlisse);
        document.removeEventListener('pointerup', lacher);
        document.removeEventListener('pointercancel', lacher);
        el.style.transform = '';
        el.classList.remove('md-jeton--tenu');
        const rangee = container.querySelector('[data-rangee]');
        if (rangee) ordre = [...rangee.children].map(n => Number(n.getAttribute('data-rang')));
        peindre();
        const rendu = container.querySelector(`[data-rang="${rang}"]`);
        if (rendu) rendu.focus();
    }

    /** « C'est rangé » : on vérifie l'ordre, et on dit OÙ ça coince. */
    function finirDeRanger() {
        const i = premiereDescente(ordre.map(valeur));
        if (i >= 0) {
            // ON NOMME LA PAIRE, ET ON NE RANGE PAS À SA PLACE. Ranger est un
            // MOYEN : on aide. Dire la médiane serait donner la réponse.
            dire(`Ce n’est pas encore rangé : ${fr(valeur(ordre[i]))} est plus grand `
                + `que ${fr(valeur(ordre[i + 1]))}, qui est juste à sa droite.`);
            const el = container.querySelector(`[data-rang="${ordre[i]}"]`);
            if (el) el.classList.add('md-jeton--faute');
            return;
        }
        phase = 'barrer';
        dire('Rangée. Maintenant barre les DEUX bouts, et recommence.');
        peindre();
    }

    function barrer(k) {
        if (phase !== 'barrer' || session.locked || barres.includes(k)) return;
        const vivants = debout();
        if (vivants.length <= 1) return;
        // ON NE BARRE QUE PAR LES BOUTS, et c'est toute la méthode.
        if (!estUnBout(vivants, k)) {
            dire('On barre par les BOUTS : le plus petit, ou le plus grand.');
            return;
        }
        barres.push(k);
        const reste = debout();
        // LA PARITÉ DÉCIDE, PAS CE QU'IL RESTE À L'ÉCRAN — voir `phaseApres`,
        // qui porte le défaut mesuré et la raison.
        phase = phaseApres(serie().length, reste.length);
        if (reste.length === 1) {
            dire(`Il en reste UN : ${fr(valeur(reste[0]))}. C’est la médiane — valide.`);
        } else if (phase === 'choisir') {
            dire('');
        } else {
            dire(`Encore ${reste.length} nombres.`);
        }
        peindre();
    }

    function valider() {
        if (session.locked || phase === 'fini') return;
        if (phase === 'ranger') return finirDeRanger();
        const vivants = debout();
        const envoye = phase === 'choisir' ? choisie
            : (vivants.length === 1 ? valeur(vivants[0]) : null);
        if (envoye === null || envoye === undefined) return;
        phase = 'fini';
        const result = session.submit(envoye);
        resultatJuste = !!result.correct;
        peindre();
        dire(resultatJuste
            ? `Médiane : ${fr(envoye)}.`
            // ON DIT CE QUI A ÉTÉ ENVOYÉ ET CE QU'IL FALLAIT : « c'est faux »
            // seul laisserait relire sept nombres sans savoir lequel reprendre.
            : `Tu as répondu ${fr(envoye)}. La médiane était ${fr(item.answer)}.`);
        if (result.ignored) return;
        result.dismissed.then(() => { if (!destroyed) renderNext(); });
    }

    // ──────────────────────────────────────────────────────── LE ROBOT ──────

    /** Il range, puis il barre deux par deux — c'est la méthode, pas le résultat. */
    async function runDemo() {
        peindre();
        const attendre = (ms) => new Promise(r => regTimeout(r, ms));
        ordre = serie().map((_, k) => k).sort((a, b) => valeur(a) - valeur(b));
        peindre();
        await attendre(700);
        if (destroyed) return;
        phase = 'barrer';
        peindre();
        while (debout().length > 2) {
            const v = debout();
            barres.push(v[0]);
            peindre();
            await attendre(380);
            if (destroyed) return;
            const w = debout();
            if (w.length <= 1) break;
            barres.push(w[w.length - 1]);
            peindre();
            await attendre(380);
            if (destroyed) return;
        }
        if (debout().length === 2) { phase = 'choisir'; peindre(); }
        await attendre(900);
        if (!destroyed) regTimeout(renderNext, 900);
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            // ON DÉCROCHE LE GLISSÉ EN COURS. Les écouteurs vivent sur le
            // DOCUMENT, pas sur le jeton : partis avec `innerHTML = ''`, ils
            // resteraient là pour toute la vie de la page, et le doigt suivant
            // chercherait une rangée qui n'existe plus.
            if (glisse) lacher();
            container.innerHTML = '';
            session.finish();
        }
    };
}
