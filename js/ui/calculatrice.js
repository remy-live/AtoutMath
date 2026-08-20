// LA CALCULATRICE — une petite fenêtre qu'on pose à côté de l'exercice.
//
// Rémy : « crée un module calculatrice qu'on peut appeler en petite fenêtre
// modale flottante et draggable. Fais une jolie calculatrice sobre avec un
// mode activable ou non scientifique (cos, sin, racine). »
//
// TROIS DÉCISIONS, ET ELLES TIENNENT TOUTES À LA MÊME CHOSE : la calculatrice
// sert PENDANT l'exercice, pas à la place.
//
//   · elle FLOTTE — elle ne prend pas l'écran, elle ne bloque rien derrière
//     elle, et on la pousse là où elle ne cache pas l'énoncé. Une modale
//     obligerait à refermer pour relire la question, donc à retaper le calcul ;
//   · elle est PETITE — deux cent trente pixels, la largeur d'une vraie
//     calculatrice de poche. Sur un téléphone de 375, il reste de la place
//     pour lire l'exercice à côté ;
//   · le mode scientifique est UN INTERRUPTEUR. Six touches de plus pour un
//     élève de sixième, c'est six occasions de se tromper de bouton ; pour le
//     quatrième qui cherche un cosinus, leur absence est rédhibitoire. Le
//     choix se retient d'une ouverture à l'autre.
//
// Le calcul, lui, vit dans `core/calculatrice.js` — testé à part, sans écran.

import { calculer, ecrire } from '../core/calculatrice.js';
import { placer, restaurer, memoriser, rendreDeplacable } from './flottant.js';

const CLE_POS = 'mathbox-calc-pos';
const CLE_SCI = 'mathbox-calc-sci';

/** La fenêtre ouverte, s'il y en a une. Il n'y en a jamais deux. */
let fenetre = null;
let etat = null;

const lireSci = () => {
    try { return localStorage.getItem(CLE_SCI) === '1'; } catch (e) { return false; }
};
const garderSci = (v) => {
    try { localStorage.setItem(CLE_SCI, v ? '1' : '0'); } catch (e) { /* privé */ }
};

// --- LES TOUCHES --------------------------------------------------------------
//
// `t` est ce qui s'écrit sur la touche, `e` ce qui s'ajoute à l'expression
// (quand ce n'est pas la même chose), `r` le rôle des touches qui ne
// s'écrivent pas — effacer, calculer.

const RANGEE_SCI = [
    { t: 'sin', e: 'sin(', k: 'fn' }, { t: 'cos', e: 'cos(', k: 'fn' },
    { t: 'tan', e: 'tan(', k: 'fn' }, { t: '√', e: '√(', k: 'fn' },
    { t: 'x²', e: '^2', k: 'fn' }, { t: 'π', e: 'π', k: 'fn' }
];

const TOUCHES = [
    { t: 'C', r: 'vider', k: 'gris' }, { t: '(', k: 'gris' }, { t: ')', k: 'gris' },
    { t: '÷', k: 'op' },
    { t: '7' }, { t: '8' }, { t: '9' }, { t: '×', k: 'op' },
    { t: '4' }, { t: '5' }, { t: '6' }, { t: '−', k: 'op' },
    { t: '1' }, { t: '2' }, { t: '3' }, { t: '+', k: 'op' },
    { t: '0' }, { t: ',' }, { t: '⌫', r: 'reculer', k: 'gris' },
    { t: '=', r: 'calculer', k: 'egal' }
];

const ICONE_FERMER = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"
    ><path d="M6 6l12 12M18 6 6 18"/></svg>`;

const echapper = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function toucheHtml(b) {
    const genre = b.k ? ` cx-t--${b.k}` : '';
    const quoi = b.r ? ` data-role="${b.r}"` : ` data-ecrire="${echapper(b.e || b.t)}"`;
    return `<button type="button" class="cx-t${genre}"${quoi}>${echapper(b.t)}</button>`;
}

function gabarit(sci) {
    return `
    <div class="cx-tete" data-poignee>
        <span class="cx-titre">Calculatrice</span>
        <button type="button" class="cx-tete-btn" data-sci aria-pressed="${sci}"
                title="Mode scientifique : sinus, cosinus, tangente, racine"
                aria-label="Mode scientifique">f(x)</button>
        <button type="button" class="cx-tete-btn cx-fermer" data-fermer
                title="Fermer la calculatrice" aria-label="Fermer la calculatrice"
        >${ICONE_FERMER}</button>
    </div>
    <div class="cx-ecran">
        <div class="cx-saisie" data-saisie aria-live="off">0</div>
        <div class="cx-apercu" data-apercu aria-live="polite"></div>
    </div>
    <div class="cx-sci" data-sci-rangee${sci ? '' : ' hidden'}>
        ${RANGEE_SCI.map(toucheHtml).join('')}
    </div>
    <div class="cx-pave">${TOUCHES.map(toucheHtml).join('')}</div>`;
}

// --- CE QU'ON TAPE ------------------------------------------------------------

/**
 * L'ÉTAT TIENT EN TROIS CHAMPS. `saisie` est ce qui s'écrit ; `fini` dit qu'on
 * vient d'appuyer sur « = » — la prochaine touche chiffre repart de zéro, mais
 * un opérateur continue sur le résultat, exactement comme sur une machine de
 * poche.
 */
function nouvelEtat() {
    return { saisie: '', fini: false };
}

const OPERATEURS_TOUCHE = ['+', '−', '×', '÷', '^'];

function ecrireDans(e, texte) {
    if (e.fini) {
        // Après un « = » : un opérateur enchaîne sur le résultat, un chiffre
        // commence un nouveau calcul.
        e.saisie = OPERATEURS_TOUCHE.includes(texte) ? e.saisie : '';
        e.fini = false;
    }
    // Deux virgules dans le même nombre ne veulent rien dire : la seconde est
    // refusée plutôt que de rendre l'expression impossible à calculer.
    if (texte === ',') {
        const dernier = e.saisie.split(/[^0-9,]/).pop();
        if (dernier.includes(',')) return;
        if (!dernier) e.saisie += '0';
    }
    e.saisie += texte;
}

/** Ce que la fenêtre montre : ce qu'on tape, et le résultat si on peut. */
function afficher() {
    if (!fenetre) return;
    const saisie = fenetre.querySelector('[data-saisie]');
    const apercu = fenetre.querySelector('[data-apercu]');
    saisie.textContent = etat.saisie || '0';
    // LA LONGUEUR DE L'EXPRESSION NE DOIT PAS ÉLARGIR LA FENÊTRE : passé une
    // vingtaine de signes, on rapetisse plutôt que de déborder.
    saisie.classList.toggle('cx-saisie--long', etat.saisie.length > 16);
    saisie.scrollLeft = saisie.scrollWidth;

    if (etat.fini) { apercu.textContent = ''; return; }
    // L'APERÇU NE CRIE PAS « Erreur ». Pendant qu'on tape « 12 + », l'expression
    // est incomplète et le restera à chaque touche : afficher une erreur à
    // chaque frappe apprend à ne plus la lire. On n'affiche que ce qui se
    // calcule vraiment.
    let vu = '';
    try { if (etat.saisie) vu = `= ${ecrire(calculer(etat.saisie))}`; } catch (e) { vu = ''; }
    apercu.textContent = vu === `= ${etat.saisie}` ? '' : vu;
}

function surTouche(role, texte) {
    if (role === 'vider') { etat = nouvelEtat(); }
    else if (role === 'reculer') {
        if (etat.fini) etat = nouvelEtat();
        else etat.saisie = etat.saisie.slice(0, -1);
    } else if (role === 'calculer') {
        if (!etat.saisie) return;
        try {
            etat.saisie = ecrire(calculer(etat.saisie));
            etat.fini = true;
            fenetre.querySelector('[data-apercu]').textContent = '';
        } catch (err) {
            signalerErreur(err);
            return;
        }
    } else if (texte) {
        ecrireDans(etat, texte);
    }
    afficher();
}

/**
 * L'ERREUR SE MONTRE SANS EFFACER CE QU'ON A TAPÉ. Une calculatrice qui vide
 * l'écran quand on ferme mal une parenthèse oblige à tout retaper pour changer
 * un signe — et c'est un calcul de plus à recopier depuis la question.
 */
function signalerErreur(err) {
    const apercu = fenetre.querySelector('[data-apercu]');
    apercu.textContent = err && /parenthèse/.test(err.message)
        ? 'Parenthèses à refermer' : 'Calcul impossible';
    fenetre.classList.remove('cx--faux');
    // Reflow : sans lui, retirer puis remettre la classe dans le même souffle
    // ne rejoue pas l'animation.
    void fenetre.offsetWidth;
    fenetre.classList.add('cx--faux');
}

// --- LE CLAVIER ---------------------------------------------------------------
//
// VINGT JEUX ÉCOUTENT LES TOUCHES SUR `document` — les flèches du labyrinthe,
// l'espace du tir, les chiffres du pavé de réponse. Tant que la calculatrice a
// le foyer, c'est elle qui prend la frappe, et l'événement s'arrête là : sinon
// taper « 4 » dans la calculatrice répondrait 4 à la question posée derrière.

const CLAVIER = {
    '*': '×', 'x': '×', '/': '÷', '-': '−', '.': ',',
    'Enter': null, '=': null, 'Backspace': null, 'Escape': null, 'Delete': null
};

function surClavier(ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    let role = null, texte = null;
    if (k === 'Enter' || k === '=') role = 'calculer';
    else if (k === 'Backspace') role = 'reculer';
    else if (k === 'Delete' || k === 'Escape') role = k === 'Escape' ? 'fermer' : 'vider';
    else if (/^[0-9]$/.test(k)) texte = k;
    else if ('+-*/x.,()^%'.includes(k) && k.length === 1) texte = CLAVIER[k] || k;
    else return;

    ev.preventDefault();
    ev.stopPropagation();
    if (role === 'fermer') { fermerCalculatrice(); return; }
    surTouche(role, texte);
}

// --- OUVRIR, FERMER -----------------------------------------------------------

/** La calculatrice est-elle à l'écran ? */
export const calculatriceOuverte = () => !!fenetre;

/**
 * Ouvre la fenêtre — ou la ramène au premier plan si elle est déjà là.
 * @returns {HTMLElement} la fenêtre
 */
export function ouvrirCalculatrice() {
    if (fenetre) { fenetre.focus(); return fenetre; }
    const sci = lireSci();
    etat = nouvelEtat();

    fenetre = document.createElement('div');
    fenetre.className = 'cx-fen';
    fenetre.setAttribute('role', 'dialog');
    fenetre.setAttribute('aria-label', 'Calculatrice');
    fenetre.tabIndex = -1;
    fenetre.innerHTML = gabarit(sci);
    document.body.appendChild(fenetre);

    // EN BAS À DROITE la première fois : le haut porte l'en-tête de
    // l'exercice, la gauche la palette d'auteur. C'est le coin le plus vide,
    // et la main droite y arrive sans traverser l'énoncé.
    restaurer(fenetre, CLE_POS, (el) => placer(el,
        window.innerWidth - el.offsetWidth - 12, window.innerHeight));
    const poignee = fenetre.querySelector('[data-poignee]');
    fenetre._debrancher = rendreDeplacable(fenetre, poignee, CLE_POS);

    fenetre.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button');
        if (!btn) return;
        if (btn.dataset.fermer !== undefined) return fermerCalculatrice();
        if (btn.dataset.sci !== undefined) return basculerScientifique();
        if (btn.dataset.role || btn.dataset.ecrire) {
            surTouche(btn.dataset.role || null, btn.dataset.ecrire || null);
            // Le foyer revient à la fenêtre : au doigt comme à la souris, la
            // frappe au clavier doit continuer d'arriver ici.
            fenetre.focus({ preventScroll: true });
        }
    });
    // Un appui sur une touche ne doit pas SÉLECTIONNER le chiffre : au doigt,
    // un appui un peu long surlignait la touche en bleu.
    fenetre.addEventListener('pointerdown', (ev) => {
        if (ev.target.closest('.cx-t')) ev.preventDefault();
    });
    fenetre.addEventListener('keydown', surClavier);

    afficher();
    fenetre.focus({ preventScroll: true });
    majBoutons();
    return fenetre;
}

/** Referme la fenêtre. Sans effet s'il n'y en a pas. */
export function fermerCalculatrice() {
    if (!fenetre) return;
    memoriser(fenetre, CLE_POS);
    if (fenetre._debrancher) fenetre._debrancher();
    fenetre.remove();
    fenetre = null;
    etat = null;
    majBoutons();
}

/** Ouvre si fermée, ferme si ouverte — ce que fait le bouton de l'en-tête. */
export function basculerCalculatrice() {
    if (fenetre) fermerCalculatrice();
    else ouvrirCalculatrice();
    return calculatriceOuverte();
}

/** Le mode scientifique, d'une ouverture à l'autre. */
export function basculerScientifique() {
    const sci = !lireSci();
    garderSci(sci);
    if (!fenetre) return sci;
    const rangee = fenetre.querySelector('[data-sci-rangee]');
    const bouton = fenetre.querySelector('[data-sci]');
    rangee.hidden = !sci;
    bouton.setAttribute('aria-pressed', String(sci));
    // La fenêtre grandit d'une rangée : sans recadrage, celle qui était posée
    // contre le bord bas passerait sous l'écran.
    placer(fenetre, fenetre.offsetLeft, fenetre.offsetTop);
    memoriser(fenetre, CLE_POS);
    return sci;
}

/** Le bouton de l'en-tête montre si la fenêtre est ouverte. */
function majBoutons() {
    document.querySelectorAll('[data-calculatrice]').forEach(b => {
        b.setAttribute('aria-pressed', String(calculatriceOuverte()));
        b.classList.toggle('active', calculatriceOuverte());
    });
}

/**
 * CET EXERCICE-LÀ A-T-IL DROIT À LA CALCULATRICE ?
 *
 * La question n'a pas de réponse générale. Sur « Temps, distance, vitesse »,
 * ce qui s'apprend est la formule — diviser 132 par 2,2 à la main ne vérifie
 * rien de plus, et prend le temps qu'on voulait passer à raisonner. Sur les
 * tables de multiplication, la même calculatrice répond à la place de l'élève
 * et l'exercice ne mesure plus rien.
 *
 * C'est donc à l'exercice de le dire (`calculatrice: true` dans le catalogue,
 * cochable dans la revue), et le bouton n'existe nulle part ailleurs. Fermer
 * l'exercice ferme la fenêtre : une calculatrice qui survit à l'exercice se
 * retrouve ouverte au-dessus du suivant, qui ne l'autorisait peut-être pas.
 *
 * @param {Object|null} exo - l'exercice en cours, ou rien du tout
 */
export function reglerCalculatrice(exo) {
    const permise = !!(exo && exo.calculatrice);
    document.querySelectorAll('[data-calculatrice]').forEach(b => { b.hidden = !permise; });
    if (!permise) fermerCalculatrice();
    else majBoutons();
}
