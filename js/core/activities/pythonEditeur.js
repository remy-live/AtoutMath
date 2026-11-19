// L'ÉDITEUR PYTHON — l'élève tape, et on l'aide sur l'indentation.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « L'idéal serait de faire des qcm et APRÈS QUE L'ÉLÈVE
// TAPE, L'AIDER SUR L'INDENTATION. Être hyper hyper hyper progressif. »
// Puis le 19 : « il faudrait que l'élève puisse faire des petits programmes ».
//
// ── TROIS DÉCISIONS, ET CHACUNE A SA RAISON ──────────────────────────────
//
// 1. DEUX BOUTONS DE DÉCALAGE, GRANDS, SOUS LE CODE.
//
//    IL N'Y A PAS DE TOUCHE DE TABULATION SUR UNE TABLETTE. C'est la première
//    chose qu'on découvre en essayant d'écrire du Python au doigt : le clavier
//    virtuel d'Android et celui d'iOS n'en ont pas, et le seul moyen de
//    décaler une ligne est de taper quatre espaces en comptant. Un élève qui
//    doit COMPTER des espaces ne pense plus à sa boucle.
//
//    Les deux boutons décalent LA LIGNE OÙ EST LE CURSEUR, d'un cran entier.
//    Pas d'espaces, pas de comptage : un cran, c'est l'unité de l'indentation
//    Python, et c'est l'unité du geste.
//
// 2. LE DÉCALAGE SE VOIT — un filet vertical par cran.
//
//    Quatre espaces, sur un écran, ne se VOIENT pas : l'œil voit du blanc, et
//    du blanc ne se compte pas. Le filet rend le décalage visible, donc
//    comptable, donc discutable — « suis le trait » est une consigne qu'un
//    élève peut suivre, « compte les espaces » n'en est pas une. C'est la même
//    règle que les QCM, et le même dessin : `core/python/afficher.js`.
//
// 3. ON RELIT AVANT DE LANCER, ET EN FRANÇAIS.
//
//    Mesuré le 18 novembre : quatre fautes de débutant entièrement différentes
//    font dire à Python « bad input on line 2 ». Le bouton « Lancer » passe
//    donc par `core/python/executer.js`, qui juge d'abord avec notre
//    vérificateur français et n'exécute que ce qu'il a déclaré lisible. La
//    ligne fautive s'allume dans l'éditeur.

import { regTimeout } from '../timers.js';
import { codeHtml, decaler, cranDe } from '../python/afficher.js';
import { diagnostiquer, conseilDuPas } from '../python/diagnostic.js';
import { lancer, dessiner, chargerPython } from '../python/executer.js';
import { sortieJuste, canoniqueSortie } from '../python/sortie.js';
import { memeFigure, ressemblance } from '../python/dessin.js';

const PAS = '    ';   // un cran : quatre espaces, la convention de Python

// LA PLANCHE À DESSIN, EN PIXELS. Carrée, et la même pour le modèle et pour
// l'élève — sans quoi les deux grilles ne se compareraient pas. 400 tient sur
// un téléphone une fois réduite, et laisse de la place à une figure de 150.
const PLANCHE = 400;

const echapper = (t) => String(t == null ? '' : t).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    let fautive = null;      // la ligne que le vérificateur accuse
    let gagne = false;

    const attendu = () => (item && item.meta && item.meta.sortieAttendue) || '';
    const entrees = () => (item && item.meta && item.meta.entrees) || [];

    /**
     * LE CHAMP TIENT-IL UNE RÉPONSE, OU UN PROGRAMME ?
     *
     * RÉMY, 19 novembre : il a lu « Que va afficher ce programme ? », tapé
     * « 5 / 4 / 3 / 2 / 1 » — et le logiciel a dit « faux ». Il avait raison.
     * Ses cinq nombres, chacun sur sa ligne, FORMENT DU PYTHON VALIDE qui
     * n'affiche rien ; l'éditeur les a donc exécutés, a recueilli le vide, et
     * a comparé ce vide à la bonne réponse.
     *
     * UNE RÉPONSE NE SE LANCE PAS, ELLE SE COMPARE. Tout ce fichier change de
     * comportement sur cette ligne, et c'est voulu : les deux exercices se
     * ressemblent à l'écran, mais l'un produit du code et l'autre du texte.
     */
    const estSortie = () => !!(item && item.meta && item.meta.genre === 'sortie');

    /**
     * LA MARCHE OÙ L'ON DESSINE — et c'est le « petit jeu » que Rémy demandait.
     *
     * « des petits jeux simples c'est toujours motivant ». Le jeu est le plus
     * simple qui soit : LE MODÈLE EST TRACÉ À CÔTÉ, et il faut écrire le
     * programme qui le refait. La correction ne passe par aucune phrase —
     * l'élève voit les deux dessins et sait tout de suite.
     */
    const estDessin = () => !!(item && item.meta && item.meta.genre === 'dessin');
    let grilleModele = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(prochain) {
        item = prochain;
        fautive = null;
        gagne = false;
        const depart = (item.meta && item.meta.depart) || '';

        const sortie = estSortie();
        const trace = estDessin();
        grilleModele = null;
        container.innerHTML = `
            <div class="pe-plan${sortie ? ' pe-plan--sortie' : ''}${
    trace ? ' pe-plan--dessin' : ''}">
                ${item.prompt.html}
                ${trace ? `<div class="pe-planches">
                    <figure class="pe-planche">
                        <figcaption>Le modèle</figcaption>
                        <img data-modele alt="Le dessin à refaire" class="pe-image">
                    </figure>
                    <figure class="pe-planche">
                        <figcaption>Ton dessin</figcaption>
                        <img data-tien alt="Ton dessin" class="pe-image" hidden>
                        <div class="pe-vide" data-vide>rien encore</div>
                    </figure>
                </div>` : ''}
                <div class="pe-atelier">
                    <div class="pe-editeur${sortie ? ' pe-editeur--sortie' : ''}">
                        ${sortie ? '' : '<div class="pe-marges" data-marges></div>'}
                        <textarea class="pe-saisie" data-code spellcheck="false"
                            autocapitalize="off" autocomplete="off" autocorrect="off"
                            ${sortie ? 'placeholder="une ligne par ligne affichée"' : ''}
                            aria-label="${sortie ? 'Ce que le programme affiche'
        : 'Ton programme Python'}">${echapper(depart)}</textarea>
                    </div>
                    <div class="pe-gestes">
                        ${sortie ? '' : `<button type="button" class="pe-cran" data-decaler="-1"
                            aria-label="Ramener la ligne vers la gauche">⇤</button>
                        <button type="button" class="pe-cran" data-decaler="1"
                            aria-label="Décaler la ligne vers la droite">⇥</button>
                        <span class="pe-cran-dit">décaler la ligne</span>`}
                        <button type="button" class="pe-lancer" data-lancer>${
    sortie ? 'Vérifier' : (trace ? 'Dessiner' : 'Lancer')}</button>
                    </div>
                </div>
                <div class="pe-console" data-console hidden></div>
                ${(attendu() && !sortie) ? `<div class="pe-attendu">
                    <span class="pe-attendu-nom">Ton programme doit afficher</span>
                    <pre class="pe-attendu-texte">${echapper(attendu())}</pre></div>` : ''}
            </div>`;
        // ── ET SURTOUT PAS LE RAPPEL « DOIT AFFICHER » EN MODE RÉPONSE ───
        //
        // Il porte la sortie attendue. Sous une question qui DEMANDE cette
        // sortie, il donnerait la réponse — la même faute que l'énoncé qui
        // surlignait lui-même les lignes répétées, le 18 novembre. Deux fois
        // le même piège en deux jours : ce qui aide dans un exercice est la
        // réponse dans l'autre.

        const code = container.querySelector('[data-code]');
        code.addEventListener('input', redessinerMarges);
        if (sortie) code.value = '';
        code.addEventListener('scroll', () => {
            const m = container.querySelector('[data-marges]');
            if (m) m.scrollTop = code.scrollTop;
        });
        code.addEventListener('keydown', surTouche);
        container.querySelectorAll('[data-decaler]').forEach((b) => {
            b.addEventListener('click', () => decalerLaLigne(Number(b.dataset.decaler)));
        });
        container.querySelector('[data-lancer]').addEventListener('click', essayer);
        redessinerMarges();
        if (sortie) return;
        // ON DESSINE LE MODÈLE TOUT DE SUITE, et c'est le bac à sable qui le
        // trace : le générateur ne peut pas dessiner, il n'a pas de navigateur
        // sous la main. Il nous passe le programme du modèle, nous le faisons
        // tourner, et l'image qui en sort est l'énoncé.
        if (trace) { montrerLeModele(); return; }
        // ON NE CHARGE PAS PYTHON POUR UNE QUESTION QUI NE LE LANCE PAS :
        // une marche « écris ce que ça affiche » se corrige par comparaison,
        // et faire descendre 944 Ko sur la tablette d'un élève pour rien est
        // une seconde volée à chaque connexion.
        //
        // ON CHARGE PYTHON DÈS L'OUVERTURE, sans attendre le premier « Lancer » :
        // 944 Ko arrivent pendant que l'élève lit la consigne et tape, c'est-à-dire
        // pendant un temps qu'il ne compte pas. Chargé au clic, il l'aurait compté.
        chargerPython();
    }

    /** Les numéros de ligne et les filets, redessinés à chaque frappe. */
    function redessinerMarges() {
        const code = container.querySelector('[data-code]');
        const marges = container.querySelector('[data-marges]');
        // EN MODE RÉPONSE, IL N'Y A PAS DE MARGE — et c'est une demande de
        // Rémy, mot pour mot : « ne numérote pas les lignes, je trouve cela
        // trompeur ». Il a raison : des numéros devant un texte qu'on écrit
        // laissent croire qu'ils FONT PARTIE de la réponse, ou que la sortie
        // du programme est numérotée. Devant un programme ils servent — le
        // vérificateur dit « ligne 2 » et la ligne s'allume ; devant une
        // réponse ils ne servent qu'à tromper.
        if (!code || !marges) return;
        marges.innerHTML = codeHtml(code.value, { numeros: true, fautive });
    }

    /**
     * DÉCALER LA LIGNE OÙ EST LE CURSEUR, d'un cran entier.
     *
     * ET LE CURSEUR SUIT SA LIGNE. Premier jet : on réécrivait la valeur du
     * champ, ce qui remet le curseur à la fin du texte — l'élève décalait sa
     * ligne 2 et se retrouvait à taper au bout de la ligne 7. On note donc de
     * combien la ligne a bougé, et on déplace le curseur d'autant.
     */
    function decalerLaLigne(sens) {
        const code = container.querySelector('[data-code]');
        if (!code) return;
        const lignes = code.value.split('\n');
        const avant = code.selectionStart;
        // Quelle ligne porte le curseur ?
        let compte = 0, i = 0;
        for (; i < lignes.length; i++) {
            if (compte + lignes[i].length >= avant) break;
            compte += lignes[i].length + 1;
        }
        const ligne = lignes[Math.min(i, lignes.length - 1)] || '';
        const cran = cranDe(ligne);
        const neuf = decaler(ligne, Math.max(0, cran + sens));
        const bouge = neuf.length - ligne.length;
        lignes[Math.min(i, lignes.length - 1)] = neuf;
        code.value = lignes.join('\n');
        code.selectionStart = code.selectionEnd = Math.max(compte, avant + bouge);
        code.focus();
        redessinerMarges();
    }

    /**
     * CE QUE LE CLAVIER PHYSIQUE PEUT FAIRE EN PLUS — et il y a des élèves
     * sur ordinateur.
     *
     * · TABULATION : le même geste que le bouton, sans sortir du champ. Sans
     *   cette ligne, la touche déplace le FOYER vers le bouton suivant et le
     *   programme perd le curseur — c'est le défaut classique d'un éditeur
     *   dans une page.
     * · ENTRÉE APRÈS UN DEUX-POINTS : on descend d'un cran tout seul. C'est
     *   l'aide que Rémy demande, à l'endroit exact où la faute se fait : au
     *   moment où l'on crée la ligne, pas après.
     */
    function surTouche(e) {
        // EN MODE RÉPONSE, LE CLAVIER REDEVIENT ORDINAIRE : la tabulation
        // repart vers le bouton suivant, et Entrée ne décale rien. Décaler une
        // ligne de RÉPONSE n'a pas de sens, et la sortie de `print` ne
        // s'indente pas.
        if (estSortie()) return;
        const code = e.target;
        if (e.key === 'Tab') {
            e.preventDefault();
            decalerLaLigne(e.shiftKey ? -1 : 1);
            return;
        }
        if (e.key !== 'Enter') return;
        const avant = code.value.slice(0, code.selectionStart);
        const ligne = avant.slice(avant.lastIndexOf('\n') + 1);
        const cran = cranDe(ligne);
        // Une ligne qui finit par deux-points ouvre un bloc : la suivante
        // descend d'un cran. Sinon, on garde le même décalage — sans quoi
        // chaque ligne d'un bloc se retaperait à la main.
        const suite = PAS.repeat(/:\s*$/.test(ligne) ? cran + 1 : cran);
        if (!suite) return;
        e.preventDefault();
        const apres = code.value.slice(code.selectionEnd);
        const pos = code.selectionStart + 1 + suite.length;
        code.value = avant + '\n' + suite + apres;
        code.selectionStart = code.selectionEnd = pos;
        redessinerMarges();
    }

    /** Fait tracer le modèle par le bac à sable, et le montre. */
    async function montrerLeModele() {
        const cible = container.querySelector('[data-modele]');
        if (!cible || !item.meta.solution) return;
        const r = await dessiner(item.meta.solution, { largeur: PLANCHE, hauteur: PLANCHE });
        if (destroyed || !r.ok) {
            dire('<p class="pe-dit">Le modèle n’a pas pu être tracé.</p>'
                + '<p class="pe-aide">Réessaie dans un moment : la tortue n’est pas '
                + 'encore arrivée.</p>', 'ko');
            return;
        }
        grilleModele = r.grille;
        cible.src = r.image;
    }

    /** Écrit dans la console, et la montre. */
    function dire(html, genre) {
        const c = container.querySelector('[data-console]');
        if (!c) return;
        c.hidden = false;
        c.className = `pe-console pe-console--${genre}`;
        c.innerHTML = html;
    }

    /**
     * LE MODE RÉPONSE : ON COMPARE, ON NE LANCE PAS.
     *
     * Et l'on reconnaît UNE faute au passage, parce que c'est celle que Rémy a
     * faite en premier : écrire « 54321 » sur une seule ligne. Le contenu est
     * juste, la mise en page ne l'est pas — lui répondre « faux » sans un mot
     * laisserait chercher une erreur de calcul qui n'existe pas. On ne donne
     * pas la réponse pour autant : on dit où regarder.
     */
    function comparer(texte, element) {
        const juste = sortieJuste(texte, attendu());
        const nu = (t) => String(t).replace(/\s+/g, '');
        const memeContenu = !juste && nu(texte) === nu(attendu()) && nu(texte) !== '';
        const vu = `<pre class="pe-sortie">${echapper(texte.trim() || '(rien)')}</pre>`;

        // ON SOUMET LA FORME CANONIQUE, ET L'ON JOINT LA LISIBLE.
        //
        // Sans cela le meneur jugeait « 123 » égal à « 1\n2\n3 » — sa règle
        // « 62 307 = 62307 » retire les blancs d'un nombre. L'élève lisait
        // alors « c'est exactement ça » sur la faute même qu'on veut lui faire
        // voir. `dire` porte les deux textes en clair, pour le carnet.
        const result = session.submit(canoniqueSortie(texte),
            { element, dire: { given: texte.trim(), expected: attendu().trimEnd() } });
        if (result.ignored) return;

        if (result.correct) {
            gagne = true;
            dire('<p class="pe-dit">C’est exactement ça.</p>' + vu, 'ok');
            result.dismissed.then(() => { if (!destroyed) regTimeout(renderNext, 900); });
            return;
        }
        dire(`<p class="pe-dit">${memeContenu
            ? 'Les bons nombres, mais pas à la bonne place.'
            : 'Ce n’est pas ce que ce programme affiche.'}</p>` + vu
            + `<p class="pe-aide">${memeContenu
                ? 'Chaque « print » va À LA LIGNE : il faut une ligne par ligne affichée.'
                : 'Déroule le programme tour par tour, et écris ce qu’il affiche à '
                  + 'chaque passage.'}</p>`, 'ko');
        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.revealed) renderNext();
        });
    }

    /**
     * ON DESSINE, PUIS ON COMPARE LES DEUX FIGURES.
     *
     * UNE FAUTE DE SYNTAXE NE COMPTE PAS COMME UN ESSAI, exactement comme
     * ailleurs : un programme qui ne tourne pas n'est pas une réponse fausse,
     * c'est un programme qui n'est pas fini.
     */
    async function tracer(source, code) {
        dire('<span class="pe-attente">Je dessine…</span>', 'attente');
        const r = await dessiner(source, { largeur: PLANCHE, hauteur: PLANCHE });
        if (destroyed) return;

        if (!r.ok) {
            fautive = r.ligne || null;
            redessinerMarges();
            dire(`<p class="pe-dit">${echapper(r.dire)}</p>`
                + `<p class="pe-aide">${echapper(r.aide || '')}</p>`, 'ko');
            return;
        }
        const tien = container.querySelector('[data-tien]');
        const vide = container.querySelector('[data-vide]');
        if (tien && r.image) { tien.src = r.image; tien.hidden = false; }
        if (vide) vide.hidden = true;
        fautive = null;
        redessinerMarges();

        if (!grilleModele) {
            dire('<p class="pe-dit">Le modèle n’est pas encore tracé.</p>', 'ko');
            return;
        }
        const pareil = memeFigure(r.grille, grilleModele);
        const proche = ressemblance(r.grille, grilleModele);

        const result = session.submit(
            pareil ? item.answer : `figure/autre/${Math.round(proche * 100)}`,
            { element: code,
                dire: { given: 'la figure dessinée', expected: 'la figure du modèle' } });
        if (result.ignored) return;

        if (result.correct) {
            gagne = true;
            dire('<p class="pe-dit">C’est exactement la même figure.</p>', 'ok');
            result.dismissed.then(() => { if (!destroyed) regTimeout(renderNext, 1400); });
            return;
        }
        // ON NE DIT PAS CE QUI MANQUE : les deux dessins sont côte à côte, et
        // l'œil le voit mieux qu'une phrase ne le dirait. On dit seulement
        // s'il s'en approche, parce que cela, l'œil ne le dit pas.
        dire(`<p class="pe-dit">${proche >= 0.6
            ? 'Tu n’es pas loin, mais ce n’est pas la même figure.'
            : 'Ce n’est pas la même figure.'}</p>`
            + '<p class="pe-aide">Compare ton dessin et le modèle, juste au-dessus.</p>',
        'ko');
        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.revealed) renderNext();
        });
    }

    async function essayer() {
        if (destroyed || gagne || session.locked) return;
        const code = container.querySelector('[data-code]');
        const source = code ? code.value : '';
        if (estSortie()) { comparer(source, code); return; }
        if (estDessin()) { await tracer(source, code); return; }
        dire('<span class="pe-attente">Je lance…</span>', 'attente');

        const r = await lancer(source, { entrees: entrees() });
        if (destroyed) return;

        if (!r.ok) {
            // LA LIGNE FAUTIVE S'ALLUME DANS L'ÉDITEUR. Un message qui dit
            // « ligne 3 » sans montrer la ligne 3 oblige à compter, et compter
            // est précisément ce qu'on essaie de lui éviter.
            fautive = r.ligne || null;
            redessinerMarges();
            dire(`<p class="pe-dit">${echapper(r.dire)}</p>`
                + `<p class="pe-aide">${echapper(r.aide || '')}</p>`
                + (r.sortie ? `<pre class="pe-sortie">${echapper(r.sortie)}</pre>` : ''),
            'ko');
            // ON NE COMPTE PAS UN ESSAI POUR UNE FAUTE DE FRAPPE.
            //
            // Une faute de SYNTAXE — un deux-points oublié, une parenthèse —
            // n'est pas une réponse fausse : c'est un programme qui n'est pas
            // fini. La compter comme un essai raté punirait l'élève qui écrit
            // beaucoup, et c'est exactement celui qu'on veut. Seul un
            // programme QUI TOURNE et affiche autre chose est une réponse.
            return;
        }

        fautive = null;
        redessinerMarges();
        const conseil = conseilDuPas(source);
        const vu = `<pre class="pe-sortie">${echapper(r.sortie || '(rien)')}</pre>`;

        const result = session.submit(canoniqueSortie(r.sortie || ''),
            { element: code, dire: { given: (r.sortie || '').trimEnd(),
                expected: attendu().trimEnd() } });
        if (result.ignored) return;

        if (result.correct) {
            gagne = true;
            dire('<p class="pe-dit">C’est exactement ça.</p>' + vu
                + (conseil ? `<p class="pe-conseil">${echapper(conseil)}</p>` : ''), 'ok');
            result.dismissed.then(() => { if (!destroyed) regTimeout(renderNext, 900); });
            return;
        }
        dire('<p class="pe-dit">Ton programme tourne, mais il n’affiche pas ce qu’on '
            + 'demande.</p>' + vu
            + `<p class="pe-aide">On attendait :</p><pre class="pe-sortie pe-sortie--vise">${
                echapper(attendu())}</pre>`, 'ko');
        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.revealed) { renderNext(); return; }
        });
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

// EXPORTÉ POUR LES ÉPREUVES : le décalage d'une ligne est de la logique pure,
// et c'est la seule partie de ce fichier qui s'éprouve sans navigateur.
export const POUR_ESSAI = { PAS, diagnostiquer };
