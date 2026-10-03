// SÉLECTIONNER DANS UNE LISTE — comme dans tous les logiciels qu'il connaît.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant la première barre à cases : « tu peux pas faire mieux ou ouvrir
// une modale, je trouve que c'est un peu bricolé, on ne peut faire des cadre de
// sélection, utiliser shift ou cmd ».
//
// IL A RAISON, ET LA RAISON EST PLUS PROFONDE QUE L'APPARENCE : une case à
// cocher par ligne est le geste d'un formulaire, pas d'un gestionnaire. Pour
// jeter onze parcours, on en coche onze. Dans un explorateur de fichiers — ce
// que son geste dit qu'il attend — on clique le premier, on maintient Maj, on
// clique le dernier : deux gestes au lieu d'onze.
//
// ── POURQUOI CE MODULE EXISTE SÉPARÉMENT DE L'ÉCRAN ────────────────────────
//
// Ces règles sont CONNUES de tout le monde et fausses à écrire : l'ancre qui
// doit survivre à un Ctrl-clic mais pas à un clic simple, la plage qui se
// recalcule depuis l'ancre et non depuis la dernière ligne touchée, le
// Maj-clic qui REMPLACE la plage précédente au lieu de l'ajouter. Chacune se
// vérifie en trois lignes ici, et se verrait à peine dans un navigateur.
//
// ON N'INVENTE RIEN : on reproduit ce que font le Finder, l'Explorateur et
// toutes les listes du monde. Un logiciel qui invente sa propre façon de
// sélectionner oblige à l'apprendre.

/**
 * CE QUE DEVIENT LA SÉLECTION APRÈS UN CLIC.
 *
 * @param {object} e
 * @param {string[]} e.ids        les identifiants, DANS L'ORDRE AFFICHÉ
 * @param {string}   e.id         celui qu'on vient de cliquer
 * @param {Set|Array} e.selection la sélection avant le clic
 * @param {string}   [e.ancre]    d'où part une plage (le dernier clic simple)
 * @param {boolean}  [e.maj]      la touche Majuscule est enfoncée
 * @param {boolean}  [e.meta]     Ctrl (Windows, Linux) ou Cmd (Mac)
 * @returns {{selection: Set<string>, ancre: string}}
 */
export function apresUnClic({ ids, id, selection, ancre, maj, meta }) {
    const liste = Array.isArray(ids) ? ids : [];
    const avant = new Set(selection || []);
    if (!liste.includes(id)) return { selection: avant, ancre: ancre || '' };

    // MAJ : LA PLAGE, DEPUIS L'ANCRE. Et elle REMPLACE la sélection, elle ne
    // s'y ajoute pas — sans quoi deux Maj-clics successifs laisseraient
    // derrière eux la première plage, que personne n'a demandé de garder.
    //
    // L'ANCRE NE BOUGE PAS. C'est tout l'intérêt : on clique le premier, puis
    // on Maj-clique plusieurs lignes de suite pour ajuster la fin de la plage.
    // Si l'ancre suivait, chaque Maj-clic repartirait d'où l'on vient et l'on
    // ne pourrait plus RÉDUIRE la plage.
    if (maj && ancre && liste.includes(ancre)) {
        const a = liste.indexOf(ancre);
        const b = liste.indexOf(id);
        const plage = liste.slice(Math.min(a, b), Math.max(a, b) + 1);
        // MAJ+CTRL AJOUTE LA PLAGE à ce qui est déjà pris : c'est ce que font
        // les explorateurs, et c'est ce qui permet de prendre deux paquets.
        return { selection: new Set(meta ? [...avant, ...plage] : plage), ancre };
    }

    // CTRL / CMD : ON BASCULE CETTE LIGNE-LÀ, sans toucher au reste.
    //
    // ET L'ANCRE SUIT, parce que la ligne qu'on vient de prendre est le point
    // de départ naturel de la plage suivante.
    if (meta) {
        const apres = new Set(avant);
        if (apres.has(id)) apres.delete(id); else apres.add(id);
        return { selection: apres, ancre: id };
    }

    // CLIC SIMPLE : CELLE-LÀ, ET ELLE SEULE.
    //
    // ON NE FAIT PAS DE CAS PARTICULIER pour « elle était déjà seule
    // sélectionnée, donc on la désélectionne ». Ce raffinement existe dans
    // quelques logiciels et surprend partout ailleurs : un clic sur une ligne
    // la sélectionne, point.
    return { selection: new Set([id]), ancre: id };
}

/** Maj + les flèches, et Ctrl+A : la même sélection, sans souris. */
export function apresUneTouche({ ids, touche, selection, ancre, maj, meta }) {
    const liste = Array.isArray(ids) ? ids : [];
    const avant = new Set(selection || []);
    if (!liste.length) return { selection: avant, ancre: ancre || '' };

    // TOUT PRENDRE. Ctrl+A est le seul raccourci que tout le monde connaît, et
    // c'est celui qui sert le plus ici : « tout sélectionner, puis Ctrl-cliquer
    // les trois que je garde » est le chemin le plus court vers « jeter les
    // quarante-sept autres ».
    if (meta && String(touche).toLowerCase() === 'a') {
        return { selection: new Set(liste), ancre: ancre || liste[0] };
    }

    const pas = touche === 'ArrowDown' ? 1 : touche === 'ArrowUp' ? -1 : 0;
    if (!pas) return { selection: avant, ancre: ancre || '' };

    const depuis = liste.includes(ancre) ? liste.indexOf(ancre) : -1;
    const vers = Math.max(0, Math.min(liste.length - 1, depuis + pas));
    const id = liste[depuis === -1 ? 0 : vers];
    if (maj && liste.includes(ancre)) {
        const a = liste.indexOf(ancre);
        const b = liste.indexOf(id);
        return {
            selection: new Set(liste.slice(Math.min(a, b), Math.max(a, b) + 1)),
            ancre
        };
    }
    return { selection: new Set([id]), ancre: id };
}

/**
 * LE CADRE DE SÉLECTION — ce qu'il attrape.
 *
 * RÉMY : « on ne peut faire des cadre de sélection ».
 *
 * ON PREND CE QUI TOUCHE LE CADRE, et non ce qu'il contient entièrement. Une
 * ligne de liste est large : exiger qu'elle tienne tout entière dans le
 * rectangle obligerait à traverser toute la largeur de la fenêtre pour
 * attraper trois lignes. Tous les explorateurs font ainsi.
 *
 * @param {Array<{id:string, haut:number, bas:number}>} lignes  en coordonnées de la liste
 * @param {{haut:number, bas:number}} cadre
 * @returns {string[]} les identifiants touchés, dans l'ordre donné
 */
export function dansLeCadre(lignes, cadre) {
    const haut = Math.min(cadre.haut, cadre.bas);
    const bas = Math.max(cadre.haut, cadre.bas);
    return (lignes || [])
        .filter(l => l && l.bas > haut && l.haut < bas)
        .map(l => l.id);
}

/**
 * CE QU'ON ÉCRIT QUAND N LIGNES SONT PRISES.
 *
 * « 0 sélectionné » ne s'affiche jamais : la barre disparaît. Et le singulier
 * compte — « 1 parcours sélectionnés » est la faute qu'on ne voit plus au bout
 * de trois jours, et que Rémy verra le premier jour.
 */
export function direLaSelection(n, mot = 'parcours') {
    if (!n) return '';
    // « parcours » est invariable ; le reste de la phrase, non.
    return n === 1 ? `1 ${mot} sélectionné` : `${n} ${mot} sélectionnés`;
}
