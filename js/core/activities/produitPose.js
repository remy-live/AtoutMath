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

/** Les touches du pavé, dans l'ordre où elles s'écrivent — pas celui d'une
 *  calculatrice : c'est une ligne de chiffres, pas un clavier de comptable. */
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let item = null;
    let etat = null;
    let mode = 'decomposer';
    let choisi = null;          // le jeton allumé, en mode barrer
    let ouvert = null;          // le jeton ouvert en « … × … »
    let tableOuverte = null;
    let fini = false;           // l'expression est simplifiée, on écrit le résultat
    let res = { n: '', d: '' }; // ce qu'on tape dans le résultat
    let resActif = 'n';         // la case du résultat que le pavé remplit

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        etat = etatInitial(item.meta.produit);
        mode = 'decomposer';
        choisi = null;
        ouvert = null;
        fini = false;
        res = { n: '', d: '' };
        resActif = 'n';
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
            // ON RAPPELLE CE QUE LA DÉCOMPOSITION DOIT VALOIR, AU-DESSUS.
            // Rémy : « juste rappeler à quoi doit être égale la décomposition »,
            // puis « écris = 7 au-dessus ». Le nombre disparaissait en
            // s'ouvrant : deux cases vides au milieu d'un calcul, et plus rien
            // ne disait ce qu'on cherchait à écrire — surtout après un détour
            // par la table de Pythagore. Sous les cases il se glissait entre
            // elles et la barre de fraction, où il se lisait comme un morceau
            // du calcul ; au-dessus, il est clairement une étiquette.
            return `<span class="pp-ouvre" data-ouvre>
                <span class="pp-cible">= ${t.v}</span>
                <span class="pp-duo">
                    <input class="pp-case" data-fac="1" inputmode="numeric" maxlength="3"
                        aria-label="premier facteur de ${t.v}" autocomplete="off">
                    <span class="pp-x">×</span>
                    <input class="pp-case" data-fac="2" inputmode="numeric" maxlength="3"
                        aria-label="second facteur de ${t.v}" autocomplete="off">
                </span>
            </span>`;
        }
        return `<button type="button" class="${classes.join(' ')}" data-jeton="${t.id}"
            ${t.barre ? 'aria-label="nombre barré, il vaut 1"' : ''}>${t.v}</button>`;
    };

    const etageHtml = (jetons, etage) => jetons
        .map(t => jetonHtml(t, etage))
        .join('<span class="pp-fois">×</span>');

    /** Une case du résultat : on la choisit, le pavé la remplit. */
    const caseRes = (k) => `<button type="button"
        class="pp-caseres${resActif === k ? ' pp-caseres--active' : ''}" data-res="${k}"
        aria-label="${k === 'n' ? 'numérateur' : 'dénominateur'} du résultat"
        >${res[k] || ''}</button>`;

    function expressionHtml() {
        const produit = etat.fractions.map((f, i) => `
            ${i ? '<span class="pp-op">×</span>' : ''}
            <span class="pp-frac">
                <span class="pp-num">${etageHtml(f.haut, 'haut')}</span>
                <span class="pp-den">${etageHtml(f.bas, 'bas')}</span>
            </span>`).join('');
        if (!fini) return produit;
        // LE RÉSULTAT S'ÉCRIT DANS LA MÊME LIGNE, après un « = ». Rémy : « mets
        // la fraction avec les produits et le = à côté quand on a barré ». Il
        // vivait dans un bloc à part, sous le calcul : sur un téléphone, ce
        // bloc plus le pavé numérique ne tenaient pas ensemble, et l'on
        // perdait de vue le produit qu'on est en train de recopier. Sur une
        // seule ligne, on lit « ce qui reste = ce que j'écris ».
        return `${produit}
            <span class="pp-op">=</span>
            <span class="pp-frac pp-frac--res">
                <span class="pp-num">${caseRes('n')}</span>
                <span class="pp-den">${caseRes('d')}</span>
            </span>`;
    }

    function render() {
        container.innerHTML = `
            <div class="pp-scene">
                <div class="game-question">${item.prompt.consigne || 'Simplifie, puis calcule.'}</div>
                <div class="pp-expr" data-expr>${expressionHtml()}</div>
                <p class="pp-note" data-note role="status"></p>
                ${fini ? finalHtml() : outilsHtml()}
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

    // LE PAVÉ NUMÉRIQUE, ET NON UN CHAMP DE SAISIE. Rémy : « pour que sur
    // téléphone portable on puisse avoir le pavé numérique que tu as déjà
    // créé ». Un `<input>` fait monter le clavier du système, qui mange la
    // moitié de l'écran — précisément la moitié où se trouve le calcul qu'on
    // est en train de recopier. Le pavé, lui, est dans la page : il ne cache
    // rien, et il n'offre que des chiffres.
    //
    // LA DERNIÈRE LIGNE EST LA SEULE QUI COMPTE POUR LA SESSION. Décomposer et
    // barrer sont l'écriture du raisonnement : on les corrige sur place, on ne
    // les note pas — sinon une question vaudrait six points de statistiques, et
    // le carnet d'erreurs parlerait de « barrage » sans dire de quel calcul.
    const finalHtml = () => `<div class="pp-final" data-final>
            <p class="pp-bravo">Plus rien ne se barre : multiplie ce qui n’est pas barré.</p>
            <div class="pp-pave" role="group" aria-label="Chiffres">
                ${DIGITS.map(k => `<button type="button" class="pp-touche"
                    data-touche="${k}">${k}</button>`).join('')}
                <button type="button" class="pp-touche pp-touche--del" data-touche="←"
                    aria-label="Effacer">⌫</button>
                <button type="button" class="pp-touche pp-touche--ok" data-valider
                    ${res.n && res.d ? '' : 'disabled'}>Valider</button>
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

        // LES DEUX CASES D'UNE DÉCOMPOSITION.
        //
        // ELLE SE VALIDE DÈS QUE LE PRODUIT TOMBE JUSTE, sans qu'on cherche un
        // bouton : « 5 » puis « 11 » devant 55, et c'est écrit. Un produit faux
        // ne déclenche rien — c'est Entrée qui demande l'avis, et qui obtient
        // alors la raison du refus.
        //
        // ET CLIQUER AILLEURS REMET LE NOMBRE. Rémy : « quand on clique
        // ailleurs ça remet ». C'était le seul geste sans issue de l'atelier :
        // une fois deux cases ouvertes, il fallait trouver Échap ou écrire
        // quelque chose. On abandonne maintenant en cliquant n'importe où —
        // sur un autre nombre, sur un bouton, sur le fond.
        const cases = [...container.querySelectorAll('[data-fac]')];
        if (cases.length === 2) {
            cases[0].focus();
            const essayer = () => {
                const [x, y] = cases.map(c => Number(c.value.trim()));
                const cible = container.querySelector('.pp-cible');
                const v = cible ? Number(cible.textContent.replace(/\D/g, '')) : NaN;
                if (Number.isFinite(x) && Number.isFinite(y) && x > 1 && y > 1 && x * y === v) {
                    validerDecomposition();
                }
            };
            cases.forEach((c, i) => {
                c.oninput = () => {
                    if (c.value.length >= 2 && i === 0) cases[1].focus();
                    essayer();
                };
                c.onkeydown = (ev) => {
                    if (ev.key === 'Enter') { ev.preventDefault(); validerDecomposition(); }
                    if (ev.key === 'Escape') { ouvert = null; render(); }
                };
            });
        }
        // Le clic qui ANNULE : n'importe où hors des deux cases. Posé sur la
        // scène en capture, pour passer avant les boutons — sinon cliquer un
        // autre nombre ouvrirait le suivant sans refermer le précédent.
        const scene = container.querySelector('.pp-scene');
        if (scene && ouvert) {
            scene.addEventListener('pointerdown', (ev) => {
                if (!ouvert) return;
                if (ev.target.closest('[data-ouvre]')) return;
                ouvert = null;
                render();
            }, { capture: true, once: true });
        }

        const v = container.querySelector('[data-valider]');
        if (v) v.onclick = validerResultat;
        container.querySelectorAll('[data-res]').forEach(c => {
            c.onclick = () => { resActif = c.dataset.res; render(); };
        });
        container.querySelectorAll('[data-touche]').forEach(b => {
            b.onclick = () => taper(b.dataset.touche);
        });

        // LE CLAVIER PHYSIQUE MARCHE AUSSI. Le pavé est là pour le téléphone ;
        // sur un ordinateur, taper reste plus rapide que viser des boutons, et
        // s'en priver serait un choix de personne. Le conteneur doit pouvoir
        // recevoir le focus pour entendre les touches : `tabIndex = -1` le rend
        // focusable au clic sans l'insérer dans l'ordre de tabulation, où il
        // n'aurait rien à faire.
        container.tabIndex = -1;
        container.onkeydown = (ev) => {
            if (!fini || session.locked) return;
            if (document.activeElement && document.activeElement.matches('[data-fac]')) return;
            if (/^[0-9]$/.test(ev.key)) { ev.preventDefault(); return taper(ev.key); }
            if (ev.key === 'Backspace') { ev.preventDefault(); return taper('←'); }
            if (ev.key === 'Enter') { ev.preventDefault(); return validerResultat(); }
            if (ev.key === '/' || ev.key === 'ArrowDown') {
                ev.preventDefault(); resActif = 'd'; return render();
            }
            if (ev.key === 'ArrowUp') { ev.preventDefault(); resActif = 'n'; render(); }
        };
    }

    /**
     * UNE TOUCHE DU PAVÉ.
     *
     * QUATRE CHIFFRES AU PLUS : le plus grand résultat possible est un produit
     * de nombres à deux chiffres, donc il en tient quatre. Au-delà, ce n'est
     * plus un résultat, c'est une touche restée enfoncée.
     */
    function taper(k) {
        if (session.locked || !fini) return;
        if (k === '←') res[resActif] = res[resActif].slice(0, -1);
        else res[resActif] = (res[resActif] + k).slice(0, 4);
        render();
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
        // n'a plus qu'à barrer.
        verifierFin();
        // ON RESTE EN MODE DÉCOMPOSER. Le premier jet basculait tout seul sur
        // « barrer », en supposant que c'était le geste suivant. Rémy : « on
        // peut avoir 100 = 10 × 10 et on peut cliquer sur le 10 » — un facteur
        // qu'on vient d'écrire se décompose à son tour, et le basculement
        // automatique obligeait à revenir en arrière pour le faire. On ne
        // devine plus l'intention.
        render();
    }

    function verifierFin() {
        if (estFini(etat)) { fini = true; mode = 'decomposer'; choisi = null; }
    }

    function validerResultat() {
        if (destroyed || session.locked) return;
        if (!res.n || !res.d) return;
        const donnee = `${res.n}/${res.d}`;
        const result = session.submit(donnee, { element: container.querySelector('[data-expr]') });
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
            res = { n: '', d: '' };
            resActif = 'n';
            render();
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
            container.onkeydown = null;
            container.innerHTML = '';
            session.finish();
        }
    };
}
