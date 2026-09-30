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
// LA TOUCHE « FOIS » PORTE LA NOTATION CHOISIE — voir `js/core/signeFois.js`.
import { glypheFois } from '../signeFois.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { jugerEtape } from '../ligneEtape.js';
import { memeReponse, normaliser, groupesSemblables }
    from '../reductionPuissances.js';

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

/**
 * TROIS COULEURS SUFFISENT, et ce n'est pas un chiffre rond pris au hasard :
 * une expression du second degré n'a que trois espèces de termes — les x², les
 * x, les nombres. Au-delà, on tourne plutôt que d'inventer une quatrième
 * couleur qui ne se distinguerait plus des trois autres.
 */
const NUANCES_SEMBLABLES = 3;

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
            ? [...m.etapes,
                { titre: m.titreFinal || 'La réponse, jusqu\'au bout', finale: true }]
            : [];
        rang = 0;
        ratages = 0;

        // ── LE PAVÉ, RANGÉ PAR NATURE ───────────────────────────────────
        //
        // RÉMY : « le pavé n'est pas cohérent, il faut trier 2 lignes de
        // chiffres, le +, −, parenthèses et les x non ? »
        //
        // Il décrit exactement ce qui n'allait pas. Les dix-sept touches
        // coulaient dans une grille de CINQ colonnes, dans l'ordre où on les
        // avait listées — si bien que les rangées coupaient les familles au
        // milieu :
        //
        //   x  x²  x³  +  −          ← la lettre et les signes mélangés
        //   (  )   0   1  2          ← les parenthèses collées aux chiffres
        //   3  4   5   6  7
        //   8  9                     ← et une dernière rangée à deux touches
        //
        // Un pavé se lit par familles, pas par remplissage : on cherche « le
        // 7 » dans le bloc des chiffres, « la parenthèse » dans celui des
        // signes. Une rangée qui commence par « ( » et finit par « 2 »
        // n'aide pas à trouver, elle oblige à relire.
        //
        // Trois rangées, donc, une par nature : la lettre et ses puissances,
        // les signes, puis les chiffres sur DEUX rangées de cinq — 0 à 4 puis
        // 5 à 9, comme sur une calculatrice. Les rangées courtes se centrent,
        // et leurs touches gardent la largeur d'une touche de chiffre : deux
        // touches étalées sur toute la ligne ne ressembleraient plus à un
        // clavier.
        // LE PAVÉ S'ADAPTE AU CHAPITRE — et il le faut : Rémy a demandé le pas à
        // pas pour les racines, les fractions et les puissances, où l'on ne
        // tape ni x ni x². Une touche « x » sur une ligne de racines est une
        // touche dont on SAIT qu'elle donnera une réponse fausse : c'est la
        // règle déjà posée pour le cube et les parenthèses, et elle vaut ici.
        const rangees = [
            [
                ...(m.lettre === null ? [] : [{ t: lettre, cls: 'ls-t--lettre' }]),
                // LA TOUCHE EST « ² », PAS « x² », ET C'EST UN CORRECTIF.
                //
                // Une touche qui écrivait `x²` d'un coup ne savait élever au
                // carré QUE la lettre. La chaîne du barreau 3 commence par
                // « on écrit les deux carrés » — (3 − 4x)² − 1² —, et ce
                // carré-là porte sur une parenthèse et sur un nombre. Mesuré
                // au banc : « touche manquante : ² ». La première ligne de
                // l'exercice était intapable.
                //
                // Une touche, un geste : « ² » élève au carré ce qui vient
                // d'être écrit, quel qu'il soit. C'est aussi plus cohérent —
                // deux touches qui produisent toutes deux un carré, l'une
                // seulement après un x, était exactement le genre de pavé que
                // Rémy a trouvé illisible.
                // LE CARRÉ NON PLUS N'EST PAS DE TOUS LES CHAPITRES : une
                // ligne de racines ou de fractions n'en veut jamais, et
                // « √5² » est précisément la faute qu'on éviterait de rendre
                // tapable.
                ...(m.carre === false ? []
                    : [{ t: '²', cls: 'ls-t--lettre ls-t--expo', dit: 'Au carré' }]),
                ...(degreMax >= 3
                    ? [{ t: '³', cls: 'ls-t--lettre ls-t--expo', dit: 'Au cube' }] : []),
                // LA RACINE EST DESSINÉE, PAS TAPÉE — voir maths/formule.js :
                // la police Outfit n'a aucun glyphe √, et celui qu'on voyait
                // venait d'une police de secours choisie par le système. Sur
                // la touche, le caractère suffit : c'est un bouton, pas une
                // formule. Ce que l'élève ÉCRIT, lui, passe par le module.
                ...(m.racine ? [{ t: '√', cls: 'ls-t--lettre', dit: 'Racine carrée' }] : [])
            ],
            [
                { t: '+', cls: 'ls-t--signe' },
                { t: '−', cls: 'ls-t--signe', dit: 'Moins' },
                // LE SIGNE × N'APPARAÎT QUE SI UNE LIGNE PEUT EN VOULOIR.
                // Même règle que le cube et les parenthèses : une touche
                // offerte est une touche qu'on croit utile. Seul le pas à pas
                // du développement en a besoin — « x×x + x×(−7) + … » —, et
                // une réponse réduite n'en porte jamais.
                // LA TOUCHE PORTE LA NOTATION CHOISIE, ET ÉCRIT CE QU'ELLE
                // PORTE. Rémy : « évidemment ce rendu est valable dans les
                // écritures et input ». Une touche qui montre « · » et écrit
                // « × » ferait mentir le champ de saisie d'un caractère — et
                // c'est celui que l'élève est en train d'apprendre.
                // LES TROIS SE LISENT DE TOUTE FAÇON (voir maths/formule.js) :
                // le réglage ne peut donc pas casser une réponse juste.
                ...(m.multiplication
                    ? [{ t: glypheFois(), cls: 'ls-t--signe', dit: 'Multiplié par' }] : []),
                // LA BARRE DE FRACTION S'ÉCRIT « / » ET SE DESSINE EN COLONNE.
                // Rémy, à propos des formules : « même pour les fractions ça
                // ne les dessine pas en colonnes ». La touche écrit le signe
                // que l'analyseur lit ; c'est `maths/formule` qui l'empile.
                ...(m.fraction
                    ? [{ t: '/', cls: 'ls-t--signe', dit: 'Barre de fraction' }] : []),
                // L'EXPOSANT SE TAPE AVEC « ^ » — Rémy, en rouge sur sa fiche
                // de quatrième : « TU ÉCRIRAS LE CALCUL ! » Il veut voir
                // 10³ × 10² = 10³⁺² = 10⁵, et cette ligne du milieu porte une
                // SOMME en exposant : aucun chiffre en haut ne l'écrit. Le
                // caractère ^ est celui que l'analyseur lit depuis toujours,
                // et c'est aussi celui d'une calculatrice.
                ...(m.exposant
                    ? [{ t: '^', cls: 'ls-t--signe', dit: 'Exposant' }] : []),
                // LES PARENTHÈSES N'APPARAISSENT QUE SI LA RÉPONSE PEUT EN
                // VOULOIR. Même règle que pour la touche x³ : offrir une
                // touche dont on sait qu'elle donnera une réponse fausse,
                // c'est tendre un piège avec l'outil qu'on prête. Une
                // factorisation en a besoin, une expression réduite jamais.
                ...(m.parentheses ? [
                    { t: '(', cls: 'ls-t--signe', dit: 'Ouvrir une parenthèse' },
                    { t: ')', cls: 'ls-t--signe', dit: 'Fermer la parenthèse' }
                ] : [])
            ],
            '01234'.split('').map(c => ({ t: c, cls: 'ls-t--chiffre' })),
            '56789'.split('').map(c => ({ t: c, cls: 'ls-t--chiffre' }))
        ];

        // UNE FAMILLE D'UNE TOUCHE N'EST PAS UNE FAMILLE.
        //
        // Rémy, capture d'iPhone sur « Racines carrées pas à pas » : le dessin
        // du carré, qui EST la leçon de cet exercice, ne tient pas à l'écran.
        // MESURÉ à 390 × 664 : l'énoncé a 124 px de fenêtre pour 328 px de
        // contenu. Et dans le pavé, la première rangée ne portait qu'UNE
        // touche — le « √ » — pour 44 px de haut plus sa gouttière.
        //
        // Les trois familles restent (la lettre et ses puissances, les signes,
        // les chiffres) : ce qui les distingue est leur COULEUR, Rémy l'a
        // écrit lui-même deux paragraphes plus haut — « sur un téléphone, où
        // la grille se replie, la seule position ne suffit plus ». Deux
        // familles maigres partagent donc une ligne quand elles tiennent dans
        // la largeur d'une rangée de chiffres, cinq touches. Le clavier ne
        // s'élargit jamais ; il cesse seulement de gaspiller une ligne pour un
        // seul signe. Quarante-neuf pixels rendus à l'énoncé.
        // ET UNE FAMILLE VIDE N'EN EST PAS UNE NON PLUS : sur un chapitre sans
        // lettre, sans carré et sans racine, la première rangée ne portait AUCUNE
        // touche et rendait quand même sa gouttière.
        const LARGEUR_RANGEE = 5;
        for (let i = rangees.length - 1; i >= 0; i--) if (!rangees[i].length) rangees.splice(i, 1);
        for (let i = 0; i < rangees.length - 1; i++) {
            if (rangees[i].length && rangees[i].length < 3
                && rangees[i].length + rangees[i + 1].length <= LARGEUR_RANGEE) {
                rangees.splice(i, 2, rangees[i].concat(rangees[i + 1]));
                i--;
            }
        }

        // ── CE QUE LE PAVÉ PORTE, LE CLAVIER PHYSIQUE L'ACCEPTE ─────────
        //
        // RÉMY : « on ne peut pas écrire les parenthèses au clavier ».
        //
        // C'ÉTAIT VRAI, ET SUR UN ORDINATEUR C'EST BLOQUANT : au barreau qui
        // demande « −(−9) », la ligne attendue ne pouvait tout simplement PAS
        // être tapée. Il fallait viser les touches à la souris, sur un écran
        // où l'on a un clavier sous les doigts.
        //
        // LA LISTE ÉCRITE À LA MAIN AVAIT DÉJÀ DÉRIVÉ UNE FOIS — Rémy, à
        // propos de l'astérisque : « il faut que quand je tape l'astérisque,
        // cela affiche le fois ». Il tapait `*`, il ne se passait rien. Une
        // liste tenue à la main à côté d'une autre liste finit toujours par
        // s'en écarter : on la DÉDUIT donc du pavé, qui est déjà la liste des
        // touches que cette question autorise.
        //
        // ET LA RÈGLE DE LA MAISON TIENT TOUJOURS, sans qu'on ait à la répéter
        // une quatrième fois : « une touche dont on SAIT qu'elle donnera une
        // réponse fausse ne doit pas exister ». Si le pavé ne montre pas de
        // parenthèse, le clavier n'en écrit pas non plus.
        const glyphesDuPave = new Set(rangees.flat().map((o) => o.t));
        // DEUX TOUCHES N'ONT PAS LE MÊME CARACTÈRE SUR LE CLAVIER ET À
        // L'ÉCRAN : le signe moins de la typographie se tape avec le trait
        // d'union, et le signe fois avec l'astérisque — quelle que soit la
        // notation choisie (×, · ou *), puisque la touche porte celle-là.
        const AUTRE_TOUCHE = { '-': '−', '*': glypheFois() };

        const touche = (o) => `<button type="button" class="ls-t ${o.cls}" data-t="${echapper(o.t)}"
            ${o.dit ? `title="${echapper(o.dit)}"` : ''}>${echapper(o.t)}</button>`;
        const rangee = (r) => `<div class="ls-rangee">${r.map(touche).join('')}</div>`;

        // ── LA CHAÎNE D'ÉGALITÉS ────────────────────────────────────────
        //
        // RÉMY : « idem pour les factorisation. Il faut revoir la façon de
        // présenter, quelque chose de cohérent. »
        //
        // La première version était une LISTE À COCHER : « a − b, réduit »
        // d'un côté, sa valeur de l'autre. Chaque ligne était juste, et
        // l'ensemble n'était pas une démonstration — on ne voyait pas que
        // toutes ces lignes sont ÉGALES entre elles, ce qui est pourtant tout
        // le sujet d'une factorisation.
        //
        // On écrit donc ce qu'on écrit au tableau : l'expression de départ,
        // puis une suite de « = … », chacune avec, en petit, ce qu'on vient
        // de faire. L'élève relit sa propre trace, et cette trace est
        // exactement la copie qu'on lui demandera de rendre.
        //
        //   (6 − 5x)² − 1
        //   = (6 − 5x)² − 1²             on écrit les deux carrés
        //   = (6 − 5x − 1)(6 − 5x + 1)   (a − b)(a + b), sans rien réduire
        //   = (5 − 5x)(7 − 5x)           on réduit chaque parenthèse
        //   = 5(1 − x)(7 − 5x)           on sort le facteur commun
        //
        // LES LIGNES `apart` NE SONT PAS DANS LA CHAÎNE, et elles portent
        // leur membre de gauche : « x² − 9 = (x − 3)(x + 3) » est un calcul
        // de côté, celui qu'on pose dans la marge avant de commencer. Les
        // mêler à la chaîne dirait que x² − 9 vaut l'expression entière.
        const friseHtml = etapes.length ? `
            <ol class="ls-chaine" data-etapes>
                ${etapes.map((e, i) => `
                    <li class="ls-ligne${e.apart ? ' ls-ligne--apart' : ''}${
    e.note ? ' ls-ligne--note' : ''}" data-etape="${i}">
                        <span class="ls-gauche">${echapper(
        e.note ? e.titre : (e.gauche || ''))}</span>
                        <span class="ls-egal" aria-hidden="true">${e.note ? ':' : '='}</span>
                        <span class="ls-membre" data-val="${i}"></span>
                        <span class="ls-quoi">${echapper(e.note ? '' : e.titre)}</span>
                    </li>`).join('')}
            </ol>` : '';

        // L'HÔTE PORTE LE CONTENEUR DE REQUÊTE, PAS LE GABARIT. Un élément
        // n'est jamais son propre conteneur : `@container` posé sur
        // `.ls-layout`, qui déclarait `container-type`, ne s'appliquait donc
        // jamais à lui — mesuré, la règle deux colonnes ne prenait pas.
        container.innerHTML = `
          <div class="ls-hote">
            <div class="ls-layout${etapes.length ? ' ls-layout--chaine' : ''}">
                <div class="ls-contexte">
                    ${avis ? `<div class="ls-avis">${avis}</div>` : ''}
                    ${item.prompt.html}
                    ${friseHtml}
                </div>
                <div class="ls-panel">
                    <div class="ls-champ" aria-live="polite" data-champ>
                        <span class="ls-texte" data-texte></span><span class="ls-curseur"></span><span class="ls-modele" data-modele aria-hidden="true"></span>
                    </div>
                    <div class="ls-clavier">${rangees.map(rangee).join('')}</div>
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
        annoncerLeReste(container.querySelector('.ls-contexte'));
        const champ = container.querySelector('[data-champ]');
        const texteEl = container.querySelector('[data-texte]');
        const btnValider = container.querySelector('[data-valider]');
        const noteEl = container.querySelector('[data-note]');
        const modeleEl = container.querySelector('[data-modele]');

        /**
         * LE MOULE DE LA LIGNE, DANS LE CHAMP VIDE.
         *
         * RÉMY, devant fac-3 pas à pas — énoncé (9 − 6x)² − 25, ligne « On
         * écrit les deux carrés », champ vide : « je ne comprends pas ce
         * qu'il faut faire ».
         *
         * Le titre dit le GESTE ; il ne dit pas la FORME, et c'est la forme
         * qui manque devant un champ vide. Le squelette — (…)² − □² — la dit
         * en trois signes, sans livrer un seul nombre. Il s'efface à la
         * première touche : ce n'est pas un texte, c'est une amorce.
         *
         * SEULEMENT DANS UNE CHAÎNE. Sur une question d'un seul tenant,
         * l'énoncé est juste au-dessus et la forme attendue n'a rien
         * d'ambigu ; un moule y serait un indice gratuit.
         */
        const poserModele = () => {
            if (!modeleEl) return;
            const e = etapes.length ? etapes[rang] : null;
            const moule = (e && !e.finale && e.modele) || '';
            modeleEl.textContent = saisie === '' ? moule : '';
        };

        const redessiner = () => {
            // `textContent` EFFACE AUSSI LE COLORIAGE des termes semblables —
            // voir `signalerInacheve`. C'est voulu : dès que l'élève touche
            // une touche, la phrase qu'on avait coloriée n'est plus celle-là.
            texteEl.textContent = saisie;
            champ.classList.remove('ls-champ--ok', 'ls-champ--ko', 'ls-champ--presque');
            champ.classList.toggle('ls-champ--vide', saisie === '');
            poserModele();
            noteEl.textContent = '';
            btnValider.disabled = saisie.trim() === '';
        };
        const taper = (t) => { saisie += t; redessiner(); };
        const effacer = () => {
            // UNE TOUCHE, UN CARACTÈRE, DONC UN EFFACEMENT SIMPLE.
            //
            // L'ancienne règle retirait « x² » d'un seul coup, parce que « x² »
            // s'obtenait d'une seule touche — effacer en deux temps aurait
            // défait un geste qu'on n'avait pas fait. Depuis que le carré a sa
            // propre touche (voir le pavé, plus haut), chaque touche écrit
            // exactement un caractère : on en retire un.
            saisie = [...saisie].slice(0, -1).join('');
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
                li.classList.toggle('ls-ligne--faite', i < rang);
                li.classList.toggle('ls-ligne--active', i === rang);
                li.classList.toggle('ls-ligne--attente', i > rang);
            });
            // L'ÉTAPE EN COURS DOIT ÊTRE VISIBLE, et sur un téléphone elle ne
            // l'était pas : l'énoncé et la frise défilent dans leur propre
            // zone, et la ligne active se retrouvait coupée par le bord bas —
            // vu à l'écran sur fac-7-pas, dont l'énoncé tient sur deux lignes.
            // On l'amène sous les yeux à chaque changement d'étape.
            const actif = container.querySelector('.ls-ligne--active');
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
                cel.classList.toggle('ls-membre--donnee', !!donnee);
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

        /**
         * LE JUGE D'UNE LIGNE INTERMÉDIAIRE.
         *
         * ─────────────────────────────────────────────────────────────────
         *
         * RÉMY, capture à l'appui, sur « Enlever les parenthèses » :
         *
         *     −(+3) − (−7)
         *     « Réécris la ligne SANS parenthèses. Ne la calcule pas encore. »
         *     il tape −3+7, bordure rouge : « il me compte faux »
         *
         * IL AVAIT RAISON, ET LE JUGE NE JUGEAIT RIEN. Cette fonction lisait
         * `e.verifie` — que PERSONNE ne fournit : aucun générateur du dépôt ne
         * pose ce champ. `v` valait donc `false` à tous les coups, et TOUTE
         * ligne intermédiaire était refusée, y compris celle que l'activité
         * finit par écrire elle-même au bout de trois essais.
         *
         * MESURÉ (tools/lignesIntermediaires.mjs) : sur « −(−5) − (+3) », on
         * retape « 5 − 3 » — la ligne que le logiciel venait de poser — et il
         * la refuse. Un juge qui refuse sa propre réponse n'est pas sévère :
         * il est muet.
         *
         * CE QU'ON JUGE MAINTENANT, ET AVEC QUOI. `montrer` EST la ligne
         * attendue : l'en-tête de ce module le dit — « ce que l'élève tape, et
         * ce qu'on lui montre s'il sèche ». On la compare avec `memeReponse`,
         * le même juge que la ligne finale : espaces ignorés, trait d'union
         * accepté pour le signe moins, « + » de tête facultatif. C'est la
         * réponse de Rémy à la question posée en son temps — « 4 − 5 » et
         * « +4 − 5 » valent l'un comme l'autre.
         *
         * `e.verifie` RESTE PRIORITAIRE, pour le jour où une étape aura
         * plusieurs écritures justes que la comparaison de chaînes ne peut pas
         * reconnaître — une factorisation, par exemple, où (x − 3)(x + 3) et
         * (x + 3)(x − 3) sont tous deux bons.
         *
         * IL VIT DANS `core/ligneEtape.js`, ET C'EST TOUTE LA LEÇON. Ici, il
         * était INÉPROUVABLE : ce module touche le document dès qu'on
         * l'importe, et `node --test` tombe sur « document is not defined ».
         * Une règle qu'aucune épreuve ne peut atteindre se casse en silence —
         * c'est exactement ce qui est arrivé à celle-ci.
         */
        const validerEtape = () => {
            const e = etapes[rang];
            const v = jugerEtape(e, saisie);
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

        /**
         * CE QUI N'EST PAS FINI N'EST PAS UNE ERREUR.
         *
         * L'élève a écrit une expression JUSTE mais non réduite — « x² + 2x +
         * 5x + 10 » là où l'on attend « x² + 7x + 10 ». La séance n'en sait
         * rien et n'en saura rien : on ne soumet pas. On le dit, on colorie ce
         * qui va ensemble, et il finit sa ligne.
         *
         * RÉMY : « tu peux faire changer de couleur ce qui va ensemble ». La
         * couleur répond à la seule question qui reste — lesquels ? — sans
         * donner la réponse : elle dit quels termes se réunissent, pas ce que
         * leur somme vaut. Et elle ne va jamais seule : chaque groupe a AUSSI
         * son soulignement, plein, tireté ou pointillé, parce qu'un élève
         * daltonien a le droit de voir l'appariement lui aussi.
         */
        const signalerInacheve = (pourquoi) => {
            const morceaux = groupesSemblables(saisie);
            const groupes = new Set(morceaux.filter(m => m.groupe >= 0)
                .map(m => m.groupe));
            texteEl.innerHTML = morceaux.map(m => (m.groupe >= 0
                ? `<span class="ls-semblable" data-groupe="${
                    m.groupe % NUANCES_SEMBLABLES}">${echapper(m.texte)}</span>`
                : echapper(m.texte))).join('');
            champ.classList.remove('ls-champ--ok', 'ls-champ--ko');
            champ.classList.add('ls-champ--presque');
            // ON NE PARLE DE COULEUR QUE S'IL Y EN A UNE. Le cas est rare —
            // « 2x + 0 » compte deux termes écrits pour un seul monôme sans
            // qu'aucune paire ne se corresponde — mais annoncer une couleur
            // absente enverrait l'élève chercher ce qui n'est pas là.
            noteEl.textContent = pourquoi + (groupes.size
                ? ' Les termes de la même couleur vont ensemble.' : '');
        };

        /**
         * CELUI QUI SAIT DÉJÀ N'EST PAS OBLIGÉ DE PASSER PAR LES LIGNES.
         *
         * RÉMY : « on peut tolérer si l'élève marque directement la version
         * simplifiée ».
         *
         * Il a raison, et c'est une limite du découpage : les lignes sont là
         * pour CELUI QUI BUTE. Refuser la réponse finale à la première ligne
         * revient à punir celui qui la voit d'un coup d'œil — et à lui
         * apprendre que l'exercice porte sur la procédure plutôt que sur le
         * calcul.
         *
         * ON POSE ALORS SA RÉPONSE SUR LA DERNIÈRE LIGNE et l'on saute les
         * intermédiaires, qui restent vides : la trace dit la vérité, à savoir
         * qu'elles n'ont pas été écrites. La question compte normalement pour
         * la séance, puisque c'est bien la réponse qui a été donnée.
         */
        const sautDirect = (texte) => {
            if (!etapes.length || !item.verifieTexte) return false;
            const v = item.verifieTexte(texte);
            if (!v || !v.juste) return false;
            rang = etapes.length - 1;   // la ligne finale, celle qui compte
            marquerEtapes();
            return true;
        };

        const valider = () => {
            if (destroyed || !saisie.trim()) return;
            // UNE ÉTAPE INTERMÉDIAIRE NE PASSE PAS PAR LA SÉANCE. Voir l'en-tête :
            // elle s'écrit, elle se corrige, elle ne se note pas.
            //
            // SAUF SI C'EST DÉJÀ LA RÉPONSE : voir `sautDirect`. On ne demande
            // pas à celui qui a fini de faire semblant de chercher.
            // ── CE QUI EST ÉGAL MAIS PAS FINI SE DIT, MÊME SUR UNE LIGNE ──
            //
            // Rémy, capture d'iPhone sur « Fractions pas à pas », 1/4 + 5/4, la
            // ligne « On ajoute les numérateurs, le dénominateur ne bouge pas »,
            // 6/4 écrit dans le champ, bordure rouge : « je sais que je n'ai pas
            // simplifié mais il me dit faux ».
            //
            // IL AVAIT RAISON, ET LE LOGICIEL LE SAVAIT. `sautDirect` autorise
            // depuis toujours d'écrire la réponse directement — « on peut
            // tolérer si l'élève marque directement la version simplifiée » —,
            // mais il exige `juste`. Or `verifieTexte` répond ici
            // `{ juste: false, inacheve: true, pourquoi: 'C'est bien égal, mais
            // ce n'est pas fini : la fraction se simplifie encore.' }` : la
            // phrase exacte de Rémy, écrite dans le code, et jetée. On
            // retombait sur le juge de la LIGNE, qui répondait tout autre
            // chose — « à cette ligne on REGROUPE, on ne calcule pas encore ».
            //
            // MESURÉ, la même intention jugée deux fois :
            //
            //     8/5 + 9/5, on tape 17/5 ... « Parfait ! +10 »
            //     4/3 + 2/3, on tape  6/3 ... REFUSÉ, et pour le mauvais motif
            //
            // Le même geste, deux verdicts — la seule différence étant que
            // 17/5 est déjà réduit, donc reconnu par `sautDirect`. Une règle
            // qu'on ne peut pas apprendre n'est pas une règle.
            //
            // ON NE L'ACCEPTE PAS POUR AUTANT : la ligne finale demande la forme
            // réduite, et la donner reste le travail. On dit seulement LEQUEL
            // des deux reproches est le bon.
            if (etapes.length && !etapes[rang].finale && !sautDirect(saisie)) {
                const presque = item.verifieTexte ? item.verifieTexte(saisie) : null;
                if (presque && typeof presque === 'object' && presque.inacheve) {
                    return signalerInacheve(presque.pourquoi || '');
                }
                return validerEtape();
            }
            // L'ITEM JUGE LUI-MÊME QUAND IL SAIT LE FAIRE. Comparer des
            // chaînes suffit pour une expression réduite, dont l'écriture est
            // canonique ; pas pour une factorisation, où (x − 3)(x + 3) et
            // (x + 3)(x − 3) sont tous deux justes.
            const verdict = item.verifieTexte ? item.verifieTexte(saisie) : null;
            const juste = verdict !== null
                ? (typeof verdict === 'object' ? !!verdict.juste : !!verdict)
                : memeReponse(saisie, item.answer);
            const pourquoi = (verdict && typeof verdict === 'object' && verdict.pourquoi) || '';
            // L'INACHEVÉ NE PASSE PAS PAR LA SÉANCE — voir `signalerInacheve`.
            if (!juste && verdict && typeof verdict === 'object' && verdict.inacheve) {
                return signalerInacheve(pourquoi);
            }
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
            if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
            // LE PAVÉ DIT CE QUI S'ÉCRIT, et le clavier ne fait que le
            // recopier — voir `glyphesDuPave` plus haut. Les majuscules
            // tapent la minuscule du pavé : celui qui écrit « X » n'a pas
            // fait d'erreur de mathématiques.
            const frappe = AUTRE_TOUCHE[e.key] || e.key;
            const glyphe = glyphesDuPave.has(frappe) ? frappe
                : (glyphesDuPave.has(frappe.toLowerCase()) ? frappe.toLowerCase() : null);
            if (glyphe) { taper(glyphe); e.preventDefault(); }
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
    /**
     * DIRE QUE L'ÉNONCÉ CONTINUE PLUS BAS.
     *
     * « ATTEIGNABLE N'EST PAS VISIBLE » — la phrase est de
     * `tools/quiDefileSansLeDire.mjs`, et elle vaut ici pour du CONTENU et non
     * pour une commande. Sur un téléphone court, le pavé pèse 392 px sur un
     * hôte de 538 : il reste 124 px à l'énoncé, et le dessin du carré — qui EST
     * la leçon de cet exercice, « on montre le carré caché sous la racine » —
     * tombe sous la ligne de flottaison. Un élève de seconde qui ne voit pas de
     * dessin ne se dit pas qu'il y en a un.
     *
     * Le chevron ne s'affiche QUE s'il y a quelque chose en dessous, et il
     * disparaît dès qu'on est arrivé en bas : un indice qui ment une fois n'est
     * plus lu.
     */
    function annoncerLeReste(zone) {
        if (!zone) return;
        const dire = () => {
            const reste = zone.scrollHeight - zone.clientHeight - zone.scrollTop;
            zone.classList.toggle('ls-contexte--encore', reste > 4);
        };
        zone.addEventListener('scroll', dire, { passive: true });
        // LA MESURE SE REFAIT QUAND LA BOÎTE CHANGE : la hauteur de l'énoncé
        // dépend du pavé, qui dépend du clavier, qui n'a pas fini de se poser
        // au moment où l'on écrit cette ligne. Une mesure unique rendait faux
        // une fois sur deux.
        if (typeof ResizeObserver === 'function') {
            const oeil = new ResizeObserver(dire);
            oeil.observe(zone);
            [...zone.children].forEach(e => oeil.observe(e));
        }
        dire();
    }

    function diagnostiquer(donne, item) {
        const pieges = (item.meta && item.meta.pieges) || [];
        const n = normaliser(donne);
        const touche = pieges.find(p => normaliser(p.value) === n);
        if (touche) return touche.why;
        if (normaliser(item.prompt.text.split(':').pop()) === n) {
            return 'C\'est l\'expression de départ, recopiée : il reste quelque chose à regrouper.';
        }
        // ── LA PHRASE PAR DÉFAUT PARLE DU CHAPITRE OÙ L'ON EST ──────────────
        //
        // RÉMY, sur « Enlever les parenthèses » — un chapitre de nombres
        // relatifs, sans une seule lettre — voyait s'afficher : « Range chaque
        // terme dans son sac, puis additionne les nombres de devant —
        // l'exposant, lui, ne bouge pas ». Il n'y a ni sac, ni terme, ni
        // exposant dans « −(6 + 8) + (4 − 7) ».
        //
        // CETTE PHRASE EST BONNE LÀ OÙ ELLE EST NÉE : réduire une expression
        // littérale, c'est bien ranger les semblables ensemble. Elle ne vaut
        // que là, et `lettre: null` dit justement que cette question n'en a
        // pas. On rend alors l'INDICE DE L'EXERCICE, qui est écrit par celui
        // qui sait de quoi il parle.
        const sansLettre = item.meta && item.meta.lettre === null;
        if (sansLettre) {
            return (item.hints || [])[0]
                || 'Ce n\'est pas cela. Relis la ligne précédente.';
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

        // ── LE ROBOT PARLE DE L'EXERCICE QU'IL JOUE ─────────────────────
        //
        // RÉMY, en regardant la démonstration de « Enlever les parenthèses » :
        // « l'explication du robot pour ça n'est pas terrible ».
        //
        // IL DISAIT DEUX PHRASES ÉCRITES EN DUR, et toutes deux parlaient d'un
        // autre chapitre : « Je range d'abord chaque terme dans son sac : les
        // carrés avec les carrés, les lettres simples ensemble » et
        // « l'exposant, lui, ne bouge jamais ». Il n'y a ni sac, ni carré, ni
        // exposant dans « −(6 + 8) + (4 − 7) ». Ces phrases sont bonnes là où
        // elles sont nées — réduire une expression littérale — et nulle part
        // ailleurs. C'est le même défaut que la note d'erreur, au même endroit
        // conceptuel : une activité sert plusieurs chapitres, et son robot
        // n'avait qu'un discours.
        //
        // `lettre: null` DIT QUE CETTE QUESTION N'A PAS DE LETTRE. Sans lettre,
        // le robot ouvre sur le geste — regarder avant d'écrire — puis rend la
        // parole à l'INDICE DE L'EXERCICE, écrit par celui qui sait de quoi il
        // parle. Et il ne le dit que s'il tient en une bulle : la règle des
        // 110 caractères de `activities/choice.js` vaut ici aussi, « une
        // explication de trois lignes fige la démonstration au point qu'on la
        // croit plantée ».
        const avecLettre = (item.meta || {}).lettre !== null;
        const tientEnUneBulle = (t) => typeof t === 'string' && t.trim()
            && t.trim().length <= 110;
        const contexte = container.querySelector('.ls-contexte');
        cursor.say(avecLettre
            ? 'Je range chaque terme dans son sac : les carrés ensemble, les lettres '
                + 'ensemble, les nombres ensemble.'
            : 'Je lis l\'énoncé en entier avant d\'écrire.', contexte || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;

        const deuxieme = avecLettre
            ? 'Dans un sac, j\'additionne les nombres de devant. L\'exposant ne bouge pas.'
            : ((item.hints || []).find(tientEnUneBulle) || '');
        if (deuxieme) {
            if (!await gate.waitTurn() || destroyed) return;
            cursor.say(deuxieme, container.querySelector('.ls-clavier') || container);
            if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        }

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
