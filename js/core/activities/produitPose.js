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
// UN SEUL PAVÉ NUMÉRIQUE POUR TOUT CE QUI S'ÉCRIT. Rémy : « quand on décompose
// on n'a pas le pavé numérique ». Les deux facteurs d'une décomposition et les
// deux nombres du résultat sont la même chose du point de vue du doigt : des
// chiffres à poser dans une case. Un `<input>` ferait monter le clavier du
// système, qui mange la moitié de l'écran — précisément la moitié où se trouve
// le calcul qu'on est en train de lire. Le pavé, lui, est dans la page.
//
// ET C'EST L'ÉLÈVE QUI DIT QUAND IL A FINI. Rémy : « c'est à l'élève de choisir
// s'il a fini de décomposer ». L'atelier basculait tout seul sur le résultat
// dès que plus rien ne se simplifiait — c'est-à-dire qu'il ANNONÇAIT la fin du
// travail, qui est justement ce qu'on demande de reconnaître.
//
// LE CALCUL VIT DANS `core/produitPose.js`, sans écran, où il se teste. Ici il
// n'y a que le dessin, les gestes, et la table de Pythagore.
//
// (Préfixe `pp-` : `fa-` appartient à l'addition posée, `fp-` à l'aperçu des
// fiches imprimées.)

import { hintBar, wireHint } from './choice.js';
import {
    etatInitial, decomposer, barrer, estFini, tousHaut, tousBas,
    decompositions, prochainGeste, resultat, PYTHAGORE_MAX
} from '../produitPose.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { showModal } from '../../ui/modal.js';

/** Les touches, dans l'ordre où on les lit — pas celui d'une calculatrice. */
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let item = null;
    let etat = null;
    let mode = 'decomposer';    // le geste armé : 'decomposer' ou 'barrer'
    let choisi = null;          // le jeton allumé, en mode barrer
    let phase = 'travail';      // 'travail' ou 'resultat' — c'est l'élève qui bascule
    let tableOuverte = null;

    // CE QU'ON EST EN TRAIN D'ÉCRIRE, décomposition ou résultat. Les deux ont
    // la même forme — deux cases et une case active — et c'est pour cela qu'un
    // seul pavé les sert.
    let saisie = null;          // { quoi, id?, cible?, a, b, actif }
    let cursor = null;
    let gate = null;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        demarrer();
    }

    function demarrer() {
        etat = etatInitial(item.meta.produit);
        mode = 'decomposer';
        choisi = null;
        phase = 'travail';
        saisie = null;
        render();
        // LE ROBOT FAIT L'EXERCICE — il ne le raconte pas. Voir `runDemo`.
        if (session.isDemo && !session.frozen) runDemo();
    }

    // --- Le dessin -------------------------------------------------------------

    /** Une case qu'on remplit au pavé. */
    const caseHtml = (k, etiquette) => `<button type="button"
        class="pp-caseres${saisie && saisie.actif === k ? ' pp-caseres--active' : ''}"
        data-case="${k}" aria-label="${etiquette}">${(saisie && saisie[k]) || ''}</button>`;

    const jetonHtml = (t, etage) => {
        // LE NOMBRE OUVERT DEVIENT DEUX CASES, à sa place exacte. Rémy : « on
        // clique sur le 33 et il apparaît … × … ». Elles remplacent le nombre
        // dans la ligne : on voit ce qu'on fait là où on le fait.
        //
        // ET LE NOMBRE RESTE ÉCRIT AU-DESSUS. Rémy : « juste rappeler à quoi
        // doit être égale la décomposition », puis « écris = 7 au-dessus ».
        // Deux cases vides au milieu d'un calcul ne disent pas ce qu'on
        // cherche — surtout au retour de la table de Pythagore ; et sous les
        // cases, l'étiquette se glissait entre elles et la barre de fraction,
        // où elle se lisait comme un morceau du calcul.
        if (saisie && saisie.quoi === 'decomposition' && saisie.id === t.id) {
            return `<span class="pp-ouvre" data-ouvre>
                <span class="pp-cible">= ${t.v}</span>
                <span class="pp-duo">
                    ${caseHtml('a', `premier facteur de ${t.v}`)}
                    <span class="pp-x">×</span>
                    ${caseHtml('b', `second facteur de ${t.v}`)}
                </span>
            </span>`;
        }
        const classes = ['pp-jeton', `pp-jeton--${etage}`];
        if (t.barre) classes.push('pp-jeton--barre');
        if (choisi === t.id) classes.push('pp-jeton--choisi');
        return `<button type="button" class="${classes.join(' ')}" data-jeton="${t.id}"
            ${t.barre ? 'aria-label="nombre barré, il vaut 1"' : ''}>${t.v}</button>`;
    };

    const etageHtml = (jetons, etage) => jetons
        .map(t => jetonHtml(t, etage))
        .join('<span class="pp-fois">×</span>');

    function expressionHtml() {
        const produit = etat.fractions.map((f, i) => `
            ${i ? '<span class="pp-op">×</span>' : ''}
            <span class="pp-frac">
                <span class="pp-num">${etageHtml(f.haut, 'haut')}</span>
                <span class="pp-den">${etageHtml(f.bas, 'bas')}</span>
            </span>`).join('');
        if (phase !== 'resultat') return produit;
        // LE RÉSULTAT S'ÉCRIT DANS LA MÊME LIGNE, après un « = ». Rémy : « mets
        // la fraction avec les produits et le = à côté quand on a barré ».
        //
        // LE « = » ET LA FRACTION NE SE SÉPARENT JAMAIS : ils forment un seul
        // bloc, qui passe à la ligne d'un bloc quand la largeur manque. Sur un
        // téléphone, un calcul décomposé occupe déjà toute la ligne — Rémy :
        // « cela fait un peu écrasé à droite » —, et un « = » resté seul en
        // bout de ligne serait pire que le retour à la ligne qu'il évite.
        return `${produit}
            <span class="pp-resultat">
                <span class="pp-op">=</span>
                <span class="pp-frac pp-frac--res">
                    <span class="pp-num">${caseHtml('a', 'numérateur du résultat')}</span>
                    <span class="pp-den">${caseHtml('b', 'dénominateur du résultat')}</span>
                </span>
            </span>`;
    }

    function render() {
        container.innerHTML = `
            <div class="pp-scene">
                <div class="game-question">${item.prompt.consigne || 'Simplifie, puis calcule.'}</div>
                <div class="pp-expr" data-expr>${expressionHtml()}</div>
                <p class="pp-note" data-note role="status"></p>
                <div class="pp-panneau">${saisie ? paveHtml() : outilsHtml()}</div>
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
                <button type="button" class="pp-outil" data-table>🔢 Table</button>
            </div>
            <p class="pp-aide-mode">${mode === 'decomposer'
        ? 'Clique un nombre : il s’ouvre en deux facteurs à écrire.'
        : 'Clique un nombre en haut, puis le même en bas.'}</p>
            <button type="button" class="pp-fini" data-fini>✅ J’ai fini de simplifier</button>`;
    }

    /**
     * LE PAVÉ, LE MÊME POUR LES DEUX SAISIES.
     *
     * Trois rangs qui remplissent exactement six colonnes : 1 à 6, puis 7-8-9-0
     * et l'effacement sur deux cases, puis les boutons. Une grille pleine se
     * vise du pouce sans regarder ; une grille trouée fait chercher.
     */
    function paveHtml() {
        const pret = saisie.a && saisie.b;
        const dec = saisie.quoi === 'decomposition';
        return `<p class="pp-bravo">${dec
            ? `Écris deux nombres dont le produit fait ${saisie.cible}.`
            : 'Multiplie ce qui n’est pas barré : le haut avec le haut, le bas avec le bas.'}</p>
            <div class="pp-pave" role="group" aria-label="Chiffres">
                ${DIGITS.map(k => `<button type="button" class="pp-touche"
                    data-touche="${k}">${k}</button>`).join('')}
                <button type="button" class="pp-touche pp-touche--del" data-touche="←"
                    aria-label="Effacer">⌫</button>
                ${dec ? '<button type="button" class="pp-touche pp-touche--annuler"'
                    + ' data-annuler>Annuler</button>' : ''}
                <button type="button" class="pp-touche pp-touche--ok${dec ? '' : ' pp-touche--large'}"
                    data-valider ${pret ? '' : 'disabled'}>Valider</button>
            </div>
            ${dec ? '<button type="button" class="pp-lien" data-table>'
                + '🔢 Table de Pythagore</button>' : ''}`;
    }

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
                render();
            };
        });
        container.querySelectorAll('[data-table]').forEach(b => { b.onclick = ouvrirTable; });
        container.querySelectorAll('[data-jeton]').forEach(b => {
            b.onclick = () => toucher(b.dataset.jeton);
        });
        container.querySelectorAll('[data-case]').forEach(c => {
            c.onclick = () => { if (saisie) { saisie.actif = c.dataset.case; render(); } };
        });
        container.querySelectorAll('[data-touche]').forEach(b => {
            b.onclick = () => taper(b.dataset.touche);
        });
        const annuler = container.querySelector('[data-annuler]');
        if (annuler) annuler.onclick = () => { saisie = null; note(''); render(); };
        const fin = container.querySelector('[data-fini]');
        if (fin) fin.onclick = declarerFini;
        const v = container.querySelector('[data-valider]');
        if (v) v.onclick = valider;

        // CLIQUER AILLEURS REMET LE NOMBRE. Rémy : « quand on clique ailleurs
        // ça remet ». C'était le seul geste sans issue de l'atelier. Le pavé
        // est exclu, évidemment : sans quoi taper un chiffre annulerait ce
        // qu'on est en train d'écrire.
        const scene = container.querySelector('.pp-scene');
        if (scene && saisie && saisie.quoi === 'decomposition') {
            scene.addEventListener('pointerdown', (ev) => {
                if (!saisie) return;
                if (ev.target.closest('[data-ouvre], .pp-panneau')) return;
                saisie = null;
                note('');
                render();
            }, { capture: true, once: true });
        }

        // LE CLAVIER PHYSIQUE MARCHE AUSSI. Le pavé est là pour le téléphone ;
        // sur un ordinateur, taper reste plus rapide que viser des boutons.
        // `tabIndex = -1` rend le conteneur focusable au clic sans l'insérer
        // dans l'ordre de tabulation, où il n'aurait rien à faire.
        container.tabIndex = -1;
        container.onkeydown = (ev) => {
            if (session.locked || !saisie) return;
            if (/^[0-9]$/.test(ev.key)) { ev.preventDefault(); return taper(ev.key); }
            if (ev.key === 'Backspace') { ev.preventDefault(); return taper('←'); }
            if (ev.key === 'Enter') { ev.preventDefault(); return valider(); }
            if (ev.key === 'Escape' && saisie.quoi === 'decomposition') {
                ev.preventDefault(); saisie = null; note(''); return render();
            }
            if (['ArrowRight', 'ArrowDown', '/', '*', 'x'].includes(ev.key)) {
                ev.preventDefault(); saisie.actif = 'b'; return render();
            }
            if (['ArrowLeft', 'ArrowUp'].includes(ev.key)) {
                ev.preventDefault(); saisie.actif = 'a'; render();
            }
        };
    }

    /**
     * UNE TOUCHE.
     *
     * QUATRE CHIFFRES AU PLUS : le plus grand résultat possible est un produit
     * de nombres à deux chiffres, donc il en tient quatre. Au-delà, ce n'est
     * plus un nombre, c'est une touche restée enfoncée.
     */
    function taper(k) {
        if (session.locked || !saisie) return;
        const cle = saisie.actif;
        if (k === '←') saisie[cle] = String(saisie[cle]).slice(0, -1);
        else saisie[cle] = (String(saisie[cle]) + k).slice(0, 4);
        // ON PASSE À LA SECONDE CASE TOUT SEUL quand la première tient déjà deux
        // chiffres — c'est le cas ordinaire, et revenir la chercher du doigt
        // pour rien fait perdre du temps. On y revient en la touchant.
        if (cle === 'a' && saisie[cle].length >= 2 && !saisie.b) saisie.actif = 'b';
        note('');
        render();
    }

    function toucher(id) {
        if (session.locked || phase === 'resultat') return;
        if (mode === 'decomposer') {
            const t = [...tousHaut(etat), ...tousBas(etat)].find(x => x.id === id);
            if (!t) return;
            if (t.barre) { note('Ce nombre est déjà barré : il vaut 1.'); return render(); }
            saisie = { quoi: 'decomposition', id, cible: t.v, a: '', b: '', actif: 'a' };
            choisi = null;
            return render();
        }

        // MODE BARRER. Le premier clic allume, le second raye — et il faut que
        // l'un soit en haut et l'autre en bas : barrer deux numérateurs
        // reviendrait à diviser le haut par lui-même sans toucher au bas, ce
        // qui change la fraction. C'est refusé, avec la raison.
        if (!choisi) { choisi = id; return render(); }
        if (choisi === id) { choisi = null; return render(); }

        const enHaut = (x) => tousHaut(etat).some(t => t.id === x);
        if (enHaut(choisi) === enHaut(id)) {
            note('Il faut un nombre EN HAUT et un EN BAS : barrer deux numérateurs '
                + 'diviserait le haut sans toucher au bas.');
            secouer();
            choisi = null;
            return render();
        }
        const [h, bas] = enHaut(choisi) ? [choisi, id] : [id, choisi];
        const r = barrer(etat, h, bas);
        choisi = null;
        if (!r.ok) { note(r.pourquoi); secouer(); return render(); }
        etat = r.etat;
        note('');
        render();
    }

    /** Valider ce qui est écrit — une décomposition, ou le résultat. */
    function valider() {
        if (!saisie || !saisie.a || !saisie.b) return;
        return saisie.quoi === 'decomposition' ? validerDecomposition() : validerResultat();
    }

    function validerDecomposition() {
        const r = decomposer(etat, saisie.id, saisie.a, saisie.b);
        if (!r.ok) {
            note(r.pourquoi);
            secouer();
            saisie.a = ''; saisie.b = ''; saisie.actif = 'a';
            return render();
        }
        etat = r.etat;
        saisie = null;
        note('');
        // ON RESTE EN MODE DÉCOMPOSER. Le premier jet basculait tout seul sur
        // « barrer », en supposant le geste suivant. Rémy : « on peut avoir
        // 100 = 10 × 10 et on peut cliquer sur le 10 » — un facteur qu'on vient
        // d'écrire se décompose à son tour, et le basculement obligeait à
        // revenir en arrière pour le faire.
        render();
    }

    /**
     * « J'AI FINI DE SIMPLIFIER » — et c'est l'élève qui le dit.
     *
     * Rémy : « c'est à l'élève de choisir s'il a fini de décomposer ». L'atelier
     * basculait tout seul dès que plus rien ne se simplifiait : il annonçait la
     * fin du travail, qui est précisément ce qu'on demande de reconnaître.
     *
     * SE TROMPER N'EST PAS COMPTÉ. On dit qu'il reste quelque chose, on ne dit
     * pas quoi — et le seul geste noté reste le résultat final. Sans ce
     * garde-fou, l'élève qui se croit arrivé écrirait 12/18, une réponse juste
     * en valeur mais comptée fausse, sans jamais savoir pourquoi.
     */
    function declarerFini() {
        if (session.locked) return;
        if (!estFini(etat)) {
            note('Pas encore : il reste un facteur commun entre le haut et le bas. '
                + 'Cherche en diagonale, et décompose si rien n’est écrit deux fois.');
            secouer();
            return;
        }
        phase = 'resultat';
        choisi = null;
        saisie = { quoi: 'resultat', a: '', b: '', actif: 'a' };
        note('');
        render();
    }

    function validerResultat() {
        if (destroyed || session.locked) return;
        const donnee = `${saisie.a}/${saisie.b}`;
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
            saisie = { quoi: 'resultat', a: '', b: '', actif: 'a' };
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
        const allume = choisi
            ? ([...tousHaut(etat), ...tousBas(etat)].find(x => x.id === choisi) || {}).v
            : null;
        const cible = (saisie && saisie.quoi === 'decomposition') ? saisie.cible : allume;
        tableOuverte = showModal('La table de Pythagore', tableHtml(cible ?? null),
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
                corps += `<td class="${cible !== null && v === cible ? 'pp-c-cible' : ''}">${v}</td>`;
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

    // --- LE ROBOT ---------------------------------------------------------------
    //
    // Rémy : « Le robot fait juste un long texte illisible, il faut qu'il
    // agisse. » Il avait raison, et le défaut était de principe : l'aide de cet
    // atelier était trois paragraphes qui DÉCRIVAIENT la méthode — décomposer,
    // barrer, multiplier ce qui reste — devant un écran où ces trois gestes
    // sont des boutons. On expliquait par écrit ce qu'il suffisait de faire.
    //
    // Le robot joue donc la partie : il choisit le mode, clique les jetons,
    // écrit les facteurs au pavé, barre, et s'arrête devant le résultat. Chaque
    // geste est annoncé d'une phrase courte, accrochée AU NOMBRE dont elle
    // parle — c'est le pointeur qui dit « celui-là », pas le texte.
    //
    // IL NE VALIDE PAS LA DERNIÈRE CASE. Une démonstration qui répond à la
    // place de l'élève lui retire la seule chose qu'on lui demande ; elle
    // s'arrête au moment où il n'y a plus qu'à multiplier, et le dit.
    //
    // LE CHOIX DU GESTE N'EST PAS ICI : `prochainGeste` vit dans le noyau, où
    // il se teste sans écran — et l'on peut mesurer qu'il termine sur les
    // quatre marches.

    /** Un appui montré, puis joué. Le pointeur n'émet pas de vrai clic. */
    async function appuyer(selecteur, action) {
        const el = container.querySelector(selecteur);
        if (!el || destroyed) return false;
        if (!await cursor.tap(el, DEMO_SPEED.move)) return false;
        if (destroyed) return false;
        action();
        return !destroyed;
    }

    /** Écrire un nombre au pavé, chiffre par chiffre. */
    async function ecrire(nombre) {
        for (const c of String(nombre)) {
            if (!await appuyer(`[data-touche="${c}"]`, () => taper(c))) return false;
        }
        return true;
    }

    async function runDemo() {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const souffler = (ms) => cursor.pause(ms);
        const vise = (sel) => container.querySelector(sel);

        if (!await gate.waitTurn() || destroyed) return;
        if (!await souffler(600) || destroyed) return;
        cursor.say('Tout ce qui est en haut se multiplie, tout ce qui est en bas aussi.',
            vise('[data-expr]'));
        if (!await souffler(DEMO_SPEED.settle) || destroyed) return;

        // Douze tours au plus : `prochainGeste` termine, mais une boucle qui
        // pilote une interface ne se laisse jamais sans garde-fou.
        for (let tour = 0; tour < 12 && !estFini(etat); tour++) {
            const geste = prochainGeste(etat);
            if (!geste || destroyed) break;

            if (geste.quoi === 'barrer') {
                if (mode !== 'barrer' && !await appuyer('[data-mode="barrer"]', () => {
                    mode = 'barrer'; choisi = null; render();
                })) return;
                if (!await gate.waitTurn() || destroyed) return;
                cursor.say(`${geste.haut.v} est écrit en haut ET en bas : je le barre.`,
                    vise(`[data-jeton="${geste.haut.id}"]`));
                if (!await souffler(DEMO_SPEED.settle) || destroyed) return;
                if (!await appuyer(`[data-jeton="${geste.haut.id}"]`,
                    () => toucher(geste.haut.id))) return;
                if (!await appuyer(`[data-jeton="${geste.bas.id}"]`,
                    () => toucher(geste.bas.id))) return;
            } else {
                if (mode !== 'decomposer' && !await appuyer('[data-mode="decomposer"]', () => {
                    mode = 'decomposer'; choisi = null; render();
                })) return;
                if (!await gate.waitTurn() || destroyed) return;
                cursor.say(`Aucun nombre n’est écrit deux fois. Mais ${geste.v} = `
                    + `${geste.x} × ${geste.y} : je le décompose.`,
                    vise(`[data-jeton="${geste.id}"]`));
                if (!await souffler(DEMO_SPEED.settle) || destroyed) return;
                if (!await appuyer(`[data-jeton="${geste.id}"]`, () => toucher(geste.id))) return;
                if (!await ecrire(geste.x)) return;
                // La seconde case s'arme toute seule quand la première tient
                // déjà deux chiffres : on ne la vise que si elle ne l'est pas.
                if (saisie && saisie.actif !== 'b'
                    && !await appuyer('[data-case="b"]', () => { saisie.actif = 'b'; render(); })) return;
                if (!await ecrire(geste.y)) return;
                if (!await appuyer('[data-valider]', valider)) return;
            }
            if (!await souffler(320) || destroyed) return;
        }

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say('Plus rien à barrer. Je multiplie ce qui reste.', vise('[data-fini]'));
        if (!await souffler(DEMO_SPEED.settle) || destroyed) return;
        if (!await appuyer('[data-fini]', declarerFini)) return;

        const r = resultat(etat);
        if (!await ecrire(r.n)) return;
        if (saisie && saisie.actif !== 'b'
            && !await appuyer('[data-case="b"]', () => { saisie.actif = 'b'; render(); })) return;
        if (!await ecrire(r.d)) return;

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say(`${r.n} sur ${r.d} : tout ce qui restait, en haut et en bas.`,
            vise('[data-expr]'));
        if (!await souffler(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    if (opts.item) { item = opts.item; demarrer(); } else renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (tableOuverte) { tableOuverte.close(); tableOuverte = null; }
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.onkeydown = null;
            container.innerHTML = '';
            session.finish();
        }
    };
}
