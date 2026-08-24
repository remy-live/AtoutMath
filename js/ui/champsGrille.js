// LES CASES QUI S'ÉCRIVENT — un champ de saisie dans chaque case de grille.
//
// Rémy : « attention, il y a des exercices où il n'y a pas de champ formulaire.
// En fait à tous les endroits où on peut écrire, il faut en mettre (même les
// sudoku), et ça peut s'annuler dans les paramètres propres aux exercices. »
//
// CE QUI EXISTAIT DÉJÀ, ET CE QUI MANQUAIT. Les grilles savaient recevoir des
// chiffres au clavier : chaque case était un `div` focalisable qui écoutait la
// frappe. Mais un `div` n'est pas un champ — il ne montre pas de curseur, il
// n'ouvre pas le clavier d'un téléphone, il ne se sélectionne pas, et rien à
// l'écran ne dit qu'on peut y écrire. On pouvait taper sans jamais deviner
// qu'on pouvait taper.
//
// L'ORDRE DE TABULATION EST CELUI DE LA LECTURE. Rémy : « pour le binairo,
// l'ordre des champs est important, de haut en bas, de gauche à droite. Idem
// pour les autres jeux genre mathdoku, ou sudoku. » C'est l'ordre du DOM :
// ligne après ligne, et dans chaque ligne de gauche à droite. Les trois grilles
// l'ont déjà — ce module ne fait que garantir que les champs suivent le même
// chemin, et que les cases DONNÉES ne s'y intercalent pas : on ne s'arrête pas
// sur une case qu'on ne peut pas remplir.
//
// LE CHAMP NE REMPLACE PAS LES AUTRES GESTES. On continue de toucher une case
// et de piocher un jeton dans la palette : sur une tablette, c'est le geste le
// plus rapide. Le champ s'ajoute pour ceux qui ont un clavier — et il est
// désactivable, parce qu'un CE2 qui découvre le sudoku n'a rien à gagner à
// pouvoir écrire « 7 » dans une grille de 4.

/** L'option est-elle active pour cet exercice ? Oui, sauf refus explicite. */
export const saisieActive = (params) => (params || {}).saisieClavier !== false;

/**
 * Le contenu d'une case : un champ si la saisie clavier est offerte, le simple
 * texte sinon.
 *
 * @param {Object} o
 * @param {*} o.valeur       - ce qu'il y a dans la case ('' si vide)
 * @param {boolean} o.donnee - case de l'énoncé : elle ne s'écrit pas
 * @param {boolean} o.champ  - poser un champ de saisie
 * @param {string} [o.aria]  - ce que la case s'appelle
 * @param {string} [o.motif] - ce qu'on accepte d'y taper (regex, sans les /)
 */
export function contenuCase({ valeur, donnee, champ, aria = '', motif = '[0-9]' }) {
    const v = valeur === null || valeur === undefined ? '' : String(valeur);
    if (!champ || donnee) return `<span class="kk-val">${v}</span>`;
    // `inputmode` ouvre le pavé numérique du téléphone, pas le clavier entier ;
    // `maxlength` évite qu'on tape « 12 » dans une case qui n'attend qu'un
    // chiffre — la valeur serait refusée, mais après coup, ce qui déroute.
    return `<input class="kk-val kk-champ" type="text" inputmode="numeric"
        maxlength="1" autocomplete="off" autocorrect="off" spellcheck="false"
        value="${v}" data-motif="${motif}"
        aria-label="${aria}">`;
}

/**
 * Branche les champs d'une grille.
 *
 * @param {HTMLElement} racine
 * @param {Object} o
 * @param {(cle:string, valeur:string) => void} o.poser - ce qu'on fait d'une frappe
 * @param {(champ:HTMLElement) => string} o.cleDe       - la clé de la case d'un champ
 * @param {() => boolean} [o.bloque]                    - la grille est-elle figée ?
 */
export function brancherChamps(racine, { poser, cleDe, bloque = () => false }) {
    const champs = [...racine.querySelectorAll('.kk-champ')];
    if (!champs.length) return;

    champs.forEach((champ, rang) => {
        const motif = new RegExp(`^${champ.dataset.motif || '[0-9]'}$`);

        champ.addEventListener('focus', () => champ.select());

        champ.addEventListener('input', () => {
            if (bloque()) { champ.value = ''; return; }
            // On ne garde que le DERNIER signe tapé : dans une case d'un
            // caractère, retaper par-dessus est le geste naturel, et le
            // navigateur, lui, refuserait la frappe une fois la case pleine.
            const brut = champ.value.slice(-1);
            if (brut && !motif.test(brut)) { champ.value = ''; return; }
            champ.value = brut;
            poser(cleDe(champ), brut);
            // ON AVANCE TOUT SEUL après un chiffre valide : remplir une grille
            // de quatre-vingt-une cases en appuyant sur Tab entre chaque est un
            // exercice de patience, pas de logique.
            if (brut) suivant(rang + 1);
        });

        champ.addEventListener('keydown', (ev) => {
            const k = ev.key;
            if (k === 'Backspace' || k === 'Delete') {
                // Une case déjà vide renvoie à la précédente : c'est ce que
                // fait n'importe quel formulaire découpé en cases.
                if (!champ.value && k === 'Backspace') { ev.preventDefault(); suivant(rang - 1); return; }
                champ.value = '';
                poser(cleDe(champ), '');
                ev.preventDefault();
                return;
            }
            // LES FLÈCHES SUIVENT LA GRILLE, pas la liste des champs : monter
            // d'une case, ce n'est pas reculer d'un champ.
            const pas = { ArrowRight: 1, ArrowLeft: -1 }[k];
            if (pas !== undefined) { ev.preventDefault(); suivant(rang + pas); return; }
            if (k === 'ArrowDown' || k === 'ArrowUp') {
                ev.preventDefault();
                const cible = voisinVertical(champ, k === 'ArrowDown' ? 1 : -1, champs);
                if (cible) { cible.focus(); cible.select(); }
            }
        });
    });

    /** Le champ suivant (ou précédent) dans l'ordre de lecture. */
    function suivant(rang) {
        const cible = champs[Math.max(0, Math.min(champs.length - 1, rang))];
        if (cible && cible !== document.activeElement) { cible.focus(); cible.select(); }
    }
}

/**
 * Le champ le plus proche à la verticale — mesuré à l'écran plutôt que déduit
 * d'un indice : les cases DONNÉES trouent la liste des champs, et « le champ
 * d'une ligne plus bas » n'est pas « le champ n colonnes plus loin » dès qu'il
 * en manque une.
 */
function voisinVertical(depuis, sens, champs) {
    const r = depuis.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    let meilleur = null, meilleureDist = Infinity;
    for (const autre of champs) {
        if (autre === depuis) continue;
        const a = autre.getBoundingClientRect();
        const dy = (a.top + a.height / 2) - (r.top + r.height / 2);
        if (sens > 0 ? dy <= 2 : dy >= -2) continue;
        // On privilégie la même colonne : l'écart horizontal pèse davantage.
        const d = Math.abs(dy) + Math.abs((a.left + a.width / 2) - cx) * 3;
        if (d < meilleureDist) { meilleureDist = d; meilleur = autre; }
    }
    return meilleur;
}

/** Le réglage, à ajouter au paramSchema d'un exercice à grille. */
export const REGLAGE_SAISIE = {
    id: 'saisieClavier', type: 'checkbox', label: 'Écrire au clavier dans les cases',
    aide: 'Chaque case devient un champ : on tape le chiffre et l\'on passe à la suivante, '
        + 'les flèches se déplacent dans la grille. Décoché, la grille se remplit uniquement '
        + 'en touchant une case puis un jeton — c\'est plus sûr sur une tablette, et cela '
        + 'évite qu\'un élève écrive au hasard sans regarder la grille.',
    default: true
};
