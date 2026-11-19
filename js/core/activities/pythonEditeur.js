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
import { lancer, sortieJuste, chargerPython } from '../python/executer.js';

const PAS = '    ';   // un cran : quatre espaces, la convention de Python

const echapper = (t) => String(t == null ? '' : t).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    let fautive = null;      // la ligne que le vérificateur accuse
    let gagne = false;

    const attendu = () => (item && item.meta && item.meta.sortieAttendue) || '';
    const entrees = () => (item && item.meta && item.meta.entrees) || [];

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(prochain) {
        item = prochain;
        fautive = null;
        gagne = false;
        const depart = (item.meta && item.meta.depart) || '';

        container.innerHTML = `
            <div class="pe-plan">
                ${item.prompt.html}
                <div class="pe-atelier">
                    <div class="pe-editeur">
                        <div class="pe-marges" data-marges></div>
                        <textarea class="pe-saisie" data-code spellcheck="false"
                            autocapitalize="off" autocomplete="off" autocorrect="off"
                            aria-label="Ton programme Python">${echapper(depart)}</textarea>
                    </div>
                    <div class="pe-gestes">
                        <button type="button" class="pe-cran" data-decaler="-1"
                            aria-label="Ramener la ligne vers la gauche">⇤</button>
                        <button type="button" class="pe-cran" data-decaler="1"
                            aria-label="Décaler la ligne vers la droite">⇥</button>
                        <span class="pe-cran-dit">décaler la ligne</span>
                        <button type="button" class="pe-lancer" data-lancer>Lancer</button>
                    </div>
                </div>
                <div class="pe-console" data-console hidden></div>
                ${attendu() ? `<div class="pe-attendu">
                    <span class="pe-attendu-nom">Ton programme doit afficher</span>
                    <pre class="pe-attendu-texte">${echapper(attendu())}</pre></div>` : ''}
            </div>`;

        const code = container.querySelector('[data-code]');
        code.addEventListener('input', redessinerMarges);
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
        // ON CHARGE PYTHON DÈS L'OUVERTURE, sans attendre le premier « Lancer » :
        // 944 Ko arrivent pendant que l'élève lit la consigne et tape, c'est-à-dire
        // pendant un temps qu'il ne compte pas. Chargé au clic, il l'aurait compté.
        chargerPython();
    }

    /** Les numéros de ligne et les filets, redessinés à chaque frappe. */
    function redessinerMarges() {
        const code = container.querySelector('[data-code]');
        const marges = container.querySelector('[data-marges]');
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

    /** Écrit dans la console, et la montre. */
    function dire(html, genre) {
        const c = container.querySelector('[data-console]');
        if (!c) return;
        c.hidden = false;
        c.className = `pe-console pe-console--${genre}`;
        c.innerHTML = html;
    }

    async function essayer() {
        if (destroyed || gagne || session.locked) return;
        const code = container.querySelector('[data-code]');
        const source = code ? code.value : '';
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
        const juste = sortieJuste(r.sortie, attendu());
        const conseil = conseilDuPas(source);
        const vu = `<pre class="pe-sortie">${echapper(r.sortie || '(rien)')}</pre>`;

        const result = session.submit(juste ? attendu() : (r.sortie || ''), { element: code });
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
