// ON RÈGLE LA FEUILLE SUR LA FEUILLE.
//
// Rémy : « ne code rien mais on pourrait améliorer cela en passant par l'apercu
// plutôt que des options j'ai l'impression que pour la fiche de parcours on
// fait des doublons ».
//
// LE DOUBLON N'EST PAS ENTRE DEUX PANNEAUX, IL EST ENTRE LE PANNEAU ET LA
// FEUILLE. Le titre est écrit en haut de la page, sous les yeux ; « Nom : …… »
// est dessiné à sa place ; la case « … / 20 » occupe son coin. Les régler par
// des champs et des cases à cocher rangés dans un repli, c'est décrire de loin
// ce qu'on a devant soi — et c'est demander au professeur de faire dans sa tête
// la correspondance entre « ☑ Prénom » et le trait qui apparaîtra quelque part.
//
// On touche donc la chose elle-même : on clique le titre pour l'écrire, on
// clique un champ pour le retirer, on clique une case fantôme pour l'ajouter.
// Sept commandes disparaissent du panneau sans qu'aucun réglage ne se perde.
//
// CE QUI RESTE DANS LE PANNEAU, ET POURQUOI. Tout ce qui ne se voit PAS sur la
// feuille : le format du papier, l'encre de l'imprimante, les champs
// remplissables du PDF, l'endroit où va le corrigé. On ne peut pas cliquer ce
// qui n'est pas dessiné.
//
// LES FANTÔMES NE S'IMPRIMENT PAS. Ils vivent dans l'aperçu, qui est du HTML ;
// le PDF est dessiné par un autre chemin et ne les voit même pas. Ils sont
// tracés en pointillé et en gris pour qu'on ne les prenne pas une seconde pour
// du contenu.

import { CHAMPS_ENTETE } from './ficheRendu.js';

/** Les cases du cartouche, comme les champs d'identité : un nom, un libellé. */
const CASES_CARTOUCHE = { note: 'Note', commentaire: 'Commentaire' };

/**
 * CE QU'ON PEUT TOUCHER DÉPEND DE LA FENÊTRE, et il faut le dire.
 *
 * La fiche d'un parcours porte un titre à elle, un en-tête et un cartouche de
 * correction ; la fiche d'un exercice porte le titre de l'exercice et rien
 * d'autre. Poser partout les mêmes prises donnerait des surbrillances au
 * survol sur des choses que personne n'écoute — la pire des interfaces, celle
 * qui promet un geste et ne le rend pas.
 */
const PARTIES_TOUTES = { titre: true, champs: true, cartouche: true };

/**
 * Pose les fantômes de ce qui MANQUE, après chaque rendu de l'aperçu.
 *
 * @param {HTMLElement} apercu
 * @param {{champs: string[], note: boolean, commentaire: boolean}} etat
 */
export function garnirFicheDirecte(apercu, etat = {}, parties = PARTIES_TOUTES) {
    if (!apercu) return;
    const champs = Array.isArray(etat.champs) ? etat.champs : [];

    // Les champs d'identité qui ne sont pas sur la feuille, offerts au bout de
    // la ligne. On ne les met QUE sur la première page : l'aperçu en empile
    // plusieurs, et quatre fantômes par page seraient du bruit.
    const ligne = apercu.querySelector('[data-fiche="identite"]');
    if (parties.champs && ligne && !ligne.querySelector('[data-ajout-champ]')) {
        const manquants = Object.keys(CHAMPS_ENTETE).filter(c => !champs.includes(c));
        ligne.insertAdjacentHTML('beforeend', manquants.map(c =>
            `<button type="button" class="fp-fantome" data-ajout-champ="${c}"
                title="Ajouter le champ « ${CHAMPS_ENTETE[c].label} »"
            >+ ${CHAMPS_ENTETE[c].label}</button>`).join(''));
    }

    // Les cases du cartouche. Elles vivent SOUS le filet ; faute de cartouche
    // dessiné, on n'a aucun repère où les poser — on les accroche donc à la
    // fin de la ligne d'identité elle aussi, où l'on regarde déjà.
    if (parties.cartouche && ligne && !ligne.querySelector('[data-ajout-case]')) {
        const manquantes = Object.keys(CASES_CARTOUCHE).filter(c => !etat[c]);
        ligne.insertAdjacentHTML('beforeend', manquantes.map(c =>
            `<button type="button" class="fp-fantome fp-fantome--case" data-ajout-case="${c}"
                title="Ajouter la case « ${CASES_CARTOUCHE[c]} » en haut de la feuille"
            >+ ${CASES_CARTOUCHE[c]}</button>`).join(''));
    }
}

/**
 * Branche l'aperçu : un seul écouteur, posé une fois.
 *
 * @param {HTMLElement} apercu
 * @param {Object} o
 * @param {() => Object} o.lire     - l'état courant { titre, champs, note, commentaire }
 * @param {(patch: Object) => void} o.ecrire - applique et redessine
 * @returns {(etat?: Object) => void} à rappeler après chaque rendu
 */
export function brancherFicheDirecte(apercu, { lire, ecrire, parties }) {
    if (!apercu) return () => { };
    const quoi = { ...PARTIES_TOUTES, ...(parties || {}) };
    const garnir = (etat) => garnirFicheDirecte(apercu, etat || lire(), quoi);
    if (apercu._ficheDirecte) return garnir;
    apercu._ficheDirecte = true;
    // Les prises visibles au survol sont posées par le CSS, et il ne les pose
    // que là où quelqu'un écoute.
    apercu.classList.add('fp-apercu--direct');
    Object.entries(quoi).forEach(([nom, oui]) =>
        apercu.classList.toggle(`fp-direct-${nom}`, !!oui));

    apercu.addEventListener('click', (ev) => {
        const ajoutChamp = quoi.champs && ev.target.closest('[data-ajout-champ]');
        if (ajoutChamp) {
            ev.preventDefault();
            const e = lire();
            const voulus = Object.keys(CHAMPS_ENTETE);
            // L'ORDRE EST CELUI DU MODÈLE, PAS CELUI DES CLICS. Sinon un champ
            // ajouté après coup se retrouverait derrière la date, et deux
            // feuilles de la même classe n'auraient pas le même en-tête.
            const champs = voulus.filter(c =>
                (e.champs || []).includes(c) || c === ajoutChamp.dataset.ajoutChamp);
            return ecrire({ champs });
        }
        const ajoutCase = quoi.cartouche && ev.target.closest('[data-ajout-case]');
        if (ajoutCase) {
            ev.preventDefault();
            return ecrire({ [ajoutCase.dataset.ajoutCase]: true });
        }
        const champ = quoi.champs && ev.target.closest('[data-fiche="champ"]');
        if (champ) {
            ev.preventDefault();
            const e = lire();
            return ecrire({ champs: (e.champs || []).filter(c => c !== champ.dataset.champ) });
        }
        const cartouche = quoi.cartouche && ev.target.closest('[data-fiche="cartouche"]');
        if (cartouche) {
            ev.preventDefault();
            return ecrire({ [cartouche.dataset.case]: false });
        }
        const titre = quoi.titre && ev.target.closest('[data-fiche="titre"]');
        if (titre) { ev.preventDefault(); ecrireTitre(titre, lire, ecrire); }
    });

    return garnir;
}

/**
 * ÉCRIRE LE TITRE À SA PLACE.
 *
 * `contentEditable` plutôt qu'un champ posé par-dessus : le titre garde alors
 * exactement sa police, sa taille et son centrage, si bien qu'on écrit dans la
 * feuille et pas dans une boîte qui la recouvre. Entrée valide, Échap annule —
 * ce sont les deux touches qu'on essaie sans y penser.
 */
function ecrireTitre(boite, lire, ecrire) {
    const b = boite.querySelector('b');
    if (!b || b.isContentEditable) return;
    const avant = lire().titre || '';
    b.textContent = avant;
    b.contentEditable = 'plaintext-only';
    boite.classList.add('fp-entete--edite');
    b.focus();
    // Tout sélectionner : on remplace un titre neuf fois sur dix, et le
    // placeholder « Titre de la feuille » ne doit surtout pas rester collé
    // devant ce qu'on tape.
    const sel = window.getSelection();
    if (sel) {
        const r = document.createRange();
        r.selectNodeContents(b);
        sel.removeAllRanges();
        sel.addRange(r);
    }

    let annule = false;
    const finir = () => {
        b.contentEditable = 'false';
        boite.classList.remove('fp-entete--edite');
        b.onblur = null; b.onkeydown = null;
        const titre = annule ? avant : b.textContent.trim().slice(0, 80);
        // On redessine TOUJOURS, même sans changement : l'aperçu vient d'être
        // touché (sélection, curseur), et le seul état sûr est celui qu'on
        // redessine.
        ecrire({ titre });
    };
    b.onblur = finir;
    b.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); b.blur(); }
        else if (e.key === 'Escape') { e.preventDefault(); annule = true; b.blur(); }
    };
}
