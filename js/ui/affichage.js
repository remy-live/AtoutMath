// LA ROUE D'AFFICHAGE — le bouton, le panneau, et la pose des réglages.
//
// Les règles (quelles teintes, jusqu'où, quels mots) sont dans
// `core/affichage.js`. Ici, on les applique à la page et on dessine la roue.
//
// RÉMY : « une petite roue d'option qui permette les couleurs et le contraste
// (avec slide) », pour « les élèves et pour moi aussi ». Elle est donc dans la
// barre du haut, à côté du profil, pour TOUT LE MONDE — le professeur qui
// projette au tableau en a besoin autant que l'élève devant un vieil écran.
//
// ELLE REMPLACE DEUX ENTRÉES DU MENU « … », « Changer de thème » et « Texte plus
// aéré ». Les garder à côté aurait fait deux endroits pour la même chose, et le
// bouton de thème qui défile à l'aveugle était justement ce que la roue répare :
// on voit les cinq couleurs, on touche celle qu'on veut.
//
// LE RÉGLAGE VIT DANS LE NAVIGATEUR, comme le texte aéré avant lui : c'est un
// réglage de POSTE. Le vidéoprojecteur de la salle 12 n'a pas le besoin de la
// tablette de la maison.

import {
    THEMES, CLES, ORIGINE, TEINTES, lireReglages, teintesRenforcees,
    gammaDesFigures, motDuContraste, bornerContraste, themeConnu
} from '../core/affichage.js';

const racine = () => document.documentElement;

function ecrire(cle, valeur) {
    try { window.localStorage.setItem(cle, valeur); } catch (e) { /* navigation privée */ }
}

/** Le filtre des figures : une courbe gamma, voir `gammaDesFigures`. */
function filtreDesFigures(gamma) {
    let svg = document.getElementById('aff-filtres');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'aff-filtres';
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        svg.innerHTML = `<filter id="aff-figures-fortes" color-interpolation-filters="sRGB">
            <feComponentTransfer>
                <feFuncR type="gamma" exponent="1"/><feFuncG type="gamma" exponent="1"/>
                <feFuncB type="gamma" exponent="1"/>
            </feComponentTransfer></filter>`;
        document.body.appendChild(svg);
    }
    svg.querySelectorAll('feFuncR, feFuncG, feFuncB')
        .forEach(f => f.setAttribute('exponent', String(gamma)));
}

/**
 * POSER LES RÉGLAGES SUR LA PAGE.
 *
 * ON RELIT LE THÈME SANS RÉGLAGE AVANT DE LE FONCER. Les teintes de base sont
 * celles que la feuille de style donne au thème choisi ; si l'on partait de
 * celles qu'on a déjà posées, chaque passage foncerait un peu plus, et le
 * curseur ramené à « Normal » ne rendrait pas la page d'avant.
 */
export function appliquerAffichage(r = lireReglages(window.localStorage)) {
    const el = racine();
    const theme = themeConnu(r.theme);
    el.setAttribute('data-theme', theme.id);
    if (r.aere) el.setAttribute('data-aere', '1'); else el.removeAttribute('data-aere');

    const jetons = Object.keys(TEINTES.clair);
    jetons.forEach(j => el.style.removeProperty(j));
    const calcule = getComputedStyle(el);
    const bases = Object.fromEntries(jetons.map(j => [j, calcule.getPropertyValue(j).trim()]));
    const posees = teintesRenforcees(bases, r.contraste, theme.sombre);
    for (const [j, v] of Object.entries(posees)) el.style.setProperty(j, v);
    if (r.contraste) el.setAttribute('data-contraste', String(r.contraste));
    else el.removeAttribute('data-contraste');
    // Pour l'amorce de `index.html` : la page suivante naît déjà foncée.
    ecrire(CLES.encre, JSON.stringify({ theme: theme.id, vars: posees }));

    // LES FIGURES NE FONCENT PAS EN THÈME SOMBRE. La courbe garde le blanc
    // blanc et fonce le reste : sur un fond sombre, c'est le trait clair
    // qu'elle assombrirait — le contraire de ce qu'on demande.
    const gamma = theme.sombre ? 1 : gammaDesFigures(r.contraste, r.figures);
    filtreDesFigures(gamma);
    if (gamma > 1) el.setAttribute('data-figures-fortes', '1');
    else el.removeAttribute('data-figures-fortes');
}

/** Le panneau, dessiné à neuf à chaque ouverture : il dit l'état du moment. */
function panneauHtml(r) {
    const theme = themeConnu(r.theme);
    const pastilles = THEMES.map(t => `
        <button type="button" class="aff-pastille${t.id === theme.id ? ' aff-pastille--choisie' : ''}"
                data-aff-theme="${t.id}" aria-pressed="${t.id === theme.id}">
            <span class="aff-pastille-rond aff-pastille-rond--${t.id}" aria-hidden="true"></span>
            <span class="aff-pastille-nom">${t.nom}</span>
        </button>`).join('');
    return `
        <div class="aff-tete">
            <h2 class="aff-titre" id="aff-titre">Affichage</h2>
            <span class="aff-note">sur cet appareil</span>
        </div>
        <div class="aff-bloc">
            <div class="aff-ligne">
                <label class="aff-etiquette" for="aff-contraste">Contraste</label>
                <span class="aff-note" data-aff-mot>${motDuContraste(r.contraste)}</span>
            </div>
            <input type="range" id="aff-contraste" class="aff-curseur" min="0" max="100" step="5"
                   value="${r.contraste}" aria-describedby="aff-bornes">
            <div class="aff-ligne aff-note" id="aff-bornes"><span>Normal</span><span>Fort</span></div>
        </div>
        <div class="aff-bloc">
            <span class="aff-etiquette">Couleurs</span>
            <div class="aff-pastilles" role="group" aria-label="Couleurs">${pastilles}</div>
        </div>
        <label class="aff-case">
            <input type="checkbox" id="aff-figures" ${r.figures ? 'checked' : ''}>
            <span><span class="aff-etiquette">Foncer aussi les figures</span>
                <span class="aff-note aff-note--bloc">Triangles, quadrillages, axes : ils suivent le
                curseur. Les jeux à couleurs y perdent un peu de nuances.${theme.sombre
                    ? ' Sans effet en thème sombre.' : ''}</span></span>
        </label>
        <label class="aff-case">
            <input type="checkbox" id="aff-aere" ${r.aere ? 'checked' : ''}>
            <span><span class="aff-etiquette">Texte plus aéré</span>
                <span class="aff-note aff-note--bloc">Plus d'espace entre les lettres et les lignes.</span></span>
        </label>
        <div class="aff-pied">
            <button type="button" class="aff-remettre" data-aff-remettre>Remettre comme avant</button>
        </div>`;
}

let panneau = null;
// LA ROUE QUI A OUVERT LE PANNEAU. Il y en a deux — la barre du haut, et
// l'en-tête de l'exercice qui la recouvre pendant qu'on joue — et le panneau se
// pose sous celle qu'on a touchée.
let bouton = null;

function placer() {
    if (!panneau || !bouton) return;
    const b = bouton.getBoundingClientRect();
    // Collé sous la roue, bord droit aligné — et jamais hors de l'écran : sur
    // un téléphone de 360 px, le panneau prend la largeur moins les marges.
    const largeur = Math.min(380, window.innerWidth - 16);
    const droite = Math.max(8, window.innerWidth - b.right);
    panneau.style.width = `${largeur}px`;
    panneau.style.top = `${Math.round(b.bottom + 8)}px`;
    panneau.style.right = `${Math.round(Math.min(droite, window.innerWidth - largeur - 8))}px`;
}

function fermer({ rendreLeFocus = false } = {}) {
    if (!panneau) return;
    panneau.hidden = true;
    document.querySelectorAll('[data-affichage]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    if (rendreLeFocus && bouton) bouton.focus();
}

function ouvrir(depuis) {
    if (!panneau) return;
    bouton = depuis || bouton;
    panneau.innerHTML = panneauHtml(lireReglages(window.localStorage));
    panneau.hidden = false;
    bouton.setAttribute('aria-expanded', 'true');
    placer();
    const c = panneau.querySelector('#aff-contraste');
    if (c) c.focus();
}

/** Un réglage change : on l'écrit, on l'applique, on redit l'état. */
function changer(cle, valeur) {
    ecrire(cle, valeur);
    const r = lireReglages(window.localStorage);
    appliquerAffichage(r);
    const mot = panneau && panneau.querySelector('[data-aff-mot]');
    if (mot) mot.textContent = motDuContraste(r.contraste);
}

export function initAffichage() {
    appliquerAffichage();
    const roues = [...document.querySelectorAll('[data-affichage]')];
    if (!roues.length) return;
    bouton = roues[0];

    panneau = document.createElement('div');
    panneau.id = 'affichage-panneau';
    panneau.className = 'aff-panneau';
    panneau.setAttribute('role', 'dialog');
    panneau.setAttribute('aria-labelledby', 'aff-titre');
    panneau.hidden = true;
    document.body.appendChild(panneau);

    roues.forEach(r => r.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panneau.hidden || bouton !== r) ouvrir(r); else fermer();
    }));

    // LE CURSEUR AGIT PENDANT QU'ON LE TIRE, pas au lâcher : c'est en voyant
    // les bordures foncer qu'on sait où s'arrêter.
    panneau.addEventListener('input', (e) => {
        if (e.target.id === 'aff-contraste') {
            changer(CLES.contraste, String(bornerContraste(e.target.value)));
        }
    });
    panneau.addEventListener('change', (e) => {
        if (e.target.id === 'aff-figures') changer(CLES.figures, e.target.checked ? '1' : '0');
        if (e.target.id === 'aff-aere') changer(CLES.aere, e.target.checked ? '1' : '0');
    });
    panneau.addEventListener('click', (e) => {
        const p = e.target.closest('[data-aff-theme]');
        if (p) {
            changer(CLES.theme, p.dataset.affTheme);
            // Redessiné pour que la pastille choisie et la note du thème sombre
            // suivent — en gardant le focus sur la pastille touchée.
            panneau.innerHTML = panneauHtml(lireReglages(window.localStorage));
            const ici = panneau.querySelector(`[data-aff-theme="${p.dataset.affTheme}"]`);
            if (ici) ici.focus();
            return;
        }
        if (e.target.closest('[data-aff-remettre]')) {
            ecrire(CLES.theme, ORIGINE.theme);
            ecrire(CLES.aere, '0');
            ecrire(CLES.contraste, '0');
            ecrire(CLES.figures, '0');
            appliquerAffichage();
            panneau.innerHTML = panneauHtml(lireReglages(window.localStorage));
        }
    });

    // On ferme comme partout ailleurs : un clic à côté, ou Échap.
    document.addEventListener('click', (e) => {
        // LE CHEMIN DU CLIC, ET NON SA CIBLE. Toucher une pastille redessine le
        // panneau : la pastille touchée n'est plus dans la page quand ce
        // gestionnaire-ci la reçoit, `panneau.contains` répond non, et la roue
        // se fermait sous le doigt. Mesuré par `tools/sondeAffichage.mjs`. Le
        // chemin, lui, est figé au moment du clic.
        const chemin = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
        if (!panneau.hidden && !chemin.includes(panneau)
            && !roues.some(r => chemin.includes(r))) fermer();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !panneau.hidden) fermer({ rendreLeFocus: true });
    });
    window.addEventListener('resize', placer);
}
