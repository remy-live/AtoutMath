// ÉCRIRE UNE EXPRESSION RÉDUITE — le clavier avec les boutons carré et cube.
//
// Rémy : « mets des boutons carrés voire cube ».
//
// UN CLAVIER, PAS UN QCM, ET C'EST TOUT L'EXERCICE. Reconnaître « 3x² − 10x »
// parmi quatre lignes ne prouve pas qu'on sache l'écrire — or c'est écrire
// qu'on demandera au contrôle, et c'est en écrivant qu'on bute sur les vraies
// questions : où va le signe ? le nombre avant ou après la lettre ? l'exposant
// bouge-t-il quand on additionne ?
//
// UN CLAVIER DÉDIÉ, PAS LE CLAVIER DU SYSTÈME. Sur une tablette, ² et ³
// n'existent tout simplement pas ; sur un ordinateur, ils demandent une
// combinaison que personne ne connaît. Un exercice sur les puissances où l'on
// ne peut pas taper une puissance n'est pas un exercice, c'est une devinette
// sur l'écriture de substitution. Les touches sont donc là, grandes, à côté du
// champ.
//
// LE CLAVIER PHYSIQUE MARCHE AUSSI, et il accepte `x^2` comme `x2` : voir
// `normaliser` dans core/reductionPuissances.js. Un élève qui tape ce qu'il a
// sous les doigts ne doit pas être corrigé sur son clavier.
//
// LE BOUTON x³ N'APPARAÎT QUE QUAND LA QUESTION PEUT EN VOULOIR UN. Offrir une
// touche dont on sait qu'elle donnera une réponse fausse, c'est tendre un
// piège avec l'outil qu'on prête — et l'élève apprend alors à se méfier de
// l'interface plutôt qu'à réfléchir.
//
// ── ET QUAND LA QUESTION EST TROP GROSSE POUR UNE SEULE RÉPONSE ────────────
//
// RÉMY : « Pour les factorisations compliqué du genre (x+3)² − (3x + 5)², on
// pourrait proposer plusieurs étapes non ? »
//
// Oui, et c'est le cœur du problème de ces questions-là : elles ne sont pas
// difficiles, elles sont LONGUES. Qui échoue sur (x + 3)² − (3x + 5)² n'a
// généralement pas raté l'identité — il a perdu un signe en réduisant
// a − b, trois lignes plus bas. Un « faux » sur la réponse entière ne dit ni
// où ni quoi, et la correction arrive toute faite.
//
// Un item peut donc apporter `meta.etapes` : la question s'écrit alors ligne
// à ligne, chacune validée sur place. SEULE LA DERNIÈRE COMPTE POUR LA
// SÉANCE — c'est la règle que `fractionsPose` a déjà posée pour le calcul
// posé, et pour la même raison : les précédentes sont l'ÉCRITURE du
// raisonnement, pas quatre questions déguisées. Les noter ferait valoir une
// question quatre points de statistiques, et le carnet d'erreurs parlerait
// de « a − b » sans dire de quelle expression.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { memeReponse, normaliser } from '../reductionPuissances.js';

const echapper = (t) => String(t).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Au bout de trois essais sur une MÊME étape, on la donne et l'on avance.
 *
 * Sans cela, une étape ratée est un cul-de-sac : la question n'est jamais
 * soumise, la séance ne bouge plus, et l'élève est coincé sur une ligne
 * intermédiaire qui ne vaut même pas de point. Trois essais, puis on écrit la
 * ligne à sa place et on passe à la suivante : il continue l'exercice.
 */
const ESSAIS_PAR_ETAPE = 3;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let saisie = '';
    let avis = opts.avis || '';
    let cursor = null;
    let gate = null;
    // L'étape en cours, et combien de fois on s'est trompé dessus.
    let rang = 0;
    let ratages = 0;

    function renderNext() {
        if (destroyed) return;
        const item = session.next();
        if (opts.rendreLaMain && opts.rendreLaMain(item)) return;
        render(item);
    }

    function render(item) {
        const m = item.meta || {};
        const lettre = m.lettre || 'x';
        const degreMax = m.degreMax || 2;
        saisie = '';
        // LA DERNIÈRE ÉTAPE EST LA QUESTION ELLE-MÊME, et l'item n'a pas à la
        // répéter : on l'ajoute ici, avec le juge et la réponse qu'il porte
        // déjà. Un item sans `etapes` se comporte exactement comme avant.
        const etapes = (m.etapes || []).length
            ? [...m.etapes, { titre: 'La réponse, jusqu\'au bout', finale: true }]
            : [];
        rang = 0;
        ratages = 0;

        // LES TOUCHES, RANGÉES COMME ON ÉCRIT. La lettre et ses puissances
        // d'abord — c'est ce qui distingue cet exercice —, puis les signes,
        // puis les chiffres. Un pavé numérique en tête aurait fait croire à un
        // calcul.
        const touches = [
            { t: lettre, cls: 'ls-t--lettre' },
            { t: `${lettre}²`, cls: 'ls-t--lettre', dit: 'Le carré' },
            ...(degreMax >= 3 ? [{ t: `${lettre}³`, cls: 'ls-t--lettre', dit: 'Le cube' }] : []),
            { t: '+', cls: 'ls-t--signe' },
            { t: '−', cls: 'ls-t--signe', dit: 'Moins' },
            // LES PARENTHÈSES N'APPARAISSENT QUE SI LA RÉPONSE PEUT EN VOULOIR.
            // Même règle que pour la touche x³ : offrir une touche dont on
            // sait qu'elle donnera une réponse fausse, c'est tendre un piège
            // avec l'outil qu'on prête. Une factorisation en a besoin, une
            // expression réduite jamais.
            ...(m.parentheses ? [
                { t: '(', cls: 'ls-t--signe', dit: 'Ouvrir une parenthèse' },
                { t: ')', cls: 'ls-t--signe', dit: 'Fermer la parenthèse' }
            ] : []),
            ...'0123456789'.split('').map(c => ({ t: c, cls: 'ls-t--chiffre' }))
        ];

        const touche = (o) => `<button type="button" class="ls-t ${o.cls}" data-t="${echapper(o.t)}"
            ${o.dit ? `title="${echapper(o.dit)}"` : ''}>${echapper(o.t)}</button>`;

        // LA FRISE DES ÉTAPES. Elle est à côté de l'énoncé et non au-dessus du
        // pavé : c'est le raisonnement qui s'écrit, pas une barre d'avancement.
        // Ce qui est fait reste LISIBLE — l'élève doit pouvoir relire son
        // a − b en écrivant a + b, sans quoi on lui demande de le retenir, ce
        // qui n'est pas la question posée.
        const friseHtml = etapes.length ? `
            <ol class="ls-etapes" data-etapes>
                ${etapes.map((e, i) => `
                    <li class="ls-etape" data-etape="${i}">
                        <span class="ls-etape-titre">${echapper(e.titre)}</span>
                        <span class="ls-etape-val" data-val="${i}"></span>
                    </li>`).join('')}
            </ol>` : '';

        // L'HÔTE PORTE LE CONTENEUR DE REQUÊTE, PAS LE GABARIT. Un élément
        // n'est jamais son propre conteneur : `@container` posé sur
        // `.ls-layout`, qui déclarait `container-type`, ne s'appliquait donc
        // jamais à lui — mesuré, la règle deux colonnes ne prenait pas.
        container.innerHTML = `
          <div class="ls-hote">
            <div class="ls-layout${etapes.length ? ' ls-layout--etapes' : ''}">
                <div class="ls-contexte">
                    ${avis ? `<div class="ls-avis">${avis}</div>` : ''}
                    ${item.prompt.html}
                    ${friseHtml}
                </div>
                <div class="ls-panel">
                    <div class="ls-champ" aria-live="polite" data-champ>
                        <span class="ls-texte" data-texte></span><span class="ls-curseur"></span>
                    </div>
                    <div class="ls-clavier">${touches.map(touche).join('')}</div>
                    <div class="ls-actions">
                        <button type="button" class="ls-eff" data-eff aria-label="Effacer le dernier signe">⌫</button>
                        <button type="button" class="ls-valider" data-valider disabled>Valider</button>
                    </div>
                    <div class="ls-note" data-note></div>
                    ${hintBar(session)}
                </div>
            </div>
          </div>`;

        avis = '';
        const champ = container.querySelector('[data-champ]');
        const texteEl = container.querySelector('[data-texte]');
        const btnValider = container.querySelector('[data-valider]');
        const noteEl = container.querySelector('[data-note]');

        const redessiner = () => {
            texteEl.textContent = saisie;
            champ.classList.remove('ls-champ--ok', 'ls-champ--ko');
            champ.classList.toggle('ls-champ--vide', saisie === '');
            noteEl.textContent = '';
            btnValider.disabled = saisie.trim() === '';
        };
        const taper = (t) => { saisie += t; redessiner(); };
        const effacer = () => {
            // ON EFFACE LE SIGNE, PAS LE CARACTÈRE. « x² » se tape d'une
            // touche : l'effacer en deux coups — d'abord le ², puis le x —
            // serait défaire un geste qu'on n'a pas fait.
            saisie = saisie.replace(/(\s*[+−]\s*|[a-zA-Z][⁰¹²³⁴⁵⁶⁷⁸⁹]?|.)$/u, '');
            redessiner();
        };
        redessiner();

        if (session.isDemo) {
            // LA DÉMONSTRATION SUIT LES MÊMES ÉTAPES QUE L'ÉLÈVE. Montrer la
            // réponse finale apparaître d'un coup sur une question découpée en
            // quatre lignes enseignerait exactement ce que le découpage sert à
            // défaire : que le résultat se devine.
            if (!session.frozen) runDemo(item, taper, champ, etapes, container);
            return;
        }

        wireHint(container, session);

        // CE QU'ON MONTRE QUAND ON DONNE LA RÉPONSE — et ce n'était pas elle.
        //
        // `item.answer` est la valeur qu'on SOUMET, pas celle qu'on LIT. Un QCM
        // dont les propositions portent des expressions ne peut pas se servir
        // de l'expression comme valeur : elle changerait à chaque tirage, et
        // deux écritures justes vaudraient deux valeurs différentes. Les deux
        // chapitres de calcul littéral posent donc la sentinelle `'ok'`, et le
        // champ affichait « ok » à l'élève qui séchait — mesuré sur le banc,
        // sur fac-1 comme sur dev-1, à chaque révélation et dans la
        // démonstration, qui tapait o puis k sur un pavé qui n'a ni l'un ni
        // l'autre.
        //
        // `reponsePapier` porte déjà exactement ça : « la réponse telle qu'on
        // l'écrit ». On la lit ici, et l'on retombe sur `answer` pour les
        // exercices dont la réponse EST sa propre valeur.
        const aMontrer = String(item.reponsePapier || item.answer || '');

        // ── LA FRISE, SI L'ITEM EN A UNE ────────────────────────────────

        const marquerEtapes = () => {
            if (!etapes.length) return;
            etapes.forEach((e, i) => {
                const li = container.querySelector(`[data-etape="${i}"]`);
                if (!li) return;
                li.classList.toggle('ls-etape--faite', i < rang);
                li.classList.toggle('ls-etape--active', i === rang);
                li.classList.toggle('ls-etape--attente', i > rang);
            });
            // L'ÉTAPE EN COURS DOIT ÊTRE VISIBLE, et sur un téléphone elle ne
            // l'était pas : l'énoncé et la frise défilent dans leur propre
            // zone, et la ligne active se retrouvait coupée par le bord bas —
            // vu à l'écran sur fac-7-pas, dont l'énoncé tient sur deux lignes.
            // On l'amène sous les yeux à chaque changement d'étape.
            const actif = container.querySelector('.ls-etape--active');
            if (actif && actif.scrollIntoView) {
                actif.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            }
            // LE PAVÉ NE CHANGE PAS D'UNE ÉTAPE À L'AUTRE, et c'est réfléchi.
            //
            // J'avais commencé par masquer les parenthèses sur les étapes qui
            // attendent une expression réduite. Deux raisons de ne pas le
            // faire. La grille du clavier est en cinq colonnes : retirer deux
            // touches redistribue toutes les autres, et le doigt qui visait le
            // « 7 » tombe sur le « 5 » — un clavier qui bouge sous la main est
            // pire qu'une touche inutile. Et surtout, elles ne nuisent pas :
            // le juge compare des POLYNÔMES, donc « (x + 3) » vaut « x + 3 »
            // et passe. Une parenthèse en trop n'est pas une faute de
            // mathématiques, et rien ne justifie de la traiter comme telle.
        };

        /** Écrit la ligne d'une étape dans la frise, et la ferme. */
        const poserEtape = (i, texte, donnee) => {
            const cel = container.querySelector(`[data-val="${i}"]`);
            if (cel) {
                cel.textContent = texte;
                cel.classList.toggle('ls-etape-val--donnee', !!donnee);
            }
        };

        const etapeSuivante = () => {
            rang += 1;
            ratages = 0;
            saisie = '';
            redessiner();
            marquerEtapes();
        };

        marquerEtapes();

        const validerEtape = () => {
            const e = etapes[rang];
            const v = e.verifie ? e.verifie(saisie) : false;
            const ok = typeof v === 'object' ? !!v.juste : !!v;
            if (ok) {
                // ON ÉCRIT CE QUE L'ÉLÈVE A TAPÉ, pas la forme canonique : s'il a
                // écrit « 3 + x » là où le corrigé dit « x + 3 », il a raison,
                // et remplacer son écriture par la nôtre lui laisserait croire
                // le contraire.
                poserEtape(rang, saisie.trim(), false);
                champ.classList.add('ls-champ--ok');
                regTimeout(() => { if (!destroyed) etapeSuivante(); }, 700);
                return;
            }
            ratages += 1;
            champ.classList.add('ls-champ--ko');
            if (ratages >= ESSAIS_PAR_ETAPE) {
                poserEtape(rang, String(e.montrer || ''), true);
                noteEl.textContent = 'On la pose ensemble, et on continue : '
                    + `${e.titre.toLowerCase()} vaut ${e.montrer}.`;
                regTimeout(() => { if (!destroyed) etapeSuivante(); }, 2200);
                return;
            }
            noteEl.textContent = (typeof v === 'object' && v.pourquoi)
                || e.aide || 'Ce n\'est pas cela. Relis l\'étape précédente.';
        };

        const valider = () => {
            if (destroyed || !saisie.trim()) return;
            // UNE ÉTAPE INTERMÉDIAIRE NE PASSE PAS PAR LA SÉANCE. Voir l'en-tête :
            // elle s'écrit, elle se corrige, elle ne se note pas.
            if (etapes.length && !etapes[rang].finale) return validerEtape();
            // L'ITEM JUGE LUI-MÊME QUAND IL SAIT LE FAIRE. Comparer des
            // chaînes suffit pour une expression réduite, dont l'écriture est
            // canonique ; pas pour une factorisation, où (x − 3)(x + 3) et
            // (x + 3)(x − 3) sont tous deux justes.
            const verdict = item.verifieTexte ? item.verifieTexte(saisie) : null;
            const juste = verdict !== null
                ? (typeof verdict === 'object' ? !!verdict.juste : !!verdict)
                : memeReponse(saisie, item.answer);
            const pourquoi = (verdict && typeof verdict === 'object' && verdict.pourquoi) || '';
            // ON SOUMET LA FORME NORMALISÉE quand elle est juste : le journal
            // et le carnet d'erreurs n'ont pas à conserver quinze écritures du
            // même résultat selon que l'élève a mis des espaces ou non.
            const result = session.submit(juste ? String(item.answer) : saisie, { element: champ });
            if (result.ignored) return;

            champ.classList.toggle('ls-champ--ok', result.correct);
            champ.classList.toggle('ls-champ--ko', !result.correct);
            if (result.correct && etapes.length) {
                poserEtape(etapes.length - 1, saisie.trim(), false);
            }
            // L'ITEM SAIT SOUVENT MIEUX POURQUOI C'EST FAUX que le
            // diagnostic générique : « c'est bien égal, mais ce n'est pas
            // factorisé » ne se devine pas d'une comparaison de chaînes.
            noteEl.textContent = result.correct ? ''
                : (pourquoi || diagnostiquer(saisie, item));

            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct) return renderNext();
                if (result.revealed) {
                    saisie = aMontrer;
                    texteEl.textContent = saisie;
                    if (etapes.length) poserEtape(etapes.length - 1, saisie, true);
                    champ.classList.remove('ls-champ--ko');
                    champ.classList.add('ls-champ--ok');
                    regTimeout(renderNext, 1800);
                } else {
                    // ON NE VIDE PAS LE CHAMP. L'élève a souvent écrit la
                    // moitié juste ; tout effacer l'oblige à retaper ce qu'il
                    // avait bon, et c'est là qu'il finit par se tromper deux
                    // fois. Il corrige ce qu'il veut avec la touche ⌫.
                    champ.classList.remove('ls-champ--ko');
                }
            });
        };

        container.querySelectorAll('[data-t]').forEach(b => {
            b.onclick = () => { if (!session.locked) taper(b.dataset.t); };
        });
        container.querySelector('[data-eff]').onclick = () => { if (!session.locked) effacer(); };
        btnValider.onclick = valider;

        container.tabIndex = -1;
        container.focus({ preventScroll: true });
        container.onkeydown = (e) => {
            if (session.locked) return;
            if (e.key === 'Enter') { valider(); e.preventDefault(); return; }
            if (e.key === 'Backspace') { effacer(); e.preventDefault(); return; }
            // Le clavier physique accepte tout ce que `normaliser` sait relire :
            // chiffres, lettres, `^`, et le trait d'union comme signe moins.
            if (/^[0-9a-zA-Z+^]$/.test(e.key)) { taper(e.key); e.preventDefault(); }
            else if (e.key === '-') { taper('−'); e.preventDefault(); }
        };
    }

    /**
     * NOMMER L'ERREUR, PAS LA CONSTATER.
     *
     * « Faux » n'apprend rien. Les deux fautes du chapitre voyagent dans
     * l'item (`meta.pieges`) avec leur explication : si l'élève est tombé dans
     * l'une d'elles, on lui dit LAQUELLE. Sinon, on lui rappelle la règle du
     * tri par sacs, qui est la seule règle qu'il y ait.
     */
    function diagnostiquer(donne, item) {
        const pieges = (item.meta && item.meta.pieges) || [];
        const n = normaliser(donne);
        const touche = pieges.find(p => normaliser(p.value) === n);
        if (touche) return touche.why;
        if (normaliser(item.prompt.text.split(':').pop()) === n) {
            return 'C\'est l\'expression de départ, recopiée : il reste quelque chose à regrouper.';
        }
        return 'Range chaque terme dans son sac, puis additionne les nombres de devant — '
            + 'l\'exposant, lui, ne bouge pas.';
    }

    /** La démonstration : le robot trie à voix haute avant d'écrire. */
    async function runDemo(item, taper, champ, etapes = [], hote = container) {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        const contexte = container.querySelector('.ls-contexte');
        cursor.say('Je range d\'abord chaque terme dans son sac : les carrés avec les carrés, '
            + 'les lettres simples ensemble, les nombres ensemble.', contexte || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say('Dans un sac, j\'additionne les nombres de devant. L\'exposant, lui, ne '
            + 'bouge jamais.', container.querySelector('.ls-clavier') || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;

        // ON TAPE LA RÉPONSE SIGNE PAR SIGNE, en visant les vraies touches :
        // c'est le geste que l'élève devra refaire, et le voir fait vaut mieux
        // que le voir apparaître.
        const ecrire = async (texte) => {
            for (const c of String(texte)) {
                if (destroyed) return false;
                const btn = hote.querySelector(`[data-t="${CSS.escape(c)}"]`);
                if (btn && !btn.hidden) { if (!await cursor.tap(btn)) return false; }
                taper(c);
                if (!await cursor.pause(DEMO_SPEED.settle / 2) || destroyed) return false;
            }
            return true;
        };

        for (let i = 0; i < etapes.length - 1; i++) {
            const e = etapes[i];
            const li = hote.querySelector(`[data-etape="${i}"]`);
            if (!await gate.waitTurn() || destroyed) return;
            cursor.say(e.aide || e.titre, li || champ);
            if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
            if (!await ecrire(e.montrer || '')) return;
            const cel = hote.querySelector(`[data-val="${i}"]`);
            if (cel) cel.textContent = String(e.montrer || '');
            saisieDemoRAZ(taper);
            if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;
        }

        if (!await ecrire(item.reponsePapier || item.answer || '')) return;

        if (!await gate.waitTurn() || destroyed) return;
        champ.classList.add('ls-champ--ok');
        cursor.say(item.explanation || '', champ);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
    }

    /**
     * Vide le champ de la démonstration entre deux étapes.
     *
     * `taper` est la seule prise que `runDemo` a sur la saisie — il n'en a pas
     * une pour effacer. On remet donc la variable à vide et l'on redessine par
     * un `taper('')`, qui ne change rien d'autre.
     */
    function saisieDemoRAZ(taper) { saisie = ''; taper(''); }

    if (opts.item) render(opts.item); else renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.onkeydown = null;
            container.innerHTML = '';
        }
    };
}
