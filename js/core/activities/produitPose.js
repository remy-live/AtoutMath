// L'ATELIER DU PRODUIT DE FRACTIONS — décomposer, barrer, calculer.
//
// Rémy, après avoir essayé le QCM : « je trouve que multiplier des fractions en
// barrant en diagonale n'est pas clair, il faut pouvoir décomposer les nombres,
// mais un QCM ce n'est pas terrible. »
//
//     On écrit la multiplication, on a : 33/22 × 45/25
//     On clique sur le 33 et il apparaît  (… × …)/22 × 45/25
//     On a un bouton décomposer ou barrer ; barrer permet de barrer les mêmes
//     nombres en haut et en bas. Dans un premier temps, on peut appeler la
//     table de Pythagore pour chercher le nombre. On peut décomposer chaque
//     nombre présent.
//
// LE QCM DEMANDAIT LE RÉSULTAT, ET C'ÉTAIT LE DÉFAUT. On pouvait le trouver en
// multipliant tout puis en simplifiant à la fin — c'est-à-dire par la méthode
// qu'on voulait justement faire abandonner. « Barrer en diagonale » n'était
// qu'un conseil dans un corrigé qu'on lit après coup. Ici, décomposer et
// barrer sont les SEULS gestes disponibles : la méthode n'est plus racontée,
// elle est faite.
//
// DEUX MODES, ET C'EST TOUT L'OUTILLAGE. Rémy : « un bouton décomposer ou
// barrer ». On clique un nombre :
//
//   · en mode DÉCOMPOSER, il s'ouvre en « … × … » et l'on écrit les facteurs ;
//   · en mode BARRER, il s'allume, et le nombre suivant qu'on touche de
//     l'autre côté de la barre se raye avec lui — s'ils sont égaux.
//
// LE CALCUL VIT DANS `core/produitPose.js`, sans écran, où il se teste. Ici il
// n'y a que le dessin, les clics, et la table de Pythagore.
//
// (Préfixe `pp-` : `fa-` appartient à l'addition posée, `fp-` à l'aperçu des
// fiches imprimées.)

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import {
    etatInitial, decomposer, barrer, resultat, estFini, tousHaut, tousBas,
    decompositions, PYTHAGORE_MAX
} from '../produitPose.js';
import { showModal } from '../../ui/modal.js';

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let item = null;
    let etat = null;
    let mode = 'decomposer';
    let choisi = null;          // le jeton allumé, en mode barrer
    let ouvert = null;          // le jeton ouvert en « … × … »
    let tableOuverte = null;
    let fini = false;           // l'expression est simplifiée, on écrit le résultat

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        etat = etatInitial(item.meta.produit);
        mode = 'decomposer';
        choisi = null;
        ouvert = null;
        fini = false;
        render();
    }

    // --- Le dessin -------------------------------------------------------------

    const jetonHtml = (t, etage) => {
        const classes = ['pp-jeton', `pp-jeton--${etage}`];
        if (t.barre) classes.push('pp-jeton--barre');
        if (choisi === t.id) classes.push('pp-jeton--choisi');
        // LE NOMBRE OUVERT DEVIENT DEUX CASES, à sa place exacte. Rémy : « on
        // clique sur le 33 et il apparaît … × … ». Les deux cases remplacent le
        // nombre dans la ligne : on voit ce qu'on est en train de faire là où
        // on le fait, et non dans un panneau à côté.
        if (ouvert === t.id) {
            return `<span class="pp-ouvre">
                <input class="pp-case" data-fac="1" inputmode="numeric" maxlength="3"
                    aria-label="premier facteur" autocomplete="off">
                <span class="pp-x">×</span>
                <input class="pp-case" data-fac="2" inputmode="numeric" maxlength="3"
                    aria-label="second facteur" autocomplete="off">
            </span>`;
        }
        return `<button type="button" class="${classes.join(' ')}" data-jeton="${t.id}"
            ${t.barre ? 'aria-label="nombre barré, il vaut 1"' : ''}>${t.v}</button>`;
    };

    const etageHtml = (jetons, etage) => jetons
        .map(t => jetonHtml(t, etage))
        .join('<span class="pp-fois">×</span>');

    function expressionHtml() {
        return etat.fractions.map((f, i) => `
            ${i ? '<span class="pp-op">×</span>' : ''}
            <span class="pp-frac">
                <span class="pp-num">${etageHtml(f.haut, 'haut')}</span>
                <span class="pp-den">${etageHtml(f.bas, 'bas')}</span>
            </span>`).join('');
    }

    function render() {
        const r = resultat(etat);
        container.innerHTML = `
            <div class="pp-scene">
                <div class="game-question">${item.prompt.consigne || 'Simplifie, puis calcule.'}</div>
                <div class="pp-expr" data-expr>${expressionHtml()}</div>
                <p class="pp-note" data-note role="status"></p>
                ${fini ? finalHtml(r) : outilsHtml()}
            </div>
            ${hintBar(item)}`;
        wireHint(container, item, session);
        brancher();
    }

    function outilsHtml() {
        const bouton = (m, texte, aide) => `<button type="button"
            class="pp-outil${mode === m ? ' pp-outil--actif' : ''}" data-mode="${m}"
            aria-pressed="${mode === m}" title="${aide}">${texte}</button>`;
        return `<div class="pp-outils">
                ${bouton('decomposer', '✂️ Décomposer', 'Clique un nombre pour l’écrire en produit')}
                ${bouton('barrer', '❌ Barrer', 'Clique le même nombre en haut et en bas')}
                <button type="button" class="pp-table" data-table>🔢 Table de Pythagore</button>
            </div>
            <p class="pp-aide-mode">${mode === 'decomposer'
        ? 'Clique un nombre : il s’ouvre en deux facteurs à écrire.'
        : 'Clique un nombre en haut, puis le même en bas.'}</p>`;
    }

    // LA DERNIÈRE LIGNE EST LA SEULE QUI COMPTE POUR LA SESSION. Décomposer et
    // barrer sont l'écriture du raisonnement : on les corrige sur place, on ne
    // les note pas — sinon une question vaudrait six points de statistiques, et
    // le carnet d'erreurs parlerait de « barrage » sans dire de quel calcul.
    const finalHtml = (r) => `<div class="pp-final" data-final>
            <p class="pp-bravo">Plus rien ne se barre. Il ne reste qu’à multiplier ce qui n’est
                pas barré.</p>
            <div class="pp-res">
                <span class="pp-frac pp-frac--res">
                    <span class="pp-num"><input class="pp-case pp-case--res" data-res="n"
                        inputmode="numeric" maxlength="4" aria-label="numérateur du résultat"
                        autocomplete="off"></span>
                    <span class="pp-den"><input class="pp-case pp-case--res" data-res="d"
                        inputmode="numeric" maxlength="4" aria-label="dénominateur du résultat"
                        autocomplete="off"></span>
                </span>
                <button type="button" class="pp-valider" data-valider>Valider</button>
            </div>
        </div>`;

    const note = (texte) => {
        const el = container.querySelector('[data-note]');
        if (el) el.textContent = texte || '';
    };

    function secouer() {
        const el = container.querySelector('[data-expr]');
        if (!el) return;
        el.classList.remove('pp-expr--non');
        void el.offsetWidth;
        el.classList.add('pp-expr--non');
    }

    // --- Les gestes ------------------------------------------------------------

    function brancher() {
        container.querySelectorAll('[data-mode]').forEach(b => {
            b.onclick = () => {
                if (session.locked) return;
                mode = b.dataset.mode;
                choisi = null;
                ouvert = null;
                render();
            };
        });
        const t = container.querySelector('[data-table]');
        if (t) t.onclick = ouvrirTable;

        container.querySelectorAll('[data-jeton]').forEach(b => {
            b.onclick = () => toucher(b.dataset.jeton);
        });

        // Les deux cases d'une décomposition : on valide à la seconde, ou par
        // Entrée. Personne ne cherche un bouton quand il vient d'écrire deux
        // nombres.
        const cases = [...container.querySelectorAll('[data-fac]')];
        if (cases.length === 2) {
            cases[0].focus();
            cases.forEach((c, i) => {
                c.oninput = () => {
                    if (c.value.length >= 2 && i === 0) cases[1].focus();
                };
                c.onkeydown = (ev) => {
                    if (ev.key === 'Enter') { ev.preventDefault(); validerDecomposition(); }
                    if (ev.key === 'Escape') { ouvert = null; render(); }
                };
            });
            const finir = () => {
                if (cases.every(c => c.value.trim())) validerDecomposition();
            };
            cases[1].onblur = () => regTimeout(finir, 120);
        }

        const v = container.querySelector('[data-valider]');
        if (v) v.onclick = validerResultat;
        container.querySelectorAll('[data-res]').forEach(c => {
            c.onkeydown = (ev) => { if (ev.key === 'Enter') validerResultat(); };
        });
        const premier = container.querySelector('[data-res="n"]');
        if (premier) premier.focus();
    }

    function toucher(id) {
        if (session.locked || fini) return;
        if (mode === 'decomposer') { ouvert = id; choisi = null; return render(); }

        // MODE BARRER. Le premier clic allume, le second raye — et il faut que
        // l'un soit en haut et l'autre en bas : barrer deux numérateurs
        // reviendrait à diviser le haut par lui-même sans toucher au bas, ce
        // qui change la fraction. C'est refusé, avec la raison.
        if (!choisi) { choisi = id; return render(); }
        if (choisi === id) { choisi = null; return render(); }

        const enHaut = (x) => tousHaut(etat).some(t => t.id === x);
        const a = choisi, b = id;
        if (enHaut(a) === enHaut(b)) {
            note('Il faut un nombre EN HAUT et un EN BAS : barrer deux numérateurs '
                + 'diviserait le haut sans toucher au bas.');
            secouer();
            choisi = null;
            return render();
        }
        const [h, bas] = enHaut(a) ? [a, b] : [b, a];
        const r = barrer(etat, h, bas);
        choisi = null;
        if (!r.ok) { note(r.pourquoi); secouer(); return render(); }
        etat = r.etat;
        note('');
        verifierFin();
        render();
    }

    function validerDecomposition() {
        if (destroyed || !ouvert) return;
        const cases = [...container.querySelectorAll('[data-fac]')];
        if (cases.length !== 2 || cases.some(c => !c.value.trim())) return;
        const r = decomposer(etat, ouvert, cases[0].value, cases[1].value);
        if (!r.ok) {
            note(r.pourquoi);
            secouer();
            cases.forEach(c => { c.value = ''; });
            cases[0].focus();
            return;
        }
        etat = r.etat;
        ouvert = null;
        note('');
        // DÉCOMPOSER PEUT SUFFIRE À FINIR — 4/6 devient (2×2)/(2×3), et l'élève
        // n'a plus qu'à barrer. Mais il peut aussi avoir décomposé un nombre
        // qui n'avait rien à donner : on ne bascule que si plus rien ne se
        // simplifie.
        verifierFin();
        // ON PASSE EN MODE BARRER TOUT SEUL après une décomposition. C'est le
        // geste suivant dans neuf cas sur dix, et laisser l'élève rouvrir un
        // nombre qu'il vient d'écrire n'apprend rien.
        if (!fini) mode = 'barrer';
        render();
    }

    function verifierFin() {
        if (estFini(etat)) { fini = true; mode = 'decomposer'; choisi = null; }
    }

    function validerResultat() {
        if (destroyed || session.locked) return;
        const n = container.querySelector('[data-res="n"]');
        const d = container.querySelector('[data-res="d"]');
        if (!n || !d || !n.value.trim() || !d.value.trim()) return;
        const donnee = `${n.value.trim()}/${d.value.trim()}`;
        const result = session.submit(donnee, { element: container.querySelector('[data-final]') });
        if (result.ignored) return;
        if (!result.correct) {
            // ON RAPPELLE LE GESTE, PAS LE NOMBRE. Le premier jet écrivait
            // « multiplie ce qui n'est pas barré : 7 en haut, 9 en bas » — ce
            // qui, quand il ne reste qu'un facteur de chaque côté, EST la
            // réponse. Une aide qui donne le résultat après une erreur
            // n'apprend rien et fausse la note.
            note('Multiplie tous les nombres qui ne sont pas barrés : ceux du haut '
                + 'entre eux, ceux du bas entre eux.');
            secouer();
        }
        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct || result.revealed) return renderNext();
            n.value = ''; d.value = ''; n.focus();
        });
    }

    // --- LA TABLE DE PYTHAGORE -------------------------------------------------
    //
    // Rémy : « on peut appeler la table de Pythagore pour chercher le nombre
    // (va jusque 11 dans un premier temps) ». Elle ne donne pas la réponse :
    // elle allume les cases où le nombre cherché apparaît, et l'élève LIT ses
    // deux facteurs sur les bords. C'est un dessin qui ne se dégrade jamais.

    function ouvrirTable() {
        if (tableOuverte) { tableOuverte.close(); tableOuverte = null; return; }
        // Le nombre qu'on cherche : celui qu'on vient d'ouvrir, sinon celui
        // qu'on a allumé, sinon rien — et la table est alors juste une table.
        const cible = ouvert || choisi;
        const t = cible ? [...tousHaut(etat), ...tousBas(etat)].find(x => x.id === cible) : null;
        tableOuverte = showModal('La table de Pythagore',
            tableHtml(t ? t.v : null),
            { width: '620px', onClose: () => { tableOuverte = null; } });
        // AU-DESSUS DU PLEIN ÉCRAN DU JEU. La modale générique se pose à 9999 ;
        // l'écran de jeu est à 10000 — la table s'ouvrirait derrière lui.
        const voile = tableOuverte.element.parentElement;
        if (voile) voile.style.zIndex = '100001';
    }

    function tableHtml(cible) {
        const paires = cible ? decompositions(cible) : [];
        let corps = '<tr><th></th>';
        for (let c = 1; c <= PYTHAGORE_MAX; c++) corps += `<th>${c}</th>`;
        corps += '</tr>';
        for (let l = 1; l <= PYTHAGORE_MAX; l++) {
            corps += `<tr><th>${l}</th>`;
            for (let c = 1; c <= PYTHAGORE_MAX; c++) {
                const v = l * c;
                const ici = cible !== null && v === cible;
                corps += `<td class="${ici ? 'pp-c-cible' : ''}">${v}</td>`;
            }
            corps += '</tr>';
        }
        const dit = cible === null
            ? 'Choisis d’abord un nombre dans le calcul : la table allumera les cases où '
                + 'il apparaît.'
            : paires.length
                ? `${cible} apparaît dans la table : c’est ${paires
                    .filter(([x, y]) => x <= y).map(([x, y]) => `${x} × ${y}`).join(', ou ')}.`
                : `${cible} n’apparaît pas dans la table jusqu’à ${PYTHAGORE_MAX} — `
                    + 'il faut chercher ses facteurs autrement.';
        return `<p class="pp-table-dit">${dit}</p>
            <div class="pp-table-boite"><table class="pp-pytha">${corps}</table></div>`;
    }

    if (opts.item) { item = opts.item; etat = etatInitial(item.meta.produit); render(); } else renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (tableOuverte) { tableOuverte.close(); tableOuverte = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
