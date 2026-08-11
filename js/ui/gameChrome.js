// L'HABILLAGE COMMUN DES EXERCICES — ce qui doit être pareil partout.
//
// Chaque exercice écrivait son propre bandeau, son propre pavé numérique, ses
// propres cartes de réponse, son propre bouton d'aide. Ils se ressemblaient
// sans être identiques : trois pavés légèrement différents, et surtout QUATRE
// NOMS pour la même promesse — « Voir le schéma », « Montrer le lien »,
// « Montre-moi », « Indice ».
//
// Le coût n'est pas esthétique, il est cognitif : un élève qui a compris qu'un
// bouton l'aide sans le pénaliser doit le reconnaître dans l'exercice suivant.
// S'il change de nom, de couleur et de place, il faut le réapprendre — et on ne
// le réapprend pas, on l'ignore.
//
// D'où ce module. Il ne décide de rien sur le fond : il fabrique les morceaux
// d'interface qui n'ont aucune raison de varier, et laisse chaque exercice
// libre de tout le reste.

/** Le nom de l'aide. UN SEUL, partout. */
export const NOM_AIDE = 'Aide';

/** L'icône de l'aide : la même ampoule que le carnet et la leçon. */
export function iconeAide(taille = 17) {
    return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.1" stroke-linecap="round"
                 stroke-linejoin="round" aria-hidden="true">
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a6 6 0 0 0-4 10.5c.6.7 1 1.5 1 2.5h6c0-1 .4-1.8 1-2.5A6 6 0 0 0 12 3z" />
    </svg>`;
}

/**
 * LE BOUTON D'AIDE, identique dans tous les exercices.
 *
 * `quoi` dit ce qu'on va montrer — « le schéma », « le lien », « le tableau ».
 * Le bouton s'écrit alors « Aide : le schéma », et l'élève reconnaît le mot
 * « Aide » avant même d'avoir lu la suite. C'est le mot qui doit être stable,
 * pas la précision.
 */
export function boutonAide(quoi, { ouvert = false } = {}) {
    return `<button type="button" class="jeu-aide" data-aide aria-expanded="${ouvert}">
        ${iconeAide()}<span data-aide-texte>${ouvert ? 'Masquer' : 'Aide'} : ${quoi}</span>
    </button>`;
}

/** Met à jour le libellé du bouton d'aide après une bascule. */
export function majBoutonAide(bouton, quoi, ouvert) {
    if (!bouton) return;
    bouton.setAttribute('aria-expanded', String(ouvert));
    const t = bouton.querySelector('[data-aide-texte]');
    if (t) t.textContent = `${ouvert ? 'Masquer' : 'Aide'} : ${quoi}`;
}

/**
 * LE PAVÉ NUMÉRIQUE, un seul pour tous.
 *
 * Celui du système, sur un téléphone, recouvre la moitié de l'écran — donc
 * l'exercice qu'on est en train de faire. Celui-ci reste sous le contenu, et
 * ses touches font 40 px de côté au minimum, ce qui est la taille en dessous de
 * laquelle un doigt d'enfant en rate une sur cinq.
 */
export function paveNumerique({ virgule = true, valider = 'Valider' } = {}) {
    const chiffres = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    return `<div class="jeu-pave" data-pave>
        ${chiffres.map(c => `<button type="button" class="jeu-touche" data-t="${c}">${c}</button>`).join('')}
        ${virgule ? '<button type="button" class="jeu-touche" data-t=",">,</button>' : ''}
        <button type="button" class="jeu-touche jeu-touche--eff" data-t="eff" aria-label="Effacer">⌫</button>
        <button type="button" class="jeu-touche jeu-touche--ok" data-t="ok"
                style="grid-column: span ${virgule ? 3 : 4}">✓ ${valider}</button>
    </div>`;
}

/**
 * Branche un pavé sur trois fonctions. La saisie est BORNÉE ici, une fois :
 * une seule virgule, deux décimales, sept chiffres. Un exercice qui laisserait
 * écrire « 1,,2345678 » ne pourrait plus juger la réponse.
 */
export function brancherPave(racine, { surChiffre, surEffacer, surValider, actif = () => true }) {
    racine.querySelectorAll('[data-t]').forEach(b => {
        b.addEventListener('click', () => {
            if (!actif()) return;
            const c = b.dataset.t;
            if (c === 'eff') surEffacer?.();
            else if (c === 'ok') surValider?.();
            else surChiffre?.(c);
        });
    });
}

/** Ajoute un caractère à une saisie, en refusant ce qui ne peut pas être un nombre. */
export function taperNombre(texte, c, { decimales = 2, chiffres = 7 } = {}) {
    if (c === ',') {
        if (!texte || texte.includes(',')) return texte;
        return texte + ',';
    }
    const [, dec = ''] = texte.split(',');
    if (texte.includes(',') && dec.length >= decimales) return texte;
    if (texte.replace(',', '').length >= chiffres) return texte;
    return texte + c;
}

/**
 * LES CARTES DE RÉPONSE. Deux par ligne, arrondies.
 *
 * Une bulle ronde convient à « 42 » et pas à « 17 billes rouges » : dès que la
 * réponse est une phrase — ou porte son unité, ce qu'une réponse devrait
 * toujours faire — il faut un rectangle.
 */
export function cartesReponses(valeurs) {
    return `<div class="jeu-cartes" data-cartes>${valeurs.map((v, i) =>
        `<button type="button" class="jeu-carte" data-carte="${i}">${v}</button>`).join('')}</div>`;
}

/** Le bandeau du haut : ce qu'on fait, où on en est, et comment relancer. */
export function bandeau({ but = '', bouton = '↺ Autre question' } = {}) {
    return `<div class="jeu-haut">
        <span data-but>${but}</span>
        <span class="jeu-score" data-score></span>
        <button type="button" class="jeu-btn" data-neuf>${bouton}</button>
    </div>`;
}

/** Le compte des réussites et des erreurs, écrit pareil partout. */
export function direScore(reussis, erreurs, mot = 'réussite') {
    const r = `${reussis} ${mot}${reussis > 1 ? 's' : ''}`;
    return erreurs ? `${r} · ${erreurs} erreur${erreurs > 1 ? 's' : ''}` : r;
}

/** La ligne de retour, avec ses deux tons. */
export function note(el, html, ton) {
    if (!el) return;
    el.innerHTML = ton ? `<span class="jeu-bulle jeu-bulle--${ton}">${html}</span>` : html;
}
