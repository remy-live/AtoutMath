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

    // LA CROIX QUI EFFACE LE TITRE. Rémy : « il faudrait pouvoir supprimer le
    // titre ». On pouvait déjà : cliquer, tout sélectionner, effacer, Entrée.
    // Quatre gestes pour une chose qui se dit en un — et rien à l'écran ne
    // laissait deviner qu'elle était possible. Une feuille sans titre est un
    // cas normal (une fiche d'entraînement n'en a pas besoin), donc elle mérite
    // son bouton, au même titre que les fantômes « + Prénom ».
    //
    // Elle ne paraît que s'il Y A un titre : sur une feuille déjà sans titre,
    // c'est le placeholder gris qui invite à en écrire un, et une croix à côté
    // n'effacerait rien.
    const titre = apercu.querySelector('[data-fiche="titre"]');
    if (parties.titre && titre && !titre.querySelector('[data-vider-titre]')
        && !titre.classList.contains('fp-entete--vide')) {
        titre.insertAdjacentHTML('beforeend',
            `<button type="button" class="fp-fantome fp-vider-titre" data-vider-titre
                title="Supprimer le titre de la feuille">✕</button>`);
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
        // La croix passe AVANT la boîte du titre : elle est dedans, et un clic
        // dessus ouvrirait sinon la saisie qu'on vient de vouloir vider.
        if (quoi.titre && ev.target.closest('[data-vider-titre]')) {
            ev.preventDefault();
            return ecrire({ titre: '' });
        }
        const titre = quoi.titre && ev.target.closest('[data-fiche="titre"]');
        if (titre) { ev.preventDefault(); ecrireTitre(titre, lire, ecrire); }
    });

    return garnir;
}

/**
 * ÉCRIRE LE TITRE À SA PLACE.
 *
 * UN VRAI CHAMP DE SAISIE, ET NON `contentEditable`.
 *
 * Rémy, sur tablette : « quand on clique sur le texte, il y a la barre de
 * style avec les couleurs aucun intéret. Et la liste déroulante avec marqué
 * corps, ne fonctionne pas. »
 *
 * C'est le système qui les pose, pas nous. Un élément `contentEditable` est,
 * pour iPadOS, une zone de texte RICHE : il ouvre donc au-dessus du clavier sa
 * barre de mise en forme — gras, couleurs, et le menu de styles de paragraphe
 * dont l'entrée par défaut s'appelle « Corps ». Aucun de ces boutons n'a de
 * sens ici, puisque le titre d'une feuille n'a qu'une police et qu'une taille ;
 * et le menu de styles ne fait rien, parce qu'il n'y a aucun style à appliquer.
 * `plaintext-only` ne change rien à cela : la barre vient du TYPE de champ, pas
 * de ce qu'on y autorise.
 *
 * Un `<input type="text">` est une zone de texte SIMPLE : le système n'y
 * propose que le clavier. On le pose donc à la place du titre, habillé de la
 * même police, de la même taille et du même centrage — on écrit toujours dans
 * la feuille, et plus dans une boîte posée dessus. Entrée valide, Échap
 * annule : les deux touches qu'on essaie sans y penser.
 */
function ecrireTitre(boite, lire, ecrire) {
    const b = boite.querySelector('b');
    if (!b || boite.querySelector('input')) return;
    const avant = lire().titre || '';
    // La croix s'en va pendant qu'on écrit : on efface avec la touche, pas
    // avec un bouton qui viendrait se coller au champ.
    const croix = boite.querySelector('[data-vider-titre]');
    if (croix) croix.remove();

    const champ = document.createElement('input');
    champ.type = 'text';
    champ.className = 'fp-titre-saisie';
    champ.maxLength = 80;
    champ.value = avant;
    champ.setAttribute('aria-label', 'Titre de la feuille');
    // Le système ne doit rien proposer par-dessus : ni correction, ni
    // majuscule automatique, ni saisie prédictive. Un titre de contrôle
    // s'écrit comme on veut.
    champ.autocomplete = 'off';
    champ.spellcheck = false;
    b.replaceChildren(champ);
    boite.classList.add('fp-entete--edite');
    champ.focus();
    // SÉLECTIONNER SANS FAIRE DÉFILER. Rémy : « quand je clique sur le titre,
    // il est tronqué ». Le champ prend maintenant toute la largeur de la ligne
    // (voir `.fp-entete--edite b`), mais un titre plus long qu'elle défilerait
    // encore jusqu'à sa fin après `select()` — on ne verrait que la queue du
    // texte. On remet donc la fenêtre au début : on lit ce qu'on a écrit, du
    // premier mot.
    champ.select();
    champ.scrollLeft = 0;

    let annule = false;
    const finir = () => {
        if (!champ.isConnected) return;
        const titre = annule ? avant : champ.value.trim().slice(0, 80);
        champ.onblur = null;
        boite.classList.remove('fp-entete--edite');
        // On redessine TOUJOURS, même sans changement : l'aperçu vient d'être
        // touché, et le seul état sûr est celui qu'on redessine.
        ecrire({ titre });
    };
    champ.onblur = finir;
    champ.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); champ.blur(); }
        else if (e.key === 'Escape') { e.preventDefault(); annule = true; champ.blur(); }
    };
}
